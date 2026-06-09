/**
 * Headroom learn — failure-mining + correction writer via
 * the upstream `headroom learn` CLI.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *
 * Background:
 *   Upstream Headroom's `headroom learn` subsystem reads the
 *   user's recent Claude/Codex/Gemini session logs, calls an
 *   LLM to identify recurring failure patterns, and writes
 *   correction rules to the relevant agent's instruction
 *   file (`AGENTS.md` / `CLAUDE.md` / `GEMINI.md`).
 *
 *   The cubecloud desktop already has its own `/retro` skill
 *   (`src/main/retro.ts`) that surfaces heuristic proposals
 *   from session activity. This module is the LLM-backed
 *   alternative: it shells out to `headroom learn`, parses
 *   the output, and returns the proposals in the SAME shape
 *   `RetroReport.proposed[]` uses, so the renderer can mix
 *   the two sources in a single review screen.
 *
 * Design constraints:
 *   - The `headroom` binary is the same one the proxy sidecar
 *     resolves. If it's not on PATH, the call degrades to
 *     `{success: false, error: "headroom-binary-not-found"}`
 *     so the caller can fall back to the heuristic retro.
 *   - The call is async and bounded by a generous timeout
 *     (5 minutes) because LLM-backed analysis is slow. We
 *     stream stdout for live progress in the UI.
 *   - The LLM target is configurable (the user can pick a
 *     model in the Headroom screen). Auto-detect when unset
 *     so users with a Claude/Codex/Gemini CLI installed get
 *     free behavior.
 *   - We do NOT auto-apply: the desktop treats this as a
 *     human-in-the-loop flow like /retro. Proposals are
 *     surfaced in the UI; the user picks which to keep.
 */

import { spawn, spawnSync, type ChildProcess } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { delimiter } from "path";
import { getEnhancedPath, HERMES_HOME } from "./installer";
import { appendLearning } from "./learnings";

// ─── Public types ─────────────────────────────────────────────────

/** A single headroom-learn proposal. Same shape as
 *  `RetroLearning` so the renderer can render both in a
 *  single review screen. */
export interface HeadroomLearnProposal {
  type:
    | "pattern"
    | "pitfall"
    | "preference"
    | "architecture"
    | "tool"
    | "operational";
  key: string;
  insight: string;
  confidence: number;
  source: "inferred" | "cross-model" | "user-stated" | "observed";
  evidence: string;
  /** Optional: the section heading Headroom used (e.g.
   *  "Error Fixes", "Path Corrections"). Used by the
   *  renderer to group proposals. */
  section?: string;
}

export interface HeadroomLearnReport {
  generatedAt: string;
  projectPath: string;
  /** Total number of sessions scanned by Headroom. */
  sessionCount: number;
  /** Total number of recommendations produced. */
  totalRecommendations: number;
  /** Per-agent writer output paths (e.g. AGENTS.md). */
  outputFiles: string[];
  proposals: HeadroomLearnProposal[];
  /** Raw stdout from the CLI, kept for the renderer's
   *  "details" panel and debugging. Truncated to MAX_OUTPUT_BYTES. */
  rawOutput: string;
  /** Wall-clock latency in ms. */
  durationMs: number;
}

export interface HeadroomLearnResult {
  success: boolean;
  report?: HeadroomLearnReport;
  error?: string;
  /** Reason the call was rejected without running (no binary,
   *  no project, no LLM configured, etc.). When this is set,
   *  `error` is also set. */
  skipReason?: string;
}

export interface HeadroomLearnOptions {
  projectPath: string;
  /** LLM model to use (e.g. "claude-sonnet-4-6"). When
   *  unset, Headroom auto-detects via API keys / CLI
   *  binaries. */
  model?: string;
  /** Which agent to analyze. Defaults to "auto" which
   *  picks the first one with discoverable logs. */
  agent?: "auto" | "claude" | "codex" | "gemini";
  /** When true, write corrections to AGENTS.md / CLAUDE.md
   *  / GEMINI.md. When false, dry-run only. Defaults to
   *  false — the desktop treats this as a review-then-commit
   *  flow. */
  apply?: boolean;
  /** Per-call timeout in ms. Defaults to 5 minutes
   *  (LLM-backed analysis is slow). */
  timeoutMs?: number;
}

// ─── Internal constants ───────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_OUTPUT_BYTES = 256 * 1024;

// ─── Internal state ──────────────────────────────────────────────

/** Last successful report, kept for the renderer's
 *  "last result" card. The desktop doesn't keep a long
 *  history — that lives in learnings.jsonl. */
let lastReport: HeadroomLearnReport | null = null;

/** Currently-running child process, if any. Exposed so the
 *  main process can kill it on app shutdown. */
let runningChild: ChildProcess | null = null;

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

/** Parse the structured JSON output that `headroom learn
 *  --format json` emits. Falls back to a regex parse of the
 *  human-readable table if the JSON envelope is missing. */
function parseHeadroomOutput(
  stdout: string,
  projectPath: string,
  startedAt: number,
): HeadroomLearnReport {
  // Try JSON envelope first. `headroom learn` emits a
  // top-level array of recommendation objects when
  // `--format json` is passed; otherwise it prints a
  // human-readable table we can't reliably parse.
  const trimmed = stdout.trim();
  let proposals: HeadroomLearnProposal[] = [];
  let outputFiles: string[] = [];
  let totalRecommendations = 0;
  let sessionCount = 0;

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as Array<Record<string, unknown>>;
      proposals = parsed
        .filter((entry) => isRecommendation(entry))
        .map((entry) => toProposal(entry));
      totalRecommendations = parsed.length;
      // Output files: scan for `wrote` / `updated` lines below
      // the JSON block if any.
    } catch {
      // fall through to text parsing
    }
  }

  // Text-level parsing: capture "Scanned N sessions" /
  // "Wrote AGENTS.md" lines.
  for (const line of stdout.split(/\r?\n/)) {
    const sessionMatch = /^Scanned\s+(\d+)\s+sessions?/i.exec(line);
    if (sessionMatch) {
      sessionCount = Number(sessionMatch[1]);
      continue;
    }
    const wroteMatch = /(?:Wrote|Updated)\s+([^\s]+\.(?:md|markdown))/i.exec(
      line,
    );
    if (wroteMatch) {
      outputFiles.push(wroteMatch[1]);
    }
  }

  // Dedupe output files
  outputFiles = Array.from(new Set(outputFiles));

  return {
    generatedAt: new Date().toISOString(),
    projectPath,
    sessionCount,
    totalRecommendations,
    outputFiles,
    proposals,
    rawOutput: stdout.slice(0, MAX_OUTPUT_BYTES),
    durationMs: Date.now() - startedAt,
  };
}

function isRecommendation(entry: unknown): entry is Record<string, unknown> {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Record<string, unknown>;
  return typeof e.target === "string" && typeof e.content === "string";
}

function toProposal(entry: Record<string, unknown>): HeadroomLearnProposal {
  const target = String(entry.target ?? "");
  const content = String(entry.content ?? "");
  const section = typeof entry.section === "string" ? entry.section : undefined;
  const evidenceCount =
    typeof entry.evidence_count === "number" ? entry.evidence_count : 0;
  const confidence =
    typeof entry.confidence === "number"
      ? Math.max(1, Math.min(10, Math.round(entry.confidence * 9) + 1))
      : 5;
  // Map Headroom's section taxonomy to cubecloud's
  // `LearningType` union.
  const type = mapSectionToType(section ?? target);
  // Use the section or the first sentence of content as
  // the dedup key. The user can rename in the review UI.
  const key = slugify(section ?? content.split(/[.\n]/)[0] ?? "headroom-rec");
  return {
    type,
    key,
    insight: content,
    confidence,
    source: "inferred",
    evidence:
      evidenceCount > 0
        ? `Headroom saw this ${evidenceCount} time${evidenceCount === 1 ? "" : "s"} across recent sessions.`
        : "Headroom surfaced this from recent session activity.",
    section,
  };
}

function mapSectionToType(
  section: string,
): HeadroomLearnProposal["type"] {
  const s = section.toLowerCase();
  if (/error|fail|fix|broken|bug/.test(s)) return "pitfall";
  if (/path|file|locat/.test(s)) return "tool";
  if (/pref|style|convent/.test(s)) return "preference";
  if (/arch|design|pattern/.test(s)) return "architecture";
  if (/operat|deploy|ci|build/.test(s)) return "operational";
  return "pattern";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ─── Public API ───────────────────────────────────────────────────

/** Run `headroom learn` and return the parsed proposals.
 *  Always degrades to a structured error on failure —
 *  never throws. */
export async function runHeadroomLearn(
  options: HeadroomLearnOptions,
): Promise<HeadroomLearnResult> {
  const projectPath = options.projectPath?.trim();
  if (!projectPath) {
    return {
      success: false,
      error: "Project path is required.",
      skipReason: "no-project",
    };
  }

  const envPath = getEnhancedPath();
  const binary = resolveHeadroomBinary(envPath);
  if (!binary) {
    return {
      success: false,
      error:
        "Headroom binary not found. Install it with `pip install headroom-ai[all]`.",
      skipReason: "no-binary",
    };
  }

  const args: string[] = ["learn", "--project", projectPath];
  if (options.model) {
    args.push("--model", options.model);
  }
  if (options.agent && options.agent !== "auto") {
    args.push("--agent", options.agent);
  }
  if (options.apply) {
    args.push("--apply");
  }
  // Request JSON output so we can parse reliably. Upstream
  // may not support this flag yet; we degrade to text
  // parsing on parse failure.
  args.push("--format", "json");

  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return new Promise<HeadroomLearnResult>((resolve) => {
    const child = spawn(binary, args, {
      cwd: HERMES_HOME,
      env: {
        ...(process.env as Record<string, string>),
        PATH: envPath.includes(delimiter)
          ? envPath
          : `${envPath}${delimiter}${(process.env.PATH as string) ?? ""}`,
        HOME: process.env.HOME ?? "",
        HEADROOM_HOME: HERMES_HOME,
        PYTHONUNBUFFERED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    runningChild = child;

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
      // Cap memory: keep at most 1MB of stdout buffer.
      if (stdout.length > MAX_OUTPUT_BYTES * 4) {
        stdout = stdout.slice(-MAX_OUTPUT_BYTES * 4);
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* noop */
      }
      setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch {
          /* noop */
        }
      }, 3000);
      resolve({
        success: false,
        error: `headroom learn timed out after ${Math.round(timeoutMs / 1000)}s.`,
        skipReason: "timeout",
      });
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      runningChild = null;
      resolve({
        success: false,
        error: `Failed to spawn headroom: ${err.message}`,
        skipReason: "spawn-failed",
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      runningChild = null;
      if (code !== 0) {
        // Capture last stderr line as the error reason.
        const lastStderr = stderr
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0)
          .pop();
        resolve({
          success: false,
          error:
            lastStderr ??
            `headroom learn exited with code ${code ?? "?"}.`,
        });
        return;
      }
      const report = parseHeadroomOutput(stdout, projectPath, startedAt);
      lastReport = report;
      resolve({ success: true, report });
    });
  });
}

/** Read the most recent report (cached after a successful
 *  run). Returns null when no successful run has happened
 *  this session. */
export function getLastHeadroomLearnReport(): HeadroomLearnReport | null {
  return lastReport;
}

// ─── Apply-to-target-files ───────────────────────────────────────

/** One side of an apply diff. Mirrors the per-file state
 *  the renderer needs to render a "what changed"
 *  preview. */
export interface HeadroomLearnApplyFileDiff {
  /** Absolute path to the writer target. Resolved by
   *  upstream Headroom; we report it back as-is. */
  path: string;
  /** True when the file did not exist before the apply. */
  created: boolean;
  /** File contents BEFORE the apply. Empty string when
   *  the file was created by the apply. */
  before: string;
  /** File contents AFTER the apply. */
  after: string;
}

export interface HeadroomLearnApplyResult {
  success: boolean;
  /** Per-file before/after snapshots. Empty array when
   *  Headroom didn't write any files (e.g. the
   *  recommendations were identical to the prior run). */
  diffs: HeadroomLearnApplyFileDiff[];
  /** Headroom's parsed report (same shape as a dry-run
   *  report — proposals, outputFiles, durationMs, etc.). */
  report?: HeadroomLearnReport;
  error?: string;
  skipReason?: string;
}

export interface HeadroomLearnApplyOptions {
  projectPath: string;
  model?: string;
  agent?: "auto" | "claude" | "codex" | "gemini";
  timeoutMs?: number;
}

/** Snapshot the contents of each target file BEFORE the
 *  apply so we can compute a diff afterwards. Returns an
 *  empty string for non-existent files (which the diff
 *  surfaces as a `created: true` entry).
 *
 *  Resolved against `projectPath` — upstream may emit
 *  absolute paths or paths relative to the project
 *  root, so we try both. The project-relative candidate
 *  is checked FIRST so we don't accidentally read a
 *  file in the desktop's own working directory
 *  (e.g. `AGENTS.md` next to the binary) when the user
 *  is targeting a different project root. */
async function snapshotFile(
  projectPath: string,
  relOrAbsPath: string,
): Promise<{ before: string; created: boolean; absPath: string }> {
  // Check the project-relative path FIRST so a literal
  // "AGENTS.md" relOrAbsPath never accidentally matches
  // a file in the desktop's own working directory.
  const candidates = relOrAbsPath.includes("/") || relOrAbsPath.includes("\\")
    ? [relOrAbsPath, joinSafe(projectPath, relOrAbsPath)]
    : [joinSafe(projectPath, relOrAbsPath), relOrAbsPath];
  for (const candidate of candidates) {
    try {
      const before = await readFile(candidate, "utf-8");
      return { before, created: false, absPath: candidate };
    } catch {
      // try next candidate
    }
  }
  // No candidate existed — pick the project-relative
  // path as the absPath the diff should reference.
  return {
    before: "",
    created: true,
    absPath: joinSafe(projectPath, relOrAbsPath),
  };
}

/** Minimal safe `path.join` that tolerates both posix and
 *  windows separators in the upstream-emitted path. */
function joinSafe(projectPath: string, rel: string): string {
  const sep = rel.includes("\\") ? "\\" : "/";
  const tail = rel.replace(/[\\/]+$/, "");
  if (sep === "\\") {
    return `${projectPath.replace(/[\\/]+$/, "")}\\${tail.replace(/\//g, "\\")}`;
  }
  return `${projectPath.replace(/\/+$/, "")}/${tail}`;
}

/** Run `headroom learn --apply` against a project and
 *  capture the before/after state of every writer target
 *  file. The renderer shows the diff in a "Preview changes"
 *  panel so the user can either accept (already written)
 *  or revert (we restore the prior content).
 *
 *  We pre-snapshot the well-known writer target files
 *  (AGENTS.md / CLAUDE.md / GEMINI.md at the project
 *  root) BEFORE the apply, then re-snapshot them AFTER
 *  the apply so we can compute a real diff. The
 *  pre-snapshot set is intentionally hard-coded — we
 *  don't want the desktop to depend on Headroom telling
 *  us which files it touched (the upstream `--format
 *  json` envelope hasn't stabilised yet).
 *
 *  Always degrades to a structured error on failure —
 *  never throws. */
export async function applyHeadroomLearn(
  options: HeadroomLearnApplyOptions,
): Promise<HeadroomLearnApplyResult> {
  const projectPath = options.projectPath?.trim();
  if (!projectPath) {
    return {
      success: false,
      diffs: [],
      error: "Project path is required.",
      skipReason: "no-project",
    };
  }

  // Pre-snapshot: capture the contents of every
  // well-known writer target before the apply runs.
  // The desktop's revert path is the only consumer of
  // these snapshots, so we only need to track files
  // that COULD change. Any file Headroom touches that
  // isn't in this list will still be written, but the
  // user will have to revert it via git themselves.
  const candidateFiles = [
    "AGENTS.md",
    "CLAUDE.md",
    "GEMINI.md",
  ];
  const beforeSnapshots = new Map<
    string,
    { before: string; created: boolean; absPath: string }
  >();
  for (const name of candidateFiles) {
    const snap = await snapshotFile(projectPath, name);
    beforeSnapshots.set(snap.absPath, snap);
  }

  // Run the analyze + write pass.
  const result = await runHeadroomLearn({
    projectPath,
    model: options.model,
    agent: options.agent,
    apply: true,
    timeoutMs: options.timeoutMs,
  });

  if (!result.success || !result.report) {
    return {
      success: false,
      diffs: [],
      error: result.error,
      skipReason: result.skipReason,
    };
  }

  // Post-snapshot: re-read each candidate file and
  // emit a diff entry ONLY when the content actually
  // changed. Files that Headroom didn't touch drop
  // out of the diff array, which keeps the preview
  // focused on what the user needs to review.
  const diffs: HeadroomLearnApplyFileDiff[] = [];
  for (const [, before] of beforeSnapshots) {
    let after = "";
    try {
      after = await readFile(before.absPath, "utf-8");
    } catch {
      // file vanished between the apply and our read —
      // keep `after` as the empty string and treat the
      // change as a deletion-into-empty.
    }
    if (after === before.before) continue;
    diffs.push({
      path: before.absPath,
      created: before.created && before.before === "",
      before: before.before,
      after,
    });
  }

  return {
    success: true,
    diffs,
    report: result.report,
  };
}

/** Revert one or more files to the `before` snapshot
 *  captured at apply time. The renderer wires this to a
 *  "Revert" button on the apply preview so the user can
 *  undo a Headroom write without leaving the UI.
 *
 *  Files with `created: true` are deleted (since they
 *  didn't exist before the apply). Files with
 *  `created: false` are restored to `before`. */
export async function revertHeadroomLearn(
  diffs: HeadroomLearnApplyFileDiff[],
): Promise<{ success: boolean; reverted: string[]; error?: string }> {
  const reverted: string[] = [];
  try {
    for (const diff of diffs) {
      if (diff.created) {
        // Best-effort delete; ignore "file not found"
        // because the user may have already cleaned up.
        try {
          const { unlink } = await import("fs/promises");
          await unlink(diff.path);
          reverted.push(diff.path);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
          reverted.push(diff.path);
        }
      } else {
        await writeFile(diff.path, diff.before, "utf-8");
        reverted.push(diff.path);
      }
    }
    return { success: true, reverted };
  } catch (err) {
    return {
      success: false,
      reverted,
      error: (err as Error).message,
    };
  }
}

/** Convert a Headroom proposal to a `Learning` so the user
 *  can commit it through the existing /retro review flow
 *  (or directly via the `learnings-append` IPC). The
 *  profile is applied at commit time by `commitHeadroomLearn`,
 *  not here, so this function is a pure converter. */
export function proposalToLearning(
  proposal: HeadroomLearnProposal,
): {
  ts: string;
  skill: "headroom-learn";
  type: HeadroomLearnProposal["type"];
  key: string;
  insight: string;
  confidence: number;
  source: "inferred";
} {
  return {
    ts: new Date().toISOString(),
    skill: "headroom-learn",
    type: proposal.type,
    key: proposal.key,
    insight: proposal.insight,
    confidence: proposal.confidence,
    source: "inferred",
  };
}

/** Commit a batch of Headroom-learn proposals to the
 *  learnings log. Mirrors `commitRetro` in
 *  `src/main/retro.ts`: each kept proposal is appended
 *  via `appendLearning` with `skill: "headroom-learn"`,
 *  so the user can tell which entries came from the LLM
 *  analyzer vs. the heuristic retro. Returns the array
 *  of committed entries (in commit order). */
export function commitHeadroomLearn(
  proposals: HeadroomLearnProposal[],
  profile?: string,
): unknown[] {
  const out: unknown[] = [];
  for (const p of proposals) {
    out.push(
      appendLearning(
        {
          skill: "headroom-learn",
          type: p.type,
          key: p.key,
          insight: p.insight,
          confidence: p.confidence,
          source: "inferred",
        },
        profile,
      ),
    );
  }
  return out;
}

/** Kill any in-flight learn subprocess. Called on app
 *  shutdown. Best-effort: SIGTERM, then SIGKILL after 3s. */
export function stopHeadroomLearn(): void {
  if (!runningChild) return;
  try {
    runningChild.kill("SIGTERM");
  } catch {
    /* noop */
  }
  setTimeout(() => {
    if (runningChild) {
      try {
        runningChild.kill("SIGKILL");
      } catch {
        /* noop */
      }
    }
  }, 3000);
  runningChild = null;
}
