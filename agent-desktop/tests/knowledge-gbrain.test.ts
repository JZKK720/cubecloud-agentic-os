import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  KNOWLEDGE_TOOLS,
  knowledgeGet,
  knowledgeList,
  knowledgeRawSources,
  knowledgeSearch,
} from "../src/main/knowledge";

/**
 * V2 Step 14 — gbrain-style knowledge MCP verbs.
 *
 * The knowledge module exposes the same shape gbrain does over
 * its MCP bridge (search, get, list, sources), and ships a
 * `KNOWLEDGE_TOOLS` manifest the renderer can register with
 * the agent's tool-use layer.
 */

// Mock utils so the wiki paths resolve to a clean per-test
// directory. The cubecloud helpers compute HOME at module-load
// time and would otherwise leak the developer's actual data
// into the test runs.
const HOME = mkdtempSync(join(tmpdir(), "cubecloud-knowledge-"));

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
  mkdirSync(join(HOME, "wiki"), { recursive: true });
});

afterEach(() => {
  if (existsSync(HOME)) {
    rmSync(HOME, { recursive: true, force: true });
  }
});

function writePage(relPath: string, body: string): void {
  const full = join(HOME, "wiki", "pages", relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf-8");
}

function writeRaw(filename: string, body: string): void {
  const full = join(HOME, "wiki", "raw", "sources", filename);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf-8");
}

describe("knowledge manifest", () => {
  it("ships the four canonical verbs", () => {
    const names = KNOWLEDGE_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "knowledge.get",
      "knowledge.list",
      "knowledge.search",
      "knowledge.sources",
    ]);
  });

  it("every tool has a non-empty description + inputSchema", () => {
    for (const tool of KNOWLEDGE_TOOLS) {
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });
});

describe("knowledge.search", () => {
  it("returns a synthesis with sources and a snippet per source", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const result = knowledgeSearch("Alice", "default");
    expect(result.query).toBe("Alice");
    expect(result.sources.length).toBeGreaterThan(0);
    for (const src of result.sources) {
      expect(src.snippet).toBeTruthy();
      expect(src.relPath).toBe("people/alice.md");
    }
  });

  it("returns an empty result for a topic with no matching pages", () => {
    const result = knowledgeSearch("nothing-on-this-topic", "default");
    expect(result.sources).toEqual([]);
    expect(result.synthesis.claims).toEqual([]);
    expect(result.synthesis.markdown).toContain("No matching sources");
  });

  it("surfaces gaps the renderer can show to the user", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const result = knowledgeSearch("Alice", "default");
    expect(result.synthesis.gaps.length).toBeGreaterThan(0);
  });
});

describe("knowledge.get", () => {
  it("reads a page by relative path with title + type", () => {
    writePage(
      "projects/cubecloud.md",
      [
        "# cubecloud",
        "",
        "A desktop app for AI agents.",
      ].join("\n"),
    );
    const page = knowledgeGet("projects/cubecloud.md", "default");
    expect(page).not.toBeNull();
    expect(page?.title).toBe("cubecloud");
    expect(page?.type).toBe("project");
    expect(page?.body).toContain("A desktop app for AI agents.");
  });

  it("returns null when the page is missing", () => {
    expect(knowledgeGet("people/missing.md", "default")).toBeNull();
  });

  it("falls back to the relPath as title when the page has no H1", () => {
    writePage("scratch/note.md", "Some prose, no heading.");
    const page = knowledgeGet("scratch/note.md", "default");
    expect(page?.title).toBe("scratch/note.md");
    // Type falls through to the catch-all (note in the base pack).
    expect(page?.type).toBe("note");
  });
});

describe("knowledge.list", () => {
  it("returns every page on disk", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    writePage(
      "people/bob.md",
      [
        "# Bob",
        "",
        "Bob joined Acme as a contractor.",
      ].join("\n"),
    );
    writePage(
      "projects/cubecloud.md",
      [
        "# cubecloud",
        "",
        "A desktop app for AI agents.",
      ].join("\n"),
    );
    const all = knowledgeList({}, "default");
    expect(all.map((p) => p.relPath).sort()).toEqual([
      "people/alice.md",
      "people/bob.md",
      "projects/cubecloud.md",
    ]);
  });

  it("filters by schema-pack type", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    writePage(
      "projects/cubecloud.md",
      [
        "# cubecloud",
        "",
        "A desktop app for AI agents.",
      ].join("\n"),
    );
    const people = knowledgeList({ type: "person" }, "default");
    expect(people.map((p) => p.relPath)).toEqual(["people/alice.md"]);
    const projects = knowledgeList({ type: "project" }, "default");
    expect(projects.map((p) => p.relPath)).toEqual(["projects/cubecloud.md"]);
  });

  it("returns an empty list when the wiki is empty", () => {
    expect(knowledgeList({}, "default")).toEqual([]);
  });
});

describe("knowledge.sources", () => {
  it("returns every raw source sorted by lastModified desc", () => {
    writeRaw("a.md", "first");
    // Make sure the mtimes differ so the order is deterministic.
    const sleep = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));
    return sleep(5).then(() => {
      writeRaw("b.md", "second");
      const sources = knowledgeRawSources("default");
      const names = sources.map((s) => s.filename);
      expect(names).toEqual(["b.md", "a.md"]);
    });
  });

  it("returns an empty list when there are no raw sources", () => {
    expect(knowledgeRawSources("default")).toEqual([]);
  });
});
