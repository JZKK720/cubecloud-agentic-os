/**
 * Kitesurf adapter + CDP probe.
 *
 * Three properties are worth pinning, because each is a way this could lie:
 *
 *  1. An open port is not a browser. Only a conformant `/json/version` CDP
 *     handshake counts as reachable — a server that answers JSON but is not a
 *     CDP target must be reported as such.
 *  2. Loopback only. A CDP endpoint executes page JavaScript, so discovery
 *     must never reach a remote host, unlike the LLM probe which allows an
 *     operator-typed endpoint.
 *  3. The sandbox warning appears when a target is found, and not when it is
 *     absent.
 *
 * `fetch` is mocked; no socket opens.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
const readBlockMock = vi.hoisted(() => vi.fn());

vi.mock("../src/main/managed-apps/config-blocks", () => ({
  readAppBlock: readBlockMock,
  writeAppBlock: vi.fn(),
  MANAGED_APP_CONFIG_BLOCKS: [
    "workspace",
    "everos",
    "headroom",
    "openviking",
    "weknora",
    "dataflow",
    "kitesurf",
  ],
}));

import {
  isLoopbackCdpUrl,
  KITESURF_DEFAULT_CDP_URL,
  probeKitesurf,
} from "../src/main/kitesurf-probe";
import {
  createKitesurfApp,
  KITESURF_SANDBOX_WARNING,
  loadKitesurfConfig,
} from "../src/main/managed-apps/kitesurf";
import { createManagedAppRegistry } from "../src/main/managed-apps/registry";

const CDP_VERSION = {
  Browser: "Kitesurf/0.1",
  "Protocol-Version": "1.3",
  webSocketDebuggerUrl: "ws://127.0.0.1:8787/devtools/browser/abc",
};

function ok(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe("isLoopbackCdpUrl", () => {
  it("accepts loopback http and https", () => {
    expect(isLoopbackCdpUrl("http://127.0.0.1:8787")).toBe(true);
    expect(isLoopbackCdpUrl("http://localhost:9222")).toBe(true);
    expect(isLoopbackCdpUrl("https://[::1]:8787")).toBe(true);
  });

  it("rejects remote hosts and non-http schemes", () => {
    expect(isLoopbackCdpUrl("http://10.0.0.5:8787")).toBe(false);
    expect(isLoopbackCdpUrl("https://kitesurf.example.com")).toBe(false);
    expect(isLoopbackCdpUrl("ws://127.0.0.1:8787")).toBe(false);
    expect(isLoopbackCdpUrl("not a url")).toBe(false);
  });
});

describe("probeKitesurf", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("reports a real CDP handshake as reachable", async () => {
    fetchMock.mockResolvedValue(ok(CDP_VERSION));
    const result = await probeKitesurf(KITESURF_DEFAULT_CDP_URL);
    expect(result.reachable).toBe(true);
    expect(result.browser).toBe("Kitesurf/0.1");
    expect(result.protocolVersion).toBe("1.3");
    // It asked the CDP handshake path, not just the root.
    expect(fetchMock.mock.calls[0][0]).toBe(
      `${KITESURF_DEFAULT_CDP_URL}/json/version`,
    );
  });

  it("does NOT mistake a generic JSON endpoint for a browser", async () => {
    // The failure mode that would make the card lie: something is listening and
    // answers JSON, but it is not a CDP target.
    fetchMock.mockResolvedValue(ok({ status: "ok", service: "something-else" }));
    const result = await probeKitesurf("http://127.0.0.1:8787");
    expect(result.reachable).toBe(false);
    expect(result.error).toBe("not-cdp");
    expect(result.browser).toBeNull();
  });

  it("refuses a remote endpoint without contacting it", async () => {
    const result = await probeKitesurf("http://10.0.0.5:8787");
    expect(result.reachable).toBe(false);
    expect(result.error).toBe("non-loopback");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports an absent endpoint without throwing", async () => {
    fetchMock.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const result = await probeKitesurf("http://127.0.0.1:8787");
    expect(result.reachable).toBe(false);
    expect(result.detail).toContain("no CDP endpoint");
  });

  it("distinguishes a wrong HTTP status from a handshake", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const result = await probeKitesurf("http://127.0.0.1:8787");
    expect(result.reachable).toBe(false);
    expect(result.error).toBe("HTTP 404");
  });
});

describe("kitesurf managed app", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    readBlockMock.mockReset();
    readBlockMock.mockReturnValue(null);
  });

  it("is registered as a fabric-attach app", () => {
    const app = createManagedAppRegistry().find((a) => a.id === "kitesurf");
    expect(app).toBeDefined();
    expect(app!.mode).toBe("fabric-attach");
  });

  it("carries the sandbox warning when a target is found", async () => {
    fetchMock.mockResolvedValue(ok(CDP_VERSION));
    const app = createKitesurfApp();
    const discovery = await app.discover();
    expect(discovery.state).toBe("found");
    expect(discovery.detail).toContain(KITESURF_SANDBOX_WARNING);
  });

  it("does not warn about an absent browser", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const app = createKitesurfApp();
    const discovery = await app.discover();
    expect(discovery.state).toBe("not-found");
    expect(discovery.detail).not.toContain(KITESURF_SANDBOX_WARNING);
  });

  it("claims no inventory and no lifecycle it cannot honour", async () => {
    const app = createKitesurfApp();
    const inventory = await app.inventory();
    expect(inventory.ok).toBe(false);
    expect(inventory.error).toBe("unsupported");
    // The desktop does not drive the browser yet, and must not claim to.
    expect(app.lifecycle()).toBeNull();
    expect(app.governance()).toBeNull();
  });

  it("owns one config block exposing the endpoint", () => {
    const schema = createKitesurfApp().configSchema();
    expect(schema!.block).toBe("kitesurf");
    expect(schema!.fields.map((f) => f.key)).toEqual(["baseUrl"]);
  });

  it("falls back to the published default port", () => {
    readBlockMock.mockReturnValue({ baseUrl: "" });
    expect(loadKitesurfConfig().baseUrl).toBe(KITESURF_DEFAULT_CDP_URL);
  });
});
