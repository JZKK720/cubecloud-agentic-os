// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Cubecloud-original pre-launch defaults â€?Skills tab.
//
// Three user-visible skills shipped pre-installed to every
// Cubecloud Agent Desktop install. User can edit / disable /
// delete any of them. The seed is idempotent: if the user has
// already saved a skill with the same `name`, the seed does not
// re-add it.
//
// The pre-launch bundle is documented in:
//   agent-desktop/BRANDING_AND_LICENSE.md Â§"V2.9 transitions landed"
//   agent-desktop/docs/HANDBOOK.md Â§"5.3 Adding a pre-installed skill"
//   .agents/skills/README.md (the developer-time skill index)

import type { AgentSkill } from "@cubecloud/platform-core";

/**
 * Pre-installed user-visible skills. Each entry is a
 * Cubecloud-original skill that ships with the binary.
 * They appear in the Skills screen the first time the user
 * opens the desktop.
 *
 * Design rules (per `.agents/skills/sp-write-skill`):
 *   - `name` is kebab-case, matches the directory name.
 *   - `description` is trigger-only (no process summary).
 *   - `category` is one of: "language-standards", "workflow",
 *     "domain-knowledge", "tool-integration", "template".
 *   - The skill body is *not* shipped in this seed (the
 *     body is markdown; the Skills screen stores a pointer
 *     to a `path` field, not the body). The user can browse
 *     the developer-time skill catalog at
 *     `.agents/skills/<name>/SKILL.md` if they want the body.
 */
export const DEFAULT_SKILLS: AgentSkill[] = [
  {
    name: "cubecloud-persona",
    category: "domain-knowledge",
    description:
      "Use when the user asks about the agent's tone, persona, soul, " +
      "or behaviour â€?invokes the default Cubecloud operator persona " +
      "with action-shaped, honest-about-limits, concise replies.",
    path: ".agents/skills/cubecloud-persona/SKILL.md",
  },
  {
    name: "cubecloud-onboarding",
    category: "workflow",
    description:
      "Use when the user is in their first 5 minutes with the desktop â€?" +
      "walks them through installing a runtime, configuring a provider, " +
      "running a first chat, and disabling any default pre-installed item.",
    path: ".agents/skills/cubecloud-onboarding/SKILL.md",
  },
  {
    name: "cubegraph-code-intel",
    category: "tool-integration",
    description:
      "Use when the user asks where something is defined, who calls a " +
      "function, or what the impact of a change is â€?wraps the existing " +
      "CodeGraph IPC channels as a user-invocable skill.",
    path: ".agents/skills/cubegraph-code-intel/SKILL.md",
  },
];

/**
 * Idempotent seed. Call after the user's saved skills are
 * loaded; if any seed `name` is not already in the saved set,
 * add it. If the user has deleted a seed, the deletion sticks
 * (we do not re-add).
 */
export function seedDefaultSkills(saved: AgentSkill[]): AgentSkill[] {
  const existing = new Set(saved.map((s) => s.name));
  const additions: AgentSkill[] = [];
  for (const def of DEFAULT_SKILLS) {
    if (!existing.has(def.name)) {
      additions.push(def);
    }
  }
  if (additions.length === 0) {
    return saved;
  }
  return [...saved, ...additions];
}

/** Marker used by the V2.9 audit to confirm the seed ran. */
export const DEFAULT_SKILLS_SEED_VERSION = 1;
