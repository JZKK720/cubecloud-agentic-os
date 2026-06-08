// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  CodeGraphEntrypoint,
  CodeGraphQueryTemplate,
  CodeGraphRepoSummary,
  PlatformOverview,
  PlatformState,
  PlatformView,
} from "@cubecloud/platform-core";
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
  state = setRuntimeSurfaceConfig(state, "codegraph", {
    protocol: "http",
    host: "127.0.0.1",
    port: 3000,
    path: "/",
    mode: "desktop",
  });
  state = setAppEnabled(state, "codegraph", true);
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
  setRuntimeSurfaceConfig: ReturnType<typeof vi.fn>;
  setAppEnabled: ReturnType<typeof vi.fn>;
  openRuntimeSurface: ReturnType<typeof vi.fn>;
  saveWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
  initializeWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
  syncWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
  saveWorkspaceCodeGraphEntrypoint: ReturnType<typeof vi.fn>;
  saveWorkspaceCodeGraphQuery: ReturnType<typeof vi.fn>;
} {
  let currentState = createState("codegraph");
  let currentOverview = buildOverview(currentState);
  let currentRepos: CodeGraphRepoSummary[] = [
    {
      id: "repo-1",
      name: "Cubecloud shell",
      repoPath: "D:\\users\\joeyzh\\github-pr\\cubecloud-agentic-os",
      description: "Primary shell workspace",
      selected: true,
      exists: true,
      initialized: false,
      fileCount: null,
      nodeCount: null,
      edgeCount: null,
      detectedFrameworks: [],
    },
  ];
  let currentEntrypoints: CodeGraphEntrypoint[] = [];
  let currentQueries: CodeGraphQueryTemplate[] = [
    {
      id: "query-1",
      repoId: null,
      name: "Workflow entrypoints",
      mode: "workflow",
      query: "Find main entrypoints.",
    },
  ];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentState = setActiveView(currentState, view);
      currentOverview = buildOverview(currentState);
      return currentOverview;
    }),
    setRuntimeSurfaceConfig: vi.fn(async (appId: string, patch) => {
      currentState = setRuntimeSurfaceConfig(currentState, appId, patch);
      currentOverview = buildOverview(currentState);
      return currentOverview;
    }),
    setAppEnabled: vi.fn(async (appId: string, enabled: boolean) => {
      currentState = setAppEnabled(currentState, appId, enabled);
      currentOverview = buildOverview(currentState);
      return currentOverview;
    }),
    openRuntimeSurface: vi.fn(async () => true),
    listWorkspaceCodeGraphRepos: vi.fn(async () => currentRepos),
    saveWorkspaceCodeGraphRepo: vi.fn(async (input: {
      id?: string;
      name: string;
      repoPath: string;
      description: string;
      selected: boolean;
    }) => {
      const nextRepo: CodeGraphRepoSummary = {
        ...(currentRepos.find((repo) => repo.id === input.id) ?? currentRepos[0]),
        id: input.id ?? "repo-2",
        name: input.name,
        repoPath: input.repoPath,
        description: input.description,
        selected: input.selected,
      };
      const nextRepos = currentRepos.some((repo) => repo.id === nextRepo.id)
        ? currentRepos.map((repo) => (repo.id === nextRepo.id ? nextRepo : repo))
        : [...currentRepos, nextRepo];
      currentRepos = nextRepos.map((repo, index) => ({
        ...repo,
        selected: input.selected ? repo.id === nextRepo.id : index === 0,
      }));
      return currentRepos;
    }),
    removeWorkspaceCodeGraphRepo: vi.fn(async (id: string) => {
      currentRepos = currentRepos.filter((repo) => repo.id !== id);
      currentEntrypoints = currentEntrypoints.filter((entrypoint) => entrypoint.repoId !== id);
      currentQueries = currentQueries.filter((query) => query.repoId !== id);
      return currentRepos;
    }),
    setCurrentWorkspaceCodeGraphRepo: vi.fn(async (id: string) => {
      currentRepos = currentRepos.map((repo) => ({
        ...repo,
        selected: repo.id === id,
      }));
      return currentRepos;
    }),
    initializeWorkspaceCodeGraphRepo: vi.fn(async (id: string) => {
      currentRepos = currentRepos.map((repo) =>
        repo.id === id ? { ...repo, initialized: true } : repo,
      );
      return currentRepos;
    }),
    syncWorkspaceCodeGraphRepo: vi.fn(async (id: string) => {
      currentRepos = currentRepos.map((repo) =>
        repo.id === id
          ? {
              ...repo,
              initialized: true,
              fileCount: 12,
              nodeCount: 48,
              edgeCount: 64,
              detectedFrameworks: ["electron", "react"],
            }
          : repo,
      );
      return currentRepos;
    }),
    listWorkspaceCodeGraphEntrypoints: vi.fn(async () => currentEntrypoints),
    saveWorkspaceCodeGraphEntrypoint: vi.fn(async (input: {
      id?: string;
      repoId: string;
      name: string;
      target: string;
      notes: string;
    }) => {
      const nextEntrypoint: CodeGraphEntrypoint = {
        id: input.id ?? `entrypoint-${currentEntrypoints.length + 1}`,
        repoId: input.repoId,
        name: input.name,
        target: input.target,
        notes: input.notes,
      };
      currentEntrypoints = currentEntrypoints.some((entrypoint) => entrypoint.id === nextEntrypoint.id)
        ? currentEntrypoints.map((entrypoint) =>
            entrypoint.id === nextEntrypoint.id ? nextEntrypoint : entrypoint,
          )
        : [...currentEntrypoints, nextEntrypoint];
      return currentEntrypoints;
    }),
    removeWorkspaceCodeGraphEntrypoint: vi.fn(async (id: string) => {
      currentEntrypoints = currentEntrypoints.filter((entrypoint) => entrypoint.id !== id);
      return currentEntrypoints;
    }),
    listWorkspaceCodeGraphQueries: vi.fn(async () => currentQueries),
    saveWorkspaceCodeGraphQuery: vi.fn(async (input: {
      id?: string;
      repoId?: string | null;
      name: string;
      mode: CodeGraphQueryTemplate["mode"];
      query: string;
    }) => {
      const nextQuery: CodeGraphQueryTemplate = {
        id: input.id ?? `query-${currentQueries.length + 1}`,
        repoId: input.repoId ?? null,
        name: input.name,
        mode: input.mode,
        query: input.query,
      };
      currentQueries = currentQueries.some((query) => query.id === nextQuery.id)
        ? currentQueries.map((query) => (query.id === nextQuery.id ? nextQuery : query))
        : [...currentQueries, nextQuery];
      return currentQueries;
    }),
    removeWorkspaceCodeGraphQuery: vi.fn(async (id: string) => {
      currentQueries = currentQueries.filter((query) => query.id !== id);
      return currentQueries;
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    setRuntimeSurfaceConfig: ReturnType<typeof vi.fn>;
    setAppEnabled: ReturnType<typeof vi.fn>;
    openRuntimeSurface: ReturnType<typeof vi.fn>;
    saveWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
    initializeWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
    syncWorkspaceCodeGraphRepo: ReturnType<typeof vi.fn>;
    saveWorkspaceCodeGraphEntrypoint: ReturnType<typeof vi.fn>;
    saveWorkspaceCodeGraphQuery: ReturnType<typeof vi.fn>;
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

describe("App CodeGraph surface", () => {
  it("saves shell-owned CodeGraph surface config and toggles the app state", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Host") as HTMLInputElement).value).toBe("127.0.0.1");
    });

    fireEvent.change(screen.getAllByLabelText("Mode")[0], {
      target: { value: "remote" },
    });
    fireEvent.change(screen.getByLabelText("Host"), {
      target: { value: "codegraph.internal" },
    });
    fireEvent.change(screen.getByLabelText("Port"), {
      target: { value: "4100" },
    });
    fireEvent.change(screen.getByLabelText("Path"), {
      target: { value: "/graph" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save config" }));

    await waitFor(() => {
      expect(platformAPI.setRuntimeSurfaceConfig).toHaveBeenCalledWith("codegraph", {
        protocol: "http",
        host: "codegraph.internal",
        port: 4100,
        path: "/graph",
        mode: "remote",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "http://codegraph.internal:4100/graph" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Disable surface" }));

    await waitFor(() => {
      expect(platformAPI.setAppEnabled).toHaveBeenCalledWith("codegraph", false);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Enable surface" })).toBeTruthy();
    });
  });

  it("manages saved repos, entrypoints, and queries", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect((await screen.findAllByText("Cubecloud shell")).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Repo path"), {
      target: { value: "D:\\repos\\cubecloud-shell" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Updated shell repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update repo" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceCodeGraphRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "repo-1",
          repoPath: "D:\\repos\\cubecloud-shell",
          description: "Updated shell repo",
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Initialize graph" }));

    await waitFor(() => {
      expect(platformAPI.initializeWorkspaceCodeGraphRepo).toHaveBeenCalledWith("repo-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Sync index" }));

    await waitFor(() => {
      expect(platformAPI.syncWorkspaceCodeGraphRepo).toHaveBeenCalledWith("repo-1");
    });

    fireEvent.change(screen.getByPlaceholderText("API bootstrap"), {
      target: { value: "Main bootstrap" },
    });
    fireEvent.change(screen.getByPlaceholderText("src/main/index.ts:createWindow"), {
      target: { value: "src/main/index.ts:createWindow" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save entrypoint" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceCodeGraphEntrypoint).toHaveBeenCalledWith(
        expect.objectContaining({
          repoId: "repo-1",
          name: "Main bootstrap",
          target: "src/main/index.ts:createWindow",
        }),
      );
    });

    expect(await screen.findByText("Main bootstrap")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("Routing manifest"), {
      target: { value: "Impact scan" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(
        "Summarize routing, main entrypoints, and impacted workflows for this repo.",
      ),
      {
        target: { value: "Trace downstream callers and impacted workflows." },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save query" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceCodeGraphQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Impact scan",
          query: "Trace downstream callers and impacted workflows.",
        }),
      );
    });

    expect(await screen.findByText("Impact scan")).toBeTruthy();
  });

  it("blocks invalid port drafts before saving", async () => {
    installPlatformApi();

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Port") as HTMLInputElement).value).toBe("3000");
    });

    fireEvent.change(screen.getByLabelText("Port"), {
      target: { value: "0" },
    });

    expect((screen.getByRole("button", { name: "Save config" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/positive port number/i)).toBeTruthy();
  });
});