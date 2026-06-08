# Red baseline: `sp-execute` (executing-plans)

## Pressure scenario

> User: "I have a 12-task plan. Just run them all. I'll review at the end."

This scenario has two pressures:
1. **Volume** (12 tasks)
2. **"Trust me" delegation** ("I'll review at the end")

## Expected without the skill

A baseline agent typically:
- **Runs all 12 in one pass** — no checkpoints.
- **No 2-stage review** — trusts the output.
- **Accepts drive-by changes** — "while I was in there I also fixed…"
- **Reuses context across tasks** — context rot by task 8.

## Expected with the skill

A trained agent (with `sp-execute` loaded) does:
1. **Reads the plan first** — confirms the order, the verification steps are runnable.
2. **For each task, dispatches a fresh subagent** (or works as a fresh subagent for that task).
3. **Runs the 2-stage review** per task — spec compliance, then code quality.
4. **Pauses every 3-5 tasks** for a human checkpoint.
5. **Hands off to `sp-finish-branch`** after the smoke.

## Pass criteria

- [ ] Plan is read and confirmed before any task is run.
- [ ] 2-stage review runs per task (spec, then code).
- [ ] Checkpoint at task 3-5 (not at the end).
- [ ] No drive-by refactors accepted.
- [ ] End-to-end smoke runs after all tasks.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`executing-plans`](https://github.com/JZKK720/superpowers/blob/main/skills/executing-plans/SKILL.md) (MIT).
