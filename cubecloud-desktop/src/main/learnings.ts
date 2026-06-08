// /learn (Step 10 of the V2 rollout, ported from gstack).
//
// Per-profile `learnings.jsonl`: an append-only JSONL log of
// durable patterns, pitfalls, preferences, and architecture
// decisions. The cubecloud auto-captures events from chat,
// kanban-dispatch, and review flows; the user can also log
// entries manually.
//
// Storage shape (one event per line):
//
//   {"ts":"...","skill":"investigate","type":"pitfall",
//    "key":"eis-dir-when-parsing-str","insight":"...",
//    "confidence":9,"source":"observed","files":["..."]}
//
// The latest entry on a given (key, type) pair wins on dedup;
// older entries stay in the file for audit. This module is the
// pure read/write/aggregate half of the feature; the renderer
// exposes the user-facing surface (recent / search / prune /
// export / stats / manual add).

import {
  existsSync,
  readFileSync,
  appendFileSync,
  writeFileSync,
  statSync,
} from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/** The six canonical learning types. */
export type LearningType =
  | "pattern"
  | "pitfall"
  | "preference"
  | "architecture"
  | "tool"
  | "operational";

/** The four sources a learning can come from. */
export type LearningSource =
  | "observed"
  | "user-stated"
  | "inferred"
  | "cross-model";

/** A single event in the project's learnings log. */
export interface Learning {
  /** ISO 8601 timestamp. */
  ts: string;
  /** The cubecloud skill that logged the entry. */
  skill: string;
  /** The kind of insight. */
  type: LearningType;
  /** Short kebab-case slug, 2-5 words. Dedup key together with `type`. */
  key: string;
  /** One-sentence description. */
  insight: string;
  /** 1-10 confidence. 10 = user stated, 8-9 = verified, 4-5 = guessing. */
  confidence: number;
  /** Where the learning came from. */
  source: LearningSource;
  /** Optional file references for staleness detection. */
  files?: string[];
}

/** A learning after dedup. The `count` is how many raw entries
 *  collapsed into this one. */
export interface LearningDeduped extends Learning {
  /** Number of raw events that map to this learning. */
  count: number;
  /** ISO 8601 timestamp of the latest raw event. */
  lastSeen: string;
}

const ALL_TYPES: readonly LearningType[] = [
  "pattern",
  "pitfall",
  "preference",
  "architecture",
  "tool",
  "operational",
];

const ALL_SOURCES: readonly LearningSource[] = [
  "observed",
  "user-stated",
  "inferred",
  "cross-model",
];

function isLearningType(value: unknown): value is LearningType {
  return typeof value === "string" && (ALL_TYPES as readonly string[]).includes(value);
}

function isLearningSource(value: unknown): value is LearningSource {
  return (
    typeof value === "string" &&
    (ALL_SOURCES as readonly string[]).includes(value)
  );
}

/** Clamp a confidence value to [1, 10] and round. */
function clampConfidence(value: unknown): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 5;
  const rounded = Math.round(n);
  if (rounded < 1) return 1;
  if (rounded > 10) return 10;
  return rounded;
}

/** Coerce an unknown JSON line into a `Learning` or null. The
 *  JSONL file is user-editable, so we never throw on a bad
 *  line — we just skip it. */
export function parseLearningLine(line: string): Learning | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof obj !== "object" || obj === null) return null;
    const ts = typeof obj["ts"] === "string" ? obj["ts"] : null;
    const skill = typeof obj["skill"] === "string" ? obj["skill"] : null;
    const type = obj["type"];
    const key = typeof obj["key"] === "string" ? obj["key"] : null;
    const insight = typeof obj["insight"] === "string" ? obj["insight"] : null;
    if (!ts || !skill || !key) return null;
    if (typeof insight !== "string") return null;
    if (!isLearningType(type)) return null;
    const source = isLearningSource(obj["source"])
      ? obj["source"]
      : "inferred";
    const files = Array.isArray(obj["files"])
      ? obj["files"].filter((f): f is string => typeof f === "string")
      : undefined;
    const learning: Learning = {
      ts,
      skill,
      type,
      key,
      insight,
      confidence: clampConfidence(obj["confidence"]),
      source,
    };
    if (files) learning.files = files;
    return learning;
  } catch {
    return null;
  }
}

/** Where the file lives for the given profile. */
function learningsPath(profile?: string): string {
  return join(profileHome(profile), "learnings.jsonl");
}

/** Read every learning from disk, parsing each JSONL line.
 *  Skips blank / malformed / comment lines silently. */
export function readLearnings(profile?: string): Learning[] {
  const filePath = learningsPath(profile);
  if (!existsSync(filePath)) return [];
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    return [];
  }
  const out: Learning[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const learning = parseLearningLine(line);
    if (learning) out.push(learning);
  }
  return out;
}

/** Append a new learning to the file. Caller is responsible for
 *  supplying a well-formed `Learning` (ts, skill, type, key,
 *  insight, confidence, source). Returns the stored learning
 *  after `ts` is normalized to an ISO string if needed. */
export function appendLearning(
  input: Omit<Learning, "ts"> & { ts?: string },
  profile?: string,
): Learning {
  const ts = input.ts ?? new Date().toISOString();
  const learning: Learning = {
    ts,
    skill: input.skill,
    type: input.type,
    key: input.key,
    insight: input.insight,
    confidence: clampConfidence(input.confidence),
    source: input.source,
    ...(input.files ? { files: input.files } : {}),
  };
  const filePath = learningsPath(profile);
  // Atomic-ish: read first, then write back with the new line.
  // We deliberately use appendFileSync for the hot path; tests
  // can clear the file by deleting it. On first ever write,
  // appendFileSync creates the file.
  appendFileSync(filePath, JSON.stringify(learning) + "\n", "utf-8");
  return learning;
}

/** Dedupe learnings: the latest entry on (key, type) wins;
 *  count is how many raw events collapsed. Sorted by `lastSeen`
 *  descending. */
export function dedupeLearnings(learnings: Learning[]): LearningDeduped[] {
  const byKey = new Map<string, LearningDeduped>();
  for (const l of learnings) {
    const dedupKey = `${l.type}::${l.key}`;
    const existing = byKey.get(dedupKey);
    if (!existing) {
      byKey.set(dedupKey, {
        ...l,
        count: 1,
        lastSeen: l.ts,
      });
      continue;
    }
    existing.count += 1;
    if (l.ts > existing.lastSeen) {
      existing.lastSeen = l.ts;
      existing.insight = l.insight;
      existing.confidence = l.confidence;
      existing.source = l.source;
      existing.skill = l.skill;
      existing.ts = l.ts;
      if (l.files) existing.files = l.files;
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.lastSeen < b.lastSeen ? 1 : -1,
  );
}

/** Search deduped learnings: case-insensitive substring match
 *  against `key`, `insight`, and `skill`. */
export function searchLearnings(
  query: string,
  learnings?: Learning[],
): LearningDeduped[] {
  const all = learnings ?? readLearnings();
  const dedup = dedupeLearnings(all);
  const q = query.trim().toLowerCase();
  if (!q) return dedup;
  return dedup.filter(
    (l) =>
      l.key.toLowerCase().includes(q) ||
      l.insight.toLowerCase().includes(q) ||
      l.skill.toLowerCase().includes(q),
  );
}

/** Compute summary statistics over a set of learnings. */
export interface LearningStats {
  total: number;
  unique: number;
  byType: Record<LearningType, number>;
  bySource: Record<LearningSource, number>;
  averageConfidence: number;
  topKeys: Array<{ key: string; count: number }>;
}

export function statsLearnings(learnings?: Learning[]): LearningStats {
  const all = learnings ?? readLearnings();
  const dedup = dedupeLearnings(all);

  const byType = Object.fromEntries(
    ALL_TYPES.map((t) => [t, 0]),
  ) as Record<LearningType, number>;
  const bySource = Object.fromEntries(
    ALL_SOURCES.map((s) => [s, 0]),
  ) as Record<LearningSource, number>;
  let confidenceSum = 0;

  for (const l of all) {
    byType[l.type] += 1;
    bySource[l.source] += 1;
    confidenceSum += l.confidence;
  }

  const keyCounts = new Map<string, number>();
  for (const l of all) {
    keyCounts.set(l.key, (keyCounts.get(l.key) ?? 0) + 1);
  }
  const topKeys = [...keyCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: all.length,
    unique: dedup.length,
    byType,
    bySource,
    averageConfidence:
      all.length > 0
        ? Math.round((confidenceSum / all.length) * 10) / 10
        : 0,
    topKeys,
  };
}

/** Render deduped learnings as a markdown report grouped by
 *  type. Used by the export command and the renderer. */
export function exportLearningsAsMarkdown(
  learnings?: Learning[],
): string {
  const dedup = learnings ? dedupeLearnings(learnings) : dedupeLearnings(readLearnings());
  if (dedup.length === 0) {
    return "## Project Learnings\n\n_No learnings recorded yet._\n";
  }
  const lines: string[] = ["## Project Learnings", ""];
  for (const type of ALL_TYPES) {
    const group = dedup.filter((l) => l.type === type);
    if (group.length === 0) continue;
    const heading = type.charAt(0).toUpperCase() + type.slice(1) + "s";
    lines.push(`### ${heading}`);
    for (const l of group) {
      const lastSeen = l.lastSeen.slice(0, 10);
      lines.push(
        `- **${l.key}**: ${l.insight} (confidence: ${l.confidence}/10, last seen: ${lastSeen})`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Staleness scan: which deduped learnings reference files that
 *  no longer exist. The renderer turns this into a prune UI. */
export function findStaleLearnings(
  learnings: Learning[],
  fileExists: (path: string) => boolean = existsSync,
): LearningDeduped[] {
  const dedup = dedupeLearnings(learnings);
  return dedup.filter((l) => {
    if (!l.files || l.files.length === 0) return false;
    return l.files.some((f) => !fileExists(f));
  });
}

/** File size (bytes) and last-modified time, used by the
 *  renderer to show "last updated" timestamps. */
export function learningsFileInfo(
  profile?: string,
): { exists: boolean; size: number; lastModified: number | null } {
  const filePath = learningsPath(profile);
  if (!existsSync(filePath)) {
    return { exists: false, size: 0, lastModified: null };
  }
  try {
    const st = statSync(filePath);
    return { exists: true, size: st.size, lastModified: st.mtimeMs };
  } catch {
    return { exists: true, size: 0, lastModified: null };
  }
}

/** Test-only: clear the learnings file. Production code never
 *  invokes this; the file is append-only. */
export function clearLearningsFile(profile?: string): void {
  const filePath = learningsPath(profile);
  if (existsSync(filePath)) {
    writeFileSync(filePath, "", "utf-8");
  }
}
