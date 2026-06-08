// Autoplan (Step 15 of the V2 rollout, ported from gstack's
// /autoplan + the autoplan recipes pattern).
//
// Two halves:
//
//   1. **Learn on dispatch.** When a plan step is dispatched
//      to the Kanban orchestrator and fails, the failure
//      mode goes into a `learnings.jsonl` entry as a
//      `pitfall` with `confidence: 6`. The learn module
//      handles the storage; this module picks the right
//      skill / type / key / insight for the failure.
//
//   2. **Pre-fill plan-tune briefs.** When a plan is
//      dispatched and any step has the `plan-tune` skill, we
//      walk the step body for unambiguous open questions
//      (the host skill can read them via `extractBriefs`)
//      and surface them as `PlanTuneBriefSeed` payloads
//      the renderer can render with the <QuestionBrief />
//      component. The user answers the briefs in the
//      renderer; the answers are passed back through
//      `applyBriefAnswers` and stitched into the step body
//      before the kanban task is created.
//
// Both halves are pure: the only side effect is reading
// existing step bodies and writing a learning entry on
// failure. Tests cover the parsing, the learning shape,
// and the brief shape.

import { appendLearning, type Learning } from "./learnings";
import { listBundledPacks, type SchemaPack } from "./schemas";
import type { Plan, PlanStep } from "./plans";

// ── Learn on dispatch ──────────────────────────────────────

/** A short, stable key for the failure. We hash the step id +
 *  the first 80 chars of the failure message so the dedup
 *  collapses re-runs of the same bug into one learning. */
export function failureKey(stepId: string, message: string): string {
  const m = message.toLowerCase().slice(0, 80).replace(/[^a-z0-9]+/g, "-");
  return `dispatch-failure-${stepId}-${m}`.replace(/-+$/, "");
}

/** A learning that records a dispatch failure. */
export interface FailureLearning extends Learning {
  type: "pitfall";
  skill: "kanban-dispatch";
  source: "observed";
}

/** Build a failure learning from a step + error. The caller
 *  decides whether to call `appendLearning` (and we leave the
 *  append side effect to the IPC layer, not this pure
 *  function). */
export function buildFailureLearning(
  step: PlanStep,
  error: string,
): FailureLearning {
  const ts = new Date().toISOString();
  const insight = `Step "${step.title}" failed during plan dispatch: ${error.slice(0, 200)}`;
  return {
    ts,
    skill: "kanban-dispatch",
    type: "pitfall",
    key: failureKey(step.id, error),
    insight,
    confidence: 6,
    source: "observed",
    files: step.skills.length > 0 ? step.skills : undefined,
  };
}

/** Convenience: append a failure learning to the profile. */
export function recordDispatchFailure(
  step: PlanStep,
  error: string,
  profile?: string,
): Learning {
  return appendLearning(buildFailureLearning(step, error), profile);
}

// ── Pre-fill plan-tune briefs ──────────────────────────────

/** A single parsed question embedded in a step body. The
 *  step body is markdown; the host skill can drop a fenced
 *  JSON block to declare a question, or write the question
 *  inline as `> **D1 — <title>**` followed by an ELI10
 *  paragraph. This parser handles both shapes. */
export interface InlineQuestion {
  /** Decision id, e.g. "D1", "D2.3". Defaults to "D1" if
   *  the host didn't number it. */
  decisionId: string;
  /** The question title. */
  title: string;
  /** The plain-English body. */
  body: string;
}

const FENCED_JSON = /```json\s*([\s\S]*?)```/g;
const BLOCKQUOTE = /^>\s*\*\*(D\d+(?:\.\d+)?)\s*—\s*(.+?)\*\*\s*$/gm;

/** Pull every inline question out of a step body. Fenced-JSON
 *  blocks are the structured form; blockquote lines starting
 *  with `> **D<N> — ...**` are the prose form. */
export function extractInlineQuestions(body: string): InlineQuestion[] {
  const out: InlineQuestion[] = [];

  // 1) Fenced JSON blocks.
  let m: RegExpExecArray | null;
  const jsonRe = new RegExp(FENCED_JSON.source, "g");
  while ((m = jsonRe.exec(body)) !== null) {
    const inner = m[1]?.trim() ?? "";
    try {
      const parsed = JSON.parse(inner) as {
        decisionId?: unknown;
        title?: unknown;
        body?: unknown;
      };
      if (
        typeof parsed.decisionId === "string" &&
        typeof parsed.title === "string" &&
        typeof parsed.body === "string"
      ) {
        out.push({
          decisionId: parsed.decisionId,
          title: parsed.title,
          body: parsed.body,
        });
      }
    } catch {
      // skip malformed JSON
    }
  }

  // 2) Blockquote questions.
  const quoteRe = new RegExp(BLOCKQUOTE.source, "gm");
  while ((m = quoteRe.exec(body)) !== null) {
    const decisionId = m[1] ?? "D1";
    const title = m[2] ?? "";
    // Pull the ELI10 paragraph that follows the blockquote
    // line — non-empty, non-heading, non-fence lines until
    // the next blank line.
    const tail = body.slice(m.index + m[0].length);
    const tailLines: string[] = [];
    for (const raw of tail.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) {
        if (tailLines.length > 0) break;
        continue;
      }
      if (line.startsWith("#") || line.startsWith("```")) break;
      tailLines.push(line);
    }
    out.push({
      decisionId,
      title,
      body: tailLines.join(" ").trim(),
    });
  }

  return out;
}

/** A canonical question-brief seed ready for the renderer.
 *  We default ELI10 / Stakes / Recommendation to short
 *  placeholders; the host skill can replace them with
 *  richer copy later (or now, by passing overrides). */
export interface PlanTuneBriefSeed {
  decisionId: string;
  title: string;
  eli10: string;
  stakes?: string;
  recommendation: string;
  /** Where in the step body this brief came from. */
  stepId: string;
  /** Offset of the original block in the body (for
   *  `applyBriefAnswers` to splice the answer back in). */
  blockOffset: number;
}

/** Build a brief from an inline question. Returns null when
 *  the question doesn't carry enough structure to render as
 *  a decision brief (e.g. missing title or body). */
export function inlineQuestionToBrief(
  step: PlanStep,
  question: InlineQuestion,
): PlanTuneBriefSeed | null {
  if (!question.title || !question.body) return null;
  const recommendation = `Default: take the path of least surprise. The host skill can override with a specific recommendation; this placeholder keeps the brief renderable.`;
  return {
    decisionId: question.decisionId,
    title: question.title,
    eli10: question.body,
    recommendation,
    stepId: step.id,
    blockOffset: -1,
  };
}

/** Walk a plan and return the briefs every step contributes.
 *  Steps without the `plan-tune` skill are skipped. The
 *  renderer turns each seed into a <QuestionBrief /> and
 *  collects the user's answers. */
export function buildBriefsForPlan(
  plan: Plan,
  pack: SchemaPack = listBundledPacks()[0]!,
): Array<{ step: PlanStep; briefs: PlanTuneBriefSeed[] }> {
  const out: Array<{ step: PlanStep; briefs: PlanTuneBriefSeed[] }> = [];
  for (const step of plan.steps) {
    if (!step.skills.includes("plan-tune")) continue;
    const questions = extractInlineQuestions(step.body);
    if (questions.length === 0) continue;
    const briefs = questions
      .map((q) => inlineQuestionToBrief(step, q))
      .filter((b): b is PlanTuneBriefSeed => b !== null);
    if (briefs.length > 0) {
      out.push({ step, briefs });
    }
  }
  void pack;
  return out;
}

/** Stitch the user's answers back into a step body. The
 *  caller passes the original body and a map of
 *  `decisionId → answer`; the result is a new body with a
 *  `## Answers` section appended. (We append rather than
 *  splice so we never lose the host's original prose.) */
export function applyBriefAnswers(
  body: string,
  answers: Record<string, string>,
): string {
  const ids = Object.keys(answers);
  if (ids.length === 0) return body;
  const lines: string[] = [body.trimEnd(), "", "## Answers", ""];
  for (const id of ids) {
    lines.push(`**${id}**: ${answers[id]}`);
  }
  return lines.join("\n") + "\n";
}
