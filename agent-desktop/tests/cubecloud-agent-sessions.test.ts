/**
 * P3 — AI Workspace read-only session inventory tests
 * (`src/main/cubecloud-agent-sessions.ts`).
 *
 * Contract row D of the workspace↔desktop control-console plan
 * (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md` §5.2) plus
 * coordination row R1 (`docs/plans/2026-10-06-workspace-agentic-os-
 * coordination-matrix.md`): the desktop LISTs and INSPECTS workspace
 * sessions without owning them, and reconciles the two CLI catalogs.
 *
 * Tests verify:
 *   1. listWorkspaceSessions parses `GET /v1/sessions` (data + has_more +
 *      runner_online/host_online) and normalizes every field defensively.
 *   2. getWorkspaceSessionSnapshot parses `GET /v1/sessions/{id}` with
 *      include items.
 *   3. Non-200 / network failure → result with error + empty data,
 *      never throws.
 *   4. listWorkspaceAgents parses `GET /api/agents` (object:list shape).
 *   5. reconcileWorkspaceInventory joins desktop CLI catalog vs workspace
 *      agents + info, flagging divergences on both sides.
 *   6. Session-mutation guard: the module source never references the
 *      mutation endpoints (P3's same-commit CI ban, part 1).
 *
 * `fetch` is mocked; no real network I/O runs in tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SAMPLE_SESSION = {
  id: "conv_abc123",
  agent_id: "ag_abc123",
  agent_name: "research-agent",
  status: "running",
  created_at: 1_759_000_000,
  runner_id: "runner_abc123",
  runner_online: true,
  host_online: true,
  host_resumable: false,
  title: "debugging auth flow",
  background_task_count: null,
  external_session_id: null,
  model_override: null,
  git_branch: null,
};

const SAMPLE_SESSION_SNAPSHOT = {
  ...SAMPLE_SESSION,
  items: [
    {
      id: "msg_aaa",
      type: "message",
      role: "user",
      status: "completed",
      content: [{ type: "input_text", text: "Plan my trip" }],
    },
  ],
  pending_elicitations: [],
};

describe("cubecloud-agent sessions (read-only inventory, P3/R1)", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listWorkspaceSessions", () => {
    it("parses the paginated list shape and normalizes liveness flags", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ data: [SAMPLE_SESSION], has_more: true }),
      );
      const { listWorkspaceSessions } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await listWorkspaceSessions("http://127.0.0.1:6767");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      const s = result.data[0]!;
      expect(s.id).toBe("conv_abc123");
      expect(s.agentName).toBe("research-agent");
      expect(s.status).toBe("running");
      expect(s.runnerOnline).toBe(true);
      expect(s.hostOnline).toBe(true);
      expect(s.title).toBe("debugging auth flow");
      expect(result.hasMore).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("tolerates missing optional fields and unknown statuses", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          data: [{ id: "conv_min", status: "waiting", created_at: 42 }],
          has_more: false,
        }),
      );
      const { listWorkspaceSessions } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await listWorkspaceSessions("http://127.0.0.1:6767");
      expect(result.success).toBe(true);
      const s = result.data[0]!;
      expect(s.agentName).toBeNull();
      expect(s.runnerOnline).toBeNull();
      expect(s.status).toBe("waiting");
    });

    it("returns a failed result on non-200 and never throws on network errors", async () => {
      fetchMock.mockResolvedValue(new Response("boom", { status: 502 }));
      const { listWorkspaceSessions } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await listWorkspaceSessions("http://127.0.0.1:6767");
      expect(result.success).toBe(false);
      expect(result.data).toEqual([]);
      expect(result.error).toMatch(/502/);

      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
      const result2 = await listWorkspaceSessions("http://127.0.0.1:6767");
      expect(result2.success).toBe(false);
      expect(result2.data).toEqual([]);
    });

    it("normalizes the trailing slash of the base URL", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: [], has_more: false }));
      const { listWorkspaceSessions } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      await listWorkspaceSessions("http://127.0.0.1:6767///");
      expect(String(fetchMock.mock.calls[0]![0])).toBe(
        "http://127.0.0.1:6767/v1/sessions?limit=50",
      );
    });
  });

  describe("getWorkspaceSessionSnapshot", () => {
    it("parses the snapshot with items", async () => {
      fetchMock.mockResolvedValue(jsonResponse(SAMPLE_SESSION_SNAPSHOT));
      const { getWorkspaceSessionSnapshot } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await getWorkspaceSessionSnapshot(
        "http://127.0.0.1:6767",
        "conv_abc123",
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe("running");
      expect(result.items).toHaveLength(1);
      expect(result.items![0]!.kind).toBe("message");
      expect(result.items![0]!.role).toBe("user");
      expect(result.items![0]!.text).toBe("Plan my trip");
    });

    it("404 → failed result with status code, never throws", async () => {
      fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
      const { getWorkspaceSessionSnapshot } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await getWorkspaceSessionSnapshot(
        "http://127.0.0.1:6767",
        "conv_missing",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/404/);
    });
  });

  describe("listWorkspaceAgents", () => {
    it("parses the object:list bundle registry", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          object: "list",
          data: [
            { id: "ag_abc123", object: "agent", name: "my-agent" },
            { id: "ag_def456", object: "agent", name: "other-agent" },
          ],
          first_id: "ag_abc123",
          last_id: "ag_def456",
          has_more: false,
        }),
      );
      const { listWorkspaceAgents } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await listWorkspaceAgents("http://127.0.0.1:6767");
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]!.name).toBe("my-agent");
    });
  });

  describe("reconcileWorkspaceInventory (R1)", () => {
    it("joins desktop catalog vs workspace agents and flags divergences", async () => {
      fetchMock.mockImplementation(async (input: unknown) => {
        const url = String(input);
        if (url.includes("/v1/agents")) {
          return jsonResponse({
            object: "list",
            data: [
              { id: "ag_1", object: "agent", name: "claude" },
              { id: "ag_2", object: "agent", name: "workspace-only-bundle" },
            ],
            has_more: false,
          });
        }
        return jsonResponse({ data: [], has_more: false });
      });
      const { reconcileWorkspaceInventory } = await import(
        "../src/main/cubecloud-agent-sessions"
      );
      const result = await reconcileWorkspaceInventory(
        "http://127.0.0.1:6767",
        [
          { id: "claude", name: "Claude Code" },
          { id: "codex", name: "Codex CLI" },
          { id: "goose", name: "Goose" },
        ],
      );
      expect(result.workspaceAgents).toHaveLength(2);
      // Desktop catalog runner present in workspace adapters → coordinated.
      expect(result.coordinated).toContain("claude");
      // Workspace-only bundle → divergence the operator can adopt.
      expect(result.workspaceOnly).toContain("workspace-only-bundle");
      // Desktop catalog CLI with no workspace adapter → viewed flag.
      expect(result.consoleOnly).toContain("codex");
      expect(result.consoleOnly).toContain("goose");
    });
  });

  describe("P3 CI ban — no session mutation from the read-only module", () => {
    it("module source contains no mutation calls or mutation method usage", async () => {
      const src = readFileSync(
        join(
          __dirname,
          "..",
          "src",
          "main",
          "cubecloud-agent-sessions.ts",
        ),
        "utf8",
      );
      // The Workspace owns mutations (API.md: PATCH/POST/DELETE on
      // /v1/sessions/{id}). The desktop view must never call them.
      expect(src).not.toMatch(/\.patch\(|method:\s*"PATCH"/);
      expect(src).not.toMatch(/method:\s*"(POST|DELETE|PUT)"/);
      expect(src).not.toMatch(/\/events"/);
    });
  });
});