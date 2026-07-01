---
name: sp-plan
description: Use when the design is approved — breaks the work into bite-sized tasks (2–5 minutes each), with exact file paths, complete code, and verification steps for each task. Produces a plan a junior engineer with no taste and no context can follow.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: writing-plans
  version: "1.0.0"
---

# Writing Plans

A design without a plan is a wish. A plan without bite-sized tasks is a deck. This skill produces a plan a junior engineer with no taste and no context can follow.

## The contract

Every task in the plan has:

- **Exact file paths** (not "the user service" — `src/services/user.ts`).
- **Complete code** (not "implement the validation" — the actual function body).
- **Verification steps** (not "test it" — the exact command and expected output).
- **A 2–5 minute estimate** (anything longer is two tasks).
- **A commit boundary** (when the task is done, the commit is ready).

## Structure

```
# <Plan Title>

## Overview
<2–3 sentence summary. The why.>

## Tasks
### Task N: <verb + object>
**Files:**
- Create: <path>
- Modify: <path>

**Step 1: <verb>**
<complete code block>

**Step 2: Verify**
Run: <command>
Expected: <output>

**Step 3: Commit**
<git command>

---
(repeat for each task)
```

## Task ordering

Order tasks by *dependency*, not by *importance*:

1. **Skeleton first** — empty modules, empty functions, the wiring that connects them.
2. **Leaf data** — types, schemas, fixtures.
3. **Leaf behaviour** — pure functions, no I/O.
4. **I/O** — adapters, gateways, side effects.
5. **Integration** — wire the leaves into the I/O.
6. **Smoke test** — end-to-end.

The first task should run a no-op end-to-end (start, do nothing, exit clean). Each subsequent task adds observable behaviour.

## Hand-off

When the plan is written:

1. Save to `docs/plans/YYYY-MM-DD-<topic>-plan.md`.
2. Announce: "Plan written. Invoking `cubecloud-execute` next."
3. The `cubecloud-execute` skill takes over (executing-plans).

## Plan review before execution

Before executing, run a quick self-review:

- **Is every task 2–5 minutes?** If not, split.
- **Is every step complete?** If not, fill in.
- **Is every verification step runnable?** If not, write the command.
- **Is the order optimal?** If not, reorder.
- **Does the smoke test cover the user-facing outcome?** If not, add a final task.

If the self-review fails, fix the plan. Don't execute a broken plan.

## Anti-patterns

- **"Implement the feature"** — not a task. A task has a file path, a code block, and a verify step.
- **Multi-hour tasks** — split them. A junior engineer can't hold a 4-hour task in their head.
- **"Refactor the codebase"** — not a task. Refactor *what*, in *which file*, verified by *which test*?
- **"Run the tests"** as the only verification — the tests should be specific to the change.
- **No commit boundary** — every task should be a green commit. If a task leaves the tree in a broken state, the plan is wrong.

## Related skills

- `cubecloud-brainstorm` — the design step that precedes planning.
- `cubecloud-execute` — batch execution with checkpoints.
- `cubecloud-tdd` — every code-producing task in the plan must follow TDD.
- `gstack-plan-ceo-review`, `gstack-plan-eng-review`, `gstack-plan-design-review` — for *reviewing* an existing plan.

## Source / license

Adapted from [JZKK720/superpowers · writing-plans](https://github.com/JZKK720/superpowers/blob/main/skills/writing-plans/SKILL.md), MIT.
