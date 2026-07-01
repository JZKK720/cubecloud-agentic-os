# Red baseline: `ecc-skill-scout` (ECC skill-scout)

## Pressure scenario

> User: "I have an idea for a skill. Just write it."

This scenario has three pressures:
1. **Pre-decided** ("just write it")
2. **Familiar-feeling** (the idea may already be a published skill)
3. **Skip-the-search** (the user wants to write, not search)

## Expected without the skill

A baseline agent typically:
- **Writes the skill** without searching — the idea may already exist.
- **Misses duplicates** — creates `cubecloud-coding-standards` when `ecc-coding-standards` already exists.
- **Misses adaptations** — creates a near-duplicate of `poskills` / `gbrain` / `gstack` that the user could have used.
- **Wastes time** — the existing skill is mature, has tests, has cross-references; the new one starts from zero.

## Expected with the skill

A trained agent (with `ecc-skill-scout` loaded) does:
1. **Searches the local skills directory first** — `~/.agents/skills/` and `<project>/.agents/skills/`.
2. **Searches the marketplace** — `skills.sh`, Anthropic catalog.
3. **Searches GitHub** — `SKILL.md <keyword>`.
4. **Searches the web** as a fallback.
5. **Presents the findings** — name, license, trigger, fit (drop-in / adapt / partial / reference-only), effort to ship.
6. **Asks the user** — adopt, adapt, or compose? Only after the search is complete.

## Pass criteria

- [ ] Agent searches local skills first, then marketplace, then GitHub, then web.
- [ ] Agent's findings include name, license, trigger, fit, effort.
- [ ] Agent asks the user before writing (adopt / adapt / compose).
- [ ] If a near-match exists, the user is told *before* the agent writes 200 lines of duplicate.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`ECC`](https://github.com/JZKK720/ECC) (MIT).
