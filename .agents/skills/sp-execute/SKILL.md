---
name: sp-execute
description: Use when a plan exists and is approved — runs the plan task-by-task with checkpoint reviews. Each task is a fresh subagent invocation that returns a clean diff and verification output.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: executing-plans
  version: "1.0.0"
---

# Executing Plans

A plan is a contract. The execution reads the plan and runs it, task by task, with checkpoints.

## The flow

```
Plan: docs/plans/YYYY-MM-DD-<topic>-plan.md
  ↓
Read the plan. Confirm the order. Confirm the verification steps are runnable.
  ↓
For each task:
  ↓
  Dispatch a fresh subagent with the task's exact text.
  ↓
  Wait for: diff + verification output.
  ↓
  Run a 2-stage review:
    1. Spec compliance — does the diff match the task?
    2. Code quality — does the code meet the project's standards?
  ↓
  If both pass: commit + move to next task.
  If either fails: feedback to subagent, retry.
  ↓
After all tasks: run the end-to-end smoke.
  ↓
Hand off to cubecloud-finish-branch.
```

## Why fresh subagents per task

A subagent that has been working for an hour has context rot, plan drift, and sunk-cost bias. A fresh subagent:

- Reads the plan task fresh.
- Has no opinion on prior tasks.
- Doesn't try to "improve" the plan.
- Returns a clean, reviewable diff.

The dispatcher (you) keeps state across subagents. The subagents are stateless.

## The 2-stage review

After every task, two checks:

### Stage 1: spec compliance

- Did the subagent edit the files the task named?
- Did the subagent produce the code the task specified (or a strict equivalent)?
- Did the subagent run the verification step the task named?
- Did the subagent commit the result?

### Stage 2: code quality

- Does the new code follow the project's coding standards?
- Is the test behaviour-focused (per `cubecloud-tdd`)?
- Are there drive-by refactors? (Reject them.)
- Is the diff focused (no unrelated changes)?
- Are there security concerns?

If stage 1 fails, the subagent didn't follow the plan — feedback.
If stage 2 fails, the subagent's code is wrong but the plan is right — feedback, but the plan stays.

## Checkpoints

Every 3–5 tasks, pause for a human checkpoint:

- Show the diffs so far.
- Show the running smoke (if applicable).
- Ask: "Continue, or do you want to redirect?"

Don't batch 20 tasks without a checkpoint. The cost of a 4-hour wrong direction is higher than the cost of a 4-minute checkpoint.

## Anti-patterns

- **Skipping the review** — "the subagent ran the verification, ship it." The 2-stage review is the value-add; skipping it is the same as no plan at all.
- **"I'll just edit the file directly"** — the dispatcher (you) doesn't edit. The subagent edits, the dispatcher reviews.
- **Accepting drive-by changes** — "while I was in there I also…" — reject. The plan is the scope.
- **Continuing after a failed review** — retry the subagent. If it fails twice, the plan is wrong. Go back to `cubecloud-plan`.

## Related skills

- `cubecloud-plan` — produces the plan.
- `cubecloud-subagents` / `cubecloud-parallel` — for parallel execution of independent tasks.
- `cubecloud-finish-branch` — the step that follows execution.

## Source / license

Adapted from [JZKK720/superpowers · executing-plans](https://github.com/JZKK720/superpowers/blob/main/skills/executing-plans/SKILL.md), MIT.
