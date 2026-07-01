# Red baseline: `gstack-investigate` (gstack investigate)

## Pressure scenario

> User: "Things are slow. I don't know why. The dashboard shows P95 at 4 seconds. Help."

This scenario has three pressures:
1. **Vague symptom** ("things are slow")
2. **Multiple hypotheses** (network, CPU, GC, DB, IPC, runtime gateway, model server)
3. **Time pressure** (the user is watching the dashboard)

## Expected without the skill

A baseline agent typically:
- **Throws tools at the problem** — adds more logging, more metrics, more retries.
- **Jumps to a fix** — "probably the GC tuning, let me adjust it" (no hypothesis, no experiment).
- **Reverts the fix later** — when the next dashboard refresh shows the issue is in the IPC layer.
- **No root cause document** — the next person to investigate re-discovers.

## Expected with the skill

A trained agent (with `gstack-investigate` loaded) does:
1. **Sharpens the symptom** — "P95 latency for /api/x is 4.2s, target is 800ms" (measurable).
2. **Forms 3 hypotheses** — ranked by prior × cost-to-falsify × cost-if-true.
3. **Designs the experiment for #1** — one variable changed, a falsifiable prediction, a fast read, a clean baseline.
4. **Runs it** — does *not* change the experiment when surprised.
5. **Updates the ranking** — if #1 is falsified, promote #2.
6. **Documents the investigation** — symptom (measurable), root cause (with the experiment that proved it), why-it-wasn't-obvious (so the next person doesn't re-investigate).

## Pass criteria

- [ ] Symptom is restated in measurable terms (P95, error rate, RPS).
- [ ] 3 hypotheses are written *before* any experiment runs.
- [ ] Each experiment has one variable changed and a falsifiable prediction.
- [ ] The agent does *not* add more logging without a hypothesis.
- [ ] Final write-up names the root cause + the experiment that proved it.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
