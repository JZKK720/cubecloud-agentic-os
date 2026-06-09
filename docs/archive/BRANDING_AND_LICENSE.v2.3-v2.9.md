# BRANDING_AND_LICENSE early V2 archive

> Archived from `BRANDING_AND_LICENSE.md` during V2.10.30 to keep the active provenance file focused on the current V2.10+ transition stream.
> The section headings are preserved in the main file as short stubs so existing references still resolve.

## V2.3 transitions landed

The V2.3 (Steps 1é—?) rollout shipped alongside the following
branding and license hygiene work:

- **`LICENSE` attribution fixed.** The prior `Copyright (c) 2026
  github.com/fathah` line was incorrect é—?`fathah` is a personal
  handle that was never the upstream rightsholder. The file now
  attributes to "The hermes-desktop authors and contributors" with
  a clear Portions-clause that names the Cubecloud-original
  contributions and points at this document for the per-path
  breakdown. The MIT terms below the copyright line are unchanged.
- **`package.json` metadata filled in.** `license: "MIT"`,
  `repository.url`, `homepage`, and `bugs.url` all point at the
  Cubecloud org. `author` is `"Cubecloud"`. Previously these
  fields were absent, which made `npm publish`-style tooling
  infer a non-Cubecloud origin.
- **Legacy brand assets removed.** `src/renderer/src/assets/`
  previously held inherited `hermes.png`, `hermesbg.webp`,
  `splash.png`, `splashtext.png`, and `splashtext-w.webp` é—?
  none were referenced by any source file, and the Cubecloud
  replacements (`cubecloud-mark.svg`, `cubecloud-wordmark.svg`,
  `cubecloud-splash-bg.svg`) are already in place. The
  rebrand plan's Phase 1 "Remove superseded legacy brand
  assets" item is now closed for the renderer side; the
  `build/icon.*` binary icons are still pending (they need
  Cubecloud-owned source art before a regenerable drop is
  possible).
- **Cubecloud-original file headers added.** The four files
  shipped by the V2.3 rollout (`src/main/codegraph-runtime.ts`,
  `src/main/everos-sidecar.ts`, and their two test files) plus
  the three new CDP scripts (`verify-step3-4-ipc.js`,
  `verify-everything.js`, `smoke-all.js`,
  `capture-codegraph-everos.js`) and the two new architecture
  docs (`docs/CODEGRAPH-RUNTIME.md`, `docs/EVEROS-SIDECAR.md`)
  carry a "Cubecloud-original work (2026)" header that
  acknowledges the inherited MIT license and points at this
  document. Future Cubecloud-original contributions should
  follow the same convention.

## New Cubecloud-original assets in this pass

- `build/branding/cubecloud-logo.svg`
- `build/branding/cubecloud-mark.svg`
- `src/renderer/src/assets/cubecloud-splash-bg.svg`
- `src/renderer/src/assets/cubecloud-wordmark.svg`

## Legal checklist

- Keep MIT as the governing license for inherited code until counsel and provenance review approve any change.
- Preserve upstream attribution anywhere substantial inherited code remains.
- Replace placeholder Cubecloud GitHub URLs once the final org and repo names are confirmed.
- Regenerate screenshots and binary icons from Cubecloud-owned source assets before public release.

## Target licensing posture

- Cubecloud Agent Desktop is built on the `hermes-desktop`
  framework, which is hard-MIT. The Cubecloud-original work
  on top of that framework é—?the renderer rebuilds, the state
  layer, the V2.3 modules, the SQLite schema, the
  provider-discovery logic, the hidden skills harness, the
  smoke / capture scripts, and the architecture docs é—?is
  **dual-licensed** under your choice of AGPL-3.0-or-later,
  Apache-2.0, or MIT (see `LICENSE`). The AGPL-3.0-or-later
  option is primary; Apache-2.0 and MIT are offered as
  compatibility options for downstream consumers whose house
  license is one of those.
- The inherited `hermes-desktop` framework code cannot be
  retroactively made non-MIT. It stays MIT under the upstream
  terms. The dual-license above applies to Cubecloud-original
  work only.
- Cubecloud-owned logos, screenshots, brand assets, design
  systems, premium workflows, skills packs, harnesses,
  managed MCP integrations, hosted model routing, and
  maintenance services are protected under Cubecloud
  copyright, trademark policy, commercial terms, and paid
  service agreements. The dual-license does **not** grant
  any rights to those surfaces.
- "Free to use" can apply to the local shell and basic
  self-hosted flows under any of the three offered
  licenses. Hosted add-ons and managed integrations can
  carry subscription or service fees under
  `docs/legal/PAID_SERVICES_TERMS.md` and
  `docs/legal/COMMERCIAL_LICENSE.md`.
- The enforceable restriction is not "no forks" of inherited
  MIT code. The enforceable restriction is no unauthorized
  use of Cubecloud trademarks, proprietary assets, premium
  modules, hosted endpoints, or paid service layers.
- Future packaging should split these boundaries clearly:
  inherited open-source core, Cubecloud-original
  dual-licensed work, and separately licensed hosted or
  managed service layers.

## Working documents

## V2.6 transitions landed é—?skills ecosystem import

The V2.5 pass settled the dual-license posture for
Cubecloud-original code but left the **skills layer**
(the agent-runtime's `.agents/skills/`) unaddressed. The
desktop ships a hidden skills harness (`src/main/skills-harness.ts`)
that resolves the skills layer at runtime, and that layer
was, until V2.6, populated only by the V2.3 imports
(design skills inherited from the upstream framework).
V2.6 imports **20 first-class skills** adapted from **6
third-party MIT-licensed repos**, plus a functioning
Python reference harness for one of them. The full diff is
documented below.

The V2.6 import is consistent with the V2.4 brand posture
and the V2.5 dual-license posture, and **does not change
the trust boundary, the security surface, the threat
model, the DCO requirement, or the EULA scope** of the
desktop. Skills are read-only markdown documents consumed
by the agent runtime; they are not bundled product code,
not linked into the Electron app, and not shipped through
any installer path.

### What changed in V2.6

- **20 skills added to `.agents/skills/`.** Six source
  repos, all MIT, all with `metadata.source` in every
  skill's frontmatter so the per-skill provenance is
  self-describing. The 20 skills are:
  - `ar-autoresearch` (1, from `autoresearch`)
  - `karpathy-guidelines` (1, from `andrej-karpathy-skills`)
  - `po-caveman`, `po-diagnose`, `po-tdd`,
    `po-write-a-skill`, `po-grill-with-docs`,
    `po-improve-codebase-architecture`, `po-to-prd`
    (7, from `poskills`)
  - `ecc-skill-development-guide`, `ecc-skill-scout`,
    `ecc-coding-standards` (3, from `ECC`)
  - `gbrain-skillify`, `gbrain-eiirp` (2, from `gbrain`)
  - `gstack-plan-ceo-review`, `gstack-plan-eng-review`,
    `gstack-plan-design-review`, `gstack-retro`,
    `gstack-investigate`, `gstack-qa` (6, from `gstack`)
- **One functioning Python reference harness shipped.**
  `ar-autoresearch/harness/{prepare.py, train.py,
  pyproject.toml, README.md}` preserves Karpathy's
  upstream code with the data download, BPE tokenizer,
  GPT model, MuonAdamW, training loop, eval, and summary
  print all intact. The harness is **not loaded by the
  desktop** and **not required for any desktop feature
  to work**; it exists so the `ar-autoresearch` skill has
  a working reference for the agent to experiment with
  on a developer machine. The README at the top of the
  harness directory makes this explicit. Per-file
  `SPDX-License-Identifier: MIT` and
  `SPDX-Origin: https://github.com/JZKK720/autoresearch`
  headers are present in `prepare.py` and `train.py`
  so downstream consumers can re-derive the chain.
- **`.agents/skills/README.md` added as the top-level
  skills index.** Maps every skill to its source repo,
  scope, trigger phrases, and the decision tree for
  "which skill do I load?". The index is the human-
  readable entry point; the per-skill `SKILL.md`
  frontmatter is the machine-readable one.
- **6 new `licenses/<repo>-MIT.txt` files vendored.**
  `autoresearch-MIT.txt`, `poskills-MIT.txt`,
  `andrej-karpathy-skills-MIT.txt`, `ECC-MIT.txt`,
  `gbrain-MIT.txt`, `gstack-MIT.txt`. Each carries a
  one-line header comment with the source URL and
  retrieval date, matching the style of the existing
  `Odysseus-MIT.txt`, `opencode-MIT.txt`,
  `llmfit-MIT.txt`, and `DeepResearch-Apache-2.0.txt`.
- **`NOTICE` é—?Adapted dependencies" rewritten.** The
  prior "no third-party code outside the inherited
  hermes-desktop tree has been adapted" disclaimer is
  removed and replaced with the V2.6 truth: a 6-row
  "Skills ecosystem" table (the 6 adapted source
  repos), a 4-row "Bundled functioning reference code"
  table (the autoresearch harness files), and the
  4-row "Reference-only" table (preserved from V2.4).
  The REUSE catalog is now consistent with the source
  tree.
- **`ACKNOWLEDGMENTS.md` é—?Skills adapted from
  third-party repos" added.** The human-readable
  thank-you section, modeled on the existing
  "Projects studied as design reference" section,
  gives each of the 6 source repos a paragraph with
  the project URL, license, scope of the adaptation,
  and a note on the per-skill `metadata.source`
  provenance pointer. It also names the autoresearch
  harness as the special case where upstream code is
  preserved, and it is explicit that no other
  upstream code is shipped.
- **Skills mirrored to `~/.agents/skills/`.** The
  20-skill ecosystem is mirrored from the repo-local
  `.agents/skills/` directory to the **user-global**
  `~/.agents/skills/` directory on developer machines
  so the skills auto-activate in every Copilot
  workspace on the same machine, not just the
  `cubecloud-agentic-os` workspace. The mirror is
  plain-file `Copy-Item -Recurse` (or `cp -r` on
  macOS / Linux). The repo-local copies are the
  source of truth; the global mirror is regenerated
  whenever a new skill lands or an existing one is
  updated. The mirror does **not** extend the brand
  posture (the skills are not branded Cubecloud
  assets; they are markdown documents whose
  `metadata.source` points at the upstream repo).
- **`apps/desktop-shell/package.json` `skills-lock.json`
  cross-check.** The existing `skills-lock.json` in
  the desktop root enumerates the design skills that
  ship with the V2.3 design-system pass. The V2.6
  skills are **not** added to `skills-lock.json`
  because `skills-lock.json` is the design-system
  lock, not the agent-runtime skills lock; mixing the
  two would conflate the V2.3 design-skill surface
  with the V2.6 workflow-skill surface. The
  separation is intentional.

### What did NOT change in V2.6

- **The trust boundary is unchanged.** The local user
  remains the trust boundary; the agent runtime
  resolves skills from disk before any IPC happens.
  The skills are read-only markdown; a malicious skill
  can at most misdirect the agent's prose, which is the
  same trust level as any prompt the user pastes into
  the chat. `THREAT_MODEL.md` is unchanged.
- **The DCO sign-off requirement is unchanged.** The
  V2.6 skills import is a normal commit (a single
  branch with 20 new SKILL.md files, 1 new harness
  directory, 6 new license text files, 1 new
  `.agents/skills/README.md`, and edits to
  `NOTICE` / `BRANDING_AND_LICENSE.md` /
  `ACKNOWLEDGMENTS.md`); the existing DCO 1.1
  sign-off applies to the commit author and any
  reviewers.
- **The EULA scope is unchanged.** `docs/legal/CUBECLOUD-EULA.md`
  governs the **desktop binary distribution**; it
  does not extend to the development-time skills
  layer. Skills are developer ergonomics for the
  people who build the desktop, not a shipped
  product surface.
- **The dual-license posture for Cubecloud-original
  work is unchanged.** AGPL-3.0-or-later (primary) +
  Apache-2.0 + MIT (compatibility options) still
  applies. The 20 skills are Cubecloud-original
  prose derived from upstream MIT-licensed skills,
  and inherit the same dual-license posture as the
  rest of the Cubecloud-original work. The upstream
  MIT in each per-skill `metadata.source` is the
  provenance pointer; the Cubecloud dual-license
  is the binding license for the resulting
  Cubecloud-original skill.
- **The skills-layer naming convention is unchanged.**
  The `ar-` / `po-` / `karpathy-` / `ecc-` /
  `gbrain-` / `gstack-` prefixes are provenance
  markers that name the upstream source repo, not
  Cubecloud brand claims. `TRADEMARK_POLICY.md` is
  unchanged.
- **No CLA repository was created.** DCO is the
  chosen inbound-contribution model; the V2.6
  skills import does not change that. The skills
  are upstream-MIT-derived Cubecloud-original
  prose, dual-licensed as above, and the existing
  DCO flow covers them.

### Why this is a text-only adaptation, not a code merge

For 19 of the 20 skills, the SKILL.md body is
**Cubecloud-original prose** that summarises, restructures,
and cross-references the upstream skill's content. We did
**not** copy the upstream SKILL.md verbatim, and we did
**not** translate mechanically. Each skill was written
with the workspace's existing skills (`po-`, `gbrain-`,
`gstack-`) in mind, and many of the skills cross-reference
each other (e.g. `karpathy-guidelines` cross-references
`po-tdd` and `gstack-qa`). The 20 skills are intentionally
coherent as a system, not 20 independent imports.

The one exception is the `ar-autoresearch` Python harness.
That harness is the one place in the desktop repo where
upstream *code* is shipped, and it is shipped *as a
reference* é—?it is the original Karpathy harness preserved
with no Cubecloud-original modifications, so a developer
who wants to run the autoresearch loop on their own
machine can `cd ar-autoresearch/harness && uv run train.py`
and get the same behaviour they would get from
`git clone https://github.com/JZKK720/autoresearch && cd
autoresearch && uv run train.py`. The harness is preserved
intentionally; we did not want to fork it, rename
functions, or "Cubecloud-ify" it. The README at the top of
the harness directory makes the reference-only intent
explicit.

### Updated "Working documents" (post-V2.6)

- Clean-room replacement roadmap: `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`
- Branded-distribution terms: `docs/legal/CUBECLOUD-EULA.md`
- Paid-services terms: `docs/legal/PAID_SERVICES_TERMS.md`
- Trademark and brand-use policy: `docs/legal/TRADEMARK_POLICY.md`
- Commercial-relicensing terms: `docs/legal/COMMERCIAL_LICENSE.md`
- Provenance tracker: `docs/legal/PROVENANCE_TRACKER.md`
- **Skills ecosystem catalog**: `.agents/skills/README.md`
  (the top-level index of the 20-skill ecosystem)
- **Skills provenance memory**: `/memories/cubecloud-skills-ecosystem.md`
  (persistent memory note that records the 6 source repos,
  the 20 skill names, the autoresearch / codegraph
  conflict-check findings, and the dedup principles for
  future skill additions)

These documents define the Cubecloud boundary. As of V2.7, the
top-level LICENSE is a dual-license notice é—?AGPL-3.0-or-later
(primary) with Apache-2.0 and MIT as compatibility options for
Cubecloud-original work, and hard-MIT for the inherited
`hermes-desktop` framework code. The legal docs above govern
the **non-code** surfaces (brand, hosted tiers, paid features,
commercial relicensing). The full V2.7 diff is in the
"V2.7 transitions landed" section above. The V2.6 diff
preceded it; the V2.5 / V2.4 history remains in place below.

## V2.7 transitions landed é—?superpowers process methodology

The V2.6 import added the 20-skill developer-time ecosystem
(prose + 1 functioning Python harness) under `.agents/skills/`.
V2.7 extends the ecosystem by **14 hidden-flavor process skills**
adapted from the [superpowers](https://github.com/JZKK720/superpowers)
repo (Jesse Vincent, MIT), and prepares the ground for the V2.8
**description-trim audit** of the 20 V2.6 skills. The full diff
is documented below; the LICENSE file is unchanged because
V2.7 is a content-and-process change, not a license change.

The V2.7 import is consistent with the V2.4 brand posture, the
V2.5 dual-license posture, and the V2.6 skills-ecosystem import.
**It does not change the trust boundary, the security surface,
the threat model, the DCO requirement, the EULA scope, or the
license of any existing file.**

### What changed in V2.7

- **14 new `sp-` skills added to `.agents/skills/`.** One
  source repo (superpowers, MIT), 14 Cubecloud-original
  skills. The full list:
  - `sp-skill-first` (from `using-superpowers`) é—?the
    bootstrap: before any response, check for skills.
  - `sp-tdd` (from `test-driven-development`) é—?
    RED-GREEN-REFACTOR with anti-patterns.
  - `sp-debug` (from `systematic-debugging`) é—?4-phase
    root-cause process. Heavier than `po-diagnose`.
  - `sp-verify` (from `verification-before-completion`) é—?
    evidence over claims. The 5 verification questions.
  - `sp-brainstorm` (from `brainstorming`) é—?Socratic
    design refinement. Activates before any implementation.
  - `sp-plan` (from `writing-plans`) é—?bite-sized tasks
    (2é—? min) with exact file paths, complete code,
    verification steps.
  - `sp-execute` (from `executing-plans`) é—?run the plan
    task-by-task with 2-stage review.
  - `sp-subagents` (from `subagent-driven-development`) é—?
    parallel subagent dispatch with 2-stage review.
  - `sp-parallel` (from `dispatching-parallel-agents`) é—?
    one-off parallel queries for research.
  - `sp-request-review` (from `requesting-code-review`) é—?
    pre-review checklist; severity-ordered findings.
  - `sp-receive-review` (from `receiving-code-review`) é—?
    triage, fix, defend, push back.
  - `sp-worktree` (from `using-git-worktrees`) é—?isolated
    worktree, clean baseline, implement, verify.
  - `sp-finish-branch` (from
    `finishing-a-development-branch`) é—?verify, present
    4 options, clean up.
  - `sp-write-skill` (from `writing-skills`) é—?
    TDD-for-skills: red phase, green phase, refactor. The
    Description Trap and CSO contract.

  All 14 are **hidden flavors** (the kind that auto-inject
  into the chat system prompt), not user-visible pre-installed
  skills. The 20 V2.6 skills stay where they are. The 14 V2.7
  skills live in the same developer-time `.agents/skills/`
  directory, mirrored to `~/.agents/skills/`.

- **1 new `licenses/<repo>-MIT.txt` file vendored.**
  `licenses/superpowers-MIT.txt` é—?the upstream MIT text
  with a one-line comment at the top noting the source URL
  and retrieval date, matching the style of the existing
  `Odysseus-MIT.txt`, `autoresearch-MIT.txt`, etc.

- **`.agents/skills/README.md` updated to a 34-skill
  index.** Adds the `sp-` row to the provenance table,
  adds the 14-skill Superpowers section, expands the
  decision tree with the new lifecycle skills
  (`sp-brainstorm` é—?`sp-plan` é—?`sp-execute` /
  `sp-subagents` é—?`sp-finish-branch`), and updates the
  "How to add a new skill" workflow to recommend
  `sp-write-a-skill` (TDD-for-skills) as the heavier
  authoring path and `po-write-a-skill` as the lighter
  path.

- **`NOTICE` é—?Adapted dependencies" é—?Skills ecosystem"
  extended.** Adds the 14 `sp-` skills as a new row in
  the existing table. The 20 V2.6 skill rows are unchanged.
  The line "The 20 skills above are the complete skills
  layer as of V2.6" is updated to "The 34 skills above
  are the complete skills layer as of V2.7".

- **`ACKNOWLEDGMENTS.md` é—?Skills adapted from third-party
  repos (V2.6 import)" extended.** Adds a 7th bullet for
  superpowers. The existing 6 bullets (autoresearch,
  poskills, karpathy, ECC, gbrain, gstack) are unchanged.

- **14 new `metadata.source` provenance pointers.** Each
  `sp-*/SKILL.md` carries the `metadata.source:
  https://github.com/JZKK720/superpowers` pointer plus a
  `metadata.source_skill: <upstream-name>` for per-skill
  provenance.

### What did NOT change in V2.7

- **No new user-visible skills.** All 14 `sp-` skills are
  hidden flavors. The 5 user-visible skills in
  `skills-lock.json` are unchanged. The 3 new
  Cubecloud-original user-visible skills proposed for V2.8
  (`cubecloud-persona`, `cubecloud-onboarding`,
  `cubegraph-code-intel`) are not in this pass.
- **No new memory seeds.** The superpowers methodology
  implies "always use TDD", "always write a plan first",
  but superpowers' own philosophy is that the methodology
  is enforced by the **session-start hook**, not by agent
  memory. The V2.7 import respects that.
- **No new toolsets.** The existing 9 `DEFAULT_TOOLS` in
  `apps/desktop-shell/src/main/agentControlPlane.ts` are
  sufficient for the `sp-` skills.
- **No new harnesses, no new schedules, no new kanban
  starter board.** All proposed for V2.8.
- **No license change.** The `sp-` skills are
  Cubecloud-original prose, dual-licensed as the rest of
  Cubecloud-original work. The upstream MIT pointer is
  the provenance; the Cubecloud dual-license is the
  binding license.
- **No DCO change.** DCO 1.1 covers the commit.
- **No EULA / trust-boundary / security change.** Hidden
  skills are read-only markdown; the existing threat
  model (local user is the trust boundary) is unchanged.

### The V2.8 description-trim audit (DONE é—?see é—?V2.8 transitions landed" above)

The `sp-write-skill` skill surfaces a contract change that the
V2.6 import did not implement: **the description field must be
trigger-only.** If the description contains a process summary,
the agent follows the description (which is a summary) and
skips the body. This is the *Description Trap* documented in
`sp-write-skill` é—?The Description Trap".

Of the 20 V2.6 skills, **19 had this defect** (their
`description` field contained both a *what* and a *when*; the
*what* should move to the body's first sentence). The V2.8
audit (the next pass below):

1. Trimmed the 20 V2.6 descriptions to trigger-only. **Done.**
2. Audited the 14 V2.7 `sp-` skills for the same defect; found
   14 (the `name:` field was `cubecloud-*` instead of `sp-*`,
   per upstream's v3.1.0 contract). **Done.**
3. Added a `tests/red-baseline.md` per `sp-` skill (TDD-for-skills
   discipline). **Done.**
4. Verified all 34 skills pass both contracts: `name:` matches
   the directory, and `description:` is trigger-only. **Done.**

V2.8 was a *correctness* change, not a stylistic one. The V2.6
skills now auto-activate on the canonical trigger phrases
without the agent following a stale process summary. The full
V2.8 diff is in the é—?V2.8 transitions landed" section above.

### Why a separate pass instead of one big one

The V2.7 import and the V2.8 description audit are *different
kinds* of work:

- V2.7 is **additive** (14 new files, 4 doc updates,
  1 license text).
- V2.8 is **modificative** (19 existing skills have their
  descriptions trimmed; their bodies stay; the *behaviour*
  of the skill changes because the description is what the
  agent reads first).

Splitting them is the right move per Karpathy's "surgical
changes" principle. The V2.7 diff is reviewable in one pass;
the V2.8 diff would obscure the V2.7 work if bundled.

### Updated "Working documents" (post-V2.7)

- Clean-room replacement roadmap: `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`
- Branded-distribution terms: `docs/legal/CUBECLOUD-EULA.md`
- Paid-services terms: `docs/legal/PAID_SERVICES_TERMS.md`
- Trademark and brand-use policy: `docs/legal/TRADEMARK_POLICY.md`
- Commercial-relicensing terms: `docs/legal/COMMERCIAL_LICENSE.md`
- Provenance tracker: `docs/legal/PROVENANCE_TRACKER.md`
- **Skills ecosystem catalog**: `.agents/skills/README.md`
  (the top-level index of the 34-skill ecosystem)
- **Skills provenance memory**: `/memories/cubecloud-skills-ecosystem.md`
  (persistent memory note that records the 7 source repos,
  the 34 skill names, the autoresearch / codegraph
  conflict-check findings, and the dedup principles for
  future skill additions)

These documents define the Cubecloud boundary. As of V2.7, the
top-level LICENSE is a dual-license notice é—?AGPL-3.0-or-later
(primary) with Apache-2.0 and MIT as compatibility options for
Cubecloud-original work, and hard-MIT for the inherited
`hermes-desktop` framework code. The legal docs above govern
the **non-code** surfaces (brand, hosted tiers, paid features,
commercial relicensing). The full V2.7 diff is in the
"V2.7 transitions landed" section above.

## V2.4 transitions landed é—?license + brand tightening

The desktop is a Cubecloud-branded successor of `hermes-desktop`
(Nous Research / Hermes Agent lineage). The V2.3 rollout studied
a few adjacent open-source projects during design é—?most
notably [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus)
é—?and **borrowed their rebrand and licensing posture as a model**
(trademark policy, security policy, threat model, DCO
contribution terms). It did **not** merge code from those
projects. With that scope clarified, the license + brand
posture was tightened across this repo. The full diff is
documented here; the prior `docs/legal/TRADEMARK_POLICY.md`
"draft" was promoted to an active policy in the same pass.

### What changed

- **`LICENSE` copyright line is now `Copyright (c) 2026 Cubecloud
  Contributors`.** This mirrors the
  `Copyright (c) 2025 Odysseus Contributors` form that we
  saw on the Odysseus project é—?a contributors collective,
  not a personal name or a single org. The MIT license is
  preserved; the new top-of-file preamble explicitly carves
  out Cubecloud trademarks and separately-licensed service
  tiers (see `TRADEMARK_POLICY.md` and `CUBECLOUD-EULA.md`).
- **`NOTICE` added at the repo root.** REUSE-compliant
  attribution catalog. The catalog distinguishes
  (a) Cubecloud-original work, (b) MIT-inherited work
  (the `hermes-desktop` tree), (c) reference-only projects
  that we studied but did **not** adapt, (d) runtime npm
  deps with licenses, (e) fonts. The "bundled services"
  and "optional AGPL" sections are present but explicitly
  empty because the desktop has no `docker-compose.yml` and
  no AGPL-licensed feature in this revision.
- **`licenses/` directory added** with reference copies of
  the reference-only projects' license texts:
  `Odysseus-MIT.txt`, `opencode-MIT.txt`, `llmfit-MIT.txt`,
  `DeepResearch-Apache-2.0.txt`. These are kept as a hedge:
  if any of those projects' code is later pulled in through
  a clean-room rewrite, the license text is already in the
  tree. They do **not** imply that code from these projects
  is currently in this repository.
- **`docs/legal/TRADEMARK_POLICY.md` promoted from draft to
  active.** Now names the Cubecloud marks (company name,
  logotype, wordmark, mark SVG files in `build/branding/` and
  `src/renderer/src/assets/`, splash assets, app icon set),
  enumerates allowed nominative uses, prohibits confusingly
  similar names, and provides a fork / build / distribution
  rule set with a `FORK-NOTICE.md` template. Also explicitly
  carves out upstream project trademarks (Hermes, Odysseus,
  opencode, EverOS) and points readers to upstream brand
  policies.
- **`SECURITY.md` and `THREAT_MODEL.md` added.** `SECURITY.md`
  follows the Odysseus structure: supported versions table,
  deployment guidance, "publishing a fork" checklist, threat
  model summary, private reporting channels. `THREAT_MODEL.md`
  is a working draft that names the trust boundary (the local
  user), the assets we protect, the adversaries we defend
  against, the adversaries we deliberately don't, and the
  sidecar-specific boundary (CodeGraph + EverOS).
- **`CONTRIBUTING.md` updated with a DCO sign-off requirement.**
  Inbound contributions now require a `Signed-off-by:` line in
  the commit message (DCO 1.1, per-developercertificate.org).
  DCO is the same model used by the Linux kernel, Docker, and
  Kubernetes. We chose DCO over a full CLA because it is
  per-commit (no CLA bot), zero-friction (no PDF sign-back), and
  legally equivalent for our case.
- **`package.json` metadata points at the placeholder
  `cubecloud-contributors/cubecloud-agentic-os` org.** When the
  real org name is confirmed, the four `homepage` / `repository`
  / `bugs` / `funding` lines are the only places that need a
  global find-and-replace. `author` is now
  `"Cubecloud Contributors"` (was `"Cubecloud"`).
- **`apps/desktop-shell/package.json` got the same treatment.**
  This is the package the workspaces root actually points at;
  leaving its `author` blank would mean the worktree's primary
  package.json still had an unbranded author.

### What did NOT change

- **The MIT license itself is unchanged.** Inherited code
  remains MIT. We cannot retroactively restrict inherited code,
  and we have no plan to try. The license preamble now makes this
  explicit and points readers at the brand, EULA, and paid-
  services docs for the non-MIT surfaces.
- **The clean-room replacement plan is unchanged.** Phase 1
  (replace public-facing identity surfaces) and Phase 2+
  (replace renderer / main / preload / scripts / tests / release
  automation) are still tracked in
  `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`. The V2.4 license +
  brand work is part of Phase 1, not a substitute for the
  larger rewrite.
- **No CLA repository was created.** DCO is the chosen
  inbound-contribution model. If a future Cubecloud-owned
  module needs a CLA, that can be added per-module without
  affecting the rest of the codebase.

### What the tightened brand posture does for downstream

A fork that:

- keeps the Cubecloud marks
- presents itself as a Cubecloud release
- redistributes Cubecloud-branded screenshots

is a **Cubecloud distribution** under our legal view and must
follow the security, threat-model, and operational rules above.
A fork that **rebrands** (different name, different marks, a
`FORK-NOTICE.md` at the root) is a clean derivative and can be
operated on its own terms, with the inherited MIT terms still
governing the source code.

The MIT clause "permissive" remains; what the new docs do is
make the **non-code** surfaces (brand, paid tiers, hosted
services) enforceable, which is the part the prior rebrand
plan had as a "working draft" with a "counsel review" note.
The V2.4 pass promotes those drafts to active policy.

## V2.5 transitions landed é—?switching to a dual-license posture

The V2.4 pass made the brand and non-code surfaces enforceable
but stopped short of changing the code license itself. V2.5
revisits that decision. The original analysis treated the entire
repository as inherited-MIT and didn't distinguish what was
genuinely inherited (`hermes-desktop` framework code) from
what the Cubecloud Contributors had **rebuilt or rewritten**
(`apps/desktop-shell`, the Cubecloud state layer, the V2.3
modules, the renderer rebuilds, the SQLite schema, the
provider-discovery logic, and the rest of the new code).

That distinction matters. The inherited `hermes-desktop`
framework code is, and remains, hard-MIT é—?we cannot
retroactively restrict it, and we have no plan to try. But the
Cubecloud-original rebuilds and rewrites are exactly that:
Cubecloud-original. They were not in `hermes-desktop` and they
are not in any other upstream tree. They are the IP of the
Cubecloud Contributors, and a permissive MIT-only license for
that work would be the wrong fit for code that has commercial
and governance surfaces (the cubecloud-agentic-os stack,
Cubecloud-hosted model routing, paid tiers, etc.).

The V2.5 pass re-licenses the Cubecloud-original work under a
**dual license**: AGPL-3.0-or-later as primary, with Apache-2.0
and MIT as compatibility options. The hermes-desktop framework
code stays MIT under the upstream terms, and the V2.4 brand /
trademark / DCO / security work is unchanged. The full diff is
documented below; the LICENSE file is the binding source of
truth.

### What changed in V2.5

- **`LICENSE` rewritten as a dual-license notice.** The
  single-paragraph MIT body is replaced with a 4-section
  preamble that:
  1. Names **Cubecloud-original work** as dual-licensed under
     your choice of AGPL-3.0-or-later, Apache-2.0, or MIT.
  2. Names the inherited `hermes-desktop` framework code as
     hard-MIT (we cannot retroactively restrict it).
  3. Carves out trademarks, hosted tiers, paid features, and
     third-party deps as out-of-scope for the code license.
  4. Gives downstream users a 3-bullet "how to choose" guide
     (private use, hosted use, fork / plugin use).
- **`licenses/AGPL-3.0.txt` vendored.** The full AGPL-3.0
  text (Free Software Foundation, 19 November 2007) lives
  at `licenses/AGPL-3.0.txt` and is also available at
  <https://www.gnu.org/licenses/agpl-3.0.html>.
- **`licenses/Apache-2.0.txt` vendored.** The full Apache-2.0
  text lives at `licenses/Apache-2.0.txt` and is also
  available at <https://www.apache.org/licenses/LICENSE-2.0>.
- **`licenses/MIT.txt` vendored.** The full MIT text lives at
  `licenses/MIT.txt` and is also available at
  <https://opensource.org/licenses/MIT>. The same text is
  one of the three licenses offered; we just made it explicit
  that the standalone MIT copy is part of the triple, not
  the only license in the tree.
- **`package.json` license field updated** to
  `(AGPL-3.0-or-later OR Apache-2.0 OR MIT) WITH
  framework-MIT-exception`. The SPDX expression is also
  added under a `spdx` key for tooling that consumes
  machine-readable license metadata.
- **`apps/desktop-shell/package.json` got the same SPDX
  expression** so the worktree root and the package root
  agree.
- **`NOTICE` updated** to reflect the dual-license posture:
  the "Direct dependencies" table now lists
  `AGPL-3.0-or-later OR Apache-2.0 OR MIT` in the License
  column for every Cubecloud-original row, and a new
  "How downstream consumers pick a license" section explains
  the alternative-licenses semantic.
- **`SPDX-License-Identifier` headers added to the 9 V2.3
  Cubecloud-original files**: 3 source files
  (`codegraph-runtime.ts`, `everos-sidecar.ts`,
  `skills-harness.ts`), 4 smoke scripts
  (`verify-everything.js`, `smoke-all.js`,
  `capture-codegraph-everos.js`, `verify-step3-4-ipc.js`),
  and 2 architecture docs (`docs/CODEGRAPH-RUNTIME.md`,
  `docs/EVEROS-SIDECAR.md`). Each header reads
  `SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`
  with a short explanation that the AGPL-3.0-or-later
  alternative does **not** affect inherited framework code.
- **`docs/legal/COMMERCIAL_LICENSE.md` added.** This new
  document describes the commercial-relicensing path for
  organizations that want to run a Cubecloud-derivative
  service without the AGPL-3.0 é—?3 network-source
  obligation. It is a stub in this revision; the full
  commercial-license SKU and pricing tiers are still
  TBD by Cubecloud leadership.

### What did NOT change in V2.5

- **The hermes-desktop framework code remains hard-MIT.**
  The dual-license applies to Cubecloud-original work only.
  The framework carve-out in the LICENSE preamble makes
  this explicit, and the SPDX headers in the V2.3 files
  call it out per-file.
- **The DCO sign-off requirement is unchanged.** DCO 1.1
  is still the inbound-contribution model; nothing in the
  V2.5 license change requires or replaces it.
- **The trademark policy is unchanged.** Cubecloud marks
  are still reserved, regardless of which of the three
  offered licenses a downstream consumer picks.
- **The brand posture, the threat model, and the security
  reporting channels are unchanged.** V2.5 is a code-license
  change, not a brand or security change.

### Why AGPL-3.0 as the primary, with Apache-2.0 and MIT as compatibility options

The Cubecloud Agent Desktop is a chat client that connects to
local model servers (Ollama, vLLM, llama.cpp) and remote
providers. Most of the time, that is a private, single-user
deployment and AGPL-3.0 é—?3 does not trigger. The AGPL-3.0
clause that matters is é—?3 é—?the "remote network interaction"
requirement that modified versions running on a network
server must offer the Corresponding Source to the server's
users.

That clause is exactly the right fit for the Cubecloud-hosted
case (where Cubecloud or a Cubecloud partner runs a Cubecloud-
derivative service for end users) and exactly the wrong fit
for the private / single-user / enterprise-intranet case. The
dual-license structure lets each downstream consumer pick:

- **AGPL-3.0-or-later** for organizations that already
  open-source their stack and are happy to provide source
  to their users.
- **Apache-2.0** for organizations with an Apache-2.0
  house license and a patent-grant + patent-retaliation
  posture.
- **MIT** for small plugins, examples, and forks that
  rebrand and want the most permissive terms.

The "supporting" Apache-2.0 and MIT options are not
"free alternatives" to AGPL-3.0 é—?they are alternative
licenses that drop specific obligations (the network-source
clause for AGPL-3.0) and add different ones (the patent
retaliation clause for Apache-2.0). The choice has legal
consequences and is the consumer's to make.

### Updated "Working documents" (post-V2.5)

- Clean-room replacement roadmap: `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`
- Branded-distribution terms: `docs/legal/CUBECLOUD-EULA.md`
- Paid-services terms: `docs/legal/PAID_SERVICES_TERMS.md`
- Trademark and brand-use policy: `docs/legal/TRADEMARK_POLICY.md`
- Commercial-relicensing terms: `docs/legal/COMMERCIAL_LICENSE.md`
- Provenance tracker: `docs/legal/PROVENANCE_TRACKER.md`

## V2.8 transitions landed é—?description-trim audit (TDD-for-skills compliance)

The V2.7 import landed 14 sp- skills adapted from the upstream
superpowers repo. The sp-write-skill skill surfaced a contract
change that the V2.6 import did not implement: **the description
field must be trigger-only.** If the description contains a
process summary, the agent follows the description (which is a
summary) and skips the body. This is the *Description Trap* (see
sp-write-skill é—?The Description Trap").

V2.8 is the audit pass that fixes this. It is a *correctness*
change, not a stylistic one. The V2.6 skills are now functional
in the same way an HTML form with ction="" is functional: it
renders, but it does the wrong thing. V2.8 fixes the action.

### What changed in V2.8

- **20 V2.6 skill descriptions trimmed.** Each description
  field in the 20 r- / po- / karpathy- / ecc- /
  gbrain- / gstack- skills is now **trigger-only**:
  starts with Use whené—?(or Use at the endé—?for
  end-of-session skills), lists the canonical trigger
  phrases as a comma-separated tail, and removes the
  leading process-summary sentence. The removed content
  moved to the body's first paragraph where the
  description contract says it belongs.
- **14 V2.7 sp- skills audited and corrected.** All 14
  had the same defect (the 
ame: field was
  cubecloud-<name> instead of sp-<name>, and one
  description started with Use afteré—?instead of
  Use whené—?. Both classes of defect are fixed. The
  
ame: field is now sp-* to match the directory
  name, per upstream's v3.1.0 contract ("All skill
  frontmatter 
ame: fields now use lowercase
  kebab-case matching directory names").
- **14 	ests/red-baseline.md files added** (one per
  sp- skill). Each baseline is a pressure scenario
  (3+ combined pressures), a "what the agent does
  *without* the skill" failure transcript, a "what the
  agent does *with* the skill" success transcript, and
  pass criteria. This is the TDD-for-skills discipline
  that sp-write-skill teaches.- **V2.8 follow-up: 20 more `tests/red-baseline.md`
  files added** (one per V2.6 skill). Brings the total
  to 34/34 skills with red-baseline. The V2.6 red-
  baselines were written *after* the V2.7 superpowers
  import, so the discipline matches the `sp-write-skill`
  contract: 3+ combined pressures per scenario, no
  rationalisation section, no best-practices-only
  scenario.- **Final audit** confirms 34 / 34 skills pass both
  contracts: 
ame: matches the directory name, and
  description: starts with Use when / Use at (or
  similar trigger-only form).

### What did NOT change in V2.8

- **No new skills.** V2.8 is modificative, not additive.
- **No new files in the desktop's product surface.** The
  	ests/red-baseline.md files live in
  .agents/skills/sp-*/tests/ and are part of the
  developer-time ecosystem, not the desktop binary.
- **No license change.** V2.8 is a content-and-process
  change, not a license change. The LICENSE file is
  unchanged. The sp- skills remain
  Cubecloud-original-prose, dual-licensed; the
  description-trim and 	ests/red-baseline.md are
  under the same license.
- **No DCO / EULA / trust-boundary change.** The audit
  only changes the text the agent reads *first* when
  deciding whether to load a skill. The trust boundary,
  the security surface, the threat model, the EULA
  scope, and the DCO sign-off requirement are all
  unchanged.

### The Description Trap (the bug V2.8 fixes)

> **If the description contains a process summary, the
> agent follows the description and skips the body.**

Per sp-write-skill é—?The Description Trap" (and per upstream
superpowers v4.0.0's release notes documenting "The
Description Trap"):

- The description is what the agent reads *first* when
  deciding whether to load a skill.
- If the description is a summary of the body, the agent
  has the answer already. It does not load the body.
- The result: a skill whose body has the right procedure
  but whose description has the wrong emphasis. The
  agent follows the wrong emphasis.

V2.8 fixes this by moving the process summary out of the
description and into the body's first paragraph. The
description is now a *trigger* (when does this skill
load?); the body is the *behaviour* (what does the
skill do once loaded?). Trigger and behaviour are
separate, per the upstream contract.

### Updated "Working documents" (post-V2.8)

- Clean-room replacement roadmap: docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md
- Branded-distribution terms: docs/legal/CUBECLOUD-EULA.md
- Paid-services terms: docs/legal/PAID_SERVICES_TERMS.md
- Trademark and brand-use policy: docs/legal/TRADEMARK_POLICY.md
- Commercial-relicensing terms: docs/legal/COMMERCIAL_LICENSE.md
- Provenance tracker: docs/legal/PROVENANCE_TRACKER.md
- **Skills ecosystem catalog**: .agents/skills/README.md
  (the top-level index of the 34-skill ecosystem)
- **Skills provenance memory**: /memories/cubecloud-skills-ecosystem.md
  (persistent memory note that records the 7 source repos,
  the 34 skill names, the V2.7 superpowers import, the V2.8
  description-trim audit, the autoresearch / codegraph
  conflict-check findings, and the dedup principles for
  future skill additions)

These documents define the Cubecloud boundary. As of V2.8, the
top-level LICENSE is a dual-license notice é—?AGPL-3.0-or-later
(primary) with Apache-2.0 and MIT as compatibility options for
Cubecloud-original work, and hard-MIT for the inherited
hermes-desktop framework code. The legal docs above govern
the **non-code** surfaces (brand, hosted tiers, paid features,
commercial relicensing). The full V2.8 diff is in the
"V2.8 transitions landed" section above. The V2.7
superpowers import preceded it; the V2.6 skills ecosystem,
V2.5 dual-license, V2.4 brand tightening, and the rest of
the history remain in place below.

## V2.9 transitions landed é—?pre-launch bundle (Skills / Memory / Harness / Schedule / Kanban seeds)

The V2.6 / V2.7 / V2.8 work built the 34-skill developer-time
ecosystem. The skills are *available* to the agent runtime that
builds the desktop, but they are not *visible* to the end user
of the desktop binary. V2.9 changes that: it pre-installs a
curated subset of the skills (plus memories, harnesses,
schedules, and a kanban starter board) into the desktop's
product surface. The end user opens the Skills / Memory /
Workspace tabs and the seeds are already there.

V2.9 is *additive* in every dimension. The desktop's user
interface gains a handful of pre-installed entries; nothing
in the existing tier-1 / tier-2 / tier-3 skill model changes.
The license, the trust boundary, the security surface, the
threat model, the DCO, and the EULA scope are all unchanged.

### What changed in V2.9

- **5 new Cubecloud-original files in
  apps/desktop-shell/src/main/**:
  - defaultSkills.ts é—?3 user-visible skills
    (cubecloud-persona, cubecloud-onboarding,
    cubegraph-code-intel), all in the Skills tab.
  - defaultMemories.ts é—?6 memory seeds covering
    conventions, runtime topology, two-tier skills, license
    / brand, workspace conventions, security posture.
  - defaultHarnesses.ts é—?3 disabled EverOS harnesses
    (cubecloud-memory-distill, cubecloud-cost-watchdog,
    cubecloud-skill-audit).
  - defaultSchedules.ts é—?1 disabled schedule
    (cubecloud-daily-standup).
  - defaultKanban.ts é—?1 starter board ("Onboarding é—?    delete me") with 5 deletable example tasks.

  Each file carries a Cubecloud-original SPDX header and
  exports the DEFAULT_* constant plus an idempotent
  seedDefault* function. The seed respects user
  deletions: if the user has deleted a seed, the seed is
  not re-added.

- **5 seed wirings in gentControlPlane.ts.** A new
  
eadJsonFileWithSeed<T>(filePath, fallback, seedFn,
  writeBack) helper is added next to the existing
  
eadJsonFile<T>. The 5 readJsonFile call sites that
  load skills / memories / harnesses / schedules / kanban
  state are wrapped with 
eadJsonFileWithSeed + the
  corresponding seedDefault* function. The first read
  per surface per session runs the seed; subsequent
  reads are no-ops because the merged state is already
  on disk.

- **3 new hidden-flavor skills in
  agent-desktop/src/main/skills-harness.ts.** All
  three are pre-installed; all three are body=label-only
  (no body markdown) so the chat prompt stays small.
  - cubecloud-tone (intentTags: empty) é—?operator-tone
    flavor that auto-injects on every message.
  - cubecloud-economist (intentTags: cost, budget,
    model selection) é—?cost-aware model/tool selection.
  - cubecloud-licensor (intentTags: license,
    commercial, distribution) é—?license-aware responses.

  The 14 sp- V2.7 skills are unchanged. The 5 existing
  V2.3 hidden skills (ecc, gbrian, gstack, karpathy,
  taste-skill) are unchanged. The hidden skills registry
  is now 22 entries total.

- **1 new test file**:
  apps/desktop-shell/src/main/prelaunchSeed.test.ts.
  Pins the idempotency contract (seed is safe to run
  twice; user's deletions are respected; user-added
  items are preserved; every DEFAULT_* entry has the
  expected shape).

- **5 new entries in NOTICE é—?Direct dependencies é—?  Cubecloud-original work (2026)"**. The 5 new files in
  apps/desktop-shell/src/main/ join the existing
  V2.3 / V2.5 / V2.6 / V2.7 / V2.8 Cubecloud-original
  table, dual-licensed as the rest of Cubecloud-original
  work.

- **BRANDING_AND_LICENSE.md updated "Updated Working
  documents" list** to point at the new seed files
  alongside the existing legal docs.

### What did NOT change in V2.9

- **No new skills, no new memory entries, no new toolsets,
  no new harnesses, no new schedules, no new boards
  added at runtime.** The pre-launch bundle is the *only*
  source of the 5 default surfaces.
- **No license change.** All 5 new files are
  Cubecloud-original, dual-licensed. The pre-launch
  bundle is a *content the user can delete*; the EULA's
  hosted-service scope is unchanged.
- **No DCO / EULA / trust-boundary change.** The
  pre-launch bundle ships in the binary, not over the
  network. The user's saved state is on disk; the seed
  is idempotent.
- **The 34-skill developer-time ecosystem is unchanged.**
  V2.9 promotes a curated subset (3 skills + 6 memories
  + 3 harnesses + 1 schedule + 1 board) to the desktop's
  product surface. The other 31 stay in the
  developer-time tier.
- **The 3 user-visible skills do not duplicate the
  developer-time skills.** The 3 are new, Cubecloud-
  original, and reference the developer-time skills
  via path: ".agents/skills/<name>/SKILL.md" so the
  user can browse the body if they want.

### Opt-out

The V2.9 seed is *idempotent* and *respects deletions*,
but a user who wants *no* pre-installed content can
delete each entry from the desktop UI. The seed is
re-run on every first read per session, but only
*adds* entries that are not already present. If the
user has deleted all entries, the next session will
re-add the defaults. The Settings é—?Advanced é—?"Reset to defaults" button (V2.10) will use this
behaviour to re-seed.

A future V2.10 will add a settings toggle to disable
the seed entirely (Settings é—?Advanced é—?"Pre-launch
bundle" = on/off). The toggle is *not* in V2.9 to keep
the surface area small; the per-surface idempotency
is the soft opt-out for now.

### Updated "Working documents" (post-V2.9)

- Clean-room replacement roadmap: docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md
- Branded-distribution terms: docs/legal/CUBECLOUD-EULA.md
- Paid-services terms: docs/legal/PAID_SERVICES_TERMS.md
- Trademark and brand-use policy: docs/legal/TRADEMARK_POLICY.md
- Commercial-relicensing terms: docs/legal/COMMERCIAL_LICENSE.md
- Provenance tracker: docs/legal/PROVENANCE_TRACKER.md
- **Skills ecosystem catalog**: .agents/skills/README.md
  (the top-level index of the 34-skill ecosystem)
- **Pre-launch bundle source**:
  apps/desktop-shell/src/main/{defaultSkills,defaultMemories,defaultHarnesses,defaultSchedules,defaultKanban}.ts
  (the V2.9 pre-launch bundle seeds, dual-licensed as
  the rest of Cubecloud-original work)
- **Pre-launch bundle test**:
  apps/desktop-shell/src/main/prelaunchSeed.test.ts
  (idempotency contract tests)
- **Skills provenance memory**: /memories/cubecloud-skills-ecosystem.md
  (persistent memory note that records the 7 source repos,
  the 34 skill names, the V2.7 superpowers import, the V2.8
  description-trim audit, the V2.9 pre-launch bundle, the
  autoresearch / codegraph conflict-check findings, and the
  dedup principles for future skill additions)

These documents define the Cubecloud boundary. As of V2.9, the
top-level LICENSE is a dual-license notice é—?AGPL-3.0-or-later
(primary) with Apache-2.0 and MIT as compatibility options for
Cubecloud-original work, and hard-MIT for the inherited
hermes-desktop framework code. The legal docs above govern
the **non-code** surfaces (brand, hosted tiers, paid features,
commercial relicensing). The full V2.9 diff is in the
"V2.9 transitions landed" section above. The V2.8
description-trim audit, V2.7 superpowers import, V2.6
skills ecosystem, V2.5 dual-license, V2.4 brand tightening,
and the rest of the history remain in place below.
