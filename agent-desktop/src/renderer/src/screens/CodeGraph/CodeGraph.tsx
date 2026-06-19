// CodeGraph surface — semantic code intelligence via the local CodeGraph CLI.
// Indexes a repository, surfaces entry points and query templates, and lets
// the operator build a context bundle to inject into Chat.
//
// All IPC calls go through `hermesAPI` (the existing preload bridge), with
// `codegraph:*` handlers living in main/. If the CLI is not installed we
// render an install CTA instead of crashing.
//
// When the embedded CodeGraph SDK is present (npm package
// @colbymchenry/codegraph installed somewhere on disk), the
// `codegraphRuntime:*` channels surface an in-process search
// panel that talks to the library without spawning the CLI. The
// CLI path remains the canonical "init a project" flow — the
// runtime layer reuses the .CodeGraph directory the CLI
// created, so a user can switch between the two without
// reindexing.

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "../../components/useI18n";
import { Refresh, Search, Alert as AlertIcon } from "../../assets/icons";

interface CodeGraphRepo {
  id: string;
  name: string;
  path: string;
  fileCount: number | null;
  nodeCount: number | null;
  edgeCount: number | null;
  dbSizeBytes: number | null;
  backend: string | null;
  journalMode: string | null;
  languages: string[];
}

/** Subset of the runtime status surface that the renderer cares
 *  about — `available: false` means the SDK isn't installed and
 *  we should not even try the search/impact IPC channels. */
interface CodeGraphRuntimeStatus {
  available: boolean;
  sdkInstalled: boolean;
  projectOpen: boolean;
  sdkVersion: string | null;
}

interface CodeGraphRuntimeSearchHit {
  id: string;
  name: string;
  kind: string;
  filePath: string | null;
  startLine: number | null;
  endLine: number | null;
  score: number;
  snippet: string | null;
}

interface CodeGraphProps {
  visible?: boolean;
}

function formatNumber(value: number | null): string {
  if (value === null) return "--";
  return new Intl.NumberFormat().format(value);
}

function formatBytes(value: number | null): string {
  if (value === null) return "--";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function CodeGraph({ visible }: CodeGraphProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const [cliInstalled, setCliInstalled] = useState<boolean | null>(null);
  const [cliVersion, setCliVersion] = useState<string | null>(null);
  const [cliError, setCliError] = useState<string | null>(null);
  const [repos, setRepos] = useState<CodeGraphRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(
    "Summarize the architecture, hot paths, and likely extension points for this codebase.",
  );
  const [bundle, setBundle] = useState<string>("");
  const [building, setBuilding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Embedded runtime state. Probed on mount; the search/impact
  // inputs only render when `runtime.sdkInstalled` is true. The
  // runtime shares the .CodeGraph/ directory the CLI created, so
  // a user can open a project with the CLI and search with the
  // library without reindexing.
  const [runtime, setRuntime] = useState<CodeGraphRuntimeStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHits, setSearchHits] = useState<CodeGraphRuntimeSearchHit[]>(
    [],
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!visible) return;
    setRefreshing(true);
    try {
      const cliStatus = await window.hermesAPI.codegraphCliStatus();
      setCliInstalled(cliStatus.installed);
      setCliVersion(cliStatus.version);
      setCliError(cliStatus.error ?? null);
      // Probe the embedded runtime. We do this every load so a
      // user who installs the npm package between visits gets
      // the embedded surface without a manual refresh — cheap
      // because the runtime just does a require() probe.
      const runtimeStatus =
        await window.hermesAPI.codegraphRuntimeStatus();
      setRuntime(runtimeStatus);
    } catch (err) {
      setCliInstalled(false);
      setCliError((err as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, [visible]);

  useEffect(() => {
    void load();
  }, [load]);

  const initRepo = useCallback(async (): Promise<void> => {
    const folder = await window.hermesAPI.selectFolder();
    if (!folder) return;
    setBuilding(true);
    try {
      const result = await window.hermesAPI.codegraphInitProject(folder);
      if (result.success) {
        setRepos((r) => [
          ...r,
          {
            id: folder,
            name: folder.split(/[\\/]/).pop() ?? folder,
            path: folder,
            fileCount: result.status?.fileCount ?? null,
            nodeCount: result.status?.nodeCount ?? null,
            edgeCount: result.status?.edgeCount ?? null,
            dbSizeBytes: result.status?.dbSizeBytes ?? null,
            backend: result.status?.backend ?? null,
            journalMode: result.status?.journalMode ?? null,
            languages: result.status?.languages ?? [],
          },
        ]);
        setSelectedRepo(folder);
      } else {
        setCliError(result.error ?? "codegraph init failed");
      }
    } finally {
      setBuilding(false);
    }
  }, []);

  const buildContext = useCallback(async (): Promise<void> => {
    if (!selectedRepo) return;
    setBuilding(true);
    try {
      const result = await window.hermesAPI.codegraphBuildContext(
        selectedRepo,
        prompt,
      );
      if (result.success && result.context) {
        setBundle(result.context);
      } else {
        setCliError(result.error ?? "context build failed");
      }
    } finally {
      setBuilding(false);
    }
  }, [prompt, selectedRepo]);

  // Embedded runtime search. Renders a separate, opt-in panel
  // when the SDK is installed. The user can keep using the CLI
  // path for project init + context-bundle; the runtime path
  // is for quick "where is X defined / who calls Y" lookups
  // against the existing index.
  const openRuntime = useCallback(async (): Promise<void> => {
    if (!selectedRepo) return;
    setBuilding(true);
    try {
      const result = await window.hermesAPI.codegraphRuntimeOpen(
        selectedRepo,
      );
      if (!result.success) {
        setCliError(result.error ?? "codegraph runtime open failed");
      } else {
        // Refresh the cached projectOpen bit so the search
        // panel becomes active after a successful open.
        const next = await window.hermesAPI.codegraphRuntimeStatus();
        setRuntime(next);
      }
    } finally {
      setBuilding(false);
    }
  }, [selectedRepo]);

  const runRuntimeSearch = useCallback(async (): Promise<void> => {
    const query = searchQuery.trim();
    if (!query || !selectedRepo) return;
    setSearching(true);
    setSearchError(null);
    try {
      const result = await window.hermesAPI.codegraphRuntimeSearch(
        selectedRepo,
        query,
        { limit: 25 },
      );
      if (result.success) {
        setSearchHits(result.hits);
      } else {
        setSearchError(result.error ?? "search failed");
        setSearchHits([]);
      }
    } finally {
      setSearching(false);
    }
  }, [searchQuery, selectedRepo]);

  return (
    <section className="screen codegraph-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">{t("codegraph.eyebrow")}</p>
          <h1>{t("codegraph.title")}</h1>
          <p className="screen-summary">{t("codegraph.summary")}</p>
        </div>
        <button
          className="ghost-button"
          onClick={() => void load()}
          disabled={refreshing}
        >
          <Refresh size={14} />{" "}
          {refreshing ? t("common.refreshing") : t("common.refresh")}
        </button>
      </header>

      {cliInstalled === false && (
        <article className="panel-card error-card">
          <h2>
            <AlertIcon size={16} /> {t("codegraph.cli.missingTitle")}
          </h2>
          <p className="workspace-copy">{t("codegraph.cli.missingBody")}</p>
          {cliError && <p className="workspace-copy error">{cliError}</p>}
          <div className="registry-footer">
            <button
              className="toggle-button enabled"
              onClick={async () => {
                const result = await window.hermesAPI.codegraphInstallCli();
                if (result.success) {
                  setCliInstalled(true);
                  setCliError(null);
                } else {
                  setCliError(result.error ?? "install failed");
                }
              }}
            >
              {t("codegraph.cli.install")}
            </button>
            <button
              className="ghost-button"
              onClick={async () => {
                const result = await window.hermesAPI.codegraphSetupHermes();
                if (result.success) {
                  await load();
                } else {
                  setCliError(result.error ?? "setup failed");
                }
              }}
            >
              {t("codegraph.cli.setupHermes")}
            </button>
          </div>
        </article>
      )}

      {cliInstalled && (
        <div className="codegraph-grid">
          <article className="panel-card">
            <h2>{t("codegraph.runtime")}</h2>
            <dl className="operator-field-grid">
              <div className="operator-field">
                <span>{t("codegraph.cli.installed")}</span>
                <strong>{t("common.yes")}</strong>
              </div>
              <div className="operator-field">
                <span>{t("codegraph.cli.version")}</span>
                <strong>{cliVersion ?? "--"}</strong>
              </div>
            </dl>
          </article>

          <article className="panel-card">
            <h2>{t("codegraph.repos")}</h2>
            {repos.length === 0 ? (
              <p className="workspace-copy">{t("codegraph.repos.empty")}</p>
            ) : (
              <ul className="codegraph-repo-list">
                {repos.map((r) => (
                  <li key={r.id}>
                    <button
                      className={`codegraph-repo-row ${selectedRepo === r.id ? "active" : ""}`}
                      onClick={() => setSelectedRepo(r.id)}
                    >
                      <div className="codegraph-repo-name">
                        <Search size={14} /> {r.name}
                      </div>
                      <div className="codegraph-repo-meta">
                        <span>
                          {formatNumber(r.fileCount)} {t("codegraph.files")}
                        </span>
                        <span>
                          {formatNumber(r.nodeCount)} {t("codegraph.nodes")}
                        </span>
                        <span>
                          {formatNumber(r.edgeCount)} {t("codegraph.edges")}
                        </span>
                        <span>{formatBytes(r.dbSizeBytes)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="registry-footer">
              <button
                className="toggle-button enabled"
                onClick={() => void initRepo()}
                disabled={building}
              >
                {t("codegraph.addRepo")}
              </button>
            </div>
          </article>

          <article className="panel-card panel-card-span-2">
            <h2>{t("codegraph.contextBundle")}</h2>
            <p className="workspace-copy">
              {t("codegraph.contextBundleHint")}
            </p>
            <textarea
              className="operator-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder={t("codegraph.promptPlaceholder")}
            />
            <div className="registry-footer">
              <button
                className="toggle-button enabled"
                onClick={() => void buildContext()}
                disabled={building || !selectedRepo}
              >
                {building ? t("codegraph.building") : t("codegraph.build")}
              </button>
            </div>
            {bundle && <pre className="codegraph-bundle mono">{bundle}</pre>}
          </article>

          {runtime?.sdkInstalled && (
            <article className="panel-card panel-card-span-2">
              <h2>{t("codegraph.embeddedSearch")}</h2>
              <p className="workspace-copy">
                {t("codegraph.embeddedSearchHint")}
              </p>
              <dl className="operator-field-grid">
                <div className="operator-field">
                  <span>{t("codegraph.embeddedSdkVersion")}</span>
                  <strong>{runtime.sdkVersion ?? "--"}</strong>
                </div>
                <div className="operator-field">
                  <span>{t("codegraph.embeddedProjectOpen")}</span>
                  <strong>
                    {runtime.projectOpen ? t("common.yes") : t("common.no")}
                  </strong>
                </div>
              </dl>
              {!runtime.projectOpen && (
                <div className="registry-footer">
                  <button
                    className="toggle-button enabled"
                    onClick={() => void openRuntime()}
                    disabled={building || !selectedRepo}
                  >
                    {t("codegraph.embeddedOpenProject")}
                  </button>
                </div>
              )}
              {runtime.projectOpen && (
                <>
                  <div className="codegraph-search-bar">
                    <input
                      className="operator-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void runRuntimeSearch();
                      }}
                      placeholder={t("codegraph.embeddedSearchPlaceholder")}
                    />
                    <button
                      className="toggle-button enabled"
                      onClick={() => void runRuntimeSearch()}
                      disabled={searching || !searchQuery.trim()}
                    >
                      <Search size={14} />{" "}
                      {searching
                        ? t("common.searching")
                        : t("codegraph.embeddedSearchCta")}
                    </button>
                  </div>
                  {searchError && (
                    <p className="workspace-copy error">{searchError}</p>
                  )}
                  {searchHits.length > 0 && (
                    <ul className="codegraph-repo-list">
                      {searchHits.map((hit) => (
                        <li key={hit.id}>
                          <div className="codegraph-repo-name">
                            <Search size={12} /> {hit.name}
                            <span className="workspace-copy">
                              {" "}
                              {hit.kind}
                            </span>
                          </div>
                          <div className="workspace-copy">
                            {hit.filePath ?? "--"}
                            {hit.startLine !== null && (
                              <>:{hit.startLine}</>
                            )}
                            {hit.snippet && (
                              <pre className="mono workspace-copy">
                                {hit.snippet}
                              </pre>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
          )}
        </div>
      )}

    </section>
  );
}

export default CodeGraph;
