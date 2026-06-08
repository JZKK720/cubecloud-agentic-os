---
name: sp-subagents
description: Use when the plan has independent tasks and the work can be parallelised — dispatches a fresh subagent per task with two-stage review (spec compliance, then code quality). Faster than sequential execution for non-blocking work.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: subagent-driven-development
  version: "1.0.0"
---

# Subagent-Driven Development

A faster, more reliable execution model than sequential `cubecloud-execute`. For each plan task, dispatch a fresh subagent, then do a two-stage review before merging.

## When to use this instead of `cubecloud-execute`

- **Plan tasks are independent** — no task depends on another's output until integration.
- **Verification per task is self-contained** — each task can be verified without later tasks being done.
- **The work is meaty** — at least 5+ tasks, each non-trivial.

When the tasks are tightly coupled (one depends on the next), use `cubecloud-execute` instead. Subagents add overhead that doesn't pay off for short, sequential work.

## The flow

```
Plan: docs/plans/YYYY-MM-DD-<topic>-plan.md
  ↓
Group tasks by dependency (DAG).
  ↓
For each group of independent tasks:
  ↓
  Dispatch one subagent per task (in parallel).
  ↓
  Each subagent returns: diff + verification output.
  ↓
  2-stage review per subagent (spec, then code).
  ↓
  Pass: merge the diff into the worktree.
  Fail: feedback, retry, or rewrite the plan.
  ↓
Move to the next group.
  ↓
Final integration: subagent for the smoke test.
```

## The two-stage review

### Stage 1: spec compliance

- Did the subagent edit the right files?
- Did the subagent produce the code the task specified (or a strict equivalent)?
- Did the subagent run the verification step?
- Is the commit clean and focused?

**A spec failure means the subagent didn't follow the plan.** Re-dispatch with clearer instructions.

### Stage 2: code quality

- Coding standards met?
- Behaviour tests (not implementation tests)?
- No drive-by refactors?
- No security issues?
- The "would I be comfortable shipping this?" check.

**A quality failure means the subagent's code is wrong but the plan is right.** Send back with a code-review comment, re-dispatch.

## Why fresh subagents

- **No context rot** — subagents start with the plan, end with a diff. The dispatcher (you) keeps state.
- **No plan drift** — a subagent working for 30 minutes starts inventing reasons the plan is wrong. A fresh subagent follows the plan.
- **No sunk-cost bias** — a fresh subagent will say "the plan is wrong" if it is. An experienced subagent will say "I'll make it work."

## Subagent prompt template

```
You are implementing Task N of the plan at <plan_path>.

**Task (verbatim from the plan):**
<paste the task block>

**Context:**
- Working tree: <path>
- This task depends on: <list of completed task IDs, or "none">
- This task blocks: <list of task IDs that depend on this one, or "none">

**Your job:**
1. Read the task block.
2. Make exactly the changes the task block specifies.
3. Do not "improve" the plan. Do not add features the task doesn't ask for.
4. Run the verification step the task block specifies.
5. Commit with a message that references the task ID.
6. Return: the diff (stat + diff), the verification output, and the commit hash.

**Do not:**
- Read the entire plan.
- Modify files outside the task block.
- Add tests beyond the verification step.
- Push, merge, or rebase.
```

## Anti-patterns

- **"I'll dispatch 10 subagents at once for the whole plan"** — too many parallel reviews for the dispatcher to manage. Group by DAG layer.
- **Skipping the 2-stage review** — the review is the value. Skipping it is the same as no plan.
- **Accepting drive-by changes** — reject them in stage 1.
- **Re-using a subagent's context** — the whole point is fresh state. Don't pre-load the subagent with the whole plan; the prompt template gives the right context.
- **Subagent doing the integration** — the dispatcher handles integration, smoke tests, and branch finishing. Subagents are leaf workers.

## Related skills

- `cubecloud-execute` — sequential, for tightly coupled tasks.
- `cubecloud-parallel` — for one-off parallel work (research, fan-out search), not for plan execution.
- `cubecloud-request-review` / `cubecloud-receive-review` — the human-in-the-loop variant.

## Source / license

Adapted from [JZKK720/superpowers · subagent-driven-development](https://github.com/JZKK720/superpowers/blob/main/skills/subagent-driven-development/SKILL.md), MIT.
