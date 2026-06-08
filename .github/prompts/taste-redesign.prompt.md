---
description: Redefine the visual design language of an existing site or component. Audit-first, atomic commits, before/after screenshots. Use for redesigns where the brand is being redefined or refreshed.
---

# /taste-redesign — Redesign an existing UI

You are running the `redesign-existing-projects` skill (taste-skill v2). Reference: `docs/agent-skills-bundle/taste-skill-ref/redesign-skill.SKILL.md` (15 KB).

## When to use

- The user is redesigning an existing site, app, or component, not building from zero.
- They want to keep the brand or change it; either way, audit first.

## Step 1 — Audit (do not skip)

Before changing anything:

1. **Brand assets.** Logo, color tokens, type stack, photography style, motion language. Screenshot or quote the source of truth.
2. **Current state.** Screenshot at desktop / tablet / mobile. Note what works, what is dated, what is broken.
3. **Constraints.** CMS limits, framework, performance budget, accessibility baseline.
4. **Decide mode.**
   - `preserve` — keep brand and structure, refresh visual details, +1 motion.
   - `overhaul` — new visual language, +2 variance, +2 motion, keep product surface.
   - `rebrand` — full identity change. Treat as new project; use `/taste-skill` instead.

## Step 2 — One-line Design Read

> "Reading this as: \<existing product> for \<audience>, in \<preserve|overhaul> mode, leaning toward \<design system or aesthetic family>."

## Step 3 — Set the three dials

| Mode | VARIANCE | MOTION | DENSITY |
|---|---|---|---|
| preserve | match existing | match+1 | match existing |
| overhaul | match existing + 2 | match existing + 2 | match existing |

## Step 4 — Atomic commits

Each commit removes or refines one concern:

1. **Tokens** (colors, type, spacing, motion) — first. Foundation for everything else.
2. **Layout primitives** (grid, container, sections) — second.
3. **Components** (header, hero, card, CTA) — third.
4. **Page-specific** (home, product, about) — fourth.
5. **Polish** (motion, micro-interactions, empty states) — last.

Take a **before** screenshot before each commit. Take an **after** screenshot after. Diff at 320px, 768px, 1280px, 1920px.

## Step 5 — Pre-flight check

Before declaring done:

- prefers-reduced-motion: passes.
- WCAG AA on the real rendered colors, not the token file.
- 320px viewport: no horizontal scroll, no clipped text.
- Dark mode: designed, not inverted.
- No AI slop tells (no purple gradient, no 3D dashboard render, no "supercharge").
- Real type (not a system default), real grid, real spacing scale.
- Diff in `git diff` is scoped to the redesign — no drive-by edits.

## Style

- Match the existing component API. If the codebase has a `<Button>`, use it.
- Do not introduce a new framework, build tool, or design system unless the user asked.
- No drive-by refactors. Format-only changes are a separate commit.
- When the change is bigger than a refresh, route to `/plan` first.

## Attribution

Adapted from `Leonxlnx/taste-skill` (MIT).
