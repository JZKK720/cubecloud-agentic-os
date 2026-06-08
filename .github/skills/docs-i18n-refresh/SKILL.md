---
name: docs-i18n-refresh
description: Handles Cubecloud monorepo doc sync, translation inventory updates, README PDF rerendering, and screenshot refresh sequencing. Use when working on README.i18n.md, zh-CN/ja-JP/ko-KR doc translations, sync-docs.ps1 hardlink behavior, combined README PDF generation, screenshot refresh, preview regenerate, doc sync pass, or when the user mentions mojibake in docs.
license: MIT
metadata:
  author: Cubecloud Contributors
  version: "1.0.0"
---

# Docs / I18n / Screenshot Refresh Workflow

## Quick start

Use this workflow when a request touches any of these surfaces:

- `README.md`, `README.zh-CN.md`, `README.i18n.md`
- `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`
- `docs/handbook/*.md`, `docs/handbook/*.zh-CN.md`
- `docs/RETIRED_AND_LEGACY.md`
- `docs/Cubecloud-README-en-zh.pdf`
- `cubecloud-desktop/previews/`
- `scripts/sync-docs.ps1`
- `scripts/v2.10.20-readme-combined-pdf.cjs`

## Workflow

### 1. Determine source of truth first

- **Outer root + `docs/`** are the source of truth for monorepo docs.
- **Inner `cubecloud-desktop/`** mirrors many of those files via Windows hardlinks and junctions.
- **README is the intentional exception**: outer `README.md` and inner `cubecloud-desktop/README.md` are different by design.
- Before changing a doc that exists both outer and inner, verify whether it is a hardlink (`fsutil hardlink list <path>` on Windows) or a separate file.

### 2. Translation inventory rules

- `README.i18n.md` is the single source of truth for translation inventory.
- **Monorepo translations** live next to the outer source path:
  - `README.zh-CN.md`
  - `CONTRIBUTING.zh-CN.md`
  - `SECURITY.zh-CN.md`
  - `THREAT_MODEL.zh-CN.md`
  - `docs/HANDBOOK.zh-CN.md`
  - `docs/handbook/*.zh-CN.md`
- **Binary translations** live in `cubecloud-desktop/`:
  - `cubecloud-desktop/README.<lang>.md`
  - `cubecloud-desktop/CONTRIBUTING.<lang>.md`
- Every translation change must be reflected in the manifest row: path, status, maintainer, and any note such as `machine-translated starting point`.

### 3. Encoding / mojibake safety

- PowerShell console output can lie about UTF-8 CJK files.
- Before declaring a file corrupted, verify bytes or read it with a UTF-8-safe path.
- Prefer UTF-8-safe Node-based edits for CJK-heavy docs.
- Only classify a file as mojibake if the file bytes themselves are wrong, not just the terminal display.

### 4. Combined README PDF

- The combined artifact is `docs/Cubecloud-README-en-zh.pdf`.
- Re-render it after any change to:
  - `README.md`
  - `README.zh-CN.md`
  - the markdown-to-HTML renderer in `scripts/v2.10.20-readme-combined-pdf.cjs`
- Re-render command:

```bash
node scripts/v2.10.20-readme-combined-pdf.cjs
```

- The script writes intermediate HTML to `.review-extras/pdf-build/combined.html`.
- Do not manually edit the PDF.

### 5. Screenshot / preview sequencing

- `cubecloud-desktop/previews/` is a legacy preview set kept on disk for inherited CJK references.
- Do **not** delete it until the replacement pass is complete.
- The correct sequence is:
  1. regenerate the screenshots under Cubecloud branding,
  2. update any remaining references,
  3. then decide whether to delete the old files.
- Keep screenshot refresh separate from doc wording churn when possible.

### 6. Transition history

Whenever the workflow changes repo-visible behavior, update the transition history:

- `BRANDING_AND_LICENSE.md`
- `docs/RETIRED_AND_LEGACY.md`

Use the existing V2.10.x style:
- short scope statement
- what changed
- why it was the right step
- what remains out of scope

## Fast checklist

- [ ] Is this an outer monorepo doc or an inner binary doc?
- [ ] If mirrored, did I verify hardlink behavior before editing?
- [ ] Did I update `README.i18n.md`?
- [ ] If README changed, did I re-render the combined PDF?
- [ ] If preview assets changed, did I preserve sequencing?
- [ ] Did I update `BRANDING_AND_LICENSE.md` and `docs/RETIRED_AND_LEGACY.md` when the workflow/state changed?
- [ ] Did I avoid mistaking PowerShell display corruption for real file corruption?

## Related files

- [`README.i18n.md`](../../../README.i18n.md)
- [`BRANDING_AND_LICENSE.md`](../../../BRANDING_AND_LICENSE.md)
- [`docs/RETIRED_AND_LEGACY.md`](../../../docs/RETIRED_AND_LEGACY.md)
- [`scripts/sync-docs.ps1`](../../../scripts/sync-docs.ps1)
- [`scripts/v2.10.20-readme-combined-pdf.cjs`](../../../scripts/v2.10.20-readme-combined-pdf.cjs)
