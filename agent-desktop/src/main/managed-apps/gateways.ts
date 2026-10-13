// gateway runtime adapters (hermes / ironclaw / openclaw / raven) —
// wraps runtime-registry.ts + hermes.ts gateway lifecycle into the
// ManagedApp contract.
//
// Writes: gateway lifecycle in local mode ONLY (rule 3 + rule 4). In
// remote/fabric mode start/stop degrade to read-only status — the
// console never spawns processes for fabric services.
//
// Config block: none of the managed-app blocks — the gateway
// connection config stays in config.ts's existing connection block,
// which is NOT part of MANAGED_APP_CONFIG_BLOCKS (the CI ban asserts
// adapters never write it).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { listRuntimeProviders } from "../runtime-registry";
import {
  startGateway,
  stopGateway,
  restartGateway,
  isGatewayRunning,
  isApiReady,
} from "../hermes";
import {
  syncLifecycleFacade,
  type ManagedApp,
  type ManagedAppDiscovery,
  type ManagedAppHealth,
  type ManagedAppInventory,
  type ManagedAppLifecycle,
} from "./contract";

type RuntimeProviderId = "hermes" | "ironclaw" | "openclaw" | "raven";

/** Which provider id each gateway adapter wraps. */
const GATEWAY_IDS: RuntimeProviderId[] = [
  "hermes",
  "ironclaw",
  "openclaw",
  "raven",
];

export function createGatewayApps(): ManagedApp[] {
  return GATEWAY_IDS.map((id) => createGatewayApp(id));
}

export function createGatewayApp(id: RuntimeProviderId): ManagedApp {
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  return {
    id,
    label,
    // Only Hermes has a local process the console owns (hermes.ts
    // startGateway/stopGateway). IronClaw (Docker handoff), OpenClaw
    // (external WSL CLI) and Raven (external harness) are HTTP-only —
    // the console attaches, it never spawns them (rule 4).
    mode: id === "hermes" ? "local-spawn" : "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const providers = await listRuntimeProviders();
      const snap = providers.find((p) => p.definition.id === id);
      const detected = snap?.detected ?? false;
      return {
        state: detected ? "found" : "not-found",
        detail: snap?.summary ?? `${label} not detected`,
        scannedAt: new Date().toISOString(),
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const providers = await listRuntimeProviders();
      const snap = providers.find((p) => p.definition.id === id);
      const detected = snap?.detected ?? false;
      const capabilities: ManagedAppHealth["capabilities"] = ["inventory"];
      // Only hermes has a local lifecycle the desktop owns.
      if (id === "hermes") capabilities.push("lifecycle");
      return {
        ok: detected,
        capabilities,
        detail: snap?.summary ?? `${label} status unknown`,
        raw: snap ?? null,
        scannedAt: new Date().toISOString(),
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const providers = await listRuntimeProviders();
      const snap = providers.find((p) => p.definition.id === id);
      return {
        ok: snap != null,
        data: snap ?? null,
        error: snap ? null : `${id} not in runtime catalog`,
      };
    },

    lifecycle() {
      if (id !== "hermes") {
        // Rule 4: no local lifecycle for fabric/detached runtimes.
        return null;
      }
      return syncLifecycleFacade(
        () => ({
          running: isGatewayRunning(),
          apiReady: isApiReady(),
        }),
        () => startGateway(),
        () => stopGateway(),
      );
    },

    configSchema() {
      // The gateway connection config is NOT a managed-app block —
      // it stays owned by config.ts (see the CI cross-block ban).
      return null;
    },

    governance() {
      return null;
    },
  };
}

/** Hermes lifecycle passthroughs (restart is hermes.ts's own
 *  crash-cap-aware implementation, not the naive stop+start). */
export async function restartHermesGateway(): Promise<ManagedAppLifecycle> {
  restartGateway();
  return {
    ok: true,
    status: { running: isGatewayRunning(), apiReady: isApiReady() },
    error: null,
  };
}