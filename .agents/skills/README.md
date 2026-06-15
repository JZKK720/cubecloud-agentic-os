# Cubecloud Skills Index

This directory contains **35 first-class skills**, adapted from 8 third-party repos. Each skill is independent, self-contained, and follows the standard `SKILL.md` frontmatter contract. Skills can be loaded by any agent runtime that reads the `description` for auto-activation.

## Provenance & naming

| Prefix | Source repo | What it covers | License | # skills |
|---|---|---|---|---|
| `ar-` | [JZKK720/autoresearch](https://github.com/JZKK720/autoresearch) | Autonomous ML research loop + Python harness | MIT | 1 |
| `po-` | [JZKK720/poskills](https://github.com/JZKK720/poskills) | Engineering + productivity workflow skills | MIT | 7 |
| `karpathy-` | [JZKK720/andrej-karpathy-skills](https://github.com/JZKK720/andrej-karpathy-skills) | The 4 principles (Think / Simplify / Surgical / Goal) | MIT | 1 |
| `ecc-` | [JZKK720/ECC](https://github.com/JZKK720/ECC) | Skill-development reference + coding standards + scout | MIT | 3 |
| `gbrain-` | [JZKK720/gbrain](https://github.com/JZKK720/gbrain) | Meta-skill (skillify) + post-work organiser (eiirp) | MIT | 2 |
| `gstack-` | [JZKK720/gstack](https://github.com/JZKK720/gstack) | Plan / retro / investigate / QA workflows | MIT | 6 |
| `sp-` | [JZKK720/superpowers](https://github.com/JZKK720/superpowers) | Process methodology: skill-first, TDD, debug, brainstorm, plan, execute, subagents, parallel, request/receive review, worktree, finish-branch, write-skill, verify | MIT | 14 |
| `fable-mode` | [PH5h5W6d2L/fable-mode](https://github.com/PH5h5W6d2L/fable-mode) | Autonomous high-reasoning operating mode (PEV loop, autonomy ladder, self-verification, delegation, intent capture, effort calibration, memory) | MIT | 1 |

## The 34 skills

### 1. Autoresearch (1 skill)

| Skill | Purpose | When to load |
|---|---|---|
| `ar-autoresearch` | Autonomous ML/research loop: mutate one file, run for a fixed time budget, parse a metric, keep or revert. Ships a functioning Python harness (Karpathy's nanochat-derived GPT + Muon+AdamW + BPE + best-fit packing). | "autoresearch", "overnight tuning", "agent runs experiments", "improve val_* metric" |

### 2. Poskills —Engineering workflow (7 skills)

| Skill | Purpose | When to load |
|---|---|---|
| `po-caveman` | Ultra-compressed communication mode. Drop articles, filler, hedging. Keep technical accuracy. | "caveman", "talk like caveman", "less tokens", "be terse", "drop the filler" |
| `po-diagnose` | Disciplined diagnosis loop: build feedback loop →reproduce →hypothesise →instrument →fix →regression test. | "diagnose this", "debug this", "something is broken", performance regression |
| `po-tdd` | Test-driven development with red-green-refactor. Tests verify behaviour through public interfaces, not implementation. | "TDD this", "red-green-refactor", "test-first", "vertical slice" |
| `po-write-a-skill` | The meta-skill. Process for writing effective skills, including frontmatter contract, description contract, length budgets, naming convention. | "write a skill", "create a skill", "SKILL.md template" |
| `po-grill-with-docs` | Stress-test a plan against the project's existing domain model; sharpen fuzzy language; inline-update CONTEXT.md / ADRs. | "grill this plan", "stress-test the design", "update the ADR" |
| `po-improve-codebase-architecture` | Find deepening opportunities —refactors that turn shallow modules into deep ones. HTML report + Mermaid diagrams + deletion test. | "improve architecture", "find refactor opportunities", "deepen the modules" |
| `po-to-prd` | Turn current conversation context into a PRD; publish to the project issue tracker. | "create a PRD", "write a spec", "capture as a structured doc" |

### 3. Karpathy —The 4 principles (1 skill)

| Skill | Purpose | When to load |
|---|---|---|
| `karpathy-guidelines` | Think Before Coding. Simplicity First. Surgical Changes. Goal-Driven Execution. | "follow the four principles", "be surgical", "simplify first", "stop assuming" |

### 4. ECC —Everything Claude Code (3 skills)

| Skill | Purpose | When to load |
|---|---|---|
| `ecc-skill-development-guide` | The canonical, opinionated guide to writing skills —categories, frontmatter, content patterns, length budgets, anti-patterns, review checklist. | "how do I write a good skill", "review this skill", "skill format" |
| `ecc-skill-scout` | Search existing local / marketplace / GitHub / web skill sources before creating a new skill. | "does a skill for X already exist", "find me a skill for— |
| `ecc-coding-standards` | Universal coding standards: file organisation, naming, functions, errors, async, types, React, state, tests, security. | "best practices", "conventions", "code style", "what's the right way" |

### 5. GBrain —Meta (2 skills)

| Skill | Purpose | When to load |
|---|---|---|
| `gbrain-skillify` | The 11-axis gate to decide whether a workflow deserves a skill. Audit →write →evaluate →test →resolver. | "should this be a skill", "is this workflow skill-worthy", "write a skill properly" |
| `gbrain-eiirp` | 7-phase post-work organiser. Run at end of long session to capture what was learned, decided, deferred. | "wrap up", "summarise the session", "what did we do today", "retro" |

### 6. GStack —Workflow (6 skills)

| Skill | Purpose | When to load |
|---|---|---|
| `gstack-plan-ceo-review` | 8-question high-level review: outcome, user, MVP, cost-of-zero, cost-of-wrong, upside, metric, kill signal. | "review like a CEO", "pressure-test the plan", "is this worth doing" |
| `gstack-plan-eng-review` | 10-question engineering review: load-bearing assumption, sequencing, irreversibility, build/buy, scale, rollback, smoke test, security, observability, vertical slice. | "tech lead review", "is this buildable", "stress-test the architecture" |
| `gstack-plan-design-review` | 9-question design review: 1-sentence job, 200ms hook, primary CTA, cost-of-wrong, system feedback, scale, empty state, expertise, undo. | "is this design good", "review the UX", "pressure-test the mockup" |
| `gstack-retro` | Project retrospective —what we set out to do, what we did, deltas, kept, changes, open. | "retro", "post-mortem", "what did we learn" |
| `gstack-investigate` | 6-phase structured investigation for unknown-unknowns. Hypothesis-driven, not tool-driven. | "why is this happening", "mystery behaviour", "investigate this" |
| `gstack-qa` | 8-check quality-assurance gate before ship. Distinct from `po-tdd` (writing tests); this is *auditing* them. | "is this safe to ship", "QA before release", "pre-merge checks" |

### 7. Superpowers —Process methodology (14 skills)

The `sp-` prefix is a Cubecloud-original disambiguator; the upstream `superpowers` repo uses bare skill names (`brainstorming`, `test-driven-development`, etc.). All 14 are Cubecloud-original prose distilled from the upstream MIT-licensed source.

| Skill | Upstream source | Purpose | When to load |
|---|---|---|---|
| `sp-skill-first` | `using-superpowers` | The bootstrap: before any response, check for skills. The "1% chance" rule. | "any conversation start", "before any response" |
| `sp-tdd` | `test-driven-development` | RED-GREEN-REFACTOR for code. No production code without a failing test. | "write or modify code", "write a test", "fix a bug" |
| `sp-debug` | `systematic-debugging` | 4-phase root-cause process: reproduce →hypothesise →instrument →fix with regression test. | "broken", "flaky", "behaving unexpectedly", "regression" |
| `sp-verify` | `verification-before-completion` | "Done" requires evidence, not intent. The 5 verification questions. | "is this done", "verify the fix", "before declaring complete" |
| `sp-brainstorm` | `brainstorming` | Socratic design refinement. 8 questions, 8 design sections, design-doc handoff. | "design X", "add a feature", "build a component", "modify behaviour" |
| `sp-plan` | `writing-plans` | Bite-sized tasks (2— min) with exact file paths, complete code, verification steps. | "write a plan", "break this into tasks", "implement X" |
| `sp-execute` | `executing-plans` | Run the plan task-by-task with 2-stage review (spec, then code). | "execute the plan", "run the tasks" |
| `sp-subagents` | `subagent-driven-development` | Parallel subagent dispatch with 2-stage review. Faster for independent tasks. | "parallelise the work", "fan out the tasks", "independent work" |
| `sp-parallel` | `dispatching-parallel-agents` | One-off parallel queries for research / multi-file exploration. | "research these", "fan out search", "independent investigations" |
| `sp-request-review` | `requesting-code-review` | Pre-review checklist; report findings by severity. | "ready for review", "PTAL", "before merge" |
| `sp-receive-review` | `receiving-code-review` | Triage, fix, defend, push back. No drive-by refactors. | "responding to review", "address PR feedback" |
| `sp-worktree` | `using-git-worktrees` | Isolated worktree on a new branch; verify clean baseline; implement; verify. | "start a feature", "isolated branch", "before implementation" |
| `sp-finish-branch` | `finishing-a-development-branch` | Verify, present 4 options (merge / PR / keep / discard), clean up. | "finish the branch", "ready to ship", "what's next" |
| `sp-write-skill` | `writing-skills` | TDD-for-skills: red phase (failure transcript), green phase (minimum skill), refactor (CSO + structure). The Description Trap. | "write a new skill", "improve this skill", "skill authoring" |

## Decision tree —which skill do I load?

```
Are you writing a new skill?             →sp-write-skill (then po-write-a-skill for the lighter contract, ecc-skill-development-guide for the deep reference, gbrain-skillify for the gate)
Are you debugging a known bug?           →sp-debug (heavier) or po-diagnose (lighter)
Are you investigating a vague symptom?   →gstack-investigate (then po-diagnose or sp-debug once root cause is found)
Are you writing tests?                   →sp-tdd (heavier, with anti-patterns) or po-tdd (lighter)
Are you shipping a release?              →gstack-qa (then sp-request-review for the PR side)
Are you planning a non-trivial project?  →sp-brainstorm →sp-plan →sp-execute or sp-subagents
Are you at the end of a session?         →gbrain-eiirp (then gstack-retro for project boundaries)
Are you improving a codebase?            →po-improve-codebase-architecture
Are you stress-testing a plan?           →po-grill-with-docs
Are you about to write a skill that may exist? →ecc-skill-scout
Are you training an ML model overnight?  →ar-autoresearch
Are you compressing your output?          →po-caveman
Are you asking "should we even do this?" →gstack-plan-ceo-review
Are you starting any conversation?       →sp-skill-first (the bootstrap, loaded by default)
Are you declaring something done?        →sp-verify (evidence over claims)
Are you about to start a feature?        →sp-worktree (isolated worktree + clean baseline)
Are you ready to ship?                   →sp-finish-branch (merge / PR / keep / discard)
Are you about to hand off to a reviewer? →sp-request-review (then sp-receive-review after the response)
```

### 8. Fable Mode — Autonomous operating mode (1 skill)

| Skill | Purpose | When to load |
|---|---|---|
| `fable-mode` | Autonomous high-reasoning operating mode: long-horizon planning, proactive autonomy, self-verification, sub-agent delegation, evidence-grounded progress, effort calibration, and memory/continuity. | "use fable mode", "plan end to end", "autonomous run", "long horizon", "self verify", "migrate this end to end" |

## Source of truth

- **`/memories/cubecloud-skills-ecosystem.md`** —memory-level index of which repo each skill came from, plus the conflict-check findings (e.g. `ar-autoresearch` vs `codegraph` —zero overlap, see the memory file for details).
- Each `SKILL.md` carries its source in `metadata.source`.
- For the canonical editorial of each skill, see the upstream repo link in the frontmatter.
- **`docs/HANDBOOK.md` §5** in `agent-desktop/` —the master-handbook section that ties the 35-skill ecosystem to the desktop's product surface.

## Repo-specific workflow skills

The 35 skills above are the contributor-facing ecosystem imported and adapted from upstream sources. In addition to those, this repo may ship **workspace-only workflow skills** under `.github/skills/` for project maintenance work that should not be counted as part of the 35-skill public ecosystem.

- `.github/skills/docs-i18n-refresh/SKILL.md` —repo-specific workflow for doc sync, translation inventory updates, README PDF rerendering, and screenshot / preview sequencing.
- `.github/skills/headroom-workflow/SKILL.md` —repo-specific workflow for Headroom context compression, Copilot / VS Code setup, CodeGraph bundle compression, and non-repo global skill mirroring.

## How to add a new skill

1. Run `gbrain-skillify` —11-axis gate. Most ideas fail.
2. Run `ecc-skill-scout` —search before writing.
3. Read `sp-write-a-skill` (TDD-for-skills, with the Description Trap) **or** `po-write-a-skill` (lighter contract). Pick the one that fits.
4. Write the SKILL.md (500 line cap).
5. Write a red-phase failure transcript (`tests/red-baseline.md`).
6. Add a row to this index file.
7. Add a memory note to `/memories/cubecloud-skills-ecosystem.md`.

## Mirror

These skills are mirrored to `~/.agents/skills/` (the global Copilot skills directory) so they're available across all workspaces, not just this repo. Mirror with:

```bash
# Windows PowerShell —copy each skill folder
Copy-Item -Recurse .agents/skills/* $env:USERPROFILE/.agents/skills/
```
