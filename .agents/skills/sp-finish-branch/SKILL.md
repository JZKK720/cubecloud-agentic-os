---
name: sp-finish-branch
description: Use when the plan is executed and the tests pass — verifies the worktree is ready, presents the user with the merge/PR/keep/discard options, and cleans up the worktree. The last skill in the development lifecycle.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: finishing-a-development-branch
  version: "1.0.0"
---

# Finishing a Development Branch

The work is done. Now: verify, present options, and clean up. Don't skip any step.

## The flow

```
Plan executed. Tests pass. Commits clean.
  ↓
Re-run the full smoke (the end-to-end, not the per-task tests).
  ↓
Confirm the diff is focused (per cubecloud-request-review's self-check).
  ↓
Present the user with 4 options:
  1. Merge to main
  2. Open a PR
  3. Keep the worktree (work is not done; user will come back)
  4. Discard the worktree (work is wrong; abandon)
  ↓
If 1 or 2: clean up the worktree after merge.
If 3: leave the worktree; add a note for the next session.
If 4: confirm the user wants to discard; then delete the worktree + branch.
```

## Pre-finish verification

Before presenting options:

- [ ] All tests pass (per `cubecloud-verify`).
- [ ] The smoke test passes end-to-end.
- [ ] The diff is focused — no drive-by changes, no debug code, no commented-out sections.
- [ ] The commit messages are clean and reference the plan / issue.
- [ ] The branch is up to date with the target branch (rebased if needed).
- [ ] The CHANGELOG is updated (if the project keeps one).
- [ ] The documentation is updated (if the change affects user-facing behaviour).

If any item is "no", fix it before presenting the options.

## The 4 options

### 1. Merge to main

The change is small, low-risk, and self-contained. Merge with a fast-forward (or a merge commit if the team prefers).

```bash
cd <main checkout>
git merge --ff-only feature/<feature-slug>
# or: git merge --no-ff feature/<feature-slug>  (if the team keeps merge commits)
```

After the merge, delete the worktree:

```bash
git worktree remove ../<repo>-<feature>
git branch -d feature/<feature-slug>
```

### 2. Open a PR

The change needs a review, or the team requires PRs for main. Push the branch and open the PR.

```bash
cd <worktree>
git push -u origin feature/<feature-slug>
# open the PR via the project's preferred mechanism (gh pr create, GitLab, etc.)
```

Then run `cubecloud-request-review` on your own work, and respond with `cubecloud-receive-review` once the reviewer replies.

After the PR merges, clean up the worktree.

### 3. Keep the worktree

The work is in flight; the user will come back. Leave the worktree in place. Add a note in the worktree's `docs/notes.md` (or a project-equivalent) describing the state of the work.

```bash
# Don't delete the worktree. Don't delete the branch.
# Add a note for the next session.
echo "## WIP <feature> — <state>" >> docs/notes.md
git add docs/notes.md
git commit -m "WIP note for <feature>"
```

When the user comes back, the worktree is the starting point. Re-run the pre-finish verification before continuing.

### 4. Discard the worktree

The work was wrong; the user wants to abandon it. Confirm explicitly:

> "Discarding the worktree will delete the branch and all unmerged commits. This is irreversible. Confirm?"

If yes:

```bash
cd <main checkout>
git worktree remove --force ../<repo>-<feature>
git branch -D feature/<feature-slug>
```

The unmerged commits are gone. The branch is gone. The worktree is gone. The user can start fresh with a new plan.

## Anti-patterns

- **Skipping the smoke test** — "the per-task tests pass" is not the same as "the end-to-end works". Run the smoke.
- **"I'll merge later"** — leaving a feature branch alive for weeks is a rebase nightmare. Merge or discard promptly.
- **Merging to main without a rebase** — if the branch has diverged from main, the merge is messy. Rebase first.
- **Discarding without confirming** — the user may have wanted to keep some of the work. Confirm explicitly.
- **Force-pushing to the remote** — if the work is on a remote, force-push is rarely the right answer. Re-think the plan.

## Related skills

- `cubecloud-verify` — the verification step that precedes finish.
- `cubecloud-request-review` — the pre-review checklist before opening a PR.
- `cubecloud-receive-review` — the response cycle after a reviewer replies.

## Source / license

Adapted from [JZKK720/superpowers · finishing-a-development-branch](https://github.com/JZKK720/superpowers/blob/main/skills/finishing-a-development-branch/SKILL.md), MIT.
