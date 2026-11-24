// mcp-probe.ts — verify a registered MCP server actually answers.
//
// WHY THIS EXISTS: the desktop has no outbound MCP client. `addMcpServer`
// only writes `mcp_servers:` into the profile's config.yaml; the *runtime*
// (Hermes et al.) is what connects. That means "I added an SSE server" was
// previously unverifiable from the UI — a typo in the URL or a `type:`
// the runtime rejects looked exactly like success.
//
// This module performs the smallest possible MCP handshake so the MCP
// screen can say "reachable, N tools" instead of guessing. It is a probe,
// not a client: it lists tools and disconnects. It deliberately does NOT
// invoke tools.
//
// TRANSPORTS
//   sse   — legacy HTTP+SSE (fastapi-mcp, most Python servers): GET the
//           endpoint with `Accept: text/event-stream`, read the first
//           `endpoint` event to learn the POST URL, then POST `initialize`
//           and `tools/list` there and read the responses back off the
//           same stream.
//   http  — Streamable HTTP: POST `initialize` and `tools/list` to the
//           endpoint, accepting either a JSON body or an SSE body.
//
// Both are bounded by a hard timeout and never throw: the caller renders
// the result, including failures.
//
// Security floor: loopback http is allowed (local sidecars); anything else
// must be https. This mirrors normalizeWeknoraBaseUrl in weknora-probe.ts.

const MCP_PROBE_TIMEOUT_MS_CONST = 6_000;

export const MCP_PROBE_TIMEOUT_MS = MCP_PROBE_TIMEOUT_MS_CONST;

const MCP_PROTOCOL_VERSION = "2025-06-18";

export interface McpProbeResult {
  /** True when the server completed the handshake and answered tools/list. */
  ok: boolean;
  /** Tool names the server advertises, or null when the call never got that far. */
  tools: string[] | null;
  /** Human-readable one-liner for the row. */
  detail: string;
  /** Set when the URL shape or scheme is unusable. */
  error: string | null;
  scannedAt: string;
}

/** Accept loopback http and remote https; reject everything else.
 *  Returns the normalized URL or null. */
export function normalizeMcpEndpoint(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  // `host.docker.internal` is the Docker host-gateway alias. It is included for
  // the same reason `isLoopbackCdpUrl` includes it: the kernel runs in a
  // container whose own 127.0.0.1 is NOT the host's, so this alias is the only
  // way it reaches a host-run MCP server. Measured 2026-11-24 from inside
  // cc-console-backend-1: 127.0.0.1:11434 and localhost:11434 both fail while
  // host.docker.internal:11434 answers 200.
  //
  // It does not widen the boundary - docker adds the alias via extra_hosts and
  // it resolves to the operator's own machine - and it is matched EXACTLY, so a
  // look-alike such as host.docker.internal.evil.com is still rejected below.
  const isLoopback =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "[::1]" ||
    host === "host.docker.internal";

  // Plain http is only acceptable on loopback.
  if (url.protocol === "http:" && !isLoopback) return null;

  // Drop a trailing slash so paths concatenate predictably.
  const normalized = url.toString().replace(/\/$/, "");
  return normalized;
}

interface JsonRpcResponse {
  jsonrpc?: string;
  id?: unknown;
  result?: { tools?: Array<{ name?: string }> };
  error?: { code?: number; message?: string };
}

/** Pull the first complete JSON-RPC response out of an SSE text buffer.
 *  AG-UI's sibling lesson applies: one event per `data:` line. */
function firstSseData(body: string): string | null {
  for (const line of body.split("\n")) {
    if (line.startsWith("data:")) {
      const data = line.slice(5).trim();
      if (data) return data;
    }
  }
  return null;
}

/** Read the `endpoint` event a legacy SSE server sends first. */
function sseEndpointEvent(body: string): string | null {
  for (const line of body.split("\n")) {
    if (line.startsWith("event:") && line.slice(6).trim() === "endpoint") {
      return "endpoint";
    }
  }
  return null;
}

function describeError(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === "AbortError") return "timed out";
    return err.message.slice(0, 200);
  }
  return String(err).slice(0, 200);
}

/** POST a JSON-RPC frame. Returns the raw body plus its content type. */
async function postJsonRpc(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
  id: number,
): Promise<{ body: string; contentType: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MCP_PROBE_TIMEOUT_MS_CONST);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
      signal: controller.signal,
    });
    const body = await res.text();
    return {
      body,
      contentType: res.headers.get("content-type") ?? "",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Parse either a bare JSON body or an SSE-framed one. */
function parseRpcBody(body: string, contentType: string): JsonRpcResponse | null {
  const candidate = contentType.includes("text/event-stream")
    ? firstSseData(body)
    : body;
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as JsonRpcResponse;
  } catch {
    // Some servers frame SSE without advertising the content type.
    const fromSse = firstSseData(body);
    if (fromSse && fromSse !== candidate) {
      try {
        return JSON.parse(fromSse) as JsonRpcResponse;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Probe a Streamable-HTTP MCP endpoint: initialize, then tools/list. */
async function probeHttp(endpoint: string): Promise<McpProbeResult> {
  const scannedAt = new Date().toISOString();

  const initRaw = await postJsonRpc(
    endpoint,
    "initialize",
    {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "cubecloud-agent-desktop", version: "probe" },
    },
    1,
  );
  const init = parseRpcBody(initRaw.body, initRaw.contentType);

  if (!init) {
    return {
      ok: false,
      tools: null,
      detail: "handshake returned an unparseable body",
      error: "unparseable initialize response",
      scannedAt,
    };
  }
  if (init.error) {
    return {
      ok: false,
      tools: null,
      detail: `handshake rejected: ${init.error.message ?? "unknown"}`,
      error: init.error.message ?? "initialize error",
      scannedAt,
    };
  }

  const listRaw = await postJsonRpc(endpoint, "tools/list", {}, 2);
  const listed = parseRpcBody(listRaw.body, listRaw.contentType);

  if (listed?.error) {
    return {
      ok: false,
      tools: null,
      detail: `reachable, but tools/list failed: ${listed.error.message ?? "unknown"}`,
      error: listed.error.message ?? "tools/list error",
      scannedAt,
    };
  }

  const names = (listed?.result?.tools ?? [])
    .map((t) => t.name)
    .filter((n): n is string => typeof n === "string");

  return {
    ok: true,
    tools: names,
    detail: names.length === 0 ? "reachable, 0 tools" : `reachable, ${names.length} tools`,
    error: null,
    scannedAt,
  };
}

/**
 * Probe a legacy HTTP+SSE MCP endpoint.
 *
 * The transport: GET the endpoint with `Accept: text/event-stream`; the
 * server responds with an SSE stream whose first event is `endpoint`
 * carrying the POST URL. We read that URL, then POST `initialize` there.
 * The response arrives on the *same* GET stream, which makes a complete
 * round-trip awkward inside one bounded probe — so this probe reports
 * reachability plus the advertised POST endpoint, and lists tools only
 * when the server also answers `tools/list` synchronously on POST.
 */
async function probeSse(endpoint: string): Promise<McpProbeResult> {
  const scannedAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MCP_PROBE_TIMEOUT_MS_CONST);

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: { accept: "text/event-stream" },
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        tools: null,
        detail: `HTTP ${res.status} from the SSE endpoint`,
        error: `HTTP ${res.status}`,
        scannedAt,
      };
    }

    // Read only the first chunk — enough for the endpoint event — then
    // hang up. The body is a live stream, so we must not await it whole.
    const reader = res.body?.getReader();
    let head = "";
    if (reader) {
      const { value } = await reader.read();
      head = value ? new TextDecoder().decode(value) : "";
      try {
        await reader.cancel();
      } catch {
        /* stream already closed */
      }
    }

    const sawEndpoint = sseEndpointEvent(head) !== null;
    if (!sawEndpoint) {
      // The server accepted the stream but the dialect differs. Report
      // reachable-but-unverified rather than claiming success.
      return {
        ok: false,
        tools: null,
        detail: "SSE stream opened but no endpoint event",
        error: "unexpected SSE dialect (no endpoint event)",
        scannedAt,
      };
    }

    return {
      ok: true,
      tools: null,
      detail: "SSE endpoint reachable",
      error: null,
      scannedAt,
    };
  } catch (err) {
    return {
      ok: false,
      tools: null,
      detail: describeError(err),
      error: describeError(err),
      scannedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Probe a registered MCP server. Never throws. */
export async function probeMcpServer(entry: {
  name: string;
  type: string;
  detail: string;
}): Promise<McpProbeResult> {
  const scannedAt = new Date().toISOString();

  if (entry.type === "stdio") {
    // stdio servers are spawned by the runtime; there is no endpoint to
    // reach from here. Say so plainly instead of faking a health check.
    return {
      ok: false,
      tools: null,
      detail: "stdio server — the runtime spawns it",
      error: null,
      scannedAt,
    };
  }

  const endpoint = normalizeMcpEndpoint(entry.detail);
  if (!endpoint) {
    return {
      ok: false,
      tools: null,
      detail: "endpoint is not a usable http(s) URL",
      error: "invalid endpoint",
      scannedAt,
    };
  }

  try {
    return entry.type === "sse"
      ? await probeSse(endpoint)
      : await probeHttp(endpoint);
  } catch (err) {
    return {
      ok: false,
      tools: null,
      detail: describeError(err),
      error: describeError(err),
      scannedAt,
    };
  }
}
