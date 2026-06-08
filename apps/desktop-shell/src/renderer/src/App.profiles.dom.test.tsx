// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  AgentModelEndpoint,
  AgentProfile,
  AgentProviderConfig,
  KanbanBoard,
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

function normalizeProfiles(profiles: AgentProfile[]): AgentProfile[] {
  if (profiles.length === 0) {
    return [];
  }

  const defaultIndex = profiles.findIndex((profile) => profile.isDefault);
  const resolvedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;
  const next = profiles.map((profile, index) => ({
    ...profile,
    isDefault: index === resolvedDefaultIndex,
  }));

  return [
    next[resolvedDefaultIndex],
    ...next.filter((_, index) => index !== resolvedDefaultIndex),
  ];
}

function installPlatformApi(options: {
  activeView: PlatformView;
  profiles?: AgentProfile[];
  models?: AgentModelEndpoint[];
  providers?: AgentProviderConfig[];
  boards?: KanbanBoard[];
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listWorkspaceProfiles: ReturnType<typeof vi.fn>;
  listWorkspaceModels: ReturnType<typeof vi.fn>;
  listWorkspaceProviders: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
  saveWorkspaceProfile: ReturnType<typeof vi.fn>;
  removeWorkspaceProfile: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview(options.activeView);
  let currentProfiles = normalizeProfiles([...(options.profiles ?? [])]);
  const currentModels = options.models ?? [
    {
      id: "model-1",
      name: "Claude Sonnet",
      provider: "anthropic",
      model: "claude-sonnet",
      baseUrl: "https://api.anthropic.com/v1",
      createdAt: 1717000000000,
    },
    {
      id: "model-2",
      name: "GPT 4.1 Mini",
      provider: "openai",
      model: "gpt-4.1-mini",
      baseUrl: "https://api.openai.com/v1",
      createdAt: 1717003600000,
    },
  ];
  const currentProviders = options.providers ?? [
    {
      id: "provider-1",
      name: "Anthropic",
      type: "anthropic",
      apiKey: "",
      baseUrl: "https://api.anthropic.com/v1",
    },
    {
      id: "provider-2",
      name: "OpenAI",
      type: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
    },
  ];
  const currentBoards = options.boards ?? [
    {
      slug: "operations",
      name: "Operations",
      description: null,
      isCurrent: true,
      counts: {},
      total: 0,
    },
  ];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listWorkspaceProfiles: vi.fn(async () => currentProfiles),
    listWorkspaceModels: vi.fn(async () => currentModels),
    listWorkspaceProviders: vi.fn(async () => currentProviders),
    listWorkspaceKanbanBoards: vi.fn(async () => currentBoards),
    saveWorkspaceProfile: vi.fn(async (input: {
      name: string;
      model: string;
      provider: string;
      isDefault: boolean;
      kanbanBoardSlug?: string | null;
      existingName?: string;
    }) => {
      const lookupName = (input.existingName ?? input.name).trim();
      const nextProfile: AgentProfile = {
        name: input.name.trim() || "default",
        model: input.model.trim() || "default",
        provider: input.provider.trim() || "workspace",
        isDefault: input.isDefault,
        kanbanBoardSlug: input.kanbanBoardSlug ?? null,
        skillCount: currentProfiles[0]?.skillCount ?? 0,
        gatewayRunning: currentProfiles[0]?.gatewayRunning ?? false,
      };
      const nextProfiles = currentProfiles.some((profile) => profile.name === lookupName)
        ? currentProfiles.map((profile) =>
            profile.name === lookupName ? nextProfile : profile,
          )
        : [...currentProfiles, nextProfile];

      currentProfiles = normalizeProfiles(
        input.isDefault
          ? nextProfiles.map((profile) =>
              profile.name === nextProfile.name
                ? profile
                : {
                    ...profile,
                    isDefault: false,
                  },
            )
          : nextProfiles,
      );

      return currentProfiles;
    }),
    removeWorkspaceProfile: vi.fn(async (name: string) => {
      currentProfiles = normalizeProfiles(
        currentProfiles.filter((profile) => profile.name !== name),
      );
      return currentProfiles;
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listWorkspaceProfiles: ReturnType<typeof vi.fn>;
    listWorkspaceModels: ReturnType<typeof vi.fn>;
    listWorkspaceProviders: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
    saveWorkspaceProfile: ReturnType<typeof vi.fn>;
    removeWorkspaceProfile: ReturnType<typeof vi.fn>;
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

describe("App profile editor", () => {
  it("keeps profiles in draft mode when New draft is used with saved profiles present", async () => {
    installPlatformApi({
      activeView: "agents",
      profiles: [
        {
          name: "primary-ops",
          model: "claude-sonnet",
          provider: "anthropic",
          isDefault: true,
          skillCount: 4,
          gatewayRunning: true,
        },
        {
          name: "incident-review",
          model: "gpt-4.1-mini",
          provider: "openai",
          isDefault: false,
          skillCount: 4,
          gatewayRunning: true,
        },
      ],
    });

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("primary-ops");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create profile" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Model") as HTMLSelectElement).value).toBe("claude-sonnet");
    expect((screen.getByLabelText("Provider") as HTMLSelectElement).value).toBe("anthropic");
  });

  it("creates, updates, and removes saved profiles", async () => {
    const platformAPI = installPlatformApi({
      activeView: "agents",
      profiles: [
        {
          name: "primary-ops",
          model: "claude-sonnet",
          provider: "anthropic",
          isDefault: true,
          skillCount: 4,
          gatewayRunning: true,
        },
      ],
    });

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("primary-ops");
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Provider") as HTMLSelectElement).value).toBe("anthropic");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "release-review" },
    });
    fireEvent.change(screen.getByLabelText("Model"), {
      target: { value: "gpt-4.1-mini" },
    });
    fireEvent.change(screen.getByLabelText("Provider"), {
      target: { value: "openai" },
    });
    fireEvent.change(screen.getByLabelText("Kanban board"), {
      target: { value: "operations" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save new" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceProfile).toHaveBeenCalledWith({
        name: "release-review",
        model: "gpt-4.1-mini",
        provider: "openai",
        isDefault: false,
        kanbanBoardSlug: "operations",
      });
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("release-review");
    });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "release-review-v2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Make default" }));
    fireEvent.click(screen.getByRole("button", { name: "Update selected" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceProfile).toHaveBeenLastCalledWith({
        name: "release-review-v2",
        model: "gpt-4.1-mini",
        provider: "openai",
        isDefault: true,
        kanbanBoardSlug: "operations",
        existingName: "release-review",
      });
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("release-review-v2");
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    await waitFor(() => {
      expect(platformAPI.removeWorkspaceProfile).toHaveBeenCalledWith("release-review-v2");
    });

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("primary-ops");
    });
  });

  it("shows registry validation when a saved profile points at missing model or provider entries", async () => {
    installPlatformApi({
      activeView: "agents",
      profiles: [
        {
          name: "legacy-profile",
          model: "retired-model",
          provider: "retired-provider",
          isDefault: true,
          skillCount: 1,
          gatewayRunning: false,
        },
      ],
    });

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("legacy-profile");
    });

    expect(screen.getByText(/missing provider and a missing model endpoint/i)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save new" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Update selected" }) as HTMLButtonElement).disabled).toBe(true);
  });
});