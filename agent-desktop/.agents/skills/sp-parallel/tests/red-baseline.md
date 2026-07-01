# Red baseline: `sp-parallel` (dispatching-parallel-agents)

## Pressure scenario

> User: "Research these 5 third-party repos and tell me if any conflict with our existing skills."

This scenario has one pressure:
1. **Volume** (5 independent questions)

## Expected without the skill

A baseline agent typically:
- **Answers one-by-one** in chat — slow.
- **Dispatches 5 subagents, each with the full question** — no decomposition.
- **No aggregation step** — leaves the user to combine.

## Expected with the skill

A trained agent (with `sp-parallel` loaded) does:
1. **Decomposes** — "For each of the 5 repos, answer 5 sub-questions: purpose, license, top 3 skills, naming conflicts, install story."
2. **Dispatches 5 subagents in parallel** (25 total if all are independent — but more likely 5 subagents with 5 sub-questions each, or 5 with the full question, depending on whether the sub-questions are independent).
3. **Cross-checks** — do the answers agree? Where do they disagree?
4. **Synthesises** — one paragraph per question, then a one-paragraph overall summary.

## Pass criteria

- [ ] Decomposition is per-subagent focused (not "research the whole topic" in one subagent).
- [ ] Subagent prompts include the exact question and the sources to consult.
- [ ] Cross-check runs after subagent returns.
- [ ] Synthesis is the dispatcher's job.
- [ ] Output is a single coherent answer, not 5 raw blobs.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`dispatching-parallel-agents`](https://github.com/JZKK720/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md) (MIT).
