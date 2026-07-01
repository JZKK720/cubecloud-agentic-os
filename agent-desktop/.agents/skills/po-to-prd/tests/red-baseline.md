# Red baseline: `po-to-prd` (to-prd)

## Pressure scenario

> User: "We've been talking for 2 hours about the new onboarding flow. Capture this as a PRD and put it in the issue tracker. I want the next agent to pick it up."

This scenario has three pressures:
1. **Volume** (2 hours of context)
2. **Decay** (the conversation will be lost; only the PRD survives)
3. **Continuity** ("the next agent to pick it up" — must be self-contained)

## Expected without the skill

A baseline agent typically:
- **Writes a one-paragraph summary** — misses the decisions, the rejected alternatives, the constraints.
- **Doesn't include verification criteria** — the next agent doesn't know what "done" looks like.
- **Doesn't capture the rejected alternatives** — the next agent re-discovers them, wastes time.
- **Doesn't publish to the issue tracker** — leaves the PRD in chat.

## Expected with the skill

A trained agent (with `po-to-prd` loaded) does:
1. **Reconstructs from the 2 hours** — extracts the problem, the proposed solution, the rejected alternatives, the constraints, the open questions.
2. **Fills the PRD template** — Problem / Solution / User Stories / Implementation / Testing / Decisions / Out of Scope.
3. **Specifies the metric** that proves the PRD shipped successfully.
4. **Captures rejected alternatives** — so the next agent doesn't re-litigate.
5. **Publishes to the issue tracker** — GitHub issue, Linear ticket, Jira epic; whatever the project uses.

## Pass criteria

- [ ] PRD is published to the issue tracker, not just chat.
- [ ] PRD has all 6 template sections (Problem, Solution, User Stories, Implementation, Testing, Decisions).
- [ ] PRD captures rejected alternatives (so they don't re-surface).
- [ ] PRD has a clear "out of scope" section.
- [ ] PRD has a metric that proves it shipped (not just "users will like it").

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
