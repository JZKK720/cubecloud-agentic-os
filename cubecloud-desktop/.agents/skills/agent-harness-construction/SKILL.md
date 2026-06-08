---
name: agent-harness-construction
description: How to wire a new IPC channel end-to-end: main process handler, preload bridge, ambient types, i18n, and the unit test that proves it.
source: ecc
metadata:
  source_repo: ECC agent-harness-construction
  tags: [electron, ipc, preload, i18n, typecheck]
  related_skills: [typescript-expert, electron-pro, agentic-engineering]
---

# Agent Harness Construction

The desktop is an Electron app with a strict two-process contract: **main** owns the privileged half (filesystem, child processes, IPC), **preload** owns the bridge that exposes a typed surface to the renderer, and the **renderer** is a normal React app. Every new feature that crosses the process boundary needs the same five files touched. This skill is the checklist.

## When to use

Use this skill when:

- You are adding a new IPC channel (e.g. `convert-file-to-markdown`).
- You are exposing a new typed method on `window.hermesAPI`.
- You are wiring a new sidebar surface that talks to the main process.

## The five-file checklist

For every new IPC channel `foo-bar`:

### 1. `src/main/index.ts` — register the handler

```ts
ipcMain.handle("foo-bar", async (_event, arg: SomeType) => {
  return await fooBar(arg);
});
```

For per-profile features, respect the `connectionMode` (`local` | `remote` | `ssh`) and delegate to the matching `sshFooBar` if `conn.mode === "ssh" && conn.ssh`. Local-only features can skip the branch.

### 2. `src/preload/index.ts` — add the bridge method

The `hermesAPI` object literal is the public surface. Add your method next to its kin (don't bury it at the end):

```ts
fooBar: (arg: SomeType) => ipcRenderer.invoke("foo-bar", arg),
```

### 3. `src/preload/index.d.ts` — mirror the type

Preload is type-checked under `tsconfig.node.json` which does **not** include the `.d.ts`. So every method needs the same signature in **both** preload files. The renderer-side `.d.ts` is the public contract for `window.hermesAPI`.

### 4. `src/shared/i18n/locales/*/...` — add the strings

For each of the 8 locales (en, es, id, ja, pt-BR, pt-PT, zh-CN, zh-TW), add the new keys. Use the existing pattern: a namespace key (`skills.title`, `memory.wikiTab`, etc.) and per-locale string. Do not "translate later" by leaving English in every locale — at minimum, copy the English string into every locale so the UI doesn't render `welcome.title` to a Spanish user.

### 5. `tests/<surface>.test.ts` — prove it works

The unit test mocks `../src/main/utils` (so `profileHome()` points at a scratch directory) and imports the SUT. For pure functions, no IPC needed. For IPC handlers, mock `ipcMain` or expose the underlying function directly.

## Common pitfalls

- **Asymmetric preload**: writing the method in `index.ts` but not `index.d.ts` (or vice versa). The renderer will compile but the runtime contract is broken.
- **Forgetting i18n**: putting strings directly in the component instead of `t("...")`. Every user-visible string must be localizable.
- **Skipping the test**: a feature without a test is a feature that will regress silently.
- **Reaching for `any`**: if you can't type the IPC payload, the contract is wrong. Stop and redesign the channel.

## Verification commands

```bash
# Typecheck both sides of the IPC contract.
& node_modules/.bin/tsc.cmd --noEmit -p tsconfig.node.json --composite false
& node_modules/.bin/tsc.cmd --noEmit -p tsconfig.web.json --composite false

# Run the relevant test files.
& node_modules/.bin/vitest.cmd run tests/<surface>.test.ts
```

Both typechecks must pass and the relevant tests must be green before declaring the harness done.
