/**
 * Unit tests for the headroom-learn runner
 * (src/main/headroom-learn.ts).
 *
 * The runner is a thin subprocess wrapper around the
 * upstream `headroom learn` CLI. The tests verify:
 *   - runHeadroomLearn returns a structured error when no
 *     project path is supplied
 *   - runHeadroomLearn returns a structured error when the
 *     `headroom` binary isn't on PATH (the common case for
 *     fresh installs)
 *   - parseHeadroomOutput handles the JSON envelope
 *   - parseHeadroomOutput falls back to text parsing
 *   - commitHeadroomLearn delegates to appendLearning with
 *     skill: "headroom-learn" and the proposal as-is
 *
 * We mock child_process, installer, and `learnings.ts` so
 * no real Python / disk I/O runs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "events";

const {
  spawnMock,
  spawnSyncMock,
  getEnhancedPathMock,
  appendLearningMock,
} = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  spawnSyncMock: vi.fn(),
  getEnhancedPathMock: vi.fn(() => "C:\\mock-bin"),
  appendLearningMock: vi.fn(
    (entry: unknown) => ({ ts: new Date().toISOString(), ...(entry as object) }),
  ),
}));

vi.mock("child_process", () => ({
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
  default: { spawn: spawnMock, spawnSync: spawnSyncMock },
}));

vi.mock("../src/main/installer", () => ({
  getEnhancedPath: getEnhancedPathMock,
  HERMES_HOME: "D:\\hermes",
}));

vi.mock("../src/main/learnings", () => ({
  appendLearning: appendLearningMock,
}));

class FakeChild extends EventEmitter {
  pid = 22222;
  killed = false;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill(_signal: string): boolean {
    this.killed = true;
    return true;
  }
}

describe("headroom-learn runner", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    getEnhancedPathMock.mockReset();
    appendLearningMock.mockReset();
    getEnhancedPathMock.mockReturnValue("C:\\mock-bin");
    appendLearningMock.mockImplementation(
      (entry: unknown) => ({
        ts: new Date().toISOString(),
        ...(entry as object),
      }),
    );
  });

  afterEach(() => {
    try {
      vi.resetModules();
    } catch {
      /* noop */
    }
  });

  it("rejects empty project path with skipReason=no-project", async () => {
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    const result = await runHeadroomLearn({ projectPath: "" });
    expect(result.success).toBe(false);
    expect(result.skipReason).toBe("no-project");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects when headroom binary is missing", async () => {
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 1,
      stdout: "",
    });
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    const result = await runHeadroomLearn({
      projectPath: "D:\\my-project",
    });
    expect(result.success).toBe(false);
    expect(result.skipReason).toBe("no-binary");
    expect(result.error).toMatch(/Headroom binary not found/);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns the headroom learn CLI with the right args", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    const promise = runHeadroomLearn({
      projectPath: "D:\\my-project",
      model: "claude-sonnet-4-6",
      agent: "claude",
    });
    // Flush microtasks so spawn is called.
    await Promise.resolve();
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args).toContain("learn");
    expect(args).toContain("--project");
    expect(args).toContain("D:\\my-project");
    expect(args).toContain("--model");
    expect(args).toContain("claude-sonnet-4-6");
    expect(args).toContain("--agent");
    expect(args).toContain("claude");
    // Should NOT pass --apply (desktop is human-in-the-loop)
    expect(args).not.toContain("--apply");
    // Should request JSON output for reliable parsing
    expect(args).toContain("--format");
    expect(args).toContain("json");
    // Resolve the promise cleanly.
    child.stdout.emit("data", Buffer.from("[]"));
    child.emit("close", 0);
    await promise;
  });

  it("parses JSON envelope and returns proposals on success", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    const jsonOutput = JSON.stringify([
      {
        target: "AGENTS.md",
        section: "Error Fixes",
        content: "Use npm test, not npm run-tests",
        confidence: 0.9,
        evidence_count: 4,
      },
    ]);
    const promise = runHeadroomLearn({
      projectPath: "D:\\my-project",
    });
    child.stdout.emit("data", Buffer.from(jsonOutput));
    child.emit("close", 0);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.report?.proposals.length).toBe(1);
    const p = result.report!.proposals[0];
    expect(p.type).toBe("pitfall"); // "error/fail/fix" → pitfall
    expect(p.key).toBe("error-fixes");
    expect(p.confidence).toBeGreaterThan(0);
    expect(p.evidence).toMatch(/4 times/);
  });

  it("returns structured error on non-zero exit", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    const promise = runHeadroomLearn({
      projectPath: "D:\\my-project",
    });
    child.stderr.emit("data", Buffer.from("LLM backend not configured"));
    child.emit("close", 1);
    const result = await promise;
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/LLM backend not configured/);
  });

  it("captures sessionCount and output files from text output", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const { runHeadroomLearn } = await import("../src/main/headroom-learn");
    // Headroom may not honour --format json yet — fall back
    // to text parsing.
    const textOutput = [
      "Scanned 12 sessions",
      "Wrote AGENTS.md",
      "Updated CLAUDE.md",
      "Done.",
    ].join("\n");
    const promise = runHeadroomLearn({
      projectPath: "D:\\my-project",
    });
    child.stdout.emit("data", Buffer.from(textOutput));
    child.emit("close", 0);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.report?.sessionCount).toBe(12);
    expect(result.report?.outputFiles).toContain("AGENTS.md");
    expect(result.report?.outputFiles).toContain("CLAUDE.md");
  });
});

describe("commitHeadroomLearn", () => {
  beforeEach(() => {
    appendLearningMock.mockReset();
    appendLearningMock.mockImplementation(
      (entry: unknown) => ({
        ts: new Date().toISOString(),
        ...(entry as object),
      }),
    );
  });

  it("appends each proposal with skill: headroom-learn", async () => {
    const { commitHeadroomLearn } = await import("../src/main/headroom-learn");
    const proposals = [
      {
        type: "pitfall" as const,
        key: "npm-test-cmd",
        insight: "Use npm test, not npm run-tests",
        confidence: 8,
        source: "inferred" as const,
        evidence: "Saw this 4 times",
      },
      {
        type: "preference" as const,
        key: "indentation",
        insight: "Use 2-space indent",
        confidence: 6,
        source: "inferred" as const,
        evidence: "Saw this 8 times",
      },
    ];
    const result = commitHeadroomLearn(proposals);
    expect(appendLearningMock).toHaveBeenCalledTimes(2);
    expect(appendLearningMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ skill: "headroom-learn", key: "npm-test-cmd" }),
      undefined,
    );
    expect(appendLearningMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skill: "headroom-learn", key: "indentation" }),
      undefined,
    );
    expect(result.length).toBe(2);
  });

  it("passes the profile to appendLearning", async () => {
    const { commitHeadroomLearn } = await import("../src/main/headroom-learn");
    commitHeadroomLearn(
      [
        {
          type: "pitfall" as const,
          key: "x",
          insight: "y",
          confidence: 5,
          source: "inferred" as const,
          evidence: "z",
        },
      ],
      "work",
    );
    expect(appendLearningMock).toHaveBeenCalledWith(expect.anything(), "work");
  });
});

describe("applyHeadroomLearn / revertHeadroomLearn", () => {
  let tmpRoot: string;
  let projectPath: string;
  let agentsPath: string;

  beforeEach(async () => {
    vi.resetModules();
    const os = await import("os");
    const path = await import("path");
    const fs = await import("fs/promises");
    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "headroom-apply-"));
    projectPath = path.join(tmpRoot, "project");
    agentsPath = path.join(projectPath, "AGENTS.md");
    await fs.mkdir(projectPath, { recursive: true });
    // Pre-existing AGENTS.md so we can test the "modified"
    // case (vs. the "created" case).
    await fs.writeFile(agentsPath, "# Project notes\n", "utf-8");
  });

  afterEach(async () => {
    const fs = await import("fs/promises");
    try {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  });

  it("rejects empty project path with skipReason=no-project", async () => {
    const { applyHeadroomLearn } = await import("../src/main/headroom-learn");
    const result = await applyHeadroomLearn({ projectPath: "" });
    expect(result.success).toBe(false);
    expect(result.skipReason).toBe("no-project");
    expect(result.diffs).toEqual([]);
  });

  it("returns empty diffs when headroom binary is missing", async () => {
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 1,
      stdout: "",
    });
    const { applyHeadroomLearn } = await import("../src/main/headroom-learn");
    const result = await applyHeadroomLearn({ projectPath });
    expect(result.success).toBe(false);
    expect(result.skipReason).toBe("no-binary");
    expect(result.diffs).toEqual([]);
  });

  it("snapshots modified files (created:false) and reports the new content", async () => {
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const fs = await import("fs/promises");
    const newContent =
      "# Project notes\n\n## Headroom corrections\nUse npm test.\n";
    const { applyHeadroomLearn } = await import("../src/main/headroom-learn");
    const promise = applyHeadroomLearn({ projectPath });
    // Let the synchronous portion of the apply function
    // (the 3 sequential pre-snapshot reads) drain
    // through a few microtask flushes before we touch
    // the file. Then wait for spawn to be called.
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
      if (spawnMock.mock.calls.length > 0) break;
    }
    await fs.writeFile(agentsPath, newContent, "utf-8");
    child.stdout.emit("data", Buffer.from("Scanned 8 sessions\nDone.\n"));
    child.emit("close", 0);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.diffs.length).toBe(1);
    const diff = result.diffs[0];
    expect(diff.created).toBe(false);
    expect(diff.before).toBe("# Project notes\n");
    expect(diff.after).toBe(newContent);
  });

  it("snapshots new files (created:true) with empty before", async () => {
    // Same pattern as the modified-files test: the
    // apply helper reads each candidate file twice.
    // We use a real on-disk file for the pre-snapshot
    // (which records `created: true` because CLAUDE.md
    // doesn't exist) and then create the file between
    // the two reads so the post-snapshot sees new
    // content.
    const child = new FakeChild();
    spawnMock.mockImplementation(() => child);
    spawnSyncMock.mockReturnValue({
      error: null,
      status: 0,
      stdout: "C:\\mock\\headroom.exe",
    });
    const fs = await import("fs/promises");
    const { applyHeadroomLearn } = await import("../src/main/headroom-learn");
    const newPath = pathJoin(projectPath, "CLAUDE.md");
    const newContent = "# New file\n";
    const promise = applyHeadroomLearn({ projectPath });
    for (let i = 0; i < 20; i += 1) {
      await new Promise((r) => setTimeout(r, 5));
      if (spawnMock.mock.calls.length > 0) break;
    }
    await fs.writeFile(newPath, newContent, "utf-8");
    child.stdout.emit("data", Buffer.from("Scanned 4 sessions\nDone.\n"));
    child.emit("close", 0);
    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.diffs.length).toBe(1);
    const diff = result.diffs[0];
    expect(diff.created).toBe(true);
    expect(diff.before).toBe("");
    expect(diff.after).toBe(newContent);
  });

  it("revertHeadroomLearn restores modified files to their before snapshot", async () => {
    const fs = await import("fs/promises");
    const newContent = "# Rewritten\n";
    await fs.writeFile(agentsPath, newContent, "utf-8");
    const { revertHeadroomLearn } = await import("../src/main/headroom-learn");
    const out = await revertHeadroomLearn([
      {
        path: agentsPath,
        created: false,
        before: "# Project notes\n",
        after: newContent,
      },
    ]);
    expect(out.success).toBe(true);
    expect(out.reverted).toEqual([agentsPath]);
    const after = await fs.readFile(agentsPath, "utf-8");
    expect(after).toBe("# Project notes\n");
  });

  it("revertHeadroomLearn deletes files that were created by the apply", async () => {
    const fs = await import("fs/promises");
    const newPath = pathJoin(projectPath, "GEMINI.md");
    await fs.writeFile(newPath, "# Fresh\n", "utf-8");
    const { revertHeadroomLearn } = await import("../src/main/headroom-learn");
    const out = await revertHeadroomLearn([
      {
        path: newPath,
        created: true,
        before: "",
        after: "# Fresh\n",
      },
    ]);
    expect(out.success).toBe(true);
    expect(out.reverted).toEqual([newPath]);
    await expect(fs.readFile(newPath, "utf-8")).rejects.toThrow();
  });
});

// Local helpers so the test reads cleanly without
// importing `path` at the top of the file (the top-level
// imports stay focused on the unit-under-test).
function pathJoin(root: string, rel: string): string {
  const sep = rel.includes("\\") ? "\\" : "/";
  if (sep === "\\") {
    return `${root.replace(/[\\/]+$/, "")}\\${rel.replace(/\//g, "\\")}`;
  }
  return `${root.replace(/\/+$/, "")}/${rel}`;
}

// Poll a predicate until it returns truthy or the
// timeout elapses. Used to synchronise with the apply
// helper's internal awaits (we can't observe the
// pre-snapshot readFile directly, but we CAN observe
// the spawn call that happens AFTER it).
async function waitFor(
  predicate: () => boolean,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 1000;
  const intervalMs = options.intervalMs ?? 5;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}
