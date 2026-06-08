import { describe, expect, it } from "vitest";
import {
  buildRuntimeLaneActionModel,
  buildRuntimeLaneStageConfig,
} from "./runtimeLaneActions";

describe("runtime lane stage config", () => {
  it("uses Docker-discovered Hermes ports for the TCP lane action", () => {
    const config = buildRuntimeLaneStageConfig({
      runtimeProviderId: "hermes",
      linkedAppId: "hermes-agent",
      remoteExampleUrl: "http://example.invalid:8642/health",
      runtimeIntakeCandidates: [
        {
          appId: "hermes-agent",
          node: {
            name: "hermes-agent",
            preferredPort: {
              host: "0.0.0.0",
              hostPort: 8644,
              containerPort: 8644,
              protocol: "tcp",
            },
            ports: [
              {
                host: "0.0.0.0",
                hostPort: 8644,
                containerPort: 8644,
                protocol: "tcp",
              },
            ],
          },
        },
      ],
    });

    expect(config.primaryAction.label).toBe("Stage Docker endpoint 127.0.0.1:8644");
    expect(config.primaryAction.updates).toEqual([
      {
        targetId: "hermes-tcp",
        patch: {
          tcpHost: "127.0.0.1",
          tcpPort: 8644,
        },
      },
    ]);
    expect(config.evidence).toContain("hermes-agent");
  });

  it("uses Docker-discovered IronClaw operator and data-plane ports when both are published", () => {
    const config = buildRuntimeLaneStageConfig({
      runtimeProviderId: "ironclaw",
      linkedAppId: "ironclaw",
      remoteExampleUrl: "http://example.invalid:8281/health",
      runtimeIntakeCandidates: [
        {
          appId: "ironclaw",
          node: {
            name: "ironclaw-gateway",
            preferredPort: {
              host: "127.0.0.1",
              hostPort: 8281,
              containerPort: 8080,
              protocol: "tcp",
            },
            ports: [
              {
                host: "127.0.0.1",
                hostPort: 8281,
                containerPort: 8080,
                protocol: "tcp",
              },
              {
                host: "127.0.0.1",
                hostPort: 50051,
                containerPort: 50051,
                protocol: "tcp",
              },
            ],
          },
        },
      ],
    });

    expect(config.primaryAction.label).toBe(
      "Stage Docker endpoints 127.0.0.1:8281 + 127.0.0.1:50051",
    );
    expect(config.primaryAction.updates).toEqual([
      {
        targetId: "ironclaw-remote",
        patch: {
          remoteUrl: "http://127.0.0.1:8281/health",
        },
      },
      {
        targetId: "ironclaw-tcp",
        patch: {
          tcpHost: "127.0.0.1",
          tcpPort: 50051,
        },
      },
    ]);
    expect(config.primaryAction.nextTaskOrchestratorId).toBe("ecc");
  });

  it("falls back to the existing local defaults when no Docker candidate is present", () => {
    const config = buildRuntimeLaneStageConfig({
      runtimeProviderId: "ironclaw",
      linkedAppId: "ironclaw",
      remoteExampleUrl: "http://example.invalid:8281/health",
      runtimeIntakeCandidates: [],
    });

    expect(config.primaryAction.label).toBe("Stage local 8281 + 50051");
    expect(config.primaryAction.updates).toEqual([
      {
        targetId: "ironclaw-remote",
        patch: {
          remoteUrl: "http://127.0.0.1:8281/health",
        },
      },
      {
        targetId: "ironclaw-tcp",
        patch: {
          tcpHost: "127.0.0.1",
          tcpPort: 50051,
        },
      },
    ]);
  });

  it("promotes Hermes to opening the linked surface once the lane is verified", () => {
    const model = buildRuntimeLaneActionModel({
      runtimeProvider: {
        id: "hermes",
        laneState: "verified",
        linkedAppId: "hermes-agent",
        linkedRuntimeSurfaceAppId: "hermes-agent",
        surfaceConfigured: true,
        surfaceUrl: "http://127.0.0.1:8644/",
        remoteExampleUrl: "http://example.invalid:8642/health",
      },
      smokeTargets: [
        {
          id: "hermes-tcp",
          label: "Hermes local TCP smoke",
          transport: "tcp",
          ready: true,
          status: "passed",
          lastRunDetail: "TCP handshake to 127.0.0.1:8644 succeeded.",
        },
      ],
      runtimeIntakeCandidates: [],
    });

    expect(model.primaryAction).toEqual({
      kind: "open-surface",
      label: "Open linked surface",
      appId: "hermes-agent",
    });
  });

  it("asks IronClaw to run the remaining smoke target before bridging orchestration", () => {
    const model = buildRuntimeLaneActionModel({
      runtimeProvider: {
        id: "ironclaw",
        laneState: "staged",
        linkedAppId: "ironclaw",
        linkedRuntimeSurfaceAppId: "ironclaw",
        surfaceConfigured: true,
        surfaceUrl: "http://127.0.0.1:8281/health",
        remoteExampleUrl: "http://example.invalid:8281/health",
      },
      smokeTargets: [
        {
          id: "ironclaw-remote",
          label: "IronClaw remote smoke",
          transport: "remote",
          ready: true,
          status: "passed",
          lastRunDetail: "HTTP 200 OK",
        },
        {
          id: "ironclaw-tcp",
          label: "IronClaw gRPC/TCP smoke",
          transport: "tcp",
          ready: true,
          status: "ready",
          lastRunDetail: null,
        },
      ],
      runtimeIntakeCandidates: [],
    });

    expect(model.primaryAction).toEqual({
      kind: "run-smoke",
      label: "Run TCP probe",
      targetId: "ironclaw-tcp",
    });
  });

  it("guides IronClaw through the full smoke sequence when both checks still need to run", () => {
    const model = buildRuntimeLaneActionModel({
      runtimeProvider: {
        id: "ironclaw",
        laneState: "staged",
        linkedAppId: "ironclaw",
        linkedRuntimeSurfaceAppId: "ironclaw",
        surfaceConfigured: true,
        surfaceUrl: "http://127.0.0.1:8281/health",
        remoteExampleUrl: "http://example.invalid:8281/health",
      },
      smokeTargets: [
        {
          id: "ironclaw-remote",
          label: "IronClaw remote smoke",
          transport: "remote",
          ready: true,
          status: "ready",
          lastRunDetail: null,
        },
        {
          id: "ironclaw-tcp",
          label: "IronClaw gRPC/TCP smoke",
          transport: "tcp",
          ready: true,
          status: "ready",
          lastRunDetail: null,
        },
      ],
      runtimeIntakeCandidates: [],
    });

    expect(model.primaryAction).toEqual({
      kind: "run-sequence",
      label: "Run lane smoke sequence",
      targetIds: ["ironclaw-remote", "ironclaw-tcp"],
    });
  });

  it("bridges IronClaw through ECC once both verification targets have passed", () => {
    const model = buildRuntimeLaneActionModel({
      runtimeProvider: {
        id: "ironclaw",
        laneState: "verified",
        linkedAppId: "ironclaw",
        linkedRuntimeSurfaceAppId: null,
        surfaceConfigured: false,
        surfaceUrl: null,
        remoteExampleUrl: "http://example.invalid:8281/health",
      },
      smokeTargets: [
        {
          id: "ironclaw-remote",
          label: "IronClaw remote smoke",
          transport: "remote",
          ready: true,
          status: "passed",
          lastRunDetail: "HTTP 200 OK",
        },
        {
          id: "ironclaw-tcp",
          label: "IronClaw gRPC/TCP smoke",
          transport: "tcp",
          ready: true,
          status: "passed",
          lastRunDetail: "TCP handshake to 127.0.0.1:50051 succeeded.",
        },
      ],
      runtimeIntakeCandidates: [],
    });

    expect(model.primaryAction).toEqual({
      kind: "set-orchestrator",
      label: "Bridge with ECC",
      taskOrchestratorId: "ecc",
    });
  });
});
