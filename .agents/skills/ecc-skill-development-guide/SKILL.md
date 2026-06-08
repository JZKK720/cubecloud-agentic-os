---
name: ecc-skill-development-guide
description: Use when writing a new skill, reviewing a skill, refactoring an existing one, or onboarding someone to the skill ecosystem. Triggers: "how do I write a good skill", "review this skill", "skill format", "skill frontmatter", "skill description contract", "skill length budget", "skill anti-patterns", "skill review checklist".
license: MIT
metadata:
  author: Adapted from JZKK720/ECC's SKILL-DEVELOPMENT-GUIDE.md
  source: https://github.com/JZKK720/ECC
  version: "1.0.0"
---

# Skill Development Guide

A comprehensive guide to creating effective skills. This is the meta-skill — read it before writing your first skill, and re-read it before reviewing someone else's.

## What are skills?

Skills are knowledge modules that an agent (Copilot, Claude Code, Codex, OpenClaw, etc.) loads based on context. They are pure instructions, not executable code — the agent reads the SKILL.md, follows it, and uses the same tools it already has. Skills can include helper scripts that the agent invokes, but the skill *itself* is documentation, not software.

## File structure

```
skills/
└── <skill-name>/
    ├── SKILL.md           # Required. <500 lines.
    ├── examples/          # Optional. Concrete worked examples.
    │   ├── basic.md
    │   └── advanced.md
    └── references/        # Optional. External links, jargon, deep dives.
        └── links.md
```

## SKILL.md format

```markdown
---
name: skill-name
description: Brief description shown in the skill list and used for auto-activation.
origin: ECC                                  # or community, or the source repo
version: "1.0.0"
---

# Skill Title

Brief overview of what this skill covers.

## When to Activate

Describe scenarios where the agent should use this skill. This is the load-bearing section
for auto-activation — if it's vague, the skill gets loaded at the wrong times.

## Core Concepts

Main patterns and guidelines. Use the project's domain glossary vocabulary, not invented
synonyms.

## Code Examples

```typescript
// Include practical, tested examples
function example() {
  // Well-commented code
}
```

## Anti-Patterns

Show what NOT to do, with concrete examples. A good anti-pattern section prevents the same
mistake across many agents.

## Best Practices

- Actionable guidelines
- Do's and don'ts
- Common pitfalls to avoid

## Related Skills

Link to complementary skills (e.g. `related-skill-1`, `related-skill-2`).
```

## Frontmatter fields

| Field        | Required | Description                                                                 |
|--------------|----------|-----------------------------------------------------------------------------|
| `name`       | Yes      | Lowercase, hyphenated identifier (e.g. `react-patterns`). Must match the directory name. |
| `description`| Yes      | One-line description for the skill list and auto-activation.                |
| `origin`     | No       | Source identifier (e.g. `ECC`, `community`, your repo name).                 |
| `tags`       | No       | Array of tags for categorisation.                                            |
| `version`    | No       | Skill version for tracking updates.                                          |
| `license`    | No       | SPDX identifier (e.g. `MIT`). Default to repo's license.                    |
| `metadata`   | No       | Free-form key-value for author/source/links.                                 |

## Description is the most important field

The description is the *only* thing the agent sees when deciding whether to load the skill. It is surfaced in the system prompt alongside every other installed skill.

**Goal:** give the agent just enough info to know:

1. What capability this skill provides.
2. When / why to trigger it (specific keywords, contexts, file types).

**Format:**

- Max 1024 chars.
- Third person.
- First sentence: what it does.
- Second sentence: "Use when [specific triggers]."

**Good example:**

> Discipline the diagnosis loop for hard bugs: build a feedback loop, hypothesise, instrument, fix, regression-test. Use when the user reports a bug, says "debug this", describes a performance regression, or asks for "diagnose".

**Bad example:**

> Helps fix bugs.

The bad example gives the agent no signal to distinguish it from generic "fix" skills.

## Skill categories

| Category               | Purpose                                                  | Examples                                 |
|------------------------|----------------------------------------------------------|------------------------------------------|
| **Language Standards** | Idioms, conventions, best practices                      | `python-patterns`, `golang-patterns`     |
| **Framework Patterns** | Framework-specific guidance                              | `django-patterns`, `nextjs-patterns`     |
| **Workflow**           | Step-by-step processes                                   | `tdd-workflow`, `refactoring-workflow`   |
| **Domain Knowledge**   | Specialised domains                                      | `security-review`, `api-design`           |
| **Tool Integration**   | Tool / library / service usage                            | `docker-patterns`, `supabase-patterns`   |
| **Template**           | Project-specific skill template                          | `docs/examples/project-guidelines-template.md` |

## Writing effective skill content

- **Be specific.** "Be careful with X" is a wish. "X fails when Y because Z. Fix by doing W" is a skill.
- **Show, don't tell.** Code examples beat prose. Worked examples beat abstract examples.
- **Anchor in the project's language.** Use the terms the project already uses. If the project's glossary says "Order intake," don't say "the place where orders are processed."
- **Include the anti-pattern.** A good "Don't do X because it broke in 2024-Q1" is worth 100 words of best-practice prose.
- **Length budget.** 500 lines for `SKILL.md` is a hard ceiling. If you need more, split into `REFERENCE.md` (deep dive) or `EXAMPLES.md` (worked examples).
- **No time-sensitive info.** "As of 2024" is a smell. Use a versioned script for things that go stale.

## Best practices

- Test the skill against the actual agent. The description is the contract; if the agent loads the wrong skill, the description is wrong.
- Keep examples realistic. Abstracted examples teach abstract lessons. Real examples with real names teach real lessons.
- Update the skill's `version` when you materially change it. Track changes in a `CHANGELOG.md` if the skill has downstream users.
- Be ruthless about cutting. If a section doesn't earn its keep when the agent reads it, delete it.

## Common anti-patterns

- **Vague descriptions** — "Helps with X" doesn't tell the agent when to load the skill.
- **Overloaded skills** — one skill doing five things. Split by what the user would search for.
- **No anti-patterns section** — best-practices-only skills produce "I followed the skill and still failed" situations.
- **Wall of text** — skills that read like a blog post. Skills are reference material; bullet points and code blocks beat paragraphs.
- **Skill that does the work itself** — skills are instructions, not automation. If you want a script, write a script; the skill teaches when to call it.

## Testing your skill

Before publishing:

1. **Load test** — can the agent pick this skill from its description? Run a few trigger phrases and see if it loads.
2. **Apply test** — once loaded, does the agent produce output that matches the skill's examples?
3. **Skip test** — when the trigger doesn't match, does the agent *not* load the skill? (False positives are worse than false negatives.)
4. **Edit test** — can someone else (or future-you) update the skill without breaking the description contract?

## Submitting / publishing

- Place the skill in the appropriate `skills/<name>/` directory.
- Update the parent `README.md` (if your project has one) to reference the new skill.
- Add an entry to any `manifest.json` or `plugin.json` if the agent surface requires it.
- Tag the commit. Don't bury skill changes in feature work.

## Source / license

Adapted from [mattpocock/ECC · SKILL-DEVELOPMENT-GUIDE.md](https://github.com/JZKK720/ECC), MIT.
