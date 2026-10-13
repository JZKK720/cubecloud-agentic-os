// Overview panel — probe status + supervisor lifecycle + log tail (M4).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function OverviewPanel({
  data,
}: {
  data: WorkspaceConsoleState;
}): React.JSX.Element {
  const { t } = useI18n();
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const loadLog = useCallback(async (): Promise<void> => {
    try {
      setLog((await window.hermesAPI.workspaceSupervisorLogTail()).lines);
    } catch {
      setLog([]);
    }
  }, []);

  useEffect(() => {
    void loadLog();
  }, [loadLog]);

  const act = useCallback(
    async (op: "start" | "stop"): Promise<void> => {
      setBusy(true);
      try {
        if (op === "start") {
          await window.hermesAPI.workspaceSupervisorStart();
        } else {
          await window.hermesAPI.workspaceSupervisorStop();
        }
        await data.reload();
        await loadLog();
      } catch {
        // fail-soft: the status row keeps the last known state
      } finally {
        setBusy(false);
      }
    },
    [data, loadLog],
  );

  const statusLabel = data.probe?.reachable
    ? t("workspaceConsole.statusReachable", { defaultValue: "Reachable" })
    : data.probe
      ? t("workspaceConsole.statusUnreachable", { defaultValue: "Not reachable" })
      : t("workspaceConsole.statusUnknown", { defaultValue: "Unknown" });

  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <div className="workspace-console-row">
          <strong>{statusLabel}</strong>
          <span className="workspace-console-muted">
            {data.probe?.baseUrl ?? "—"}
            {data.probe?.version ? ` · v${data.probe.version}` : ""}
          </span>
        </div>
        {data.probe?.error && (
          <p className="workspace-console-error">{data.probe.error}</p>
        )}
      </div>

      <div className="workspace-console-card">
        <div className="workspace-console-row">
          <span>
            {t("workspaceConsole.logTail", { defaultValue: "Supervisor log" })}
            {data.supervisor ? ` · ${data.supervisor.state}` : ""}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            {data.supervisor?.running ? (
              <button
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void act("stop")}
              >
                {t("workspaceConsole.stop", { defaultValue: "Stop" })}
              </button>
            ) : null}
            {data.supervisor?.cli && !data.supervisor.running ? (
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={() => void act("start")}
              >
                {t("workspaceConsole.start", { defaultValue: "Start" })}
              </button>
            ) : null}
          </span>
        </div>
        <pre className="workspace-console-log">
          {log.length
            ? log.join("\n")
            : t("workspaceConsole.noLog", { defaultValue: "No log output yet." })}
        </pre>
      </div>
    </div>
  );
}
