---
name: gbrain-skillify
description: Use when the user wants to create, build, structure, or templatize a skill, when a workflow is being repeated, or when the agent is asked "should this be a skill?". Triggers: "should this be a skill", "is this workflow skill-worthy", "write a skill properly", "this is happening again", "this deserves to be a skill".
license: MIT
metadata:
  author: Adapted from JZKK720/gbrain
  source: https://github.com/JZKK720/gbrain
  version: "1.0.0"
---

# Skillify — the meta-decision

Not every workflow is a skill. The bar is high. This skill teaches you how to *decide* whether something is a skill, and if yes, how to *build it properly* — not just write text that looks like a skill.

## Phase 0 — Should this be a skill?

The worst thing you can do is add a skill for everything. Each new skill costs:

- **Load time** — every skill's description appears in the agent's prompt, eating context.
- **Decision overhead** — when two skills overlap, the agent picks the wrong one.
- **Maintenance** — skills that don't earn their keep get stale and misfire.

Run the *Skillify* gate. Score the candidate workflow on 11 axes. Skip skillifying if total < 6.

| # | Axis | 0 | 1 | 2 |
|---|------|---|---|---|
| 1 | **Frequency** | One-off | Sometimes | Daily / per-task |
| 2 | **Reusability** | Project-specific | Same team, adjacent projects | Cross-project / cross-team |
| 3 | **Failure cost** | Easy to recover | Wasted time | Data loss / security / trust |
| 4 | **Hidden knowledge** | Documented elsewhere | Tribal | In one expert's head |
| 5 | **Decidability** | Requires taste | Yes/no answers | Clear "if X then Y" |
| 6 | **Token economy** | Verbose, hard to compress | Moderate | Compact, action-shaped |
| 7 | **Testability** | Can't verify output | Lint-passable | Concrete, checkable output |
| 8 | **Composability** | Stands alone | Plays with one other skill | Stacks with 2+ |
| 9 | **Stability** | Moving target (will change next quarter) | Mostly stable | Mature, slow-changing domain |
| 10 | **Trigger sharpness** | "Sometimes relevant" | Specific to a feature | Sharp keywords / file types |
| 11 | **Inverse cost** | Cheap to do without the skill | Slower without | Painful, error-prone without |

Score 0/1/2 per row. Total ≥ 14 = green light. 6–13 = probably skill, needs a clear shape. < 6 = don't skill it; just do the work.

If you decide *not* to skill, write a one-line reason in a comment so the next agent doesn't repeat the deliberation.

## Phase 1 — Audit existing skills

Before drafting, run `ecc-skill-scout`:

- Local skills directory
- Project-level manifests
- Marketplace (`skills.sh`, Anthropic catalog)
- GitHub search `SKILL.md <keyword>`
- Web search as fallback

If a near-match exists, you have three options:

- **Adopt** — copy it, change the frontmatter, ship.
- **Adapt** — fork and reshape. Cite the original in `metadata.source`.
- **Compose** — extend the existing one with a new section rather than creating a sibling.

Only **create from scratch** if no fit exists. New-from-scratch skills should be rare.

## Phase 2 — Write the skill

Open the project's `po-write-a-skill` skill and follow it. Critical pieces:

- **Frontmatter** — `name`, `description` (the load-bearing field), `metadata.source`.
- **Description contract** — first sentence: what it does. Second: "Use when [specific triggers]." Third person. < 1024 chars.
- **Body length budget** — 500 lines hard cap. Split into `REFERENCE.md` / `EXAMPLES.md` / `scripts/` if you need more.
- **Anti-patterns section** — the load-bearing peer of best practices. The "don't do X" cases prevent the same failure across many agents.
- **Examples** — concrete, named, runnable. Abstract examples teach nothing.
- **No "as of"** — don't put year markers. Version the script if it's time-sensitive.

## Phase 3 — Cross-modal evaluation

The skill's claims should be testable. Build a checklist of behaviours the agent should produce *because the skill is loaded*:

```
Given:  <test prompt>
Loaded: <skill name>
Output: <expected artefact shape>
Pass:   <binary or rubric>
```

Build at least 3 such tests per skill. If you can't write the test, the skill's content is too vague — go back to Phase 2.

## Phase 4 — Tests in-repo

If the skill includes scripts:

- Pin the script's expected inputs.
- Add a smoke test that runs end-to-end.
- Keep the script under 200 lines if possible. If it's longer, it's a project, not a skill helper — move it to `scripts/` of the repo, not into the skill.

## Phase 5 — Resolver

The agent can have many skills. Add a "When *not* to use" line to the description for skills that overlap with others. Use the `gbrain-eiirp` skill to handle "I have a `tdd` and a `refactor` skill loaded; which wins?" — make the boundary explicit.

## Naming convention

Prefix by source. The `ar-` / `po-` / `ecc-` / `gbrain-` / `gstack-` / `karpathy-` prefixes are used in this workspace.

- `ar-` — autoresearch (Karpathy's ML loop)
- `po-` — poskills (Matt Pocock)
- `ecc-` — Everything Claude Code
- `gbrain-` — gbrain (the skill-orchestrator brain)
- `gstack-` — gstack (planning/retros/QA)
- `karpathy-` — andrej-karpathy-skills (the 4 principles)

## Anti-patterns to call out

- **Skill that does the work itself** — skills are instructions. If you need automation, write a script.
- **Vague description** — "helps with X" gets loaded at the wrong time.
- **Best-practices-only skill** — no anti-patterns, no tests, no concrete examples. Trash.
- **Wall of text** — paragraphs where bullets would do.
- **Skill for a one-off** — even if score = 14, if the workflow won't recur, don't ship it.

## Source / license

Adapted from [JZKK720/gbrain · skillify](https://github.com/JZKK720/gbrain), MIT.
