# Architecture deep-dive

> **Companion to the master handbook (`docs/HANDBOOK.md` §3).** This is the long-form architecture doc. The handbook gives you the one-screen map; this gives you the 30-screen tour.

## Process model

The desktop is an Electron app. The process model is the standard Electron three-process model with one optional fourth process (the EverOS sidecar).

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────────┐
│      Renderer      │ ←→ │      Preload       │ ←→ │        Main            │
│  React 19 + UI     │    │ contextBridge API  │    │   IPC handlers,        │
│  screens, state    │    │ exposes a narrow   │    │   lifecycle,           │
│  via Zustand +     │    │ IPC surface        │    │   runtime orchestrator │
│  TanStack Query    │    │                    │    │   CodeGraph, EverOS    │
└────────────────────┘    └────────────────────┘    └──────────┬─────────────┘
                                                               │
                            ┌──────────────────────────────────┤
                            │                                  │
                            ▼                                  ▼
                  ┌────────────────────┐            ┌────────────────────┐
                  │  Hermes runtime    │            │  EverOS sidecar    │
                  │  (process or       │            │  (optional,        │
                  │   remote HTTP)     │            │   Python HTTP)     │
                  └────────────────────┘            └────────────────────┘
```

### Main process

The main process is `src/main/index.ts` (entry point) and the directories under `src/main/`. Its responsibilities:

- Spawn the renderer with the right preload bridge.
- Register every IPC channel and dispatch to the right handler.
- Own the runtime orchestrator (`src/main/hermes-runtime/`, `src/main/openclaw/`, `src/main/ironclaw/`).
- Own the CodeGraph surface (`src/main/codegraph.ts` for the CLI subprocess, `src/main/codegraph-runtime.ts` for the embedded SDK).
- Own the EverOS sidecar lifecycle (`src/main/everos-sidecar.ts`).
- Own the skills harness (`src/main/skills-harness.ts`).
- Own the SQLite state (`src/main/db/`, `apps/desktop-shell/src/state/`).
- Drive the auto-updater (`electron-updater`).
- Drive the system-tray + global shortcuts.

### Preload process

The preload is a thin contextBridge layer at `src/preload/index.ts`. It exposes a *narrow* surface to the renderer — only the IPC channels that the renderer needs, with the right argument shapes and return types. The preload is the *trust boundary* between the renderer (untrusted UI) and the main (trusted orchestrator).

### Renderer

The renderer is a React 19 + i18next app at `src/renderer/src/`. The screens include chat, sessions, agents, persona, kanban, codegraph, everos, models, providers, skills, memory, tools, schedules, console, workspace, gateway, operations, and settings. The renderer talks to the main exclusively through the preload bridge.

### EverOS sidecar (optional)

When the user has installed `everos` and enables the EverOS lane, the main process spawns a `everos server start` Python subprocess and manages its lifecycle. The desktop is a *client* of the sidecar's HTTP surface, not a re-implementer of its functionality. The sidecar is **not** bundled with the desktop; the user installs it separately. The lifecycle manager is Cubecloud-original; the sidecar itself is upstream `EverMind-AI/EverOS`.

## IPC surface

The IPC surface is documented as the union of every channel registered in `src/main/index.ts` and exposed through `src/preload/index.ts`. The shape is:

```typescript
type IpcChannel =
  // Runtime
  | 'runtime:detect'
  | 'runtime:install'
  | 'runtime:start'
  | 'runtime:stop'
  | 'runtime:status'
  | 'runtime:switch'        // V2.6 — pick a runtime lane
  | 'runtime:list'          // V2.6 — list installed runtimes

  // Provider
  | 'provider:discover'
  | 'provider:configure'
  | 'provider:list'
  | 'provider:test'

  // Model
  | 'model:list'
  | 'model:save'
  | 'model:delete'
  | 'model:test'

  // Chat
  | 'chat:send'
  | 'chat:stream'
  | 'chat:cancel'
  | 'chat:history'

  // Memory
  | 'memory:list'
  | 'memory:save'
  | 'memory:delete'

  // Skills
  | 'skill:list'
  | 'skill:install'
  | 'skill:enable'
  | 'skill:disable'

  // Tools
  | 'tool:list'
  | 'tool:configure'

  // Schedules
  | 'schedule:list'
  | 'schedule:save'
  | 'schedule:delete'
  | 'schedule:run-now'

  // CodeGraph (V2.3)
  | 'codegraph:init'
  | 'codegraph:status'
  | 'codegraph:context'
  | 'codegraph:search'
  | 'codegraph:impact'
  | 'codegraph:export-ua-graph'

  // EverOS sidecar (V2.3)
  | 'everos:start'
  | 'everos:stop'
  | 'everos:status'
  | 'everos:list-harnesses'
  | 'everos:run-harness'

  // Workspace / dispatch
  | 'workspace:list-kanban-boards'
  | 'workspace:create-task'
  | 'workspace:dispatch'
  | 'workspace:get-dispatch-context'

  // Settings
  | 'settings:get'
  | 'settings:set'
  | 'settings:backup'
  | 'settings:restore'
  | 'settings:export-debug-dump'
```

Every channel is an opt-in; the renderer cannot call an unexposed channel. The full set is in `src/main/index.ts` (the registration) and `src/preload/index.ts` (the bridge). Adding a new channel means adding it to both files; the type union above is a *shortcut* for contributors, not a binding contract.

## State model

The state model is a *two-tier* model:

1. **Local UI state** — in the renderer. Driven by React `useState` / `useReducer` for ephemeral form state, and TanStack Query for any data the renderer fetches from the main process. UI state never leaves the renderer.
2. **Persistent state** — in the main process's SQLite database. Driven by a thin ORM layer in `apps/desktop-shell/src/state/`. Every entity (profile, session, model, provider, skill, memory entry, tool config, schedule, kanban board, kanban task) lives in the SQLite DB. The schema is in `apps/desktop-shell/src/state/schema.sql` (or wherever the current schema migration lives).

The bridge between the two is the IPC surface above: the renderer asks, the main reads or writes, the result flows back through the bridge.

## Runtime orchestration (deep)

The runtime orchestrator lives in `src/main/hermes-runtime/` (Hermes), `src/main/openclaw/` (OpenClaw), and `src/main/ironclaw/` (IronClaw). Each runtime has the same shape:

```
runtime-name/
├── detect.ts          # Is this runtime installed? Where?
├── install.ts         # The install flow (or a "not our installer" stub)
├── start.ts           # Start the runtime (spawn process or open tunnel)
├── stop.ts            # Stop the runtime gracefully
├── status.ts          # Health, pid, log tail
├── config.ts          # Read / write the runtime's config
└── smoke.ts           # The smoke target registration
```

The orchestrator is registered in `packages/platform-core/src/index.ts` §"PLATFORM_RUNTIME_PROVIDERS" as a `PlatformRuntimeProviderDescriptor`. The descriptor carries the connection modes (embedded-local, local-gateway, remote-gateway, ssh-tunnel, docker-gateway, migration-import) and the capabilities (canInstallLocally, canAttachToExistingLocalGateway, canAttachViaSshTunnel, etc.). The `runtime:switch` and `runtime:list` IPC channels iterate over the registered providers.

## CodeGraph (deep)

The CodeGraph surface has two backends:

1. **CLI subprocess** — `src/main/codegraph.ts` shells out to the `codegraph` binary for `init`, `status`, `context`, and `export-ua-graph`. Always works when the CLI is on PATH. The CLI is `colbymchenry/codegraph`'s separate Go project, not vendored in this repo.
2. **Embedded SDK** — `src/main/codegraph-runtime.ts` wraps the `@colbymchenry/codegraph` npm package as a TypeScript library, keeping a per-project `CodeGraph` instance alive in the main process so the renderer can run `searchNodes`, `getImpactRadius`, and `getStats` without spawning a subprocess per call.

The deep dive is in `docs/CODEGRAPH-RUNTIME.md`. The headline: the embedded SDK path is the new default; the CLI subprocess path is kept for users who already have the CLI on PATH and prefer it.

## EverOS sidecar (deep)

The EverOS sidecar is a Python HTTP server (`everos server start`) that the user installs separately. The desktop's `src/main/everos-sidecar.ts` is the lifecycle manager:

- Detect: is `everos` on PATH? What version?
- Start: spawn `everos server start` with the right env vars, capture stdout/stderr to a log file.
- Stop: SIGTERM, wait, SIGKILL if necessary.
- Status: pid, port, last log line, health probe (HTTP GET on the published port).
- Harnesses: list the configured EverOS harnesses; run one on demand.

The desktop is a *client* of the sidecar's HTTP surface. The sidecar is **not** vendored, **not** bundled, and **not** installed by the desktop. The deep dive is in `docs/EVEROS-SIDECAR.md`.

## Skills harness (deep)

The skills harness (`src/main/skills-harness.ts`) is the resolver that the agent runtime consults when loading skills at startup. It:

- Reads the repo-local `.agents/skills/<name>/SKILL.md` and the user-global `~/.agents/skills/<name>/SKILL.md`.
- Validates the frontmatter (name, description, license, metadata.source).
- Returns the merged set, with repo-local taking precedence over user-global.
- Caches the result in memory; reloads on file-system change.

The 20-skill ecosystem that the harness resolves is described in `docs/HANDBOOK.md` §5 and in `.agents/skills/README.md`. The harness is Cubecloud-original; the skills themselves are adapted from upstream MIT-licensed repos (see `NOTICE` §"Adapted dependencies").

## Build pipeline

The build is a standard electron-vite pipeline. Three TypeScript projects:

- `tsconfig.json` — the main process (Node 20 target).
- `tsconfig.web.json` — the renderer (browser target).
- `tsconfig.node.json` — build scripts and toolchain (Node 20 target).

The build outputs are `out/main`, `out/preload`, and `out/renderer`. The `electron-builder` pipeline packages the three outputs plus the inherited resources into the three target installers (Windows MSI, Fedora RPM, macOS DMG). The packaged icon set was regenerated in V2.10.31 from the current Cubecloud mark (`build/icon.png`, `build/icon.ico`, `build/icon.icns`, plus the matching PNG copies in `resources/` and the renderer asset tree).

## Testing

The test suite is Vitest, driven by `vitest.config.ts`. The test files are under `tests/` and under the per-module `*.test.ts` files. The smoke runs (CDP-driven, against a running desktop) are under `scripts/verify-*.js` and `scripts/smoke-all.js`. The smoke runs are run manually before each release; the unit tests run in CI on every PR.

---

**Where to look next.** [`docs/CODEGRAPH-RUNTIME.md`](CODEGRAPH-RUNTIME.md), [`docs/EVEROS-SIDECAR.md`](EVEROS-SIDECAR.md), [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](RUNTIME_ORCHESTRATION_PLAN.md).

**Recent updates (V2.6 — V2.10).** This file was last
substantively edited during the V2.4 — V2.6 brand-license
wave. The V2.7 (superpowers skills), V2.8 (description-trim audit),
V2.9 (pre-launch bundle, 40/40 smoke), and V2.10 (doc-move, README
split, i18n cleanup, previews cleanup, provenance cross-link,
README Translations pointer) transitions are documented in
[`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) under
the corresponding `## V2.7 / V2.8 / V2.9 / V2.10` sub-sections, and
each per-version change is recorded in
[`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §
"How to confirm a surface is live". No content rewrite of this
handbook file was needed for V2.10.14; the tail pointer is the
additive update.
