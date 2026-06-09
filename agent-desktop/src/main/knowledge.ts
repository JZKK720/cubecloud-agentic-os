// /gbrain knowledge MCP (Step 14 of the V2 rollout, ported from
// gbrain's MCP surface — the search / think / capture verb
// family).
//
// gbrain ships a Model-Context-Protocol server with 30+ tools.
// We don't need all of them: cubecloud's renderer can drive
// the wiki through the existing IPC bridge, and the agent on
// top can read the same bridge via the tool-use surface. This
// module is the "knowledge search" half — a thin, pure layer
// that the renderer exposes to the agent as MCP-shaped tools
// (search, get, list, capture). Future work can add the synthesis
// and graph-query verbs on top.
//
// Every function here is pure (no I/O outside the profile
// directory); the MCP-shaped wrapper is just a thin facade.

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";
import { synthesize, type Synthesis } from "./synthesis";
import { inferPageType, resolveActivePack } from "./schemas";

/** A MCP-style tool definition. We export the manifest so the
 *  renderer can register each verb with the agent's tool-use
 *  layer. */
export interface McpTool {
  /** Tool name, e.g. "knowledge.search". */
  name: string;
  /** One-line description. */
  description: string;
  /** JSON-Schema-like input shape (we only need a few keys). */
  inputSchema: McpToolInput;
}

export interface McpToolInput {
  type: "object";
  required: string[];
  properties: Record<string, McpToolProperty>;
}

export interface McpToolProperty {
  type: "string" | "number" | "boolean";
  description: string;
}

/** Result of a knowledge search. The shape mirrors what the
 *  gbrain search MCP tool returns. */
export interface KnowledgeSearchResult {
  /** A short topic / question the user typed. */
  query: string;
  /** A synthesized answer with per-claim citations. */
  synthesis: Synthesis;
  /** The list of source pages that back the synthesis. */
  sources: Array<{
    relPath: string;
    title: string;
    type: string;
    snippet: string;
  }>;
}

/** Read a single page's body. */
function readPageBody(relPath: string, profile?: string): string {
  const fullPath = join(profileHome(profile), "wiki", "pages", relPath);
  if (!existsSync(fullPath)) return "";
  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

/** Walk the wiki pages dir and return every markdown file. */
function listPages(profile?: string): string[] {
  const pagesDir = join(profileHome(profile), "wiki", "pages");
  if (!existsSync(pagesDir)) return [];
  const out: string[] = [];
  const walk = (sub: string): void => {
    const full = join(pagesDir, sub);
    let entries: string[];
    try {
      entries = readdirSync(full);
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = sub ? `${sub}/${entry}` : entry;
      try {
        if (statSync(join(full, entry)).isDirectory()) {
          walk(rel);
        } else if (entry.endsWith(".md")) {
          out.push(rel);
        }
      } catch {
        // skip unreadable
      }
    }
  };
  walk("");
  return out;
}

/** Pull a short snippet (≈200 chars) from a page body. The
 *  snippet is the first non-empty, non-heading line. */
function snippetFor(body: string): string {
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("```")) continue;
    if (line.startsWith("- ")) continue;
    if (line.length < 12) continue;
    return line.length > 200 ? line.slice(0, 200) + "…" : line;
  }
  return "";
}

// ── MCP verbs ──────────────────────────────────────────────

/** knowledge.search(query, profile?) — synthesize a topic
 *  answer from the wiki + raw sources. Equivalent to gbrain's
 *  `gbrain think` (the synthesis layer). */
export function knowledgeSearch(
  query: string,
  profile?: string,
): KnowledgeSearchResult {
  const synthesis = synthesize(query, profile);
  const sources = synthesis.sources.map((src) => {
    const body = readPageBody(src.relPath, profile);
    return { ...src, snippet: snippetFor(body) };
  });
  return { query, synthesis, sources };
}

/** knowledge.get(relPath, profile?) — read a single page by
 *  relative path under the wiki root. Returns null if the page
 *  doesn't exist. */
export function knowledgeGet(
  relPath: string,
  profile?: string,
): {
  relPath: string;
  title: string;
  type: string;
  body: string;
} | null {
  const body = readPageBody(relPath, profile);
  if (!body) return null;
  const pack = resolveActivePack(profile);
  const title = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? relPath;
  return {
    relPath,
    title,
    type: inferPageType(relPath, pack),
    body,
  };
}

/** knowledge.list(type?, profile?) — list every wiki page,
 *  optionally filtered by schema-pack type. */
export function knowledgeList(
  filter: { type?: string } = {},
  profile?: string,
): Array<{ relPath: string; title: string; type: string }> {
  const pack = resolveActivePack(profile);
  const out: Array<{ relPath: string; title: string; type: string }> = [];
  for (const rel of listPages(profile)) {
    const type = inferPageType(rel, pack);
    if (filter.type && type !== filter.type) continue;
    const body = readPageBody(rel, profile);
    const title = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? rel;
    out.push({ relPath: rel, title, type });
  }
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

/** knowledge.sources(profile?) — list every raw source on
 *  disk. Mirrors gbrain's "raw sources" surface. */
export function knowledgeRawSources(
  profile?: string,
): Array<{ filename: string; size: number; lastModified: number }> {
  const dir = join(profileHome(profile), "wiki", "raw", "sources");
  if (!existsSync(dir)) return [];
  const out: Array<{ filename: string; size: number; lastModified: number }> = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    try {
      const st = statSync(join(dir, f));
      out.push({ filename: f, size: st.size, lastModified: st.mtimeMs });
    } catch {
      // skip
    }
  }
  return out.sort((a, b) => b.lastModified - a.lastModified);
}

// ── Tool manifest ─────────────────────────────────────────

/** The MCP tool manifest cubecloud exposes to the agent. */
export const KNOWLEDGE_TOOLS: readonly McpTool[] = [
  {
    name: "knowledge.search",
    description:
      "Synthesize a topic answer from the wiki + raw sources with per-claim citations and a gap list.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description: "The topic or question to synthesize an answer for.",
        },
        profile: {
          type: "string",
          description: "Profile name. Optional; defaults to the active profile.",
        },
      },
    },
  },
  {
    name: "knowledge.get",
    description:
      "Read a single wiki page by its relative path under the wiki root.",
    inputSchema: {
      type: "object",
      required: ["relPath"],
      properties: {
        relPath: {
          type: "string",
          description: "Relative path of the page, e.g. 'people/alice.md'.",
        },
        profile: {
          type: "string",
          description: "Profile name. Optional.",
        },
      },
    },
  },
  {
    name: "knowledge.list",
    description: "List every wiki page, optionally filtered by schema-pack type.",
    inputSchema: {
      type: "object",
      required: [],
      properties: {
        type: {
          type: "string",
          description: "Optional type id, e.g. 'person', 'project'.",
        },
        profile: {
          type: "string",
          description: "Profile name. Optional.",
        },
      },
    },
  },
  {
    name: "knowledge.sources",
    description: "List every raw source markdown on disk.",
    inputSchema: {
      type: "object",
      required: [],
      properties: {
        profile: {
          type: "string",
          description: "Profile name. Optional.",
        },
      },
    },
  },
];
