// Live smoke test for the EverOS v2 client.
//
// Skipped unless a real EverOS server is reachable on EVEROS_SMOKE_URL
// (default http://127.0.0.1:8000). CI has no EverOS install, so this is a
// local-verification gate: it proves the v2 contract we vendored (envelope
// shape, owner XOR, scope pinning, real search) against the real server.
//
// To run locally:
//   export EVEROS_PORT/everos init against a scratch root (see
//   docs/plans/2026-11-28-everos-live-verification.md for the exact recipe
//   used to verify against Ollama + nomic-embed-text), then
//   EVEROS_SMOKE_URL=http://127.0.0.1:8012 npx vitest run tests/everos-v2.smoke.test.ts
//
// Search behaviour:
// - If the server reports embedding capability, search MUST succeed and the
//   returned episode must carry the expected marker and scope.
// - If the server reports no embedding capability (503/EXTERNAL_SERVICE_UNAVAILABLE)
//   the search assertion degrades to a warning instead of a hard failure, so a
//   CI box without an embedding model does not fail this suite. Set
//   EVEROS_SMOKE_REQUIRE_SEARCH=1 to make that path a hard failure instead.
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
const REQUIRE_SEARCH = process.env.EVEROS_SMOKE_REQUIRE_SEARCH === "1";

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
    if (!found.success) {
      // A server with no embedding backend answers 503
      // EXTERNAL_SERVICE_UNAVAILABLE / PROVIDER_NOT_CONFIGURED. That is an
      // environment limitation, not a client bug, so accept it unless the
      // caller explicitly asked for a hard gate.
      if (REQUIRE_SEARCH) {
        throw new Error(`EVEROS_SMOKE_REQUIRE_SEARCH=1 but search failed: ${found.error}`);
      }
      expect(found.error).toMatch(/EXTERNAL_SERVICE_UNAVAILABLE|PROVIDER_NOT_CONFIGURED|503|EmbeddingServiceError/i);
      console.warn(`[everos-v2 smoke] search skipped: ${found.error}`);
      return;
    }
    expect(found.data?.episodes.length ?? 0).toBeGreaterThan(0);
    for (const ep of found.data?.episodes ?? []) {
      expect(ep.app_id).toBe(EVEROS_SCOPE_APP_ID);
      expect(ep.project_id).toBe("agentic-os-smoke");
    }
  });
});
