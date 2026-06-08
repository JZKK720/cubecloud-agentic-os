# Agent Skills Bundle

This folder holds the install scripts, status checker, and notes for the six agent-skill repos wired into Copilot (and the related runtimes), plus repo-authored workflow add-ons that sit on top of those integrations.

## What is installed and what is deferred

| Repo | What it is | Status |
|---|---|---|
| [JZKK720/andrej-karpathy-skills](https://github.com/JZKK720/andrej-karpathy-skills) | Karpathy's 4 coding principles as a `CLAUDE.md` | **Done.** Distilled into `.github/copilot-instructions.md`. Upstream `CLAUDE.md` fetched to `andrej-karpathy-skills.CLAUDE.md` (2,357 bytes) for diffing. |
| [JZKK720/ECC](https://github.com/JZKK720/ECC) | Cross-harness performance system (63 agents / 251 skills / 79 commands) | **Done.** Distilled into `.github/copilot-instructions.md` and 6 `.github/prompts/*.prompt.md`. |
| [JZKK720/gstack](https://github.com/JZKK720/gstack) | 23-skill engineering workflow harness | **Deferred.** Requires Bun + Claude Code, neither on this machine. |
| [JZKK720/gbrain](https://github.com/JZKK720/gbrain) | MCP server for persistent agent memory | **Deferred.** Requires Bun. |
| [JZKK720/taste-skill](https://github.com/JZKK720/taste-skill) | Anti-slop frontend design rules | **Done.** All 13 upstream `SKILL.md` files installed to `.agents/skills/` via the Vercel `npx skills add` CLI. The CLI is now Copilot-aware and the `universal` install path includes GitHub Copilot. Plus 13 reference copies in `taste-skill-ref/`, 5 slash prompts in `.github/prompts/`, and a user-level distill at `%APPDATA%\Code\User\prompts\taste-skill-design-rules.instructions.md`. |
| [JZKK720/AI-Engineering-Coach](https://github.com/JZKK720/AI-Engineering-Coach) | VS Code extension for AI session analytics | **Done.** Built `ai-engineer-coach-0.1.0.vsix` (3.08 MB) from `main` and installed via `code --install-extension`. |

## Repo-authored workflow add-ons

| Workflow | What it is | Status |
|---|---|---|
| Headroom workflow | Repo-authored Copilot / VS Code workflow layer for Headroom proxy, MCP, `headroom wrap copilot`, CodeGraph bundle compression, and non-repo global skill mirroring | **Done.** Repo-local skill at `.github/skills/headroom-workflow/SKILL.md`, standalone install/use guide at `docs/agent-skills-bundle/HEADROOM.md`, helper installer at `docs/agent-skills-bundle/install-headroom-workflow.cmd`, and optional user-global mirror path at `~/.agents/skills/headroom-workflow/`. |

## What is in your VS Code right now

Every Copilot Chat session, in any workspace, will see:

1. The **Karpathy + ECC distilled rules** in `.github/copilot-instructions.md` (this workspace).
2. The **global taste-skill design rules** in `%APPDATA%\Code\User\prompts\taste-skill-design-rules.instructions.md` (all workspaces).
3. The **slash prompts** in the Copilot Chat `/` menu (this workspace only):
   - `plan`, `tdd`, `code-review`, `security-review`, `build-fix`, `refactor` (ECC distill)
   - `taste-skill`, `taste-soft`, `taste-minimalist`, `taste-redesign`, `taste-image-to-code` (taste-skill wraps)
4. The **13 taste-skill SKILL.md files** in `.agents/skills/` (auto-discovered by VS Code Copilot Chat):
   `design-taste-frontend`, `design-taste-frontend-v1`, `full-output-enforcement`, `gpt-taste`, `high-end-visual-design`, `image-to-code`, `imagegen-frontend-mobile`, `imagegen-frontend-web`, `industrial-brutalist-ui`, `minimalist-ui`, `redesign-existing-projects`, `stitch-design-taste`, `brandkit`.
5. The **AI-Engineering-Coach VS Code extension** in the Extensions sidebar. Open the command palette and run "AI Engineer Coach: Open Dashboard".
6. In this repo, **Headroom-aware workflow guidance** via `.github/copilot-instructions.md` and `.github/skills/headroom-workflow/`. Outside this repo, the same workflow can be mirrored to `~/.agents/skills/headroom-workflow/`; see `docs/agent-skills-bundle/HEADROOM.md` or run `docs\agent-skills-bundle\install-headroom-workflow.cmd`.

## Why some pieces are not auto-installed

- **gstack** is a Claude Code plugin. It writes to `%USERPROFILE%\.claude\skills\gstack` and is consumed by Claude Code sessions. VS Code Copilot will not see it. Requires Bun.
- **gbrain** is an MCP server, not a skill. It can serve Claude Code, Codex, and VS Code Copilot (via MCP support in newer Copilot Chat builds), but the install is a separate step. Requires Bun.

The **Vercel `npx skills add` CLI** that I previously worked around with custom prompts is now Copilot-aware. It installs to `.agents/skills/` (this workspace) and `.claude/skills/` (Claude Code), and the install registry explicitly lists `GitHub Copilot` as a target. Re-run it any time to refresh.

## Optional installers

```cmd
:: from the repo root
docs\agent-skills-bundle\install-optional-stack.cmd
```

Menu:

```
[G] gstack
[B] gbrain
[T] taste-skill
[C] AI-Engineering-Coach
[A] All of the above
[Q] Quit
```

You can also pass a comma-separated option list to skip the menu:

```cmd
:: Non-interactive
docs\agent-skills-bundle\install-optional-stack.cmd g,t
docs\agent-skills-bundle\install-optional-stack.cmd g,b,t,c
```

`run-1-and-3.cmd` is a convenience wrapper for the gstack + taste-skill combination.

gstack and gbrain will skip themselves with a clear "Bun not found" message because Bun is not on this machine.

## Status check

```cmd
docs\agent-skills-bundle\status.cmd
```

Expected output on a clean install:

```
--- Workspace Copilot instructions (always on in this repo) ---
  OK   .github\copilot-instructions.md  (4426 bytes)
--- Slash prompts in this workspace ---
  OK   11 prompt files in .github\prompts\
--- Vercel agent-skills in .agents\skills\ (Copilot picks up automatically) ---
  OK   13 skill directories in .agents\skills\
        - brandkit
        - design-taste-frontend
        - design-taste-frontend-v1
        - full-output-enforcement
        - gpt-taste
        - high-end-visual-design
        - image-to-code
        - imagegen-frontend-mobile
        - imagegen-frontend-web
        - industrial-brutalist-ui
        - minimalist-ui
        - redesign-existing-projects
        - stitch-design-taste
--- User-level Copilot instructions (always on, all workspaces) ---
  OK   taste-skill-design-rules.instructions.md  (5499 bytes)
--- Upstream reference (Karpathy CLAUDE.md) ---
  OK   andrej-karpathy-skills.CLAUDE.md  (2357 bytes)
--- Upstream reference (taste-skill SKILL.md files) ---
  OK   13 SKILL.md files in taste-skill-ref\
--- AI-Engineering-Coach VS Code extension ---
  OK   installed: ai-engineer-coach.ai-engineer-coach
--- Toolchains ---
  MISS bun    - needed for gstack / gbrain
  MISS claude - needed for gstack / Claude Code skills
  OK   code on PATH
  OK   npx on PATH
--- Optional stacks (deferred) ---
  SKIP gstack not installed. Run install-optional-stack.cmd then G
  SKIP gbrain not installed. Run install-optional-stack.cmd then B
```

## How to verify

Reload VS Code (`Ctrl+Shift+P` -> `Developer: Reload Window`). Then in Copilot Chat:

1. Type `/` and confirm 11 prompts show up.
2. Ask a coding question. The response should reflect the Karpathy/ECC distilled rules.
3. Ask a design question. The response should reflect the anti-slop design rules.
4. In the sidebar, click the AI Engineer Coach icon to see the usage dashboard.

## Files in this folder

```
README.md                                this file
status.cmd                               health check
install-optional-stack.cmd               menu installer for gstack/gbrain/taste-skill/Coach
                                        (also accepts non-interactive args: install g,t)
install-andrej-karpathy-skills.cmd       fetches the upstream Karpathy CLAUDE.md
install-headroom-workflow.cmd            mirrors the Headroom workflow skill to ~/.agents/skills/
run-1-and-3.cmd                          convenience wrapper for gstack + taste-skill
_check-net.ps1                           TCP probe for github.com:443
_fetch-karpathy.ps1                      PowerShell shim for the Karpathy fetch
_fetch-coach-vsix.ps1                    downloads Coach .vsix from upstream releases
_build-coach.ps1                         clones Coach, runs npm ci + npm run package
_fetch-taste2.ps1                        fetches all 13 taste-skill SKILL.md files
_list-taste-skills.ps1                   lists taste-skill subdirs (debug)
_map-names.ps1                           maps installed .agents/skills\ names to frontmatter
_map-ref-names.ps1                       maps taste-skill-ref\ names to frontmatter
run-1-and-3.ps1                          PowerShell shim for run-1-and-3.cmd
.gitignore                               excludes _coach-src/ and _vsix/ from git
andrej-karpathy-skills.CLAUDE.md         upstream Karpathy text (committed)
taste-skill-ref/                         13 upstream taste-skill SKILL.md files (committed)
_coach-src/                              Coach source clone (gitignored)
_vsix/                                   built .vsix files (gitignored)
```

The `.agents/skills/` directory created by the Vercel `npx skills add` CLI is in the workspace root, not in this folder.

## Attribution

- Karpathy 4 principles: `multica-ai/andrej-karpathy-skills` (MIT)
- ECC Copilot adapter: `affaan-m/ECC` (MIT)
- taste-skill: `Leonxlnx/taste-skill` (MIT)
- AI-Engineering-Coach: `microsoft/AI-Engineering-Coach` (MIT)

All four upstream projects are MIT-licensed. Rules are distilled and adapted for this workspace; upstream files (the Karpathy `CLAUDE.md` and the 13 taste-skill `SKILL.md` files in `taste-skill-ref/`) are committed verbatim as reference material. The 13 taste-skill SKILL.md files in `.agents/skills/` are installed verbatim by the Vercel CLI. The AI-Engineering-Coach extension is built from upstream source with no modifications.
