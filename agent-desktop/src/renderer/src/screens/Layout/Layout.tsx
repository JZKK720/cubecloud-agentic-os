import { useState, useCallback, useEffect } from "react";
import Chat, { ChatMessage } from "../Chat/Chat";
import type { Attachment } from "../../../../shared/attachments";
import {
  dbItemsToChatMessages,
  type DbHistoryItem,
} from "../Chat/sessionHistory";
import Sessions from "../Sessions/Sessions";
import Agents from "../Agents/Agents";
import Settings from "../Settings/Settings";
import Skills from "../Skills/Skills";
import Memory from "../Memory/Memory";
import Tools from "../Tools/Tools";
import Workspace, { type WorkspaceChatDraft } from "../Workspace/Workspace";
import Gateway from "../Gateway/Gateway";
import Models from "../Models/Models";
import Providers from "../Providers/Providers";
import Schedules from "../Schedules/Schedules";
import Soul from "../Soul/Soul";
import Plans from "../Plans/Plans";
import CodeGraph from "../CodeGraph/CodeGraph";
import EverOS from "../EverOS/EverOS";
import Headroom from "../Headroom/Headroom";
import SandboxTasks from "../SandboxTasks/SandboxTasks";
import Mcp from "../Mcp/Mcp";
import Swarm from "../Swarm/Swarm";
import Knowledge from "../Knowledge/Knowledge";
import RuntimeNotice from "../../components/RuntimeNotice";
import VerifyWarningBanner from "../../components/VerifyWarningBanner";
import ToolSuggestions from "../../components/ToolSuggestions";
import cubecloudWordmark from "../../assets/cubecloud-wordmark.svg";
import {
  ChatBubble,
  Clock,
  Users,
  Settings as SettingsIcon,
  Puzzle,
  Brain,
  Wrench,
  Search,
  Signal,
  Layers,
  KeyRound,
  Timer,
  Download,
  Sparkles,
  Plans as PlansIcon,
  Network,
  Database,
  Cable,
} from "../../assets/icons";
import {
  FileText as LicensingIcon,
  GitBranch as SwarmIcon,
  BookOpen as KnowledgeIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../../components/useI18n";

type View =
  | "chat"
  | "sessions"
  | "agents"
  | "soul"
  | "models"
  | "providers"
  | "skills"
  | "memory"
  | "tools"
  | "workspace"
  | "schedules"
  | "plans"
  | "codegraph"
  | "everos"
  | "headroom"
  | "gateway"
  | "mcp"
  | "sandboxtasks"
  | "swarm"
  | "knowledge"
  | "settings";

const NAV_ITEMS: {
  view: View;
  icon: LucideIcon;
  labelKey: string;
  group: "work" | "configure" | "platform";
}[] = [
  {
    view: "chat",
    icon: ChatBubble,
    labelKey: "navigation.chat",
    group: "work",
  },
  {
    view: "sessions",
    icon: Clock,
    labelKey: "navigation.sessions",
    group: "work",
  },
  { view: "agents", icon: Users, labelKey: "navigation.agents", group: "work" },
  { view: "soul", icon: Sparkles, labelKey: "navigation.soul", group: "work" },
  {
    view: "plans",
    icon: PlansIcon,
    labelKey: "navigation.plans",
    group: "work",
  },
  {
    view: "codegraph",
    icon: Network,
    labelKey: "navigation.codegraph",
    group: "work",
  },
  {
    view: "everos",
    icon: Database,
    labelKey: "navigation.everos",
    group: "work",
  },
  {
    view: "headroom",
    icon: Sparkles,
    labelKey: "navigation.headroom",
    group: "work",
  },
  {
    view: "sandboxtasks",
    icon: Network,
    labelKey: "navigation.sandboxtasks",
    group: "work",
  },
  {
    view: "swarm",
    icon: SwarmIcon,
    labelKey: "navigation.swarm",
    group: "work",
  },
  {
    view: "knowledge",
    icon: KnowledgeIcon,
    labelKey: "navigation.knowledge",
    group: "work",
  },
  {
    view: "models",
    icon: Layers,
    labelKey: "navigation.models",
    group: "configure",
  },
  {
    view: "providers",
    icon: KeyRound,
    labelKey: "navigation.providers",
    group: "configure",
  },
  {
    view: "skills",
    icon: Puzzle,
    labelKey: "navigation.skills",
    group: "configure",
  },
  {
    view: "memory",
    icon: Brain,
    labelKey: "navigation.memory",
    group: "configure",
  },
  {
    view: "tools",
    icon: Wrench,
    labelKey: "navigation.tools",
    group: "configure",
  },
  {
    view: "workspace",
    icon: Search,
    labelKey: "navigation.workspace",
    group: "configure",
  },
  {
    view: "schedules",
    icon: Timer,
    labelKey: "navigation.schedules",
    group: "configure",
  },
  {
    view: "gateway",
    icon: Signal,
    labelKey: "navigation.gateway",
    group: "platform",
  },
  { view: "mcp", icon: Cable, labelKey: "navigation.mcp", group: "platform" },
  {
    view: "settings",
    icon: SettingsIcon,
    labelKey: "navigation.settings",
    group: "platform",
  },
];

const LEGAL_STATUS_POINTS = [
  "Inherited desktop code still remains under the repository MIT license until the replacement boundary is cleared.",
  "Cubecloud-owned branding, managed connectors, premium workflows, and service layers can be kept on Cubecloud terms today.",
];

const LEGAL_REPLACEMENT_TRACK = [
  "Replace renderer shell and screen behavior from Cubecloud product specs instead of upstream structure.",
  "Replace main, preload, and IPC contracts around Cubecloud runtime, entitlement, and workspace concepts.",
  "Replace tests, scripts, and release automation under a provenance tracker before any license cutover.",
];

const LEGAL_WORKING_DOCS = [
  "docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md",
  "docs/legal/PROVENANCE_TRACKER.md",
  "docs/legal/CUBECLOUD-EULA.md",
  "docs/legal/TRADEMARK_POLICY.md",
];

interface LayoutProps {
  verifyWarning?: boolean;
  onReinstall?: () => void;
  onDismissVerifyWarning?: () => void;
  onSwitchToLocal?: () => void;
}

function Layout({
  verifyWarning,
  onReinstall,
  onDismissVerifyWarning,
  onSwitchToLocal,
}: LayoutProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const [view, setView] = useState<View>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    () => {
      try {
        return localStorage.getItem("hermes-active-session") || null;
      } catch {
        return null;
      }
    },
  );
  const [activeProfile, setActiveProfile] = useState("default");
  const [workspaceDraft, setWorkspaceDraft] = useState<{
    nonce: string;
    text: string;
    attachments: Attachment[];
  } | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  // Tabs lazy-mount on first visit, then stay mounted (display:none toggle).
  // Keeps IPC refetch / DOM rebuild off the tab-switch hot path.
  const [visitedViews, setVisitedViews] = useState<Set<View>>(
    () => new Set<View>(["chat"]),
  );
  // Remote-only mode — SSH tunnel has full access; only pure HTTP remote mode restricts screens
  const [remoteMode, setRemoteMode] = useState(false);
  // User can dismiss the runtime banner per session. We keep it
  // dismissable so the chrome doesn't get in the way of the screen
  // underneath once the user has acknowledged the runtime state.
  const [runtimeBannerDismissed, setRuntimeBannerDismissed] = useState(false);
  // MCP sidebar badge — shows enabled/total next to the MCP nav item.
  // null means "unknown / not loaded yet"; 0 is a real value.
  const [mcpCount, setMcpCount] = useState<{
    enabled: number;
    total: number;
  } | null>(null);

  // Fetch MCP status once on mount so the sidebar badge can show
  // enabled/total at a glance. Re-fetched after a successful
  // toggle/add/remove dispatched from the MCP screen.
  const refreshMcpCount = useCallback(async (): Promise<void> => {
    try {
      const list = await window.hermesAPI.listMcpServers(activeProfile);
      setMcpCount({
        enabled: list.filter((s) => s.enabled).length,
        total: list.length,
      });
    } catch {
      // Leave previous value alone on transient IPC failure so the
      // badge doesn't flicker empty while the user is mid-action.
    }
  }, [activeProfile]);

  useEffect(() => {
    void refreshMcpCount();
  }, [refreshMcpCount]);

  // Persist the active session ID so a renderer refresh (Ctrl+R,
  // devtools reload, or an unexpected crash) restores the same
  // conversation instead of landing on an empty chat. The transcript
  // itself is reloaded from state.db via getSessionMessages.
  useEffect(() => {
    try {
      if (currentSessionId) {
        localStorage.setItem("hermes-active-session", currentSessionId);
      } else {
        localStorage.removeItem("hermes-active-session");
      }
    } catch {
      /* localStorage may be unavailable in some sandboxed contexts */
    }
  }, [currentSessionId]);

  // Auto-resume the last active session on mount. Guards against
  // stale IDs (profile switch, DB wipe) by treating an empty DB
  // return as "session no longer exists" and clearing state.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    if (restored || !currentSessionId) return;
    void (async (): Promise<void> => {
      try {
        const items = (await window.hermesAPI.getSessionMessages(
          currentSessionId,
        )) as DbHistoryItem[];
        if (items && items.length > 0) {
          setMessages(dbItemsToChatMessages(items));
        } else {
          // Session no longer exists in this profile's DB — clear
          // the stale ID so the user lands on a clean chat.
          setCurrentSessionId(null);
        }
      } catch {
        setCurrentSessionId(null);
      } finally {
        setRestored(true);
      }
    })();
  }, [restored, currentSessionId]);

  // Re-render the nav item label with a small badge if the item is
  // the MCP entry and we have a count. Other items render plain.
  const renderNavLabel = useCallback(
    (v: View, labelKey: string): React.JSX.Element => {
      if (v === "mcp" && mcpCount) {
        return (
          <span className="sidebar-nav-label-row">
            <span className="sidebar-nav-label">{t(labelKey)}</span>
            <span
              className="sidebar-nav-badge"
              aria-label={`${mcpCount.enabled} of ${mcpCount.total} enabled`}
            >
              {mcpCount.enabled}/{mcpCount.total}
            </span>
          </span>
        );
      }
      return <span className="sidebar-nav-label">{t(labelKey)}</span>;
    },
    [mcpCount, t],
  );

  const renderNavItem = useCallback(
    (v: View, Icon: LucideIcon, labelKey: string): React.JSX.Element => (
      <button
        key={v}
        className={`sidebar-nav-item ${view === v ? "active" : ""}`}
        onClick={() => goTo(v)}
        data-view={v}
      >
        <Icon size={16} />
        {renderNavLabel(v, labelKey)}
      </button>
    ),
    // goTo is a stable useCallback above; safe to omit.
    [renderNavLabel, view],
  );

  const paneStyle = (target: View): React.CSSProperties => ({
    display: view === target ? "flex" : "none",
    flex: 1,
    flexDirection: "column",
    overflow: "hidden",
    // Flex children default to `min-width: auto`, which prevents the
    // pane (and any inner grid it owns) from shrinking below the
    // content's intrinsic width. Without this the content area
    // overflows the viewport on window resize and looks "too wide" /
    // off-center (#board-resize).
    minWidth: 0,
    minHeight: 0,
  });

  const goTo = useCallback((v: View) => {
    setVisitedViews((prev) => (prev.has(v) ? prev : new Set(prev).add(v)));
    setView(v);
  }, []);

  const openLegalModal = useCallback(() => {
    setShowLegalModal(true);
  }, []);

  const closeLegalModal = useCallback(() => {
    setShowLegalModal(false);
  }, []);

  const handleUseWorkspaceContext = useCallback(
    (draft: WorkspaceChatDraft) => {
      setWorkspaceDraft({
        nonce: `${Date.now()}`,
        text: draft.text,
        attachments: draft.attachments,
      });
      goTo("chat");
    },
    [goTo],
  );

  // Re-check remote mode on tab switch (picks up Settings changes)
  useEffect(() => {
    window.hermesAPI.isRemoteOnlyMode().then((isRemote) => {
      setRemoteMode(isRemote);
      // Re-arm the runtime banner so it re-appears when the user
      // changes connection modes via Settings.
      setRuntimeBannerDismissed(false);
    });
  }, [view]);

  useEffect(() => {
    if (!showLegalModal) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setShowLegalModal(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showLegalModal]);

  // Auto-update state
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<
    "available" | "downloading" | "ready" | "error" | null
  >(null);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    const cleanupAvailable = window.hermesAPI.onUpdateAvailable((info) => {
      setUpdateVersion(info.version);
      setUpdateState("available");
      setUpdateError(null);
      setDownloadPercent(0);
    });
    const cleanupProgress = window.hermesAPI.onUpdateDownloadProgress(
      (info) => {
        setDownloadPercent(info.percent);
      },
    );
    const cleanupDownloaded = window.hermesAPI.onUpdateDownloaded(() => {
      setUpdateState("ready");
      setUpdateError(null);
    });
    const cleanupError = window.hermesAPI.onUpdateError((message) => {
      setUpdateState("error");
      setUpdateError(message);
      setDownloadPercent(0);
    });
    return () => {
      cleanupAvailable();
      cleanupProgress();
      cleanupDownloaded();
      cleanupError();
    };
  }, []);

  async function handleUpdate(): Promise<void> {
    if (updateState === "available" || updateState === "error") {
      setUpdateError(null);
      setDownloadPercent(0);
      setUpdateState("downloading");
      try {
        const ok = await window.hermesAPI.downloadUpdate();
        if (!ok) setUpdateState("error");
      } catch (err) {
        setUpdateError(err instanceof Error ? err.message : String(err));
        setUpdateState("error");
      }
    } else if (updateState === "ready") {
      await window.hermesAPI.installUpdate();
    }
  }

  const handleNewChat = useCallback(() => {
    // Abort any in-flight chat before clearing
    window.hermesAPI.abortChat();
    setMessages([]);
    setCurrentSessionId(null);
    goTo("chat");
  }, [goTo]);

  // Listen for menu IPC events (Cmd+N, Cmd+K from app menu)
  useEffect(() => {
    const cleanupNewChat = window.hermesAPI.onMenuNewChat(() => {
      handleNewChat();
    });
    const cleanupSearch = window.hermesAPI.onMenuSearchSessions(() => {
      goTo("sessions");
    });
    // Custom event dispatched by the Mcp screen whenever the user
    // toggles, adds, or removes a server. Keeps the sidebar badge
    // in sync without lifting state out of the Mcp screen.
    const onMcpChanged = (): void => {
      void refreshMcpCount();
    };
    window.addEventListener("mcp:changed", onMcpChanged);
    return () => {
      cleanupNewChat();
      cleanupSearch();
      window.removeEventListener("mcp:changed", onMcpChanged);
    };
  }, [handleNewChat, goTo, refreshMcpCount]);

  const handleSelectProfile = useCallback((name: string) => {
    setActiveProfile(name);
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  const handleResumeSession = useCallback(
    async (sessionId: string) => {
      const items = (await window.hermesAPI.getSessionMessages(
        sessionId,
      )) as DbHistoryItem[];
      setMessages(dbItemsToChatMessages(items));
      setCurrentSessionId(sessionId);
      goTo("chat");
    },
    [goTo],
  );

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            src={cubecloudWordmark}
            className="sidebar-brand-wordmark"
            alt="Cubecloud Agent Desktop"
          />
        </div>

        <nav className="sidebar-nav" aria-label="Platform navigation">
          <div className="nav-group">
            <p className="nav-group-label">{t("navigation.group.work")}</p>
            {NAV_ITEMS.filter((n) => n.group === "work").map(
              ({ view: v, icon: Icon, labelKey }) =>
                renderNavItem(v, Icon, labelKey),
            )}
          </div>

          <div className="nav-group">
            <p className="nav-group-label">{t("navigation.group.configure")}</p>
            {NAV_ITEMS.filter((n) => n.group === "configure").map(
              ({ view: v, icon: Icon, labelKey }) =>
                renderNavItem(v, Icon, labelKey),
            )}
          </div>

          <div className="nav-group nav-group-platform">
            <p className="nav-group-label">{t("navigation.group.platform")}</p>
            {NAV_ITEMS.filter((n) => n.group === "platform").map(
              ({ view: v, icon: Icon, labelKey }) =>
                renderNavItem(v, Icon, labelKey),
            )}
          </div>
        </nav>

        <ToolSuggestions />

        <div className="sidebar-footer">
          {updateState && (
            <button
              className={`sidebar-update-btn ${
                updateState === "error" ? "error" : ""
              }`}
              onClick={handleUpdate}
              disabled={updateState === "downloading"}
              title={updateError ?? undefined}
            >
              <Download size={13} />
              {updateState === "available" && (
                <span>
                  {t("common.updateAvailable", { version: updateVersion })}
                </span>
              )}
              {updateState === "downloading" && (
                <span>
                  {t("common.downloading", { percent: downloadPercent })}
                </span>
              )}
              {updateState === "ready" && (
                <span>{t("common.restartToUpdate")}</span>
              )}
              {updateState === "error" && (
                <span>{t("common.updateFailed")}</span>
              )}
            </button>
          )}
          <button
            type="button"
            className="sidebar-licensing-link"
            onClick={openLegalModal}
            aria-label={t("legal.openPanel")}
            title={t("legal.openPanel")}
          >
            <LicensingIcon size={13} />
            {t("legal.licensingLink")}
          </button>
          <div className="sidebar-footer-text">
            {activeProfile === "default" ? t("common.appName") : activeProfile}
          </div>
        </div>
      </aside>

      <main className="content">
        {verifyWarning && onReinstall && onDismissVerifyWarning && (
          <VerifyWarningBanner
            onReinstall={onReinstall}
            onDismiss={onDismissVerifyWarning}
          />
        )}
        <div style={paneStyle("chat")}>
          <Chat
            messages={messages}
            setMessages={setMessages}
            sessionId={currentSessionId}
            profile={activeProfile}
            composerPrefill={workspaceDraft}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Runtime banner — surfaces connection state without blocking
            the screens below. Only shown in pure remote mode; the
            user can dismiss it for the current session. */}
        {remoteMode && !runtimeBannerDismissed && (
          <div className="layout-runtime-banner">
            <RuntimeNotice
              feature="Local-only data"
              variant="remote"
              compact
              onSwitchToLocal={
                onSwitchToLocal
                  ? () => {
                      void onSwitchToLocal();
                    }
                  : undefined
              }
            />
            <button
              type="button"
              className="layout-runtime-banner-dismiss"
              onClick={() => setRuntimeBannerDismissed(true)}
              aria-label="Dismiss runtime notice"
            >
              ×
            </button>
          </div>
        )}

        {visitedViews.has("sessions") && (
          <div style={paneStyle("sessions")}>
            <Sessions
              onResumeSession={handleResumeSession}
              onNewChat={handleNewChat}
              currentSessionId={currentSessionId}
              visible={view === "sessions"}
            />
          </div>
        )}

        {visitedViews.has("agents") && (
          <div style={paneStyle("agents")}>
            <Agents
              activeProfile={activeProfile}
              onSelectProfile={handleSelectProfile}
              onChatWith={(name: string) => {
                handleSelectProfile(name);
                goTo("chat");
              }}
            />
          </div>
        )}

        {visitedViews.has("soul") && (
          <div style={paneStyle("soul")}>
            <Soul profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("models") && (
          <div style={paneStyle("models")}>
            <Models visible={view === "models"} />
          </div>
        )}

        {visitedViews.has("providers") && (
          <div style={paneStyle("providers")}>
            <Providers profile={activeProfile} visible={view === "providers"} />
          </div>
        )}

        {visitedViews.has("skills") && (
          <div style={paneStyle("skills")}>
            <Skills profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("memory") && (
          <div style={paneStyle("memory")}>
            <Memory profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("tools") && (
          <div style={paneStyle("tools")}>
            <Tools profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("workspace") && (
          <div style={paneStyle("workspace")}>
            <Workspace onOpenInChat={handleUseWorkspaceContext} />
          </div>
        )}

        {visitedViews.has("schedules") && (
          <div style={paneStyle("schedules")}>
            <Schedules profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("plans") && (
          <div style={paneStyle("plans")}>
            <Plans visible={view === "plans"} profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("codegraph") && (
          <div style={paneStyle("codegraph")}>
            <CodeGraph visible={view === "codegraph"} />
          </div>
        )}

        {visitedViews.has("everos") && (
          <div style={paneStyle("everos")}>
            <EverOS visible={view === "everos"} />
          </div>
        )}

        {visitedViews.has("headroom") && (
          <div style={paneStyle("headroom")}>
            <Headroom visible={view === "headroom"} />
          </div>
        )}

        {visitedViews.has("sandboxtasks") && (
          <div style={paneStyle("sandboxtasks")}>
            <SandboxTasks visible={view === "sandboxtasks"} />
          </div>
        )}

        {visitedViews.has("gateway") && (
          <div style={paneStyle("gateway")}>
            <Gateway profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("mcp") && (
          <div style={paneStyle("mcp")}>
            <Mcp profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("swarm") && (
          <div style={paneStyle("swarm")}>
            <Swarm />
          </div>
        )}

        {visitedViews.has("knowledge") && (
          <div style={paneStyle("knowledge")}>
            <Knowledge />
          </div>
        )}

        {visitedViews.has("settings") && (
          <div style={paneStyle("settings")}>
            <Settings profile={activeProfile} />
          </div>
        )}

        {showLegalModal && (
          <div className="legal-modal-overlay" onClick={closeLegalModal}>
            <div
              className="legal-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="legal-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="legal-modal-header">
                <div>
                  <p className="legal-modal-eyebrow">
                    Cubecloud legal boundary
                  </p>
                  <h2 id="legal-modal-title" className="legal-modal-title">
                    Copyright, license, and clean-room status
                  </h2>
                </div>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={closeLegalModal}
                >
                  Close
                </button>
              </div>

              <div className="legal-modal-body">
                <div className="legal-modal-callout">
                  The current root LICENSE still governs inherited code. The way
                  out is path-by-path replacement, not relabeling.
                </div>

                <section className="legal-modal-section">
                  <h3>Current status</h3>
                  <ul className="legal-modal-list">
                    {LEGAL_STATUS_POINTS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="legal-modal-section">
                  <h3>Active replacement track</h3>
                  <ul className="legal-modal-list">
                    {LEGAL_REPLACEMENT_TRACK.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>

                <section className="legal-modal-section">
                  <h3>Working documents</h3>
                  <ul className="legal-modal-docs">
                    {LEGAL_WORKING_DOCS.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Layout;
