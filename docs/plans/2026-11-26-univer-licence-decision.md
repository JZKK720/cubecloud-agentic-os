# Univer — spike results and licence decision

> Date: 2026-11-26 · Branch: `chore/i18n-gate-univer-decision` · Status: **spike done, adoption blocked on licence, not on code**

## What exists today

| Item | State | Evidence |
|---|---|---|
| `@univerjs/preset-sheets-core` | **Installed** (devDependency) `1.6.1` | `agent-desktop/package.json`; `npm ls` shows 20 `@univerjs/*` packages, all `1.6.1` |
| `@univerjs/presets` | **Installed** `1.6.1` | same |
| `@univerjs-pro/*` packages | **Not installed** | no `node_modules/@univerjs-pro` directory |
| Read-only viewer component | **Shipped** as part of OfficeCLI integration | `src/renderer/src/components/OfficeCliSheetView.tsx` (PR #6, merged) |
| Viewer data path | `officecli view <file> text --json` → `shared/officecli-text.ts` parser → Univer grid | read-only; no write-back |
| Smoke script | `scripts/officecli-univer-viewer.smoke.cjs` exists (requires `SMOKE_FIXTURE` + dev CDP) | present, not wired into `npm run smoke` |
| Test coverage | `tests/officecli-text.test.ts` (pure parser) | 15 officecli tests green |

## Bundle cost (measured, this machine, current build)

Lazy-loaded as a separate chunk; main entry unchanged.

| Chunk | Size | Contains |
|---|---|---|
| `out/renderer/assets/index-BI8m_Mpu.js` | 11,649 KB | Univer core/sheets/formula/facade |
| `out/renderer/assets/index-fcTnm1kf.js` | 9,718 KB | Univer + react-dom / astryx bits (mixed chunk) |
| `out/renderer/assets/index-Dp__mh_K.js` | 2,396 KB | Univer |
| `facade-*.js` | 1,290 KB | Univer facade |
| `en-US-*.js` | 681 KB | Univer en-US locale |
| `OfficeCliSheetView-*.js` | 7.8 KB | our wrapper |

Univer therefore costs roughly **24–25 MB** of JS in lazy chunks, roughly double the size of the rest of the desktop renderer. It loads only when the user opens "View as spreadsheet", not at startup.

## Known limitations (current implementation)

1. Read-only snapshot: no editing, no formula recalculation, no file write-back. Correct scope — OfficeCLI remains the writer.
2. `OfficeCliSheetView` snaps to at most 200 rows × 40 columns (`MAX_GRID_ROWS` / `MAX_GRID_COLS`); larger sheets are truncated silently apart from grid dimensions.
3. i18n: Univer is hard-wired to `en-US` locale; the surrounding chrome is localized, the grid is not.
4. No automated test mounts Univer; only the JSON→parser path is unit-tested. The smoke script needs a fixture `.xlsx` and a CDP dev session.

## Why adoption beyond this read-only viewer is blocked

Licence, not capability:

| Claim | Reality |
|---|---|
| Univer is Apache-2.0 | True for the OSS packages we install — `preset-sheets-core`, `presets`, `core`, `sheets*`, `engine-*`, `design`, `ui` … (all `Apache-2.0`, verified in `node_modules/@univerjs/*/package.json`) |
| The value-add features are open | **False.** Import/export, collaboration, and the MCP server live in `@univerjs-pro/*`, which carry **no `license` field on npm** — i.e. not open source. |
| `workbuddy-univer-office` is a usable server | It depends on ~50 `@univerjs-pro/*` packages. Not usable without a commercial licence. |
| Commercial production needs a licence | Per docs.univer.ai/server/license: free tier = 10 watermark-free exports/month; production deployment requires Business/Enterprise. |
| `univer-cli` bundled credential | Scoped to localhost/127.0.0.1/app, rotates every ~90 days; unverified for unattended use — needs vendor confirmation, not our inference. |

## Decision

**Keep** the read-only viewer (already merged, read-only, Apache-2.0 OSS packages only). **Do not adopt** Univer Pro, collaboration, import/export, or MCP from Univer. OfficeCLI stays the single read/write path for Office documents (plain Apache-2.0, no quota).

**Blocked pending vendor confirmation:** any production use of `@univerjs-pro/*`, and any unattended/headless Univer service deployment. Ask vendor support for (a) written licence scope for self-hosted desktop embedding, (b) whether the bundled `univer-cli` credential is licensed for unattended use, (c) whether the read-only viewer in an OSS-licensed shell requires attribution beyond the existing notice file.

## What would change this

- Vendor confirms Apache-2.0-only usage for our embedding scenario in writing.
- A user requests in-app editing, with a licence budget attached.
- OfficeCLI gains a native read-render path that covers the same ground (then the viewer can be deleted).

## Not done

- The `officecli-univer-viewer.smoke.cjs` script has not been run headlessly; it requires a live CDP session and a fixture. Bundle numbers above are from the built output, not from a runtime profile.
- No telemetry on viewer usage; we do not know if anyone opens it.
