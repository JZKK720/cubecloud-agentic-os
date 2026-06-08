import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, existsSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  applyBriefAnswers,
  buildBriefsForPlan,
  buildFailureLearning,
  extractInlineQuestions,
  failureKey,
  recordDispatchFailure,
} from "../src/main/autoplan";
import { parsePlan } from "../src/main/plans";
import { readLearnings } from "../src/main/learnings";

/**
 * V2 Step 15 — autoplan.
 *
 * Two halves:
 *
 *   1. **Learn on dispatch** — when a step fails, the
 *      failure mode goes into the `learnings.jsonl` log
 *      with a stable dedup key. These tests pin the key
 *      shape, the learning fields, and the append side
 *      effect.
 *
 *   2. **Pre-fill plan-tune briefs** — when a step has the
 *      `plan-tune` skill, we parse its body for inline
 *      questions (fenced JSON or blockquote `> **D<N> — ...**`
 *      lines) and return them as `PlanTuneBriefSeed` shapes
 *      the renderer can render with <QuestionBrief />. The
 *      `applyBriefAnswers` helper stitches the user's answers
 *      back into the body.
 */

const HOME = mkdtempSync(join(tmpdir(), "cubecloud-autoplan-"));

vi.mock("../src/main/utils", () => ({
  profileHome: (profile?: unknown) => {
    if (profile === undefined || profile === "default" || profile === "") {
      return HOME;
    }
    return join(HOME, "profiles", String(profile));
  },
}));

beforeEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
  mkdirSync(HOME, { recursive: true });
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

const sampleStep = {
  id: "s1",
  title: "Wire autoplan",
  body: "Wire the autoplan module end to end.",
  owner: null,
  dependsOn: [],
  skills: ["plan-tune"],
  tags: [],
};

describe("failureKey — stable dedup key", () => {
  it("hashes step id + first 80 chars of the message", () => {
    const k = failureKey("s1", "Connection refused to /var/run/socket");
    expect(k).toMatch(/^dispatch-failure-s1-/);
    expect(k).not.toMatch(/-+$/);
  });

  it("collapses different runs of the same error into one key", () => {
    const a = failureKey("s1", "Connection refused");
    const b = failureKey("s1", "Connection refused");
    expect(a).toBe(b);
  });

  it("strips non-alphanumeric characters from the slug", () => {
    const k = failureKey("s1", "Oh no!! @#$%^&*()");
    expect(k).toMatch(/^dispatch-failure-s1-[a-z0-9-]+$/);
  });
});

describe("buildFailureLearning — shape", () => {
  it("stamps the step title + error in the insight", () => {
    const l = buildFailureLearning(sampleStep, "ECONNREFUSED");
    expect(l.skill).toBe("kanban-dispatch");
    expect(l.type).toBe("pitfall");
    expect(l.source).toBe("observed");
    expect(l.confidence).toBe(6);
    expect(l.insight).toContain("Wire autoplan");
    expect(l.insight).toContain("ECONNREFUSED");
  });

  it("attaches the step's skills as `files` for staleness detection", () => {
    const l = buildFailureLearning(
      { ...sampleStep, skills: ["plan-tune", "kanban-task-shape"] },
      "boom",
    );
    expect(l.files).toEqual(["plan-tune", "kanban-task-shape"]);
  });

  it("omits `files` when the step has no skills", () => {
    const l = buildFailureLearning({ ...sampleStep, skills: [] }, "boom");
    expect(l.files).toBeUndefined();
  });
});

describe("recordDispatchFailure — append side effect", () => {
  it("writes the learning to the profile's learnings.jsonl", () => {
    const written = recordDispatchFailure(sampleStep, "kaboom", "default");
    expect(written.skill).toBe("kanban-dispatch");
    const all = readLearnings("default");
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe(written.key);
  });
});

describe("extractInlineQuestions — fenced JSON", () => {
  it("parses a single ```json block", () => {
    const body = [
      "Some intro prose.",
      "",
      "```json",
      JSON.stringify({
        decisionId: "D1",
        title: "Which data structure?",
        body: "Three options, pick one.",
      }),
      "```",
    ].join("\n");
    const questions = extractInlineQuestions(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].decisionId).toBe("D1");
    expect(questions[0].title).toBe("Which data structure?");
  });

  it("parses multiple ```json blocks", () => {
    const body = [
      "```json",
      JSON.stringify({ decisionId: "D1", title: "T1", body: "B1" }),
      "```",
      "",
      "Some prose in between.",
      "",
      "```json",
      JSON.stringify({ decisionId: "D2", title: "T2", body: "B2" }),
      "```",
    ].join("\n");
    expect(extractInlineQuestions(body)).toHaveLength(2);
  });

  it("skips malformed JSON blocks without throwing", () => {
    const body = [
      "```json",
      "{not valid json",
      "```",
      "",
      "```json",
      JSON.stringify({ decisionId: "D1", title: "T1", body: "B1" }),
      "```",
    ].join("\n");
    const questions = extractInlineQuestions(body);
    expect(questions).toHaveLength(1);
  });
});

describe("extractInlineQuestions — blockquote prose form", () => {
  it("parses a `> **D<N> — title**` line with the following paragraph", () => {
    const body = [
      "> **D1 — Which colour scheme for the renderer?**",
      "",
      "We need a colour scheme that works in both light and dark mode.",
    ].join("\n");
    const questions = extractInlineQuestions(body);
    expect(questions).toHaveLength(1);
    expect(questions[0].decisionId).toBe("D1");
    expect(questions[0].title).toBe(
      "Which colour scheme for the renderer?",
    );
    expect(questions[0].body).toContain("light and dark mode");
  });

  it("stops at the next blank line or heading", () => {
    const body = [
      "> **D1 — First question**",
      "",
      "Body for the first question.",
      "",
      "## A heading that should stop the tail",
      "",
      "> **D2 — Second question**",
      "",
      "Body for the second question.",
    ].join("\n");
    const questions = extractInlineQuestions(body);
    expect(questions).toHaveLength(2);
    expect(questions[1].body).toBe("Body for the second question.");
  });

  it("handles nested decision ids (D2.3)", () => {
    const body = [
      "> **D2.3 — Sub-decision**",
      "",
      "ELI10 paragraph.",
    ].join("\n");
    const questions = extractInlineQuestions(body);
    expect(questions[0].decisionId).toBe("D2.3");
  });
});

describe("buildBriefsForPlan — only plan-tune steps contribute", () => {
  it("returns briefs for steps that include the plan-tune skill", () => {
    const md = [
      "## Step one",
      "",
      "Just regular prose, no questions.",
      "",
      "## Step two (asks the user)",
      "",
      "Skills: plan-tune",
      "",
      "> **D1 — Which way?**",
      "",
      "ELI10 paragraph.",
    ].join("\n");
    const plan = parsePlan("autoplan-demo", md);
    // parsePlan auto-tags plan-tune when the body mentions it.
    const briefs = buildBriefsForPlan(plan);
    // Only the second step has the skill.
    expect(briefs).toHaveLength(1);
    expect(briefs[0].step.id).toBe("s2");
    expect(briefs[0].briefs).toHaveLength(1);
  });

  it("returns an empty array when no step uses plan-tune", () => {
    const md = [
      "## Step one",
      "",
      "Just regular prose.",
    ].join("\n");
    const plan = parsePlan("no-plan-tune", md);
    expect(buildBriefsForPlan(plan)).toEqual([]);
  });
});

describe("applyBriefAnswers — stitch user answers back into the body", () => {
  it("appends a `## Answers` section when there are answers", () => {
    const body = "Some original prose.\n";
    const out = applyBriefAnswers(body, {
      D1: "Pick A — the kanban module is the hot path.",
    });
    expect(out).toContain("Some original prose.");
    expect(out).toContain("## Answers");
    expect(out).toContain("**D1**: Pick A — the kanban module is the hot path.");
  });

  it("returns the body unchanged when there are no answers", () => {
    const body = "Unchanged body.\n";
    expect(applyBriefAnswers(body, {})).toBe(body);
  });

  it("supports multiple decisions in one body", () => {
    const body = "Prose.\n";
    const out = applyBriefAnswers(body, {
      D1: "Answer one.",
      D2: "Answer two.",
    });
    expect(out).toMatch(/\*\*D1\*\*: Answer one\./);
    expect(out).toMatch(/\*\*D2\*\*: Answer two\./);
  });
});
