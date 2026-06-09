import { useEffect, useState } from "react";
import { ArrowRight, ExternalLink } from "../../assets/icons";
import cubecloudWordmark from "../../assets/cubecloud-wordmark.svg";
import { PROVIDERS, LOCAL_PRESETS, OAUTH_PROVIDERS } from "../../constants";
import { useI18n } from "../../components/useI18n";
import VerifyWarningBanner from "../../components/VerifyWarningBanner";
import BrandLogo from "../../components/common/BrandLogo";
import OAuthLoginModal from "../../components/OAuthLoginModal";
import { AGENT_CLI_CATALOG } from "../../../../shared/agent-clis";
import { useDiscoveredModels } from "../../hooks/useDiscoveredModels";

type RuntimeProviderSnapshot = Awaited<
  ReturnType<typeof window.hermesAPI.listRuntimeProviders>
>[number];
type TaskOrchestratorSnapshot = Awaited<
  ReturnType<typeof window.hermesAPI.listTaskOrchestrators>
>[number];

interface SetupProps {
  onComplete: () => void;
  verifyWarning?: boolean;
  onReinstall?: () => void;
  onDismissVerifyWarning?: () => void;
}

function Setup({
  onComplete,
  verifyWarning,
  onReinstall,
  onDismissVerifyWarning,
}: SetupProps): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const [selectedProvider, setSelectedProvider] = useState("openrouter");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:1234/v1");
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [openclawStatus, setOpenclawStatus] = useState<string | null>(null);
  const [migratingOpenclaw, setMigratingOpenclaw] = useState(false);
  const [runtimeProviders, setRuntimeProviders] = useState<
    RuntimeProviderSnapshot[]
  >([]);
  const [taskOrchestrators, setTaskOrchestrators] = useState<
    TaskOrchestratorSnapshot[]
  >([]);
  const [openclawImported, setOpenclawImported] = useState(false);
  const [installingOpenclawWsl, setInstallingOpenclawWsl] = useState(false);
  const [openingOpenclawGuide, setOpeningOpenclawGuide] = useState(false);
  const [agentCliDiscovery, setAgentCliDiscovery] = useState<Awaited<
    ReturnType<typeof window.hermesAPI.discoverAgentClis>
  > | null>(null);
  const [agentCliScanning, setAgentCliScanning] = useState(false);
  const [selectedAgentCliId, setSelectedAgentCliId] = useState<string | null>(
    null,
  );
  const [oauthModal, setOauthModal] = useState<
    (typeof OAUTH_PROVIDERS)[number] | null
  >(null);
  const [setupDiscoveryRefresh, setSetupDiscoveryRefresh] = useState(0);

  const provider = PROVIDERS.setup.find((entry) => entry.id === selectedProvider)!;
  const isLocal = selectedProvider === "local";
  const discoveryProvider = isLocal ? "custom" : provider.configProvider;
  const discoveryBaseUrl = isLocal
    ? baseUrl.trim() || undefined
    : provider.baseUrl || undefined;
  const discoveryEnabled = isLocal
    ? !!baseUrl.trim()
    : !provider.needsKey || !!apiKey.trim();
  const modelDiscovery = useDiscoveredModels({
    provider: discoveryProvider,
    baseUrl: discoveryBaseUrl,
    apiKey: apiKey.trim() || undefined,
    enabled: discoveryEnabled,
    refreshToken: setupDiscoveryRefresh,
  });
  const discoveryListId = "setup-provider-model-discovery";
  const openclawProvider =
    runtimeProviders.find(
      (providerEntry) => providerEntry.definition.id === "openclaw",
    ) ?? null;
  const hermesOrchestrator =
    taskOrchestrators.find(
      (orchestrator) => orchestrator.definition.id === "hermes",
    ) ?? null;
  const openclawImportAction =
    openclawProvider?.actions.find(
      (action) => action.id === "import-existing-state",
    ) ?? null;
  const openclawWslInstallAction =
    openclawProvider?.actions.find((action) => action.id === "install-via-wsl") ??
    null;
  const openclawInstallGuideAction =
    openclawProvider?.actions.find(
      (action) => action.id === "open-install-guide",
    ) ?? null;
  const openclawFound = Boolean(openclawProvider?.detected) && !openclawImported;
  const openclawCliDetected = Boolean(openclawProvider?.detectedCommand);

  async function refreshRuntimeProviders(): Promise<void> {
    const result = await window.hermesAPI.listRuntimeProviders();
    setRuntimeProviders(result);
  }

  useEffect(() => {
    let active = true;

    void refreshAgentClis();

    void window.hermesAPI.listRuntimeProviders().then((result) => {
      if (!active) {
        return;
      }

      setRuntimeProviders(result);
    });

    void window.hermesAPI.listTaskOrchestrators().then((result) => {
      if (!active) {
        return;
      }

      setTaskOrchestrators(result);
    });

    return () => {
      active = false;
    };
  }, []);

  async function refreshAgentClis(): Promise<void> {
    setAgentCliScanning(true);

    try {
      const result = await window.hermesAPI.discoverAgentClis();
      setAgentCliDiscovery(result);
    } finally {
      setAgentCliScanning(false);
    }
  }

  function applyLocalPreset(presetBaseUrl: string): void {
    setSelectedProvider("local");
    setBaseUrl(presetBaseUrl);
    setSelectedAgentCliId(null);
    setError("");
  }

  function resolveCustomEnvKey(url: string): string {
    const preset = LOCAL_PRESETS.find((candidate) => candidate.baseUrl === url);
    if (preset?.envKey) return preset.envKey;
    if (/openrouter\.ai/i.test(url)) return "OPENROUTER_API_KEY";
    if (/anthropic\.com/i.test(url)) return "ANTHROPIC_API_KEY";
    if (/openai\.com/i.test(url)) return "OPENAI_API_KEY";
    if (/huggingface\.co/i.test(url)) return "HF_TOKEN";
    if (/api\.groq\.com/i.test(url)) return "GROQ_API_KEY";
    if (/api\.deepseek\.com/i.test(url)) return "DEEPSEEK_API_KEY";
    if (/api\.together\.xyz/i.test(url)) return "TOGETHER_API_KEY";
    if (/api\.fireworks\.ai/i.test(url)) return "FIREWORKS_API_KEY";
    if (/api\.cerebras\.ai/i.test(url)) return "CEREBRAS_API_KEY";
    if (/api\.mistral\.ai/i.test(url)) return "MISTRAL_API_KEY";
    if (/api\.perplexity\.ai/i.test(url)) return "PERPLEXITY_API_KEY";
    return "CUSTOM_API_KEY";
  }

  async function handleContinue(): Promise<void> {
    if (provider.needsKey && !apiKey.trim()) {
      setError(t("setup.missingApiKey"));
      return;
    }

    if (isLocal && !baseUrl.trim()) {
      setError(t("setup.missingServerUrl"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (provider.needsKey && provider.envKey) {
        await window.hermesAPI.setEnv(provider.envKey, apiKey.trim());
      } else if (isLocal && apiKey.trim()) {
        const envKey = resolveCustomEnvKey(baseUrl.trim());
        await window.hermesAPI.setEnv(envKey, apiKey.trim());
      }

      const configProvider = isLocal ? "custom" : provider.configProvider;
      const configBaseUrl = isLocal ? baseUrl.trim() : provider.baseUrl || "";
      const configModel = modelName.trim() || "";
      await window.hermesAPI.setModelConfig(
        configProvider,
        configModel,
        configBaseUrl,
      );

      onComplete();
    } catch {
      setError(t("setup.saveFailed"));
      setSaving(false);
    }
  }

  async function handleOpenClawMigration(): Promise<void> {
    if (!openclawImportAction) {
      setOpenclawStatus(t("setup.errorOpenClawImportUnavailable"));
      return;
    }

    setMigratingOpenclaw(true);
    setOpenclawStatus(null);

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawImportAction.id,
      );

      if (!result.success) {
        setOpenclawStatus(result.error || "OpenClaw migration failed.");
        return;
      }

      setOpenclawStatus(
        result.message || t("setup.openclawMigrationComplete"),
      );
      setOpenclawImported(true);
      await refreshRuntimeProviders();
    } catch (migrationError) {
      setOpenclawStatus(
        (migrationError as Error).message || "OpenClaw migration failed.",
      );
    } finally {
      setMigratingOpenclaw(false);
    }
  }

  async function handleOpenClawInstallGuide(): Promise<void> {
    if (!openclawInstallGuideAction) {
      return;
    }

    setOpeningOpenclawGuide(true);
    setOpenclawStatus(null);

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawInstallGuideAction.id,
      );
      setOpenclawStatus(
        result.success
          ? result.message || "OpenClaw install guide opened."
          : result.error || "Could not open the OpenClaw install guide.",
      );
    } catch (guideError) {
      setOpenclawStatus(
        (guideError as Error).message ||
          "Could not open the OpenClaw install guide.",
      );
    } finally {
      setOpeningOpenclawGuide(false);
    }
  }

  async function handleOpenClawWslInstall(): Promise<void> {
    if (!openclawWslInstallAction) {
      return;
    }

    setInstallingOpenclawWsl(true);
    setOpenclawStatus(null);

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawWslInstallAction.id,
      );
      setOpenclawStatus(
        result.success
          ? result.message ||
              "Opened a WSL shell for OpenClaw onboarding. Finish the flow there, then return here to attach or import it."
          : result.error || "Could not launch the OpenClaw WSL handoff.",
      );
    } catch (installError) {
      setOpenclawStatus(
        (installError as Error).message ||
          "Could not launch the OpenClaw WSL handoff.",
      );
    } finally {
      setInstallingOpenclawWsl(false);
    }
  }

  function handleUseAgentCli(agentCliId: string, providerId: string): void {
    setSelectedAgentCliId(agentCliId);
    setSelectedProvider(providerId);
    setError("");
  }

  const agentCliById = new Map(
    (agentCliDiscovery?.items ?? []).map((item) => [item.id, item]),
  );
  const localRuntimePresets = LOCAL_PRESETS.filter(
    (preset) => preset.group === "local",
  );
  const hostedRuntimePresets = LOCAL_PRESETS.filter(
    (preset) => preset.group === "remote",
  );

  return (
    <div className="screen setup-screen">
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
      {verifyWarning && onReinstall && onDismissVerifyWarning && (
        <VerifyWarningBanner
          onReinstall={onReinstall}
          onDismiss={onDismissVerifyWarning}
        />
      )}

      <div className="setup-brand-shell">
        <img
          src={cubecloudWordmark}
          alt="Cubecloud Agent Desktop"
          className="setup-brand-wordmark"
        />
        <div className="setup-brand-caption">Agent Desktop</div>
      </div>

      <h1 className="setup-title">{t("setup.title")}</h1>
      <p className="setup-subtitle">{t("setup.subtitle")}</p>

      <ol className="setup-step-indicator" aria-label="Setup steps">
        <li className="setup-step-indicator-step setup-step-indicator-step--current">
          <span className="setup-step-indicator-number">1</span>
          <span className="setup-step-indicator-label">{t("setup.stepPickCli")}</span>
        </li>
        <li className="setup-step-indicator-step">
          <span className="setup-step-indicator-number">2</span>
          <span className="setup-step-indicator-label">{t("setup.stepPickProvider")}</span>
        </li>
        <li className="setup-step-indicator-step">
          <span className="setup-step-indicator-number">3</span>
          <span className="setup-step-indicator-label">{t("setup.stepConnect")}</span>
        </li>
      </ol>

      {!openclawFound && (openclawWslInstallAction || openclawInstallGuideAction) && (
        <div className="setup-runtime-banner setup-runtime-banner--compact">
          <div>
            <div className="setup-runtime-title">
              {t("setup.openclawOptionalTitle", {
                name: openclawProvider?.definition.displayName ?? "OpenClaw",
              })}
            </div>
            <div className="setup-runtime-copy">
              {openclawProvider?.summary ?? t("setup.openclawNotDetected")}
            </div>
          </div>
          <div className="setup-cli-card-actions">
            {openclawWslInstallAction && (
              <button
                className="btn btn-primary"
                onClick={() => void handleOpenClawWslInstall()}
                disabled={installingOpenclawWsl}
              >
                {installingOpenclawWsl
                  ? "Launching..."
                  : openclawWslInstallAction.label}
              </button>
            )}
            {openclawInstallGuideAction && (
              <button
                className="btn btn-secondary"
                onClick={() => void handleOpenClawInstallGuide()}
                disabled={openingOpenclawGuide}
              >
                {openingOpenclawGuide
                  ? "Opening..."
                  : openclawInstallGuideAction.label}
              </button>
            )}
          </div>
        </div>
      )}

      {openclawFound && (
        <div className="setup-runtime-banner setup-runtime-banner--compact">
          <div>
            <div className="setup-runtime-title">
              {t("setup.openclawMigrationTitle", {
                name: openclawProvider?.definition.displayName ?? "OpenClaw",
              })}
            </div>
            <div className="setup-runtime-copy">
              {t("setup.openclawDetected")}
            </div>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => void handleOpenClawMigration()}
            disabled={migratingOpenclaw}
          >
            {migratingOpenclaw
              ? "Migrating..."
              : openclawImportAction?.label ?? "Import OpenClaw"}
          </button>
        </div>
      )}

      {openclawStatus && (
        <div className="setup-runtime-status">{openclawStatus}</div>
      )}

      <div className="setup-cli-section">
        <div className="setup-cli-header">
          <div>
            <h2 className="setup-section-title">
              {t("setup.cliSectionTitle")}
            </h2>
            <p className="setup-section-copy">
              {t("setup.cliSectionCopy")}
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => void refreshAgentClis()}
            disabled={agentCliScanning}
          >
            {agentCliScanning ? "Scanning..." : "Rescan"}
          </button>
        </div>

        <div className="setup-cli-summary">
          <strong>Your CLIs ({agentCliDiscovery?.installedCount ?? 0})</strong>
          <span>
            {openclawFound
              ? `${openclawProvider?.definition.displayName ?? "OpenClaw"} was detected and can be imported above.`
              : openclawCliDetected
                ? `${openclawProvider?.definition.displayName ?? "OpenClaw"} CLI is installed. Finish OpenClaw onboarding or attach to its gateway once the HTTP compatibility surface is enabled.`
                : `${openclawProvider?.definition.displayName ?? "OpenClaw"} was not detected on this machine yet.`}
          </span>
        </div>

        {(agentCliDiscovery?.installedCount ?? 0) === 0 && (
          <div className="setup-cli-empty">
            {t("setup.cliSectionEmpty")}
          </div>
        )}

        <div className="setup-cli-grid">
          {AGENT_CLI_CATALOG.map((entry) => {
            const detection = agentCliById.get(entry.id);
            const installed = detection?.installed ?? false;
            const selectable = installed && !!entry.providerId;
            const oauthProvider = entry.oauthProviderId
              ? OAUTH_PROVIDERS.find(
                  (providerEntry) => providerEntry.id === entry.oauthProviderId,
                )
              : null;

            return (
              <div
                key={entry.id}
                className={`setup-cli-card ${installed ? "installed" : ""} ${selectedAgentCliId === entry.id ? "selected" : ""}`}
              >
                <div className="setup-cli-card-top">
                  <div className="setup-cli-card-brand">
                    <BrandLogo
                      provider={entry.logoProvider || entry.name}
                      size={22}
                      matchTheme={true}
                    />
                    <div>
                      <div className="setup-cli-card-name">{entry.name}</div>
                      <div className="setup-cli-card-desc">
                        {entry.description}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`setup-cli-chip ${installed ? "setup-cli-chip--installed" : "setup-cli-chip--missing"}`}
                  >
                    {installed ? "Installed" : "Not installed"}
                  </span>
                </div>

                <div className="setup-cli-card-meta">
                  {detection?.resolvedPath ||
                    "Not found on the Agent Desktop PATH"}
                </div>

                <div className="setup-cli-card-actions">
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => window.hermesAPI.openExternal(entry.docsUrl)}
                  >
                    Docs
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() =>
                      window.hermesAPI.openExternal(entry.installUrl)
                    }
                  >
                    Install
                  </button>
                  {oauthProvider && installed && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setOauthModal(oauthProvider)}
                    >
                      Sign in
                    </button>
                  )}
                  {selectable && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() =>
                        handleUseAgentCli(entry.id, entry.providerId!)
                      }
                    >
                      Use
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="setup-cli-path-hint">
          {t("setup.cliSectionPathHint")}
        </div>
      </div>

      <div className="setup-provider-heading">
        <h2 className="setup-section-title">{t("setup.taskOrchestratorTitle")}</h2>
        <p className="setup-section-copy">
          {hermesOrchestrator?.summary ?? t("setup.taskOrchestratorCopy")}
        </p>
      </div>

      <div className="setup-provider-heading">
        <h2 className="setup-section-title">{t("setup.addOnRuntimesTitle")}</h2>
        <p className="setup-section-copy">{t("setup.addOnRuntimesCopy")}</p>
      </div>

      <label className="setup-label">Local runtimes</label>
      <div className="setup-local-presets">
        {localRuntimePresets.map((preset) => (
          <button
            key={preset.id}
            className={`setup-local-preset ${selectedProvider === "local" && baseUrl === preset.baseUrl ? "active" : ""}`}
            onClick={() => applyLocalPreset(preset.baseUrl)}
          >
            {t(`setup.localPresets.${preset.id}`)}
          </button>
        ))}
      </div>

      <label className="setup-label setup-label--spaced-sm">
        Hosted OpenAI-compatible runtimes
      </label>
      <div className="setup-local-presets">
        {hostedRuntimePresets.map((preset) => (
          <button
            key={preset.id}
            className={`setup-local-preset ${selectedProvider === "local" && baseUrl === preset.baseUrl ? "active" : ""}`}
            onClick={() => applyLocalPreset(preset.baseUrl)}
          >
            {t(`setup.localPresets.${preset.id}`)}
          </button>
        ))}
      </div>

      <div className="setup-provider-heading">
        <h2 className="setup-section-title">{t("setup.providerGatewayTitle")}</h2>
        <p className="setup-section-copy">{t("setup.providerGatewayCopy")}</p>
      </div>

      <div className="setup-provider-grid">
        {PROVIDERS.setup.map((setupProvider) => (
          <button
            key={setupProvider.id}
            className={`setup-provider-card ${selectedProvider === setupProvider.id ? "selected" : ""}`}
            onClick={() => {
              setSelectedProvider(setupProvider.id);
              setSelectedAgentCliId(null);
              setError("");
            }}
          >
            <BrandLogo provider={setupProvider.id} size={24} matchTheme={true} />
            <div className="setup-provider-name">{t(setupProvider.name)}</div>
            <div className="setup-provider-desc">{t(setupProvider.desc)}</div>
            {setupProvider.tag && (
              <div className="setup-provider-tag">{t(setupProvider.tag)}</div>
            )}
          </button>
        ))}
      </div>

      <div className="setup-form">
        <div className="setup-form-title">{t("setup.formTitle")}</div>
        <div className="setup-form-copy">{t("setup.formCopy")}</div>

        {isLocal ? (
          <>
            <label className="setup-label">{t("setup.localGroupLabel")}</label>
            <div className="setup-local-presets">
              {localRuntimePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`setup-local-preset ${baseUrl === preset.baseUrl ? "active" : ""}`}
                  onClick={() => applyLocalPreset(preset.baseUrl)}
                >
                  {t(`setup.localPresets.${preset.id}`)}
                </button>
              ))}
            </div>

            <label className="setup-label setup-label--spaced-sm">
              {t("setup.remoteGroupLabel")}
            </label>
            <div className="setup-local-presets">
              {hostedRuntimePresets.map((preset) => (
                <button
                  key={preset.id}
                  className={`setup-local-preset ${baseUrl === preset.baseUrl ? "active" : ""}`}
                  onClick={() => applyLocalPreset(preset.baseUrl)}
                >
                  {t(`setup.localPresets.${preset.id}`)}
                </button>
              ))}
            </div>

            <label className="setup-label setup-label--spaced-lg">
              {t("setup.serverUrl")}
            </label>
            <input
              className="input"
              type="text"
              placeholder={t("setup.modelBaseUrlPlaceholder")}
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setError("");
              }}
              autoFocus
            />
            <div className="setup-field-hint">
              {t("setup.customServerHint")}
            </div>

            <label className="setup-label setup-label--spaced-lg">
              {t("setup.customApiKeyLabel")} {" "}
              <span className="setup-label-optional">
                {t("common.optional")}
              </span>
            </label>
            <div className="setup-input-group">
              <input
                className="input"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError("");
                }}
              />
              <button
                className="setup-toggle-visibility"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? t("common.hide") : t("common.show")}
              </button>
            </div>
            <div className="setup-field-hint">
              {t("setup.customApiKeyHint")}
            </div>
            <div className="setup-form-storage-note">
              Stored in your Hermes profile on this machine.
            </div>
          </>
        ) : provider.needsKey ? (
          <>
            <label className="setup-label">
              {t("setup.apiKeyLabel", { provider: t(provider.name) })}
            </label>
            <div className="setup-input-group">
              <input
                className="input"
                type={showKey ? "text" : "password"}
                placeholder={provider.placeholder}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void handleContinue()}
                autoFocus
              />
              <button
                className="setup-toggle-visibility"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? t("common.hide") : t("common.show")}
              </button>
            </div>

            <button
              className="setup-link"
              onClick={() => window.hermesAPI.openExternal(provider.url)}
            >
              {t("setup.noKeyHint")}
              <ExternalLink size={12} />
            </button>

            <div className="setup-form-storage-note">
              Stored in your Hermes profile on this machine.
            </div>
          </>
        ) : (
          <>
            <div className="setup-field-hint">
              {t("setup.noApiKeyRequired", { provider: t(provider.name) })}
            </div>
            <div className="setup-form-storage-note">
              Stored in your Hermes profile on this machine.
            </div>
          </>
        )}

        <label className="setup-label setup-label--spaced-lg">
          {t("setup.modelName")} {" "}
          <span className="setup-label-optional">{t("common.optional")}</span>
        </label>
        <div className="setup-model-row">
          <input
            className="input"
            type="text"
            placeholder={t("setup.modelNamePlaceholder")}
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleContinue()}
            list={
              modelDiscovery.models.length > 0 ? discoveryListId : undefined
            }
            autoComplete="off"
            autoFocus={!isLocal && !provider.needsKey}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSetupDiscoveryRefresh((count) => count + 1)}
            disabled={modelDiscovery.status === "loading" || !discoveryEnabled}
          >
            {modelDiscovery.status === "loading"
              ? "Testing connection..."
              : t("settings.testConnection")}
          </button>
        </div>
        {modelDiscovery.models.length > 0 && (
          <datalist id={discoveryListId}>
            {modelDiscovery.models.map((discoveredModel) => (
              <option key={discoveredModel} value={discoveredModel} />
            ))}
          </datalist>
        )}
        <div className="setup-field-hint">
          {modelDiscovery.status === "loading"
            ? "Testing connection and loading models..."
            : modelDiscovery.status === "ok"
              ? `Loaded ${modelDiscovery.models.length} models from this provider.`
              : modelDiscovery.status === "no-key"
                ? t("settings.discoveryNoKey")
                : modelDiscovery.status === "error"
                  ? t("settings.discoveryError")
                  : t("setup.defaultModelHint")}
        </div>

        {error && <div className="setup-error">{error}</div>}

        <button
          className={`btn btn-primary setup-continue ${isLocal ? "setup-continue--spaced" : ""}`.trim()}
          onClick={() => void handleContinue()}
          disabled={
            saving ||
            (provider.needsKey && !apiKey.trim()) ||
            (isLocal && !baseUrl.trim())
          }
        >
          {saving ? t("setup.saving") : t("setup.continue")}
          {!saving && <ArrowRight size={16} />}
        </button>
      </div>

      {oauthModal && (
        <OAuthLoginModal
          provider={oauthModal.id}
          providerLabel={oauthModal.name}
          onClose={() => setOauthModal(null)}
        />
      )}
    </div>
  );
}

export default Setup;
