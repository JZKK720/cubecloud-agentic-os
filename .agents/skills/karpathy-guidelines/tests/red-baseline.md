# Red baseline: `karpathy-guidelines` (andrej-karpathy-skills)

## Pressure scenario

> User: "Add a feature. The code already has a working implementation; just add the feature on top. Don't overthink it."

This scenario has three pressures:
1. **Pre-decided** ("don't overthink it")
2. **Code-already-exists** (the agent might be tempted to refactor first)
3. **Adjective-driven** ("robust", "clean", "modern" without concrete criteria)

## Expected without the skill

A baseline agent typically:
- **Drive-by refactors** — "while I was in there I also renamed…"
- **Adds speculative features** — "while I was at it I also added YAGNI…"
- **Writes hidden assumptions** — doesn't list them, makes them implicit.
- **Vague success criteria** — "the feature should work well" instead of "P99 < 200ms, no new lint errors, smoke passes".

## Expected with the skill

A trained agent (with `karpathy-guidelines` loaded) does:
1. **Think Before Coding** — restates the request, names the assumptions, names the success criteria.
2. **Simplicity First** — minimum code to satisfy the criteria; no speculative features.
3. **Surgical Changes** — touches only what the change needs; no drive-by refactors.
4. **Goal-Driven Execution** — runs the verification step the user asked for (or surfaces if no verification is named).

## Pass criteria

- [ ] Agent names the assumptions explicitly before writing code.
- [ ] Agent writes the minimum code to satisfy the success criteria.
- [ ] Agent does *not* drive-by refactor unrelated code.
- [ ] Agent surfaces a concrete success criterion (not "it should work well").
- [ ] Agent runs the verification step the user named, or asks which one to run.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`andrej-karpathy-skills`](https://github.com/JZKK720/andrej-karpathy-skills) (MIT).
