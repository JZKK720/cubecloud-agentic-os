---
name: sp-worktree
description: Use when the design is approved, before implementation begins, to create an isolated git worktree on a new branch and verify a clean test baseline. Triggers: "start a feature", "isolated branch", "before implementation", "set up a worktree", "I want to keep main clean", "parallel feature work".
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: using-git-worktrees
  version: "1.0.0"
---

# Using Git Worktrees

An isolated worktree per implementation is the cheapest CI. If the worktree is broken, the main checkout is still clean. If the worktree is good, the merge is a fast-forward.

## When to use

- Any non-trivial implementation (more than 1 task, more than 1 file).
- Any change you might want to abandon without polluting the main branch.
- Any change you want to push to a PR while keeping the main checkout clean for other work.

## When *not* to use

- A one-line typo fix.
- A documentation change in 1 file.
- A change you will *not* push (e.g. an experiment you will throw away).

## The flow

```
Design approved. Plan written.
  ↓
Create worktree on a new branch.
  ↓
cd into the worktree.
  ↓
Verify a clean test baseline (the tests pass on the new branch *before* any changes).
  ↓
Implement the plan (per cubecloud-execute or cubecloud-subagents).
  ↓
Verify the tests still pass (per cubecloud-verify).
  ↓
Push the branch. Open the PR.
  ↓
Hand off to cubecloud-finish-branch.
```

## Worktree creation

```bash
# From the main checkout:
git worktree add ../<repo>-<feature> -b feature/<feature-slug>

# cd into the worktree
cd ../<repo>-<feature>

# Run the project's setup (deps, env vars, etc.) — same as the main checkout
<setup commands from README>
```

## Clean baseline verification

Before any change, run the project's smoke / tests. The worktree should be **green before you touch it**. If it's not, the worktree inherited a broken state; fix or escalate before proceeding.

```bash
# The exact command depends on the project; the contract is: same command the CI runs.
npm run test       # for Node projects
pytest             # for Python projects
cargo test         # for Rust projects
go test ./...      # for Go projects
```

If the baseline fails, **stop**. The plan is built on the assumption of a green baseline; a red baseline invalidates the plan.

## Branch naming

`<type>/<short-kebab-slug>` is the convention. Types: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`. The slug is the topic, not the task.

- `feat/codegraph-embedded-sdk` — yes.
- `fix/skill-description-trim` — yes.
- `task-3` — no. The task ID isn't a topic.
- `wip` — no. WIP commits belong on the worktree, not in the branch name.

## Worktree hygiene

- **One worktree per feature.** If you need to work on two features, make two worktrees.
- **Don't reuse worktrees** across features. Each feature gets a fresh worktree.
- **Delete worktrees** when the feature merges (or is discarded). `git worktree remove <path>`.
- **Don't push WIP commits** to the worktree's remote. Push only after the tests pass.

## When the worktree hits a problem

- **The worktree's tests fail** → fix in the worktree. Don't "merge into main to test".
- **The worktree's tests pass on your machine but fail in CI** → fix the environment mismatch, not the code. (Usually: a missing env var, a Node version, a path.)
- **The worktree becomes a multi-day project** → consider scope. The plan was wrong; go back to `cubecloud-plan`.

## Anti-patterns

- **Working on `main`** — never. The main branch should always be deployable.
- **Stashing instead of worktrees** — stashes are temporary, fragile, and easy to lose. Worktrees are first-class.
- **"I'll just commit to main and revert"** — reverts don't remove the commit; they add a new one. The history is polluted.
- **Skipping the baseline check** — "the tests pass on main" is not the same as "the tests pass on this worktree". Check the worktree.
- **Long-lived worktrees** — if a worktree has been alive for 2 weeks, it has diverged from main. Rebase, or restart from a fresh worktree.

## Related skills

- `cubecloud-plan` — produces the plan that the worktree will implement.
- `cubecloud-finish-branch` — the cleanup step (merge, PR, keep, or discard).
- `cubecloud-verify` — the verification step inside the worktree.

## Source / license

Adapted from [JZKK720/superpowers · using-git-worktrees](https://github.com/JZKK720/superpowers/blob/main/skills/using-git-worktrees/SKILL.md), MIT.
