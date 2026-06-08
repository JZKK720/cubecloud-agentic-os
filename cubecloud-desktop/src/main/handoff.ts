// V2.2 /handoff (ported from gstack's /handoff skill).
//
// "Generate a context handoff doc" — when you're going off
// shift and a colleague (or your future self) needs to pick
// up where you left off, /handoff produces a single
// markdown document with everything they need to ramp up:
//
//   1. Active profile and its recent sessions
//   2. Recent learnings (top 10)
//   3. Pending kanban tasks
//   4. Recent wiki activity (last 10 log entries)
//   5. Suggested "read this first" links
//
// The output is pure markdown; the renderer can either
// inline-show it or save it to a file. We deliberately
// keep the heuristics obvious and the document scannable —
// the goal is a 60-second read for someone who has never
// seen the project.

import { readLearnings, dedupeLearnings } from "./learnings";
import { listSessions } from "./sessions";
import { getWikiStatus, readWikiLog, type WikiLog } from "./wiki";
import { profileHome } from "./utils";
import { readFileSync, statSync } from "fs";
import { join } from "path";

export interface HandoffSection {
  /** Section heading, e.g. "Recent sessions". */
  heading: string;
  /** Body markdown for the section. */
  body: string;
}

export interface HandoffDoc {
  /** ISO 8601 timestamp. */
  generatedAt: string;
  /** Active profile name (or "default"). */
  profile: string;
  /** Sections in render order. */
  sections: HandoffSection[];
  /** Combined markdown — the canonical "handoff packet". */
  markdown: string;
  /** Suggested "read this first" file paths (relative to
   *  the profile home). */
  readFirst: string[];
}

const MAX_SESSIONS = 5;
const MAX_LEARNINGS = 10;
const MAX_KANBAN_TASKS = 10;
const MAX_WIKI_LOG = 10;
const MAX_FILES_TO_LIST = 20;
const MAX_FILE_BYTES = 256 * 1024; // 256 KB cap on "read this first" candidates

/** A file is "read this first" candidate if it is small
 *  (< MAX_FILE_BYTES), has a recognised documentation
 *  extension, and lives in the profile home. */
function isReadFirstCandidate(absPath: string, relPath: string): boolean {
  const docExts = [
    ".md",
    ".markdown",
    ".txt",
    ".yml",
    ".yaml",
    ".json",
    ".toml",
  ];
  if (!docExts.some((ext) => relPath.toLowerCase().endsWith(ext))) return false;
  try {
    const st = statSync(absPath);
    return st.size > 0 && st.size < MAX_FILE_BYTES;
  } catch {
    return false;
  }
}

function listDocFiles(root: string, prefix: string, out: Array<{ abs: string; rel: string }>): void {
  // Bounded BFS over the profile home. We stop at MAX_FILES_TO_LIST
  // entries to avoid huge profiles blocking the IPC call.
  // We avoid pulling in a recursive directory walker dependency
  // by using a simple stack.
  const stack: Array<{ dir: string; relDir: string }> = [
    { dir: root, relDir: "" },
  ];
  while (stack.length > 0 && out.length < MAX_FILES_TO_LIST) {
    const { dir, relDir } = stack.pop()!;
    let entries: string[];
    try {
      // Dynamic require so this module stays Node-only.
      const fs = require("fs") as typeof import("fs");
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (out.length >= MAX_FILES_TO_LIST) break;
      const abs = join(dir, entry);
      const rel = relDir ? `${relDir}/${entry}` : entry;
      let st;
      try {
        st = statSync(abs);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        stack.push({ dir: abs, relDir: rel });
      } else if (st.isFile()) {
        if (entry.startsWith(".")) continue;
        out.push({ abs, rel });
      }
    }
  }
  // Suppress unused param warning while keeping the signature
  // (prefix is kept for future use when we need to namespace
  // the path).
  void prefix;
}

/** Render the recent-sessions section. */
function renderSessions(_profile: string): HandoffSection {
  const sessions = listSessions(MAX_SESSIONS, 0);
  if (sessions.length === 0) {
    return {
      heading: "Recent sessions",
      body: "_No sessions in the active profile._",
    };
  }
  const lines: string[] = [];
  for (const s of sessions) {
    const title = s.title ?? "(untitled)";
    const when = new Date(s.startedAt).toISOString().slice(0, 16).replace("T", " ");
    lines.push(
      `- \`${s.id.slice(0, 8)}\` **${title}** — ${s.messageCount} messages, model \`${s.model}\`, ${when}`,
    );
  }
  return { heading: "Recent sessions", body: lines.join("\n") };
}

/** Render the recent-learnings section. */
function renderLearnings(profile?: string): HandoffSection {
  const all = readLearnings(profile);
  const dedup = dedupeLearnings(all).slice(0, MAX_LEARNINGS);
  if (dedup.length === 0) {
    return {
      heading: "Recent learnings",
      body: "_No learnings recorded yet — run `/retro` to seed._",
    };
  }
  const lines: string[] = [];
  for (const l of dedup) {
    const when = l.lastSeen.slice(0, 10);
    lines.push(
      `- **${l.type} / \`${l.key}\`** (conf ${l.confidence}/10, ${when}) — ${l.insight}`,
    );
  }
  return { heading: "Recent learnings", body: lines.join("\n") };
}

/** Render the pending-kanban section. We read the kanban
 *  state from disk; the kanban module doesn't expose a
 *  read-only summary over IPC yet, so we use a permissive
 *  parser: any *.json under `kanban/` is surfaced. If
 *  the file is empty or missing we report "no tasks". */
function renderKanban(profile: string): HandoffSection {
  const home = profileHome(profile);
  const candidates: Array<{ abs: string; rel: string }> = [];
  listDocFiles(join(home, "kanban"), "kanban", candidates);
  if (candidates.length === 0) {
    return {
      heading: "Pending tasks (kanban)",
      body: "_No kanban files found in the profile._",
    };
  }
  const lines: string[] = [];
  let total = 0;
  for (const c of candidates) {
    let raw: string;
    try {
      raw = readFileSync(c.abs, "utf-8");
    } catch {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      lines.push(`- \`${c.rel}\` _(unparseable; see file directly)_`);
      continue;
    }
    if (!parsed || typeof parsed !== "object") continue;
    const obj = parsed as Record<string, unknown>;
    const tasks = Array.isArray(obj["tasks"]) ? (obj["tasks"] as unknown[]) : [];
    for (const t of tasks) {
      if (total >= MAX_KANBAN_TASKS) break;
      if (!t || typeof t !== "object") continue;
      const task = t as Record<string, unknown>;
      const id = typeof task["id"] === "string" ? task["id"] : "?";
      const title = typeof task["title"] === "string" ? task["title"] : "(no title)";
      const status = typeof task["status"] === "string" ? task["status"] : "unknown";
      const owner = typeof task["owner"] === "string" ? task["owner"] : "";
      const ownerSuffix = owner ? ` (${owner})` : "";
      lines.push(`- \`${id}\` [${status}] **${title}**${ownerSuffix}`);
      total++;
    }
  }
  if (lines.length === 0) {
    return {
      heading: "Pending tasks (kanban)",
      body: "_No pending tasks found._",
    };
  }
  return { heading: "Pending tasks (kanban)", body: lines.join("\n") };
}

/** Render the recent wiki activity section. */
function renderWiki(profile: string): HandoffSection {
  const status = getWikiStatus(profile);
  // The wiki is considered bootstrapped when at least the index
  // and the log file exist. (We don't require schema.md to be
  // present — the agent may run before the user has agreed on
  // conventions.)
  if (!status.indexExists || !status.logExists) {
    return {
      heading: "Wiki activity",
      body: "_Wiki not bootstrapped on this profile._",
    };
  }
  const log: WikiLog = readWikiLog(profile);
  const entries = log.entries ?? [];
  if (entries.length === 0) {
    return {
      heading: "Wiki activity",
      body: "_Wiki exists, but no log entries yet._",
    };
  }
  const recent = entries.slice(-MAX_WIKI_LOG).reverse();
  const lines: string[] = [];
  for (const entry of recent) {
    const when = entry.iso
      ? new Date(entry.iso).toISOString().slice(0, 16).replace("T", " ")
      : "";
    const title = entry.title ?? "(no title)";
    const kind = entry.kind ?? "edit";
    const summary = entry.raw ? ` — ${entry.raw.slice(0, 100)}` : "";
    lines.push(`- \`${kind}\` **${title}** (${when})${summary}`);
  }
  return { heading: "Wiki activity", body: lines.join("\n") };
}

/** Build the read-first list by scanning the profile home
 *  for small documentation files. */
function buildReadFirst(profile: string): string[] {
  const home = profileHome(profile);
  const all: Array<{ abs: string; rel: string }> = [];
  listDocFiles(home, "", all);
  const docs = all
    .filter((c) => isReadFirstCandidate(c.abs, c.rel))
    .map((c) => c.rel);
  // Prioritise: README first, then CHANGELOG, then anything else
  const readme = docs.filter((d) => /readme/i.test(d));
  const changelog = docs.filter((d) => /changelog|history/i.test(d));
  const other = docs.filter(
    (d) => !readme.includes(d) && !changelog.includes(d),
  );
  return [...readme, ...changelog, ...other].slice(0, 5);
}

/** Build a handoff document. Pure read; no disk writes. */
export function buildHandoff(
  profile: string = "default",
): HandoffDoc {
  const generatedAt = new Date().toISOString();
  const sections: HandoffSection[] = [
    renderSessions(profile),
    renderLearnings(profile),
    renderKanban(profile),
    renderWiki(profile),
  ];
  const readFirst = buildReadFirst(profile);
  if (readFirst.length > 0) {
    const lines = readFirst.map((r) => `- \`${r}\``);
    sections.push({
      heading: "Read this first",
      body: lines.join("\n"),
    });
  }
  const head = [
    "# Handoff",
    "",
    `Generated ${generatedAt}.`,
    `Active profile: \`${profile}\`.`,
    "",
  ].join("\n");
  const body = sections
    .map((s) => `## ${s.heading}\n\n${s.body}\n`)
    .join("\n");
  return {
    generatedAt,
    profile,
    sections,
    markdown: head + body,
    readFirst,
  };
}

/** Save the handoff markdown to a file. Returns the
 *  absolute path of the written file. */
export function saveHandoff(
  doc: HandoffDoc,
  outDir?: string,
): { path: string; bytes: number } {
  const path = outDir ?? join(profileHome(doc.profile), "handoff");
  // Ensure the directory exists
  try {
    require("fs").mkdirSync(path, { recursive: true });
  } catch {
    // ignore
  }
  const filename = `handoff-${doc.generatedAt.replace(/[:.]/g, "-")}.md`;
  const fullPath = join(path, filename);
  require("fs").writeFileSync(fullPath, doc.markdown, "utf-8");
  return { path: fullPath, bytes: doc.markdown.length };
}

/** Convenience: build + save + return the doc. */
export function buildAndSaveHandoff(
  profile: string = "default",
  outDir?: string,
): { doc: HandoffDoc; saved: { path: string; bytes: number } } {
  const doc = buildHandoff(profile);
  const saved = saveHandoff(doc, outDir);
  return { doc, saved };
}
