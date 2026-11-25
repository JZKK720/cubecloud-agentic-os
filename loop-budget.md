# Loop Budget — cubecloud-agentic-os

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| PR Babysitter (L1) | 4 | 100k | 0 (report-only) |
| CI Sweeper | — | not enabled | — |
| Dependency Sweeper | — | not enabled | — |
| Daily Triage | — | not enabled | — |

No other loop is enabled. Enabling one requires editing this file and
`LOOP.md` in the same PR, with a human approving both.

## Alerts this period

<!-- The loop-budget skill appends self-throttling notices here. Empty = none. -->
(none)

## On budget exceed

1. Stop the loop immediately.
2. Append an entry to `loop-run-log.md` with `outcome: "budget-exceeded"`.
3. Add a line to `pr-babysitter-state.md` under **Escalated**.
4. Do not start another run until a human clears the flag.

## Kill switch

- Stop invoking `/pr-review-triage`, or delete `pr-babysitter-state.md` to reset state.
- There is no scheduler wired, so "stop" is simply: don't run it.
