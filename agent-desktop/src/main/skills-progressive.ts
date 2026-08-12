// skills-progressive.ts — P6: Progressive-disclosure skills.
//
// Instead of injecting full SKILL.md bodies into the system prompt,
// inject only a catalog (name + one-line description). The full body
// is loaded on demand when the model invokes a skill.
//
// This reduces context usage by ~80% when there are many skills
// (catalog is ~50 tokens per skill vs ~500-2000 tokens for a full body).
//
// Inspired by openworker's progressive-disclosure skill system
// (coworker/skills/__init__.py), adapted to the Cubecloud Agent Desktop.

// ── Types ─────────────────────────────────────────────────

/** A single skill catalog entry — name + description only, no body. */
export interface SkillCatalogEntry {
  name: string;
  description: string;
  category: string;
  source: "bundled" | "user-installed" | "kit-installed";
  /** Full body — only loaded on demand. Not included in the catalog. */
  body?: string;
}

/** The skill catalog — a compact list of all available skills. */
export interface SkillCatalog {
  entries: SkillCatalogEntry[];
  totalCount: number;
}

// ── buildSkillCatalog ──────────────────────────────────────

/** Build a skill catalog from a list of skill entries.
 *  The catalog contains only name + description — no full bodies. */
export function buildSkillCatalog(
  skills: SkillCatalogEntry[],
): SkillCatalog {
  return {
    entries: skills.map((s) => ({
      name: s.name,
      description: s.description,
      category: s.category,
      source: s.source,
      // body is intentionally excluded from the catalog
    })),
    totalCount: skills.length,
  };
}

// ── formatCatalogForSystemPrompt ──────────────────────────

/** Format the skill catalog as a compact system prompt section.
 *  This is injected at session start — it tells the model what skills
 *  exist without loading their full bodies. */
export function formatCatalogForSystemPrompt(
  catalog: SkillCatalog,
): string {
  if (catalog.entries.length === 0) return "";

  const lines: string[] = [
    "## Available skills",
    "",
    `${catalog.totalCount} skills available. Mention a skill by name to load its full instructions.`,
    "",
  ];

  for (const entry of catalog.entries) {
    lines.push(`- **${entry.name}**: ${entry.description}`);
  }

  return lines.join("\n");
}

// ── shouldLoadFullBody ─────────────────────────────────────

/** Check if a message references a skill by name, indicating the model
 *  wants to use it and the full body should be loaded. */
export function shouldLoadFullBody(message: string): boolean {
  if (!message) return false;

  // Check for "skill:name" prefix
  if (/skill:[\w-]+/i.test(message)) return true;

  // Check for "use the <name> skill" or "using <name> skill"
  if (/use\s+(?:the\s+)?[\w-]+\s+skill/i.test(message)) return true;

  // Check for "I'll use <name>" or "let me use <name>"
  if (/(?:i'?ll|let me)\s+use\s+[\w-]+/i.test(message)) return true;

  return false;
}

// ── buildFullBodyInjection ─────────────────────────────────

/** Build a full body injection for a single skill.
 *  This is loaded on demand when the model requests a skill. */
export function buildFullBodyInjection(
  skillName: string,
  body: string,
): string {
  if (!body) return "";

  return [
    `## Skill: ${skillName}`,
    "",
    body,
  ].join("\n");
}