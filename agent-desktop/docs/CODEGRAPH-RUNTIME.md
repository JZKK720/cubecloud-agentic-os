# CodeGraph runtime

> **Cubecloud-original work (2026).** Distributed under the dual
> license per [`LICENSE`](../LICENSE) (AGPL-3.0-or-later OR
> Apache-2.0 OR MIT); see [`BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
> for the per-path provenance breakdown. The underlying
> `@colbymchenry/codegraph` SDK is its own third-party project;
> this document only covers Cubecloud's wrapper layer.
>
> SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

The CodeGraph screen has two backends:

1. **CLI subprocess** (the historical path) — `src/main/codegraph.ts` shells
   out to the `codegraph` binary for `init`, `status`, `context`, and
   `export-ua-graph`. Always works when the CLI is on PATH.
2. **Embedded SDK** (this runtime) — `src/main/codegraph-runtime.ts` wraps
   the `@colbymchenry/codegraph` npm package as a TypeScript library,
   keeping a per-project `CodeGraph` instance alive in the main process
   so the renderer can run `searchNodes`, `getImpactRadius`, and
   `getStats` without spawning a subprocess per call.

This document covers (2). For (1), see the existing `codegraph-cli-status`
/ `codegraph-install-cli` / `codegraph-build-context` channels in
`src/main/index.ts` — those are unchanged.

## Why an embedded runtime

The CLI path has a per-call cost (~50–200ms for `codegraph context`) and
streams its output as text, which makes in-app features like "search
nodes as I type" feel laggy. The embedded SDK avoids both:

- **No spawn per call.** The SDK keeps an open handle to the per-project
  SQLite index; `searchNodes` is a single SQL query.
- **Typed results.** The CLI path returns free-form JSON; the SDK path
  returns typed objects the renderer can render directly.
- **Watch + incremental updates** (future work) — the SDK can subscribe
  to file changes and re-index incrementally. The CLI has no such
  affordance.

The tradeoff is that the SDK is a heavier install (it pulls in a
per-platform native bundle), so the runtime **degrades gracefully** to
the CLI path when the SDK isn't present. The user is never blocked.

## Lazy SDK load

`@colbymchenry/codegraph` is declared as an **optional** dependency in
`package.json`. The runtime resolves it through a `require()` guarded
by `try/catch`:

```ts
function loadSdk(): SdkHandle | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sdk = require("@colbymchenry/codegraph");
    if (!sdk?.CodeGraph || typeof sdk.CodeGraph.open !== "function") {
      return null;
    }
    return { CodeGraph: sdk.CodeGraph, version: sdk.version ?? "unknown" };
  } catch {
    return null;
  }
}
```

This means:

- On platforms where the package doesn't publish a wheel, the
  `require()` throws ENOENT and `getCodeGraphRuntimeStatus()` reports
  `sdkInstalled: false`. The renderer's CodeGraph screen falls back to
  its existing "Install CLI" CTA. **No crash, no degraded experience.**
- The runtime module itself is cheap to import — it never calls
  `require()` at module load. The SDK is only resolved on the first
  IPC call that needs it.
- The native bundle (`@colbymchenry/codegraph-<plat>-<arch>`) is
  resolved transitively through the same `require()`. If it's missing,
  the runtime returns `sdkInstalled: false` with `reason: "platform
  bundle unavailable"`.

## Per-project LRU cache

The runtime keeps up to **4** open `CodeGraph` instances in a `Map`
keyed by absolute project path. Opening a 5th project evicts the
least-recently-touched one:

```ts
const MAX_OPEN_INSTANCES = 4;
const openInstances = new Map<string, ProjectEntry>();

function pruneOldInstances(): void {
  if (openInstances.size <= MAX_OPEN_INSTANCES) return;
  const sorted = [...openInstances.entries()].sort(
    (a, b) => a[1].lastTouchedMs - b[1].lastTouchedMs,
  );
  while (openInstances.size > MAX_OPEN_INSTANCES) {
    const next = sorted.shift();
    if (!next) break;
    const [projectPath, entry] = next;
    safeClose(entry.instance);
    openInstances.delete(projectPath);
  }
}
```

The cap exists because each instance holds a SQLite handle and the
SDK's in-process index cache. Four is a balance between "let power
users keep multiple repos warm" and "don't bloat a typical developer's
RAM". The renderer can call `closeCodeGraphRuntime(projectPath)` to
evict a project on demand (e.g. when the user navigates away), and
`closeAllCodeGraphRuntimes()` is called from `before-quit` to release
everything before the app exits.

The LRU uses **lastTouchedMs**, not insertion order — every successful
search / impact / stats call updates the timestamp. So a project the
user actively queries stays warm even if it was opened hours ago.

## IPC surface

All channels are `ipcMain.handle` registrations in `src/main/index.ts`,
exposed through `window.hermesAPI.*` in `src/preload/index.ts`. The
preload bindings in `src/preload/index.d.ts` are typed.

| Channel | Renderer method | Purpose |
|---------|-----------------|---------|
| `codegraph-runtime-status` | `codegraphRuntimeStatus()` | Probe `sdkInstalled` + `projectOpen` + `projectPath` + `sdkVersion` + `reason`. Cheap; no I/O. |
| `codegraph-runtime-open` | `codegraphRuntimeOpen(projectPath)` | Run `CodeGraph.init()` (if not yet initialized) then `CodeGraph.open()` and cache the instance. Returns `CodeGraphRuntimeInitResult`. |
| `codegraph-runtime-close` | `codegraphRuntimeClose(projectPath)` | Close and evict one project. Idempotent. |
| `codegraph-runtime-search` | `codegraphRuntimeSearch(projectPath, query, options)` | `searchNodes(query, options)`. Returns `CodeGraphRuntimeSearchResult` with `hits[]`. |
| `codegraph-runtime-impact` | `codegraphRuntimeImpact(projectPath, nodeId, maxDepth)` | `getImpactRadius(nodeId, maxDepth)`. Returns `CodeGraphRuntimeImpactResult` with `nodes[]` + `edges[]`. |
| `codegraph-runtime-stats` | `codegraphRuntimeStats(projectPath)` | `getStats()`. Returns `CodeGraphRuntimeStatsResult` with `nodeCount` + `edgeCount` + `fileCount` + `languages[]`. |

All methods never throw at the IPC boundary. They return a
`{ success: false, error: "..." }` envelope instead, so the renderer's
state machine is always driven by typed data.

## Renderer wiring

`src/renderer/src/screens/CodeGraph/CodeGraph.tsx` calls these channels
through `useEffect` + state hooks. The lifecycle:

1. On mount, the screen calls `codegraphRuntimeStatus()` once.
2. If `sdkInstalled: false`, the screen shows a clean install prompt
   (the existing "Install CLI" CTA also handles this case).
3. If `sdkInstalled: true`, the screen shows the embedded runtime
   panel: "Open project" button → folder picker → `codegraphRuntimeOpen()`.
4. With a project open, the search box calls
   `codegraphRuntimeSearch()` on every keystroke (debounced). Results
   render as a flat list with file path + line range + score.
5. Clicking a result calls `codegraphRuntimeImpact()` and renders the
   radius graph in a side panel.
6. "Stats" button calls `codegraphRuntimeStats()` and renders
   `nodeCount` / `edgeCount` / `fileCount` / `languages[]` in a small
   status card.

The screen never calls `closeAllCodeGraphRuntimes()` — that's owned by
the main process's `before-quit` handler so the lifecycle matches the
process lifecycle.

## Shutdown

`src/main/index.ts` wires the runtime into the `before-quit` hook:

```ts
app.on("before-quit", () => {
  try { closeAllCodeGraphRuntimes(); } catch { /* noop */ }
  try { stopEverOsSidecar(); } catch { /* noop */ }
});
```

`closeAllCodeGraphRuntimes()` walks the `openInstances` map, calls
`close()` on each `CodeGraph` instance (guarded by `try/catch` so a
corrupt SQLite handle can't block app exit), and clears the map. This
ensures no SQLite WAL files are left half-written on disk.

## Testing

`tests/codegraph-runtime.test.ts` has 12 unit tests covering:

- Status probe defaults when the SDK is absent
- Open/close lifecycle (open → instance held → close → instance evicted)
- LRU eviction at `MAX_OPEN_INSTANCES + 1` projects
- Search/impact/stats return typed envelopes with `success: false` and
  an `error` field when the project isn't open (no exceptions thrown)
- `closeAllCodeGraphRuntimes()` is a safe no-op when nothing is open
- SDK shape drift detection — the wrapper rejects a mocked SDK whose
  `CodeGraph.open` isn't a function, so a breaking change in the
  upstream package fails loud rather than silently degrading

The tests mock `@colbymchenry/codegraph` via `vi.mock` so no real
native code runs. They're fast (~50ms total) and run on every push
through the project's CI matrix.

## Future work

- **Watch mode** — call `codegraphRuntimeWatch(projectPath)` to
  subscribe to file changes and re-index incrementally. Renderer would
  re-render the search panel as the user types elsewhere.
- **Cross-project search** — query all open projects in one call and
  return a tagged `hits[]` so the UI can group by repo. Useful for
  monorepo / multi-repo work.
- **Persistent cache invalidation** — detect when a project's
  `package.json` / `Cargo.toml` / etc. changes version and re-init
  rather than blindly trusting the existing index.
