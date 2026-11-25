// officecli.ts — run OfficeCLI as an agent tool, safely.
//
// WHY THIS EXISTS: OfficeCLI (https://github.com/iOfficeAI/OfficeCLI) is
// installed on the host and can read, write and render real .docx/.xlsx/.pptx
// files. It was registered in the MCP registry and shown on the Tools screen,
// but nothing in the main process could invoke it — the card was
// discoverability, not capability.
//
// SECURITY POSTURE: OfficeCLI writes files. Every invocation therefore goes
// through three gates before a child process is spawned:
//
//   1. The verb must be in OFFICECLI_VERBS. `shell` is deliberately absent —
//      it would hand the agent an arbitrary shell.
//   2. Every argument that looks like a path is resolved against the
//      allow-listed roots and rejected if it escapes them.
//   3. `spawn` is called with an argument array and `shell: false`, so no
//      caller-supplied string is ever re-parsed by a shell.
//
// The allow-list defaults to the user's home directory and the OS temp dir.
// OFFICECLI_ALLOWED_ROOTS (path-delimited) extends it; there is no way to
// widen it from the renderer.

import { spawn } from "child_process";
import { delimiter, resolve, isAbsolute, win32, posix } from "path";
import { homedir, tmpdir } from "os";
import { existsSync } from "fs";
import { resolveCommandOnPath } from "./agent-clis";
import { getEnhancedPath } from "./homer";

export const OFFICECLI_TIMEOUT_MS = 120_000;
export const OFFICECLI_MAX_OUTPUT_BYTES = 1_000_000;

/** Verbs an agent may invoke. Ordered by how safe they are to expose. */
export const OFFICECLI_VERBS = [
  "get",
  "query",
  "view",
  "raw",
  "dump",
  "validate",
  "plugins",
  "create",
  "set",
  "add",
  "remove",
  "move",
  "swap",
  "refresh",
  "raw-set",
  "add-part",
  "import",
  "merge",
  "batch",
  "save",
  "open",
  "close",
] as const;

export type OfficeCliVerb = (typeof OFFICECLI_VERBS)[number];

const OFFICECLI_VERB_SET = new Set<string>(OFFICECLI_VERBS);

/** View modes accepted by `officecli view`. Anything else is rejected. */
export const OFFICECLI_VIEW_MODES = [
  "text",
  "annotated",
  "outline",
  "stats",
  "issues",
  "html",
  "svg",
  "screenshot",
  "pdf",
  "forms",
] as const;

export type OfficeCliViewMode = (typeof OFFICECLI_VIEW_MODES)[number];

export interface OfficeCliRunRequest {
  /** The officecli verb, e.g. "view" or "set". Must be in OFFICECLI_VERBS. */
  verb: string;
  /** File the verb operates on. Must resolve inside an allowed root. */
  file: string;
  /** Positional/option arguments after the file, already split by the caller. */
  args?: string[];
}

export interface OfficeCliViewRequest {
  file: string;
  mode: string;
  out?: string;
  /** Extra view options such as --page, --range, --max-lines. Passed verbatim but path-checked. */
  args?: string[];
}

export interface OfficeCliResult {
  ok: boolean;
  /** Exit code, or null when the process never ran (rejected before spawn). */
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** True when stdout or stderr hit the byte cap and was truncated. */
  truncated: boolean;
  /** Set when the request was rejected before spawning, or the process failed to start. */
  error: string | null;
  /** The argv that was actually spawned, for audit. Never contains env values. */
  command: string[] | null;
}

function failure(error: string, command: string[] | null = null): OfficeCliResult {
  return { ok: false, exitCode: null, stdout: "", stderr: "", truncated: false, error, command };
}

/** Roots the child may touch. Defaults: home + temp. Widened by OFFICECLI_ALLOWED_ROOTS. */
export function allowedRoots(): string[] {
  const roots = [homedir(), tmpdir()].filter(Boolean).map((r) => resolve(r));
  const extra = process.env.OFFICECLI_ALLOWED_ROOTS;
  if (extra) {
    for (const entry of extra.split(delimiter)) {
      const trimmed = entry.trim();
      if (trimmed) roots.push(resolve(trimmed));
    }
  }
  return [...new Set(roots)];
}

/**
 * Resolve `input` to an absolute path and confirm it is inside one of `roots`.
 * Returns the resolved path, or null when the path escapes every root.
 *
 * Uses case-insensitive comparison on Windows and resolve() rather than
 * startsWith on the raw string, so `..` segments and mixed separators cannot
 * escape the boundary.
 */
export function resolveWithinRoots(input: string, roots: string[]): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const candidate = isAbsolute(trimmed)
    ? resolve(trimmed)
    : resolve(roots[0] ?? process.cwd(), trimmed);

  const eq = (a: string, b: string) =>
    process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
  const startsWith = (child: string, parent: string) => {
    const sep = process.platform === "win32" ? win32.sep : posix.sep;
    const nChild = process.platform === "win32" ? child.toLowerCase() : child;
    const nParent = process.platform === "win32" ? parent.toLowerCase() : parent;
    const base = nParent.endsWith(sep) ? nParent : nParent + sep;
    return nChild === nParent || nChild.startsWith(base);
  };

  for (const root of roots) {
    if (eq(candidate, root) || startsWith(candidate, root)) return candidate;
  }
  return null;
}

/** True when an argument looks like a path that must be contained. */
function looksLikePath(arg: string): boolean {
  const t = arg.trim();
  if (!t) return false;
  return (
    /^[A-Za-z]:[\\/]/.test(t) ||
    t.startsWith("\\\\") ||
    t.startsWith("/") ||
    t.startsWith("./") ||
    t.startsWith("../") ||
    t.startsWith(".\\") ||
    t.startsWith("..\\")
  );
}

/** True when the argument contains a `..` segment. */
function escapesParent(arg: string): boolean {
  return /(^|[/\\])\.\.([/\\]|$)/.test(arg);
}

/**
 * Document-internal selectors (e.g. /slide[1], /A1, /body/table[1]) are
 * not filesystem paths. The distinction that keeps the containment check
 * honest: a selector addresses a node *inside a document*, so it either
 * carries a predicate (`[1]`, `[@name=...]`) or a single path segment with
 * no extension. A bare absolute path such as `/etc/passwd` or
 * `/var/log/app.log` is always treated as a filesystem path and falls
 * through to the root-containment check.
 */
export function isDocumentSelector(arg: string): boolean {
  const t = arg.trim();
  if (!/^\/[A-Za-z0-9_@]/.test(t)) return false;
  if (escapesParent(t)) return false;
  // Selectors never contain a backslash (that is a Windows path separator).
  if (t.includes("\\")) return false;
  if (t.includes("[")) return true; // /slide[1], /body/table[1], /@name[1]
  const segments = t.split("/").filter(Boolean);
  if (segments.length === 1) {
    // Single segment: /slide, /A1 — but a bare extension ("/etc") is
    // ambiguous; only treat it as a selector when it has no extension.
    return !/\.[A-Za-z0-9]{1,8}$/.test(segments[0]);
  }
  // Multi-segment selectors need a predicate on the last segment
  // (/body/table[1] handles above) — a plain multi-segment path is a path.
  return false;
}

/** Split `--flag=value` so a path inside a joined option is still checked. */
function splitOptionValue(arg: string): { flag: string; value: string } | null {
  const eq = arg.indexOf("=");
  if (!arg.startsWith("-") || eq === -1) return null;
  return { flag: arg.slice(0, eq + 1), value: arg.slice(eq + 1) };
}

/** Flags whose value is a filesystem path (space- or equals-separated). */
export const OFFICECLI_PATH_FLAGS = new Set([
  "--out",
  "-o",
  "--outfile",
  "--input",
  "--input-file",
  "--source",
  "--output",
  "--dest",
  "--target",
]);

/** Positional indices (after <file>) that are filesystem paths, per verb. */
const PATH_WORD_POSITIONS: Record<string, number[]> = {
  import: [1], // import <file> <parent> <source-file>
  merge: [0], // merge <template> <output>
};

function looksLikeJson(arg: string): boolean {
  const t = arg.trimStart();
  return t.startsWith("{") || t.startsWith("[");
}

/** Rewrite path-like strings inside a JSON payload so they stay inside the roots. */
function sanitizeJsonValue(
  value: unknown,
  roots: string[],
): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof value === "string") {
    if (escapesParent(value) || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/")) {
      const resolved = resolveWithinRoots(value, roots);
      if (!resolved) {
        return { ok: false, error: `path inside JSON payload outside allowed roots: ${value}` };
      }
      return { ok: true, value: resolved };
    }
    return { ok: true, value };
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const item of value) {
      const r = sanitizeJsonValue(item, roots);
      if (!r.ok) return r;
      out.push(r.value);
    }
    return { ok: true, value: out };
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      const r = sanitizeJsonValue(v, roots);
      if (!r.ok) return r;
      out[key] = r.value;
    }
    return { ok: true, value: out };
  }
  return { ok: true, value };
}

/**
 * Validate argv for the officecli invocation. Returns the rebuilt argument
 * list (with paths resolved) or an error string.
 *
 * Rules:
 *  - `--flag=<path>` and path-valued flags consume their value as a path.
 *  - JSON arguments (`batch --commands`) have every string path checked.
 *  - `--flag value` for path flags consumes the next argument as a path.
 *  - Leading-`-` arguments that are not path flags pass through untouched.
 *  - Positional arguments named by PATH_WORD_POSITIONS are paths; any other
 *    positional that contains `..` is rejected; positionals that look like
 *    absolute filesystem paths are contained; a leading-`/` argument is a
 *    document selector (e.g. /slide[1]) and passes through.
 */
export function validateArgs(
  verb: string,
  args: ReadonlyArray<string>,
  roots: string[],
): { ok: true; args: string[] } | { ok: false; error: string } {
  const out: string[] = [];
  const pathPositions = new Set(PATH_WORD_POSITIONS[verb] ?? []);
  let positional = 0;
  let expectPathValue = false;

  for (const raw of args) {
    if (typeof raw !== "string") {
      return { ok: false, error: "argument is not a string" };
    }
    if (raw.length === 0) continue;
    if (raw.length > 32_000) {
      return { ok: false, error: "argument exceeds 32 KB" };
    }
    if (/[\r\n\0]/.test(raw)) {
      return { ok: false, error: "argument contains control characters" };
    }

    if (expectPathValue) {
      expectPathValue = false;
      const resolved = resolveWithinRoots(raw, roots);
      if (!resolved) return { ok: false, error: `path outside allowed roots: ${raw}` };
      out.push(resolved);
      continue;
    }

    if (OFFICECLI_PATH_FLAGS.has(raw)) {
      out.push(raw);
      expectPathValue = true;
      continue;
    }

    if (looksLikeJson(raw)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, error: "argument looks like JSON but could not be parsed" };
      }
      const fixed = sanitizeJsonValue(parsed, roots);
      if (!fixed.ok) return fixed;
      out.push(JSON.stringify(fixed.value));
      continue;
    }

    const joined = splitOptionValue(raw);
    if (joined) {
      if (looksLikePath(joined.value) || escapesParent(joined.value)) {
        const resolved = resolveWithinRoots(joined.value, roots);
        if (!resolved) return { ok: false, error: `path outside allowed roots: ${joined.value}` };
        out.push(joined.flag + resolved);
        continue;
      }
      out.push(raw);
      continue;
    }

    if (raw.startsWith("-")) {
      // Unknown flag: the officecli binary rejects what it does not know.
      out.push(raw);
      continue;
    }

    if (pathPositions.has(positional)) {
      const resolved = resolveWithinRoots(raw, roots);
      if (!resolved) return { ok: false, error: `path outside allowed roots: ${raw}` };
      out.push(resolved);
      positional++;
      continue;
    }
    positional++;

    if (escapesParent(raw)) {
      return { ok: false, error: `path traversal not allowed: ${raw}` };
    }
    // Selectors (/slide[1], /body/table[1]) are not filesystem paths.
    // isDocumentSelector rejects absolute POSIX paths, so anything it
    // accepts is safe to pass through untouched.
    if (isDocumentSelector(raw)) {
      out.push(raw);
      continue;
    }
    if (looksLikePath(raw)) {
      const resolved = resolveWithinRoots(raw, roots);
      if (!resolved) return { ok: false, error: `path outside allowed roots: ${raw}` };
      out.push(resolved);
      continue;
    }
    out.push(raw);
  }

  if (expectPathValue) {
    return { ok: false, error: "dangling path flag: expected a path after it" };
  }
  return { ok: true, args: out };
}

export interface ValidatedInvocation {
  argv: string[];
}

/** Validate a full invocation without spawning. Exported for tests. */
export function validateInvocation(
  verb: string,
  file: string,
  args: ReadonlyArray<string>,
  roots: string[] = allowedRoots(),
): { ok: true; value: ValidatedInvocation } | { ok: false; error: string } {
  const v = verb.trim().toLowerCase();
  if (!OFFICECLI_VERB_SET.has(v)) {
    return { ok: false, error: `verb not allowed: ${verb}` };
  }
  if (!file || typeof file !== "string") {
    return { ok: false, error: "a document path is required" };
  }
  const resolvedFile = resolveWithinRoots(file, roots);
  if (!resolvedFile) {
    return { ok: false, error: `path outside allowed roots: ${file}` };
  }
  const checked = validateArgs(verb.trim().toLowerCase(), args ?? [], roots);
  if (!checked.ok) return checked;
  return {
    ok: true,
    value: {
      argv: [v, resolvedFile, ...checked.args],
    },
  };
}

function runProcess(
  binary: string,
  argv: string[],
  timeoutMs: number,
): Promise<OfficeCliResult> {
  return new Promise((resolvePromise) => {
    const command = [binary, ...argv];
    const child = spawn(binary, argv, {
      shell: false,
      windowsHide: true,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let truncated = false;

    const append = (current: string, chunk: Buffer): string => {
      if (Buffer.byteLength(current) >= OFFICECLI_MAX_OUTPUT_BYTES) {
        truncated = true;
        return current;
      }
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next) > OFFICECLI_MAX_OUTPUT_BYTES) {
        truncated = true;
        return next.slice(0, OFFICECLI_MAX_OUTPUT_BYTES);
      }
      return next;
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({
        ...failure(`failed to start ${binary}: ${err.message}`, command),
        truncated,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolvePromise({
          ok: false,
          exitCode: code,
          stdout,
          stderr,
          truncated,
          error: `timed out after ${timeoutMs}ms`,
          command,
        });
        return;
      }
      resolvePromise({
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
        truncated,
        error: code === 0 ? null : `officecli exited with code ${code}`,
        command,
      });
    });
  });
}

/** Locate the officecli binary, or null when it is not installed. */
export function resolveOfficeCliBinary(): string | null {
  const envOverride = process.env.OFFICECLI_BIN?.trim();
  if (envOverride) {
    return existsSync(envOverride) ? envOverride : null;
  }
  const pathEnv = getEnhancedPath();
  return resolveCommandOnPath("officecli", pathEnv);
}

export interface OfficeCliStatus {
  installed: boolean;
  detectedCommand: string | null;
  allowedRoots: string[];
}

export function officeCliStatus(): OfficeCliStatus {
  const binary = resolveOfficeCliBinary();
  return {
    installed: binary !== null,
    detectedCommand: binary,
    allowedRoots: allowedRoots(),
  };
}

export async function runOfficeCli(
  req: OfficeCliRunRequest,
  opts?: { timeoutMs?: number },
): Promise<OfficeCliResult> {
  const roots = allowedRoots();
  const checked = validateInvocation(req.verb, req.file, req.args ?? [], roots);
  if (!checked.ok) return failure(checked.error);
  const binary = resolveOfficeCliBinary();
  if (!binary) {
    return failure(
      "officecli is not on PATH — install it from https://github.com/iOfficeAI/OfficeCLI or set OFFICECLI_BIN",
    );
  }
  return runProcess(binary, checked.value.argv, opts?.timeoutMs ?? OFFICECLI_TIMEOUT_MS);
}

export async function viewOfficeCli(
  req: OfficeCliViewRequest,
  opts?: { timeoutMs?: number },
): Promise<OfficeCliResult> {
  const mode = req.mode.trim().toLowerCase();
  if (!(OFFICECLI_VIEW_MODES as readonly string[]).includes(mode)) {
    return failure(`view mode not allowed: ${req.mode}`);
  }
  const args = [mode, ...(req.args ?? [])];
  if (req.out) args.push("--out", req.out);
  return runOfficeCli({ verb: "view", file: req.file, args }, opts);
}
