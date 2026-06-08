---
name: po-to-prd
description: Use when the user wants to capture the current conversation as a PRD and publish it to the project issue tracker. Triggers: "create a PRD", "write a spec", "requirements doc", "capture this as a structured doc", "I want the next agent to pick this up", "make this durable".
license: MIT
metadata:
  author: Adapted from JZKK720/poskills
  source: https://github.com/JZKK720/poskills
  version: "1.0.0"
---

# To PRD

This skill takes the current conversation context and codebase understanding and produces a PRD. Do **NOT** interview the user — just synthesize what you already know.

Use the project's domain glossary vocabulary throughout the PRD, and respect any ADRs in the area you're touching.

## Process

1. Explore the repo to understand the current state of the codebase, if you haven't already.

2. Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible. If new seams are needed, propose them at the highest point you can.

3. Write the PRD using the template below.

4. Publish the PRD where the user wants it (GitHub issue, local `.scratch/<feature>/PRD.md`, or the conversation if they're just saving a copy).

## PRD template

```markdown
# <Feature name>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each in the format:

> As a <actor>, I want a <feature>, so that <benefit>

Example:
> 1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending

This list should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

**Exception:** if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it within the relevant decision and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)
- Which seam (unit / integration / e2e) each test sits at

## Out of Scope

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.
```

## Where to publish

The user should have indicated the destination. Common choices:

- **GitHub Issue** — publish via `gh issue create --title "..." --body-file PRD.md --label ready-for-agent`.
- **GitLab Issue** — `glab issue create --title "..." --description "$(cat PRD.md)" --label ready-for-agent`.
- **Local markdown** — write to `.scratch/<feature-slug>/PRD.md` in this repo.
- **Conversation only** — emit the PRD in chat, no file written.

## Source / license

Adapted from [mattpocock/skills · to-prd](https://github.com/JZKK720/poskills), MIT.
