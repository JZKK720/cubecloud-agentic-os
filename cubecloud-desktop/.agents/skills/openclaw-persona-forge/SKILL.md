---
name: openclaw-persona-forge
description: How to assemble a complete profile from soul + memory + tools + skills + design dials. The pieces, the order, the gotchas.
source: ecc
metadata:
  source_repo: ECC openclaw-persona-forge
  tags: [profile, soul, memory, design-dials, soul-template]
  related_skills: [agentic-engineering, hermes-imports, continuous-learning-v2]
---

# OpenClaw Persona Forge

A **profile** is the unit of personality in the desktop. It bundles:

- `<profile>/SOUL.md` — the persona's voice, expertise, and taboos.
- `<profile>/MEMORY.md` — short-term operating memory (operator notes, current task).
- `<profile>/USER.md` — the user's stable preferences.
- `<profile>/wiki/` — long-term knowledge (Karpathy 3-layer: raw / wiki / schema).
- `<profile>/design-dials.json` — three numbers (variance, motion, density) that nudge tone.
- `<profile>/.env` + `config.yaml` — runtime config (model, provider, toolsets).
- Installed skills (under `<profile>/skills/`) — what the persona can do.

This skill describes how to assemble a coherent persona from these pieces.

## When to use

Use this skill when:

- The user is creating a new profile and asks "what should I put in SOUL.md?".
- The agent is being asked to "be more like X" or "less like Y" — that is a dial change, not a soul rewrite.
- A profile seems off — voice is wrong, dials are wrong, memory is stale.

## The forge order

Build a profile in this order. **Never** start with the dial or the skill set; both are downstream of the persona.

### 1. SOUL.md (the persona)

Three sections, in this order:

```md
# Persona

## Who I am
[2-3 sentences. The role, the audience, the kind of work this persona does.]

## How I work
- [3-5 bullets. The way the persona approaches a task: structure, tone, default tools.]
- [Bullet per anti-pattern: what this persona does NOT do.]

## Voice
- [2-3 bullets. Vocabulary level, use of metaphor, sentence length.]
```

A good SOUL.md is **40-80 lines**. If it's longer, the persona is doing too much. If it's shorter, the dials won't have anything to amplify.

### 2. MEMORY.md (current task)

The operator's note-to-self about what the persona is working on right now. Format:

```md
# Active Memory

## Current task
[One sentence: what we're trying to accomplish.]

## Decisions in flight
- [Decided YYYY-MM-DD] <decision> — <reason>

## Open questions
- [Asked YYYY-MM-DD] <question> — <status>
```

The runtime is responsible for **appending** to this file, not rewriting it. Treat it as append-only.

### 3. USER.md (the user)

Stable preferences about the human, not the task:

```md
# User

- [preference] — e.g. "User prefers technical prose over bullet lists for design discussions."
- [preference] — e.g. "User runs on Windows 11 with PowerShell 5.1."
- [fact] — e.g. "User maintains 3 production profiles."
```

The runtime is responsible for **reading and citing** these preferences, not for editing them. The user edits this file directly.

### 4. wiki/ (the knowledge base)

This is where the persona's domain knowledge lives, organized as **raw / wiki / schema**:

- `wiki/raw/sources/` — immutable sources the user curates.
- `wiki/sources/` — one summary per source.
- `wiki/topics/`, `wiki/entities/`, `wiki/synthesis/` — the LLM-generated pages.
- `wiki/index.md` — the catalog of pages.
- `wiki/log.md` — the operation log.
- `wiki/schema.md` — the conventions.

The agent should be able to answer "what does this persona know about X?" by reading `wiki/index.md` and following links. **No big summary files.** Each page is a leaf.

### 5. design-dials.json (the knobs)

Three numbers in [0, 100]:

- `variance` — phrasing flavor. 0 = dry, 100 = metaphorical.
- `motion` — structural granularity. 0 = essay, 100 = checklist.
- `density` — information per paragraph. 0 = airy, 100 = packed.

Defaults are `{ variance: 35, motion: 50, density: 55 }`. The persona's SOUL.md should describe the *intent* of the dials (e.g. "concise, structured" → motion 60, density 70), and the user can override them later without rewriting the soul.

### 6. toolsets + skills

Enable the toolsets (`getToolsets` IPC) and install the skills (`installSkill` IPC) the persona needs. **Don't enable everything** — a persona with 14 toolsets looks busy and spends half its context on tool introspection. Aim for 4-7 toolsets and 3-5 skills per profile.

### 7. Verify

After each new profile, run a smoke test:

1. Send a message. Does the response match the persona's voice?
2. Drag the design dials to extremes. Does the response style change in the right direction?
3. Read `wiki/index.md`. Is the catalog accurate?
4. Read `MEMORY.md`. Are the open questions still open?

If any of these is off, the forge order above gives you a place to debug: soul first, then memory, then dials, then skills. **Never** debug by adjusting the dials first — they amplify the soul, they don't replace it.

## Common mistakes

- **Big SOUL.md** (200+ lines). The agent can't keep it all in context; it cherry-picks and acts inconsistently. Cut.
- **No wiki**. The persona then keeps "knowing" things in chat that vanish between sessions.
- **Dials at 100/100/100**. The response is unreadable. Dials at extremes need a specific use case (e.g. "generate a list of failure modes" → motion 100, density 30).
- **Skills that don't match the soul**. A "concise" persona with a `verbose-coach` skill will produce inconsistent output. Match skills to the soul, not to the user's wishlist.
