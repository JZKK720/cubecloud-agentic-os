// Careful (Step 9 of the V2 rollout, ported from gstack's
// `/careful`). Destructive-command guardrails.
//
// This module is a pure pattern-matcher: given a command string,
// it returns a verdict (`safe | warn | block`) and (when
// applicable) the matched pattern, a one-line reason, and a
// safer alternative the agent can suggest. There is no I/O, no
// shell execution, no state — the same input always produces
// the same output, which makes it trivial to test and to wire
// into a pre-tool-use hook in the renderer.
//
// In V2 the verdict is consulted by the terminal panel and the
// plans-dispatch path before a command actually runs:
//   - `safe`   → run without prompting
//   - `warn`   → show a confirm dialog (default = "override")
//   - `block`  → only reachable in V2; never block in V1
//
// The user can always override; careful is a guardrail, not a
// wall. The "Safe exceptions" section is the list of patterns
// we explicitly allow without warning, because the user (or the
// build) does them routinely and the friction would be a tax.

export type CarefulVerdict = "safe" | "warn" | "block";

export interface CarefulResult {
  verdict: CarefulVerdict;
  /** Human-readable reason, present on warn/block. */
  reason?: string;
  /** The pattern that matched, present on warn/block. */
  matchedPattern?: string;
  /** A safer rewrite of the command, present on warn. */
  softerAlternative?: string;
}

interface DestructivePattern {
  /** Short label used in matchedPattern. */
  name: string;
  /** Human-readable reason shown in the confirm dialog. */
  reason: string;
  /** Regex (case-insensitive) tested against the full command. */
  regex: RegExp;
  /** Optional safer alternative. */
  softerAlternative?: string;
  /** Verdict: warn for routine friction, block for catastrophic. */
  severity: Exclude<CarefulVerdict, "safe">;
}

/**
 * The protected list. Order matters only for the "first match
 * wins" semantics: we want the most specific pattern to match,
 * so listing `rm -rf node_modules` exception logic before the
 * generic `rm -rf` rule is important (see `isSafeException`).
 */
const DESTRUCTIVE_PATTERNS: readonly DestructivePattern[] = [
  {
    name: "rm-recursive",
    reason: "Recursive delete can remove large amounts of data at once.",
    regex: /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*[rR])\b/,
    softerAlternative: "Use `rm -i` (interactive) or move the directory to trash.",
    severity: "warn",
  },
  {
    name: "drop-table",
    reason: "DROP TABLE / DROP DATABASE deletes the table and all its rows.",
    regex: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    severity: "warn",
  },
  {
    name: "truncate",
    reason: "TRUNCATE removes all rows from a table; combine with WHERE-style review.",
    regex: /\bTRUNCATE\b/i,
    severity: "warn",
  },
  {
    name: "git-push-force",
    reason: "Force-push rewrites remote history; collaborators can lose commits.",
    regex: /\bgit\s+push\s+.*(-f|--force(?:-with-lease)?)\b/,
    softerAlternative: "Prefer `--force-with-lease` or coordinate with the team first.",
    severity: "warn",
  },
  {
    name: "git-reset-hard",
    reason: "`git reset --hard` discards uncommitted changes irreversibly.",
    regex: /\bgit\s+reset\s+--hard\b/,
    softerAlternative: "Use `git stash` first to keep uncommitted work recoverable.",
    severity: "warn",
  },
  {
    name: "git-checkout-all",
    reason: "`git checkout .` / `git restore .` discards uncommitted changes.",
    regex: /\bgit\s+(checkout|restore)\s+\.\s*$/,
    softerAlternative: "Use `git stash` or restore specific files only.",
    severity: "warn",
  },
  {
    name: "git-clean-fd",
    reason: "`git clean -fd` removes untracked files irreversibly.",
    regex: /\bgit\s+clean\s+-f[dDxX]*\b/,
    softerAlternative: "Run `git clean -nd` first to preview what would be removed.",
    severity: "warn",
  },
  {
    name: "kubectl-delete",
    reason: "`kubectl delete` can remove production workloads.",
    regex: /\bkubectl\s+delete\b/,
    softerAlternative: "Use `--dry-run=server` to preview, or target a namespace.",
    severity: "warn",
  },
  {
    name: "docker-system-prune",
    reason: "`docker system prune -a` removes all stopped containers and images.",
    regex: /\bdocker\s+system\s+prune\b/,
    softerAlternative: "Use `docker container prune` or `docker image prune` for a narrower cleanup.",
    severity: "warn",
  },
  {
    name: "docker-rm-force",
    reason: "`docker rm -f` forcibly removes a running container.",
    regex: /\bdocker\s+rm\s+(-[a-zA-Z]*f|--force)\b/,
    severity: "warn",
  },
  {
    name: "chmod-recursive-root",
    reason: "Recursive chmod on system paths can lock you out of the system.",
    regex: /\bchmod\s+-R\s+[0-7]{3,4}\s+\/\S+/,
    severity: "block",
  },
  {
    name: "mkfs-or-dd-device",
    reason: "`mkfs` or `dd of=/dev/...` writes directly to a disk device.",
    regex: /\b(mkfs(\.[a-z0-9]+)?\s+\/dev\/|dd\s+.*of=\/dev\/)/,
    severity: "block",
  },
  {
    name: "redirect-truncate",
    reason: "A bare `> file` truncates the file to zero bytes.",
    regex: /(?:^|&&|\|\||;|\(|\s)>\s*[\w.\-]+\s*(?:&&|\|\||;|$)/,
    softerAlternative: "Use `>>` to append, or edit in place with a tool that supports undo.",
    severity: "warn",
  },
];

/**
 * The "Safe exceptions" list — these patterns are allowed
 * without warning because they are routine and recoverable. The
 * list is checked BEFORE the destructive patterns.
 *
 * Each entry is a regex that, when matched against the full
 * command, exempts the command from the warn/block verdict.
 */
const SAFE_EXCEPTIONS: readonly RegExp[] = [
  // `rm -rf` against build / cache directories is routine.
  /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*[rR])\s+(node_modules|\.next|\.nuxt|dist|build|out|coverage|\.cache|\.turbo|__pycache__|\.vite|\.parcel-cache|target)(\/|\s|$)/i,
  // `git push` without force is fine.
  /\bgit\s+push\b(?!.*(-f|--force))/i,
  // `git reset` (no `--hard`) is recoverable.
  /\bgit\s+reset\s+--?(soft|mixed)\b/i,
  // `kubectl delete` with a dry-run is a no-op.
  /\bkubectl\s+delete\b.*--dry-run/i,
  // `docker rm <name>` (single, no -f) is targeted.
  /\bdocker\s+rm\s+[a-zA-Z0-9_\-:]+\s*$/,
  // `git clean -fd` immediately followed by a recovery checkout.
  /\bgit\s+clean\s+-f[dx]?\b.*\bgit\s+(checkout|restore)\b/i,
];

/**
 * Check a command for a destructive pattern. Returns a verdict
 * the renderer can act on:
 *
 *   - `safe`   → run the command without prompting
 *   - `warn`   → show a confirm dialog; default to override
 *   - `block`  → refuse by default; user can still override
 *
 * Safe exceptions short-circuit the check.
 */
export function checkCareful(command: string): CarefulResult {
  if (typeof command !== "string" || command.length === 0) {
    return { verdict: "safe" };
  }

  for (const exception of SAFE_EXCEPTIONS) {
    if (exception.test(command)) {
      return { verdict: "safe" };
    }
  }

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (pattern.regex.test(command)) {
      return {
        verdict: pattern.severity,
        reason: pattern.reason,
        matchedPattern: pattern.name,
        softerAlternative: pattern.softerAlternative,
      };
    }
  }

  return { verdict: "safe" };
}

/**
 * Convenience for callers that want a boolean: is this command
 * destructive?
 */
export function isDestructive(command: string): boolean {
  return checkCareful(command).verdict !== "safe";
}

/**
 * For the plans-dispatch path: scan a step body for destructive
 * shell commands. Handles three Markdown shapes:
 *
 *   1. Fenced code blocks:  ```sh … ```
 *   2. Inline code spans:   `rm -rf /var/data`
 *   3. Bare shell-looking lines:  (used when the user pastes a
 *      block of commands without fences)
 *
 * Returns the first destructive line found, or null. The first
 * match wins, with fence-style lines preferred over inline
 * snippets (they're more likely to be runnable as written).
 */
export function findDestructiveCommandInBody(body: string): string | null {
  // 1) Fenced code blocks (highest signal).
  const fence = /```(?:sh|bash|shell|zsh)?\r?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = fence.exec(body)) !== null) {
    const block = match[1] ?? "";
    const hit = scanLinesForDestructive(block);
    if (hit) return hit;
  }
  // 2) Inline code spans (e.g. `rm -rf /var/data`).
  const inline = /`([^`\n]+)`/g;
  while ((match = inline.exec(body)) !== null) {
    const code = (match[1] ?? "").trim();
    if (!code) continue;
    if (isDestructive(code)) return code;
  }
  return null;
}

function scanLinesForDestructive(block: string): string | null {
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (isDestructive(trimmed)) {
      return trimmed;
    }
  }
  return null;
}
