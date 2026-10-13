// console-backend C1 — governance-relay seed (contract row G).
//
// Completes the kernel's console-contract coverage: the row-G
// capabilities that V2.10.80 shipped with module + IPC + preload. The
// sessions family (row D) was already bridged; these are the last two
// module surfaces in theElectron-free workspace-console family.

import {
  listGovernanceSurfaces,
  listPendingElicitations,
  resolveElicitation,
  type GovernanceVerdictBody,
} from "../src/main/cubecloud-agent-governance.ts";
import { CUBECLOUD_AGENT_DEFAULT_URL, normalizeWorkspaceOrigin } from "../src/main/cubecloud-agent-probe.ts";
import { ConsoleRouteRegistry } from "./registry.ts";

/** Governance module signatures take a plain string; the renderer's
 *  null-rawUrl convention maps to the normalized loopback default here. */
function baseOr(rawUrl: unknown): string {
  return (
    normalizeWorkspaceOrigin(typeof rawUrl === "string" ? rawUrl : null) ??
    CUBECLOUD_AGENT_DEFAULT_URL
  );
}

export function seedGovernance(registry: ConsoleRouteRegistry): void {
  // Row D (read-only elicitation inbox — the pre-verdict read)
  registry.register({
    name: "workspaceGovernanceElicitations",
    ipcChannel: "workspace-governance-elicitations",
    handler: async ([rawUrl, sessionId]) =>
      listPendingElicitations(baseOr(rawUrl), String(sessionId ?? "")),
  });

  // Row G (the ONE console→workspace write: the human verdict).
  // Guarded: an empty elicitationId is rejected inside the module
  // before any POST (resolveElicitation's own client-side guard).
  registry.register({
    name: "workspaceGovernanceResolve",
    ipcChannel: "workspace-governance-resolve",
    handler: async ([rawUrl, sessionId, elicitationId, verdict]) =>
      resolveElicitation(
        baseOr(rawUrl),
        String(sessionId ?? ""),
        String(elicitationId ?? ""),
        (verdict ?? { action: "decline" }) as GovernanceVerdictBody,
      ),
  });

  // Row R4 (registry-view of workspace scheduled tasks/policies/sharing)
  registry.register({
    name: "workspaceGovernanceSurfaces",
    ipcChannel: "workspace-governance-surfaces",
    handler: async ([rawUrl]) => listGovernanceSurfaces(baseOr(rawUrl)),
  });
}