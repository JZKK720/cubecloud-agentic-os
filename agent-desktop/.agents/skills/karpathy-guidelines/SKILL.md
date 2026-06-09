---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes  -  think before coding, simplicity first, surgical changes, goal-driven execution. Use when writing, reviewing, or refactoring code in Agent Desktop work.
source: community
metadata:
  source_repo: multica-ai/andrej-karpathy-skills
  upstream_skill: karpathy-guidelines
  upstream_url: https://github.com/JZKK720/andrej-karpathy-skills
  license: MIT
  tags: [coding-rules, simplicity, verification, minimal-diff, surgical-edits]
  related_skills: [electron-pro, typescript-expert, design-taste-frontend]
---

# Karpathy Guidelines for Agent Desktop

This skill adapts the upstream Karpathy guidelines for agent-desktop / Agent
Desktop work. The four core principles are kept verbatim from upstream so the
agent's reasoning matches what the user's globally-installed Claude Code / Copilot
agent uses; the **Repo-Specific Guidance** and **Validation Order** sections
below are the cubecloud-desktop-specific additions.

> **Tradeoff:** These guidelines bias toward caution over speed. For trivial
> tasks (typo fixes, obvious one-liners), use judgment  -  not every change needs
> the full rigor.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- Identify the owning file, symbol, or control path before editing.
- State your assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them  -  don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: *"Would a senior engineer say this is overcomplicated?"* If yes,
simplify.

In Agent Desktop terms, this means reusing existing hooks, helpers, preload
bridges, and CSS patterns before creating new abstractions.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it  -  don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform imperative tasks into verifiable goals:
- "Add validation" â†?"Write tests for invalid inputs, then make them pass"
- "Fix the bug" â†?"Write a test that reproduces it, then make it pass"
- "Refactor X" â†?"Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] â†?verify: [check]
2. [Step] â†?verify: [check]
3. [Step] â†?verify: [check]
```

Strong success criteria let the agent loop independently. Weak criteria
("make it work") require constant clarification.

---

## Repo-Specific Guidance

- Keep Electron security boundaries intact. Renderer code should not gain
  direct Node access.
- Treat preload typings and IPC contracts as part of the same change when
  you modify desktop capabilities.
- Keep onboarding copy truthful to what Hermes or the backend can really do.
- Prefer targeted typechecks, focused tests, or local screen-level
  validation over broad rebuilds.
- When the change introduces a new IPC method, add a `HermesAPI` interface
  entry to `src/preload/index.d.ts` in the same patch  -  both the renderer
  and the preload binding must be updated together.

## Validation Order

1. Behavior-scoped test for the touched feature when available.
2. Narrow typecheck or lint for the changed slice:
   `tsc --noEmit -p tsconfig.web.json` for renderer work,
   `tsc --noEmit -p tsconfig.node.json --composite false` for main work.
3. Broader repo validation only if the change touches shared contracts or
   build config.

## How to Know It's Working

These guidelines are working if you see:
- Fewer unnecessary changes in diffs  -  only requested changes appear.
- Fewer rewrites due to overcomplication  -  code is simple the first time.
- Clarifying questions come before implementation, not after mistakes.
- Clean, minimal PRs  -  no drive-by refactoring or "improvements."

## Red Flags

- Inventing backend support that does not exist.
- Broad UI rewrites when only one branch is failing.
- Copying reference-product claims that are false in this app.
- Adding abstractions before proving repeated need.

## Pairing

- Use `design-taste-frontend` when the task changes the renderer UI.
- Use `electron-pro` for desktop shell, IPC, packaging, or OS integration work.
- Use `typescript-expert` for typing, compiler, or config-heavy changes.
