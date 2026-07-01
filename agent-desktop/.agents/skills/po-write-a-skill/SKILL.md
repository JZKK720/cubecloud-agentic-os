---
name: po-write-a-skill
description: Use when the user wants to create, write, or build a new SKILL.md; when scaffolding a workflow into a reusable skill; or when an existing skill needs cleanup. Triggers: "write a skill", "create a skill", "SKILL.md template", "skill structure", "skill frontmatter", "add a new skill", "this workflow deserves a skill".
license: MIT
metadata:
  author: Adapted from JZKK720/poskills
  source: https://github.com/JZKK720/poskills
  version: "1.0.0"
---

# Writing Skills

## Process

1. **Gather requirements** — ask the user:
   - What task/domain does the skill cover?
   - What specific use cases should it handle?
   - Does it need executable scripts or just instructions?
   - Any reference materials to include?

2. **Draft the skill** — create:
   - `SKILL.md` with concise instructions
   - Additional reference files if content exceeds ~500 lines
   - Utility scripts if deterministic operations needed

3. **Review with user** — present draft and ask:
   - Does this cover your use cases?
   - Anything missing or unclear?
   - Should any section be more/less detailed?

## Skill Structure

```
skill-name/
├── SKILL.md          # Main instructions (required, <500 lines)
├── REFERENCE.md      # Detailed docs (if needed)
├── EXAMPLES.md       # Usage examples (if needed)
└── scripts/          # Utility scripts (if needed)
    └── helper.js
```

## SKILL.md Template

```markdown
---
name: skill-name
description: Brief description of capability. Use when [specific triggers].
license: MIT         # optional
metadata:             # optional
  author: Your Name
  source: <url>      # if adapted
  version: "1.0.0"
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

[Step-by-step processes with checklists for complex tasks]

## Advanced features

[Link to separate files: See [REFERENCE.md](REFERENCE.md)]
```

## Description Requirements

**The description is the only thing your agent sees when deciding which skill to load.** It's surfaced in the system prompt alongside all other installed skills. Your agent reads these descriptions and picks the relevant skill based on the user's request.

**Goal:** Give your agent just enough info to know:

1. What capability this skill provides.
2. When/why to trigger it (specific keywords, contexts, file types).

**Format:**

- Max 1024 chars.
- Write in third person.
- First sentence: what it does.
- Second sentence: "Use when [specific triggers]."

**Good example:**

> Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.

**Bad example:**

> Helps with documents.

The bad example gives your agent no way to distinguish this from other document skills.

## When to add scripts

Add utility scripts when:

- Operation is deterministic (validation, formatting, parsing).
- Same code would be generated repeatedly.
- Errors need explicit handling that the LLM forgets.

Scripts save tokens and improve reliability vs generated code. Put them in `scripts/` and reference them by relative path from `SKILL.md`.

## When to split files

Split into separate files when:

- `SKILL.md` exceeds ~500 lines.
- Content has distinct domains (e.g. finance vs. sales schemas).
- Advanced features are rarely needed (move to `REFERENCE.md`).
- Examples are extensive (move to `EXAMPLES.md`).

## Progressive disclosure

The agent loads `SKILL.md` first. Other files in the skill folder are loaded only when referenced. Use this:

- `SKILL.md` — quick start, core workflow, when to use.
- `REFERENCE.md` — deep dives, edge cases, full API.
- `EXAMPLES.md` — copy-pasteable worked examples.
- `scripts/` — deterministic helpers.

## Review checklist

After drafting, verify:

- [ ] Description includes triggers ("Use when…").
- [ ] `SKILL.md` is under 500 lines.
- [ ] No time-sensitive info (skills are versioned; pin dependencies in scripts).
- [ ] Consistent terminology (use one name for each concept).
- [ ] Concrete examples included.
- [ ] References go one level deep (don't nest skill dirs).
- [ ] License + source attribution if adapted from elsewhere.
- [ ] Tested with the actual agent.

## Naming convention

- Lowercase, kebab-case (`caveman`, `grill-with-docs`, `write-a-skill`).
- Verb-noun or noun forms: prefer action-oriented (`diagnose` over `diagnosis`).
- Prefixes for provenance: `po-` (poskills), `ar-` (autoresearch), `gbrain-`, `gstack-`, `ecc-`, `karpathy-`. Clear sourcing, no collisions.

## Source / license

Adapted from [mattpocock/skills · write-a-skill](https://github.com/JZKK720/poskills), MIT.
