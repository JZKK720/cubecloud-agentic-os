# Loop Constraints — cubecloud-agentic-os

> Binding for any loop operating in this repo. Read before every run.

## Push & Merge
- Never push to `main`. Never merge a PR. Never force-push.
- Never edit `.github/workflows/**`, release scripts, or `scripts/check-*.cjs` gates.
- Never enable, disable, or weaken a CI job or a check.
- Never resolve review threads; only reply, and only with facts.

## Paths
- Never edit `.env*`, `**/secrets/**`, `**/credentials/**`, `**/*.pem`, `**/*_key*`.
- Never edit `docs/legal/**`, `LICENSE`, `BRANDING_AND_LICENSE.md` without a human.
- `agent-desktop/src/main/**` (IPC, shell spawn, file system) is human-review only.

## Code
- Loop reports; it does not fix, in L1.
- L2+ (if ever enabled) still obeys: one fix per run, no refactoring, ≤10 files,
  no test weakening, run `npm run typecheck` + `npm test` before claiming done.
- The i18n coverage gate (`scripts/check-i18n-coverage.cjs --strict`) must stay green.

## Communication
- State what was checked and how, with command output. No "done" without evidence.
- If required-check policy is unknown, report "Ready to merge: no" and escalate.

## Budget
- At 80% of the daily cap, switch to report-only and note it.
- At 100%, exit and log.
