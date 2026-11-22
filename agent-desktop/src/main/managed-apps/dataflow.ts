// dataflow adapter — wraps OpenDCAI/DataFlow-WebUI's MCP surface into the
// ManagedApp contract.
//
// WHY THIS FILE EXISTS: DataFlow is the one external repo whose expensive half
// was already paid for. It exposes exactly 20 whitelisted MCP tools over the
// legacy HTTP+SSE transport at `:8000/mcp`, and `mcp-probe.ts` already speaks
// that transport end to end (`probeSse`, `sseEndpointEvent`, `firstSseData`).
// Everything missing was this thin contract wrapper.
//
// MODE: `fabric-attach`. DataFlow is a Python service the operator runs --
// typically a container -- so the desktop attaches to it and never spawns it.
// `lifecycle()` therefore returns null rather than pretending it can start or
// stop something it does not own.
//
// SECURITY POSTURE, and why the detail string carries a warning: DataFlow's
// MCP surface is documented as unauthenticated, and its tools execute pipelines
// that run operator-supplied code. That is a deliberate property of the tool,
// not a defect we can patch, so the card must say so where the operator sees it.
// We surface it in `discover().detail` and in `health().detail` instead of
// inventing a new card component -- the contract already carries both fields
// for exactly this purpose.
//
// Writes: the `dataflow` config block only (rule 2). The desktop never writes
// DataFlow's own state.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { probeMcpServer } from "../mcp-probe";
import { readAppBlock, type ManagedAppConfigBlock } from "./config-blocks";
import type {
  ManagedApp,
  ManagedAppDiscovery,
  ManagedAppHealth,
  ManagedAppInventory,
  ManagedAppConfigSchema,
} from "./contract";

/** The config block this adapter owns. Must also be listed in
 *  `MANAGED_APP_CONFIG_BLOCKS` — that tuple is the whitelist `readAppBlock`
 *  accepts, so omitting it is a compile error rather than a runtime surprise. */
export const DATAFLOW_CONFIG_BLOCK = "dataflow" as const satisfies ManagedAppConfigBlock;

/** The endpoint DataFlow mounts its MCP server on. `fastapi-mcp` derives it
 *  from the FastAPI routes, so it is fixed unless the operator remaps the
 *  container port. */
export const DATAFLOW_DEFAULT_MCP_URL = "http://localhost:8000/mcp";

/** The tool count DataFlow's route whitelist produces upstream. Recorded for
 *  the card's detail line; NOT used to validate, because the operator's
 *  DataFlow version may add or remove routes. */
export const DATAFLOW_EXPECTED_TOOL_COUNT = 20;

/** One line the operator must see. DataFlow's MCP tools run pipelines. */
export const DATAFLOW_SECURITY_WARNING =
  "Unauthenticated by design: its tools execute pipeline code on this machine.";

interface DataFlowAppConfig {
  baseUrl?: string;
}

/** Read the adapter's config block. Returns the default URL when unset. */
export function loadDataFlowConfig(): { baseUrl: string } {
  const stored = readAppBlock<DataFlowAppConfig>(DATAFLOW_CONFIG_BLOCK);
  const baseUrl = stored?.baseUrl?.trim();
  return { baseUrl: baseUrl && baseUrl.length > 0 ? baseUrl : DATAFLOW_DEFAULT_MCP_URL };
}

/** Probe DataFlow's MCP endpoint. Never throws — `probeMcpServer` already
 *  returns a stable shape for every failure mode. */
async function probeDataFlow(baseUrl: string) {
  return probeMcpServer({
    name: "dataflow",
    type: "sse",
    detail: baseUrl,
  });
}

/** Build the discover detail. The warning is appended ONLY when the endpoint
 *  answered: telling a user that a server they have not installed is dangerous
 *  is noise, and it dilutes the warning where it matters. */
function discoverDetail(baseUrl: string, reachable: boolean, failure: string | null): string {
  if (!reachable) {
    return failure ?? `DataFlow not reachable at ${baseUrl}`;
  }
  return `DataFlow reachable at ${baseUrl} — ${DATAFLOW_SECURITY_WARNING}`;
}

export function createDataFlowApp(): ManagedApp {
  return {
    id: "dataflow",
    label: "DataFlow",
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const { baseUrl } = loadDataFlowConfig();
      const result = await probeDataFlow(baseUrl);
      return {
        state: result.ok ? "found" : "not-found",
        detail: discoverDetail(baseUrl, result.ok, result.error),
        scannedAt: result.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const { baseUrl } = loadDataFlowConfig();
      const result = await probeDataFlow(baseUrl);
      const count = result.tools?.length ?? 0;
      return {
        ok: result.ok,
        // Capability-honest (rule 1): the desktop can mirror the tool catalog
        // and own a config block. It cannot start or stop a container it only
        // attaches to, so "lifecycle" is deliberately absent.
        capabilities: ["inventory", "config"],
        detail: result.ok
          ? `${count} tool${count === 1 ? "" : "s"} advertised at ${baseUrl} — ${DATAFLOW_SECURITY_WARNING}`
          : (result.error ?? result.detail ?? "unreachable"),
        raw: result,
        scannedAt: result.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const { baseUrl } = loadDataFlowConfig();
      const result = await probeDataFlow(baseUrl);
      return {
        ok: result.ok,
        data: { baseUrl, tools: result.tools },
        error: result.ok ? null : (result.error ?? result.detail ?? "inventory unavailable"),
      };
    },

    lifecycle() {
      // fabric-attach: the console never spawns DataFlow. Reporting a lifecycle
      // it cannot honour would be the exact dishonesty the contract's own
      // comments warn about.
      return null;
    },

    configSchema(): ManagedAppConfigSchema {
      const { baseUrl } = loadDataFlowConfig();
      return {
        block: DATAFLOW_CONFIG_BLOCK,
        fields: [
          {
            key: "baseUrl",
            label: "MCP endpoint",
            type: "string",
            current: baseUrl,
          },
        ],
      };
    },

    governance() {
      // No governance hooks yet. DataFlow's own route whitelist is the only
      // control that exists, and it belongs to DataFlow, not to us.
      return null;
    },
  };
}
