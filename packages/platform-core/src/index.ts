export type PlatformView =
  | "chat"
  | "sessions"
  | "agents"
  | "persona"
  | "kanban"
  | "codegraph"
  | "everos"
  | "models"
  | "providers"
  | "skills"
  | "memory"
  | "tools"
  | "schedules"
  | "console"
  | "workspace"
  | "gateway"
  | "operations"
  | "settings";

// ── Agent-feature shared types ──────────────────────────────────────────────

export interface AgentChatMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  model?: string;
  timestamp: number;
}

export interface AgentChatSession {
  id: string;
  title: string;
  startedAt: number;
  messageCount: number;
  model: string;
  source: string;
}

export type AgentSessionHistoryItem =
  | {
      kind: "user";
      id: number;
      content: string;
      timestamp: number;
    }
  | {
      kind: "assistant";
      id: number;
      content: string;
      timestamp: number;
    }
  | {
      kind: "reasoning";
      id: number;
      assistantId: number;
      text: string;
      timestamp: number;
    }
  | {
      kind: "tool_call";
      id: number;
      assistantId: number;
      callId: string;
      name: string;
      args: string;
      timestamp: number;
    }
  | {
      kind: "tool_result";
      id: number;
      callId: string;
      name: string;
      content: string;
      timestamp: number;
    };

export interface AgentProfile {
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
  kanbanBoardSlug?: string | null;
  skillCount: number;
  gatewayRunning: boolean;
}

export interface AgentModelEndpoint {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  createdAt: number;
}

export interface AgentProviderConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  type: string;
}

export interface AgentSkill {
  name: string;
  category: string;
  description: string;
  path: string;
}

export interface AgentMemoryEntry {
  id: string;
  content: string;
  label: string;
  createdAt: number;
}

export interface AgentTool {
  name: string;
  description: string;
  endpoint: string;
  type: string;
  enabled?: boolean;
}

export interface AgentSchedule {
  id: string;
  name: string;
  cron: string;
  prompt: string;
  profile: string;
  kanbanBoardSlug?: string | null;
  enabled: boolean;
  nextRunAt: number | null;
  lastRunAt: number | null;
}

export interface CodeGraphRepoSummary {
  id: string;
  name: string;
  repoPath: string;
  description: string;
  selected: boolean;
  exists: boolean;
  initialized: boolean;
  fileCount: number | null;
  nodeCount: number | null;
  edgeCount: number | null;
  detectedFrameworks: string[];
}

export interface CodeGraphEntrypoint {
  id: string;
  repoId: string;
  name: string;
  target: string;
  notes: string;
}

export interface CodeGraphQueryTemplate {
  id: string;
  repoId: string | null;
  name: string;
  mode: "context" | "search" | "impact" | "workflow";
  query: string;
}

export interface EverOsHarness {
  id: string;
  name: string;
  description: string;
  memoryNamespace: string;
  profile: string;
  scheduleId: string | null;
  loopPrompt: string;
  enabled: boolean;
}

export type AgentDispatchRunSource = "manual" | "schedule" | "scheduler";

export type AgentDispatchRunStatus = "queued" | "active" | "done" | "failed";

export interface AgentDispatchContextOverride {
  codegraphRepoId?: string | null;
  codegraphQueryIds?: string[];
  everosHarnessIds?: string[];
}

export interface AgentDispatchCodeGraphContext {
  repoId: string | null;
  repoName: string | null;
  repoPath: string | null;
  entrypoints: CodeGraphEntrypoint[];
  queries: CodeGraphQueryTemplate[];
}

export interface AgentDispatchRunContext {
  profile: string;
  prompt: string;
  kanbanBoardSlug: string | null;
  selection: AgentDispatchContextOverride | null;
  codegraph: AgentDispatchCodeGraphContext | null;
  everosHarnesses: EverOsHarness[];
}

export interface AgentDispatchRun {
  id: string;
  source: AgentDispatchRunSource;
  targetType: "profile" | "schedule";
  targetId: string | null;
  targetName: string;
  taskId: string | null;
  taskStatus: string | null;
  status: AgentDispatchRunStatus;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  output: string | null;
  error: string | null;
  sessionId: string | null;
  context: AgentDispatchRunContext;
}

export interface KanbanTask {
  id: string;
  title: string;
  body: string | null;
  status: string;
  priority: number;
  assignee: string | null;
  skills: string[];
  createdAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface KanbanBoard {
  slug: string;
  name: string;
  description: string | null;
  isCurrent: boolean;
  counts: Record<string, number>;
  total: number;
}

export type AppKind =
  | "runtime"
  | "workspace"
  | "creative"
  | "memory"
  | "intelligence"
  | "utility";

export type IntegrationKind =
  | "embedded-ui"
  | "http-sidecar"
  | "openai-compatible"
  | "mcp-server"
  | "web-companion"
  | "runtime-service";

export type CapabilityPlane =
  | "ai"
  | "automation"
  | "memory"
  | "integrations"
  | "media"
  | "security";

export interface PlatformCapability {
  id: string;
  name: string;
  plane: CapabilityPlane;
  description: string;
}

export interface PlatformSlot {
  id: string;
  name: string;
  description: string;
}

export interface PlatformSlotSummary extends PlatformSlot {
  compatibleAppCount: number;
  enabledAppCount: number;
}

export type PlatformAppStatus =
  | "reference"
  | "phase-1"
  | "candidate"
  | "custom";

export interface PlatformAppDescriptor {
  id: string;
  name: string;
  tagline: string;
  description: string;
  kind: AppKind;
  integration: IntegrationKind;
  source: string;
  defaultEnabled: boolean;
  supportedSlots: string[];
  capabilityIds: string[];
  status: PlatformAppStatus;
}

export interface PlatformAppSummary extends PlatformAppDescriptor {
  enabled: boolean;
  capabilityCount: number;
}

export interface PlatformCustomAppDescriptor extends PlatformAppDescriptor {
  status: "custom";
  runtimeSurface: PlatformRuntimeSurfaceDescriptor;
}

export interface PlatformCustomAppOnboardingInput {
  nodeKey: string;
  name: string;
  kind: AppKind;
  integration: IntegrationKind;
}

export interface PlatformWorkspaceHubDescriptor {
  id: string;
  name: string;
  objective: string;
  description: string;
  slotIds: string[];
  appIds: string[];
  readyThreshold: number;
}

export interface PlatformWorkspaceHubSummary
  extends PlatformWorkspaceHubDescriptor {
  enabledAppCount: number;
  status: "ready" | "assembling" | "planned";
}

export interface PlatformVerificationItem {
  id: string;
  name: string;
  description: string;
  status: "ready" | "assembling" | "attention";
  evidence: string;
}

export type PlatformMissionStage =
  | "recipe"
  | "build"
  | "verify"
  | "live"
  | "rollback";

export type PlatformServiceTier = "free" | "licensed" | "managed";

export interface PlatformMissionChecklistItem {
  id: string;
  label: string;
}

export interface PlatformMissionCardDescriptor {
  id: string;
  title: string;
  workspaceHubId: string;
  summary: string;
  appIds: string[];
  defaultStage: PlatformMissionStage;
  defaultServiceTier: PlatformServiceTier;
  checklist: PlatformMissionChecklistItem[];
}

export interface PlatformMissionCardState {
  cardId: string;
  stage: PlatformMissionStage;
  serviceTier: PlatformServiceTier;
  completedChecklistIds: string[];
}

export interface PlatformMissionCardSummary
  extends PlatformMissionCardDescriptor {
  stage: PlatformMissionStage;
  serviceTier: PlatformServiceTier;
  completedChecklistIds: string[];
  completedChecklistCount: number;
  totalChecklistCount: number;
  workspaceName: string;
  gating: string;
}

export type PlatformRuntimeProviderId = "hermes" | "ironclaw" | "openclaw";

export type PlatformTaskOrchestratorId = "hermes" | "openclaw" | "ecc";

export type PlatformRuntimeProviderRole =
  | "primary-runtime"
  | "gateway-handoff"
  | "migration-source";

export type PlatformRuntimeProviderIntegrationStatus =
  | "current"
  | "optional"
  | "planned";

export type PlatformRuntimeConnectionMode =
  | "embedded-local"
  | "local-gateway"
  | "remote-gateway"
  | "ssh-tunnel"
  | "docker-gateway"
  | "migration-import";

export type PlatformTaskOrchestratorIntegrationMode =
  | "native-core"
  | "optional-runtime"
  | "optional-bridge";

export interface PlatformRuntimeProviderCapabilities {
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

export interface PlatformRuntimeProviderDescriptor {
  id: PlatformRuntimeProviderId;
  displayName: string;
  role: PlatformRuntimeProviderRole;
  integrationStatus: PlatformRuntimeProviderIntegrationStatus;
  linkedAppId: string | null;
  linkedRuntimeSurfaceAppId: string | null;
  connectionModes: readonly PlatformRuntimeConnectionMode[];
  remoteExampleUrl: string;
  sshRemotePort: number | null;
  preferredTaskOrchestratorIds: readonly PlatformTaskOrchestratorId[];
  capabilities: PlatformRuntimeProviderCapabilities;
  notes: readonly string[];
}

export interface PlatformRuntimeProviderSummary
  extends PlatformRuntimeProviderDescriptor {
  selected: boolean;
  appEnabled: boolean;
  surfaceConfigured: boolean;
  surfaceUrl: string | null;
  surfaceMode: PlatformRuntimeSurfaceMode | null;
  laneState: PlatformRuntimeLaneState;
  dockerCandidateCount: number;
  passedSmokeTargetCount: number;
  failedSmokeTargetCount: number;
  readySmokeTargetCount: number;
  totalSmokeTargetCount: number;
}

export type HermesRuntimeInstallTargetState = "fresh" | "update" | "replace";

export type HermesRuntimeVerificationState = "unknown" | "verified" | "failed";

export type HermesRuntimeHomeState = "empty" | "partial" | "installed";

export type HermesRuntimeOperationKind =
  | "install"
  | "repair"
  | "update"
  | "verify"
  | "doctor"
  | "start-gateway"
  | "stop-gateway";

export type HermesRuntimeOperationStatus = "running" | "succeeded" | "failed";

export type HermesRuntimeOperationCheckpointState =
  | "pending"
  | "active"
  | "completed";

export interface HermesRuntimeOperationCheckpoint {
  id: string;
  label: string;
  state: HermesRuntimeOperationCheckpointState;
}

export interface HermesRuntimeOperationSummary {
  kind: HermesRuntimeOperationKind;
  status: HermesRuntimeOperationStatus;
  startedAt: number;
  completedAt: number | null;
  step: number;
  totalSteps: number;
  title: string;
  detail: string | null;
  log: string | null;
  rollbackHint: string | null;
  checkpoints: HermesRuntimeOperationCheckpoint[];
}

export interface HermesRuntimeLifecycleSummary {
  hermesHome: string;
  repoPath: string;
  installTargetState: HermesRuntimeInstallTargetState;
  homeState: HermesRuntimeHomeState;
  homeStateDetail: string | null;
  overrideActive: boolean;
  installed: boolean;
  configured: boolean;
  hasApiKey: boolean;
  gatewayPidPresent: boolean;
  gatewayRunning: boolean;
  gatewayReady: boolean;
  gatewayReadyDetail: string | null;
  gatewayLogPath: string | null;
  gatewayLogTail: string | null;
  activeProfile: string | null;
  version: string | null;
  verificationState: HermesRuntimeVerificationState;
  verificationDetail: string | null;
  lastVerifiedAt: number | null;
  lastDoctorAt: number | null;
  lastDoctorOutput: string | null;
  operation: HermesRuntimeOperationSummary | null;
}

export interface PlatformTaskOrchestratorCapabilities {
  canManageAgents: boolean;
  canAssignTasks: boolean;
  canDispatchWorkflows: boolean;
  canMirrorExternalBacklogs: boolean;
  canBridgeExternalHarness: boolean;
  canReuseExistingRuntimeConnections: boolean;
}

export interface PlatformTaskOrchestratorDescriptor {
  id: PlatformTaskOrchestratorId;
  displayName: string;
  integrationStatus: PlatformRuntimeProviderIntegrationStatus;
  integrationMode: PlatformTaskOrchestratorIntegrationMode;
  compatibleRuntimeProviderIds: readonly PlatformRuntimeProviderId[];
  capabilities: PlatformTaskOrchestratorCapabilities;
  notes: readonly string[];
}

export interface PlatformTaskOrchestratorSummary
  extends PlatformTaskOrchestratorDescriptor {
  selected: boolean;
  compatibleSelectedRuntime: boolean;
  compatibleConfiguredRuntimeCount: number;
}

export type PlatformSurfaceProtocol = "http" | "https";

export type PlatformRuntimeSurfaceMode = "desktop" | "docker" | "remote";

export type PlatformRuntimeLaneState =
  | "unstaged"
  | "staged"
  | "verified"
  | "degraded";

export type PlatformSmokeTargetTransport = "remote" | "ssh" | "tcp";

export type PlatformSmokeTargetStatus = "draft" | "ready" | "passed" | "failed";

export type PlatformDockerNodeHealth =
  | "healthy"
  | "running"
  | "unhealthy"
  | "starting"
  | "offline"
  | "unknown";

export type PlatformDockerProjectHealth = "healthy" | "degraded" | "offline";

export type PlatformDockerBindingMode = "automatic" | "manual" | "unmatched";

export interface PlatformDockerNodeBinding {
  nodeKey: string;
  appId: string;
}

export interface PlatformDockerProjectDiagnostic {
  serviceName: string;
  health: PlatformDockerNodeHealth;
  message: string;
}

export interface PlatformDockerPortBinding {
  host: string;
  hostPort: number;
  containerPort: number;
  protocol: string;
}

export interface PlatformDockerNodeSummary {
  id: string;
  name: string;
  bindingKey: string;
  image: string;
  state: string;
  status: string;
  health: PlatformDockerNodeHealth;
  matchMode: PlatformDockerBindingMode;
  composeProject: string | null;
  composeService: string | null;
  ports: PlatformDockerPortBinding[];
  exposedPorts: string[];
  networkNames: string[];
  mountTargets: string[];
  startedAt: string | null;
  finishedAt: string | null;
  exitCode: number | null;
  diagnostic: string | null;
  preferredPort: PlatformDockerPortBinding | null;
  preferredPortReason: string | null;
  matchedAppId: string | null;
}

export interface PlatformDockerProjectSummary {
  id: string;
  label: string;
  health: PlatformDockerProjectHealth;
  nodeCount: number;
  runningCount: number;
  healthyCount: number;
  downCount: number;
  matchedNodeCount: number;
  serviceNames: string[];
  diagnostics: PlatformDockerProjectDiagnostic[];
}

export type PlatformDockerDiscoveryStatus =
  | "connected"
  | "empty"
  | "unavailable";

export interface PlatformDockerDiscoverySummary {
  status: PlatformDockerDiscoveryStatus;
  message: string;
  lastScannedAt: string | null;
  projects: PlatformDockerProjectSummary[];
  nodes: PlatformDockerNodeSummary[];
}

export interface PlatformRuntimeSurfaceDescriptor {
  appId: string;
  label: string;
  notes: string;
  defaultProtocol: PlatformSurfaceProtocol;
  defaultHost: string;
  defaultPort: number | null;
  defaultPath: string;
  defaultMode: PlatformRuntimeSurfaceMode;
}

export interface PlatformRuntimeSurfaceState {
  appId: string;
  protocol: PlatformSurfaceProtocol;
  host: string;
  port: number | null;
  path: string;
  mode: PlatformRuntimeSurfaceMode;
}

export interface PlatformRuntimeSurfaceSummary
  extends PlatformRuntimeSurfaceDescriptor,
    PlatformRuntimeSurfaceState {
  url: string | null;
  appEnabled: boolean;
}

export interface PlatformRuntimeSurfacePatch {
  protocol?: PlatformSurfaceProtocol;
  host?: string;
  port?: number | null;
  path?: string;
  mode?: PlatformRuntimeSurfaceMode;
}

export interface PlatformSmokeTargetState {
  id: string;
  label: string;
  runtimeProviderId: PlatformRuntimeProviderId;
  transport: PlatformSmokeTargetTransport;
  remoteUrl: string;
  tcpHost: string;
  tcpPort: number | null;
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  sshKeyPath: string;
  sshRemotePort: number | null;
  notes: string;
  status: PlatformSmokeTargetStatus;
  lastRunAt: string | null;
  lastRunDetail: string | null;
}

export interface PlatformSmokeTargetSummary extends PlatformSmokeTargetState {
  ready: boolean;
  providerDisplayName: string;
  selectedRuntime: boolean;
  suggestedProbeTarget: string;
  linkedSurfaceUrl: string | null;
}

export interface PlatformSmokeTargetPatch {
  label?: string;
  remoteUrl?: string;
  tcpHost?: string;
  tcpPort?: number | null;
  sshHost?: string;
  sshPort?: number | null;
  sshUsername?: string;
  sshKeyPath?: string;
  sshRemotePort?: number | null;
  notes?: string;
}

export interface PlatformSmokeTargetProbeResult {
  status: "passed" | "failed";
  detail?: string | null;
  ranAt?: string;
}

export interface PlatformState {
  enabledAppIds: string[];
  activeView: PlatformView;
  activeRuntimeProviderId: PlatformRuntimeProviderId;
  activeTaskOrchestratorId: PlatformTaskOrchestratorId;
  missionCardStates: PlatformMissionCardState[];
  runtimeSurfaceStates: PlatformRuntimeSurfaceState[];
  smokeTargets: PlatformSmokeTargetState[];
  dockerNodeBindings: PlatformDockerNodeBinding[];
  customApps: PlatformCustomAppDescriptor[];
}

export interface PlatformOverview {
  state: PlatformState;
  slots: PlatformSlotSummary[];
  capabilities: PlatformCapability[];
  apps: PlatformAppSummary[];
  workspaceHubs: PlatformWorkspaceHubSummary[];
  verification: PlatformVerificationItem[];
  missionBoard: PlatformMissionCardSummary[];
  runtimeProviders: PlatformRuntimeProviderSummary[];
  taskOrchestrators: PlatformTaskOrchestratorSummary[];
  runtimeSurfaces: PlatformRuntimeSurfaceSummary[];
  smokeTargets: PlatformSmokeTargetSummary[];
  docker: PlatformDockerDiscoverySummary;
  stats: {
    totalApps: number;
    enabledApps: number;
    capabilityCount: number;
    slotCount: number;
    integrationKinds: number;
    readyWorkspaceHubs: number;
    liveMissionCards: number;
    managedMissionCards: number;
    configuredRuntimeSurfaces: number;
    readySmokeTargets: number;
    dockerNodeCount: number;
    liveDockerNodes: number;
    healthyDockerNodes: number;
    downDockerNodes: number;
    composeProjects: number;
  };
}

export const PLATFORM_SLOTS: readonly PlatformSlot[] = [
  {
    id: "runtime-hub",
    name: "Runtime Hub",
    description: "Long-lived agent runtimes and assistant backends.",
  },
  {
    id: "creative-studio",
    name: "Creative Studio",
    description: "Artifact generation, layout, and design surfaces.",
  },
  {
    id: "memory-plane",
    name: "Memory Plane",
    description: "Durable context, note graphs, and personal knowledge layers.",
  },
  {
    id: "intel-hub",
    name: "Intelligence Hub",
    description: "Monitoring, situational analysis, and research-heavy domains.",
  },
  {
    id: "automation-lane",
    name: "Automation Lane",
    description: "Scheduling, delegation, workflows, and always-on jobs.",
  },
  {
    id: "utility-bus",
    name: "Utility Bus",
    description: "MCP servers, code intelligence, media, and shared services.",
  },
  {
    id: "communications",
    name: "Communications",
    description: "Chat, gateways, mobile surfaces, and collaboration clients.",
  },
  {
    id: "ops-console",
    name: "Ops Console",
    description: "Operational visibility, approvals, and system diagnostics.",
  },
] as const;

export const PLATFORM_CAPABILITIES: readonly PlatformCapability[] = [
  {
    id: "app-registry",
    name: "App Registry",
    plane: "automation",
    description: "A registry-driven catalog of apps, runtimes, and removable features.",
  },
  {
    id: "mcp-fabric",
    name: "MCP Fabric",
    plane: "integrations",
    description: "Shared Model Context Protocol servers mounted across compatible apps.",
  },
  {
    id: "openai-routing",
    name: "Model Routing",
    plane: "ai",
    description: "Common model access, OpenAI-compatible adapters, and runtime routing.",
  },
  {
    id: "skills-runtime",
    name: "Skills Runtime",
    plane: "ai",
    description: "File-based skills, prompts, and reusable task patterns.",
  },
  {
    id: "durable-memory",
    name: "Durable Memory",
    plane: "memory",
    description: "Profiles, notes, knowledge graphs, and long-lived context stores.",
  },
  {
    id: "scheduled-automation",
    name: "Scheduled Automation",
    plane: "automation",
    description: "Cron, triggers, delegation, and unattended task lanes.",
  },
  {
    id: "secure-approvals",
    name: "Secure Approvals",
    plane: "security",
    description: "Approval flows, sandboxing, and privileged-action guardrails.",
  },
  {
    id: "media-services",
    name: "Media Services",
    plane: "media",
    description: "TTS, image, video, and artifact rendering utilities.",
  },
  {
    id: "observability",
    name: "Observability",
    plane: "integrations",
    description: "Health checks, topology status, and runtime inspection surfaces.",
  },
  {
    id: "multi-surface-ui",
    name: "Multi-Surface UI",
    plane: "integrations",
    description: "Desktop, web, and companion surfaces sharing the same platform contract.",
  },
] as const;

export const PLATFORM_APPS: readonly PlatformAppDescriptor[] = [
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    tagline: "Self-improving runtime with skills, memory, and gateway support.",
    description:
      "Primary candidate for one of the long-lived assistant runtimes inside the broader Cubecloud platform.",
    kind: "runtime",
    integration: "runtime-service",
    source: "JZKK720/hermes-agent",
    defaultEnabled: true,
    supportedSlots: ["runtime-hub", "memory-plane", "automation-lane", "communications"],
    capabilityIds: ["skills-runtime", "durable-memory", "scheduled-automation", "openai-routing", "secure-approvals"],
    status: "phase-1",
  },
  {
    id: "ironclaw",
    name: "IronClaw",
    tagline: "Security-first runtime with sandboxed tool execution.",
    description:
      "Alternative runtime focused on WASM sandboxing, approvals, and privacy-centric orchestration.",
    kind: "runtime",
    integration: "runtime-service",
    source: "JZKK720/ironclaw",
    defaultEnabled: false,
    supportedSlots: ["runtime-hub", "utility-bus", "ops-console"],
    capabilityIds: ["openai-routing", "mcp-fabric", "secure-approvals", "observability"],
    status: "candidate",
  },
  {
    id: "hermes-webui",
    name: "Hermes WebUI",
    tagline: "Companion client for Hermes across web and mobile.",
    description:
      "Useful as a browser-first or phone-friendly companion surface rather than the shell itself.",
    kind: "workspace",
    integration: "web-companion",
    source: "JZKK720/hermes-webui",
    defaultEnabled: true,
    supportedSlots: ["communications", "runtime-hub"],
    capabilityIds: ["multi-surface-ui", "durable-memory"],
    status: "candidate",
  },
  {
    id: "open-design",
    name: "Open Design",
    tagline: "Creative workstation for design artifacts and structured prompts.",
    description:
      "Strong candidate for a bundled creative app with a daemon plus sandboxed preview model.",
    kind: "creative",
    integration: "embedded-ui",
    source: "JZKK720/open-design",
    defaultEnabled: true,
    supportedSlots: ["creative-studio", "utility-bus"],
    capabilityIds: ["skills-runtime", "media-services", "mcp-fabric"],
    status: "phase-1",
  },
  {
    id: "open-html",
    name: "HTML Anything",
    tagline: "Agentic HTML studio for documents, decks, and export surfaces.",
    description:
      "Focused artifact-generation surface that pairs naturally with the broader creative studio lane.",
    kind: "creative",
    integration: "embedded-ui",
    source: "JZKK720/open-html",
    defaultEnabled: true,
    supportedSlots: ["creative-studio"],
    capabilityIds: ["skills-runtime", "media-services"],
    status: "phase-1",
  },
  {
    id: "rowboat",
    name: "Rowboat",
    tagline: "Local-first memory graph and work intelligence companion.",
    description:
      "Useful reference and candidate app for persistent knowledge graphs, live notes, and MCP-backed memory.",
    kind: "memory",
    integration: "web-companion",
    source: "JZKK720/rowboat",
    defaultEnabled: false,
    supportedSlots: ["memory-plane", "communications"],
    capabilityIds: ["durable-memory", "mcp-fabric", "scheduled-automation"],
    status: "candidate",
  },
  {
    id: "openhuman",
    name: "OpenHuman",
    tagline: "Personal AI harness with deep integrations and local memory.",
    description:
      "Candidate intelligence and integration layer, likely process-isolated because of operational and licensing constraints.",
    kind: "intelligence",
    integration: "runtime-service",
    source: "JZKK720/openhuman",
    defaultEnabled: false,
    supportedSlots: ["memory-plane", "communications", "creative-studio"],
    capabilityIds: ["durable-memory", "multi-surface-ui", "media-services", "openai-routing"],
    status: "candidate",
  },
  {
    id: "shadowbroker",
    name: "ShadowBroker",
    tagline: "Specialized geospatial intelligence and monitoring domain app.",
    description:
      "A domain-specific intelligence surface best treated as an optional standalone integration.",
    kind: "intelligence",
    integration: "http-sidecar",
    source: "JZKK720/Shadowbroker",
    defaultEnabled: false,
    supportedSlots: ["intel-hub", "ops-console"],
    capabilityIds: ["observability", "secure-approvals"],
    status: "candidate",
  },
  {
    id: "codegraph",
    name: "CodeGraph",
    tagline: "Semantic code intelligence over MCP.",
    description:
      "Optional code-intelligence surface for navigation, trace, callers, impact analysis, and faster agent context building without pretending to be a runtime lane.",
    kind: "intelligence",
    integration: "mcp-server",
    source: "JZKK720/codegraph",
    defaultEnabled: true,
    supportedSlots: ["intel-hub", "utility-bus", "ops-console"],
    capabilityIds: ["mcp-fabric", "observability"],
    status: "phase-1",
  },
  {
    id: "everos",
    name: "EverOS",
    tagline: "Persistent memory, harnesses, and self-evolving agent loops.",
    description:
      "Memory operating system surface for EverCore-backed harnesses, loop configurations, and durable agent knowledge workflows.",
    kind: "memory",
    integration: "http-sidecar",
    source: "EverMind-AI/EverOS",
    defaultEnabled: false,
    supportedSlots: ["memory-plane", "utility-bus", "ops-console"],
    capabilityIds: ["durable-memory", "scheduled-automation", "observability"],
    status: "candidate",
  },
  {
    id: "supertonic",
    name: "Supertonic",
    tagline: "On-device multilingual TTS and media service.",
    description:
      "A strong candidate for the shared media lane via local HTTP sidecar integration.",
    kind: "utility",
    integration: "http-sidecar",
    source: "JZKK720/supertonic",
    defaultEnabled: false,
    supportedSlots: ["utility-bus", "creative-studio"],
    capabilityIds: ["media-services"],
    status: "candidate",
  },
] as const;

export const PLATFORM_WORKSPACE_HUBS: readonly PlatformWorkspaceHubDescriptor[] =
  [
    {
      id: "mission-control",
      name: "Mission Control",
      objective: "Route long-lived agent work through one visible operator surface.",
      description:
        "Keeps orchestration, runtime handoff, and companion UI surfaces mounted in one operator view rather than scattered across terminals.",
      slotIds: ["runtime-hub", "automation-lane", "communications"],
      appIds: ["hermes-agent", "hermes-webui"],
      readyThreshold: 2,
    },
    {
      id: "creative-factory",
      name: "Creative Factory",
      objective: "Turn agent prompts into layouts, media, and exportable artifacts.",
      description:
        "Matches the video's workflow OS idea by keeping design, HTML, and media services in a reusable creative lane.",
      slotIds: ["creative-studio", "utility-bus"],
      appIds: ["open-design", "open-html", "supertonic"],
      readyThreshold: 2,
    },
    {
      id: "memory-console",
      name: "Memory Console",
      objective: "Share durable context across agents instead of trapping it in one runtime.",
      description:
        "Supports the shared-memory and optional external-knowledge-store pattern described in the video.",
      slotIds: ["memory-plane", "communications"],
      appIds: ["hermes-agent", "rowboat", "openhuman"],
      readyThreshold: 2,
    },
    {
      id: "trust-and-ops",
      name: "Trust and Ops",
      objective: "Keep approvals, health, and high-risk integrations operator-visible.",
      description:
        "Carries the transcript's insistence on manual verification, rollback, and visible health instead of trusting logs alone.",
      slotIds: ["ops-console", "intel-hub", "utility-bus"],
      appIds: ["ironclaw", "codegraph", "shadowbroker"],
      readyThreshold: 2,
    },
  ] as const;

const PLATFORM_MISSION_STAGES: readonly PlatformMissionStage[] = [
  "recipe",
  "build",
  "verify",
  "live",
  "rollback",
] as const;

const PLATFORM_VIEWS: readonly PlatformView[] = [
  "chat",
  "sessions",
  "agents",
  "persona",
  "kanban",
  "codegraph",
  "everos",
  "models",
  "providers",
  "skills",
  "memory",
  "tools",
  "schedules",
  "console",
  "workspace",
  "gateway",
  "operations",
  "settings",
] as const;

const PLATFORM_SERVICE_TIERS: readonly PlatformServiceTier[] = [
  "free",
  "licensed",
  "managed",
] as const;

const PLATFORM_RUNTIME_PROVIDER_IDS: readonly PlatformRuntimeProviderId[] = [
  "hermes",
  "ironclaw",
  "openclaw",
] as const;

const PLATFORM_TASK_ORCHESTRATOR_IDS: readonly PlatformTaskOrchestratorId[] = [
  "hermes",
  "openclaw",
  "ecc",
] as const;

const PLATFORM_SURFACE_PROTOCOLS: readonly PlatformSurfaceProtocol[] = [
  "http",
  "https",
] as const;

const PLATFORM_RUNTIME_SURFACE_MODES: readonly PlatformRuntimeSurfaceMode[] = [
  "desktop",
  "docker",
  "remote",
] as const;

const PLATFORM_SMOKE_TARGET_TRANSPORTS: readonly PlatformSmokeTargetTransport[] = [
  "remote",
  "ssh",
  "tcp",
] as const;

const PLATFORM_SMOKE_TARGET_STATUSES: readonly PlatformSmokeTargetStatus[] = [
  "draft",
  "ready",
  "passed",
  "failed",
] as const;

export const PLATFORM_MISSION_CARDS: readonly PlatformMissionCardDescriptor[] =
  [
    {
      id: "hermes-mission-surface",
      title: "Mount Hermes mission surface",
      workspaceHubId: "mission-control",
      summary:
        "Attach the Hermes runtime, companion UI, and shared context into one visible operator lane instead of leaving the workflow in terminal tabs.",
      appIds: ["hermes-agent", "hermes-webui"],
      defaultStage: "recipe",
      defaultServiceTier: "free",
      checklist: [
        { id: "recipe-reviewed", label: "Recipe and downsides reviewed" },
        { id: "runtime-mounted", label: "Runtime mounted in the shell" },
        { id: "companion-visible", label: "Companion UI visible in navigation" },
        { id: "smoke-session", label: "Smoke session completed end to end" },
      ],
    },
    {
      id: "creative-studio-lane",
      title: "Creative studio lane",
      workspaceHubId: "creative-factory",
      summary:
        "Bundle Open Design, HTML Anything, and media services into a repeatable artifact workflow with clear add-on boundaries.",
      appIds: ["open-design", "open-html", "supertonic"],
      defaultStage: "verify",
      defaultServiceTier: "licensed",
      checklist: [
        { id: "workflow-brief", label: "Creative workflow brief captured" },
        { id: "artifact-preview", label: "Artifact preview renders correctly" },
        { id: "export-check", label: "Export path and output verified" },
        { id: "entitlement-copy", label: "Add-on entitlement copy reviewed" },
      ],
    },
    {
      id: "managed-service-fabric",
      title: "Managed service fabric",
      workspaceHubId: "trust-and-ops",
      summary:
        "Gate hosted MCP connectors, model maintenance, and approval logging behind visible entitlements and rollback-friendly operations.",
      appIds: ["codegraph", "ironclaw", "shadowbroker"],
      defaultStage: "recipe",
      defaultServiceTier: "managed",
      checklist: [
        { id: "entitlement-path", label: "Entitlement path defined" },
        { id: "approval-log", label: "Approval log visible in the shell" },
        { id: "rollback-route", label: "Rollback route rehearsed" },
        { id: "billing-sku", label: "Paid service tier and SKU reviewed" },
      ],
    },
  ] as const;

const REMOTE_GATEWAY_EXAMPLE_HOST = "192.168.1.100";

export const PLATFORM_RUNTIME_PROVIDERS: readonly PlatformRuntimeProviderDescriptor[] =
  [
    {
      id: "hermes",
      displayName: "Hermes Agent",
      role: "primary-runtime",
      integrationStatus: "current",
      linkedAppId: "hermes-agent",
      linkedRuntimeSurfaceAppId: "hermes-agent",
      connectionModes: [
        "embedded-local",
        "local-gateway",
        "remote-gateway",
        "ssh-tunnel",
      ],
      remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:8642/health`,
      sshRemotePort: 8642,
      preferredTaskOrchestratorIds: ["hermes", "ecc"],
      capabilities: {
        canInstallLocally: true,
        canAttachToExistingLocalGateway: true,
        canAttachToRemoteGateway: true,
        canAttachViaSshTunnel: true,
        canDiscoverViaDocker: false,
        canImportExistingState: false,
        canDiscoverLocalCli: true,
        exposesChatGateway: true,
        supportsTaskExecution: true,
        supportsWorkflowDispatch: true,
      },
      notes: [
        "Agent Desktop remains the source-of-truth runtime client for the Hermes lane.",
        "Use the remote health endpoint or SSH tunnel flow when the gateway already runs off-box.",
      ],
    },
    {
      id: "ironclaw",
      displayName: "IronClaw",
      role: "gateway-handoff",
      integrationStatus: "current",
      linkedAppId: "ironclaw",
      linkedRuntimeSurfaceAppId: "ironclaw",
      connectionModes: ["docker-gateway", "remote-gateway"],
      remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:8281/health`,
      sshRemotePort: null,
      preferredTaskOrchestratorIds: ["hermes", "ecc"],
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
      notes: [
        "Treat IronClaw as an attached gateway surface rather than a packaged desktop runtime.",
        "Prefer Docker discovery and published-port adoption before manual endpoint entry.",
      ],
    },
    {
      id: "openclaw",
      displayName: "OpenClaw",
      role: "gateway-handoff",
      integrationStatus: "optional",
      linkedAppId: null,
      linkedRuntimeSurfaceAppId: null,
      connectionModes: [
        "local-gateway",
        "remote-gateway",
        "ssh-tunnel",
        "migration-import",
      ],
      remoteExampleUrl: `http://${REMOTE_GATEWAY_EXAMPLE_HOST}:18789/v1/models`,
      sshRemotePort: 18789,
      preferredTaskOrchestratorIds: ["openclaw", "ecc"],
      capabilities: {
        canInstallLocally: true,
        canAttachToExistingLocalGateway: true,
        canAttachToRemoteGateway: true,
        canAttachViaSshTunnel: true,
        canDiscoverViaDocker: false,
        canImportExistingState: true,
        canDiscoverLocalCli: true,
        exposesChatGateway: true,
        supportsTaskExecution: true,
        supportsWorkflowDispatch: true,
      },
      notes: [
        "OpenClaw uses its HTTP compatibility surface for truthful dashboard and Agent Desktop attach.",
        "The shell can stage remote and SSH smoke targets even before a dedicated OpenClaw shell surface exists.",
      ],
    },
  ] as const;

export const PLATFORM_TASK_ORCHESTRATORS: readonly PlatformTaskOrchestratorDescriptor[] =
  [
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
        "Best first orchestration lane while Cubecloud Desktop remains Hermes-backed.",
        "Reuse the existing runtime attach flows instead of rebuilding orchestration around static shell menus.",
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
        "Keep OpenClaw orchestration behind an explicit runtime lane instead of reviving removed legacy surfaces.",
        "Use the smoke harness to validate compatibility and auth before treating this as the active orchestration lane.",
      ],
    },
    {
      id: "ecc",
      displayName: "ECC external bridge",
      integrationStatus: "optional",
      integrationMode: "optional-bridge",
      compatibleRuntimeProviderIds: ["hermes", "ironclaw", "openclaw"],
      capabilities: {
        canManageAgents: false,
        canAssignTasks: true,
        canDispatchWorkflows: true,
        canMirrorExternalBacklogs: true,
        canBridgeExternalHarness: true,
        canReuseExistingRuntimeConnections: true,
      },
      notes: [
        "Treat ECC as an optional external harness bridge, not the default shell runtime owner.",
        "Use it when you need a backlog or workflow bridge without changing the active runtime lane.",
      ],
    },
  ] as const;

const DEFAULT_PLATFORM_RUNTIME_PROVIDER_ID: PlatformRuntimeProviderId = "hermes";
const DEFAULT_PLATFORM_TASK_ORCHESTRATOR_ID: PlatformTaskOrchestratorId = "hermes";

const DEFAULT_SMOKE_TARGETS: readonly PlatformSmokeTargetState[] = [
  {
    id: "hermes-remote",
    label: "Hermes remote smoke",
    runtimeProviderId: "hermes",
    transport: "remote",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: null,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: 8642,
    notes: "Set the full Hermes probe URL, usually ending in /health.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "hermes-tcp",
    label: "Hermes local TCP smoke",
    runtimeProviderId: "hermes",
    transport: "tcp",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: 8644,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: null,
    notes: "Use this when the Hermes container is live on port 8644 but does not expose an HTTP health endpoint.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "hermes-ssh",
    label: "Hermes SSH smoke",
    runtimeProviderId: "hermes",
    transport: "ssh",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: null,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: 8642,
    notes: "Validate SSH handshake first, then use Agent Desktop to open the tunneled Hermes gateway.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "ironclaw-remote",
    label: "IronClaw remote smoke",
    runtimeProviderId: "ironclaw",
    transport: "remote",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: null,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: null,
    notes: "Use the published IronClaw health or operator endpoint from Docker or a remote host.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "ironclaw-tcp",
    label: "IronClaw gRPC/TCP smoke",
    runtimeProviderId: "ironclaw",
    transport: "tcp",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: 50051,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: null,
    notes: "Use this when the IronClaw data plane is reachable on port 50051 even if the operator HTTP surface is checked separately on 8281.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "openclaw-remote",
    label: "OpenClaw remote smoke",
    runtimeProviderId: "openclaw",
    transport: "remote",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: null,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: 18789,
    notes: "Probe the compatibility endpoint directly, usually /v1/models on the remote gateway.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
  {
    id: "openclaw-ssh",
    label: "OpenClaw SSH smoke",
    runtimeProviderId: "openclaw",
    transport: "ssh",
    remoteUrl: "",
    tcpHost: "",
    tcpPort: null,
    sshHost: "",
    sshPort: 22,
    sshUsername: "",
    sshKeyPath: "",
    sshRemotePort: 18789,
    notes: "Validate SSH access to the host that exposes OpenClaw compatibility on the remote port.",
    status: "draft",
    lastRunAt: null,
    lastRunDetail: null,
  },
] as const;

export const PLATFORM_RUNTIME_SURFACES: readonly PlatformRuntimeSurfaceDescriptor[] =
  [
    {
      appId: "hermes-agent",
      label: "Hermes runtime API",
      notes:
        "Existing local runtime endpoint used by Cubecloud Desktop. This default points at the Hermes health path on port 8642.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: 8642,
      defaultPath: "/health",
      defaultMode: "desktop",
    },
    {
      appId: "ironclaw",
      label: "IronClaw runtime surface",
      notes:
        "Link the published IronClaw container port that exposes the operator-facing surface or API.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "hermes-webui",
      label: "Hermes companion surface",
      notes:
        "Assign the published web client port when the Hermes WebUI container or remote host is running.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "open-design",
      label: "Open Design preview surface",
      notes:
        "Use the exposed daemon or preview port from the Open Design container when the creative surface is running.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "open-html",
      label: "HTML Anything export surface",
      notes:
        "Map the published HTML studio port when the export surface is available from a local or containerized runtime.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "rowboat",
      label: "Rowboat memory surface",
      notes:
        "Map the published Rowboat companion port when the local memory graph surface is running in Docker Desktop.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "openhuman",
      label: "OpenHuman runtime surface",
      notes:
        "Use the exposed OpenHuman container port when the personal AI harness is available locally.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "shadowbroker",
      label: "ShadowBroker intel surface",
      notes:
        "Attach the ShadowBroker container port that exposes the domain intelligence service for operator review.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "codegraph",
      label: "CodeGraph service surface",
      notes:
        "Map the published CodeGraph service port when the local code-intelligence node is running.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "everos",
      label: "EverOS memory surface",
      notes:
        "Attach the EverCore API surface when the local memory OS is running for persistent harness and loop management.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: 1995,
      defaultPath: "/",
      defaultMode: "docker",
    },
    {
      appId: "supertonic",
      label: "Supertonic media surface",
      notes:
        "Use the published Supertonic container port for the local media and speech service.",
      defaultProtocol: "http",
      defaultHost: "127.0.0.1",
      defaultPort: null,
      defaultPath: "/",
      defaultMode: "docker",
    },
  ] as const;

function isMissionStage(value: string): value is PlatformMissionStage {
  return (PLATFORM_MISSION_STAGES as readonly string[]).includes(value);
}

function isServiceTier(value: string): value is PlatformServiceTier {
  return (PLATFORM_SERVICE_TIERS as readonly string[]).includes(value);
}

function isRuntimeProviderId(value: string): value is PlatformRuntimeProviderId {
  return (PLATFORM_RUNTIME_PROVIDER_IDS as readonly string[]).includes(value);
}

function isTaskOrchestratorId(
  value: string,
): value is PlatformTaskOrchestratorId {
  return (PLATFORM_TASK_ORCHESTRATOR_IDS as readonly string[]).includes(value);
}

function isSurfaceProtocol(value: string): value is PlatformSurfaceProtocol {
  return (PLATFORM_SURFACE_PROTOCOLS as readonly string[]).includes(value);
}

function isRuntimeSurfaceMode(
  value: string,
): value is PlatformRuntimeSurfaceMode {
  return (PLATFORM_RUNTIME_SURFACE_MODES as readonly string[]).includes(value);
}

function isPlatformView(value: string): value is PlatformView {
  return (PLATFORM_VIEWS as readonly string[]).includes(value);
}

function isSmokeTargetTransport(
  value: string,
): value is PlatformSmokeTargetTransport {
  return (PLATFORM_SMOKE_TARGET_TRANSPORTS as readonly string[]).includes(value);
}

function isSmokeTargetStatus(value: string): value is PlatformSmokeTargetStatus {
  return (PLATFORM_SMOKE_TARGET_STATUSES as readonly string[]).includes(value);
}

function normalizeSurfacePath(path: string): string {
  const trimmed = path.trim();

  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function buildRuntimeSurfaceUrl(
  surface: Pick<PlatformRuntimeSurfaceState, "protocol" | "host" | "port" | "path">,
): string | null {
  const host = surface.host.trim();

  if (!host || surface.port == null || surface.port <= 0) {
    return null;
  }

  return `${surface.protocol}://${host}:${surface.port}${normalizeSurfacePath(surface.path)}`;
}

function smokeTargetReady(target: PlatformSmokeTargetState): boolean {
  if (target.transport === "remote") {
    return target.remoteUrl.trim().length > 0;
  }

  if (target.transport === "tcp") {
    return (
      target.tcpHost.trim().length > 0 &&
      target.tcpPort != null &&
      target.tcpPort > 0
    );
  }

  return target.sshHost.trim().length > 0 && target.sshUsername.trim().length > 0;
}

function normalizeSmokeTargetStatus(
  target: PlatformSmokeTargetState,
  candidate: Partial<PlatformSmokeTargetState> | undefined,
): PlatformSmokeTargetStatus {
  if (!smokeTargetReady(target)) {
    return "draft";
  }

  if (candidate?.status && isSmokeTargetStatus(candidate.status)) {
    return candidate.status;
  }

  return "ready";
}

function normalizeSmokeTargets(
  smokeTargets?: PlatformSmokeTargetState[],
): PlatformSmokeTargetState[] {
  const incoming = new Map((smokeTargets ?? []).map((target) => [target.id, target]));

  return DEFAULT_SMOKE_TARGETS.map((target) => {
    const candidate = incoming.get(target.id);
    const transport =
      candidate?.transport && isSmokeTargetTransport(candidate.transport)
        ? candidate.transport
        : target.transport;
    const tcpPort =
      candidate?.tcpPort === null
        ? null
        : typeof candidate?.tcpPort === "number" &&
            Number.isFinite(candidate.tcpPort) &&
            candidate.tcpPort > 0
          ? Math.trunc(candidate.tcpPort)
          : target.tcpPort;
    const sshPort =
      typeof candidate?.sshPort === "number" &&
      Number.isFinite(candidate.sshPort) &&
      candidate.sshPort > 0
        ? Math.trunc(candidate.sshPort)
        : target.sshPort;
    const sshRemotePort =
      candidate?.sshRemotePort === null
        ? null
        : typeof candidate?.sshRemotePort === "number" &&
            Number.isFinite(candidate.sshRemotePort) &&
            candidate.sshRemotePort > 0
          ? Math.trunc(candidate.sshRemotePort)
          : target.sshRemotePort;
    const normalized = {
      ...target,
      label:
        typeof candidate?.label === "string" && candidate.label.trim().length > 0
          ? candidate.label.trim()
          : target.label,
      runtimeProviderId:
        candidate?.runtimeProviderId && isRuntimeProviderId(candidate.runtimeProviderId)
          ? candidate.runtimeProviderId
          : target.runtimeProviderId,
      transport,
      remoteUrl:
        typeof candidate?.remoteUrl === "string"
          ? candidate.remoteUrl.trim()
          : target.remoteUrl,
      tcpHost:
        typeof candidate?.tcpHost === "string"
          ? candidate.tcpHost.trim()
          : target.tcpHost,
      tcpPort,
      sshHost:
        typeof candidate?.sshHost === "string"
          ? candidate.sshHost.trim()
          : target.sshHost,
      sshPort,
      sshUsername:
        typeof candidate?.sshUsername === "string"
          ? candidate.sshUsername.trim()
          : target.sshUsername,
      sshKeyPath:
        typeof candidate?.sshKeyPath === "string"
          ? candidate.sshKeyPath.trim()
          : target.sshKeyPath,
      sshRemotePort,
      notes:
        typeof candidate?.notes === "string" && candidate.notes.trim().length > 0
          ? candidate.notes.trim()
          : target.notes,
      status: target.status,
      lastRunAt:
        typeof candidate?.lastRunAt === "string" && candidate.lastRunAt.trim().length > 0
          ? candidate.lastRunAt
          : null,
      lastRunDetail:
        typeof candidate?.lastRunDetail === "string" &&
        candidate.lastRunDetail.trim().length > 0
          ? candidate.lastRunDetail.trim()
          : null,
    } satisfies PlatformSmokeTargetState;

    return {
      ...normalized,
      status: normalizeSmokeTargetStatus(normalized, candidate),
    } satisfies PlatformSmokeTargetState;
  });
}

function serviceTierGating(serviceTier: PlatformServiceTier): string {
  switch (serviceTier) {
    case "free":
      return "Self-hosted lane. No paid gate is required for the local operator workflow.";
    case "licensed":
      return "Licensed add-on lane. Brand-owned workflows and packaged skills sit behind a Cubecloud entitlement.";
    case "managed":
      return "Managed service lane. Hosted connectors, model maintenance, and premium ops require a paid Cubecloud service plan.";
  }
}

function normalizeMissionCardStates(
  missionCardStates?: PlatformMissionCardState[],
): PlatformMissionCardState[] {
  const incoming = new Map(
    (missionCardStates ?? []).map((state) => [state.cardId, state]),
  );

  return PLATFORM_MISSION_CARDS.map((card) => {
    const candidate = incoming.get(card.id);
    const knownChecklistIds = new Set(card.checklist.map((item) => item.id));

    return {
      cardId: card.id,
      stage:
        candidate && isMissionStage(candidate.stage)
          ? candidate.stage
          : card.defaultStage,
      serviceTier:
        candidate && isServiceTier(candidate.serviceTier)
          ? candidate.serviceTier
          : card.defaultServiceTier,
      completedChecklistIds: Array.from(
        new Set(
          (candidate?.completedChecklistIds ?? []).filter((itemId) =>
            knownChecklistIds.has(itemId),
          ),
        ),
      ),
    };
  });
}

function normalizeRuntimeSurfaceStates(
  runtimeSurfaceStates?: PlatformRuntimeSurfaceState[],
  descriptors: readonly PlatformRuntimeSurfaceDescriptor[] = PLATFORM_RUNTIME_SURFACES,
): PlatformRuntimeSurfaceState[] {
  const incoming = new Map(
    (runtimeSurfaceStates ?? []).map((surface) => [surface.appId, surface]),
  );

  return descriptors.map((surface) => {
    const candidate = incoming.get(surface.appId);

    return {
      appId: surface.appId,
      protocol:
        candidate && isSurfaceProtocol(candidate.protocol)
          ? candidate.protocol
          : surface.defaultProtocol,
      host:
        candidate?.host && candidate.host.trim().length > 0
          ? candidate.host.trim()
          : surface.defaultHost,
      port:
        candidate?.port != null &&
        Number.isFinite(candidate.port) &&
        candidate.port > 0
          ? Math.trunc(candidate.port)
          : surface.defaultPort,
      path:
        typeof candidate?.path === "string"
          ? normalizeSurfacePath(candidate.path)
          : normalizeSurfacePath(surface.defaultPath),
      mode:
        candidate && isRuntimeSurfaceMode(candidate.mode)
          ? candidate.mode
          : surface.defaultMode,
    };
  });
}

function normalizeDockerNodeBindings(
  dockerNodeBindings?: PlatformDockerNodeBinding[],
  knownAppIds: ReadonlySet<string> = new Set(PLATFORM_APPS.map((app) => app.id)),
): PlatformDockerNodeBinding[] {
  const seen = new Set<string>();

  return (dockerNodeBindings ?? []).flatMap((binding) => {
    const nodeKey = binding.nodeKey.trim();

    if (!nodeKey || !knownAppIds.has(binding.appId) || seen.has(nodeKey)) {
      return [];
    }

    seen.add(nodeKey);
    return [
      {
        nodeKey,
        appId: binding.appId,
      } satisfies PlatformDockerNodeBinding,
    ];
  });
}

function slugifyPlatformId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function uniquePlatformId(base: string, seen: Set<string>): string {
  let candidate = base;
  let suffix = 2;

  while (seen.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  seen.add(candidate);
  return candidate;
}

function defaultSlotsForKind(kind: AppKind): string[] {
  switch (kind) {
    case "runtime":
      return ["runtime-hub", "automation-lane", "communications"];
    case "workspace":
      return ["communications", "runtime-hub"];
    case "creative":
      return ["creative-studio", "utility-bus"];
    case "memory":
      return ["memory-plane", "communications"];
    case "intelligence":
      return ["intel-hub", "ops-console"];
    case "utility":
      return ["utility-bus", "ops-console"];
  }
}

function defaultCapabilitiesForKind(kind: AppKind): string[] {
  switch (kind) {
    case "runtime":
      return ["openai-routing", "observability"];
    case "workspace":
      return ["multi-surface-ui"];
    case "creative":
      return ["skills-runtime", "media-services"];
    case "memory":
      return ["durable-memory"];
    case "intelligence":
      return ["observability", "secure-approvals"];
    case "utility":
      return ["observability"];
  }
}

function defaultCapabilitiesForIntegration(
  integration: IntegrationKind,
): string[] {
  switch (integration) {
    case "mcp-server":
      return ["mcp-fabric", "observability"];
    case "runtime-service":
      return ["openai-routing", "observability"];
    case "web-companion":
      return ["multi-surface-ui"];
    case "embedded-ui":
      return ["skills-runtime"];
    case "http-sidecar":
      return ["observability"];
    case "openai-compatible":
      return ["openai-routing"];
  }
}

function normalizeCustomRuntimeSurface(
  appId: string,
  surface: PlatformRuntimeSurfaceDescriptor | undefined,
  appName: string,
): PlatformRuntimeSurfaceDescriptor {
  return {
    appId,
    label:
      typeof surface?.label === "string" && surface.label.trim().length > 0
        ? surface.label.trim()
        : `${appName} surface`,
    notes:
      typeof surface?.notes === "string" && surface.notes.trim().length > 0
        ? surface.notes.trim()
        : `Custom surface onboarded into Cubecloud for ${appName}.`,
    defaultProtocol:
      surface && isSurfaceProtocol(surface.defaultProtocol)
        ? surface.defaultProtocol
        : "http",
    defaultHost:
      typeof surface?.defaultHost === "string" && surface.defaultHost.trim().length > 0
        ? surface.defaultHost.trim()
        : "127.0.0.1",
    defaultPort:
      typeof surface?.defaultPort === "number" &&
      Number.isFinite(surface.defaultPort) &&
      surface.defaultPort > 0
        ? Math.trunc(surface.defaultPort)
        : null,
    defaultPath:
      typeof surface?.defaultPath === "string"
        ? normalizeSurfacePath(surface.defaultPath)
        : "/",
    defaultMode:
      surface && isRuntimeSurfaceMode(surface.defaultMode)
        ? surface.defaultMode
        : "docker",
  };
}

function normalizeCustomApps(
  customApps?: PlatformCustomAppDescriptor[],
): PlatformCustomAppDescriptor[] {
  const knownSlotIds = new Set(PLATFORM_SLOTS.map((slot) => slot.id));
  const knownCapabilityIds = new Set(
    PLATFORM_CAPABILITIES.map((capability) => capability.id),
  );
  const seenIds = new Set(PLATFORM_APPS.map((app) => app.id));

  return (customApps ?? []).flatMap((app) => {
    const name = app.name.trim();

    if (!name) {
      return [];
    }

    const baseId = slugifyPlatformId(app.id || name) || "docker-surface";
    const id = uniquePlatformId(baseId, seenIds);
    const supportedSlots = Array.from(
      new Set(
        (app.supportedSlots ?? []).filter((slotId) => knownSlotIds.has(slotId)),
      ),
    );
    const capabilityIds = Array.from(
      new Set(
        (app.capabilityIds ?? []).filter((capabilityId) =>
          knownCapabilityIds.has(capabilityId),
        ),
      ),
    );

    return [
      {
        id,
        name,
        tagline:
          typeof app.tagline === "string" && app.tagline.trim().length > 0
            ? app.tagline.trim()
            : `Custom Cubecloud surface for ${name}.`,
        description:
          typeof app.description === "string" && app.description.trim().length > 0
            ? app.description.trim()
            : "Custom app onboarded into Cubecloud without a code-level catalog change.",
        kind: app.kind,
        integration: app.integration,
        source:
          typeof app.source === "string" && app.source.trim().length > 0
            ? app.source.trim()
            : "docker:onboarded",
        defaultEnabled: app.defaultEnabled !== false,
        supportedSlots:
          supportedSlots.length > 0
            ? supportedSlots
            : defaultSlotsForKind(app.kind),
        capabilityIds:
          capabilityIds.length > 0
            ? capabilityIds
            : Array.from(
                new Set([
                  ...defaultCapabilitiesForKind(app.kind),
                  ...defaultCapabilitiesForIntegration(app.integration),
                ]),
              ),
        status: "custom",
        runtimeSurface: normalizeCustomRuntimeSurface(id, app.runtimeSurface, name),
      } satisfies PlatformCustomAppDescriptor,
    ];
  });
}

function buildPlatformAppCatalog(
  customApps: readonly PlatformCustomAppDescriptor[] = [],
): PlatformAppDescriptor[] {
  return [...PLATFORM_APPS, ...customApps];
}

function buildRuntimeSurfaceCatalog(
  customApps: readonly PlatformCustomAppDescriptor[] = [],
): PlatformRuntimeSurfaceDescriptor[] {
  return [
    ...PLATFORM_RUNTIME_SURFACES,
    ...customApps.map((app) => app.runtimeSurface),
  ];
}

export function buildCustomAppId(
  state: Partial<PlatformState> | undefined,
  name: string,
  fallbackSeed?: string,
): string {
  const normalized = normalizePlatformState(state);
  const seenIds = new Set(
    buildPlatformAppCatalog(normalized.customApps).map((app) => app.id),
  );
  const base =
    slugifyPlatformId(name) ||
    slugifyPlatformId(fallbackSeed ?? "") ||
    "docker-surface";

  return uniquePlatformId(base, seenIds);
}

function workspaceStatus(
  enabledAppCount: number,
  readyThreshold: number,
): PlatformWorkspaceHubSummary["status"] {
  if (enabledAppCount >= readyThreshold) return "ready";
  if (enabledAppCount > 0) return "assembling";
  return "planned";
}

function countRuntimeProviderDockerCandidates(
  provider: PlatformRuntimeProviderDescriptor,
  discovery: PlatformDockerDiscoverySummary | undefined,
): number {
  if (!provider.linkedAppId || !discovery || discovery.nodes.length === 0) {
    return 0;
  }

  return discovery.nodes.filter((node) => node.matchedAppId === provider.linkedAppId).length;
}

function deriveRuntimeLaneState(args: {
  appEnabled: boolean;
  surfaceConfigured: boolean;
  readySmokeTargetCount: number;
  passedSmokeTargetCount: number;
  failedSmokeTargetCount: number;
  dockerCandidateCount: number;
}): PlatformRuntimeLaneState {
  if (args.failedSmokeTargetCount > 0) {
    return "degraded";
  }

  if (
    args.passedSmokeTargetCount > 0 &&
    args.passedSmokeTargetCount === args.readySmokeTargetCount
  ) {
    return "verified";
  }

  if (
    args.surfaceConfigured ||
    args.readySmokeTargetCount > 0 ||
    args.appEnabled ||
    args.dockerCandidateCount > 0
  ) {
    return "staged";
  }

  return "unstaged";
}

export function createDefaultPlatformState(): PlatformState {
  return {
    enabledAppIds: PLATFORM_APPS.filter((app) => app.defaultEnabled).map(
      (app) => app.id,
    ),
    activeView: "console",
    activeRuntimeProviderId: DEFAULT_PLATFORM_RUNTIME_PROVIDER_ID,
    activeTaskOrchestratorId: DEFAULT_PLATFORM_TASK_ORCHESTRATOR_ID,
    missionCardStates: normalizeMissionCardStates(),
    runtimeSurfaceStates: normalizeRuntimeSurfaceStates(),
    smokeTargets: normalizeSmokeTargets(),
    dockerNodeBindings: [],
    customApps: [],
  };
}

export function normalizePlatformState(
  state?: Partial<PlatformState>,
): PlatformState {
  const defaults = createDefaultPlatformState();
  const customApps = normalizeCustomApps(state?.customApps);
  const catalogApps = buildPlatformAppCatalog(customApps);
  const runtimeSurfaceDescriptors = buildRuntimeSurfaceCatalog(customApps);
  const defaultEnabledIds = [
    ...defaults.enabledAppIds,
    ...customApps.filter((app) => app.defaultEnabled).map((app) => app.id),
  ];
  const candidateIds =
    state?.enabledAppIds && state.enabledAppIds.length > 0
      ? state.enabledAppIds
      : defaultEnabledIds;
  const knownIds = new Set(catalogApps.map((app) => app.id));

  return {
    activeView:
      state?.activeView && isPlatformView(state.activeView)
        ? state.activeView
        : defaults.activeView,
    activeRuntimeProviderId:
      state?.activeRuntimeProviderId && isRuntimeProviderId(state.activeRuntimeProviderId)
        ? state.activeRuntimeProviderId
        : defaults.activeRuntimeProviderId,
    activeTaskOrchestratorId:
      state?.activeTaskOrchestratorId &&
      isTaskOrchestratorId(state.activeTaskOrchestratorId)
        ? state.activeTaskOrchestratorId
        : defaults.activeTaskOrchestratorId,
    enabledAppIds: Array.from(
      new Set(candidateIds.filter((appId) => knownIds.has(appId))),
    ),
    missionCardStates: normalizeMissionCardStates(state?.missionCardStates),
    runtimeSurfaceStates: normalizeRuntimeSurfaceStates(
      state?.runtimeSurfaceStates,
      runtimeSurfaceDescriptors,
    ),
    smokeTargets: normalizeSmokeTargets(state?.smokeTargets),
    dockerNodeBindings: normalizeDockerNodeBindings(
      state?.dockerNodeBindings,
      knownIds,
    ),
    customApps,
  };
}

export function buildPlatformOverview(
  state?: Partial<PlatformState>,
  dockerDiscovery?: PlatformDockerDiscoverySummary,
): PlatformOverview {
  const normalized = normalizePlatformState(state);
  const catalogApps = buildPlatformAppCatalog(normalized.customApps);
  const runtimeSurfaceDescriptors = buildRuntimeSurfaceCatalog(
    normalized.customApps,
  );
  const enabledIds = new Set(normalized.enabledAppIds);
  const apps = catalogApps.map((app) => ({
    ...app,
    enabled: enabledIds.has(app.id),
    capabilityCount: app.capabilityIds.length,
  }));

  const slots = PLATFORM_SLOTS.map((slot) => ({
    ...slot,
    compatibleAppCount: apps.filter((app) => app.supportedSlots.includes(slot.id))
      .length,
    enabledAppCount: apps.filter(
      (app) => app.enabled && app.supportedSlots.includes(slot.id),
    ).length,
  }));

  const workspaceHubs = PLATFORM_WORKSPACE_HUBS.map((hub) => {
    const enabledAppCount = hub.appIds.filter((appId) => enabledIds.has(appId))
      .length;

    return {
      ...hub,
      enabledAppCount,
      status: workspaceStatus(enabledAppCount, hub.readyThreshold),
    };
  });

  const enabledApps = apps.filter((app) => app.enabled);
  const enabledCapabilityIds = new Set(
    enabledApps.flatMap((app) => app.capabilityIds),
  );
  const enabledKinds = new Set(enabledApps.map((app) => app.kind));
  const enabledRuntimeCount = enabledApps.filter(
    (app) => app.kind === "runtime",
  ).length;
  const readyWorkspaceHubs = workspaceHubs.filter(
    (hub) => hub.status === "ready",
  ).length;
  const staffedWorkspaceHubs = workspaceHubs.filter(
    (hub) => hub.enabledAppCount > 0,
  ).length;
  const sharedPlaneCount = [
    "skills-runtime",
    "durable-memory",
    "mcp-fabric",
  ].filter((capabilityId) => enabledCapabilityIds.has(capabilityId)).length;
  const workspaceNameMap = new Map(
    PLATFORM_WORKSPACE_HUBS.map((hub) => [hub.id, hub.name]),
  );
  const missionStateMap = new Map(
    normalized.missionCardStates.map((card) => [card.cardId, card]),
  );
  const missionBoard = PLATFORM_MISSION_CARDS.map((card) => {
    const cardState = missionStateMap.get(card.id) ?? {
      cardId: card.id,
      stage: card.defaultStage,
      serviceTier: card.defaultServiceTier,
      completedChecklistIds: [],
    };

    return {
      ...card,
      stage: cardState.stage,
      serviceTier: cardState.serviceTier,
      completedChecklistIds: cardState.completedChecklistIds,
      completedChecklistCount: cardState.completedChecklistIds.length,
      totalChecklistCount: card.checklist.length,
      workspaceName: workspaceNameMap.get(card.workspaceHubId) ?? card.workspaceHubId,
      gating: serviceTierGating(cardState.serviceTier),
    };
  });
  const liveMissionCards = missionBoard.filter(
    (card) => card.stage === "live",
  ).length;
  const managedMissionCards = missionBoard.filter(
    (card) => card.serviceTier === "managed",
  ).length;
  const runtimeSurfaceStateMap = new Map(
    normalized.runtimeSurfaceStates.map((surface) => [surface.appId, surface]),
  );
  const runtimeSurfaces = runtimeSurfaceDescriptors.map((surface) => {
    const surfaceState = runtimeSurfaceStateMap.get(surface.appId) ?? {
      appId: surface.appId,
      protocol: surface.defaultProtocol,
      host: surface.defaultHost,
      port: surface.defaultPort,
      path: surface.defaultPath,
      mode: surface.defaultMode,
    };

    return {
      ...surface,
      ...surfaceState,
      url: buildRuntimeSurfaceUrl(surfaceState),
      appEnabled: enabledIds.has(surface.appId),
    };
  });
  const configuredRuntimeSurfaces = runtimeSurfaces.filter(
    (surface) => surface.url != null,
  ).length;
  const runtimeSurfaceMap = new Map(
    runtimeSurfaces.map((surface) => [surface.appId, surface]),
  );
  const smokeTargets = normalized.smokeTargets.map((target) => {
    const provider =
      PLATFORM_RUNTIME_PROVIDERS.find((candidate) => candidate.id === target.runtimeProviderId) ??
      PLATFORM_RUNTIME_PROVIDERS[0];
    const linkedSurface = provider.linkedRuntimeSurfaceAppId
      ? runtimeSurfaceMap.get(provider.linkedRuntimeSurfaceAppId) ?? null
      : null;
    const suggestedProbeTarget =
      target.transport === "remote"
        ? target.remoteUrl.trim() || provider.remoteExampleUrl
        : target.transport === "tcp"
          ? target.tcpHost.trim().length > 0 && target.tcpPort != null
            ? `${target.tcpHost.trim()}:${target.tcpPort}`
            : `${provider.displayName} TCP @ port ${target.tcpPort ?? provider.sshRemotePort ?? 0}`
        : target.sshHost.trim().length > 0
          ? `${target.sshUsername.trim() || "user"}@${target.sshHost.trim()}:${target.sshPort}`
          : `${provider.displayName} SSH @ port ${provider.sshRemotePort ?? 22}`;

    return {
      ...target,
      ready: smokeTargetReady(target),
      providerDisplayName: provider.displayName,
      selectedRuntime: normalized.activeRuntimeProviderId === provider.id,
      suggestedProbeTarget,
      linkedSurfaceUrl: linkedSurface?.url ?? null,
    } satisfies PlatformSmokeTargetSummary;
  });
  const smokeTargetCounts = new Map<PlatformRuntimeProviderId, number>();
  const readySmokeTargetCounts = new Map<PlatformRuntimeProviderId, number>();
  const passedSmokeTargetCounts = new Map<PlatformRuntimeProviderId, number>();
  const failedSmokeTargetCounts = new Map<PlatformRuntimeProviderId, number>();

  for (const target of smokeTargets) {
    smokeTargetCounts.set(
      target.runtimeProviderId,
      (smokeTargetCounts.get(target.runtimeProviderId) ?? 0) + 1,
    );

    if (target.ready) {
      readySmokeTargetCounts.set(
        target.runtimeProviderId,
        (readySmokeTargetCounts.get(target.runtimeProviderId) ?? 0) + 1,
      );
    }

    if (target.status === "passed") {
      passedSmokeTargetCounts.set(
        target.runtimeProviderId,
        (passedSmokeTargetCounts.get(target.runtimeProviderId) ?? 0) + 1,
      );
    }

    if (target.status === "failed") {
      failedSmokeTargetCounts.set(
        target.runtimeProviderId,
        (failedSmokeTargetCounts.get(target.runtimeProviderId) ?? 0) + 1,
      );
    }
  }

  const runtimeProviders = PLATFORM_RUNTIME_PROVIDERS.map((provider) => {
    const linkedSurface = provider.linkedRuntimeSurfaceAppId
      ? runtimeSurfaceMap.get(provider.linkedRuntimeSurfaceAppId) ?? null
      : null;
    const appEnabled = provider.linkedAppId ? enabledIds.has(provider.linkedAppId) : false;
    const surfaceConfigured = linkedSurface?.url != null;
    const readySmokeTargetCount = readySmokeTargetCounts.get(provider.id) ?? 0;
    const passedSmokeTargetCount = passedSmokeTargetCounts.get(provider.id) ?? 0;
    const failedSmokeTargetCount = failedSmokeTargetCounts.get(provider.id) ?? 0;
    const dockerCandidateCount = countRuntimeProviderDockerCandidates(
      provider,
      dockerDiscovery,
    );
    const laneState = deriveRuntimeLaneState({
      appEnabled,
      surfaceConfigured,
      readySmokeTargetCount,
      passedSmokeTargetCount,
      failedSmokeTargetCount,
      dockerCandidateCount,
    });

    return {
      ...provider,
      selected: normalized.activeRuntimeProviderId === provider.id,
      appEnabled,
      surfaceConfigured,
      surfaceUrl: linkedSurface?.url ?? null,
      surfaceMode: linkedSurface?.mode ?? null,
      laneState,
      dockerCandidateCount,
      passedSmokeTargetCount,
      failedSmokeTargetCount,
      readySmokeTargetCount,
      totalSmokeTargetCount: smokeTargetCounts.get(provider.id) ?? 0,
    } satisfies PlatformRuntimeProviderSummary;
  });

  const selectedRuntimeProvider =
    runtimeProviders.find((provider) => provider.id === normalized.activeRuntimeProviderId) ??
    runtimeProviders[0];
  const taskOrchestrators = PLATFORM_TASK_ORCHESTRATORS.map((orchestrator) => ({
    ...orchestrator,
    selected: normalized.activeTaskOrchestratorId === orchestrator.id,
    compatibleSelectedRuntime: orchestrator.compatibleRuntimeProviderIds.includes(
      selectedRuntimeProvider.id,
    ),
    compatibleConfiguredRuntimeCount: runtimeProviders.filter(
      (provider) =>
        orchestrator.compatibleRuntimeProviderIds.includes(provider.id) &&
        (provider.surfaceConfigured || provider.readySmokeTargetCount > 0 || provider.appEnabled),
    ).length,
  })) satisfies PlatformTaskOrchestratorSummary[];
  const readySmokeTargets = smokeTargets.filter((target) => target.ready).length;

  const verification: PlatformVerificationItem[] = [
    {
      id: "runtime-mounted",
      name: "Runtime mounted in the shell",
      description:
        "At least one long-lived runtime needs a visible operator surface before the dashboard counts as mission control.",
      status: enabledRuntimeCount > 0 ? "ready" : "attention",
      evidence:
        enabledRuntimeCount > 0
          ? `${enabledRuntimeCount} runtime services are enabled right now.`
          : "No long-lived runtime is enabled yet.",
    },
    {
      id: "workspace-staffing",
      name: "Workspace hubs are staffed",
      description:
        "The shell should present named work lanes instead of a loose catalog of disconnected tools.",
      status:
        readyWorkspaceHubs >= 2
          ? "ready"
          : staffedWorkspaceHubs > 0
            ? "assembling"
            : "attention",
      evidence: `${readyWorkspaceHubs} ready hubs, ${staffedWorkspaceHubs} staffed hubs out of ${workspaceHubs.length}.`,
    },
    {
      id: "shared-planes",
      name: "Shared skills and memory plane",
      description:
        "Skills, memory, and MCP should compound across runtimes instead of being rebuilt inside each app.",
      status:
        sharedPlaneCount === 3
          ? "ready"
          : sharedPlaneCount >= 1
            ? "assembling"
            : "attention",
      evidence: `${sharedPlaneCount}/3 shared planes are represented by enabled apps.`,
    },
    {
      id: "smoke-workflow",
      name: "Manual smoke workflow is possible",
      description:
        "A runtime plus at least one creative, workspace, or utility surface gives operators a real verify-and-troubleshoot path.",
      status:
        enabledRuntimeCount > 0 &&
        (enabledKinds.has("creative") ||
          enabledKinds.has("workspace") ||
          enabledKinds.has("utility"))
          ? "ready"
          : enabledRuntimeCount > 0
            ? "assembling"
            : "attention",
      evidence:
        enabledRuntimeCount > 0
          ? `${enabledApps.length} enabled surfaces can participate in an operator-visible smoke test.`
          : "Enable a runtime before building workflow verification lanes.",
    },
    {
      id: "rollback-ready",
      name: "Observation and rollback stay visible",
      description:
        "The build loop needs health checks, approvals, and rollback-friendly lanes rather than one-way installer flows.",
      status:
        enabledCapabilityIds.has("observability") &&
        enabledCapabilityIds.has("secure-approvals")
          ? "ready"
          : enabledCapabilityIds.has("observability") ||
              enabledCapabilityIds.has("secure-approvals")
            ? "assembling"
            : "attention",
      evidence: `Observability: ${enabledCapabilityIds.has("observability") ? "on" : "off"}; approvals: ${enabledCapabilityIds.has("secure-approvals") ? "on" : "off"}.`,
    },
  ];

  return {
    state: normalized,
    apps,
    slots,
    workspaceHubs,
    verification,
    missionBoard,
    runtimeProviders,
    taskOrchestrators,
    runtimeSurfaces,
    smokeTargets,
    docker: {
      status: "empty",
      message: "Run a Docker Desktop scan from the dashboard to list container nodes and compose projects.",
      lastScannedAt: null,
      projects: [],
      nodes: [],
    },
    capabilities: [...PLATFORM_CAPABILITIES],
    stats: {
      totalApps: apps.length,
      enabledApps: apps.filter((app) => app.enabled).length,
      capabilityCount: PLATFORM_CAPABILITIES.length,
      slotCount: slots.length,
      integrationKinds: new Set(apps.map((app) => app.integration)).size,
      readyWorkspaceHubs,
      liveMissionCards,
      managedMissionCards,
      configuredRuntimeSurfaces,
      readySmokeTargets,
      dockerNodeCount: 0,
      liveDockerNodes: 0,
      healthyDockerNodes: 0,
      downDockerNodes: 0,
      composeProjects: 0,
    },
  };
}

function updateMissionCardState(
  state: Partial<PlatformState> | undefined,
  cardId: string,
  updater: (card: PlatformMissionCardState) => PlatformMissionCardState,
): PlatformState {
  const normalized = normalizePlatformState(state);

  if (!normalized.missionCardStates.some((card) => card.cardId === cardId)) {
    return normalized;
  }

  return normalizePlatformState({
    ...normalized,
    missionCardStates: normalized.missionCardStates.map((card) =>
      card.cardId === cardId ? updater(card) : card,
    ),
  });
}

function updateRuntimeSurfaceState(
  state: Partial<PlatformState> | undefined,
  appId: string,
  updater: (surface: PlatformRuntimeSurfaceState) => PlatformRuntimeSurfaceState,
): PlatformState {
  const normalized = normalizePlatformState(state);

  if (!normalized.runtimeSurfaceStates.some((surface) => surface.appId === appId)) {
    return normalized;
  }

  return normalizePlatformState({
    ...normalized,
    runtimeSurfaceStates: normalized.runtimeSurfaceStates.map((surface) =>
      surface.appId === appId ? updater(surface) : surface,
    ),
  });
}

function updateSmokeTargetState(
  state: Partial<PlatformState> | undefined,
  targetId: string,
  updater: (target: PlatformSmokeTargetState) => PlatformSmokeTargetState,
): PlatformState {
  const normalized = normalizePlatformState(state);

  if (!normalized.smokeTargets.some((target) => target.id === targetId)) {
    return normalized;
  }

  return normalizePlatformState({
    ...normalized,
    smokeTargets: normalized.smokeTargets.map((target) =>
      target.id === targetId ? updater(target) : target,
    ),
  });
}

export function setAppEnabled(
  state: Partial<PlatformState> | undefined,
  appId: string,
  enabled: boolean,
): PlatformState {
  const normalized = normalizePlatformState(state);
  const knownIds = new Set(
    buildPlatformAppCatalog(normalized.customApps).map((app) => app.id),
  );

  if (!knownIds.has(appId)) {
    return normalized;
  }

  const nextIds = new Set(normalized.enabledAppIds);

  if (enabled) {
    nextIds.add(appId);
  } else {
    nextIds.delete(appId);
  }

  return normalizePlatformState({
    ...normalized,
    enabledAppIds: Array.from(nextIds),
  });
}

export function setActiveView(
  state: Partial<PlatformState> | undefined,
  activeView: PlatformView,
): PlatformState {
  if (!isPlatformView(activeView)) {
    return normalizePlatformState(state);
  }

  return normalizePlatformState({
    ...normalizePlatformState(state),
    activeView,
  });
}

export function setActiveRuntimeProvider(
  state: Partial<PlatformState> | undefined,
  runtimeProviderId: PlatformRuntimeProviderId,
): PlatformState {
  if (!isRuntimeProviderId(runtimeProviderId)) {
    return normalizePlatformState(state);
  }

  const normalized = normalizePlatformState(state);
  const provider = PLATFORM_RUNTIME_PROVIDERS.find(
    (candidate) => candidate.id === runtimeProviderId,
  );
  const currentOrchestrator = PLATFORM_TASK_ORCHESTRATORS.find(
    (candidate) => candidate.id === normalized.activeTaskOrchestratorId,
  );
  const nextTaskOrchestratorId =
    currentOrchestrator?.compatibleRuntimeProviderIds.includes(runtimeProviderId)
      ? currentOrchestrator.id
      : provider?.preferredTaskOrchestratorIds[0] ??
        normalized.activeTaskOrchestratorId;

  return normalizePlatformState({
    ...normalized,
    activeRuntimeProviderId: runtimeProviderId,
    activeTaskOrchestratorId: nextTaskOrchestratorId,
  });
}

export function setActiveTaskOrchestrator(
  state: Partial<PlatformState> | undefined,
  taskOrchestratorId: PlatformTaskOrchestratorId,
): PlatformState {
  if (!isTaskOrchestratorId(taskOrchestratorId)) {
    return normalizePlatformState(state);
  }

  return normalizePlatformState({
    ...normalizePlatformState(state),
    activeTaskOrchestratorId: taskOrchestratorId,
  });
}

export function setMissionCardStage(
  state: Partial<PlatformState> | undefined,
  cardId: string,
  stage: PlatformMissionStage,
): PlatformState {
  if (!isMissionStage(stage)) {
    return normalizePlatformState(state);
  }

  return updateMissionCardState(state, cardId, (card) => ({
    ...card,
    stage,
  }));
}

export function toggleMissionChecklistItem(
  state: Partial<PlatformState> | undefined,
  cardId: string,
  checklistItemId: string,
): PlatformState {
  const descriptor = PLATFORM_MISSION_CARDS.find((card) => card.id === cardId);

  if (!descriptor || !descriptor.checklist.some((item) => item.id === checklistItemId)) {
    return normalizePlatformState(state);
  }

  return updateMissionCardState(state, cardId, (card) => {
    const nextIds = new Set(card.completedChecklistIds);

    if (nextIds.has(checklistItemId)) {
      nextIds.delete(checklistItemId);
    } else {
      nextIds.add(checklistItemId);
    }

    return {
      ...card,
      completedChecklistIds: Array.from(nextIds),
    };
  });
}

export function setMissionCardServiceTier(
  state: Partial<PlatformState> | undefined,
  cardId: string,
  serviceTier: PlatformServiceTier,
): PlatformState {
  if (!isServiceTier(serviceTier)) {
    return normalizePlatformState(state);
  }

  return updateMissionCardState(state, cardId, (card) => ({
    ...card,
    serviceTier,
  }));
}

export function setRuntimeSurfaceConfig(
  state: Partial<PlatformState> | undefined,
  appId: string,
  patch: PlatformRuntimeSurfacePatch,
): PlatformState {
  return updateRuntimeSurfaceState(state, appId, (surface) => ({
    ...surface,
    protocol:
      patch.protocol && isSurfaceProtocol(patch.protocol)
        ? patch.protocol
        : surface.protocol,
    host:
      typeof patch.host === "string" && patch.host.trim().length > 0
        ? patch.host.trim()
        : surface.host,
    port:
      patch.port === null
        ? null
        : typeof patch.port === "number" &&
            Number.isFinite(patch.port) &&
            patch.port > 0
          ? Math.trunc(patch.port)
          : surface.port,
    path:
      typeof patch.path === "string"
        ? normalizeSurfacePath(patch.path)
        : surface.path,
    mode:
      patch.mode && isRuntimeSurfaceMode(patch.mode)
        ? patch.mode
        : surface.mode,
  }));
}

export function setSmokeTargetConfig(
  state: Partial<PlatformState> | undefined,
  targetId: string,
  patch: PlatformSmokeTargetPatch,
): PlatformState {
  return updateSmokeTargetState(state, targetId, (target) => {
    const next = {
      ...target,
      label:
        typeof patch.label === "string" && patch.label.trim().length > 0
          ? patch.label.trim()
          : target.label,
      remoteUrl:
        typeof patch.remoteUrl === "string"
          ? patch.remoteUrl.trim()
          : target.remoteUrl,
      tcpHost:
        typeof patch.tcpHost === "string" ? patch.tcpHost.trim() : target.tcpHost,
      tcpPort:
        patch.tcpPort === null
          ? null
          : typeof patch.tcpPort === "number" &&
              Number.isFinite(patch.tcpPort) &&
              patch.tcpPort > 0
            ? Math.trunc(patch.tcpPort)
            : target.tcpPort,
      sshHost:
        typeof patch.sshHost === "string" ? patch.sshHost.trim() : target.sshHost,
      sshPort:
        typeof patch.sshPort === "number" && Number.isFinite(patch.sshPort) && patch.sshPort > 0
          ? Math.trunc(patch.sshPort)
          : target.sshPort,
      sshUsername:
        typeof patch.sshUsername === "string"
          ? patch.sshUsername.trim()
          : target.sshUsername,
      sshKeyPath:
        typeof patch.sshKeyPath === "string"
          ? patch.sshKeyPath.trim()
          : target.sshKeyPath,
      sshRemotePort:
        patch.sshRemotePort === null
          ? null
          : typeof patch.sshRemotePort === "number" &&
              Number.isFinite(patch.sshRemotePort) &&
              patch.sshRemotePort > 0
            ? Math.trunc(patch.sshRemotePort)
            : target.sshRemotePort,
      notes:
        typeof patch.notes === "string" && patch.notes.trim().length > 0
          ? patch.notes.trim()
          : target.notes,
      lastRunAt: null,
      lastRunDetail: null,
    } satisfies PlatformSmokeTargetState;

    return {
      ...next,
      status: smokeTargetReady(next) ? "ready" : "draft",
    } satisfies PlatformSmokeTargetState;
  });
}

export function recordSmokeTargetProbeResult(
  state: Partial<PlatformState> | undefined,
  targetId: string,
  result: PlatformSmokeTargetProbeResult,
): PlatformState {
  return updateSmokeTargetState(state, targetId, (target) => ({
    ...target,
    status: result.status,
    lastRunAt: result.ranAt ?? new Date().toISOString(),
    lastRunDetail:
      typeof result.detail === "string" && result.detail.trim().length > 0
        ? result.detail.trim()
        : null,
  }));
}

export function setDockerNodeBinding(
  state: Partial<PlatformState> | undefined,
  nodeKey: string,
  appId: string | null,
): PlatformState {
  const normalized = normalizePlatformState(state);
  const trimmedNodeKey = nodeKey.trim();

  if (!trimmedNodeKey) {
    return normalized;
  }

  const nextBindings = normalized.dockerNodeBindings.filter(
    (binding) => binding.nodeKey !== trimmedNodeKey,
  );

  if (appId == null) {
    return normalizePlatformState({
      ...normalized,
      dockerNodeBindings: nextBindings,
    });
  }

  const descriptor = buildPlatformAppCatalog(normalized.customApps).find(
    (app) => app.id === appId,
  );

  if (!descriptor) {
    return normalized;
  }

  return normalizePlatformState({
    ...normalized,
    dockerNodeBindings: [
      ...nextBindings,
      {
        nodeKey: trimmedNodeKey,
        appId,
      },
    ],
  });
}

export function upsertCustomApp(
  state: Partial<PlatformState> | undefined,
  customApp: PlatformCustomAppDescriptor,
  enabled = true,
): PlatformState {
  const normalized = normalizePlatformState(state);
  const nextCustomApps = [
    ...normalized.customApps.filter((app) => app.id !== customApp.id),
    customApp,
  ];
  const nextEnabledIds = new Set(normalized.enabledAppIds);

  if (enabled) {
    nextEnabledIds.add(customApp.id);
  }

  return normalizePlatformState({
    ...normalized,
    enabledAppIds: Array.from(nextEnabledIds),
    customApps: nextCustomApps,
  });
}
