import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  parsePlan,
  savePlan,
  getPlan,
  listPlans,
  deletePlan,
  stepToTaskBody,
  dispatchPlan,
  isValidPlan,
  type Plan,
  type PlanStep,
} from "../src/main/plans";

const HOME = mkdtempSync(join(tmpdir(), "plans-test-"));

vi.mock("../src/main/utils", () => ({
  profileHome: () => HOME,
}));

const SAMPLE_MARKDOWN = `# Sample plan

A short note to test the parser end-to-end.

## Overview
Quick walkthrough of the plan format.

## Set up the project
Owner: alice
We bootstrap a small TypeScript package with vitest.
Skills: typescript-expert

## Add the IPC handler
Depends on: Set up the project
Tags: #backend
We wire up the \`plans-save\` channel.

## Wire the renderer
We add a \`Plans.tsx\` screen to the Layout navigation.
`;

describe("plans (Step 7: orchestrator surface)", () => {
  beforeEach(() => {
    if (existsSync(HOME)) rmSync(HOME, { recursive: true, force: true });
    mkdirSync(HOME, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(HOME)) rmSync(HOME, { recursive: true, force: true });
  });

  it("parses a markdown plan into ordered steps", () => {
    const plan = parsePlan("Sample plan", SAMPLE_MARKDOWN);
    expect(plan.title).toBe("Sample plan");
    // The H1 preamble is deduped against the literal "## Overview"
    // section, so we end up with one Overview + 3 H2 sections.
    expect(plan.steps.length).toBe(4);
    expect(plan.steps[0].id).toBe("s1");
    expect(plan.steps[0].title).toBe("Overview");
    expect(plan.steps[1].title).toBe("Set up the project");
    expect(plan.steps[1].owner).toBe("alice");
    expect(plan.steps[1].skills).toContain("typescript-expert");
    expect(plan.steps[2].dependsOn).toEqual(["Set up the project"]);
    expect(plan.steps[2].tags).toContain("backend");
    expect(plan.dispatchedAt).toBeNull();
    expect(plan.id).toMatch(/^sample-plan-/);
  });

  it("throws a typed error on empty input", () => {
    let captured: unknown = null;
    try {
      parsePlan("Empty", "");
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeTruthy();
    expect((captured as { kind: string }).kind).toBe("invalid");
  });

  it("falls back to the first step title when the title is blank", () => {
    const plan = parsePlan("", "## Set up the project\n\nDetails");
    expect(plan.title).toBe("Set up the project");
  });

  it("extracts every known skill from a step body", () => {
    const md = "## Wire the harness\nUses autonomous-agent-harness and hermes-imports.";
    const plan = parsePlan("harness", md);
    expect(plan.steps[0].skills).toEqual(
      expect.arrayContaining(["autonomous-agent-harness", "hermes-imports"]),
    );
  });

  it("savePlan + getPlan roundtrip preserves every field", () => {
    const plan = parsePlan("Roundtrip", SAMPLE_MARKDOWN);
    const saved = savePlan(plan);
    expect(saved.id).toBe(plan.id);
    const back = getPlan(plan.id);
    expect(back).toEqual(plan);
  });

  it("getPlan throws a not_found PlanError for an unknown id", () => {
    let captured: unknown = null;
    try {
      getPlan("does-not-exist");
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeTruthy();
    expect((captured as { kind: string }).kind).toBe("not_found");
  });

  it("listPlans returns plans sorted by createdAt desc", () => {
    const a = parsePlan("First", SAMPLE_MARKDOWN);
    savePlan(a);
    // Make sure the second plan has a strictly later createdAt.
    const b = parsePlan("Second", SAMPLE_MARKDOWN);
    b.createdAt = new Date(Date.now() + 1000).toISOString();
    savePlan(b);

    const all = listPlans();
    expect(all.length).toBe(2);
    expect(all[0].title).toBe("Second");
    expect(all[1].title).toBe("First");
  });

  it("listPlans returns [] when the plans dir does not exist", () => {
    // No plans ever saved. listPlans must not throw.
    expect(listPlans()).toEqual([]);
  });

  it("deletePlan returns true when the plan existed, false after", () => {
    const plan = parsePlan("Disposable", SAMPLE_MARKDOWN);
    savePlan(plan);
    expect(deletePlan(plan.id)).toBe(true);
    expect(deletePlan(plan.id)).toBe(false);
    expect(listPlans()).toEqual([]);
  });

  it("stepToTaskBody emits the step title, body, and skill/depends metadata", () => {
    const plan = parsePlan("Body shape", SAMPLE_MARKDOWN);
    const step = plan.steps[1]; // "Set up the project"
    const body = stepToTaskBody(plan, step);
    expect(body).toContain("# Set up the project");
    expect(body).toContain("Owner: alice");
    expect(body).toContain("Skills: typescript-expert");
    expect(body).toContain("Step s2");
    expect(body).toContain("## Acceptance");
  });

  it("isValidPlan returns true for a freshly parsed plan and false for a junk object", () => {
    const plan = parsePlan("Valid", SAMPLE_MARKDOWN);
    expect(isValidPlan(plan)).toBe(true);
    expect(isValidPlan(null)).toBe(false);
    expect(isValidPlan({})).toBe(false);
    expect(isValidPlan({ id: "x", title: "x" })).toBe(false);
  });

  it("dispatchPlan calls createTask for every step in order", async () => {
    const plan = parsePlan("Dispatch", SAMPLE_MARKDOWN);
    savePlan(plan);
    const calls: Array<{
      title: string;
      body: string;
      skills: string[];
      maxRetries: number;
    }> = [];
    let nextId = 1;
    const result = await dispatchPlan(plan.id, {
      createTask: async (input) => {
        calls.push(input);
        return `task-${nextId++}`;
      },
    });
    expect(calls.length).toBe(plan.steps.length);
    expect(calls[0].title).toBe("Overview");
    expect(calls[1].title).toBe("Set up the project");
    expect(calls[1].skills).toContain("typescript-expert");
    expect(calls[1].maxRetries).toBe(2);
    expect(result.planId).toBe(plan.id);
    expect(result.stepResults.length).toBe(plan.steps.length);
    expect(result.stepResults[0].taskId).toBe("task-1");
    expect(result.stepResults[1].taskId).toBe("task-2");
    // The plan was updated in place with a dispatchedAt.
    const back = getPlan(plan.id);
    expect(back.dispatchedAt).not.toBeNull();
  });

  it("dispatchPlan continues after a per-step failure and records the error", async () => {
    const plan = parsePlan("Partial", SAMPLE_MARKDOWN);
    savePlan(plan);
    let invocations = 0;
    const result = await dispatchPlan(plan.id, {
      createTask: async () => {
        invocations += 1;
        if (invocations === 2) {
          throw new Error("engine rejected task");
        }
        return `task-${invocations}`;
      },
    });
    expect(invocations).toBe(plan.steps.length);
    expect(result.stepResults[0].taskId).toBe("task-1");
    expect(result.stepResults[0].error).toBeNull();
    expect(result.stepResults[1].taskId).toBeNull();
    expect(result.stepResults[1].error).toBe("engine rejected task");
    expect(result.stepResults[2].taskId).toBe("task-3");
  });

  it("dispatchPlan throws not_found when the plan id is unknown", async () => {
    let captured: unknown = null;
    try {
      await dispatchPlan("no-such-plan", {
        createTask: async () => "ok",
      });
    } catch (err) {
      captured = err;
    }
    expect(captured).toBeTruthy();
    expect((captured as { kind: string }).kind).toBe("not_found");
  });

  it("isValidPlan rejects a plan whose steps array is empty", () => {
    const bad: Plan = {
      id: "x",
      title: "Empty",
      markdown: "",
      steps: [],
      createdAt: new Date().toISOString(),
      dispatchedAt: null,
    };
    expect(isValidPlan(bad)).toBe(false);
  });
});
