// Policies panel — the workspace policy registry and scheduled tasks
// (M1 read, contract row R4's registry-view duty). Older builds 404
// individual surfaces; those degrade to a tolerant "partial" note.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function PoliciesPanel({
  data,
}: {
  data: WorkspaceConsoleState;
}): React.JSX.Element {
  const { t } = useI18n();
  const surfaces = data.surfaces;

  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <strong>
          {t("workspaceConsole.policiesTitle", { defaultValue: "Policy registry" })}
        </strong>
        {!surfaces || surfaces.policies.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.policiesEmpty", {
              defaultValue: "No policies reported.",
            })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {surfaces.policies.map((p) => (
              <li key={p.name}>
                {p.name}
                {p.mode ? ` · ${p.mode}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="workspace-console-card">
        <strong>
          {t("workspaceConsole.scheduledTitle", { defaultValue: "Scheduled tasks" })}
        </strong>
        {!surfaces || surfaces.scheduledTasks.length === 0 ? (
          <p className="workspace-console-muted">
            {t("workspaceConsole.scheduledEmpty", {
              defaultValue: "No scheduled tasks reported.",
            })}
          </p>
        ) : (
          <ul className="workspace-console-list">
            {surfaces.scheduledTasks.map((s) => (
              <li key={s.id ?? s.name}>{s.name}</li>
            ))}
          </ul>
        )}
      </div>

      {surfaces && surfaces.errors.length > 0 && (
        <p className="workspace-console-error">
          {t("workspaceConsole.surfacesPartial", {
            defaultValue:
              "Some workspace surfaces are unavailable (older build).",
          })}
        </p>
      )}
    </div>
  );
}
