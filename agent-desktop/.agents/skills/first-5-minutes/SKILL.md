---
name: first-5-minutes
description: Walks a new operator through the first five minutes of using the cubecloud-agent-desktop — pick a runtime lane, attach a provider, run the first chat. Use when the user says "I'm new", "how do I start", "first time", "just installed", "where do I begin", or describes being stuck on the welcome screen.
source: cubecloud
metadata:
  audience: end-user
  surface: Welcome
  related_skills: [runtime-attach, models-page-scan, kanban-task-shape]
---

# First 5 Minutes

The minimum walkthrough that gets a new operator from "just installed"
to "ran my first chat successfully." Every step happens through the
desktop's own UI — no terminal commands required.

## When to use

Use this skill when:

- The user just installed the desktop and is on the **Welcome** screen.
- The user has been clicking around but is unsure what to do next.
- The user says they "tried to chat but nothing happened."

## The four steps

### 1. Pick a runtime lane

The desktop ships with three runtime providers:

| Lane | Role | Default port | When to pick it |
|---|---|---|---|
| **Hermes** | Default core runtime | 8642 | First choice for most users. Runs the desktop's first-run local install. |
| **IronClaw** | WASM-sandbox gateway-handoff | 3231 | When you want a sandboxed runtime with the OpenAI-compatible HTTP gateway. |
| **OpenClaw** | Optional future lane | 18789 | Only if the operator panel explicitly offers it. |

For your first session, **pick Hermes** and click **Local** when the
Welcome screen asks local-vs-remote. The desktop will run the
official installer with dependency resolution and a progress bar.
This typically takes 1-3 minutes depending on network speed.

### 2. Wait for runtime readiness

Once the installer finishes, the desktop polls `http://127.0.0.1:8642/v1/models`
to confirm the runtime is up. You'll see "Runtime detected" in the
sidebar. If the poll fails, the **runtime-attach** skill walks you
through the four things to check.

### 3. Attach a provider

Open the **Providers** screen from the sidebar. For your first chat,
you have three practical options:

- **Ollama** (local, free) — if you have Ollama installed on the same
  machine, the **Models** page auto-detects it on `127.0.0.1:11434`
  and you can one-click into a saved model. See **models-page-scan**.
- **OpenAI-compatible local endpoint** — vLLM, LM Studio, llama.cpp,
  or anything that speaks the OpenAI HTTP API. The Models page
  supports all of these.
- **OpenAI / Anthropic / Google Gemini / Azure / OpenRouter** (remote,
  paid) — paste your API key into the Providers form. The credential
  is stored in the per-profile credential pool, not in plain text on
  disk.

### 4. Run your first chat

Open the **Chat** screen, type a question, and press Enter. The chat
uses SSE streaming, so the agent's response appears token by token.
The footer shows prompt/completion token counts and (for paid
providers) the running cost.

If the chat fails to start, the most common cause is a provider
endpoint that the runtime can't reach. Open **Settings → Logs** to
see the actual error.

## What you should see after five minutes

- Welcome screen completed.
- Runtime badge in the sidebar shows **Hermes** (or whichever lane you picked).
- Models page lists at least one model (either local-detected or
  remote-saved).
- A chat turn has streamed back a response.
- The prelaunch **Kanban** board has its 5 onboarding tasks in the
  sidebar — feel free to delete them after you finish.

## Common follow-ups

- **"I want a sandboxed runtime"** → switch to IronClaw. The
  **runtime-attach** skill covers the SSH-tunnel path if your
  IronClaw is on a remote host.
- **"I want to keep my chat history across machines"** → the desktop
  has no cloud sync. Profiles and sessions are local. Use
  **Settings → Backup** to export a portable JSON bundle.
- **"I want a recurring prompt"** → **Schedules** screen, cron
  builder, 15 delivery targets.
- **"I want the agent to remember things across sessions"** →
  **Memory** screen, the `cubecloud-persona` prelaunch skill is
  already active.
