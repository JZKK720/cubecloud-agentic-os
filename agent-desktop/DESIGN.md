? ---
version: alpha
name: Cubecloud Agent Desktop
description: Electron console for the Cubecloud agentic OS — dark-first operator UI with a flat, no-gradient design system.
export: css-tailwind
colors:
  bg-primary: "#212121"
  bg-secondary: "#171717"
  bg-tertiary: "#2f2f2f"
  bg-elevated: "#303030"
  bg-hover: "#3a3a3a"
  bg-active: "#424242"
  accent: "#003f7a"
  accent-hover: "#0055a4"
  accent-text: "#006acd"
  text-primary: "#ececec"
  text-secondary: "#b4b4b4"
  text-muted: "#8e8e8e"
  border: rgba(255, 255, 255, 0.06)
  border-bright: rgba(255, 255, 255, 0.1)
  success: "#22c55e"
  error: "#ef4444"
  warning: "#f59e0b"
typography:
  sans:
    fontFamily: Fira Sans
  mono:
    fontFamily: Fira Code
  title:
    fontFamily: Fira Sans
    fontSize: 32px
    fontWeight: 700
    letterSpacing: -0.5px
  subtitle:
    fontFamily: Fira Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  eyebrow:
    fontFamily: Fira Sans
    fontSize: 11px
    fontWeight: 700
    letterSpacing: 0.12em
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
---

## Overview

Cubecloud Agent Desktop is the operator console for the Cubecloud agentic OS.
Its design system is a flat, dark-first token set (`main.css`) with a single
desaturated deep-blue accent, no gradients in surfaces, and a light theme that
mirrors the same roles. The renderer is React + Tailwind v4
(`@import "tailwindcss"` in `base.css`) over CSS custom properties; screens
consume the custom properties directly rather than a second token layer.

## Themes

The governing source (`main.css`) defines exactly two themes via
`[data-theme="dark"]` (default) and `[data-theme="light"]`, switched by
`ThemeProvider`. Dark is the product's primary presentation; the light theme
re-maps the same role names (`--bg-primary: #ffffff`, `--text-primary:
#111111`, `--accent-text: #003f7a`). The YAML frontmatter records the dark
(default) values; light-theme values live only in `main.css`.

## Typography

`--font-sans` prefers "Fira Sans" (bundled) with "Google Sans" as the second
bundled face; `--font-mono` prefers "Fira Code". Titles use weight 700 with
negative tracking (`-0.5px`); eyebrows are 11px/700 with `0.12em` uppercase
letter-spacing (the `.welcome-cta-eyebrow` pattern). Body copy is 14px at
`line-height: 1.5` in `--text-secondary`.

## Layout

Onboarding screens (Splash, Welcome, Setup) are single-column, centered,
max-width-constrained stacks (`max-width: 480px` for CTA stacks and install
lanes) inside a full-height `.app` shell. The install-lane grid collapses from
two columns to one at `max-width: 640px`. The app sets `overflow: hidden` on
`body` — screens scroll in their own panes.

## Elevation & Depth

Flat by default. The one sanctioned elevation treatment is the hero CTA
(`.welcome-cta-install`): a `135deg` accent gradient, a tinted drop shadow
(`rgba(0, 0, 0, 0.18)`), and a 1px inset accent ring. Hover lifts with
`translateY(-1px)`. No other surface uses glow shadows.

## Components

- **Buttons** — `.btn` with `.btn-secondary` variants; hero CTAs use the
  `.welcome-cta-install` treatment. Disabled state is 50% opacity, not color
  swap.
- **Status pills** — `.tools-agent-reach-installed` / `.tools-agent-reach-not-installed`
  pair a 14px lucide icon (`CheckCircle` / `XCircle`) with a short label;
  success uses `--success`, failure uses `--error`.
- **Section dividers** — `.tools-section-divider` (1px `--border` rule)
  separates stacked tool cards; cards themselves are borderless sections, not
  boxed containers.
- **Code/URL text** — inline `<code>` on `--code-bg` for origins and commands.

## Do's and Don'ts

- Do use the CSS custom properties (`var(--accent)`, `var(--bg-elevated)`)
  rather than re-declaring hex values in components.
- Do keep both themes working: every new color choice needs a role in both
  `[data-theme="dark"]` and `[data-theme="light"]`.
- Don't introduce a second accent hue; the system is single-accent
  (`--accent` family only).
- Don't use gradients outside the sanctioned hero-CTA treatment.
