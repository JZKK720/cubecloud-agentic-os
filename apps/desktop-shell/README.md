# Agent Desktop

**Cubecloud Agent Desktop** — the GUI for your AI agent runtime.

Agent Desktop is a local-first Electron app that connects to your
running agent runtime (Hermes, IronClaw, or OpenClaw) and gives you
a chat interface, task management, model configuration, and optional
support tools — all without sending your data to the cloud.

## Download

Pre-built installers are available on the
[releases page](https://github.com/JZKK720/cubecloud-agentic-os/releases).

| Platform | File | Size |
|---|---|---|
| Windows | `Agent Desktop-<version>-setup.exe` | ~118 MB |
| macOS | `Agent Desktop-<version>.dmg` | ~120 MB |
| Linux | `Agent Desktop-<version>.AppImage` | ~120 MB |

## Install

### Windows

1. Download `Agent Desktop-<version>-setup.exe`
2. Double-click to run the installer
3. Follow the NSIS installer prompts
4. Launch **Agent Desktop** from the Start Menu or desktop shortcut

### macOS

1. Download `Agent Desktop-<version>.dmg`
2. Open the DMG and drag **Agent Desktop** to Applications
3. Launch from Launchpad or Applications folder

### Linux

1. Download `Agent Desktop-<version>.AppImage`
2. Make it executable: `chmod +x "Agent Desktop-<version>.AppImage"`
3. Run it: `./"Agent Desktop-<version>.AppImage"`

## First launch — it just works

When you open Agent Desktop for the first time, it automatically
scans localhost for running agent runtimes:

- **Hermes** — ports 8642, 8644, 8789
- **IronClaw** — port 3231
- **OpenClaw** — port 18789

If exactly one runtime is found, Agent Desktop auto-connects and
lands you in the Chat screen — zero configuration. If multiple
runtimes are found, you get a one-click picker. If none are found,
you can connect manually.

## Prerequisites

Agent Desktop is a **client** — it connects to a running agent
runtime. You need at least one of:

| Runtime | Install | Default port |
|---|---|---|
| **Hermes** | `pip install hermes-agent` or Docker container | 8642 |
| **IronClaw** | Docker compose (GHCR image) | 3231 |
| **OpenClaw** | `npm install -g openclaw` or Docker | 18789 |

You also need a **model provider** — either a local one (Ollama,
LM Studio) or a remote one (OpenAI, OpenRouter, Azure OpenAI).
The runtime gateway routes your chat requests to the provider.

## Features

### Core

- **Chat** — streaming conversations with your agent runtime
- **Sessions** — browse and resume past conversations
- **Profiles** — manage agent personas, models, and skill sets
- **Kanban** — track agent tasks across queued, active, and done
- **Schedules** — cron-scheduled agent prompts
- **Memory** — durable memory entries across sessions

### Runtime management

- **Auto-discovery** — scans localhost, auto-connects to your runtime
- **Gateway** — lane configuration for Hermes, IronClaw, OpenClaw
- **Sandbox Tasks** — dispatch tasks to IronClaw's WASM-sandbox gateway
- **Models** — model endpoint management
- **Providers** — Ollama, LM Studio, OpenAI, OpenRouter, Azure, BYOK

### Optional support tools

Agent Desktop discovers and suggests optional tools that enhance
your agent's capabilities. Install them on the gateway machine:

| Tool | Install | What it does |
|---|---|---|
| **CodeGraph** | `npm install -g @colbymchenry/codegraph` | Semantic code intelligence — fewer tokens, fewer tool calls |
| **Graphify** | `pip install graphifyy` | Multimodal knowledge graph — code, docs, papers, images |
| **EverOS** | `pip install everos` | Persistent memory harness across sessions |
| **Headroom** | `pip install headroom` | Context compression — save tokens on long conversations |
| **Agent-Reach** | `pip install agent-reach` | Internet capabilities — Twitter, Reddit, YouTube, RSS, search |

Tools are optional and can be installed anytime. The desktop shows
a quiet "Enhance your agent" panel in the sidebar with one-click
install instructions.

## Build from source

### Prerequisites

- Node.js 22+
- npm 10+

### Build

```bash
# Clone the repo
git clone https://github.com/JZKK720/cubecloud-agentic-os.git
cd cubecloud-agentic-os

# Install dependencies
npm install

# Build for your platform
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

The installer appears in `apps/desktop-shell/dist/`.

### Development

```bash
npm run dev          # Start dev server with hot reload
npm run typecheck    # Typecheck all workspaces
npm run test         # Run tests
```

## Architecture

Agent Desktop is built on the **swappable-surfaces contract**:

1. **Core runtime agents** (Hermes, IronClaw, OpenClaw) — HTTP
   gateways the desktop attaches to for chat
2. **Integrated support surfaces** (CodeGraph, EverOS, Headroom) —
   operator-installed, desktop-spawned sidecars
3. **User-managed third-party apps** (Ollama, LM Studio, etc.) —
   discovered via local scan
4. **Coding-agent CLIs** (Claude Code, Codex CLI, GitHub Copilot
   CLI, etc.) — discovered on PATH

The value is the managed operating layer, not which tool is running
at any moment. See [`AGENTS.md`](../../AGENTS.md) for the full
contract.

## License

- **Cubecloud-original code:** AGPL-3.0-or-later OR Apache-2.0 OR MIT
- **Inherited hermes-desktop framework code:** MIT

See [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) for
the per-path provenance breakdown.

## Links

- [Repository](https://github.com/JZKK720/cubecloud-agentic-os)
- [Handbook](../../docs/HANDBOOK.md)
- [Runtime Dependencies](../../docs/handbook/RUNTIME-DEPENDENCIES.md)
- [Security Policy](../../SECURITY.md)
- [Threat Model](../../THREAT_MODEL.md)