// Laya (System-1 decision engine) probe — DM0 of the decision-core replan
// (`docs/plans/2026-10-07-decision-core-governance-bench-replan.md` §D3.3).
//
// The full Laya integration is MCP-first: the desktop registers the
// `laya-mcp-server` stdio server in its MCP config (Settings toggle), and
// the runtime slots (guard/routing middleware, approval pre-screen) arrive
// in DM1/DM2. This module owns the DM0 half:
//   - PATH resolution of the `laya-mcp-server` / `laya` console scripts
//     (same convention as `gbrain-probe.ts`).
//   - One-shot version probe (`laya --version`).
//   - The MCP registration descriptor (command + tool names + default env)
//     so the MCP screen can render/persist the `laya` entry.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { execFileSync } from "child_process";
import { getEnhancedPath } from "./installer";
import { HIDDEN_SUBPROCESS_OPTIONS } from "./process-options";

export const LAYA_PROBE_TIMEOUT_MS = 10_000;

export interface LayaProbeResult {
  /** True when a `laya` console script is on PATH. */
  installed: boolean;
  /** True when `laya --version` answered parseably. */
  healthy: boolean;
  /** Version string from `laya --version` (or null). */
  version: string | null;
  /** Human-readable summary for the status dot. */
  summary: string;
  error: string | null;
}

/** The MCP stdio registration rendered by the MCP screen (DM0 descriptor;
 *  the config-side toggle writes this exact shape into the server list). */
export const LAYA_MCP_REGISTRATION = {
  name: "laya",
  command: "laya-mcp-server",
  /** MCP preloads english+multilingual; typed-decisions stays lazy. */
  env: {
    LAYA_DEVICE: "cpu",
    LAYA_PRELOAD: "1",
    LAYA_MODELS: "english,multilingual",
  } as Record<string, string>,
  toolNames: [
    "laya_status",
    "laya_route",
    "laya_route_batch",
    "laya_predict",
    "laya_predict_batch",
    "laya_decide",
    "laya_shortlist",
    "laya_preset",
  ] as string[],
  description:
    "Laya System-1 decision engine — typed choice/score/noul decisions, ~33ms, abstention-gated",
} as const;

/** Candidate console-script names to resolve on PATH, in preference
 *  order. The `laya[mcp]` extra installs both; prefer the MCP launcher's
 *  sibling `laya` binary for version probing and fall back. */
const CLI_CANDIDATES = ["laya", "laya-mcp-server"] as const;

function resolveLayaBinary(envPath: string): string | null {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  for (const name of CLI_CANDIDATES) {
    try {
      const stdout = execFileSync(lookup, [name], {
        encoding: "utf8",
        timeout: 5_000,
        env: { ...process.env, PATH: envPath },
        stdio: ["ignore", "pipe", "pipe"],
        ...HIDDEN_SUBPROCESS_OPTIONS,
      });
      const candidates = String(stdout)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (candidates.length === 0) continue;
      if (process.platform === "win32") {
        const exe = candidates.find((c) => /\.exe$/i.test(c));
        if (exe) return exe;
      }
      return candidates[0] ?? null;
    } catch {
      continue;
    }
  }
  return null;
}

/** One-shot DM0 probe: is Layas installed, and does `laya --version`
 *  answer? Never throws — degrades to `{ installed: false }`. */
export function probeLaya(): LayaProbeResult {
  const envPath = getEnhancedPath();
  const binary = resolveLayaBinary(envPath);
  if (!binary) {
    return {
      installed: false,
      healthy: false,
      version: null,
      summary:
        "Laya is not installed. Install with: pip install \"laya[mcp]\" (the MCP server is laya-mcp-server).",
      error: null,
    };
  }
  try {
    const stdout = execFileSync(binary, ["--version"], {
      encoding: "utf8",
      timeout: LAYA_PROBE_TIMEOUT_MS,
      env: { ...process.env, PATH: envPath, PYTHONUTF8: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      ...HIDDEN_SUBPROCESS_OPTIONS,
    });
    const match = String(stdout).match(/(\d+\.\d+\.\d+[^\s]*)/);
    const version = match ? match[1] : null;
    return {
      installed: true,
      healthy: true,
      version,
      summary: version ? `Laya ${version} ready` : "Laya ready (version unparsed)",
      error: null,
    };
  } catch (err) {
    return {
      installed: true,
      healthy: false,
      version: null,
      summary: "Laya is installed but `laya --version` failed.",
      error: String(err).slice(0, 200),
    };
  }
}