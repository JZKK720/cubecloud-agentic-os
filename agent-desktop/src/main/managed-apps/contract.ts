// ManagedApp contract — Phase B of the desktop overhaul
// (`docs/plans/2026-10-08-desktop-overhaul-design.md` §2).
//
// Every external app the desktop touches implements ONE interface.
// Existing probe/sidecar modules are wrapped, not rewritten: the
// adapter translates their stable result shapes into the contract.
//
// Contract rules (locked, design §2.1):
//   1. Capability-honest — an adapter declares what it supports; the
//      UI renders only declared capabilities. The degraded-shim bug
//      class (`models is not iterable`, the getLocale crash) dies at
//      the architecture level.
//   2. Config isolation — each adapter owns its own config block
//      (`desktop.json` → `workspace: {...}`, `everos: {...}`). The B1
//      bug class (workspace attach writing the gateway connection
//      config) becomes unrepresentable; a CI test bans cross-block
//      writes (see tests/managed-apps.test.ts).
//   3. One write channel per app, operator-gated. Workspace: bundle
//      promotion + provision-env + approval verdicts. EverOS: none
//      (dashboard reads/edits through EverOS's own API). Everything
//      else read-only.
//   4. Mode-aware lifecycle — every lifecycle adapter carries
//      `mode: "local-spawn" | "fabric-attach"`. In fabric mode,
//      start/stop map to the compose service (or read-only status);
//      the console container never spawns processes for fabric
//      services.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

/** How the desktop reaches this app. */
export type ManagedAppMode = "local-spawn" | "fabric-attach";

/** Discovery outcome — never throws, always a stable shape. */
export interface ManagedAppDiscovery {
  /** found = reachable/installed; not-found = absent; auth-required =
   *  reachable but the operator must supply credentials. */
  state: "found" | "not-found" | "auth-required";
  /** Human-readable one-liner for the card subtitle. */
  detail: string;
  scannedAt: string;
}

/** Capability-honest health. `capabilities` lists what the adapter
 *  actually supports — the UI renders only these. */
export interface ManagedAppHealth {
  ok: boolean;
  /** Declared capabilities, e.g. ["inventory", "lifecycle"]. */
  capabilities: ManagedAppCapability[];
  /** Human-readable status line (e.g. "HTTP 200 from /health"). */
  detail: string;
  /** Raw adapter-specific payload for the expandable panel. */
  raw: unknown;
  scannedAt: string;
}

/** The capability names the contract knows. Adapters declare a
 *  subset; anything not declared must not be rendered. */
export type ManagedAppCapability =
  | "inventory"
  | "lifecycle"
  | "config"
  | "governance";

/** Read-only mirror of the app's state (sessions, catalogs, stacks). */
export interface ManagedAppInventory {
  ok: boolean;
  /** Adapter-specific mirror payload (already JSON-encodable). */
  data: unknown;
  error: string | null;
}

/** Lifecycle verbs. Adapters that don't support one return
 *  `{ ok: false, error: "unsupported" }` instead of throwing. */
export interface ManagedAppLifecycle {
  ok: boolean;
  /** Post-action status snapshot (adapter-specific shape). */
  status: unknown;
  error: string | null;
}

/** What the desktop may configure, and how. */
export interface ManagedAppConfigSchema {
  /** The `desktop.json` block this adapter owns (rule 2). */
  block: string;
  /** Field descriptors for the settings form. */
  fields: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "boolean" | "secret";
    /** Present when the current value is set (secrets render masked). */
    current: string | number | boolean | null;
  }>;
}

/** Governance hooks (approvals, policies, audit). Null when the app
 *  has none. */
export interface ManagedAppGovernance {
  /** Pending operator-gated items (e.g. elicitation approvals). */
  pending: Array<{ id: string; kind: string; summary: string }>;
  /** Resolve a pending item. The ONLY write path for governance. */
  resolve: (id: string, verdict: "accept" | "decline" | "cancel") => Promise<{ ok: boolean; error: string | null }>;
}

/** The ONE interface every external app implements. */
export interface ManagedApp {
  id: string;
  /** Display name for the managed-apps registry. */
  label: string;
  mode: ManagedAppMode;
  discover(): Promise<ManagedAppDiscovery>;
  health(): Promise<ManagedAppHealth>;
  /** Read-only mirror. Adapters without inventory return
   *  `{ ok: false, error: "unsupported" }`. */
  inventory(): Promise<ManagedAppInventory>;
  /** Lifecycle or null when unsupported (rule 4). */
  lifecycle(): {
    status: () => Promise<unknown>;
    start: () => Promise<ManagedAppLifecycle>;
    stop: () => Promise<ManagedAppLifecycle>;
    restart: () => Promise<ManagedAppLifecycle>;
  } | null;
  /** Config schema or null when the desktop may not configure it. */
  configSchema(): ManagedAppConfigSchema | null;
  /** Governance hooks or null when the app has none. */
  governance(): ManagedAppGovernance | null;
}

/** Stable "unsupported" inventory result for adapters without one. */
export const UNSUPPORTED_INVENTORY: ManagedAppInventory = {
  ok: false,
  data: null,
  error: "unsupported",
};

/** Helper: build a lifecycle facade over sync status/start/stop
 *  functions (the sidecar family's shape). Restart = stop + start
 *  (crash-cap bypass is the wrapped module's own concern).
 *
 *  Returns the lifecycle OBJECT (the shape `ManagedApp.lifecycle()`
 *  itself returns), so adapters can `return syncLifecycleFacade(...)`
 *  directly. Note the distinction from `ManagedApp["lifecycle"]`,
 *  which is the thunk: `() => NonNullable<LifecycleObject> | null`. */
export function syncLifecycleFacade(
  status: () => unknown,
  start: () => unknown,
  stop: () => unknown,
): NonNullable<ReturnType<ManagedApp["lifecycle"]>> {
  return {
    status: async () => status(),
    start: async () => ({ ok: true, status: start(), error: null }),
    stop: async () => ({ ok: true, status: stop(), error: null }),
    restart: async () => {
      stop();
      return { ok: true, status: start(), error: null };
    },
  };
}