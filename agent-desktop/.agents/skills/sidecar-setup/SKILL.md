---
name: sidecar-setup
description: Set up the three optional user-initiated sidecars — CodeGraph, EverOS, Headroom. Use when the user says "how do I install CodeGraph", "I want EverOS for memory", "Headroom is missing", "the CodeGraph screen says not configured", "I want semantic code intelligence", or describes wanting a sidecar capability.
source: cubecloud
metadata:
  audience: end-user
  surface: CodeGraph, EverOS, Headroom
  related_skills: [runtime-attach, models-page-scan]
---

# Sidecar Setup

How to install and configure the three optional sidecars:
**CodeGraph** (semantic code intelligence), **EverOS** (memory +
harness), and **Headroom** (context compression).

## When to use

Use this skill when:

- The user opens the **CodeGraph**, **EverOS**, or **Headroom**
  screen and it says "not configured" or "sidecar not running".
- The user wants to add semantic code intelligence, persistent
  memory, or context compression to their workflow.
- The user installed one of the sidecars at the OS level but the
  desktop doesn't see it.

## The three sidecars, at a glance

| Sidecar | What it does | Install | Default port | User-initiated? |
|---|---|---|---|---|
| **CodeGraph** | Semantic code intelligence — search, impact radius, stats | `pip install codegraph` + `codegraph init` | Loopback | Yes — opt-in per project |
| **EverOS** | Memory + harness sidecar | `pip install everos` | Loopback | Yes — opt-in per profile |
| **Headroom** | Context compression proxy | `pip install headroom-ai` | Loopback | Yes — opt-in per session |

**None of them are required.** The desktop is fully functional
without any sidecar. All three are user-initiated and never silently
installed.

## CodeGraph

### What it does

CodeGraph provides semantic code intelligence — when you ask the
agent "what does the agent-desktop's runtime orchestration layer
look like?" it can answer with a real graph query rather than a
text search. Three operations are exposed in the desktop's
**CodeGraph** screen:

- `searchNodes(query)` — semantic search over indexed nodes
- `getImpactRadius(symbol)` — what else breaks if I change this
- `getStats()` — project-level statistics (nodes, edges, languages)

### Install

```bash
pip install codegraph
codegraph init   # in the project root you want to index
```

Then open the **CodeGraph** screen in the desktop. The first
`codegraph init` run does the initial index; subsequent runs are
incremental.

### If the desktop says "not configured"

1. Confirm `codegraph` is on PATH: `codegraph --version`.
2. Confirm the project is initialized: `codegraph status` in the
   project root.
3. The desktop reads from a per-project `.codegraph/` directory.
   Re-index if the directory is stale: `codegraph rebuild`.

## EverOS

### What it does

EverOS is the memory + harness sidecar. It persists the agent's
working memory across sessions, exposes a queryable long-term store,
and supervises the agent harness lifecycle. The desktop's **EverOS**
screen has two transports:

- **HTTP client** — `everos server start` runs as a separate
  process; the desktop talks to it over HTTP. Works against any
  reachable host, including remote ones over SSH.
- **Embedded sidecar** — the desktop owns the `everos server start`
  Python child process directly, with full lifecycle supervision
  (auto-restart, crash-window cap, log ring, graceful shutdown).

### Install

```bash
pip install everos
everos server start --port 8765   # if using HTTP transport
```

### If the desktop says "not configured"

1. Confirm `everos` is on PATH: `everos --version`.
2. Confirm the server is running: `curl http://127.0.0.1:8765/health`
   (or whatever port you configured).
3. In the desktop's **EverOS** screen, the **Connection** field
   must match. If you used `--port 8765`, set the desktop's
   `remoteUrl` to `http://127.0.0.1:8765`.

## Headroom

### What it does

Headroom is a context-compression proxy. When the local token
pressure is high (large tool logs, long chat histories, big
CodeGraph bundles), Headroom compresses the prompt before it hits
the model. The desktop's **Headroom** screen shows the current
compression ratio and the compressed-vs-original token counts.

### Install

```bash
pip install headroom-ai
headroom proxy start --port 9090
```

Then point your provider's base URL at the Headroom proxy
(`http://127.0.0.1:9090/v1`) instead of the model server directly.
The desktop's **Providers** screen supports this — set
**Base URL** to the Headroom proxy and **API type** to
`openai-compatible`.

### If the desktop says "not configured"

1. Confirm `headroom` is on PATH: `headroom --version`.
2. Confirm the proxy is running: `curl http://127.0.0.1:9090/health`.
3. Confirm the **Providers** screen is pointing at the proxy, not
   the model server.

## When NOT to install a sidecar

- **CodeGraph** — skip if you only work on small projects. The
  index build takes minutes and the benefit is marginal below ~10k
  LOC.
- **EverOS** — skip if you only do single-session work and don't
  need cross-session memory. The desktop's built-in Memory screen
  is enough for one-off chats.
- **Headroom** — skip if your local model has a long context
  window (32k+) and you don't hit the limit. The compression
  introduces a small latency cost.

## Security

All three sidecars are loopback-only by default. The desktop will
not connect to a sidecar on a remote host without an explicit
opt-in (LAN scan in **Settings → Advanced**, or HTTPS in the
provider's **Base URL** field).

Sidecar output is sandboxed by the runtime — the desktop doesn't
trust sidecar responses blindly. See **THREAT_MODEL.md** §"The
sidecar boundary (CodeGraph + EverOS)" for the full trust model.
