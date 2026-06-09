# Operations guide

> **Companion to the master handbook (`docs/HANDBOOK.md` §6, §9, §11).** This is the long-form operations guide. The handbook gives you the one-screen summary; this gives you the 30-screen walkthrough for the on-call operator.

## Day-1 setup (user)

### Windows

```powershell
# Download the latest MSI from the GitHub release page
# (Cubecloud-pending: replace with the Cubecloud-owned release URL once
#  the brand transition is finalised)
Invoke-WebRequest -Uri https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/latest/download/cubecloud-desktop-setup.msi -OutFile cubecloud-setup.msi

# Run the installer (SmartScreen will warn —click "More info" →"Run anyway")
msiexec /i cubecloud-setup.msi
```

### Fedora

```bash
curl -L -o cubecloud.rpm https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/latest/download/cubecloud-desktop-x86_64.rpm
sudo dnf install ./cubecloud.rpm
# If your system enforces signature checking: sudo dnf install ./cubecloud.rpm --nogpgcheck
```

### macOS

```bash
curl -L -o cubecloud.dmg https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/latest/download/cubecloud-desktop-x64.dmg
open cubecloud.dmg
# Drag Cubecloud.app to /Applications
```

### First-run wizard

On first launch, the desktop walks the user through:

1. **Runtime choice** —local install of Hermes (default), or attach to a remote / Docker-published / SSH-tunneled gateway.
2. **Provider setup** —pick a local model endpoint (Ollama, vLLM, llama.cpp) or a remote provider (any OpenAI-compatible API).
3. **API key** —only for remote providers. Stored in the user's home dir under the runtime's config dir; never in the desktop's own DB.
4. **Test chat** —the wizard sends a one-shot test message to confirm the runtime + provider wiring.

## Day-2 operations

### Where the data lives

- **Desktop state** (profiles, sessions, models, providers, skills, memory, tools, schedules, kanban) —in the desktop's SQLite database under the user's app-data dir.
  - Windows: `%APPDATA%\agent-desktop\state.db`
  - macOS: `~/Library/Application Support/agent-desktop/state.db`
  - Linux: `~/.config/agent-desktop/state.db`
- **Runtime state** (Hermes / OpenClaw / IronClaw) —in the runtime's own home dir.
  - Hermes: `~/.hermes/`
  - OpenClaw: `~/.openclaw/`
  - IronClaw: configured at install time
- **Logs** —in the runtime's log dir; the desktop tails them to the in-app "Console" screen.
- **Backups** —produced by the desktop's Settings →Backup, or by `tar -czf cubecloud-backup.tar.gz <state-db-path> <runtime-home>`.

### Common operational tasks

#### Restart a stuck runtime

The desktop's Settings →Runtime →"Restart" button is the safe path. If the runtime is wedged and the desktop's button does not work, the operator can SIGTERM the runtime process from the OS:

```bash
# Find the runtime pid
pgrep -f "hermes-server\|openclaw\|ironclaw"

# SIGTERM
kill <pid>

# If SIGTERM is ignored after 10 seconds, SIGKILL
kill -9 <pid>

# Restart
# The desktop's runtime picker will pick up the new process automatically.
```

#### Inspect a failing chat

1. Open Settings →Console.
2. Find the chat session ID in the chat screen.
3. Search the gateway log for the session ID.
4. Most chat failures are one of:
   - **Provider unreachable** —the user's local model server crashed, or the remote API key is invalid. Fix the provider, restart the chat.
   - **Runtime gateway stuck** —the runtime's HTTP server is up but not responding. Restart the runtime.
   - **Skill activation loop** —a skill is being auto-activated and recursively activating itself. Disable the skill in Settings →Skills.

#### Roll back a release

The desktop stores the previous version's installer payload under the user's app-data dir. To roll back:

1. Settings →Updates →"Show update history".
2. Click "Roll back to <version>".
3. The desktop will uninstall the current version and install the previous one.

For emergency rollbacks (the auto-update itself is broken), the operator can:

1. Download the previous MSI/RPM/DMG from the GitHub release page.
2. Run the installer over the current install.
3. The desktop's `electron-updater` is configured to roll forward on next launch; disable auto-update in Settings →Updates first.

#### Backup and restore

The desktop's Settings →Backup produces a tar.gz containing:

- The state SQLite database.
- The runtime home dir (Hermes / OpenClaw / IronClaw, whichever is configured).
- The user's `~/.agents/skills/` directory (the user-global skills mirror).
- A small manifest with the desktop version, the runtime versions, the skill names, and a SHA-256 of the tarball.

To restore:

1. Settings →Backup →Restore.
2. Pick the tar.gz.
3. The desktop verifies the SHA-256, stops the current runtime, restores the state, and restarts the runtime.

#### Clean uninstall

To remove the desktop and all its state:

```bash
# macOS
rm -rf "/Applications/Cubecloud.app"
rm -rf ~/Library/Application\ Support/agent-desktop
rm -rf ~/Library/Logs/agent-desktop

# Windows
# Use "Apps & Features" →Cubecloud Desktop →Uninstall.
# Then remove %APPDATA%\agent-desktop and %LOCALAPPDATA%\agent-desktop.

# Linux
sudo dnf remove agent-desktop
rm -rf ~/.config/agent-desktop
rm -rf ~/.local/share/agent-desktop
```

The runtime homes (`~/.hermes/`, etc.) are *not* removed by the desktop's uninstaller. The user must remove those separately if they want a fully clean state.

## Day-2 operations (operator / release)

### Release checklist

The binding checklist is in `docs/HANDBOOK.md` §9. The full diff narrative for the V2.4 →V2.5 →V2.6 wave is in `BRANDING_AND_LICENSE.md` §"V2.4 / V2.5 / V2.6 transitions landed". The release spec is in `docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`.

### Monitoring

- **In-app Console** —Settings →Console tails the runtime's log.
- **Per-screen smoke runs** —`scripts/verify-*.js` (CDP-driven). Run before each release.
- **Aggregator smoke run** —`scripts/smoke-all.js` runs every `verify-*.js` in sequence.
- **Preview captures** —`scripts/capture-*.js` produces the per-screen PNGs that ship with the release notes.

### Incident response

The binding doc is `SECURITY.md`. The headlines:

- **Security reports** —see `SECURITY.md` for the private reporting channels. Do not file a public issue for a security problem.
- **Vulnerability disclosure timeline** —90 days from private report to public disclosure, with a 14-day grace extension if the reporter asks.
- **Supported versions** —the latest minor of the latest major (N), and the previous minor (N-1). Older versions are not patched.

### Observability (current state)

- **Logs** —local-file only. The desktop does not ship a remote log shipper.
- **Metrics** —none. There is no Prometheus / OpenTelemetry integration.
- **Traces** —none. There is no distributed-tracing integration.
- **Alerts** —none. There is no alerting integration.

This is a deliberate V2.5 decision: the desktop's threat model is local-user-first, and shipping remote telemetry would expand the trust surface. Operators who want observability can tail the in-app Console, the runtime's log dir, or the auto-update channel's CDN logs.

## Compliance & governance

- **License** —`LICENSE` (dual-license: AGPL-3.0-or-later primary + Apache-2.0 + MIT compatibility). Inherited framework code is hard-MIT.
- **Trademark** —`docs/legal/TRADEMARK_POLICY.md`. Cubecloud marks are All-rights-reserved; nominative use is allowed; confusingly-similar names are not.
- **Privacy** —there is no telemetry, no analytics, no remote attestation. The desktop does not phone home.
- **SBOM** —the per-release `package-lock.json` is the authoritative JS-dep SBOM. The Python SBOM (for the autoresearch harness) is `ar-autoresearch/harness/uv.lock` (generated by `uv lock`).
- **DCO** —every commit must carry a `Signed-off-by:` line. See `CONTRIBUTING.md`.

## Migration paths

### From upstream `hermes-desktop` to `agent-desktop`

The V2.3 →V2.4 →V2.5 work was the brand transition; the underlying framework is still `hermes-desktop` (MIT). Migration is:

1. Back up the upstream install: `cp -r ~/.hermes ~/.hermes.bak`.
2. Install `agent-desktop` over the upstream install.
3. The desktop's first-run wizard detects the existing `~/.hermes/` and offers to import it.
4. After import, the desktop's `~/.hermes/` is unchanged in content; the brand layer (icons, splash, locale strings) is the only thing that visibly changed.

### From a single-runtime to multi-runtime

The V2.6 →V2.7 wave adds OpenClaw and IronClaw as additional lanes. To add a second runtime:

1. Install the runtime per its own docs (e.g. `pip install openclaw`).
2. Open Settings →Runtime →"Add runtime".
3. Pick the runtime type, supply the install path / port.
4. The desktop's runtime picker will now offer both runtimes; the user picks per-session which one to chat with.

### From the desktop to a hosted service

`docs/legal/CUBECLOUD-EULA.md` is the EULA for the hosted-service path. Operators who want to run a Cubecloud-derivative service without the AGPL-3.0 §13 network-source obligation can use the commercial-relicensing path in `docs/legal/COMMERCIAL_LICENSE.md`.

---

**Where to look next.** [`docs/HANDBOOK.md`](../HANDBOOK.md) for the master index, [`SECURITY.md`](../../SECURITY.md) for the security policy, [`THREAT_MODEL.md`](../../THREAT_MODEL.md) for the working threat model, [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for DCO, [`docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md) for the release design.

**Recent updates (V2.6 —V2.10).** This file was last
substantively edited during the V2.4 —V2.6 brand-license
wave. The V2.7 (superpowers skills), V2.8 (description-trim audit),
V2.9 (pre-launch bundle, 40/40 smoke), and V2.10 (doc-move, README
split, i18n cleanup, previews cleanup, provenance cross-link,
README Translations pointer) transitions are documented in
[`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) under
the corresponding `## V2.7 / V2.8 / V2.9 / V2.10` sub-sections, and
each per-version change is recorded in
[`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §
"How to confirm a surface is live". No content rewrite of this
handbook file was needed for V2.10.14; the tail pointer is the
additive update.
