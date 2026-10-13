// Approvals panel — the console's ONE workspace write (contract row G).
//
// Delivers the human verdict to the workspace's resource-scoped resolve
// endpoint. Without a governance session id the panel is read-only
// guidance. The human is still the hand that signs: this screen only
// carries their decision.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function ApprovalsPanel({
  data,
  sessionId,
}: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
}): React.JSX.Element {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const decide = async (
    id: string,
    action: "accept" | "decline" | "cancel",
  ): Promise<void> => {
    if (!sessionId) return;
    setBusy(true);
    try {
      await window.hermesAPI.workspaceGovernanceResolve(
        null,
        sessionId,
        id,
        { action },
      );
      await data.reload();
    } catch {
      // fail-soft: the row stays until a successful reload
    } finally {
      setBusy(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="workspace-console-panel">
        <p className="workspace-console-muted">
          {t("workspaceConsole.approvalUnavailable", {
            defaultValue: "Approvals need a governance session id (Settings).",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="workspace-console-panel">
      {data.elicitations.length === 0 ? (
        <p className="workspace-console-muted">
          {t("workspaceConsole.approvalsEmpty", {
            defaultValue: "Nothing waiting on you.",
          })}
        </p>
      ) : (
        data.elicitations.map((req) => (
          <div className="workspace-console-card" key={req.elicitationId}>
            <div className="workspace-console-row">
              <span>{req.message ?? req.elicitationId}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => void decide(req.elicitationId, "accept")}
                >
                  {t("workspaceConsole.approve", { defaultValue: "Approve" })}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void decide(req.elicitationId, "decline")}
                >
                  {t("workspaceConsole.decline", { defaultValue: "Decline" })}
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void decide(req.elicitationId, "cancel")}
                >
                  {t("workspaceConsole.cancel", { defaultValue: "Cancel" })}
                </button>
              </span>
            </div>
            {req.policyName && (
              <p className="workspace-console-muted">
                {t("workspaceConsole.approvalPolicy", { defaultValue: "Policy" })}:{" "}
                {req.policyName}
              </p>
            )}
          </div>
        ))
      )}
      {data.elicitationError && (
        <p className="workspace-console-error">{data.elicitationError}</p>
      )}
    </div>
  );
}
