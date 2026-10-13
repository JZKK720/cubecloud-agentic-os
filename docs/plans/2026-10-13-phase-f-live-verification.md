# Phase F — Live Verification (Docker console)

> **Date:** 2026-10-13 · **Commit:** `1e548bd` (fixes) · **Image:** `cubecloud-console-backend:latest`

## What was verified (live, in-container)

| Check | Result |
|---|---|
| Image builds (no-cache) | ✅ `cubecloud-console-backend:latest` |
| Container | ✅ **Up (healthy)** |
| In-container `/health` | ✅ `status=ok caps=295` |
| In-container → host workspace | ✅ `http://host.docker.internal:6767/health` = **HTTP 200** |
| Container bind | ✅ `0.0.0.0:6770` (published port works) |
| Host browser → container | ✅ `http://127.0.0.1:6770/` renders Agent Desktop (295 shim methods) |
| **FirstRunScan in the container** | ✅ **"AI Workspace found" → `http://host.docker.internal:6767` → Connect → "Connected"** |
| **AI Workspace panel (container)** | ✅ **"Reachable — http://host.docker.internal:6767"** |
| Env-aware default URL | ✅ with `CUBECLOUD_AGENT_URL` set → `host.docker.internal`; unset → `127.0.0.1` |
| Locale + legal key | ✅ English bundle (fresh renderer); **"Licensing"** renders (the `common.legal.*` fix) |

## Note: FirstRunScan cold-start miss

The first container load showed **"No AI Workspace found"**; a re-scan found it. Cause: `FirstRunScan` wraps `workspaceProbe` in a **3 s** `SCAN_TIMEOUT_MS`, and the first cold probe through the container→host-gateway hop took longer than that (warm: **1584 ms**, well under). Not a code defect, but a latent UX risk for the container path — worth widening the first-run timeout or pre-warming the probe. Recorded, not fixed (out of Phase F scope).

## Phase F done-criteria (design §5)

> `docker compose up` → :6770 full-surface pass

**Met.** The container serves the full UI, attaches to the live workspace, and the AI Workspace management surface reports it reachable — all from inside the container.
