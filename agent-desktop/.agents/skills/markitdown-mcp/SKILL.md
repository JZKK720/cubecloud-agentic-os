---
name: markitdown-mcp
description: How to wire the markitdown CLI (and the desktop's pure-JS fallbacks) into the agent's tool registry. When to use the CLI, when to use the fallbacks, when to call the IPC.
source: ecc
metadata:
  source_repo: ECC markitdown-mcp
  tags: [markitdown, file-to-markdown, converters, tool-registry]
  related_skills: [agent-harness-construction, file_to_markdown, continuous-learning-v2]
---

# markitdown MCP Connector

The `file_to_markdown` tool (Step 4 of the harvest rollout) turns a binary file (PDF, DOCX, PPTX, image, HTML, ...) into clean markdown for the agent to ingest. This skill is the **connector layer** that the agent invokes when it wants to read a dropped file.

## When to use

Use this skill when:

- The user has dragged a file into the chat and the agent needs its content as text.
- The user has asked "what's in this PDF / DOCX / image?".
- The agent is about to read a binary file with `readFileSync` and would get garbage.

## The three call paths

The agent has three ways to read a dropped file, in priority order:

### 1. The `convert-file-to-markdown` IPC channel (preferred)

This is the public, sandboxed path. The renderer (or another agent surface) calls:

```ts
window.hermesAPI.convertFileToMarkdown(filePath)
```

The result is a `{ success, result: { markdown, metadata, converter } }` discriminated union. The agent should:

- Read `result.markdown` and treat it as text.
- Cite `result.converter` in the response so the user knows which path was used (e.g. "via markitdown CLI" vs "via builtin-csv").

### 2. The `wiki-ingest-file-as-markdown` IPC channel (preferred for persistence)

If the agent wants the markdown to **persist** in the wiki (so future runs can read it), use the ingest channel instead:

```ts
window.hermesAPI.wikiIngestFileAsMarkdown(filePath, title?)
```

This:

1. Runs the file through the converter chain.
2. Writes the result to `<profile>/wiki/raw/sources/<title>.md`.
3. Appends a `kind=ingest` entry to `wiki/log.md`.

The result is the conversion outcome + the relative path the file landed at. The agent should cite the relPath in the response.

### 3. The fallback chain (when no IPC is available)

In tests or in agent-only contexts where the preload bridge isn't loaded, the underlying `convertFileToMarkdown` function in `src/main/converters.ts` is the same chain:

- `MarkitdownCliConverter` — shells out to `markitdown` when on PATH.
- `Builtin{Html,Json,Csv,Text}Converter` — pure-JS fallbacks.

The fallback chain is **permissive**: a converter that can't handle a file raises `ConverterSkip` to hand off to the next one. A hard failure (e.g. file not found) is the only thing that propagates.

## When to use the CLI vs the fallbacks

| Format | Path |
|--------|------|
| `.pdf`, `.docx`, `.pptx`, `.xlsx` | markitdown CLI (or fail) |
| `.html`, `.htm` | Builtin HTML converter |
| `.json` | Builtin JSON converter |
| `.csv` | Builtin CSV converter |
| `.txt`, `.md`, `.log`, `.rst`, `.adoc` | Builtin text converter |
| Anything else | markitdown CLI tries first; on "unsupported" stderr, the chain ends with a permanent error |

The markitdown CLI's exit-1-on-unsupported behaviour is treated as a chain skip, not a hard error. So a `convertFileToMarkdown` call against a `.gif` returns "no converter accepted" without crashing.

## What to do when the tool fails

The IPC channel returns `{ success: false, error, permanent?, converter? }` on failure. The agent's response should:

- Quote the error verbatim (don't paraphrase, the user needs the exact cause).
- Distinguish `permanent: true` (no converter can ever handle this) from `permanent: false` (transient, try again).
- If `permanent: true`, suggest a manual workaround (e.g. "open the file in your browser, copy the text, paste it in").

## Reference

- `src/main/converters.ts` — `convertFileToMarkdown`, `MarkitdownCliConverter`, `Builtin{Html,Json,Csv,Text}Converter`.
- `src/main/index.ts` — `convert-file-to-markdown`, `wiki-ingest-file-as-markdown`, `is-markitdown-available` IPC handlers.
- `src/main/wiki.ts` — `writeWikiRawSource` (the persistence target).
- `tests/converters.test.ts` — 11 tests for the chain.
- `src/shared/agent-clis.ts` — `markitdown` catalog entry (used by Setup).
