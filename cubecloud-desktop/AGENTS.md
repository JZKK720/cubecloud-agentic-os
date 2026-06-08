# Agent Instructions

`cubecloud-desktop` is the active implementation target for this workspace. Upstream `hermes-desktop` is a legacy reference only: use it for comparison when needed, but do not add new runtime, build, or workflow dependencies on a local legacy clone.

## Default Skills

- Apply `karpathy-guidelines` by default for non-trivial work in this repo.
- Apply `design-taste-frontend` by default for renderer UI, CSS, onboarding, welcome, setup, and empty-state work.
- Add `electron-pro` when the change touches Electron main, preload, IPC, packaging, installers, or OS integration.
- Add `typescript-expert` when the change touches complex typing, compiler diagnostics, tsconfig, or shared type contracts.

## Working Rules

- Start from the owning file, symbol, test, or failing behavior before editing.
- Make the smallest falsifiable change first, then validate immediately.
- Keep onboarding and provider copy truthful to the app's current Hermes-backed capabilities.
- Reuse existing hooks, preload bridges, provider plumbing, and CSS patterns before adding abstractions.
- Do not spread inherited Hermes branding into new Cubecloud-facing surfaces.
- Do not revert unrelated user changes.

## Repo Boundaries

- Build and implement in `cubecloud-desktop` unless the user explicitly asks for another target.
- Treat upstream `hermes-desktop` as comparison material while the rebrand and provenance cleanup continues.
- If you adapt code or copy from the legacy repo, rewrite it to current Cubecloud naming, assets, and contracts before landing it.
- Do not reintroduce hard references to a local `hermes-desktop` path in docs, tests, workflows, or runtime code.
- For monorepo docs / i18n / screenshot-refresh work, the source of truth is usually the outer root and `docs/`, not the inner mirror. The inner tree mirrors many of those files via hardlinks; `README.md` is the explicit outer-vs-inner exception.
- Translation inventory lives in the outer `README.i18n.md`. If a task touches README translations, handbook translations, or preview refresh / PDF re-rendering, use the repo workflow skill at `.github/skills/docs-i18n-refresh/SKILL.md`.
- Headroom is already integrated on the desktop side. If a task mentions Headroom, token savings, context compression, large logs or tool output, CodeGraph bundle compression, `headroom learn`, or Copilot-wide Headroom setup, use the repo workflow skill at `.github/skills/headroom-workflow/SKILL.md` and start from the existing Headroom main-process, MCP, and renderer surfaces rather than proposing a fresh integration.

## Validation

- Prefer the narrowest relevant check first.
- Use `npm.cmd run typecheck` for repo-wide TypeScript validation when a change affects shared contracts or UI structure.
- Use `npm.cmd exec vitest run tests/<slice>.test.ts` for focused test coverage when a nearby test exists.
- Use broader build or packaging checks only when the change touches build config, packaging, or installer behavior.

## Skill References

- `karpathy-guidelines`: `.agents/skills/karpathy-guidelines/SKILL.md`
- `design-taste-frontend`: `.agents/skills/design-taste-frontend/SKILL.md`
- `electron-pro`: `.agents/skills/electron-pro/SKILL.md`
- `typescript-expert`: `.agents/skills/typescript-expert/SKILL.md`