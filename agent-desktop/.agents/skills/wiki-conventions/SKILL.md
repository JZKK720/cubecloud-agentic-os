---
name: wiki-conventions
description: How to use the Karpathy 3-layer wiki (raw / wiki / schema) from Step 2 of the harvest rollout. The directory layout, the file_to_markdown ingest path, the `[[wikilink]]` syntax.
source: ecc
metadata:
  source_repo: ECC wiki-conventions
  tags: [wiki, memory, raw, schema, karpathy]
  related_skills: [continuous-learning-v2, markitdown-mcp, eval-harness]
---

# Wiki Conventions

The desktop's wiki is a **Karpathy-pattern 3-layer memory** that lives under `<profile>/wiki/`. It is the agent's long-term knowledge base, distinct from the short-term `MEMORY.md`. This skill describes the directory layout, the file conventions, and the wikilink syntax the agent is expected to use.

## When to use

Use this skill when:

- The agent is about to write to the wiki.
- The agent is reading the wiki and the format is unclear.
- The user is asking "what does the persona know about X?" — the wiki is the answer.

## The directory layout

```
<profile>/wiki/
├── raw/
│   └── sources/         # immutable source docs the user curates
├── wiki/
│   ├── index.md         # content catalog
│   ├── log.md           # operation log
│   ├── schema.md        # conventions (this file's big brother)
│   ├── entities/        # people, products, projects
│   ├── topics/          # concepts, themes
│   ├── sources/         # one summary page per raw source
│   └── synthesis/       # higher-level synthesis tying multiple sources
```

- **raw/sources/** is **read-only to the agent**. The user curates it.
- **wiki/** is **owned by the agent**. It writes, the user reads.
- The agent can also write to `log.md` (append-only) and `schema.md` (with the user).

## Frontmatter

Every page under `wiki/` (except `index.md` and `log.md`) starts with YAML frontmatter:

```yaml
---
title: Page title
category: one of (entities, topics, sources, synthesis)
tags: [tag1, tag2]
sources:
  - wiki/raw/sources/foo.pdf
  - wiki/raw/sources/bar.md
created: 2026-06-03
updated: 2026-06-03
---
```

The `sources` field is the link back to the raw input. A synthesis page's `sources` is the list of raw sources that informed it.

## Wikilinks

Pages cross-reference each other with `[[wikilink]]` syntax:

```md
The [[Hermes Engine]] is the agent runtime. It reads
[[MEMORY.md]] at startup and consults the [[Wiki Schema]]
for conventions.
```

The agent rewrites these to the resolved path on every synthesis pass. A page with no `[[wikilink]]` is a dead end.

## The ingest path

When the user drops a file (PDF, DOCX, image) into the chat, the renderer can call:

```ts
window.hermesAPI.wikiIngestFileAsMarkdown(filePath, title?)
```

This:

1. Runs the file through `convertFileToMarkdown` (Step 4).
2. Writes the result to `<profile>/wiki/raw/sources/<title>.md`.
3. Appends a `kind=ingest` entry to `log.md`.

The agent should then read the new file, summarise it, and create a page in `wiki/sources/<title>.md` with the frontmatter above.

## The operation log

`<profile>/wiki/log.md` is **append-only**. Format:

```md
## [2026-06-03 14:32] ingest | Notes from meeting.md
Converted via builtin-text (1234 bytes) → wiki/raw/sources/Notes from meeting.md

## [2026-06-03 14:35] synthesis | Hermes Engine
New page: wiki/entities/hermes-engine.md
```

Greppable: `grep "^## \[" log.md | tail -20`. Future agents can read the log to see what the previous agent did, in date order.

## When to write a page vs when to log

- **Log**: ephemeral, dated, atomic. One entry per operation.
- **Page**: durable, undated, structured. One page per concept.

A 2026-06-03 entry that says "figured out the wiki conventions" is a **log entry**. The page that explains the conventions is `wiki/schema.md` (or, in this desktop, the bundled `wiki-conventions` skill).

## How to find what the persona knows

The user (or another agent) can ask "what does this profile know about X?". The right path is:

1. Read `wiki/index.md`. It lists every page by category with a one-line summary.
2. Follow the relevant `[[wikilink]]` to the page.
3. From the page, follow its `[[wikilink]]`s and check its `sources` to drill down.

Never read the whole `wiki/` tree. The index is the entry point.

## Reference

- `src/main/wiki.ts` — `bootstrapWiki`, `getWikiStatus`, `readWikiIndex`, `readWikiLog`, `appendWikiLog`, `listWikiSources`, `readWikiPage`, `writeWikiPage`, `writeWikiRawSource`.
- `src/shared/i18n/locales/*/memory.ts` — the Memory surface i18n keys.
- `docs/add-memory-wiki-i18n.cjs` — pattern for batch-adding i18n keys.
- `src/renderer/src/screens/Memory/Wiki.tsx` — the wiki surface in the renderer.
- `tests/wiki.test.ts` — 5 tests for the wiki module.
