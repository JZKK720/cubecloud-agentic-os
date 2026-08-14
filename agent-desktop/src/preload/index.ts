import { contextBridge, ipcRenderer, webUtils } from "electron";
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

/**
 * Mirror of the renderer-side `CredentialPoolEntry` ambient type
 * (src/preload/index.d.ts) —preload is type-checked under
 * tsconfig.node.json which doesn't include the .d.ts. See #367.
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
  key?: string;
}

interface DockerRuntimeCandidate {
  id: string;
  kind: "ironclaw";
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

const electronAPI = {
  process: {
    platform: process.platform,
    versions: {
      chrome: process.versions.chrome,
      electron: process.versions.electron,
      node: process.versions.node,
    },
  },
};

const hermesAPI = {
  // Installation
  checkInstall: (): Promise<{
    installed: boolean;
    configured: boolean;
    hasApiKey: boolean;
  }> => ipcRenderer.invoke("check-install"),

  verifyInstall: (): Promise<boolean> => ipcRenderer.invoke("verify-install"),

  startInstall: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("start-install"),

  // Pre-install inspection + "use an existing installation" (issue #272)
  inspectInstallTarget: (): Promise<{
    hermesHome: string;
    repoPath: string;
    state: "fresh" | "update" | "replace";
  }> => ipcRenderer.invoke("inspect-install-target"),

  validateHermesHome: (dir: string): Promise<boolean> =>
    ipcRenderer.invoke("validate-hermes-home", dir),

  adoptHermesHome: (dir: string): Promise<boolean> =>
    ipcRenderer.invoke("adopt-hermes-home", dir),

  quitApp: (): Promise<void> => ipcRenderer.invoke("quit-app"),

  onInstallProgress: (
    callback: (progress: {
      step: number;
      totalSteps: number;
      title: string;
      detail: string;
      log: string;
    }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      progress: unknown,
    ): void =>
      callback(
        progress as {
          step: number;
          totalSteps: number;
          title: string;
          detail: string;
          log: string;
        },
      );
    ipcRenderer.on("install-progress", handler);
    return () => ipcRenderer.removeListener("install-progress", handler);
  },

  // Hermes engine info
  getHermesVersion: (): Promise<string | null> =>
    ipcRenderer.invoke("get-hermes-version"),
  refreshHermesVersion: (): Promise<string | null> =>
    ipcRenderer.invoke("refresh-hermes-version"),
  runHermesDoctor: (): Promise<string> =>
    ipcRenderer.invoke("run-hermes-doctor"),
  runHermesUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("run-hermes-update"),

  // OpenClaw migration
  checkOpenClaw: (): Promise<{ found: boolean; path: string | null }> =>
    ipcRenderer.invoke("check-openclaw"),
  runClawMigrate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("run-claw-migrate"),

  // OAuth provider sign-in
  oauthLogin: (
    provider: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("oauth-login", provider, profile),
  cancelOAuthLogin: (): Promise<boolean> =>
    ipcRenderer.invoke("oauth-login-cancel"),
  onOAuthLoginProgress: (callback: (chunk: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: unknown): void =>
      callback(String(chunk));
    ipcRenderer.on("oauth-login-progress", handler);
    return () => ipcRenderer.removeListener("oauth-login-progress", handler);
  },

  getLocale: (): Promise<AppLocale> => ipcRenderer.invoke("get-locale"),
  setLocale: (locale: AppLocale): Promise<AppLocale> =>
    ipcRenderer.invoke("set-locale", locale),

  // Configuration (profile-aware)
  getEnv: (profile?: string): Promise<Record<string, string>> =>
    ipcRenderer.invoke("get-env", profile),

  setEnv: (key: string, value: string, profile?: string): Promise<boolean> =>
    ipcRenderer.invoke("set-env", key, value, profile),

  getConfig: (key: string, profile?: string): Promise<string | null> =>
    ipcRenderer.invoke("get-config", key, profile),

  setConfig: (key: string, value: string, profile?: string): Promise<boolean> =>
    ipcRenderer.invoke("set-config", key, value, profile),

  getHermesHome: (profile?: string): Promise<string> =>
    ipcRenderer.invoke("get-hermes-home", profile),

  getModelConfig: (
    profile?: string,
  ): Promise<{ provider: string; model: string; baseUrl: string }> =>
    ipcRenderer.invoke("get-model-config", profile),

  setModelConfig: (
    provider: string,
    model: string,
    baseUrl: string,
    profile?: string,
  ): Promise<boolean> =>
    ipcRenderer.invoke("set-model-config", provider, model, baseUrl, profile),

  // Connection mode (local / remote / ssh)
  isRemoteMode: (): Promise<boolean> => ipcRenderer.invoke("is-remote-mode"),
  isRemoteOnlyMode: (): Promise<boolean> =>
    ipcRenderer.invoke("is-remote-only-mode"),
  getConnectionConfig: (): Promise<{
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
  }> => ipcRenderer.invoke("get-connection-config"),

  setConnectionConfig: (
    mode: "local" | "remote" | "ssh",
    remoteUrl: string,
    apiKey?: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
  ): Promise<boolean> =>
    ipcRenderer.invoke(
      "set-connection-config",
      mode,
      remoteUrl,
      apiKey,
      gatewayRuntimePreset,
    ),

  setSshConfig: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    localPort: number,
    apiKey?: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
  ): Promise<boolean> =>
    ipcRenderer.invoke(
      "set-ssh-config",
      host,
      port,
      username,
      keyPath,
      remotePort,
      localPort,
      apiKey,
      gatewayRuntimePreset,
    ),

  diagnoseRemoteConnection: (
    url: string,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
    apiKey?: string,
  ): Promise<ConnectionDiagnostic> =>
    ipcRenderer.invoke(
      "diagnose-remote-connection",
      url,
      gatewayRuntimePreset,
      apiKey,
    ),

  testRemoteConnection: (url: string, apiKey?: string): Promise<boolean> =>
    ipcRenderer.invoke("test-remote-connection", url, apiKey),

  discoverDockerRuntimes: (): Promise<DockerRuntimeDiscovery> =>
    ipcRenderer.invoke("discover-docker-runtimes"),

  discoverAgentClis: (): Promise<AgentCliDiscovery> =>
    ipcRenderer.invoke("discover-agent-clis"),

  discoverBrowserHarness: (): Promise<BrowserHarnessDiscovery> =>
    ipcRenderer.invoke("discover-browser-harness"),

  browserHarnessDoctor: (): Promise<BrowserHarnessDoctorResult> =>
    ipcRenderer.invoke("browser-harness-doctor"),

  listAllOutputs: (profile?: string): Promise<OutputsListing> =>
    ipcRenderer.invoke("list-all-outputs", profile),
  listThreadOutputs: (threadId: string, profile?: string): Promise<ThreadOutputs> =>
    ipcRenderer.invoke("list-thread-outputs", threadId, profile),
  ensureThreadOutputDir: (threadId: string, profile?: string): Promise<string> =>
    ipcRenderer.invoke("ensure-thread-output-dir", threadId, profile),
  clearThreadOutputs: (threadId: string, profile?: string): Promise<boolean> =>
    ipcRenderer.invoke("clear-thread-outputs", threadId, profile),

  // Swarm (G2)
  listSwarmAgents: (): Promise<Array<{ id: string; message: string; status: "pending" | "running" | "done" | "failed" | "terminated"; tools: string[]; createdAt: number; result?: string; error?: string }>> =>
    ipcRenderer.invoke("list-swarm-agents"),
  getSwarmMessages: (): Promise<Array<{ id: string; fromId: string; toId: string; text: string; timestamp: number }>> =>
    ipcRenderer.invoke("get-swarm-messages"),
  createSwarmSubagent: (message: string): Promise<{ id: string; message: string; status: string; tools: string[]; createdAt: number } | null> =>
    ipcRenderer.invoke("create-swarm-subagent", message),
  terminateSwarmAgent: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("terminate-swarm-agent", id),
  clearSwarm: (): Promise<void> =>
    ipcRenderer.invoke("clear-swarm"),

  // Knowledge Vault (G3)
  listVaultFiles: (): Promise<Array<{ name: string; content: string; createdAt: number; updatedAt: number }>> =>
    ipcRenderer.invoke("list-vault-files"),
  readVaultFile: (name: string): Promise<{ name: string; content: string; createdAt: number; updatedAt: number } | null> =>
    ipcRenderer.invoke("read-vault-file", name),
  addVaultFile: (name: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke("add-vault-file", name, content),
  updateVaultFile: (name: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke("update-vault-file", name, content),
  deleteVaultFile: (name: string): Promise<boolean> =>
    ipcRenderer.invoke("delete-vault-file", name),
  searchVault: (query: string): Promise<Array<{ fileName: string; score: number; snippet: string }>> =>
    ipcRenderer.invoke("search-vault", query),

  // Approval Inbox (P8) — human-in-the-loop tool call approval
  approvalCreate: (input: { sessionId: string; toolName: string; command: string; reason: string; timeoutMs?: number }): Promise<{ id: string; sessionId: string; toolName: string; command: string; reason: string; status: string; createdAt: number; resolvedAt: number | null; timeoutMs?: number }> =>
    ipcRenderer.invoke("approval-create", input),
  approvalApprove: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("approval-approve", id),
  approvalDeny: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("approval-deny", id),
  approvalList: (includeAll?: boolean): Promise<Array<{ id: string; sessionId: string; toolName: string; command: string; reason: string; status: string; createdAt: number; resolvedAt: number | null; timeoutMs?: number }>> =>
    ipcRenderer.invoke("approval-list", includeAll),
  approvalHasPending: (): Promise<boolean> =>
    ipcRenderer.invoke("approval-has-pending"),

  listRuntimeProviders: (): Promise<RuntimeProviderSnapshot[]> =>
    ipcRenderer.invoke("list-runtime-providers"),

  runRuntimeProviderAction: (
    providerId: RuntimeProviderId,
    actionId: RuntimeProviderActionId,
  ): Promise<RuntimeProviderActionResult> =>
    ipcRenderer.invoke("run-runtime-provider-action", providerId, actionId),

  listTaskOrchestrators: (): Promise<TaskOrchestratorSnapshot[]> =>
    ipcRenderer.invoke("list-task-orchestrators"),

  diagnoseSshConnection: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    gatewayRuntimePreset?: GatewayRuntimePresetId,
    apiKey?: string,
  ): Promise<ConnectionDiagnostic> =>
    ipcRenderer.invoke(
      "diagnose-ssh-connection",
      host,
      port,
      username,
      keyPath,
      remotePort,
      gatewayRuntimePreset,
      apiKey,
    ),

  testSshConnection: (
    host: string,
    port: number,
    username: string,
    keyPath: string,
    remotePort: number,
    apiKey?: string,
  ): Promise<boolean> =>
    ipcRenderer.invoke(
      "test-ssh-connection",
      host,
      port,
      username,
      keyPath,
      remotePort,
      apiKey,
    ),

  isSshTunnelActive: (): Promise<boolean> =>
    ipcRenderer.invoke("is-ssh-tunnel-active"),

  startSshTunnel: (): Promise<boolean> =>
    ipcRenderer.invoke("start-ssh-tunnel"),

  stopSshTunnel: (): Promise<boolean> => ipcRenderer.invoke("stop-ssh-tunnel"),

  // Chat
  sendMessage: (
    message: string,
    profile?: string,
    resumeSessionId?: string,
    history?: Array<{ role: string; content: string }>,
    attachments?: Attachment[],
    contextFolder?: string,
  ): Promise<{ response: string; sessionId?: string }> =>
    ipcRenderer.invoke(
      "send-message",
      message,
      profile,
      resumeSessionId,
      history,
      attachments,
      contextFolder,
    ),

  abortChat: (): Promise<void> => ipcRenderer.invoke("abort-chat"),

  getApiServerKeyStatus: (profile?: string): Promise<{ hasKey: boolean }> =>
    ipcRenderer.invoke("get-api-server-key-status", profile),

  generateApiServerKey: (profile?: string): Promise<{ key: string }> =>
    ipcRenderer.invoke("generate-api-server-key", profile),

  copyToClipboard: (text: string): Promise<void> =>
    ipcRenderer.invoke("copy-to-clipboard", text),

  // Media (agent-generated images / files —issue #299)
  readMediaFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke("read-media-file", filePath),
  saveMediaFile: (src: string, name: string): Promise<boolean> =>
    ipcRenderer.invoke("save-media-file", src, name),
  mediaFileExists: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke("media-file-exists", filePath),
  showMediaMenu: (
    src: string,
    name: string,
    labels: { open: string; saveAs: string },
  ): void => {
    ipcRenderer.send("show-media-menu", src, name, labels);
  },

  // Resolve the absolute filesystem path for a File coming from drag-drop
  // or the file picker.  Returns "" for blobs that have no origin path
  // (e.g. clipboard paste) —caller should stageAttachment for those.
  getPathForFile: (file: File): string => {
    try {
      return webUtils.getPathForFile(file) || "";
    } catch {
      return "";
    }
  },

  stageAttachment: (
    sessionId: string,
    filename: string,
    base64Bytes: string,
  ): Promise<string> =>
    ipcRenderer.invoke("stage-attachment", sessionId, filename, base64Bytes),

  clearStagedAttachments: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke("clear-staged-attachments", sessionId),

  discoverProviderModels: (
    provider: string,
    baseUrl?: string,
    apiKey?: string,
    profile?: string,
  ): Promise<{
    models: string[];
    status: "ok" | "no-key" | "unsupported" | "unknown-host";
    cached: boolean;
    /** Subset of `models` flagged as free per the provider catalog
     *  (Nous Portal today). Optional —providers without pricing
     *  metadata return undefined. Issue #367. */
    freeModels?: string[];
  }> =>
    ipcRenderer.invoke(
      "discover-provider-models",
      provider,
      baseUrl,
      apiKey,
      profile,
    ),

  // V2.10.60: Local-LLM server scan. Probes Ollama :11434 and
  // LM Studio :1234 on 127.0.0.1 / ::1 (and any user-passed LAN
  // hosts) to answer the question "is there a local LLM runtime
  // already running on this machine?". Returns the raw probe
  // list + ready-to-paste `suggestions` for the Add/Edit modal.
  scanLocalServers: (extraHosts?: string[]): Promise<{
    scannedAt: string;
    hosts: string[];
    probes: Array<{
      host: string;
      port: number;
      provider: "ollama" | "lmstudio" | "custom";
      label: string;
      reachable: boolean;
      latencyMs: number;
      statusCode: number | null;
      error: string | null;
      baseUrl: string;
    }>;
    reachable: Array<{
      host: string;
      port: number;
      provider: "ollama" | "lmstudio" | "custom";
      label: string;
      reachable: boolean;
      latencyMs: number;
      statusCode: number | null;
      error: string | null;
      baseUrl: string;
    }>;
    suggestions: Array<{
      provider: "ollama" | "lmstudio";
      baseUrl: string;
      label: string;
    }>;
  }> => ipcRenderer.invoke("scan-local-servers", extraHosts ?? []),

  // V2.10.60: Per-card health probe for the green/red status dot
  // on saved Model cards. The renderer debounces these per card
  // (one in-flight request per card at a time, 10s minimum gap).
  probeLocalModelHealth: (
    baseUrl: string,
  ): Promise<{
    reachable: boolean;
    latencyMs: number;
    error: string | null;
  }> => ipcRenderer.invoke("probe-local-model-health", baseUrl),

  // V2.10.65: IronClaw Sandbox Tasks. The renderer SandboxTasks
  // screen calls these to probe the IronClaw gateway, list models,
  // and dispatch sandbox tasks. The bearer token is passed from
  // the renderer's connection form and is never persisted.
  ironclawProbe: (
    url: string,
    token?: string,
  ): Promise<{
    url: string;
    healthy: boolean;
    channel: string;
    status: string;
    latencyMs: number;
    error: string | null;
  }> => ipcRenderer.invoke("ironclaw-probe", url, token),

  ironclawModels: (
    url: string,
    token?: string,
  ): Promise<
    Array<{ id: string; ownedBy: string; created: number }>
  > => ipcRenderer.invoke("ironclaw-models", url, token),

  ironclawDispatch: (
    url: string,
    token: string | undefined,
    task: {
      model: string;
      message: string;
      contextFolder?: string;
    },
  ): Promise<{
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
  }> => ipcRenderer.invoke("ironclaw-dispatch", url, token, task),

  // V2.10.66: Agent-Reach internet capability status. Probes
  // whether agent-reach is installed and which channels are
  // configured. Never reads credentials.
  agentReachProbe: (): Promise<{
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
  }> => ipcRenderer.invoke("agent-reach-probe"),

  // V2.10.67: Auto-discovery — scan localhost for running runtime
  // gateways. Returns discovered runtimes sorted by health.
  autoDiscoveryScan: (): Promise<{
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
  }> => ipcRenderer.invoke("auto-discovery-scan"),

  onChatChunk: (callback: (chunk: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string): void =>
      callback(chunk);
    ipcRenderer.on("chat-chunk", handler);
    return () => ipcRenderer.removeListener("chat-chunk", handler);
  },

  /** Streaming reasoning / thinking tokens —separate from `onChatChunk`
   *  so the renderer can render a "thinking" bubble that grows
   *  independently of the assistant's content (#352). */
  onChatReasoningChunk: (callback: (chunk: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: string): void =>
      callback(chunk);
    ipcRenderer.on("chat-reasoning-chunk", handler);
    return () => ipcRenderer.removeListener("chat-reasoning-chunk", handler);
  },

  onChatDone: (callback: (sessionId?: string) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      sessionId?: string,
    ): void => callback(sessionId);
    ipcRenderer.on("chat-done", handler);
    return () => ipcRenderer.removeListener("chat-done", handler);
  },

  onContextMenuCopyChat: (
    callback: (format: "text" | "markdown") => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      format: "text" | "markdown",
    ): void => callback(format);
    ipcRenderer.on("context-menu-copy-chat", handler);
    return () => ipcRenderer.removeListener("context-menu-copy-chat", handler);
  },

  onContextMenuSelectBubble: (
    callback: (point: { x: number; y: number }) => void,
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      point: { x: number; y: number },
    ): void => callback(point);
    ipcRenderer.on("context-menu-select-bubble", handler);
    return () =>
      ipcRenderer.removeListener("context-menu-select-bubble", handler);
  },

  onChatToolProgress: (callback: (tool: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, tool: string): void =>
      callback(tool);
    ipcRenderer.on("chat-tool-progress", handler);
    return () => ipcRenderer.removeListener("chat-tool-progress", handler);
  },

  onChatUsage: (
    callback: (usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost?: number;
      rateLimitRemaining?: number;
      rateLimitReset?: number;
    }) => void,
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, usage: unknown): void =>
      callback(
        usage as {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          cost?: number;
          rateLimitRemaining?: number;
          rateLimitReset?: number;
        },
      );
    ipcRenderer.on("chat-usage", handler);
    return () => ipcRenderer.removeListener("chat-usage", handler);
  },

  onChatError: (callback: (error: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: string): void =>
      callback(error);
    ipcRenderer.on("chat-error", handler);
    return () => ipcRenderer.removeListener("chat-error", handler);
  },

  // Gateway
  startGateway: (): Promise<boolean> => ipcRenderer.invoke("start-gateway"),
  stopGateway: (): Promise<boolean> => ipcRenderer.invoke("stop-gateway"),
  gatewayStatus: (): Promise<boolean> => ipcRenderer.invoke("gateway-status"),

  // Platform toggles
  getPlatformEnabled: (profile?: string): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke("get-platform-enabled", profile),
  setPlatformEnabled: (
    platform: string,
    enabled: boolean,
    profile?: string,
  ): Promise<boolean> =>
    ipcRenderer.invoke("set-platform-enabled", platform, enabled, profile),

  // Sessions
  listSessions: (
    limit?: number,
    offset?: number,
  ): Promise<
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
  > => ipcRenderer.invoke("list-sessions", limit, offset),

  getSessionMessages: (
    sessionId: string,
  ): Promise<
    Array<{
      id: number;
      role: "user" | "assistant";
      content: string;
      timestamp: number;
      attachments?: Attachment[];
    }>
  > => ipcRenderer.invoke("get-session-messages", sessionId),

  // Profiles
  listProfiles: (): Promise<
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
  > => ipcRenderer.invoke("list-profiles"),

  createProfile: (
    name: string,
    clone: boolean,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("create-profile", name, clone),

  deleteProfile: (
    name: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("delete-profile", name),

  setActiveProfile: (name: string): Promise<boolean> =>
    ipcRenderer.invoke("set-active-profile", name),

  // Memory
  readMemory: (
    profile?: string,
  ): Promise<{
    memory: { content: string; exists: boolean; lastModified: number | null };
    user: { content: string; exists: boolean; lastModified: number | null };
    stats: { totalSessions: number; totalMessages: number };
  }> => ipcRenderer.invoke("read-memory", profile),

  addMemoryEntry: (
    content: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("add-memory-entry", content, profile),
  updateMemoryEntry: (
    index: number,
    content: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("update-memory-entry", index, content, profile),
  removeMemoryEntry: (index: number, profile?: string): Promise<boolean> =>
    ipcRenderer.invoke("remove-memory-entry", index, profile),
  writeUserProfile: (
    content: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("write-user-profile", content, profile),

  // Wiki (Karpathy-pattern 3-layer memory: raw / wiki / schema)
  wikiGetStatus: (profile?: string): Promise<{
    wikiHome: string;
    rawDir: string;
    indexPath: string;
    logPath: string;
    schemaPath: string;
    indexExists: boolean;
    logExists: boolean;
    schemaExists: boolean;
    rawSourceCount: number;
  }> => ipcRenderer.invoke("wiki-get-status", profile),
  wikiBootstrap: (profile?: string): Promise<{
    created: string[];
    alreadyExists: string[];
  }> => ipcRenderer.invoke("wiki-bootstrap", profile),
  wikiReadIndex: (profile?: string): Promise<{
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
  }> => ipcRenderer.invoke("wiki-read-index", profile),
  wikiWriteIndex: (
    content: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("wiki-write-index", content, profile),
  wikiReadLog: (profile?: string): Promise<{
    raw: string;
    entries: Array<{ raw: string; iso: string; kind: string; title: string }>;
    lastModified: number | null;
    exists: boolean;
  }> => ipcRenderer.invoke("wiki-read-log", profile),
  wikiAppendLog: (
    kind: "ingest" | "query" | "lint" | "synthesis" | "edit",
    title: string,
    body: string | undefined,
    profile?: string,
  ): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("wiki-append-log", kind, title, body, profile),
  wikiListSources: (profile?: string): Promise<{
    items: Array<{
      name: string;
      relPath: string;
      size: number;
      lastModified: number;
    }>;
    total: number;
  }> => ipcRenderer.invoke("wiki-list-sources", profile),
  wikiReadSchema: (profile?: string): Promise<{
    content: string;
    exists: boolean;
    lastModified: number | null;
  }> => ipcRenderer.invoke("wiki-read-schema", profile),
  wikiReadPage: (
    relPath: string,
    profile?: string,
  ): Promise<{ content: string; exists: boolean; lastModified: number | null }> =>
    ipcRenderer.invoke("wiki-read-page", relPath, profile),
  wikiWritePage: (
    relPath: string,
    content: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("wiki-write-page", relPath, content, profile),

  // Soul
  readSoul: (profile?: string): Promise<string> =>
    ipcRenderer.invoke("read-soul", profile),
  writeSoul: (content: string, profile?: string): Promise<boolean> =>
    ipcRenderer.invoke("write-soul", content, profile),
  resetSoul: (profile?: string): Promise<string> =>
    ipcRenderer.invoke("reset-soul", profile),

  // Tools
  getToolsets: (
    profile?: string,
  ): Promise<
    Array<{ key: string; label: string; description: string; enabled: boolean }>
  > => ipcRenderer.invoke("get-toolsets", profile),
  setToolsetEnabled: (
    key: string,
    enabled: boolean,
    profile?: string,
  ): Promise<boolean> =>
    ipcRenderer.invoke("set-toolset-enabled", key, enabled, profile),

  // File-to-Markdown converter (Step 4 of the harvest rollout).
  // Routes a file path through the converter chain (markitdown CLI
  // when available, otherwise pure-JS fallbacks for text/json/csv/html).
  convertFileToMarkdown: (
    filePath: string,
  ): Promise<
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
  > => ipcRenderer.invoke("convert-file-to-markdown", filePath),
  isMarkitdownAvailable: (): Promise<{ available: boolean }> =>
    ipcRenderer.invoke("is-markitdown-available"),
  /** Ingest a file into the wiki: convert to markdown, write into
   *  `raw/sources/`, append a log entry. Returns the conversion
   *  outcome + the relative path the file landed at. */
  wikiIngestFileAsMarkdown: (
    filePath: string,
    title?: string,
    profile?: string,
  ): Promise<{
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
  }> => ipcRenderer.invoke("wiki-ingest-file-as-markdown", filePath, title, profile),

  // Design Dials (Step 5 of the harvest rollout). Each dial is a
  // 0..100 number persisted to <profile>/design-dials.json and
  // injected into the agent's system prompt as a soft style hint.
  getDesignDials: (profile?: string): Promise<{
    variance: number;
    motion: number;
    density: number;
  }> => ipcRenderer.invoke("get-design-dials", profile),
  setDesignDials: (
    dials: { variance?: number; motion?: number; density?: number },
    profile?: string,
  ): Promise<{
    variance: number;
    motion: number;
    density: number;
  }> => ipcRenderer.invoke("set-design-dials", dials, profile),

  // Skills
  listInstalledSkills: (
    profile?: string,
  ): Promise<
    Array<{ name: string; category: string; description: string; path: string }>
  > => ipcRenderer.invoke("list-installed-skills", profile),
  listBundledSkills: (): Promise<
    Array<{
      name: string;
      description: string;
      category: string;
      source: string;
      installed: boolean;
    }>
  > => ipcRenderer.invoke("list-bundled-skills"),
  getSkillContent: (skillPath: string): Promise<string> =>
    ipcRenderer.invoke("get-skill-content", skillPath),
  getDesktopBundledSkillPath: (name: string): Promise<string | null> =>
    ipcRenderer.invoke("get-desktop-bundled-skill-path", name),
  installSkill: (
    identifier: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("install-skill", identifier, profile),
  uninstallSkill: (
    name: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("uninstall-skill", name, profile),

  // Session cache (fast local cache with generated titles)
  listCachedSessions: (
    limit?: number,
    offset?: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
    }>
  > => ipcRenderer.invoke("list-cached-sessions", limit, offset),

  syncSessionCache: (): Promise<
    Array<{
      id: string;
      title: string;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
    }>
  > => ipcRenderer.invoke("sync-session-cache"),

  updateSessionTitle: (sessionId: string, title: string): Promise<void> =>
    ipcRenderer.invoke("update-session-title", sessionId, title),
  deleteSession: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke("delete-session", sessionId),

  // Session search
  searchSessions: (
    query: string,
    limit?: number,
  ): Promise<
    Array<{
      sessionId: string;
      title: string | null;
      startedAt: number;
      source: string;
      messageCount: number;
      model: string;
      snippet: string;
    }>
  > => ipcRenderer.invoke("search-sessions", query, limit),

  // Credential Pool (profile-aware: reads/writes the named profile's
  // auth.json; defaults to the currently active profile when omitted)
  //
  // Pool entries follow the upstream engine schema (issue #367) —
  // `access_token` for the secret, `auth_type` to distinguish OAuth
  // from API key, plus `id`/`priority`/`source` for rotation.
  getCredentialPool: (
    profile?: string,
  ): Promise<Record<string, Array<CredentialPoolEntry>>> =>
    ipcRenderer.invoke("get-credential-pool", profile),
  setCredentialPool: (
    provider: string,
    entries: Array<CredentialPoolEntry>,
    profile?: string,
  ): Promise<boolean> =>
    ipcRenderer.invoke("set-credential-pool", provider, entries, profile),
  // Add a manually-typed key as a properly-shaped pool entry. Returns
  // the updated entries list for the provider.
  addCredentialPoolEntry: (
    provider: string,
    apiKey: string,
    label: string,
    profile?: string,
  ): Promise<Array<CredentialPoolEntry>> =>
    ipcRenderer.invoke(
      "add-credential-pool-entry",
      provider,
      apiKey,
      label,
      profile,
    ),

  // Models
  listModels: (): Promise<
    Array<{
      id: string;
      name: string;
      provider: string;
      model: string;
      baseUrl: string;
      createdAt: number;
    }>
  > => ipcRenderer.invoke("list-models"),

  addModel: (
    name: string,
    provider: string,
    model: string,
    baseUrl: string,
  ): Promise<{
    id: string;
    name: string;
    provider: string;
    model: string;
    baseUrl: string;
    createdAt: number;
  }> => ipcRenderer.invoke("add-model", name, provider, model, baseUrl),

  removeModel: (id: string): Promise<boolean> =>
    ipcRenderer.invoke("remove-model", id),

  updateModel: (id: string, fields: Record<string, string>): Promise<boolean> =>
    ipcRenderer.invoke("update-model", id, fields),
  // Updates
  checkForUpdates: (): Promise<string | null> =>
    ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: (): Promise<boolean> => ipcRenderer.invoke("download-update"),
  installUpdate: (): Promise<void> => ipcRenderer.invoke("install-update"),
  getAppVersion: (): Promise<string> => ipcRenderer.invoke("get-app-version"),

  onUpdateAvailable: (
    callback: (info: { version: string; releaseNotes: string }) => void,
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown): void =>
      callback(info as { version: string; releaseNotes: string });
    ipcRenderer.on("update-available", handler);
    return () => ipcRenderer.removeListener("update-available", handler);
  },

  onUpdateDownloadProgress: (
    callback: (info: { percent: number }) => void,
  ): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, info: unknown): void =>
      callback(info as { percent: number });
    ipcRenderer.on("update-download-progress", handler);
    return () =>
      ipcRenderer.removeListener("update-download-progress", handler);
  },

  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const handler = (): void => callback();
    ipcRenderer.on("update-downloaded", handler);
    return () => ipcRenderer.removeListener("update-downloaded", handler);
  },

  onUpdateError: (callback: (message: string) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      message: unknown,
    ): void => callback(String(message));
    ipcRenderer.on("update-error", handler);
    return () => ipcRenderer.removeListener("update-error", handler);
  },

  // Menu events (from native menu bar)
  onMenuNewChat: (callback: () => void): (() => void) => {
    const handler = (): void => callback();
    ipcRenderer.on("menu-new-chat", handler);
    return () => ipcRenderer.removeListener("menu-new-chat", handler);
  },

  onMenuSearchSessions: (callback: () => void): (() => void) => {
    const handler = (): void => callback();
    ipcRenderer.on("menu-search-sessions", handler);
    return () => ipcRenderer.removeListener("menu-search-sessions", handler);
  },

  // Cron Jobs
  listCronJobs: (
    includeDisabled?: boolean,
    profile?: string,
  ): Promise<
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
  > => ipcRenderer.invoke("list-cron-jobs", includeDisabled, profile),

  createCronJob: (
    schedule: string,
    prompt?: string,
    name?: string,
    deliver?: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke(
      "create-cron-job",
      schedule,
      prompt,
      name,
      deliver,
      profile,
    ),

  removeCronJob: (
    jobId: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("remove-cron-job", jobId, profile),

  pauseCronJob: (
    jobId: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("pause-cron-job", jobId, profile),

  resumeCronJob: (
    jobId: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("resume-cron-job", jobId, profile),

  triggerCronJob: (
    jobId: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("trigger-cron-job", jobId, profile),

  // Kanban (plan dispatch only — board UI removed, task creation
  // and dispatch retained for the Plans screen's Dispatch button)
  kanbanCreateTask: (
    input: {
      title: string;
      body?: string;
      assignee?: string;
      priority?: number;
      tenant?: string;
      workspace?: string;
      triage?: boolean;
      skills?: string[];
      maxRetries?: number;
    },
    profile?: string,
  ) => ipcRenderer.invoke("kanban-create-task", input, profile),
  kanbanDispatchOnce: (dryRun?: boolean, profile?: string) =>
    ipcRenderer.invoke("kanban-dispatch-once", dryRun, profile),

  // CodeGraph
  codegraphCliStatus: (): Promise<CodeGraphCliStatus> =>
    ipcRenderer.invoke("codegraph-cli-status"),
  codegraphInstallCli: (): Promise<{
    success: boolean;
    status?: CodeGraphCliStatus;
    error?: string;
  }> => ipcRenderer.invoke("codegraph-install-cli"),
  codegraphSetupHermes: (): Promise<{
    success: boolean;
    output?: string;
    error?: string;
  }> => ipcRenderer.invoke("codegraph-setup-hermes"),
  codegraphProjectStatus: (
    projectPath: string,
  ): Promise<{ success: boolean; status?: CodeGraphProjectStatus; error?: string }> =>
    ipcRenderer.invoke("codegraph-project-status", projectPath),
  codegraphInitProject: (
    projectPath: string,
  ): Promise<{ success: boolean; status?: CodeGraphProjectStatus; error?: string }> =>
    ipcRenderer.invoke("codegraph-init-project", projectPath),
  codegraphBuildContext: (
    projectPath: string,
    prompt: string,
  ): Promise<{ success: boolean; context?: string; error?: string }> =>
    ipcRenderer.invoke("codegraph-build-context", projectPath, prompt),
  // CodeGraph runtime (embedded library). When the npm package
  // @colbymchenry/codegraph is installed, these channels talk
  // straight to the SDK without spawning a CLI. When the SDK is
  // missing, `codegraphRuntimeStatus` reports
  // `sdkInstalled: false` and the renderer renders the existing
  // "install CLI" CTA. The runtime path is purely additive.
  codegraphRuntimeStatus: (): Promise<{
    available: boolean;
    sdkInstalled: boolean;
    projectOpen: boolean;
    projectPath: string | null;
    sdkVersion: string | null;
    reason?: string;
  }> => ipcRenderer.invoke("codegraph-runtime-status"),
  codegraphRuntimeOpen: (
    projectPath: string,
  ): Promise<{
    success: boolean;
    projectPath: string;
    nodeCount: number | null;
    fileCount: number | null;
    error?: string;
  }> => ipcRenderer.invoke("codegraph-runtime-open", projectPath),
  codegraphRuntimeClose: (
    projectPath: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("codegraph-runtime-close", projectPath),
  codegraphRuntimeSearch: (
    projectPath: string,
    query: string,
    options?: { limit?: number },
  ): Promise<{
    success: boolean;
    hits: Array<{
      id: string;
      name: string;
      kind: string;
      filePath: string | null;
      startLine: number | null;
      endLine: number | null;
      score: number;
      snippet: string | null;
    }>;
    error?: string;
  }> => ipcRenderer.invoke("codegraph-runtime-search", projectPath, query, options),
  codegraphRuntimeImpact: (
    projectPath: string,
    nodeId: string,
    maxDepth?: number,
  ): Promise<{
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
  }> => ipcRenderer.invoke("codegraph-runtime-impact", projectPath, nodeId, maxDepth),
  codegraphRuntimeStats: (
    projectPath: string,
  ): Promise<{
    success: boolean;
    stats: {
      nodeCount: number;
      edgeCount: number;
      fileCount: number;
      languages: string[];
    } | null;
    error?: string;
  }> => ipcRenderer.invoke("codegraph-runtime-stats", projectPath),
  selectFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("select-folder"),
  readDirectory: (
    dirPath: string,
  ): Promise<{ name: string; isDirectory: boolean }[] | null> =>
    ipcRenderer.invoke("read-directory", dirPath),
  readFile: (
    filePath: string,
    maxBytes?: number,
  ): Promise<{ content: string; truncated: boolean } | null> =>
    ipcRenderer.invoke("read-file", filePath, maxBytes),
  openFileInEditor: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke("open-file-in-editor", filePath),
  readImageFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke("read-image-file", filePath),

  // EverOS — long-term memory harnesses backed by a self-hosted
  // EverCore / EverOS server (https://github.com/JZKK720/EverOS).
  // The desktop can drive EverOS via HTTP even when the local
  // runtime is not installed; the renderer just needs a reachable
  // base URL (configured via everosSaveConfig).
  everosGetConfig: (): Promise<EverOsConfig> =>
    ipcRenderer.invoke("everos-get-config"),
  everosSaveConfig: (patch: Partial<EverOsConfig>): Promise<EverOsConfig> =>
    ipcRenderer.invoke("everos-save-config", patch),
  everosPing: (patch?: Partial<EverOsConfig>): Promise<EverOsHealthStatus> =>
    ipcRenderer.invoke("everos-ping", patch),
  everosAddMemory: (
    messages: EverOsMessageInput[],
    patch?: Partial<EverOsConfig>,
  ): Promise<EverOsAddResult> =>
    ipcRenderer.invoke("everos-add-memory", messages, patch),
  everosSearch: (
    query: string,
    options?: { topK?: number; method?: "hybrid" | "keyword" | "vector" },
    patch?: Partial<EverOsConfig>,
  ): Promise<EverOsSearchResult> =>
    ipcRenderer.invoke("everos-search", query, options, patch),
  everosListRecent: (
    limit?: number,
    patch?: Partial<EverOsConfig>,
  ): Promise<EverOsRecentResult> =>
    ipcRenderer.invoke("everos-list-recent", limit, patch),

  // EverOS sidecar (lifecycle manager around the
  // `everos server start` Python process). Purely additive —
  // the existing `everos:*` HTTP channels above keep working
  // against any reachable EverOS instance, sidecar or not. The
  // renderer uses these channels to draw a "running / starting /
  // stopped / crashed" pill and surface the last-error line
  // without polling the HTTP endpoint.
  everosSidecarStatus: (): Promise<{
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
  }> => ipcRenderer.invoke("everos-sidecar-status"),
  everosSidecarStart: (options?: {
    port?: number;
    host?: string;
  }): Promise<{
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
  }> => ipcRenderer.invoke("everos-sidecar-start", options),
  everosSidecarStop: (): Promise<{
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
  }> => ipcRenderer.invoke("everos-sidecar-stop"),
  everosSidecarRestart: (options?: {
    port?: number;
    host?: string;
  }): Promise<{
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
  }> => ipcRenderer.invoke("everos-sidecar-restart", options),
  everosSidecarLogTail: (): Promise<{
    lines: string[];
    totalBytes: number;
  }> => ipcRenderer.invoke("everos-sidecar-log-tail"),
  everosSidecarClearLogs: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("everos-sidecar-clear-logs"),

  // Headroom proxy (context compression for LLM calls).
  // The renderer uses these channels to manage the Headroom
  // proxy sidecar and to compress messages before they reach
  // the LLM provider.
  headroomGetConfig: (): Promise<{
    baseUrl: string;
    mode: "audit" | "optimize";
    enabled: boolean;
    apiKey: string | null;
  }> => ipcRenderer.invoke("headroom-get-config"),
  headroomSaveConfig: (patch: Partial<{
    baseUrl: string;
    mode: "audit" | "optimize";
    enabled: boolean;
    apiKey: string | null;
  }>): Promise<{
    baseUrl: string;
    mode: "audit" | "optimize";
    enabled: boolean;
    apiKey: string | null;
  }> => ipcRenderer.invoke("headroom-save-config", patch),
  headroomPing: (): Promise<{
    reachable: boolean;
    status: string | null;
    detail: string | null;
    version: string | null;
    scannedAt: string;
  }> => ipcRenderer.invoke("headroom-ping"),
  headroomCompress: (
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string | null;
      name?: string;
      tool_call_id?: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }>,
    model?: string,
  ): Promise<{
    success: boolean;
    messages: Array<{
      role: "system" | "user" | "assistant" | "tool";
      content: string | null;
      name?: string;
      tool_call_id?: string;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }>;
    tokensBefore: number;
    tokensAfter: number;
    savingsPercent: number;
    compressed: boolean;
    error?: string;
  }> => ipcRenderer.invoke("headroom-compress", messages, model),
  headroomRetrieve: (cacheKey: string): Promise<{
    success: boolean;
    content: string | null;
    error?: string;
  }> => ipcRenderer.invoke("headroom-retrieve", cacheKey),
  headroomStats: (): Promise<{
    success: boolean;
    totalRequests: number;
    totalTokensSaved: number;
    totalTokensBefore: number;
    totalTokensAfter: number;
    avgSavingsPercent: number;
    ccrEntries: number;
    uptimeSeconds: number;
    error?: string;
  }> => ipcRenderer.invoke("headroom-stats"),
  headroomSidecarStatus: (): Promise<{
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
  }> => ipcRenderer.invoke("headroom-sidecar-status"),
  headroomSidecarStart: (options?: {
    port?: number;
    host?: string;
    mode?: "audit" | "optimize";
  }): Promise<{
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
  }> => ipcRenderer.invoke("headroom-sidecar-start", options),
  headroomSidecarStop: (): Promise<{
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
  }> => ipcRenderer.invoke("headroom-sidecar-stop"),
  headroomSidecarRestart: (options?: {
    port?: number;
    host?: string;
    mode?: "audit" | "optimize";
  }): Promise<{
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
  }> => ipcRenderer.invoke("headroom-sidecar-restart", options),
  headroomSidecarLogTail: (): Promise<{
    lines: string[];
    totalBytes: number;
  }> => ipcRenderer.invoke("headroom-sidecar-log-tail"),
  headroomSidecarClearLogs: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("headroom-sidecar-clear-logs"),

  // GBrain health probe. GBrain's local mode is stdio MCP (no HTTP
  // port to probe), so we call `gbrain doctor --json` and parse the
  // result. Returns { installed: false } when gbrain is not on PATH.
  gbrainProbe: (): Promise<{
    installed: boolean;
    healthy: boolean;
    version: string | null;
    failingChecks: number;
    totalChecks: number;
    summary: string;
    raw: unknown;
  }> => ipcRenderer.invoke("gbrain-probe"),

  // Voice STT transcription. The renderer captures audio via
  // MediaRecorder and sends the buffer to the main process, which
  // forwards it to the configured STT provider (Groq or OpenAI
  // Whisper). Audio never touches disk. Returns transcribed text.
  voiceTranscribe: (
    audioBuffer: Buffer,
  ): Promise<{
    success: boolean;
    text: string;
    error: string | null;
    provider: "groq" | "openai" | null;
  }> => ipcRenderer.invoke("voice-transcribe", audioBuffer),

  // Voice TTS synthesis. Sends text + optional voice to the main
  // process, which calls OpenAI TTS (hardcoded tts-1). Returns an
  // MP3 buffer the renderer plays. Same VOICE_TOOLS_OPENAI_KEY.
  voiceSynthesize: (
    text: string,
    voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
  ): Promise<{
    success: boolean;
    audio: Buffer | null;
    error: string | null;
  }> => ipcRenderer.invoke("voice-synthesize", text, voice),

  // Handy local-first STT. Detect whether the Handy app is on PATH.
  // Toggle/cancel control a running Handy instance. Text is pasted
  // into the focused textarea by Handy —no audio crosses IPC.
  handyDetect: (): Promise<boolean> => ipcRenderer.invoke("handy-detect"),
  handyToggle: (): Promise<{
    success: boolean;
    error: string | null;
  }> => ipcRenderer.invoke("handy-toggle"),
  handyCancel: (): Promise<{
    success: boolean;
    error: string | null;
  }> => ipcRenderer.invoke("handy-cancel"),

  // Graphify discovery + version probe. Graphify builds a concept
  // knowledge graph from any folder (code, docs, papers).
  graphifyDiscover: (): Promise<{
    scannedAt: string;
    installed: boolean;
    detectedCommand: string | null;
    resolvedPath: string | null;
  }> => ipcRenderer.invoke("graphify-discover"),
  graphifyVersion: (): Promise<{
    ok: boolean;
    exitCode: number;
    version: string | null;
    output: string;
    scannedAt: string;
  }> => ipcRenderer.invoke("graphify-version"),

  // Agent eval framework. Runs task fixtures against the gateway
  // and returns a pass/fail report.
  evalRun: (
    options: {
      gatewayUrl: string;
      apiKey?: string;
      model?: string;
    },
  ): Promise<{
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
  }> => ipcRenderer.invoke("eval-run", options),

  // Skill sharing via git URL. Clones the repo, scans with
  // SkillSpector, copies to the profile skills directory.
  skillInstallGit: (
    gitUrl: string,
    skillName?: string,
    skillRelPath?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> =>
    ipcRenderer.invoke("skill-install-git", gitUrl, skillName, skillRelPath),

  // Headroom MCP server (local MCP server wrapping the Headroom proxy).
  // Mirrors the sidecar lifecycle but for the MCP server process.
  headroomMcpStatus: (): Promise<{
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
  }> => ipcRenderer.invoke("headroom-mcp-status"),
  headroomMcpLogTail: (): Promise<{
    lines: string[];
    totalBytes: number;
  }> => ipcRenderer.invoke("headroom-mcp-log-tail"),
  headroomMcpClearLogs: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("headroom-mcp-clear-logs"),
  headroomMcpStart: (options?: {
    port?: number;
    host?: string;
    serverScriptPath?: string;
  }): Promise<{
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
  }> => ipcRenderer.invoke("headroom-mcp-start", options),
  headroomMcpStop: (): Promise<{
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
  }> => ipcRenderer.invoke("headroom-mcp-stop"),
  headroomMcpRestart: (options?: {
    port?: number;
    host?: string;
    serverScriptPath?: string;
  }): Promise<{
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
  }> => ipcRenderer.invoke("headroom-mcp-restart", options),

  // Headroom learn (failure mining via upstream `headroom learn`).
  headroomLearnRun: (options: {
    projectPath: string;
    model?: string;
    agent?: "auto" | "claude" | "codex" | "gemini";
    apply?: boolean;
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    report?: {
      generatedAt: string;
      projectPath: string;
      sessionCount: number;
      totalRecommendations: number;
      outputFiles: string[];
      proposals: Array<{
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
      }>;
      rawOutput: string;
      durationMs: number;
    };
    error?: string;
    skipReason?: string;
  }> => ipcRenderer.invoke("headroom-learn-run", options),
  headroomLearnLastReport: (): Promise<{
    generatedAt: string;
    projectPath: string;
    sessionCount: number;
    totalRecommendations: number;
    outputFiles: string[];
    proposals: Array<{
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
    }>;
    rawOutput: string;
    durationMs: number;
  } | null> => ipcRenderer.invoke("headroom-learn-last-report"),
  headroomLearnStop: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke("headroom-learn-stop"),
  headroomLearnCommit: (
    proposals: Array<{
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
    }>,
    profile?: string,
  ): Promise<unknown[]> => ipcRenderer.invoke("headroom-learn-commit", proposals, profile),

  // Headroom learn — apply (`--apply`): runs the upstream
  // CLI's apply pass against the local project and returns
  // per-file before/after snapshots. The renderer shows a
  // diff preview and exposes a "Revert" action that restores
  // the prior content.
  headroomLearnApply: (options: {
    projectPath: string;
    model?: string;
    agent?: "auto" | "claude" | "codex" | "gemini";
    timeoutMs?: number;
  }): Promise<{
    success: boolean;
    diffs: Array<{
      path: string;
      created: boolean;
      before: string;
      after: string;
    }>;
    report?: {
      generatedAt: string;
      projectPath: string;
      sessionCount: number;
      totalRecommendations: number;
      outputFiles: string[];
      proposals: Array<{
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
      }>;
      rawOutput: string;
      durationMs: number;
    };
    error?: string;
    skipReason?: string;
  }> => ipcRenderer.invoke("headroom-learn-apply", options),
  headroomLearnRevert: (
    diffs: Array<{
      path: string;
      created: boolean;
      before: string;
      after: string;
    }>,
  ): Promise<{
    success: boolean;
    reverted: string[];
    error?: string;
  }> => ipcRenderer.invoke("headroom-learn-revert", diffs),

  // Shell
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke("open-external", url),

  // Reveal the data directory in the OS file browser. Returns the
  // empty string on success and an error message on failure (e.g.
  // when the user is in remote / SSH mode where there is no local
  // folder to open).
  openDataFolder: (profile?: string): Promise<string> =>
    ipcRenderer.invoke("open-data-folder", profile),

  // Backup / Import
  runHermesBackup: (
    profile?: string,
  ): Promise<{ success: boolean; path?: string; error?: string }> =>
    ipcRenderer.invoke("run-hermes-backup", profile),

  runHermesImport: (
    archivePath: string,
    profile?: string,
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("run-hermes-import", archivePath, profile),

  // Debug dump
  runHermesDump: (): Promise<string> => ipcRenderer.invoke("run-hermes-dump"),

  // Memory providers
  discoverMemoryProviders: (
    profile?: string,
  ): Promise<
    Array<{
      name: string;
      description: string;
      installed: boolean;
      active: boolean;
      envVars: string[];
    }>
  > => ipcRenderer.invoke("discover-memory-providers", profile),

  // Codebase Memory binary discovery
  discoverCodebaseMemory: (): Promise<{
    found: boolean;
    path: string | null;
    version: string | null;
  }> => ipcRenderer.invoke("discover-codebase-memory"),
  listCodebaseMemoryProjects: (): Promise<Array<{
    name: string;
    rootPath: string;
    nodes: number;
    edges: number;
    sizeBytes: number;
  }>> => ipcRenderer.invoke("list-codebase-memory-projects"),
  discoverLast30Days: (): Promise<{
    found: boolean;
    scriptPath: string | null;
    cliOnPath: boolean;
    version: string | null;
  }> => ipcRenderer.invoke("discover-last30days"),

  // Moo Tasks sidecar (agent-native kanban board)
  mooTasksSidecarStatus: (): Promise<{
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
  }> => ipcRenderer.invoke("moo-tasks-sidecar-status"),
  mooTasksSidecarStart: (options?: {
    port?: number;
    host?: string;
    projectDir?: string;
  }) =>
    ipcRenderer.invoke("moo-tasks-sidecar-start", options),
  mooTasksSidecarStop: () =>
    ipcRenderer.invoke("moo-tasks-sidecar-stop"),
  mooTasksSidecarRestart: (options?: {
    port?: number;
    host?: string;
    projectDir?: string;
  }) =>
    ipcRenderer.invoke("moo-tasks-sidecar-restart", options),
  mooTasksSidecarLogTail: (): Promise<{
    lines: string[];
    totalBytes: number;
  }> => ipcRenderer.invoke("moo-tasks-sidecar-log-tail"),
  mooTasksSidecarClearLogs: () =>
    ipcRenderer.invoke("moo-tasks-sidecar-clear-logs"),

  // MCP servers
  listMcpServers: (
    profile?: string,
  ): Promise<
    Array<{ name: string; type: string; enabled: boolean; detail: string }>
  > => ipcRenderer.invoke("list-mcp-servers", profile),
  setMcpServerEnabled: (
    name: string,
    enabled: boolean,
    profile?: string,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("set-mcp-server-enabled", name, enabled, profile),
  addMcpServer: (
    entry: {
      name: string;
      type: "http" | "stdio";
      enabled: boolean;
      detail: string;
    },
    profile?: string,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("add-mcp-server", entry, profile),
  removeMcpServer: (
    name: string,
    profile?: string,
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("remove-mcp-server", name, profile),

  // Log viewer
  readLogs: (
    logFile?: string,
    lines?: number,
  ): Promise<{ content: string; path: string }> =>
    ipcRenderer.invoke("read-logs", logFile, lines),
  // Plans / Orchestrator surface (Step 7 of the harvest rollout).
  // Each plan is a parsed markdown RFC: ordered steps with
  // owner / depends-on / skills / tags, persisted to
  // <profile>/plans/<id>/plan.json. Dispatch shells the steps
  // out to the Kanban orchestrator as backlog tasks.
  plansParse: (title: string, markdown: string) =>
    ipcRenderer.invoke("plans-parse", title, markdown),
  plansSave: (
    plan: {
      id: string;
      title: string;
      markdown: string;
      steps: Array<{
        id: string;
        title: string;
        body: string;
        owner: string | null;
        dependsOn: string[];
        skills: string[];
        tags: string[];
      }>;
      createdAt: string;
      dispatchedAt: string | null;
    },
    profile?: string,
  ) => ipcRenderer.invoke("plans-save", plan, profile),
  plansList: (profile?: string) =>
    ipcRenderer.invoke("plans-list", profile),
  plansGet: (id: string, profile?: string) =>
    ipcRenderer.invoke("plans-get", id, profile),
  plansDelete: (id: string, profile?: string) =>
    ipcRenderer.invoke("plans-delete", id, profile),
  plansDispatch: (id: string, profile?: string) =>
    ipcRenderer.invoke("plans-dispatch", id, profile),

  // Careful (Step 9 of the V2 rollout, ported from gstack's
  // /careful). Verdict is `safe | warn | block`; the renderer can
  // show a confirm dialog before running a destructive command, or
  // before dispatching a plan whose body contains one.
  carefulCheck: (command: string) =>
    ipcRenderer.invoke("careful-check", command),
  carefulFindInBody: (body: string) =>
    ipcRenderer.invoke("careful-find-in-body", body),
  carefulIsDestructive: (command: string) =>
    ipcRenderer.invoke("careful-is-destructive", command),

  // /learn (Step 10 of the V2 rollout, ported from gstack's
  // /learn). Per-profile append-only JSONL log of durable
  // patterns, pitfalls, preferences, and architecture decisions.
  learningsRead: (profile?: string) =>
    ipcRenderer.invoke("learnings-read", profile),
  learningsSearch: (query: string, profile?: string) =>
    ipcRenderer.invoke("learnings-search", query, profile),
  learningsStats: (profile?: string) =>
    ipcRenderer.invoke("learnings-stats", profile),
  learningsExport: (profile?: string) =>
    ipcRenderer.invoke("learnings-export", profile),
  learningsFindStale: (profile?: string) =>
    ipcRenderer.invoke("learnings-find-stale", profile),
  learningsClear: (profile?: string) =>
    ipcRenderer.invoke("learnings-clear", profile),
  learningsFileInfo: (profile?: string) =>
    ipcRenderer.invoke("learnings-file-info", profile),
  learningsAppend: (
    input: {
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
      ts?: string;
    },
    profile?: string,
  ) => ipcRenderer.invoke("learnings-append", input, profile),

  // V2.2 — Retro skill: walk recent sessions and propose
  // "pattern" / "preference" learnings. The renderer shows
  // the report, then calls `retroCommit` to write the kept
  // proposals to learnings.jsonl with source: "inferred".
  retroSummarize: (profile?: string, lookback?: number) =>
    ipcRenderer.invoke("retro-summarize", profile, lookback),
  retroBuildContext: (profile?: string, lookback?: number) =>
    ipcRenderer.invoke("retro-build-context", profile, lookback),
  retroCommit: (
    proposals: Array<{
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
      evidence: string;
    }>,
    profile?: string,
  ) => ipcRenderer.invoke("retro-commit", proposals, profile),
  retroExport: (profile?: string) =>
    ipcRenderer.invoke("retro-export", profile),

  // V2.2 — Triage skill: run keyword/file heuristics over a
  // batch of items (issues, PRs, sessions, notes) to surface
  // 5W1H, labels, priority, and cross-references to existing
  // learnings + on-disk wiki files.
  triageItems: (
    items: Array<{
      id: string;
      title: string;
      body?: string;
      author?: string;
      createdAt?: string;
      kind?: string;
    }>,
    profile?: string,
  ) => ipcRenderer.invoke("triage-items", items, profile),
  triageRecentSessions: (profile?: string, lookback?: number) =>
    ipcRenderer.invoke("triage-recent-sessions", profile, lookback),

  // V2.2 — Handoff skill: compose a single markdown document
  // pulling recent sessions, learnings, kanban, and wiki
  // activity into one place. The renderer can show the doc
  // inline or persist it to disk for the next agent / human.
  handoffBuild: (profile?: string) =>
    ipcRenderer.invoke("handoff-build", profile),
  handoffSave: (
    doc: {
      generatedAt: string;
      profile: string;
      sections: Array<{ heading: string; body: string }>;
      markdown: string;
      readFirst: string[];
    },
    outDir?: string,
  ) => ipcRenderer.invoke("handoff-save", doc, outDir),
  handoffBuildAndSave: (profile?: string, outDir?: string) =>
    ipcRenderer.invoke("handoff-build-and-save", profile, outDir),

  // Schema packs + wiki synthesis (V2 Steps 12 + 13, ported
  // from gbrain). The brain layer on top of the existing
  // 3-layer memory: the active schema pack declares what
  // page types the wiki recognises; the synthesis layer
  // composes a topic answer with per-claim citations and a
  // gap list.
  schemasListBundled: () => ipcRenderer.invoke("schemas-list-bundled"),
  schemasGetActive: (profile?: string) =>
    ipcRenderer.invoke("schemas-get-active", profile),
  schemasGetActiveId: (profile?: string) =>
    ipcRenderer.invoke("schemas-get-active-id", profile),
  schemasSetActive: (packId: string, profile?: string) =>
    ipcRenderer.invoke("schemas-set-active", packId, profile),
  schemasInferType: (relPath: string, profile?: string) =>
    ipcRenderer.invoke("schemas-infer-type", relPath, profile),
  synthesisBuild: (
    topic: string,
    profile?: string,
    opts?: { maxClaims?: number; maxGaps?: number },
  ) => ipcRenderer.invoke("synthesis-build", topic, profile, opts),

  // Knowledge MCP (V2 Step 14, ported from gbrain's MCP
  // surface). The four-verb search / get / list / sources
  // family, plus a tool manifest the renderer can register
  // with the agent's tool-use layer.
  knowledgeToolManifest: () => ipcRenderer.invoke("knowledge-tool-manifest"),
  knowledgeSearch: (query: string, profile?: string) =>
    ipcRenderer.invoke("knowledge-search", query, profile),
  knowledgeGet: (relPath: string, profile?: string) =>
    ipcRenderer.invoke("knowledge-get", relPath, profile),
  knowledgeList: (filter?: { type?: string }, profile?: string) =>
    ipcRenderer.invoke("knowledge-list", filter, profile),
  knowledgeSources: (profile?: string) =>
    ipcRenderer.invoke("knowledge-sources", profile),

  // Autoplan (V2 Step 15, ported from gstack's /autoplan).
  // Pre-fills decision briefs from plan steps that carry
  // the `plan-tune` skill, and lets the renderer hand-record
  // a dispatch failure for the failure-side learning log.
  autoplanBuildBriefs: (planId: string, profile?: string) =>
    ipcRenderer.invoke("autoplan-build-briefs", planId, profile),
  autoplanRecordFailure: (
    stepId: string,
    error: string,
    planId: string,
    profile?: string,
  ) =>
    ipcRenderer.invoke(
      "autoplan-record-failure",
      stepId,
      error,
      planId,
      profile,
    ),
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("hermesAPI", hermesAPI);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI;
  // @ts-ignore (define in dts)
  window.hermesAPI = hermesAPI;
}
