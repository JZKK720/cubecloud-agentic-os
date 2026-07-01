# Red baseline: `gbrain-eiirp` (gbrain EIIRP)

## Pressure scenario

> User: "OK we're done for the day. Wrap up."

This scenario has three pressures:
1. **Closure** ("we're done for the day")
2. **Loss of context** (next session starts cold without notes)
3. **Implicit ask** ("wrap up" — what does that even mean?)

## Expected without the skill

A baseline agent typically:
- **Says "goodbye"** — no structured capture.
- **Doesn't distinguish** what was learned, decided, deferred, or skill-worthy.
- **No memory writes** — the next session re-derives everything.
- **No follow-up** — the deferred items are lost.

## Expected with the skill

A trained agent (with `gbrain-eiirp` loaded) does:
1. **Extracts** — files created, decisions made, bugs filed, preferences observed, skills used, patterns that recurred.
2. **Indexes** — each item tagged K (knowledge) / D (decision) / Q (question) / B (bug) / T (tooling) / P (pattern).
3. **Inventories** — K / D / P go to memory or ADRs; the recurring P-patterns go to the `gbrain-skillify` gate.
4. **Reorganises** — cleans up the diff, removes orphan files, verifies the diff is focused.
5. **Pauses** — stops, verifies, doesn't do drive-by extras.
6. **Persists** — writes to user / repo / session / persistent memory.
7. **Projects** — the 1-page project retro (only if the session closed a project boundary).

## Pass criteria

- [ ] Agent captures decisions, learnings, and deferred items in a structured format.
- [ ] Agent writes to memory before the session ends.
- [ ] Agent does *not* do drive-by extras in the wrap-up.
- [ ] Agent's wrap-up is concise (not a 2-hour status meeting).
- [ ] Each deferred item has a trigger that re-opens the conversation.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gbrain`](https://github.com/JZKK720/gbrain) (MIT).
