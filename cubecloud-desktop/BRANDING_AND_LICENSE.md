# Cubecloud Desktop Brand and License Transition

## Current status

- `cubecloud-desktop/` is the active Cubecloud working copy.
- Upstream `hermes-desktop` remains the locked reference baseline for provenance comparison.
- Source brand pack provided by the user lives under `../assets/logos/`.
- The inherited MIT license must stay in place until every inherited file has been provenance-audited.

## Immediate rules

- Do not remove the upstream MIT `LICENSE` from inherited code.
- Do not add exclusive Cubecloud copyright claims to inherited files or screenshots.
- Add Cubecloud copyright only to fully original new files and assets.
- Replace inherited branding first in package metadata, updater manifests, splash assets, README entry points, and release templates.

## Pending rebrand surfaces

- Translated docs: `README.ja-JP.md`, `README.zh-CN.md`, `CONTRIBUTING*.md`
- Release automation and metadata still referencing old publish coordinates in workflows and docs
- In-app locale strings outside the English shell-brand pass
- Translated docs: `README.ja-JP.md`, `README.zh-CN.md`, `CONTRIBUTING*.md`
- Release automation and metadata still referencing old publish coordinates in workflows and docs
- In-app locale strings outside the English shell-brand pass

## V2.3 transitions landed

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.3 transitions landed narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.6 transitions landed 闂?skills ecosystem import

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.6 transitions landed 闂?skills ecosystem import narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.7 transitions landed 闂?superpowers process methodology

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.7 transitions landed 闂?superpowers process methodology narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.4 transitions landed 闂?license + brand tightening

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.4 transitions landed 闂?license + brand tightening narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.5 transitions landed 闂?switching to a dual-license posture

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.5 transitions landed 闂?switching to a dual-license posture narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.8 transitions landed 闂?description-trim audit (TDD-for-skills compliance)

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.8 transitions landed 闂?description-trim audit (TDD-for-skills compliance) narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.

## V2.9 transitions landed 闂?pre-launch bundle (Skills / Memory / Harness / Schedule / Kanban seeds)

Archived to [docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md](docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md) during V2.10.30.
The full V2.9 transitions landed 闂?pre-launch bundle (Skills / Memory / Harness / Schedule / Kanban seeds) narrative is preserved in the archive file; the main provenance log now stays focused on V2.10+ transitions and current release-facing state.
## V2.10 transitions landed — outer-repo doc move + scratch-pad .gitignore

The V2.10 wave (June 2026) closed two long-standing structural
issues that made the agentic-OS repo harder to read than it
needed to be:

### V2.10.1 — Outer-repo doc move (Option A, scripts/sync-docs.ps1)

The Cubecloud Agent Desktop governance docs — `README.md`,
`LICENSE`, `NOTICE`, `BRANDING_AND_LICENSE.md`, `CONTRIBUTING.md`,
`ACKNOWLEDGMENTS.md`, `docs/HANDBOOK.md`, `docs/handbook/*`, and
`docs/legal/*` — are now **source-of-truth at the outer
`cubecloud-agentic-os/` repo root** (or under outer `docs/`).
They are no longer buried one level deep inside the vendored
`cubecloud-desktop/` mirror.

The move is implemented by `scripts/sync-docs.ps1`:

- **Top-level files** (`README.md`, `LICENSE`, `NOTICE`,
  `BRANDING_AND_LICENSE.md`, `CONTRIBUTING.md`,
  `ACKNOWLEDGMENTS.md`) live at the outer root.
- **`docs/HANDBOOK.md`** lives at `docs/HANDBOOK.md`.
- **`docs/handbook/{ARCHITECTURE,DEVELOPMENT,OPERATIONS,README}.md`**
  live at `docs/handbook/`.
- **`docs/legal/*`** lives at `docs/legal/`.
- At the old inner locations, the script re-creates **Windows
  hardlinks** for files and **directory junctions** for `docs/legal`.
  This is the admin-free equivalent of `ln -s` on Linux / macOS;
  every read at the old path still resolves, but editing either
  side edits the same data.

The script is **idempotent** — re-running it re-creates only the
missing links. On non-Windows clones, the script falls back to
real symbolic links via `fs.symlinkSync` (the script will be
extended to use `bash`/`sh` on macOS/Linux in a follow-up; for
now, the Windows-only path is the binding one and the macOS/Linux
behavior is documented in `.gitattributes`).

The V2.10.1 transition is the first place where we can say, with
confidence, that a PR reviewer looking at the outer repo *sees*
the agentic-OS identity at the root — the same identity the
inner mirror presents to the installer.

### V2.10.2 — Scratch-pad `.gitignore` (`.review-extras/`, `.review-codegraph/`)

`.review-extras/` (3,909 files, 155.7 MB) and `.review-codegraph/`
(1,078 files, 21.7 MB) are **scratch-pad clones** of upstream
repos used as design reference during the V2.6 + V2.7 skills
import. They are not part of the build, not referenced from any
code, and bloat the working tree by 177 MB.

Both are now in the outer `cubecloud-agentic-os/.gitignore`.
`.gitkeep` placeholders document the directories' purpose. To
re-create a scratch-pad clone, re-clone the upstream repo at the
commit the team was studying; the per-source URL is in
`ACKNOWLEDGMENTS.md` and the per-skill `metadata.source` in each
`SKILL.md`.

The transition is **non-destructive** — the local clones are
preserved on developer machines for anyone who wants to re-study
the upstream; only the *git* presence is removed.

### V2.10.3 — Affirmation: `apps/desktop-shell/` is live, not retired

There was a brief moment in the conversation history where the
phrase "we retired apps/desktop-shell" was used. To set the
record straight for future maintainers: **`apps/desktop-shell/`
is the live `@cubecloud/desktop-shell` workspace**, wired into
the outer `package.json` for `dev`, `build`, and `typecheck`. It
is the agentic-OS-original *state layer* (52 files, 981 KB)
that rebuilds the desktop's control surface on top of the
inherited `cubecloud-desktop/` framework.

The live surfaces are now documented in
[`docs/RETIRED_AND_LEGACY.md`](docs/RETIRED_AND_LEGACY.md). A
surface is **live** if and only if it is not in `.gitignore`,
referenced from a build/test/script, and documented in the
README, HANDBOOK, or the retired-and-legacy doc. A surface is
**scratch-pad** if it is in `.gitignore` and not referenced. A
surface is **mirror** if it is a hardlink/junction/build-output
of a live surface.

### V2.10.4 — Per-file SPDX header in `apps/desktop-shell/.gitignore`

The `@cubecloud/desktop-shell` workspace did not have a
workspace-level `.gitignore`. V2.10.4 adds one for the things
that are workspace-specific (vitest coverage, vite cache, local
log files). The cross-cutting patterns (node_modules, dist, out,
*.tsbuildinfo) remain in the outer `.gitignore`.

### V2.10.5 — Summary of the V2.10 diff

- Outer repo gained: `.gitattributes`, `docs/RETIRED_AND_LEGACY.md`,
  `scripts/sync-docs.ps1` (idempotent move + hardlink/junction regen),
  `apps/desktop-shell/.gitignore`.
- Outer `.gitignore` updated to exclude `.review-extras/` and
  `.review-codegraph/`.
- Inner `cubecloud-desktop/` lost its *primary* copies of **14 doc
  files** (LICENSE, NOTICE, BRANDING_AND_LICENSE, CONTRIBUTING,
  ACKNOWLEDGMENTS, THREAT_MODEL, SECURITY, README.i18n, plus
  docs/HANDBOOK + 4 docs/handbook/*) + 1 legal dir; the inner paths
  are now Windows-native hardlinks / junctions pointing back to the
  outer root. README.md is the **intentional exception** (see
  V2.10.6 below) and 4 i18n files (README.ja-JP/zh-CN +
  CONTRIBUTING.ja-JP/zh-CN) live only at the inner location (see
  V2.10.7 below). `scripts/sync-docs.ps1` is the idempotent regen
  script; it has 14 hardlink entries + 1 outer-only + 4 inner-only
  and runs through 8 phases.
- No source code changed. No SPDX headers changed. No test changed.
  No `package.json` workspace changed. The 40/40 prelaunchSeed smoke
  test still passes.


### V2.10.6 — README split (agentic-OS monorepo vs. Electron binary)

The V2.10.5 transition left the outer `README.md` and the inner
`cubecloud-desktop/README.md` as **the same hardlinked file**, which
was the right move for governance docs that need to be at the inner
location for the Electron build, but the **wrong** move for a README,
because the two audiences are not the same:

- A reader who clones `cubecloud-agentic-os` (the agentic-OS monorepo) wants to know what the *monorepo* is, what its principles are, what makes it different from other agentic-OS projects, and where to look next.
- A reader who downloads the desktop binary (or reads the `cubecloud-desktop/` source tree) wants to know how to *install* the binary, what *features* the binary has, and what *providers* it talks to.

V2.10.6 breaks the hardlink, writes a new outer `README.md` that is
the **agentic-OS monorepo README** (scope, principles, why-this-exists,
hybrid technical abilities, agent efficiencies, what makes us
different, repository layout), and writes a new inner
`cubecloud-desktop/README.md` that is the **trimmed install +
features + providers doc** for the Electron binary. The two are
deliberately **different files** with **different audiences**; the
inner README cross-links to the outer README and the master handbook
so neither reader is stranded.

The V2.10.6 transition is the first place where the README surface
matches the V2.10 doc-surface model: the outer repo owns the
*agentic-OS identity* (governance + monorepo README + HANDBOOK +
RETIRED_AND_LEGACY), and the inner mirror owns the *binary
identity* (install + features + providers + i18n). Both are at
the right place, for the right reader.


### V2.10.7 — i18n cleanup (README + CONTRIBUTING × 4 languages)

The V2.10.6 transition left the 4 i18n files in `cubecloud-desktop/`
(`README.ja-JP.md`, `README.zh-CN.md`, `CONTRIBUTING.ja-JP.md`,
`CONTRIBUTING.zh-CN.md`) without a counterpart at the outer root.
The CJK files also still carried the V2-era "construction in progress"
disclaimer (or its translation), and they described the *Electron
binary* rather than the *agentic-OS monorepo*.

V2.10.7 is the lowest-risk, mechanical pass:

1. **Inner i18n files**: the V2-era disclaimer block (where present)
   is removed and a per-language cross-link header to the outer
   `README.md` and the master handbook is added at the top. The
   original CJK content is **not** re-translated (out of scope; would
   need a native speaker).
2. **Outer i18n manifest** `README.i18n.md`: a new file that lists
   the 4 i18n files with their path, language, status, and
   translation workflow. The manifest lives at the outer root so
   contributors can see at a glance which translations exist and
   which are stub-only.
3. **V2.10.7 row in `docs/RETIRED_AND_LEGACY.md`**: documents the
   i18n status and the explicit policy that re-translation is
   community-driven, not agent-driven.

The V2.10.7 transition preserves the original CJK content
byte-for-byte (the disclaimer removal + cross-link header insertion
are the only changes). Re-translation is documented in
`README.i18n.md` §"Out of scope for V2.10.7" as a follow-up.


### V2.10.8 — THREAT_MODEL.md + SECURITY.md move to outer root

The V2.10.1 + V2.10.5 doc-link layer covered the governance docs
that must be at the inner location for the Electron build
(LICENSE, NOTICE, BRANDING, CONTRIBUTING, ACKNOWLEDGMENTS,
docs/HANDBOOK.md, docs/handbook/*, docs/legal/*, and the README
i18n files added in V2.10.7). Two security surfaces were
overlooked in V2.10.1: **THREAT_MODEL.md** and **SECURITY.md**.

Both files were authored at the inner location during the V2.4
addendum and updated through V2.6 to cover the CodeGraph +
EverOS surface area (the supply-chain threat, the EverOS
sidecar privilege boundary, etc.). They are already
V2.6+ aware; **no content change is needed**. The only
outstanding issue was placement: a PR reviewer looking at the
outer agentic-OS monorepo would not see a threat model or a
security policy, even though both are referenced by name from
docs/HANDBOOK.md §6 ("Security & threat model") and
docs/HANDBOOK.md §1 (the master index).

V2.10.8 closes that gap by:

1. **Moving THREAT_MODEL.md** (6,249 bytes) from
   `cubecloud-desktop/THREAT_MODEL.md` to `./THREAT_MODEL.md`.
   The inner location is re-created as a Windows hardlink so
   the Electron build still finds the doc at the old path.
2. **Moving SECURITY.md** (7,801 bytes) the same way.
3. **Adding two rows to docs/RETIRED_AND_LEGACY.md** to
   document the placement + link layer.
4. **Appending a V2.10.8 sub-section** to this file (BRANDING
   + LICENSE — V2.4 addendum already named both files; the
   V2.10.8 entry is the first place that the *placement*
   transition is logged).

After V2.10.8, a PR reviewer at the outer root sees the same
six governance docs (LICENSE, NOTICE, BRANDING, CONTRIBUTING,
ACKNOWLEDGMENTS, README.i18n.md) plus two security docs
(THREAT_MODEL.md, SECURITY.md) plus the agentic-OS monorepo
README (README.md) and the i18n manifest (README.i18n.md).
The inner mirror re-creates all 8 files as hardlinks (7 docs +
the 4 README/CONTRIBUTING i18n files added in V2.10.7) via
the Option-A pattern.


### V2.10.9 — V2.10.5 footnote fix (count + README/i18n exception)

The V2.10.5 "Summary of the V2.10 diff" sub-section claimed
`cubecloud-desktop/` lost its *primary* copies of "11 doc files + 1
legal dir". That was true at V2.10.5; the count grew in V2.10.6
(README became an intentional different-file, not a hardlink) +
V2.10.7 (4 inner-only i18n files) + V2.10.8 (THREAT_MODEL + SECURITY
joined the hardlink layer). V2.10.9 fixes the count to **14 doc
files** + 1 legal dir, and adds a pointer to V2.10.6 + V2.10.7
so a reader of the V2.10.5 summary knows where the
README-exception + i18n-only rules live.

The V2.10.9 fix is a **30-second text edit**; no source code, no
SPDX headers, no `package.json`, no `scripts/sync-docs.ps1`
changes. The `scripts/sync-docs.ps1` regen is unaffected.


### V2.10.10 — inner `previews/` `.gitignore` (legacy capture policy)

The inner `cubecloud-desktop/previews/` directory has 23
PNG / WebP files (`agents.png`, `chat.png`, `codegraph.png`,
`everos.png`, `gateway.png`, `headroom.png`, `mcp.png`,
`memory.png`, `models.png`, `persona.png`, `plans.png`,
`providers.png`, `schedules.png`, `sessions.png`,
`settings.png`, `skills.png`, `tools.png`, `welcome-remote.png`,
plus `header.webp` and `download.webp`, 2.14 MB total).
These are the **legacy captures** from the inherited
`hermes-desktop` framework.

The V2.10.6 transition trimmed the preview gallery from the
inner English `README.md` (0 references), so the PNGs are
**orphaned from the inner README**. The inherited CJK
translations (`README.ja-JP.md` and `README.zh-CN.md`)
**still reference 11 of the 23 files** in their preview
galleries (V2.10.7 preserved the CJK content byte-for-byte);
removing the PNGs would break the i18n galleries.

V2.10.10 closes the loop by adding `previews/` to
`cubecloud-desktop/.gitignore`. The 23 existing files stay
on disk for the i18n galleries; new PNGs added in the future
will not be committed by default. A future screenshot refresh
pass (tracked in `docs/RETIRED_AND_LEGACY.md` as a candidate)
would regenerate the captures under the Cubecloud brand, and
the i18n galleries would need to be re-pointed at the new
files.

The V2.10.10 transition is **non-destructive** (the 23 PNGs
are not deleted) and **cosmetic** (the build is unaffected).
No source code, no `package.json`, no
`scripts/sync-docs.ps1` changes.


## V2.10.11 — PROVENANCE_TRACKER aligns with V2.10.6/V2.10.7/V2.10.8/V2.10.10 + cross-link to TRADEMARK_POLICY

**Scope:** legal-doc layer only. `docs/legal/PROVENANCE_TRACKER.md`
(the engineering path-family ledger) was authored before the
V2.10 doc-move arc and still described `docs/legal/**` in
isolation. V2.10.11 makes it explicitly a sibling of
`TRADEMARK_POLICY.md`, which is the operative brand policy
since V2.5.

**Changes:**

1. Updated the `docs/legal/**` row in the path-family ledger
   to cross-link to `TRADEMARK_POLICY.md` (V2.5+). Status
   remains `Cubecloud-original`. No rule change.
2. Added a "Related policies" section at the end of
   `PROVENANCE_TRACKER.md` pointing readers at
   `TRADEMARK_POLICY.md § 1` (fork-and-rebrand must remove
   or replace Cubecloud marks) and § 4 (prohibited uses).
3. The `previews/**` row still says "Regenerate screenshots
   and package visuals from Cubecloud-owned assets" — the
   V2.10.10 `previews/` `.gitignore` policy (legacy captures
   excluded from future commits, kept on disk for the inherited
   CJK i18n README galleries until a screenshot-refresh pass
   replaces them) is consistent with that guidance. No change
   to the `previews/**` row text.

**Out of scope (deliberately):**

- `CUBECLOUD-EULA.md`, `COMMERCIAL_LICENSE.md`, and
  `PAID_SERVICES_TERMS.md` are all marked "Working draft /
  not legal advice" and are owned by counsel, not the V2.10
  cleanup arc. V2.10.11 touches none of them.
- `CLEAN_ROOM_REPLACEMENT_PLAN.md` already lists
  `previews/**` in its Phase 1 target paths (V2.4), so the
  V2.10.10 `previews/` `.gitignore` policy is already
  consistent with it. V2.10.11 touches it only by
  reference.
- `TRADEMARK_POLICY.md` itself is the operative policy.
  V2.10.11 does not amend it.

**Why this is the right next V2.10.x step:**

The other candidates (outer README translation stubs,
docs/handbook/ refresh, screenshot-refresh pass, i18n encoding
fix) all wait on either a native-speaker translator, a
screenshot/asset owner, or a design refresh. V2.10.11 is a
purely textual cross-link update that the engineering
executor can land safely without a counsel or design review.


## V2.10.12 — Outer README `## Translations` pointer to README.i18n.md

**Scope:** outer monorepo `README.md` only.

**Why this is the right next V2.10.x step:**

The V2.10.7 transition created `README.i18n.md` (the manifest)
and moved the 4 CJK translations to the inner location. The
manifest is the single source of truth for "which language
exists, where it lives, who maintains it" -- but the outer
`README.md` (the V2.10.6 monorepo README) never linked to it.
A reader landing on the outer README would have to discover
the manifest by reading the directory listing or the file
tree in the `## Repository layout` section.

V2.10.12 closes that gap with a 1-paragraph `## Translations`
section that points at `README.i18n.md` and explains the
"monorepo translations vs. binary translations" distinction.

**Changes:**

1. Added a new `## Translations` section to outer
   `README.md` (after the existing `## Contributing`
   section). The section is 3 short paragraphs, no rule
   change, no file addition.
2. The manifest at `README.i18n.md` is **unchanged** (it is
   the source of truth; the README is just a pointer).

**What is deliberately out of scope (V2.10.12 is the lowest-risk
option among the 5 remaining candidates):**

- **Outer README translation stubs** (e.g., `README.ja-JP.md`,
  `README.zh-CN.md`): would need a native-speaker translator
  to author. The manifest's "Why not at the outer root?"
  section already documents this constraint.
- **Inner `CONTRIBUTING.md` cross-links** to outer
  `CONTRIBUTING.md` + DCO + i18n policy: V2.10.13.
- **`docs/handbook/` refresh**: V2.10.14 (read-through +
  V2.6+ integration).
- **Screenshot refresh pass**: regenerates the 23 legacy
  `previews/` PNGs under Cubecloud branding.
- **i18n encoding fix for the inherited
  `CONTRIBUTING.ja-JP.md`**: mojibake; needs a fresh
  translation.


## V2.10.13 -- Inner CONTRIBUTING cross-links: deliberate no-op

**Outcome:** no source change. Decision documented here and in
`docs/RETIRED_AND_LEGACY.md` so a future maintainer does not
re-flag this candidate.

**Audit (V2.10.13, before this transition):**

The V2.10.12 closeout listed "Inner CONTRIBUTING cross-links
(V2.10.13)" as a candidate, on the assumption that the inner
`CONTRIBUTING.md` was a separate file that needed cross-links to
the outer `CONTRIBUTING.md` + DCO + i18n policy.

A fresh audit (`fsutil hardlink list`) shows the inner and outer
`CONTRIBUTING.md` are the **same Windows hardlink** (8,935 bytes,
17 headings, same inode). The V2.10.1 hardlink layer (8-file set:
LICENSE, NOTICE, BRANDING, CONTRIBUTING, ACKNOWLEDGMENTS,
THREAT_MODEL, SECURITY, README.i18n) was preserved by V2.10.6;
the README split in V2.10.6 was an intentional exception, not a
precedent for splitting CONTRIBUTING.

The shared `CONTRIBUTING.md` already covers:

- `## Languages` (the i18n policy).
- `## Developer Certificate of Origin (DCO)` (the DCO contract).
- `## License` (the dual-license + DCO rationale).
- `## Community` (channels, code of conduct).
- `## Reporting Vulnerabilities` (links to SECURITY.md).
- `## Acknowledgments` (links to ACKNOWLEDGMENTS.md + NOTICE).

So the "missing cross-link" gap is a false positive. There is no
outer-vs-inner drift to repair because there is no outer-vs-inner
distinction for this file.

**Why not split the hardlink (the V2.10.6-README precedent)?**

V2.10.6 broke the README hardlink because the outer monorepo
README and the inner binary README have **different audiences**
(agentic-OS maintainers vs. Electron binary end-users) and
genuinely different content. CONTRIBUTING has the **same
audience** (contributors) and the **same content** needs
(DCO sign-off, i18n policy, code style, reporting channels).
Splitting would just create two files that say the same thing,
and a future maintainer would have to remember to keep them in
sync. That is the anti-pattern the V2.10.1 hardlink layer was
designed to avoid.

**What this transition does:**

1. Adds this `## V2.10.13` sub-section to BRANDING (so the
   no-op is recorded in the per-version transition history).
2. Adds a V2.10.13 row to RETIRED_AND_LEGACY (so the next
   maintainer does not re-flag this candidate).
3. Touches no source file. No CONTRIBUTING, no
   sync-docs.ps1, no .gitignore, no scripts/.

**Next candidate:** `docs/handbook/` refresh (V2.10.14) --
read-through + V2.6+ integration pass. Touches 4 files.
The 4 outer-handbook files (ARCHITECTURE, DEVELOPMENT,
OPERATIONS, README) were moved via hardlink in V2.10.1, but
their content might be V2.4-era and not V2.6+ aware. A
read-through to surface any stale references to V2.4-era
infrastructure (pre-CodeGraph, pre-EverOS, pre-ACP) is the
natural next step.


## V2.10.15 — Outer monorepo README i18n stubs (ja-JP, zh-CN, ko-KR)

**Scope:** outer monorepo root. 3 new files: `README.ja-JP.md`,
`README.zh-CN.md`, `README.ko-KR.md`. Plus an update to the
manifest at `README.i18n.md`.

**Why this is the right next V2.10.x step:**

The V2.10.7 transition created the inner-binary i18n layer
(4 CJK files at `cubecloud-desktop/README.<lang>.md` and
`CONTRIBUTING.<lang>.md`) and the manifest at
`README.i18n.md`. The manifest's "Why not at the outer root?"
section said:

> As of V2.10.7, the agentic-OS monorepo content is English-
> only; community translations of the *binary* content
> (which is what the inner i18n files cover) stay at the
> inner location.

That statement was correct at the time, but it undersold the
discoverability of the monorepo for non-English readers. A
reader landing on the outer root via a search-engine or a
GitHub link has no obvious "this exists in your language
too" signal. V2.10.15 closes that gap by adding 3
placeholder files at the outer root -- one per language the
inner already supports (ja-JP, zh-CN), plus Korean (ko-KR)
which the inner does not yet have.

**Changes:**

1. Created `README.ja-JP.md`, `README.zh-CN.md`,
   `README.ko-KR.md` at the outer root. Each is a 1-
   paragraph placeholder explaining:
   - what the file is (placeholder, not a translation);
   - where the source of truth is (English README.md for
     the monorepo, cubecloud-desktop/README.md for the
     binary);
   - the workflow for a native speaker to translate the
     actual content (`README.i18n.md` §
     "Translation workflow").
2. Updated `README.i18n.md` "Current translations" table to
   add 4 new rows: the English monorepo README (which was
   missing from the table; only the English binary row was
   there), the 3 new monorepo placeholder rows, and the
   Korean language entry (the first time Korean appears in
   the manifest; the inner has no `ko-KR` files yet).
3. No source code change. No `package.json` /
   `scripts/sync-docs.ps1` / `.gitignore` change. The 3
   new files are NOT mirrored to the inner (the inner is a
   vendored Electron app, not the monorepo doc layer).

**Why placeholders, not translations:**

A real translation requires a native speaker. The 4 inner
CJK files are community-maintained and mojibake in places
(see the "Out of scope for V2.10.7" section of the
manifest for the encoding-fix caveat). The 3 outer placeholders
are deliberately **not** translations; they are stubs that
say "I exist for discoverability, please translate me" in
the target language. A native speaker can fork the file,
translate the body, and open a PR -- the manifest is set
up to track the new status row automatically once the file
no longer contains the "Placeholder" sentinel.

**What is deliberately out of scope (V2.10.15 covers only the
3 new files + the manifest update):**

- **Translating the actual `README.md` content into ja/zh/ko**
  -- needs native speakers. The placeholders are the invitation.
- **Translating the outer `CONTRIBUTING.md` / `HANDBOOK.md` /**
  §**handbook** files** -- same dependency on
  native speakers. The manifest already covers these in the
  "Translation workflow" section.
- **Encoding fix for the inherited inner `CONTRIBUTING.ja-JP.md`
  ** -- mojibake; needs a fresh translation. The V2.10.7
  transition documented this in `README.i18n.md`
  §"Out of scope for V2.10.7". V2.10.15 does not
  change the dependency.


## V2.10.14 — `docs/handbook/` refresh (additive, no rewrite)

**Scope:** 4 outer-handbook files (`docs/handbook/ARCHITECTURE.md`,
`DEVELOPMENT.md`, `OPERATIONS.md`, `README.md`). All 4 are Windows
hardlinks to the inner `cubecloud-desktop/docs/handbook/` mirrors;
this transition preserves the hardlink layer (no split, unlike the
V2.10.6 README split which had a genuine outer-vs-inner audience
distinction).

**Audit (V2.10.14, before this transition):**

A `grep` across the 4 files for V2-era markers:

- V2.3 / V2.4 / V2.5 mentions are all **intentional historical**
  context (e.g., "CodeGraph (V2.3)", "V2.3 —> V2.4 —> V2.5 work was the brand
  transition", "the structure is modelled on the V2.4 —> V2.5 —> V2.6
  brand-license history"). Not stale.
- V2.6 is referenced in all 4 files (current).
- V2.7 / V2.8 / V2.9 / V2.10 mentions: **0 in ARCHITECTURE, 0 in
  DEVELOPMENT, 1 in OPERATIONS (V2.7), 0 in README**. The real
  gap was the absence of transition pointers, not stale content.

**Changes:**

1. Added a "**Recent updates (V2.6 — V2.10).**" tail paragraph to each
   of the 4 files, pointing at BRANDING_AND_LICENSE.md and
   RETIRED_AND_LEGACY.md. The paragraph is 1 block in
   ARCHITECTURE.md, DEVELOPMENT.md, OPERATIONS.md, and
   README.md respectively (same content, anchored to each
   file's existing "Where to look next" tail).
2. No content rewrite. No hardlink break. No source code
   change. No `package.json` / `scripts/sync-docs.ps1` /
   `.gitignore` change.

**Why this is the right next V2.10.x step:**

The 4 handbook files are the "layer map" for the agentic-OS
monorepo. A reader landing on any of them (especially
ARCHITECTURE.md or README.md) needs a single-line pointer to
the V2.7-V2.10 transitions, otherwise the file looks
V2.6-frozen and the reader has to discover the BRANDING
history by accident. The 1-paragraph tail is the minimum
additive change that closes that gap without rewriting the
V2.6-aware architecture / development / operations / index
content that is already correct.

**What is deliberately out of scope (V2.10.14 is the lowest-risk
option among the 3 remaining candidates):**

- **Screenshot refresh pass**: regenerates the 23 legacy
  `previews/` PNGs under Cubecloud branding. Design + asset
  work, not docs-layer.
- **i18n encoding fix for the inherited
  `CONTRIBUTING.ja-JP.md`**: mojibake; needs a fresh
  translation by a native Japanese speaker.


## V2.10.16 — i18n cleanup: retire the V2.10.15 placeholders + ship real zh-CN

**Scope:** outer monorepo root. 3 placeholder files deleted; 1 new
real translation file created; manifest updated.

**What changed (V2.10.16):**

1. Deleted the 3 V2.10.15 placeholders at the outer root:
   `README.ja-JP.md`, `README.zh-CN.md`, `README.ko-KR.md`.
   Those placeholders were 1-paragraph English notes saying
   "this is a placeholder, please translate me" -- which is
   useless to a non-English reader. The user flagged this as
   confusing and asked for a real fix.
2. Created a real `README.zh-CN.md` (Simplified Chinese
   translation of the outer README.md) at the outer root.
   This is a machine-translated starting point that a native
   Chinese speaker can polish. The 4 inner CJK files
   (`cubecloud-desktop/README.<lang>.md` and
   `CONTRIBUTING.<lang>.md`) were NOT touched; they are real
   community translations and remain in place.
3. Updated `README.i18n.md` to reflect the new state:
   - the 3 V2.10.15 placeholder rows are replaced by 3 new
     rows (zh-CN live, ja-JP + ko-KR "not yet translated");
   - the manifest's "Why not at the outer root?" section is
     still correct: the outer monorepo README now has 1
     translation (zh-CN); the inner-binary README has 4
     community-maintained CJK files.

**Why we did NOT retire the 4 inner CJK files:**

The V2.10.7 manifest entry showed the inner 4 CJK files as
mojibake (e.g., `錦ユ渉錫?　(ja-JP)`) -- but
that was PowerShell 5.1 console-output display corruption of
the actual file content. A byte-level audit (V2.10.16) shows
all 4 files are real, valid UTF-8:

- `cubecloud-desktop/README.ja-JP.md` (22,662 bytes, real
  Japanese: `バイナリドキャ、エーセントオスセンター` etc.)
- `cubecloud-desktop/README.zh-CN.md` (18,785 bytes, real
  Simplified Chinese: `二进制文档、单仓` etc.)
- `cubecloud-desktop/CONTRIBUTING.ja-JP.md` (4,944 bytes, real
  Japanese: `貢献者政策` etc.)
- `cubecloud-desktop/CONTRIBUTING.zh-CN.md` (3,639 bytes, real
  Simplified Chinese: `贡献者政策` etc.)

Retiring them would throw away legitimate community work.
The files stay; the manifest is corrected to describe them
as "Live, V2.10.7 disclaimer trim" (not mojibake).

**Why we did NOT translate the outer README into ja-JP or ko-KR:**

- **ja-JP** requires a native Japanese speaker. Japanese
  technical doc has honorifics + sentence-final particles
  that a non-native cannot get right. The inner ja-JP files
  exist; if a Japanese-speaking contributor volunteers, the
  manifest workflow is set up for them to add the outer
  ja-JP translation.
- **ko-KR** has no inner counterpart at all. Inventing a
  20KB Korean translation from scratch would be low-quality
  and undermine the user's trust. The manifest marks it as
  "not yet translated" and invites community contribution.

**Out of scope (deliberately):**

- **Re-translation of the 4 inner CJK files.** Some of them
  may benefit from refresh (the inherited CJK is V2-era
  content), but that is a separate workstream from V2.10.16.
- **Native-speaker polish of the V2.10.16 zh-CN outer
  README.** The translation is a starting point; the
  manifest's "Translation workflow" invites native speakers
  to improve it.
- **Translations of the outer `CONTRIBUTING.md` /**
  `**HANDBOOK.md` / `**handbook**` files.** Same dependency
  on native speakers.


## V2.10.17 — Outer monorepo CONTRIBUTING.zh-CN.md (V2.10.16 README.zh-CN.md sibling)

**Scope:** outer monorepo root. 1 new file:
`CONTRIBUTING.zh-CN.md` (Simplified Chinese translation of the
outer `CONTRIBUTING.md`). Plus a manifest update.

**What changed (V2.10.17):**

1. Created `CONTRIBUTING.zh-CN.md` at the outer root. It is
   a Simplified Chinese translation of the outer
   `CONTRIBUTING.md` (8,935 bytes), covering: 贡献者指南、
   语言、从这里开始、进行修改、提交 PR、报告 bug、
   提出功能请求、项目结构、代码风格、社区、
   许可、DCO 、报告漏洞、致谢。
2. Updated `README.i18n.md` to add 2 new rows:
   English monorepo CONTRIBUTING (live via the V2.10.13
   hardlink) + Simplified Chinese monorepo CONTRIBUTING
   (Live, V2.10.17).
3. No source code change. No `package.json` /
   `scripts/sync-docs.ps1` / `.gitignore` change. The new
   file is NOT mirrored to the inner (the inner has its own
   `CONTRIBUTING.zh-CN.md` for the binary, which is a
   separate scope; the V2.10.13 audit confirmed the outer +
   inner `CONTRIBUTING.md` are the same hardlink, but the
   `.zh-CN.md` siblings are independent files).

**Why this is the right next V2.10.x step:**

After V2.10.16 shipped the outer `README.zh-CN.md`, the next
most-requested doc for a Chinese-speaking contributor is the
contributor policy itself: how to file a PR, the DCO sign-off
model, the code style, the community channels. The outer
`CONTRIBUTING.md` is a hardlink to the inner file (V2.10.13
audit), but the **outer** perspective is the agentic-OS
monorepo (V2.6+ skills ecosystem, 34 skills, the
`apps/desktop-shell` workspace, the 3-monorepo-doc-layer
hardlinks). The inner perspective is the binary (Hermes
runtime, Electron build, etc.). The V2.10.17 translation
covers the monorepo perspective, which is the one a new
contributor landing on the outer root needs.

**Out of scope (deliberately):**

- **`SECURITY.md` zh-CN translation.** Same pattern, but
  7,801 bytes; can ship in V2.10.18 if you want to continue.
- **`THREAT_MODEL.md` zh-CN translation.** Same pattern,
  6,249 bytes; can ship in V2.10.19.
- **`docs/HANDBOOK.md` zh-CN translation.** 26,579 bytes;
  larger; can ship in a later V2.10.x.
- **`docs/handbook/*.md` zh-CN translations.** 4 files,
  ~42 KB total; can ship later.
- **Native-speaker polish of the V2.10.16/V2.10.17
  translations.** Open invitation via the manifest.


## V2.10.18 — Outer monorepo SECURITY.zh-CN.md + retire fixptbr one-off utility

**Scope:** outer monorepo root. 1 new file (`SECURITY.zh-CN.md`),
2 retired files (`fixptbr.cmd` + `fixptbr.ps1`), 1 manifest update.

**What changed (V2.10.18):**

1. Created `SECURITY.zh-CN.md` at the outer root. It is
   a Simplified Chinese translation of the outer
   `SECURITY.md` (7,801 bytes), covering: 受支持的版本、
   部署指南、发布 fork、报告漏洞、安全更新政策、
   合作披露、证明。
2. Retired `fixptbr.cmd` (125 bytes) and `fixptbr.ps1`
   (2,023 bytes) at the outer root. These were one-off
   utilities for fixing a pt-PT mojibake issue in
   `cubecloud-desktop/src/shared/i18n/locales/pt-PT/memory.ts`.
   The target file is real UTF-8 now (verified byte-level),
   so the scripts are dead code. The user asked to retire
   legacy / overlay files; these are the only true "one-off
   utility" candidates in the outer root.
3. Updated `README.i18n.md` to add 2 new rows:
   English monorepo SECURITY (live via the V2.10.8
   hardlink) + Simplified Chinese monorepo SECURITY
   (Live, V2.10.18).
4. No source code change. No `package.json` /
   `scripts/sync-docs.ps1` / `.gitignore` change. The new
   file is NOT mirrored to the inner (the outer + inner
   `SECURITY.md` are the same Windows hardlink per the
   V2.10.8 audit, but the `.zh-CN.md` sibling is independent).

**Why fixptbr was safe to retire:**

The fixptbr script was a byte-based regex replace of
`Memèria` (mojibake for `Memória`) in the pt-PT
locale file. It was authored to handle a specific UTF-8
corruption that has since been corrected in the file. The
script was 100% one-off: no other file in the repo uses
the same anchor, no other locale had the same corruption,
and the fix has already been applied. Re-running the
script would either be a no-op (`IndexOf: -1` abort) or
would corrupt the now-correct file. Retiring it is the
right move per the Karpathy "Surgical Changes" rule:
remove the only "over-laying" file in the outer root that
has no remaining purpose.

**What I deliberately did NOT touch (per the user's
broader "clean caches and unused files" ask):**

- `.review-extras/` (202.85 MB, 4,030 files) +
  `.review-codegraph/` (25.84 MB, 1,138 files): both are
  already in the outer `.gitignore` (V2.10.2) and are
  re-cloneable from upstream. Deleting from disk would
  free 228 MB but does not affect the committed repo.
  Out of scope for V2.10.18; the user can do it manually
  with `rm -rf .review-extras .review-codegraph`.
- `cubecloud-desktop/node_modules/` (1,007 MB),
  `dist/` (2,360 MB), `out/` (24 MB): all already in the
  inner `.gitignore`. Deleting would force a 5-10 min
  `npm install` + 2-3 min `electron-vite build` on next
  `npm run dev`. Bad trade; not touched.
- 22 v2.10.x `.cjs` scripts in `scripts/`: recent V2.10
  transition history, not legacy. Kept.
- 2 `.py` files in `.agents/skills/ar-autoresearch/harness/`:
  these are the skill's own Python harness, not "unused".
  Kept.

**Out of scope (V2.10.19+ candidates):**

- `THREAT_MODEL.md` zh-CN translation (6.2 KB).
- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).
- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- Screenshot refresh pass (regenerate 23 preview PNGs).
- Native-speaker polish of V2.10.16/17/18 translations.


## V2.10.19 — Outer monorepo THREAT_MODEL.zh-CN.md (core 4 complete)

**Scope:** outer monorepo root. 1 new file:
`THREAT_MODEL.zh-CN.md`. Plus a manifest update.

**What changed (V2.10.19):**

1. Created `THREAT_MODEL.zh-CN.md` at the outer root. It
   is a Simplified Chinese translation of the outer
   `THREAT_MODEL.md` (6,249 bytes), covering: 信任边界、
   保护的资产、防御的对手、不防御的对手、
   辅助进程边界、剩余风险、未处理的具体威胁、
   更新本文件、与其他文件的关系。
2. Updated `README.i18n.md` to add 2 new rows:
   English monorepo THREAT_MODEL (live via the V2.10.8
   hardlink) + Simplified Chinese monorepo THREAT_MODEL
   (Live, V2.10.19).
3. No source code change. No `package.json` /
   `scripts/sync-docs.ps1` / `.gitignore` change. The new
   file is NOT mirrored to the inner (the outer + inner
   `THREAT_MODEL.md` are the same Windows hardlink per the
   V2.10.8 audit, but the `.zh-CN.md` sibling is independent).

**Why this was the right next V2.10.x step:**

After V2.10.16 (README), V2.10.17 (CONTRIBUTING), and
V2.10.18 (SECURITY), the **core 4 outer monorepo docs**
for Chinese-speaking users are now complete. A Chinese-
speaking user landing on the outer root can read all 4
primary docs in their own language: what the project is,
how to contribute, how to deploy safely, and what threats
are in scope. The next tier (HANDBOOK + 4 handbook
files) is larger (26.6 KB + 42 KB) and can ship in
follow-up V2.10.x turns.

**Out of scope (V2.10.20+ candidates):**

- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).
- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Screenshot refresh pass (regenerate 23 preview PNGs).
- Native-speaker polish of V2.10.16/17/18/19 translations.


## V2.10.20 — Combined README PDF (English + Simplified Chinese)

**Scope:** outer monorepo. 1 new file (`docs/Cubecloud-README-
en-zh.pdf`, 1.3 MB, 18 pages) + 1 new script
(`scripts/v2.10.20-readme-combined-pdf.cjs`).

**What changed (V2.10.20):**

1. Created `docs/Cubecloud-README-en-zh.pdf` (1,348,750 bytes,
   18 pages, PDF 1.4) by combining the outer `README.md`
   (English) and `README.zh-CN.md` (Simplified Chinese) into
   a single HTML file and rendering with headless Google
   Chrome via `--headless=new --print-to-pdf`. No npm
   install required; Chrome is at the standard Windows path.
2. The PDF opens with the English section (19,270 bytes of
   source, 7 headings, 1 table, 1 fenced code block for the
   repository-layout tree), then a `English —> Simplified
   Chinese` divider page (CSS `page-break-before: always`),
   then the Simplified Chinese section (10,903 bytes of
   source, 8 headings, 1 table, 1 fenced code block).
3. New script `scripts/v2.10.20-readme-combined-pdf.cjs`
   handles the conversion. It includes a small built-in
   Markdown —> HTML converter (no `marked` or `markdown-it`
   dependency), GitHub-flavored styling (max-width 900px,
   monospace code blocks, table borders, blockquote rule),
   and the same divider-page CSS as the inner styling. The
   intermediate HTML is written to
   `.review-extras/pdf-build/combined.html` (under the
   V2.10.2-scratch-pad .gitignore).
4. No source code change. No `package.json` /
   `scripts/sync-docs.ps1` / `.gitignore` change. The PDF
   is **tracked** (committed) because the user asked for it
   as a release artifact; if the team wants to exclude it
   from commits, add `docs/*.pdf` to the outer .gitignore.

**Verification:**

- File starts with `%PDF-1.4` (valid PDF magic).
- Title metadata reads `Cubecloud Agentic-OS` (UTF-16 BE).
- 18 `/Type /Page` objects (English section ~9 pages,
  divider 1 page, Chinese section ~8 pages).
- `prelaunchSeed.smoke.mjs` still 40/40 PASS (no source
  code touched).

**Out of scope (V2.10.21+ candidates, unchanged from
V2.10.19):**

- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Scratch-pad disk cleanup (228 MB, manual).
- Clean build-state reset (~3.4 GB, slow rebuild).
- Screenshot refresh pass (23 preview PNGs).
- Native-speaker polish of V2.10.16/17/18/19 translations.
- (Re-render this PDF after native-speaker polish.)


## V2.10.21 — Translation correction pass + combined PDF re-render

**Scope:** `README.md`, `README.zh-CN.md`, `README.i18n.md`, and
the already-tracked PDF artifact at
`docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.21):**

1. Updated the outer `README.md` `## Translations` section to match
  reality. It no longer says the monorepo is English-only; it now
  points readers at the 4 outer zh-CN monorepo docs
  (`README.zh-CN.md`, `CONTRIBUTING.zh-CN.md`,
  `SECURITY.zh-CN.md`, `THREAT_MODEL.zh-CN.md`) and at the
  `README.i18n.md` manifest as the single source of truth for the
  translation inventory.
2. Rewrote `README.i18n.md` to reflect the current split between
  outer monorepo translations and inner binary translations. The
  stale V2.10.7 claims that "all translations live in the inner
  mirror", that the monorepo is still English-only, and that every
  translation PR opens only at the inner location are removed.
  The workflow now distinguishes monorepo docs (outer root / `docs/`)
  from binary docs (`cubecloud-desktop/`).
3. Corrected obvious machine-translation artifacts in
  `README.zh-CN.md` without rewriting the whole document. Examples:
  `沉编自` -> `改编自`, `技能湇表` -> `技能清单`,
  `双许可8a0定位` -> `双许可定位`, `中文中文中文翻译` ->
  `简体中文翻译`, `湇表` -> `清单`, `译他语言` ->
  `翻译成其他语言`, `凑书` -> `凭据`, `文档链接重生` ->
  `文档链接重建`, `画板` -> `审阅暂存区`, and the broken
  `，—— 桌面端是一切的入口。` -> `，而桌面端是一切的入口。`
4. Re-rendered `docs/Cubecloud-README-en-zh.pdf` with
  `node scripts/v2.10.20-readme-combined-pdf.cjs` so the release
  artifact matches the corrected English + zh-CN source docs. The
  PDF is now 1,357,058 bytes (PDF 1.4, 18 pages).

**Why this is the right V2.10.21 step:**

V2.10.16 through V2.10.19 prioritized coverage (README,
CONTRIBUTING, SECURITY, THREAT_MODEL in zh-CN). V2.10.21 pauses the
coverage expansion for a correctness pass. Before translating
`docs/HANDBOOK.md` or the 4 `docs/handbook/*.md` files, the top-level
translation policy and the first user-facing zh-CN doc needed to stop
contradicting the actual repo state.

**Out of scope (still unchanged after V2.10.21):**

- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).
- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Scratch-pad disk cleanup (228 MB, manual).
- Clean build-state reset (~3.4 GB, slow rebuild).
- Screenshot refresh pass (23 preview PNGs).
- Native-speaker polish of the zh-CN translations.


## V2.10.22 — README value framing refresh (deterministic knowledge, technical leverage, efficiency, financial value)

**Scope:** `README.md`, `README.zh-CN.md`, and the already-tracked
PDF artifact at `docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.22):**

1. Added a new section to the English `README.md`:
  `## Deterministic knowledge, technical leverage, and cost control`.
  It makes the product thesis explicit in four dimensions the user
  asked for:
  - deterministic knowledge value,
  - technical value,
  - efficiency value,
  - financial value.
2. The new section explains why local-first is not just a privacy
  posture. It changes where the system knowledge lives (files,
  SQLite, explicit IPC contracts), how reproducible the system is,
  how fast the operator loop becomes, and what the operator pays for.
3. The financial-value paragraph now states the comparison the user
  explicitly asked for: cloud-first stacks often charge in three
  places at once (hosted wrapper seat, model API, retrieval/storage/
  agent-tooling costs); BYOK reduces procurement lock-in but usually
  does not change the token-cost model and often still leaves the
  user paying the wrapper vendor on top. Local-first lets already-
  paid hardware handle drafting, retrieval, orchestration, and
  iterative debugging, reserving expensive remote inference for
  frontier-model turns.
4. Added the matching Simplified Chinese section to `README.zh-CN.md`:
  `## 确定性知识、技术杠杆与成本控制`.
5. Re-rendered `docs/Cubecloud-README-en-zh.pdf` with
  `node scripts/v2.10.20-readme-combined-pdf.cjs` so the release
  artifact reflects the refreshed English + zh-CN wording. The PDF
  is now 1,460,047 bytes.

**Why this is the right V2.10.22 step:**

The prior V2.10.16-V2.10.21 work focused on translation coverage and
translation correctness. That solved discoverability and readability,
but not the stronger product argument you asked for: why deterministic
local knowledge matters, why the runtime/provider split creates
technical leverage, why the local-first operator loop is more
efficient, and why local-first AI can be materially cheaper than
cloud-only API or wrapper-plus-BYOK stacks. V2.10.22 is the README
positioning pass that turns those implicit advantages into explicit
language.

**Out of scope (still unchanged after V2.10.22):**

- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).
- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Scratch-pad disk cleanup (228 MB, manual).
- Clean build-state reset (~3.4 GB, slow rebuild).
- Screenshot refresh pass (23 preview PNGs).
- Native-speaker polish of the zh-CN translations.


## V2.10.23 — PDF renderer cleanup (uniform margins, fonts, and alignment)

**Scope:** `scripts/v2.10.20-readme-combined-pdf.cjs` and the
already-tracked PDF artifact at `docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.23):**

1. Rewrote the built-in Markdown —> HTML conversion logic in
   `scripts/v2.10.20-readme-combined-pdf.cjs`.
   The original converter was structurally wrong in ways that caused
   uneven margins and visibly broken alignment in the PDF:
   - wrapped paragraph lines were emitted as one `<p>` per line,
   - ordered lists were opened as `<ol>` but always closed as `</ul>`,
   - the README comparison table produced an empty `<tbody>` and then
     rendered the data rows as plain paragraphs,
   - the raw centered badge HTML at the top of the README was wrapped
     into nested `<p><p ...>` blocks,
   - blockquotes were split line-by-line instead of grouped.
2. The new converter now:
   - preserves raw HTML blocks (the centered logo + badges),
   - joins wrapped paragraph lines into real paragraphs,
   - supports ordered and unordered lists with the correct closing
     tags,
   - supports indented continuation lines within list items,
   - collects the full Markdown table (header, separator, body rows)
     before rendering,
   - groups consecutive blockquote lines into one blockquote paragraph.
3. Refined the PDF CSS for a more uniform print result:
   - explicit `@page` margins (`18mm 16mm 18mm 16mm`),
   - a consistent cross-language font stack (`Segoe UI`, `Inter`,
     `PingFang SC`, `Microsoft YaHei`, `Noto Sans CJK SC`, etc.),
   - tighter heading spacing and border rhythm,
   - more consistent paragraph/list/table spacing,
   - fixed table cell borders and word wrapping,
   - centered badge HTML styling via `p[align="center"]`,
   - a cleaner divider page between English and Simplified Chinese.
4. Re-rendered `docs/Cubecloud-README-en-zh.pdf` with the fixed
   renderer. The artifact shrank from 1,460,047 bytes to 890,791
   bytes because the HTML is now structurally cleaner (fewer redundant
   paragraph nodes and no broken table/list markup).

**Verification:**

- `combined.html` no longer contains nested `<p><p` blocks.
- The comparison table renders with a real `<tbody>`.
- Ordered lists render as `<ol> ... </ol>` instead of mixing list tags.
- The refreshed PDF is valid `%PDF-1.4`.
- `prelaunchSeed.smoke.mjs` still 40/40 PASS.

**Why this is the right V2.10.23 step:**

The user explicitly called out that the margins, fonts, and overall
render style of the README-to-PDF conversion did not look uniform or
aligned. The root cause was not just CSS — it was invalid HTML emitted
by the custom converter. V2.10.23 fixes the problem at the source:
clean HTML first, then clean print styling.

**Out of scope (still unchanged after V2.10.23):**

- `docs/HANDBOOK.md` zh-CN translation (26.6 KB).
- 4 `docs/handbook/*.md` zh-CN translations (~42 KB).
- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Scratch-pad disk cleanup (228 MB, manual).
- Clean build-state reset (~3.4 GB, slow rebuild).
- Screenshot refresh pass (23 preview PNGs).
- Native-speaker polish of the zh-CN translations.


## V2.10.24 — Master handbook repair + HANDBOOK.zh-CN.md

**Scope:** `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`, `README.md`, and `README.i18n.md`.

**What changed (V2.10.24):**

1. Repaired actual mojibake in `docs/HANDBOOK.md`. Unlike the earlier
   PowerShell-only display corruption seen in some files, the master
   handbook itself contained real broken tokens: `鈥?`, `搂`, `鈫?`,
   `虏`, `绠€浣撲腑鏂?`, and `鏃ユ湰瑾?`. These were restored to
   `—`, `§`, `→`, `²`, `简体中文`, and `日本語` respectively.
2. Restored the misplaced `### 5.4 Adding a new skill` block to the
   correct position before `### 5.5 The process methodology`.
3. Added `docs/HANDBOOK.zh-CN.md` as the Simplified Chinese
   translation of the master handbook index. This is the first zh-CN
   translation under `docs/` proper (the earlier V2.10.16-19 work
   covered only top-level monorepo docs).
4. Updated `README.md` and `README.i18n.md` so the new handbook
   translation is discoverable and the manifest no longer lists
   `docs/HANDBOOK.md` as future work.

**Why this is the right V2.10.24 step:**

The previous recommendation was `docs/HANDBOOK.md` zh-CN, then the 4
leaf docs under `docs/handbook/`. Before translating the leaf docs,
the master index needed to be both readable in English and available
in Chinese. That creates a stable source-of-truth index for the next
translation wave.

**Out of scope (now the next immediate layer):**

- `docs/handbook/README.zh-CN.md`
- `docs/handbook/ARCHITECTURE.zh-CN.md`
- `docs/handbook/DEVELOPMENT.zh-CN.md`
- `docs/handbook/OPERATIONS.zh-CN.md`
- Native-speaker polish of all zh-CN translations.


## V2.10.25 — `docs/handbook/*.zh-CN.md` wave (leaf-doc layer)

**Scope:** `docs/handbook/README.zh-CN.md`,
`docs/handbook/ARCHITECTURE.zh-CN.md`,
`docs/handbook/DEVELOPMENT.zh-CN.md`,
`docs/handbook/OPERATIONS.zh-CN.md`, plus the translation inventory
surfaces that point at them.

**What changed (V2.10.25):**

1. Added `docs/handbook/README.zh-CN.md` as the Simplified Chinese
   translation of the handbook sub-doc index.
2. Added `docs/handbook/ARCHITECTURE.zh-CN.md` as the Simplified
   Chinese translation of the architecture deep-dive.
3. Added `docs/handbook/DEVELOPMENT.zh-CN.md` as the Simplified
   Chinese translation of the development guide.
4. Added `docs/handbook/OPERATIONS.zh-CN.md` as the Simplified
   Chinese translation of the operations guide.
5. Updated `README.md`, `README.zh-CN.md`, `docs/HANDBOOK.zh-CN.md`,
   and `README.i18n.md` so the new handbook-leaf translations are
   discoverable and so the translation inventory reflects the full
   zh-CN handbook layer, not just the top-level docs.
6. Aligned `docs/HANDBOOK.md` with the repo-wide wording change from
   `Copilot skills` to `open-source skills` in the top-level
   description of the 34-skill layer.

**Why this is the right V2.10.25 step:**

V2.10.24 translated the master handbook index, but the next agreed
layer was the 4 leaf docs under `docs/handbook/`. Shipping the
leaf-doc layer in the same zh-CN wave means the handbook is now useful
as an actual navigation system for Chinese-speaking readers instead of
being a translated front page that mostly links into English-only
content.

**Out of scope (what remains after V2.10.25):**

- `docs/RETIRED_AND_LEGACY.md` zh-CN (12.9 KB, low priority).
- Scratch-pad disk cleanup (228 MB, manual).
- Clean build-state reset (~3.4 GB, slow rebuild).
- Screenshot refresh pass (23 preview PNGs).
- Native-speaker polish of the full zh-CN handbook layer.

## V2.10.26 - full top-to-bottom README rewrite

**Scope:** `README.md`, `README.zh-CN.md`, `README.i18n.md`, and
`docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.26):**

1. Rewrote the outer `README.md` top-to-bottom so the monorepo now
  opens with a clearer product story: business value first, then
  local-first economics, then audience fit, repo contents, market
  position, production posture, and architecture.
2. Reframed the README's market-position section so it compares
  Cubecloud against cloud IDE copilots, single-vendor CLIs,
  quickstarts, and BYOK wrappers in terms of operator control and
  unit economics instead of a long undifferentiated feature list.
3. Fixed the outer README logo path so the monorepo README points at a
  tracked Cubecloud branding asset instead of a missing outer-root
  path.
4. Synced `README.zh-CN.md` to the new structure so the Simplified
  Chinese monorepo README does not immediately diverge from the new
  English source.
5. Updated `README.i18n.md` to record the V2.10.26 README rewrite
  status and re-rendered `docs/Cubecloud-README-en-zh.pdf` so the PDF
  artifact matches the rewritten source docs.

**Why this is the right V2.10.26 step:**

The V2.10.21-V2.10.23 passes improved the README incrementally, but the
outer monorepo README still led with inventory before value and buried
the local-first and competitor-positioning story below the fold. A
true rewrite is the cleanest low-risk way to improve the repo's first
impression without changing the underlying product claims, the
outer-vs-inner README split, or the legal / security posture.

**Out of scope (what remains after V2.10.26):**

- Native-speaker polish of the rewritten `README.zh-CN.md`.
- Japanese and Korean monorepo READMEs.
- `docs/RETIRED_AND_LEGACY.md` zh-CN.
- Screenshot refresh pass (23 preview PNGs).
- Scratch-pad disk cleanup and clean build-state reset.

## V2.10.29 - Headroom workflow layer for Copilot and VS Code

**Scope:** `.github/skills/headroom-workflow/SKILL.md`, `.github/copilot-instructions.md`, `cubecloud-desktop/AGENTS.md`, `.agents/skills/README.md`, `docs/agent-skills-bundle/README.md`, `docs/agent-skills-bundle/HEADROOM.md`, and `docs/GLOBAL-INSTALL-PLAN.md`.

**What changed (V2.10.29):**

1. Added `.github/skills/headroom-workflow/SKILL.md` as the repo-local workflow skill for Headroom-specific Copilot and VS Code tasks.
2. Wired Headroom-aware guidance into `.github/copilot-instructions.md` so repo sessions know that Headroom already exists on the desktop/runtime side and should be treated as an existing surface, not a missing one.
3. Wired the same guidance into `cubecloud-desktop/AGENTS.md` so desktop-focused work starts from the existing Headroom sidecar, MCP, and renderer surfaces.
4. Updated `.agents/skills/README.md` so maintainers can discover the new repo-local workflow skill alongside `docs-i18n-refresh`.
5. Added `docs/agent-skills-bundle/HEADROOM.md` as a focused guide for non-repo Copilot / VS Code sessions: install Headroom itself, choose proxy/MCP/wrap mode, and mirror the workflow skill to `~/.agents/skills/headroom-workflow/`.
6. Updated `docs/agent-skills-bundle/README.md` and `docs/GLOBAL-INSTALL-PLAN.md` so the bundle/global-install docs no longer treat Headroom as an implicit gap; they now document the split between the Headroom runtime install and the Copilot workflow layer.

**Why this is the right V2.10.29 step:**

Headroom was already integrated into Cubecloud desktop as a Python proxy sidecar, MCP surface, and CodeGraph compression path, but the Copilot / VS Code workflow layer was missing. Adding that layer now closes the practical gap: repo sessions can trigger Headroom-aware guidance correctly, and non-repo Copilot sessions have a documented global install path instead of relying on tribal knowledge.

**Out of scope (what remains after V2.10.29):**

- Native-speaker review of the new translated doc surfaces from V2.10.28.
- UI/UX polish for the desktop Headroom screen and onboarding copy.
- A dedicated installer command in `docs/agent-skills-bundle/` that mirrors the Headroom workflow skill automatically.
- Screenshot refresh pass (23 preview PNGs).
- Scratch-pad disk cleanup and clean build-state reset.

## V2.10.27 - `README.zh-CN.md` editorial polish pass

**Scope:** `README.zh-CN.md`, `README.i18n.md`, and
`docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.27):**

1. Polished `README.zh-CN.md` so the Simplified Chinese monorepo README
  reads less like a literal structural sync of the V2.10.26 English
  rewrite and more like an intentional Chinese product / technical
  narrative.
2. Tightened the wording around the opening value proposition,
  local-first economics, market position, and production-readiness
  sections without changing the underlying product claims.
3. Normalized a handful of awkward English borrowings and literal turns
  of phrase in the zh-CN copy while preserving the same section order
  as the current English source.
4. Updated `README.i18n.md` so the translation manifest records the
  V2.10.27 editorial polish pass honestly: improved wording, but still
  not a substitute for native-speaker review.
5. Re-rendered `docs/Cubecloud-README-en-zh.pdf` so the bilingual PDF
  artifact matches the polished zh-CN source.

**Why this is the right V2.10.27 step:**

V2.10.26 aligned the zh-CN README structurally with the new English
README, but several sections still read like direct translation rather
than natural Chinese product copy. An editorial polish pass is the
lowest-risk way to improve readability and business clarity now,
without over-claiming that the file has already had full native-speaker
review.

**Out of scope (what remains after V2.10.27):**

- Native-speaker review of `README.zh-CN.md` and the rest of the outer zh-CN doc set.
- Japanese and Korean monorepo READMEs.
- `docs/RETIRED_AND_LEGACY.md` zh-CN.
- Screenshot refresh pass (23 preview PNGs).
- Scratch-pad disk cleanup and clean build-state reset.

## V2.10.28 - outer README language wave + retired-surface zh-CN

**Scope:** `README.zh-CN.md`, `README.ja-JP.md`, `README.ko-KR.md`,
`docs/RETIRED_AND_LEGACY.zh-CN.md`, `README.md`, `README.i18n.md`, and
`docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.28):**

1. Added `README.ja-JP.md` as a Japanese outer-monorepo README starting
   point aligned to the current English README structure.
2. Added `README.ko-KR.md` as a Korean outer-monorepo README starting
   point aligned to the current English README structure.
3. Added `docs/RETIRED_AND_LEGACY.zh-CN.md` so the live / legacy /
   scratch-pad classification surface is no longer English-only for the
   Simplified Chinese doc layer.
4. Tightened a few remaining wording issues in `README.zh-CN.md`,
   including the market-position sentence, the local-first terminology,
   and the translation pointer section.
5. Updated `README.md` and `README.i18n.md` so the top-level translation
   pointers and manifest reflect the new outer ja-JP / ko-KR README
   files and the new `docs/RETIRED_AND_LEGACY.zh-CN.md` surface.
6. Re-rendered `docs/Cubecloud-README-en-zh.pdf` so the bilingual PDF
   artifact matches the latest English and Simplified Chinese README
   sources.

**Why this is the right V2.10.28 step:**

V2.10.27 improved the Simplified Chinese README, but the outer monorepo
was still missing any Japanese or Korean README surface and the retired
/ legacy reference table remained English-only. Shipping those starter
translations now makes the monorepo materially easier to navigate for
non-English readers, while keeping the manifest honest that native-
speaker review is still needed.

**Out of scope (what remains after V2.10.28):**

- Native-speaker review of the outer zh-CN doc set.
- Native-speaker review and polish of `README.ja-JP.md` and `README.ko-KR.md`.
- Native-speaker review of `docs/RETIRED_AND_LEGACY.zh-CN.md`.
- Screenshot refresh pass (23 preview PNGs).
- Scratch-pad disk cleanup and clean build-state reset.


## V2.10.30 - history archive + cache purge + preview refresh

**Scope:** `BRANDING_AND_LICENSE.md`, `docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md`, `docs/RETIRED_AND_LEGACY.md`, `docs/RETIRED_AND_LEGACY.zh-CN.md`, `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`, `docs/legal/PROVENANCE_TRACKER.md`, `cubecloud-desktop/README.md`, `cubecloud-desktop/README.ja-JP.md`, `cubecloud-desktop/README.zh-CN.md`, `cubecloud-desktop/.gitignore`, and the refreshed preview subset under `cubecloud-desktop/previews/`.

**What changed (V2.10.30):**

1. Archived the bulky V2.3 — V2.9 provenance narrative into `docs/archive/BRANDING_AND_LICENSE.v2.3-v2.9.md` and collapsed the main `BRANDING_AND_LICENSE.md` entries for those early passes into short archive pointers.
2. Refreshed the binary README preview surfaces to a smaller current Cubecloud-branded subset (`welcome.png`, `chat.png`, `gateway.png`, `runtime-detection.png`) and removed the dependency on the old header/download images in the CJK binary READMEs.
3. Narrowed the preview policy in `cubecloud-desktop/.gitignore` so only the refreshed preview subset remains in scope for the binary README surfaces.
4. Updated the lifecycle docs so scratch clones are explicitly safe to purge locally and the preview row now reflects the refreshed active subset instead of the legacy 23-file gallery.

**Why this is the right V2.10.30 step:**

By V2.10.29 the repo had accumulated both a very large pre-V2.10 provenance narrative and several local-only scratch/cache surfaces that no longer needed to stay on disk. At the same time, the binary CJK READMEs were still pinned to an inherited preview gallery. Archiving the older history, shrinking the preview set, and purging the local scratch surfaces is the safest way to reduce drift without erasing provenance or breaking active docs.

**Out of scope (what remains after V2.10.30):**

- Refreshing the remaining binary screenshots beyond the four-file preview subset.
- Regenerating the binary app icons (`build/icon.*`) from the latest Cubecloud brand assets.
- Native-speaker review of the translated doc surfaces from V2.10.28.
- Any destructive cleanup of installed dependencies such as `node_modules/`.


## V2.10.31 - icon regeneration + binary translation wording polish

**Scope:** `cubecloud-desktop/build/icon.{png,ico,icns}`, `cubecloud-desktop/resources/icon.png`, `cubecloud-desktop/src/renderer/src/assets/icon.png`, `cubecloud-desktop/README.ja-JP.md`, `cubecloud-desktop/README.zh-CN.md`, `cubecloud-desktop/CONTRIBUTING.ja-JP.md`, `cubecloud-desktop/CONTRIBUTING.zh-CN.md`, `README.i18n.md`, `docs/RETIRED_AND_LEGACY.md`, `docs/RETIRED_AND_LEGACY.zh-CN.md`, `docs/legal/PROVENANCE_TRACKER.md`, `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`, and `docs/handbook/{ARCHITECTURE,ARCHITECTURE.zh-CN}.md`.

**What changed (V2.10.31):**

1. Regenerated the packaged icon assets (`build/icon.png`, `build/icon.ico`, `build/icon.icns`) plus the matching PNG copies in `resources/` and the renderer asset tree from the current Cubecloud raster mark.
2. Polished the roughest remaining Japanese and Simplified Chinese binary README / CONTRIBUTING headers and top-level wording so those files no longer open with mixed-language or visibly broken phrasing.
3. Updated the translation manifest and lifecycle/provenance docs so they reflect the new binary wording-polish pass and the fact that the packaged icon set is no longer pending.

**Why this is the right V2.10.31 step:**

After the V2.10.30 cleanup, the binary preview surfaces were current but the packaged icon set was still flagged as pending and the roughest binary CJK intro copy still read like an earlier machine-translated pass. Regenerating the actual icon artifacts and fixing the most visible translation rough edges closes those two remaining quality gaps without widening scope into a full translation rewrite.

**Out of scope (what remains after V2.10.31):**

- A true native-speaker review of the binary Japanese and Chinese docs.
- Broader line-by-line translation cleanup of the binary CJK README / CONTRIBUTING files.
- A future brand pass on release automation metadata and remaining in-app locale strings.


## V2.10.32 - old publish-coordinate cleanup

**Scope:** `CONTRIBUTING.md`, `CONTRIBUTING.zh-CN.md`, `cubecloud-desktop/{README.ja-JP.md,README.zh-CN.md,CONTRIBUTING.ja-JP.md,CONTRIBUTING.zh-CN.md}`, `cubecloud-desktop/dev-app-update.yml`, `cubecloud-desktop/build/winget/Locale.en-US.template.yaml`, `cubecloud-desktop/scripts/generate-winget-manifests.mjs`, `cubecloud-desktop/tests/winget-generator.test.ts`, `cubecloud-desktop/.github/workflows/release.yml`, and `cubecloud-desktop/src/main/index.ts`.

**What changed (V2.10.32):**

1. Repointed the remaining live issue and release links away from `JZKK720/cubecloud-agent-desktop` and toward `cubecloud-contributors/cubecloud-agentic-os`.
2. Updated the desktop updater feed metadata, Winget template/defaults/tests, and release-workflow defaults so packaging and release surfaces resolve against the current monorepo release location.
3. Cleaned the last visible stale repo coordinates out of the binary Japanese/Chinese README and CONTRIBUTING surfaces, plus the in-app `Agent Desktop Issues` menu action.

**Why this is the right V2.10.32 step:**

The repo had already gone through several rebrand/documentation passes, but a handful of live publish and issue coordinates still pointed at the old desktop-specific repo. Cleaning those last active coordinates now closes the loop at the release/documentation layer so future changes stop bouncing between two GitHub locations.

**Out of scope (what remains after V2.10.32):**

- Legacy Hermes upstream docs/community endpoints that are still intentionally referenced as runtime guidance.
- Native-speaker review of the binary Japanese and Chinese docs.
- Broader in-app locale cleanup beyond the surfaces touched here.


## V2.10.33 - Headroom installer helper + quick-start UX polish

**Scope:** `docs/agent-skills-bundle/install-headroom-workflow.cmd`, `docs/agent-skills-bundle/HEADROOM.md`, `docs/agent-skills-bundle/README.md`, `docs/GLOBAL-INSTALL-PLAN.md`, and `cubecloud-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`.

**What changed (V2.10.33):**

1. Added `docs/agent-skills-bundle/install-headroom-workflow.cmd` so the repo now has a one-command path for mirroring the Headroom workflow skill into `~/.agents/skills/` for non-repo Copilot sessions.
2. Updated the Headroom install docs so they point at that helper command rather than forcing a manual copy step every time.
3. Added a small quick-start card to the desktop Headroom screen so operators immediately see the recommended sequence: start in audit mode, validate savings, then move to optimize mode after the proxy is healthy.

**Why this is the right V2.10.33 step:**

The Headroom workflow layer already existed in the repo and the user-global mirror path was documented, but it still required manual copying and the desktop screen dropped the operator directly into advanced controls. A helper command plus a small quick-start card closes the usability gap on both fronts without changing the runtime architecture.

**Out of scope (what remains after V2.10.33):**

- Localized copy for the new Headroom quick-start card.
- Deeper visual redesign of the entire Headroom screen.
- Auto-install or runtime detection of Headroom itself from the installer helper.


## V2.10.35 - Outer README + HANDBOOK ontology framing (docs-only)

**Scope:** `README.md`, `README.zh-CN.md`, `docs/HANDBOOK.md`, `docs/HANDBOOK.zh-CN.md`, `README.i18n.md`, `docs/RETIRED_AND_LEGACY.md`, and `docs/Cubecloud-README-en-zh.pdf`.

**What changed (V2.10.35):**

1. Added a new "**Conceptual model: object + action**" sub-section to the outer `README.md` and the matching `概念模型：对象 + 动作` sub-section to `README.zh-CN.md`. The new sub-section makes the noun/verb split in the local surfaces explicit: objects are profiles, sessions, models, providers, skills, memories, tools, schedules, kanban tasks; actions are dispatch, schedule, commit-learn, apply-query, revert. It also names the Palantir Foundry ontology as the closest public reference frame and is honest about the scale difference (a digital twin of one desk, not of an org).
2. Added a `### 4.3 Conceptual model: object + action (V2.10.35)` sub-section to `docs/HANDBOOK.md` and the matching `### 4.3 概念模型：对象 + 动作（V2.10.35）` sub-section to `docs/HANDBOOK.zh-CN.md`. The HANDBOOK sub-section is the long-form version: it names the actual TypeScript interfaces that are the nouns (`AgentSkill`, `AgentMemoryEntry`, `AgentTool`, `AgentSchedule`, etc.) and the verbs (`ControlPlaneDispatchRuntimeRequest` / `Result` / `Executor`, `AgentSchedule.cron`, `CodeGraphQueryTemplate.mode`, `headroom learn --apply`). It also calls out the `headroom learn --apply` review flow as the one place in the repo where the **branch-and-review** gate is fully implemented, which prevents AI from writing to the ontology without an explicit human action.
3. Pointed contributors at two public reference materials: Satoshi Yamauchi's open-source book [`palantir-ontology-strategy`](https://github.com/Leading-AI-IO/palantir-ontology-strategy) and the 51CTO article *"Palantir 的"本体论"（Ontology）究竟是什么？"* — both recommended reading, neither required pre-reading.
4. Bumped `README.i18n.md`'s policy header from V2.10.28 to V2.10.35 and recorded this pass in the V2.10.28+ "Out of scope" list.

**Why this is the right V2.10.35 step:**

The repo already has the noun-shaped `agentControlPlane.ts` registries and the verb-shaped dispatch / schedule / learn-revert actions. Stating the model explicitly in the README and HANDBOOK gives new contributors a familiar reference frame (Palantir's Foundry ontology) without requiring them to discover the noun/verb structure by reading the source. This is the smallest possible docs change that sharpens the market position for the small-team and prosumer buyer, and it does so without changing the architecture, schemas, IPC, or tests.

**Out of scope (what remains after V2.10.35):**

- Hardening the implementation by collapsing the hand-rolled JSON registries into a single typed `AgentAction` registry. The conceptual contract is now documented; a future V2.10.x can land the schema change when a concrete feature (e.g. "schedule a workflow as a typed action") needs it.
- Native-speaker polish of the new `概念模型` and `Conceptual model` sub-sections, plus a real Palantir-ontology-style review by a reader who has actually used Foundry.
- Native-speaker review of the new `README.ja-JP.md` / `README.ko-KR.md` outer monorepo READMEs (still machine-translated starting points from V2.10.28).


## V2.10.36 - inner doc retirement (Option S)

**Scope:** `cubecloud-desktop/docs/COMMIT-1-2-APPLIED.md`, `cubecloud-desktop/docs/COMMIT-3-9-APPLIED.md`, `cubecloud-desktop/docs/V2-COMMIT-PLAN.md`, `cubecloud-desktop/docs/CODEGRAPH_WORKSPACE_MIGRATION.md`, `cubecloud-desktop/docs/superpowers/plans/2026-04-30-windows-winget-fedora-rpm-release.md`, `cubecloud-desktop/docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`, plus the now-stale references in `docs/HANDBOOK.md`, `docs/handbook/README.md`, and `cubecloud-desktop/changelogs/0.6.0.md`. The newly-created directory is `cubecloud-desktop/docs/superpowers/archive/`.

**What changed (V2.10.36):**

1. **Deleted 4 inner-only legacy docs that had zero code, test, workflow, ignore, or link references in the live repo:**
   - `cubecloud-desktop/docs/COMMIT-1-2-APPLIED.md` (7,325 bytes) - pre-V2.10 V2 commits 1-2 narrative.
   - `cubecloud-desktop/docs/COMMIT-3-9-APPLIED.md` (16,293 bytes) - pre-V2.10 V2 commits 3-9 narrative.
   - `cubecloud-desktop/docs/V2-COMMIT-PLAN.md` (16,441 bytes) - pre-V2.10 commit plan.
   - `cubecloud-desktop/docs/CODEGRAPH_WORKSPACE_MIGRATION.md` (2,105 bytes) - superseded by the longer-form `cubecloud-desktop/docs/CODEGRAPH-RUNTIME.md` and by the V2.3-V2.4-V2.5 transition history in `BRANDING_AND_LICENSE.md`.

2. **Archived 2 pre-V2.10 release-design files** (rather than deleting) because the `BRANDING_AND_LICENSE.md` V2.6 transition history still references them by name and the user explicitly asked for a "review and commit this PR" closeout rather than a hard delete. Both moved into the new `cubecloud-desktop/docs/superpowers/archive/` subdir so the BRANDING pointers still resolve to a real file:
   - `cubecloud-desktop/docs/superpowers/plans/2026-04-30-windows-winget-fedora-rpm-release.md` (39,227 bytes) - V2.6 release plan.
   - `cubecloud-desktop/docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md` (15,682 bytes) - V2.6 release design.
   - The two now-empty `plans/` and `specs/` subdirs were also removed.

3. **Repointed the now-stale references** in the live docs:
   - `docs/HANDBOOK.md` (hardlink to `cubecloud-desktop/docs/HANDBOOK.md`): dropped the 3 deleted-file rows from the "Where to look next" table, re-pointed the 3 superpowers/specs references to `docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md`, and updated the line-250 release-process blurb to mark the spec as archived.
   - `docs/handbook/README.md` (hardlink to `cubecloud-desktop/docs/handbook/README.md`): same edits, plus an "Attribution note" update that points the design-spec convention at the new `archive/` subdir.
   - `cubecloud-desktop/changelogs/0.6.0.md` (line 349): the lone `Full plan in [docs/V2-COMMIT-PLAN.md]` reference is rewritten to note the file was retired in V2.10.36 with a forward pointer to `BRANDING_AND_LICENSE.md` §"V2.10.36".

**Why this is the right V2.10.36 step:**

A pre-retirement audit (Python word-boundary scan over 804 source / doc / config files) confirmed that **none of the 6 candidate files were referenced by a real Markdown link, by code, by a test, by a release workflow, or by a .gitignore pattern**. All 80+ hits were bare-filename mentions in "Where to look next" lists in the master HANDBOOK and the inner handbook README. Deleting or archiving the 6 files therefore cannot break a build, a test, a release pipeline, or a code reference. The remaining cost is the **reader-confusion tax**: a future contributor landing on `cubecloud-desktop/docs/` would otherwise see 6 docs that match nothing in the outer monorepo and have to investigate them by hand. Removing them (or archiving them in a self-describing subdir) closes that loop.

**Out of scope (what remains after V2.10.36):**

- The `cubecloud-desktop/docs/` tree still contains the binary-runtime docs (`CODEGRAPH-RUNTIME.md`, `EVEROS-SIDECAR.md`, `RUNTIME_ORCHESTRATION_PLAN.md`, `SSH-TUNNEL-VPS.md`) which the outer README marketplace section and the binary `cubecloud-desktop/README.md` actively link to. Those stay.
- The 3 changelog files (`0.4.5.md`, `0.5.0.md`, `0.6.0.md`) are legitimate per-version release notes and stay.
- The 22 `.agents/skills/**/SKILL.md` files and the `.claude/skills/hermes-agent/SKILL.md` mirror are local runtime assets and stay.
- The `cubecloud-desktop/changelogs/0.6.0.md` line 349 rewrite preserves the historical fact that the V2 commit plan existed; it just no longer links to a file that no longer exists. The original commit plan is recoverable from the `BRANDING_AND_LICENSE.md` V2.3-V2.4-V2.5 transition history.
