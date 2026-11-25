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
- CI gates: `desktop-shell-checks`, `desktop-shell-dev-boot`,
  `desktop-shell-windows-packaging`, `Container smoke`, plus
  `check-i18n-coverage --strict`.
- Paths under `.github/**`, `src/main/**`, `src/preload/**`, `scripts/check-*.cjs`
  always mean `escalate-human`.
- More than 10 changed files => `escalate-human`.
