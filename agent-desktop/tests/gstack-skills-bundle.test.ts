import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import {
  listBundledSkills,
  getDesktopBundledSkillPath,
} from "../src/main/skills";

/**
 * End-to-end smoke test for the gstack-flavoured skills added
 * in the V2 harvest rollout (Step 8). Mirrors the shape of
 * skills-bundle.test.ts so each new skill has the same
 * frontmatter + content guarantees.
 *
 *  - office-hours  — YC-style product diagnostic
 *  - careful       — destructive-command guardrails
 *  - investigate   — root-cause debugging methodology
 *  - freeze        — edit-lock for a directory
 *  - learn         — per-project learnings.jsonl manager
 *  - plan-tune     — decision-brief question format reference
 */

const EXPECTED_GSTACK_SKILLS = [
  "gstack-investigate",
  "gstack-qa",
  "gstack-retro",
  "gstack-plan-ceo-review",
  "gstack-plan-eng-review",
  "gstack-plan-design-review",
];

const SCRATCH = mkdtempSync(join(tmpdir(), "gstack-skills-bundle-test-"));

describe("gstack skill bundle (V2 Step 8)", () => {
  beforeAll(() => {
    if (!existsSync(SCRATCH)) {
      mkdirSync(SCRATCH, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(SCRATCH)) {
      rmSync(SCRATCH, { recursive: true, force: true });
    }
  });

  it("ships every gstack skill under .agents/skills/", () => {
    const all = listBundledSkills();
    const names = new Set(all.map((s) => s.name));
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      expect(
        names.has(expected),
        `missing gstack skill: ${expected}`,
      ).toBe(true);
    }
  });

  it("stamps every gstack skill with source pointing at JZKK720/gstack", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      expect(
        fm,
        `${expected} frontmatter should reference JZKK720/gstack`,
      ).toMatch(/JZKK720\/gstack/);
    }
  });

  it("every gstack skill has a non-empty description in its SKILL.md", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      const descMatch = fm.match(
        /description:\s*([^\n]+(?:\n[ \t]+[^\n]+)*)/,
      );
      expect(
        descMatch,
        `${expected} has no description in frontmatter`,
      ).toBeTruthy();
      expect(
        descMatch![1].trim().length,
        `${expected} description is empty`,
      ).toBeGreaterThan(20);
    }
  });

  it("every gstack skill has a non-empty description in its SKILL.md", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      const descMatch = fm.match(
        /description:\s*([^\n]+(?:\n[ \t]+[^\n]+)*)/,
      );
      expect(
        descMatch,
        `${expected} has no description in frontmatter`,
      ).toBeTruthy();
      expect(
        descMatch![1].trim().length,
        `${expected} description is empty`,
      ).toBeGreaterThan(20);
    }
  });

  it("gstack-investigate references gstack-qa", () => {
    const dir = getDesktopBundledSkillPath("gstack-investigate");
    expect(dir).toBeTruthy();
    const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
    expect(content).toContain("gstack-qa");
  });
});
