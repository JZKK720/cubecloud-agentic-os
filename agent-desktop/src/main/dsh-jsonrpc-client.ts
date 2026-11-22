// dsh-jsonrpc-client.ts — a minimal DeepSeek Harness SDK client.
//
// DeepSeek Harness (`dsh`) exposes no OpenAI-compatible gateway. Its inbound
// surface is the SDK wire protocol: **JSON-RPC 2.0, one message per
// `\n`-terminated line over stdio**, served by the `jsonrpc` plugin in a
// `sdk`/`sdk-minimal` profile.
//
// Verified against `packages/sdk/protocol/README.md` and
// `packages/sdk/protocol/src/types.ts` upstream:
//
//   framing   one JSON-RPC 2.0 message per line. A frame with both `id` and
//             `method` is a request; `id` alone is a response; `method` alone
//             is a notification. Malformed lines are ignored.
//   methods   initialize, session/prompt, session/query, session/resume,
//             session/wait, shutdown
//   events    server→client `session.event` carries
//             { sessionId, event: SessionEvent } where SessionEvent is
//             { type, seq, time, data } and `type` is one of turn/start,
//             turn/end, step/start, step/end, user/message,
//             assistant/message, assistant/attempt, tool/call, tool/result, …
//   terminal  `session.status` reports the whole-agent running/idle transition.
//
// This module owns process lifetime and framing only. It emits
// `SessionEvent`s and lets the harness adapter decide how a delta maps.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

/** One session-log event as streamed by `session.event`. */
export interface DshSessionEvent {
  type: string;
  seq?: number;
  time?: number;
  data?: Record<string, unknown>;
}

/**
 * `initialize` params, verified against the installed package
 * (`dsh-sdk-protocol/lib/types/types.d.ts`). `cwd`, `provider` and `model`
 * are **required**; sending only `approvalRequests` makes the real runtime
 * answer `-32603 "paths[0] must be of type string"`.
 *
 * `provider` names a *route* the deployment mounted. With `dsh-llm-pi-ai` that
 * is whatever key the operator's `providers:` dictionary declares — by default
 * a loopback OpenAI-compatible endpoint, not a cloud API.
 */
export interface DshInitializeParams {
  cwd: string;
  provider: string;
  model: string;
  approvalRequests?: boolean;
  reasoningEffort?: string;
  maxTokens?: number;
  capabilities?: { userQuestions?: boolean };
}

export interface DshClientOptions {
  /** Command to launch. Defaults to `npx`. */
  command?: string;
  /** Arguments. Defaults to the sdk profile invocation. */
  args?: string[];
  /** Working directory for the runtime. Also sent as `initialize.cwd`. */
  cwd?: string;
  /** Extra environment for the child. */
  env?: Record<string, string>;
  /** Per-request timeout. */
  requestTimeoutMs?: number;
  /** Provider adapter id. Defaults to `deepseek-account`. */
  provider?: string;
  /** Model id. Defaults to `deepseek-flash` (the package's own catalog entry). */
  model?: string;
}

const DEFAULT_COMMAND = "npx";
const DEFAULT_ARGS = ["-y", "@deepseek-ai/dsh", "--profile", "sdk"];
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** The default local route id (Ollama). Never a cloud provider. */
export const DSH_DEFAULT_PROVIDER = "ollama";

/**
 * Default model id.
 *
 * Deliberately empty: a local server's catalog is whatever the operator has
 * pulled, so hard-coding a model name would be a guess that breaks on the next
 * machine. An empty id lets the route's own catalog answer.
 */
export const DSH_DEFAULT_MODEL = "";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/** Raised when the runtime rejects a request or the transport dies. */
export class DshRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "DshRpcError";
  }
}

/**
 * A line-framed JSON-RPC 2.0 client over a child process's stdio.
 *
 * Lifecycle: `start()` spawns and initializes; `dispose()` sends `shutdown`
 * and then terminates the child. Every method is safe to call after a
 * transport failure — pending requests reject rather than hang.
 */
export class DshJsonRpcClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly eventListeners = new Set<(event: DshSessionEvent) => void>();
  private readonly statusListeners = new Set<
    (status: { sessionId: string; status: string }) => void
  >();
  private disposed = false;
  private transportError: Error | null = null;
  private nonProtocolLines = 0;

  constructor(private readonly options: DshClientOptions = {}) {}

  /** Spawn the runtime and complete the `initialize` handshake. */
  async start(): Promise<void> {
    if (this.child) return;

    const child = spawn(
      this.options.command ?? DEFAULT_COMMAND,
      this.options.args ?? DEFAULT_ARGS,
      {
        cwd: this.options.cwd,
        env: { ...process.env, ...this.options.env },
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      },
    ) as ChildProcessWithoutNullStreams;

    this.child = child;

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.onStdout(chunk));

    // stderr is the runtime's log channel; drain it so the pipe cannot
    // fill and deadlock the child. We surface it only on transport failure.
    let stderrTail = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });

    child.on("error", (err) => {
      this.fail(new Error(`dsh failed to start: ${err.message}`));
    });

    child.on("exit", (code, signal) => {
      // A clean shutdown is initiated by us; anything else is a transport
      // failure and must reject pending work.
      if (!this.disposed) {
        this.fail(
          new Error(
            `dsh exited (code=${code ?? "null"}, signal=${signal ?? "none"})` +
              (stderrTail ? `: ${stderrTail.trim()}` : ""),
          ),
        );
      }
    });

    await this.request("initialize", {
      cwd: this.options.cwd ?? process.cwd(),
      provider: this.options.provider ?? DSH_DEFAULT_PROVIDER,
      model: this.options.model ?? DSH_DEFAULT_MODEL,
      // Decline server-to-client approvals: the desktop's own preflight
      // policy chain is the gate, not a second one inside the runtime.
      approvalRequests: false,
    } satisfies DshInitializeParams);
  }

  /** Register a listener for `session.event` notifications. */
  onSessionEvent(listener: (event: DshSessionEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /** Register a listener for `session.status` notifications. */
  onSessionStatus(
    listener: (status: { sessionId: string; status: string }) => void,
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  /** Queue a user prompt. Resolves with the durable-enqueue receipt. */
  async prompt(
    sessionId: string,
    contentBlocks: unknown[],
  ): Promise<{ messageId?: string }> {
    const result = await this.request<{ messageId?: string }>(
      "session/prompt",
      { sessionId, contentBlocks },
    );
    return result ?? {};
  }

  /** Block until the session is idle. */
  async wait(sessionId: string): Promise<void> {
    await this.request("session/wait", { sessionId });
  }

  /** Send `shutdown`, then ensure the child is gone. */
  async dispose(): Promise<void> {
    if (this.disposed) {
      this.child?.kill();
      return;
    }
    this.disposed = true;
    try {
      await this.request("shutdown", {}, 2_000);
    } catch {
      /* the runtime may already be exiting */
    }
    this.child?.kill();
    this.fail(new Error("dsh client disposed"));
    this.child = null;
  }

  /** Terminate the child without a graceful shutdown handshake. */
  kill(): void {
    this.disposed = true;
    this.child?.kill();
    this.fail(new Error("dsh client killed"));
    this.child = null;
  }

  // ── transport ────────────────────────────────────────────

  private onStdout(chunk: string): void {
    this.buffer += chunk;
    let idx = this.buffer.indexOf("\n");
    while (idx !== -1) {
      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);
      if (line) this.onFrame(line);
      idx = this.buffer.indexOf("\n");
    }
  }

  private onFrame(lineRaw: string): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(lineRaw) as Record<string, unknown>;
    } catch {
      // The protocol says malformed lines are ignored, and that is right for
      // a stray line. But the serving contract also says "stdout carries only
      // JSON-RPC frames", so a non-frame on stdout means the deployment is
      // misconfigured (a stdout logger was composed in). Ignoring it forever
      // would leave every request waiting for a reply that can never come, so
      // surface it as a transport failure — bounded, not a 30s hang.
      this.nonProtocolLines += 1;
      if (this.nonProtocolLines >= 1) {
        this.fail(
          new Error(
            `dsh wrote non-JSON to stdout (${lineRaw.slice(0, 80)}); the runtime must not log to stdout`,
          ),
        );
      }
      return;
    }
    this.nonProtocolLines = 0;

    const hasId = typeof frame.id === "number";
    const hasMethod = typeof frame.method === "string";

    // Response: id alone.
    if (hasId && !hasMethod) {
      const id = frame.id as number;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      clearTimeout(pending.timer);
      const error = frame.error as
        | { code?: number; message?: string; data?: unknown }
        | undefined;
      if (error) {
        pending.reject(
          new DshRpcError(
            error.message ?? "dsh request failed",
            error.code,
            error.data,
          ),
        );
      } else {
        pending.resolve(frame.result);
      }
      return;
    }

    // Server→client request or notification: method present.
    if (hasMethod) {
      const method = frame.method as string;
      const params = (frame.params ?? {}) as Record<string, unknown>;

      if (method === "session.event") {
        const event = params.event as DshSessionEvent | undefined;
        if (event) {
          for (const listener of this.eventListeners) listener(event);
        }
        return;
      }

      if (method === "session.status") {
        const sessionId = String(params.sessionId ?? "");
        const status = String(params.status ?? "");
        for (const listener of this.statusListeners) {
          listener({ sessionId, status });
        }
        return;
      }

      // Other server→client requests (approval/request, user-question/ask).
      // We declined approval requests at initialize, so answer with a method
      // error rather than leaving the runtime waiting.
      if (hasId) {
        this.write({
          jsonrpc: "2.0",
          id: frame.id,
          error: { code: -32601, message: `unsupported: ${method}` },
        });
      }
    }
  }

  private write(frame: Record<string, unknown>): void {
    if (!this.child || this.transportError) return;
    try {
      this.child.stdin.write(`${JSON.stringify(frame)}\n`);
    } catch (err) {
      this.fail(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private request<T = unknown>(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = this.options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    if (this.transportError) return Promise.reject(this.transportError);
    if (!this.child) {
      return Promise.reject(new Error("dsh client not started"));
    }

    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`dsh ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });

      this.write({ jsonrpc: "2.0", id, method, params });
    });
  }

  private fail(err: Error): void {
    if (this.transportError) return;
    this.transportError = err;
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(err);
    }
    this.pending.clear();
  }
}

/** Map one `SessionEvent` onto a text/reasoning/tool delta.
 *
 *  Exported so the adapter stays a pure translation and the mapping is
 *  testable without a child process. */
export function dshEventToText(event: DshSessionEvent): string | null {
  if (event.type !== "assistant/message") return null;
  const data = event.data ?? {};
  // `stream` carries the exact timed model stream. `text-chunks` batches are
  // { type, time0, index, dt[], texts[] }; every text in the batch is visible
  // output in order.
  const stream = data.stream;
  if (!Array.isArray(stream)) return null;

  const parts: string[] = [];
  for (const record of stream) {
    const r = record as Record<string, unknown>;
    if (r.type === "text-chunks" && Array.isArray(r.texts)) {
      for (const t of r.texts) if (typeof t === "string") parts.push(t);
    } else if (r.type === "chunk") {
      const chunk = r.chunk as Record<string, unknown> | undefined;
      if (chunk?.type === "text-delta" && typeof chunk.text === "string") {
        parts.push(chunk.text);
      }
    }
  }
  return parts.length ? parts.join("") : null;
}

/** Reasoning text from one `assistant/message` / `assistant/attempt`. */
export function dshEventToReasoning(event: DshSessionEvent): string | null {
  if (
    event.type !== "assistant/message" &&
    event.type !== "assistant/attempt"
  ) {
    return null;
  }
  const stream = (event.data ?? {}).stream;
  if (!Array.isArray(stream)) return null;

  const parts: string[] = [];
  for (const record of stream) {
    const r = record as Record<string, unknown>;
    if (r.type === "reasoning-chunks" && Array.isArray(r.texts)) {
      for (const t of r.texts) if (typeof t === "string") parts.push(t);
    }
  }
  return parts.length ? parts.join("") : null;
}

/**
 * Extract a provider failure from one session event.
 *
 * VERIFIED against the real runtime: a model call that cannot complete emits
 * no text at all. The failure arrives as either
 *   - `assistant/attempt` whose stream holds a `{type:'chunk', chunk:{type:
 *     'finish', reason:{kind:'error', failure:{message, code}}}}`, or
 *   - `turn/end` with `reason:{kind:'error', error:{message, code}}`.
 *
 * Without this the adapter saw only `turn/end` with an unfamiliar kind and
 * reported a clean — but completely empty — turn. The first real run produced
 * exactly that: `ACCOUNT_SIGN_IN_REQUIRED` surfaced as nothing at all.
 *
 * Returns null when the event carries no failure.
 */
export function dshEventToFailure(
  event: DshSessionEvent,
): { message: string; code?: string } | null {
  const data = event.data ?? {};

  // Chunk-level finish reason (the model attempt).
  if (Array.isArray(data.stream)) {
    for (const record of data.stream) {
      const r = record as Record<string, unknown>;
      if (r.type !== "chunk") continue;
      const chunk = r.chunk as Record<string, unknown> | undefined;
      if (chunk?.type !== "finish") continue;
      const reason = chunk.reason as
        | { kind?: string; failure?: { message?: string; code?: string } }
        | undefined;
      if (reason?.kind === "error" || reason?.kind === "aborted") {
        return {
          message: reason.failure?.message ?? `model call ${reason.kind}`,
          code: reason.failure?.code,
        };
      }
    }
  }

  // Turn-level reason. `TurnEndReason` is merge-extensible, so treat any kind
  // outside the success set as a failure rather than assuming the union.
  if (event.type === "turn/end") {
    const reason = data.reason as
      | {
          kind?: string;
          error?: { message?: string; code?: string };
          failure?: { message?: string; code?: string };
        }
      | undefined;
    const kind = reason?.kind;
    if (kind && kind !== "completed" && kind !== "stop") {
      const detail = reason?.error ?? reason?.failure;
      return {
        message: detail?.message ?? `turn ended: ${kind}`,
        code: detail?.code,
      };
    }
  }

  return null;
}
