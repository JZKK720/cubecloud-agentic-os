# Runtime Implementation Plan — Agent Desktop

**Date:** 2026-07-01
**Status:** Draft — awaiting review
**Based on:** Full codebase audit of `agent-desktop/src/main/` runtime layer

---

## 1. What's already working (audit findings)

The runtime layer is more mature than the stale architecture docs suggested. Here's what's live:

| Capability | File | Status |
|---|---|---|
| Runtime detection (all 3) | `hermes.ts:diagnoseRemoteConnection()` | ✅ IronClaw via `/api/health` + `"channel":"gateway"`, Hermes via `/health`, OpenClaw via `/v1/models` |
| Multi-runtime chat routing | `hermes.ts:sendMessageViaApi()` | ✅ `runtimeKind` variable handles `hermes`, `openclaw`, `ironclaw` (lines 808, 861, 884-889, 918-919, 925, 1029) |
| Auto-discovery scan | `auto-discovery.ts:scanLocalhostRuntimes()` | ✅ Parallel port probes for all 3 runtimes |
| IronClaw sandbox tasks | `ironclaw-sandbox.ts` | ✅ `probeIronClawGateway`, `listIronClawModels`, `dispatchSandboxTask` |
| Gateway runtime cache | `hermes.ts:gatewayRuntimeCache` | ✅ In-memory Map, survives re-probes |
| SSH tunnel support | `hermes.ts:ensureSshTunnelIfNeeded()` | ✅ |
| API server auto-config | `hermes.ts:ensureApiServerConfig()` | ✅ Auto-generates `API_SERVER_KEY` on fresh install |
| Runtime registry | `runtime-registry.ts`, `runtime-provider-actions.ts`, `task-orchestrators.ts` | ✅ Shared orchestration layer |
| Runtime types | `packages/platform-core/src/index.ts` | ✅ `PlatformRuntimeProviderId`, `PlatformRuntimeProviderDescriptor`, etc. |

## 2. What needs to be done

### Phase 1: Wire auto-discovery into app startup

**Files:** `agent-desktop/src/main/index.ts`, `agent-desktop/src/renderer/src/App.tsx`

The `scanLocalhostRuntimes()` function exists but may not be called on first launch. Wire it into the app startup flow:

- On first launch (no saved connection config in `desktop.json`), call `scanLocalhostRuntimes()`
- One healthy gateway found → auto-connect, land in Chat
- Multiple healthy → show one-click picker (two buttons, no form)
- Zero healthy → fall back to current Welcome screen with scan result as hint

→ **verify:** Fresh install (no `desktop.json`) → auto-connects to running Hermes on 8642 → lands in Chat. `npm run typecheck --workspace cubecloud-agent-desktop` passes.

### Phase 2: Add runtime-lane indicator in Chat header

**Files:** `agent-desktop/src/renderer/src/screens/Chat/`

Show which runtime is active in the Chat screen header (e.g., "Hermes · port 8642" or "IronClaw · port 3231"). The `runtimeKind` is already available in `sendMessageViaApi` — expose it to the renderer via the existing IPC bridge.

→ **verify:** Chat header shows runtime name + port. Switching runtimes updates the indicator.

### Phase 3: Runtime health monitoring + reconnect

**Files:** `agent-desktop/src/main/hermes.ts`, `agent-desktop/src/main/index.ts`

Add a periodic health check (every 30s) for the active runtime using the existing `diagnoseRemoteConnection()`. If the runtime becomes unreachable, show a non-blocking banner in Chat ("Hermes disconnected — retrying...") and auto-reconnect when it comes back.

→ **verify:** Kill Hermes process → banner appears. Restart Hermes → auto-reconnects, banner disappears.

### Phase 4: Fix stale `openclaw-remote-adapter.ts` reference in docs

**Files:** `agent-desktop/AGENTS.md`, `docs/handbook/ARCHITECTURE.md` (already fixed)

The architecture doc referenced `openclaw-remote-adapter.ts` which doesn't exist. The actual OpenClaw code lives inline in `hermes.ts` (detection, model override, chat routing). Both files have been updated to reflect this.

→ **verify:** `grep_search` for `openclaw-remote-adapter` returns 0 results in tracked files.

## 3. Out of scope (explicit)

- Docker API scanning or LAN discovery (per approved design doc `docs/plans/2026-06-19-auto-discovery-design.md`)
- New Settings UI for IronClaw config (reuse existing Model card)
- OpenClaw full integration (the existing `openclaw` branch in `sendMessageViaApi` handles detection and routing; full feature parity is a separate plan)
- Runtime orchestrator subdirectory refactor (keep flat files — the code is simpler this way)
- CDP/Playwright smoke tests for IronClaw chat (add after Phase 1 is stable)

## 4. Risk register

1. **Auto-discovery port conflicts.** If the user has multiple Hermes instances on different ports, the auto-discovery picker must handle the "multiple healthy" case gracefully. **Mitigation:** Rank by response time; prefer port 8642 (default) when multiple are healthy.

2. **IronClaw API contract mismatch.** The IronClaw chat API may not be a drop-in OpenAI-compatible `/v1/chat/completions` endpoint. The Sandbox Tasks screen uses `ironclaw-dispatch` IPC → `dispatchSandboxTask` in `ironclaw-sandbox.ts`, which may use a different API shape than chat. **Mitigation:** The `sendMessageViaApi` already has `runtimeKind === "ironclaw"` branches — verify they work with a real IronClaw instance.

3. **SSE streaming compatibility.** IronClaw may use a different SSE format than Hermes. The existing `sse-parser.ts` is Hermes-shaped. **Mitigation:** Test with a real IronClaw instance; add format detection if needed.

## 5. References

- Auto-discovery design: `docs/plans/2026-06-19-auto-discovery-design.md`
- IronClaw chat routing draft: `docs/plans/ironclaw-main-chat-routing.draft.md`
- Architecture deep-dive: `docs/handbook/ARCHITECTURE.md` (updated V2.10.73)
- Handbook: `docs/HANDBOOK.md`
- Runtime orchestration types: `agent-desktop/src/shared/runtime-orchestration.ts`
- Agent CLI catalog: `agent-desktop/src/shared/agent-clis.ts`
- CI gate: `.github/workflows/ci.yml`
