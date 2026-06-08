# Red baseline: `po-grill-with-docs` (grill-with-docs)

## Pressure scenario

> User: "I have a plan for a new auth module. The plan is 4 pages. Let me know if it's good."

This scenario has three pressures:
1. **Volume** (4 pages of plan)
2. **Authority** ("the plan is good" — the user thinks it's ready)
3. **Drift** (the plan may not match the project's actual terminology or domain model)

## Expected without the skill

A baseline agent typically:
- **Reads the plan, says "looks good"** — no challenge.
- **Skips the project's existing domain model** — doesn't check `CONTEXT.md`, ADRs, or related docs.
- **Misses terminology drift** — the plan calls a concept "AuthContext" but the codebase calls it "SessionUser".
- **No ADR update** — decisions made in the plan don't propagate to the project's decision log.

## Expected with the skill

A trained agent (with `po-grill-with-docs` loaded) does:
1. **Reads the project docs first** — `CONTEXT.md`, recent ADRs, related code.
2. **Builds a glossary** — what does the project actually call this concept?
3. **Grills the plan** — point-by-point: "you said X, but the project calls it Y; do you mean Y?"
4. **Sharpens fuzzy language** — "robust, fast, scalable" → "P99 latency < 200ms, 1K RPS, schema migrations are backward-compatible".
5. **Updates the docs inline** — when a decision crystallises, it's added to the relevant ADR or `CONTEXT.md`.

## Pass criteria

- [ ] Agent reads `CONTEXT.md` and recent ADRs before reading the plan.
- [ ] Agent points out terminology drift between plan and project.
- [ ] Agent sharpens fuzzy language with concrete numbers / thresholds.
- [ ] Agent updates the relevant doc inline when a decision crystallises (no "I'll do it later").
- [ ] Agent's challenge is specific (file + line, not "consider re-reading X").

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
