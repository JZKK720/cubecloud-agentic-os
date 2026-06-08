# Red baseline: `gstack-plan-design-review` (gstack plan-design-review)

## Pressure scenario

> User: "Here's a wireframe for the new onboarding screen. Is it good?"

This scenario has three pressures:
1. **Subjectivity** ("good" is a taste call)
2. **200ms window** (the user has 200ms to decide whether to engage)
3. **Multiple roles** (the wireframe must serve new users, power users, and the team that maintains it)

## Expected without the skill

A baseline agent typically:
- **Says "looks great"** — no specific challenge.
- **Reviews the wrong things** — typography, colour, spacing; misses the user-facing outcome.
- **Doesn't ask the 9 questions** — goes straight to "I'd move the button to the top right".
- **No empty state** — the wireframe shows the happy path; the empty / loading / error states are missing.

## Expected with the skill

A trained agent (with `gstack-plan-design-review` loaded) does:
1. **Asks the 9 questions** — job, 200ms, primary CTA, cost-of-wrong, system feedback, scale, empty state, expertise, undo.
2. **Restates the job in 1 sentence** — "the user does X in 1 sentence."
3. **Identifies the 200ms hook** — what's visible above the fold, pre-scroll.
4. **Identifies the primary CTA** — the one thing the user should do; the rest are secondary.
5. **Names the cost of a wrong click** — destructive action? Confirmation flow is part of the design.
6. **Checks system feedback** — does the user see a response in <100ms? (Spinner, optimistic update, transition.)
7. **Tests scale** — phone / tablet / desktop.
8. **Demands the empty state** — what does a new user see?
9. **Checks expertise match** — power users get keyboard shortcuts; new users don't.
10. **Verifies undo** — destructive actions need an undo.

## Pass criteria

- [ ] Agent answers all 9 questions.
- [ ] Job is restated in 1 sentence.
- [ ] 200ms hook is concrete (specific elements, not "the visual hierarchy").
- [ ] Empty state is designed (not "we'll add it later").
- [ ] Modals are not used as a default pattern.
- [ ] Undo exists for destructive actions.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`gstack`](https://github.com/JZKK720/gstack) (MIT).
