// Workspace-probe timing contract — the ONE place the probe's inner network
// budget and the renderer's outer wait budget are defined together.
//
// Why this file exists: the two were previously independent and had drifted
// into an impossible combination. The renderer wrapped the probe in a
// 3_000 ms race (`FirstRunScan.tsx`), while the probe's own internal bound was
// `CUBECLOUD_AGENT_PROBE_TIMEOUT_MS + 2_000` = 6_000 ms. Because the outer
// budget was HALF the inner one, the client always won the race and the
// probe's graceful "unreachable" result could never be produced.
//
// Measured impact on a live stack: the full probe path is ~2.1-2.3 s, because
// `/v1/stack/status` (one of the two optional "desktop extras") takes ~1.9 s
// on its own. Against a 3_000 ms client budget that left ~700 ms of headroom;
// any jitter made the client time out and the workspace render as "not found"
// even though it was healthy and answering. The probe's own result shape
// (reachable + error) was never seen.
//
// Invariant: OUTER >= INNER + PROBE_EXTRA_HEADROOM_MS, so the probe always
// reports before the renderer gives up. Pinned by a test.

/** Timeout for each individual probe request (`/health`, `/v1/info`,
 *  `/v1/stack/status`). */
export const WORKSPACE_PROBE_REQUEST_TIMEOUT_MS = 2_000;

/** Grace on top of the per-request timeout. The probe runs `/health` first
 *  and only then the two optional extras, so its worst case is one request
 *  budget plus this. Bounds a server that accepts HTTP but never answers. */
export const WORKSPACE_PROBE_RACE_HEADROOM_MS = 1_000;

/** The probe's own worst-case runtime. */
export const WORKSPACE_PROBE_INNER_BUDGET_MS =
  WORKSPACE_PROBE_REQUEST_TIMEOUT_MS + WORKSPACE_PROBE_RACE_HEADROOM_MS;

/** How long a caller may wait before concluding the probe is wedged. Strictly
 *  greater than the probe's own budget so the probe's graceful degradation
 *  always lands first — a caller never sees a bare "timeout" instead of the
 *  probe's `{ reachable, error }` verdict. */
export const WORKSPACE_PROBE_CLIENT_TIMEOUT_MS =
  WORKSPACE_PROBE_INNER_BUDGET_MS + 1_000;

/** A manual "connect to this URL" attempt probes a user-supplied origin that
 *  may not exist at all, so it gets a longer leash than the background scan. */
export const WORKSPACE_MANUAL_PROBE_TIMEOUT_MS =
  WORKSPACE_PROBE_CLIENT_TIMEOUT_MS + 2_000;
