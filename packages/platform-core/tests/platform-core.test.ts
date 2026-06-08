import { describe, expect, it } from "vitest";
import {
  buildPlatformOverview,
  createDefaultPlatformState,
  recordSmokeTargetProbeResult,
  setActiveRuntimeProvider,
  setActiveTaskOrchestrator,
  setSmokeTargetConfig,
} from "../src/index";

describe("platform runtime orchestration", () => {
  it("switches to the preferred compatible orchestrator when the runtime lane changes", () => {
    const stateWithOptionalOrchestrator = setActiveTaskOrchestrator(
      createDefaultPlatformState(),
      "openclaw",
    );

    const nextState = setActiveRuntimeProvider(
      stateWithOptionalOrchestrator,
      "ironclaw",
    );

    expect(nextState.activeRuntimeProviderId).toBe("ironclaw");
    expect(nextState.activeTaskOrchestratorId).toBe("hermes");
  });

  it("marks a TCP smoke target ready once host and port are staged", () => {
    const nextState = setSmokeTargetConfig(createDefaultPlatformState(), "hermes-tcp", {
      tcpHost: "127.0.0.1",
      tcpPort: 8644,
    });

    const target = nextState.smokeTargets.find((candidate) => candidate.id === "hermes-tcp");

    expect(target).toMatchObject({
      transport: "tcp",
      tcpHost: "127.0.0.1",
      tcpPort: 8644,
      status: "ready",
    });
  });

  it("surfaces TCP probe results and ready counts in the overview", () => {
    let state = setActiveRuntimeProvider(createDefaultPlatformState(), "ironclaw");
    state = setSmokeTargetConfig(state, "ironclaw-remote", {
      remoteUrl: "http://127.0.0.1:8281/health",
    });
    state = setSmokeTargetConfig(state, "ironclaw-tcp", {
      tcpHost: "127.0.0.1",
      tcpPort: 50051,
    });
    state = recordSmokeTargetProbeResult(state, "ironclaw-tcp", {
      status: "passed",
      detail: "TCP handshake to 127.0.0.1:50051 succeeded.",
      ranAt: "2026-06-01T12:00:00.000Z",
    });

    const overview = buildPlatformOverview(state);
    const ironclawProvider = overview.runtimeProviders.find(
      (candidate) => candidate.id === "ironclaw",
    );
    const tcpTarget = overview.smokeTargets.find(
      (candidate) => candidate.id === "ironclaw-tcp",
    );

    expect(ironclawProvider).toMatchObject({
      selected: true,
      laneState: "staged",
      passedSmokeTargetCount: 1,
      failedSmokeTargetCount: 0,
      readySmokeTargetCount: 2,
      totalSmokeTargetCount: 2,
    });
    expect(tcpTarget).toMatchObject({
      ready: true,
      status: "passed",
      suggestedProbeTarget: "127.0.0.1:50051",
      lastRunDetail: "TCP handshake to 127.0.0.1:50051 succeeded.",
    });
  });

  it("marks a runtime lane staged when Docker discovery finds a matched runtime even before smoke is configured", () => {
    const overview = buildPlatformOverview(createDefaultPlatformState(), {
      status: "connected",
      message: "Detected Hermes runtime in Docker.",
      lastScannedAt: "2026-06-01T12:00:00.000Z",
      projects: [],
      nodes: [
        {
          id: "node-1",
          name: "hermes-agent",
          bindingKey: "docker://hermes-agent",
          image: "hermes-agent:latest",
          state: "running",
          status: "Up 2 minutes",
          health: "healthy",
          matchMode: "automatic",
          composeProject: "cubecloud",
          composeService: "hermes-agent",
          ports: [],
          exposedPorts: [],
          networkNames: ["cubecloud_default"],
          mountTargets: [],
          startedAt: "2026-06-01T11:59:00.000Z",
          finishedAt: null,
          exitCode: null,
          diagnostic: null,
          preferredPort: null,
          preferredPortReason: null,
          matchedAppId: "hermes-agent",
        },
      ],
    });

    const hermesProvider = overview.runtimeProviders.find(
      (candidate) => candidate.id === "hermes",
    );

    expect(hermesProvider).toMatchObject({
      laneState: "staged",
      dockerCandidateCount: 1,
      passedSmokeTargetCount: 0,
      failedSmokeTargetCount: 0,
    });
  });
});
