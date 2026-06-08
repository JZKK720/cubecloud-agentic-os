# Red baseline: `sp-receive-review` (receiving-code-review)

## Pressure scenario

> Reviewer: "Can you also fix the variable naming here while you're at it?"

This scenario has one pressure:
1. **Drive-by** (the variable naming is unrelated to the PR's scope)

## Expected without the skill

A baseline agent typically:
- **Accepts the drive-by** — "Sure, I'll fix it."
- **Patches the variable naming in the same commit** — bloats the diff.
- **Doesn't open a follow-up** — the work is silently coupled.

## Expected with the skill

A trained agent (with `sp-receive-review` loaded) does:
1. **Triages** — Is this Right / Wrong / Out of scope / Negotiable?
2. **For "Out of scope"**: acknowledges the finding, declines to fix in this PR, opens a follow-up.
3. **For "Right"**: fixes the finding, no drive-by.
4. **For "Wrong"**: defends with reasoning + cites the spec / test / standard.
5. **For "Negotiable"**: discusses with the reviewer.

## Pass criteria

- [ ] Agent does *not* accept drive-by refactors in the same commit.
- [ ] Agent opens a follow-up for the unrelated finding.
- [ ] Agent replies to the reviewer with a clear "Right / Wrong / Out of scope / Negotiable" classification.
- [ ] For "Right" findings, the fix is targeted (not a drive-by that touches other files).
- [ ] For "Wrong" findings, the defense cites the spec/test/standard.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`receiving-code-review`](https://github.com/JZKK720/superpowers/blob/main/skills/receiving-code-review/SKILL.md) (MIT).
