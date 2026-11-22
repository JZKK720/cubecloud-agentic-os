// ManagedAppsPanel.tsx — the roster of every managed app, with its live state.
//
// WHY THIS EXISTS: the kernel has seeded a `listManagedApps` capability and 18
// per-app health routes, and the DataFlow and Kitesurf adapters were written,
// registered and tested — but NOTHING rendered them. Zero renderer file
// referenced the registry, so every adapter was invisible no matter how
// correct its code was. This panel is the missing consumer.
//
// It reads identity from `listManagedApps` (id, label, mode, discovery) and adds
// the per-app health line where one is worth showing. A card never claims more
// than the adapter's declared capabilities.
//
// Presentation reuses the existing Tools-screen section pattern
// (`.tools-section-divider`, `.tools-agent-reach*`) rather than inventing a card
// component, and the documented status-pill treatment
// (`CheckCircle`/`XCircle` + `--success`/`--error`) for the state.

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, Refresh } from "../assets/icons";
import { useI18n } from "./useI18n";

interface ManagedAppRow {
  id: string;
  label: string;
  mode: string;
  discovery: {
    state: "found" | "not-found" | "auth-required";
    detail: string;
    scannedAt: string;
  };
}

export function ManagedAppsPanel(): React.JSX.Element {
  const { t } = useI18n();
  const [apps, setApps] = useState<ManagedAppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // The bridge degrades an unseeded method to a Promise, and the kernel
      // seeds listManagedApps — but in the Electron app it may not be wired yet.
      const res = (await window.hermesAPI.listManagedApps()) as {
        apps?: ManagedAppRow[];
        success?: boolean;
        degraded?: boolean;
      };
      if (!res || res.degraded || !Array.isArray(res.apps)) {
        setApps([]);
        setError(t("tools.managedApps.unavailable"));
        return;
      }
      setApps(res.apps);
    } catch (err) {
      setApps([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.managedApps.title", {
              defaultValue: "Managed apps",
            })}
          </h3>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            <Refresh size={14} /> {t("tools.managedApps.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.managedApps.subtitle", {
            defaultValue:
              "Every app the desktop can attach to, with the state its adapter reports. Read-only: the desktop mirrors these services, it does not manage them.",
          })}
        </p>

        {error && (
          <div className="tools-agent-reach-not-installed">{error}</div>
        )}

        {!error && loading && apps.length === 0 && (
          <p className="tools-agent-reach-subtitle">
            {t("tools.managedApps.loading", { defaultValue: "Reading roster…" })}
          </p>
        )}

        {!error && !loading && apps.length === 0 && (
          <div className="tools-agent-reach-not-installed">
            {t("tools.managedApps.empty", {
              defaultValue: "No managed apps are registered.",
            })}
          </div>
        )}

        {apps.length > 0 && (
          <ul className="managed-apps-list">
            {apps.map((app) => {
              const found = app.discovery.state === "found";
              const pending = app.discovery.state === "auth-required";
              return (
                <li key={app.id} className="managed-app-row" data-state={app.discovery.state}>
                  <div className="managed-app-row-head">
                    <code className="managed-app-id">{app.id}</code>
                    <span className="managed-app-name">{app.label}</span>
                    <span className="managed-app-mode">{app.mode}</span>
                    <span
                      className={
                        found
                          ? "tools-agent-reach-installed"
                          : "tools-agent-reach-not-installed"
                      }
                    >
                      {found ? <CheckCircle size={14} /> : <XCircle size={14} />}
                      {pending
                        ? t("tools.managedApps.needsAuth", { defaultValue: "needs setup" })
                        : app.discovery.state}
                    </span>
                  </div>
                  {/* The adapter's own detail line. Carries the DataFlow and
                      Kitesurf security warnings, which is where the operator
                      must see them. */}
                  <p className="managed-app-detail">{app.discovery.detail}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
