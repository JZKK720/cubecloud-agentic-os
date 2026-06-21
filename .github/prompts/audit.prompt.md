---
description: Run the full agent-desktop audit and smoke-test ladder. Use when verifying runtimes, sub-runtimes, IPC, CI, and asar integrity are in working condition before a release or after a risky change.
---

# /audit — Full agent-desktop audit & smoke ladder

You are a release-readiness auditor. Walk the ladder top to bottom. Do not skip steps. Report red/green per step with the exact command and the key output line. Stop and surface the issue if any step is red — do not paper over it.

## Step 0 — Sync state

```
git fetch origin main
git rev-list --left-right --count HEAD...origin/main
```

Report behind/ahead counts. If local is behind, stop and tell the user to sync first.

## Step 1 — Typecheck (narrowest first)

```
npm run typecheck --workspace cubecloud-agent-desktop
```

If the change touches `packages/platform-core/`, also run `npm run typecheck` at the repo root. Green = exit 0, no TS errors.

## Step 2 — Full Vitest suite (assert count > 0)

```
npm run test --workspace cubecloud-agent-desktop
```

**Critical:** `vitest.config.ts` has `passWithNoTests: true`. A green exit with `Test Files 0` proves nothing. Assert the output reports `Test Files > 0` and `Tests > 0`. If either is 0, stop — this is the known CI-mask bug.

If a single test is red, isolate it: `npm.cmd exec vitest run tests/<slice>.test.ts` (cwd `agent-desktop`).

## Step 3 — Asar integrity regression

```
npm run verify:bundle --workspace cubecloud-agent-desktop
```

Runs `tests/release-bundle.test.ts`. Verifies the packaged asar has no stray files, no broken preload paths, no brand-pack drift.

## Step 4 — IPC surface audit (static, no process)

```
cd agent-desktop
node scripts/audit-smoke-safe.cjs
```

Reports the `ipcRenderer.invoke("...")` channel categorization. "Unknown / not categorized" count should be 0 or explicitly justified. A spike here means a new IPC channel was added without preload/main wiring.

## Step 5 — Doc & i18n checks (run from repo root)

```
node scripts/check-mojibake.cjs
node scripts/check-skill-counts.cjs
node scripts/check-doc-pair.cjs
node scripts/check-i18n-coverage.cjs
```

All four are hard-fail in CI. Mojibake scan must report 0 U+FFFD. Skill-counts must find no hard-coded skill counts in prose. Doc-pair must report EN/ZH section parity. i18n-coverage must report no missing locale files/keys (or `--strict` will fail).

## Step 6 — Operator CLI smokes (need live gateways — skip if no gateway running)

Only run if the operator has Hermes and/or IronClaw running locally.

```
$env:HERMES_TEST_TOKEN="<token>"; node scripts/hermes-agent-attach.smoke.cjs
$env:IRONCLAW_TEST_TOKEN="<token>"; node scripts/ironclaw-attach.smoke.cjs
```

Both probe `/health` (Hermes 8642, IronClaw 3231) and print PASS/FAIL + latency. Never echo the token. If no gateway is running, report "skipped — no live gateway" and move on.

## Step 7 — CDP / Playwright smokes (need a running dev electron)

Terminal 1:
```
cd agent-desktop
$env:ENABLE_CDP=1; $env:CDP_PORT=9222; npm run dev
```

Wait for the renderer to be ready. Terminal 2:
```
cd agent-desktop
npm run smoke
```

Runs `scripts/smoke-all.js` → 4 child suites: `verify-step3-4-ipc.js` (12 new IPC channels), `verify-everything.js` (~80 read-only + in-staging channels), `verify-nous-discovery.js` (network-dependent, skipped unless `INCLUDE_NETWORK_SUITE` set), `preview-mock-gateway.js`. Exits 1 if any red.

If the dev electron cannot start (missing native deps, port conflict), report "skipped — dev electron did not start" and move on.

## Step 8 — CI reality check

Open `.github/workflows/ci.yml`. Verify:
- `desktop-shell-checks` job: runs `npm run test` (the full suite). Fixed in V2.10.73 — previously referenced 3 nonexistent test files. Confirm the step says `npm run test` (not the old `npm run test -- App.gateway.dom.test.tsx ...` form).
- `desktop-shell-electron-smoke` job: removed in V2.10.73 (it referenced a nonexistent `test:electron-smoke` script). Confirm it's gone.
- `desktop-shell-windows-packaging` job: runs real scripts (`build:win` + `verify:bundle`). Trustworthy.

If any of these have regressed (e.g. someone re-added the broken job), flag it.

## Step 9 — Report

Produce a table:

| Step | Command | Result | Notes |
|---|---|---|---|
| 0 Sync | `git rev-list --left-right --count HEAD...origin/main` | green | 0/0 |
| 1 Typecheck | `npm run typecheck --workspace cubecloud-agent-desktop` | green | |
| ... | ... | ... | ... |

End with a one-line verdict: "Release-ready" or "Blocked: <step> <reason>".
