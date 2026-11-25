# Loop Configuration — cubecloud-agentic-os

| Pattern | Cadence | Status |
|---------|---------|--------|
| PR Babysitter | report-only, manual trigger (no scheduler wired) | L1 report-only |

## Why this pattern first

This repo's review load is PR-shaped: `gh pr list` is the source of truth for
what needs attention, CI signal is `gh pr checks`, reviewer signal is
`gh pr view --comments`. CI already runs the full desktop suite and the
i18n gate (see `.github/workflows/ci.yml`), so a report-only observer adds
value without any write authority.

## Limits

- Max fix attempts per PR: **0** (L1 — report only, no edits, no pushes)
- Auto-merge: **disabled, always**
- Watched: open PRs by the repo owner/author, excluding drafts unless asked
- Cadence: on-demand only. Nothing here schedules itself.

## Human Gates

- Security, auth, payments, infra, release/workflow files (`.github/workflows/**`)
- Any PR touching `agent-desktop/src/main/` IPC surface or secrets handling
- PRs with >10 files changed
- Anything the loop would need to push to `main` — always a human

## Safety

- The loop never merges, never pushes, never edits files, never edits CI.
- It reports; a human decides.
- Kill switch: stop invoking it; delete `pr-babysitter-state.md` to reset.
- See `loop-constraints.md` (binding) and `gate.yaml`.

## Budget

See `loop-budget.md`. Daily cap for this loop: **100k tokens**, report-only.
If a run is heading over, stop and log it.

## Escalation

When the loop cannot classify a PR (unknown required-check policy, conflicting
or missing signals, >10 files, security-labelled), it writes the PR number
into `pr-babysitter-state.md` under **Escalated** and stops. A human resolves.

## Notes for this repository

- Repo owners/maintainers: `JZKK720` (solo). "Team PR review" does not apply.
- CI job names that matter: `desktop-shell-checks`, `desktop-shell-dev-boot`,
  `desktop-shell-windows-packaging`, `Container smoke`, plus the i18n /
  mojibake / doc-pair / skill-count gates.
- `reviewDecision` is empty on this repo (no branch protection requiring
  review); treat it as "unknown", never as "approved".

## MCP usage

Not required for this pattern. PR babysitting reads PR metadata via
`gh`/`gh pr` (already authorized in this environment). No MCP server is
configured or needed. If someone later wires one up, record it here and
scope it read-only.

## Worktree isolation

L1 does not edit files, so no worktree is required. If this loop is ever
promoted to L2 (report + minimal-fix), each fix attempt must run in an
isolated worktree: `git worktree add .worktrees/loop-<pr>-<n> <branch>`,
discard on verifier reject, never run two attempts in the main checkout.

## Patterns registry

This repo tracks exactly one pattern (PR Babysitter, L1). See
`patterns/registry.yaml`.
