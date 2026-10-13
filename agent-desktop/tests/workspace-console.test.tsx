// Phase C — WorkspaceConsole screen tests.
//
// The surface is five tabs over the shipped workspace IPC. These tests
// pin the user-facing outcome: a management surface, not a webview.
import React from "react";import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../src/renderer/src/components/useI18n", () => ({
  // Return the last key segment so assertions read as short names.
  useI18n: () => ({
    t: (key: string) => key.split(".").pop() ?? key,
    locale: "en",
    setLocale: () => {},
  }),
}));

import WorkspaceConsole from "../src/renderer/src/screens/WorkspaceConsole/WorkspaceConsole";

function installApi(over: Partial<Window["hermesAPI"]> = {}): void {
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: {
      workspaceProbe: vi.fn().mockResolvedValue({
        reachable: true,
        baseUrl: "http://127.0.0.1:6767",
        health: { status: "ok", body: {} },
        info: { name: "cubecloud-agent", version: "0.4.0" },
        stack: null,
        error: null,
        scannedAt: "2026-10-13T00:00:00.000Z",
      }),
      workspaceProbeUrl: vi.fn().mockResolvedValue("http://127.0.0.1:6767"),
      workspaceSupervisorStatus: vi.fn().mockResolvedValue({
        state: "running",
        running: true,
        cli: "omnigent",
        reason: null,
      }),
      workspaceSupervisorLogTail: vi.fn().mockResolvedValue({
        lines: ["boot ok"],
        totalBytes: 7,
      }),
      workspaceSupervisorStop: vi.fn().mockResolvedValue({
        state: "stopped",
        running: false,
        cli: "omnigent",
        reason: null,
      }),
      workspaceSupervisorStart: vi.fn().mockResolvedValue({
        state: "running",
        running: true,
        cli: "omnigent",
        reason: null,
      }),
      listWorkspaceSessions: vi.fn().mockResolvedValue({
        success: true,
        data: [],
        hasMore: false,
      }),
      listWorkspaceAgents: vi.fn().mockResolvedValue({
        success: true,
        data: [],
        hasMore: false,
      }),
      workspaceGovernanceSurfaces: vi.fn().mockResolvedValue({
        scheduledTasks: [],
        policies: [],
        shares: [],
        errors: [],
      }),
      workspaceGovernanceElicitations: vi
        .fn()
        .mockResolvedValue({ success: true, requests: [] }),
      workspaceProvisionEnv: vi.fn().mockResolvedValue({
        env: "",
        stamp: "abc123",
        written: true,
        fingerprintedKeys: [],
        error: null,
      }),
      workspaceGovernanceResolve: vi
        .fn()
        .mockResolvedValue({ success: true, queued: true }),
      openExternal: vi.fn(),
      ...over,
    },
  });
}

beforeEach(() => installApi());

describe("WorkspaceConsole", () => {
  it("renders the reachable status and the five tabs", async () => {
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    expect(screen.getByText("tabOverview")).toBeTruthy();
    expect(screen.getByText("tabSettings")).toBeTruthy();
    expect(screen.getByText("tabSessions")).toBeTruthy();
    expect(screen.getByText("tabPolicies")).toBeTruthy();
    expect(screen.getByText("tabApprovals")).toBeTruthy();
  });

  it("stops the supervisor from the overview panel", async () => {
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("stop"));
    await waitFor(() =>
      expect(window.hermesAPI.workspaceSupervisorStop).toHaveBeenCalled(),
    );
  });

  it("never renders a webview element", async () => {
    const { container } = render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    expect(container.querySelector("webview")).toBeNull();
  });

  it("provisions the env and never echoes the secret", async () => {
    const provision = vi.fn().mockResolvedValue({
      env: "",
      stamp: "abc123",
      written: true,
      fingerprintedKeys: ["HERMES_API_KEY=abcd…wxyz"],
      error: null,
    });
    installApi({ workspaceProvisionEnv: provision });

    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSettings"));
    fireEvent.change(screen.getByLabelText("provisionHermesUrl"), {
      target: { value: "http://127.0.0.1:8642" },
    });
    fireEvent.change(screen.getByLabelText("provisionHermesKey"), {
      target: { value: "sk-secret" },
    });
    fireEvent.click(screen.getByText("provisionWrite"));

    await waitFor(() => expect(provision).toHaveBeenCalled());
    expect(screen.queryByText("sk-secret")).toBeNull();
  });

  it("mirrors workspace sessions and agents read-only", async () => {
    installApi({
      listWorkspaceSessions: vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: "s1",
            agentId: null,
            agentName: null,
            status: "idle",
            title: "First",
            createdAt: null,
            runnerId: null,
            runnerOnline: null,
            hostOnline: null,
            externalSessionId: null,
            modelOverride: null,
            gitBranch: null,
          },
        ],
        hasMore: false,
      }),
      listWorkspaceAgents: vi.fn().mockResolvedValue({
        success: true,
        data: [{ id: "a1", name: "Researcher", description: null, createdAt: null }],
        hasMore: false,
      }),
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSessions"));
    await waitFor(() => expect(screen.getByText(/First/)).toBeTruthy());
    expect(screen.getByText("Researcher")).toBeTruthy();
  });

  it("renders policies, scheduled tasks, and a tolerant partial note", async () => {
    installApi({
      workspaceGovernanceSurfaces: vi.fn().mockResolvedValue({
        scheduledTasks: [{ id: "t1", name: "Nightly", mode: "cron", nextRun: null }],
        policies: [{ name: "ask-before-shell", mode: "ask" }],
        shares: [],
        errors: ["policy-registry HTTP 404"],
      }),
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabPolicies"));
    await waitFor(() => expect(screen.getByText(/ask-before-shell/)).toBeTruthy());
    expect(screen.getByText("Nightly")).toBeTruthy();
    expect(screen.getByText("surfacesPartial")).toBeTruthy();
  });

  it("delivers an approval verdict from the inbox", async () => {
    const resolve = vi.fn().mockResolvedValue({ success: true, queued: true });
    installApi({
      workspaceGovernanceElicitations: vi.fn().mockResolvedValue({
        success: true,
        requests: [
          {
            elicitationId: "e1",
            mode: "form",
            message: "Allow shell?",
            requestedSchema: null,
            url: null,
            phase: "policy",
            policyName: "ask-before-shell",
            contentPreview: null,
            targetSessionId: null,
          },
        ],
      }),
      workspaceGovernanceResolve: resolve,
    });
    render(<WorkspaceConsole />);
    await waitFor(() => expect(screen.getByText("statusReachable")).toBeTruthy());
    fireEvent.click(screen.getByText("tabSettings"));
    fireEvent.change(screen.getByLabelText("governanceSession"), {
      target: { value: "sess-1" },
    });
    fireEvent.click(screen.getByText("tabApprovals"));
    await waitFor(() => expect(screen.getByText("Allow shell?")).toBeTruthy());
    fireEvent.click(screen.getByText("approve"));
    await waitFor(() =>
      expect(resolve).toHaveBeenCalledWith(null, "sess-1", "e1", {
        action: "accept",
      }),
    );
  });
});
