/**
 * Headroom proxy sidecar lifecycle manager.
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
 *   Headroom (https://github.com/JZKK720/headroom) is a context
 *   compression proxy for LLM applications. It ships as a Python
 *   package (`pip install headroom-ai[proxy]`) and exposes an
 *   OpenAI/Anthropic-compatible HTTP proxy on port 8787.
 *
 *   This module owns the lifecycle of that proxy as a long-lived
 *   sidecar process, following the exact same pattern as
 *   `everos-sidecar.ts`. The proxy sits between the Hermes agent
 *   runtime and the LLM provider, compressing tool outputs,
 *   conversation history, and CodeGraph context bundles before
 *   they reach the model.
 *
 * Design constraints:
 *   - The Headroom Python package isn't a declared dep of this
 *     project (it's a runtime-only thing the user installs with
 *     `pip install headroom-ai[proxy]`). The sidecar resolves
 *     the binary via lazy PATH lookup, no hard dep.
 *   - One process per desktop session, with auto-restart on
 *     crash (1.5s backoff, capped at 5 restarts in a 60s
 *     window). User-triggered `restart()` bypasses the cap.
 *   - Lifecycle is observable: `getSidecarStatus()` returns a
 *     stable shape the renderer can poll. We never `throw` out
 *     of a public method — the sidecar degrades to `running:
 *     false` with a `reason` field on any failure.
 *   - Log tail is bounded to the last 200 lines so a chatty
 *     proxy doesn't bloat the renderer's state. Lines are
 *     kept in-memory only (no log file) for V1.
 *   - On `before-quit`, the sidecar is asked to stop. If the
 *     process doesn't honor SIGTERM within 3s, it's SIGKILL'd.
 *   - The proxy runs in `audit` mode by default (measure-only,
 *     no transforms) so latency impact is minimal. The user
 *     can switch to `optimize` mode via the Headroom screen.
 */

import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from "child_process";
import { delimiter } from "path";
import { getEnhancedPath, HERMES_HOME } from "./installer";

// ─── Public types ─────────────────────────────────────────────────

export type HeadroomSidecarState =
  | "stopped"
  | "starting"
  | "running"
  | "crashed"
  | "exited";

export interface HeadroomSidecarStatus {
  state: HeadroomSidecarState;
  /** Proxy is up and `/health` returned 200. */
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  /** Most recent stderr line (truncated). */
  lastError: string | null;
  /** Number of times the process has exited in the last 60s
   *  (auto-restart window). User-triggered restarts don't count. */
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  /** Short human reason: "stopped", "no binary on PATH", "exit 1",
   *  "kill timeout", etc. */
  reason: string | null;
  /** Current Headroom mode: "audit" (measure-only) or "optimize"
   *  (apply transforms). Defaults to "audit" for safety. */
  mode: "audit" | "optimize";
}

export interface HeadroomSidecarStartOptions {
  /** Port the proxy should listen on. Defaults to 8787. */
  port?: number;
  /** Host the proxy should bind to. Default `127.0.0.1`. */
  host?: string;
  /** Headroom mode. Default "audit" (measure-only, no transforms). */
  mode?: "audit" | "optimize";
  /** Extra args appended to the spawn call (test injection). */
  extraArgs?: string[];
}

export interface HeadroomSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

// ─── Internal state ──────────────────────────────────────────────

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_MODE: "audit" | "optimize" = "audit";
const MAX_LOG_LINES = 200;
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASHES_IN_WINDOW = 5;
const STOP_TIMEOUT_MS = 3000;
const HEALTH_PROBE_TIMEOUT_MS = 1500;

interface SidecarRuntime {
  child: ChildProcess | null;
  status: HeadroomSidecarStatus;
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
    lastError: null,
    crashCount: 0,
    startedAt: null,
    uptimeMs: null,
    reason: null,
    mode: DEFAULT_MODE,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

function resolveHeadroomBinary(envPath: string): string | null {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, ["headroom"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 5000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || !result.stdout) return null;
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

function updateStatus(patch: Partial<HeadroomSidecarStatus>): void {
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

export function getHeadroomSidecarStatus(): HeadroomSidecarStatus {
  if (runtime.status.state === "running" && runtime.status.startedAt) {
    return {
      ...runtime.status,
      uptimeMs: Date.now() - runtime.status.startedAt,
    };
  }
  return runtime.status;
}

export function getHeadroomSidecarLogTail(): HeadroomSidecarLogTail {
  return {
    lines: [...runtime.logRing],
    totalBytes: runtime.logBytes,
  };
}

export function clearHeadroomSidecarLogs(): void {
  clearLogs();
  updateStatus({ lastError: null });
}

/** Test injection. */
export function _setHeadroomSidecarTestOverrides(
  binary: string | null,
  args: string[] | null,
): void {
  runtime.binaryOverride = binary;
  runtime.argsOverride = args;
}

export function startHeadroomSidecar(
  options: HeadroomSidecarStartOptions = {},
): HeadroomSidecarStatus {
  clearRestartTimer();

  if (runtime.child && !runtime.child.killed) {
    return getHeadroomSidecarStatus();
  }

  const port = options.port ?? DEFAULT_PORT;
  const host = options.host ?? DEFAULT_HOST;
  const mode = options.mode ?? DEFAULT_MODE;
  const baseUrl = `http://${host}:${port}`;

  const envPath = getEnhancedPath();
  const binary =
    runtime.binaryOverride ?? resolveHeadroomBinary(envPath) ?? null;

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
        "Headroom binary not found. Install it with `pip install headroom-ai[proxy]` and ensure the script directory is on PATH.",
    });
    return runtime.status;
  }

  const args =
    runtime.argsOverride ?? [
      "proxy",
      "--port",
      String(port),
      "--host",
      host,
      "--mode",
      mode,
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
      HEADROOM_HOME: HERMES_HOME,
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
      startHeadroomSidecar({ port, host, mode });
    }, 1500);
  });

  runtime.child = child;
  updateStatus({
    state: "starting",
    running: false,
    pid: child.pid ?? null,
    port,
    baseUrl,
    mode,
    startedAt,
    reason: null,
  });

  void waitForHeadroomReady(baseUrl)
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

  return getHeadroomSidecarStatus();
}

export function stopHeadroomSidecar(): HeadroomSidecarStatus {
  clearRestartTimer();
  const child = runtime.child;
  if (!child) {
    updateStatus({ state: "stopped", running: false, pid: null });
    return getHeadroomSidecarStatus();
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
  return getHeadroomSidecarStatus();
}

export function restartHeadroomSidecar(
  options: HeadroomSidecarStartOptions = {},
): HeadroomSidecarStatus {
  appendLog("[sidecar] restart requested");
  runtime.crashTimestamps = [];
  stopHeadroomSidecar();
  return startHeadroomSidecar(options);
}

export async function waitForHeadroomReady(
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
      /* not ready yet */
    } finally {
      clearTimeout(timer);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}
