import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// Mock utils before importing wiki so profileHome() points at a
// scratch directory. The real module uses process.env / homedir()
// and would write into the user's home otherwise.
const HOME = mkdtempSync(join(tmpdir(), "wiki-test-"));

vi.mock("../src/main/utils", () => ({
  profileHome: () => HOME,
  safeWriteFile: (filePath: string, content: string) => {
    mkdirSync(join(filePath, ".."), { recursive: true });
    writeFileSync(filePath, content, "utf-8");
  },
}));

describe("Karpathy-pattern wiki module", () => {
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

  it("reports a not-set-up state on a fresh profile", async () => {
    const { getWikiStatus } = await import("../src/main/wiki");
    const status = getWikiStatus();
    expect(status.indexExists).toBe(false);
    expect(status.logExists).toBe(false);
    expect(status.schemaExists).toBe(false);
    expect(status.rawSourceCount).toBe(0);
  });

  it("bootstraps the directory tree and seeds index/log/schema", async () => {
    const { bootstrapWiki, getWikiStatus } = await import("../src/main/wiki");
    const result = bootstrapWiki();
    expect(result.created.length).toBeGreaterThan(0);
    const status = getWikiStatus();
    expect(status.indexExists).toBe(true);
    expect(status.logExists).toBe(true);
    expect(status.schemaExists).toBe(true);
  });

  it("parses a populated index.md catalog", async () => {
    const { writeWikiIndex, readWikiIndex } = await import("../src/main/wiki");
    writeWikiIndex(
      "# Wiki Index\n\n## entities\n\n- [Hermes](entities/hermes.md) — agent runtime\n- [Memory](entities/memory.md) — persistent memory model\n\n## topics\n\n- [Wiki Pattern](topics/wiki-pattern.md) — Karpathy 3-layer memory\n\n",
    );
    const idx = readWikiIndex();
    expect(idx.entryCount).toBe(3);
    expect(idx.categories).toEqual(["entities", "topics"]);
    const hermes = idx.catalog.find((c) => c.title === "Hermes");
    expect(hermes?.summary).toBe("agent runtime");
    expect(hermes?.relPath).toBe("entities/hermes.md");
  });

  it("appends a greppable log entry", async () => {
    const { appendWikiLog, readWikiLog, bootstrapWiki } = await import(
      "../src/main/wiki"
    );
    bootstrapWiki();
    appendWikiLog(undefined, "ingest", "Article Title", "Body line");
    appendWikiLog(undefined, "query", "Topic");
    const log = readWikiLog();
    expect(log.entries.length).toBe(2);
    expect(log.entries[0].kind).toBe("ingest");
    expect(log.entries[1].kind).toBe("query");
    // The header is greppable: `grep "^## \[" log.md`
    const raw = log.raw;
    expect(
      raw.split(/\r?\n/).filter((l) => l.startsWith("## [")).length,
    ).toBe(2);
  });

  it("sandbox-resolves wiki page writes to under the wiki root", async () => {
    const { writeWikiPage, readWikiPage, bootstrapWiki } = await import(
      "../src/main/wiki"
    );
    bootstrapWiki();
    const ok = writeWikiPage("entities/hermes.md", "# Hermes\n");
    expect(ok.success).toBe(true);
    const back = readWikiPage("entities/hermes.md");
    expect(back.exists).toBe(true);
    expect(back.content).toContain("# Hermes");

    // Path traversal is rejected.
    const bad = writeWikiPage("../escape.md", "x");
    expect(bad.success).toBe(false);
  });
});
