---
name: runtime-attach
description: Debug a runtime attach failure on the cubecloud-agent-desktop. Use when the user says "the runtime won't connect", "chat returns 'connection refused'", "I picked Hermes but the sidebar still says 'no runtime'", "IronClaw attach fails", "SSH tunnel won't open", or describes a port / network issue. Triggers: runtime not detected, attach error, ECONNREFUSED, ETIMEDOUT, "127.0.0.1:8642", "127.0.0.1:3231", "127.0.0.1:18789".
source: cubecloud
metadata:
  audience: end-user
  surface: Welcome, Install, Settings
  related_skills: [first-5-minutes, models-page-scan, electron-pro, windows-desktop-e2e]
---

# Runtime Attach

The four runtime lanes, the four ways to attach to them, and the
five things to check when an attach fails.

## When to use

Use this skill when:

- The desktop's sidebar shows **"No runtime"** after first-run install.
- The user clicks **Send** in chat and gets "connection refused" or
  a timeout.
- The user picked a runtime lane and the desktop never advanced
  past the spinner.
- The user is trying to attach to a runtime on a **remote** host
  (over HTTPS) or via **SSH tunnel** and the connection drops.

## The three runtime lanes

| Lane | Default port | Health probe | Install method |
|---|---|---|---|
| **Hermes** | 8642 | `GET /v1/models` | First-run local install runs the official installer |
| **IronClaw** | 3231 | `GET /v1/models` (after SSH tunnel) | Always remote — desktop never spawns IronClaw locally |
| **OpenClaw** | 18789 | `GET /v1/models` | Optional lane, attaches if available |

## The four attach modes

| Mode | Use case | What's required |
|---|---|---|
| **Local** | Run Hermes on the same machine as the desktop | First-run installer must complete; port 8642 must be free |
| **Remote (HTTPS)** | Talk to a runtime on a remote host | The remote host must be reachable, the port open, and TLS valid |
| **SSH tunnel** | Run a remote runtime but expose it on a local port | SSH credentials to the remote host, the runtime's actual port |
| **LAN loopback** | Talk to a runtime on another machine on the same network | The remote machine's port, the desktop's loopback or LAN opt-in enabled |

## The five things to check when attach fails

In this order, top-to-bottom — they cover 95% of "the runtime won't
connect" reports:

### 1. Is the runtime actually running?

Open a terminal and check:

```bash
# Hermes on default port
curl -sS http://127.0.0.1:8642/v1/models | head -50

# IronClaw (after SSH tunnel, port 3231)
curl -sS http://127.0.0.1:3231/v1/models | head -50

# OpenClaw on default port
curl -sS http://127.0.0.1:18789/v1/models | head -50
```

If `curl` returns a JSON list of models, the runtime is up and the
issue is between the desktop and the port. If `curl` returns
"connection refused", the runtime is down or on a different port.

### 2. Is the port in use by something else?

```bash
# Windows
netstat -ano | findstr :8642
# macOS / Linux
lsof -i :8642
```

If another process is on the port, kill it or change the runtime's
port (Hermes supports `--port` at start; IronClaw uses an env var).

### 3. Is the firewall blocking the port?

- **Windows Defender Firewall:** `wf.msc` → Inbound Rules → New Rule
  → Port → TCP 8642 (or 3231 for IronClaw). Allow the rule.
- **macOS:** System Settings → Network → Firewall → allow the runtime
  binary to accept incoming connections.
- **Linux (ufw):** `sudo ufw allow 8642/tcp`.

### 4. Is the SSH tunnel actually open?

For IronClaw over SSH, the desktop expects:

- A valid SSH key or password to the remote host.
- The remote host running IronClaw on port 3231.
- The tunnel forwarding `127.0.0.1:3231` (local) → `127.0.0.1:3231`
  (remote) — or whichever local port the desktop asked for.

Test the tunnel manually:

```bash
ssh -L 3231:127.0.0.1:3231 user@remote-host
# In another terminal:
curl -sS http://127.0.0.1:3231/v1/models | head -50
```

If that fails, fix the SSH side first. The desktop cannot debug SSH
for you.

### 5. Is the desktop pointed at the right port?

Open **Settings → Runtime** and check:

- **Local gateway URL** is `http://127.0.0.1:8642` for Hermes, or
  `http://127.0.0.1:3231` for IronClaw (after SSH tunnel).
- **Connection mode** is **Local**, **Remote**, or **SSH tunnel** —
  not the wrong one for your topology.

If all five pass, the issue is almost certainly a credentials
mismatch on the remote side, or a corporate proxy (see the
**windows-desktop-e2e** skill for the PowerShell + CRLF + PATH
gotchas that bite at runtime).

## Recovery

If the attach still fails after all five checks, open
**Settings → Logs** and copy the last 50 lines. The error code is
usually one of:

| Error | Most common cause |
|---|---|
| `ECONNREFUSED 127.0.0.1:8642` | Runtime not running, or wrong port |
| `ETIMEDOUT` | Firewall, or wrong host in remote mode |
| `401 Unauthorized` | Provider API key wrong, or runtime expects a token the desktop didn't send |
| `503 Service Unavailable` | Runtime is up but the chat model isn't loaded yet — wait 10 seconds and retry |
| `500 Internal Server Error` | Runtime crash — check the runtime's own logs (not the desktop's) |

If the error code is none of these, the **electron-pro** skill has
the IPC channel reference; the **windows-desktop-e2e** skill has
the Windows-specific gotchas.
