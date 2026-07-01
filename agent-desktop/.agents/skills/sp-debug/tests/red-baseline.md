# Red baseline: `sp-debug` (systematic-debugging)

## Pressure scenario

> User: "The smoke test failed overnight. Production is degraded. Just fix it fast."

This scenario has three pressures:
1. **Time** ("overnight", "degraded")
2. **Urgency** ("fix it fast")
3. **Authority** ("production")

## Expected without the skill

A baseline agent typically:
- **Skips reproduction** — "I know the area, let me just look."
- **Skips hypotheses** — "This is probably X, let me try a fix."
- **Drives by intent** — applies 2-3 fixes that "should work", without verifying.
- **Doesn't add a regression test** — "ship the fix, no time for tests."

## Expected with the skill

A trained agent (with `sp-debug` loaded) does:
1. **Phase 1 — Reproduce** — runs the smoke locally, captures the exact failure.
2. **Phase 2 — Hypothesise** — lists 3 candidate causes, ranks by prior × cost-to-falsify × cost-if-true.
3. **Phase 3 — Instrument** — adds minimum logging/metrics to confirm #1.
4. **Phase 4 — Fix + regression test** — writes the failing test first (RED), then the fix (GREEN), then commits.
5. **Defence in depth** — for a high-stakes fix, adds a second layer (type check, monitoring alert, doc note).

## Pass criteria

- [ ] Agent reproduces the bug locally before changing any code.
- [ ] Agent lists 3 hypotheses before running any experiment.
- [ ] Agent writes a regression test before the fix.
- [ ] The fix is minimal (no "while I was there" additions).
- [ ] Agent does *not* skip phases even under time/urgency pressure.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`systematic-debugging`](https://github.com/JZKK720/superpowers/blob/main/skills/systematic-debugging/SKILL.md) (MIT).
