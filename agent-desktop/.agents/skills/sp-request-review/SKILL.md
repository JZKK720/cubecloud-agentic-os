---
name: sp-request-review
description: Use when about to hand work to a reviewer (human or agent) — runs a pre-review checklist to catch the obvious issues, reports findings by severity, and explicitly blocks on critical issues. Saves the reviewer's time and the author's embarrassment.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: requesting-code-review
  version: "1.0.0"
---

# Requesting Code Review

A good code-review request is half the review. The author does the pre-flight; the reviewer does the second pass. This skill is the pre-flight.

## The pre-review checklist

Before sending the review request, run this checklist. Each item is a yes / no.

### Self-review

- [ ] The diff is focused. No drive-by refactors, no unrelated changes.
- [ ] The diff compiles / type-checks.
- [ ] The tests pass (and you ran them, not just wrote them — per `cubecloud-verify`).
- [ ] The new code follows the project's coding standards.
- [ ] The commit messages are clear and reference the plan task / issue.
- [ ] The branch is up to date with the target branch (rebased if needed).
- [ ] The diff is small enough to review in one sitting (split if not).

### What the reviewer needs

- [ ] A summary of *what* changed and *why* (1 paragraph).
- [ ] The user-facing outcome of the change (or "no user-facing change").
- [ ] Anything you specifically want reviewed (or "general review").
- [ ] Anything you deliberately *didn't* do, in case the reviewer wonders (e.g. "I left the old API in for backward compat").
- [ ] The verification output (the test run, the smoke run, the screenshot).

## Findings by severity

When you *are* the reviewer, report issues by severity. This skill covers the author side; the reviewer side is `cubecloud-receive-review` (which the author will use when they respond to the review).

Severity levels (per the superpowers convention):

| Severity | Meaning | Action |
|---|---|---|
| **Critical** | Bug, security issue, data loss, or correctness failure. | **Blocks the merge.** Author must fix before re-review. |
| **Important** | Significant quality issue, design flaw, or maintainability concern. | Author should address before merge; reviewer and author can negotiate scope. |
| **Minor** | Style, naming, comment, or non-blocking quality nit. | Author can fix in this PR or a follow-up. |
| **Praise** | Something the author did well that the reviewer wants to call out. | No action; just recognition. |

The reviewer should be specific:

- **File** + **line** (or function name).
- **What** the issue is.
- **Why** it's a problem.
- **How** to fix (concrete suggestion, not "consider refactoring").

## What to do with drive-by feedback

Sometimes the reviewer says "while you're at it, can you also fix X?" The author's job is to:

- **Accept if X is in scope** of the current PR.
- **Push back if X is out of scope** — "happy to fix X in a follow-up PR; it's not related to this change."
- **Never accept drive-by refactors in a code-review response.** Open a new PR.

## Anti-patterns

- **"PTAL" with no context** — the reviewer has to read the diff, the commit messages, the related issues, and the test output to understand. Give them a summary.
- **Reviewing your own PR** — find someone else. The pre-review checklist catches 80%; the other 20% needs a fresh pair of eyes.
- **Defensive responses** — the reviewer found an issue. Don't argue; fix it or push back with reasoning.
- **"I thought it was obvious"** — if it was obvious, you wouldn't need a review. The reviewer's confusion is a signal.
- **Asking for review on a broken build** — the pre-flight checklist catches this. Run it.

## Related skills

- `cubecloud-receive-review` — the author side of the review response.
- `cubecloud-verify` — "is the change actually working?" is the first question any reviewer will ask.
- `gstack-qa` — the pre-ship gate that should run *before* the code-review request.

## Source / license

Adapted from [JZKK720/superpowers · requesting-code-review](https://github.com/JZKK720/superpowers/blob/main/skills/requesting-code-review/SKILL.md), MIT.
