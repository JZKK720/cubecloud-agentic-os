/**
 * Host-gateway candidate resolution — and the openviking/weknora adapters that
 * depend on it.
 *
 * The kernel runs in a container, so its `127.0.0.1` is the container's own.
 * Measured 2026-11-24 from inside `cc-console-backend-1` while openviking was
 * live on the host:
 *
 *     http://localhost:1933/health           -> fetch failed
 *     http://host.docker.internal:1933/health -> 200
 *
 * and the live kernel reported `openvikingHealth -> {"ok":false,
 * "detail":"TypeError: fetch failed"}` — a live service rendered as absent.
 *
 * These tests pin the rule itself and the two adapters that consume it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const ovProbeMock = vi.hoisted(() => vi.fn());
const wkProbeMock = vi.hoisted(() => vi.fn());
const readBlockMock = vi.hoisted(() => vi.fn());

vi.mock("../src/main/openviking-probe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/main/openviking-probe")>();
  return { ...actual, probeOpenViking: ovProbeMock };
});
vi.mock("../src/main/weknora-probe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/main/weknora-probe")>();
  return { ...actual, probeWeknora: wkProbeMock };
});
vi.mock("../src/main/managed-apps/config-blocks", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../src/main/managed-apps/config-blocks")
  >();
  return { ...actual, readAppBlock: readBlockMock };
});

import {
  hostGatewayCandidates,
  isLoopbackEndpoint,
  firstAnswering,
} from "../src/main/managed-apps/endpoint-candidates";
import { createOpenVikingApp } from "../src/main/managed-apps/tools";

describe("isLoopbackEndpoint", () => {
  it("accepts every loopback form, including the Docker alias", () => {
    for (const u of [
      "http://localhost:1933",
      "http://127.0.0.1:1933",
      "http://[::1]:1933",
      "http://host.docker.internal:1933",
    ]) {
      expect(isLoopbackEndpoint(u), u).toBe(true);
    }
  });

  it("rejects remote hosts and look-alikes", () => {
    for (const u of [
      "https://openviking.example.com",
      "http://10.0.0.5:1933",
      "http://host.docker.internal.evil.com:1933",
      "not a url",
    ]) {
      expect(isLoopbackEndpoint(u), u).toBe(false);
    }
  });
});

describe("hostGatewayCandidates", () => {
  it("puts the configured endpoint first, then the alias", () => {
    expect(hostGatewayCandidates("http://127.0.0.1:1933")).toEqual([
      "http://127.0.0.1:1933",
      "http://host.docker.internal:1933",
    ]);
  });

  it("preserves path and port on the alias", () => {
    expect(hostGatewayCandidates("http://localhost:8000/mcp")).toEqual([
      "http://localhost:8000/mcp",
      "http://host.docker.internal:8000/mcp",
    ]);
  });

  it("adds no alias for a remote host, or for the alias itself", () => {
    expect(hostGatewayCandidates("https://openviking.example.com")).toEqual([
      "https://openviking.example.com",
    ]);
    expect(hostGatewayCandidates("http://host.docker.internal:1933")).toEqual([
      "http://host.docker.internal:1933",
    ]);
  });
});

describe("firstAnswering", () => {
  it("short-circuits on the alias and reports the URL that answered", async () => {
    const seen: string[] = [];
    const { result, url } = await firstAnswering(
      "http://127.0.0.1:1933",
      async (u) => {
        seen.push(u);
        return { ok: u.includes("host.docker.internal") };
      },
      (r) => r.ok,
    );
    expect(result.ok).toBe(true);
    expect(url).toBe("http://host.docker.internal:1933");
    expect(seen).toHaveLength(2);
  });

  it("reports the configured URL when every candidate fails", async () => {
    const { result, url } = await firstAnswering(
      "http://127.0.0.1:1933",
      async () => ({ ok: false }),
      (r) => r.ok,
    );
    expect(result.ok).toBe(false);
    // Not the alias: the operator must see the endpoint they typed.
    expect(url).toBe("http://127.0.0.1:1933");
  });
});

describe("openviking adapter uses the candidate rule", () => {
  const unreachable = (baseUrl: string) => ({
    reachable: false,
    baseUrl,
    sessionCount: null,
    authNote: null,
    error: "TypeError: fetch failed",
    scannedAt: "2026-11-24T00:00:00.000Z",
  });

  beforeEach(() => {
    readBlockMock.mockReset();
    ovProbeMock.mockReset();
    readBlockMock.mockReturnValue({});
  });

  it("falls through to the alias when the configured loopback fails", async () => {
    ovProbeMock.mockImplementation(async (url: string) =>
      url.includes("host.docker.internal")
        ? { ...unreachable(url), reachable: true, error: null }
        : unreachable(url),
    );

    const d = await createOpenVikingApp().discover();
    expect(d.state).toBe("found");
    expect(d.detail).toContain("host.docker.internal");
  });

  it("does not render a bare 'fetch failed' when everything is down", async () => {
    ovProbeMock.mockImplementation(async (url: string) => unreachable(url));

    const d = await createOpenVikingApp().discover();
    expect(d.state).toBe("not-found");
    // The card must name the endpoint; "TypeError: fetch failed" alone tells an
    // operator nothing about which host was tried.
    expect(d.detail).toMatch(/127\.0\.0\.1:1933|no OpenViking endpoint/);
  });
});
