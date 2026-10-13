// Sessions panel — read-only mirror of workspace sessions and agents
// (M3, contract row D: the console is a viewer, not the owner).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function SessionsPanel({
  data,
}: {
  data: WorkspaceConsoleState;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <strong>
          {t("workspaceConsole.sessionsTitle", { defaultValue: "Workspace sessions" })}
        </strong>
        {data.sessions.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.sessionsEmpty", {
              defaultValue: "No sessions reported.",
            })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {data.sessions.map((s) => (
              <li key={s.id}>
                {s.title ?? s.id}
                {s.status ? ` · ${s.status}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="workspace-console-card">
        <strong>
          {t("workspaceConsole.agentsTitle", { defaultValue: "Workspace agents" })}
        </strong>
        {data.agents.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.agentsEmpty", {
              defaultValue: "No agents reported.",
            })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {data.agents.map((a) => (
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
