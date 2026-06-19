// EverOS surface — long-term memory harnesses backed by a self-hosted
// EverCore / EverOS server (https://github.com/JZKK720/EverOS).
//
// Wire shape (matches src/main/everos.ts and the renderer preload
// bridge in src/preload/index.d.ts):
//   - everosGetConfig / everosSaveConfig → persisted to desktop.json
//   - everosPing → GET {baseUrl}/health
//   - everosAddMemory → POST {baseUrl}/api/v1/memories
//   - everosSearch → POST {baseUrl}/api/v1/memories/search
//   - everosListRecent → wraps everosSearch with a wildcard query
//
// The screen is fully functional even when the local EverCore runtime
// is not installed — the operator just needs a reachable base URL.

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import {
  Refresh,
  Search,
  Plus,
  Alert as AlertIcon,
  Check,
} from "../../assets/icons";

type EverOsConfig = {
  baseUrl: string;
  userId: string;
  groupId: string;
  topK: number;
  memoryTypes: string[];
  retrieveMethod: "hybrid" | "keyword" | "vector";
  enabled: boolean;
  apiKey: string | null;
};

type EverOsHealthStatus = {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
};

type EverOsEpisode = {
  episodeId: string;
  content: string;
  score: number;
  createdAt: number | null;
  metadata: Record<string, unknown> | null;
};

type EverOsRecentItem = {
  id: string;
  content: string;
  senderId: string | null;
  role: string | null;
  createdAt: number | null;
};

/** Subset of the sidecar lifecycle surface that the screen
 *  renders in the "sidecar" panel. Mirrors the main-process
 *  `EverOsSidecarStatus` shape; kept local to the screen so
 *  the rest of the app can stay decoupled from the lifecycle
 *  details. */
interface EverOsSidecarStatus {
  state: "stopped" | "starting" | "running" | "crashed" | "exited";
  running: boolean;
  pid: number | null;
  port: number | null;
  baseUrl: string;
  lastError: string | null;
  crashCount: number;
  startedAt: number | null;
  uptimeMs: number | null;
  reason: string | null;
}

interface EverOsSidecarLogTail {
  lines: string[];
  totalBytes: number;
}

interface EverOSProps {
  visible?: boolean;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "--";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "--";
  }
}

function EverOS({ visible: _visible }: EverOSProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const isWindows = window.electron?.process?.platform === "win32";
  const [config, setConfig] = useState<EverOsConfig | null>(null);
  const [health, setHealth] = useState<EverOsHealthStatus | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [episodes, setEpisodes] = useState<EverOsEpisode[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recent, setRecent] = useState<EverOsRecentItem[] | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [addText, setAddText] = useState("");
  const [addResult, setAddResult] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EverOsConfig | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [pulsing, setPulsing] = useState(false);

  // Sidecar state. Probed on every load; the lifecycle card
  // renders one of {stopped, starting, running, crashed} with
  // a Start/Stop/Restart button that calls the matching IPC
  // handler. The log tail panel is hidden when there are no
  // lines so it doesn't take vertical space on a clean sidecar.
  const [sidecar, setSidecar] = useState<EverOsSidecarStatus | null>(null);
  const [logTail, setLogTail] = useState<EverOsSidecarLogTail | null>(null);
  const [sidecarBusy, setSidecarBusy] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const loadAll = useCallback(async () => {
    setPulsing(true);
    try {
      const cfg = await window.hermesAPI.everosGetConfig();
      setConfig(cfg);
      setDraft(cfg);
      const h = await window.hermesAPI.everosPing();
      setHealth(h);
      if (h.reachable) {
        const r = await window.hermesAPI.everosListRecent(20);
        if (r.success) {
          setRecent(r.items);
          setRecentError(null);
        } else {
          setRecent([]);
          setRecentError(r.error ?? t("everos.error.recentFailed"));
        }
      } else {
        setRecent(null);
        setRecentError(null);
      }
      // Sidecar probe is best-effort — if the IPC surface
      // ever regresses, we don't want the screen to fail to
      // render. We catch and continue with a "stopped"
      // fallback so the user can still start it manually.
      try {
        const sc = await window.hermesAPI.everosSidecarStatus();
        setSidecar(sc);
        if (sc.state === "crashed" || sc.state === "exited") {
          const tail = await window.hermesAPI.everosSidecarLogTail();
          setLogTail(tail);
        }
      } catch {
        setSidecar(null);
      }
    } finally {
      setPulsing(false);
    }
  }, [t]);

  useEffect(() => {
    if (_visible) void loadAll();
  }, [_visible, loadAll]);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    setSearchError(null);
    try {
      const result = await window.hermesAPI.everosSearch(
        query.trim() || "recent memory",
        { topK: 8 },
      );
      if (result.success) {
        setEpisodes(result.episodes);
      } else {
        setEpisodes(null);
        setSearchError(result.error ?? t("everos.error.searchFailed"));
      }
    } finally {
      setSearching(false);
    }
  }, [query, t]);

  const handleAdd = useCallback(async () => {
    if (!addText.trim()) return;
    setAdding(true);
    setAddResult(null);
    try {
      const result = await window.hermesAPI.everosAddMemory([
        {
          role: "user",
          content: addText.trim(),
        },
      ]);
      if (result.success) {
        setAddResult(t("everos.add.success", { count: result.storedCount }));
        setAddText("");
      } else {
        setAddResult(t("everos.add.failed", { error: result.error ?? "?" }));
      }
    } finally {
      setAdding(false);
    }
  }, [addText, t]);

  const handleSaveConfig = useCallback(async () => {
    if (!draft) return;
    setSavingConfig(true);
    try {
      const saved = await window.hermesAPI.everosSaveConfig({
        baseUrl: draft.baseUrl,
        userId: draft.userId,
        groupId: draft.groupId,
        topK: draft.topK,
        memoryTypes: draft.memoryTypes,
        retrieveMethod: draft.retrieveMethod,
        enabled: draft.enabled,
        apiKey: draft.apiKey,
      });
      setConfig(saved);
      setDraft(saved);
      setEditing(false);
      const h = await window.hermesAPI.everosPing();
      setHealth(h);
    } finally {
      setSavingConfig(false);
    }
  }, [draft]);

  // Sidecar lifecycle handlers. Each one re-probes the
  // status after the action so the lifecycle card reflects
  // the new state without a manual refresh. User-triggered
  // restarts bypass the auto-restart crash cap inside the
  // manager.
  const sidecarStart = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.everosSidecarStart();
      setSidecar(next);
      const tail = await window.hermesAPI.everosSidecarLogTail();
      setLogTail(tail);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const sidecarStop = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.everosSidecarStop();
      setSidecar(next);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const sidecarRestart = useCallback(async () => {
    setSidecarBusy(true);
    try {
      const next = await window.hermesAPI.everosSidecarRestart();
      setSidecar(next);
      const tail = await window.hermesAPI.everosSidecarLogTail();
      setLogTail(tail);
    } finally {
      setSidecarBusy(false);
    }
  }, []);

  const refreshLogTail = useCallback(async () => {
    const tail = await window.hermesAPI.everosSidecarLogTail();
    setLogTail(tail);
  }, []);

  const clearLogTail = useCallback(async () => {
    await window.hermesAPI.everosSidecarClearLogs();
    setLogTail({ lines: [], totalBytes: 0 });
  }, []);

  return (
    <section className="screen everos-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("everos.eyebrow")}</p>
          <h1>{t("everos.title")}</h1>
          <p className="screen-summary">{t("everos.summary")}</p>
        </div>
        <div className="header-actions">
          <button
            className="ghost-button"
            onClick={() => void loadAll()}
            disabled={pulsing}
          >
            <Refresh size={14} />
            {pulsing ? t("common.refreshing") : t("common.refresh")}
          </button>
          <button
            className="ghost-button"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t("everos.config.cancel") : t("everos.config.edit")}
          </button>
        </div>
      </header>

      {isWindows && (
        <article className="panel-card">
          <h2>
            {t("everos.windowsNote.title", {
              defaultValue: "Windows note",
            })}
          </h2>
          <p className="workspace-copy">
            <AlertIcon size={14} /> {t("everos.windowsNote.body", {
              defaultValue:
                "Managed local EverOS may still require WSL or a remote host on Windows. If the local sidecar fails to start, keep using this screen against a WSL-hosted or remote EverOS base URL.",
            })}
          </p>
        </article>
      )}

      {/* Sidecar lifecycle card. Renders the spawn process
          state, a Start/Stop/Restart control, the last error
          line, and (when the user expands it) a 200-line log
          tail. Always visible so the operator can see at a
          glance whether the local runtime is healthy. */}
      {sidecar && (
        <article className="panel-card">
          <h2>
            <span
              className={`everos-sidecar-pill state-${sidecar.state}`}
              aria-label={sidecar.state}
            >
              {sidecar.state}
            </span>{" "}
            {t("everos.sidecar.title")}
          </h2>
          <p className="workspace-copy">
            {t("everos.sidecar.body", {
              baseUrl: sidecar.baseUrl,
            })}
          </p>
          {sidecar.reason && (
            <p className="workspace-copy">
              <strong>{t("everos.sidecar.reason")}:</strong>{" "}
              {sidecar.reason}
            </p>
          )}
          {sidecar.lastError && (
            <p className="workspace-copy error">
              <strong>{t("everos.sidecar.lastError")}:</strong>{" "}
              {sidecar.lastError}
            </p>
          )}
          <div className="operator-field-grid">
            <div className="operator-field">
              <span>{t("everos.sidecar.pid")}</span>
              <strong>{sidecar.pid ?? "--"}</strong>
            </div>
            <div className="operator-field">
              <span>{t("everos.sidecar.port")}</span>
              <strong>{sidecar.port ?? "--"}</strong>
            </div>
            <div className="operator-field">
              <span>{t("everos.sidecar.crashCount")}</span>
              <strong>{sidecar.crashCount}</strong>
            </div>
            <div className="operator-field">
              <span>{t("everos.sidecar.uptime")}</span>
              <strong>
                {sidecar.uptimeMs !== null
                  ? `${Math.max(0, Math.floor(sidecar.uptimeMs / 1000))}s`
                  : "--"}
              </strong>
            </div>
          </div>
          <div className="registry-footer">
            {sidecar.state === "stopped" ||
            sidecar.state === "exited" ||
            sidecar.state === "crashed" ? (
              <button
                className="toggle-button enabled"
                onClick={() => void sidecarStart()}
                disabled={sidecarBusy}
              >
                {t("everos.sidecar.start")}
              </button>
            ) : (
              <button
                className="toggle-button"
                onClick={() => void sidecarStop()}
                disabled={sidecarBusy}
              >
                {t("everos.sidecar.stop")}
              </button>
            )}
            <button
              className="ghost-button"
              onClick={() => void sidecarRestart()}
              disabled={sidecarBusy}
            >
              {t("everos.sidecar.restart")}
            </button>
            <button
              className="ghost-button"
              onClick={() => void refreshLogTail()}
              disabled={sidecarBusy}
            >
              {t("everos.sidecar.refreshLogs")}
            </button>
          </div>
          {logTail && logTail.lines.length > 0 && (
            <details
              className="everos-sidecar-logs"
              open={showLogs}
              onToggle={(e) =>
                setShowLogs((e.target as HTMLDetailsElement).open)
              }
            >
              <summary>
                {t("everos.sidecar.logsSummary", {
                  count: logTail.lines.length,
                })}
              </summary>
              <pre className="mono">
                {logTail.lines.map((line, idx) => (
                  <span key={idx}>{line + "\n"}</span>
                ))}
              </pre>
              <button
                className="ghost-button"
                onClick={() => void clearLogTail()}
              >
                {t("everos.sidecar.clearLogs")}
              </button>
            </details>
          )}
        </article>
      )}

      {editing && draft && (
        <article className="panel-card">
          <h2>{t("everos.config.title")}</h2>
          <p className="workspace-copy">{t("everos.config.body")}</p>
          <div className="operator-input-grid">
            <label className="operator-input-group">
              <span>{t("everos.config.baseUrl")}</span>
              <input
                type="text"
                className="operator-input"
                value={draft.baseUrl}
                onChange={(e) =>
                  setDraft({ ...draft, baseUrl: e.target.value })
                }
                placeholder="http://127.0.0.1:1995"
              />
            </label>
            <label className="operator-input-group">
              <span>{t("everos.config.apiKey")}</span>
              <input
                type="password"
                className="operator-input"
                value={draft.apiKey ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, apiKey: e.target.value })
                }
                placeholder="optional"
              />
            </label>
            <label className="operator-input-group">
              <span>{t("everos.config.userId")}</span>
              <input
                type="text"
                className="operator-input"
                value={draft.userId}
                onChange={(e) =>
                  setDraft({ ...draft, userId: e.target.value })
                }
              />
            </label>
            <label className="operator-input-group">
              <span>{t("everos.config.groupId")}</span>
              <input
                type="text"
                className="operator-input"
                value={draft.groupId}
                onChange={(e) =>
                  setDraft({ ...draft, groupId: e.target.value })
                }
              />
            </label>
            <label className="operator-input-group">
              <span>{t("everos.config.topK")}</span>
              <input
                type="number"
                min={1}
                max={50}
                className="operator-input"
                value={draft.topK}
                onChange={(e) =>
                  setDraft({ ...draft, topK: Number(e.target.value) || 5 })
                }
              />
            </label>
            <label className="operator-input-group">
              <span>{t("everos.config.method")}</span>
              <select
                className="operator-input"
                value={draft.retrieveMethod}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    retrieveMethod: e.target.value as EverOsConfig["retrieveMethod"],
                  })
                }
              >
                <option value="hybrid">hybrid</option>
                <option value="keyword">keyword</option>
                <option value="vector">vector</option>
              </select>
            </label>
          </div>
          <div className="registry-footer">
            <button
              className="toggle-button enabled"
              onClick={() => void handleSaveConfig()}
              disabled={savingConfig}
            >
              {savingConfig ? t("common.saving") : t("everos.config.save")}
            </button>
          </div>
        </article>
      )}

      <div className="everos-grid">
        <article className="panel-card">
          <h2>{t("everos.health.title")}</h2>
          <div className="everos-health">
            <span
              className={`status-chip ${
                health?.reachable
                  ? "on"
                  : health === null
                    ? "assembling"
                    : "off"
              }`}
            >
              {health?.reachable
                ? t("everos.health.reachable")
                : health === null
                  ? t("everos.health.probing")
                  : t("everos.health.unreachable")}
            </span>
            {health?.version && (
              <span className="pill">v{health.version}</span>
            )}
            {health?.status && (
              <span className="pill">{health.status}</span>
            )}
          </div>
          {health && !health.reachable && health.detail && (
            <p className="workspace-copy error">
              <AlertIcon size={14} /> {health.detail}
            </p>
          )}
          {health?.reachable && config && (
            <div className="operator-field-grid">
              <div className="operator-field">
                <span>{t("everos.config.baseUrl")}</span>
                <strong className="mono">{config.baseUrl}</strong>
              </div>
              <div className="operator-field">
                <span>{t("everos.config.userId")}</span>
                <strong>{config.userId}</strong>
              </div>
              <div className="operator-field">
                <span>{t("everos.config.groupId")}</span>
                <strong>{config.groupId}</strong>
              </div>
              <div className="operator-field">
                <span>{t("everos.health.scannedAt")}</span>
                <strong>{formatTimestamp(Date.parse(health.scannedAt))}</strong>
              </div>
            </div>
          )}
        </article>

        <article className="panel-card">
          <h2>{t("everos.add.title")}</h2>
          <p className="workspace-copy">{t("everos.add.body")}</p>
          <textarea
            className="operator-textarea"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            rows={3}
            placeholder={t("everos.add.placeholder")}
            disabled={!health?.reachable}
          />
          <div className="registry-footer">
            <button
              className="toggle-button enabled"
              onClick={() => void handleAdd()}
              disabled={adding || !addText.trim() || !health?.reachable}
            >
              <Plus size={14} />
              {adding ? t("everos.add.sending") : t("everos.add.cta")}
            </button>
            {addResult && (
              <span
                className={
                  addResult.startsWith(t("everos.add.success").slice(0, 5))
                    ? "pill success"
                    : "pill error"
                }
              >
                {addResult}
              </span>
            )}
          </div>
        </article>

        <article className="panel-card panel-card-span-2">
          <h2>{t("everos.search.title")}</h2>
          <p className="workspace-copy">{t("everos.search.body")}</p>
          <div className="search-row">
            <input
              type="text"
              className="operator-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("everos.search.placeholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSearch();
              }}
            />
            <button
              className="toggle-button enabled"
              onClick={() => void handleSearch()}
              disabled={searching || !health?.reachable}
            >
              <Search size={14} />
              {searching ? t("everos.search.searching") : t("everos.search.cta")}
            </button>
          </div>
          {searchError && (
            <p className="workspace-copy error">
              <AlertIcon size={14} /> {searchError}
            </p>
          )}
          {episodes && episodes.length === 0 && (
            <p className="workspace-copy">{t("everos.search.empty")}</p>
          )}
          {episodes && episodes.length > 0 && (
            <ol className="everos-episode-list">
              {episodes.map((ep) => (
                <li key={ep.episodeId} className="everos-episode">
                  <div className="everos-episode-meta">
                    <span className="badge">{ep.episodeId.slice(0, 12)}…</span>
                    <span className="pill">score {ep.score.toFixed(3)}</span>
                    <span className="pill">{formatTimestamp(ep.createdAt)}</span>
                  </div>
                  <p>{ep.content}</p>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="panel-card panel-card-span-2">
          <h2>{t("everos.recent.title")}</h2>
          {recentError && (
            <p className="workspace-copy error">
              <AlertIcon size={14} /> {recentError}
            </p>
          )}
          {recent && recent.length === 0 && (
            <p className="workspace-copy">{t("everos.recent.empty")}</p>
          )}
          {recent && recent.length > 0 && (
            <ul className="everos-recent-list">
              {recent.map((r) => (
                <li key={r.id} className="everos-recent">
                  <span className="everos-recent-time">
                    {formatTimestamp(r.createdAt)}
                  </span>
                  <p>{r.content}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel-card panel-card-span-2">
          <h2>{t("everos.setup.title")}</h2>
          <p className="workspace-copy">{t("everos.setup.body")}</p>
          <pre className="mono everos-snippet">
{`git clone https://github.com/JZKK720/EverOS.git
cd EverOS/methods/EverCore
docker compose up -d
curl -LsSf https://astral.sh/uv/install.sh | sh
uv sync
cp env.template .env  # set LLM_API_KEY + VECTORIZE_API_KEY
uv run python src/run.py  # listens on http://localhost:1995`}
          </pre>
          <p className="workspace-copy">
            <Check size={14} /> {t("everos.setup.healthCheck")}{" "}
            <code>curl http://localhost:1995/health</code>
          </p>
        </article>
      </div>
    </section>
  );
}

export default EverOS;
