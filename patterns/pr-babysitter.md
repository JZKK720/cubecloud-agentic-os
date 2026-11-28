# PR Babysitter (L1, report only)

Watch open PRs, report CI/review/mergeability, never act.

## Per-PR report

```markdown
### PR #N — title
- Branch: head -> base
- Checks: passing | failing | pending | absent/unknown — <names + conclusions>
- Required-check policy: unknown (this repo has no branch protection) — never assume "required"
- Reviews: <n> approved | changes requested | none (no required review on this repo)
- Mergeability: clean | conflicts | unknown
- Unresolved review threads: <n> (list actionable)
- Ready to merge: no — <reason>
- Suggested action: none | minimal-fix | escalate-human
```

## Hard rules

- Never merge, push, or edit.
- Zero checks => `absent/unknown`, never `passing`.
- CI gates on `main` today: `desktop-shell-checks`, `desktop-shell-dev-boot`,
  `desktop-shell-windows-packaging`, `Container smoke (build + boot + serve)`,
  plus the doc/i18n gates that run as separate jobs
  (`Verify i18n locale coverage`, `Verify mojibake in source files`,
  `Verify EN/ZH doc pair`, `Verify skill counts in prose`).
  Note: `.github/workflows/ci.yml` runs `node scripts/check-i18n-coverage.cjs`
  (default mode). The `--strict` form lands with the pending i18n-gate PR and
  is only binding once that PR merges — do not claim it gates merges today.
- Paths under `.github/**`, `agent-desktop/src/main/**`, `agent-desktop/src/preload/**`,
  `agent-desktop/src/shared/**` (path-containment / tokenizer), `scripts/check-*.cjs`
  always mean `escalate-human`.
- More than 10 changed files => `escalate-human`.

## Relationship to the repo's own review flow

`.github/copilot-instructions.md` still tells contributors to run
`security-review.prompt.md` for changes touching auth/IPC/file I/O, and a human
merges. This loop never replaces that; it only summarizes state for the human.
