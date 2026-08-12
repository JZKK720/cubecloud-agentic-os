// P5: Auto-compaction tests.
//
// Compaction: when context approaches the model's window limit,
// older entries are summarized into a context_summary. The persisted
// transcript is never modified — only the working context.
//
// Inspired by openworker's compaction.py, adapted to TypeScript.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type TurnEntry,
  type CompactionState,
  shouldCompact,
  estimateTokens,
  extractWorkingState,
  pickBoundary,
  compactTurnHistory,
  type CompactionSummaryFn,
} from "../src/compaction";

// ── Helpers ───────────────────────────────────────────────

function makeEntry(
  role: "user" | "assistant" | "tool",
  content: string,
): TurnEntry {
  return { role, content, timestamp: Date.now() };
}

function makeHistory(count: number, wordsPerEntry: number = 50): TurnEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry(
      i % 2 === 0 ? "user" : "assistant",
      `Entry ${i} ` + "word ".repeat(wordsPerEntry),
    ),
  );
}

// ── shouldCompact tests ───────────────────────────────────

describe("shouldCompact", () => {
  it("returns false when token count is well under budget", () => {
    const history = makeHistory(5, 10); // ~50 tokens
    expect(shouldCompact(history, 1000)).toBe(false);
  });

  it("returns true when token count exceeds 80% of budget", () => {
    const history = makeHistory(50, 50); // ~2500 tokens
    expect(shouldCompact(history, 2000)).toBe(true); // 2500 > 1600 (80%)
  });

  it("returns false for empty history", () => {
    expect(shouldCompact([], 1000)).toBe(false);
  });

  it("returns false for single entry", () => {
    expect(shouldCompact([makeEntry("user", "hello")], 1000)).toBe(false);
  });
});

// ── estimateTokens tests ──────────────────────────────────

describe("estimateTokens", () => {
  it("estimates ~4 chars per token", () => {
    const tokens = estimateTokens("hello world this is a test");
    // 26 chars / 4 ≈ 6-7 tokens
    expect(tokens).toBeGreaterThan(5);
    expect(tokens).toBeLessThan(10);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles multi-line content", () => {
    const tokens = estimateTokens("line 1\nline 2\nline 3");
    expect(tokens).toBeGreaterThan(0);
  });

  it("estimates for an array of entries", () => {
    const history = [makeEntry("user", "hello world"), makeEntry("assistant", "hi there")];
    const tokens = estimateTokens(history.map((e) => e.content).join(" "));
    expect(tokens).toBeGreaterThan(0);
  });
});

// ── extractWorkingState tests ─────────────────────────────

describe("extractWorkingState", () => {
  it("extracts pending todos from assistant messages", () => {
    const history: TurnEntry[] = [
      makeEntry("user", "do X and Y"),
      makeEntry("assistant", "I'll do X and Y.\n- [ ] Task X\n- [ ] Task Y"),
      makeEntry("user", "ok"),
      makeEntry("assistant", "Done with X.\n- [x] Task X\n- [ ] Task Y"),
    ];
    const state = extractWorkingState(history);
    expect(state.pendingTodos).toBeDefined();
    expect(state.pendingTodos!.length).toBeGreaterThanOrEqual(1);
  });

  it("extracts active file references", () => {
    const history: TurnEntry[] = [
      makeEntry("assistant", "I'm editing src/main.ts and src/config.ts"),
    ];
    const state = extractWorkingState(history);
    expect(state.activeFiles).toBeDefined();
    expect(state.activeFiles!.length).toBeGreaterThanOrEqual(1);
  });

  it("returns empty state for empty history", () => {
    const state = extractWorkingState([]);
    expect(state.pendingTodos).toEqual([]);
    expect(state.activeFiles).toEqual([]);
  });
});

// ── pickBoundary tests ─────────────────────────────────────

describe("pickBoundary", () => {
  it("picks a boundary that keeps recent entries", () => {
    const history = makeHistory(20, 20);
    const boundary = pickBoundary(history, 500);
    // Boundary should be somewhere in the middle
    expect(boundary).toBeGreaterThan(0);
    expect(boundary).toBeLessThan(20);
  });

  it("returns 0 when all entries fit in budget", () => {
    const history = makeHistory(3, 5);
    const boundary = pickBoundary(history, 10000);
    expect(boundary).toBe(0);
  });

  it("returns history.length when nothing fits", () => {
    const history = makeHistory(10, 100);
    const boundary = pickBoundary(history, 10);
    expect(boundary).toBe(history.length);
  });
});

// ── compactTurnHistory tests ───────────────────────────────

describe("compactTurnHistory", () => {
  it("returns history unchanged when no compaction needed", async () => {
    const history = makeHistory(3, 5);
    const result = await compactTurnHistory(history, 10000);
    expect(result.compacted).toBe(false);
    expect(result.history).toBe(history);
  });

  it("compacts when token count exceeds budget", async () => {
    const history = makeHistory(30, 50);
    const summarizeFn: CompactionSummaryFn = vi.fn().mockResolvedValue(
      "Summary of earlier conversation: user asked about X, assistant did Y.",
    );
    const result = await compactTurnHistory(history, 500, summarizeFn);
    expect(result.compacted).toBe(true);
    expect(result.history.length).toBeLessThan(history.length);
    expect(result.summary).toBeDefined();
    expect(summarizeFn).toHaveBeenCalledOnce();
  });

  it("preserves recent entries after compaction", async () => {
    const history = makeHistory(20, 30);
    const lastEntry = history[history.length - 1];
    const summarizeFn: CompactionSummaryFn = vi.fn().mockResolvedValue("summary");
    const result = await compactTurnHistory(history, 300, summarizeFn);
    // The last entry should be preserved
    const lastInResult = result.history[result.history.length - 1];
    expect(lastInResult.content).toBe(lastEntry.content);
  });

  it("includes working state in the compacted result", async () => {
    const history: TurnEntry[] = [
      makeEntry("assistant", "- [ ] Pending task"),
      ...makeHistory(20, 30),
    ];
    const summarizeFn: CompactionSummaryFn = vi.fn().mockResolvedValue("summary");
    const result = await compactTurnHistory(history, 300, summarizeFn);
    expect(result.workingState).toBeDefined();
  });

  it("works without a summarizeFn (mechanical compaction only)", async () => {
    const history = makeHistory(30, 50);
    const result = await compactTurnHistory(history, 500);
    expect(result.compacted).toBe(true);
    expect(result.history.length).toBeLessThan(history.length);
    // No summary when no summarizeFn
    expect(result.summary).toBeUndefined();
  });
});