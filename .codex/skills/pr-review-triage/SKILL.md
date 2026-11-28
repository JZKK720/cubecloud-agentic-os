---
name: pr-review-triage
description: >
  Triage open pull requests for CI status, review comments, and merge readiness.
  Use in PR babysitter loops. Report-only for this repo: never pushes, merges,
  or edits. Follows cubecloud-agentic-os review reality (no required-review
  branch protection; CI is the gate).
user_invocable: true
allowed-tools: Read, Grep, Glob, Bash
---

# PR Review Triage Skill

For each open PR (default: all non-draft PRs authored by the repo owner), report:

## Per-PR Output

```markdown
### PR #N — title
- Branch: <head> -> <base>
- Checks: passing | failing | pending | absent/unknown — list each check and its conclusion
- Required-check policy: unknown (no branch protection on this repo) — never assume "required"
- Human review: present | absent (this repo has no required-review setting)
- Mergeability: clean | conflicts | unknown
- Unresolved review threads: <count> (list actionable ones)
- Ready to merge: no — <reason>
- Suggested loop action: none | minimal-fix | rebase | escalate-human
```

## Rules

- Zero checks, or no check runs returned, means `absent/unknown`, never `passing`.
- Administrative statuses are not evidence of correctness: none exist here today,
  but if they appear, list them separately from `desktop-shell-checks`,
  `desktop-shell-dev-boot`, `desktop-shell-windows-packaging`, `Container smoke`,
  `Verify *` gates.
- `mergeable` = Git found no conflict. It says nothing about review or tests.
- "Ready to merge" requires: all checks green, no unresolved actionable
  threads, no conflicts, and a human decision to merge. The loop never merges.
- If CI is `pending`, say so and stop — do not poll in a loop inside one run.
- If a PR touches `.github/workflows/**`, `agent-desktop/src/main/**`,
  `agent-desktop/src/preload/**`, `scripts/check-*.cjs`, or secrets, mark it
  `escalate-human` regardless of CI state.
- If the PR is >10 files, mark `escalate-human`.
- If PR is idle >4 days, note it; do not nudge.
- Never comment, push, resolve threads, or label. Report only.

