// ag-ui-harness-source.ts — serve AG-UI runs from the live harness registry.
//
// WHY THIS EXISTS: `ag-ui-run.ts` gives the kernel an AG-UI endpoint, but a
// run needs something to produce deltas. Leaving that to a registered
// capability made the endpoint answer NO_TURN_SOURCE out of the box — honest,
// but not useful: an external client got a protocol-compliant error instead of
// a reply.
//
// RECON THAT CHANGED THE DESIGN: the console kernel already imports
// `src/main/hermes.ts` for connection diagnostics, and that pulls the entire
// harness registry into the kernel's 309-module import closure. The closure is
// Electron-free and the kernel boots under
// `node --experimental-strip-types`. So the kernel does not need an
// indirection to reach a harness — the earlier assumption that it did was
// simply wrong, and it is what made this endpoint inert.
//
// SCOPE: read-only with respect to the desktop. It resolves the operator's
// active runtime exactly as the chat path does (`createHarnessRegistry`'s
// resolver reads `runtime.provider`), runs one turn per AG-UI run, and maps
// deltas through the same encoder the IPC chat path uses.

import type { AgUiTurnSource } from "./ag-ui-run.ts";
import { createHarnessRegistry } from "../src/main/harnesses/registry.ts";

export interface CreateHarnessAgUiSourceOptions {
  /** Override the session id. Defaults to the AG-UI thread id, so one thread
   *  is one runtime session. */
  sessionId?: (input: { threadId: string; runId: string }) => string;
  /** Override the registry factory (tests pass a fake). */
  createRegistry?: () => ReturnType<typeof createHarnessRegistry>;
}

/**
 * Build a turn source backed by the resolved runtime lane.
 *
 * The registry is created lazily and reused, so a second run on the same
 * thread reuses the same adapters — spawning a runtime process per run would
 * make every AG-UI call pay the startup cost.
 */
export function createHarnessAgUiSource(
  options: CreateHarnessAgUiSourceOptions = {},
): AgUiTurnSource & { close(): Promise<void> } {
  const makeRegistry = options.createRegistry ?? createHarnessRegistry;
  const sessionIdFor =
    options.sessionId ?? (({ threadId }: { threadId: string }) => threadId);
  let registry: ReturnType<typeof createHarnessRegistry> | null = null;

  return {
    async *runTurn({ threadId, runId, message, history }) {
      registry ??= makeRegistry();
      const sessionId = sessionIdFor({ threadId, runId });
      for await (const delta of registry.router.runTurn(sessionId, {
        sessionId,
        message,
        ...(history.length > 0 ? { history } : {}),
      })) {
        yield delta;
      }
    },
    async close() {
      if (!registry) return;
      await registry.router.close();
      registry = null;
    },
  };
}
