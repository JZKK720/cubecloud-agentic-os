/**
 * GBrain health probe.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * Background:
 *   GBrain (https://github.com/garrytan/gbrain) is a Postgres-native
 *   personal knowledge brain. Unlike Headroom (HTTP proxy with a
 *   `/health` endpoint), gbrain's local mode is **stdio MCP**
 *   (`gbrain serve`) — there is no HTTP port to probe.
 *
 *   To surface a health dot on the Memory screen we call
 *   `gbrain doctor --json` instead. This is a one-shot CLI command
 *   that returns a JSON health report (checks, status, version). It
 *   is the same probe the gbrain README recommends for verifying an
 *   install.
 *
 * Design constraints:
 *   - Lazy PATH lookup —no hard dep on gbrain being installed. If
 *     the binary is not on PATH, `probeGbrain()` returns
 *     `{ installed: false }` and never throws.
 *   - One-shot: each call spawns `gbrain doctor --json`, reads
 *     stdout, parses JSON, and returns. No long-lived process.
 *   - Bounded timeout (10s) so a hung gbrain doesn't block the
 *     renderer's status poll.
 *   - Never throws —degrades to `{ installed: false, error }` on
 *     any failure. The renderer treats this as a red dot.
 */

import { execFileSync } from "child_process";
import { getEnhancedPath } from "./installer";
import { HIDDEN_SUBPROCESS_OPTIONS } from "./process-options";

/**
 * GBrain health status. Mirrors the shape the renderer needs for a
 * health dot + expandable detail panel.
 */
export interface GbrainProbeResult {
  /** true when `gbrain` is on PATH and `doctor --json` returned a
   *  parseable report. */
  installed: boolean;
  /** true when all doctor checks passed. */
  healthy: boolean;
  /** GBrain version string, if reported. */
  version: string | null;
  /** Number of failing checks (0 = all pass). */
  failingChecks: number;
  /** Total number of checks run. */
  totalChecks: number;
  /** Short human-readable summary for the health-dot tooltip. */
  summary: string;
  /** Raw JSON output from `gbrain doctor --json`, if parseable. */
  raw: unknown;
}

const PROBE_TIMEOUT_MS = 10_000;

/**
 * Probe gbrain health by running `gbrain doctor --json`.
 *
 * Returns `{ installed: false }` when gbrain is not on PATH. Never
 * throws —all failures degrade to a non-healthy result with an
 * error summary.
 */
export function probeGbrain(): GbrainProbeResult {
  const envPath = getEnhancedPath();
  try {
    const stdout = execFileSync("gbrain", ["doctor", "--json"], {
      encoding: "utf8",
      timeout: PROBE_TIMEOUT_MS,
      env: { ...process.env, PATH: envPath, PYTHONUTF8: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      ...HIDDEN_SUBPROCESS_OPTIONS,
    });

    return parseGbrainDoctorOutput(stdout);
  } catch (err) {
    const e = err as { code?: string; message?: string; stdout?: Buffer };
    // ENOENT —gbrain not installed. Not an error, just "not installed".
    if (e.code === "ENOENT") {
      return {
        installed: false,
        healthy: false,
        version: null,
        failingChecks: 0,
        totalChecks: 0,
        summary: "GBrain is not installed. Install with: bun install -g github:garrytan/gbrain",
        raw: null,
      };
    }
    // Timeout or non-zero exit —gbrain is installed but unhealthy.
    const partial = e.stdout?.toString() ?? "";
    if (partial) {
      try {
        return parseGbrainDoctorOutput(partial);
      } catch {
        /* fall through to generic error */
      }
    }
    return {
      installed: true,
      healthy: false,
      version: null,
      failingChecks: 0,
      totalChecks: 0,
      summary: `GBrain doctor failed: ${(e.message ?? "unknown error").slice(0, 120)}`,
      raw: null,
    };
  }
}

/**
 * Parse the JSON output of `gbrain doctor --json` into a
 * `GbrainProbeResult`. Pure —no I/O. Exported for unit testing.
 *
 * The gbrain doctor JSON shape (simplified):
 *   { "version": "0.42.66.0", "checks": [{ "id": "...", "status": "pass" | "fail" | "warn", ... }] }
 *
 * We are defensive about the shape because gbrain's doctor output
 * evolves across versions. We look for `version` and `checks` at the
 * top level, and count `status: "fail"` entries.
 */
export function parseGbrainDoctorOutput(stdout: string): GbrainProbeResult {
  const text = stdout.trim();
  if (!text) {
    return {
      installed: true,
      healthy: false,
      version: null,
      failingChecks: 0,
      totalChecks: 0,
      summary: "GBrain doctor returned empty output",
      raw: null,
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      installed: true,
      healthy: false,
      version: null,
      failingChecks: 0,
      totalChecks: 0,
      summary: "GBrain doctor returned non-JSON output (version mismatch?)",
      raw: text,
    };
  }

  const version =
    typeof parsed.version === "string" ? parsed.version : null;
  const checks = Array.isArray(parsed.checks) ? parsed.checks : [];
  const totalChecks = checks.length;
  const failingChecks = checks.filter(
    (c: unknown) =>
      typeof c === "object" &&
      c !== null &&
      (c as { status?: string }).status === "fail",
  ).length;
  const healthy = totalChecks > 0 && failingChecks === 0;

  const summary = healthy
    ? `GBrain ${version ?? ""} —all ${totalChecks} checks passed`.trim()
    : `GBrain ${version ?? ""} —${failingChecks}/${totalChecks} checks failing`.trim();

  return {
    installed: true,
    healthy,
    version,
    failingChecks,
    totalChecks,
    summary,
    raw: parsed,
  };
}