import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentChatMessage } from "@cubecloud/platform-core";

let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name !== "userData") {
        throw new Error(`Unexpected path lookup: ${name}`);
      }

      return userDataDir;
    },
  },
}));

function toSessionHistory(messages: AgentChatMessage[]) {
  return messages.reduce<Array<{ kind: "user" | "assistant"; id: number; content: string; timestamp: number }>>((history, message, index) => {
    if (message.role === "user") {
      history.push({ kind: "user", id: index + 1, content: message.content, timestamp: message.timestamp });
    }

    if (message.role === "assistant") {
      history.push({
        kind: "assistant",
        id: index + 1,
        content: message.content,
        timestamp: message.timestamp,
      });
    }

    return history;
  }, []);
}

describe("agentControlPlane", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "cubecloud-control-plane-"));
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  it("keeps models isolated by runtime provider", async () => {
    const controlPlane = await import("./agentControlPlane");

    controlPlane.saveControlPlaneModel(
      {
        name: "Hermes model",
        provider: "anthropic",
        model: "claude-sonnet",
        baseUrl: "https://example.invalid/hermes",
      },
      "hermes",
    );
    controlPlane.saveControlPlaneModel(
      {
        name: "IronClaw model",
        provider: "openai",
        model: "gpt-4.1",
        baseUrl: "https://example.invalid/ironclaw",
      },
      "ironclaw",
    );

    expect(controlPlane.listControlPlaneModels("hermes")).toEqual([
      expect.objectContaining({ name: "Hermes model" }),
    ]);
    expect(controlPlane.listControlPlaneModels("ironclaw")).toEqual([
      expect.objectContaining({ name: "IronClaw model" }),
    ]);
  });

  it("persists shell-owned sessions for the selected runtime provider", async () => {
    const controlPlane = await import("./agentControlPlane");
    const messages: AgentChatMessage[] = [
      { id: "u1", role: "user", content: "Need a unified shell session.", timestamp: 1 },
      { id: "a1", role: "assistant", content: "Persisting the control-plane transcript.", timestamp: 2 },
    ];

    const saved = controlPlane.saveControlPlaneSessionSnapshot(
      {
        model: "claude-sonnet",
        history: toSessionHistory(messages),
        source: "cubecloud",
      },
      "openclaw",
    );

    expect(saved.sessions).toEqual([
      expect.objectContaining({
        id: saved.sessionId,
        source: "cubecloud",
        title: "Need a unified shell session.",
      }),
    ]);
    expect(
      controlPlane.getControlPlaneSessionHistory(saved.sessionId, "openclaw"),
    ).toEqual(toSessionHistory(messages));
    expect(controlPlane.listControlPlaneSessions("hermes")).toEqual([]);
  });

  it("derives a default profile from the provider-scoped control plane", async () => {
    const controlPlane = await import("./agentControlPlane");

    controlPlane.saveControlPlaneModel(
      {
        name: "OpenClaw model",
        provider: "openai",
        model: "gpt-4.1-mini",
        baseUrl: "https://example.invalid/openclaw",
      },
      "openclaw",
    );

    expect(controlPlane.listControlPlaneProfiles("openclaw", true)).toEqual([
      expect.objectContaining({
        name: "Openclaw operator",
        model: "gpt-4.1-mini",
        gatewayRunning: true,
      }),
    ]);
  });

  it("keeps one default profile when profiles are saved and removed", async () => {
    const controlPlane = await import("./agentControlPlane");

    controlPlane.saveControlPlaneProfile(
      {
        name: "Release review",
        model: "gpt-4.1-mini",
        provider: "openai",
        isDefault: false,
      },
      "openclaw",
    );
    controlPlane.saveControlPlaneProfile(
      {
        name: "Incident command",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
      },
      "openclaw",
    );

    expect(controlPlane.listControlPlaneProfiles("openclaw", false)).toEqual([
      expect.objectContaining({
        name: "Incident command",
        isDefault: true,
      }),
      expect.objectContaining({
        name: "Release review",
        isDefault: false,
      }),
    ]);

    expect(
      controlPlane.removeControlPlaneProfile("Incident command", "openclaw"),
    ).toEqual([
      expect.objectContaining({
        name: "Release review",
        isDefault: true,
      }),
    ]);
  });

  it("persists current Kanban board selection and task lifecycle mutations", async () => {
    const controlPlane = await import("./agentControlPlane");
    const providerDir = join(userDataDir, "agent-workspace", "providers", "hermes");

    mkdirSync(providerDir, { recursive: true });
    writeFileSync(
      join(providerDir, "kanban.json"),
      JSON.stringify({
        boards: [
          {
            slug: "operations",
            name: "Operations",
            description: "Unified control board",
            isCurrent: true,
          },
          {
            slug: "backlog",
            name: "Backlog",
            description: "Deferred runtime work",
            isCurrent: false,
          },
        ],
        tasks: {
          operations: [],
          backlog: [],
        },
      }),
      "utf-8",
    );

    expect(
      controlPlane.setCurrentControlPlaneKanbanBoard("backlog", "hermes"),
    ).toEqual([
      expect.objectContaining({ slug: "operations", isCurrent: false }),
      expect.objectContaining({ slug: "backlog", isCurrent: true }),
    ]);

    const created = controlPlane.saveControlPlaneKanbanTask(
      {
        boardSlug: "backlog",
        title: "Triage gateway handoff",
        body: "  Review runtime handoff state before release.  ",
        status: "active",
        priority: 4,
        assignee: " ops ",
        skills: ["release-audit", "", "release-audit"],
      },
      "hermes",
    );

    expect(created[0]).toEqual(
      expect.objectContaining({
        title: "Triage gateway handoff",
        body: "Review runtime handoff state before release.",
        status: "active",
        priority: 3,
        assignee: "ops",
        skills: ["release-audit"],
        startedAt: expect.any(Number),
        completedAt: null,
      }),
    );

    const updated = controlPlane.saveControlPlaneKanbanTask(
      {
        id: created[0].id,
        boardSlug: "backlog",
        title: "Triage gateway handoff",
        body: "Review runtime handoff state before release.",
        status: "done",
        priority: 2,
        assignee: "ops",
        skills: ["release-audit", "provider-sync"],
      },
      "hermes",
    );

    expect(updated[0]).toEqual(
      expect.objectContaining({
        id: created[0].id,
        status: "done",
        priority: 2,
        skills: ["release-audit", "provider-sync"],
        startedAt: expect.any(Number),
        completedAt: expect.any(Number),
      }),
    );

    expect(
      controlPlane.removeControlPlaneKanbanTask(created[0].id, "backlog", "hermes"),
    ).toEqual([]);
    expect(controlPlane.listControlPlaneKanbanTasks(undefined, "hermes")).toEqual([]);
  });

  it("creates, renames, and removes Kanban boards while preserving board task state", async () => {
    const controlPlane = await import("./agentControlPlane");

    expect(
      controlPlane.saveControlPlaneKanbanBoard(
        {
          name: "Backlog",
          description: "Deferred lane work",
        },
        "hermes",
      ),
    ).toEqual([
      expect.objectContaining({ slug: "backlog", isCurrent: true }),
      expect.objectContaining({ slug: "operations", isCurrent: false }),
    ]);

    const createdTask = controlPlane.saveControlPlaneKanbanTask(
      {
        boardSlug: "backlog",
        title: "Record deferred rollout work",
        body: "Capture the postponed release steps.",
        status: "queued",
        priority: 2,
        assignee: "ops",
        skills: ["release-audit"],
      },
      "hermes",
    );

    expect(createdTask[0]).toEqual(
      expect.objectContaining({ title: "Record deferred rollout work" }),
    );

    expect(
      controlPlane.saveControlPlaneKanbanBoard(
        {
          existingSlug: "backlog",
          name: "Release board",
          description: "Renamed rollout backlog",
        },
        "hermes",
      ),
    ).toEqual([
      expect.objectContaining({ slug: "release-board", isCurrent: true }),
      expect.objectContaining({ slug: "operations", isCurrent: false }),
    ]);

    expect(controlPlane.listControlPlaneKanbanTasks("release-board", "hermes")).toEqual([
      expect.objectContaining({ title: "Record deferred rollout work" }),
    ]);

    expect(
      controlPlane.removeControlPlaneKanbanBoard("release-board", "hermes"),
    ).toEqual([
      expect.objectContaining({ slug: "operations", isCurrent: true }),
    ]);
    expect(controlPlane.listControlPlaneKanbanTasks("release-board", "hermes")).toEqual([]);
  });

  it("dispatches linked schedules onto Kanban boards and keeps linked board slugs in sync", async () => {
    const controlPlane = await import("./agentControlPlane");

    controlPlane.saveControlPlaneKanbanBoard(
      {
        name: "Backlog",
        description: "Linked schedule work",
      },
      "hermes",
    );

    controlPlane.saveControlPlaneProfile(
      {
        name: "Ops",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
        kanbanBoardSlug: "backlog",
      },
      "hermes",
    );

    const schedules = controlPlane.saveControlPlaneSchedule(
      {
        name: "Nightly dispatch",
        cron: "60m",
        prompt: "Review runtime health.",
        profile: "Ops",
        enabled: true,
      },
      "hermes",
    );

    expect(schedules[0]).toEqual(
      expect.objectContaining({
        kanbanBoardSlug: "backlog",
      }),
    );

    await controlPlane.triggerControlPlaneSchedule(schedules[0].id, "hermes");

    expect(controlPlane.listControlPlaneKanbanTasks("backlog", "hermes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Nightly dispatch",
          assignee: "Ops",
        }),
      ]),
    );

    controlPlane.saveControlPlaneKanbanBoard(
      {
        existingSlug: "backlog",
        name: "Release board",
        description: "Renamed linked board",
      },
      "hermes",
    );

    expect(controlPlane.listControlPlaneProfiles("hermes", false)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Ops",
          kanbanBoardSlug: "release-board",
        }),
      ]),
    );
    expect(controlPlane.listControlPlaneSchedules("hermes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Nightly dispatch",
          kanbanBoardSlug: "release-board",
        }),
      ]),
    );

    controlPlane.removeControlPlaneKanbanBoard("release-board", "hermes");

    expect(controlPlane.listControlPlaneProfiles("hermes", false)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Ops",
          kanbanBoardSlug: null,
        }),
      ]),
    );
    expect(controlPlane.listControlPlaneSchedules("hermes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Nightly dispatch",
          kanbanBoardSlug: null,
        }),
      ]),
    );
  });

  it("persists CodeGraph registries and EverOS harnesses in the provider control plane", async () => {
    const controlPlane = await import("./agentControlPlane");
    const repoDir = join(userDataDir, "repo-under-test");

    mkdirSync(repoDir, { recursive: true });

    const repos = controlPlane.saveControlPlaneCodeGraphRepo(
      {
        name: "Repo under test",
        repoPath: repoDir,
        description: "Graph fixture repo",
        selected: true,
      },
      "hermes",
    );

    expect(repos).toEqual([
      expect.objectContaining({
        name: "Repo under test",
        repoPath: repoDir,
        exists: true,
        selected: true,
      }),
    ]);

    const repoId = repos[0].id;

    expect(
      controlPlane.saveControlPlaneCodeGraphEntrypoint(
        {
          repoId,
          name: "Bootstrap",
          target: "src/main/index.ts:createWindow",
          notes: "Shell entrypoint",
        },
        "hermes",
      ),
    ).toEqual([
      expect.objectContaining({
        repoId,
        name: "Bootstrap",
      }),
    ]);

    expect(
      controlPlane.saveControlPlaneCodeGraphQuery(
        {
          repoId: null,
          name: "Impact scan",
          mode: "impact",
          query: "Trace impacted callers.",
        },
        "hermes",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Impact scan",
          mode: "impact",
        }),
      ]),
    );

    controlPlane.saveControlPlaneProfile(
      {
        name: "Ops",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
      },
      "hermes",
    );
    const schedules = controlPlane.saveControlPlaneSchedule(
      {
        name: "Memory sync",
        cron: "60m",
        prompt: "Sync EverOS memory.",
        profile: "Ops",
        enabled: true,
      },
      "hermes",
    );

    expect(
      controlPlane.saveControlPlaneEverOsHarness(
        {
          name: "Ops harness",
          description: "Primary harness",
          memoryNamespace: "cubecloud-ops",
          profile: "Ops",
          scheduleId: schedules[0].id,
          loopPrompt: "Refresh persistent memory.",
          enabled: true,
        },
        "hermes",
      ),
    ).toEqual([
      expect.objectContaining({
        name: "Ops harness",
        profile: "Ops",
        scheduleId: schedules[0].id,
      }),
    ]);

    controlPlane.removeControlPlaneSchedule(schedules[0].id, "hermes");

    expect(controlPlane.listControlPlaneEverOsHarnesses("hermes")).toEqual([
      expect.objectContaining({
        name: "Ops harness",
        scheduleId: null,
      }),
    ]);
  });

  it("records dispatch runs with CodeGraph and EverOS context snapshots", async () => {
    const controlPlane = await import("./agentControlPlane");
    const repoDir = join(userDataDir, "dispatch-repo");

    mkdirSync(repoDir, { recursive: true });

    const repos = controlPlane.saveControlPlaneCodeGraphRepo(
      {
        name: "Dispatch repo",
        repoPath: repoDir,
        description: "Dispatch context repo",
        selected: true,
      },
      "hermes",
    );

    controlPlane.saveControlPlaneCodeGraphEntrypoint(
      {
        repoId: repos[0].id,
        name: "Gateway shell",
        target: "src/renderer/src/App.tsx",
        notes: "Selected lane card",
      },
      "hermes",
    );
    controlPlane.saveControlPlaneCodeGraphQuery(
      {
        repoId: repos[0].id,
        name: "Lane impact",
        mode: "impact",
        query: "Trace the active lane dispatch path.",
      },
      "hermes",
    );
    controlPlane.saveControlPlaneCodeGraphQuery(
      {
        repoId: repos[0].id,
        name: "Operator summary",
        mode: "context",
        query: "Summarize the lane context.",
      },
      "hermes",
    );
    controlPlane.saveControlPlaneProfile(
      {
        name: "Ops",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
        kanbanBoardSlug: "operations",
      },
      "hermes",
    );
    const schedules = controlPlane.saveControlPlaneSchedule(
      {
        name: "Nightly lane sync",
        cron: "60m",
        prompt: "Summarize the current lane state.",
        profile: "Ops",
        enabled: true,
      },
      "hermes",
    );
    controlPlane.saveControlPlaneEverOsHarness(
      {
        name: "Ops loop",
        description: "Runtime memory loop",
        memoryNamespace: "ops",
        profile: "Ops",
        scheduleId: schedules[0].id,
        loopPrompt: "Refresh the lane memory.",
        enabled: true,
      },
      "hermes",
    );
    controlPlane.saveControlPlaneEverOsHarness(
      {
        name: "Backlog sync",
        description: "Secondary loop",
        memoryNamespace: "backlog",
        profile: "Ops",
        scheduleId: null,
        loopPrompt: "Sync the backlog memory.",
        enabled: true,
      },
      "hermes",
    );

    controlPlane.registerControlPlaneDispatchRuntimeExecutor(async (request) => ({
      output: `Runtime response for ${request.targetName}`,
    }));

    const laneImpactQueryId = controlPlane
      .listControlPlaneCodeGraphQueries("hermes")
      .find((query) => query.name === "Lane impact")?.id;
    const opsLoopHarnessId = controlPlane
      .listControlPlaneEverOsHarnesses("hermes")
      .find((harness) => harness.name === "Ops loop")?.id;

    expect(laneImpactQueryId).toBeTruthy();
    expect(opsLoopHarnessId).toBeTruthy();

    const profileRun = await controlPlane.dispatchControlPlaneProfile("Ops", "hermes", {
      codegraphRepoId: repos[0].id,
      codegraphQueryIds: [laneImpactQueryId!],
      everosHarnessIds: [opsLoopHarnessId!],
    });
    await controlPlane.triggerControlPlaneSchedule(
      schedules[0].id,
      "hermes",
      "schedule",
      Date.now(),
      {
        codegraphRepoId: repos[0].id,
        codegraphQueryIds: [],
        everosHarnessIds: [],
      },
    );

    controlPlane.registerControlPlaneDispatchRuntimeExecutor(null);

    expect(profileRun).toEqual(
      expect.objectContaining({
        targetType: "profile",
        targetName: "Ops",
        status: "done",
        output: "Runtime response for Ops",
        context: expect.objectContaining({
          profile: "Ops",
          kanbanBoardSlug: "operations",
          selection: {
            codegraphRepoId: repos[0].id,
            codegraphQueryIds: [laneImpactQueryId!],
            everosHarnessIds: [opsLoopHarnessId!],
          },
          codegraph: expect.objectContaining({
            repoName: "Dispatch repo",
            queries: [
              expect.objectContaining({
                name: "Lane impact",
              }),
            ],
          }),
          everosHarnesses: [
            expect.objectContaining({
              name: "Ops loop",
            }),
          ],
        }),
      }),
    );

    expect(controlPlane.listControlPlaneDispatchRuns("hermes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "schedule",
          targetId: schedules[0].id,
          source: "schedule",
          status: "done",
          output: "Runtime response for Nightly lane sync",
          sessionId: expect.any(String),
          context: expect.objectContaining({
            selection: {
              codegraphRepoId: repos[0].id,
              codegraphQueryIds: [],
              everosHarnessIds: [],
            },
            codegraph: expect.objectContaining({
              entrypoints: expect.arrayContaining([
                expect.objectContaining({
                  name: "Gateway shell",
                }),
              ]),
              queries: [],
            }),
            everosHarnesses: [],
          }),
        }),
      ]),
    );
  });

  it("runs due schedules through the shared scheduler helper", async () => {
    const controlPlane = await import("./agentControlPlane");
    const providerDir = join(userDataDir, "agent-workspace", "providers", "hermes");

    controlPlane.saveControlPlaneProfile(
      {
        name: "Ops",
        model: "claude-sonnet",
        provider: "anthropic",
        isDefault: true,
        kanbanBoardSlug: "operations",
      },
      "hermes",
    );

    const schedule = controlPlane.saveControlPlaneSchedule(
      {
        name: "Hourly scheduler scan",
        cron: "60m",
        prompt: "Inspect automatic scheduler execution.",
        profile: "Ops",
        enabled: true,
      },
      "hermes",
    )[0];

    writeFileSync(
      join(providerDir, "schedules.json"),
      JSON.stringify(
        [
          {
            ...schedule,
            nextRunAt: Date.now() - 1000,
          },
        ],
        null,
        2,
      ),
      "utf-8",
    );

    const runs = await controlPlane.runDueControlPlaneSchedules("hermes", Date.now());

    expect(runs).toEqual([
      expect.objectContaining({
        source: "scheduler",
        targetType: "schedule",
        targetName: "Hourly scheduler scan",
        status: "done",
      }),
    ]);
    expect(controlPlane.listControlPlaneKanbanTasks("operations", "hermes")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Hourly scheduler scan",
          status: "done",
        }),
      ]),
    );
  });
});