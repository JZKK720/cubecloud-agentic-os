---
name: sp-debug
description: Use when something is broken, flaky, or behaving unexpectedly — enforces a 4-phase root-cause process: reproduce → hypothesise → instrument → fix with regression test. Replaces ad-hoc "change things until it works" debugging.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: systematic-debugging
  version: "1.0.0"
---

# Systematic Debugging

Ad-hoc debugging is the most expensive way to ship a fix. The 4-phase process below is faster, even on the first try, because it avoids the "try a thing, break something else, try another thing" loop.

## Phase 1 — Reproduce

Before you can fix a bug, you need to be able to trigger it on demand.

- **Reproduce locally** if possible. The bug must be triggerable with a command, a test, or a sequence of UI actions.
- **Capture the inputs**: file, line, data, env vars, network state, timing.
- **Capture the output**: error message, stack trace, log line, wrong value, wrong state.
- **If you cannot reproduce**, you do not have a bug yet. Go back to the user. State the symptom precisely and ask for more.

## Phase 2 — Hypothesise

Before changing any code, list 3 candidate causes. Rank them.

- **Prior probability** — how often is this the cause in similar systems?
- **Cost to falsify** — cheap to rule out?
- **Cost if true** — how bad is the fix?

The cheapest-to-falsify, highest-prior hypothesis goes first. If you can't write 3, you don't understand the bug well enough to fix it.

## Phase 3 — Instrument

Add the *minimum* logging / metrics / asserts needed to confirm or deny the #1 hypothesis.

- **One variable changed.** Multi-variable experiments produce multi-variable failures.
- **A falsifiable prediction.** "If hypothesis #1 is true, then we should see X." State X.
- **A fast read.** Prefer an experiment with a <1 hour read time.
- **A clean baseline.** What does "normal" look like? Have it before the experiment.

The discipline is *not changing the experiment* when the result surprises you. Surprises are data. If the prediction is wrong, the hypothesis is wrong; that's progress.

## Phase 4 — Fix + regression test

Once you have a confirmed root cause:

1. **Write the regression test first** (per `cubecloud-tdd` — RED).
2. **Make the minimal change** that makes the test pass (GREEN).
3. **Refactor** if needed.
4. **Add the test to the CI / smoke run** so the bug never returns.
5. **Delete the debug instrumentation** you added in Phase 3. It served its purpose.

## Defence in depth

For a high-stakes fix, add a *second* layer of protection:

- A type or schema check that would have caught the bug earlier.
- A monitoring alert on the symptom.
- A documentation note in the code explaining *why* the fix is non-obvious.

Use this for security, data-loss, and correctness bugs. Skip it for cosmetic fixes.

## Anti-patterns

- **"I think I know what's wrong" → change code** — without a hypothesis, you're guessing. Every guess risks breaking something else.
- **"I'll add more logging"** — without a hypothesis to confirm, logging is noise.
- **"The fix is obvious"** — bugs that look obvious are usually the same bug you keep reintroducing.
- **"It works now, ship it"** — without a regression test, the bug returns.
- **Tautological diagnosis** — "the slow code is being hit" describes the symptom, not the cause.

## Related skills

- `cubecloud-verify` — "did the fix actually fix it?" The phase right after you ship.
- `po-diagnose` — a lighter version of this skill for everyday bugs. Use `cubecloud-debug` for hard, recurring, or flaky bugs.

## Source / license

Adapted from [JZKK720/superpowers · systematic-debugging](https://github.com/JZKK720/superpowers/blob/main/skills/systematic-debugging/SKILL.md), MIT.
