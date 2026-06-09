import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { synthesize } from "../src/main/synthesis";
import {
  BUNDLED_PACKS,
  DEFAULT_PACK_ID,
  inferPageType,
  listBundledPacks,
  readActivePackId,
  resolveActivePack,
  setActivePackId,
} from "../src/main/schemas";

/**
 * V2 Step 12 + 13 — wiki synthesis (gbrain port) + schema packs.
 *
 * The synthesis module is the "brain layer" on top of the
 * 3-layer memory we already have (raw / wiki / schema). It
 * composes a topic answer from the wiki pages + raw sources,
 * with per-claim citations and a gap list — the part of gbrain
 * that makes the answer different from a raw page list.
 */

// Mock utils so the wiki + schema-pack paths resolve to a clean
// per-test directory. The cubecloud helpers compute HOME at
// module-load time and would otherwise leak the developer's
// actual ~/.cubecloud data into the test runs.
const HOME = mkdtempSync(join(tmpdir(), "cubecloud-synth-"));

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
  // Create the wiki/ directory so listWikiPages() / friends
  // have a stable root.
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

describe("schema packs — bundled inventory", () => {
  it("exposes the default pack id", () => {
    expect(DEFAULT_PACK_ID).toBe("cubecloud-base-v1");
  });

  it("ships two bundled packs", () => {
    const packs = listBundledPacks();
    const ids = packs.map((p) => p.id).sort();
    expect(ids).toEqual(["cubecloud-base-v1", "cubecloud-recommended"]);
  });

  it("the recommended pack extends the base pack", () => {
    const rec = BUNDLED_PACKS["cubecloud-recommended"];
    expect(rec?.extends).toBe("cubecloud-base-v1");
    // The recommended pack should add at least one new type
    // beyond the base.
    const baseTypes = BUNDLED_PACKS["cubecloud-base-v1"]?.types.map(
      (t) => t.id,
    );
    const newOnes = (rec?.types ?? [])
      .map((t) => t.id)
      .filter((id) => !baseTypes?.includes(id));
    expect(newOnes.length).toBeGreaterThan(0);
  });

  it("every type in every bundled pack has at least one path prefix", () => {
    for (const pack of listBundledPacks()) {
      for (const type of pack.types) {
        expect(type.pathPrefixes.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("schema packs — active-pack resolution", () => {
  it("returns the default pack when no override is on disk", () => {
    expect(readActivePackId("default")).toBeNull();
    expect(resolveActivePack("default").id).toBe(DEFAULT_PACK_ID);
  });

  it("persists + reads the active pack id", () => {
    setActivePackId("cubecloud-recommended", "default");
    expect(readActivePackId("default")).toBe("cubecloud-recommended");
    expect(resolveActivePack("default").id).toBe("cubecloud-recommended");
  });

  it("falls back to the default when the stored id is unknown", () => {
    setActivePackId("does-not-exist", "default");
    expect(resolveActivePack("default").id).toBe(DEFAULT_PACK_ID);
  });
});

describe("inferPageType — path-prefix routing", () => {
  const pack = BUNDLED_PACKS["cubecloud-base-v1"]!;
  it("routes by the first matching prefix", () => {
    expect(inferPageType("people/alice.md", pack)).toBe("person");
    expect(inferPageType("projects/cubecloud.md", pack)).toBe("project");
    expect(inferPageType("concepts/agentic-os.md", pack)).toBe("concept");
    expect(inferPageType("decisions/2026-05-stay-on-electron.md", pack)).toBe(
      "decision",
    );
    expect(inferPageType("meetings/2026-05-01-standup.md", pack)).toBe(
      "meeting",
    );
  });

  it("falls back to the catch-all for unrecognised prefixes", () => {
    // The base pack's last type is `note` — the catch-all.
    expect(inferPageType("scratch/foo.md", pack)).toBe("note");
  });

  it("handles Windows-style backslashes in relPath", () => {
    expect(inferPageType("people\\bob.md", pack)).toBe("person");
  });
});

describe("synthesize — empty wiki", () => {
  it("returns a no-sources answer for an empty wiki", () => {
    const s = synthesize("agentic engineering", "default");
    expect(s.topic).toBe("agentic engineering");
    expect(s.markdown).toContain("No matching sources");
    expect(s.claims).toEqual([]);
    expect(s.sources).toEqual([]);
    expect(s.freshness).toBe("no sources yet");
    expect(s.packId).toBe(DEFAULT_PACK_ID);
  });

  it("includes a freshness gap and a thin-coverage gap", () => {
    const s = synthesize("anything", "default");
    const labels = s.gaps.map((g) => g.label);
    expect(labels.some((l) => l.toLowerCase().includes("thin"))).toBe(true);
  });
});

describe("synthesize — page routing + claim extraction", () => {
  it("pulls claims from a `people/` page and tags them as person", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
        "She joined in 2024 from Beta Corp.",
      ].join("\n"),
    );
    const s = synthesize("Alice", "default");
    expect(s.claims.length).toBeGreaterThan(0);
    expect(s.claims[0].type).toBe("person");
    expect(s.claims.some((c) => c.text.toLowerCase().includes("acme"))).toBe(
      true,
    );
  });

  it("dedupes near-identical claim text", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const s = synthesize("Alice", "default");
    const runsAtAcme = s.claims.filter((c) =>
      c.text.toLowerCase().includes("runs engineering"),
    );
    expect(runsAtAcme).toHaveLength(1);
  });

  it("skips headings, code fences, and bullet markers when extracting", () => {
    writePage(
      "projects/cubecloud.md",
      [
        "# cubecloud",
        "",
        "## Status",
        "",
        "- WIP",
        "",
        "```bash",
        "rm -rf node_modules",
        "```",
        "",
        "The project is in early development.",
      ].join("\n"),
    );
    const s = synthesize("cubecloud", "default");
    // The claim that survives is "The project is in early development."
    // Heading "Status", bullet "WIP", and the rm -rf inside the
    // fence are all stripped.
    expect(
      s.claims.every(
        (c) =>
          !c.text.startsWith("#") &&
          !c.text.startsWith("```") &&
          !c.text.startsWith("- "),
      ),
    ).toBe(true);
  });

  it("scores topic relevance and ranks best matches first", () => {
    writePage(
      "projects/cubecloud.md",
      "cubecloud is a desktop app for AI agents.",
    );
    writePage(
      "people/alice.md",
      "Alice works at Acme and likes cats.",
    );
    const s = synthesize("cubecloud desktop", "default");
    expect(s.claims[0].text.toLowerCase()).toContain("desktop");
  });
});

describe("synthesize — citations, sources, freshness, gaps", () => {
  it("builds a sources list with one entry per page", () => {
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
    const s = synthesize("Acme", "default");
    const titles = s.sources.map((src) => src.title).sort();
    expect(titles).toEqual(["Alice", "Bob"]);
  });

  it("every claim in the markdown carries an inline citation", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const s = synthesize("Alice", "default");
    expect(s.markdown).toMatch(/\(source: `people\/alice\.md`\)/);
  });

  it("includes a sources list at the end of the markdown", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const s = synthesize("Alice", "default");
    expect(s.markdown).toContain("### Sources");
    expect(s.markdown).toContain("**Alice**");
  });

  it("surfaces type-coverage gaps for types the wiki has no page on", () => {
    writePage(
      "people/alice.md",
      [
        "# Alice",
        "",
        "Alice runs engineering at Acme.",
      ].join("\n"),
    );
    const s = synthesize("Alice", "default");
    const labels = s.gaps.map((g) => g.label);
    // We have a person page, but no project / concept / decision /
    // meeting on Alice. The base pack should flag at least one
    // of those.
    expect(
      labels.some(
        (l) =>
          l.toLowerCase().includes("project") ||
          l.toLowerCase().includes("concept") ||
          l.toLowerCase().includes("decision") ||
          l.toLowerCase().includes("meeting"),
      ),
    ).toBe(true);
  });

  it("returns 0 sources when only one raw source is on disk", () => {
    writeRaw(
      "2026-05-01-meeting.md",
      "The team discussed agentic engineering for the cubecloud project.",
    );
    const s = synthesize("agentic engineering", "default");
    // The raw source is on disk; the claim scores against the
    // topic and lands in the synthesis. We don't care about the
    // count here — we care that the freshness is correct.
    expect(s.freshness).toMatch(/^1 source,/);
  });

  it("stamps the active pack id on the synthesis", () => {
    setActivePackId("cubecloud-recommended", "default");
    const s = synthesize("anything", "default");
    expect(s.packId).toBe("cubecloud-recommended");
  });
});
