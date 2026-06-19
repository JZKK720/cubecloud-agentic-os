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


