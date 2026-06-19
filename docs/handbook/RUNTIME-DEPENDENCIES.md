# Agent Desktop — Runtime Dependencies and Integration Surfaces

> **Audience:** downstream user evaluating the desktop, OEM partner, or
> new contributor onboarding. This is the single doc that answers
> "what does the Agent Desktop need to run, and where does each
> thing live?" It links out to deeper docs rather than restating
> them, per the Cubecloud handbook pattern.

---

## 0. One-line mental model

**The Agent Desktop is a client.** It bundles a GUI, an Electron main
process, a Vite-bundled React 19 renderer, an IPC bridge, a 35-skill
developer-ergonomics surface, and (optionally) a CodeGraph, EverOS,
and Headroom sidecar. It does **not** bundle a model server, an
agent runtime, a code-intelligence engine, or a memory harness. You
install those yourself; the desktop attaches to them.

This is the swappable-surfaces contract from
[`docs/HANDBOOK.md` §1](../HANDBOOK.md). It is a commitment, not a
convenience — the desktop's value is the managed operating layer,
not which tool is running at any moment.

---

## 1. Agent runtimes (the three lanes)

The "Connect to remote gateway" form in
`agent-desktop/src/renderer/src/screens/Settings/Settings.tsx` and
`agent-desktop/src/renderer/src/screens/Welcome/Welcome.tsx`
(V2.10.61 work) has three lanes: Hermes, OpenClaw, IronClaw. The
renderer lane picker decides which preset the main process passes
to `diagnoseRemoteConnection(url, expectedRuntime, apiKey)` in
[`agent-desktop/src/main/hermes.ts:239`](../../agent-desktop/src/main/hermes.ts#L239).

### 1.1 Hermes — local or remote? Both, but you install it

| Aspect | Value |
|---|---|
| **Default URL** | `http://127.0.0.1:8642/health` (`DEFAULT_LOCAL_GATEWAY_PORT = 8642` in [`agent-desktop/src/shared/runtime-defaults.ts:3`](../../agent-desktop/src/shared/runtime-defaults.ts#L3)) |
| **Install paths** | `pip install hermes-agent` (Python), or download the `hermes-desktop` binary. Either exposes `/health` + `/v1/models` and is attachable. |
| **Transport** | Plain HTTP loopback by default; the operator owns TLS, auth, and the SSH tunnel that backs a remote attach. |
| **Probe shape** | 200 `/health` ⇒ `runtime: "hermes"`. See the V2.10.63 attach smoke in [`tests/hermes-agent-attach.smoke.test.ts`](../../agent-desktop/tests/hermes-agent-attach.smoke.test.ts) for the 6-code contract. |
| **Operator runbook** | [`docs/hermes-agent-attach.smoke.md`](../hermes-agent-attach.smoke.md) |
| **What the desktop does** | Attaches. Does **not** install, spawn, or upgrade Hermes. |

### 1.2 OpenClaw — Windows install or Docker; default port 18789

| Aspect | Value |
|---|---|
| **Default URL** | `http://127.0.0.1:18789/health` (`OPENCLAW_LOCAL_GATEWAY_PORT = 18789` in [`agent-desktop/src/shared/runtime-defaults.ts:4`](../../agent-desktop/src/shared/runtime-defaults.ts#L4)) |
| **Install paths** | Native Windows binary (operator installs on Windows), **or** Docker container with port 18789 published. |
| **Probe shape** | 404 `/health` + 200 `/v1/models` with `data: [{id: "openclaw/default"}]` ⇒ `runtime: "openclaw"`. See `isOpenClawModelsResponse` in [`agent-desktop/src/main/hermes.ts`](../../agent-desktop/src/main/hermes.ts). |
| **What the desktop does** | Attaches. Does **not** install, spawn, or upgrade OpenClaw. |

### 1.3 IronClaw — Docker compose through upstream GHCR; gateway port 3231

| Aspect | Value |
|---|---|
| **Default URL** | `http://192.168.1.100:3231/api/health` (`IRONCLAW_DEFAULT_PORT = 3231` in [`agent-desktop/src/shared/runtime-defaults.ts:11`](../../agent-desktop/src/shared/runtime-defaults.ts#L11)). The gateway port (container 3000 → host 3231) exposes the OpenAI-compatible `/v1/chat/completions` and `/v1/models` surface. |
| **Default install** | **Compose-through-upstream-GHCR, no local build.** Image source: `ghcr.io/pewdiepie-archdaemon/odysseus`. Host port remap is expected/desired (e.g. host 3231 → container 3000). |
| **Probe shape** | IronClaw's `/api/health` returns `{"status":"healthy","channel":"gateway"}` — the `"channel":"gateway"` field distinguishes it from Hermes's `/health`. SSH attach now reuses the forwarded-gateway path and expects the same `/api/health` surface behind the tunnel. |
| **Port map** | Port 3231 (container 3000) = HTTP gateway (chat + models + web UI). Port 8281 (container 8080) = internal HTTP channel bus (only `/health`, no REST API). Port 50051 = gRPC (NearAI protocol, not HTTP). |
| **Operator runbook** | [`docs/ironclaw-attach.smoke.md`](../ironclaw-attach.smoke.md) (V2.10.62) |
| **What the desktop does** | Attaches to the gateway port. Does **not** install, spawn, or upgrade IronClaw. |

#### 1.3.1 IronClaw native API surface (V2.10.67 — documented; browser SSE bridge not yet implemented)

IronClaw's gateway on port 3231 exposes **two API surfaces**:

**OpenAI-compatible** (currently used by the Sandbox Tasks screen):

| Endpoint | Method | Status | Description |
|---|---|---|---|
| `/v1/chat/completions` | POST | 200 | Non-streaming chat completions (OpenAI format) |
| `/v1/models` | GET | 200 | Model list (`{"data":[{"id":"...","owned_by":"ironclaw"}]}`) |

**Native SSE + Jobs** (discovered V2.10.67, planned for V2.10.6x upgrade):

| Endpoint | Method | Status | Description |
|---|---|---|---|
| `/api/health` | GET | 200 | `{"status":"healthy","channel":"gateway"}` |
| `/api/chat/events?token=<token>` | GET (SSE) | 200 `text/event-stream` | Live streaming chat updates via Server-Sent Events |
| `/api/jobs` | GET | 200 | Job queue — returns `{"jobs":[{"id","title","state","created_at","started_at"}]}` |
| `/api/status` | GET | 404 on this build | Documented but not available in current container version |
| `/api/memory` | GET | 404 on this build | Documented but not available in current container version |
| `/api/chat` | POST | 404 on this build | Documented but not available in current container version |

**SSE event types** (named events on the `/api/chat/events` stream):

The live browser client uses `EventSource` against `/api/chat/events`, and the gateway responds with `content-type: text/event-stream`. The docs mention WebSocket troubleshooting elsewhere, but WebSocket is not the primary browser chat transport on the current 3231 gateway build.

| Event | Description |
|---|---|
| `stream_chunk` | Text chunk (like our `chat-chunk` IPC) |
| `response` | Complete response |
| `thinking` | Reasoning / thinking tokens |
| `tool_started` | WASM sandbox tool execution started |
| `tool_result` | Tool execution result |
| `tool_completed` | Tool execution completed |
| `approval_needed` | Human-in-the-loop approval required |
| `gate_required` | Security gate triggered |
| `gate_resolved` | Security gate resolved |
| `status` | Status update |
| `plan_update` | Plan / task plan update |
| `suggestions` | Follow-up suggestions |
| `error` | Error event |

**Jobs API** (`/api/jobs`):

Returns a job queue with real entries:
```json
{
  "jobs": [
    {
      "id": "d9477a8d-...",
      "title": "sandbox-worker-smoke-...",
      "state": "completed",
      "user_id": "default",
      "created_at": "2026-06-09T15:48:08.760876+00:00",
      "started_at": "2026-06-09T15:48:09.044724+00:00"
    }
  ]
}
```

Job states observed: `completed`. Expected: `pending`, `active`, `completed`, `failed`.

**Auth:** All native API endpoints require `GATEWAY_AUTH_TOKEN` either as
`Authorization: Bearer <token>` header or `?token=<token>` query parameter.

**Upgrade plan (V2.10.6x):** Switch the Sandbox Tasks screen from the
OpenAI-compatible non-streaming API to the native SSE + Jobs API for:
- Real-time streaming responses (`stream_chunk` events)
- WASM sandbox tool execution visibility (`tool_started` → `tool_result` → `tool_completed`)
- Job queue tracking (submit, list, monitor state transitions)
- Human-in-the-loop approval flow (`approval_needed` events)

### 1.4 All three lanes side-by-side

| Lane | Default port | Local install | Remote attach | SSH lane | Lane added |
|---|---|---|---|---|---|
| **Hermes** | 8642 | `pip install hermes-agent` or `hermes-desktop` binary | Yes | Yes | V1 |
| **OpenClaw** | 18789 | Windows binary or Docker | Yes | Yes | V2.6 → V2.7 |
| **IronClaw** | 3231 | Docker compose, GHCR `pewdiepie-archdaemon/odysseus` | Yes | **Yes** (forwarded gateway attach) | V2.10.61 |

---

## 2. Model providers (separate from the runtime layer)

The provider layer is independent of the runtime layer. The
desktop's model registry can swap providers without touching which
runtime (Hermes / OpenClaw / IronClaw) is on the other side.

| Provider | Type | Install | Discovery |
|---|---|---|---|
| **Ollama** | Local HTTP server | Operator installs; loopback by default | V2.10.60 local-server scan ([`agent-desktop/src/main/local-server-scan.ts`](../../agent-desktop/src/main/local-server-scan.ts)) |
| **LM Studio** | Local HTTP server (OpenAI-compatible) | Operator installs; loopback by default | V2.10.60 local-server scan |
| **vLLM** | Local HTTP server | Operator installs | Manual (Settings form) |
| **llama.cpp** | Local HTTP server (`--server`) | Operator installs | Manual (Settings form) |
| **OpenAI** | Remote HTTPS | API key in Settings form | Manual |
| **Azure OpenAI** | Remote HTTPS | Endpoint + key in Settings form | Manual |
| **OpenRouter** | Remote HTTPS | API key in Settings form | Manual |

**Provider registry contract:** [`packages/platform-core/src/index.ts`](../../packages/platform-core/src/index.ts). The renderer surfaces the registry through the **Providers** screen at [`agent-desktop/src/renderer/src/screens/Providers/Providers.tsx`](../../agent-desktop/src/renderer/src/screens/Providers/Providers.tsx).

**Key handling:** the apply layer at the form-input boundary
owns the API key. The probe does **not** read provider keys from
the env. The credential never leaves the renderer's React state
except in the `Authorization: Bearer <key>` header that
`diagnoseRemoteConnection` forwards on a Test-Connection click.

---

## 3. Optional sidecars (CodeGraph, EverOS, Headroom)

All three are **operator-installed, desktop-spawned**. The desktop
ships a lifecycle manager for each one but does **not** ship the
sidecar binary.

### 3.1 CodeGraph — semantic code-intelligence surface

| Aspect | Value |
|---|---|
| **Source of truth** | [`agent-desktop/docs/CODEGRAPH-RUNTIME.md`](../../agent-desktop/docs/CODEGRAPH-RUNTIME.md) |
| **Two backends** | (a) CLI subprocess (inherited) at `src/main/codegraph-runtime.ts`; (b) embedded SDK wrapper (Cubecloud-original) at `src/main/codegraph.ts` |
| **Operator install** | `pip install codegraph`; then `codegraph init` in the target repo |
| **Renderer surface** | [`agent-desktop/src/renderer/src/screens/CodeGraph/CodeGraph.tsx`](../../agent-desktop/src/renderer/src/screens/CodeGraph/CodeGraph.tsx) |
| **What the desktop does** | Spawns the CLI subprocess (default) or imports the SDK in-process (opt-in). Does **not** install CodeGraph. |

### 3.2 EverOS — memory harness + sidecar

| Aspect | Value |
|---|---|
| **Source of truth** | [`agent-desktop/docs/EVEROS-SIDECAR.md`](../../agent-desktop/docs/EVEROS-SIDECAR.md) |
| **Lifecycle manager** | [`agent-desktop/src/main/everos-sidecar.ts`](../../agent-desktop/src/main/everos-sidecar.ts) |
| **Operator install** | `pip install everos` |
| **Renderer surface** | [`agent-desktop/src/renderer/src/screens/EverOS/EverOS.tsx`](../../agent-desktop/src/renderer/src/screens/EverOS/EverOS.tsx) |
| **Memory harness** | The sidecar backs the desktop's `Memory` screen (sessions, profiles, memories, learnings, capacity bar). The desktop is the **client**; the sidecar is the **server**. |
| **What the desktop does** | Spawns `everos server start` as a child process; proxies IPC to the renderer. Does **not** install EverOS. |
| **Is it preinstalled?** | No. Optional upgrade over the built-in SQLite-backed memory plane in `apps/desktop-shell/src/state/**`. |

### 3.3 Headroom — context-compression plane

| Aspect | Value |
|---|---|
| **Source of truth** | [`docs/agent-skills-bundle/HEADROOM.md`](../agent-skills-bundle/HEADROOM.md) (install/use guide) + [`.github/skills/headroom-workflow/SKILL.md`](../../.github/skills/headroom-workflow/SKILL.md) (workflow skill) |
| **Lifecycle manager** | [`agent-desktop/src/main/headroom.ts`](../../agent-desktop/src/main/headroom.ts), [`headroom-sidecar.ts`](../../agent-desktop/src/main/headroom-sidecar.ts) |
| **MCP server wrapper** | [`agent-desktop/src/main/mcp/headroom-mcp-server.ts`](../../agent-desktop/src/main/mcp/headroom-mcp-server.ts) |
| **CodeGraph → Headroom** | [`agent-desktop/src/main/headroom-bundle.ts`](../../agent-desktop/src/main/headroom-bundle.ts) compresses CodeGraph bundles before they hit the renderer |
| **Renderer surface** | [`agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`](../../agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx) |
| **Five integration planes** | (1) Desktop runtime; (2) repo-local Copilot; (3) global Copilot/VS Code; (4) MCP server; (5) CodeGraph → Headroom. See the workflow skill. |
| **Operator install** | `pip install headroom`; then start the proxy from the Headroom screen |
| **What the desktop does** | Spawns the Python proxy sidecar on a local loopback port. Does **not** install Headroom. |

### 3.4 Sidecar summary

| Sidecar | Type | Where it spawns | Default port | Renderer screen | Mandatory? |
|---|---|---|---|---|---|
| **CodeGraph** | CLI subprocess **or** embedded SDK | In-process (SDK) or child process (CLI) | Loopback (CLI varies) | `CodeGraph/` | Optional |
| **EverOS** | Python sidecar (`everos server start`) | Child process | Loopback (configurable) | `EverOS/` | Optional (SQLite fallback) |
| **Headroom** | Python proxy sidecar + MCP server | Child process | Loopback (configurable) | `Headroom/` | Optional (no compression fallback) |

---

## 4. Skills layer (Fable, taste, caveman, etc.) — developer surface, not user-facing

> **Per [`docs/HANDBOOK.md:161`](../HANDBOOK.md#L161):** *"The
> skills layer is **not** shipped to the end user of the desktop
> binary; it is a developer-ergonomics surface for the contributors
> to the cubecloud-agentic-os stack."*

### 4.1 How a contributor uses them

The skills live in
`.agents/skills/<name>/SKILL.md` and auto-activate based on the
`description` frontmatter. The agent runtime (Copilot Chat today;
any skill-aware runtime tomorrow) loads them. The contributor
invokes them by writing a request that matches the description
("use fable mode", "be terse", "follow the four principles",
"redesign this landing page", etc.) — not by clicking a button.

**Where to mirror globally:** [`.agents/skills/`](../../.agents/skills/)
(repo-local) or `~/.agents/skills/` (global mirror). See
[`docs/GLOBAL-INSTALL-PLAN.md`](../GLOBAL-INSTALL-PLAN.md) and the
bundle installer at [`docs/agent-skills-bundle/`](../agent-skills-bundle/).

### 4.2 Skill families

| Family | Count | Trigger examples | Where documented |
|---|---|---|---|
| **Karpathy 4 principles** | 1 | "follow the four principles", "be surgical" | [`karpathy-guidelines`](../../.agents/skills/karpathy-guidelines/SKILL.md) |
| **Taste** (frontend / design) | 11 | "redesign this", "anti-slop landing page" | Each skill's `SKILL.md`; bundle install path |
| **Fable mode** | 1 | "use fable mode", "autonomous run" | The skill itself |
| **po-*** (Matt Pocock) | 7 | "TDD this", "diagnose this", "write a skill" | Each `po-*/SKILL.md` |
| **sp-*** (Stanislas Polu) | ~10 | "sp-plan", "sp-execute", "sp-worktree" | Each `sp-*/SKILL.md` |
| **gstack-*** (CEO/eng/design/QA review) | ~6 | "review like a CEO", "QA before release" | The skill itself; **separate runtime — Claude Code** |
| **Headroom workflow** | 1 | "headroom", "context compression" | [`.github/skills/headroom-workflow/SKILL.md`](../../.github/skills/headroom-workflow/SKILL.md) |
| **Docs i18n refresh** | 1 | "screenshot refresh", "PDF re-render" | [`.github/skills/docs-i18n-refresh/SKILL.md`](../../.github/skills/docs-i18n-refresh/SKILL.md) |

### 4.3 How a desktop end user sees them

**They don't.** The skills are loaded by the agent runtime, not
by the renderer. The renderer's 24 screens (Welcome, Chat, Kanban,
Memory, Workspace, Providers, Install, CodeGraph, EverOS, Headroom,
Mcp, Settings, etc.) are **not** the skills surface. The closest
user-facing analog is the **MCP screen** (`Mcp/Mcp.tsx`) which lists
registered MCP servers, and the **Memory screen** which surfaces
the agent-runtime memory plane. But the skills themselves never
render in the GUI.

### 4.4 Handbook coverage

- **For the contributor:** [`docs/HANDBOOK.md` §5](../HANDBOOK.md#L155) — full 35-skill table, upstream sources, license, install paths.
- **For the global installer:** [`docs/GLOBAL-INSTALL-PLAN.md`](../GLOBAL-INSTALL-PLAN.md) + [`docs/agent-skills-bundle/`](../agent-skills-bundle/).
- **For the end user:** no end-user handbook for the skills. The desktop binary does not advertise them. By design.

---

## 5. The full dependency list (TL;DR table)

| What | Who installs | Install command | Default port | What the desktop does |
|---|---|---|---|---|
| **Hermes** | Operator | `pip install hermes-agent` or `hermes-desktop` binary | 8642 | Attaches |
| **OpenClaw** | Operator | Windows binary or Docker | 18789 | Attaches |
| **IronClaw** | Operator | Docker compose, GHCR `pewdiepie-archdaemon/odysseus` | 3231 (container 3000) | Attaches |
| **Ollama** | Operator | `curl -fsSL https://ollama.com/install.sh \| sh` | 11434 | Discovers via V2.10.60 scan |
| **LM Studio** | Operator | Download from `lmstudio.ai` | 1234 | Discovers via V2.10.60 scan |
| **vLLM** | Operator | `pip install vllm` | 8000 (configurable) | Manual attach |
| **llama.cpp** | Operator | Build from source | 8080 (configurable) | Manual attach |
| **OpenAI / Azure OpenAI / OpenRouter** | Operator | API key in Settings form | n/a (HTTPS) | Attaches over HTTPS |
| **CodeGraph** (optional) | Operator | `pip install codegraph` + `codegraph init` | Loopback | Spawns CLI or imports SDK |
| **EverOS** (optional) | Operator | `pip install everos` | Loopback | Spawns sidecar |
| **Headroom** (optional) | Operator | `pip install headroom` | Loopback | Spawns proxy + hosts MCP |
| **{{SKILLS_TOTAL}} skills** | **The agent runtime** (Copilot Chat etc.) | `node .agents/skills/install.cjs` (or global mirror) | n/a | Loaded by the runtime, not the renderer |

---

## 6. Where to look next

- **Architecture deep-dive:** [`docs/handbook/ARCHITECTURE.md`](ARCHITECTURE.md)
- **Development guide:** [`docs/handbook/DEVELOPMENT.md`](DEVELOPMENT.md)
- **Operations guide:** [`docs/handbook/OPERATIONS.md`](OPERATIONS.md)
- **Master handbook:** [`docs/HANDBOOK.md`](../HANDBOOK.md) (1-screen tour, links out)
- **Threat model:** [`THREAT_MODEL.md`](../../THREAT_MODEL.md)
- **Security policy:** [`SECURITY.md`](../../SECURITY.md)
- **Runtime orchestration plan:** [`agent-desktop/docs/RUNTIME_ORCHESTRATION_PLAN.md`](../../agent-desktop/docs/RUNTIME_ORCHESTRATION_PLAN.md)
- **Brand and license:** [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md)

---

**Attribution:** swappable-surfaces contract adapted from the
upstream `hermes-desktop` framework (MIT). Cubecloud-original work
in this doc is dual-licensed under AGPL-3.0-or-later, Apache-2.0,
or MIT (AGPL primary).
