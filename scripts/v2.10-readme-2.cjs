// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// scripts/v2.10-readme-2.cjs \u2014 second pass at the README split.
// The hardlink has been broken (outer is now a regular file, inner is
// gone). Now write the two different README contents.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUTER_README = path.join(ROOT, 'README.md');
const INNER_README = path.join(ROOT, 'agent-desktop', 'README.md');
const EM = '\u2014';

const outerReadme = `<p align="center">
  <img width="360" alt="Cubecloud Agentic-OS" src="build/branding/cubecloud-logo.svg" />
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0%20%7C%20Apache--2.0%20%7C%20MIT-blue?style=for-the-badge" alt="License: AGPL-3.0 OR Apache-2.0 OR MIT (Cubecloud-original work); MIT (inherited framework)" /></a>
  <a href="docs/legal/TRADEMARK_POLICY.md"><img src="https://img.shields.io/badge/Trademark-policy-lightgrey?style=for-the-badge" alt="Trademark policy" /></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-policy-lightgrey?style=for-the-badge" alt="Security policy" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/Contributing-DCO%201.1-lightgrey?style=for-the-badge" alt="Contributing: DCO 1.1" /></a>
  <a href="ACKNOWLEDGMENTS.md"><img src="https://img.shields.io/badge/Acknowledgments-read-lightgrey?style=for-the-badge" alt="Acknowledgments" /></a>
</p>

# Cubecloud Agentic-OS

> **A local-first, multi-runtime, skills-aware agent operating system for the desktop.**
> Not a chatbot wrapper. Not a hosted IDE. A self-hosted control surface where
> the user owns the runtime, the model, the data, and the skills ${EM} and the
> desktop is the front door to all of it.

## What this is

Cubecloud Agentic-OS is the monorepo for the **Cubecloud Agent Desktop** and
the surrounding ecosystem. The desktop binary lives at
[\`agent-desktop/\`](agent-desktop/) (the full Electron application
that ships to end users); the agentic-OS-original state layer, the
pre-launch seeds, and the developer-time skills ecosystem live at
[\`apps/desktop-shell/\`](apps/desktop-shell/), [\`packages/platform-core/\`](packages/platform-core/),
and [\`.agents/\`](.agents/) respectively. **The desktop is the
front door; the agentic-OS is the operating model.**

What the user gets on first launch:

- A **native desktop** (Electron + React 19 + i18next, Vite + electron-builder) that wraps a local or remote agent runtime in a single GUI so the user does not have to manage the CLI by hand.
- A **multi-runtime picker** ${EM} Hermes today, OpenClaw and IronClaw in V2.6 ${EM} V2.7. The user can run more than one runtime on the same machine (Hermes on \`127.0.0.1:8642\` + OpenClaw on \`127.0.0.1:18789\` + IronClaw on a Docker-published port), and the desktop's runtime picker routes chat requests to the right one.
- A **local-first trust boundary** ${EM} the agent runtime runs in the user's context, the renderer is sandboxed by Electron's standard isolation, IPC channels are explicit and unguessable, outbound network is opt-in, inbound is opt-in on a user-supplied port.
- A **provider layer** that is separate from the runtime layer: Ollama, vLLM, llama.cpp on loopback, **or** any OpenAI-compatible remote API (OpenRouter, Anthropic, OpenAI, Google Gemini, xAI Grok, Nous Portal, Qwen, Hugging Face, Groq, Azure OpenAI, etc.). The local providers are MIT / Apache-2.0; the desktop does not bundle, ship, or install any of them; it only consumes their HTTP protocols.
- A **skills layer of 34 first-class Copilot skills** at [\`.agents/skills/\`](.agents/skills/) (the contributor's surface), of which **3 are promoted to user-visible** at first launch (\`cubecloud-persona\`, \`cubecloud-onboarding\`, \`cubegraph-code-intel\`).
- A **pre-launch bundle** of 6 memory seeds, 3 disabled harnesses, 1 disabled schedule, and 1 starter kanban board ${EM} the user's first session is not an empty state; it is a curated, deletable starting point.
- An optional **CodeGraph** semantic code-intelligence surface (MCP) and an optional **EverOS** sidecar (HTTP, memory + harness). The desktop never auto-installs either; both are user-initiated.

What the user **does not** get, and why:

- It is **not a model server**. The desktop does not host weights, does not run inference, and does not compete with Ollama / vLLM / llama.cpp. It is a *client* of those.
- It is **not a product-only repo**. A substantial fraction of the source tree is inherited from the upstream \`hermes-desktop\` framework (MIT), and the dual-license posture in [\`BRANDING_AND_LICENSE.md\`](BRANDING_AND_LICENSE.md) distinguishes the inherited framework from the Cubecloud-original work.
- It is **not locked in to one vendor**. The user can swap Hermes for OpenClaw, swap OpenAI for Ollama, swap the desktop for a CLI, and keep the skills. The agentic-OS is the operating model, not the brand.

## Why this exists

Three commitments drove the design, in order:

1. **The user should not touch the CLI to use the desktop.** Install, configure, chat, schedule, back up, update ${EM} all of it from the GUI.
2. **The user should not be locked in to one runtime or one provider.** Hermes today, OpenClaw / IronClaw tomorrow; Ollama, vLLM, llama.cpp, OpenRouter, Azure OpenAI today, more tomorrow.
3. **The user should not be locked in to a license they cannot use.** Cubecloud-original work is dual-licensed (AGPL-3.0-or-later primary, Apache-2.0 and MIT as compatibility options); the inherited framework stays MIT; downstream consumers pick the license that fits their house policy.

Three *consequences* fell out of those commitments:

- A **wide IPC surface** (\`agent-desktop/src/main/\`, \`agent-desktop/src/preload/\`) that exposes the runtime, the model registry, the provider registry, the skill manifests, the memory plane, the schedule runner, and the gateway layer to the renderer. That surface is the integration boundary; it is also the largest part of the inherited framework code.
- A **multi-runtime orchestration plan** ([\`docs/RUNTIME_ORCHESTRATION_PLAN.md\`](docs/RUNTIME_ORCHESTRATION_PLAN.md)) that makes Hermes the day-1 lane and adds OpenClaw / IronClaw as additional lanes over the V2.6 ${EM} V2.7 window.
- A **34-skill developer-time ecosystem** at [\`.agents/skills/\`](.agents/skills/) that the developer who *builds* the desktop benefits from, not just the user who *runs* it. The skills are also mirrored to the user-global \`~/.agents/skills/\` directory on developer machines so they auto-activate in *every* Copilot workspace on the same machine, not just \`cubecloud-agentic-os\`.

## What makes this different from other agentic-OS / agent-desktop projects

A short list of how the **agentic-OS model** differs from comparable projects.
This is not a competitive comparison; it is a positioning statement.

| Project | Form factor | Runtime | Provider | Skills | License | Local-first |
|---|---|---|---|---|---|---|
| **Cubecloud Agentic-OS** (this repo) | Native desktop (Electron) | Multi: Hermes, OpenClaw, IronClaw | Any OpenAI-compatible, local + remote | 34 first-class, from 7 upstream repos, mirrored globally | Dual: AGPL-3.0 (primary) / Apache-2.0 / MIT | Yes ${EM} trust boundary is the local user |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) | Terminal / IDE plug-in | Single vendor (Anthropic) | Anthropic API + a few proxies | Skills (recent, smaller ecosystem) | Proprietary | Partial ${EM} cloud-default |
| [Cursor](https://cursor.com/) | IDE fork (VS Code) | Single vendor (proprietary) | OpenAI, Anthropic, Google, etc. | Inline prompts; no public skill repo | Proprietary | No ${EM} cloud-default |
| [GitHub Copilot Coding Agent](https://github.com/features/copilot/agents) | Cloud agent + IDE | Single vendor (GitHub) | OpenAI, Anthropic, Google | Path-specific instructions (\`copilot-instructions.md\`) | Proprietary | No |
| [Claude Quickstarts](https://github.com/anthropics/anthropic-quickstarts) | Reference code, not a product | Single vendor (Anthropic) | Anthropic API | N/A (reference apps) | MIT | Reference only |
| [ChatGPT Atlas](https://chatgpt.com/atlas) | Browser | Single vendor (OpenAI) | OpenAI API | Limited | Proprietary | No |
| [Codex CLI](https://github.com/openai/codex) | Terminal | Single vendor (OpenAI) | OpenAI API | Skills (early) | Apache-2.0 | Partial |

The **differentiators** fall into four buckets:

1. **Multi-runtime, not single-vendor.** No other agent-desktop project today (June 2026) ships a runtime picker; the user is locked in to the vendor that wrote the wrapper. Cubecloud adds OpenClaw and IronClaw as first-class lanes over the V2.6 ${EM} V2.7 window. See [\`docs/RUNTIME_ORCHESTRATION_PLAN.md\`](docs/RUNTIME_ORCHESTRATION_PLAN.md).
2. **Skills as a first-class artifact.** Most projects treat skills / slash-commands / system-prompt snippets as ad-hoc strings. Cubecloud's 34-skill ecosystem is a **versioned directory** with name+description frontmatter, a Description Trap (no process summary in the description), a red-baseline pressure test per skill, and a global mirror to \`~/.agents/skills/\` so the skills auto-activate in *every* Copilot workspace. This is the contribution of [\`superpowers\`](https://github.com/JZKK720/superpowers)'s TDD-for-skills discipline, plus 7 upstream skill repos (autoresearch, poskills, ECC, gbrain, gstack, andrej-karpathy-skills).
3. **Local-first trust boundary.** Outbound network is opt-in, inbound network is opt-in on a user-supplied port, IPC channels are explicit and unguessable, the renderer is sandboxed, no telemetry, no analytics call, no remote attestation. See [\`SECURITY.md\`](SECURITY.md) and [\`THREAT_MODEL.md\`](THREAT_MODEL.md).
4. **Dual-license with inherited-MIT carve-out.** Cubecloud-original work is available under AGPL-3.0-or-later (primary), Apache-2.0, or MIT ${EM} the user picks the one that fits their house policy. The inherited \`hermes-desktop\` framework code stays hard-MIT under the upstream terms. See [\`BRANDING_AND_LICENSE.md\`](BRANDING_AND_LICENSE.md) and [\`LICENSE\`](LICENSE).

## Hybrid technical abilities and agent efficiencies

The agentic-OS model is **hybrid** in the sense that the desktop binary
combines six distinct technical surfaces, and the user-visible agent
experience benefits from each one. The shape:

- **State layer** ([\`apps/desktop-shell/src/main/agentControlPlane.ts\`](apps/desktop-shell/src/main/agentControlPlane.ts)) ${EM} the Cubecloud-original SQLite + dispatch logic that owns the user's profiles, sessions, models, providers, skills, memory, schedules, and kanban. The renderer talks to this through IPC, not directly to a database.
- **Runtime orchestration** ([\`agent-desktop/src/main/hermes-runtime/\`](agent-desktop/src/main/hermes-runtime/), \`.../openclaw/\`, \`.../ironclaw/\`) ${EM} the multi-runtime picker. Each runtime has a detection / install / configure / proxy flow; the user can pick from a runtime picker, not from a CLI flag.
- **Provider layer** ([\`apps/desktop-shell/src/main/providerDiscovery.ts\`](apps/desktop-shell/src/main/providerDiscovery.ts)) ${EM} separate from the runtime layer. A runtime (Hermes) talks to a provider (Ollama, vLLM, llama.cpp, OpenAI-compatible remote, etc.). The user can save, name, and switch between models across providers.
- **Skills harness** ([\`agent-desktop/src/main/skills-harness.ts\`](agent-desktop/src/main/skills-harness.ts)) ${EM} the agent-runtime skills layer, with HIDDEN_SKILLS[] for flavors (tone, cost, license) that wrap every outgoing request.
- **CodeGraph surface** ([\`agent-desktop/src/main/codegraph-runtime.ts\`](agent-desktop/src/main/codegraph-runtime.ts)) ${EM} two backends for the CodeGraph screen: a CLI subprocess (inherited) and an embedded SDK wrapper (Cubecloud-original). See [\`docs/CODEGRAPH-RUNTIME.md\`](docs/CODEGRAPH-RUNTIME.md).
- **EverOS sidecar** ([\`agent-desktop/src/main/everos-sidecar.ts\`](agent-desktop/src/main/everos-sidecar.ts)) ${EM} lifecycle manager for the optional \`everos server start\` Python sidecar. The 3 disabled harnesses in the pre-launch bundle (\`cubecloud-memory-distill\`, \`cubecloud-cost-watchdog\`, \`cubecloud-skill-audit\`) are the user-visible face of this. See [\`docs/EVEROS-SIDECAR.md\`](docs/EVEROS-SIDECAR.md).

The **agent efficiencies** are what the developer-time skills ecosystem
contributes, and the 14 \`sp-*\` skills from [\`superpowers\`](https://github.com/JZKK720/superpowers) are the spine:

- **\`sp-skill-first\`** ${EM} every message, the agent checks for relevant skills before responding. This is the bootstrap of the methodology.
- **\`sp-tdd\`** + **\`po-tdd\`** ${EM} every code change is RED-GREEN-REFACTOR, with a red-baseline pressure test in [\`tests/red-baseline.md\`](.agents/skills/) per skill.
- **\`sp-debug\`** + **\`po-diagnose\`** ${EM} when something is broken, the 4-phase root-cause process: reproduce \u2192 hypothesise \u2192 instrument \u2192 fix with regression test.
- **\`sp-plan\`** + **\`gstack-plan-{ceo,eng,design}-review\`** ${EM} once the design is approved, the bite-sized task plan; once the plan is approved, the stress-test review from the CEO / tech-lead / design-reviewer angle.
- **\`sp-execute\`** / **\`sp-subagents\`** / **\`sp-parallel\`** ${EM} run the plan (sequential, parallel-fan-out for execution, or parallel-fan-out for one-off research).
- **\`sp-verify\`** ${EM} "is this done?" requires evidence (the red test, the user-facing behavior, the smoke-test green), not intent.
- **\`sp-request-review\`** / **\`sp-receive-review\`** ${EM} pre-review checklist before hand-off; triage, fix, defend, push back after.
- **\`sp-finish-branch\`** / **\`sp-worktree\`** ${EM} isolated worktree on a clean baseline; verify, present the 4 options (merge / PR / keep / discard), clean up.

The methodology is **enforced by the description contract, not by the
user's manual invocation**. Each skill's \`description\` is *trigger-only*
(per the Description Trap): no process summary in the description, so
the agent reads the body to learn the process. The V2.8 audit trimmed
all 34 skills' descriptions to trigger-only. This is the contribution of
the upstream [\`superpowers\`](https://github.com/JZKK720/superpowers) repo,
adapted as \`sp-*\` with full MIT provenance.

## Where to look next

You have arrived at one of three places:

- **You are a new contributor.** Read [\`docs/HANDBOOK.md\`](docs/HANDBOOK.md) \u00a71 \u2192 \u00a72 \u2192 \u00a73, then \u00a75 (\"Skills layer\") to find the work patterns. Skip \u00a74 on the first pass.
- **You are a downstream user evaluating the desktop.** Read [\`docs/HANDBOOK.md\`](docs/HANDBOOK.md) \u00a71 \u2192 \u00a73.1, then \u00a710 (\"License / brand\") to understand what you can and cannot do with the binary. The install + features doc for the binary is at [\`agent-desktop/README.md\`](agent-desktop/README.md).
- **You are doing a code review, a security review, or a release.** Read [\`docs/HANDBOOK.md\`](docs/HANDBOOK.md) \u00a71, \u00a73, \u00a74, \u00a76, \u00a79, \u00a710, \u00a711 in that order.

## Repository layout

\`\`\`
cubecloud-agentic-os/                       ${EM} the monorepo
\u251c\u2500\u2500 README.md                    (this file)
\u251c\u2500\u2500 LICENSE                       Cubecloud-original: AGPL-3.0-or-later / Apache-2.0 / MIT
\u251c\u2500\u2500 NOTICE                        REUSE-compliant third-party attribution catalog
\u251c\u2500\u2500 BRANDING_AND_LICENSE.md      per-version legal transitions (V2.3 \u2192 V2.10)
\u251c\u2500\u2500 CONTRIBUTING.md              DCO 1.1 sign-off model
\u251c\u2500\u2500 ACKNOWLEDGMENTS.md           human-readable upstream credits
\u251c\u2500\u2500 SECURITY.md                  supported versions, vulnerability reporting
\u251c\u2500\u2500 THREAT_MODEL.md              local-user-first threat model
\u251c\u2500\u2500 .gitattributes               LF normalization, link conventions
\u251c\u2500\u2500 .gitignore                   excludes .review-extras/ + .review-codegraph/
\u251c\u2500\u2500 .agents/                     34 skills, mirrored to ~/.agents/skills/
\u251c\u2500\u2500 .github/                     Copilot instructions, workflows
\u251c\u2500\u2500 apps/
\u2502   \u2514\u2500\u2500 desktop-shell/           LIVE @cubecloud/desktop-shell workspace (52 files, 981 KB)
\u2502       \u251c\u2500\u2500 src/main/             agentControlPlane, default{Skills,Memories,Harnesses,Schedules,Kanban}
\u2502       \u251c\u2500\u2500 src/{preload,renderer,shared}/
\u2502       \u2514\u2500\u2500 prelaunchSeed.{smoke.mjs,test.ts}  (smoke 40/40 PASS)
\u251c\u2500\u2500 packages/
\u2502   \u2514\u2500\u2500 platform-core/           shared TS types for the monorepo
\u251c\u2500\u2500 docs/
\u2502   \u251c\u2500\u2500 HANDBOOK.md              master index (\u00a71 \u2192 \u00a711)
\u2502   \u251c\u2500\u2500 RETIRED_AND_LEGACY.md   live / scratch-pad / mirror table
\u2502   \u251c\u2500\u2500 handbook/               per-topic long-form: ARCHITECTURE / DEVELOPMENT / OPERATIONS / README
\u2502   \u251c\u2500\u2500 legal/                  CUBECLOUD-EULA, TRADEMARK_POLICY, COMMERCIAL_LICENSE, etc.
\u2502   \u2514\u2500\u2500 *.md                    RUNTIME_ORCHESTRATION_PLAN, CODEGRAPH-RUNTIME, EVEROS-SIDECAR, etc.
\u251c\u2500\u2500 scripts/
\u2502   \u2514\u2500\u2500 sync-docs.ps1           idempotent doc-link regen (Windows hardlinks + junctions)
\u251c\u2500\u2500 agent-desktop/            the full Electron binary (408 files, 14.8 MB)
\u2502   \u251c\u2500\u2500 README.md              install + features + providers (the binary's user-facing doc)
\u2502   \u251c\u2500\u2500 src/{main,preload,renderer,shared}/
\u2502   \u2514\u2500\u2500 ...                    inherited hermes-desktop framework (MIT) + Cubecloud branding layer
\u2514\u2500\u2500 .review-{extras,codegraph}/   SCRATCH-PAD, .gitignore'd, 177 MB total
\`\`\`

## License

Cubecloud-original work is dual-licensed under your choice of
**AGPL-3.0-or-later, Apache-2.0, or MIT**. The AGPL-3.0-or-later
option is the **primary** license; Apache-2.0 and MIT are offered as
**compatibility** options for downstream consumers whose house license
is one of those. The inherited \`hermes-desktop\` framework code that
hosts the Cubecloud-original modules remains hard-MIT under the
upstream terms.

See [\`LICENSE\`](LICENSE), [\`BRANDING_AND_LICENSE.md\`](BRANDING_AND_LICENSE.md),
[\`NOTICE\`](NOTICE), and [\`docs/legal/\`](docs/legal/) for the per-path
breakdown, the per-version transition history (V2.3 \u2192 V2.10), and the
trademark / EULA / commercial-relicensing policies.

## Contributing

Contributions are welcome! Inbound contributions follow the
**DCO 1.1** sign-off model (every commit must include a
\`Signed-off-by:\` line; see [\`CONTRIBUTING.md\`](CONTRIBUTING.md) for
the contract). The 34-skill ecosystem is the contributor's primary
ergonomics surface; a new skill goes through the \`gbrain-skillify\` gate
(11-axis check), the \`ecc-skill-scout\` search-before-write, the
\`po-write-a-skill\` authoring contract, and the \`sp-write-skill\`
TDD-for-skills discipline with a red-baseline pressure test.

If you find a bug or have a feature request, [file an issue](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new).
For security issues, follow [\`SECURITY.md\`](SECURITY.md) ${EM} please do
not post secrets, API keys, or private logs in public issues.
`;

const innerReadme = `<p align="center">
  <img width="360" alt="Cubecloud Desktop" src="build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agent Desktop ${EM} the binary

> **This is the install + features doc for the desktop binary.** The
> agentic-OS monorepo README lives at
> [\`../README.md\`](../README.md); the master index for *what this is,
> why it is the way it is, and where to look next* lives at
> [\`../docs/HANDBOOK.md\`](../docs/HANDBOOK.md).

Cubecloud Agent Desktop is the native desktop control center for the
Cubecloud Agentic-OS monorepo. It wraps a local or remote agent
runtime in a single GUI so the user does not have to manage the CLI
by hand.

## What the user sees

- A guided first-run install for the agent runtime with progress tracking and dependency resolution
- A **multi-provider** provider picker ${EM} OpenRouter, Anthropic, OpenAI, Google (Gemini), xAI (Grok), Nous Portal, Qwen, MiniMax, Hugging Face, Groq, and **any OpenAI-compatible endpoint** (LM Studio, Atomic Chat, Ollama, vLLM, llama.cpp)
- A **streaming chat UI** with SSE streaming, tool progress indicators, markdown rendering, and syntax highlighting
- **Token usage tracking** ${EM} live prompt/completion token counts and cost display in the chat footer, plus a \`/usage\` slash command
- **22 slash commands** ${EM} \`/new\`, \`/clear\`, \`/fast\`, \`/web\`, \`/image\`, \`/browse\`, \`/code\`, \`/shell\`, \`/usage\`, \`/help\`, \`/tools\`, \`/skills\`, \`/model\`, \`/memory\`, \`/persona\`, \`/version\`, \`/compact\`, \`/compress\`, \`/undo\`, \`/retry\`, \`/debug\`, \`/status\`, and more
- **Session management** ${EM} full-text search (SQLite FTS5), date-grouped history, resume and search across conversations
- **Profile switching** ${EM} create, delete, and switch between separate agent environments with isolated config
- **14 toolsets** ${EM} web, browser, terminal, file, code execution, vision, image gen, TTS, skills, memory, session search, clarify, delegation, MoA, and task planning
- **Memory system** ${EM} view/edit memory entries, user profile memory, capacity tracking, and discoverable memory providers (Honcho, Hindsight, Mem0, RetainDB, Supermemory, ByteRover)
- **Persona editor** ${EM} edit and reset your agent's SOUL.md personality
- **Saved models** ${EM} CRUD management for model configurations across providers
- **Scheduled tasks** ${EM} cron job builder (minutes, hourly, daily, weekly, custom cron) with 15 delivery targets
- **16 messaging gateways** ${EM} Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email (IMAP/SMTP), SMS (Twilio/Vonage), iMessage (BlueBubbles), DingTalk, Feishu/Lark, WeCom, WeChat (iLink Bot), Webhooks, Home Assistant
- **Hermes Office (Claw3d)** ${EM} visual 3D interface with dev server and adapter management
- **Backup, import & debug dump** ${EM} full data backup/restore and system diagnostics from Settings
- **Log viewer** ${EM} view gateway and agent logs directly from the Settings screen
- **Auto-updater** ${EM} check for and install updates via \`electron-updater\`
- **i18n ready** ${EM} internationalization framework with English locale covering all screens, ready for community translations
- **Test suite** ${EM} SSE parser, IPC handlers, preload API surface, installer utilities, and constants validation with Vitest

## Install

The install + first-run flow is documented in detail in
[\`../docs/handbook/OPERATIONS.md\`](../docs/handbook/OPERATIONS.md). The
short version:

### Windows

> **Windows users:** The installer is not code-signed. Windows SmartScreen
> will warn on first launch ${EM} click "More info" \u2192 "Run anyway".

### Fedora (RPM)

\`\`\`bash
sudo dnf install ./cubecloud-desktop-<version>.rpm
\`\`\`

> **Fedora users:** The \`.rpm\` is not GPG-signed. If your system enforces
> signature checking, append \`--nogpgcheck\` to the install command.
> Auto-update is not supported for \`.rpm\` builds (limitation of
> \`electron-updater\`); reinstall the new \`.rpm\` to update.

## Preview

Captures for the new screens (post-V2.3) are under
[\`../previews/\`](../previews/) (Chat, Profiles, Models, Providers,
Tools, Skills, Schedules, Gateway, Persona, Kanban, Office, Settings).
Legacy preview captures are kept for workflow reference; they will be
regenerated with Cubecloud branding as part of the screenshot refresh
pass.

## How it works

On first launch, the app:

1. Asks whether you want to run the agent **locally** or connect to a **remote** API server.
2. **Local mode:** checks whether the runtime is already installed; if not, runs the official installer with dependency resolution.
3. **Remote mode:** prompts for the remote API URL and API key, validates the connection, and skips local install.
4. Prompts for an API provider or local model endpoint.
5. Saves provider config and API keys through the runtime's config files.
6. Launches the main workspace once setup is complete.

In local mode, chat requests go through \`http://127.0.0.1:8642\` with SSE
streaming. In remote mode, the app talks to your configured remote URL
with the same streaming protocol. The desktop app parses the stream in
real time, rendering tool progress, markdown content, and token usage
as it arrives.

## Supported providers

### LLM providers

| Provider            | Notes                                    |
| ------------------- | ---------------------------------------- |
| **OpenRouter**      | 200+ models via single API (recommended) |
| **Anthropic**       | Direct Claude access                     |
| **OpenAI**          | Direct GPT access                        |
| **Google (Gemini)** | Google AI Studio                         |
| **xAI (Grok)**      | Grok models                              |
| **Nous Portal**     | Free tier available                      |
| **Qwen**            | QwenAI models                            |
| **MiniMax**         | Global and China endpoints               |
| **Hugging Face**    | 20+ open models via HF Inference         |
| **Groq**            | Fast inference (voice/STT)               |
| **Local / Custom**  | Any OpenAI-compatible endpoint           |

Local presets are included for LM Studio, Atomic Chat, Ollama, vLLM,
and llama.cpp.

### Messaging platforms

Telegram, Discord, Slack, WhatsApp, Signal, Matrix / Element,
Mattermost, Email (IMAP / SMTP), SMS (Twilio & Vonage), iMessage
(BlueBubbles), DingTalk, Feishu / Lark, WeCom, WeChat (iLink Bot),
Webhooks, and Home Assistant.

### Tool integrations

Exa Search, Parallel API, Tavily, Firecrawl, FAL.ai (image generation),
Honcho, Browserbase, Weights & Biases, and Tinker.

## Development

### Prerequisites

- Node.js and npm
- A Unix-like shell environment for the runtime installer
- Network access for downloading the runtime during first-run install

### Install dependencies

\`\`\`bash
npm install
\`\`\`

### Start the app in development mode

\`\`\`bash
npm run dev
\`\`\`

## Where to look next

- **The agentic-OS monorepo README** ${EM} [\`../README.md\`](../README.md)
- **The master handbook** ${EM} [\`../docs/HANDBOOK.md\`](../docs/HANDBOOK.md) (one-screen tour)
- **The long-form per-topic deep dives** ${EM} [\`../docs/handbook/\`](../docs/handbook/) (architecture, development, operations)
- **The license / brand** ${EM} [\`../LICENSE\`](../LICENSE) and [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md)
- **The live / scratch-pad / mirror index** ${EM} [\`../docs/RETIRED_AND_LEGACY.md\`](../docs/RETIRED_AND_LEGACY.md)
- **The skills ecosystem** ${EM} [\`../.agents/skills/README.md\`](../.agents/skills/README.md) (34 skills, mirrored to \`~/.agents/skills/\`)
- **The Cubecloud runtime wrappers** ${EM} [\`../docs/CODEGRAPH-RUNTIME.md\`](../docs/CODEGRAPH-RUNTIME.md), [\`../docs/EVEROS-SIDECAR.md\`](../docs/EVEROS-SIDECAR.md)
- **The 34-skill ecosystem's per-version history** ${EM} [\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md) \u00a7"V2.6 / V2.7 / V2.8 / V2.9 transitions landed"

## License

Cubecloud-original work is dual-licensed under your choice of
**AGPL-3.0-or-later, Apache-2.0, or MIT**. The inherited
\`hermes-desktop\` framework code that hosts the Cubecloud-original
modules remains hard-MIT. See [\`../LICENSE\`](../LICENSE) and
[\`../BRANDING_AND_LICENSE.md\`](../BRANDING_AND_LICENSE.md) for the
per-path breakdown and the per-version transition history.
`;

// --- Execute ---
console.log('Writing outer README (agentic-OS monorepo)...');
fs.writeFileSync(OUTER_README, outerReadme);
console.log('  outer size:', fs.statSync(OUTER_README).size, 'bytes');

console.log('Writing inner README (install + features + providers)...');
fs.writeFileSync(INNER_README, innerReadme);
console.log('  inner size:', fs.statSync(INNER_README).size, 'bytes');

console.log('OK done.');
