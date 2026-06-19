import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentChatMessage,
  AgentChatSession,
  AgentDispatchContextOverride,
  AgentDispatchRun,
  CodeGraphEntrypoint,
  CodeGraphQueryTemplate,
  CodeGraphRepoSummary,
  EverOsHarness,
  HermesRuntimeHomeState,
  HermesRuntimeInstallTargetState,
  HermesRuntimeLifecycleSummary,
  HermesRuntimeOperationStatus,
  HermesRuntimeVerificationState,
  AgentMemoryEntry,
  AgentModelEndpoint,
  AgentProfile,
  AgentProviderConfig,
  AgentSchedule,
  AgentSessionHistoryItem,
  AgentSkill,
  AgentTool,
  AppKind,
  IntegrationKind,
  KanbanBoard,
  KanbanTask,
  PlatformAppSummary,
  PlatformDockerBindingMode,
  PlatformDockerNodeSummary,
  PlatformRuntimeConnectionMode,
  PlatformRuntimeLaneState,
  PlatformDockerNodeHealth,
  PlatformDockerProjectHealth,
  PlatformDockerPortBinding,
  PlatformOverview,
  PlatformRuntimeProviderId,
  PlatformRuntimeProviderRole,
  PlatformRuntimeSurfaceMode,
  PlatformSmokeTargetPatch,
  PlatformSmokeTargetStatus,
  PlatformSmokeTargetTransport,
  PlatformSurfaceProtocol,
  PlatformTaskOrchestratorId,
  PlatformTaskOrchestratorIntegrationMode,
  PlatformView,
} from "@cubecloud/platform-core";
import cubecloudLogo from "./assets/cubecloud-logo.svg";
import { useTheme } from "./ThemeProvider";
import {
  buildChatRequestMessages,
  chatMessagesToSessionHistory,
  filterAgentSessions,
  getChatRequestModeOptions,
  type ChatRequestMode,
  sessionHistoryToChatMessages,
  summarizeSessionHistory,
  supportsLocalSessionHistory,
  supportsSessionResume,
} from "./agentExperience";
import {
  LOCAL_RUNTIME_HOST,
  buildRuntimeLaneActionModel,
} from "./runtimeLaneActions";
import {
  PROVIDER_PRESETS,
  PROVIDER_PRESET_CATEGORY_LABELS,
  buildModelDraftFromProvider,
  buildProviderDraftFromPreset,
  getProviderPreset,
  summarizeProviderPresetConnection,
  type AgentProviderDiscoveryResult,
  type AgentProviderPreset,
} from "../../shared/providerCatalog";

type KindFilter = "all" | AppKind;

const VIEW_META: Record<
  PlatformView,
  { label: string; title: string; summary: string }
> = {
  chat: {
    label: "Chat",
    title: "Agent Chat",
    summary: "Send messages to your active runtime and get responses.",
  },
  sessions: {
    label: "Sessions",
    title: "Chat Sessions",
    summary: "Browse and resume past conversations with your agents.",
  },
  agents: {
    label: "Agents",
    title: "Agent Profiles",
    summary: "Manage agent personas, models, and skill sets.",
  },
  persona: {
    label: "Persona",
    title: "Persona",
    summary: "Edit the soul, operator posture, and behavioral constraints for the active provider control plane.",
  },
  kanban: {
    label: "Kanban",
    title: "Task Board",
    summary: "Track in-progress agent tasks across queued, active, and done columns.",
  },
  codegraph: {
    label: "CodeGraph",
    title: "CodeGraph",
    summary: "Semantic code intelligence via MCP — navigation, callers, impact analysis.",
  },
  everos: {
    label: "EverOS",
    title: "EverOS",
    summary: "Persistent memory harnesses, loop prompts, and EverCore-backed operator state.",
  },
  models: {
    label: "Models",
    title: "Model Endpoints",
    summary: "Saved model endpoints discovered from local, BYOK, and CLI-backed providers.",
  },
  providers: {
    label: "Providers",
    title: "Providers",
    summary: "Local Ollama, BYOK, and CLI provider records with probeable connection state.",
  },
  skills: {
    label: "Skills",
    title: "Skills",
    summary: "Installed prompt skills and bundled skill packages for your agents.",
  },
  memory: {
    label: "Memory",
    title: "Memory",
    summary: "Durable memory entries available across agent sessions.",
  },
  tools: {
    label: "Tools",
    title: "MCP Tools",
    summary: "Model Context Protocol tool endpoints connected to your runtime.",
  },
  schedules: {
    label: "Schedules",
    title: "Schedules",
    summary: "Cron-scheduled agent prompts that run on your configured runtime.",
  },
  console: {
    label: "Console",
    title: "Agent Console",
    summary:
      "Runtime fabric status, Docker intake, and mounted Cubecloud surfaces — the single operator screen for live systems.",
  },
  workspace: {
    label: "Workspace",
    title: "Feature Workspace",
    summary:
      "Feature surfaces by name — CodeGraph, OpenHuman, and all enabled Cubecloud apps mounted as named screens.",
  },
  gateway: {
    label: "Gateway",
    title: "Runtime Gateway",
    summary:
      "Lane configuration, smoke probe harness, and surface endpoint mapping for Hermes, IronClaw, and OpenClaw.",
  },
  operations: {
    label: "Diagnostics",
    title: "Diagnostics",
    summary:
      "Docker container fabric, Compose project health, and operator verification checklist.",
  },
  sandboxtasks: {
    label: "Sandbox Tasks",
    title: "Sandbox Tasks",
    summary:
      "Dispatch tasks to the IronClaw WASM-sandbox gateway with tool execution visibility.",
  },
  settings: {
    label: "Settings",
    title: "Settings",
    summary:
      "Appearance, feature registry, shell status, and legal notice.",
  },
};

const KIND_LABELS: Record<AppKind, string> = {
  runtime: "Runtime",
  workspace: "Workspace",
  creative: "Creative",
  memory: "Memory",
  intelligence: "Intelligence",
  utility: "Utility",
};

const INTEGRATION_LABELS: Record<IntegrationKind, string> = {
  "embedded-ui": "Embedded UI",
  "http-sidecar": "HTTP sidecar",
  "openai-compatible": "OpenAI-compatible",
  "mcp-server": "MCP server",
  "web-companion": "Web companion",
  "runtime-service": "Runtime service",
};

const STATUS_LABELS = {
  ready: "Ready",
  assembling: "Assembling",
  planned: "Planned",
  attention: "Attention",
} as const;

const STATUS_CLASSES = {
  ready: "on",
  assembling: "assembling",
  planned: "off",
  attention: "off",
} as const;

const RUNTIME_MODE_LABELS: Record<PlatformRuntimeSurfaceMode, string> = {
  desktop: "Desktop",
  docker: "Docker",
  remote: "Remote",
};

const RUNTIME_PROVIDER_ROLE_LABELS: Record<PlatformRuntimeProviderRole, string> = {
  "primary-runtime": "Primary runtime",
  "gateway-handoff": "Gateway handoff",
  "migration-source": "Migration source",
};

const RUNTIME_LANE_STATE_LABELS: Record<PlatformRuntimeLaneState, string> = {
  unstaged: "Unstaged",
  staged: "Staged",
  verified: "Verified",
  degraded: "Degraded",
};

const DISPATCH_RUN_STATUS_LABELS: Record<AgentDispatchRun["status"], string> = {
  queued: "Queued",
  active: "Active",
  done: "Done",
  failed: "Failed",
};

const DISPATCH_RUN_SOURCE_LABELS: Record<AgentDispatchRun["source"], string> = {
  manual: "Manual",
  schedule: "Schedule",
  scheduler: "Scheduler",
};

const RUNTIME_LANE_STATE_CLASSES: Record<PlatformRuntimeLaneState, string> = {
  unstaged: "off",
  staged: "assembling",
  verified: "on",
  degraded: "off",
};

const HERMES_INSTALL_TARGET_LABELS: Record<
  HermesRuntimeInstallTargetState,
  string
> = {
  fresh: "Fresh install target",
  update: "Update in place",
  replace: "Replace invalid checkout",
};

const HERMES_HOME_STATE_LABELS: Record<HermesRuntimeHomeState, string> = {
  empty: "No local home",
  partial: "Partial local home",
  installed: "Local home ready",
};

const HERMES_HOME_STATE_CLASSES: Record<HermesRuntimeHomeState, string> = {
  empty: "off",
  partial: "assembling",
  installed: "on",
};

const HERMES_VERIFICATION_STATE_LABELS: Record<
  HermesRuntimeVerificationState,
  string
> = {
  unknown: "Not verified",
  verified: "Verified locally",
  failed: "Needs attention",
};

const HERMES_VERIFICATION_STATE_CLASSES: Record<
  HermesRuntimeVerificationState,
  string
> = {
  unknown: "assembling",
  verified: "on",
  failed: "off",
};

const HERMES_OPERATION_STATUS_LABELS: Record<
  HermesRuntimeOperationStatus,
  string
> = {
  running: "In progress",
  succeeded: "Complete",
  failed: "Needs attention",
};

const HERMES_OPERATION_STATUS_CLASSES: Record<
  HermesRuntimeOperationStatus,
  string
> = {
  running: "assembling",
  succeeded: "on",
  failed: "off",
};

const CONNECTION_MODE_LABELS: Record<PlatformRuntimeConnectionMode, string> = {
  "embedded-local": "Embedded local",
  "local-gateway": "Local gateway",
  "remote-gateway": "Remote gateway",
  "ssh-tunnel": "SSH tunnel",
  "docker-gateway": "Docker gateway",
  "migration-import": "Migration import",
};

/** Resolves any surfaceMode value — PlatformRuntimeSurfaceMode OR PlatformRuntimeConnectionMode — to a display label. */
const resolveSurfaceModeLabel = (mode: string): string =>
  (RUNTIME_MODE_LABELS as Record<string, string>)[mode] ??
  (CONNECTION_MODE_LABELS as Record<string, string>)[mode] ??
  mode;

const ORCHESTRATOR_MODE_LABELS: Record<
  PlatformTaskOrchestratorIntegrationMode,
  string
> = {
  "native-core": "Native core",
  "optional-runtime": "Optional runtime",
  "optional-bridge": "External bridge",
};

const SMOKE_TRANSPORT_LABELS: Record<PlatformSmokeTargetTransport, string> = {
  remote: "Remote probe",
  ssh: "SSH handshake",
  tcp: "TCP reachability",
};

const SMOKE_STATUS_LABELS: Record<PlatformSmokeTargetStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  passed: "Passed",
  failed: "Failed",
};

const SMOKE_STATUS_CLASSES: Record<PlatformSmokeTargetStatus, string> = {
  draft: "off",
  ready: "assembling",
  passed: "on",
  failed: "off",
};

const PROTOCOL_LABELS: Record<PlatformSurfaceProtocol, string> = {
  http: "HTTP",
  https: "HTTPS",
};

const DOCKER_HEALTH_LABELS: Record<PlatformDockerNodeHealth, string> = {
  healthy: "Healthy",
  running: "Running",
  unhealthy: "Unhealthy",
  starting: "Starting",
  offline: "Offline",
  unknown: "Unknown",
};

const DOCKER_HEALTH_CLASSES: Record<PlatformDockerNodeHealth, string> = {
  healthy: "on",
  running: "assembling",
  unhealthy: "off",
  starting: "assembling",
  offline: "off",
  unknown: "off",
};

const DOCKER_PROJECT_HEALTH_LABELS: Record<PlatformDockerProjectHealth, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  offline: "Offline",
};

const DOCKER_PROJECT_HEALTH_CLASSES: Record<PlatformDockerProjectHealth, string> = {
  healthy: "on",
  degraded: "assembling",
  offline: "off",
};

const CHAT_SUGGESTIONS = [
  {
    label: "Runtime briefing",
    text: "Summarize the active runtime, loaded tools, and the first configuration gaps I should fix.",
  },
  {
    label: "Persona tune-up",
    text: "Draft a sharper persona setup for this workspace using memory, tools, and the current model lane.",
  },
  {
    label: "Skill plan",
    text: "Recommend which skills and providers I should enable next for a production-ready agent workflow.",
  },
  {
    label: "Nightly schedule",
    text: "Write a nightly schedule prompt that checks runtime health, summarises issues, and proposes fixes.",
  },
  {
    label: "Workspace mapping",
    text: "Use this workspace as context and outline the highest-value automation or code intelligence flows to build next.",
  },
  {
    label: "Launch checklist",
    text: "Create an operator checklist for models, providers, tools, memory, and schedules before I hand this runtime to users.",
  },
] as const;

const DOCKER_BINDING_MODE_LABELS: Record<PlatformDockerBindingMode, string> = {
  automatic: "Auto match",
  manual: "Manual override",
  unmatched: "Untracked",
};

const RUNTIME_INTAKE_TARGETS = [
  { appId: "hermes-agent", keywords: ["hermes-agent", "hermes"] },
  { appId: "ironclaw", keywords: ["ironclaw", "iron-claw"] },
  { appId: "codegraph", keywords: ["codegraph", "code-graph"] },
  { appId: "everos", keywords: ["everos", "evercore"] },
  { appId: "openhuman", keywords: ["openhuman", "open-human"] },
] as const;

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

const INFRA_RUNTIME_KEYWORDS = [
  "cloudflared",
  "postgres",
  "pgvector",
  "redis",
  "worker",
  "cache",
  "queue",
  "broker",
  "scheduler",
  "migration",
] as const;

type DockerOnboardingDraft = {
  name: string;
  kind: AppKind;
  integration: IntegrationKind;
};

type RuntimeIntakeCandidate = {
  node: PlatformDockerNodeSummary;
  app: PlatformAppSummary;
  linkedSurface: PlatformOverview["runtimeSurfaces"][number] | null;
};

type WorkspaceModelDraft = {
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
};

type WorkspaceProviderDraft = {
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string;
};

type WorkspaceProfileDraft = {
  name: string;
  model: string;
  provider: string;
  isDefault: boolean;
  kanbanBoardSlug: string;
};

type RegistrySelectOption = {
  value: string;
  label: string;
};

type WorkspaceSkillDraft = {
  name: string;
  category: string;
  description: string;
};

type WorkspaceMemoryDraft = {
  label: string;
  content: string;
};

type WorkspaceToolDraft = {
  name: string;
  description: string;
  endpoint: string;
  type: string;
  enabled: boolean;
};

type WorkspaceKanbanTaskDraft = {
  title: string;
  body: string;
  status: (typeof KANBAN_STATUSES)[number];
  priority: number;
  assignee: string;
  skillsText: string;
};

type WorkspaceKanbanBoardDraft = {
  name: string;
  description: string;
};

type WorkspaceCodeGraphRepoDraft = {
  name: string;
  repoPath: string;
  description: string;
  selected: boolean;
};

type WorkspaceCodeGraphEntrypointDraft = {
  repoId: string;
  name: string;
  target: string;
  notes: string;
};

type WorkspaceCodeGraphQueryDraft = {
  repoId: string;
  name: string;
  mode: CodeGraphQueryTemplate["mode"];
  query: string;
};

type WorkspaceEverOsHarnessDraft = {
  name: string;
  description: string;
  memoryNamespace: string;
  profile: string;
  scheduleId: string;
  loopPrompt: string;
  enabled: boolean;
};

type CodeGraphSurfaceDraft = {
  protocol: PlatformSurfaceProtocol;
  host: string;
  port: string;
  path: string;
  mode: PlatformRuntimeSurfaceMode;
};

type WorkspaceScheduleDraft = {
  name: string;
  cron: string;
  prompt: string;
  profile: string;
  kanbanBoardSlug: string;
  enabled: boolean;
};

const EMPTY_MODEL_DRAFT: WorkspaceModelDraft = {
  name: "",
  provider: "custom",
  model: "",
  baseUrl: "",
};

const EMPTY_PROVIDER_DRAFT: WorkspaceProviderDraft = {
  name: "",
  type: "custom",
  apiKey: "",
  baseUrl: "",
};

const EMPTY_PROFILE_DRAFT: WorkspaceProfileDraft = {
  name: "",
  model: "",
  provider: "",
  isDefault: false,
  kanbanBoardSlug: "",
};

const EMPTY_SKILL_DRAFT: WorkspaceSkillDraft = {
  name: "",
  category: "workspace",
  description: "",
};

const EMPTY_MEMORY_DRAFT: WorkspaceMemoryDraft = {
  label: "",
  content: "",
};

const EMPTY_TOOL_DRAFT: WorkspaceToolDraft = {
  name: "",
  description: "",
  endpoint: "",
  type: "mcp",
  enabled: true,
};

const EMPTY_KANBAN_TASK_DRAFT: WorkspaceKanbanTaskDraft = {
  title: "",
  body: "",
  status: "queued",
  priority: 2,
  assignee: "",
  skillsText: "",
};

const EMPTY_KANBAN_BOARD_DRAFT: WorkspaceKanbanBoardDraft = {
  name: "",
  description: "",
};

const EMPTY_CODEGRAPH_REPO_DRAFT: WorkspaceCodeGraphRepoDraft = {
  name: "",
  repoPath: "",
  description: "",
  selected: false,
};

const EMPTY_CODEGRAPH_ENTRYPOINT_DRAFT: WorkspaceCodeGraphEntrypointDraft = {
  repoId: "",
  name: "",
  target: "",
  notes: "",
};

const EMPTY_CODEGRAPH_QUERY_DRAFT: WorkspaceCodeGraphQueryDraft = {
  repoId: "",
  name: "",
  mode: "workflow",
  query: "",
};

const EMPTY_EVEROS_HARNESS_DRAFT: WorkspaceEverOsHarnessDraft = {
  name: "",
  description: "",
  memoryNamespace: "",
  profile: "",
  scheduleId: "",
  loopPrompt: "",
  enabled: true,
};

const EMPTY_CODEGRAPH_SURFACE_DRAFT: CodeGraphSurfaceDraft = {
  protocol: "http",
  host: "",
  port: "",
  path: "/",
  mode: "desktop",
};

const EMPTY_SCHEDULE_DRAFT: WorkspaceScheduleDraft = {
  name: "",
  cron: "60m",
  prompt: "",
  profile: "default",
  kanbanBoardSlug: "",
  enabled: true,
};

function titleCaseWords(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function labelToolKind(type: string): string {
  if (type === "builtin") {
    return "Built-in";
  }

  if (type === "mcp") {
    return "MCP";
  }

  return titleCaseWords(type || "custom");
}

function parseCommaSeparatedValues(value: string): string[] {
  return Array.from(
    new Set(value.split(",").map((item) => item.trim()).filter(Boolean)),
  );
}

function parseOptionalPort(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

function buildCodegraphSurfaceDraft(
  surface: PlatformOverview["runtimeSurfaces"][number] | null,
): CodeGraphSurfaceDraft {
  if (!surface) {
    return EMPTY_CODEGRAPH_SURFACE_DRAFT;
  }

  return {
    protocol: surface.protocol,
    host: surface.host,
    port: surface.port ? String(surface.port) : "",
    path: surface.path,
    mode: surface.mode,
  };
}

function defaultDockerOnboardingDraft(
  node: PlatformDockerNodeSummary,
): DockerOnboardingDraft {
  const suggestedName =
    titleCaseWords(node.composeService ?? node.name) || "Custom Surface";

  return {
    name: suggestedName,
    kind: node.composeProject ? "runtime" : "utility",
    integration: node.ports.length > 0 ? "http-sidecar" : "runtime-service",
  };
}

function dockerPortKey(portBinding: PlatformDockerPortBinding): string {
  return `${portBinding.host}:${portBinding.hostPort}:${portBinding.containerPort}/${portBinding.protocol}`;
}

function sortDockerPortsForDisplay(
  ports: PlatformDockerPortBinding[],
  preferredPort: PlatformDockerPortBinding | null,
): PlatformDockerPortBinding[] {
  if (!preferredPort) {
    return ports;
  }

  const preferredKey = dockerPortKey(preferredPort);

  return [...ports].sort((left, right) => {
    const leftIsPreferred = dockerPortKey(left) === preferredKey;
    const rightIsPreferred = dockerPortKey(right) === preferredKey;

    if (leftIsPreferred && !rightIsPreferred) {
      return -1;
    }

    if (!leftIsPreferred && rightIsPreferred) {
      return 1;
    }

    return left.hostPort - right.hostPort;
  });
}

function formatTimestamp(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

function formatEpochTimestamp(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

function tailPreview(value: string | null | undefined, limit = 1600): string | null {
  if (!value) {
    return null;
  }

  return value.length <= limit ? value : value.slice(-limit);
}

function maskSecret(value: string): string {
  if (!value) {
    return "Not provided";
  }

  const visibleTail = value.slice(-4);
  const hiddenLength = Math.max(6, value.length - visibleTail.length);
  return `${"•".repeat(hiddenLength)}${visibleTail}`;
}

function summarizeEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const path = url.pathname && url.pathname !== "/" ? url.pathname : "";
    return `${url.protocol.replace(":", "").toUpperCase()} · ${url.host}${path}`;
  } catch {
    return endpoint;
  }
}

function buildMonogram(value: string): string {
  const tokens = value
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return "AI";
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0][0] ?? "A"}${tokens[1][0] ?? "I"}`.toUpperCase();
}

function labelProviderDiscoveryStatus(
  status: AgentProviderDiscoveryResult["status"],
): string {
  switch (status) {
    case "ok":
      return "Ready";
    case "no-key":
      return "Needs key";
    case "missing-cli":
      return "CLI missing";
    case "unsupported":
      return "Needs setup";
    case "unreachable":
      return "Unavailable";
  }
}

function summarizeSchedule(cron: string): string {
  if (/^\d+m$/i.test(cron)) {
    return `Every ${cron.replace(/m$/i, "")} minutes`;
  }

  if (/^\d+h$/i.test(cron)) {
    return `Every ${cron.replace(/h$/i, "")} hours`;
  }

  return cron;
}

function resolveRuntimeCandidateAppId(
  node: PlatformDockerNodeSummary,
  appMap: Map<string, PlatformAppSummary>,
): string | null {
  const haystack = [
    node.name,
    node.image,
    node.composeService ?? "",
  ]
    .join(" ")
    .toLowerCase();

  if (INFRA_RUNTIME_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return null;
  }

  if (node.matchedAppId) {
    const matchedApp = appMap.get(node.matchedAppId);

    if (matchedApp?.kind === "runtime") {
      return matchedApp.id;
    }
  }

  for (const target of RUNTIME_INTAKE_TARGETS) {
    if (!appMap.has(target.appId)) {
      continue;
    }

    if (target.keywords.some((keyword) => haystack.includes(keyword))) {
      return target.appId;
    }
  }

  return null;
}

/** Subset of views whose "active runtime" governs the data shown. */
const AGENT_VIEWS = new Set<PlatformView>([
  "chat", "sessions", "agents", "persona", "kanban", "codegraph",
  "everos",
  "models", "providers", "skills", "memory", "tools", "schedules",
]);

const LOCAL_WORKSPACE_VIEWS = new Set<PlatformView>([
  "sessions",
  "agents",
  "persona",
  "kanban",
  "gateway",
  "codegraph",
  "everos",
  "models",
  "providers",
  "skills",
  "memory",
  "tools",
  "schedules",
]);

const KANBAN_STATUSES = ["queued", "active", "done", "failed"] as const;

function ViewIcon({ view }: { view: PlatformView }): React.JSX.Element {
  const svgProps = {
    width: 15,
    height: 15,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (view) {
    // ── Agent views ───────────────────────────────────────────────────────
    case "chat":
      return (
        <svg {...svgProps}>
          <path d="M13 1.5H3A1.5 1.5 0 001.5 3v7A1.5 1.5 0 003 11.5h2.5l2.5 3 2.5-3H13a1.5 1.5 0 001.5-1.5V3A1.5 1.5 0 0013 1.5z" />
        </svg>
      );
    case "sessions":
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5V8l2.5 2.5" />
        </svg>
      );
    case "agents":
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="5.5" r="3" />
          <path d="M1.5 14c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
        </svg>
      );
    case "persona":
      return (
        <svg {...svgProps}>
          <path d="M2 14C2 9 4.7 5 8 5s6 4 6 9" />
          <path d="M5 14C5 11 6.3 9 8 9s3 2 3 5" />
          <circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "kanban":
      return (
        <svg {...svgProps}>
          <rect x="1.5" y="1.5" width="3" height="13" rx="1" />
          <rect x="6.5" y="1.5" width="3" height="9" rx="1" />
          <rect x="11.5" y="1.5" width="3" height="11" rx="1" />
        </svg>
      );
    case "codegraph":
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="2" />
          <circle cx="2.5" cy="4" r="1.5" />
          <circle cx="13.5" cy="4" r="1.5" />
          <circle cx="2.5" cy="12" r="1.5" />
          <circle cx="13.5" cy="12" r="1.5" />
          <path d="M4 4h4M4 12h4M10 4h4M10 12h4M8 6v4" />
        </svg>
      );
    case "everos":
      return (
        <svg {...svgProps}>
          <path d="M8 1.5l5.5 3.2v6.6L8 14.5l-5.5-3.2V4.7L8 1.5z" />
          <path d="M5.5 6.5h5M5.5 9.5h5M8 4.5v7" />
        </svg>
      );
    case "models":
      return (
        <svg {...svgProps}>
          <rect x="1.5" y="5" width="13" height="3.5" rx="1.5" />
          <path d="M8 1.5v3M8 11.5v3M4 8.5v2M12 8.5v2" />
        </svg>
      );
    case "providers":
      return (
        <svg {...svgProps}>
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
          <circle cx="8" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "skills":
      return (
        <svg {...svgProps}>
          <path d="M9.5 1.5a2 2 0 000 4h1a2 2 0 000-4h-1z" />
          <path d="M6.5 10.5a2 2 0 000 4h-1a2 2 0 000-4h1z" />
          <path d="M10.5 3.5H12A2.5 2.5 0 0114.5 6v.5" />
          <path d="M14.5 9v1A2.5 2.5 0 0112 12.5h-1.5" />
          <path d="M5.5 12.5H4A2.5 2.5 0 011.5 10v-.5" />
          <path d="M1.5 7V6A2.5 2.5 0 014 3.5h1.5" />
        </svg>
      );
    case "memory":
      return (
        <svg {...svgProps}>
          <ellipse cx="8" cy="4.5" rx="6" ry="2.5" />
          <path d="M2 4.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3" />
          <path d="M2 7.5v3c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3" />
        </svg>
      );
    case "tools":
      return (
        <svg {...svgProps}>
          <path d="M13.7 2.3a.5.5 0 00-.7 0l-2.1 2.1a2.5 2.5 0 01-3.4 3.4L4.5 10.8a1.5 1.5 0 002.1 2.1l2.9-2.9a2.5 2.5 0 013.4-3.4l-1-1 2.1-2.1a.5.5 0 000-.2z" />
          <path d="M2.3 13.7a.5.5 0 00.7 0l7-7" />
        </svg>
      );
    case "schedules":
      return (
        <svg {...svgProps}>
          <rect x="2" y="3" width="12" height="12" rx="2" />
          <path d="M5.5 1.5v3M10.5 1.5v3M2 7h12" />
          <path d="M6 10.5h4M8 9v3" />
        </svg>
      );
    // ── Platform views ────────────────────────────────────────────────────
    case "console":
      return (
        <svg {...svgProps}>
          <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
          <path d="M4.5 7L7 9L4.5 11" />
          <path d="M9 11h3" />
        </svg>
      );
    case "workspace":
      return (
        <svg {...svgProps}>
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        </svg>
      );
    case "gateway":
      return (
        <svg {...svgProps}>
          <path d="M2 14C2 9 4.7 5 8 5s6 4 6 9" />
          <path d="M5 14C5 11 6.3 9 8 9s3 2 3 5" />
          <circle cx="8" cy="14" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "operations":
      return (
        <svg {...svgProps}>
          <rect x="1.5" y="8.5" width="2" height="5" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="5" y="6" width="2" height="7.5" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="8.5" y="3" width="2" height="10.5" rx="0.5" fill="currentColor" stroke="none" />
          <rect x="12" y="7" width="2" height="6.5" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "settings":
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4" />
        </svg>
      );
    default:
      return (
        <svg {...svgProps}>
          <circle cx="8" cy="8" r="6.5" />
        </svg>
      );
  }
}

function App(): React.JSX.Element {
  const { theme, resolved, setTheme } = useTheme();
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [dockerOnboardingDrafts, setDockerOnboardingDrafts] = useState<
    Record<string, DockerOnboardingDraft>
  >({});
  const [loading, setLoading] = useState(true);

  // ── Agent view state ──────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<AgentChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatRequestMode, setChatRequestMode] = useState<ChatRequestMode>("default");
  const [chatResumeSessionId, setChatResumeSessionId] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const [sessionQuery, setSessionQuery] = useState("");
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<AgentSessionHistoryItem[]>([]);
  const [sessionHistoryLoading, setSessionHistoryLoading] = useState(false);
  const [sessionHistoryError, setSessionHistoryError] = useState<string | null>(null);
  const [sessionTitleDraft, setSessionTitleDraft] = useState("");
  const [sessionActionBusy, setSessionActionBusy] = useState<
    "rename" | "delete" | null
  >(null);
  const [sessionActionError, setSessionActionError] = useState<string | null>(null);
  const [sessionInspectorTab, setSessionInspectorTab] = useState<
    "transcript" | "details"
  >("transcript");
  const [profiles, setProfiles] = useState<AgentProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(null);
  const [isCreatingProfileDraft, setIsCreatingProfileDraft] = useState(false);
  const [models, setModels] = useState<AgentModelEndpoint[]>([]);
  const [providers, setProviders] = useState<AgentProviderConfig[]>([]);
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [memory, setMemory] = useState<AgentMemoryEntry[]>([]);
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [dispatchRuns, setDispatchRuns] = useState<AgentDispatchRun[]>([]);
  const [codegraphRepos, setCodegraphRepos] = useState<CodeGraphRepoSummary[]>([]);
  const [codegraphEntrypoints, setCodegraphEntrypoints] = useState<CodeGraphEntrypoint[]>([]);
  const [codegraphQueries, setCodegraphQueries] = useState<CodeGraphQueryTemplate[]>([]);
  const [everosHarnesses, setEverOsHarnesses] = useState<EverOsHarness[]>([]);
  const [kanbanBoards, setKanbanBoards] = useState<KanbanBoard[]>([]);
  const [kanbanTasks, setKanbanTasks] = useState<KanbanTask[]>([]);
  const [activeKanbanBoard, setActiveKanbanBoard] = useState<string | null>(null);
  const [selectedCodeGraphRepoId, setSelectedCodeGraphRepoId] = useState<string | null>(null);
  const [isCreatingCodeGraphRepoDraft, setIsCreatingCodeGraphRepoDraft] = useState(false);
  const [selectedCodeGraphEntrypointId, setSelectedCodeGraphEntrypointId] = useState<string | null>(null);
  const [isCreatingCodeGraphEntrypointDraft, setIsCreatingCodeGraphEntrypointDraft] = useState(false);
  const [selectedCodeGraphQueryId, setSelectedCodeGraphQueryId] = useState<string | null>(null);
  const [isCreatingCodeGraphQueryDraft, setIsCreatingCodeGraphQueryDraft] = useState(false);
  const [selectedEverOsHarnessId, setSelectedEverOsHarnessId] = useState<string | null>(null);
  const [isCreatingEverOsHarnessDraft, setIsCreatingEverOsHarnessDraft] = useState(false);
  const [isCreatingKanbanBoardDraft, setIsCreatingKanbanBoardDraft] = useState(false);
  const [selectedKanbanTaskId, setSelectedKanbanTaskId] = useState<string | null>(null);
  const [isCreatingKanbanTaskDraft, setIsCreatingKanbanTaskDraft] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isCreatingModelDraft, setIsCreatingModelDraft] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isCreatingProviderDraft, setIsCreatingProviderDraft] = useState(false);
  const [selectedSkillName, setSelectedSkillName] = useState<string | null>(null);
  const [isCreatingSkillDraft, setIsCreatingSkillDraft] = useState(false);
  const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
  const [isCreatingMemoryDraft, setIsCreatingMemoryDraft] = useState(false);
  const [selectedToolName, setSelectedToolName] = useState<string | null>(null);
  const [isCreatingToolDraft, setIsCreatingToolDraft] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [isCreatingScheduleDraft, setIsCreatingScheduleDraft] = useState(false);
  const [runtimeDispatchProfileName, setRuntimeDispatchProfileName] = useState("");
  const [runtimeDispatchScheduleId, setRuntimeDispatchScheduleId] = useState("");
  const [runtimeDispatchIncludeCodeGraph, setRuntimeDispatchIncludeCodeGraph] = useState(true);
  const [runtimeDispatchIncludeEverOs, setRuntimeDispatchIncludeEverOs] = useState(true);
  const [runtimeDispatchCodeGraphRepoId, setRuntimeDispatchCodeGraphRepoId] = useState("");
  const [runtimeDispatchCodeGraphQueryIds, setRuntimeDispatchCodeGraphQueryIds] = useState<string[]>([]);
  const [runtimeDispatchEverOsHarnessIds, setRuntimeDispatchEverOsHarnessIds] = useState<string[]>([]);
  const [hermesLifecycle, setHermesLifecycle] = useState<HermesRuntimeLifecycleSummary | null>(null);
  const [hermesLifecycleLoading, setHermesLifecycleLoading] = useState(false);
  const [hermesLifecycleAction, setHermesLifecycleAction] = useState<
    | "install"
    | "repair"
    | "update"
    | "verify"
    | "doctor"
    | "start-gateway"
    | "stop-gateway"
    | "adopt"
    | "reset"
    | null
  >(null);
  const [hermesLifecycleError, setHermesLifecycleError] = useState<string | null>(null);
  const [hermesReadyNotice, setHermesReadyNotice] = useState<string | null>(null);
  const hermesGatewayTransitionRef = useRef<
    { running: boolean; ready: boolean } | null
  >(null);
  const [agentDataError, setAgentDataError] = useState<string | null>(null);
  const [personaDraft, setPersonaDraft] = useState("");
  const [personaLoading, setPersonaLoading] = useState(false);
  const [personaSaving, setPersonaSaving] = useState(false);
  const [personaDirty, setPersonaDirty] = useState(false);
  const [personaError, setPersonaError] = useState<string | null>(null);
  const [personaSavedAt, setPersonaSavedAt] = useState<number | null>(null);
  const [modelDraft, setModelDraft] = useState<WorkspaceModelDraft>(
    EMPTY_MODEL_DRAFT,
  );
  const [providerDraft, setProviderDraft] = useState<WorkspaceProviderDraft>(
    EMPTY_PROVIDER_DRAFT,
  );
  const [providerDiscovery, setProviderDiscovery] = useState<
    AgentProviderDiscoveryResult | null
  >(null);
  const [providerDiscoveryBusy, setProviderDiscoveryBusy] = useState(false);
  const [profileDraft, setProfileDraft] = useState<WorkspaceProfileDraft>(
    EMPTY_PROFILE_DRAFT,
  );
  const [skillDraft, setSkillDraft] = useState<WorkspaceSkillDraft>(
    EMPTY_SKILL_DRAFT,
  );
  const [memoryDraft, setMemoryDraft] = useState<WorkspaceMemoryDraft>(
    EMPTY_MEMORY_DRAFT,
  );
  const [toolDraft, setToolDraft] = useState<WorkspaceToolDraft>(
    EMPTY_TOOL_DRAFT,
  );
  const [kanbanBoardDraft, setKanbanBoardDraft] = useState<WorkspaceKanbanBoardDraft>(
    EMPTY_KANBAN_BOARD_DRAFT,
  );
  const [kanbanTaskDraft, setKanbanTaskDraft] = useState<WorkspaceKanbanTaskDraft>(
    EMPTY_KANBAN_TASK_DRAFT,
  );
  const [codegraphSurfaceDraft, setCodegraphSurfaceDraft] = useState<CodeGraphSurfaceDraft>(
    EMPTY_CODEGRAPH_SURFACE_DRAFT,
  );
  const [codegraphRepoDraft, setCodegraphRepoDraft] = useState<WorkspaceCodeGraphRepoDraft>(
    EMPTY_CODEGRAPH_REPO_DRAFT,
  );
  const [codegraphEntrypointDraft, setCodegraphEntrypointDraft] = useState<WorkspaceCodeGraphEntrypointDraft>(
    EMPTY_CODEGRAPH_ENTRYPOINT_DRAFT,
  );
  const [codegraphQueryDraft, setCodegraphQueryDraft] = useState<WorkspaceCodeGraphQueryDraft>(
    EMPTY_CODEGRAPH_QUERY_DRAFT,
  );
  const [everosHarnessDraft, setEverOsHarnessDraft] = useState<WorkspaceEverOsHarnessDraft>(
    EMPTY_EVEROS_HARNESS_DRAFT,
  );
  const [scheduleDraft, setScheduleDraft] = useState<WorkspaceScheduleDraft>(
    EMPTY_SCHEDULE_DRAFT,
  );
  const isCreatingToolDraftRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;

    if (!window.platformAPI) {
      setLoading(false);
      return;
    }

    void window.platformAPI.getOverview().then((nextOverview) => {
      if (!alive) return;
      setOverview(nextOverview);
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!overview || overview.apps.length === 0) return;
    if (!selectedAppId) {
      setSelectedAppId(overview.apps[0].id);
      return;
    }
    if (!overview.apps.some((app) => app.id === selectedAppId)) {
      setSelectedAppId(overview.apps[0].id);
    }
  }, [overview, selectedAppId]);

  useEffect(() => {
    if (kanbanTasks.length === 0) {
      setSelectedKanbanTaskId(null);
      return;
    }
    if (isCreatingKanbanTaskDraft) {
      return;
    }
    if (!selectedKanbanTaskId || !kanbanTasks.some((task) => task.id === selectedKanbanTaskId)) {
      setSelectedKanbanTaskId(kanbanTasks[0].id);
    }
  }, [isCreatingKanbanTaskDraft, kanbanTasks, selectedKanbanTaskId]);

  useEffect(() => {
    if (profiles.length === 0) {
      setSelectedProfileName(null);
      return;
    }
    if (isCreatingProfileDraft) {
      return;
    }
    if (!selectedProfileName || !profiles.some((profile) => profile.name === selectedProfileName)) {
      setSelectedProfileName(
        profiles.find((profile) => profile.isDefault)?.name ?? profiles[0].name,
      );
    }
  }, [isCreatingProfileDraft, profiles, selectedProfileName]);

  useEffect(() => {
    if (models.length === 0) {
      setSelectedModelId(null);
      setIsCreatingModelDraft(false);
      return;
    }
    if (isCreatingModelDraft) {
      return;
    }
    if (!selectedModelId || !models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [isCreatingModelDraft, models, selectedModelId]);

  useEffect(() => {
    if (providers.length === 0) {
      setSelectedProviderId(null);
      return;
    }
    if (isCreatingProviderDraft) {
      return;
    }
    if (!selectedProviderId || !providers.some((provider) => provider.id === selectedProviderId)) {
      setSelectedProviderId(providers[0].id);
    }
  }, [isCreatingProviderDraft, providers, selectedProviderId]);

  useEffect(() => {
    if (skills.length === 0) {
      setSelectedSkillName(null);
      return;
    }
    if (isCreatingSkillDraft) {
      return;
    }
    if (!selectedSkillName || !skills.some((skill) => skill.name === selectedSkillName)) {
      setSelectedSkillName(skills[0].name);
    }
  }, [isCreatingSkillDraft, selectedSkillName, skills]);

  useEffect(() => {
    if (memory.length === 0) {
      setSelectedMemoryId(null);
      return;
    }
    if (isCreatingMemoryDraft) {
      return;
    }
    if (!selectedMemoryId || !memory.some((entry) => entry.id === selectedMemoryId)) {
      setSelectedMemoryId(memory[0].id);
    }
  }, [isCreatingMemoryDraft, memory, selectedMemoryId]);

  useEffect(() => {
    if (tools.length === 0) {
      setSelectedToolName(null);
      return;
    }
    if (isCreatingToolDraft) {
      return;
    }
    if (!selectedToolName || !tools.some((tool) => tool.name === selectedToolName)) {
      setSelectedToolName(tools[0].name);
    }
  }, [isCreatingToolDraft, selectedToolName, tools]);

  useEffect(() => {
    if (schedules.length === 0) {
      setSelectedScheduleId(null);
      return;
    }
    if (isCreatingScheduleDraft) {
      return;
    }
    if (!selectedScheduleId || !schedules.some((schedule) => schedule.id === selectedScheduleId)) {
      setSelectedScheduleId(schedules[0].id);
    }
  }, [isCreatingScheduleDraft, schedules, selectedScheduleId]);

  const visibleApps = useMemo(() => {
    if (!overview) return [];
    return overview.apps.filter((app) =>
      kindFilter === "all" ? true : app.kind === kindFilter,
    );
  }, [kindFilter, overview]);

  const capabilityMap = useMemo(
    () => new Map(overview?.capabilities.map((capability) => [capability.id, capability]) ?? []),
    [overview],
  );

  const appMap = useMemo(
    () => new Map(overview?.apps.map((app) => [app.id, app]) ?? []),
    [overview],
  );

  const selectedApp = useMemo<PlatformAppSummary | null>(() => {
    if (!overview || overview.apps.length === 0) return null;
    return (
      visibleApps.find((app) => app.id === selectedAppId) ??
      overview.apps.find((app) => app.id === selectedAppId) ??
      visibleApps[0] ??
      overview.apps[0]
    );
  }, [overview, selectedAppId, visibleApps]);

  const workspaceFeatureApps = useMemo(() => {
    if (!overview) {
      return [];
    }

    return overview.apps.filter(
      (app) =>
        app.enabled &&
        app.kind !== "runtime",
    );
  }, [overview]);

  const selectedWorkspaceApp = useMemo<PlatformAppSummary | null>(() => {
    if (workspaceFeatureApps.length === 0) {
      return null;
    }

    return (
      workspaceFeatureApps.find((app) => app.id === selectedAppId) ??
      workspaceFeatureApps[0]
    );
  }, [selectedAppId, workspaceFeatureApps]);

  const selectedRuntimeProvider = useMemo(() => {
    if (!overview || overview.runtimeProviders.length === 0) {
      return null;
    }

    return (
      overview.runtimeProviders.find(
        (provider) => provider.id === overview.state.activeRuntimeProviderId,
      ) ?? overview.runtimeProviders[0]
    );
  }, [overview]);

  const selectedTaskOrchestrator = useMemo(() => {
    if (!overview || overview.taskOrchestrators.length === 0) {
      return null;
    }

    return (
      overview.taskOrchestrators.find(
        (orchestrator) =>
          orchestrator.id === overview.state.activeTaskOrchestratorId,
      ) ?? overview.taskOrchestrators[0]
    );
  }, [overview]);

  const selectedRuntimeSmokeTargets = useMemo(() => {
    if (!overview || !selectedRuntimeProvider) {
      return [];
    }

    return overview.smokeTargets.filter(
      (target) => target.runtimeProviderId === selectedRuntimeProvider.id,
    );
  }, [overview, selectedRuntimeProvider]);

  const runtimeIntakeCandidates = useMemo<RuntimeIntakeCandidate[]>(() => {
    if (!overview) {
      return [];
    }

    return overview.docker.nodes
      .map((node) => {
        const appId = resolveRuntimeCandidateAppId(node, appMap);
        const app = appId ? appMap.get(appId) ?? null : null;

        if (!app) {
          return null;
        }

        const linkedSurface =
          overview.runtimeSurfaces.find((surface) => surface.appId === app.id) ?? null;

        return {
          node,
          app,
          linkedSurface,
        } satisfies RuntimeIntakeCandidate;
      })
      .filter(
        (candidate): candidate is RuntimeIntakeCandidate => candidate != null,
      )
      .sort((left, right) => {
        const leftBound = left.node.matchedAppId === left.app.id ? 0 : 1;
        const rightBound = right.node.matchedAppId === right.app.id ? 0 : 1;

        if (leftBound !== rightBound) {
          return leftBound - rightBound;
        }

        const leftRunning = left.node.state === "running" ? 0 : 1;
        const rightRunning = right.node.state === "running" ? 0 : 1;

        if (leftRunning !== rightRunning) {
          return leftRunning - rightRunning;
        }

        const leftHermesFallback = left.app.id === "hermes-agent" ? 1 : 0;
        const rightHermesFallback = right.app.id === "hermes-agent" ? 1 : 0;

        if (leftHermesFallback !== rightHermesFallback) {
          return leftHermesFallback - rightHermesFallback;
        }

        return left.app.name.localeCompare(right.app.name);
      });
  }, [appMap, overview]);

  const selectedRuntimeLaneActionModel = useMemo(() => {
    if (!selectedRuntimeProvider) {
      return null;
    }

    return buildRuntimeLaneActionModel({
      runtimeProvider: selectedRuntimeProvider,
      smokeTargets: selectedRuntimeSmokeTargets,
      runtimeIntakeCandidates: runtimeIntakeCandidates.map(({ app, node }) => ({
        appId: app.id,
        node,
      })),
    });
  }, [runtimeIntakeCandidates, selectedRuntimeProvider, selectedRuntimeSmokeTargets]);

  async function handleViewChange(view: PlatformView): Promise<void> {
    const nextOverview = await window.platformAPI.setActiveView(view);
    setOverview(nextOverview);
  }

  // ── Agent data fetching ────────────────────────────────────────────────────

  const agentSurfaceUrl = useMemo(
    () => selectedRuntimeProvider?.surfaceUrl ?? null,
    [selectedRuntimeProvider],
  );

  const activeView = overview?.state.activeView ?? "console";
  const shouldObserveHermesLifecycle =
    activeView === "console" ||
    (activeView === "gateway" && selectedRuntimeProvider?.id === "hermes");

  const hermesLifecyclePrimaryAction = useMemo(
    () => {
      switch (hermesLifecycle?.homeState) {
        case "installed":
          return { key: "update", label: "Update Hermes locally" } as const;
        case "partial":
          return { key: "repair", label: "Repair Hermes locally" } as const;
        default:
          return { key: "install", label: "Install Hermes locally" } as const;
      }
    },
    [hermesLifecycle?.homeState],
  );

  const hermesGatewayAction = useMemo(
    () =>
      hermesLifecycle?.gatewayRunning
        ? ({ key: "stop-gateway", label: "Stop local gateway" } as const)
        : ({ key: "start-gateway", label: "Start local gateway" } as const),
    [hermesLifecycle?.gatewayRunning],
  );

  const selectedModel = useMemo(
    () => {
      if (isCreatingModelDraft) {
        return null;
      }

      return models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;
    },
    [isCreatingModelDraft, models, selectedModelId],
  );

  const filteredModels = useMemo(() => {
    const query = modelSearchQuery.trim().toLowerCase();
    if (!query) {
      return models;
    }

    return models.filter((model) =>
      [model.name, model.provider, model.model, model.baseUrl]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [modelSearchQuery, models]);

  const selectedProvider = useMemo(
    () => {
      if (isCreatingProviderDraft) {
        return null;
      }

      return (
        providers.find((provider) => provider.id === selectedProviderId) ??
        providers[0] ??
        null
      );
    },
    [isCreatingProviderDraft, providers, selectedProviderId],
  );

  const selectedKanbanBoard = useMemo(
    () =>
      kanbanBoards.find((board) => board.slug === activeKanbanBoard) ??
      kanbanBoards[0] ??
      null,
    [activeKanbanBoard, kanbanBoards],
  );

  const codegraphApp = useMemo(
    () => overview?.apps.find((app) => app.id === "codegraph") ?? null,
    [overview],
  );

  const codegraphSurface = useMemo(
    () => overview?.runtimeSurfaces.find((surface) => surface.appId === "codegraph") ?? null,
    [overview],
  );

  const codegraphLinkedProvider = useMemo(
    () =>
      overview?.runtimeProviders.find(
        (provider) => provider.linkedRuntimeSurfaceAppId === "codegraph",
      ) ?? null,
    [overview],
  );

  const everosApp = useMemo(
    () => overview?.apps.find((app) => app.id === "everos") ?? null,
    [overview],
  );

  const everosSurface = useMemo(
    () => overview?.runtimeSurfaces.find((surface) => surface.appId === "everos") ?? null,
    [overview],
  );

  const everosLinkedProvider = useMemo(
    () =>
      overview?.runtimeProviders.find(
        (provider) => provider.linkedRuntimeSurfaceAppId === "everos",
      ) ?? null,
    [overview],
  );

  const selectedCodeGraphRepo = useMemo(
    () => {
      if (isCreatingCodeGraphRepoDraft) {
        return null;
      }

      return (
        codegraphRepos.find((repo) => repo.id === selectedCodeGraphRepoId) ??
        codegraphRepos.find((repo) => repo.selected) ??
        codegraphRepos[0] ??
        null
      );
    },
    [codegraphRepos, isCreatingCodeGraphRepoDraft, selectedCodeGraphRepoId],
  );

  const visibleCodeGraphEntrypoints = useMemo(
    () =>
      selectedCodeGraphRepo
        ? codegraphEntrypoints.filter((entrypoint) => entrypoint.repoId === selectedCodeGraphRepo.id)
        : codegraphEntrypoints,
    [codegraphEntrypoints, selectedCodeGraphRepo],
  );

  const selectedCodeGraphEntrypoint = useMemo(
    () => {
      if (isCreatingCodeGraphEntrypointDraft) {
        return null;
      }

      return (
        visibleCodeGraphEntrypoints.find(
          (entrypoint) => entrypoint.id === selectedCodeGraphEntrypointId,
        ) ?? visibleCodeGraphEntrypoints[0] ?? null
      );
    },
    [isCreatingCodeGraphEntrypointDraft, selectedCodeGraphEntrypointId, visibleCodeGraphEntrypoints],
  );

  const visibleCodeGraphQueries = useMemo(
    () =>
      codegraphQueries.filter(
        (query) => !query.repoId || query.repoId === selectedCodeGraphRepo?.id,
      ),
    [codegraphQueries, selectedCodeGraphRepo?.id],
  );

  const selectedCodeGraphQuery = useMemo(
    () => {
      if (isCreatingCodeGraphQueryDraft) {
        return null;
      }

      return (
        visibleCodeGraphQueries.find((query) => query.id === selectedCodeGraphQueryId) ??
        visibleCodeGraphQueries[0] ??
        null
      );
    },
    [isCreatingCodeGraphQueryDraft, selectedCodeGraphQueryId, visibleCodeGraphQueries],
  );

  const selectedEverOsHarness = useMemo(
    () => {
      if (isCreatingEverOsHarnessDraft) {
        return null;
      }

      return (
        everosHarnesses.find((harness) => harness.id === selectedEverOsHarnessId) ??
        everosHarnesses[0] ??
        null
      );
    },
    [everosHarnesses, isCreatingEverOsHarnessDraft, selectedEverOsHarnessId],
  );

  const selectedProfile = useMemo(
    () => {
      if (isCreatingProfileDraft) {
        return null;
      }

      return (
        profiles.find((profile) => profile.name === selectedProfileName) ??
        profiles[0] ??
        null
      );
    },
    [isCreatingProfileDraft, profiles, selectedProfileName],
  );

  const selectedKanbanTask = useMemo(
    () => {
      if (isCreatingKanbanTaskDraft) {
        return null;
      }

      return (
        kanbanTasks.find((task) => task.id === selectedKanbanTaskId) ??
        kanbanTasks[0] ??
        null
      );
    },
    [isCreatingKanbanTaskDraft, kanbanTasks, selectedKanbanTaskId],
  );

  const selectedProviderPreset = useMemo(
    () => getProviderPreset(selectedProvider?.type ?? providerDraft.type),
    [providerDraft.type, selectedProvider?.type],
  );

  const profileProviderOptions = useMemo<RegistrySelectOption[]>(() => {
    const optionMap = new Map<string, RegistrySelectOption>();

    for (const provider of providers) {
      optionMap.set(provider.type, {
        value: provider.type,
        label:
          provider.name && provider.name !== provider.type
            ? `${provider.name} (${provider.type})`
            : provider.type,
      });
    }

    for (const model of models) {
      if (!optionMap.has(model.provider)) {
        optionMap.set(model.provider, {
          value: model.provider,
          label: model.provider,
        });
      }
    }

    return Array.from(optionMap.values());
  }, [models, providers]);

  const profileProviderValues = useMemo(
    () => new Set(profileProviderOptions.map((option) => option.value)),
    [profileProviderOptions],
  );

  const profileModelOptions = useMemo<RegistrySelectOption[]>(() => {
    const filteredModels = profileDraft.provider
      ? models.filter((model) => model.provider === profileDraft.provider)
      : models;
    const source = filteredModels.length > 0 ? filteredModels : models;
    const optionMap = new Map<string, RegistrySelectOption>();

    for (const model of source) {
      optionMap.set(`${model.provider}:${model.model}`, {
        value: model.model,
        label:
          model.name && model.name !== model.model
            ? `${model.name} (${model.model})`
            : model.model,
      });
    }

    return Array.from(optionMap.values());
  }, [models, profileDraft.provider]);

  const profileModelValues = useMemo(
    () => new Set(profileModelOptions.map((option) => option.value)),
    [profileModelOptions],
  );

  const kanbanBoardOptions = useMemo<RegistrySelectOption[]>(() => {
    return kanbanBoards.map((board) => ({
      value: board.slug,
      label: board.name,
    }));
  }, [kanbanBoards]);

  const scheduleProfileOptions = useMemo<RegistrySelectOption[]>(() => {
    return profiles.map((profile) => ({
      value: profile.name,
      label: profile.isDefault ? `${profile.name} (default)` : profile.name,
    }));
  }, [profiles]);

  const codegraphRepoOptions = useMemo<RegistrySelectOption[]>(() => {
    return codegraphRepos.map((repo) => ({
      value: repo.id,
      label: repo.name,
    }));
  }, [codegraphRepos]);

  const scheduleOptions = useMemo<RegistrySelectOption[]>(() => {
    return schedules.map((schedule) => ({
      value: schedule.id,
      label: schedule.name,
    }));
  }, [schedules]);

  const profileProviderMissing =
    profileDraft.provider.trim().length > 0 &&
    !profileProviderValues.has(profileDraft.provider);
  const profileModelMissing =
    profileDraft.model.trim().length > 0 && !profileModelValues.has(profileDraft.model);
  const profileDraftValid =
    profileDraft.name.trim().length > 0 &&
    profileDraft.provider.trim().length > 0 &&
    profileDraft.model.trim().length > 0 &&
    !profileProviderMissing &&
    !profileModelMissing;
  const kanbanBoardDraftValid = kanbanBoardDraft.name.trim().length > 0;
  const codegraphRepoDraftValid =
    codegraphRepoDraft.name.trim().length > 0 && codegraphRepoDraft.repoPath.trim().length > 0;
  const codegraphEntrypointDraftValid =
    codegraphEntrypointDraft.repoId.trim().length > 0 &&
    codegraphEntrypointDraft.name.trim().length > 0 &&
    codegraphEntrypointDraft.target.trim().length > 0;
  const codegraphQueryDraftValid =
    codegraphQueryDraft.name.trim().length > 0 && codegraphQueryDraft.query.trim().length > 0;
  const everosHarnessDraftValid =
    everosHarnessDraft.name.trim().length > 0 &&
    everosHarnessDraft.memoryNamespace.trim().length > 0 &&
    everosHarnessDraft.profile.trim().length > 0 &&
    everosHarnessDraft.loopPrompt.trim().length > 0;
  const codegraphDraftPortValue = parseOptionalPort(codegraphSurfaceDraft.port);
  const codegraphPortValid =
    codegraphSurfaceDraft.port.trim().length === 0 || codegraphDraftPortValue !== null;
  const codegraphDraftValid =
    codegraphSurfaceDraft.host.trim().length > 0 && codegraphPortValid;
  const codegraphDraftDirty =
    codegraphSurface !== null &&
    (
      codegraphSurface.protocol !== codegraphSurfaceDraft.protocol ||
      codegraphSurface.host !== codegraphSurfaceDraft.host ||
      (codegraphSurface.port ? String(codegraphSurface.port) : "") !== codegraphSurfaceDraft.port ||
      codegraphSurface.path !== codegraphSurfaceDraft.path ||
      codegraphSurface.mode !== codegraphSurfaceDraft.mode
    );

  const providerPresetSections = useMemo(
    () =>
      (["local", "byok", "cli"] as const).map((category) => ({
        category,
        label: PROVIDER_PRESET_CATEGORY_LABELS[category],
        presets: PROVIDER_PRESETS.filter((preset) => preset.category === category),
      })),
    [],
  );

  const presetProviderMatches = useMemo(() => {
    return new Map(
      PROVIDER_PRESETS.map((preset) => [
        preset.id,
        providers.find(
          (provider) =>
            provider.type === preset.type &&
            (preset.baseUrl ? provider.baseUrl === preset.baseUrl : true),
        ) ??
          providers.find((provider) => provider.type === preset.type) ??
          null,
      ]),
    );
  }, [providers]);

  const selectedSkill = useMemo(
    () => {
      if (isCreatingSkillDraft) {
        return null;
      }

      return skills.find((skill) => skill.name === selectedSkillName) ?? skills[0] ?? null;
    },
    [isCreatingSkillDraft, selectedSkillName, skills],
  );

  const selectedMemoryEntry = useMemo(
    () => {
      if (isCreatingMemoryDraft) {
        return null;
      }

      return memory.find((entry) => entry.id === selectedMemoryId) ?? memory[0] ?? null;
    },
    [isCreatingMemoryDraft, memory, selectedMemoryId],
  );

  const selectedTool = useMemo(
    () => {
      if (isCreatingToolDraft) {
        return null;
      }

      return tools.find((tool) => tool.name === selectedToolName) ?? tools[0] ?? null;
    },
    [isCreatingToolDraft, selectedToolName, tools],
  );

  const selectedSchedule = useMemo(
    () => {
      if (isCreatingScheduleDraft) {
        return null;
      }

      return (
        schedules.find((schedule) => schedule.id === selectedScheduleId) ??
        schedules[0] ??
        null
      );
    },
    [isCreatingScheduleDraft, schedules, selectedScheduleId],
  );

  const defaultProfileName =
    profiles.find((profile) => profile.isDefault)?.name ??
    profiles[0]?.name ??
    EMPTY_SCHEDULE_DRAFT.profile;

  const defaultProfileBoardSlug =
    profiles.find((profile) => profile.isDefault)?.kanbanBoardSlug ??
    profiles[0]?.kanbanBoardSlug ??
    "";

  useEffect(() => {
    if (isCreatingKanbanBoardDraft) {
      return;
    }

    if (selectedKanbanBoard) {
      setKanbanBoardDraft({
        name: selectedKanbanBoard.name,
        description: selectedKanbanBoard.description ?? "",
      });
      return;
    }

    setKanbanBoardDraft(EMPTY_KANBAN_BOARD_DRAFT);
  }, [isCreatingKanbanBoardDraft, selectedKanbanBoard]);

  useEffect(() => {
    setCodegraphSurfaceDraft(buildCodegraphSurfaceDraft(codegraphSurface));
  }, [codegraphSurface]);

  useEffect(() => {
    if (codegraphRepos.length === 0) {
      setSelectedCodeGraphRepoId(null);
      return;
    }

    if (
      !selectedCodeGraphRepoId ||
      !codegraphRepos.some((repo) => repo.id === selectedCodeGraphRepoId)
    ) {
      setSelectedCodeGraphRepoId(
        codegraphRepos.find((repo) => repo.selected)?.id ?? codegraphRepos[0].id,
      );
    }
  }, [codegraphRepos, selectedCodeGraphRepoId]);

  useEffect(() => {
    if (selectedCodeGraphRepo) {
      setIsCreatingCodeGraphRepoDraft(false);
      setCodegraphRepoDraft({
        name: selectedCodeGraphRepo.name,
        repoPath: selectedCodeGraphRepo.repoPath,
        description: selectedCodeGraphRepo.description,
        selected: selectedCodeGraphRepo.selected,
      });
      return;
    }

    if (!isCreatingCodeGraphRepoDraft) {
      setCodegraphRepoDraft(EMPTY_CODEGRAPH_REPO_DRAFT);
    }
  }, [isCreatingCodeGraphRepoDraft, selectedCodeGraphRepo]);

  useEffect(() => {
    if (selectedCodeGraphEntrypoint) {
      setIsCreatingCodeGraphEntrypointDraft(false);
      setCodegraphEntrypointDraft({
        repoId: selectedCodeGraphEntrypoint.repoId,
        name: selectedCodeGraphEntrypoint.name,
        target: selectedCodeGraphEntrypoint.target,
        notes: selectedCodeGraphEntrypoint.notes,
      });
      return;
    }

    if (!isCreatingCodeGraphEntrypointDraft) {
      setCodegraphEntrypointDraft({
        ...EMPTY_CODEGRAPH_ENTRYPOINT_DRAFT,
        repoId: selectedCodeGraphRepo?.id ?? "",
      });
    }
  }, [isCreatingCodeGraphEntrypointDraft, selectedCodeGraphEntrypoint, selectedCodeGraphRepo?.id]);

  useEffect(() => {
    if (selectedCodeGraphQuery) {
      setIsCreatingCodeGraphQueryDraft(false);
      setCodegraphQueryDraft({
        repoId: selectedCodeGraphQuery.repoId ?? "",
        name: selectedCodeGraphQuery.name,
        mode: selectedCodeGraphQuery.mode,
        query: selectedCodeGraphQuery.query,
      });
      return;
    }

    if (!isCreatingCodeGraphQueryDraft) {
      setCodegraphQueryDraft({
        ...EMPTY_CODEGRAPH_QUERY_DRAFT,
        repoId: selectedCodeGraphRepo?.id ?? "",
      });
    }
  }, [isCreatingCodeGraphQueryDraft, selectedCodeGraphQuery, selectedCodeGraphRepo?.id]);

  useEffect(() => {
    if (selectedEverOsHarness) {
      setIsCreatingEverOsHarnessDraft(false);
      setEverOsHarnessDraft({
        name: selectedEverOsHarness.name,
        description: selectedEverOsHarness.description,
        memoryNamespace: selectedEverOsHarness.memoryNamespace,
        profile: selectedEverOsHarness.profile,
        scheduleId: selectedEverOsHarness.scheduleId ?? "",
        loopPrompt: selectedEverOsHarness.loopPrompt,
        enabled: selectedEverOsHarness.enabled,
      });
      return;
    }

    if (!isCreatingEverOsHarnessDraft) {
      setEverOsHarnessDraft({
        ...EMPTY_EVEROS_HARNESS_DRAFT,
        profile: defaultProfileName,
      });
    }
  }, [defaultProfileName, isCreatingEverOsHarnessDraft, selectedEverOsHarness]);

  useEffect(() => {
    if (selectedKanbanTask) {
      setIsCreatingKanbanTaskDraft(false);
      setKanbanTaskDraft({
        title: selectedKanbanTask.title,
        body: selectedKanbanTask.body ?? "",
        status: KANBAN_STATUSES.includes(selectedKanbanTask.status as (typeof KANBAN_STATUSES)[number])
          ? (selectedKanbanTask.status as (typeof KANBAN_STATUSES)[number])
          : "queued",
        priority: selectedKanbanTask.priority,
        assignee: selectedKanbanTask.assignee ?? "",
        skillsText: (selectedKanbanTask.skills ?? []).join(", "),
      });
      return;
    }

    if (!isCreatingKanbanTaskDraft) {
      setKanbanTaskDraft(EMPTY_KANBAN_TASK_DRAFT);
    }
  }, [isCreatingKanbanTaskDraft, selectedKanbanTask]);

  useEffect(() => {
    if (selectedProfile) {
      setIsCreatingProfileDraft(false);
      setProfileDraft({
        name: selectedProfile.name,
        model: selectedProfile.model,
        provider: selectedProfile.provider,
        isDefault: selectedProfile.isDefault,
        kanbanBoardSlug: selectedProfile.kanbanBoardSlug ?? "",
      });
      return;
    }

    if (!isCreatingProfileDraft) {
      setProfileDraft(EMPTY_PROFILE_DRAFT);
    }
  }, [isCreatingProfileDraft, selectedProfile]);

  useEffect(() => {
    if (selectedModel) {
      setIsCreatingModelDraft(false);
      setModelDraft({
        name: selectedModel.name,
        provider: selectedModel.provider,
        model: selectedModel.model,
        baseUrl: selectedModel.baseUrl,
      });
      return;
    }

    if (!isCreatingModelDraft) {
      setModelDraft(EMPTY_MODEL_DRAFT);
    }
  }, [isCreatingModelDraft, selectedModel]);

  useEffect(() => {
    if (selectedProvider) {
      setIsCreatingProviderDraft(false);
      setProviderDraft({
        name: selectedProvider.name,
        type: selectedProvider.type,
        apiKey: selectedProvider.apiKey,
        baseUrl: selectedProvider.baseUrl,
      });
      return;
    }

    if (!isCreatingProviderDraft) {
      setProviderDraft(EMPTY_PROVIDER_DRAFT);
    }
  }, [isCreatingProviderDraft, selectedProvider]);

  useEffect(() => {
    setProviderDiscovery(null);
  }, [selectedProvider?.id, providerDraft.type, providerDraft.baseUrl, providerDraft.apiKey]);

  useEffect(() => {
    if (selectedSkill) {
      setIsCreatingSkillDraft(false);
      setSkillDraft({
        name: selectedSkill.name,
        category: selectedSkill.category,
        description: selectedSkill.description,
      });
      return;
    }

    if (!isCreatingSkillDraft) {
      setSkillDraft(EMPTY_SKILL_DRAFT);
    }
  }, [isCreatingSkillDraft, selectedSkill]);

  useEffect(() => {
    if (selectedMemoryEntry) {
      setIsCreatingMemoryDraft(false);
      setMemoryDraft({
        label: selectedMemoryEntry.label,
        content: selectedMemoryEntry.content,
      });
      return;
    }

    if (!isCreatingMemoryDraft) {
      setMemoryDraft(EMPTY_MEMORY_DRAFT);
    }
  }, [isCreatingMemoryDraft, selectedMemoryEntry]);

  useEffect(() => {
    isCreatingToolDraftRef.current = isCreatingToolDraft;
  }, [isCreatingToolDraft]);

  useEffect(() => {
    if (isCreatingToolDraftRef.current) {
      return;
    }

    if (selectedTool) {
      setToolDraft({
        name: selectedTool.name,
        description: selectedTool.description,
        endpoint: selectedTool.endpoint,
        type: selectedTool.type,
        enabled: selectedTool.enabled !== false,
      });
      return;
    }

    if (!isCreatingToolDraft) {
      setToolDraft(EMPTY_TOOL_DRAFT);
    }
  }, [isCreatingToolDraft, selectedTool]);

  useEffect(() => {
    if (selectedSchedule) {
      setIsCreatingScheduleDraft(false);
      setScheduleDraft({
        name: selectedSchedule.name,
        cron: selectedSchedule.cron,
        prompt: selectedSchedule.prompt,
        profile: selectedSchedule.profile,
        kanbanBoardSlug: selectedSchedule.kanbanBoardSlug ?? "",
        enabled: selectedSchedule.enabled,
      });
      return;
    }

    if (!isCreatingScheduleDraft) {
      setScheduleDraft({
        ...EMPTY_SCHEDULE_DRAFT,
        profile: defaultProfileName,
        kanbanBoardSlug: defaultProfileBoardSlug,
      });
    }
  }, [defaultProfileBoardSlug, defaultProfileName, isCreatingScheduleDraft, selectedSchedule]);

  const activeProfile = useMemo<AgentProfile | null>(
    () => profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null,
    [profiles],
  );

  const selectedRuntimeDispatchProfile = useMemo<AgentProfile | null>(
    () =>
      profiles.find((profile) => profile.name === runtimeDispatchProfileName) ??
      activeProfile ??
      null,
    [activeProfile, profiles, runtimeDispatchProfileName],
  );

  const runtimeDispatchSchedules = useMemo(() => {
    if (!selectedRuntimeDispatchProfile) {
      return schedules;
    }

    const matchingSchedules = schedules.filter(
      (schedule) => schedule.profile === selectedRuntimeDispatchProfile.name,
    );

    return matchingSchedules.length > 0 ? matchingSchedules : schedules;
  }, [schedules, selectedRuntimeDispatchProfile]);

  const selectedRuntimeDispatchSchedule = useMemo<AgentSchedule | null>(
    () =>
      runtimeDispatchSchedules.find(
        (schedule) => schedule.id === runtimeDispatchScheduleId,
      ) ??
      runtimeDispatchSchedules[0] ??
      null,
    [runtimeDispatchScheduleId, runtimeDispatchSchedules],
  );

  const runtimeDispatchProfileBoard = useMemo(
    () =>
      kanbanBoards.find(
        (board) => board.slug === selectedRuntimeDispatchProfile?.kanbanBoardSlug,
      ) ?? null,
    [kanbanBoards, selectedRuntimeDispatchProfile?.kanbanBoardSlug],
  );

  const runtimeDispatchScheduleBoard = useMemo(
    () =>
      kanbanBoards.find(
        (board) => board.slug === selectedRuntimeDispatchSchedule?.kanbanBoardSlug,
      ) ?? null,
    [kanbanBoards, selectedRuntimeDispatchSchedule?.kanbanBoardSlug],
  );

  const recentDispatchRuns = useMemo(() => dispatchRuns.slice(0, 3), [dispatchRuns]);

  const runtimeDispatchCodeGraphRepo = useMemo(
    () =>
      codegraphRepos.find((repo) => repo.id === runtimeDispatchCodeGraphRepoId) ??
      selectedCodeGraphRepo ??
      codegraphRepos[0] ??
      null,
    [codegraphRepos, runtimeDispatchCodeGraphRepoId, selectedCodeGraphRepo],
  );

  const runtimeDispatchCodeGraphQueries = useMemo(
    () =>
      codegraphQueries.filter(
        (query) =>
          runtimeDispatchCodeGraphRepo != null &&
          (query.repoId == null || query.repoId === runtimeDispatchCodeGraphRepo.id),
      ),
    [codegraphQueries, runtimeDispatchCodeGraphRepo],
  );

  const runtimeDispatchAvailableHarnesses = useMemo(
    () => everosHarnesses.filter((harness) => harness.enabled),
    [everosHarnesses],
  );

  const runtimeDispatchSuggestedHarnessIds = useMemo(
    () =>
      runtimeDispatchAvailableHarnesses
        .filter(
          (harness) =>
            harness.profile === selectedRuntimeDispatchProfile?.name ||
            (selectedRuntimeDispatchSchedule?.id != null &&
              harness.scheduleId === selectedRuntimeDispatchSchedule.id),
        )
        .map((harness) => harness.id),
    [
      runtimeDispatchAvailableHarnesses,
      selectedRuntimeDispatchProfile?.name,
      selectedRuntimeDispatchSchedule?.id,
    ],
  );

  const runtimeDispatchContextOverride = useMemo<AgentDispatchContextOverride>(
    () => ({
      codegraphRepoId: runtimeDispatchIncludeCodeGraph
        ? runtimeDispatchCodeGraphRepo?.id ?? null
        : null,
      codegraphQueryIds: runtimeDispatchIncludeCodeGraph
        ? runtimeDispatchCodeGraphQueryIds.length > 0
          ? runtimeDispatchCodeGraphQueryIds
          : runtimeDispatchCodeGraphQueries.map((query) => query.id)
        : [],
      everosHarnessIds: runtimeDispatchIncludeEverOs
        ? runtimeDispatchEverOsHarnessIds.length > 0
          ? runtimeDispatchEverOsHarnessIds
          : runtimeDispatchSuggestedHarnessIds
        : [],
    }),
    [
      runtimeDispatchCodeGraphQueryIds,
      runtimeDispatchCodeGraphQueries,
      runtimeDispatchCodeGraphRepo?.id,
      runtimeDispatchEverOsHarnessIds,
      runtimeDispatchIncludeCodeGraph,
      runtimeDispatchIncludeEverOs,
      runtimeDispatchSuggestedHarnessIds,
    ],
  );

  useEffect(() => {
    const nextProfileName =
      runtimeDispatchProfileName &&
      profiles.some((profile) => profile.name === runtimeDispatchProfileName)
        ? runtimeDispatchProfileName
        : activeProfile?.name ?? profiles[0]?.name ?? "";

    if (nextProfileName !== runtimeDispatchProfileName) {
      setRuntimeDispatchProfileName(nextProfileName);
    }
  }, [activeProfile?.name, profiles, runtimeDispatchProfileName]);

  useEffect(() => {
    const nextScheduleId =
      runtimeDispatchScheduleId &&
      runtimeDispatchSchedules.some(
        (schedule) => schedule.id === runtimeDispatchScheduleId,
      )
        ? runtimeDispatchScheduleId
        : runtimeDispatchSchedules[0]?.id ?? "";

    if (nextScheduleId !== runtimeDispatchScheduleId) {
      setRuntimeDispatchScheduleId(nextScheduleId);
    }
  }, [runtimeDispatchScheduleId, runtimeDispatchSchedules]);

  useEffect(() => {
    const nextRepoId =
      runtimeDispatchCodeGraphRepoId &&
      codegraphRepos.some((repo) => repo.id === runtimeDispatchCodeGraphRepoId)
        ? runtimeDispatchCodeGraphRepoId
        : selectedCodeGraphRepo?.id ?? codegraphRepos[0]?.id ?? "";

    if (nextRepoId !== runtimeDispatchCodeGraphRepoId) {
      setRuntimeDispatchCodeGraphRepoId(nextRepoId);
    }
  }, [codegraphRepos, runtimeDispatchCodeGraphRepoId, selectedCodeGraphRepo?.id]);

  useEffect(() => {
    const availableQueryIds = new Set(runtimeDispatchCodeGraphQueries.map((query) => query.id));
    const retainedQueryIds = runtimeDispatchCodeGraphQueryIds.filter((id) =>
      availableQueryIds.has(id),
    );
    const nextQueryIds =
      retainedQueryIds.length > 0 || runtimeDispatchCodeGraphQueries.length === 0
        ? retainedQueryIds
        : runtimeDispatchCodeGraphQueries.map((query) => query.id);

    if (
      nextQueryIds.length !== runtimeDispatchCodeGraphQueryIds.length ||
      nextQueryIds.some((id, index) => id !== runtimeDispatchCodeGraphQueryIds[index])
    ) {
      setRuntimeDispatchCodeGraphQueryIds(nextQueryIds);
    }
  }, [runtimeDispatchCodeGraphQueries, runtimeDispatchCodeGraphQueryIds]);

  useEffect(() => {
    const availableHarnessIds = new Set(
      runtimeDispatchAvailableHarnesses.map((harness) => harness.id),
    );
    const retainedHarnessIds = runtimeDispatchEverOsHarnessIds.filter((id) =>
      availableHarnessIds.has(id),
    );
    const nextHarnessIds =
      retainedHarnessIds.length > 0 || runtimeDispatchSuggestedHarnessIds.length === 0
        ? retainedHarnessIds
        : runtimeDispatchSuggestedHarnessIds;

    if (
      nextHarnessIds.length !== runtimeDispatchEverOsHarnessIds.length ||
      nextHarnessIds.some((id, index) => id !== runtimeDispatchEverOsHarnessIds[index])
    ) {
      setRuntimeDispatchEverOsHarnessIds(nextHarnessIds);
    }
  }, [
    runtimeDispatchAvailableHarnesses,
    runtimeDispatchEverOsHarnessIds,
    runtimeDispatchSuggestedHarnessIds,
  ]);

  const filteredSessions = useMemo(() => {
    return filterAgentSessions(sessions, sessionQuery);
  }, [sessionQuery, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [selectedSessionId, sessions],
  );

  const localSessionHistoryAvailable = useMemo(
    () => supportsLocalSessionHistory(selectedRuntimeProvider?.id, selectedRuntimeProvider?.surfaceMode),
    [selectedRuntimeProvider],
  );

  const canResumeSessionInChat = useMemo(
    () =>
      supportsSessionResume(
        selectedRuntimeProvider?.id,
        selectedRuntimeProvider?.surfaceMode,
        agentSurfaceUrl,
        selectedSessionId,
      ),
    [agentSurfaceUrl, selectedRuntimeProvider, selectedSessionId],
  );

  const chatRequestModes = useMemo(
    () => getChatRequestModeOptions(selectedRuntimeProvider?.id),
    [selectedRuntimeProvider],
  );

  const sessionHistorySummary = useMemo(
    () => summarizeSessionHistory(sessionHistory),
    [sessionHistory],
  );

  const personaEditable = useMemo(
    () => Boolean(selectedRuntimeProvider),
    [selectedRuntimeProvider],
  );

  const localSessionMutationAvailable = localSessionHistoryAvailable;

  useEffect(() => {
    if (filteredSessions.length === 0) {
      setSelectedSessionId(null);
      setSessionHistory([]);
      setSessionHistoryError(null);
      return;
    }

    if (!selectedSessionId || !filteredSessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(filteredSessions[0].id);
    }
  }, [filteredSessions, selectedSessionId]);

  useEffect(() => {
    setSessionTitleDraft(selectedSession?.title ?? "");
    setSessionActionError(null);
  }, [selectedSession?.id, selectedSession?.title]);

  useEffect(() => {
    setChatMessages([]);
    setChatResumeSessionId(null);
    setSelectedSessionId(null);
    setSessionHistory([]);
    setActiveKanbanBoard(null);
  }, [selectedRuntimeProvider?.id]);

  const personaBadges = useMemo(
    () =>
      [
        activeProfile?.isDefault ? "Default profile" : null,
        activeProfile?.model ?? models[0]?.model ?? null,
        activeProfile?.provider ?? providers[0]?.type ?? null,
        selectedRuntimeProvider
          ? `${RUNTIME_LANE_STATE_LABELS[selectedRuntimeProvider.laneState]} lane`
          : null,
      ].filter((value): value is string => value != null),
    [activeProfile, models, providers, selectedRuntimeProvider],
  );

  const personaSummary = useMemo(() => {
    if (activeProfile) {
      return `${activeProfile.name} is the active operator persona, running ${activeProfile.model} through ${activeProfile.provider}. Keep models, tools, memory, and schedules aligned around this profile instead of scattering them across placeholder views.`;
    }

    if (selectedRuntimeProvider) {
      return `${selectedRuntimeProvider.displayName} is selected, but persona metadata has not been loaded yet. Refresh the runtime lane to hydrate profiles, tools, memory, and schedules.`;
    }

    return "Connect a runtime lane to load the active persona, its model stack, saved memory, and tool registry.";
  }, [activeProfile, selectedRuntimeProvider]);

  const personaActions = useMemo(() => {
    const actions: string[] = [];

    if (!agentSurfaceUrl) {
      actions.push("Connect a runtime lane in Gateway before editing agent features.");
    }

    if (models.length === 0) {
      actions.push("Add real model endpoints so the shell stops showing empty endpoint placeholders.");
    }

    if (tools.length === 0) {
      actions.push("Attach MCP tools so operator actions are backed by live integrations.");
    }

    if (schedules.length === 0) {
      actions.push("Add or disable schedules explicitly instead of leaving the automation lane hollow.");
    }

    return actions.slice(0, 3);
  }, [agentSurfaceUrl, models.length, schedules.length, tools.length]);

  const fetchAgentData = useCallback(
    async (view: PlatformView, surfaceUrl: string): Promise<void> => {
      setAgentDataError(null);
      try {
        switch (view) {
          case "persona": {
            setProfilesLoading(true);
            const [
              nextProfiles,
              nextModels,
              nextProviders,
              nextSkills,
              nextMemory,
              nextTools,
              nextSchedules,
            ] = await Promise.all([
              window.platformAPI.listWorkspaceProfiles(),
              window.platformAPI.listWorkspaceModels(),
              window.platformAPI.listWorkspaceProviders(),
              window.platformAPI.listWorkspaceSkills(),
              window.platformAPI.listWorkspaceMemory(),
              window.platformAPI.listWorkspaceTools(),
              window.platformAPI.listWorkspaceSchedules(),
            ]);
            setProfiles(nextProfiles);
            setModels(nextModels);
            setProviders(nextProviders);
            setSkills(nextSkills);
            setMemory(nextMemory);
            setTools(nextTools);
            setSchedules(nextSchedules);
            setProfilesLoading(false);
            break;
          }
          case "sessions": {
            setSessionsLoading(true);
            setSessions(await window.platformAPI.listAgentSessions());
            setSessionsLoading(false);
            break;
          }
          case "agents": {
            setProfilesLoading(true);
            {
              const [nextProfiles, nextModels, nextProviders, nextBoards] = await Promise.all([
                window.platformAPI.listWorkspaceProfiles(),
                window.platformAPI.listWorkspaceModels(),
                window.platformAPI.listWorkspaceProviders(),
                window.platformAPI.listWorkspaceKanbanBoards(),
              ]);
              setProfiles(nextProfiles);
              setModels(nextModels);
              setProviders(nextProviders);
              setKanbanBoards(nextBoards);
            }
            setProfilesLoading(false);
            break;
          }
          case "gateway": {
            const [
              nextProfiles,
              nextSchedules,
              nextBoards,
              nextRuns,
              nextCodeGraphRepos,
              nextCodeGraphQueries,
              nextEverOsHarnesses,
            ] = await Promise.all([
              window.platformAPI.listWorkspaceProfiles(),
              window.platformAPI.listWorkspaceSchedules(),
              window.platformAPI.listWorkspaceKanbanBoards(),
              window.platformAPI.listWorkspaceDispatchRuns(),
              window.platformAPI.listWorkspaceCodeGraphRepos(),
              window.platformAPI.listWorkspaceCodeGraphQueries(),
              window.platformAPI.listWorkspaceEverOsHarnesses(),
            ]);
            setProfiles(nextProfiles);
            setSchedules(nextSchedules);
            setKanbanBoards(nextBoards);
            setDispatchRuns(nextRuns);
            setCodegraphRepos(nextCodeGraphRepos);
            setCodegraphQueries(nextCodeGraphQueries);
            setEverOsHarnesses(nextEverOsHarnesses);
            break;
          }
          case "models": {
            setModels(await window.platformAPI.listWorkspaceModels());
            break;
          }
          case "providers": {
            setProviders(await window.platformAPI.listWorkspaceProviders());
            break;
          }
          case "skills": {
            setSkills(await window.platformAPI.listWorkspaceSkills());
            break;
          }
          case "memory": {
            setMemory(await window.platformAPI.listWorkspaceMemory());
            break;
          }
          case "tools": {
            setTools(await window.platformAPI.listWorkspaceTools());
            break;
          }
          case "schedules": {
            const [nextSchedules, nextProfiles, nextBoards] = await Promise.all([
              window.platformAPI.listWorkspaceSchedules(),
              window.platformAPI.listWorkspaceProfiles(),
              window.platformAPI.listWorkspaceKanbanBoards(),
            ]);
            setSchedules(nextSchedules);
            setProfiles(nextProfiles);
            setKanbanBoards(nextBoards);
            break;
          }
          case "codegraph": {
            const [nextRepos, nextEntrypoints, nextQueries] = await Promise.all([
              window.platformAPI.listWorkspaceCodeGraphRepos(),
              window.platformAPI.listWorkspaceCodeGraphEntrypoints(),
              window.platformAPI.listWorkspaceCodeGraphQueries(),
            ]);
            setCodegraphRepos(nextRepos);
            setCodegraphEntrypoints(nextEntrypoints);
            setCodegraphQueries(nextQueries);
            break;
          }
          case "everos": {
            const [nextHarnesses, nextProfiles, nextSchedules] = await Promise.all([
              window.platformAPI.listWorkspaceEverOsHarnesses(),
              window.platformAPI.listWorkspaceProfiles(),
              window.platformAPI.listWorkspaceSchedules(),
            ]);
            setEverOsHarnesses(nextHarnesses);
            setProfiles(nextProfiles);
            setSchedules(nextSchedules);
            break;
          }
          case "kanban": {
            const boards = await window.platformAPI.listWorkspaceKanbanBoards();
            await syncKanbanBoardState(boards);
            break;
          }
          default:
            break;
        }
      } catch (err) {
        // Network errors are normal when no runtime is connected
        setSessionsLoading(false);
        setProfilesLoading(false);
        setAgentDataError(err instanceof Error ? err.message : "Fetch failed");
      }
    },
    [],
  );

  useEffect(() => {
    if (activeView !== "sessions" || !selectedSessionId) {
      return;
    }

    if (!localSessionHistoryAvailable) {
      setSessionHistory([]);
      setSessionHistoryLoading(false);
      setSessionHistoryError(null);
      return;
    }

    let alive = true;
    setSessionHistoryLoading(true);
    setSessionHistoryError(null);

    void window.platformAPI
      .getAgentSessionHistory(selectedSessionId)
      .then((history) => {
        if (!alive) {
          return;
        }

        setSessionHistory(history);
      })
      .catch((error: unknown) => {
        if (!alive) {
          return;
        }

        setSessionHistoryError(
          error instanceof Error ? error.message : "Could not load session history.",
        );
      })
      .finally(() => {
        if (alive) {
          setSessionHistoryLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [activeView, localSessionHistoryAvailable, selectedSessionId]);

  useEffect(() => {
    if (activeView !== "persona" || !personaEditable) {
      return;
    }

    let alive = true;
    setPersonaLoading(true);
    setPersonaError(null);

    void window.platformAPI
      .readSoul()
      .then((content) => {
        if (!alive) {
          return;
        }
        setPersonaDraft(content);
        setPersonaDirty(false);
      })
      .catch((error: unknown) => {
        if (!alive) {
          return;
        }
        setPersonaError(
          error instanceof Error ? error.message : "Could not load SOUL.md.",
        );
      })
      .finally(() => {
        if (alive) {
          setPersonaLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [activeView, personaEditable, selectedRuntimeProvider?.id]);

  useEffect(() => {
    if (activeView !== "persona" || !personaEditable || !personaDirty) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPersonaSaving(true);
      setPersonaError(null);

      void window.platformAPI
        .writeSoul(personaDraft)
        .then((saved) => {
          if (!saved) {
            throw new Error("Could not save SOUL.md.");
          }
          setPersonaDirty(false);
          setPersonaSavedAt(Date.now());
        })
        .catch((error: unknown) => {
          setPersonaError(
            error instanceof Error ? error.message : "Could not save SOUL.md.",
          );
        })
        .finally(() => {
          setPersonaSaving(false);
        });
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeView, personaDraft, personaDirty, personaEditable]);

  async function handleResetPersona(): Promise<void> {
    if (!personaEditable || personaSaving) {
      return;
    }

    setPersonaSaving(true);
    setPersonaError(null);

    try {
      const nextSoul = await window.platformAPI.resetSoul();
      setPersonaDraft(nextSoul);
      setPersonaDirty(false);
      setPersonaSavedAt(Date.now());
    } catch (error) {
      setPersonaError(
        error instanceof Error ? error.message : "Could not reset SOUL.md.",
      );
    } finally {
      setPersonaSaving(false);
    }
  }

  async function handleCreateModel(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceModel(modelDraft);
    setModels(next);
    setIsCreatingModelDraft(false);
    setSelectedModelId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateModel(): Promise<void> {
    if (!selectedModel) {
      return;
    }

    setIsCreatingModelDraft(false);
    setModels(
      await window.platformAPI.saveWorkspaceModel({
        id: selectedModel.id,
        ...modelDraft,
      }),
    );
  }

  async function handleDeleteModel(): Promise<void> {
    if (!selectedModel) {
      return;
    }

    setIsCreatingModelDraft(false);
    setModels(await window.platformAPI.removeWorkspaceModel(selectedModel.id));
  }

  async function handleCreateProvider(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceProvider(providerDraft);
    setProviders(next);
    setIsCreatingProviderDraft(false);
    setSelectedProviderId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateProvider(): Promise<void> {
    if (!selectedProvider) {
      return;
    }

    setIsCreatingProviderDraft(false);
    setProviders(
      await window.platformAPI.saveWorkspaceProvider({
        id: selectedProvider.id,
        ...providerDraft,
      }),
    );
  }

  async function handleDeleteProvider(): Promise<void> {
    if (!selectedProvider) {
      return;
    }

    setIsCreatingProviderDraft(false);
    setProviders(
      await window.platformAPI.removeWorkspaceProvider(selectedProvider.id),
    );
  }

  function handleSelectProvider(providerId: string): void {
    setIsCreatingProviderDraft(false);
    setSelectedProviderId(providerId);
  }

  function handleStartNewProviderDraft(): void {
    setIsCreatingProviderDraft(true);
    setSelectedProviderId(null);
    setProviderDraft(EMPTY_PROVIDER_DRAFT);
  }

  function handleStartNewModelDraft(): void {
    const seed = selectedProvider
      ? {
          name: selectedProvider.name,
          type: selectedProvider.type,
          apiKey: selectedProvider.apiKey,
          baseUrl: selectedProvider.baseUrl,
        }
      : providerDraft;

    setIsCreatingModelDraft(true);
    setSelectedModelId(null);
    setModelDraft({
      name: seed.name ? `${seed.name} endpoint`.slice(0, 72) : "",
      provider: seed.type || "custom",
      model: "",
      baseUrl: seed.baseUrl,
    });
  }

  function handleApplyProviderPreset(preset: AgentProviderPreset): void {
    const nextProviderDraft = buildProviderDraftFromPreset(preset);

    setIsCreatingProviderDraft(true);
    setSelectedProviderId(null);
    setProviderDraft(nextProviderDraft);
    setIsCreatingModelDraft(true);
    setSelectedModelId(null);
    setModelDraft((current) => ({
      ...current,
      provider: nextProviderDraft.type,
      baseUrl: nextProviderDraft.baseUrl,
    }));
  }

  async function handleDiscoverProviderModels(): Promise<void> {
    const discoverySource = personaEditable
      ? providerDraft
      : selectedProvider
        ? {
            name: selectedProvider.name,
            type: selectedProvider.type,
            apiKey: selectedProvider.apiKey,
            baseUrl: selectedProvider.baseUrl,
          }
        : providerDraft;

    const providerType = discoverySource.type.trim();
    if (!providerType) {
      setProviderDiscovery({
        providerType: "custom",
        status: "unsupported",
        models: [],
        detail: "Choose or load a provider preset before running model discovery.",
        checkedAt: Date.now(),
      });
      return;
    }

    setProviderDiscoveryBusy(true);

    try {
      setProviderDiscovery(
        await window.platformAPI.discoverProviderModels(
          providerType,
          discoverySource.baseUrl,
          discoverySource.apiKey,
        ),
      );
    } catch (error) {
      setProviderDiscovery({
        providerType,
        status: "unreachable",
        models: [],
        detail:
          error instanceof Error
            ? error.message
            : "Could not complete provider discovery.",
        checkedAt: Date.now(),
      });
    } finally {
      setProviderDiscoveryBusy(false);
    }
  }

  function handleLoadDiscoveredModel(modelId: string): void {
    const discoverySource = personaEditable
      ? providerDraft
      : selectedProvider
        ? {
            name: selectedProvider.name,
            type: selectedProvider.type,
            apiKey: selectedProvider.apiKey,
            baseUrl: selectedProvider.baseUrl,
          }
        : providerDraft;

    setIsCreatingModelDraft(true);
    setSelectedModelId(null);
    setModelDraft(buildModelDraftFromProvider(discoverySource, modelId));
    void handleViewChange("models");
  }

  async function handleSaveDiscoveredModel(modelId: string): Promise<void> {
    const discoverySource = personaEditable
      ? providerDraft
      : selectedProvider
        ? {
            name: selectedProvider.name,
            type: selectedProvider.type,
            apiKey: selectedProvider.apiKey,
            baseUrl: selectedProvider.baseUrl,
          }
        : providerDraft;
    const nextDraft = buildModelDraftFromProvider(discoverySource, modelId);
    const existingModel = models.find(
      (model) =>
        model.provider === nextDraft.provider &&
        model.model === nextDraft.model &&
        model.baseUrl === nextDraft.baseUrl,
    );
    const nextModels = await window.platformAPI.saveWorkspaceModel(
      existingModel
        ? {
            id: existingModel.id,
            ...nextDraft,
          }
        : nextDraft,
    );

    setModels(nextModels);
    setIsCreatingModelDraft(false);
    setSelectedModelId(
      existingModel?.id ??
        nextModels.find(
          (model) =>
            model.provider === nextDraft.provider &&
            model.model === nextDraft.model &&
            model.baseUrl === nextDraft.baseUrl,
        )?.id ??
        null,
    );
    setModelDraft(nextDraft);
  }

  async function handleCreateProfile(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceProfile(profileDraft);
    setProfiles(next);
    setIsCreatingProfileDraft(false);
    setSelectedProfileName(
      next.find((profile) => profile.name === profileDraft.name.trim())?.name ??
        next[next.length - 1]?.name ??
        null,
    );
  }

  async function handleUpdateProfile(): Promise<void> {
    if (!selectedProfile) {
      return;
    }

    setIsCreatingProfileDraft(false);
    setProfiles(
      await window.platformAPI.saveWorkspaceProfile({
        ...profileDraft,
        existingName: selectedProfile.name,
      }),
    );
    setSelectedProfileName(profileDraft.name.trim() || selectedProfile.name);
  }

  async function handleDeleteProfile(): Promise<void> {
    if (!selectedProfile || (selectedProfile.isDefault && profiles.length === 1)) {
      return;
    }

    const next = await window.platformAPI.removeWorkspaceProfile(selectedProfile.name);
    setIsCreatingProfileDraft(false);
    setProfiles(next);
    setSelectedProfileName(
      next.find((profile) => profile.isDefault)?.name ?? next[0]?.name ?? null,
    );
  }

  function handleSelectProfile(profileName: string): void {
    setIsCreatingProfileDraft(false);
    setSelectedProfileName(profileName);
  }

  function handleStartNewProfileDraft(): void {
    const fallbackProvider =
      activeProfile?.provider && profileProviderValues.has(activeProfile.provider)
        ? activeProfile.provider
        : profileProviderOptions[0]?.value ?? "";
    const fallbackModelOptions = fallbackProvider
      ? models.filter((model) => model.provider === fallbackProvider)
      : models;
    const fallbackModel =
      activeProfile?.model &&
      fallbackModelOptions.some((model) => model.model === activeProfile.model)
        ? activeProfile.model
        : fallbackModelOptions[0]?.model ?? models[0]?.model ?? "";

    setIsCreatingProfileDraft(true);
    setSelectedProfileName(null);
    setProfileDraft({
      ...EMPTY_PROFILE_DRAFT,
      model: fallbackModel,
      provider: fallbackProvider,
      isDefault: profiles.length === 0,
      kanbanBoardSlug: activeProfile?.kanbanBoardSlug ?? "",
    });
  }

  async function handleCreateKanbanTask(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceKanbanTask({
      boardSlug: activeKanbanBoard,
      title: kanbanTaskDraft.title,
      body: kanbanTaskDraft.body,
      status: kanbanTaskDraft.status,
      priority: kanbanTaskDraft.priority,
      assignee: kanbanTaskDraft.assignee,
      skills: parseCommaSeparatedValues(kanbanTaskDraft.skillsText),
    });

    setKanbanTasks(next);
    setKanbanBoards(await window.platformAPI.listWorkspaceKanbanBoards());
    setIsCreatingKanbanTaskDraft(false);
    setSelectedKanbanTaskId(next[0]?.id ?? null);
  }

  async function handleUpdateKanbanTask(): Promise<void> {
    if (!selectedKanbanTask) {
      return;
    }

    const next = await window.platformAPI.saveWorkspaceKanbanTask({
      id: selectedKanbanTask.id,
      boardSlug: activeKanbanBoard,
      title: kanbanTaskDraft.title,
      body: kanbanTaskDraft.body,
      status: kanbanTaskDraft.status,
      priority: kanbanTaskDraft.priority,
      assignee: kanbanTaskDraft.assignee,
      skills: parseCommaSeparatedValues(kanbanTaskDraft.skillsText),
    });

    setIsCreatingKanbanTaskDraft(false);
    setKanbanTasks(next);
    setKanbanBoards(await window.platformAPI.listWorkspaceKanbanBoards());
    setSelectedKanbanTaskId(selectedKanbanTask.id);
  }

  async function syncKanbanBoardState(nextBoards: KanbanBoard[]): Promise<void> {
    setKanbanBoards(nextBoards);
    const currentBoard = nextBoards.find((board) => board.isCurrent) ?? nextBoards[0] ?? null;
    setActiveKanbanBoard(currentBoard?.slug ?? null);
    setKanbanTasks(
      await window.platformAPI.listWorkspaceKanbanTasks(currentBoard?.slug ?? null),
    );
  }

  async function handleCreateKanbanBoard(): Promise<void> {
    setIsCreatingKanbanBoardDraft(false);
    await syncKanbanBoardState(
      await window.platformAPI.saveWorkspaceKanbanBoard({
        name: kanbanBoardDraft.name,
        description: kanbanBoardDraft.description,
      }),
    );
  }

  async function handleUpdateKanbanBoard(): Promise<void> {
    if (!selectedKanbanBoard) {
      return;
    }

    setIsCreatingKanbanBoardDraft(false);
    await syncKanbanBoardState(
      await window.platformAPI.saveWorkspaceKanbanBoard({
        existingSlug: selectedKanbanBoard.slug,
        name: kanbanBoardDraft.name,
        description: kanbanBoardDraft.description,
      }),
    );
  }

  async function handleDeleteKanbanBoard(): Promise<void> {
    if (!selectedKanbanBoard || kanbanBoards.length <= 1) {
      return;
    }

    setIsCreatingKanbanBoardDraft(false);
    await syncKanbanBoardState(
      await window.platformAPI.removeWorkspaceKanbanBoard(selectedKanbanBoard.slug),
    );
  }

  async function handleDeleteKanbanTask(): Promise<void> {
    if (!selectedKanbanTask) {
      return;
    }

    setIsCreatingKanbanTaskDraft(false);
    setKanbanTasks(
      await window.platformAPI.removeWorkspaceKanbanTask(
        selectedKanbanTask.id,
        activeKanbanBoard,
      ),
    );
    setKanbanBoards(await window.platformAPI.listWorkspaceKanbanBoards());
  }

  function handleSelectKanbanTask(taskId: string): void {
    setIsCreatingKanbanTaskDraft(false);
    setSelectedKanbanTaskId(taskId);
  }

  function handleStartNewKanbanBoardDraft(): void {
    setIsCreatingKanbanBoardDraft(true);
    setKanbanBoardDraft(EMPTY_KANBAN_BOARD_DRAFT);
  }

  function handleStartNewKanbanTaskDraft(): void {
    setIsCreatingKanbanTaskDraft(true);
    setSelectedKanbanTaskId(null);
    setKanbanTaskDraft(EMPTY_KANBAN_TASK_DRAFT);
  }

  async function handleSaveCodegraphSurfaceConfig(): Promise<void> {
    const nextOverview = await window.platformAPI.setRuntimeSurfaceConfig("codegraph", {
      protocol: codegraphSurfaceDraft.protocol,
      host: codegraphSurfaceDraft.host.trim(),
      port: codegraphDraftPortValue,
      path: codegraphSurfaceDraft.path.trim() || "/",
      mode: codegraphSurfaceDraft.mode,
    });

    setOverview(nextOverview);
  }

  function handleResetCodegraphSurfaceDraft(): void {
    setCodegraphSurfaceDraft(buildCodegraphSurfaceDraft(codegraphSurface));
  }

  async function handleCreateCodeGraphRepo(): Promise<void> {
    const nextRepos = await window.platformAPI.saveWorkspaceCodeGraphRepo(codegraphRepoDraft);
    setCodegraphRepos(nextRepos);
    setIsCreatingCodeGraphRepoDraft(false);
    setSelectedCodeGraphRepoId(
      nextRepos.find((repo) => repo.repoPath === codegraphRepoDraft.repoPath.trim())?.id ??
        nextRepos[nextRepos.length - 1]?.id ??
        null,
    );
  }

  async function handleUpdateCodeGraphRepo(): Promise<void> {
    if (!selectedCodeGraphRepo) {
      return;
    }

    const nextRepos = await window.platformAPI.saveWorkspaceCodeGraphRepo({
      id: selectedCodeGraphRepo.id,
      ...codegraphRepoDraft,
    });
    setIsCreatingCodeGraphRepoDraft(false);
    setCodegraphRepos(nextRepos);
    setSelectedCodeGraphRepoId(selectedCodeGraphRepo.id);
  }

  async function handleDeleteCodeGraphRepo(): Promise<void> {
    if (!selectedCodeGraphRepo) {
      return;
    }

    setIsCreatingCodeGraphRepoDraft(false);
    const nextRepos = await window.platformAPI.removeWorkspaceCodeGraphRepo(
      selectedCodeGraphRepo.id,
    );
    const [nextEntrypoints, nextQueries] = await Promise.all([
      window.platformAPI.listWorkspaceCodeGraphEntrypoints(),
      window.platformAPI.listWorkspaceCodeGraphQueries(),
    ]);
    setCodegraphRepos(nextRepos);
    setCodegraphEntrypoints(nextEntrypoints);
    setCodegraphQueries(nextQueries);
    setSelectedCodeGraphRepoId(nextRepos.find((repo) => repo.selected)?.id ?? nextRepos[0]?.id ?? null);
  }

  async function handleSelectCodeGraphRepo(repoId: string): Promise<void> {
    setIsCreatingCodeGraphRepoDraft(false);
    setSelectedCodeGraphRepoId(repoId);
    setCodegraphRepos(await window.platformAPI.setCurrentWorkspaceCodeGraphRepo(repoId));
  }

  function handleStartNewCodeGraphRepoDraft(): void {
    setIsCreatingCodeGraphRepoDraft(true);
    setSelectedCodeGraphRepoId(null);
    setCodegraphRepoDraft({
      ...EMPTY_CODEGRAPH_REPO_DRAFT,
      selected: codegraphRepos.length === 0,
    });
  }

  async function handleInitializeCodeGraphRepo(): Promise<void> {
    if (!selectedCodeGraphRepo) {
      return;
    }

    setCodegraphRepos(
      await window.platformAPI.initializeWorkspaceCodeGraphRepo(selectedCodeGraphRepo.id),
    );
  }

  async function handleSyncCodeGraphRepo(): Promise<void> {
    if (!selectedCodeGraphRepo) {
      return;
    }

    setCodegraphRepos(
      await window.platformAPI.syncWorkspaceCodeGraphRepo(selectedCodeGraphRepo.id),
    );
  }

  async function handleCreateCodeGraphEntrypoint(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceCodeGraphEntrypoint({
      ...codegraphEntrypointDraft,
      repoId: codegraphEntrypointDraft.repoId || selectedCodeGraphRepo?.id || "",
    });
    setCodegraphEntrypoints(next);
    setIsCreatingCodeGraphEntrypointDraft(false);
    setSelectedCodeGraphEntrypointId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateCodeGraphEntrypoint(): Promise<void> {
    if (!selectedCodeGraphEntrypoint) {
      return;
    }

    setIsCreatingCodeGraphEntrypointDraft(false);
    setCodegraphEntrypoints(
      await window.platformAPI.saveWorkspaceCodeGraphEntrypoint({
        id: selectedCodeGraphEntrypoint.id,
        ...codegraphEntrypointDraft,
      }),
    );
    setSelectedCodeGraphEntrypointId(selectedCodeGraphEntrypoint.id);
  }

  async function handleDeleteCodeGraphEntrypoint(): Promise<void> {
    if (!selectedCodeGraphEntrypoint) {
      return;
    }

    setIsCreatingCodeGraphEntrypointDraft(false);
    setCodegraphEntrypoints(
      await window.platformAPI.removeWorkspaceCodeGraphEntrypoint(selectedCodeGraphEntrypoint.id),
    );
  }

  function handleSelectCodeGraphEntrypoint(entrypointId: string): void {
    setIsCreatingCodeGraphEntrypointDraft(false);
    setSelectedCodeGraphEntrypointId(entrypointId);
  }

  function handleStartNewCodeGraphEntrypointDraft(): void {
    setIsCreatingCodeGraphEntrypointDraft(true);
    setSelectedCodeGraphEntrypointId(null);
    setCodegraphEntrypointDraft({
      ...EMPTY_CODEGRAPH_ENTRYPOINT_DRAFT,
      repoId: selectedCodeGraphRepo?.id ?? "",
    });
  }

  async function handleCreateCodeGraphQuery(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceCodeGraphQuery({
      ...codegraphQueryDraft,
      repoId: codegraphQueryDraft.repoId || null,
    });
    setCodegraphQueries(next);
    setIsCreatingCodeGraphQueryDraft(false);
    setSelectedCodeGraphQueryId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateCodeGraphQuery(): Promise<void> {
    if (!selectedCodeGraphQuery) {
      return;
    }

    setIsCreatingCodeGraphQueryDraft(false);
    setCodegraphQueries(
      await window.platformAPI.saveWorkspaceCodeGraphQuery({
        id: selectedCodeGraphQuery.id,
        ...codegraphQueryDraft,
        repoId: codegraphQueryDraft.repoId || null,
      }),
    );
    setSelectedCodeGraphQueryId(selectedCodeGraphQuery.id);
  }

  async function handleDeleteCodeGraphQuery(): Promise<void> {
    if (!selectedCodeGraphQuery) {
      return;
    }

    setIsCreatingCodeGraphQueryDraft(false);
    setCodegraphQueries(
      await window.platformAPI.removeWorkspaceCodeGraphQuery(selectedCodeGraphQuery.id),
    );
  }

  function handleSelectCodeGraphQuery(queryId: string): void {
    setIsCreatingCodeGraphQueryDraft(false);
    setSelectedCodeGraphQueryId(queryId);
  }

  function handleStartNewCodeGraphQueryDraft(): void {
    setIsCreatingCodeGraphQueryDraft(true);
    setSelectedCodeGraphQueryId(null);
    setCodegraphQueryDraft({
      ...EMPTY_CODEGRAPH_QUERY_DRAFT,
      repoId: selectedCodeGraphRepo?.id ?? "",
    });
  }

  async function handleCreateEverOsHarness(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceEverOsHarness({
      ...everosHarnessDraft,
      profile: everosHarnessDraft.profile || defaultProfileName,
      scheduleId: everosHarnessDraft.scheduleId || null,
    });
    setEverOsHarnesses(next);
    setIsCreatingEverOsHarnessDraft(false);
    setSelectedEverOsHarnessId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateEverOsHarness(): Promise<void> {
    if (!selectedEverOsHarness) {
      return;
    }

    setIsCreatingEverOsHarnessDraft(false);
    setEverOsHarnesses(
      await window.platformAPI.saveWorkspaceEverOsHarness({
        id: selectedEverOsHarness.id,
        ...everosHarnessDraft,
        profile: everosHarnessDraft.profile || defaultProfileName,
        scheduleId: everosHarnessDraft.scheduleId || null,
      }),
    );
    setSelectedEverOsHarnessId(selectedEverOsHarness.id);
  }

  async function handleDeleteEverOsHarness(): Promise<void> {
    if (!selectedEverOsHarness) {
      return;
    }

    setIsCreatingEverOsHarnessDraft(false);
    setEverOsHarnesses(
      await window.platformAPI.removeWorkspaceEverOsHarness(selectedEverOsHarness.id),
    );
  }

  function handleSelectEverOsHarness(harnessId: string): void {
    setIsCreatingEverOsHarnessDraft(false);
    setSelectedEverOsHarnessId(harnessId);
  }

  function handleStartNewEverOsHarnessDraft(): void {
    setIsCreatingEverOsHarnessDraft(true);
    setSelectedEverOsHarnessId(null);
    setEverOsHarnessDraft({
      ...EMPTY_EVEROS_HARNESS_DRAFT,
      profile: defaultProfileName,
    });
  }

  async function handleSetEverOsHarnessEnabled(enabled: boolean): Promise<void> {
    if (!selectedEverOsHarness) {
      return;
    }

    setEverOsHarnesses(
      await window.platformAPI.setWorkspaceEverOsHarnessEnabled(
        selectedEverOsHarness.id,
        enabled,
      ),
    );
  }

  async function handleCreateSkill(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceSkill(skillDraft);
    setSkills(next);
    setIsCreatingSkillDraft(false);
    setSelectedSkillName(next[next.length - 1]?.name ?? null);
  }

  async function handleUpdateSkill(): Promise<void> {
    if (!selectedSkill) {
      return;
    }

    setIsCreatingSkillDraft(false);
    setSkills(
      await window.platformAPI.saveWorkspaceSkill({
        ...skillDraft,
        existingName: selectedSkill.name,
      }),
    );
    setSelectedSkillName(skillDraft.name || selectedSkill.name);
  }

  async function handleDeleteSkill(): Promise<void> {
    if (!selectedSkill) {
      return;
    }

    setIsCreatingSkillDraft(false);
    setSkills(await window.platformAPI.removeWorkspaceSkill(selectedSkill.name));
  }

  function handleSelectSkill(skillName: string): void {
    setIsCreatingSkillDraft(false);
    setSelectedSkillName(skillName);
  }

  function handleStartNewSkillDraft(): void {
    setIsCreatingSkillDraft(true);
    setSelectedSkillName(null);
    setSkillDraft(EMPTY_SKILL_DRAFT);
  }

  async function handleCreateMemoryEntry(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceMemoryEntry(memoryDraft);
    setMemory(next);
    setIsCreatingMemoryDraft(false);
    setSelectedMemoryId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateMemoryEntry(): Promise<void> {
    if (!selectedMemoryEntry) {
      return;
    }

    setIsCreatingMemoryDraft(false);
    setMemory(
      await window.platformAPI.saveWorkspaceMemoryEntry({
        id: selectedMemoryEntry.id,
        ...memoryDraft,
      }),
    );
  }

  async function handleDeleteMemoryEntry(): Promise<void> {
    if (!selectedMemoryEntry) {
      return;
    }

    setIsCreatingMemoryDraft(false);
    setMemory(
      await window.platformAPI.removeWorkspaceMemoryEntry(selectedMemoryEntry.id),
    );
  }

  function handleSelectMemoryEntry(memoryId: string): void {
    setIsCreatingMemoryDraft(false);
    setSelectedMemoryId(memoryId);
  }

  function handleStartNewMemoryDraft(): void {
    setIsCreatingMemoryDraft(true);
    setSelectedMemoryId(null);
    setMemoryDraft(EMPTY_MEMORY_DRAFT);
  }

  async function handleCreateTool(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceTool(toolDraft);
    setTools(next);
    isCreatingToolDraftRef.current = false;
    setIsCreatingToolDraft(false);
    setSelectedToolName(
      next.find((tool) => tool.name === toolDraft.name.trim())?.name ??
        next[next.length - 1]?.name ??
        null,
    );
  }

  async function handleUpdateTool(): Promise<void> {
    if (!selectedTool || selectedTool.type === "builtin") {
      return;
    }

    const next = await window.platformAPI.saveWorkspaceTool({
      ...toolDraft,
      existingName: selectedTool.name,
    });

    isCreatingToolDraftRef.current = false;
    setIsCreatingToolDraft(false);
    setTools(next);
    setSelectedToolName(toolDraft.name.trim() || selectedTool.name);
  }

  async function handleDeleteTool(): Promise<void> {
    if (!selectedTool || selectedTool.type === "builtin") {
      return;
    }

    isCreatingToolDraftRef.current = false;
    setIsCreatingToolDraft(false);
    setTools(await window.platformAPI.removeWorkspaceTool(selectedTool.name));
  }

  function handleSelectTool(toolName: string): void {
    isCreatingToolDraftRef.current = false;
    setIsCreatingToolDraft(false);
    setSelectedToolName(toolName);
  }

  function handleStartNewToolDraft(): void {
    isCreatingToolDraftRef.current = true;
    setIsCreatingToolDraft(true);
    setSelectedToolName(null);
    setToolDraft(EMPTY_TOOL_DRAFT);
  }

  async function handleToggleTool(enabled: boolean): Promise<void> {
    if (!selectedTool) {
      return;
    }

    setTools(
      await window.platformAPI.setWorkspaceToolEnabled(selectedTool.name, enabled),
    );
  }

  async function handleCreateSchedule(): Promise<void> {
    const next = await window.platformAPI.saveWorkspaceSchedule({
      ...scheduleDraft,
      profile: scheduleDraft.profile || activeProfile?.name || "default",
    });
    setSchedules(next);
    setIsCreatingScheduleDraft(false);
    setSelectedScheduleId(next[next.length - 1]?.id ?? null);
  }

  async function handleUpdateSchedule(): Promise<void> {
    if (!selectedSchedule) {
      return;
    }

    setIsCreatingScheduleDraft(false);
    setSchedules(
      await window.platformAPI.saveWorkspaceSchedule({
        id: selectedSchedule.id,
        ...scheduleDraft,
      }),
    );
  }

  async function handleDeleteSchedule(): Promise<void> {
    if (!selectedSchedule) {
      return;
    }

    setIsCreatingScheduleDraft(false);
    setSchedules(
      await window.platformAPI.removeWorkspaceSchedule(selectedSchedule.id),
    );
  }

  function handleSelectSchedule(scheduleId: string): void {
    setIsCreatingScheduleDraft(false);
    setSelectedScheduleId(scheduleId);
  }

  function handleStartNewScheduleDraft(): void {
    setIsCreatingScheduleDraft(true);
    setSelectedScheduleId(null);
    setScheduleDraft({
      ...EMPTY_SCHEDULE_DRAFT,
      profile: activeProfile?.name ?? EMPTY_SCHEDULE_DRAFT.profile,
      kanbanBoardSlug: activeProfile?.kanbanBoardSlug ?? "",
    });
  }

  async function handleSetScheduleEnabled(enabled: boolean): Promise<void> {
    if (!selectedSchedule) {
      return;
    }

    setSchedules(
      await window.platformAPI.setWorkspaceScheduleEnabled(
        selectedSchedule.id,
        enabled,
      ),
    );
  }

  async function handleTriggerSchedule(): Promise<void> {
    if (!selectedSchedule) {
      return;
    }

    setSchedules(
      await window.platformAPI.triggerWorkspaceSchedule(selectedSchedule.id),
    );
  }

  async function handleRuntimeProfileDispatch(): Promise<void> {
    if (!selectedRuntimeProvider || !selectedRuntimeDispatchProfile?.kanbanBoardSlug) {
      return;
    }

    const run = await window.platformAPI.dispatchWorkspaceProfile(
      selectedRuntimeDispatchProfile.name,
      runtimeDispatchContextOverride,
    );

    setDispatchRuns(await window.platformAPI.listWorkspaceDispatchRuns());

    if (run?.context.kanbanBoardSlug) {
      await syncKanbanBoardState(
        await window.platformAPI.setCurrentWorkspaceKanbanBoard(
          run.context.kanbanBoardSlug,
        ),
      );
    }
  }

  async function handleRuntimeScheduleDispatch(): Promise<void> {
    if (!selectedRuntimeDispatchSchedule) {
      return;
    }

    setSchedules(
      await window.platformAPI.triggerWorkspaceSchedule(
        selectedRuntimeDispatchSchedule.id,
        runtimeDispatchContextOverride,
      ),
    );
    setDispatchRuns(await window.platformAPI.listWorkspaceDispatchRuns());

    if (selectedRuntimeDispatchSchedule.kanbanBoardSlug) {
      await syncKanbanBoardState(
        await window.platformAPI.setCurrentWorkspaceKanbanBoard(
          selectedRuntimeDispatchSchedule.kanbanBoardSlug,
        ),
      );
    }
  }

  // Reload agent data when the view or active runtime changes
  useEffect(() => {
    if (!overview) return;
    const view = overview.state.activeView as PlatformView;
    if (!AGENT_VIEWS.has(view) && !LOCAL_WORKSPACE_VIEWS.has(view)) return;
    if (
      !agentSurfaceUrl &&
      !(personaEditable && LOCAL_WORKSPACE_VIEWS.has(view)) &&
      !(localSessionHistoryAvailable && view === "sessions")
    ) {
      return;
    }
    void fetchAgentData(view, agentSurfaceUrl ?? "");
  }, [
    overview?.state.activeView,
    agentSurfaceUrl,
    fetchAgentData,
    localSessionHistoryAvailable,
    overview,
    personaEditable,
  ]);

  useEffect(() => {
    if (typeof window.platformAPI.subscribeWorkspaceDispatchRuns !== "function") {
      return;
    }

    return window.platformAPI.subscribeWorkspaceDispatchRuns((runtimeProviderId) => {
      if (overview?.state.activeView !== "gateway") {
        return;
      }

      if (runtimeProviderId !== selectedRuntimeProvider?.id) {
        return;
      }

      void fetchAgentData("gateway", agentSurfaceUrl ?? "");
    });
  }, [agentSurfaceUrl, fetchAgentData, overview?.state.activeView, selectedRuntimeProvider?.id]);

  useEffect(() => {
    if (
      !shouldObserveHermesLifecycle ||
      typeof window.platformAPI.subscribeHermesRuntimeLifecycle !== "function"
    ) {
      return;
    }

    return window.platformAPI.subscribeHermesRuntimeLifecycle((summary) => {
      setHermesLifecycle(summary);
      setHermesLifecycleError(null);
      setHermesLifecycleLoading(false);
    });
  }, [shouldObserveHermesLifecycle]);

  useEffect(() => {
    if (
      !shouldObserveHermesLifecycle ||
      typeof window.platformAPI.getHermesRuntimeLifecycle !== "function"
    ) {
      setHermesLifecycle(null);
      setHermesLifecycleLoading(false);
      setHermesLifecycleError(null);
      return;
    }

    void loadHermesRuntimeLifecycle();
    const interval = window.setInterval(() => {
      void loadHermesRuntimeLifecycle(true);
    }, 4000);

    return () => {
      window.clearInterval(interval);
    };
  }, [shouldObserveHermesLifecycle]);

  useEffect(() => {
    if (!shouldObserveHermesLifecycle) {
      hermesGatewayTransitionRef.current = null;
      setHermesReadyNotice(null);
      return;
    }

    if (!hermesLifecycle) {
      hermesGatewayTransitionRef.current = null;
      return;
    }

    const previousGatewayState = hermesGatewayTransitionRef.current;
    if (
      previousGatewayState?.running &&
      !previousGatewayState.ready &&
      hermesLifecycle.gatewayReady
    ) {
      setHermesReadyNotice(
        hermesLifecycle.gatewayReadyDetail ??
          "Hermes local gateway passed the readiness probe.",
      );
    }

    hermesGatewayTransitionRef.current = {
      running: hermesLifecycle.gatewayRunning,
      ready: hermesLifecycle.gatewayReady,
    };
  }, [
    shouldObserveHermesLifecycle,
    hermesLifecycle,
    hermesLifecycle?.gatewayReady,
    hermesLifecycle?.gatewayReadyDetail,
    hermesLifecycle?.gatewayRunning,
  ]);

  useEffect(() => {
    if (!hermesReadyNotice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHermesReadyNotice(null);
    }, 4800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hermesReadyNotice]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  async function persistChatSession(nextMessages: AgentChatMessage[]): Promise<void> {
    try {
      const snapshot = await window.platformAPI.saveAgentSessionSnapshot({
        sessionId: chatResumeSessionId ?? undefined,
        title: selectedSession?.title,
        model: activeProfile?.model ?? "default",
        history: chatMessagesToSessionHistory(nextMessages),
        source: "cubecloud",
      });

      setChatResumeSessionId(snapshot.sessionId);
      setSessions(snapshot.sessions);
    } catch (error) {
      setAgentDataError(
        error instanceof Error
          ? error.message
          : "Could not persist the provider session transcript.",
      );
    }
  }

  async function handleSendChat(): Promise<void> {
    const text = chatInput.trim();
    if (!text || chatLoading || !agentSurfaceUrl) return;
    setChatInput("");
    const userMsg: AgentChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const nextUserMessages = [...chatMessages, userMsg];
    setChatMessages(nextUserMessages);
    await persistChatSession(nextUserMessages);
    setChatLoading(true);
    try {
      const body = {
        model: activeProfile?.model ?? "default",
        messages: buildChatRequestMessages(chatMessages, userMsg, chatRequestMode),
        stream: false,
      };
      const res = await fetch(`${agentSurfaceUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await res.json();
      const content =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (data as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content ??
        "(no response)";
      const assistantMsg: AgentChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: Date.now(),
      };
      const nextMessages = [...nextUserMessages, assistantMsg];
      setChatMessages(nextMessages);
      await persistChatSession(nextMessages);
    } catch (err) {
      const errMsg: AgentChatMessage = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: Date.now(),
      };
      const nextMessages = [...nextUserMessages, errMsg];
      setChatMessages(nextMessages);
      await persistChatSession(nextMessages);
    } finally {
      setChatLoading(false);
    }
  }

  function handleResetChat(): void {
    setChatMessages([]);
    setChatResumeSessionId(null);
  }

  async function handleResumeSessionInChat(): Promise<void> {
    if (!selectedSessionId || !canResumeSessionInChat || sessionHistory.length === 0) {
      return;
    }

    setChatMessages(sessionHistoryToChatMessages(sessionHistory));
    setChatResumeSessionId(selectedSessionId);
    await handleViewChange("chat");
  }

  async function handleRenameSession(): Promise<void> {
    if (!selectedSessionId || !localSessionMutationAvailable || sessionActionBusy) {
      return;
    }

    setSessionActionBusy("rename");
    setSessionActionError(null);

    try {
      setSessions(
        await window.platformAPI.updateAgentSessionTitle(
          selectedSessionId,
          sessionTitleDraft,
        ),
      );
    } catch (error) {
      setSessionActionError(
        error instanceof Error ? error.message : "Could not update the session title.",
      );
    } finally {
      setSessionActionBusy(null);
    }
  }

  async function handleDeleteSession(): Promise<void> {
    if (!selectedSessionId || !localSessionMutationAvailable || sessionActionBusy) {
      return;
    }

    const confirmed = window.confirm(
      `Delete session "${selectedSession?.title ?? selectedSessionId}"? This removes the selected provider's Cubecloud session transcript.`,
    );

    if (!confirmed) {
      return;
    }

    const deletedSessionId = selectedSessionId;
    setSessionActionBusy("delete");
    setSessionActionError(null);

    try {
      const nextSessions = await window.platformAPI.deleteAgentSession(
        deletedSessionId,
      );
      setSessionHistory([]);
      setSelectedSessionId(null);
      setSessions(nextSessions);

      if (chatResumeSessionId === deletedSessionId) {
        setChatResumeSessionId(null);
      }
    } catch (error) {
      setSessionActionError(
        error instanceof Error ? error.message : "Could not delete the session.",
      );
    } finally {
      setSessionActionBusy(null);
    }
  }

  function handleChatSuggestion(text: string): void {
    setChatInput(text);
    chatInputRef.current?.focus();
  }

  async function handleAgentSelector(providerId: PlatformRuntimeProviderId): Promise<void> {
    // Switch the active runtime provider
    const nextOverview = await window.platformAPI.setActiveRuntimeProvider(providerId);
    setOverview(nextOverview);
    // If on a platform view, jump to chat
    const currentView = nextOverview.state.activeView as PlatformView;
    if (!AGENT_VIEWS.has(currentView)) {
      const viewOverview = await window.platformAPI.setActiveView("chat");
      setOverview(viewOverview);
    }
  }

  async function handleKanbanBoardSwitch(slug: string, _surfaceUrl: string): Promise<void> {
    try {
      await syncKanbanBoardState(
        await window.platformAPI.setCurrentWorkspaceKanbanBoard(slug),
      );
    } catch {
      // silent — surface may be unreachable
    }
  }

  async function handleInspectApp(appId: string): Promise<void> {
    setSelectedAppId(appId);

    if (activeView !== "settings") {
      await handleViewChange("settings");
    }
  }

  async function handleActiveRuntimeProvider(
    runtimeProviderId: PlatformRuntimeProviderId,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setActiveRuntimeProvider(
      runtimeProviderId,
    );
    const provider = nextOverview.runtimeProviders.find(
      (candidate) => candidate.id === runtimeProviderId,
    );

    setOverview(nextOverview);
    if (provider?.linkedAppId) {
      setSelectedAppId(provider.linkedAppId);
    }
  }

  async function handleRuntimeShortcut(
    runtimeProviderId: PlatformRuntimeProviderId,
  ): Promise<void> {
    await handleActiveRuntimeProvider(runtimeProviderId);
    if (overview?.state.activeView !== "gateway") {
      await handleViewChange("gateway");
    }
  }

  async function handleActiveTaskOrchestrator(
    taskOrchestratorId: PlatformTaskOrchestratorId,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setActiveTaskOrchestrator(
      taskOrchestratorId,
    );
    setOverview(nextOverview);
  }

  async function handleToggleApp(
    appId: string,
    enabled: boolean,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setAppEnabled(appId, enabled);
    setOverview(nextOverview);
  }

  async function handleRuntimeSurfaceConfig(
    appId: string,
    patch: {
      protocol?: PlatformSurfaceProtocol;
      host?: string;
      port?: number | null;
      path?: string;
      mode?: PlatformRuntimeSurfaceMode;
    },
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setRuntimeSurfaceConfig(
      appId,
      patch,
    );
    setOverview(nextOverview);
  }

  async function handleSmokeTargetConfig(
    targetId: string,
    patch: PlatformSmokeTargetPatch,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setSmokeTargetConfig(
      targetId,
      patch,
    );
    setOverview(nextOverview);
  }

  async function handleRunSmokeTarget(targetId: string): Promise<void> {
    const nextOverview = await window.platformAPI.runSmokeTarget(targetId);
    setOverview(nextOverview);
  }

  async function handleRunSmokeSequence(targetIds: string[]): Promise<void> {
    let nextOverview = overview;

    for (const targetId of targetIds) {
      nextOverview = await window.platformAPI.runSmokeTarget(targetId);
      setOverview(nextOverview);

      const target = nextOverview.smokeTargets.find(
        (candidate) => candidate.id === targetId,
      );

      if (target?.status !== "passed") {
        break;
      }
    }
  }

  async function handleStageSmokeTargets(
    updates: { targetId: string; patch: PlatformSmokeTargetPatch }[],
    nextTaskOrchestratorId?: PlatformTaskOrchestratorId,
  ): Promise<void> {
    let nextOverview = overview;

    for (const update of updates) {
      nextOverview = await window.platformAPI.setSmokeTargetConfig(
        update.targetId,
        update.patch,
      );
    }

    if (nextTaskOrchestratorId) {
      nextOverview = await window.platformAPI.setActiveTaskOrchestrator(
        nextTaskOrchestratorId,
      );
    }

    if (nextOverview) {
      setOverview(nextOverview);
    }
  }

  async function handleRuntimeLanePrimaryAction(): Promise<void> {
    if (!selectedRuntimeLaneActionModel) {
      return;
    }

    const action = selectedRuntimeLaneActionModel.primaryAction;

    switch (action.kind) {
      case "stage":
        await handleStageSmokeTargets(action.updates, action.nextTaskOrchestratorId);
        return;
      case "run-smoke":
        await handleRunSmokeTarget(action.targetId);
        return;
      case "run-sequence":
        await handleRunSmokeSequence(action.targetIds);
        return;
      case "open-surface":
        await handleOpenRuntimeSurface(action.appId);
        return;
      case "focus-app":
        setSelectedAppId(action.appId);
        return;
      case "set-orchestrator":
        await handleActiveTaskOrchestrator(action.taskOrchestratorId);
        return;
    }
  }

  async function loadHermesRuntimeLifecycle(silent = false): Promise<void> {
    if (typeof window.platformAPI.getHermesRuntimeLifecycle !== "function") {
      return;
    }

    if (!silent) {
      setHermesLifecycleLoading(true);
    }
    try {
      setHermesLifecycle(await window.platformAPI.getHermesRuntimeLifecycle());
      setHermesLifecycleError(null);
    } catch (error) {
      setHermesLifecycle(null);
      setHermesLifecycleError(
        error instanceof Error ? error.message : "Could not load the Hermes local runtime state.",
      );
    } finally {
      if (!silent) {
        setHermesLifecycleLoading(false);
      }
    }
  }

  async function handleHermesLifecycleAction(
    action:
      | "install"
      | "repair"
      | "update"
      | "verify"
      | "doctor"
      | "start-gateway"
      | "stop-gateway"
      | "adopt"
      | "reset",
  ): Promise<void> {
    if (!shouldObserveHermesLifecycle) {
      return;
    }

    const actionRunner = {
      install: window.platformAPI.installHermesRuntime,
      repair: window.platformAPI.repairHermesRuntime,
      update: window.platformAPI.updateHermesRuntime,
      verify: window.platformAPI.verifyHermesRuntime,
      doctor: window.platformAPI.runHermesDoctor,
      "start-gateway": window.platformAPI.startHermesGateway,
      "stop-gateway": window.platformAPI.stopHermesGateway,
      adopt: window.platformAPI.adoptHermesHome,
      reset: window.platformAPI.resetHermesHomeAdoption,
    }[action];

    if (typeof actionRunner !== "function") {
      return;
    }

    setHermesLifecycleAction(action);
    setHermesLifecycleError(null);

    try {
      setHermesLifecycle(await actionRunner());
      setOverview(await window.platformAPI.getOverview());
    } catch (error) {
      setHermesLifecycleError(
        error instanceof Error
          ? error.message
          : "Could not complete the Hermes local runtime action.",
      );
    } finally {
      setHermesLifecycleAction(null);
    }
  }

  async function handleOpenHermesGatewayLog(): Promise<void> {
    if (typeof window.platformAPI.openHermesGatewayLog !== "function") {
      setHermesLifecycleError(
        "Opening the Hermes gateway stderr log is not available in this build.",
      );
      return;
    }

    try {
      const errorMessage = await window.platformAPI.openHermesGatewayLog();
      setHermesLifecycleError(errorMessage);
    } catch (error) {
      setHermesLifecycleError(
        error instanceof Error
          ? error.message
          : "Could not open the Hermes gateway stderr log.",
      );
    }
  }

  async function handleOpenRuntimeSurface(appId: string): Promise<void> {
    await window.platformAPI.openRuntimeSurface(appId);
  }

  async function handleRefreshDockerNodes(): Promise<void> {
    const nextOverview = await window.platformAPI.refreshDockerNodes();
    setOverview(nextOverview);
  }

  async function handleDockerNodeBinding(
    nodeKey: string,
    appId: string | null,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setDockerNodeBinding(nodeKey, appId);
    setOverview(nextOverview);

    if (appId) {
      setSelectedAppId(appId);
    }
  }

  function updateDockerOnboardingDraft(
    node: PlatformDockerNodeSummary,
    patch: Partial<DockerOnboardingDraft>,
  ): void {
    setDockerOnboardingDrafts((current) => ({
      ...current,
      [node.bindingKey]: {
        ...(current[node.bindingKey] ?? defaultDockerOnboardingDraft(node)),
        ...patch,
      },
    }));
  }

  async function handleOnboardDockerNode(
    node: PlatformDockerNodeSummary,
  ): Promise<void> {
    const draft =
      dockerOnboardingDrafts[node.bindingKey] ?? defaultDockerOnboardingDraft(node);

    if (!draft.name.trim()) {
      return;
    }

    const nextOverview = await window.platformAPI.onboardDockerNodeAsCustomApp({
      nodeKey: node.bindingKey,
      name: draft.name.trim(),
      kind: draft.kind,
      integration: draft.integration,
    });
    const onboardedNode = nextOverview.docker.nodes.find(
      (candidate) => candidate.bindingKey === node.bindingKey,
    );

    setOverview(nextOverview);
    setDockerOnboardingDrafts((current) => {
      const next = { ...current };
      delete next[node.bindingKey];
      return next;
    });

    if (onboardedNode?.matchedAppId) {
      setSelectedAppId(onboardedNode.matchedAppId);
    }
  }

  async function handleAdoptDockerPort(
    appId: string,
    host: string,
    port: number,
  ): Promise<void> {
    const nextOverview = await window.platformAPI.setRuntimeSurfaceConfig(appId, {
      host,
      port,
      mode: "docker",
    });
    setOverview(nextOverview);
    setSelectedAppId(appId);
  }

  if (loading || !overview) {
    return (
      <div className="shell loading-shell">
        <div className="loading-panel">
          <p className="eyebrow">Agent Desktop</p>
          <h1>Loading Agent Desktop</h1>
          <p>
            Restoring runtime lanes, enabled feature surfaces, and the desktop
            operator state.
          </p>
        </div>
      </div>
    );
  }

  const activeMeta = VIEW_META[activeView];
  const personaFacts = [
    { label: "Focus", value: activeMeta.label },
    {
      label: "Runtime",
      value: selectedRuntimeProvider?.displayName ?? "No active lane",
    },
    {
      label: "Orchestrator",
      value: selectedTaskOrchestrator?.displayName ?? "Not staged",
    },
    {
      label: "Endpoint",
      value: selectedRuntimeProvider?.surfaceUrl ?? "Not mounted",
    },
  ];
  const personaMetrics = [
    { label: "Profiles", value: profiles.length },
    { label: "Models", value: models.length },
    { label: "Skills", value: skills.length },
    { label: "Memory", value: memory.length },
    { label: "Tools", value: tools.length },
    {
      label: "Schedules",
      value: schedules.filter((schedule) => schedule.enabled).length,
    },
  ];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={cubecloudLogo} alt="Cubecloud" className="sidebar-logo" />
          <div className="sidebar-brand-copy">
            <p className="sidebar-brand-kicker">Cubecloud</p>
            <h1 className="sidebar-brand-title">Agent Desktop</h1>
            <p className="sidebar-brand-summary">
              Compact operator shell for runtime lanes, feature surfaces, and agent control.
            </p>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Platform navigation">

          {/* ── Group 1: Work ─────────────────────────────────────────────── */}
          <div className="nav-group">
            <p className="nav-group-label">Work</p>
            {(["chat", "sessions", "agents", "persona", "kanban", "codegraph", "everos"] as PlatformView[]).map((view) => (
              <button
                key={view}
                className={`nav-button ${view === activeView ? "active" : ""}`}
                onClick={() => void handleViewChange(view)}
              >
                <ViewIcon view={view} />
                <span className="nav-button-label">{VIEW_META[view].label}</span>
              </button>
            ))}
          </div>

          {/* ── Group 3: Configure ────────────────────────────────────────── */}
          <div className="nav-group">
            <p className="nav-group-label">Configure</p>
            {(["models", "providers", "skills", "memory", "tools", "schedules"] as PlatformView[]).map((view) => (
              <button
                key={view}
                className={`nav-button ${view === activeView ? "active" : ""}`}
                onClick={() => void handleViewChange(view)}
              >
                <ViewIcon view={view} />
                <span className="nav-button-label">{VIEW_META[view].label}</span>
              </button>
            ))}
          </div>

          {/* ── Group 3: Platform (pushed to bottom) ─────────────────────── */}
          <div className="nav-group nav-group-platform">
            <p className="nav-group-label">Platform</p>
            {(["console", "workspace", "gateway", "settings"] as PlatformView[]).map((view) => (
              <button
                key={view}
                className={`nav-button ${view === activeView ? "active" : ""}`}
                onClick={() => void handleViewChange(view)}
              >
                <ViewIcon view={view} />
                <span className="nav-button-label">{VIEW_META[view].label}</span>
              </button>
            ))}
          </div>

        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-title">© Cubecloud</p>
          <p className="sidebar-footer-text">
            Agent Desktop · Licensed components and runtime integrations remain subject to their upstream terms.
          </p>
        </div>
      </aside>

      <main className="main-panel">
        {AGENT_VIEWS.has(activeView) ? (
          /* ── Agent view hero ─────────────────────────────────────────────── */
          <header className="hero" style={{ paddingBottom: "12px" }}>
            <div className="agent-hero">
              <p className="agent-hero-eyebrow">{VIEW_META[activeView].label}</p>
              <h2 className="agent-hero-title">{VIEW_META[activeView].title}</h2>
              <div className="agent-hero-runtime">
                <span
                  className={`runtime-status-dot ${
                    selectedRuntimeProvider
                      ? RUNTIME_LANE_STATE_CLASSES[selectedRuntimeProvider.laneState]
                      : "off"
                  }`}
                />
                <strong>
                  {selectedRuntimeProvider?.displayName ?? "No runtime selected"}
                </strong>
                {selectedRuntimeProvider?.surfaceUrl && (
                  <span style={{ opacity: 0.6, fontSize: "0.75rem" }}>
                    {selectedRuntimeProvider.surfaceUrl}
                  </span>
                )}
              </div>
            </div>
          </header>
        ) : (
          /* ── Platform view hero with metrics ─────────────────────────────── */
          <header className="hero">
            <div>
              <p className="eyebrow">{activeMeta.label}</p>
              <h2>{activeMeta.title}</h2>
              <p className="hero-copy">{activeMeta.summary}</p>
            </div>

            <section className="metrics-grid" aria-label="Platform summary">
              <article className="metric-card accent-card">
                <span className="metric-value">{overview.stats.enabledApps}</span>
                <span className="metric-label">Enabled surfaces</span>
              </article>
              <article className="metric-card">
                <span className="metric-value">{overview.runtimeProviders.length}</span>
                <span className="metric-label">Runtime lanes</span>
              </article>
              <article className="metric-card">
                <span className="metric-value">{overview.docker.nodes.length}</span>
                <span className="metric-label">Docker nodes</span>
              </article>
              <article className="metric-card">
                <span className="metric-value">
                  {overview.smokeTargets.filter((target) => target.status === "passed").length}
                </span>
                <span className="metric-label">Smoke passes</span>
              </article>
            </section>
          </header>
        )}

        {shouldObserveHermesLifecycle && hermesReadyNotice && (
          <div className="hermes-runtime-notice" role="status" aria-live="polite">
            <span className="status-chip on">Hermes ready</span>
            <div className="hermes-runtime-notice-copy">
              <strong>Local gateway healthy</strong>
              <span>{hermesReadyNotice}</span>
            </div>
            <button className="ghost-button" onClick={() => setHermesReadyNotice(null)}>
              Dismiss
            </button>
          </div>
        )}

        {activeView === "console" && (
          <section className="dashboard-grid">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Runtime Fabric</p>
                  <h3>Active lanes</h3>
                </div>
                <span className="pill">
                  {overview.runtimeProviders.filter((p) => p.laneState === "verified").length} verified
                </span>
              </div>
              <p className="workspace-copy">
                Hermes Agent, IronClaw, and OpenClaw runtime lanes at a glance. Click a lane to open it in Gateway, or open the linked surface directly.
              </p>
              <div className="runtime-fabric-row">
                {overview.runtimeProviders.map((provider) => (
                  <article key={provider.id} className="runtime-fabric-card">
                    <div className="runtime-fabric-header">
                      <strong>{provider.displayName}</strong>
                      <span
                        className={`status-chip ${RUNTIME_LANE_STATE_CLASSES[provider.laneState]}`}
                      >
                        {RUNTIME_LANE_STATE_LABELS[provider.laneState]}
                      </span>
                    </div>
                    <p className="runtime-fabric-meta">
                      {RUNTIME_PROVIDER_ROLE_LABELS[provider.role]}
                      {provider.surfaceMode
                        ? ` \u00b7 ${resolveSurfaceModeLabel(provider.surfaceMode)}`
                        : ""}
                    </p>
                    {provider.surfaceUrl && (
                      <small className="verification-evidence">{provider.surfaceUrl}</small>
                    )}
                    <div className="runtime-fabric-actions">
                      <button
                        className="toggle-button enabled"
                        onClick={() => void handleRuntimeShortcut(provider.id)}
                      >
                        Open lane
                      </button>
                      {provider.surfaceUrl && provider.linkedRuntimeSurfaceAppId && (
                        <button
                          className="ghost-button"
                          onClick={() =>
                            void handleOpenRuntimeSurface(provider.linkedRuntimeSurfaceAppId!)
                          }
                        >
                          Open surface
                        </button>
                      )}
                    </div>
                  </article>
                ))}
                {appMap.has("codegraph") && (
                  <article className="runtime-fabric-card">
                    <div className="runtime-fabric-header">
                      <strong>CodeGraph</strong>
                      <span
                        className={`status-chip ${
                          appMap.get("codegraph")!.enabled ? "on" : "off"
                        }`}
                      >
                        {appMap.get("codegraph")!.enabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                    <p className="runtime-fabric-meta">
                      Code intelligence &middot; {INTEGRATION_LABELS[appMap.get("codegraph")!.integration]}
                    </p>
                    <p className="runtime-fabric-meta">{appMap.get("codegraph")!.tagline}</p>
                    <div className="runtime-fabric-actions">
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setSelectedAppId("codegraph");
                          void handleViewChange("workspace");
                        }}
                      >
                        Focus surface
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void handleInspectApp("codegraph")}
                      >
                        Settings
                      </button>
                    </div>
                  </article>
                )}
              </div>
            </article>

            <article className="panel-card panel-card-span-3">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Runtime Intake</p>
                  <h3>Start with Hermes local runtime</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">
                    {runtimeIntakeCandidates.length} runtime candidates
                  </span>
                  <button className="ghost-button" onClick={() => void handleRefreshDockerNodes()}>
                    Rescan Docker Desktop
                  </button>
                </div>
              </div>
              <p className="workspace-copy">
                Repair, install, or adopt the local Hermes home first so Agent Desktop owns the
                primary operator lane. If you already have IronClaw or another runtime running in
                Docker Desktop, bind that container below as a fallback or secondary lane.
              </p>
              <div className="badge-row">
                <span className="badge">
                  {HERMES_HOME_STATE_LABELS[hermesLifecycle?.homeState ?? "empty"]}
                </span>
                <span className="badge">
                  {
                    runtimeIntakeCandidates.filter(
                      ({ node, app }) => node.matchedAppId === app.id,
                    ).length
                  }{" "}
                  bound
                </span>
                <span className="badge">
                  {
                    runtimeIntakeCandidates.filter(
                      ({ node, app }) => node.matchedAppId !== app.id,
                    ).length
                  }{" "}
                  awaiting binding
                </span>
                <span className="badge">
                  {
                    runtimeIntakeCandidates.filter(
                      ({ linkedSurface }) => linkedSurface?.port != null,
                    ).length
                  }{" "}
                  mounted surfaces
                </span>
              </div>
              <div className="runtime-surface-grid">
                <article className="runtime-surface-card">
                  <div className="workspace-header">
                    <div>
                      <h4>Hermes local runtime</h4>
                      <p className="workspace-objective">
                        {hermesLifecycle?.homeStateDetail ??
                          (hermesLifecycleLoading
                            ? "Loading the local Hermes home state."
                            : "Check the local Hermes runtime before using Docker fallbacks.")}
                      </p>
                    </div>
                    <span
                      className={`status-chip ${HERMES_HOME_STATE_CLASSES[hermesLifecycle?.homeState ?? "empty"]}`}
                    >
                      {HERMES_HOME_STATE_LABELS[hermesLifecycle?.homeState ?? "empty"]}
                    </span>
                  </div>
                  <div className="badge-row">
                    <span
                      className={`status-chip ${HERMES_VERIFICATION_STATE_CLASSES[hermesLifecycle?.verificationState ?? "unknown"]}`}
                    >
                      {HERMES_VERIFICATION_STATE_LABELS[
                        hermesLifecycle?.verificationState ?? "unknown"
                      ]}
                    </span>
                    <span className={`status-chip ${
                      hermesLifecycle?.gatewayReady
                        ? "on"
                        : hermesLifecycle?.gatewayRunning
                          ? "assembling"
                          : "off"
                    }`}>
                      {hermesLifecycle?.gatewayReady
                        ? "Gateway healthy"
                        : hermesLifecycle?.gatewayRunning
                          ? "Gateway starting"
                          : "Gateway offline"}
                    </span>
                    <span className="badge">
                      {hermesLifecycle?.overrideActive ? "Adopted home" : "Default home"}
                    </span>
                  </div>
                  <small className="verification-evidence">
                    {hermesLifecycle?.hermesHome ??
                      (hermesLifecycleLoading ? "Loading Hermes home..." : "Hermes home unavailable")}
                  </small>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Primary action</span>
                      <strong>{hermesLifecyclePrimaryAction.label}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Gateway API</span>
                      <strong>
                        {hermesLifecycle?.gatewayReady
                          ? "Ready on /health"
                          : hermesLifecycle?.gatewayRunning
                            ? "Waiting for health"
                            : "Offline"}
                      </strong>
                    </div>
                  </div>
                  {hermesLifecycle?.gatewayReadyDetail && (
                    <small className="verification-evidence">
                      {hermesLifecycle.gatewayReadyDetail}
                    </small>
                  )}
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                      onClick={() =>
                        void handleHermesLifecycleAction(hermesLifecyclePrimaryAction.key)
                      }
                    >
                      {hermesLifecycleAction === hermesLifecyclePrimaryAction.key
                        ? "Working..."
                        : hermesLifecyclePrimaryAction.label}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                      onClick={() => void handleHermesLifecycleAction("adopt")}
                    >
                      {hermesLifecycleAction === "adopt"
                        ? "Selecting..."
                        : "Adopt existing install"}
                    </button>
                    {hermesLifecycle?.overrideActive && (
                      <button
                        className="ghost-button"
                        disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                        onClick={() => void handleHermesLifecycleAction("reset")}
                      >
                        {hermesLifecycleAction === "reset"
                          ? "Resetting..."
                          : "Use default home"}
                      </button>
                    )}
                    <button
                      className="ghost-button"
                      onClick={() => void handleRuntimeShortcut("hermes")}
                    >
                      Open Hermes lane
                    </button>
                  </div>
                </article>
                {runtimeIntakeCandidates.length > 0 ? (
                  runtimeIntakeCandidates.map(({ node, app, linkedSurface }) => {
                    const recommendedPort = node.preferredPort;
                    const recommendedEndpoint = recommendedPort
                      ? `${recommendedPort.host}:${recommendedPort.hostPort}`
                      : null;
                    const boundToCandidate = node.matchedAppId === app.id;
                    const linkedToRecommendedPort =
                      linkedSurface != null &&
                      recommendedPort != null &&
                      linkedSurface.host === recommendedPort.host &&
                      linkedSurface.port === recommendedPort.hostPort;
                    const readyToOpen = linkedSurface?.port != null;

                    return (
                      <article key={`${app.id}-${node.bindingKey}`} className="runtime-surface-card">
                        <div className="workspace-header">
                          <div>
                            <h4>{app.name}</h4>
                            <p className="workspace-objective">
                              {node.name} · {node.image}
                            </p>
                          </div>
                          <span className={`status-chip ${DOCKER_HEALTH_CLASSES[node.health]}`}>
                            {DOCKER_HEALTH_LABELS[node.health]}
                          </span>
                        </div>
                        <div className="badge-row">
                          <span className="badge">
                            {boundToCandidate ? "Bound to app" : "Suggested binding"}
                          </span>
                          {node.composeProject && <span className="badge">{node.composeProject}</span>}
                          {recommendedEndpoint && <span className="badge">{recommendedEndpoint}</span>}
                        </div>
                        <p className="workspace-copy">
                          {boundToCandidate
                            ? recommendedEndpoint
                              ? linkedToRecommendedPort
                                ? `Mounted on ${recommendedEndpoint} and ready for console access.`
                                : `Docker surfaced ${recommendedEndpoint} as the recommended endpoint for this runtime.`
                              : "This runtime is matched, but Docker has not published an operator-facing port yet."
                            : `Detected in Docker Desktop. Bind this node to ${app.name} so it can be mounted into the console surface.`}
                        </p>
                        {node.preferredPortReason && (
                          <small className="verification-evidence">
                            {node.preferredPortReason}
                          </small>
                        )}
                        <div className="registry-footer mission-actions">
                          {!boundToCandidate ? (
                            <button
                              className="toggle-button enabled"
                              onClick={() => void handleDockerNodeBinding(node.bindingKey, app.id)}
                            >
                              Bind to {app.name}
                            </button>
                          ) : recommendedPort && !linkedToRecommendedPort ? (
                            <button
                              className="toggle-button enabled"
                              onClick={() =>
                                void handleAdoptDockerPort(
                                  app.id,
                                  recommendedPort.host,
                                  recommendedPort.hostPort,
                                )
                              }
                            >
                              Adopt {recommendedEndpoint}
                            </button>
                          ) : readyToOpen ? (
                            <button
                              className="toggle-button enabled"
                              onClick={() => void handleOpenRuntimeSurface(app.id)}
                            >
                              Open surface
                            </button>
                          ) : null}
                          <button className="ghost-button" onClick={() => setSelectedAppId(app.id)}>
                            Focus app
                          </button>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    No Docker fallback lanes are detected right now. If IronClaw or another runtime
                    is already running in containers, rescan and bind it here after the local Hermes
                    lane is in a good state.
                    {hermesLifecycle?.gatewayLogPath && (
                      <button
                        className="ghost-button"
                        onClick={() => void handleOpenHermesGatewayLog()}
                      >
                        Open gateway stderr log
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Feature Surfaces</p>
                  <h3>Mounted Cubecloud features</h3>
                </div>
              </div>
              <p className="workspace-copy">
                Keep the live surfaces visible here the way Hermes Desktop keeps concrete product
                features in the console instead of collapsing them into one registry surface.
              </p>
              <div className="stack-list">
                {overview.apps
                  .filter((app) => app.enabled)
                  .map((app) => (
                    <button
                      key={app.id}
                      className={`stack-item ${selectedApp?.id === app.id ? "selected" : ""}`}
                      onClick={() => setSelectedAppId(app.id)}
                    >
                      <strong>{app.name}</strong>
                      <span>{app.tagline}</span>
                    </button>
                  ))}
              </div>
            </article>

            <article className="panel-card panel-card-span-2">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Selected Surface</p>
                  <h3>{selectedApp?.name ?? "Select a surface"}</h3>
                </div>
                {selectedApp && (
                  <span className={`status-chip ${selectedApp.enabled ? "on" : "off"}`}>
                    {selectedApp.enabled ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
              {selectedApp && (
                <>
                  <p className="detail-copy">{selectedApp.description}</p>
                  <div className="badge-row">
                    <span className="badge">{KIND_LABELS[selectedApp.kind]}</span>
                    <span className="badge">{selectedApp.integration}</span>
                    <span className="badge">{selectedApp.status}</span>
                  </div>
                  <div className="detail-block">
                    <strong>Source</strong>
                    <p>{selectedApp.source}</p>
                  </div>
                  <div className="detail-block">
                    <strong>Surface roles</strong>
                    <div className="chip-row">
                      {selectedApp.supportedSlots.map((slotId) => {
                        const slot = overview.slots.find((candidate) => candidate.id === slotId);
                        return <span key={slotId} className="chip">{slot?.name ?? slotId}</span>;
                      })}
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>Connected capabilities</strong>
                    <div className="chip-row">
                      {selectedApp.capabilityIds.map((capabilityId) => (
                        <span key={capabilityId} className="chip">
                          {capabilityMap.get(capabilityId)?.name ?? capabilityId}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </article>

          </section>
        )}

        {activeView === "workspace" && (
          <section className="dashboard-grid">
            <article className="panel-card panel-card-span-2">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Workspace</p>
                  <h3>Feature surfaces</h3>
                </div>
                <span className="pill">{workspaceFeatureApps.length} enabled</span>
              </div>
              <p className="workspace-copy">
                Keep concrete Cubecloud features here the way Hermes Desktop keeps named product
                screens in the shell, instead of surfacing abstract hubs or architecture lanes.
              </p>
              {workspaceFeatureApps.length > 0 ? (
                <div className="registry-grid">
                  {workspaceFeatureApps.map((app) => (
                    <article key={app.id} className="registry-card">
                      <div className="registry-topline">
                        <span className="badge">{KIND_LABELS[app.kind]}</span>
                        <span className="badge">{app.integration}</span>
                      </div>
                      <h4>{app.name}</h4>
                      <p className="registry-tagline">{app.tagline}</p>
                      <p className="registry-copy">{app.description}</p>
                      <div className="registry-footer">
                        <button
                          className="toggle-button enabled"
                          onClick={() => setSelectedAppId(app.id)}
                        >
                          Focus surface
                        </button>
                        <button
                          className="ghost-button"
                          onClick={() => void handleInspectApp(app.id)}
                        >
                          Open settings detail
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  Enable a non-runtime feature surface in settings to mount it here.
                </div>
              )}
            </article>

            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Selected surface</p>
                  <h3>{selectedWorkspaceApp?.name ?? "Select a surface"}</h3>
                </div>
                {selectedWorkspaceApp && <span className="pill">{selectedWorkspaceApp.source}</span>}
              </div>
              {selectedWorkspaceApp ? (
                <>
                  <p className="detail-copy">{selectedWorkspaceApp.description}</p>
                  <div className="detail-block">
                    <strong>Why this surface exists</strong>
                    <p>{selectedWorkspaceApp.tagline}</p>
                  </div>
                  <div className="detail-block">
                    <strong>Connected capabilities</strong>
                    <div className="chip-row">
                      {selectedWorkspaceApp.capabilityIds.map((capabilityId) => (
                        <span key={capabilityId} className="chip">
                          {capabilityMap.get(capabilityId)?.name ?? capabilityId}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => void handleInspectApp(selectedWorkspaceApp.id)}
                    >
                      Open settings detail
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">
                  Select an enabled feature surface from the left to inspect it here.
                </p>
              )}
            </article>
          </section>
        )}

        {activeView === "gateway" && (
          <section className="dashboard-grid">
            <article className="panel-card">
              <div className="gateway-status-panel">
                <div className="gateway-status-header">
                  <div>
                    <p className="eyebrow">Runtime Gateway</p>
                    <h3>Runtime lanes and probe truth</h3>
                    <p className="workspace-copy">
                      Keep Hermes, IronClaw, and OpenClaw attached through one board for lane state, probes, and linked surfaces.
                    </p>
                  </div>
                  <div className="gateway-state-indicator">
                    <span
                      className={`gateway-state-dot ${overview.runtimeProviders.some((provider) => provider.surfaceConfigured || provider.readySmokeTargetCount > 0 || provider.appEnabled) ? "on" : "off"}`}
                    />
                    <div>
                      <strong>
                        {overview.runtimeProviders.some((provider) => provider.surfaceConfigured || provider.readySmokeTargetCount > 0 || provider.appEnabled)
                          ? "Running"
                          : "Idle"}
                      </strong>
                      <span>{selectedRuntimeProvider?.displayName ?? "Select a runtime lane"}</span>
                    </div>
                  </div>
                </div>
                <div className="badge-row">
                  <span className="pill">
                    {overview.runtimeProviders.filter((provider) => provider.surfaceConfigured).length} configured lanes
                  </span>
                  <span className="pill">{overview.stats.readySmokeTargets} ready checks</span>
                  <span className="pill">
                    {overview.runtimeProviders.reduce(
                      (count, provider) => count + provider.passedSmokeTargetCount,
                      0,
                    )} passed probes
                  </span>
                  <span className="pill">
                    {overview.runtimeProviders.reduce(
                      (count, provider) => count + provider.failedSmokeTargetCount,
                      0,
                    )} failed probes
                  </span>
                  {selectedTaskOrchestrator && (
                    <span className="pill">
                      {selectedTaskOrchestrator.displayName} · {ORCHESTRATOR_MODE_LABELS[selectedTaskOrchestrator.integrationMode]}
                    </span>
                  )}
                </div>
                {selectedRuntimeProvider && (
                  <div className="gateway-selected-runtime-card">
                    <div className="gateway-selected-runtime-brand">
                      <span className="registry-avatar registry-avatar-runtime">
                        {buildMonogram(selectedRuntimeProvider.displayName)}
                      </span>
                      <div>
                        <h4>{selectedRuntimeProvider.displayName}</h4>
                        <p className="workspace-objective">
                          {RUNTIME_PROVIDER_ROLE_LABELS[selectedRuntimeProvider.role]} · {selectedRuntimeProvider.integrationStatus}
                        </p>
                      </div>
                    </div>
                    <div className="badge-row">
                      <span className={`status-chip ${RUNTIME_LANE_STATE_CLASSES[selectedRuntimeProvider.laneState]}`}>
                        {RUNTIME_LANE_STATE_LABELS[selectedRuntimeProvider.laneState]}
                      </span>
                      <span className="badge">
                        {selectedRuntimeProvider.readySmokeTargetCount}/{selectedRuntimeProvider.totalSmokeTargetCount} checks ready
                      </span>
                      <span className="badge">
                        {selectedRuntimeProvider.passedSmokeTargetCount} passed · {selectedRuntimeProvider.failedSmokeTargetCount} failed
                      </span>
                      {selectedRuntimeProvider.surfaceMode && (
                        <span className="badge">{RUNTIME_MODE_LABELS[selectedRuntimeProvider.surfaceMode]}</span>
                      )}
                    </div>
                    <p className="workspace-copy">{selectedRuntimeProvider.notes[0]}</p>
                    {selectedRuntimeLaneActionModel && (
                      <div className="gateway-action-row">
                        <button
                          className="toggle-button enabled"
                          onClick={() => void handleRuntimeLanePrimaryAction()}
                        >
                          {selectedRuntimeLaneActionModel.primaryAction.label}
                        </button>
                        {selectedRuntimeProvider.surfaceUrl &&
                          selectedRuntimeProvider.linkedRuntimeSurfaceAppId && (
                            <button
                              className="ghost-button"
                              onClick={() =>
                                void handleOpenRuntimeSurface(
                                  selectedRuntimeProvider.linkedRuntimeSurfaceAppId!,
                                )
                              }
                            >
                              Open linked surface
                            </button>
                          )}
                        {selectedRuntimeProvider.linkedAppId && (
                          <button
                            className="ghost-button"
                            onClick={() => void handleInspectApp(selectedRuntimeProvider.linkedAppId!)}
                          >
                            Inspect linked app
                          </button>
                        )}
                      </div>
                    )}
                    {selectedRuntimeLaneActionModel?.evidence && (
                      <small className="verification-evidence">
                        {selectedRuntimeLaneActionModel.evidence}
                      </small>
                    )}
                    {selectedRuntimeProvider.id === "hermes" && (
                      <div className="detail-block">
                        <strong>Hermes local runtime</strong>
                        <div className="badge-row">
                          <span
                            className={`status-chip ${HERMES_HOME_STATE_CLASSES[hermesLifecycle?.homeState ?? "empty"]}`}
                          >
                            {HERMES_HOME_STATE_LABELS[hermesLifecycle?.homeState ?? "empty"]}
                          </span>
                          <span
                            className={`status-chip ${HERMES_VERIFICATION_STATE_CLASSES[hermesLifecycle?.verificationState ?? "unknown"]}`}
                          >
                            {HERMES_VERIFICATION_STATE_LABELS[
                              hermesLifecycle?.verificationState ?? "unknown"
                            ]}
                          </span>
                          <span className="badge">
                            {hermesLifecycle?.overrideActive ? "Adopted home" : "Default home"}
                          </span>
                          <span className="badge">
                            {HERMES_INSTALL_TARGET_LABELS[
                              hermesLifecycle?.installTargetState ?? "fresh"
                            ]}
                          </span>
                          <span className="badge">
                            {hermesLifecycle?.gatewayRunning
                              ? "Gateway running"
                              : "Gateway stopped"}
                          </span>
                          <span className="badge">
                            {hermesLifecycle?.gatewayReady ? "Gateway healthy" : "Gateway not ready"}
                          </span>
                        </div>
                        <div className="operator-field-grid">
                          <div className="operator-field operator-field-span-2">
                            <span>Hermes home</span>
                            <strong>
                              {hermesLifecycle?.hermesHome ??
                                (hermesLifecycleLoading ? "Loading..." : "Unavailable")}
                            </strong>
                          </div>
                          <div className="operator-field operator-field-span-2">
                            <span>Install root</span>
                            <strong>{hermesLifecycle?.repoPath ?? "Unavailable"}</strong>
                          </div>
                          <div className="operator-field operator-field-span-2">
                            <span>Home state</span>
                            <strong>
                              {hermesLifecycle?.homeStateDetail ??
                                HERMES_HOME_STATE_LABELS[hermesLifecycle?.homeState ?? "empty"]}
                            </strong>
                          </div>
                          <div className="operator-field">
                            <span>Version</span>
                            <strong>{hermesLifecycle?.version ?? "Run verify"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Active profile</span>
                            <strong>{hermesLifecycle?.activeProfile ?? "default"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Configured</span>
                            <strong>{hermesLifecycle?.configured ? "Yes" : "No"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>API keys</span>
                            <strong>{hermesLifecycle?.hasApiKey ? "Present" : "Not detected"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Gateway state</span>
                            <strong>{hermesLifecycle?.gatewayRunning ? "Running" : "Stopped"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Gateway API</span>
                            <strong>{hermesLifecycle?.gatewayReady ? "Healthy" : "Waiting"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Gateway pid file</span>
                            <strong>{hermesLifecycle?.gatewayPidPresent ? "Present" : "Missing"}</strong>
                          </div>
                          <div className="operator-field operator-field-span-2">
                            <span>Gateway stderr log</span>
                            <strong>{hermesLifecycle?.gatewayLogPath ?? "Unavailable"}</strong>
                          </div>
                          <div className="operator-field">
                            <span>Last verified</span>
                            <strong>
                              {formatEpochTimestamp(hermesLifecycle?.lastVerifiedAt ?? null) ??
                                "Not yet"}
                            </strong>
                          </div>
                          <div className="operator-field">
                            <span>Last doctor run</span>
                            <strong>
                              {formatEpochTimestamp(hermesLifecycle?.lastDoctorAt ?? null) ??
                                "Not yet"}
                            </strong>
                          </div>
                        </div>
                        <p className="workspace-copy">
                          Install or update Hermes locally, watch lifecycle checkpoints as work runs, and operate the local gateway here. IronClaw and OpenClaw keep their current gateway attach flows.
                        </p>
                        {hermesLifecycle?.gatewayReadyDetail && (
                          <small className="verification-evidence">
                            {hermesLifecycle.gatewayReadyDetail}
                          </small>
                        )}
                        <div className="gateway-action-row">
                          <button
                            className="toggle-button enabled"
                            disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                            onClick={() =>
                              void handleHermesLifecycleAction(hermesLifecyclePrimaryAction.key)
                            }
                          >
                            {hermesLifecycleAction === hermesLifecyclePrimaryAction.key
                              ? "Working..."
                              : hermesLifecyclePrimaryAction.label}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={
                              hermesLifecycleLoading ||
                              hermesLifecycleAction != null ||
                              !hermesLifecycle?.installed
                            }
                            onClick={() => void handleHermesLifecycleAction("verify")}
                          >
                            {hermesLifecycleAction === "verify"
                              ? "Verifying..."
                              : "Verify local runtime"}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={
                              hermesLifecycleLoading ||
                              hermesLifecycleAction != null ||
                              !hermesLifecycle?.installed
                            }
                            onClick={() => void handleHermesLifecycleAction("doctor")}
                          >
                            {hermesLifecycleAction === "doctor"
                              ? "Running doctor..."
                              : "Run doctor"}
                          </button>
                          <button
                            className="ghost-button"
                            disabled={
                              hermesLifecycleLoading ||
                              hermesLifecycleAction != null ||
                              !hermesLifecycle?.installed
                            }
                            onClick={() => void handleHermesLifecycleAction(hermesGatewayAction.key)}
                          >
                            {hermesLifecycleAction === hermesGatewayAction.key
                              ? hermesGatewayAction.key === "start-gateway"
                                ? "Starting gateway..."
                                : "Stopping gateway..."
                              : hermesGatewayAction.label}
                          </button>
                        </div>
                        <div className="gateway-action-row">
                          <button
                            className="ghost-button"
                            disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                            onClick={() => void handleHermesLifecycleAction("adopt")}
                          >
                            {hermesLifecycleAction === "adopt"
                              ? "Selecting..."
                              : "Adopt existing install"}
                          </button>
                          {hermesLifecycle?.overrideActive && (
                            <button
                              className="ghost-button"
                              disabled={hermesLifecycleLoading || hermesLifecycleAction != null}
                              onClick={() => void handleHermesLifecycleAction("reset")}
                            >
                              {hermesLifecycleAction === "reset"
                                ? "Resetting..."
                                : "Use default home"}
                            </button>
                          )}
                          {hermesLifecycle?.gatewayLogPath && (
                            <button
                              className="ghost-button"
                              onClick={() => void handleOpenHermesGatewayLog()}
                            >
                              Open gateway stderr log
                            </button>
                          )}
                        </div>
                        {hermesLifecycle?.operation && (
                          <div className="detail-block">
                            <strong>Lifecycle progress</strong>
                            <div className="badge-row">
                              <span
                                className={`status-chip ${HERMES_OPERATION_STATUS_CLASSES[hermesLifecycle.operation.status]}`}
                              >
                                {HERMES_OPERATION_STATUS_LABELS[hermesLifecycle.operation.status]}
                              </span>
                              <span className="badge">
                                Step {hermesLifecycle.operation.step}/
                                {hermesLifecycle.operation.totalSteps}
                              </span>
                            </div>
                            <div className="operator-field-grid">
                              <div className="operator-field operator-field-span-2">
                                <span>Current stage</span>
                                <strong>{hermesLifecycle.operation.title}</strong>
                              </div>
                              <div className="operator-field operator-field-span-2">
                                <span>Stage detail</span>
                                <strong>
                                  {hermesLifecycle.operation.detail ??
                                    "Watching Hermes lifecycle output."}
                                </strong>
                              </div>
                              <div className="operator-field operator-field-span-2">
                                <span>Checkpoint trail</span>
                                <strong>
                                  {hermesLifecycle.operation.checkpoints
                                    .filter(
                                      (checkpoint) =>
                                        checkpoint.state === "completed" ||
                                        checkpoint.state === "active",
                                    )
                                    .map((checkpoint) =>
                                      checkpoint.state === "active"
                                        ? `${checkpoint.label} (active)`
                                        : checkpoint.label,
                                    )
                                    .join(" -> ") || "Waiting for Hermes output."}
                                </strong>
                              </div>
                            </div>
                            {hermesLifecycle.operation.rollbackHint && (
                              <small className="verification-evidence">
                                {hermesLifecycle.operation.rollbackHint}
                              </small>
                            )}
                            {tailPreview(hermesLifecycle.operation.log) && (
                              <pre className="operator-preview">
                                {tailPreview(hermesLifecycle.operation.log)}
                              </pre>
                            )}
                          </div>
                        )}
                        {hermesLifecycle?.lastDoctorOutput && (
                          <div className="detail-block">
                            <strong>Doctor output</strong>
                            <pre className="operator-preview">
                              {tailPreview(hermesLifecycle.lastDoctorOutput, 2200)}
                            </pre>
                          </div>
                        )}
                        {hermesLifecycle?.gatewayLogTail && (
                          <div className="detail-block">
                            <strong>Gateway stderr tail</strong>
                            <pre className="operator-preview">
                              {tailPreview(hermesLifecycle.gatewayLogTail, 2200)}
                            </pre>
                          </div>
                        )}
                        {(hermesLifecycleError || hermesLifecycle?.verificationDetail) && (
                          <small className="verification-evidence">
                            {hermesLifecycleError ?? hermesLifecycle?.verificationDetail}
                          </small>
                        )}
                      </div>
                    )}
                    <div className="operator-field-grid">
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Dispatch profile</span>
                        <select
                          className="operator-input"
                          value={selectedRuntimeDispatchProfile?.name ?? ""}
                          onChange={(event) => setRuntimeDispatchProfileName(event.target.value)}
                        >
                          {profiles.length === 0 && <option value="">No profiles loaded</option>}
                          {profiles.map((profile) => (
                            <option key={profile.name} value={profile.name}>
                              {profile.name}
                              {profile.isDefault ? " (default)" : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="operator-field">
                        <span>Profile board</span>
                        <strong>{runtimeDispatchProfileBoard?.name ?? "Link a board in Agents first"}</strong>
                      </div>
                      <div className="operator-field">
                        <span>Lane dispatch</span>
                        <strong>{selectedRuntimeProvider.displayName}</strong>
                      </div>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Dispatch schedule</span>
                        <select
                          className="operator-input"
                          value={selectedRuntimeDispatchSchedule?.id ?? ""}
                          onChange={(event) => setRuntimeDispatchScheduleId(event.target.value)}
                        >
                          {runtimeDispatchSchedules.length === 0 && (
                            <option value="">No schedules loaded</option>
                          )}
                          {runtimeDispatchSchedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                              {schedule.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="operator-field operator-field-span-2">
                        <span>Schedule board</span>
                        <strong>
                          {runtimeDispatchScheduleBoard?.name ??
                            "Link or inherit a board in Schedules first"}
                        </strong>
                      </div>
                      <label className="operator-input-group">
                        <span>Attach CodeGraph</span>
                        <input
                          type="checkbox"
                          checked={runtimeDispatchIncludeCodeGraph}
                          disabled={codegraphRepos.length === 0}
                          onChange={(event) => setRuntimeDispatchIncludeCodeGraph(event.target.checked)}
                        />
                      </label>
                      <label className="operator-input-group">
                        <span>CodeGraph repo</span>
                        <select
                          className="operator-input"
                          value={runtimeDispatchCodeGraphRepo?.id ?? ""}
                          disabled={!runtimeDispatchIncludeCodeGraph || codegraphRepos.length === 0}
                          onChange={(event) => setRuntimeDispatchCodeGraphRepoId(event.target.value)}
                        >
                          {codegraphRepos.length === 0 && <option value="">No repos registered</option>}
                          {codegraphRepos.map((repo) => (
                            <option key={repo.id} value={repo.id}>
                              {repo.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>CodeGraph queries</span>
                        <select
                          multiple
                          className="operator-input"
                          size={Math.min(4, Math.max(2, runtimeDispatchCodeGraphQueries.length || 2))}
                          value={runtimeDispatchCodeGraphQueryIds}
                          disabled={
                            !runtimeDispatchIncludeCodeGraph ||
                            runtimeDispatchCodeGraphQueries.length === 0
                          }
                          onChange={(event) =>
                            setRuntimeDispatchCodeGraphQueryIds(
                              Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                            )
                          }
                        >
                          {runtimeDispatchCodeGraphQueries.length === 0 && (
                            <option value="">No queries available for this repo</option>
                          )}
                          {runtimeDispatchCodeGraphQueries.map((query) => (
                            <option key={query.id} value={query.id}>
                              {query.name} [{query.mode}]
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="operator-input-group">
                        <span>Attach EverOS</span>
                        <input
                          type="checkbox"
                          checked={runtimeDispatchIncludeEverOs}
                          disabled={runtimeDispatchAvailableHarnesses.length === 0}
                          onChange={(event) => setRuntimeDispatchIncludeEverOs(event.target.checked)}
                        />
                      </label>
                      <div className="operator-field">
                        <span>Suggested harnesses</span>
                        <strong>{runtimeDispatchSuggestedHarnessIds.length || 0}</strong>
                      </div>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>EverOS harnesses</span>
                        <select
                          multiple
                          className="operator-input"
                          size={Math.min(4, Math.max(2, runtimeDispatchAvailableHarnesses.length || 2))}
                          value={runtimeDispatchEverOsHarnessIds}
                          disabled={
                            !runtimeDispatchIncludeEverOs ||
                            runtimeDispatchAvailableHarnesses.length === 0
                          }
                          onChange={(event) =>
                            setRuntimeDispatchEverOsHarnessIds(
                              Array.from(event.currentTarget.selectedOptions, (option) => option.value),
                            )
                          }
                        >
                          {runtimeDispatchAvailableHarnesses.length === 0 && (
                            <option value="">No enabled harnesses available</option>
                          )}
                          {runtimeDispatchAvailableHarnesses.map((harness) => (
                            <option key={harness.id} value={harness.id}>
                              {harness.name} [{harness.memoryNamespace}]
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <p className="workspace-copy">
                      Dispatch saved profile work or run a saved schedule straight from the active runtime lane. These actions stay provider-scoped, target the linked Kanban board, and let you choose the exact CodeGraph and EverOS context that goes into this run.
                    </p>
                    <div className="gateway-action-row">
                      <button
                        className="toggle-button enabled"
                        disabled={!selectedRuntimeDispatchProfile?.kanbanBoardSlug}
                        onClick={() => void handleRuntimeProfileDispatch()}
                      >
                        Dispatch profile to board
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedRuntimeDispatchSchedule?.kanbanBoardSlug}
                        onClick={() => void handleRuntimeScheduleDispatch()}
                      >
                        Run schedule to board
                      </button>
                    </div>
                    <div className="detail-block">
                      <strong>Recent dispatch runs</strong>
                      {recentDispatchRuns.length > 0 ? (
                        recentDispatchRuns.map((run) => (
                          <div key={run.id} className="operator-field-grid">
                            <div className="operator-field">
                              <span>Target</span>
                              <strong>{run.targetName}</strong>
                            </div>
                            <div className="operator-field">
                              <span>Status</span>
                              <strong>{DISPATCH_RUN_STATUS_LABELS[run.status]}</strong>
                            </div>
                            <div className="operator-field">
                              <span>Source</span>
                              <strong>{DISPATCH_RUN_SOURCE_LABELS[run.source]}</strong>
                            </div>
                            <div className="operator-field">
                              <span>Completed</span>
                              <strong>{formatEpochTimestamp(run.completedAt) ?? "In progress"}</strong>
                            </div>
                            <div className="operator-field operator-field-span-2">
                              <span>Context</span>
                              <strong>
                                {run.context.codegraph?.repoName ?? "No CodeGraph repo"}
                                {run.context.everosHarnesses.length > 0
                                  ? ` · ${run.context.everosHarnesses.map((harness) => harness.name).join(", ")}`
                                  : " · No EverOS harness"}
                              </strong>
                            </div>
                            <div className="operator-field operator-field-span-2">
                              <span>Response</span>
                              <strong>
                                {run.output
                                  ? run.output.length > 160
                                    ? `${run.output.slice(0, 157)}...`
                                    : run.output
                                  : "No response recorded"}
                              </strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p>No dispatch runs recorded for this runtime lane yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="gateway-platform-board">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Platform lanes</p>
                    <h3>Connect each runtime lane</h3>
                  </div>
                  <span className="pill">{overview.runtimeProviders.length} lanes</span>
                </div>
                <div className="gateway-platform-grid">
                  {overview.runtimeProviders.map((provider) => (
                    <article
                      key={provider.id}
                      className={`gateway-platform-card ${selectedRuntimeProvider?.id === provider.id ? "selected" : ""}`}
                    >
                      <div className="gateway-platform-topline">
                        <div className="gateway-platform-brand">
                          <span className="registry-avatar registry-avatar-runtime">
                            {buildMonogram(provider.displayName)}
                          </span>
                          <div>
                            <h4>{provider.displayName}</h4>
                            <p className="workspace-objective">
                              {RUNTIME_PROVIDER_ROLE_LABELS[provider.role]} · {provider.integrationStatus}
                            </p>
                          </div>
                        </div>
                        <span className={`status-chip ${RUNTIME_LANE_STATE_CLASSES[provider.laneState]}`}>
                          {RUNTIME_LANE_STATE_LABELS[provider.laneState]}
                        </span>
                      </div>
                      <p className="operator-list-copy">{provider.notes[0]}</p>
                      <div className="badge-row">
                        <span className="badge">
                          {provider.appEnabled ? "Linked app enabled" : "App optional"}
                        </span>
                        <span className="badge">
                          {provider.readySmokeTargetCount}/{provider.totalSmokeTargetCount} checks ready
                        </span>
                        {provider.surfaceMode && (
                          <span className="badge">{RUNTIME_MODE_LABELS[provider.surfaceMode]}</span>
                        )}
                        {provider.dockerCandidateCount > 0 && (
                          <span className="badge">
                            {provider.dockerCandidateCount} Docker candidate{provider.dockerCandidateCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <div className="chip-row">
                        {provider.connectionModes.map((mode) => (
                          <span key={mode} className="chip">
                            {CONNECTION_MODE_LABELS[mode]}
                          </span>
                        ))}
                      </div>
                      <small className="verification-evidence">
                        {provider.surfaceUrl ?? provider.remoteExampleUrl}
                      </small>
                      <div className="gateway-card-actions">
                        <button
                          className="ghost-button"
                          onClick={() => void handleActiveRuntimeProvider(provider.id)}
                        >
                          {selectedRuntimeProvider?.id === provider.id ? "Selected lane" : "Select lane"}
                        </button>
                        {provider.surfaceUrl && provider.linkedRuntimeSurfaceAppId && (
                          <button
                            className="ghost-button"
                            onClick={() => void handleOpenRuntimeSurface(provider.linkedRuntimeSurfaceAppId!)}
                          >
                            Open surface
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="gateway-orchestrator-strip">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Task orchestrators</p>
                    <h3>Keep execution mode aligned</h3>
                  </div>
                  {selectedTaskOrchestrator && (
                    <span className={`status-chip ${selectedTaskOrchestrator.compatibleSelectedRuntime ? "on" : "off"}`}>
                      {selectedTaskOrchestrator.compatibleSelectedRuntime ? "Aligned" : "Check lane"}
                    </span>
                  )}
                </div>
                <div className="gateway-orchestrator-list">
                  {overview.taskOrchestrators.map((orchestrator) => (
                    <button
                      key={orchestrator.id}
                      className={`stack-item ${selectedTaskOrchestrator?.id === orchestrator.id ? "selected" : ""}`}
                      onClick={() => void handleActiveTaskOrchestrator(orchestrator.id)}
                    >
                      <strong>{orchestrator.displayName}</strong>
                      <span>
                        {ORCHESTRATOR_MODE_LABELS[orchestrator.integrationMode]} · {orchestrator.compatibleConfiguredRuntimeCount} compatible lanes staged
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Smoke Harness</p>
                  <h3>
                    {selectedRuntimeProvider
                      ? `${selectedRuntimeProvider.displayName} probe targets`
                      : "Probe targets"}
                  </h3>
                </div>
                <span className="pill">{overview.stats.readySmokeTargets} ready</span>
              </div>
              <p className="workspace-copy">
                Stage remote, TCP, or SSH targets here. Remote probes check HTTP reachability, TCP probes verify socket access, and SSH probes confirm a non-interactive handshake before you open the same lane in Agent Desktop.
              </p>
              {selectedRuntimeSmokeTargets.length > 0 ? (
                <div className="smoke-target-grid">
                  {selectedRuntimeSmokeTargets.map((target) => (
                    <article key={target.id} className="runtime-surface-card">
                      <div className="workspace-header">
                        <div>
                          <h4>{target.label}</h4>
                          <p className="workspace-objective">
                            {SMOKE_TRANSPORT_LABELS[target.transport]}
                          </p>
                        </div>
                        <span className={`status-chip ${SMOKE_STATUS_CLASSES[target.status]}`}>
                          {SMOKE_STATUS_LABELS[target.status]}
                        </span>
                      </div>
                      <small className="verification-evidence">{target.suggestedProbeTarget}</small>
                      {target.transport === "remote" ? (
                        <div className="smoke-target-fields">
                          <label>
                            <span>Probe URL</span>
                            <input
                              type="text"
                              value={target.remoteUrl}
                              placeholder={selectedRuntimeProvider?.remoteExampleUrl ?? "http://192.168.1.100:8642/health"}
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  remoteUrl: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : target.transport === "tcp" ? (
                        <div className="smoke-target-fields tcp">
                          <label>
                            <span>Host</span>
                            <input
                              type="text"
                              value={target.tcpHost}
                              placeholder={LOCAL_RUNTIME_HOST}
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  tcpHost: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>Port</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={target.tcpPort ?? ""}
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  tcpPort:
                                    event.target.value.length > 0
                                      ? Number(event.target.value)
                                      : null,
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="smoke-target-fields ssh">
                          <label>
                            <span>Host</span>
                            <input
                              type="text"
                              value={target.sshHost}
                              placeholder="myserver.local"
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  sshHost: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>Username</span>
                            <input
                              type="text"
                              value={target.sshUsername}
                              placeholder="agent"
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  sshUsername: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>Port</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={target.sshPort}
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  sshPort: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>Key path</span>
                            <input
                              type="text"
                              value={target.sshKeyPath}
                              placeholder="C:/Users/you/.ssh/id_ed25519"
                              onChange={(event) =>
                                void handleSmokeTargetConfig(target.id, {
                                  sshKeyPath: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                      )}
                      {target.transport === "ssh" && target.sshRemotePort != null && (
                        <small className="verification-evidence">
                          Expected gateway port {target.sshRemotePort}
                        </small>
                      )}
                      {target.notes && (
                        <small className="verification-evidence">{target.notes}</small>
                      )}
                      {target.lastRunAt && (
                        <small className="verification-evidence">
                          Last run {new Date(target.lastRunAt).toLocaleString()}
                        </small>
                      )}
                      {target.lastRunDetail && (
                        <div className="docker-node-diagnostic">
                          <strong>Latest probe</strong>
                          <span>{target.lastRunDetail}</span>
                        </div>
                      )}
                      <div className="registry-footer mission-actions">
                        <button
                          className={`toggle-button ${target.status === "passed" ? "enabled" : ""}`}
                          disabled={!target.ready}
                          onClick={() => void handleRunSmokeTarget(target.id)}
                        >
                          {target.transport === "remote"
                            ? "Run HTTP probe"
                            : target.transport === "tcp"
                              ? "Run TCP probe"
                              : "Run SSH handshake"}
                        </button>
                        {selectedRuntimeProvider?.linkedAppId && (
                          <button
                            className="ghost-button"
                            onClick={() => void handleInspectApp(selectedRuntimeProvider.linkedAppId!)}
                          >
                            Inspect linked app
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  Select a runtime lane to stage its remote and SSH smoke targets.
                </div>
              )}
            </article>

            <article className="panel-card panel-card-span-3">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Runtime Surfaces</p>
                  <h3>Linked ports and container endpoints</h3>
                </div>
                <span className="pill">
                  {overview.stats.configuredRuntimeSurfaces} mapped endpoints
                </span>
              </div>
              <div className="runtime-surface-grid">
                {overview.runtimeSurfaces.map((surface) => (
                  <article key={surface.appId} className="runtime-surface-card">
                    <div className="workspace-header">
                      <div>
                        <h4>{appMap.get(surface.appId)?.name ?? surface.appId}</h4>
                        <p className="workspace-objective">{surface.label}</p>
                      </div>
                      <span className={`status-chip ${surface.url ? "on" : "off"}`}>
                        {surface.url ? "Ready" : "Unmapped"}
                      </span>
                    </div>
                    <p className="workspace-copy">{surface.notes}</p>
                    <div className="badge-row">
                      <span className="badge">
                        {surface.appEnabled ? "Enabled app" : "Disabled app"}
                      </span>
                      <span className="badge">{RUNTIME_MODE_LABELS[surface.mode]}</span>
                    </div>
                    <div className="runtime-surface-controls">
                      <label>
                        <span>Host</span>
                        <input
                          type="text"
                          value={surface.host}
                          onChange={(event) =>
                            void handleRuntimeSurfaceConfig(surface.appId, {
                              host: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Port</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={surface.port ?? ""}
                          onChange={(event) =>
                            void handleRuntimeSurfaceConfig(surface.appId, {
                              port:
                                event.target.value.trim().length === 0
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        <span>Path</span>
                        <input
                          type="text"
                          value={surface.path}
                          onChange={(event) =>
                            void handleRuntimeSurfaceConfig(surface.appId, {
                              path: event.target.value,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="runtime-surface-pickers">
                      <div className="runtime-surface-picker-group">
                        {(["http", "https"] as PlatformSurfaceProtocol[]).map((protocol) => (
                          <button
                            key={protocol}
                            className={`filter-chip ${surface.protocol === protocol ? "active" : ""}`}
                            onClick={() =>
                              void handleRuntimeSurfaceConfig(surface.appId, {
                                protocol,
                              })
                            }
                          >
                            {PROTOCOL_LABELS[protocol]}
                          </button>
                        ))}
                      </div>
                      <div className="runtime-surface-picker-group">
                        {(["desktop", "docker", "remote"] as PlatformRuntimeSurfaceMode[]).map((mode) => (
                          <button
                            key={mode}
                            className={`filter-chip ${surface.mode === mode ? "active" : ""}`}
                            onClick={() =>
                              void handleRuntimeSurfaceConfig(surface.appId, {
                                mode,
                              })
                            }
                          >
                            {RUNTIME_MODE_LABELS[mode]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <small className="verification-evidence">
                      {surface.url ?? "Assign an exposed port to link this surface from the console."}
                    </small>
                    <div className="registry-footer mission-actions">
                      <button
                        className={`toggle-button ${surface.url ? "enabled" : ""}`}
                        disabled={!surface.url}
                        onClick={() => void handleOpenRuntimeSurface(surface.appId)}
                      >
                        Open surface
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => void handleInspectApp(surface.appId)}
                      >
                        Inspect app
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeView === "operations" && (
          <section className="dashboard-grid">
              <article className="panel-card panel-card-span-3">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Docker Desktop</p>
                    <h3>Container fabric</h3>
                  </div>
                  <div className="badge-row">
                    <span className="pill">
                      {overview.stats.dockerNodeCount} tracked · {overview.stats.liveDockerNodes} running · {overview.stats.downDockerNodes} down
                    </span>
                    <span className="pill">{overview.stats.composeProjects} projects</span>
                    <button className="ghost-button" onClick={() => void handleRefreshDockerNodes()}>
                      Scan containers
                    </button>
                  </div>
                </div>
                <p className="workspace-copy">{overview.docker.message}</p>
                {overview.docker.lastScannedAt && (
                  <small className="verification-evidence">
                    Last scanned {new Date(overview.docker.lastScannedAt).toLocaleTimeString()}
                  </small>
                )}
                {overview.docker.projects.length > 0 && (
                  <div className="docker-project-grid">
                    {overview.docker.projects.map((project) => (
                      <article key={project.id} className="docker-project-card">
                        <div className="workspace-header">
                          <div>
                            <h4>{project.label}</h4>
                            <p className="workspace-objective">{project.nodeCount} services discovered</p>
                          </div>
                          <span
                            className={`status-chip ${DOCKER_PROJECT_HEALTH_CLASSES[project.health]}`}
                          >
                            {DOCKER_PROJECT_HEALTH_LABELS[project.health]}
                          </span>
                        </div>
                        <div className="badge-row">
                          <span className="badge">{project.runningCount} running</span>
                          <span className="badge">{project.downCount} down</span>
                          <span className="badge">{project.matchedNodeCount} matched</span>
                        </div>
                        <small className="verification-evidence">
                          {(project.serviceNames ?? []).slice(0, 5).join(", ")}
                          {(project.serviceNames ?? []).length > 5 ? "..." : ""}
                        </small>
                        {(project.diagnostics ?? []).length > 0 && (
                          <div className="docker-project-diagnostics">
                            {project.diagnostics.map((diagnostic) => (
                              <div
                                key={`${project.id}-${diagnostic.serviceName}-${diagnostic.health}`}
                                className="docker-diagnostic-item"
                              >
                                <strong>
                                  {diagnostic.serviceName} · {DOCKER_HEALTH_LABELS[diagnostic.health]}
                                </strong>
                                <span>{diagnostic.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
                {overview.docker.nodes.length > 0 ? (
                  <div className="docker-node-grid">
                    {overview.docker.nodes.map((node) => {
                      const matchedApp = node.matchedAppId
                        ? appMap.get(node.matchedAppId) ?? null
                        : null;
                      const linkedSurface = matchedApp
                        ? overview.runtimeSurfaces.find((surface) => surface.appId === matchedApp.id) ?? null
                        : null;
                      const preferredPortKey = node.preferredPort
                        ? dockerPortKey(node.preferredPort)
                        : null;
                      const recommendedPort = node.preferredPort;
                      const preferredLinked =
                        linkedSurface != null &&
                        recommendedPort != null &&
                        linkedSurface.host === recommendedPort.host &&
                        linkedSurface.port === recommendedPort.hostPort;
                      const displayPorts = sortDockerPortsForDisplay(node.ports, recommendedPort);
                      const startedAtLabel = formatTimestamp(node.startedAt);
                      const finishedAtLabel = formatTimestamp(node.finishedAt);
                      const onboardingDraft =
                        dockerOnboardingDrafts[node.bindingKey] ??
                        defaultDockerOnboardingDraft(node);

                      return (
                        <article key={node.id} className="docker-node-card">
                          <div className="workspace-header">
                            <div>
                              <h4>{node.name}</h4>
                              <p className="workspace-objective">{node.image}</p>
                            </div>
                            <span className={`status-chip ${DOCKER_HEALTH_CLASSES[node.health]}`}>
                              {DOCKER_HEALTH_LABELS[node.health]}
                            </span>
                          </div>
                          <div className="badge-row">
                            {node.composeProject && <span className="badge">{node.composeProject}</span>}
                            {node.composeService && <span className="badge">{node.composeService}</span>}
                            <span className="badge">
                              {matchedApp ? matchedApp.name : "Untracked node"}
                            </span>
                            <span className="badge">{DOCKER_BINDING_MODE_LABELS[node.matchMode]}</span>
                          </div>
                          <small className="verification-evidence">{node.status}</small>
                          {startedAtLabel && (
                            <small className="verification-evidence">Started {startedAtLabel}</small>
                          )}
                          {finishedAtLabel && (
                            <small className="verification-evidence">Finished {finishedAtLabel}</small>
                          )}
                          {node.diagnostic && (
                            <div className="docker-node-diagnostic">
                              <strong>Operator note</strong>
                              <span>{node.diagnostic}</span>
                            </div>
                          )}
                          <div className="docker-binding-controls">
                            <label>
                              <span>Bind to app</span>
                              <select
                                value={node.matchedAppId ?? ""}
                                onChange={(event) =>
                                  void handleDockerNodeBinding(
                                    node.bindingKey,
                                    event.target.value.trim().length > 0
                                      ? event.target.value
                                      : null,
                                  )
                                }
                              >
                                <option value="">No binding</option>
                                {overview.apps.map((app) => (
                                  <option key={app.id} value={app.id}>
                                    {app.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {node.matchMode === "manual" && (
                              <button
                                className="ghost-button"
                                onClick={() => void handleDockerNodeBinding(node.bindingKey, null)}
                              >
                                Clear override
                              </button>
                            )}
                          </div>
                          {!matchedApp && (
                            <div className="docker-onboarding-form">
                              <div className="docker-onboarding-grid">
                                <label>
                                  <span>Create custom app</span>
                                  <input
                                    type="text"
                                    value={onboardingDraft.name}
                                    onChange={(event) =>
                                      updateDockerOnboardingDraft(node, {
                                        name: event.target.value,
                                      })
                                    }
                                    placeholder="Cubecloud Surface"
                                  />
                                </label>
                                <label>
                                  <span>Kind</span>
                                  <select
                                    value={onboardingDraft.kind}
                                    onChange={(event) =>
                                      updateDockerOnboardingDraft(node, {
                                        kind: event.target.value as AppKind,
                                      })
                                    }
                                  >
                                    {Object.entries(KIND_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  <span>Integration</span>
                                  <select
                                    value={onboardingDraft.integration}
                                    onChange={(event) =>
                                      updateDockerOnboardingDraft(node, {
                                        integration: event.target.value as IntegrationKind,
                                      })
                                    }
                                  >
                                    {Object.entries(INTEGRATION_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>
                                        {label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="registry-footer mission-actions">
                                <button
                                  className="toggle-button enabled"
                                  disabled={!onboardingDraft.name.trim()}
                                  onClick={() => void handleOnboardDockerNode(node)}
                                >
                                  Create custom app
                                </button>
                              </div>
                            </div>
                          )}
                          {matchedApp && (
                            <div className="chip-row">
                              <span className="chip">{KIND_LABELS[matchedApp.kind]}</span>
                              {(matchedApp.capabilityIds ?? []).slice(0, 2).map((capabilityId) => (
                                <span key={capabilityId} className="chip">
                                  {capabilityMap.get(capabilityId)?.name ?? capabilityId}
                                </span>
                              ))}
                            </div>
                          )}
                          {((node.networkNames ?? []).length > 0 || (node.mountTargets ?? []).length > 0) && (
                            <div className="chip-row">
                              {(node.networkNames ?? []).slice(0, 2).map((networkName) => (
                                <span key={networkName} className="chip">Net {networkName}</span>
                              ))}
                              {(node.mountTargets ?? []).slice(0, 2).map((mountTarget) => (
                                <span key={mountTarget} className="chip">Mount {mountTarget}</span>
                              ))}
                            </div>
                          )}
                          {recommendedPort && (
                            <div className="docker-node-hint">
                              <strong>Recommended port {recommendedPort.hostPort}</strong>
                              <span>
                                {node.preferredPortReason ??
                                  `Container ${recommendedPort.containerPort}/${recommendedPort.protocol} is the best current match.`}
                              </span>
                            </div>
                          )}
                          {node.ports.length > 0 ? (
                            <div className="docker-port-list">
                              {displayPorts.map((portBinding) => {
                                const linked =
                                  linkedSurface != null &&
                                  linkedSurface?.host === portBinding.host &&
                                  linkedSurface?.port === portBinding.hostPort;
                                const recommended =
                                  preferredPortKey != null &&
                                  dockerPortKey(portBinding) === preferredPortKey;

                                return (
                                  <button
                                    key={`${node.id}-${portBinding.host}-${portBinding.hostPort}-${portBinding.containerPort}`}
                                    className={`port-button ${linked ? "active" : ""} ${recommended ? "recommended" : ""}`}
                                    disabled={!matchedApp}
                                    onClick={() =>
                                      matchedApp &&
                                      void handleAdoptDockerPort(
                                        matchedApp.id,
                                        portBinding.host,
                                        portBinding.hostPort,
                                      )
                                    }
                                  >
                                    <strong>{portBinding.hostPort}</strong>
                                    <span>
                                      {portBinding.containerPort}/{portBinding.protocol}
                                    </span>
                                    {recommended && <small>Recommended</small>}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <small className="verification-evidence">
                              {(node.exposedPorts ?? []).length > 0
                                ? `Exposed only inside the container: ${(node.exposedPorts ?? []).join(", ")}`
                                : "No published host ports are exposed from this container."}
                            </small>
                          )}
                          <div className="registry-footer mission-actions">
                            {matchedApp ? (
                              <>
                                {recommendedPort && (
                                  <button
                                    className={`toggle-button ${preferredLinked ? "enabled" : ""}`}
                                    onClick={() =>
                                      void handleAdoptDockerPort(
                                        matchedApp.id,
                                        recommendedPort.host,
                                        recommendedPort.hostPort,
                                      )
                                    }
                                  >
                                    {preferredLinked
                                      ? "Recommended port linked"
                                      : `Use recommended ${recommendedPort.hostPort}`}
                                  </button>
                                )}
                                <button
                                  className="ghost-button"
                                  onClick={() => void handleInspectApp(matchedApp.id)}
                                >
                                  Inspect matched app
                                </button>
                              </>
                            ) : (
                              <small className="verification-evidence">
                                Bind this container to a catalog app above, then adopt its recommended port into the runtime surface registry.
                              </small>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p>No Docker Desktop containers are currently available to inspect.</p>
                  </div>
                )}
              </article>

              <article className="panel-card">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Verification</p>
                    <h3>Operator checks</h3>
                  </div>
                  <span className="pill">Verify manually</span>
                </div>
                <div className="verification-list">
                  {overview.verification.map((item) => (
                    <article key={item.id} className="verification-item">
                      <div className="workspace-header">
                        <strong>{item.name}</strong>
                        <span className={`status-chip ${STATUS_CLASSES[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      <p>{item.description}</p>
                      <small className="verification-evidence">{item.evidence}</small>
                    </article>
                  ))}
                </div>
              </article>
            </section>
        )}

        {activeView === "settings" && (
          <section className="settings-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Appearance</p>
                  <h3>Theme</h3>
                </div>
                <span className="pill">Resolved {resolved}</span>
              </div>
              <div className="theme-switcher" aria-label="Theme mode">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`theme-switcher-btn ${theme === option.value ? "active" : ""}`}
                    onClick={() => setTheme(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="settings-section-copy">
                Follow the system preference or pin the shell to light or dark. Preference is stored per-device.
              </p>
            </article>

            <section className="settings-registry-layout">
              <article className="panel-card">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Feature Registry</p>
                    <h3>Surfaces and integrations</h3>
                  </div>
                  <div className="filter-row">
                    <button
                      className={`filter-chip ${kindFilter === "all" ? "active" : ""}`}
                      onClick={() => setKindFilter("all")}
                    >
                      All
                    </button>
                    {(Object.keys(KIND_LABELS) as AppKind[]).map((kind) => (
                      <button
                        key={kind}
                        className={`filter-chip ${kindFilter === kind ? "active" : ""}`}
                        onClick={() => setKindFilter(kind)}
                      >
                        {KIND_LABELS[kind]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="registry-grid">
                  {visibleApps.map((app) => (
                    <article key={app.id} className="registry-card">
                      <div className="registry-topline">
                        <span className="badge">{KIND_LABELS[app.kind]}</span>
                        <span className="badge">{app.integration}</span>
                      </div>
                      <h4>{app.name}</h4>
                      <p className="registry-tagline">{app.tagline}</p>
                      <p className="registry-copy">{app.description}</p>
                      <div className="registry-footer">
                        <button
                          className={`toggle-button ${app.enabled ? "enabled" : ""}`}
                          onClick={() => void handleToggleApp(app.id, !app.enabled)}
                        >
                          {app.enabled ? "Disable" : "Enable"}
                        </button>
                        <button className="ghost-button" onClick={() => setSelectedAppId(app.id)}>
                          Inspect
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </article>

              <article className="panel-card detail-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Selected feature</p>
                    <h3>{selectedApp?.name ?? "None selected"}</h3>
                  </div>
                  {selectedApp && <span className="pill">{selectedApp.source}</span>}
                </div>
                {selectedApp ? (
                  <>
                    <p className="detail-copy">{selectedApp.description}</p>
                    <div className="detail-block">
                      <strong>Why it is here</strong>
                      <p>{selectedApp.tagline}</p>
                    </div>
                    <div className="detail-block">
                      <strong>Mounting contract</strong>
                      <p>{selectedApp.integration}</p>
                    </div>
                    <div className="detail-block">
                      <strong>Compatible lanes</strong>
                      <div className="chip-row">
                        {selectedApp.supportedSlots.map((slotId) => {
                          const slot = overview.slots.find((candidate) => candidate.id === slotId);
                          return <span key={slotId} className="chip">{slot?.name ?? slotId}</span>;
                        })}
                      </div>
                    </div>
                    <div className="detail-block">
                      <strong>Capability hooks</strong>
                      <div className="chip-row">
                        {selectedApp.capabilityIds.map((capabilityId) => (
                          <span key={capabilityId} className="chip">
                            {capabilityMap.get(capabilityId)?.name ?? capabilityId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="detail-copy">
                    Select a feature from the registry to inspect how it fits into the Cubecloud console.
                  </p>
                )}
              </article>
            </section>

            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Shell Status</p>
                  <h3>System and legal</h3>
                </div>
                <span className="pill">© Cubecloud</span>
              </div>
              <p className="workspace-copy">
                Settings now owns shell ergonomics and registry visibility only. Runtime lane endpoints,
                smoke probes, and verification stay in Gateway so the controls are not duplicated.
              </p>
              <div className="operator-field-grid">
                <div className="operator-field">
                  <span>Theme</span>
                  <strong>{resolved}</strong>
                </div>
                <div className="operator-field">
                  <span>Enabled surfaces</span>
                  <strong>{overview.stats.enabledApps}</strong>
                </div>
                <div className="operator-field">
                  <span>Runtime lane</span>
                  <strong>{selectedRuntimeProvider?.displayName ?? "No active lane"}</strong>
                </div>
                <div className="operator-field">
                  <span>Orchestrator</span>
                  <strong>{selectedTaskOrchestrator?.displayName ?? "Not staged"}</strong>
                </div>
              </div>
              <div className="detail-block">
                <strong>License notice</strong>
                <p>
                  Agent Desktop is the Cubecloud shell. Runtime integrations and embedded components remain
                  subject to their upstream licenses and service terms.
                </p>
              </div>
              <div className="registry-footer mission-actions">
                <button
                  className="ghost-button"
                  onClick={() => void handleViewChange("gateway")}
                >
                  Open Gateway
                </button>
                <button
                  className="ghost-button"
                  onClick={() => void handleViewChange("console")}
                >
                  Open Console
                </button>
              </div>
            </article>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            AGENT VIEWS
        ═══════════════════════════════════════════════════════════════════ */}

        {/* ── Chat ──────────────────────────────────────────────────────── */}
        {activeView === "chat" && (
          <div className="chat-outer">
            {!agentSurfaceUrl ? (
              <div className="view-empty-state">
                <p>No runtime connected. Configure a lane in Gateway, then come back to chat.</p>
                <button className="toggle-button enabled" onClick={() => void handleViewChange("gateway")}>
                  Open Gateway
                </button>
              </div>
            ) : (
              <div className="chat-panel">
                <div className="chat-toolbar">
                  <div className="chat-toolbar-main">
                    <span className="chat-toolbar-title">
                      {selectedRuntimeProvider?.displayName ?? "Agent"}
                    </span>
                    {chatResumeSessionId && (
                      <span className="pill">Resuming {chatResumeSessionId.slice(-6)}</span>
                    )}
                  </div>
                  <div className="chat-toolbar-actions">
                    <div className="chat-mode-picker" aria-label="Request mode">
                      {chatRequestModes.map((mode) => (
                        <button
                          key={mode.value}
                          type="button"
                          className={`chat-mode-button${chatRequestMode === mode.value ? " active" : ""}`}
                          onClick={() => setChatRequestMode(mode.value)}
                          title={mode.description}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <button className="ghost-button" onClick={handleResetChat}>
                      New chat
                    </button>
                  </div>
                </div>
                <div className="chat-mode-hint">
                  {
                    chatRequestModes.find((mode) => mode.value === chatRequestMode)
                      ?.description
                  }
                </div>

                <div className="chat-messages">
                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="chat-empty">
                      <img
                        src={cubecloudLogo}
                        alt="Cubecloud"
                        className="chat-empty-logo"
                      />
                      <h3 className="chat-empty-title">Welcome to Agent Desktop</h3>
                      <p className="chat-empty-copy">
                        Start with a prepared prompt for {selectedRuntimeProvider?.displayName ?? "your agent"}, then edit it before sending.
                      </p>
                      <div className="chat-suggestion-grid">
                        {CHAT_SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion.label}
                            className="chat-suggestion-button"
                            onClick={() => handleChatSuggestion(suggestion.text)}
                          >
                            <span className="chat-suggestion-label">{suggestion.label}</span>
                            <span className="chat-suggestion-copy">{suggestion.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-message chat-message-${msg.role}`}>
                      <div className="chat-message-bubble">{msg.content}</div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-message chat-message-assistant">
                      <div className="chat-message-bubble">
                        <div className="chat-loading-indicator">
                          <span className="chat-loading-dot" />
                          <span className="chat-loading-dot" />
                          <span className="chat-loading-dot" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="chat-input-bar">
                  <textarea
                    ref={chatInputRef}
                    className="chat-input"
                    rows={1}
                    placeholder={`Message ${selectedRuntimeProvider?.displayName ?? "agent"}…`}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendChat();
                      }
                    }}
                  />
                  <button
                    className="chat-send-btn"
                    disabled={!chatInput.trim() || chatLoading || !agentSurfaceUrl}
                    onClick={() => void handleSendChat()}
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Sessions ──────────────────────────────────────────────────── */}
        {activeView === "sessions" && (
          <section className="dashboard-grid">
            <article className="panel-card panel-card-span-2">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">History</p>
                  <h3>Recent sessions</h3>
                </div>
                {sessionsLoading ? (
                  <span className="pill">Loading…</span>
                ) : localSessionHistoryAvailable ? (
                  <span className="pill">Cubecloud session control plane</span>
                ) : null}
              </div>
              {sessions.length === 0 && !sessionsLoading ? (
                <div className="view-empty-state">
                  <p>
                    {localSessionHistoryAvailable
                      ? "No shell sessions recorded yet for this runtime provider."
                      : agentSurfaceUrl
                        ? "No sessions found on this runtime yet."
                        : "Connect a runtime to view sessions."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="operator-input-grid sessions-filter-grid">
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Filter sessions</span>
                      <input
                        className="operator-input"
                        value={sessionQuery}
                        onChange={(event) => setSessionQuery(event.target.value)}
                        placeholder="Search title, model, or source"
                      />
                    </label>
                  </div>
                  {filteredSessions.length === 0 ? (
                    <div className="view-empty-state">
                      <p>No sessions match the current filter.</p>
                    </div>
                  ) : (
                    <div className="sessions-list">
                      {filteredSessions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className={`session-item${selectedSessionId === s.id ? " selected" : ""}`}
                          onClick={() => setSelectedSessionId(s.id)}
                        >
                          <div className="session-item-body">
                            <div className="session-item-title">{s.title}</div>
                            <div className="session-item-meta">
                              {s.messageCount} messages &middot; {s.model} &middot;{" "}
                              {new Date(s.startedAt).toLocaleString()}
                            </div>
                          </div>
                          <span className="pill">{s.source}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </article>
            <article className="panel-card sessions-detail-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Inspector</p>
                  <h3>{selectedSession?.title ?? "Session detail"}</h3>
                </div>
                {selectedSession && <span className="pill">{selectedSession.id.slice(-6)}</span>}
              </div>
              {!selectedSession ? (
                <div className="view-empty-state">
                  <p>Select a session to inspect its transcript and metadata.</p>
                </div>
              ) : (
                <div className="sessions-detail-stack">
                  <div className="sessions-detail-toolbar">
                    <div className="sessions-tab-strip">
                      <button
                        type="button"
                        className={`chat-mode-button${sessionInspectorTab === "transcript" ? " active" : ""}`}
                        onClick={() => setSessionInspectorTab("transcript")}
                      >
                        Transcript
                      </button>
                      <button
                        type="button"
                        className={`chat-mode-button${sessionInspectorTab === "details" ? " active" : ""}`}
                        onClick={() => setSessionInspectorTab("details")}
                      >
                        Details
                      </button>
                    </div>
                    <button
                      type="button"
                      className="toggle-button enabled"
                      disabled={!canResumeSessionInChat || sessionHistoryLoading || sessionHistory.length === 0}
                      onClick={() => void handleResumeSessionInChat()}
                    >
                      Resume in chat
                    </button>
                  </div>

                  {localSessionMutationAvailable && (
                    <>
                      <div className="sessions-action-grid">
                        <label className="operator-input-group operator-input-group-span-2">
                          <span>Session title</span>
                          <input
                            className="operator-input"
                            value={sessionTitleDraft}
                            onChange={(event) => setSessionTitleDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleRenameSession();
                              }
                            }}
                            placeholder="Set a custom title or clear it to restore the default label"
                          />
                        </label>
                        <div className="sessions-inline-actions">
                          <button
                            type="button"
                            className="toggle-button enabled"
                            disabled={
                              !selectedSession ||
                              sessionActionBusy === "delete" ||
                              sessionTitleDraft.trim() === selectedSession.title.trim()
                            }
                            onClick={() => void handleRenameSession()}
                          >
                            {sessionActionBusy === "rename" ? "Saving…" : "Save title"}
                          </button>
                          <button
                            type="button"
                            className="ghost-button destructive"
                            disabled={!selectedSession || sessionActionBusy != null}
                            onClick={() => void handleDeleteSession()}
                          >
                            Delete session
                          </button>
                        </div>
                      </div>
                      <p className="sessions-detail-note">
                        These controls edit the shell-owned Cubecloud session history for the selected runtime provider.
                      </p>
                      {sessionActionError && (
                        <p className="sessions-detail-error">{sessionActionError}</p>
                      )}
                    </>
                  )}

                  {sessionInspectorTab === "details" ? (
                    <div className="sessions-metrics-grid">
                      <div className="persona-metric">
                        <strong>{selectedSession.messageCount}</strong>
                        <span>Messages</span>
                      </div>
                      <div className="persona-metric">
                        <strong>{sessionHistorySummary.reasoningCount}</strong>
                        <span>Reasoning events</span>
                      </div>
                      <div className="persona-metric">
                        <strong>{sessionHistorySummary.toolCallCount}</strong>
                        <span>Tool calls</span>
                      </div>
                      <div className="persona-metric">
                        <strong>{sessionHistorySummary.toolResultCount}</strong>
                        <span>Tool results</span>
                      </div>
                      <div className="persona-fact-list sessions-fact-list">
                        <div className="persona-fact-row">
                          <span>Started</span>
                          <strong>{new Date(selectedSession.startedAt).toLocaleString()}</strong>
                        </div>
                        <div className="persona-fact-row">
                          <span>Model</span>
                          <strong>{selectedSession.model}</strong>
                        </div>
                        <div className="persona-fact-row">
                          <span>Source</span>
                          <strong>{selectedSession.source}</strong>
                        </div>
                        <div className="persona-fact-row">
                          <span>Ownership</span>
                          <strong>
                            {localSessionMutationAvailable
                              ? "Cubecloud control plane"
                              : "Runtime summary only"}
                          </strong>
                        </div>
                        <div className="persona-fact-row">
                          <span>Resume availability</span>
                          <strong>
                            {canResumeSessionInChat
                              ? "Ready in Cubecloud shell"
                              : "Summaries only on this lane"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : !localSessionHistoryAvailable ? (
                    <div className="view-empty-state sessions-history-empty">
                      <p>
                        Transcript inspection and resume are shell-owned for the selected runtime provider. Keep chatting from Agent Desktop to build this provider's local control-plane history.
                      </p>
                    </div>
                  ) : sessionHistoryLoading ? (
                    <div className="view-empty-state sessions-history-empty">
                      <p>Loading transcript…</p>
                    </div>
                  ) : sessionHistoryError ? (
                    <div className="view-empty-state sessions-history-empty">
                      <p>{sessionHistoryError}</p>
                    </div>
                  ) : sessionHistory.length === 0 ? (
                    <div className="view-empty-state sessions-history-empty">
                      <p>No transcript rows were found for this session.</p>
                    </div>
                  ) : (
                    <div className="session-history-list">
                      {sessionHistory.map((item) => {
                        if (item.kind === "user" || item.kind === "assistant") {
                          return (
                            <div
                              key={`${item.kind}-${item.id}`}
                              className={`chat-message chat-message-${item.kind === "assistant" ? "assistant" : "user"}`}
                            >
                              <div className="chat-message-bubble">{item.content}</div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={`${item.kind}-${item.id}-${"callId" in item ? item.callId : ""}`}
                            className={`session-event session-event-${item.kind}`}
                          >
                            <div className="session-event-header">
                              <strong>
                                {item.kind === "reasoning"
                                  ? "Reasoning"
                                  : item.kind === "tool_call"
                                    ? `Tool call: ${item.name}`
                                    : `Tool result: ${item.name}`}
                              </strong>
                              <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <pre className="session-event-content">
                              {item.kind === "reasoning"
                                ? item.text
                                : item.kind === "tool_call"
                                  ? item.args
                                  : item.content}
                            </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          </section>
        )}

        {/* ── Agents / Profiles ─────────────────────────────────────────── */}
        {activeView === "agents" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Profiles</p>
                  <h3>Agent profiles</h3>
                </div>
                <div className="badge-row">
                  {profilesLoading && <span className="pill">Loading…</span>}
                  <span className="pill">{profiles.length} profiles</span>
                  <span className="pill">
                    {profiles.filter((profile) => profile.isDefault).length} default
                  </span>
                </div>
              </div>
              <p className="workspace-copy">
                Provider-scoped agent profiles in the Cubecloud control plane. Keep the default profile aligned with the active persona, then tune model and provider bindings here instead of scattering that state across Gateway.
              </p>
              {profiles.length === 0 && !profilesLoading ? (
                <div className="view-empty-state">
                  <p>{selectedRuntimeProvider ? "No shell profiles configured for this runtime provider yet." : "Select a runtime to view profiles."}</p>
                </div>
              ) : (
                <div className="operator-list">
                  {profiles.map((p) => (
                    <button
                      key={p.name}
                      className={`operator-list-item ${selectedProfile?.name === p.name ? "selected" : ""}`}
                      onClick={() => handleSelectProfile(p.name)}
                    >
                      <div className="operator-list-topline">
                        <strong>{p.name}</strong>
                        <div className="badge-row">
                          {p.isDefault && <span className="badge">Default</span>}
                          <span className={`badge ${p.gatewayRunning ? "success" : ""}`}>
                            Gateway {p.gatewayRunning ? "on" : "off"}
                          </span>
                        </div>
                      </div>
                      <p className="operator-list-copy">
                        {p.model} &middot; {p.provider}
                      </p>
                      <div className="badge-row">
                        <span className="badge">{p.skillCount} skills</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Profile editor</p>
                  <h3>{selectedProfile?.name ?? (personaEditable ? "Create profile" : "No profile selected")}</h3>
                </div>
                {selectedProfile && (
                  <div className="badge-row">
                    {selectedProfile.isDefault && <span className="pill">Default</span>}
                    <span className={`pill${selectedProfile.gatewayRunning ? "" : " off"}`}>
                      Gateway {selectedProfile.gatewayRunning ? "on" : "off"}
                    </span>
                  </div>
                )}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={profileDraft.name}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="ops-default"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Model</span>
                      <select
                        className="operator-input"
                        value={profileDraft.model}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            model: event.target.value,
                          }))
                        }
                      >
                        <option value="" disabled>
                          {profileModelOptions.length > 0 ? "Select model" : "No saved models"}
                        </option>
                        {profileModelMissing && (
                          <option value={profileDraft.model}>
                            Missing saved model: {profileDraft.model}
                          </option>
                        )}
                        {profileModelOptions.map((option) => (
                          <option key={option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Provider</span>
                      <select
                        className="operator-input"
                        value={profileDraft.provider}
                        onChange={(event) =>
                          setProfileDraft((current) => {
                            const nextProvider = event.target.value;
                            const nextProviderModels = models.filter(
                              (model) => model.provider === nextProvider,
                            );
                            const nextModel = nextProviderModels.some(
                              (model) => model.model === current.model,
                            )
                              ? current.model
                              : nextProviderModels[0]?.model ?? "";

                            return {
                              ...current,
                              provider: nextProvider,
                              model: nextModel,
                            };
                          })
                        }
                      >
                        <option value="" disabled>
                          {profileProviderOptions.length > 0
                            ? "Select provider"
                            : "No saved providers"}
                        </option>
                        {profileProviderMissing && (
                          <option value={profileDraft.provider}>
                            Missing saved provider: {profileDraft.provider}
                          </option>
                        )}
                        {profileProviderOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Kanban board</span>
                      <select
                        className="operator-input"
                        value={profileDraft.kanbanBoardSlug}
                        onChange={(event) =>
                          setProfileDraft((current) => ({
                            ...current,
                            kanbanBoardSlug: event.target.value,
                          }))
                        }
                      >
                        <option value="">No linked board</option>
                        {kanbanBoardOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Runtime lane</span>
                      <strong>{selectedRuntimeProvider?.displayName ?? "Not linked"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Saved skills</span>
                      <strong>{skills.length}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Saved models</span>
                      <strong>{models.length}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Saved providers</span>
                      <strong>{providers.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Active default profile</span>
                      <strong>{activeProfile?.name ?? "No default profile selected"}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Linked board</span>
                      <strong>
                        {kanbanBoards.find((board) => board.slug === profileDraft.kanbanBoardSlug)?.name ??
                          "No linked board"}
                      </strong>
                    </div>
                  </div>
                  {(profileProviderMissing || profileModelMissing) && (
                    <div className="detail-block">
                      <strong>Registry validation</strong>
                      <p>
                        {profileProviderMissing && profileModelMissing
                          ? "This profile points at a missing provider and a missing model endpoint. Choose saved registry entries before saving."
                          : profileProviderMissing
                            ? "This profile points at a provider that is no longer in the saved registry. Choose a saved provider before saving."
                            : "This profile points at a model endpoint that is no longer in the saved registry. Choose a saved model before saving."}
                      </p>
                    </div>
                  )}
                  <div className="detail-block">
                    <strong>Profile behavior</strong>
                    <p>
                      The default profile anchors persona posture, schedule defaults, and what the shell treats as the active operator lane. Link a Kanban board here when you want schedules and future lane dispatch to inherit the same work board by default.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className={`toggle-button${profileDraft.isDefault ? " enabled" : ""}`}
                      disabled={selectedProfile?.isDefault === true && !isCreatingProfileDraft}
                      onClick={() =>
                        setProfileDraft((current) => ({
                          ...current,
                          isDefault: !current.isDefault,
                        }))
                      }
                    >
                      {profileDraft.isDefault ? "Default on save" : "Make default"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!profileDraftValid}
                      onClick={() => void handleCreateProfile()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedProfile || !profileDraftValid}
                      onClick={() => void handleUpdateProfile()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewProfileDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedProfile || (selectedProfile.isDefault && profiles.length === 1)}
                      onClick={() => void handleDeleteProfile()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedProfile ? (
                <>
                  <p className="detail-copy">
                    {selectedProfile.name} routes through {selectedProfile.model} on {selectedProfile.provider}.
                  </p>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Model</span>
                      <strong>{selectedProfile.model}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Provider</span>
                      <strong>{selectedProfile.provider}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Gateway</span>
                      <strong>{selectedProfile.gatewayRunning ? "Running" : "Idle"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Saved skills</span>
                      <strong>{selectedProfile.skillCount}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Linked board</span>
                      <strong>
                        {kanbanBoards.find((board) => board.slug === selectedProfile.kanbanBoardSlug)?.name ??
                          "No linked board"}
                      </strong>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("persona")}
                    >
                      Open persona
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("models")}
                    >
                      Inspect models
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a profile to inspect or edit its lane bindings.</p>
              )}
            </article>
          </section>
        )}

        {/* ── Persona / Soul ─────────────────────────────────────────── */}
        {activeView === "persona" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Soul</p>
                  <h3>Persona instructions</h3>
                </div>
                <div className="badge-row">
                  <span className={`pill${personaEditable ? "" : " off"}`}>
                    {personaEditable ? "Provider control plane" : "Select runtime"}
                  </span>
                  {personaLoading && <span className="pill">Loading…</span>}
                  {personaSaving && <span className="pill">Saving…</span>}
                  {!personaSaving && !personaDirty && personaSavedAt && (
                    <span className="pill">
                      Saved {formatEpochTimestamp(personaSavedAt) ?? "just now"}
                    </span>
                  )}
                </div>
              </div>
              <p className="workspace-copy">
                Runtime-scoped persona instructions stored in the Cubecloud shell control plane. Define operator tone, constraints, escalation posture, and what the active lane should optimize for here.
              </p>
              {personaEditable ? (
                <>
                  <label className="persona-editor-label" htmlFor="persona-soul-editor">
                    SOUL.md
                  </label>
                  <textarea
                    id="persona-soul-editor"
                    className="persona-editor"
                    value={personaDraft}
                    onChange={(event) => {
                      setPersonaDraft(event.target.value);
                      setPersonaDirty(true);
                      setPersonaError(null);
                    }}
                    placeholder="Write the operator persona and behavioral constraints for this lane."
                  />
                  <p className={`persona-editor-status${personaError ? " error" : ""}`}>
                    {personaError ??
                      "Autosaves after a short pause. Reset restores the default lane soul template."}
                  </p>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      disabled={personaSaving}
                      onClick={() => void handleResetPersona()}
                    >
                      Reset to default soul
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("agents")}
                    >
                      Open profiles
                    </button>
                  </div>
                </>
              ) : (
                <div className="view-empty-state">
                  <p>
                    Select a runtime provider before editing its shell-owned SOUL.md control-plane instructions.
                  </p>
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel persona-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Active posture</p>
                  <h3>{activeProfile?.name ?? "Awaiting profile context"}</h3>
                </div>
                <div className="badge-row">
                  {personaBadges.map((badge) => (
                    <span key={badge} className="pill">{badge}</span>
                  ))}
                </div>
              </div>
              <p className="persona-summary">{personaSummary}</p>
              <div className="persona-metric-grid">
                {personaMetrics.map((metric) => (
                  <div key={metric.label} className="persona-metric">
                    <strong>{metric.value}</strong>
                    <span>{metric.label}</span>
                  </div>
                ))}
              </div>
              <div className="operator-field-grid">
                <div className="operator-field">
                  <span>Runtime lane</span>
                  <strong>{selectedRuntimeProvider?.displayName ?? "Not selected"}</strong>
                </div>
                <div className="operator-field">
                  <span>Surface mode</span>
                  <strong>
                    {selectedRuntimeProvider?.surfaceMode
                      ? resolveSurfaceModeLabel(selectedRuntimeProvider.surfaceMode)
                      : "Not mounted"}
                  </strong>
                </div>
                <div className="operator-field operator-field-span-2">
                  <span>Allowed connection modes</span>
                  <strong>
                    {selectedRuntimeProvider?.connectionModes.length
                      ? selectedRuntimeProvider.connectionModes
                          .map((mode) => resolveSurfaceModeLabel(mode))
                          .join(", ")
                      : "No runtime selected"}
                  </strong>
                </div>
              </div>
              <div className="detail-block">
                <strong>Operator focus</strong>
                <div className="persona-action-list persona-action-stack">
                  {(personaActions.length > 0
                    ? personaActions
                    : [
                        "Persona lane is hydrated. Continue with models, providers, tools, memory, and schedules to keep the local runtime coherent.",
                      ]).map((action) => (
                    <div key={action} className="persona-action-item">
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </section>
        )}

        {/* ── Kanban ────────────────────────────────────────────────────── */}
        {activeView === "kanban" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Tasks</p>
                  <h3>{selectedKanbanBoard?.name ?? "Task board"}</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">{kanbanTasks.length} tasks</span>
                  <span className="pill">{kanbanBoards.length} boards</span>
                  {kanbanBoards.map((b) => (
                    <button
                      key={b.slug}
                      className={`ghost-button${b.slug === activeKanbanBoard ? " active" : ""}`}
                      onClick={() => {
                        void handleKanbanBoardSwitch(b.slug, agentSurfaceUrl ?? "");
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                  {personaEditable && (
                    <button
                      className="toggle-button enabled"
                      onClick={() => handleStartNewKanbanBoardDraft()}
                    >
                      New board
                    </button>
                  )}
                </div>
              </div>
              <p className="workspace-copy">
                {selectedKanbanBoard?.description
                  ? `${selectedKanbanBoard.description} Keep active work visible here instead of scattering it across chat, sessions, and scratch notes.`
                  : "Provider-scoped Kanban state in the Cubecloud control plane. Keep active work visible here instead of scattering it across chat, sessions, and scratch notes."}
              </p>
              {kanbanTasks.length === 0 ? (
                <div className="view-empty-state">
                  <p>{selectedRuntimeProvider ? "No tasks on this control board yet." : "Select a runtime to load tasks."}</p>
                  {personaEditable && (
                    <button
                      className="toggle-button enabled"
                      onClick={() => handleStartNewKanbanTaskDraft()}
                    >
                      New task
                    </button>
                  )}
                </div>
              ) : (
                <div className="kanban-board">
                  {KANBAN_STATUSES.map((status) => {
                    const columnTasks = kanbanTasks.filter((t) => t.status === status);
                    return (
                      <div key={status} className="kanban-col">
                        <div className="kanban-col-header">
                          <span className="kanban-col-title">{status}</span>
                          <span className="kanban-col-count">{columnTasks.length}</span>
                        </div>
                        {columnTasks.map((task) => (
                          <button
                            key={task.id}
                            className={`kanban-task-card${selectedKanbanTask?.id === task.id ? " selected" : ""}`}
                            onClick={() => handleSelectKanbanTask(task.id)}
                          >
                            <p className="kanban-task-title">{task.title}</p>
                            {task.body && (
                              <p className="kanban-task-body">{task.body}</p>
                            )}
                            <div className="badge-row">
                              <span className="badge">P{task.priority}</span>
                              {task.assignee && <span className="badge">{task.assignee}</span>}
                            </div>
                            {(task.skills ?? []).length > 0 && (
                              <div className="badge-row">
                                {(task.skills ?? []).slice(0, 3).map((sk) => (
                                  <span key={sk} className="badge">{sk}</span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Board editor</p>
                  <h3>{selectedKanbanBoard?.name ?? (personaEditable ? "Create board" : "No board selected")}</h3>
                </div>
                {selectedKanbanBoard && (
                  <div className="badge-row">
                    <span className="pill">{selectedKanbanBoard.total} tasks</span>
                  </div>
                )}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={kanbanBoardDraft.name}
                        onChange={(event) =>
                          setKanbanBoardDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Operations"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Description</span>
                      <textarea
                        className="operator-textarea"
                        value={kanbanBoardDraft.description}
                        onChange={(event) =>
                          setKanbanBoardDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Describe what this board is tracking for the active runtime lane."
                      />
                    </label>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Selected board</span>
                      <strong>{selectedKanbanBoard?.slug ?? "New draft"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Boards saved</span>
                      <strong>{kanbanBoards.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Current lane</span>
                      <strong>{selectedRuntimeProvider?.displayName ?? "No runtime lane selected"}</strong>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      disabled={!kanbanBoardDraftValid}
                      onClick={() => void handleCreateKanbanBoard()}
                    >
                      Save new board
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedKanbanBoard || !kanbanBoardDraftValid}
                      onClick={() => void handleUpdateKanbanBoard()}
                    >
                      Update selected board
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewKanbanBoardDraft()}
                    >
                      New board draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedKanbanBoard || kanbanBoards.length <= 1}
                      onClick={() => void handleDeleteKanbanBoard()}
                    >
                      Delete selected board
                    </button>
                  </div>
                </>
              ) : selectedKanbanBoard ? (
                <div className="detail-block">
                  <strong>{selectedKanbanBoard.name}</strong>
                  <p>{selectedKanbanBoard.description ?? "No board description recorded yet."}</p>
                </div>
              ) : null}
              <div className="detail-block">
                <strong>Board behavior</strong>
                <p>
                  Boards are provider-scoped operator lanes in the shell control plane. Creating a new board makes it current, renaming preserves its tasks, and deleting removes its task set from this runtime lane.
                </p>
              </div>
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Task editor</p>
                  <h3>{selectedKanbanTask?.title ?? (personaEditable ? "Create task" : "No task selected")}</h3>
                </div>
                {selectedKanbanTask && (
                  <div className="badge-row">
                    <span className="pill">{selectedKanbanTask.status}</span>
                    <span className="pill">P{selectedKanbanTask.priority}</span>
                  </div>
                )}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Title</span>
                      <input
                        className="operator-input"
                        value={kanbanTaskDraft.title}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Capture the next operator task"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Status</span>
                      <select
                        className="operator-input"
                        value={kanbanTaskDraft.status}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            status: event.target.value as (typeof KANBAN_STATUSES)[number],
                          }))
                        }
                      >
                        {KANBAN_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="operator-input-group">
                      <span>Priority</span>
                      <select
                        className="operator-input"
                        value={String(kanbanTaskDraft.priority)}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            priority: Number(event.target.value),
                          }))
                        }
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                    </label>
                    <label className="operator-input-group">
                      <span>Assignee</span>
                      <input
                        className="operator-input"
                        value={kanbanTaskDraft.assignee}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            assignee: event.target.value,
                          }))
                        }
                        placeholder="ops"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Skills</span>
                      <input
                        className="operator-input"
                        value={kanbanTaskDraft.skillsText}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            skillsText: event.target.value,
                          }))
                        }
                        placeholder="incident-review, release-audit"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Body</span>
                      <textarea
                        className="operator-textarea"
                        value={kanbanTaskDraft.body}
                        onChange={(event) =>
                          setKanbanTaskDraft((current) => ({
                            ...current,
                            body: event.target.value,
                          }))
                        }
                        placeholder="Add the operator context, blockers, or delivery notes for this task."
                      />
                    </label>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Board</span>
                      <strong>{selectedKanbanBoard?.name ?? "Not selected"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Visible tasks</span>
                      <strong>{kanbanTasks.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Parsed skills</span>
                      <strong>
                        {parseCommaSeparatedValues(kanbanTaskDraft.skillsText).join(", ") || "None"}
                      </strong>
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>Task behavior</strong>
                    <p>
                      Tasks stay scoped to the active runtime provider. Status changes update the shell-owned task timeline so queued, active, completed, and failed work stays visible in one board.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      disabled={!kanbanTaskDraft.title.trim()}
                      onClick={() => void handleCreateKanbanTask()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedKanbanTask || !kanbanTaskDraft.title.trim()}
                      onClick={() => void handleUpdateKanbanTask()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewKanbanTaskDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedKanbanTask}
                      onClick={() => void handleDeleteKanbanTask()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedKanbanTask ? (
                <>
                  <p className="detail-copy">{selectedKanbanTask.body ?? "No task notes recorded yet."}</p>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Status</span>
                      <strong>{selectedKanbanTask.status}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Priority</span>
                      <strong>P{selectedKanbanTask.priority}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Assignee</span>
                      <strong>{selectedKanbanTask.assignee ?? "Unassigned"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Skills</span>
                      <strong>{selectedKanbanTask.skills.join(", ") || "None"}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a task to inspect or edit its board state.</p>
              )}
            </article>
          </section>
        )}

        {/* ── CodeGraph ─────────────────────────────────────────────────── */}
        {activeView === "codegraph" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Code intelligence</p>
                  <h3>CodeGraph</h3>
                </div>
                <div className="badge-row">
                  {codegraphApp && <span className="pill">{codegraphApp.enabled ? "Enabled" : "Disabled"}</span>}
                  {codegraphSurface && <span className="pill">{titleCaseWords(codegraphSurface.mode)}</span>}
                </div>
              </div>
              <p className="workspace-copy">
                This is the shell-owned CodeGraph control surface. The shell now holds the saved endpoint, mode, and app enablement state here instead of only showing a passive runtime handoff message.
              </p>
              {codegraphApp ? (
                <>
                  <div className="badge-row">
                    <span className="badge">{KIND_LABELS[codegraphApp.kind]}</span>
                    <span className="badge">{INTEGRATION_LABELS[codegraphApp.integration]}</span>
                    <span className="badge">{titleCaseWords(codegraphApp.status)}</span>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Saved URL</span>
                      <strong>{codegraphSurface?.url ?? "Not configured"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Linked lane</span>
                      <strong>{codegraphLinkedProvider?.displayName ?? "No runtime lane linked"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Source</span>
                      <strong>{codegraphApp.source}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Capabilities</span>
                      <strong>{codegraphApp.capabilityIds.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Tagline</span>
                      <strong>{codegraphApp.tagline}</strong>
                    </div>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Saved repos</span>
                      <strong>{codegraphRepos.length}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Entrypoints</span>
                      <strong>{codegraphEntrypoints.length}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Common queries</span>
                      <strong>{codegraphQueries.length}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Selected repo</span>
                      <strong>{selectedCodeGraphRepo?.name ?? "None"}</strong>
                    </div>
                  </div>
                  {codegraphRepos.length > 0 ? (
                    <div className="detail-block">
                      <strong>Saved repos</strong>
                      <div className="operator-list">
                        {codegraphRepos.map((repo) => (
                          <button
                            key={repo.id}
                            className={`operator-list-item ${selectedCodeGraphRepo?.id === repo.id ? "selected" : ""}`}
                            onClick={() => void handleSelectCodeGraphRepo(repo.id)}
                          >
                            <div className="operator-list-topline">
                              <strong>{repo.name}</strong>
                              <div className="badge-row">
                                {repo.selected && <span className="badge">Current</span>}
                                <span className={`badge ${repo.initialized ? "success" : ""}`}>
                                  {repo.initialized ? "Indexed" : repo.exists ? "Uninitialized" : "Missing"}
                                </span>
                              </div>
                            </div>
                            <p className="operator-list-copy">{repo.repoPath}</p>
                            <small className="verification-evidence">
                              {repo.detectedFrameworks.length > 0
                                ? repo.detectedFrameworks.join(", ")
                                : "No framework metadata yet"}
                              {repo.fileCount != null && repo.nodeCount != null && repo.edgeCount != null
                                ? ` · ${repo.fileCount} files · ${repo.nodeCount} nodes · ${repo.edgeCount} edges`
                                : ""}
                            </small>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="detail-block">
                      <strong>Saved repos</strong>
                      <p>Register local repositories here so CodeGraph keeps persistent operator context beyond just a host and port.</p>
                    </div>
                  )}
                  <div className="detail-block">
                    <strong>What this holds</strong>
                    <p>
                      CodeGraph now holds real shell-owned surface state here: the saved host, port, path, protocol, mode, enablement toggle, repo registry, entrypoints, and reusable graph queries. The graph service itself can still be separate, but the shell owns how this lane reaches it and what operator context it keeps.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleToggleApp("codegraph", !codegraphApp.enabled)}
                    >
                      {codegraphApp.enabled ? "Disable surface" : "Enable surface"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!codegraphApp.enabled || !codegraphSurface?.url}
                      onClick={() => void handleOpenRuntimeSurface("codegraph")}
                    >
                      Open surface
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleInspectApp("codegraph")}
                    >
                      Open app settings
                    </button>
                  </div>
                </>
              ) : (
                <div className="view-empty-state">
                  <p>CodeGraph is not registered in the current app catalog.</p>
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Surface config</p>
                  <h3>{codegraphSurface?.url ?? "Configure CodeGraph"}</h3>
                </div>
                {codegraphLinkedProvider && (
                  <div className="badge-row">
                    <span className="pill">{codegraphLinkedProvider.displayName}</span>
                  </div>
                )}
              </div>
              {codegraphSurface ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Mode</span>
                      <select
                        className="operator-input"
                        value={codegraphSurfaceDraft.mode}
                        onChange={(event) =>
                          setCodegraphSurfaceDraft((current) => ({
                            ...current,
                            mode: event.target.value as PlatformRuntimeSurfaceMode,
                          }))
                        }
                      >
                        <option value="desktop">Desktop</option>
                        <option value="docker">Docker</option>
                        <option value="remote">Remote</option>
                      </select>
                    </label>
                    <label className="operator-input-group">
                      <span>Protocol</span>
                      <select
                        className="operator-input"
                        value={codegraphSurfaceDraft.protocol}
                        onChange={(event) =>
                          setCodegraphSurfaceDraft((current) => ({
                            ...current,
                            protocol: event.target.value as PlatformSurfaceProtocol,
                          }))
                        }
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                      </select>
                    </label>
                    <label className="operator-input-group">
                      <span>Host</span>
                      <input
                        className="operator-input"
                        value={codegraphSurfaceDraft.host}
                        onChange={(event) =>
                          setCodegraphSurfaceDraft((current) => ({
                            ...current,
                            host: event.target.value,
                          }))
                        }
                        placeholder="127.0.0.1"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Port</span>
                      <input
                        className="operator-input"
                        type="number"
                        min={1}
                        value={codegraphSurfaceDraft.port}
                        onChange={(event) =>
                          setCodegraphSurfaceDraft((current) => ({
                            ...current,
                            port: event.target.value,
                          }))
                        }
                        placeholder="3000"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Path</span>
                      <input
                        className="operator-input"
                        value={codegraphSurfaceDraft.path}
                        onChange={(event) =>
                          setCodegraphSurfaceDraft((current) => ({
                            ...current,
                            path: event.target.value,
                          }))
                        }
                        placeholder="/"
                      />
                    </label>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Current URL</span>
                      <strong>{codegraphSurface.url ?? "Not configured"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>App enabled</span>
                      <strong>{codegraphApp?.enabled ? "Yes" : "No"}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Runtime handoff</span>
                      <strong>{agentSurfaceUrl ?? "No active runtime surface connected"}</strong>
                    </div>
                  </div>
                  {!codegraphPortValid && (
                    <div className="detail-block">
                      <strong>Port validation</strong>
                      <p>Use a positive port number or leave the field empty when the surface does not require one.</p>
                    </div>
                  )}
                  <div className="detail-block">
                    <strong>Surface behavior</strong>
                    <p>
                      This editor changes the shell-owned CodeGraph endpoint directly. It does not fabricate code intelligence itself; it controls how the shell reaches the real CodeGraph surface for this workspace.
                    </p>
                  </div>
                  <div className="detail-block">
                    <strong>Repo registry</strong>
                    <div className="operator-input-grid">
                      <label className="operator-input-group">
                        <span>Name</span>
                        <input
                          className="operator-input"
                          value={codegraphRepoDraft.name}
                          onChange={(event) =>
                            setCodegraphRepoDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Cubecloud shell"
                        />
                      </label>
                      <label className="operator-input-group">
                        <span>Repo path</span>
                        <input
                          className="operator-input"
                          value={codegraphRepoDraft.repoPath}
                          onChange={(event) =>
                            setCodegraphRepoDraft((current) => ({
                              ...current,
                              repoPath: event.target.value,
                            }))
                          }
                          placeholder="D:\\users\\joeyzh\\github-pr\\cubecloud-agentic-os"
                        />
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Description</span>
                        <textarea
                          className="operator-textarea"
                          value={codegraphRepoDraft.description}
                          onChange={(event) =>
                            setCodegraphRepoDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="What this repo is for and why it matters to the operator."
                        />
                      </label>
                    </div>
                    <div className="registry-footer mission-actions">
                      <button
                        className={`toggle-button${codegraphRepoDraft.selected ? " enabled" : ""}`}
                        onClick={() =>
                          setCodegraphRepoDraft((current) => ({
                            ...current,
                            selected: !current.selected,
                          }))
                        }
                      >
                        {codegraphRepoDraft.selected ? "Current on save" : "Mark current"}
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!codegraphRepoDraftValid}
                        onClick={() => void handleCreateCodeGraphRepo()}
                      >
                        Save repo
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphRepo || !codegraphRepoDraftValid}
                        onClick={() => void handleUpdateCodeGraphRepo()}
                      >
                        Update repo
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => handleStartNewCodeGraphRepoDraft()}
                      >
                        New repo draft
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphRepo}
                        onClick={() => void handleInitializeCodeGraphRepo()}
                      >
                        Initialize graph
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphRepo?.initialized}
                        onClick={() => void handleSyncCodeGraphRepo()}
                      >
                        Sync index
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphRepo}
                        onClick={() => void handleDeleteCodeGraphRepo()}
                      >
                        Delete repo
                      </button>
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>Entrypoints</strong>
                    {visibleCodeGraphEntrypoints.length > 0 ? (
                      <div className="operator-list">
                        {visibleCodeGraphEntrypoints.map((entrypoint) => (
                          <button
                            key={entrypoint.id}
                            className={`operator-list-item ${selectedCodeGraphEntrypoint?.id === entrypoint.id ? "selected" : ""}`}
                            onClick={() => handleSelectCodeGraphEntrypoint(entrypoint.id)}
                          >
                            <div className="operator-list-topline">
                              <strong>{entrypoint.name}</strong>
                              <span className="badge">
                                {codegraphRepos.find((repo) => repo.id === entrypoint.repoId)?.name ?? "Repo"}
                              </span>
                            </div>
                            <p className="operator-list-copy">{entrypoint.target}</p>
                            <small className="verification-evidence">{entrypoint.notes || "No notes"}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="detail-copy">Save stable entrypoints here so operators and agents can jump back to known workflow anchors.</p>
                    )}
                    <div className="operator-input-grid">
                      <label className="operator-input-group">
                        <span>Repo</span>
                        <select
                          className="operator-input"
                          value={codegraphEntrypointDraft.repoId}
                          onChange={(event) =>
                            setCodegraphEntrypointDraft((current) => ({
                              ...current,
                              repoId: event.target.value,
                            }))
                          }
                        >
                          <option value="" disabled>
                            {codegraphRepoOptions.length > 0 ? "Select repo" : "Save a repo first"}
                          </option>
                          {codegraphRepoOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="operator-input-group">
                        <span>Name</span>
                        <input
                          className="operator-input"
                          value={codegraphEntrypointDraft.name}
                          onChange={(event) =>
                            setCodegraphEntrypointDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="API bootstrap"
                        />
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Target</span>
                        <input
                          className="operator-input"
                          value={codegraphEntrypointDraft.target}
                          onChange={(event) =>
                            setCodegraphEntrypointDraft((current) => ({
                              ...current,
                              target: event.target.value,
                            }))
                          }
                          placeholder="src/main/index.ts:createWindow"
                        />
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Notes</span>
                        <textarea
                          className="operator-textarea"
                          value={codegraphEntrypointDraft.notes}
                          onChange={(event) =>
                            setCodegraphEntrypointDraft((current) => ({
                              ...current,
                              notes: event.target.value,
                            }))
                          }
                          placeholder="Why this entrypoint matters during triage or workflow analysis."
                        />
                      </label>
                    </div>
                    <div className="registry-footer mission-actions">
                      <button
                        className="ghost-button"
                        disabled={!codegraphEntrypointDraftValid}
                        onClick={() => void handleCreateCodeGraphEntrypoint()}
                      >
                        Save entrypoint
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphEntrypoint || !codegraphEntrypointDraftValid}
                        onClick={() => void handleUpdateCodeGraphEntrypoint()}
                      >
                        Update entrypoint
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => handleStartNewCodeGraphEntrypointDraft()}
                      >
                        New entrypoint
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphEntrypoint}
                        onClick={() => void handleDeleteCodeGraphEntrypoint()}
                      >
                        Delete entrypoint
                      </button>
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>Graph queries</strong>
                    {visibleCodeGraphQueries.length > 0 ? (
                      <div className="operator-list">
                        {visibleCodeGraphQueries.map((query) => (
                          <button
                            key={query.id}
                            className={`operator-list-item ${selectedCodeGraphQuery?.id === query.id ? "selected" : ""}`}
                            onClick={() => handleSelectCodeGraphQuery(query.id)}
                          >
                            <div className="operator-list-topline">
                              <strong>{query.name}</strong>
                              <div className="badge-row">
                                <span className="badge">{titleCaseWords(query.mode)}</span>
                                <span className="badge">{query.repoId ? "Repo" : "Global"}</span>
                              </div>
                            </div>
                            <p className="operator-list-copy">{query.query}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="detail-copy">Save the recurring graph questions you want operators and agents to reuse across runs.</p>
                    )}
                    <div className="operator-input-grid">
                      <label className="operator-input-group">
                        <span>Scope</span>
                        <select
                          className="operator-input"
                          value={codegraphQueryDraft.repoId}
                          onChange={(event) =>
                            setCodegraphQueryDraft((current) => ({
                              ...current,
                              repoId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Global query</option>
                          {codegraphRepoOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="operator-input-group">
                        <span>Mode</span>
                        <select
                          className="operator-input"
                          value={codegraphQueryDraft.mode}
                          onChange={(event) =>
                            setCodegraphQueryDraft((current) => ({
                              ...current,
                              mode: event.target.value as CodeGraphQueryTemplate["mode"],
                            }))
                          }
                        >
                          <option value="workflow">Workflow</option>
                          <option value="context">Context</option>
                          <option value="impact">Impact</option>
                          <option value="search">Search</option>
                        </select>
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Name</span>
                        <input
                          className="operator-input"
                          value={codegraphQueryDraft.name}
                          onChange={(event) =>
                            setCodegraphQueryDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Routing manifest"
                        />
                      </label>
                      <label className="operator-input-group operator-input-group-span-2">
                        <span>Query</span>
                        <textarea
                          className="operator-textarea operator-textarea-lg"
                          value={codegraphQueryDraft.query}
                          onChange={(event) =>
                            setCodegraphQueryDraft((current) => ({
                              ...current,
                              query: event.target.value,
                            }))
                          }
                          placeholder="Summarize routing, main entrypoints, and impacted workflows for this repo."
                        />
                      </label>
                    </div>
                    <div className="registry-footer mission-actions">
                      <button
                        className="ghost-button"
                        disabled={!codegraphQueryDraftValid}
                        onClick={() => void handleCreateCodeGraphQuery()}
                      >
                        Save query
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphQuery || !codegraphQueryDraftValid}
                        onClick={() => void handleUpdateCodeGraphQuery()}
                      >
                        Update query
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => handleStartNewCodeGraphQueryDraft()}
                      >
                        New query
                      </button>
                      <button
                        className="ghost-button"
                        disabled={!selectedCodeGraphQuery}
                        onClick={() => void handleDeleteCodeGraphQuery()}
                      >
                        Delete query
                      </button>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      disabled={!codegraphDraftValid || !codegraphDraftDirty}
                      onClick={() => void handleSaveCodegraphSurfaceConfig()}
                    >
                      Save config
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!codegraphDraftDirty}
                      onClick={() => handleResetCodegraphSurfaceDraft()}
                    >
                      Reset draft
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("gateway")}
                    >
                      Open Gateway
                    </button>
                  </div>
                </>
              ) : (
                <div className="view-empty-state">
                  <p>No saved CodeGraph surface descriptor is available in this shell state.</p>
                </div>
              )}
            </article>
          </section>
        )}

        {activeView === "everos" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Memory operating system</p>
                  <h3>EverOS</h3>
                </div>
                <div className="badge-row">
                  {everosApp && <span className="pill">{everosApp.enabled ? "Enabled" : "Disabled"}</span>}
                  {everosSurface && <span className="pill">{titleCaseWords(everosSurface.mode)}</span>}
                </div>
              </div>
              <p className="workspace-copy">
                This surface keeps shell-owned EverOS harness state: persistent memory namespaces, linked schedules, profile bindings, and loop prompts for EverCore-backed workflows.
              </p>
              {everosApp ? (
                <>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Saved URL</span>
                      <strong>{everosSurface?.url ?? "Not configured"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Linked lane</span>
                      <strong>{everosLinkedProvider?.displayName ?? "No runtime lane linked"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Source</span>
                      <strong>{everosApp.source}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Harnesses</span>
                      <strong>{everosHarnesses.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Tagline</span>
                      <strong>{everosApp.tagline}</strong>
                    </div>
                  </div>
                  {everosHarnesses.length > 0 ? (
                    <div className="operator-list">
                      {everosHarnesses.map((harness) => (
                        <button
                          key={harness.id}
                          className={`operator-list-item ${selectedEverOsHarness?.id === harness.id ? "selected" : ""}`}
                          onClick={() => handleSelectEverOsHarness(harness.id)}
                        >
                          <div className="operator-list-topline">
                            <strong>{harness.name}</strong>
                            <span className={`badge ${harness.enabled ? "success" : ""}`}>
                              {harness.enabled ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                          <p className="operator-list-copy">
                            {harness.memoryNamespace} &middot; {harness.profile}
                          </p>
                          <small className="verification-evidence">
                            {harness.scheduleId
                              ? schedules.find((schedule) => schedule.id === harness.scheduleId)?.name ?? harness.scheduleId
                              : "Manual loop"}
                          </small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="detail-block">
                      <strong>No harnesses yet</strong>
                      <p>Save harness definitions here to pin memory namespaces and loop prompts to concrete schedules or operator profiles.</p>
                    </div>
                  )}
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleToggleApp("everos", !everosApp.enabled)}
                    >
                      {everosApp.enabled ? "Disable surface" : "Enable surface"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!everosApp.enabled || !everosSurface?.url}
                      onClick={() => void handleOpenRuntimeSurface("everos")}
                    >
                      Open surface
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleInspectApp("everos")}
                    >
                      Open app settings
                    </button>
                  </div>
                </>
              ) : (
                <div className="view-empty-state">
                  <p>EverOS is not registered in the current app catalog.</p>
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Harness editor</p>
                  <h3>{selectedEverOsHarness?.name ?? "Create EverOS harness"}</h3>
                </div>
                {selectedEverOsHarness && (
                  <span className={`pill${selectedEverOsHarness.enabled ? "" : " off"}`}>
                    {selectedEverOsHarness.enabled ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
              <div className="operator-input-grid">
                <label className="operator-input-group">
                  <span>Name</span>
                  <input
                    className="operator-input"
                    value={everosHarnessDraft.name}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="operator-memory-loop"
                  />
                </label>
                <label className="operator-input-group">
                  <span>Memory namespace</span>
                  <input
                    className="operator-input"
                    value={everosHarnessDraft.memoryNamespace}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        memoryNamespace: event.target.value,
                      }))
                    }
                    placeholder="cubecloud-ops"
                  />
                </label>
                <label className="operator-input-group">
                  <span>Profile</span>
                  <select
                    className="operator-input"
                    value={everosHarnessDraft.profile}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        profile: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select profile</option>
                    {scheduleProfileOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="operator-input-group">
                  <span>Schedule</span>
                  <select
                    className="operator-input"
                    value={everosHarnessDraft.scheduleId}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        scheduleId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Manual loop only</option>
                    {scheduleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="operator-input-group operator-input-group-span-2">
                  <span>Description</span>
                  <textarea
                    className="operator-textarea"
                    value={everosHarnessDraft.description}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What this harness persists and when the operator should use it."
                  />
                </label>
                <label className="operator-input-group operator-input-group-span-2">
                  <span>Loop prompt</span>
                  <textarea
                    className="operator-textarea operator-textarea-lg"
                    value={everosHarnessDraft.loopPrompt}
                    onChange={(event) =>
                      setEverOsHarnessDraft((current) => ({
                        ...current,
                        loopPrompt: event.target.value,
                      }))
                    }
                    placeholder="Review the memory namespace, capture fresh operator context, and propose the next loop iteration."
                  />
                </label>
              </div>
              <div className="operator-field-grid">
                <div className="operator-field">
                  <span>Surface URL</span>
                  <strong>{everosSurface?.url ?? "Not configured"}</strong>
                </div>
                <div className="operator-field">
                  <span>Linked lane</span>
                  <strong>{everosLinkedProvider?.displayName ?? "No runtime lane linked"}</strong>
                </div>
                <div className="operator-field operator-field-span-2">
                  <span>Bound schedule</span>
                  <strong>
                    {schedules.find((schedule) => schedule.id === everosHarnessDraft.scheduleId)?.name ??
                      "Manual loop"}
                  </strong>
                </div>
              </div>
              <div className="detail-block">
                <strong>Harness behavior</strong>
                <p>
                  EverOS harnesses let the shell keep durable memory and loop definitions separate from transient runtime chat. Bind them to a profile and optional schedule when you want repeated memory work to stay explicit and reviewable.
                </p>
              </div>
              <div className="registry-footer mission-actions">
                <button
                  className={`toggle-button${everosHarnessDraft.enabled ? " enabled" : ""}`}
                  onClick={() =>
                    setEverOsHarnessDraft((current) => ({
                      ...current,
                      enabled: !current.enabled,
                    }))
                  }
                >
                  {everosHarnessDraft.enabled ? "Enabled on save" : "Enable harness"}
                </button>
                <button
                  className="ghost-button"
                  disabled={!everosHarnessDraftValid}
                  onClick={() => void handleCreateEverOsHarness()}
                >
                  Save new
                </button>
                <button
                  className="ghost-button"
                  disabled={!selectedEverOsHarness || !everosHarnessDraftValid}
                  onClick={() => void handleUpdateEverOsHarness()}
                >
                  Update selected
                </button>
                <button
                  className="ghost-button"
                  onClick={() => handleStartNewEverOsHarnessDraft()}
                >
                  New draft
                </button>
                <button
                  className="ghost-button"
                  disabled={!selectedEverOsHarness}
                  onClick={() =>
                    void handleSetEverOsHarnessEnabled(
                      selectedEverOsHarness ? !selectedEverOsHarness.enabled : false,
                    )
                  }
                >
                  {selectedEverOsHarness?.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  className="ghost-button"
                  disabled={!selectedEverOsHarness}
                  onClick={() => void handleDeleteEverOsHarness()}
                >
                  Delete selected
                </button>
                <button
                  className="ghost-button"
                  onClick={() => void handleViewChange("gateway")}
                >
                  Open Gateway
                </button>
              </div>
            </article>
          </section>
        )}

        {/* ── Models ────────────────────────────────────────────────────── */}
        {activeView === "models" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Model library</p>
                  <h3>Model endpoints</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">{filteredModels.length} visible</span>
                  <span className="pill">{models.length} saved</span>
                  <span className="pill">{new Set(models.map((model) => model.provider)).size} providers</span>
                </div>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Search the saved library, add a model from a provider probe, and keep provider badges explicit like the runtime selector in chat."
                  : "Inspect the saved model inventory for the selected runtime provider and check which endpoint should back the active persona."}
              </p>
              <div className="model-library-toolbar">
                <label className="model-search-field">
                  <span className="sr-only">Search models</span>
                  <input
                    className="operator-input"
                    value={modelSearchQuery}
                    onChange={(event) => setModelSearchQuery(event.target.value)}
                    placeholder="Search models..."
                  />
                </label>
                {personaEditable && (
                  <button
                    className="toggle-button enabled"
                    onClick={() => handleStartNewModelDraft()}
                  >
                    Add model
                  </button>
                )}
              </div>
              {models.length === 0 ? (
                <div className="view-empty-state">
                  <p>
                    {personaEditable
                      ? "No model endpoints configured yet. Save one from a provider probe or create it manually here."
                      : agentSurfaceUrl
                        ? "No model endpoints configured."
                        : "Connect a runtime to view models."}
                  </p>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="view-empty-state">
                  <p>No saved models match the current search.</p>
                </div>
              ) : (
                <div className="model-library-grid">
                  {filteredModels.map((model) => {
                    const preset = getProviderPreset(model.provider);

                    return (
                      <button
                        key={model.id}
                        className={`model-library-card ${selectedModel?.id === model.id ? "selected" : ""}`}
                        onClick={() => setSelectedModelId(model.id)}
                      >
                        <div className="model-library-card-topline">
                          <div className="model-library-card-brand">
                            <span className={`registry-avatar registry-avatar-${preset?.category ?? "byok"}`}>
                              {buildMonogram(preset?.name ?? model.provider)}
                            </span>
                            <div>
                              <strong>{model.name}</strong>
                              <p className="operator-list-copy">{model.model}</p>
                            </div>
                          </div>
                          <span className="badge">{preset?.name ?? model.provider}</span>
                        </div>
                        <div className="badge-row">
                          <span className="chip">{model.provider}</span>
                          <span className="chip">Saved {formatEpochTimestamp(model.createdAt) ?? "now"}</span>
                        </div>
                        <small className="verification-evidence">{summarizeEndpoint(model.baseUrl)}</small>
                      </button>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Model editor</p>
                  <h3>{selectedModel?.name ?? (personaEditable ? "Create model endpoint" : "No model selected")}</h3>
                </div>
                {selectedModel && <span className="pill">{selectedModel.provider}</span>}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={modelDraft.name}
                        onChange={(event) =>
                          setModelDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Primary lane model"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Provider</span>
                      <input
                        className="operator-input"
                        value={modelDraft.provider}
                        onChange={(event) =>
                          setModelDraft((current) => ({
                            ...current,
                            provider: event.target.value,
                          }))
                        }
                        placeholder="openai"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Model ID</span>
                      <input
                        className="operator-input"
                        value={modelDraft.model}
                        onChange={(event) =>
                          setModelDraft((current) => ({
                            ...current,
                            model: event.target.value,
                          }))
                        }
                        placeholder="gpt-4.1"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Base URL</span>
                      <input
                        className="operator-input"
                        value={modelDraft.baseUrl}
                        onChange={(event) =>
                          setModelDraft((current) => ({
                            ...current,
                            baseUrl: event.target.value,
                          }))
                        }
                        placeholder="https://api.example.com/v1"
                      />
                    </label>
                  </div>
                  <div className="detail-block">
                    <strong>Library behavior</strong>
                    <p>
                      Agent Desktop saves model endpoints into the selected provider control plane so the chat selector, persona, and provider probe all refer to the same library.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => void handleCreateModel()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedModel}
                      onClick={() => void handleUpdateModel()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewModelDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedModel}
                      onClick={() => void handleDeleteModel()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedModel ? (
                <>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Model ID</span>
                      <strong>{selectedModel.model}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Created</span>
                      <strong>{formatEpochTimestamp(selectedModel.createdAt) ?? "Unknown"}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Base URL</span>
                      <strong>{selectedModel.baseUrl}</strong>
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>Provider alignment</strong>
                    <p>
                      {providers.some(
                        (provider) =>
                          provider.type === selectedModel.provider || provider.name === selectedModel.provider,
                      )
                        ? "A matching provider configuration exists for this endpoint."
                        : "No matching provider record was loaded for this endpoint yet."}
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        const providerMatch = providers.find(
                          (provider) =>
                            provider.type === selectedModel.provider ||
                            provider.name === selectedModel.provider,
                        );
                        if (providerMatch) {
                          handleSelectProvider(providerMatch.id);
                        }
                        void handleViewChange("providers");
                      }}
                    >
                      Inspect provider
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("gateway")}
                    >
                      Open Gateway
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a model endpoint to inspect its provider and runtime fit.</p>
              )}
            </article>
          </section>
        )}

        {/* ── Providers ─────────────────────────────────────────────────── */}
        {activeView === "providers" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Provider onboarding</p>
                  <h3>Provider connections</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">{providers.length} providers</span>
                  <span className="pill">{providers.filter((provider) => provider.apiKey).length} keys configured</span>
                  <span className="pill">{providers.filter((provider) => provider.baseUrl).length} custom URLs</span>
                </div>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Use a local, BYOK, or CLI preset, then keep each saved connection probeable and aligned with the model library."
                  : "Provider inventory from the active runtime. This is the place to check base URLs, credential presence, and which models are backed by each provider."}
              </p>
              {providers.length > 0 && (
                <div className="provider-saved-grid">
                  {providers.map((provider) => {
                    const preset = getProviderPreset(provider.type);

                    return (
                      <button
                        key={provider.id}
                        className={`provider-saved-card ${selectedProvider?.id === provider.id ? "selected" : ""}`}
                        onClick={() => handleSelectProvider(provider.id)}
                      >
                        <div className="provider-card-brand">
                          <span className={`registry-avatar registry-avatar-${preset?.category ?? "byok"}`}>
                            {buildMonogram(preset?.name ?? provider.name)}
                          </span>
                          <div>
                            <strong>{provider.name}</strong>
                            <p className="operator-list-copy">{preset?.name ?? provider.type}</p>
                          </div>
                        </div>
                        <div className="badge-row">
                          <span className="badge">{provider.apiKey ? "Connected" : "Needs key"}</span>
                          {provider.baseUrl && <span className="badge">Custom URL</span>}
                        </div>
                        <small className="verification-evidence">
                          {provider.baseUrl || "Using provider default endpoint"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              )}
              {personaEditable ? (
                <div className="provider-preset-sections">
                  {providerPresetSections.map((section) => (
                    <div key={section.category} className="provider-preset-section">
                      <div className="panel-heading">
                        <div>
                          <p className="eyebrow">{section.label}</p>
                          <h3>{section.label} connections</h3>
                        </div>
                      </div>
                      <div className="provider-onboarding-grid">
                        {section.presets.map((preset) => {
                          const matchedProvider = presetProviderMatches.get(preset.id);

                          return (
                            <button
                              key={preset.id}
                              className={`provider-onboarding-card ${providerDraft.type === preset.type && providerDraft.baseUrl === preset.baseUrl ? "selected" : ""}`}
                              onClick={() => handleApplyProviderPreset(preset)}
                            >
                              <div className="provider-card-brand">
                                <span className={`registry-avatar registry-avatar-${preset.category}`}>
                                  {buildMonogram(preset.name)}
                                </span>
                                <div>
                                  <strong>{preset.name}</strong>
                                  <p className="operator-list-copy">{preset.summary}</p>
                                </div>
                              </div>
                              <div className="badge-row">
                                <span className="badge">{section.label}</span>
                                <span className={`status-chip ${matchedProvider ? "on" : "off"}`}>
                                  {matchedProvider ? "Configured" : "Load preset"}
                                </span>
                              </div>
                              <small className="verification-evidence">
                                {summarizeProviderPresetConnection(preset)}
                              </small>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : providers.length === 0 ? (
                <div className="view-empty-state">
                  <p>{agentSurfaceUrl ? "No providers configured." : "Connect a runtime to view providers."}</p>
                </div>
              ) : null}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Connection editor</p>
                  <h3>{selectedProvider?.name ?? (personaEditable ? "Create provider" : "No provider selected")}</h3>
                </div>
                {selectedProvider && <span className="pill">{selectedProvider.type}</span>}
              </div>
              <div className="provider-detail-hero">
                <div className="provider-card-brand">
                  <span className={`registry-avatar registry-avatar-${selectedProviderPreset?.category ?? "byok"}`}>
                    {buildMonogram(
                      (selectedProvider?.name ?? providerDraft.name) ||
                        selectedProviderPreset?.name ||
                        "AI",
                    )}
                  </span>
                  <div>
                    <strong>
                      {(selectedProvider?.name ?? providerDraft.name) ||
                        selectedProviderPreset?.name ||
                        "Provider connection"}
                    </strong>
                    <p className="operator-list-copy">
                      {selectedProviderPreset?.summary ?? "Configure credentials, base URL, and discovery state for this provider."}
                    </p>
                  </div>
                </div>
                <div className="badge-row">
                  {selectedProviderPreset && <span className="badge">{PROVIDER_PRESET_CATEGORY_LABELS[selectedProviderPreset.category]}</span>}
                  <span className="badge">
                    {(selectedProvider?.apiKey || providerDraft.apiKey) ? "Key present" : "Key missing"}
                  </span>
                </div>
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={providerDraft.name}
                        onChange={(event) =>
                          setProviderDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder={selectedProviderPreset?.name ?? "OpenAI"}
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Type</span>
                      <input
                        className="operator-input"
                        value={providerDraft.type}
                        onChange={(event) =>
                          setProviderDraft((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        placeholder={selectedProviderPreset?.type ?? "openai"}
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Base URL</span>
                      <input
                        className="operator-input"
                        value={providerDraft.baseUrl}
                        onChange={(event) =>
                          setProviderDraft((current) => ({
                            ...current,
                            baseUrl: event.target.value,
                          }))
                        }
                        placeholder={selectedProviderPreset?.baseUrl || "https://api.example.com/v1"}
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>API key</span>
                      <input
                        className="operator-input"
                        value={providerDraft.apiKey}
                        onChange={(event) =>
                          setProviderDraft((current) => ({
                            ...current,
                            apiKey: event.target.value,
                          }))
                        }
                        placeholder={
                          selectedProviderPreset?.cliCommand
                            ? `Uses ${selectedProviderPreset.cliCommand} on PATH`
                            : selectedProviderPreset?.apiKeyEnvVar ?? "sk-..."
                        }
                      />
                    </label>
                  </div>
                  <div className="detail-block">
                    <strong>Connection behavior</strong>
                    <p>
                      Saved provider records seed probe settings, discovery, and new model drafts for the active runtime lane.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => void handleCreateProvider()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedProvider}
                      onClick={() => void handleUpdateProvider()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewProviderDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedProvider}
                      onClick={() => void handleDeleteProvider()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedProvider ? (
                <>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Auth state</span>
                      <strong>{selectedProvider.apiKey ? "Configured" : "Missing key"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Linked models</span>
                      <strong>
                        {
                          models.filter(
                            (model) =>
                              model.provider === selectedProvider.type ||
                              model.provider === selectedProvider.name,
                          ).length
                        }
                      </strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Base URL</span>
                      <strong>{selectedProvider.baseUrl || "Provider default"}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Stored key</span>
                      <strong>{maskSecret(selectedProvider.apiKey)}</strong>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => {
                        const modelMatch = models.find(
                          (model) =>
                            model.provider === selectedProvider.type ||
                            model.provider === selectedProvider.name,
                        );
                        if (modelMatch) {
                          setSelectedModelId(modelMatch.id);
                        }
                        void handleViewChange("models");
                      }}
                    >
                      Inspect models
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("gateway")}
                    >
                      Open Gateway
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a provider to inspect its endpoint and credential status.</p>
              )}
              {(personaEditable || selectedProvider || providerDraft.type.trim()) && (
                <div className="detail-block">
                  <strong>Probe and discovery</strong>
                  <p>
                    {selectedProviderPreset?.summary ??
                      "Probe the configured provider connection to verify local Ollama, remote BYOK endpoints, or CLI availability."}
                  </p>
                  <div className="badge-row">
                    {selectedProviderPreset && (
                      <span className="pill">
                        {PROVIDER_PRESET_CATEGORY_LABELS[selectedProviderPreset.category]}
                      </span>
                    )}
                    {selectedProviderPreset?.apiKeyEnvVar && (
                      <span className="pill">{selectedProviderPreset.apiKeyEnvVar}</span>
                    )}
                    {selectedProviderPreset?.cliCommand && (
                      <span className="pill">{selectedProviderPreset.cliCommand}</span>
                    )}
                    {providerDiscovery && (
                      <span className={`pill${providerDiscovery.status === "ok" ? "" : " off"}`}>
                        {labelProviderDiscoveryStatus(providerDiscovery.status)}
                      </span>
                    )}
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleDiscoverProviderModels()}
                    >
                      {providerDiscoveryBusy ? "Probing..." : "Probe provider"}
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => {
                        handleStartNewModelDraft();
                        void handleViewChange("models");
                      }}
                    >
                      New model draft
                    </button>
                  </div>
                  {providerDiscovery && (
                    <p className="workspace-copy">
                      {providerDiscovery.detail}
                      {providerDiscovery.checkedAt
                        ? ` Last checked ${formatEpochTimestamp(providerDiscovery.checkedAt) ?? "just now"}.`
                        : ""}
                    </p>
                  )}
                  {providerDiscovery?.models.length ? (
                    <div className="operator-list">
                      {providerDiscovery.models.map((modelId) => (
                        <div key={modelId} className="operator-list-item">
                          <div className="operator-list-topline">
                            <strong>{modelId}</strong>
                            <span className="badge">discovered</span>
                          </div>
                          <p className="operator-list-copy">
                            {(selectedProviderPreset?.name ??
                              selectedProvider?.name ??
                              providerDraft.name) || "Provider"}
                          </p>
                          <div className="registry-footer mission-actions">
                            <button
                              className="ghost-button"
                              onClick={() => handleLoadDiscoveredModel(modelId)}
                            >
                              Load draft
                            </button>
                            <button
                              className="ghost-button"
                              onClick={() => void handleSaveDiscoveredModel(modelId)}
                            >
                              Save endpoint
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          </section>
        )}

        {/* ── Skills ────────────────────────────────────────────────────── */}
        {activeView === "skills" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Capabilities</p>
                  <h3>Installed skills</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">{skills.length} installed</span>
                  <span className="pill">{new Set(skills.map((skill) => skill.category)).size} categories</span>
                </div>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Provider-scoped skill packs in the Cubecloud control plane. Create, tune, and remove prompt skills without leaving Agent Desktop."
                  : "Installed prompt and automation skills surfaced by the runtime. Use this screen to inspect category coverage and where each skill bundle lives on disk."}
              </p>
              {skills.length === 0 ? (
                <div className="view-empty-state">
                  <p>{agentSurfaceUrl ? "No skills installed on this runtime." : "Connect a runtime to view skills."}</p>
                </div>
              ) : (
                <div className="operator-list">
                  {skills.map((s) => (
                    <button
                      key={s.name}
                      className={`operator-list-item ${selectedSkill?.name === s.name ? "selected" : ""}`}
                      onClick={() => handleSelectSkill(s.name)}
                    >
                      <div className="operator-list-topline">
                        <strong>{s.name}</strong>
                        <span className="badge">{s.category}</span>
                      </div>
                      <p className="operator-list-copy">{s.description}</p>
                      <small className="verification-evidence">{s.path}</small>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Skill editor</p>
                  <h3>{selectedSkill?.name ?? (personaEditable ? "Create skill" : "No skill selected")}</h3>
                </div>
                {selectedSkill && <span className="pill">{selectedSkill.category}</span>}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={skillDraft.name}
                        onChange={(event) =>
                          setSkillDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="incident-review"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Category</span>
                      <input
                        className="operator-input"
                        value={skillDraft.category}
                        onChange={(event) =>
                          setSkillDraft((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        placeholder="workspace"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Description</span>
                      <textarea
                        className="operator-textarea"
                        value={skillDraft.description}
                        onChange={(event) =>
                          setSkillDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Explain when this skill should be used."
                      />
                    </label>
                  </div>
                  <div className="detail-block">
                    <strong>Skill behavior</strong>
                    <p>
                      Saved skills stay scoped to the active provider control plane so the same runtime lane, persona, and schedules can reuse them consistently.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => void handleCreateSkill()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSkill}
                      onClick={() => void handleUpdateSkill()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewSkillDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSkill}
                      onClick={() => void handleDeleteSkill()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedSkill ? (
                <>
                  <p className="detail-copy">{selectedSkill.description}</p>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Category</span>
                      <strong>{selectedSkill.category}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Profiles in shell</span>
                      <strong>{profiles.length}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Bundle path</span>
                      <strong>{selectedSkill.path}</strong>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("agents")}
                    >
                      Open agent profiles
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("tools")}
                    >
                      Inspect tools
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a skill to inspect what it adds to the runtime.</p>
              )}
            </article>
          </section>
        )}

        {/* ── Memory ────────────────────────────────────────────────────── */}
        {activeView === "memory" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Durable store</p>
                  <h3>Memory entries</h3>
                </div>
                <span className="pill">{memory.length} entries</span>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Provider-scoped memory in the Cubecloud control plane. Capture durable notes here and push any entry back into Chat when you want to reuse it."
                  : "Runtime memory ledger surfaced as concrete entries. Inspect what is being retained and push a selected note back into Chat when you want to reuse it."}
              </p>
              {memory.length === 0 ? (
                <div className="view-empty-state">
                  <p>{agentSurfaceUrl ? "No memory entries stored." : "Connect a runtime to view memory."}</p>
                </div>
              ) : (
                <div className="operator-list">
                  {memory.map((m) => (
                    <button
                      key={m.id}
                      className={`operator-list-item ${selectedMemoryEntry?.id === m.id ? "selected" : ""}`}
                      onClick={() => handleSelectMemoryEntry(m.id)}
                    >
                      <div className="operator-list-topline">
                        <strong>{m.label}</strong>
                        <span className="badge">Memory</span>
                      </div>
                      <p className="operator-list-copy">{m.content}</p>
                      <small className="verification-evidence">
                        {formatEpochTimestamp(m.createdAt) ?? "Unknown timestamp"}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Memory editor</p>
                  <h3>{selectedMemoryEntry?.label ?? (personaEditable ? "Create memory entry" : "No entry selected")}</h3>
                </div>
                {selectedMemoryEntry && <span className="pill">{formatEpochTimestamp(selectedMemoryEntry.createdAt) ?? "Stored"}</span>}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Label</span>
                      <input
                        className="operator-input"
                        value={memoryDraft.label}
                        onChange={(event) =>
                          setMemoryDraft((current) => ({
                            ...current,
                            label: event.target.value,
                          }))
                        }
                        placeholder="Deployment preferences"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Content</span>
                      <textarea
                        className="operator-textarea operator-textarea-lg"
                        value={memoryDraft.content}
                        onChange={(event) =>
                          setMemoryDraft((current) => ({
                            ...current,
                            content: event.target.value,
                          }))
                        }
                        placeholder="Store the durable operator note here."
                      />
                    </label>
                  </div>
                  <div className="detail-block">
                    <strong>Memory behavior</strong>
                    <p>
                      Memory entries are durable operator notes for the active runtime lane and can be pushed straight back into chat as reusable context.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => {
                        setChatInput(memoryDraft.content);
                        void handleViewChange("chat");
                      }}
                    >
                      Send to chat draft
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleCreateMemoryEntry()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedMemoryEntry}
                      onClick={() => void handleUpdateMemoryEntry()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewMemoryDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedMemoryEntry}
                      onClick={() => void handleDeleteMemoryEntry()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedMemoryEntry ? (
                <>
                  <pre className="operator-preview">{selectedMemoryEntry.content}</pre>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => {
                        setChatInput(selectedMemoryEntry.content);
                        void handleViewChange("chat");
                      }}
                    >
                      Send to chat draft
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("agents")}
                    >
                      Open profiles
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a memory entry to inspect or reuse it in Chat.</p>
              )}
            </article>
          </section>
        )}

        {/* ── Tools ─────────────────────────────────────────────────────── */}
        {activeView === "tools" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MCP</p>
                  <h3>Connected tools</h3>
                </div>
                <div className="badge-row">
                  <span className="pill">{tools.filter((tool) => tool.enabled !== false).length} active</span>
                  <span className="pill">{tools.filter((tool) => tool.type !== "builtin").length} custom</span>
                </div>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Provider-scoped tool registry in the Cubecloud control plane. Keep shell built-ins enabled, add custom MCP endpoints, and avoid duplicating runtime transport changes already handled in Gateway."
                  : "Live MCP tool inventory from the selected runtime. Inspect endpoint topology and use Gateway when a tool needs runtime or lane changes."}
              </p>
              {tools.length === 0 ? (
                <div className="view-empty-state">
                  <p>
                    {personaEditable
                      ? "No local toolsets configured yet."
                      : agentSurfaceUrl
                        ? "No MCP tools connected."
                        : "Connect a runtime to view tools."}
                  </p>
                </div>
              ) : (
                <div className="operator-list">
                  {tools.map((t) => (
                    <button
                      key={t.name}
                      className={`operator-list-item ${selectedTool?.name === t.name ? "selected" : ""}`}
                      onClick={() => handleSelectTool(t.name)}
                    >
                      <div className="operator-list-topline">
                        <strong>{t.name}</strong>
                        <div className="badge-row">
                          <span className="badge">{labelToolKind(t.type)}</span>
                          <span className={`badge${personaEditable && t.enabled === false ? " off" : ""}`}>
                            {t.enabled === false ? "Disabled" : "Enabled"}
                          </span>
                        </div>
                      </div>
                      <p className="operator-list-copy">{t.description}</p>
                      <small className="verification-evidence">{summarizeEndpoint(t.endpoint)}</small>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Tool editor</p>
                  <h3>{selectedTool?.name ?? (personaEditable ? "Create tool" : "No tool selected")}</h3>
                </div>
                {selectedTool && (
                  <div className="badge-row">
                    <span className="pill">{labelToolKind(selectedTool.type)}</span>
                    <span className={`pill${selectedTool.enabled === false ? " off" : ""}`}>
                      {selectedTool.enabled === false ? "Disabled" : "Enabled"}
                    </span>
                  </div>
                )}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={toolDraft.name}
                        onChange={(event) =>
                          setToolDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="observability-mcp"
                        disabled={selectedTool?.type === "builtin"}
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Type</span>
                      <input
                        className="operator-input"
                        value={toolDraft.type}
                        onChange={(event) =>
                          setToolDraft((current) => ({
                            ...current,
                            type: event.target.value,
                          }))
                        }
                        placeholder="mcp"
                        disabled={selectedTool?.type === "builtin"}
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Endpoint</span>
                      <input
                        className="operator-input"
                        value={toolDraft.endpoint}
                        onChange={(event) =>
                          setToolDraft((current) => ({
                            ...current,
                            endpoint: event.target.value,
                          }))
                        }
                        placeholder="http://127.0.0.1:8765/mcp"
                        disabled={selectedTool?.type === "builtin"}
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Description</span>
                      <textarea
                        className="operator-textarea"
                        value={toolDraft.description}
                        onChange={(event) =>
                          setToolDraft((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Explain what this MCP toolset exposes to the active runtime lane."
                        disabled={selectedTool?.type === "builtin"}
                      />
                    </label>
                  </div>
                  <div className="operator-field-grid">
                    <div className="operator-field operator-field-span-2">
                      <span>Endpoint</span>
                      <strong>{toolDraft.endpoint || "Not configured"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Registry kind</span>
                      <strong>{labelToolKind(selectedTool?.type ?? toolDraft.type)}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Transport</span>
                      <strong>{summarizeEndpoint(toolDraft.endpoint || "")}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Runtime lane</span>
                      <strong>{selectedRuntimeProvider?.displayName ?? "Not linked"}</strong>
                    </div>
                  </div>
                  <div className="detail-block">
                    <strong>{selectedTool?.type === "builtin" ? "Built-in tool behavior" : "Tool behavior"}</strong>
                    <p>
                      {selectedTool?.type === "builtin"
                        ? "Built-in shell tools keep a fixed identity for the active provider lane. You can toggle them on or off here, then start a new draft when you want to register an external MCP endpoint."
                        : "Custom tools stay scoped to the active provider control plane so personas, sessions, and schedules can target the same MCP endpoints without re-entering the registry details."}
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className={`toggle-button${(selectedTool?.type === "builtin"
                        ? selectedTool.enabled !== false
                        : toolDraft.enabled)
                        ? " enabled"
                        : ""}`}
                      onClick={() =>
                        selectedTool?.type === "builtin"
                          ? void handleToggleTool(selectedTool.enabled === false)
                          : setToolDraft((current) => ({
                              ...current,
                              enabled: !current.enabled,
                            }))
                      }
                    >
                      {selectedTool?.type === "builtin"
                        ? selectedTool.enabled === false
                          ? "Enable tool"
                          : "Disable tool"
                        : toolDraft.enabled
                          ? "Draft starts enabled"
                          : "Draft starts disabled"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={selectedTool?.type === "builtin"}
                      onClick={() => void handleCreateTool()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedTool || selectedTool.type === "builtin"}
                      onClick={() => void handleUpdateTool()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewToolDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedTool || selectedTool.type === "builtin"}
                      onClick={() => void handleDeleteTool()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedTool ? (
                <>
                  <p className="detail-copy">{selectedTool.description}</p>
                  <div className="operator-field-grid">
                    <div className="operator-field operator-field-span-2">
                      <span>Endpoint</span>
                      <strong>{selectedTool.endpoint}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Registry kind</span>
                      <strong>{labelToolKind(selectedTool.type)}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Transport</span>
                      <strong>{summarizeEndpoint(selectedTool.endpoint)}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Runtime lane</span>
                      <strong>{selectedRuntimeProvider?.displayName ?? "Not linked"}</strong>
                    </div>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("gateway")}
                    >
                      Open Gateway
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("codegraph")}
                    >
                      Open CodeGraph
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">
                  {personaEditable
                    ? "Start a new draft to register a custom tool endpoint, or select an existing tool to inspect its runtime lane."
                    : "Select a tool to inspect its endpoint and runtime lane."}
                </p>
              )}
            </article>
          </section>
        )}

        {/* ── Schedules ─────────────────────────────────────────────────── */}
        {activeView === "schedules" && (
          <section className="settings-registry-layout operator-layout">
            <article className="panel-card">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Automation</p>
                  <h3>Scheduled jobs</h3>
                </div>
                <span className="pill">{schedules.filter((s) => s.enabled).length} active</span>
              </div>
              <p className="workspace-copy">
                {personaEditable
                  ? "Provider-scoped schedule registry in the Cubecloud control plane. Save cron prompts here, toggle them on or off, and trigger a run without leaving the shell."
                  : "Scheduler inventory from the runtime. Inspect cadence, prompt payloads, and last/next run timing without duplicating the lane controls already kept in Gateway."}
              </p>
              {schedules.length === 0 ? (
                <div className="view-empty-state">
                  <p>{agentSurfaceUrl ? "No schedules configured." : "Connect a runtime to view schedules."}</p>
                </div>
              ) : (
                <div className="operator-list">
                  {schedules.map((s) => (
                    <button
                      key={s.id}
                      className={`operator-list-item ${selectedSchedule?.id === s.id ? "selected" : ""}`}
                      onClick={() => handleSelectSchedule(s.id)}
                    >
                      <div className="operator-list-topline">
                        <strong>{s.name}</strong>
                        <span className={`badge${s.enabled ? "" : " off"}`}>
                          {s.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="operator-list-copy">{summarizeSchedule(s.cron)}</p>
                      <small className="verification-evidence">
                        Next {formatEpochTimestamp(s.nextRunAt) ?? "unscheduled"}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel-card detail-panel operator-detail-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Schedule editor</p>
                  <h3>{selectedSchedule?.name ?? (personaEditable ? "Create schedule" : "No schedule selected")}</h3>
                </div>
                {selectedSchedule && (
                  <span className={`pill${selectedSchedule.enabled ? "" : " off"}`}>
                    {selectedSchedule.enabled ? "Enabled" : "Disabled"}
                  </span>
                )}
              </div>
              {personaEditable ? (
                <>
                  <div className="operator-input-grid">
                    <label className="operator-input-group">
                      <span>Name</span>
                      <input
                        className="operator-input"
                        value={scheduleDraft.name}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Nightly health check"
                      />
                    </label>
                    <label className="operator-input-group">
                      <span>Cron</span>
                      <input
                        className="operator-input"
                        value={scheduleDraft.cron}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            cron: event.target.value,
                          }))
                        }
                        placeholder="60m"
                      />
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Profile</span>
                      <select
                        className="operator-input"
                        value={scheduleDraft.profile}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            profile: event.target.value,
                            kanbanBoardSlug:
                              profiles.find((profile) => profile.name === event.target.value)
                                ?.kanbanBoardSlug ?? current.kanbanBoardSlug,
                          }))
                        }
                      >
                        <option value="">Select profile</option>
                        {scheduleProfileOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Kanban board</span>
                      <select
                        className="operator-input"
                        value={scheduleDraft.kanbanBoardSlug}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            kanbanBoardSlug: event.target.value,
                          }))
                        }
                      >
                        <option value="">Inherit profile board</option>
                        {kanbanBoardOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="operator-input-group operator-input-group-span-2">
                      <span>Prompt</span>
                      <textarea
                        className="operator-textarea operator-textarea-lg"
                        value={scheduleDraft.prompt}
                        onChange={(event) =>
                          setScheduleDraft((current) => ({
                            ...current,
                            prompt: event.target.value,
                          }))
                        }
                        placeholder="Check runtime health, summarize issues, and propose fixes."
                      />
                    </label>
                  </div>
                  {selectedSchedule && (
                    <div className="operator-field-grid">
                      <div className="operator-field">
                        <span>Next run</span>
                        <strong>{formatEpochTimestamp(selectedSchedule.nextRunAt) ?? "Not scheduled"}</strong>
                      </div>
                      <div className="operator-field">
                        <span>Last run</span>
                        <strong>{formatEpochTimestamp(selectedSchedule.lastRunAt) ?? "Never"}</strong>
                      </div>
                      <div className="operator-field operator-field-span-2">
                        <span>Linked board</span>
                        <strong>
                          {kanbanBoards.find((board) => board.slug === selectedSchedule.kanbanBoardSlug)?.name ??
                            "Profile default or none"}
                        </strong>
                      </div>
                    </div>
                  )}
                  <div className="detail-block">
                    <strong>Schedule behavior</strong>
                    <p>
                      Saved schedules keep their prompt, cadence, profile, and optional board binding in the active provider lane. Triggering a linked schedule drops a queued task into that board so automation and operator work stay on the same surface.
                    </p>
                  </div>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => {
                        setChatInput(scheduleDraft.prompt);
                        void handleViewChange("chat");
                      }}
                    >
                      Use prompt in chat
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleCreateSchedule()}
                    >
                      Save new
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSchedule}
                      onClick={() => void handleUpdateSchedule()}
                    >
                      Update selected
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => handleStartNewScheduleDraft()}
                    >
                      New draft
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSchedule}
                      onClick={() => {
                        if (!selectedSchedule) {
                          return;
                        }

                        void handleSetScheduleEnabled(!selectedSchedule.enabled);
                      }}
                    >
                      {selectedSchedule?.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSchedule}
                      onClick={() => void handleTriggerSchedule()}
                    >
                      Run now
                    </button>
                    <button
                      className="ghost-button"
                      disabled={!selectedSchedule}
                      onClick={() => void handleDeleteSchedule()}
                    >
                      Delete selected
                    </button>
                  </div>
                </>
              ) : selectedSchedule ? (
                <>
                  <div className="operator-field-grid">
                    <div className="operator-field">
                      <span>Cron</span>
                      <strong>{selectedSchedule.cron}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Profile</span>
                      <strong>{selectedSchedule.profile}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Next run</span>
                      <strong>{formatEpochTimestamp(selectedSchedule.nextRunAt) ?? "Not scheduled"}</strong>
                    </div>
                    <div className="operator-field">
                      <span>Last run</span>
                      <strong>{formatEpochTimestamp(selectedSchedule.lastRunAt) ?? "Never"}</strong>
                    </div>
                    <div className="operator-field operator-field-span-2">
                      <span>Linked board</span>
                      <strong>
                        {kanbanBoards.find((board) => board.slug === selectedSchedule.kanbanBoardSlug)?.name ??
                          "Profile default or none"}
                      </strong>
                    </div>
                  </div>
                  <pre className="operator-preview">{selectedSchedule.prompt}</pre>
                  <div className="registry-footer mission-actions">
                    <button
                      className="toggle-button enabled"
                      onClick={() => {
                        setChatInput(selectedSchedule.prompt);
                        void handleViewChange("chat");
                      }}
                    >
                      Use prompt in chat
                    </button>
                    <button
                      className="ghost-button"
                      onClick={() => void handleViewChange("agents")}
                    >
                      Open profiles
                    </button>
                  </div>
                </>
              ) : (
                <p className="detail-copy">Select a schedule to inspect its cadence and reuse its prompt.</p>
              )}
            </article>
          </section>
        )}

        {/* ── Agent data error notice ───────────────────────────────────── */}
        {agentDataError && AGENT_VIEWS.has(activeView) && agentSurfaceUrl && (
          <div style={{ padding: "0 0 12px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Could not reach runtime: {agentDataError}
          </div>
        )}

        <footer className="legal-bar" role="contentinfo">
          <span>© Cubecloud</span>
          <span>Agent Desktop</span>
          <span>Licensed components and runtime integrations remain subject to their upstream terms.</span>
        </footer>

      </main>

      <aside className="persona-rail" aria-label="Persona and operator context">
        <article className="persona-card persona-card-featured">
          <div className="panel-heading persona-heading">
            <div>
              <p className="eyebrow">Soul</p>
              <h3>{activeProfile?.name ?? "Persona not loaded"}</h3>
            </div>
            <span className="pill">{activeView}</span>
          </div>
          <p className="persona-summary">{personaSummary}</p>
          <div className="badge-row">
            {personaBadges.length > 0 ? (
              personaBadges.map((badge) => (
                <span key={badge} className="badge">
                  {badge}
                </span>
              ))
            ) : (
              <span className="badge">Awaiting runtime data</span>
            )}
          </div>
        </article>

        <article className="persona-card">
          <div className="panel-heading persona-heading">
            <div>
              <p className="eyebrow">Context Window</p>
              <h3>Live operator context</h3>
            </div>
          </div>
          <div className="persona-metric-grid">
            {personaMetrics.map((metric) => (
              <div key={metric.label} className="persona-metric">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="persona-card">
          <div className="panel-heading persona-heading">
            <div>
              <p className="eyebrow">Operator Focus</p>
              <h3>What is live now</h3>
            </div>
          </div>
          <div className="persona-fact-list">
            {personaFacts.map((fact) => (
              <div key={fact.label} className="persona-fact-row">
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="persona-card">
          <div className="panel-heading persona-heading">
            <div>
              <p className="eyebrow">Next Actions</p>
              <h3>Close the hollow gaps</h3>
            </div>
          </div>
          <div className="persona-action-list">
            {(personaActions.length > 0
              ? personaActions
              : ["Runtime, persona, tools, and schedules are all present. Tighten the individual screens next."]
            ).map((action) => (
              <div key={action} className="persona-action-item">
                {action}
              </div>
            ))}
          </div>
        </article>
      </aside>
    </div>
  );
}

export default App;
