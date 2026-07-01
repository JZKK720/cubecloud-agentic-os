---
name: ecc-skill-scout
description: Use when the user wants to create, build, fork, or find a skill for a workflow, or when a "new" skill idea already feels familiar. Triggers: "does a skill for X already exist", "find me a skill for…", "search skills", "is there a marketplace skill for…", "before I write this skill, check first".
license: MIT
metadata:
  author: Adapted from JZKK720/ECC
  source: https://github.com/JZKK720/ECC
  version: "1.0.0"
---

# Skill Scout

Before writing a new skill, search. Most "new" workflow ideas are already a published skill somewhere, possibly in your own skills directory. Finding the existing one is faster, safer (someone else has debugged it), and respects the user's time.

## Search order — try in this order

1. **Local skills directory** — `~/.agents/skills/` (global) and `<project>/.agents/skills/` (project). These are what the agent can already load. The fastest win is finding a near-match you can adapt in 5 minutes instead of write from scratch in 50.
2. **Project-specific skills** — any in-repo skill manifests, `AGENTS.md` skill tables, package manifests, or workflow docs that describe "how we do X here."
3. **The marketplace / catalog** — Anthropic's `skills.sh` (`https://skills.sh`), the openai/skills repo, or any installed agent's skill browser.
4. **GitHub** — `github.com/search?q=SKILL.md+<keyword>&type=code`. Many skills live in personal repos before they make it to a marketplace.
5. **Web search** — fallback. Skills aren't always indexed well; use specific terms from the workflow.

## What to extract when you find a match

- The `description` field — that's the most-curated, most-stable part of a skill. It tells you *exactly* when the original author wanted it triggered.
- The trigger phrases / keywords in the body.
- Any test fixtures or examples the original author shipped (these are gold — they encode the author's mental model of "what good output looks like").
- License. Most skills are MIT; some are AGPL or custom. Don't republish a non-MIT skill into a closed-source product without thinking.

## When to skip the search

- The user explicitly says "I know this doesn't exist; build it anyway."
- The skill is genuinely project-specific (encodes this repo's specific decisions) and won't generalize.
- The skill is 5 lines or less — searching takes longer than writing.

## When the search returns "nothing"

- Check spelling. "caveman", "caveman-comms", "ultra-compressed" are all real names for similar ideas.
- Look for the workflow's *primitive*, not its name. A skill for "terse responses" might be filed under "communication", "voice", "output-format", or "tldr".
- Check the user's prior skills directory. They may have written a private version of this six months ago.

## Output format

When you find a match, present:

```
Found: <repo/url>, <skill-name>
  - Description: <1-line>
  - License: <MIT/etc.>
  - Trigger: <when to load>
  - Fit: drop-in / adapt / partial / reference-only
  - Effort to ship: <1h / half-day / full-day>
```

## Source / license

Adapted from [mattpocock/ECC · skill-scout](https://github.com/JZKK720/ECC), MIT.
