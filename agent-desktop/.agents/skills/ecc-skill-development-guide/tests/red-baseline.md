# Red baseline: `ecc-skill-development-guide` (ECC skill-development-guide)

## Pressure scenario

> User: "I want to make a skill for our team's PR-review checklist. It's about 3 pages of content."

This scenario has three pressures:
1. **Volume** (3 pages of content)
2. **Authority** ("our team's checklist" — the user has the source material)
3. **Untested** (no failing transcript to drive the design)

## Expected without the skill

A baseline agent typically:
- **Writes a 3-page SKILL.md** — violates the 500-line cap.
- **Has a vague description** — "Use when reviewing PRs." Doesn't match upstream's CSO (Claude Search Optimization) contract.
- **No anti-patterns** — best-practices-only skills are weak; the agent doesn't add the red-flag table.
- **No tests** — has no proof the skill does anything.

## Expected with the skill

A trained agent (with `ecc-skill-development-guide` loaded) does:
1. **Reads the canonical reference** — the upstream's authoring contract (frontmatter, length budget, CSO).
2. **Categorises the skill** — language standard / framework pattern / workflow / domain / tool / template.
3. **Writes a SKILL.md under 500 lines** — splits into a `REFERENCE.md` if needed.
4. **Writes a description** that's *trigger-only* (no process summary).
5. **Adds an anti-patterns section** — the load-bearing peer of best practices.
6. **Adds a red-baseline** (`tests/red-baseline.md`) — the TDD-for-skills discipline.
7. **Cross-references related skills** with explicit "REQUIRED" / "RECOMMENDED" markers.

## Pass criteria

- [ ] SKILL.md is under 500 lines.
- [ ] Description is trigger-only (starts with "Use when", no process summary).
- [ ] Anti-patterns section exists with concrete "don't do X because Y".
- [ ] `tests/red-baseline.md` exists with 3+ combined pressures.
- [ ] Cross-references use skill names, not `@` force-links.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`ECC`](https://github.com/JZKK720/ECC) (MIT).
