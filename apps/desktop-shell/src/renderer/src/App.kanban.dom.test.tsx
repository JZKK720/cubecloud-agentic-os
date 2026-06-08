// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  KanbanBoard,
  KanbanTask,
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

function sanitizeBoardSlug(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "board"
  );
}

function resolveUniqueBoardSlug(
  boards: KanbanBoard[],
  baseSlug: string,
  existingSlug?: string,
): string {
  let nextSlug = baseSlug;
  let suffix = 2;

  while (boards.some((board) => board.slug === nextSlug && board.slug !== existingSlug)) {
    nextSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return nextSlug;
}

function installPlatformApi(options?: {
  boards?: KanbanBoard[];
  tasksByBoard?: Record<string, KanbanTask[]>;
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
  saveWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
  removeWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanTasks: ReturnType<typeof vi.fn>;
  setCurrentWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
  saveWorkspaceKanbanTask: ReturnType<typeof vi.fn>;
  removeWorkspaceKanbanTask: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview("kanban");
  let currentBoardSlug =
    options?.boards?.find((board) => board.isCurrent)?.slug ??
    options?.boards?.[0]?.slug ??
    "operations";
  let boardsState = recalculateBoards(
    options?.boards ?? [
      {
        slug: "operations",
        name: "Operations",
        description: "Unified Cubecloud control board for this runtime lane.",
        isCurrent: true,
        counts: { queued: 1 },
        total: 1,
      },
    ],
    options?.tasksByBoard ?? {
      operations: [
        {
          id: "task-1",
          title: "Fix gateway alerts",
          body: "Validate the gateway smoke probe failures before the next deploy.",
          status: "queued",
          priority: 2,
          assignee: "ops",
          skills: ["release-audit"],
          createdAt: 1717000000000,
          startedAt: null,
          completedAt: null,
        },
      ],
    },
    currentBoardSlug,
  );
  let tasksByBoard = Object.fromEntries(
    Object.entries(options?.tasksByBoard ?? {
      operations: [
        {
          id: "task-1",
          title: "Fix gateway alerts",
          body: "Validate the gateway smoke probe failures before the next deploy.",
          status: "queued",
          priority: 2,
          assignee: "ops",
          skills: ["release-audit"],
          createdAt: 1717000000000,
          startedAt: null,
          completedAt: null,
        },
      ],
    }).map(([slug, tasks]) => [slug, [...tasks]]),
  ) as Record<string, KanbanTask[]>;

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listWorkspaceKanbanBoards: vi.fn(async () => boardsState),
    saveWorkspaceKanbanBoard: vi.fn(async (input: {
      name: string;
      description: string;
      existingSlug?: string;
    }) => {
      const existingBoard = input.existingSlug
        ? boardsState.find((board) => board.slug === input.existingSlug) ?? null
        : null;
      const slug = resolveUniqueBoardSlug(
        boardsState,
        sanitizeBoardSlug(input.name),
        existingBoard?.slug,
      );
      const nextBoard: KanbanBoard = {
        slug,
        name: input.name.trim() || "Board",
        description: input.description.trim() || null,
        isCurrent: existingBoard?.isCurrent ?? true,
        counts: {},
        total: 0,
      };

      if (existingBoard) {
        boardsState = boardsState.map((board) =>
          board.slug === existingBoard.slug ? nextBoard : board,
        );

        if (existingBoard.slug !== slug) {
          tasksByBoard = {
            ...tasksByBoard,
            [slug]: tasksByBoard[existingBoard.slug] ?? [],
          };
          delete tasksByBoard[existingBoard.slug];
        }

        if (currentBoardSlug === existingBoard.slug) {
          currentBoardSlug = slug;
        }
      } else {
        boardsState = [
          nextBoard,
          ...boardsState.map((board) => ({
            ...board,
            isCurrent: false,
          })),
        ];
        tasksByBoard = {
          ...tasksByBoard,
          [slug]: [],
        };
        currentBoardSlug = slug;
      }

      boardsState = recalculateBoards(boardsState, tasksByBoard, currentBoardSlug);
      return boardsState;
    }),
    removeWorkspaceKanbanBoard: vi.fn(async (slug: string) => {
      if (boardsState.length <= 1) {
        return boardsState;
      }

      boardsState = boardsState.filter((board) => board.slug !== slug);
      delete tasksByBoard[slug];
      if (currentBoardSlug === slug) {
        currentBoardSlug = boardsState[0]?.slug ?? currentBoardSlug;
      }
      boardsState = recalculateBoards(boardsState, tasksByBoard, currentBoardSlug);
      return boardsState;
    }),
    listWorkspaceKanbanTasks: vi.fn(async (boardSlug?: string) => {
      const resolvedBoardSlug = boardSlug ?? currentBoardSlug;
      return tasksByBoard[resolvedBoardSlug] ?? [];
    }),
    setCurrentWorkspaceKanbanBoard: vi.fn(async (boardSlug: string) => {
      currentBoardSlug = boardSlug;
      boardsState = recalculateBoards(boardsState, tasksByBoard, currentBoardSlug);
      return boardsState;
    }),
    saveWorkspaceKanbanTask: vi.fn(async (input: {
      id?: string;
      boardSlug?: string;
      title: string;
      body: string;
      status: string;
      priority: number;
      assignee: string;
      skills: string[];
    }) => {
      const resolvedBoardSlug = input.boardSlug ?? currentBoardSlug;
      const currentTasks = tasksByBoard[resolvedBoardSlug] ?? [];
      const existingTask = input.id
        ? currentTasks.find((task) => task.id === input.id) ?? null
        : null;
      const nextTask: KanbanTask = {
        id: input.id ?? `task-${currentTasks.length + 1}`,
        title: input.title,
        body: input.body || null,
        status: input.status,
        priority: input.priority,
        assignee: input.assignee || null,
        skills: input.skills,
        createdAt: existingTask?.createdAt ?? 1717007200000,
        startedAt:
          input.status === "active" || input.status === "done" || input.status === "failed"
            ? existingTask?.startedAt ?? 1717007201000
            : null,
        completedAt:
          input.status === "done" || input.status === "failed"
            ? existingTask?.completedAt ?? 1717007202000
            : null,
      };

      tasksByBoard = {
        ...tasksByBoard,
        [resolvedBoardSlug]: existingTask
          ? currentTasks.map((task) => (task.id === existingTask.id ? nextTask : task))
          : [nextTask, ...currentTasks],
      };
      boardsState = recalculateBoards(boardsState, tasksByBoard, currentBoardSlug);
      return tasksByBoard[resolvedBoardSlug];
    }),
    removeWorkspaceKanbanTask: vi.fn(async (id: string, boardSlug?: string) => {
      const resolvedBoardSlug = boardSlug ?? currentBoardSlug;
      tasksByBoard = {
        ...tasksByBoard,
        [resolvedBoardSlug]: (tasksByBoard[resolvedBoardSlug] ?? []).filter(
          (task) => task.id !== id,
        ),
      };
      boardsState = recalculateBoards(boardsState, tasksByBoard, currentBoardSlug);
      return tasksByBoard[resolvedBoardSlug];
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
    saveWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
    removeWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanTasks: ReturnType<typeof vi.fn>;
    setCurrentWorkspaceKanbanBoard: ReturnType<typeof vi.fn>;
    saveWorkspaceKanbanTask: ReturnType<typeof vi.fn>;
    removeWorkspaceKanbanTask: ReturnType<typeof vi.fn>;
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

describe("App kanban editor", () => {
  it("creates, renames, and removes boards from the shell-owned registry", async () => {
    const platformAPI = installPlatformApi({
      boards: [
        {
          slug: "operations",
          name: "Operations",
          description: "Unified Cubecloud control board for this runtime lane.",
          isCurrent: true,
          counts: { queued: 1 },
          total: 1,
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("button", { name: "Operations" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New board" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Research" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Track investigation work for runtime issues." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save new board" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceKanbanBoard).toHaveBeenCalledWith({
        name: "Research",
        description: "Track investigation work for runtime issues.",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Research" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Research Board" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update selected board" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceKanbanBoard).toHaveBeenLastCalledWith({
        existingSlug: "research",
        name: "Research Board",
        description: "Track investigation work for runtime issues.",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Research Board" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete selected board" }));

    await waitFor(() => {
      expect(platformAPI.removeWorkspaceKanbanBoard).toHaveBeenCalledWith("research-board");
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Research Board" })).toBeNull();
    });
  });

  it("keeps task drafts separate from the selected saved task", async () => {
    installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Fix gateway alerts" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create task" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Title") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("queued");
    expect((screen.getByLabelText("Priority") as HTMLSelectElement).value).toBe("2");
  });

  it("switches boards and creates, updates, and removes tasks", async () => {
    const platformAPI = installPlatformApi({
      boards: [
        {
          slug: "operations",
          name: "Operations",
          description: "Unified Cubecloud control board for this runtime lane.",
          isCurrent: true,
          counts: { queued: 1 },
          total: 1,
        },
        {
          slug: "backlog",
          name: "Backlog",
          description: "Deferred operator work.",
          isCurrent: false,
          counts: { queued: 1 },
          total: 1,
        },
      ],
      tasksByBoard: {
        operations: [
          {
            id: "ops-1",
            title: "Fix gateway alerts",
            body: "Validate the gateway smoke probe failures before the next deploy.",
            status: "queued",
            priority: 2,
            assignee: "ops",
            skills: ["release-audit"],
            createdAt: 1717000000000,
            startedAt: null,
            completedAt: null,
          },
        ],
        backlog: [
          {
            id: "backlog-1",
            title: "Seed backlog item",
            body: "Capture the deferred rollout audit work.",
            status: "queued",
            priority: 3,
            assignee: null,
            skills: ["incident-review"],
            createdAt: 1717003600000,
            startedAt: null,
            completedAt: null,
          },
        ],
      },
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "Fix gateway alerts" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Backlog" }));

    await waitFor(() => {
      expect(platformAPI.setCurrentWorkspaceKanbanBoard).toHaveBeenCalledWith("backlog");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Seed backlog item" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Ship release train" },
    });
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "Coordinate the final release checks across gateway and providers." },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "active" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Assignee"), {
      target: { value: "release-ops" },
    });
    fireEvent.change(screen.getByLabelText("Skills"), {
      target: { value: "release-audit, provider-sync" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save new" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceKanbanTask).toHaveBeenCalledWith({
        boardSlug: "backlog",
        title: "Ship release train",
        body: "Coordinate the final release checks across gateway and providers.",
        status: "active",
        priority: 1,
        assignee: "release-ops",
        skills: ["release-audit", "provider-sync"],
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ship release train" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "done" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update selected" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceKanbanTask).toHaveBeenCalledTimes(2);
    });

    const updatePayload = platformAPI.saveWorkspaceKanbanTask.mock.calls[1][0] as {
      id: string;
      boardSlug: string;
      status: string;
      title: string;
    };

    expect(updatePayload.id).toBe("task-2");
    expect(updatePayload.boardSlug).toBe("backlog");
    expect(updatePayload.status).toBe("done");
    expect(updatePayload.title).toBe("Ship release train");

    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    await waitFor(() => {
      expect(platformAPI.removeWorkspaceKanbanTask).toHaveBeenCalledWith("task-2", "backlog");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Seed backlog item" })).toBeTruthy();
    });
  });
});
