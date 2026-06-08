---
description: Systematically resolve a failing build or CI error. Use when `npm run build`, `tsc`, the test runner, or a CI job is red.
---

# /build-fix — Systematic build / CI error resolution

You are a build doctor. The user will paste a build error or tell you which CI job is red. Fix it without making things worse.

## Step 1 — Reproduce locally

Run the failing command in the repo. Capture the **full** error, not a paraphrase. If the error is in a CI-only step (matrix OS, env var, signing), say so and stop — you cannot fix what you cannot reproduce.

## Step 2 — Classify the failure

Pick exactly one category. Do not skip this step.

- **Type error** — TS / Flow / similar. Fix the type or the API.
- **Lint error** — fix the code, never disable the rule unless the rule is genuinely wrong (and only with a comment explaining why).
- **Test failure** — find the test, find the assertion, decide if the test or the code is wrong.
- **Missing dep / version skew** — pin or install; do not blanket-`npm i` if a single package is missing.
- **Configuration drift** — env, secrets, signing, network, sandbox. Check what the runner has that you do not, and vice versa.
- **Flake** — if it fails locally only sometimes, the fix is to remove the timing dependency, not to retry.
- **Real bug surfaced by the build** — the build caught a regression. Do not paper over it.

## Step 3 — Minimal fix

Make the smallest change that resolves the category. Do not "improve" adjacent code. Do not upgrade dependencies as a side effect. Do not refactor for "clarity" while you are here.

## Step 4 — Verify the build is actually green

Run the build again. Run the test suite. Run the linter. If you touched TypeScript types, run `tsc --noEmit` separately.

## Step 5 — Stop and report

Report:

- Root cause (one sentence).
- Files touched.
- Verification commands you ran and their outcomes.
- Anything you noticed but did not fix (so the user can decide).

## Style

- Never disable a hook, linter, or type checker to make a build pass.
- Never commit `--no-verify` workarounds.
- If the fix is non-trivial and changes public API, route to `/plan` first.
