---
name: design-taste-frontend
description: Anti-slop renderer design rules for agent-desktop surfaces (Memory tabs, Plans, Skills, Settings, modals, dialogs). Adapted from upstream taste-skill v2  -  brief inference, three dials (VARIANCE / MOTION / DENSITY), AI-tell bans, strict pre-flight check.
source: community
metadata:
  source_repo: Leonxlnx/taste-skill
  upstream_skill: taste-skill
  upstream_url: https://github.com/JZKK720/taste-skill
  upstream_version: v2
  license: MIT
  tags: [frontend, design, anti-slop, hierarchy, motion, renderer, electron]
  related_skills: [karpathy-guidelines, electron-pro, typescript-expert]
---

# Frontend Taste for agent-desktop (anti-slop, v2)

This skill is the cubecloud-desktop-specific adaptation of upstream
`Leonxlnx/taste-skill` v2. The upstream targets landing pages and portfolios;
this adaptation targets **renderer surfaces in an Electron app**  -  Memory tabs,
Plans, Skills, Settings, Wiki viewer, modals, dialogs, conflict banners,
toast notifications. The 12 upstream sections map to the 9 below; the *em-dash
ban*, *one-accent-color*, *one-corner-radius*, *motion-must-be-motivated* rules
are kept verbatim because they are the actual anti-slop guardrails.

> **Scope:** This skill is for the **renderer** (React + CSS in
> `src/renderer/src/`). It does **not** cover main-process UI, native
> OS chrome, or splash / installer screens. For those, defer to
> `electron-pro`.
>
> **Tradeoff:** These guidelines bias toward restraint over decoration.
> For trivial UI fixes (one misaligned button, a missing tooltip), use
> judgment  -  not every change needs the full rigor.

## 1. Three Dials

Set these before designing a surface. Every layout, motion, and density
decision below is gated by them.

- `DESIGN_VARIANCE` (1-10): 1 = perfect symmetry, 10 = artsy chaos.
  *Default for agent-desktop: 4* (app chrome is information-dense, not
  art).
- `MOTION_INTENSITY` (1-10): 1 = static, 10 = cinematic.
  *Default for agent-desktop: 2* (subtle: hover states, modal fades,
  accordion expand). Anything above 4 needs `prefers-reduced-motion`
  honoring.
- `VISUAL_DENSITY` (1-10): 1 = art gallery, 10 = cockpit.
  *Default for agent-desktop: 6* (it's a power-user app; users want
  information visible without scrolling for it).

The dials are not magic numbers  -  they are the *language* for arguing about
tradeoffs. A "Linear-style settings page" wants `5/2/5`. A "hero / welcome
screen" wants `6/4/4`. When in doubt, default to `4/2/6`.

## 2. Read the Surface Before Coding

For every renderer change, answer in one line before editing:

> *"This is a **&lt;surface kind&gt;** for **&lt;user state&gt;**, with a
> **&lt;vibe&gt;** language, leaning toward **&lt;aesthetic&gt;**."*

Examples:
- *"This is the wiki page editor modal for the user actively editing content,
  with a calm / focused language, leaning toward Linear-style restraint and
  the existing cubecloud `--bg-primary` tokens."*
- *"This is the empty-state for an empty Memory tab, with a guided / encouraging
  language, leaning toward the cubecloud Welcome screen aesthetic."*

If you cannot write that one-liner, you do not know what you are designing
yet. Stop and clarify.

## 3. Repo-Specific Constraints

### 3.1 Token Authority

- **CSS variables in `main.css` are the source of truth.** `--bg-primary`,
  `--bg-secondary`, `--text-primary`, `--accent`, `--border`, `--radius-sm`,
  `--radius-md`, etc. New CSS reads from these; never hardcodes `#hex` for
  base colors.
- **One accent color per project.** If you find yourself adding a second
  accent, you are solving a hierarchy problem wrong  -  use weight, scale, or
  spacing instead.
- **One corner-radius system per project.** Pick from the existing `--radius-*`
  scale; do not invent a 7px radius because one card "feels right" at 7px.

### 3.2 Stack Honesty

- **React 18 + TypeScript + plain CSS** (no Tailwind in the renderer, no
  styled-components). New surfaces compose existing CSS class tokens
  (`.btn`, `.btn-ghost`, `.btn-secondary`, `.card`, etc.) before adding new
  ones.
- **lucide-react** is the icon library. No hand-rolled SVG icons. No
  mixing in `@phosphor-icons/react` or other icon sets per surface.
- **i18n via `useI18n()` + react-i18next.** All user-visible strings go
  through `t("memory.*")` / `t("common.*")` keys. Hardcoded English in a
  new surface is a regression, not a starting point.

### 3.3 Modal & Overlay Discipline

Modals are an *interruption*, not a page. The agent-desktop
`PageEditor.tsx` pattern is the reference:
- Single overlay, single modal, single close affordance.
- Three-pane structure: header (path + actions) / body (work surface) /
  footer (status + primary actions).
- Backdrop click and `Esc` both close (with a dirty-discard confirm if
  there is unsaved work).
- Animations are *under* 200ms; longer animations feel like waiting, not
  reacting.

### 3.4 Truthfulness

- **Do not invent backend capabilities.** If the user can only read a
  wiki page in this build, do not show an "Edit" button that opens a
  half-working editor. Either ship the editor, or hide the button.
- **Empty states must tell the user what to do next.** "No memory entries
  yet. Use the button above to add one." beats "Nothing here yet."
- **Onboarding copy must match the actual product.** The Welcome screen's
  claim "Hermes learns from your sessions" is testable. Do not paraphrase
  it into "Hermes magically knows everything" in a new screen.

## 4. Anti-Slop Rules (from upstream, preserved verbatim)

These are the *signatures* the LLM defaults to. They are the difference
between a screen that looks designed-for-this-product and a screen that
looks like a starter template.

### 4.1 Em-Dash Ban (non-negotiable)

**Em-dash (` - `) is completely banned.** Headlines, eyebrows, body copy,
button labels, tooltips, conflict-banner text, log entries, alt text  -  all
of it. Replace with period, comma, colon, line break, or a regular hyphen
with spaces.

This is the single most-violated AI tell. The phrasing is binary: zero
em-dashes. If your output contains the `—` character anywhere, the
pre-flight check fails.

### 4.2 No Generic Names, No "Acme"

- No "John Doe" / "Sarah Chan" in seed data. Use real-feeling, locale-
  appropriate names if the surface needs them.
- No "Acme Co." / "SmartFlow" / "Nexus" brand names. Invent contextual,
  premium names if the surface needs them.
- No `bg-purple-500` accent by default. agent-desktop uses a single
  accent via `--accent`; use that or pick a different design language
  for the surface.

### 4.3 No "Three Equal Feature Cards"

A row of three identical cards is the AI default for any "list of things"
in a hero. For agent-desktop:
- **Settings page** = single-column list, dense, 1px dividers, no card boxes.
- **Plans screen** = table or timeline, not cards.
- **Memory tabs** = list with metadata sidebar, not grid of cards.
- **Wiki viewer** = prose surface, not a card grid.

Cards are reserved for surfaces where the *thing on the card* is the unit
of value (a skill card, a memory entry card). A 3-up "feature card" row is
almost never the right answer.

### 4.4 No Fake-Generic Avatars / Decoration

- No SVG "egg" or Lucide user-circle icon as a placeholder avatar.
  Either generate a real avatar, show a monogram, or leave the slot empty
  with a label.
- No "Quietly in use at" / "Field notes" / "From the studio" / "Currently
  working on" decorative section headers.
- No "v0.6.0" / "Build 0048" / "last sync 4s ago" footer badges. Those
  are CLI fixtures, not marketing content.

### 4.5 Section-Layout Repetition Cap

A single screen with 8 sections of the same layout family reads as
templated. agent-desktop's settings and plans surfaces have
historically used 3-4 different list/card/detail patterns on one screen
to avoid this. If you find yourself writing the same `<Card />` 8 times,
stop and re-shape.

## 5. Motion Rules

### 5.1 When Motion Is Motivated

Animate ONLY when the motion communicates:
- *Hierarchy*: drawing attention to a single new element (toast, modal
  open, conflict banner appear).
- *Feedback*: acknowledging a user action (button press, save success,
  drag complete).
- *State transition*: showing that something changed (accordion expand,
  tab switch, panel slide).
- *Spatial understanding*: a single line of scroll-pinned content where
  the user needs to track position.

If you cannot justify the animation in one sentence, drop it. A static
page is not broken; a decorative scroll-pinned section with no purpose
is.

### 5.2 Reduced Motion (mandatory for any `MOTION_INTENSITY > 3`)

Cubecloud-desktop already has `prefers-reduced-motion` listeners in the
existing surfaces. New motion must:
- Wrap the animation in a `useReducedMotion()` check (Motion library) or
  gate via `@media (prefers-reduced-motion: reduce)` (CSS).
- Collapse infinite loops, parallax, scroll-pinned sections, magnetic
  hover to instant / static.
- Keep static state changes (color, opacity)  -  only disable transforms
  and motion-path.

### 5.3 Hardware-Accelerated Properties Only

Animate `transform` and `opacity` only. Never `top`, `left`, `width`,
`height`. Use `will-change: transform` sparingly; remove it after the
animation completes (it eats GPU memory).

### 5.4 Cleanup

Every `useEffect` that registers an animation listener must return a
cleanup. Cubecloud-desktop renderer currently leaks a few Intersection
Observers from animations done before the V2.0 cleanup pass; do not add
to that list.

## 6. Implementation Patterns

### 6.1 The PageEditor Modal Pattern (reference)

`src/renderer/src/screens/Memory/PageEditor.tsx` is the canonical
modal-with-state pattern in this codebase. When you build a new modal,
copy the structure:

- State machine: `loading →editing →saving →done/closed`
- Conflict detection (mtime, version, etc.) on save
- Undo history (capped, in-memory)
- Cmd/Ctrl-S to save, Esc to close
- Three display modes if the surface is editable: edit / split / preview

### 6.2 The KnowledgePane Pattern (reference)

`src/renderer/src/screens/Memory/Wiki.tsx` is the canonical
viewer-with-actions pattern. The "open page →see it →click Edit"
loop is well-modeled. New viewers should follow the same shape.

### 6.3 The Plan Brief Pattern (reference)

`src/renderer/src/screens/Plans/PlanDetail.tsx` is the canonical
"complex content + brief overlay" pattern. Briefs attach to plan
steps; the user can answer inline or in a modal.

## 7. Repo-Specific Anti-Patterns

### 7.1 What You Will Be Tempted To Do, And Should Not

- "Let me center this hero text."  -  Cubecloud-desktop surfaces are
  left-aligned by default. The renderer reads top-to-bottom; center
  alignment is reserved for the *one* welcome surface.
- "Let me add a glassmorphism effect to this card."  -  Glass requires
  `backdrop-filter`, which is GPU-heavy and reads as marketing on a
  power-user surface. Use a flat card with a 1px border instead.
- "Let me add a gradient hero."  -  Cubecloud-desktop uses solid colors.
  The accent color in `--accent` is for emphasis, not decoration.
- "Let me animate this on hover."  -  Hover animations are a power-user
  surface tell. Save them for `MOTION_INTENSITY > 5` designs.
- "Let me use a Bento grid for the Settings page."  -  Bento is for
  landing pages with curated visual variety. Settings wants dense,
  scannable rows.

### 7.2 What This Skill Is Not

- This skill is not a CSS framework. It does not ship utility classes.
- It is not a design system. agent-desktop does not have a design
  system; it has CSS variables and shared component classes. Use
  those.
- It is not for main-process or native UI. Those are `electron-pro`'s
  concern.

## 8. Pre-Flight Check (run before declaring done)

For every renderer change, check every box. If any box fails, the
change is not done.

- [ ] **One-liner design read** stated before coding?
- [ ] **Dial values** explicit (VARIANCE / MOTION / DENSITY), not
  silently using the agent-desktop defaults?
- [ ] **CSS variables used** for color, radius, spacing? No hardcoded
  `#hex` for base colors?
- [ ] **One accent color** used across the surface? (The cubecloud
  `--accent`, full stop.)
- [ ] **One corner-radius scale** used across the surface?
- [ ] **No em-dashes (the `—` character)** anywhere in the rendered
  text? Headlines, tooltips, body copy, log entries, alt text?
- [ ] **No "Acme" / "John Doe"** placeholder content shipped?
- [ ] **No 3-up identical card row** that does not earn its
  visual weight?
- [ ] **No "v0.6.0" / "Build 0048" / "last sync 4s ago"** decoration
  badges?
- [ ] **No "Quietly in use at" / "Field notes"** decoration headers?
- [ ] **Motion motivated** in one sentence per animation? Animation
  cleanup registered?
- [ ] **Reduced motion** honored if `MOTION_INTENSITY > 3`?
- [ ] **All user-visible strings** go through `t("memory.*")` /
  `t("common.*")`?
- [ ] **No invented backend capabilities** the build does not
  actually have?
- [ ] **Empty states** say what to do next, not just what is missing?
- [ ] **No new abstractions** added for single-use code (per
  `karpathy-guidelines` rule 2)?

## 9. Pairing

- Use `karpathy-guidelines` for the editing discipline: this skill
  tells you *what* to design; karpathy-guidelines tells you *how
  narrow* to keep the change.
- Use `electron-pro` when the renderer change depends on a new IPC
  method, a new preload binding, or a new main-process capability.
- Use `typescript-expert` for non-trivial typed state, generic
  components, or refactors of existing surface code.

## Changelog vs upstream

- v2 (this file): adapted from upstream `Leonxlnx/taste-skill` v2
  (2026 round-5 hardening). Kept the *em-dash ban*, *one accent*,
  *one radius*, *motion-must-be-motivated* rules verbatim. Removed the
  landing-page-specific sections (hero paradigms, navigation docks,
  pricing tables) that don't apply to an Electron app's renderer.
  Added the *repo-specific constraints* section (token authority, stack
  honesty, modal discipline, truthfulness) that pin the skill to
  agent-desktop's actual code.
- v1 (previous file): the original `design-taste-frontend` skill
  written for agent-desktop in June 2026, before upstream's v2
  rewrite. Replaced.
