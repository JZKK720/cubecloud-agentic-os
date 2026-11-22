import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSkillFrontmatter } from "../src/main/skills";

// The frontmatter parser is the single point that decides whether a skill
// is catalogable. It previously used the character class `[^"'\n]+` for
// every scalar, which excludes quotes from the middle of a value. 25 of the
// 48 bundled skills embed quoted trigger phrases in their description:
//
//   description: Use when writing code. Triggers: "TDD this", "red-green".
//
// so the match failed and each of those skills came back with an empty
// description — present in the catalog, invisible to the model. "Enable all
// the skills" was therefore not true even after the catalog was wired in.

const SKILLS_DIR = resolve(__dirname, "..", ".agents", "skills");

function skillDirs(): string[] {
  return readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

describe("parseSkillFrontmatter", () => {
  it("reads a plain unquoted scalar", () => {
    const meta = parseSkillFrontmatter(
      "---\nname: plain-skill\ndescription: A short plain description.\n---\n# Body\n",
    );
    expect(meta.name).toBe("plain-skill");
    expect(meta.description).toBe("A short plain description.");
  });

  it("keeps embedded double quotes in a plain scalar", () => {
    // This is the exact shape that broke the old parser.
    const meta = parseSkillFrontmatter(
      '---\nname: quoted\ndescription: Use when coding. Triggers: "be surgical", "simplify first".\n---\n',
    );
    expect(meta.description).toBe(
      'Use when coding. Triggers: "be surgical", "simplify first".',
    );
  });

  /**
   * YAML block scalars. The previous parser returned the indicator itself
   * ("<" + "-") as the description, so those skills were cataloged with no
   * readable text. 23 of the 332 skills in a typical user-global install use
   * this shape, and it is common in upstream skill repos.
   */
  it("reads a folded block scalar (>-) as one line", () => {
    const meta = parseSkillFrontmatter(
      [
        "---",
        "name: folded",
        "description: >-",
        "  Manages datasets and jobs. Use when you need to query,",
        "  or manage resources.",
        "---",
        "# Body",
        "",
      ].join("\n"),
    );
    expect(meta.description).toBe(
      "Manages datasets and jobs. Use when you need to query, or manage resources.",
    );
  });

  it("reads a literal block scalar (|) preserving line breaks", () => {
    const meta = parseSkillFrontmatter(
      ["---", "name: literal", "description: |", "  Line one.", "  Line two.", "---"].join("\n"),
    );
    expect(meta.description).toBe("Line one.\nLine two.");
  });

  it("stops a block scalar at the next top-level key", () => {
    const meta = parseSkillFrontmatter(
      [
        "---",
        "name: bounded",
        "metadata:",
        "  category: Testing",
        "description: >-",
        "  Only this text belongs to the description.",
        "license: MIT",
        "---",
      ].join("\n"),
    );
    expect(meta.description).toBe("Only this text belongs to the description.");
    expect(meta.category).toBe("Testing");
    expect(meta.name).toBe("bounded");
  });

  it("handles a double-quoted scalar with an escaped quote", () => {
    const meta = parseSkillFrontmatter(
      '---\nname: dq\ndescription: "says \\"hi\\" then stops"\n---\n',
    );
    expect(meta.description).toBe('says "hi" then stops');
  });

  it("handles a single-quoted scalar with a doubled quote", () => {
    const meta = parseSkillFrontmatter(
      "---\nname: sq\ndescription: 'it''s fine'\n---\n",
    );
    expect(meta.description).toBe("it's fine");
  });

  it("stops at a YAML comment on a plain scalar", () => {
    const meta = parseSkillFrontmatter(
      "---\nname: commented\ndescription: real value # not this\n---\n",
    );
    expect(meta.description).toBe("real value");
  });

  it("reads category when present and leaves it empty otherwise", () => {
    expect(
      parseSkillFrontmatter("---\nname: a\ncategory: coding\n---\n").category,
    ).toBe("coding");
    expect(parseSkillFrontmatter("---\nname: b\n---\n").category).toBe("");
  });

  it("falls back to the heading and first paragraph without frontmatter", () => {
    const meta = parseSkillFrontmatter("# My Skill\n\nFirst paragraph here.\n");
    expect(meta.name).toBe("My Skill");
    expect(meta.description).toContain("First paragraph here.");
  });

  // The regression that matters: every bundled skill must be catalogable.
  it("gives every bundled skill both a name and a description", () => {
    const unparsed: string[] = [];

    for (const dir of skillDirs()) {
      const content = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf8").slice(
        0,
        4000,
      );
      const meta = parseSkillFrontmatter(content);
      if (!meta.name || !meta.description) {
        unparsed.push(
          `${dir} (name=${JSON.stringify(meta.name)}, description=${JSON.stringify(meta.description)})`,
        );
      }
    }

    expect(unparsed).toEqual([]);
  });
});
