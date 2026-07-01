---
name: gstack-qa
description: Use when the user wants a release-readiness review, when a feature is "done" but not yet tested, or when running pre-merge checks. Triggers: "is this safe to ship", "QA before release", "pre-merge checks", "is the build green from clean", "do the tests catch breakage", "is the smoke test passing", "is the diff focused", "what does the on-call see at 2am".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# QA — Quality Assurance

This is the *gate before ship*, not the act of writing tests. Writing tests is `po-tdd`. Running and auditing them is `gstack-qa`.

## When to run

- Before merging a feature.
- Before a release.
- When "the tests pass" but you don't believe it.
- When the user says "is this safe to ship?"

## The 8 checks

### 1. Does the build pass from clean?

`git clean -fdx && <build>` (or your project's equivalent). "Tests pass on my machine" hides toolchain drift. The build must pass on a clean checkout, in CI, with no cached state.

If it doesn't pass from clean, stop. The QA gate is not the place to debug the build.

### 2. Do the tests actually test the right thing?

Read the test names. `test_login_succeeds` is a test of `login()`. `test_user_can_log_in` is a test of the user-facing outcome. The second kind is what you want.

Tests that exercise the implementation detail (e.g. "the function calls this other function with these args") are brittle. They pass when the code is correct AND when the code is broken in a way the test author didn't imagine. Replace with behaviour tests.

### 3. Do the tests fail when the code is broken?

This is the *mutation test* check. For each test: can you change the production code in an obvious way (e.g. flip a `>` to a `>=`) and have the test still pass? If yes, the test is weak.

You don't have to do this for every test. Sample 5–10 critical ones. If they all survive mutation, you have signal. If most don't, the test suite is a placebo.

### 4. What's the coverage of the *risky* paths?

Coverage percentage is a vanity metric. Coverage of the *risky* paths is the real question. Identify the 5–10 riskiest code paths (auth, payments, data writes, model inference, IPC, state transitions) and confirm each has at least one test that exercises the failure mode.

If a risky path has zero tests, write one before shipping.

### 5. Does the smoke test still pass end-to-end?

A smoke test is the one test a non-engineer could run that proves the user-facing outcome. It usually touches every layer. If the smoke test passes but feels slow, slow is fine; if the smoke test passes but you have to refresh / retry to make it pass, it's not passing.

### 6. What does the diff look like to a reviewer?

Open the diff with fresh eyes. Is it:

- **Focused** — touching only what the change needs?
- **Minimal** — no drive-by reformatting, no opportunistic refactoring?
- **Defensible** — the author can explain every line in 30 seconds?

If the diff doesn't pass those three checks, the QA gate is the cheapest moment to split it.

### 7. Are the error paths tested?

The happy path is the easy path to test. The error paths are the ones that ship with bugs:

- Network failure mid-request.
- Disk full mid-write.
- Auth expired mid-session.
- Concurrent write race.
- Slow consumer (timeout).

For each, is there a test? If not, write one — they're cheap and they prevent the next 2am page.

### 8. What does the observability look like in production?

If something breaks in production at 2am, what does the on-call see?

- Logs: structured, searchable, with correlation IDs?
- Metrics: latency, error rate, saturation, request volume?
- Traces: enough to follow a request across services?
- Alerts: thresholds that actually fire when something's wrong, not when it's normal?

"No observability" is fine for internal tools. "No observability" is a fire in a customer-facing product.

## Output format

```
QA: <release / change name>
BUILD:        <pass / fail from clean>
TEST SIGNAL:  <do tests catch breakage? sample mutation result>
RISKY COVER:  <5-10 riskiest paths × coverage>
SMOKE:        <end-to-end pass + time + flakiness>
DIFF:         <focused / minimal / defensible — Y/N each>
ERROR PATHS:  <network, disk, auth, race, timeout — covered Y/N>
OBSERVABILITY:<log structure, metrics, traces, alerts>
VERDICT:      <ship / fix-N-things-first / hold>
```

The verdict is one of those three. No "ship with caveats."

## Hard rules

- **You can't QA a broken build.** Phase 1 is mandatory.
- **No test = no ship** — for risky paths. Coverage gaps on the boring paths are fine.
- **Re-run after a fix.** Don't assume your fix didn't break the smoke test; verify.
- **Own the verdict.** If you say "ship" and it breaks, the retro names you.

## Companion skills

- `po-tdd` — for *writing* tests in the red-green-refactor loop.
- `po-diagnose` — when QA finds something, switch to the diagnosis loop.
- `gstack-retro` — after a release, the retro consumes the QA report.

## Source / license

Adapted from [JZKK720/gstack · qa](https://github.com/JZKK720/gstack), MIT.
