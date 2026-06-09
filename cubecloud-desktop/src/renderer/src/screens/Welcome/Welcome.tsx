import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Refresh,
  Copy,
  Globe,
  KeyRound,
  Spinner,
} from "../../assets/icons";
import cubecloudWordmark from "../../assets/cubecloud-wordmark.svg";
import {
  WSL_BASH_INSTALL_CMD,
  POWERSHELL_INSTALL_CMD,
} from "../../constants";
import { useI18n } from "../../components/useI18n";
import {
  DesignDialsControl,
  type DesignDials,
} from "../../components/DesignDials";
import {
  DEFAULT_SSH_LOCAL_PORT,
  DEFAULT_SSH_REMOTE_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "../../../../shared/runtime-defaults";
import {
  formatConnectionDiagnosticDetail,
} from "../../../../shared/connection-diagnostics";
import {
  applyGatewayRuntimePresetToRemoteUrl,
  GATEWAY_RUNTIME_PRESETS,
  type GatewayRuntimePresetId,
} from "../../../../shared/gateway-runtime-presets";
import {
  getCachedGatewayRuntimePreset,
  setCachedGatewayRuntimePreset,
} from "../../utils/gatewayRuntimePresetCache";

interface WelcomeProps {
  error: string | null;
  connectionMode: "local" | "remote" | "ssh";
  initialGatewayRuntimePreset?: GatewayRuntimePresetId;
  onStart: () => void;
  onRecheck: () => void;
  onSwitchToLocal: () => void;
}

type ConnectionPanel = "none" | "remote" | "ssh";
type RuntimeProviderSnapshot = Awaited<
  ReturnType<typeof window.hermesAPI.listRuntimeProviders>
>[number];

// ── Install command copy lanes ──────────────────────────
//
// Two separate surfaces, one per host shell. The dual-OS welcome
// shows both at once instead of branching on the running
// platform — the user should always be able to copy whichever
// command matches their actual environment.
// V2.10.44 — keep install-lane labels as literals because the
// INSTALL_LANES const lives at module scope and `t` is only
// available inside the Welcome function. The locale strings
// are still added in welcome.ts (installLaneUnixShell /
// installLaneWindowsShell) so future i18n work has a target.
const INSTALL_LANES = [
  {
    id: "wsl",
    label: "WSL / macOS / Linux",
    command: WSL_BASH_INSTALL_CMD,
    copyKey: "welcome.copyInstallCommand",
    chip: "bash",
  },
  {
    id: "powershell",
    label: "Windows PowerShell",
    command: POWERSHELL_INSTALL_CMD,
    copyKey: "welcome.copyInstallCommand",
    chip: "powershell",
  },
] as const;

function Welcome({
  error,
  connectionMode,
  initialGatewayRuntimePreset,
  onStart,
  onRecheck,
  onSwitchToLocal,
}: WelcomeProps): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const [panel, setPanel] = useState<ConnectionPanel>("none");

  // Design Dials (Step 5). The agent's tone knobs are persisted
  // per-profile via `set-design-dials`; we load them on mount and
  // debounce the writes so dragging a slider doesn't fire 60 IPC
  // calls per second. The 400ms window matches the "saved" flash
  // duration in the component.
  const [dials, setDials] = useState<DesignDials>({
    variance: 35,
    motion: 50,
    density: 55,
  });
  const dialsDebounceRef = useRef<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (window.hermesAPI?.getDesignDials) {
      window.hermesAPI
        .getDesignDials()
        .then((d) => {
          if (!cancelled) setDials(d);
        })
        .catch(() => {
          /* keep defaults on error */
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(
    () => () => {
      if (dialsDebounceRef.current !== null) {
        window.clearTimeout(dialsDebounceRef.current);
      }
    },
    [],
  );
  const handleDialsChange = (next: DesignDials): void => {
    setDials(next);
    if (dialsDebounceRef.current !== null) {
      window.clearTimeout(dialsDebounceRef.current);
    }
    if (!window.hermesAPI?.setDesignDials) return;
    dialsDebounceRef.current = window.setTimeout(() => {
      dialsDebounceRef.current = null;
      void window.hermesAPI.setDesignDials(next);
    }, 400);
  };
  const [runtimeProviders, setRuntimeProviders] = useState<
    RuntimeProviderSnapshot[]
  >([]);

  // Remote state
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remoteApiKey, setRemoteApiKey] = useState("");
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteTesting, setRemoteTesting] = useState(false);
  const [gatewayRuntimePreset, setGatewayRuntimePreset] = useState<
    GatewayRuntimePresetId
  >(() => initialGatewayRuntimePreset ?? getCachedGatewayRuntimePreset());

  // SSH state
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [sshRemotePort, setSshRemotePort] = useState("");
  const [sshApiKey, setSshApiKey] = useState("");
  const [sshError, setSshError] = useState<string | null>(null);
  const [sshTesting, setSshTesting] = useState(false);

  const hermesProvider =
    runtimeProviders.find((provider) => provider.definition.id === "hermes") ??
    null;
  const ironclawProvider =
    runtimeProviders.find(
      (provider) => provider.definition.id === "ironclaw",
    ) ?? null;
  const hermesRuntimeName = hermesProvider?.definition.displayName ?? "Hermes Agent";
  const openclawProvider =
    runtimeProviders.find((provider) => provider.definition.id === "openclaw") ??
    null;
  const openclawRuntimeName =
    openclawProvider?.definition.displayName ?? GATEWAY_RUNTIME_PRESETS.openclaw.displayName;
  const ironclawRuntimeName =
    ironclawProvider?.definition.displayName ?? "IronClaw";
  const selectedGatewayRuntime =
    gatewayRuntimePreset === "hermes"
      ? {
          ...GATEWAY_RUNTIME_PRESETS.hermes,
          displayName: hermesRuntimeName,
        }
      : {
          ...GATEWAY_RUNTIME_PRESETS.openclaw,
          displayName: openclawRuntimeName,
        };

  function persistGatewayRuntimePreset(next: GatewayRuntimePresetId): void {
    setGatewayRuntimePreset(next);
    setCachedGatewayRuntimePreset(next);
  }

  function runtimeDisplayNameFor(
    presetId: GatewayRuntimePresetId,
  ): string {
    return presetId === "openclaw" ? openclawRuntimeName : hermesRuntimeName;
  }

  function applyGatewayRuntimePreset(next: GatewayRuntimePresetId): void {
    persistGatewayRuntimePreset(next);
    setRemoteUrl((current) => applyGatewayRuntimePresetToRemoteUrl(current, next));
    setSshRemotePort(String(GATEWAY_RUNTIME_PRESETS[next].sshRemotePort));
  }

  useEffect(() => {
    void refreshRuntimeProviders();
  }, []);

  async function refreshRuntimeProviders(): Promise<void> {
    try {
      const result = await window.hermesAPI.listRuntimeProviders();
      setRuntimeProviders(result);
    } catch {
      setRuntimeProviders([]);
    }
  }

  async function handleConnectRemote(): Promise<void> {
    const url = remoteUrl.trim();
    const key = remoteApiKey.trim();
    if (!url) {
      setRemoteError(t("welcome.errorPleaseEnterUrl"));
      return;
    }
    setRemoteTesting(true);
    setRemoteError(null);
    try {
      const diagnostic = await window.hermesAPI.diagnoseRemoteConnection(
        url,
        gatewayRuntimePreset,
        key,
      );
      if (diagnostic.ok) {
        const resolvedPreset = diagnostic.runtime ?? gatewayRuntimePreset;
        persistGatewayRuntimePreset(resolvedPreset);
        await window.hermesAPI.setConnectionConfig(
          "remote",
          url,
          key,
          resolvedPreset,
        );
        onRecheck();
      } else {
        const messagePreset = diagnostic.runtime ?? gatewayRuntimePreset;
        setRemoteError(
          formatConnectionDiagnosticDetail({
            diagnostic,
            runtimeDisplayName: runtimeDisplayNameFor(messagePreset),
            runtimePresetId: messagePreset,
          }),
        );
      }
    } catch {
      setRemoteError(t("welcome.errorConnectionTestFailed"));
    } finally {
      setRemoteTesting(false);
    }
  }

  async function handleConnectSsh(): Promise<void> {
    const host = sshHost.trim();
    const user = sshUser.trim();
    if (!host || !user) {
      setSshError(t("welcome.errorHostAndUsernameRequired"));
      return;
    }
    const port = parseInt(sshPort, 10) || 22;
    const remotePort =
      parseInt(sshRemotePort, 10) || selectedGatewayRuntime.sshRemotePort;
    setSshTesting(true);
    setSshError(null);
    try {
      const diagnostic = await window.hermesAPI.diagnoseSshConnection(
        host,
        port,
        user,
        sshKeyPath.trim(),
        remotePort,
        gatewayRuntimePreset,
        sshApiKey.trim(),
      );
      if (diagnostic.ok) {
        const resolvedPreset = diagnostic.runtime ?? gatewayRuntimePreset;
        persistGatewayRuntimePreset(resolvedPreset);
        await window.hermesAPI.setSshConfig(
          host,
          port,
          user,
          sshKeyPath.trim(),
          remotePort,
          DEFAULT_SSH_LOCAL_PORT,
          sshApiKey.trim(),
          resolvedPreset,
        );
        onRecheck();
      } else {
        const messagePreset = diagnostic.runtime ?? gatewayRuntimePreset;
        setSshError(
          formatConnectionDiagnosticDetail({
            diagnostic,
            runtimeDisplayName: runtimeDisplayNameFor(messagePreset),
            runtimePresetId: messagePreset,
          }),
        );
      }
    } catch (e) {
      setSshError("SSH connection test failed: " + (e as Error).message);
    } finally {
      setSshTesting(false);
    }
  }

  function renderBrandHeader(
    title: string,
    subtitle: string,
    compact = false,
  ): React.JSX.Element {
    return (
      <>
        <div className="welcome-brand-shell">
          <img
            src={cubecloudWordmark}
            alt="Cubecloud Agent Desktop"
            className="welcome-brand-wordmark"
          />
          <div className="welcome-brand-product">Agent Desktop</div>
        </div>
        <h1 className={`welcome-title ${compact ? "welcome-title--panel" : ""}`.trim()}>
          {title}
        </h1>
        <p
          className={`welcome-subtitle ${compact ? "welcome-subtitle--panel" : ""}`.trim()}
        >
          {subtitle}
        </p>
      </>
    );
  }

  function renderLocaleSwitch(): React.JSX.Element {
    return (
      <div className="installer-locale-switch" role="group" aria-label="Installer language">
        <button
          type="button"
          className={`installer-locale-option ${locale === "en" ? "active" : ""}`.trim()}
          onClick={() => setLocale("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={`installer-locale-option ${locale === "zh-CN" ? "active" : ""}`.trim()}
          onClick={() => setLocale("zh-CN")}
        >
          中文
        </button>
      </div>
    );
  }

  if (panel === "remote") {
    return (
      <div className="screen welcome-screen">
        {renderLocaleSwitch()}
        {renderBrandHeader(
          t("welcome.connectRemotePanelTitle"),
          gatewayRuntimePreset === "openclaw"
            ? t("welcome.connectRemoteSubtitleOpenclaw", {
                runtime: openclawRuntimeName,
              })
            : t("welcome.connectRemoteSubtitleHermes", {
                runtime: hermesRuntimeName,
              }),
          true,
        )}

        <div className="welcome-remote-card">
          <label className="welcome-remote-label">{t("welcome.runtimeLane")}</label>
          <div className="welcome-remote-row">
            <button
              className={`btn ${gatewayRuntimePreset === "hermes" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => applyGatewayRuntimePreset("hermes")}
            >
              {hermesRuntimeName}
            </button>
            <button
              className={`btn ${gatewayRuntimePreset === "openclaw" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => applyGatewayRuntimePreset("openclaw")}
            >
              {openclawRuntimeName}
            </button>
          </div>
          <p className="welcome-remote-hint welcome-lane-hint">
            {t("welcome.lanePickerHint", {
              ironclaw: ironclawRuntimeName,
            })}
          </p>

          <label className="welcome-remote-label">
            {t("welcome.remoteServerUrl")}
          </label>
          <input
            type="url"
            className="welcome-remote-input"
            placeholder={selectedGatewayRuntime.remoteExampleUrl}
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnectRemote();
            }}
            autoFocus
          />

          <label className="welcome-remote-label welcome-remote-label--spaced">
            {selectedGatewayRuntime.remoteSecretLabel}
          </label>
          <input
            type="password"
            className="welcome-remote-input"
            placeholder={selectedGatewayRuntime.remoteSecretPlaceholder}
            value={remoteApiKey}
            onChange={(e) => setRemoteApiKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleConnectRemote();
            }}
          />

          <div className="welcome-remote-row welcome-remote-row--spaced">
            <button
              className="btn btn-primary welcome-connect-btn"
              onClick={handleConnectRemote}
              disabled={remoteTesting}
            >
              {remoteTesting ? (
                <>
                  {t("welcome.testingConnection")}
                  <Spinner size={14} className="animate-spin" />
                </>
              ) : (
                t("welcome.connect")
              )}
            </button>
          </div>
          {remoteError && (
            <p className="welcome-remote-error welcome-remote-error--multiline">
              {remoteError}
            </p>
          )}
          <p className="welcome-remote-hint">{selectedGatewayRuntime.remoteHint}</p>
        </div>

        <button
          className="btn-ghost welcome-link-btn"
          onClick={() => setPanel("none")}
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  if (panel === "ssh") {
    return (
      <div className="screen welcome-screen">
        {renderLocaleSwitch()}
        {renderBrandHeader(
          t("welcome.connectSshPanelTitle"),
          gatewayRuntimePreset === "openclaw"
            ? t("welcome.connectSshSubtitleOpenclaw", {
                runtime: openclawRuntimeName,
              })
            : t("welcome.connectSshSubtitleHermes", {
                runtime: hermesRuntimeName,
              }),
          true,
        )}

        <div className="welcome-remote-card">
          <label className="welcome-remote-label">{t("welcome.runtimeLane")}</label>
          <div className="welcome-remote-row">
            <button
              className={`btn ${gatewayRuntimePreset === "hermes" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => applyGatewayRuntimePreset("hermes")}
            >
              {hermesRuntimeName}
            </button>
            <button
              className={`btn ${gatewayRuntimePreset === "openclaw" ? "btn-primary" : "btn-secondary"}`}
              type="button"
              onClick={() => applyGatewayRuntimePreset("openclaw")}
            >
              {openclawRuntimeName}
            </button>
          </div>
          <p className="welcome-remote-hint welcome-lane-hint">
            {t("welcome.lanePickerHint", {
              ironclaw: ironclawRuntimeName,
            })}
          </p>

          <div className="welcome-ssh-grid">
            <div className="welcome-ssh-grid-main">
              <label className="welcome-remote-label">{t("welcome.sshHost")}</label>
              <input
                type="text"
                className="welcome-remote-input"
                placeholder={t("welcome.sshHostPlaceholder")}
                value={sshHost}
                onChange={(e) => setSshHost(e.target.value)}
                autoFocus
              />
            </div>
            <div className="welcome-ssh-grid-side">
              <label className="welcome-remote-label">{t("welcome.sshPort")}</label>
              <input
                type="number"
                className="welcome-remote-input"
                placeholder={t("welcome.sshPortPlaceholder")}
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
              />
            </div>
          </div>

          <label className="welcome-remote-label welcome-remote-label--spaced">
            {t("welcome.sshUsername")}
          </label>
          <input
            type="text"
            className="welcome-remote-input"
            placeholder={t("welcome.sshUsernamePlaceholder")}
            value={sshUser}
            onChange={(e) => setSshUser(e.target.value)}
          />

          <label className="welcome-remote-label welcome-remote-label--spaced">
            {t("welcome.sshKeyPath")}{" "}
            <span className="welcome-field-note">
              {t("welcome.sshKeyPathNote")}
            </span>
          </label>
          <input
            type="text"
            className="welcome-remote-input"
            placeholder={t("welcome.sshKeyPathPlaceholder")}
            value={sshKeyPath}
            onChange={(e) => setSshKeyPath(e.target.value)}
          />

          <label className="welcome-remote-label welcome-remote-label--spaced">
            {t("welcome.sshRemotePort")}{" "}
            <span className="welcome-field-note">
              {t("welcome.sshRemotePortNote", {
                port: selectedGatewayRuntime.sshRemotePort,
              })}
            </span>
          </label>
          <input
            type="number"
            className="welcome-remote-input"
            placeholder={String(selectedGatewayRuntime.sshRemotePort)}
            value={sshRemotePort}
            onChange={(e) => setSshRemotePort(e.target.value)}
          />
          <p className="welcome-remote-hint">
            {gatewayRuntimePreset === "openclaw"
              ? t("welcome.sshRuntimeOpenclawNote", {
                  runtime: openclawRuntimeName,
                  port: OPENCLAW_LOCAL_GATEWAY_PORT,
                })
              : t("welcome.sshRuntimeHermesNote", {
                  runtime: hermesRuntimeName,
                  port: DEFAULT_SSH_REMOTE_PORT,
                })}
          </p>

          <label className="welcome-remote-label welcome-remote-label--spaced">
            {selectedGatewayRuntime.sshSecretLabel}
            <span className="welcome-field-note">
              {gatewayRuntimePreset === "openclaw"
                ? t("welcome.sshSecretOpenclawNote")
                : t("welcome.sshSecretHermesNote")}
            </span>
          </label>
          <input
            type="password"
            className="welcome-remote-input"
            placeholder={selectedGatewayRuntime.remoteSecretPlaceholder}
            value={sshApiKey}
            onChange={(e) => setSshApiKey(e.target.value)}
          />

          <div className="welcome-remote-row welcome-remote-row--spaced">
            <button
              className="btn btn-primary welcome-connect-btn"
              onClick={handleConnectSsh}
              disabled={sshTesting || !sshHost.trim() || !sshUser.trim()}
            >
              {sshTesting ? (
                <>
                  {t("welcome.testingSshConnection")}
                  <Spinner size={14} className="animate-spin" />
                </>
              ) : (
                <>
                  {t("welcome.connectViaSsh")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>

          {sshError && (
            <p className="welcome-remote-error welcome-remote-error--multiline">
              {sshError}
            </p>
          )}

          <p className="welcome-remote-hint">
            {t("welcome.sshSystemHint", {
              user: sshUser || "user",
              host: sshHost || "host",
            })}{" "}
            {selectedGatewayRuntime.sshSecretHint}
          </p>
        </div>

        <button
          className="btn-ghost welcome-link-btn"
          onClick={() => setPanel("none")}
        >
          {t("common.back")}
        </button>
      </div>
    );
  }

  return (
    <div className="screen welcome-screen">
      {renderLocaleSwitch()}
      {error ? (
        <>
          {renderBrandHeader(
            connectionMode === "local"
              ? t("welcome.errorLocalInstallHeader")
              : connectionMode === "ssh"
                ? t("welcome.errorSshHeader", {
                    runtime: runtimeDisplayNameFor(gatewayRuntimePreset),
                  })
                : t("welcome.errorRemoteHeader", {
                    runtime: runtimeDisplayNameFor(gatewayRuntimePreset),
                  }),
            error,
          )}
          {connectionMode === "local" ? (
            <>
              <div className="welcome-actions">
                <button
                  className="btn btn-primary welcome-button"
                  onClick={onStart}
                >
                  {t("welcome.retryLocalInstall")}
                  <Refresh size={16} />
                </button>
                <div className="welcome-divider">
                  <span>{t("welcome.dividerOr")}</span>
                </div>
                <div className="welcome-install-grid welcome-install-grid--error">
                  {INSTALL_LANES.map((lane) => (
                    <div key={lane.id} className="welcome-install-lane">
                      <div className="welcome-install-lane-header">
                        <span>{lane.label}</span>
                        <span className="welcome-install-lane-chip">{lane.chip}</span>
                      </div>
                      <div className="welcome-install-lane-command">
                        <code>{lane.command}</code>
                        <button
                          className="welcome-install-lane-copy"
                          onClick={() =>
                            navigator.clipboard.writeText(lane.command)
                          }
                          title={t(lane.copyKey)}
                          aria-label={t(lane.copyKey)}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-secondary welcome-recheck-btn"
                  onClick={onRecheck}
                >
                  {t("welcome.recheck")}
                </button>
                <div className="welcome-divider">
                  <span>{t("welcome.dividerOr")}</span>
                </div>
                <button
                  className="btn btn-secondary welcome-recheck-btn"
                  onClick={() => setPanel("ssh")}
                >
                  <KeyRound size={16} />
                  {t("welcome.connectViaSshShort")}
                </button>
                <button
                  className="btn btn-secondary welcome-recheck-btn"
                  onClick={() => setPanel("remote")}
                >
                  <Globe size={16} />
                  {t("welcome.connectToRemoteGatewayShort")}
                </button>
              </div>
            </>
          ) : (
            <div className="welcome-actions">
              <button
                className="btn btn-primary welcome-button"
                onClick={onRecheck}
              >
                {connectionMode === "ssh"
                  ? t("welcome.retrySshConnection")
                  : t("welcome.retryRemoteConnection")}
                <Refresh size={16} />
              </button>
              <button
                className="btn btn-secondary welcome-recheck-btn"
                onClick={() => setPanel(connectionMode === "ssh" ? "ssh" : "remote")}
              >
                {connectionMode === "ssh"
                  ? t("welcome.reviewSshSettings")
                  : t("welcome.reviewRemoteSettings")}
              </button>
              <button
                className="btn btn-secondary welcome-recheck-btn"
                onClick={onSwitchToLocal}
              >
                {t("welcome.switchToLocal")}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {renderBrandHeader(
            t("welcome.flowTitle"),
            t("welcome.subtitle"),
          )}

          <ol className="welcome-step-indicator" aria-label="Welcome steps">
            <li className="welcome-step-indicator-step welcome-step-indicator-step--current">
              <span className="welcome-step-indicator-number">1</span>
              <span className="welcome-step-indicator-label">{t("welcome.flowStepInstall")}</span>
            </li>
            <li className="welcome-step-indicator-step">
              <span className="welcome-step-indicator-number">2</span>
              <span className="welcome-step-indicator-label">{t("welcome.flowStepConnect")}</span>
            </li>
            <li className="welcome-step-indicator-step">
              <span className="welcome-step-indicator-number">3</span>
              <span className="welcome-step-indicator-label">{t("welcome.flowStepDone")}</span>
            </li>
          </ol>

          <DesignDialsControl value={dials} onChange={handleDialsChange} />

          <div className="welcome-cta-stack">
            <span className="welcome-cta-eyebrow">
              {t("welcome.flowStepInstall")}
            </span>
            <button
              className="btn btn-primary welcome-cta-install"
              onClick={onStart}
              data-testid="welcome-install-cta"
            >
              {t("welcome.installLocalRuntime")}
              <ArrowRight size={18} />
            </button>
            <p className="welcome-note welcome-cta-hint">
              {t("welcome.installSizeHint")}
            </p>
            <p className="welcome-note welcome-note--secondary">
              {t("welcome.addOnRuntimesNote")}
            </p>
          </div>

          <div className="welcome-divider">
            <span>{t("welcome.terminalTitle", { runtime: hermesRuntimeName })}</span>
          </div>

          {/* Dual-OS install lanes (Fix 3 + Welcome redesign).
           *
           *  Instead of switching on the running platform and
           *  showing a single curl/iex command, we show BOTH the
           *  bash (WSL / macOS / Linux) and the PowerShell
           *  variants side by side. The user picks whichever
           *  matches their actual environment, copies it, and
           *  pastes it into their terminal. The URL is the
           *  canonical hermes-agent.nousresearch.com download
           *  regardless of locale. */}
          <div className="welcome-install-grid">
            {INSTALL_LANES.map((lane) => (
              <div key={lane.id} className="welcome-install-lane">
                <div className="welcome-install-lane-header">
                  <span>{lane.label}</span>
                  <span className="welcome-install-lane-chip">{lane.chip}</span>
                </div>
                <div className="welcome-install-lane-command">
                  <code>{lane.command}</code>
                  <button
                    className="welcome-install-lane-copy"
                    onClick={() =>
                      navigator.clipboard.writeText(lane.command)
                    }
                    title={t(lane.copyKey)}
                    aria-label={t(lane.copyKey)}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="welcome-note welcome-note--secondary welcome-install-footnote">
            {t("welcome.terminalInstallHint", { runtime: hermesRuntimeName })}
          </p>

          <div className="welcome-divider">
            <span>{t("welcome.dividerOr")}</span>
          </div>

          <button
            className="btn btn-secondary welcome-recheck-btn"
            onClick={() => setPanel("ssh")}
          >
            <KeyRound size={16} />
            {t("welcome.connectViaSshShort")}
          </button>

          <button
            className="btn btn-secondary welcome-recheck-btn"
            onClick={() => setPanel("remote")}
          >
            <Globe size={16} />
            {t("welcome.connectToRemoteGatewayShort")}
          </button>
        </>
      )}
    </div>
  );
}

export default Welcome;
