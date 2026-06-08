// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  AgentProfile,
  AgentMemoryEntry,
  AgentSchedule,
  AgentSkill,
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

function installPlatformApi(options: {
  activeView: PlatformView;
  skills?: AgentSkill[];
  memory?: AgentMemoryEntry[];
  schedules?: AgentSchedule[];
  profiles?: AgentProfile[];
  boards?: KanbanBoard[];
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listWorkspaceSkills: ReturnType<typeof vi.fn>;
  listWorkspaceMemory: ReturnType<typeof vi.fn>;
  listWorkspaceSchedules: ReturnType<typeof vi.fn>;
  listWorkspaceProfiles: ReturnType<typeof vi.fn>;
  listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview(options.activeView);
  const currentProfiles = options.profiles ?? [
    {
      name: "default",
      model: "claude-sonnet",
      provider: "anthropic",
      isDefault: true,
      kanbanBoardSlug: "operations",
      skillCount: 0,
      gatewayRunning: true,
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
    listWorkspaceSkills: vi.fn(async () => options.skills ?? []),
    listWorkspaceMemory: vi.fn(async () => options.memory ?? []),
    listWorkspaceSchedules: vi.fn(async () => options.schedules ?? []),
    listWorkspaceProfiles: vi.fn(async () => currentProfiles),
    listWorkspaceKanbanBoards: vi.fn(async () => currentBoards),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listWorkspaceSkills: ReturnType<typeof vi.fn>;
    listWorkspaceMemory: ReturnType<typeof vi.fn>;
    listWorkspaceSchedules: ReturnType<typeof vi.fn>;
    listWorkspaceProfiles: ReturnType<typeof vi.fn>;
    listWorkspaceKanbanBoards: ReturnType<typeof vi.fn>;
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

describe("App registry draft editors", () => {
  it("keeps skills in draft mode when New draft is used with saved skills present", async () => {
    installPlatformApi({
      activeView: "skills",
      skills: [
        {
          name: "incident-review",
          category: "workspace",
          description: "Review incidents and summarize follow-up actions.",
          path: "skills/incident-review/SKILL.md",
        },
        {
          name: "release-audit",
          category: "ops",
          description: "Audit release readiness before rollout.",
          path: "skills/release-audit/SKILL.md",
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "incident-review" })).toBeTruthy();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("incident-review");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create skill" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Category") as HTMLInputElement).value).toBe("workspace");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps memory in draft mode when New draft is used with saved entries present", async () => {
    installPlatformApi({
      activeView: "memory",
      memory: [
        {
          id: "memory-1",
          label: "Deployment preferences",
          content: "Prefer staged rollouts with health checks first.",
          createdAt: 1717000000000,
        },
        {
          id: "memory-2",
          label: "On-call notes",
          content: "Escalate runtime probe failures after two retries.",
          createdAt: 1717003600000,
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "Deployment preferences" })).toBeTruthy();

    await waitFor(() => {
      expect((screen.getByLabelText("Label") as HTMLInputElement).value).toBe("Deployment preferences");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create memory entry" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Label") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Content") as HTMLTextAreaElement).value).toBe("");
  });

  it("keeps schedules in draft mode when New draft is used with saved jobs present", async () => {
    installPlatformApi({
      activeView: "schedules",
      schedules: [
        {
          id: "schedule-1",
          name: "Nightly health check",
          cron: "0 2 * * *",
          prompt: "Check runtime health and summarize issues.",
          profile: "default",
          kanbanBoardSlug: "operations",
          enabled: true,
          lastRunAt: 1716990000000,
          nextRunAt: 1717076400000,
        },
        {
          id: "schedule-2",
          name: "Weekly report",
          cron: "0 9 * * 1",
          prompt: "Summarize the weekly delivery status.",
          profile: "ops",
          kanbanBoardSlug: null,
          enabled: false,
          lastRunAt: 1716900000000,
          nextRunAt: 1717501200000,
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "Nightly health check" })).toBeTruthy();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Nightly health check");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create schedule" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Cron") as HTMLInputElement).value).toBe("60m");
    expect((screen.getByLabelText("Profile") as HTMLSelectElement).value).toBe("default");
    expect((screen.getByLabelText("Kanban board") as HTMLSelectElement).value).toBe("operations");
    expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe("");
  });
});