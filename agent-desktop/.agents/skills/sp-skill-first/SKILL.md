---
name: sp-skill-first
description: Use when starting any conversation or before any response — establishes that the agent must check for relevant skills before answering, asking clarifying questions, or taking action. Replaces ad-hoc reasoning with skill-first reasoning.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: using-superpowers
  version: "1.0.0"
---

# Skill-First (the bootstrap)

Before any response — including clarifying questions — check for relevant skills. Even a 1% chance a skill applies means you must invoke it to check. This is not negotiable.

## The rule

1. Receive the user message.
2. Ask: "Could any installed skill apply to this?"
3. If yes (or maybe), invoke the skill via the agent runtime's `Skill` tool.
4. Announce briefly: "Using [skill] to [purpose]."
5. If the skill has a checklist, create a TodoWrite (or equivalent) item per checklist entry.
6. Follow the skill exactly.
7. Respond (with or without the skill's guidance).

## What counts as "applying"

- The user message contains a trigger phrase from any skill's `description` field.
- The user's intent maps to a skill's purpose (debugging, planning, TDD, design review, etc.).
- The user is about to enter a state (plan mode, design mode, debug mode) where a skill is the standard.

## Red flags (these thoughts mean STOP)

| Thought | Reality |
|---|---|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |

## Skill priority

When multiple skills apply, **process skills come before implementation skills**. The agent invokes them in this order:

1. **Process skills** (brainstorming, debugging, planning) — establish the *how*.
2. **Domain skills** (CodeGraph, CodeReview, Memory) — apply the *what*.
3. **Implementation skills** (TDD, file-edit, terminal) — execute the *how*.

"Build X" triggers `cubecloud-brainstorm` first, then `cubecloud-plan`, then `cubecloud-tdd`, then the implementation skills. Not the other way around.

## Cubecloud skill ecosystem (the 17 hidden flavors + 5 user-visible)

- **Hidden (auto-injected)**: `cubecloud-skill-first` (this skill), `cubecloud-tone`, `cubecloud-economist`, `cubecloud-licensor`, `cubecloud-tdd`, `cubecloud-debug`, `cubecloud-verify`, `cubecloud-brainstorm`, `cubecloud-plan`, `cubecloud-execute`, `cubecloud-subagents`, `cubecloud-parallel`, `cubecloud-request-review`, `cubecloud-receive-review`, `cubecloud-worktree`, `cubecloud-finish-branch`, `cubecloud-write-skill`.
- **User-visible (in the Skills screen)**: `electron-best-practices`, `karpathy-guidelines`, `design-taste-frontend`, `typescript-expert`, `ui-ux-pro-max`, `electron-pro`, `cubecloud-persona`, `cubecloud-onboarding`, `cubegraph-code-intel`.
- **Developer-time (in `.agents/skills/`, mirrored to `~/.agents/skills/`)**: the 20 V2.6 skills — `ar-autoresearch`, `karpathy-guidelines`, 7× `po-*`, 3× `ecc-*`, 2× `gbrain-*`, 6× `gstack-*`.

## Subagent note

If you were dispatched as a subagent to execute a specific task, skip this skill. The dispatcher already invoked it for you.

## Source / license

Adapted from [JZKK720/superpowers · using-superpowers](https://github.com/JZKK720/superpowers/blob/main/skills/using-superpowers/SKILL.md), MIT.
