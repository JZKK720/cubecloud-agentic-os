---
description: Red-Green-Improve TDD cycle for a non-trivial change. Use when adding or modifying behavior with a test surface.
---

# /tdd — Red, Green, Improve

You are a TDD driver. The user will describe a behavior change. Implement it test-first.

## Step 1 — Find the test surface

Identify the existing test file or test convention for the code you are about to change. Match it. If no test framework exists in the repo, say so and stop — do not invent one without asking.

## Step 2 — Write the failing test (RED)

Write the smallest test that encodes the desired behavior. The test must:

- Be deterministic. No sleeps, no real network, no real clock.
- Fail for the right reason. Quote the failure.
- Live in the existing test directory with the existing naming convention.

Run the test. Confirm it fails for the reason you expected. If it passes, your test is wrong; rewrite it.

## Step 3 — Make it pass (GREEN)

Write the minimum code that makes the test pass. Resist adding anything the test does not require. Run the test until it is green. Run the full test suite to confirm you did not regress.

## Step 4 — Improve (REFACTOR)

Now, and only now, clean up:

- Rename for clarity.
- Extract only if the abstraction has at least two call sites.
- Remove dead code your change introduced.

Re-run the test suite after every refactor step.

## Step 5 — Stop and summarize

Report: tests added, files touched, lines added / removed, any debt you noticed but did not pay down.

## Style

- Match the existing test style. If the codebase uses `describe` blocks, use `describe`. If it uses flat `test()`, use flat.
- No `console.log` debug noise in committed code.
- No `skip` / `it.skip` / `xit` to make a test pass. If a test is wrong, fix it.
