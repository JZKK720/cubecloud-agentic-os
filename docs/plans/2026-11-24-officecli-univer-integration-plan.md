# OfficeCLI + Univer: what to build, what to skip

Written against: `9ad8a2c`

This replaces the "univer as the office layer" framing. That framing is
wrong on the facts, and the facts are in §2.

## 1. What the user actually has today

| Layer | State | Evidence |
|---|---|---|
| OfficeCLI binary | **Installed and working.** `officecli 1.0.163` at `~/.local/bin/officecli` | `officecli --version`, `officecli create`, `set`, `get --json`, `view text\|html\|screenshot` all ran clean against a scratch `.xlsx` |
| OfficeCLI in the desktop | **Registered, surfaced, advisory only.** `registry.ts` lists it as an MCP stdio tool (`officecli mcp`); the Tools panel shows an "is it installed" card with a hint; i18n present in 9 locales | `agent-desktop/src/renderer/src/screens/Mcp/registry.ts`, `Tools.tsx` |
| OfficeCLI as an agent tool | **Not wired.** No main-process runner, no IPC channel, no test, and nothing in the agent surface invokes it. The Tools card is discoverability, not capability | `git grep officecli` in `src/main/` → 0 hits |
| Univer | **Not present.** Not in `package.json` (I added it temporarily during analysis, then removed it and the `node_modules` residue) | `git diff --stat` clean; `node_modules/@univerjs` deleted |

## 2. Why Univer is not the office layer

`officecli` can **read and write the real `.xlsx`**. Univer OSS (1.6.1, Apache-2.0) **cannot**: its preset has no `.xlsx` reader. `ls node_modules/@univerjs/*/lib` for `xlsx`/`exceljs`/`xlsx-stream-reader` returns nothing; the only Excel-shaped regex in the tree matches `EXCEL_WORKBOOK_EXTENSION = /\.(?:xlsx|xlsm|xlsb|xltx|xltm|xls)$/i` inside the formula engine's unit-reference resolver (it strips the extension from a sheet *name*, it does not parse files).

So for the stated goal — "implement Univer so OfficeCLI works with our agentic OS" — Univer is not a substitute for OfficeCLI and does not complete it. What Univer could add is a **renderer**: an in-app interactive spreadsheet view for a workbook the agent has already written. That is a real feature, but it is strictly optional, and OfficeCLI already covers the same need with `officecli view <file> html` (self-contained HTML, `--out` to a file) and `officecli screenshot --page N -o out.png`.

Univer's remaining advantage is interactivity: a live grid with selection, editing and formula re-evaluation inside our window. That is worth having **only if** an operator actually asks to edit a sheet inside the desktop, versus "agent edited the file, show me a before/after".

## 3. The plan

Two tracks. Track A is the one that makes the product better this month.
Track B is the only honest Univer work, and it is gated.

### Track A — make OfficeCLI a first-class agent tool (do this)

**A1. Main-process runner.** `agent-desktop/src/main/officecli.ts`, modeled on
`agent-desktop/src/main/harnesses/registry.ts` and `kitesurf-probe.ts`.

- `spawn` `officecli` (resolve from PATH via `where officecli` / `which officecli`, or `OFFICECLI_BIN` env), no shell.
- Expose exactly two operations, no more:
  - `officecliRun({ file, command, args })` → stdout/stderr/exitCode, timeout 120 s,
    output capped at 1 MB (screenshot mode can be large; truncate with a flag).
  - `officecliView({ file, mode, out? })` → `text | outline | issues | html | screenshot`.
- `OLLAMA_*`-style env passthrough **not** needed — OfficeCLI needs nothing else.
- Hard rule: the child only ever receives `file`, `command`, `args` from the
  agent; paths must be inside an allow-listed root. **There is no existing
  path-containment helper in `src/main` today** — `mcp-config.ts` joins paths
  without validating them and `codegraph-runtime.ts` takes a caller-supplied
  `projectRoot` unchecked. A2 must add its own guard (resolve the file, reject
  anything whose resolved path escapes the allow-listed root) and cannot copy
  one. Budget for it; do not assume reuse.

**A2. IPC surface.** One `ipcMain.handle` in `ipc/registerOfficecli.ts`, matching
the existing `register*.ts` pattern. Channel: `office:run`. Renderer calls it
from a new collapsible panel on the Tools screen, sibling to the existing
OfficeCLI card: "Run a document command" → file picker, free-text command line
**pre-validated** against a whitelist (`create|get|set|add|remove|query|validate|view|batch|dump|save`), never `shell` or arbitrary args.

**A3. Renderer.** `tools.panels.officecli.*` i18n keys already exist for the
static card. Add `tools.officecli.run.*` for the new panel. Reuse the existing
card styles in `Tools.tsx`; add a `<OfficeCliRunner />` component next to
`<ManagedAppsPanel />`.

**A4. Agent capability.** Add an entry to `AGENT_CLI_CATALOG` skill metadata
(`src/shared/agent-clis.ts` already lists `officecli` with `commands:
["officecli"]`). Wire it into the preflight so an agent can request OfficeCLI
by name and get told whether it is installed. No new tier — it is tier 4,
same as every other CLI.

**A5. Docs.** `docs/handbook/OPERATIONS.md` gets a short "OfficeCLI" section:
install line, the command whitelist, where output lands, and that it is
optional (the desktop degrades cleanly when the binary is absent — the existing
card already handles that).

**Verification.**
- `npx vitest run tests/officecli-runner.test.ts` — spawns a stub `officecli`
  on PATH (a `.cmd`/shell shim in the test temp dir) asserting: whitelist rejects
  `shell`, path escape rejected, timeout fires, output cap enforced.
- Manual: `npm run dev`, Tools → OfficeCLI panel, run `view sample.xlsx text`
  against a fixture in `tests/fixtures/`.
- The existing 172-file suite stays green; `check-i18n-coverage.cjs` stays green
  (new keys added to all 8 locales).

**Estimate:** 1–2 days. No new dependencies.

### Track B — Univer viewer (only if you want it after A ships)

**Gate:** Track A shipped **and** a real screen needs an interactive grid, not
a screenshot. Until then this is a spike, not a feature.

**B1. Spike (half a day, throwaway).** In a scratch branch, load
`@univerjs/preset-sheets-core` into the renderer, mount `<UniverSheet />` on a
hidden route, feed it a hand-built `IWorkbookData` (not a parsed file), and
measure: bundle delta (`npm run build` before/after), first-paint, memory, and
whether it runs under Electron's sandboxed renderer. Output is a single
`docs/plans/2026-11-24-univer-spike.md` with numbers, not an implementation.

**B2. If the spike passes: read-only viewer fed from `officecli view --json`.**
Univer is not the source of truth — officecli is. The flow:
`officecli view file.xlsx outline --json` → normalise to `IWorkbookData` →
render. Never let Univer write back to the file; the write path stays
`officecli set/add/batch`. `.xlsx` → `IWorkbookData` mapping is the real work;
budget it as such (it is 80% of this track).

**B3. If the spike fails:** stay with `officecli view html` in an `<iframe>`
(already works, zero dependencies, already produces a self-contained document).
That is the fallback and it is probably the right answer.

**Explicitly out of scope for B:** editing, formula engine fidelity claims,
`pro` packages (`@univerjs-pro/*` — they have no `license` field on npm, so
shipping them is a licence violation), xlsx *writing* from Univer, and replacing
OfficeCLI. Univer does not compete with OfficeCLI; it is a rendering surface.

### Track C — what I am refusing to build

- A general "open any Office file in a Univer grid" feature. No parser exists;
  writing one is a month and still won't round-trip styles/pivots/charts.
- Bundling `@univerjs-pro/*` or `workbuddy-univer-office`. Unlicensed /
  `pro`-only. Not negotiable.
- Replacing OfficeCLI's role. It is the only component here that can actually
  do the job.

## 4. Sequence

1. Track A1–A5 behind the existing Tools screen. Commit as one PR.
2. Ship it. Use it for one week on real documents.
3. Only then: Track B1 spike. Decision point is the spike's numbers, not
   preference.
4. Track B2 or B3 follows the spike.

## 5. What this plan does not do

It does not touch the i18n backlog, the univer licensing question, the
`deepseek`/`ag-ui`/`kitesurf` lines of work, or the release pipeline. Those are
tracked separately in `2026-11-22-open-items-implementation-plan.md`.
