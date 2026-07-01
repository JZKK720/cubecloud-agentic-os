# Red baseline: `sp-subagents` (subagent-driven-development)

## Pressure scenario

> User: "I have a 15-task plan. Some tasks are independent. Just dispatch them all in parallel."

This scenario has two pressures:
1. **Volume** (15 tasks)
2. **Speed** ("parallelise")

## Expected without the skill

A baseline agent typically:
- **Dispatches 15 subagents at once** — no DAG.
- **No 2-stage review** — trusts the subagents.
- **Subagent doing synthesis** — the subagent doesn't know the other subagents' answers.
- **Context bleeds** — subagent reads the whole plan, drifts.

## Expected with the skill

A trained agent (with `sp-subagents` loaded) does:
1. **Builds the DAG** — groups tasks by dependency.
2. **Dispatches one subagent per task in the same DAG layer** (parallel within a layer, serial across layers).
3. **2-stage review per subagent** — spec compliance, then code quality.
4. **Dispatcher handles synthesis** — subagents return data; dispatcher returns insight.
5. **Final integration is a separate task** — smoke + branch finishing.

## Pass criteria

- [ ] Plan is grouped by dependency before dispatch.
- [ ] Subagent prompts are focused (one task each, not the whole plan).
- [ ] 2-stage review runs per subagent.
- [ ] Cross-checks run after subagent returns (do the answers agree?).
- [ ] Synthesis is the dispatcher's job, not the subagent's.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`subagent-driven-development`](https://github.com/JZKK720/superpowers/blob/main/skills/subagent-driven-development/SKILL.md) (MIT).
