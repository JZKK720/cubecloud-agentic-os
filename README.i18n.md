# i18n policy (V2.10.36)

> **Single source of truth for translation inventory.** Some
> translations live at the outer root or under `docs/` (monorepo
> docs), and some live in the inner mirror at
> `agent-desktop/` (binary docs). This manifest lists each file,
> its language, where it lives, its status, and its maintainer.

## Current translations

| File | Language | Path | Status | Maintainer |
|---|---|---|---|---|
| README (monorepo) | English | `README.md` (outer root) | **Live, V2.10.55 canonical wordmark** (V2.10.51 introduced a fabricated bilingual mark; V2.10.52 refined placement; V2.10.53 added the language switcher; V2.10.55 replaces the fabricated bilingual mark with the canonical `cubecloud-logo.svg` which is byte-identical to the user's `docs/logos/logo.svg/1290X480 常规.svg` brand-pack wordmark. Language switcher and placement re-flow from V2.10.52/V2.10.53 are preserved.) | Cubecloud Contributors |
| README (monorepo) | Simplified Chinese (zh-CN) | `README.zh-CN.md` (outer root) | **Live, V2.10.55 canonical wordmark** (same structure as the English row; canonical wordmark swap from V2.10.55; the language switcher marks 简体中文 as the active language) | Cubecloud Contributors + Community |
| README (monorepo) | Japanese (ja-JP) | `README.ja-JP.md` (outer root) | **Live, V2.10.55 canonical wordmark** (same structure as the English row; canonical wordmark swap from V2.10.55; the language switcher marks 日本語 as the active language) | Cubecloud Contributors + Community |
| README (monorepo) | Korean (ko-KR) | `README.ko-KR.md` (outer root) | **Live, V2.10.55 canonical wordmark** (same structure as the English row; canonical wordmark swap from V2.10.55; the language switcher marks 한국어 as the active language) | Cubecloud Contributors + Community |
| CONTRIBUTING (monorepo) | English | `CONTRIBUTING.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |
| CONTRIBUTING (monorepo) | Simplified Chinese (zh-CN) | `CONTRIBUTING.zh-CN.md` (outer root) | **Live, V2.10.17** (machine-translated starting point for the outer contributor policy; native speakers welcome to polish) | Cubecloud Contributors + Community |
| SECURITY (monorepo) | English | `SECURITY.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |
| SECURITY (monorepo) | Simplified Chinese (zh-CN) | `SECURITY.zh-CN.md` (outer root) | **Live, V2.10.18** (machine-translated starting point for the outer security policy; native speakers welcome to polish) | Cubecloud Contributors + Community |
| THREAT_MODEL (monorepo) | English | `THREAT_MODEL.md` (outer root) | Live (hardlink to inner) | Cubecloud Contributors |
| THREAT_MODEL (monorepo) | Simplified Chinese (zh-CN) | `THREAT_MODEL.zh-CN.md` (outer root) | **Live, V2.10.19** (machine-translated starting point for the outer threat model; native speakers welcome to polish) | Cubecloud Contributors + Community |
| HANDBOOK (monorepo) | English | `docs/HANDBOOK.md` | Live (hardlink to inner) | Cubecloud Contributors |
| HANDBOOK (monorepo) | Simplified Chinese (zh-CN) | `docs/HANDBOOK.zh-CN.md` | **Live, V2.10.24** (machine-translated starting point for the master handbook index; native speakers welcome to polish) | Cubecloud Contributors + Community |
| HANDBOOK leaf index (monorepo) | English | `docs/handbook/README.md` | Live (hardlink to inner) | Cubecloud Contributors |
| HANDBOOK leaf index (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/README.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the handbook sub-doc index; native speakers welcome to polish) | Cubecloud Contributors + Community |
| HANDBOOK architecture (monorepo) | English | `docs/handbook/ARCHITECTURE.md` | Live (hardlink to inner) | Cubecloud Contributors |
| HANDBOOK architecture (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/ARCHITECTURE.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the architecture deep-dive; native speakers welcome to polish) | Cubecloud Contributors + Community |
| HANDBOOK development (monorepo) | English | `docs/handbook/DEVELOPMENT.md` | Live (hardlink to inner) | Cubecloud Contributors |
| HANDBOOK development (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/DEVELOPMENT.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the development guide; native speakers welcome to polish) | Cubecloud Contributors + Community |
| HANDBOOK operations (monorepo) | English | `docs/handbook/OPERATIONS.md` | Live (hardlink to inner) | Cubecloud Contributors |
| HANDBOOK operations (monorepo) | Simplified Chinese (zh-CN) | `docs/handbook/OPERATIONS.zh-CN.md` | **Live, V2.10.25** (machine-translated starting point for the operations guide; native speakers welcome to polish) | Cubecloud Contributors + Community |
| RETIRED_AND_LEGACY (monorepo) | English | `docs/RETIRED_AND_LEGACY.md` | Live | Cubecloud Contributors |
| RETIRED_AND_LEGACY (monorepo) | Simplified Chinese (zh-CN) | `docs/RETIRED_AND_LEGACY.zh-CN.md` | **Live, V2.10.28** (machine-translated starting point; native speakers welcome to review and polish) | Cubecloud Contributors + Community |
| README (binary) | English | `agent-desktop/README.md` | **Live, V2.10.55 canonical wordmark** (V2.10.48 preview gallery; V2.10.49 framing restoration; V2.10.53 swapped to the V2.10.51 bilingual mark; V2.10.55 reverts to the canonical `cubecloud-logo.svg` because the user's brand pack does not include a 智方云 mark and the V2.10.51 bilingual SVG was hand-rolled from primitive paths) | Cubecloud Contributors |
| README (binary) | 日本語(ja-JP) | `agent-desktop/README.ja-JP.md` | **Live, V2.10.55 canonical wordmark** (V2.10.48 preview gallery; V2.10.49 framing restoration; V2.10.53 added the bilingual mark above the welcome banner image; V2.10.55 swaps that for the canonical `cubecloud-logo.svg`; native-speaker review still welcome) | Cubecloud Contributors + Community |
| README (binary) | 简体中文(zh-CN) | `agent-desktop/README.zh-CN.md` | **Live, V2.10.55 canonical wordmark** (V2.10.48 preview gallery; V2.10.49 framing restoration; V2.10.53 added the bilingual mark above the welcome banner image; V2.10.55 swaps that for the canonical `cubecloud-logo.svg`; native-speaker review still welcome) | Cubecloud Contributors + Community |
| README (binary) | 한국어(ko-KR) | `agent-desktop/README.ko-KR.md` | **Live, V2.10.55 canonical wordmark** (V2.10.48 preview gallery; V2.10.49 framing restoration; V2.10.53 added the bilingual mark above the welcome banner image; V2.10.55 swaps that for the canonical `cubecloud-logo.svg`; native-speaker review still welcome) | Cubecloud Contributors + Community |
| CONTRIBUTING (binary) | English | `agent-desktop/CONTRIBUTING.md` | Live, source of truth | Cubecloud Contributors |
| CONTRIBUTING (binary) | 日本語(ja-JP) | `agent-desktop/CONTRIBUTING.ja-JP.md` | **Live, V2.10.32 wording + coordinate cleanup** (top-level contributor-policy copy refreshed, old repo coordinates removed; native-speaker review still welcome) | Cubecloud Contributors + Community |
| CONTRIBUTING (binary) | 简体中文(zh-CN) | `agent-desktop/CONTRIBUTING.zh-CN.md` | **Live, V2.10.32 wording + coordinate cleanup** (top-level contributor-policy copy refreshed, old repo coordinates removed; native-speaker review still welcome) | Cubecloud Contributors + Community |

## Translation workflow

1. The English source file at its canonical location is the **source
   of truth**.
2. **Monorepo doc translations** live next to the outer source path
   (for example `README.zh-CN.md`, `CONTRIBUTING.zh-CN.md`,
   `SECURITY.zh-CN.md`, `THREAT_MODEL.zh-CN.md`,
   `docs/HANDBOOK.zh-CN.md`, and the `docs/handbook/*.zh-CN.md`
   companions).
3. **Binary doc translations** live at the inner location
   (`agent-desktop/<file>.<lang>.md`).
4. A native speaker in the target language should review the diff
   before merge. Machine-translated starting points must be clearly
   labeled until they are polished.
5. When a README translation changes, update this manifest and
   re-render the combined PDF with
   `node scripts/v2.10.20-readme-combined-pdf.cjs`.

## What lives where?

The outer root and `docs/` now host **monorepo translations**.

- Brand assets (V2.10.55) — `docs/logos/logo.svg/` is the canonical
  source of truth, a 12-asset brand pack covering 4 sizes
  (120×120, 1290×480, 512×512, 800×800) × 3 color treatments
  (反白 / 反黑 / 常规). The pack is mirrored to
  `agent-desktop/build/branding/logo-pack/` (build-time) and
  `agent-desktop/src/renderer/src/assets/logo-pack/` (Vite-bundled).
  The legacy `agent-desktop/build/branding/cubecloud-logo.svg`
  (byte-identical to `docs/logos/logo.svg/1290X480 常规.svg`) and
  `agent-desktop/build/branding/cubecloud-mark.svg` (legacy icon
  mark) stay in place so the existing build pipeline + README
  references keep working. The V2.10.51-V2.10.54 hand-rolled
  `cubecloud-zhifangyun.svg` was removed in V2.10.55 — the user's
  brand pack does not include a 智方云 Chinese mark, and the legal
  Chinese brand 智方云 is referenced in legal text only
  (BRANDING_AND_LICENSE.md, ABOUT.md), not in product chrome.

Currently that means:

- `README.zh-CN.md` (Simplified Chinese)
- `README.ja-JP.md` (Japanese)
- `README.ko-KR.md` (Korean)
- `CONTRIBUTING.zh-CN.md` (Simplified Chinese)
- `SECURITY.zh-CN.md` (Simplified Chinese)
- `THREAT_MODEL.zh-CN.md` (Simplified Chinese)
- `docs/HANDBOOK.zh-CN.md` (Simplified Chinese)
- `docs/handbook/README.zh-CN.md` (Simplified Chinese)
- `docs/handbook/ARCHITECTURE.zh-CN.md` (Simplified Chinese)
- `docs/handbook/DEVELOPMENT.zh-CN.md` (Simplified Chinese)
- `docs/handbook/OPERATIONS.zh-CN.md` (Simplified Chinese)
- `docs/RETIRED_AND_LEGACY.zh-CN.md` (Simplified Chinese)

The inner `agent-desktop/` tree continues to host **binary
translations** for the Electron app. The manifest distinguishes the
two surfaces so readers do not confuse monorepo docs with binary
docs.

If the monorepo gains additional languages later, add rows here with
the outer paths (`README.<lang>.md`, etc.).

## Out of scope for V2.10.28

- **Native-speaker review of the current outer zh-CN docs**
   (`README.zh-CN.md`, `CONTRIBUTING.zh-CN.md`, `SECURITY.zh-CN.md`,
   `THREAT_MODEL.zh-CN.md`, `docs/HANDBOOK.zh-CN.md`,
   `docs/handbook/*.zh-CN.md`, `docs/RETIRED_AND_LEGACY.zh-CN.md`).
   `README.zh-CN.md` has had two editorial polish passes, but the
   outer zh-CN set should still be reviewed by native speakers before
   being treated as final.
- **Native-speaker review of the new outer ja-JP and ko-KR READMEs.**
   These are machine-translated starting points and need native-speaker
   review before being treated as final.
- **Native-speaker refresh of the existing binary CJK docs.** Those
  files are valid UTF-8 and stay in place; improving their wording is
  a separate workstream, not a correctness blocker.
