---
name: freeze
description: Edit lock. Restricts file edits to a single directory so the agent can't "fix" unrelated code while debugging. Use when working on a specific area and you want to prevent the AI from wandering into the rest of the codebase. Mirror of gstack's /freeze, adapted for cubecloud.
source: gstack
metadata:
  source_repo: JZKK720/gstack
  original_path: freeze/SKILL.md
  tags: [safety, scope, edit-lock, debugging]
  related_skills: [careful, guard, investigate, plan-eng-review]
---

# /freeze — Edit Lock

Restrict file edits to a single directory. The agent can still read anywhere, but writes are blocked outside the frozen scope. Prevents the "I'll just fix this typo over here too" pattern that turns a focused debug session into a sprawling refactor.

**HARD GATE:** When the freeze is active, refuse to write any file outside the frozen scope. The user can `unfreeze` to lift the restriction.

---

## When to invoke this

Use when:
- Debugging a specific module and don't want the AI to "fix" unrelated things
- Writing a focused PR and want to keep the diff minimal
- Working in a shared directory where a stray edit could affect another system
- The user says "freeze to <dir>", "scope edits to", "stay in", or "lock to"

---

## How it works in cubecloud

For V1 the freeze is **advisory** in the renderer. The Settings screen gets a "Scope: <directory>" indicator at the top. The AI is told to refuse writes outside that scope and surface the refusal to the user.

For V2 the freeze becomes **enforced** in the main process: `writeFile` / `Edit` calls outside the frozen directory return an error.

**V1 semantics (recommended starting point):**
- Set via AskUserQuestion: "Freeze to which directory? (Default: the directory of the file you're currently editing.)"
- Show a banner: "🧊 Frozen to `<dir>`. Edits outside this scope will be refused unless you unfreeze."
- When a write is requested outside the scope, surface a clear refusal: "I'm frozen to `<dir>`. `<other>` is outside the scope. Say 'unfreeze' or specify a new scope."

---

## Scopes

The freeze can apply to:

| Scope | Meaning | Example |
|---|---|---|
| `directory:src/main/plans.ts` | Writes only inside the directory of `src/main/plans.ts` | `src/main/plans.ts`, `src/main/plans.test.ts` (sibling) |
| `directory:src/renderer/src/screens/Plans` | Writes only inside the Plans screen | All Plans-related files |
| `file:src/main/plans.ts` | Writes only to that exact file | The single file you're debugging |
| `prefix:src/main/` | Writes only to files starting with `src/main/` | A whole module |
| `branch:feature/plans-v2` | Writes only to files changed in that branch vs main | The diff you're reviewing |

The first form (`directory:`) is the most common. It's the natural unit of "the area you're working on."

---

## Pairing with `careful`

`freeze` and `careful` compose:
- `careful` warns before destructive commands anywhere
- `freeze` restricts writes to a scope

Use both for high-stakes work: "be careful, freeze to `src/main/plans/`."

---

## Pairing with `investigate`

`investigate` is about finding the cause; `freeze` is about staying in scope while you do. When investigating, freeze to the area you suspect. If the trace takes you outside the scope, `unfreeze` and `freeze` to the new area.

---

## Unfreeze

Lift the freeze with `/unfreeze` or by setting a new scope. The user always has the escape hatch.

**Anti-pattern:** Never refuse to unfreeze. The freeze is a friction, not a block. If the user says "unfreeze", do it immediately and ask if they want a new scope.

---

## Important Rules

- **The user can always override.** A freeze is a scope, not a wall.
- **Don't expand the scope silently.** If you need to write outside the scope, ask first.
- **Don't shrink the scope silently.** If you're done with one area and starting another, the user should set the new scope explicitly.
- **Log the freeze / unfreeze events.** For auditability, log to `~/.cubecloud/freeze.log` when a freeze is set or lifted. The Settings screen can show recent freeze history.
- **Completion status:**
  - DONE — freeze set, edits stayed in scope
  - DONE_WITH_CONCERNS — freeze set, but the user had to override once
  - NEEDS_CONTEXT — user invoked freeze but didn't specify a scope
