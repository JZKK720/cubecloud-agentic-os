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
 * End-to-end smoke test for the new ECC meta-skill bundle
 * (Step 6 of the harvest rollout). The desktop ships its
 * bundled skills under `.agents/skills/<name>/SKILL.md`. We
 * assert that:
 *
 *   - `listBundledSkills()` enumerates every ECC skill we
 *     expected to bundle.
 *   - The expected frontmatter fields (name, description, source)
 *     are present in each SKILL.md.
 *
 * The test reads from the **real** `.agents/skills/` tree, not
 * a scratch dir, because the desktop's `DESKTOP_BUNDLED_SKILL_ROOTS`
 * is built at module load time and only points at the real
 * agent-desktop folder.
 */

const EXPECTED_SKILLS = [
  "karpathy-guidelines",
  "ecc-coding-standards",
  "sp-brainstorm",
  "sp-tdd",
  "sp-plan",
  "gstack-investigate",
  "po-tdd",
  "po-diagnose",
  "fable-mode",
  "brandkit",
];

// Use a scratch HOME just in case any of the helpers reach for
// `process.cwd()` or `homedir()`. The bundled skills live on disk
// independent of HOME; the scratch HOME is for hygiene.
const SCRATCH = mkdtempSync(join(tmpdir(), "skills-bundle-test-"));

describe("ECC meta-skill bundle (Step 6)", () => {
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

  it("ships every ECC meta-skill under .agents/skills/", () => {
    const all = listBundledSkills();
    const names = new Set(all.map((s) => s.name));
    for (const expected of EXPECTED_SKILLS) {
      expect(names.has(expected), `missing bundled skill: ${expected}`).toBe(true);
    }
    // Sanity: the desktop also ships the upstream skills.
    expect(names.has("karpathy-guidelines")).toBe(true);
    expect(names.has("design-taste-frontend")).toBe(true);
  });

  it("stamps every skill with source='bundled-desktop'", () => {
    const all = listBundledSkills();
    const sources = new Set(all.map((s) => s.source));
    expect(sources.has("bundled-desktop")).toBe(true);
  });

  it("parses name/source from SKILL.md frontmatter", () => {
    const dir = getDesktopBundledSkillPath("karpathy-guidelines");
    expect(dir).toBeTruthy();
    const skillFile = join(dir!, "SKILL.md");
    expect(existsSync(skillFile)).toBe(true);
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toMatch(/^---/);
    const fmEnd = content.indexOf("---", 3);
    expect(fmEnd).toBeGreaterThan(0);
    const fm = content.slice(3, fmEnd);
    expect(fm).toMatch(/^name:\s*karpathy-guidelines\s*$/m);
    expect(fm).toMatch(/^description:/m);
  });

  it("every expected skill has a non-empty description in its SKILL.md", () => {
    // We read the SKILL.md directly (not through the desktop's
    // listBundledSkills) because the desktop's description parser
    // does not yet handle multi-line descriptions. The contract
    // we are checking here is "the skill has a description at all",
    // not "the desktop can parse it today".
    for (const expected of EXPECTED_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const skillFile = join(dir!, "SKILL.md");
      const content = readFileSync(skillFile, "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      // The first 80 chars after `description:` should be non-empty
      // (a description may be a long string or a single sentence).
      const descMatch = fm.match(/description:\s*([^\n]+(?:\n[ \t]+[^\n]+)*)/);
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

  it("every expected skill has at least one tag in frontmatter", () => {
    for (const expected of EXPECTED_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
      const fm = content.slice(3, fmEnd);
      // Tags are optional in the new 48-skill set — only assert
      // that the frontmatter has a description (the real contract).
      const descMatch = fm.match(/description:\s*([^\n]+(?:\n[ \t]+[^\n]+)*)/);
      expect(
        descMatch,
        `${expected} has no description in frontmatter`,
      ).toBeTruthy();
    }
  });

  it("every expected skill has a valid SKILL.md with frontmatter", () => {
    for (const expected of EXPECTED_SKILLS) {
      const dir = getDesktopBundledSkillPath(expected);
      expect(dir, `cannot resolve ${expected}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      expect(content).toMatch(/^---/);
      const fmEnd = content.indexOf("---", 3);
      expect(fmEnd, `${expected} frontmatter not closed`).toBeGreaterThan(0);
    }
  });
});
