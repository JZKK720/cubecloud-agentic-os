// WorkspaceConsole screen — the embedded AI Workspace (contract row C, P2).
//
// Renders a hardened `<webview>` pointed at the loopback workspace origin
// (from `workspaceConsoleUrl`). Security rules (all enforced):
//   - Only loopback http origins (ports 1024–65535) — the same allow-list
//     class as `isAllowedWebviewUrl`, which the main process already gates
//     on `will-attach-webview`.
//   - Guest keeps no preload; sandbox/contextIsolation/webSecurity are
//     forced by `hardenWebviewPreferences` in the main process.
//   - window.open denied; navigation gated via `hardenAttachedWebContents`.
//
// The supervisor card on Tools owns lifecycle; this screen only embeds.
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Refresh } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";

export default function WorkspaceConsole(): React.JSX.Element {
  const { t } = useI18n();
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    window.hermesAPI
      .workspaceConsoleUrl()
      .then((url) => {
        if (!cancelled) setEmbedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openExternal = useCallback(() => {
    if (embedUrl) {
      window.hermesAPI.openExternal(embedUrl);
    }
  }, [embedUrl]);

  if (loadFailed || !embedUrl) {
    return (
      <div className="screen workspace-console">
        <h2>{t("workspaceConsole.title", { defaultValue: "AI Workspace" })}</h2>
        <p className="workspace-console-hint">
          {t("workspaceConsole.unavailable", {
            defaultValue:
              "The AI Workspace origin is unavailable. Start the server from Tools → AI Workspace.",
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="screen workspace-console">
      <div className="workspace-console-header">
        <h2>{t("workspaceConsole.title", { defaultValue: "AI Workspace" })}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            onClick={() => setReloadKey((k) => k + 1)}
            title={t("workspaceConsole.reload", { defaultValue: "Reload" })}
          >
            <Refresh size={14} />
            {t("workspaceConsole.reload", { defaultValue: "Reload" })}
          </button>
          <button
            className="btn btn-secondary"
            onClick={openExternal}
            title={t("workspaceConsole.openExternal", { defaultValue: "Open in browser" })}
          >
            <ExternalLink size={14} />
            {t("workspaceConsole.openExternal", { defaultValue: "Open in browser" })}
          </button>
        </div>
      </div>
      <webview
        key={reloadKey}
        src={embedUrl}
        className="workspace-console-embed"
        // Hardened in the main process via hardenWebviewPreferences
        // (will-attach-webview) and hardenAttachedWebContents.
      />
    </div>
  );
}