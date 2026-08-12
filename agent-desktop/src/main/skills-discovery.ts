// skills-discovery.ts — P7: Skills-bundle-kit integration.
//
// The kit installs skills flat (~/.agents/skills/<name>/SKILL.md).
// The desktop's listInstalledSkills() expects categorized
// (~/.agents/skills/<category>/<name>/SKILL.md).
// This module handles both layouts.
//
// Inspired by the skills-bundle-kit's flat install convention and
// the desktop's categorized discovery, this module normalizes both.

import { basename, dirname, normalize as normalizePath } from "path";

// ── Types ─────────────────────────────────────────────────

/** A discovered skill from the filesystem. */
export interface DiscoveredSkill {
  name: string;
  category: string;
  /** The layout the skill was found in. */
  layout: "flat" | "categorized";
  /** Absolute path to the SKILL.md file. */
  path: string;
}

// ── classifySkillLayout ───────────────────────────────────

/** Classify whether a SKILL.md path is in a flat or categorized layout.
 *  Categorized: .../skills/<category>/<name>/SKILL.md
 *  Flat:        .../skills/<name>/SKILL.md */
export function classifySkillLayout(skillMdPath: string): "flat" | "categorized" {
  const normalized = normalizePath(skillMdPath).replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Find "skills" in the path
  const skillsIdx = parts.lastIndexOf("skills");
  if (skillsIdx === -1) return "flat";

  // After "skills/":
  //   <name>/SKILL.md → flat (2 parts)
  //   <category>/<name>/SKILL.md → categorized (3 parts)
  const afterSkills = parts.slice(skillsIdx + 1);
  if (afterSkills.length >= 3) return "categorized";
  return "flat";
}

// ── normalizeSkillPath ─────────────────────────────────────

/** Extract category and name from a SKILL.md path.
 *  Handles both flat and categorized layouts, and Windows paths. */
export function normalizeSkillPath(skillMdPath: string): {
  category: string;
  name: string;
  layout: "flat" | "categorized";
} {
  const normalized = normalizePath(skillMdPath).replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Find "skills" in the path
  const skillsIdx = parts.lastIndexOf("skills");
  if (skillsIdx === -1) {
    // No "skills" directory — use the parent as name
    const name = parts[parts.length - 2] || basename(dirname(skillMdPath));
    return { category: "uncategorized", name, layout: "flat" };
  }

  const afterSkills = parts.slice(skillsIdx + 1);

  if (afterSkills.length >= 3) {
    // categorized: <category>/<name>/SKILL.md
    return {
      category: afterSkills[0],
      name: afterSkills[1],
      layout: "categorized",
    };
  }

  if (afterSkills.length >= 2) {
    // flat: <name>/SKILL.md
    return {
      category: "uncategorized",
      name: afterSkills[0],
      layout: "flat",
    };
  }

  return { category: "uncategorized", name: "unknown", layout: "flat" };
}

// ── discoverSkillsFromDir ─────────────────────────────────

/** Discover skills from a list of SKILL.md paths.
 *  Normalizes both flat and categorized layouts.
 *  Deduplicates by name — categorized entries take priority over flat. */
export function discoverSkillsFromDir(
  skillMdPaths: string[],
): DiscoveredSkill[] {
  const byName = new Map<string, DiscoveredSkill>();

  for (const path of skillMdPaths) {
    const { category, name, layout } = normalizeSkillPath(path);
    const existing = byName.get(name);

    // Categorized takes priority over flat
    if (existing && existing.layout === "categorized" && layout === "flat") {
      continue; // keep the categorized one
    }

    byName.set(name, { name, category, layout, path });
  }

  return Array.from(byName.values());
}