// Schema packs (Step 13 of the V2 rollout, ported from gbrain).
//
// gbrain's "Your brain's shape" concept: most personal-knowledge
// tools force one fixed layout (their idea of "notes" + "people"
// + "tags"). gbrain doesn't. It ships bundled schema packs and
// lets the user author their own. A pack declares:
//
//   - The page types the brain recognises
//   - The path-prefix conventions that route a file to a type
//   - Which types participate in extraction / auto-linking /
//     expert-routing
//   - Subtypes / format / origin (lives in the page's frontmatter,
//     not the type itself)
//
// We port the same idea to cubecloud's per-profile wiki. The
// active pack threads through every read + write path:
// parseMarkdown infers page type from the pack's path prefixes;
// the synthesis layer (see `synthesis.ts`) knows which fields
// matter for each type; the extraction helper only runs on
// `extractable: true` types.
//
// Bundled packs:
//
//   - `cubecloud-base-v1` (default) — the 6-type DRY/MECE
//     taxonomy: `person`, `project`, `concept`, `decision`,
//     `meeting`, `note`.
//   - `cubecloud-recommended` — extends `cubecloud-base-v1`
//     with `runbook`, `learning`, `experiment`, `faq`. Useful
//     for power users who want a richer shape.
//
// The active pack is selected by writing the pack id to
// `<profile>/wiki/schema-pack.json`. Pass `--pack` on the
// `wiki-build-synthesis` IPC to override for one call.

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/** A single page type in a schema pack. */
export interface SchemaType {
  /** Stable id, used as the directory name. */
  id: string;
  /** Human-readable display name. */
  label: string;
  /** One-line description, surfaced in the schema browser. */
  description: string;
  /** Path prefixes that route a file to this type. The first
   *  matching prefix wins. Order matters. */
  pathPrefixes: string[];
  /** Whether the extraction helper should run on this type. */
  extractable: boolean;
  /** Whether this type participates in expert-routing (whoknows). */
  expertRouting: boolean;
  /** Recommended frontmatter fields. Optional. */
  recommendedFields?: string[];
}

/** A schema pack is the union of a name, a version, and a list
 *  of types. */
export interface SchemaPack {
  /** Pack id (kebab-case, ASCII, ≤40 chars). */
  id: string;
  /** Human-readable display name. */
  label: string;
  /** Semver-ish version (dotted numbers). */
  version: string;
  /** One-line description. */
  description: string;
  /** Pack this one inherits from, if any. */
  extends?: string;
  /** The types in the pack, in declaration order. */
  types: SchemaType[];
  /** Tags that always apply to pages of this pack. */
  globalTags?: string[];
}

// ── Bundled packs ─────────────────────────────────────────

/**
 * cubecloud-base-v1: the 6-type DRY/MECE canonical taxonomy.
 *
 * DRY: each page has exactly one type. MECE: the types cover
 * the four kinds of pages a personal work-brain needs —
 * "who" (person), "what" (project), "why" (concept, decision),
 * "when" (meeting), plus the catch-all (note).
 */
const BASE_V1: SchemaPack = {
  id: "cubecloud-base-v1",
  label: "Cubecloud Base v1",
  version: "1.0.0",
  description:
    "Default 6-type DRY/MECE taxonomy. Person / project / concept / decision / meeting / note.",
  types: [
    {
      id: "person",
      label: "Person",
      description: "A person the user works with or tracks.",
      pathPrefixes: ["people/", "persons/"],
      extractable: true,
      expertRouting: true,
      recommendedFields: ["role", "company", "context"],
    },
    {
      id: "project",
      label: "Project",
      description: "A project the user is shipping or scoping.",
      pathPrefixes: ["projects/"],
      extractable: true,
      expertRouting: true,
      recommendedFields: ["status", "owner", "stakeholders"],
    },
    {
      id: "concept",
      label: "Concept",
      description: "A concept / idea / definition the user wants to keep.",
      pathPrefixes: ["concepts/"],
      extractable: true,
      expertRouting: false,
      recommendedFields: ["aliases", "related"],
    },
    {
      id: "decision",
      label: "Decision",
      description: "A decision the user has made (or is considering).",
      pathPrefixes: ["decisions/"],
      extractable: true,
      expertRouting: true,
      recommendedFields: ["status", "alternatives", "rationale"],
    },
    {
      id: "meeting",
      label: "Meeting",
      description: "A meeting note, formatted for easy retrieval.",
      pathPrefixes: ["meetings/"],
      extractable: true,
      expertRouting: false,
      recommendedFields: ["date", "attendees", "action_items"],
    },
    {
      id: "note",
      label: "Note",
      description: "Catch-all for things that don't fit the other types.",
      pathPrefixes: ["notes/"],
      extractable: false,
      expertRouting: false,
    },
  ],
};

/**
 * cubecloud-recommended: extends the base with four power-user
 * types: runbook (procedures), learning (durable insights),
 * experiment (try-it-and-see), and faq (questions the user
 * gets asked a lot).
 */
const RECOMMENDED: SchemaPack = {
  id: "cubecloud-recommended",
  label: "Cubecloud Recommended",
  version: "1.0.0",
  description:
    "Extends cubecloud-base-v1 with runbook, learning, experiment, and faq.",
  extends: "cubecloud-base-v1",
  types: [
    ...BASE_V1.types,
    {
      id: "runbook",
      label: "Runbook",
      description: "A procedure the user runs more than once.",
      pathPrefixes: ["runbooks/"],
      extractable: true,
      expertRouting: true,
      recommendedFields: ["trigger", "steps", "rollback"],
    },
    {
      id: "learning",
      label: "Learning",
      description: "A durable insight — something the user wants to remember.",
      pathPrefixes: ["learnings/"],
      extractable: false,
      expertRouting: true,
      recommendedFields: ["confidence", "source", "files"],
    },
    {
      id: "experiment",
      label: "Experiment",
      description: "A try-it-and-see with a measurable outcome.",
      pathPrefixes: ["experiments/"],
      extractable: true,
      expertRouting: false,
      recommendedFields: ["hypothesis", "metric", "outcome"],
    },
    {
      id: "faq",
      label: "FAQ",
      description: "A question the user gets asked a lot, with the canonical answer.",
      pathPrefixes: ["faqs/"],
      extractable: false,
      expertRouting: true,
      recommendedFields: ["question", "answer", "asker"],
    },
  ],
  globalTags: ["#cubecloud-recommended"],
};

/** All bundled packs, by id. */
export const BUNDLED_PACKS: Readonly<Record<string, SchemaPack>> = {
  [BASE_V1.id]: BASE_V1,
  [RECOMMENDED.id]: RECOMMENDED,
};

/** The default pack when no choice is on disk. */
export const DEFAULT_PACK_ID = BASE_V1.id;

/** Return every bundled pack. */
export function listBundledPacks(): SchemaPack[] {
  return Object.values(BUNDLED_PACKS);
}

/** Look up a bundled pack by id, or undefined if unknown. */
export function getBundledPack(id: string): SchemaPack | undefined {
  return BUNDLED_PACKS[id];
}

// ── Active-pack resolution ─────────────────────────────────

/** Where the active-pack override is persisted. */
function activePackPath(profile?: string): string {
  return join(profileHome(profile), "wiki", "schema-pack.json");
}

/** Read the active-pack override from disk. Returns null if
 *  the user hasn't picked a pack. */
export function readActivePackId(profile?: string): string | null {
  const filePath = activePackPath(profile);
  if (!existsSync(filePath)) return null;
  try {
    const obj = JSON.parse(readFileSync(filePath, "utf-8")) as {
      packId?: unknown;
    };
    return typeof obj.packId === "string" ? obj.packId : null;
  } catch {
    return null;
  }
}

/** Persist the user's active-pack choice. */
export function setActivePackId(packId: string, profile?: string): void {
  const filePath = activePackPath(profile);
  writeFileSync(
    filePath,
    JSON.stringify({ packId, setAt: new Date().toISOString() }, null, 2),
    "utf-8",
  );
}

/** Resolve the active pack for the profile: bundled by id, or
 *  the default when no choice is on disk. */
export function resolveActivePack(profile?: string): SchemaPack {
  const id = readActivePackId(profile) ?? DEFAULT_PACK_ID;
  return BUNDLED_PACKS[id] ?? BASE_V1;
}

// ── Routing helpers ────────────────────────────────────────

/** Infer a page's type from its relative path under the wiki
 *  root, using the active pack's path-prefix conventions. The
 *  first matching prefix wins. */
export function inferPageType(
  relPath: string,
  pack: SchemaPack = resolveActivePack(),
): string {
  const normalized = relPath.replace(/\\/g, "/");
  for (const type of pack.types) {
    for (const prefix of type.pathPrefixes) {
      if (normalized.startsWith(prefix) || normalized.startsWith("./" + prefix)) {
        return type.id;
      }
    }
  }
  // Fall back to the catch-all (the type whose description
  // mentions "catch-all"; we pick the last type as a safe
  // default since the base pack puts `note` there).
  return pack.types[pack.types.length - 1]?.id ?? "note";
}

/** Return every type in a pack that participates in
 *  extraction. */
export function extractableTypes(pack: SchemaPack = resolveActivePack()): SchemaType[] {
  return pack.types.filter((t) => t.extractable);
}

/** Return every type that participates in expert-routing. */
export function expertRoutingTypes(pack: SchemaPack = resolveActivePack()): SchemaType[] {
  return pack.types.filter((t) => t.expertRouting);
}

/** Look up a type by id, or undefined. */
export function getType(
  id: string,
  pack: SchemaPack = resolveActivePack(),
): SchemaType | undefined {
  return pack.types.find((t) => t.id === id);
}
