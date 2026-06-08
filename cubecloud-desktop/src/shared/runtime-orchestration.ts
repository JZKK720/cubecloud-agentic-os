export type RuntimeProviderId = "hermes" | "ironclaw" | "openclaw";

export type TaskOrchestratorId = "hermes" | "openclaw" | "ecc";

export type RuntimeProviderRole =
  | "primary-runtime"
  | "gateway-handoff"
  | "migration-source";

export type RuntimeIntegrationStatus = "current" | "optional" | "planned";

export type RuntimeOnboardingSurface = "welcome" | "setup" | "settings" | "none";

export type RuntimeConnectionMode =
  | "embedded-local"
  | "local-gateway"
  | "remote-gateway"
  | "ssh-tunnel"
  | "docker-gateway"
  | "migration-import";

export type TaskOrchestratorIntegrationMode =
  | "native-core"
  | "optional-runtime"
  | "optional-bridge";

export interface RuntimeProviderCapabilities {
  canInstallLocally: boolean;
  canAttachToExistingLocalGateway: boolean;
  canAttachToRemoteGateway: boolean;
  canAttachViaSshTunnel: boolean;
  canDiscoverViaDocker: boolean;
  canImportExistingState: boolean;
  canDiscoverLocalCli: boolean;
  exposesChatGateway: boolean;
  supportsTaskExecution: boolean;
  supportsWorkflowDispatch: boolean;
}

export interface RuntimeProviderDefinition {
  id: RuntimeProviderId;
  displayName: string;
  role: RuntimeProviderRole;
  integrationStatus: RuntimeIntegrationStatus;
  onboardingSurface: RuntimeOnboardingSurface;
  connectionModes: readonly RuntimeConnectionMode[];
  capabilities: RuntimeProviderCapabilities;
  preferredTaskOrchestratorIds: readonly TaskOrchestratorId[];
  notes: readonly string[];
}

export type RuntimeProviderRegistryStatus =
  | "ready"
  | "available"
  | "optional"
  | "unavailable"
  | "planned";

export type RuntimeProviderActionId =
  | "scan-docker-gateways"
  | "install-via-wsl"
  | "import-existing-state"
  | "open-install-guide";

export type RuntimeProviderActionKind = "scan" | "install" | "import" | "docs";

export interface RuntimeProviderAction {
  id: RuntimeProviderActionId;
  kind: RuntimeProviderActionKind;
  label: string;
  detail: string;
  primary: boolean;
}

export interface RuntimeProviderActionResult {
  success: boolean;
  message?: string;
  error?: string;
  payload?: unknown;
}

export interface RuntimeProviderSnapshot {
  definition: RuntimeProviderDefinition;
  status: RuntimeProviderRegistryStatus;
  available: boolean;
  detected: boolean;
  detectedCount: number;
  detectedPath: string | null;
  detectedCommand: string | null;
  currentConnectionMode: "local" | "remote" | "ssh" | null;
  actions: readonly RuntimeProviderAction[];
  summary: string;
  detail: string;
}

export interface TaskOrchestratorCapabilities {
  canManageAgents: boolean;
  canAssignTasks: boolean;
  canDispatchWorkflows: boolean;
  canMirrorExternalBacklogs: boolean;
  canBridgeExternalHarness: boolean;
  canReuseExistingRuntimeConnections: boolean;
}

export interface TaskOrchestratorDefinition {
  id: TaskOrchestratorId;
  displayName: string;
  integrationStatus: RuntimeIntegrationStatus;
  integrationMode: TaskOrchestratorIntegrationMode;
  compatibleRuntimeProviderIds: readonly RuntimeProviderId[];
  capabilities: TaskOrchestratorCapabilities;
  notes: readonly string[];
}

export type TaskOrchestratorRegistryStatus =
  | "ready"
  | "available"
  | "optional"
  | "planned";

export interface TaskOrchestratorSnapshot {
  definition: TaskOrchestratorDefinition;
  status: TaskOrchestratorRegistryStatus;
  available: boolean;
  detected: boolean;
  enabled: boolean;
  detectedCommand: string | null;
  summary: string;
  detail: string;
}

export const DEFAULT_RUNTIME_PROVIDER_ID: RuntimeProviderId = "hermes";

export const DEFAULT_TASK_ORCHESTRATOR_ID: TaskOrchestratorId = "hermes";

export const RUNTIME_PROVIDER_CATALOG = [
  {
    id: "hermes",
    displayName: "Hermes Agent",
    role: "primary-runtime",
    integrationStatus: "current",
    onboardingSurface: "welcome",
    connectionModes: [
      "embedded-local",
      "local-gateway",
      "remote-gateway",
      "ssh-tunnel",
    ],
    capabilities: {
      canInstallLocally: true,
      canAttachToExistingLocalGateway: true,
      canAttachToRemoteGateway: true,
      canAttachViaSshTunnel: true,
      canDiscoverViaDocker: true,
      canImportExistingState: false,
      canDiscoverLocalCli: true,
      exposesChatGateway: true,
      supportsTaskExecution: true,
      supportsWorkflowDispatch: true,
    },
    preferredTaskOrchestratorIds: ["hermes", "ecc"],
    notes: [
      "Default Agent Desktop runtime and gateway owner.",
      "Already has truthful onboarding for local install, existing localhost gateway attach, remote endpoint attach, and SSH tunnel attach.",
    ],
  },
  {
    id: "ironclaw",
    displayName: "IronClaw",
    role: "gateway-handoff",
    integrationStatus: "current",
    onboardingSurface: "welcome",
    connectionModes: ["docker-gateway", "remote-gateway"],
    capabilities: {
      canInstallLocally: false,
      canAttachToExistingLocalGateway: false,
      canAttachToRemoteGateway: true,
      canAttachViaSshTunnel: false,
      canDiscoverViaDocker: true,
      canImportExistingState: false,
      canDiscoverLocalCli: false,
      exposesChatGateway: true,
      supportsTaskExecution: false,
      supportsWorkflowDispatch: false,
    },
    preferredTaskOrchestratorIds: ["hermes", "ecc"],
    notes: [
      "Treat as an attached gateway runtime, not a native Agent Desktop dashboard or scheduler.",
      "Keep Docker discovery scoped to truthful handoff of an already-running IronClaw gateway container.",
    ],
  },
  {
    id: "openclaw",
    displayName: "OpenClaw",
    role: "gateway-handoff",
    integrationStatus: "optional",
    onboardingSurface: "setup",
    connectionModes: ["local-gateway", "remote-gateway", "ssh-tunnel", "migration-import"],
    capabilities: {
      canInstallLocally: true,
      canAttachToExistingLocalGateway: true,
      canAttachToRemoteGateway: true,
      canAttachViaSshTunnel: true,
      canDiscoverViaDocker: true,
      canImportExistingState: true,
      canDiscoverLocalCli: true,
      exposesChatGateway: true,
      supportsTaskExecution: true,
      supportsWorkflowDispatch: true,
    },
    preferredTaskOrchestratorIds: ["openclaw", "ecc"],
    notes: [
      "OpenClaw can be attached through its HTTP compatibility surface when the gateway exposes chat completions and models endpoints.",
      "Agent Desktop can also attach to a remote OpenClaw gateway through the existing SSH tunnel flow when the compatibility endpoint is exposed on the tunneled port.",
      "Agent Desktop can hand off to WSL-guided OpenClaw onboarding on Windows, but it still does not bundle or silently manage the full OpenClaw runtime for you.",
      "Do not restore the removed Office or HQ mirror surfaces; keep OpenClaw integration focused on truthful gateway attach, migration, and task adapters.",
    ],
  },
] as const satisfies readonly RuntimeProviderDefinition[];

export const TASK_ORCHESTRATOR_CATALOG = [
  {
    id: "hermes",
    displayName: "Hermes Kanban and Dispatch",
    integrationStatus: "current",
    integrationMode: "native-core",
    compatibleRuntimeProviderIds: ["hermes", "ironclaw"],
    capabilities: {
      canManageAgents: true,
      canAssignTasks: true,
      canDispatchWorkflows: true,
      canMirrorExternalBacklogs: false,
      canBridgeExternalHarness: false,
      canReuseExistingRuntimeConnections: true,
    },
    notes: [
      "Best first orchestrator to surface because the runtime, gateway, and task primitives already live in the repo.",
      "If task orchestration returns to the UI, mount it as a new runtime or operations surface rather than the retired Office shell.",
    ],
  },
  {
    id: "openclaw",
    displayName: "OpenClaw task manager",
    integrationStatus: "optional",
    integrationMode: "optional-runtime",
    compatibleRuntimeProviderIds: ["openclaw"],
    capabilities: {
      canManageAgents: true,
      canAssignTasks: true,
      canDispatchWorkflows: true,
      canMirrorExternalBacklogs: false,
      canBridgeExternalHarness: false,
      canReuseExistingRuntimeConnections: false,
    },
    notes: [
      "Keep this behind an explicit adapter instead of reviving the legacy Office or HQ implementation.",
      "Only enable it after OpenClaw graduates from migration-only to an optional attachable runtime.",
    ],
  },
  {
    id: "ecc",
    displayName: "ECC harness bridge",
    integrationStatus: "planned",
    integrationMode: "optional-bridge",
    compatibleRuntimeProviderIds: ["hermes", "ironclaw", "openclaw"],
    capabilities: {
      canManageAgents: true,
      canAssignTasks: true,
      canDispatchWorkflows: true,
      canMirrorExternalBacklogs: true,
      canBridgeExternalHarness: true,
      canReuseExistingRuntimeConnections: true,
    },
    notes: [
      "ECC should remain an optional external harness backend instead of an embedded runtime dashboard.",
      "Surface it through CLI detection, orchestrator settings, and bridge commands once a stable adapter contract exists.",
    ],
  },
] as const satisfies readonly TaskOrchestratorDefinition[];

export function getRuntimeProviderDefinition(
  id: RuntimeProviderId,
): RuntimeProviderDefinition {
  const provider = RUNTIME_PROVIDER_CATALOG.find((candidate) => candidate.id === id);

  if (!provider) {
    throw new Error(`Unknown runtime provider: ${id}`);
  }

  return provider;
}

export function getTaskOrchestratorDefinition(
  id: TaskOrchestratorId,
): TaskOrchestratorDefinition {
  const orchestrator = TASK_ORCHESTRATOR_CATALOG.find(
    (candidate) => candidate.id === id,
  );

  if (!orchestrator) {
    throw new Error(`Unknown task orchestrator: ${id}`);
  }

  return orchestrator;
}

/** Catalog entries that should be discovered as Docker containers.
 *
 *  Each entry maps a runtime provider id to the keywords we look for
 *  in a running container's name / image / compose-service plus the
 *  preferred published ports (highest priority first).
 *
 *  Driven by the orch catalog so adding a new Docker-discoverable
 *  runtime is a one-line change in `RUNTIME_PROVIDER_CATALOG`.
 */
export interface DockerDiscoverableRuntimeTarget {
  id: RuntimeProviderId;
  displayName: string;
  keywords: readonly string[];
  preferredPorts: readonly number[];
}

const DOCKER_DISCOVERY_TARGETS: Record<
  RuntimeProviderId,
  DockerDiscoverableRuntimeTarget
> = {
  hermes: {
    id: "hermes",
    displayName: "Hermes Agent",
    keywords: ["hermes-agent", "hermes_agent", "hermesagent", "hermes"],
    preferredPorts: [8741, 8742, 8281, 3000, 8080],
  },
  ironclaw: {
    id: "ironclaw",
    displayName: "IronClaw",
    keywords: ["ironclaw", "iron-claw"],
    preferredPorts: [8281, 3000, 8080, 8644, 8789, 8642],
  },
  openclaw: {
    id: "openclaw",
    displayName: "OpenClaw",
    keywords: ["openclaw", "open-claw"],
    preferredPorts: [18789, 3000, 8080, 8789],
  },
};

/** Returns the subset of `RUNTIME_PROVIDER_CATALOG` whose
 *  `capabilities.canDiscoverViaDocker === true`, paired with the
 *  Docker-discoverable target definition (keywords + preferred ports).
 *
 *  Iteration order matches `RUNTIME_PROVIDER_CATALOG`, which is the
 *  human-meaningful precedence (Hermes first, then IronClaw, then
 *  OpenClaw). The renderer and the docker-scan main module both
 *  consume this list, so they cannot drift out of sync. */
export function listDockerDiscoverableRuntimes(): readonly DockerDiscoverableRuntimeTarget[] {
  return RUNTIME_PROVIDER_CATALOG.filter(
    (provider) => provider.capabilities.canDiscoverViaDocker,
  ).map((provider) => DOCKER_DISCOVERY_TARGETS[provider.id]);
}