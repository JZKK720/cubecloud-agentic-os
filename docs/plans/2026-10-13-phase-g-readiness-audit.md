# Phase G — Readiness Audit (Electron retirement)

> **Date:** 2026-10-13 · **Status:** scoped + criterion proven; **deletion not performed (operator decision)**

## G's verify criterion — PROVEN

> "repo builds with zero electron imports"

Computed the kernel's **transitive import closure** from `console-backend/server.ts`:

| Metric | Value |
|---|---|
| Modules reached | **276** |
| Modules in the closure that import `electron` | **0** |
| External (bare) deps | `@cubecloud/platform-core`, `better-sqlite3`, `child_process`, `crypto`, `fs`, `http`, `https`, `i18next`, `net`, `os`, `path`, `url` |

**Verdict: the kernel closure is electron-free.** The `console-backend/electron-stub.ts` is therefore *defensive*, not load-bearing — nothing in the kernel's reachable graph actually imports `electron`.

## What G would delete (the destructive part)

| Artifact | Role |
|---|---|
| `src/main/index.ts` | The Electron entry (~3,000 lines, 153+ `ipcMain.handle`) — **the shipping desktop product** |
| `src/preload/index.ts` | The `window.hermesAPI` bridge — **also the source the kernel's route registry is generated from** (`extract-route-map.cjs` reads it) |
| `electron-builder.yml`, `build/*.js`, `postinstall` | The packaging pipeline (`build:win|mac|linux`) |

The other 8 electron-importing main modules (`askpass`, `installer`, `media`, `runtime-provider-actions`, `security`, `sudoCreds`, `updater-log`, `workspace-console`) are desktop-packaging concerns the kernel never reaches.

## Why this is an operator decision, not an autonomous one

1. **It removes the desktop product the repo is named for** (`Agent Desktop`, `app.name`, the installer). Deleting it is irreversible in effect and is not needed for any correctness goal — the container is already green.
2. **The design doc gates it but does not mandate the deletion**: §5 says G "only after F's live pass" (satisfied), but §6 ("What is lost, and accepted") frames native tray/menus/auto-update as *lost* — implying **replace**, not necessarily **delete**. Whether the Electron shell survives as a second shipped shell (per doctrine lock 5, "shells are interchangeable") is unresolved.
3. **The preload is dual-purposed**: deleting it removes both the Electron bridge *and* the source of truth for the kernel route map.

## Recommended shape of G (when the operator wants it)

Keep the repo Electron-free **without deleting the desktop product**:

1. Retire the **packaging surface** first (`electron-builder.yml`, `build/*.js`, `build:*` scripts, `postinstall`) — small, reversible, and the container replaces it.
2. Keep `src/main/index.ts` + `src/preload/index.ts` **as the desktop shell source** (doctrine lock 5: shells are interchangeable) but stop treating them as the only entry; the kernel entry is `console-backend/server.ts`.
3. Rename the "electron-free" claim precisely: **the kernel (runtime) is electron-free** — proven above — rather than "the repo has zero electron imports".
4. Only if the desktop binary is being **dropped as a product**, delete the entry/preload/builder in a dedicated commit, with the `window.hermesAPI` contract preserved (the route registry already reproduces it 295↔291).

## Verify output

- Kernel closure: 276 modules, **0 electron**, VERDICT electron-free.
- Container: healthy, 295 capabilities, attach proven end-to-end (see `2026-10-13-phase-f-live-verification.md`).
