/**
 * EverOS sidecar lifecycle manager.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *   The above expression covers the Cubecloud-original work in
 *   this file. Inherited hermes-desktop framework code that this
 *   file imports or links against remains under its original
 *   MIT terms and is not affected by the AGPL-3.0-or-later
 *   alternative. See `LICENSE` for the full dual-license notice.
 *
 * Background:
 *   `src/main/everos.ts` is a thin HTTP client for the EverOS /
 *   EverCore backend. Today the user has to point it at a
 *   self-hosted instance, but the recommended setup is to run
 *   the Python `everos server start` CLI on the same machine
 *   as the desktop — this module owns that sidecar.
 *
 * Design constraints:
 *   - The EverOS Python wheel isn't a declared dep of this
 *     project (it's a runtime-only thing the user installs with
 *     `pip install everos` or via the installer). The sidecar
 *     resolves the binary the same way the CodeGraph runtime
 *     resolves the npm SDK: lazy PATH lookup, no hard dep.
 *   - One process per desktop session, with auto-restart on
 *     crash (1.5s backoff, capped at 5 restarts in a 60s
 *     window). User-triggered `restart()` bypasses the cap.
 *   - Lifecycle is observable: `getSidecarStatus()` returns a
 *     stable shape the renderer can poll. We never `throw` out
 *     of a public method — the sidecar degrades to `running:
 *     false` with a `reason` field on any failure.
 *   - Log tail is bounded to the last 200 lines so a chatty
 *     server doesn't bloat the renderer's state. Lines are
 *     kept in-memory only (no log file) for V1.
 *   - On `before-quit`, the sidecar is asked to stop. If the
 *     process doesn't honor SIGTERM within 3s, it's SIGKILL'd
 *     by the OS-level cleanup. The Python child inherits the
 *     Electron process tree, so we never leak an orphan.
 *
 * The sidecar is intentionally minimal: EverOS is a
 * OpenAI-protocol HTTP service, so the renderer continues to
 * talk to it via the existing `everos:*` HTTP channels. The
 * sidecar's only job is to keep a long-lived process alive
 * and surface its health.
 */

import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from "child_process";
import { delimiter } from "path";
import { getEnhancedPath, HERMES_HOME } from "./installer";

// ─── Public types ─────────────────────────────────────────────────

export type EverOsSidecarState =
  | "stopped"
  | "starting"
  | "running"
  | "crashed"
  | "exited";

export interface EverOsSidecarStatus {
  state: EverOsSidecarState;
  /** Server is up and `/health` returned 200. */
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  /** Most recent stderr line (truncated). Useful for the
   *  "why did it crash" hint in the UI. */
  lastError: string | null;
  /** Number of times the process has exited in the last 60s
   *  (auto-restart window). User-triggered restarts don't count. */
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  /** Short human reason: "stopped", "no binary on PATH", "exit 1",
   *  "kill timeout", etc. Used by the renderer's status pill. */
  reason: string | null;
}

export interface EverOsSidecarStartOptions {
  /** Port the server should listen on. Defaults to 1995 to
   *  match the existing `EVEROS_DEFAULT_BASE_URL`. The CLI
   *  accepts a `--port` flag (and a `--host` flag); we
   *  forward both. */
  port?: number;
  /** Host the server should bind to. Default `127.0.0.1` so the
   *  service isn't accidentally exposed on a multi-tenant box. */
  host?: string;
  /** Extra args appended to the spawn call. Used by the test
   *  harness to inject a stub. The desktop UI never sets this. */
  extraArgs?: string[];
}

export interface EverOsSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

// ─── Internal state ──────────────────────────────────────────────

const DEFAULT_PORT = 1995;
const DEFAULT_HOST = "127.0.0.1";
const MAX_LOG_LINES = 200;
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASHES_IN_WINDOW = 5;
const STOP_TIMEOUT_MS = 3000;
const HEALTH_PROBE_TIMEOUT_MS = 1500;

interface SidecarRuntime {
  child: ChildProcess | null;
  status: EverOsSidecarStatus;
  logRing: string[];
  logBytes: number;
  /** Wall-clock timestamps of recent crash exits, for the
   *  auto-restart cap. Older entries drop off the window. */
  crashTimestamps: number[];
  /** Timer for the auto-restart delay after a crash. */
  restartTimer: ReturnType<typeof setTimeout> | null;
  /** Optional override for the binary path (test injection). */
  binaryOverride: string | null;
  /** Optional override for the spawn args (test injection). */
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
    lastError: null,
    crashCount: 0,
    startedAt: null,
    uptimeMs: null,
    reason: null,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

/** Resolve the `everos` binary on PATH. Mirrors the
 *  `where.exe` / `which` lookup the CodeGraph runtime uses so
 *  Windows path quirks (e.g. `everos.exe` vs `everos.cmd`) are
 *  handled the same way. */
function resolveEverOsBinary(envPath: string): string | null {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, ["everos"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 5000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || !result.stdout) return null;
  // `where` may return multiple lines (e.g. shim + exe). Prefer
  // the .exe on Windows so we don't go through the cmd shim.
  const candidates = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (process.platform === "win32") {
    const exe = candidates.find((c) => /\.exe$/i.test(c));
    return exe ?? candidates[0] ?? null;
  }
  return candidates[0] ?? null;
}

function appendLog(line: string): void {
  runtime.logRing.push(line);
  runtime.logBytes += line.length + 1; // +1 for the newline
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

function updateStatus(patch: Partial<EverOsSidecarStatus>): void {
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

/** Read-only status probe. The renderer polls this on
 *  EverOS-screen mount and after every start/stop/restart
 *  call to refresh the lifecycle card. */
export function getEverOsSidecarStatus(): EverOsSidecarStatus {
  // Recompute uptime on every read so the renderer doesn't
  // have to maintain its own clock.
  if (runtime.status.state === "running" && runtime.status.startedAt) {
    return {
      ...runtime.status,
      uptimeMs: Date.now() - runtime.status.startedAt,
    };
  }
  return runtime.status;
}

export function getEverOsSidecarLogTail(): EverOsSidecarLogTail {
  return {
    lines: [...runtime.logRing],
    totalBytes: runtime.logBytes,
  };
}

export function clearEverOsSidecarLogs(): void {
  clearLogs();
  updateStatus({ lastError: null });
}

/** Test injection. The unit tests pass a stub binary path +
 *  args so the manager can be exercised without a real
 *  Python install. Production callers never set this. */
export function _setSidecarTestOverrides(
  binary: string | null,
  args: string[] | null,
): void {
  runtime.binaryOverride = binary;
  runtime.argsOverride = args;
}

/** Spawn the sidecar. Returns the updated status — the caller
 *  does NOT block waiting for readiness (use `waitForReady`
 *  if you need a promise that resolves when /health is OK). */
export function startEverOsSidecar(
  options: EverOsSidecarStartOptions = {},
): EverOsSidecarStatus {
  clearRestartTimer();

  if (runtime.child && !runtime.child.killed) {
    // Already running — just refresh the status snapshot.
    return getEverOsSidecarStatus();
  }

  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const baseUrl = `http://${host}:${port}`;

  const envPath = getEnhancedPath();
  const binary =
    runtime.binaryOverride ?? resolveEverOsBinary(envPath) ?? null;

  if (!binary) {
    updateStatus({
      state: "stopped",
      running: false,
      pid: null,
      port,
      baseUrl,
      lastError: null,
      startedAt: null,
      reason:
        "EverOS binary not found. Install it with `pip install everos` and ensure the script directory is on PATH.",
    });
    return runtime.status;
  }

  const args =
    runtime.argsOverride ?? [
      "server",
      "start",
      "--host",
      host,
      "--port",
      String(port),
    ];

  if (options.extraArgs && options.extraArgs.length > 0) {
    args.push(...options.extraArgs);
  }

  const spawnOptions: SpawnOptions = {
    cwd: HERMES_HOME,
    env: {
      ...(process.env as Record<string, string>),
      PATH: envPath.includes(delimiter) ? envPath : `${envPath}${delimiter}${(process.env.PATH as string) ?? ""}`,
      HOME: process.env.HOME ?? "",
      EVEROS_HOME: HERMES_HOME,
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  };

  const child = spawn(binary, args, spawnOptions);
  const startedAt = Date.now();
  appendLog(`[sidecar] spawn: ${binary} ${args.join(" ")}`);

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
      // Capture the first non-empty stderr line as the
      // status's `lastError` so the renderer can render
      // "why did this fail" without polling the log.
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

    // If the user explicitly stopped us, don't auto-restart
    // and don't count it as a crash.
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
        reason: `exited (code ${code ?? "?"}) ${exceeded ? "— auto-restart cap reached" : ""}`.trim(),
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
      startEverOsSidecar({ port, host });
    }, 1500);
  });

  runtime.child = child;
  updateStatus({
    state: "starting",
    running: false,
    pid: child.pid ?? null,
    port,
    baseUrl,
    startedAt,
    reason: null,
  });

  // Asynchronously probe /health to flip the state to
  // "running" once the server is up. We don't block the
  // caller — the spawn returns immediately.
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
      /* waitForReady is best-effort; the close handler will
         surface the failure if the process actually died. */
    });

  return getEverOsSidecarStatus();
}

export function stopEverOsSidecar(): EverOsSidecarStatus {
  clearRestartTimer();
  const child = runtime.child;
  if (!child) {
    updateStatus({ state: "stopped", running: false, pid: null });
    return getEverOsSidecarStatus();
  }
  appendLog("[sidecar] stop requested");
  // Mark as not-running so the close handler doesn't try
  // to auto-restart. The handler will flip the state to
  // "stopped" once the process actually exits.
  updateStatus({ state: "stopped", running: false });
  try {
    child.kill("SIGTERM");
  } catch (err) {
    appendLog(`[sidecar] SIGTERM failed: ${(err as Error).message}`);
  }
  // SIGKILL after the stop window so the process never
  // outlives the parent.
  setTimeout(() => {
    if (runtime.child === child && !child.killed) {
      try {
        child.kill("SIGKILL");
      } catch (err) {
        appendLog(`[sidecar] SIGKILL failed: ${(err as Error).message}`);
      }
    }
  }, STOP_TIMEOUT_MS);
  return getEverOsSidecarStatus();
}

export function restartEverOsSidecar(
  options: EverOsSidecarStartOptions = {},
): EverOsSidecarStatus {
  appendLog("[sidecar] restart requested");
  // User-triggered restarts bypass the auto-restart cap.
  runtime.crashTimestamps = [];
  stopEverOsSidecar();
  return startEverOsSidecar(options);
}

/** Resolves when the server is reachable on /health, or
 *  rejects after `timeoutMs`. Used by the start path to flip
 *  the status to "running" and is also exposed to the
 *  renderer so it can show a loading state during initial
 *  bring-up. */
export async function waitForReady(
  baseUrl: string,
  timeoutMs = 8000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_PROBE_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      if (res.ok) return true;
    } catch {
      /* not yet */
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
