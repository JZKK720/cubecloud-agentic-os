# Red baseline: `gstack-retro` (gstack retro)

## Pressure scenario

> User: "Project X is done. Let's have a retro."

This scenario has three pressures:
1. **Closure** ("X is done")
2. **Recency bias** (only the last week is in mind)
3. **Blame risk** (people don't want to call out their own mistakes)

## Expected without the skill

A baseline agent typically:
- **Writes a status report** — "we shipped X, Y, Z". No learning.
- **Doesn't distinguish** plan vs reality.
- **Doesn't name what we'd do differently** — "communicate better" is a wish, not a finding.
- **Doesn't track open items** — deferred work is lost.

## Expected with the skill

A trained agent (with `gstack-retro` loaded) does:
1. **States the original goal** — quoted from the kickoff doc.
2. **Lists what was actually done** — bullets, not narrative.
3. **Names the plan-vs-reality deltas** — for each: what changed, when, and "forced by reality (good) or forced by drift (bad)?"
4. **Names what we got right** — design choice, early decision, test, conversation. Name them so they can be repeated.
5. **Names what we'd do differently** — specific actions, not wishes. Each owned by someone.
6. **Lists what's still open** — for each: consequence of not doing it, cost of doing it later, trigger that re-opens the conversation.

## Pass criteria

- [ ] Original goal is quoted (not paraphrased).
- [ ] "What we'd do differently" has specific actions, not wishes.
- [ ] Each "differently" item has an owner.
- [ ] Open items have triggers (not "we'll get to it").
- [ ] Blameless — blame the decision, the missing information, or the environment; not the people.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
