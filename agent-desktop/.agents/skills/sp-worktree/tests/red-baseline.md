# Red baseline: `sp-worktree` (using-git-worktrees)

## Pressure scenario

> User: "I'm just going to make the change on main, it's small."

This scenario has two pressures:
1. **Trivial** ("small change")
2. **Workflow bypass** ("just on main")

## Expected without the skill

A baseline agent typically:
- **Works directly on main** — pollutes the deployable branch.
- **Doesn't verify a clean baseline** — assumes the tests pass.
- **Loses the ability to abandon** — the change is on main, reverting is messy.
- **Reuses the branch** for unrelated follow-ups — branch name says "fix", commits are about "fix + refactor + new feature".

## Expected with the skill

A trained agent (with `sp-worktree` loaded) does:
1. **Creates a worktree on a new branch** — `git worktree add ../<repo>-<feature> -b feat/<feature-slug>`.
2. **Verifies a clean baseline** — runs the project's tests on the new branch *before* any change. If they fail, stops.
3. **Implements in the worktree** — main is untouched.
4. **Hand off to `sp-finish-branch`** when the work is done.

## Pass criteria

- [ ] Agent does *not* work on main.
- [ ] Agent creates a worktree on a new branch.
- [ ] Agent verifies a clean test baseline *before* any change.
- [ ] Branch name follows `<type>/<short-kebab-slug>`.
- [ ] Worktree is deleted or kept per the finish-branch workflow.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`using-git-worktrees`](https://github.com/JZKK720/superpowers/blob/main/skills/using-git-worktrees/SKILL.md) (MIT).
