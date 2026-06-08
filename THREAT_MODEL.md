# Threat Model

This document is a working draft of the threat model for the
desktop. It complements `SECURITY.md` and the deployment guidance
there. The goal is to make explicit **what we defend against** and
**what we deliberately don't**, so security reviewers and
downstream operators can reason about residual risk.

This is not a formal STRIDE / PASTA / LINDDUN analysis. It is a
practical baseline.

## 1. Trust boundary

The desktop's privilege boundary is the **user account** that
launched it. Any code running with the same user privileges is
implicitly trusted. The desktop does not attempt to defend
against a fully compromised underlying OS, a malicious local user,
or a malicious extension / userland process with the same
privileges as the user.

Within that boundary, the desktop enforces **defense in depth**:
context isolation, a strict preload allowlist, no `nodeIntegration`,
sandbox where possible, and a typed envelope contract on every
IPC channel.

## 2. Assets we protect

| Asset | Sensitivity | Where it lives |
|-------|-------------|----------------|
| User keystrokes in the chat composer | High | Renderer memory only; never persisted in plaintext |
| API keys for chat providers | Critical | `HERMES_HOME/<profile>/auth.json`, OS keychain on macOS |
| OAuth refresh tokens | Critical | Same; rotated on use |
| Local conversation history | Medium | `HERMES_HOME/state.db` (better-sqlite3, file-permissions 0600) |
| Knowledge base / wiki content | Medium | `HERMES_HOME/<profile>/wiki/` |
| Uploaded files | Medium | `HERMES_HOME/<profile>/uploads/` |
| Skill content (manifests, source) | Low | Bundled in resources or `HERMES_HOME/<profile>/skills/` |
| The desktop binary itself | High | `out/main/index.js`, `out/preload/index.js`, `out/renderer/` |
| _Pre-built bundled services (SearXNG, ChromaDB, ntfy)_ | _n/a_ | _This revision of the desktop has no `docker-compose.yml` and bundles no containerized services. The line is kept in the catalog for shape consistency and should be removed if no service is ever added._ |

## 3. Adversaries we defend against

- **A3: Network-adjacent attacker** who can reach a non-loopback
  bind (`0.0.0.0`) but does NOT have credentials. Mitigations:
  loopback-by-default, `AUTH_ENABLED=true` (when running as a
  service), `SECURE_COOKIES=true` when behind HTTPS.

- **A4: Malicious MCP server.** MCP servers are user-installed
  via npm. The desktop sandbox limits what an MCP server can
  reach. Mitigations: per-server privilege flag, "ask before
  shell/Python", admin-only MCP management routes.

- **A5: Prompt-injection via model output or web search result.**
  Treated as data, not code. The shell tool, file-write tool, and
  the EverOS sidecar are gated behind explicit user confirmation
  per the existing agent tool patterns.

- **A6: Untrusted file dragged into a chat.** Attachments are
  staged into `HERMES_HOME/<profile>/uploads/` and shown to the
  user with filename + size. Conversion to markdown is
  best-effort; failures surface as a typed error.

## 4. Adversaries we deliberately don't defend against

- **A1: A malicious local user with the same UID.** Out of
  scope — the desktop runs with the user's privileges by design.

- **A2: A fully compromised OS.** Out of scope. We don't attempt
  to detect a rootkit, kernel compromise, or malicious
  userland process. Defending against these is a defense-in-depth
  problem that requires host hardening (Secure Boot, T2 chip,
  FileVault, etc.), which is the operator's responsibility.

- **A7: A compromised model provider.** The desktop treats the
  model's response as untrusted input. Code execution paths
  require explicit user confirmation.

- **A8: A compromised third-party npm/Python dep.** We pin
  versions, run `npm audit` in CI, and document our
  `package.json` `dependencies` so a compromised dep is
  attributable. We do not guarantee supply-chain integrity
  beyond that.

## 5. The sidecar boundary (CodeGraph + EverOS)

Two optional sidecars run as separate processes:

- **CodeGraph runtime** (`@colbymchenry/codegraph`) — loads lazily
  on first use. Lazy `require()` guards prevent the SDK from
  being loaded when the user never visits the CodeGraph screen.
  The SDK's own security model (read-only by default, no
  filesystem writes from `searchNodes`) is preserved.

- **EverOS sidecar** (`everos server start` Python) — spawned as
  a child process, bound to loopback by default. Has a
  5-crashes-in-60s restart cap to prevent infinite restart loops
  on misconfiguration. The sidecar's `lastError` line is
  surfaced in the renderer; raw log ring is bounded to 200
  lines so a chatty server doesn't bloat the renderer's state.

A malicious sidecar binary (e.g. one that the user installed but
was later compromised) inherits the user's privileges. The desktop
treats the sidecar as the user does.

## 6. Specific threats we have not yet addressed

These are tracked as follow-up work, not as immediate blockers:

- **Side-channel timing attacks** on the chat composer or the
  IPC layer. We don't currently add jitter to IPC round-trips.
- **Supply-chain compromise of `@colbymchenry/codegraph` or the
  `everos` Python wheel.** Both are optional; neither is pinned
  by hash in `package.json` or `requirements.txt`. A future pass
  should add lockfile hashes and signed-release verification.
- **Local privilege escalation via the EverOS sidecar.** The
  sidecar runs with the user's privileges. A future pass
  should drop privileges to a separate service user for the
  sidecar process.

## 7. When to update this document

This document should be updated when:

- A new privileged path is added (new IPC channel with side
  effects, new admin-only route, new external binary).
- A new optional dep is added that runs in a different privilege
  domain.
- A new adversarial class is observed in the wild.
- The `SECURITY.md` `Supported Versions` table changes.

In all of these cases, update this file in the same PR as the
change. Reviewers should treat changes to this file as a
trust-boundary change and call out any drift.
