# Competitive Gap Plan — Closing the OpenOcta gap

> **Date:** 2026-08-13
> **Based on:** OpenOcta competitive analysis (`docs/plans/external-repos/openocta/COMPETITIVE-ANALYSIS.md`)
> **Research:** second-brain, agentconnect, huashu-design, i-have-adhd, skills-bundle-kit
> **Goal:** Close the 3 highest-impact competitive gaps without losing Cubecloud's defensible advantages
> **Constraint:** Match the existing Cubecloud brand identity (flat minimalist dark-first, #003f7a accent, no gradients, CSS custom properties)

---

## Research findings (informs the implementation)

### second-brain (henrydaum) → G3 Knowledge Vault

**What it is:** Local-first AI microkernel runtime (MIT, Python/SQLite, ~13k LOC). The knowledge base is a side effect of its file-indexing pipeline.

**Adoptable patterns:**
1. **`vec_cosine()` SQLite scalar function** — register cosine similarity as a SQLite custom function so vector search becomes a SQL expression. Portable to `better-sqlite3` in Electron.
2. **FTS5 query sanitization** — two-pass approach: try raw FTS5 query, fall back to literal token extraction on parser error.
3. **MEMORY.md prompt-inlined index** — single Markdown file inlined into the agent's system prompt every turn, capped at 4000 chars.
4. **Name-based memory security** — tool takes `name` (lowercase alphanumerics + hyphens), derives path internally. No `path` parameter. Prevents traversal attacks.
5. **Priority lock** — custom mutex that always yields to interactive threads over background workers. Prevents UI freezes during indexing.
6. **SQLite WAL + tuning** — `PRAGMA journal_mode=WAL`, `synchronous=NORMAL`, `cache_size=-50000`.

**What NOT to adopt:** Python stack, conversation state machine, plugin sandbox, package store.

### agentconnect (agentconnect-md) → G1 IM Channels

**What it is:** Daemon-centric multi-agent platform bridging IM platforms to AI coding agents (Apache-2.0, TypeScript, pnpm monorepo). Supports Slack, Telegram, Discord, Feishu/Lark.

**Adoptable patterns:**
1. **`NormalizedPlatformMessage` schema** — transport-neutral zod schema with DM/group, threads, attachments, mentions, triggers. Directly adoptable.
2. **`PlatformConnection` interface** — Layer-1 contract (`start`/`stop`/`getChannelInfo`/`listMembers`/`downloadFile`). Clean abstraction for any IM platform.
3. **Strategy table pattern** — `Map<string, Strategy>` with fail-closed defaults eliminates `switch(platform)` branching.
4. **Integration config schema pattern** — per-platform zod schemas with a registry.
5. **Send queue** — FIFO with min interval and task timeout for rate-limited APIs.
6. **Feishu implementation** — WSClient long-connection, CardKit streaming cards, event normalization. Direct template for WeCom and DingTalk (same auth model, same transport options, same rich message types).
7. **Connection consolidation** — group integrations by appId, one connection per app.

**What NOT to adopt:** Daemon/Relay/CP three-component split, ACP integration, Control Plane PostgreSQL persistence, agent authorship routing ladder.

### huashu-design (alchaincyf) → G2/G3 UI Design

**What it is:** Bilingual HTML design skill (MIT) that turns an AI agent into a designer who works in HTML — prototypes, slides, animations, infographics, design critiques.

**Adoptable patterns for G2/G3:**
1. **Three-direction hard gate** — any new visual design must produce 3 differentiated direction drafts before execution. Prevents AI slop.
2. **Anti-AI-slop banlist** — explicit banlist: purple gradients, emoji icons, rounded cards with left border accent, Inter/Roboto as display fonts.
3. **Brand asset protocol** — 5-step flow: ask → search → download → verify →固化 as `brand-spec.md`.
4. **Form derivation 5 questions** — narrative role, audience distance, visual temperature, capacity estimate, visual motif.
5. **Junior Designer mode** — placeholder-first, early review, then fill in.
6. **Starter components** — `browser_window.jsx`, `ios_frame.jsx` for realistic mockups.

**Already in skills-bundle-kit:** Yes (`alchaincyf/huashu-design|huashu-design||`).

### i-have-adhd (ayghri) → G2 UX Principles

**What it is:** Output-formatting skill (MIT) that reshapes AI agent responses for ADHD readers — action-first, low-friction communication.

**Adoptable UX principles for G2 Agent Swarm UI:**
1. **Lead with the next action** — swarm UI should surface "what to do next" first, not buried in logs.
2. **Restate state every turn** — topology graph always shows current state (busy/done/failed) without requiring user to remember.
3. **Number multi-step tasks** — show "Step 2 of 5: research phase" not just a tree of agents.
4. **Make wins visible** — prominently show completed tasks, not buried in log stream.
5. **Cap lists at 5** — collapse long agent lists into "top 5 + expand" by default.
6. **Specific time estimates** — show estimated completion time, not just "running...".
7. **Suppress tangents** — isolate failures, don't cascade-show all other agents' warnings.

**Already in skills-bundle-kit:** Yes (`ayghri/i-have-adhd|i-have-adhd|.cursor/skills/i-have-adhd|`).

### skills-bundle-kit — existing skills for G1/G2/G3

The kit has **20+ design/UX skills** already available: `frontend-ui-engineering`, `baseline-ui`, `improve-ui`, `fixing-accessibility`, `create-design-md`, `design-md-library` (74 DESIGN.md files), `impeccable-*` (6 design methodology skills), `hallmark`, `taste-skill`, `brand-discovery`, `planning-and-task-breakdown`, `spec-driven-development`, `mcp-builder`, `api-and-interface-design`, `knowledge-ops`, `archify`, `scheduler`.

**Skill gaps to fill:**
- **agent-swarm-orchestration** — no skill covers multi-agent coordination, A2A protocol, or swarm topology
- **knowledge-vault** — `knowledge-ops` is close but focuses on MCP/vector stores, not Obsidian-compatible vault design
- **im-channel-integration** — pure engineering, not a transferable skill

---

## Gap 1: IM Channel Support (WeCom, DingTalk, Feishu)

### Problem

OpenOcta has native integrations with WeChat, WeCom (企业微信), DingTalk, Feishu (飞书), QQ, WhatsApp, and Telegram. Cubecloud has zero IM integration. This is OpenOcta's biggest competitive advantage in the Chinese market — users can drive agent tasks from their IM clients.

### Target

Add 3 IM channel integrations: **WeCom**, **DingTalk**, **Feishu**. These cover the enterprise Chinese market. WeChat and QQ are consumer-focused and lower priority.

### Architecture (adapted from AgentConnect's PlatformConnection pattern)

```
┌─────────────────────────────────────────────────────────────┐
│ IM Channel Layer (new: agent-desktop/src/main/channels/)   │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ WeComChannel│  │ DingTalkCh. │  │ FeishuChann.│        │
│  │ (企业微信)  │  │ (钉钉)      │  │ (飞书)      │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         └────────────────┼────────────────┘                 │
│                          │                                   │
│  ┌───────────────────────┴──────────────────┐               │
│  │           ChannelRouter                  │               │
│  │  dispatch inbound → HarnessRouter        │               │
│  │  dispatch outbound → IM API              │               │
│  └───────────────────────┬──────────────────┘               │
│                          │                                   │
│  ┌───────────────────────┴──────────────────┐               │
│  │           HarnessRouter (P1)              │               │
│  │  resolve(sessionId) → active provider     │               │
│  │  runTurn() → harness → model → response    │               │
│  └───────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### Implementation plan

| Phase | What                                                                 | Files                                                                   | Effort |
| ----- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| G1.1  | `ChannelInterface` — common interface for all IM channels            | `packages/platform-core/src/channel.ts`                                 | S      |
| G1.2  | `ChannelRouter` — dispatches inbound/outbound messages               | `packages/platform-core/src/channel-router.ts`                          | S      |
| G1.3  | WeCom channel adapter — WeCom Bot API (webhook + callback)           | `agent-desktop/src/main/channels/wecom-channel.ts`                      | M      |
| G1.4  | DingTalk channel adapter — DingTalk Stream SDK (websocket)           | `agent-desktop/src/main/channels/dingtalk-channel.ts`                   | M      |
| G1.5  | Feishu channel adapter — Lark Suite SDK (event subscription)         | `agent-desktop/src/main/channels/feishu-channel.ts`                     | M      |
| G1.6  | Gateway screen — IM channel config UI (toggle, webhook URL, API key) | `agent-desktop/src/renderer/src/screens/Gateway/Gateway.tsx` (modified) | M      |
| G1.7  | IPC handlers — start/stop channel, send test message                 | `agent-desktop/src/main/index.ts` (modified)                            | S      |

### Key design decisions

1. **Webhook-based, not polling** — WeCom and DingTalk support webhook callbacks. Feishu uses event subscription. No long-polling needed.
2. **Channel → HarnessRouter** — inbound IM messages go through the same `HarnessRouter` (P1) as chat messages. The channel is just another input surface.
3. **Outbound via IM API** — agent responses are sent back to the IM channel via the platform's message API.
4. **Per-channel session** — each IM conversation gets its own session ID, mapped to the IM platform's conversation ID.
5. **Security** — webhook signatures verified (WeCom uses `WXBizMsgCrypt`, DingTalk uses `sign` parameter, Feishu uses `X-Lark-Signature`).

### What NOT to do

- Don't build a full IM client UI inside the desktop — the IM platforms are the UI
- Don't support consumer platforms (WeChat personal, QQ) in v1 — enterprise first
- Don't duplicate OpenOcta's `ChannelPlugin → OutboundAdapter → RuntimeChannel → InboundSink` pattern — our `ChannelInterface` is simpler

---

## Gap 2: Agent Swarm UI (Multi-Agent Collaboration)

### Problem

OpenOcta has an Agent Swarm feature with a WeChat-like chat UI, dynamic sub-agent creation, inter-agent messaging, real-time topology graph, and room-level management. Cubecloud has P10 subagent infrastructure but no user-facing UI.

### Target

Elevate the P10 subagent infrastructure to a user-facing feature with a visual topology showing active subagents, their relationships, and real-time message flow.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Swarm Screen (new: agent-desktop/src/renderer/src/screens/  │
│ Swarm/Swarm.tsx)                                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Topology Graph (SVG)                                 │   │
│  │  ┌─────┐     ┌─────┐     ┌─────┐                    │   │
│  │  │Main │─────│Sub 1│─────│Sub 2│                    │   │
│  │  │Agent│     │(read)│     │(read)│                    │   │
│  │  └─────┘     └─────┘     └─────┘                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Agent List                                           │   │
│  │  ● Main Agent (hermes) — active                       │   │
│  │  ○ Subagent-1 (read-only) — "Researching X"           │   │
│  │  ○ Subagent-2 (read-only) — "Analyzing Y"            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Message Flow (live)                                  │   │
│  │  [main] → [sub-1] "Research the codebase architecture"│   │
│  │  [sub-1] → [main] "Found 3 key patterns..."          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation plan

| Phase | What                                                                     | Files                                                                 | Effort |
| ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------ |
| G2.1  | `SwarmManager` — manages subagent lifecycle (create, monitor, terminate) | `packages/platform-core/src/swarm.ts`                                 | M      |
| G2.2  | `SwarmScreen` — topology graph + agent list + message flow               | `agent-desktop/src/renderer/src/screens/Swarm/Swarm.tsx`              | L      |
| G2.3  | SVG topology component — nodes + edges, animated message flow            | `agent-desktop/src/renderer/src/screens/Swarm/TopologyGraph.tsx`      | M      |
| G2.4  | IPC handlers — create subagent, list active, get messages, terminate     | `agent-desktop/src/main/index.ts` (modified)                          | S      |
| G2.5  | Nav item — add Swarm to the sidebar navigation                           | `agent-desktop/src/renderer/src/screens/Layout/Layout.tsx` (modified) | S      |

### Key design decisions

1. **SVG topology, not canvas** — SVG is declarative, accessible, and matches the flat minimalist aesthetic. No WebGL dependency.
2. **Read-only subagents only (v1)** — subagents use `READ_ONLY_TOOLS` from P10. No write-capable swarm agents in v1.
3. **Max 5 concurrent subagents** — prevent resource exhaustion. Each subagent gets a fresh context window.
4. **Message flow is live** — WebSocket-style streaming of inter-agent messages, using the same SSE pattern as chat.
5. **Topology auto-layout** — force-directed layout (simplified). Main agent at center, subagents in a ring.

### Design language

- Topology nodes: `--bg-elevated` background, `--accent` border for active, `--text-muted` for idle
- Edges: `--border-bright` lines, `--accent` for active message flow
- Agent list: card pattern matching existing Skills/Models cards
- Message flow: monospace text, `--bg-tertiary` background, matching chat tool progress

---

## Gap 3: Knowledge Vault (User-Visible, Editable Knowledge Base)

### Problem

OpenOcta has an Obsidian-compatible Knowledge Vault — a user-visible, editable Markdown knowledge base with Bleve full-text + vector semantic search. Cubecloud's EverOS is infrastructure-level and not user-facing. Users want to see and manage what the agent knows.

### Target

Add a user-visible Knowledge Vault that complements EverOS. The vault is a directory of Markdown files that the user can browse, edit, and search — and the agent can reference during conversations.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Knowledge Vault Screen (new: agent-desktop/src/renderer/    │
│ src/screens/Knowledge/Knowledge.tsx)                       │
│                                                              │
│  ┌────────────┐  ┌──────────────────────────────────────┐   │
│  │ File Tree   │  │ Markdown Editor + Preview            │   │
│  │  📁 vault/  │  │  # Architecture Notes                │   │
│  │  📄 notes   │  │  The system uses a harness...       │   │
│  │  📄 arch    │  │                                      │   │
│  │  📄 meeting │  │  [Search bar: search vault...]      │   │
│  └────────────┘  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Search Results (hybrid: full-text + semantic)       │   │
│  │  📄 arch.md — "harness interface" (95% match)       │   │
│  │  📄 notes.md — "harness" (72% match)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Implementation plan

| Phase | What                                                               | Files                                                                 | Effort |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | ------ |
| G3.1  | `KnowledgeVault` interface — file CRUD, search, index              | `packages/platform-core/src/knowledge-vault.ts`                       | M      |
| G3.2  | Full-text search — simple in-memory index (no Bleve dependency)    | `packages/platform-core/src/knowledge-vault.ts`                       | M      |
| G3.3  | `KnowledgeScreen` — file tree + markdown editor + search           | `agent-desktop/src/renderer/src/screens/Knowledge/Knowledge.tsx`      | L      |
| G3.4  | Markdown editor component — edit + preview toggle                  | `agent-desktop/src/renderer/src/screens/Knowledge/MarkdownEditor.tsx` | M      |
| G3.5  | IPC handlers — list/read/write/search vault files                  | `agent-desktop/src/main/index.ts` (modified)                          | S      |
| G3.6  | Nav item — add Knowledge to the sidebar                            | `agent-desktop/src/renderer/src/screens/Layout/Layout.tsx` (modified) | S      |
| G3.7  | Agent integration — inject vault search results into system prompt | `agent-desktop/src/main/skills-harness.ts` (modified)                 | S      |

### Key design decisions

1. **Plain Markdown files** — no database, no proprietary format. Files live in `<profile>/vault/`. Users can open them in any editor (Obsidian, VS Code, etc.).
2. **In-memory full-text search** — no Bleve or external search engine. A simple inverted index built on startup, updated on file changes. Good enough for <1000 files.
3. **No vector search in v1** — semantic search requires an embedding model. Add in v2 when we have embedded local model support (Gap 4).
4. **Agent can search the vault** — a `vault_search` tool is registered alongside existing tools. The agent can query the vault during conversations.
5. **Auto-indexing** — file watcher rebuilds the index when files change. Debounced 500ms.

### Design language

- File tree: matches the existing sidebar pattern (`--bg-secondary` background, `--text-secondary` text)
- Markdown editor: `--bg-primary` background, `--font-mono` for edit mode, rendered markdown in preview
- Search bar: matches existing `.skills-search` pattern
- Search results: card pattern with match percentage badge

---

## Implementation order

```
G1 (IM Channels) ──────────────────────────────┐
                                                  │
G2 (Agent Swarm UI) ────────────────────────────┤  All three can run in parallel
                                                  │  — no dependencies between them
G3 (Knowledge Vault) ────────────────────────────┘
```

**All three gaps are independent** — they touch different parts of the codebase and have no dependencies on each other. They can be implemented in parallel by different agents/developers.

### Priority order (if sequential)

1. **G1 (IM Channels)** — highest competitive impact, especially for Chinese market
2. **G3 (Knowledge Vault)** — most user-visible improvement, complements existing EverOS
3. **G2 (Agent Swarm UI)** — most complex, but most visually impressive

### Verification gates

Each gap must pass:

1. `npm run typecheck --workspace cubecloud-agent-desktop` — no type errors
2. `npm run test --workspace cubecloud-agent-desktop` — all tests pass
3. `npm run typecheck` (root) — platform-core typecheck
4. Platform-core tests pass
5. No new import cycles (graphify diagnose)
6. UI matches Cubecloud brand: flat minimalist dark-first, #003f7a accent, no gradients

### What NOT to do

- **Don't build a full IM client** — the IM platforms are the UI, we just bridge messages
- **Don't add vector search in v1** — requires embedding model infrastructure not yet built
- **Don't make the swarm UI a full IDE** — it's a monitoring/visualization surface, not a code editor
- **Don't copy OpenOcta's Go patterns** — our codebase is TypeScript, use TS idioms
- **Don't lose the developer-tools focus** — CodeGraph, Agent Reach, eval framework are our defensible advantages
