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

export interface DshClientOptions {
  /** Command to launch. Defaults to `npx`. */
  command?: string;
  /** Arguments. Defaults to the sdk profile invocation. */
  args?: string[];
  /** Working directory for the runtime. */
  cwd?: string;
  /** Extra environment for the child. */
  env?: Record<string, string>;
  /** Per-request timeout. */
  requestTimeoutMs?: number;
}

const DEFAULT_COMMAND = "npx";
const DEFAULT_ARGS = ["-y", "@deepseek-ai/dsh", "--profile", "sdk"];
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

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
      approvalRequests: false,
    });
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
      // "malformed lines are ignored" — per the protocol.
      return;
    }

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
