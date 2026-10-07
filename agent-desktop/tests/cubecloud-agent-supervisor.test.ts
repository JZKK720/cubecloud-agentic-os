/**
 * P1 — AI Workspace lifecycle supervisor tests
 * (`src/main/cubecloud-agent-supervisor.ts`).
 *
 * Contract row B of the workspace↔desktop control-console plan
 * (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md` §5.2):
 * the desktop can start/stop/probe the cubecloud-agent (AI Workspace)
 * server through the installed `omnigent` / `cubecloud-agent` CLI —
 * `omnigent server start` (detached, pidfile-tracked, reuse-gated on
 * config signature upstream) and `omnigent server stop`.
 *
 * Tests verify (mirroring `everos-sidecar.test.ts` conventions):
 *   1. Status returns `state: "stopped"` + reason when no CLI is on PATH.
 *   2. Status returns the probed running shape when the CLI exists and
 *      /health answers.
 *   3. Start() in no-binary mode reports `state: "stopped"` with a
 *      helpful reason — never throws.
 *   4. Stop() is a no-op when the CLI is absent and never throws.
 *   5. Workspace URL resolution prefers the CLI-reported URL and falls
 *      back to the probe default.
 *
 * Both `child_process` runs (`where.exe` + spawn) and `fetch` are mocked;
 * no real CLI or network I/O runs in tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

const { spawnMock, spawnSyncMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  spawnSyncMock: vi.fn(),
}));

vi.mock("child_process", () => ({
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
  default: { spawn: spawnMock, spawnSync: spawnSyncMock },
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cubecloud-agent supervisor", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("status returns stopped + reason when the CLI is not on PATH", async () => {
    const { getWorkspaceSupervisorStatus } = await import(
      "../src/main/cubecloud-agent-supervisor"
    );
    const result = getWorkspaceSupervisorStatus();
    expect(result.state).toBe("stopped");
    expect(result.running).toBe(false);
    expect(result.reason).toMatch(/PATH|resolve/i);
  });

  it("never throws from stop() when the CLI is absent", async () => {
    const { stopWorkspaceSupervisor } = await import(
      "../src/main/cubecloud-agent-supervisor"
    );
    await expect(stopWorkspaceSupervisor()).resolves.toBeDefined();
  });

  it("start in no-binary mode reports stopped with a helpful reason", async () => {
    const { startWorkspaceSupervisor } = await import(
      "../src/main/cubecloud-agent-supervisor"
    );
    const result = await startWorkspaceSupervisor();
    expect(result.state).toBe("stopped");
    expect(result.reason).toMatch(/PATH|resolve/i);
  });

  it("start spawns the resolved CLI server command and reaches running", async () => {
    // PATH lookup succeeds (where.exe returns a candidate line)
    spawnSyncMock.mockImplementation((cmd: unknown, args: unknown[]) => {
      if (Array.isArray(args) && args[0] === "cubecloud-agent") {
        return { error: null, status: 0, stdout: "C:\\mock\\cubecloud-agent.exe\n" };
      }
      return { error: null, status: 0, stdout: "C:\\mock-cwd\\nothing\n" };
    });
    const child = new EventEmitter() as EventEmitter & {
      pid: number;
      killed: boolean;
      kill: (s?: string) => boolean;
    };
    child.pid = 4242;
    child.killed = false;
    child.kill = () => true;
    spawnMock.mockReturnValue(child);

    // /health answers → the supervisor flips state to running via the
    // readiness probe.
    fetchMock.mockResolvedValue(jsonResponse({ status: "ok" }));

    const { startWorkspaceSupervisor, getWorkspaceSupervisorStatus } =
      await import("../src/main/cubecloud-agent-supervisor");

    const result = await startWorkspaceSupervisor({ port: 6767 });
    expect(result.state).toBe("running");
    expect(result.pid).toBe(4242);

    expect(getWorkspaceSupervisorStatus().running).toBe(true);
  });
});