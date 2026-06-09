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
  "office-hours",
  "careful",
  "investigate",
  "freeze",
  "learn",
  "plan-tune",
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

  it("stamps every gstack skill with source='gstack'", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      expect(
        fm,
        `${expected} frontmatter should declare source='gstack'`,
      ).toMatch(/^\s*source:\s*gstack\s*$/m);
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

  it("every gstack skill has at least one tag in frontmatter", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      const inline = fm.match(/^\s*tags:\s*\[([^\]]+)\]/m);
      const block = fm.match(/^\s*tags:\s*\n((?:\s*-\s*[^\n]+\n)+)/m);
      expect(
        Boolean(inline || block),
        `${expected} has no tags in frontmatter`,
      ).toBe(true);
    }
  });

  it("every gstack skill's frontmatter has source_repo + original_path metadata", () => {
    for (const expected of EXPECTED_GSTACK_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      const fm = content.slice(3, fmEnd);
      expect(
        fm,
        `${expected} should have a source_repo metadata line`,
      ).toMatch(/source_repo:\s*JZKK720\/gstack/);
      expect(
        fm,
        `${expected} should have an original_path metadata line`,
      ).toMatch(new RegExp(`original_path:\\s*${expected}\\/SKILL\\.md`));
    }
  });

  it("office-hours mentions all six forcing questions in the body", () => {
    const dir = getDesktopBundledSkillPath("office-hours");
    expect(dir).toBeTruthy();
    const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
    // Each of the six questions should be present in the body.
    const expectations = [
      "Demand Reality",
      "Status Quo",
      "Desperate Specificity",
      "Narrowest Wedge",
      "Observation",
      "Future-Fit",
    ];
    for (const phrase of expectations) {
      expect(
        content,
        `office-hours should mention "${phrase}"`,
      ).toContain(phrase);
    }
  });

  it("careful has a destructive-pattern table and safe-exceptions list", () => {
    const dir = getDesktopBundledSkillPath("careful");
    expect(dir).toBeTruthy();
    const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
    // The dangerous patterns and the safe exceptions both must be
    // documented, otherwise the skill is incomplete.
    const dangerous = ["rm -rf", "DROP TABLE", "git push --force", "git reset --hard"];
    const safe = ["node_modules", ".next"];
    for (const d of dangerous) {
      expect(content, `careful should mention "${d}"`).toContain(d);
    }
    for (const s of safe) {
      expect(content, `careful should list safe exception "${s}"`).toContain(s);
    }
  });

  it("investigate enforces the Iron Law (no fixes before hypothesis)", () => {
    const dir = getDesktopBundledSkillPath("investigate");
    expect(dir).toBeTruthy();
    const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
    expect(content, "investigate should declare the Iron Law").toContain("Iron Law");
    expect(content, "investigate should mention the 3-fix rule").toContain("3");
  });

  it("plan-tune documents the AskUserQuestion decision-brief format", () => {
    const dir = getDesktopBundledSkillPath("plan-tune");
    expect(dir).toBeTruthy();
    const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
    // The format is the contract; assert the key fields.
    const fields = ["D<N>", "ELI10", "Recommendation", "Completeness", "Net:"];
    for (const f of fields) {
      expect(content, `plan-tune format should mention "${f}"`).toContain(f);
    }
    // The pros/cons markers are part of the format.
    expect(content, "plan-tune format should use the ✅/❌ markers").toContain("✅");
    expect(content, "plan-tune format should use the ✅/❌ markers").toContain("❌");
  });

  it("gstack skills cross-reference each other via related_skills", () => {
    // Hand-picked links that should always hold:
    //   - careful references investigate
    //   - investigate references careful + freeze
    //   - freeze references careful + investigate
    //   - office-hours references plan-tune
    const expectations: Array<[string, string]> = [
      ["careful", "investigate"],
      ["investigate", "careful"],
      ["investigate", "freeze"],
      ["freeze", "careful"],
      ["office-hours", "plan-tune"],
      ["learn", "investigate"],
    ];
    for (const [from, to] of expectations) {
      const dir = getDesktopBundledSkillPath(from);
      expect(dir, `cannot resolve ${from}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      // Reference can be in the related_skills array, a list item,
      // a wikilink, or backticks. Any of these counts.
      const pattern = new RegExp(
        `(- |\\[\\[|"\\(|\\b|\\*\\*)${to}\\b`,
        "m",
      );
      expect(
        pattern.test(content),
        `${from} should reference ${to}`,
      ).toBe(true);
    }
  });
});
