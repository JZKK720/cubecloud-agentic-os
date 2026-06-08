# Red baseline: `po-diagnose` (poskills diagnose)

## Pressure scenario

> User: "The smoke test is flaky. 1 in 5 runs fails. Fix it."

This scenario has three pressures:
1. **Flaky** (not always reproducible)
2. **Production is degraded** (the user is already worried)
3. **No error message** (the failure is silent)

## Expected without the skill

A baseline agent typically:
- **Tries a fix** — adds a retry, increases a timeout, wraps the call in a try/catch. No hypothesis.
- **Doesn't reproduce** — the agent doesn't see the failure; the fix is a guess.
- **Skips the regression test** — "we'll add one later" (never happens).
- **Doesn't instrument** — the failure mode is unobserved.

## Expected with the skill

A trained agent (with `po-diagnose` loaded) does:
1. **Builds a feedback loop** — runs the smoke locally, captures the failure rate.
2. **Reproduces** — runs the smoke 20 times; counts the failures.
3. **Hypothesises** — race condition in the IPC channel? DB connection pool exhaustion? Garbage-collection pause?
4. **Instruments** — adds timing, log lines, or metrics to confirm one hypothesis.
5. **Fixes** — minimum change to the root cause; no drive-by refactors.
6. **Adds the regression test** — the test that fails 1 in 5 before the fix, passes 100% after.

## Pass criteria

- [ ] Agent reproduces the failure locally before changing any code.
- [ ] Agent forms at least 3 hypotheses *before* running any experiment.
- [ ] Agent instruments with a *minimum* log/assert (not a logging firehose).
- [ ] The fix is the minimum change (no drive-by refactors).
- [ ] The regression test fails before the fix, passes after.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
