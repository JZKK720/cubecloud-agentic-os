# Headroom for Copilot and VS Code

This guide covers the **non-repo** setup path for using Headroom with
GitHub Copilot and VS Code outside `cubecloud-agentic-os`.

## What this adds

Headroom itself is an upstream runtime/tooling layer:

- local proxy
- local MCP server
- agent wrappers such as `headroom wrap copilot`
- reversible retrieval and context compression

This repo adds the missing **Copilot workflow layer** on top:

- a repo-local workflow skill at `.github/skills/headroom-workflow/`
- a user-global workflow skill at `~/.agents/skills/headroom-workflow/`
- Headroom-aware agent instructions for this workspace

For non-repo Copilot sessions, the important part is the global skill
plus a working Headroom runtime on the machine.

## Fast path

### 1. Install Headroom

Choose one of these:

```powershell
pip install "headroom-ai[all]"
```

```powershell
pipx install --python python3.13 "headroom-ai[all]"
```

Headroom requires Python 3.10+.

### 2. Choose how Copilot should talk to Headroom

#### Option A: proxy mode

Use this when you want a local compression layer without changing your
app code.

```powershell
headroom proxy --port 8787
```

This is the easiest option for local experimentation and token-pressure
troubleshooting.

#### Option B: MCP mode

Use this when you want Headroom as MCP tools (`headroom_compress`,
`headroom_retrieve`, `headroom_stats`) in an MCP-aware client.

```powershell
headroom mcp install
```

Then register the MCP server in the client that will use it. Newer
Copilot Chat builds can consume MCP servers, but the exact UI surface
varies by build.

#### Option C: Copilot CLI wrap mode

Use this when you are working specifically through GitHub Copilot CLI.

```powershell
headroom wrap copilot --subscription -- --model gpt-4o
```

That lets Headroom place its proxy/compression layer in front of the
Copilot CLI traffic.

## 3. Install the global Copilot workflow skill

The repo ships a reusable workflow skill at:

- repo-local: `.github/skills/headroom-workflow/SKILL.md`
- user-global: `~/.agents/skills/headroom-workflow/SKILL.md`

The fastest path from this repo is:

```powershell
docs\agent-skills-bundle\install-headroom-workflow.cmd
```

That command mirrors the repo-local workflow skill into the user-global
Copilot skills directory and prints the next Headroom runtime steps.

If you prefer the manual path, create the global copy with:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.agents\skills\headroom-workflow" | Out-Null
Copy-Item \
  "<path-to-repo>\.github\skills\headroom-workflow\SKILL.md" \
  "$env:USERPROFILE\.agents\skills\headroom-workflow\SKILL.md" \
  -Force
```

In this repo's current development environment, that global copy has
already been created at:

- `C:\Users\joeyz\.agents\skills\headroom-workflow\SKILL.md`

## 4. Reload VS Code

After installing or updating the skill or MCP config:

1. run `Developer: Reload Window`
2. reopen Copilot Chat
3. test a Headroom-shaped prompt such as:
   - `I have a huge tool log; should this go through Headroom?`
   - `Show me when to use Headroom proxy vs MCP mode.`
   - `I need to compress a large CodeGraph bundle before sending it to the model.`

## When the skill should trigger

The workflow skill is meant for requests involving:

- token pressure
- long logs
- wide tool output
- large CodeGraph or search bundles
- `headroom learn`
- `headroom wrap copilot`
- deciding between Headroom proxy / MCP / wrap modes

## What this guide does not do

- It does not vendor Headroom into this repo.
- It does not claim the global skill is a substitute for the Headroom runtime.
- It does not assume every Copilot build exposes MCP in exactly the same way.

## Related files

- `.github/skills/headroom-workflow/SKILL.md`
- `.github/copilot-instructions.md`
- `cubecloud-desktop/AGENTS.md`
- `docs/agent-skills-bundle/README.md`
- `docs/GLOBAL-INSTALL-PLAN.md`
