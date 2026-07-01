# Agent Instructions — agent-desktop

`agent-desktop` is the active implementation target for this workspace.
The upstream `hermes-desktop` is a legacy reference only: use it for
comparison when needed, but do not add new runtime, build, or workflow
dependencies on a local legacy clone.

For cross-tool project rules (build commands, brand-pack source of
truth, swappable-surface contract, i18n workflow, security floor), see
the workspace-root [`AGENTS.md`](../AGENTS.md) at the repo root. This
file is the **desktop-only** supplement.

## Default Skills (apply automatically)

These skills live in `.agents/skills/<name>/SKILL.md` or
`.github/skills/<name>/SKILL.md`. Load them when the trigger applies:

| Trigger | Skill |
|---|---|
| Any non-trivial code work in this workspace | `karpathy-guidelines` (`.agents/skills/karpathy-guidelines/SKILL.md`) |
| Renderer UI, CSS, onboarding, welcome, setup, empty states | `design-taste-frontend` (`.agents/skills/design-taste-frontend/SKILL.md`) |
| README translations, screenshot refresh, PDF re-render, i18n sync | `.github/skills/docs-i18n-refresh/SKILL.md` |
| Headroom, context compression, large logs, CodeGraph bundle compression | `.github/skills/headroom-workflow/SKILL.md` |
| Full audit / smoke test of agent-desktop runtimes, sub-runtimes, IPC, CI | `.github/skills/agent-desktop-audit/SKILL.md` |

> **Note:** A previous version of this file referenced
> `electron-pro` and `typescript-expert` skills that do not exist in
> this repo. They were a carry-over from another workspace. Do not
> load them.

## Working Rules

- Start from the owning file, symbol, test, or failing behavior
  before editing. Use `grep_search` for cross-file references and
  `semantic_search` for symbol-level lookups.
- Make the smallest falsifiable change first, then validate
  immediately.
- Keep onboarding and provider copy truthful to the app's current
  Hermes-backed capabilities. Do not promise OpenClaw or IronClaw
  features that are not yet wired into the desktop.
- Reuse existing hooks, preload bridges, provider plumbing, and
  CSS patterns before adding abstractions. The patterns live in
  `src/renderer/src/components/`, `src/main/`, and
  `src/preload/index.ts`; check them first.
- Do not spread inherited Hermes branding into new
  Cubecloud-facing surfaces. The brand pack at
  `../docs/logos/logo.svg/` is the canonical source — do not
  hand-roll a new logo.
- Do not revert unrelated user changes. The git log between HEAD
  and `origin/main` is sacred.

## Repo Boundaries

- Build and implement in `agent-desktop` unless the user
  explicitly asks for another target.
- Treat upstream `hermes-desktop` as comparison material while the
  rebrand and provenance cleanup continues.
- If you adapt code or copy from the legacy repo, rewrite it to
  current Cubecloud naming, assets, and contracts before landing it.
- Do not reintroduce hard references to a local `hermes-desktop`
  path in docs, tests, workflows, or runtime code.

## Validation

Prefer the narrowest relevant check first. The full audit ladder
lives in the [`audit` slash prompt](../.github/prompts/audit.prompt.md)
and the [`agent-desktop-audit` skill](../.github/skills/agent-desktop-audit/SKILL.md);
this section is the quick-reference.

- **Single test** (fastest feedback):
  `npm.cmd exec vitest run tests/<slice>.test.ts` (cwd `agent-desktop`)
- **One workspace typecheck** (when shared contracts change):
  `npm run typecheck --workspace cubecloud-agent-desktop`
- **Full desktop test suite** (before opening a PR):
  `npm run test --workspace cubecloud-agent-desktop`
- **Monorepo typecheck** (only if the change touches
  `packages/platform-core/`):
  `npm run typecheck` (at the repo root)
- **Asar integrity regression**:
  `npm run verify:bundle --workspace cubecloud-agent-desktop`
  (runs `tests/release-bundle.test.ts`)
- **IPC surface audit** (static, no process needed):
  `node scripts/audit-smoke-safe.cjs` (cwd `agent-desktop`) —
  categorizes every `ipcRenderer.invoke("...")` channel and reports
  uncategorized count.
- **Operator CLI smokes** (need live gateways, run from repo root):
  `node scripts/hermes-agent-attach.smoke.cjs` (Hermes 8642) and
  `node scripts/ironclaw-attach.smoke.cjs` (IronClaw 3231). Both
  read `HERMES_TEST_TOKEN` / `IRONCLAW_TEST_TOKEN` from env and
  never echo the key. See `docs/hermes-agent-attach.smoke.md` and
  `docs/ironclaw-attach.smoke.md` for the runbooks.
- **CDP / Playwright smokes** (need a running dev electron):
  start `ENABLE_CDP=1 CDP_PORT=9222 npm run dev` in one terminal,
  then `npm run smoke` (runs `scripts/smoke-all.js` → 4 child suites:
  `verify-step3-4-ipc.js`, `verify-everything.js`,
  `verify-nous-discovery.js`, `preview-mock-gateway.js`).
- **Windows packaging** (only for build/packaging/installer
  changes): `npm run build:win --workspace cubecloud-agent-desktop`
  followed by `npm run verify:bundle --workspace cubecloud-agent-desktop`

### CI gate (now real)

The root `.github/workflows/ci.yml` `desktop-shell-checks` job runs the
**full** agent-desktop vitest suite (`npm run test`) on every PR. The
old `desktop-shell-electron-smoke` job (which referenced a nonexistent
`test:electron-smoke` script) was removed in V2.10.73 — CDP smokes
need a running dev electron and are a local/pre-release manual step
(see the [`audit` slash prompt](../.github/prompts/audit.prompt.md)).

`vitest.config.ts` still has `passWithNoTests: true`, so always assert
the vitest output reports `Test Files > 0` and `Tests > 0` — a green
exit with zero tests proves nothing.

### Vitest pin (load-bearing)

`agent-desktop/package.json` pins `vitest: ^3.2.6`. **Do NOT upgrade
past 3.2.6.** Vitest 4.1.4–4.1.8 has a suite-registration bug on this
stack (Node v24.14.0, Vite ^7.2.6): even a 6-line
`describe("foo", () => it("bar", ...))` fails at the `describe` line
with `TypeError: Cannot read properties of undefined (reading 'config')`.
The 3.x line is the last one known to work. The comment in
`src/renderer/src/test/setup.ts` that references "Vitest 4" is stale;
the real reason for the pin is the 4.x bug, not a 4.x feature.

### Runtime ports (authoritative)

| Runtime | Port | Source of truth |
|---|---|---|
| Hermes | 8642 | `scripts/hermes-agent-attach.smoke.cjs`, `docs/hermes-agent-attach.smoke.md` |
| IronClaw | 3231 | `scripts/ironclaw-attach.smoke.cjs` (defaults to `http://127.0.0.1:3231/api/health`). The "8281" in older docs is legacy. |
| OpenClaw | 18789 | `agent-desktop/src/shared/runtime-orchestration.ts` |

`RuntimeProviderId` and `TaskOrchestratorId` live in
`agent-desktop/src/shared/runtime-orchestration.ts`. The 24-entry
`AGENT_CLI_CATALOG` (tier 4, PATH-discovered via `discoverAgentClis()`)
lives in `agent-desktop/src/shared/agent-clis.ts` and is **not** a
runtime lane.

## Cross-References

- Workspace root rules: [`../AGENTS.md`](../AGENTS.md)
- Workspace Copilot rules: [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
- One-screen handbook: [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)
- Threat model: [`../THREAT_MODEL.md`](../THREAT_MODEL.md)
- Security policy: [`../SECURITY.md`](../SECURITY.md)
- Brand + license: [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
- Translation inventory: [`../README.i18n.md`](../README.i18n.md)
- Combined README PDF: [`../docs/Cubecloud-README-en-zh.pdf`](../docs/Cubecloud-README-en-zh.pdf)
- Brand pack source of truth: [`../docs/logos/logo.svg/`](../docs/logos/logo.svg/)
- i18n workflow skill: [`../.github/skills/docs-i18n-refresh/SKILL.md`](../.github/skills/docs-i18n-refresh/SKILL.md)
- Headroom workflow skill: [`../.github/skills/headroom-workflow/SKILL.md`](../.github/skills/headroom-workflow/SKILL.md)
