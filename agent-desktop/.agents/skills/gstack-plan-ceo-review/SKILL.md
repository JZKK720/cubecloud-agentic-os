---
name: gstack-plan-ceo-review
description: Use when the user wants a plan stress-tested from a CEO/operator lens — strategy, scope, ROI, risk, and "is this the right thing to build?". Triggers: "review like a CEO", "pressure-test the plan", "is this worth doing", "what's the user-facing outcome", "what's the kill signal", "what's the metric that proves it worked", "is this the right thing to build at all".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# Plan — CEO Review

Stress-test a plan the way a CEO/operator would. This is *not* a code review, *not* a design review, *not* an engineering review. It's the "should we even be doing this?" lens.

## When to run

- Before kicking off a non-trivial project.
- When the user has a plan and is second-guessing the strategy.
- When a pitch / proposal / roadmap needs to survive executive review.
- When you (the agent) are about to spend hours and want a sanity check first.

## The 8 questions

Answer each. The output is the *answers*, not a yes/no.

### 1. What is the user-facing outcome?

Not "what does the code do." What does the user *do* that they couldn't do before, and what's the smallest expression of that?

If the answer is vague ("improve the experience"), push back. "User can paste a URL and get a sharable artifact in 5 seconds" is sharp; "better UX" is not.

### 2. Who is the user, and how many of them are there?

Pick one. If you pick two, you've picked zero — the plan will try to please both and fail both.

State the *count*. "Anyone" is a refusal to commit. "1,000 power users in the first 6 months" is a number you can argue with.

### 3. What is the smallest version that ships value?

Cut the plan in half. Then cut it in half again. The MVP that ships value is usually 25% of the proposed scope.

What would you *cut* from the plan today if forced? The cut list is more honest than the kept list.

### 4. What is the cost of doing nothing?

If the answer is "nothing" or "a small annoyance," the plan is probably not worth doing. CEOs prioritise what *hurts if you don't do it*.

State the cost in dollars, hours, or risk — not vibes.

### 5. What is the cost of doing it wrong?

"Wrong" can mean: wrong scope, wrong audience, wrong time, wrong tech. For each, what does it look like, and is it recoverable?

If "wrong" means a year of wasted engineering, the plan needs an exit ramp. Build the exit ramp into the plan from day one.

### 6. What is the asymmetric upside?

If this works, what changes? A 10x improvement on something the user does 5x a day is bigger than a 2x improvement on something they do once a month.

State the *delta*, not the *absolute*. "Saves 30 minutes per session, used 4x a week by 1,000 users" beats "fast."

### 7. What is the metric that proves it worked?

If you can't name a metric, you can't tell if it worked. If you can name a metric but not a *threshold*, you can't tell if it worked *enough*.

Pick one. "7-day retention at 30% by month 3" is a number a CEO will hold you to. "Users will like it more" is not.

### 8. What would make you kill this in 6 months?

Every project has a kill signal. If you can't name one, the project will live forever in 80% done.

State: "If by [date] we don't see [metric threshold], we shut it down." That's the line that protects the rest of the roadmap.

## Output format

```
PLAN: <name>
OUTCOME:    <1 sentence, user-facing>
USER:       <who, how many, how often>
MVP:        <smallest valuable version>
COST OF 0:  <what happens if we don't>
COST OF WRONG: <what "wrong" looks like + how to exit>
UPSIDE:     <the asymmetric win>
METRIC:     <number, threshold, date>
KILL:       <the line that triggers shutdown>
VERDICT:    <ship / cut / re-scope / kill>
```

The verdict is one of those four. No "ship with caveats."

## Source / license

Adapted from [JZKK720/gstack · plan-ceo-review](https://github.com/JZKK720/gstack), MIT.
