// harness-chat.ts — route a chat turn through the HarnessRouter.
//
// WHY THIS EXISTS: until now the harness registry only fed the before_model
// policy chain (createBeforeModelChain). Chat itself still went straight to
// `/v1/chat/completions` via raw http.request in hermes.ts, so registering a
// harness adapter changed *policy* and nothing else. That made a fifth runtime
// lane impossible: adding `deepseek-harness` to the registry would have shown
// up in the UI and then been ignored by every real turn.
//
// This module is the missing half: it drives a turn through
// `router.runTurn(...)` and adapts the resulting `HarnessTurnDelta` stream onto
// the desktop's existing `ChatCallbacks` contract. The callbacks are the
// established boundary — hermes.ts already speaks them for the HTTP path — so
// routing through a harness requires no change to the renderer or the IPC.
//
// DESIGN NOTES
//
//  - `runTurn` is pulled with `for await`, not buffered, so streaming
//    behaviour is identical to the HTTP path.
//  - The router throws when a provider has no adapter (that is how
//    ironclaw/openclaw currently behave). Callers must treat a throw as
//    "fall back to the HTTP path", never as a user-visible error — see
//    `canRouteThroughHarness`.
//  - `usage` deltas carry token counts the HTTP path reports too, so they map
//    straight onto `onUsage`.
//  - Tool calls and results are surfaced through `onToolProgress`, which is
//    the only tool channel ChatCallbacks exposes today. That is honest
//    degradation: the HTTP path does the same with its `hermes.tool.progress`
//    pseudo-events.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import type {
  HarnessTurnDelta,
  HarnessTurnInput,
} from "@cubecloud/platform-core";

/** The subset of ChatCallbacks this module needs.
 *
 *  Declared structurally rather than imported so the module stays free of a
 *  dependency on hermes.ts (which imports this file). */
export interface HarnessChatCallbacks {
  onChunk: (text: string) => void;
  onReasoningChunk?: (text: string) => void;
  onDone: (sessionId?: string) => void;
  onError: (error: string) => void;
  onToolProgress?: (tool: string) => void;
  onUsage?: (usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) => void;
}

/** Minimal router surface. Structural for the same isolation reason. */
export interface HarnessRoutedRouter {
  runTurn(
    sessionId: string,
    input: HarnessTurnInput,
  ): AsyncIterable<HarnessTurnDelta>;
}

export interface RoutedTurnOptions {
  sessionId: string;
  input: HarnessTurnInput;
}

export interface RoutedTurnResult {
  /** True when the turn produced at least one text chunk. */
  producedContent: boolean;
  /** Set when the harness emitted a `done` delta naming a session. */
  sessionId?: string;
}

/**
 * Drive one turn through the harness router, translating deltas onto the
 * desktop's chat callbacks.
 *
 * Returns what happened so the caller can decide whether the harness path was
 * actually useful (an adapter that yields nothing should fall back).
 *
 * Throws only for genuinely unexpected adapter failures; a harness that
 * cannot run (stub adapters) throws from `runTurn` and the caller is expected
 * to catch it and fall back to HTTP.
 */
export async function runTurnThroughHarness(
  router: HarnessRoutedRouter,
  cb: HarnessChatCallbacks,
  options: RoutedTurnOptions,
): Promise<RoutedTurnResult> {
  let producedContent = false;
  let resolvedSessionId: string | undefined;
  let failed = false;

  for await (const delta of router.runTurn(options.sessionId, options.input)) {
    switch (delta.type) {
      case "text": {
        if (delta.content) {
          producedContent = true;
          cb.onChunk(delta.content);
        }
        break;
      }

      case "reasoning": {
        if (delta.content) cb.onReasoningChunk?.(delta.content);
        break;
      }

      case "tool_call": {
        // ChatCallbacks has no structured tool-call channel; the HTTP path
        // reports tools as progress labels, so match that.
        cb.onToolProgress?.(delta.name || "tool");
        break;
      }

      case "tool_result": {
        cb.onToolProgress?.("tool result");
        break;
      }

      case "usage": {
        cb.onUsage?.({
          promptTokens: delta.promptTokens,
          completionTokens: delta.completionTokens,
          totalTokens: delta.promptTokens + delta.completionTokens,
        });
        break;
      }

      case "error": {
        // A provider failure carries no text; without this the operator would
        // see a completed turn with an empty answer.
        cb.onError(delta.code ? `${delta.message} (${delta.code})` : delta.message);
        failed = true;
        break;
      }

      case "done": {
        resolvedSessionId = delta.sessionId;
        // The run is finished; stop consuming so a misbehaving adapter that
        // keeps yielding cannot hang the UI. An already-reported failure must
        // not be followed by a success callback.
        if (!failed) cb.onDone(delta.sessionId);
        return { producedContent, sessionId: resolvedSessionId };
      }

      default: {
        // Exhaustiveness guard — a new delta kind must be handled on purpose.
        const never: never = delta;
        throw new Error(
          `unhandled harness delta: ${JSON.stringify(never)}`,
        );
      }
    }
  }

  // The stream ended without a `done` delta. Treat that as completion so the
  // UI never spins forever, but report it so the caller can log the adapter.
  if (!failed) cb.onDone(resolvedSessionId);
  return { producedContent, sessionId: resolvedSessionId };
}

/**
 * Can this provider actually serve a turn today?
 *
 * The registry contains stub adapters for runtimes that have no implementation
 * yet (ironclaw, openclaw). They declare `supportsTurnExecution: false`, so
 * the chat path can choose the HTTP route up front instead of discovering the
 * stub by surfacing a thrown error to the user.
 */
export function canRouteThroughHarness(
  profiles: ReadonlyMap<
    string,
    { profile: { providerId: string; supportsTurnExecution?: boolean } }
  >,
  providerId: string | undefined,
): boolean {
  if (!providerId) return false;
  const adapter = profiles.get(providerId);
  return adapter?.profile.supportsTurnExecution === true;
}
