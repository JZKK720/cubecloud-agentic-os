// P7: Skills-bundle-kit integration tests.
//
// The kit installs skills flat (~/.agents/skills/<name>/SKILL.md).
// The desktop's listInstalledSkills() expects categorized
// (~/.agents/skills/<category>/<name>/SKILL.md).
// This module handles both layouts.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifySkillLayout,
  normalizeSkillPath,
  type DiscoveredSkill,
  discoverSkillsFromDir,
} from "../src/main/skills-discovery";

// ── classifySkillLayout tests ─────────────────────────────

describe("classifySkillLayout", () => {
  it("returns 'categorized' when the path has a category subfolder", () => {
    const layout = classifySkillLayout("/home/.agents/skills/methodology/tdd/SKILL.md");
    expect(layout).toBe("categorized");
  });

  it("returns 'flat' when the path is directly under skills/", () => {
    const layout = classifySkillLayout("/home/.agents/skills/tdd/SKILL.md");
    expect(layout).toBe("flat");
  });

  it("returns 'flat' for paths without SKILL.md", () => {
    const layout = classifySkillLayout("/home/.agents/skills/tdd");
    expect(layout).toBe("flat");
  });
});

// ── normalizeSkillPath tests ──────────────────────────────

describe("normalizeSkillPath", () => {
  it("extracts category and name from categorized layout", () => {
    const result = normalizeSkillPath("/home/.agents/skills/methodology/tdd/SKILL.md");
    expect(result.category).toBe("methodology");
    expect(result.name).toBe("tdd");
  });

  it("extracts name from flat layout (category = 'uncategorized')", () => {
    const result = normalizeSkillPath("/home/.agents/skills/tdd/SKILL.md");
    expect(result.category).toBe("uncategorized");
    expect(result.name).toBe("tdd");
  });

  it("handles Windows-style paths", () => {
    const result = normalizeSkillPath("C:\\Users\\dev\\.agents\\skills\\tdd\\SKILL.md");
    expect(result.name).toBe("tdd");
    expect(result.category).toBe("uncategorized");
  });
});

// ── discoverSkillsFromDir tests ───────────────────────────

describe("discoverSkillsFromDir", () => {
  // We test the pure logic — the actual filesystem scan is mocked.
  // The function takes a list of SKILL.md paths and returns
  // DiscoveredSkill[] with normalized category/name.

  it("discovers skills from a mix of flat and categorized paths", () => {
    const paths = [
      "/home/.agents/skills/methodology/tdd/SKILL.md",
      "/home/.agents/skills/debugging/SKILL.md",
      "/home/.agents/skills/design/taste-skill/SKILL.md",
    ];
    const skills = discoverSkillsFromDir(paths);
    expect(skills).toHaveLength(3);
    expect(skills[0].category).toBe("methodology");
    expect(skills[0].name).toBe("tdd");
    expect(skills[1].category).toBe("uncategorized");
    expect(skills[1].name).toBe("debugging");
    expect(skills[2].category).toBe("design");
    expect(skills[2].name).toBe("taste-skill");
  });

  it("returns empty array for empty input", () => {
    const skills = discoverSkillsFromDir([]);
    expect(skills).toEqual([]);
  });

  it("deduplicates by name (categorized takes priority)", () => {
    const paths = [
      "/home/.agents/skills/tdd/SKILL.md",  // flat
      "/home/.agents/skills/methodology/tdd/SKILL.md",  // categorized
    ];
    const skills = discoverSkillsFromDir(paths);
    expect(skills).toHaveLength(1);
    expect(skills[0].category).toBe("methodology");
  });
});