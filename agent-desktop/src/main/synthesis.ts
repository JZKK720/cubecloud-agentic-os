// Wiki synthesis (Step 12 of the V2 rollout, ported from gbrain's
// `gbrain think` / synthesis layer).
//
// gbrain's read path has two modes:
//
//   - `gbrain search`  — raw retrieval, returns top pages
//   - `gbrain think`   — runs the same retrieval, then composes
//                        a synthesized answer across the
//                        results with explicit citations AND an
//                        honest note on what the brain doesn't
//                        know yet. The gap analysis is the
//                        differentiator.
//
// The same shape fits cubecloud's per-profile wiki. We already
// have a 3-layer memory (raw / wiki / schema) from the Karpathy
// harvest pattern. This module adds the synthesis layer on top:
//
//   - `synthesize(topic, profile)` returns a `Synthesis`
//     object: a markdown answer, the source pages that
//     backed each claim (with the relPath and a per-claim
//     attribution), and a gap list — "what we don't know
//     yet" lines the user can act on.
//
// The synthesis is offline / deterministic. We don't call an
// LLM here; we compose the answer from the wiki index and the
// raw sources already on disk. The renderer's chat panel can
// either show the synthesis verbatim or feed it to the agent
// as context for a follow-up prompt.

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";
import {
  inferPageType,
  resolveActivePack,
  type SchemaPack,
} from "./schemas";

/** One claim extracted from a page. For V1, "claim" is just a
 *  non-empty line from the page body that doesn't look like
 *  frontmatter, a heading, or a list bullet. A future LLM
 *  extractor can replace this with proper claim extraction;
 *  the rest of the pipeline doesn't care where claims come
 *  from. */
export interface Claim {
  /** Which page this claim came from. */
  relPath: string;
  /** Page title (the first H1 or the file name). */
  pageTitle: string;
  /** The claim text, trimmed. */
  text: string;
  /** Page type, per the active schema pack. */
  type: string;
}

/** What the brain doesn't know yet — surfaced so the user can
 *  decide whether to fill the hole. */
export interface Gap {
  /** Short label, surfaced in the UI. */
  label: string;
  /** Why we think this is a gap. */
  reason: string;
  /** What we'd need to fill it (free text). */
  need: string;
}

/** A synthesis is the structured answer a topic query returns. */
export interface Synthesis {
  /** The topic the user asked about. */
  topic: string;
  /** A markdown answer, with each claim cited inline. */
  markdown: string;
  /** The list of claims the markdown was built from, with
   *  per-claim attribution. */
  claims: Claim[];
  /** The list of source pages the synthesis drew on. */
  sources: Array<{ relPath: string; title: string; type: string }>;
  /** The list of gaps the synthesis noticed. */
  gaps: Gap[];
  /** A human-readable freshness summary ("3 sources, latest
   *  from 2026-05-01"). */
  freshness: string;
  /** When the synthesis was built. */
  builtAt: string;
  /** Which schema pack was active when the synthesis was built. */
  packId: string;
}

interface SourceRow {
  relPath: string;
  title: string;
  type: string;
  claims: Claim[];
  lastModified: number;
}

function wikiHome(profile?: string): string {
  return join(profileHome(profile), "wiki");
}

function rawSourcesDir(profile?: string): string {
  return join(wikiHome(profile), "raw", "sources");
}

function wikiPagesDir(profile?: string): string {
  return join(wikiHome(profile), "pages");
}

/** Read a single page from the wiki's pages/ directory. */
function readPageText(relPath: string, profile?: string): string {
  const fullPath = join(wikiPagesDir(profile), relPath);
  if (!existsSync(fullPath)) return "";
  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

/** Read a single raw source markdown from the raw/sources/
 *  directory. Returns "" if missing. */
function readRawText(filename: string, profile?: string): string {
  const fullPath = join(rawSourcesDir(profile), filename);
  if (!existsSync(fullPath)) return "";
  try {
    return readFileSync(fullPath, "utf-8");
  } catch {
    return "";
  }
}

/** List raw sources on disk. */
function listRawSources(profile?: string): string[] {
  const dir = rawSourcesDir(profile);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
}

/** List wiki pages on disk (under `pages/`). */
function listWikiPages(profile?: string): string[] {
  const dir = wikiPagesDir(profile);
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (sub: string): void => {
    const full = join(dir, sub);
    let entries: string[];
    try {
      entries = readdirSync(full);
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = sub ? `${sub}/${entry}` : entry;
      const stat = statSync(join(full, entry));
      if (stat.isDirectory()) {
        walk(rel);
      } else if (entry.endsWith(".md")) {
        out.push(rel);
      }
    }
  };
  walk("");
  return out;
}

/** Strip YAML frontmatter, if present. */
function stripFrontmatter(text: string): string {
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return text;
  return text.slice(end + 4).replace(/^\s*\n/, "");
}

/** Extract the first H1 from a markdown body, falling back to
 *  the file's basename. */
function extractTitle(text: string, fallback: string): string {
  const stripped = stripFrontmatter(text);
  const m = stripped.match(/^#\s+(.+?)\s*$/m);
  if (m) return m[1].trim();
  return fallback.replace(/\.md$/, "");
}

/** Extract claim lines from a markdown body. Heuristic: a
 *  non-empty line that isn't frontmatter, a heading, a code
 *  fence marker, or a list bullet. Tuned for markdown that
 *  the user actually writes — short paragraphs, plain
 *  prose, and the occasional bullet. */
function extractClaims(
  relPath: string,
  text: string,
  pack: SchemaPack,
): Claim[] {
  const stripped = stripFrontmatter(text);
  const type = inferPageType(relPath, pack);
  const title = extractTitle(text, relPath);
  const claims: Claim[] = [];
  const seen = new Set<string>();
  for (const rawLine of stripped.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("```")) continue;
    if (line.startsWith("---")) continue;
    if (line.startsWith(">")) continue; // blockquote
    if (line.startsWith("|")) continue; // table row
    if (line.startsWith("<!--")) continue;
    if (line === "***" || line === "---" || line === "___") continue;
    // Skip pure URL lines and very short fragments.
    if (line.length < 12) continue;
    if (/^https?:\/\//.test(line)) continue;
    // Strip a leading bullet / number from the line.
    const cleaned = line
      .replace(/^[-*+]\s+/, "")
      .replace(/^\d+\.\s+/, "");
    if (cleaned === line && /^[#>*|]/.test(line)) continue;
    if (cleaned.length < 12) continue;
    // Dedupe across the page — many pages re-state their title.
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    claims.push({ relPath, pageTitle: title, text: cleaned, type });
  }
  return claims;
}

/** Score a single line / claim against the topic. Higher is
 *  better. The score is the count of topic words that appear
 *  in the claim, weighted by token length to avoid tiny
 *  common-word matches dominating. */
function scoreClaim(claim: string, topicWords: string[]): number {
  const lower = claim.toLowerCase();
  let score = 0;
  for (const w of topicWords) {
    if (!w) continue;
    if (lower.includes(w)) {
      score += 1 + Math.min(w.length, 8) / 8;
    }
  }
  return score;
}

/** Tokenise a topic for matching: lowercase, split on
 *  non-letters, drop stopwords and 1-2 char fragments. */
function tokenizeTopic(topic: string): string[] {
  const stop = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for",
    "from", "has", "have", "in", "is", "it", "its", "of",
    "on", "or", "that", "the", "to", "was", "were", "will",
    "with", "this", "these", "those", "i", "you", "we", "they",
    "do", "does", "did", "what", "how", "when", "where", "who",
    "why", "tell", "me", "about",
  ]);
  return topic
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/)
    .filter((t) => t.length >= 3 && !stop.has(t));
}

/** Build the synthesis: a markdown answer with inline
 *  citations, a sources list, and a gaps list. */
export function synthesize(
  topic: string,
  profile?: string,
  opts: { maxClaims?: number; maxGaps?: number } = {},
): Synthesis {
  const pack = resolveActivePack(profile);
  const maxClaims = opts.maxClaims ?? 12;
  const maxGaps = opts.maxGaps ?? 4;
  const topicWords = tokenizeTopic(topic);

  // Pull every claim from every page, scoring each.
  const allClaims: Claim[] = [];
  for (const rel of listWikiPages(profile)) {
    const text = readPageText(rel, profile);
    if (!text) continue;
    const claims = extractClaims(rel, text, pack);
    for (const c of claims) {
      allClaims.push(c);
    }
  }
  // Also pull claims from raw sources. We treat them as
  // type=note since they predate routing.
  for (const filename of listRawSources(profile)) {
    const text = readRawText(filename, profile);
    if (!text) continue;
    const claims = extractClaims(filename, text, pack);
    for (const c of claims) {
      allClaims.push(c);
    }
  }

  // Score and rank. Claims with a positive topic score win.
  const scored = allClaims
    .map((c) => ({ claim: c, score: scoreClaim(c.text, topicWords) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxClaims);

  // Dedupe by text (case-insensitive), keeping the highest-scoring
  // instance of each unique claim. Many pages re-state things.
  const dedupedClaims: Claim[] = [];
  const seenTexts = new Set<string>();
  for (const { claim } of scored) {
    const key = claim.text.toLowerCase().slice(0, 120);
    if (seenTexts.has(key)) continue;
    seenTexts.add(key);
    dedupedClaims.push(claim);
  }

  // Build the source list (page-level dedup).
  const sourcesByPath = new Map<string, SourceRow>();
  for (const c of dedupedClaims) {
    const existing = sourcesByPath.get(c.relPath);
    if (existing) {
      existing.claims.push(c);
    } else {
      sourcesByPath.set(c.relPath, {
        relPath: c.relPath,
        title: c.pageTitle,
        type: c.type,
        claims: [c],
        lastModified: 0,
      });
    }
  }
  // Drop claim arrays; we only need the source rows.
  const sources = [...sourcesByPath.values()].map((s) => ({
    relPath: s.relPath,
    title: s.title,
    type: s.type,
  }));

  // Freshness summary: count of sources + latest lastModified.
  const freshness = computeFreshness(sourcesByPath);

  // Build the markdown body, with per-claim citations.
  const markdown = renderMarkdown(topic, dedupedClaims, sourcesByPath);

  // Gaps: pages of relevant types that exist but have no
  // claim scoring above the topic; or types that the user
  // probably should have a page on but doesn't yet.
  const gaps = computeGaps(topic, dedupedClaims, sourcesByPath, pack, maxGaps);

  return {
    topic,
    markdown,
    claims: dedupedClaims,
    sources,
    gaps,
    freshness,
    builtAt: new Date().toISOString(),
    packId: pack.id,
  };
}

function computeFreshness(
  sources: Map<string, SourceRow>,
): string {
  if (sources.size === 0) return "no sources yet";
  let latest = 0;
  for (const row of sources.values()) {
    if (row.lastModified > latest) latest = row.lastModified;
  }
  const latestStr = latest > 0
    ? new Date(latest).toISOString().slice(0, 10)
    : "unknown date";
  return `${sources.size} source${sources.size === 1 ? "" : "s"}, latest ${latestStr}`;
}

function renderMarkdown(
  topic: string,
  claims: Claim[],
  sources: Map<string, SourceRow>,
): string {
  if (claims.length === 0) {
    return [
      `## ${topic}`,
      "",
      "_No matching sources found in the wiki._",
      "",
      "Suggestions:",
      "- Capture more notes on this topic via the file-to-markdown ingest.",
      "- Loosen the topic (broader keywords).",
      "- Verify the active schema pack's path prefixes match where your pages actually live.",
    ].join("\n");
  }
  const lines: string[] = [];
  lines.push(`## ${topic}`);
  lines.push("");
  for (const c of claims) {
    lines.push(`- ${c.text} _(source: \`${c.relPath}\`)_`);
  }
  lines.push("");
  lines.push("### Sources");
  lines.push("");
  for (const row of sources.values()) {
    lines.push(`- **${row.title}** — \`${row.relPath}\` (type: ${row.type})`);
  }
  return lines.join("\n");
}

function computeGaps(
  topic: string,
  claims: Claim[],
  sources: Map<string, SourceRow>,
  pack: SchemaPack,
  maxGaps: number,
): Gap[] {
  const gaps: Gap[] = [];
  const presentTypes = new Set<string>();
  for (const row of sources.values()) {
    presentTypes.add(row.type);
  }
  for (const type of pack.types) {
    if (type.id === "note") continue;
    if (claims.length > 0 && presentTypes.has(type.id)) continue;
    if (gaps.length >= maxGaps) break;
    gaps.push({
      label: `No ${type.label.toLowerCase()} page on "${topic}"`,
      reason: `The brain has no ${type.label.toLowerCase()} entry that surfaces on this topic.`,
      need: `Capture a ${type.label.toLowerCase()} via \`wiki-ingest-file-as-markdown\` or write one under \`${type.pathPrefixes[0] ?? ""}\`.`,
    });
  }
  // Always include the freshness gap when we have very few
  // sources — the user should know the answer is thin.
  if (sources.size < 3) {
    gaps.push({
      label: "Thin coverage",
      reason: `Only ${sources.size} source${sources.size === 1 ? "" : "s"} back this synthesis — treat the answer as a starting point, not a complete picture.`,
      need: "Capture 1-2 more relevant notes and re-run the synthesis to widen the evidence base.",
    });
  }
  return gaps;
}
