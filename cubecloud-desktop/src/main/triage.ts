// V2.2 /triage (ported from gstack's /triage skill).
//
// Triage: given a list of items (issues, PRs, or messages),
// produce a structured triage report that surfaces the
// 5W1H (who/what/when/where/why/how) and proposes labels,
// priority, and any related context we already have in the
// profile's learnings or knowledge bases.
//
// This is a pure-function module. The renderer can call it
// from the chat (`/triage #123 #124 ...`) or from a future
// Triage screen. There is no new IPC channel; the renderer
// invokes `triageItems` via the existing `summarize` IPC
// path, OR — for now — we expose a dedicated `triage:run`
// handler that the renderer can call from a future Triage
// surface.
//
// The heuristics are deliberately simple:
//  - Title keywords (`bug`, `crash`, `regression`) bump
//    priority to P1.
//  - Title keywords (`docs`, `chore`, `cleanup`) drop
//    priority to P3.
//  - Files referenced in the body (matched by `path/to/
//    ext` regex) get cross-referenced with the existing
//    learnings that mention them.
//  - If the body mentions a knowledge page title, we
//    suggest linking it.

import { readLearnings, dedupeLearnings, type LearningDeduped } from "./learnings";
import { listSessions } from "./sessions";
import { join } from "path";
import { existsSync } from "fs";
import { profileHome } from "./utils";

export type TriagePriority = "P0" | "P1" | "P2" | "P3";

export interface TriageItemInput {
  /** Stable identifier (issue number, PR number, message id,
   *  or local key). */
  id: string;
  /** Short title, one line. */
  title: string;
  /** Optional body / description. */
  body?: string;
  /** Optional author / handle. */
  author?: string;
  /** Optional ISO 8601 timestamp. */
  createdAt?: string;
  /** Optional explicit kind (issue, pr, message, note). */
  kind?: string;
}

export interface TriageReportItem {
  id: string;
  title: string;
  kind: string;
  priority: TriagePriority;
  rationale: string;
  /** Suggested labels (github-style). */
  labels: string[];
  /** Other items in the batch that seem related (by keyword
   *  or file overlap). */
  related: string[];
  /** Files referenced in the body. */
  files: string[];
  /** Knowledge pages or learnings that mention the same
   *  files. */
  contextRefs: Array<{
    kind: "learning" | "wiki";
    key: string;
    insight: string;
  }>;
}

export interface TriageReport {
  generatedAt: string;
  items: TriageReportItem[];
  /** Markdown rendering of the report. */
  markdown: string;
}

const HIGH_KEYWORDS = [
  "crash",
  "panic",
  "data loss",
  "security",
  "regression",
  "broken",
  "outage",
  "leak",
];
const LOW_KEYWORDS = [
  "docs",
  "documentation",
  "chore",
  "cleanup",
  "typo",
  "comment",
  "refactor",
  "deprecation",
];
const FILE_PATTERN = /[A-Za-z0-9_./-]+\.[a-z]{1,5}/g;
const MAX_LABELS = 4;

/** Decide priority from a title and body using a small
 *  keyword heuristic. */
export function decidePriority(
  title: string,
  body: string | undefined,
): TriagePriority {
  const t = (title + " " + (body ?? "")).toLowerCase();
  if (HIGH_KEYWORDS.some((k) => t.includes(k))) return "P1";
  if (t.includes("urgent") || t.includes("asap")) return "P1";
  if (LOW_KEYWORDS.some((k) => t.includes(k))) return "P3";
  if (t.includes("feature") || t.includes("enhancement")) return "P2";
  return "P2";
}

/** Extract a small set of labels from title + body. We do
 *  this without an LLM by picking the first 4 distinctive
 *  tokens after light filtering. */
export function extractLabels(
  title: string,
  body: string | undefined,
): string[] {
  const text = ((title ?? "") + " " + (body ?? "")).toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && t.length <= 24)
    .filter((t) => !["this", "that", "with", "from", "have", "should"].includes(t));
  // Dedupe, preserve order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_LABELS) break;
  }
  return out;
}

/** Find file references in the body. We accept paths that
 *  end in a recognised file extension. */
export function extractFiles(body: string | undefined): string[] {
  if (!body) return [];
  const matches = body.match(FILE_PATTERN) ?? [];
  // Dedupe + filter to plausible file extensions
  const valid = /\.(ts|tsx|js|jsx|json|md|py|rs|go|java|kt|swift|rb|css|html|yml|yaml|sh|sql)$/i;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of matches) {
    if (!valid.test(m)) continue;
    if (seen.has(m)) continue;
    seen.add(m);
    out.push(m);
  }
  return out;
}

/** Cross-reference the files with the existing learnings log
 *  to surface context. */
function crossReferenceLearnings(
  files: string[],
  learnings: LearningDeduped[],
): TriageReportItem["contextRefs"] {
  if (files.length === 0) return [];
  const out: TriageReportItem["contextRefs"] = [];
  for (const l of learnings) {
    if (!l.files) continue;
    const overlap = l.files.filter((f) => files.includes(f));
    if (overlap.length > 0) {
      out.push({
        kind: "learning",
        key: l.key,
        insight: l.insight,
      });
    }
  }
  return out.slice(0, 5);
}

/** Cross-reference with the wiki raw-sources directory: if
 *  any of the files referenced exist on disk in the
 *  profile, surface them as "wiki" context. */
function crossReferenceWiki(
  files: string[],
  profile?: string,
): TriageReportItem["contextRefs"] {
  if (files.length === 0) return [];
  const home = profileHome(profile);
  const out: TriageReportItem["contextRefs"] = [];
  for (const f of files) {
    const fullPath = join(home, f);
    if (existsSync(fullPath)) {
      out.push({
        kind: "wiki",
        key: f,
        insight: `Found on disk in profile: ${fullPath}`,
      });
    }
  }
  return out.slice(0, 5);
}

/** Find related items within the same batch by keyword
 *  overlap. */
function findRelated(
  self: TriageItemInput,
  all: TriageItemInput[],
  selfFiles: string[],
): string[] {
  const selfTokens = new Set(
    self.title
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4),
  );
  const out: string[] = [];
  for (const other of all) {
    if (other.id === self.id) continue;
    const otherTokens = new Set(
      other.title.toLowerCase().split(/\s+/).filter((t) => t.length >= 4),
    );
    let score = 0;
    for (const t of selfTokens) {
      if (otherTokens.has(t)) score++;
    }
    const otherFiles = extractFiles(other.body);
    const fileOverlap = selfFiles.filter((f) => otherFiles.includes(f)).length;
    if (score + fileOverlap >= 2) {
      out.push(other.id);
    }
  }
  return out;
}

/** Run triage on a batch of items. Returns a report. */
export function triageItems(
  items: TriageItemInput[],
  profile?: string,
): TriageReport {
  const generatedAt = new Date().toISOString();
  if (items.length === 0) {
    return { generatedAt, items: [], markdown: "" };
  }
  const learnings = dedupeLearnings(readLearnings(profile));
  const reportItems: TriageReportItem[] = items.map((it) => {
    const priority = decidePriority(it.title, it.body);
    const labels = extractLabels(it.title, it.body);
    const files = extractFiles(it.body);
    const contextRefs: TriageReportItem["contextRefs"] = [
      ...crossReferenceLearnings(files, learnings),
      ...crossReferenceWiki(files, profile),
    ];
    const related = findRelated(it, items, files);
    const rationale = explainPriority(it, priority, labels, files);
    return {
      id: it.id,
      title: it.title,
      kind: it.kind ?? "item",
      priority,
      rationale,
      labels,
      related,
      files,
      contextRefs,
    };
  });
  return {
    generatedAt,
    items: reportItems,
    markdown: renderTriageMarkdown(reportItems, generatedAt),
  };
}

function explainPriority(
  item: TriageItemInput,
  priority: TriagePriority,
  labels: string[],
  files: string[],
): string {
  const parts: string[] = [];
  if (priority === "P1") {
    parts.push("Contains a high-priority keyword (crash/security/regression/urgent).");
  } else if (priority === "P3") {
    parts.push("Looks like a low-priority task (docs/chore/cleanup/typo).");
  } else {
    parts.push("Default P2 — neither urgent nor routine.");
  }
  if (files.length > 0) {
    parts.push(`Touches ${files.length} file${files.length === 1 ? "" : "s"}.`);
  }
  if (labels.length > 0) {
    parts.push(`Suggested labels: ${labels.join(", ")}.`);
  }
  if (item.author) {
    parts.push(`From ${item.author}.`);
  }
  return parts.join(" ");
}

function renderTriageMarkdown(
  items: TriageReportItem[],
  generatedAt: string,
): string {
  const lines: string[] = ["# Triage Report", ""];
  lines.push(`Generated ${generatedAt}. ${items.length} item${items.length === 1 ? "" : "s"}.`);
  lines.push("");
  // Group by priority
  const byPrio = new Map<TriagePriority, TriageReportItem[]>();
  for (const it of items) {
    if (!byPrio.has(it.priority)) byPrio.set(it.priority, []);
    byPrio.get(it.priority)!.push(it);
  }
  for (const p of ["P0", "P1", "P2", "P3"] as TriagePriority[]) {
    const group = byPrio.get(p);
    if (!group || group.length === 0) continue;
    lines.push(`## ${p}`);
    lines.push("");
    for (const it of group) {
      lines.push(`### \`${it.id}\` — ${it.title}`);
      lines.push("");
      lines.push(`- **Kind**: ${it.kind}`);
      lines.push(`- **Rationale**: ${it.rationale}`);
      if (it.labels.length > 0) {
        lines.push(`- **Suggested labels**: ${it.labels.map((l) => `\`${l}\``).join(", ")}`);
      }
      if (it.files.length > 0) {
        lines.push(`- **Files**: ${it.files.map((f) => `\`${f}\``).join(", ")}`);
      }
      if (it.contextRefs.length > 0) {
        lines.push(`- **Context**:`);
        for (const c of it.contextRefs) {
          lines.push(`  - _${c.kind}_\`${c.key}\`: ${c.insight}`);
        }
      }
      if (it.related.length > 0) {
        lines.push(`- **Related in batch**: ${it.related.map((r) => `\`${r}\``).join(", ")}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

/** Heuristic helper exposed for tests: given a set of items
 *  and the active session count, produce a one-line summary
 *  suitable for a notification. */
export function triageSummary(report: TriageReport): string {
  const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const it of report.items) counts[it.priority]++;
  return `Triage: ${counts.P0} P0, ${counts.P1} P1, ${counts.P2} P2, ${counts.P3} P3`;
}

/** Convenience for the renderer: produce a Triage report
 *  from the N most recent sessions. Useful for the future
 *  "triage my day" dashboard. */
export function triageRecentSessions(
  profile?: string,
  lookback: number = 10,
): TriageReport {
  const sessions = listSessions(lookback, 0);
  const items: TriageItemInput[] = sessions.map((s) => ({
    id: s.id,
    title: s.title ?? "(untitled session)",
    kind: "session",
    createdAt: new Date(s.startedAt).toISOString(),
    body: `${s.messageCount} messages, model ${s.model}`,
  }));
  return triageItems(items, profile);
}
