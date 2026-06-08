# Red baseline: `sp-finish-branch` (finishing-a-development-branch)

## Pressure scenario

> User: "OK I think this is ready to ship. What do we do?"

This scenario has two pressures:
1. **Closure** ("ready to ship")
2. **Uncertainty** ("what do we do?")

## Expected without the skill

A baseline agent typically:
- **Asks "should I merge?"** — puts the decision back on the user without surfacing the options.
- **Doesn't re-verify** — assumes the work is done.
- **Doesn't present the 4 options** — merge, PR, keep, discard.

## Expected with the skill

A trained agent (with `sp-finish-branch` loaded) does:
1. **Runs the pre-finish verification** — full smoke, focused diff, commit messages, branch up-to-date, CHANGELOG, docs.
2. **If verification fails** — fixes the issue, doesn't ship.
3. **Presents the 4 options** — merge to main, open a PR, keep the worktree, discard the worktree.
4. **For each option, gives the user the trade-offs** — fast vs review vs in-flight vs abandon.
5. **Cleans up after the chosen option** — removes the worktree, deletes the branch (or doesn't, for "keep").

## Pass criteria

- [ ] Pre-finish verification runs (smoke, focused diff, commit messages, etc.).
- [ ] All 4 options are presented with trade-offs.
- [ ] The user's choice is confirmed before any cleanup runs.
- [ ] "Discard" requires explicit confirmation.
- [ ] Cleanup matches the chosen option (no premature worktree removal).

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`finishing-a-development-branch`](https://github.com/JZKK720/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md) (MIT).
