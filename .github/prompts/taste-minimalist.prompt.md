---
description: Minimalist editorial product UI (Notion / Linear vibes). Restrained palette, crisp structure, low motion. Use for productivity tools, internal apps, B2B SaaS surfaces.
---

# /taste-minimalist — Notion / Linear style product UI

You are running the `minimalist-ui` skill (taste-skill v2). Reference: `docs/agent-skills-bundle/taste-skill-ref/minimalist-skill.SKILL.md` (7 KB).

## When to use

- Productivity tools, internal apps, B2B SaaS surfaces, settings / dashboard UI.
- The user wants "Notion-like", "Linear-like", "calm", "restrained", "editorial product UI".

## Design read

> "Reading this as: \<product> for \<power users>, with a restrained editorial language, leaning toward Inter / Geist, neutral palette, type-driven hierarchy, micro-motion only."

## Dials

- VARIANCE: 4-5
- MOTION: 2-3
- DENSITY: 4-5

## Type

- Single family, multiple weights. Inter, Geist, or Söhne.
- Body 14-15px. Display 24-32px. Section headers 18-22px.
- Tight tracking on display. Zero on body. Positive tracking on small caps.
- Real type, not system default.

## Color

- Neutral palette. Cool grays, 6-8 stops.
- One accent. Used for primary actions, focus, and active state only.
- Tinted near-black on light, tinted off-white on dark.
- Semantic colors desaturated.

## Spacing

- 4px base unit. Tight.
- Component padding 12-16px. Section padding 24-32px.
- Real grid: 4 / 8 / 12 columns. Stick to it.

## Motion

- 80-150ms for hovers. 150-250ms for state changes. No entrance choreography.
- Easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- No spring physics. No bouncy easing.
- Animate `transform` and `opacity` only.
- `prefers-reduced-motion`: skip everything but instant state changes.

## Components

- Buttons: one variant per intent. No `variant="primary" intent="destructive" elevation="raised"`.
- Inputs: real labels above, real placeholder only for examples, real helper text, real error states.
- Tables: real headers, real sticky columns when needed, real row hover state, real empty state.
- Modals: scrim 0.5 opacity, max-width by content, focus trap, Esc to close.
- Tabs: real ARIA, real keyboard nav, real URL state when appropriate.
- Empty states: real copy, real CTA, not a sad face.

## States

Render each, do not collapse:

- **Loading.** Skeleton, never a spinner that blocks the whole screen.
- **Empty.** Real CTA. "No projects yet. Create your first."
- **Error.** Real recovery. Not "Something went wrong."
- **Partial.** Real indication of how much is loaded, what is loading.
- **Success.** Real confirmation, not just a toast that disappears.

## Anti-slop

- No "10x productivity" or "unleash the power" copy.
- No "AI-powered" without naming the actual capability.
- No emoji in product UI except where culturally expected.
- No shadows on every surface. Use a single elevation token.
- No "Sign up to get started" walls. Real trial, real value first.

## Attribution

Adapted from `Leonxlnx/taste-skill` (MIT).
