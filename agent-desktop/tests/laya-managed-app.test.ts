/**
 * DM3 — Laya ManagedApp capability-honesty tests
 * (`src/main/managed-apps/tools.ts::createLayaApp`).
 *
 * The defect this pins: the generic `cliProbeApp` reports `ok: true` and
 * "probe ok" the moment the `laya` CLI is on PATH. But the DM1/DM2 decision
 * slots do NOT use the CLI — they call `laya-serve` over HTTP at
 * `LAYA_BASE_URL` (`src/main/index.ts`, `src/main/hermes.ts`). If that
 * server is down, every decision silently abstains (fail-open) while the
 * operator sees a green row. That is exactly the capability-honesty
 * violation doctrine rule 1 bans ("the UI renders only declared
 * capabilities").
 *
 * Contract asserted here:
 *   - CLI present + serve reachable  -> ok: true,  detail names the server
 *   - CLI present + serve unreachable -> ok: false, detail names the server
 *   - never throws, whatever the transport does
 *
 * child_process and fetch are both mocked; no real CLI or server runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock("child_process", () => ({
  execFileSync: execFileSyncMock,
  spawn: vi.fn(),
  spawnSync: vi.fn(),
  default: { execFileSync: execFileSyncMock, spawn: vi.fn(), spawnSync: vi.fn() },
}));

vi.mock("../src/main/installer", () => ({
  getEnhancedPath: () => "C:\\enhanced\\path",
}));

vi.mock("../src/main/process-options", () => ({
  HIDDEN_SUBPROCESS_OPTIONS: {},
}));

/** Install a consistent mock: `where.exe laya` resolves, `--version` answers. */
function mockLayaCliPresent(): void {
  execFileSyncMock.mockImplementation((_cmd: unknown, args: unknown[]) => {
    const args0 = Array.isArray(args) ? args[0] : "";
    if (args0 === "laya") return "C:\\python\\Scripts\\laya.exe\n";
    if (args0 === "laya-mcp-server") return "C:\\python\\Scripts\\laya-mcp-server.exe\n";
    if (args0 === "--version") return "laya 1.4.2\n";
    return "";
  });
}

describe("Laya ManagedApp capability honesty", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
    mockLayaCliPresent();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports NOT ok when the CLI is installed but laya-serve is unreachable", async () => {
    // The decision slots talk HTTP, not the CLI. A green row while the
    // server is dead means every DM1/DM2 decision silently abstains.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const { createLayaApp } = await import(
      "../src/main/managed-apps/tools"
    );
    const health = await createLayaApp().health();

    expect(health.ok).toBe(false);
    expect(health.detail).toMatch(/serve/i);
  });

  it("reports ok when the CLI is installed AND laya-serve answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      }),
    );

    const { createLayaApp } = await import(
      "../src/main/managed-apps/tools"
    );
    const health = await createLayaApp().health();

    expect(health.ok).toBe(true);
    expect(health.detail).toMatch(/serve/i);
  });

  it("never throws when the transport misbehaves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("socket hang up")),
    );

    const { createLayaApp } = await import(
      "../src/main/managed-apps/tools"
    );

    await expect(createLayaApp().health()).resolves.toHaveProperty(
      "capabilities",
    );
    await expect(createLayaApp().discover()).resolves.toHaveProperty("state");
  });

  it("keeps the fabric-attach mode (rule 4: the console never spawns Laya)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );

    const { createLayaApp } = await import(
      "../src/main/managed-apps/tools"
    );
    const app = createLayaApp();

    expect(app.mode).toBe("fabric-attach");
    // Rule 4 + the existing mode-aware-lifecycle suite: fabric-attach
    // adapters must NOT fabricate a local lifecycle.
    expect(app.lifecycle()).toBeNull();
  });
});
