<p align="center">
  <img width="540" alt="Cubecloud 智方云" src="agent-desktop/build/branding/cubecloud-zhifangyun.svg" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0%20%7C%20Apache--2.0%20%7C%20MIT-blue?style=for-the-badge" alt="License: AGPL-3.0 OR Apache-2.0 OR MIT (Cubecloud-original work); MIT (inherited framework)" /></a>
  <a href="docs/legal/TRADEMARK_POLICY.md"><img src="https://img.shields.io/badge/Trademark-policy-lightgrey?style=for-the-badge" alt="Trademark policy" /></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-policy-lightgrey?style=for-the-badge" alt="Security policy" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/Contributing-DCO%201.1-lightgrey?style=for-the-badge" alt="Contributing: DCO 1.1" /></a>
  <a href="ACKNOWLEDGMENTS.md"><img src="https://img.shields.io/badge/Acknowledgments-read-lightgrey?style=for-the-badge" alt="Acknowledgments" /></a>
</p>

# Cubecloud Agentic-OS

**[English](README.md)** · [简体中文](README.zh-CN.md) · [日本語](README.ja-JP.md) · [한국어](README.ko-KR.md)

> **A local-first agent desktop and operating model for teams that want portability, auditability, and lower AI operating cost.**
> Cubecloud gives builders one control plane for runtimes, providers,
> skills, memory, schedules, and optional code intelligence - without
> turning the user's machine into a thin client for a hosted wrapper.

Cubecloud Agentic-OS is the monorepo for the **Cubecloud Agent Desktop**
and the operating model around it. The desktop binary lives in
[`agent-desktop/`](agent-desktop/). The Cubecloud-original control
plane, prelaunch bundle, and developer-time skill ecosystem live in
[`apps/desktop-shell/`](apps/desktop-shell/),
[`packages/platform-core/`](packages/platform-core/), and
[`.agents/`](.agents/).

The short version:

- Keep prompts, skills, memory, and runtime choices in files, SQLite, and explicit local contracts.
- Use local runtimes for routine loops and reserve paid remote inference for the turns that deserve it.
- Swap runtimes and providers without rewriting the operating model.
- Give developers and operators one desktop instead of a pile of CLIs, browser tabs, and vendor dashboards.

## Preview

A curated subset of the desktop surfaces — what a first-time reader
should see before reading the architecture sections. Every image is a
full-page capture from the current desktop build. The full 22-image
gallery (onboarding, runtime discovery, and every major operator
surface exposed in the sidebar) lives at
[`agent-desktop/README.md`](agent-desktop/README.md#preview).

<table>
<tr>
<td width="50%" align="center"><b>Welcome &amp; first-run</b><br/><img width="100%" alt="Welcome" src="agent-desktop/previews/welcome.png" /></td>
<td width="50%" align="center"><b>Runtime detection</b><br/><img width="100%" alt="Runtime detection" src="agent-desktop/previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Chat</b><br/><img width="100%" alt="Chat" src="agent-desktop/previews/chat.png" /></td>
<td width="50%" align="center"><b>Profiles &amp; agents</b><br/><img width="100%" alt="Agents" src="agent-desktop/previews/agents.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Gateway (16 platforms)</b><br/><img width="100%" alt="Gateway" src="agent-desktop/previews/gateway.png" /></td>
<td width="50%" align="center"><b>Settings &amp; control</b><br/><img width="100%" alt="Settings" src="agent-desktop/previews/settings.png" /></td>
</tr>
</table>

## Why teams adopt Cubecloud

Cubecloud is for teams that want the convenience of a desktop product
without giving up the control surface of a self-directed stack.

| Outcome | How Cubecloud gets there |
|---|---|
| Faster first useful session | A prelaunch bundle ships memory seeds, disabled harnesses, a disabled schedule, and a starter kanban board so the first launch is not an empty shell. |
| Lower operating cost | Local-first lanes handle drafting, retrieval, orchestration, and iteration on already-paid hardware; remote frontier models stay optional. |
| Lower vendor risk | Runtime choice and provider choice are separate decisions, so a model or vendor change is a reconfiguration event instead of a rewrite event. |
| More reproducible operator workflows | Skills, schedules, provider definitions, and state live in inspectable files, SQLite, and explicit IPC surfaces rather than in a hosted black box. |
| Cleaner procurement and legal review | Cubecloud-original work is available under AGPL-3.0-or-later, Apache-2.0, or MIT, while inherited framework code remains MIT and documented path-by-path. |

## Why local-first wins

Local-first here is not a marketing adjective. It changes where the
control plane lives, how costs accumulate, and how much of the system a
team can inspect when something goes wrong.

| Decision area | Hosted wrapper default | Cubecloud local-first model |
|---|---|---|
| Control plane | Vendor account, vendor UI, vendor retention loop | Native desktop under the local user's control |
| Cost shape | Seat fee + token fee + wrapper economics | Local hardware for routine work, remote spend only where it adds value |
| State and provenance | History and orchestration live primarily in the hosted product | Prompts, skills, schedules, and memory remain inspectable and reproducible |
| Runtime change | Often means switching products or accepting vendor abstraction limits | Runtime picker keeps the operating surface stable while runtimes evolve |
| Provider change | Usually vendor-first, sometimes BYOK second | Provider layer is explicit and separate from runtime choice |
| Failure recovery | Wait for vendor fixes or inspect partial logs | Inspect local state, logs, config, and IPC boundaries directly |

**BYOK is a procurement control. Local-first is an operating model.**
BYOK changes whose bill arrives. Local-first changes how much billable
remote work the workflow requires in the first place.

## Who this is for

Cubecloud is a strong fit for:

- Teams building internal agent tooling that still needs security review, provenance, and rollback paths.
- Consultancies and platform teams that need to ship per-client agent stacks without coupling every deployment to the same hosted wrapper.
- Developers who want desktop convenience without giving up local runtime control.
- Cost-sensitive operators who want to keep iterative work local and use remote models selectively.

It is a weak fit if you want a pure browser product, a hosted SaaS
control plane, or a model vendor to own your runtime lifecycle for you.

## What ships in this repo

This monorepo is broader than the desktop binary alone.

- [`agent-desktop/`](agent-desktop/) is the full Electron desktop that ships to end users.
- [`apps/desktop-shell/`](apps/desktop-shell/) is the Cubecloud-original state and control-plane workspace.
- [`packages/platform-core/`](packages/platform-core/) holds shared TypeScript contracts.
- [`.agents/skills/`](.agents/skills/) contains 34 first-class open-source skills adapted from 7 upstream repos and mirrored to `~/.agents/skills/`.
- [`.github/skills/headroom-workflow/`](.github/skills/headroom-workflow/) is a repo-authored Copilot / VS Code workflow layer for the optional Headroom context-compression proxy. The standalone install/use guide lives at [`docs/agent-skills-bundle/HEADROOM.md`](docs/agent-skills-bundle/HEADROOM.md).
- [`docs/`](docs/) holds the handbook, threat model, runtime plans, legal policies, and transition history.

On first launch, the desktop gives the user:

- A native Electron desktop built with React 19, i18next, Vite, and electron-builder.
- A multi-runtime picker: Hermes today, with OpenClaw and IronClaw planned as additional lanes.
- A provider layer that can talk to local providers such as Ollama, vLLM, and llama.cpp or remote OpenAI-compatible APIs.
- Three user-visible first-launch skills: `cubecloud-persona`, `cubecloud-onboarding`, and `cubegraph-code-intel`.
- A prelaunch operating context with seeded memories, harness placeholders, a schedule placeholder, and a starter kanban board.
- Optional CodeGraph and EverOS integrations that are user-initiated, not silently installed.

What it does **not** do:

- It is **not** a model server; it consumes runtime and provider protocols instead of bundling inference.
- It is **not** a hosted IDE; the desktop is the local control surface.
- It is **not** a single-vendor wrapper; runtime choice, provider choice, and skill assets stay portable.

## Market position

Cubecloud is not trying to be the best cloud copilot, the best vendor CLI,
or the best demo app template. It is aimed at a different buyer: the team
that cares most about control, portability, and unit economics.

| Market option | Strong at | Constraint | Cubecloud position |
|---|---|---|---|
| Cloud IDE copilots such as Cursor or GitHub Copilot agents | Fast hosted coding loops and deep IDE assistance | Cloud-default state, seat economics, and a more vendor-centric control plane | Cubecloud centers a local desktop operator and keeps runtimes, providers, and skill assets swappable |
| Single-vendor CLIs such as Claude Code or Codex CLI | Strong terminal-native loops for a specific vendor stack | Terminal-first UX and narrower runtime portability | Cubecloud offers a GUI-first control plane with a portable runtime and provider model |
| Reference repos and quickstarts | Learning, demos, and fast prototyping | Not an opinionated operating surface or long-lived operator workflow | Cubecloud ships a real desktop workflow, a handbook, seeded context, and a documented provenance posture |
| BYOK wrappers | Easier procurement conversations | Often still wrapper-seat economics on top of token costs | Cubecloud uses local-first design to reduce how much of the workflow needs paid remote inference at all |

The strategic point is simple: many competitors optimize for **vendor
depth**. Cubecloud optimizes for **operator control**.

## Built for production-minded teams

Production-ready in Cubecloud's sense does not mean "hosted SaaS with a
sales dashboard." It means the core operating surfaces are explicit,
inspectable, and replaceable.

- **Explicit trust boundary.** The renderer is sandboxed, IPC channels are explicit, outbound networking is opt-in, and inbound networking is opt-in on a user-supplied port. See [`SECURITY.md`](SECURITY.md) and [`THREAT_MODEL.md`](THREAT_MODEL.md).
- **Predictable state.** Profiles, sessions, provider definitions, memories, schedules, and kanban state live in durable local state rather than in an opaque hosted workflow layer.
- **Replaceable dependencies.** Runtime choice and provider choice are separated so teams can migrate, stage, or roll back without collapsing the whole user workflow.
- **Optional sidecars stay optional.** CodeGraph and EverOS expand the system when needed, but they do not become mandatory hidden dependencies.
- **Versioned methodology.** The 34-skill ecosystem is documented, provenance-tracked, and supported by a red-baseline discipline inherited from the upstream skill process.
- **Clear legal surface.** The repo documents path-level provenance, trademark posture, commercial-relicensing policy, and the inherited-framework carve-out in one place. See [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) and [`docs/legal/`](docs/legal/).

That is the enterprise story: not "trust us," but "inspect the stack."

## Architecture at a glance

The desktop experience is built from six cooperating surfaces:

- **State layer** - [`apps/desktop-shell/src/main/agentControlPlane.ts`](apps/desktop-shell/src/main/agentControlPlane.ts) owns profiles, sessions, models, providers, skills, memory, schedules, and kanban state.
- **Runtime orchestration** - [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](docs/RUNTIME_ORCHESTRATION_PLAN.md) describes Hermes as the current lane and OpenClaw / IronClaw as the next lanes.
- **Provider layer** - [`apps/desktop-shell/src/main/providerDiscovery.ts`](apps/desktop-shell/src/main/providerDiscovery.ts) keeps model-provider selection separate from runtime selection.
- **Skills harness** - [`agent-desktop/src/main/skills-harness.ts`](agent-desktop/src/main/skills-harness.ts) applies the skill layer around outgoing requests.
- **CodeGraph surface** - [`docs/CODEGRAPH-RUNTIME.md`](docs/CODEGRAPH-RUNTIME.md) explains the optional semantic code-intelligence path.
- **EverOS sidecar** - [`docs/EVEROS-SIDECAR.md`](docs/EVEROS-SIDECAR.md) explains the optional memory and harness sidecar lifecycle.

### Conceptual model (V2.10.35)

Cubecloud's local surfaces map cleanly to a small **object + action**
model that is conceptually similar to what Palantir's Foundry calls an
"ontology" for the enterprise, but **scoped down to one operator's
desk**:

- **Objects (nouns)** are the durable things the agent operates on:
  profiles, sessions, models, providers, skills, memories, tools,
  schedules, and kanban tasks. They are persisted as explicit JSON
  registries under the user's control, not as opaque blobs in a
  hosted workflow engine.
- **Actions (verbs)** are the things the agent does to those objects:
  dispatch a chat turn, run a scheduled prompt, commit a learned
  proposal, apply a CodeGraph query result, or revert an `AGENTS.md`
  edit. The dispatch ledger in
  [`agentControlPlane.ts`](apps/desktop-shell/src/main/agentControlPlane.ts)
  is the action log; the `headroom learn --apply` review flow is
  the **branch-and-review** gate that prevents AI from writing to
  the ontology without an explicit human action.
- **Operator scope.** Foundry's ontology is a digital twin of an
  organization; Cubecloud's is a digital twin of a single desk.
  This is a deliberate scale difference, not a missing feature.
  The same noun/verb structure scales down to a prosumer and small-
  business operator without forcing them to pay for a multi-tenant
  platform they do not need.

The point of stating the model explicitly is so a new contributor can
map any future feature to either "this is a new object" or "this is a
new action" and place it in the right layer of the architecture. The
implementation still uses hand-rolled JSON registries; a future
hardening pass can collapse them into a single typed registry without
changing the conceptual contract.

### Optional: Headroom context compression

The desktop's runtime is the user's choice; the cost of using it is also
the user's choice. As an additive layer, Cubecloud ships a
repo-authored workflow skill at
[`.github/skills/headroom-workflow/`](.github/skills/headroom-workflow/)
that guides a Copilot / VS Code session through the
[`headroom-ai`](https://github.com/JZKK720/headroom) context-compression
proxy when the local token pressure is high (large tool logs, long
chat histories, big CodeGraph bundles). The full install path for
non-repo Copilot sessions —including the `headroom proxy`,
`headroom mcp install`, and `headroom wrap copilot` modes —lives at
[`docs/agent-skills-bundle/HEADROOM.md`](docs/agent-skills-bundle/HEADROOM.md).
A one-command helper for mirroring the workflow skill into the
user-global Copilot skills directory is at
[`docs/agent-skills-bundle/install-headroom-workflow.cmd`](docs/agent-skills-bundle/install-headroom-workflow.cmd).
Headroom is **never required**: the desktop is fully functional
without it.

## Where to start

- **New contributor:** read [`docs/HANDBOOK.md`](docs/HANDBOOK.md) sections 1, 2, 3, and 5.
- **Evaluator of the shipped desktop:** read [`agent-desktop/README.md`](agent-desktop/README.md), then [`docs/HANDBOOK.md`](docs/HANDBOOK.md) sections 1, 3, and 10.
- **Reviewer or release owner:** read [`docs/HANDBOOK.md`](docs/HANDBOOK.md) sections 1, 3, 4, 6, 9, 10, and 11 in that order.

## Repository layout

```
cubecloud-agentic-os/
├── README.md                     this monorepo README
├── LICENSE                       Cubecloud-original work: AGPL-3.0-or-later / Apache-2.0 / MIT
├── NOTICE                        third-party attribution catalog
├── BRANDING_AND_LICENSE.md       licensing, provenance, and transition history
├── CONTRIBUTING.md               DCO 1.1 contribution contract
├── SECURITY.md                   security policy and reporting
├── THREAT_MODEL.md               local-first threat model
├── README.i18n.md                translation inventory manifest
├── .agents/                      34 open-source skills mirrored to ~/.agents/skills/
├── .github/                      agent instructions, workflow skills, and automation
├── apps/
│   └── desktop-shell/            Cubecloud-original control plane workspace
├── packages/
│   └── platform-core/            shared TypeScript contracts
├── docs/
│   ├── HANDBOOK.md               master handbook
│   ├── RETIRED_AND_LEGACY.md     live / mirror / scratch-pad map
│   ├── handbook/                 long-form architecture, development, and operations docs
│   └── legal/                    EULA, trademark, and commercial licensing policies
├── scripts/
│   ├── sync-docs.ps1             hardlink and junction regeneration
│   └── v2.10.20-readme-combined-pdf.cjs
└── agent-desktop/            the shipped Electron desktop
```

## License

Cubecloud-original work is available under **AGPL-3.0-or-later,
Apache-2.0, or MIT**. AGPL-3.0-or-later is the primary license.
Apache-2.0 and MIT are compatibility options for downstream consumers
whose house policy already centers one of those licenses. Inherited
`hermes-desktop` framework code remains MIT under its upstream terms.

See [`LICENSE`](LICENSE), [`NOTICE`](NOTICE),
[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md), and
[`docs/legal/`](docs/legal/) for the per-path breakdown.

## Contributing

Inbound contributions follow the **DCO 1.1** sign-off model. Every
commit must include a `Signed-off-by:` line. See
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the contract.

The skills layer is a primary contributor workflow surface. A new skill
typically goes through `gbrain-skillify`, `ecc-skill-scout`,
`po-write-a-skill`, and `sp-write-skill`, with a red-baseline test to
prove the behavior is worth keeping.

If you find a bug or have a feature request, [file an issue](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new).
For security issues, follow [`SECURITY.md`](SECURITY.md) and do not post
secrets, API keys, or private logs in public issues.

## Translations

The monorepo now ships:

- Simplified Chinese translations for [`README.zh-CN.md`](README.zh-CN.md), [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md), [`SECURITY.zh-CN.md`](SECURITY.zh-CN.md), [`THREAT_MODEL.zh-CN.md`](THREAT_MODEL.zh-CN.md), [`docs/HANDBOOK.zh-CN.md`](docs/HANDBOOK.zh-CN.md), [`docs/handbook/`](docs/handbook/) leaf docs, and [`docs/RETIRED_AND_LEGACY.zh-CN.md`](docs/RETIRED_AND_LEGACY.zh-CN.md).
- Japanese and Korean outer README starting points at [`README.ja-JP.md`](README.ja-JP.md) and [`README.ko-KR.md`](README.ko-KR.md).

The translation inventory lives in [`README.i18n.md`](README.i18n.md).
The combined English + Simplified Chinese README PDF lives at
[`docs/Cubecloud-README-en-zh.pdf`](docs/Cubecloud-README-en-zh.pdf).

Binary-facing translations still live under `agent-desktop/`.
If you want to polish the current translations or extend the monorepo to additional languages, follow the workflow in [`README.i18n.md`](README.i18n.md).
