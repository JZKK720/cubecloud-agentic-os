---
name: sp-receive-review
description: Use when responding to code-review feedback — separates signal from noise, acknowledges what's right, defends with reasoning when appropriate, fixes what's wrong, and never accepts drive-by refactors in the same PR.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: receiving-code-review
  version: "1.0.0"
---

# Receiving Code Review

The reviewer's job is to find issues. Your job is to triage them, fix the real ones, defend the defensible ones, and not let drive-by refactors leak in.

## The triage flow

```
Receive review feedback
  ↓
For each finding:
  ↓
  Read the finding carefully. Re-read the code. Re-read the spec.
  ↓
  Classify:
    - Right: I missed it. Fix it.
    - Wrong: the reviewer is mistaken. Defend with reasoning.
    - Out of scope: technically correct, but unrelated. Move to a follow-up.
    - Negotiable: depends on team / project norms. Discuss.
  ↓
  Apply the fix (or defend, or move to follow-up).
  ↓
  Reply to the reviewer (acknowledgement + reasoning).
  ↓
Re-request review.
```

## When the reviewer is right

- **Acknowledge plainly**: "Good catch. Fixing in the next commit."
- **Don't over-explain or apologise.** The fix is the apology.
- **Don't add "while I was there" changes.** Fix only the finding.

## When the reviewer is wrong

- **Defend with reasoning, not assertion.** "I considered that approach. The downside is X; that's why I went with Y."
- **Cite the spec, the test, the plan task, or the standard.** "The coding-standards doc says N. The test verifies M. The plan task is L."
- **If the reviewer still disagrees**, that's a discussion, not a fight. The two of you may need a third opinion.

## When the reviewer is out of scope

- **Acknowledge the finding**: "Yes, X is a real issue."
- **Decline to fix in this PR**: "I'll open a follow-up. This PR is scoped to Y; X is unrelated."
- **Open the follow-up** (issue, ticket, or a stub PR).

Don't accept drive-by refactors in code-review responses. They bloat the diff, delay the merge, and confuse the next reviewer.

## When the review is unclear

- **Ask a specific question.** "I'm not sure what you mean by 'consider an alternative here'. Can you point at the file and line you're looking at?"
- **Don't guess and implement.** A wrong implementation is worse than no implementation.

## Tone

- **Thank the reviewer.** They spent time on your code.
- **Be specific in your reply.** Quote the finding. Say what you did.
- **Don't be defensive.** The reviewer is on your side; they want the code to be good.
- **Don't be sycophantic.** "Great point, will fix" without the fix is noise.

## Anti-patterns

- **Fixing without acknowledging** — push a commit without a reply. The reviewer doesn't know whether you saw their feedback.
- **Defending without reasoning** — "I disagree" without the "because". The reviewer will assume you didn't think it through.
- **Accepting drive-by refactors** — "Sure, I'll rename the variable while I'm in there" — no. Open a follow-up.
- **Re-requesting review without re-running the tests** — per `cubecloud-verify`. The fix must be verified.
- **Responding to many findings in one giant commit** — split by finding. Easier to review, easier to revert.

## Related skills

- `cubecloud-request-review` — the author side of asking for review.
- `cubecloud-verify` — re-run verification after the fix.
- `gstack-qa` — the pre-ship gate that should run *after* the review cycle is done.

## Source / license

Adapted from [JZKK720/superpowers · receiving-code-review](https://github.com/JZKK720/superpowers/blob/main/skills/receiving-code-review/SKILL.md), MIT.
