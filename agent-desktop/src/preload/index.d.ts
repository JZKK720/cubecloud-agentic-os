import type { AppLocale } from "../shared/i18n/types";
import type { Attachment } from "../shared/attachments";
import type { ConnectionDiagnostic } from "../shared/connection-diagnostics";
import type { GatewayRuntimePresetId } from "../shared/gateway-runtime-presets";
import type {
  RuntimeProviderActionId,
  RuntimeProviderActionResult,
  RuntimeProviderId,
  RuntimeProviderSnapshot,
  TaskOrchestratorSnapshot,
} from "../shared/runtime-orchestration";

interface ElectronAPI {
  process: {
    platform: NodeJS.Platform;
    versions: {
      chrome: string;
      electron: string;
      node: string;
    };
  };
}

interface InstallStatus {
  installed: boolean;
  configured: boolean;
  hasApiKey: boolean;
  verified: boolean;
  activeProfile?: string;
}

interface InstallProgress {
  step: number;
  totalSteps: number;
  title: string;
  detail: string;
  log: string;
}

interface DockerRuntimeCandidate {
  id: string;
  kind: "hermes" | "ironclaw" | "openclaw";
  name: string;
  containerName: string;
  image: string;
  host: string | null;
  port: number | null;
  endpointUrl: string | null;
  healthUrl: string | null;
  status: "ready" | "detected";
  detail: string;
  containerStatus: string;
  composeProject: string | null;
  composeService: string | null;
}

interface DockerRuntimeDiscovery {
  status: "ready" | "empty" | "unavailable";
  message: string;
  scannedAt: string | null;
  runtimes: DockerRuntimeCandidate[];
}

interface AgentCliDiscoveryItem {
  id:
    | "open-design-amr"
    | "claude-code"
    | "codex-cli"
    | "devin-terminal"
    | "gemini-cli"
    | "opencode"
    | "hermes"
    | "trae-cli"
    | "grok-build"
    | "kimi-cli"
    | "cursor-agent"
    | "qwen-code"
    | "qoder-cli"
    | "github-copilot-cli"
    | "pi"
    | "kiro-cli"
    | "kilo"
    | "mistral-vibe-cli"
    | "deepseek-tui"
    | "aider"
    | "antigravity"
    | "deepseek-reasonix"
    | "openclaw"
    | "markitdown"
    | "raven"
    | "officecli"
    | "graphify";
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

interface AgentCliDiscovery {
  scannedAt: string;
  installedCount: number;
  items: AgentCliDiscoveryItem[];
}

interface BrowserHarnessDiscovery {
  scannedAt: string;
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

interface BrowserHarnessDoctorResult {
  ok: boolean;
  exitCode: number;
  output: string;
  scannedAt: string;
}

interface OutputFile {
  name: string;
  path: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  mimeType: string;
}

interface ThreadOutputs {
  threadId: string;
  dirPath: string;
  files: OutputFile[];
}

interface OutputsListing {
  scannedAt: string;
  threads: ThreadOutputs[];
  totalFiles: number;
}

interface CodeGraphCliStatus {
  installed: boolean;
  command: string | null;
  version: string | null;
  docsUrl: string;
  error?: string | null;
}

interface CodeGraphPendingChanges {
  added: number;
  modified: number;
  removed: number;
}

interface CodeGraphProjectStatus {
  initialized: boolean;
  projectPath: string;
  fileCount: number | null;
  nodeCount: number | null;
  edgeCount: number | null;
  dbSizeBytes: number | null;
  backend: string | null;
  journalMode: string | null;
  languages: string[];
  pendingChanges: CodeGraphPendingChanges;
  worktreeMismatch:
    | {
        worktreeRoot: string;
        indexRoot: string;
      }
    | null;
}

/**
 * Status of the embedded CodeGraph library runtime
 * (src/main/codegraph-runtime.ts). When `sdkInstalled: false` the
 * CodeGraph screen renders the existing "install CLI" CTA — the
 * runtime is purely additive, never a regression. When
 * `sdkInstalled: true` the sidebar gets the embedded-library
 * surfaces (search, impact, stats).
 */
interface CodeGraphRuntimeStatus {
  available: boolean;
  sdkInstalled: boolean;
  projectOpen: boolean;
  projectPath: string | null;
  sdkVersion: string | null;
  reason?: string;
}

interface CodeGraphRuntimeInitResult {
  success: boolean;
  projectPath: string;
  nodeCount: number | null;
  fileCount: number | null;
  error?: string;
}

interface CodeGraphRuntimeSearchHit {
  id: string;
  name: string;
  kind: string;
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  score: number;
  snippet: string | null;
}

interface CodeGraphRuntimeSearchResult {
  success: boolean;
  hits: CodeGraphRuntimeSearchHit[];
  error?: string;
}

interface CodeGraphRuntimeImpactResult {
  success: boolean;
  nodes: Array<{
    id: string;
    name: string;
    kind: string;
    filePath: string | null;
    depth: number;
  }>;
  edges: Array<{ source: string; target: string; type: string }>;
  totalNodes: number;
  totalEdges: number;
  error?: string;
}

interface CodeGraphRuntimeStatsResult {
  success: boolean;
  stats: {
    nodeCount: number;
    edgeCount: number;
    fileCount: number;
    languages: string[];
  } | null;
  error?: string;
}

/** EverOS — long-term memory harnesses backed by a self-hosted
 *  EverCore / EverOS server (https://github.com/JZKK720/EverOS). */
interface EverOsConfig {
  baseUrl: string;
  userId: string;
  groupId: string;
  topK: number;
  memoryTypes: string[];
  retrieveMethod: "hybrid" | "keyword" | "vector";
  enabled: boolean;
  apiKey: string | null;
}

interface EverOsHealthStatus {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
}

interface EverOsMessageInput {
  messageId?: string;
  role: "user" | "assistant" | "system";
  senderId?: string;
  senderName?: string;
  content: string;
  timestamp?: number;
}

interface EverOsAddResult {
  success: boolean;
  storedCount: number;
  error?: string;
}

interface EverOsEpisode {
  episodeId: string;
  content: string;
  score: number;
  createdAt: number | null;
  metadata: Record<string, unknown> | null;
}

interface EverOsSearchResult {
  success: boolean;
  episodes: EverOsEpisode[];
  pendingMessages: number;
  totalEstimated: number | null;
  error?: string;
}

interface EverOsRecentItem {
  id: string;
  content: string;
  senderId: string | null;
  role: string | null;
  createdAt: number | null;
}

interface EverOsRecentResult {
  success: boolean;
  items: EverOsRecentItem[];
  error?: string;
}

/**
 * Lifecycle status of the optional Python sidecar that wraps
 * `everos server start` (src/main/everos-sidecar.ts). The sidecar
 * is purely additive — every `everos:*` HTTP channel above
 * keeps working against any reachable EverOS instance, sidecar
 * or not. `state` is the lifecycle phase the sidecar is in
 * right now; `running` mirrors it but is kept as a separate
 * boolean so the renderer's "is the HTTP endpoint reachable"
 * check is independent of the spawn lifecycle.
 */
interface EverOsSidecarStatus {
  state: "stopped" | "starting" | "running" | "crashed" | "exited";
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
}

interface EverOsSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

/**
 * Lifecycle status of the optional Python sidecar that wraps
 * `headroom proxy` (src/main/headroom-sidecar.ts). The sidecar
 * is purely additive — every `headroom:*` HTTP channel below
 * keeps working against any reachable Headroom proxy, sidecar
 * or not. `state` is the lifecycle phase the sidecar is in
 * right now; `running` mirrors it but is kept as a separate
 * boolean so the renderer's "is the HTTP endpoint reachable"
 * check is independent of the spawn lifecycle.
 */
interface HeadroomSidecarStatus {
  state: "stopped" | "starting" | "running" | "crashed" | "exited";
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
  mode: "audit" | "optimize";
}

interface HeadroomSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

/** GBrain health probe result. Mirrors GbrainProbeResult from
 *  src/main/gbrain-probe.ts. */
interface GbrainProbeResult {
  installed: boolean;
  healthy: boolean;
  version: string | null;
  failingChecks: number;
  totalChecks: number;
  summary: string;
  raw: unknown;
}

/** Voice TTS result. Mirrors VoiceTtsResult from
 *  src/main/voice-tts.ts. */
interface VoiceTtsResult {
  success: boolean;
  audio: Buffer | null;
  error: string | null;
}

/** Voice STT result. Mirrors VoiceTranscriptionResult from
 *  src/main/voice-stt.ts. */
interface VoiceTranscriptionResult {
  success: boolean;
  text: string;
  error: string | null;
  provider: "groq" | "openai" | null;
}

/** Handy toggle/cancel result. Mirrors HandyToggleResult from
 *  src/main/handy-stt.ts. */
interface HandyToggleResult {
  success: boolean;
  error: string | null;
}

/** Graphify discovery result. Mirrors GraphifyDiscovery from
 *  src/main/graphify-probe.ts. */
interface GraphifyDiscovery {
  scannedAt: string;
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

/** Graphify version probe result. Mirrors GraphifyVersionResult
 *  from src/main/graphify-probe.ts. */
interface GraphifyVersionResult {
  ok: boolean;
  exitCode: number;
  version: string | null;
  output: string;
  scannedAt: string;
}

/** Agent eval report. Mirrors EvalReport from
 *  src/main/eval-harness.ts. */
interface EvalReport {
  totalCases: number;
  passed: number;
  failed: number;
  errored: number;
  passRate: number;
  avgLatencyMs: number;
  results: {
    caseId: string;
    description: string;
    passed: boolean;
    response: string;
    matchedKeywords: string[];
    violatedKeywords: string[];
    error: string | null;
    latencyMs: number;
  }[];
  timestamp: string;
  summary: string;
}

/** Headroom MCP server lifecycle status. Mirrors HeadroomMcpStatus
 *  from src/main/mcp/headroom-mcp-server.ts. */
interface HeadroomMcpStatus {
  state: string;
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
  toolNames: string[];
}

/** Options for starting the Headroom MCP server. */
interface HeadroomMcpStartOptions {
  port?: number;
  host?: string;
  serverScriptPath?: string;
}

/** Headroom proxy health status (GET /health). */
interface HeadroomHealthStatus {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
}

/** Headroom config persisted to desktop.json. */
interface HeadroomConfig {
  baseUrl: string;
  mode: "audit" | "optimize";
  enabled: boolean;
  apiKey: string | null;
  /**
   * Operator-only UI flag. When true, the desktop's
   * "Quick start" card on the Headroom screen collapses into
   * a one-line summary + "Reset quick start" link instead of
   * the full audit/test/optimize walkthrough. The proxy
   * runtime is not affected by this flag.
   */
  firstRunDismissed?: boolean;
}

/** A single message in OpenAI chat format. */
interface HeadroomMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

interface HeadroomCompressResult {
  success: boolean;
  messages: HeadroomMessage[];
  tokensBefore: number;
  tokensAfter: number;
  savingsPercent: number;
  compressed: boolean;
  error?: string;
}

interface HeadroomRetrieveResult {
  success: boolean;
  content: string | null;
  error?: string;
}

interface HeadroomStats {
  success: boolean;
  totalRequests: number;
  totalTokensSaved: number;
  totalTokensBefore: number;
  totalTokensAfter: number;
  avgSavingsPercent: number;
  ccrEntries: number;
  uptimeSeconds: number;
  error?: string;
}

/** A single proposal surfaced by `headroom learn`. Same shape
 *  as the existing RetroLearning so the renderer can render
 *  both heuristic and LLM-backed proposals in one review
 *  screen. */
interface HeadroomLearnProposal {
  type:
    | "pattern"
    | "pitfall"
    | "preference"
    | "architecture"
    | "tool"
    | "operational";
  key: string;
  insight: string;
  confidence: number;
  source: "inferred" | "cross-model" | "user-stated" | "observed";
  evidence: string;
  section?: string;
}

/** Result of a `headroom learn` invocation. Mirrors the
 *  retro report shape so the renderer can swap sources
 *  freely. */
interface HeadroomLearnReport {
  generatedAt: string;
  projectPath: string;
  sessionCount: number;
  totalRecommendations: number;
  outputFiles: string[];
  proposals: HeadroomLearnProposal[];
  rawOutput: string;
  durationMs: number;
}

interface HeadroomLearnResult {
  success: boolean;
  report?: HeadroomLearnReport;
  error?: string;
  skipReason?: string;
}

/**
 * Shape of a credential-pool entry as the upstream engine expects
 * (issue #367). Old entries written by the renderer with just
 * `{key, label}` are still readable via the optional `key` field.
 * New entries written from the UI use the canonical shape.
 */
interface CredentialPoolEntry {
  id?: string;
  label?: string;
  auth_type?: "api_key" | "oauth_device_code" | string;
  priority?: number;
  source?: string;
  access_token?: string;
  refresh_token?: string;
  api_key?: string;
  base_url?: string;
  request_count?: number;
  /** Legacy field for backward compat with old auth.json shapes. */
  key?: string;
}

interface KanbanCreateTaskInput {
  title: string;
  body?: string;
  assignee?: string;
  priority?: number;
  tenant?: string;
  workspace?: string;
  triage?: boolean;
  skills?: string[];
  maxRetries?: number;
}

/** V2.10.60: One probed (host, port) for the local-LLM scan. */
interface LocalServerProbe {
  host: string;
  port: number;
  provider: "ollama" | "lmstudio" | "custom";
  label: string;
  reachable: boolean;
  latencyMs: number;
  statusCode: number | null;
  error: string | null;
  baseUrl: string;
}

/** V2.10.60: Full result of a `scanLocalServers` call. */
interface LocalServerScanResult {
  scannedAt: string;
  hosts: string[];
  probes: LocalServerProbe[];
  reachable: LocalServerProbe[];
  suggestions: Array<{
    provider: "ollama" | "lmstudio";
    baseUrl: string;
    label: string;
  }>;
}

/** V2.10.60: Per-card health probe for the local server dot. */
interface LocalModelHealth {
  reachable: boolean;
  latencyMs: number;
  error: string | null;
}

interface PlanStepShape {
  id: string;
  title: string;
  body: string;
  owner: string | null;
  dependsOn: string[];
  skills: string[];
  tags: string[];
}

interface PlanShape {
  id: string;
  title: string;
  markdown: string;
  steps: PlanStepShape[];
  createdAt: string;
  dispatchedAt: string | null;
}

interface DispatchResultShape {
  planId: string;
  dispatchedAt: string;
  stepResults: Array<{
    stepId: string;
    taskId: string | null;
    error: string | null;
  }>;
  /** Set when the plan body contains a destructive shell command
   *  (V2 Step 9, careful hook). The renderer should show a
   *  confirm dialog before re-dispatching. */
  careful?: {
    stepId: string;
    command: string;
    verdict: "warn" | "block";
    reason: string;
  };
}

interface HermesAPI {
  // Installation
  checkInstall: () => Promise<InstallStatus>;
  verifyInstall: () => Promise<boolean>;
  startInstall: () => Promise<{ success: boolean; error?: string }>;
  inspectInstallTarget: () => Promise<{
    hermesHome: string;
    repoPath: string;
    state: "fresh" | "update" | "replace";
  }>;
  validateHermesHome: (dir: string) => Promise<boolean>;
  adoptHermesHome: (dir: string) => Promise<boolean>;
  quitApp: () => Promise<void>;
  onInstallProgress: (
    callback: (progress: InstallProgress) => void,
  ) => () => void;

  // Hermes engine info
  getHermesVersion: () => Promise<string | null>;
  refreshHermesVersion: () => Promise<string | null>;
  runHermesDoctor: () => Promise<string>;
  runHermesUpdate: () => Promise<{ success: boolean; error?: string }>;

  // OpenClaw migration
  checkOpenClaw: () => Promise<{ found: boolean; path: string | null }>;
  runClawMigrate: () => Promise<{ success: boolean; error?: string }>;

  // OAuth provider sign-in
  oauthLogin: (
    provider: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  cancelOAuthLogin: () => Promise<boolean>;
  onOAuthLoginProgress: (callback: (chunk: string) => void) => () => void;

  getLocale: () => Promise<AppLocale>;
  setLocale: (locale: AppLocale) => Promise<AppLocale>;

  // Configuration (profile-aware)
  getEnv: (profile?: string) => Promise<Record<string, string>>;
  setEnv: (key: string, value: string, profile?: string) => Promise<boolean>;
  getConfig: (key: string, profile?: string) => Promise<string | null>;
  setConfig: (key: string, value: string, profile?: string) => Promise<boolean>;
  getHermesHome: (profile?: string) => Promise<string>;
  getModelConfig: (
    profile?: string,
  ) => Promise<{ provider: string; model: string; baseUrl: string }>;
  setModelConfig: (
    provider: string,
    model: string,
    baseUrl: string,
    profile?: string,
  ) => Promise<boolean>;

  // Connection mode (local / remote / ssh)
  isRemoteMode: () => Promise<boolean>;
  isRemoteOnlyMode: () => Promise<boolean>;
  getConnectionConfig: () => Promise<{
    mode: "local" | "remote" | "ssh";
    remoteUrl: string;
    hasApiKey: boolean;
    apiKeyLength: number;
    gatewayRuntimePreset: GatewayRuntimePresetId;
    ssh: {
      host: string;
      port: number;
      username: string;
      keyPath: string;
      remotePort: number;
      localPort: number;
    };
  }>;
  setConnectionConfig: (
    mode: "local" | "remote" | "ssh",
    remoteUrl: string,
    apiKey?: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
  ) => Promise<boolean>;
  setSshConfig: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    localPort: number,
    apiKey?: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
  ) => Promise<boolean>;
  diagnoseRemoteConnection: (
    url: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
    apiKey?: string,
  ) => Promise<ConnectionDiagnostic>;
  testRemoteConnection: (url: string, apiKey?: string) => Promise<boolean>;
  discoverDockerRuntimes: () => Promise<DockerRuntimeDiscovery>;
  discoverAgentClis: () => Promise<AgentCliDiscovery>;
  discoverBrowserHarness: () => Promise<BrowserHarnessDiscovery>;
  browserHarnessDoctor: () => Promise<BrowserHarnessDoctorResult>;
  listAllOutputs: (profile?: string) => Promise<OutputsListing>;
  listThreadOutputs: (threadId: string, profile?: string) => Promise<ThreadOutputs>;
  ensureThreadOutputDir: (threadId: string, profile?: string) => Promise<string>;
  clearThreadOutputs: (threadId: string, profile?: string) => Promise<boolean>;

  // Swarm (G2)
  listSwarmAgents: () => Promise<Array<{
    id: string;
    message: string;
    status: "pending" | "running" | "done" | "failed" | "terminated";
    tools: string[];
    createdAt: number;
    result?: string;
    error?: string;
  }>>;
  getSwarmMessages: () => Promise<Array<{
    id: string;
    fromId: string;
    toId: string;
    text: string;
    timestamp: number;
  }>>;
  createSwarmSubagent: (message: string) => Promise<{
    id: string;
    message: string;
    status: string;
    tools: string[];
    createdAt: number;
  } | null>;
  terminateSwarmAgent: (id: string) => Promise<boolean>;
  clearSwarm: () => Promise<void>;

  // Knowledge Vault (G3)
  listVaultFiles: () => Promise<Array<{
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  }>>;
  readVaultFile: (name: string) => Promise<{
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
  } | null>;
  addVaultFile: (name: string, content: string) => Promise<boolean>;
  updateVaultFile: (name: string, content: string) => Promise<boolean>;
  deleteVaultFile: (name: string) => Promise<boolean>;
  searchVault: (query: string) => Promise<Array<{
    fileName: string;
    score: number;
    snippet: string;
  }>>;

  listRuntimeProviders: () => Promise<RuntimeProviderSnapshot[]>;
  runRuntimeProviderAction: (
    providerId: RuntimeProviderId,
    actionId: RuntimeProviderActionId,
  ) => Promise<RuntimeProviderActionResult>;
  listTaskOrchestrators: () => Promise<TaskOrchestratorSnapshot[]>;
  diagnoseSshConnection: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
    apiKey?: string,
  ) => Promise<ConnectionDiagnostic>;
  testSshConnection: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    apiKey?: string,
  ) => Promise<boolean>;
  isSshTunnelActive: () => Promise<boolean>;
  startSshTunnel: () => Promise<boolean>;
  stopSshTunnel: () => Promise<boolean>;

  // Chat
  sendMessage: (
    message: string,
    profile?: string,
    resumeSessionId?: string,
    history?: Array<{ role: string; content: string }>,
    attachments?: Attachment[],
    contextFolder?: string,
  ) => Promise<{ response: string; sessionId?: string }>;
  abortChat: () => Promise<void>;
  getApiServerKeyStatus: (profile?: string) => Promise<{ hasKey: boolean }>;
  generateApiServerKey: (profile?: string) => Promise<{ key: string }>;
  copyToClipboard: (text: string) => Promise<void>;
  onContextMenuCopyChat: (
    callback: (format: "text" | "markdown") => void,
  ) => () => void;
  onContextMenuSelectBubble: (
    callback: (point: { x: number; y: number }) => void,
  ) => () => void;
  readMediaFile: (filePath: string) => Promise<string | null>;
  saveMediaFile: (src: string, name: string) => Promise<boolean>;
  mediaFileExists: (filePath: string) => Promise<boolean>;
  showMediaMenu: (
    src: string,
    name: string,
    labels: { open: string; saveAs: string },
  ) => void;
  getPathForFile: (file: File) => string;
  stageAttachment: (
    sessionId: string,
    filename: string,
    base64Bytes: string,
  ) => Promise<string>;
  clearStagedAttachments: (sessionId: string) => Promise<void>;
  discoverProviderModels: (
    provider: string,
    baseUrl?: string,
    apiKey?: string,
    profile?: string,
  ) => Promise<{
    models: string[];
    status: "ok" | "no-key" | "unsupported" | "unknown-host";
    cached: boolean;
    /** Subset of `models` flagged as free (Nous Portal today). #367. */
    freeModels?: string[];
  }>;
  /** V2.10.60: probe 127.0.0.1 / ::1 (and any user-passed LAN hosts)
   *  on the well-known local-LLM ports. Returns the raw probe list
   *  + ready-to-paste `suggestions` for the Models page Add/Edit
   *  modal. 1.5s per probe, all probes in parallel. */
  scanLocalServers: (extraHosts?: string[]) => Promise<LocalServerScanResult>;
  /** V2.10.60: per-card health probe for the saved-Model card's
   *  green/red status dot. The renderer debounces these per card. */
  probeLocalModelHealth: (baseUrl: string) => Promise<LocalModelHealth>;
  /** V2.10.65: IronClaw Sandbox Tasks — probe the IronClaw gateway
   *  /api/health endpoint for reachability and detection. */
  ironclawProbe: (
    url: string,
    token?: string,
  ) => Promise<{
    url: string;
    healthy: boolean;
    channel: string;
    status: string;
    latencyMs: number;
    error: string | null;
  }>;
  /** V2.10.65: IronClaw Sandbox Tasks — list models from the
   *  IronClaw gateway's /v1/models endpoint. */
  ironclawModels: (
    url: string,
    token?: string,
  ) => Promise<
    Array<{ id: string; ownedBy: string; created: number }>
  >;
  /** V2.10.65: IronClaw Sandbox Tasks — dispatch a task to the
   *  IronClaw gateway via POST /v1/chat/completions. The WASM
   *  sandbox runs inside the chat path transparently. */
  ironclawDispatch: (
    url: string,
    token: string | undefined,
    task: {
      model: string;
      message: string;
      contextFolder?: string;
    },
  ) => Promise<{
    ok: boolean;
    reply: string;
    model: string;
    toolCalls: Array<{ name: string; args: string; result: string }>;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    latencyMs: number;
    error?: string;
  }>;
  /** V2.10.66: Agent-Reach internet capability status probe.
   *  Runs `agent-reach doctor` to check which channels are
   *  configured. Never reads credentials. */
  agentReachProbe: () => Promise<{
    installed: boolean;
    version: string | null;
    detectedCommand: string | null;
    channels: Array<{
      name: string;
      status: "ok" | "error" | "not-configured";
      backend: string | null;
      detail: string | null;
    }>;
    error: string | null;
  }>;
  /** V2.10.67: Auto-discovery — scan localhost for running
   *  runtime gateways (Hermes, IronClaw, OpenClaw). Probes
   *  known ports in parallel. Never sends credentials. */
  autoDiscoveryScan: () => Promise<{
    scannedAt: string;
    discovered: Array<{
      url: string;
      runtime: "hermes" | "ironclaw" | "openclaw";
      healthy: boolean;
      authRequired: boolean;
      statusCode: number | null;
      latencyMs: number;
    }>;
    healthyCount: number;
    authRequiredCount: number;
  }>;
  onChatChunk: (callback: (chunk: string) => void) => () => void;
  onChatReasoningChunk: (callback: (chunk: string) => void) => () => void;
  onChatDone: (callback: (sessionId?: string) => void) => () => void;
  onChatToolProgress: (callback: (tool: string) => void) => () => void;
  onChatUsage: (
    callback: (usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost?: number;
      rateLimitRemaining?: number;
      rateLimitReset?: number;
      /** Headroom compression stats. Undefined when
       *  Headroom is disabled or the sidecar isn't running.
       *  Local Ollama / vLLM / LM Studio paths surface this
       *  so the user can see the savings on small-context
       *  local models. */
      headroom?: {
        compressed: boolean;
        tokensBefore: number;
        tokensAfter: number;
        savingsPercent: number;
        compressMs: number;
        providerHint: string;
        skipReason?: string;
        error?: string;
      };
    }) => void,
  ) => () => void;
  onChatError: (callback: (error: string) => void) => () => void;

  // Gateway
  startGateway: () => Promise<boolean>;
  stopGateway: () => Promise<boolean>;
  gatewayStatus: () => Promise<boolean>;

  // Platform toggles
  getPlatformEnabled: (profile?: string) => Promise<Record<string, boolean>>;
  setPlatformEnabled: (
    platform: string,
    enabled: boolean,
    profile?: string,
  ) => Promise<boolean>;

  // Sessions
  listSessions: (
    limit?: number,
    offset?: number,
  ) => Promise<
    Array<{
      id: string;
      source: string;
      startedAt: number;
      endedAt: number | null;
      messageCount: number;
      model: string;
      title: string | null;
      preview: string;
    }>
  >;
  getSessionMessages: (sessionId: string) => Promise<
    Array<
      | {
          kind: "user";
          id: number;
          content: string;
          timestamp: number;
          attachments?: Attachment[];
        }
      | {
          kind: "assistant";
          id: number;
          content: string;
          timestamp: number;
          attachments?: Attachment[];
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
          attachments?: Attachment[];
        }
    >
  >;

  // Profiles
  listProfiles: () => Promise<
    Array<{
      name: string;
      path: string;
      isDefault: boolean;
      isActive: boolean;
      model: string;
      provider: string;
      hasEnv: boolean;
      hasSoul: boolean;
      skillCount: number;
      gatewayRunning: boolean;
    }>
  >;
  createProfile: (
    name: string,
    clone: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteProfile: (
    name: string,
  ) => Promise<{ success: boolean; error?: string }>;
  setActiveProfile: (name: string) => Promise<boolean>;

  // Memory
  readMemory: (profile?: string) => Promise<{
    memory: { content: string; exists: boolean; lastModified: number | null };
    user: { content: string; exists: boolean; lastModified: number | null };
    stats: { totalSessions: number; totalMessages: number };
  }>;

  addMemoryEntry: (
    content: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  updateMemoryEntry: (
    index: number,
    content: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  removeMemoryEntry: (index: number, profile?: string) => Promise<boolean>;
  writeUserProfile: (
    content: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Wiki (Karpathy-pattern 3-layer memory: raw / wiki / schema)
  wikiGetStatus: (profile?: string) => Promise<{
    wikiHome: string;
    rawDir: string;
    indexPath: string;
    logPath: string;
    schemaPath: string;
    indexExists: boolean;
    logExists: boolean;
    schemaExists: boolean;
    rawSourceCount: number;
  }>;
  wikiBootstrap: (profile?: string) => Promise<{
    created: string[];
    alreadyExists: string[];
  }>;
  wikiReadIndex: (profile?: string) => Promise<{
    raw: string;
    catalog: Array<{
      title: string;
      category: string;
      summary: string;
      relPath: string;
      sourceCount?: number;
    }>;
    categories: string[];
    entryCount: number;
    lastModified: number | null;
    exists: boolean;
  }>;
  wikiWriteIndex: (
    content: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  wikiReadLog: (profile?: string) => Promise<{
    raw: string;
    entries: Array<{ raw: string; iso: string; kind: string; title: string }>;
    lastModified: number | null;
    exists: boolean;
  }>;
  wikiAppendLog: (
    kind: "ingest" | "query" | "lint" | "synthesis" | "edit",
    title: string,
    body: string | undefined,
    profile?: string,
  ) => Promise<{ success: boolean }>;
  wikiListSources: (profile?: string) => Promise<{
    items: Array<{
      name: string;
      relPath: string;
      size: number;
      lastModified: number;
    }>;
    total: number;
  }>;
  wikiReadSchema: (profile?: string) => Promise<{
    content: string;
    exists: boolean;
    lastModified: number | null;
  }>;
  wikiReadPage: (
    relPath: string,
    profile?: string,
  ) => Promise<{ content: string; exists: boolean; lastModified: number | null }>;
  wikiWritePage: (
    relPath: string,
    content: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Soul
  readSoul: (profile?: string) => Promise<string>;
  writeSoul: (content: string, profile?: string) => Promise<boolean>;
  resetSoul: (profile?: string) => Promise<string>;

  // Tools
  getToolsets: (
    profile?: string,
  ) => Promise<
    Array<{ key: string; label: string; description: string; enabled: boolean }>
  >;
  setToolsetEnabled: (
    key: string,
    enabled: boolean,
    profile?: string,
  ) => Promise<boolean>;

  // File-to-Markdown converter (Step 4 of the harvest rollout).
  // Routes a file path through the converter chain (markitdown CLI
  // when available, otherwise pure-JS fallbacks for text/json/csv/html).
  convertFileToMarkdown: (
    filePath: string,
  ) => Promise<
    | {
        success: true;
        result: {
          markdown: string;
          metadata: Record<string, unknown>;
          converter: string;
        };
      }
    | {
        success: false;
        error: string;
        permanent?: boolean;
        converter?: string;
      }
  >;
  isMarkitdownAvailable: () => Promise<{ available: boolean }>;
  /** Ingest a file into the wiki: convert to markdown, write into
   *  `raw/sources/`, append a log entry. Returns the conversion
   *  outcome + the relative path the file landed at. */
  wikiIngestFileAsMarkdown: (
    filePath: string,
    title?: string,
    profile?: string,
  ) => Promise<{
    success: boolean;
    conversion?: {
      success: true;
      result: {
        markdown: string;
        metadata: Record<string, unknown>;
        converter: string;
      };
    };
    relPath?: string;
    size?: number;
    error?: string;
  }>;

  // Design Dials (Step 5 of the harvest rollout). Each dial is a
  // 0..100 number persisted to <profile>/design-dials.json and
  // injected into the agent's system prompt as a soft style hint.
  getDesignDials: (profile?: string) => Promise<{
    variance: number;
    motion: number;
    density: number;
  }>;
  setDesignDials: (
    dials: { variance?: number; motion?: number; density?: number },
    profile?: string,
  ) => Promise<{
    variance: number;
    motion: number;
    density: number;
  }>;

  // Skills
  listInstalledSkills: (
    profile?: string,
  ) => Promise<
    Array<{ name: string; category: string; description: string; path: string }>
  >;
  listBundledSkills: () => Promise<
    Array<{
      name: string;
      description: string;
      category: string;
      source: string;
      installed: boolean;
    }>
  >;
  getSkillContent: (skillPath: string) => Promise<string>;
  /** Resolve the absolute path of a desktop-bundled skill so the
   *  Skills UI can open its SKILL.md without going through install. */
  getDesktopBundledSkillPath: (name: string) => Promise<string | null>;
  installSkill: (
    identifier: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  uninstallSkill: (
    name: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Session cache
  listCachedSessions: (
    limit?: number,
    offset?: number,
  ) => Promise<
    Array<{
      id: string;
      title: string;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
    }>
  >;
  syncSessionCache: () => Promise<
    Array<{
      id: string;
      title: string;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
    }>
  >;
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;

  // Session search
  searchSessions: (
    query: string,
    limit?: number,
  ) => Promise<
    Array<{
      sessionId: string;
      title: string | null;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
      snippet: string;
    }>
  >;

  // Credential Pool (profile-aware) — entries follow the upstream
  // engine schema (issue #367). See `CredentialPoolEntry` below.
  getCredentialPool: (
    profile?: string,
  ) => Promise<Record<string, Array<CredentialPoolEntry>>>;
  setCredentialPool: (
    provider: string,
    entries: Array<CredentialPoolEntry>,
    profile?: string,
  ) => Promise<boolean>;
  addCredentialPoolEntry: (
    provider: string,
    apiKey: string,
    label: string,
    profile?: string,
  ) => Promise<Array<CredentialPoolEntry>>;

  // Models
  listModels: () => Promise<
    Array<{
      id: string;
      name: string;
      provider: string;
      model: string;
      baseUrl: string;
      createdAt: number;
    }>
  >;
  addModel: (
    name: string,
    provider: string,
    model: string,
    baseUrl: string,
  ) => Promise<{
    id: string;
    name: string;
    provider: string;
    model: string;
    baseUrl: string;
    createdAt: number;
  }>;
  removeModel: (id: string) => Promise<boolean>;
  updateModel: (id: string, fields: Record<string, string>) => Promise<boolean>;

  // Updates
  checkForUpdates: () => Promise<string | null>;
  downloadUpdate: () => Promise<boolean>;
  installUpdate: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes: string }) => void,
  ) => () => void;
  onUpdateDownloadProgress: (
    callback: (info: { percent: number }) => void,
  ) => () => void;
  onUpdateDownloaded: (callback: () => void) => () => void;
  onUpdateError: (callback: (message: string) => void) => () => void;

  // Menu events
  onMenuNewChat: (callback: () => void) => () => void;
  onMenuSearchSessions: (callback: () => void) => () => void;

  // Cron Jobs
  listCronJobs: (
    includeDisabled?: boolean,
    profile?: string,
  ) => Promise<
    Array<{
      id: string;
      name: string;
      schedule: string;
      prompt: string;
      state: "active" | "paused" | "completed";
      enabled: boolean;
      next_run_at: string | null;
      last_run_at: string | null;
      last_status: string | null;
      last_error: string | null;
      repeat: { times: number | null; completed: number } | null;
      deliver: string[];
      skills: string[];
      script: string | null;
    }>
  >;
  createCronJob: (
    schedule: string,
    prompt?: string,
    name?: string,
    deliver?: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  removeCronJob: (
    jobId: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  pauseCronJob: (
    jobId: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  resumeCronJob: (
    jobId: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  triggerCronJob: (
    jobId: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Kanban (plan dispatch only — board UI removed)
  kanbanCreateTask: (
    input: KanbanCreateTaskInput,
    profile?: string,
  ) => Promise<{ success: boolean; data?: { id: string }; error?: string }>;
  kanbanDispatchOnce: (
    dryRun?: boolean,
    profile?: string,
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  codegraphCliStatus: () => Promise<CodeGraphCliStatus>;
  codegraphInstallCli: () => Promise<{
    success: boolean;
    status?: CodeGraphCliStatus;
    error?: string;
  }>;
  codegraphSetupHermes: () => Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }>;
  codegraphProjectStatus: (
    projectPath: string,
  ) => Promise<{ success: boolean; status?: CodeGraphProjectStatus; error?: string }>;
  codegraphInitProject: (
    projectPath: string,
  ) => Promise<{ success: boolean; status?: CodeGraphProjectStatus; error?: string }>;
  codegraphBuildContext: (
    projectPath: string,
    prompt: string,
  ) => Promise<{
    success: boolean;
    context?: string;
    error?: string;
    headroomCompressed?: boolean;
    headroomSavingsPercent?: number;
    headroomOriginalSize?: number;
    headroomCompressedSize?: number;
  }>;
  // CodeGraph runtime (embedded library). When the npm package
  // @colbymchenry/codegraph is installed, these channels talk
  // straight to the SDK without spawning a CLI. When the SDK
  // is missing, `codegraphRuntimeStatus` reports
  // `sdkInstalled: false` and the rest of the channels return
  // structured `unavailable` errors. The sidebar CodeGraph
  // screen calls these when status.sdkInstalled is true.
  codegraphRuntimeStatus: () => Promise<CodeGraphRuntimeStatus>;
  codegraphRuntimeOpen: (
    projectPath: string,
  ) => Promise<CodeGraphRuntimeInitResult>;
  codegraphRuntimeClose: (
    projectPath: string,
  ) => Promise<{ success: boolean; error?: string }>;
  codegraphRuntimeSearch: (
    projectPath: string,
    query: string,
    options?: { limit?: number },
  ) => Promise<CodeGraphRuntimeSearchResult>;
  codegraphRuntimeImpact: (
    projectPath: string,
    nodeId: string,
    maxDepth?: number,
  ) => Promise<CodeGraphRuntimeImpactResult>;
  codegraphRuntimeStats: (
    projectPath: string,
  ) => Promise<CodeGraphRuntimeStatsResult>;
  selectFolder: () => Promise<string | null>;
  readDirectory: (
    dirPath: string,
  ) => Promise<{ name: string; isDirectory: boolean }[] | null>;
  readFile: (
    filePath: string,
    maxBytes?: number,
  ) => Promise<{ content: string; truncated: boolean } | null>;
  openFileInEditor: (filePath: string) => Promise<boolean>;
  readImageFile: (filePath: string) => Promise<string | null>;

  // EverOS — long-term memory harnesses backed by a self-hosted
  // EverCore / EverOS server (https://github.com/JZKK720/EverOS).
  // The desktop can drive EverOS over HTTP even when the local
  // runtime is not installed; the renderer just needs a reachable
  // base URL (configured via everosSaveConfig).
  everosGetConfig: () => Promise<EverOsConfig>;
  everosSaveConfig: (patch: Partial<EverOsConfig>) => Promise<EverOsConfig>;
  everosPing: (patch?: Partial<EverOsConfig>) => Promise<EverOsHealthStatus>;
  everosAddMemory: (
    messages: EverOsMessageInput[],
    patch?: Partial<EverOsConfig>,
  ) => Promise<EverOsAddResult>;
  everosSearch: (
    query: string,
    options?: { topK?: number; method?: "hybrid" | "keyword" | "vector" },
    patch?: Partial<EverOsConfig>,
  ) => Promise<EverOsSearchResult>;
  everosListRecent: (
    limit?: number,
    patch?: Partial<EverOsConfig>,
  ) => Promise<EverOsRecentResult>;

  // EverOS sidecar (lifecycle manager around the
  // `everos server start` Python process). Purely additive —
  // every `everos:*` HTTP channel above keeps working against
  // any reachable EverOS instance, sidecar or not. The sidecar
  // status lets the renderer draw a "running / starting /
  // stopped / crashed" pill and surface the last-error line
  // without having to poll the HTTP endpoint.
  everosSidecarStatus: () => Promise<EverOsSidecarStatus>;
  everosSidecarStart: (options?: {
    port?: number;
    host?: string;
  }) => Promise<EverOsSidecarStatus>;
  everosSidecarStop: () => Promise<EverOsSidecarStatus>;
  everosSidecarRestart: (options?: {
    port?: number;
    host?: string;
  }) => Promise<EverOsSidecarStatus>;
  everosSidecarLogTail: () => Promise<EverOsSidecarLogTail>;
  everosSidecarClearLogs: () => Promise<{ success: boolean }>;

  // Headroom proxy (context compression for LLM calls)
  headroomGetConfig: () => Promise<HeadroomConfig>;
  headroomSaveConfig: (patch: Partial<HeadroomConfig>) => Promise<HeadroomConfig>;
  headroomPing: () => Promise<HeadroomHealthStatus>;
  headroomCompress: (
    messages: HeadroomMessage[],
    model?: string,
  ) => Promise<HeadroomCompressResult>;
  headroomRetrieve: (cacheKey: string) => Promise<HeadroomRetrieveResult>;
  headroomStats: () => Promise<HeadroomStats>;
  headroomSidecarStatus: () => Promise<HeadroomSidecarStatus>;
  headroomSidecarStart: (options?: {
    port?: number;
    host?: string;
    mode?: "audit" | "optimize";
  }) => Promise<HeadroomSidecarStatus>;
  headroomSidecarStop: () => Promise<HeadroomSidecarStatus>;
  headroomSidecarRestart: (options?: {
    port?: number;
    host?: string;
    mode?: "audit" | "optimize";
  }) => Promise<HeadroomSidecarStatus>;
  headroomSidecarLogTail: () => Promise<HeadroomSidecarLogTail>;
  headroomSidecarClearLogs: () => Promise<{ success: boolean }>;

  // GBrain health probe. GBrain's local mode is stdio MCP (no HTTP
  // port), so we probe via `gbrain doctor --json`. Returns
  // { installed: false } when gbrain is not on PATH.
  gbrainProbe: () => Promise<GbrainProbeResult>;

  // Voice STT transcription. The renderer captures audio via
  // MediaRecorder and sends the buffer to the main process, which
  // forwards it to the configured STT provider (Groq or OpenAI
  // Whisper). Audio never touches disk.
  voiceTranscribe: (audioBuffer: Buffer) => Promise<VoiceTranscriptionResult>;

  // Voice TTS synthesis. Sends text to the main process, which calls
  // OpenAI TTS (hardcoded tts-1 model). Returns an MP3 buffer.
  voiceSynthesize: (
    text: string,
    voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
  ) => Promise<VoiceTtsResult>;

  // Handy local-first STT. Detect + toggle/cancel a running Handy
  // instance. Text is pasted into the focused textarea by Handy.
  handyDetect: () => Promise<boolean>;
  handyToggle: () => Promise<HandyToggleResult>;
  handyCancel: () => Promise<HandyToggleResult>;

  // Graphify discovery + version probe.
  graphifyDiscover: () => Promise<GraphifyDiscovery>;
  graphifyVersion: () => Promise<GraphifyVersionResult>;

  // Agent eval framework — run task fixtures against the gateway.
  evalRun: (options: {
    gatewayUrl: string;
    apiKey?: string;
    model?: string;
  }) => Promise<EvalReport>;

  // Skill sharing via git URL — clone, scan, install.
  skillInstallGit: (
    gitUrl: string,
    skillName?: string,
    skillRelPath?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Headroom MCP server (local MCP server wrapping the Headroom proxy).
  headroomMcpStatus: () => Promise<HeadroomMcpStatus>;
  headroomMcpLogTail: () => Promise<HeadroomSidecarLogTail>;
  headroomMcpClearLogs: () => Promise<{ success: boolean }>;
  headroomMcpStart: (options?: HeadroomMcpStartOptions) => Promise<HeadroomMcpStatus>;
  headroomMcpStop: () => Promise<HeadroomMcpStatus>;
  headroomMcpRestart: (options?: HeadroomMcpStartOptions) => Promise<HeadroomMcpStatus>;

  // Headroom learn (failure mining via upstream `headroom learn`
  // CLI). The desktop shells out to the same `headroom` binary
  // the proxy sidecar uses; the result lands in the same shape
  // as the heuristic retro report so the renderer can render
  // both side-by-side.
  headroomLearnRun: (options: {
    projectPath: string;
    model?: string;
    agent?: "auto" | "claude" | "codex" | "gemini";
    apply?: boolean;
    timeoutMs?: number;
  }) => Promise<HeadroomLearnResult>;
  headroomLearnLastReport: () => Promise<HeadroomLearnReport | null>;
  headroomLearnStop: () => Promise<{ success: boolean }>;
  headroomLearnCommit: (
    proposals: HeadroomLearnProposal[],
    profile?: string,
  ) => Promise<unknown[]>;
  headroomLearnApply: (options: {
    projectPath: string;
    model?: string;
    agent?: "auto" | "claude" | "codex" | "gemini";
    timeoutMs?: number;
  }) => Promise<{
    success: boolean;
    diffs: Array<{
      path: string;
      created: boolean;
      before: string;
      after: string;
    }>;
    report?: HeadroomLearnReport;
    error?: string;
    skipReason?: string;
  }>;
  headroomLearnRevert: (
    diffs: Array<{
      path: string;
      created: boolean;
      before: string;
      after: string;
    }>,
  ) => Promise<{ success: boolean; reverted: string[]; error?: string }>;

  // Shell
  openExternal: (url: string) => Promise<void>;
  /** Reveal the active profile's data directory in the OS file
   *  browser. Returns "" on success and an error message on
   *  failure (e.g. SSH mode where no local folder exists). */
  openDataFolder: (profile?: string) => Promise<string>;

  // Backup / Import
  runHermesBackup: (
    profile?: string,
  ) => Promise<{ success: boolean; path?: string; error?: string }>;
  runHermesImport: (
    archivePath: string,
    profile?: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Debug dump
  runHermesDump: () => Promise<string>;

  // Memory providers
  discoverMemoryProviders: (profile?: string) => Promise<
    Array<{
      name: string;
      description: string;
      installed: boolean;
      active: boolean;
      envVars: string[];
    }>
  >;

  // Codebase Memory binary discovery
  discoverCodebaseMemory: () => Promise<{
    found: boolean;
    path: string | null;
    version: string | null;
  }>;
  listCodebaseMemoryProjects: () => Promise<Array<{
    name: string;
    rootPath: string;
    nodes: number;
    edges: number;
    sizeBytes: number;
  }>>;
  discoverLast30Days: () => Promise<{
    found: boolean;
    scriptPath: string | null;
    cliOnPath: boolean;
    version: string | null;
  }>;

  // Moo Tasks sidecar (agent-native kanban board)
  mooTasksSidecarStatus: () => Promise<{
    state: string;
    running: boolean;
    pid: number | null;
    port: number | null;
    baseUrl: string;
    mcpUrl: string;
    lastError: string | null;
    crashCount: number;
    startedAt: number | null;
    uptimeMs: number | null;
    reason: string | null;
  }>;
  mooTasksSidecarStart: (options?: {
    port?: number;
    host?: string;
    projectDir?: string;
  }) => Promise<unknown>;
  mooTasksSidecarStop: () => Promise<unknown>;
  mooTasksSidecarRestart: (options?: {
    port?: number;
    host?: string;
    projectDir?: string;
  }) => Promise<unknown>;
  mooTasksSidecarLogTail: () => Promise<{
    lines: string[];
    totalBytes: number;
  }>;
  mooTasksSidecarClearLogs: () => Promise<unknown>;

  // MCP servers
  listMcpServers: (
    profile?: string,
  ) => Promise<
    Array<{ name: string; type: string; enabled: boolean; detail: string }>
  >;
  setMcpServerEnabled: (
    name: string,
    enabled: boolean,
    profile?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  addMcpServer: (
    entry: {
      name: string;
      type: "http" | "stdio";
      enabled: boolean;
      detail: string;
    },
    profile?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  removeMcpServer: (
    name: string,
    profile?: string,
  ) => Promise<{ ok: boolean; error?: string }>;

  // Log viewer
  readLogs: (
    logFile?: string,
    lines?: number,
  ) => Promise<{ content: string; path: string }>;

  // Plans / Orchestrator surface (Step 7 of the harvest rollout).
  // A plan is a parsed markdown RFC: ordered steps with owner /
  // depends-on / skills / tags, persisted to
  // <profile>/plans/<id>/plan.json. Dispatch shells the steps
  // out to the Kanban orchestrator as backlog tasks.
  plansParse: (title: string, markdown: string) => Promise<PlanShape>;
  plansSave: (plan: PlanShape, profile?: string) => Promise<PlanShape>;
  plansList: (profile?: string) => Promise<PlanShape[]>;
  plansGet: (id: string, profile?: string) => Promise<PlanShape>;
  plansDelete: (
    id: string,
    profile?: string,
  ) => Promise<{ success: boolean; existed: boolean }>;
  plansDispatch: (
    id: string,
    profile?: string,
  ) => Promise<DispatchResultShape>;

  // Careful (Step 9 of the V2 rollout, ported from gstack's
  // /careful). Verdict is `safe | warn | block`. In V1 only `warn`
  // is reached in practice; the user can always override.
  carefulCheck: (command: string) => Promise<CarefulResultShape>;
  carefulFindInBody: (body: string) => Promise<string | null>;
  carefulIsDestructive: (command: string) => Promise<boolean>;

  // /learn (Step 10 of the V2 rollout, ported from gstack's
  // /learn). Per-profile append-only JSONL log of durable
  // patterns / pitfalls / preferences / architecture decisions.
  learningsRead: (profile?: string) => Promise<LearningShape[]>;
  learningsSearch: (
    query: string,
    profile?: string,
  ) => Promise<LearningDedupedShape[]>;
  learningsStats: (profile?: string) => Promise<LearningStatsShape>;
  learningsExport: (profile?: string) => Promise<string>;
  learningsFindStale: (profile?: string) => Promise<LearningDedupedShape[]>;
  learningsClear: (profile?: string) => Promise<{ success: boolean }>;
  learningsFileInfo: (profile?: string) => Promise<{
    exists: boolean;
    size: number;
    lastModified: number | null;
  }>;
  learningsAppend: (
    input: Omit<LearningShape, "ts"> & { ts?: string },
    profile?: string,
  ) => Promise<LearningShape>;

  // Schema packs + wiki synthesis (V2 Steps 12 + 13, ported
  // from gbrain). The brain layer on top of the existing 3-
  // layer memory: the active schema pack declares what page
  // types the wiki recognises; the synthesis layer composes a
  // topic answer with per-claim citations and a gap list.
  schemasListBundled: () => Promise<SchemaPackShape[]>;
  schemasGetActive: (profile?: string) => Promise<SchemaPackShape>;
  schemasGetActiveId: (profile?: string) => Promise<string | null>;
  schemasSetActive: (
    packId: string,
    profile?: string,
  ) => Promise<{ success: boolean }>;
  schemasInferType: (relPath: string, profile?: string) => Promise<string>;
  synthesisBuild: (
    topic: string,
    profile?: string,
    opts?: { maxClaims?: number; maxGaps?: number },
  ) => Promise<SynthesisShape>;

  // Knowledge MCP (V2 Step 14, ported from gbrain's MCP
  // surface). The four-verb search / get / list / sources
  // family, plus a tool manifest the renderer can register
  // with the agent's tool-use layer.
  knowledgeToolManifest: () => Promise<McpToolShape[]>;
  knowledgeSearch: (
    query: string,
    profile?: string,
  ) => Promise<KnowledgeSearchResultShape>;
  knowledgeGet: (
    relPath: string,
    profile?: string,
  ) => Promise<KnowledgePageShape | null>;
  knowledgeList: (
    filter?: { type?: string },
    profile?: string,
  ) => Promise<Array<{ relPath: string; title: string; type: string }>>;
  knowledgeSources: (
    profile?: string,
  ) => Promise<KnowledgeRawSourceShape[]>;

  // Autoplan (V2 Step 15, ported from gstack's /autoplan).
  // Pre-fills decision briefs from plan steps that carry
  // the `plan-tune` skill, and lets the renderer hand-record
  // a dispatch failure for the failure-side learning log.
  autoplanBuildBriefs: (
    planId: string,
    profile?: string,
  ) => Promise<Array<{ stepId: string; briefs: PlanTuneBriefSeedShape[] }>>;
  autoplanRecordFailure: (
    stepId: string,
    error: string,
    planId: string,
    profile?: string,
  ) => Promise<{ success: boolean }>;

  // V2.2 — /retro (gstack). Walk the most recent N sessions,
  // surface recurring tool calls and user corrections as
  // "proposed learnings" the user can review and commit.
  retroSummarize: (profile?: string, lookback?: number) => Promise<RetroReportShape>;
  retroBuildContext: (
    profile?: string,
    lookback?: number,
  ) => Promise<RetroContextShape>;
  retroCommit: (
    proposals: Array<{
      type: RetroLearningType;
      key: string;
      insight: string;
      confidence: number;
      source: RetroLearningSource;
      evidence: string;
    }>,
    profile?: string,
  ) => Promise<LearningShape[]>;
  retroExport: (profile?: string) => Promise<string>;

  // V2.2 — /triage (gstack). Run a triage pass over a batch
  // of items (issues, PRs, sessions, free-form notes) and
  // surface 5W1H, priority, suggested labels, and references
  // back to existing learnings / on-disk wiki files.
  triageItems: (
    items: TriageItemInputShape[],
    profile?: string,
  ) => Promise<TriageReportShape>;
  triageRecentSessions: (
    profile?: string,
    lookback?: number,
  ) => Promise<TriageReportShape>;

  // V2.2 — /handoff (gstack). Compose a single markdown
  // document with recent sessions / learnings / kanban /
  // wiki activity. Optionally save to disk so the user can
  // attach it to a PR or hand it to a colleague.
  handoffBuild: (profile?: string) => Promise<HandoffDocShape>;
  handoffSave: (
    doc: HandoffDocShape,
    outDir?: string,
  ) => Promise<{ path: string; bytes: number }>;
  handoffBuildAndSave: (
    profile?: string,
    outDir?: string,
  ) => Promise<{ doc: HandoffDocShape; saved: { path: string; bytes: number } }>;
}

type RetroLearningType =
  | "pattern"
  | "pitfall"
  | "preference"
  | "architecture"
  | "tool"
  | "operational";

type RetroLearningSource =
  | "observed"
  | "user-stated"
  | "inferred"
  | "cross-model";

interface RetroReportShape {
  generatedAt: string;
  sessionCount: number;
  sessionSummaries: Array<{
    sessionId: string;
    title: string | null;
    startedAt: number;
    messageCount: number;
  }>;
  proposed: Array<{
    type: RetroLearningType;
    key: string;
    insight: string;
    confidence: number;
    source: RetroLearningSource;
    evidence: string;
  }>;
}

interface RetroContextShape {
  report: RetroReportShape;
  existingTop: Array<{ key: string; insight: string; type: string }>;
  markdown: string;
}

interface TriageItemInputShape {
  id: string;
  title: string;
  body?: string;
  author?: string;
  createdAt?: string;
  kind?: string;
}

interface TriageReportShape {
  generatedAt: string;
  items: Array<{
    id: string;
    title: string;
    kind: string;
    priority: "P0" | "P1" | "P2" | "P3";
    rationale: string;
    labels: string[];
    related: string[];
    files: string[];
    contextRefs: Array<{
      kind: "learning" | "wiki";
      key: string;
      insight: string;
    }>;
  }>;
  markdown: string;
}

interface HandoffDocShape {
  generatedAt: string;
  profile: string;
  sections: Array<{ heading: string; body: string }>;
  markdown: string;
  readFirst: string[];
}

interface CarefulResultShape {
  verdict: "safe" | "warn" | "block";
  reason?: string;
  matchedPattern?: string;
  softerAlternative?: string;
}

/** A single event in the project's learnings log. */
interface LearningShape {
  ts: string;
  skill: string;
  type:
    | "pattern"
    | "pitfall"
    | "preference"
    | "architecture"
    | "tool"
    | "operational";
  key: string;
  insight: string;
  confidence: number;
  source: "observed" | "user-stated" | "inferred" | "cross-model";
  files?: string[];
}

interface LearningDedupedShape extends LearningShape {
  count: number;
  lastSeen: string;
}

interface LearningStatsShape {
  total: number;
  unique: number;
  byType: Record<LearningShape["type"], number>;
  bySource: Record<LearningShape["source"], number>;
  averageConfidence: number;
  topKeys: Array<{ key: string; count: number }>;
}

/** A schema-pack type as exposed to the renderer. */
interface SchemaTypeShape {
  id: string;
  label: string;
  description: string;
  pathPrefixes: string[];
  extractable: boolean;
  expertRouting: boolean;
  recommendedFields?: string[];
}

interface SchemaPackShape {
  id: string;
  label: string;
  version: string;
  description: string;
  extends?: string;
  types: SchemaTypeShape[];
  globalTags?: string[];
}

interface ClaimShape {
  relPath: string;
  pageTitle: string;
  text: string;
  type: string;
}

interface GapShape {
  label: string;
  reason: string;
  need: string;
}

interface SynthesisShape {
  topic: string;
  markdown: string;
  claims: ClaimShape[];
  sources: Array<{ relPath: string; title: string; type: string }>;
  gaps: GapShape[];
  freshness: string;
  builtAt: string;
  packId: string;
}

interface McpToolShape {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    required: string[];
    properties: Record<
      string,
      { type: "string" | "number" | "boolean"; description: string }
    >;
  };
}

interface KnowledgeSearchResultShape {
  query: string;
  synthesis: SynthesisShape;
  sources: Array<{
    relPath: string;
    title: string;
    type: string;
    snippet: string;
  }>;
}

interface KnowledgePageShape {
  relPath: string;
  title: string;
  type: string;
  body: string;
}

interface KnowledgeRawSourceShape {
  filename: string;
  size: number;
  lastModified: number;
}

interface PlanTuneBriefSeedShape {
  decisionId: string;
  title: string;
  eli10: string;
  stakes?: string;
  recommendation: string;
  stepId: string;
  blockOffset: number;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    hermesAPI: HermesAPI;
  }
}
