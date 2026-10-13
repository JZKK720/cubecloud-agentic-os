/**
 * ManagedApp kernel wiring tests — the 16-adapter framework must be
 * REACHABLE from the running console.
 *
 * The gap this pins: `createManagedAppRegistry()` (Phase B of the desktop
 * overhaul) has no runtime consumer. Its only importers are
 * `tests/managed-apps.test.ts` and an unrelated *renderer* `./registry`
 * (the MCP screen's server list). None of its capabilities appear in
 * `console-backend/generated-route-map.json` or `dispatch-table.json`, so
 * the whole framework is built, tested, and unreachable — a subsystem that
 * does nothing at runtime.
 *
 * Contract asserted here:
 *   1. `seedManagedApps(registry)` registers one capability per adapter.
 *   2. Names follow the kernel's channelToName camelCase convention.
 *   3. Each capability is traceable to an `ipcChannel`.
 *   4. Registration is additive and duplicate-safe (matches seedGovernance).
 *   5. A registered handler genuinely drives its adapter — capability-honest,
 *      and never throws (doctrine rules 1 and 2).
 *
 * child_process / runtime-registry / fetch are stubbed exactly as
 * `managed-apps.test.ts` does, so no real CLI, gateway, or socket runs.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";
import { request as httpRequest } from "node:http";
import { ConsoleRouteRegistry, createConsoleServer } from "../console-backend/registry";
import {
  createManagedAppRegistry,
  EXPECTED_MANAGED_APP_IDS,
} from "../src/main/managed-apps/registry";
import { seedManagedApps } from "../console-backend/managed-apps-seed";

// Adapter probes reach real surfaces (CLI spawns, gateway HTTP). The
// contract tests assert SHAPES and wiring, not connectivity.
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  const noopChild = () => ({ on: () => {}, unref: () => {}, kill: () => {}, pid: 0 });
  const mocked = {
    ...actual,
    spawn: noopChild,
    spawnSync: () => ({ status: 1, stdout: "", stderr: "", error: new Error("mocked") }),
    exec: (_c: string, cb: (e: Error) => void) => cb(new Error("mocked")),
    execFile: (_f: string, _a: unknown, _o: unknown, cb: (e: Error) => void) =>
      (typeof _o === "function" ? (_o as (e: Error) => void)(new Error("mocked")) : cb(new Error("mocked"))),
    execSync: () => "",
    execFileSync: () => {
      throw Object.assign(new Error("mocked"), { status: 1 });
    },
    fork: noopChild,
  };
  return { ...mocked, default: mocked };
});

vi.mock("../src/main/runtime-registry", () => ({
  listRuntimeProviders: vi.fn(async () => []),
}));

beforeAll(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new TypeError("fetch failed");
    }),
  );
});

/** The kernel's channelToName convention (parity-check-v2.cjs). */
const camel = (id: string): string =>
  id.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

// This file stubs the global `fetch` (rejecting) so the adapter probes
// degrade fast. The HTTP tests below therefore cannot use `fetch` —
// they speak to the kernel over node:http directly.
function request(
  url: string,
  init: { method: string; body?: string } = { method: "GET" },
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      url,
      { method: init.method, headers: { "content-type": "application/json" } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    if (init.body !== undefined) req.write(init.body);
    req.end();
  });
}

describe("ManagedApp kernel seed", () => {
  it("registers exactly one capability per adapter", () => {
    const registry = new ConsoleRouteRegistry();
    const summary = seedManagedApps(registry);

    expect(summary.registered).toBe(EXPECTED_MANAGED_APP_IDS.length);
    expect(registry.size).toBe(EXPECTED_MANAGED_APP_IDS.length);
  });

  it("names every capability as <adapterId>Health (camelCase)", () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    const names = registry.list().map((r) => r.name).sort();
    const expected = EXPECTED_MANAGED_APP_IDS.map((id) => `${camel(id)}Health`).sort();
    expect(names).toEqual(expected);
  });

  it("camelCases multi-word adapter ids correctly", () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    // These two ids are the regression sentinels for the transform:
    // naive capitalisation would yield "browser-harnessHealth".
    expect(registry.get("browserHarnessHealth")).toBeDefined();
    expect(registry.get("mooTasksHealth")).toBeDefined();
    expect(registry.get("agentReachHealth")).toBeDefined();
  });

  it("keeps every capability traceable to an ipcChannel", () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    for (const route of registry.list()) {
      expect(route.ipcChannel, `${route.name} must carry a channel`).toBeTruthy();
      // Traceability convention: the channel is the health channel name.
      expect(route.ipcChannel).toMatch(/^managed-app-/);
    }
  });

  it("is idempotent: a second pass is a no-op, never a duplicate error", () => {
    const registry = new ConsoleRouteRegistry();
    const first = seedManagedApps(registry);
    expect(first.registered).toBe(EXPECTED_MANAGED_APP_IDS.length);

    // `registry.register` throws on a duplicate name, so a seed that
    // blindly re-registers would crash the second boot. Idempotency is
    // the contract (mirrors seedGovernance: skip what is already present).
    let second: { registered: number };
    expect(() => {
      second = seedManagedApps(registry);
    }).not.toThrow();
    expect(second!.registered).toBe(0);
    expect(registry.size).toBe(EXPECTED_MANAGED_APP_IDS.length);
  });

  it("drives the real adapter through the registered handler", async () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    const cap = registry.get("layaHealth");
    expect(cap).toBeDefined();

    // With the CLI mocked away and fetch rejecting, this is the
    // "installed nowhere, unreachable" path — it must resolve to the
    // adapter's declared shape, not throw.
    const result = (await cap!.handler([])) as {
      ok: boolean;
      capabilities: string[];
      detail: string;
    };
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.capabilities)).toBe(true);
    expect(result.capabilities.length).toBeGreaterThan(0);
    expect(typeof result.detail).toBe("string");
  });

  it("never throws from any handler, whatever the transport does", async () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    for (const route of registry.list()) {
      const cap = registry.get(route.name)!;
      await expect(
        Promise.resolve(cap.handler([])),
        `${route.name} must never throw`,
      ).resolves.toBeDefined();
    }
  });

  it("covers the whole roster (no adapter silently dropped)", () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);

    const registered = new Set(registry.list().map((r) => r.name));
    const advertised = createManagedAppRegistry().map((a) => `${camel(a.id)}Health`);
    expect(advertised.length).toBe(EXPECTED_MANAGED_APP_IDS.length);
    for (const name of advertised) {
      expect(registered.has(name), `${name} missing from the kernel`).toBe(true);
    }
  });
});

describe("ManagedApp capabilities over the kernel HTTP router", () => {
  // Closes the loop the manual acceptance run proved: the seeded
  // capability is not merely in the Map — it is served, and its result
  // is JSON-serializable with capability-honest divergence between
  // adapters (rule 1).
  it("serves POST /api/console/<id>Health for every adapter", async () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);
    const server = createConsoleServer(registry);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", async () => {
        try {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          const base = `http://127.0.0.1:${port}`;

          const seen = new Set<string>();
          for (const id of EXPECTED_MANAGED_APP_IDS) {
            const res = await request(`${base}/api/console/${camel(id)}Health`, {
              method: "POST",
              body: "[]",
            });
            expect(res.status, `${id} route must exist`).toBe(200);
            const body = JSON.parse(res.body) as {
              capabilities?: unknown;
              detail?: unknown;
            };
            expect(Array.isArray(body.capabilities), `${id} capabilities`).toBe(true);
            expect(typeof body.detail, `${id} detail`).toBe("string");
            seen.add(id);
          }
          expect(seen.size).toBe(EXPECTED_MANAGED_APP_IDS.length);
        } finally {
          server.close(() => resolve());
        }
      });
      server.on("error", reject);
    });
  });

  it("reports the managed-app capabilities in /health", async () => {
    const registry = new ConsoleRouteRegistry();
    seedManagedApps(registry);
    const server = createConsoleServer(registry);

    await new Promise<void>((resolve, reject) => {
      server.listen(0, "127.0.0.1", async () => {
        try {
          const addr = server.address();
          const port = typeof addr === "object" && addr ? addr.port : 0;
          const res = await request(`http://127.0.0.1:${port}/health`);
          const body = JSON.parse(res.body) as {
            capabilities: number;
            routes: Array<{ name: string }>;
          };
          expect(body.capabilities).toBe(EXPECTED_MANAGED_APP_IDS.length);
          const names = new Set(body.routes.map((r) => r.name));
          expect(names.has("layaHealth")).toBe(true);
          expect(names.has("browserHarnessHealth")).toBe(true);
        } finally {
          server.close(() => resolve());
        }
      });
      server.on("error", reject);
    });
  });
});
