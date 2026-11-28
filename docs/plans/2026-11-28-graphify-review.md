# 2026-11-28 — Graph-based review of the four open branches

Tool: `graphify extract . --code-only --no-cluster` (no LLM, AST only; no source left the machine).
Output: `graphify-out/graph.json` (gitignored) — **not committed**. 6637 nodes, 13964 edges, 893 code files scanned (500 non-code files skipped).

## Structural findings

### 1. `setupIPC()` is the gravity well
- 344 edges, all inside `agent-desktop/src/main/index.ts` (3,638 lines, 171 `ipcMain.handle` sites).
- Fan-out is a star, not a seam: every new capability lands in the same function. No module boundary is being enforced for IPC.
- Every PR in #11–#14 touches this file or is gated by something that does. Merge conflicts across the four PRs are likely here, not in feature code.

**Consequence:** review order should serialise on `index.ts`. #11 (EverOS v2 IPC) and #12 (OfficeCLI IPC) both extend it; #13/#14 don't touch it.

### 2. OfficeCLI containment blast radius
`isDocumentSelector` / `validateArgs` / `resolveWithinRoots` / `looksLikePath` / `splitOptionValue` are all called only from `runOfficeCli` / `viewOfficeCli` / `validateInvocation`, which are reached from `setupIPC` (2 call sites via `officeCliStatus`, `officecliView`, `runOfficeCli`). The blast radius of the #12 fix is exactly the OfficeCLI panel; nothing else in the graph depends on it. This is a safe change to review in isolation.

### 3. EverOS v2 wiring
`addMemoryV2` is called by `setupIPC()` (1 site) and referenced by the two test files only. No other renderer path consumes the v2 client yet — the renderer still talks to IPC, not to `everos-v2.ts` directly. So the v2 client's correctness is gated entirely by the unit tests + (unavailable) live server.

### 4. `useI18n` is the #3 hub (133 edges)
Any locale or key-shape change has a wide implicit fan-out. The i18n gate now evaluates modules, which is the right control; the graph confirms the gate is load-bearing rather than decorative.

### 5. No cycle signal from these PRs
`graphify path` from `runOfficeCli`/`addMemoryV2` to `setupIPC` is a 1-hop call through the IPC hub; no cross-module cycles introduced.

## What the graph does NOT tell us

-  It cannot measure churn or ownership. `git log --format= --name-only` says neither which of these PRs overlap textually nor whether a file is hot; use git for that.
- It has no semantic understanding of the IPC contract (arg shapes, error model). The 38 review threads found real bugs the graph cannot see (empty-messages no-op inconsistency, backslash handling in the tokenizer, async `describe`).
- It cannot tell whether the EverOS v2 contract matches the live server. That requires a running instance with an embedding backend, which this machine does not have.
- `graphify-out/` is gitignored; treat this document as the record.

## Recommended next best steps, in order

1. **Merge order is nearly free: the PRs are file-disjoint except `main.css`.** Only #11 and #12 both append to the end of `agent-desktop/src/renderer/src/assets/main.css` (different rules, non-overlapping hunks) — at worst a trivial conflict. #14 is stacked on #11 by branch topology (retarget to `main` once #11 merges); #13 is entirely disjoint. `setupIPC()` appears in #11 only; #12 does not touch `src/main/index.ts`. Suggested order: #12 → #11 → #14 (retargeted) → #13.
2. **Before merging #11/#12, get the OfficeCLI path-containment change adversarially reviewed by a second reader.** It is the only change in the batch that is security-relevant and not covered by an integration test.
3. **After #11 merges: retarget #14 to `main`** (it is stacked on #11).
4. **Only after both are on main:** enable the recorded L1 loop run cadence. Do not enable L2/L3; the loop has exactly one recorded report-only run and the budget file is empty.
5. **Do not attempt to extract/LLM-summarise the graph** until `.graphifyignore` has been vetted by a second person; the AST graph is safe (code only), but a semantic pass would ship source to an LLM backend.
6. **Measure the thing that would justify more work:** `graphify god-nodes` shows `setupIPC` at 344 edges. Splitting that function by domain (everos, officecli, codegraph, everos-sidecar, headroom, …) is the one structural change with evidence behind it. It is its own project — not to be bundled into a review PR.
