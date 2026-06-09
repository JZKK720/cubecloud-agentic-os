---
name: hermes-imports
description: How to keep agent-desktop in sync with hermes-agent, hermes-cli, and the upstream open-source projects. When to rebase, when to vendor, when to fork.
source: ecc
metadata:
  source_repo: ECC hermes-imports
  tags: [hermes-agent, hermes-cli, vendoring, sync, profiles]
  related_skills: [agentic-engineering, karpathy-guidelines, openclaw-persona-forge]
---

# Hermes Imports

The desktop is one of three surfaces on top of the Hermes agent runtime:

- `hermes-agent` (Python package) —the runtime itself.
- `hermes-cli` (Python CLI) —the user-facing terminal entry point.
- `agent-desktop` (this repo) —the Electron UI.

The three share a contract: the desktop talks to the runtime over a local HTTP gateway, and the runtime reads `<profile>/.env` + `<profile>/config.yaml`. When the contract changes, the desktop's `installer.ts` and `hermes.ts` modules need to be updated in lockstep.

## When to use

Use this skill when:

- The runtime introduced a new config key (e.g. a new model, a new platform).
- The CLI added a new subcommand (e.g. `hermes mcp add`).
- A user reports that the desktop and the terminal CLI see different state.
- A new profile layout was added in `hermes-agent` (e.g. profiles now live under a subfolder).

## The three sync rules

### 1. Match the runtime's `config.yaml` schema

The desktop parses `config.yaml` with **line-by-line regex** (see `config.ts` and `tools.ts`). When the runtime introduces a new section, the desktop needs a parser update. The contract:

- Top-level keys are at column 0.
- Nested keys are indented (the desktop assumes 2-space).
- Lists are `key:` followed by `- item` lines.

If a future upstream change uses 4-space indent or different list syntax, **fork the parser** rather than try to handle both. The desktop is a long-lived surface; runtime/parser drift is the #1 source of "the gateway says X but the desktop says Y" bugs.

### 2. Profile-aware state, not global state

The runtime introduced per-profile state in 2026 —`<profile>/.env`, `<profile>/config.yaml`, `<profile>/state.db`. The desktop's helpers (`profileHome`, `profilePaths`, `activeStateDbPath` in `utils.ts`) all encode this layout. **Never** add a new feature that reads or writes to the global `~/.hermes/` root.

If the runtime introduces a new per-profile file (e.g. `<profile>/auth-prod.json`), the desktop gets a corresponding helper in `utils.ts` and a preload method on `hermesAPI`.

### 3. `set-env` and `set-config` are the only sanctioned write paths

When the user changes a setting in the desktop, the renderer calls `set-env` or `set-config` over IPC, which writes to the right `<profile>/.env` or `<profile>/config.yaml` and (for credential keys) restarts the gateway. **Never** open a new file directly from the desktop.

The corollary: if the runtime introduces a new way to set a value (e.g. `hermes config set <key> <value>`), the desktop should still go through `set-config` rather than calling the CLI, so the IPC audit trail stays intact.

## Where to rebase vs where to vendor

The desktop is in a sibling repo to `hermes-agent` and `hermes-cli`, not a fork. So:

- **Rebase** (pull new commits from upstream) for: anything that's pure behaviour (new config keys, new commands, new platforms).
- **Vendor** (copy a small chunk into the desktop) for: any utility that is small and stable enough to not need upstreaming, e.g. the ProfileResolver logic.
- **Fork** (maintain a divergent copy) for: nothing right now. The desktop is intentionally a thin client; if you need to fork something, you probably want to upstream the change first.

## Reference

- `src/main/installer.ts` —`getHermesHome`, `inspectInstallTarget`, `setHermesHomeOverride`. The shape of "where is the runtime installed".
- `src/main/config.ts` —`readEnv`, `setEnvValue`, `getConfigValue`, `setConfigValue`. The shape of "profile-scoped reads/writes".
- `src/main/utils.ts` —`profileHome`, `profilePaths`, `activeStateDbPath`. The shape of "where is profile state".
- `src/main/hermes.ts` —the gateway lifecycle (start, stop, health, restart on credential change). When the runtime changes how the gateway boots, this is the file to touch.
