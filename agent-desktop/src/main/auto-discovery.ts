/**
 * V2.10.67 — Auto-discovery module.
 *
 * Scans localhost for running runtime gateways (Hermes, IronClaw,
 * OpenClaw) by probing known ports in parallel. Uses the existing
 * `diagnoseRemoteConnection()` function — no new probe logic.
 *
 * The scan is intentionally simple:
 *   - Localhost HTTP probes only (no Docker API, no LAN)
 *   - 3-second timeout per port
 *   - All ports probed in parallel
 *   - Results ranked: healthy > auth-required > unreachable
 *
 * Security: the scan never sends credentials. It only probes
 * /health and /api/health endpoints. If a gateway requires auth
 * (401/403), it's reported as "auth-required" so the renderer
 * can prompt for a token.
 */

import { diagnoseRemoteConnection } from "./hermes";
import type { GatewayRuntimePresetId } from "../shared/gateway-runtime-presets";
import {
  DEFAULT_LOCAL_GATEWAY_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
  IRONCLAW_DEFAULT_PORT,
} from "../shared/runtime-defaults";

export interface DiscoveredRuntime {
  url: string;
  runtime: GatewayRuntimePresetId;
  healthy: boolean;
  authRequired: boolean;
  statusCode: number | null;
  latencyMs: number;
}

export interface AutoDiscoveryResult {
  scannedAt: string;
  discovered: DiscoveredRuntime[];
  healthyCount: number;
  authRequiredCount: number;
}

/** Ports to probe for each runtime type. */
const SCAN_TARGETS: Array<{
  runtime: GatewayRuntimePresetId;
  port: number;
  healthPath: string;
}> = [
  // Hermes — multiple known ports (8642 default, 8644 alt, 8789 container)
  { runtime: "hermes", port: DEFAULT_LOCAL_GATEWAY_PORT, healthPath: "/health" },
  { runtime: "hermes", port: 8644, healthPath: "/health" },
  { runtime: "hermes", port: 8789, healthPath: "/health" },
  // IronClaw — gateway port 3231
  { runtime: "ironclaw", port: IRONCLAW_DEFAULT_PORT, healthPath: "/api/health" },
  // OpenClaw — port 18789
  { runtime: "openclaw", port: OPENCLAW_LOCAL_GATEWAY_PORT, healthPath: "/health" },
];

/**
 * Scan localhost for running runtime gateways.
 * Probes all known ports in parallel, returns results sorted
 * by health (healthy first, then auth-required, then unreachable).
 */
export async function scanLocalhostRuntimes(): Promise<AutoDiscoveryResult> {
  const scannedAt = new Date().toISOString();

  const probes = SCAN_TARGETS.map(async (target) => {
    const url = `http://127.0.0.1:${target.port}${target.healthPath}`;
    const startedAt = Date.now();

    try {
      const diagnostic = await diagnoseRemoteConnection(
        url,
        target.runtime,
        undefined, // no token — we're just probing
      );

      const latencyMs = Date.now() - startedAt;

      return {
        url: `http://127.0.0.1:${target.port}`,
        runtime: diagnostic.runtime ?? target.runtime,
        healthy: diagnostic.ok,
        authRequired: diagnostic.code === "auth",
        statusCode: diagnostic.statusCode,
        latencyMs,
      } satisfies DiscoveredRuntime;
    } catch {
      return {
        url: `http://127.0.0.1:${target.port}`,
        runtime: target.runtime,
        healthy: false,
        authRequired: false,
        statusCode: null,
        latencyMs: Date.now() - startedAt,
      } satisfies DiscoveredRuntime;
    }
  });

  const results = await Promise.all(probes);

  // Sort: healthy first (by latency), then auth-required, then unreachable
  const discovered = results.sort((a, b) => {
    if (a.healthy && !b.healthy) return -1;
    if (!a.healthy && b.healthy) return 1;
    if (a.authRequired && !b.authRequired) return -1;
    if (!a.authRequired && b.authRequired) return 1;
    return a.latencyMs - b.latencyMs;
  });

  return {
    scannedAt,
    discovered,
    healthyCount: discovered.filter((d) => d.healthy).length,
    authRequiredCount: discovered.filter((d) => d.authRequired).length,
  };
}