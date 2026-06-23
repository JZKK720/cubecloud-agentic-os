import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, Trash, Search, X } from "../../assets/icons";
import { PROVIDERS } from "../../constants";
import { useI18n } from "../../components/useI18n";
import BrandLogo from "../../components/common/BrandLogo";
import { detectProviderFromUrl } from "./detect-provider";
import { useDiscoveredModels } from "../../hooks/useDiscoveredModels";

/**
 * V2.10.60: a result of `scanLocalServers` is a list of probed
 * (host, port) pairs. We surface only the `suggestions` part on
 * the Add/Edit modal — those are the named-provider base URLs
 * the user can one-click into the Base URL field.
 */
interface LocalServerSuggestion {
  provider: "ollama" | "lmstudio";
  baseUrl: string;
  label: string;
}

interface SavedModel {
  id: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
  createdAt: number;
}

function providerLabelKey(value: string): string {
  return PROVIDERS.options.find((p) => p.value === value)?.label || value;
}

interface ModelsProps {
  visible?: boolean;
}

function Models({ visible }: ModelsProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const [models, setModels] = useState<SavedModel[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // The active model comes from getModelConfig(); we keep its
  // provider/model/baseUrl so each card can decide whether to render
  // the "Active" pill. null means "unknown / not yet loaded".
  const [activeConfig, setActiveConfig] = useState<{
    provider: string;
    model: string;
    baseUrl: string;
  } | null>(null);
  // The full env map, used to surface the "API key linked" pill on
  // custom-provider cards. We only check the env keys listed in
  // resolveCustomEnvKey() for each card.
  const [envMap, setEnvMap] = useState<Record<string, string>>({});

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingModel, setEditingModel] = useState<SavedModel | null>(null);
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("openrouter");
  const [formModel, setFormModel] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [formError, setFormError] = useState("");
  // Whether the user has manually picked a value from the Provider dropdown
  // for this open of the modal. While false, the dropdown follows whatever
  // detectProviderFromUrl() infers from the Base URL field. Once the user
  // touches the dropdown we stop overriding their choice.
  const [providerTouched, setProviderTouched] = useState(false);
  const [providerAutoFilled, setProviderAutoFilled] = useState(false);

  // V2.10.60: Local-LLM server scan state. "Detect running servers"
  // probes 127.0.0.1 / ::1 on Ollama's :11434 and LM Studio's :1234.
  // The result lands in `localScanResult.suggestions` for the
  // one-click "Use this server" buttons in the modal.
  const [scanningLocal, setScanningLocal] = useState(false);
  const [localScanResult, setLocalScanResult] = useState<{
    suggestions: LocalServerSuggestion[];
    reachedAt: number;
  } | null>(null);
  const [localScanError, setLocalScanError] = useState<string | null>(null);

  // V2.10.60: Per-card health dot state. Keyed by `model.id` so each
  // card refreshes its own status independently. `unknown` is the
  // initial state — we don't render a dot for it. `up` / `down`
  // come from `probeLocalModelHealth`, refreshed every 30 s.
  const [health, setHealth] = useState<
    Record<string, { state: "up" | "down"; latencyMs: number; at: number }>
  >({});
  // Per-card debounce — when a probe is in flight, we don't fire
  // another one for the same card until the first one settles.
  const healthInFlightRef = useRef<Set<string>>(new Set());

  // Run a single per-card probe. Called from a useEffect after the
  // initial mount, and again from a 30 s interval for cards that
  // look like local LLM endpoints.
  const probeOneCard = useCallback(async (m: SavedModel) => {
    if (healthInFlightRef.current.has(m.id)) return;
    healthInFlightRef.current.add(m.id);
    try {
      const result = await window.hermesAPI.probeLocalModelHealth(
        m.baseUrl || "",
      );
      if (result.reachable) {
        setHealth((prev) => ({
          ...prev,
          [m.id]: {
            state: "up",
            latencyMs: result.latencyMs,
            at: Date.now(),
          },
        }));
      } else {
        setHealth((prev) => ({
          ...prev,
          [m.id]: { state: "down", latencyMs: 0, at: Date.now() },
        }));
      }
    } catch {
      setHealth((prev) => ({
        ...prev,
        [m.id]: { state: "down", latencyMs: 0, at: Date.now() },
      }));
    } finally {
      healthInFlightRef.current.delete(m.id);
    }
  }, []);

  function resolveCustomEnvKey(url: string): string {
    if (!url) return "CUSTOM_API_KEY";
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
    if (/integrate\.api\.nvidia\.com/i.test(url)) return "NVIDIA_API_KEY";
    if (/open\.bigmodel\.cn/i.test(url)) return "GLM_API_KEY";
    if (/dashscope(-intl)?\.aliyuncs\.com/i.test(url)) return "QWEN_API_KEY";
    if (/api\.minimax(i)?\.(chat|com)/i.test(url)) return "MINIMAX_API_KEY";
    if (/api\.moonshot\.cn/i.test(url)) return "MOONSHOT_API_KEY";
    if (/api\.siliconflow\.com/i.test(url)) return "SILICONFLOW_API_KEY";
    if (/api\.novita\.ai/i.test(url)) return "NOVITA_API_KEY";
    if (/api\.deepinfra\.com/i.test(url)) return "DEEPINFRA_API_KEY";
    if (/api\.sambanova\.ai/i.test(url)) return "SAMBANOVA_API_KEY";
    if (/api\.replicate\.com/i.test(url)) return "REPLICATE_API_KEY";
    if (/api\.stepfun\.com/i.test(url)) return "STEPFUN_API_KEY";
    if (/api\.hunyuan\.cloud\.tencent\.com/i.test(url)) return "HUNYUAN_API_KEY";
    if (/ark\.cn-beijing\.volces\.com/i.test(url)) return "VOLCANO_API_KEY";
    if (/qianfan\.baidubce\.com/i.test(url)) return "QIANFAN_API_KEY";
    return "CUSTOM_API_KEY";
  }

  const loadModels = useCallback(async () => {
    const list = await window.hermesAPI.listModels();
    setModels(list);
    setLoading(false);
    // Pull the active config + env in parallel so we can render the
    // "Active" and "API key linked" pills on the cards. Failures are
    // non-fatal: an empty activeConfig just means the pills render
    // dimmer / nothing.
    try {
      const [active, env] = await Promise.all([
        window.hermesAPI.getModelConfig(),
        window.hermesAPI.getEnv(),
      ]);
      setActiveConfig(active);
      setEnvMap(env);
    } catch {
      setActiveConfig(null);
      setEnvMap({});
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Re-load whenever the Models pane becomes visible — entries added
  // elsewhere (Providers save → addModel, chat picker → addModel) won't
  // otherwise appear since the component is mounted once and kept alive.
  useEffect(() => {
    if (visible) loadModels();
  }, [visible, loadModels]);

  // Live model discovery for the Add/Edit modal — feeds an HTML
  // <datalist> off the Model ID input.  Pauses when the modal is closed
  // so we don't fire background requests on every keystroke elsewhere.
  const isCustomForm = formProvider === "custom";
  const [discoveryRefresh, setDiscoveryRefresh] = useState(0);
  const discovery = useDiscoveredModels({
    provider: formProvider,
    baseUrl: isCustomForm ? formBaseUrl : undefined,
    apiKey: formApiKey || undefined,
    enabled: showModal && formProvider !== "auto",
    refreshToken: discoveryRefresh,
  });
  const modelDiscoveryListId = "models-modal-discovery";

  function openAddModal(): void {
    setEditingModel(null);
    setFormName("");
    setFormProvider("openrouter");
    setFormModel("");
    setFormBaseUrl("");
    setFormApiKey("");
    setShowApiKey(false);
    setFormError("");
    setProviderTouched(false);
    setProviderAutoFilled(false);
    setShowModal(true);
  }

  function openEditModal(m: SavedModel): void {
    setEditingModel(m);
    setFormName(m.name);
    setFormProvider(m.provider);
    setFormModel(m.model);
    setFormBaseUrl(m.baseUrl);
    setFormApiKey("");
    setShowApiKey(false);
    setFormError("");
    // Editing an existing entry — respect the saved provider, don't auto-overwrite it.
    setProviderTouched(true);
    setProviderAutoFilled(false);
    setShowModal(true);
  }

  function closeModal(): void {
    setShowModal(false);
    setEditingModel(null);
    setFormError("");
    setProviderTouched(false);
    setProviderAutoFilled(false);
  }

  // Auto-detect provider from base URL while the modal is open and the user
  // hasn't manually picked a provider yet. Detection runs on every URL
  // change so backspacing the URL also clears the auto-fill flag.
  useEffect(() => {
    if (!showModal || providerTouched) {
      if (!showModal) setProviderAutoFilled(false);
      return;
    }
    const detected = detectProviderFromUrl(formBaseUrl);
    if (detected && detected !== formProvider) {
      setFormProvider(detected);
      setProviderAutoFilled(true);
    } else if (!detected && providerAutoFilled) {
      // URL no longer matches; drop the badge but keep whatever's selected.
      setProviderAutoFilled(false);
    }
  }, [
    formBaseUrl,
    showModal,
    providerTouched,
    formProvider,
    providerAutoFilled,
  ]);

  // V2.10.60: "Detect running servers" handler. Probes 127.0.0.1
  // and ::1 on the well-known Ollama / LM Studio ports and pops the
  // results into `localScanResult.suggestions` for the modal.
  const runLocalScan = useCallback(async () => {
    setScanningLocal(true);
    setLocalScanError(null);
    try {
      const result = await window.hermesAPI.scanLocalServers([]);
      setLocalScanResult({
        suggestions: result.suggestions,
        reachedAt: Date.now(),
      });
    } catch (err) {
      setLocalScanError(
        err instanceof Error ? err.message : String(err),
      );
      setLocalScanResult(null);
    } finally {
      setScanningLocal(false);
    }
  }, []);

  // V2.10.60: Probe local-LLM cards on mount and on a 30 s
  // interval. The dot only renders for cards whose provider is
  // "ollama" / "lmstudio" / "custom" with a baseUrl — cloud
  // providers (OpenAI, Anthropic, etc.) are out of scope and
  // would generate a lot of pointless HTTP requests.
  useEffect(() => {
    const localCards = models.filter((m) => {
      if (!m.baseUrl) return false;
      const p = m.provider;
      if (p === "ollama" || p === "lmstudio" || p === "custom") return true;
      // Custom URLs that look like loopback / private IPs count as
      // local. We deliberately do NOT scan public cloud URLs.
      try {
        const u = new URL(m.baseUrl);
        const h = u.hostname;
        return (
          h === "127.0.0.1" ||
          h === "localhost" ||
          h === "::1" ||
          h.startsWith("10.") ||
          h.startsWith("192.168.") ||
          /^172\.(1[6-9]|2\d|3[01])\./.test(h)
        );
      } catch {
        return false;
      }
    });
    // Fire one probe per card in parallel; the in-flight ref
    // makes sure a 30 s re-tick doesn't pile up duplicates while
    // a slow probe is still pending.
    for (const m of localCards) {
      void probeOneCard(m);
    }
    const id = setInterval(() => {
      for (const m of localCards) {
        void probeOneCard(m);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [models, probeOneCard]);

  async function handleSave(): Promise<void> {
    const name = formName.trim();
    const model = formModel.trim();
    if (!name || !model) {
      setFormError(t("models.nameRequired"));
      return;
    }
    setFormError("");

    if (editingModel) {
      // Detect whether this edit is hitting the *currently active* model
      // before the library write — if it is, the user's intent is to
      // update that active configuration too. Without this sync, edits
      // to the active model only land in `models.json` and the next chat
      // still uses the stale `model:` block in `config.yaml` (e.g. with
      // a stale `base_url` from a previous selection). The user has to
      // open Chat, switch model away, switch back — and only that round
      // trip refreshes `config.yaml`. Library edits should "take" on
      // the active configuration when the entry being edited IS the
      // active one.
      const activeBefore = await window.hermesAPI.getModelConfig();
      const editedWasActive =
        activeBefore.provider === editingModel.provider &&
        activeBefore.model === editingModel.model;

      await window.hermesAPI.updateModel(editingModel.id, {
        name,
        provider: formProvider,
        model,
        baseUrl: formBaseUrl.trim(),
      });

      // Mirror the new values into config.yaml when this edit affects
      // the active model. The empty-baseUrl case is handled by
      // setModelConfig itself (substitutes the canonical URL for
      // built-in providers — see `provider-registry.ts`).
      if (editedWasActive) {
        const effectiveBaseUrl =
          formProvider === "custom" ? formBaseUrl.trim() : "";
        await window.hermesAPI.setModelConfig(
          formProvider,
          model,
          effectiveBaseUrl,
        );
      }
    } else {
      await window.hermesAPI.addModel(
        name,
        formProvider,
        model,
        formBaseUrl.trim(),
      );
    }

    if (formApiKey.trim() && formProvider === "custom") {
      const envKey = resolveCustomEnvKey(formBaseUrl.trim());
      await window.hermesAPI.setEnv(envKey, formApiKey.trim());
    }

    closeModal();
    await loadModels();
  }

  async function handleDelete(id: string): Promise<void> {
    await window.hermesAPI.removeModel(id);
    setConfirmDelete(null);
    await loadModels();
  }

  const filtered = models.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.provider.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="settings-container">
        <h1 className="settings-header">{t("models.title")}</h1>
        <div className="models-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <div className="models-header">
        <div>
          <h1 className="settings-header models-title-tight">
            {t("models.title")}
          </h1>
          <p className="models-subtitle">{t("models.subtitle")}</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddModal}>
          <Plus size={14} />
          {t("models.addModel")}
        </button>
      </div>

      {models.length > 0 && (
        <div className="models-search">
          <Search size={14} />
          <input
            className="models-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("models.searchPlaceholder")}
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="models-empty">
          {models.length === 0 ? (
            <>
              <p className="models-empty-text">{t("models.empty")}</p>
              <p className="models-empty-hint">{t("models.emptyHint")}</p>
            </>
          ) : (
            <p className="models-empty-text">{t("models.noMatch")}</p>
          )}
        </div>
      ) : (
        <div className="models-grid">
          {filtered.map((m) => {
            const isActive =
              !!activeConfig &&
              activeConfig.provider === m.provider &&
              activeConfig.model === m.model;
            const isLocal = m.provider === "custom";
            const envKey = isLocal
              ? resolveCustomEnvKey(m.baseUrl ?? "")
              : null;
            const hasKey = !!envKey && !!envMap[envKey];
            // V2.10.60: render the health dot for any card whose
            // baseUrl is on loopback / private / well-known local
            // LLM ports. `health[m.id]` is undefined for cards we
            // haven't probed yet (and we don't probe them at all).
            const cardHealth = health[m.id];
            return (
              <div
                key={m.id}
                className={`models-card ${isActive ? "models-card-active" : ""}`}
                onClick={() => openEditModal(m)}
              >
                <div className="models-card-header">
                  <div className="models-card-title">
                    <BrandLogo
                      provider={m.provider}
                      modelId={m.model}
                      size={20}
                    />
                    <div className="models-card-name">{m.name}</div>
                    {cardHealth && (
                      <span
                        className={`models-card-health models-card-health-${cardHealth.state}`}
                        title={
                          cardHealth.state === "up"
                            ? t("models.healthLatencyMs", {
                                ms: cardHealth.latencyMs,
                              })
                            : t("models.healthDown")
                        }
                        aria-label={
                          cardHealth.state === "up"
                            ? t("models.healthUp")
                            : t("models.healthDown")
                        }
                      />
                    )}
                  </div>
                  <div className="models-card-tags">
                    {isActive && (
                      <span className="models-pill models-pill-active">
                        {t("models.pillActive")}
                      </span>
                    )}
                    <span
                      className={`models-card-provider models-pill models-pill-${isLocal ? "local" : "api"}`}
                    >
                      {t(providerLabelKey(m.provider))}
                    </span>
                  </div>
                </div>
                <div className="models-card-model">{m.model}</div>
                {m.baseUrl && <div className="models-card-url">{m.baseUrl}</div>}
                {isLocal && (
                  <div className="models-card-key">
                    <span
                      className={`models-pill models-pill-key ${hasKey ? "models-pill-key-yes" : "models-pill-key-no"}`}
                    >
                      {hasKey
                        ? t("models.pillKeyLinked")
                        : t("models.pillKeyMissing")}
                    </span>
                  </div>
                )}
                <div className="models-card-footer">
                  {confirmDelete === m.id ? (
                    <div
                      className="models-card-confirm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{t("models.deleteConfirm")}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-text"
                        onClick={() => handleDelete(m.id)}
                      >
                        {t("models.yes")}
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => setConfirmDelete(null)}
                      >
                        {t("models.no")}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn-ghost models-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(m.id);
                      }}
                      title={t("models.deleteModelTitle")}
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="models-modal-overlay" onClick={closeModal}>
          <div className="models-modal" onClick={(e) => e.stopPropagation()}>
            <div className="models-modal-header">
              <h2 className="models-modal-title">
                {editingModel ? t("models.editModel") : t("models.addModel")}
              </h2>
              <button
                type="button"
                className="btn-ghost"
                onClick={closeModal}
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="models-modal-body">
              <div className="models-modal-field">
                <label className="models-modal-label">
                  {t("models.displayName")}
                </label>
                <input
                  className="input"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("models.namePlaceholder")}
                  autoFocus
                />
              </div>

              <div className="models-modal-field">
                <label
                  className="models-modal-label"
                  htmlFor="model-form-provider"
                >
                  {t("common.provider")}
                  {providerAutoFilled && !providerTouched && (
                    <span className="models-modal-auto-badge">
                      &nbsp;· auto-detected from base URL
                    </span>
                  )}
                </label>
                <select
                  id="model-form-provider"
                  className="input"
                  value={formProvider}
                  onChange={(e) => {
                    setFormProvider(e.target.value);
                    setProviderTouched(true);
                    setProviderAutoFilled(false);
                  }}
                  aria-label={t("common.provider")}
                >
                  {PROVIDERS.options.map((p) => (
                    <option key={p.value} value={p.value}>
                      {t(p.label)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="models-modal-field">
                <label className="models-modal-label">
                  {t("models.modelId")}
                </label>
                <div className="settings-model-row">
                  <input
                    className="input"
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder={t("models.modelIdPlaceholder")}
                    list={
                      discovery.models.length > 0
                        ? modelDiscoveryListId
                        : undefined
                    }
                    autoComplete="off"
                  />
                  {discovery.status !== "unsupported" &&
                    discovery.status !== "idle" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDiscoveryRefresh((n) => n + 1)}
                        disabled={discovery.status === "loading"}
                        title={t("settings.refreshModels")}
                      >
                        ↻
                      </button>
                    )}
                </div>
                {discovery.models.length > 0 && (
                  <datalist id={modelDiscoveryListId}>
                    {discovery.models.map((m) => {
                      // Surface free vs paid in the autocomplete —
                      // Nous Portal flags this in its catalog (#367).
                      // The browser's datalist renders the `label`
                      // attribute as a grey suffix next to the value.
                      const isFree = discovery.freeModels?.includes(m);
                      return (
                        <option
                          key={m}
                          value={m}
                          label={isFree ? t("models.freeBadge") : undefined}
                        />
                      );
                    })}
                  </datalist>
                )}
                {discovery.status !== "idle" &&
                  discovery.status !== "unsupported" && (
                    <span className="models-modal-hint">
                      {discovery.status === "loading"
                        ? t("settings.discoveringModels")
                        : discovery.status === "ok"
                          ? t("settings.discoveredCount", {
                              count: discovery.models.length,
                            })
                          : discovery.status === "no-key"
                            ? t("settings.discoveryNoKey")
                            : discovery.status === "error"
                              ? t("settings.discoveryError")
                              : ""}
                    </span>
                  )}
              </div>

              <div className="models-modal-field">
                <label className="models-modal-label">
                  {t("common.baseUrl")} ({t("common.optional")})
                </label>
                <div className="settings-model-row">
                  <input
                    className="input"
                    type="text"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder={t("models.baseUrlPlaceholder")}
                  />
                  {/* V2.10.60: one-click "Detect running servers"
                      button. Probes loopback on the well-known
                      Ollama / LM Studio ports; the result populates
                      a "Use this server" list under the input. */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={runLocalScan}
                    disabled={scanningLocal}
                    title={t("models.scanLocalHelp")}
                  >
                    {scanningLocal
                      ? t("models.scanning")
                      : t("models.scanLocal")}
                  </button>
                </div>
                {/* V2.10.60: local-scan suggestions. Each entry is a
                    "Use this server" button that fills the Base URL
                    field with a ready-to-paste loopback URL and
                    picks the right provider in the dropdown. */}
                {localScanResult && localScanResult.suggestions.length > 0 && (
                  <div className="models-local-suggestions">
                    <div className="models-local-suggestions-label">
                      {t("models.localFound")}
                    </div>
                    {localScanResult.suggestions.map((s) => (
                      <button
                        type="button"
                        key={`${s.provider}@${s.baseUrl}`}
                        className="btn btn-secondary btn-sm models-local-suggestion"
                        onClick={() => {
                          setFormBaseUrl(s.baseUrl);
                          setFormProvider(s.provider);
                          setProviderTouched(true);
                          setProviderAutoFilled(false);
                        }}
                      >
                        <span className="models-local-suggestion-label">
                          {s.label}
                        </span>
                        <span className="models-local-suggestion-url">
                          {s.baseUrl}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {localScanResult &&
                  localScanResult.suggestions.length === 0 && (
                    <div className="models-modal-hint">
                      {t("models.localFoundNone")}
                    </div>
                  )}
                {localScanError && (
                  <div className="models-modal-hint models-modal-hint-error">
                    {localScanError}
                  </div>
                )}
                <span className="models-modal-hint">
                  {t("models.customProviderHint")}
                </span>
              </div>

              {formProvider === "custom" && (
                <div className="models-modal-field">
                  <label className="models-modal-label">
                    {t("models.apiKeyLabel")} ({t("common.optional")})
                  </label>
                  <div className="setup-input-group">
                    <input
                      className="input"
                      type={showApiKey ? "text" : "password"}
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    <button
                      className="setup-toggle-visibility"
                      onClick={() => setShowApiKey(!showApiKey)}
                      type="button"
                    >
                      {showApiKey ? t("common.hide") : t("common.show")}
                    </button>
                  </div>
                  <span className="models-modal-hint">
                    {t("models.apiKeyHint")}
                  </span>
                </div>
              )}

              {formError && <div className="models-error">{formError}</div>}
            </div>

            <div className="models-modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={closeModal}>
                {t("common.cancel")}
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                {editingModel ? t("models.update") : t("models.addModel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Models;
