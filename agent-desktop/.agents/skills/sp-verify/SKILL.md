---
name: sp-verify
description: Use when declaring a fix complete, a feature shipped, or a task done — enforces evidence over claims: did you actually run it, actually see the green test, actually see the user-facing behaviour? Replaces "it should work" with "I verified it works".
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: verification-before-completion
  version: "1.0.0"
---

# Verification Before Completion

"Done" is a strong word. Use it only when you have evidence.

## The rule

> **No claim of completion without evidence of the user-facing behaviour.**

What counts as evidence:

- **A passing test you ran** (not a test you wrote — the same test, in the same environment, in the same session).
- **A command you ran** whose output you saw. Not a command you intended to run; the actual output.
- **A user-facing action you took** (clicked, typed, navigated) and the expected response.
- **A log line, a metric, a screenshot** that shows the behaviour.

What does *not* count:

- **"It should work now"** — prediction, not evidence.
- **"I wrote a test for it"** — code is not evidence. Run the test.
- **"The linter passed"** — lints catch syntax, not behaviour.
- **"The build succeeded"** — build catches compilation, not behaviour.
- **"I made the change the user asked for"** — the user asked for an *outcome*, not a change.

## The 5 verification questions

Before declaring done, answer each:

1. **Did I run the code I changed, in the same environment the user is using?**
2. **Did I see the user-facing behaviour the user asked for?**
3. **Did I see the failure case I was supposed to fix, before I fixed it, and the success case after?**
4. **Does my test cover the regression (the next time this exact bug is reintroduced)?**
5. **If a stranger ran my test, would they see the same green?**

If any answer is "no" or "I'm not sure", the task is not done. Go back.

## Anti-patterns

- **"Done by inspection"** — the code looks right. Run it.
- **"Done by analogy"** — the fix worked in a similar case. Run it in *this* case.
- **"Done by proxy"** — the test passes; the user-facing behaviour must therefore work. Verify the user-facing behaviour directly.
- **"Done by intent"** — I meant to do X. Showing evidence of Y is not the same.
- **"Done by deadline"** — the time is up; ship it. The deadline is for *finishing*; the verification is for *being done*.

## When the evidence is hard to get

Sometimes the user-facing behaviour is hard to observe directly. In that case:

- **Document why** — note in the PR or commit message what evidence you have and what you don't.
- **Prefer proxy evidence** that *closely approximates* the user-facing behaviour, and label it as such.
- **Add a monitoring / smoke test** that will catch the regression in production.

Do *not* skip the verification step. The cost of an unverified fix is higher than the cost of a late fix.

## Related skills

- `cubecloud-debug` — the 4-phase process that ends with a regression test (which you then verify).
- `gstack-qa` — the broader pre-ship gate. Use this skill for single fixes; use `gstack-qa` for releases.

## Source / license

Adapted from [JZKK720/superpowers · verification-before-completion](https://github.com/JZKK720/superpowers/blob/main/skills/verification-before-completion/SKILL.md), MIT.
