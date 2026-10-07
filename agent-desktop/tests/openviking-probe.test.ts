/**
 * R5 — OpenViking (agent context database) probe tests
 * (`src/main/openviking-probe.ts`).
 *
 * OpenViking contract (AGPL-3.0 core — the desktop interoperates, sidecar
 * only, never vendored):
 *   - Default local server `http://127.0.0.1:1933`.
 *   - `GET /health` for availability; REST `GET /api/v1/…` for inventory.
 *   - Optional bearer API key (Authorization header) from the desktop
 *     config store — never inlined in source.
 *
 * Tests verify (mirroring weknora-probe.test.ts conventions):
 *   1. Healthy server → reachable + memory/resource counts when listed.
 *   2. Default loopback origin normalization (port 1933).
 *   3. Network failure → unreachable, never throws.
 *   4. Auth failure on inventory → reachable + auth note.
 *   5. Hanging response → bounded resolution (withTimeoutRace).
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

describe("openviking probe (R5)", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("healthy server: reachable with counts", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      if (url.includes("/api/v1/sessions")) {
        return jsonResponse({ data: { sessions: [{}, {}, {}] } });
      }
      return jsonResponse({ data: { resources: [] } });
    });
    const { probeOpenViking, OPENVIKING_DEFAULT_URL } = await import(
      "../src/main/openviking-probe"
    );
    const result = await probeOpenViking();
    expect(result.reachable).toBe(true);
    expect(result.sessionCount).toBe(3);
    expect(result.baseUrl).toBe(OPENVIKING_DEFAULT_URL);
    expect(result.error).toBeNull();
  });

  it("normalizes custom base URLs but defaults to loopback :1933", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));
    const { probeOpenViking, normalizeOpenVikingBaseUrl, OPENVIKING_DEFAULT_URL } =
      await import("../src/main/openviking-probe");
    expect(OPENVIKING_DEFAULT_URL).toBe("http://127.0.0.1:1933");
    expect(normalizeOpenVikingBaseUrl("http://127.0.0.1:1933/")).toBe(
      "http://127.0.0.1:1933",
    );
    const result = await probeOpenViking("http://127.0.0.1:22000");
    expect(result.baseUrl).toBe("http://127.0.0.1:22000");
  });

  it("non-loopback remote https URLs are accepted (user-hosted)", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));
    const { probeOpenViking } = await import("../src/main/openviking-probe");
    const result = await probeOpenViking("https://viking.example.com");
    expect(result.reachable).toBe(true);
    expect(result.baseUrl).toBe("https://viking.example.com");
  });

  it("network failure: unreachable with error, never throws", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const { probeOpenViking } = await import("../src/main/openviking-probe");
    const result = await probeOpenViking();
    expect(result.reachable).toBe(false);
    expect(result.error).toMatch(/ECONNREFUSED/);
  });

  it("auth failure on inventory: reachable + auth note (degraded)", async () => {
    fetchMock.mockImplementation(async (input: unknown) => {
      const url = String(input);
      if (url.endsWith("/health")) {
        return jsonResponse({ status: "ok" });
      }
      return new Response("unauthorized", { status: 401 });
    });
    const { probeOpenViking } = await import("../src/main/openviking-probe");
    const result = await probeOpenViking(undefined, { apiKey: "bad" });
    expect(result.reachable).toBe(true);
    expect(result.authNote).toMatch(/credentials|api key|auth/i);
  });

  it("hanging server response resolves bounded", async () => {
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    const { probeOpenViking, OPENVIKING_PROBE_TIMEOUT_MS } = await import(
      "../src/main/openviking-probe"
    );
    const started = Date.now();
    const result = await probeOpenViking();
    const elapsed = Date.now() - started;
    expect(result.reachable).toBe(false);
    expect(elapsed).toBeLessThan(OPENVIKING_PROBE_TIMEOUT_MS * 2 + 2_000);
  }, 15_000);
});