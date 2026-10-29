# Divergence log

Intentional gaps between this build and the references it derives from.
Every entry states the boundary plainly so no one claims more than the code does.

## Approval and governance

| Area | Reference behaviour | This build | Reason |
|---|---|---|---|
| Approval gate placement | Gateway-side (`requires_approval` on tool progress) | **Desktop preflight only** — the policy chain decides before a request is sent | The desktop does not execute tools; `hermes.ts` has 0 `tool_calls`/`executeTool`. Awaiting a post-hoc event would delay the transcript, not the action. |
| Tool run autonomously by the gateway | Not addressed upstream either | **Cannot be blocked.** Surfaced as "ran without pre-approval" | Needs the handshake in `docs/GATEWAY-APPROVAL-PROTOCOL.md`, which does not exist yet. |
| `require_approval` with no approver | Annotated and continued | **Blocks** (fail closed) | A missing approver is a wiring bug, not permission. |
| Policy evaluation error | Fail open (returned `applied: false`) | **Blocks** | A gate that opens on error is not a gate. |
| Approval status for expiry | `expired` | `timeout`, resolving to deny | A lapsed approval is a denial and the status should say so. |
| Post-hoc callback name | `onToolApprovalRequired` | `onToolApprovalObserved` | It fires after execution. The old name implied a control that did not exist. |

## Verification

| Check | Result |
|---|---|
| Remove the `deny` block channel in `chat-middleware.ts` | 5 tests fail (`middleware-block`, `chat-gate`) |
| Make a timeout resolve to approve | 2 tests fail (`inbox.test.ts`) |
| Remove `onToolApprovalObserved` from `index.ts` | 1 test fails (`wiring-approval.test.ts`) |
| Ignore `blocked` at the dispatch site | 1 test fails (`hermes-preflight.test.ts`) |

Run: `cd agent-desktop && npx vitest run`

## Test-quality note

`tests/approval-loop.test.ts` previously asserted that strings appeared in
source files (`expect(indexSrc).toContain('ipcMain.handle(...)')`). That test
passed while the feature was completely unwired, which is how the defect
survived review. It has been replaced with behavioural assertions.
