# Make an MCP probe result show success and failure as different states

Written against: `54b8987`

## Evidence chain

- **Surface:** the MCP screen, `agent-desktop/src/renderer/src/screens/Mcp/Mcp.tsx`, rendered at the `/mcp` route. The affected rendered state is a server row **after** the operator has pressed Test: the `probeResults[s.name]` paragraph at `Mcp.tsx:308-316`.

- **Problem:** the probe result paragraph carries the class `mcp-probe-result` plus a state modifier (`ok` or `fail`), but **no CSS rule exists for any of those three selectors.** A successful handshake and a refused connection therefore render identically — same inherited colour, same size, same weight. The only difference is the `✓ ` / `✗ ` text prefix and the words inside `detail`.

- **Design evidence:**
  - `agent-desktop/DESIGN.md` → *Components → Status pills*: "`.tools-agent-reach-installed` / `.tools-agent-reach-not-installed` pair a 14px lucide icon (`CheckCircle` / `XCircle`) with a short label; success uses `--success`, failure uses `--error`."
  - `agent-desktop/DESIGN.md` → *Explicit exceptions*: **None documented.** The status-pill rule is not carved out for any surface.
  - `agent-desktop/DESIGN.md` → *Do's and Don'ts*: "Do use the CSS custom properties (`var(--accent)`, `var(--bg-elevated)`) rather than re-declaring hex values in components."
  - `agent-desktop/DESIGN.md` → *Do's and Don'ts*: "Do keep both themes working: every new color choice needs a role in both `[data-theme="dark"]` and `[data-theme="light"]`."

- **Owner:** `agent-desktop/src/renderer/src/assets/main.css` — it owns all 69 `.mcp-*` selectors and the documented `.tools-agent-reach-*` exemplars. `Mcp.tsx` consumes; it does not own the styling contract.

- **Scope and affected surfaces:**
  - `agent-desktop/src/renderer/src/assets/main.css` (add the missing rule)
  - `agent-desktop/src/renderer/src/screens/Mcp/Mcp.tsx` (swap the text glyph for the documented icon)
  - Affected surface: the MCP screen only. `.mcp-probe-result` has exactly one consumer, confirmed by repo-wide search — `Mcp.tsx:310`. No other screen emits it.

- **Uncertainty:** none affecting the change. Two values are deliberately left to the executor because the repository does not pin them and the evidence cannot determine them without inventing intent:
  1. The exact `font-size` for the result line. The exemplar uses `0.85em`; the MCP row's sibling `.mcp-row-detail` uses `12px`. **Use `0.85em`**, matching the exemplar, because this is a status line, not URL text.
  2. Whether to keep `role="status"` on the paragraph. It is set at `Mcp.tsx:311` and is unrelated to appearance. **Keep it** — removing it is out of scope for a visual correction.

## Design decision

Give the probe result the presentation the design system already assigns to a status pill with two outcomes.

The MCP screen's single most important job is telling an operator whether a configured server answers. Today it answers that question in words only, using an ad-hoc glyph pair on an unstyled paragraph, while the same product answers the identical question on the Tools screen with a coloured lucide icon. Applying the existing, documented status-pill treatment resolves the root problem — an unowned, unstyled state — with zero new concepts: the two colour tokens, the two icons, the layout, and the size all already exist and are already in use elsewhere.

This is deliberately **not** a new component. The existing system can express the decision: the pill is a class plus an icon, and both are already shared.

## Reuse

- `--success` and `--error` roles — defined in `main.css` and already used by `.tools-agent-reach-installed` / `.tools-agent-reach-not-installed`.
- `--text-secondary` — untouched; the result line inherits as it does today.
- `CheckCircle` and `XCircle` — re-exported from `agent-desktop/src/renderer/src/assets/icons/index.tsx:30` as `export { Play, Pause, Zap, TriangleAlert as Alert, CheckCircle, XCircle } from "lucide-react";`.
- **Exemplar markup: `agent-desktop/src/renderer/src/screens/Tools/Tools.tsx:624`** — `<span className="tools-agent-reach-installed"><CheckCircle size={14} /> {label}</span>`.
- **Exemplar CSS: `agent-desktop/src/renderer/src/assets/main.css`** → `.tools-agent-reach-installed { color: var(--success); display: flex; align-items: center; gap: 4px; font-size: 0.85em; }`.

No new primitive is required.

## Changes

1. `agent-desktop/src/renderer/src/assets/main.css`
   - **Change:** add, adjacent to the existing `.mcp-row-detail` rule so the MCP block stays contiguous:
     ```css
     .mcp-probe-result {
       display: flex;
       align-items: center;
       gap: 4px;
       margin: 0;
       font-size: 0.85em;
     }

     .mcp-probe-result.ok {
       color: var(--success);
     }

     .mcp-probe-result.fail {
       color: var(--error);
     }
     ```
     `margin: 0` is included because the element is a `<p>` and browsers apply a default vertical margin the row layout does not currently account for.
   - **Preserve:** every existing `.mcp-*` rule, including `.mcp-row-detail`'s mono/muted treatment. Do not restyle `.mcp-row`, `.mcp-row-main`, or the action column.
   - **Verify:** the two state rules resolve to `--success` and `--error`; no hex literal is introduced.

2. `agent-desktop/src/renderer/src/screens/Mcp/Mcp.tsx`
   - **Change:** at lines 308-316, replace the text-glyph prefix with the documented icon, and add the import.
     ```tsx
     {probeResults[s.name] && (
       <p
         className={`mcp-probe-result ${probeResults[s.name].ok ? "ok" : "fail"}`}
         role="status"
       >
         {probeResults[s.name].ok ? (
           <CheckCircle size={14} aria-hidden="true" />
         ) : (
           <XCircle size={14} aria-hidden="true" />
         )}
         {probeResults[s.name].detail}
       </p>
     )}
     ```
     Add to the import block: `import { CheckCircle, XCircle } from "../../assets/icons";`
   - **Preserve:** the `mcp-probe-result` class name and the `ok`/`fail` modifier names — they are what the new CSS targets, and changing them would silently break the fix. Preserve `role="status"`. Preserve `{probeResults[s.name].detail}` verbatim, including its i18n-sourced text. Preserve the success/failure semantics as the icon choice, not as literal characters.
   - **Verify:** a passing probe renders a green `CheckCircle` and its detail; a failing probe renders a red `XCircle` and its detail; both stay inside the row's `.mcp-row-main` column with no layout shift.

## Scope

- **Inherit:** the MCP screen's probe result only.
- **Verify:** the MCP screen in both `[data-theme="dark"]` and `[data-theme="light"]` — `--success` and `--error` are re-mapped per theme, so the two states must stay distinguishable in both. Also verify a long `detail` string (the probe can return a server error message): `.mcp-probe-result` is a flex row, so a long detail must wrap rather than overflow — add `flex-wrap: wrap` if it does not.
- **Exclude:** all other `.mcp-*` presentation; the Tools screen's existing pills (unchanged exemplars); the probe's IPC path, result shape, and `ok` computation in `agent-desktop/src/main/mcp-probe.ts`; the empty state at `Mcp.tsx:267-269`; any accessibility or ARIA work beyond the `aria-hidden` on the decorative icons.

## Validation

- **Product:** configure a reachable MCP server, press Test, and confirm the row shows a green check with its tool count; then point a server at a closed port, press Test, and confirm the row shows a red cross with the error detail.
- **Interface:**
  - Success and failure states, in dark and light themes.
  - A server whose `detail` is long (a multi-word error message) — must wrap, not overflow the row.
  - A server row with a long `name` and a long `detail` together — the `min-width: 0` on `.mcp-row-main` must keep the layout intact.
  - Both enabled and disabled rows (`.mcp-row[data-enabled="false"]` applies `opacity: 0.7`; confirm the coloured result is still legible at that opacity).
- **System:** confirm no new colour literal and no second accent hue; confirm `.mcp-probe-result` remains the only consumer of these three selectors, so the shared `.tools-agent-reach-*` pattern is reused rather than duplicated.
- **Repository:**
  - `cd agent-desktop && npm run typecheck` → exit 0.
  - `cd agent-desktop && npx vitest run src/renderer/src/screens/Mcp/Mcp.test.tsx` → all pass. The existing suite asserts on `SAMPLE_SERVERS` and probe detail text, not on the glyph, so it should be unaffected; if a test asserts the literal `"✓ "` prefix, update that assertion to the icon and note it.
  - `node scripts/check-i18n-coverage.cjs` → no new drift (no new `t()` key is introduced).
  - `node scripts/check-mojibake.cjs` → no mojibake.

## Stop conditions

- Stop if `DESIGN.md` gains an explicit exception for the MCP probe result, or if `.tools-agent-reach-*` is removed — either invalidates the contract this reuses.
- Stop if another screen begins consuming `mcp-probe-result`; the change would then need to move to a shared status primitive rather than a screen-local class.
- Stop if `--success` / `--error` are absent from either theme block in `main.css`; the correction would then require a token decision, wider than this plan.

## Design documentation

- After acceptance and validation: record in `agent-desktop/DESIGN.md` under *Components → Status pills* that `.mcp-probe-result` is a third consumer of the status-pill pattern, so the next reader does not re-derive the pairing. No other documentation change is required — the pattern itself is already documented.
