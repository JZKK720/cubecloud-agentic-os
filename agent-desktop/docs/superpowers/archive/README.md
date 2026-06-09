# `docs/superpowers/archive/` (V2.10.36)

This directory contains pre-V2.10 release-design documents that were
retired in V2.10.36 because the V2.6 release they describe is no
longer the current V2.x release.

The files are kept here (rather than deleted) so that the historical
references in `BRANDING_AND_LICENSE.md` §"V2.6 transitions" and in
`docs/HANDBOOK.md` §9 still resolve to a real artifact, and so that a
future release with a similar shape (Windows MSI + Fedora RPM via
Winget + macOS DMG via electron-builder) can borrow the structure
without having to invent it.

## Files in this archive

| File | Date | Bytes | What it is |
|---|---|---|---|
| `2026-04-30-windows-winget-fedora-rpm-release.md` | 2026-04-30 | 39,227 | V2.6 release plan (the full multi-platform release work that landed in V2.6). |
| `2026-04-30-windows-winget-fedora-rpm-release-design.md` | 2026-04-30 | 15,682 | V2.6 release design (the design-spec convention that this archive preserves). |

These files were moved here from `agent-desktop/docs/superpowers/plans/`
and `agent-desktop/docs/superpowers/specs/` respectively in V2.10.36.
The two now-empty `plans/` and `specs/` subdirs were removed.

## Do not add new files here

New release designs should land in `agent-desktop/docs/superpowers/plans/`
and `agent-desktop/docs/superpowers/specs/` if a future V2.10.x
revives the convention. The `archive/` subdir is intentionally
read-only - it is the historical record, not a workspace.
