import { useState, useEffect, useCallback } from "react";
import { useI18n } from "../../components/useI18n";
import { AgentMarkdown } from "../../components/AgentMarkdown";
import {
  BookOpen,
  Database,
  Edit3,
  FileText,
  GitBranch,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { WikiStatus, WikiIndex, WikiLog, WikiSources } from "./types";
import { PageEditor } from "./PageEditor";

interface WikiProps {
  profile?: string;
}

interface WikiPage {
  relPath: string;
  content: string;
  exists: boolean;
  lastModified: number | null;
}

/**
 * Knowledge base sub-surface (Karpathy LLM-wiki pattern).
 *
 *   raw / sources/  — immutable user-curated source docs
 *   wiki /          — agent-owned interlinked markdown
 *   schema.md       — conventions the agent follows
 *
 * The agent owns writes to wiki/ and log.md; the user owns writes
 * to raw/sources/ and schema.md. The renderer is a viewer + light
 * editor for the agent's wiki entries.
 */
export function Wiki({ profile }: WikiProps): React.JSX.Element {
  const { t: _t } = useI18n();
  const [status, setStatus] = useState<WikiStatus | null>(null);
  const [index, setIndex] = useState<WikiIndex | null>(null);
  const [log, setLog] = useState<WikiLog | null>(null);
  const [sources, setSources] = useState<WikiSources | null>(null);
  const [openPage, setOpenPage] = useState<WikiPage | null>(null);
  const [schema, setSchema] = useState<{ content: string; exists: boolean }>({
    content: "",
    exists: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // V2.2 — page editing UI. `editingPage` holds the relPath
  // of the page the user is currently editing; null means
  // the read-only viewer is in front. PageEditor reads/writes
  // the same wikiWritePage IPC that the agent uses.
  const [editingPage, setEditingPage] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, i, l, src, sch] = await Promise.all([
        window.hermesAPI.wikiGetStatus(profile),
        window.hermesAPI.wikiReadIndex(profile),
        window.hermesAPI.wikiReadLog(profile),
        window.hermesAPI.wikiListSources(profile),
        window.hermesAPI.wikiReadSchema(profile),
      ]);
      setStatus(s);
      setIndex(i);
      setLog(l);
      setSources(src);
      setSchema(sch);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleBootstrap = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await window.hermesAPI.wikiBootstrap(profile);
      if (result.created.length > 0) {
        await window.hermesAPI.wikiAppendLog(
          "edit",
          "Wiki bootstrap",
          `Created ${result.created.length} files.`,
          profile,
        );
      }
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [profile, loadAll]);

  const openIndexEntry = useCallback(
    async (relPath: string) => {
      const page = await window.hermesAPI.wikiReadPage(relPath, profile);
      setOpenPage({ relPath, ...page });
    },
    [profile],
  );

  const openSource = useCallback(
    async (relPath: string) => {
      const page = await window.hermesAPI.wikiReadPage(relPath, profile);
      setOpenPage({ relPath, ...page });
    },
    [profile],
  );

  // V2.2 — open the page editor for the currently-viewed
  // page. We pass `editingPage` (the relPath) as a separate
  // piece of state from `openPage` so the editor can render
  // over the viewer without unmounting the viewer first.
  const handleEditOpen = useCallback(() => {
    if (!openPage) return;
    setEditingPage(openPage.relPath);
  }, [openPage]);

  // Called by PageEditor when it wants to close. If a save
  // happened, the editor wrote its own log entry and bumped
  // the on-disk mtime; we just need to refresh our viewer
  // state and the index/log lists. The viewer stays open so
  // the user can see the page they just saved.
  const handleEditClose = useCallback(
    (saved: boolean) => {
      setEditingPage(null);
      if (saved) {
        // Refresh the open page in-place; the editor wrote
        // its own log entry, so a full loadAll is overkill.
        if (openPage) {
          void window.hermesAPI
            .wikiReadPage(openPage.relPath, profile)
            .then((p) => setOpenPage({ relPath: openPage.relPath, ...p }))
            .catch(() => undefined);
        }
        // Re-pull the index + log so the catalog numbers and
        // the recent-log panel reflect the new write.
        void loadAll();
      }
    },
    [openPage, profile, loadAll],
  );

  // Compute the layer once so the editor + viewer both know
  // whether to tag this as a wiki page or a raw source.
  // relPath is relative to the wiki home; raw sources live
  // under `raw/sources/`, everything else is a wiki page.
  const pageLayer: "wiki" | "raw" | null = openPage
    ? openPage.relPath.startsWith("raw/sources/")
      ? "raw"
      : "wiki"
    : null;

  const logEntries = log?.entries ?? [];
  const recent = logEntries.slice(-8).reverse();

  if (loading && !status) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const wikiNotSetUp = status && !status.indexExists && !status.logExists;

  return (
    <div className="wiki-container">
      <div className="wiki-header">
        <div>
          <h3 className="wiki-section-title">
            <BookOpen size={14} /> Knowledge Base
          </h3>
          <p className="wiki-subtitle">
            Karpathy-pattern 3-layer memory: raw sources, agent-maintained
            wiki, append-only log. The agent keeps the wiki current as you
            ingest new sources.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAll}>
          <RefreshCw size={13} />
        </button>
      </div>

      {error && <div className="wiki-error">{error}</div>}

      {wikiNotSetUp ? (
        <div className="wiki-empty-state">
          <h4>{_t("memory.wiki.setUpYourKnowledgeBase")}</h4>
          <p>
            Bootstrap creates the directory tree, an empty
            <code> index.md</code>, a <code>log.md</code>, and a
            <code> schema.md</code> describing the conventions the agent
            follows.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleBootstrap}
            disabled={busy}
          >
            <Sparkles size={14} />
            {busy ? "Setting up..." : "Bootstrap knowledge base"}
          </button>
          {status && (
            <p className="wiki-path-hint">
              Wiki home: <code>{status.wikiHome}</code>
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="wiki-stats-grid">
            <div className="wiki-stat-card">
              <div className="wiki-stat-label">Index entries</div>
              <div className="wiki-stat-value">
                {index?.entryCount ?? 0}
              </div>
            </div>
            <div className="wiki-stat-card">
              <div className="wiki-stat-label">Raw sources</div>
              <div className="wiki-stat-value">
                {sources?.total ?? 0}
              </div>
            </div>
            <div className="wiki-stat-card">
              <div className="wiki-stat-label">Log entries</div>
              <div className="wiki-stat-value">{logEntries.length}</div>
            </div>
            <div className="wiki-stat-card">
              <div className="wiki-stat-label">Categories</div>
              <div className="wiki-stat-value">
                {index?.categories.length ?? 0}
              </div>
            </div>
          </div>

          {openPage ? (
            <div className="wiki-page-viewer">
              <div className="wiki-page-header">
                <span className="wiki-page-path">{openPage.relPath}</span>
                <div className="wiki-page-header-actions">
                  {/* V2.2 — page editing UI. The Edit button
                      opens the in-place markdown editor over
                      the viewer; raw/sources pages get the
                      same affordance since the IPC is shared. */}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleEditOpen}
                    title={_t("memory.wiki.editThisPage")}
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setOpenPage(null)}
                  >
                    Back
                  </button>
                </div>
              </div>
              {openPage.exists ? (
                <AgentMarkdown>{openPage.content}</AgentMarkdown>
              ) : (
                <p className="wiki-empty-text">
                  File does not exist yet. Click <strong>Edit</strong> to
                  create it, or ask the agent to ingest a source.
                </p>
              )}
            </div>
          ) : (
            <div className="wiki-grid">
              <div className="wiki-pane">
                <h4 className="wiki-pane-title">
                  <FileText size={14} /> Index
                </h4>
                {index && index.entryCount > 0 ? (
                  <ul className="wiki-catalog">
                    {index.catalog.map((entry) => (
                      <li
                        key={`${entry.category}/${entry.relPath}`}
                        className="wiki-catalog-item"
                      >
                        <button
                          className="wiki-catalog-link"
                          onClick={() => openIndexEntry(entry.relPath)}
                        >
                          <span className="wiki-catalog-category">
                            {entry.category}
                          </span>
                          <span className="wiki-catalog-title">
                            {entry.title}
                          </span>
                          {entry.summary && (
                            <span className="wiki-catalog-summary">
                              {entry.summary}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="wiki-empty-text">
                    No entries yet. Ask the agent to ingest a source from
                    <code> raw/sources/</code>.
                  </p>
                )}
              </div>

              <div className="wiki-pane">
                <h4 className="wiki-pane-title">
                  <Database size={14} /> Raw sources
                </h4>
                {sources && sources.items.length > 0 ? (
                  <ul className="wiki-catalog">
                    {sources.items.map((src) => (
                      <li key={src.relPath} className="wiki-catalog-item">
                        <button
                          className="wiki-catalog-link"
                          onClick={() => openSource(src.relPath)}
                        >
                          <span className="wiki-catalog-title">
                            {src.name}
                          </span>
                          <span className="wiki-catalog-summary">
                            {src.size} bytes ·{" "}
                            {new Date(src.lastModified * 1000).toLocaleString()}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="wiki-empty-text">
                    Drop source documents into the raw sources folder at
                    <code> {status?.rawDir}</code> to start.
                  </p>
                )}
              </div>

              <div className="wiki-pane">
                <h4 className="wiki-pane-title">
                  <GitBranch size={14} /> Operation log
                </h4>
                {recent.length > 0 ? (
                  <ul className="wiki-log">
                    {recent.map((entry, i) => (
                      <li key={i} className="wiki-log-entry">
                        <span className={`wiki-log-kind wiki-log-kind--${entry.kind}`}>
                          {entry.kind}
                        </span>
                        <span className="wiki-log-title">{entry.title}</span>
                        <span className="wiki-log-iso">{entry.iso}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="wiki-empty-text">No operations logged yet.</p>
                )}
              </div>

              <div className="wiki-pane">
                <h4 className="wiki-pane-title">Schema</h4>
                {schema.exists ? (
                  <details>
                    <summary className="wiki-schema-toggle">
                      Show conventions
                    </summary>
                    <AgentMarkdown>{schema.content}</AgentMarkdown>
                  </details>
                ) : (
                  <p className="wiki-empty-text">
                    No schema.md yet. The agent should create one on first
                    ingest.
                  </p>
                )}
              </div>
            </div>
          )}

          <KnowledgePane profile={profile} />
        </>
      )}

      {/* V2.2 — page editing UI. Mounted last so it sits
          above the viewer as a modal; the viewer stays
          in the DOM behind it. We only render when
          `editingPage` is non-null, which happens when the
          user clicks the Edit button. */}
      {editingPage && pageLayer && (
        <PageEditor
          relPath={editingPage}
          layer={pageLayer}
          profile={profile}
          onClose={handleEditClose}
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
 * KnowledgePane (V2 Step 14 — gbrain knowledge MCP)
 * ---------------------------------------------------------------------- */

interface KnowledgeListItem {
  relPath: string;
  title: string;
  type: string;
}

interface KnowledgeDetail {
  relPath: string;
  title: string;
  type: string;
  body: string;
}

interface KnowledgeSourceItem {
  filename: string;
  size: number;
  lastModified: number;
}

interface KnowledgeSearchResult {
  query: string;
  synthesis: {
    topic: string;
    markdown: string;
    claims: Array<{
      relPath: string;
      pageTitle: string;
      text: string;
      type: string;
    }>;
    sources: Array<{ relPath: string; title: string; type: string }>;
    gaps: Array<{ label: string; reason: string; need: string }>;
    freshness: string;
    builtAt: string;
    packId: string;
  };
  sources: Array<{
    relPath: string;
    title: string;
    type: string;
    snippet: string;
  }>;
}

function KnowledgePane({ profile }: { profile?: string }): React.JSX.Element {
  const { t: _t } = useI18n();
  const [list, setList] = useState<KnowledgeListItem[]>([]);
  const [sources, setSources] = useState<KnowledgeSourceItem[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [open, setOpen] = useState<KnowledgeDetail | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] =
    useState<KnowledgeSearchResult | null>(null);
  const [topic, setTopic] = useState("");
  const [synthesis, setSynthesis] = useState<KnowledgeSearchResult["synthesis"] | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [l, s] = await Promise.all([
        window.hermesAPI.knowledgeList(
          filter ? { type: filter } : undefined,
          profile,
        ),
        window.hermesAPI.knowledgeSources(profile),
      ]);
      setList(l as KnowledgeListItem[]);
      setSources(s as KnowledgeSourceItem[]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [filter, profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // When the filter changes, clear any open page so the user doesn't
  // see a stale "current page" that no longer matches the filter.
  useEffect(() => {
    setOpen(null);
  }, [filter]);

  const types = Array.from(new Set(list.map((i) => i.type))).sort();

  const openItem = useCallback(
    async (relPath: string) => {
      setBusy(true);
      setError("");
      try {
        const page = (await window.hermesAPI.knowledgeGet(
          relPath,
          profile,
        )) as KnowledgeDetail | null;
        if (page) {
          setOpen(page);
          setSearchResult(null);
          setSynthesis(null);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [profile],
  );

  const runSearch = useCallback(async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = (await window.hermesAPI.knowledgeSearch(
        query,
        profile,
      )) as KnowledgeSearchResult;
      setSearchResult(res);
      setOpen(null);
      setSynthesis(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [query, profile]);

  const runSynthesize = useCallback(async () => {
    if (!topic.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = (await window.hermesAPI.synthesisBuild(
        topic,
        profile,
      )) as KnowledgeSearchResult["synthesis"];
      setSynthesis(res);
      setOpen(null);
      setSearchResult(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, [topic, profile]);

  return (
    <div className="wiki-pane knowledge-pane">
      <h4 className="wiki-pane-title">
        <Sparkles size={14} /> Knowledge (brain layer)
      </h4>
      <p className="wiki-empty-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Step 14: search / get / list / sources MCP family, plus a synthesis
        layer that composes a topic answer with per-claim citations.
      </p>

      {error && <div className="wiki-error">{error}</div>}

      <div className="knowledge-toolbar">
        <input
          type="text"
          className="knowledge-input"
          placeholder="Search…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSearch();
          }}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => void runSearch()}
          disabled={busy || !query.trim()}
        >
          Search
        </button>
        <input
          type="text"
          className="knowledge-input"
          placeholder="Synthesize topic…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void runSynthesize();
          }}
        />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => void runSynthesize()}
          disabled={busy || !topic.trim()}
        >
          Synthesize
        </button>
        <select
          className="knowledge-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">{_t("memory.wiki.allTypes")}</option>
          {types.map((ty) => (
            <option key={ty} value={ty}>
              {ty}
            </option>
          ))}
        </select>
        <button
          className="btn btn-secondary btn-sm"
          onClick={reload}
          disabled={busy}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {synthesis ? (
        <div className="knowledge-synthesis">
          <div className="knowledge-synthesis-head">
            <strong>{synthesis.topic}</strong>
            <span className="wiki-catalog-summary">
              pack: {synthesis.packId} · built {synthesis.builtAt} ·{" "}
              freshness {synthesis.freshness}
            </span>
          </div>
          <AgentMarkdown>{synthesis.markdown}</AgentMarkdown>
          {synthesis.claims.length > 0 && (
            <details open className="knowledge-subsection">
              <summary>
                Claims ({synthesis.claims.length})
              </summary>
              <ol className="knowledge-claim-list">
                {synthesis.claims.map((c, i) => (
                  <li key={`${c.relPath}-${i}`} className="knowledge-claim">
                    <span className="knowledge-claim-text">{c.text}</span>{" "}
                    <span className="wiki-catalog-summary">
                      [{c.type}] {c.pageTitle} ({c.relPath})
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          )}
          {synthesis.sources.length > 0 && (
            <details className="knowledge-subsection">
              <summary>Sources ({synthesis.sources.length})</summary>
              <ul className="wiki-catalog">
                {synthesis.sources.map((s) => (
                  <li
                    key={`${s.type}-${s.relPath}`}
                    className="wiki-catalog-item"
                  >
                    <button
                      className="wiki-catalog-link"
                      onClick={() => openItem(s.relPath)}
                    >
                      <span className="wiki-catalog-category">
                        {s.type}
                      </span>
                      <span className="wiki-catalog-title">{s.title}</span>
                      <span className="wiki-catalog-summary">
                        {s.relPath}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {synthesis.gaps.length > 0 && (
            <details className="knowledge-subsection">
              <summary>Gaps ({synthesis.gaps.length})</summary>
              <ul className="knowledge-gap-list">
                {synthesis.gaps.map((g, i) => (
                  <li key={i} className="knowledge-gap">
                    <strong>{g.label}:</strong> {g.reason}{" "}
                    <em>({g.need})</em>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : searchResult ? (
        <div className="knowledge-search-result">
          <div className="knowledge-synthesis-head">
            <strong>Search: {searchResult.query}</strong>
            <span className="wiki-catalog-summary">
              {searchResult.sources.length} hit(s) · built{" "}
              {searchResult.synthesis.builtAt}
            </span>
          </div>
          {searchResult.sources.length > 0 ? (
            <ul className="wiki-catalog">
              {searchResult.sources.map((s) => (
                <li
                  key={`${s.type}-${s.relPath}`}
                  className="wiki-catalog-item"
                >
                  <button
                    className="wiki-catalog-link"
                    onClick={() => openItem(s.relPath)}
                  >
                    <span className="wiki-catalog-category">{s.type}</span>
                    <span className="wiki-catalog-title">{s.title}</span>
                    {s.snippet && (
                      <span className="wiki-catalog-summary">
                        {s.snippet}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="wiki-empty-text">No matching pages.</p>
          )}
        </div>
      ) : open ? (
        <div className="wiki-page-viewer">
          <div className="wiki-page-header">
            <span className="wiki-page-path">
              {open.type} · {open.relPath}
            </span>
            <button className="btn-ghost" onClick={() => setOpen(null)}>
              Back
            </button>
          </div>
          <AgentMarkdown>{open.body}</AgentMarkdown>
        </div>
      ) : list.length > 0 ? (
        <ul className="wiki-catalog">
          {list.map((entry) => (
            <li
              key={`${entry.type}-${entry.relPath}`}
              className="wiki-catalog-item"
            >
              <button
                className="wiki-catalog-link"
                onClick={() => openItem(entry.relPath)}
              >
                <span className="wiki-catalog-category">{entry.type}</span>
                <span className="wiki-catalog-title">{entry.title}</span>
                <span className="wiki-catalog-summary">
                  {entry.relPath}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : sources.length > 0 ? (
        <p className="wiki-empty-text">
          {sources.length} raw source(s) on disk. Run a synthesis to build
          knowledge pages, or type a query above to search the existing
          knowledge base.
        </p>
      ) : (
        <p className="wiki-empty-text">
          No knowledge pages yet. Bootstrap the wiki, ingest some sources,
          then come back.
        </p>
      )}
    </div>
  );
}
