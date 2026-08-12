// registry.ts — P1 part 3: Harness registry.
//
// Wires all 4 runtime adapters (Hermes, IronClaw, OpenClaw, Raven)
// into a HarnessRouter. The resolver reads the active runtime provider
// from the desktop's config.
//
// Currently only Hermes has a full adapter. IronClaw, OpenClaw, and
// Raven will get their own adapters in follow-up work. For now, they
// are registered as stubs that throw when called — this allows the
// router to know they exist (for UI display) while gracefully
// rejecting turns routed to them.

import {
  createHarnessRouter,
  type Harness,
  type HarnessRouter,
  type HarnessResolver,
} from "@cubecloud/platform-core";
import { createHermesHarness } from "./hermes-harness";
import { getConfigValue } from "../config";

/** A stub harness for runtimes that don't have a full adapter yet. */
function createStubHarness(
  providerId: string,
  displayName: string,
): Harness {
  return {
    profile: {
      transport: "http",
      supportsStreaming: true,
      supportsToolCalls: true,
      supportsCompaction: false,
      supportsSessionReset: true,
      providerId,
      displayName,
    },
    turns: {
      async *runTurn() {
        throw new Error(
          `${displayName} harness not yet implemented (P1 stub)`,
        );
      },
      async resetSession() {},
      async close() {},
    },
    models: {
      shouldRespond: () => false,
      async compactHistory(history: unknown[]) {
        return { compacted: false, history };
      },
      async oneShot() {
        throw new Error(`${displayName} oneShot not yet implemented`);
      },
    },
    tools: {
      mapToolName: (name: string) => name,
      unmapToolName: (name: string) => name,
    },
  };
}

/** The harness registry: all adapters + router + resolver. */
export interface HarnessRegistry {
  /** Map of providerId → Harness adapter. */
  readonly adapters: ReadonlyMap<string, Harness>;
  /** The router that dispatches turns to the active harness. */
  readonly router: HarnessRouter;
  /** Resolve the active provider for a session. */
  readonly resolve: HarnessResolver;
  /** Close all harnesses. */
  close(): Promise<void>;
}

/** Create the harness registry with all 4 runtime providers. */
export function createHarnessRegistry(): HarnessRegistry {
  const adapters = new Map<string, Harness>([
    ["hermes", createHermesHarness()],
    ["ironclaw", createStubHarness("ironclaw", "IronClaw")],
    ["openclaw", createStubHarness("openclaw", "OpenClaw")],
    ["raven", createStubHarness("raven", "Raven")],
  ]);

  const resolve: HarnessResolver = async (_sessionId: string) => {
    // Read the active runtime provider from config.
    // Default to "hermes" if not set.
    const providerId = getConfigValue("runtime.provider") || "hermes";
    return providerId;
  };

  const router = createHarnessRouter(adapters, resolve);

  return {
    adapters,
    router,
    resolve,
    async close() {
      await router.close();
    },
  };
}