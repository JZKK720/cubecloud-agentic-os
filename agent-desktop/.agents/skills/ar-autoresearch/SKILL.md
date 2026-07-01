---
name: ar-autoresearch
description: Use when the user wants to autonomously tune a numeric metric against a single editable file, with no human check-ins. Triggers: "autoresearch", "overnight tuning", "agent runs experiments", "improve val_* metric", "optimize loss", "benchmark my model", "long-running optimization loop".
license: MIT
metadata:
  author: Adapted from JZKK720/autoresearch (Karpathy) and JZKK720/poskills
  source: https://github.com/JZKK720/autoresearch
  version: "1.0.0"
---

# Autoresearch Loop

An autonomous research loop. One metric, one editable file, one experiment at a time. The agent runs forever until the user interrupts.

## When to use this skill

- A repo has a runnable experiment with a single numeric metric (lower=better by default; configurable).
- The user is willing to let the agent work unattended for hours.
- The user wants the agent to *try things*, *keep what works*, *discard what doesn't*, and *never ask whether to continue*.

If the user wants a single chat-driven analysis instead of a long-running loop, use `po-improve-codebase-architecture` or `po-diagnose` instead.

## The loop, in one breath

```
LOOP FOREVER:
  1. Look at the current state of the experiment
  2. Mutate the editable file with ONE experimental idea
  3. Commit the change (so it's reversible)
  4. Run the experiment with a fixed time budget; redirect all output
  5. Grep the metric out of the log
  6. If the metric improved: keep the commit. Otherwise: git reset.
  7. Append a row to results.tsv
  8. NEVER stop to ask the user. If you run out of ideas, read the file
     you just edited, read papers, combine previous near-misses, try
     something more radical.
```

## Setup phase (do this once, then start the loop)

Work with the user to:

1. **Agree on a run tag** — propose one based on today's date (e.g. `mar5`).
2. **Create a dedicated branch** — `git checkout -b autoresearch/<tag>` from current master. This branch must not already exist.
3. **Identify the editable file** — the *only* file the agent modifies. In the reference autoresearch this is `train.py`. In your project it might be `config.yaml`, `prompt.md`, `recipe.json`, or a single Python training script. The file must be:
   - The single point where the experimental surface lives.
   - Runnable independently (one command runs the experiment).
   - Bounded — small enough to read in one context window.
4. **Identify the fixed metric** — a single number the harness prints. Lower=better is the autoresearch convention, but you can flip this in step 5. Examples: `val_bpb`, `loss`, `latency_ms`, `cost_usd`, `error_rate`.
5. **Identify the time budget** — a wall-clock cap (default 5 minutes). Run that fails to complete within 2× the budget are treated as failures.
6. **Initialize the results log** — create a TSV with the header row. Use TSV (tabs), not CSV, because descriptions often contain commas. Columns: `commit<TAB>metric<TAB>memory_gb<TAB>status<TAB>description`.
7. **Confirm and go** — restate the setup to the user. Once they confirm, start the loop.

## The editable file — what the agent may and may not do

**May do, in the editable file only:**
- Change hyperparameters, optimizer, model architecture, batch size, data sampling, prompt template, anything inside the file.
- Delete code (a "simplification win" — removing complexity that hurts the metric is a legitimate result).
- Add new code, but weigh complexity cost against metric improvement (see the Simplicity Criterion below).

**May NOT do:**
- Modify files outside the editable surface. The metric harness is read-only.
- Install new dependencies. Use what's already in the project.
- Modify the evaluation harness, the data pipeline, or the metric extractor.
- Bypass the time budget by skipping the metric evaluation.

## The metric — extraction rules

The harness must print a summary block that contains the metric, like:

```
---
val_bpb:          0.997900
training_seconds: 300.1
total_seconds:    325.9
peak_vram_mb:     45060.2
mfu_percent:      39.80
```

Extract it with a single grep:

```bash
grep "^metric_name:" run.log
```

If the grep returns nothing, the run crashed. Read the stack trace, fix the bug if it's trivial (typo, missing import), discard if the idea itself was broken. Never silently retry a crashed run with the same code.

## Status values

| status    | meaning                                              |
| --------- | ---------------------------------------------------- |
| `keep`    | metric improved; commit is now the new baseline      |
| `discard` | metric equal or worse; `git reset` to the prior state |
| `crash`   | run did not complete; metric=0, memory=0              |

## Simplicity criterion

All else equal, simpler is better.

- A 0.001 improvement that adds 20 lines of hacky code? Probably not worth it.
- A 0.001 improvement from deleting code? Definitely keep.
- An improvement of ~0 but much simpler code? Keep — that is a real win.

When evaluating a change, weigh the complexity cost against the improvement magnitude. If the only justification for the change is "but the metric went down by 0.0001", revert it.

## Time budget enforcement

Each experiment should take ~5 minutes (configurable). If a run exceeds 2× the budget, kill it and treat it as a discard. Do not let a slow experiment starve the loop of throughput.

## Crashes

If a run crashes (OOM, exception, infra timeout), use judgement:

- **Trivial cause** (typo, missing import, wrong arg name): fix it, re-run. The fix does not become a new experiment.
- **Fundamental flaw** (the idea can't work): skip it. Log status=`crash`, do not commit, move to the next idea.

Do not spend more than a handful of attempts fixing a single idea. If you can't get it to work, the idea is bad; discard and try another.

## NEVRR STOP

Once the experiment loop has begun (after the initial setup), do **not** pause to ask the human if you should continue. Do not ask "should I keep going?" or "is this a good stopping point?" The human might be asleep, gone from the computer, or expects you to keep working *indefinitely* until manually stopped. You are autonomous.

If you run out of ideas:

- Re-read the editable file with fresh eyes.
- Read papers, READMEs, or comments inside the file that hint at unexplored directions.
- Combine previous near-misses — two ideas that each lost 0.005 alone might lose 0.02 together.
- Try more radical changes — entire optimizer swap, switching attention pattern, removing a layer, replacing a heuristic with a learned one.
- Try the *opposite* of what just failed. If increasing LR hurt, try decreasing it twice as much.

The loop runs until the human interrupts, period.

## What goes in the results.tsv description

The 5th column is a *short* description (one line, <80 chars) of what this experiment tried. This is the human's primary way to skim what happened overnight. Examples:

- `baseline`
- `increase LR to 0.04`
- `switch to GeLU activation`
- `remove value embeddings`
- `add RoPE base 100000`

A good description is *naming the change*, not the result. "got worse" is a bad description. "double embed dim" is a good one.

## Reference Python harness (optional)

The original Karpathy autoresearch ships a small PyTorch training loop (`prepare.py` + `train.py`) plus a Jupyter analysis notebook. They are bundled in this skill's `harness/` directory as a working reference. They are **not required** — your project might use a different language, a different framework, or even a non-ML optimization surface. The skill above applies unchanged.

The Python harness is provided so that:

- New users can run a real autoresearch loop end-to-end in <15 minutes (single-GPU, ~5-minute runs).
- The skill's "this is what a complete setup looks like" reference is concrete, not abstract.
- Teams that want to set up autoresearch for their own project have a starting point to copy and adapt.

To use the reference harness:

```bash
uv sync                      # one-time
uv run prepare.py            # one-time, ~2 min: download data + train tokenizer
uv run train.py              # baseline run, ~5 min
```

Then start the loop. The agent's edit target is `train.py`. The agent must not modify `prepare.py`.

## Anti-patterns to avoid

| Anti-pattern                                    | Why it's bad                                              |
| ----------------------------------------------- | --------------------------------------------------------- |
| Modifying the metric extractor                   | You can game the loop by lowering the metric artificially |
| Skipping the commit step                         | Loses the ability to revert; loop becomes irreversible    |
| Letting a slow run starve the loop               | Throughput matters; a 30-min run is worse than no run     |
| Asking the user mid-loop                         | Breaks the autonomous contract                            |
| Tracking more than one metric                    | Pick one; multiple metrics make "improve" undefined       |
| Editing multiple files per experiment            | You can't attribute the result to a specific change       |
| Re-running a crash with the same code hoping it works | If it crashed, the code is wrong. Diagnose or discard. |

## Quick start

```
User: "I want to set up an autoresearch loop on my fine-tuning config."

Agent:
  1. Reads this skill.
  2. Asks: editable file? metric name? time budget? run tag?
  3. Once confirmed, runs the baseline, records it in results.tsv.
  4. Starts the loop. Proposes ONE experimental idea per iteration.
  5. Runs forever. Reports back when the user returns.
```
