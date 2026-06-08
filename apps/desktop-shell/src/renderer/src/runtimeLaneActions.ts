import type {
  PlatformDockerNodeSummary,
  PlatformRuntimeLaneState,
  PlatformRuntimeProviderId,
  PlatformRuntimeProviderSummary,
  PlatformSmokeTargetPatch,
  PlatformSmokeTargetSummary,
  PlatformTaskOrchestratorId,
} from "@cubecloud/platform-core";

export const LOCAL_RUNTIME_HOST = "127.0.0.1";

type RuntimeLaneNode = Pick<PlatformDockerNodeSummary, "name" | "preferredPort" | "ports">;

export type RuntimeLanePrefillCandidate = {
  appId: string;
  node: RuntimeLaneNode;
};

export type RuntimeLaneStageUpdate = {
  targetId: string;
  patch: PlatformSmokeTargetPatch;
};

export type RuntimeLaneStageAction = {
  label: string;
  updates: RuntimeLaneStageUpdate[];
  nextTaskOrchestratorId?: PlatformTaskOrchestratorId;
};

export type RuntimeLaneStageConfig = {
  description: string;
  evidence: string | null;
  primaryAction: RuntimeLaneStageAction;
};

export type RuntimeLanePrimaryAction =
  | ({ kind: "stage" } & RuntimeLaneStageAction)
  | { kind: "run-smoke"; label: string; targetId: string }
  | { kind: "run-sequence"; label: string; targetIds: string[] }
  | { kind: "open-surface"; label: string; appId: string }
  | { kind: "focus-app"; label: string; appId: string }
  | {
      kind: "set-orchestrator";
      label: string;
      taskOrchestratorId: PlatformTaskOrchestratorId;
    };

export type RuntimeLaneActionModel = {
  laneState: PlatformRuntimeLaneState;
  description: string;
  evidence: string | null;
  primaryAction: RuntimeLanePrimaryAction;
};

type RuntimeLaneStageConfigArgs = {
  runtimeProviderId: PlatformRuntimeProviderId;
  linkedAppId: string | null;
  remoteExampleUrl: string;
  runtimeIntakeCandidates: readonly RuntimeLanePrefillCandidate[];
};

type RuntimeLaneActionModelArgs = {
  runtimeProvider: Pick<
    PlatformRuntimeProviderSummary,
    | "id"
    | "laneState"
    | "linkedAppId"
    | "linkedRuntimeSurfaceAppId"
    | "surfaceConfigured"
    | "surfaceUrl"
    | "remoteExampleUrl"
  >;
  smokeTargets: readonly Pick<
    PlatformSmokeTargetSummary,
    "id" | "label" | "transport" | "ready" | "status" | "lastRunDetail"
  >[];
  runtimeIntakeCandidates: readonly RuntimeLanePrefillCandidate[];
};

function normalizePublishedHost(host: string): string {
  const trimmed = host.trim();

  if (!trimmed || trimmed === "0.0.0.0" || trimmed === "::" || trimmed === "[::]") {
    return LOCAL_RUNTIME_HOST;
  }

  return trimmed;
}

function formatPublishedEndpoint(binding: { host: string; hostPort: number }): string {
  return `${normalizePublishedHost(binding.host)}:${binding.hostPort}`;
}

function findPublishedPort(
  node: RuntimeLaneNode | null,
  expectedPort: number,
): PlatformDockerNodeSummary["ports"][number] | null {
  if (!node) {
    return null;
  }

  return (
    node.ports.find(
      (binding) =>
        binding.hostPort === expectedPort || binding.containerPort === expectedPort,
    ) ?? null
  );
}

function resolveCandidate(
  linkedAppId: string | null,
  runtimeIntakeCandidates: readonly RuntimeLanePrefillCandidate[],
): RuntimeLanePrefillCandidate | null {
  if (!linkedAppId) {
    return null;
  }

  return (
    runtimeIntakeCandidates.find((candidate) => candidate.appId === linkedAppId) ?? null
  );
}

export function buildRuntimeLaneStageConfig(
  args: RuntimeLaneStageConfigArgs,
): RuntimeLaneStageConfig {
  const dockerCandidate = resolveCandidate(
    args.linkedAppId,
    args.runtimeIntakeCandidates,
  );

  if (args.runtimeProviderId === "hermes") {
    const candidateNode = dockerCandidate?.node ?? null;
    const preferredBinding =
      findPublishedPort(candidateNode, 8644) ??
      findPublishedPort(candidateNode, 8642) ??
      candidateNode?.preferredPort ??
      null;
    const stagedHost = preferredBinding
      ? normalizePublishedHost(preferredBinding.host)
      : LOCAL_RUNTIME_HOST;
    const stagedPort = preferredBinding?.hostPort ?? 8644;
    const stagedEndpoint = `${stagedHost}:${stagedPort}`;

    return {
      description: preferredBinding && dockerCandidate
        ? `Docker already exposed ${stagedEndpoint} for ${dockerCandidate.node.name}. Stage that published endpoint directly before falling back to a manual localhost guess.`
        : "Hermes is best staged from Agent Desktop or a local TCP probe when the runtime is live but does not answer an HTTP health path.",
      evidence:
        preferredBinding && dockerCandidate
          ? `Docker candidate ${dockerCandidate.node.name} -> ${stagedEndpoint}`
          : null,
      primaryAction: {
        label:
          preferredBinding && dockerCandidate
            ? `Stage Docker endpoint ${stagedEndpoint}`
            : "Stage localhost 8644",
        updates: [
          {
            targetId: "hermes-tcp",
            patch: {
              tcpHost: stagedHost,
              tcpPort: stagedPort,
            },
          },
        ],
        nextTaskOrchestratorId: "hermes",
      },
    };
  }

  if (args.runtimeProviderId === "ironclaw") {
    const candidateNode = dockerCandidate?.node ?? null;
    const operatorBinding = candidateNode?.preferredPort ?? findPublishedPort(candidateNode, 8281);
    const dataBinding = findPublishedPort(candidateNode, 50051);
    const operatorHost = operatorBinding
      ? normalizePublishedHost(operatorBinding.host)
      : LOCAL_RUNTIME_HOST;
    const operatorPort = operatorBinding?.hostPort ?? 8281;
    const operatorEndpoint = `${operatorHost}:${operatorPort}`;
    const updates: RuntimeLaneStageUpdate[] = [
      {
        targetId: "ironclaw-remote",
        patch: {
          remoteUrl: `http://${operatorEndpoint}/health`,
        },
      },
    ];
    let label = "Stage local 8281 + 50051";
    let description =
      "IronClaw usually needs both the HTTP operator endpoint and the raw data plane staged before deeper handoff work.";
    let evidence: string | null = null;

    if (dataBinding) {
      const dataEndpoint = formatPublishedEndpoint(dataBinding);

      updates.push({
        targetId: "ironclaw-tcp",
        patch: {
          tcpHost: normalizePublishedHost(dataBinding.host),
          tcpPort: dataBinding.hostPort,
        },
      });
      label =
        operatorBinding && dockerCandidate
          ? `Stage Docker endpoints ${operatorEndpoint} + ${dataEndpoint}`
          : label;
      description =
        operatorBinding && dockerCandidate
          ? `Docker already exposed both the operator and data-plane ports for ${dockerCandidate.node.name}. Stage those published endpoints directly into the smoke harness.`
          : description;
      evidence =
        operatorBinding && dockerCandidate
          ? `Docker candidate ${dockerCandidate.node.name} -> ${operatorEndpoint}, ${dataEndpoint}`
          : null;
    } else if (operatorBinding && dockerCandidate) {
      label = `Stage Docker operator ${operatorEndpoint}`;
      description = `Docker already exposed the IronClaw operator endpoint for ${dockerCandidate.node.name}. Stage it directly, then add a TCP lane when the data plane is published.`;
      evidence = `Docker candidate ${dockerCandidate.node.name} -> ${operatorEndpoint}`;
    } else {
      updates.push({
        targetId: "ironclaw-tcp",
        patch: {
          tcpHost: LOCAL_RUNTIME_HOST,
          tcpPort: 50051,
        },
      });
    }

    return {
      description,
      evidence,
      primaryAction: {
        label,
        updates,
        nextTaskOrchestratorId: "ecc",
      },
    };
  }

  return {
    description:
      "OpenClaw stays optional here, so stage the compatibility endpoint or SSH lane before treating it as the active orchestrator.",
    evidence: null,
    primaryAction: {
      label: "Stage compatibility template",
      updates: [
        {
          targetId: "openclaw-remote",
          patch: {
            remoteUrl: args.remoteExampleUrl,
          },
        },
      ],
      nextTaskOrchestratorId: "openclaw",
    },
  };
}

function buildRunSmokeAction(
  target: Pick<PlatformSmokeTargetSummary, "id" | "transport">,
): RuntimeLanePrimaryAction {
  return {
    kind: "run-smoke",
    label:
      target.transport === "remote"
        ? "Run HTTP probe"
        : target.transport === "tcp"
          ? "Run TCP probe"
          : "Run SSH handshake",
    targetId: target.id,
  };
}

function smokeSequenceOrder(
  runtimeProviderId: PlatformRuntimeProviderId,
): readonly string[] {
  switch (runtimeProviderId) {
    case "hermes":
      return ["hermes-tcp", "hermes-remote", "hermes-ssh"];
    case "ironclaw":
      return ["ironclaw-remote", "ironclaw-tcp"];
    case "openclaw":
      return ["openclaw-remote", "openclaw-ssh"];
  }
}

function nextSmokeSequence(
  runtimeProviderId: PlatformRuntimeProviderId,
  smokeTargets: readonly Pick<
    PlatformSmokeTargetSummary,
    "id" | "ready" | "status"
  >[],
): string[] {
  return smokeSequenceOrder(runtimeProviderId).filter((targetId) =>
    smokeTargets.some(
      (target) => target.id === targetId && target.ready && target.status !== "passed",
    ),
  );
}

function nextRunnableSmokeTarget(
  smokeTargets: readonly Pick<
    PlatformSmokeTargetSummary,
    "id" | "transport" | "ready" | "status"
  >[],
): Pick<PlatformSmokeTargetSummary, "id" | "transport"> | null {
  return (
    smokeTargets.find((target) => target.ready && target.status === "failed") ??
    smokeTargets.find((target) => target.ready && target.status !== "passed") ??
    null
  );
}

function smokeTargetPassed(
  smokeTargets: readonly Pick<PlatformSmokeTargetSummary, "id" | "status">[],
  targetId: string,
): boolean {
  return smokeTargets.some(
    (target) => target.id === targetId && target.status === "passed",
  );
}

export function buildRuntimeLaneActionModel(
  args: RuntimeLaneActionModelArgs,
): RuntimeLaneActionModel {
  const stageConfig = buildRuntimeLaneStageConfig({
    runtimeProviderId: args.runtimeProvider.id,
    linkedAppId: args.runtimeProvider.linkedAppId,
    remoteExampleUrl: args.runtimeProvider.remoteExampleUrl,
    runtimeIntakeCandidates: args.runtimeIntakeCandidates,
  });
  const pendingTarget = nextRunnableSmokeTarget(args.smokeTargets);
  const pendingSequence = nextSmokeSequence(args.runtimeProvider.id, args.smokeTargets);

  if (args.runtimeProvider.id === "hermes") {
    if (
      args.runtimeProvider.laneState === "verified" &&
      args.runtimeProvider.linkedRuntimeSurfaceAppId &&
      args.runtimeProvider.surfaceConfigured
    ) {
      return {
        laneState: args.runtimeProvider.laneState,
        description:
          "Hermes has verification evidence. Open the linked surface from the shell, then continue in Agent Desktop for the full runtime workflow.",
        evidence: args.runtimeProvider.surfaceUrl,
        primaryAction: {
          kind: "open-surface",
          label: "Open linked surface",
          appId: args.runtimeProvider.linkedRuntimeSurfaceAppId,
        },
      };
    }

    if (pendingTarget) {
      return {
        laneState: args.runtimeProvider.laneState,
        description:
          args.runtimeProvider.laneState === "degraded"
            ? "Hermes has a failed verification check. Re-run the current smoke target before treating the lane as live."
            : "Hermes is staged but not verified yet. Run the prepared smoke target to confirm the active lane.",
        evidence:
          args.smokeTargets.find((target) => target.id === pendingTarget.id)?.lastRunDetail ??
          stageConfig.evidence,
        primaryAction:
          pendingSequence.length > 1
            ? {
                kind: "run-sequence",
                label: "Run lane smoke sequence",
                targetIds: pendingSequence,
              }
            : buildRunSmokeAction(pendingTarget),
      };
    }
  }

  if (args.runtimeProvider.id === "ironclaw") {
    const remotePassed = smokeTargetPassed(args.smokeTargets, "ironclaw-remote");
    const tcpPassed = smokeTargetPassed(args.smokeTargets, "ironclaw-tcp");

    if (remotePassed && tcpPassed) {
      if (
        args.runtimeProvider.linkedRuntimeSurfaceAppId &&
        args.runtimeProvider.surfaceConfigured
      ) {
        return {
          laneState: args.runtimeProvider.laneState,
          description:
            "Both IronClaw operator and data-plane checks passed. Open the linked surface to inspect the live gateway from the shell.",
          evidence: args.runtimeProvider.surfaceUrl,
          primaryAction: {
            kind: "open-surface",
            label: "Open linked surface",
            appId: args.runtimeProvider.linkedRuntimeSurfaceAppId,
          },
        };
      }

      return {
        laneState: args.runtimeProvider.laneState,
        description:
          "Both IronClaw checks passed. Keep the runtime lane selected and switch orchestration over to the ECC bridge for the next handoff step.",
        evidence: stageConfig.evidence,
        primaryAction: {
          kind: "set-orchestrator",
          label: "Bridge with ECC",
          taskOrchestratorId: "ecc",
        },
      };
    }

    if (pendingTarget) {
      return {
        laneState: args.runtimeProvider.laneState,
        description:
          args.runtimeProvider.laneState === "degraded"
            ? "IronClaw has a failed operator or data-plane check. Re-run the failed smoke target before moving orchestration onto this lane."
            : "IronClaw is staged but still needs both operator and data-plane verification before the shell should treat it as ready for handoff.",
        evidence:
          args.smokeTargets.find((target) => target.id === pendingTarget.id)?.lastRunDetail ??
          stageConfig.evidence,
        primaryAction:
          pendingSequence.length > 1
            ? {
                kind: "run-sequence",
                label:
                  args.runtimeProvider.laneState === "degraded"
                    ? "Retry lane smoke sequence"
                    : "Run lane smoke sequence",
                targetIds: pendingSequence,
              }
            : buildRunSmokeAction(pendingTarget),
      };
    }
  }

  if (args.runtimeProvider.id === "openclaw") {
    if (args.runtimeProvider.laneState === "verified") {
      return {
        laneState: args.runtimeProvider.laneState,
        description:
          "OpenClaw has verification evidence. Promote it to the active orchestration lane when you actually want the shell to hand work to OpenClaw instead of Hermes or ECC.",
        evidence: stageConfig.evidence,
        primaryAction: {
          kind: "set-orchestrator",
          label: "Prefer OpenClaw orchestration",
          taskOrchestratorId: "openclaw",
        },
      };
    }

    if (pendingTarget) {
      return {
        laneState: args.runtimeProvider.laneState,
        description:
          args.runtimeProvider.laneState === "degraded"
            ? "OpenClaw has a failed verification check. Re-run the prepared smoke target before promoting this lane."
            : "OpenClaw is staged but still needs a successful compatibility or SSH check before the shell should promote it.",
        evidence:
          args.smokeTargets.find((target) => target.id === pendingTarget.id)?.lastRunDetail ??
          stageConfig.evidence,
        primaryAction:
          pendingSequence.length > 1
            ? {
                kind: "run-sequence",
                label: "Run lane smoke sequence",
                targetIds: pendingSequence,
              }
            : buildRunSmokeAction(pendingTarget),
      };
    }
  }

  return {
    laneState: args.runtimeProvider.laneState,
    description: stageConfig.description,
    evidence: stageConfig.evidence,
    primaryAction: {
      kind: "stage",
      label: stageConfig.primaryAction.label,
      updates: stageConfig.primaryAction.updates,
      nextTaskOrchestratorId: stageConfig.primaryAction.nextTaskOrchestratorId,
    },
  };
}
