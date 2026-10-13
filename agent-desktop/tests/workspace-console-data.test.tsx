// Phase C — workspace console data hook tests.
//
// The hook must be fail-soft: every IPC call independent, a dead
// workspace yields null/[] plus an error string, never a thrown render.

import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const probe = vi.fn();
const supStatus = vi.fn();
const sessions = vi.fn();
const agents = vi.fn();
const surfaces = vi.fn();
const elicitations = vi.fn();

function installApi(): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      workspaceProbe: probe,
      workspaceProbeUrl: vi.fn().mockResolvedValue("http://127.0.0.1:6767"),
      workspaceSupervisorStatus: supStatus,
      listWorkspaceSessions: sessions,
      listWorkspaceAgents: agents,
      workspaceGovernanceSurfaces: surfaces,
      workspaceGovernanceElicitations: elicitations,
    },
  });
}

import { useWorkspaceConsoleData } from "../src/renderer/src/screens/WorkspaceConsole/useWorkspaceConsoleData";

describe("useWorkspaceConsoleData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApi();
  });

  it("loads probe + supervisor into stable state", async () => {
    probe.mockResolvedValue({
      reachable: true,
      baseUrl: "http://127.0.0.1:6767",
      health: { status: "ok", body: {} },
      info: { name: "cubecloud-agent", version: "0.4.0" },
      stack: null,
      error: null,
      scannedAt: "2026-10-13T00:00:00.000Z",
    });
    supStatus.mockResolvedValue({
      state: "running",
      running: true,
      cli: "omnigent",
      reason: null,
    });
    sessions.mockResolvedValue({ success: true, data: [], hasMore: false });
    agents.mockResolvedValue({ success: true, data: [], hasMore: false });
    surfaces.mockResolvedValue({
      scheduledTasks: [],
      policies: [],
      shares: [],
      errors: [],
    });

    const { result } = renderHook(() => useWorkspaceConsoleData(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.probe?.reachable).toBe(true);
    expect(result.current.probe?.version).toBe("0.4.0");
    expect(result.current.supervisor?.running).toBe(true);
  });

  it("degrades to null/[] (never throws) when a call rejects", async () => {
    probe.mockRejectedValue(new Error("boom"));
    supStatus.mockRejectedValue(new Error("boom"));
    sessions.mockRejectedValue(new Error("boom"));
    agents.mockRejectedValue(new Error("boom"));
    surfaces.mockRejectedValue(new Error("boom"));
    elicitations.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useWorkspaceConsoleData("sess-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.probe).toBeNull();
    expect(result.current.sessions).toEqual([]);
    expect(result.current.elicitationError).toBeTruthy();
  });
});
