---
name: gstack-plan-eng-review
description: Use when a plan needs technical stress-testing, when sequencing is unclear, when the user asks for a tech lead's view, or when dependencies may block the build. Triggers: "tech lead review", "is this buildable", "stress-test the architecture", "what's the load-bearing assumption", "is the sequencing right", "what's the rollback plan", "what's the smoke test", "is this an irreversible decision".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# Plan — Engineering Review

The counterpart to `gstack-plan-ceo-review`. CEO answers "should we build this?" — this answers "is the proposed order even possible, and what's the technical risk?"

## When to run

- After a CEO review, before kickoff.
- When the user is about to commit engineering time to a sequence and is unsure of the order.
- When dependencies between phases are unstated.
- When the plan has hand-wavy "and then we'll integrate" steps.

## The 10 questions

### 1. What is the *one* thing that has to be true for the rest to work?

Every non-trivial plan has a load-bearing assumption. Find it. If it's wrong, the rest collapses.

State it: "This plan assumes X. If X is false, the plan needs Y as a fallback."

### 2. What's the build order, and why is phase 1 first?

Force a sequence. Most plans are written in parallel ("we'll build A, B, and C") when only some of A is needed to start B.

State the *dependency graph* explicitly: "B requires A. C requires B. D requires nothing." If a phase has no upstream blocker, it can move earlier.

### 3. Where is the unrecoverable error path?

What, if done wrong, would force a complete rewrite? These are the decisions to make *slowly* and *first*. Everything else is fine to discover.

Examples: data model, auth boundary, deployment target, schema migration strategy.

### 4. Build vs buy vs adapt — for each major dependency?

For every external dependency (auth, payments, ML model, code analysis, search), state: build, buy, or adapt from an existing piece. Justify in one sentence.

Default answer: **adapt**. Most "build it" answers fail the time-to-value test.

### 5. What's the scale target for the first 1,000 users?

Plans that target "millions of users on day one" are usually plans that target zero users. Be concrete: requests/sec, storage GB, concurrent sessions, deployment region.

Numbers reveal where the actual risk is. "5 req/s" means database choice doesn't matter. "5,000 req/s" means it's the only thing that matters.

### 6. What is the rollback plan?

If phase 3 ships and breaks, can you roll back to phase 2? Is the data model additive-only? Are the migrations safe to undo?

Plans that can't roll back are plans that don't get to ship until they're perfect, which is never.

### 7. What's the test surface?

What's the smoke test that proves the plan works end-to-end? Not unit tests — the *one* test a non-engineer could run that proves the user-facing outcome.

If you can't name it, the plan doesn't have a definition of done.

### 8. What's the security boundary?

What does the user trust the system with? Where is that trust enforced? What's the worst-case if a boundary is breached?

For AI-agent systems, this is *the* question. State the boundary: which tool calls are user-approved, which are sandboxed, which are gated behind a human-in-the-loop.

### 9. What is the observability story?

When this is live and something goes wrong at 2am, what does the on-call see? Logs, metrics, traces, alerts. Be specific.

"No observability yet" is a fine answer *for phase 1*. It is not a fine answer for "go live."

### 10. What's the smallest end-to-end vertical slice?

The vertical slice that exercises *every* layer of the stack — UI → API → DB → external service — is the test of the plan's shape. If you can't build it in <2 weeks, the layer breakdown is wrong.

## Output format

```
PLAN: <name>
LOAD-BEARING:  <the assumption that, if false, breaks the plan>
SEQUENCE:      <ordered list of phases, with explicit dependencies>
IRREVERSIBLE:  <decisions to make first / slowly>
BUILD/BUY:     <one-liner per major dependency>
SCALE TARGET:  <req/s, storage, region, by when>
ROLLBACK:      <how to revert, what blocks it>
SMOKE TEST:    <the one test a non-engineer could run>
SECURITY:      <the trust boundary + what happens if breached>
OBSERVABILITY: <what the on-call sees at 2am>
SLICE:         <smallest end-to-end vertical slice + estimate>
VERDICT:       <ship / cut / re-scope / sequence-changes-needed>
```

## Source / license

Adapted from [JZKK720/gstack · plan-eng-review](https://github.com/JZKK720/gstack), MIT.
