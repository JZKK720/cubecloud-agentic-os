// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { EverOsHarness, PlatformOverview, PlatformState, PlatformView } from "@cubecloud/platform-core";
import {
  buildPlatformOverview,
  createDefaultPlatformState,
  setActiveRuntimeProvider,
  setActiveView,
  setAppEnabled,
  setRuntimeSurfaceConfig,
} from "@cubecloud/platform-core";
import App from "./App";
import { ThemeProvider } from "./ThemeProvider";

function buildOverview(state: PlatformState): PlatformOverview {
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

function createState(activeView: PlatformView): PlatformState {
  let state = createDefaultPlatformState();
  state = setActiveRuntimeProvider(state, "hermes");
  state = setActiveView(state, activeView);
  state = setRuntimeSurfaceConfig(state, "everos", {
    protocol: "http",
    host: "127.0.0.1",
    port: 1995,
    path: "/",
    mode: "desktop",
  });
  state = setAppEnabled(state, "everos", true);
  return state;
}

function renderApp(): void {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

function installPlatformApi(): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  saveWorkspaceEverOsHarness: ReturnType<typeof vi.fn>;
  setWorkspaceEverOsHarnessEnabled: ReturnType<typeof vi.fn>;
  removeWorkspaceEverOsHarness: ReturnType<typeof vi.fn>;
} {
  let currentState = createState("everos");
  let currentOverview = buildOverview(currentState);
  let currentHarnesses: EverOsHarness[] = [
    {
      id: "harness-1",
      name: "Ops memory loop",
      description: "Primary operator memory loop",
      memoryNamespace: "cubecloud-ops",
      profile: "default",
      scheduleId: "schedule-1",
      loopPrompt: "Review the latest operator notes.",
      enabled: true,
    },
  ];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentState = setActiveView(currentState, view);
      currentOverview = buildOverview(currentState);
      return currentOverview;
    }),
    setAppEnabled: vi.fn(async (appId: string, enabled: boolean) => {
      currentState = setAppEnabled(currentState, appId, enabled);
      currentOverview = buildOverview(currentState);
      return currentOverview;
    }),
    openRuntimeSurface: vi.fn(async () => true),
    listWorkspaceProfiles: vi.fn(async () => [
      {
        name: "default",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
        kanbanBoardSlug: "operations",
        skillCount: 2,
        gatewayRunning: true,
      },
    ]),
    listWorkspaceSchedules: vi.fn(async () => [
      {
        id: "schedule-1",
        name: "Nightly memory sync",
        cron: "60m",
        prompt: "Sync memory.",
        profile: "default",
        kanbanBoardSlug: "operations",
        enabled: true,
        nextRunAt: 1717003600000,
        lastRunAt: 1717000000000,
      },
    ]),
    listWorkspaceEverOsHarnesses: vi.fn(async () => currentHarnesses),
    saveWorkspaceEverOsHarness: vi.fn(async (input: {
      id?: string;
      name: string;
      description: string;
      memoryNamespace: string;
      profile: string;
      scheduleId?: string | null;
      loopPrompt: string;
      enabled: boolean;
    }) => {
      const nextHarness: EverOsHarness = {
        id: input.id ?? `harness-${currentHarnesses.length + 1}`,
        name: input.name,
        description: input.description,
        memoryNamespace: input.memoryNamespace,
        profile: input.profile,
        scheduleId: input.scheduleId ?? null,
        loopPrompt: input.loopPrompt,
        enabled: input.enabled,
      };
      currentHarnesses = currentHarnesses.some((harness) => harness.id === nextHarness.id)
        ? currentHarnesses.map((harness) => (harness.id === nextHarness.id ? nextHarness : harness))
        : [...currentHarnesses, nextHarness];
      return currentHarnesses;
    }),
    removeWorkspaceEverOsHarness: vi.fn(async (id: string) => {
      currentHarnesses = currentHarnesses.filter((harness) => harness.id !== id);
      return currentHarnesses;
    }),
    setWorkspaceEverOsHarnessEnabled: vi.fn(async (id: string, enabled: boolean) => {
      currentHarnesses = currentHarnesses.map((harness) =>
        harness.id === id ? { ...harness, enabled } : harness,
      );
      return currentHarnesses;
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    saveWorkspaceEverOsHarness: ReturnType<typeof vi.fn>;
    setWorkspaceEverOsHarnessEnabled: ReturnType<typeof vi.fn>;
    removeWorkspaceEverOsHarness: ReturnType<typeof vi.fn>;
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

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App EverOS surface", () => {
  it("creates, updates, and toggles shell-owned EverOS harnesses", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Ops memory loop" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Night ops loop" },
    });
    fireEvent.change(screen.getByLabelText("Memory namespace"), {
      target: { value: "night-ops" },
    });
    fireEvent.change(screen.getByLabelText("Loop prompt"), {
      target: { value: "Capture nightly operator memory." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save new" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceEverOsHarness).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Night ops loop",
          memoryNamespace: "night-ops",
          loopPrompt: "Capture nightly operator memory.",
          profile: "default",
        }),
      );
    });

    expect(await screen.findByRole("heading", { name: "Night ops loop" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Disable" }));

    await waitFor(() => {
      expect(platformAPI.setWorkspaceEverOsHarnessEnabled).toHaveBeenCalled();
    });
  });
});