# Development guide

> **Companion to the master handbook (`docs/HANDBOOK.md` §8).** This is the long-form development guide. The handbook gives you the one-screen summary; this gives you the 30-screen walkthrough.

## Prerequisites

- **Node.js 20+** (LTS recommended). `nvm use 20` if you have nvm.
- **pnpm** (preferred) or **npm**. The repo's lockfile is `package-lock.json`; pnpm and npm both read it, but pnpm is faster.
- **Python 3.11+** and **uv** (only required for the `ar-autoresearch/harness` reference; the desktop does not depend on Python at runtime).
- **Git 2.30+**.
- A local or remote agent runtime (Hermes is the default; see "Runtime setup" below).
- A local or remote model endpoint (Ollama, vLLM, llama.cpp, or any OpenAI-compatible API).

## First-time setup

```bash
# Clone
git clone https://github.com/cubecloud-contributors/cubecloud-agentic-os
cd cubecloud-agentic-os/agent-desktop

# Install JS deps
npm ci   # or: pnpm install --frozen-lockfile

# Optional: install the autoresearch Python harness deps
# Only needed if you want to run the autoresearch loop on your machine.
# Not required for the desktop to build, run, or ship.
cd .agents/skills/ar-autoresearch/harness
uv sync
cd ../../..

# Lint + typecheck + test
npm run lint
npm run typecheck
npm run test
```

## Run modes

### Dev mode (Vite + Electron, hot-reload)

```bash
npm run dev
```

This starts Vite for the renderer, compiles the main and preload, and spawns Electron pointed at the dev build. Changes to the renderer hot-reload; changes to the main / preload restart Electron.

### Dev mode with CDP enabled (for smoke scripts)

```bash
npm run dev:cdp
```

This enables the Chrome DevTools Protocol on port 9229 so the `scripts/capture-*.js` and `scripts/verify-*.js` smoke scripts can attach. **Only run this in a dev environment**; never expose CDP on a public network.

### Build (production assets, no installer)

```bash
npm run build
```

Outputs to `dist/`. The output is runnable; the installer is built separately.

### Package (electron-builder installers)

```bash
npm run package:win     # Windows MSI
npm run package:linux   # Fedora RPM (and Debian .deb if configured)
npm run package:mac     # macOS DMG
```

## Project layout

```
agent-desktop/
├── .agents/skills/              # The skills layer (20 skills + autoresearch harness)
�?  ├── README.md                # Top-level skills index + decision tree
�?  ├── ar-autoresearch/         # The one skill with a functioning code harness
�?  ├── po-*/                    # poskills adaptations
�?  ├── ecc-*/                   # ECC adaptations
�?  ├── gbrain-*/                # gbrain adaptations
�?  ├── gstack-*/                # gstack adaptations
�?  └── karpathy-guidelines/     # the four principles
├── apps/
�?  └── desktop-shell/           # Cubecloud-original state layer (SQLite + dispatch)
├── build/
�?  ├── branding/                # Cubecloud brand assets (logos, marks)
�?  ├── entitlements.mac.plist   # macOS entitlements
�?  ├── afterPack.js             # post-package hook
�?  └── icon.*                   # Binary app icons (pending Cubecloud source art)
├── changelogs/                  # Per-release changelogs
├── dist/                        # Build output (gitignored)
├── docs/                        # Architecture + legal + specs
�?  ├── HANDBOOK.md              # Master index (you are here in the repo)
�?  ├── handbook/                # Long-form companions
�?  ├── legal/                   # Cubecloud legal docs (EULA, trademark, etc.)
�?  ├── superpowers/specs/       # Design specs for the V2.x waves
�?  └── *.md                     # Architecture docs (CodeGraph, EverOS, runtime plan)
├── electron.vite.config.ts      # electron-vite build config
├── licenses/                    # Vendored upstream license texts
├── out/                         # Build output (gitignored)
├── previews/                    # Preview screenshots (regenerate from Cubecloud sources)
├── resources/                   # Static assets shipped with the binary
├── scripts/                     # CDP-driven smoke + capture scripts
├── src/
�?  ├── main/                    # Main process (Node 20 target)
�?  �?  ├── index.ts             # Entry point; IPC channel registration
�?  �?  ├── codegraph.ts         # CodeGraph CLI subprocess
�?  �?  ├── codegraph-runtime.ts # CodeGraph embedded SDK (Cubecloud-original)
�?  �?  ├── everos-sidecar.ts    # EverOS lifecycle (Cubecloud-original)
�?  �?  ├── hermes-runtime/      # Hermes orchestration
�?  �?  ├── openclaw/            # OpenClaw orchestration (V2.6+)
�?  �?  ├── ironclaw/            # IronClaw orchestration (V2.6+)
�?  �?  └── skills-harness.ts    # Skills resolver (Cubecloud-original)
�?  ├── preload/                 # Preload process (contextBridge surface)
�?  �?  └── index.ts             # The narrow IPC bridge
�?  └── renderer/                # Renderer (React 19 + i18next)
�?      └── src/                 # All screens
├── tests/                       # Vitest tests
├── ACKNOWLEDGMENTS.md           # Human-readable upstream credits
├── BRANDING_AND_LICENSE.md      # License + brand history
├── CONTRIBUTING.md              # DCO 1.1 contribution terms
├── LICENSE                      # Dual-license notice
├── NOTICE                       # REUSE-compliant attribution catalog
├── README.md                    # The README (English)
├── README.zh-CN.md              # The README (简体中�?
├── README.ja-JP.md              # The README (日本�?
├── SECURITY.md                  # Security policy
└── THREAT_MODEL.md              # Working threat model
```

## Coding standards

The full set is in the universal coding standards skill at [`.agents/skills/ecc-coding-standards/SKILL.md`](../../.agents/skills/ecc-coding-standards/SKILL.md). The desktop-specific headlines:

- **TypeScript strict** �?`strict: true` in `tsconfig.json` and the two derived tsconfigs. No `any` at API boundaries; use `unknown` and narrow.
- **React 19 function components** �?no class components, hooks-only.
- **i18n-first** �?every user-visible string goes through `i18next`. No hard-coded English in JSX.
- **SPDX headers** �?every Cubecloud-original file carries `SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`. Inherited framework files are MIT and don't need a header.
- **No drive-by refactoring** �?a change is focused on the user-asked-for thing. Format-only changes belong in a separate commit.
- **No drive-by reformatting** of unrelated code �?match the existing style, even if you would do it differently.

## Where the boundaries are (re-stated from the handbook)

- **Trust boundary** �?the local user. The agent runtime runs in the user's context; the renderer is sandboxed by Electron's standard isolation; IPC channels are explicit and unguessable.
- **License boundary** �?inherited framework code (MIT, can't be retroactively restricted) vs Cubecloud-original work (dual-license, AGPL-3.0-or-later primary). The `BRANDING_AND_LICENSE.md` and `LICENSE` are the binding documents.
- **Brand boundary** �?Cubecloud marks are All-rights-reserved. `docs/legal/TRADEMARK_POLICY.md` is the binding document.
- **Process boundary** �?main process, preload, renderer, and (optionally) the EverOS sidecar process.

## Per-task workflows

### Adding a new IPC channel

1. Add the handler in `src/main/<topic>.ts`.
2. Register it in `src/main/index.ts` with `ipcMain.handle('topic:verb', ...)`.
3. Expose it in `src/preload/index.ts` with `contextBridge.exposeInMainWorld('api', { topicVerb: (...) => ipcRenderer.invoke('topic:verb', ...) })`.
4. Call it from the renderer via the exposed API.
5. Add a test in `tests/`.
6. Update the IPC surface map in `docs/handbook/ARCHITECTURE.md` §"IPC surface" so the next contributor can find the channel.

### Adding a new screen

1. Create the screen component in `src/renderer/src/screens/<screen-name>/`.
2. Add the route to the renderer's router.
3. Add the i18n keys to the English locale (and the translated locales if you can).
4. Add any new IPC channels per the workflow above.
5. Add a preview capture script under `scripts/capture-<screen-name>.js` (CDP-driven).
6. Update `docs/HANDBOOK.md` if the screen is a major surface.

### Adding a new Cubecloud-original file

1. Add the SPDX header at the top of the file:
   ```
   // SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
   ```
2. If the file is a TypeScript / TSX / JavaScript / Python source, add a short comment naming the upstream basis (e.g. "Cubecloud-original work (2026); no upstream basis") so the next maintainer can re-derive the chain.
3. Add the file to the right section of `NOTICE` §"Direct dependencies �?Cubecloud-original work".
4. If the file adds a new brand surface (logo, wordmark, splash), add it to `docs/legal/TRADEMARK_POLICY.md`.

### Adding a new skill

1. Run [`gbrain-skillify`](../../.agents/skills/gbrain-skillify/SKILL.md) �?the 11-axis gate. Most ideas fail.
2. Run [`ecc-skill-scout`](../../.agents/skills/ecc-skill-scout/SKILL.md) �?search-before-write.
3. Read [`po-write-a-skill`](../../.agents/skills/po-write-a-skill/SKILL.md) for the authoring contract.
4. Write the SKILL.md (500 line cap).
5. Add a row to [`.agents/skills/README.md`](../../.agents/skills/README.md).
6. Mirror to `~/.agents/skills/` (see `docs/GLOBAL-INSTALL-PLAN.md` for the global install flow).

### Adding a new smoke / capture script

1. Create the script under `scripts/`.
2. Add the SPDX header at the top:
   ```js
   // SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
   ```
3. The script should attach via CDP to a running desktop (port 9229). Pattern: `await cdp.connect(9229);`.
4. Add the script to the `scripts/smoke-all.js` aggregator if it should run as part of the pre-release smoke pass.
5. Add a docstring at the top of the script explaining what it verifies.

## Debugging

- **Main process logs** �?`~/.hermes/logs/gateway.log` and the per-runtime log file. The desktop also tails these to the in-app "Console" screen.
- **Renderer logs** �?DevTools console (Ctrl+Shift+I in dev mode).
- **Preload logs** �?Node 20 console in the DevTools "Console" tab.
- **CDP attach** �?start the desktop with `npm run dev:cdp`, then open `chrome://inspect` in Chrome and attach to `127.0.0.1:9229`.
- **Vitest** �?`npm run test` for the unit tests; `npm run test:watch` for watch mode.
- **TypeScript** �?`npm run typecheck` for a one-shot check; the editor's Pylance/TS Language Server for in-line errors.

## Common pitfalls

- **"I added an IPC channel but the renderer can't see it"** �?the preload bridge (`src/preload/index.ts`) is the only surface the renderer can see. Adding a handler in the main is not enough; you must also expose it through the preload.
- **"The build works but the binary doesn't start"** �?check the entitlements (`build/entitlements.mac.plist` on macOS) and the auto-updater channel. The desktop uses `electron-updater` for stable releases; if the channel is misconfigured, the auto-update can block startup.
- **"The skills don't auto-activate"** �?check the frontmatter. The `description` field is the only thing the agent runtime sees when deciding whether to load a skill. If it's vague, the skill is loaded at the wrong times (or never).
- **"The TypeScript build complains about a missing type"** �?the desktop pins types to the lockfile. Run `npm ci` to restore the lockfile-accurate types; do not run `npm install <package>` without updating the lockfile.

---

**Where to look next.** [`docs/HANDBOOK.md`](../HANDBOOK.md) for the master index, [`.agents/skills/po-diagnose/`](../../.agents/skills/po-diagnose/SKILL.md) for the diagnosis loop when something is broken, [`.agents/skills/po-tdd/`](../../.agents/skills/po-tdd/SKILL.md) for the test-first workflow, [`.agents/skills/gstack-qa/`](../../.agents/skills/gstack-qa/SKILL.md) for the pre-ship gate.

**Recent updates (V2.6 �?V2.10).** This file was last
substantively edited during the V2.4 �?V2.6 brand-license
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
