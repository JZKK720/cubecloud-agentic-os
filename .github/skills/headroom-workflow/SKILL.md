---
name: headroom-workflow
description: Handles Headroom context-compression workflows for Cubecloud desktop, Copilot, and VS Code. Use when the task mentions headroom, context compression, token savings, large tool outputs, long logs, CodeGraph bundle compression, headroom mcp, headroom proxy, headroom wrap copilot, headroom learn, or wiring Headroom into Copilot outside this repo.
license: Apache-2.0
metadata:
  author: Cubecloud Contributors
  source: https://github.com/JZKK720/headroom
  version: "1.0.0"
---

# Headroom Workflow

## Quick start

Use this workflow when a request touches any of these surfaces:

- `agent-desktop/src/main/headroom.ts`
- `agent-desktop/src/main/headroom-sidecar.ts`
- `agent-desktop/src/main/headroom-bundle.ts`
- `agent-desktop/src/main/mcp/headroom-mcp-server.ts`
- `agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`
- `agent-desktop/src/main/codegraph.ts`
- repo/global Copilot instructions that should react to large context or Headroom-specific requests
- global skill mirroring to `~/.agents/skills/`

## First rule: do not rediscover what already exists

In this repo, Headroom is already integrated on the desktop side.
Before proposing new runtime integration, verify the existing surfaces:

- the desktop Headroom screen
- the Python proxy sidecar lifecycle manager
- the local MCP server wrapper
- the CodeGraph →Headroom compression path

If the user asks "should we integrate Headroom?", the likely real gap is not the desktop runtime layer. The likely gap is the Copilot / VS Code workflow layer.

## Integration planes

### 1. Desktop runtime plane

Use this plane when the request is about:

- local Python proxy lifecycle
- MCP server lifecycle
- CodeGraph bundle compression
- renderer controls for compression / stats / learn
- local loopback endpoints, ports, and sidecar health

Primary owning files:

- `agent-desktop/src/main/headroom.ts`
- `agent-desktop/src/main/headroom-sidecar.ts`
- `agent-desktop/src/main/mcp/headroom-mcp-server.ts`
- `agent-desktop/src/main/codegraph.ts`
- `agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`

### 2. Repo-local Copilot plane

Use this plane when the request is about:

- when Copilot should think about Headroom
- large-context compression rules
- how to guide agents toward Headroom for logs, tool output, or code bundles
- repo-specific workflow guidance

Primary owning files:

- `.github/copilot-instructions.md`
- `agent-desktop/AGENTS.md`
- `.github/skills/headroom-workflow/SKILL.md`

### 3. Non-repo / global Copilot plane

Use this plane when the request is about:

- using Headroom in VS Code Copilot outside this repo
- installing a reusable skill into `~/.agents/skills/`
- wiring a local Headroom proxy or MCP server for normal Copilot sessions
- documenting how users can reuse the workflow across workspaces

Primary surfaces:

- `~/.agents/skills/headroom-workflow/SKILL.md`
- `docs/agent-skills-bundle/README.md`
- `docs/agent-skills-bundle/HEADROOM.md`
- `docs/GLOBAL-INSTALL-PLAN.md`

## Recommended decision order

1. Ask whether the user needs **compression advice**, **desktop runtime behavior**, or **global Copilot setup**.
2. If it is desktop/runtime work, start from the owning Headroom main-process file, not from high-level docs.
3. If it is workflow/setup work, prefer the skill + instruction + doc surfaces over runtime edits.
4. If it is non-repo Copilot work, document both pieces explicitly:
   - the Headroom runtime install (`pip install` / `pipx install` / proxy / MCP)
   - the Copilot-side skill install (`~/.agents/skills/headroom-workflow/`)

## What to document for non-repo Copilot sessions

At minimum, cover these steps:

1. Install Headroom itself:
   - `pip install "headroom-ai[all]"`
   - or `pipx install --python python3.13 "headroom-ai[all]"`
2. Pick the transport:
   - `headroom proxy --port 8787` for local proxy mode
   - `headroom mcp install` or equivalent MCP registration for MCP-native mode
3. Install the workflow skill globally:
   - copy this skill folder to `~/.agents/skills/headroom-workflow/`
4. Reload VS Code / Copilot Chat so the skill and MCP registry are re-read.
5. Be honest about review status: the workflow skill is local glue; Headroom itself stays upstream and should not be copied into this repo as vendored code unless there is a separate provenance decision.

## Good triggers for Headroom

Headroom is a good fit when the user is dealing with:

- very long logs
- wide tool output
- large CodeGraph or search bundles
- repeated token pressure in coding-agent sessions
- multi-agent shared context / reversible retrieval
- `headroom learn` updates to `AGENTS.md`, `CLAUDE.md`, or related instruction files
- GitHub Copilot CLI wrapping via `headroom wrap copilot`

## When not to force it

Do not force Headroom into every request.
Skip or defer it when:

- the context is already small
- the user is debugging something unrelated to token pressure
- the environment cannot run local Python processes or local loopback helpers
- the user only wants a one-off wording/document change

## Related files

- `agent-desktop/src/main/headroom.ts`
- `agent-desktop/src/main/headroom-sidecar.ts`
- `agent-desktop/src/main/mcp/headroom-mcp-server.ts`
- `agent-desktop/src/main/codegraph.ts`
- `agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`
- `docs/agent-skills-bundle/README.md`
- `docs/agent-skills-bundle/HEADROOM.md`
- `docs/GLOBAL-INSTALL-PLAN.md`
