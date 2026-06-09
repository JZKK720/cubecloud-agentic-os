---
name: agentic-engineering
description: Core loop for an agent (observe → think → act → reflect) and the failure modes that come from skipping any stage.
source: ecc
metadata:
  source_repo: ECC agentic-engineering
  tags: [agent-loop, planning, reflection, minimal-diff]
  related_skills: [karpathy-guidelines, eval-harness, agent-harness-construction]
---

# Agentic Engineering

This skill encodes the core engineering loop for an agent: **observe → think → act → reflect**. It is intentionally compact — the goal is to keep the loop short enough that the agent never drifts into "do everything" mode.

## When to use

Use this skill when:

- A task is non-trivial and the agent is tempted to "just write code".
- Multiple subsystems are involved (UI, IPC, persistence, runtime) and the agent could easily over-edit.
- The agent has just made a change and is about to declare it done without re-reading its own diff.

## The four-stage loop

### 1. Observe

- Identify the **owning file, symbol, or control path** before editing.
- Read the surrounding 30 lines, not just the line you want to change.
- If a test exists, read the test before reading the implementation. The test is the contract.
- If a logger/UI/CLI output already exists, use it instead of inventing a new diagnostic.

### 2. Think

- State **one local hypothesis** about how the behavior should work, or why it's broken.
- Pick **one cheap check** that could falsify the hypothesis. Run the check before editing.
- Ask the user only when a **product decision** blocks a safe change. Never ask about implementation details you can verify.

### 3. Act

- Make the **smallest change that solves the request**. Do not refactor adjacent code.
- Match the existing style. Read two neighbours first.
- Never silently change the public surface. New IPC channels, new preload methods, new i18n keys — all three, in that order.
- Wire a test for the behaviour you just added. The test is the proof the change works.

### 4. Reflect

- Re-read your own diff. Ask: "what did I miss?"
- Run the typecheck (`tsconfig.node.json` and `tsconfig.web.json`).
- Run the test suite for the surface you touched.
- If something failed, **stop and observe** — do not paper over with a fix-the-symptom edit.

## Failure modes to avoid

- **"Just write code"** — skipping Observe because the task feels simple. Most regressions come from this.
- **"Refactor while you're there"** — turning a one-line fix into a 200-line diff.
- **"Trust the test"** — running a single happy-path test and declaring victory. Run the suite, not one test.
- **"Paper over"** — wrapping a crash in a try/catch instead of fixing the bug.
- **"Premature optimization"** — adding a cache / a worker / a queue before the slow path is observed.

## Related skills

- `karpathy-guidelines` — repo-local coding rules (verify, minimal-diff).
- `eval-harness` — fast deterministic unit tests for agent code paths.
- `agent-harness-construction` — wiring a new IPC + preload + i18n + test cycle.
