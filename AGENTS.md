<!--
Workspace-level AGENTS.md for cubecloud-agentic-os.
Read by: Claude Code, Cursor, Windsurf, Cline, and any other agent that
honors a project-root AGENTS.md. Copilot-specific instructions live in
`.github/copilot-instructions.md`; this file is the cross-tool
superset and the project-specific source of truth.

Distilled from:
  - https://github.com/JZKK720/andrej-karpathy-skills (Karpathy's 4 principles)
  - https://github.com/JZKK720/ECC (Everything Claude Code, Copilot adapter)
  - the V2.10.51-V2.10.55 brand-pack adoption
  - the swappable-surfaces contract from docs/HANDBOOK.md
-->

# AGENTS.md — cubecloud-agentic-os

## 0. What this repo is

`cubecloud-agentic-os` is the monorepo for the **Cubecloud Agent Desktop**
binary and the operating model around it. The desktop ships as
`agent-desktop/` — this is where the Cubecloud-original control
plane, renderer, and electron-builder pipeline all live. The shared
TypeScript contracts live in `packages/platform-core/`, and the
35-skill ecosystem in `.agents/skills/`. (The old
`apps/desktop-shell/` workspace was retired in V2.10.67 — see
[§6.7](#67-dual-readme-contract-do-not-conflate) and [§7](#7-repo-layout);
treat references to it as `agent-desktop/`.) Legal entity: **Cubecloud
Limited Company**;
Chinese trademark: **智方云**. License: AGPL-3.0-or-later OR
Apache-2.0 OR MIT, with a path-by-path framework-MIT carve-out
documented in `BRANDING_AND_LICENSE.md`.

The framing is **sovereign intelligence** for teams: local-first,
data-stays-in-house, works-offline, no-cloud-API-fees, OEM-ready.
The product promise is that the core runtime agents (Hermes, IronClaw,
OpenClaw), the integrated support surfaces (CodeGraph, EverOS,
Headroom), and any user-managed third-party applications are
**swappable** — the value is the managed operating layer, not which
tool is running at any moment. Honor that contract; do not hard-code
surface assumptions into Cubecloud-original code paths.

**Tiers of the agent surface (do not conflate):**

1. **Core runtime agents** — `RuntimeProviderId` in
   `agent-desktop/src/shared/runtime-orchestration.ts`. HTTP gateways
   the desktop attaches to for chat. Hermes (default, port 8642),
   IronClaw (WASM-sandbox gateway-handoff, port 3231 — the live source
   of truth is `scripts/ironclaw-attach.smoke.cjs`; the older "8281"
   in historical docs is legacy), OpenClaw (optional, port 18789).
   The desktop attaches over HTTP; it does not shell out to an
   interactive TUI for the chat path.
2. **Integrated support surfaces** — CodeGraph, EverOS, Headroom,
   Moo Tasks, Codebase Memory. Operator-installed, desktop-spawned
   sidecars. Moo Tasks (agent-native kanban with 14 MCP tools) lives
   as a panel on the Plans screen; Codebase Memory (CMM, 14 MCP tools,
   Cypher queries, 3D graph) lives as a panel on the CodeGraph screen.
   The dead Kanban screen was removed in V2.10.75 — moo-tasks
   replaces it.
3. **User-managed third-party apps** — anything the operator installs
   that is not a coding-agent CLI. Includes local model servers
   (Ollama, LM Studio, vLLM, llama.cpp) and chat/retrieval tools
   (Open WebUI, OpenCode, Warp ADE). The desktop *discovers* these
   via local scan or manual attach; it does not treat them as chat
   gateways.
4. **Coding-agent CLIs** — a 25-entry `AGENT_CLI_CATALOG` in
   `agent-desktop/src/shared/agent-clis.ts` (Claude Code, Codex CLI,
   GitHub Copilot CLI, Gemini CLI, OpenCode, Aider, Kimi CLI, Qwen
   Code, Raven, etc.). The desktop *discovers* these on PATH via
   `discoverAgentClis()` for potential in-renderer code-task lanes;
   they are not treated as chat gateways. Adding a new entry here
   does not change the runtime layer.

`copilot-cli` is one entry in tier 4, not a fourth runtime lane. It is
detected by `discoverAgentClis()` alongside its 24 siblings and is
not special. If the desktop later drives coding-agent CLIs for
in-renderer code tasks, that feature serves the whole catalog, not
`copilot-cli` alone.

## 1. Think Before Coding

- State assumptions explicitly. If two interpretations of the
  request are reasonable, surface **both** before picking.
- One clarifying question beats a silent guess. Use the
  `ask-questions` tool only when the answer actually changes the
  implementation; do not use it for things you can decide.
- Push back when warranted. A simpler approach that solves the
  same problem is always preferred.
- Stop when confused. Name what is unclear instead of guessing.

## 2. Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use
  code. No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios. No defensive null
  checks on values that are statically guaranteed.
- If 200 lines could be 50, rewrite it. The test: would a senior
  engineer say this is overcomplicated? If yes, simplify.
- Reuse existing hooks, preload bridges, provider plumbing, and
  CSS patterns before adding abstractions.

## 3. Surgical Changes

- Touch only what you must. Clean up only your own mess.
- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- When your changes create orphans, remove imports / variables /
  functions that **your** changes made unused. Do not remove
  pre-existing dead code unless asked.
- Do not revert unrelated user changes. The git log between HEAD
  and `origin/main` is sacred; an agent task is never a reason to
  rebase or reset other people's work.

## 4. Goal-Driven Execution

- Transform imperative tasks into verifiable goals before writing
  code. "Make it work" is not a goal. "Test passes, no
  `npx tsc --noEmit` errors, mojibake scan reports 0 FFFD" is.
- For multi-step tasks, state a brief plan with a verify step on
  each line.
- For "fix the bug" / "add validation" / "refactor X" style tasks,
  write a test that reproduces the goal first, then make it pass.
- Strong success criteria let you loop independently. Weak
  criteria require constant clarification.

## 5. Build & Test Commands (use these exact forms)

**`agent-desktop/` is the only thing this monorepo actually builds.** The
`cubecloud-agentic-os` repo is the business wrapper around the desktop
binary — every build target, every installer, every runnable artifact
comes from `agent-desktop/`. There is no other build.

The repo is an npm workspaces monorepo with two live workspaces:
`agent-desktop/` (the Electron desktop binary) and `packages/platform-core/`
(shared TypeScript contracts). The old `apps/desktop-shell/` workspace
was a **retired legacy wrong build** — see [§6.7](#67-dual-readme-contract-do-not-conflate)
and [§7](#7-repo-layout). It must never be revived. Its historical
references in tracked docs are artifacts to be cleaned up, not
descriptions of a current workspace.

The current workspace name (read from `agent-desktop/package.json#name`)
is **`cubecloud-agent-desktop`**, not `@cubecloud/desktop-shell`.

From the repo root:

| Goal | Command |
|---|---|
| Install | `npm install` (or `npm ci` in CI) |
| Typecheck the whole monorepo | `npm run typecheck` |
| Typecheck one workspace | `npm run typecheck --workspace cubecloud-agent-desktop` (or `--workspace @cubecloud/platform-core`) |
| Run all `agent-desktop` tests | `npm run test --workspace cubecloud-agent-desktop` |
| Run a single test | `npm.cmd exec vitest run tests/<slice>.test.ts` (cwd `agent-desktop`) |
| Build a Windows package | `npm run build:win --workspace cubecloud-agent-desktop` |
| Verify the packaged asar | `npm run verify:bundle --workspace cubecloud-agent-desktop` |
| Build the agent-desktop + platform-core | `npm run build` (root) |

**`agent-desktop/` is the only workspace with a working `npm run build:win`.**
The root-level `npm run build` builds source only and produces no
installer. The electron-builder pipeline (with
`postinstall: electron-builder install-app-deps`) lives entirely inside
`agent-desktop/`. Use `--workspace cubecloud-agent-desktop` (npm
workspaces syntax), not `--project` (pnpm syntax).

Test files live in `agent-desktop/tests/` (89 files) plus 16
co-located in `src/`. The CI gate (`.github/workflows/ci.yml`
`desktop-shell-checks` job) runs the **full** vitest suite on every PR
(fixed in V2.10.73 — previously referenced 3 nonexistent test files
that `passWithNoTests: true` silently masked). Always assert the
vitest output reports `Test Files > 0` and `Tests > 0`. For the
real audit/smoke ladder (typecheck → full suite → asar integrity →
IPC audit → operator CLI smokes → CDP smokes → doc/i18n checks),
see [`agent-desktop/AGENTS.md`](agent-desktop/AGENTS.md) Validation
and the [`audit` slash prompt](.github/prompts/audit.prompt.md).

## 6. Project-Specific Rules

### 6.1 Brand assets

- The canonical brand pack is `docs/logos/logo.svg/`: 12 SVG files
  (4 sizes: 120×120, 1290×480, 512×512, 800×800 × 3 color treatments:
  反白 / 反黑 / 常规). **Do not hand-roll a new logo.**
- The build-time mirror is `agent-desktop/build/branding/logo-pack/`.
- The renderer (Vite-bundled) mirror is
  `agent-desktop/src/renderer/src/assets/logo-pack/`.
- The legacy `agent-desktop/build/branding/cubecloud-logo.svg` and
  `agent-desktop/build/branding/cubecloud-mark.svg` are
  byte-identical to `1290X480 常规.svg` and a 6-block cube
  composition, respectively, and are kept for the existing build
  pipeline. Prefer the `logo-pack/` paths for new code.
- The 智方云 Chinese mark belongs in legal text
  (`BRANDING_AND_LICENSE.md`, `ABOUT.md`); it is a **trademark
  mention, not a visual mark in product chrome**.

### 6.2 Inner agent-desktop/ has its own AGENTS.md

`agent-desktop/AGENTS.md` is the inner monorepo workspace's
project-specific instruction file. When working in `agent-desktop/`
specifically, read that file. The inner file references the
default skills below and is the canonical place for desktop-only
rules (renderer conventions, IPC surface, electron-builder
packaging).

### 6.3 Default Skills (apply automatically)

These skills live in `.agents/skills/<name>/SKILL.md`. Load them
when the trigger applies:

| Trigger | Skill |
|---|---|
| Any non-trivial code work in this repo | `karpathy-guidelines` |
| Renderer UI, CSS, onboarding, welcome, setup, empty states | `design-taste-frontend` |
| Translations, screenshot refresh, PDF re-render, README i18n sync | `.github/skills/docs-i18n-refresh/SKILL.md` |
| Headroom, context compression, large logs, CodeGraph bundle compression | `.github/skills/headroom-workflow/SKILL.md` |
| Full audit / smoke test of agent-desktop runtimes, sub-runtimes, IPC, CI | `.github/skills/agent-desktop-audit/SKILL.md` |

**Do not reference skills that are not in this list.** A previous
version of `agent-desktop/AGENTS.md` referenced `electron-pro` and
`typescript-expert` which do not exist in this repo — that was a
carry-over from another workspace and is not a valid skill to load.

### 6.4 I18n + README workflow

- The translation inventory lives in the outer `README.i18n.md`.
  Update it when adding or refreshing a translation.
- `node scripts/v2.10.20-readme-combined-pdf.cjs` re-renders
  `docs/Cubecloud-README-en-zh.pdf` from `README.md` and
  `README.zh-CN.md`.
- After editing `README.md` or `README.zh-CN.md`, re-render the
  combined PDF.
- For a structural change to the outer root READMEs, follow the
  workflow in `.github/skills/docs-i18n-refresh/SKILL.md`.
- Mojibake repair protocol: scan with the
  `npx scripts/v2.10.20-readme-combined-pdf.cjs` style Node
  inline script (search for `\uFFFD`); restore from
  `git show b981611:<path>` if the source is still clean. The
  FFFD character must never appear in tracked files.

### 6.5 Slash prompts

Use the structured prompts in `.github/prompts/` for multi-step
tasks:

- `plan.prompt.md` for implementation planning
- `tdd.prompt.md` for red/green/improve cycles
- `code-review.prompt.md` for review of the current diff
- `security-review.prompt.md` for OWASP-aligned review
- `build-fix.prompt.md` for failing builds
- `refactor.prompt.md` for dead-code cleanup
- `audit.prompt.md` for the full agent-desktop audit/smoke ladder
- The 5 `taste-*.prompt.md` files for design-led work

### 6.6 Security floor

- Never write secrets, tokens, or PEM blocks into source files.
  Use Key Vault / env / managed identity.
- Never disable a linter, type checker, or hook to make a build
  pass. Fix the underlying issue.
- Treat user input as untrusted. Validate at the boundary,
  escape at the render boundary.
- Run `security-review.prompt.md` on any change that touches auth,
  network, IPC, file I/O outside a known safe directory, or a
  public API surface.
- See `SECURITY.md` and `THREAT_MODEL.md` for the full threat
  model; `docs/legal/` for the legal posture (TRADEMARK_POLICY,
  COMMERCIAL_LICENSE, CUBECLOUD-EULA, PROVENANCE_TRACKER).

### 6.7 Dual-README contract (do not conflate)

**`cubecloud-agentic-os` is the business wrapper of the monorepo** —
the outer-root framing that explains what this product is to evaluators,
contributors, and investors. **All actual builds live in `agent-desktop/`** —
that is where the desktop binary, the installer, and every runnable
artifact come from. There is no third place; `apps/desktop-shell/` was
a retired legacy wrong build and is gone.

This repo has **two independent README files**, each with a distinct
audience. They are NOT hardlinks and NOT in the `sync-docs.ps1` set
(which only hardlinks governance docs like `CONTRIBUTING.md` and
`SECURITY.md`). Updates to one do not auto-propagate to the other.

| README | Audience | Content |
|---|---|---|
| `README.md` (root) | Evaluator / contributor / investor | Monorepo business framing, workspace tree, three-tier architecture (V2.10.57), brand, market positioning, Headroom layer |
| `agent-desktop/README.md` | End user / installer of the binary | Install commands, 22-image preview gallery, provider/gateway/tools tables, first-launch flow |

i18n mirrors follow the same split: `README.zh-CN.md` (root) and
`agent-desktop/README.zh-CN.md` (inner). Translation inventory lives in
`README.i18n.md` — consult it before declaring a README out of date.

When asked to "update the README," ask: *"Is this about what the desktop
binary does (→ `agent-desktop/README.md`), or about the broader
agentic-OS story (→ root `README.md`)?"* If both, update both — but
treat them as two separate edits, not one.

## 7. Repo Layout

| Path | Purpose |
|---|---|
| `agent-desktop/` | The Electron desktop that ships to end users. This is the active implementation target. |
| `apps/desktop-shell/` | **Retired in V2.10.67** (commit `06a10b9`). The `desktop-shell/` subdir is gone. References to it in older docs and READMEs are stale — treat them as `agent-desktop/` for build purposes. |
| `packages/platform-core/` | Shared TypeScript contracts. |
| `.agents/skills/` | {{SKILLS_UPSTREAM}} first-class open-source skills adapted from {{SKILLS_REPOS}} upstream repos. |
| `.github/skills/` | Repo-authored Copilot / VS Code workflow skills (docs-i18n-refresh, headroom-workflow). |
| `.github/prompts/` | Slash prompts for structured agent work. |
| `.github/copilot-instructions.md` | Copilot-specific instruction file. The Karpathy/ECC generic principles. |
| `docs/` | Handbook, threat model, runtime plans, legal policies, transition history. |
| `scripts/` | One-off + reusable Node scripts (combined-PDF, brand-pack mirror, etc.). |
| `docs/logos/logo.svg/` | **Canonical brand pack** — 12 SVG files, 4 sizes × 3 treatments. |

## 8. Docs That Should Be Linked, Not Duplicated

When writing or updating chat-customization files (this file,
`agent-desktop/AGENTS.md`, `.github/copilot-instructions.md`), do
not copy content from these sources — link to them:

- The full one-screen tour: `docs/HANDBOOK.md`
- Architecture deep-dive: `docs/handbook/ARCHITECTURE.md`
- Development guide: `docs/handbook/DEVELOPMENT.md`
- Operations guide: `docs/handbook/OPERATIONS.md`
- Threat model: `THREAT_MODEL.md`
- Security policy: `SECURITY.md`
- Brand and license: `BRANDING_AND_LICENSE.md`
- Translation inventory: `README.i18n.md`
- Workflow skill (docs i18n): `.github/skills/docs-i18n-refresh/SKILL.md`
- Workflow skill (Headroom): `.github/skills/headroom-workflow/SKILL.md`

## 9. Tradeoff Note

These rules bias toward caution and surgical precision. For trivial
tasks (one-line typo, obvious rename, single-line import) use
judgment — not every change needs the full rigor. The goal is
reducing costly mistakes on non-trivial work, not slowing down
simple tasks.

---

**Attribution:** Karpathy 4 principles adapted from
`multica-ai/andrej-karpathy-skills` (MIT). ECC Copilot adapter
adapted from `affaan-m/ECC` (MIT).
