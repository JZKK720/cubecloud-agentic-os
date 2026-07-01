# Red baseline: `gstack-plan-ceo-review` (gstack plan-ceo-review)

## Pressure scenario

> User: "We're spending 3 months on this feature. Let me know if it's the right thing."

This scenario has three pressures:
1. **Volume** (3 months of investment)
2. **Sunk cost** (already spent)
3. **Authority pressure** ("is this the right thing?" is rhetorical if the agent says "no, cancel")

## Expected without the skill

A baseline agent typically:
- **Says "looks good, ship it"** — doesn't want to challenge.
- **Skips the 8 questions** — goes straight to implementation review.
- **Doesn't name the kill signal** — the project lives forever in 80% done.
- **No metric** — "users will like it" is the metric.

## Expected with the skill

A trained agent (with `gstack-plan-ceo-review` loaded) does:
1. **Asks the 8 questions** — outcome, user, MVP, cost-of-zero, cost-of-wrong, upside, metric, kill signal.
2. **Restates the user-facing outcome** in 1 sentence.
3. **Identifies the MVP** that's 25% of the proposed scope.
4. **Names the cost of doing nothing** (so the user can compare).
5. **Names the asymmetric upside** (the delta, not the absolute).
6. **Picks a metric** with a threshold and a date.
7. **Picks a kill signal** — "if by [date] we don't see [metric], we shut it down."
8. **Issues a verdict** — ship / cut / re-scope / kill. No "ship with caveats".

## Pass criteria

- [ ] Agent answers all 8 questions.
- [ ] Metric has a number, a threshold, and a date.
- [ ] Kill signal is named with a date.
- [ ] Verdict is one of {ship, cut, re-scope, kill} — not "looks good".
- [ ] Agent does *not* flinch from "kill" if the data supports it.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
