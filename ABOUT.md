# About cubecloud-agentic-os

---

## What cubecloud.io is

> "Private AI for everyday work, on your own machines."  `[SRC: homepage H1]`

cubecloud.io's framing is **sovereign intelligence** delivered as a local-first AI ecosystem for teams.  `[SRC: homepage sub-tagline]`

> "Sovereign intelligence for teams that need control, security, and local deployment."  `[SRC: homepage sub-tagline]`

The word "sovereign" is operationalized by four commitments on the homepage CTA strip:  `[SRC: homepage CTA strip]`

- **Data stays in-house.**
- **Works offline.**
- **No cloud API fees.**
- **OEM ready.**  *(The fourth item, present on the CTA strip but not in the user's three-line summary. Kept here for completeness â€?it signals that the platform ships as an OEM appliance, not just a downloadable installer.)*

The corporate identity, drawn from the cubecloud.io footer (every page):  `[SRC: footer]`

- **Legal entity**: Cubecloud Limited Company / æ™ºæ–¹äº?- **Copyright**: Â© 2026
- **License**: AGPL-3.0-only
- **Trademarks**: Cubecloud, æ™ºæ–¹äº? and cubecloud.io branding and trademarks reserved
- **Bilingual brand mark**: SOVEREIGN INTELLIGENCE / ä¸»æƒæ™ºèƒ½åŒ?
### The product surface: Cubecloud OS

The cubecloud.io homepage introduces the product as **Cubecloud OS** â€?*the private AI operating layer*.  `[SRC: homepage graph caption]`

The cubecloud.io manifest page is the canonical statement of what Cubecloud OS *is*:  `[SRC: manifest page]`

> "The platform operating layer is open-source and ever-growing. Surfaces can be added, removed, or swapped freely as team needs change â€?there is no fixed set of tools."

> "All utilities are open-sourced, so teams can add, remove, or swap any surface as work evolves. The value is the managed operating layer, not which tools are running at any moment."

This is the single most important positioning claim on the website, and it is the positioning that this repository is the source-available view of: **Cubecloud OS is an open-source operating layer, surfaces are swappable, the value is the management of the layer over time.**

### The seven surfaces of Cubecloud OS

The homepage's "under the hood" graph, titled *"The private AI operating layer"* and labelled *"7 entities"*, enumerates the named surfaces and runtime categories of Cubecloud OS as:  `[SRC: homepage graph]`

- **OpenSpace** â€?the team control panel.
- **Open WebUI** â€?the private AI workspace.
- **Hermes** â€?memory, schedule, and subagents.
- **OpenCode** â€?local coding assistant.
- **IronClaw** â€?security, vault, and trusted execution.
- **Warp ADE** â€?a shared workspace for teams building and testing AI-assisted software.
- **ADE** â€?*(a separate graph node from Warp ADE; the relationship between "ADE" and "Warp ADE" is not explicit on the homepage. Treated here as a sibling surface to Warp ADE â€?possibly the runtime / IDE side of the agentic-development surface â€?pending clarification from the maintainers.)*  `[SRC: homepage graph]`

Plus the runtime categories that sit on top of the hardware:  `[SRC: homepage graph]`

- **Agents** â€?long-lived processes with a defined role.
- **Skills** â€?workflow bundles agents can load.
- **Data** â€?per-user state, persisted locally.
- **Local PC Hardware** â€?the substrate.

The demos page expands what each surface does, in the user's words (not paraphrased):  `[SRC: demos page]`

| Surface | What it does (verbatim or close) |
|---|---|
| OpenSpace | "Track team work, approvals, and AI activity in one dashboard." |
| Open WebUI | "Private AI chat for internal documents, search, and assistant tasks." Links Ollama, llama.cpp, LM Studio. |
| IronClaw | "Control who can access what and keep sensitive work locked down." Vault, WASM, TEE, Egress Control, Trusted Execution. |
| Hermes | "Let AI remember recurring tasks and follow up automatically." Memory, schedule, subagents. |
| Warp ADE | "A shared workspace for teams building and testing AI-assisted software." Runs OpenCode, Claude Code, and Codex CLI as agent sessions. Drive context synced across sessions. |
| OpenCode | "Local coding assistant for private code review and fast iteration." LSP, sessions, privacy. |

The live demos for each surface are at `https://www.cubecloud.io/demos`.

### The hardware lineup

Cubecloud OS ships on **AMD Ryzen AI silicon** in four OEM form factors.  `[SRC: hardware page]`

| Form factor | SKU line | Key specs (lifted from the hardware page) |
|---|---|---|
| **Mini AIPC** *(Tianbo maco V01)* | MACO AI9 | Ryzen AI HX370 (12 cores), Radeon 890M (RDNA4), XDNA4 NPU (up to 400 TOPS), 32 GB DDR5 (up to 64 GB), 1 TB NVMe (up to 4 TB), Oculink + xGPU. |
| **NEX-AI + iGPU private AI bundle** | NEX AI9 | Ryzen MAX AI 395 (16 cores), M8060S iGPU (RDNA5), XDNA5 NPU (up to 1600 TOPS), 128 GB LPDDR5X unified VRAM, 2 TB NVMe (up to 8 TB), USB4 + xGPU. |
| **ColorFire MEOW AI laptop** | MEOW R16 | Ryzen AI9 HX 470 (12 cores), Radeon 890M, NVIDIA GeForce RTX 5060 Laptop 8 GB GDDR7, 16 GB DDR5, 512 GB NVMe. |
| **ColorFire AI MODT workstation** *(single-case desktop, accelerated-GPU all-in-one)* | MODT AI9 | Ryzen AI HX470 (12 cores), Radeon 890M (RDNA4), XDNA4 NPU (up to 1000 TOPS), Radeon RX 9070 XT 16 GB GDDR6, 32 GB LPDDR5X (up to 64 GB), 1 TB NVMe. |

Three of the four SKUs are AMD-only silicon. The laptop adds an NVIDIA dGPU for higher-throughput coding workflows.  `[SRC: hardware page]`

The hardware page also notes that the four SKUs are sample configurations matched to "demos, office nodes, and higher-throughput teams" â€?i.e., they are not the entire catalog.  `[SRC: hardware page]`

The market context, drawn from the materials page: Edge AI market projected to grow from $24.91B (2025) to $118.69B (2033) at 21.7% CAGR; AI PC market from $58.07B (2025) to $321.41B (2035) at 18.66% CAGR.  `[SRC: materials page]` *(These figures are external market projections, not cubecloud-specific claims. They appear here as context for why the cubecloud.io positioning is local-first AI on AMD Ryzen AI silicon.)*

### The commercial phasing

The materials page describes the business path as three phases:  `[SRC: materials page]`

- **Phase 1 â€?Services**: deployment and professional services.
- **Phase 2 â€?SaaS**: managed support and annual subscriptions.
- **Phase 3 â€?OEM**: OEM licensing once delivery patterns are proven.

The materials page also notes "150+ OEM partners" as a current scale indicator, and "55% AI PC channel" as a target distribution shape.  `[SRC: materials page]`

> **Footnote â€?internal brand framing**  `[SRC: user, 2026-06-08]`
>
> In conversation, you described the brand as "**Cubecloud Agent OS**" (three words, capitals, space-separated), and the product line as having four items: **SMB private consulting, Wrapped AI Applications, local model and runtimes, bundled hardwares**. Each of those four items maps to real content on the website:
>
> - "SMB private consulting" â†?Phase 1 services on the materials page.
> - "Wrapped AI Applications" â†?the swappable application surfaces on the demos page (OpenSpace, Open WebUI, IronClaw, Hermes, Warp ADE, OpenCode).
> - "Local model and runtimes" â†?the runtime layer (Ollama / llama.cpp / LM Studio integration on the demos page; IronClaw's vault/TEE/egress runtime; Hermes' memory/schedule/subagent runtime).
> - "Bundled hardwares" â†?the four AMD Ryzen AI SKUs on the hardware page.
>
> The website does not bundle these four items under a single name (such as "four pillars"); the website's primary structures are the three commercial phases, the seven surfaces, the four hardware SKUs, and the three sovereign commitments. The four-item framing is preserved here as your internal description of the brand, not as a structure imposed on the file.  `[SRC: user, 2026-06-08]`

---

## Where this repo fits

`cubecloud-agentic-os` is the **source-available repository of Cubecloud OS**.  `[SRC: user, 2026-06-08]`

The two names â€?**Cubecloud OS** (the brand on the cubecloud.io website) and **`cubecloud-agentic-os`** (the GitHub repository's hyphenated path) â€?refer to the same operating system. The repository is the open, version-controlled, public implementation of the Cubecloud OS operating layer.  `[SRC: user, 2026-06-08]`

This repository implements the **Agents**, **Skills**, and **Data** runtime categories of the homepage graph, plus the desktop / individual-operator surface that ties them together. The named application surfaces â€?OpenSpace, Open WebUI, Hermes, OpenCode, IronClaw, Warp ADE â€?are the swappable surfaces per the manifest; some are represented in this repository as the corresponding code paths (for example, OpenCode's local coding assistant), and others (for example, OpenSpace's shared team state) live in the cubecloud.io product line outside this repository.  `[SRC: homepage graph, with SRC: manifest page for the "swappable surfaces" claim, and SRC: user, 2026-06-08 for the desktop-vs-team scope split]`

Concretely, this repository contains:

- **The agent runtime** â€?the headless agent control plane in `agent-desktop/src/main/` and the renderer surface in `agent-desktop/src/renderer/`. Each agent is a long-lived process with a defined role, a memory store, and a skills bundle.
- **The skills bundles** â€?the `.agents/skills/**/SKILL.md` packs and the in-app skills registry that lets an agent load a workflow bundle on demand. The same packs are mirrored at the desktop layer (`agent-desktop/.agents/skills/`) for the in-app agent runtime.
- **The per-user data layer** â€?memory, kanban, schedules, skills registry, and Headroom config (when used), persisted locally in the user's own `desktop.json` (paths resolved at runtime by the desktop shell). No telemetry, no remote sync, no account system.
- **The desktop shell** â€?the Electron application that runs on the operator's own machine.
- **The i18n layer** â€?8 locales (en, es, id, ja, pt-BR, pt-PT, zh-CN, zh-TW), with en + zh-CN as the source-of-truth locales and the others falling back to en.
- **The Headroom workflow layer** â€?a developer aid for token-context compression; not a runtime dependency of the agent.
- **The docs** â€?the V2.10.x history, the brand-license provenance, the inner / outer doc mirror layer, and the manifest of what's live vs. scratch vs. mirror.

---

## What this repo is, and what it is not

### What this repo is

- The **source-available view of Cubecloud OS**, per the manifest's positioning: an open-source operating layer with swappable surfaces.
- The **desktop / individual-operator surface** of Cubecloud OS: the place where an individual user runs, configures, and audits their agents and skills, on their own hardware, without phoning home.
- A **monorepo** for the Cubecloud OS desktop application: the Electron shell, the in-app agent runtime, the i18n layer, the Headroom workflow layer, the skill packs, the docs, and the per-user data layer.
- The **canonical home for the cubecloud.io V2.10.x history**, including release notes, brand-license provenance, and the inner / outer doc mirror layer. `BRANDING_AND_LICENSE.md` is the V2.x changelog of record.

### What this repo is not

- **Not the only implementation of Cubecloud OS.** The contract is what the cubecloud.io manifest specifies â€?an open-source operating layer with swappable surfaces. This repository is one implementation. Other cubecloud.io deployments (for example, a team-server variant) may implement the same contract differently.
- **Not the hosted inference layer.** This repo runs agents that *call* inference, but the inference itself (local GGUF, OpenAI-compatible API, etc.) is a configuration decision made by the operator, not a hard-coded one. The "no cloud API fees" commitment is at the *product* level (Cubecloud OS does not charge per-token); at the *repo* level, the operator is always free to choose their own inference backend.
- **Not the team-deployment surface.** The desktop / individual-operator surface lives in this repo. The team / shared surface of any sub-component that has one (for example, OpenSpace's shared team state) lives outside this repository in the cubecloud.io product line.
- **Not a marketing site.** The cubecloud.io website is the canonical public statement of cubecloud.io's positioning. This `ABOUT.md` is a developer-facing description of the operating-system source tree within that positioning; for sales, demos, hardware options, and partnership, see the website.

---

## How the desktop repo maps to the homepage graph

| Homepage graph entity | Operationalized in this repo as |
|---|---|
| **OpenSpace** *(team control panel)* | Partial â€?the desktop-side surface is in this repo; the shared team state lives in the cubecloud.io product line.  `[SRC: demos page, with SRC: user, 2026-06-08 for the desktop-vs-team split]` |
| **Open WebUI** *(private AI workspace)* | The chat / retrieval / tool-use surface in `agent-desktop/src/renderer/src/`. Integrations with Ollama, llama.cpp, LM Studio.  `[SRC: demos page]` |
| **Hermes** *(memory, schedule, subagents)* | `agent-desktop/src/main/hermes*` and the in-app memory / schedule / subagent registry.  `[SRC: demos page, with repo audit]` |
| **OpenCode** *(local coding assistant)* | `agent-desktop/src/renderer/src/screens/OpenCode/`.  `[SRC: demos page, with repo audit]` |
| **IronClaw** *(security, vault, TEE)* | The vault / TEE / egress-control surface in `agent-desktop/src/main/ironclaw*`.  `[SRC: demos page, with repo audit]` |
| **Warp ADE** *(multi-agent coding workspace)* | The agent control plane in `agent-desktop/src/main/headroom*` and the renderer surface in `agent-desktop/src/renderer/src/screens/Headroom/`. Warp ADE is the multi-agent workspace; the repo's Headroom screen is its desktop / individual-operator surface.  `[SRC: demos page, with SRC: user, 2026-06-08 for the surface-mapping]` |
| **ADE** *(general category of agentic-development surfaces)* | ADE is the **general category** of agentic-development surfaces in Cubecloud OS. Warp ADE is the *current instance*; the category is swappable per the manifest's "surfaces can be added, removed, or swapped freely" principle, so future ADEs (other agentic-development surfaces) can replace Warp ADE without changing the underlying slot. The Headroom / agent control plane in this repository is the desktop / individual-operator surface for whatever ADE is currently bound.  `[SRC: homepage graph, with SRC: demos page for Warp ADE's description, SRC: manifest page for the swappable-surfaces principle, and SRC: user, 2026-06-08 for the ADE-as-category framing]` |
| **Agents** runtime category | The agent control plane in `agent-desktop/src/main/headroom*.ts`, the renderer surface in `agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`, the headless agent control plane in `apps/desktop-shell/`.  `[SRC: homepage graph, with repo audit]` |
| **Skills** runtime category | `.agents/skills/**/SKILL.md` and the desktop mirror at `agent-desktop/.agents/skills/**/SKILL.md`.  `[SRC: homepage graph, with repo audit]` |
| **Data** runtime category | Per-user JSON config in the user's `desktop.json` (paths resolved at runtime by the desktop shell).  `[SRC: homepage graph, with repo audit]` |
| **Local PC Hardware** substrate | The Electron app's runtime model â€?the desktop shell runs on the operator's own machine, the agent control plane runs as a long-lived process on the same machine, no remote server is required. The four supported hardware SKUs (Mini AIPC, NEX-AI + iGPU bundle, ColorFire MEOW AI laptop, ColorFire AI MODT workstation) are listed in the [hardware lineup](#the-hardware-lineup) section above.  `[SRC: hardware page]` |

The mapping is concrete: every homepage-graph entity is either implemented in this repo as a specific code path, or is named in the cubecloud.io product line outside the repo. The audit for "what is in this repo" is `git log` + `git grep`; the audit for "what is outside this repo" is the cubecloud.io product line.

---

## Status and roadmap

- **License**: AGPL-3.0-only, matching cubecloud.io.  `[SRC: footer]`
- **Trademarks**: Cubecloud, æ™ºæ–¹äº? and cubecloud.io are reserved trademarks of Cubecloud Limited Company. Use of these marks in forks, derivatives, or downstream distributions is governed by `BRANDING_AND_LICENSE.md` and the cubecloud.io footer.  `[SRC: footer]`
- **Versioning**: This repository follows the cubecloud.io V2.10.x versioning. The current shipped state is V2.10.36 (inner doc retirement) + V2.10.37 (.gitignore hardening at first push). See `BRANDING_AND_LICENSE.md` and `docs/RETIRED_AND_LEGACY.md` for the full version history.
- **Commercial context**: The repository is part of the cubecloud.io product line, which is structured per the materials page as Phase 1 (services) â†?Phase 2 (SaaS) â†?Phase 3 (OEM). The repository itself is the source-available view of the operating layer; the commercial phasing is for the cubecloud.io business, not for this repo's contribution cadence.  `[SRC: materials page]`
- **For business inquiries**: deployment, pilot rollouts, partnerships, hardware options, demos, materials, and the business plan are at `https://www.cubecloud.io/materials` and `https://www.cubecloud.io/manifest`.  `[SRC: homepage nav]`

---

## How to read this repository

If you are **a developer evaluating cubecloud-agentic-os for use or contribution**, start here:

1. `README.md` â€?the marketplace framing, the 8-locale support, the conceptual model (object + action).
2. `BRANDING_AND_LICENSE.md` â€?the V2.x history and the brand-license provenance. Required reading if you intend to fork, rebrand, or distribute.
3. `docs/HANDBOOK.md` â€?the master handbook; architecture, development, operations.
4. `docs/RETIRED_AND_LEGACY.md` â€?what is live, what is scratch, what is mirror.
5. `agent-desktop/` â€?the desktop shell, with its own `README.md`, `AGENTS.md`, and `docs/` mirror.
6. `.agents/skills/` and the desktop mirror at `agent-desktop/.agents/skills/` â€?the skill packs available to the in-app agent.
7. For what each surface (OpenSpace, Open WebUI, IronClaw, Hermes, Warp ADE, OpenCode) does in practice, see `https://www.cubecloud.io/demos`.  `[SRC: demos page]`

If you are **a customer evaluating cubecloud.io**, this repository is one component. The full product lineup, demos, hardware options, materials, and business plan are at `https://www.cubecloud.io`.

---
