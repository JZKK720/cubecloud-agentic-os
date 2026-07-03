# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.6.x   | ✅ yes (active development) |
| 0.5.x   | ⚠️ critical fixes only until 2026-09-30 |
| < 0.5   | ❌ end of life |

The `main` branch and the `dev` branch receive security fixes; the
curated `main` branch is what most users run. Pre-release builds
(`*-rc.*`, `*-beta.*`) are not security-supported.

## Deployment Guidance

The desktop has privileged local capabilities: shell access, file
read/write, model downloads, web research, email/calendar
integrations, API tokens, and a sidecar that runs an external
binary. **Treat it like an admin console.**

- Bind local dev runs to `127.0.0.1`; do not expose to the public
  internet without HTTPS and a trusted reverse proxy or private
  access layer.
- If you fork and rebrand, follow the build / distribution rules in
  `docs/legal/TRADEMARK_POLICY.md`. A fork that ships with the
  original Cubecloud marks intact is a Cubecloud distribution in
  our legal view; do not present it as an unrelated product.
- Keep `.env`, `HERMES_HOME/`, `data/`, `logs/`, databases, uploads,
  generated media, backups, auth/session files, API keys, and
  model/provider tokens out of Git and private shares. They are
  ignored by default.
- Review the credentials pool (`HERMES_HOME/<profile>/auth.json`)
  after first boot: disable open signup unless you intentionally
  want it, make only your own account admin, and keep
  demo/test accounts non-admin.
- Non-admin users do not get shell / Python / file read/write by
  default. Admin-only routes and tools (MCP management, API
  tokens, webhooks, model/cookbook serving, backup/vault, app
  settings) are admin-gated. Other features are controlled by
  per-user privileges — review each user's privileges before
  exposing a deployment.
- Rotate any API keys or tokens that were ever pasted into a
  shared chat, demo, screenshot, or log.
- If you enable API tokens or webhooks, create separate tokens per
  integration and delete unused ones.
- Keep optional sidecars (CodeGraph, EverOS) bound to loopback
  unless you intentionally want LAN access. The EverOS sidecar
  has an auto-restart cap (5 crashes per 60s window) that
  suppresses infinite restart loops on misconfiguration.
- Common internal-only ports the desktop may bind or
  connect to: app `7000` (default; configurable), the
  optional CodeGraph SDK (lazy-loaded; no default port,
  uses local SQLite), the optional EverOS sidecar
  `1995` (only when the user has the `everos` Python
  wheel installed and starts it), Ollama `11434` (only
  if the user has Ollama running), and other local
  model / provider APIs in the `8000-8020` range. The
  desktop does **not** bundle, ship, install, or
  manage any of these services — it only speaks their
  HTTP protocols. See `NOTICE` §"Interoperated services"
  for the full list and per-service license pointers.

## Publishing a Fork

Before pushing a public fork, run:

```bash
git status --short
git check-ignore -v .env HERMES_HOME/ data/auth.json state.db logs/
git grep -n -I -E \
  "(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{20,}|Bearer [A-Za-z0-9._~+/-]{20,})" -- . \
  ':!node_modules/**' ':!dist/**' ':!out/**' ':!package-lock.json'
```

Only `.env.example`, `LICENSE`, `NOTICE`, `BRANDING_AND_LICENSE.md`,
docs, source, tests, and static assets should be committed. Never
commit live `.env` values, `data/` contents, local databases,
uploaded files, generated media, logs, backups, auth/session files,
API keys, model/provider tokens, password hashes, or personal
documents.

If your fork is intended to be a Cubecloud distribution (i.e. it
keeps the Cubecloud marks and presents itself as a Cubecloud
release), the security rules above apply. If your fork is
rebranded, the rules in `docs/legal/TRADEMARK_POLICY.md` apply,
and you should also follow the security model of any new
infrastructure you add.

## Threat Model Summary

The full `THREAT_MODEL.md` lives alongside this file. Short version:

- **Trusted boundary:** the local user. Any code running with the
  user's privileges is implicitly trusted. The desktop's privilege
  boundary is the user account, not the app.
- **Untrusted inputs:** model outputs, MCP server responses, web
  search results, user-uploaded files. All are treated as data,
  not code, except where explicitly noted (the CodeGraph SDK
  is loaded via lazy `require()` from a user-installed
  `@colbymchenry/codegraph` npm package — see
  `docs/CODEGRAPH-RUNTIME.md`. When loaded, the SDK runs in
  the desktop's main process, so the `codegraph-runtime-*`
  IPC channels are privileged with respect to the user's
  filesystem. The SDK is **not** vendored in this repository
  and is **not** a declared dep; the wrapper degrades to an
  `unavailable` status if the package is missing).
- **Out of scope for this release:** defense against a fully
  compromised underlying OS, a malicious local user, or a
  malicious extension / userland process with the same privileges
  as the user. We document the threat boundary; we do not
  attempt to defend outside it.

## Reporting a Vulnerability

**Please report security issues privately.** Do not open a public
issue for suspected vulnerabilities.

| Channel | How |
|---------|-----|
| GitHub Security Advisories | <https://github.com/JZKK720/cubecloud-agentic-os/security/advisories/new> (preferred) |
| Private issue | Open a minimal issue titled `SECURITY: <short description>`; we will convert to an advisory |
| Email | (Will be filled in once a security contact address is set up) |

Please include:

- Description of the issue and impact
- Reproduction steps
- Affected versions
- Your assessment of severity
- Any known mitigations or workarounds

We aim to acknowledge within 3 business days and provide a
triage assessment within 7 business days. Critical issues get
out-of-band patches; lower-severity issues roll into the next
regular release.

## Embargo

We follow a 90-day coordinated disclosure window. If you need
more time (e.g. you want to coordinate a fix with a third-party
dependency), let us know and we'll work with you.

## Recognition

We maintain a `SECURITY-ACKNOWLEDGMENTS.md` for reporters who
consent to public credit. (Will be created after the first
disclosure cycle.)

## No PGP-encrypted email yet

This release does not yet support PGP-encrypted vulnerability
reports. If you need PGP for a specific report, ask via a regular
GitHub Security Advisory and we'll coordinate a side channel.

## License and contribution model

The Cubecloud-original work in this repository is dual-licensed
under your choice of AGPL-3.0-or-later, Apache-2.0, or MIT (see
`LICENSE`). The inherited `hermes-desktop` framework code that
hosts the Cubecloud-original modules is hard-MIT.

Inbound code contributions are accepted under the **DCO 1.1**
sign-off model (see `CONTRIBUTING.md` §"Developer Certificate of
Origin"). A `Signed-off-by:` line in the commit message certifies
that the contributor has the right to submit the code under the
project's license. The DCO applies uniformly regardless of which
of the three offered licenses a downstream consumer ultimately
picks — DCO is a contribution-side mechanism, not a license
choice.

Security fixes are released as patch-level version bumps (e.g.
`0.6.0` → `0.6.1`) on the `main` branch and rolled into the
next minor release. Critical fixes may receive out-of-band
releases at the maintainers' discretion. The DCO sign-off
requirement is not waived for security fixes; the time pressure
is not a license loophole.
