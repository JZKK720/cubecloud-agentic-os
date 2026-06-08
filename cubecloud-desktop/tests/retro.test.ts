import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * V2.2 — /retro skill tests.
 *
 * `summarizeRetro` walks the last N sessions, counts tool
 * calls, and surfaces "pattern" / "preference" proposals.
 * `commitRetro` appends the kept ones to learnings.jsonl
 * with `source: "inferred"`. `exportRetroMarkdown` returns
 * a ready-to-paste report. We exercise all three plus the
 * heuristics that drive proposal generation.
 */

// Mock utils so profileHome() resolves to a clean per-test
// directory under tmp.  Otherwise the developer's real
// ~/.hermes would leak into the run.
const HOME = mkdtempSync(join(tmpdir(), "cubecloud-retro-"));

vi.mock("../src/main/utils", () => ({
  profileHome: (profile?: unknown) => {
    if (profile === undefined || profile === "default" || profile === "") {
      return HOME;
    }
    return join(HOME, "profiles", String(profile));
  },
}));

// Stub the sessions module so we can hand-build sessions +
// messages without booting sqlite.
const fixtures: {
  sessions: Array<{
    id: string;
    title: string | null;
    startedAt: number;
    messageCount: number;
    model: string;
  }>;
  messages: Map<string, Array<unknown>>;
} = {
  sessions: [],
  messages: new Map(),
};

vi.mock("../src/main/sessions", () => ({
  listSessions: (_limit?: number, _offset?: number) => fixtures.sessions,
  getSessionMessages: (sessionId: string) =>
    (fixtures.messages.get(sessionId) ?? []) as never,
}));

import {
  buildRetroContext,
  commitRetro,
  exportRetroMarkdown,
  renderRetroMarkdown,
  summarizeRetro,
  type RetroLearning,
  type RetroReport,
} from "../src/main/retro";

beforeEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
  mkdirSync(HOME, { recursive: true });
  fixtures.sessions.length = 0;
  fixtures.messages.clear();
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

function addSession(
  id: string,
  title: string,
  startedAt: number,
  messages: unknown[],
): void {
  fixtures.sessions.push({
    id,
    title,
    startedAt,
    messageCount: messages.length,
    model: "test-model",
  });
  fixtures.messages.set(id, messages);
}

describe("retro — summarizeRetro", () => {
  it("returns an empty report when there are no sessions", () => {
    const report = summarizeRetro();
    expect(report.sessionCount).toBe(0);
    expect(report.sessionSummaries).toEqual([]);
    expect(report.proposed).toEqual([]);
    expect(typeof report.generatedAt).toBe("string");
  });

  it("proposes a pattern when a tool is called >= 3 times", () => {
    addSession("s1", "first", 1, [
      { kind: "tool_call", name: "read_file" },
      { kind: "tool_call", name: "read_file" },
      { kind: "tool_call", name: "read_file" },
    ]);
    const report = summarizeRetro();
    expect(report.sessionCount).toBe(1);
    const pattern = report.proposed.find((p) => p.key === "read_file-recurrent");
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe("pattern");
    expect(pattern?.source).toBe("inferred");
    expect(pattern?.evidence).toContain("read_file");
  });

  it("does not propose patterns for tools called fewer than 3 times", () => {
    addSession("s1", "light", 1, [
      { kind: "tool_call", name: "shell" },
      { kind: "tool_call", name: "shell" },
    ]);
    const report = summarizeRetro();
    expect(report.proposed).toEqual([]);
  });

  it("proposes a preference for user corrections after a tool call", () => {
    addSession("s1", "fix", 1, [
      { kind: "tool_call", name: "edit_file" },
      { kind: "user", content: "Don't use edit_file; use a patch instead" },
    ]);
    const report = summarizeRetro();
    const pref = report.proposed.find(
      (p) => p.key === "edit_file-user-correction",
    );
    expect(pref).toBeDefined();
    expect(pref?.type).toBe("preference");
    expect(pref?.source).toBe("user-stated");
    expect(pref?.insight).toContain("edit_file");
  });

  it("catches 'rather than' phrasing as a correction", () => {
    addSession("s1", "alt", 1, [
      { kind: "tool_call", name: "shell" },
      { kind: "user", content: "Please use git stash rather than git reset" },
    ]);
    const report = summarizeRetro();
    const pref = report.proposed.find(
      (p) => p.key === "shell-user-correction",
    );
    expect(pref).toBeDefined();
  });

  it("caps proposals at MAX_PROPOSALS (5)", () => {
    addSession("s1", "busy", 1, [
      { kind: "tool_call", name: "read_file" },
      { kind: "tool_call", name: "shell" },
      { kind: "tool_call", name: "edit_file" },
      { kind: "tool_call", name: "search" },
      { kind: "tool_call", name: "list" },
      { kind: "tool_call", name: "diff" },
      { kind: "tool_call", name: "commit" },
    ]);
    addSession("s2", "busy2", 2, [
      { kind: "tool_call", name: "read_file" },
      { kind: "tool_call", name: "shell" },
      { kind: "tool_call", name: "edit_file" },
      { kind: "tool_call", name: "search" },
      { kind: "tool_call", name: "list" },
      { kind: "tool_call", name: "diff" },
      { kind: "tool_call", name: "commit" },
    ]);
    const report = summarizeRetro();
    expect(report.proposed.length).toBeLessThanOrEqual(5);
  });

  it("records sessionSummaries with sessionId, title, startedAt, messageCount", () => {
    addSession("s1", "t1", 1700000000, []);
    addSession("s2", null, 1700001000, []);
    const report = summarizeRetro();
    expect(report.sessionSummaries).toHaveLength(2);
    expect(report.sessionSummaries[0].sessionId).toBe("s1");
    expect(report.sessionSummaries[0].title).toBe("t1");
    expect(report.sessionSummaries[1].title).toBeNull();
  });
});

describe("retro — buildRetroContext", () => {
  it("returns a markdown rendering and existingTop", () => {
    addSession("s1", "t", 1, []);
    const ctx = buildRetroContext();
    expect(ctx.report.sessionCount).toBe(1);
    expect(ctx.markdown).toContain("# Retro");
    expect(Array.isArray(ctx.existingTop)).toBe(true);
  });

  it("existingTop is empty when there are no prior learnings", () => {
    addSession("s1", "t", 1, []);
    const ctx = buildRetroContext();
    expect(ctx.existingTop).toEqual([]);
  });
});

describe("retro — commitRetro", () => {
  it("appends a JSONL line to learnings.jsonl per kept proposal", () => {
    const proposals: RetroLearning[] = [
      {
        type: "pattern",
        key: "read_file-recurrent",
        insight: "Heavy use of read_file",
        confidence: 6,
        source: "inferred",
        evidence: "called 7 times",
      },
    ];
    const result = commitRetro(proposals);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("read_file-recurrent");
    expect(result[0].skill).toBe("retro");
    const logPath = join(HOME, "learnings.jsonl");
    expect(existsSync(logPath)).toBe(true);
    const text = readFileSync(logPath, "utf-8").trim();
    expect(text).toContain("read_file-recurrent");
    expect(text).toContain('"skill":"retro"');
    expect(text).toContain('"source":"inferred"');
  });

  it("skips empty proposal arrays without writing", () => {
    const result = commitRetro([]);
    expect(result).toEqual([]);
    const logPath = join(HOME, "learnings.jsonl");
    expect(existsSync(logPath)).toBe(false);
  });

  it("appends multiple lines when committing many proposals", () => {
    const proposals: RetroLearning[] = [
      {
        type: "pattern",
        key: "k1",
        insight: "one",
        confidence: 5,
        source: "inferred",
        evidence: "ev1",
      },
      {
        type: "preference",
        key: "k2",
        insight: "two",
        confidence: 7,
        source: "user-stated",
        evidence: "ev2",
      },
    ];
    const result = commitRetro(proposals);
    expect(result).toHaveLength(2);
    const text = readFileSync(join(HOME, "learnings.jsonl"), "utf-8");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
  });
});

describe("retro — exportRetroMarkdown", () => {
  it("returns the full learnings log as markdown", () => {
    const md = exportRetroMarkdown();
    expect(typeof md).toBe("string");
    // exportLearningsAsMarkdown emits a heading on first call.
    expect(md.length).toBeGreaterThan(0);
  });

  it("includes committed retro proposals after a commit", () => {
    addSession("s1", "t", 1, []);
    const proposals: RetroLearning[] = [
      {
        type: "pattern",
        key: "alpha-recurrent",
        insight: "alpha is heavy",
        confidence: 6,
        source: "inferred",
        evidence: "called 4 times",
      },
    ];
    commitRetro(proposals);
    const md = exportRetroMarkdown();
    expect(md).toContain("alpha-recurrent");
  });
});

describe("retro — renderRetroMarkdown", () => {
  it("starts with a 'Retro Report' heading", () => {
    const report: RetroReport = {
      generatedAt: "2026-06-03T12:00:00Z",
      sessionCount: 0,
      sessionSummaries: [],
      proposed: [],
    };
    const md = renderRetroMarkdown(report, []);
    expect(md).toMatch(/^# Retro Report/);
  });

  it("includes a 'No proposed learnings' section when empty", () => {
    const report: RetroReport = {
      generatedAt: "2026-06-03T12:00:00Z",
      sessionCount: 1,
      sessionSummaries: [],
      proposed: [],
    };
    const md = renderRetroMarkdown(report, []);
    expect(md).toContain("No proposed learnings");
  });

  it("lists each proposed learning with its key and confidence", () => {
    const report: RetroReport = {
      generatedAt: "2026-06-03T12:00:00Z",
      sessionCount: 2,
      sessionSummaries: [],
      proposed: [
        {
          type: "pattern",
          key: "shell-recurrent",
          insight: "shell is heavy",
          confidence: 7,
          source: "inferred",
          evidence: "called 9 times",
        },
      ],
    };
    const md = renderRetroMarkdown(report, []);
    expect(md).toContain("shell-recurrent");
    expect(md).toContain("confidence 7/10");
  });

  it("includes the 'Already in your learnings log' section when provided", () => {
    const report: RetroReport = {
      generatedAt: "2026-06-03T12:00:00Z",
      sessionCount: 0,
      sessionSummaries: [],
      proposed: [],
    };
    const md = renderRetroMarkdown(report, [
      { key: "k", insight: "i", type: "pitfall" },
    ]);
    expect(md).toContain("Already in your learnings log");
    expect(md).toContain("pitfall");
  });
});
