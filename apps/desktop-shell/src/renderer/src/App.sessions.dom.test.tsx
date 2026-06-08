// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  AgentChatSession,
  AgentSessionHistoryItem,
  PlatformOverview,
  PlatformView,
} from "@cubecloud/platform-core";
import {
  buildPlatformOverview,
  createDefaultPlatformState,
  setActiveRuntimeProvider,
  setActiveView,
} from "@cubecloud/platform-core";
import App from "./App";
import { ThemeProvider } from "./ThemeProvider";

function createOverview(activeView: PlatformView): PlatformOverview {
  let state = createDefaultPlatformState();
  state = setActiveRuntimeProvider(state, "hermes");
  state = setActiveView(state, activeView);

  const overview = buildPlatformOverview(state);

  return {
    ...overview,
    runtimeProviders: overview.runtimeProviders.map((provider) =>
      provider.id === "hermes"
        ? {
            ...provider,
            surfaceMode: "desktop",
            surfaceUrl: "http://127.0.0.1:8644",
          }
        : provider,
    ),
  };
}

function renderApp(): void {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

function installPlatformApi(options?: {
  sessions?: AgentChatSession[];
  histories?: Record<string, AgentSessionHistoryItem[]>;
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listAgentSessions: ReturnType<typeof vi.fn>;
  getAgentSessionHistory: ReturnType<typeof vi.fn>;
  updateAgentSessionTitle: ReturnType<typeof vi.fn>;
  deleteAgentSession: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview("sessions");
  let sessionsState = options?.sessions ?? [
    {
      id: "sess-1",
      title: "Planning pass",
      startedAt: 1717000000000,
      messageCount: 2,
      model: "claude-sonnet",
      source: "local",
    },
    {
      id: "sess-2",
      title: "Runtime follow-up",
      startedAt: 1717003600000,
      messageCount: 3,
      model: "gpt-4.1",
      source: "local",
    },
  ];
  const histories = options?.histories ?? {
    "sess-1": [
      { kind: "user", id: 1, content: "Need runtime parity", timestamp: 10 },
      { kind: "assistant", id: 2, content: "Inspecting the local Hermes lane.", timestamp: 11 },
    ],
    "sess-2": [
      { kind: "user", id: 3, content: "How do we stage resume?", timestamp: 20 },
      { kind: "assistant", id: 4, content: "Resume is available from the session inspector.", timestamp: 21 },
    ],
  } satisfies Record<string, AgentSessionHistoryItem[]>;

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listAgentSessions: vi.fn(async () => sessionsState),
    getAgentSessionHistory: vi.fn(async (sessionId: string) => histories[sessionId] ?? []),
    updateAgentSessionTitle: vi.fn(async (sessionId: string, title: string) => {
      const nextTitle = title.trim() || `Session ${sessionId.slice(-6)}`;
      sessionsState = sessionsState.map((session) =>
        session.id === sessionId ? { ...session, title: nextTitle } : session,
      );
      return sessionsState;
    }),
    deleteAgentSession: vi.fn(async (sessionId: string) => {
      sessionsState = sessionsState.filter((session) => session.id !== sessionId);
      return sessionsState;
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listAgentSessions: ReturnType<typeof vi.fn>;
    getAgentSessionHistory: ReturnType<typeof vi.fn>;
    updateAgentSessionTitle: ReturnType<typeof vi.fn>;
    deleteAgentSession: ReturnType<typeof vi.fn>;
  };

  window.platformAPI = platformAPI;
  return platformAPI;
}

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

beforeEach(() => {
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App sessions inspector", () => {
  it("loads the selected session transcript and switches inspector content when another session is chosen", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Planning pass" })).toBeTruthy();
    expect(await screen.findByText("Need runtime parity")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Runtime follow-up/i }));

    await waitFor(() => {
      expect(platformAPI.getAgentSessionHistory).toHaveBeenLastCalledWith("sess-2");
    });

    expect(await screen.findByRole("heading", { name: "Runtime follow-up" })).toBeTruthy();
    expect(await screen.findByText("How do we stage resume?")).toBeTruthy();
  });

  it("resumes the selected session into chat from the inspector", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByText("Need runtime parity")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Resume in chat" }));

    await waitFor(() => {
      expect(platformAPI.setActiveView).toHaveBeenCalledWith("chat");
    });

    expect(await screen.findByText("Inspecting the local Hermes lane.")).toBeTruthy();
    expect(screen.getByText(/Resuming/)).toBeTruthy();
  });

  it("renames the selected session from the inspector", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    const titleInput = await screen.findByLabelText("Session title");
    fireEvent.change(titleInput, { target: { value: "Renamed session" } });
    fireEvent.click(screen.getByRole("button", { name: "Save title" }));

    await waitFor(() => {
      expect(platformAPI.updateAgentSessionTitle).toHaveBeenCalledWith(
        "sess-1",
        "Renamed session",
      );
    });

    expect(await screen.findByRole("heading", { name: "Renamed session" })).toBeTruthy();
  });

  it("deletes the selected session and advances the inspector to the next one", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Planning pass" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Delete session" }));

    await waitFor(() => {
      expect(platformAPI.deleteAgentSession).toHaveBeenCalledWith("sess-1");
    });

    expect(await screen.findByRole("heading", { name: "Runtime follow-up" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Planning pass/i })).toBeNull();
  });
});