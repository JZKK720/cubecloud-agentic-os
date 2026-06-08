# EverOS sidecar

> **Cubecloud-original work (2026).** Distributed under the dual
> license per [`LICENSE`](../LICENSE) (AGPL-3.0-or-later OR
> Apache-2.0 OR MIT); see [`BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
> for the per-path provenance breakdown. The `everos server start`
> Python CLI is its own third-party project; this document only
> covers Cubecloud's lifecycle wrapper.
>
> SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

The EverOS screen has two transports:

1. **HTTP client** (the historical path) — `src/main/everos.ts` makes
   REST calls against a self-hosted EverOS / EverCore instance at a
   user-configured `remoteUrl`. Works against any reachable host,
   including remote ones over SSH.
2. **Embedded sidecar** (this module) — `src/main/everos-sidecar.ts`
   owns a long-lived `everos server start` Python child process on the
   same machine as the desktop, with full lifecycle supervision
   (auto-restart, crash-window cap, log ring, graceful shutdown).

This document covers (2). For (1), see the existing `everos:*` HTTP
channels in `src/main/index.ts` — those are unchanged. The sidecar is
**purely additive**: a user with a remote EverOS keeps using the HTTP
channels, a user who wants the desktop to manage a local `everos
server start` process uses the sidecar. Both can be configured at the
same time.

## Why a sidecar

The recommended deployment for EverOS today is `pip install everos` on
the same machine as the desktop and then `everos server start`. The
HTTP client path assumes the user is willing to start the server
themselves; the sidecar removes that step. The desktop then:

- **Survives crashes.** If the Python process dies on a transient
  OOM, the desktop auto-restarts it 1.5s later without the user
  noticing.
- **Surfaces a useful lifecycle card.** Stop / Restart buttons, a
  200-line log tail, a state pill (stopped / starting / running /
  crashed), and a crash counter that the user can read at a glance.
- **Shuts down cleanly.** `before-quit` sends SIGTERM with a 3s
  SIGKILL fallback so a stuck child can't block app exit.

The tradeoff: EverOS is no longer a declared dependency of the
desktop. The `everos` Python wheel is a runtime-only thing the user
installs separately. The sidecar resolves the binary via PATH lookup
the same way the CodeGraph runtime resolves the npm SDK, and degrades
to a friendly "EverOS binary not found" reason if it's missing.

## Spawn contract

```ts
spawn(binary, [
  "server", "start",
  "--host", host,   // default 127.0.0.1
  "--port", port,   // default 1995
], {
  cwd: HERMES_HOME,
  env: { ...process.env, EVEROS_HOME, PYTHONUNBUFFERED: "1", PATH },
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});
```

Key choices:

- **`127.0.0.1` by default**, not `0.0.0.0`. The service is meant to
  be loopback-only; a multi-tenant box shouldn't accidentally expose
  the user's local EverOS to the LAN.
- **`PYTHONUNBUFFERED=1`** so stdout/stderr lines reach the log ring
  in real time. Without it, the Python child would buffer and the
  user would see empty log tail for tens of seconds.
- **`EVEROS_HOME`** passed in so the server finds its config next to
  the desktop's `HERMES_HOME`. Keeps state.db, knowledge, and any
  in-process caches co-located with the rest of the user's data.
- **`windowsHide: true`** so the Python child doesn't pop a console
  window on Windows. The user's taskbar stays clean.

## Lifecycle

```
                 ┌──────────┐
   start() ─────▶│ starting │────── /health OK ─────┐
                 └──────────┘                        ▼
                     │                          ┌──────────┐
                     │ /health 8s timeout       │ running  │
                     ▼                          └──────────┘
                 ┌──────────┐                        │
                 │ starting │                        │ close(code≠0)
                 │ (timed   │                        ▼
                 │  out)    │                  ┌──────────┐
                 └──────────┘                  │ crashed  │
                                                └──────────┘
                                                     │
                                crashCount ≤ 5       │  crashCount > 5
                                                     ▼
                                              ┌──────────┐
                                              │ crashed  │
                                              │ (no      │
                                              │  restart)│
                                              └──────────┘
```

- **`starting`** — `startEverOsSidecar()` spawned the child. We're
  probing `/health` in the background. If the probe succeeds, we flip
  to `running`. If it never succeeds within 8s, the close handler
  still fires (when the process exits) and the state machine
  continues from there.
- **`running`** — `/health` returned 200. `uptimeMs` is computed live
  on every `getEverOsSidecarStatus()` call, so the renderer doesn't
  need its own clock.
- **`crashed`** — child exited unexpectedly. The crash-window
  counter increments. If we're below the cap, we schedule a
  `setTimeout(..., 1500)` to call `startEverOsSidecar()` again with
  the same port + host. If we're at the cap, the state stays
  `crashed` with `reason` containing "auto-restart cap reached" and
  we **don't** schedule a restart.
- **`stopped`** — `stopEverOsSidecar()` was called or `start()`
  found no `everos` binary on PATH. The close handler will treat a
  child exit that happens in this state as a normal stop (no crash
  recorded, no auto-restart).

### Crash window

```ts
const CRASH_WINDOW_MS = 60_000;       // 60 seconds
const MAX_CRASHES_IN_WINDOW = 5;       // hard cap
```

The cap is **5 crashes per 60s** sliding window. Each crash pushes
a wall-clock timestamp into `runtime.crashTimestamps`; the close
handler calls `pruneCrashWindow()` first, dropping entries older
than 60s. If the post-prune length is `> 5`, the cap is exceeded and
no restart is scheduled.

`pruneCrashWindow()` runs at the start of `recordCrash()`, not on a
timer. So a crash that lands at T+70s relative to the first one
sees the older one drop off automatically. The user gets a 60s "cool
down" before the counter fully resets.

A **user-triggered `restart()`** clears `crashTimestamps` entirely.
This is intentional: if the user clicks "Restart" they're explicitly
saying "I know what I did, try again from scratch" — they shouldn't
have to wait 60s for the cap to clear.

A process that exits during `starting` (i.e. before the `/health`
probe has flipped the state to `running`) is treated as a stop, **not
a crash**. This protects the user's first "Start" from burning
restart credits on a Python install that simply doesn't exist — the
"EverOS binary not found" reason comes from the spawn path before
the child is even created.

### Graceful shutdown

`stopEverOsSidecar()` marks the state as `stopped` first (so the
close handler doesn't count the exit as a crash), then sends SIGTERM.
A `setTimeout(STOP_TIMEOUT_MS = 3000)` schedules a SIGKILL fallback
for the case where SIGTERM is ignored:

```ts
try { child.kill("SIGTERM"); } catch { /* noop */ }
setTimeout(() => {
  if (runtime.child === child && !child.killed) {
    try { child.kill("SIGKILL"); } catch { /* noop */ }
  }
}, STOP_TIMEOUT_MS);
```

The closure captures `child` by reference and re-checks
`runtime.child === child` inside the timer to avoid racing with a
restart that may have started a new child in the meantime.

`before-quit` calls `stopEverOsSidecar()` in a try/catch so a
missing binary, an already-dead process, or a stray exception
**never blocks app exit**. Worst case the OS-level cleanup kills the
child as part of tearing down the Electron process tree.

## IPC surface

| Channel | Renderer method | Purpose |
|---------|-----------------|---------|
| `everos-sidecar-status` | `everosSidecarStatus()` | Probe `state` + `pid` + `port` + `baseUrl` + `lastError` + `crashCount` + `startedAt` + `uptimeMs` + `reason`. Cheap; no I/O. |
| `everos-sidecar-start` | `everosSidecarStart(options?)` | Resolve the binary, spawn the child, set state to `starting`, kick off the health probe. Idempotent — returns the current status if a child is already alive. |
| `everos-sidecar-stop` | `everosSidecarStop()` | Send SIGTERM (and SIGKILL after 3s). Mark state as `stopped` so the close handler doesn't count it as a crash. |
| `everos-sidecar-restart` | `everosSidecarRestart(options?)` | Clear `crashTimestamps`, then call `stop()` + `start()`. Bypasses the auto-restart cap. |
| `everos-sidecar-log-tail` | `everosSidecarLogTail()` | Return the in-memory ring buffer (last 200 lines) + total bytes. Each call returns a fresh array — no shared reference. |
| `everos-sidecar-clear-logs` | `everosSidecarClearLogs()` | Wipe the ring + clear `lastError`. |

All channels return typed envelopes and never throw. Failures show up
as `state: "stopped"` or `state: "crashed"` with a `reason` field
that the renderer can render verbatim.

## Renderer wiring

`src/renderer/src/screens/EverOS/EverOS.tsx` exposes the sidecar as
a lifecycle card inside the existing EverOS screen. The card
contains:

- **State pill** — color-coded badge: gray (stopped), amber
  (starting), green (running), red (crashed), blue (exited).
- **Status fields** — pid, port, baseUrl, startedAt, uptimeMs,
  crashCount, lastError, reason. Read on mount and after every
  start/stop/restart/clear-logs click.
- **Action buttons** — Start, Stop, Restart, Refresh, Clear logs.
  Each calls the matching IPC channel and re-fetches status on
  success.
- **Log tail** — a `<details>` panel that shows the last 200 lines
  with line numbers and `[stdout]` / `[stderr]` tags. Collapsed by
  default to keep the screen scannable.

The card's data is best-effort — if the sidecar IPC is unavailable
(e.g. a future build that doesn't include the sidecar at all), the
card hides itself rather than showing a broken UI.

## Log ring

The runtime keeps a bounded ring of the last **200 lines** of
stdout + stderr in `runtime.logRing`. When the buffer is full, the
oldest line is shifted off and `logBytes` is decremented
accordingly. The renderer pulls this via `everos-sidecar-log-tail`
and renders it as a scrollable pre block.

Lines are tagged with `[stdout]` / `[stderr]` so the user can
distinguish normal output from errors at a glance. The first
non-empty stderr line is also captured as `lastError` (truncated to
240 chars) so the renderer can render a "why did this fail" hint
without polling the log.

There is **no log file** in V1. The log lives in the main-process
heap and is gone when the desktop exits. This is fine for the
restart-loop debugging use case; for long-term archival a future
iteration can add an opt-in `app.getPath('logs')/everos.log` sink.

## Testing

`tests/everos-sidecar.test.ts` has 12 unit tests covering:

- Status probe returns stable defaults when nothing is running
- `start()` reports a friendly `reason` when the binary is missing
  (no throw, no spawn)
- `start()` with an injected binary flips state to `starting` and
  reports the child's pid
- `start()` is idempotent (second call is a no-op)
- `close` after `stop()` flips state to `stopped` (not crashed)
- `close` during `starting` is treated as a stop, not a crash —
  protects the first Start from burning restart credits
- `stop()` is a safe no-op when nothing is running
- Log tail is empty by default and returns a fresh array per call
- `clearLogs()` resets the tail and the `lastError`
- User-triggered `restart()` bypasses the auto-restart cap
- `start()` forwards `port` + `host` overrides
- **5 crashes in 60s auto-restart, the 6th disables auto-restart
  with a "cap reached" reason** — pins the safety policy, exercises
  `waitForReady()` + `setTimeout` + `recordCrash()` with fake timers,
  and asserts that a user `restart()` re-arms the cap

The tests mock `child_process`, `./installer`, and `fetch` (only for
the crash-cap test) so no real Python, PATH lookup, or HTTP probe
runs. The mocks are hoisted so the sidecar can grab them at module
load. Tests run in ~50ms total.

## Future work

- **Configurable log file sink** — write `[stdout]` / `[stderr]`
  lines to `app.getPath('logs')/everos-sidecar.log` with rotation,
  so the user can grep a long session.
- **Health-probe backoff** — currently the probe polls every 250ms
  for 8s. Exponential backoff would be kinder to a slow-booting
  Python install without extending the 8s ceiling.
- **Auto-update sidecar** — when the user upgrades the desktop, ask
  them if they want to upgrade the `everos` wheel too, instead of
  leaving them on the version their last `pip install` happened to
  pull.
