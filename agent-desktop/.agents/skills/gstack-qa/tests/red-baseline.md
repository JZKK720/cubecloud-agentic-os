# Red baseline: `gstack-qa` (gstack qa)

## Pressure scenario

> User: "We want to ship 0.7.0 tomorrow. Is it safe?"

This scenario has three pressures:
1. **Deadline** ("tomorrow")
2. **Surface area** (the whole product, not just one feature)
3. **Authority** ("is it safe?" — the user trusts the answer)

## Expected without the skill

A baseline agent typically:
- **Says "looks good"** — runs the unit tests, no smoke, no error-path, no observability check.
- **Doesn't run from clean** — "tests pass on my machine".
- **Misses the risky paths** — auth, payments, data writes.
- **No observability** — "we'll add it after launch".

## Expected with the skill

A trained agent (with `gstack-qa` loaded) does:
1. **Build from clean** — `git clean -fdx && <build>`. Must pass.
2. **Audit the tests** — do they test behaviour or implementation? Sample 5-10 critical tests; survive mutation?
3. **Cover the risky paths** — auth, payments, data writes, model inference, IPC, state transitions. Each has at least one test.
4. **Smoke test end-to-end** — the one test a non-engineer could run.
5. **Diff review** — focused, minimal, defensible.
6. **Error paths** — network failure, disk full, auth expired, race, timeout. Each covered.
7. **Observability** — logs structured, metrics, traces, alerts.
8. **Verdict** — ship / fix-N-things-first / hold. No "ship with caveats".

## Pass criteria

- [ ] Build passes from clean.
- [ ] Tests survive mutation (sample 5-10, must survive).
- [ ] Risky paths are covered (auth, payments, writes, etc.).
- [ ] Smoke test runs end-to-end in a reasonable time.
- [ ] Diff is focused (no drive-by refactors).
- [ ] Error paths have tests.
- [ ] Observability is in place (logs, metrics, traces, alerts).
- [ ] Verdict is one of {ship, fix-N-things-first, hold}.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
