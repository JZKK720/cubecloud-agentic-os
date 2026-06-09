---
name: autonomous-agent-harness
description: Guardrails for long-running autonomous agent loops. Where to checkpoint state, when to ask the user, and how to fail loudly instead of looping.
source: ecc
metadata:
  source_repo: ECC autonomous-agent-harness
  tags: [autonomy, checkpointing, rate-limit, bail-out]
  related_skills: [agentic-engineering, eval-harness, karpathy-guidelines]
---

# Autonomous Agent Harness

When the agent is given a long-running task ("refactor the wiki", "audit every converter"), it tends to either burn the whole context on a single mistake, or quietly loop forever. This skill encodes the guardrails that keep the loop safe.

## When to use

Use this skill when:

- The user has asked for a multi-step task with no per-step confirmation.
- The agent is about to make more than ~5 file edits in a single turn.
- The agent is tempted to use a `while (true) { ... }` style loop.

## The three guardrails

### 1. Checkpoint state, not chat

The agent has persistent state — the wiki, the memory file, the user profile. Use it.

- **Before a destructive edit**, write a one-line note to `<profile>/wiki/log.md` (kind=`edit`, title=`pre-step`).
- **After a successful step**, append a `kind=synthesis` entry summarising what changed.
- **On a hard failure**, append a `kind=lint` entry with the error so the next run can read it.

These entries are greppable (`grep "^## \[" log.md | tail -20`), so the agent never has to remember the past conversation.

### 2. Ask the user only at product decisions

The agent has a **human-in-the-loop budget**. Each turn that asks the user costs the user time, so spend it on:

- **Product decisions**: which model to use, which profile to scope a feature to, what name to use.
- **Irreversible actions**: deleting a profile, removing a skill, signing a binary.

**Never** ask about:

- Implementation details you can verify (file paths, test names, IPC channel names).
- Aesthetically subjective choices ("which icon?") — pick one, log it, and move on.
- Things the user has already answered in this conversation.

### 3. Fail loudly, fail once

A bad agent loop looks like:

```
edit → test fails → edit again → test still fails → edit again → ...
```

The right move after **two** failed attempts on the same step is to stop, observe, and surface the situation to the user. Use language like:

> I tried X and Y; both fail with `<error>`. The likely cause is `<hypothesis>`. Two paths forward:
> 1. `<safe rollback>` + `<alternative>`.
> 2. `<deeper investigation>` — I can do this but it'll take ~N more turns.
> Which?

That is the correct shape. Never silently roll back, never silently keep trying.

## Anti-patterns

- **"Almost there"** — saying the next iteration will fix it. It usually won't; the cause is deeper.
- **"Just one more file"** — every "just one more" is a fresh opportunity for a regression. Stop and run the typecheck + tests first.
- **"Ignore the test"** — a failing test is a signal. If a test is wrong, fix the test. If the SUT is wrong, fix the SUT. Never both, and never "skip for now".
- **"I can fix this in one more turn"** — if the budget was 5 turns and you're on turn 7, the user is already frustrated. Pivot to "here's where I am, here's the blocker" instead of "give me one more turn".

## Reference state for long tasks

For a task that touches >3 files:

- Write a **plan** to the wiki or to `<profile>/memory.md` first. This is durable across restarts.
- Break the plan into ~3-edit chunks. After each chunk, run typecheck + the relevant tests.
- If a chunk fails twice, revert it and surface to the user.

## When to ask vs when to act

| Situation | Action |
|-----------|--------|
| User said "fix the bug" with no spec | **Act**. Read the code, pick the smallest fix, run tests, declare done. |
| User said "add feature X" with no UI detail | **Act on the default**, log the choice, ask only if a label is wrong. |
| User said "should I use A or B?" | **Act** on A, but note the choice in the next status message. |
| User's request is impossible without a product decision | **Ask** with a concrete recommendation. |
| Tool repeatedly fails for unclear reasons | **Ask** with a concrete recommendation. |

The key word in that last column is "concrete". An open-ended "what do you think?" wastes a turn.
