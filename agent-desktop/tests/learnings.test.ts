import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  appendLearning,
  clearLearningsFile,
  dedupeLearnings,
  exportLearningsAsMarkdown,
  findStaleLearnings,
  learningsFileInfo,
  parseLearningLine,
  readLearnings,
  searchLearnings,
  statsLearnings,
} from "../src/main/learnings";

/**
 * V2 Step 10 — learn TS module.
 *
 * The `learnings.jsonl` log is append-only, per-profile,
 * JSONL-shaped. The tests below pin the parsing, dedup,
 * search, stats, and export behaviour, plus the staleness
 * scan that powers the prune flow.
 */

// Mock the utils module so profileHome() resolves to a clean
// per-test directory. HERMES_HOME is otherwise a module-load
// const computed from the developer's actual ~/.hermes, which
// would leak data into the test runs.
const HOME = mkdtempSync(join(tmpdir(), "cubecloud-learnings-"));

vi.mock("../src/main/utils", () => ({
  profileHome: (profile?: unknown) => {
    if (profile === undefined || profile === "default" || profile === "") {
      return HOME;
    }
    return join(HOME, "profiles", String(profile));
  },
}));

beforeEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
  mkdirSync(HOME, { recursive: true });
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

describe("learnings — parseLearningLine", () => {
  it("parses a well-formed line", () => {
    const line =
      '{"ts":"2026-06-03T14:22:00Z","skill":"investigate","type":"pitfall","key":"eis-dir","insight":"foo","confidence":9,"source":"observed"}';
    const l = parseLearningLine(line);
    expect(l).not.toBeNull();
    expect(l?.key).toBe("eis-dir");
    expect(l?.type).toBe("pitfall");
    expect(l?.confidence).toBe(9);
  });

  it("returns null for blank lines and # comments", () => {
    expect(parseLearningLine("")).toBeNull();
    expect(parseLearningLine("   ")).toBeNull();
    expect(parseLearningLine("# this is a header")).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseLearningLine("{not json")).toBeNull();
  });

  it("returns null when required fields are missing", () => {
    expect(parseLearningLine('{"ts":"now"}')).toBeNull();
    // Missing `key` is fatal — it's the dedup key.
    expect(
      parseLearningLine('{"ts":"now","skill":"x","type":"pattern"}'),
    ).toBeNull();
  });

  it("accepts an empty-string insight (insight is not required)", () => {
    const l = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"","confidence":5,"source":"inferred"}',
    );
    expect(l).not.toBeNull();
    expect(l?.insight).toBe("");
  });

  it("rejects unknown types", () => {
    const line =
      '{"ts":"t","skill":"x","type":"rumor","key":"k","insight":"i","confidence":5,"source":"inferred"}';
    expect(parseLearningLine(line)).toBeNull();
  });

  it("clamps confidence to [1,10] and rounds", () => {
    const hi = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"i","confidence":99,"source":"inferred"}',
    );
    expect(hi?.confidence).toBe(10);
    const lo = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"i","confidence":-5,"source":"inferred"}',
    );
    expect(lo?.confidence).toBe(1);
    const nan = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"i","confidence":"five","source":"inferred"}',
    );
    expect(nan?.confidence).toBe(5);
  });

  it("accepts an optional files array of strings", () => {
    const l = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"i","confidence":5,"source":"inferred","files":["a.ts","b.ts"]}',
    );
    expect(l?.files).toEqual(["a.ts", "b.ts"]);
  });

  it("drops non-string entries from the files array", () => {
    const l = parseLearningLine(
      '{"ts":"t","skill":"x","type":"pattern","key":"k","insight":"i","confidence":5,"source":"inferred","files":["a.ts",42,null]}',
    );
    expect(l?.files).toEqual(["a.ts"]);
  });
});

describe("learnings — append + read", () => {
  it("returns an empty list when the file does not exist", () => {
    expect(readLearnings("default")).toEqual([]);
  });

  it("appends a learning and reads it back", () => {
    const learning = appendLearning(
      {
        skill: "investigate",
        type: "pitfall",
        key: "first-learning",
        insight: "Always stat() before parsing a path.",
        confidence: 9,
        source: "observed",
      },
      "default",
    );
    expect(learning.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const read = readLearnings("default");
    expect(read).toHaveLength(1);
    expect(read[0].key).toBe("first-learning");
  });

  it("preserves multiple appended entries in order", () => {
    appendLearning(
      {
        skill: "plan-eng-review",
        type: "pattern",
        key: "dedupe-overview",
        insight: "Skip the H1 preamble if next is `## Overview`.",
        confidence: 10,
        source: "user-stated",
      },
      "default",
    );
    appendLearning(
      {
        skill: "office-hours",
        type: "preference",
        key: "short-error-toasts",
        insight: "Show the action in the toast, not just the cause.",
        confidence: 8,
        source: "user-stated",
      },
      "default",
    );
    const all = readLearnings("default");
    expect(all).toHaveLength(2);
    expect(all[0].key).toBe("dedupe-overview");
    expect(all[1].key).toBe("short-error-toasts");
  });

  it("survives a hand-edited file with blank + comment lines", () => {
    const path = join(HOME, "learnings.jsonl");
    writeFileSync(
      path,
      [
        "# Header comment",
        '{"ts":"t1","skill":"x","type":"pattern","key":"a","insight":"one","confidence":5,"source":"inferred"}',
        "",
        "garbage line that is not json",
        '{"ts":"t2","skill":"x","type":"pitfall","key":"b","insight":"two","confidence":6,"source":"inferred"}',
      ].join("\n"),
      "utf-8",
    );
    const all = readLearnings("default");
    expect(all).toHaveLength(2);
    expect(all.map((l) => l.key)).toEqual(["a", "b"]);
  });
});

describe("learnings — dedupe", () => {
  it("collapses multiple events on the same (key, type) into one", () => {
    const learnings = [
      {
        ts: "2026-01-01T00:00:00Z",
        skill: "investigate",
        type: "pitfall" as const,
        key: "k1",
        insight: "old insight",
        confidence: 5,
        source: "inferred" as const,
      },
      {
        ts: "2026-02-01T00:00:00Z",
        skill: "investigate",
        type: "pitfall" as const,
        key: "k1",
        insight: "newer insight",
        confidence: 8,
        source: "observed" as const,
      },
    ];
    const dedup = dedupeLearnings(learnings);
    expect(dedup).toHaveLength(1);
    expect(dedup[0].insight).toBe("newer insight");
    expect(dedup[0].confidence).toBe(8);
    expect(dedup[0].count).toBe(2);
    expect(dedup[0].lastSeen).toBe("2026-02-01T00:00:00Z");
  });

  it("keeps different (key, type) pairs separate", () => {
    const learnings = [
      {
        ts: "t",
        skill: "x",
        type: "pattern" as const,
        key: "same-key",
        insight: "A",
        confidence: 5,
        source: "inferred" as const,
      },
      {
        ts: "t",
        skill: "x",
        type: "pitfall" as const,
        key: "same-key",
        insight: "B",
        confidence: 5,
        source: "inferred" as const,
      },
    ];
    const dedup = dedupeLearnings(learnings);
    expect(dedup).toHaveLength(2);
  });

  it("sorts by lastSeen descending", () => {
    const learnings = [
      {
        ts: "2026-01-01T00:00:00Z",
        skill: "x",
        type: "pattern" as const,
        key: "old",
        insight: "",
        confidence: 5,
        source: "inferred" as const,
      },
      {
        ts: "2026-06-01T00:00:00Z",
        skill: "x",
        type: "pattern" as const,
        key: "new",
        insight: "",
        confidence: 5,
        source: "inferred" as const,
      },
    ];
    const dedup = dedupeLearnings(learnings);
    expect(dedup.map((l) => l.key)).toEqual(["new", "old"]);
  });
});

describe("learnings — search", () => {
  beforeEach(() => {
    appendLearning(
      {
        skill: "investigate",
        type: "pitfall",
        key: "eis-dir-when-parsing-str",
        insight: "parsePlanBody reads a path string but /api/files sometimes returns a directory listing.",
        confidence: 9,
        source: "observed",
      },
      "default",
    );
    appendLearning(
      {
        skill: "office-hours",
        type: "preference",
        key: "short-error-toasts",
        insight: "Show the action in the toast, not just the cause.",
        confidence: 8,
        source: "user-stated",
      },
      "default",
    );
  });

  it("returns every learning when query is empty", () => {
    expect(searchLearnings("")).toHaveLength(2);
  });

  it("matches against key (case-insensitive)", () => {
    const results = searchLearnings("EIS-DIR");
    expect(results).toHaveLength(1);
    expect(results[0].key).toBe("eis-dir-when-parsing-str");
  });

  it("matches against insight", () => {
    const results = searchLearnings("directory listing");
    expect(results).toHaveLength(1);
  });

  it("matches against skill", () => {
    const results = searchLearnings("office-hours");
    expect(results).toHaveLength(1);
  });

  it("returns empty array when nothing matches", () => {
    expect(searchLearnings("nothing-matches-this")).toEqual([]);
  });
});

describe("learnings — stats", () => {
  it("computes counts, average confidence, and top keys", () => {
    appendLearning(
      {
        skill: "x",
        type: "pattern",
        key: "k1",
        insight: "",
        confidence: 8,
        source: "observed",
      },
      "default",
    );
    appendLearning(
      {
        skill: "x",
        type: "pattern",
        key: "k1",
        insight: "",
        confidence: 6,
        source: "observed",
      },
      "default",
    );
    appendLearning(
      {
        skill: "y",
        type: "pitfall",
        key: "k2",
        insight: "",
        confidence: 10,
        source: "user-stated",
      },
      "default",
    );
    // Direct sanity check: the file is where the mock says it
    // is. If the mock isn't being applied, this assertion
    // surfaces the actual location used by `appendLearning`.
    const expectedPath = join(HOME, "learnings.jsonl");
    expect(existsSync(expectedPath)).toBe(true);
    const explicit = readLearnings("default");
    expect(explicit).toHaveLength(3);
    // Read with the implicit "active profile" path. If the
    // mock isn't applied to the no-arg form, this assertion
    // will surface the actual path used.
    const implicit = readLearnings();
    expect(implicit).toHaveLength(3);
    const stats = statsLearnings();
    expect(stats.total).toBe(3);
    expect(stats.unique).toBe(2);
    expect(stats.byType.pattern).toBe(2);
    expect(stats.byType.pitfall).toBe(1);
    expect(stats.bySource.observed).toBe(2);
    expect(stats.bySource["user-stated"]).toBe(1);
    expect(stats.averageConfidence).toBe(8); // (8+6+10)/3
    expect(stats.topKeys[0]).toEqual({ key: "k1", count: 2 });
  });

  it("returns zeros for an empty file", () => {
    const stats = statsLearnings([]);
    expect(stats.total).toBe(0);
    expect(stats.unique).toBe(0);
    expect(stats.averageConfidence).toBe(0);
    expect(stats.topKeys).toEqual([]);
  });
});

describe("learnings — exportLearningsAsMarkdown", () => {
  it("renders an empty report when there are no learnings", () => {
    const md = exportLearningsAsMarkdown([]);
    expect(md).toContain("## Project Learnings");
    expect(md).toContain("No learnings");
  });

  it("groups learnings by type and includes confidence + lastSeen", () => {
    const md = exportLearningsAsMarkdown([
      {
        ts: "2026-06-03T14:22:00Z",
        skill: "investigate",
        type: "pitfall",
        key: "stat-before-parse",
        insight: "Always stat() before parsing a path.",
        confidence: 9,
        source: "observed",
      },
      {
        ts: "2026-06-01T10:00:00Z",
        skill: "office-hours",
        type: "preference",
        key: "short-toast",
        insight: "Show the action, not the cause.",
        confidence: 10,
        source: "user-stated",
      },
    ]);
    expect(md).toContain("### Pitfalls");
    expect(md).toContain("### Preferences");
    expect(md).toContain("**stat-before-parse**");
    expect(md).toContain("confidence: 9/10");
    expect(md).toContain("last seen: 2026-06-03");
  });
});

describe("learnings — staleness", () => {
  it("flags deduped learnings whose referenced file no longer exists", () => {
    const learnings = [
      {
        ts: "t",
        skill: "x",
        type: "pattern" as const,
        key: "uses-deleted-file",
        insight: "x",
        confidence: 5,
        source: "inferred" as const,
        files: ["does-not-exist.ts"],
      },
      {
        ts: "t",
        skill: "x",
        type: "pattern" as const,
        key: "all-files-present",
        insight: "y",
        confidence: 5,
        source: "inferred" as const,
        files: ["also-missing.ts", "still-missing.ts"],
      },
    ];
    const stale = findStaleLearnings(learnings);
    expect(stale.map((l) => l.key).sort()).toEqual([
      "all-files-present",
      "uses-deleted-file",
    ]);
  });

  it("respects a custom fileExists predicate", () => {
    const learnings = [
      {
        ts: "t",
        skill: "x",
        type: "pattern" as const,
        key: "k",
        insight: "x",
        confidence: 5,
        source: "inferred" as const,
        files: ["/always/exists"],
      },
    ];
    const stale = findStaleLearnings(learnings, () => true);
    expect(stale).toEqual([]);
  });

  it("does not flag learnings without a files field", () => {
    const learnings = [
      {
        ts: "t",
        skill: "x",
        type: "pattern" as const,
        key: "k",
        insight: "x",
        confidence: 5,
        source: "inferred" as const,
      },
    ];
    expect(findStaleLearnings(learnings)).toEqual([]);
  });
});

describe("learnings — file metadata", () => {
  it("returns exists=false for a missing file", () => {
    const info = learningsFileInfo("default");
    expect(info.exists).toBe(false);
    expect(info.size).toBe(0);
    expect(info.lastModified).toBeNull();
  });

  it("returns size + mtime after a write", () => {
    appendLearning(
      {
        skill: "x",
        type: "pattern",
        key: "k",
        insight: "x",
        confidence: 5,
        source: "inferred",
      },
      "default",
    );
    const info = learningsFileInfo("default");
    expect(info.exists).toBe(true);
    expect(info.size).toBeGreaterThan(0);
    expect(typeof info.lastModified).toBe("number");
  });

  it("clearLearningsFile empties an existing file", () => {
    appendLearning(
      {
        skill: "x",
        type: "pattern",
        key: "k",
        insight: "x",
        confidence: 5,
        source: "inferred",
      },
      "default",
    );
    clearLearningsFile("default");
    expect(readLearnings("default")).toEqual([]);
  });
});
