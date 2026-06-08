import { describe, expect, it } from "vitest";
import { parsePlan } from "../src/main/plans";

/**
 * V2 harvest rollout: KNOWN_SKILLS in plans.ts now also
 * surfaces the gstack-flavoured skills so a plan body that
 * references, e.g., "office-hours" gets tagged with it
 * automatically.
 */

const GSTACK_SKILLS = [
  "office-hours",
  "careful",
  "investigate",
  "freeze",
  "learn",
  "plan-tune",
];

describe("plans parser — KNOWN_SKILLS includes V2 gstack skills", () => {
  for (const skill of GSTACK_SKILLS) {
    it(`surfaces "${skill}" in a step's skills array when the body mentions it`, () => {
      const md = `## Wire the ${skill} workflow\n\nWe use the \`${skill}\` skill to handle the design step.`;
      const plan = parsePlan(`${skill} test`, md);
      expect(plan.steps.length).toBe(1);
      expect(plan.steps[0].skills).toContain(skill);
    });
  }

  it("still surfaces legacy skills after the V2 additions", () => {
    const md = "## Refresh\n\nThe kanban-task-shape and electron-pro skills apply.";
    const plan = parsePlan("legacy", md);
    expect(plan.steps[0].skills).toContain("kanban-task-shape");
    expect(plan.steps[0].skills).toContain("electron-pro");
  });

  it("surfaces gstack + legacy skills in the same step when both are mentioned", () => {
    const md = "## Refactor\n\nUse office-hours for product framing, electron-pro for the renderer, investigate to track down the bug.";
    const plan = parsePlan("mix", md);
    const skills = plan.steps[0].skills;
    expect(skills).toContain("office-hours");
    expect(skills).toContain("electron-pro");
    expect(skills).toContain("investigate");
  });
});
