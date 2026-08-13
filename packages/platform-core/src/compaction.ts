// compaction.ts — P5: Auto-compaction.
//
// When context approaches the model's window limit, older entries
// are summarized into a context_summary. The persisted transcript
// is never modified — only the working context.
//
// Inspired by openworker's compaction.py, adapted to TypeScript.
//
// Key functions:
//   shouldCompact() — check if context is near limit (~80%)
//   estimateTokens() — rough token count from text
//   extractWorkingState() — mechanical extraction (todos, files)
//   pickBoundary() — find where to split history
//   compactTurnHistory() — summarize old entries, keep recent

// ── Types ─────────────────────────────────────────────────

/** A single turn in the conversation history. */
export interface TurnEntry {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: number;
}

/** Working state extracted from history (mechanical, no LLM). */
export interface WorkingState {
  pendingTodos: string[];
  activeFiles: string[];
}

/** Result of compacting history. */
export interface CompactionResult {
  compacted: boolean;
  history: TurnEntry[];
  summary?: string;
  workingState?: WorkingState;
}

/** Function that summarizes a span of history (LLM call). */
export type CompactionSummaryFn = (
  entries: TurnEntry[],
) => Promise<string>;

/** Compaction state for tracking across turns. */
export interface CompactionState {
  lastCompactedAt: number;
  entriesCompacted: number;
}

// ── Token estimation ───────────────────────────────────────

/** Rough token estimate: ~4 characters per token. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/** Estimate total tokens for a history array. */
function estimateHistoryTokens(history: TurnEntry[]): number {
  return history.reduce((sum, e) => sum + estimateTokens(e.content), 0);
}

// ── shouldCompact ──────────────────────────────────────────

/** The compaction threshold: 80% of the token budget. */
const COMPACTION_THRESHOLD = 0.8;

/** Check if the history exceeds 80% of the token budget. */
export function shouldCompact(
  history: TurnEntry[],
  budget: number,
): boolean {
  if (history.length <= 1) return false;
  const tokens = estimateHistoryTokens(history);
  return tokens > budget * COMPACTION_THRESHOLD;
}

// ── extractWorkingState ───────────────────────────────────

/** Regex for pending todo items: - [ ] or * [ ] */
const TODO_RE = /[-*]\s+\[\s\]\s+(.+)/g;

/** Regex for file references: path/to/file.ext */
const FILE_RE = /(?:src|test|tests|lib|packages)\/[\w./-]+\.(?:ts|tsx|js|jsx|py|rs|go|java|rb|md)/g;

/** Extract working state (pending todos, active files) from history.
 *  This is mechanical extraction — no LLM call. */
export function extractWorkingState(history: TurnEntry[]): WorkingState {
  const pendingTodos: string[] = [];
  const fileSet = new Set<string>();

  for (const entry of history) {
    // Extract pending todos
    let match: RegExpExecArray | null;
    const todoRe = new RegExp(TODO_RE);
    while ((match = todoRe.exec(entry.content)) !== null) {
      pendingTodos.push(match[1].trim());
    }

    // Extract file references
    const fileRe = new RegExp(FILE_RE);
    while ((match = fileRe.exec(entry.content)) !== null) {
      fileSet.add(match[0]);
    }
  }

  return {
    pendingTodos: [...new Set(pendingTodos)],
    activeFiles: [...fileSet],
  };
}

// ── pickBoundary ──────────────────────────────────────────

/** Find the boundary index where to split history for compaction.
 *  Entries before the boundary will be summarized; entries after
 *  will be kept as-is. Returns 0 when all entries fit. */
export function pickBoundary(
  history: TurnEntry[],
  budget: number,
): number {
  // Walk backwards from the end, accumulating tokens until we
  // exceed the budget. The boundary is where we stop.
  let tokens = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const entryTokens = estimateTokens(history[i].content);
    if (tokens + entryTokens > budget) {
      return i + 1;
    }
    tokens += entryTokens;
  }
  return 0; // All entries fit
}

// ── compactTurnHistory ────────────────────────────────────

/** Compact turn history by summarizing old entries and keeping recent ones.
 *  Never modifies the input array — returns a new array.
 *  When no summarizeFn is provided, performs mechanical compaction only
 *  (drops old entries, keeps working state). */
export async function compactTurnHistory(
  history: TurnEntry[],
  budget: number,
  summarizeFn?: CompactionSummaryFn,
): Promise<CompactionResult> {
  if (!shouldCompact(history, budget)) {
    return { compacted: false, history };
  }

  const boundary = pickBoundary(history, budget);
  if (boundary === 0) {
    return { compacted: false, history };
  }

  const oldEntries = history.slice(0, boundary);
  const recentEntries = history.slice(boundary);
  const workingState = extractWorkingState(history);

  let summary: string | undefined;
  const result: TurnEntry[] = [];

  if (summarizeFn) {
    summary = await summarizeFn(oldEntries);
    // Prepend a summary entry
    result.push({
      role: "assistant",
      content: `[Context Summary]\n${summary}`,
      timestamp: Date.now(),
    });
  }

  // Add working state as a system note
  if (workingState.pendingTodos.length > 0 || workingState.activeFiles.length > 0) {
    const stateParts: string[] = [];
    if (workingState.pendingTodos.length > 0) {
      stateParts.push(
        `Pending: ${workingState.pendingTodos.map((t) => `[ ] ${t}`).join(", ")}`,
      );
    }
    if (workingState.activeFiles.length > 0) {
      stateParts.push(`Files: ${workingState.activeFiles.join(", ")}`);
    }
    result.push({
      role: "assistant",
      content: `[Working State]\n${stateParts.join("\n")}`,
      timestamp: Date.now(),
    });
  }

  // Keep recent entries
  result.push(...recentEntries);

  return {
    compacted: true,
    history: result,
    summary,
    workingState,
  };
}