// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  AgentDispatchContextOverride,
  AgentDispatchRun,
  AgentProfile,
  AgentSchedule,
  CodeGraphQueryTemplate,
  CodeGraphRepoSummary,
  EverOsHarness,
  HermesRuntimeLifecycleSummary,
  KanbanBoard,
  KanbanTask,
  PlatformOverview,
  PlatformRuntimeProviderId,
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

function createOverview(
  activeView: PlatformView,
  runtimeProviderId: PlatformRuntimeProviderId = "hermes",
): PlatformOverview {
  let state = createDefaultPlatformState();
  state = setActiveRuntimeProvider(state, runtimeProviderId);
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

function recalculateBoards(
  boards: KanbanBoard[],
  tasksByBoard: Record<string, KanbanTask[]>,
  currentBoardSlug: string,
): KanbanBoard[] {
  return boards.map((board) => {
    const boardTasks = tasksByBoard[board.slug] ?? [];
    const counts = boardTasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      ...board,
      counts,
      total: boardTasks.length,
      isCurrent: board.slug === currentBoardSlug,
    };
  });
}

function installPlatformApi(options?: {
  activeView?: PlatformView;
  profiles?: AgentProfile[];
  schedules?: AgentSchedule[];
  boards?: KanbanBoard[];
  hermesLifecycle?: Partial<HermesRuntimeLifecycleSummary>;
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  setActiveRuntimeProvider: ReturnType<typeof vi.fn>;
  listWorkspaceProfiles: ReturnType<typeof vi.fn>;
  listWorkspaceSchedules: ReturnType<typeof vi.fn>;
  listWorkspaceDispatchRuns: ReturnType<typeof vi.fn>;
  getHermesRuntimeLifecycle: ReturnType<typeof vi.fn>;
  verifyHermesRuntime: ReturnType<typeof vi.fn>;
  installHermesRuntime: ReturnType<typeof vi.fn>;
  repairHermesRuntime: ReturnType<typeof vi.fn>;
  updateHermesRuntime: ReturnType<typeof vi.fn>;
  openHermesGatewayLog: ReturnType<typeof vi.fn>;
  runHermesDoctor: ReturnType<typeof vi.fn>;
  startHermesGateway: ReturnType<typeof vi.fn>;
  stopHermesGateway: ReturnType<typeof vi.fn>;
  adoptHermesHome: ReturnType<typeof vi.fn>;
  resetHermesHomeAdoption: ReturnType<typeof vi.fn>;
  subscribeHermesRuntimeLifecycle: ReturnType<typeof vi.fn>;
  listWorkspaceCodeGraphRepos: ReturnType<typeof vi.fn>;
  listWorkspaceCodeGraphQueries: ReturnType<typeof vi.fn>;
  listWorkspaceEverOsHarnesses: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanTasks: ReturnType<typeof vi.fn>;
  setCurrentWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
  dispatchWorkspaceProfile: ReturnType<typeof vi.fn>;
  triggerWorkspaceSchedule: ReturnType<typeof vi.fn>;
  subscribeWorkspaceDispatchRuns: ReturnType<typeof vi.fn>;
  emitDispatchRunsUpdated: (
    runs: AgentDispatchRun[],
    runtimeProviderId?: PlatformRuntimeProviderId,
  ) => void;
  emitHermesLifecycleUpdated: (summary?: HermesRuntimeLifecycleSummary) => void;
} {
  let currentRuntimeProviderId: PlatformRuntimeProviderId = "hermes";
  let currentActiveView: PlatformView = options?.activeView ?? "gateway";
  let currentOverview = createOverview(currentActiveView, currentRuntimeProviderId);
  const currentProfiles = options?.profiles ?? [
    {
      name: "ops",
      model: "claude-sonnet",
      provider: "anthropic",
      isDefault: true,
      kanbanBoardSlug: "operations",
      skillCount: 4,
      gatewayRunning: true,
    },
  ];
  const dispatchRunListeners: Array<
    (runtimeProviderId: PlatformRuntimeProviderId) => void
  > = [];
  const hermesLifecycleListeners: Array<
    (summary: HermesRuntimeLifecycleSummary) => void
  > = [];
  let currentSchedules = options?.schedules ?? [
    {
      id: "schedule-1",
      name: "Nightly dispatch",
      cron: "60m",
      prompt: "Review runtime health.",
      profile: "ops",
      kanbanBoardSlug: "operations",
      enabled: true,
      nextRunAt: 1717000000000,
      lastRunAt: null,
    },
  ];
  let currentHermesLifecycle: HermesRuntimeLifecycleSummary = {
    hermesHome: "D:/HermesHome",
    repoPath: "D:/HermesHome/hermes-agent",
    installTargetState: "update",
    homeState: "installed",
    homeStateDetail: "Hermes CLI binaries are installed in this home.",
    overrideActive: false,
    installed: true,
    configured: true,
    hasApiKey: true,
    gatewayPidPresent: true,
    gatewayRunning: true,
    gatewayReady: true,
    gatewayReadyDetail: "Local API server responded on http://127.0.0.1:8642/health.",
    gatewayLogPath: "D:/HermesHome/gateway-stderr.log",
    gatewayLogTail: null,
    activeProfile: "default",
    version: "0.5.0",
    verificationState: "verified",
    verificationDetail: "Hermes CLI responded successfully.",
    lastVerifiedAt: 1717000000000,
    lastDoctorAt: null,
    lastDoctorOutput: null,
    operation: null,
    ...options?.hermesLifecycle,
  };
  let currentBoardSlug =
    options?.boards?.find((board) => board.isCurrent)?.slug ??
    options?.boards?.[0]?.slug ??
    "operations";
  const tasksByBoard: Record<string, KanbanTask[]> = {
    operations: [],
  };
  const currentCodeGraphRepos: CodeGraphRepoSummary[] = [
    {
      id: "repo-1",
      name: "Dispatch repo",
      repoPath: "D:/repo",
      description: "Dispatch context",
      selected: true,
      exists: true,
      initialized: true,
      fileCount: 12,
      nodeCount: 40,
      edgeCount: 18,
      detectedFrameworks: ["react"],
    },
  ];
  const currentCodeGraphQueries: CodeGraphQueryTemplate[] = [
    {
      id: "query-1",
      repoId: "repo-1",
      name: "Lane impact",
      mode: "impact",
      query: "Trace the lane dispatch path.",
    },
    {
      id: "query-2",
      repoId: "repo-1",
      name: "Route summary",
      mode: "context",
      query: "Summarize the route.",
    },
  ];
  const currentHarnesses: EverOsHarness[] = [
    {
      id: "harness-1",
      name: "Ops loop",
      description: "Runtime loop",
      memoryNamespace: "ops",
      profile: "ops",
      scheduleId: null,
      loopPrompt: "Refresh memory.",
      enabled: true,
    },
    {
      id: "harness-2",
      name: "Backlog sync",
      description: "Backlog loop",
      memoryNamespace: "backlog",
      profile: "planner",
      scheduleId: null,
      loopPrompt: "Sync backlog memory.",
      enabled: true,
    },
  ];
  let currentRuns: AgentDispatchRun[] = [];
  let currentBoards = recalculateBoards(
    options?.boards ?? [
      {
        slug: "operations",
        name: "Operations",
        description: null,
        isCurrent: true,
        counts: {},
        total: 0,
      },
    ],
    tasksByBoard,
    currentBoardSlug,
  );

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentActiveView = view;
      currentOverview = createOverview(view, currentRuntimeProviderId);
      return currentOverview;
    }),
    setActiveRuntimeProvider: vi.fn(async (runtimeProviderId: PlatformRuntimeProviderId) => {
      currentRuntimeProviderId = runtimeProviderId;
      currentOverview = createOverview(
        currentActiveView,
        currentRuntimeProviderId,
      );
      return currentOverview;
    }),
    listWorkspaceProfiles: vi.fn(async () => currentProfiles),
    listWorkspaceSchedules: vi.fn(async () => currentSchedules),
    listWorkspaceDispatchRuns: vi.fn(async () => currentRuns),
    getHermesRuntimeLifecycle: vi.fn(async () => currentHermesLifecycle),
    verifyHermesRuntime: vi.fn(async () => currentHermesLifecycle),
    installHermesRuntime: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        homeState: "installed",
        homeStateDetail: "Hermes CLI binaries are installed in this home.",
        installed: true,
        verificationState: "verified",
        verificationDetail: "Hermes CLI responded successfully.",
      };
      return currentHermesLifecycle;
    }),
    repairHermesRuntime: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        homeState: "installed",
        homeStateDetail: "Hermes CLI binaries are installed in this home.",
        installed: true,
        verificationState: "verified",
        verificationDetail: "Hermes CLI responded successfully.",
      };
      return currentHermesLifecycle;
    }),
    openHermesGatewayLog: vi.fn(async () => null),
    updateHermesRuntime: vi.fn(async () => currentHermesLifecycle),
    runHermesDoctor: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        lastDoctorAt: 1717000200000,
        lastDoctorOutput: "Doctor says the local runtime is healthy.",
      };
      return currentHermesLifecycle;
    }),
    startHermesGateway: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        gatewayRunning: true,
        gatewayPidPresent: true,
      };
      return currentHermesLifecycle;
    }),
    stopHermesGateway: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        gatewayRunning: false,
        gatewayPidPresent: false,
      };
      return currentHermesLifecycle;
    }),
    adoptHermesHome: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        overrideActive: true,
        hermesHome: "D:/PortableHermes",
        repoPath: "D:/PortableHermes/hermes-agent",
      };
      return currentHermesLifecycle;
    }),
    resetHermesHomeAdoption: vi.fn(async () => {
      currentHermesLifecycle = {
        ...currentHermesLifecycle,
        overrideActive: false,
        hermesHome: "D:/HermesHome",
        repoPath: "D:/HermesHome/hermes-agent",
      };
      return currentHermesLifecycle;
    }),
    listWorkspaceCodeGraphRepos: vi.fn(async () => currentCodeGraphRepos),
    listWorkspaceCodeGraphQueries: vi.fn(async () => currentCodeGraphQueries),
    listWorkspaceEverOsHarnesses: vi.fn(async () => currentHarnesses),
    listWorkspaceKanbanBoards: vi.fn(async () => currentBoards),
    listWorkspaceKanbanTasks: vi.fn(async (boardSlug?: string | null) => {
      const resolvedBoardSlug = boardSlug ?? currentBoardSlug;
      return tasksByBoard[resolvedBoardSlug] ?? [];
    }),
    setCurrentWorkspaceKanbanBoard: vi.fn(async (boardSlug: string) => {
      currentBoardSlug = boardSlug;
      currentBoards = recalculateBoards(currentBoards, tasksByBoard, currentBoardSlug);
      return currentBoards;
    }),
    dispatchWorkspaceProfile: vi.fn(
      async (
        profileName: string,
        contextOverride?: AgentDispatchContextOverride | null,
      ) => {
      const resolvedBoardSlug = currentProfiles[0]?.kanbanBoardSlug ?? currentBoardSlug;
      const nextTask: KanbanTask = {
        id: `task-${(tasksByBoard[resolvedBoardSlug] ?? []).length + 1}`,
        title: profileName,
        body: "Direct lane dispatch",
        status: "done",
        priority: 2,
        assignee: profileName,
        skills: [],
        createdAt: 1717000000000,
        startedAt: 1717000000000,
        completedAt: 1717000100000,
      };

      tasksByBoard[resolvedBoardSlug] = [
        ...(tasksByBoard[resolvedBoardSlug] ?? []),
        nextTask,
      ];
      const selectedQueries = Array.isArray(contextOverride?.codegraphQueryIds)
        ? currentCodeGraphQueries.filter((query) =>
            contextOverride.codegraphQueryIds!.includes(query.id),
          )
        : currentCodeGraphQueries;
      const selectedHarnesses = Array.isArray(contextOverride?.everosHarnessIds)
        ? currentHarnesses.filter((harness) =>
            contextOverride.everosHarnessIds!.includes(harness.id),
          )
        : [currentHarnesses[0]];
      currentRuns = [
        {
          id: "dispatch-profile-1",
          source: "manual",
          targetType: "profile",
          targetId: null,
          targetName: profileName,
          taskId: nextTask.id,
          taskStatus: "done",
          status: "done",
          createdAt: 1717000000000,
          startedAt: 1717000000000,
          completedAt: 1717000100000,
          output: "Completed profile dispatch",
          error: null,
          sessionId: "session-1",
          context: {
            profile: profileName,
            prompt: `Direct lane dispatch for profile ${profileName}.`,
            kanbanBoardSlug: resolvedBoardSlug,
            selection: contextOverride ?? null,
            codegraph: {
              repoId: "repo-1",
              repoName: "Dispatch repo",
              repoPath: "D:/repo",
              entrypoints: [],
              queries: selectedQueries,
            },
            everosHarnesses: selectedHarnesses,
          },
        },
        ...currentRuns,
      ];
      currentBoards = recalculateBoards(currentBoards, tasksByBoard, currentBoardSlug);
      return currentRuns[0];
    }),
    triggerWorkspaceSchedule: vi.fn(
      async (
        id: string,
        contextOverride?: AgentDispatchContextOverride | null,
      ) => {
      const now = 1717003600000;
      const schedule = currentSchedules.find((candidate) => candidate.id === id) ?? null;

      currentSchedules = currentSchedules.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              lastRunAt: now,
              nextRunAt: now + 3600000,
            }
          : candidate,
      );

      if (schedule?.kanbanBoardSlug) {
        tasksByBoard[schedule.kanbanBoardSlug] = [
          ...(tasksByBoard[schedule.kanbanBoardSlug] ?? []),
          {
            id: `task-${(tasksByBoard[schedule.kanbanBoardSlug] ?? []).length + 1}`,
            title: schedule.name,
            body: schedule.prompt,
            status: "done",
            priority: 2,
            assignee: schedule.profile,
            skills: [],
            createdAt: now,
            startedAt: now,
            completedAt: now + 1000,
          },
        ];
        currentRuns = [
          {
            id: "dispatch-schedule-1",
            source: "schedule",
            targetType: "schedule",
            targetId: schedule.id,
            targetName: schedule.name,
            taskId: tasksByBoard[schedule.kanbanBoardSlug][0]?.id ?? null,
            taskStatus: "done",
            status: "done",
            createdAt: now,
            startedAt: now,
            completedAt: now + 1000,
            output: schedule.prompt,
            error: null,
            sessionId: "session-2",
            context: {
              profile: schedule.profile,
              prompt: schedule.prompt,
              kanbanBoardSlug: schedule.kanbanBoardSlug,
              selection: contextOverride ?? null,
              codegraph: {
                repoId: "repo-1",
                repoName: "Dispatch repo",
                repoPath: "D:/repo",
                entrypoints: [],
                queries: [],
              },
              everosHarnesses: [],
            },
          },
          ...currentRuns,
        ];
      }

      currentBoards = recalculateBoards(currentBoards, tasksByBoard, currentBoardSlug);
      return currentSchedules;
    }),
    subscribeWorkspaceDispatchRuns: vi.fn(
      (listener: (runtimeProviderId: PlatformRuntimeProviderId) => void) => {
        dispatchRunListeners.push(listener);

        return () => {
          const index = dispatchRunListeners.indexOf(listener);
          if (index >= 0) {
            dispatchRunListeners.splice(index, 1);
          }
        };
      },
    ),
    subscribeHermesRuntimeLifecycle: vi.fn(
      (listener: (summary: HermesRuntimeLifecycleSummary) => void) => {
        hermesLifecycleListeners.push(listener);

        return () => {
          const index = hermesLifecycleListeners.indexOf(listener);
          if (index >= 0) {
            hermesLifecycleListeners.splice(index, 1);
          }
        };
      },
    ),
    emitDispatchRunsUpdated: (
      runs: AgentDispatchRun[],
      runtimeProviderId: PlatformRuntimeProviderId = "hermes",
    ) => {
      currentRuns = runs;
      dispatchRunListeners.forEach((listener) => listener(runtimeProviderId));
    },
    emitHermesLifecycleUpdated: (summary?: HermesRuntimeLifecycleSummary) => {
      if (summary) {
        currentHermesLifecycle = summary;
      }
      hermesLifecycleListeners.forEach((listener) => listener(currentHermesLifecycle));
    },
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    setActiveRuntimeProvider: ReturnType<typeof vi.fn>;
    listWorkspaceProfiles: ReturnType<typeof vi.fn>;
    listWorkspaceSchedules: ReturnType<typeof vi.fn>;
    listWorkspaceDispatchRuns: ReturnType<typeof vi.fn>;
    getHermesRuntimeLifecycle: ReturnType<typeof vi.fn>;
    verifyHermesRuntime: ReturnType<typeof vi.fn>;
    installHermesRuntime: ReturnType<typeof vi.fn>;
    repairHermesRuntime: ReturnType<typeof vi.fn>;
    updateHermesRuntime: ReturnType<typeof vi.fn>;
    openHermesGatewayLog: ReturnType<typeof vi.fn>;
    runHermesDoctor: ReturnType<typeof vi.fn>;
    startHermesGateway: ReturnType<typeof vi.fn>;
    stopHermesGateway: ReturnType<typeof vi.fn>;
    adoptHermesHome: ReturnType<typeof vi.fn>;
    resetHermesHomeAdoption: ReturnType<typeof vi.fn>;
    subscribeHermesRuntimeLifecycle: ReturnType<typeof vi.fn>;
    listWorkspaceCodeGraphRepos: ReturnType<typeof vi.fn>;
    listWorkspaceCodeGraphQueries: ReturnType<typeof vi.fn>;
    listWorkspaceEverOsHarnesses: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanTasks: ReturnType<typeof vi.fn>;
    setCurrentWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
    dispatchWorkspaceProfile: ReturnType<typeof vi.fn>;
    triggerWorkspaceSchedule: ReturnType<typeof vi.fn>;
    subscribeWorkspaceDispatchRuns: ReturnType<typeof vi.fn>;
    emitDispatchRunsUpdated: (
      runs: AgentDispatchRun[],
      runtimeProviderId?: PlatformRuntimeProviderId,
    ) => void;
    emitHermesLifecycleUpdated: (summary?: HermesRuntimeLifecycleSummary) => void;
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

describe("App gateway runtime dispatch", () => {
  it("shows Hermes lifecycle controls and keeps them off non-Hermes lanes", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByText("Hermes local runtime")).toBeTruthy();
    await waitFor(() => {
      expect(platformAPI.getHermesRuntimeLifecycle).toHaveBeenCalled();
    });
    expect(await screen.findByText("0.5.0")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Verify local runtime" }));

    await waitFor(() => {
      expect(platformAPI.verifyHermesRuntime).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("button", { name: "Run doctor" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop local gateway" })).toBeTruthy();

    const ironclawCard = screen
      .getAllByText("IronClaw")
      .map((node) => node.closest("article"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);
    expect(ironclawCard).toBeTruthy();

    fireEvent.click(
      ironclawCard!.querySelector("button") as HTMLButtonElement,
    );

    await waitFor(() => {
      expect(platformAPI.setActiveRuntimeProvider).toHaveBeenCalledWith("ironclaw");
    });

    await waitFor(() => {
      expect(screen.queryByText("Hermes local runtime")).toBeNull();
    });
  });

  it("renders live Hermes lifecycle progress and doctor output updates", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByText("Hermes local runtime")).toBeTruthy();

    platformAPI.emitHermesLifecycleUpdated({
      hermesHome: "D:/HermesHome",
      repoPath: "D:/HermesHome/hermes-agent",
      installTargetState: "update",
      homeState: "installed",
      homeStateDetail: "Hermes CLI binaries are installed in this home.",
      overrideActive: false,
      installed: true,
      configured: true,
      hasApiKey: true,
      gatewayPidPresent: false,
      gatewayRunning: false,
      gatewayReady: false,
      gatewayReadyDetail:
        "Local API server is not reachable on http://127.0.0.1:8642/health yet.",
      gatewayLogPath: "D:/HermesHome/gateway-stderr.log",
      gatewayLogTail: "Gateway is still starting.",
      activeProfile: "default",
      version: "0.5.0",
      verificationState: "verified",
      verificationDetail: "Hermes CLI responded successfully.",
      lastVerifiedAt: 1717000000000,
      lastDoctorAt: 1717000200000,
      lastDoctorOutput: "Doctor says the local runtime is healthy.",
      operation: {
        kind: "update",
        status: "running",
        startedAt: 1717000100000,
        completedAt: null,
        step: 1,
        totalSteps: 2,
        title: "Updating Hermes Agent",
        detail: "Pulling the latest Hermes checkout.",
        log: "Running hermes update...\nPulling the latest Hermes checkout.\n",
        rollbackHint:
          "Rollback checkpoint: if verification fails after the update, rerun local install to rebuild the checkout or adopt a known-good Hermes home.",
        checkpoints: [
          { id: "update-1", label: "Updating Hermes Agent", state: "active" },
          { id: "update-2", label: "Verifying local runtime", state: "pending" },
        ],
      },
    });

    expect(await screen.findByText("Lifecycle progress")).toBeTruthy();
    expect(screen.getByText("Step 1/2")).toBeTruthy();
    expect(screen.getByText("Updating Hermes Agent")).toBeTruthy();
    expect(screen.getByText("Doctor output")).toBeTruthy();
    expect(screen.getByText("Doctor says the local runtime is healthy.")).toBeTruthy();
    expect(screen.getByText("Gateway stderr tail")).toBeTruthy();
    expect(screen.getByText("Gateway is still starting.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start local gateway" })).toBeTruthy();
  });

  it("shows a Hermes ready notice when the local gateway becomes healthy", async () => {
    const platformAPI = installPlatformApi({
      hermesLifecycle: {
        gatewayRunning: true,
        gatewayReady: false,
        gatewayReadyDetail: "Local gateway is still booting.",
      },
    });

    renderApp();

    expect(await screen.findByText("Hermes local runtime")).toBeTruthy();

    platformAPI.emitHermesLifecycleUpdated({
      hermesHome: "D:/HermesHome",
      repoPath: "D:/HermesHome/hermes-agent",
      installTargetState: "update",
      homeState: "installed",
      homeStateDetail: "Hermes CLI binaries are installed in this home.",
      overrideActive: false,
      installed: true,
      configured: true,
      hasApiKey: true,
      gatewayPidPresent: true,
      gatewayRunning: true,
      gatewayReady: true,
      gatewayReadyDetail: "Local API server responded on http://127.0.0.1:8642/health.",
      gatewayLogPath: "D:/HermesHome/gateway-stderr.log",
      gatewayLogTail: null,
      activeProfile: "default",
      version: "0.5.0",
      verificationState: "verified",
      verificationDetail: "Hermes CLI responded successfully.",
      lastVerifiedAt: 1717000000000,
      lastDoctorAt: null,
      lastDoctorOutput: null,
      operation: null,
    });

    expect(await screen.findByText("Local gateway healthy")).toBeTruthy();
    expect(
      screen.getAllByText("Local API server responded on http://127.0.0.1:8642/health.").length,
    ).toBeGreaterThan(0);
  });

  it("prioritizes Hermes local repair in the console intake flow", async () => {
    const platformAPI = installPlatformApi({
      activeView: "console",
      hermesLifecycle: {
        installTargetState: "update",
        homeState: "partial",
        homeStateDetail:
          "Hermes repo checkout found, but the local venv and CLI binaries are missing. Use Repair Hermes locally to complete the install.",
        installed: false,
        gatewayPidPresent: false,
        gatewayRunning: false,
        gatewayReady: false,
        gatewayReadyDetail: "Local gateway is not running.",
        verificationState: "failed",
        verificationDetail:
          "Hermes repo checkout found, but the local venv and CLI binaries are missing. Use Repair Hermes locally to complete the install.",
      },
    });

    renderApp();

    expect(await screen.findByText("Start with Hermes local runtime")).toBeTruthy();
    expect(screen.getByText("Hermes local runtime")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Repair Hermes locally" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Repair Hermes locally" }));

    await waitFor(() => {
      expect(platformAPI.repairHermesRuntime).toHaveBeenCalledTimes(1);
    });
  });

  it("opens the Hermes gateway stderr log from the console intake card", async () => {
    const platformAPI = installPlatformApi({ activeView: "console" });

    renderApp();

    const openLogButton = await screen.findByRole("button", {
      name: "Open gateway stderr log",
    });

    fireEvent.click(openLogButton);

    await waitFor(() => {
      expect(platformAPI.openHermesGatewayLog).toHaveBeenCalledTimes(1);
    });
  });

  it("dispatches the selected runtime profile straight to its linked board", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Dispatch profile") as HTMLSelectElement).value).toBe("ops");
    });

    const querySelect = screen.getByLabelText("CodeGraph queries") as HTMLSelectElement;
    for (const option of Array.from(querySelect.options)) {
      option.selected = option.value === "query-2";
    }
    fireEvent.change(querySelect);

    const harnessSelect = screen.getByLabelText("EverOS harnesses") as HTMLSelectElement;
    for (const option of Array.from(harnessSelect.options)) {
      option.selected = option.value === "harness-2";
    }
    fireEvent.change(harnessSelect);

    fireEvent.click(screen.getByRole("button", { name: "Dispatch profile to board" }));

    await waitFor(() => {
      expect(platformAPI.dispatchWorkspaceProfile).toHaveBeenCalledWith("ops", {
        codegraphRepoId: "repo-1",
        codegraphQueryIds: ["query-2"],
        everosHarnessIds: ["harness-2"],
      });
    });

    expect(platformAPI.setCurrentWorkspaceKanbanBoard).toHaveBeenCalledWith("operations");
    expect(await screen.findByText("Dispatch repo · Backlog sync")).toBeTruthy();
  });

  it("runs the selected runtime schedule straight to its linked board", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    await waitFor(() => {
      expect((screen.getByLabelText("Dispatch schedule") as HTMLSelectElement).value).toBe("schedule-1");
    });

    fireEvent.click(screen.getByRole("button", { name: "Run schedule to board" }));

    await waitFor(() => {
      expect(platformAPI.triggerWorkspaceSchedule).toHaveBeenCalledWith(
        "schedule-1",
        expect.objectContaining({
          codegraphRepoId: "repo-1",
          codegraphQueryIds: ["query-1", "query-2"],
          everosHarnessIds: ["harness-1"],
        }),
      );
    });

    expect(platformAPI.setCurrentWorkspaceKanbanBoard).toHaveBeenCalledWith("operations");
  });

  it("refreshes the recent dispatch ledger when the scheduler pushes an update", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("No dispatch runs recorded for this runtime lane yet.")).toBeTruthy();
    });

    platformAPI.emitDispatchRunsUpdated([
      {
        id: "dispatch-scheduler-1",
        source: "scheduler",
        targetType: "schedule",
        targetId: "schedule-1",
        targetName: "Nightly dispatch",
        taskId: "task-9",
        taskStatus: "done",
        status: "done",
        createdAt: 1717007200000,
        startedAt: 1717007200000,
        completedAt: 1717007300000,
        output: "Scheduler refresh response",
        error: null,
        sessionId: "session-99",
        context: {
          profile: "ops",
          prompt: "Review runtime health.",
          kanbanBoardSlug: "operations",
          selection: {
            codegraphRepoId: "repo-1",
            codegraphQueryIds: ["query-1"],
            everosHarnessIds: ["harness-1"],
          },
          codegraph: {
            repoId: "repo-1",
            repoName: "Dispatch repo",
            repoPath: "D:/repo",
            entrypoints: [],
            queries: [
              {
                id: "query-1",
                repoId: "repo-1",
                name: "Lane impact",
                mode: "impact",
                query: "Trace the lane dispatch path.",
              },
            ],
          },
          everosHarnesses: [
            {
              id: "harness-1",
              name: "Ops loop",
              description: "Runtime loop",
              memoryNamespace: "ops",
              profile: "ops",
              scheduleId: null,
              loopPrompt: "Refresh memory.",
              enabled: true,
            },
          ],
        },
      },
    ]);

    expect(await screen.findByText("Scheduler refresh response")).toBeTruthy();
  });
});