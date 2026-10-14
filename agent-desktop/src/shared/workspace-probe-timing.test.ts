// Pins the workspace-probe timing contract.
//
// The bug this prevents: the renderer wrapped the probe in a 3_000 ms race
// while the probe's own internal bound was 6_000 ms. The outer budget was
// HALF the inner one, so the client always won the race and the probe's
// graceful { reachable, error } verdict could never be produced — a healthy
// workspace rendered as "not found".
//
// The invariant is what matters: a caller must give the probe strictly more
// time than the probe gives itself, or the probe's own degraded result is
// unreachable by construction.

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  WORKSPACE_MANUAL_PROBE_TIMEOUT_MS,
  WORKSPACE_PROBE_CLIENT_TIMEOUT_MS,
  WORKSPACE_PROBE_INNER_BUDGET_MS,
  WORKSPACE_PROBE_RACE_HEADROOM_MS,
  WORKSPACE_PROBE_REQUEST_TIMEOUT_MS,
} from "./workspace-probe-timing";

describe("workspace probe timing contract", () => {
  it("lets the probe finish before the caller gives up", () => {
    expect(WORKSPACE_PROBE_CLIENT_TIMEOUT_MS).toBeGreaterThan(
      WORKSPACE_PROBE_INNER_BUDGET_MS,
    );
  });

  it("keeps the manual-connect leash at least as long as the scan leash", () => {
    expect(WORKSPACE_MANUAL_PROBE_TIMEOUT_MS).toBeGreaterThanOrEqual(
      WORKSPACE_PROBE_CLIENT_TIMEOUT_MS,
    );
  });

  it("allows enough time for a measured, slow /v1/stack/status", () => {
    // Measured on a live stack: /health ~73ms, /v1/info ~10ms, but
    // /v1/stack/status ~1900ms cold, giving a ~2100-2300ms total probe.
    // The client budget must clear that with real margin.
    const MEASURED_PROBE_MS = 2_300;
    expect(WORKSPACE_PROBE_CLIENT_TIMEOUT_MS).toBeGreaterThan(MEASURED_PROBE_MS);
    expect(
      WORKSPACE_PROBE_CLIENT_TIMEOUT_MS - MEASURED_PROBE_MS,
      "headroom over the measured probe must be meaningful, not marginal",
    ).toBeGreaterThanOrEqual(1_000);
  });

  it("bounds each request so a wedged socket cannot hang the probe", () => {
    expect(WORKSPACE_PROBE_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(4_000);
    expect(WORKSPACE_PROBE_RACE_HEADROOM_MS).toBeGreaterThan(0);
  });

  it("is the single source of truth — the probe must not hard-code its own bound", () => {
    // __dirname is src/shared; the probe lives in src/main.
    const probeSrc = readFileSync(
      join(__dirname, "..", "main", "cubecloud-agent-probe.ts"),
      "utf8",
    );
    // The probe previously exported its own 4_000 magic number and computed
    // +2_000 inline. Both must now come from the shared contract.
    expect(probeSrc).not.toMatch(/PROBE_TIMEOUT_MS\s*=\s*4_000/);
    expect(probeSrc).not.toMatch(/\+\s*2_000/);
    expect(probeSrc).toContain("workspace-probe-timing");
  });

  it("is the single source of truth — the screen must not hard-code its own bound", () => {
    const screenSrc = readFileSync(
      join(__dirname, "..", "renderer", "src", "screens", "FirstRunScan", "FirstRunScan.tsx"),
      "utf8",
    );
    expect(screenSrc).not.toMatch(/SCAN_TIMEOUT_MS\s*=\s*3_000/);
    expect(screenSrc).toContain("WORKSPACE_PROBE_CLIENT_TIMEOUT_MS");
  });
});
