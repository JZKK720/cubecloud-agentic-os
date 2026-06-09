---
name: continuous-learning-v2
description: How to capture lessons from a run into the wiki so the next run starts smarter. Greppable log entries, atomic pages, and the "what did I learn?" debrief.
source: ecc
metadata:
  source_repo: ECC continuous-learning-v2
  tags: [learning, wiki, log, debrief, anti-patterns]
  related_skills: [openclaw-persona-forge, eval-harness, agentic-engineering]
---

# Continuous Learning (v2)

The wiki is the agent's **long-term memory**. Every run should leave it slightly smarter. v2 of this skill (vs the upstream ECC v1) is the concrete mechanics: what to log, what to write, what to skip.

## When to use

Use this skill when:

- You just finished a non-trivial run that involved a new pattern, a new file, or a new tool.
- You hit an error you don't fully understand and worked around it.
- The user gave a correction ("no, do it like X") that should persist.

## The debrief template

At the end of any run that touched more than ~5 files or took more than ~10 turns, write a **debrief entry** to `<profile>/wiki/log.md`:

```md
## [2026-06-03] synthesis | <title>

- **What changed**: <one sentence>
- **Why**: <one sentence>
- **What I learned**: <one sentence>
- **Anti-pattern to avoid**: <one sentence>
- **New pages**: <list of wiki page relPaths created>
- **New tools**: <list of new IPC channels or skills>
```

Greppable. Future runs can `grep "^## \[2026-06" log.md` to see the day's work.

## What goes in a page (vs the log)

- **Log**: ephemeral, dated, atomic. One line per insight.
- **Page**: durable, undated, structured. One page per concept.

If the lesson is "every time I write a convert-file handler, I forget to update preload/index.d.ts", that's a **page** topic (`eval-harness.md` or `agent-harness-construction.md`), not a log entry. The log entry is `## [date] synthesis | added eval-harness conventions to skills/`.

## What to skip

- **Obvious facts** the agent will rediscover. The wiki is not a code-comment dump.
- **User-specific trivia** that won't generalize across users.
- **One-off workarounds** that the underlying bug is about to fix.
- **Half-formed hypotheses**. If you can't write a one-sentence claim, you're not done observing.

## The "what did I learn?" check

After every run, ask: "what does the next agent need to know that I know now?" If the answer is "nothing", the run was mechanical. If the answer is "I learned X", write it.

The bar is low. The bar is *not* "I learned X and I'm sure it's correct". The bar is "I learned X and I'll let the next agent verify or correct it". The wiki is a draft, not a publication.

## Page structure

```md
---
title: Page title
category: one of (sources, topics, entities, synthesis)
tags: [tag1, tag2]
sources: [wiki/raw/sources/file.md, ...]
created: 2026-06-03
updated: 2026-06-03
---

# <Title>

## TL;DR
[2-3 sentences. The page in a paragraph.]

## The pattern
[Bullet list or short prose. The actual content.]

## Worked example
[Optional. A real example from a past run.]

## Anti-patterns
[Optional. What to avoid.]
```

Frontmatter is greppable and lets the agent cite a page without reading it. The `sources` field lets a reader trace a synthesis back to its raw inputs.

## Cross-references

Use `[[wikilink]]` syntax. The agent rewrites these to the resolved path on every synthesis pass. A page with no `[[wikilink]]` is a dead end.

## Failure modes

- **Empty wiki**. The agent never wrote anything. The next run has nothing to build on.
- **Dated cruft**. Pages from 2025-04 that say "TODO: figure out X" but X has since been decided upstream. Run a quarterly `wiki lint` to flag stale pages.
- **Source-of-truth drift**. The wiki says Y, but the code does Z. The wiki is the slower surface; trust the code, then update the wiki.
- **Log spam**. One hundred `## [2026-06-03] ingest | notes.md` entries. Batch by hour or by task.

## Reference

- `src/main/wiki.ts` — `appendWikiLog`, `writeWikiRawSource`, `bootstrapWiki`.
- `src/shared/i18n/locales/*/memory.ts` — the Memory surface strings.
- `docs/add-memory-wiki-i18n.cjs` — pattern for batch-adding i18n keys.
