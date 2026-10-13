// console-backend — ManagedApp kernel seed.
//
// Phase B built the 16-adapter ManagedApp framework
// (`src/main/managed-apps/`), but nothing at runtime consumed it: the only
// importers were its own test and an unrelated renderer `./registry` (the
// MCP screen's server list). None of its capabilities reached
// `generated-route-map.json` or `dispatch-table.json`, so the framework was
// built, tested, and unreachable.
//
// This module is that consumer. It follows the established seed shape
// (`seedGovernance`): register one capability per adapter, skip anything
// already present so a second boot is a no-op.
//
// Scope: HEALTH only. `health()` is the uniform, never-throw, capability-
// honest read of the contract (doctrine rules 1 and 2), so it needs no
// argument disambiguation across 16 heterogeneous adapters. The lifecycle
// verbs (start/stop/restart) are deliberately NOT seeded here — each needs
// a per-adapter argument contract and its own operator-gating review, and
// several adapters legitimately report `lifecycle() === null` (rule 4).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { createManagedAppRegistry } from "../src/main/managed-apps/registry.ts";
import type { ConsoleRouteRegistry } from "./registry.ts";

export interface ManagedAppSeedSummary {
  /** Capabilities newly registered by this pass. */
  registered: number;
  /** Adapters whose capability was already present (idempotency). */
  skipped: number;
}

/** The kernel's channel→name convention, shared with the parity checker
 *  (`console-backend/parity-check-v2.cjs`): `-x` becomes `X`. */
function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Register one `<adapterId>Health` capability per managed app.
 *
 *  Idempotent: an adapter whose capability is already registered is
 *  skipped, so a repeated boot (or a test that seeds twice) does not hit
 *  the registry's duplicate-name error. */
export function seedManagedApps(registry: ConsoleRouteRegistry): ManagedAppSeedSummary {
  let registered = 0;
  let skipped = 0;

  for (const app of createManagedAppRegistry()) {
    const name = `${camel(app.id)}Health`;
    if (registry.get(name)) {
      skipped += 1;
      continue;
    }
    registry.register({
      name,
      ipcChannel: `managed-app-${app.id}-health`,
      // The contract guarantees health() never throws and always returns
      // a stable shape, so no try/catch is needed here.
      handler: async () => app.health(),
    });
    registered += 1;
  }

  return { registered, skipped };
}
