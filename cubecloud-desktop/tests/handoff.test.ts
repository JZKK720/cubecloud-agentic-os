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
 * V2.2 — /handoff skill tests.
 *
 * `buildHandoff` composes 4-5 sections (sessions,
 * learnings, kanban, wiki, optional "Read this first")
 * into a single markdown document. `saveHandoff` writes
 * the document to disk under `<profileHome>/handoff/`
 * with a timestamped filename. We test both pure
 * composition and the round-trip through disk.
 */

const HOME = mkdtempSync(join(tmpdir(), "cubecloud-handoff-"));

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
  wikiStatus: {
    indexExists: boolean;
    logExists: boolean;
    schemaExists: boolean;
  };
  wikiLog: { entries: Array<{ iso: string; kind: string; title: string; raw?: string }> };
} = {
  sessions: [],
  wikiStatus: { indexExists: false, logExists: false, schemaExists: false },
  wikiLog: { entries: [] },
};

vi.mock("../src/main/sessions", () => ({
  listSessions: (_limit?: number, _offset?: number) => fixtures.sessions,
}));

vi.mock("../src/main/wiki", () => ({
  getWikiStatus: (_profile?: string) => fixtures.wikiStatus,
  readWikiLog: (_profile?: string) => fixtures.wikiLog,
}));

import {
  buildAndSaveHandoff,
  buildHandoff,
  saveHandoff,
  type HandoffDoc,
} from "../src/main/handoff";

beforeEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
  mkdirSync(HOME, { recursive: true });
  fixtures.sessions.length = 0;
  fixtures.wikiStatus = { indexExists: false, logExists: false, schemaExists: false };
  fixtures.wikiLog = { entries: [] };
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

describe("handoff — buildHandoff", () => {
  it("returns a document with the 4 baseline sections", () => {
    const doc = buildHandoff("test-profile");
    expect(doc.profile).toBe("test-profile");
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);
    const headings = doc.sections.map((s) => s.heading);
    expect(headings).toContain("Recent sessions");
    expect(headings).toContain("Recent learnings");
    expect(headings).toContain("Pending tasks (kanban)");
    expect(headings).toContain("Wiki activity");
  });

  it("renders markdown with the profile name and ISO date", () => {
    const doc = buildHandoff("test-profile");
    expect(doc.markdown).toContain("# Handoff");
    expect(doc.markdown).toContain("test-profile");
    expect(doc.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("renders an empty-sessions message when there are none", () => {
    const doc = buildHandoff();
    const sessions = doc.sections.find((s) => s.heading === "Recent sessions")!;
    expect(sessions.body).toContain("No sessions");
  });

  it("includes each session's id, title, message count, and model", () => {
    fixtures.sessions = [
      {
        id: "abc12345xyz",
        title: "My session",
        startedAt: 1700000000000,
        messageCount: 4,
        model: "test-model",
      },
    ];
    const doc = buildHandoff();
    const sessions = doc.sections.find((s) => s.heading === "Recent sessions")!;
    expect(sessions.body).toContain("abc12345");
    expect(sessions.body).toContain("My session");
    expect(sessions.body).toContain("4 messages");
    expect(sessions.body).toContain("test-model");
  });

  it("falls back to '(untitled)' for sessions with no title", () => {
    fixtures.sessions = [
      {
        id: "abc12345",
        title: null,
        startedAt: 1,
        messageCount: 0,
        model: "m",
      },
    ];
    const doc = buildHandoff();
    const sessions = doc.sections.find((s) => s.heading === "Recent sessions")!;
    expect(sessions.body).toContain("(untitled)");
  });

  it("renders the empty-kanban message when no kanban files exist", () => {
    const doc = buildHandoff();
    const kanban = doc.sections.find(
      (s) => s.heading === "Pending tasks (kanban)",
    )!;
    expect(kanban.body).toContain("No kanban files");
  });

  it("parses kanban JSON files under <home>/kanban/", () => {
    const kanbanDir = join(HOME, "kanban");
    mkdirSync(kanbanDir, { recursive: true });
    writeFileSync(
      join(kanbanDir, "sprint-1.json"),
      JSON.stringify({
        tasks: [
          { id: "T1", title: "Fix bug", status: "todo" },
          { id: "T2", title: "Write docs", status: "done", owner: "alice" },
        ],
      }),
      "utf-8",
    );
    const doc = buildHandoff();
    const kanban = doc.sections.find(
      (s) => s.heading === "Pending tasks (kanban)",
    )!;
    expect(kanban.body).toContain("T1");
    expect(kanban.body).toContain("T2");
    expect(kanban.body).toContain("alice");
  });

  it("flags unparseable kanban files rather than throwing", () => {
    const kanbanDir = join(HOME, "kanban");
    mkdirSync(kanbanDir, { recursive: true });
    writeFileSync(join(kanbanDir, "bad.json"), "{this is not json", "utf-8");
    const doc = buildHandoff();
    const kanban = doc.sections.find(
      (s) => s.heading === "Pending tasks (kanban)",
    )!;
    expect(kanban.body).toContain("unparseable");
  });

  it("renders the 'wiki not bootstrapped' message when the wiki is empty", () => {
    const doc = buildHandoff();
    const wiki = doc.sections.find((s) => s.heading === "Wiki activity")!;
    expect(wiki.body).toContain("not bootstrapped");
  });

  it("renders wiki log entries when wiki is bootstrapped", () => {
    fixtures.wikiStatus = { indexExists: true, logExists: true, schemaExists: true };
    fixtures.wikiLog = {
      entries: [
        {
          iso: "2026-06-03T12:00:00Z",
          kind: "edit",
          title: "Onboarding flow",
          raw: "refactored the email step",
        },
      ],
    };
    const doc = buildHandoff();
    const wiki = doc.sections.find((s) => s.heading === "Wiki activity")!;
    expect(wiki.body).toContain("Onboarding flow");
    expect(wiki.body).toContain("edit");
  });

  it("omits the 'Read this first' section when no doc files exist", () => {
    const doc = buildHandoff();
    expect(doc.readFirst).toEqual([]);
    const readFirst = doc.sections.find((s) => s.heading === "Read this first");
    expect(readFirst).toBeUndefined();
  });

  it("includes 'Read this first' with README first when present", () => {
    writeFileSync(join(HOME, "CHANGELOG.md"), "v0.1", "utf-8");
    writeFileSync(join(HOME, "README.md"), "# Hello", "utf-8");
    writeFileSync(join(HOME, "notes.md"), "extra", "utf-8");
    const doc = buildHandoff();
    expect(doc.readFirst.length).toBeGreaterThan(0);
    expect(doc.readFirst[0].toLowerCase()).toContain("readme");
    const readFirst = doc.sections.find((s) => s.heading === "Read this first");
    expect(readFirst).toBeDefined();
  });

  it("defaults profile to 'default' when called with no argument", () => {
    const doc = buildHandoff();
    expect(doc.profile).toBe("default");
    expect(doc.markdown).toContain("`default`");
  });
});

describe("handoff — saveHandoff", () => {
  it("writes the markdown to <profileHome>/handoff/handoff-<ts>.md", () => {
    const doc = buildHandoff("save-test");
    const result = saveHandoff(doc);
    expect(existsSync(result.path)).toBe(true);
    expect(result.bytes).toBe(doc.markdown.length);
    expect(result.path).toMatch(/handoff-\d{4}-\d{2}-\d{2}T.*\.md$/);
    const written = readFileSync(result.path, "utf-8");
    expect(written).toBe(doc.markdown);
  });

  it("honours an explicit outDir override", () => {
    const customDir = join(HOME, "custom-out");
    const doc = buildHandoff();
    const result = saveHandoff(doc, customDir);
    expect(result.path.startsWith(customDir)).toBe(true);
    expect(existsSync(result.path)).toBe(true);
  });
});

describe("handoff — buildAndSaveHandoff", () => {
  it("returns both the doc and the save metadata", () => {
    const out = buildAndSaveHandoff("combined");
    expect(out.doc.profile).toBe("combined");
    expect(existsSync(out.saved.path)).toBe(true);
    expect(out.saved.bytes).toBe(out.doc.markdown.length);
  });
});
