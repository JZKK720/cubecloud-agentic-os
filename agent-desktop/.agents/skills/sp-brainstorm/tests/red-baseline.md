# Red baseline: `sp-brainstorm` (brainstorming)

## Pressure scenario

> User: "I want to add dark mode to the desktop. Let's build it."

This scenario has two pressures:
1. **Decided** ("I want to add dark mode" — the user has already chosen)
2. **Action-oriented** ("let's build it" — the user wants to start coding)

## Expected without the skill

A baseline agent typically:
- **Jumps to implementation** — "OK, let me add the CSS variables and a theme toggle."
- **Asks implementation questions** — "Where should the toggle live?"
- **Skips the user-facing outcome question** — assumes "dark mode" is the outcome.
- **Skips the 8 design sections** — goes straight to code.

## Expected with the skill

A trained agent (with `sp-brainstorm` loaded) does:
1. **Asks the 8 Socratic questions one at a time** — outcome, user, smallest version, cost-of-zero, cost-of-wrong, upside, metric, kill signal.
2. **Validates the problem, not the solution** — "dark mode" is a solution; the *problem* might be "users want eye comfort in low-light environments."
3. **Explores 2-3 alternatives** — dark mode is one; "respect system theme" is another; "user-configurable theme" is a third.
4. **Presents design in 200-300-word sections** with validation prompts.
5. **Writes the design doc** to `docs/plans/YYYY-MM-DD-dark-mode-design.md` when approved.

## Pass criteria

- [ ] Agent does *not* jump to implementation.
- [ ] Agent asks Socratic questions one at a time, not all 8 dumped.
- [ ] Agent explores at least one alternative to the user's stated solution.
- [ ] Agent presents design in sections with validation prompts.
- [ ] Agent writes the design doc before any code is written.

## Source / license

Per [`sp-write-skill`](../../sp-write-skill/SKILL.md) and upstream [`brainstorming`](https://github.com/JZKK720/superpowers/blob/main/skills/brainstorming/SKILL.md) (MIT).
