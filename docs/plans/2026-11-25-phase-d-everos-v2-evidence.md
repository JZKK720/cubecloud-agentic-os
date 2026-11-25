# Phase D — EverOS v2 + dashboard: evidence

> **Date:** 2026-11-25 · **Branch:** `feat/everos-v2-client` · **PR:** #11
> **Status:** implemented and verified locally; not merged.

## What landed

| Item | Result |
|---|---|
| `src/main/everos-v2.ts` (new) | v2 client: `/api/v2/memory/{add,flush,get,search}` + `/health`; envelope `{request_id, data\|error}`; never throws; scope pinned to `app_id: "agentic-os"` |
| IPC (`src/main/index.ts`) | `everos-ping` / `-add-memory` / `-search` / `-list-recent` now call v2; results projected back into the legacy renderer shape |
| Managed-app adapter (`managed-apps/everos.ts`) | uses v2; contract unchanged (id `everos`, block `everos`, capabilities inventory/lifecycle/config) |
| Screen (`screens/EverOS/EverOS.tsx`) | read-only scope badge; API comment updated to v2 |
| Sidecar default port | 1995 → 8000 (EverOS 1.8.0 default) |
| Tests | `tests/everos-v2.test.ts` (14), `tests/everos-v2.smoke.test.ts` (skip-if-absent), sidecar port expectations updated |

## Contract verified against a live server (EverOS 1.8.0, 2026-11-25)

- `POST /api/v2/memory/add` → 200 `{status:"accumulated"|"extracted"}` or 202 queued; `defer_extraction:true` accepted.
- `POST /api/v2/memory/get` → 200 with `episodes[]/profiles[]/agent_cases[]/agent_skills[]`, `total_count`, `count`.
- Ownership is `user_id` XOR `agent_id`; mismatched `memory_type` for the owner kind → `422 INVALID_INPUT` (verified: `agent_skill` with `user_id` rejected).
- Missing owner on `search`/`get` → `422`.
- Search requires a reachable embedding backend; with placeholder LLM creds the server returns `503 EXTERNAL_SERVICE_UNAVAILABLE`. The smoke test treats that specific failure as expected rather than a pass.

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | pass (node + web) |
| Full suite | **179 files / 1899 passed / 3 skipped** |
| `tests/everos-v2.smoke.test.ts` vs live `EVEROS_SMOKE_URL=http://127.0.0.1:8011` | add→get round-trip OK, scope pinned; search returned 503 (no embedding backend) and was accepted as expected |
| CI on PR #11 | all 8 checks green (desktop-shell-checks, windows-packaging, container smoke, dev-boot, i18n, mojibake, skill counts, doc-pair) |
| `scripts/check-i18n-coverage.cjs` | no drift |

## Scope isolation proof

`buildScope()` sets `app_id: "agentic-os"` unconditionally and drops a caller-supplied `appId`. Supplying both `userId` and `agentId` emits neither owner key, so the server rejects the call (`422`) rather than silently choosing one. `ownerForMemoryType` routes `episode`/`profile` → user owner and `agent_case`/`agent_skill` → agent owner.

## Not done / explicit non-goals

- The v1 client (`everos.ts`) is retained for the config block and as a rollback path; it is no longer on the IPC hot path. Removal is a separate cleanup.
- `zh-TW` locale still contains some pre-existing simplified/traditional drift unrelated to this phase.
- Search quality against a real embedding backend has **not** been validated — only the wire contract.
- No installer built for this branch; `desktop-shell-windows-packaging` CI is the only packaging signal.

## Merge state

PR #11 is open and green; **not merged**. See PR for review.
