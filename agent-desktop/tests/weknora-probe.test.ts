/**
 * R6 — WeKnora (enterprise RAG knowledge platform) probe tests
 * (`src/main/weknora-probe.ts`).
 *
 * WeKnora integration contract (MIT; REST `/api/v1` + built-in MCP at
 * `/mcp/<endpoint_id>`):
 *   - The console's probe is a stateless HTTP health/inventory check
 *     against an operator-configured WeKnora base URL:
 *       GET /health                     → availability
 *       GET /api/v1/knowledge-bases     → KB list (optional, needs auth)
 *   - Credentials come from the desktop config store (`X-API-Key` header);
 *     never inlined in source (security floor).
 *
 * Tests verify (mirroring cubecloud-agent-probe.test.ts conventions):
 *   1. Healthy server → reachable + kbCount.
 *   2. 404 /health (older builds) → reachable = true (degraded info only).
 *   3. Network failure → `{ reachable: false, error }`, never throws.
 *   4. Auth failure on KB list → reachable, kbCount null, auth note.
 *   5. Hanging fetch → bounded resolution.
 *   6. Base URL normalization (trailing slash, missing /api/v1 kept).
 *
 * fetch is mocked; no real network I/O runs in tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("weknora probe (R6)", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("healthy server: reachable + kbCount from the KB list", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.includes("/api/v1/knowledge-bases")) {
        return jsonResponse({
          data: {
            knowledge_bases: [{ id: "kb1" }, { id: "kb2" }, { id: "kb3" }],
          },
        });
      }
      return new Response("{}", { status: 404 });
    });
    const { probeWeknora } = await import("../src/main/weknora-probe");
    const result = await probeWeknora("http://127.0.0.1:8080", {
      apiKey: "sk-test",
    });
    expect(result.reachable).toBe(true);
    expect(result.kbCount).toBe(3);
    expect(result.error).toBeNull();
  });

  it("404 /health still counts as reachable (older builds)", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return new Response("not found", { status: 404 });
      }
      return jsonResponse({ data: { knowledge_bases: [] } });
    });
    const { probeWeknora } = await import("../src/main/weknora-probe");
    const result = await probeWeknora("http://127.0.0.1:8080");
    expect(result.reachable).toBe(true);
    expect(result.kbCount).toBe(0);
  });

  it("network failure: reachable=false with error, never throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { probeWeknora } = await import("../src/main/weknora-probe");
    const result = await probeWeknora("http://127.0.0.1:8080");
    expect(result.reachable).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it("auth failure on the KB list: reachable, kbCount=null, auth hint", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      return new Response("unauthorized", { status: 401 });
    });
    const { probeWeknora } = await import("../src/main/weknora-probe");
    const result = await probeWeknora("http://127.0.0.1:8080", {
      apiKey: "bad",
    });
    expect(result.reachable).toBe(true);
    expect(result.kbCount).toBeNull();
    expect(result.authNote).toMatch(/api key|auth/i);
  });

  it(
    "hanging server response resolves bounded (~probe timeout)",
    async () => {
      fetchMock.mockImplementation(() => new Promise(() => undefined));
      const { probeWeknora, WEKNORA_PROBE_TIMEOUT_MS } = await import(
        "../src/main/weknora-probe"
      );
      const started = Date.now();
      const result = await probeWeknora("http://127.0.0.1:8080");
      const elapsed = Date.now() - started;
      expect(result.reachable).toBe(false);
      expect(elapsed).toBeLessThan(WEKNORA_PROBE_TIMEOUT_MS * 2 + 2_000);
    },
    20_000,
  );

  it("normalizes the base URL (trailing slash, keeps /api/v1 absent)", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      return jsonResponse({ data: { knowledge_bases: [] } });
    });
    const { probeWeknora, normalizeWeknoraBaseUrl } = await import(
      "../src/main/weknora-probe"
    );
    expect(normalizeWeknoraBaseUrl("http://127.0.0.1:8080/")).toBe(
      "http://127.0.0.1:8080",
    );
    const result = await probeWeknora("http://127.0.0.1:8080/");
    expect(result.reachable).toBe(true);
    // Health path is the base root, KB list under /api/v1.
    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calledUrls.some((u) => u.endsWith("/api/v1/knowledge-bases"))).toBe(
      true,
    );
  });
});