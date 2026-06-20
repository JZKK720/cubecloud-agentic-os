---
name: models-page-scan
description: How the Models page discovers local servers (Ollama, LM Studio, vLLM, llama.cpp) and how to interpret the per-card health dot. Use when the user says "the Models page doesn't show my Ollama", "the health dot is red", "I have Ollama running but the scan didn't find it", "how does the loopback scan work", "can I scan my LAN", or describes a missing local server in the saved models list.
source: cubecloud
metadata:
  audience: end-user
  surface: Models
  related_skills: [first-5-minutes, runtime-attach, providers]
---

# Models Page Scan

How the **Models** page auto-detects local model servers, what the
health dot means, and how to add LAN hosts.

## When to use

Use this skill when:

- The user opened the **Models** screen and no local servers appeared.
- The health dot next to a saved model is **red** (unhealthy) or
  **yellow** (degraded).
- The user has Ollama / LM Studio / vLLM / llama.cpp running but
  the desktop doesn't see it.
- The user wants to scan a machine on their **LAN** (not just
  `127.0.0.1`).

## How the scan works

The Models page calls `scanLocalServers()` in the main process, which
probes a set of candidate `(host, port)` pairs and surfaces any
servers that respond on the OpenAI-compatible `/v1/models` endpoint.

### Default scan targets (loopback only)

The scan is **loopback-only by default**. The candidate list:

| Provider | Default host | Default port | `/v1/models` response shape |
|---|---|---|---|
| **Ollama** | `127.0.0.1` | 11434 | `{ "models": [...] }` |
| **LM Studio** | `127.0.0.1` | 1234 | `{ "data": [...] }` |
| **vLLM** | `127.0.0.1` | 8000 | `{ "data": [...] }` |
| **llama.cpp** | `127.0.0.1` | 8080 | `{ "data": [...] }` |

If your server is on a non-default port, the scan won't find it.
You can add it manually via **Models → Add model → Base URL**.

### What the health dot means

Each saved model card has a colored dot, refreshed every 30 seconds:

| Color | Meaning | Action |
|---|---|---|
| **Green** | The desktop can reach `GET <baseUrl>/v1/models` and got a valid response in <500ms | None — model is ready |
| **Yellow** | The desktop got a response but it was slow (500ms-2s), or the response shape was unexpected | Check the runtime's health; usually transient |
| **Red** | The desktop got `ECONNREFUSED`, `ETIMEDOUT`, or a 4xx/5xx | The server is down or unreachable. Use the **runtime-attach** skill. |
| **Gray** | The probe has not completed yet | Wait one probe interval (30s) |

The probe is debounced per-card via a `useRef(new Set())` pattern, so
flapping servers don't spam the UI.

## Adding LAN hosts

Loopback-only is the safe default. If you want to scan a machine on
your local network (e.g., a beefier GPU box on the same VLAN), you
need to opt in:

1. Open **Settings → Advanced → LAN scan opt-in** and enable it.
2. The scan will now also probe the configured LAN host list.
3. Add the host via **Models → Add model → Base URL** with the LAN
   IP (e.g., `http://192.168.1.42:11434` for an Ollama on another
   machine).

**Security note:** LAN scanning is opt-in because it can leak your
network topology to the desktop's runtime. Only enable it on
networks you trust.

## Common issues

### "Ollama is running but the scan didn't find it"

- **Ollama bound to a non-loopback address.** Ollama defaults to
  `127.0.0.1:11434`, but if you started it with `OLLAMA_HOST=0.0.0.0`
  it might be on a different interface. Use `netstat -ano | findstr :11434`
  (Windows) or `lsof -i :11434` (macOS / Linux) to confirm.
- **Ollama is on a custom port.** Some setups use `11435` to avoid
  a conflict. The scan only probes the default port. Add the model
  manually with the right Base URL.
- **Firewall blocked the probe.** See the **runtime-attach** skill
  for the firewall-check section.

### "The health dot is red but the server is up"

- **TLS mismatch.** If your server uses a self-signed cert, the
  desktop will reject the probe. The Models page supports HTTP
  loopback only — for HTTPS, use the Providers screen for the
  remote-endpoint form.
- **Wrong path.** The probe hits `/v1/models` exactly. If your
  server responds on a different path (e.g., Ollama's `/api/tags`),
  the probe will return 404. The scan only matches the OpenAI-compatible
  shape.

### "I added a model manually but the chat doesn't use it"

The **Models** screen is for saved-model configurations; the
**Providers** screen is for the provider's credential and base URL.
If the chat uses a different model, check **Chat → Model picker** at
the top of the chat composer — that's where the active model is
selected, independent of the saved models list.

## Related surfaces

- **Providers** screen — for credential and base-URL configuration
  of remote (HTTPS) providers.
- **Settings → Advanced** — for LAN scan opt-in and probe interval.
- **first-5-minutes** skill — covers the full onboarding flow.
- **runtime-attach** skill — for the 5 things to check when an
  attach fails.
