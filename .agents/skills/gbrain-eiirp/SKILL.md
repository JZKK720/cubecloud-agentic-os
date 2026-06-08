---
name: gbrain-eiirp
description: Use when the agent wants to consolidate what was learned, decided, deferred, and what to skill-ify at the end of a long agentic task. Triggers: "wrap up", "summarise the session", "what did we do today", "end-of-task", "post-work", "structured retro", "I want to capture what we just did", "we're closing out the session".
license: MIT
metadata:
  author: Adapted from JZKK720/gbrain
  source: https://github.com/JZKK720/gbrain
  version: "1.0.0"
---

# EIIRP — End-of-task Introspective Insight & Retention Protocol

A 7-phase loop to run *immediately* at the end of a long agentic session. Goal: surface what was learned, capture what was decided, expose what was deferred, and convert repeating patterns into skills (or skill candidates).

The 7 phases are intentionally short. Most of them are questions, not actions.

## Phase 1 — Extract

What *concrete* things happened in this session? Not aspirations. List the actual artefacts:

- Files created, deleted, renamed.
- Decisions made (with the option that was rejected).
- Bugs fixed / introduced.
- User preferences observed ("user wants X, not Y").
- Skills that were *used* (reveals which skills earn their keep).

Output: a bullet list. Every bullet is a fact, not a story.

## Phase 2 — Index

For each item in Phase 1, tag it:

- `[K]` Knowledge — domain fact, doesn't change tomorrow.
- `[D]` Decision — committed choice.
- `[Q]` Question — open / unresolved.
- `[B]` Bug — known defect, unfixed.
- `[T]` Tooling — preference, command, env var.
- `[P]` Pattern — repeating approach, candidate for skillification.

## Phase 3 — Inventory

Group by tag. The K/D/P groups are the load-bearing ones:

- K — new knowledge → write to memory or to a project doc.
- D — committed decisions → update the project's decision log / ADR.
- P — patterns → run the `gbrain-skillify` 11-axis gate on each. Most will fail the gate. That's fine. The ones that pass become skill candidates.

## Phase 4 — Reorganise

If the session's work fragmented across multiple files / dirs, surface a `did-it-end-up-clean` check:

- Are the new files in the right place, or did the agent dump them in the project root?
- Are there orphan files left from earlier failed attempts?
- Is the diff focused, or does it touch unrelated code?

If anything is dirty, fix it now. The session boundary is the cheapest cleanup moment.

## Phase 5 — Pause

This is the *anti-burnout* phase. After a long session, the agent tends to either over-deliver (one more thing!) or under-deliver (call it done, move on). The right move is:

- Stop.
- Verify the user-asked-for thing works.
- Run the test suite.
- Confirm the next handoff point (PR, commit, deploy, run).
- THEN suggest closing the session.

Don't do drive-by extras. They create noise and break the "did I do what was asked?" check.

## Phase 6 — Persist

Write durable notes *now*, before the session context is lost:

- **User memory** — for preferences and patterns that survive across all projects.
- **Repo memory** — for codebase-specific facts.
- **Session memory** — for in-progress work that will resume.
- **Persistent memory** — for the third-party repos / tools / hacks the user adopted in this session.

If you don't persist it, the next session starts cold.

## Phase 7 — Project (optional)

If the user said "wrap up the project", produce a one-page project retro:

- **What we set out to do** — 1 sentence.
- **What we actually did** — bullets, not narrative.
- **What changed about the plan** — and why.
- **What's still open** — the deferred items.
- **What I'd do differently next time** — be honest. This is the line that prevents the same mistake in the next project.

## Output formats

Phase 1–4 → a single-screen markdown summary.
Phase 5 → a `done / not-done` sign-off.
Phase 6 → the actual writes to memory files.
Phase 7 → the project retro doc.

## When NOT to run EIIRP

- The session was < 10 minutes and trivial.
- The user explicitly says "just keep going, no wrap-up."
- The work is exploratory and not yet committed (premature retros create churn).

## Source / license

Adapted from [JZKK720/gbrain · eiirp](https://github.com/JZKK720/gbrain), MIT.
