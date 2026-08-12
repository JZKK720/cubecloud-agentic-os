// tool-policy.ts — P3: Command policy + security posture + tool ledger.
//
// CommandPolicy: regex-based command screening with allow/deny/require_approval.
// SecurityPosture: three-tier model (dangerous/auto/strict) with composition.
// ToolLedger: idempotent tool call caching for retry safety.
//
// Inspired by qm's command-policy.ts, security-posture.ts, and tool ledger,
// adapted to TypeScript for the Cubecloud Agent Desktop.

// ── CommandPolicy ─────────────────────────────────────────

/** The decision a command policy rule makes. */
export type CommandDecision = "allow" | "deny" | "require_approval";

/** A single command policy rule. */
export interface CommandPolicyRule {
  /** Regex pattern to match against the command. */
  pattern: RegExp;
  /** Decision when the pattern matches. */
  decision: CommandDecision;
  /** Human-readable label for the rule. */
  label: string;
}

/** Result of evaluating a command against the policy. */
export interface CommandPolicyResult {
  decision: CommandDecision;
  label: string;
  /** The rule that matched (undefined when no rule matches). */
  matchedRule?: CommandPolicyRule;
}

/** The command policy interface. */
export interface CommandPolicy {
  /** Evaluate a command against all rules. First match wins. */
  evaluate(command: string): CommandPolicyResult;
  /** Add a rule to the policy. */
  addRule(rule: CommandPolicyRule): void;
  /** List all rules. */
  listRules(): readonly CommandPolicyRule[];
}

/** Create a command policy from a list of rules. */
export function createCommandPolicy(
  rules: CommandPolicyRule[] = [],
): CommandPolicy {
  const _rules = [...rules];

  return {
    evaluate(command: string): CommandPolicyResult {
      for (const rule of _rules) {
        if (rule.pattern.test(command)) {
          return {
            decision: rule.decision,
            label: rule.label,
            matchedRule: rule,
          };
        }
      }
      return { decision: "allow", label: "no-match" };
    },
    addRule(rule: CommandPolicyRule) {
      _rules.push(rule);
    },
    listRules() {
      return [..._rules];
    },
  };
}

// ── scannableCommand ───────────────────────────────────────

/** Recursively extract shell payloads from a command string.
 *  Handles command substitution $(...), heredocs, and nested subshells
 *  to prevent obfuscation. Returns a flattened string containing all
 *  embedded commands. */
export function scannableCommand(command: string): string {
  let result = command;

  // Extract $(...) command substitutions
  const subRe = /\$\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = subRe.exec(command)) !== null) {
    result += "\n" + match[1];
    // Recursively scan the extracted command
    result += "\n" + scannableCommand(match[1]);
  }

  // Extract heredoc content (cat <<EOF\n...\nEOF)
  const heredocRe = /<<\s*(\w+)\n([\s\S]*?)\n\1/g;
  while ((match = heredocRe.exec(command)) !== null) {
    result += "\n" + match[2];
  }

  return result;
}

// ── SecurityPosture ────────────────────────────────────────

/** The security posture level. */
export type SecurityPostureLevel = "dangerous" | "auto" | "strict";

/** The security posture for a scope. */
export interface SecurityPosture {
  level: SecurityPostureLevel;
  /** Whether to screen external content before it reaches the model. */
  inboundScreening: boolean;
  /** Which tool calls require human approval. */
  toolApprovals: "none" | "all";
}

/** Severity ordering: dangerous < auto < strict */
const POSTURE_SEVERITY: Record<SecurityPostureLevel, number> = {
  dangerous: 0,
  auto: 1,
  strict: 2,
};

/** Compose two security postures, returning the stricter of the two.
 *  The org floor sets a minimum; scopes can only tighten, never loosen. */
export function composeSecurityPosture(
  orgFloor: SecurityPosture,
  scope: SecurityPosture,
): SecurityPosture {
  const orgSeverity = POSTURE_SEVERITY[orgFloor.level];
  const scopeSeverity = POSTURE_SEVERITY[scope.level];

  if (scopeSeverity >= orgSeverity) {
    return scope;
  }

  // Scope is more permissive — return the org floor
  return orgFloor;
}

// ── ToolLedger ─────────────────────────────────────────────

/** A stored tool call result. */
export interface ToolLedgerEntry {
  success: boolean;
  output: string;
  error?: string;
}

/** The tool ledger interface. */
export interface ToolLedger {
  /** Get a stored result by call id. */
  get(callId: string): ToolLedgerEntry | undefined;
  /** Store a result by call id. */
  set(callId: string, entry: ToolLedgerEntry): void;
  /** Check if a call id has a stored result. */
  has(callId: string): boolean;
  /** Clear all stored results. */
  clear(): void;
  /** Replay a tool call: return cached result if available,
   *  otherwise execute the function and cache the result. */
  replay(
    callId: string,
    fn: () => Promise<ToolLedgerEntry>,
  ): Promise<ToolLedgerEntry>;
}

/** Create a tool ledger for idempotent tool call caching. */
export function createToolLedger(): ToolLedger {
  const _store = new Map<string, ToolLedgerEntry>();

  return {
    get(callId) {
      return _store.get(callId);
    },
    set(callId, entry) {
      _store.set(callId, entry);
    },
    has(callId) {
      return _store.has(callId);
    },
    clear() {
      _store.clear();
    },
    async replay(callId, fn) {
      const cached = _store.get(callId);
      if (cached) {
        return cached;
      }
      const result = await fn();
      _store.set(callId, result);
      return result;
    },
  };
}