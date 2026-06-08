---
description: Image-first pipeline: generate site references, analyze them, then implement the frontend to match. Use when the user has a visual direction but no spec.
---

# /taste-image-to-code — Reference image to working frontend

You are running the `image-to-code` skill (taste-skill v2). Reference: `docs/agent-skills-bundle/taste-skill-ref/image-to-code-skill.SKILL.md` (36 KB).

## When to use

- The user has a screenshot, a reference site, a Pinterest board, or a generated image, and wants code that matches.
- The visual direction is the spec. There is no written brief.

## Step 1 — Read the references

For each input image:

1. **Layout grid.** Columns, gutters, alignment, asymmetry.
2. **Type.** Families used, scale ratio, weights, line heights, tracking.
3. **Color.** Tinted near-black or pure black? Warm or cool off-white? Accent usage. Dark mode if shown.
4. **Motion** (if it is a video or animated image). Easing, duration, what animates, what does not.
5. **Density.** Information per viewport.
6. **Anti-slop tells.** Does the reference itself have any? If yes, do not copy them.

## Step 2 — State the Design Read

> "Reading this as: \<page kind> for \<audience>, with a \<vibe> language, leaning toward \<what the reference implies>."

## Step 3 — Set the three dials

Infer from the reference:

- VARIANCE: the asymmetry index of the reference layout.
- MOTION: the motion vocabulary you observed.
- DENSITY: the information per viewport.

## Step 4 — Build

For each section of the reference:

1. **Skeleton first.** Wire the grid and section structure. No type, no color.
2. **Type second.** Real type that matches. Modular scale, line heights, tracking.
3. **Color third.** Tokens, not hex. WCAG AA on real contrast.
4. **Spacing fourth.** Real spacing scale, not eyeballed.
5. **Motion last.** Only the parts the reference showed. Respect `prefers-reduced-motion`.

## Step 5 — Verify against the reference

For each major section, side-by-side compare:

- Layout structure
- Type scale and rhythm
- Color palette
- Spacing rhythm
- Motion vocabulary (if any)

If the implementation does not match, fix the implementation. Do not change the reference. If the reference is genuinely unbuildable as-is (e.g. an Awwwards experiment), say so and propose the closest shippable translation.

## Step 6 — Pre-flight check

Same as `/taste-skill`: prefers-reduced-motion, WCAG AA, 320px viewport, 1x/1.5x/2x zoom, designed dark mode, no AI slop tells, real type, real grid, real spacing.

## Style

- Do not invent features the reference does not have. Match first, embellish later.
- If the user gives multiple references, pick the dominant language. Do not mix Awwwards-experimental with GOV.UK-trust-first.
- For non-public pages (auth, dashboard, settings), use `taste-skill-v1` instead. This skill is for landing / portfolio / marketing only.

## Attribution

Adapted from `Leonxlnx/taste-skill` (MIT).
