// V2.2 /retro (ported from gstack's /retro skill).
//
// "Close the loop": after a session ends, /retro inspects the
// recent activity log (chat messages, tool calls, kanban
// dispatches, review activity) and proposes a small batch of
// durable learnings (1-5 entries) that capture patterns,
// pitfalls, preferences, or architecture decisions observed
// during the run.
//
// The flow is intentionally human-in-the-loop:
//   1. `summarizeRetro` returns a `RetroReport` with
//      `proposed: RetroLearning[]`. No disk writes.
//   2. The renderer shows the report; the user picks which
//      proposals to keep (all / some / none) and may edit
//      each one before commit.
//   3. `commitRetro` takes the kept proposals and writes
//      them to `learnings.jsonl` via `appendLearning` with
//      `source: "inferred"` and `skill: "retro"`.
//
// We keep the heuristics conservative: rather than scanning
// every session, we look at the N most recent ones (default 5)
// and only surface proposals when the same tool was used >=
// MIN_OCCURRENCES times or when an error/fix pattern repeats.
// This keeps `/retro` cheap and avoids flooding the
// learnings log with one-off observations.

import { appendLearning, readLearnings, type Learning, type LearningSource, type LearningType } from "./learnings";
import { listSessions, getSessionMessages, type SessionSummary } from "./sessions";
import { exportLearningsAsMarkdown } from "./learnings";

/** Default number of recent sessions to consider. */
const DEFAULT_LOOKBACK = 5;

/** A tool must appear this many times to count as a "pattern"
 *  worth surfacing.  Below this we ignore it as a one-off. */
const MIN_OCCURRENCES = 3;

/** Max proposals per retro. Caps the cognitive load on the
 *  user. */
const MAX_PROPOSALS = 5;

export interface RetroLearning {
  type: LearningType;
  key: string;
  insight: string;
  confidence: number;
  source: LearningSource;
  /** Short evidence string explaining why we proposed this
   *  (e.g. "tool read_file used 12 times across 3 sessions"). */
  evidence: string;
}

export interface RetroReport {
  /** ISO 8601 timestamp the report was generated. */
  generatedAt: string;
  /** Number of recent sessions that were scanned. */
  sessionCount: number;
  /** Per-session summary the user can review alongside the
   *  proposals. */
  sessionSummaries: Array<{
    sessionId: string;
    title: string | null;
    startedAt: number;
    messageCount: number;
  }>;
  /** Proposed learnings.  Empty array means "nothing worth
   *  recording". */
  proposed: RetroLearning[];
}

/** A more focused report that the renderer can show alongside
 *  the user's pending tasks (kanban) at retro time. */
export interface RetroContext {
  report: RetroReport;
  /** Existing top learnings (deduped, top 5 by recency) so
   *  the user can see what we'd be adding to. */
  existingTop: Array<{ key: string; insight: string; type: string }>;
  /** Markdown rendering of the proposed + existing report,
   *  ready to paste into a PR description. */
  markdown: string;
}

/** Detect repeated tool-call patterns and user corrections
 *  across the given sessions. The current heuristic is:
 *  - Tool call counts: tools called >= MIN_OCCURRENCES times
 *    become a "pattern" with key `<tool>-recurrent`.
 *  - User corrections: a user message that includes the
 *    word "don't" or "instead" following an assistant tool
 *    call becomes a "preference" with key
 *    `<tool>-user-pref` and the user's correction text as
 *    the insight.
 *
 *  This is intentionally lightweight — sophisticated
 *  summarisation is the agent's job, not ours.  We just
 *  surface the high-signal candidates.
 */
function detectProposals(sessions: SessionSummary[]): {
  proposed: RetroLearning[];
  sessionSummaries: RetroReport["sessionSummaries"];
} {
  const toolCounts = new Map<string, number>();
  const corrections: Array<{ tool: string; text: string }> = [];
  const sessionSummaries: RetroReport["sessionSummaries"] = [];

  for (const session of sessions) {
    sessionSummaries.push({
      sessionId: session.id,
      title: session.title,
      startedAt: session.startedAt,
      messageCount: session.messageCount,
    });
    const messages = getSessionMessages(session.id);
    // Count tool calls
    const recentTools: string[] = [];
    for (const m of messages) {
      if (m.kind === "tool_call") {
        toolCounts.set(m.name, (toolCounts.get(m.name) ?? 0) + 1);
        recentTools.push(m.name);
      } else if (m.kind === "user" && recentTools.length > 0) {
        const t = m.content.trim().toLowerCase();
        if (
          t.startsWith("don't") ||
          t.startsWith("do not") ||
          t.includes("instead of") ||
          t.includes("rather than")
        ) {
          corrections.push({
            tool: recentTools[recentTools.length - 1],
            text: m.content.trim().slice(0, 200),
          });
        }
      }
    }
  }

  const proposed: RetroLearning[] = [];

  // High-frequency tools become pattern proposals.
  for (const [tool, count] of [...toolCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )) {
    if (count < MIN_OCCURRENCES) continue;
    proposed.push({
      type: "pattern",
      key: `${tool}-recurrent`,
      insight: `Tool \`${tool}\` is heavily used (${count} calls across ${sessions.length} recent sessions) — keep its arguments and outputs discoverable for new sessions.`,
      confidence: 6,
      source: "inferred",
      evidence: `\`${tool}\` called ${count} times across ${sessions.length} sessions`,
    });
    if (proposed.length >= MAX_PROPOSALS) break;
  }

  // User corrections become preference proposals.
  for (const c of corrections) {
    proposed.push({
      type: "preference",
      key: `${c.tool}-user-correction`,
      insight: c.text,
      confidence: 8,
      source: "user-stated",
      evidence: `User correction following \`${c.tool}\` call`,
    });
    if (proposed.length >= MAX_PROPOSALS) break;
  }

  return { proposed, sessionSummaries };
}

/** Generate a retro report for the N most recent sessions.
 *  Pure read; no disk writes.
 *  The `profile` argument is reserved for future per-profile
 *  filtering of sessions; today all profiles share the same
 *  state.db. */
export function summarizeRetro(
  _profile?: string,
  lookback: number = DEFAULT_LOOKBACK,
): RetroReport {
  const sessions = listSessions(lookback, 0);
  const generatedAt = new Date().toISOString();
  if (sessions.length === 0) {
    return {
      generatedAt,
      sessionCount: 0,
      sessionSummaries: [],
      proposed: [],
    };
  }
  const { proposed, sessionSummaries } = detectProposals(sessions);
  return {
    generatedAt,
    sessionCount: sessions.length,
    sessionSummaries,
    proposed,
  };
}

/** Generate a retro report plus a markdown rendering that
 *  combines the proposals with the existing top learnings.
 *  The renderer can use this directly to show a "what to
 *  add" preview before commit. */
export function buildRetroContext(
  profile?: string,
  lookback: number = DEFAULT_LOOKBACK,
): RetroContext {
  const report = summarizeRetro(profile, lookback);
  const existing = readLearnings(profile);
  // Dedupe by (type,key) to find the most recent 5
  const seen = new Map<string, { key: string; insight: string; type: string; ts: string }>();
  for (const l of [...existing].sort((a, b) => (a.ts < b.ts ? 1 : -1))) {
    const k = `${l.type}::${l.key}`;
    if (!seen.has(k)) {
      seen.set(k, { key: l.key, insight: l.insight, type: l.type, ts: l.ts });
    }
    if (seen.size >= 5) break;
  }
  const existingTop = [...seen.values()].map((e) => ({
    key: e.key,
    insight: e.insight,
    type: e.type,
  }));
  const markdown = renderRetroMarkdown(report, existingTop);
  return { report, existingTop, markdown };
}

/** Render a retro report as markdown, suitable for pasting
 *  into a PR description or commit body. */
export function renderRetroMarkdown(
  report: RetroReport,
  existingTop: Array<{ key: string; insight: string; type: string }>,
): string {
  const lines: string[] = ["# Retro Report", ""];
  lines.push(`Generated ${report.generatedAt}.`);
  lines.push(
    `Scanned ${report.sessionCount} recent session${report.sessionCount === 1 ? "" : "s"}.`,
  );
  lines.push("");
  if (report.sessionSummaries.length > 0) {
    lines.push("## Sessions");
    lines.push("");
    for (const s of report.sessionSummaries) {
      const title = s.title ?? "(untitled)";
      const when = new Date(s.startedAt).toISOString().slice(0, 10);
      lines.push(
        `- \`${s.sessionId.slice(0, 8)}\` ${title} — ${s.messageCount} messages on ${when}`,
      );
    }
    lines.push("");
  }
  if (report.proposed.length > 0) {
    lines.push("## Proposed learnings");
    lines.push("");
    for (const p of report.proposed) {
      lines.push(
        `- **${p.type} / \`${p.key}\`** (confidence ${p.confidence}/10, source ${p.source})`,
      );
      lines.push(`  ${p.insight}`);
      lines.push(`  _Evidence: ${p.evidence}_`);
    }
    lines.push("");
  } else {
    lines.push("## No proposed learnings");
    lines.push("");
    lines.push("Nothing stood out across the scanned sessions.");
    lines.push("");
  }
  if (existingTop.length > 0) {
    lines.push("## Already in your learnings log");
    lines.push("");
    for (const e of existingTop) {
      lines.push(`- **${e.type} / \`${e.key}\`** — ${e.insight}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Commit a batch of proposals to the learnings log. The
 *  caller is expected to show the user the proposals and
 *  pass back only the ones they want to keep. Each kept
 *  proposal is appended via `appendLearning` with `skill:
 *  "retro"`. Returns the array of committed entries (in
 *  the order they were committed). */
export function commitRetro(
  proposals: RetroLearning[],
  profile?: string,
): Learning[] {
  const out: Learning[] = [];
  for (const p of proposals) {
    const learning = appendLearning(
      {
        skill: "retro",
        type: p.type,
        key: p.key,
        insight: p.insight,
        confidence: p.confidence,
        source: p.source,
      },
      profile,
    );
    out.push(learning);
  }
  return out;
}

/** Convenience: produce a markdown export of the current
 *  learnings log. Used by the renderer's "Export retro
 *  report" button. */
export function exportRetroMarkdown(profile?: string): string {
  return exportLearningsAsMarkdown(readLearnings(profile));
}
