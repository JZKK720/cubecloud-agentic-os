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
import Gateway from "../Gateway/Gateway";
import Models from "../Models/Models";
import Providers from "../Providers/Providers";
import Plans from "../Plans/Plans";
import Mcp from "../Mcp/Mcp";
import Workspace, { type WorkspaceChatDraft } from "../Workspace/Workspace";
import WorkspaceConsole from "../WorkspaceConsole/WorkspaceConsole";
import Schedules from "../Schedules/Schedules";
import Soul from "../Soul/Soul";
import CodeGraph from "../CodeGraph/CodeGraph";
import EverOS from "../EverOS/EverOS";
import Headroom from "../Headroom/Headroom";
import SandboxTasks from "../SandboxTasks/SandboxTasks";
import Swarm from "../Swarm/Swarm";
import Knowledge from "../Knowledge/Knowledge";
import VerifyWarningBanner from "../../components/VerifyWarningBanner";
import cubecloudMark from "../../assets/logo-pack/120X120 反白.svg";
import {
  ChatBubble,
  Clock,
  Settings as SettingsIcon,
  Download,
  Home as HomeIcon,
  Plans as PlansIcon,
  Boxes,
} from "../../assets/icons";
import {
  AppShell,
  Button,
  SideNav,
  SideNavHeading,
  SideNavItem,
  Badge,
} from "@astryxdesign/core";
import { FileText as LicensingIcon } from "lucide-react";
import { useI18n } from "../../components/useI18n";
import HomeScreen from "../Home/Home";
import RuntimeHub from "../RuntimeHub/Runtime";
import { RUNTIME_CARD_BY_VIEW, RUNTIME_GROUPS } from "../RuntimeHub/catalog";
import { useRuntimePins } from "../RuntimeHub/useRuntimePins";
type View =
  | "home"
  | "chat"
  | "sessions"
  | "plans"
  | "runtime"
  | "agents"
  | "soul"
  | "skills"
  | "tools"
  | "mcp"
  | "models"
  | "providers"
  | "memory"
  | "codegraph"
  | "everos"
  | "headroom"
  | "knowledge"
  | "sandboxtasks"
  | "workspace"
  | "workspaceConsole"
  | "swarm"
  | "schedules"
  | "gateway"
  | "settings";

const NAV_ITEMS = [
  { view: "home", icon: HomeIcon, labelKey: "navigation.home" },
  { view: "chat", icon: ChatBubble, labelKey: "navigation.chat" },
  { view: "sessions", icon: Clock, labelKey: "navigation.sessions" },
  { view: "plans", icon: PlansIcon, labelKey: "navigation.plans" },
  { view: "runtime", icon: Boxes, labelKey: "navigation.runtime" },
  { view: "settings", icon: SettingsIcon, labelKey: "navigation.settings" },
] as const satisfies readonly {
  view: View;
  icon: typeof HomeIcon;
  labelKey: string;
}[];

/** Views grouped behind the Runtime hub. The rail keeps a single Runtime
 *  entry; pinned capabilities are surfaced alongside it via useRuntimePins. */
const RUNTIME_VIEWS: ReadonlySet<View> = new Set<View>(
  RUNTIME_GROUPS.flatMap((group) => group.cards.map((card) => card.view)),
);

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
}

function Layout({
  verifyWarning,
  onReinstall,
  onDismissVerifyWarning,
}: LayoutProps = {}): React.JSX.Element {
  const { t } = useI18n();
  const [view, setView] = useState<View>("home");
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
    () => new Set<View>(["home"]),
  );
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

  const runtimePins = useRuntimePins();
  const { pins } = runtimePins;
  const isNavActive = useCallback(
    (v: View): boolean => {
      if (v !== "runtime") return view === v;
      // Runtime owns the umbrella entry only when no pinned shortcut
      // points at the open capability.
      return (
        view === "runtime" ||
        (RUNTIME_VIEWS.has(view) &&
          !pins.some((pinned) => pinned === view))
      );
    },
    [pins, view],
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

  const runtimeBadge =
    mcpCount && mcpCount.total > 0 ? `${mcpCount.enabled}/${mcpCount.total}` : undefined;
  const pinnedCards = pins
    .map((view) => RUNTIME_CARD_BY_VIEW.get(view))
    .filter((card) => card !== undefined);

  const sideNav = (
    <SideNav
      className="cc-sidenav"
      aria-label={t("navigation.primaryNav")}
      header={
        <SideNavHeading
          icon={
            <img
              src={cubecloudMark}
              className="cc-sidenav-mark"
              alt=""
              width={28}
              height={28}
            />
          }
          heading="Cubecloud"
          subheading="Agent Desktop"
        />
      }
      footer={
        <div className="cc-sidenav-footer">
          {updateState && (
            <Button
              variant={updateState === "error" ? "destructive" : "primary"}
              size="sm"
              className="cc-update-btn"
              onClick={handleUpdate}
              isDisabled={updateState === "downloading"}
              tooltip={updateError ?? undefined}
              icon={<Download size={13} />}
              label={
                updateState === "available"
                  ? t("common.updateAvailable", { version: updateVersion })
                  : updateState === "downloading"
                    ? t("common.downloading", { percent: downloadPercent })
                    : updateState === "ready"
                      ? t("common.restartToUpdate")
                      : t("common.updateFailed")
              }
            />
          )}
          <button
            type="button"
            className="sidebar-licensing-link"
            onClick={openLegalModal}
            aria-label={t("common.legal.openPanel")}
            title={t("common.legal.openPanel")}
          >
            <LicensingIcon size={13} />
            {t("common.legal.licensingLink")}
          </button>
        </div>
      }
    >
      {NAV_ITEMS.map(({ view: v, icon: Icon, labelKey }) => (
        <SideNavItem
          key={v}
          label={t(labelKey)}
          icon={Icon}
          isSelected={isNavActive(v)}
          onClick={() => goTo(v)}
          data-testid={`nav-${v}`}
          endContent={
            v === "runtime" && runtimeBadge ? (
              <Badge variant="neutral" label={runtimeBadge} />
            ) : undefined
          }
        />
      ))}
      {pinnedCards.length > 0 && (
        <div className="cc-sidenav-pins" role="group" aria-label={t("runtime.pinned")}>
          {pinnedCards.map((card) => (
            <SideNavItem
              key={card.view}
              label={t(`runtime.${card.titleKey}`)}
              icon={card.icon}
              isSelected={view === card.view}
              onClick={() => goTo(card.view)}
              data-testid={`nav-pin-${card.view}`}
            />
          ))}
        </div>
      )}
    </SideNav>
  );

  return (
    <AppShell variant="section" className="cc-shell" sideNav={sideNav} contentPadding={0}>
      <div className="content">
        {visitedViews.has("home") && (
          <div style={paneStyle("home")}>
            <HomeScreen onNavigate={(dest) => goTo(dest as View)} />
          </div>
        )}
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




        {visitedViews.has("plans") && (
          <div style={paneStyle("plans")}>
            <Plans visible={view === "plans"} profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("runtime") && (
          <div style={paneStyle("runtime")}>
            <RuntimeHub onNavigate={(dest) => goTo(dest)} pins={runtimePins} />
          </div>
        )}





        {visitedViews.has("workspace") && (
          <div style={paneStyle("workspace")}>
            <Workspace onOpenInChat={handleUseWorkspaceContext} />
          </div>
        )}

        {visitedViews.has("workspaceConsole") && (
          <div style={paneStyle("workspaceConsole")}>
            <WorkspaceConsole />
          </div>
        )}

        {visitedViews.has("schedules") && (
          <div style={paneStyle("schedules")}>
            <Schedules profile={activeProfile} />
          </div>
        )}

        {visitedViews.has("soul") && (
          <div style={paneStyle("soul")}>
            <Soul profile={activeProfile} />
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
      </div>
    </AppShell>
  );
}

export default Layout;
