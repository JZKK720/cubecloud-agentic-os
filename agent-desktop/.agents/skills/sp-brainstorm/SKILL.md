---
name: sp-brainstorm
description: Use when starting any creative work — creating features, building components, adding functionality, modifying behaviour, or designing a system. Activates before any implementation, including TDD. Socratic design refinement: asks questions one at a time, then presents a design in 200–300-word sections for validation.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: brainstorming
  version: "1.0.0"
---

# Brainstorming (Socratic Design)

Before any creative work — feature, component, behaviour change — refine the rough idea through Socratic dialogue. Don't jump to code.

## Trigger phrases (auto-activate)

- "I want to build X"
- "Add a feature that does Y"
- "Design a system for Z"
- "Let's add support for W"
- Any time a feature / component / behaviour is being created or modified

## The flow

```
User describes rough idea
  ↓
Socratic questions (one at a time)
  ↓
Validate the problem (not the solution)
  ↓
Explore 2–3 alternatives
  ↓
Present design in 200–300-word sections
  ↓
User validates each section
  ↓
Write design doc to docs/plans/YYYY-MM-DD-<topic>-design.md
  ↓
Hand off to cubecloud-plan
```

## Socratic questions (use these as a starting set)

1. **What's the user-facing outcome?** (Not "what does the code do".)
2. **Who is the user, and how many of them are there?**
3. **What is the smallest version that ships value?**
4. **What is the cost of doing nothing?**
5. **What is the cost of doing it wrong?**
6. **What is the asymmetric upside?**
7. **What is the metric that proves it worked?**
8. **What would make you kill this in 6 months?**

Ask *one* at a time. Wait for the answer. Then ask the next. Don't dump all 8 on the user.

## Anti-patterns

- **Premature solution** — "we should use a queue" before "what problem are we solving?"
- **Dumping questions** — ask one at a time, wait for the answer.
- **Skipping validation** — present a 2,000-word design; the user reads the first 100 words and approves.
- **Jumping to code** — if `cubecloud-brainstorm` is active, you are *not yet* allowed to write code. Wait for design approval, then `cubecloud-plan`, then `cubecloud-tdd`.
- **Cargo-culting design** — every problem is not a microservices system. The smallest version is usually a single function.

## Section presentation

When you have enough to start the design, present it in **200–300-word sections**, one at a time. Each section ends with a validation prompt:

> "Does this match your intent? Anything missing or wrong before I move to the next section?"

Sections to cover (in this order):

1. **Outcome** — one sentence, user-facing.
2. **User** — who, how many, how often.
3. **Smallest version** — the MVP, 25% of the proposed scope.
4. **Cost of nothing** — the cost of not doing it.
5. **Cost of wrong** — what "wrong" looks like, exit ramp.
6. **Upside** — the asymmetric win.
7. **Metric** — the number, threshold, date.
8. **Kill signal** — the line that triggers shutdown.

## When the user wants to skip brainstorming

Sometimes the user knows what they want and doesn't want to be asked. In that case:

- **Confirm**: "This looks like a creative change. Confirm you want to skip the brainstorm?"
- **If yes**: write a one-paragraph design anyway, get a one-line approval, then proceed.
- **If no**: run the Socratic flow.

The cost of a 5-minute brainstorm is always less than the cost of building the wrong thing.

## Hand-off

When the design is approved:

1. Write the design to `docs/plans/YYYY-MM-DD-<topic>-design.md`.
2. Announce: "Design approved. Invoking `cubecloud-plan` next."
3. The `cubecloud-plan` skill takes over (writing-plans).

## Source / license

Adapted from [JZKK720/superpowers · brainstorming](https://github.com/JZKK720/superpowers/blob/main/skills/brainstorming/SKILL.md), MIT.
