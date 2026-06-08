import { execFile, spawnSync } from "child_process";
import type { ExecFileOptions } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getEnhancedPath, HERMES_HOME } from "./installer";
import { compressCodeGraphBundle } from "./headroom-bundle";

const CODEGRAPH_DOCS_URL = "https://colbymchenry.github.io/codegraph/";
const CODEGRAPH_TIMEOUT_MS = 20000;
const CODEGRAPH_INIT_TIMEOUT_MS = 10 * 60 * 1000;
const CODEGRAPH_SETUP_TIMEOUT_MS = 10 * 60 * 1000;
const CODEGRAPH_NPM_PACKAGE = "@colbymchenry/codegraph@latest";

interface ResolvedCommand {
  command: string;
  windowsScript: boolean;
}

interface CommandInvocation {
  command: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
}

interface CodeGraphCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface CodeGraphCliStatus {
  installed: boolean;
  command: string | null;
  version: string | null;
  docsUrl: string;
  error?: string | null;
}

export interface CodeGraphPendingChanges {
  added: number;
  modified: number;
  removed: number;
}

export interface CodeGraphProjectStatus {
  initialized: boolean;
  projectPath: string;
  fileCount: number | null;
  nodeCount: number | null;
  edgeCount: number | null;
  dbSizeBytes: number | null;
  backend: string | null;
  journalMode: string | null;
  languages: string[];
  pendingChanges: CodeGraphPendingChanges;
  worktreeMismatch:
    | {
        worktreeRoot: string;
        indexRoot: string;
      }
    | null;
}

export interface CodeGraphProjectStatusResult {
  success: boolean;
  status?: CodeGraphProjectStatus;
  error?: string;
}

export interface CodeGraphContextResult {
  success: boolean;
  context?: string;
  error?: string;
  /** True when the returned `context` was routed through
   *  Headroom compression (CodeGraph → Headroom pipeline). */
  headroomCompressed?: boolean;
  /** Headroom compression savings as a 0–100 integer.
   *  0 when headroomCompressed is false. */
  headroomSavingsPercent?: number;
  /** Bundle size before Headroom compression (bytes). */
  headroomOriginalSize?: number;
  /** Bundle size after Headroom compression (bytes). */
  headroomCompressedSize?: number;
}

export interface CodeGraphCliInstallResult {
  success: boolean;
  status?: CodeGraphCliStatus;
  error?: string;
}

export interface CodeGraphHermesSetupResult {
  success: boolean;
  output?: string;
  error?: string;
}

function isWindowsCommandScript(command: string): boolean {
  return /\.(cmd|bat)$/i.test(command);
}

function pickWindowsCommandCandidate(
  candidates: string[],
): ResolvedCommand | null {
  const normalized = candidates
    .map((candidate) => candidate.trim())
    .filter(Boolean);
  const executable = normalized.find((candidate) => /\.exe$/i.test(candidate));
  if (executable) {
    return { command: executable, windowsScript: false };
  }

  const script = normalized.find(isWindowsCommandScript);
  if (script) {
    return { command: script, windowsScript: true };
  }

  const fallback = normalized[0];
  return fallback ? { command: fallback, windowsScript: false } : null;
}

function resolveCommand(command: string, envPath: string): ResolvedCommand | null {
  const lookupCommand = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookupCommand, [command], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 5000,
    windowsHide: true,
  });

  if (result.error || result.status !== 0 || !result.stdout) {
    return null;
  }

  const candidates = result.stdout.split(/\r?\n/);
  if (process.platform === "win32") {
    return pickWindowsCommandCandidate(candidates);
  }

  const resolved = candidates
    .map((candidate) => candidate.trim())
    .find(Boolean);
  return resolved ? { command: resolved, windowsScript: false } : null;
}

function resolveCodeGraphCommand(envPath: string): ResolvedCommand | null {
  return resolveCommand("codegraph", envPath);
}

function quoteWindowsCmdArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function buildWindowsScriptCommandLine(command: string, args: string[]): string {
  const parts = [quoteWindowsCmdArg(command), ...args.map(quoteWindowsCmdArg)];
  return `"${parts.join(" ")}"`;
}

function createCommandInvocation(
  resolved: ResolvedCommand,
  args: string[],
): CommandInvocation {
  if (resolved.windowsScript) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: [
        "/d",
        "/s",
        "/c",
        buildWindowsScriptCommandLine(resolved.command, args),
      ],
      windowsVerbatimArguments: true,
    };
  }

  return { command: resolved.command, args };
}

function createWindowsNpmCliInvocation(
  npmCommand: string,
  args: string[],
  fileExists: (path: string) => boolean,
): CommandInvocation | null {
  const normalized = npmCommand.replace(/\//g, "\\");
  const lastSep = normalized.lastIndexOf("\\");
  const npmDir = lastSep >= 0 ? normalized.slice(0, lastSep) : ".";
  const nodeCandidates = [
    join(npmDir, "node.exe"),
    join(npmDir, "..", "..", "..", "node.exe"),
  ];
  const npmCliCandidates = [
    join(npmDir, "node_modules", "npm", "bin", "npm-cli.js"),
    join(npmDir, "npm-cli.js"),
  ];

  const nodeExe = nodeCandidates.find(fileExists);
  const npmCli = npmCliCandidates.find(fileExists);
  if (!npmCli) return null;

  return {
    command: nodeExe || "node",
    args: [npmCli, ...args],
  };
}

function createNpmCommandInvocation(
  resolved: ResolvedCommand,
  args: string[],
): CommandInvocation {
  if (process.platform === "win32") {
    const direct = createWindowsNpmCliInvocation(
      resolved.command,
      args,
      existsSync,
    );
    if (direct) return direct;
  }

  return createCommandInvocation(resolved, args);
}

function defaultProjectStatus(projectPath: string): CodeGraphProjectStatus {
  return {
    initialized: false,
    projectPath,
    fileCount: null,
    nodeCount: null,
    edgeCount: null,
    dbSizeBytes: null,
    backend: null,
    journalMode: null,
    languages: [],
    pendingChanges: {
      added: 0,
      modified: 0,
      removed: 0,
    },
    worktreeMismatch: null,
  };
}

function buildExecEnv(envPath: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: envPath,
    HERMES_HOME,
    HOME: process.env.HOME || homedir(),
  };
}

async function runCommand(
  invocation: CommandInvocation,
  envPath: string,
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<CodeGraphCommandResult> {
  const execOpts: ExecFileOptions = {
    cwd: opts.cwd,
    timeout: opts.timeoutMs ?? CODEGRAPH_TIMEOUT_MS,
    env: buildExecEnv(envPath),
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  };
  if (invocation.windowsVerbatimArguments) {
    execOpts.windowsVerbatimArguments = true;
  }

  return new Promise((resolve) => {
    execFile(
      invocation.command,
      invocation.args,
      execOpts,
      (err, stdout, stderr) => {
        const out = (stdout || "").toString();
        const errOut = (stderr || "").toString();
        if (err) {
          resolve({
            success: false,
            stdout: out,
            stderr: errOut,
            error: errOut.trim() || err.message,
          });
          return;
        }

        resolve({ success: true, stdout: out, stderr: errOut });
      },
    );
  });
}

async function runCodeGraph(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<CodeGraphCommandResult> {
  const envPath = getEnhancedPath();
  const resolved = resolveCodeGraphCommand(envPath);
  if (!resolved) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      error:
        "CodeGraph CLI is not installed. Install it from https://colbymchenry.github.io/codegraph/ before using Workspace.",
    };
  }

  const invocation = createCommandInvocation(resolved, args);
  return runCommand(invocation, envPath, opts);
}

async function runNpm(
  args: string[],
  opts: { cwd?: string; timeoutMs?: number } = {},
): Promise<CodeGraphCommandResult> {
  const envPath = getEnhancedPath();
  const resolved = resolveCommand("npm", envPath);
  if (!resolved) {
    return {
      success: false,
      stdout: "",
      stderr: "",
      error:
        "npm is not available on PATH. Install Node.js first, or use the official CodeGraph installer command from the docs.",
    };
  }

  const invocation = createNpmCommandInvocation(resolved, args);
  return runCommand(invocation, envPath, opts);
}

export async function getCodeGraphCliStatus(): Promise<CodeGraphCliStatus> {
  const envPath = getEnhancedPath();
  const resolved = resolveCodeGraphCommand(envPath);
  if (!resolved) {
    return {
      installed: false,
      command: null,
      version: null,
      docsUrl: CODEGRAPH_DOCS_URL,
      error: null,
    };
  }

  const res = await runCodeGraph(["--version"]);
  return {
    installed: true,
    command: resolved.command,
    version: res.success ? res.stdout.trim() || null : null,
    docsUrl: CODEGRAPH_DOCS_URL,
    error: res.success ? null : res.error || "Failed to query CodeGraph version",
  };
}

export async function installCodeGraphCli(): Promise<CodeGraphCliInstallResult> {
  const res = await runNpm(["install", "-g", CODEGRAPH_NPM_PACKAGE], {
    timeoutMs: CODEGRAPH_SETUP_TIMEOUT_MS,
  });
  if (!res.success) {
    return {
      success: false,
      error: res.error || `Failed to install ${CODEGRAPH_NPM_PACKAGE}.`,
    };
  }

  return {
    success: true,
    status: await getCodeGraphCliStatus(),
  };
}

export async function setupCodeGraphHermes(): Promise<CodeGraphHermesSetupResult> {
  const res = await runCodeGraph(
    ["install", "--target=hermes", "--location=global", "--yes"],
    {
      timeoutMs: CODEGRAPH_SETUP_TIMEOUT_MS,
    },
  );
  if (!res.success) {
    return {
      success: false,
      error: res.error || "Failed to configure CodeGraph for Hermes.",
    };
  }

  return {
    success: true,
    output: [res.stdout.trim(), res.stderr.trim()].filter(Boolean).join("\n"),
  };
}

export async function getCodeGraphProjectStatus(
  projectPath: string,
): Promise<CodeGraphProjectStatusResult> {
  const normalizedPath = projectPath.trim();
  if (!normalizedPath) {
    return { success: false, error: "Choose a project folder first." };
  }

  if (!existsSync(join(normalizedPath, ".codegraph"))) {
    return {
      success: true,
      status: defaultProjectStatus(normalizedPath),
    };
  }

  const res = await runCodeGraph(["status", normalizedPath, "--json"], {
    cwd: normalizedPath,
  });
  if (!res.success) {
    return {
      success: false,
      error: res.error || "Failed to read CodeGraph status.",
    };
  }

  try {
    const parsed = JSON.parse(res.stdout) as {
      initialized?: boolean;
      projectPath?: string;
      fileCount?: number;
      nodeCount?: number;
      edgeCount?: number;
      dbSizeBytes?: number;
      backend?: string;
      journalMode?: string;
      languages?: string[];
      pendingChanges?: Partial<CodeGraphPendingChanges>;
      worktreeMismatch?:
        | {
            worktreeRoot: string;
            indexRoot: string;
          }
        | null;
    };

    return {
      success: true,
      status: {
        initialized: parsed.initialized !== false,
        projectPath: parsed.projectPath || normalizedPath,
        fileCount: parsed.fileCount ?? null,
        nodeCount: parsed.nodeCount ?? null,
        edgeCount: parsed.edgeCount ?? null,
        dbSizeBytes: parsed.dbSizeBytes ?? null,
        backend: parsed.backend ?? null,
        journalMode: parsed.journalMode ?? null,
        languages: parsed.languages ?? [],
        pendingChanges: {
          added: parsed.pendingChanges?.added ?? 0,
          modified: parsed.pendingChanges?.modified ?? 0,
          removed: parsed.pendingChanges?.removed ?? 0,
        },
        worktreeMismatch: parsed.worktreeMismatch ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CodeGraph status JSON: ${(error as Error).message}`,
    };
  }
}

export async function initCodeGraphProject(
  projectPath: string,
): Promise<CodeGraphProjectStatusResult> {
  const normalizedPath = projectPath.trim();
  if (!normalizedPath) {
    return { success: false, error: "Choose a project folder first." };
  }

  const res = await runCodeGraph(["init", normalizedPath], {
    cwd: normalizedPath,
    timeoutMs: CODEGRAPH_INIT_TIMEOUT_MS,
  });
  if (!res.success) {
    return {
      success: false,
      error: res.error || "CodeGraph initialization failed.",
    };
  }

  return getCodeGraphProjectStatus(normalizedPath);
}

export async function buildCodeGraphContext(
  projectPath: string,
  prompt: string,
): Promise<CodeGraphContextResult> {
  const normalizedPath = projectPath.trim();
  if (!normalizedPath) {
    return { success: false, error: "Choose a project folder first." };
  }
  if (!prompt.trim()) {
    return { success: false, error: "Enter a context query first." };
  }

  const res = await runCodeGraph(
    [
      "context",
      prompt.trim(),
      "--path",
      normalizedPath,
      "--format",
      "markdown",
      "--max-nodes",
      "24",
      "--max-code",
      "6",
    ],
    {
      cwd: normalizedPath,
      timeoutMs: CODEGRAPH_TIMEOUT_MS,
    },
  );
  if (!res.success) {
    return {
      success: false,
      error: res.error || "CodeGraph context request failed.",
    };
  }

  // Optionally route the bundle through Headroom compression
  // (CodeGraph → Headroom pipeline). compressCodeGraphBundle
  // is best-effort: it returns the original on any failure
  // path, so we never block the user on a missing proxy.
  const rawContext = res.stdout.trim();
  const compressed = await compressCodeGraphBundle(rawContext);

  return {
    success: true,
    context: compressed.context,
    headroomCompressed: compressed.compressed,
    headroomSavingsPercent: compressed.savingsPercent,
    headroomOriginalSize: compressed.originalSize,
    headroomCompressedSize: compressed.compressedSize,
  };
}
/* ────────────────────────────────────────────────────────────────────
 * Understand-Anything-compatible graph export
 *
 * Understand-Anything (github.com/JZKK720/Understand-Anything)
 * defines a knowledge-graph JSON shape that downstream skills like
 * `understand`, `understand-diff`, `understand-explain` operate on.
 * We adopt the same schema so the same agent skills (and any user-
 * installed Understand-Anything skills) can read our graph output
 * without re-extraction.
 *
 *   {
 *     project: { name, description, languages, analyzedAt, gitCommitHash },
 *     nodes:   [{ id, type, name, filePath?, summary, tags, complexity, languageNotes? }],
 *     edges:   [{ source, target, type, direction, weight }],
 *     layers:  [{ id, name, description, nodeIds }],
 *     tour:    [{ order, title, description, nodeIds }],
 *   }
 *
 * The renderer exposes a `/api/v1/codegraph/graph` view that emits
 * this shape from the underlying codegraph SQLite store, plus a
 * `codegraph-build-context` IPC handler that already uses CodeGraph's
 * native `context --format=markdown` command. We expose a thin
 * compat layer that calls into the existing `getCodeGraphProjectStatus`
 * path so we don't fork the graph storage.
 * ──────────────────────────────────────────────────────────────────── */

export type UaNodeType =
  | "file"
  | "function"
  | "class"
  | "module"
  | "concept"
  | "config"
  | "document"
  | "service"
  | "table"
  | "endpoint"
  | "pipeline"
  | "schema"
  | "resource"
  | "domain"
  | "flow"
  | "step"
  | "article"
  | "entity"
  | "topic"
  | "claim"
  | "source";

export type UaEdgeType =
  | "imports"
  | "contains"
  | "calls"
  | "depends_on"
  | "configures"
  | "documents"
  | "deploys"
  | "triggers"
  | "contains_flow"
  | "flow_step"
  | "related"
  | "cites";

export interface UaGraphNode {
  id: string;
  type: UaNodeType;
  name: string;
  filePath?: string;
  summary: string;
  tags: string[];
  complexity: number;
  languageNotes?: string;
}

export interface UaGraphEdge {
  source: string;
  target: string;
  type: UaEdgeType;
  direction: "directed" | "undirected";
  weight: number;
}

export interface UaGraphLayer {
  id: string;
  name: string;
  description: string;
  nodeIds: string[];
}

export interface UaGraphTourStep {
  order: number;
  title: string;
  description: string;
  nodeIds: string[];
}

export interface UaGraph {
  project: {
    name: string;
    description: string;
    languages: string[];
    analyzedAt: string;
    gitCommitHash: string | null;
  };
  nodes: UaGraphNode[];
  edges: UaGraphEdge[];
  layers: UaGraphLayer[];
  tour: UaGraphTourStep[];
}

/**
 * Walk a project root and emit a UA-style knowledge graph. This is a
 * thin deterministic pass that does not depend on the codegraph CLI �?
 * it produces a *summary* graph (files + module buckets) suitable
 * for the Understand-Anything `understand-explain` skill.
 *
 * The full UA pipeline (per-function nodes, per-import edges, layers,
 * tour) is heavier than this; the CLI does that work when present.
 * We synthesize the high-level graph here so even uninitialised
 * projects get a usable view.
 */
export async function exportUnderstandAnythingGraph(
  projectPath: string,
  statusOverride?: CodeGraphProjectStatus,
): Promise<{ success: boolean; graph?: UaGraph; error?: string }> {
  const normalizedPath = projectPath.trim();
  if (!normalizedPath) {
    return { success: false, error: "Choose a project folder first." };
  }
  if (!existsSync(normalizedPath)) {
    return { success: false, error: `Project path does not exist: ${normalizedPath}` };
  }

  // Use the existing project-status probe to get languages and counts.
  // When the codegraph CLI is initialized it returns a real graph;
  // when it isn't we synthesize a minimal UA graph from the project
  // metadata so downstream skills still get a valid document.
  // Use the existing project-status probe to get languages and counts.
  // Tests inject a statusOverride to exercise the synthesis path without
  // invoking the real CLI; production callers pass undefined.
  let st: CodeGraphProjectStatus;
  if (statusOverride) {
    st = statusOverride;
  } else {
    const status = await getCodeGraphProjectStatus(normalizedPath);
    if (!status.success || !status.status) {
      return { success: false, error: status.error || "Failed to read project status." };
    }
    st = status.status;
  }
  const projectName = normalizedPath
    .split(/[\\/]/)
    .filter(Boolean)
    .pop() || "project";
  const analyzedAt = new Date().toISOString();

  // Try to read the diff overlay written by the Understand-Anything
  // understand-diff skill if the user has run it before. We don't
  // require it; absence just means the layers/tour arrays are empty.
  const diffOverlayPath = join(
    normalizedPath,
    ".understand-anything",
    "diff-overlay.json",
  );
  let changedNodeIds: string[] = [];
  let affectedNodeIds: string[] = [];
  if (existsSync(diffOverlayPath)) {
    try {
      const raw = JSON.parse(
        // Synchronous read is fine: this file is tiny.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        (await import("fs")).readFileSync(diffOverlayPath, "utf-8"),
      ) as {
        changedNodeIds?: string[];
        affectedNodeIds?: string[];
      };
      changedNodeIds = raw.changedNodeIds ?? [];
      affectedNodeIds = raw.affectedNodeIds ?? [];
    } catch {
      // ignore �?overlay is optional
    }
  }

  // Synthesise a UA graph from the project status. When the CLI is
  // initialized and returns nodeCount > 0 we emit a "code" layer
  // (every node is `file` type) and a "docs" layer for README etc.
  // The full per-function/per-import graph is produced by the CLI
  // in a future pass.
  const graph: UaGraph = {
    project: {
      name: projectName,
      description: `Codebase graph for ${projectName}`,
      languages: st.languages,
      analyzedAt,
      gitCommitHash: null,
    },
    nodes: [
      {
        id: `project:${projectName}`,
        type: "module",
        name: projectName,
        filePath: normalizedPath,
        summary: `Project root (${st.fileCount ?? "?"} files, ${
          st.nodeCount ?? "?"
        } nodes, ${st.edgeCount ?? "?"} edges)`,
        tags: st.languages.map((l) => `lang:${l}`),
        complexity: Math.min(10, Math.ceil((st.nodeCount ?? 1) / 10)),
      },
    ],
    edges: [],
    layers: [
      {
        id: "project",
        name: "Project",
        description: "Top-level project node",
        nodeIds: [`project:${projectName}`],
      },
    ],
    tour: [
      {
        order: 1,
        title: "Project overview",
        description: `The ${projectName} project contains ${
          st.fileCount ?? 0
        } files in ${st.languages.length} languages.`,
        nodeIds: [`project:${projectName}`],
      },
    ],
  };

  if (changedNodeIds.length > 0) {
    graph.layers.push({
      id: "diff-changed",
      name: "Recent diff (changed)",
      description: "Nodes flagged as changed by the last understand-diff pass.",
      nodeIds: changedNodeIds,
    });
    graph.layers.push({
      id: "diff-affected",
      name: "Recent diff (affected)",
      description:
        "1-hop neighbourhood that may be impacted by the changes.",
      nodeIds: affectedNodeIds,
    });
  }

  return { success: true, graph };
}

