# External Harness & Protocol Adoption Plan — eight verified repositories

> **Date:** 2026-11-21
> **Status:** ANALYSIS + DESIGN. No code changes in this document; every claim
> about a source repo is verified against `gh api` at the commit noted below.
> **Predecessor:** [`2026-08-12-external-repo-adoption-plan.md`](./2026-08-12-external-repo-adoption-plan.md)
> (openworker / qm / skills-bundle-kit → P1–P10). That plan is **landed**
> (`packages/platform-core/src/{harness,provider-router,tool-policy,compaction,
> run-queue,subagent,memory-service}.ts` + `agent-desktop/src/main/harnesses/`).
> This document is the next pass: it asks which *new* external surfaces belong
> in the Agentic OS, and — more often — which ones must be refused.
> **Audience:** maintainer deciding what to build next.

---

## 0. Executive summary

Eight repositories were proposed for integration. All eight exist and all were
read at source level. The important result is not the list of what we can add —
it is that **only one of the eight is a runtime we should attach to**, and two
are things the product must explicitly refuse.

| # | Repo | Licence | What it actually is | Verdict |
|---|---|---|---|---|
| 1 | `deepseek-ai/deepseek-harness` | MIT | Agent harness, everything-is-a-plugin (Cordis). Ships `web`, `headless`, `sdk`, `sdk-minimal`, `acp` profiles **and its own Electron desktop**. | **ADOPT** — 5th runtime lane via `stdio` JSON-RPC |
| 2 | `ag-ui-protocol/ag-ui` | MIT | Frozen 1.0 event protocol (31 event types) for agent→UI streaming. POST+SSE. | **ADOPT** — as the chat wire protocol |
| 3 | `CopilotKit/OpenIntelligentUI` | MIT | Reference app showing A2UI (JSON component tree) vs OGU (sandboxed HTML/JS). Routes via a third-party classifier (Jev). | **ADOPT the A2UI idea**, reject OGU + Jev |
| 4 | `OpenDCAI/DataFlow-WebUI` | Apache-2.0 | Data-pipeline harness exposing exactly 20 MCP tools over **SSE** at `:8000/mcp`, plus a Vue 3 DAG canvas. | **ADOPT** via MCP — needs a new SSE transport |
| 5 | `omnara-ai/omnara` | Apache-2.0 | Self-hostable managed-agent **control plane** (Go + Postgres + Valkey + RustFS). Competing product category. | **DO NOT ADOPT** as runtime; borrow 2 ideas |
| 6 | `dream-num/univer` | Apache-2.0 core, **proprietary** exchange | Office SDK. Snapshots + formula engine are open; **`.xlsx`/`.docx` I/O is a paid package**. | **CONDITIONAL** — MCP tool only, never a nav surface |
| 7 | `cloudflare/kitesurf` | Apache-2.0 | Browser engine on `workerd`, CDP-compatible. Local Docker works account-free. | **CONDITIONAL** — opt-in backend, must be sandboxed by us |
| 8 | `meta/astryx` | MIT | 150+ component design system. Themes *are* CSS custom properties. | **SELECTIVE** — tokens only; no markup migration |

**Three findings that change the plan, all verified:**

1. **`navigation.office` is a tombstone, not a placeholder.** The key exists in
   all 8 locale files, but there has never been an Office screen in this repo
   (initial fork lineage `cubecloud-desktop/`), and
   [`Layout.test.tsx:180,302`](../../agent-desktop/src/renderer/src/screens/Layout/Layout.test.tsx)
   asserts it must **not** render. Univer must therefore arrive as a *tool*,
   not as the "Office" nav item those keys were hoping for.
2. **Our `HarnessTurnDelta` is a near-exact subset of AG-UI.** `text`,
   `reasoning`, `tool_call`, `tool_result`, `usage`, `done`
   ([`harness.ts`](../../packages/platform-core/src/harness.ts)) map 1:1 onto
   `TEXT_MESSAGE_*`, `REASONING_MESSAGE_*`, `TOOL_CALL_*`/`TOOL_CALL_RESULT`,
   `STEP_FINISHED`, `RUN_FINISHED`. We are already 80% AG-UI-shaped internally.
   **Built in Phase 0 — see §3.**
3. **Omnara is not a runtime; it is our competitor.** It is a control plane that
   *hosts* agents on machines via an outbound daemon (`omnarad`). Attaching to it
   would make the Agentic OS a *client of another control plane* — the exact
   inversion of our positioning. Two of its ideas are worth stealing regardless.

### 0.1 A third perspective: is the OS still a desktop shell?

The first draft of this document judged each repo against the four seams and
refused whatever did not fit. That is circular: the seams were themselves derived
from the original Hermes-desktop shape. Three facts say the shape has moved
further than the seams admit:

1. **`fabric-attach` is the default, not the exception.** The AI Workspace adapter
   is `mode: "fabric-attach"` — "container era" in its own header — and four of
   the sixteen managed apps are fabric. The desktop is already one peer talking to
   containerised services, not the owner of local processes.
2. **The seams exist but are under-used.** `HarnessTransport` already models
   `stdio`, `subprocess` and `in-process`; only `http` is used. `ManagedAppCapability`
   already models `governance`; the adapters barely use it. The architecture is
   more general than the code exercising it.
3. **`HarnessTurnDelta` was designed protocol-shaped by accident.** It is one
   `RUN_STARTED` away from AG-UI — the sign of an agent-stream abstraction, not a
   chat-panel abstraction.

**Revised posture: the OS is a multi-surface operating layer in which the desktop
is the operator console.** That changes three verdicts and confirms two:

| Repo | First-draft verdict | Revised verdict | Why it moved |
|---|---|---|---|
| `ag-ui` | adapter at the edge | **the spine, edge-exposed** | If several surfaces must render the same run, one event model is a requirement, not a nicety. Phase 0 built it. |
| `omnara` | refuse | **refuse the control plane, adopt the event-log model** | Multi-surface means runs must be readable after the surface that started them closes. Omnara's `sequence`-ordered, resumable timeline is the right storage contract; its hosted daemon is not. |
| `deepseek-harness` | 5th lane | **5th lane, gated on the routing fix** | Confirmed, but the work is in `hermes.ts` streaming, not in a new adapter. |
| `OpenIntelligentUI` | A2UI only | **A2UI only** (unchanged) | A validated component tree is surface-agnostic; OGU's sandbox and a hosted router are not. |
| `kitesurf` | opt-in | **opt-in** (unchanged) | Its own docs forbid the untrusted-page case that multi-surface would want it for. |
| `univer` / `astryx` / `DataFlow` | tool / tokens / MCP | **unchanged** | None of them is affected by the surface question. |

What this does **not** license is adopting Omnara wholesale. A desktop-first,
sovereign product that hands its run store to another control plane has traded
away the thing it sells. The line is: **adopt the data contract, keep the
execution local.**

---

## 1. Where each one plugs into *our* architecture

The OS has four extension seams. Every integration must use one of them; nothing
gets a bespoke path.

| Seam | File | What it accepts |
|---|---|---|
| **S1 Harness** | [`packages/platform-core/src/harness.ts`](../../packages/platform-core/src/harness.ts) + [`harnesses/registry.ts`](../../agent-desktop/src/main/harnesses/registry.ts) | A chat runtime implementing `runTurn → AsyncIterable<HarnessTurnDelta>`, with `transport: "http" \| "stdio" \| "subprocess" \| "in-process"` |
| **S2 ManagedApp** | [`managed-apps/contract.ts`](../../agent-desktop/src/main/managed-apps/contract.ts) | `discover / health / inventory / lifecycle / configSchema / governance`, `mode: "local-spawn" \| "fabric-attach"` |
| **S3 MCP** | [`installer.ts` `addMcpServer()`](../../agent-desktop/src/main/installer.ts) | `{ name, type: "http" \| "stdio", enabled, detail }` — **needs `sse` added** |
| **S4 Renderer** | [`screens/Layout/Layout.tsx`](../../agent-desktop/src/renderer/src/screens/Layout/Layout.tsx) | A `View` in the sidebar + a screen component; `navigation.*` keys |

**Rule that follows from the contract docs:** if an integration cannot express
itself through S1–S4, it does not belong in the product. That rule is what
rejects Omnara, and what demotes Univer to a tool.

### 1.1 "cubecloud-agent app or docker container runtime" — how each mode is served

The user's framing (`desktop surface ↔ cubecloud-agent app ↔ docker container`)
maps onto machinery that already exists:

- **Desktop-attached runtime** → S1. `RuntimeConnectionMode` already includes
  `embedded-local | local-gateway | remote-gateway | ssh-tunnel | docker-gateway
  | migration-import` ([`runtime-orchestration.ts`](../../agent-desktop/src/shared/runtime-orchestration.ts)).
- **Docker container runtime** → `discoverDockerRuntimes()`
  ([`docker-runtimes.ts`](../../agent-desktop/src/main/docker-runtimes.ts)) scans
  `docker ps`, matches container keywords, and derives `endpointUrl`/`healthUrl`.
  New runtimes are added as a `DockerRuntimeTarget`
  (`{ kind, name, keywords, preferredPorts, healthPath }`) **plus** a
  `RuntimeProviderId` union member — not as a new discovery mechanism.
- **The AI Workspace (`cubecloud-agent`, `:6767`)** → already an S2 ManagedApp
  (`createWorkspaceApp()`) with a supervisor, probe, and governance relay.

So "work with the cubecloud-agent app or Docker container" is **not** a new
subsystem. It is: add a union member, add a docker target, add a harness. The
rest of this document fills in which of those three applies per repo.

---

## 2. Per-repository deep dive and decision

### 2.1 `deepseek-ai/deepseek-harness` — the one real runtime

**Verified facts.** MIT, TypeScript, `master`, ~285k stars. Built on
[Cordis](https://github.com/cordiverse/cordis): *"plugins contribute services,
typed events, and reversible effects to a shared context. Every part of the
product is a plugin, including the model adapter, the tool registry, the session
log, and the agent loop itself"* (`docs/architecture.md`). A running `dsh` is a
plugin tree composed from ordered **profiles** (`web`, `headless`, `sdk`,
`sdk-minimal`, `acp`) which stack **bundles**; layers are patched by
`cordis.patch.yml` and `--patch` overlays. `dsh --profile web --dump-config`
prints the tree and *"any row it prints can be replaced by a patch of your own."*

The relevant profile for us is **`sdk`**: `packages/bundle/sdk-app/README.md`
describes *"SDK stdio application… Stdout is reserved for newline-delimited
JSON-RPC frames"*, mounting `dsh-sdk-jsonrpc-server`. It also ships **its own
Electron desktop** (`apps/desktop`, `apps/desktop-host`, `apps/desktop-publisher`).

**Why it fits S1.** `HarnessTransport` already contains `"stdio"`
([`harness.ts`](../../packages/platform-core/src/harness.ts)), and
`HarnessTurnDelta` already carries `text | reasoning | tool_call | tool_result |
usage | done`. A `dsh` SDK session is a subprocess emitting NDJSON JSON-RPC
frames — the adapter is a JSON-RPC frame decoder plus a delta mapper. No new
transport, no new union member beyond `RuntimeProviderId`.

**What it would take.**

1. `RuntimeProviderId` gains `"deepseek-harness"`; `RuntimeProviderDefinition`
   entry with `role: "primary-runtime"`, `connectionModes: ["embedded-local",
   "local-gateway", "docker-gateway"]`, `canDiscoverLocalCli: true`.
2. `agent-desktop/src/main/harnesses/deepseek-harness.ts` implementing `Harness`:
   spawn `npx @deepseek-ai/dsh --profile sdk`, write JSON-RPC `initialize`, then
   map frames → `HarnessTurnDelta`.
3. `createStubHarness` in the registry is **not** used for it — unlike
   ironclaw/openclaw, this gets a real adapter or nothing.
4. A `DockerRuntimeTarget` entry so `discoverDockerRuntimes()` can find a
   containerised `dsh` (keywords `dsh`, `deepseek-harness`; health `/health`).
5. Docs + i18n: one new `navigation`-adjacent label is *not* needed — it appears
   in the **Welcome runtime picker**, which reads `RuntimeProviderDefinition`.

**Refuse.** Do not adopt their Cordis plugin model, their desktop shell, or
their HMR. We take the *process* and the *protocol*, not the framework.

**Risk.** The repo states it is in *"developer preview… THERE WILL BE
COMPATIBILITY-BREAKING CHANGES"*, and `SAFETY.md` must be read before running it.
Pin the version; treat frame-shape drift as a CI-visible adapter test.

---

### 2.2 `ag-ui-protocol/ag-ui` — the protocol we should actually speak

**Verified facts.** MIT. Spec 1.0 is **frozen** and mechanically pinned
(`spec/1.0/schema.json`, 94,359 bytes, `$id: https://ag-ui.com/spec/1.0/schema.json`;
a `proto-freeze.txt` digest list plus conformance fixtures). **31 event types**,
grouped: runs/steps (`RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`,
`STEP_STARTED`, `STEP_FINISHED`), text (`TEXT_MESSAGE_START/CONTENT/END/CHUNK`),
tool calls (`TOOL_CALL_START/ARGS/END/CHUNK/RESULT`), reasoning
(`REASONING_START`, `REASONING_MESSAGE_*`, `REASONING_END`,
`REASONING_ENCRYPTED_VALUE`), state (`STATE_SNAPSHOT`, `STATE_DELTA`,
`MESSAGES_SNAPSHOT`), activity (`ACTIVITY_SNAPSHOT`, `ACTIVITY_DELTA`),
subagents (`SUBAGENT_STARTED/FINISHED/ERROR`), passthrough (`RAW`, `CUSTOM`).

**Transport is POST + SSE, not WebSocket and not `EventSource`.** The reference
TS client is `fetch` + `ReadableStream.getReader()`, deliberately *not*
`EventSource` (no POST, no resumption). The server floor is three things: a POST
handler, `data: {json}\n\n` per event, and `Content-Type: text/event-stream`.

**Normative gotcha worth encoding in a test:** optional fields with no value MUST
be omitted, never sent as `null`. Naive emitters break strict clients.

**Human-in-the-loop is terminal-state, not mid-stream.** A run *ends* saying what
it waits for: `RUN_FINISHED.outcome = {type:"interrupt", interrupts:[{id, reason,
expiresAt?, responseSchema?}]}`. The next run carries
`resume: [{interruptId, status:"resolved"|"cancelled", payload}]`. **Omission is
not abandonment** — the consumer must send a complete resume list or the run is
rejected. This maps *exactly* onto our
[`approval/inbox.ts`](../../agent-desktop/src/main/approval/inbox.ts) model
(`pending → approved|denied|timeout`) and our preflight-gate work.

**Why this is the highest-leverage item in the document.** We already have:

- `sse-parser.ts` (OpenAI-shaped `choices[0].delta`) — needs an AG-UI dialect.
- `HarnessTurnDelta` — isomorphic to a subset of the event model.
- A deferred-resolution approval inbox — isomorphic to `interrupt`/`resume`.
- An agent registry with tool calls and results.

Adopting AG-UI means **one adapter at the chat boundary** turns every S1 harness
into something *any* AG-UI client can render — including future mobile/TUI
surfaces — and lets us consume third-party AG-UI agents without bespoke wiring.

**What it would take.**

1. `packages/platform-core/src/ag-ui.ts`: `HarnessTurnDelta` ⇄ AG-UI event
   encoder/decoder. Pure functions, no transport.
2. `sse-parser.ts` gains a dialect selector (`"openai" | "ag-ui"`).
3. `approval/inbox.ts` gains `toInterrupt()` / `fromResume()` so the inbox can
   serve AG-UI consumers and our own dialog from one source of truth.
4. Conformance: vendor the frozen `schema.json` + the fixture set, assert
   round-trip in tests. This is the cheapest possible way to stay honest.

**Refuse.** Do not adopt CopilotKit's React runtime, and do not make AG-UI the
*internal* transport between main and renderer. Electron IPC stays IPC; AG-UI is
the **edge** protocol for external consumers/producers.

---

### 2.3 `CopilotKit/OpenIntelligentUI` — take A2UI, leave the rest

**Verified facts.** MIT. Frontend is Next + React + CopilotKit; backend is
Python ≥3.12. Two *different* generative-UI mechanisms:

- **A2UI** — the agent emits a **JSON component tree** constrained to a registered
  catalog (`createCatalog`, Zod props, e.g. a `Table` with ≤12 columns / ≤200 rows,
  mandatory provenance line). Rendered as real semantic HTML.
- **OGU** — the agent calls `generateSandboxedUi` with streamed **HTML/CSS/JS**
  string arguments; CopilotKit middleware converts the tool call into
  `ACTIVITY_SNAPSHOT` + `ACTIVITY_DELTA` (RFC 6902 patches), rendered in a
  cross-origin sandboxed iframe (~50–4000 px, Idiomorph morph-diff).

Routing between text / native / generated UI is decided by a **third-party hosted
classifier** (Jev / `api.typesafe.ai`). Failure policy is *fail-loud*: auth error,
invalid choice, or timeout all raise — *"there is no silent fallback claiming that
Jev made a decision."*

**Decision: adopt A2UI's discipline, reject the other two halves.**

- **A2UI fits us precisely** because it is a *constrained, validated, declarative*
  payload — the renderer owns the components, the agent only fills them. It maps
  onto our `HarnessTurnDelta.tool_call` (the tree arrives as tool args) with no
  new event type: we already have `ACTIVITY_*` in AG-UI if we later want live
  deltas.
- **OGU is refused.** It executes agent-authored HTML/CSS/JS. Our whole posture is
  sovereign/local-first; adding an execution surface for model-authored code —
  in a renderer that also holds operator credentials — is not a trade we should
  make. The sandbox mitigations are real, but they protect a boundary we would
  rather not create.
- **Jev is refused.** A hosted classifier would put *every routing decision* behind
  a third-party API, breaking offline use. We already have a local decision layer
  in this repo — Laya (`laya-probe.ts`, `laya-middlewares.ts`,
  `decision-triage.ts`) — which is the honest substitute.

**What it would take (small).** A `catalog` concept in the renderer: a registry of
`{ id, propsSchema, component }` with a whitelist. First member: a `Table`
component (we have data-table styling already). The agent gets one injected tool
`render_ui` whose args are validated against the catalog. That is it — no OGU
sandbox, no hosted router.

---

### 2.4 `OpenDCAI/DataFlow-WebUI` — a real MCP surface, and a real gap in our S3

**Verified facts.** Apache-2.0, Python. Three independently installable layers
(`webui` / `harness` / `skills`). MCP is derived from FastAPI routes via
`fastapi-mcp==0.4.0` and **whitelisted** — exactly **20 tools** — mounted at
**`/mcp` on port 8000**, transport **SSE**:

```json
{ "mcpServers": { "dataflow": { "type": "sse", "url": "http://localhost:8000/mcp" } } }
```

Tools cover the pipeline lifecycle (`list_pipelines`, `create_pipeline`,
`update_pipeline`, `execute_pipeline`, `execute_pipeline_async`,
`get_execution_status`, `get_task_result`), operators (`list_operators`,
`list_operator_categories`, `recommend_operator_categories`,
`get_operator_detail_by_name`), datasets (`list_datasets`,
`get_dataset_columns`, `get_dataset_preview`, `register_dataset`), serving, plus
`validate_pipeline_config` and `render_pipeline_in_editor` (the last pushes a
`{"type":"sync_pipeline"}` payload over WebSocket to the browser canvas).

The whitelist is deliberate and CI-enforced (`check_mcp_whitelist.py`): *"MCP
tools are a whitelist, not 'every route'… renaming one silently removes a tool
from every agent."*

**The gap this exposes in us.** `addMcpServer()` accepts
`type: "http" | "stdio"` only
([`installer.ts`](../../agent-desktop/src/main/installer.ts)). DataFlow — and any
other `fastapi-mcp` host — speaks **SSE**. Without an `sse` transport, this
integration is impossible through our supported path, and users would be forced
to hand-edit `config.yaml`.

**What it would take.**

1. Widen `addMcpServer` to `type: "http" | "stdio" | "sse"` and teach the MCP
   client the SSE handshake. This is a small, general capability win — it is not
   DataFlow-specific.
2. `ManagedApp` adapter (`managed-apps/`) with `mode: "local-spawn"` for the
   `harness` profile (no canvas, no Node needed) and `"fabric-attach"` when the
   operator runs it in a container. Capabilities: `inventory` (pipelines,
   datasets), `lifecycle` (start/stop the server), *no* `config` (its config is
   env vars), *no* `governance`.
3. **Never embed the Vue canvas.** It is Vue 3 + `@vue-flow/core`; our renderer
   is React. The canvas is the *app's* surface. If an operator wants it, it opens
   in the operator's browser, exactly like the AI Workspace SPA.
4. Do **not** install `open-dataflow` for them. It pins `open-dataflow==1.0.10`
   and pulls ~104 transitive deps including `torch`, `transformers`, `vllm`,
   `pyarrow==20.0.0`. `discover()` must report "not installed" with the
   operator's own install hint — the same honesty rule the managed-app contract
   was written for.

**Security note that must be surfaced in the UI.** Their docs state plainly: no
authentication at all, default bind `0.0.0.0:8000`, and *"pipeline execution runs
Python via Ray, so it is arbitrary code execution by design."* Our adapter must
recommend `DATAFLOW_HOST=127.0.0.1` and render that warning on the card. This is
the same class as the IronClaw WASM-vs-host warning already in our registry.

---

### 2.5 `omnara-ai/omnara` — refused, with two ideas kept

**Verified facts.** Apache-2.0, Go backend + TS SDK. Self-hosts as a full stack
(`valkey`, `postgres`, `rustfs`, gateway, worker, web). Its own words: *"the
open-source, self-hostable alternative to Claude Managed Agents and OpenAI's
Agents API."* Agents are **event logs in the control plane**; *"the machine does
not own the agent… machines are execution environments they can attach and
release."* Machines run a daemon, `omnarad`, that connects **outbound** — no
inbound ports, no SSH keys. Config is `agent.yaml`
(`version`, `instruction`, `model.provider_config` + `.name`, `tools`,
`machine_sources: [{machine_pool_name} | {machine_id}]`, `secrets`).

**Why we refuse it as a runtime.** Attaching would make the Agentic OS a *client*
of a competing control plane. It also inverts our topology: Omnara requires a
server-side control plane plus an outbound daemon on the machine; we are
desktop-first with the agent runtime on the operator's own box. Everything it
does well (event-log agents, machine pools, secrets) we either already do
(SQLite sessions, local runtimes) or deliberately do not do (cloud machine pools).

**Two ideas worth borrowing — both cheap, both local:**

1. **Machine-as-attachable-resource.** Our `DockerRuntimeCandidate` already models
   this. The idea worth taking is the *state vocabulary*: Omnara separates
   `lifecycle_state` from connection state, so "provisioning" never masquerades as
   "unreachable". Our `ManagedAppDiscovery.state` has three values
   (`found | not-found | auth-required`); adding a `provisioning` value would let
   the UI stop showing a scary error while a container is still coming up.
2. **Explicit `machine_sources` declaration.** `agent.yaml` names *where* the agent
   may run. Our `RuntimeProviderCapabilities` is similar but implies it. A
   first-class "this session may use these runtimes/machines" field is a
   governance improvement, and it composes with our approval inbox.

**Refuse:** the daemon, the control plane, the OpenAPI event-log model as our
system of record, the machine pools.

---

### 2.6 `dream-num/univer` — tool only, and only the open half

**Verified facts.** Apache-2.0 for `@univerjs/{core,sheets,docs,engine-formula,
engine-render,rpc,rpc-node,network,protocol,ui,design,themes,preset-*}`. Headless
in Node is real — the repo's own test bootstraps `new Univer({locale, locales})`
→ `registerPlugin(UniverSheetsPlugin)` → `FUniver.newAPI(univer)` with **no DOM,
no UI plugin, no renderer** (`tests/formula-integration/src/__testing__/univer.ts`).

**But `.xlsx`/`.docx` import/export is NOT open source.** A full-tree scan finds
zero exchange packages; conversion lives in `@univerjs-pro/exchange-*`, npm
`license: "Univer Office SDK Licensing"` (`exchange-client`, `sheets-exchange-client`,
`exchange-node` + a native `exchange-node-binding`). Their README: *"Commercial
Web SDK plugins, Server SDK, and AI SDK capabilities beyond the open-source
foundation are distributed and licensed separately. **Freemium** evaluation
includes watermarks and feature limits."* No MCP server exists in the OSS repo
(0 hits across 10,124 paths).

**Decision: conditional and narrow.** The only defensible integration is
`formula`-engine / snapshot manipulation behind a **tool**, never a product
surface:

- We already convert Office → Markdown read-only via the `markitdown` path
  ([`converters.ts`](../../agent-desktop/src/main/converters.ts)). That needs no
  licence.
- If a *write* path is ever required, the honest options are (a) buy the exchange
  licence, or (b) shell out to an operator-installed converter. Either way it is
  an **operator-gated tool**, not a bundled dependency.
- **Do not add a nav item.** `navigation.office` is a dead key; the tests forbid
  it. A working Univer surface would need a *different, justified* nav entry
  (`navigation.formulas`?) and its own ManagedApp adapter — which is not worth it
  for a formula playground.

**Refuse:** bundling `@univerjs-pro/*`, the collaboration server (not published at
all), and any "AI office" framing — we are not shipping an office suite.

---

### 2.7 `cloudflare/kitesurf` — genuinely sovereign, genuinely unsafe by default

**Verified facts.** Apache-2.0. Runs HTML/CSS/JS and screenshots **without Chrome**
on `workerd`; speaks **CDP**. Two constraints, both in the README, applying to
different things:

- **Deploying to Cloudflare** needs a Workers **Paid plan** (Dynamic Workers).
- **Running locally/in Docker does not.** `docker run --rm -p 127.0.0.1:8787:8787
  ghcr.io/cloudflare/kitesurf` serves CDP on `:8787` with no account, no telemetry,
  and works on a disconnected machine if the image is pre-pulled.

**The blocking caveat, in their words:** *"Do not open untrusted sites with a local
Kitesurf. This includes the Docker image. Locally, Kitesurf runs page JavaScript in
`workerd`, which is not a hardened sandbox."* Per-page isolation is real (each
`Page.navigate` loads a fresh `PageScript` worker and kills the previous one), but
that is hygiene against cross-page state, **not a security boundary against hostile
content**.

**Implementation reality.** 16 CDP domains implemented, 33 explicitly not. The
agent automation core loop is covered — `Page.navigate`, `Runtime.evaluate`,
`DOM.querySelector`, `Input.dispatchMouseEvent/KeyEvent`, `Page.captureScreenshot`,
`Network.*`, `Accessibility.getFullAXTree`. Missing: tracing, service workers,
WebAuthn, IndexedDB, media, DevTools exotica. Version `0.0.1`; the repo calls itself
experimental and auto-closes PRs from unvouched contributors.

**Screenshot gotcha to encode:** on internal error it returns a **1×1 transparent
PNG plus an `error` string** rather than throwing. Any "did the screenshot work"
check must test for `error` or the tiny-PNG sentinel.

**Decision: opt-in, and only inside a sandbox we own.** Our existing
`browser-harness` ManagedApp ([`browser-harness.ts`](../../agent-desktop/src/main/browser-harness.ts))
already handles discovery/doctor for a CDP browser. Kitesurf becomes an
**alternative backend** for that adapter, selected by an operator setting, with
these hard rules:

1. Default **off**. Never enabled by a model or by an auto-discovery scan.
2. Only reachable via `127.0.0.1` — the adapter refuses non-loopback URLs.
3. If it must render untrusted pages, it runs in a container the operator
   constrains (no host network, read-only rootfs) **and** the UI says, verbatim,
   that the engine is not a sandbox.
4. Treat as `capabilities: ["inventory"]` only — lifecycle start/stop, no config,
   no governance.

**Why not now.** The value is "screenshot a page without Chrome". We already have
a CDP path to a real browser. Adding a 0.0.1 engine with a self-declared
"sandboxed by you, not by us" posture is a **Phase 3** item, only if operators ask.

---

### 2.8 `meta/astryx` — tokens yes, markup no

**Verified facts.** MIT. React 19+, StyleX-authored but *consumed* as CSS
custom properties scoped with `@scope` + `data-astryx-theme`, in layers
`reset, astryx-base, astryx-theme`. Theme packages emit `theme.css`; the neutral
palette is generated from an `oklch` recipe (`palette.config.json`). 150+ components.
Ships a **stdio MCP server** and an `astryx init` that writes an agent guide into
`AGENTS.md`/`CLAUDE.md` — the "agent ready" claim is real and unusually well done.

**Two costs that decide it.** (a) You must install `@stylexjs/stylex` even with
zero StyleX code. (b) Adoption is a **layout-model migration**: their agent rules
say *"No `<div>` — components handle all layout and spacing"*, i.e. every
`<div style={{display:'flex'}}>` becomes `<HStack gap={3}>`. That is a re-skin of
29 screens, not a dependency add.

**Their tokens overlap ours but mean different things.** We use `--bg-primary`,
`--text-primary`, `--accent`
([`main.css`](../../agent-desktop/src/renderer/src/assets/main.css)); Astryx uses
`--color-text-primary`, `--spacing-*`, `--radius-*`. Adopting their names silently
shifts colours because the semantics differ.

**Decision: selective, and probably not now.**

- **Worth taking:** their *token taxonomy* (`--color-*` / `--spacing-*` /
  `--radius-*` with `light-dark()`), which would let us ship dark mode without a
  hand-maintained second palette. We can copy the *naming scheme* without taking
  the dependency.
- **Worth taking:** the `astryx init` idea — writing agent-facing component rules
  into `AGENTS.md`. We already have `design-taste-frontend` and the brand pack;
  formalising a component manifest for agents is a good, cheap idea.
- **Refusing:** the 29-screen `div` → `Stack` migration and the StyleX runtime
  dep. Our brand system is bespoke and already token-based.
- **Hard requirement if ever adopted:** our Electron shell must declare
  `color-scheme: light dark` itself — Astryx deliberately does not emit it, and
  dark mode degrades silently without it. (We are on Electron 39, Chromium ≫ 125,
  so there is no *browser* blocker.)

---

## 3. The plan

Ordered by leverage ÷ effort, with the gate that proves each step.

### Phase 0 — Protocol spine (no new runtime, ships alone)

| # | Task | Seam | Verify |
|---|---|---|---|
| 0.1 | `packages/platform-core/src/ag-ui.ts`: `HarnessTurnDelta` ⇄ AG-UI encoder/decoder, pure functions | S1 boundary | unit tests round-trip every delta kind; omit-null rule asserted |
| 0.2 | `sse-parser.ts` dialect selector `"openai" \| "ag-ui"` | S4 | existing OpenAI tests stay green; new AG-UI fixtures parse |
| 0.3 | `approval/inbox.ts`: `toInterrupt()` / `fromResume()` | S1 | a pending approval survives export→import as an AG-UI interrupt; incomplete resume is rejected |
| 0.4 | Vendor frozen `schema.json` + conformance fixtures; CI asserts they are unchanged | — | checksum test fails if the vendored spec drifts |

Phase 0 has **zero user-visible change** and unlocks everything else. It also
gives us a defensible answer to "do you speak AG-UI?" — yes, at the edge.

**STATUS (2026-11-21): 0.1 and 0.3's mapping helpers are IMPLEMENTED.**

- `packages/platform-core/src/ag-ui.ts` ships the codec: 27 event types,
  `createAgUiEncoder` (delta → events, with correct START/CONTENT/END
  bracketing and the omit-never-null rule), `decodeAgUiEvent` (events →
  delta / interrupt / error), plus `approvalToInterrupt`, `resumeToVerdict`
  and `validateResumeCoverage` for the inbox mapping.
- Exported from `packages/platform-core/src/index.ts`.
- 20 tests in `packages/platform-core/tests/ag-ui.test.ts`.
- 0.2 (SSE dialect selector) is **deferred**: the renderer never parses SSE
  itself — main process does via `sse-parser.ts` — so the AG-UI dialect
  belongs next to whatever first *consumes* an external AG-UI stream. Building
  it now would be speculative.
- 0.4 (vendor + checksum the frozen schema) is **deferred** until a consumer
  exists; pinning a spec we do not yet parse end-to-end buys nothing.

### Phase 1 — A fifth runtime lane

| # | Task | Seam | Verify |
|---|---|---|---|
| 1.1 | `RuntimeProviderId` += `"deepseek-harness"`; definition entry; Welcome picker shows it | S1 | snapshot test on the provider registry; i18n key in all 8 locales |
| 1.2 | `harnesses/deepseek-harness.ts`: spawn `dsh --profile sdk`, JSON-RPC framing → deltas | S1 | adapter test against recorded NDJSON frames (no network) |
| 1.3 | `DockerRuntimeTarget` for a containerised `dsh` | S2 | `discoverDockerRuntimes()` finds a fixture container row |
| 1.4 | Version pin + a "developer preview" badge in the UI | S4 | badge renders from a capability flag, not a hard-coded string |

**Blocker found while implementing Phase 0 (this is the real work in Phase 1):**
chat does **not** stream through the harness router. `createHarnessRegistry()`
is wired only into `createBeforeModelChain` — i.e. the harness is consulted for
pre-model *policy*, then `hermes.ts` streams from `/v1/chat/completions`

**STATUS (2026-11-21): 1.1, 1.2 and the blocker are IMPLEMENTED.**

The blocker was real and is closed by `573c12f`: `harness-chat.ts` drives
`router.runTurn(...)` and adapts the delta stream onto `ChatCallbacks`, and
`HarnessAdapterProfile` gained `supportsTurnExecution` so stub runtimes stay on
the HTTP path instead of failing at the user.

With that in place the lane itself landed:

- **`dsh-jsonrpc-client.ts`** — a line-framed JSON-RPC 2.0 client over stdio,
  written against the verified upstream contract (`packages/sdk/protocol`):
  one message per `\n`, malformed lines ignored, `id`+`method` = request,
  `id` alone = response, `method` alone = notification; methods `initialize`,
  `session/prompt`, `session/query`, `session/resume`, `session/wait`,
  `shutdown`; server notifications `session.event` and `session.status`.
  stderr is drained so the pipe cannot deadlock the child, and every pending
  request rejects on transport loss rather than hanging.
- **`harnesses/deepseek-harness.ts`** — the adapter. Turns are genuinely
  streaming: the reply arrives as `session.event` notifications and each
  `assistant/message` carries the exact timed model stream
  (`text-chunks` batches and `text-delta` chunks), which maps to `text`;
  `reasoning-chunks` maps to `reasoning`; `tool/call` and `tool/result` map to
  the tool deltas; `turn/end` closes the turn.
- **`RuntimeProviderId`** += `"deepseek-harness"`; catalog entry with
  `exposesChatGateway: false` (honest: dsh has no HTTP gateway — all six
  `chat/completions` hits upstream are *outbound* LLM clients),
  `onboardingSurface: "settings"`, `integrationStatus: "optional"`; a
  `DockerRuntimeTarget` so a container match is reported rather than ignored;
  `runtime-registry.ts` case that probes for the `dsh` binary and explains
  stdio-over-child-process in its detail text.
- Registry wires the adapter as the fifth lane.

**9 tests** in `tests/deepseek-harness.test.ts` drive a **real child process**
(`tests/fixtures/dsh-fixture-runtime.cjs`) speaking the actual wire protocol —
not a fetch mock, because dsh never uses HTTP. They cover text batching,
reasoning separation, tool call/result, usage, and the cannot-start fallback.

**Not done: 1.4's UI badge.** The developer-preview status is recorded in the
catalog `notes` and the registry `detail`, which the Settings screen renders;
a dedicated badge is cosmetic on top of that.

### Phase 1.5 — Real-runtime verification (2026-11-22)

The fixture-based tests passed while the adapter was **broken against the real
runtime**. Running `@deepseek-ai/dsh@0.2.2-rc.5` directly found five defects that
a self-authored fixture structurally cannot catch:

| # | Defect | How it surfaced |
|---|---|---|
| 1 | `initialize` requires `cwd`, `provider`, `model` | Real runtime: `"paths[0]" must be of type string. Received undefined` |
| 2 | Only `deepseek-account` is registered in the default `sdk` profile | `no adapter registered for provider "deepseek-api-key"` |
| 3 | `deepseek-chat` is not in the advertised catalog | Catalog is `deepseek-flash` / `deepseek-v4-pro` |
| 4 | A provider failure emits **no text** — a `finish` chunk with `reason.kind: 'error'` inside `assistant/attempt`, then `turn/end` `'error'` | First real run reported `ACCOUNT_SIGN_IN_REQUIRED` as a clean, empty turn |
| 5 | Sessions persist in `$DSH_HOME/storages/sessions/<id>.json` | Reusing an id: `session "<id>" already exists` |

All five are fixed. Two structural consequences:

- **`HarnessTurnDelta` gained an `error` variant.** Without it an adapter could
  only end a failed turn silently, which reads to the operator as "the model
  said nothing". The AG-UI codec maps it to `RUN_ERROR`.
- **`dsh-jsonrpc-client.ts` fails fast on non-JSON stdout** instead of waiting
  out a 30s timeout. The serving contract says stdout carries only frames, so a
  non-frame means the deployment composed a stdout logger — bounded failure, not
  a hang.

`scripts/dsh-real-smoke.cjs` makes this repeatable. It runs two paths against the
real runtime, needs no credentials, and skips with exit 0 when the package is
absent (so it can sit in the local audit ladder but never in required CI):

- **failure path** — `deepseek-account` without sign-in must surface
  `ACCOUNT_SIGN_IN_REQUIRED`, not a false success;
- **success path** — `deepseek-official` pointed at a local Messages-shaped fake
  via `DEEPSEEK_BASE_URL` must stream text, report usage, and close with a
  session id.

Both pass. The provider is configurable (`runtime.dsh_provider`,
`runtime.dsh_model`, `runtime.dsh_profile`) because the right adapter depends on
how the operator's deployment is composed.

**Profile decision — measured, not assumed.** The open question from §6 was
"sdk or sdk-minimal?". Running both against the real runtime answered it:

| Profile | Registered provider | Tools | Turn |
|---|---|---|---|
| `sdk` | `deepseek-account` (browser sign-in) | **31** | completes |
| `sdk-minimal` | `deepseek-official` (API key) | **3** | completes |
| **`sdk` + api-key patch** | `deepseek-account` **and** `deepseek-official` | **31** | completes |

`sdk-minimal` drops `read`/`edit`/`glob`/`grep`/`bash`/`todo`/`subagent`/`skill`
— unusable as a coding agent. The account provider needs an interactive
browser sign-in, which a desktop chat surface cannot perform mid-turn.

So the default is **`sdk` plus a one-row patch** that mounts
`dsh-llm-deepseek-api-key`, giving 31 tools *and* a non-interactive auth path.
`ensureApiKeyProviderMounted()` applies it idempotently and preserves any
existing operator rows; it is skipped when `runtime.dsh_provider` is pinned.
Verified end to end: a run with no pre-existing patch file produced a streaming
turn with all 31 tools.

### Phase 1.6 — Local-first correction (2026-11-22)

**The Phase 1.5 default was wrong for this product.** Mounting
`deepseek-official` made the lane work by adding a *cloud* dependency to a
runtime whose whole point here is that it is local-first and offline-capable.
The operator's objection was correct, and the fix is architectural.

The right seam was already upstream. `dsh-llm-pi-ai` routes "model requests to
multiple pi-ai providers, **OpenAI-compatible gateways, or self-hosted
servers** from one configuration". Its `providers:` dictionary takes a route
name and needs only `api: openai-completions` plus a `baseURL` — which is
exactly an Ollama / LM Studio / llama.cpp / vLLM endpoint.

| Was | Now |
|---|---|
| Default route `deepseek-official` (cloud, API key) | Default route `ollama` at `127.0.0.1:11434/v1` |
| `DEEPSEEK_API_KEY` required | No credential; loopback only |
| Provider baked into the adapter | Route composed from config, operator-editable |
| Nothing verified the endpoint existed | `probeLocalLlm()` reports reachable + model catalog |

Three defects found by running this against the real runtime:

1. **pi-ai refuses a route with no credential at all** — `No API key for
   provider: <route>` (code `PI_AI_ERROR`), before any request. Its
   OpenAI-compatible provider "still insists on a key or an `Authorization`
   header of its own". Local servers ignore the header, so each local route
   gets an `apiKeyEnv` holding a fixed placeholder. Not a secret, not egress.
2. **The route's `api:` dictates the wire format.** An `openai-completions`
   route fed an Anthropic-Messages-shaped stream fails with "Stream ended
   without finish_reason". The smoke's fake now emits `chat.completion.chunk`
   frames plus `[DONE]`, which is also what Ollama emits.
3. **A `cordis.patch.yml` row for the same plugin id must be replaced, not
   appended** — two `llm-pi-ai` rows make the composed tree ambiguous.

`scripts/dsh-real-smoke.cjs` now runs **both** paths loopback-only: a dead port
(must surface the connection error) and a live OpenAI-compatible server (must
stream, report usage, keep ≥20 tools). Both pass with no cloud host, no
credential, and 30 tools intact.

**API keys are a later step, not a prerequisite.** The Settings screen exposes
Base URL + Model id with a Test-connection button; a hosted route is added
through the same fields when the operator wants one. Nothing on the default
path needs a key.
directly (`hermes.ts:1462`). Adding a `stdio`-transport harness therefore
requires routing `runTurn` through the chat path, which is a larger change than
"add a union member". Sequence 1.2 *before* 1.1.

### Phase 2 — MCP transport parity

| # | Task | Seam | Verify |
|---|---|---|---|
| 2.1 | `addMcpServer` accepts `"sse"`; client implements the SSE handshake | S3 | a fixture SSE server exposes tools; list/add/enable cycle passes |
| 2.2 | DataFlow `ManagedApp` adapter (`local-spawn` + `fabric-attach`) | S2 | contract tests: 20 tools enumerated, "not installed" is honest, loopback warning present |
| 2.3 | Render the "no auth / arbitrary code execution" warning on the card | S4 | snapshot contains the warning text |

**STATUS (2026-11-21): IMPLEMENTED — registration, client dialect, and probe.**

**Correction to the first commit's claim.** I wrote that `sse` registration was
"the registration half only" and that the client handshake was outstanding. That
was wrong in a more important way than I realised: **the desktop has no outbound
MCP client at all.** `addMcpServer` writes `mcp_servers:` into the profile's
`config.yaml` and the *runtime* (Hermes et al.) makes the connection. The only
JSON-RPC in this repo is `headroom-mcp-server.ts`, which **serves** MCP to the
runtime at `127.0.0.1:8788`; nothing here **consumes** an MCP server.

So "registration half" understated the situation twice: there was no second
half, and adding `sse` to a writer with no reader meant a user could register a
server that silently never worked.

What now exists:

- `McpServerType` = `"http" | "stdio" | "sse"`; `sse` written as an explicit
  `type:` and read back explicitly (older configs still infer from shape).
  `validateMcpDetail` requires an http(s) URL for both remote transports, and
  `addMcpServer` rejects a transport it does not know. 4 tests.
- **`mcp-probe.ts`** — a bounded, never-throwing handshake probe:
  - `normalizeMcpEndpoint` accepts loopback `http` and remote `https`, rejects
    everything else (mirrors `normalizeWeknoraBaseUrl`'s security floor).
  - Streamable HTTP: `initialize` → `tools/list`, accepting a bare JSON body or
    an SSE-framed one.
  - Legacy SSE: open the stream, require the `endpoint` event, and report
    reachable-but-unverified when the dialect differs rather than claiming
    success.
  - `stdio` returns "the runtime spawns it" instead of faking a health check.
  - New `probe-mcp-server` IPC channel + preload method; the MCP screen gains a
    per-row **Verify** button and an inline result line.
  - 18 tests, including a mocked full handshake, an SSE-framed body, a
    handshake rejection, and an unreachable host.
- **`sse-parser.ts` gained the AG-UI dialect** (`SseDialect = "openai" |
  "ag-ui"`). This was Phase 0.2, deferred earlier for lack of a consumer — the
  probe is that consumer's sibling, and the dialect is needed the moment we
  point at an AG-UI producer. `TEXT_MESSAGE_CONTENT` → `onChunk`,
  `TOOL_CALL_START` → `onToolProgress`, `RUN_ERROR` → `onError`, and a terminal
  `interrupt` outcome is surfaced to the caller instead of being mistaken for a
  clean finish. The default stays `"openai"`, so no existing caller changed.

**Still not done, and now honestly scoped:** the probe verifies that a server
answers and lists tools. It does not invoke tools, and it does not make the
desktop a general MCP client — the runtime still owns that connection. Making
the desktop a client would be a product decision (two clients competing for the
same server), not a gap to close quietly.

### Phase 2.5 — Skills actually reach the model

This was not in the first draft of this plan because the gap was invisible from
the outside: `skills-progressive.ts` shipped in `219f664` and **nothing called
it**. The {{SKILLS_TOTAL}} bundled skills reached the runtime only as files the installer had
copied to `<profileHome>/skills/`; the progressive-disclosure catalog — the
mechanism with the ~80% context saving — was dead code.

Fixing that exposed a second, deeper gap. The frontmatter parser read every
scalar with the character class `[^"'\n]+`, which excludes quotes from the
middle of a value. 25 of the {{SKILLS_TOTAL}} skills embed quoted trigger phrases:

```
description: Use when writing code. Triggers: "TDD this", "red-green".
```

so the match failed and those skills came back with an **empty description** —
present in the catalog by name, invisible to the model. Measured against the
real parser before the fix: **22 of {{SKILLS_TOTAL}}** had both fields.

| # | Task | Seam | Verify |
|---|---|---|---|
| 2.5.1 | `createSkillsCatalogMiddleware` in `chat-middleware.ts` | S1 | catalog injected; body only when named; degrades on error |
| 2.5.2 | Wire it into `createBeforeModelChain` behind `options.skills` | S1 | chain omits it entirely when unconfigured |
| 2.5.3 | `skillsInjectionOptions()` in `hermes.ts` builds the catalog from `listInstalledSkills` + `listBundledSkills` | S1 | installed copy wins over bundled on name collision |
| 2.5.4 | Fix `parseSkillFrontmatter` to read YAML scalars properly | S1 | all {{SKILLS_TOTAL}} skills yield name **and** description |

**STATUS (2026-11-21): IMPLEMENTED — all four.**

- `createSkillsCatalogMiddleware(buildCatalog, describeBody)` — injects
  `name — description` for every skill, appends a full SKILL.md body only when
  the latest user turn names that skill, preserves any existing system prompt,
  and returns `applied: false` with a reason label on empty/error rather than
  breaking the chat path. 6 tests.
- `hermes.ts` supplies the data: installed skills first (operator's copy wins),
  bundled second, bodies stripped of YAML frontmatter since the catalog already
  carries name and description.
- `parseSkillFrontmatter` now reads plain, double-quoted and single-quoted
  scalars via `readFrontmatterScalar`, including escaped quotes and ` #`
  comments. 8 tests, one of which walks `.agents/skills/` and asserts every
  bundled skill yields both fields — the regression guard for the whole class.
- **Still open:** the runtime also reads `<profileHome>/skills/` off disk, so
  the catalog is additive today. Removing the on-disk duplication is a separate
  change and should wait until we know whether non-Hermes harnesses ever read
  that directory.

**Decision (2026-11-21): keep the on-disk copy; the catalog is additive by
design, not by accident.**

`skills.ts` copies each skill into `<profileHome>/skills/<category>/<name>/`
(`"Copy to the profile skills directory"`). That is *Hermes's* delivery
mechanism — the runtime discovers skills from disk, and our copy is what puts
them there. Deleting the copy and relying on the catalog alone would leave the
runtime blind, because the catalog is a *system prompt* injection, not a file
system.

So the two paths do different jobs and both are required:

| Path | Who reads it | What it does |
|---|---|---|
| `<profileHome>/skills/**` | the runtime (Hermes) | lets the runtime load and execute a skill |
| the catalog middleware | the model | tells the model that a skill exists, ~50 tokens each |

Removing the duplication would mean teaching the runtime to accept skills over
IPC instead of disk — a runtime change we do not control. Until a non-Hermes
harness asks for that, the copy stays. The open question is therefore closed as
**resolved, not deferred.**

### Phase 3 — Conditional / opt-in (only on operator demand)

| # | Task | Seam | Notes |
|---|---|---|---|
| 3.1 | A2UI catalog + one `render_ui` tool (Table first) | S1/S4 | validated against a whitelist; **no** OGU, **no** hosted router |
| 3.2 | Kitesurf as an alternative `browser-harness` backend | S2 | default off, loopback-only, 1×1-PNG error sentinel handled |
| 3.3 | Astryx token taxonomy port (names only, no package) | S4 | dark mode via `light-dark()`; `color-scheme` declared by us |

---

## 4. What NOT to adopt

| Concept | Source | Why not |
|---|---|---|
| Omnara control plane / `omnarad` daemon | omnara | Makes us a client of a competing control plane; inverts desktop-first topology. **The event-log contract is adopted instead — see §0.1.** |
| Omnara `agent.yaml` as our config format | omnara | We have `desktop.json` + profile `config.yaml`; a third format is churn |
| OGU (sandboxed HTML/JS from the model) | OpenIntelligentUI | Executes model-authored code in a credentialed shell; our posture forbids it |
| Jev / hosted visualization router | OpenIntelligentUI | Breaks offline; we have Laya locally |
| Univer `@univerjs-pro/*` | univer | Proprietary licence, watermarks in freemium, native binding |
| Univer as an "Office" nav surface | univer | `navigation.office` is a dead key and a test forbids rendering it |
| DataFlow's Vue 3 canvas embed | DataFlow-WebUI | Framework mismatch; it is the app's surface, opened in a browser |
| Installing `open-dataflow` for the operator | DataFlow-WebUI | ~104 transitive deps incl. torch/vllm; pinning is theirs to own |
| Kitesurf on by default | kitesurf | Self-declared "not a hardened sandbox"; must be operator-opted |
| Astryx full markup migration | astryx | 29-screen `div`→`Stack` re-skin + StyleX runtime dep |
| DeepSeek Cordis plugin framework | deepseek-harness | We take the process and protocol, not the framework |
| Cloudflare Workers deployment of Kitesurf | kitesurf | Requires a paid plan; contradicts sovereign/offline |

---

## 5. Verification gates (unchanged from the predecessor plan)

1. `npm run typecheck --workspace cubecloud-agent-desktop`
2. `npm run test --workspace cubecloud-agent-desktop` — `Test Files > 0`, `Tests > 0`
3. `npm run build:win --workspace cubecloud-agent-desktop`
4. `npm run verify:bundle --workspace cubecloud-agent-desktop`
5. No new import cycles
6. i18n: new keys in `en` + `zh-CN` natively, six locales English-fallback, all
   registered in `src/shared/i18n/index.ts` under **all eight** locale blocks
   (see [`README.i18n.md`](../../README.i18n.md) and
   `tests/i18n-renderer-keys.test.ts`)

---

## 6. Open questions for the maintainer

1. **Is a fifth runtime lane wanted at all?** The runtime picker already lists four
   (Hermes default, IronClaw, OpenClaw optional, Raven optional). DeepSeek Harness
   is the strongest candidate but adds a *developer-preview* dependency to the
   critical path of chat. Phase 1 could be deferred indefinitely and the OS would
   lose nothing it currently promises.
2. **AG-UI at the edge only, or also as the main↔renderer transport?** This
   document argues edge-only. The counter-argument is that one protocol everywhere
   is simpler to reason about — but it would discard Electron IPC's structured
   clone and its existing type safety.
3. **Is Phase 3.1 (A2UI) worth a tool at all?** It is the only generative-UI idea
   that survives our security posture, but "the agent can render a validated table"
   may not be worth the catalog machinery versus simply returning Markdown.
4. **Kitesurf:** does any operator actually need Chrome-free screenshots, or is the
   existing CDP path sufficient? Absent a yes, 3.2 should stay unwritten.

---

## 7. Provenance of these claims

All facts above were read from source, not from summaries:

- `deepseek-ai/deepseek-harness` — `docs/architecture.md`,
  `packages/bundle/sdk-app/README.md`, `packages/` + `apps/` trees.
- `ag-ui-protocol/ag-ui` — `spec/1.0/schema.json`, `spec/1.0/proto-freeze.txt`,
  `docs/spec/1.0/**`, `sdks/typescript/**`.
- `CopilotKit/OpenIntelligentUI` — `apps/app/package.json`,
  `apps/app/src/components/generative-ui/**`, `docs/visualization-routing.md`.
- `OpenDCAI/DataFlow-WebUI` — `backend/app/mcp_server.py`, `.mcp.json`,
  `frontend/package.json`, `docs/architecture/overview.md`.
- `omnara-ai/omnara` — `compose.yaml`, `docs/events/streaming.mdx`,
  `docs/machines/overview.mdx`, `docs/agents/configuration.mdx`.
- `dream-num/univer` — root `package.json`, `packages/` tree, `README.md`
  commercial section, npm `license` fields.
- `cloudflare/kitesurf` — `README.md`, `AGENTS.md`, `CONTRIBUTING.md`,
  `packages/engine/src/cdp/dispatch.ts`.
- `meta/astryx` — `packages/themes/neutral/{package.json,palette.config.json}`,
  `packages/core/src/reset.css`, CLI `agent-docs.mjs`.

Anything not in that list — in particular the exact JSON-RPC frame schema of
`dsh --profile sdk`, and the full `agent.yaml` field table — is **partially
verified** and must be re-checked at implementation time.
