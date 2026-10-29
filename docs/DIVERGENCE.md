# Divergence log

Intentional gaps between this build and the references it derives from.
Every entry states the boundary plainly so no one claims more than the code does.

## Approval and governance

| Area | Reference behaviour | This build | Reason |
|---|---|---|---|
| Approval gate placement | Gateway-side (`requires_approval` on tool progress) | **Desktop preflight only** — the policy chain decides before a request is sent | The desktop does not execute tools; `hermes.ts` has 0 `tool_calls`/`executeTool`. Awaiting a post-hoc event would delay the transcript, not the action. |
| Tool run autonomously by the gateway | Not addressed upstream either | **Cannot be blocked.** Surfaced as "ran without pre-approval" | Needs the handshake in `docs/GATEWAY-APPROVAL-PROTOCOL.md`, which does not exist yet. |
| `require_approval` with no approver | Annotated and continued | **Blocks** (fail closed) | A missing approver is a wiring bug, not permission. |
| Policy evaluation error | Fail open (returned `applied: false`) | **Blocks** — but only for the middleware's *own* verdict | A gate that opens on error is not a gate. The scope matters: see "Catch scope" below. |
| Approval status for expiry | `expired` | `timeout`, resolving to deny | A lapsed approval is a denial and the status should say so. |
| Post-hoc callback name | `onToolApprovalRequired` | `onToolApprovalObserved` | It fires after execution. The old name implied a control that did not exist. |

### Catch scope

The preflight chain in `hermes.ts` deliberately does **not** convert every
throw into a denial. Only a *policy verdict* blocks. A throw from config
lookup, the harness registry, or an optional middleware is logged and the
request proceeds.

This was narrowed after merging `origin/main`, which introduced the Laya
System-1 chain. That chain calls `getConfigValue()`, absent from six
existing test config mocks. The earlier fail-closed catch turned that setup
`TypeError` into `decision: "error"` for every request, so the whole suite
reported "blocked by a security rule". A gate that denies on unrelated
setup failures is not fail-closed, it is broken — it denies everything.

The security boundary that must fail closed is the tool-policy
middleware's own evaluation error, and that is still asserted in
`middleware-block.test.ts`. `hermes-preflight.test.ts` now pins the
narrowed contract in both directions: it asserts the error is logged and
that `reason: "policy chain failed"` does not reappear.

### Laya middleware conflict

Merging `origin/main` conflicted in `finalizePreparedRequest`. Main added
`createLayaBeforeModelChain(...)` into the same chain this branch builds.

Resolution: keep main's Laya chain at its position in the chain (it is a
peer middleware, order-independent from the tool-policy gate), and keep
this branch's block handling **downstream**, at the two dispatch sites that
`await finalizePreparedRequest()` and call `blockRequest()`. Neither
feature was weakened: Laya still runs pre-model, and a block still aborts
before anything is sent.


## Verification

| Check | Result |
|---|---|
| Remove the `deny` block channel in `chat-middleware.ts` | 5 tests fail (`middleware-block`, `chat-gate`) |
| Make a timeout resolve to approve | 2 tests fail (`inbox.test.ts`) |
| Remove `onToolApprovalObserved` from `index.ts` | 1 test fails (`wiring-approval.test.ts`) |
| Ignore `blocked` at the dispatch site | 1 test fails (`hermes-preflight.test.ts`) |

Run: `cd agent-desktop && npx vitest run`

Suite totals at this commit: **1,639 passed, 2 failed, 10 skipped**
(1,651 tests).

### The 2 failures are pre-existing (verified, not assumed)

Both are in `tests/hermes-cli-session-id.test.ts` — cold-gateway timing
where `startGateway()` returns false.

Proven by checking out **pure `origin/main` (`9230943`)** in the same
working directory (so real `node_modules`, no worktree shims) and running
the file. The approval branch's files are absent at that commit
(`src/main/approval/inbox.ts` and `tests/middleware-block.test.ts` both do
not exist), and the same 2 tests fail with the same names:

```
FAIL tests/hermes-cli-session-id.test.ts > CLI fallback session id
     propagation > waits for a cold gateway to become API-ready instead
     of falling back to CLI
FAIL tests/hermes-cli-session-id.test.ts > CLI fallback session id
     propagation > re-checks health when a previously-ready local gateway
     is restarted cold
```

`git log -- agent-desktop/tests/hermes-cli-session-id.test.ts` shows it was
last touched by main's own `cbd1dc3`; the approval branch never modified
it. So these 2 are **upstream breakage, not introduced by this work** —
stated plainly because "pre-existing" is a claim that deserves evidence.

An earlier attempt to prove this used a `git worktree`, which reported
"no tests" — the worktree needed junction links for `node_modules` and
`@cubecloud/platform-core`, so that run proved nothing and is superseded by
the same-directory checkout above.

### CI: `desktop-shell-checks` was already red on main

The Linux CI job reports **6** failures, not 2 — 4 more than Windows shows,
because `codegraph` and `cronjobs` are platform-sensitive. None are from
this work:

Run on `main` at `9230943` (the commit this branch merged from), job
`38530129025`, failed with **exactly the same 6 tests, same names**:

| # | Test file | Test |
|---|---|---|
| 1 | `codegraph.test.ts` | detects a Windows npm-style codegraph launcher and reads its version |
| 2 | `codegraph.test.ts` | installs CodeGraph globally through npm when requested |
| 3 | `codegraph.test.ts` | configures the Hermes target through CodeGraph install |
| 4 | `cronjobs.test.ts` | passes the prompt as the cron create positional argument before flags |
| 5 | `hermes-cli-session-id.test.ts` | waits for a cold gateway to become API-ready instead of falling back to CLI |
| 6 | `hermes-cli-session-id.test.ts` | re-checks health when a previously-ready local gateway is restarted cold |

Tests 1–4 are Linux-vs-Windows assumptions: `codegraph` expects Windows
launcher paths, and `cronjobs` expects `-m hermes_cli.main` while the
runner resolves the shell wrapper `/home/runner/.hermes/hermes-agent/hermes`.
Tests 5–6 are the cold-gateway timing pair.

`gh run list --branch main` shows the last 6 runs on `main` **all**
`failure`. This branch therefore does not regress CI; it inherits a red
baseline. Fixing the four platform-sensitive tests is a separate piece of
work and is **not** claimed here.



## Test-quality note

`tests/approval-loop.test.ts` previously asserted that strings appeared in
source files (`expect(indexSrc).toContain('ipcMain.handle(...)')`). That test
passed while the feature was completely unwired, which is how the defect
survived review. It has been replaced with behavioural assertions.
