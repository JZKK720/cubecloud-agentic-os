// Workspace console data hook — Phase C (design §3, M1–M4).
//
// One loader for the five panels. Every call is independent and
// fail-soft: a dead workspace yields null / [] plus an error string,
// never a thrown render (capability-honest, matching the ManagedApp
// contract rules). The console is a VIEWER of workspace-owned state —
// the only write anywhere in this surface is the approval verdict
// delivered by ApprovalsPanel.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useCallback, useEffect, useState } from "react";

export interface WorkspaceConsoleProbe {
  reachable: boolean;
  baseUrl: string;
  version: string | null;
  error: string | null;
  scannedAt: string;
}

type Supervisor = Awaited<
  ReturnType<Window["hermesAPI"]["workspaceSupervisorStatus"]>
>;
type Sessions = Awaited<
  ReturnType<Window["hermesAPI"]["listWorkspaceSessions"]>
>["data"];
type Agents = Awaited<
  ReturnType<Window["hermesAPI"]["listWorkspaceAgents"]>
>["data"];
type Surfaces = Awaited<
  ReturnType<Window["hermesAPI"]["workspaceGovernanceSurfaces"]>
>;
type Elicitations = Awaited<
  ReturnType<Window["hermesAPI"]["workspaceGovernanceElicitations"]>
>["requests"];

export interface WorkspaceConsoleState {
  loading: boolean;
  probe: WorkspaceConsoleProbe | null;
  supervisor: Supervisor | null;
  sessions: Sessions;
  agents: Agents;
  surfaces: Surfaces | null;
  elicitations: Elicitations;
  elicitationError: string | null;
  reload: () => Promise<void>;
}

export function useWorkspaceConsoleData(
  sessionId: string | null,
): WorkspaceConsoleState {
  const [loading, setLoading] = useState(true);
  const [probe, setProbe] = useState<WorkspaceConsoleProbe | null>(null);
  const [supervisor, setSupervisor] = useState<Supervisor | null>(null);
  const [sessions, setSessions] = useState<Sessions>([]);
  const [agents, setAgents] = useState<Agents>([]);
  const [surfaces, setSurfaces] = useState<Surfaces | null>(null);
  const [elicitations, setElicitations] = useState<Elicitations>([]);
  const [elicitationError, setElicitationError] = useState<string | null>(
    null,
  );

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);

    // Resolve the origin once; the M3 list calls require it.
    let base = "";
    try {
      const result = await window.hermesAPI.workspaceProbe();
      base = result.baseUrl;
      setProbe({
        reachable: result.reachable,
        baseUrl: result.baseUrl,
        version:
          result.info && typeof result.info.version === "string"
            ? result.info.version
            : null,
        error: result.error,
        scannedAt: result.scannedAt,
      });
    } catch {
      setProbe(null);
    }
    if (!base) {
      try {
        base = await window.hermesAPI.workspaceProbeUrl();
      } catch {
        base = "";
      }
    }

    try {
      setSupervisor(await window.hermesAPI.workspaceSupervisorStatus());
    } catch {
      setSupervisor(null);
    }
    try {
      setSessions((await window.hermesAPI.listWorkspaceSessions(base)).data);
    } catch {
      setSessions([]);
    }
    try {
      setAgents((await window.hermesAPI.listWorkspaceAgents(base)).data);
    } catch {
      setAgents([]);
    }
    try {
      setSurfaces(await window.hermesAPI.workspaceGovernanceSurfaces(null));
    } catch {
      setSurfaces(null);
    }
    if (sessionId) {
      try {
        const res = await window.hermesAPI.workspaceGovernanceElicitations(
          null,
          sessionId,
        );
        setElicitations(res.requests);
        setElicitationError(res.success ? null : (res.error ?? "unavailable"));
      } catch (err) {
        setElicitations([]);
        setElicitationError(String(err));
      }
    } else {
      setElicitations([]);
      setElicitationError(null);
    }

    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    loading,
    probe,
    supervisor,
    sessions,
    agents,
    surfaces,
    elicitations,
    elicitationError,
    reload,
  };
}
