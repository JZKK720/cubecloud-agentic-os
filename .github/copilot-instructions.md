<!--
Workspace-level Copilot instructions for cubecloud-agentic-os.
Distilled from:
  - https://github.com/JZKK720/andrej-karpathy-skills (Karpathy's 4 principles)
  - https://github.com/JZKK720/ECC (Everything Claude Code, Copilot adapter)
  - https://github.com/JZKK720/taste-skill (anti-slop design rules, user-level)
Apply to: every Copilot Chat request in this workspace.

> **Project-specific rules (build commands, brand-pack source of truth,
> swappable-surface contract, i18n workflow, security floor) live in
> the workspace-root [`AGENTS.md`](../AGENTS.md).** This file carries
> the generic Karpathy/ECC principles that apply across every Copilot
> session in this workspace. For desktop-only work, also read
> [`agent-desktop/AGENTS.md`](../agent-desktop/AGENTS.md).
-->

# Copilot Instructions —cubecloud-agentic-os

## 1. Think Before Coding

- State assumptions explicitly. If you are uncertain between two interpretations of the request, surface **both** before picking one.
- Do not silently pick. If the user's request is ambiguous in a way that affects the implementation, ask one clarifying question.
- Push back when warranted. If a simpler approach exists, say so before writing code.
- Stop when confused. Name what is unclear instead of guessing.

## 2. Simplicity First

- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked. No abstractions for single-use code.
- No "flexibility" or "configurability" that was not requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it. The test: would a senior engineer say this is overcomplicated? If yes, simplify.

## 3. Surgical Changes

- Touch only what you must. Clean up only your own mess.
- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor things that are not broken.
- Match existing style, even if you would do it differently.
- If you notice unrelated dead code, mention it —do not delete it.
- When your changes create orphans, remove imports / variables / functions that **your** changes made unused. Do not remove pre-existing dead code unless asked.

## 4. Goal-Driven Execution

- Transform imperative tasks into verifiable goals before writing code.
- For multi-step tasks, state a brief plan with a verify step on each line.
- For "fix the bug" / "add validation" / "refactor X" style tasks, write a test that reproduces the goal first, then make it pass.
- Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Workflow Defaults (from ECC Copilot adapter)

- Use slash prompts in `.github/prompts/` for structured tasks:
  - `plan.prompt.md` for implementation planning
  - `tdd.prompt.md` for red/green/improve cycles
  - `code-review.prompt.md` for review of the current diff
  - `security-review.prompt.md` for OWASP-aligned review
  - `build-fix.prompt.md` for failing builds
  - `refactor.prompt.md` for dead-code cleanup
- Plan before you build. If a task will touch more than 3 files or change a public API, run `plan.prompt.md` first and stop after the user approves.
- TDD by default. Every non-trivial change ships with a test.
- No drive-by refactors. Format-only changes belong in a separate commit.

## 6. Security Floor (always on)

- Never write secrets, tokens, or PEM blocks into source files. If a value looks like a secret, refuse to inline it and suggest Key Vault / env / managed identity instead.
- Never disable a linter, type checker, or hook to make a build pass. Fix the underlying issue.
- Treat user input as untrusted. Validate at the boundary, escape at the render boundary.
- Run `security-review.prompt.md` on any change that touches auth, network, IPC, file I/O outside a known safe directory, or a public API surface.

## 7. Tradeoff Note

These rules bias toward caution. For trivial tasks (one-line typo, obvious rename, single-line import) use judgment —not every change needs the full rigor. The goal is reducing costly mistakes on non-trivial work, not slowing down simple tasks.

## 8. Skills Bundle (this workspace)

- Always-on rules: this file
- Slash prompts: `.github/prompts/`
- Optional stacks installed by `docs/agent-skills-bundle/install-optional-stack.cmd`:
  - gstack (Claude Code) —workflow skills, separate runtime
  - gbrain (MCP) —persistent memory, separate daemon
  - taste-skill (Vercel `agent-skills`) —anti-slop design rules
  - AI-Engineering-Coach (VS Code extension) —usage dashboard
  - See `docs/agent-skills-bundle/README.md` for the full map.

## 9. Docs & I18n Workflow

- Outer root + `docs/` are the source of truth for monorepo docs; the inner `agent-desktop/` tree mirrors many of them via Windows hardlinks and junctions. Treat `README.md` as the intentional exception: outer and inner README are different by design.
- `README.i18n.md` is the single source of truth for translation inventory. Monorepo translations live next to the outer source path (for example `README.zh-CN.md`, `docs/HANDBOOK.zh-CN.md`, `docs/handbook/*.zh-CN.md`); binary translations live in `agent-desktop/`.
- When a request involves doc sync, translation updates, screenshot / preview refresh, or the combined README PDF, prefer the dedicated repo workflow skill at `.github/skills/docs-i18n-refresh/SKILL.md`.
- After editing `README.md` or `README.zh-CN.md`, re-render `docs/Cubecloud-README-en-zh.pdf` with `node scripts/v2.10.20-readme-combined-pdf.cjs`.
- Be skeptical of PowerShell mojibake in console output. Verify bytes before declaring a file corrupted, and prefer UTF-8-safe Node edits for CJK-heavy docs.

## 10. Headroom Workflow

- Headroom is already integrated on the desktop/runtime side in `agent-desktop/src/main/headroom*.ts`, `agent-desktop/src/main/mcp/headroom-mcp-server.ts`, and `agent-desktop/src/renderer/src/screens/Headroom/Headroom.tsx`; do not describe it as missing without checking those surfaces first.
- When a request mentions Headroom, context compression, token savings, large tool outputs, long logs, CodeGraph bundle compression, `headroom learn`, `headroom wrap copilot`, or Copilot-wide Headroom setup, prefer the dedicated workflow skill at `.github/skills/headroom-workflow/SKILL.md`.
- For non-repo Copilot / VS Code sessions, treat the Headroom runtime install and the Copilot skill install as separate steps; the install/use guide lives at `docs/agent-skills-bundle/HEADROOM.md`.

---

**Attribution:** Karpathy 4 principles adapted from `multica-ai/andrej-karpathy-skills` (MIT). ECC Copilot adapter adapted from `affaan-m/ECC` (MIT).
