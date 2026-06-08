---
name: gstack-investigate
description: Use when the user reports a vague issue, a recurring symptom, a mystery behaviour, or asks "why is this happening?" — a problem with incomplete information, not a known bug. Triggers: "why is this happening", "mystery behaviour", "investigate this", "something is off but I don't know what", "is it the IPC layer, the renderer, or the state store", "I've checked the obvious things".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# Investigate

A flow for situations where the problem is not well-defined. The user knows *something* is wrong but not what, where, or why. Use this when `po-diagnose` is the wrong shape — the diagnosis is still ahead of you.

## When to run

- The user reports a symptom, not a cause ("things are slow", "users are churning", "the deploy is flaky").
- The problem is recurring and the cause has evaded quick fixes.
- The data contradicts the obvious explanation.
- You're spending >30 minutes on "let me check one more thing" and not converging.

## The 6 phases

### 1. Define the symptom precisely

Before debugging, restate the problem in measurable terms. "Slow" → "P95 latency for /api/x is 4.2s, target is 800ms." "Users are churning" → "Day-7 retention dropped from 35% to 22% over the last 30 days."

A vague symptom is a problem. Sharpen it. If you can't measure it, you can't fix it.

### 2. Form 3 hypotheses, rank them

Before running any experiment, write down 3 candidate causes. Rank by:

- Prior probability (how often is this the cause in similar systems?)
- Cost to falsify (cheap to rule out?)
- Cost if true (how bad is the fix?)

The cheapest-to-falsify, highest-prior hypothesis goes first. If you can't write 3, you don't understand the problem well enough to fix it.

### 3. Design the experiment for #1

A good experiment has:

- **One variable changed.** Multi-variable experiments produce multi-variable failures.
- **A falsifiable prediction.** "If hypothesis #1 is true, then we should see X." State X.
- **A fast read.** Prefer an experiment with a <1 hour read time. Slow experiments let the problem drift.
- **A clean baseline.** What does "normal" look like? Have it before the experiment.

### 4. Run it, watch the prediction

The discipline is *not changing the experiment* when the result surprises you. Surprises are data. If the prediction is wrong, the hypothesis is wrong; that's progress.

Don't add a "but also try this" mid-experiment. Finish the planned run, log the result, then plan the next.

### 5. Update the ranking

Hypothesis #1 confirmed? Move to fix (using `po-diagnose`'s loop). Hypothesis #1 falsified? Promote #2, design a new experiment.

If all three hypotheses are falsified, you don't have a model of the problem yet. Go back to Phase 1 with a sharper definition of the symptom — the new data probably tells you the symptom description was wrong.

### 6. Document the investigation

Before you move to fix, write 3 lines:

- Symptom (measurable).
- Root cause (with the experiment that proved it).
- Why it wasn't obvious from the symptom alone.

The third line is the one that prevents the same investigation next time. It's often the most valuable output of the whole flow.

## Anti-patterns

- **Throwing tools at the problem** — adding more logging, more metrics, more retries without a hypothesis. You get noise, not signal.
- **Confirmation bias run** — designing experiments that *would* confirm the favourite hypothesis. The disconfirming experiment is the one you should run.
- **Tautological diagnosis** — "it's slow because the slow code path is being hit." That's not a diagnosis; that's a description. The diagnosis is *why* the slow path is being hit *now* when it wasn't last week.
- **Premature fix** — patching the symptom without understanding the cause. Patches that don't address root causes come back as different symptoms.

## Output format

```
SYMPTOM:        <measurable>
WINDOW:         <when it started, how often>
HYPOTHESES:     <ranked 1..3, with prior prob + cost to falsify>
EXPERIMENT N:   <design + prediction + result>
CONCLUSION:     <confirmed / falsified / inconclusive>
ROOT CAUSE:     <the actual cause, if found>
WHY-NOT-OBVIOUS:<the line that prevents re-investigation>
NEXT:           <fix via po-diagnose / continue investigation>
```

## Companion skills

- `po-diagnose` — once the root cause is known, switch to the diagnose loop for the actual fix.
- `gstack-qa` — after a fix lands, design a regression test that would have caught the original symptom.

## Source / license

Adapted from [JZKK720/gstack · investigate](https://github.com/JZKK720/gstack), MIT.
