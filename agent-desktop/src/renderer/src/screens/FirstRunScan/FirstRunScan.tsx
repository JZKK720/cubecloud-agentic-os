// FirstRunScan screen — scan-first onboarding (docs/plans/2026-10-07-
// scan-first-onboarding-redesign.md). Replaces the Setup wizard as the
// first-run surface: the console scans for the AI Workspace (the
// doctrine's first brain) instead of asking the user to wire a gateway
// or paste an LLM key — that configuration belongs to the workspace.
//
// Three phases:
//   scan      — parallel probes (workspace origin + local server ports)
//   found     — one consent click (doctrine row G: attach is a consent
//               moment, never silent auto-connect)
//   not-found — three doors: Docker quickstart / re-scan / manual URL
//
// Every capability used here is kernel-seeded, so the browser console
// at :6770 gets the identical flow through the generated shim.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Copy,
  ExternalLink,
  Refresh,
  Search,
  Settings,
  Signal,
  Spinner,
} from "../../assets/icons";
import cubecloudWordmark from "../../assets/cubecloud-wordmark.svg";
import { useI18n } from "../../components/useI18n";

type Phase = "scanning" | "found" | "not-found" | "connected";

interface FirstRunScanProps {
  /** Fired once the user consents to attach (or skips to the legacy wizard). */
  onComplete: () => void;
  /** Fired when the user chooses the demoted legacy gateway wizard. */
  onLegacySetup: () => void;
}

/** The compose quickstart command shown on the not-found door 1. Kept in
 *  sync with the workspace repo's quickstart; copy-only, never executed. */
const DOCKER_QUICKSTART_CMD =
  "docker compose -f docker-compose.quickstart.yaml -p cubecloud-agent-full up -d";

/** Per-probe timeout for the scan phase (doc §7: the not-found screen
 *  must always be reachable, so every probe is bounded). */
const SCAN_TIMEOUT_MS = 3_000;

/** Session-list page size for the found-card count. The card shows the
 *  live first page as an activity indicator, not an audit total. */
const SESSION_COUNT_PAGE_SIZE = 50;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

function FirstRunScan({
  onComplete,
  onLegacySetup,
}: FirstRunScanProps): React.JSX.Element {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [scanSeq, setScanSeq] = useState(0);
  const [probe, setProbe] = useState<Awaited<
    ReturnType<typeof window.hermesAPI.workspaceProbe>
  > | null>(null);
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<
    Awaited<ReturnType<typeof window.hermesAPI.scanLocalServers>>["suggestions"]
  >([]);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showDocker, setShowDocker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const runScan = useCallback(async (): Promise<void> => {
    setPhase("scanning");
    setProbe(null);
    setSessionCount(null);
    setAgentCount(null);
    setConnectError(null);

    // Probe the default workspace origin and the local server ports in
    // parallel; each is individually bounded so a dead port can never
    // wedge the screen (doc §7 Wrong #5).
    const [probeResult, scanResult] = await Promise.allSettled([
      withTimeout(window.hermesAPI.workspaceProbe(null), SCAN_TIMEOUT_MS),
      withTimeout(window.hermesAPI.scanLocalServers([]), SCAN_TIMEOUT_MS),
    ]);

    if (probeResult.status === "fulfilled") {
      const p = probeResult.value;
      setProbe(p);
      if (p.reachable) {
        // Enrich the found card with live counts. These are read-only
        // mirrors (contract row D); failures degrade to null counts.
        void withTimeout(
          window.hermesAPI.listWorkspaceSessions(p.baseUrl, {
            limit: SESSION_COUNT_PAGE_SIZE,
          }),
          SCAN_TIMEOUT_MS,
        )
          .then((sessions) =>
            setSessionCount(
              sessions.success ? sessions.data.length : null,
            ),
          )
          .catch(() => setSessionCount(null));
        void withTimeout(
          window.hermesAPI.listWorkspaceAgents(p.baseUrl),
          SCAN_TIMEOUT_MS,
        )
          .then((agents) =>
            setAgentCount(agents.success ? agents.data.length : null),
          )
          .catch(() => setAgentCount(null));
        setPhase("found");
        return;
      }
    } else {
      setProbe(null);
    }

    if (scanResult.status === "fulfilled") {
      setLocalSuggestions(scanResult.value.suggestions);
    }

    setPhase("not-found");
  }, []);

  useEffect(() => {
    void runScan();
  }, [runScan, scanSeq]);

  const handleConnect = useCallback(async (): Promise<void> => {
    if (!probe?.baseUrl) return;
    setConnecting(true);
    setConnectError(null);
    try {
      // The ONE console→workspace attach write: persist the workspace
      // origin as the console's remote connection (doctrine row G
      // consent moment — the click IS the consent).
      await window.hermesAPI.setConnectionConfig(
        "remote",
        probe.baseUrl,
        "",
        "hermes",
      );
      setPhase("connected");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }, [probe]);

  const handleManualConnect = useCallback(async (): Promise<void> => {
    const raw = manualUrl.trim();
    if (!raw) {
      setManualError(t("firstrun.invalidUrl"));
      return;
    }
    setManualError(null);
    setConnecting(true);
    try {
      // normalizeWorkspaceOrigin-class validation happens main-side;
      // a non-loopback origin is rejected to the default. Probe first
      // so the user gets a real verdict instead of a silent attach.
      const result = await withTimeout(
        window.hermesAPI.workspaceProbe(raw),
        SCAN_TIMEOUT_MS,
      );
      if (!result.reachable) {
        setManualError(result.error || t("firstrun.invalidUrl"));
        setConnecting(false);
        return;
      }
      setProbe(result);
      setPhase("found");
    } catch {
      setManualError(t("firstrun.invalidUrl"));
    } finally {
      setConnecting(false);
    }
  }, [manualUrl, t]);

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(DOCKER_QUICKSTART_CMD);
      setCopied(true);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be denied; the text stays selectable either way.
    }
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  return (
    <div className="firstrun-screen">
      <div className="firstrun-stack">
        <img
          src={cubecloudWordmark}
          alt=""
          aria-hidden="true"
          style={{ width: 220, marginBottom: 18 }}
        />
        <span className="firstrun-eyebrow">{t("firstrun.eyebrow")}</span>

        {phase === "scanning" && (
          <>
            <h1 className="firstrun-title">{t("firstrun.title")}</h1>
            <p className="firstrun-subtitle">{t("firstrun.subtitle")}</p>
            <div className="firstrun-radar" aria-hidden="true">
              <div className="firstrun-radar-sweep" />
              <div className="firstrun-radar-dot" />
            </div>
            <span className="firstrun-scan-label">
              {t("firstrun.scanning")}
            </span>
            <span className="firstrun-scan-hint">{t("firstrun.scanHint")}</span>
          </>
        )}

        {phase === "found" && probe && (
          <>
            <h1 className="firstrun-title">{t("firstrun.foundTitle")}</h1>
            <p className="firstrun-subtitle">{t("firstrun.foundSubtitle")}</p>
            <div className="firstrun-card">
              <div className="firstrun-card-head">
                <CheckCircle size={18} className="firstrun-pill-ok" />
                <span className="firstrun-card-title">
                  {probe.info?.name ?? t("firstrun.foundTitle")}
                </span>
              </div>
              <div className="firstrun-card-origin">
                <code>{probe.baseUrl}</code>
                {probe.info?.version ? (
                  <>
                    {" · "}
                    {t("firstrun.version")} {probe.info.version}
                  </>
                ) : null}
              </div>
              <div className="firstrun-stats">
                <div className="firstrun-stat">
                  <span className="firstrun-stat-value">
                    {sessionCount ?? "—"}
                  </span>
                  <span className="firstrun-stat-label">
                    {t("firstrun.sessions")}
                  </span>
                </div>
                <div className="firstrun-stat">
                  <span className="firstrun-stat-value">
                    {agentCount ?? "—"}
                  </span>
                  <span className="firstrun-stat-label">
                    {t("firstrun.agents")}
                  </span>
                </div>
              </div>
            </div>
            {connectError && (
              <span className="firstrun-error">{connectError}</span>
            )}
            <button
              type="button"
              className="firstrun-connect"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <>
                  <Spinner size={16} className="firstrun-door-icon" />
                  {t("firstrun.connecting")}
                </>
              ) : (
                <>
                  {t("firstrun.connect")}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </>
        )}

        {phase === "not-found" && (
          <>
            <h1 className="firstrun-title">{t("firstrun.notFoundTitle")}</h1>
            <p className="firstrun-subtitle">{t("firstrun.notFoundSubtitle")}</p>
            <div className="firstrun-doors">
              <button
                type="button"
                className="firstrun-door"
                onClick={() => setShowDocker((v) => !v)}
              >
                <ExternalLink size={16} className="firstrun-door-icon" />
                <span>
                  {t("firstrun.startWithDocker")}
                  <span className="firstrun-door-sub">
                    {t("firstrun.dockerCommandHint")}
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="firstrun-door"
                onClick={() => setScanSeq((n) => n + 1)}
              >
                <Refresh size={16} className="firstrun-door-icon" />
                <span>{t("firstrun.scanAgain")}</span>
              </button>
              <button
                type="button"
                className="firstrun-door"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                <Search size={16} className="firstrun-door-icon" />
                <span>{t("firstrun.advancedConnect")}</span>
              </button>
            </div>

            {showDocker && (
              <div className="firstrun-cmd">
                <span className="firstrun-cmd-label">
                  {t("firstrun.dockerCommandHint")}
                </span>
                <div className="firstrun-cmd-row">
                  <code className="firstrun-cmd-text">
                    {DOCKER_QUICKSTART_CMD}
                  </code>
                  <button
                    type="button"
                    className="firstrun-cmd-copy"
                    onClick={handleCopy}
                  >
                    {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            )}

            {showAdvanced && (
              <div className="firstrun-advanced">
                <div className="firstrun-field">
                  <input
                    className="firstrun-input"
                    type="text"
                    value={manualUrl}
                    placeholder={t("firstrun.urlPlaceholder")}
                    onChange={(e) => setManualUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleManualConnect();
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void handleManualConnect()}
                    disabled={connecting}
                  >
                    {connecting ? (
                      <Spinner size={14} />
                    ) : (
                      t("firstrun.connectUrl")
                    )}
                  </button>
                </div>
                <span className="firstrun-scan-hint">
                  {t("firstrun.advancedHint")}
                </span>
                {manualError && (
                  <span className="firstrun-error">{manualError}</span>
                )}
              </div>
            )}

            {localSuggestions.length > 0 && (
              <div className="firstrun-advanced">
                <span className="firstrun-scan-label">
                  {t("firstrun.scanHint")}
                </span>
                {localSuggestions.map((s) => (
                  <div key={s.baseUrl} className="firstrun-pill">
                    <Signal size={14} className="firstrun-door-icon" />
                    {s.label} · <code>{s.baseUrl}</code>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {phase === "connected" && (
          <>
            <h1 className="firstrun-title">{t("firstrun.connectedTitle")}</h1>
            <p className="firstrun-subtitle">{t("firstrun.connectedBody")}</p>
            <button
              type="button"
              className="firstrun-connect"
              onClick={onComplete}
            >
              {t("firstrun.enterConsole")}
              <ArrowRight size={16} />
            </button>
          </>
        )}

        <div className="firstrun-footer">
          <button type="button" className="firstrun-link" onClick={onLegacySetup}>
            <Settings size={14} />
            {t("firstrun.fallbackWizard")}
          </button>
          <span className="firstrun-link-hint">
            {t("firstrun.fallbackWizardHint")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default FirstRunScan;
