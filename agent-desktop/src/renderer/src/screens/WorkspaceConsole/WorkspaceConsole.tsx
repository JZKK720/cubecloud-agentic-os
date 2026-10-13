// WorkspaceConsole — the AI Workspace management surface (design §3,
// mechanisms M1–M4). Five tabs over the shipped workspace IPC.
//
// There is NO <webview> here: the console manages the workspace
// (lifecycle, provisioning, mirrors, governance) while the workspace's
// own chat/file UI stays in the browser (openExternal). Session truth
// is workspace-owned; this screen is a viewer plus the single approval
// verdict write.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useCallback, useState } from "react";
import { ExternalLink, Refresh } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";
import ApprovalsPanel from "./ApprovalsPanel";
import OverviewPanel from "./OverviewPanel";
import PoliciesPanel from "./PoliciesPanel";
import SessionsPanel from "./SessionsPanel";
import SettingsPanel from "./SettingsPanel";
import { useWorkspaceConsoleData } from "./useWorkspaceConsoleData";

type Tab = "overview" | "settings" | "sessions" | "policies" | "approvals";

const TABS: Array<{ id: Tab; labelKey: string; fallback: string }> = [
  { id: "overview", labelKey: "workspaceConsole.tabOverview", fallback: "Overview" },
  { id: "settings", labelKey: "workspaceConsole.tabSettings", fallback: "Settings" },
  { id: "sessions", labelKey: "workspaceConsole.tabSessions", fallback: "Sessions & agents" },
  { id: "policies", labelKey: "workspaceConsole.tabPolicies", fallback: "Policies & sharing" },
  { id: "approvals", labelKey: "workspaceConsole.tabApprovals", fallback: "Approvals" },
];

export default function WorkspaceConsole(): React.JSX.Element {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");
  // Governance session id — set in Settings; drives the approvals inbox.
  const [sessionId, setSessionId] = useState<string | null>(null);
  const data = useWorkspaceConsoleData(sessionId);

  const openExternal = useCallback((): void => {
    if (data.probe?.baseUrl) {
      window.hermesAPI.openExternal(data.probe.baseUrl);
    }
  }, [data.probe?.baseUrl]);

  return (
    <div className="screen workspace-console">
      <div className="workspace-console-header">
        <div>
          <h2>{t("workspaceConsole.title", { defaultValue: "AI Workspace" })}</h2>
          <p className="workspace-console-subtitle">
            {t("workspaceConsole.subtitle", {
              defaultValue:
                "Attach, supervise, configure, and govern the workspace. Chat and files stay in the workspace.",
            })}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            title={t("workspaceConsole.refresh", { defaultValue: "Refresh" })}
            onClick={() => void data.reload()}
          >
            <Refresh size={14} />
            {t("workspaceConsole.refresh", { defaultValue: "Refresh" })}
          </button>
          <button
            className="btn btn-secondary"
            title={t("workspaceConsole.openExternal", {
              defaultValue: "Open in browser",
            })}
            onClick={openExternal}
          >
            <ExternalLink size={14} />
            {t("workspaceConsole.openExternal", { defaultValue: "Open in browser" })}
          </button>
        </div>
      </div>

      <div className="workspace-console-tabs">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            className={`workspace-console-tab ${tab === entry.id ? "active" : ""}`}
            onClick={() => setTab(entry.id)}
          >
            {t(entry.labelKey, { defaultValue: entry.fallback })}
          </button>
        ))}
      </div>

      {data.loading ? (
        <p className="workspace-console-muted">
          {t("common.loading", { defaultValue: "Loading…" })}
        </p>
      ) : (
        <div className="workspace-console-panel">
          {tab === "overview" && <OverviewPanel data={data} />}
          {tab === "settings" && (
            <SettingsPanel
              data={data}
              sessionId={sessionId}
              onSessionId={setSessionId}
            />
          )}
          {tab === "sessions" && <SessionsPanel data={data} />}
          {tab === "policies" && <PoliciesPanel data={data} />}
          {tab === "approvals" && (
            <ApprovalsPanel data={data} sessionId={sessionId} />
          )}
        </div>
      )}
    </div>
  );
}