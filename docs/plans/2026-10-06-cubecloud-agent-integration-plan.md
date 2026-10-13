# Integration Plan — agent-desktop (Agentic OS console) × cubecloud-agent (AI Workspace frontend)

> **Date:** 2026-10-06
> **Status:** PLAN ONLY — no implementation. Research, comparison, and integration design per the "two essential connection parts" constraint.
> **Repos:**
> - `d:\users\joeyzh\github-pr\cubecloud-agent` (Python/FastAPI agent runtime + React workspace SPA)
> - `agent-desktop/` in this monorepo (Electron Agentic OS, v2.10.79)
> **Sync status at time of writing:** both repos are `main` == `origin/main`, zero drift, clean working trees (`cubecloud-agent` has only modified runtime logs — not code). Nothing to merge; nothing to implement locally.
> **Method:** parallel exploration of both codebases + fetch of www.cubecloud.io (home / platform / products / about) + Electron `<webview>` reference. Primary facts are cited to file paths.

---

## 0. Executive summary

The official scope at cubecloud.io defines **two product brands on one appliance** (www.cubecloud.io/platform):

| | AI Workspace | Agentic OS |
|---|---|---|
| **Role** | Conversational front interface | Runtime, memory and governance base |
| **Owns** | Turns, prompts, tool calls, output | Persona, memory, skills, MCP, metadata |
| **Connects to** | End users and business entry points | Third-party repos, CLIs, MCP servers |
| **Upgrade path** | Independent | Hardware can change; the OS layer does not |

The two codebases already exist and map onto these two roles almost exactly:

- **cubecloud-agent** → **AI Workspace** (front interface): the React workspace SPA + the FastAPI server on `:6767` that owns turns, sessions, files, voice I/O, and the agent execution fabric (host daemon → per-session runners → native CLI adapters).
- **agent-desktop** → **Agentic OS** (control console + backend configuration center): the Electron console that owns runtime orchestration (Hermes/IronClaw/OpenClaw/Raven), the operator control plane (SOUL, models, providers, skills, memory, tools, schedules), and the sidecar/governance surfaces (CodeGraph, EverOS, Headroom, Moo Tasks, GBrain, Voice, Vault, policies).

**The proposal in this plan:** keep both apps separate — two repos, two install units, independent upgrade paths per the platform contract — and connect them through **one explicit control-console contract** on top of APIs that **already exist on both sides** (cubecloud-agent: REST/WS on `:6767`, host tunnel, `/api/agents` bundles, voice proxy, file-index; agent-desktop: gateway diagnostics, Docker/host supervising, webview embedding with a localhost allow-list, profile config ownership). agent-desktop becomes the operator seat that **attaches, supervises, configures, and governs** cubecloud-agent; cubecloud-agent remains the human entry point where the chat/workspace actually happens.

```
┌────────────────────────────────────────────────────────────┐
│  agent-desktop (Agentic OS / Electron)                     │
│  · runtime orchestration: hermes 8642 / ironclaw 3231 /    │
│    openclaw 18789 / raven 8855                             │
│  · control plane: SOUL · models · providers · skills ·     │
│    memory · tools · schedules  (~/.hermes profiles)        │
│  · sidecars: CodeGraph · EverOS · Headroom · Moo Tasks …   │
│  · governance: policies · approvals · vault                │
└──────────────┬─────────────────────────────────────────────┘
               │  control-console contract (HTTP/WS on
               │  127.0.0.1:6767  +  optional webview embed)
               ▼
┌────────────────────────────────────────────────────────────┐
│  cubecloud-agent (AI Workspace / Python FastAPI)           │
│  server :6767 — sessions · files · voice · /api/agents ·   │
│  host daemon ← WS /v1/hosts/{id}/tunnel → runners per      │
│  session → native adapters (claude/codex/cursor/opencode/  │
│  hermes/kimi/kiro/goose/pi/qwen/antigravity, tmux)         │
│  voice: VAD → whisper/qwen3-asr → Hermes LLM → Edge/Qwen-TT│
└──────────────┬─────────────────────────────────────────────┘
               │  LLM / voice upstream (already shared today)
               ▼
      Hermes gateway :8642 (shared runtime spine)
```

---

## 1. Sync & merge status (first work item)

- `cubecloud-agentic-os`: `main` == `origin/main` after `git fetch`; `agent-desktop/` tree is current upstream state (V2.10.79, `apps/desktop-shell` retired in V2.10.67 — confirmed: no such workspace exists; workspace name is `cubecloud-agent-desktop`).
- `cubecloud-agent`: `main` == `origin/main` (origin `JZKK720/cubecloud-agent`); only local modifications are `logs/gpu-voice/*.log` runtime logs — no code drift to merge.
- **Known upstream-leftover to note (not our tree):** the `cubecloud-agent` quickstart compose still carries legacy `agent-meow-*` image refs and project name — a rebrand gap on the `cubecloud-agent` side; and its GHCR `:latest` images are stale pre-rebrand.
- **Conclusion:** there were "no current updates" beyond what is already local — the sync step is a verified no-op. All evolution work below is therefore plan + future tasks, exactly as requested.

---

## 2. Deep-dive A — cubecloud-agent (evaluated first, as requested)

Evaluated build: **`omnigent` 0.15.0**, module `cubecloud_agent/`, PyPI name `omnigent`, CLI entries `omnigent`/`omni`/`cubecloud-agent`. Built on Omnigent (Apache-2.0).

### 2.1 Stack

| Layer | Technology |
|---|---|
| Core | Python ≥3.12, FastAPI + uvicorn (`cubecloud_agent/server/app.py`), Pydantic v2 |
| Data | SQLAlchemy 2 + Alembic (`db/`), 19 stores, SQLite-FTS5 gated w/ ILIKE fallback on Postgres (`stores/file_index_store/sqlalchemy_store.py`), zstd-compressed text columns cross-backend (`db/compression.py`) |
| Frontend | React 18 + Vite, zustand + @tanstack/react-query, react-router v6, antd/radix/shadcn, TipTap, Monaco, xterm, i18next; **@ricky0123/vad-web (Silero VAD)** which requires the server's COOP/COEP headers (`server/app.py` middleware) |
| Ship shapes | server-served SPA at `/` on `:6767`; **embedded-UI build `web/vite.embed.config.ts`**; `web/electron/`, `web/ios/`, `web/android/` shells |
| Docs of record | `cubecloud_agent/server/API.md`, `server/DBSPEC.md`, `openapi.json`, `DESIGN.md`, `designs/{RUNNER,DAEMON_API,SESSION_REARCHITECTURE,RUNNER_MCP,DEVICE_AUTH}.md` |

### 2.2 The agent fabric (host → runner → adapters)

1. **Host** — machine running `omnigent host`; dials outbound `WS /v1/hosts/{id}/tunnel`, sends `host.hello` (version, runners, harness readiness), serves fs frames (`host.list_dir`, `host.stat`, worktrees), spawns runner subprocesses on `host.launch_runner` (`host/connect.py`, `host/frames.py`). Persisted cross-replica in the `hosts` table (`stores/host_store.py`).
2. **Runner** — per-session agent process; connects `WS /v1/runners/{runner_id}/tunnel` with a binding token → registered in `TunnelRegistry` (`runner/ws_tunnel/registry.py`); the server dispatches framed HTTP over the tunnel (`WSTunnelTransport` in `runner/transports/{tcp,uds,ws_tunnel}`) and maps conversation → runner via `RunnerRouter` (`runner/routing.py`). Sessions carry `runner_id` affinity; connect/disconnect callbacks re-init sessions (`server/app.py` `_on_runner_connect`/`_on_runner_disconnect`).
3. **Harnesses** — claude-agent-sdk + openai-agents in-process; **native CLI harnesses** (claude/codex/cursor/opencode/hermes/kimi/kiro/goose/pi/qwen/antigravity) run vendor TUIs in **tmux panes** (`harness_aliases.py`, `harness_plugins.py`); custom YAML agents upload as tarball bundles via `POST /api/agents` (name becomes the "model").

### 2.3 HTTP/WS surface (what an external console can already use)

- **Sessions**: `POST/GET/PATCH /v1/sessions…`, `POST /v1/sessions/{id}/events` (message/interrupt/approval/slash/stop/compact), **snapshot GET + SSE live tail** reconnect contract, `WS /v1/sessions/updates`, `WS /v1/sessions/{id}/terminal`, `POST /v1/sessions/{id}/mcp`.
- **Resources**: `/v1/sessions/{id}/resources/files|documents|images|videos`, `GET /resources/tags`, `GET /resources/file-index` (+search), notes/snippets, `/v1/workspace/scan`.
- **Hosts/runners**: `GET /v1/hosts`, `POST /v1/hosts/{id}/runners`, both WS tunnels.
- **Voice proxy** (`server/voice_proxy.py`, mounted when `HERMES_VOICE_URL` set): `/v1/audio/transcriptions`, `/v1/audio/speech`, `/v1/audio/speech/stream`, `/v1/audio/speech/edge`, `/v1/chat/completions`.
- **Infra/auth**: `/health`, `/v1/me`, `/v1/info`, `/v1/stack/status`, `/v1/policy-registry`, `/v1/sharing`, `/v1/scheduled_tasks`, `/v1/projects`, `WS /v1/dictation/stream` (sherpa-onnx), `/auth/*` (OIDC + accounts + magic), `/oauth/*` (RFC 8628 device grant), single-user local mode (`OMNIGENT_LOCAL_SINGLE_USER=1`, `server/auth.py`).
- **Auth model**: pluggable `AuthProvider` — `header` (fail-closed), `oidc` (`__Host-ap_session` cookie), `accounts` (first-user-is-admin); runners authenticate with tunnel binding tokens + sentinel Origin `cubecloud-agent://internal`; CSWSH guard via `CUBECLOUD_WS_ALLOWED_ORIGINS` (`server/ws_origin.py`).

### 2.4 Voice stack

Browser **Silero VAD → PCM16** → server proxy → **STT** whisper-server `/inference` (`WHISPER_STT_URL`; Docker ships qwen3-asr sherpa-onnx `:8001`, host `:18001`) else Hermes faster-whisper → **LLM** Hermes gateway `/v1/chat/completions` → **TTS** Hermes **Edge TTS primary**, fallback **Qwen3-TTS** (`QWEN_TTS_URL :8889` legacy `/tts`; `QWENTTS_SERVER_URL` native Vulkan `tts-server.exe`). Playback-ownership single-voice dispatch enforced in `voice_proxy.py`.

### 2.5 Deployment & ports

Quickstart compose (`deploy/docker/docker-compose.quickstart.yaml`): postgres + ollama (11434) + hermes-gateway (8642) + qwen3-tts (8889) + qwen3-asr (18001 host) + `agent-meow-server` (**:6767**) + `agent-meow-host` sidecar sharing a `host-workspace` volume. Server default **6767** local / 8000 in bare Docker entrypoint.

---

## 3. Deep-dive B — agent-desktop (re-evaluated at v2.10.79)

### 3.1 Process model & IPC

- Main: `src/main/index.ts` (~3,000 lines, **153+ `ipcMain.handle` channels**) + helpers (`hermes.ts`, `installer.ts`, `ironclaw-sandbox.ts`, `docker-runtimes.ts`, `auto-discovery.ts`, `local-server-scan.ts`, `ssh-tunnel.ts`, sidecar modules).
- Preload: `src/preload/index.ts` (~2,400 lines) exposes **`window.hermesAPI`** + `window.electron` via `contextBridge` (lines 2387–2388).
- Renderer: React 19 + Tailwind 4; 26 screens in three nav groups (**work**: chat, sessions, agents, soul, plans, codegraph, everos, headroom, sandboxtasks, swarm, knowledge; **configure**: models, providers, skills, memory, tools, workspace, schedules; **platform**: gateway, mcp, settings) — `src/renderer/src/screens/Layout/Layout.tsx`.
- Hardening: `sandbox:true`, `contextIsolation:true`, `webviewTag:true`, `setWindowOpenHandler` → `open-external` gated by `isAllowedExternalUrl` (https/http/mailto) — `src/main/index.ts:475-500`, `src/main/security.ts`.

### 3.2 Tier model (per `AGENTS.md` §0)

| Tier | Contents | Where |
|---|---|---|
| 1. Core runtime agents | `RuntimeProviderId = "hermes" \| "ironclaw" \| "openclaw" \| "raven"` (`src/shared/runtime-orchestration.ts:1`); ports from `src/shared/runtime-defaults.ts`: **Hermes 8642** (default), **IronClaw 3231** (8281 = legacy internal channel bus), **OpenClaw 18789**, **Raven 8855** (`integrationStatus:"optional"`) | chat/HTTP gateways |
| 2. Integrated support surfaces | CodeGraph, EverOS, Headroom, Moo Tasks, Codebase Memory, Agent Reach, Last 30 Days, Voice, Handy, GBrain, Graphify, OfficeCLI, Browser Use, Eval Framework | operator-installed sidecars + panels |
| 3. User-managed 3rd-party apps | Ollama, LM Studio, vLLM, llama.cpp, Open WebUI… | `discoverLocalServers()` / Docker discovery |
| 4. Coding-agent CLIs | 35-entry `AGENT_CLI_CATALOG` (`src/shared/agent-clis.ts`), PATH discovery only | never a chat lane |

### 3.3 Control plane & session ownership

- Operator data is **profile-scoped under `~/.hermes`**: `profileHome()` (`src/main/utils.ts`) → `~/.hermes` default, `~/.hermes/profiles/<name>` named; per-profile `config.yaml`, `.env`, `desktop/sessions.json` (session cache `src/main/session-cache.ts` synced from the runtime's `state.db`), `plans/` `<id>/plan.json`, `skills/`.
- Sessions are **gateway-owned**: gateway returns `sessionId`; desktop persists per-conversation and streams `chat-chunk`/`chat-done`/`chat-error`/`chat-tool-progress`/`chat-usage` over IPC (`send-message` at `src/main/index.ts:1175`).
- ⚠️ Correction to older repo memory: `agent-workspace/providers/<runtimeProviderId>/` and `saveAgentSessionSnapshot` **do not exist** in the current tree (carried over from the retired `apps/desktop-shell` era). Credentials live in per-profile `config.yaml`/env (`src/main/config.ts`).

### 3.4 Voice

`src/main/voice-stt.ts` (Groq `GROQ_API_KEY` primary cloud, OpenAI Whisper fallback), `src/main/handy-stt.ts` (local-first Handy pastes text, no audio over IPC), `src/main/voice-tts.ts` (OpenAI `tts-1`, `nova`, 4096-char cap). Renderer: mic button `screens/Chat/ChatInput.tsx`, speaker `screens/Chat/MessageRow.tsx`.

### 3.5 The existing second-app embedding path (grounded)

- `<webview>` is enabled and **allow-listed**: `isAllowedWebviewUrl()` (`src/main/security.ts:44-52`) accepts **only `http:` on `localhost/127.0.0.1/[::1]` with port 1024–65535**, and `hardenWebviewPreferences()` strips preload + forces `sandbox/contextIsolation/webSecurity`. `hardenAttachedWebContents()` also gates `will-navigate`/`will-redirect` to the same list.
- A `:6767` cubecloud-agent origin **already qualifies** for this allow-list today. The legacy Office-surface CSS is removed; `runtime-registry.ts` states that surface isn't coming back — but the webview plumbing is intact and reusable, and per the sidecar pattern (`moo-tasks-sidecar.ts` etc.: spawn/detect → probe health → `*-probe` + `*-sidecar-*` IPC family → panel screen) a Workspace panel would slot into the existing screen map.
- Caveat from Electron docs (2026): the `<webview>` tag is under architectural churn; the docs currently recommend `iframe`/`WebContentsView` alternatives. The desktop already ships `webviewTag:true` with hardened prefs, so webview-now / `WebContentsView`-later should be an explicit migration note in any implementation, not a blocker.
- **COOP/COEP note:** cubecloud-agent's SPA needs its server's COOP/COEP headers for `vad-web` (`SharedArrayBuffer`). An embedded webview loading `:6767` still receives those headers from the server (they're response headers, not embedder properties) — but `crossOriginIsolated` behavior inside an embedded frame must be smoke-verified on the first embed spike.

---

## 4. Comparison & gap analysis (both evaluated)

### 4.1 Side-by-side

| Concern | agent-desktop (Agentic OS) | cubecloud-agent (AI Workspace) | Relationship |
|---|---|---|---|
| Packaging | Electron 39 app, `electron-builder` win pipeline | Python server + SPA (+ electron/ios/android shells) | separate install units — keep |
| Chat/completions | OpenAI-compatible `/v1/chat/completions` + SSE to gateway | same contract, relayed via `RunnerRouter` | compatible |
| Runtime lanes | hermes 8642 / ironclaw 3231 / openclaw 18789 / raven 8855 | host daemon + runners + 11 native CLI adapters + 2 in-process harnesses | **complementary**: desktop lists lanes; cubecloud-agent executes with deeper adapter fabric |
| Session truth | gateway-owned, desktop caches per-profile | server-owned (conversations table), snapshot+SSE | conflict → declare **cubecloud-agent server = session truth** when attached |
| Operator config | profile `~/.hermes/config.yaml`/`.env` (SOUL, models, providers, skills, schedules) | `config.yaml` + `.env` + `/api/agents` YAML bundles + `accounts`/`oidc` auth | overlapping → need a **single-writer rule** (see §5.3) |
| Voice | Handy + Groq/OpenAI STT, OpenAI tts-1 | VAD → whisper/qwen3-asr → Edge/Qwen3-TTS with playback ownership | two stacks — pick per attachment mode (§5.4) |
| Skills | `~/.hermes/skills/`, 35-entry CLI catalog | YAML agent bundles via `POST /api/agents` (name = model) + tmux harness aliases | overlap → translation layer needed |
| Sidecars/surfaces | CodeGraph, EverOS, Headroom, Moo Tasks, GBrain… | file-index, tags, notes/snippets, projects, scheduled tasks, sharing | complementary, no direct clash |
| Ports | 8642/3231/18789/8855 lanes | 6767 server, 8889 qwen3-tts, 18001/8001 qwen3-asr | **no collision**; 6767 already webview-allowed |
| Shared spine | Hermes = default lane | Hermes = LLM + voice upstream, `hermes_native` adapter | **Hermes is the bridge**: same gateway serves both |

### 4.2 Gaps on the agent-desktop side (for console duties)

1. No generic "external app registry": discovery is per-surface (`discoverAgentClis`, `scanLocalServers`, `discoverDockerRuntimes`). A `cubecloud-agent` surface needs its own probe/attach module following the `moo-tasks-sidecar.ts` pattern.
2. Sessions, files (file-index/tags), projects, scheduled tasks, approvals, `/v1/policy-registry` — none of these are surfaced for a **second origin** today; the console UIs assume the hermes gateway.
3. No lifecycle supervisor for the cubecloud-agent server (Docker compose quickstart or local `omnigent`/host daemon) — desktop has precedent (`hermesLifecycle.ts`, `service_supervisor.py` on the agent side).
4. Config generation: desktop writes hermes-format `config.yaml`/`.env`; cubecloud-agent's config surface differs (stores, auth provider selection, voice URLs, `OMNIGENT_*` env) — needs a dedicated generator, not reuse.

### 4.3 Gaps on the cubecloud-agent side (for being console-managed)

1. No machine-readable "console manifest" (health+capabilities endpoint richer than `/health` + `/v1/stack/status`) for the desktop to render attach-state; `/v1/stack/status` is close but desktop-desktop-oriented (whisper/tts "unconfigured by design" in containers).
2. Container naming/rebrand inconsistency in compose (`agent-meow-*`) complicates desktop Docker discovery matching.
3. `/auth/*` account/OIDC model has no "desktop as operator seat" delegation story — desktop vault → header/api-key bridging must be designed (§5.5).

---

## 5. Integration design (what to build later, nothing now)

### 5.1 Product mapping (locked to cubecloud.io)

- **cubecloud-agent = AI Workspace**: the unified entry for operators; owns turns, prompts, tool-call output, files, voice I/O, business flows.
- **agent-desktop = Agentic OS console + backend configuration center**: owns runtime lanes, persona/memory/skills/MCP metadata, scheduling, governance (policies, approvals, vault), and **operates** the Workspace rather than replacing it.
- Independent upgrade paths preserved: neither app merges into the other; the only coupling is the contract below. This satisfies "two essential connection parts, not one giant app."

### 5.2 The control-console contract (the one interface to design)

All four legs ride on **existing** cubecloud-agent endpoints; agent-desktop adds a new sidecar module family (`cubecloud-agent-*.ts`) mirroring `moo-tasks-sidecar.ts`:

| # | Capability (desktop side) | Uses (agent side, exists today) | Notes |
|---|---|---|---|
| A | **Attach & health state** — probe + render console card on Tools screen | `GET /health`, `GET /v1/info`, `GET /v1/stack/status` | runtime-mode read (single-user vs oidc); origin must pass `isAllowedWebviewUrl` |
| B | **Lifecycle supervision** — start/stop/upgrade via local host or Docker quickstart | local `omnigent` CLI/host daemon `~/.cubecloud` pidfile; compose `agent-meow-server` service | new `agentDesktop` supervisor module; mirrors `hermesLifecycle.ts` |
| C | **Operator workspace embed** — first-class `Workspace` panel embedding the SPA | server-served SPA or `web/vite.embed.config.ts` build | `<webview src="http://127.0.0.1:6767">` behind `isAllowedWebviewUrl` + `hardenWebviewPreferences`; deep-link to `#/chat`/`#/sessions` |
| D | **Session read-only console** — desktop Sessions/Plans screens can LIST/inspect workspace sessions without owning them | snapshot GET + SSE tail, `WS /v1/sessions/updates` | desktop becomes **viewer, not owner** — single session truth, fixing the §4.1 conflict |
| E | **Agent bundle promotion** — promote desktop skills/agents into the fabric | `POST /api/agents` (tarball bundle) | desktop skill→YAML-bundle translator; the skills overlap point |
| F | **Voice policy handoff** — when attached, desktop voice routes through the workspace voice proxy (or is disabled) | `/v1/audio/transcriptions`, `/v1/audio/speech*` | playback-ownership respected on the agent side; desktop Handy remains the local-first alternative |
| G | **Approval/policy relay (phase-gated)** | `/v1/policy-registry`, session `approval` event frame | the governance story that makes desktop genuinely the "backend configuration center" |
| — | **Companion replan (EverMind/EverOS/Raven/EverMe)** | `docs/plans/2026-10-06-evermind-memory-harness-replan.md` | rows H–K (shared memory tier, Raven harness, chat↔memory wiring, skills bridge broadening) + revised DAG live there; rows A–G above unchanged. **Operator decision (2026-10-07): rows H/J parked — no EverOS integration; EverOS stays a third-party tool surface.** |
| — | **Coordination matrix (relationship & registry design)** | `docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md` | new rows R1–R4: inventory reconciliation, persona adoption, skills promotion, governance view — the "control board / operating console" duties on top of rows A–G; memory doctrine locked per-core (no shared tier). |
| — | **Decision-core + governance-bench replan (D1–D3)** | `docs/plans/2026-10-07-decision-core-governance-bench-replan.md` | voice de-duplication (workspace owns voice, desktop keeps local dictation only), governance-bench persistence design, and the decision-model evaluation (Laya adopted DM0–DM2; Jev-Mem watchlist; rows R5/R6 OpenViking/WeKnora optional tool surfaces, AGPL/MIT license care) |

Out-of-contract by design: the desktop does **not** proxy chat for the workspace; the workspace does **not** manage desktop runtime lanes (hermes/ironclaw/openclaw/raven stay desktop-side); neither core wires the other into its memory surfaces (each evolves with its own persistent long memory).

### 5.3 Config ownership — single-writer rule

To avoid the historical `/opt/data/.env` override class of bugs: when attached, **configuration domain boundaries are explicit** —

- Desktop writes: `desktop/` namespaced settings via its own persistence, provider credentials in its vault, and (only in supervisor mode) generation of the cubecloud-agent env file **once at provision time**, with a hash-stamped header.
- Workspace owns: its own `config.yaml`, DB migrations (Alembic), stores.
- Neither side rewrites the other's file while running; any env change requires a supervised restart with recorded diff.

### 5.4 Attachment modes (matrix)

| Mode | Workspace UI | Desktop role | Voice | Config |
|---|---|---|---|---|
| M0 standalone | self-hosted SPA, no desktop | not installed | workspace stack | workspace-owned |
| M1 **attached** (default) | SPA in browser | console card + lifecycle (B) + read-only sessions (D) | workspace stack | single-writer rule |
| M2 **embedded** | webview panel inside desktop (C) | console + embed | route F | single-writer rule |
| M3 **remote appliance** (OEM/hosted on Cubecloud hardware) | SPA served from appliance | same as M1 over LAN/SSH tunnel (`ssh-tunnel.ts` precedent) | workspace stack | single-writer rule |

The modes reuse the desktop's three-tier language: a `cubecloud-agent` surface is **not** a tier-1 chat lane and **not** tier-4 CLI; it is a new **tier-2 console surface** (operator-installed sidecar service, panel on Tools screen) — the cleanest fit for the existing architecture and messaging.

### 5.5 Security posture

- Attach origin strictly via `isAllowedWebviewUrl` (localhost-only http) or explicit user-entered remote with SSH tunnel — never arbitrary URLs into the webview.
- Credentials: API keys/OIDC bridging from desktop vault → agent's `header`/`oidc` auth provider; secrets stay out of source (repo §6.6 security floor); the CSWSH guard (`CUBECLOUD_WS_ALLOWED_ORIGINS`) must include the desktop's renderer origin only if cross-origin WS is ever needed — prefer same-origin (embed) to avoid widening it.
- The embed keeps desktop hardening (no preload in guest, sandbox, `deny` popups via `hardenAttachedWebContents`).
- Threat-model delta for `THREAT_MODEL.md` at implementation time: new local listening port (6767), embed boundary, approval-relay trust.

### 5.6 Phased roadmap (each phase independently verifiable; build orders only, no dates)

| Phase | Deliverable | Verify step |
|---|---|---|
| P0 — Probe & attach card | `cubecloud-agent-probe.ts` + Tools-screen console card (health/info/stack) | vitest probe unit tests; live probe against running quickstart `:6767` returns parsed state |
| ↑ **STATUS (2026-10-07):** P0+P0.5+P1 **implemented on `feat/workspace-console-probe` worktree branch** — probe module (8 tests), `workspace-probe`/`workspace-probe-url` IPC, preload+`d.ts`, Tools-screen "AI Workspace" card, **P1 supervisor** (`cubecloud-agent-supervisor.ts`, 4 tests, Start/Stop buttons on the card, CLI-based `omnigent server start/stop` with upstream pidfile/reuse semantics), Raven registry consistency fix (4 tests). Full suite 128 files/1421 passed; both typechecks clean. NOT merged to main; changelog draft at `agent-desktop/changelogs/2.10.80.md`. **Operator decision (2026-10-07): no EverOS/EverCore integration** — EverOS stays a third-party tool surface; a briefly-attempted P1.5 memory-tier wiring was reverted. Coordination continues as **relationship/registry-level** analysis — see `docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md`. |
| ↑ **STATUS 2 (2026-10-07): P2 + P3(+R1) + P4(R2+R3) + P5 + P6 implemented — ALL CONTRACT PHASES DONE (A–G + R1–R7)** on the same branch — `workspace-console.ts` (allow-list + hardening, 4 tests), `WorkspaceConsole` embed screen registered in Layout, `workspace-console-url` IPC; **read-only session inventory** `cubecloud-agent-sessions.ts` (10 tests: list/snapshot/agents parsing, liveness, R1 reconciliation, and the same-commit **no-mutation CI ban** guard test); **persona/skills adoption** `agent-bundle-compiler.ts` (9 tests — canonical tar.gz bundle compile with zero deps, one real ustar offset bug fixed in review; operator-gated `agent-bundle-promote` IPC with 201/409/400 mapping); **config center + vault bridge** `cubecloud-agent-config.ts` (6 tests — hash-stamped provision-env generation, fingerprints-only logging, single-writer CI ban part 2; **gate artifact written first** at coordination matrix §3.1 per Part-I §7 finding 3); **governance relay** `cubecloud-agent-governance.ts` (9 tests — pending-elicitations inbox with mirrored-child routing, the ONE write = verdict to the resource-scoped resolve URL 202/404/422, tolerant surfaces join, mutation-scope guard: exactly one POST, zero PUT/DELETE/PATCH); **DM0 Laya probe** (`laya-probe.ts` + MCP descriptor, 4 tests) and **R6 WeKnora probe** (`weknora-probe.ts`, 6 tests, retrieval-only boundary). Full suite **136 files / 1474 passed**, both typechecks clean. Still NOT merged; changelog extended. Remaining: DM1/DM2, I-phase, live smoke, merge approval. |
| P0.5 — Raven registry consistency / catalog refresh | `runtime-registry.ts` Raven case matches catalog `optional`; note bumped to 0.2.x + WebUI/gateway port distinction | vitest `raven-registry-consistency.test.ts` (4) + `runtime-orchestration.test.ts` still green |
| P1 — Lifecycle supervisor | start/stop local `omnigent` host/server or compose quickstart; status LED on the card | smoke: desktop spawn → `/health` 200 → stop → pidfile gone |
| P2 — Workspace embed | `WorkspaceConsole` panel with hardened webview + deep links | `isAllowedWebviewUrl` rejects non-localhost/remote; vitest for preference hardening; manual embed smoke loads SPA + VAD boots (crossOriginIsolated check) |
| P3 — Read-only session console | Sessions list/detail view of workspace sessions via snapshot+SSE; the **no-mutation CI ban ships in the same commit** (review finding) | vitest against recorded SSE fixture; CI guard test asserting zero session-mutation calls from `cubecloud-agent-*.ts` modules |
| P4 — Skill/bundle promotion | desktop skill → `/v1/agents`/session-create YAML bundle translator + UI | translator test round-trips ≥3 skills; upload 200 + agent appears in `/v1/agents` |
| ↑ **STATUS 4 (2026-10-07): MERGED + PUSHED — V2.10.80 SHIPPED.** `feat/workspace-console-probe` fast-forwarded into `main` (10 commits, `2643cf1..142f3b9`, 45 files, +7,348/−57) and pushed to `origin/main`. Post-merge verification on the merged tree: **140 files / 1510 tests passed** (3 skipped), **0 TS errors**, **0 failed tests**. Version `agent-desktop/package.json` = `2.10.80`; changelog at `agent-desktop/changelogs/2.10.80.md` (live-smoke evidence recorded). All contract phases A–G + rows R1–R7 + decision core DM0–DM2 + I-phase Raven adapter + live smoke (7/7) are now on main. Post-release roadmap: DM3 (Jev-Mem, gated), EverOS `agent_skill` promotion (row K / optional), I-phase WebUI-side polish, M3 appliance mode. |
| P5 — Config center + vault bridge | env generation at provision time, single-writer enforcement, credential handoff | provisioning test writes hash-stamped env; restart picks it up; no secret ever in source |
| P6 — Governance relay | policy/approval visibility in desktop UI | E2E: workspace session awaiting approval appears in desktop inbox, approve → session proceeds |
| P0–P6 — Docs/i18n/legal (per-phase standing rule, folded — review finding) | Each phase lands its own doc/i18n rows (HANDBOOK/handbook/*.zh, README.i18n.md inventory); NOTICE/TRADEMARK updates at the first vendor-adjacent step. Attribution discipline: nothing vendored from cubecloud-agent into this repo — interoperation only | docs-i18n scripts green; attribution check per phase |
| P5 — Auth-bridge pre-decision (gated) | Bridge shape (vault → provision-time env + header/`accounts` injection; never workspace `config.yaml` writes) decided **before** P5 coding starts | written bridge spec in this plan's revision before P5 begins |

### 5.7 Risks & open questions

1. **Webview tag churn (Electron upstream)** — plan webview-first but keep a `WebContentsView` migration note; no code change now.
2. **COOP/COEP inside embed** — SPA needs crossOriginIsolated for VAD; verify on P2's first spike; fallback = open in browser (M1) until confirmed.
3. **Compose rebrand debt upstream** — desktop Docker matching should key on ports/health (`6767`) not image names until `agent-meow-*` refs are rebranded.
4. **Double session truth** — mitigated by contract row D (read-only) + §5.3; must be enforced in CI by banning session-mutation calls from the new module.
5. **Voice ownership ambiguity** — decide per mode (F row) before implementation, not during.
6. **Auth bridging depth** — M0/M1 need only `header`/`accounts`; OIDC bridging (desktop as OIDC client?) is an open design question deferred to P5.
7. **Naming** — user-visible surface naming for the console card ("AI Workspace (agent)") should follow the platform messaging matrix (`docs/V2.10.57-SURFACE-MESSAGING-MATRIX.md`).

---

## 6. What was explicitly NOT done (per the request)

- No implementation, no code changes, no dependency changes in either repo.
- No merging of the two apps; both stay separate, connected only by the contract in §5.2.
- No build/run — the plan documents verification steps for a later execution phase.

**Immediate next actions offered to the user:** (1) review §5.2 contract rows + §5.4 modes and confirm which are in-scope for V2.10.80+; (2) pick the first phase (P0 is additive and low-risk); (3) decide the voice ownership rule (§5.7.5) and naming (§5.7.7) up front.

---

## 7. Plan review record (2026-10-06, autonomous pass)

Both lenses were run on this plan after writing (findings folded back above):

**CEO lens — VERDICT: ship** (with re-scope). MVP = **P0 + P1 only**; cut-list if forced: M2 embed, M3 remote, P4–P6. Target user = pilot appliance operators (tens, next 2 quarters), not "anyone." Success metric: P0–P1 in V2.10.80+ with the full vitest suite green; pilot operators complete console attach in <5 min without manual Docker commands, next rollout cycle. Kill signal: if by the V2.10.82 cycle the console card cannot reach a healthy probe on a real quickstart stack on any validation machine → kill the console surface; end-state fallback is mode M1 (browser SPA + health card), which is itself shippable.

**Engineering lens — VERDICT: sequence-changes-needed (minor, all applied).** Three concrete fixes folded in: (1) P3's no-mutation CI ban must ship in the same commit as P3 (was "later code review"); (2) P7 folded from a phase into a per-phase standing rule (docs/i18n land with each phase); (3) auth-bridge shape must be decided in writing before P5 coding starts. Load-bearing assumption: cubecloud-agent's `/health` + `/v1/info` + `/v1/stack/status` and loopback-port SPA serving stay stable upstream (fallback: pin port in a compose override; probe `/health` only). Build-order DAG: P0 ← nothing; P1 ← P0; P2 ← P0; P3 ← P0 (independent of P1/P2); P4 ← P0; P5 ← P0+P1+decided bridge; P6 ← P3+P5. Rollback: all phases additive — feature-flag removal, no desktop-side migrations. Smoke test: "Open Desktop → Tools → AI Workspace card Running → Open → SPA appears → chat works."

**Resolved while autonomous (defaults recorded, reversible):** voice rule (row F) = when attached, workspace-session voice goes through the workspace proxy; desktop-composer voice (Handy/cloud) stays untouched — row F applies to the embedded/console context only. Naming (§5.7.7) = "AI Workspace" card label on the Tools screen, per the platform messaging matrix; runtime-lane naming untouched. Scope default = M0/M1/M2 in scope; M3 deferred until an appliance pilot demands it; P4–P6 remain roadmap, gated on the CEO MVP verdict (P0+P1 next).