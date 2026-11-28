// everos adapter — wraps everos-v2.ts (v2 client) + everos-sidecar.ts
// (lifecycle) into the ManagedApp contract.
//
// Writes: NONE (rule 3 — the dashboard reads/edits through EverOS's
// own API; the desktop only mirrors). Config block: "everos".
//
// EverOS speaks API v2 (`/api/v2/memory/*`) as of Phase D. The v1
// client (`../everos.ts`) is retained only for the config block reader
// and the (now unused by the IPC layer) legacy helpers; new code must
// call `../everos-v2` instead.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import {
  loadEverOsConfig,
  saveEverOsConfig,
  type EverOsConfig,
} from "../everos";
import {
  pingEverOsV2,
  getMemoriesV2,
  toEverOsV2Config,
} from "../everos-v2";
import {
  getEverOsSidecarStatus,
  startEverOsSidecar,
  stopEverOsSidecar,
  restartEverOsSidecar,
} from "../everos-sidecar";
import { HERMES_HOME } from "../homer";
import { readAppBlock, writeAppBlock } from "./config-blocks";
import {
  syncLifecycleFacade,
  type ManagedApp,
  type ManagedAppDiscovery,
  type ManagedAppHealth,
  type ManagedAppInventory,
  type ManagedAppLifecycle,
} from "./contract";

export const EVEROS_CONFIG_BLOCK = "everos" as const;

/** Read the current everos config through everos.ts's own loader —
 *  exactly one reader for the block (single-writer preserved). */
export async function loadEverOsAppConfig(): Promise<EverOsConfig> {
  return loadEverOsConfig(HERMES_HOME);
}

/** Shared projection of the desktop's everos block onto the v2 wire
 *  config (see `toEverOsV2Config`). `groupId` carries through as the
 *  project scope so an existing config keeps partitioning the same way. */
const toV2Config = toEverOsV2Config;

export function createEverOsApp(): ManagedApp {
  return {
    id: "everos",
    label: "EverOS",
    mode: "local-spawn",

    async discover(): Promise<ManagedAppDiscovery> {
      const cfg = await loadEverOsConfig(HERMES_HOME);
      const health = await pingEverOsV2(toV2Config(cfg));
      return {
        state: health.reachable ? "found" : "not-found",
        detail: health.reachable
          ? `EverOS reachable at ${cfg.baseUrl}`
          : (health.detail ?? "EverOS backend not reachable"),
        scannedAt: health.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const cfg = await loadEverOsConfig(HERMES_HOME);
      const health = await pingEverOsV2(toV2Config(cfg));
      return {
        ok: health.reachable,
        // Capability-honest (rule 1): v2 client supports inventory +
        // lifecycle + config; governance arrives with the v2 rewrite.
        capabilities: ["inventory", "lifecycle", "config"],
        detail: health.reachable
          ? `status ${health.status ?? "ok"}${health.version ? ` (v${health.version})` : ""}`
          : (health.detail ?? "unreachable"),
        raw: health,
        scannedAt: health.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const cfg = await loadEverOsConfig(HERMES_HOME);
      // Recent episodes for the console's scope. agent_cases/agent_skills
      // belong to the agent owner and are intentionally not mixed in here.
      const recent = await getMemoriesV2(toV2Config(cfg), {
        memoryType: "episode",
        page: 1,
        pageSize: 20,
      });
      return {
        ok: recent.success,
        data: recent.success ? recent.data : null,
        error: recent.success ? null : (recent.error ?? "inventory unavailable"),
      };
    },

    lifecycle() {
      return syncLifecycleFacade(
        () => getEverOsSidecarStatus(),
        () => startEverOsSidecar(),
        () => stopEverOsSidecar(),
      );
    },

    configSchema() {
      return {
        block: EVEROS_CONFIG_BLOCK,
        fields: [
          { key: "baseUrl", label: "EverOS URL", type: "string", current: null },
          { key: "userId", label: "User id", type: "string", current: null },
          { key: "groupId", label: "Group id", type: "string", current: null },
          { key: "apiKey", label: "API key", type: "secret", current: null },
          { key: "enabled", label: "Enabled", type: "boolean", current: null },
        ],
      };
    },

    governance() {
      return null;
    },
  };
}

/** Restart passthrough for the panel's restart button (the facade's
 *  restart is stop+start; the sidecar's own restart bypasses the
 *  crash cap, which is the operator-correct behavior). */
export async function restartEverOsApp(): Promise<ManagedAppLifecycle> {
  const status = restartEverOsSidecar();
  return { ok: true, status, error: status.lastError };
}

/** Config save passthrough — the ONLY write to the everos block, and
 *  it goes through everos.ts's own save (single-writer preserved). */
export async function saveEverOsAppConfig(
  patch: Partial<EverOsConfig>,
): Promise<EverOsConfig> {
  return saveEverOsConfig(HERMES_HOME, patch);
}

// Re-export for the registry snapshot test (block-name consistency).
export { readAppBlock, writeAppBlock };