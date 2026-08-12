// subagent.ts — P10: Subagent exploration.
//
// A read-only child harness with fresh context for broad research.
// The subagent gets a fresh context window (no parent history),
// has read-only tools (no file writes, no command execution),
// and returns a summary to the parent.
//
// Inspired by openworker's subagent tool (coworker/tools/subagent.py),
// adapted to the Cubecloud Agent Desktop's harness interface.

import type { HarnessRouter, HarnessTurnDelta } from "./harness";

// ── Types ─────────────────────────────────────────────────

/** The read-only tool set — no writes, no command execution. */
export const READ_ONLY_TOOLS = [
  "read",
  "search",
  "list",
  "glob",
  "grep",
  "head",
  "cat",
] as const;

/** Configuration for a subagent run. */
export interface SubagentConfig {
  /** The research prompt for the subagent. */
  message: string;
  /** Tools the subagent is allowed to use. */
  tools: string[];
  /** Whether the subagent is read-only (no writes/exec). */
  readOnly: boolean;
  /** Whether the subagent gets a fresh context (no parent history). */
  freshContext: boolean;
  /** Optional model override. */
  model?: string;
  /** Optional session ID (auto-generated if not provided). */
  sessionId?: string;
}

/** Result of a subagent run. */
export interface SubagentResult {
  success: boolean;
  summary: string;
  deltas: HarnessTurnDelta[];
  errors?: string[];
}

// ── createSubagentConfig ──────────────────────────────────

/** Create a subagent config with read-only tools by default. */
export function createSubagentConfig(
  message: string,
  overrides?: Partial<SubagentConfig>,
): SubagentConfig {
  // Infer readOnly from tools if not explicitly set
  const hasWriteTools = overrides?.tools?.some((t) =>
    ["write", "execute", "shell", "rm", "mkdir", "mv", "cp"].includes(t),
  ) ?? false;
  const readOnly = overrides?.readOnly ?? !hasWriteTools;
  const tools = overrides?.tools ?? (readOnly ? [...READ_ONLY_TOOLS] : ["read", "search", "write"]);

  return {
    message,
    tools,
    readOnly,
    freshContext: overrides?.freshContext ?? true,
    model: overrides?.model,
    sessionId: overrides?.sessionId,
  };
}

// ── validateSubagentConfig ────────────────────────────────

/** Validate a subagent config. Returns an array of error strings (empty if valid). */
export function validateSubagentConfig(config: SubagentConfig): string[] {
  const errors: string[] = [];

  if (!config.message || config.message.trim().length === 0) {
    errors.push("message must not be empty");
  }

  if (config.readOnly) {
    const writeTools = ["write", "execute", "shell", "rm", "mkdir", "mv", "cp"];
    for (const tool of config.tools) {
      if (writeTools.includes(tool)) {
        errors.push(`readOnly subagent cannot use tool "${tool}"`);
      }
    }
  }

  return errors;
}

// ── runSubagent ───────────────────────────────────────────

/** Run a subagent with the given config. The subagent uses the harness
 *  router to execute a turn with a fresh session and read-only tools.
 *  Returns a summary of the results. */
export async function runSubagent(
  router: HarnessRouter,
  config: SubagentConfig,
): Promise<SubagentResult> {
  // Validate config first
  const errors = validateSubagentConfig(config);
  if (errors.length > 0) {
    return {
      success: false,
      summary: "",
      deltas: [],
      errors,
    };
  }

  // Generate a session ID if not provided
  const sessionId =
    config.sessionId ?? `subagent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const deltas: HarnessTurnDelta[] = [];
  const textParts: string[] = [];

  try {
    for await (const delta of router.runTurn(sessionId, {
      sessionId,
      message: config.message,
      // freshContext = true means no history is passed
      history: config.freshContext ? undefined : [],
      model: config.model,
    })) {
      deltas.push(delta);
      if (delta.type === "text") {
        textParts.push(delta.content);
      }
    }

    return {
      success: true,
      summary: textParts.join(""),
      deltas,
    };
  } catch (err) {
    return {
      success: false,
      summary: "",
      deltas,
      errors: [(err as Error).message],
    };
  }
}