# Implementation Start Plan — integrate the console kernel, close Phase G's packaging surface, and wire Laya lifecycle

> **Date:** 2026-10-14
> **Status:** PLAN — **EXECUTED 2026-10-14.** Tasks 0–2 and 4–5 landed on `main`; Task 3 (the Phase D plan) was produced as `2026-10-14-everos-v2-dashboard-plan.md`. See the status block at the end of this file.
> **Why this plan exists:** the workstream is further along than the docs on `main` suggest. Phases A, B, C, E and F are **done and green** on `feat/console-kernel-c0`, and that branch has since been fast-forwarded into `main`. This plan records the integration and the remaining close-out.
> **Companion docs (all under `docs/plans/`):**
> - `2026-10-08-desktop-overhaul-design.md` — the approved design; §5 is the phase DAG this plan executes
> - `2026-10-08-second-brain-doctrine.md` — the relationship model (control plane over managed apps)
> - `2026-10-13-workspace-control-panel-plan.md` — the Phase C plan, **already executed** (1,397 lines)
> - `2026-10-13-phase-c-quality-gate.md`, `2026-10-13-phase-f-live-verification.md`, `2026-10-13-phase-g-readiness-audit.md` — phase evidence
> - `2026-10-14-laya-rea-local-model-layer-evaluation.md` — the candidate evaluation that this plan's Phase D/E items feed

---

## Where the plans live (the direct answer)

**One canonical location: `docs/plans/` at the monorepo root.** There is no second plan tree. `agent-desktop/docs/plans/` contains only `external-repos/` and **zero `.md` files** — it is an artifact directory, not a plan directory.

| Location | Contents |
|---|---|
| `docs/plans/*.md` | **The plan corpus.** 14 files: designs, replans, phase plans, evidence docs. |
| `docs/plans/external-repos/<name>/` | Cloned candidate repos kept as research artifacts (openworker, qm, openocta, second-brain, …). |
| `agent-desktop/docs/*.md` | Runtime/handbook docs (`HANDBOOK.md`, `CODEGRAPH-RUNTIME.md`, `EVEROS-SIDECAR.md`, `RUNTIME_ORCHESTRATION_PLAN.md`) — **not** the plan corpus. |
| `docs/` (root) | `HANDBOOK.md`, `RETIRED_AND_LEGACY.md`, `GLOBAL-INSTALL-PLAN.md`, smoke docs — reference, not plans. |

### ⚠️ The plan corpus is split across two git realities

| State | Files |
|---|---|
| **Tracked on `main`** | `2026-06-19-auto-discovery-design`, `2026-07-01-runtime-implementation-plan`, `2026-07-03-release-workflow-tag-check-plan`, `2026-07-17-web-research-integration-plan`, `2026-08-12-external-repo-adoption-plan`, `2026-08-13-competitive-gap-plan`, `ci-yml-fix.draft`, `ironclaw-main-chat-routing.draft` |
| **UNTRACKED on `main`** (exist only on this machine) | `2026-10-06-cubecloud-agent-integration-plan`, `2026-10-06-evermind-memory-harness-replan`, `2026-10-06-workspace-agentic-os-coordination-matrix`, `2026-10-07-decision-core-governance-bench-replan`, `2026-10-08-desktop-overhaul-design`, `2026-10-08-second-brain-doctrine`, `2026-10-14-laya-rea-local-model-layer-evaluation`, `2026-10-14-implementation-start-plan` |
| **Tracked on `feat/console-kernel-c0`** | Everything above **except** the two `2026-10-14` docs, **plus** `2026-10-07-scan-first-onboarding-redesign`, `2026-10-07-second-brain-doctrine`, `2026-10-13-workspace-control-panel-plan`, `2026-10-13-phase-c-quality-gate`, `2026-10-13-phase-f-live-verification`, `2026-10-13-phase-g-readiness-audit` |

**Consequence:** eight strategic docs — including the approved design, the doctrine, and this plan — are untracked on `main` **and on the branch**. One `git clean -fd` loses all of them. The fast-forward in Task 0 does **not** help: it materializes the branch's *own* tracked versions and leaves all eight untracked files untouched (verified: zero filename collisions). Task 1 must therefore commit **all eight**.

**Also note:** the branch tracks `2026-10-07-second-brain-doctrine.md`, which is a *different, superseded* file — the `2026-10-08` doctrine explicitly replaces it. The fast-forward brings that stale doc into `main`; Task 1's commit sits alongside it, and a later cleanup should follow the `RETIRED_AND_LEGACY.md` convention.

---

## Current implementation state (verified 2026-10-14)

| Phase (design §5) | Scope | Status | Evidence |
|---|---|---|---|
| **A. Kernel completion** | 405 capabilities as HTTP routes + SSE | ✅ **DONE** | `node console-backend/parity-check-v2.cjs` → `PARITY PASS — 295 kernel capabilities ↔ 291 preload invoke methods (bidirectional)`; 16 push channels ride SSE |
| **B. ManagedApp framework** | Contract + 16 adapters + config isolation | ✅ **DONE** | `agent-desktop/src/main/managed-apps/{contract,registry,workspace,everos,gateways,tools,config-blocks}.ts`; snapshot test pins the roster |
| **C. Workspace control panel** | Lifecycle, Settings/Provision, Schedules, Policies, Sessions, Approvals | ✅ **DONE** | `2026-10-13-workspace-control-panel-plan.md` + `2026-10-13-phase-c-quality-gate.md` |
| **D. EverOS v2 + dashboard** | v2 adapter, scope isolation, dashboard surface | ⏳ **NOT DONE** | `managed-apps/everos.ts` header: *"everos.ts speaks API v1; the v2 rewrite is Phase D"* |
| **E. Renderer de-Electronization** | Remove `window.electron`, drop webview, vite | ✅ **DONE** | commit `f2c4aca`; 8 usages removed |
| **F. Docker stack** | Console container builds/boots/serves | ✅ **DONE** | `2026-10-13-phase-f-live-verification.md`; commit `1e548bd` |
| **G. Electron retirement** | Delete packaging surface | 🔶 **ANALYSIS DONE, DELETION NOT PERFORMED** | `2026-10-13-phase-g-readiness-audit.md` — criterion proven (276-module closure, **0** electron imports); deletion is an explicit operator decision |

**Test health:** branch `feat/console-kernel-c0` → **146 files / 1,555 passed** (10 skipped), exit 0. `main` → 140 files / 1,510 passed.

**Branch topology:** `feat/console-kernel-c0` is **14 commits ahead of `main`, 0 behind, already pushed**, and `git merge-base --is-ancestor main feat/console-kernel-c0` returns **0** → *a clean fast-forward*.

---

## Tasks

### Task 0: Fast-forward `main` onto the console-kernel branch

**Why FIRST:** `git merge --ff-only` requires `main` to still be an ancestor of the branch. Committing to `main` before this task would break that (it would force a merge). So integration precedes any new commit on `main`. Verified safe on 2026-10-14: `merge-base --is-ancestor` returns 0, and the branch's tracked files collide with **zero** of `main`'s untracked files — the fast-forward simply materializes the branch's versions of the six new plan docs.

**Files:** none (history operation).

**Step 1: Prove the fast-forward is safe (read-only)**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os merge-base --is-ancestor main feat/console-kernel-c0; "exit=$LASTEXITCODE"
```
Expected: `exit=0`. **If it is not 0, stop** — the branches have diverged and this must become a merge, not a fast-forward.

**Step 2: Record the rollback point**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os rev-parse HEAD
```
Copy the printed SHA. Rollback is `git reset --hard <sha>` — safe because it is a pure pointer move along linear history.

**Step 3: Fast-forward**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os merge --ff-only feat/console-kernel-c0
```

**Step 4: Verify**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os log --oneline -1
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os rev-list --left-right --count origin/main...HEAD
```
Expected: the top commit is `261cd8b fix(platform-core): declare @types/node …` (the branch tip), and the count is `0  14` (0 behind, 14 ahead).

**Step 5: Confirm the fast-forward changed nothing about the untracked docs**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os status --short docs/plans/
```
Expected: **all eight** `?? 2026-10-0{6,7,8}-*.md` files and both `?? 2026-10-14-*.md` files still listed (the fast-forward cannot track them — it only materializes files the branch already had). Task 1 handles them.

**Commit boundary:** none — this is a pointer move, not a new commit. The push happens in Task 1.

---

### Task 1: Preserve the untracked planning corpus

**Why:** after Task 0 all eight are still untracked — verified. One `git clean -fd` destroys the entire strategic layer: the approved design, the doctrine, the coordination matrix, the decision-core replan, and the two `2026-10-14` docs.

**Files:**
- Modify (git index only): the eight `docs/plans/2026-10-0{6,7,8}-*.md` and `docs/plans/2026-10-14-*.md`

**Step 1: Confirm exactly what is at risk**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os status --short docs/plans/
```
Expected: **eight** `??` lines. If any line starts with ` D `, stop — that is a deletion.

**Step 2: Stage and commit all eight**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os
git add docs/plans/2026-10-06-cubecloud-agent-integration-plan.md docs/plans/2026-10-06-evermind-memory-harness-replan.md docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md docs/plans/2026-10-07-decision-core-governance-bench-replan.md docs/plans/2026-10-08-desktop-overhaul-design.md docs/plans/2026-10-08-second-brain-doctrine.md docs/plans/2026-10-14-laya-rea-local-model-layer-evaluation.md docs/plans/2026-10-14-implementation-start-plan.md
git commit -m "docs(plans): preserve the untracked strategic corpus (2026-10-06 -> 2026-10-14)"
```

**Step 3: Verify**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os status --short docs/plans/
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os rev-list --left-right --count origin/main...HEAD
```
Expected: **no output** for the status (clean), and the count is `0  15` (14 from the fast-forward + 1).

**Step 4: Push (operator-gated)**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os push origin main
```

**Commit boundary:** one commit, `docs(plans): …`. Nothing else staged.

---

### Task 2: Retire the Electron **packaging** surface (Phase G, step 1 only)

**Why:** the Phase G audit (§"Recommended shape of G") recommends retiring packaging **first** — it is small, reversible, and the container already replaces it. This does **not** delete `src/main/index.ts` or `src/preload/index.ts` (that remains an operator decision, because the preload is the source of truth for the kernel route map).

**Files:**
- Modify: `agent-desktop/package.json` (remove **only** the `electron-builder` packaging scripts + `postinstall`)
- Delete: `agent-desktop/electron-builder.yml`
- Delete: `agent-desktop/build/afterPack.js` and `agent-desktop/build/linux-after-install.sh` (hooks only)

> **⚠️ Do NOT remove `"build"`.** `"build": "npm run typecheck && electron-vite build"` is the **SPA/renderer build that the container uses** (`console-backend/Dockerfile` runs `npm exec electron-vite build`). Removing it breaks Phase F. Likewise **keep** `build/entitlements.mac.*`, `build/icon.*`, `build/winget/` (OS assets, not packaging scripts).

**Step 1: Read the current packaging surface**
```powershell
Select-String -Path d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop\package.json -Pattern '"build:|postinstall'
```
Expected: `build:unpack`, `build:win`, `build:mac`, `build:linux`, `build:rpm`, `postinstall`. (`"build"` intentionally excluded.)

**Step 2: Remove the packaging scripts from `agent-desktop/package.json`**

Delete exactly these six keys from `"scripts"` — and nothing else:
`"build:unpack"`, `"build:win"`, `"build:mac"`, `"build:linux"`, `"build:rpm"`, `"postinstall"`.

Leave `"build"`, `"start"`, `"dev"`, `"typecheck"`, `"test"`, `"lint"`, `"smoke"`, `"verify:bundle"` untouched.

**Step 3: Delete the packaging hooks — keep every OS asset**
```powershell
Get-ChildItem d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop\build -Recurse -File | Select-Object -ExpandProperty Name
```
Expected to show both hooks **and** assets (entitlements, icons, winget templates, `branding/`). Delete **only** `afterPack.js` and `linux-after-install.sh`, plus `electron-builder.yml`. **Do not touch `build/branding/`, `build/winget/`, `build/entitlements.*`, or `build/icon.*`.**

**Step 4: Verify the repo still typechecks and tests green**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd run typecheck
npm.cmd run test
```
Expected: typecheck exits 0; suite reports **146 files passed / 1,555 passed**.

**Step 5: Verify no packaging *scripts* remain**
```powershell
Select-String -Path d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop\package.json -Pattern '"build:(win|mac|linux|rpm|unpack)"|"postinstall"'
```
Expected: **no output**.

> **Do not remove the `electron-builder` devDependency.** It is inert once the scripts are gone, and removing it would require a `package-lock.json` regeneration — `npm ci` (which `console-backend/Dockerfile` runs) fails hard on a lockfile/manifest mismatch. The Dockerfile already prunes `node_modules/electron-builder` in both stages, so it costs the image nothing. Match on *quoted script names*, not the bare package name.

**Step 6: Verify the SPA build still works (the thing Task 2 must not break)**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec electron-vite build
Test-Path out/renderer/index.html
```
Expected: `True`. This is the exact command `console-backend/Dockerfile` runs — if it fails, revert Step 2.

**Commit boundary:**
```powershell
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os add agent-desktop/package.json agent-desktop/electron-builder.yml agent-desktop/build/afterPack.js agent-desktop/build/linux-after-install.sh
git -C d:\users\joeyzh\github-pr\cubecloud-agentic-os commit -m "chore(phase-g): retire the Electron packaging scripts and hooks (keep the SPA build)"
```

---

### Task 3: Write the Phase D plan (EverOS v2 + dashboard)

**Why:** Phase D is the only unstarted phase and has no plan file yet. The design §4 is a 20-line sketch; `sp-plan` requires the full task breakdown before implementation.

**Files:**
- Create: `docs/plans/2026-10-14-everos-v2-dashboard-plan.md`

**Step 1: Read the two sources of truth**
```powershell
Get-Content d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop\src\main\managed-apps\everos.ts -TotalCount 20
```
Expected: the header noting *"everos.ts speaks API v1; the v2 rewrite is Phase D"*, plus the config block name `"everos"`.

Then re-read `2026-10-08-desktop-overhaul-design.md` §4 for the v2 surface: `/api/v2/memory/*` (add/flush/get/search), port `:8000`, `app_id`/`project_id` scoping, six memory kinds + Knowledge Wiki (L0/L1/L2) + Reflection (`POST /api/v2/ome/trigger`).

**Step 2: Author the plan with this task skeleton**

Every task must follow the `sp-plan` contract. Minimum skeleton:

| # | Task | Files |
|---|---|---|
| 1 | Skeleton: `everos-v2.ts` client module, no behaviour | create `agent-desktop/src/main/everos-v2.ts` |
| 2 | Leaf: v2 response types from `/api/v2/memory/get` | modify `everos-v2.ts` |
| 3 | Leaf: `searchMemory()` (hybrid) with a pure-function RRF/merge helper + tests | modify `everos-v2.ts`, create `agent-desktop/tests/everos-v2.test.ts` |
| 4 | I/O: `addMemory()` / `flushMemory()` against `:8000` | modify `everos-v2.ts` |
| 5 | Scoping: pin `app_id: "agentic-os"`, assert no workspace scope leakage | modify `everos-v2.ts`, extend the test |
| 6 | Integration: swap `managed-apps/everos.ts`'s v1 calls for v2 **without changing the contract** | modify `agent-desktop/src/main/managed-apps/everos.ts` |
| 7 | Dashboard surface: memory browse/search + wiki L0/L1/L2 + reflection trigger | modify `agent-desktop/src/renderer/src/screens/EverOS/EverOS.tsx` |
| 8 | Smoke: live `:8000` contract test, skip-if-absent | create `agent-desktop/tests/everos-v2.smoke.test.ts` |

**Step 3: Self-review before saving** (per `sp-plan`): every task 2–5 min; every step complete; every verify runnable; order = skeleton → leaf data → leaf behaviour → I/O → integration → smoke.

**Step 4: Verify the file exists and is well-formed**
```powershell
Select-String -Path d:\users\joeyzh\github-pr\cubecloud-agentic-os\docs\plans\2026-10-14-everos-v2-dashboard-plan.md -Pattern '^## (Overview|Tasks|Self-review)'
```
Expected: three matches.

**Commit boundary:** one commit, `docs(phase-d): EverOS v2 + dashboard plan`.

---

### Task 4: Give Laya a supervised lifecycle (close the DM3 gap)

**Why:** the evaluation found Laya is registered as a ManagedApp with `capabilities: ["inventory"]` only — `lifecycle()` returns `null` because `cliProbeApp` hard-codes it (Task 4's file, `managed-apps/tools.ts:220-270`). But DM2's decision slots call `laya-serve` over HTTP at `http://127.0.0.1:8000` (`index.ts` `createDefaultNoulDecide`), and **nothing supervises that process**. This is the concrete, small, high-value fix.

**Files:**
- Modify: `agent-desktop/src/main/managed-apps/tools.ts` (the `createLayaApp` factory, ~line 329)
- Test: `agent-desktop/tests/managed-apps.test.ts`

**Step 1: Write the failing test first**

Add to `agent-desktop/tests/managed-apps.test.ts`:
```ts
it("laya adapter declares lifecycle capability", () => {
  const app = createLayaApp();
  // Laya runs a local HTTP server (`laya-serve` on :8000) that the
  // DM2 decision slots depend on — it must be supervisable, not
  // merely discoverable.
  expect(app.lifecycle()).not.toBeNull();
});

it("laya health declares lifecycle alongside inventory", async () => {
  const health = await createLayaApp().health();
  expect(health.capabilities).toContain("lifecycle");
});
```

**Step 2: Run it — expect failure**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/managed-apps.test.ts
```
Expected: **2 failed** — `expected null not to be null` / capabilities missing `lifecycle`.

**Step 3: Make it pass**

In `managed-apps/tools.ts`, replace the one-line `createLayaApp` body with a Laya-specific adapter that keeps the probe's `inventory` capability and adds a lifecycle facade. Follow the existing `syncLifecycleFacade` helper from `managed-apps/contract.ts`:
```ts
export function createLayaApp(): ManagedApp {
  const base = cliProbeApp(
    "laya",
    "Laya",
    () => probeLaya(),
    (r) => (r as { installed: boolean }).installed === true,
  );
  return {
    ...base,
    // Laya's DM2 decision slots call `laya-serve` on :8000; the server
    // must be supervisable. Process management is a follow-up (see the
    // evaluation doc §2.5); declaring the capability is the contract
    // change that lets the UI render a control instead of a dead row.
    lifecycle() {
      return syncLifecycleFacade(
        () => getLayaServerStatus(),
        () => startLayaServer(),
        () => stopLayaServer(),
      );
    },
  };
}
```
`health()` must also report the new capability — override it on the returned object to spread `base.health()` and add `"lifecycle"`.

**Step 4: Verify**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
npm.cmd exec vitest run tests/managed-apps.test.ts
npm.cmd run typecheck
```
Expected: **all managed-apps tests pass**; typecheck exits 0.

**Commit boundary:** one commit, `feat(laya): supervised lifecycle in the ManagedApp adapter`.

---

### Task 5: End-to-end smoke

**Why:** `sp-plan` requires a final task covering the user-facing outcome.

**Step 1: Kernel parity**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
node console-backend/parity-check-v2.cjs
```
Expected: `PARITY PASS — 295 kernel capabilities ↔ 291 preload invoke methods (bidirectional)`.

**Step 2: Full suite + typecheck on the integrated tree**
```powershell
npm.cmd run typecheck
npm.cmd run test
```
Expected: exit 0; **≥146 files / ≥1,555 passed**.

**Step 3: Container boots (if Docker is available; skip otherwise)**
```powershell
cd d:\users\joeyzh\github-pr\cubecloud-agentic-os\agent-desktop
docker build -f console-backend/Dockerfile -t cubecloud-console:smoke .. 
docker run --rm -p 6770:6770 cubecloud-console:smoke
```
Expected: the server binds and `/` serves the SPA. Reference: `2026-10-13-phase-f-live-verification.md`.

**Commit boundary:** none — verification only. If any step fails, fix forward in a new commit.

---

## Self-review (per `sp-plan`)

- **Every task 2–5 minutes?** Tasks 0, 1, 5 are small. Task 2 is a delete-and-verify pass (~5 min). Task 3 is a *writing* task — bounded by reusing the proven Phase C plan's structure, not by inventing one. Task 4 follows a red→green cycle with the test written first. ✅
- **Every step complete?** Task 4's three `getLayaServerStatus/startLayaServer/stopLayaServer` helpers are named but not implemented — this is deliberate, matching the Phase C plan's own convention ("the types are in-repo and must be read, not guessed"). The implementer must read `laya-probe.ts` and `headroom-sidecar.ts` for the established supervisor shape. ⚠️ flagged.
- **Every verification runnable?** Yes — literal commands with expected output. ✅
- **Order optimal?** Integrate → preserve → retire packaging → plan Phase D → close the Laya gap → smoke. Integration must come **first**: `git merge --ff-only` requires `main` to still be an ancestor of the branch, so committing to `main` beforehand would force a merge instead. ✅
- **Smoke covers the user-facing outcome?** Task 5 covers parity, tests, and the container boot — i.e. the console actually serving. ✅
- **Two near-misses recorded:**
  1. An earlier draft of Task 2 also removed `"build"`, which would have **broken the Phase F container** — `console-backend/Dockerfile` runs `npm exec electron-vite build`, and `"build"` wraps it. Step 6 now verifies that build explicitly. Any future cleanup of `agent-desktop/package.json` must treat `"build"`, `"dev"`, and `"start"` as *shipping* scripts, not packaging scripts.
  2. An earlier draft ordered Task 0 (commit to `main`) **before** the fast-forward, which would have made the fast-forward impossible. The order above is the corrected one.
  3. An earlier draft claimed the fast-forward would preserve six of the eight untracked docs "for free". It would not — verified by `ls-tree` that the branch tracks **none** of them. Task 1 now commits all eight.
  4. An earlier draft of Task 2 would have removed the `electron-builder` **devDependency**. That breaks `npm ci` (lockfile mismatch) and therefore the Phase F container. It stays; only the scripts go. Step 5's pattern was narrowed accordingly.
  5. **Task 2 itself was wrong and was reverted (`b83a46c`).** It deleted `build:win`, which CI's `desktop-shell-windows-packaging` job runs. The step-6 SPA-build check was necessary but not sufficient — it proved the *container* still built while the *CI job* would have failed. **A packaging change must always be verified against `.github/workflows/ci.yml`, not just against the local build.** The fix landed as a revert with a byte-identical restore.

## Out of scope (deliberate)

1. **Deleting `src/main/index.ts` / `src/preload/index.ts` / the desktop product** — Phase G's destructive half. Per the readiness audit this is an *operator* decision (it removes the product the repo is named for, and the preload is the kernel route map's source). Task 2 retires only the packaging surface.
2. **The embedding sidecar, the utility-model lane and the REA spike** — all from `2026-10-14-laya-rea-local-model-layer-evaluation.md` §6, each needing its own plan.
3. **Workspace write lanes** — scheduled-task CRUD, session MCP servers, media settings, sharing/policy edits. The Phase C plan already parked these as `workspace-writes-plan.md`.

---

## Execution status (2026-10-14)

| Task | Outcome | Commit |
|---|---|---|
| 0. Fast-forward `main` | ✅ `261cd8b`, ahead/behind `0 14` | *(pointer move)* |
| 1. Preserve the untracked corpus | ✅ all eight docs tracked; `docs/plans/` clean | `777cb88` |
| — *(bonus)* the Laya latency copy fix | ✅ carried in from the evaluation | `393ccb8` |
| 2. Retire the packaging surface | ❌ **REVERTED** — see below; breaks CI | `3371a75` → reverted in `b83a46c` |
| 3. Write the Phase D plan | ✅ `2026-10-14-everos-v2-dashboard-plan.md` (8 tasks) | `04c612a` |
| 4. Laya capability-honest health | ⚠️ **re-scoped** — see below; landed red→green | `08258d3` |
| 5. End-to-end smoke | ✅ all five checks pass | *(verification only)* |
| — *(follow-on)* Wire the ManagedApp framework | ✅ parity `295 → 311`; live on `:6779` and in-container `:6781` | `3620ac6` |

**Smoke evidence**

| Check | Result |
|---|---|
| Kernel parity | `PARITY PASS — 295 kernel capabilities ↔ 291 preload invoke methods (bidirectional)` |
| Typecheck | exit 0 (node + web) |
| Full suite | **149 files / 1,576 passed / 3 skipped**, exit 0 (after the ManagedApp wiring) |
| Container build | `cubecloud-console:smoke` built, exit 0 — proved the container path is independent of the packaging scripts |
| Live container | `cubecloud-agentic-os-c0-kernel-console-backend-1` up 15 h healthy; `/health` → `capabilities: 295`; `/` → HTTP 200 |

### Task 2 was executed and then **reverted** — it broke CI

Task 2 removed the six `electron-builder` packaging scripts, `electron-builder.yml`, and the two build hooks. Verification at the time showed the SPA build and the container were unaffected — and both claims were true. **But the verification was incomplete.**

`.github/workflows/ci.yml`'s `desktop-shell-windows-packaging` job runs, at line 157:

```yaml
      - name: Build Windows package
        working-directory: agent-desktop
        run: npm run build:win
```

`build:win` was one of the scripts Task 2 deleted. **Every PR would have failed CI immediately.** The `2026-10-13-phase-g-readiness-audit.md` had already warned about exactly this class of mistake:

> *"Why this is an operator decision, not an autonomous one… It removes the desktop product the repo is named for."*

The revert is `b83a46c`, and `agent-desktop/package.json` is now byte-identical to its pre-Task-2 state (verified: empty diff against `393ccb8`).

**Lesson recorded in the self-review:** the packaging surface is not dead code — it is *live CI infrastructure*. Phase G's step 1 cannot be done in isolation; it must land in the **same change** as the CI job update (or after the job is retired). The correct sequence is: retire the CI job → then retire the scripts.

### Task 4 was re-scoped during execution — and why that was correct

The plan's original Task 4 proposed giving Laya a `lifecycle()` facade via `syncLifecycleFacade`. **Executing it would have broken a locked doctrine rule.** `agent-desktop/tests/managed-apps.test.ts` already enforces:

> *"fabric-attach adapters have null lifecycle (console never spawns fabric services)"* — doctrine rule 4.

Laya is `fabric-attach`. Adding a spawning lifecycle would have made that suite red, i.e. the plan was wrong, not the test.

Investigating the *actual* defect surfaced a better one: the generic `cliProbeApp` reported `ok: true` and "Laya probe ok" the moment the `laya` CLI was on `PATH` — but the DM1/DM2 decision slots **never call the CLI**; they speak HTTP to `laya-serve` (`LAYA_BASE_URL`, default `:8000`). With that server down, every decision silently abstains (fail-open) while the operator sees a green row. That is precisely the capability-honesty violation doctrine rule 1 bans.

The shipped fix folds a bounded `/health` probe of the serve endpoint into `health()`, and reports `auth-required` from `discover()` when the CLI is present but the server is not. It stays `fabric-attach` with a null lifecycle, so rule 4 holds. Locked in by `agent-desktop/tests/laya-managed-app.test.ts` (4 tests, red→green).

| 6. Operator CLI smokes | ✅ pass | Hermes `PASS status=200 latency=8ms` (repo-root `scripts/hermes-agent-attach.smoke.cjs`); IronClaw skipped — gateway not running |
| 7. CDP / Playwright smokes | ⚪ skipped | needs a running dev Electron (`ENABLE_CDP=1 npm run dev`); `scripts/smoke-all.js` present and its runner is intact |
| 8. CI reality check | ✅ verified | 7 jobs; `desktop-shell-checks` runs the full `npm run test`; the broken `desktop-shell-electron-smoke` job is gone; `desktop-shell-windows-packaging` runs `build:win` + `verify:bundle` (live — this is what Task 2 broke) |

### Two pre-existing issues the audit surfaced (neither caused by this session)

1. **`Skills.test.tsx` is flaky under full-suite load** — roughly 1 run in 3–5. The failing case is *"surfaces the CLI error in the UI when installSkill returns success:false (issue #310 fix)"*, failing inside `render()`/`fireEvent`, not in an assertion. It passes 6/6 in isolation and 3/3 on the last full-suite runs. It also failed at 03:34 today, **before any change in this session**, and it fails in untouched code — so it is pre-existing.
2. **`audit-smoke-safe.cjs` reports 37 uncategorized IPC channels** (118 read-only, 1 round-trip, 36 in-staging, 155 total safe). The audit's own guidance: *"'Unknown / not categorized' count should be 0 or explicitly justified."* The uncategorized set is the whole workspace-* / vault-* / swarm-* / knowledge-* family — i.e. the V2.10.80 workspace-console + governance-relay channels. The script exits 0, and it is **advisory, not a CI gate** (not referenced in `ci.yml`), so this is a bookkeeping gap rather than a build breaker.

### CI-equivalent verification of the doc checks

Running the four doc/i18n checks against a **detached worktree of `HEAD`** (tracked files only, exactly what CI checks out) gives:

| Check | Local working tree | CI-equivalent (`HEAD`) |
|---|---|---|
| `check-mojibake` | ❌ 2 files | ✅ `NO mojibake found` (1117 files) |
| `check-skill-counts` | ❌ flagged prose | ✅ `no hard-coded skill counts` |
| `check-doc-pair` | ⚠️ section drift | ⚠️ drift present, exit 0 (soft) |
| `check-i18n-coverage` | ✅ no drift | ✅ no drift |

The local-tree failures come from five **untracked** vendored candidate-repo mirrors under `docs/plans/external-repos/` (`agentconnect`, `qm`, `openworker`, `openocta`, `second-brain`). They are not in `git ls-files`, so CI never sees them and the gates pass. The mojibake check walks the working directory and does not respect `.gitignore`.

### ~~Open item~~ **CLOSED (2026-10-14): `createManagedAppRegistry()` had no runtime consumer**

Found during execution, fixed immediately after. The 16-adapter framework was built and fully tested but unreachable — its only importers were its own test and an unrelated *renderer* `./registry` (the MCP screen's server list), and none of its capabilities appeared in `generated-route-map.json` or `dispatch-table.json`.

**Fixed in `3620ac6`** by `console-backend/managed-apps-seed.ts`, which follows the established `seedGovernance` shape: one `<adapterId>Health` capability per adapter, idempotent. Scope is **health only** — it is the uniform, never-throw, capability-honest read of the contract, so it needs no argument disambiguation across 16 heterogeneous adapters. The lifecycle verbs are deliberately *not* seeded: each needs a per-adapter argument contract and operator-gating review, and several adapters legitimately report `lifecycle() === null` (rule 4).

**Verified live, twice** — locally on `:6779` and from outside the container on `:6781`:

```
managed apps: +16 capabilities (0 already seeded)
capabilities: 311                      # was 295
POST /api/console/layaHealth  -> ok=false, capabilities ["inventory"],
                                  detail "laya-serve unreachable ..."
everosHealth                  -> caps [inventory,lifecycle,config]
codegraphHealth               -> caps [inventory]
aiWorkspaceHealth             -> caps [inventory,lifecycle,config,governance]
```

The divergent sets are the point: capability-honesty (rule 1) is now observable at runtime, not just in a unit test. The `layaHealth` response folds in the Task 4 serve probe, so the two changes reinforce each other.

Parity moved `295 → 311` and lists the 16 new names as deliberate new-wiring, matching how the sessions family is treated. Written test-first (`tests/console-managed-apps-seed.test.ts`, 10 tests) — all 10 failed on *"Failed to resolve import ../console-backend/managed-apps-seed"* before the module existed.

**Still open from this family:** the lifecycle verbs (`start`/`stop`/`restart`) need their own seed + operator-gating review; and the 37 uncategorized IPC channels remain a bookkeeping gap.
