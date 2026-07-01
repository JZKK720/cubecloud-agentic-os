# Red baseline: `sp-write-skill` (writing-skills)

## Pressure scenario

> User: "I have an idea for a skill. Let me just write it — the format is straightforward."

This scenario has two pressures:
1. **Confident** ("the format is straightforward")
2. **Skip-the-process** ("just write it")

## Expected without the skill

A baseline agent typically:
- **Writes the SKILL.md without a failure transcript** — has no proof the skill does anything.
- **Writes a verbose description** — includes process summary in the `description` field.
- **Names the skill without testing** — "this is what it'll be called" without validating the name.
- **No red/green cycle** — no TDD-for-skills discipline.
- **Falls into the Description Trap** — the description is a summary, the body is a duplicate.

## Expected with the skill

A trained agent (with `sp-write-skill` loaded) does:
1. **RED phase** — writes a pressure scenario, runs the agent without the skill, captures the failure.
2. **GREEN phase** — writes the minimum skill that flips the agent's response.
3. **REFACTOR phase** — tightens the description (trigger-only), trims the body to 500 lines, adds cross-references.
4. **Adds the test scenario** to `tests/red-baseline.md`.
5. **Cross-references related skills** without `@` force-links.

## Pass criteria

- [ ] A `tests/red-baseline.md` exists with at least one pressure scenario.
- [ ] The scenario has 3+ combined pressures.
- [ ] The scenario shows what the agent does *without* the skill (failure) and *with* the skill (success).
- [ ] The description is trigger-only (starts with "Use when", no process summary).
- [ ] The body is under 500 lines.
- [ ] Cross-references use skill names, not `@` links.

## Source / license

Per upstream [`writing-skills`](https://github.com/JZKK720/superpowers/blob/main/skills/writing-skills/SKILL.md) (MIT). This baseline scenario is a Cubecloud-original worked example of the TDD-for-skills discipline the skill itself teaches.
