---
name: gstack-plan-design-review
description: Use when reviewing a wireframe, mockup, prototype, or finished UI; when launching a new surface; or when the user asks "is this design good?". Triggers: "review the UX", "is this design good", "pressure-test the mockup", "is the 200ms hook right", "is the empty state designed", "is the primary CTA clear", "what does the user see first".
license: MIT
metadata:
  author: Adapted from JZKK720/gstack
  source: https://github.com/JZKK720/gstack
  version: "1.0.0"
---

# Plan — Design Review

The third leg of the plan-review tripod (CEO, Eng, Design). Design here means *the user's experience of the thing*, not "is the typography good."

## When to run

- When a new surface / screen / workflow is being introduced.
- When the user is second-guessing a UI.
- When a competitor has a clear visual / interaction advantage and you don't.
- When the agent is about to generate UI from a description and you want a checklist.

## The 9 questions

### 1. What does the user *do* here, in one sentence?

If you can't say it in one sentence, the screen is doing two things. Most bad UIs are screens that can't pick a job.

### 2. What does the user see in the first 200ms?

Above-the-fold, pre-scroll, before they read. If the most important thing isn't there, the design has failed before the user decides to engage.

State: "In the first 200ms, the user sees X, Y, Z. The most important of these is X because..."

### 3. Where is the *one* primary action?

Every screen has one action the user *should* take. If there are five equal-weight CTAs, the user takes none.

State the primary action. The other actions can exist, but they should be visually secondary.

### 4. What is the cost of being wrong here?

If a wrong click destroys data, the confirmation flow is part of the design, not an afterthought. If a wrong click does nothing, the affordance can be loose.

Design for the *cost* of the action, not the *type* of the action.

### 5. Is the system feedback synchronous?

When the user does something, do they see a response *immediately*? Spinner, optimistic update, transition, sound — anything that says "I heard you."

The failure mode of AI agents is *silence*. The user clicks, the system thinks for 4 seconds with no signal, and assumes it's broken. The design's job is to fill the silence.

### 6. Does it scale across screen sizes?

A design that only works on a 27" monitor or only on a phone is half a design. State the breakpoints and the behaviour at each.

### 7. Is the empty state designed?

What does the user see when there's no data? "No results" is not a state. The empty state is the *first* state for new users — it should be inviting, instructive, and demonstrate the product's value.

### 8. Does it respect the user's expertise?

If the user is a power user, don't hide the keyboard shortcuts. If the user is new, don't dump 14 settings panels on them. The design should match the user's stage, not the designer's.

### 9. Can the user undo?

If the user can destroy work, the design needs an undo. If the user can confuse themselves, the design needs a back button. If neither is true, the design doesn't have a permanence problem and can be bold.

## Anti-patterns to call out

- **Modal for everything** — modals interrupt. Use them only for "stop and confirm" moments.
- **Settings as a feature** — every visible setting is a decision the user has to make. Default aggressively.
- **Animation that lies** — if the spinner stops, the work is done. If the work is done but the spinner is still going, the user loses trust. Be honest with motion.
- **Loud and quiet in the wrong places** — the brand shouldn't compete with the content.
- **Inconsistency** — same shape button, same colour hover, same padding everywhere. Inconsistency is the design tax users pay without knowing it.

## Output format

```
DESIGN: <name / screen>
JOB:           <1 sentence>
200MS:         <what the user sees first>
PRIMARY CTA:   <the one thing the user should do>
COST OF WRONG: <what happens on a bad click>
FEEDBACK:      <how the system responds in <100ms>
SCALE:         <behaviour at phone / tablet / desktop>
EMPTY STATE:   <what new users see>
EXPERTISE:     <new / mixed / power user>
UNDO:          <how the user reverses an action>
VERDICT:       <ship / cut / re-scope / re-design>
```

## Source / license

Adapted from [JZKK720/gstack · plan-design-review](https://github.com/JZKK720/gstack), MIT.
