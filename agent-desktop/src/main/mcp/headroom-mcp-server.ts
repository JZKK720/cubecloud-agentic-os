/**
 * Headroom MCP server —implements the [Model Context Protocol
 * Streamable HTTP transport](https://modelcontextprotocol.io) and
 * exposes three tools that wrap the existing Headroom IPC:
 *
 *   - `headroom_compress`  →IPC `headroom-compress`
 *   - `headroom_retrieve`  →IPC `headroom-retrieve`
 *   - `headroom_stats`     →IPC `headroom-stats`
 *
 * Why a local HTTP MCP server instead of stdio?
 *
 *   The desktop already owns an HTTP surface (the existing
 *   `headroom-sidecar` runs on `127.0.0.1:8787`) and the bundled
 *   Mcp registry supports `transport: "http"` natively. A local
 *   HTTP server also lets us supervise the process with the same
 *   start / stop / restart / log-tail lifecycle we use for
 *   every other local helper.
 *
 * Why in this same project, not a separate npm package?
 *
 *   The three tools are thin pass-throughs to IPC handlers that
 *   already live in `src/main/headroom.ts`. Splitting the
 *   server out into a separate package would force us to
 *   duplicate those types or add a workspace dependency for a
 *   few dozen lines. Keeping the server in-tree keeps the
 *   build simple and the round-trip count low.
 *
 * Lifecycle (mirrors `headroom-sidecar.ts`):
 *
 *   - One process per desktop session.
 *   - `startHeadroomMcpServer()` spawns the Node subprocess and
 *     waits for it to bind the chosen port (8s health-probe
 *     deadline).
 *   - Auto-restart on crash with a 1.5s backoff, capped at 5
 *     restarts in a 60s window. User-triggered restarts bypass
 *     the cap.
 *   - `stopHeadroomMcpServer()` sends SIGTERM, escalates to
 *     SIGKILL after 3s.
 *   - Log tail is bounded to the last 200 lines.
 *
 * Wire format (Streamable HTTP transport, JSON-only):
 *
 *   - `POST /mcp`        —JSON-RPC request body
 *   - `GET  /mcp`        —405 (we don't support SSE streaming)
 *   - `DELETE /mcp`      —200 (no active sessions to close)
 *   - `GET  /health`     —`{ok: true, version, name, tools}`
 *
 * The server validates JSON-RPC envelopes itself; tool calls are
 * routed by `method === "tools/call"` + `params.name`. The
 * response is always a single JSON object with
 * `{ content: [{ type: "text", text: <stringified JSON> }] }`
 * —text content is the universal MCP fallback that every
 * client knows how to render.
 */

import { spawn, type ChildProcess } from "child_process";
import { existsSync } from "fs";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

// ─── Public types ─────────────────────────────────────────────────

export type HeadroomMcpState =
  | "stopped"
  | "starting"
  | "running"
  | "crashed"
  | "exited";

export interface HeadroomMcpStatus {
  state: HeadroomMcpState;
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
  /** Tool names exposed to the MCP client. */
  toolNames: string[];
}

export interface HeadroomMcpStartOptions {
  /** Loopback port the server should bind to. Default `8788`. */
  port?: number;
  /** Host the server should bind to. Default `127.0.0.1`. */
  host?: string;
  /** Path to the script the subprocess will `node`-run. Mostly
   *  for tests; the production caller leaves this unset and the
   *  module resolves its own `__filename`. */
  serverScriptPath?: string;
}

export interface HeadroomMcpLogTail {
  lines: string[];
  totalBytes: number;
}

// ─── Constants ────────────────────────────────────────────────────

/** Default MCP port. Picked to sit just above the headroom proxy
 *  (8787) and the gateway (likely 8786) so a busy machine
 *  doesn't immediately collide. Override via
 *  `startHeadroomMcpServer({port})` for tests. */
const DEFAULT_PORT = 8788;
const DEFAULT_HOST = "127.0.0.1";

/** How long we wait for the spawned server to bind its port
 *  before we consider startup failed. */
const STARTUP_DEADLINE_MS = 8_000;
/** Per-probe timeout for the local `/health` poll. */
const HEALTH_PROBE_TIMEOUT_MS = 750;
/** Backoff between auto-restarts on crash. */
const RESTART_BACKOFF_MS = 1_500;
/** Window over which `MAX_CRASHES` is counted. */
const CRASH_WINDOW_MS = 60_000;
/** Cap on auto-restarts in a 60s window before we give up. */
const MAX_CRASHES = 5;
/** How long to wait for graceful SIGTERM before SIGKILL. */
const STOP_TIMEOUT_MS = 3_000;
/** Max log lines we retain for the renderer tail. */
const MAX_LOG_LINES = 200;
/** Built-in tool manifest. Keep in sync with the JSON-Schema we
 *  ship to the renderer for the Mcp registry entry. */
const TOOL_NAMES = [
  "headroom_compress",
  "headroom_retrieve",
  "headroom_stats",
] as const;
const SERVER_NAME = "headroom-mcp-server";
const SERVER_VERSION = "0.1.0";

// ─── Runtime state ────────────────────────────────────────────────

interface Runtime {
  child: ChildProcess | null;
  status: HeadroomMcpStatus;
  logBuffer: string[];
  logBytes: number;
  crashTimestamps: number[];
  restartTimer: NodeJS.Timeout | null;
  server: ReturnType<typeof createServer> | null;
  port: number;
  host: string;
  /** Per-instance IPC dispatch (set by `setHeadroomMcpDispatcher`
   *  from the Electron main process —the server lives in this
   *  same process for now, but routing through a single
   *  dispatcher keeps the surface mockable for tests). */
  dispatcher: HeadroomMcpDispatcher;
}

const runtime: Runtime = {
  child: null,
  status: defaultStatus(),
  logBuffer: [],
  logBytes: 0,
  crashTimestamps: [],
  restartTimer: null,
  server: null,
  port: DEFAULT_PORT,
  host: DEFAULT_HOST,
  dispatcher: defaultDispatcher(),
};

function defaultStatus(): HeadroomMcpStatus {
  return {
    state: "stopped",
    running: false,
    pid: null,
    port: null,
    baseUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
    lastError: null,
    crashCount: 0,
    startedAt: null,
    uptimeMs: null,
    reason: null,
    toolNames: [...TOOL_NAMES],
  };
}

// ─── Dispatcher contract ──────────────────────────────────────────

/** The three IPC calls the MCP server needs to make. The
 *  Electron main process installs the real implementations
 *  (which forward to `compressMessages`, `retrieveOriginal`,
 *  `getHeadroomStats`) via `setHeadroomMcpDispatcher`. Tests
 *  install a mock dispatcher and never spawn a child. */
export interface HeadroomMcpDispatcher {
  compress(
    messages: unknown[],
    model?: string,
  ): Promise<Record<string, unknown>>;
  retrieve(cacheKey: string): Promise<Record<string, unknown>>;
  stats(): Promise<Record<string, unknown>>;
}

function defaultDispatcher(): HeadroomMcpDispatcher {
  return {
    async compress() {
      throw new Error(
        "headroom-mcp-server: no dispatcher installed. Call setHeadroomMcpDispatcher() before startHeadroomMcpServer().",
      );
    },
    async retrieve() {
      throw new Error(
        "headroom-mcp-server: no dispatcher installed. Call setHeadroomMcpDispatcher() before startHeadroomMcpServer().",
      );
    },
    async stats() {
      throw new Error(
        "headroom-mcp-server: no dispatcher installed. Call setHeadroomMcpDispatcher() before startHeadroomMcpServer().",
      );
    },
  };
}

/** Install the real IPC dispatcher. Idempotent —calling more
 *  than once just swaps the implementation. */
export function setHeadroomMcpDispatcher(
  dispatcher: HeadroomMcpDispatcher,
): void {
  runtime.dispatcher = dispatcher;
}

// ─── Lifecycle ─────────────────────────────────────────────────────

export function getHeadroomMcpStatus(): HeadroomMcpStatus {
  return { ...runtime.status, toolNames: [...TOOL_NAMES] };
}

export function getHeadroomMcpLogTail(): HeadroomMcpLogTail {
  return {
    lines: [...runtime.logBuffer],
    totalBytes: runtime.logBytes,
  };
}

export function clearHeadroomMcpLogs(): void {
  runtime.logBuffer = [];
  runtime.logBytes = 0;
  appendLog("[mcp-server] logs cleared");
}

export async function startHeadroomMcpServer(
  options: HeadroomMcpStartOptions = {},
): Promise<HeadroomMcpStatus> {
  clearRestartTimer();
  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  runtime.port = port;
  runtime.host = host;
  runtime.status = {
    ...defaultStatus(),
    state: "starting",
    port,
    baseUrl: `http://${host}:${port}`,
  };
  appendLog(`[mcp-server] start requested (port=${port}, host=${host})`);

  const scriptPath = resolveServerScriptPath(options.serverScriptPath);
  if (!scriptPath) {
    runtime.status.state = "stopped";
    runtime.status.reason = "no server script";
    appendLog("[mcp-server] start aborted: server script not found");
    return getHeadroomMcpStatus();
  }

  const child = spawn(
    process.execPath,
    [scriptPath, "--port", String(port), "--host", host],
    {
      stdio: ["ignore", "pipe", "pipe"],
      // Detach the subprocess from the parent's console on
      // Windows so a `console.log` from the MCP server doesn't
      // show up in the launcher's stderr.
      windowsHide: true,
      env: {
        ...process.env,
        // Marker so the subprocess knows it was launched by the
        // supervisor (used to avoid double-listen when the file
        // is run with `node` directly for hand-testing).
        HEADROOM_MCP_CHILD: "1",
      },
    },
  );
  runtime.child = child;
  runtime.status.pid = child.pid ?? null;
  runtime.status.startedAt = Date.now();

  child.stdout?.on("data", (chunk) => appendLog(strip(chunk.toString())));
  child.stderr?.on("data", (chunk) =>
    appendLog(`[stderr] ${strip(chunk.toString())}`),
  );
  child.on("error", (err) => {
    appendLog(`[mcp-server] spawn error: ${err.message}`);
    runtime.status.lastError = err.message;
    runtime.status.state = "crashed";
    runtime.status.running = false;
    runtime.status.reason = err.message;
  });
  child.on("exit", (code, signal) => {
    const wasUserStopped = runtime.status.state === "stopped";
    appendLog(
      `[mcp-server] child exit code=${code} signal=${signal} user=${wasUserStopped}`,
    );
    runtime.child = null;
    runtime.status.pid = null;
    runtime.status.running = false;
    runtime.status.uptimeMs = null;
    if (wasUserStopped) {
      runtime.status.state = "stopped";
      runtime.status.reason = "stopped";
      return;
    }
    if (typeof code === "number" && code !== 0) {
      runtime.status.state = "crashed";
      runtime.status.reason = `exit ${code}`;
    } else {
      runtime.status.state = "exited";
      runtime.status.reason = signal ? `signal ${signal}` : "exited";
    }
    scheduleAutoRestart();
  });

  const ready = await waitForHealth(`http://${host}:${port}`);
  if (ready) {
    runtime.status.state = "running";
    runtime.status.running = true;
    runtime.status.reason = null;
    appendLog(`[mcp-server] ready at ${runtime.status.baseUrl}`);
  } else {
    appendLog("[mcp-server] health probe timed out; child still alive");
    // We don't kill the child here —it may still bind
    // successfully and the renderer can re-probe. The supervisor
    // will tear it down on stop() or on the next crash.
    runtime.status.state = "starting";
  }
  return getHeadroomMcpStatus();
}

export function stopHeadroomMcpServer(): HeadroomMcpStatus {
  clearRestartTimer();
  const child = runtime.child;
  if (!child) {
    runtime.status = {
      ...defaultStatus(),
      port: runtime.port,
      baseUrl: `http://${runtime.host}:${runtime.port}`,
      reason: "stopped",
    };
    return getHeadroomMcpStatus();
  }
  appendLog("[mcp-server] stop requested");
  runtime.status.state = "stopped";
  runtime.status.running = false;
  try {
    child.kill("SIGTERM");
  } catch (err) {
    appendLog(`[mcp-server] SIGTERM failed: ${(err as Error).message}`);
  }
  setTimeout(() => {
    if (runtime.child === child && !child.killed) {
      try {
        child.kill("SIGKILL");
      } catch (err) {
        appendLog(`[mcp-server] SIGKILL failed: ${(err as Error).message}`);
      }
    }
  }, STOP_TIMEOUT_MS);
  return getHeadroomMcpStatus();
}

export function restartHeadroomMcpServer(
  options: HeadroomMcpStartOptions = {},
): Promise<HeadroomMcpStatus> {
  appendLog("[mcp-server] restart requested");
  runtime.crashTimestamps = [];
  stopHeadroomMcpServer();
  return startHeadroomMcpServer(options);
}

// ─── Logging helpers ──────────────────────────────────────────────

function appendLog(line: string): void {
  // Split on newlines so a single 4 KB chunk doesn't show up as
  // a single bloated log line. We always push a trailing
  // element so the last partial line is also captured.
  const pieces = line.split(/\r?\n/);
  for (const piece of pieces) {
    if (!piece) continue;
    runtime.logBuffer.push(piece);
    runtime.logBytes += piece.length;
    if (runtime.logBuffer.length > MAX_LOG_LINES) {
      const dropped = runtime.logBuffer.shift();
      if (dropped) runtime.logBytes -= dropped.length;
    }
  }
}

function strip(line: string): string {
  return line.replace(/\r\n/g, "\n").replace(/\n$/, "");
}

function clearRestartTimer(): void {
  if (runtime.restartTimer) {
    clearTimeout(runtime.restartTimer);
    runtime.restartTimer = null;
  }
}

function scheduleAutoRestart(): void {
  if (runtime.status.state === "stopped") return;
  const now = Date.now();
  runtime.crashTimestamps = runtime.crashTimestamps.filter(
    (t) => now - t < CRASH_WINDOW_MS,
  );
  if (runtime.crashTimestamps.length >= MAX_CRASHES) {
    appendLog(
      `[mcp-server] auto-restart cap reached (${MAX_CRASHES} in ${CRASH_WINDOW_MS / 1000}s); leaving stopped`,
    );
    runtime.status.state = "stopped";
    runtime.status.reason = "restart cap reached";
    return;
  }
  runtime.crashTimestamps.push(now);
  appendLog(
    `[mcp-server] scheduling auto-restart in ${RESTART_BACKOFF_MS}ms (${runtime.crashTimestamps.length}/${MAX_CRASHES} in window)`,
  );
  clearRestartTimer();
  runtime.restartTimer = setTimeout(() => {
    runtime.restartTimer = null;
    void startHeadroomMcpServer({ port: runtime.port, host: runtime.host });
  }, RESTART_BACKOFF_MS);
}

async function waitForHealth(baseUrl: string): Promise<boolean> {
  const deadline = Date.now() + STARTUP_DEADLINE_MS;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      if (res.ok) {
        clearTimeout(timer);
        return true;
      }
    } catch {
      // not ready yet
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

function resolveServerScriptPath(override: string | undefined): string | null {
  if (override) {
    return existsSync(override) ? override : null;
  }
  // In dev the compiled file is at
  //   <repo>/agent-desktop/src/main/mcp/headroom-mcp-server.ts
  // and the subprocess runs it via `node`. The same file also
  // works in production (esbuild bundles this module into the
  // out/ tree), so we resolve relative to __filename.
  const here = __filename;
  if (existsSync(here)) return here;
  // Fallback: maybe we're in a bundled context where __filename
  // doesn't exist on disk (e.g. esbuild virtual fs). Look for
  // a sibling .js —the test harness writes the bundled output
  // next to the .ts.
  const jsSibling = here.replace(/\.ts$/, ".js");
  if (existsSync(jsSibling)) return jsSibling;
  return null;
}

// ─── JSON-RPC / MCP message handling ──────────────────────────────

/** Public entry point used by the HTTP layer in this same
 *  process. The Electron main process calls this directly via
 *  `handleMcpRequest` rather than going over the loopback HTTP
 *  socket —same code, no extra round trip. */
export async function handleMcpRequest(
  body: unknown,
): Promise<Record<string, unknown>> {
  if (!body || typeof body !== "object") {
    return jsonRpcError(
      null,
      -32600,
      "Invalid Request: body must be a JSON object",
    );
  }
  const envelope = body as Record<string, unknown>;
  const { id, method, params } = envelope;
  if (typeof method !== "string") {
    return jsonRpcError(id ?? null, -32600, "Invalid Request: method missing");
  }
  // Spec only requires `id` for requests (not notifications).
  // We accept either form; for notifications we still return a
  // response shape so the HTTP layer can serialise it.
  switch (method) {
    case "initialize":
      return jsonRpcOk(id ?? null, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      });
    case "ping":
      return jsonRpcOk(id ?? null, {});
    case "tools/list":
      return jsonRpcOk(id ?? null, { tools: TOOL_DEFINITIONS });
    case "tools/call": {
      const toolCall = params as
        | { name?: string; arguments?: unknown }
        | undefined;
      const toolName = toolCall?.name ?? "";
      const toolArgs = toolCall?.arguments ?? {};
      const result = await dispatchToolCall(toolName, toolArgs);
      return jsonRpcOk(id ?? null, result);
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      // Spec: notifications get no response. We still return a
      // 200 envelope so HTTP doesn't 500 on a no-op.
      return jsonRpcOk(id ?? null, { acknowledged: true });
    default:
      return jsonRpcError(id ?? null, -32601, `Method not found: ${method}`);
  }
}

async function dispatchToolCall(
  name: string,
  args: unknown,
): Promise<Record<string, unknown>> {
  try {
    if (name === "headroom_compress") {
      const a = (args ?? {}) as { messages?: unknown[]; model?: string };
      if (!Array.isArray(a.messages)) {
        return toolError(
          "`messages` must be an array of OpenAI-format messages",
        );
      }
      const data = await runtime.dispatcher.compress(a.messages, a.model);
      return toolResult(data);
    }
    if (name === "headroom_retrieve") {
      const a = (args ?? {}) as { key?: string };
      if (typeof a.key !== "string" || a.key.length === 0) {
        return toolError("`key` must be a non-empty string");
      }
      const data = await runtime.dispatcher.retrieve(a.key);
      return toolResult(data);
    }
    if (name === "headroom_stats") {
      const data = await runtime.dispatcher.stats();
      return toolResult(data);
    }
    return toolError(`Unknown tool: ${name}`);
  } catch (err) {
    return toolError((err as Error).message ?? String(err));
  }
}

function toolResult(data: unknown): Record<string, unknown> {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
    isError: false,
  };
}

function toolError(message: string): Record<string, unknown> {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

function jsonRpcOk(id: unknown, result: unknown): Record<string, unknown> {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: unknown,
  code: number,
  message: string,
): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}

// ─── Tool manifest ────────────────────────────────────────────────

/** Tool definitions returned by `tools/list`. JSON Schema is the
 *  spec-conformant shape; clients that build a form for the
 *  user parse this directly. */
const TOOL_DEFINITIONS: Array<Record<string, unknown>> = [
  {
    name: "headroom_compress",
    description:
      "Compress an OpenAI-format chat message array via the local Headroom proxy. Returns the compressed messages, the before/after token counts, the savings percentage, and a `compressed: bool` flag that lets the caller tell whether any tokens were actually saved.",
    inputSchema: {
      type: "object",
      properties: {
        messages: {
          type: "array",
          description:
            "OpenAI-format messages: each entry has `role` (system / user / assistant / tool) and `content` (string or null).",
          items: {
            type: "object",
            properties: {
              role: {
                type: "string",
                enum: ["system", "user", "assistant", "tool"],
              },
              content: {
                type: ["string", "null"],
              },
              name: { type: "string" },
              tool_call_id: { type: "string" },
              tool_calls: { type: "array" },
            },
            required: ["role"],
          },
        },
        model: {
          type: "string",
          description:
            "Optional model id (e.g. `gpt-4o-mini`) used by the proxy for token accounting.",
        },
      },
      required: ["messages"],
    },
  },
  {
    name: "headroom_retrieve",
    description:
      "Look up the original uncompressed content for a CCR cache key produced by a previous `headroom_compress` call. Returns the original string and an `error` field on failure.",
    inputSchema: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description: "CCR cache key from a `headroom_compress` result.",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "headroom_stats",
    description:
      "Read the Headroom proxy's running totals: total requests, total tokens before / after, average savings percentage, CCR entry count, and uptime in seconds. Useful for surfacing compression ROI to the user.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

// ─── Self-hosted subprocess entry point ──────────────────────────

/** When this file is spawned as a subprocess (via the
 *  supervisor above), bind the HTTP server and serve the
 *  Streamable-HTTP transport on `/mcp` plus a `/health` probe.
 *  Detection: set when the supervisor's `HEADROOM_MCP_CHILD=1`
 *  env var is present, or when `--child` is passed (hand-test
 *  mode). */
function isChildMode(): boolean {
  if (process.env.HEADROOM_MCP_CHILD === "1") return true;
  return process.argv.includes("--child");
}

function parsePortHostFromArgs(): { port: number; host: string } {
  const argv = process.argv;
  let port = DEFAULT_PORT;
  let host = DEFAULT_HOST;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--port" && i + 1 < argv.length) {
      const n = Number(argv[i + 1]);
      if (Number.isFinite(n) && n > 0 && n < 65536) port = Math.floor(n);
    } else if (arg === "--host" && i + 1 < argv.length) {
      host = argv[i + 1];
    }
  }
  return { port, host };
}

async function runChild(): Promise<void> {
  const { port, host } = parsePortHostFromArgs();
  const server = createServer(async (req, res) => {
    try {
      await handleHttpRequest(req, res);
    } catch (err) {
      // Last-resort guard so a thrown handler doesn't kill the
      // event loop. The HTTP response was probably already
      // started, so just log and let the connection close.
      // eslint-disable-next-line no-console
      console.error(
        "[mcp-server] unhandled error:",
        (err as Error).message,
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  // eslint-disable-next-line no-console
  console.log(
    `[mcp-server] listening on http://${host}:${port} (${SERVER_NAME} v${SERVER_VERSION})`,
  );
  // Stay alive until SIGTERM / SIGKILL.
}

async function handleHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = (req.url ?? "/").split("?")[0];
  if (url === "/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      name: SERVER_NAME,
      version: SERVER_VERSION,
      tools: TOOL_NAMES,
    });
    return;
  }
  if (url !== "/mcp") {
    sendJson(res, 404, { error: "not found" });
    return;
  }
  if (req.method === "GET") {
    // The Streamable-HTTP transport allows SSE streaming GETs,
    // but we only support request/response —return 405 with
    // an explanatory body so misbehaving clients fail loudly.
    sendJson(res, 405, {
      error: "use POST for JSON-RPC; GET /mcp is not supported",
    });
    return;
  }
  if (req.method === "DELETE") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "method not allowed" });
    return;
  }
  // Parse the body. Cap at 16 MB —compression payloads can be
  // large but the user can also accidentally paste a giant
  // file; either way we want to reject before OOMing.
  const MAX_BODY = 16 * 1024 * 1024;
  let raw = "";
  let total = 0;
  req.setEncoding("utf-8");
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) {
      sendJson(res, 413, { error: "payload too large" });
      return;
    }
    raw += chunk;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    sendJson(res, 400, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: `Parse error: ${(err as Error).message}` },
    });
    return;
  }
  const result = await handleMcpRequest(parsed);
  sendJson(res, 200, result);
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

// Auto-start when invoked as a child subprocess.
if (isChildMode()) {
  void runChild().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(
      "[mcp-server] child failed to start:",
      (err as Error).message,
    );
    process.exit(1);
  });
}

// ─── Exports for tests ────────────────────────────────────────────

/** Read the in-memory log buffer. Tests use this to assert
 *  "did the supervisor log the right diagnostic on crash?"
 *  without depending on the `MAX_LOG_LINES` cap. */
export function __getLogBufferForTests(): string[] {
  return [...runtime.logBuffer];
}

/** Reset the runtime between tests. Not exported in `package.json`
 *  builds —purely an internal seam. */
export function __resetForTests(): void {
  clearRestartTimer();
  if (runtime.child) {
    try {
      runtime.child.kill("SIGKILL");
    } catch {
      // ignore
    }
  }
  if (runtime.server) {
    try {
      runtime.server.close();
    } catch {
      // ignore
    }
  }
  runtime.child = null;
  runtime.server = null;
  runtime.logBuffer = [];
  runtime.logBytes = 0;
  runtime.crashTimestamps = [];
  runtime.status = defaultStatus();
  runtime.dispatcher = defaultDispatcher();
}

// (Module load-time sanity check on the tool manifest: every
// tool must have a unique name + a JSON Schema. Cheap enough
// to run at import time and prevents a typo from silently
// shipping.)
{
  const seen = new Set<string>();
  for (const tool of TOOL_DEFINITIONS) {
    const name = tool.name as string;
    if (seen.has(name)) {
      throw new Error(
        `headroom-mcp-server: duplicate tool name "${name}" in TOOL_DEFINITIONS`,
      );
    }
    seen.add(name);
    if (!tool.inputSchema || typeof tool.inputSchema !== "object") {
      throw new Error(
        `headroom-mcp-server: tool "${name}" is missing an inputSchema`,
      );
    }
  }
}
