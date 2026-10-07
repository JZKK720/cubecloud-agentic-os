/**
 * P6 — Governance relay tests (`src/main/cubecloud-agent-governance.ts`).
 *
 * Contract row G (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md`
 * §5.2): the console renders the workspace's governance surfaces and
 * delivers human approval verdicts.
 *
 * Workspace contract (grounded in cubecloud_agent/server/API.md + schemas.py):
 *   - Snapshot `pending_elicitations[]` — MCP-shaped:
 *     `{ type: "response.elicitation_request", elicitation_id,
 *        method: "elicitation/create", params: { mode: "form"|"url",
 *        message, requestedSchema?, url?, phase?, policy_name?,
 *        content_preview?, target_session_id? } }`.
 *   - Verdict: POST /v1/sessions/{sid}/elicitations/{eid}/resolve with
 *     `{"action": "accept"|"decline"|"cancel", "content"?}` → 202.
 *     NOTE: this is the ONE write the governance module may perform —
 *     the deliver-the-human-verdict path (a console duty), NOT session
 *     mutation. Everything else is GET.
 *
 * Tests verify:
 *   1. listPendingElicitations parses snapshot pending_elicitations
 *      defensively (form + url modes, mirrored-child target).
 *   2. resolveElicitation posts the verdict to the exact resource-scoped
 *      URL with the ElicitationResult body; 202 → queued false.
 *   3. 404/422 map to error results; empty/absent elicitation id rejected
 *      client-side before any network call.
 *   4. listGovernanceSurfaces parses /v1/scheduled_tasks,
 *      /v1/policy-registry, /v1/sharing into a stable view shape.
 *   5. Never throws on network failure.
 *   6. The module source permits exactly ONE mutation (the resolve
 *      endpoint) — a guard test asserting no other POST/DELETE paths.
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

const FORM_ELICITATION = {
  type: "response.elicitation_request",
  elicitation_id: "elicit_abc123",
  method: "elicitation/create",
  params: {
    mode: "form",
    message: "Approve running 'rm -rf /tmp/cache'?",
    requestedSchema: {
      type: "object",
      properties: { approve: { type: "boolean" } },
    },
    phase: "tool_call",
    policy_name: "dangerous-commands",
    content_preview: "rm -rf /tmp/cache",
  },
};

const URL_ELICITATION = {
  type: "response.elicitation_request",
  elicitation_id: "elicit_oauth1",
  method: "elicitation/create",
  params: { mode: "url", message: "Connect OAuth", url: "https://oauth.example.com/start" },
};

describe("cubecloud-agent governance relay (P6, row G)", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listPendingElicitations", () => {
    it("parses form-mode requests with policy context", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...formSession(),
          pending_elicitations: [FORM_ELICITATION],
        }),
      );
      const { listPendingElicitations } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await listPendingElicitations(
        "http://127.0.0.1:6767",
        "conv_1",
      );
      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(1);
      const req = result.requests[0]!;
      expect(req.elicitationId).toBe("elicit_abc123");
      expect(req.mode).toBe("form");
      expect(req.message).toContain("rm -rf");
      expect(req.policyName).toBe("dangerous-commands");
      expect(req.phase).toBe("tool_call");
      expect(req.targetSessionId).toBeNull();
    });

    it("parses url-mode requests and mirrored-child routing", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          ...formSession(),
          pending_elicitations: [
            URL_ELICITATION,
            {
              ...FORM_ELICITATION,
              elicitation_id: "elicit_child",
              params: {
                ...FORM_ELICITATION.params,
                target_session_id: "conv_child",
              },
            },
          ],
        }),
      );
      const { listPendingElicitations } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await listPendingElicitations(
        "http://127.0.0.1:6767",
        "conv_1",
      );
      expect(result.requests).toHaveLength(2);
      expect(result.requests[0]!.mode).toBe("url");
      expect(result.requests[0]!.url).toBe("https://oauth.example.com/start");
      // Mirrored-child: the verdict must go to the CHILD session.
      expect(result.requests[1]!.targetSessionId).toBe("conv_child");
    });

    it("tolerates missing/absent pending_elicitations", async () => {
      fetchMock.mockResolvedValue(jsonResponse(formSession()));
      const { listPendingElicitations } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await listPendingElicitations(
        "http://127.0.0.1:6767",
        "conv_1",
      );
      expect(result.success).toBe(true);
      expect(result.requests).toEqual([]);
    });
  });

  describe("resolveElicitation", () => {
    it("posts the verdict to the exact resource-scoped URL", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ queued: false }, 202));
      const { resolveElicitation } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await resolveElicitation(
        "http://127.0.0.1:6767",
        "conv_1",
        "elicit_abc123",
        { action: "accept" },
      );
      expect(result.success).toBe(true);
      expect(result.queued).toBe(false);
      const url = String(fetchMock.mock.calls[0]![0]);
      expect(url).toBe(
        "http://127.0.0.1:6767/v1/sessions/conv_1/elicitations/elicit_abc123/resolve",
      );
      const init = fetchMock.mock.calls[0]![1] as RequestInit;
      expect(init.method).toBe("POST");
      const body = JSON.parse(String(init.body));
      expect(body).toEqual({ action: "accept" });
    });

    it("rejects an empty elicitation id before any network call", async () => {
      const { resolveElicitation } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await resolveElicitation(
        "http://127.0.0.1:6767",
        "conv_1",
        "",
        { action: "accept" },
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/elicit/i);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("404 and 422 map to error results", async () => {
      const { resolveElicitation } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      fetchMock.mockResolvedValue(new Response("nope", { status: 404 }));
      const notFound = await resolveElicitation(
        "http://127.0.0.1:6767",
        "conv_x",
        "elicit_1",
        { action: "decline" },
      );
      expect(notFound.success).toBe(false);
      expect(notFound.error).toMatch(/404/);

      fetchMock.mockResolvedValue(new Response("bad", { status: 422 }));
      const invalid = await resolveElicitation(
        "http://127.0.0.1:6767",
        "conv_1",
        "elicit_1",
        { action: "bogus" as never },
      );
      expect(invalid.success).toBe(false);
      expect(invalid.error).toMatch(/422/);
    });

    it("network failure never throws", async () => {
      fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
      const { resolveElicitation } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await resolveElicitation(
        "http://127.0.0.1:6767",
        "conv_1",
        "elicit_1",
        { action: "accept" },
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/ECONNREFUSED/);
    });
  });

  describe("listGovernanceSurfaces", () => {
    it("joins scheduled tasks, policy registry, and sharing, tolerating 40/older builds", async () => {
      fetchMock.mockImplementation(async (input: unknown) => {
        const url = String(input);
        if (url.includes("/v1/scheduled_tasks")) {
          return jsonResponse({
            data: [
              { id: "st1", name: "nightly-digest", next_run: 123 },
              { id: "st2", name: "weekly-report" },
            ],
          });
        }
        if (url.includes("/v1/policy-registry")) {
          return jsonResponse({
            data: {
              policies: [{ name: "dangerous-commands", mode: "ask" }],
            },
          });
        }
        if (url.includes("/v1/sharing")) {
          return jsonResponse({ data: { shares: [] } });
        }
        return new Response("{}", { status: 404 });
      });
      const { listGovernanceSurfaces } = await import(
        "../src/main/cubecloud-agent-governance"
      );
      const result = await listGovernanceSurfaces("http://127.0.0.1:6767");
      expect(result.scheduledTasks).toHaveLength(2);
      expect(result.scheduledTasks[0]!.name).toBe("nightly-digest");
      expect(result.policies).toHaveLength(1);
      expect(result.policies[0]!.mode).toBe("ask");
      expect(result.shares).toHaveLength(0);
      expect(result.errors).toEqual([]);
    });
  });

  describe("P6 mutation scope guard", () => {
    it("the ONLY mutation path is the elicitation resolve POST", async () => {
      const src = readFileSync(
        join(__dirname, "..", "src", "main", "cubecloud-agent-governance.ts"),
        "utf8",
      );
      const code = src
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n");
      // Exactly one POST, and it is the resolve endpoint.
      const posts = code.match(/method:\s*"POST"/g) ?? [];
      expect(posts).toHaveLength(1);
      expect(code).toMatch(/elicitations\/\$\{encodeURIComponent\(/);
      // No other write verbs anywhere.
      expect(code).not.toMatch(/method:\s*"(PUT|DELETE|PATCH)"/);
    });
  });
});

function formSession(): Record<string, unknown> {
  return {
    id: "conv_1",
    status: "running",
  };
}