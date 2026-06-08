import { execFile, spawn, type ChildProcess } from "child_process";
import { randomBytes } from "crypto";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { request as httpRequest } from "http";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { app } from "electron";
import type {
  HermesRuntimeHomeState,
  HermesRuntimeInstallTargetState,
  HermesRuntimeLifecycleSummary,
  HermesRuntimeOperationKind,
  HermesRuntimeOperationStatus,
  HermesRuntimeOperationSummary,
  HermesRuntimeVerificationState,
} from "@cubecloud/platform-core";

const HERMES_HOME_DIR = ".hermes";
const LOCAL_HERMES_API_HEALTH_URL = "http://127.0.0.1:8642/health";
const VERIFY_TTL_MS = 5 * 60 * 1000;
const MAX_OPERATION_LOG_LENGTH = 8000;

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1B\[[0-9;]*[a-zA-Z]|\x1B\][^\x07]*\x07|\x1B\(B|\r/g;

const INSTALL_STAGE_MARKERS: ReadonlyArray<{
  pattern: RegExp;
  step: number;
  title: string;
}> = [
  {
    pattern: /Checking (for )?(git|uv|python|node|ripgrep|ffmpeg)/i,
    step: 1,
    title: "Checking prerequisites",
  },
  {
    pattern: /Installing uv|uv found|uv installed/i,
    step: 2,
    title: "Setting up package manager",
  },
  {
    pattern: /Installing Python|Python .* found|Python installed/i,
    step: 3,
    title: "Setting up Python",
  },
  {
    pattern:
      /Cloning|cloning|Updating.*repository|Repository|Installing to .*hermes-agent|Downloading PortableGit/i,
    step: 4,
    title: "Downloading Hermes Agent",
  },
  {
    pattern: /Creating virtual|virtual environment|uv venv|\bvenv\b/i,
    step: 5,
    title: "Creating Python environment",
  },
  {
    pattern:
      /pip install|Installing.*packages|dependencies|Trying tier|Resolving|Main package installed/i,
    step: 6,
    title: "Installing dependencies",
  },
  {
    pattern:
      /Installation complete|hermes command ready|Configuration directory ready|Hermes (installation )?(finished|is ready)/i,
    step: 7,
    title: "Finishing setup",
  },
];

const INSTALL_CHECKPOINT_LABELS = INSTALL_STAGE_MARKERS.map((marker) => marker.title);
const UPDATE_CHECKPOINT_LABELS = ["Updating Hermes Agent", "Verifying local runtime"] as const;
const VERIFY_CHECKPOINT_LABELS = ["Verifying local runtime"] as const;
const DOCTOR_CHECKPOINT_LABELS = ["Inspecting local runtime"] as const;
const START_GATEWAY_CHECKPOINT_LABELS = ["Starting local gateway"] as const;
const STOP_GATEWAY_CHECKPOINT_LABELS = ["Stopping local gateway"] as const;

type HermesHomeOverridePayload = {
  hermesHome?: unknown;
};

type HermesVerificationCache = {
  home: string;
  state: HermesRuntimeVerificationState;
  detail: string | null;
  version: string | null;
  ts: number;
};

type HermesDoctorCache = {
  home: string;
  output: string;
  ts: number;
};

type HermesRuntimeOperationCache = HermesRuntimeOperationSummary & {
  home: string;
};

type HermesRuntimeLifecycleUpdateListener = (
  summary: HermesRuntimeLifecycleSummary,
) => void | Promise<void>;

type HermesProgressState = {
  step: number;
  totalSteps: number;
  title: string;
  detail: string;
  log: string;
};

type HermesHomeInspection = {
  state: HermesRuntimeHomeState;
  detail: string;
};

let verifyCache: HermesVerificationCache | null = null;
let doctorCache: HermesDoctorCache | null = null;
let operationCache: HermesRuntimeOperationCache | null = null;
let gatewayProcess: ChildProcess | null = null;
let gatewayStartedByApp = false;

function appHome(): string {
  try {
    return app.getPath("home");
  } catch {
    return homedir();
  }
}

function looksLikeHermesHome(dir: string): boolean {
  if (!dir || !existsSync(dir)) {
    return false;
  }

  return [
    join(dir, "hermes-agent"),
    join(dir, "gateway.pid"),
    join(dir, "config.yaml"),
    join(dir, "active_profile"),
    join(dir, ".env"),
    join(dir, "state.db"),
  ].some((candidate) => existsSync(candidate));
}

function inspectHermesHome(home: string): HermesHomeInspection {
  const candidate = home.trim();
  if (!candidate || !existsSync(candidate)) {
    return {
      state: "empty",
      detail: "No Hermes home has been created at the selected location yet.",
    };
  }

  const repoPath = hermesRepoPath(candidate);
  const venvPath = join(repoPath, "venv");
  const { pythonPath, scriptPath } = installBinariesFor(candidate);
  const repoExists = existsSync(repoPath);
  const venvExists = existsSync(venvPath);
  const pythonExists = existsSync(pythonPath);
  const scriptExists = existsSync(scriptPath);
  const stateMarkersPresent = looksLikeHermesHome(candidate);

  if (pythonExists && scriptExists) {
    return {
      state: "installed",
      detail: "Hermes CLI binaries are installed in this home.",
    };
  }

  if (!repoExists && !venvExists && !stateMarkersPresent) {
    return {
      state: "empty",
      detail: "No Hermes checkout or runtime state is present in this home yet.",
    };
  }

  if (repoExists && !pythonExists && !scriptExists) {
    return {
      state: "partial",
      detail: "Hermes repo checkout found, but the local venv and CLI binaries are missing. Use Repair Hermes locally to complete the install.",
    };
  }

  if (repoExists && !pythonExists) {
    return {
      state: "partial",
      detail: "Hermes repo checkout found, but the local Python runtime is missing. Use Repair Hermes locally to rebuild the venv.",
    };
  }

  if (repoExists && !scriptExists) {
    return {
      state: "partial",
      detail: "Hermes repo checkout found, but the Hermes CLI launcher is missing. Use Repair Hermes locally to restore it.",
    };
  }

  return {
    state: "partial",
    detail: "Hermes state exists in this home, but the local runtime is incomplete. Use Repair Hermes locally before relying on this lane.",
  };
}

export function defaultHermesHome(): string {
  const homeDotHermes = join(appHome(), HERMES_HOME_DIR);

  if (process.platform !== "win32") {
    return homeDotHermes;
  }

  const localAppHermes = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "hermes")
    : "";

  if (localAppHermes && looksLikeHermesHome(localAppHermes)) {
    return localAppHermes;
  }

  if (looksLikeHermesHome(homeDotHermes)) {
    return homeDotHermes;
  }

  return localAppHermes || homeDotHermes;
}

function hermesHomeOverrideFile(): string {
  try {
    return join(app.getPath("userData"), "hermes-home.json");
  } catch {
    return "";
  }
}

export function readHermesHomeOverride(): string {
  try {
    const overrideFile = hermesHomeOverrideFile();
    if (!overrideFile || !existsSync(overrideFile)) {
      return "";
    }

    const parsed = JSON.parse(readFileSync(overrideFile, "utf-8")) as HermesHomeOverridePayload;
    const candidate =
      typeof parsed.hermesHome === "string" ? parsed.hermesHome.trim() : "";

    return candidate && existsSync(candidate) ? candidate : "";
  } catch {
    return "";
  }
}

export function setHermesHomeOverride(home: string): void {
  try {
    const overrideFile = hermesHomeOverrideFile();
    if (!overrideFile) {
      return;
    }

    const nextHome = home.trim();
    if (!nextHome) {
      if (existsSync(overrideFile)) {
        unlinkSync(overrideFile);
      }
      return;
    }

    writeFileSync(
      overrideFile,
      JSON.stringify({ hermesHome: nextHome }, null, 2),
      "utf-8",
    );
  } catch {
    // Best effort only. A failed write just falls back to default resolution.
  }
}

export function resolveHermesHome(): string {
  const envHome = process.env.HERMES_HOME?.trim();
  if (envHome) {
    return envHome;
  }

  return readHermesHomeOverride() || defaultHermesHome();
}

export function validateHermesHomePath(home: string): boolean {
  const candidate = home.trim();
  if (!candidate || !existsSync(candidate)) {
    return false;
  }

  const { pythonPath, scriptPath } = installBinariesFor(candidate);

  return existsSync(scriptPath) && existsSync(pythonPath);
}

function hermesRepoPath(home: string): string {
  return join(home, "hermes-agent");
}

function installBinariesFor(
  home: string,
): { pythonPath: string; scriptPath: string } {
  const repoPath = hermesRepoPath(home);
  const venvPath = join(repoPath, "venv");

  return process.platform === "win32"
    ? {
        pythonPath: join(venvPath, "Scripts", "python.exe"),
        scriptPath: join(venvPath, "Scripts", "hermes.exe"),
      }
    : {
        pythonPath: join(venvPath, "bin", "python"),
        scriptPath: join(repoPath, "hermes"),
      };
}

function activeProfileName(baseHome: string): string {
  try {
    const activeProfilePath = join(baseHome, "active_profile");
    if (!existsSync(activeProfilePath)) {
      return "default";
    }

    const profileName = readFileSync(activeProfilePath, "utf-8").trim();
    return profileName || "default";
  } catch {
    return "default";
  }
}

function profileHome(baseHome: string, profileName: string): string {
  if (!profileName || profileName === "default") {
    return baseHome;
  }

  return join(baseHome, "profiles", profileName);
}

function activeEnvFile(baseHome: string, profileName: string): string {
  return join(profileHome(baseHome, profileName), ".env");
}

function activeAuthFile(baseHome: string, profileName: string): string {
  return join(profileHome(baseHome, profileName), "auth.json");
}

function classifyInstallTarget(
  repoExists: boolean,
  repoIsGitRepo: boolean,
): HermesRuntimeInstallTargetState {
  if (!repoExists) {
    return "fresh";
  }

  return repoIsGitRepo ? "update" : "replace";
}

function currentVerificationCache(home: string): HermesVerificationCache | null {
  if (!verifyCache || verifyCache.home !== home) {
    return null;
  }

  return Date.now() - verifyCache.ts <= VERIFY_TTL_MS ? verifyCache : null;
}

function writeVerificationCache(
  home: string,
  state: HermesRuntimeVerificationState,
  detail: string | null,
  version: string | null,
): void {
  verifyCache = {
    home,
    state,
    detail,
    version,
    ts: Date.now(),
  };
}

function clearVerificationCache(home?: string): void {
  if (!verifyCache) {
    return;
  }

  if (!home || verifyCache.home === home) {
    verifyCache = null;
  }
}

function currentDoctorCache(home: string): HermesDoctorCache | null {
  if (!doctorCache || doctorCache.home !== home) {
    return null;
  }

  return doctorCache;
}

function writeDoctorCache(home: string, output: string): void {
  doctorCache = {
    home,
    output,
    ts: Date.now(),
  };
}

function clearDoctorCache(home?: string): void {
  if (!doctorCache) {
    return;
  }

  if (!home || doctorCache.home === home) {
    doctorCache = null;
  }
}

function currentOperation(home: string): HermesRuntimeOperationSummary | null {
  if (!operationCache || operationCache.home !== home) {
    return null;
  }

  return {
    kind: operationCache.kind,
    status: operationCache.status,
    startedAt: operationCache.startedAt,
    completedAt: operationCache.completedAt,
    step: operationCache.step,
    totalSteps: operationCache.totalSteps,
    title: operationCache.title,
    detail: operationCache.detail,
    log: operationCache.log,
    rollbackHint: operationCache.rollbackHint,
    checkpoints: operationCache.checkpoints.map((checkpoint) => ({ ...checkpoint })),
  };
}

function clearOperationCache(home?: string): void {
  if (!operationCache) {
    return;
  }

  if (!home || operationCache.home === home) {
    operationCache = null;
  }
}

function stripAnsi(value: string): string {
  return value.replace(ANSI_RE, "");
}

function trimOperationLog(value: string): string {
  if (value.length <= MAX_OPERATION_LOG_LENGTH) {
    return value;
  }

  return value.slice(-MAX_OPERATION_LOG_LENGTH);
}

function readTextTail(filePath: string, maxLines = 40): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const lines = stripAnsi(readFileSync(filePath, "utf-8"))
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return null;
    }

    return lines.slice(-maxLines).join("\n");
  } catch {
    return null;
  }
}

function probeLocalHermesGatewayReady(): Promise<{ ready: boolean; detail: string }> {
  return new Promise((resolve) => {
    const request = httpRequest(
      LOCAL_HERMES_API_HEALTH_URL,
      {
        method: "GET",
        timeout: 1200,
      },
      (response) => {
        const ready = response.statusCode === 200;
        resolve({
          ready,
          detail: ready
            ? `Local API server responded on ${LOCAL_HERMES_API_HEALTH_URL}.`
            : `Local API server returned ${response.statusCode ?? "no status"} from ${LOCAL_HERMES_API_HEALTH_URL}.`,
        });
        response.resume();
      },
    );

    request.on("error", () => {
      resolve({
        ready: false,
        detail: `Local API server is not reachable on ${LOCAL_HERMES_API_HEALTH_URL} yet.`,
      });
    });

    request.on("timeout", () => {
      request.destroy();
      resolve({
        ready: false,
        detail: `Local API server did not respond on ${LOCAL_HERMES_API_HEALTH_URL} before the health-check timeout.`,
      });
    });

    request.end();
  });
}

function checkpointLabelsFor(
  kind: HermesRuntimeOperationKind,
): readonly string[] {
  switch (kind) {
    case "install":
    case "repair":
      return INSTALL_CHECKPOINT_LABELS;
    case "update":
      return UPDATE_CHECKPOINT_LABELS;
    case "verify":
      return VERIFY_CHECKPOINT_LABELS;
    case "doctor":
      return DOCTOR_CHECKPOINT_LABELS;
    case "start-gateway":
      return START_GATEWAY_CHECKPOINT_LABELS;
    case "stop-gateway":
      return STOP_GATEWAY_CHECKPOINT_LABELS;
  }
}

function buildOperationCheckpoints(
  kind: HermesRuntimeOperationKind,
  step: number,
  totalSteps: number,
  status: HermesRuntimeOperationStatus,
): HermesRuntimeOperationSummary["checkpoints"] {
  const labels = checkpointLabelsFor(kind).slice(0, totalSteps);
  const activeStep = Math.min(Math.max(step, 1), totalSteps);
  const completedStep = status === "succeeded" ? totalSteps : activeStep - 1;

  return labels.map((label, index) => {
    const checkpointStep = index + 1;

    return {
      id: `${kind}-${checkpointStep}`,
      label,
      state:
        checkpointStep <= completedStep
          ? "completed"
          : checkpointStep === activeStep
            ? "active"
            : "pending",
    };
  });
}

async function publishLifecycleUpdate(
  home: string,
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<void> {
  if (!onUpdate) {
    return;
  }

  await onUpdate(await getHermesRuntimeLifecycleFor(home));
}

async function setOperationState(
  home: string,
  input: {
    kind: HermesRuntimeOperationKind;
    status: HermesRuntimeOperationStatus;
    step: number;
    totalSteps: number;
    title: string;
    detail?: string | null;
    log?: string | null;
    rollbackHint?: string | null;
    startedAt?: number;
    completedAt?: number | null;
  },
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<void> {
  const previous = operationCache?.home === home ? operationCache : null;
  const totalSteps = Math.max(input.totalSteps, 1);
  const step = Math.min(Math.max(input.step, 1), totalSteps);

  operationCache = {
    home,
    kind: input.kind,
    status: input.status,
    startedAt: input.startedAt ?? previous?.startedAt ?? Date.now(),
    completedAt:
      input.completedAt ??
      (input.status === "running" ? null : Date.now()),
    step,
    totalSteps,
    title: input.title,
    detail: input.detail ?? previous?.detail ?? null,
    log:
      typeof input.log === "string"
        ? trimOperationLog(input.log)
        : previous?.log ?? null,
    rollbackHint: input.rollbackHint ?? previous?.rollbackHint ?? null,
    checkpoints: buildOperationCheckpoints(input.kind, step, totalSteps, input.status),
  };

  await publishLifecycleUpdate(home, onUpdate);
}

function rollbackHintForInstallTarget(state: HermesRuntimeInstallTargetState): string {
  switch (state) {
    case "fresh":
      return "Rollback checkpoint: keep a known-good adopted Hermes home ready if this fresh install fails verification, then retry after cleaning the target folder.";
    case "replace":
      return "Rollback checkpoint: this target is replacing an invalid checkout. If the new runtime misbehaves, adopt a known-good Hermes home before retrying.";
    case "update":
      return "Rollback checkpoint: if verification fails after the update, rerun local install to rebuild the checkout or adopt a known-good Hermes home.";
  }
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  try {
    return readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .reduce<Record<string, string>>((acc, line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return acc;
        }

        const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) {
          return acc;
        }

        acc[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
        return acc;
      }, {});
  } catch {
    return {};
  }
}

function gatewayLogPath(home: string): string {
  return join(home, "gateway-stderr.log");
}

function gatewayPidPaths(home: string): string[] {
  const activeProfile = activeProfileName(home);
  const paths = [join(home, "gateway.pid")];

  if (activeProfile && activeProfile !== "default") {
    paths.push(join(profileHome(home, activeProfile), "gateway.pid"));
  }

  return paths;
}

function parsePidFromFile(pidFile: string): number | null {
  if (!existsSync(pidFile)) {
    return null;
  }

  try {
    const raw = readFileSync(pidFile, "utf-8").trim();
    const parsed = raw.startsWith("{") ? JSON.parse(raw).pid : Number.parseInt(raw, 10);
    return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function gatewayPidPresent(home: string): boolean {
  return gatewayPidPaths(home).some((candidate) => existsSync(candidate));
}

function readGatewayPid(home: string): number | null {
  for (const pidFile of gatewayPidPaths(home)) {
    const pid = parsePidFromFile(pidFile);
    if (pid !== null) {
      return pid;
    }
  }

  return null;
}

function clearGatewayPidFiles(home: string): void {
  for (const pidFile of gatewayPidPaths(home)) {
    if (!existsSync(pidFile)) {
      continue;
    }

    try {
      unlinkSync(pidFile);
    } catch {
      // Best effort cleanup only.
    }
  }
}

function pidIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function isHermesGatewayRunning(home: string): boolean {
  if (gatewayProcess && !gatewayProcess.killed) {
    return true;
  }

  const pid = readGatewayPid(home);
  if (!pid) {
    return false;
  }

  const alive = pidIsAlive(pid);
  if (!alive) {
    clearGatewayPidFiles(home);
  }

  return alive;
}

function envHasApiKey(envFilePath: string): boolean {
  if (!existsSync(envFilePath)) {
    return false;
  }

  try {
    return readFileSync(envFilePath, "utf-8")
      .split(/\r?\n/)
      .some((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          return false;
        }

        const match = trimmed.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
        if (!match) {
          return false;
        }

        const key = match[1];
        const value = match[2].trim().replace(/^['"]|['"]$/g, "");
        if (!value) {
          return false;
        }

        return /(_API_KEY|_TOKEN|HF_TOKEN)$/.test(key);
      });
  } catch {
    return false;
  }
}

function buildHermesCliInvocation(
  home: string,
  args: string[],
): { command: string; args: string[]; cwd: string } {
  const { pythonPath, scriptPath } = installBinariesFor(home);
  const cwd = hermesRepoPath(home);

  if (process.platform === "win32") {
    return {
      command: pythonPath,
      args: ["-m", "hermes_cli.main", ...args],
      cwd,
    };
  }

  return {
    command: scriptPath,
    args,
    cwd,
  };
}

function execHermesCommandDetailed(
  home: string,
  args: string[],
  timeout = 15_000,
): Promise<{ stdout: string; stderr: string; error: Error | null }> {
  const invocation = buildHermesCliInvocation(home, args);

  return new Promise((resolve, reject) => {
    execFile(
      invocation.command,
      invocation.args,
      {
        cwd: invocation.cwd,
        env: {
          ...process.env,
          HERMES_HOME: home,
        },
        timeout,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({
          stdout: stripAnsi(stdout.toString()),
          stderr: stripAnsi(stderr.toString()),
          error: error ? new Error(error.message) : null,
        });
      },
    );
  });
}

async function execHermesCommand(
  home: string,
  args: string[],
  timeout = 15_000,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execHermesCommandDetailed(home, args, timeout);

  if (result.error) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || result.error.message);
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runHermesCommandStreaming(
  home: string,
  args: string[],
  timeout: number,
  onOutput: (progress: { chunk: string; log: string }) => void,
): Promise<void> {
  const invocation = buildHermesCliInvocation(home, args);

  return new Promise((resolve, reject) => {
    const processHandle = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: {
        ...process.env,
        HERMES_HOME: home,
        TERM: "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let combinedOutput = "";
    const timeoutHandle =
      timeout > 0
        ? setTimeout(() => {
            processHandle.kill();
            reject(new Error(`Hermes command timed out after ${timeout}ms.`));
          }, timeout)
        : null;

    const emit = (chunk: Buffer): void => {
      const text = stripAnsi(chunk.toString());
      if (!text) {
        return;
      }

      combinedOutput = trimOperationLog(`${combinedOutput}${text}`);
      onOutput({
        chunk: text,
        log: combinedOutput,
      });
    };

    processHandle.stdout?.on("data", emit);
    processHandle.stderr?.on("data", emit);

    processHandle.on("close", (code) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          combinedOutput.trim() || `Hermes command exited with code ${code ?? -1}.`,
        ),
      );
    });

    processHandle.on("error", (error) => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      reject(new Error(`Could not start the Hermes command: ${error.message}`));
    });
  });
}

function resolvePowerShellExe(): string {
  const programFiles = process.env.ProgramFiles;
  const candidates = [
    programFiles ? join(programFiles, "PowerShell", "7", "pwsh.exe") : "",
    "pwsh.exe",
    "powershell.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate.includes("\\") || existsSync(candidate)) {
      return candidate;
    }
  }

  return "powershell.exe";
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function runProcess(
  command: string,
  args: string[],
  options: {
    cwd: string;
    env?: NodeJS.ProcessEnv;
  },
  successCheck: () => boolean,
  onOutput?: (progress: { chunk: string; log: string }) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const processHandle = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let combinedOutput = "";

    processHandle.stdout?.on("data", (chunk: Buffer) => {
      const text = stripAnsi(chunk.toString());
      if (!text) {
        return;
      }

      combinedOutput = trimOperationLog(`${combinedOutput}${text}`);
      onOutput?.({ chunk: text, log: combinedOutput });
    });
    processHandle.stderr?.on("data", (chunk: Buffer) => {
      const text = stripAnsi(chunk.toString());
      if (!text) {
        return;
      }

      combinedOutput = trimOperationLog(`${combinedOutput}${text}`);
      onOutput?.({ chunk: text, log: combinedOutput });
    });

    processHandle.on("close", (code) => {
      if (code === 0 || successCheck()) {
        resolve();
        return;
      }

      reject(
        new Error(
          combinedOutput.trim() || `Hermes installer exited with code ${code ?? -1}.`,
        ),
      );
    });

    processHandle.on("error", (error) => {
      reject(new Error(`Could not start the Hermes installer: ${error.message}`));
    });
  });
}

async function runHermesInstaller(
  home: string,
  onProgress?: (progress: HermesProgressState) => void,
): Promise<void> {
  const repoPath = hermesRepoPath(home);
  const installExists = () => validateHermesHomePath(home);
  const cwd = appHome();
  const totalSteps = INSTALL_CHECKPOINT_LABELS.length;
  let currentStep = 1;
  let currentTitle = INSTALL_CHECKPOINT_LABELS[0];
  let log = "Running official Hermes install script...\n";

  clearVerificationCache(home);
  clearDoctorCache(home);

  onProgress?.({
    step: currentStep,
    totalSteps,
    title: currentTitle,
    detail: "Running official Hermes install script.",
    log,
  });

  const emitProgress = (progress: { chunk: string; log: string }): void => {
    log = progress.log;

    for (const marker of INSTALL_STAGE_MARKERS) {
      if (marker.pattern.test(progress.chunk) && marker.step >= currentStep) {
        currentStep = marker.step;
        currentTitle = marker.title;
        break;
      }
    }

    const detail = progress.chunk.trim().slice(0, 160) || currentTitle;
    onProgress?.({
      step: currentStep,
      totalSteps,
      title: currentTitle,
      detail,
      log,
    });
  };

  if (process.platform === "win32") {
    const wrapperPath = join(
      tmpdir(),
      `cubecloud-hermes-install-${randomBytes(6).toString("hex")}.ps1`,
    );
    const wrapperScript = [
      "$ErrorActionPreference = 'Stop'",
      "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}",
      "$url = 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1'",
      `$installer = Join-Path $env:TEMP ("hermes-install-script-" + [guid]::NewGuid().ToString() + ".ps1")`,
      "$resp = Invoke-WebRequest -Uri $url -UseBasicParsing",
      "$text = if ($resp.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($resp.Content) } else { [string]$resp.Content }",
      "if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }",
      "[System.IO.File]::WriteAllText($installer, $text, (New-Object System.Text.UTF8Encoding $true))",
      `& $installer -SkipSetup -HermesHome ${psQuote(home)} -InstallDir ${psQuote(repoPath)}`,
      "$exit = $LASTEXITCODE",
      "Remove-Item -Force -ErrorAction SilentlyContinue $installer",
      "exit $exit",
      "",
    ].join("\r\n");

    writeFileSync(wrapperPath, wrapperScript, "utf-8");

    try {
      await runProcess(
        resolvePowerShellExe(),
        [
          "-ExecutionPolicy",
          "Bypass",
          "-NoProfile",
          "-NonInteractive",
          "-File",
          wrapperPath,
        ],
        {
          cwd,
          env: {
            ...process.env,
            HERMES_HOME: home,
            NO_COLOR: "1",
          },
        },
        installExists,
        emitProgress,
      );
    } finally {
      try {
        unlinkSync(wrapperPath);
      } catch {
        // Best effort cleanup only.
      }
    }

    return;
  }

  await runProcess(
    "bash",
    [
      "-c",
      "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash -s -- --skip-setup",
    ],
    {
      cwd,
      env: {
        ...process.env,
        HOME: cwd,
        HERMES_HOME: home,
      },
    },
    installExists,
    emitProgress,
  );
}

async function runHermesUpdate(
  home: string,
  onProgress?: (progress: HermesProgressState) => void,
): Promise<void> {
  const totalSteps = UPDATE_CHECKPOINT_LABELS.length;
  let log = "Running hermes update...\n";

  onProgress?.({
    step: 1,
    totalSteps,
    title: UPDATE_CHECKPOINT_LABELS[0],
    detail: "Running hermes update.",
    log,
  });

  await runHermesCommandStreaming(home, ["update"], 180_000, ({ chunk, log: nextLog }) => {
    log = nextLog;
    onProgress?.({
      step: 1,
      totalSteps,
      title: UPDATE_CHECKPOINT_LABELS[0],
      detail: chunk.trim().slice(0, 160) || UPDATE_CHECKPOINT_LABELS[0],
      log,
    });
  });
}

async function performHermesVerification(home: string): Promise<{
  ok: boolean;
  detail: string;
  version: string | null;
}> {
  if (!validateHermesHomePath(home)) {
    const detail = "Hermes is not installed in the selected home yet.";
    writeVerificationCache(home, "failed", detail, null);
    return {
      ok: false,
      detail,
      version: null,
    };
  }

  try {
    const result = await execHermesCommand(home, ["--version"]);
    const version = result.stdout.trim() || result.stderr.trim() || "Hermes CLI available";
    const detail = "Hermes CLI responded successfully.";
    writeVerificationCache(home, "verified", detail, version);
    return {
      ok: true,
      detail,
      version,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Hermes CLI verification failed.";
    writeVerificationCache(home, "failed", detail, null);
    return {
      ok: false,
      detail,
      version: null,
    };
  }
}

export function inspectHermesInstallTarget(
  home = resolveHermesHome(),
): { hermesHome: string; repoPath: string; state: HermesRuntimeInstallTargetState } {
  const repoPath = hermesRepoPath(home);
  const repoExists = existsSync(repoPath);
  const repoIsGitRepo = repoExists && existsSync(join(repoPath, ".git"));

  return {
    hermesHome: home,
    repoPath,
    state: classifyInstallTarget(repoExists, repoIsGitRepo),
  };
}

async function getHermesRuntimeLifecycleFor(
  home: string,
): Promise<HermesRuntimeLifecycleSummary> {
  const repoPath = hermesRepoPath(home);
  const profile = activeProfileName(home);
  const envFilePath = activeEnvFile(home, profile);
  const authFilePath = activeAuthFile(home, profile);
  const configFilePath = join(home, "config.yaml");
  const verification = currentVerificationCache(home);
  const doctor = currentDoctorCache(home);
  const homeInspection = inspectHermesHome(home);
  const installed = homeInspection.state === "installed";
  const installTarget = inspectHermesInstallTarget(home);
  const gatewayLogFilePath = gatewayLogPath(home);
  const gatewayLogTail = readTextTail(gatewayLogFilePath);
  const gatewayPidDetected = gatewayPidPresent(home);
  const gatewayRunning = isHermesGatewayRunning(home);
  const gatewayReadyStatus = gatewayRunning
    ? await probeLocalHermesGatewayReady()
    : {
        ready: false,
        detail: gatewayPidDetected
          ? "A gateway pid file exists, but no live local gateway process was detected."
          : "Local gateway is not running.",
      };

  return {
    hermesHome: home,
    repoPath,
    installTargetState: installTarget.state,
    homeState: homeInspection.state,
    homeStateDetail: homeInspection.detail,
    overrideActive: Boolean(readHermesHomeOverride()),
    installed,
    configured:
      existsSync(envFilePath) || existsSync(authFilePath) || existsSync(configFilePath),
    hasApiKey: existsSync(authFilePath) || envHasApiKey(envFilePath),
    gatewayPidPresent: gatewayPidDetected,
    gatewayRunning,
    gatewayReady: gatewayReadyStatus.ready,
    gatewayReadyDetail: gatewayReadyStatus.detail,
    gatewayLogPath: gatewayLogFilePath,
    gatewayLogTail,
    activeProfile: profile,
    version: verification?.version ?? null,
    verificationState: installed
      ? verification?.state ?? "unknown"
      : "failed",
    verificationDetail: installed
      ? verification?.detail ?? null
      : homeInspection.detail,
    lastVerifiedAt: verification?.ts ?? null,
    lastDoctorAt: doctor?.ts ?? null,
    lastDoctorOutput: doctor?.output ?? null,
    operation: currentOperation(home),
  };
}

export async function getHermesRuntimeLifecycle(): Promise<HermesRuntimeLifecycleSummary> {
  return getHermesRuntimeLifecycleFor(resolveHermesHome());
}

export async function verifyHermesRuntime(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const totalSteps = VERIFY_CHECKPOINT_LABELS.length;

  await setOperationState(
    home,
    {
      kind: "verify",
      status: "running",
      step: 1,
      totalSteps,
      title: VERIFY_CHECKPOINT_LABELS[0],
      detail: "Running hermes --version.",
      log: "Running hermes --version...\n",
    },
    onUpdate,
  );

  const verification = await performHermesVerification(home);

  await setOperationState(
    home,
    {
      kind: "verify",
      status: verification.ok ? "succeeded" : "failed",
      step: totalSteps,
      totalSteps,
      title: verification.ok ? "Local runtime verified" : "Local runtime needs attention",
      detail: verification.detail,
      log: currentOperation(home)?.log ?? null,
    },
    onUpdate,
  );

  return getHermesRuntimeLifecycleFor(home);
}

async function runHermesSetupFlow(
  kind: "install" | "repair",
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const installTarget = inspectHermesInstallTarget(home);
  const totalSteps = INSTALL_CHECKPOINT_LABELS.length;
  const rollbackHint = rollbackHintForInstallTarget(installTarget.state);
  const startDetail =
    kind === "repair"
      ? "Repairing the partial Hermes local runtime."
      : "Running official Hermes install script.";

  await setOperationState(
    home,
    {
      kind,
      status: "running",
      step: 1,
      totalSteps,
      title: INSTALL_CHECKPOINT_LABELS[0],
      detail: startDetail,
      log: `${startDetail}\n`,
      rollbackHint,
    },
    onUpdate,
  );

  try {
    await runHermesInstaller(home, async (progress) => {
      await setOperationState(
        home,
        {
          kind,
          status: "running",
          step: progress.step,
          totalSteps: progress.totalSteps,
          title: progress.title,
          detail: progress.detail,
          log: progress.log,
          rollbackHint,
        },
        onUpdate,
      );
    });

    const verification = await performHermesVerification(home);
    await setOperationState(
      home,
      {
        kind,
        status: verification.ok ? "succeeded" : "failed",
        step: totalSteps,
        totalSteps,
        title:
          kind === "repair"
            ? verification.ok
              ? "Hermes local runtime repaired"
              : "Hermes repair needs attention"
            : verification.ok
              ? "Hermes local runtime ready"
              : "Hermes install needs attention",
        detail: verification.detail,
        log: currentOperation(home)?.log ?? null,
        rollbackHint,
      },
      onUpdate,
    );

    if (!verification.ok) {
      throw new Error(verification.detail);
    }

    return getHermesRuntimeLifecycleFor(home);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : kind === "repair"
          ? "Hermes repair failed."
          : "Hermes install failed.";
    writeVerificationCache(home, "failed", message, null);

    const previous = currentOperation(home);
    await setOperationState(
      home,
      {
        kind,
        status: "failed",
        step: previous?.step ?? 1,
        totalSteps: previous?.totalSteps ?? totalSteps,
        title:
          previous?.title ??
          (kind === "repair" ? "Hermes repair needs attention" : "Hermes install needs attention"),
        detail: message,
        log: previous?.log ?? null,
        rollbackHint,
      },
      onUpdate,
    );

    throw error instanceof Error ? error : new Error(message);
  }
}

export async function installHermesRuntime(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  return runHermesSetupFlow("install", onUpdate);
}

export async function repairHermesRuntime(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const homeInspection = inspectHermesHome(home);

  if (homeInspection.state === "installed") {
    throw new Error("Hermes is already installed in this home. Use Update Hermes locally instead.");
  }

  return runHermesSetupFlow(homeInspection.state === "empty" ? "install" : "repair", onUpdate);
}

export async function updateHermesRuntime(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();

  if (!validateHermesHomePath(home)) {
    throw new Error("Hermes must be installed before it can be updated.");
  }

  const totalSteps = UPDATE_CHECKPOINT_LABELS.length;
  const rollbackHint = rollbackHintForInstallTarget(inspectHermesInstallTarget(home).state);

  clearVerificationCache(home);
  await setOperationState(
    home,
    {
      kind: "update",
      status: "running",
      step: 1,
      totalSteps,
      title: UPDATE_CHECKPOINT_LABELS[0],
      detail: "Running hermes update.",
      log: "Running hermes update...\n",
      rollbackHint,
    },
    onUpdate,
  );

  try {
    await runHermesUpdate(home, async (progress) => {
      await setOperationState(
        home,
        {
          kind: "update",
          status: "running",
          step: progress.step,
          totalSteps: progress.totalSteps,
          title: progress.title,
          detail: progress.detail,
          log: progress.log,
          rollbackHint,
        },
        onUpdate,
      );
    });

    await setOperationState(
      home,
      {
        kind: "update",
        status: "running",
        step: 2,
        totalSteps,
        title: UPDATE_CHECKPOINT_LABELS[1],
        detail: "Verifying the updated local runtime.",
        log: currentOperation(home)?.log ?? null,
        rollbackHint,
      },
      onUpdate,
    );

    const verification = await performHermesVerification(home);
    await setOperationState(
      home,
      {
        kind: "update",
        status: verification.ok ? "succeeded" : "failed",
        step: totalSteps,
        totalSteps,
        title: verification.ok ? "Local runtime updated" : "Hermes update needs attention",
        detail: verification.detail,
        log: currentOperation(home)?.log ?? null,
        rollbackHint,
      },
      onUpdate,
    );

    if (!verification.ok) {
      throw new Error(verification.detail);
    }

    return getHermesRuntimeLifecycleFor(home);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hermes update failed.";
    writeVerificationCache(home, "failed", message, null);

    const previous = currentOperation(home);
    await setOperationState(
      home,
      {
        kind: "update",
        status: "failed",
        step: previous?.step ?? 1,
        totalSteps: previous?.totalSteps ?? totalSteps,
        title: previous?.title ?? "Hermes update needs attention",
        detail: message,
        log: previous?.log ?? null,
        rollbackHint,
      },
      onUpdate,
    );

    throw error instanceof Error ? error : new Error(message);
  }
}

export async function runHermesDoctor(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const totalSteps = DOCTOR_CHECKPOINT_LABELS.length;
  const installed = validateHermesHomePath(home);

  await setOperationState(
    home,
    {
      kind: "doctor",
      status: installed ? "running" : "failed",
      step: 1,
      totalSteps,
      title: DOCTOR_CHECKPOINT_LABELS[0],
      detail: installed
        ? "Running hermes doctor."
        : "Hermes is not installed in the selected home yet.",
      log: installed
        ? "Running hermes doctor...\n"
        : "Hermes is not installed in the selected home yet.\n",
    },
    onUpdate,
  );

  if (!installed) {
    writeDoctorCache(home, "Hermes is not installed.");
    return getHermesRuntimeLifecycleFor(home);
  }

  const result = await execHermesCommandDetailed(home, ["doctor"], 30_000);
  const output =
    result.stdout.trim() ||
    result.stderr.trim() ||
    result.error?.message ||
    "Doctor check completed with no output.";

  writeDoctorCache(home, output);

  await setOperationState(
    home,
    {
      kind: "doctor",
      status: result.error ? "failed" : "succeeded",
      step: totalSteps,
      totalSteps,
      title: result.error ? "Doctor check needs attention" : "Doctor check complete",
      detail: result.error ? output : "Doctor check completed.",
      log: output,
    },
    onUpdate,
  );

  return getHermesRuntimeLifecycleFor(home);
}

export async function startHermesGateway(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const totalSteps = START_GATEWAY_CHECKPOINT_LABELS.length;

  await setOperationState(
    home,
    {
      kind: "start-gateway",
      status: "running",
      step: 1,
      totalSteps,
      title: START_GATEWAY_CHECKPOINT_LABELS[0],
      detail: "Preparing the local Hermes gateway.",
      log: "Starting local Hermes gateway...\n",
    },
    onUpdate,
  );

  if (!validateHermesHomePath(home)) {
    const message = "Hermes must be installed before starting the local gateway.";
    await setOperationState(
      home,
      {
        kind: "start-gateway",
        status: "failed",
        step: totalSteps,
        totalSteps,
        title: "Gateway start needs attention",
        detail: message,
        log: `${currentOperation(home)?.log ?? ""}${message}\n`,
      },
      onUpdate,
    );
    throw new Error(message);
  }

  if (isHermesGatewayRunning(home)) {
    await setOperationState(
      home,
      {
        kind: "start-gateway",
        status: "succeeded",
        step: totalSteps,
        totalSteps,
        title: "Local gateway already running",
        detail: "The Hermes gateway already has a live local process.",
        log: `${currentOperation(home)?.log ?? ""}Gateway already running.\n`,
      },
      onUpdate,
    );
    return getHermesRuntimeLifecycleFor(home);
  }

  const { pythonPath } = installBinariesFor(home);
  const repoPath = hermesRepoPath(home);
  if (!existsSync(pythonPath) || !existsSync(repoPath)) {
    const message = "Hermes binaries are missing from the selected home.";
    await setOperationState(
      home,
      {
        kind: "start-gateway",
        status: "failed",
        step: totalSteps,
        totalSteps,
        title: "Gateway start needs attention",
        detail: message,
        log: `${currentOperation(home)?.log ?? ""}${message}\n`,
      },
      onUpdate,
    );
    throw new Error(message);
  }

  try {
    mkdirSync(home, { recursive: true });
    const stderrStream = createWriteStream(gatewayLogPath(home), { flags: "a" });
    const profile = activeProfileName(home);
    const invocation = buildHermesCliInvocation(home, ["gateway"]);
    const processHandle = spawn(invocation.command, invocation.args, {
      cwd: invocation.cwd,
      env: {
        ...process.env,
        ...parseEnvFile(activeEnvFile(home, profile)),
        HERMES_HOME: home,
        API_SERVER_ENABLED: "true",
        TERM: "dumb",
      },
      stdio: ["ignore", "ignore", stderrStream],
      detached: true,
      windowsHide: true,
    });

    gatewayProcess = processHandle;
    gatewayStartedByApp = true;

    processHandle.on("error", (error) => {
      stderrStream.end();
      gatewayProcess = null;
      gatewayStartedByApp = false;
      void setOperationState(
        home,
        {
          kind: "start-gateway",
          status: "failed",
          step: totalSteps,
          totalSteps,
          title: "Gateway start needs attention",
          detail: error.message,
          log: `${currentOperation(home)?.log ?? ""}${error.message}\n`,
        },
        onUpdate,
      );
    });

    processHandle.on("close", (code) => {
      stderrStream.end();
      gatewayProcess = null;
      if (!gatewayStartedByApp) {
        return;
      }

      if (code !== null && code !== 0 && !isHermesGatewayRunning(home)) {
        gatewayStartedByApp = false;
        void setOperationState(
          home,
          {
            kind: "start-gateway",
            status: "failed",
            step: totalSteps,
            totalSteps,
            title: "Gateway start needs attention",
            detail: `Gateway process exited with code ${code}.`,
            log: `${currentOperation(home)?.log ?? ""}Gateway process exited with code ${code}.\n`,
          },
          onUpdate,
        );
      }
    });

    processHandle.unref();

    await setOperationState(
      home,
      {
        kind: "start-gateway",
        status: "succeeded",
        step: totalSteps,
        totalSteps,
        title: "Local gateway launch requested",
        detail: `Started the local gateway for profile ${profile}.`,
        log: `${currentOperation(home)?.log ?? ""}Gateway stderr log: ${gatewayLogPath(home)}\n`,
      },
      onUpdate,
    );

    return getHermesRuntimeLifecycleFor(home);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the local Hermes gateway.";
    await setOperationState(
      home,
      {
        kind: "start-gateway",
        status: "failed",
        step: totalSteps,
        totalSteps,
        title: "Gateway start needs attention",
        detail: message,
        log: `${currentOperation(home)?.log ?? ""}${message}\n`,
      },
      onUpdate,
    );
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function stopHermesGateway(
  onUpdate?: HermesRuntimeLifecycleUpdateListener,
): Promise<HermesRuntimeLifecycleSummary> {
  const home = resolveHermesHome();
  const totalSteps = STOP_GATEWAY_CHECKPOINT_LABELS.length;

  await setOperationState(
    home,
    {
      kind: "stop-gateway",
      status: "running",
      step: 1,
      totalSteps,
      title: STOP_GATEWAY_CHECKPOINT_LABELS[0],
      detail: "Stopping the local Hermes gateway.",
      log: "Stopping local Hermes gateway...\n",
    },
    onUpdate,
  );

  gatewayStartedByApp = false;
  if (gatewayProcess && !gatewayProcess.killed) {
    try {
      gatewayProcess.kill("SIGTERM");
    } catch {
      // Best effort only.
    }
  }
  gatewayProcess = null;

  const pid = readGatewayPid(home);
  if (pid) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Process already stopped.
    }
  }
  clearGatewayPidFiles(home);

  await setOperationState(
    home,
    {
      kind: "stop-gateway",
      status: "succeeded",
      step: totalSteps,
      totalSteps,
      title: "Local gateway stop requested",
      detail: "Sent the stop signal and cleared local gateway pid files.",
      log: `${currentOperation(home)?.log ?? ""}Gateway stop signal sent.\n`,
    },
    onUpdate,
  );

  return getHermesRuntimeLifecycleFor(home);
}

export async function adoptHermesHome(home: string): Promise<HermesRuntimeLifecycleSummary> {
  if (!validateHermesHomePath(home)) {
    throw new Error("No usable Hermes installation was found in that folder.");
  }

  const previousHome = resolveHermesHome();
  clearVerificationCache(previousHome);
  clearDoctorCache(previousHome);
  clearOperationCache(previousHome);
  setHermesHomeOverride(home);
  return getHermesRuntimeLifecycleFor(home);
}

export async function resetHermesHomeAdoption(): Promise<HermesRuntimeLifecycleSummary> {
  const previousHome = resolveHermesHome();
  clearVerificationCache(previousHome);
  clearDoctorCache(previousHome);
  clearOperationCache(previousHome);
  setHermesHomeOverride("");
  return getHermesRuntimeLifecycle();
}