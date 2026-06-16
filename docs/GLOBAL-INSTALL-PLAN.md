# Global Skill-Pack Install Plan

> **Scope:** install-once-at-user-scope packs that travel with the user
> across every project they open, in every AI tool they use. This is
> separate from the project-scope skills in
> [`agent-desktop/.agents/skills/`](../agent-desktop/.agents/skills/),
> which are loaded by agent-desktop's internal agent runtime.

## When to use this guide

If you (the human user) want to upgrade the **everyday** experience of
your AI tools  -  Claude Code, GitHub Copilot, Cursor, Codex, Hermes, and
friends  -  with cross-project workflow skills, this is the plan.

If you want to upgrade **agent-desktop's internal agent**, the
project-scope skills in
`agent-desktop/.agents/skills/` are the right place; see the
SKILL.md files there for what is already loaded.

## Tier 1  -  install these (high value, designed for global install)

### 1. Karpathy Guidelines (Andrej Karpathy's 4 principles)

Single `CLAUDE.md` file. Biases the agent toward thinking before
coding, simplicity, surgical edits, and goal-driven execution. Works
in every AI tool that reads a `CLAUDE.md` / `AGENTS.md` / project
memory file.

**Install** (one line, pick your tool):

```bash
# Claude Code (project-scope  -  copy into any project, or per-user)
curl -o ~/.claude/CLAUDE.md \
  https://raw.githubusercontent.com/JZKK720/andrej-karpathy-skills/main/CLAUDE.md

# GitHub Copilot (project-scope)
curl -o .github/copilot-instructions.md \
  https://raw.githubusercontent.com/JZKK720/andrej-karpathy-skills/main/CLAUDE.md

# Cursor (per-user)
mkdir -p ~/.cursor/rules
curl -o ~/.cursor/rules/karpathy-guidelines.mdc \
  https://raw.githubusercontent.com/JZKK720/andrej-karpathy-skills/main/.cursor/rules/karpathy-guidelines.mdc
```

**What it activates**: 4 principles auto-injected into every AI tool
session. The `karpathy-guidelines` skill in
`agent-desktop/.agents/skills/` is the project-scope mirror.

**Verify**: start a fresh Claude Code session and ask *"list the
guidelines you're operating under"*; the 4 principles should be
echoed.

**Uninstall**: delete the file from the location above.

---

### 2. gstack (Garry Tan's 23-skill workflow process)

The canonical "sprint" skill pack: `/office-hours`, `/plan-ceo-review`,
`/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`,
`/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`,
`/qa`, `/browse`, `/careful`, `/freeze`, `/guard`, `/investigate`,
`/document-release`, `/document-generate`, `/codex`, `/cso`,
`/autoplan`, `/spec`, `/learn`. Plus 6 standalone CLI binaries.

**Install** (the canonical one-liner):

```bash
# macOS / Linux
git clone --single-branch --depth 1 https://github.com/JZKK720/gstack.git \
  ~/.claude/skills/gstack
~/.claude/skills/gstack/setup

# Windows (PowerShell)
git clone --single-branch --depth 1 https://github.com/JZKK720/gstack.git \
  $HOME\.claude\skills\gstack
& $HOME\.claude\skills\gstack\setup.ps1
```

**What it activates**: 23 slash-commands in Claude Code. The `setup`
script auto-detects other installed tools (Cursor, Codex, OpenCode,
Copilot, etc.) and installs the appropriate skill bindings.

**Verify**: in Claude Code, type `/`  -  `/office-hours`, `/review`,
`/ship`, `/careful`, etc. should all appear.

**Uninstall**: `~/.claude/skills/gstack/bin/gstack-uninstall` (handles
skills, symlinks, global state `~/.gstack/`, project-local state, browse
daemons, temp files). Or follow the manual removal steps in the
upstream README.

---

### 3. taste-skill (anti-slop frontend design)

11 implementation skills (output code) + 3 image-generation skills
(output reference images). The default `taste-skill` is now v2
(experimental); the v1 install name is preserved for projects depending
on exact v1 behavior.

**Install**:

```bash
# All skills
npx skills add https://github.com/JZKK720/taste-skill

# Just the default anti-slop skill
npx skills add https://github.com/JZKK720/taste-skill --skill "design-taste-frontend"

# Common variants
npx skills add https://github.com/JZKK720/taste-skill --skill "redesign-skill"
npx skills add https://github.com/JZKK720/taste-skill --skill "minimalist-skill"
npx skills add https://github.com/JZKK720/taste-skill --skill "brutalist-skill"
npx skills add https://github.com/JZKK720/taste-skill --skill "soft-skill"
npx skills add https://github.com/JZKK720/taste-skill --skill "gpt-taste"
```

**What it activates**: the `npx skills` CLI installs to user-scope
(typically `~/.claude/skills/`, with equivalents for Codex, Cursor,
etc.). After install, the skills are auto-loaded by Claude Code and
siblings whenever the user opens any project.

**Verify**: in Claude Code, ask *"what is the current
`DESIGN_VARIANCE` value?"*  -  the agent should reference the dial
system from taste-skill's v2.

**Uninstall**: `npx skills remove <skill-name>` (use `npx skills list`
first to see the install name).

---

## Tier 2  -  install if your workflow benefits

### 4. Understand-Anything (codebase knowledge graph)

Multi-agent pipeline (6 specialized agents: project-scanner,
file-analyzer, architecture-analyzer, tour-builder, graph-reviewer,
domain-analyzer) that uses tree-sitter + LLM to build an interactive
knowledge graph of any codebase, with an Astro web dashboard.

**Best for**: a *single* tool (pick Claude Code, Cursor, or Copilot)
that you'll use as your primary AI assistant. Don't install across all
13 supported platforms.

**Install**:

```bash
# Claude Code (the canonical install)
# In Claude Code, run:
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything

# Or one-line install for most other tools
curl -fsSL https://raw.githubusercontent.com/JZKK720/Understand-Anything/main/install.sh | bash -s codex
# (substitute: codex, opencode, openclaw, antigravity, gemini, pi,
#  vibe, vscode, hermes, cline, kimi, trae)

# Windows (PowerShell)
iwr -useb https://raw.githubusercontent.com/JZKK720/Understand-Anything/main/install.ps1 | iex
```

**What it activates**: the `/understand` slash command runs the
multi-agent pipeline and writes `.understand-anything/knowledge-graph.json`
into the current project. `/understand-dashboard` opens the interactive
graph in a browser.

**Why this is not Tier 1**: it's project-scope by design (the plugin
manifest lives in the repo you analyze). The dashboard is global; the
analyzer is local.

**Verify**: in a code project, run `/understand`  -  after ~2-5 minutes,
a `knowledge-graph.json` should appear in `.understand-anything/`.

**Uninstall**: `./install.sh --uninstall <platform>`.

---

### 5. gbrain (personal knowledge brain)

Postgres-native personal knowledge brain with a gbrain-native skill
catalog, 30+ MCP tools, synthesis layer (writes the *answer* with
citations, not just ranked pages), self-wiring knowledge graph, and
3 named schema packs.

**Best for**: power users who want their AI tools to do
brain-first-retrieval before any external search. Overlaps conceptually
with agent-desktop's `wiki/` + `learnings/` modules  -  pick one or
the other, not both.

**Install**:

```bash
# 1. Install the gbrain CLI
bun install -g github:garrytan/gbrain
# (or: npm install -g github:garrytan/gbrain)

# 2. Initialize a local PGLite brain (no Docker, no server, ~2s)
gbrain init --pglite

# 3. Register as an MCP server for every AI tool you use
# Claude Code:
claude mcp add gbrain -- gbrain serve
# Codex:
codex mcp add gbrain -- gbrain serve
# Cursor / Windsurf: add {"command": "gbrain", "args": ["serve"]} to MCP config
```

**What it activates**: `gbrain search`, `gbrain capture`,
`gbrain think`, `gbrain put`, etc. become first-class typed tools in
every AI tool. The agent brain-firsts before grepping the filesystem.

**Verify**: in Claude Code, ask *"search my brain for the last time I
worked on X"*  -  the agent should call `gbrain_search` and return
synthesized results with citations.

**Uninstall**: `rm -rf ~/.gbrain` (the brain directory). Remove the MCP
server registration from each tool's config.

---

### Headroom (context compression layer)

Local-first context compression layer for coding agents and Copilot-adjacent workflows. Headroom itself is not a pure skill pack; it is an upstream runtime that can run as a proxy, an MCP server, or a Copilot CLI wrapper.

**Best for**: users who hit token pressure in Copilot, CodeGraph, search, log-heavy, or multi-agent sessions and are willing to run a local Python helper.

**Install runtime**:

```bash
pip install "headroom-ai[all]"
# or
pipx install --python python3.13 "headroom-ai[all]"
```

**Choose your mode**:

```bash
headroom proxy --port 8787
# or
headroom mcp install
# or
headroom wrap copilot --subscription -- --model gpt-4o
```

**Install the Copilot workflow layer**: either copy the repo-authored workflow skill to `~/.agents/skills/headroom-workflow/` manually, or run `docs\agent-skills-bundle\install-headroom-workflow.cmd` from this repo. The exact steps are documented in `docs/agent-skills-bundle/HEADROOM.md`.

**Why this is Tier 2**: the value is high, but unlike a pure skill it requires a local Python runtime plus proxy/MCP/wrap wiring.

**Verify**: reload VS Code, open Copilot Chat, and ask when Headroom should be used for a very large log or CodeGraph bundle. The workflow skill should bias the answer toward proxy/MCP/wrap guidance instead of generic token advice.

**Uninstall**: stop the proxy or remove the MCP registration, uninstall `headroom-ai`, and delete `~/.agents/skills/headroom-workflow/` if you no longer want the Copilot-side workflow layer.

---

## Tier 3  -  skip or cherry-pick

### 6. EverOS (long-term memory framework)

Python framework (markdown + SQLite + LanceDB) for "conversations,
agent trajectories, and files →structured, retrievable, evolving
long-term memory". Architecture: DDD 5 layers, dual-track memory
(user-track + agent-track), cascade file-watcher →sub-second sync.

**Skip the engine.** It's a Python service, not a Copilot-skill-shaped
artifact. Installing it for "global Copilot" requires a long-lived
Python daemon, an MCP bridge (you write it), and a separate
storage location.

**Pattern-port instead.** The two ideas worth lifting:
- The *memory taxonomy* (`user.md` + `episodes/` + `.atomic_facts/` +
  `.foresights/` + `agent.md` + `.cases/` + `skills/`) is a really
  good shape for personal-knowledge management.
- The *cascade file-watcher →diff →sync* idea is what makes gbrain
  feel instant. If you build your own memory layer, copy that.

### 7. ECC (everything-claude-code by affaan-m)

63 agents + 249 skills + 79 commands + 34 rules + 14 MCP servers +
20+ hook scripts. The full Claude Code plugin pack.

**Install is the user's job, not ours.** The canonical install is
`npx ecc-install --profile full --target claude` (or the GitHub
marketplace path: `/plugin marketplace add affaan-m/ECC` then
`/plugin install ecc@ecc`). The user runs the install command in 30
seconds. We don't ship ECC into agent-desktop; the user installs
ECC into Claude Code if they want it.

**Cherry-pick 5-10 specific skills** from ECC's catalog into the
project-scope `agent-desktop/.agents/skills/` if you find gaps.
Candidates worth considering: `tdd-workflow`, `verification-loop`,
`strategic-compact`, `continuous-learning-v2`, `api-design`,
`database-migrations`, `docker-patterns`, `e2e-testing`. None of
these are blocking for V2.2.

---

## What this plan does NOT do

1. **It does not modify agent-desktop's project-scope skills.**
   `agent-desktop/.agents/skills/` is for the internal agent
   runtime, which is project-bound. The Tier 1 installs above
   augment the *user's* AI tools; the project-scope skills are
   independent of those.
2. **It does not bundle any third-party code into this repo.** The
   three `git clone` / `npx add` / `curl` commands above pull from
   upstream repos. If those repos go away or change, this plan
   becomes outdated.
3. **It does not auto-update.** Unlike gstack's `--team` mode, this
   is a one-time install. The user re-runs the install commands
   when they want to update.

## Verification matrix

After running the Tier 1 installs, this is what should work:

| Tool | Verification |
|------|--------------|
| Claude Code | `/` shows gstack skills; CLAUDE.md echoes Karpathy principles; design questions reference taste-skill dials |
| GitHub Copilot | In any project, ask the agent about a design decision; Copilot follows taste-skill's em-dash ban + one-accent rule |
| Cursor | `.cursor/rules/karpathy-guidelines.mdc` is loaded; agent edits are surgical |
| Codex | If you registered gbrain MCP, `gbrain search` works; if you ran gstack's Codex host, skills are loaded |
| OpenCode | gstack's `--host opencode` setup creates `~/.config/opencode/skills/gstack-*/` |

## File-map of where things end up (Windows / macOS / Linux)

| Path | Used by |
|------|---------|
| `~/.claude/CLAUDE.md` | Claude Code per-user (Karpathy) |
| `~/.claude/skills/gstack/` | Claude Code global (gstack) |
| `~/.claude/skills/design-taste-frontend/` | Claude Code global (taste-skill) |
| `~/.codex/skills/gstack-*/` | Codex (gstack) |
| `~/.config/opencode/skills/gstack-*/` | OpenCode (gstack) |
| `~/.cursor/rules/karpathy-guidelines.mdc` | Cursor per-user (Karpathy) |
| `~/.gbrain/` | All tools (gbrain local brain) |
| `.github/copilot-instructions.md` | Copilot per-project (Karpathy) |
| `~/.understand-anything/repo/` | All tools (Understand-Anything plugin) |

The path conventions are platform-specific but the per-tool install
commands in each section are portable.

## See also

- [`agent-desktop/.agents/skills/karpathy-guidelines/SKILL.md`](../agent-desktop/.agents/skills/karpathy-guidelines/SKILL.md)  -  project-scope mirror of the Karpathy guidelines, synced to upstream's `CLAUDE.md`
- [`agent-desktop/.agents/skills/design-taste-frontend/SKILL.md`](../agent-desktop/.agents/skills/design-taste-frontend/SKILL.md)  -  project-scope mirror of taste-skill v2, adapted for the agent-desktop renderer
- [`docs/agent-skills-bundle/HEADROOM.md`](agent-skills-bundle/HEADROOM.md)  -  non-repo Copilot / VS Code install path for Headroom proxy, MCP, and global workflow skill mirroring
- [`agent-desktop/.agents/skills/`](agent-desktop/.agents/skills/)  -  the full 24-skill project-scope collection
- [`changelogs/0.6.0.md`](changelogs/0.6.0.md)  -  V2 harvest + V2.2 addendum (the work that produced the in-repo skill set)
