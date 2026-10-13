// tool-surface adapters — wraps the probe/sidecar modules for the
// remaining managed apps: openviking, weknora, gbrain, headroom,
// codegraph, moo-tasks, agent-reach, graphify, browser-harness, laya.
//
// Writes: sidecar lifecycle in local mode only (headroom, moo-tasks);
// everything else read-only (rule 3). Config blocks: "openviking",
// "weknora", "headroom" (the three blocks in MANAGED_APP_CONFIG_BLOCKS
// this file touches).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import {
  probeOpenViking,
  OPENVIKING_DEFAULT_URL,
  type OpenVikingProbeResult,
} from "../openviking-probe";
import {
  probeWeknora,
  type WeknoraProbeResult,
} from "../weknora-probe";
import { probeGbrain } from "../gbrain-probe";
import {
  loadHeadroomConfig,
  saveHeadroomConfig,
  pingHeadroom,
  getHeadroomStats,
  type HeadroomConfig,
} from "../headroom";
import {
  getHeadroomSidecarStatus,
  startHeadroomSidecar,
  stopHeadroomSidecar,
  restartHeadroomSidecar,
} from "../headroom-sidecar";
import {
  getMooTasksSidecarStatus,
  startMooTasksSidecar,
  stopMooTasksSidecar,
  restartMooTasksSidecar,
} from "../moo-tasks-sidecar";
import { probeAgentReach } from "../agent-reach";
import {
  discoverGraphify,
  runGraphifyVersion,
} from "../graphify-probe";
import {
  discoverBrowserHarness,
  runBrowserHarnessDoctor,
} from "../browser-harness";
import { probeLaya } from "../laya-probe";
import {
  getCodeGraphCliStatus,
  type CodeGraphCliStatus,
} from "../codegraph";
import { HERMES_HOME } from "../homer";
import { readAppBlock, writeAppBlock } from "./config-blocks";
import {
  syncLifecycleFacade,
  type ManagedApp,
  type ManagedAppConfigSchema,
  type ManagedAppDiscovery,
  type ManagedAppHealth,
  type ManagedAppInventory,
} from "./contract";

// ── openviking / weknora config blocks ────────────────────────────

export interface OpenVikingAppConfig extends Record<string, unknown> {
  baseUrl: string;
  apiKey: string | null;
}

export interface WeknoraAppConfig extends Record<string, unknown> {
  baseUrl: string;
  apiKey: string | null;
  tenantId: string | null;
}

export function loadOpenVikingAppConfig(): OpenVikingAppConfig {
  const block = readAppBlock<Partial<OpenVikingAppConfig>>("openviking");
  return {
    baseUrl: block?.baseUrl ?? OPENVIKING_DEFAULT_URL,
    apiKey: block?.apiKey ?? null,
  };
}

export function saveOpenVikingAppConfig(
  patch: Partial<OpenVikingAppConfig>,
): OpenVikingAppConfig | null {
  return writeAppBlock<OpenVikingAppConfig>("openviking", patch);
}

export function loadWeknoraAppConfig(): WeknoraAppConfig {
  const block = readAppBlock<Partial<WeknoraAppConfig>>("weknora");
  return {
    baseUrl: block?.baseUrl ?? "",
    apiKey: block?.apiKey ?? null,
    tenantId: block?.tenantId ?? null,
  };
}

export function saveWeknoraAppConfig(
  patch: Partial<WeknoraAppConfig>,
): WeknoraAppConfig | null {
  return writeAppBlock<WeknoraAppConfig>("weknora", patch);
}

// ── HTTP-probe adapters (openviking, weknora) ─────────────────────

function httpProbeApp(
  id: string,
  label: string,
  probe: () => Promise<OpenVikingProbeResult | WeknoraProbeResult>,
  loadConfig: () => { baseUrl: string; apiKey: string | null },
  block: "openviking" | "weknora",
): ManagedApp {
  return {
    id,
    label,
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const result = await probe();
      return {
        state: result.reachable ? "found" : "not-found",
        detail: result.reachable
          ? `${label} reachable at ${result.baseUrl}`
          : (result.error ?? `${label} not reachable`),
        scannedAt: result.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const result = await probe();
      return {
        ok: result.reachable,
        capabilities: ["inventory", "config"],
        detail: result.reachable
          ? `reachable at ${result.baseUrl}`
          : (result.error ?? "unreachable"),
        raw: result,
        scannedAt: result.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const result = await probe();
      return {
        ok: result.reachable,
        data: result,
        error: result.reachable ? null : (result.error ?? "inventory unavailable"),
      };
    },

    lifecycle() {
      // fabric-attach: the console never spawns these services.
      return null;
    },

    configSchema(): ManagedAppConfigSchema {
      const cfg = loadConfig();
      const fields: ManagedAppConfigSchema["fields"] = [
        { key: "baseUrl", label: `${label} URL`, type: "string", current: cfg.baseUrl },
        { key: "apiKey", label: "API key", type: "secret", current: cfg.apiKey ? "(set)" : null },
      ];
      if (block === "weknora") {
        fields.push({
          key: "tenantId",
          label: "Tenant id",
          type: "string",
          current: (cfg as WeknoraAppConfig).tenantId,
        });
      }
      return { block, fields };
    },

    governance() {
      return null;
    },
  };
}

export function createOpenVikingApp(): ManagedApp {
  return httpProbeApp(
    "openviking",
    "OpenViking",
    () => {
      const cfg = loadOpenVikingAppConfig();
      return probeOpenViking(cfg.baseUrl, { apiKey: cfg.apiKey });
    },
    loadOpenVikingAppConfig,
    "openviking",
  );
}

export function createWeknoraApp(): ManagedApp {
  return httpProbeApp(
    "weknora",
    "WeKnora",
    () => {
      const cfg = loadWeknoraAppConfig();
      return probeWeknora(cfg.baseUrl, {
        apiKey: cfg.apiKey,
        tenantId: cfg.tenantId,
      });
    },
    loadWeknoraAppConfig,
    "weknora",
  );
}

// ── CLI-probe adapters (gbrain, agent-reach, graphify,
//    browser-harness, laya, codegraph) ─────────────────────────────

/** Shared facade for one-shot CLI probes: discover/health/inventory
 *  all read the same probe result; lifecycle/config/governance are
 *  unsupported (the desktop never spawns these — the runtime agent
 *  invokes them). */
function cliProbeApp(
  id: string,
  label: string,
  probe: () => unknown,
  isInstalled: (result: unknown) => boolean,
): ManagedApp {
  return {
    id,
    label,
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const result = probe();
      const installed = isInstalled(result);
      return {
        state: installed ? "found" : "not-found",
        detail: installed
          ? `${label} detected on PATH`
          : `${label} not installed`,
        scannedAt: new Date().toISOString(),
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const result = probe();
      const installed = isInstalled(result);
      return {
        ok: installed,
        capabilities: ["inventory"],
        detail: installed
          ? `${label} probe ok`
          : `${label} not installed`,
        raw: result,
        scannedAt: new Date().toISOString(),
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const result = probe();
      const installed = isInstalled(result);
      return {
        ok: installed,
        data: result,
        error: installed ? null : "not installed",
      };
    },

    lifecycle() {
      return null;
    },

    configSchema() {
      return null;
    },

    governance() {
      return null;
    },
  };
}

export function createGbrainApp(): ManagedApp {
  return cliProbeApp(
    "gbrain",
    "GBrain",
    () => probeGbrain(),
    (r) => (r as { installed: boolean }).installed === true,
  );
}

export function createAgentReachApp(): ManagedApp {
  return cliProbeApp(
    "agent-reach",
    "Agent Reach",
    () => probeAgentReach(),
    (r) => (r as { installed: boolean }).installed === true,
  );
}

export function createGraphifyApp(): ManagedApp {
  return cliProbeApp(
    "graphify",
    "Graphify",
    () => {
      const discovery = discoverGraphify();
      if (discovery.installed) {
        return { installed: true, discovery, version: runGraphifyVersion() };
      }
      return discovery;
    },
    (r) => (r as { installed: boolean }).installed === true,
  );
}

export function createBrowserHarnessApp(): ManagedApp {
  return cliProbeApp(
    "browser-harness",
    "Browser Harness",
    () => {
      const discovery = discoverBrowserHarness();
      if (discovery.installed) {
        return { installed: true, discovery, doctor: runBrowserHarnessDoctor() };
      }
      return discovery;
    },
    (r) => (r as { installed: boolean }).installed === true,
  );
}

/** The default `laya-serve` origin — the endpoint the DM1/DM2 decision
 *  slots actually call (`src/main/index.ts`, `src/main/hermes.ts`). Kept in
 *  sync with the `agent.laya_base_url` config default. */
const LAYA_DEFAULT_SERVE_URL = "http://127.0.0.1:8000";

/** Probe the `laya-serve` HTTP endpoint the decision slots depend on.
 *
 *  Capability honesty (rule 1): the `laya` CLI being on PATH says nothing
 *  about whether decisions will work — the slots speak HTTP. Without this
 *  check the operator sees a green row while every decision silently
 *  abstains (fail-open), which is the exact bug class rule 1 bans.
 *
 *  Never throws: any transport failure resolves to `{ reachable: false }`. */
async function probeLayaServe(): Promise<{ reachable: boolean; detail: string }> {
  const base =
    process.env.LAYA_BASE_URL?.replace(/\/+$/, "") ?? LAYA_DEFAULT_SERVE_URL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3_000);
  try {
    const res = await fetch(`${base}/health`, { signal: controller.signal });
    return res.ok
      ? { reachable: true, detail: `laya-serve ok at ${base}` }
      : { reachable: false, detail: `laya-serve HTTP ${res.status} at ${base}` };
  } catch (err) {
    return {
      reachable: false,
      detail: `laya-serve unreachable at ${base} (${String(err).slice(0, 80)})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Laya's decision engine is a *local* HTTP server but the console must
 *  never spawn fabric services (rule 4) — so this adapter is fabric-attach
 *  with a null lifecycle, and its health folds in the serve probe. */
export function createLayaApp(): ManagedApp {
  const base = cliProbeApp(
    "laya",
    "Laya",
    () => probeLaya(),
    (r) => (r as { installed: boolean }).installed === true,
  );

  return {
    ...base,

    async discover(): Promise<ManagedAppDiscovery> {
      const cli = probeLaya();
      if (!cli.installed) {
        return {
          state: "not-found",
          detail: cli.summary,
          scannedAt: new Date().toISOString(),
        };
      }
      const serve = await probeLayaServe();
      return {
        state: serve.reachable ? "found" : "auth-required",
        detail: serve.detail,
        scannedAt: new Date().toISOString(),
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const cli = probeLaya();
      const serve = await probeLayaServe();
      return {
        // Both halves matter: CLI present to run it, serve reachable for
        // the decision slots to have any effect.
        ok: cli.installed && serve.reachable,
        capabilities: ["inventory"],
        detail: serve.detail,
        raw: { cli, serve },
        scannedAt: new Date().toISOString(),
      };
    },
  };
}

export function createCodeGraphApp(): ManagedApp {
  return {
    id: "codegraph",
    label: "CodeGraph",
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const status: CodeGraphCliStatus = await getCodeGraphCliStatus();
      return {
        state: status.installed ? "found" : "not-found",
        detail: status.installed
          ? `CodeGraph CLI ${status.version ?? ""} at ${status.command ?? "PATH"}`
          : (status.error ?? "CodeGraph CLI not installed"),
        scannedAt: new Date().toISOString(),
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const status = await getCodeGraphCliStatus();
      return {
        ok: status.installed,
        capabilities: ["inventory"],
        detail: status.installed
          ? `CLI ${status.version ?? "unknown"}`
          : (status.error ?? "not installed"),
        raw: status,
        scannedAt: new Date().toISOString(),
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const status = await getCodeGraphCliStatus();
      return {
        ok: status.installed,
        data: status,
        error: status.installed ? null : "not installed",
      };
    },

    lifecycle() {
      return null;
    },

    configSchema() {
      return null;
    },

    governance() {
      return null;
    },
  };
}

// ── sidecar adapters (headroom, moo-tasks) — local-spawn lifecycle ──

export function createHeadroomApp(): ManagedApp {
  return {
    id: "headroom",
    label: "Headroom",
    mode: "local-spawn",

    async discover(): Promise<ManagedAppDiscovery> {
      const cfg = await loadHeadroomConfig(HERMES_HOME);
      const health = await pingHeadroom(cfg);
      return {
        state: health.reachable ? "found" : "not-found",
        detail: health.reachable
          ? `Headroom proxy at ${cfg.baseUrl}`
          : (health.detail ?? "Headroom proxy not reachable"),
        scannedAt: health.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const cfg = await loadHeadroomConfig(HERMES_HOME);
      const health = await pingHeadroom(cfg);
      const capabilities: ManagedAppHealth["capabilities"] = [
        "inventory",
        "lifecycle",
        "config",
      ];
      return {
        ok: health.reachable,
        capabilities,
        detail: health.reachable ? "proxy reachable" : (health.detail ?? "unreachable"),
        raw: health,
        scannedAt: health.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const cfg = await loadHeadroomConfig(HERMES_HOME);
      const stats = await getHeadroomStats(cfg);
      return {
        ok: stats.success,
        data: stats,
        error: stats.success ? null : (stats.error ?? "stats unavailable"),
      };
    },

    lifecycle() {
      return syncLifecycleFacade(
        () => getHeadroomSidecarStatus(),
        () => startHeadroomSidecar(),
        () => stopHeadroomSidecar(),
      );
    },

    configSchema(): ManagedAppConfigSchema {
      return {
        block: "headroom",
        fields: [
          { key: "baseUrl", label: "Proxy URL", type: "string", current: null },
          { key: "mode", label: "Mode (audit|optimize)", type: "string", current: null },
          { key: "enabled", label: "Enabled", type: "boolean", current: null },
          { key: "apiKey", label: "API key", type: "secret", current: null },
        ],
      };
    },

    governance() {
      return null;
    },
  };
}

/** Headroom config save passthrough (single-writer: headroom.ts). */
export async function saveHeadroomAppConfig(
  patch: Partial<HeadroomConfig>,
): Promise<HeadroomConfig> {
  return saveHeadroomConfig(HERMES_HOME, patch);
}

export function createMooTasksApp(): ManagedApp {
  return {
    id: "moo-tasks",
    label: "Moo Tasks",
    mode: "local-spawn",

    async discover(): Promise<ManagedAppDiscovery> {
      const status = getMooTasksSidecarStatus();
      return {
        state: status.running ? "found" : "not-found",
        detail: status.running
          ? `Moo Tasks at ${status.baseUrl}`
          : (status.reason ?? "Moo Tasks sidecar not running"),
        scannedAt: new Date().toISOString(),
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const status = getMooTasksSidecarStatus();
      return {
        ok: status.running,
        capabilities: ["inventory", "lifecycle"],
        detail: status.running
          ? `sidecar running (pid ${status.pid ?? "?"})`
          : (status.reason ?? "not running"),
        raw: status,
        scannedAt: new Date().toISOString(),
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const status = getMooTasksSidecarStatus();
      return {
        ok: status.running,
        data: status,
        error: status.running ? null : "not running",
      };
    },

    lifecycle() {
      return syncLifecycleFacade(
        () => getMooTasksSidecarStatus(),
        () => startMooTasksSidecar(),
        () => stopMooTasksSidecar(),
      );
    },

    configSchema(): ManagedAppConfigSchema | null {
      return null;
    },

    governance() {
      return null;
    },
  };
}

/** Restart passthroughs for the sidecar panels (bypass the crash cap
 *  — operator-correct behavior). */
export function restartHeadroomSidecarApp(): void {
  restartHeadroomSidecar();
}

export function restartMooTasksSidecarApp(): void {
  restartMooTasksSidecar();
}