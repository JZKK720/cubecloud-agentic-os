---
name: agent-desktop-audit
description: Full audit and smoke-test workflow for the Cubecloud Agent Desktop runtimes, sub-runtimes, IPC surface, CI gate, and asar integrity. Use when the task mentions "audit agent-desktop", "smoke test runtimes", "verify CI is real", "full audit before release", "are the runtimes working", "pre-merge checks", "release readiness", or "is this safe to ship".
license: Apache-2.0
metadata:
  author: Cubecloud Contributors
  source: https://github.com/JZKK720/cubecloud-agentic-os
  version: "1.0.0"
---

# Agent Desktop Audit

## Quick start

Use this workflow when a request touches any of these surfaces or
asks any of these questions:

- "audit agent-desktop", "smoke test the runtimes",
  "are Hermes / IronClaw / OpenClaw working"
- "verify CI is real" / "is the green CI lying"
- "full audit before release" / "release readiness"
- "pre-merge checks" / "is this safe to ship"
- any change to `agent-desktop/src/shared/runtime-orchestration.ts`,
  `agent-desktop/src/shared/agent-clis.ts`,
  `agent-desktop/src/preload/index.ts`, or
  `agent-desktop/.github/workflows/ci.yml`

The step-by-step ladder lives in the
[`audit` slash prompt](../../.github/prompts/audit.prompt.md). This
skill is the durable trigger + context; the slash prompt is the
executable recipe.

## First rule: assert test count > 0

`vitest.config.ts` has `passWithNoTests: true`. A green exit with
`Test Files 0` proves nothing. Always assert the vitest output
reports `Test Files > 0` and `Tests > 0`.

The CI gate (`.github/workflows/ci.yml` `desktop-shell-checks` job)
runs the full vitest suite on every PR (fixed in V2.10.73 —
previously referenced 3 nonexistent test files that
`passWithNoTests` silently masked). The old
`desktop-shell-electron-smoke` job (which referenced a nonexistent
`test:electron-smoke` script) was removed — CDP smokes need a
running dev electron and are a local/pre-release manual step.

## Second rule: do not upgrade vitest past 3.2.6

`agent-desktop/package.json` pins `vitest: ^3.2.6`. Vitest
4.1.4–4.1.8 has a suite-registration bug on this stack (Node
v24.14.0, Vite ^7.2.6): even a minimal
`describe("foo", () => it("bar", ...))` fails at the `describe`
line with `TypeError: Cannot read properties of undefined
(reading 'config')`. The 3.x line is the last one known to work.
The comment in `src/renderer/src/test/setup.ts` referencing
"Vitest 4" is stale; the real reason for the pin is the 4.x bug.

## Runtime surface (do not conflate tiers)

| Tier | What | Source of truth |
|---|---|---|
| 1 Core runtime agents | Hermes (8642), IronClaw (3231), OpenClaw (18789) | `agent-desktop/src/shared/runtime-orchestration.ts` (`RuntimeProviderId`) |
| 2 Integrated support surfaces | CodeGraph, EverOS, Headroom | `agent-desktop/src/main/{codegraph,everos,headroom}*.ts` |
| 3 User-managed third-party apps | Ollama, LM Studio, vLLM, Open WebUI, etc. | discovered via local scan / manual attach |
| 4 Coding-agent CLIs | 24-entry `AGENT_CLI_CATALOG` | `agent-desktop/src/shared/agent-clis.ts` (`discoverAgentClis()`) |

**IronClaw port:** the live source of truth is
`scripts/ironclaw-attach.smoke.cjs` → `http://127.0.0.1:3231/api/health`.
The "8281" in older docs is legacy. Do not add new code that
hard-codes 8281.

`copilot-cli` is one entry in tier 4, not a fourth runtime lane.

## Audit ladder (summary — full recipe in the slash prompt)

1. **Sync** — `git fetch origin main` + `git rev-list --left-right --count HEAD...origin/main`
2. **Typecheck** — `npm run typecheck --workspace cubecloud-agent-desktop`
3. **Full Vitest** — `npm run test --workspace cubecloud-agent-desktop` (assert `Test Files > 0`)
4. **Asar integrity** — `npm run verify:bundle --workspace cubecloud-agent-desktop`
5. **IPC audit** — `node scripts/audit-smoke-safe.cjs` (cwd `agent-desktop`)
6. **Doc/i18n checks** — `check-mojibake`, `check-skill-counts`, `check-doc-pair`, `check-i18n-coverage`
7. **Operator CLI smokes** — `hermes-agent-attach.smoke.cjs`, `ironclaw-attach.smoke.cjs` (need live gateways)
8. **CDP smokes** — `npm run smoke` (need `ENABLE_CDP=1 CDP_PORT=9222 npm run dev` running)
9. **CI reality check** — verify the 2 broken jobs are flagged, not trusted
10. **Report** — red/green table + one-line verdict

## What "working" means per runtime

- **Hermes**: `diagnoseRemoteConnection` probe → `runtime: "hermes"` on 200, green health dot within ~30s. Negative auth path returns `code: "auth"`. See `docs/hermes-agent-attach.smoke.md`.
- **IronClaw**: `probeLocalModelHealth` → `reachable=true`. Negative token path returns auth failure. See `docs/ironclaw-attach.smoke.md`.
- **OpenClaw**: optional third lane; fallback path when Hermes is unreachable. Pinned in `tests/hermes-agent-attach.smoke.test.ts`.
- **CodeGraph / EverOS / Headroom**: covered by `tests/codegraph*.test.ts`, `tests/everos-sidecar.test.ts`, `tests/headroom-*.test.ts` (5 files). CDP smoke `verify-step3-4-ipc.js` covers the 12 new IPC channels for CodeGraph runtime + EverOS sidecar.

## Security-floor invariants (pinned by smokes)

- The Hermes/IronClaw probes **never** read `HERMES_TEST_TOKEN` /
  `IRONCLAW_TEST_TOKEN` when `apiKey: undefined`. Pinned in
  `tests/hermes-agent-attach.smoke.test.ts` and
  `tests/ironclaw-attach.smoke.test.ts`.
- Never echo or log the token. The smoke scripts print PASS/FAIL +
  latency only.

## Related files

- Slash prompt (executable recipe): [`../../.github/prompts/audit.prompt.md`](../../.github/prompts/audit.prompt.md)
- Inner workspace rules: [`../../agent-desktop/AGENTS.md`](../../agent-desktop/AGENTS.md) (Validation section)
- Root workspace rules: [`../../AGENTS.md`](../../AGENTS.md) §5
- Hermes runbook: [`../../docs/hermes-agent-attach.smoke.md`](../../docs/hermes-agent-attach.smoke.md)
- IronClaw runbook: [`../../docs/ironclaw-attach.smoke.md`](../../docs/ironclaw-attach.smoke.md)
- CI workflow: [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- CI fix draft (not applied): [`../../docs/plans/ci-yml-fix.draft.md`](../../docs/plans/ci-yml-fix.draft.md)
