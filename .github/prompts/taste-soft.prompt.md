---
description: Soft, premium, high-end visual design language. Use when the user asks for "premium", "Apple-y", "calm", "expensive", "Linear-style", or "editorial" UI.
---

# /taste-soft — High-end, premium, calm visual design

You are running the `high-end-visual-design` skill (taste-skill v2). Reference: `docs/agent-skills-bundle/taste-skill-ref/soft-skill.SKILL.md` (10 KB).

## When to use

- The user asks for "premium", "Apple-y", "calm", "expensive", "Linear-style", "editorial", "polished", "high-end".
- The product is a paid consumer product, a creative tool, a studio site, or a brand-led B2B.

## Design read

> "Reading this as: \<product> for \<discerning audience>, with a calm premium language, leaning toward restrained typography, generous whitespace, soft spring motion."

## Dials

- VARIANCE: 6-7
- MOTION: 5-6
- DENSITY: 2-3

## Voice

- Confident, not boastful. "We made X" not "X that supercharges your workflow."
- Specific. Real numbers, real timelines, real names. Not "thousands of users" — name a real customer.
- Restrained. Short sentences. No exclamation marks in product copy.

## Type

- One display family, one text family. No more.
- Display: a serif (e.g. Newsreader, GT Sectra, Tiempos) or a strong sans (e.g. GT Walsheim, Inter Display).
- Body: a workhorse sans (e.g. Inter, Söhne, Untitled Sans).
- Display tracking: tight (-2% to -4%). Body tracking: zero.
- Modular scale ratio 1.25 or 1.333. Body 17-19px. Display 48-96px.

## Color

- Tinted near-black: `#0E0E10` or `#0B0B0C`. Not `#000`.
- Warm off-white: `#FAF8F4` or `#F6F4EE`. Not `#FFF`.
- One accent. Used sparingly. Probably a single brand color you choose deliberately.
- Semantic: green / amber / red for state, all desaturated.

## Spacing

- Generous. 8px base unit. Section padding 96-160px desktop, 48-64px mobile.
- Whitespace is content. When in doubt, cut a section.
- Asymmetric alignment preferred over centered.

## Motion

- Soft springs. Stiffness 100-200, damping 20-30, mass 1.
- Hover: 150-200ms. Entrance: 400-600ms. Page transitions: 500-700ms.
- Animate `transform` and `opacity` only.
- `prefers-reduced-motion`: full graceful skip, no fade, no movement.

## Components

- Buttons: one primary, one secondary, one ghost. No more.
- Cards: at most one per viewport as a focal point.
- Icons: one set, 1.5px stroke, matching typographic line height.
- No badges that say "NEW" or "BETA" unless they are literal product status.

## Anti-slop

- No 3D dashboard render in the hero.
- No purple gradient on a centered text block.
- No "Trusted by" logo bar with unrecognizable names.
- No "supercharge / unleash / next-generation / seamless / innovative" copy.
- No glassmorphism on form inputs.

## Attribution

Adapted from `Leonxlnx/taste-skill` (MIT).
