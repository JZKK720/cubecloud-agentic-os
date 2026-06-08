---
name: gstack-retro
description: Use when the team needs to align on what worked, or when the user says "retro", "what did we learn", "post-mortem" — at the end of a project, sprint, or feature, before the next kickoff. Triggers: "retro", "post-mortem", "what did we learn", "what would we do differently", "what's still open", "the project is done — what stuck", "what's the 3-line takeaway".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# Retro — Project Retrospective

A retro is not a status meeting. A retro is a *learning* meeting. The output is "what should we do differently next time," not "what did we do."

## When to run

- At the end of a project / sprint / feature.
- After a launch.
- After a near-miss, an incident, or a major rework.
- When the team is about to start something similar and should learn from the last one.

## The 6 sections

### 1. What we set out to do

One paragraph. The original goal as understood at kickoff. Quote the kickoff doc / commitment if you have one — the drift between "what we said" and "what we did" is itself a finding.

### 2. What we actually did

Bullet list, not narrative. The artefacts: features shipped, files changed, integrations cut, scope dropped. The *deltas from the plan* are the data, not the work itself.

### 3. What changed about the plan

Bullet list. For each change: what was changed, when, and why. Then the harder question: **was the change forced by reality (good) or forced by drift (bad)?**

### 4. What we got right

Don't skip this. Every retro that only lists failures produces team demoralisation and false humility. List the things that *worked* — the design choice, the early decision, the test, the conversation that unblocked something. Name them so they can be repeated.

### 5. What we'd do differently

The most important section. Be specific:

- "Next time, write the smoke test before the integration code."
- "Next time, push back on the requirement to support X on day one."
- "Next time, name the kill signal in the kickoff doc."

Not: "We should communicate better." That's a wish, not a finding.

### 6. What's still open

The deferred items. The things we *know* aren't done. For each: the consequence of not doing it, the cost of doing it later, and the trigger that should re-open the conversation.

## Output format

```
RETRO: <project name>
DATES:        <start → end>
OUTCOME:      <shipped / cut / re-scoped / failed>
PLAN VS REAL: <1 paragraph>
DELTAS:       <bulleted, with forced-by-reality / forced-by-drift tag>
KEPT:         <what we got right>
CHANGES:      <what we'd do differently — 3-5 specific actions>
OPEN:         <deferred items + consequence + trigger>
```

The *kept* and *changes* sections together are the *learning*. Everything else is context.

## Hard rules

- **Blameless.** Bad retros blame people. Good retros blame the *decision* (which is recoverable), the *missing information* (which is fixable), or the *environment* (which is changeable).
- **Concrete.** "We should test more" is not an action. "Add the smoke test to CI on day 2 of next project" is.
- **Capped.** A retro that runs 2 hours is a status meeting. A retro that runs 30 minutes is a retro. Time-box ruthlessly.
- **Owned.** Every "change" gets an owner. If no one owns it, it's a wish.

## Companion skills

- `gbrain-eiirp` — the post-work organiser. Run *before* the retro; the retro consumes its output.
- `gstack-plan-ceo-review` — measure the project outcome against the original CEO scorecard.

## Source / license

Adapted from [JZKK720/gstack · retro](https://github.com/JZKK720/gstack), MIT.
