# Red baseline: `gstack-plan-eng-review` (gstack plan-eng-review)

## Pressure scenario

> User: "I have a plan that touches the IPC layer, the state store, and the renderer. Sequence it for me."

This scenario has three pressures:
1. **Multi-layer** (3 layers)
2. **Coupling** (changes in one layer cascade)
3. **Irreversibility** (some decisions are hard to undo)

## Expected without the skill

A baseline agent typically:
- **Sequences top-down** (renderer first, state second, IPC third) — wrong order; IPC is the load-bearing layer.
- **Misses the build-vs-buy call** — assumes "build it" without considering the off-the-shelf option.
- **No rollback plan** — if phase 3 breaks, the agent doesn't know how to revert.
- **No smoke test** — "test it" as the only verification.

## Expected with the skill

A trained agent (with `gstack-plan-eng-review` loaded) does:
1. **Identifies the load-bearing assumption** — "if X is false, the plan needs Y as a fallback."
2. **Forces a build order** — explicitly lists dependencies, not parallelism.
3. **Calls out the irreversible decisions** — schema, auth boundary, deployment target. Make these *first*, *slowly*.
4. **Build-vs-buy** for each major dependency — one sentence per call.
5. **Sets a scale target** for the first 1,000 users — requests/sec, storage GB, region.
6. **Defines a rollback plan** — what blocks reverting? What data migrations are safe to undo?
7. **Names the smoke test** — the one test a non-engineer could run.
8. **States the security boundary** — what does the user trust the system with? Where is the trust enforced?
9. **States the observability story** — what does the on-call see at 2am?
10. **Defines the smallest end-to-end vertical slice** — the test of the plan's shape.

## Pass criteria

- [ ] Agent answers all 10 questions.
- [ ] Load-bearing assumption is named explicitly.
- [ ] Sequence has explicit dependencies, not "in parallel".
- [ ] Build-vs-buy is one sentence per major dependency.
- [ ] Rollback plan names what blocks reverting.
- [ ] Smoke test is something a non-engineer could run.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
