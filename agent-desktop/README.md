<p align="center">
  <img width="360" alt="Cubecloud" src="build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agent Desktop — the binary

> **This is the install + features doc for the desktop binary.** The
> agentic-OS monorepo README lives at
> [`../README.md`](../README.md); the master index for *what this is,
> why it is the way it is, and where to look next* lives at
> [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md).

Cubecloud Agent Desktop is a native Electron desktop that gives one
operator a single control plane for **runtime choice**, **provider
choice**, **skills**, **memory**, **schedules**, and **optional code
intelligence** — without coupling the workflow to a hosted wrapper or
a single-vendor CLI.

**Latest release: [v2.10.71](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71)** —
first post-wrapper build of the inner product, asar 176.92 MB
containing 21,291 `node_modules/` entries. `verify:bundle` 7/7 PASS.

## What the user sees

- A **multi-runtime picker** on first launch — Hermes (default, port
  8642), IronClaw (gateway-handoff, port 3231), and OpenClaw
  (optional, port 18789). Runtime choice and provider choice are
  separate decisions.
- A **provider layer** that talks to local providers (Ollama, LM
  Studio, vLLM, llama.cpp, any OpenAI-compatible endpoint) and remote
  APIs (OpenAI, Anthropic, Google Gemini, Azure OpenAI, OpenRouter,
  plus the operator's own gateway).
- A **Models page** that scans `127.0.0.1` for running local servers
  and surfaces one-click Ollama / LM Studio suggestions, with a
  per-card health dot refreshed on a 30-second probe interval.
- A **chat surface** with SSE streaming, Markdown rendering, syntax
  highlighting, and a token-usage footer.
- **Session management** — full-text search (SQLite FTS5), date-grouped
  history, resume and cross-conversation search.
- **Profile switching** — isolated per-profile providers, sessions,
  and state.
- **Sandbox Tasks** screen (V2.10.65) for IronClaw WASM-sandbox
  workflows.
- **Optional sidecars** — CodeGraph (semantic code intelligence),
  EverOS (memory + harness), Headroom (context compression) — all
  user-initiated, not silently installed.
- **Skill, memory, schedule, kanban, and plan** surfaces backed by
  inspectable JSON registries under the user's control.
- **Auto-updater** via `electron-updater` pointing at this repo's
  GitHub Releases feed.
- **i18n** — 8 locales wired through i18next.

## Preview

Every image below is a full-page capture from the current desktop
build. The gallery covers onboarding, runtime discovery, and every
major operator surface exposed in the sidebar.

<table>
<tr>
<td width="50%" align="center"><b>Welcome &amp; first-run</b><br/><img width="100%" alt="Welcome" src="previews/welcome.png" /></td>
<td width="50%" align="center"><b>Remote gateway attach</b><br/><img width="100%" alt="Remote gateway" src="previews/welcome-remote.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>SSH-tunnel handoff</b><br/><img width="100%" alt="SSH handoff" src="previews/welcome-ssh.png" /></td>
<td width="50%" align="center"><b>Runtime detection</b><br/><img width="100%" alt="Runtime detection" src="previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Chat (SSE streaming)</b><br/><img width="100%" alt="Chat" src="previews/chat.png" /></td>
<td width="50%" align="center"><b>Sessions (SQLite FTS5)</b><br/><img width="100%" alt="Sessions" src="previews/sessions.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Profiles</b><br/><img width="100%" alt="Profiles" src="previews/agents.png" /></td>
<td width="50%" align="center"><b>Persona (legacy)</b><br/><img width="100%" alt="Persona" src="previews/persona.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Plans</b><br/><img width="100%" alt="Plans" src="previews/plans.png" /></td>
<td width="50%" align="center"><b>CodeGraph (optional sidecar)</b><br/><img width="100%" alt="CodeGraph" src="previews/codegraph.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>EverOS (optional sidecar)</b><br/><img width="100%" alt="EverOS" src="previews/everos.png" /></td>
<td width="50%" align="center"><b>Headroom (optional sidecar)</b><br/><img width="100%" alt="Headroom" src="previews/headroom.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Models (Ollama + LM Studio scan)</b><br/><img width="100%" alt="Models" src="previews/models.png" /></td>
<td width="50%" align="center"><b>Providers</b><br/><img width="100%" alt="Providers" src="previews/providers.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Skills</b><br/><img width="100%" alt="Skills" src="previews/skills.png" /></td>
<td width="50%" align="center"><b>Memory</b><br/><img width="100%" alt="Memory" src="previews/memory.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Tools</b><br/><img width="100%" alt="Tools" src="previews/tools.png" /></td>
<td width="50%" align="center"><b>Workspace</b><br/><img width="100%" alt="Workspace" src="previews/workspace.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Schedules</b><br/><img width="100%" alt="Schedules" src="previews/schedules.png" /></td>
<td width="50%" align="center"><b>Gateway</b><br/><img width="100%" alt="Gateway" src="previews/gateway.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>MCP</b><br/><img width="100%" alt="MCP" src="previews/mcp.png" /></td>
<td width="50%" align="center"><b>Settings</b><br/><img width="100%" alt="Settings" src="previews/settings.png" /></td>
</tr>
</table>

## Install

The latest stable installer is **v2.10.71**, published at
<https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71>.
Older releases are listed on the
[Releases page](https://github.com/JZKK720/cubecloud-agentic-os/releases).
v0.6.0 and v0.6.1 are marked pre-release because they were built
from the now-retired `apps/desktop-shell/` wrapper tree; **use v2.10.71
or later**.

### Windows

Download
`cubecloud-agent-desktop-2.10.71-setup.exe` from the
[v2.10.71 release](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.71)
and run it. The NSIS installer is one-click per-user and registers
`cubecloud-agent-desktop` in Windows Programs and Features.

> **Windows users:** The installer is not code-signed. Windows
> SmartScreen will warn on first launch — click **More info** →
> **Run anyway**. Code signing is a known follow-up; see
> [`../docs/legal/COMMERCIAL_LICENSE.md`](../docs/legal/COMMERCIAL_LICENSE.md)
> for the OEM-build path that includes a corporate certificate.

For an installer-free option, download
`cubecloud-agent-desktop-2.10.71-portable.exe` instead — single-file
portable that runs without an install step.

### macOS / Linux

`electron-builder` produces macOS (`.dmg`) and Linux (`.deb`, `.rpm`,
`.AppImage`, `.snap`) targets, but the CI build pipeline in this
repo only ships the Windows artifacts today. Multi-platform CI is a
follow-up that requires App Store Connect, code-signing, and Linux
store credentials in the repo settings.

## How it works

On first launch, the app:

1. Asks whether you want to run the agent **locally** (the desktop
   spawns the runtime on `127.0.0.1:<port>`), connect to a
   **remote** gateway over HTTPS, or **SSH-tunnel** through a
   forwarded port.
2. **Local mode:** checks whether the chosen runtime is already
   running; if not, runs the official installer with dependency
   resolution and progress tracking.
3. **Remote / SSH mode:** prompts for the gateway URL, validates the
   `/v1/models` endpoint over HTTPS, and skips the local install.
4. Prompts for the **provider** (local model endpoint or remote API)
   and stores the credential in the per-profile credential pool.
5. Launches the main workspace once setup is complete.

In local mode, chat requests go through `http://127.0.0.1:8642`
(Hermes) or `http://127.0.0.1:3231` (IronClaw) with SSE streaming. In
remote mode, the app talks to the configured remote URL with the
same streaming protocol. The renderer parses the stream in real time,
rendering tool progress, Markdown content, and token usage as it
arrives.

## Supported runtimes and providers

### Runtime providers (3)

| Runtime | Role | Default port | Integration mode |
|---|---|---|---|
| **Hermes** | Default core runtime | 8642 | `native-core` |
| **IronClaw** | WASM-sandbox gateway-handoff lane | 3231 | `optional-bridge` |
| **OpenClaw** | Optional future lane | 18789 | `optional-runtime` |

Hermes and IronClaw are the current lanes. OpenClaw is wired through
the runtime picker but ships as an optional attach target.

### Provider types (loopback and remote)

- **Local / loopback:** Ollama, LM Studio, vLLM, llama.cpp, and any
  other OpenAI-compatible endpoint the user runs on
  `127.0.0.1`. The Models page (V2.10.60) scans for these and
  surfaces one-click suggestions.
- **Remote (HTTPS):** OpenAI, Anthropic, Google Gemini, Azure
  OpenAI, OpenRouter, and any other OpenAI-compatible API the
  operator configures.

Local server discovery is loopback-only by default; LAN hosts are
opt-in via the `extraHosts` argument in the renderer's
`scanLocalServers` call.

## Optional sidecars (user-initiated, not bundled)

- **CodeGraph** (`pip install codegraph` + `codegraph init`) — semantic
  code-intelligence path. See
  [`../docs/CODEGRAPH-RUNTIME.md`](../docs/CODEGRAPH-RUNTIME.md).
- **EverOS** (`pip install everos`) — memory + harness sidecar. See
  [`../docs/EVEROS-SIDECAR.md`](../docs/EVEROS-SIDECAR.md).
- **Headroom** (`pip install headroom-ai`) — context-compression
  proxy. See
  [`../docs/agent-skills-bundle/HEADROOM.md`](../docs/agent-skills-bundle/HEADROOM.md)
  and the repo-authored workflow skill at
  [`../.github/skills/headroom-workflow/`](../.github/skills/headroom-workflow/).

None of these are required. The desktop is fully functional without
any of them; the integration is opt-in per user.

## Development

### Prerequisites

- Node.js 22 (matches the version pinned in `.github/workflows/ci.yml`)
- npm 10+ (ships with Node 22)
- Windows 10/11 for the NSIS / portable build targets
- A Unix-like shell for development mode (works on macOS, Linux,
  WSL)

### Install dependencies

```bash
cd agent-desktop
npm install
```

The install populates `agent-desktop/node_modules/` with the 930
runtime packages the desktop needs to ship. This is a **standalone
install** — the monorepo root does not own the desktop's `node_modules/`.

### Start the app in development mode

```bash
cd agent-desktop
npm run dev
```

`electron-vite dev` starts the Vite renderer with hot-reload, the
Electron main process with auto-restart, and the preload bridge.

### Run the focused test suite

```bash
cd agent-desktop
npm run test
```

The full suite is ~95 Vitest files. CI runs the three focused tests
that gate releases (`App.gateway.dom.test.tsx`,
`App.kanban.dom.test.tsx`, `runtimeSessions.test.ts`).

### Build the Windows installer

```bash
cd agent-desktop
npm run build:win
```

`electron-builder` produces the NSIS installer and the portable
executable in `agent-desktop/dist/`. Requires Windows.

### Verify the packaged asar

```bash
cd agent-desktop
npm run verify:bundle
```

This runs the `release-bundle.test.ts` suite, which asserts the asar
contains the expected `node_modules/`, `out/main/index.js`, and
`out/preload/index.js` entries and that the `BrowserWindow` /
`createWindow` / `whenReady` references are present.

## Where to look next

- **The agentic-OS monorepo README** —
  [`../README.md`](../README.md)
- **The master handbook** — [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)
  (one-screen tour)
- **The long-form per-topic deep dives** —
  [`../docs/handbook/`](../docs/handbook/) (architecture, development,
  operations)
- **The license / brand** — [`../LICENSE`](../LICENSE) and
  [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
- **The live / scratch-pad / mirror index** —
  [`../docs/RETIRED_AND_LEGACY.md`](../docs/RETIRED_AND_LEGACY.md)
- **The skills ecosystem** —
  [`../.agents/skills/README.md`](../.agents/skills/README.md)
  ({{SKILLS_UPSTREAM}} skills, mirrored to `~/.agents/skills/`)
- **The runtime orchestration deep-dive** —
  [`../docs/handbook/ARCHITECTURE.md`](../docs/handbook/ARCHITECTURE.md#runtime-orchestration-deep)
- **The Hermes / IronClaw / OpenClaw attach smokes** —
  [`../docs/hermes-agent-attach.smoke.md`](../docs/hermes-agent-attach.smoke.md)
  and
  [`../docs/ironclaw-attach.smoke.md`](../docs/ironclaw-attach.smoke.md)

## License

Cubecloud-original work is dual-licensed under your choice of
**AGPL-3.0-or-later, Apache-2.0, or MIT**. The inherited
`hermes-desktop` framework code that hosts the Cubecloud-original
modules remains hard-MIT. See [`../LICENSE`](../LICENSE) and
[`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md) for the
per-path breakdown and the per-version transition history.
