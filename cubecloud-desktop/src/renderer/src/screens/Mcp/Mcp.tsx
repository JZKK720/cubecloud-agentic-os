import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../components/useI18n";
import {
  searchBundledMcpServers,
  validateMcpDetail,
  type BundledMcpServer,
} from "./registry";

interface McpServer {
  name: string;
  type: string;
  enabled: boolean;
  detail: string;
}

interface McpProps {
  profile?: string;
}

function TransportBadge({
  type,
  httpLabel,
  stdioLabel,
}: {
  type: string;
  httpLabel: string;
  stdioLabel: string;
}): React.JSX.Element {
  const isHttp = type === "http";
  return (
    <span
      className={`mcp-transport ${isHttp ? "mcp-transport-http" : "mcp-transport-stdio"}`}
    >
      {isHttp ? httpLabel : stdioLabel}
    </span>
  );
}

function StatusDot({
  enabled,
  enabledLabel,
  disabledLabel,
}: {
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
}): React.JSX.Element {
  return (
    <span
      className={`mcp-status ${enabled ? "mcp-status-on" : "mcp-status-off"}`}
    >
      <span className="mcp-status-dot" />
      {enabled ? enabledLabel : disabledLabel}
    </span>
  );
}

export default function Mcp({ profile }: McpProps): React.JSX.Element {
  const { t } = useI18n();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  // Prefill values supplied by the search panel when the user clicks
  // "Add" on a bundled registry entry. Cleared after the form reads
  // them (handled inside AddMcpForm).
  const [prefill, setPrefill] = useState<{
    name: string;
    type: "http" | "stdio";
    detail: string;
  } | null>(null);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const list = await window.hermesAPI.listMcpServers(profile);
      setServers(list);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleToggle = useCallback(
    async (name: string, currentEnabled: boolean): Promise<void> => {
      setPending(name);
      const previous = servers;
      // Optimistic update so the toggle feels immediate.
      setServers((prev) =>
        prev.map((s) => (s.name === name ? { ...s, enabled: !currentEnabled } : s)),
      );
      try {
        const res = await window.hermesAPI.setMcpServerEnabled(
          name,
          !currentEnabled,
          profile,
        );
        if (!res.ok) {
          // Roll back on failure.
          setServers(previous);
          setError(res.error ?? t("mcp.errorToggle"));
          return;
        }
        window.dispatchEvent(new Event("mcp:changed"));
      } catch (err) {
        setServers(previous);
        setError(t("mcp.errorToggle") + " " + String(err));
      } finally {
        setPending(null);
      }
    },
    [profile, servers, t],
  );

  const handleRemove = useCallback(
    async (name: string): Promise<void> => {
      if (!window.confirm(t("mcp.removeConfirm"))) return;
      setPending(name);
      try {
        const res = await window.hermesAPI.removeMcpServer(name, profile);
        if (!res.ok) {
          setError(res.error ?? t("mcp.errorRemove"));
          return;
        }
        setServers((prev) => prev.filter((s) => s.name !== name));
        window.dispatchEvent(new Event("mcp:changed"));
      } catch (err) {
        setError(t("mcp.errorRemove") + " " + String(err));
      } finally {
        setPending(null);
      }
    },
    [profile, t],
  );

  const enabledCount = servers.filter((s) => s.enabled).length;

  if (loading) {
    return (
      <div className="mcp-container">
        <div className="mcp-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="mcp-container">
      <div className="mcp-header">
        <div className="mcp-header-text">
          <h2 className="mcp-title">{t("mcp.title")}</h2>
          <p className="mcp-subtitle">{t("mcp.subtitle")}</p>
        </div>
        <div className="mcp-header-actions">
          {servers.length > 0 && (
            <span className="mcp-badge">
              {t("mcp.badge", {
                enabled: enabledCount,
                total: servers.length,
              })}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? t("mcp.addCancel") : t("mcp.addTitle")}
          </button>
        </div>
      </div>

      {error && (
        <div className="mcp-error" role="alert">
          {error}
        </div>
      )}

      {showAdd && (
        <AddMcpForm
          onCancel={() => setShowAdd(false)}
          onAdded={async () => {
            setShowAdd(false);
            setPrefill(null);
            await reload();
          }}
          profile={profile}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill(null)}
        />
      )}

      <McpSearchPanel
        onAddFromRegistry={(entry) => {
          setPrefill({
            name: entry.name,
            type: entry.transport,
            detail: entry.detail,
          });
          setShowAdd(true);
        }}
      />

      {servers.length === 0 ? (
        <div className="mcp-empty">
          <p>{t("mcp.empty")}</p>
        </div>
      ) : (
        <ul className="mcp-list" aria-label={t("mcp.title")}>
          {servers.map((s) => (
            <li key={s.name} className="mcp-row" data-enabled={s.enabled}>
              <div className="mcp-row-main">
                <div className="mcp-row-name">
                  <span className="mcp-row-icon" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <circle cx="6" cy="6" r="1" />
                      <circle cx="6" cy="18" r="1" />
                    </svg>
                  </span>
                  <span className="mcp-row-label">{s.name}</span>
                </div>
                <div className="mcp-row-meta">
                  <TransportBadge
                    type={s.type}
                    httpLabel={t("mcp.http")}
                    stdioLabel={t("mcp.stdio")}
                  />
                  <StatusDot
                    enabled={s.enabled}
                    enabledLabel={t("mcp.enabled")}
                    disabledLabel={t("mcp.disabled")}
                  />
                  <code className="mcp-row-detail">{s.detail}</code>
                </div>
              </div>
              <div className="mcp-row-actions">
                <label
                  className="mcp-toggle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    disabled={pending === s.name}
                    onChange={() => handleToggle(s.name, s.enabled)}
                    aria-label={`${s.name} ${s.enabled ? t("mcp.enabled") : t("mcp.disabled")}`}
                  />
                  <span className="mcp-toggle-track" />
                </label>
                <button
                  type="button"
                  className="btn-ghost mcp-remove-btn"
                  disabled={pending === s.name}
                  onClick={() => handleRemove(s.name)}
                >
                  {t("mcp.remove")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface AddMcpFormProps {
  onCancel: () => void;
  onAdded: () => void | Promise<void>;
  profile?: string;
  prefill?: { name: string; type: "http" | "stdio"; detail: string } | null;
  onPrefillConsumed?: () => void;
}

type AddType = "http" | "stdio";

function AddMcpForm({
  onCancel,
  onAdded,
  profile,
  prefill,
  onPrefillConsumed,
}: AddMcpFormProps): React.JSX.Element {
  const { t } = useI18n();
  const [name, setName] = useState(prefill?.name ?? "");
  const [type, setType] = useState<AddType>(prefill?.type ?? "http");
  const [detail, setDetail] = useState(prefill?.detail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When a registry entry fills the form, clear the parent's prefill
  // so a re-open of the form starts blank.
  useEffect(() => {
    if (prefill) onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  // Local validation message for the detail field (URL scheme or
  // stdio command shape). The IPC handler does its own validation
  // but we want fast feedback in the form.
  const detailError = useMemo(() => {
    if (!detail.trim()) return null;
    return validateMcpDetail(type, detail);
  }, [type, detail]);

  const submit = useCallback(async (): Promise<void> => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedDetail = detail.trim();
    if (!/^[\w-]+$/.test(trimmedName)) {
      setError(t("mcp.addErrorInvalidName"));
      return;
    }
    if (!trimmedDetail || trimmedDetail.length > 2048) {
      setError(t("mcp.addErrorInvalidDetail"));
      return;
    }
    if (detailError) {
      setError(
        detailError === "httpScheme"
          ? t("mcp.addErrorHttpScheme")
          : detailError === "stdioPrefix"
            ? t("mcp.addErrorStdioPrefix")
            : t("mcp.addErrorInvalidDetail"),
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await window.hermesAPI.addMcpServer(
        {
          name: trimmedName,
          type,
          enabled: true,
          detail: trimmedDetail,
        },
        profile,
      );
      if (!res.ok) {
        // The main process returns "server 'X' already exists" for
        // duplicates; surface a friendlier message.
        if (res.error?.includes("already exists")) {
          setError(t("mcp.addErrorDuplicate"));
        } else {
          setError(res.error ?? t("mcp.errorAdd"));
        }
        return;
      }
      await onAdded();
    } catch (err) {
      setError(t("mcp.errorAdd") + " " + String(err));
    } finally {
      setSubmitting(false);
    }
  }, [detail, name, onAdded, profile, t, type]);

  return (
    <div className="mcp-add">
      <h3 className="mcp-add-title">{t("mcp.addTitle")}</h3>
      <div className="mcp-add-grid">
        <label className="mcp-add-field">
          <span className="mcp-add-label">{t("mcp.addName")}</span>
          <input
            type="text"
            className="input"
            value={name}
            placeholder={t("mcp.addNamePlaceholder")}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </label>
        <label className="mcp-add-field">
          <span className="mcp-add-label">{t("mcp.addType")}</span>
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as AddType)}
            disabled={submitting}
          >
            <option value="http">{t("mcp.addTypeHttp")}</option>
            <option value="stdio">{t("mcp.addTypeStdio")}</option>
          </select>
        </label>
        <label className="mcp-add-field mcp-add-field-wide">
          <span className="mcp-add-label">{t("mcp.addDetail")}</span>
          <input
            type="text"
            className="input"
            value={detail}
            placeholder={t("mcp.addDetailPlaceholder")}
            onChange={(e) => setDetail(e.target.value)}
            disabled={submitting}
          />
          {detailError && !error && (
            <span className="mcp-add-hint">{t(`mcp.addError_${detailError}`)}</span>
          )}
        </label>
      </div>
      {error && (
        <div className="mcp-add-error" role="alert">
          {error}
        </div>
      )}
      <div className="mcp-add-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={submitting}
        >
          {t("mcp.addCancel")}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={submit}
          disabled={submitting}
        >
          {t("mcp.addSubmit")}
        </button>
      </div>
    </div>
  );
}

interface McpSearchPanelProps {
  onAddFromRegistry: (entry: BundledMcpServer) => void;
}

function McpSearchPanel({
  onAddFromRegistry,
}: McpSearchPanelProps): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => searchBundledMcpServers(query).slice(0, 20),
    [query],
  );
  return (
    <div className="mcp-search-panel">
      <div className="mcp-search-row">
        <span className="mcp-search-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="text"
          className="input mcp-search-input"
          placeholder={t("mcp.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {query.trim() && (
        <div className="mcp-search-results" aria-live="polite">
          <div className="mcp-search-results-header">
            {t("mcp.resultsHeader", { count: results.length })}
          </div>
          {results.length === 0 ? (
            <div className="mcp-search-empty">
              {t("mcp.searchNoResults")}
            </div>
          ) : (
            <ul className="mcp-search-list">
              {results.map((entry) => (
                <li
                  key={entry.name}
                  className="mcp-search-item"
                  data-category={entry.category}
                >
                  <div className="mcp-search-item-main">
                    <div className="mcp-search-item-name">
                      {entry.title}
                      <span className="mcp-search-item-cat">
                        {t(`mcp.category.${entry.category}`)}
                      </span>
                    </div>
                    <div className="mcp-search-item-desc">
                      {entry.description}
                    </div>
                    {entry.envKeys && entry.envKeys.length > 0 && (
                      <div className="mcp-search-item-env">
                        {t("mcp.envKeys")}:{" "}
                        {entry.envKeys.map((k, i) => (
                          <code key={k}>
                            {k}
                            {i < (entry.envKeys?.length ?? 0) - 1 ? ", " : ""}
                          </code>
                        ))}
                      </div>
                    )}
                    {entry.hint && (
                      <div className="mcp-search-item-hint">{entry.hint}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onAddFromRegistry(entry)}
                  >
                    {t("mcp.add")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
