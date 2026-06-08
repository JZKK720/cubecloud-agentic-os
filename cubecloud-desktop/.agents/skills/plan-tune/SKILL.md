---
name: plan-tune
description: Decision-brief format for AskUserQuestion. Standardize every question the cubecloud agent asks to be specific (D-numbered, ELI10, with a recommendation, pros/cons, and a net trade-off). The format is the format; the content is whatever the host skill is asking about. Mirror of gstack's /plan-tune question format, adapted for cubecloud.
source: gstack
metadata:
  source_repo: JZKK720/gstack
  original_path: plan-tune/SKILL.md
  tags: [questions, decision-brief, format, ux]
  related_skills: [office-hours, plan-ceo-review, plan-eng-review, design-taste-frontend]
---

# /plan-tune — Decision-Brief Question Format

Standardize the shape of every question the cubecloud agent asks. A good decision brief is **a tool_use, not prose** — short, structured, opinionated, and unambiguous. This file documents the format. The content of the question depends on the host skill (office-hours, plan-ceo-review, design-taste-frontend, etc.).

---

## When to invoke this

This isn't a runtime skill — it's a format reference. Every cubecloud skill that asks the user a decision should use this format. Read this when:
- You're writing a new skill and need to know what a good `AskUserQuestion` looks like
- You're reviewing a PR that adds a question; verify the format
- You're tuning the auto-decide policy (V2)

---

## The Format

Every `AskUserQuestion` is a **decision brief** and must be sent as a tool call, not prose.

### Required structure

```
D<N> — <one-line question title>

Project/branch/task: <1 short grounding sentence>

ELI10: <plain English a 16-year-old could follow, 2-4 sentences, name the stakes>

Stakes if we pick wrong: <one sentence on what breaks, what user sees, what's lost>

Recommendation: <choice> because <one-line reason>

Completeness: A=X/10, B=Y/10
  (or: Note: options differ in kind, not coverage — no completeness score)

Pros / cons:
  A) <option label> (recommended)
    ✅ <pro — concrete, observable, ≥40 chars>
    ❌ <con — honest, ≥40 chars>
  B) <option label>
    ✅ <pro>
    ❌ <con>

Net: <one-line synthesis of what you're actually trading off>
```

### Field rules

- **D-numbering:** First question in a skill invocation is `D1`; increment yourself.
- **ELI10:** Always present, in plain English, not function names.
- **Stakes line:** Concrete — name the file, the user, the cost.
- **Recommendation:** ALWAYS present, with a concrete reason. The `(recommended)` label suffix stays on the default option.
- **Completeness scored (coverage)** OR **kind-note present** (kind). Use `Completeness: N/10` only when options differ in coverage. 10 = complete, 7 = happy path, 3 = shortcut. If options differ in kind, write: `Note: options differ in kind, not coverage — no completeness score.`
- **Pros / cons:** Use ✅ and ❌. Minimum 2 pros and 1 con per option when the choice is real; minimum 40 characters per bullet. Hard-stop escape for one-way/destructive confirmations: `✅ No cons — this is a hard-stop choice.`
- **Net line:** Closes the tradeoff.

### Recommendation posture

- **Recommended label on one option.** Always. Even for neutral posture: `Recommendation: <default> — this is a taste call, no strong preference either way; (recommended) STAYS on the default option for AUTO_DECIDE.`
- **Effort both-scales:** When an option involves effort, label both human-team and CC+ai time, e.g. `(human: ~2 days / ai: ~15 min)`. Makes AI compression visible at decision time.
- **User has context you don't:** Domain knowledge, timing, relationships, taste. Cross-model agreement is a recommendation, not a decision. The user decides.

### Non-ASCII characters

**Write directly, never `\u`-escape.** When any string field (question, option label, option description) contains Chinese (繁體/簡體), Japanese, Korean, or other non-ASCII text, emit the literal UTF-8 characters in the JSON string. The pipe is UTF-8 native.

**Wrong:** `"question": "請選擇\uXXXX\uXXXX\uXXXX\uXXXX"`
**Right:** `"question": "請選擇管理工具"`

Only JSON-mandatory escapes remain allowed: `\n`, `\t`, `\"`, `\\`.

This is a common failure mode. Long CJK strings are exactly when reflexive escaping kicks in and exactly when miscoding is most damaging. Long ≠ escape. Keep characters literal.

---

## Handling 5+ options — split, never drop

`AskUserQuestion` caps every call at **4 options**. With 5+ real options, NEVER drop, merge, or silently defer one to fit. Pick a compliant shape:

- **Batch into ≤4-groups** — for coherent alternatives (e.g. version bumps, layout variants). One call, 5th surfaced only if first 4 don't fit.
- **Split per-option** — for independent scope items (e.g. "ship E1..E6?"). Fire N sequential calls, one per option. Default to this when unsure.

### Per-option call shape

For split chains, the header is `D<N>.k` (e.g. `D3.1..D3.5`), ELI10 per option, Recommendation, kind-note (no completeness score — Include/Defer/Cut/Hold are decision actions), and 4 buckets:
- **A) Include**
- **B) Defer**
- **C) Cut**
- **D) Hold** (stop chain, discuss)

After the chain, fire `D<N>.final` to validate the assembled set (reprompt dependency conflicts) and confirm shipping it. Use `D<N>.revise-<k>` to revise one option without re-running the chain.

For N>6, fire a `D<N>.0` meta-AskUserQuestion first (proceed / narrow / batch).

`question_id` for split chains: `<skill>-split-<option-slug>` (kebab-case ASCII, ≤64 chars, `-2`/`-3` suffix on collision). The runtime checker refuses `never-ask` on any `*-split-*` id, so split chains are never AUTO_DECIDE-eligible — the user's option set is sacred.

---

## Self-check before emitting

Before calling `AskUserQuestion`, verify:

- [ ] D<N> header present
- [ ] ELI10 paragraph present (stakes line too)
- [ ] Recommendation line present with concrete reason
- [ ] Completeness scored (coverage) OR kind-note present (kind)
- [ ] Every option has ≥2 ✅ and ≥1 ❌, each ≥40 chars (or hard-stop escape)
- [ ] `(recommended)` label on one option (even for neutral posture)
- [ ] Dual-scale effort labels on effort-bearing options (human / ai)
- [ ] Net line closes the decision
- [ ] You are calling the tool, not writing prose
- [ ] Non-ASCII characters (CJK / accents) written directly, NOT `\u`-escaped
- [ ] If you had 5+ options, you split (or batched into ≤4-groups) — did NOT drop any
- [ ] If you split, you checked dependencies between options before firing the chain
- [ ] If a per-option Hold fires, you stopped the chain immediately (didn't queue)

---

## Worked example

Good:

```
D3 — Which data structure for the kanban task graph?

Project/branch/task: Adding the new `next` pointer to KanbanTask in
src/main/kanban.ts, branch feature/kanban-graph.

ELI10: Today the kanban module stores tasks as a flat list. To render
the board, we walk the list every time and look up parents/children by id.
That's O(n) per render. We're going to add an in-memory index that pre-computes
the children-of-each-task relationship once at load. The question is what
data structure holds the index. Three sensible options.

Stakes if we pick wrong: Wrong choice means every board render pays a
constant-factor tax. For boards with 1000+ tasks (the 1% case that
matters for the canary), this can be 50ms vs 200ms — perceptible to the
user.

Recommendation: Map<TaskId, Set<TaskId>> — it's the only one that
gives O(1) parent lookup, which is what kanban-detail actually needs.
The other two win on a metric we don't measure.

Completeness: A=10/10, B=7/10, C=8/10

Pros / cons:
  A) Map<TaskId, Set<TaskId>> (recommended)
    ✅ O(1) child lookup by parent — kanban-detail's hot path
    ✅ Trivial to merge when a new task lands; just splice two sets
    ❌ Two allocations per task vs one — maybe 8% more memory at boot
  B) Array<TaskId> sorted by parent id
    ✅ One allocation per task, best for cold start
    ✅ Cache-friendly iteration when scanning all children of all parents
    ❌ O(log n) per parent lookup, or O(n) per insertion to keep sorted
  C) Map<TaskId, Array<TaskId>> (unsorted children)
    ✅ One map, simple to read in the debugger
    ✅ O(1) child lookup
    ❌ Insertion in the middle of a parent's list is O(n) — bad when
       tasks move columns rapidly

Net: Pick A unless cold-start memory is your bottleneck, which it
isn't here.
```

This passes the self-check, has concrete stakes, a real recommendation, and a closing net line. A user can read this in 20 seconds and answer.

---

## Anti-patterns to reject

Don't write a question like this:

```
D3 — Pick a data structure.
A) Map
B) Array
C) List
```

That's not a decision brief. It's a multiple-choice quiz. The user can't tell you what they actually want because you haven't told them what's at stake.

If you're about to ask a question and find yourself without a recommendation, **stop and form one first.** "I don't know" is fine as a Recommendation text — but you have to say so explicitly, and explain what would change your mind.

---

## Why this format exists

- **Decision briefs, not quizzes.** A decision brief gives the user the context to answer in 20 seconds. A quiz gives them anxiety and a coin-flip default.
- **One recommendation, always.** "Pick A or B" is not a question — it's an abdication. The user wants your opinion, not your hedging.
- **Pros and cons in prose, not adjectives.** "Robust" and "scalable" are not pros. "O(1) child lookup" is.
- **Net line, every time.** If you can't write a one-line synthesis of what the user is trading off, you don't understand the question well enough to ask it.

---

## Important Rules

- **Never use this format for "did you want to..." confirmations.** Those are simple yes/no, not decisions with tradeoffs. Plain-language, no D-numbering.
- **Never write the format as prose.** The format is a tool call shape. If you're writing the question in chat instead of calling AskUserQuestion, you're doing it wrong.
- **The format is the contract.** If a host skill produces a question that doesn't match this shape, file a bug against the host skill.
