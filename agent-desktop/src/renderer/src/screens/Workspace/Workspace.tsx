import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Refresh, Search } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";
import type { Attachment } from "../../../../shared/attachments";

const STORAGE_KEY = "agent-desktop.workspace.project-path";
const DEFAULT_CONTEXT_PROMPT =
  "Summarize the architecture, hot paths, and likely extension points for this codebase.";

interface CliStatus {
  installed: boolean;
  command: string | null;
  version: string | null;
  docsUrl: string;
  error?: string | null;
}

interface ProjectStatus {
  initialized: boolean;
  projectPath: string;
  fileCount: number | null;
  nodeCount: number | null;
  edgeCount: number | null;
  dbSizeBytes: number | null;
  backend: string | null;
  journalMode: string | null;
  languages: string[];
  pendingChanges: {
    added: number;
    modified: number;
    removed: number;
  };
  worktreeMismatch:
    | {
        worktreeRoot: string;
        indexRoot: string;
      }
    | null;
}

export interface WorkspaceChatDraft {
  text: string;
  attachments: Attachment[];
}

interface WorkspaceProps {
  onOpenInChat?: (draft: WorkspaceChatDraft) => void;
}

function formatNumber(value: number | null): string {
  if (value === null) return "--";
  return new Intl.NumberFormat().format(value);
}

function formatBytes(value: number | null): string {
  if (value === null) return "--";
  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function projectLabel(projectPath: string): string {
  const normalized = projectPath.replace(/[\\/]+$/, "");
  const parts = normalized.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || "workspace";
}

function createContextAttachment(
  projectPath: string,
  contextOutput: string,
): Attachment {
  const label = projectLabel(projectPath)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    id: `codegraph-context-${Date.now()}`,
    kind: "text-file",
    name: `codegraph-context-${label || "workspace"}.md`,
    mime: "text/markdown",
    size: new TextEncoder().encode(contextOutput).length,
    text: contextOutput,
  };
}

function Workspace({ onOpenInChat }: WorkspaceProps): React.JSX.Element {
  const { t } = useI18n();
  const [projectPath, setProjectPath] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [cliStatus, setCliStatus] = useState<CliStatus | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [contextPrompt, setContextPrompt] = useState(DEFAULT_CONTEXT_PROMPT);
  const [contextOutput, setContextOutput] = useState("");
  const [contextHeadroom, setContextHeadroom] = useState<{
    compressed: boolean;
    savingsPercent: number;
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCli, setLoadingCli] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [installingCli, setInstallingCli] = useState(false);
  const [configuringHermes, setConfiguringHermes] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [buildingContext, setBuildingContext] = useState(false);

  const refreshCli = useCallback(async (): Promise<void> => {
    setLoadingCli(true);
    try {
      const next = await window.hermesAPI.codegraphCliStatus();
      setCliStatus(next);
    } finally {
      setLoadingCli(false);
    }
  }, []);

  const refreshProject = useCallback(async (nextPath: string): Promise<void> => {
    const trimmedPath = nextPath.trim();
    if (!trimmedPath) {
      setProjectStatus(null);
      setContextOutput("");
      return;
    }

    setLoadingStatus(true);
    setError(null);
    const result = await window.hermesAPI.codegraphProjectStatus(trimmedPath);
    if (result.success && result.status) {
      setProjectStatus(result.status);
      if (!result.status.initialized) {
        setContextOutput("");
      }
      setLoadingStatus(false);
      return;
    }

    setProjectStatus(null);
    setContextOutput("");
    setError(result.error || t("common.workspace.failedToReadWorkspaceStatus"));
    setLoadingStatus(false);
  }, []);

  useEffect(() => {
    void refreshCli();
  }, [refreshCli]);

  useEffect(() => {
    if (!projectPath.trim()) {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore local storage failures.
      }
      setProjectStatus(null);
      setContextOutput("");
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, projectPath);
    } catch {
      // Ignore local storage failures.
    }

    let cancelled = false;
    setLoadingStatus(true);
    setMessage(null);

    void (async () => {
      const result = await window.hermesAPI.codegraphProjectStatus(projectPath);
      if (cancelled) return;
      if (result.success && result.status) {
        setProjectStatus(result.status);
        if (!result.status.initialized) {
          setContextOutput("");
        }
        setError(null);
      } else {
        setProjectStatus(null);
        setContextOutput("");
        setError(result.error || t("common.workspace.failedToReadWorkspaceStatus"));
      }
      setLoadingStatus(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  async function handleChooseFolder(): Promise<void> {
    const selected = await window.hermesAPI.selectFolder();
    if (!selected) return;
    setMessage(null);
    setError(null);
    setProjectPath(selected);
  }

  async function handleRefresh(): Promise<void> {
    setMessage(null);
    setError(null);
    await refreshCli();
    if (projectPath.trim()) {
      await refreshProject(projectPath);
    }
    setLoadingStatus(false);
    setMessage(t("common.workspace.statusRefreshed"));
  }

  async function handleInit(): Promise<void> {
    if (!projectPath.trim()) return;
    setInitializing(true);
    setMessage(null);
    setError(null);
    try {
      const result = await window.hermesAPI.codegraphInitProject(projectPath);
      if (result.success && result.status) {
        setProjectStatus(result.status);
        setMessage(t("common.workspace.indexInitialized"));
      } else {
        setError(result.error || t("common.workspace.failedToReadWorkspaceStatus"));
      }
    } finally {
      setInitializing(false);
    }
  }

  async function handleInstallCli(): Promise<void> {
    setInstallingCli(true);
    setMessage(null);
    setError(null);
    try {
      const result = await window.hermesAPI.codegraphInstallCli();
      if (!result.success) {
        setError(result.error || t("common.workspace.failedToReadWorkspaceStatus"));
        return;
      }

      if (result.status) {
        setCliStatus(result.status);
      } else {
        await refreshCli();
      }
      setMessage(t("common.workspace.cliInstalled"));
    } finally {
      setInstallingCli(false);
    }
  }

  async function handleConfigureHermes(): Promise<void> {
    setConfiguringHermes(true);
    setMessage(null);
    setError(null);
    try {
      const result = await window.hermesAPI.codegraphSetupHermes();
      if (!result.success) {
        setError(result.error || t("common.workspace.failedToReadWorkspaceStatus"));
        return;
      }

      setMessage(
        t("common.workspace.configureHermesSuccess"),
      );
    } finally {
      setConfiguringHermes(false);
    }
  }

  async function handleBuildContext(): Promise<void> {
    if (!projectPath.trim() || !contextPrompt.trim()) return;
    setBuildingContext(true);
    setMessage(null);
    setError(null);
    try {
      const result = await window.hermesAPI.codegraphBuildContext(
        projectPath,
        contextPrompt,
      );
      if (result.success) {
        setContextOutput(result.context || "");
        if (result.headroomCompressed) {
          setContextHeadroom({
            compressed: true,
            savingsPercent: result.headroomSavingsPercent ?? 0,
            originalSize: result.headroomOriginalSize ?? 0,
            compressedSize: result.headroomCompressedSize ?? 0,
          });
          setMessage(
            `${t("common.workspace.contextBundleGenerated")} −${result.headroomSavingsPercent ?? 0}% (${result.headroomOriginalSize ?? 0} → ${result.headroomCompressedSize ?? 0} bytes).`,
          );
        } else {
          setContextHeadroom(null);
          setMessage(t("common.workspace.contextBundleGenerated"));
        }
      } else {
        setError(result.error || "CodeGraph context request failed.");
      }
    } finally {
      setBuildingContext(false);
    }
  }

  function handleUseInChat(): void {
    if (!contextOutput.trim()) return;
    onOpenInChat?.({
      text: "",
      attachments: [createContextAttachment(projectPath, contextOutput)],
    });
    setMessage(t("common.workspace.contextBundleMovedToChat"));
  }

  const installCommand =
    window.electron.process.platform === "win32"
      ? "irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex"
      : "curl -fsSL https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.sh | bash";

  return (
    <div className="workspace-shell">
      <section className="workspace-hero">
        <div className="workspace-hero-copy">
          <div className="workspace-kicker">Code intelligence surface</div>
          <h1 className="workspace-title">{t("navigation.workspace")}</h1>
          <p className="workspace-summary">
            Index a local repository with CodeGraph, inspect real graph stats,
            and build context bundles for Hermes workflows without pretending
            this is the old Office webview.
          </p>
        </div>
        <div className="workspace-hero-card">
          <div className="workspace-hero-icon">
            <Search size={24} />
          </div>
          <div className="workspace-hero-meta">
            <span className="workspace-chip">
              {cliStatus?.installed ? "CLI detected" : "CLI required"}
            </span>
            <span className="workspace-chip workspace-chip-muted">
              External local process
            </span>
          </div>
          <p>
            The current prototype uses the local CodeGraph CLI over IPC. It
            does not tunnel over remote HTTP and it does not embed a workspace
            webview.
          </p>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="workspace-card">
          <div className="workspace-card-header">
            <h2>Runtime</h2>
            <button className="btn btn-secondary btn-sm" onClick={handleRefresh}>
              <Refresh size={14} />
              <span>{loadingCli || loadingStatus ? "Refreshing" : "Refresh"}</span>
            </button>
          </div>

          <div className="workspace-row">
            <span className="workspace-label">Version</span>
            <span className="workspace-value">
              {cliStatus?.version || (loadingCli ? "Checking..." : "Not detected")}
            </span>
          </div>
          <div className="workspace-row">
            <span className="workspace-label">Command</span>
            <span className="workspace-value workspace-code">
              {cliStatus?.command || "codegraph"}
            </span>
          </div>

          {!cliStatus?.installed && (
            <div className="workspace-callout">
              <div className="workspace-callout-title">
                <Download size={14} />
                <span>{t("common.workspace.installCodeGraphLocally")}</span>
              </div>
              <p>
                Agent Desktop can only drive this surface once the `codegraph`
                CLI is available on the machine path.
              </p>
              <pre className="workspace-command">{installCommand}</pre>
              <div className="workspace-actions workspace-actions-tight">
                <button
                  className="btn btn-primary"
                  onClick={handleInstallCli}
                  disabled={installingCli}
                >
                  {installingCli ? "Installing CLI..." : "Install CodeGraph CLI"}
                </button>
              </div>
            </div>
          )}

          {cliStatus?.error && (
            <div className="workspace-banner workspace-banner-error">
              {cliStatus.error}
            </div>
          )}

          <div className="workspace-actions">
            <button className="btn btn-primary" onClick={handleChooseFolder}>
              Choose project folder
            </button>
            {cliStatus?.installed && (
              <button
                className="btn btn-secondary"
                onClick={handleConfigureHermes}
                disabled={configuringHermes}
              >
                {configuringHermes
                  ? "Configuring Hermes..."
                  : "Configure Hermes MCP"}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => void window.hermesAPI.openExternal(cliStatus?.docsUrl || "https://colbymchenry.github.io/codegraph/")}
            >
              <ExternalLink size={14} />
              <span>{t("common.workspace.openCodeGraphDocs")}</span>
            </button>
          </div>
        </div>

        <div className="workspace-card">
          <div className="workspace-card-header">
            <h2>Project</h2>
            <span className="workspace-subtle">
              {projectStatus?.initialized ? "Indexed" : "Not indexed"}
            </span>
          </div>

          <div className="workspace-path">{projectPath || "No folder selected yet."}</div>

          {projectStatus?.initialized ? (
            <div className="workspace-stats">
              <div className="workspace-stat">
                <span className="workspace-stat-value">
                  {formatNumber(projectStatus.fileCount)}
                </span>
                <span className="workspace-stat-label">Files</span>
              </div>
              <div className="workspace-stat">
                <span className="workspace-stat-value">
                  {formatNumber(projectStatus.nodeCount)}
                </span>
                <span className="workspace-stat-label">Nodes</span>
              </div>
              <div className="workspace-stat">
                <span className="workspace-stat-value">
                  {formatNumber(projectStatus.edgeCount)}
                </span>
                <span className="workspace-stat-label">Edges</span>
              </div>
              <div className="workspace-stat">
                <span className="workspace-stat-value">
                  {formatBytes(projectStatus.dbSizeBytes)}
                </span>
                <span className="workspace-stat-label">Index size</span>
              </div>
            </div>
          ) : (
            <div className="workspace-empty-state">
              {projectPath
                ? "This folder has not been indexed yet. Initialize CodeGraph to unlock context bundles."
                : "Pick a repository folder to inspect and index locally."}
            </div>
          )}

          <div className="workspace-row">
            <span className="workspace-label">Backend</span>
            <span className="workspace-value">
              {projectStatus?.backend || "node:sqlite"}
            </span>
          </div>
          <div className="workspace-row">
            <span className="workspace-label">Journal</span>
            <span className="workspace-value">
              {projectStatus?.journalMode || "Pending"}
            </span>
          </div>
          <div className="workspace-row workspace-row-top">
            <span className="workspace-label">Languages</span>
            <span className="workspace-value workspace-language-list">
              {projectStatus?.languages?.length
                ? projectStatus.languages.join(", ")
                : "No index data yet"}
            </span>
          </div>
          <div className="workspace-row">
            <span className="workspace-label">Pending changes</span>
            <span className="workspace-value">
              {projectStatus
                ? `${projectStatus.pendingChanges.added} added, ${projectStatus.pendingChanges.modified} modified, ${projectStatus.pendingChanges.removed} removed`
                : "--"}
            </span>
          </div>

          {projectStatus?.worktreeMismatch && (
            <div className="workspace-banner workspace-banner-warning">
              CodeGraph reports a worktree mismatch between
              {" "}
              <span className="workspace-code">
                {projectStatus.worktreeMismatch.worktreeRoot}
              </span>
              {" "}
              and
              {" "}
              <span className="workspace-code">
                {projectStatus.worktreeMismatch.indexRoot}
              </span>
              .
            </div>
          )}

          <div className="workspace-actions workspace-actions-tight">
            <button
              className="btn btn-primary"
              onClick={handleInit}
              disabled={!projectPath || !cliStatus?.installed || initializing}
            >
              {initializing ? "Initializing index..." : "Initialize index"}
            </button>
          </div>
        </div>
      </section>

      <section className="workspace-card workspace-context-card">
        <div className="workspace-card-header">
          <h2>{t("common.workspace.contextBundle")}</h2>
          <span className="workspace-subtle">
            Query the indexed graph for Hermes-ready context
          </span>
        </div>

        <label className="workspace-input-label" htmlFor="workspace-context-prompt">
          What should CodeGraph summarize?
        </label>
        <textarea
          id="workspace-context-prompt"
          className="input workspace-textarea"
          value={contextPrompt}
          onChange={(event) => setContextPrompt(event.target.value)}
          placeholder={t("common.workspace.contextBundlePlaceholder")}
        />

        <div className="workspace-actions workspace-actions-tight">
          <button
            className="btn btn-primary"
            onClick={handleBuildContext}
            disabled={
              !projectStatus?.initialized ||
              !contextPrompt.trim() ||
              buildingContext
            }
          >
            {buildingContext ? "Building context..." : "Build context bundle"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleUseInChat}
            disabled={!contextOutput.trim()}
          >
            Use in Chat
          </button>
        </div>

        {message && <div className="workspace-banner workspace-banner-success">{message}</div>}
        {error && <div className="workspace-banner workspace-banner-error">{error}</div>}

        {contextHeadroom?.compressed && (
          <div className="workspace-banner workspace-banner-info">
            <span className="pill">Headroom</span> Bundle compressed −
            {contextHeadroom.savingsPercent}% (
            {contextHeadroom.originalSize} → {contextHeadroom.compressedSize} bytes).
            Attach to chat to send the smaller version.
          </div>
        )}

        <pre className="workspace-output">
          {contextOutput ||
            "Context output will appear here after the project is indexed and you run a query."}
        </pre>
      </section>
    </div>
  );
}

export default Workspace;