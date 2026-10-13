# External-Candidate & Local-Model-Layer Evaluation — Laya · REA · Embeddings/Utility/VLM

> **Date:** 2026-10-14
> **Status:** RESEARCH + DECISION. No architectural change proposed in this pass; one surgical copy fix applied (§2.4). Answers the operator's three questions: (a) do Laya and REA belong in the Agentic OS or in the AI Workspace, (b) how do they fit the Cubecloud bundle, (c) should embedding / utility / VLM models be baked into `cubecloud-agent` and the Agentic OS console.
> **Method:** shallow-clone + source read of both upstream candidates (`NandhaKishorM/laya`, `morluto/rea`) via two independent exploration passes; direct inventory of `agent-desktop/` (Electron console) and the local `cubecloud-agent` (AI Workspace) trees. Every claim below cites a file path; measurements are quoted from the upstream repos' own artifacts.
> **Companion docs:**
> - `2026-10-07-decision-core-governance-bench-replan.md` — Laya's original evaluation; §D3.3 is the DM0–DM2 design this doc extends
> - `2026-10-08-desktop-overhaul-design.md` — the approved (unimplemented) Electron-free control-plane overhaul; §1 layers, §2 ManagedApp contract
> - `2026-10-08-second-brain-doctrine.md` — correction #5 ("never fusion"), rule 3 (config isolation), rule 7 (shells interchangeable, contract is not)
> - `2026-10-06-workspace-agentic-os-coordination-matrix.md` — rows R1–R7 govern what the console coordinates
> **Operator directives honored:** the desktop is the independent control plane; the AI Workspace is a separate product that owns turns/chat; no cloud-API-fee dependency; the console never absorbs managed apps.

---

## 0. Executive summary

| Question | Verdict |
|---|---|
| Laya → Agentic OS or AI Workspace? | **Agentic OS only.** Already shipped (DM0–DM2, commits of 2026-10-07). Not a build decision — a *completion* decision. |
| REA → Agentic OS or AI Workspace? | **Agentic OS only, operator-gated, opt-in.** The safe subset is a strong fit for the console's inventory/governance duties; the native-decompiler + Frida lanes are a legal and security liability unless fenced. |
| Embedding models? | **Yes — but the gap is text, not images, and it lives in the AI Workspace.** The Workspace already ships CLIP image embeddings, a vector store and RRF fusion; **text embeddings and a reranker are the two missing inputs to an architecture that is already built.** |
| Utility ("nano") models? | **Console-side, behind the ManagedApp adapter.** Complements Laya rather than duplicating it (typed decisions vs. phrasing). |
| VLM models? | **Defer.** Cost/benefit fails today; overlaps REA's screenshot/UI-observation tools and the existing CLIP retrieval lane. |
| Bundle model weights into the desktop binary? | **No.** Models belong in a discoverable model-serving sidecar, per the swappable-surface contract and doctrine rule 5. |

**Two facts reframe the whole question:**

1. **Laya is already in the product.** Module `laya-probe.ts` (DM0), `laya-middlewares.ts` (DM1), `decision-triage.ts` (DM2), shipped 2026-10-07 in commits `a06d0eb`, `260bf37`, `3a946bc`.
2. **The ground is moving.** `2026-10-08-desktop-overhaul-design.md` is **approved but not started**: "Electron is retired completely… the browser is the only shell", collapsing transport to **one HTTP route registry**. The shim that doc names (`agent-desktop/src/console-backend/shell.ts`) **does not exist in this tree** — verified 2026-10-14: zero `console-backend` string occurrences across `agent-desktop/src`, and no `shell.ts`/`kernel.ts` anywhere under `src`. Today's repo is Electron-first. Plans that assume the HTTP-only world must sequence after that overhaul.

---

## 1. Relationship model (unchanged, restated for placement)

The doctrine is unambiguous about where third-party capability may land:

> "The Agentic OS desktop is an independent control plane; the AI Workspace, EverOS, the runtime gateways, and the tool surfaces are managed apps it discovers, configures, governs, and observes." — `2026-10-08-second-brain-doctrine.md` §1

Two consequences drive every placement decision in this doc:

- **Chat is the Workspace's job.** The Workspace owns turns, prompts, tool calls, output. The console never proxies a chat turn.
- **Memory is co-located, never fused** (doctrine rule 5). A new local model layer must therefore be a *serving sidecar*, not a merge into the console's stores.

---

## 2. Laya — decision-core completion (not adoption)

### 2.1 What shipped already

| Piece | Module | Wired at |
|---|---|---|
| DM0 probe + MCP registration descriptor | `agent-desktop/src/main/laya-probe.ts` | `agent-desktop/src/main/index.ts:2824` |
| DM1 fail-open guard + routing middlewares | `agent-desktop/src/main/laya-middlewares.ts` | `agent-desktop/src/main/hermes.ts:1180` |
| DM2 approval pre-screen + typed JSONL audit | `agent-desktop/src/main/decision-triage.ts` | `agent-desktop/src/main/index.ts:669` |
| Operator-visible status panel | `agent-desktop/src/renderer/src/screens/Tools/Tools.tsx:824` | — |
| Preload bridge | `agent-desktop/src/preload/index.ts:1644` | — |

### 2.2 Why the console, and never the chat lane

Laya's entire question space is three typed shapes — `choice`, `score`, `noul` — with `min_confidence` producing **abstention** (`null`). It is a non-autoregressive classifier: it **cannot generate text**. The Workspace's brain is the Hermes LLM path; Laya in a chat turn would be a category error. This matches the decision already recorded in `2026-10-07-decision-core-governance-bench-replan.md` §D3.5 (anti-duplication doctrine #4).

Laya's genuine value is that it is the only **deterministic, abstaining, auditable** decision path in the stack — which is exactly a governance property, which is exactly the console's job.

### 2.3 Verified capability boundaries

| Claim | Verified reality |
|---|---|
| "~33 ms" | **T4 GPU, 4 questions.** `LOCAL_SETUP.md` measures CPU at **192–453 ms**, MPS 121–146 ms. |
| "Local-first, offline" | Only *after* first download: `english` **843 MB**, `multilingual` **644 MB**, `typed-decisions` **843 MB**; `LAYA_PRELOAD=1` (the shipped default) preloads two. |
| "Typed decisions" | Real, but hard-limited: >20 choice options requires `laya_shortlist`. |
| MCP | stdio only — `laya-mcp-server`, 8 tools, matches the descriptor in `laya-probe.ts`. |
| HTTP | FastAPI `laya-serve`, default **:8000**, `/health` + `/v1/systemone` (+ `/batch`). |
| Weights license | **UNKNOWN.** Repo `LICENSE` is Apache-2.0 (code only); no weight license text found in-tree. Must be resolved before any redistribution claim. |

### 2.4 Applied fix in this doc's pass

The MCP registration descriptor advertised "~33ms" to the operator while the shipped default is `LAYA_DEVICE=cpu`. Corrected to the measured CPU range, keeping the GPU figure attributed:

`agent-desktop/src/main/laya-probe.ts` → description now reads *"…abstention-gated (local CPU ~200–450 ms/pass; ~33 ms is GPU-only)"*.

The `Tools.tsx` panel subtitle was checked and is accurate as written — no change needed. No locale key or test asserted the old string.

### 2.5 The real remaining gaps

1. **No `ManagedApp` adapter.** Laya currently follows the ad-hoc probe pattern (like `gbrain-probe.ts`), reading `LAYA_BASE_URL` from env at `hermes.ts:1198` / `index.ts:681`. **Nothing supervises the process that serves that URL.** Under the overhaul design §2, Laya must declare `discover/health/lifecycle/config`. This is the highest-value open item.
2. **Weight provisioning policy is undefined.** A local-first product cannot depend on a first-run HuggingFace fetch. Decide: vendor the weights (blocked on licensing) or ship a labelled, sized, resumable first-run download.
3. **Settings surface.** The toggles (`agent.laya_route`, guard) are read via `getConfigValue`; verify they are operator-exposed in Settings rather than env-only.

**Effort:** S–M. **Risk:** low (fail-open everywhere already).

---

## 3. REA — high-capability, high-trust tooling

### 3.1 What it is

MIT-licensed (`LICENSE`), `server.json` declares **stdio** MCP transport, **130 tools** extracted from `src/**/*.ts` registrations, ~**363k lines of TypeScript**, 38 contributors, real CI (`.github/workflows/ci.yml`) with unit/integration/acceptance/python suites. It is productized open source, not a lab demo.

Because it is stdio-only, it can be registered as a plain MCP server — the `npx rea-agents setup` path is optional convenience, not a requirement.

### 3.2 Capability map — and what each needs underneath

| Domain | Engine required | Works with nothing installed? |
|---|---|---|
| Native binaries (pseudocode, xrefs, call graphs) | **Hopper / Ghidra / IDA** | ❌ (except built-in static Go/Rust/Mach-O/plist inspectors) |
| JS / Electron applications | none | ✅ |
| .NET assemblies | none (static-only parser) | ✅ |
| Websites | a **Chrome-family browser** | ❌ |
| Runtime / dynamic | **Frida**, ADB, live target | ❌ |
| Firmware / captures / WASM / SQLite / signals | binwalk, unblob, WABT… (submodules, never auto-downloaded) | ❌ |

### 3.3 Why it fits the console

REA maps onto three duties the console already claims but cannot currently evidence:

- **Inventory (tiers 2–4).** "Which agent CLIs are present, at what version, and what is actually in their bundle" — `analyze_javascript_application`, `compare_source_to_bundle`, `recover_javascript_sources` answer this offline with no external engine.
- **Competitive-gap discipline.** The repo already runs competitive analysis (`docs/plans/2026-08-13-competitive-gap-plan.md`, `openocta`). REA is the tooling layer for that practice.
- **Self-verification.** `compare_javascript_export_shapes`, `inspect_managed_members`, `inspect_native_api` extend our own `npm run verify:bundle` asar-integrity check.

Its evidence model (canonical `evidence_id` + `normalized_result` per finding, explicit `list_unknowns` / `verify_unknown_resolution`) suits an audit-oriented product.

### 3.4 Blockers that must be accepted first

1. **Licence/compliance surface.** MIT core, but: Frida npm is **LGPL-2.0 WITH WxWindows-exception-3.1**; the Windows native addon **statically links the GCC runtime** and requires preserving `GPL-3.0.txt` + `GCC-Runtime-Library-Exception-3.1.txt` + MinGW-w64 notices; submodules include `binwalk`, `unblob`, `jadx-headless-mcp`, `ghidra-nativeaot`, `wakaru`. `DISCLAIMER.md` additionally forbids DRM/licence-check/anti-cheat circumvention, auth bypass, and account resale — restrictions we would inherit.
2. **Security posture — decisive.** Upstream `SECURITY.md` states **"This is not a sandbox."** It can inject scripts into live processes, read process memory, capture browser sessions and network traffic, and parse hostile binaries — with the invoking user's rights. Analysed content also lands in an agent's context, so **prompt injection from a hostile target is a first-class hazard**.
3. **stdio-only transport.** It cannot be a container-side managed app under the "one HTTP registry" rule without a stdio→HTTP bridge.

### 3.5 Ship conditions (all required)

1. **Opt-in, off by default**, behind explicit operator consent naming process injection; never auto-installed.
2. **Default profile = the safe subset**: JS/Electron + .NET + Go/Rust static inspection + our own bundle auditing. Native-decompiler and Frida lanes require the operator to install Hopper/Ghidra/IDA separately **and** enable a labelled "dynamic instrumentation" mode.
3. **Hard boundary:** never reachable from the Workspace chat lane, never from an unattended or scheduled run.

Under those conditions it is a differentiator; without them it is a liability.

---

## 4. Local model layer — embeddings, utility, VLM

### 4.1 The measured gap

| Layer | Agentic OS console | AI Workspace |
|---|---|---|
| **Text embeddings** | ❌ none | ❌ **none.** The only vector table in the entire schema is literally `file_image_embedding` (image-only: `model`/`dim`/`vector` columns) — `cubecloud_agent/stores/file_embedding_store/sqlalchemy_store.py:30-38`; `visual_search` is the only vector query in the codebase — `cubecloud_agent/stores/file_index_store/sqlalchemy_store.py:744` |
| **Reranker** | ❌ none | ❌ excluded by design — `cubecloud_agent/model_catalog.py:78` filters "embeddings/rerankers" out of chat-capable endpoints |
| **Visual embeddings** | ❌ none | ✅ **CLIP ViT-B/32** — `cubecloud_agent/runner/file_embed_worker.py`, served by `scripts/clip_server.py` on `127.0.0.1:8893` |
| **Fusion / vector store** | ❌ | ✅ RRF over BM25 + CLIP cosine — `cubecloud_agent/server/routes/file_index.py:48`, store in `stores/file_embedding_store/` |
| **Local LLM** | HTTP client only — `local-server-scan.ts` probes Ollama :11434 / LM Studio :1234 as OpenAI-compatible providers | ✅ first-class: `onboarding/ambient.py` (TCP probe), `llms/routing.py:30`, `plans/010-ollama-local-llm-amd-strix-halo.md`, `scripts/test_ollama_chat.py` |
| **VLM** | ❌ | ❌ |
| **Speech** | Handy dictation (local) | whisper / qwen3-asr STT, Edge/Qwen3-TTS |
| **Code index** | CodeGraph = SQLite **tree-sitter graph** + FTS — no vectors | file index = FTS5 + CLIP, fused |

Verified in the desktop: no dependency in `agent-desktop/package.json` — runtime **or** dev — matches `onnx|transformers|torch|tensorflow|llama|whisper|clip|sentence|tiktoken|embed` (checked 2026-10-14). The console's only local-inference surface is CodeGraph's tree-sitter index.

**Conclusion: the embedding layer is half-built, and it was built in the Workspace.** The Workspace already has the store, the worker pattern, the "model id per row → re-embed on bump" discipline, and the RRF fusion. Text embeddings are the one missing input to an architecture that already ships.

### 4.2 Recommendations, sequenced by leverage

**P1 — text embedding + reranker sidecar for the AI Workspace (do first).**
Mirror the proven `clip_server.py` shape: a small local HTTP sidecar serving (a) a text-embedding model in the bge-small / nomic-embed class (≤150 MB, ONNX Runtime, CPU) and (b) optionally a cross-encoder reranker. This fills a designed-in slot; it invents no architecture. RRF alone gets most of the recall — add the reranker only after measuring.

**P2 — utility / "nano" model lane in the console, behind the ManagedApp adapter.**
Small local models for cheap jobs: title generation, tag/keyword extraction, query rewrite before embedding, intent classification. Note the deliberate division of labour: **Laya for typed decisions that must be auditable and may abstain; a nano LLM for phrasing.** They are complementary, not competing.

**P3 — defer VLM.**
A VLM is the most expensive item on the list (1–4 GB+ per model, GPU-class compute for acceptable latency, real quality variance). Its natural job — "what is in this screenshot" — partly overlaps **REA's `capture_web_screenshot` / UI-observation tools**, and the CLIP lane already covers image *retrieval*. Revisit only when a concrete feature demands image *understanding*, and then as a **remote-optional** capability.

### 4.3 Packaging rule

**Do not bundle model weights into the desktop binary.** Doctrine rule 5 ("co-located, never fused"), rule 3 (config isolation) and the swappable-surface contract in the root `AGENTS.md` all point the same way: models belong to a **model-serving sidecar** the console discovers, configures, and governs — exactly as Ollama and CLIP work today. Bundling (a) bloats the installer, (b) hard-codes a surface assumption the contract forbids, (c) breaks the independent-control-plane rule.

---

## 5. Placement matrix

| Candidate | AI Workspace (chat / users) | Agentic OS (control plane) | Rationale |
|---|---|---|---|
| **Laya** | ❌ never a chat lane | ✅ **already shipped** — finish adapter + lifecycle + provisioning + copy | Typed decisions ≠ generation; Workspace keeps its own brain |
| **REA** | ❌ never | ✅ opt-in, safe-subset default, operator-session only | High-trust tooling must not sit behind an unattended chat turn |
| **Text embeddings + reranker** | ✅ **primary home** (fills the designed-in RRF slot) | ✅ consumer of it for code/doc search | Embedding is a retrieval concern; the Workspace owns retrieval |
| **Utility / nano models** | partial | ✅ via ManagedApp adapter | Cheap, swappable, operator-configurable |
| **VLM** | defer | defer | Cost/benefit fails today; overlaps existing lanes |
| **Weight bundling** | — | sidecar, never in the binary | Swappable-surface contract + installer hygiene |

---

## 6. Recommended actions

| # | Action | Verify |
|---|---|---|
| 1 | **Laya → ManagedApp adapter (DM3):** `discover/health/lifecycle/config` for a `laya-serve` sidecar; supervise start/stop/restart + a health row; retire the bare `LAYA_BASE_URL` env read | Adapter unit tests green; Tools panel shows a health row; killing the sidecar degrades to *abstain*, never throws |
| 2 | **Weight provisioning policy:** decide vendor-vs-first-run-download; confirm the HuggingFace weight licence first (currently UNKNOWN) | Written licence note + a provisioning test in an offline environment |
| 3 | **REA spike, time-boxed:** register `server.json` as a stdio MCP server; run only the no-engine subset against our own built bundle | `npm run verify:bundle` cross-checked against REA's own bundle analysis; a written list of which tools need Hopper/Ghidra/Frida |
| 4 | **Workspace text-embedding sidecar:** mirror `clip_server.py`; ONNX CPU model; same store + RRF path | A file search that hits on paraphrase but not keyword, returning ranked results with text+visual+BM25 fusion visible |

**Explicitly out of scope now:** bundling VLM weights, auto-installing REA, enabling REA's Frida/native-decompiler lanes by default, or routing Laya into the chat path.

---

## 7. Attribution notes (for when first shipped)

- **Laya** — code Apache-2.0; **model weights licence UNKNOWN**, resolve before redistribution. Interop-first (MCP/HTTP) is already the implementation choice.
- **REA** — code MIT. Inherited obligations if shipped: LGPL-2.0+WxWindows-exception (Frida npm), GPL-3.0 + GCC-Runtime-Library-Exception-3.1 (Windows native addon), plus `binwalk`/`unblob`/`jadx-headless-mcp`/`ghidra-nativeaot`/`wakaru` submodules. Add NOTICE + provenance rows at first ship, per the repo §6.6 legal posture.
- **CLIP** — `openai/clip-vit-base-patch32` is already in use in the Workspace; any new embedding model needs its licence recorded in `THIRD_PARTY_NOTICES`/provenance.

---

## 8. Verify steps for this doc

- Consistency with `2026-10-07-decision-core-governance-bench-replan.md` §D3.5 (anti-duplication doctrine) — checked on write; §2.2 and §5 restate it, they do not amend it.
- Consistency with `2026-10-08-second-brain-doctrine.md` rules 3/5/7 — checked on write; §4.3 is the packaging expression of rule 5, not a new rule.
- The one code change (§2.4) must not break `agent-desktop/tests/laya-probe.test.ts` nor any locale key — verified: no test or locale file asserts the previous description string.
- Re-check this doc when the `2026-10-08` overhaul lands, because REA's stdio-only transport and Laya's process supervision both become ManagedApp-contract obligations at that point.
