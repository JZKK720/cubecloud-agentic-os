// ag-ui-run.ts — bridge a harness turn to the console kernel's AG-UI endpoint.
//
// WHY THIS EXISTS: `packages/platform-core/src/ag-ui.ts` encodes
// `HarnessTurnDelta` into AG-UI events, and `console-backend/registry.ts`
// serves `POST /api/ag-ui/run`, but nothing joined them. The codec was
// unit-tested and unreachable — a protocol claim you could not exercise from
// outside the app. This module is the join.
//
// SHAPE: one run = one harness turn. The caller supplies a way to stream a
// turn (the harness router), and this turns the delta stream into
// conformant AG-UI events on the response. Encoding stays in platform-core;
// transport stays in the registry; this file owns only the wiring and the
// error contract.
//
// Electron-free on purpose: the console kernel imports it, and the kernel's
// transitive closure must never reach `electron`
// (`tests/console-kernel-electron-free.test.ts`).

import { createAgUiEncoder } from "@cubecloud/platform-core";
import type { HarnessTurnDelta } from "@cubecloud/platform-core";
import type { AgUiRunHandler } from "./registry";

/** The run's message plus the prior thread, for harnesses that take history. */
export interface AgUiTurnRequest {
  threadId: string;
  runId: string;
  message: string;
  history: Array<{ role: string; content: string }>;
}

/** What a run needs from the harness layer. */
export interface AgUiTurnSource {
  /**
   * Run one turn for `message` and yield deltas in order. The console kernel
   * reaches the harness router through this interface rather than importing
   * it, so the kernel stays free of runtime-specific modules.
   */
  runTurn(input: AgUiTurnRequest): AsyncIterable<HarnessTurnDelta>;
}

export interface CreateAgUiRunHandlerOptions {
  source: AgUiTurnSource;
  /** Protocol version stamped on RUN_STARTED. Defaults to the codec's 1.0. */
  protocolVersion?: string;
}

/** Pull the text of the last user message out of an AG-UI `messages` array.
 *
 *  AG-UI messages are `{id, role, content}` where `content` is either a
 *  string or an array of parts. A run with no user message is a protocol
 *  error, not an empty turn, so the caller is told rather than sent nothing.
 */
export function lastUserMessage(messages: unknown[]): string | null {  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (typeof m !== "object" || m === null) continue;
    const rec = m as { role?: unknown; content?: unknown };
    if (rec.role !== "user") continue;
    if (typeof rec.content === "string") {
      return rec.content.trim() ? rec.content : null;
    }
    if (Array.isArray(rec.content)) {
      const text = rec.content
        .map((part) =>
          typeof part === "object" && part !== null
            ? (part as { text?: unknown }).text
            : undefined,
        )
        .filter((t): t is string => typeof t === "string")
        .join("");
      return text.trim() ? text : null;
    }
  }
  return null;
}

/** History for the harness: the AG-UI thread minus its trailing user message.
 *
 *  AG-UI clients resend the whole thread each run, and the last entry is the
 *  message being sent now — `lastUserMessage` already extracts it, so keeping
 *  it here would deliver the prompt twice.
 */
export function historyFromMessages(
  messages: unknown[],
): Array<{ role: string; content: string }> {
  const out: Array<{ role: string; content: string }> = [];
  for (const m of messages) {
    if (typeof m !== "object" || m === null) continue;
    const rec = m as { role?: unknown; content?: unknown };
    if (rec.role !== "user" && rec.role !== "assistant" && rec.role !== "system") {
      continue;
    }
    if (typeof rec.content === "string") {
      out.push({ role: rec.role, content: rec.content });
      continue;
    }
    if (Array.isArray(rec.content)) {
      const text = rec.content
        .map((p) =>
          typeof p === "object" && p !== null
            ? (p as { text?: unknown }).text
            : undefined,
        )
        .filter((t): t is string => typeof t === "string")
        .join("");
      if (text) out.push({ role: rec.role, content: text });
    }
  }
  if (out.length > 0 && out[out.length - 1].role === "user") out.pop();
  return out;
}

/** Build the handler the console server calls for `POST /api/ag-ui/run`. */
export function createAgUiRunHandler(
  options: CreateAgUiRunHandlerOptions,
): AgUiRunHandler {

  return async (input) => {
    const { source } = options;
    const { threadId, runId, emit } = input;
    const message = lastUserMessage(input.messages);
    if (!message) {
      emit({
        type: "RUN_ERROR",
        message: "no user message in the run input",
      });
      return;
    }

    const encoder = createAgUiEncoder({
      threadId,
      runId,
      ...(options.protocolVersion
        ? { protocolVersion: options.protocolVersion }
        : {}),
    });

    // Track whether the turn reported its own terminal state. The codec's
    // `finish()` closes a run that ended without one, but a turn that already
    // emitted RUN_ERROR must not be followed by RUN_FINISHED — AG-UI treats a
    // run as terminating exactly once.
    let terminated = false;

    for await (const delta of source.runTurn({
      threadId,
      runId,
      message,
      history: historyFromMessages(input.messages),
    })) {
      for (const event of encoder.push(delta)) {
        if (event.type === "RUN_ERROR" || event.type === "RUN_FINISHED") {
          terminated = true;
        }
        emit(event);
      }
      if (delta.type === "error") terminated = true;
      // A run terminates exactly once. The encoder resets its `started` flag
      // after a terminal event, so feeding a trailing `done` would begin a
      // *second* run on the same response — RUN_STARTED then RUN_FINISHED
      // after RUN_ERROR. Stop as soon as the turn is decided.
      if (terminated) break;
    }

    if (!terminated) {
      for (const event of encoder.finish()) emit(event);
    }
  };
}

/**
 * The handler a real kernel boot uses.
 *
 * The kernel reaches a turn two ways, in this order:
 *
 *  1. **Directly**, when the caller passes a `source`. The kernel already
 *     imports `src/main/hermes.ts` for connection diagnostics, and that pulls
 *     the whole harness registry into its import closure (309 modules, and the
 *     closure is Electron-free — `tests/console-kernel-electron-free.test.ts`
 *     enforces it). So the kernel *can* drive a turn without a capability
 *     indirection; earlier versions of this file assumed otherwise and made
 *     the endpoint permanently answer NO_TURN_SOURCE.
 *
 *  2. **Via an `agUiTurn` capability**, for a deployment that registers a turn
 *     provider without loading the harness registry (a slimmed container, a
 *     test harness, a remote driver).
 *
 * Neither is a stub: if a source exists, a run streams. `NO_TURN_SOURCE` now
 * means what it says — no source was configured at all.
 */
export function createKernelAgUiRunHandler(
  registry: {
    get(name: string): { handler: (args: unknown[]) => Promise<unknown> } | undefined;
  },
  options: { protocolVersion?: string; source?: AgUiTurnSource } = {},
): AgUiRunHandler {
  return createAgUiRunHandler({
    ...options,
    source: options.source ?? capabilitySource(registry),
  });
}

/** Reach a turn through the registered `agUiTurn` capability. */
function capabilitySource(registry: {
  get(name: string): { handler: (args: unknown[]) => Promise<unknown> } | undefined;
}): AgUiTurnSource {
  return {
    async *runTurn({ threadId, runId, message }) {
      const cap = registry.get("agUiTurn");
      if (!cap) {
        yield {
          type: "error",
          message:
            "no harness is attached to the kernel: register an 'agUiTurn' capability to serve AG-UI runs",
          code: "NO_TURN_SOURCE",
        } satisfies HarnessTurnDelta;
        return;
      }
      const result = await cap.handler([{ threadId, runId, message }]);
      // A capability returns a plain delta array: handlers are JSON-shaped by
      // the kernel's "never throws" convention, so streaming across the
      // boundary is not available. A harness adapter that wants true streaming
      // passes `source` directly instead.
      if (!Array.isArray(result)) {
        yield {
          type: "error",
          message: "the 'agUiTurn' capability returned no delta array",
          code: "BAD_TURN_SOURCE",
        } satisfies HarnessTurnDelta;
        return;
      }
      for (const delta of result) {
        yield delta as HarnessTurnDelta;
      }
    },
  };
}
