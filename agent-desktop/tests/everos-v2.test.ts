// @vitest-environment node
// The module under test lives in the Electron *main* process; running it
// under jsdom makes `fetch` reject the Node-flavoured `AbortSignal`.
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { createServer, type Server } from "http";
import { AddressInfo } from "net";
import {
  EVEROS_SCOPE_APP_ID,
  buildScope,
  ownerForMemoryType,
  pingEverOsV2,
  getMemoriesV2,
  searchMemoriesV2,
  addMemoryV2,
  flushMemoriesV2,
  type EverOsV2Config,
} from "../src/main/everos-v2";

describe("everos v2 scope isolation", () => {
  it("always pins the console app scope", () => {
    expect(buildScope({})).toEqual({ app_id: EVEROS_SCOPE_APP_ID });
  });

  it("cannot be widened by a caller-supplied app_id", () => {
    // Doctrine rule 5: the workspace owns its own scope. An operator
    // setting, an adapter bug, or a malformed config must not be able to
    // point this console at the workspace's memories.
    const scope = buildScope({ appId: "ai-workspace" } as never);
    expect(scope.app_id).toBe(EVEROS_SCOPE_APP_ID);
  });

  it("omits project_id when unset but includes it when set", () => {
    expect(buildScope({})).not.toHaveProperty("project_id");
    expect(buildScope({ projectId: "p1" })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
      project_id: "p1",
    });
  });

  it("fails closed when both owners are supplied", () => {
    // Ambiguous input must not silently pick one owner; the server rejects
    // a missing owner with 422, surfacing the caller bug instead of
    // querying the wrong memory space.
    expect(buildScope({ userId: "u1", agentId: "a1" })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
    });
    expect(buildScope({ agentId: "a1" })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
      agent_id: "a1",
    });
    expect(buildScope({ userId: "u1" })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
      user_id: "u1",
    });
    expect(buildScope({})).not.toHaveProperty("user_id");
    expect(buildScope({})).not.toHaveProperty("agent_id");
  });

  it("ignores blank projectId / owner ids", () => {
    expect(buildScope({ projectId: "   ", userId: " " })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
    });
  });
});

describe("ownerForMemoryType", () => {
  const base: EverOsV2Config = { baseUrl: "http://127.0.0.1:8000", apiKey: null };

  it("routes user memory types to a user owner", () => {
    expect(ownerForMemoryType({ ...base, userId: "u" }, "episode")).toEqual({
      kind: "user",
      id: "u",
    });
    expect(ownerForMemoryType({ ...base, userId: "u" }, "profile")).toEqual({
      kind: "user",
      id: "u",
    });
  });

  it("routes agent memory types to an agent owner", () => {
    expect(ownerForMemoryType({ ...base, agentId: "a" }, "agent_case")).toEqual({
      kind: "agent",
      id: "a",
    });
    expect(ownerForMemoryType({ ...base, agentId: "a" }, "agent_skill")).toEqual({
      kind: "agent",
      id: "a",
    });
  });

  it("falls back to the desktop default owner when unset", () => {
    expect(ownerForMemoryType(base, "episode")?.id).toBe("agent-desktop");
    expect(ownerForMemoryType(base, "agent_skill")?.id).toBe("agent-desktop");
  });
});

describe("everos v2 http client", () => {
  let server: Server | null = null;
  let baseUrl = "";
  let lastRequest: { path: string; body: Record<string, unknown> } | null = null;
  let responder: (body: string) => { status: number; body: unknown };

  beforeEach(async () => {
    lastRequest = null;
    responder = () => ({ status: 200, body: { request_id: "r1", data: {} } });
    server = createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          parsed = {};
        }
        lastRequest = { path: req.url ?? "", body: parsed };
        const out = responder(raw);
        res.writeHead(out.status, { "Content-Type": "application/json" });
        res.end(typeof out.body === "string" ? out.body : JSON.stringify(out.body));
      });
    });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const addr = server!.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = null;
  });

  const cfg = (): EverOsV2Config => ({ baseUrl, apiKey: null, userId: "u1", agentId: "a1" });

  it("getMemoriesV2 hits /api/v2/memory/get and pins the app scope", async () => {
    responder = () => ({
      status: 200,
      body: {
        request_id: "r-get",
        data: {
          episodes: [],
          profiles: [],
          agent_cases: [],
          agent_skills: [],
          total_count: 0,
          count: 0,
        },
      },
    });
    const result = await getMemoriesV2(cfg(), { memoryType: "episode", page: 1, pageSize: 5 });
    expect(result.success).toBe(true);
    expect(result.requestId).toBe("r-get");
    expect(lastRequest?.path).toBe("/api/v2/memory/get");
    expect(lastRequest?.body.app_id).toBe(EVEROS_SCOPE_APP_ID);
    expect(lastRequest?.body.user_id).toBe("u1");
    expect(lastRequest?.body.agent_id).toBeUndefined();
    expect(lastRequest?.body.memory_type).toBe("episode");
  });

  it("getMemoriesV2 uses the agent owner for agent_skill", async () => {
    responder = () => ({
      status: 200,
      body: {
        request_id: "r-skill",
        data: {
          episodes: [],
          profiles: [],
          agent_cases: [],
          agent_skills: [],
          total_count: 0,
          count: 0,
        },
      },
    });
    await getMemoriesV2(cfg(), { memoryType: "agent_skill" });
    expect(lastRequest?.body.agent_id).toBe("a1");
    expect(lastRequest?.body.user_id).toBeUndefined();
  });

  it("searchMemoriesV2 reports server errors without throwing", async () => {
    responder = () => ({
      status: 422,
      body: {
        request_id: "r-err",
        error: { code: "INVALID_INPUT", message: "nope", timestamp: "t", path: "/api/v2/memory/search" },
      },
    });
    const result = await searchMemoriesV2(cfg(), "hello");
    expect(result.success).toBe(false);
    expect(result.error).toContain("INVALID_INPUT");
  });

  it("addMemoryV2 treats HTTP 202 as queued success", async () => {
    responder = () => ({
      status: 202,
      body: {
        request_id: "r-add",
        data: { status: "queued", message_count: 1, pending: 1 },
      },
    });
    const result = await addMemoryV2(cfg(), {
      sessionId: "s1",
      messages: [{ sender_id: "u1", role: "user", timestamp: 1, content: "hi" }],
    });
    expect(result.success).toBe(true);
    expect(result.queued).toBe(true);
    expect(result.data?.status).toBe("queued");
    expect(lastRequest?.body.app_id).toBe(EVEROS_SCOPE_APP_ID);
  });

  it("never throws when the server is unreachable", async () => {
    const result = await pingEverOsV2({ baseUrl: "http://127.0.0.1:1", apiKey: null });
    expect(result.reachable).toBe(false);
    expect(result.detail).toBeTruthy();
  });

  it("flushMemoriesV2 returns a failure envelope instead of throwing", async () => {
    responder = () => ({ status: 500, body: "not json" });
    const result = await flushMemoriesV2(cfg(), "s1");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
