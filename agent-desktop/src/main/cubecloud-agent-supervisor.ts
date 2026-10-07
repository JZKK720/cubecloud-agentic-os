// AI Workspace (cubecloud-agent) lifecycle supervisor — contract row B of
// the workspace↔desktop control-console plan
// (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md`).
//
// The desktop supervises the workspace server through the installed
// `cubecloud-agent` / `omnigent` CLI rather than spawning raw Python:
//   omnigent server start   → detached server, pidfile-tracked upstream
//                             (~/.cubecloud/local_server.pid), reuse-gated
//                             on server_config_signature upstream
//   omnigent server stop    → stops the server + local host daemon
//   GET /health             → readiness probe
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.
//
// Mirrors `everos-sidecar.ts` conventions: never throws, stable status
// shape, PATH resolution via where.exe/which.

import { spawn, spawnSync } from "child_process";
import type { ChildProcess } from "child_process";

const WORKSPACE_DEFAULT_PORT = 6767;
const WORKSPACE_HOST = "127.0.0.1";
const STARTUP_READY_TIMEOUT_MS = 45_000; // upstream's own readiness budget
const PROBE_TIMEOUT_MS = 4_000;
const MAX_LOG_LINES = 200;
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASHES_IN_WINDOW = 5;

/** CLI names to search on PATH, in preference order. The PyPI dist
 *  installs `cubecloud-agent`, `omnigent`, and `omni` entry points. */
const CLI_CANDIDATES = ["cubecloud-agent", "omnigent", "omni"] as const;

export type WorkspaceSupervisorState =
  | "stopped"
  | "starting"
  | "running"
  | "crashed"
  | "exited";

export interface WorkspaceSupervisorStatus {
  state: WorkspaceSupervisorState;
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  /** CLI name detected on PATH (cubecloud-agent | omnigent | omni). */
  cli: string | null;
  cliPath: string | null;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  /** Human-readable explanation for `state` (e.g. "no CLI on PATH"). */
  reason: string | null;
}

export interface WorkspaceSupervisorStartOptions {
  /** Loopback port for the server. Defaults to 6767. */
  port?: number;
}

interface SupervisorRuntime {
  child: ChildProcess | null;
  state: WorkspaceSupervisorState;
  port: number | null;
  startedAt: number | null;
  lastError: string | null;
  crashTimestamps: number[];
  logRing: string[];
  logBytes: number;
  resolvedCli: { name: string; path: string } | null;
  restartTimer: ReturnType<typeof setTimeout> | null;
}

const runtime: SupervisorRuntime = {
  child: null,
  state: "stopped",
  port: null,
  startedAt: null,
  lastError: null,
  crashTimestamps: [],
  logRing: [],
  logBytes: 0,
  resolvedCli: null,
  restartTimer: null,
};

function appendLog(line: string): void {
  runtime.logRing.push(line);
  runtime.logBytes += line.length + 1;
  if (runtime.logRing.length > MAX_LOG_LINES) {
    const dropped = runtime.logRing.shift();
    if (dropped) runtime.logBytes -= dropped.length + 1;
  }
}

function pruneCrashWindow(): number {
  const cutoff = Date.now() - CRASH_WINDOW_MS;
  runtime.crashTimestamps = runtime.crashTimestamps.filter(
    (ts) => ts >= cutoff,
  );
  return runtime.crashTimestamps.length;
}

/** Resolve one of the CLI entry points on PATH. Windows-aware
 *  (prefer `.exe` candidates from `where`). */
function resolveWorkspaceCli(envPath: string): { name: string; path: string } | null {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  for (const name of CLI_CANDIDATES) {
    const result = spawnSync(lookup, [name], {
      encoding: "utf8",
      env: { ...process.env, PATH: envPath },
      timeout: 5_000,
      windowsHide: true,
    });
    if (!result || result.error || result.status !== 0 || !result.stdout) {
      continue;
    }
    const candidates = String(result.stdout)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (candidates.length === 0) continue;
    if (process.platform === "win32") {
      const exe = candidates.find((c) => /\.exe$/i.test(c));
      if (exe) return { name, path: exe };
    }
    return { name, path: candidates[0] };
  }
  return null;
}

/** Probe `/health` on the workspace origin. */
async function probeHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    }).finally(() => clearTimeout(timer));
    return response.ok;
  } catch {
    return false;
  }
}

export function getWorkspaceSupervisorStatus(): WorkspaceSupervisorStatus {
  const baseUrl = `http://${WORKSPACE_HOST}:${runtime.port ?? WORKSPACE_DEFAULT_PORT}`;
  return {
    state: runtime.state,
    running: runtime.state === "running" || runtime.state === "starting",
    pid: runtime.child?.pid ?? null,
    port: runtime.port ?? WORKSPACE_DEFAULT_PORT,
    baseUrl,
    cli: runtime.resolvedCli?.name ?? null,
    cliPath: runtime.resolvedCli?.path ?? null,
    lastError: runtime.lastError,
    crashCount: pruneCrashWindow(),
    startedAt: runtime.startedAt,
    uptimeMs: runtime.startedAt ? Date.now() - runtime.startedAt : null,
    reason: runtime.resolvedCli
      ? null
      : "cubecloud-agent/omnigent CLI not found on PATH — install the AI Workspace CLI or run the server from Docker instead",
  };
}

/** Start (or reuse) the detached workspace server via the CLI. Never
 *  throws: an unresolvable CLI resolves to `state: "stopped"` + reason. */
export async function startWorkspaceSupervisor(
  options: WorkspaceSupervisorStartOptions = {},
): Promise<WorkspaceSupervisorStatus> {
  const envPath = process.env.PATH ?? "";
  const cli = resolveWorkspaceCli(envPath);
  runtime.resolvedCli = cli;

  if (!cli) {
    runtime.state = "stopped";
    runtime.lastError = null;
    return getWorkspaceSupervisorStatus();
  }

  const port = options.port ?? WORKSPACE_DEFAULT_PORT;
  runtime.port = port;
  runtime.state = "starting";
  runtime.startedAt = Date.now();

  appendLog(
    `[${new Date().toISOString()}] spawning ${cli.name} server on 127.0.0.1:${port}`,
  );

  const child = spawn(
    cli.path,
    ["server", "start", "--port", String(port)],
    {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );

  runtime.child = child;

  child.on("error", (err) => {
    runtime.state = "crashed";
    runtime.lastError = String(err);
    appendLog(`[spawn-error] ${String(err)}`);
  });

  child.on("close", (code) => {
    const crashes = pruneCrashWindow();
    if (code !== 0 && code !== null) {
      runtime.crashTimestamps.push(Date.now());
    }
    if (runtime.child?.pid === child.pid || runtime.child === child) {
      runtime.child = null;
      const crashCount = runtime.crashTimestamps.length;
      if (crashCount >= MAX_CRASHES_IN_WINDOW) {
        runtime.state = "crashed";
        runtime.lastError = `crash loop: ${crashCount} crashes in ${CRASH_WINDOW_MS / 1000}s — restart disabled`;
        runtime.restartTimer = null;
      } else {
        runtime.state = crashes > 0 ? "crashed" : "exited";
      }
    }
  });

  // Readiness: poll /health until it answers or the upstream budget
  // elapses. `omnigent server start` is detached upstream and reuses a
  // healthy server, so the spawned CLI usually exits quickly after
  // printing the URL while the detached server keeps listening.
  const baseUrl = `http://${WORKSPACE_HOST}:${port}`;
  const deadline = Date.now() + STARTUP_READY_TIMEOUT_MS;
  let spawnErrored = false;
  const markSpawnError = (): void => {
    spawnErrored = true;
  };
  child.once("error", markSpawnError);
  child.once("close", (code) => {
    if (code !== null && code !== 0) markSpawnError();
  });
  while (Date.now() < deadline) {
    if (await probeHealth(baseUrl)) {
      runtime.state = "running";
      runtime.lastError = null;
      appendLog(`[${new Date().toISOString()}] ready at ${baseUrl}`);
      return getWorkspaceSupervisorStatus();
    }
    if (spawnErrored) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (runtime.state === "starting") {
    appendLog(
      `[${new Date().toISOString()}] /health never answered within budget`,
    );
    runtime.state = "exited";
    runtime.lastError = "server did not become healthy within the startup budget";
  }

  return getWorkspaceSupervisorStatus();
}

/** Stop the workspace server via the CLI. Never throws; a missing CLI
 *  is a no-op (the server was not ours to stop). */
export async function stopWorkspaceSupervisor(): Promise<WorkspaceSupervisorStatus> {
  const cli = runtime.resolvedCli ?? resolveWorkspaceCli(process.env.PATH ?? "");
  runtime.resolvedCli = cli;

  if (!cli) {
    runtime.state = "stopped";
    runtime.child = null;
    return getWorkspaceSupervisorStatus();
  }

  try {
    spawnSync(cli.path, ["server", "stop"], {
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true,
    });
  } catch (err) {
    runtime.lastError = `stop failed: ${String(err)}`;
  }

  runtime.child = null;
  runtime.state = "stopped";
  runtime.startedAt = null;
  appendLog(`[${new Date().toISOString()}] stopped via ${cli.name}`);

  return getWorkspaceSupervisorStatus();
}

/** Log ring for the supervisor card. */
export function getWorkspaceSupervisorLogTail(): {
  lines: string[];
  totalBytes: number;
} {
  return {
    lines: [...runtime.logRing],
    totalBytes: runtime.logBytes,
  };
}