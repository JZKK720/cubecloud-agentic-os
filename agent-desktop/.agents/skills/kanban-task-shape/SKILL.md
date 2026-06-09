---
name: kanban-task-shape
description: How to break a plan or RFC into a Kanban backlog that the desktop's task orchestrator can dispatch to the agent. The task body, the skills, the max retries.
source: ecc
metadata:
  source_repo: ECC kanban-task-shape
  tags: [kanban, planning, dispatch, retry, tasks]
  related_skills: [agentic-engineering, continuous-learning-v2, openclaw-persona-forge]
---

# Kanban Task Shape

The desktop's **Kanban** surface is a per-profile SQLite-backed task board (`<profile>/kanban.db`). Tasks are dispatched to the agent by the task orchestrator (`kanbanDispatchOnce` IPC), which runs the task's `body` as a prompt with the listed `skills` enabled and a `maxRetries` budget.

A well-shaped task is **self-contained, scoped, and retryable**. This skill describes the shape that works.

## When to use

Use this skill when:

- You are writing a task body for `kanbanCreateTask`.
- You are converting a plan or RFC into a Kanban backlog.
- The dispatcher is failing with "no such skill" or "task body too vague" errors.

## The task shape

```ts
interface KanbanCreateTaskInput {
  title: string;        // one line
  body?: string;        // the prompt
  assignee?: string;    // profile or "agent"
  priority?: number;    // 0 (low) to 5 (urgent)
  tenant?: string;      // grouping key (defaults to "default")
  workspace?: string;   // "tasks" or "synthesis"
  triage?: boolean;     // if true, the orchestrator will categorize before dispatch
  skills?: string[];    // skill names to enable
  maxRetries?: number;  // 0..3, default 2
}
```

The two fields that matter most for shape are `body` and `skills`.

## Writing a good body

The body is the agent's prompt. It should be self-contained — the agent should not need to read the user's chat history to know what to do.

### 1. State the deliverable in the first sentence

```md
# Refactor `convertFileToMarkdown` to return a typed result union

Refactor the `convertFileToMarkdown` function in `src/main/converters.ts` so
the return type is a tagged union of success and failure instead of two
separate success/error fields. Update the IPC handler, preload, and the
unit tests.

## Acceptance

- [ ] The return type is a tagged union `{success: true, result} | {success: false, error, ...}`.
- [ ] All call sites in `src/main/index.ts` and `src/preload/index.ts` are updated.
- [ ] `tests/converters.test.ts` is updated to assert on the union shape.
- [ ] `tsconfig.node.json` and `tsconfig.web.json` both pass.

## Notes

- The IPC channel name stays the same.
- Don't touch the converter chain itself, just the wrapper function.
```

That's a 20-line body. The agent can act on it without asking questions.

### 2. Include acceptance criteria

The bullets under "Acceptance" are the agent's definition of done. If the agent has to invent the criteria, the task is underspecified.

### 3. Note the "do not touch" zone

A "Notes" or "Out of scope" section prevents the agent from helping in ways you didn't want. Common ones:

- "Do not change the public IPC channel name."
- "Do not add a new dependency."
- "Do not refactor adjacent code."

### 4. Reference the file paths

A path like `src/main/converters.ts` is worth a thousand words. The agent can read the file. The agent cannot read your mind.

## Skills

The `skills` field enables skills in the agent's runtime for the duration of the task. Pick the minimum needed:

- A "refactor" task → `["agentic-engineering", "eval-harness"]`
- A "documentation" task → `["continuous-learning-v2"]`
- A "ship a feature" task → `["agent-harness-construction", "eval-harness", "karpathy-guidelines"]`

**Never** enable every skill. A task with 12 skills burns context on skill introspection.

## maxRetries

The default is 2. Override it only when:

- The task is **idempotent** (rerunning is safe) → `maxRetries: 3` or higher.
- The task is **expensive** (e.g. a long refactor) → `maxRetries: 1`.
- The task is **critical** and a flake is unacceptable → `maxRetries: 0` and dispatch manually.

The orchestrator logs every retry to the wiki's `log.md`. If a task is hitting its retry budget, look at the log to see why before raising the budget.

## Common shapes

| Task type | Body length | Skills | maxRetries |
|-----------|-------------|--------|------------|
| One-line fix | 5-10 lines | none | 1 |
| Refactor | 20-40 lines | `agentic-engineering`, `eval-harness` | 2 |
| New feature | 40-80 lines | `agent-harness-construction`, `eval-harness`, `karpathy-guidelines` | 2 |
| Documentation | 10-20 lines | `continuous-learning-v2` | 1 |
| Investigation | 10-20 lines | none | 3 |

If a task is taking more than ~5 turns to complete, the body is too vague or the scope is too wide. Break it up.

## Reference

- `src/main/kanban.ts` — `createTask`, `dispatchOnce`, `TaskInput`.
- `src/renderer/src/screens/Kanban/...` — the Kanban surface.
- `src/shared/agent-clis.ts` — the AgentCliId union. The `assignee` field is one of these or "agent".
