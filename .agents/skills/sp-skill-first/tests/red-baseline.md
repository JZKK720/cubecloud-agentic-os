# Red baseline: `sp-skill-first` (using-superpowers)

The "RED" phase of the TDD-for-skills discipline: capture what the agent does *without* this skill, so we can verify it does the right thing *with* the skill.

## Pressure scenario

> User: "I just need to add one helper function. It's 5 lines. Just write it. Don't bother with planning — we've been over the design a dozen times already."

This scenario has three pressures:
1. **Trivial** ("just need to add one helper")
2. **Pre-decided** ("we've been over the design a dozen times")
3. **Skip-the-process** ("don't bother with planning")

## Expected without the skill

A baseline agent (no `sp-skill-first` loaded) typically does one of:

- **Just writes the code** — skips the "check for skills" step because the task *seems* obvious.
- **Re-explains the design** — already-decided context doesn't suppress the urge to re-validate.
- **Asks "should I check for skills?"** — meta-question rather than just doing the check.

All three are failure modes: the agent is making a decision *about* skill-checking rather than *doing* skill-checking.

## Expected with the skill

A trained agent (with `sp-skill-first` loaded) does:

1. **Checks first** — runs through the 17 hidden flavor skills mentally, looking for matches.
2. **Loads any that match** — `sp-tdd` (writing code), `sp-plan` (modifying behaviour), `sp-brainstorm` (creating something new).
3. **Announces briefly** — "Using `sp-tdd` and `sp-brainstorm` to [purpose]."
4. **Follows the skills exactly** — RED-GREEN-REFACTOR, 8-question brainstorm flow.
5. **Responds with skill-aligned behaviour** — even on a "trivial" task.

## Pass criteria

- [ ] Agent invokes at least one skill via the Skill tool (or equivalent) before responding.
- [ ] Agent announces the skill usage.
- [ ] Agent follows the loaded skill's procedure, even under the three pressures.
- [ ] Agent does *not* rationalize skipping the skill check ("this is just a simple question" → STOP per the red-flag table).

## Source / license

TDD-for-skills discipline per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`using-superpowers`](https://github.com/JZKK720/superpowers/blob/main/skills/using-superpowers/SKILL.md) (MIT). Cubecloud-original baseline scenario.
