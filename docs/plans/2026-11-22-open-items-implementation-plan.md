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
| 4 | DataFlow via MCP | adopt | **Shipped** (`5850f43`) — `managed-apps/dataflow.ts` + 7 tests. Transport was already done in `probeSse` |
| 5 | omnara | REFUSE | **Correctly absent** — zero references |
| 6 | univer | conditional | **Zero** |
| 7 | kitesurf | conditional | **Zero** |
| 8 | astryx | selective | **Zero** (no design tokens adopted) |

Three shipped, one refused, four open — and the four that remain are refused below with reasons rather than left "conditional".

---

## Recommendation: build DataFlow (#4) and nothing else

> **Status: built.** The adapter landed in `5850f43` as
> `managed-apps/dataflow.ts` with 7 tests. What follows is the reasoning that
> produced it, kept because the next reader needs to know *why* this one and
> not the other four.

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

## Re-evaluation of the four open items (2026-11-22, requested)

Checked against the tree rather than re-asserted. **Three of the four refusals
are confirmed. One is revised.**

### A2UI (#3) — refusal CONFIRMED, with a sharper reason

`AgentMarkdown.tsx` already renders with `remarkGfm`, so GFM tables reach the
operator today (`remarkGfm` at line 136, wired into `components` at 137). A2UI's
payoff is "the agent can render a validated table" — that capability already
exists in a form the model can produce without new machinery.

What A2UI would add is *interactive* validated JSON trees, which requires a
validator and a component registry mapping JSON to React. That is a subsystem,
and it buys interactivity nobody has asked for. **Refusal stands.**

### univer (#6) — refusal CONFIRMED

Seven `navigation.office` keys still exist across locales, and
`Layout.test.tsx:192,305` still asserts that key must never render. Adding
univer would resurrect a nav surface the tests explicitly forbid, and its
`.xlsx`/`.docx` I/O is a paid package. **Refusal stands.**

### kitesurf (#7) — refusal CONFIRMED, and now better evidenced

`createBrowserHarnessApp` already provides a browser-tool surface (12 references
in `managed-apps/`). kitesurf would be a *second* browser backend for the same
capability, and its own README says "not a hardened sandbox". Adding it means
shipping and sandboxing a competing browser engine to duplicate what is already
wired. **Refusal stands.**

### astryx (#8) — **REVISED: refusal stands, but for a different reason**

My earlier reason — "`DESIGN.md` plus settled `main.css`" — was hand-wavy. The
concrete measurement: `main.css` defines **70 CSS custom properties** across two
themes, and `DESIGN.md` documents every role. astryx's contribution would be
component *markup*, not tokens; its themes are also CSS custom properties, so
adopting them would mean re-pointing 70 existing variables at a second naming
scheme with no visual gain.

The honest framing: this is not "we have enough tokens", it is "astryx would
require rewriting 70 token declarations and every consumer of them to change
nothing visible". **Refusal stands on measurable cost, not taste.**

### What would still change any of these

Only a named requirement from someone using the product. None of the four is
blocked on engineering effort; each is blocked on nobody having asked.

## Sequencing

1. **`design-plans/mcp-probe-result-states.md`** — shipped `7c5aed1`. Two files, fully proven.
2. **DataFlow adapter** — shipped `5850f43`. One file + three registrations.
3. **Docker kernel boot + external auth** — shipped `74d86d0`. The container path had never been *run*; see that commit.
4. **Nothing further.** A2UI, univer, kitesurf and astryx stay refused with the reasons recorded above, so the next reader does not re-derive them.

## Re-think of the four refusals, against your proposal (2026-11-22)

You asked whether A2UI and univer can be adopted, and whether kitesurf and
astryx can run as **separate container runtimes wired as tools or MCPs**. I
checked the repos at source rather than reasoning from memory. **My earlier
refusal of kitesurf was wrong about the facts**, and two of the four become
worth doing under your framing.

### kitesurf — REFUSAL WITHDRAWN. The container framing is exactly right

From the upstream README:

```
docker run --rm -p 127.0.0.1:8787:8787 ghcr.io/cloudflare/kitesurf
```

- Ships a **prebuilt image** (`ghcr.io/cloudflare/kitesurf`), no Cloudflare
  account, runs on `workerd` without Node.
- Exposes **Chrome DevTools Protocol endpoints**, usable by Playwright /
  Puppeteer CDP clients.
- `KITESURF_PORT` (default 8787) and `KITESURF_NATIVE_EVAL` are env knobs.
- Starts in under a second.

**My earlier reasoning was wrong in a specific, checkable way.** I said
`createBrowserHarnessApp` already covers this. It does not: that adapter is a
**2.6 KB detector** that runs `--doctor` on a CLI. It discovers a browser tool;
it *is not a browser engine*. So "kitesurf duplicates it" was false.

What kitesurf actually offers is a **stateless, disposable browser backend** —
one container, one CDP endpoint, no Chrome install, no VNC. That is a genuine
capability we do not have.

**Why it is still not first.** DataFlow just taught the lesson: transport alone
is not a feature. Wiring kitesurf means (a) a `ManagedApp` adapter that
discovers `127.0.0.1:8787`, (b) a CDP client in the desktop, (c) a decision about
what the agent may do with a browser, and (d) the sandboxing the upstream README
explicitly disclaims. Step (d) is the honest blocker: *"not a hardened
sandbox"* means the isolation is ours to provide, and a CDP endpoint on loopback
that executes page JS is a local-code-execution surface.

**Verdict: ADOPT as a container-attached tool, gated behind explicit operator
enablement.** Not a runtime lane, not a default. It is the strongest of the four.

### astryx — still refused, and the container framing does not help

astryx is a **design system** (31,963 stars, TypeScript, "fully customizable and
agent ready"). It is a component library, not a service. Running it in a
container would produce… a container serving component code to a renderer that
cannot import it across a process boundary.

The 70-custom-property count stands as the cost measure. But there is one thing
worth taking that I dismissed too fast: **"agent ready"** is a real claim, and if
astryx ships a machine-readable component schema, that is *exactly* the
JSON→component registry A2UI needs. Worth reading before writing A2UI from
scratch.

**Verdict: still not adopted as a design system. Its agent-facing schema is
worth reading as an input to the A2UI decision.**

### A2UI — refusal softened; the right scope is now visible

My reason was that `AgentMarkdown.tsx` already renders GFM tables. That is true
and it answers the *table* case. But you have argued the broader point
correctly: the product's chat surface renders only prose and markdown, so an
agent cannot present anything interactive.

The honest scope, if adopted, is narrow and cheap:

- **One** validated block type first — a table with columns/rows/alignment —
  rendered by a new small component that reuses existing table CSS.
- Validation against a schema, rejecting anything outside it.
- No free-form component tree, no model-authored HTML, no Jev classifier.

That is a `remark`-plugin-scale change, not a subsystem, **provided it starts
with one block type**. The subsystem risk was mine to create by scoping it as
"interactive JSON trees" rather than "a table the agent can emit reliably."

**Verdict: ADOPT-able, at one block type, reusing the existing table styles.**

### univer — refusal stands, but the path is now clear if you want it

univer's blocker is not engineering, it is licensing: `.xlsx`/`.docx` I/O is a
**paid package**. The open core gives snapshots and a formula engine.

Two honest paths, neither of which I should pick for you:

1. **Read-only viewer**, open core only — render `.xlsx` *if already converted*,
   never claim import/export. Cheap, genuinely useful, no licence question.
2. **Full editing** — requires the paid package. A commercial decision, not mine.

Either way it must arrive as a **tool card**, never as the `navigation.office`
nav surface that `Layout.test.tsx:192,305` pins absent.

**Verdict: univer waits on a licence decision. Path 1 is available today.**

## What I recommend, in order

1. **kitesurf as an opt-in container tool** — the framing you proposed is
   correct and my refusal was based on a factual error. Start with discovery +
   a `ManagedApp` card; wire CDP only after deciding the sandbox question.
2. **A2UI, one block type** — small, reuses table styles, read astryx's agent
   schema first in case it already defines the shape.
3. **univer read-only** — only if someone needs spreadsheet *viewing*.
4. **astryx as a design system** — do not adopt.

## What would change this plan

One operator using the current build. Every item above is still ranked on
inferred value; a real request would replace the inference.


One operator using v2.10.82 or the container stack, reporting what is missing. If
that report names spreadsheets, generative UI, or browser automation, the
corresponding item moves from "refused" to "next" — with a real requirement
behind it instead of a verdict table.

---

# V2.10.84 — live runtime verification (supersedes inferred verdicts above)

This section records what was actually **installed and run on this machine**,
not what was inferred from docs. Where it disagrees with anything higher in this
file, this section wins.

## The Raven port was wrong, and so was the surface

The tree pinned Raven to `RAVEN_DEFAULT_PORT = 8855` and described it as an
"OpenAI-compatible chat gateway". Both claims were false:

| Check | Result |
|---|---|
| `grep 8855` across the raven 0.2.8 wheel (1,059 py files) | **0 matches** |
| `git log --all -S"8855"` across Raven's full history | only an embedding **float** (`-0.018855`), never a port |
| `raven serve --help` | options are `--port` (default **18792**) and `--open` only |
| Raven port defaults found in the wheel | **18792** (`ws.py`), 18790, 18795 |
| `GET 127.0.0.1:8855/health` on a live install | `ECONNREFUSED` |
| `GET 127.0.0.1:18792/health` on a live install | `200` `{"ok": true, "service": "raven-serve", ...}` |
| `GET :18792/v1/models`, `/v1/chat/completions` | **404** (no such routes) |
| `GET :18792/rpc` | `401` — the real API is a WebSocket RPC |

So Raven is **not** a `/v1/chat/completions` lane. It is a WebSocket-RPC
gateway (`turn.send`, 263 methods in `rpc-schema/openrpc.json`) with an HTTP
control plane of `/health`, `/auth`, `/rpc`, and the file/knowledge viewers.

**Fixed:** `RAVEN_DEFAULT_PORT` → 18792; the `/health` matcher now accepts
`raven-serve` (the live body puts a space after the colon, which an exact-slice
match missed); the catalog note, preset hint, registry summary, harness header,
`platform-core`, both `AGENTS.md` tables and the Welcome form default are all
corrected. Two tests that pinned the false premise were corrected, and a third
was added that fails on the old matcher and passes on the new one.

## Live gateway status, measured

| Lane | Port | Health | Chat round-trip |
|---|---|---|---|
| Hermes | 8642 | **PASS** 200, 21 ms | gateway live |
| IronClaw 1.4.1 | 3231 | **PASS** 200, 50 ms | **blocked by host VRAM** |
| OpenClaw 2026.11.6 | 18789 | **PASS** 200 | **PASS** — `POST /v1/chat/completions` → `PONG` |
| Raven 0.2.8 | 18792 | **PASS** 200 (`raven-serve`) | n/a — no `/v1` surface exists |

### OpenClaw needed one non-obvious toggle

The gateway runs fine but serves `404` on `/v1/models` until
`gateway.http.endpoints.chatCompletions.enabled = true` (default `false`).
It also rejects `model: "<any-model>"` — the gateway accepts only `openclaw`
or `openclaw/<agentId>`, and routes to whatever `agents.defaults.model` names.
That is why "gateway is up but desktop can't attach" happens.

### IronClaw's 503 is the host, not the code

`POST /v1/chat/completions` returns `503 service_unavailable`, and
`GET /v1/models` returns `200` with a full model list. The turn runner's ollama
call fails with, from ollama's own log:

```
requested context size too large for model   num_ctx=8192 n_ctx_train=2048
llama-server terminated  error="exit status 1"
cudaMalloc failed: out of memory   (ROCm0 buffer 25180674816 bytes)
```

The host GPU is an **AMD Radeon 8060S iGPU with 4 GB**. Every non-cloud model
in the local ollama store is 6.1–23.7 GB, so nothing local fits; cloud models
work (they proxy upstream) but IronClaw's vision-projector startup path still
exits. This is a hardware ceiling, not an IronClaw or Cubecloud defect. It will
work unchanged on a host with adequate VRAM, or once IronClaw is pointed at a
cloud provider key.

## New gate

`scripts/runtime-gateways.smoke.cjs` covers the two lanes that had **no**
operator-side check — which is exactly how the Raven port stayed wrong for
months. It asserts OpenClaw's `/v1/models` OpenAI shape and Raven's
`raven-serve` marker, and it fails when pointed at 8855 (proven both ways).
