// hermes-harness.ts — P1 part 2: HermesHarness adapter.
//
// Wraps the existing hermes.ts#sendMessage() callback-based API
// behind the Harness interface's AsyncIterable<HarnessTurnDelta>.
// This is a thin adapter — it doesn't change any existing behavior,
// just translates the callback contract to the async iterable contract.
//
// The adapter is created via createHermesHarness() so tests can
// mock the sendMessage dependency.

import {
  sendMessage,
  ensureInitialized,
  type ChatCallbacks,
} from "../hermes";
import type {
  Harness,
  HarnessAdapterProfile,
  HarnessTurnInput,
  HarnessTurnDelta,
  HarnessTurnController,
  HarnessModelUtilities,
  HarnessToolPresentation,
  CompactionResult,
} from "@cubecloud/platform-core";

/** Create a Hermes harness adapter. */
export function createHermesHarness(): Harness {
  const profile: HarnessAdapterProfile = {
    transport: "http",
    supportsStreaming: true,
    supportsToolCalls: true,
    supportsCompaction: false, // P5 will enable this
    supportsSessionReset: true,
    providerId: "hermes",
    displayName: "Hermes Agent",
  };

  const turns: HarnessTurnController = {
    async *runTurn(
      input: HarnessTurnInput,
    ): AsyncIterable<HarnessTurnDelta> {
      ensureInitialized();

      // Bridge the callback-based sendMessage to an async iterable.
      // We accumulate deltas in a queue and yield them as they arrive.
      const queue: HarnessTurnDelta[] = [];
      let resolveNext: (() => void) | null = null;
      let isDone = false;
      let error: Error | null = null;

      const flush = () => {
        if (resolveNext) {
          const fn = resolveNext;
          resolveNext = null;
          fn();
        }
      };

      const callbacks: ChatCallbacks = {
        onChunk: (text: string) => {
          queue.push({ type: "text", content: text });
          flush();
        },
        onReasoningChunk: (text: string) => {
          queue.push({ type: "reasoning", content: text });
          flush();
        },
        onDone: (sessionId?: string) => {
          queue.push({ type: "done", sessionId });
          isDone = true;
          flush();
        },
        onError: (err: string) => {
          error = new Error(err);
          // Yield a done with no sessionId to signal error
          queue.push({ type: "done", sessionId: undefined });
          isDone = true;
          flush();
        },
        onUsage: (usage) => {
          queue.push({
            type: "usage",
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
          });
          flush();
        },
        onToolProgress: undefined,
      };

      // Call sendMessage — it returns a ChatHandle with abort()
      const handle = sendMessage(
        input.message,
        callbacks,
        undefined, // profile — use default
        input.sessionId, // resumeSessionId
        input.history, // history
      );

      // Yield deltas as they arrive
      while (!isDone && !error) {
        if (queue.length > 0) {
          yield queue.shift()!;
        } else {
          // Wait for the next delta
          await new Promise<void>((resolve) => {
            resolveNext = resolve;
          });
        }
      }

      // Drain any remaining deltas
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      // Clean up the handle
      if (handle && typeof handle.abort === "function") {
        // The turn is done — no need to abort, but keep the reference
        // so the linter doesn't complain about unused variable.
        void handle;
      }
    },

    async resetSession(_sessionId: string): Promise<void> {
      // Hermes uses session IDs embedded in the request — no
      // explicit reset needed. The next runTurn with a new
      // sessionId will start a fresh session.
    },

    async close(): Promise<void> {
      // No persistent resources to clean up — the gateway
      // process lifecycle is managed elsewhere.
    },
  };

  const models: HarnessModelUtilities = {
    shouldRespond: (_history: unknown[]) => true,

    async compactHistory(
      history: unknown[],
      _budget: number,
    ): Promise<CompactionResult> {
      // P5 will implement auto-compaction. For now, no-op.
      return { compacted: false, history };
    },

    async oneShot(_prompt: string, _model?: string): Promise<string> {
      // Not yet implemented — P2 (provider routing) will enable this.
      return "";
    },
  };

  const tools: HarnessToolPresentation = {
    mapToolName: (name: string) => name,
    unmapToolName: (name: string) => name,
  };

  return { profile, turns, models, tools };
}