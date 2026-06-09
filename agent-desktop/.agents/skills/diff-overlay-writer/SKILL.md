---
name: diff-overlay-writer
description: How to emit the Understand-Anything diff overlay so the UA skills (understand, understand-diff, understand-explain) can read your project's diff without re-extraction.
source: ecc
metadata:
  source_repo: ECC diff-overlay-writer
  tags: [understand-anything, diff-overlay, schema, knowledge-graph]
  related_skills: [eval-harness, agentic-engineering, continuous-learning-v2]
---

# Diff Overlay Writer

The **diff overlay** is a tiny JSON file the Understand-Anything agent skills consume to know which files in a project changed recently and which downstream nodes are affected. It is **not** the diff itself — it is a *list of node ids* that the UA graph has flagged as changed or affected.

## When to use

Use this skill when:

- You have a UA graph (from `codegraph-export-ua-graph`) and you want to layer a diff on top.
- An external UA skill (e.g. `understand-diff`) is asking for "what changed since last sync?".
- You are wiring a pre-commit hook or a CI step that runs the agent's UA graph and emits the overlay.

## File location and shape

The overlay lives at `<projectPath>/.understand-anything/diff-overlay.json`. The shape is intentionally minimal:

```json
{
  "changedNodeIds": ["file:src/main/foo.ts", "file:src/main/bar.ts"],
  "affectedNodeIds": ["file:src/main/baz.ts"]
}
```

- `changedNodeIds` — node ids that the diff introduced or modified. Every entry must be a node id from the project's UA graph.
- `affectedNodeIds` — node ids that are 1-hop downstream of a change (callers, importers, dependants). Optional but recommended.

That's it. The UA skill knows how to render the diff overlay onto the graph.

## How to generate it

The desktop's `codegraph.ts` module already has the synthesis path. A typical flow:

1. Run `git diff --name-only HEAD~1` (or whatever the diff base is).
2. For each changed file, look it up in the UA graph to get the node id (e.g. `file:<path>`).
3. For each changed file, run a 1-hop reachability in the UA graph and collect the affected node ids.
4. Write the JSON to `<projectPath>/.understand-anything/diff-overlay.json`.

Step 3 is the heavy one. The current `codegraph.ts` `exportUnderstandAnythingGraph` does **not** yet emit the reachability — it just adds the two layers when an overlay is present. The reachability step is the next iteration; for now, a reasonable stub is "include all nodes whose `filePath` matches a changed file's `import` statements".

## Don't overthink the schema

The UA skills are designed to **tolerate** sparse overlays. A diff overlay with just `changedNodeIds` (no `affectedNodeIds`) is still useful — the agent will just see "these files changed" without the call-graph context. Add `affectedNodeIds` when you can; skip them when you can't.

Likewise, an empty overlay (`{}` or `{"changedNodeIds": [], "affectedNodeIds": []}`) is valid — it just means "no diff". Don't fail the build when the file is missing.

## Reference

- `src/main/codegraph.ts` — `exportUnderstandAnythingGraph` reads the overlay (if present) and adds two layers to the graph: `diff-changed` (the `changedNodeIds`) and `diff-affected` (the `affectedNodeIds`).
- `tests/codegraph-ua-export.test.ts` — three tests for the overlay: present, missing, malformed.
- `src/shared/i18n/locales/*/wiki.ts` — the wiki surface strings. The overlay shows up under "Recent diff" headings.
