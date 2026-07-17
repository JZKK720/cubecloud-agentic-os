# Web Research & Internet Capability Integration Plan

## Overview

The Cubecloud Agent Desktop already has Agent Reach integrated (V2.10.66) as an internet capability probe on the Tools screen. The `last30days-skill` repo is a research engine that uses Agent Reach's channels (and more) to produce engagement-scored briefs. Both repos are from the same author (JZKK720 forks) and are designed to work together.

This plan adapts both tools so Hermes (the default runtime) and IronClaw (the sandbox worker) can utilize them when connected to the desktop — without requiring BYOK API keys for basic functionality.

## Deep dive findings

### Agent Reach (already integrated)
- **What it is:** Python CLI that installs, health-checks, and routes to upstream tools for 15 internet platforms
- **Already in the desktop:** `src/main/agent-reach.ts` (probe), Tools screen panel, MCP registry entry
- **API keys:** NOT required for 6+ channels (Web/Jina, YouTube, GitHub, RSS, V2EX, Bilibili, Exa). Optional keys for Groq (free tier), OpenAI, Twitter cookies
- **MCP:** Yes — exposes `get_status` tool; also consumes MCP via mcporter (Exa, xiaohongshu, LinkedIn)
- **Local LLM:** Yes — Agent Reach has NO LLM component. It's purely a tool router. The intelligence comes from whatever agent (Hermes, Claude Code, etc.) invokes the upstream tools
- **Cron:** Optional. `agent-reach watch` is built for scheduled health checks

### last30days-skill (not yet integrated)
- **What it is:** AI-agent-led research engine that aggregates what people are saying about any topic across the last 30 days, scored by engagement
- **Architecture:** Skill (SKILL.md, ~1400 lines) + Engine (Python, zero pip dependencies, stdlib only)
- **API keys:** NOT required for core. Reddit, HN, Polymarket, GitHub, StockTwits, arXiv, Techmeme, Digg, YouTube all work keyless. Optional keys for X/Twitter, Perplexity, Brave, Exa, Groq
- **MCP:** Yes — Go MCP server (`mcp/` directory) exposing `research` and `preflight` tools via stdio
- **Local LLM:** Yes for interactive use — the host model (Hermes) IS the reasoning provider. For headless/cron use, needs a reasoning provider key (Gemini/OpenAI/xAI/OpenRouter)
- **Cron:** Yes — `watchlist.py` for scheduled recurring research with Slack/webhook delivery
- **Dependencies:** Python 3.12+ stdlib only (zero pip deps). External CLIs: yt-dlp, gh, ffmpeg (auto-installed)
- **Existing repo reference:** `.gitignore` line 28-31 shows `.agents/skills/last30days/` was a local junction to a cloned skill repo

### Can a single local LLM handle the cron tasks?

**For Agent Reach:** Yes — `agent-reach watch` is a health check, not an LLM task. It just probes channels and reports status. No LLM needed.

**For last30days:** Partially. The `watchlist.py` scheduler runs the research engine headlessly, which needs a reasoning provider for synthesis. Options:
1. **Local LLM via Ollama** — works if the user has a local model server (already discoverable by the desktop)
2. **Hermes as reasoning provider** — Hermes is already the chat runtime; it could serve as the reasoning provider for headless research
3. **Deterministic mode** — last30days has a "local/deterministic" fallback that doesn't need any LLM (lowest quality, but works)

So: **a local LLM can handle cron tasks** if the user has Ollama/LM Studio running (which the desktop already discovers). No BYOK required.

## Tasks

### Task 1: Add last30days-skill to the .agents/skills/ directory
**Files:**
- Create: `.agents/skills/last30days/SKILL.md` (symlink or copy from the repo)
- Modify: `.gitignore` (update the last30days junction reference)

**Step 1: Clone the skill**
The `.gitignore` already references `.agents/skills/last30days/` as a local junction. We formalize this as a proper skill entry.

**Step 2: Verify**
Run: `ls .agents/skills/last30days/SKILL.md`
Expected: file exists

**Step 3: Commit**
`git add .agents/skills/last30days/ .gitignore`

---

### Task 2: Add last30days to the MCP bundled registry
**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/Mcp/registry.ts`

**Step 1: Add registry entry**
Add a `last30days` entry to `BUNDLED_MCP_SERVERS` with:
- name: "last30days"
- title: "Last 30 Days"
- description: "AI-agent-led research engine that aggregates what people are saying about any topic across the last 30 days, scored by engagement. Zero pip dependencies, runs with Python 3.12+ stdlib only."
- category: "search"
- transport: "stdio"
- detail: "python3 .agents/skills/last30days/scripts/last30days.py"
- hint: "Clone the repo and run the setup wizard. Zero API keys needed for core sources (Reddit, HN, YouTube, GitHub, Polymarket). Optional keys for X/Twitter, Perplexity, Brave."

**Step 2: Verify**
Run: `npm run typecheck --workspace cubecloud-agent-desktop`
Expected: clean

**Step 3: Commit**
`git add agent-desktop/src/renderer/src/screens/Mcp/registry.ts`

---

### Task 3: Add last30days binary discovery to installer.ts
**Files:**
- Modify: `agent-desktop/src/main/installer.ts`
- Modify: `agent-desktop/src/main/index.ts`
- Modify: `agent-desktop/src/preload/index.ts`
- Modify: `agent-desktop/src/preload/index.d.ts`

**Step 1: Add discoverLast30Days() function**
Following the `discoverCodebaseMemory()` pattern — scan PATH for `last30days` or check if the skill script exists at `.agents/skills/last30days/scripts/last30days.py`.

**Step 2: Wire IPC + preload**
Add `discover-last30days` IPC handler, preload method, and type declaration.

**Step 3: Verify**
Run: `npm run typecheck --workspace cubecloud-agent-desktop`
Expected: clean

**Step 4: Commit**
`git add agent-desktop/src/main/installer.ts agent-desktop/src/main/index.ts agent-desktop/src/preload/index.ts agent-desktop/src/preload/index.d.ts`

---

### Task 4: Add last30days status panel to the Tools screen
**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/Tools/Tools.tsx`
- Modify: `agent-desktop/src/renderer/src/assets/main.css`

**Step 1: Add last30days panel**
Following the existing Agent Reach panel pattern — show installed/not-installed status, available sources count, and a "Run research" hint.

**Step 2: Add CSS**
Add `.tools-last30days-*` classes matching the Agent Reach panel style.

**Step 3: Verify**
Run: `npx vitest run src/renderer/src/screens/Tools/Tools.test.tsx`
Expected: tests pass

**Step 4: Commit**
`git add agent-desktop/src/renderer/src/screens/Tools/Tools.tsx agent-desktop/src/renderer/src/assets/main.css`

---

### Task 5: Update AGENTS.md with both tools documented
**Files:**
- Modify: `AGENTS.md`

**Step 1: Update Tier 2 surfaces**
Add Agent Reach and last30days to the Tier 2 integrated support surfaces list with descriptions.

**Step 2: Verify**
Run: `git diff AGENTS.md`
Expected: clean diff

**Step 3: Commit**
`git add AGENTS.md`

---

### Task 6: Smoke test — full typecheck + test suite
**Files:** none (verification only)

**Step 1: Typecheck**
Run: `cd agent-desktop && npm run typecheck`
Expected: clean

**Step 2: Full test suite**
Run: `cd agent-desktop && npx vitest run`
Expected: all pass

**Step 3: Commit if any test fixes needed**