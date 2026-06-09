---
name: eval-harness
description: How to write fast deterministic unit tests for the agent's code paths. Mocks over real subprocesses; scratch dirs over real homes; temp files over fixtures in git.
source: ecc
metadata:
  source_repo: ECC eval-harness
  tags: [testing, vitest, mocks, determinism]
  related_skills: [typescript-expert, agentic-engineering, karpathy-guidelines]
---

# Eval Harness

The desktop's test suite is **vitest** with a strict policy: every test must be fast (sub-100ms), deterministic (no real subprocesses, no real `~/.hermes`), and isolated (the test never reads or writes outside its scratch directory). This skill is the conventions that policy rests on.

## When to use

Use this skill when:

- You are writing a new test file under `tests/`.
- You are tempted to add a real CLI invocation, real filesystem path, or real network call to a test.
- A test is flaky in CI.

## The five rules

### 1. Mock `src/main/utils` in every test

The shared `utils.ts` exports `profileHome()`, `safeWriteFile()`, `HERMES_HOME`, and a few others. They all default to the user's real `~/.hermes`, which is **not** what tests want. Always start a new test file with:

```ts
import { mkdtempSync, rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const HOME = mkdtempSync(join(tmpdir(), "<surface>-test-"));

vi.mock("../src/main/utils", () => ({
  HERMES_HOME: "/tmp",
  profileHome: () => HOME,
  safeWriteFile: (filePath: string, content: string) => {
    mkdirSync(join(filePath, ".."), { recursive: true });
    // ... real fs write
  },
  getEnhancedPath: () => process.env.PATH || "",
}));

beforeEach(() => {
  if (existsSync(HOME)) rmSync(HOME, { recursive: true, force: true });
  mkdirSync(HOME, { recursive: true });
});

afterEach(() => {
  if (existsSync(HOME)) rmSync(HOME, { recursive: true, force: true });
});
```

This isolates the test from the user's real data and makes cleanup a no-op.

### 2. Mock external modules from the SUT

When the SUT calls a helper from a sibling module (e.g. `agent-clis.ts`'s `resolveCommandOnPath`), mock the sibling:

```ts
const resolveCommandMock = vi.fn();
vi.mock("../src/main/agent-clis", () => ({
  resolveCommandOnPath: (cmd, env) => resolveCommandMock(cmd, env),
}));
```

The mock must be **resettable** between tests (`mockReset` in `beforeEach`).

### 3. Never invoke real CLIs

The `codegraph` and `markitdown` CLIs are first-class dependencies, but **never** invoke them from a test. Mock the resolver:

```ts
resolveCommandMock.mockReturnValue(null); // CLIs absent
resolveCommandMock.mockImplementation((cmd) =>
  cmd === "markitdown" ? "/usr/bin/markitdown" : null
);
```

A test that needs the real CLI is an integration test, not a unit test. Park it in `tests/integration/` and skip it in CI by default.

### 4. Same-module mocks don't work — inject instead

Vitest cannot mock a function's same-module call site (the closure is bound at module load). When the SUT calls its own helper, **inject** the dependency as an optional parameter:

```ts
export async function exportUnderstandAnythingGraph(
  projectPath: string,
  statusOverride?: CodeGraphProjectStatus, // <-- test injection point
): Promise<...>
```

The test passes the override; production callers pass `undefined`.

### 5. Read-only imports are free; mock only the side-effecting layer

A test that imports a pure utility (`stripAnsi`, `clampDial`) doesn't need any mocks. Save the mock setup for modules that touch the filesystem, child processes, or network.

## Patterns to avoid

- **`fs.readFileSync(realPath)`** in a test — read from `HOME`, not the user's actual files.
- **`await sleep(50)`** for "real" timing — drive the SUT synchronously when possible.
- **Snapshot testing** for free-form strings — they're brittle and rarely catch real regressions.
- **Test-only exports** on the SUT — if you need a test-only path, the production API is probably wrong.

## Reading test failures

When a test fails in CI but passes locally:

1. Check for `process.cwd()` calls — CI's cwd may be different.
2. Check for `homedir()` calls — CI's home is different.
3. Check for `Date.now()` / `new Date()` — time-of-day tests are flaky.
4. Check for hardcoded paths like `D:\users\...` — won't exist in CI.

## Reference tests

- `tests/wiki.test.ts` — scratch HOME, mock utils, no subprocesses.
- `tests/converters.test.ts` — sibling module mock, chain override.
- `tests/codegraph-ua-export.test.ts` — same-module injection pattern.
- `tests/design-dials.test.ts` — scratch HOME, partial-update coverage.
