---
description: Anti-slop frontend skill (taste-skill flagship). Use when designing or reviewing a landing page, portfolio, or marketing site. Reads the brief, infers the design language, then applies the three dials (VARIANCE / MOTION / DENSITY) and the full anti-slop rule set.
---

# /taste-skill — Anti-slop frontend design

You are running the `design-taste-frontend` skill (taste-skill v2, Leonxlnx). Full reference text: `docs/agent-skills-bundle/taste-skill-ref/taste-skill.SKILL.md` (87 KB, read on demand, do not paste in full into your response). Use the rules below as the operating summary; defer to the reference for edge cases.

## When to use

- Designing a new landing page, portfolio, or marketing site.
- Reviewing a UI that "looks AI-generated."
- Picking a design language when the user only says "make it pretty."

## When NOT to use

- Dashboards, data tables, multi-step product UI. (Wrong tool. Try `taste-skill-v1` or a custom ruleset.)
- Backend, CLI, infra work. (Wrong tool entirely.)

## Step 1 — Brief inference (read the room)

Before any code, infer:

1. **Page kind** — SaaS / consumer / agency / event / portfolio / redesign / editorial.
2. **Vibe words** — "minimalist", "Linear-style", "Awwwards", "brutalist", "premium consumer", "Apple-y", "editorial", "agency-y", "glassy", "dark tech", etc.
3. **Reference signals** — URLs, screenshots, products, brands.
4. **Audience** — B2B procurement vs. design-conscious consumer vs. recruiter.
5. **Brand assets** — existing logo / color / type / photography. For redesigns, these are starting material, not optional input.
6. **Quiet constraints** — accessibility-first, public-sector, regulated, trust-first, kids. These OVERRIDE aesthetic preference.

Output a one-line **Design Read** before generating:

> "Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<design system or aesthetic family>."

## Step 2 — Set the three dials

Three global variables drive every decision below. Baseline `8 / 6 / 4`. Override per design read:

| Signal | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| "minimalist / clean / calm / editorial / Linear-style" | 5-6 | 3-4 | 2-3 |
| "premium consumer / Apple-y / luxury / brand" | 7-8 | 5-7 | 3-4 |
| "playful / wild / Dribbble / Awwwards / experimental" | 9-10 | 8-10 | 3-4 |
| "landing / portfolio (default)" | 7-9 | 6-8 | 3-5 |
| "trust-first / public-sector / regulated / a11y-critical" | 3-4 | 2-3 | 4-5 |
| "redesign — preserve" | match | +1 | match |
| "redesign — overhaul" | +2 | +2 | match |

Use these exact variable names. Never alias.

## Step 3 — Apply the rules

Use the reference SKILL.md (`docs/agent-skills-bundle/taste-skill-ref/taste-skill.SKILL.md`) for the full rule set. Headline rules:

- **Brief inference first.** Never jump to a default aesthetic. State the Design Read.
- **One clarifying question, max.** If the brief is genuinely ambiguous. If you can infer, infer.
- **Anti-default discipline.** No AI-purple gradients, no centered hero over dark mesh, no three equal feature cards, no generic glassmorphism, no infinite-loop micro-animations, no Inter + slate-900 by reflex.
- **Real type, real grid, real spacing.** Modular type scale, container queries, fluid `clamp()`. No off-the-grid placement unless intentional.
- **Restraint over palette.** 1 brand, 1 accent, 1 neutral, 1 semantic. Done.
- **Motion encodes meaning.** Respect `prefers-reduced-motion`. Default easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Never animate `width` / `height` / `top` / `left`.
- **No `!important`. No inline styles. No `console.log` in shipped code.**
- **Ship checklist:** prefers-reduced-motion, WCAG AA on real colors, 320px viewport, 1x/1.5x/2x zoom, designed dark mode, no AI slop tells, real type.

## Step 4 — For redesigns, audit first

Before changing anything:

1. Inventory existing brand assets (logo, color, type, photography, motion).
2. Read the current site at multiple viewports. Screenshot if needed.
3. Decide `preserve` (match existing, +1 motion) vs `overhaul` (+2 variance, +2 motion).
4. Plan atomic commits: one per concern. Before/after screenshots per commit.

## Step 5 — Output

For design work, output:

1. The one-line **Design Read**.
2. The three **dials** with values.
3. The plan or the code, gated by the dials.
4. A short **pre-flight check** before declaring done: 7 items from the reference SKILL.md section "Pre-Flight Check".

## Attribution

Adapted from `Leonxlnx/taste-skill` (MIT). Reference: https://github.com/JZKK720/taste-skill/blob/main/skills/taste-skill/SKILL.md
