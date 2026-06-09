import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Download,
  Trash,
  RefreshCw as Refresh,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useI18n } from "../../components/useI18n";

type LearningType =
  | "pattern"
  | "pitfall"
  | "preference"
  | "architecture"
  | "tool"
  | "operational";
type LearningSource =
  | "observed"
  | "user-stated"
  | "inferred"
  | "cross-model";

const TYPES: LearningType[] = [
  "pattern",
  "pitfall",
  "preference",
  "architecture",
  "tool",
  "operational",
];
const SOURCES: LearningSource[] = [
  "observed",
  "user-stated",
  "inferred",
  "cross-model",
];

interface LearningsProps {
  profile?: string;
}

function Learnings({ profile }: LearningsProps): React.JSX.Element {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LearningType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<LearningSource | "all">(
    "all",
  );
  const [entries, setEntries] = useState<
    Array<{
      ts: string;
      skill: string;
      type: LearningType;
      key: string;
      insight: string;
      confidence: number;
      source: LearningSource;
      files?: string[];
      count?: number;
      lastSeen?: string;
    }>
  >([]);
  const [stats, setStats] = useState<{
    total: number;
    unique: number;
    byType: Partial<Record<LearningType, number>>;
    bySource: Partial<Record<LearningSource, number>>;
    averageConfidence: number;
    topKeys: Array<{ key: string; count: number }>;
  } | null>(null);
  const [stale, setStale] = useState<
    Array<{ key: string; insight: string; lastSeen: string; count: number }>
  >([]);
  const [showStale, setShowStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Add-learning modal state
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<{
    key: string;
    insight: string;
    type: LearningType;
    source: LearningSource;
    skill: string;
    confidence: number;
    files: string;
  }>({
    key: "",
    insight: "",
    type: "pattern",
    source: "observed",
    skill: "",
    confidence: 0.8,
    files: "",
  });

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const [list, st, staleList] = await Promise.all([
        window.hermesAPI.learningsRead(profile),
        window.hermesAPI.learningsStats(profile),
        window.hermesAPI.learningsFindStale(profile),
      ]);
      setEntries(list as typeof entries);
      setStats(st as typeof stats);
      setStale(staleList as typeof stale);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const visible = useMemo(() => {
    const filtered = entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          e.key.toLowerCase().includes(q) ||
          e.skill.toLowerCase().includes(q) ||
          e.insight.toLowerCase().includes(q)
        );
      }
      return true;
    });
    // Dedup by key+type (most recent wins)
    const byKey = new Map<string, (typeof filtered)[number]>();
    for (const e of filtered) {
      byKey.set(`${e.type}::${e.key}`, e);
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0,
    );
  }, [entries, typeFilter, sourceFilter, query]);

  async function handleAdd(): Promise<void> {
    if (!draft.key.trim() || !draft.insight.trim()) {
      setError(t("memory.errorKeyAndInsightRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const files = draft.files
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await window.hermesAPI.learningsAppend({
        skill: draft.skill || "manual",
        type: draft.type,
        key: draft.key.trim(),
        insight: draft.insight.trim(),
        confidence: Number.isFinite(draft.confidence)
          ? Math.max(0, Math.min(1, draft.confidence))
          : 0.8,
        source: draft.source,
        ...(files.length ? { files } : {}),
      });
      setAddOpen(false);
      setDraft({
        key: "",
        insight: "",
        type: "pattern",
        source: "observed",
        skill: "",
        confidence: 0.8,
        files: "",
      });
      setInfo(t("memory.learnings.save") + " ✓");
      window.setTimeout(() => setInfo(null), 2500);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleExport(): Promise<void> {
    setBusy(true);
    try {
      const md = await window.hermesAPI.learningsExport(profile);
      await window.hermesAPI.copyToClipboard(md);
      setInfo(t("memory.learnings.copied"));
      window.setTimeout(() => setInfo(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear(): Promise<void> {
    if (!window.confirm(t("memory.learnings.clearConfirm"))) return;
    setBusy(true);
    try {
      await window.hermesAPI.learningsClear(profile);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="learnings-root">
      <header className="learnings-header">
        <div>
          <h3 className="learnings-title">{t("memory.learningsTab")}</h3>
          <p className="learnings-subtitle">
            {t("memory.learnings.subtitle")}
          </p>
        </div>
        <div className="learnings-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void reload()}
            title={t("common.refresh")}
            disabled={loading}
          >
            <Refresh size={13} />
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setAddOpen(true)}
            disabled={busy}
          >
            <Plus size={13} />
            {t("memory.learnings.add")}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => void handleExport()}
            disabled={busy || entries.length === 0}
          >
            <Download size={13} />
            {t("memory.learnings.export")}
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => void handleClear()}
            disabled={busy || entries.length === 0}
            title={t("memory.learnings.clear")}
          >
            <Trash size={13} />
          </button>
        </div>
      </header>

      {error && <div className="learnings-error">{error}</div>}
      {info && <div className="learnings-info">{info}</div>}

      {stats && (
        <div className="learnings-stats">
          <span>
            {t("memory.learnings.stats.total", { count: stats.total })}
          </span>
          <span>
            {t("memory.learnings.stats.unique", { count: stats.unique })}
          </span>
          <span>
            {t("memory.learnings.stats.avgConfidence", {
              value: stats.averageConfidence.toFixed(2),
            })}
          </span>
          {stale.length > 0 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setShowStale((v) => !v)}
            >
              <AlertTriangle size={12} />
              {t("memory.learnings.staleness.label")} ({stale.length})
            </button>
          )}
        </div>
      )}

      {showStale && stale.length > 0 && (
        <div className="learnings-stale">
          <div className="learnings-stale-title">
            {t("memory.learnings.staleness.label")} ({stale.length})
          </div>
          {stale.map((s) => (
            <div key={s.key} className="learnings-stale-item">
              <code className="learnings-key">{s.key}</code>
              <span className="learnings-stale-date">last: {s.lastSeen}</span>
              <span className="learnings-stale-insight">{s.insight}</span>
            </div>
          ))}
        </div>
      )}

      <div className="learnings-filters">
        <div className="learnings-search">
          <Search size={14} />
          <input
            type="text"
            placeholder={t("memory.learnings.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LearningType | "all")}
          className="learnings-select"
        >
          <option value="all">{t("memory.learnings.allTypes")}</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as LearningSource | "all")
          }
          className="learnings-select"
        >
          <option value="all">{t("memory.learnings.allSources")}</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="learnings-loading">{t("common.loading")}</div>
      ) : visible.length === 0 ? (
        <div className="learnings-empty">
          <FileText size={32} />
          {entries.length === 0
            ? t("memory.learnings.empty")
            : t("memory.learnings.noSearchResults")}
        </div>
      ) : (
        <ul className="learnings-list">
          {visible.map((e) => (
            <li key={`${e.type}-${e.key}-${e.ts}`} className="learnings-item">
              <div className="learnings-item-row">
                <code className="learnings-key">{e.key}</code>
                <span className={`learnings-badge learnings-type-${e.type}`}>
                  {e.type}
                </span>
                <span
                  className={`learnings-badge learnings-source-${e.source}`}
                >
                  {e.source}
                </span>
                <span className="learnings-skill">{e.skill}</span>
                <span className="learnings-confidence">
                  conf {e.confidence.toFixed(2)}
                </span>
                {typeof e.count === "number" && e.count > 1 && (
                  <span className="learnings-count">×{e.count}</span>
                )}
              </div>
              <p className="learnings-insight">{e.insight}</p>
              <div className="learnings-item-meta">
                <span className="learnings-ts">{e.ts}</span>
                {e.files && e.files.length > 0 && (
                  <span className="learnings-files">
                    {e.files.join(", ")}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {addOpen && (
        <div className="learnings-modal-backdrop">
          <div className="learnings-modal">
            <h3>{t("memory.learnings.addTitle")}</h3>
            <label>
              <span>{t("memory.learnings.keyLabel")}</span>
              <input
                type="text"
                value={draft.key}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, key: e.target.value }))
                }
                placeholder={t("memory.learnings.keyPlaceholder")}
                autoFocus
              />
            </label>
            <label>
              <span>{t("memory.learnings.insightLabel")}</span>
              <textarea
                value={draft.insight}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, insight: e.target.value }))
                }
                placeholder={t("memory.learnings.insightPlaceholder")}
                rows={3}
              />
            </label>
            <div className="learnings-modal-row">
              <label>
                <span>{t("memory.learnings.skillLabel")}</span>
                <input
                  type="text"
                  value={draft.skill}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, skill: e.target.value }))
                  }
                  placeholder="plan-tune"
                />
              </label>
              <label>
                <span>{t("memory.learnings.confidenceLabel")}</span>
                <input
                  type="number"
                  step={0.1}
                  min={0}
                  max={1}
                  value={draft.confidence}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      confidence: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="learnings-modal-row">
              <label>
                <span>{t("memory.learnings.typeField")}</span>
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      type: e.target.value as LearningType,
                    }))
                  }
                >
                  {TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {ty}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("memory.learnings.sourceField")}</span>
                <select
                  value={draft.source}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      source: e.target.value as LearningSource,
                    }))
                  }
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>{t("memory.learnings.filesLabel")}</span>
              <input
                type="text"
                value={draft.files}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, files: e.target.value }))
                }
                placeholder="src/main/foo.ts, src/main/bar.ts"
              />
            </label>
            <div className="learnings-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAddOpen(false)}
                disabled={busy}
              >
                {t("memory.learnings.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleAdd()}
                disabled={
                  busy || !draft.key.trim() || !draft.insight.trim()
                }
              >
                {t("memory.learnings.save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Learnings;
