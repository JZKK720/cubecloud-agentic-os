import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/**
 * V2.2 — /triage skill tests.
 *
 * `triageItems` runs the keyword/file heuristics over a
 * batch of input items and returns priority, labels, and
 * cross-references to existing learnings + on-disk wiki
 * files. `triageRecentSessions` is a thin shim over
 * `listSessions` that converts session rows into
 * `TriageItemInput` and forwards.
 */

// Mock utils so profileHome() resolves to a clean per-test
// directory.  Otherwise HERMES_HOME from utils.ts would
// resolve to the developer's real ~/.hermes and leak data.
const HOME = mkdtempSync(join(tmpdir(), "cubecloud-triage-"));

vi.mock("../src/main/utils", () => ({
  profileHome: (profile?: unknown) => {
    if (profile === undefined || profile === "default" || profile === "") {
      return HOME;
    }
    return join(HOME, "profiles", String(profile));
  },
}));

const fixtures: {
  sessions: Array<{
    id: string;
    title: string | null;
    startedAt: number;
    messageCount: number;
    model: string;
  }>;
} = { sessions: [] };

vi.mock("../src/main/sessions", () => ({
  listSessions: (_limit?: number, _offset?: number) => fixtures.sessions,
}));

import {
  decidePriority,
  extractFiles,
  extractLabels,
  triageItems,
  triageRecentSessions,
  triageSummary,
  type TriageItemInput,
} from "../src/main/triage";

beforeEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
  mkdirSync(HOME, { recursive: true });
  fixtures.sessions.length = 0;
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

describe("triage — decidePriority", () => {
  it("returns P1 for crash/security/regression keywords in title", () => {
    expect(decidePriority("App crashes on launch", undefined)).toBe("P1");
    expect(decidePriority("Security hole in auth", undefined)).toBe("P1");
    expect(decidePriority("Regression: profile reset", undefined)).toBe("P1");
    expect(decidePriority("URGENT please fix", undefined)).toBe("P1");
  });

  it("returns P3 for docs/chore/cleanup/typo", () => {
    expect(decidePriority("Docs: clarify README", undefined)).toBe("P3");
    expect(decidePriority("Cleanup dead code", undefined)).toBe("P3");
    expect(decidePriority("Fix typo in header", undefined)).toBe("P3");
  });

  it("returns P2 for feature/enhancement", () => {
    expect(decidePriority("Feature: dark mode", undefined)).toBe("P2");
    expect(decidePriority("Enhancement: faster load", undefined)).toBe("P2");
  });

  it("returns P2 as default", () => {
    expect(decidePriority("Some random thing", undefined)).toBe("P2");
    expect(decidePriority("", undefined)).toBe("P2");
  });

  it("checks body as well as title", () => {
    expect(
      decidePriority("Issue", "user reported a regression in the login flow"),
    ).toBe("P1");
  });
});

describe("triage — extractLabels", () => {
  it("returns up to 4 distinctive tokens", () => {
    const labels = extractLabels("Profile reset button doesn't work", undefined);
    expect(labels.length).toBeLessThanOrEqual(4);
    expect(labels.length).toBeGreaterThan(0);
  });

  it("strips very short and very long tokens", () => {
    const labels = extractLabels("a bb ccc dddd eeee ffff gggg hhhh", undefined);
    for (const l of labels) {
      expect(l.length).toBeGreaterThanOrEqual(4);
      expect(l.length).toBeLessThanOrEqual(24);
    }
  });

  it("filters common stopwords", () => {
    const labels = extractLabels("this should have with from", undefined);
    for (const l of labels) {
      expect(["this", "that", "with", "from", "have", "should"]).not.toContain(l);
    }
  });

  it("deduplicates tokens", () => {
    const labels = extractLabels(
      "profile profile profile reset reset reset",
      undefined,
    );
    const set = new Set(labels);
    expect(set.size).toBe(labels.length);
  });
});

describe("triage — extractFiles", () => {
  it("finds file paths with a recognised extension", () => {
    const body = "Look at src/main/foo.ts and tests/bar.test.ts please";
    const files = extractFiles(body);
    expect(files).toContain("src/main/foo.ts");
    expect(files).toContain("tests/bar.test.ts");
  });

  it("ignores false positives without a code extension", () => {
    const body = "see page 1.2 and 0.5 percent and url.example.com";
    const files = extractFiles(body);
    // No `.com` is a recognised code extension so this
    // should be empty.
    expect(files).toEqual([]);
  });

  it("returns empty for missing body", () => {
    expect(extractFiles(undefined)).toEqual([]);
    expect(extractFiles("")).toEqual([]);
  });

  it("deduplicates file references", () => {
    const body = "see src/main/foo.ts and src/main/foo.ts again";
    expect(extractFiles(body)).toEqual(["src/main/foo.ts"]);
  });
});

describe("triage — triageItems", () => {
  it("returns an empty report for an empty input", () => {
    const report = triageItems([]);
    expect(report.items).toEqual([]);
    expect(report.markdown).toBe("");
  });

  it("assigns P1, P2, P3 correctly across a mixed batch", () => {
    const items: TriageItemInput[] = [
      { id: "1", title: "Crash on startup", kind: "issue" },
      { id: "2", title: "Feature: dark mode", kind: "feature" },
      { id: "3", title: "Fix typo in docs", kind: "chore" },
    ];
    const report = triageItems(items);
    expect(report.items[0].priority).toBe("P1");
    expect(report.items[1].priority).toBe("P2");
    expect(report.items[2].priority).toBe("P3");
  });

  it("populates labels, files, related, kind, and rationale", () => {
    const items: TriageItemInput[] = [
      {
        id: "1",
        title: "Crash on startup",
        kind: "issue",
        body: "see src/main/app.ts and tests/app.test.ts",
      },
    ];
    const report = triageItems(items);
    const it = report.items[0];
    expect(it.id).toBe("1");
    expect(it.kind).toBe("issue");
    expect(it.files).toContain("src/main/app.ts");
    expect(it.labels.length).toBeGreaterThan(0);
    expect(it.rationale.length).toBeGreaterThan(0);
    expect(Array.isArray(it.related)).toBe(true);
  });

  it("links related items by shared keyword", () => {
    const items: TriageItemInput[] = [
      { id: "1", title: "Profile reset button broken" },
      { id: "2", title: "Profile reset confirmation missing" },
      { id: "3", title: "Add export feature" },
    ];
    const report = triageItems(items);
    const one = report.items.find((i) => i.id === "1")!;
    expect(one.related).toContain("2");
    expect(one.related).not.toContain("3");
  });

  it("renders markdown that mentions each item by id", () => {
    const items: TriageItemInput[] = [
      { id: "X-1", title: "Crash on startup" },
      { id: "X-2", title: "Fix typo in docs" },
    ];
    const report = triageItems(items);
    expect(report.markdown).toContain("X-1");
    expect(report.markdown).toContain("X-2");
    expect(report.markdown).toContain("# Triage Report");
  });
});

describe("triage — triageRecentSessions", () => {
  it("returns an empty report when there are no sessions", () => {
    const report = triageRecentSessions();
    expect(report.items).toEqual([]);
  });

  it("wraps each session as a TriageItemInput with kind='session'", () => {
    fixtures.sessions = [
      {
        id: "s1",
        title: "Triage test session",
        startedAt: 1700000000,
        messageCount: 7,
        model: "test-model",
      },
    ];
    const report = triageRecentSessions();
    expect(report.items).toHaveLength(1);
    expect(report.items[0].id).toBe("s1");
    expect(report.items[0].kind).toBe("session");
    expect(report.items[0].title).toBe("Triage test session");
  });

  it("falls back to '(untitled session)' for null titles", () => {
    fixtures.sessions = [
      {
        id: "s1",
        title: null,
        startedAt: 1,
        messageCount: 0,
        model: "m",
      },
    ];
    const report = triageRecentSessions();
    expect(report.items[0].title).toBe("(untitled session)");
  });
});

describe("triage — triageSummary", () => {
  it("returns a one-line count summary", () => {
    const items: TriageItemInput[] = [
      { id: "1", title: "Crash" },
      { id: "2", title: "Crash urgent" },
      { id: "3", title: "Feature X" },
      { id: "4", title: "Typo in docs" },
    ];
    const report = triageItems(items);
    const summary = triageSummary(report);
    expect(summary).toContain("2 P1");
    expect(summary).toContain("1 P2");
    expect(summary).toContain("1 P3");
  });

  it("returns all-zero summary for an empty report", () => {
    const summary = triageSummary({ generatedAt: "", items: [], markdown: "" });
    expect(summary).toContain("0 P0");
    expect(summary).toContain("0 P1");
    expect(summary).toContain("0 P2");
    expect(summary).toContain("0 P3");
  });
});
