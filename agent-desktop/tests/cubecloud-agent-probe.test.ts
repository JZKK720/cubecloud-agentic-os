/**
 * Unit tests for the cubecloud-agent (AI Workspace) probe module
 * (`src/main/cubecloud-agent-probe.ts`).
 *
 * Cubecloud original work (2026). P0 of the workspace↔deskop control-console
 * contract (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md`).
 *
 * The probe is a stateless HTTP client against the AI Workspace server:
 *   GET /health            → { status: "ok", ... }
 *   GET /v1/info           → identity/versions (may 404 on older builds)
 *   GET /v1/stack/status   → component statuses (desktop-oriented extras)
 *
 * Tests verify:
 *   1. A happy path: all three endpoints answer → `reachable: true` with
 *      parsed identity and raw bodies preserved.
 *   2. `/health` missing → not reachable (even if other endpoints answer).
 *   3. Timeout path → `reachable: false`, `error` populated, never throws.
 *   4. Default target is `http://127.0.0.1:6767` (plan row A).
 *   5. Port normalization: "6767" strings and missing ports are accepted.
 *
 * `fetch` is mocked globally; no real network I/O runs in tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const infoBody = {
  name: "cubecloud-agent",
  version: "0.15.0",
  auth: { provider: "none" },
};

const stackBody = {
  services: [
    { name: "whisper_server", configured: false },
    { name: "tts_server", configured: false },
  ],
};

describe("cubecloud-agent probe", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("probes the default 127.0.0.1:6767 target when no baseUrl is passed", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock.mockResolvedValue(
      jsonResponse({ status: "ok" }),
    );
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    fetchMock.mockResolvedValueOnce(jsonResponse(infoBody));
    fetchMock.mockResolvedValueOnce(jsonResponse(stackBody));

    const result = await probeCubecloudAgent();

    expect(result.reachable).toBe(true);
    expect(result.baseUrl).toBe("http://127.0.0.1:6767");
    const called = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(called.some((u) => u.startsWith("http://127.0.0.1:6767/health"))).toBe(true);
  });

  it("reports reachable with parsed identity when all endpoints answer", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "ok", build: "test" }))
      .mockResolvedValueOnce(jsonResponse(infoBody))
      .mockResolvedValueOnce(jsonResponse(stackBody));

    const result = await probeCubecloudAgent("http://127.0.0.1:6767");

    expect(result.reachable).toBe(true);
    expect(result.health.status).toBe("ok");
    expect(result.info?.name).toBe("cubecloud-agent");
    expect(result.info?.version).toBe("0.15.0");
    expect(result.stack).toEqual(stackBody);
    expect(result.error).toBeNull();
    expect(typeof result.scannedAt).toBe("string");
  });

  it("falls back to /health only when /v1/info and /v1/stack/status 404", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "ok" }))
      .mockResolvedValueOnce(jsonResponse({ detail: "Not Found" }, 404))
      .mockResolvedValueOnce(jsonResponse({ detail: "Not Found" }, 404));

    const result = await probeCubecloudAgent("http://127.0.0.1:6767");

    expect(result.reachable).toBe(true);
    expect(result.info).toBeNull();
    expect(result.stack).toBeNull();
    expect(result.error).toBeNull();
  });

  it("is not reachable when /health itself fails", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: "Not Found" }, 500))
      .mockResolvedValueOnce(jsonResponse(infoBody))
      .mockResolvedValueOnce(jsonResponse(stackBody));

    const result = await probeCubecloudAgent("http://127.0.0.1:6767");

    expect(result.reachable).toBe(false);
    expect(result.health.status).toBeNull();
  });

  it("never throws — network failure becomes reachable:false with error text", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await probeCubecloudAgent("http://127.0.0.1:6767");

    expect(result.reachable).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("aborts slow health probes — a hanging fetch resolves as unreachable", async () => {
    const { probeCubecloudAgent } = await import(
      "../src/main/cubecloud-agent-probe"
    );
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>(() => {
          /* never settles — the probe's timeout must win */
        }),
    );

    const result = await probeCubecloudAgent("http://127.0.0.1:6767");
    expect(result.reachable).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.health.status).toBeNull();
  }, 15_000);

  it("normalizes a bare host:port string into a baseUrl", async () => {
    const { normalizeWorkspaceOrigin } = await import(
      "../src/main/cubecloud-agent-probe"
    );

    expect(normalizeWorkspaceOrigin("127.0.0.1:6767")).toBe(
      "http://127.0.0.1:6767",
    );
    expect(normalizeWorkspaceOrigin("http://127.0.0.1:6767/")).toBe(
      "http://127.0.0.1:6767",
    );
    expect(normalizeWorkspaceOrigin("localhost:6767")).toBe(
      "http://localhost:6767",
    );
  });

  it("rejects non-loopback and non-http origins", async () => {
    const { normalizeWorkspaceOrigin } = await import(
      "../src/main/cubecloud-agent-probe"
    );

    expect(normalizeWorkspaceOrigin("https://evermind.ai")).toBeNull();
    expect(normalizeWorkspaceOrigin("ftp://127.0.0.1:6767")).toBeNull();
    expect(normalizeWorkspaceOrigin("http://10.0.0.5:6767")).toBeNull();
  });
});