---
name: sp-write-skill
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment — applies the TDD-for-skills approach: red phase (run the agent without the skill, capture failures), green phase (write the minimal skill that fixes the failures), refactor (clean up the description and structure).
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: writing-skills
  version: "1.0.0"
---

# Writing Skills (TDD-adapted)

A skill is documentation that an agent reads at the moment of decision. The same TDD discipline that produces good code produces good skills: write a failing test (the agent makes the wrong decision without the skill), write the minimum skill that flips the decision, refactor.

## The TDD mapping for skills

| TDD phase | Skill phase | Output |
|---|---|---|
| RED | Write a *pressure scenario* (a realistic user message that should trigger the skill, but won't yet). Run it. Capture the agent's response verbatim. | A failure transcript. |
| GREEN | Write the minimum skill body that flips the agent's response to the right one. | A draft SKILL.md. |
| REFACTOR | Tighten the description, fix the structure, add cross-references. | A shippable skill. |

## The pressure scenario (RED)

A good pressure scenario has:

- **A realistic user message** (not "use the skill" — a real ask).
- **A trigger phrase** that the agent should match.
- **One or more *pressures*** (time, sunk cost, "this is just a quick thing", "I know what the answer is") that would normally cause the agent to skip the skill.

Three combined pressures is a healthy test. One pressure is a wish; ten is theatre.

Example (for a TDD skill):

> User: "I just need to add one helper. It's 5 lines. Tests are overkill for this. Just write it."

That's three pressures: trivial, no tests, "just do it". A good TDD skill makes the agent push back.

## Run the scenario WITHOUT the skill

Send the message to the agent. Capture the response verbatim. Look for the failure mode:

- Did the agent just write the code? (Failure: TDD wasn't applied.)
- Did the agent mention tests? (Partial success.)
- Did the agent write a test *first*? (Success — but only because the model happens to know TDD, not because the skill is in place.)

The scenario is a test of the *skill*, not of the *model*. The skill's job is to make the right behaviour reliable across models and across pressure levels.

## Write the minimum skill (GREEN)

The skill body should:

- **Open with the rule** in 1–2 sentences. The rule is the load-bearing part.
- **List the failure modes / red flags** as a table. The table is the load-bearing peer of the rule.
- **Show one worked example** that demonstrates the right behaviour. Concrete, not abstract.
- **Cross-reference related skills** (e.g. `cubecloud-debug` if your skill is the lighter variant).

If the rule + the table + the example don't flip the agent's response, the skill is too vague. Tighten.

## Refactor (REFACTOR)

- **Tighten the description.** It must be *trigger-only* — no process summary in the description. Process in the body, triggers in the description. (See "The Description Trap" below.)
- **Trim the body to 500 lines or less.** If you need more, split into a reference file.
- **Add cross-references** to related skills. Use skill names only, with explicit "REQUIRED" / "RECOMMENDED" markers — no `@` links, which force-load.
- **Add the skill to a test suite.** A test scenario per skill, runnable in CI.

## The Description Trap (the most common skill failure)

**If the description contains a process summary, the agent follows the description and skips the body.** The description is the only thing the agent sees when deciding whether to load the skill; if the description already has the answer, the body never gets read.

- ✅ Good: `description: "Use when writing a test or modifying production code — enforces RED-GREEN-REFACTOR. Writes failing test first, watches it fail, writes minimal code, watches it pass, commits."`
  - Wait — that last sentence is *process*, not trigger. Tighten:
- ✅ Better: `description: "Use when writing or modifying any code — enforces the RED-GREEN-REFACTOR cycle. No production code without a failing test first."`
- ❌ Bad: `description: "RED-GREEN-REFACTOR: write a failing test, watch it fail, write minimal code, watch it pass, commit. Use when writing code."`
  - The first sentence *is* the process. The agent will follow that and skip the body.

Rule: the description is *what triggers the skill*. The body is *what the skill does*. Don't duplicate the body in the description.

## Claude Search Optimization (CSO)

The description is the search result. Optimize for it.

- **Start with "Use when..."** — the load-bearing prefix that signals "this is a trigger".
- **List specific symptoms / contexts / keywords** — "writes test", "RED", "GREEN", "before commit", "TDD", "test-driven". The agent matches on these.
- **Third person, present tense** — "enforces the cycle", not "we will enforce".
- **Specific is better than generic** — "Use when writing code" matches too many things. "Use when writing a test, modifying production code, or fixing a bug" is sharper.

## Skill file structure

```
skill-name/
├── SKILL.md          # The skill (required, <500 lines)
├── REFERENCE.md      # Detailed docs (if needed, optional)
├── EXAMPLES.md       # Worked examples (if needed, optional)
├── tests/            # Pressure scenarios (per the TDD approach)
│   ├── red-baseline.md
│   ├── green-with-skill.md
│   └── refactor-final.md
└── scripts/          # Utility scripts (if needed, optional)
    └── helper.js
```

## The Iron Law for skills

> **No skill ships without a red-phase failure transcript.**

If you can't show that the agent fails *without* the skill, you don't know whether the skill does anything. The failure transcript is the spec; the skill is the fix.

## Anti-patterns

- **Skill that summarises the body in the description** — see The Description Trap.
- **Vague description** — "Use when needed" loads the skill at the wrong times.
- **No failure transcript** — you don't know if the skill works.
- **Best-practices-only skill** — no red flags table, no anti-patterns. The agent will still skip it under pressure.
- **Wall of text** — paragraphs where bullets would do.
- **Skill that does the work itself** — skills are instructions. If you need automation, write a script.
- **Long-lived WIP skills** — if a skill has been in `in-progress/` for 3 months, it probably shouldn't be a skill.

## Discovery workflow

Before writing a new skill:

1. **Check the local skills directory.** Is there a near-match?
2. **Check the marketplace** (`skills.sh`, Anthropic catalog).
3. **Check upstream repos** (the 6 repos we adapted from: `autoresearch`, `poskills`, `andrej-karpathy-skills`, `ECC`, `gbrain`, `gstack`, `superpowers`).
4. **Check web search** as a last resort.

If a near-match exists, adopt / adapt / compose. Only write from scratch if no fit.

## Related skills

- `gbrain-skillify` — the 11-axis gate that decides whether to write a skill at all.
- `po-write-a-skill` — the lighter authoring contract (no TDD-for-skills discipline).
- `ecc-skill-development-guide` — the canonical skill-authoring reference.
- `ecc-skill-scout` — the search-before-write workflow.

## Source / license

Adapted from [JZKK720/superpowers · writing-skills](https://github.com/JZKK720/superpowers/blob/main/skills/writing-skills/SKILL.md), MIT. The Description Trap, CSO, and TDD-for-skills discipline are upstream's; the Cubecloud additions are the cross-references to the broader 20-skill ecosystem and the discovery-workflow integration.
