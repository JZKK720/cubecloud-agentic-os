// kitesurf adapter — a disposable CDP browser backend the operator runs.
//
// Upstream ships a container image and no account requirement:
//
//   docker run --rm -p 127.0.0.1:8787:8787 ghcr.io/cloudflare/kitesurf
//
// MODE: `fabric-attach`. The desktop does not spawn or supervise the
// container; it discovers a running endpoint and reports what it finds.
// `lifecycle()` is therefore null, per the contract's capability-honest rule.
//
// WHY THIS IS OPT-IN AND NOT A DEFAULT: a CDP endpoint accepts commands that
// execute page JavaScript, and upstream states Kitesurf is "not a hardened
// sandbox". The isolation is ours to provide and we do not provide it yet, so
// the card must say so where the operator enables it rather than quietly
// offering a browser with no boundary.
//
// THE DISTINCTION THAT MATTERS: `browser-harness.ts` — the existing
// browser surface — discovers a *CLI* on PATH and runs `--doctor`. It is a
// 2.6 KB detector, not an engine. Kitesurf is the engine. They are not
// duplicates, which is why this adapter exists at all.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import {
  KITESURF_DEFAULT_CDP_URL,
  probeKitesurf,
  type KitesurfProbeResult,
} from "../kitesurf-probe";
import { KITESURF_CANDIDATE_URLS } from "../kitesurf-probe";
import { readAppBlock, type ManagedAppConfigBlock } from "./config-blocks";
import type {
  ManagedApp,
  ManagedAppDiscovery,
  ManagedAppHealth,
  ManagedAppInventory,
  ManagedAppConfigSchema,
} from "./contract";

/** The config block this adapter owns. Must be listed in
 *  `MANAGED_APP_CONFIG_BLOCKS`, whose tuple is the whitelist `readAppBlock`
 *  accepts. */
export const KITESURF_CONFIG_BLOCK = "kitesurf" as const satisfies ManagedAppConfigBlock;

/** One line the operator must see before enabling a browser backend. */
export const KITESURF_SANDBOX_WARNING =
  "Not a hardened sandbox: a CDP target executes page JavaScript. Run it locally and treat it as trusted.";

interface KitesurfAppConfig {
  baseUrl?: string;
}

/** Read the adapter's config block; defaults to the upstream published port. */
export function loadKitesurfConfig(): { baseUrl: string } {
  const stored = readAppBlock<KitesurfAppConfig>(KITESURF_CONFIG_BLOCK);
  const baseUrl = stored?.baseUrl?.trim();
  return {
    baseUrl:
      baseUrl && baseUrl.length > 0 ? baseUrl : KITESURF_DEFAULT_CDP_URL,
  };
}

function probe(baseUrl: string): Promise<KitesurfProbeResult> {
  return probeKitesurf(baseUrl);
}

/** Probe the configured endpoint, then the container host-gateway alias.
 *
 *  WHY: the same adapter runs in two places. The desktop app on the host
 *  reaches a published port at 127.0.0.1; the kernel in a container reaches it
 *  at host.docker.internal. Measured: from inside the kernel container,
 *  127.0.0.1:8787 is refused while host.docker.internal:8787 succeeds against a
 *  Kitesurf published with `-p 127.0.0.1:8787:8787`.
 *
 *  Only reachable results short-circuit. When every candidate fails, the FIRST
 *  result is returned, so the operator sees the endpoint they configured rather
 *  than an alias they never typed. */
async function probeWithCandidates(
  configured: string,
): Promise<KitesurfProbeResult> {
  const candidates = [
    configured,
    ...KITESURF_CANDIDATE_URLS.filter((u) => u !== configured),
  ];
  let first: KitesurfProbeResult | null = null;
  for (const url of candidates) {
    const result = await probe(url);
    first ??= result;
    if (result.reachable) return result;
  }
  return first!;
}

export function createKitesurfApp(): ManagedApp {
  return {
    id: "kitesurf",
    label: "Kitesurf",
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const { baseUrl } = loadKitesurfConfig();
      const result = await probeWithCandidates(baseUrl);
      return {
        state: result.reachable ? "found" : "not-found",
        // The warning rides the found state only: telling an operator that a
        // browser they have not started is dangerous is noise.
        detail: result.reachable
          ? `${result.detail} — ${KITESURF_SANDBOX_WARNING}`
          : (result.error ?? `no Kitesurf CDP endpoint at ${baseUrl}`),
        scannedAt: result.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const { baseUrl } = loadKitesurfConfig();
      const result = await probeWithCandidates(baseUrl);
      return {
        ok: result.reachable,
        // Capability-honest: the desktop can report that a CDP target exists
        // and what it claims to be. It cannot drive the browser yet, and it
        // does not manage the container.
        capabilities: ["config"],
        detail: result.reachable
          ? `${result.detail} — ${KITESURF_SANDBOX_WARNING}`
          : (result.error ?? result.detail ?? "unreachable"),
        raw: result,
        scannedAt: result.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      // No inventory: a disposable browser backend owns no durable state worth
      // mirroring. Returning "unsupported" is the contract's own vocabulary.
      return { ok: false, data: null, error: "unsupported" };
    },

    lifecycle() {
      // fabric-attach: the container is the operator's to run.
      return null;
    },

    configSchema(): ManagedAppConfigSchema {
      const { baseUrl } = loadKitesurfConfig();
      return {
        block: KITESURF_CONFIG_BLOCK,
        fields: [
          {
            key: "baseUrl",
            label: "CDP endpoint",
            type: "string",
            current: baseUrl,
          },
        ],
      };
    },

    governance() {
      return null;
    },
  };
}
