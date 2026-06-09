import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { profileHome, safeWriteFile } from "./utils";

/**
 * Karpathy LLM-Wiki-style 3-layer memory layout (raw / wiki / schema).
 *
 *   <profile>/wiki/
 *   ├── raw/sources/      # immutable source docs the user curates
 *   ├── wiki/             # LLM-generated interlinked markdown files
 *   │   ├── index.md      # content catalog (categories, links, summaries)
 *   │   ├── log.md        # chronological operation log
 *   │   ├── entities/     # entity pages
 *   │   ├── topics/       # topic pages
 *   │   ├── sources/      # source-summary pages
 *   │   └── synthesis/    # higher-level synthesis pages
 *   └── schema.md         # conventions the agent follows
 *
 * This complements the existing MEMORY.md / USER.md "operator memory"
 * — the wiki is for accumulating *knowledge* over time, while
 * MEMORY.md is for the runtime's short-term operating context. The
 * agent owns writes to wiki/ and log.md, the human owns writes to
 * raw/sources/ and schema.md.
 */

const LOG_ENTRY_PREFIX = "## [";

function wikiHome(profile?: string): string {
  return join(profileHome(profile), "wiki");
}

function rawDir(profile?: string): string {
  return join(wikiHome(profile), "raw", "sources");
}

function wikiDir(profile?: string): string {
  return join(wikiHome(profile), "wiki");
}

function indexPath(profile?: string): string {
  return join(wikiDir(profile), "index.md");
}

function logPath(profile?: string): string {
  return join(wikiDir(profile), "log.md");
}

function schemaPath(profile?: string): string {
  return join(wikiHome(profile), "schema.md");
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readFileSafe(filePath: string): {
  content: string;
  exists: boolean;
  lastModified: number | null;
} {
  if (!existsSync(filePath)) {
    return { content: "", exists: false, lastModified: null };
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const stat = statSync(filePath);
    return {
      content,
      exists: true,
      lastModified: Math.floor(stat.mtimeMs / 1000),
    };
  } catch {
    return { content: "", exists: false, lastModified: null };
  }
}

export interface WikiIndexEntry {
  title: string;
  category: string;
  summary: string;
  relPath: string;
  sourceCount?: number;
}

export interface WikiIndex {
  raw: string;
  catalog: WikiIndexEntry[];
  categories: string[];
  entryCount: number;
  lastModified: number | null;
  exists: boolean;
}

export interface WikiLogEntry {
  raw: string;
  iso: string;
  kind: string;
  title: string;
}

export interface WikiLog {
  raw: string;
  entries: WikiLogEntry[];
  lastModified: number | null;
  exists: boolean;
}

export interface WikiSource {
  name: string;
  relPath: string;
  size: number;
  lastModified: number;
}

export interface WikiSources {
  items: WikiSource[];
  total: number;
}

/**
 * Parse the index.md catalog. The format is:
 *
 *   # Wiki Index
 *
 *   ## entities
 *   - [Hermes Engine](entities/hermes-engine.md) — agent runtime
 *   - [Memory](entities/memory.md) — persistent memory model
 *   ...
 *
 *   ## topics
 *   ...
 *
 * We extract the first line of each bullet as the summary.
 */
export function readWikiIndex(profile?: string): WikiIndex {
  const filePath = indexPath(profile);
  const file = readFileSafe(filePath);
  const raw = file.content;
  if (!raw) {
    return {
      raw: "",
      catalog: [],
      categories: [],
      entryCount: 0,
      lastModified: null,
      exists: false,
    };
  }

  const catalog: WikiIndexEntry[] = [];
  const categories: string[] = [];
  let currentCategory = "";
  for (const line of raw.split(/\r?\n/)) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      currentCategory = h2[1].trim();
      if (!categories.includes(currentCategory)) categories.push(currentCategory);
      continue;
    }
    // Markdown link: [Title](path) — optional " — summary" after.
    const li = line.match(/^\s*-\s+\[([^\]]+)\]\(([^)]+)\)\s*(?:[—\-:]\s*)?(.+)?\s*$/);
    if (li) {
      catalog.push({
        title: li[1].trim(),
        category: currentCategory,
        relPath: li[2].trim(),
        summary: (li[3] || "").trim(),
      });
    }
  }
  return {
    raw,
    catalog,
    categories,
    entryCount: catalog.length,
    lastModified: file.lastModified,
    exists: true,
  };
}

/**
 * Parse log.md into discrete entries. Format:
 *   ## [2026-04-02] ingest | Article Title
 *   ## [2026-06-01 14:32] query | Topic
 */
export function readWikiLog(profile?: string): WikiLog {
  const filePath = logPath(profile);
  const file = readFileSafe(filePath);
  const raw = file.content;
  if (!raw) {
    return { raw: "", entries: [], lastModified: null, exists: false };
  }
  const entries: WikiLogEntry[] = [];
  const re = /^##\s*\[([^\]]+)\]\s+(\w+)\s*\|\s*(.+?)\s*$/;
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(re);
    if (m) {
      entries.push({ raw: line, iso: m[1], kind: m[2], title: m[3] });
    }
  }
  return { raw, entries, lastModified: file.lastModified, exists: true };
}

/**
 * Append a new entry to log.md. The format is greppable:
 *   ## [ISO] kind | Title
 */
export function appendWikiLog(
  profile: string | undefined,
  kind: "ingest" | "query" | "lint" | "synthesis" | "edit",
  title: string,
  body?: string,
): void {
  ensureDir(wikiDir(profile));
  const filePath = logPath(profile);
  const existing = existsSync(filePath)
    ? readFileSync(filePath, "utf-8")
    : "# Wiki Operation Log\n\nGreppable: `grep \"^## \\[\" log.md | tail -5`\n\n";
  const iso = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const header = `${LOG_ENTRY_PREFIX}${iso}] ${kind} | ${title}\n`;
  const bodyBlock = body ? `\n${body.trim()}\n` : "\n";
  safeWriteFile(filePath, existing + header + bodyBlock);
}

/**
 * List the immutable raw sources the user has curated. The LLM
 * reads from this directory but never writes to it.
 */
export function listWikiSources(profile?: string): WikiSources {
  const dir = rawDir(profile);
  if (!existsSync(dir)) return { items: [], total: 0 };
  const items: WikiSource[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isFile()) continue;
      const st = statSync(full);
      items.push({
        name: entry,
        relPath: `raw/sources/${entry}`,
        size: st.size,
        lastModified: Math.floor(st.mtimeMs / 1000),
      });
    }
  } catch {
    // ignore
  }
  return { items, total: items.length };
}

/**
 * Resolve a wiki page to its absolute path and return its content.
 * Used by the renderer to open a wiki page in a side viewer.
 */
export function readWikiPage(
  relPath: string,
  profile?: string,
): { content: string; exists: boolean; lastModified: number | null } {
  const safeRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (safeRel.includes("..")) {
    return { content: "", exists: false, lastModified: null };
  }
  const full = join(wikiHome(profile), safeRel);
  return readFileSafe(full);
}

/**
 * Write or replace a wiki page. The path is sandboxed to the wiki
 * root so a malformed relPath cannot escape it.
 */
export function writeWikiPage(
  relPath: string,
  content: string,
  profile?: string,
): { success: boolean; error?: string } {
  try {
    const safeRel = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
    if (safeRel.includes("..")) {
      return { success: false, error: "Path escapes wiki root" };
    }
    const full = join(wikiHome(profile), safeRel);
    ensureDir(join(full, ".."));
    writeFileSync(full, content, "utf-8");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Write or replace the wiki index. The agent owns this file; the
 * schema.md file describes how the agent should organize it.
 */
export function writeWikiIndex(content: string, profile?: string): {
  success: boolean;
  error?: string;
} {
  ensureDir(wikiDir(profile));
  return writeWikiPage("wiki/index.md", content, profile);
}

/**
 * Read the schema.md (the agent's conventions for the wiki). When
 * missing, return an empty string — the renderer can show a "no
 * schema yet" hint and the agent can bootstrap one.
 */
export function readWikiSchema(profile?: string): {
  content: string;
  exists: boolean;
  lastModified: number | null;
} {
  return readFileSafe(schemaPath(profile));
}

/**
 * First-run bootstrap. Ensures the wiki directory tree exists and
 * seeds a minimal index.md and schema.md if they're missing. The
 * user invokes this once after install.
 */
export function bootstrapWiki(profile?: string): {
  created: string[];
  alreadyExists: string[];
} {
  const created: string[] = [];
  const alreadyExists: string[] = [];
  const ensure = (path: string): void => {
    if (!existsSync(path)) {
      ensureDir(path);
      created.push(path);
    } else {
      alreadyExists.push(path);
    }
  };
  ensure(wikiHome(profile));
  ensure(rawDir(profile));
  ensure(wikiDir(profile));
  ensure(join(wikiDir(profile), "entities"));
  ensure(join(wikiDir(profile), "topics"));
  ensure(join(wikiDir(profile), "sources"));
  ensure(join(wikiDir(profile), "synthesis"));

  if (!existsSync(indexPath(profile))) {
    writeWikiIndex(
      "# Wiki Index\n\n> Content catalog. Maintained by the agent. Each entry links to a markdown page under `wiki/`.\n\n## entities\n\n## topics\n\n## sources\n\n## synthesis\n\n",
      profile,
    );
    created.push(indexPath(profile));
  }
  if (!existsSync(logPath(profile))) {
    writeFileSync(
      logPath(profile),
      "# Wiki Operation Log\n\n> Append-only timeline of ingests, queries, and lint passes. Greppable: `grep \"^## \\[\" log.md | tail -5`\n\n",
      "utf-8",
    );
    created.push(logPath(profile));
  }
  if (!existsSync(schemaPath(profile))) {
    writeFileSync(
      schemaPath(profile),
      "# Wiki Schema\n\n> Conventions the agent follows when maintaining this wiki. Co-evolved with the user over time.\n\n## File layout\n\n- `raw/sources/` — immutable source docs the user curates. Read-only to the agent.\n- `wiki/index.md` — content catalog. Maintained by the agent on every ingest.\n- `wiki/log.md` — chronological log of operations. Append-only.\n- `wiki/entities/` — entity pages (people, products, projects).\n- `wiki/topics/` — topic pages (concepts, themes).\n- `wiki/sources/` — one page per source, summarising what it contains.\n- `wiki/synthesis/` — higher-level synthesis that ties multiple sources together.\n\n## Cross-references\n\nUse `[[wikilink]]` syntax. The agent rewrites these to the resolved path on every ingest.\n\n## Frontmatter\n\nEvery wiki page starts with YAML frontmatter:\n\n```yaml\n---\ntitle: Page title\ncategory: entities | topics | sources | synthesis\ntags: [tag1, tag2]\nsources: [raw/sources/foo.pdf, ...]\ncreated: 2026-06-01\nupdated: 2026-06-03\n---\n```\n",
      "utf-8",
    );
    created.push(schemaPath(profile));
  }
  return { created, alreadyExists };
}

export interface WikiBootstrapStatus {
  wikiHome: string;
  rawDir: string;
  indexPath: string;
  logPath: string;
  schemaPath: string;
  indexExists: boolean;
  logExists: boolean;
  schemaExists: boolean;
  rawSourceCount: number;
}

/**
 * Lightweight status probe so the renderer can show "Wiki not set
 * up yet" with a one-click bootstrap.
 */
export function getWikiStatus(profile?: string): WikiBootstrapStatus {
  const home = wikiHome(profile);
  const raw = rawDir(profile);
  const idx = indexPath(profile);
  const log = logPath(profile);
  const sch = schemaPath(profile);
  const sources = listWikiSources(profile);
  return {
    wikiHome: home,
    rawDir: raw,
    indexPath: idx,
    logPath: log,
    schemaPath: sch,
    indexExists: existsSync(idx),
    logExists: existsSync(log),
    schemaExists: existsSync(sch),
    rawSourceCount: sources.total,
  };
}

/**
 * Sanitize a filename for use inside the wiki's `raw/sources/`
 * directory. Strips path separators, normalises unicode, and
 * replaces any non-`[A-Za-z0-9._-]` character with `_`. Returns
 * `untitled.md` as a last resort so callers always get a usable
 * name.
 */
function safeSourceName(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return "untitled.md";
  // Strip any leading path segments the OS might have joined in
  // (e.g. on Windows a drag-drop can leak "C:\Users\me\file.md").
  const basename = trimmed.split(/[\\/]/).pop() || "untitled.md";
  const safe = basename
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!safe) return "untitled.md";
  // If the user dropped something with no extension, default to
  // .md so the wiki viewer renders it as markdown.
  return /\.[A-Za-z0-9]+$/.test(safe) ? safe : `${safe}.md`;
}

/**
 * Write a new immutable raw source to the wiki's `raw/sources/`
 * directory. The name is sanitized and uniquified so two dropped
 * files with the same basename cannot overwrite each other. Used
 * by the file_to_markdown ingest pipeline (Step 4) and any
 * renderer surface that wants to drop a file into the wiki.
 */
export function writeWikiRawSource(
  sourceName: string,
  content: string,
  profile?: string,
): { relPath: string; size: number } {
  ensureDir(rawDir(profile));
  const base = safeSourceName(sourceName);
  // Uniquify by appending `-1`, `-2`, … if the file already exists.
  let candidate = base;
  let attempt = 1;
  while (existsSync(join(rawDir(profile), candidate))) {
    const dot = base.lastIndexOf(".");
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : "";
    candidate = `${stem}-${attempt}${ext}`;
    attempt++;
  }
  const full = join(rawDir(profile), candidate);
  safeWriteFile(full, content);
  return { relPath: `wiki/raw/sources/${candidate}`, size: content.length };
}
