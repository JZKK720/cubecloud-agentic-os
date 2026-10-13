# Phase C — UI Quality Gate (craft floor + audit)

> **Date:** 2026-10-13 · **Surface:** `WorkspaceConsole` (AI Workspace management panel)
> **Mandate:** `docs/plans/2026-10-08-desktop-overhaul-design.md` §7 — "no UI phase (C/D/E) declares done without the craft-floor checklist and an impeccable-audit pass recorded in the phase's verify output."
> **Method:** static/measured evidence. No live browser pass (see Blockers).

## Craft floor

| Check | Result | Evidence |
|---|---|---|
| Contrast — body/placeholder ≥4.5:1 | **FIXED** | Light `--text-muted` #999999 on `--bg-secondary` #f8f8f8 = **2.68:1** (below AA). The panels used it for subtitle, hints, and empty states. Switched to `--text-secondary` #555555 = **7.02:1**. Dark `--text-muted` #8e8e8e, if used, = 5.47:1 (already fine). |
| Depth — one elevation, no ghost card | Pass | Cards are `1px var(--border)` + `--bg-secondary`, no competing shadow. |
| Spacing — tight groups, generous separation | Pass | `:root` radii; 12–16px card padding; consistent 8/12px gaps. |
| Type — body measure, balanced headings | Pass | Panel width-bounded; inherited 12–13px scale; no overflow with real copy. |
| Motion — one authored moment | Pass | Only the app-wide `--transition: 150ms ease`; no per-panel effects. |
| States — hover/disabled/loading/error/empty | Pass | Tabs hover+active; buttons `:disabled` (inherited); loading line; error line; explicit empty state per panel. |
| Browser surfaces — focus ring | **FIXED** | The app has a global `button/input/a:focus-visible → 2px var(--accent)` rule. My `.workspace-console-input:focus { outline: none }` was later in the file and would have **overridden** it; removed. Redundant local focus rules dropped. |
| Copy — controls name their action | Pass | "Stop"/"Start"/"Provision"/"Approve"/"Refresh"; empty states name the reason. |
| Coverage — brief present/findable | Pass | All five M1–M4 mechanisms + the one write are on-screen under named tabs. |

**Bans audit:** no gradient text, no glass/blur, no colored border-left, no emoji-as-icon, no card-in-card nesting (cards are the outermost container only, one level). Card radii moved from `--radius-md` (10px) into the 12–16px band (`--radius-lg` 14px).

## Audit

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Contrast fixed above; reduced-motion respected (global rule); focus ring intact after the FIXED row above. Remaining gap: `.workspace-console-tab` buttons are 8px-padded (fine for mouse, < 44px touch). |
| 2 | Performance | 3 | No layout-thrash loops; the reload is a single pass of independent awaits. No per-panel re-render churn. |
| 3 | Responsive | 3 | `header`/`row` now `flex-wrap: wrap` so the action button group drops under narrow widths. Long ids/urls still rely on the container's existing overflow rules. |
| 4 | Theming | 4 | 100% design tokens; no hard-coded colors; dark + light both covered. |
| 5 | Implementation Integrity | 4 | One data hook owns all loads; fail-soft contract enforced by tests; no duplicated fetch logic; panels are leaf renders. |
| **Total** | | **17/20** | **Good** |

### Implementation Integrity verdict
**Pass.** The surface expresses a coherent, product-specific system: five named mechanism tabs over one hook, capability-honest empty/error states, and a single write (the approval verdict). Nothing is interchangeable with an unrelated product.

### Findings by severity

- **[P1] Light-mode muted text below AA** — `main.css` `.workspace-console-subtitle` / `-muted`. **Fixed** (→ `--text-secondary`).
- **[P1] Focus ring suppressed by a later `outline: none`** — `main.css` `.workspace-console-input:focus`. **Fixed** (removed; global ring restored).
- **[P2] Card radius below the 12–16px band** — **Fixed** (`--radius-md` → `--radius-lg`).
- **[P2] Header/row overflow on narrow widths** — **Fixed** (`flex-wrap`).
- **[P2] Touch targets < 44px** — tabs/buttons are mouse-first and match the app's existing control sizing; leave as-is for consistency (P2, no action).
- **[P3] `--text-muted` token itself is 2.68:1 in light mode** — an **app-wide** token issue, out of Phase C scope. Recommend a separate token audit across all screens.

## Blockers

- **No live browser pass.** Docker Desktop will not start in this environment, and the loopback workspace (`cubecloud-agent :6767`) accepts TCP but hangs on HTTP. The Playwright pass and the "live `:6767` smoke" in the design §5 both require a reachable runtime. Static CSS measurements + the 9 unit tests stand in as proxy evidence; the live visual pass stays **open** until a runtime is available.

## Verify output

- typecheck (web) clean · `workspace-console` + `workspace-console-data` **9/9 pass** · full suite green.
