# Acknowledgments

The Cubecloud Agent Desktop is built on the shoulders of many
open-source projects and the unpaid labor of many contributors.
This page credits them, in the spirit of the [Hippocratic
License](https://firstdonoharm.dev/)-style community norm of
naming the people and projects whose work made our work possible.

It is **not** a license file — license terms are in
[`LICENSE`](./LICENSE) and per-file `SPDX-License-Identifier`
headers, and a third-party attribution catalog is in
[`NOTICE`](./NOTICE). This page is the human-readable thank-you
that complements the legal catalog.

---

## Upstream frameworks and codebases

The Cubecloud Agent Desktop is a successor of and is built on
top of the **`hermes-desktop`** Electron framework (Nous
Research / Hermes Agent lineage, MIT). The framework hosts the
entire `src/main/**`, `src/preload/**`, and the bulk of the
renderer, and is the only upstream source code in this
repository. We are deeply grateful to the `hermes-desktop`
authors and contributors for the foundation.

The `apps/desktop-shell` package is a Cubecloud-original
rebuild of the renderer, agent control plane, runtime sessions,
provider discovery, and lifecycle plumbing on top of the
inherited framework. The rebuilds were done in 2026 by the
Cubecloud Contributors.

The **`@colbymchenry/codegraph`** npm SDK is the optional
TypeScript interface to the upstream CodeGraph CLI. The wrapper
in `src/main/codegraph-runtime.ts` is Cubecloud-original; the
SDK itself is `colbymchenry`'s work and is loaded via lazy
`require()` only when the package is installed.

The **`everos server start`** Python CLI is the optional
sidecar backend. The lifecycle manager in
`src/main/everos-sidecar.ts` is Cubecloud-original; the
sidecar binary itself is the upstream `everos` package and is
not bundled, shipped, or installed by the desktop.

---

## Projects studied as design reference (no code merged)

The following projects were studied during the V2.3 design
work for their rebrand and licensing posture, their
contribution models, or their security / threat-model
documentation. No code from these projects is vendored or
merged into Cubecloud. We list them here because the design
choices in the corresponding Cubecloud documents
(`docs/legal/TRADEMARK_POLICY.md`, `SECURITY.md`,
`THREAT_MODEL.md`, `CONTRIBUTING.md`) are inspired by theirs.

- **[Odysseus](https://github.com/pewdiepie-archdaemon/odysseus)**
  (MIT) — trademark policy, security policy, threat model,
  DCO contribution terms. The Odysseus Contributors'
  ACKNOWLEDGMENTS.md was the structural template for this
  file.
- **[opencode](https://github.com/anomalyco/opencode)**
  (MIT) — agent-loop and tool-execution UI patterns.
- **[llmfit](https://github.com/AlexsJones/llmfit)**
  (MIT) — hardware-detection and quant-aware fit scoring
  patterns.
- **[Tongyi DeepResearch](https://github.com/Alibaba-NLP/DeepResearch)**
  (Apache-2.0) — multi-step research synthesis patterns.

---

## Skills adapted from third-party repos (V2.6 import)

The desktop's agent runtime ships a 20-skill **skills layer** at
`.agents/skills/<name>/SKILL.md`, plus a functioning Python
harness for the `ar-autoresearch` skill. The skills layer is
adapted from six third-party repositories, all MIT-licensed at
the upstream. We are deeply grateful to the authors of each
project — the Cubecloud desktop would be measurably worse
without their work, and adapting their skills into our
ecosystem is the cheapest way to give our contributors the
same leverage they have given to their own communities.

For each source repo below, the per-skill `metadata.source`
URL in the corresponding `SKILL.md` frontmatter is the
provenance pointer; the per-source license text is vendored
under `licenses/<repo>-MIT.txt`. See `NOTICE` §"Adapted
dependencies" for the REUSE-catalog-form summary, and
`BRANDING_AND_LICENSE.md` §"V2.6 transitions landed" for
the licensing analysis.

- **[autoresearch](https://github.com/JZKK720/autoresearch)**
  (MIT) — Andrej Karpathy's autonomous ML research loop.
  Adapted as the `ar-autoresearch` skill (`1` of the 20
  skills). This is the one skill that ships a **functioning
  Python reference harness** at
  `ar-autoresearch/harness/{prepare.py, train.py,
  pyproject.toml, README.md}`. The harness is preserved from
  Karpathy's repo with the data download, BPE tokenizer, GPT
  model (rotary embeddings, value embeddings, softcap,
  ReLU² MLP), MuonAdamW optimizer, best-fit packing, training
  loop, eval, and summary print all intact. The harness is
  reference code the agent can run; it is **not** adapted into
  the desktop's bundled product surface, and the desktop
  does not depend on Python, PyTorch, or any of the harness
  deps at runtime. The skill's prose layer is Cubecloud-
  original.
- **[poskills](https://github.com/JZKK720/poskills)** (MIT) —
  Matt Pocock's engineering + productivity skill catalog.
  Adapted as **7** skills: `po-caveman`, `po-diagnose`,
  `po-tdd`, `po-write-a-skill`, `po-grill-with-docs`,
  `po-improve-codebase-architecture`, `po-to-prd`. The
  SKILL.md files are Cubecloud-original prose, derived from
  the upstream skill descriptions and bodies; no upstream
  prose is copied verbatim. The naming convention (`po-`
  prefix) and the per-skill `metadata.source` URL preserve
  the upstream provenance.
- **[andrej-karpathy-skills](https://github.com/JZKK720/andrej-karpathy-skills)**
  (MIT) — Andrej Karpathy's "four principles" of LLM coding.
  Adapted as **1** skill: `karpathy-guidelines`. The four
  principles (Think Before Coding, Simplicity First, Surgical
  Changes, Goal-Driven Execution) are the upstream's; the
  Cubecloud skill adds cross-references into the `po-` and
  `gstack-` skills so the principles are applied in the
  workspace's existing workflow rather than read in
  isolation.
- **[ECC](https://github.com/JZKK720/ECC)** (MIT) — Matt
  Pocock's "Everything Claude Code" skill catalog. Adapted
  as **3** skills: `ecc-skill-development-guide` (the
  canonical SKILL.md authoring reference), `ecc-skill-scout`
  (search-before-write), and `ecc-coding-standards`
  (universal language-agnostic coding standards). The
  `ecc-skill-development-guide` is the most-curated
  upstream of the three and informs how all 20 of our
  skills are written.
- **[gbrain](https://github.com/JZKK720/gbrain)** (MIT) —
  Adapted as **2** meta-skills: `gbrain-skillify` (the
  11-axis gate that decides whether a workflow deserves a
  skill) and `gbrain-eiirp` (the 7-phase end-of-task
  organiser). These two skills are the *meta* layer of our
  ecosystem — `gbrain-skillify` gates every new skill
  candidate, and `gbrain-eiirp` is the post-work cleanup
  protocol.
- **[gstack](https://github.com/JZKK720/gstack)** (MIT) —
  Adapted as **6** workflow skills: `gstack-plan-ceo-review`
  (8-question business lens), `gstack-plan-eng-review`
  (10-question engineering lens), `gstack-plan-design-review`
  (9-question UX lens), `gstack-retro` (post-project
  retrospective), `gstack-investigate` (6-phase investigation
  for unknown-unknowns), and `gstack-qa` (8-check pre-ship
  gate). Together with the `po-` skills, these form the
  workflow half of the ecosystem.
- **[superpowers](https://github.com/JZKK720/superpowers)**
  (MIT) — Jesse Vincent's process methodology for agentic
  software development. Adapted as **14** process skills
  (the V2.7 import): `sp-skill-first` (the bootstrap: check
  for skills before any response), `sp-tdd` (RED-GREEN-REFACTOR
  with anti-patterns), `sp-debug` (4-phase root-cause
  process), `sp-verify` (evidence over claims, the 5
  verification questions), `sp-brainstorm` (Socratic design
  refinement, 8 questions → 8 design sections → design-doc
  handoff), `sp-plan` (bite-sized tasks with exact file paths,
  complete code, verification steps), `sp-execute`
  (run-the-plan task-by-task with 2-stage review), `sp-subagents`
  (parallel subagent dispatch for independent tasks),
  `sp-parallel` (one-off parallel queries for research),
  `sp-request-review` (pre-review checklist; severity-ordered
  findings), `sp-receive-review` (triage, fix, defend, push
  back), `sp-worktree` (isolated worktree + clean baseline
  before implementation), `sp-finish-branch` (verify, present
  merge / PR / keep / discard, clean up), and `sp-write-skill`
  (TDD-for-skills: red phase failure transcript required, the
  Description Trap, the CSO contract). The `sp-` prefix is a
  Cubecloud-original disambiguator; the upstream
  `superpowers` repo uses bare skill names. All 14 are
  Cubecloud-original prose distilled from the upstream
  MIT-licensed source. The 14 join the 20 V2.6 skills
  (1 + 7 + 1 + 3 + 2 + 6) to form the 34-skill developer-time
  ecosystem. Notable cross-pollination: `sp-write-skill`
  supersedes `po-write-a-skill` for the heavier authoring
  path (TDD discipline) and `sp-tdd` supersedes `po-tdd`
  for the heavier code-discipline path. The lighter
  alternatives stay because they are easier to load and
  have less context overhead — pick the one that fits the
  task.

The 34 skills are also mirrored to the **user-global**
`~/.agents/skills/` directory on developer machines so they
auto-activate in every Copilot workspace on the same machine,
not just the `cubecloud-agentic-os` workspace. The mirror is
plain-file `Copy-Item -Recurse` (or `cp -r` on macOS/Linux) —
no compile step, no runtime dep. The repo-local copies are
the source of truth; the global mirror is regenerated
whenever a new skill lands or an existing one is updated.
We mention this here so the next maintainer does not
confuse the two locations when reading or auditing the
skills layer.

### What is *not* adapted

To be explicit about the boundary: we did **not** adapt any
runtime code from these six repos. The `ar-autoresearch`
harness is the one exception, and even there the harness is
a reference artifact the agent may *run* on a developer
machine — it is not loaded by the desktop, not linked into
the Electron app, not bundled into the installer, and not
required for any desktop feature to work. The other five
repos contributed prose and structure only. The trust
boundary, the security surface, the threat model, and the
EULA scope of the desktop are unchanged by the V2.6 skills
import.

---

## Open-source runtime dependencies

The full list with per-package licenses lives in
[`NOTICE`](./NOTICE) §"Frontend libraries" and §"Interoperated
services". The headlines:

- **React 19** (MIT) — MIT
- **Electron 39** (MIT) — MIT
- **i18next 25** (MIT) — MIT
- **better-sqlite3 12** (MIT) — MIT
- **electron-updater 6** (MIT) — MIT
- **react-markdown 10** + **remark-gfm 4** (MIT) — MIT
- **react-syntax-highlighter 16** + **highlight.js 11**
  (MIT / BSD-3-Clause) — MIT / BSD-3-Clause
- **lucide-react** (ISC) — ISC
- **Fira Code** (SIL OFL 1.1) and **Inter** (SIL OFL 1.1) — fonts

And the broader Node.js / TypeScript / Vite / vitest / Playwright
toolchain. The full transitive list with licenses is in
`package-lock.json` and is regenerable from `npm install` against
the lockfile.

---

## Community

- The **hermes-desktop** project, the Nous Research / Hermes
  Agent community, and the contributors who have built and
  maintained the framework that Cubecloud builds on.
- The **CodeGraph** project (colbymchenry) for the optional
  SDK and CLI that the wrapper layer integrates against.
- The **EverOS** project for the optional sidecar backend.
- The maintainers and contributors of every npm dep listed
  in `NOTICE`. The Cubecloud desktop cannot run without
  their work.
- The early Cubecloud contributors who have reviewed PRs,
  filed issues, tested pre-releases, and improved the
  documentation.
- The free-software community at large — every standards
  body, every SPDX maintainer, every REUSE tool author, every
  Open Source Initiative volunteer who makes the licensing
  and contribution ecosystem work.

---

## A note on corrections

This page, like `NOTICE` and `LICENSE`, is a working document.
If a credit is missing, mis-attributed, or overstated, please
open an issue and we will correct it promptly. We prefer
honest corrections over inflated attribution.
