// harness.ts — P1: Harness interface + router.
//
// Abstracts runtime providers (Hermes, IronClaw, OpenClaw, Raven)
// behind a behavioral contract. The HarnessRouter dispatches to the
// active harness by RuntimeProviderId, with automatic session reset
// when the provider switches mid-session.
//
// Inspired by qm's Harness interface (src/harness/harness.ts) and
// HarnessRouter (src/harness/harness-router.ts), adapted to the
// Cubecloud Agent Desktop's single-user, Electron-based architecture.

// ── Types ─────────────────────────────────────────────────

/** Transport mechanism the harness uses to communicate with the runtime. */
export type HarnessTransport =
  | "http"
  | "stdio"
  | "subprocess"
  | "in-process";

/** Static profile describing what a harness can do. */
export interface HarnessAdapterProfile {
  transport: HarnessTransport;
  supportsStreaming: boolean;
  supportsToolCalls: boolean;
  supportsCompaction: boolean;
  supportsSessionReset: boolean;
  /** The RuntimeProviderId this harness implements. */
  providerId: string;
  /** Human-readable name for UI display. */
  displayName: string;
}

/** Input to a single turn. */
export interface HarnessTurnInput {
  /** Session identifier for state tracking. */
  sessionId: string;
  /** The user's message text. */
  message: string;
  /** Optional conversation history (provider-dependent). */
  history?: Array<{ role: string; content: string }>;
  /** Optional model override (otherwise uses the harness default). */
  model?: string;
}

/** A single delta in the streaming response. */
export type HarnessTurnDelta =
  | { type: "text"; content: string }
  | { type: "reasoning"; content: string }
  | { type: "tool_call"; callId: string; name: string; args: string }
  | { type: "tool_result"; callId: string; content: string }
  | { type: "usage"; promptTokens: number; completionTokens: number }
  | { type: "done"; sessionId?: string };

/** Controller for turn execution lifecycle. */
export interface HarnessTurnController {
  /** Run a single turn, yielding streaming deltas. */
  runTurn(input: HarnessTurnInput): AsyncIterable<HarnessTurnDelta>;
  /** Reset the session state (called when switching harnesses). */
  resetSession(sessionId: string): Promise<void>;
  /** Release resources (called on shutdown). */
  close(): Promise<void>;
}

/** Result of history compaction. */
export interface CompactionResult {
  compacted: boolean;
  history: unknown[];
  summary?: string;
}

/** Model-level utilities (compaction, one-shot, judgment). */
export interface HarnessModelUtilities {
  /** Whether the model should respond to the given history. */
  shouldRespond(history: unknown[]): boolean;
  /** Compact history when it exceeds the token budget. */
  compactHistory(
    history: unknown[],
    budget: number,
  ): Promise<CompactionResult>;
  /** One-shot prompt (no streaming, no tools). */
  oneShot(prompt: string, model?: string): Promise<string>;
}

/** Tool name mapping between internal and external names. */
export interface HarnessToolPresentation {
  mapToolName(internalName: string): string;
  unmapToolName(externalName: string): string;
}

/** The behavioral contract for a runtime provider. */
export interface Harness {
  readonly profile: HarnessAdapterProfile;
  readonly turns: HarnessTurnController;
  readonly models: HarnessModelUtilities;
  readonly tools: HarnessToolPresentation;
}

/** Function that resolves a session to a runtime provider id. */
export type HarnessResolver = (
  sessionId: string,
) => Promise<string>;

// ── HarnessRouter ──────────────────────────────────────────

/**
 * Dispatches turns to the active harness by RuntimeProviderId.
 * When the provider changes mid-session, calls resetSession on
 * the old harness before dispatching to the new one.
 */
export interface HarnessRouter {
  /** Run a turn through the resolved harness. */
  runTurn(
    sessionId: string,
    input: HarnessTurnInput,
  ): AsyncIterable<HarnessTurnDelta>;
  /** Get the currently active provider id for a session. */
  getActiveProvider(sessionId: string): string | undefined;
  /** Close all registered harnesses. */
  close(): Promise<void>;
}

/** Create a HarnessRouter from a map of adapters and a resolver. */
export function createHarnessRouter(
  adapters: ReadonlyMap<string, Harness>,
  resolve: HarnessResolver,
): HarnessRouter {
  // Track the active provider per session so we can detect switches.
  const activeProvider = new Map<string, string>();

  return {
    async *runTurn(sessionId, input) {
      const providerId = await resolve(sessionId);
      const harness = adapters.get(providerId);
      if (!harness) {
        throw new Error(
          `No harness for provider "${providerId}"`,
        );
      }

      // Detect provider switch: if the session was previously on
      // a different provider, reset the old harness's session.
      const previous = activeProvider.get(sessionId);
      if (previous !== undefined && previous !== providerId) {
        const oldHarness = adapters.get(previous);
        if (oldHarness) {
          await oldHarness.turns.resetSession(sessionId);
        }
      }
      activeProvider.set(sessionId, providerId);

      yield* harness.turns.runTurn(input);
    },

    getActiveProvider(sessionId) {
      return activeProvider.get(sessionId);
    },

    async close() {
      for (const harness of adapters.values()) {
        await harness.turns.close();
      }
      activeProvider.clear();
    },
  };
}