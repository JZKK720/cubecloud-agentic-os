---
name: careful
description: Destructive-command guardrails. Warns before rm -rf, DROP TABLE, force-push, git reset --hard, and similar operations. Use when touching prod, debugging live systems, or working in a shared environment. Mirror of gstack's /careful, adapted for cubecloud.
source: gstack
metadata:
  source_repo: JZKK720/gstack
  original_path: careful/SKILL.md
  tags: [safety, guardrails, destructive-commands, pre-tool-use]
  related_skills: [freeze, guard, investigate, plan-eng-review]
---

# /careful —Destructive Command Guardrails

When the user says "be careful", "safety mode", "prod mode", or "careful mode", or when a destructive command is about to run, warn BEFORE executing. The user can override each warning.

**HARD GATE:** Always confirm before running any command in the protected list. The user can always override —`careful` is a guardrail, not a block.

---

## What's protected

| Pattern | Example | Risk |
|---|---|---|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | Recursive delete |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | Data loss |
| `TRUNCATE` | `TRUNCATE orders;` | Data loss |
| `git push --force` / `-f` | `git push -f origin main` | History rewrite |
| `git reset --hard` | `git reset --hard HEAD~3` | Uncommitted work loss |
| `git checkout .` / `git restore .` | `git checkout .` | Uncommitted work loss |
| `git clean -fd` | `git clean -fd` | Untracked file loss |
| `kubectl delete` | `kubectl delete pod` | Production impact |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | Container/image loss |
| `chmod -R 000` / `chown -R` on system paths | `chmod -R 000 /etc` | Permissions lockout |
| `mkfs` / `dd if=...of=/dev/sd*` | `dd if=/dev/zero of=/dev/sda` | Disk wipe |
| `> file.txt` (truncate via redirect) | `> important.json` | File content loss |
| `npm uninstall <pkg> --save` (when pkg is in use) | n/a | Cascade breakage |

---

## Safe exceptions

These patterns are allowed without warning:
- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage` / `target` / `out`
- `rm -rf` inside the agent-desktop `__pycache__` or `*.pyc` files
- `git push` (without `--force` / `-f`)
- `git reset --soft` or `git reset --mixed` (uncommitted work is preserved)
- `docker rm <container>` (specific, not `--force` on all)
- `kubectl delete` with `--dry-run=server` or `--dry-run=client`
- `git clean -fd` when followed by an explicit `git checkout` to recover the deletions

---

## How it works

This skill runs as a pre-tool-use guard. The user invokes it explicitly with "be careful" or it auto-activates when:
- The current branch is `main` / `master` / `production` / `prod`
- A previous destructive command was just confirmed
- The user says "we're in production" or "this is shared"

When a destructive command is detected, surface a warning:

```
⚠️ Destructive command detected: <command>

<one-sentence why-this-is-dangerous>

Options:
  A) Cancel —don't run
  B) Override —run anyway (the user can always escape)
  C) Soften —suggest a safer alternative
```

**Default to (B) override** if the user has said "be careful" or "we're in prod" —the user invoked the skill; they want the friction, not a block.

---

## The Cubelcloud hook

In agent-desktop, `careful` can be wired into the main process's IPC handler. The renderer sends a `careful:check` event with the command string; the main process returns `safe | warn | block`:

```ts
// Concept: src/main/safety.ts
export type CarefulVerdict = "safe" | "warn" | "block";

export function checkCareful(command: string): {
  verdict: CarefulVerdict;
  matchedPattern?: string;
  reason?: string;
  softerAlternative?: string;
}
```

For V1 the check is **advisory** (the UI shows a confirm dialog), not blocking. The user can always proceed.

---

## Behavior on each verdict

| Verdict | Renderer behavior |
|---|---|
| `safe` | No dialog, run the command. |
| `warn` | Show a non-blocking confirm dialog with the matched pattern + reason. The user must type the verb (Cancel / Override / Soften) explicitly. |
| `block` | (Reserved for future use —not used in V1.) |

---

## Adapting to a user's "be careful" intent

When the user says "be careful", ask one question to scope the session:

> How aggressive should the guardrails be for the rest of this session?

Options:
- A) **Advisory** —warn on destructive commands, but allow override
- B) **Strict** —same as Advisory, but also warn on ambiguous commands (any pattern that *could* be destructive in the wrong context)
- C) **Off** —disable the guardrail entirely

Default: **Advisory**.

---

## Important Rules

- **Always allow override.** A guardrail is a friction, not a wall. The user can always type "do it anyway" or click Override.
- **Don't be clever about pattern matching.** If you're not sure whether a command is destructive, prefer to warn and let the user decide. False positives are annoying; false negatives lose data.
- **Log the override.** When the user overrides a warning, log it (locally, in `~/.cubecloud/safety.log`) so it's auditable. Don't gate on the log; just record it.
- **Safe exceptions are non-negotiable.** Never warn on `rm -rf node_modules`. That would be unusable.
- **Completion status:**
  - DONE —checked command, returned verdict, user proceeded
  - DONE_WITH_CONCERNS —user overrode a warning on a `warn` verdict
  - BLOCKED —user said "cancel" (rare; the whole point is to surface risk, not to block)
