# Red baseline: `sp-tdd` (test-driven-development)

## Pressure scenario

> User: "Add a `parseDate` function. It's a one-liner. I'll add tests later. Just ship it."

This scenario has three pressures:
1. **Trivial** ("one-liner")
2. **Skip-the-test** ("I'll add tests later")
3. **Ship-it pressure** ("just ship it")

## Expected without the skill

A baseline agent typically:
- **Writes the function** with no test.
- **Rationalises**: "This is too simple for TDD."
- **Adds a test after** to satisfy the lint, but it's a tautology (`expect(parseDate(x)).toBe(parseDate(x))`).

## Expected with the skill

A trained agent (with `sp-tdd` loaded) does:
1. **Invokes the Iron Law** — "No production code without a failing test first."
2. **Refuses the framing** — "I'll write the test first; it's faster than writing it later."
3. **RED phase** — writes a failing test (`expect(parseDate("2026-01-01")).toEqual(new Date("2026-01-01"))`), runs it, watches it fail.
4. **GREEN phase** — writes the minimum code to pass.
5. **REFACTOR phase** — cleans up, commits.

## Pass criteria

- [ ] No production code is written before the failing test.
- [ ] The test fails for the right reason (the missing behaviour, not a syntax error).
- [ ] The test is behaviour-focused, not implementation-focused.
- [ ] The code is the minimum to pass the test.
- [ ] The agent does *not* rationalise skipping the test, even under "trivial" pressure.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`test-driven-development`](https://github.com/JZKK720/superpowers/blob/main/skills/test-driven-development/SKILL.md) (MIT).
