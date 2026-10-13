# Phase D Plan — EverOS v2 client, scope isolation, and the dashboard surface

> **Date:** 2026-10-14
> **Status:** PLAN — ready to execute. Written to the `sp-plan` contract: exact file paths, complete code, runnable verification, 2–5 minute estimates, a commit boundary per task.
> **Why:** Phase D is the last unstarted phase of `2026-10-08-desktop-overhaul-design.md` (§5). Its adapter exists but speaks the retiring v1 API — `agent-desktop/src/main/managed-apps/everos.ts` header: *"everos.ts speaks API v1; the v2 rewrite is Phase D"*.
> **Companion docs:**
> - `2026-10-08-desktop-overhaul-design.md` §4 — the v2 + dashboard design
> - `2026-10-08-second-brain-doctrine.md` — rule 5 (scoped co-location, never fusion), rule 3 (one write channel per app)
> - `2026-10-13-workspace-control-panel-plan.md` — the sibling phase plan whose structure this mirrors
> - `2026-10-14-implementation-start-plan.md` — the task that authorises this plan

---

## Overview

EverOS's OSS build is now **Markdown-first with API v2** (`/api/v2/memory/*`), and it ships **no dashboard and no memory-visibility UI**. The console provides that dashboard — it is the "desktop-provided dashboard" of design §4. This plan writes the v2 client, pins scope isolation (`app_id: "agentic-os"`), swaps the ManagedApp adapter's call sites without changing the contract, and lands the browse/search surface.

### The v1 → v2 gap (verified from source)

| | v1 (today) | v2 (target) |
|---|---|---|
| Base URL | `http://127.0.0.1:1995` (`everos.ts:20`) | `http://127.0.0.1:8000` (design §4) |
| Path | `/api/v1/memories`, `/api/v1/memories/search` (`everos.ts:6-7, 260, 307`) | `/api/v2/memory/{add,flush,get,search}` |
| Health | `/health` (`everos.ts:182`) | `/health` (unchanged) |
| Scoping | none observed | `app_id` / `project_id` partition |
| Dashboard | none | L0/L1/L2 wiki + reflection trigger |

**⚠️ UNKNOWN, must be verified at implementation time:** the exact v2 request/response JSON schemas. This repo contains no EverOS v2 spec. Task 1's first step fetches the live `openapi.json` and pins the shapes in `everos-v2.ts` types. **Do not guess field names** — the same discipline the Phase C plan used for its three "confirm the exact type" notes.

---

## Tasks

### Task 1: Skeleton — `everos-v2.ts` module + pinned types

**Files:**
- Create: `agent-desktop/src/main/everos-v2.ts`
- Create: `agent-desktop/tests/everos-v2.test.ts`

**Step 1: Pin the real v2 contract from the live server**

Start an EverOS v2 instance, then:
```powershell
curl.exe -s http://127.0.0.1:8000/openapi.json | Out-File -Encoding utf8 $env:TEMP\everos-openapi.json
Select-String -Path $env:TEMP\everos-openapi.json -Pattern '"/api/v2' | Select-Object -First 20
```
Expected: the v2 paths. Record the exact **request** and **response** field names for `memory/add`, `memory/get`, `memory/search`. If the server is absent, mark the schemas UNKNOWN in the file header and stop — do not invent them.

**Step 2: Create the module skeleton**

Create `agent-desktop/src/main/everos-v2.ts` with the module header and the config + error shapes. Follow the licensing header convention used across `src/main/`:
```ts
// EverOS v2 client — Phase D of the desktop overhaul
// (`docs/plans/2026-10-08-desktop-overhaul-design.md` §4).
//
// Speaks ONLY the v2 surface (`/api/v2/memory/*`). The v1 client
// (`./everos.ts`) stays until the adapter is swapped in Task 6, so the
// migration is reversible at every step.
//
// Scope isolation (doctrine rule 5, "scoped co-location, never fusion"):
// every call pins `app_id: EVEROS_SCOPE_APP_ID`. The AI Workspace uses its
// own scope; this console never reads or writes the workspace's memories.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

/** The console's EverOS scope. Fixed — never operator-editable, so the
 *  boundary cannot be widened by a settings change. */
export const EVEROS_SCOPE_APP_ID = "agentic-os" as const;

export const EVEROS_V2_DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export interface EverOsV2Config {
  baseUrl: string;
  apiKey: string | null;
  /** Optional narrower partition inside the app scope. */
  projectId: string | null;
  userId: string | null;
}

export interface EverOsV2Health {
  reachable: boolean;
  status: number | null;
  /** Advertised API version, when the server reports one. */
  apiVersion: string | null;
  detail: string | null;
  scannedAt: string;
}
```

**Step 3: Verify it compiles and is imported nowhere yet**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd run typecheck
```
Expected: exit 0.

**Step 4: Commit**
```powershell
git add agent-desktop/src/main/everos-v2.ts
git commit -m "feat(phase-d): everos v2 client skeleton + scope constants"
```

---

### Task 2: Leaf data — v2 response types from `memory/get`

**Files:**
- Modify: `agent-desktop/src/main/everos-v2.ts`

**Step 1: Add the memory record type**

Append to `everos-v2.ts`, using the **field names read in Task 1 Step 1**:
```ts
/** One memory record as `/api/v2/memory/get` returns it. Field names are
 *  pinned from the live openapi.json (Task 1) — do not rename. */
export interface EverOsV2Memory {
  id: string;
  /** Markdown source of truth for this memory. */
  content: string;
  /** v2 memory kind. Six kinds ship; see design §4. */
  kind: string;
  appId: string;
  projectId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface EverOsV2GetResult {
  success: boolean;
  memories: EverOsV2Memory[];
  error: string | null;
}
```

**Step 2: Verify**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd run typecheck
```
Expected: exit 0.

**Step 3: Commit**
```powershell
git add agent-desktop/src/main/everos-v2.ts
git commit -m "feat(phase-d): everos v2 memory + get-result types"
```

---

### Task 3: Leaf behaviour — the scope-pinning request builder (pure)

**Files:**
- Modify: `agent-desktop/src/main/everos-v2.ts`
- Modify: `agent-desktop/tests/everos-v2.test.ts`

**Why a pure function:** it makes the "never widen the scope" invariant testable without a server. This is the security-relevant unit of Phase D.

**Step 1: Write the failing test first**

In `agent-desktop/tests/everos-v2.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  buildScope,
  EVEROS_SCOPE_APP_ID,
} from "../src/main/everos-v2";

describe("everos v2 scope isolation", () => {
  it("always pins the console app scope", () => {
    expect(buildScope({})).toEqual({ app_id: EVEROS_SCOPE_APP_ID });
  });

  it("cannot be widened by a caller-supplied app_id", () => {
    // Doctrine rule 5: the workspace owns its own scope. An operator
    // setting, an adapter bug, or a malformed config must not be able to
    // point this console at the workspace's memories.
    const scope = buildScope({ appId: "ai-workspace" } as never);
    expect(scope.app_id).toBe(EVEROS_SCOPE_APP_ID);
  });

  it("omits project_id when unset but includes it when set", () => {
    expect(buildScope({})).not.toHaveProperty("project_id");
    expect(buildScope({ projectId: "p1" })).toEqual({
      app_id: EVEROS_SCOPE_APP_ID,
      project_id: "p1",
    });
  });
});
```

**Step 2: Run it — expect failure**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/everos-v2.test.ts
```
Expected: fail — `buildScope is not exported`.

**Step 3: Implement**
```ts
/** Build the v2 scope object. `app_id` is ALWAYS the console's fixed
 *  scope — a caller-supplied value is ignored, not merged. */
export function buildScope(opts: {
  projectId?: string | null;
  userId?: string | null;
}): Record<string, string> {
  const scope: Record<string, string> = { app_id: EVEROS_SCOPE_APP_ID };
  if (opts.projectId) scope.project_id = opts.projectId;
  if (opts.userId) scope.user_id = opts.userId;
  return scope;
}
```

**Step 4: Verify**
```powershell
npm.cmd exec vitest run tests/everos-v2.test.ts
npm.cmd run typecheck
```
Expected: **3 passed**; typecheck exit 0.

**Step 5: Commit**
```powershell
git add agent-desktop/src/main/everos-v2.ts agent-desktop/tests/everos-v2.test.ts
git commit -m "feat(phase-d): scope-pinning request builder with isolation tests"
```

---

### Task 4: I/O — `getMemories` / `addMemory` / `flush`

**Files:**
- Modify: `agent-desktop/src/main/everos-v2.ts`
- Modify: `agent-desktop/tests/everos-v2.test.ts`

**Step 1: Implement the I/O against a test server**

Add `pingEverOsV2`, `getMemoriesV2`, `addMemoryV2`, `flushV2`. Follow the conventions already in `everos.ts`: a bounded `AbortController` timeout, optional bearer from `apiKey`, and **never throw** — return a `{ success, ... , error }` shape. Every request body spreads `buildScope(...)`.

**Step 2: Extend the test with a local http server**

Mirror the pattern in `agent-desktop/tests/model-discovery.test.ts` (it already stands up `http.createServer` on `127.0.0.1:0` and asserts on requests). Assert:
- the path is `/api/v2/memory/...`
- the body's `app_id` is `"agentic-os"` even when the caller passes a different one
- a 500 response yields `success: false` with an `error`, not a throw

**Step 3: Verify**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/everos-v2.test.ts
npm.cmd run typecheck
```
Expected: all tests pass; typecheck exit 0.

**Step 4: Commit**
```powershell
git add agent-desktop/src/main/everos-v2.ts agent-desktop/tests/everos-v2.test.ts
git commit -m "feat(phase-d): everos v2 http client (get/add/flush) with never-throw shapes"
```

---

### Task 5: Integration — swap the adapter, contract unchanged

**Files:**
- Modify: `agent-desktop/src/main/managed-apps/everos.ts`

**Step 1: Repoint the adapter's call sites**

In `managed-apps/everos.ts`, replace the `../everos` imports (`pingEverOs`, `listRecentEverOsMemory`) with the v2 equivalents. **Do not change `createEverOsApp`'s contract** — same `id`, `label`, `mode`, same `capabilities` array, same `configSchema` block name (`EVEROS_CONFIG_BLOCK`). Config loading stays on `loadEverOsConfig` (single-writer, rule 3).

Update the adapter's header comment: remove *"NOTE (design §4): everos.ts speaks API v1; the v2 rewrite is Phase D"* and state that v2 is live.

**Step 2: Verify the contract is untouched**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/managed-apps.test.ts
```
Expected: all pass — including the roster snapshot test, which pins `"everos"` and would fail on an accidental `id` change.

**Step 3: Verify nothing else regressed**
```powershell
npm.cmd run typecheck
npm.cmd exec vitest run tests/everos-v2.test.ts tests/managed-apps.test.ts
```
Expected: exit 0; all pass.

**Step 4: Commit**
```powershell
git add agent-desktop/src/main/managed-apps/everos.ts
git commit -m "feat(phase-d): swap the everos adapter to the v2 client (contract unchanged)"
```

---

### Task 6: Dashboard — memory browse/search panel

**Files:**
- Modify: `agent-desktop/src/renderer/src/screens/EverOS/EverOS.tsx`
- Modify: the `everos` i18n namespace (add keys; **all locales**, per the repo's i18n rule)

**Step 1: Read the existing surface**
```powershell
Get-Content d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop\src\renderer\src\screens\EverOS\EverOS.tsx -TotalCount 60
```
Expected: the current v1-backed surface. Reuse its components, states, and CSS vocabulary — **do not introduce new patterns**.

**Step 2: Add the browse + search affordances**

Render: a search box (hybrid query), a results list grouped by memory kind, a detail view showing the `content` markdown, and a **read-only** scope badge naming `agentic-os`. **No edit controls** — rule 3: the desktop's only everos writes go through the adapter's config block, and memory content is owned by EverOS.

**Step 3: Apply the locked UI verification stack**

Design §7 requires, for any UI phase: `frontend-ui-engineering` as the baseline, `impeccable-operate` for the control-surface rules, and a mandatory **`impeccable-craft-floor`** pre-ship gate plus an **`impeccable-audit`** pass. Record the result in the commit message.

**Step 4: Verify**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd run typecheck
npm.cmd exec vitest run src/renderer/src/screens/EverOS
```
Expected: exit 0; the screen test passes.

**Step 5: Commit**
```powershell
git add agent-desktop/src/renderer/src/screens/EverOS agent-desktop/src/shared/i18n
git commit -m "feat(phase-d): everos memory dashboard (browse + hybrid search, read-only scope badge)"
```

---

### Task 7: Smoke — live v2 contract

**Files:**
- Create: `agent-desktop/tests/everos-v2.smoke.test.ts`

**Step 1: Write a skip-if-absent live test**

Probe `http://127.0.0.1:8000/health`; if unreachable, `it.skip`. If reachable, round-trip: add a uniquely-marked memory → search it → assert the returned `app_id` is `"agentic-os"` and the marker is present. Mirror the skip convention in `agent-desktop/tests/hermes-agent-attach.smoke.test.ts`.

**Step 2: Verify**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/everos-v2.smoke.test.ts
```
Expected: passes when EverOS is running at `:8000`; skips cleanly when it is not (never red).

**Step 3: Commit**
```powershell
git add agent-desktop/tests/everos-v2.smoke.test.ts
git commit -m "test(phase-d): live everos v2 round-trip smoke (skip-if-absent)"
```

---

### Task 8: Phase close-out — evidence doc + legacy decision

**Files:**
- Create: `docs/plans/2026-10-14-phase-d-evidence.md`
- Modify: `docs/plans/2026-10-14-implementation-start-plan.md` (mark Phase D done)

**Step 1: Write the evidence doc**

Record: the openapi shapes pinned, the scope-isolation test results, the contract-unchanged proof (`managed-apps.test.ts` green), and the craft-floor/audit outcomes. Follow the shape of `2026-10-13-phase-f-live-verification.md`.

**Step 2: Decide the v1 client's fate — explicitly**

`everos.ts`'s v1 code is now dead **only if** no other module imports it. Check:
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
Select-String -Path "src\**\*.ts","src\**\*.tsx" -Pattern 'from "\.\./everos"|from "\./everos"' | Select-Object -ExpandProperty Path -Unique
```
If the only remaining importers are `everos-sidecar.ts` (lifecycle) and the config loader, keep the file and mark the v1 HTTP functions `@deprecated` pointing at `everos-v2.ts`. **Do not delete it in this phase** — per the repo's convention, removal follows the `RETIRED_AND_LEGACY.md` process in a later release.

**Step 3: Verify the whole suite**
```powershell
npm.cmd run typecheck
npm.cmd run test
```
Expected: exit 0; **147 files / 1,562 passed**.

**Step 4: Commit**
```powershell
git add docs/plans/2026-10-14-phase-d-evidence.md docs/plans/2026-10-14-implementation-start-plan.md
git commit -m "docs(phase-d): evidence + phase close-out"
```

---

## Self-review (per `sp-plan`)

- **Every task 2–5 minutes?** Tasks 1, 2, 3, 7, 8 are small. Tasks 4–6 are one module/surface each with its own test — the same size the Phase C plan shipped as individual commits. ✅
- **Every step complete?** Task 1 Step 1 is deliberately a *discovery* step, because the v2 schemas are UNKNOWN in this repo. Everything else names exact files and code. ⚠️ flagged, with an explicit "stop, do not invent" instruction.
- **Every verification runnable?** Yes — literal commands with expected output. ✅
- **Order optimal?** Skeleton → types → pure behaviour → I/O → integration → surface → smoke → close-out. The pure scope builder (Task 3) lands before any I/O (Task 4), so the security invariant is proven before it is depended on. ✅
- **Does the smoke cover the user-facing outcome?** Task 7 round-trips a real memory through the real server and asserts scope isolation on the returned record. ✅

## Risks

1. **v2 schema drift.** If EverOS's v2 shapes differ from design §4's sketch, Tasks 2/4 change shape — but not the plan's structure. This is why Task 1 exists.
2. **Port conflict.** v2 moves from `:1995` to `:8000`, which the AI Workspace also defaults to. `configSchema()`'s `baseUrl` field is the operator's escape hatch; Task 6's scope badge makes the target visible.
3. **Never-throw discipline.** Every v2 call must degrade to `{ success: false, error }`. A throw here would surface as a dead panel — the exact "degraded-shim crash class" doctrine rule 2 bans at the architecture level.

## Out of scope

- EverOS **writes** beyond `memory/add` + `flush` (wiki edits, reflection-trigger scheduling).
- Deleting the v1 client (Task 8 Step 2 defers it to the retirement process).
- The `2026-10-14-laya-rea-local-model-layer-evaluation.md` §6 recommendations (embedding sidecar, utility-model lane, REA spike) — each needs its own plan.
