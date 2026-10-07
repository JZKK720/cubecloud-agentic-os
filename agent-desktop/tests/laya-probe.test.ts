/**
 * DM0 — Laya (System-1 decision engine) probe + status tests
 * (`src/main/laya-probe.ts`).
 *
 * Laya integration contract (`laya[mcp]` extra, `laya-mcp-server`):
 *   - CLI is resolved on PATH (`laya-mcp-server` console script), mirrors
 *     the gbrain-probe PATH convention.
 *   - One-shot probe: spawn `laya-mcp-server --help` … is NOT reliable; the
 *     documented readiness check is `laya_status` via MCP, which requires a
 *     session. For DM0 the desktop instead resolves the binary + reports
 *     presence/version — the MCP *registration* itself is config-side
 *     (Settings toggle writes the `laya` entry into the MCP server list).
 *
 * Tests verify (mirroring gbrain-probe.test.ts conventions):
 *   1. Not installed → `{ installed: false }`, never throws.
 *   2. Binary on PATH → `{ installed: true, binaryPath }`.
 *   3. Version parse from `laya --version`.
 *   4. Never throws on spawn errors (garbage output).
 *
 * child_process is mocked; no real CLI runs in tests.
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

describe("laya probe (DM0)", () => {
  beforeEach(() => {
    vi.resetModules();
    execFileSyncMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** The module probes `where.exe laya`, `where.exe laya-mcp-server`,
   *  then runs `<resolved> --version`. This helper installs a consistent
   *  mock for both phases. */
  function mockLayaCli(options?: {
    found?: boolean;
    version?: string;
    versionThrows?: boolean;
  }): void {
    const found = options?.found ?? true;
    execFileSyncMock.mockImplementation(
      (cmd: unknown, args: unknown[]) => {
        const args0 = Array.isArray(args) ? args[0] : "";
        if (args0 === "laya" || args0 === "laya-mcp-server") {
          if (!found) {
            const err = new Error("command not found") as Error & {
              status?: number;
            };
            err.status = 1;
            throw err;
          }
          return "C:\\python\\Scripts\\laya.exe\n";
        }
        if (args0 === "--version") {
          if (options?.versionThrows) {
            throw new Error("broken pipe");
          }
          return options?.version ?? "laya 1.4.2\n";
        }
        return "";
      },
    );
  }

  it("reports not-installed when the laya CLI is absent", async () => {
    mockLayaCli({ found: false });
    const { probeLaya } = await import("../src/main/laya-probe");
    const result = probeLaya();
    expect(result.installed).toBe(false);
    expect(result.healthy).toBe(false);
    expect(result.version).toBeNull();
    expect(result.summary).toMatch(/install/i);
  });

  it("reports installed with a version when the CLI answers", async () => {
    mockLayaCli({ version: "laya 1.4.2\n" });
    const { probeLaya } = await import("../src/main/laya-probe");
    const result = probeLaya();
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(true);
    expect(result.version).toBe("1.4.2");
  });

  it("never throws when the CLI emits garbage", async () => {
    mockLayaCli({ versionThrows: true });
    const { probeLaya } = await import("../src/main/laya-probe");
    const result = probeLaya();
    expect(result.installed).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.summary).toContain("--version");
  });

  it("exposes the MCP server registration info (tools + command)", async () => {
    const { LAYA_MCP_REGISTRATION } = await import("../src/main/laya-probe");
    expect(LAYA_MCP_REGISTRATION.command).toBe("laya-mcp-server");
    expect(LAYA_MCP_REGISTRATION.toolNames).toContain("laya_decide");
    expect(LAYA_MCP_REGISTRATION.toolNames).toContain("laya_status");
    expect(LAYA_MCP_REGISTRATION.env.LAYA_MODELS).toBe("english,multilingual");
  });
});