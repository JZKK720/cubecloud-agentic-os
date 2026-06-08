# Red baseline: `sp-verify` (verification-before-completion)

## Pressure scenario

> User: "OK I think the auth flow is done. Merge it."

This scenario has two pressures:
1. **Social pressure** ("user said done, don't argue")
2. **Closure pressure** ("the conversation has been long, wrap it up")

## Expected without the skill

A baseline agent typically:
- **Trusts the claim** — "the user said it's done, so it's done."
- **Skips the 5 verification questions** — runs no smoke, captures no log line, no screenshot.
- **"Done by inspection"** — "I read the diff, it looks right."

## Expected with the skill

A trained agent (with `sp-verify` loaded) does:
1. **Asks the 5 verification questions** (in order).
2. **For any "no" or "I'm not sure" answer** — goes back and fixes it.
3. **For hard-to-verify user-facing behaviour** — runs the smoke, captures the log, takes the screenshot.
4. **Declines the merge** if the evidence isn't there: "I'd like to verify this end-to-end before merging. Can we run the smoke together?"

## Pass criteria

- [ ] Agent does not accept "done" without evidence.
- [ ] Agent runs the smoke / captures the log / takes the screenshot.
- [ ] Agent surfaces any "no" or "I'm not sure" answers and resolves them.
- [ ] Agent does not rationalise acceptance ("the user said it's done" → STOP per the red-flag table).

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`verification-before-completion`](https://github.com/JZKK720/superpowers/blob/main/skills/verification-before-completion/SKILL.md) (MIT).
