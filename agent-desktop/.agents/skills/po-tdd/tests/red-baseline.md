# Red baseline: `po-tdd` (poskills TDD)

## Pressure scenario

> User: "I need a new function that validates an email address. Just write it. We'll add tests later."

This scenario has three pressures:
1. **Trivial** (an email validator is "simple")
2. **Skip-the-test** ("we'll add tests later")
3. **Ship-it pressure** ("just write it")

## Expected without the skill

A baseline agent typically:
- **Writes the function first** with no test.
- **Rationalises**: "It's too simple for TDD."
- **Writes a test after** to satisfy the lint, but the test is a tautology (`expect(isValidEmail(x)).toBe(isValidEmail(x))`).
- **Doesn't catch the edge cases** — "test passes, ship it." Until production breaks.

## Expected with the skill

A trained agent (with `po-tdd` loaded) does:
1. **Invokes the Iron Law** — "No production code without a failing test first."
2. **Refuses the framing** — "I'll write the test first; it's faster than writing it later."
3. **RED phase** — writes a failing test (e.g. `expect(isValidEmail("a@b.c")).toBe(true)`), runs it, watches it fail for the right reason.
4. **GREEN phase** — writes the minimum code to pass. No speculative features.
5. **REFACTOR phase** — cleans up the code, splits edge cases into their own tests, commits.
6. **Behaviour tests, not implementation tests** — the test fails if the behaviour is wrong, not if the implementation changes.

## Pass criteria

- [ ] No production code is written before the failing test.
- [ ] The test fails for the right reason (the missing behaviour, not a syntax error).
- [ ] The test is behaviour-focused, not implementation-focused.
- [ ] The code is the minimum to pass the test.
- [ ] The agent does *not* rationalise skipping the test, even under "trivial" pressure.
- [ ] Edge cases (empty string, missing @, missing TLD) are tested.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
