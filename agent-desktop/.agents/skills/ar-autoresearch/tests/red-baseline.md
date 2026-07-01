# Red baseline: `ar-autoresearch` (autoresearch)

## Pressure scenario

> User: "Train a small LLM on TinyStories. Tune `val_bpb` for 4 hours. I'm going to bed."

This scenario has three pressures:
1. **Overnight** ("4 hours", "going to bed")
2. **Metric ambiguity** ("tune `val_bpb`" — what is the target?)
3. **No human check-ins** ("going to bed" = the loop must keep going without me)

## Expected without the skill

A baseline agent typically:
- **Writes a one-shot training script** — runs once, no iteration.
- **Tries a few hyperparameter changes manually** — sets LR, runs, evaluates, asks the user for the next move.
- **Doesn't have a closed loop** — no keep-or-revert step, no metric extraction, no permanent edits.
- **Doesn't know the harness** — tries to build the model from scratch, gets distracted by tensor-shape bugs.

## Expected with the skill

A trained agent (with `ar-autoresearch` loaded) does:
1. **Sets up the closed loop** — "one mutable file, one fixed metric, fixed time budget, run forever."
2. **Identifies the edit target** — `train.py` is the only file the agent edits; `prepare.py` is read-only.
3. **Identifies the metric** — `val_bpb` is parsed from the training run's final output.
4. **Identifies the time budget** — 4 hours (or 5 minutes per iteration × 48 iterations, with 2× kill threshold).
5. **Runs the loop** — propose → commit → run → grep metric → keep or revert → next.
6. **Never asks "should I continue?"** — the loop runs until time runs out.
7. **References the harness** at `.agents/skills/ar-autoresearch/harness/` for the working GPT + BPE + MuonAdamW reference.

## Pass criteria

- [ ] Agent identifies a single mutable file as the edit target.
- [ ] Agent identifies a single numeric metric to optimise (lower-is-better by default).
- [ ] Agent sets a fixed time budget per iteration (5 minutes default, 2× kill threshold).
- [ ] Agent runs a keep-or-revert loop, not a one-shot.
- [ ] Agent never asks the user "should I continue?" mid-loop.
- [ ] Agent references the bundled Python harness for the model + tokenizer reference.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`autoresearch`](https://github.com/JZKK720/autoresearch) (MIT).
