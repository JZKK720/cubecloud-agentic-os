// plan-execution-loop.ts — DeerFlow Adaptation #2: plan-mode execution loop.
//
// Builds on the existing plans.ts (parser + fire-and-forget dispatcher) and
// autoplan.ts (learn-on-failure). The gap this module closes: the existing
// `dispatchPlan` creates Kanban tasks but doesn't execute them, collect
// results, or re-plan on failure. This module adds the loop:
//
//   plan → dispatch step 1 to runtime → collect result
//        → dispatch step 2 → collect result
//        → step 2 failed → record learning (autoplan) → re-plan step 3
//        → dispatch step 3 → collect result
//        → all steps done → aggregate results → return execution summary
//
// The desktop is the dispatcher and collector, NOT the executor. Each step
// is sent to the active runtime (Hermes/IronClaw/OpenClaw) as a chat message.
// The runtime executes it (with its own sub-agents, sandbox, workspace);
// the desktop just routes, collects, and re-plans.
//
// Design constraints:
//   - The loop is injectable: `executeStep` is a callback so tests can run
//     without a real runtime. In production, it sends the step body as a
//     chat message to the active runtime gateway.
//   - Re-planning is optional: if `replanOnFailure` is false, the loop
//     stops at the first failure. If true, it records the learning via
//     autoplan's `recordDispatchFailure` and continues with adjusted steps.
//   - The loop respects `dependsOn`: a step is only dispatched when all
//     its dependencies have completed successfully.
//   - Results are persisted to `<profile>/plans/<plan-id>/execution.json`
//     so the renderer can show step progress (pending → running → done/failed).

import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { profileHome, safeWriteFile } from "./utils";
import { type Plan, type PlanStep, getPlan, savePlan } from "./plans";
import { recordDispatchFailure } from "./autoplan";

// ── Types ─────────────────────────────────────────────────

/** Status of a single step in the execution loop. */
export type StepStatus = "pending" | "running" | "done" | "failed" | "skipped";

/** Result of executing a single step. */
export interface StepExecutionResult {
  stepId: string;
  status: StepStatus;
  /** The runtime's response text (if successful). */
  response: string | null;
  /** Error message (if failed). */
  error: string | null;
  /** When execution started (ISO 8601). */
  startedAt: string;
  /** When execution finished (ISO 8601). */
  finishedAt: string;
  /** Wall-clock duration in ms. */
  durationMs: number;
}

/** Full execution state for a plan. */
export interface PlanExecution {
  planId: string;
  /** When the execution started. */
  startedAt: string;
  /** When the execution finished (null if still running). */
  finishedAt: string | null;
  /** Per-step results, in dispatch order. */
  stepResults: StepExecutionResult[];
  /** Whether re-planning is enabled. */
  replanOnFailure: boolean;
  /** Summary verdict. */
  verdict: "running" | "all-done" | "partial-failure" | "aborted";
}

/** Injected dependency: execute a single step against a runtime.
 *  In production, this sends the step body as a chat message to the
 *  active runtime gateway. In tests, it's a mock. */
export type ExecuteStepFn = (step: PlanStep, plan: Plan) => Promise<{
  response: string;
}>;

/** Injected dependency: re-plan remaining steps after a failure.
 *  Returns adjusted steps (may modify step bodies, reorder, or skip).
 *  In production, this could call an LLM to re-plan. In tests, it's a mock.
 *  If not provided, the loop just continues with the original steps. */
export type ReplanFn = (
  failedStep: PlanStep,
  remainingSteps: PlanStep[],
  failureError: string,
) => Promise<PlanStep[]>;

// ── Execution loop ────────────────────────────────────────

/** Execute a plan step-by-step, collecting results and optionally
 *  re-planning on failure. Returns the full execution state. */
export async function executePlan(
  planId: string,
  executeStep: ExecuteStepFn,
  options: {
    replanOnFailure?: boolean;
    replanFn?: ReplanFn;
    profile?: string;
  } = {},
): Promise<PlanExecution> {
  const { replanOnFailure = false, replanFn, profile } = options;

  const plan = getPlan(planId, profile);
  const startedAt = new Date().toISOString();
  const stepResults: StepExecutionResult[] = [];

  // Track which steps have completed successfully.
  const completedSteps = new Set<string>();

  // Work through steps in order. We iterate by index because
  // re-planning may modify the remaining steps array.
  let remaining = [...plan.steps];
  let verdict: PlanExecution["verdict"] = "running";

  while (remaining.length > 0) {
    const step = remaining[0]!;

    // Check dependencies: if any dependency hasn't completed, skip.
    const unmetDeps = step.dependsOn.filter(
      (dep) => !completedSteps.has(dep),
    );
    if (unmetDeps.length > 0) {
      const startedAtStep = new Date().toISOString();
      stepResults.push({
        stepId: step.id,
        status: "skipped",
        response: null,
        error: `Unmet dependencies: ${unmetDeps.join(", ")}`,
        startedAt: startedAtStep,
        finishedAt: startedAtStep,
        durationMs: 0,
      });
      remaining = remaining.slice(1);
      continue;
    }

    // Dispatch the step.
    const stepStart = Date.now();
    const startedAtStep = new Date().toISOString();
    try {
      // Mark as running (update the persisted state).
      stepResults.push({
        stepId: step.id,
        status: "running",
        response: null,
        error: null,
        startedAt: startedAtStep,
        finishedAt: "",
        durationMs: 0,
      });

      const result = await executeStep(step, plan);
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - stepStart;

      // Update the last result entry to "done".
      stepResults[stepResults.length - 1] = {
        stepId: step.id,
        status: "done",
        response: result.response,
        error: null,
        startedAt: startedAtStep,
        finishedAt,
        durationMs,
      };

      completedSteps.add(step.id);
      remaining = remaining.slice(1);
    } catch (err) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - stepStart;
      const errorMsg = (err as Error).message;

      // Update the last result entry to "failed".
      stepResults[stepResults.length - 1] = {
        stepId: step.id,
        status: "failed",
        response: null,
        error: errorMsg,
        startedAt: startedAtStep,
        finishedAt,
        durationMs,
      };

      // Record the failure learning (autoplan).
      if (profile) {
        try {
          recordDispatchFailure(step, errorMsg, profile);
        } catch {
          // Learning recording must never break the loop.
        }
      }

      if (replanOnFailure && replanFn) {
        // Re-plan: get adjusted remaining steps.
        try {
          const adjusted = await replanFn(
            step,
            remaining.slice(1),
            errorMsg,
          );
          remaining = adjusted;
        } catch {
          // Re-planning failed; abort.
          verdict = "aborted";
          break;
        }
      } else if (!replanOnFailure) {
        // No re-planning: abort on first failure.
        verdict = "aborted";
        break;
      } else {
        // Re-planning enabled but no replanFn: skip and continue.
        remaining = remaining.slice(1);
      }
    }
  }

  if (verdict === "running") {
    const hasFailures = stepResults.some((r) => r.status === "failed");
    const hasSkipped = stepResults.some((r) => r.status === "skipped");
    verdict = hasFailures
      ? "partial-failure"
      : hasSkipped
        ? "partial-failure"
        : "all-done";
  }

  const execution: PlanExecution = {
    planId,
    startedAt,
    finishedAt: new Date().toISOString(),
    stepResults,
    replanOnFailure,
    verdict,
  };

  // Persist the execution state.
  persistExecution(execution, profile);

  // Mark the plan as dispatched.
  const updatedPlan: Plan = { ...plan, dispatchedAt: startedAt };
  savePlan(updatedPlan, profile);

  return execution;
}

// ── Persistence ───────────────────────────────────────────

function executionPath(planId: string, profile?: string): string {
  return join(
    profileHome(profile),
    "plans",
    planId,
    "execution.json",
  );
}

/** Persist the execution state to disk. */
export function persistExecution(
  execution: PlanExecution,
  profile?: string,
): void {
  const filePath = executionPath(execution.planId, profile);
  mkdirSync(join(filePath, ".."), { recursive: true });
  writeFileSync(filePath, JSON.stringify(execution, null, 2) + "\n", "utf-8");
}

/** Read a persisted execution state. Returns null if none. */
export function getExecution(
  planId: string,
  profile?: string,
): PlanExecution | null {
  const filePath = executionPath(planId, profile);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as PlanExecution;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────

/** Summarize an execution for the renderer. */
export function summarizeExecution(
  execution: PlanExecution,
): {
  total: number;
  done: number;
  failed: number;
  skipped: number;
  running: number;
  pending: number;
  verdict: string;
} {
  const counts = { done: 0, failed: 0, skipped: 0, running: 0, pending: 0 };
  for (const r of execution.stepResults) {
    counts[r.status]++;
  }
  return {
    total: execution.stepResults.length,
    ...counts,
    verdict: execution.verdict,
  };
}