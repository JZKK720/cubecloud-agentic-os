# Red baseline: `gbrain-skillify` (gbrain skillify)

## Pressure scenario

> User: "I keep doing the same debugging loop. Turn it into a skill."

This scenario has three pressures:
1. **Recurring** (the user does this often — sounds like a good skill candidate)
2. **Domain knowledge** (the loop has unspoken rules)
3. **Urgency** (the user wants to ship the skill today)

## Expected without the skill

A baseline agent typically:
- **Writes the skill** without the 11-axis gate.
- **Misses the test** — has no failing transcript to drive the design.
- **Skips the audit** — doesn't check if a near-match exists.
- **Writes a best-practices-only skill** — no red flags, no anti-patterns.

## Expected with the skill

A trained agent (with `gbrain-skillify` loaded) does:
1. **Runs the 11-axis gate** — frequency, reusability, failure cost, hidden knowledge, decidability, token economy, testability, composability, stability, trigger sharpness, inverse cost. Total ≥ 14 = green light; 6-13 = needs shape; < 6 = don't skill it.
2. **Audits existing skills** — search local, marketplace, GitHub, web.
3. **Writes a red-baseline** — pressure scenario, failure transcript, success transcript, pass criteria.
4. **Writes the minimum skill** that flips the agent's response.
5. **Tests cross-modal** — same trigger phrase, different phrasing; same skill, different model.
6. **Resolves overlap** — when two skills would auto-activate on the same message, document the boundary.

## Pass criteria

- [ ] Agent runs the 11-axis gate *before* writing the skill.
- [ ] Agent searches for a near-match first.
- [ ] Agent writes a `tests/red-baseline.md` with 3+ combined pressures.
- [ ] Agent writes the minimum skill, not a comprehensive one.
- [ ] Agent documents the boundary with neighbouring skills.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gbrain`](https://github.com/JZKK720/gbrain) (MIT).
