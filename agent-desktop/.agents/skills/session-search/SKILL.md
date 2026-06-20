---
name: session-search
description: How to use the Sessions screen's SQLite FTS5 full-text search to find past chats, filter by date, and resume. Use when the user says "find my chat about X", "search past sessions", "I had a conversation about Y last week", "I can't find my old chat", or describes needing to look up something from a previous session.
source: cubecloud
metadata:
  audience: end-user
  surface: Sessions
  related_skills: [memory, agents]
---

# Session Search

The **Sessions** screen uses SQLite FTS5 full-text search to find
past chats. This skill covers what it can do, what it can't, and
the practical patterns for the operator.

## When to use

Use this skill when:

- The user wants to find a specific past conversation.
- The user has hundreds of sessions and needs to narrow down.
- The user wants to **resume** a past session (continue where they
  left off) versus just **read** it.
- The user is trying to remember which profile they used for a
  particular session.

## What FTS5 can do

The Sessions screen indexes session title, first user prompt, and
assistant response snippets. The search supports:

- **Word match** — `runtime attach` matches any session mentioning
  both words (in any order).
- **Phrase match** — `"connection refused"` matches the exact
  phrase.
- **Prefix match** — `provi*` matches `provider`, `providers`,
  `provisioning`.
- **Date filter** — pick a date range to narrow by session date.
- **Profile filter** — switch the active profile to scope the
  search to that profile's sessions.

## What FTS5 can't do

- **Semantic search** — it doesn't understand synonyms or intent.
  "How do I install Ollama" won't match "Setting up local model
  server." Use literal keywords.
- **Fuzzy match** — a typo breaks the match. There is no
  approximate-match mode.
- **Cross-profile** — the index is per-profile. You can't search
  Profile A's sessions from Profile B's Sessions screen.
- **Embeddings** — FTS5 is keyword-only. The desktop does not yet
  ship a vector search over sessions. (CodeGraph is the closest
  adjacent capability for code; for chat history this is a known
  gap.)

## Practical search patterns

| Need | Pattern |
|---|---|
| Find a session about a specific error | Search for the literal error string, e.g., `ECONNREFUSED 127.0.0.1:8642` |
| Find a session about a feature | Search for the feature name, e.g., `models page scan` or `IronClaw SSH tunnel` |
| Find a session from a specific date | Use the date range filter, then sort by date |
| Find a session by the model used | The Sessions screen doesn't expose a model filter today — use the agent's `agents` screen to see per-profile model history, or open the session directly to see its `model` field |
| Find a session by the persona | Same — open the session to see its `persona` field |

## Resuming vs reading

- **Read** — clicking a session opens it in **read-only** mode.
  The chat history is visible, the model is the one that was used
  when the session was active, and you can copy text out.
- **Resume** — clicking **Resume** on a session opens it in
  **active** mode, with the same model, persona, and provider
  configuration as when it ended. New turns append to the same
  session ID. The session title is preserved unless you rename it.

## What the date filter looks like

- **Today** — sessions from the current calendar day, server time.
- **This week** — last 7 days, rolling.
- **This month** — last 30 days, rolling.
- **Custom range** — pick any two dates; the session's **createdAt**
  field is the comparison key.

Sessions older than the filter are hidden but not deleted.

## When to use Memory instead

If the user is looking for **a fact the agent learned** (not the
session where they discussed it), use the **Memory** screen, not
**Sessions**:

- **Sessions** — find a past conversation. Returns a list of
  chat turns.
- **Memory** — find what the agent knows. Returns a key-value
  lookup of `memory` (agent's working memory) and `user` (user
  profile memory).

Cross-session knowledge is in Memory, not Sessions. If the user
wants to remember a fact across sessions, write it to Memory
(via the **Memory** screen, or by asking the agent to "remember
this" in chat).

## Performance notes

- The FTS5 index is rebuilt on every session write. With 1000+
  sessions, search latency is typically <50ms.
- The index is stored in `~/.cubecloud-agent-desktop/sessions.db`
  (per-profile) and is not encrypted at rest. If you need
  encryption, use the **Settings → Backup** to export a portable
  bundle and store it encrypted yourself.
- Index rebuild from scratch (after a database wipe) takes ~1
  second per 100 sessions.
