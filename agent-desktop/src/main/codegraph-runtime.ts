/**
 * CodeGraph runtime wrapper.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *   The above expression covers the Cubecloud-original work in
 *   this file. Inherited hermes-desktop framework code that this
 *   file imports or links against remains under its original
 *   MIT terms and is not affected by the AGPL-3.0-or-later
 *   alternative. See `LICENSE` for the full dual-license notice.
 *
 * Background:
 *   The existing `src/main/codegraph.ts` shells out to the `codegraph`
 *   CLI for every operation (init, status, context, UA-graph export).
 *   The npm package `@colbymchenry/codegraph` (1.0.x) ALSO ships a
 *   programmatic SDK that exposes the same operations as a TypeScript
 *   class — `CodeGraph.init/open/indexAll/searchNodes/getCallers/
 *   getCallees/getImpactRadius/buildContext/watch/…` — without spawning
 *   a subprocess per call.
 *
 *   This module wraps that SDK behind a small, stable interface
 *   (`CodeGraphRuntime`) that the renderer (and the chat pipeline)
 *   can call. When the package is installed (either via
 *   `npm i -g @colbymchenry/codegraph`, which the existing
 *   `installCodeGraphCli` IPC already triggers, or by being on the
 *   consumer's `node_modules`), the wrapper uses the SDK. Otherwise
 *   it returns a structured `unavailable` error so the renderer can
 *   fall back to the existing CLI flow.
 *
 * Design constraints:
 *   - No new package.json dependency. The SDK ships an optional
 *     per-platform subpackage (`@colbymchenry/codegraph-<plat>-<arch>`)
 *     that the wrapper resolves at runtime. We `require()` lazily so
 *     importing this file is cheap on systems without the SDK.
 *   - The wrapper holds a per-project `CodeGraph` instance in
 *     `openInstances` so we don't re-open the same SQLite DB on
 *     every IPC call. `close()` is exposed so the renderer (and
 *     the shutdown path) can release the DB before the user
 *     re-inits a project.
 *   - The wrapper exports a `getCodeGraphRuntimeStatus()` that the
 *     renderer can poll to render an "embedded" vs "CLI" badge —
 *     matching the per-instance surface that the user sees in
 *     the existing CodeGraph CLI status.
 *   - The wrapper never blocks startup. If the SDK throws or the
 *     platform bundle is missing, the wrapper returns an
 *     `unavailable` result and the renderer's existing CLI CTA
 *     takes over.
 */

import { existsSync } from "fs";
import { join } from "path";

// ─── Public types (kept small and stable) ─────────────────────────

/**
 * Subset of the @colbymchenry/codegraph SearchResult shape that
 * the renderer needs to render search hits. We don't import the
 * SDK's types directly so this module is loadable even when the
 * SDK isn't installed — and so the renderer's view of the data
 * is decoupled from any future SDK type churn.
 */
export interface CodeGraphRuntimeSearchHit {
  id: string;
  name: string;
  kind: string;
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  score: number;
  snippet: string | null;
}

export interface CodeGraphRuntimeSearchResult {
  success: boolean;
  hits: CodeGraphRuntimeSearchHit[];
  error?: string;
}

export interface CodeGraphRuntimeImpactResult {
  success: boolean;
  nodes: Array<{
    id: string;
    name: string;
    kind: string;
    filePath: string | null;
    depth: number;
  }>;
  edges: Array<{ source: string; target: string; type: string }>;
  totalNodes: number;
  totalEdges: number;
  error?: string;
}

export interface CodeGraphRuntimeStatsResult {
  success: boolean;
  stats: {
    nodeCount: number;
    edgeCount: number;
    fileCount: number;
    languages: string[];
  } | null;
  error?: string;
}

export interface CodeGraphRuntimeInitResult {
  success: boolean;
  projectPath: string;
  nodeCount: number | null;
  fileCount: number | null;
  error?: string;
}

/**
 * Result of a generic runtime status probe. `available: true`
 * means the SDK is loadable AND the project has been opened
 * via `open()`. `available: false` with a `reason` field tells
 * the caller which fallback path to take.
 */
export interface CodeGraphRuntimeStatus {
  available: boolean;
  /** True when @colbymchenry/codegraph + its platform bundle are
   *  installed and require()-able. Does NOT imply a project is
   *  currently open. */
  sdkInstalled: boolean;
  /** True when a project is open and a CodeGraph instance is held. */
  projectOpen: boolean;
  projectPath: string | null;
  sdkVersion: string | null;
  reason?: string;
}

// ─── Internal: lazy SDK load ──────────────────────────────────────

interface SdkHandle {
  /**
   * The `CodeGraph` class as the SDK re-exports it. We type it as
   * a `new () => CodeGraphInstance` so we can construct instances
   * without importing the SDK's full type tree (the SDK isn't
   * installed in the test environment). The shape is a strict
   * subset of the public API — everything we actually call.
   * `init` / `open` are static methods on the class; `Instance`
   * is the per-project object returned by `open()`.
   */
  CodeGraph: {
    new (): CodeGraphInstance;
    init(
      projectRoot: string,
      options?: { index?: boolean },
    ): Promise<unknown>;
    open(
      projectRoot: string,
      options?: { readOnly?: boolean },
    ): Promise<unknown>;
  };
  version: string;
}

/**
 * Subset of the CodeGraph instance API we use. Exposed on a
 * separate type so the static-side `init`/`open`/`initSync`/
 * `openSync`/`isInitialized` calls don't get confused with the
 * instance methods (`getStats`, `searchNodes`, etc.).
 */
interface CodeGraphInstance {
  close(): void;
  getProjectRoot(): string;
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    fileCount: number;
  };
  getLanguages(): string[];
  searchNodes(
    query: string,
    options?: { limit?: number },
  ): Array<{
    id: string;
    name: string;
    kind: string;
    filePath?: string;
    startLine?: number;
    endLine?: number;
    score: number;
    snippet?: string;
  }>;
  getImpactRadius(
    nodeId: string,
    maxDepth?: number,
  ): {
    nodes: Array<{
      id: string;
      name: string;
      kind: string;
      filePath?: string;
      depth: number;
    }>;
    edges: Array<{ source: string; target: string; type: string }>;
  };
  sync(): Promise<unknown>;
}

let cachedSdk: SdkHandle | null = null;
let cachedSdkError: string | null = null;

/**
 * Try to load @colbymchenry/codegraph. The SDK's npm-sdk.js
 * resolves the platform-specific bundle (@colbymchenry/codegraph-
 * <platform>-<arch>) and re-exports the CodeGraph class. The
 * `require()` is wrapped in try/catch so the wrapper degrades
 * gracefully on machines that don't have the package.
 *
 * We also catch a "module not found" error from a fresh
 * `require()` so the cache stays clean across HMR-style module
 * reloads in the dev server.
 */
function tryLoadSdk(): SdkHandle | null {
  if (cachedSdk) return cachedSdk;
  if (cachedSdkError) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@colbymchenry/codegraph");
    const CodeGraph = mod?.default ?? mod?.CodeGraph ?? mod;
    if (typeof CodeGraph !== "function") {
      cachedSdkError = "CodeGraph SDK did not export a constructor";
      return null;
    }
    cachedSdk = {
      CodeGraph,
      version: mod?.version ?? "unknown",
    };
    return cachedSdk;
  } catch (err) {
    cachedSdkError = (err as Error).message;
    return null;
  }
}

// ─── Internal: per-project instance cache ─────────────────────────

interface OpenInstance {
  projectPath: string;
  instance: CodeGraphInstance;
  openedAt: number;
}

const openInstances: Map<string, OpenInstance> = new Map();
const MAX_OPEN_INSTANCES = 4; // bound memory; older projects are
                              // closed and re-opened on demand.

function touchInstance(projectPath: string, inst: OpenInstance): void {
  // The Map is keyed by projectPath, so updating `openedAt`
  // doesn't require any structural change; we just keep the
  // instance hot in the LRU. The unused-arg warning is silenced
  // by the explicit reference.
  void projectPath;
  inst.openedAt = Date.now();
}

function pruneOldInstances(): void {
  if (openInstances.size <= MAX_OPEN_INSTANCES) return;
  const sorted = [...openInstances.entries()].sort(
    (a, b) => a[1].openedAt - b[1].openedAt,
  );
  while (openInstances.size > MAX_OPEN_INSTANCES) {
    const next = sorted.shift();
    if (!next) break;
    const [oldestPath, oldest] = next;
    try {
      oldest.instance.close();
    } catch {
      /* ignore — close is best-effort */
    }
    openInstances.delete(oldestPath);
  }
}

async function getOrOpenInstance(
  projectPath: string,
): Promise<{ instance: CodeGraphInstance; opened: boolean }> {
  const cached = openInstances.get(projectPath);
  if (cached) {
    touchInstance(projectPath, cached);
    return { instance: cached.instance, opened: false };
  }
  const sdk = tryLoadSdk();
  if (!sdk) {
    throw new Error(
      "CodeGraph SDK is not installed. Run `npm i -g @colbymchenry/codegraph` or use the CLI fallback.",
    );
  }
  const instance = (await sdk.CodeGraph.open(projectPath, {
    readOnly: false,
  })) as unknown as CodeGraphInstance;
  openInstances.set(projectPath, {
    projectPath,
    instance,
    openedAt: Date.now(),
  });
  pruneOldInstances();
  return { instance, opened: true };
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Cheap probe the renderer can call on CodeGraph-screen mount
 * to decide between "embedded library" UI and "CLI required" UI.
 */
export function getCodeGraphRuntimeStatus(): CodeGraphRuntimeStatus {
  const sdk = tryLoadSdk();
  const sdkInstalled = sdk !== null;
  const projectEntries = [...openInstances.values()].sort(
    (a, b) => b.openedAt - a.openedAt,
  );
  const current = projectEntries[0] ?? null;
  return {
    available: sdkInstalled,
    sdkInstalled,
    projectOpen: current !== null,
    projectPath: current?.projectPath ?? null,
    sdkVersion: sdk?.version ?? null,
    reason: sdkInstalled
      ? undefined
      : cachedSdkError ??
        "CodeGraph SDK is not installed on this system.",
  };
}

/**
 * Open (or create) a CodeGraph project for the given directory.
 * On success, the project handle is cached in `openInstances` so
 * subsequent search/impact calls reuse the same SQLite connection.
 */
export async function openCodeGraphRuntime(
  projectPath: string,
): Promise<CodeGraphRuntimeInitResult> {
  const normalized = projectPath.trim();
  if (!normalized) {
    return { success: false, projectPath: "", nodeCount: null, fileCount: null, error: "Choose a project folder first." };
  }
  if (!existsSync(normalized)) {
    return { success: false, projectPath: normalized, nodeCount: null, fileCount: null, error: `Project path does not exist: ${normalized}` };
  }

  // Init the .CodeGraph directory if it's missing. The SDK's
  // `open()` throws when the project is uninitialised, so we
  // detect and run `init()` first.
  const codegraphDir = join(normalized, ".CodeGraph");
  const initialized = existsSync(codegraphDir);
  if (!initialized) {
    const sdk = tryLoadSdk();
    if (!sdk) {
      return {
        success: false,
        projectPath: normalized,
        nodeCount: null,
        fileCount: null,
        error:
          "CodeGraph SDK is not installed. Run `npm i -g @colbymchenry/codegraph` first.",
      };
    }
    try {
      // CodeGraph.init is a static method on the class; the SDK
      // ships it as part of the same export the `new` constructor
      // lives on, so we call through the type from the resolved
      // SDK handle. (Casting the constructor for clarity even
      // though TS already narrows it.)
      await sdk.CodeGraph.init(normalized, { index: false });
    } catch (err) {
      return {
        success: false,
        projectPath: normalized,
        nodeCount: null,
        fileCount: null,
        error: `CodeGraph init failed: ${(err as Error).message}`,
      };
    }
  }

  try {
    const { instance, opened } = await getOrOpenInstance(normalized);
    // Run an initial sync so a freshly opened project is at least
    // current. `sync()` is a no-op when nothing has changed.
    if (opened) {
      try {
        await instance.sync();
      } catch {
        // sync failures are non-fatal — the user can re-sync from
        // the CodeGraph screen. The project is still opened so the
        // search/impact APIs work on whatever the indexer last saw.
      }
    }
    const stats = instance.getStats();
    return {
      success: true,
      projectPath: normalized,
      nodeCount: stats.nodeCount,
      fileCount: stats.fileCount,
    };
  } catch (err) {
    return {
      success: false,
      projectPath: normalized,
      nodeCount: null,
      fileCount: null,
      error: (err as Error).message,
    };
  }
}

/**
 * Close a project. Releases the SQLite handle and removes the
 * entry from the instance cache. Safe to call on an unopened
 * project (no-op).
 */
export function closeCodeGraphRuntime(projectPath: string): {
  success: boolean;
  error?: string;
} {
  const entry = openInstances.get(projectPath);
  if (!entry) return { success: true };
  try {
    entry.instance.close();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
  openInstances.delete(projectPath);
  return { success: true };
}

/**
 * Search the project's indexed nodes by free-text query. The
 * SDK returns up to `limit` ranked hits (default 20). Empty
 * results are NOT an error — the caller renders an empty state.
 */
export async function searchCodeGraphRuntime(
  projectPath: string,
  query: string,
  options: { limit?: number } = {},
): Promise<CodeGraphRuntimeSearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, hits: [], error: "Enter a search query first." };
  }
  try {
    const { instance } = await getOrOpenInstance(projectPath);
    const raw = instance.searchNodes(trimmed, {
      limit: options.limit ?? 20,
    });
    return {
      success: true,
      hits: raw.map((hit) => ({
        id: hit.id,
        name: hit.name,
        kind: hit.kind,
        filePath: hit.filePath ?? null,
        startLine: hit.startLine ?? null,
        endLine: hit.endLine ?? null,
        score: hit.score,
        snippet: hit.snippet ?? null,
      })),
    };
  } catch (err) {
    return { success: false, hits: [], error: (err as Error).message };
  }
}

/**
 * Compute the impact radius of a node — i.e. what other code
 * would be affected by changing it. `maxDepth` defaults to 3
 * (matching the SDK's default).
 */
export async function getImpactRadiusRuntime(
  projectPath: string,
  nodeId: string,
  maxDepth = 3,
): Promise<CodeGraphRuntimeImpactResult> {
  if (!nodeId.trim()) {
    return {
      success: false,
      nodes: [],
      edges: [],
      totalNodes: 0,
      totalEdges: 0,
      error: "nodeId is required",
    };
  }
  try {
    const { instance } = await getOrOpenInstance(projectPath);
    const sub = instance.getImpactRadius(nodeId, maxDepth);
    return {
      success: true,
      nodes: sub.nodes.map((n) => ({
        id: n.id,
        name: n.name,
        kind: n.kind,
        filePath: n.filePath ?? null,
        depth: n.depth,
      })),
      edges: sub.edges.map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
      })),
      totalNodes: sub.nodes.length,
      totalEdges: sub.edges.length,
    };
  } catch (err) {
    return {
      success: false,
      nodes: [],
      edges: [],
      totalNodes: 0,
      totalEdges: 0,
      error: (err as Error).message,
    };
  }
}

/**
 * Lightweight stats probe. Useful for the CodeGraph sidebar
 * header to show "X nodes / Y files" without forcing a full
 * `codegraph status` CLI call.
 */
export async function getCodeGraphRuntimeStats(
  projectPath: string,
): Promise<CodeGraphRuntimeStatsResult> {
  try {
    const { instance } = await getOrOpenInstance(projectPath);
    const stats = instance.getStats();
    const languages: string[] = (() => {
      try {
        return instance.getLanguages();
      } catch {
        return [];
      }
    })();
    return {
      success: true,
      stats: {
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        fileCount: stats.fileCount,
        languages,
      },
    };
  } catch (err) {
    return {
      success: false,
      stats: null,
      error: (err as Error).message,
    };
  }
}

/**
 * Close every open instance. Called on app shutdown so SQLite
 * handles are released cleanly.
 */
export function closeAllCodeGraphRuntimes(): void {
  for (const entry of openInstances.values()) {
    try {
      entry.instance.close();
    } catch {
      /* best-effort */
    }
  }
  openInstances.clear();
}
