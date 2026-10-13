// console-backend C0 — module seeding + boot.
//
// Seeds the kernel route registry from the already-Electron-free
// workspace-console module family and boots the HTTP server. Each
// capability maps 1:1 onto the desktop IPC channel it replaces (or,
// for the sessions family, the IPC channel that must be ADDED — the
// parity check found the sessions module shipped in V2.10.80 with
// module + tests but no IPC/preload wiring; C0 is its first caller).

import {
  probeCubecloudAgent,
  CUBECLOUD_AGENT_DEFAULT_URL,
  normalizeWorkspaceOrigin,
} from "../src/main/cubecloud-agent-probe.ts";
import {
  listWorkspaceSessions,
  getWorkspaceSessionSnapshot,
  listWorkspaceAgents,
} from "../src/main/cubecloud-agent-sessions.ts";
import {
  getWorkspaceSupervisorStatus,
  startWorkspaceSupervisor,
  stopWorkspaceSupervisor,
  getWorkspaceSupervisorLogTail,
} from "../src/main/cubecloud-agent-supervisor.ts";
import {
  createConsoleServer,
  ConsoleRouteRegistry,
} from "./registry.ts";
import { seedGovernance } from "./governance-seed.ts";
import type { ServerResponse } from "http";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { HERMES_HOME, HERMES_PYTHON, HERMES_SCRIPT } from "../src/main/homer.ts";

/** Live push sinks: channel → SSE response (C1 push transport). */
export const pushSinks = new Map<string, ServerResponse>();

/** Broadcast a push event to every connected browser shell — the
 *  desktop's `webContents.send` analog for the browser shell. */
export function broadcastKernelEvent(channel: string, payload: unknown): void {
  const sink = pushSinks.get(channel);
  if (!sink) return;
  try {
    sink.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    pushSinks.delete(channel);
  }
}
import { scanLocalServers, probeLocalModelHealth } from "../src/main/local-server-scan.ts";
import { diagnoseRemoteConnection, testRemoteConnection } from "../src/main/hermes.ts";

const PORT = Number(process.env.CONSOLE_KERNEL_PORT ?? 6770);

async function main(): Promise<void> {
  const registry = new ConsoleRouteRegistry();

  // Row A (probe) — mirrors ipcMain.handle("workspace-probe"/"-url")
  registry.register({
    name: "workspaceProbe",
    ipcChannel: "workspace-probe",
    handler: async ([base]) =>
      probeCubecloudAgent(typeof base === "string" ? base : null),
  });
  registry.register({
    name: "workspaceProbeUrl",
    ipcChannel: "workspace-probe-url",
    handler: async () =>
      normalizeWorkspaceOrigin(null) ?? CUBECLOUD_AGENT_DEFAULT_URL,
  });

  // Row B (supervisor) — mirrors workspace-supervisor-* IPC
  registry.register({
    name: "workspaceSupervisorStatus",
    ipcChannel: "workspace-supervisor-status",
    handler: async () => getWorkspaceSupervisorStatus(),
  });
  registry.register({
    name: "workspaceSupervisorStart",
    ipcChannel: "workspace-supervisor-start",
    handler: async ([options]) =>
      startWorkspaceSupervisor(
        options && typeof options === "object"
          ? (options as { port?: number })
          : undefined,
      ),
  });
  registry.register({
    name: "workspaceSupervisorStop",
    ipcChannel: "workspace-supervisor-stop",
    handler: async () => stopWorkspaceSupervisor(),
  });
  registry.register({
    name: "workspaceSupervisorLogTail",
    ipcChannel: "workspace-supervisor-log-tail",
    handler: async () => getWorkspaceSupervisorLogTail(),
  });

  // Row D/R1 (read-only sessions + reconciliation) — GET-only family.
  // NEW-WIRING: these have no desktop IPC channel yet (parity-check
  // finding); the ipcChannel field records the channel name the C1
  // desktop-side wire-up should use.
  registry.register({
    name: "listWorkspaceSessions",
    ipcChannel: "workspace-sessions-list",
    handler: async ([base]) => listWorkspaceSessions(String(base ?? "")),
  });
  registry.register({
    name: "getWorkspaceSessionSnapshot",
    ipcChannel: "workspace-session-snapshot",
    handler: async ([base, id]) =>
      getWorkspaceSessionSnapshot(String(base ?? ""), String(id ?? "")),
  });
  registry.register({
    name: "listWorkspaceAgents",
    ipcChannel: "workspace-agents-list",
    handler: async ([base]) => listWorkspaceAgents(String(base ?? "")),
  });

  // C1 (kernel home resolution): homer.ts is now the Electron-free
  // Hermes-home module that the repointed consumers import. The
  // kernel exposes its own resolved home as a self-describing,
  // read-only capability (top-import, not dynamic — homer must load
  // with the same env the kernel was booted from).
  registry.register({
    name: "kernelHome",
    ipcChannel: "kernel-home",
    handler: async () => ({
      success: true,
      hermesHome: HERMES_HOME,
      hermesPython: HERMES_PYTHON,
      hermesScript: HERMES_SCRIPT,
    }),
  });

  // C1 (discovery family): local-LLM server scan + model health +
  // remote-connection diagnostics. Tier-2/3 surfaces the compose
  // browser console needs before any chat routing.
  registry.register({
    name: "scanLocalServers",
    ipcChannel: "scan-local-servers",
    handler: async ([extraHosts]) =>
      scanLocalServers({ extraHosts: Array.isArray(extraHosts) ? (extraHosts as string[]) : [] }),
  });
  registry.register({
    name: "probeLocalModelHealth",
    ipcChannel: "probe-local-model-health",
    handler: async ([baseUrl]) =>
      probeLocalModelHealth(typeof baseUrl === "string" ? baseUrl : ""),
  });
  registry.register({
    name: "diagnoseRemoteConnection",
    ipcChannel: "diagnose-remote-connection",
    handler: async ([rawUrl, expectedRuntime, apiKey]) =>
      diagnoseRemoteConnection(
        typeof rawUrl === "string" ? rawUrl : "",
        typeof expectedRuntime === "string"
          ? (expectedRuntime as Parameters<typeof diagnoseRemoteConnection>[1])
          : undefined,
        typeof apiKey === "string" ? apiKey : undefined,
      ),
  });
  registry.register({
    name: "testRemoteConnection",
    ipcChannel: "test-remote-connection",
    handler: async ([rawUrl, apiKey]) =>
      testRemoteConnection(
        typeof rawUrl === "string" ? rawUrl : "",
        typeof apiKey === "string" ? apiKey : undefined,
      ),
  });

  // Row G / R4 (governance relay) — the elicitation inbox, the ONE
  // verdict write, and the registry surfaces view (via governance-seed).
  seedGovernance(registry);

  // Phase A — generic capability bridge: register every remaining
  // desktop IPC channel from dispatch-table.json (delegates call the
  // main modules directly; desktopOnly channels degrade; manual
  // channels hand-mapped or stable not-bridged shape). Hand seeds
  // above keep priority — the bridge skips channels already present.
  const { seedGenericBridge } = await import("./generic-bridge.ts");
  const bridgeSummary = await seedGenericBridge(registry, pushSinks);
  console.log(
    `generic bridge: +${bridgeSummary.registered} capabilities ` +
      `(${bridgeSummary.skipped} hand-seeded kept, ` +
      `${bridgeSummary.desktopOnly} desktopOnly, ${bridgeSummary.manual} manual)`,
  );

  // Renderer root resolves from THIS MODULE's location (console-backend/
  // → ../out/renderer), not process.cwd() — the kernel must serve the
  // browser shell regardless of which directory it was launched from
  // (async terminals/compose run from the repo root; docker from /app).
  // An operator override env var (CONSOLE_RENDERER_ROOT) wins for
  // non-standard build layouts.
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const rendererRoot =
    process.env.CONSOLE_RENDERER_ROOT?.trim() ||
    resolve(moduleDir, "..", "out", "renderer");

  const server = createConsoleServer(registry, {
    rendererRoot,
    pushSinks,
  });
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  console.log(`console-backend kernel listening on http://127.0.0.1:${PORT}`);
  console.log(`capabilities: ${registry.size}`);
}

main().catch((err: unknown) => {
  console.error("console-backend failed to boot:", err);
  process.exitCode = 1;
});