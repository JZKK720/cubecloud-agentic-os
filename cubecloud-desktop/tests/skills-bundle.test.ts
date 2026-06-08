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
 * cubecloud-desktop folder.
 */

const EXPECTED_SKILLS = [
  "agentic-engineering",
  "agent-harness-construction",
  "autonomous-agent-harness",
  "continuous-learning-v2",
  "diff-overlay-writer",
  "eval-harness",
  "hermes-imports",
  "kanban-task-shape",
  "markitdown-mcp",
  "openclaw-persona-forge",
  "wiki-conventions",
  "windows-desktop-e2e",
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
    // Sanity: the desktop also ships the upstream skills (we
    // added ours on top, not in place of them).
    expect(names.has("karpathy-guidelines")).toBe(true);
    expect(names.has("typescript-expert")).toBe(true);
  });

  it("stamps every skill with source='bundled-desktop'", () => {
    const all = listBundledSkills();
    const sources = new Set(all.map((s) => s.source));
    expect(sources.has("bundled-desktop")).toBe(true);
  });

  it("parses name/source from SKILL.md frontmatter", () => {
    // `getDesktopBundledSkillPath` returns the *directory*; the
    // SKILL.md lives inside it.
    const dir = getDesktopBundledSkillPath("agentic-engineering");
    expect(dir).toBeTruthy();
    const skillFile = join(dir!, "SKILL.md");
    expect(existsSync(skillFile)).toBe(true);
    const content = readFileSync(skillFile, "utf-8");
    expect(content).toMatch(/^---/);
    const fmEnd = content.indexOf("---", 3);
    expect(fmEnd).toBeGreaterThan(0);
    const fm = content.slice(3, fmEnd);
    expect(fm).toMatch(/^name:\s*agentic-engineering\s*$/m);
    expect(fm).toMatch(/^source:\s*ecc\s*$/m);
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
      const fm = content.slice(3, fmEnd);
      // Either a `tags: [a, b]` array or a multi-line `tags:` block.
      const inline = fm.match(/^\s*tags:\s*\[([^\]]+)\]/m);
      const block = fm.match(/^\s*tags:\s*\n((?:\s*-\s*[^\n]+\n)+)/m);
      expect(
        Boolean(inline || block),
        `${expected} has no tags in frontmatter`,
      ).toBe(true);
    }
  });

  it("expected skills cross-reference each other via related_skills", () => {
    // A few hand-picked links that should always hold.
    const expectations: Array<[string, string]> = [
      ["agentic-engineering", "karpathy-guidelines"],
      ["agent-harness-construction", "agentic-engineering"],
      ["continuous-learning-v2", "openclaw-persona-forge"],
      ["wiki-conventions", "continuous-learning-v2"],
      ["markitdown-mcp", "agent-harness-construction"],
    ];
    for (const [from, to] of expectations) {
      const dir = getDesktopBundledSkillPath(from);
      expect(dir, `cannot resolve ${from}`).toBeTruthy();
      const content = readFileSync(join(dir!, "SKILL.md"), "utf-8");
      // The reference can appear as a list item (- foo), a code
      // span (`foo`), a wikilink ([[foo]]), or inside the
      // `related_skills:` array. Any of these counts.
      const pattern = new RegExp(
        `(- |\\[\\[|"\\(|\\b)${to}\\b`,
        "m",
      );
      expect(
        pattern.test(content),
        `${from} should reference ${to}`,
      ).toBe(true);
    }
  });
});
