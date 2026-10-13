# Deep-Research Replan — Voice De-duplication · Governance Bench · Decision-Model Core (D1–D3)

> **Date:** 2026-10-07
> **Status:** RESEARCH + REPLAN. Extends the coordination matrix (`2026-10-06-workspace-agentic-os-coordination-matrix.md`) and the Part-I plan. Adds decision items **D1–D3** with phased adoption. No implementation in this pass.
> **Method:** GitHub research on all four external candidates + local surface inventory of the desktop's voice IPC, middleware chain, and persistence surfaces. All claims cite files/paths.

---

## 0. Operator directives (this session)

1. **Drop the voice function in Agentic OS** — AI Workspace already has the voice pipeline; don't duplicate.
2. **Design the governance bench** — how the console persistently maintains long memories, the "2nd brain" DB vault, graphs, gateways, and tools.
3. **Evaluate a decision-model layer in the Agentic OS core** — candidates: **Laya**, **Jev-Mem**, plus third-party context/knowledge integrations **OpenViking** and **WeKnora**.

---

## D1 — Drop the desktop voice function (de-duplication)

### D1.1 What exists today (inventory, exact)

| Surface | Files | IPC channels (main) | Verdict |
|---|---|---|---|
| Cloud STT | `src/main/voice-stt.ts` (Groq primary, OpenAI Whisper fallback) | `voice-transcribe` | **REMOVE** with D1 |
| TTS | `src/main/voice-tts.ts` (OpenAI `tts-1`, 4096-char cap) | `voice-synthesize` | **REMOVE** with D1 |
| Handy local STT | `src/main/handy-stt.ts` | `handy-detect`, `handy-toggle`, `handy-cancel` | **KEEP** but demote (below) |
| Composer mic button | `screens/Chat/ChatInput.tsx` | — | swap to "Open AI Workspace" affordance (P2) |
| Message speaker button | `screens/Chat/MessageRow.tsx` | — | remove when `voice-synthesize` goes |

### D1.2 The decision

- **AI Workspace voice = the only conversational voice stack** (browser Silero VAD → whisper/qwen3-asr STT → Hermes LLM → Edge/Qwen3-TTS with playback-ownership). Its proxy endpoints (`/v1/audio/transcriptions`, `/v1/audio/speech*`) are already exposed on :6767 and covered by contract row F.
- The desktop's Groq/OpenAI STT + tts-1 stack duplicates that pipeline with a **worse** one (no playback ownership, paid cloud APIs, no streaming VAD). Deprecate.

### D1.3 What "drop" means concretely (three tiers)

1. **Deprecate now (code stays, UI gone):** hide mic + speaker buttons in Chat; keep IPC channels functional for one release (zero-risk reversibility). Mark `voice-stt.ts`/`voice-tts.ts` headers with a `@deprecated` note pointing to workspace voice (row F).
2. **Sticky local exception (Handy only):** `handy-stt` stays — it is *not* a cloud voice stack; it is the local-first dictation paste path (no audio over IPC). Two ways to keep it coherent under the de-duplication rule: (a) keep it as the *always* offline dictation lane, or (b) demote it behind Settings. **Recommended: (a) keep visible**, labelled "Dictation (local) — or use AI Workspace voice".
3. **Physical removal** (delete `voice-stt.ts`/`voice-tts.ts`, `voice-*` IPC, UI) — only after P2's embed is live and workspace voice confirmed working in the desktop context. One release later, per the per-phase docs rule.

### D1.4 What this changes in the contract

- Row F (`voice policy handoff`) is **promoted from optional to default-on when attached**: when the workspace is reachable, desktop voice affordances route to the workspace voice or disappear; when not attached, only Handy dictation remains.
- The desktop's Voice status panel (if any) collapses into a one-line pointer to the AI Workspace card's voice row.
- **Kill-criteria check (CEO rule from Part-I §7):** with voice dropped from the desktop, the desktop-side user-facing value must come from governance + control surfaces — which is exactly the console thesis. This strengthens, not weakens, the product story.

---

## D2 — The governance bench: persistent long memory, 2nd-brain vault, graphs, gateways, tools

The operator's question: how does the console's *own* institutional memory stay persistent and evolve, alongside (not fused with) the workspace's?

### D2.1 The bench as a registry of registries

The console already has the components; D2's job is to make them a **coherent bench** with lifecycle + persistence + observability, not to add a new store. The boundary table from the coordination matrix §4.4 stands unchanged — D2 only adds *lifecycle and governance duties over them*:

| Bench component | What it is today | Persistence today | Governance duty to add (D2) |
|---|---|---|---|
| **Long memory (agent memory)** | EverOS tool surface (`everos.ts` + sidecar + screen) — a third-party tool surface per operator decision | its own backend, operator-run | health card + "list as distinct surface" (exists) — no fusion |
| **2nd brain (personal KB)** | gbrain probe + screen | user-level notes/life-events | keep as-is; surface bench-row only |
| **Code knowledge graphs** | CodeGraph + Codebase Memory (CMM, Cypher) | own stores | register in bench inventory |
| **Knowledge retrieval** | *(new in this replan)* WeKnora or OpenViking as optional bench members | their own servers | see D3.4 |
| **Gateways** | Hermes 8642 / IronClaw 3231 / OpenClaw 18789 / Raven 8855 + workspace :6767 | runtime-managed | lanes list + workspace card (exists) |
| **Tools / MCP** | Tools screen + MCP registry + approval gate | `~/.hermes` config | approval relay (row G / P6) |
| **Vault** | desktop vault for credentials | OS-level secret store | stays single-writer (§5.3) |
| **Schedules** | schedules screen + cronjobs | files | unchanged |

### D2.2 The persistence contract (what makes it a *bench*, not scattered panels)

Three mechanisms consolidate the experience without creating a new store:

1. **Bench snapshot file** — a single operator-readable JSON (`<hermes-home>/bench.json`) capturing *pointers + health*, not content: which memory surfaces are configured, which gateways are running, which tools are gated, vault provider type. Written by the console, versioned like `desktop.json`. This is the "persistently maintained" affordance for humans and for future agent-run governance sweeps.
2. **Bench screen section** — Tools or a new "Bench" nav entry rendering the snapshot + one health row per surface (reuses existing probe family — every probe module already exists).
3. **Governance sweep (agent-run, scheduled)** — the skills bundle kit already ships SkillOpt-Sleep (nightly staged proposals) and `knowledge-ops`. D2 adds a *governance* analog: a scheduled job that walks the bench snapshot, probes each bench member, and files findings into the existing schedules/retro surfaces — no writes to the workspace, no config rewrites (single-writer rule).

### D2.3 What D2 deliberately does NOT do

- No new vector DB, no new memory backend, no consolidation of memory surfaces (doctrine: boundaries, not a monolith).
- Memory *content* stays owned by each surface; the bench only sees health + inventory + policy.

---

## D3 — Decision-model layer in the Agentic OS core

### D3.1 Research findings on the four candidates

**Laya** (`NandhaKishorM/laya`, Python, MIT-style) — a local, on-device **System-1 decision engine**: single transformer forward pass (~33 ms GPU / ~200 ms CPU) answering **typed** questions — `choice` (finite labels), `score` (ordinal), `noul` (calibrated binary P(true)) — with per-field confidence and **abstention gating** (`min_confidence` → `null` values). Not a text generator; no hallucination class. Integration surfaces verified:
- **MCP stdio server** (`pip install "laya[mcp]"` → `laya-mcp-server`): tools `laya_predict`, `laya_predict_batch`, `laya_route`, `laya_route_batch`, `laya_decide` (JSON-schema → typed values), `laya_shortlist`, `laya_preset` (email/guard/moderation/triage/model_router), `laya_status`.
- **HTTP server** (`laya-serve`, FastAPI): OpenAI-style request body on `/v1/systemone`; `LAYA_API_KEY` bearer; remote-mode MCP clients need no torch.
- Framework adapters (LangChain/LlamaIndex/CrewAI). Checkpoints: `english`, `multilingual`, `typed-decisions` (HF `convaiinnovations/laya`).

**Jev-Mem** (`libingzheren/Jev-Mem`, Python, MIT, arXiv 2609.23986) — "**System-One Controlled Agentic Memory**": a memory system where a typed decision controller (`jev` API via TypeSafe, or **local Laya** — `decision_backend: "jev" | "laya" | "laya-mlx"`) governs memory *admission* (write policy), *relation inference*, *query routing* (which graph views to search), *budget allocation*, *candidate scoring*, and *stopping*; a System-2 LLM only synthesizes the final answer from retrieved evidence. Storage: local **Temporal Resonance Graph** (NetworkX graph.json) + FAISS/Numpy vectors + keyword — **fully local files**, `JevMemSystem` / `MemoryBuilder` / `QueryEngine` public API, `jev-mem` CLI, `jev-mem build/query` ops. LoCoMo: 0.777 overall (+11% over MAGMA), 6.6× faster build than fastest baseline, −36.7% query latency.

**OpenViking** (`volcengine/OpenViking`, Python + Rust, **AGPL-3.0 core** / Apache-2.0 CLI+examples) — "*The Context Database for AI Agents*": organizes all agent context as a **`viking://` virtual filesystem** (resources, memories, skills, sessions) with L0/L1/L2 tiered reading (`.abstract.md`/`.overview.md`/full), semantic retrieval, session management with **memory extraction on commit**, memory extraction→compilation pipeline (`ov compile`), ships **VikingBot** (its own multi-channel agent) and a **Context Gateway** (hosted model proxy). Default local port **1933**. Integration surfaces verified: **MCP Streamable HTTP at `/mcp`** (`openviking_*` tools: find/search/read/list/tree/grep/glob/write/edit/remember/forget/health ~15 tools), **REST** `/api/v1/search/{recall,search}`, `/api/v1/sessions[…]`, `/api/v1/content/read`, Python SDK `openviking-sdk`, `ov` CLI, Agent-Plugins-1.0 package (stdio MCP proxy + skills). **License care: AGPL-3.0 core — the appliance already AGPL-compatible (dual AGPL-3.0-or-later), but vendoring into MIT paths is forbidden; interop-only (sidecar).** Already-relevant precedent: it ships first-class plugins for Hermes, OpenClaw, Codex, OpenCode, and more — i.e. it plugs into our runtime lanes' neighborhoods natively.

**WeKnora** (`Tencent/WeKnora`, Go + Vue + Python docreader, MIT) — enterprise **RAG knowledge platform**: document ingestion (PDF/Word/web/URL), chunk/embed/rerank pipelines, hybrid search (vector+keyword), **built-in MCP server** (`/mcp/<endpoint_id>` Streamable HTTP per space, plus a legacy Python MCP package `weknora-mcp-server`), rich REST `/api/v1` (knowledge-bases, knowledge, chunks, sessions, `knowledge-chat` RAG Q&A, `agent-chat` ReAct agentic pipeline, wiki pages), `weknora` CLI with `mcp serve`, tenants/RBAC, wiki auto-generation. Backends: pgvector/ES, optional GraphRAG. **License care: MIT — clean.**

### D3.2 What each candidate is FOR in the desktop (fit matrix)

| Candidate | Layer it could serve | Fit | Why / why not |
|---|---|---|---|
| **Laya** | **Decision/eval model layer** (System-1) for the console core | **STRONG** — adopt (D3.3, phase DM1) | Local-first, no tokens, 33 ms, typed + abstention — exactly what governance approvals, skill triage, prompt-guard, and routing middleware need. MCP stdio drops into the existing MCP surface with zero new infra. Not a memory, not a chat lane. |
| **Jev-Mem** | **Memory-ops layer** (decision-controlled memory) | **CONDITIONAL — watch/phase DM2** | The concept (typed decisions govern memory write/admit/retrieve/stop) is the correct upgrade *for a future desktop memory evolution loop*. But it is batch/benchmark-shaped (offline pipeline), a research pre-release `0.1.0`, requires its own graph+vector files; and per operator doctrine the console's memory surfaces are already distinct third-party surfaces. Adopt later as: a *desktop-side* memory-evolution engine behind one screen, never as a shared tier with the workspace. |
| **OpenViking** | **Context database / 2nd-brain DB-vault layer** | **STRONG as OPTIONAL tool surface** (row R5 candidate) | It is literally an agent context DB (knowledge+memory+skills in one browsable `viking://` FS) with MCP — a perfect *bench member* (D2 table). But: AGPL core (sidecar-only, never vendored), and it overlaps the bench's existing memory surfaces. Adopt as an **optional third-party tool surface** exactly like EverOS/gbrain — a card + probe + config, listed as a distinct surface. |
| **WeKnora** | **Knowledge/RAG retrieval layer** | **STRONG as OPTIONAL tool surface + skills kit integration** (row R6 candidate) | MIT, mature, clean REST+MCP. Two integration points: (a) as a bench tool surface (probe + card + MCP endpoint in the desktop's MCP registry); (b) as the **skills bundle kit's retrieval back-end**: kit skills' knowledge lookups (`weknora_search`/`read_document` tools) give skills grounded citations. Its `agent-chat` ReAct mode is NOT a desktop lane (it would duplicate the workspace/chat contract) — restrict to retrieval usage. |

### D3.3 The decision-model adoption plan (Laya → console core)

The console's hot path needs cheap typed decisions in at least five places. Laya is the first candidate because it is drop-in (MCP stdio + optional local HTTP) and sovereignty-compliant (local checkpoints).

Five decision slots (each maps to an existing console surface):

| # | Decision slot | Today | With Laya (typed + confidence) |
|---|---|---|---|
| 1 | **Approval gating** (P6/row G governance relay) | binary human-approval inbox | pre-screen: `noul` P("this action needs human review") with `min_confidence` abstain → only low-confidence/high-stakes reach the human inbox |
| 2 | **Prompt firewall / guard** (before_model middleware slot, `chat-middleware.ts` slot family) | — | `laya_preset(guard/moderation)` screening user input pre-LLM; abstain → pass through (fail-open by config) |
| 3 | **Runtime routing hints** | heuristic runtime routing middleware | `laya_route/model_router` classing turn → lane/task type (advisory only; policy stays config-owned) |
| 4 | **Skill triage / staging** (skills bundle kit SkillOpt proposals) | LLM-judged | `laya_decide` on "should this staged skill be promoted?" enums with confidence → staging queue ordering |
| 5 | **Session/voice turn-taking** (post-D1, workspace voice) | workspace-owned | (out of scope for the console; record as workspace-side future) |

Phasing (DAG-safe, additive):
- **DM0 (spike):** install `pip install "laya[mcp]"`, wire `laya-mcp-server` into the desktop MCP config behind a Settings toggle; `laya_status` card row. Verify: MCP tools list renders; typed decision round-trip in dev harness.
- **DM1 (slot 2+3):** two new before_model middlewares `layaGuard` (fail-open) + runtime routing hint; unit tests with a stub client (mocked transport), no checkpoint in CI.
- **DM2 (slot 1+4):** approval pre-screening + skill-staging triage, both behind Settings toggles; audit events into the existing decision-log (`decisions.jsonl` convention from Jev-Mem adopted as our own audit shape).
- **DM3 (Jev-Mem evaluation gate):** only when a concrete desktop memory-evolution requirement lands; evaluation = offline LoCoMo-style harness on our own transcripts; **never** wired to the workspace.

### D3.4 Third-party integration rows (new contract rows)

| # | Integration | Desktop treatment | Boundary rules |
|---|---|---|---|
| **R5** | **OpenViking** (optional tool surface) | new probe module + Tools card + config screen (mirrors gbrain/everos family); optional MCP endpoint (`openviking` server) in the desktop MCP registry; optional context-gateway | **Sidecar/interop only (AGPL-3.0 core — never vendored into MIT paths; NOTICE + provenance row added when first shipped).** Local-only default (`127.0.0.1:1933`); **NOT** a shared tier with the workspace; memory-surface boundary registry lists it explicitly |
| **R6** | **WeKnora** (optional tool surface + kit retrieval) | new probe module + Tools card; built-in MCP endpoint → desktop MCP registry; skills-bundle-kit tools (`weknora_search`, `read_document`) for kit-authored skills | MIT — vendoring permissible per NOTICE paths, but prefer sidecar; retrieval-only on the console side (no `agent-chat` lane); single-writer: WeKnora owns its own data |
| — | **Jev-Mem** | watchlist (DM3 gate above) | never a workspace dependency (operator doctrine: no shared memory tier) |
| **R7** | **Laya** (decision model) | MCP stdio via existing MCP plumbing + optional `laya-serve` local HTTP; DM0–DM2 slots above; typed audit log under `<hermes-home>/` | local-first (CPU default, GPU optional); abstention defaults ON in governance slots; never a chat lane |

### D3.5 Anti-duplication doctrine (updated, includes D1)

1. Voice: workspace-owned (D1). 
2. Chat: two surfaces, different populations (operator lane-console vs product chat), never proxied across.
3. Memory: distinct surfaces per §4.4 boundaries + OpenViking (if adopted) added as another *distinct* surface — the bench lists, never fuses.
4. Decision-making: console-side System-1 (Laya) is for **console governance decisions**, not for workspace chat turns (workspace keeps its own brain = Hermes LLM path).

---

## 8. Revised DAG (delta only)

```
P0 → {P0.5, P1} → P2 → P3(+R1) → P4(R2+R3) → P5 → P6
                    │
                    └─ D1 (voice de-dup) ships WITH P2 (UI swaps) + one release later (physical removal)
D2 (bench) → snapshot file + bench section ride P3's surfaces; governance sweep rides P5's schedules
D3 → DM0 (Laya spike) any time after P0.5; DM1/DM2 gated on P5/P6 surfaces; R5/R6 (OpenViking/WeKnora)
     are independent optional surface phases, each one probe+card+MCP registration, anytime after P0
```

**Kill/rollback:** D1 reversible per-tier; DM slots each behind a Settings toggle; R5/R6 additive modules only. No workspace-side changes anywhere in D1–D3.

**STATUS (2026-10-07): DM0 + DM1 + DM2 + I-phase + R5 + R6 — ALL SHIPPED** on `feat/workspace-console-probe`, merged fast-forward into `main` (`142f3b9`) and pushed (`origin/main`); post-merge suite **140 files / 1510 passed** (0 TS errors). Modules on main: `laya-probe.ts` (DM0), `laya-middlewares.ts` (DM1, toggle-gated fail-open before_model slots), `decision-triage.ts` (DM2, fail-safe approval pre-screen + skill triage + typed JSONL audit at `~/.hermes/decisions.jsonl`), `harnesses/raven-harness.ts` (I-phase, stub removed), `openviking-probe.ts` (R5) + `weknora-probe.ts` (R6). D1 voice de-duplication is design-locked (§D1.3 tiers; UI swap rides the P2 embed — done on main via the WorkspaceConsole screen) and the D2 bench design is recorded; both remain per-tier reversible. Live smoke 7/7 on the real quickstart stack (the smoke corrected the upstream-removed `/api/agents` to the live `/v1/agents` + session-create promotion). DM3 (Jev-Mem) and EverOS agent_skill promotion stay parked pending operator need, per the memory doctrine. **Immediate next actions:** superseded by the shipped state — open items are the M3 appliance mode and optional row-K promotion only.

**Immediate next actions:** (1) operator confirms D1's tier-1 (deprecate UI now, remove later) + D2's bench-snapshot approach + DM0 spike; (2) then P2 proceeds carrying D1 tier-1.

---

## 9. Attribution notes (for when first shipped)

- Laya: MIT-family (verify at adoption time) — vendoring permissible; prefer MCP-interop first.
- Jev-Mem: MIT — no code adoption planned in D3.3 phases; citation if its audit-log shape is copied.
- OpenViking: **AGPL-3.0 core** — interop-only; add NOTICE row + provenance entry at first ship (per repo §6.6 legal posture).
- WeKnora: MIT — NOTICE row at first ship.