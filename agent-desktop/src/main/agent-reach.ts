/**
 * V2.10.66 — Agent-Reach integration.
 *
 * Agent-Reach is a Python CLI that gives AI agents internet
 * capabilities (Twitter, Reddit, YouTube, GitHub, Bilibili, RSS,
 * web search, etc.). It's a capability layer — the operator
 * installs it, the gateway's agent loop calls the upstream tools.
 *
 * This module probes whether agent-reach is installed and which
 * channels are configured. It does NOT install or configure
 * agent-reach — that's the operator's responsibility.
 *
 * Security floor: this module never reads credentials. It only
 * runs `agent-reach doctor` which reports channel status without
 * exposing tokens or cookies.
 */

import { spawnSync } from "child_process";
import { getEnhancedPath } from "./installer";

const LOOKUP_TIMEOUT_MS = 3_000;
const VERSION_TIMEOUT_MS = 5_000;
const DOCTOR_TIMEOUT_MS = 30_000;

type AgentReachDoctorJson = Record<
  string,
  {
    status?: "ok" | "warn" | "off";
    active_backend?: string | null;
    name?: string;
    message?: string;
  }
>;

export interface AgentReachChannel {
  name: string;
  status: "ok" | "error" | "not-configured";
  backend: string | null;
  detail: string | null;
}

export interface AgentReachStatus {
  installed: boolean;
  version: string | null;
  detectedCommand: string | null;
  channels: AgentReachChannel[];
  error: string | null;
}

/**
 * Probe whether agent-reach is installed and which channels
 * are configured. Returns a structured status the renderer
 * can display on the Tools screen.
 */
export function probeAgentReach(): AgentReachStatus {
  const envPath = getEnhancedPath();

  // Check if agent-reach is on PATH
  const lookupCommand = process.platform === "win32" ? "where.exe" : "which";
  const lookupResult = spawnSync(lookupCommand, ["agent-reach"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: LOOKUP_TIMEOUT_MS,
    windowsHide: true,
  });

  if (lookupResult.error || lookupResult.status !== 0 || !lookupResult.stdout) {
    return {
      installed: false,
      version: null,
      detectedCommand: null,
      channels: [],
      error: null,
    };
  }

  const detectedCommand = lookupResult.stdout.split(/\r?\n/)[0]?.trim() || null;

  // Get version
  const versionResult = spawnSync(
    "agent-reach",
    ["--version"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: envPath },
      timeout: VERSION_TIMEOUT_MS,
      windowsHide: true,
    },
  );

  const version = normaliseVersion(
    versionResult.stdout?.trim() || versionResult.stderr?.trim() || null,
  );

  // Run doctor to get channel status
  const doctorResult = spawnSync(
    "agent-reach",
    ["doctor", "--json"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: envPath },
      timeout: DOCTOR_TIMEOUT_MS,
      windowsHide: true,
    },
  );

  if (doctorResult.error) {
    const isTimeout = doctorResult.error.message.includes("ETIMEDOUT");
    return {
      installed: true,
      version,
      detectedCommand,
      channels: [],
      error: isTimeout
        ? `agent-reach doctor timed out after ${Math.floor(DOCTOR_TIMEOUT_MS / 1000)}s`
        : `agent-reach doctor failed: ${doctorResult.error.message}`,
    };
  }

  const output = doctorResult.stdout || "";
  const channels = parseDoctorJson(output) ?? parseDoctorOutput(output);

  return {
    installed: true,
    version,
    detectedCommand,
    channels,
    error: doctorResult.status !== 0 ? `doctor exited with code ${doctorResult.status}` : null,
  };
}

function normaliseVersion(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/v?(\d+\.\d+\.\d+(?:[-+._a-z0-9]*)?)/i);
  return match?.[1] ?? raw;
}

function parseDoctorJson(output: string): AgentReachChannel[] | null {
  let parsed: AgentReachDoctorJson;
  try {
    parsed = JSON.parse(output) as AgentReachDoctorJson;
  } catch {
    return null;
  }

  const knownChannels = [
    "web", "youtube", "rss", "exa_search", "github",
    "twitter", "bilibili", "reddit", "xiaohongshu",
    "linkedin", "v2ex", "xueqiu", "xiaoyuzhou",
  ];

  return knownChannels
    .map((name) => {
      const item = parsed[name];
      if (!item) return null;
      return {
        name,
        status:
          item.status === "ok"
            ? "ok"
            : item.status === "warn"
              ? "error"
              : "not-configured",
        backend: item.active_backend ?? null,
        detail: [item.name, item.message].filter(Boolean).join(" — ") || null,
      } satisfies AgentReachChannel;
    })
    .filter((channel): channel is AgentReachChannel => channel !== null);
}

/**
 * Parse `agent-reach doctor` output into structured channel
 * status. The doctor command prints a table of channels with
 * their current backend and status. We parse it loosely —
 * agent-reach's output format may change between versions, so
 * we look for known channel names and status keywords.
 */
function parseDoctorOutput(output: string): AgentReachChannel[] {
  const knownChannels = [
    "web", "youtube", "rss", "exa_search", "github",
    "twitter", "bilibili", "reddit", "xiaohongshu",
    "linkedin", "v2ex", "xueqiu", "podcast",
  ];

  const channels: AgentReachChannel[] = [];
  const lines = output.split(/\r?\n/);

  for (const name of knownChannels) {
    const line = lines.find((l) => l.toLowerCase().includes(name.toLowerCase()));
    if (!line) continue;

    const lowerLine = line.toLowerCase();
    let status: AgentReachChannel["status"] = "not-configured";
    if (lowerLine.includes("ok") || lowerLine.includes("✓") || lowerLine.includes("pass")) {
      status = "ok";
    } else if (lowerLine.includes("error") || lowerLine.includes("✗") || lowerLine.includes("fail")) {
      status = "error";
    }

    // Try to extract the backend name (usually in parentheses or after →)
    const backendMatch = line.match(/[→▸]\s*(\S+)/) || line.match(/\(([^)]+)\)/);
    const backend = backendMatch ? backendMatch[1] : null;

    channels.push({
      name,
      status,
      backend,
      detail: line.trim(),
    });
  }

  return channels;
}