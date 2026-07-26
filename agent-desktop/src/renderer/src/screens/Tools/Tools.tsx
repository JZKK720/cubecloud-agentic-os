import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../components/useI18n";
import { Refresh, CheckCircle, XCircle, Alert as AlertIcon } from "../../assets/icons";

interface ToolsetInfo {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface AgentReachChannel {
  name: string;
  status: "ok" | "error" | "not-configured";
  backend: string | null;
  detail: string | null;
}

interface AgentReachStatus {
  installed: boolean;
  version: string | null;
  detectedCommand: string | null;
  channels: AgentReachChannel[];
  error: string | null;
}

interface ToolsProps {
  profile?: string;
}

// SVG icons per toolset key
const TOOL_ICONS: Record<string, React.JSX.Element> = {
  web: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  browser: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 3v6" />
    </svg>
  ),
  terminal: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="m7 10 3 3-3 3M13 16h4" />
    </svg>
  ),
  file: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  code_execution: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  ),
  vision: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  image_gen: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  tts: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  skills: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02z" />
    </svg>
  ),
  memory: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
      <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
      <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    </svg>
  ),
  session_search: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  ),
  clarify: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  delegation: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  cronjob: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  moa: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  ),
  todo: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
};

function ToolIcon({ toolKey }: { toolKey: string }): React.JSX.Element {
  return (
    <div className="tools-card-icon">
      {TOOL_ICONS[toolKey] || (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )}
    </div>
  );
}

function Tools({ profile }: ToolsProps): React.JSX.Element {
  const { t } = useI18n();
  const [toolsets, setToolsets] = useState<ToolsetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentReach, setAgentReach] = useState<AgentReachStatus | null>(null);
  const [agentReachLoading, setAgentReachLoading] = useState(false);
  const [last30days, setLast30days] = useState<{
    found: boolean;
    scriptPath: string | null;
    cliOnPath: boolean;
    version: string | null;
  } | null>(null);
  const [gbrain, setGbrain] = useState<{
    installed: boolean;
    healthy: boolean;
    version: string | null;
    failingChecks: number;
    totalChecks: number;
    summary: string;
  } | null>(null);
  const [browserHarness, setBrowserHarness] = useState<{
    installed: boolean;
    detectedCommand: string | null;
    doctorOk: boolean | null;
    doctorOutput: string | null;
  } | null>(null);
  const [officecli, setOfficecli] = useState<{
    installed: boolean;
    detectedCommand: string | null;
  } | null>(null);
  const [graphify, setGraphify] = useState<{
    installed: boolean;
    detectedCommand: string | null;
    version: string | null;
  } | null>(null);

  const loadToolsets = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await window.hermesAPI.getToolsets(profile);
      setToolsets(list);
    } catch {
      setToolsets([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const loadAgentReach = useCallback(async (): Promise<void> => {
    setAgentReachLoading(true);
    try {
      const status = await window.hermesAPI.agentReachProbe();
      setAgentReach(status);
    } catch {
      setAgentReach(null);
    } finally {
      setAgentReachLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToolsets();
    loadAgentReach();
    void window.hermesAPI
      .discoverLast30Days()
      .then((s) => setLast30days(s))
      .catch(() => setLast30days(null));
    void window.hermesAPI
      .gbrainProbe()
      .then((s) => setGbrain(s))
      .catch(() => setGbrain(null));
    void window.hermesAPI
      .discoverBrowserHarness()
      .then(async (disc) => {
        if (disc.installed) {
          try {
            const doc = await window.hermesAPI.browserHarnessDoctor();
            setBrowserHarness({
              installed: true,
              detectedCommand: disc.detectedCommand,
              doctorOk: doc.ok,
              doctorOutput: doc.output.slice(0, 300),
            });
          } catch {
            setBrowserHarness({
              installed: true,
              detectedCommand: disc.detectedCommand,
              doctorOk: null,
              doctorOutput: null,
            });
          }
        } else {
          setBrowserHarness({
            installed: false,
            detectedCommand: null,
            doctorOk: null,
            doctorOutput: null,
          });
        }
      })
      .catch(() => setBrowserHarness(null));
    void window.hermesAPI
      .discoverAgentClis()
      .then((disc) => {
        const oc = disc.items.find((i) => i.id === "officecli");
        setOfficecli(
          oc
            ? { installed: oc.installed, detectedCommand: oc.detectedCommand }
            : { installed: false, detectedCommand: null },
        );
      })
      .catch(() => setOfficecli(null));
    void window.hermesAPI
      .graphifyDiscover()
      .then(async (disc) => {
        if (disc.installed) {
          try {
            const ver = await window.hermesAPI.graphifyVersion();
            setGraphify({
              installed: true,
              detectedCommand: disc.detectedCommand,
              version: ver.version,
            });
          } catch {
            setGraphify({
              installed: true,
              detectedCommand: disc.detectedCommand,
              version: null,
            });
          }
        } else {
          setGraphify({
            installed: false,
            detectedCommand: null,
            version: null,
          });
        }
      })
      .catch(() => setGraphify(null));
  }, [loadToolsets, loadAgentReach]);

  async function handleToggle(
    key: string,
    currentEnabled: boolean,
  ): Promise<void> {
    // Optimistic update — rollback on IPC failure so the toggle
    // doesn't desync from the backend state.
    setToolsets((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !currentEnabled } : t)),
    );
    try {
      await window.hermesAPI.setToolsetEnabled(key, !currentEnabled, profile);
    } catch {
      setToolsets((prev) =>
        prev.map((t) => (t.key === key ? { ...t, enabled: currentEnabled } : t)),
      );
    }
  }

  if (loading) {
    return (
      <div className="tools-container">
        <div className="tools-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="tools-container">
      <div className="tools-header">
        <h2 className="tools-title">{t("tools.title")}</h2>
        <p className="tools-subtitle">{t("tools.subtitle")}</p>
      </div>

      <div className="tools-grid">
        {toolsets.length === 0 ? (
          <div className="tools-empty">
            <p className="tools-empty-text">{t("tools.empty")}</p>
            <p className="tools-empty-hint">{t("tools.emptyHint")}</p>
          </div>
        ) : (
          toolsets.map((t) => (
            <div
              key={t.key}
              className={`tools-card ${t.enabled ? "tools-card-enabled" : "tools-card-disabled"}`}
              onClick={() => handleToggle(t.key, t.enabled)}
            >
              <div className="tools-card-top">
                <ToolIcon toolKey={t.key} />
                <label
                  className="tools-toggle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={() => handleToggle(t.key, t.enabled)}
                  />
                  <span className="tools-toggle-track" />
                </label>
              </div>
              <div className="tools-card-label">{t.label}</div>
              <div className="tools-card-description">{t.description}</div>
            </div>
          ))
        )}
      </div>

      {/* V2.10.66 — Agent-Reach internet capability status */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.agentReachTitle", { defaultValue: "Internet Capabilities (Agent-Reach)" })}
          </h3>
          <button
            className="btn btn-secondary tools-agent-reach-refresh"
            onClick={loadAgentReach}
            disabled={agentReachLoading}
          >
            <Refresh size={14} />
            {agentReachLoading
              ? t("tools.agentReachScanning", { defaultValue: "Scanning..." })
              : t("tools.agentReachRefresh", { defaultValue: "Refresh" })}
          </button>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t(
            "tools.agentReachSubtitle",
            { defaultValue: "Agent-Reach gives your runtime agent internet access — Twitter, Reddit, YouTube, GitHub, RSS, web search, and more. Install it on the gateway machine with: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git" },
          )}
        </p>
        {agentReach?.installed ? (
          <div className="tools-agent-reach-status">
            <span className="tools-agent-reach-installed">
              <CheckCircle size={14} /> {t("tools.agentReachInstalled", { defaultValue: "Installed" })}
              {agentReach.version && ` (v${agentReach.version})`}
            </span>
            {agentReach.channels.length > 0 && (
              <div className="tools-agent-reach-channels">
                {agentReach.channels.map((ch) => (
                  <div
                    key={ch.name}
                    className={`tools-agent-reach-channel tools-agent-reach-channel-${ch.status}`}
                  >
                    <span className="tools-agent-reach-channel-name">{ch.name}</span>
                    {ch.backend && (
                      <span className="tools-agent-reach-channel-backend">{ch.backend}</span>
                    )}
                    {ch.status === "ok" ? (
                      <CheckCircle size={12} className="tools-agent-reach-channel-ok" />
                    ) : ch.status === "error" ? (
                      <XCircle size={12} className="tools-agent-reach-channel-err" />
                    ) : (
                      <span className="tools-agent-reach-channel-pending">—</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {agentReach.error && (
              <div className="tools-agent-reach-error">
                <AlertIcon size={12} /> {agentReach.error}
              </div>
            )}
          </div>
        ) : agentReach ? (
          <div className="tools-agent-reach-not-installed">
            {t(
              "tools.agentReachNotInstalled",
              { defaultValue: "Agent-Reach is not installed. The runtime agent does not have internet capability tools." },
            )}
          </div>
        ) : null}
      </div>

      {/* Last30Days research engine status */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            Last 30 Days (Research Engine)
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          AI-agent-led research engine that aggregates what people are
          saying about any topic across the last 30 days, scored by
          engagement. Zero pip dependencies, Python 3.12+ stdlib only.
          Sources: Reddit, HN, YouTube, GitHub, Polymarket, arXiv, Digg,
          StockTwits — all keyless.
        </p>
        {last30days?.found ? (
          <div className="tools-agent-reach-status">
            <span className="tools-agent-reach-installed">
              <CheckCircle size={14} /> Installed
              {last30days.version && ` (${last30days.version})`}
            </span>
            {last30days.scriptPath && (
              <p className="tools-agent-reach-subtitle">
                Script: <code>{last30days.scriptPath}</code>
              </p>
            )}
            {last30days.cliOnPath && !last30days.scriptPath && (
              <p className="tools-agent-reach-subtitle">
                CLI on PATH
              </p>
            )}
          </div>
        ) : last30days ? (
          <div className="tools-agent-reach-not-installed">
            Last 30 Days is not installed. Clone the repo into
            <code> .agents/skills/last30days/ </code>
            or install via pip. Zero API keys needed for core sources.
          </div>
        ) : null}
      </div>

      {/* GBrain persistent memory status */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.gbrain.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.gbrain.subtitle")}
        </p>
        {gbrain?.installed ? (
          <div className="tools-agent-reach-status">
            <span
              className={
                gbrain.healthy
                  ? "tools-agent-reach-installed"
                  : "tools-agent-reach-error"
              }
            >
              {gbrain.healthy ? (
                <CheckCircle size={14} />
              ) : (
                <XCircle size={14} />
              )}
              {gbrain.healthy
                ? t("tools.panels.gbrain.healthy")
                : t("tools.panels.gbrain.unhealthy")}
              {gbrain.version && ` (${gbrain.version})`}
            </span>
            <p className="tools-agent-reach-subtitle">{gbrain.summary}</p>
          </div>
        ) : gbrain ? (
          <div className="tools-agent-reach-not-installed"
            dangerouslySetInnerHTML={{
              __html: t("tools.panels.gbrain.notInstalled"),
            }}
          />
        ) : null}
      </div>

      {/* Wigolo local-first web intelligence */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.wigolo.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.wigolo.subtitle")}
        </p>
        <div className="tools-agent-reach-status">
          <span className="tools-agent-reach-subtitle">
            {t("tools.panels.wigolo.hint")}
          </span>
        </div>
      </div>

      {/* Watch-Skill video intelligence */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.watchSkill.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.watchSkill.subtitle")}
        </p>
        <div className="tools-agent-reach-status">
          <span
            className="tools-agent-reach-subtitle"
            dangerouslySetInnerHTML={{
              __html: t("tools.panels.watchSkill.hint"),
            }}
          />
        </div>
      </div>

      {/* Browser Harness + Browser Use */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.browserHarness.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.browserHarness.subtitle")}
        </p>
        {browserHarness?.installed ? (
          <div className="tools-agent-reach-status">
            <span
              className={
                browserHarness.doctorOk === false
                  ? "tools-agent-reach-error"
                  : "tools-agent-reach-installed"
              }
            >
              {browserHarness.doctorOk === false ? (
                <XCircle size={14} />
              ) : (
                <CheckCircle size={14} />
              )}
              {t("tools.panels.browserHarness.installed")}
              {browserHarness.detectedCommand &&
                ` (${browserHarness.detectedCommand})`}
              {browserHarness.doctorOk === false
                ? t("tools.panels.browserHarness.doctorIssues")
                : browserHarness.doctorOk === true
                  ? t("tools.panels.browserHarness.doctorOk")
                  : t("tools.panels.browserHarness.doctorNotRun")}
            </span>
            {browserHarness.doctorOutput && (
              <p className="tools-agent-reach-subtitle">
                <code>{browserHarness.doctorOutput}</code>
              </p>
            )}
            <p
              className="tools-agent-reach-subtitle"
              dangerouslySetInnerHTML={{
                __html: t("tools.panels.browserHarness.hint"),
              }}
            />
          </div>
        ) : browserHarness ? (
          <div
            className="tools-agent-reach-not-installed"
            dangerouslySetInnerHTML={{
              __html: t("tools.panels.browserHarness.notInstalled"),
            }}
          />
        ) : null}
      </div>

      {/* OfficeCLI — Office document creation/editing */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.officecli.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.officecli.subtitle")}
        </p>
        {officecli?.installed ? (
          <div className="tools-agent-reach-status">
            <span className="tools-agent-reach-installed">
              <CheckCircle size={14} /> {t("tools.panels.officecli.installed")}
              {officecli.detectedCommand &&
                ` (${officecli.detectedCommand})`}
            </span>
            <p
              className="tools-agent-reach-subtitle"
              dangerouslySetInnerHTML={{
                __html: t("tools.panels.officecli.hint"),
              }}
            />
          </div>
        ) : officecli ? (
          <div
            className="tools-agent-reach-not-installed"
            dangerouslySetInnerHTML={{
              __html: t("tools.panels.officecli.notInstalled"),
            }}
          />
        ) : null}
      </div>

      {/* Graphify — concept knowledge graph */}
      <div className="tools-section-divider" />
      <div className="tools-agent-reach">
        <div className="tools-agent-reach-header">
          <h3 className="tools-agent-reach-title">
            {t("tools.panels.graphify.title")}
          </h3>
        </div>
        <p className="tools-agent-reach-subtitle">
          {t("tools.panels.graphify.subtitle")}
        </p>
        {graphify?.installed ? (
          <div className="tools-agent-reach-status">
            <span className="tools-agent-reach-installed">
              <CheckCircle size={14} /> {t("tools.panels.graphify.installed")}
              {graphify.detectedCommand &&
                ` (${graphify.detectedCommand})`}
              {graphify.version && ` v${graphify.version}`}
            </span>
            <p
              className="tools-agent-reach-subtitle"
              dangerouslySetInnerHTML={{
                __html: t("tools.panels.graphify.hint"),
              }}
            />
          </div>
        ) : graphify ? (
          <div
            className="tools-agent-reach-not-installed"
            dangerouslySetInnerHTML={{
              __html: t("tools.panels.graphify.notInstalled"),
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export default Tools;
