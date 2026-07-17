import { checkOpenClawExists } from "./installer";
import {
  TASK_ORCHESTRATOR_CATALOG,
  type TaskOrchestratorSnapshot,
} from "../shared/runtime-orchestration";

interface TaskOrchestratorAdapter {
  readonly id: (typeof TASK_ORCHESTRATOR_CATALOG)[number]["id"];
  getSnapshot(): Promise<TaskOrchestratorSnapshot>;
}

const adapters: readonly TaskOrchestratorAdapter[] = [
  {
    id: "hermes",
    async getSnapshot(): Promise<TaskOrchestratorSnapshot> {
      const definition = TASK_ORCHESTRATOR_CATALOG.find(
        (candidate) => candidate.id === "hermes",
      )!;
      return {
        definition,
        status: "ready",
        available: true,
        detected: true,
        enabled: true,
        detectedCommand: null,
        summary:
          "Hermes is the native task dispatch backend. The Plans screen's Dispatch button creates tasks via the Hermes CLI kanban subcommand.",
        detail:
          "The board UI is provided by moo-tasks (agent-native kanban with 14 MCP tools). Hermes dispatch creates the tasks; moo-tasks provides the visual board.",
      };
    },
  },
  {
    id: "openclaw",
    async getSnapshot(): Promise<TaskOrchestratorSnapshot> {
      const definition = TASK_ORCHESTRATOR_CATALOG.find(
        (candidate) => candidate.id === "openclaw",
      )!;
      const openclaw = checkOpenClawExists();
      return {
        definition,
        status: openclaw.found ? "optional" : "planned",
        available: false,
        detected: openclaw.found,
        enabled: false,
        detectedCommand: null,
        summary: openclaw.found
          ? `OpenClaw is present at ${openclaw.path}, but its task bridge remains disabled until a real runtime adapter exists.`
          : "OpenClaw orchestration stays disabled until the optional runtime adapter lands.",
        detail:
          "Migration support exists today, but task orchestration will only be enabled after probe, attach, and workflow adapter work is complete.",
      };
    },
  },
];

export async function listTaskOrchestrators(): Promise<
  TaskOrchestratorSnapshot[]
> {
  const snapshots = await Promise.all(
    adapters.map((adapter) => adapter.getSnapshot()),
  );

  return TASK_ORCHESTRATOR_CATALOG.map((definition) => {
    const snapshot = snapshots.find(
      (candidate) => candidate.definition.id === definition.id,
    );

    if (!snapshot) {
      throw new Error(`Missing orchestrator adapter snapshot for ${definition.id}`);
    }

    return snapshot;
  });
}