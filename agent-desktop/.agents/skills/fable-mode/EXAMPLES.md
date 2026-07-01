# Fable Mode — Examples

## How to invoke it

In a Copilot / Claude Code / VS Code agent session, say any of:

- "Use fable mode and migrate this service to the new API, end to end."
- "Plan end to end: refactor the settings screen into a wizard."
- "Run this autonomously. Self-verify before declaring done."
- "Long horizon: build out the onboarding flow, persist progress in PROGRESS.md."

The harness will inject the Fable Mode contract into the system prompt for that turn and the rest of the session.

## What it looks like in practice

| User request | Fable Mode response shape |
|---|---|
| "Migrate the auth service" | Plan → execute the migration → verify with tests and a fresh-context review → deliver the diff and a rollback note. |
| "Refactor the settings screen" | Define acceptance criteria → make the changes → run the existing tests → report what changed and what was assumed. |
| "Write a PRD for the feature" | Capture intent → produce the full PRD in one pass → mark open decisions at the end. |
| "Debug this flaky test" | Reproduce → hypothesize → instrument → fix → add regression test → verify green. |

## PROGRESS.md template

When running in Fable Mode on a long task, create or update `PROGRESS.md` in the working directory:

```markdown
# PROGRESS — <task name>

## Objective
One-sentence outcome.

## Done criteria
- [ ] criterion 1
- [ ] criterion 2

## Completed
- [x] step 1 — evidence: <tool result / artifact>

## Open
- [ ] step 2 — blocker: <none or note>

## Decisions
- <assumption> (Rung 2/3)

## Lessons
- <confirmed approach>
```

## Safety guardrails

- Irreversible actions (delete, publish, spend, send external comms) stop for confirmation.
- End the turn on a question or a completed deliverable, never on a promise of future work.
- Run deterministic checks (tests, types, lint, build) before declaring done.
