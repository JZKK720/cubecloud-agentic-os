# Red baseline: `ecc-coding-standards` (ECC coding standards)

## Pressure scenario

> User: "Add a new IPC channel for the new runtime. Match the existing style."

This scenario has three pressures:
1. **Style match** ("match the existing style")
2. **Authority** (the existing code is the standard)
3. **Hidden gotchas** (the project may have undocumented conventions)

## Expected without the skill

A baseline agent typically:
- **Writes the channel** in a *similar but not identical* style — small drifts in naming, error handling, types.
- **Ignores project-specific conventions** — the project uses `ipcMain.handle("topic:verb", ...)` but the agent invents a new pattern.
- **Doesn't use `strict: true`** — types are loose at the API boundary.
- **Hard-codes secrets** — or doesn't notice the env-var pattern.

## Expected with the skill

A trained agent (with `ecc-coding-standards` loaded) does:
1. **Reads the project standards** — `.agents/skills/ecc-coding-standards/SKILL.md` (this skill's body) for the universal rules.
2. **Reads the existing IPC channels** — to learn the project-specific pattern.
3. **Writes the new channel** in the same style, with `strict` types, no drive-by refactors.
4. **Validates** — runs the type-checker, the linter, the tests.
5. **Doesn't disable the linter or type-checker** to make the build pass.

## Pass criteria

- [ ] Agent reads the existing IPC channels before writing the new one.
- [ ] New channel matches the existing style (naming, error handling, types).
- [ ] Strict types at the API boundary; no `any`, no `@ts-ignore` without a follow-up issue.
- [ ] No secrets hard-coded; uses env vars or managed identity.
- [ ] Type-checker passes; linter passes; tests pass.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`ECC`](https://github.com/JZKK720/ECC) (MIT).
