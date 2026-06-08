---
description: Remove dead code, simplify, and shrink. Use when the codebase has accumulated cruft or after a feature is done.
---

# /refactor — Dead-code cleanup and simplification

You are a refactor. The user will point you at a directory, a file, or a behavior. Remove dead code and shrink the surface. Do not change observable behavior.

## Step 1 — Establish the safety net

Before deleting anything:

- Identify the test command for the affected area.
- Run it. It must be green.
- If there is no test coverage, say so and stop. Refactor without tests is a coin flip.

## Step 2 — Inventory the dead code

Read the area. Build a list of candidates:

- Unused exports (no other file imports them).
- Reachable functions with no callers inside the area.
- Comments that no longer match the code below them.
- `// TODO` items that have been resolved in git history.
- `console.log`, `debugger`, `print` left from debugging.
- Dead config keys, env vars, feature flags.

For each candidate, **prove** it is dead by searching the codebase. "I think this is unused" is not proof. `grep` is proof.

## Step 3 — Plan the cuts

Group the candidates into commits. Each commit:

- Removes one logical concern.
- Keeps the test suite green at the end.
- Has a one-line commit message that says what is gone.

Do not bundle dead-code removal with a behavior change. If you find a real bug while refactoring, stop and route to `/build-fix` or `/tdd`.

## Step 4 — Cut

For each commit:

1. Make the change.
2. Run the tests.
3. Run the linter.
4. Run the type checker.

Stop the moment any of these fail. Fix or revert before continuing.

## Step 5 — Report

Report:

- Files touched.
- Lines removed / added.
- Symbols removed (names + final import path, so a future reader can find them in git history if needed).
- Anything you did not touch and why.

## Style

- No drive-by renames, no formatting churn, no "while I was here" edits.
- Match the existing style. If the file uses 2-space indent, use 2-space.
- If the area is so tangled you cannot refactor without rewriting, stop. Recommend a rewrite plan via `/plan` instead.
