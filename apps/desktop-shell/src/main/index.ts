import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type OpenDialogOptions,
} from "electron";
import { execFile } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Socket } from "net";
import { join } from "path";
import { promisify } from "util";
import cubecloudWindowIcon from "../../resources/icon.png?asset";
import {
  buildCustomAppId,
  buildPlatformOverview,
  createDefaultPlatformState,
  normalizePlatformState,
  recordSmokeTargetProbeResult,
  setActiveRuntimeProvider,
  setActiveTaskOrchestrator,
  setDockerNodeBinding,
  setActiveView,
  setAppEnabled,
  setMissionCardServiceTier,
  setMissionCardStage,
  setRuntimeSurfaceConfig,
  setSmokeTargetConfig,
  toggleMissionChecklistItem,
  upsertCustomApp,
  type PlatformCustomAppDescriptor,
  type PlatformCustomAppOnboardingInput,
  type PlatformDockerDiscoverySummary,
  type PlatformDockerNodeHealth,
  type PlatformDockerNodeSummary,
  type PlatformDockerProjectDiagnostic,
  type PlatformDockerProjectHealth,
  type PlatformDockerProjectSummary,
  type PlatformDockerPortBinding,
  type PlatformMissionStage,
  type PlatformOverview,
  type HermesRuntimeLifecycleSummary,
  type AgentDispatchContextOverride,
  type PlatformRuntimeProviderId,
  type PlatformRuntimeSurfacePatch,
  type PlatformServiceTier,
  type PlatformSmokeTargetPatch,
  type PlatformSmokeTargetProbeResult,
  type PlatformState,
  type PlatformTaskOrchestratorId,
  type PlatformView,
} from "@cubecloud/platform-core";
import {
  type WorkspaceKanbanBoardInput,
  type WorkspaceKanbanTaskInput,
  type WorkspaceCodeGraphEntrypointInput,
  type WorkspaceCodeGraphQueryInput,
  type WorkspaceCodeGraphRepoInput,
  type WorkspaceEverOsHarnessInput,
  type WorkspaceMemoryInput,
  type WorkspaceModelInput,
  type WorkspaceProfileInput,
  type WorkspaceProviderInput,
  type WorkspaceScheduleInput,
  type WorkspaceSkillInput,
  type WorkspaceToolInput,
} from "./agentWorkspace";
import {
  type ControlPlaneDispatchRuntimeRequest,
  dispatchControlPlaneProfile,
  DEFAULT_AGENT_SOUL,
  deleteControlPlaneSession,
  getControlPlaneSessionHistory,
  initializeControlPlaneCodeGraphRepo,
  listControlPlaneDispatchRuns,
  listControlPlaneCodeGraphEntrypoints,
  listControlPlaneCodeGraphQueries,
  listControlPlaneCodeGraphRepos,
  listControlPlaneEverOsHarnesses,
  listControlPlaneKanbanBoards,
  listControlPlaneKanbanTasks,
  listControlPlaneMemory,
  listControlPlaneModels,
  listControlPlaneProfiles,
  listControlPlaneProviders,
  listControlPlaneSchedules,
  listControlPlaneSessions,
  listControlPlaneSkills,
  listControlPlaneTools,
  readControlPlaneSoul,
  removeControlPlaneCodeGraphEntrypoint,
  removeControlPlaneCodeGraphQuery,
  removeControlPlaneCodeGraphRepo,
  removeControlPlaneEverOsHarness,
  removeControlPlaneKanbanBoard,
  removeControlPlaneKanbanTask,
  removeControlPlaneMemoryEntry,
  removeControlPlaneModel,
  removeControlPlaneProfile,
  removeControlPlaneProvider,
  removeControlPlaneSchedule,
  removeControlPlaneSkill,
  removeControlPlaneTool,
  resetControlPlaneSoul,
  saveControlPlaneMemoryEntry,
  saveControlPlaneCodeGraphEntrypoint,
  saveControlPlaneCodeGraphQuery,
  saveControlPlaneCodeGraphRepo,
  saveControlPlaneKanbanBoard,
  saveControlPlaneKanbanTask,
  saveControlPlaneModel,
  saveControlPlaneEverOsHarness,
  saveControlPlaneProfile,
  saveControlPlaneProvider,
  saveControlPlaneSchedule,
  saveControlPlaneSessionSnapshot,
  saveControlPlaneSkill,
  saveControlPlaneTool,
  setControlPlaneEverOsHarnessEnabled,
  setControlPlaneScheduleEnabled,
  setControlPlaneToolEnabled,
  setCurrentControlPlaneCodeGraphRepo,
  setCurrentControlPlaneKanbanBoard,
  registerControlPlaneDispatchRuntimeExecutor,
  runDueControlPlaneSchedules,
  syncControlPlaneCodeGraphRepo,
  triggerControlPlaneSchedule,
  updateControlPlaneSessionTitle,
  writeControlPlaneSoul,
  type WorkspaceSessionSnapshotInput,
} from "./agentControlPlane";
import { discoverControlPlaneProviderModels } from "./providerDiscovery";
import {
  adoptHermesHome,
  getHermesRuntimeLifecycle,
  installHermesRuntime,
  repairHermesRuntime,
  resetHermesHomeAdoption,
  runHermesDoctor,
  startHermesGateway,
  stopHermesGateway,
  updateHermesRuntime,
  verifyHermesRuntime,
} from "./hermesLifecycle";

let mainWindow: BrowserWindow | null = null;
let controlPlaneSchedulerTimer: ReturnType<typeof setInterval> | null = null;

const execFileAsync = promisify(execFile);
const WINDOWS_DOCKER_PATH =
  "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
const WINDOWS_SSH_PATH = "C:\\Windows\\System32\\OpenSSH\\ssh.exe";
const CONTROL_PLANE_SCHEDULER_INTERVAL_MS = 30_000;
const CONTROL_PLANE_PROVIDER_IDS: readonly PlatformRuntimeProviderId[] = [
  "hermes",
  "ironclaw",
  "openclaw",
];

let cachedDockerDiscovery: PlatformDockerDiscoverySummary = {
  status: "empty",
  message: "Run a Docker Desktop scan from the dashboard to list container nodes and compose projects.",
  lastScannedAt: null,
  projects: [],
  nodes: [],
};

interface DockerPsRow {
  ID: string;
  Names: string;
  Image: string;
  State: string;
  Status: string;
  Ports: string;
  Labels: string;
  HealthStatus?: string;
}

interface DockerInspectPortBinding {
  HostIp: string;
  HostPort: string;
}

interface DockerInspectRow {
  Name?: string;
  State?: {
    Status?: string;
    StartedAt?: string;
    FinishedAt?: string;
    ExitCode?: number;
    Error?: string;
    Health?: {
      Status?: string;
    };
  };
  Config?: {
    ExposedPorts?: Record<string, unknown> | null;
  };
  NetworkSettings?: {
    Ports?: Record<string, DockerInspectPortBinding[] | null> | null;
    Networks?: Record<string, unknown> | null;
  };
  Mounts?: Array<{
    Destination: string;
  }>;
}

const APP_PORT_PREFERENCES: Record<string, number[]> = {
  "hermes-agent": [8644, 8789, 8642],
  "hermes-webui": [8787, 9119, 3000],
  ironclaw: [3000, 8080, 50051],
  "open-design": [3000, 5173, 8080],
  "open-html": [3000, 4173, 5173, 8080],
  rowboat: [3000, 8080],
  openhuman: [3000, 8080],
  shadowbroker: [3000, 8080],
  codegraph: [3000, 8080, 4000],
  everos: [1995, 3000, 8080],
  supertonic: [8000, 8080, 3000],
};

const COMMON_WEB_PORTS = [3000, 4173, 5173, 7788, 8000, 8080, 8644, 8787, 8789, 9119];

function agentWorkspaceDir(): string {
  return join(app.getPath("userData"), "agent-workspace");
}

function soulFilePath(): string {
  return join(agentWorkspaceDir(), "SOUL.md");
}

function readLocalSoul(): string {
  return readControlPlaneSoul(readState().activeRuntimeProviderId);
}

function writeLocalSoul(content: string): boolean {
  return writeControlPlaneSoul(content, readState().activeRuntimeProviderId);
}

function resetLocalSoul(): string {
  return resetControlPlaneSoul(readState().activeRuntimeProviderId);
}

function stateFile(): string {
  return join(app.getPath("userData"), "platform-state.json");
}

function readState(): PlatformState {
  try {
    const filePath = stateFile();
    if (!existsSync(filePath)) return createDefaultPlatformState();
    const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Partial<PlatformState>;
    return normalizePlatformState(raw);
  } catch {
    return createDefaultPlatformState();
  }
}

function writeState(state: PlatformState): void {
  const filePath = stateFile();
  const dirPath = join(filePath, "..");
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
}

function activeWorkspaceRuntimeProviderId(): PlatformRuntimeProviderId {
  return readState().activeRuntimeProviderId;
}

function activeGatewayRunning(): boolean {
  const overview = buildPlatformOverview(readState());
  return overview.runtimeProviders.some(
    (provider) =>
      provider.id === overview.state.activeRuntimeProviderId &&
      Boolean(provider.surfaceUrl),
  );
}

function resolveRuntimeProviderSurfaceUrl(
  runtimeProviderId: PlatformRuntimeProviderId,
): string | null {
  return (
    buildPlatformOverview(readState()).runtimeProviders.find(
      (provider) => provider.id === runtimeProviderId,
    )?.surfaceUrl ?? null
  );
}

function buildDispatchRuntimePrompt(
  request: ControlPlaneDispatchRuntimeRequest,
): string {
  const lines = [
    `Dispatch target: ${request.targetType} ${request.targetName}`,
    `Source: ${request.source}`,
    `Profile: ${request.context.profile}`,
    `Prompt: ${request.prompt}`,
  ];

  if (request.context.codegraph?.repoName) {
    lines.push(
      `CodeGraph repo: ${request.context.codegraph.repoName} (${request.context.codegraph.repoPath ?? "path unavailable"})`,
    );
  }

  if (request.context.codegraph?.entrypoints.length) {
    lines.push(
      `CodeGraph entrypoints:\n${request.context.codegraph.entrypoints
        .map((entrypoint) => `- ${entrypoint.name}: ${entrypoint.target}`)
        .join("\n")}`,
    );
  }

  if (request.context.codegraph?.queries.length) {
    lines.push(
      `CodeGraph queries:\n${request.context.codegraph.queries
        .map((query) => `- ${query.name} [${query.mode}]: ${query.query}`)
        .join("\n")}`,
    );
  }

  if (request.context.everosHarnesses.length) {
    lines.push(
      `EverOS harnesses:\n${request.context.everosHarnesses
        .map(
          (harness) =>
            `- ${harness.name} [${harness.memoryNamespace}]: ${harness.loopPrompt}`,
        )
        .join("\n")}`,
    );
  }

  lines.push("Respond with the operator outcome, findings, and concrete next steps.");

  return lines.join("\n\n");
}

function extractRuntimeDispatchOutput(payload: unknown): string {
  if (
    typeof payload === "object" &&
    payload !== null &&
    Array.isArray((payload as { choices?: unknown }).choices)
  ) {
    const firstChoice = (payload as {
      choices?: Array<{ message?: { content?: string } }>;
    }).choices?.[0];

    if (typeof firstChoice?.message?.content === "string") {
      return firstChoice.message.content;
    }
  }

  return "(no response)";
}

async function executeControlPlaneRuntimeDispatch(
  request: ControlPlaneDispatchRuntimeRequest,
): Promise<{ output: string }> {
  const surfaceUrl = resolveRuntimeProviderSurfaceUrl(request.runtimeProviderId);

  if (!surfaceUrl) {
    throw new Error(`Runtime surface for ${request.runtimeProviderId} is not available.`);
  }

  const response = await fetch(`${surfaceUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: request.model,
      messages: [
        {
          role: "user",
          content: buildDispatchRuntimePrompt(request),
        },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(
      detail.length > 0
        ? `HTTP ${response.status}: ${detail}`
        : `HTTP ${response.status}`,
    );
  }

  return {
    output: extractRuntimeDispatchOutput(await response.json()),
  };
}

function notifyWorkspaceDispatchRunsUpdated(
  runtimeProviderId: PlatformRuntimeProviderId,
): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send("platform:workspaceDispatchRunsUpdated", {
    runtimeProviderId,
  });
}

function notifyHermesRuntimeLifecycleUpdated(
  event: Electron.IpcMainInvokeEvent,
  summary: HermesRuntimeLifecycleSummary,
): void {
  if (event.sender.isDestroyed()) {
    return;
  }

  event.sender.send("platform:hermesRuntimeLifecycleUpdated", {
    summary,
  });
}

async function runControlPlaneSchedulerTick(): Promise<void> {
  for (const runtimeProviderId of CONTROL_PLANE_PROVIDER_IDS) {
    try {
      const runs = await runDueControlPlaneSchedules(runtimeProviderId);

      if (runs.length > 0) {
        notifyWorkspaceDispatchRunsUpdated(runtimeProviderId);
      }
    } catch {
      // Keep the scheduler resilient; a single provider should not stop the loop.
    }
  }
}

function startControlPlaneScheduler(): void {
  if (controlPlaneSchedulerTimer) {
    return;
  }

  controlPlaneSchedulerTimer = setInterval(() => {
    void runControlPlaneSchedulerTick();
  }, CONTROL_PLANE_SCHEDULER_INTERVAL_MS);

  void runControlPlaneSchedulerTick();
}

function stopControlPlaneScheduler(): void {
  if (!controlPlaneSchedulerTimer) {
    return;
  }

  clearInterval(controlPlaneSchedulerTimer);
  controlPlaneSchedulerTimer = null;
}

registerControlPlaneDispatchRuntimeExecutor(executeControlPlaneRuntimeDispatch);

function isMissingBinaryError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

async function runDockerCommand(args: string[]): Promise<string> {
  const candidates =
    process.platform === "win32"
      ? ["docker", WINDOWS_DOCKER_PATH]
      : ["docker"];
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const result = await execFileAsync(
        candidate,
        args,
        { maxBuffer: 1024 * 1024, windowsHide: true },
      );

      return String(result.stdout);
    } catch (error) {
      lastError = error;
      if (!isMissingBinaryError(error)) {
        break;
      }
    }
  }

  throw lastError;
}

function formatExternalCommandError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "stderr" in error &&
    typeof (error as { stderr?: unknown }).stderr === "string" &&
    (error as { stderr: string }).stderr.trim().length > 0
  ) {
    return (error as { stderr: string }).stderr.trim();
  }

  return "Command failed.";
}

async function runSshHandshake(args: {
  host: string;
  port: number;
  username: string;
  keyPath: string;
}): Promise<PlatformSmokeTargetProbeResult> {
  const candidates = process.platform === "win32" ? ["ssh", WINDOWS_SSH_PATH] : ["ssh"];
  const sshArgs = [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=5",
    "-o",
    "NumberOfPasswordPrompts=0",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-p",
    String(args.port),
  ];
  const trimmedKeyPath = args.keyPath.trim();

  if (trimmedKeyPath.length > 0) {
    sshArgs.push("-i", trimmedKeyPath);
  }

  sshArgs.push(`${args.username}@${args.host}`, "exit");

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      await execFileAsync(candidate, sshArgs, {
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });

      return {
        status: "passed",
        detail: `SSH handshake to ${args.username}@${args.host}:${args.port} succeeded.`,
      };
    } catch (error) {
      lastError = error;
      if (!isMissingBinaryError(error)) {
        break;
      }
    }
  }

  return {
    status: "failed",
    detail: formatExternalCommandError(lastError),
  };
}

async function runRemoteSmokeProbe(url: string): Promise<PlatformSmokeTargetProbeResult> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        "user-agent": "cubecloud-desktop-shell-smoke-probe",
      },
    });

    return {
      status: response.ok ? "passed" : "failed",
      detail: `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`.trim(),
    };
  } catch (error) {
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : "Remote smoke probe failed.",
    };
  }
}

async function runTcpSmokeProbe(
  host: string,
  port: number,
): Promise<PlatformSmokeTargetProbeResult> {
  return await new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (result: PlatformSmokeTargetProbeResult) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(5000);
    socket.once("connect", () => {
      finish({
        status: "passed",
        detail: `TCP handshake to ${host}:${port} succeeded.`,
      });
    });
    socket.once("timeout", () => {
      finish({
        status: "failed",
        detail: `TCP connect to ${host}:${port} timed out after 5 seconds.`,
      });
    });
    socket.once("error", (error) => {
      finish({
        status: "failed",
        detail: error instanceof Error ? error.message : "TCP smoke probe failed.",
      });
    });

    socket.connect(port, host);
  });
}

async function runDockerPs(): Promise<string> {
  return runDockerCommand(["ps", "-a", "--format", "{{json .}}"]);
}

async function runDockerInspect(containerNames: string[]): Promise<DockerInspectRow[]> {
  if (containerNames.length === 0) {
    return [];
  }

  const stdout = await runDockerCommand(["inspect", ...containerNames]);

  try {
    return JSON.parse(stdout) as DockerInspectRow[];
  } catch {
    return [];
  }
}

function parseDockerLabel(labels: string, labelKey: string): string | null {
  const candidate = labels
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${labelKey}=`));

  if (!candidate) {
    return null;
  }

  const [, ...valueParts] = candidate.split("=");
  const value = valueParts.join("=").trim();
  return value.length > 0 ? value : null;
}

function normalizeDockerHost(host: string): string {
  if (host === "0.0.0.0" || host === "[::]" || host === "::") {
    return "127.0.0.1";
  }

  return host;
}

function parseDockerPorts(ports: string): PlatformDockerPortBinding[] {
  if (!ports.trim()) {
    return [];
  }

  const seen = new Set<string>();

  return ports
    .split(",")
    .map((segment) => segment.trim())
    .flatMap((segment) => {
      const match = /^(.+):(\d+)->(\d+)\/(\w+)$/.exec(segment);

      if (!match) {
        return [];
      }

      const [, host, hostPort, containerPort, protocol] = match;
      const binding = {
        host: normalizeDockerHost(host.trim()),
        hostPort: Number(hostPort),
        containerPort: Number(containerPort),
        protocol,
      } satisfies PlatformDockerPortBinding;
      const key = `${binding.host}:${binding.hostPort}:${binding.containerPort}/${binding.protocol}`;

      if (seen.has(key)) {
        return [];
      }

      seen.add(key);
      return [binding];
    });
}

function parseDockerInspectPorts(
  portMap: Record<string, DockerInspectPortBinding[] | null> | null | undefined,
): PlatformDockerPortBinding[] {
  if (!portMap) {
    return [];
  }

  const seen = new Set<string>();

  return Object.entries(portMap)
    .flatMap(([containerKey, bindings]) => {
      if (!bindings || bindings.length === 0) {
        return [];
      }

      const [containerPortValue, protocol = "tcp"] = containerKey.split("/");
      const containerPort = Number(containerPortValue);

      if (!Number.isFinite(containerPort) || containerPort <= 0) {
        return [];
      }

      return bindings.flatMap((binding) => {
        const hostPort = Number(binding.HostPort);

        if (!Number.isFinite(hostPort) || hostPort <= 0) {
          return [];
        }

        const normalized = {
          host: normalizeDockerHost(binding.HostIp.trim()),
          hostPort,
          containerPort,
          protocol,
        } satisfies PlatformDockerPortBinding;
        const key = `${normalized.host}:${normalized.hostPort}:${normalized.containerPort}/${normalized.protocol}`;

        if (seen.has(key)) {
          return [];
        }

        seen.add(key);
        return [normalized];
      });
    })
    .sort((left, right) => left.hostPort - right.hostPort);
}

function parseDockerExposedPorts(
  exposedPorts: Record<string, unknown> | null | undefined,
): string[] {
  return Object.keys(exposedPorts ?? {}).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  );
}

function parseDockerNetworkNames(
  networks: Record<string, unknown> | null | undefined,
): string[] {
  return Object.keys(networks ?? {}).sort((left, right) => left.localeCompare(right));
}

function parseDockerMountTargets(
  mounts: Array<{ Destination: string }> | undefined,
): string[] {
  return (mounts ?? [])
    .map((mount) => mount.Destination)
    .filter((destination) => destination.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));
}

function normalizeDockerTimestamp(value: string | undefined): string | null {
  if (!value || value.startsWith("0001-01-01")) {
    return null;
  }

  return value;
}

function portBindingKey(binding: PlatformDockerPortBinding): string {
  return `${binding.host}:${binding.hostPort}:${binding.containerPort}/${binding.protocol}`;
}

function buildDockerNodeDiagnostic(
  row: DockerPsRow,
  inspect: DockerInspectRow | undefined,
  health: PlatformDockerNodeHealth,
): string | null {
  const error = inspect?.State?.Error?.trim();
  const exitCode =
    typeof inspect?.State?.ExitCode === "number"
      ? inspect.State.ExitCode
      : null;
  const finishedAt = normalizeDockerTimestamp(inspect?.State?.FinishedAt);

  switch (health) {
    case "healthy":
    case "running":
      return null;
    case "starting":
      return "Container health checks are still starting.";
    case "unhealthy":
      return error && error.length > 0
        ? `Container healthcheck is failing: ${error}`
        : "Container healthcheck is reporting unhealthy.";
    case "offline": {
      const parts = [
        exitCode != null ? `Exited with code ${exitCode}.` : "Container is not running.",
        error && error.length > 0 ? error : null,
        finishedAt ? `Finished at ${finishedAt}.` : null,
        row.Status.trim().length > 0 ? row.Status.trim() : null,
      ].filter((part): part is string => part != null && part.length > 0);

      return parts.length > 0 ? parts.join(" ") : "Container is offline.";
    }
    case "unknown":
      return row.Status.trim().length > 0
        ? row.Status.trim()
        : "Container state requires inspection.";
  }
}

function choosePreferredDockerPort(
  matchedAppId: string | null,
  ports: PlatformDockerPortBinding[],
): {
  preferredPort: PlatformDockerPortBinding | null;
  preferredPortReason: string | null;
} {
  if (ports.length === 0) {
    return {
      preferredPort: null,
      preferredPortReason: null,
    };
  }

  const appPreferences = matchedAppId ? (APP_PORT_PREFERENCES[matchedAppId] ?? []) : [];

  for (const preferredContainerPort of appPreferences) {
    const preferredPort = ports.find(
      (binding) => binding.containerPort === preferredContainerPort,
    );

    if (preferredPort) {
      return {
        preferredPort,
        preferredPortReason: `Matched ${matchedAppId} preference for container port ${preferredContainerPort}.`,
      };
    }
  }

  const commonPort = ports.find((binding) =>
    COMMON_WEB_PORTS.includes(binding.containerPort),
  );

  if (commonPort) {
    return {
      preferredPort: commonPort,
      preferredPortReason: `Common web surface heuristic matched container port ${commonPort.containerPort}.`,
    };
  }

  const tcpFallback = ports.find(
    (binding) => binding.protocol === "tcp" && binding.containerPort !== 50051,
  );

  if (tcpFallback) {
    return {
      preferredPort: tcpFallback,
      preferredPortReason: `First published TCP port selected as a fallback recommendation.`,
    };
  }

  return {
    preferredPort: ports[0],
    preferredPortReason: `First published port selected as a fallback recommendation.`,
  };
}

function sortDockerBindings(
  ports: PlatformDockerPortBinding[],
  preferredPort: PlatformDockerPortBinding | null,
): PlatformDockerPortBinding[] {
  if (!preferredPort) {
    return [...ports].sort((left, right) => left.hostPort - right.hostPort);
  }

  const preferredKey = portBindingKey(preferredPort);

  return [...ports].sort((left, right) => {
    const leftIsPreferred = portBindingKey(left) === preferredKey;
    const rightIsPreferred = portBindingKey(right) === preferredKey;

    if (leftIsPreferred && !rightIsPreferred) {
      return -1;
    }

    if (!leftIsPreferred && rightIsPreferred) {
      return 1;
    }

    return left.hostPort - right.hostPort;
  });
}

function resolveDockerHealth(
  row: DockerPsRow,
  inspect: DockerInspectRow | undefined,
): PlatformDockerNodeHealth {
  const explicit =
    inspect?.State?.Health?.Status?.trim().toLowerCase() ??
    row.HealthStatus?.trim().toLowerCase();
  const status = row.Status.trim().toLowerCase();
  const state = inspect?.State?.Status?.trim().toLowerCase() ?? row.State.trim().toLowerCase();

  if (explicit === "healthy" || status.includes("(healthy)")) {
    return "healthy";
  }

  if (explicit === "unhealthy" || status.includes("(unhealthy)")) {
    return "unhealthy";
  }

  if (explicit === "starting" || status.includes("starting")) {
    return "starting";
  }

  if (["created", "dead", "exited", "paused"].includes(state)) {
    return "offline";
  }

  if (state === "running") {
    return "running";
  }

  return "unknown";
}

function resolveDockerProjectHealth(
  nodes: PlatformDockerNodeSummary[],
): PlatformDockerProjectHealth {
  const runningCount = nodes.filter((node) => node.state === "running").length;

  if (runningCount === 0) {
    return "offline";
  }

  if (
    nodes.some((node) =>
      ["offline", "starting", "unhealthy", "unknown"].includes(node.health),
    )
  ) {
    return "degraded";
  }

  return "healthy";
}

function buildDockerProjectSummaries(
  nodes: PlatformDockerNodeSummary[],
): PlatformDockerProjectSummary[] {
  const grouped = new Map<string, PlatformDockerNodeSummary[]>();

  for (const node of nodes) {
    const key = node.composeProject ?? "standalone";
    const current = grouped.get(key) ?? [];
    current.push(node);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([key, projectNodes]) => {
      const label = key === "standalone" ? "Standalone" : key;
      const serviceNames = Array.from(
        new Set(
          projectNodes.map((node) => node.composeService ?? node.name),
        ),
      ).sort((left, right) => left.localeCompare(right));
      const diagnostics = projectNodes
        .filter((node) => node.diagnostic != null)
        .map((node) => ({
          serviceName: node.composeService ?? node.name,
          health: node.health,
          message: node.diagnostic ?? node.status,
        }) satisfies PlatformDockerProjectDiagnostic)
        .sort((left, right) => left.serviceName.localeCompare(right.serviceName));

      return {
        id: key,
        label,
        health: resolveDockerProjectHealth(projectNodes),
        nodeCount: projectNodes.length,
        runningCount: projectNodes.filter((node) => node.state === "running").length,
        healthyCount: projectNodes.filter((node) => node.health === "healthy").length,
        downCount: projectNodes.filter((node) => node.health === "offline").length,
        matchedNodeCount: projectNodes.filter((node) => node.matchedAppId != null).length,
        serviceNames,
        diagnostics,
      } satisfies PlatformDockerProjectSummary;
    })
    .sort((left, right) => {
      if (left.id === "standalone" && right.id !== "standalone") {
        return 1;
      }

      if (left.id !== "standalone" && right.id === "standalone") {
        return -1;
      }

      return left.label.localeCompare(right.label);
    });
}

function dockerNodeSortRank(node: PlatformDockerNodeSummary): number {
  if (node.state === "running") {
    return 0;
  }

  if (node.health === "starting") {
    return 1;
  }

  return 2;
}

function matchDockerNodeToApp(row: DockerPsRow, composeService: string | null): string | null {
  const haystack = `${row.Names} ${row.Image} ${composeService ?? ""}`.toLowerCase();
  const matchers: Array<{ appId: string; tokens: string[] }> = [
    { appId: "hermes-webui", tokens: ["hermes-webui", "hermes-web"] },
    { appId: "hermes-agent", tokens: ["hermes-agent", "hermes-gateway"] },
    { appId: "ironclaw", tokens: ["ironclaw"] },
    { appId: "open-design", tokens: ["open-design", "opendesign"] },
    { appId: "open-html", tokens: ["open-html", "html-anything"] },
    { appId: "rowboat", tokens: ["rowboat"] },
    { appId: "openhuman", tokens: ["openhuman"] },
    { appId: "shadowbroker", tokens: ["shadowbroker"] },
    { appId: "codegraph", tokens: ["codegraph"] },
    { appId: "everos", tokens: ["everos", "evercore"] },
    { appId: "supertonic", tokens: ["supertonic"] },
  ];

  return (
    matchers.find((matcher) => matcher.tokens.some((token) => haystack.includes(token)))
      ?.appId ?? null
  );
}

function buildDockerBindingKey(
  composeProject: string | null,
  composeService: string | null,
  containerName: string,
): string {
  if (composeProject) {
    return `${composeProject}:${composeService ?? containerName}`;
  }

  return containerName;
}

function buildCustomAppFromDockerNode(
  state: PlatformState,
  input: PlatformCustomAppOnboardingInput,
  node: PlatformDockerNodeSummary,
): PlatformCustomAppDescriptor {
  const name = input.name.trim();
  const appId = buildCustomAppId(state, name, node.bindingKey);
  const preferredPort = node.preferredPort ?? node.ports[0] ?? null;

  return {
    id: appId,
    name,
    tagline: `Docker-onboarded ${input.kind} surface for ${name}.`,
    description:
      `Custom app onboarded from Docker node ${node.name} (${node.image}) without a static code catalog entry.`,
    kind: input.kind,
    integration: input.integration,
    source: `docker:${node.image}`,
    defaultEnabled: true,
    supportedSlots: [],
    capabilityIds: [],
    status: "custom",
    runtimeSurface: {
      appId,
      label: `${name} surface`,
      notes: `Custom surface onboarded from Docker node ${node.name}.`,
      defaultProtocol: "http",
      defaultHost: preferredPort?.host ?? "127.0.0.1",
      defaultPort: preferredPort?.hostPort ?? null,
      defaultPath: "/",
      defaultMode: "docker",
    },
  } satisfies PlatformCustomAppDescriptor;
}

async function scanDockerDiscovery(
  state?: Partial<PlatformState>,
): Promise<PlatformDockerDiscoverySummary> {
  try {
    const stdout = await runDockerPs();
    const scannedAt = new Date().toISOString();
    const bindingMap = new Map(
      normalizePlatformState(state).dockerNodeBindings.map((binding) => [
        binding.nodeKey,
        binding.appId,
      ]),
    );
    const rows = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as DockerPsRow];
        } catch {
          return [];
        }
      });
    let inspectByName = new Map<string, DockerInspectRow>();

    try {
      inspectByName = new Map(
        (await runDockerInspect(rows.map((row) => row.Names)))
          .map((inspect) => {
            const name = inspect.Name?.replace(/^\//, "");
            return name ? ([name, inspect] as const) : null;
          })
          .filter((entry): entry is readonly [string, DockerInspectRow] => entry != null),
      );
    } catch {
      inspectByName = new Map();
    }

    const nodes = rows
      .map((row) => {
        const composeProject = parseDockerLabel(
          row.Labels ?? "",
          "com.docker.compose.project",
        );
        const composeService = parseDockerLabel(
          row.Labels ?? "",
          "com.docker.compose.service",
        );
        const inspect = inspectByName.get(row.Names);
        const bindingKey = buildDockerBindingKey(
          composeProject,
          composeService,
          row.Names,
        );
        const automaticMatchAppId = matchDockerNodeToApp(row, composeService);
        const manualMatchAppId = bindingMap.get(bindingKey) ?? null;
        const matchedAppId = manualMatchAppId ?? automaticMatchAppId;
        const matchMode = manualMatchAppId
          ? "manual"
          : automaticMatchAppId
            ? "automatic"
            : "unmatched";
        const parsedPorts = parseDockerInspectPorts(inspect?.NetworkSettings?.Ports);
        const ports = parsedPorts.length > 0 ? parsedPorts : parseDockerPorts(row.Ports ?? "");
        const { preferredPort, preferredPortReason } = choosePreferredDockerPort(
          matchedAppId,
          ports,
        );
        const health = resolveDockerHealth(row, inspect);
        const finishedAt = normalizeDockerTimestamp(inspect?.State?.FinishedAt);
        const exitCode =
          typeof inspect?.State?.ExitCode === "number"
            ? inspect.State.ExitCode
            : null;
        const diagnostic = buildDockerNodeDiagnostic(row, inspect, health);

        return {
          id: row.ID,
          name: row.Names,
          bindingKey,
          image: row.Image,
          state: row.State,
          status: row.Status,
          health,
          matchMode,
          composeProject,
          composeService,
          ports: sortDockerBindings(ports, preferredPort),
          exposedPorts: parseDockerExposedPorts(inspect?.Config?.ExposedPorts),
          networkNames: parseDockerNetworkNames(inspect?.NetworkSettings?.Networks),
          mountTargets: parseDockerMountTargets(inspect?.Mounts),
          startedAt: normalizeDockerTimestamp(inspect?.State?.StartedAt),
          finishedAt,
          exitCode,
          diagnostic,
          preferredPort,
          preferredPortReason,
          matchedAppId,
        } satisfies PlatformDockerNodeSummary;
      })
      .sort((left, right) => {
        const projectCompare = (left.composeProject ?? "zz-standalone").localeCompare(
          right.composeProject ?? "zz-standalone",
        );

        if (projectCompare !== 0) {
          return projectCompare;
        }

        const rankCompare = dockerNodeSortRank(left) - dockerNodeSortRank(right);

        if (rankCompare !== 0) {
          return rankCompare;
        }

        return left.name.localeCompare(right.name);
      });
    const projects = buildDockerProjectSummaries(nodes);
    const matchedNodeCount = nodes.filter((node) => node.matchedAppId != null).length;
    const runningNodeCount = nodes.filter((node) => node.state === "running").length;
    const downNodeCount = nodes.filter((node) => node.health === "offline").length;

    if (nodes.length === 0) {
      return {
        status: "empty",
        message:
          "Docker Desktop is reachable, but no containers were found during the latest scan.",
        lastScannedAt: scannedAt,
        projects,
        nodes,
      };
    }

    return {
      status: "connected",
      message: `Detected ${nodes.length} Docker container nodes from Docker Desktop, with ${runningNodeCount} running, ${downNodeCount} down, and ${matchedNodeCount} mapped to Cubecloud catalog apps.`,
      lastScannedAt: scannedAt,
      projects,
      nodes,
    };
  } catch (error) {
    return {
      status: "unavailable",
      message:
        error instanceof Error
          ? `Docker scan failed: ${error.message}`
          : "Docker scan failed because the Docker CLI was unavailable.",
      lastScannedAt: new Date().toISOString(),
      projects: [],
      nodes: [],
    };
  }
}

function applyDockerDiscovery(
  overview: PlatformOverview,
  discovery: PlatformDockerDiscoverySummary,
): PlatformOverview {
  return {
    ...overview,
    docker: discovery,
    stats: {
      ...overview.stats,
      dockerNodeCount: discovery.nodes.length,
      liveDockerNodes: discovery.nodes.filter((node) => node.state === "running").length,
      healthyDockerNodes: discovery.nodes.filter((node) => node.health === "healthy")
        .length,
      downDockerNodes: discovery.nodes.filter((node) => node.health === "offline")
        .length,
      composeProjects: discovery.projects.length,
    },
  };
}

async function overviewFromState(
  state: PlatformState,
  refreshDocker = false,
): Promise<PlatformOverview> {
  if (refreshDocker) {
    cachedDockerDiscovery = await scanDockerDiscovery(state);
  }

  const overview = buildPlatformOverview(state, cachedDockerDiscovery);

  return applyDockerDiscovery(overview, cachedDockerDiscovery);
}

async function runSmokeTargetProbe(
  state: PlatformState,
  targetId: string,
): Promise<PlatformOverview> {
  const normalized = normalizePlatformState(state);
  const target = normalized.smokeTargets.find((candidate) => candidate.id === targetId);

  if (!target) {
    return overviewFromState(normalized);
  }

  let result: PlatformSmokeTargetProbeResult;

  if (target.transport === "remote") {
    const remoteUrl = target.remoteUrl.trim();

    result = remoteUrl
      ? await runRemoteSmokeProbe(remoteUrl)
      : {
          status: "failed",
          detail: "Set the remote probe URL before running this smoke target.",
        };
  } else if (target.transport === "tcp") {
    const tcpHost = target.tcpHost.trim();

    result =
      tcpHost.length > 0 && target.tcpPort != null
        ? await runTcpSmokeProbe(tcpHost, target.tcpPort)
        : {
            status: "failed",
            detail: "Set the TCP host and port before running this smoke target.",
          };
  } else {
    const sshHost = target.sshHost.trim();
    const sshUsername = target.sshUsername.trim();

    result =
      sshHost.length > 0 && sshUsername.length > 0
        ? await runSshHandshake({
            host: sshHost,
            port: target.sshPort,
            username: sshUsername,
            keyPath: target.sshKeyPath,
          })
        : {
            status: "failed",
            detail: "Set the SSH host and username before running this smoke target.",
          };
  }

  const nextState = recordSmokeTargetProbeResult(normalized, targetId, result);
  writeState(nextState);
  return overviewFromState(nextState);
}

function createWindow(): void {
  const preloadPath = existsSync(join(__dirname, "../preload/index.cjs"))
    ? join(__dirname, "../preload/index.cjs")
    : existsSync(join(__dirname, "../preload/index.js"))
      ? join(__dirname, "../preload/index.js")
      : join(__dirname, "../preload/index.mjs");

  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    title: "Agent Desktop",
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: "#f4efe7",
    autoHideMenuBar: true,
    ...(process.platform !== "darwin" ? { icon: cubecloudWindowIcon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// Expose the renderer over the Chrome DevTools Protocol when ENABLE_CDP=1
// is set (used by `scripts/capture-previews.cjs` for visual regression and
// by `scripts/dev-cdp.cjs` for manual debugging). CDP_PORT defaults to 9222.
if (process.env.ENABLE_CDP === "1") {
  app.commandLine.appendSwitch(
    "remote-debugging-port",
    process.env.CDP_PORT || "9222",
  );
}

app.whenReady().then(() => {
  app.name = "Agent Desktop";
  if (process.platform === "win32") {
    app.setAppUserModelId("io.cubecloud.agentdesktop");
  }

  ipcMain.handle("platform:getOverview", () => overviewFromState(readState(), true));

  ipcMain.handle("platform:refreshDockerNodes", () =>
    overviewFromState(readState(), true),
  );

  ipcMain.handle(
    "platform:setDockerNodeBinding",
    (_event, nodeKey: string, appId: string | null) => {
      const nextState = setDockerNodeBinding(readState(), nodeKey, appId);
      writeState(nextState);
      return overviewFromState(nextState, true);
    },
  );

  ipcMain.handle(
    "platform:onboardDockerNodeAsCustomApp",
    async (_event, input: PlatformCustomAppOnboardingInput) => {
      const currentState = readState();
      const name = input.name.trim();

      if (!name) {
        return overviewFromState(currentState, true);
      }

      const discovery = await scanDockerDiscovery(currentState);
      const node = discovery.nodes.find(
        (candidate) => candidate.bindingKey === input.nodeKey,
      );

      if (!node) {
        return overviewFromState(currentState, true);
      }

      let nextState = upsertCustomApp(
        currentState,
        buildCustomAppFromDockerNode(currentState, input, node),
      );
      const onboardedAppId = nextState.customApps[nextState.customApps.length - 1]?.id;

      if (onboardedAppId) {
        nextState = setDockerNodeBinding(nextState, input.nodeKey, onboardedAppId);
      }

      writeState(nextState);
      return overviewFromState(nextState, true);
    },
  );

  ipcMain.handle(
    "platform:setAppEnabled",
    (_event, appId: string, enabled: boolean) => {
      const nextState = setAppEnabled(readState(), appId, enabled);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle("platform:setActiveView", (_event, view: PlatformView) => {
    const nextState = setActiveView(readState(), view);
    writeState(nextState);
    return overviewFromState(nextState);
  });

  ipcMain.handle(
    "platform:setActiveRuntimeProvider",
    (_event, runtimeProviderId: PlatformRuntimeProviderId) => {
      const nextState = setActiveRuntimeProvider(readState(), runtimeProviderId);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:setActiveTaskOrchestrator",
    (_event, taskOrchestratorId: PlatformTaskOrchestratorId) => {
      const nextState = setActiveTaskOrchestrator(readState(), taskOrchestratorId);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:setMissionCardStage",
    (_event, cardId: string, stage: PlatformMissionStage) => {
      const nextState = setMissionCardStage(readState(), cardId, stage);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:toggleMissionChecklistItem",
    (_event, cardId: string, checklistItemId: string) => {
      const nextState = toggleMissionChecklistItem(
        readState(),
        cardId,
        checklistItemId,
      );
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:setMissionCardServiceTier",
    (_event, cardId: string, serviceTier: PlatformServiceTier) => {
      const nextState = setMissionCardServiceTier(
        readState(),
        cardId,
        serviceTier,
      );
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:setRuntimeSurfaceConfig",
    (_event, appId: string, patch: PlatformRuntimeSurfacePatch) => {
      const nextState = setRuntimeSurfaceConfig(readState(), appId, patch);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle(
    "platform:setSmokeTargetConfig",
    (_event, targetId: string, patch: PlatformSmokeTargetPatch) => {
      const nextState = setSmokeTargetConfig(readState(), targetId, patch);
      writeState(nextState);
      return overviewFromState(nextState);
    },
  );

  ipcMain.handle("platform:runSmokeTarget", (_event, targetId: string) =>
    runSmokeTargetProbe(readState(), targetId),
  );

  ipcMain.handle("platform:openRuntimeSurface", (_event, appId: string) => {
    const surface = buildPlatformOverview(readState()).runtimeSurfaces.find(
      (candidate) => candidate.appId === appId,
    );

    if (!surface?.url) {
      return false;
    }

    void shell.openExternal(surface.url);
    return true;
  });

  ipcMain.handle("platform:openHermesGatewayLog", async () => {
    const summary = await getHermesRuntimeLifecycle();

    if (!summary.gatewayLogPath) {
      return "Hermes gateway stderr log is not available yet.";
    }

    const openResult = await shell.openPath(summary.gatewayLogPath);
    return openResult || null;
  });

  ipcMain.handle("platform:getHermesRuntimeLifecycle", () =>
    getHermesRuntimeLifecycle(),
  );

  ipcMain.handle("platform:verifyHermesRuntime", async (event) => {
    const summary = await verifyHermesRuntime((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:installHermesRuntime", async (event) => {
    const summary = await installHermesRuntime((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:repairHermesRuntime", async (event) => {
    const summary = await repairHermesRuntime((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:updateHermesRuntime", async (event) => {
    const summary = await updateHermesRuntime((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:runHermesDoctor", async (event) => {
    const summary = await runHermesDoctor((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:startHermesGateway", async (event) => {
    const summary = await startHermesGateway((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:stopHermesGateway", async (event) => {
    const summary = await stopHermesGateway((nextSummary) => {
      notifyHermesRuntimeLifecycleUpdated(event, nextSummary);
    });
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:adoptHermesHome", async (event) => {
    const dialogOptions: OpenDialogOptions = {
      title: "Select Hermes home",
      properties: ["openDirectory"],
    };
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);

    if (result.canceled || result.filePaths.length === 0) {
      const summary = await getHermesRuntimeLifecycle();
      notifyHermesRuntimeLifecycleUpdated(event, summary);
      return summary;
    }

    const summary = await adoptHermesHome(result.filePaths[0]);
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:resetHermesHomeAdoption", async (event) => {
    const summary = await resetHermesHomeAdoption();
    notifyHermesRuntimeLifecycleUpdated(event, summary);
    return summary;
  });

  ipcMain.handle("platform:listAgentSessions", () =>
    listControlPlaneSessions(activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle(
    "platform:getAgentSessionHistory",
    (_event, sessionId: string) =>
      getControlPlaneSessionHistory(
        sessionId,
        activeWorkspaceRuntimeProviderId(),
      ),
  );

  ipcMain.handle(
    "platform:saveAgentSessionSnapshot",
    (_event, input: WorkspaceSessionSnapshotInput) =>
      saveControlPlaneSessionSnapshot(input, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle(
    "platform:updateAgentSessionTitle",
    (_event, sessionId: string, title: string) =>
      updateControlPlaneSessionTitle(
        sessionId,
        title,
        activeWorkspaceRuntimeProviderId(),
      ),
  );

  ipcMain.handle("platform:deleteAgentSession", (_event, sessionId: string) =>
    deleteControlPlaneSession(sessionId, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:readSoul", () => readLocalSoul());

  ipcMain.handle("platform:writeSoul", (_event, content: string) =>
    writeLocalSoul(content),
  );

  ipcMain.handle("platform:resetSoul", () => resetLocalSoul());

  ipcMain.handle("platform:listWorkspaceProfiles", () =>
    listControlPlaneProfiles(
      activeWorkspaceRuntimeProviderId(),
      activeGatewayRunning(),
    ),
  );
  ipcMain.handle(
    "platform:saveWorkspaceProfile",
    (_event, input: WorkspaceProfileInput) =>
      saveControlPlaneProfile(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceProfile",
    (_event, name: string) =>
      removeControlPlaneProfile(name, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceModels", () =>
    listControlPlaneModels(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceModel",
    (_event, input: WorkspaceModelInput) =>
      saveControlPlaneModel(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle("platform:removeWorkspaceModel", (_event, id: string) =>
    removeControlPlaneModel(id, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceProviders", () =>
    listControlPlaneProviders(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:discoverProviderModels",
    (_event, providerType: string, baseUrl?: string, apiKey?: string) =>
      discoverControlPlaneProviderModels(providerType, baseUrl, apiKey),
  );
  ipcMain.handle(
    "platform:saveWorkspaceProvider",
    (_event, input: WorkspaceProviderInput) =>
      saveControlPlaneProvider(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceProvider",
    (_event, id: string) =>
      removeControlPlaneProvider(id, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceSkills", () =>
    listControlPlaneSkills(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceSkill",
    (_event, input: WorkspaceSkillInput) =>
      saveControlPlaneSkill(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle("platform:removeWorkspaceSkill", (_event, name: string) =>
    removeControlPlaneSkill(name, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceMemory", () =>
    listControlPlaneMemory(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceMemoryEntry",
    (_event, input: WorkspaceMemoryInput) =>
      saveControlPlaneMemoryEntry(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceMemoryEntry",
    (_event, id: string) =>
      removeControlPlaneMemoryEntry(id, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceTools", () =>
    listControlPlaneTools(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceTool",
    (_event, input: WorkspaceToolInput) =>
      saveControlPlaneTool(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceTool",
    (_event, name: string) =>
      removeControlPlaneTool(name, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:setWorkspaceToolEnabled",
    (_event, name: string, enabled: boolean) =>
      setControlPlaneToolEnabled(
        name,
        enabled,
        activeWorkspaceRuntimeProviderId(),
      ),
  );

  ipcMain.handle("platform:listWorkspaceSchedules", () =>
    listControlPlaneSchedules(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceSchedule",
    (_event, input: WorkspaceScheduleInput) =>
      saveControlPlaneSchedule(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceSchedule",
    (_event, id: string) =>
      removeControlPlaneSchedule(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:setWorkspaceScheduleEnabled",
    (_event, id: string, enabled: boolean) =>
      setControlPlaneScheduleEnabled(
        id,
        enabled,
        activeWorkspaceRuntimeProviderId(),
      ),
  );
  ipcMain.handle(
    "platform:triggerWorkspaceSchedule",
    (_event, id: string, contextOverride?: AgentDispatchContextOverride | null) =>
      triggerControlPlaneSchedule(
        id,
        activeWorkspaceRuntimeProviderId(),
        "schedule",
        Date.now(),
        contextOverride,
      ),
  );
  ipcMain.handle("platform:listWorkspaceDispatchRuns", () =>
    listControlPlaneDispatchRuns(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:dispatchWorkspaceProfile",
    (
      _event,
      profileName: string,
      contextOverride?: AgentDispatchContextOverride | null,
    ) =>
      dispatchControlPlaneProfile(
        profileName,
        activeWorkspaceRuntimeProviderId(),
        contextOverride,
      ),
  );

  ipcMain.handle("platform:listWorkspaceCodeGraphRepos", () =>
    listControlPlaneCodeGraphRepos(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceCodeGraphRepo",
    (_event, input: WorkspaceCodeGraphRepoInput) =>
      saveControlPlaneCodeGraphRepo(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceCodeGraphRepo",
    (_event, id: string) =>
      removeControlPlaneCodeGraphRepo(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:setCurrentWorkspaceCodeGraphRepo",
    (_event, id: string) =>
      setCurrentControlPlaneCodeGraphRepo(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:initializeWorkspaceCodeGraphRepo",
    (_event, id: string) =>
      initializeControlPlaneCodeGraphRepo(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:syncWorkspaceCodeGraphRepo",
    (_event, id: string) =>
      syncControlPlaneCodeGraphRepo(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle("platform:listWorkspaceCodeGraphEntrypoints", () =>
    listControlPlaneCodeGraphEntrypoints(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceCodeGraphEntrypoint",
    (_event, input: WorkspaceCodeGraphEntrypointInput) =>
      saveControlPlaneCodeGraphEntrypoint(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceCodeGraphEntrypoint",
    (_event, id: string) =>
      removeControlPlaneCodeGraphEntrypoint(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle("platform:listWorkspaceCodeGraphQueries", () =>
    listControlPlaneCodeGraphQueries(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceCodeGraphQuery",
    (_event, input: WorkspaceCodeGraphQueryInput) =>
      saveControlPlaneCodeGraphQuery(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceCodeGraphQuery",
    (_event, id: string) =>
      removeControlPlaneCodeGraphQuery(id, activeWorkspaceRuntimeProviderId()),
  );

  ipcMain.handle("platform:listWorkspaceEverOsHarnesses", () =>
    listControlPlaneEverOsHarnesses(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceEverOsHarness",
    (_event, input: WorkspaceEverOsHarnessInput) =>
      saveControlPlaneEverOsHarness(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceEverOsHarness",
    (_event, id: string) =>
      removeControlPlaneEverOsHarness(id, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:setWorkspaceEverOsHarnessEnabled",
    (_event, id: string, enabled: boolean) =>
      setControlPlaneEverOsHarnessEnabled(
        id,
        enabled,
        activeWorkspaceRuntimeProviderId(),
      ),
  );

  ipcMain.handle("platform:listWorkspaceKanbanBoards", () =>
    listControlPlaneKanbanBoards(activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:saveWorkspaceKanbanBoard",
    (_event, input: WorkspaceKanbanBoardInput) =>
      saveControlPlaneKanbanBoard(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceKanbanBoard",
    (_event, slug: string) =>
      removeControlPlaneKanbanBoard(slug, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:setCurrentWorkspaceKanbanBoard",
    (_event, boardSlug: string) =>
      setCurrentControlPlaneKanbanBoard(
        boardSlug,
        activeWorkspaceRuntimeProviderId(),
      ),
  );
  ipcMain.handle(
    "platform:listWorkspaceKanbanTasks",
    (_event, boardSlug?: string | null) =>
      listControlPlaneKanbanTasks(
        boardSlug,
        activeWorkspaceRuntimeProviderId(),
      ),
  );
  ipcMain.handle(
    "platform:saveWorkspaceKanbanTask",
    (_event, input: WorkspaceKanbanTaskInput) =>
      saveControlPlaneKanbanTask(input, activeWorkspaceRuntimeProviderId()),
  );
  ipcMain.handle(
    "platform:removeWorkspaceKanbanTask",
    (_event, id: string, boardSlug?: string | null) =>
      removeControlPlaneKanbanTask(
        id,
        boardSlug,
        activeWorkspaceRuntimeProviderId(),
      ),
  );

  startControlPlaneScheduler();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopControlPlaneScheduler();
});
