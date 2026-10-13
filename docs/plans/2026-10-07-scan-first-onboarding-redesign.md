# Scan-First Onboarding Redesign (C1-era)

**Date:** 2026-10-07
**Status:** Draft — extends [`2026-06-19-auto-discovery-design.md`](./2026-06-19-auto-discovery-design.md) (approved) to the C0/C1 kernel + browser-shell reality
**Companion docs:** [second-brain doctrine](./2026-10-07-second-brain-doctrine.md), `docs/HANDBOOK.md`, `agent-desktop/README.md` (first-launch flow)

---

## 1. Why now (the bottleneck)

C0/C1 shipped the console kernel (292 IPC channels as HTTP routes) and the
browser shell at `:6770`. The first-run surface is still the **Setup wizard**
(`src/renderer/src/screens/Setup/Setup.tsx`): pick a provider, paste an API
key, choose a base URL, optionally migrate OpenClaw.

That wizard now asks the user to do **the AI Workspace's job**. Under the
two-brain doctrine, gateway wiring and LLM keys live in cubecloud-agent
(`:6767`) — the workspace's own UI and Open WebUI own that configuration. The
console is the operating control plane: it attaches, observes, and governs.
The user's quote that triggered this doc: *"technically we DO NOT need the
'Set up your gateway and setup llm' wizard page anymore."*

Correct. The first-run screen should be a **scan for the AI Workspace**, with
the wizard demoted to a legacy fallback.

## 2. Research evidence

Five sources, gathered 2026-10-07 (firecrawl/agent-reach backends were
unavailable — IP-blocked / unauthenticated — so evidence came from
`fetch_webpage` + `github_repo` + local skill files):

### 2.1 EverOS (EverMind) — demo-first, config-later, capability-honest

Source: `github.com/EverMind-AI/EverOS` README (13.4k★, Apache-2.0).

- `everos demo` runs with **no API key and no server** — the user experiences
  the core loop before any configuration exists.
- `everos init` is a single command that writes two TOML files; the only
  manual step is pasting one key into a pre-filled template.
- `/health` reports a `capabilities` object (`llm: true, embedding: false,
  rerank: false`); features that need a missing capability fail with a **clear
  HTTP 422**, not a crash.

**Pattern for us:** the first-run screen should show a working console even
before a workspace is attached (kernel status, local scan results), and the
attach flow should be one command/one click — not a multi-step wizard. Health
must be capability-honest (which our `workspaceProbe` already is).

### 2.2 Open WebUI — probe at boot, verify on demand, never a wizard

Source: `github.com/open-webui/open-webui` backend source (100k★-scale project).

- `_resolve_ollama_base_url()` in `backend/open_webui/config.py` **port-probes
  11434 → 12434 at boot** with a 1-second socket timeout and zero UI. If the
  default port is dead and the fallback answers, it silently rewrites the URL
  and logs one line.
- `POST /verify` on the Ollama router is the explicit probe-then-attach
  contract the UI calls on demand ("Verify Connection" button).
- Defaults cascade through env (`OLLAMA_BASE_URL` → `host.docker.internal`
  → k8s service) before any user input is required.

**Pattern for us:** scan silently at boot, expose verify-on-demand, and only
surface UI when the probe is ambiguous or empty. This is exactly the shape of
our kernel's `workspaceProbe` + `scanLocalServers` + `diagnoseRemoteConnection`
capabilities — the primitives already exist; the first-run screen just never
used them.

### 2.3 Jan — the contrast case (do not copy)

Source: `github.com/janhq/jan` README (44.8k★, Apache-2.0).

Jan's onboarding is model-download-centric because **Jan owns its engine**
(llama.cpp built in-process). We do not own the workspace — we attach to one.
Copying Jan's "download models on first run" flow would re-create the exact
wizard problem: it would put workspace responsibilities back into the console.

### 2.4 wigolo — init-then-doctor, not wizard-then-support-ticket

Source: local skill file `~/.agents/skills/wigolo/SKILL.md` (user-named peer).

wigolo's entire setup surface is three commands: `wigolo init` (one-shot
first-time setup), `wigolo doctor --fix` (self-repair), `wigolo health --json`
(machine-readable state). No interactive wizard at any step.

**Pattern for us:** first-run = one non-interactive action (scan); recovery =
a doctor-style re-scan with actionable hints, not a longer form.

### 2.5 Local evidence — the primitives already ship

- `agent-desktop/src/main/everos-sidecar.ts` — the sidecar pattern the console
  already uses everywhere: spawn → `/health` probe → status pill. The
  workspace scan is the same pattern over HTTP instead of a child process.
- `src/renderer/src/screens/Models/Models.tsx` (V2.10.60) — `runLocalScan()`
  calls `window.hermesAPI.scanLocalServers([])` and renders suggestions;
  `probeLocalModelHealth` refreshes local cards every 30 s. The scan UX is
  already built and tested — on a different screen.
- `src/renderer/src/screens/Tools/Tools.tsx` — `workspaceProbe()` already
  drives the workspace status card.
- Kernel (C0/C1): all five needed capabilities are seeded and browser-shim
  parity-tested — `workspaceProbe`, `scanLocalServers`,
  `probeLocalModelHealth`, `diagnoseRemoteConnection`, `testRemoteConnection`,
  plus `listWorkspaceSessions` / `listWorkspaceAgents` (NEW_WIRING family).
  The browser console at `:6770` gets all of them through the shim for free.

## 3. The redesign — first run = AI Workspace scan

### Screen 1 — Scan (replaces Welcome/Setup as the entry surface)

Full-bleed brand screen, one line of copy: *"Looking for your AI
Workspace…"*. The kernel probes, in parallel, with a 3-second timeout each:

1. `workspaceProbe` against the default workspace origin (`:6767`, env
   overridable) — the doctrine's first brain.
2. `scanLocalServers([])` — the well-known local-LLM/runtime ports, as a
   fallback hint list.

### Screen 2 — Found (one click, no form)

A single workspace card: health dot, origin, version, live session count
(`listWorkspaceSessions`) and agent count (`listWorkspaceAgents`). One button:
**Connect**.

Deliberately **not** silent auto-connect: doctrine row G fixes exactly ONE
console→workspace write (the elicitation verdict), and attach is a consent
moment. One click honors it; a wizard does not.

### Screen 3 — Not found (three doors, zero key fields)

1. **Start with Docker** — shows the compose quickstart command with a copy
   button (the workspace is the thing that starts, not the console).
2. **Scan again** — the wigolo-style doctor re-scan.
3. **Advanced: connect manually** — a single URL field (the old wizard's URL
   input, demoted). The provider/API-key/OAuth/OpenClaw-migration flow is
   **gone from the first-run path**.

### Wizard demotion (not deletion)

`Setup.tsx`'s provider-key flow moves behind **Settings → Advanced → Legacy
gateway setup**, for the direct-gateway attach case (Hermes/IronClaw without a
workspace). The component survives; its position in the flow does not.

## 4. What we reuse (no new primitives)

| Need | Existing primitive |
|---|---|
| Workspace probe | kernel `workspaceProbe` (seeded, shim-tested) |
| Port scan | kernel `scanLocalServers` + Models.tsx `runLocalScan` UI pattern |
| Health polling | Models.tsx 30 s `probeLocalModelHealth` interval pattern |
| Session/agent counts | kernel `listWorkspaceSessions` / `listWorkspaceAgents` |
| Auth warning | existing `VerifyWarningBanner` |
| Model discovery | `useDiscoveredModels` hook (unchanged, workspace-side now) |

## 5. Browser-shell parity

Every capability in §4 is seeded in `console-backend/server.ts` and therefore
served at `:6770` through the generated shim. The scan-first flow is
**identical** in the Electron window and the browser console — no
`isElectron` branches. This is the C1 contract doing its job.

## 6. Metrics (carried from the 2026-06-19 doc, plus one)

1. **Time-to-first-chat** < 15 s on a pre-configured machine (local JSON log).
2. **Setup completion** — 90%+ reach Chat without abandoning.
3. **Tool activation** — 30%+ install one support surface in week one.
4. **New — scan-hit rate:** 80%+ of first runs on compose hosts find the
   workspace on the first scan. If this misses, the scan targets are wrong,
   not the users.

No cloud telemetry; local JSON logs only (local-first contract).

## 7. Wrong / exit ramps

- **Wrong workspace found (multiple candidates):** one-click picker, never
  auto-pick with ambiguity (2026-06-19 Wrong #1, unchanged).
- **Auth-required workspace (401/403):** one key prompt, stored via the
  existing auth file; never a silent failure (Wrong #2).
- **Scan hangs:** 3 s per-probe timeout, fully parallel; the not-found screen
  is always reachable (Wrong #5).
- **User actually wants direct-gateway mode:** the demoted wizard stays
  reachable from Settings — no dead end.

## 8. Implementation order

1. `FirstRunScan` screen component (Screens 1–3 above) + route wiring in the
   app shell; `SplashScreen → FirstRunScan → Chat`.
2. Demote `Setup.tsx` out of the first-run path into Settings → Advanced.
3. Tests: rename/extend `Setup.test.tsx` → `FirstRunScan.test.tsx` — scan
   found / not-found / multiple-found / auth-required fixtures, mocking the
   four kernel capabilities.
4. i18n: new strings in `en` + `zh-CN` (the repo's two shipped locales).
5. Verify ladder: `npm run typecheck`, full vitest suite, parity script
   (17/17), and a live `:6770` Playwright pass against the real fabric.
