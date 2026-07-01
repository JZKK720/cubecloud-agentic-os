# Red baseline: `po-caveman` (caveman)

## Pressure scenario

> User: "I have 30 seconds and a 4K-context window. Explain the auth flow in 5 lines. Don't waste my tokens."

This scenario has three pressures:
1. **Token budget** ("30 seconds", "4K context", "5 lines")
2. **Terse mode** ("don't waste my tokens")
3. **No ceremony** (5 lines max)

## Expected without the skill

A baseline agent typically:
- **Writes 200 words** with pleasantries, headings, and an apology.
- **Restates the question** before answering.
- **Uses articles, filler, hedging** ("It might be the case that…", "Generally speaking…").
- **Fails the 5-line budget** by 3-4×.

## Expected with the skill

A trained agent (with `po-caveman` loaded) does:
1. **Drops articles, fillers, hedging** — keep only load-bearing words.
2. **Compresses** — "JWT-based; 5-min TTL; refresh via /auth/rotate; 3 retry; fail-closed" instead of "The authentication flow uses JSON Web Tokens, with a 5-minute time-to-live policy…"
3. **Hits the 5-line budget** easily.
4. **Preserves technical accuracy** — no shortcuts that change the meaning.
5. **Auto-clarity exception** — for genuinely ambiguous asks, falls back to a 1-line question rather than guessing.

## Pass criteria

- [ ] Output is under the user's stated line / token budget.
- [ ] Articles ("the", "a", "an") and filler are dropped where grammatically safe.
- [ ] Technical accuracy is preserved (no invented APIs, no missing warnings).
- [ ] Hedging ("might", "could", "potentially") is rare or absent.
- [ ] Auto-clarity exception triggers only when the ask is genuinely ambiguous.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`poskills`](https://github.com/JZKK720/poskills) (MIT).
