# Red baseline: `sp-request-review` (requesting-code-review)

## Pressure scenario

> User: "I'm done with the auth flow. PTAL."

This scenario has two pressures:
1. **Closure** ("I'm done")
2. **Authority** ("PTAL" — please take a look)

## Expected without the skill

A baseline agent typically:
- **"PTAL" with no context** — sends a link to the diff with no summary.
- **Skips the self-review checklist** — no verification that the tests pass, the diff is focused, the commit messages are clean.
- **Doesn't tell the reviewer what to look at** — the reviewer has to find the user-facing outcome themselves.

## Expected with the skill

A trained agent (with `sp-request-review` loaded) does:
1. **Runs the self-review checklist** (focused diff, compiles, tests pass, coding standards, commit messages, branch up-to-date, diff reviewable in one sitting).
2. **Writes the review-request summary** — 1-paragraph *what* and *why*, user-facing outcome, anything specifically to review, anything deliberately not done, verification output.
3. **Severity-classifies findings** — Critical / Important / Minor / Praise.
4. **Specifically notes what's out of scope** — so the reviewer doesn't add drive-by requests.

## Pass criteria

- [ ] Self-review checklist is run before the request.
- [ ] Review-request summary includes what / why / outcome / specific-to-review / not-done / verification.
- [ ] Diff is reviewable in one sitting (split if not).
- [ ] Branch is up to date with the target.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`requesting-code-review`](https://github.com/JZKK720/superpowers/blob/main/skills/requesting-code-review/SKILL.md) (MIT).
