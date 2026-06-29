import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  executePlan,
  getExecution,
  summarizeExecution,
  type PlanExecution,
  type ExecuteStepFn,
  type ReplanFn,
} from "../src/main/plan-execution-loop";
import { parsePlan, savePlan, type Plan } from "../src/main/plans";
import * as utils from "../src/main/utils";

// Mock utils so we can use a temp directory.
vi.mock("../src/main/utils", () => ({
  profileHome: vi.fn(() => "/tmp/test-plan-exec"),
  safeWriteFile: vi.fn(),
}));

// Mock autoplan's recordDispatchFailure so it doesn't write to disk.
vi.mock("../src/main/autoplan", () => ({
  recordDispatchFailure: vi.fn(() => ({ ts: "", skill: "", type: "", key: "", insight: "", confidence: 0, source: "" })),
}));

const mockProfileHome = vi.mocked(utils.profileHome);
const { mkdtempSync } = require("fs");
const { tmpdir } = require("os");
const { join } = require("path");

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "plan-exec-"));
  mockProfileHome.mockReturnValue(tempDir);
});

afterEach(() => {
  vi.clearAllMocks();
});

function makePlan(markdown: string): Plan {
  const plan = parsePlan("Test Plan", markdown);
  return savePlan(plan);
}

const SIMPLE_PLAN = `
## Step One
Do the first thing.

## Step Two
Do the second thing.
Depends on: s1

## Step Three
Do the third thing.
`;

describe("plan-execution-loop — executePlan", () => {
  it("executes all steps in order when all succeed", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockResolvedValue({ response: "done" });

    const result = await executePlan(plan.id, executeStep);

    expect(result.verdict).toBe("all-done");
    expect(result.stepResults).toHaveLength(3);
    expect(result.stepResults[0].status).toBe("done");
    expect(result.stepResults[1].status).toBe("done");
    expect(result.stepResults[2].status).toBe("done");
    expect(executeStep).toHaveBeenCalledTimes(3);
  });

  it("skips a step when its dependencies are unmet", async () => {
    const plan = makePlan(`
## Step One
Do the first thing.

## Step Two
Do the second thing.
Depends on: s1

## Step Three
Do the third thing.
Depends on: s1, s2
`);

    const executeStep: ExecuteStepFn = vi.fn().mockImplementation((step) => {
      // Step 1 succeeds, step 2 fails.
      if (step.id === "s2") {
        return Promise.reject(new Error("step 2 failed"));
      }
      return Promise.resolve({ response: "ok" });
    });

    const result = await executePlan(plan.id, executeStep);

    // s1 done, s2 failed, s3 skipped (dep s2 not met).
    expect(result.verdict).toBe("aborted");
    expect(result.stepResults[0].status).toBe("done");
    expect(result.stepResults[1].status).toBe("failed");
    // s3 never dispatched because loop aborted on s2 failure.
    expect(executeStep).toHaveBeenCalledTimes(2);
  });

  it("aborts on first failure when replanOnFailure is false", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockResolvedValueOnce({ response: "ok" })
      .mockRejectedValueOnce(new Error("crash"));

    const result = await executePlan(plan.id, executeStep, {
      replanOnFailure: false,
    });

    expect(result.verdict).toBe("aborted");
    expect(result.stepResults[0].status).toBe("done");
    expect(result.stepResults[1].status).toBe("failed");
    expect(executeStep).toHaveBeenCalledTimes(2);
  });

  it("continues after failure when replanOnFailure is true (no replanFn)", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockResolvedValueOnce({ response: "ok" })
      .mockRejectedValueOnce(new Error("crash"))
      .mockResolvedValueOnce({ response: "recovered" });

    const result = await executePlan(plan.id, executeStep, {
      replanOnFailure: true,
    });

    expect(result.verdict).toBe("partial-failure");
    expect(result.stepResults[0].status).toBe("done");
    expect(result.stepResults[1].status).toBe("failed");
    expect(result.stepResults[2].status).toBe("done");
    expect(executeStep).toHaveBeenCalledTimes(3);
  });

  it("uses replanFn to adjust remaining steps on failure", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockResolvedValueOnce({ response: "ok" })
      .mockRejectedValueOnce(new Error("crash"))
      .mockResolvedValueOnce({ response: "replanned" });

    const replanFn: ReplanFn = vi.fn().mockResolvedValue([
      {
        id: "s3",
        title: "Step Three (adjusted)",
        body: "Adjusted step after s2 failure.",
        owner: null,
        dependsOn: [],
        skills: [],
        tags: [],
      },
    ]);

    const result = await executePlan(plan.id, executeStep, {
      replanOnFailure: true,
      replanFn,
    });

    expect(result.verdict).toBe("partial-failure");
    expect(replanFn).toHaveBeenCalledOnce();
    expect(result.stepResults[2].status).toBe("done");
    expect(result.stepResults[2].response).toBe("replanned");
  });

  it("persists execution state to disk", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockResolvedValue({ response: "done" });

    await executePlan(plan.id, executeStep);

    const persisted = getExecution(plan.id);
    expect(persisted).not.toBeNull();
    expect(persisted!.planId).toBe(plan.id);
    expect(persisted!.stepResults).toHaveLength(3);
    expect(persisted!.verdict).toBe("all-done");
  });

  it("degrades gracefully when executeStep throws", async () => {
    const plan = makePlan(SIMPLE_PLAN);
    const executeStep: ExecuteStepFn = vi
      .fn()
      .mockRejectedValue(new Error("always fails"));

    const result = await executePlan(plan.id, executeStep);

    expect(result.verdict).toBe("aborted");
    expect(result.stepResults[0].status).toBe("failed");
    expect(result.stepResults[0].error).toBe("always fails");
  });
});

describe("plan-execution-loop — summarizeExecution", () => {
  it("summarizes counts correctly", () => {
    const execution: PlanExecution = {
      planId: "test",
      startedAt: "",
      finishedAt: "",
      stepResults: [
        { stepId: "s1", status: "done", response: "ok", error: null, startedAt: "", finishedAt: "", durationMs: 100 },
        { stepId: "s2", status: "failed", response: null, error: "err", startedAt: "", finishedAt: "", durationMs: 50 },
        { stepId: "s3", status: "skipped", response: null, error: "dep", startedAt: "", finishedAt: "", durationMs: 0 },
      ],
      replanOnFailure: false,
      verdict: "partial-failure",
    };

    const summary = summarizeExecution(execution);
    expect(summary).toEqual({
      total: 3,
      done: 1,
      failed: 1,
      skipped: 1,
      running: 0,
      pending: 0,
      verdict: "partial-failure",
    });
  });
});