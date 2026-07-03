import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { GATEWAY_SECTIONS, GATEWAY_PLATFORMS } from "../../constants";
import { useI18n } from "../../components/useI18n";
import BrandLogo from "../../components/common/BrandLogo";
import { Container, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  buildLocalGatewayUrl,
  LOCAL_GATEWAY_CANDIDATE_PORTS,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "../../../../shared/runtime-defaults";

function Gateway({ profile }: { profile?: string }): React.JSX.Element {
  const { t } = useI18n();
  const [gatewayRunning, setGatewayRunning] = useState(false);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [platformEnabled, setPlatformEnabled] = useState<
    Record<string, boolean>
  >({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const gatewayStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const platformStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const loadConfig = useCallback(async (): Promise<void> => {
    try {
      const envData = await window.hermesAPI.getEnv(profile);
      setEnv(envData);
      const gwStatus = await window.hermesAPI.gatewayStatus();
      setGatewayRunning(gwStatus);
      const platforms = await window.hermesAPI.getPlatformEnabled(profile);
      setPlatformEnabled(platforms);
    } catch {
      // Leave previous state on transient IPC failure
    }
  }, [profile]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Poll gateway status (10s interval to reduce IPC overhead)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await window.hermesAPI.gatewayStatus();
        setGatewayRunning(status);
      } catch {
        // Transient IPC failure — leave previous state
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  async function toggleGateway(): Promise<void> {
    if (gatewayStatusTimeoutRef.current) {
      clearTimeout(gatewayStatusTimeoutRef.current);
      gatewayStatusTimeoutRef.current = null;
    }
    try {
      if (gatewayRunning) {
        await window.hermesAPI.stopGateway();
        setGatewayRunning(false);
      } else {
        const started = await window.hermesAPI.startGateway();
        setGatewayRunning(started);
        gatewayStatusTimeoutRef.current = setTimeout(async () => {
          try {
            const status = await window.hermesAPI.gatewayStatus();
            setGatewayRunning(status);
          } catch {
            /* leave previous state */
          }
          gatewayStatusTimeoutRef.current = null;
        }, 5000);
      }
    } catch {
      // Best-effort: re-sync from backend on failure
      void loadConfig();
    }
  }

  async function togglePlatform(platform: string): Promise<void> {
    if (platformStatusTimeoutRef.current) {
      clearTimeout(platformStatusTimeoutRef.current);
      platformStatusTimeoutRef.current = null;
    }
    const newValue = !platformEnabled[platform];
    setPlatformEnabled((prev) => ({ ...prev, [platform]: newValue }));
    try {
      await window.hermesAPI.setPlatformEnabled(platform, newValue, profile);
      platformStatusTimeoutRef.current = setTimeout(async () => {
        try {
          const status = await window.hermesAPI.gatewayStatus();
          setGatewayRunning(status);
        } catch {
          /* leave previous state */
        }
        platformStatusTimeoutRef.current = null;
      }, 3000);
    } catch {
      // Rollback on failure
      setPlatformEnabled((prev) => ({ ...prev, [platform]: !newValue }));
    }
  }

  async function handleBlur(key: string): Promise<void> {
    const value = env[key] || "";
    try {
      await window.hermesAPI.setEnv(key, value, profile);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
      // Best-effort: don't surface a banner for env save failure
    }
  }

  function handleChange(key: string, value: string): void {
    setEnv((prev) => ({ ...prev, [key]: value }));
  }

  function toggleVisibility(key: string): void {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Runtimes / container discovery surface ────────────────────────
  type RuntimeProviderSnapshot = Awaited<
    ReturnType<typeof window.hermesAPI.listRuntimeProviders>
  >[number];
  type DockerRuntimeDiscovery = Awaited<
    ReturnType<typeof window.hermesAPI.discoverDockerRuntimes>
  >;
  type DockerRuntimeCandidate = DockerRuntimeDiscovery["runtimes"][number];
  type LocalGatewayCandidate = {
    id: string;
    name: string;
    endpointUrl: string;
    detail: string;
  };

  const [runtimeProviders, setRuntimeProviders] = useState<
    RuntimeProviderSnapshot[]
  >([]);
  const [localGatewayProbes, setLocalGatewayProbes] = useState<
    LocalGatewayCandidate[]
  >([]);
  const [localGatewayScanning, setLocalGatewayScanning] = useState(false);
  const [localGatewayError, setLocalGatewayError] = useState<string | null>(
    null,
  );
  const [dockerDiscovery, setDockerDiscovery] =
    useState<DockerRuntimeDiscovery | null>(null);
  const [dockerScanning, setDockerScanning] = useState(false);
  const [dockerError, setDockerError] = useState<string | null>(null);

  const localGatewayCandidates: LocalGatewayCandidate[] = useMemo(
    () => [
      {
        id: "hermes-local",
        name: "Hermes localhost gateway",
        endpointUrl: buildLocalGatewayUrl(LOCAL_GATEWAY_CANDIDATE_PORTS[0]),
        detail:
          "Default local Hermes gateway. If this responds, Agent Desktop can attach without reinstalling Hermes.",
      },
      {
        id: "existing-local",
        name: "Existing localhost gateway",
        endpointUrl: buildLocalGatewayUrl(LOCAL_GATEWAY_CANDIDATE_PORTS[1]),
        detail:
          `Custom or already-running gateway on ${LOCAL_GATEWAY_CANDIDATE_PORTS[1]}. Use it directly if this is your intended runtime.`,
      },
      {
        id: "openclaw-local",
        name: "OpenClaw localhost gateway",
        endpointUrl: buildLocalGatewayUrl(OPENCLAW_LOCAL_GATEWAY_PORT),
        detail:
          `OpenClaw gateway on ${OPENCLAW_LOCAL_GATEWAY_PORT}. Agent Desktop can attach here when OpenClaw's HTTP compatibility surface is enabled.`,
      },
    ],
    [],
  );

  const refreshRuntimeProviders = useCallback(async (): Promise<void> => {
    try {
      const result = await window.hermesAPI.listRuntimeProviders();
      setRuntimeProviders(result);
    } catch {
      setRuntimeProviders([]);
    }
  }, []);

  const refreshLocalGatewayProbes = useCallback(async (): Promise<void> => {
    setLocalGatewayScanning(true);
    setLocalGatewayError(null);
    try {
      const results = await Promise.all(
        localGatewayCandidates.map(async (candidate) => {
          const ok = await window.hermesAPI.testRemoteConnection(
            candidate.endpointUrl,
          );
          return ok ? candidate : null;
        }),
      );
      setLocalGatewayProbes(
        results.filter(
          (candidate): candidate is LocalGatewayCandidate =>
            candidate !== null,
        ),
      );
    } catch (scanError) {
      setLocalGatewayError(
        (scanError as Error).message || "Local gateway scan failed.",
      );
    } finally {
      setLocalGatewayScanning(false);
    }
  }, [localGatewayCandidates]);

  const refreshDockerDiscovery = useCallback(async (): Promise<void> => {
    setDockerScanning(true);
    setDockerError(null);
    try {
      const result = await window.hermesAPI.discoverDockerRuntimes();
      setDockerDiscovery(result);
    } catch (scanError) {
      setDockerError(
        (scanError as Error).message || "Docker runtime scan failed.",
      );
    } finally {
      setDockerScanning(false);
    }
  }, []);

  useEffect(() => {
    void refreshRuntimeProviders();
    void refreshLocalGatewayProbes();
    void refreshDockerDiscovery();
  }, [
    refreshRuntimeProviders,
    refreshLocalGatewayProbes,
    refreshDockerDiscovery,
  ]);
  // ────────────────────────────────────────────────────────────────

  // Build a set of field keys that belong to platforms (for grouping)
  const platformFieldKeys = new Set(GATEWAY_PLATFORMS.flatMap((p) => p.fields));

  // Non-platform fields from GATEWAY_SECTIONS
  const otherSections = GATEWAY_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !platformFieldKeys.has(item.key)),
  })).filter((section) => section.items.length > 0);

  // Map env keys to their field definitions for rendering inside platform cards
  const fieldDefs = new Map(
    GATEWAY_SECTIONS.flatMap((s) => s.items).map((f) => [f.key, f]),
  );
  const enabledPlatformCount = GATEWAY_PLATFORMS.filter(
    (platform) => !!platformEnabled[platform.key],
  ).length;

  return (
    <div className="settings-container">
      <div className="settings-gateway-hero">
        <div>
          <div className="settings-gateway-kicker">{t("gateway.kicker")}</div>
          <h1 className="settings-header">{t("gateway.title")}</h1>
          <p className="settings-gateway-summary">
            {t("gateway.heroSummary")}
          </p>
        </div>
        <div className="settings-gateway-badges">
          <span className="settings-gateway-badge">
            {gatewayRunning ? t("gateway.running") : t("gateway.stopped")}
          </span>
          <span className="settings-gateway-badge">
            {t("gateway.platformsEnabled", { enabled: enabledPlatformCount, total: GATEWAY_PLATFORMS.length })}
          </span>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("gateway.messagingGateway")}
        </div>
        <div className="settings-field">
          <label className="settings-field-label">{t("gateway.status")}</label>
          <div className="settings-gateway-row">
            <span
              className={`settings-gateway-status ${gatewayRunning ? "running" : "stopped"}`}
            >
              {gatewayRunning ? t("gateway.running") : t("gateway.stopped")}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={toggleGateway}
            >
              {gatewayRunning ? t("common.stop") : t("common.start")}
            </button>
          </div>
          <div className="settings-field-hint">{t("gateway.gatewayHint")}</div>
          <div className="settings-field-hint settings-field-hint--secondary">
            {t("gateway.platformsHint")}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">{t("gateway.platforms")}</div>
        <div className="settings-field-hint settings-field-hint--secondary">
          {t("gateway.supportedBridgesHint")}
        </div>
        {(["messaging", "eastern", "async", "home"] as const).map(
          (groupKey) => {
            const platformsInGroup = GATEWAY_PLATFORMS.filter(
              (p) => p.group === groupKey,
            );
            if (platformsInGroup.length === 0) return null;
            return (
              <div key={groupKey} className="settings-platform-group">
                <div className="settings-platform-group-label">
                  {t(`gateway.group.${groupKey}`)}
                </div>
                {platformsInGroup.map((platform) => (
                  <div
                    key={platform.key}
                    className="settings-platform-card"
                    data-platform-key={platform.key}
                  >
                    <div className="settings-platform-header">
                      <div className="settings-platform-left">
                        <BrandLogo provider={platform.key} size={28} />
                        <div className="settings-platform-info">
                          <span className="settings-platform-label">
                            {t(platform.label)}
                          </span>
                          <span className="settings-platform-desc">
                            {t(platform.description)}
                          </span>
                        </div>
                      </div>
                      <label className="tools-toggle">
                        <input
                          type="checkbox"
                          aria-label={t(platform.label)}
                          checked={!!platformEnabled[platform.key]}
                          onChange={() => togglePlatform(platform.key)}
                        />
                        <span className="tools-toggle-track" />
                      </label>
                    </div>
                    {platformEnabled[platform.key] && (
                      <div className="settings-platform-fields">
                        {platform.fields.map((fieldKey) => {
                          const field = fieldDefs.get(fieldKey);
                          if (!field) return null;
                          return (
                            <div
                              key={field.key}
                              className="settings-field"
                            >
                              <label className="settings-field-label">
                                {t(field.label)}
                                {savedKey === field.key && (
                                  <span className="settings-saved">
                                    {t("common.saved")}
                                  </span>
                                )}
                              </label>
                              <div className="settings-input-row">
                                <input
                                  className="input"
                                  type={
                                    field.type === "password" &&
                                    !visibleKeys.has(field.key)
                                      ? "password"
                                      : "text"
                                  }
                                  value={env[field.key] || ""}
                                  onChange={(e) =>
                                    handleChange(field.key, e.target.value)
                                  }
                                  onBlur={() => handleBlur(field.key)}
                                  placeholder={t(field.label)}
                                />
                                {field.type === "password" && (
                                  <button
                                    className="btn-ghost settings-toggle-btn"
                                    onClick={() => toggleVisibility(field.key)}
                                  >
                                    {visibleKeys.has(field.key)
                                      ? t("common.hide")
                                      : t("common.show")}
                                  </button>
                                )}
                              </div>
                              <div className="settings-field-hint">
                                {t(field.hint)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          },
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("gateway.runtimes.title")}
        </div>
        <div className="settings-field-hint settings-field-hint--secondary">
          {t("gateway.runtimes.summary")}
        </div>
        <div className="settings-field">
          <div className="settings-gateway-row">
            <span className="settings-gateway-status running">
              {t("gateway.runtimes.registryLabel")}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void refreshRuntimeProviders()}
              disabled={localGatewayScanning || dockerScanning}
              aria-label={t("gateway.runtimes.refreshAria")}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {t("common.refresh")}
            </button>
          </div>
        </div>
        {runtimeProviders.length === 0 ? (
          <div className="settings-field-hint">
            {t("gateway.runtimes.empty")}
          </div>
        ) : (
          runtimeProviders.map((provider) => (
            <div
              key={provider.definition.id}
              className="settings-platform-card"
              data-runtime-id={provider.definition.id}
            >
              <div className="settings-platform-header">
                <div className="settings-platform-left">
                  <BrandLogo provider={provider.definition.id} size={28} />
                  <div className="settings-platform-info">
                    <span className="settings-platform-label">
                      {provider.definition.displayName}
                    </span>
                    <span className="settings-platform-desc">
                      {provider.status === "ready"
                        ? t("gateway.runtimes.statusReady")
                        : t("gateway.runtimes.statusUnavailable")}
                    </span>
                  </div>
                </div>
                <span
                  className={`settings-gateway-status ${provider.status === "ready" ? "running" : "stopped"}`}
                >
                  {provider.status === "ready"
                    ? t("gateway.running")
                    : t("gateway.stopped")}
                </span>
              </div>
              {provider.definition.capabilities.canDiscoverViaDocker && (
                <div className="settings-platform-fields">
                  <div className="settings-field-hint">
                    {t("gateway.runtimes.discoveryHint")}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <div className="settings-field">
          <div className="settings-gateway-row">
            <span
              className={`settings-gateway-status ${localGatewayProbes.length > 0 ? "running" : "stopped"}`}
            >
              {t("gateway.runtimes.localProbesLabel")}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void refreshLocalGatewayProbes()}
              disabled={localGatewayScanning}
              aria-label={t("gateway.runtimes.localProbesRefreshAria")}
            >
              <RefreshCw
                size={14}
                aria-hidden="true"
                className={localGatewayScanning ? "spin" : undefined}
              />
              {localGatewayScanning
                ? t("gateway.runtimes.scanning")
                : t("common.refresh")}
            </button>
          </div>
          {localGatewayError && (
            <div className="settings-field-hint settings-field-hint--error">
              {localGatewayError}
            </div>
          )}
          {localGatewayProbes.length === 0 ? (
            <div className="settings-field-hint">
              {t("gateway.runtimes.localProbesEmpty")}
            </div>
          ) : (
            localGatewayProbes.map((probe) => (
              <div
                key={probe.id}
                className="settings-platform-card"
                data-local-gateway={probe.id}
              >
                <div className="settings-platform-header">
                  <div className="settings-platform-left">
                    <div className="settings-platform-info">
                      <span className="settings-platform-label">
                        {probe.name}
                      </span>
                      <span className="settings-platform-desc">
                        {probe.endpointUrl}
                      </span>
                      <span className="settings-platform-desc">
                        {probe.detail}
                      </span>
                    </div>
                  </div>
                  <span className="settings-gateway-status running">
                    <CheckCircle2
                      size={14}
                      aria-hidden="true"
                      style={{ marginRight: 4, verticalAlign: "middle" }}
                    />
                    {t("gateway.runtimes.responded")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("gateway.container.title")}
        </div>
        <div className="settings-field-hint settings-field-hint--secondary">
          {t("gateway.container.summary")}
        </div>
        <div className="settings-field-hint settings-field-hint--secondary">
          {t("gateway.container.sharedHint")}
        </div>
        <div className="settings-field">
          <div className="settings-gateway-row">
            <span
              className={`settings-gateway-status ${dockerDiscovery?.status === "ready" ? "running" : "stopped"}`}
            >
              {t("gateway.container.statusLabel")}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void refreshDockerDiscovery()}
              disabled={dockerScanning}
              aria-label={t("gateway.container.refreshAria")}
            >
              <Container size={14} aria-hidden="true" />
              {dockerScanning
                ? t("gateway.runtimes.scanning")
                : t("gateway.container.rescan")}
            </button>
          </div>
          {dockerError && (
            <div className="settings-field-hint settings-field-hint--error">
              {dockerError}
            </div>
          )}
          {dockerDiscovery && (
            <div className="settings-field-hint">
              {dockerDiscovery.message}
              {dockerDiscovery.scannedAt && (
                <>
                  {" · "}
                  {t("gateway.container.scannedAt", {
                    value: new Date(dockerDiscovery.scannedAt).toLocaleString(),
                  })}
                </>
              )}
            </div>
          )}
        </div>
        {!dockerDiscovery ||
        dockerDiscovery.runtimes.length === 0 ? (
          <div className="settings-field-hint">
            {t("gateway.container.empty")}
          </div>
        ) : (
          dockerDiscovery.runtimes.map((runtime: DockerRuntimeCandidate) => (
            <div
              key={runtime.id}
              className="settings-platform-card"
              data-docker-runtime={runtime.id}
              data-runtime-kind={runtime.kind}
            >
              <div className="settings-platform-header">
                <div className="settings-platform-left">
                  <Container
                    size={28}
                    aria-hidden="true"
                    className="settings-platform-icon"
                  />
                  <div className="settings-platform-info">
                    <span className="settings-platform-label">
                      {runtime.name}
                    </span>
                    <span className="settings-platform-desc">
                      {runtime.kind} · {runtime.endpointUrl || runtime.image}
                    </span>
                    <span className="settings-platform-desc">
                      {runtime.detail}
                    </span>
                  </div>
                </div>
                <span
                  className={`settings-gateway-status ${runtime.status === "ready" ? "running" : "stopped"}`}
                >
                  {runtime.status === "ready"
                    ? t("gateway.runtimes.statusReady")
                    : t("gateway.runtimes.detected")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {otherSections.map((section) => (
        <div key={section.title} className="settings-section">
          <div className="settings-section-title">{t(section.title)}</div>
          {section.items.map((field) => (
            <div key={field.key} className="settings-field">
              <label className="settings-field-label">
                {t(field.label)}
                {savedKey === field.key && (
                  <span className="settings-saved">{t("common.saved")}</span>
                )}
              </label>
              <div className="settings-input-row">
                <input
                  className="input"
                  type={
                    field.type === "password" && !visibleKeys.has(field.key)
                      ? "password"
                      : "text"
                  }
                  value={env[field.key] || ""}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  onBlur={() => handleBlur(field.key)}
                  placeholder={t(field.label)}
                />
                {field.type === "password" && (
                  <button
                    className="btn-ghost settings-toggle-btn"
                    onClick={() => toggleVisibility(field.key)}
                  >
                    {visibleKeys.has(field.key)
                      ? t("common.hide")
                      : t("common.show")}
                  </button>
                )}
              </div>
              <div className="settings-field-hint">{t(field.hint)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Gateway;
