// Live smoke test for the EverOS v2 client.
//
// Skipped unless a real EverOS server is reachable on
// EVEROS_SMOKE_URL (default http://127.0.0.1:8000). CI has no EverOS
// install, so this is a local-verification gate: it proves the v2
// contract we vendored (envelope shape, owner XOR, scope pinning)
// against the real server rather than against our own mocks.
//
// To run locally:
//   everos init && everos server start &
//   npx vitest run tests/everos-v2.smoke.test.ts
//
// The test writes only to the `agentic-os` app scope with
// memory_type=episode, uses a unique session id, and never touches
// other apps' scopes.

// @vitest-environment node
import { describe, expect, it, beforeAll } from "vitest";
import {
  pingEverOsV2,
  addMemoryV2,
  searchMemoriesV2,
  getMemoriesV2,
  EVEROS_SCOPE_APP_ID,
} from "../src/main/everos-v2";

const BASE_URL = process.env.EVEROS_SMOKE_URL ?? "http://127.0.0.1:8000";

// Vitest does not await an async describe callback: anything awaited inside it
// would not be guaranteed to have resolved before the suite body runs. Probe
// reachability up front (module scope) instead, and keep describe synchronous.
let up = false;
try {
  up = (await pingEverOsV2({ baseUrl: BASE_URL, apiKey: null })).reachable;
} catch {
  up = false;
}

describe("everos v2 live contract", () => {
  beforeAll(() => {
    if (!up) console.warn(`[everos-v2 smoke] skipped: no EverOS server at ${BASE_URL}`);
  });

  it.skipIf(!up)("health reports a version", async () => {
    const health = await pingEverOsV2({ baseUrl: BASE_URL, apiKey: null });
    expect(health.reachable).toBe(true);
    expect(health.status).toBe(200);
    expect(health.version).toBeTruthy();
  });

  it.skipIf(!up)("add → get/search round-trips within the agentic-os scope", async () => {
    const cfg = {
      baseUrl: BASE_URL,
      apiKey: null,
      projectId: "agentic-os-smoke",
      userId: "agent-desktop-smoke",
      agentId: "agent-desktop-smoke",
    };
    const marker = `smoke-${Date.now()}`;
    const add = await addMemoryV2(cfg, {
      sessionId: `smoke-session-${Date.now()}`,
      messages: [
        {
          sender_id: "agent-desktop-smoke",
          sender_name: "smoke",
          role: "user",
          timestamp: Date.now(),
          content: `phase-d smoke marker ${marker}`,
        },
      ],
      deferExtraction: true,
    });
    expect(add.success).toBe(true);

    const recent = await getMemoriesV2(cfg, {
      memoryType: "episode",
      page: 1,
      pageSize: 5,
    });
    // With deferExtraction the row may not be queryable yet; the
    // contract we actually care about is that the call succeeds and is scoped.
    expect(recent.success).toBe(true);
    for (const ep of recent.data?.episodes ?? []) {
      expect(ep.app_id).toBe(EVEROS_SCOPE_APP_ID);
      expect(ep.project_id).toBe("agentic-os-smoke");
    }

    const found = await searchMemoriesV2(cfg, marker, { topK: 5 });
    // Hybrid/vector search needs a working embedding backend. A server
    // configured with placeholder LLM credentials answers 503
    // EXTERNAL_SERVICE_UNAVAILABLE; that is an environment limitation, not a
    // client bug, so accept it explicitly instead of failing the suite.
    if (!found.success) {
      expect(found.error).toMatch(/EXTERNAL_SERVICE_UNAVAILABLE|503|EmbeddingServiceError/i);
      console.warn(`[everos-v2 smoke] search skipped: ${found.error}`);
      return;
    }
    for (const ep of found.data?.episodes ?? []) {
      expect(ep.app_id).toBe(EVEROS_SCOPE_APP_ID);
    }
  });
});
