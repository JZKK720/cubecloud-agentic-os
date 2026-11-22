# Implementation plan: the five open external-repo items

Written against: `54b8987`

## What this plan is, and what it refuses to be

This is not another verdict table. Every item below names the file it touches,
the existing owner it reuses, and the command that proves it worked.

It also states, for each item, **what makes it not worth doing**. Three of the
five should not be built now, and this plan says so with reasons rather than
leaving them "conditional" forever.

### Current truth (verified against the tree, not remembered)

| # | Repo | Verdict | Code today |
|---|---|---|---|
| 1 | deepseek-harness | ADOPT | **Shipped** — `harnesses/deepseek-harness.ts` + 4 supporting modules, live-verified |
| 2 | ag-ui | ADOPT | **Shipped** — `platform-core/src/ag-ui.ts`, `POST /api/ag-ui/run`, live-verified |
| 3 | A2UI | adopt | **Zero.** No `a2ui`/`componentTree`/`renderComponent` anywhere |
| 4 | DataFlow via MCP | adopt | **Transport done, adapter missing.** `probeSse` is fully implemented in `mcp-probe.ts:240`; no managed-app adapter exists |
| 5 | omnara | REFUSE | **Correctly absent** — zero references |
| 6 | univer | conditional | **Zero** |
| 7 | kitesurf | conditional | **Zero** |
| 8 | astryx | selective | **Zero** (no design tokens adopted) |

Two shipped, one refused, five open. Of the five, **one is worth building now.**

---

## Recommendation: build DataFlow (#4) and nothing else

**Why DataFlow and not the other four.** It is the only open item where the
expensive half already exists. `mcp-probe.ts` speaks the legacy HTTP+SSE MCP
handshake (`probeSse`, `sseEndpointEvent`, `firstSseData`) — DataFlow's exact
transport. What is missing is a `ManagedApp` adapter, and the framework for
that is mature: 13 entries in the roster at `registry.ts:27-41` expanding to 16
adapters, a documented contract in `contract.ts`, and a compact exemplar in
`everos.ts` at 4.5 KB. The work is one new file plus two registrations.

**Why not the other four, stated plainly:**

- **A2UI (#3)** needs a component-tree renderer *and* a validation layer, because the whole premise is rendering model-authored JSON safely. That is a new subsystem, and its payoff ("the agent can render a validated table") competes with simply returning Markdown, which already works. **Not worth building until someone asks for generative UI specifically.**
- **univer (#6)** — the `.xlsx`/`.docx` I/O is a paid package. A snapshot-only spreadsheet viewer is a real feature nobody has requested, and it would add the "Office" nav surface that `Layout.test.tsx:192,305` explicitly asserts must never render. **Refuse until an operator brings a spreadsheet requirement.**
- **kitesurf (#7)** — its own README says it is "not a hardened sandbox". Shipping a browser-automation backend we would have to sandbox ourselves, for a capability the existing CDP path already covers, adds attack surface for no new function. **Refuse.**
- **astryx (#8)** — 150+ components whose themes are CSS custom properties. `DESIGN.md` already defines a complete two-theme token set, and `main.css` is 12,976 lines of settled patterns. Adopting a second token source would fork the design system to gain nothing visible. **Refuse; revisit only if the design system is rewritten.**

---

## DataFlow: the implementation

### Evidence chain

- **Surface:** the Tools screen's managed-app cards, fed by `createManagedAppRegistry()` (`src/main/managed-apps/registry.ts:26`).
- **Owner:** `src/main/managed-apps/` — it owns the adapter contract; `registry.ts` owns the roster; `contract.ts` owns the shape.
- **Verified facts:** DataFlow exposes exactly 20 whitelisted MCP tools over SSE at `:8000/mcp` (from `fastapi-mcp==0.4.0`, route-derived). Transport is `sse`, which `probeSse` already handles.
- **Uncertainty:** the exact tool list is documented in the analysis (§2.4) but not re-verified in this session; the adapter should not hard-code 20 names. Validate by count and by `tools/list` passthrough.

### Changes

1. **New: `agent-desktop/src/main/managed-apps/dataflow.ts`**
   - **Change:** `createDataFlowApp(): ManagedApp` following `everos.ts`'s shape. Four members matter:
     - `id: "dataflow"`, `label: "DataFlow"`, `mode: "fabric-attach"` — DataFlow runs as a container, so the desktop attaches rather than spawns.
     - `discover()` → `probeMcpServer(url)`-equivalent against the configured base URL with `type: "sse"`; `state` is `found` / `not-found` from the probe's `ok`.
     - `health()` → `capabilities: ["inventory", "config"]`. **Not `lifecycle`**: the desktop cannot start or stop a container it merely attaches to. Capability-honest, per `contract.ts`'s own comment.
     - `inventory()` → the tool names the probe returned, so the card shows what DataFlow actually advertises.
   - **Preserve:** no writes to DataFlow's own state; the desktop mirrors only. For the `dataflow` config block, **add `"dataflow"` to `MANAGED_APP_CONFIG_BLOCKS` in `config-blocks.ts:23-29`** — that constant is an `as const` tuple, so `readAppBlock`/`writeAppBlock` will not accept a block name outside it, and the type will reject it at compile time. Do not cast around it; the tuple is the whitelist.
   - **Verify:** `discover()` against a closed port returns `not-found` with a usable `detail`; against a live `:8000/mcp` returns `found`. `probeMcpServer(entry)` takes `{ name, type, detail }` — pass `type: "sse"` and the endpoint as `detail`, matching how the MCP screen calls it.

2. **`agent-desktop/src/main/managed-apps/registry.ts`**
   - **Change:** add `createDataFlowApp()` to the roster array (line 41, after `createLayaApp()`) and `"dataflow"` to `EXPECTED_MANAGED_APP_IDS` (line 45-63). Both are required: the array controls what renders, the constant is what the roster test pins, and 16 ids currently correspond to 16 adapters.
   - **Preserve:** display order — append at the end so no existing card moves.
   - **Verify:** the roster snapshot test's expected list matches, at 17.

3. **`agent-desktop/tests/managed-apps.test.ts`**
   - **Change:** the roster assertion picks up `"dataflow"` automatically from `EXPECTED_MANAGED_APP_IDS`; add one focused case that `discover()` degrades honestly when the endpoint is unreachable.
   - **Preserve:** every existing roster assertion.
   - **Verify:** suite green.

4. **The security warning — not optional.** DataFlow is documented as *no auth, arbitrary code execution* by design. The analysis (§2.4, task 2.3) called for a rendered warning on its card and that was never built.
   - **Change:** render the warning through the existing card detail line rather than a new component. The contract already carries `detail` and `raw` for exactly this.
   - **Preserve:** no new visual pattern; if it needs to be visually distinct, reuse the existing `settings-field-hint--warning` treatment rather than inventing one.
   - **Verify:** the card's visible text contains a warning for `dataflow` specifically.

### Validation

- **Product:** with no DataFlow container running, the card shows "not found" and a warning — it must not claim health. With one running at `:8000/mcp`, the card shows found, 20 tools, and the warning still present.
- **Interface:** the card in both themes; a long tool list must not overflow; the warning must be legible at the card's font size.
- **Repository:**
  - `cd agent-desktop && npm run typecheck` → exit 0
  - `cd agent-desktop && npx vitest run tests/managed-apps.test.ts` → all pass
  - `cd agent-desktop && npx vitest run` → 1,792 + new, 0 failed

### Stop conditions

- Stop if `probeSse` cannot complete DataFlow's handshake against a real container — that would mean the transport half is not actually done, and the estimate above is wrong.
- Stop if the contract requires a `lifecycle()` the desktop cannot honestly provide.
- Stop if the warning cannot fit the existing card pattern without a new component; that is a design decision, not an implementation detail.

---

## The UI finding, already planned

The MCP probe-result finding from the `improve-ui` audit is a separate, smaller
change with its own plan at [`design-plans/mcp-probe-result-states.md`](../design-plans/mcp-probe-result-states.md).
It is independent of everything above and can ship first — it is two files and
about twenty lines.

---

## Sequencing

1. **`design-plans/mcp-probe-result-states.md`** — smallest, fully proven, no unknowns.
2. **DataFlow adapter** — the only open item with a favourable cost/capability ratio.
3. **Nothing else.** A2UI, univer, kitesurf and astryx stay refused with the reasons recorded above, so the next reader does not re-derive them.

## What would change this plan

One operator using v2.10.82 and reporting what is missing. If that report names
spreadsheets, generative UI, or browser automation, the corresponding item moves
from "refused" to "next" — with a real requirement behind it instead of a
verdict table.
