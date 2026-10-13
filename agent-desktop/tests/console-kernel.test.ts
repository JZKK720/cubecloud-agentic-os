// console-backend C0 tests — registry/router invariants + parity gate.
//
// Verifies (doctrine §5 / C0's verify step):
//   1. Every seeded capability maps to a real preload bridge method
//      (kernel ⊆ preload) — the mechanical form of "shells are
//      interchangeable; the contract is not".
//   2. New-wiring capabilities (sessions family) are exactly the set
//      the parity check flagged as missing from preload in V2.10.80.
//   3. The HTTP router serves every route + /health and never throws
//      on garbage bodies.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { ConsoleRouteRegistry, createConsoleServer } from "../console-backend/registry";

// Import the seeds indirectly: re-derive them from server.ts source
// (same regex the parity script uses) so the test fails when a seed
// is added to the server but not to the preload bridge.
const serverSrc = readFileSync(
  join(__dirname, "..", "console-backend", "server.ts"),
  "utf8",
);
const preloadSrc = readFileSync(
  join(__dirname, "..", "src", "preload", "index.ts"),
  "utf8",
);

const seededCaps = [
  ...serverSrc.matchAll(/name: "([a-zA-Z]\w*)",\s*\n\s*ipcChannel:/g),
].map((m) => m[1] as string);
const preloadMethods = new Set(
  [...preloadSrc.matchAll(/^ {2}([a-zA-Z]\w*):/gm)].map((m) => m[1] as string),
);

/** The sessions modules had NO preload bridge in V2.10.80 and homer's
 *  kernelHome is C1-new: these are the deliberate new-wiring additions.
 *  C1 wire-up (FirstRunScan, 2026-10-07) moved listWorkspaceSessions +
 *  listWorkspaceAgents into preload; the remaining two stay here until
 *  a renderer consumer lands. (The discovery family DOES map to
 *  existing preload methods — see the main parity test.) */
const NEW_WIRING = new Set([
  "getWorkspaceSessionSnapshot",
  "kernelHome",
]);

function withServer(
  registry: ConsoleRouteRegistry,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const server = createConsoleServer(registry);
  return new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", async () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      try {
        await fn(`http://127.0.0.1:${port}`);
      } finally {
        server.close(() => resolve());
      }
    });
    server.on("error", reject);
  });
}

describe("console-backend kernel (C0)", () => {
  it("parity: every seed capability exists in the preload bridge (or is deliberate new-wiring)", () => {
    expect(seededCaps.length).toBeGreaterThan(0);
    for (const cap of seededCaps) {
      expect(
        preloadMethods.has(cap) || NEW_WIRING.has(cap),
        `capability ${cap} must map to a preload method or be in NEW_WIRING`,
      ).toBe(true);
    }
  });

  it("parity: the NEW_WIRING set really is missing from preload (guards against stale exceptions)", () => {
    for (const cap of NEW_WIRING) {
      if (seededCaps.includes(cap) && cap !== "kernelHome") {
        expect(preloadMethods.has(cap)).toBe(false);
      }
    }
  });

  it("new-wiring capabilities are covered by seededCaps (no dangling exceptions)", () => {
    for (const cap of NEW_WIRING) {
      expect(seededCaps).toContain(cap);
    }
  });

  it("GET /health returns capability inventory", async () => {
    const registry = new ConsoleRouteRegistry();
    registry.register({
      name: "sampleCap",
      ipcChannel: "sample-channel",
      handler: async () => ({ success: true }),
    });
    await withServer(registry, async (base) => {
      const res = await fetch(`${base}/health`);
      const body = (await res.json()) as {
        status: string;
        capabilities: number;
        routes: Array<{ name: string; ipcChannel: string }>;
      };
      expect(res.status).toBe(200);
      expect(body.status).toBe("ok");
      expect(body.capabilities).toBe(1);
      expect(body.routes[0]).toEqual({
        name: "sampleCap",
        ipcChannel: "sample-channel",
      });
    });
  });

  it("POST /api/console/<name> invokes the handler with parsed args and returns JSON", async () => {
    const registry = new ConsoleRouteRegistry();
    registry.register({
      name: "echoCap",
      ipcChannel: "echo-channel",
      handler: async (args) => ({ success: true, echoed: args }),
    });
    await withServer(registry, async (base) => {
      const res = await fetch(`${base}/api/console/echoCap`, {
        method: "POST",
        body: JSON.stringify(["a", 2, { b: true }]),
      });
      const body = (await res.json()) as {
        success: boolean;
        echoed: unknown[];
      };
      expect(body.success).toBe(true);
      expect(body.echoed).toEqual(["a", 2, { b: true }]);
    });
  });

  it("unknown capability → 404 with a reason, never a crash", async () => {
    const registry = new ConsoleRouteRegistry();
    await withServer(registry, async (base) => {
      const res = await fetch(`${base}/api/console/nope`, { method: "POST" });
      expect(res.status).toBe(404);
      const body = (await res.json()) as { success: boolean; error: string };
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/no capability/);
    });
  });

  it("garbage body → 500 with a reason, server stays alive for the next request", async () => {
    const registry = new ConsoleRouteRegistry();
    registry.register({
      name: "pingCap",
      ipcChannel: "ping-channel",
      handler: async () => ({ success: true }),
    });
    await withServer(registry, async (base) => {
      expect((await fetch(`${base}/api/console/pingCap`, { method: "POST", body: "{oops" })).status).toBe(500);
      const ok = await fetch(`${base}/api/console/pingCap`, { method: "POST" });
      expect(ok.status).toBe(200);
    });
  });

  it("empty-body POST → handler receives empty args array", async () => {
    const registry = new ConsoleRouteRegistry();
    registry.register({
      name: "noArgCap",
      ipcChannel: "no-arg-channel",
      handler: async (args) => ({ success: true, count: args.length }),
    });
    await withServer(registry, async (base) => {
      const res = await fetch(`${base}/api/console/noArgCap`, { method: "POST" });
      const body = (await res.json()) as { success: boolean; count: number };
      expect(body.success).toBe(true);
      expect(body.count).toBe(0);
    });
  });
});