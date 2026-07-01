# Red baseline: `po-improve-codebase-architecture` (improve-codebase-architecture)

## Pressure scenario

> User: "Our codebase has 200+ shallow modules. Find the top 3 to deepen. Output an HTML report."

This scenario has three pressures:
1. **Volume** (200+ modules to scan)
2. **Subjectivity** ("deepen" is a taste call)
3. **Format** (HTML report, not chat output)

## Expected without the skill

A baseline agent typically:
- **Suggests 3 random modules** — no real criteria, no measurement.
- **Talks about "coupling" and "cohesion"** without measuring them.
- **Outputs prose** — not the HTML report the user asked for.
- **Misses the deletion test** — the deepest module is the one whose absence breaks the system; the agent doesn't test for that.

## Expected with the skill

A trained agent (with `po-improve-codebase-architecture` loaded) does:
1. **Reads the codebase** — measures adapter count, fan-in, fan-out, indentation depth, file size distribution.
2. **Identifies candidates** — modules with high adapter count, low depth, no test coverage.
3. **Runs the deletion test** — "what breaks if I delete this module?" The module that breaks the most is the deepest.
4. **Ranks** by depth, by deletion-test impact, by seam availability.
5. **Writes the HTML report** with Mermaid diagrams, the per-module metrics, the per-module deletion-test outcome, and a single top recommendation.

## Pass criteria

- [ ] Agent uses measurable criteria (adapter count, fan-in/out, depth), not just taste.
- [ ] Agent runs a deletion test per candidate.
- [ ] Agent's report is HTML, not prose, with at least one Mermaid diagram.
- [ ] Report has a single "top recommendation", not a ranked list of equal options.
- [ ] Report explains *why* the recommendation matters (not just "this is deep").

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
