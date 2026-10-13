// ai-workspace adapter — wraps the cubecloud-agent module family
// (probe / supervisor / sessions / governance / config / bundle-compiler)
// into the ManagedApp contract. The ONLY adapter with write channels
// (rule 3): bundle promotion, provision-env, approval verdicts.
//
// Mode: fabric-attach by default (container era); local-spawn when the
// supervisor CLI is used on the host (dev). The supervisor itself is
// the local-spawn lifecycle; in fabric mode lifecycle stays read-only
// status (the console container never spawns fabric services).
//
// Config block: "workspace" (rule 2 — the B1 bug class dies here: this
// adapter cannot reach the gateway connection config because it only
// touches its own block via readAppBlock/writeAppBlock).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import {
  probeCubecloudAgent,
  normalizeWorkspaceOrigin,
  CUBECLOUD_AGENT_DEFAULT_URL,
} from "../cubecloud-agent-probe";
import {
  getWorkspaceSupervisorStatus,
  startWorkspaceSupervisor,
  stopWorkspaceSupervisor,
} from "../cubecloud-agent-supervisor";
import {
  listWorkspaceSessions,
  listWorkspaceAgents,
} from "../cubecloud-agent-sessions";
import {
  listPendingElicitations,
  resolveElicitation,
} from "../cubecloud-agent-governance";
import {
  readAppBlock,
  writeAppBlock,
  type ManagedAppConfigBlock,
} from "./config-blocks";
import type {
  ManagedApp,
  ManagedAppDiscovery,
  ManagedAppHealth,
  ManagedAppInventory,
  ManagedAppLifecycle,
} from "./contract";

/** The adapter's own config block shape. Extends the index-signature
 *  constraint `writeAppBlock` requires (config-blocks.ts rule 2). */
export interface WorkspaceAppConfig extends Record<string, unknown> {
  /** Workspace origin (loopback http by row-A rules). */
  baseUrl: string;
  /** Optional API key (header auth provider). */
  apiKey: string | null;
  /** Operator-set session id for the governance elicitation family. */
  sessionId: string | null;
}

const DEFAULT_WORKSPACE_CONFIG: WorkspaceAppConfig = {
  baseUrl: CUBECLOUD_AGENT_DEFAULT_URL,
  apiKey: null,
  sessionId: null,
};

export function loadWorkspaceAppConfig(): WorkspaceAppConfig {
  const block = readAppBlock<Partial<WorkspaceAppConfig>>("workspace");
  return { ...DEFAULT_WORKSPACE_CONFIG, ...(block ?? {}) };
}

export function saveWorkspaceAppConfig(
  patch: Partial<WorkspaceAppConfig>,
): WorkspaceAppConfig | null {
  return writeAppBlock<WorkspaceAppConfig>("workspace", patch);
}

export const WORKSPACE_CONFIG_BLOCK: ManagedAppConfigBlock = "workspace";

export function createWorkspaceApp(): ManagedApp {
  return {
    id: "ai-workspace",
    label: "AI Workspace",
    mode: "fabric-attach",

    async discover(): Promise<ManagedAppDiscovery> {
      const cfg = loadWorkspaceAppConfig();
      const base = normalizeWorkspaceOrigin(cfg.baseUrl) ?? cfg.baseUrl;
      const probe = await probeCubecloudAgent(base);
      return {
        state: probe.reachable ? "found" : "not-found",
        detail: probe.reachable
          ? `Workspace reachable at ${probe.baseUrl}`
          : (probe.error ?? "Workspace not reachable"),
        scannedAt: probe.scannedAt,
      };
    },

    async health(): Promise<ManagedAppHealth> {
      const cfg = loadWorkspaceAppConfig();
      const base = normalizeWorkspaceOrigin(cfg.baseUrl) ?? cfg.baseUrl;
      const probe = await probeCubecloudAgent(base);
      const capabilities: ManagedAppHealth["capabilities"] = [
        "inventory",
        "lifecycle",
        "config",
        "governance",
      ];
      return {
        ok: probe.reachable,
        capabilities,
        detail: probe.reachable
          ? `health ${JSON.stringify(probe.health.status ?? "ok")}`
          : (probe.error ?? "unreachable"),
        raw: probe,
        scannedAt: probe.scannedAt,
      };
    },

    async inventory(): Promise<ManagedAppInventory> {
      const cfg = loadWorkspaceAppConfig();
      const base = normalizeWorkspaceOrigin(cfg.baseUrl) ?? cfg.baseUrl;
      const [sessions, agents] = await Promise.all([
        listWorkspaceSessions(base),
        listWorkspaceAgents(base),
      ]);
      return {
        ok: sessions.success || agents.success,
        data: { sessions, agents },
        error:
          sessions.success || agents.success
            ? null
            : (sessions.error ?? agents.error ?? "inventory unavailable"),
      };
    },

    lifecycle() {
      return {
        status: async () => getWorkspaceSupervisorStatus(),
        start: async (): Promise<ManagedAppLifecycle> => {
          const status = await startWorkspaceSupervisor();
          return { ok: true, status, error: status.lastError };
        },
        stop: async (): Promise<ManagedAppLifecycle> => {
          const status = await stopWorkspaceSupervisor();
          return { ok: true, status, error: status.lastError };
        },
        restart: async (): Promise<ManagedAppLifecycle> => {
          await stopWorkspaceSupervisor();
          const status = await startWorkspaceSupervisor();
          return { ok: true, status, error: status.lastError };
        },
      };
    },

    configSchema() {
      const cfg = loadWorkspaceAppConfig();
      return {
        block: WORKSPACE_CONFIG_BLOCK,
        fields: [
          { key: "baseUrl", label: "Workspace URL", type: "string", current: cfg.baseUrl },
          { key: "apiKey", label: "API key", type: "secret", current: cfg.apiKey ? "(set)" : null },
          { key: "sessionId", label: "Governance session id", type: "string", current: cfg.sessionId },
        ],
      };
    },

    governance() {
      const cfg = loadWorkspaceAppConfig();
      const base = normalizeWorkspaceOrigin(cfg.baseUrl) ?? cfg.baseUrl;
      const sessionId = cfg.sessionId;
      return {
        pending: [],
        async resolve(id, verdict) {
          if (!sessionId) {
            return { ok: false, error: "no governance session configured" };
          }
          const result = await resolveElicitation(base, sessionId, id, {
            action: verdict,
          });
          return { ok: result.success, error: result.success ? null : "resolve failed" };
        },
        /** Refresh pending items on demand (contract keeps `pending`
         *  as a snapshot; the panel calls refresh via inventory). */
        async refresh(): Promise<void> {
          if (!sessionId) return;
          const result = await listPendingElicitations(base, sessionId);
          if (result.success) {
            this.pending = result.requests.map((r) => ({
              id: r.elicitationId,
              kind: "elicitation",
              summary: r.message ?? r.elicitationId,
            }));
          }
        },
      } as ManagedAppGovernanceWithRefresh;
    },
  };
}

/** Governance hooks with an optional refresh — the workspace adapter
 *  extends the base hook shape with a pull-based pending list. */
export interface ManagedAppGovernanceWithRefresh {
  pending: Array<{ id: string; kind: string; summary: string }>;
  resolve: (
    id: string,
    verdict: "accept" | "decline" | "cancel",
  ) => Promise<{ ok: boolean; error: string | null }>;
  refresh?: () => Promise<void>;
}