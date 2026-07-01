# Red baseline: `po-write-a-skill` (poskills write-a-skill)

## Pressure scenario

> User: "I keep doing the same PR-review checklist. Turn it into a skill."

This scenario has three pressures:
1. **Recurring** (the user does this often)
2. **Domain knowledge** (the checklist has unspoken rules)
3. **Urgency** (the user wants to ship the skill today)

## Expected without the skill

A baseline agent typically:
- **Writes the skill** without gathering requirements.
- **Writes a 2000-line SKILL.md** — way over the 500-line cap.
- **Has a vague description** — "Use when reviewing PRs." Doesn't match the upstream CSO contract.
- **No anti-patterns** — best-practices-only skills are weak; the agent doesn't add the red-flag table.
- **No tests** — has no proof the skill does anything.

## Expected with the skill

A trained agent (with `po-write-a-skill` loaded) does:
1. **Gathers requirements** — what task / domain, what use cases, scripts or instructions, reference materials?
2. **Drafts the skill** — `SKILL.md` + optional `REFERENCE.md` / `EXAMPLES.md` / `scripts/`.
3. **Writes a description** that's *trigger-only* (no process summary).
4. **Adds an anti-patterns section** — the load-bearing peer of best practices.
5. **Reviews with the user** — does this cover your use cases? Anything missing or unclear?
6. **Adds cross-references** to related skills (without `@` force-links).
7. **(For the heavier discipline)** writes a red-baseline and follows TDD-for-skills per `sp-write-skill`.

## Pass criteria

- [ ] Agent asks for requirements *before* writing the skill.
- [ ] SKILL.md is under 500 lines.
- [ ] Description is trigger-only (starts with "Use when", no process summary).
- [ ] Anti-patterns section exists with concrete "don't do X because Y".
- [ ] Agent reviews with the user before declaring the skill done.
- [ ] Cross-references use skill names, not `@` force-links.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
