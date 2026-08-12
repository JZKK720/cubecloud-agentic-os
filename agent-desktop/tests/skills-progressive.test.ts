// P6: Progressive-disclosure skills tests.
//
// Instead of injecting full SKILL.md bodies into the system prompt,
// inject only a catalog (name + one-line description). The full body
// is loaded on demand when the model invokes a skill.
//
// This reduces context usage by ~80% when there are many skills.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildSkillCatalog,
  type SkillCatalogEntry,
  type SkillCatalog,
  formatCatalogForSystemPrompt,
  shouldLoadFullBody,
  buildFullBodyInjection,
} from "../src/main/skills-progressive";

// ── Mock data ─────────────────────────────────────────────

const mockSkills: SkillCatalogEntry[] = [
  {
    name: "test-driven-development",
    description: "Use when implementing any feature or bugfix, before writing implementation code",
    category: "methodology",
    source: "bundled",
  },
  {
    name: "systematic-debugging",
    description: "Use when encountering any bug, test failure, or unexpected behavior",
    category: "methodology",
    source: "bundled",
  },
  {
    name: "taste-skill",
    description: "Anti-slop frontend skill for landing pages and redesigns",
    category: "design",
    source: "user-installed",
  },
];

// ── Tests ──────────────────────────────────────────────────

describe("buildSkillCatalog", () => {
  it("builds a catalog from skill entries", () => {
    const catalog = buildSkillCatalog(mockSkills);
    expect(catalog.entries).toHaveLength(3);
    expect(catalog.entries[0].name).toBe("test-driven-development");
  });

  it("catalog entries have name and description but no body", () => {
    const catalog = buildSkillCatalog(mockSkills);
    expect(catalog.entries[0].body).toBeUndefined();
  });

  it("catalog has a total count", () => {
    const catalog = buildSkillCatalog(mockSkills);
    expect(catalog.totalCount).toBe(3);
  });
});

describe("formatCatalogForSystemPrompt", () => {
  it("formats the catalog as a compact system prompt section", () => {
    const catalog = buildSkillCatalog(mockSkills);
    const formatted = formatCatalogForSystemPrompt(catalog);
    expect(formatted).toContain("## Available skills");
    expect(formatted).toContain("test-driven-development");
    expect(formatted).toContain("systematic-debugging");
    expect(formatted).toContain("taste-skill");
  });

  it("includes one-line descriptions, not full bodies", () => {
    const catalog = buildSkillCatalog(mockSkills);
    const formatted = formatCatalogForSystemPrompt(catalog);
    // Should contain the description
    expect(formatted).toContain("Use when implementing any feature");
    // Should NOT contain full body content
    expect(formatted).not.toContain("RED-GREEN-REFACTOR");
  });

  it("returns empty string for empty catalog", () => {
    const catalog = buildSkillCatalog([]);
    const formatted = formatCatalogForSystemPrompt(catalog);
    expect(formatted).toBe("");
  });

  it("is compact — under 500 chars for 3 skills", () => {
    const catalog = buildSkillCatalog(mockSkills);
    const formatted = formatCatalogForSystemPrompt(catalog);
    // Catalog should be much smaller than full bodies
    expect(formatted.length).toBeLessThan(500);
  });
});

describe("shouldLoadFullBody", () => {
  it("returns true when the model requests a skill by name", () => {
    expect(shouldLoadFullBody("I'll use the test-driven-development skill")).toBe(true);
  });

  it("returns true when the model references a skill with 'skill:' prefix", () => {
    expect(shouldLoadFullBody("skill:taste-skill")).toBe(true);
  });

  it("returns false for a message that doesn't reference any skill", () => {
    expect(shouldLoadFullBody("Hello, how are you?")).toBe(false);
  });

  it("returns false for empty message", () => {
    expect(shouldLoadFullBody("")).toBe(false);
  });
});

describe("buildFullBodyInjection", () => {
  it("builds a full body injection for a single skill", () => {
    const injection = buildFullBodyInjection("test-driven-development", "## TDD\n\nWrite tests first.");
    expect(injection).toContain("test-driven-development");
    expect(injection).toContain("## TDD");
    expect(injection).toContain("Write tests first.");
  });

  it("returns empty string for empty body", () => {
    const injection = buildFullBodyInjection("some-skill", "");
    expect(injection).toBe("");
  });
});