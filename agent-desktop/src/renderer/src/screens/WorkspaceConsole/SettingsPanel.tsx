// Settings panel — env provisioning (M2) + the governance session id.
//
// Provisioning writes an env fragment the workspace reads on next start.
// Secrets are fingerprinted by the main process and the key is cleared
// from component state immediately after the write, so it is never
// echoed back into the DOM.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useState } from "react";
import { useI18n } from "../../components/useI18n";
import type { WorkspaceConsoleState } from "./useWorkspaceConsoleData";

export default function SettingsPanel({
  sessionId,
  onSessionId,
}: {
  data: WorkspaceConsoleState;
  sessionId: string | null;
  onSessionId: (value: string | null) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [hermesUrl, setHermesUrl] = useState("");
  const [hermesKey, setHermesKey] = useState("");
  const [localSingleUser, setLocalSingleUser] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const provision = async (): Promise<void> => {
    setBusy(true);
    try {
      const res = await window.hermesAPI.workspaceProvisionEnv(
        {
          workspaceBaseUrl: "",
          hermesBaseUrl: hermesUrl || null,
          hermesApiKey: hermesKey || null,
          localSingleUser,
        },
        { write: true },
      );
      setStatus(res.written ? "written" : (res.error ?? "blocked"));
      setHermesKey(""); // never keep the secret in state after the write
    } catch (err) {
      setStatus(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="workspace-console-panel">
      <div className="workspace-console-card">
        <p className="workspace-console-muted">
          {t("workspaceConsole.provisionHint", {
            defaultValue:
              "Writes the workspace's env fragment on next start. Secrets are stored as fingerprints only, never echoed back.",
          })}
        </p>
        <label htmlFor="provisionHermesUrl">
          {t("workspaceConsole.provisionHermesUrl", {
            defaultValue: "Hermes gateway URL",
          })}
        </label>
        <input
          id="provisionHermesUrl"
          className="workspace-console-input"
          aria-label="provisionHermesUrl"
          value={hermesUrl}
          onChange={(e) => setHermesUrl(e.target.value)}
        />
        <label htmlFor="provisionHermesKey">
          {t("workspaceConsole.provisionHermesKey", {
            defaultValue: "Hermes API key",
          })}
        </label>
        <input
          id="provisionHermesKey"
          className="workspace-console-input"
          type="password"
          aria-label="provisionHermesKey"
          value={hermesKey}
          onChange={(e) => setHermesKey(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={localSingleUser}
            onChange={(e) => setLocalSingleUser(e.target.checked)}
          />{" "}
          {t("workspaceConsole.provisionLocalSingleUser", {
            defaultValue: "Single-user local mode",
          })}
        </label>
        <button
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void provision()}
        >
          {t("workspaceConsole.provisionWrite", { defaultValue: "Provision" })}
        </button>
        {status && (
          <p className="workspace-console-muted">
            {status === "written"
              ? t("workspaceConsole.provisionWritten", {
                  defaultValue: "Provisioned",
                })
              : status}
          </p>
        )}
      </div>

      <div className="workspace-console-card">
        <label htmlFor="governanceSession">
          {t("workspaceConsole.approvalsTitle", { defaultValue: "Approval inbox" })}
          {" — session id"}
        </label>
        <input
          id="governanceSession"
          className="workspace-console-input"
          aria-label="governanceSession"
          placeholder="session id"
          value={sessionId ?? ""}
          onChange={(e) => onSessionId(e.target.value || null)}
        />
      </div>
    </div>
  );
}
