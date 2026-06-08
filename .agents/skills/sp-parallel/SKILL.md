---
name: sp-parallel
description: Use when you need to fan out one-off work in parallel — research, multi-file exploration, search-across-many, or independent investigations. Distinct from `cubecloud-subagents` (which executes a plan); this is for ad-hoc parallel queries.
license: MIT
metadata:
  author: Adapted from JZKK720/superpowers (obra/superpowers, MIT)
  source: https://github.com/JZKK720/superpowers
  source_skill: dispatching-parallel-agents
  version: "1.0.0"
---

# Dispatching Parallel Agents

When you have N independent questions to answer, dispatching them in parallel is N× faster than asking them sequentially. The art is in choosing the right level of granularity.

## When to use

- **Research** — "what does each of these 10 repos do?"
- **Multi-file exploration** — "find every reference to `PLATFORM_APPS` in the codebase."
- **Search-across-many** — "is there a `validate` helper in any of these 5 modules?"
- **Independent investigations** — "is the bug in the IPC layer, the renderer, or the state store?"

## When *not* to use

- **Plan execution** — use `cubecloud-subagents` or `cubecloud-execute` for that. The plan is a contract; subagents follow it.
- **Dependent questions** — if Q2 depends on Q1's answer, serialise them. Parallel agents can't share state.
- **One-question tasks** — the overhead of parallel dispatch isn't worth it.

## The pattern

```
Decompose the work into N independent queries.
  ↓
Dispatch N subagents in parallel (one per query).
  ↓
Each subagent returns a focused answer.
  ↓
Aggregate the answers.
  ↓
Cross-check: do the answers agree? Where do they disagree?
  ↓
Synthesise.
```

## Decomposition

The hardest part. Bad decomposition: "research topic X." Good decomposition: 5 specific questions, each answerable in 1–3 minutes.

For a research task on "5 third-party repos", the decomposition is:

1. What is the repo's purpose?
2. What is the license?
3. What are the top 3 skills / features?
4. Are there obvious conflicts with our existing skill ecosystem (naming, scope)?
5. What's the install / integration story?

Five subagents. Each returns a one-paragraph answer. You aggregate.

## Subagent prompt template

```
You are answering one specific question as part of a larger research task.

**Question:** <the one question>

**Sources to consult:**
- <list of files, URLs, or search scopes>

**Your job:**
1. Read the sources.
2. Answer the question in 1–3 paragraphs.
3. Cite the exact file / line / URL for each claim.
4. If you can't answer, say "I don't know" — don't guess.

**Do not:**
- Answer adjacent questions.
- Add "while I was there I noticed…" notes.
- Read the entire repo.
```

## Aggregation

After all subagents return, *you* (the dispatcher) do the synthesis. The subagents return raw findings; you:

- **De-duplicate** — if two subagents found the same thing, pick the better citation.
- **Cross-check** — do the answers agree? If not, dispatch a follow-up subagent to disambiguate.
- **Synthesise** — one paragraph per question, then a one-paragraph overall summary.

The synthesis is the value. The subagents return data; the dispatcher returns insight.

## Anti-patterns

- **Too granular** — 50 subagents, each answering one trivial question. The aggregation cost exceeds the parallel speedup.
- **Too coarse** — one subagent answering "research the whole topic." No parallelism.
- **Dependent questions** — Q2's answer requires Q1's output. Serialise.
- **Subagent doing the synthesis** — the subagent doesn't know the other subagents' answers. Synthesis is the dispatcher's job.
- **Skipping the cross-check** — the disagreement between subagents is often the most interesting finding.

## Related skills

- `cubecloud-subagents` — for plan execution (longer-running, contract-driven).
- `cubecloud-execute` — for sequential plan execution.

## Source / license

Adapted from [JZKK720/superpowers · dispatching-parallel-agents](https://github.com/JZKK720/superpowers/blob/main/skills/dispatching-parallel-agents/SKILL.md), MIT.
