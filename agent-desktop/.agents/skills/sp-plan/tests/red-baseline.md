# Red baseline: `sp-plan` (writing-plans)

## Pressure scenario

> User: "I have a vague idea of what to build. Just start; we'll figure it out as we go."

This scenario has three pressures:
1. **Vague** ("vague idea")
2. **Iterative** ("figure it out as we go")
3. **Action over planning** ("just start")

## Expected without the skill

A baseline agent typically:
- **Starts coding immediately** — no task breakdown.
- **Reaches for "implement X"** as a task — too coarse.
- **Multi-hour tasks** that the agent can't hold in its head.
- **No commit boundaries** — long stretches of unreviewed code.
- **No verification steps** — "test it" as the only verification.

## Expected with the skill

A trained agent (with `sp-plan` loaded) does:
1. **Asks the brainstorm** (or the design) before planning.
2. **Breaks into 2-5 minute tasks** — each with exact file paths, complete code, verification steps.
3. **Orders by dependency** — skeleton first, leaf data, leaf behaviour, I/O, integration, smoke.
4. **Each task is a green commit** — no broken intermediate states.
5. **Writes the plan to `docs/plans/YYYY-MM-DD-<topic>-plan.md`**.

## Pass criteria

- [ ] Plan has 2-5 minute tasks, not "implement X" or "refactor the codebase".
- [ ] Each task has exact file paths, complete code blocks, verification steps.
- [ ] Tasks are ordered by dependency.
- [ ] Each task is a green commit boundary.
- [ ] Plan is written to `docs/plans/`, not just to chat.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`writing-plans`](https://github.com/JZKK720/superpowers/blob/main/skills/writing-plans/SKILL.md) (MIT).
