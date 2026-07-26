/**
 * Graphify discovery and status probe.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * Background:
 *   Graphify (https://github.com/cubecloud-agentic-os/graphify or
 *   `uv tool install graphifyy[mcp]`) turns any folder of files
 *   (code, docs, papers, images) into a navigable knowledge graph
 *   with community detection, an honest audit trail (EXTRACTED /
 *   INFERRED / AMBIGUOUS edge tags), and four outputs: interactive
 *   HTML, GraphRAG-ready JSON, GRAPH_REPORT.md, and
 *   COPILOT_CONTEXT.md.
 *
 *   Unlike CodeGraph (which indexes code AST structure — function
 *   calls, imports, dependencies), graphify builds a **concept
 *   graph** across documents. It finds connections between concepts
 *   in different files that you would never think to ask about
 *   directly. It's the "document understanding" layer that
 *   complements CodeGraph's "code understanding" layer.
 *
 *   The desktop's role is discovery + status — it finds graphify
 *   on PATH, surfaces its version, and passes GRAPHIFY_BIN to the
 *   Hermes runtime so the agent can invoke it. The desktop does
 *   NOT spawn or manage the graphify process; the runtime agent
 *   runs `graphify <path>` or `graphify <path> --mcp` as needed.
 *
 * Design constraints:
 *   - Lazy PATH lookup —no hard dep on graphify being installed.
 *   - `discoverGraphify()` returns installed/version/path. Cached.
 *   - `runGraphifyVersion()` runs `graphify --version` for the
 *     status panel. Never throws —degrades to a not-installed
 *     result.
 *   - Same pattern as `browser-harness.ts` and `agent-reach.ts`.
 */

import { spawnSync } from "child_process";
import { getEnhancedPath } from "./installer";
import { resolveCommandOnPath } from "./agent-clis";

/** Commands that the graphify CLI might be installed as. */
const GRAPHIFY_COMMANDS = ["graphify", "graphifyy"];

export interface GraphifyDiscovery {
  scannedAt: string;
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

export interface GraphifyVersionResult {
  ok: boolean;
  exitCode: number;
  version: string | null;
  output: string;
  scannedAt: string;
}

/** Discover graphify on PATH. */
export function discoverGraphify(): GraphifyDiscovery {
  const envPath = getEnhancedPath();

  for (const command of GRAPHIFY_COMMANDS) {
    const resolvedPath = resolveCommandOnPath(command, envPath);
    if (resolvedPath) {
      return {
        scannedAt: new Date().toISOString(),
        installed: true,
        detectedCommand: command,
        resolvedPath,
      };
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    installed: false,
    detectedCommand: null,
    resolvedPath: null,
  };
}

/** Run `graphify --version` and return the result. */
export function runGraphifyVersion(): GraphifyVersionResult {
  const discovery = discoverGraphify();
  const command = discovery.detectedCommand ?? "graphify";
  const envPath = getEnhancedPath();

  const result = spawnSync(command, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 15000,
    windowsHide: true,
  });

  const output = [result.stdout ?? "", result.stderr ?? ""]
    .join("\n")
    .trim();

  // Parse version from output like "graphify 0.1.0" or "0.1.0"
  const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
  const version = versionMatch ? versionMatch[1] : null;

  return {
    ok: result.status === 0,
    exitCode: result.status ?? -1,
    version,
    output: output || "(no output)",
    scannedAt: new Date().toISOString(),
  };
}