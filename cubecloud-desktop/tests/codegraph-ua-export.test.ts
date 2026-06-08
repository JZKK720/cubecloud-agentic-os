import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

import { exportUnderstandAnythingGraph, type UaGraph } from "../src/main/codegraph";

const PROJECT = mkdtempSync(join(tmpdir(), "ua-graph-test-"));

vi.mock("../src/main/utils", () => ({
  HERMES_HOME: "/tmp",
  profileHome: () => PROJECT,
  getEnhancedPath: () => process.env.PATH || "",
}));

const SAMPLE_STATUS = {
  initialized: true,
  projectPath: PROJECT,
  fileCount: 42,
  nodeCount: 137,
  edgeCount: 99,
  dbSizeBytes: null,
  backend: null,
  journalMode: null,
  languages: ["typescript", "rust", "python"],
  pendingChanges: { added: 0, modified: 0, removed: 0 },
  worktreeMismatch: null,
};

describe("exportUnderstandAnythingGraph (UA compatibility)", () => {
  beforeEach(() => {
    if (existsSync(PROJECT)) {
      rmSync(PROJECT, { recursive: true, force: true });
    }
    mkdirSync(PROJECT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(PROJECT)) {
      rmSync(PROJECT, { recursive: true, force: true });
    }
  });

  it("rejects empty project paths", async () => {
    const res = await exportUnderstandAnythingGraph("");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/project folder/i);
    expect(res.graph).toBeUndefined();
  });

  it("rejects non-existent paths", async () => {
    const res = await exportUnderstandAnythingGraph(
      join(PROJECT, "does-not-exist"),
    );
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/does not exist/i);
  });

  it("synthesises a minimal UA graph with the correct top-level shape", async () => {
    const res = await exportUnderstandAnythingGraph(PROJECT, SAMPLE_STATUS);
    expect(res.success).toBe(true);
    const g = res.graph as UaGraph;
    expect(g).toBeDefined();
    expect(g.project.name).toBeTruthy();
    expect(g.project.languages).toEqual(["typescript", "rust", "python"]);
    expect(typeof g.project.analyzedAt).toBe("string");
    expect(g.project.gitCommitHash).toBeNull();
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].type).toBe("module");
    expect(g.nodes[0].tags).toEqual([
      "lang:typescript",
      "lang:rust",
      "lang:python",
    ]);
    expect(g.edges).toEqual([]);
    expect(g.layers.map((l) => l.id)).toContain("project");
    expect(g.tour).toHaveLength(1);
    expect(g.tour[0].order).toBe(1);
    expect(g.tour[0].description).toMatch(/42 files/);
  });

  it("reads diff-overlay.json and emits diff layers when present", async () => {
    const overlayDir = join(PROJECT, ".understand-anything");
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(
      join(overlayDir, "diff-overlay.json"),
      JSON.stringify({
        changedNodeIds: ["file:a.ts", "file:b.ts"],
        affectedNodeIds: ["file:imports.ts"],
      }),
      "utf-8",
    );

    const res = await exportUnderstandAnythingGraph(PROJECT, SAMPLE_STATUS);
    expect(res.success).toBe(true);
    const g = res.graph as UaGraph;
    const layerIds = g.layers.map((l) => l.id);
    expect(layerIds).toContain("diff-changed");
    expect(layerIds).toContain("diff-affected");

    const changed = g.layers.find((l) => l.id === "diff-changed");
    const affected = g.layers.find((l) => l.id === "diff-affected");
    expect(changed?.nodeIds).toEqual(["file:a.ts", "file:b.ts"]);
    expect(affected?.nodeIds).toEqual(["file:imports.ts"]);
  });

  it("ignores an unreadable / malformed diff overlay", async () => {
    const overlayDir = join(PROJECT, ".understand-anything");
    mkdirSync(overlayDir, { recursive: true });
    writeFileSync(join(overlayDir, "diff-overlay.json"), "not-json", "utf-8");

    const res = await exportUnderstandAnythingGraph(PROJECT, SAMPLE_STATUS);
    expect(res.success).toBe(true);
    const g = res.graph as UaGraph;
    const layerIds = g.layers.map((l) => l.id);
    // We never surface corrupt data; only the baseline project layer.
    expect(layerIds).toEqual(["project"]);
  });

  it("survives a zero-language project (empty languages array)", async () => {
    const res = await exportUnderstandAnythingGraph(PROJECT, {
      ...SAMPLE_STATUS,
      languages: [],
    });
    expect(res.success).toBe(true);
    const g = res.graph as UaGraph;
    expect(g.project.languages).toEqual([]);
    expect(g.nodes[0].tags).toEqual([]);
    expect(g.tour[0].description).toMatch(/0 languages/);
  });
});
