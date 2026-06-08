import { checkOpenClawExists, getEnhancedPath } from "./installer";
import { resolveCommandOnPath } from "./agent-clis";
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
          "Hermes is the native task orchestrator scaffold for Agent Desktop and remains the default path for agent, task, and workflow coordination.",
        detail:
          "This adapter is intentionally first because the repo already contains the task and dispatch primitives. Future UI work should mount a new operations surface rather than restoring Office.",
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
  {
    id: "ecc",
    async getSnapshot(): Promise<TaskOrchestratorSnapshot> {
      const definition = TASK_ORCHESTRATOR_CATALOG.find(
        (candidate) => candidate.id === "ecc",
      )!;
      const detectedCommand = resolveCommandOnPath("ecc", getEnhancedPath());
      return {
        definition,
        status: detectedCommand ? "optional" : "planned",
        available: Boolean(detectedCommand),
        detected: Boolean(detectedCommand),
        enabled: false,
        detectedCommand,
        summary: detectedCommand
          ? `ECC was detected at ${detectedCommand}. It can be surfaced later as an optional external harness bridge.`
          : "ECC is scaffolded as an optional external harness bridge, but no ECC CLI was detected on the current PATH.",
        detail:
          "The bridge is intentionally external-facing only. Agent Desktop will not embed ECC's full dashboard or operator shell into the app core.",
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