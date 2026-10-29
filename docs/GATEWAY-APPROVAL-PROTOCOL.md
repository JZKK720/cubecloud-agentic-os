# Gateway approval handshake — upstream request

**Status:** proposed · **Blocks:** stopping a tool the gateway runs on its own

## The gap

Cubecloud can now refuse to *send* a request whose policy matches a deny or
require-approval rule. It cannot stop a tool that the Hermes gateway decides
to run mid-stream: that decision happens in the Python gateway, and the
desktop only learns about it afterwards.

Evidence from the current tree:

| Fact | Where |
|---|---|
| `hermes.ts` contains 0 `tool_calls`, 0 `executeTool`, 0 `runTool` | verified by search |
| The only gateway call is `POST /v1/chat/completions` | `hermes.ts` |
| `hermes.tool.progress` fires after execution | the comment at the call site |
| `ApprovalInbox` cannot block a gateway action | by design — it is desktop state |

So the current `requires_approval` flag is **telemetry**, not a control.

## What the gateway must add

A pre-execution handshake. Neoclaw's ACP host already has this shape
(`session/request_permission`), so the vocabulary is proven.

### 1. Before running a tool, emit a request and wait

```jsonc
// gateway -> desktop, on the SSE stream
event: hermes.tool.permission_request
data: {
  "requestId": "pr_01H...",
  "tool": "shell",
  "command": "rm -rf build",
  "matchedRule": "no-rm-rf",
  "deadlineMs": 30000
}
```

The gateway **must not execute** until it receives a decision or the
deadline passes.

### 2. Desktop replies out-of-band

```http
POST /v1/tools/permission
{ "requestId": "pr_01H...", "decision": "allow" | "deny", "reason": "..." }
```

### 3. Gateway emits the outcome

```jsonc
event: hermes.tool.permission_resolved
data: { "requestId": "pr_01H...", "decision": "deny", "executed": false }
```

## Rules the desktop will enforce

| Condition | Desktop behaviour |
|---|---|
| No decision within `deadlineMs` | reply `deny` (fail closed) |
| Decision endpoint unreachable | the gateway must **not** execute |
| Unknown `requestId` in a resolve | ignore, log |
| `decision: allow` for a rule that denies | gateway must refuse; policy lives in one place |

**Fail-closed is non-negotiable on both sides.** A handshake where "no
answer" means "run it" is not a gate.

## Until this lands

- The desktop gate covers everything on its own request path (see
  `src/main/chat-middleware.ts`).
- Post-hoc observations are surfaced honestly as *"ran without
  pre-approval"*, never as a block.
- `docs/DIVERGENCE.md` records the boundary so nobody claims a universal gate.
