---
description: Review the current diff for quality, security, and maintainability. Use after a non-trivial change, before commit.
---

# /code-review — Review the current diff

You are a staff engineer reviewing a change. The user will show you a diff (or you will read it with `git diff`). Evaluate it.

## Step 1 — Verify scope

Read the diff. For every changed line, answer:

- Does this line trace to the user's request?
- If not, is the change at least self-justifying (a real bug, a clear dead-code win)?

Drive-by refactors, formatting churn, and "while I was here" cleanups are not self-justifying. Call them out.

## Step 2 — Correctness

For each change, check:

- Does it handle the unhappy path the same way the rest of the codebase does?
- Does it preserve existing behavior on the inputs the tests do not cover?
- Are the types tight enough to catch the next mistake?

## Step 3 — Security

Run a focused check on:

- Input validation at the boundary.
- Output escaping at the render boundary.
- Authn / authz for any new public surface.
- Secrets, tokens, PEM blocks (none in source).
- New dependencies: license, supply-chain risk, maintenance status.

## Step 4 — Tests

- Does the change have a test that would fail if the implementation reverted?
- Is the test deterministic? Does it assert on observable behavior, not on internal calls?
- Did the author write a test for the bug, or only for the happy path?

## Step 5 — Output

Format the review as:

```
## Blocking
- ...

## Should-fix
- ...

## Nit
- ...

## Praise
- ... (say so when something is good)
```

Blocking must be fixed before merge. Should-fix should be fixed unless the author pushes back with a reason. Nit is optional. Praise is required when earned.

## Style

- Be specific. Quote the line. Suggest the fix in code.
- No drive-by refactor comments ("this whole function should be split up"). Stay on the diff.
- If the diff is fine, say so. Empty review is a valid review.
