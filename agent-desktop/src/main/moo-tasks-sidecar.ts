/**
 * Moo Tasks sidecar lifecycle manager.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *
 * Background:
 *   Moo Tasks (https://github.com/dizlexic/moo-tasks) is an
 *   agent-native kanban board with an integrated MCP server.
 *   It exposes 14 MCP tools (list-tasks, create-task,
 *   accept-task, update-task-status, submit-for-review,
 *   request-corrections, generate-changelog, list-plans,
 *   apply-plan, etc.) over HTTP at /mcp.
 *
 *   The desktop spawns the Nuxt server as a child process and
 *   manages its lifecycle (start/stop/restart, auto-restart on
 *   crash, log tail, health probe). The renderer polls the
 *   status via IPC and the MCP endpoint is added to config.yaml
 *   via the MCP registry so Hermes (or any MCP client) can use
 *   the task tools.
 *
 * Design constraints (same as everos-sidecar.ts):
 *   - One process per desktop session, auto-restart on crash
 *     (1.5s backoff, capped at 5 restarts per 60s window).
 *   - Lifecycle is observable: getMooTasksSidecarStatus() returns
 *     a stable shape the renderer can poll. Never throws.
 *   - Log tail bounded to 200 lines, in-memory only.
 *   - On before-quit, the sidecar is stopped (SIGTERM → SIGKILL).
 *   - The binary is resolved via PATH lookup (npx or docker).
 */

import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from "child_process";
import { delimiter } from "path";
import { getEnhancedPath, HERMES_HOME } from "./installer";

// ─── Public types ─────────────────────────────────────────────────

export type MooTasksSidecarState =
  | "stopped"
  | "starting"
  | "running"
  | "crashed"
  | "exited";

export interface MooTasksSidecarStatus {
  state: MooTasksSidecarState;
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
}

export interface MooTasksSidecarStartOptions {
  port?: number;
  host?: string;
  /** Path to the moo-tasks project directory (where package.json
   *  lives). If null, the sidecar tries `npx -y moo-tasks` which
   *  may not work — Docker is the recommended install path. */
  projectDir?: string;
  extraArgs?: string[];
}

export interface MooTasksSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

// ─── Internal state ──────────────────────────────────────────────

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = "127.0.0.1";
const MAX_LOG_LINES = 200;
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASHES_IN_WINDOW = 5;
const STOP_TIMEOUT_MS = 3000;
const HEALTH_PROBE_TIMEOUT_MS = 1500;

interface SidecarRuntime {
  child: ChildProcess | null;
  status: MooTasksSidecarStatus;
  logRing: string[];
  logBytes: number;
  crashTimestamps: number[];
  restartTimer: ReturnType<typeof setTimeout> | null;
  binaryOverride: string | null;
  argsOverride: string[] | null;
}

const runtime: SidecarRuntime = {
  child: null,
  logRing: [],
  logBytes: 0,
  crashTimestamps: [],
  restartTimer: null,
  binaryOverride: null,
  argsOverride: null,
  status: {
    state: "stopped",
    running: false,
    pid: null,
    port: null,
    baseUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
    mcpUrl: `http://${DEFAULT_HOST}:${DEFAULT_PORT}/mcp`,
    lastError: null,
    crashCount: 0,
    startedAt: null,
    uptimeMs: null,
    reason: null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

function appendLog(line: string): void {
  runtime.logRing.push(line);
  runtime.logBytes += line.length + 1;
  if (runtime.logRing.length > MAX_LOG_LINES) {
    const dropped = runtime.logRing.shift();
    if (dropped) runtime.logBytes -= dropped.length + 1;
  }
}

function clearRestartTimer(): void {
  if (runtime.restartTimer) {
    clearTimeout(runtime.restartTimer);
    runtime.restartTimer = null;
  }
}

function pruneCrashWindow(): void {
  const cutoff = Date.now() - CRASH_WINDOW_MS;
  runtime.crashTimestamps = runtime.crashTimestamps.filter(
    (ts) => ts >= cutoff,
  );
}

function updateStatus(patch: Partial<MooTasksSidecarStatus>): void {
  runtime.status = { ...runtime.status, ...patch };
  if (runtime.status.startedAt && runtime.status.state === "running") {
    runtime.status.uptimeMs = Date.now() - runtime.status.startedAt;
  } else {
    runtime.status.uptimeMs = null;
  }
}

function recordCrash(): { exceeded: boolean } {
  pruneCrashWindow();
  runtime.crashTimestamps.push(Date.now());
  updateStatus({ crashCount: runtime.crashTimestamps.length });
  return {
    exceeded: runtime.crashTimestamps.length > MAX_CRASHES_IN_WINDOW,
  };
}

function clearLogs(): void {
  runtime.logRing = [];
  runtime.logBytes = 0;
}

// ─── Public API ───────────────────────────────────────────────────

export function getMooTasksSidecarStatus(): MooTasksSidecarStatus {
  if (runtime.status.state === "running" && runtime.status.startedAt) {
    return {
      ...runtime.status,
      uptimeMs: Date.now() - runtime.status.startedAt,
    };
  }
  return runtime.status;
}

export function getMooTasksSidecarLogTail(): MooTasksSidecarLogTail {
  return {
    lines: [...runtime.logRing],
    totalBytes: runtime.logBytes,
  };
}

export function clearMooTasksSidecarLogs(): void {
  clearLogs();
  updateStatus({ lastError: null });
}

/** Test injection. */
export function _setMooTasksSidecarTestOverrides(
  binary: string | null,
  args: string[] | null,
): void {
  runtime.binaryOverride = binary;
  runtime.argsOverride = args;
}

/** Resolve the moo-tasks entry point. moo-tasks is a Nuxt app
 *  typically run via `npm run dev` from a project directory or
 *  via Docker. We look for:
 *    1. A `moo-tasks` binary on PATH (future npm global install)
 *    2. `npx -y moo-tasks` as a fallback
 *  The user can also set the projectDir option to point at a
 *  local clone. */
function resolveMooTasksBinary(envPath: string): { binary: string; args: string[] } | null {
  if (runtime.binaryOverride) {
    return { binary: runtime.binaryOverride, args: runtime.argsOverride ?? [] };
  }

  // Check for a `moo-tasks` CLI on PATH
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, ["moo-tasks"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 5000,
    windowsHide: true,
  });
  if (result.status === 0 && result.stdout) {
    const candidates = result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (process.platform === "win32") {
      const exe = candidates.find((c) => /\.exe$/i.test(c));
      return { binary: exe ?? candidates[0] ?? null, args: [] };
    }
    return { binary: candidates[0] ?? null, args: [] };
  }

  // Fallback: npx
  return { binary: "npx", args: ["-y", "moo-tasks"] };
}

export function startMooTasksSidecar(
  options: MooTasksSidecarStartOptions = {},
): MooTasksSidecarStatus {
  clearRestartTimer();

  if (runtime.child && !runtime.child.killed) {
    return getMooTasksSidecarStatus();
  }

  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const baseUrl = `http://${host}:${port}`;
  const mcpUrl = `${baseUrl}/mcp`;

  const envPath = getEnhancedPath();
  const resolved = resolveMooTasksBinary(envPath);

  if (!resolved || !resolved.binary) {
    updateStatus({
      state: "stopped",
      running: false,
      pid: null,
      port,
      baseUrl,
      mcpUrl,
      lastError: null,
      startedAt: null,
      reason:
        "Moo Tasks not found. Install via Docker (docker-compose up) or clone the repo and run npm install.",
    });
    return runtime.status;
  }

  const args =
    runtime.argsOverride ??
    [
      ...resolved.args,
      ...(options.extraArgs ?? []),
    ];

  // Set PORT env var so Nuxt listens on the right port
  const spawnOptions: SpawnOptions = {
    cwd: options.projectDir ?? HERMES_HOME,
    env: {
      ...(process.env as Record<string, string>),
      PATH: envPath.includes(delimiter) ? envPath : `${envPath}${delimiter}${(process.env.PATH as string) ?? ""}`,
      HOME: process.env.HOME ?? "",
      PORT: String(port),
      HOST: host,
      NUXT_SESSION_PASSWORD: process.env.NUXT_SESSION_PASSWORD ?? "cubecloud-desktop-sidecar-min-32-chars!!",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  };

  const child = spawn(resolved.binary, args, spawnOptions);
  const startedAt = Date.now();
  appendLog(`[sidecar] spawn: ${resolved.binary} ${args.join(" ")}`);

  child.stdout?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.length > 0) appendLog(`[stdout] ${line}`);
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    for (const line of text.split(/\r?\n/)) {
      if (line.length === 0) continue;
      appendLog(`[stderr] ${line}`);
      if (!runtime.status.lastError) {
        updateStatus({ lastError: line.slice(0, 240) });
      }
    }
  });

  child.on("error", (err) => {
    appendLog(`[sidecar] spawn error: ${err.message}`);
    updateStatus({
      state: "crashed",
      running: false,
      pid: null,
      startedAt: null,
      lastError: err.message.slice(0, 240),
      reason: `spawn error: ${err.message}`,
    });
  });

  child.on("close", (code, signal) => {
    appendLog(`[sidecar] close: code=${code} signal=${signal ?? "null"}`);
    const wasRunning = runtime.status.state === "running";
    runtime.child = null;

    if (!wasRunning) {
      updateStatus({
        state: "stopped",
        running: false,
        pid: null,
        startedAt: null,
        reason: "stopped",
      });
      return;
    }

    const { exceeded } = recordCrash();
    if (exceeded) {
      updateStatus({
        state: "crashed",
        running: false,
        pid: null,
        startedAt: null,
        reason: `exited (code ${code ?? "?"}) — auto-restart cap reached`,
      });
      return;
    }

    updateStatus({
      state: "crashed",
      running: false,
      pid: null,
      startedAt: null,
      reason: `exited (code ${code ?? "?"}); restarting in 1.5s`,
    });
    runtime.restartTimer = setTimeout(() => {
      runtime.restartTimer = null;
      startMooTasksSidecar({ port, host, projectDir: options.projectDir });
    }, 1500);
  });

  runtime.child = child;
  updateStatus({
    state: "starting",
    running: false,
    pid: child.pid ?? null,
    port,
    baseUrl,
    mcpUrl,
    startedAt,
    reason: null,
  });

  // Asynchronously probe /health (moo-tasks Nuxt serves at root)
  void waitForReady(baseUrl)
    .then((healthy) => {
      if (healthy && runtime.child === child) {
        updateStatus({
          state: "running",
          running: true,
          reason: null,
        });
        appendLog(`[sidecar] ready on ${baseUrl}`);
      }
    })
    .catch(() => {
      /* best-effort */
    });

  return getMooTasksSidecarStatus();
}

export function stopMooTasksSidecar(): MooTasksSidecarStatus {
  clearRestartTimer();
  const child = runtime.child;
  if (!child) {
    updateStatus({ state: "stopped", running: false, pid: null });
    return getMooTasksSidecarStatus();
  }
  appendLog("[sidecar] stop requested");
  updateStatus({ state: "stopped", running: false });
  try {
    child.kill("SIGTERM");
  } catch (err) {
    appendLog(`[sidecar] SIGTERM failed: ${(err as Error).message}`);
  }
  setTimeout(() => {
    if (runtime.child === child && !child.killed) {
      try {
        child.kill("SIGKILL");
      } catch (err) {
        appendLog(`[sidecar] SIGKILL failed: ${(err as Error).message}`);
      }
    }
  }, STOP_TIMEOUT_MS);
  return getMooTasksSidecarStatus();
}

export function restartMooTasksSidecar(
  options: MooTasksSidecarStartOptions = {},
): MooTasksSidecarStatus {
  appendLog("[sidecar] restart requested");
  runtime.crashTimestamps = [];
  stopMooTasksSidecar();
  return startMooTasksSidecar(options);
}

async function waitForReady(
  baseUrl: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/`, {
        method: "GET",
        signal: controller.signal,
      });
      if (res.ok) return true;
    } catch {
      // not ready yet
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

/** Stop all sidecars on app shutdown. Called from before-quit. */
export function stopAllMooTasksSidecars(): void {
  try {
    stopMooTasksSidecar();
  } catch (err) {
    console.error("[moo-tasks-sidecar] stop on shutdown failed:", err);
  }
}