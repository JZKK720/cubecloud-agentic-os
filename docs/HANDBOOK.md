# Cubecloud Agent Desktop — Handbook

> **A single entry point for *what this is*, *why it is the way it is*, and *where to look next*.** This is the project's master index. It is intentionally short. Every section links out to a deeper doc rather than restating it. If a section is growing past a screen, that is a signal to split it out into `docs/handbook/<topic>.md` and link to it from here.

---

## How to read this handbook

You have arrived here from one of three places:

1. **You are a new contributor.** Read §1 → §2 → §3, then §5 ("Skills layer") to find the work patterns. Skip §4 on the first pass.
2. **You are a downstream user evaluating the desktop.** Read §1 → §3.1, then §10 ("License / brand") to understand what you can and cannot do with the binary.
3. **You are doing a code review, a security review, or a release.** Read §1, §3, §4, §6, §9, §10, §11 in that order. The release checklist in §11 is the binding one.

If you only have 5 minutes: read §1 ("What is this"), §2 ("Why is it this way"), and §10 ("License / brand"). Everything else is supporting.

---

## §1. What is Cubecloud Agent Desktop?

A native desktop control center for [Cubecloud Agentic-OS](https://github.com/cubecloud-contributors/cubecloud-agentic-os) — the agent operating system that this repo lives inside. The desktop wraps a local or remote agent runtime (Hermes today, OpenClaw and IronClaw next) in a single GUI so the user does not have to manage the CLI by hand.

It is the **front door** to:

- a local install of an agent runtime (Hermes is the current default; the V2.6 + V2.7 wave adds OpenClaw and IronClaw as optional runtimes),
- a local model endpoint (Ollama, vLLM, llama.cpp on loopback) **or** a remote provider (any OpenAI-compatible API),
- a chat surface, session history, profiles, persona editor, skills, memory, tools, schedules, and 16 messaging gateways,
- an optional **CodeGraph** semantic code-intelligence surface (MCP) and an optional **EverOS** sidecar (HTTP, memory and harness),
- a **skills layer** of 34 first-class open-source skills (the `.agents/skills/` tree), which makes the desktop a *good* place to develop, not just to run.

What it is **not**:

- It is **not** a model server. It does not host weights, does not run inference, and does not compete with Ollama/vLLM/llama.cpp. It is a *client* of those.
- It is **not** a product-only repo. It is a Cubecloud-branded *successor* of an upstream framework (hermes-desktop, MIT), and a substantial fraction of the source tree is still inherited from that framework. The brand/legal posture in §10 distinguishes the two tiers explicitly.
- It is **not** an AGPL-3.0-only product. The Cubecloud-original work is dual-licensed (AGPL-3.0-or-later primary, Apache-2.0 and MIT as compatibility options); the inherited framework code is hard-MIT. See `LICENSE` and `BRANDING_AND_LICENSE.md`.

## §2. Why is it the way it is?

Three commitments drove the design, in order:

1. **The user should not touch the CLI to use the desktop.** Install, configure, chat, schedule, back up, update — all of it from the GUI.
2. **The user should not be locked in to one runtime or one provider.** The runtime layer is separate from the provider layer: Hermes is the day-1 runtime agent, with OpenClaw and IronClaw as optional additional lanes; model providers such as Ollama, vLLM, llama.cpp, OpenRouter, and Azure OpenAI can be swapped independently.
3. **The user should not be locked in to a license they cannot use.** Cubecloud-original work is dual-licensed; the inherited framework stays MIT; downstream consumers pick the license that fits their house policy.

Three *consequences* fell out of those commitments:

- The desktop has a **wide IPC surface** (`src/main/index.ts`, `src/preload/index.ts`) that exposes the runtime, the model registry, the provider registry, the skill manifests, the memory plane, the schedule runner, and the gateway layer to the renderer. That surface is the integration boundary; it is also the largest part of the inherited framework code.
- The desktop has a **multi-runtime plan** (`docs/RUNTIME_ORCHESTRATION_PLAN.md`) that makes Hermes the day-1 lane and adds OpenClaw / IronClaw as additional lanes over the V2.6 → V2.7 window. The V2.4 → V2.5 work made the brand and license posture enforceable so that adding a second runtime did not have to revisit the legal surface.
- The desktop has a **34-skill ecosystem** (the `.agents/skills/` tree) that the developer who *builds* the desktop benefits from, not just the user who *runs* it. The skills layer is the bridge between the desktop and the broader agent-runtime ecosystem. See §5 for the deep dive.

## §3. Architecture

### 3.1 Layer map

| Layer | Lives in | Responsibility | Replaced by Cubecloud-original? |
|---|---|---|---|
| Electron shell | `src/main/index.ts`, `src/preload/index.ts`, `electron.vite.config.ts` | Spawns the main process, mounts the renderer, exposes the preload bridge. | Inherited from `hermes-desktop` (MIT). |
| IPC channel surface | `src/main/ipc/**` | Handlers for every channel the renderer can call. | Mixed. New channels (CodeGraph, EverOS, skills harness) are Cubecloud-original. |
| Renderer UI | `src/renderer/src/**` | React 19 + i18next. All screens. | **Cubecloud-original rebuild** on top of the inherited framework. |
| State layer | `apps/desktop-shell/src/state/**` | Profiles, sessions, models, providers, skills, memory, tools, schedules, kanban. | **Cubecloud-original.** The SQLite schema, the dispatch logic, the kanban board, and the agent-profile model are all Cubecloud-original. |
| Runtime orchestration | `src/main/hermes-runtime/**`, `src/main/openclaw/**`, `src/main/ironclaw/**` | Detect, install, configure, and proxy to each agent runtime. | Mixed. Hermes is inherited; OpenClaw and IronClaw are Cubecloud-original additions. |
| CodeGraph surface | `src/main/codegraph-runtime.ts`, `src/main/codegraph.ts` | Two backends for the CodeGraph screen: a CLI subprocess (inherited) and an embedded SDK wrapper (Cubecloud-original). | See `docs/CODEGRAPH-RUNTIME.md`. |
| EverOS sidecar | `src/main/everos-sidecar.ts` | Lifecycle manager for the optional `everos server start` Python sidecar. | Cubecloud-original. See `docs/EVEROS-SIDECAR.md`. |
| Skills harness | `src/main/skills-harness.ts` | Resolves the agent-runtime skills layer. | Cubecloud-original. |
| Smoke / capture scripts | `scripts/verify-*.js`, `scripts/smoke-all.js`, `scripts/capture-*.js` | CDP-driven smoke runs + preview captures. | Cubecloud-original. |
| Brand assets | `build/branding/cubecloud-*.svg`, `src/renderer/src/assets/cubecloud-*.svg` | Logo, mark, wordmark, splash background. | Cubecloud-original. All-rights-reserved. See `docs/legal/TRADEMARK_POLICY.md`. |

### 3.2 Where the boundaries are

- **Trust boundary** — the local user. Nothing in the desktop trusts the network by default; outbound calls are user-confirmed in the GUI or sandboxed to known loopback endpoints. `THREAT_MODEL.md` is the binding document.
- **License boundary** — inherited framework code (MIT, can't be retroactively restricted) vs Cubecloud-original work (dual-license, AGPL-3.0-or-later primary). `BRANDING_AND_LICENSE.md` and `LICENSE` are the binding documents.
- **Brand boundary** — Cubecloud marks (logo, wordmark, splash, screenshots) are All-rights-reserved. `docs/legal/TRADEMARK_POLICY.md` is the binding document.
- **Process boundary** — main process, preload, renderer, and (optionally) the EverOS sidecar process. The CodeGraph SDK runs in-process; the CodeGraph CLI runs as a subprocess.

### 3.3 Two-tier provenance: how to read the source tree

The V2.5 license posture is *dual-tier*:

- **Inherited `hermes-desktop` framework code** (the Electron main / preload / renderer framework that hosts the Cubecloud rebuilds) is hard-MIT and remains under the upstream MIT terms. The framework carve-out in `LICENSE` makes this explicit.
- **Cubecloud-original work** (the rebuilt renderer, the state layer, the V2.3 modules, the SQLite schema, the provider-discovery logic, the hidden skills harness, the smoke / capture scripts, and the architecture docs) is dual-licensed under your choice of AGPL-3.0-or-later, Apache-2.0, or MIT. The AGPL-3.0-or-later option is primary.

Per-file `SPDX-License-Identifier` headers are present in the Cubecloud-original source files. The MIT-only framework files do not need an SPDX header (they are MIT, the most-permissive default).

## §4. Runtime orchestration

The desktop is a *client* of agent runtimes, not a runtime itself. The runtime orchestration layer makes this work.

### 4.1 The three runtimes

| Runtime | Status | Role | Doc |
|---|---|---|---|
| **Hermes** | Day-1, current | Primary assistant runtime. Self-improving, skills-aware, gateway-driven. | Inherited framework; V2.4 + V2.5 add the Cubecloud wrapper. |
| **OpenClaw** | V2.6 →V2.7, optional | Second assistant runtime. OpenAI-compatible HTTP surface, SSH-tunnel-friendly. | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |
| **IronClaw** | V2.6 →V2.7, optional | Security-first runtime. WASM sandbox, approval-gated tool execution. | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |

The orchestration is described in detail in `docs/RUNTIME_ORCHESTRATION_PLAN.md`. The headline: Hermes is the day-1 lane; OpenClaw and IronClaw are added as *lanes* the user can pick from a runtime picker, not as *replacements* for Hermes. A user can run more than one runtime on the same machine (Hermes on `127.0.0.1:8642` + OpenClaw on `127.0.0.1:18789` + IronClaw on a Docker-published port), and the desktop's runtime picker routes chat requests to the right one.

### 4.2 Provider layer

The provider layer is *separate* from the runtime layer. A runtime (Hermes) talks to a provider (Ollama, vLLM, llama.cpp, OpenAI-compatible remote, etc.). The desktop exposes:

- **Local provider discovery** — Ollama on `127.0.0.1:11434`, vLLM on its user-configured port, llama.cpp on its user-configured port.
- **Remote provider config** — any OpenAI-compatible API, with the user supplying base URL + API key.
- **Model registry** — the user can save, name, and switch between models across providers.

The local providers are MIT / Apache-2.0 (Ollama MIT, vLLM Apache-2.0, llama.cpp MIT). The desktop does not bundle, ship, or install any of them; it only consumes their HTTP protocols. See `NOTICE` §"Interoperated services".

### 4.3 Conceptual model: object + action (V2.10.35)

The local surfaces of the desktop can be mapped cleanly to a small
**object + action** model that is conceptually similar to what
Palantir's Foundry calls an "ontology" for the enterprise, but
**scoped down to one operator's desk**:

- **Objects (nouns)** are the durable things the agent operates on.
  In this repo they are the noun-shaped TypeScript interfaces in
  [`packages/platform-core/src/index.ts`](../../packages/platform-core/src/index.ts) —
  `AgentSkill`, `AgentMemoryEntry`, `AgentTool`, `AgentSchedule`,
  `AgentProfile`, `AgentModelEndpoint`, `AgentProviderConfig`,
  `EverOsHarness`, `CodeGraphRepoSummary`, `CodeGraphEntrypoint`,
  `CodeGraphQueryTemplate`, and so on. They are persisted as explicit
  JSON registries under the user's control, not as opaque blobs in a
  hosted workflow engine.
- **Actions (verbs)** are the things the agent does to those objects.
  In this repo they are the dispatch ledger in
  [`apps/desktop-shell/src/main/agentControlPlane.ts`](../../apps/desktop-shell/src/main/agentControlPlane.ts)
  (`ControlPlaneDispatchRuntimeRequest` / `Result` / `Executor`),
  schedule execution (`AgentSchedule.cron + prompt + profile`),
  CodeGraph query application (`CodeGraphQueryTemplate.mode`),
  and the `headroom learn --apply` review flow. The
  `headroom learn --apply` flow is the one place where the
  **branch-and-review** gate is fully implemented: AI proposes,
  human reviews, and "Commit" / "Revert" decides what actually
  lands in `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`.
- **Operator scope.** Foundry's ontology is a digital twin of an
  organization; Cubecloud's ontology is a digital twin of a single
  desk. This is a deliberate scale difference, not a missing
  feature. The same noun/verb structure scales down to a prosumer
  and small-business operator without forcing them to pay for a
  multi-tenant platform they do not need.

The point of stating the model explicitly here is so that any future
contributor can map a new feature to either "this is a new object" or
"this is a new action" and place it in the right layer of the
architecture. The current implementation still uses hand-rolled JSON
registries; a future hardening pass can collapse them into a single
typed registry without changing the conceptual contract.

The 51CTO article *"Palantir 的"本体论"(Ontology)究竟是什么？"* and
Satoshi Yamauchi's open-source book
[`palantir-ontology-strategy`](https://github.com/Leading-AI-IO/palantir-ontology-strategy)
are the closest public references for this framing. They are
recommended reading for contributors, not required pre-reading.

## §5. Skills layer

The desktop's **skills layer** is a 34-skill ecosystem under `.agents/skills/<name>/SKILL.md`, plus a functioning Python reference harness for the `ar-autoresearch` skill. The skills are loaded by the agent runtime (Copilot Chat today; any skill-aware agent runtime tomorrow) and auto-activate based on the `description` frontmatter.

### 5.1 Why a skills layer?

The desktop is the *front door* to a chat surface, but the *people who build* the desktop benefit from a richer surface than the GUI alone: structured workflows, diagnosis loops, planning rituals, retros, and post-work cleanup. The skills layer is that surface. It is **not** shipped to the end user of the desktop binary; it is a developer-ergonomics surface for the contributors to the cubecloud-agentic-os stack.

The skills are also mirrored to the **user-global** `~/.agents/skills/` directory on developer machines so they auto-activate in *every* Copilot workspace on the same machine, not just the `cubecloud-agentic-os` workspace. The mirror is plain-file `Copy-Item -Recurse` (or `cp -r` on macOS / Linux).

### 5.2 The 34 skills (V2.6 + V2.7)

| Prefix | Source | # skills | Skills |
|---|---|---|---|
| `ar-` | [autoresearch](https://github.com/JZKK720/autoresearch) (MIT, Karpathy) | 1 | `ar-autoresearch` |
| `karpathy-` | [andrej-karpathy-skills](https://github.com/JZKK720/andrej-karpathy-skills) (MIT, Karpathy) | 1 | `karpathy-guidelines` |
| `po-` | [poskills](https://github.com/JZKK720/poskills) (MIT, Matt Pocock) | 7 | `po-caveman`, `po-diagnose`, `po-tdd`, `po-write-a-skill`, `po-grill-with-docs`, `po-improve-codebase-architecture`, `po-to-prd` |
| `ecc-` | [ECC](https://github.com/JZKK720/ECC) (MIT, Matt Pocock) | 3 | `ecc-skill-development-guide`, `ecc-skill-scout`, `ecc-coding-standards` |
| `gbrain-` | [gbrain](https://github.com/JZKK720/gbrain) (MIT) | 2 | `gbrain-skillify`, `gbrain-eiirp` |
| `gstack-` | [gstack](https://github.com/JZKK720/gstack) (MIT) | 6 | `gstack-plan-ceo-review`, `gstack-plan-eng-review`, `gstack-plan-design-review`, `gstack-retro`, `gstack-investigate`, `gstack-qa` |
| `sp-` | [superpowers](https://github.com/JZKK720/superpowers) (MIT, Jesse Vincent) | **14** | `sp-skill-first`, `sp-tdd`, `sp-debug`, `sp-verify`, `sp-brainstorm`, `sp-plan`, `sp-execute`, `sp-subagents`, `sp-parallel`, `sp-request-review`, `sp-receive-review`, `sp-worktree`, `sp-finish-branch`, `sp-write-skill` |

The 14 `sp-` skills are **hidden flavors** adapted from the upstream `superpowers` repo (MIT, Jesse Vincent). The `sp-` prefix is a Cubecloud-original disambiguator; the upstream uses bare names (`brainstorming`, `test-driven-development`, etc.). The full set is in [`.agents/skills/README.md`](../.agents/skills/README.md). The per-source license text is vendored under `licenses/<repo>-MIT.txt`. The REUSE catalog form is in `NOTICE` §"Adapted dependencies" §"Skills ecosystem". The licensing analysis is in `BRANDING_AND_LICENSE.md` §"V2.7 transitions landed".

The full decision tree and the per-skill `metadata.source` provenance pointers are in [`.agents/skills/README.md`](../.agents/skills/README.md). The per-source license texts are vendored under `licenses/<repo>-MIT.txt`. The REUSE catalog form of the same info is in `NOTICE` §"Adapted dependencies". The licensing analysis is in `BRANDING_AND_LICENSE.md` §"V2.6 transitions landed".

### 5.3 The autoresearch Python harness (the one shipped-code exception)

`ar-autoresearch/harness/{prepare.py, train.py, pyproject.toml, README.md}` is the one place in the desktop repo where adapted upstream *code* (not just prose) is shipped. The harness preserves Karpathy's upstream `prepare.py` and `train.py` with the data download, BPE tokenizer, GPT model (rotary embeddings, value embeddings, softcap, ReLU² MLP), MuonAdamW optimizer, best-fit packing, training loop, eval, and summary print all intact. The harness is **not** loaded by the desktop at runtime, **not** linked into the Electron app, **not** bundled into the installer, and **not** required for any desktop feature to work. It exists so the `ar-autoresearch` skill has a working reference for the agent to experiment with on a developer machine. Removing the harness would not change the desktop's build, runtime, or trust surface.


### 5.5 The process methodology (V2.7 superpowers import)

The 14 `sp-` skills form a **process methodology** that auto-activates on a chat conversation's lifecycle:

1. **`sp-skill-first`** (the bootstrap) —every message, the agent checks for relevant skills before responding.
2. **`sp-brainstorm`** —for creative work, the Socratic design refinement kicks in.
3. **`sp-plan`** —once the design is approved, the bite-sized task plan.
4. **`sp-worktree`** —before implementation, an isolated worktree + clean baseline.
5. **`sp-tdd`** —every code change is RED-GREEN-REFACTOR.
6. **`sp-debug`** —when something is broken, the 4-phase root-cause process.
7. **`sp-execute`** or **`sp-subagents`** —run the plan (sequential or parallel).
8. **`sp-verify`** —"is this done?" requires evidence, not intent.
9. **`sp-request-review`** —pre-review checklist before hand-off.
10. **`sp-receive-review`** —triage, fix, defend, push back.
11. **`sp-parallel`** —one-off parallel queries for research (not for plan execution).
12. **`sp-finish-branch`** —verify, present 4 options (merge / PR / keep / discard), clean up.

The methodology is **enforced by the description contract, not by the user's manual invocation**. Each skill's `description` is *trigger-only* (per the `sp-write-skill` Description Trap): no process summary in the description, so the agent reads the body to learn the process. The V2.8 audit trimmed all 34 skills' descriptions to trigger-only; all 34 also carry a `tests/red-baseline.md` per the TDD-for-skills discipline.

### 5.6 The pre-launch bundle (V2.9 — what the end user sees on first launch)

The 34-skill developer-time ecosystem is the *contributor's* surface. The end user of the desktop binary sees a different surface: **the pre-launch bundle**, a curated subset that ships in the binary. The full seed list:

- **Skills (3, user-visible)** — `cubecloud-persona` (operator tone), `cubecloud-onboarding` (first 5 minutes), `cubegraph-code-intel` (wraps the existing CodeGraph IPC as a skill). Source: `apps/desktop-shell/src/main/defaultSkills.ts`.
- **Memory (6)** — conventions, runtime topology, two-tier skills, license/brand, workspace conventions, security posture. Source: `apps/desktop-shell/src/main/defaultMemories.ts`.
- **Harnesses (3, disabled)** — `cubecloud-memory-distill`, `cubecloud-cost-watchdog`, `cubecloud-skill-audit`. User enables after installing `everos`. Source: `apps/desktop-shell/src/main/defaultHarnesses.ts`.
- **Schedules (1, disabled)** — `cubecloud-daily-standup`. User enables after configuring a profile. Source: `apps/desktop-shell/src/main/defaultSchedules.ts`.
- **Kanban (1 starter board + 5 deletable example tasks)** — "Onboarding — delete me" with 5 tasks that walk the user through install / configure / chat / skill / schedule. Source: `apps/desktop-shell/src/main/defaultKanban.ts`.

The seed is **idempotent** (a second run on the seeded set adds nothing) and **respects user deletions** (if the user deleted a seed, the seed is not re-added). The contract is pinned by `apps/desktop-shell/src/main/prelaunchSeed.test.ts`. The user can opt out per-entry by deleting it from the desktop UI; the seed won't re-add it.

The pre-launch bundle is documented in `BRANDING_AND_LICENSE.md` §"V2.9 transitions landed". The full provenance is in `NOTICE` §"Direct dependencies — Cubecloud-original work (2026)".
### 5.4 Adding a new skill

Run `gbrain-skillify` (the 11-axis gate) →run `ecc-skill-scout` (search-before-write) →read `po-write-a-skill` (the authoring contract) →write the SKILL.md (500 line cap) →add a row to `.agents/skills/README.md` →mirror to `~/.agents/skills/`. The full flow is documented in those four skills; the gating principle is "do not skillify a one-off, and do not skillify a vague idea."

## §6. Security & threat model

The desktop's security posture is the local-user-first model. The binding documents are `SECURITY.md` and `THREAT_MODEL.md`. The headlines:

- **Trust boundary** —the local user. The agent runtime runs in the user's context; the renderer is sandboxed by Electron's standard isolation; IPC channels are explicit and unguessable.
- **Outbound network** —opt-in. Outbound calls are user-confirmed in the GUI or sandboxed to known loopback endpoints. No telemetry, no analytics call, no remote attestation.
- **Inbound network** —opt-in. The user must explicitly enable the gateway lane and supply a port; the default port is on `127.0.0.1` (loopback) only.
- **Auto-update** —opt-in. The `electron-updater` channel is on by default for stable releases; can be disabled in Settings.
- **Sidecar processes** —optional, sandboxed. CodeGraph runs as a subprocess or in-process SDK wrapper; EverOS runs as a Python sidecar over HTTP, lifecycle-managed by the desktop. The desktop never auto-installs either.
- **Reporting** —private channels listed in `SECURITY.md`. No public bug bounty at the moment.

## §7. Internationalization

- English: `README.md`
- 简体中文 `README.zh-CN.md`
- 日本語 `README.ja-JP.md`

The i18n runtime is i18next (MIT). The English locale is the source of truth; the translated READMEs are community-maintained. See `CONTRIBUTING.md` for the translation-contribution flow.

## §8. Contributing

- DCO 1.1 sign-off is required on every commit (see `CONTRIBUTING.md`). DCO is the chosen inbound-contribution model —*not* CLA —because it is per-commit, zero-friction, and legally equivalent for our case.
- The V2.5 + V2.6 license posture makes the dual-license clear: Cubecloud-original work is dual-licensed; the inherited framework stays MIT. Adding a Cubecloud-original file means adding the SPDX header `SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`. Adding an inherited file means leaving it MIT (no header needed).
- A new skill goes through the `gbrain-skillify` gate. A new platform app goes through the `PLATFORM_APPS` registry in `packages/platform-core/src/index.ts`. A new brand asset goes through the `docs/legal/TRADEMARK_POLICY.md` review. New legal docs go under `docs/legal/`. New architecture docs go under `docs/`. New smoke scripts go under `scripts/` and carry the same SPDX header.
- The CI pipeline runs lint + typecheck + vitest. Smoke runs (the CDP-driven `verify-*.js` and `smoke-all.js` scripts) are run manually before each release.

## §9. Release process

The release process is documented in `docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md` (the V2.6 release spec, archived in V2.10.36) and the `BRANDING_AND_LICENSE.md` §"Pending rebrand surfaces" list (the items that must be closed before the next public release). The binding checklist:

1. **Close the remaining rebrand surfaces** — translated READMEs (sync brand changes), in-app locale strings, and release automation metadata. The preview captures were refreshed down to a smaller Cubecloud-branded subset in V2.10.30, and the packaged icon set was regenerated from the current Cubecloud mark in V2.10.31.
2. **Smoke run** —`npm run smoke:all` and the per-screen CDP verifies. All must pass.
3. **Legal recheck** —`BRANDING_AND_LICENSE.md`, `NOTICE`, `ACKNOWLEDGMENTS.md`, `SECURITY.md`, `THREAT_MODEL.md`, `CONTRIBUTING.md`, `docs/legal/*`. Any new file landed since the last release must be in the right section.
4. **Changelog** —append a `changelogs/<version>.md` with the user-visible changes.
5. **Tag & publish** —tag the release commit, push to the Cubecloud-owned release branch, run the `electron-builder` pipeline for the three target platforms (Windows MSI, Fedora RPM, macOS DMG).
6. **Smoke the published artifact** —install from the published URL, walk through the install / first-run / chat flow, confirm auto-update.

## §10. License / brand

This is a Cubecloud-branded successor of `hermes-desktop` (Nous Research / Hermes Agent lineage). The V2.4 →V2.5 →V2.6 work settled the license / brand posture. The binding documents:

- `LICENSE` —the dual-license notice. AGPL-3.0-or-later (primary) + Apache-2.0 + MIT (compatibility options) for Cubecloud-original work; hard-MIT for the inherited `hermes-desktop` framework.
- `BRANDING_AND_LICENSE.md` —the historical narrative + per-path provenance breakdown. Read §"V2.4 / V2.5 / V2.6 transitions landed" for the diff of the three recent passes.
- `NOTICE` —REUSE-compliant third-party attribution catalog. Read §"Adapted dependencies" for the 6 upstream repos whose skills are in `.agents/skills/`.
- `ACKNOWLEDGMENTS.md` —the human-readable thank-you page. Read §"Skills adapted from third-party repos" for the V2.6 import.
- `docs/legal/TRADEMARK_POLICY.md` —Cubecloud marks (logo, wordmark, splash, screenshots) are All-rights-reserved; the policy enumerates allowed nominative uses and provides a `FORK-NOTICE.md` template.
- `docs/legal/CUBECLOUD-EULA.md` —the hosted-service EULA.
- `docs/legal/PAID_SERVICES_TERMS.md` —paid-feature terms.
- `docs/legal/COMMERCIAL_LICENSE.md` —commercial-relicensing path.
- `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md` —clean-room replacement roadmap.
- `docs/legal/PROVENANCE_TRACKER.md` —per-path provenance tracker.
- `CONTRIBUTING.md` —DCO 1.1 contribution terms.
- `SECURITY.md` —security policy, supported versions, deployment guidance, vulnerability reporting.
- `THREAT_MODEL.md` —working threat model.

## §11. Where to look next

| If you want to… | Read |
|---|---|
| Build & run the desktop | `README.md` |
| Understand the runtime plan | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |
| Understand CodeGraph integration | `docs/CODEGRAPH-RUNTIME.md` |
| Understand EverOS integration | `docs/EVEROS-SIDECAR.md` |
| Understand the pre-V2.4 / V2.5 / V2.6 commit work | `BRANDING_AND_LICENSE.md` §"V2.10.36 - inner doc retirement" |
| Understand SSH-tunnel deployment to a VPS | `docs/SSH-TUNNEL-VPS.md` |
| Understand the hermes-desktop -> cubecloud-agentic-os rebrand | `BRANDING_AND_LICENSE.md` §"V2.3 - V2.4 - V2.5 transitions" |
| Add a new skill | `.agents/skills/README.md` →`gbrain-skillify` →`po-write-a-skill` |
| Add a new platform app | `packages/platform-core/src/index.ts` §"PLATFORM_APPS" |
| Add a new legal doc | `docs/legal/` (follow the style of the existing files) |
| Add a new architecture doc | `docs/` (follow the SPDX header + provenance-pointer pattern) |
| Add a new smoke / capture script | `scripts/` (follow the SPDX header pattern) |
| Submit a security report | `SECURITY.md` |
| Understand the V2.6 release pipeline (archived) | `docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md` |
| Do a global install of the skills | `docs/GLOBAL-INSTALL-PLAN.md` and the bundle installer at `docs/agent-skills-bundle/` |

---

**Attribution note.** This handbook was authored by the Cubecloud Contributors in 2026. The structure is modelled on the V2.4 →V2.5 →V2.6 `BRANDING_AND_LICENSE.md` history and the V2.6 release design at `docs/superpowers/archive/2026-04-30-windows-winget-fedora-rpm-release-design.md`. It is intended to be the project's *master index*; every other doc is a leaf off it.
