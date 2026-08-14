import { memo } from "react";
import {
  Trash2 as Trash,
  Plus,
  Zap,
  FolderOpen,
  X,
  FolderTree,
} from "lucide-react";
import { useI18n } from "../../components/useI18n";
import type { UsageState } from "./types";

interface ChatHeaderProps {
  sessionId: string | null;
  usage: UsageState | null;
  fastMode: boolean;
  hasMessages: boolean;
  /** Working folder bound to this conversation (issue #27), or null. */
  contextFolder: string | null;
  /** Whether to show the context-folder control (hidden in remote/SSH mode,
   *  where the picker would browse the wrong machine's filesystem). */
  showContextFolder: boolean;
  /** Whether the worktree panel is visible (when contextFolder is set). */
  worktreeVisible: boolean;
  /** Number of pending approvals in the inbox (P8). */
  pendingApprovals?: number;
  /** Opens the approval dialog (P8 approval loop). */
  onOpenApprovals?: () => void;
  onPickFolder: () => void;
  onClearFolder: () => void;
  onToggleFast: () => void;
  onToggleWorktree: () => void;
  onNewChat?: () => void;
  onClear: () => void;
}

function UsageBadge({ usage }: { usage: UsageState }): React.JSX.Element {
  const headroomLine = formatHeadroom(usage.headroom);
  const tooltip =
    `Prompt: ${usage.promptTokens.toLocaleString()} | ` +
    `Completion: ${usage.completionTokens.toLocaleString()}` +
    (usage.cost != null ? ` | Cost: $${usage.cost.toFixed(4)}` : "") +
    (headroomLine ? ` | ${headroomLine}` : "");

  return (
    <span className="chat-token-counter" title={tooltip}>
      {usage.totalTokens.toLocaleString()} tokens
      {usage.cost != null && (
        <span className="chat-cost"> · ${usage.cost.toFixed(4)}</span>
      )}
      {headroomLine && (
        <span
          className={
            usage.headroom?.compressed
              ? "chat-headroom-savings chat-headroom-compressed"
              : "chat-headroom-savings"
          }
        >
          {" · "}
          {headroomLine}
        </span>
      )}
    </span>
  );
}

/** Build the human-readable Headroom summary shown in the
 *  usage footer. Returns "" when there's no headroom data
 *  to display.
 *
 *  Examples:
 *    "Headroom −76% (2,400 → 600 tokens) on local Ollama"
 *    "Headroom skipped: too few messages"
 *    "Headroom skipped: non-text content" */
export function formatHeadroom(
  headroom:
    | {
        compressed: boolean;
        tokensBefore: number;
        tokensAfter: number;
        savingsPercent: number;
        compressMs: number;
        providerHint: string;
        skipReason?: string;
        error?: string;
      }
    | undefined,
): string {
  if (!headroom) return "";

  if (headroom.compressed) {
    const provider = formatProviderLabel(headroom.providerHint);
    return (
      `Headroom −${headroom.savingsPercent}% ` +
      `(${headroom.tokensBefore.toLocaleString()} → ` +
      `${headroom.tokensAfter.toLocaleString()} tokens)` +
      (provider ? ` on ${provider}` : "")
    );
  }

  // Not compressed: surface the skip reason so the user can
  // tell whether the hook ran and decided to skip, vs. the
  // hook never running (e.g. Headroom disabled).
  if (headroom.skipReason) {
    const label = formatSkipReason(headroom.skipReason);
    if (label) return `Headroom skipped: ${label}`;
  }
  if (headroom.error) {
    return `Headroom error: ${headroom.error}`;
  }
  return "";
}

/** Local provider IDs come through as `local:ollama` /
 *  `local:vllm` / `local:llamacpp` / `local:lmstudio` —
 *  rendered as "local Ollama" / "local vLLM" etc. Remote
 *  providers pass through as-is, lower-cased ("openai",
 *  "anthropic", "groq"). */
function formatProviderLabel(hint: string): string {
  if (!hint) return "";
  if (hint.startsWith("local:")) {
    const local = hint.slice("local:".length);
    return `local ${local.charAt(0).toUpperCase()}${local.slice(1)}`;
  }
  return hint;
}

/** Map the internal `skipReason` enum to a user-readable
 *  phrase. Returns "" for unknown values so the footer
 *  silently omits the line rather than showing a token
 *  string. */
function formatSkipReason(reason: string): string {
  switch (reason) {
    case "too-few-messages":
      return "too few messages";
    case "headroom-disabled":
      return "Headroom is disabled";
    case "sidecar-not-running":
      return "proxy not running";
    case "non-text-content":
      return "non-text content";
    case "no-compression-applied":
      return "no compression applied";
    default:
      return "";
  }
}

/** Last path segment, for the compact chip label (handles \ and /). */
function folderName(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || p;
}

export const ChatHeader = memo(function ChatHeader({
  sessionId,
  usage,
  fastMode,
  hasMessages,
  contextFolder,
  showContextFolder,
  pendingApprovals,
  onOpenApprovals,
  worktreeVisible,
  onPickFolder,
  onClearFolder,
  onToggleFast,
  onToggleWorktree,
  onNewChat,
  onClear,
}: ChatHeaderProps): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="chat-header-title">
          {sessionId
            ? t("chat.sessionTitle", { id: sessionId.slice(-6) })
            : t("chat.title")}
        </div>
        {usage && <UsageBadge usage={usage} />}
        {pendingApprovals != null && pendingApprovals > 0 && (
          <button
            type="button"
            className="chat-approval-badge"
            title={`${pendingApprovals} pending approval${pendingApprovals > 1 ? "s" : ""}`}
            onClick={onOpenApprovals}
          >
            <span className="chat-approval-badge-dot" />
            {pendingApprovals}
          </button>
        )}
      </div>
      <div className="chat-header-actions">
        {showContextFolder &&
          (contextFolder ? (
            <div className="chat-ctxfolder">
              <button
                className="btn-ghost chat-ctxfolder-btn chat-ctxfolder-set"
                onClick={onPickFolder}
                title={t("chat.contextFolderActive", { path: contextFolder })}
              >
                <FolderOpen size={14} />
                <span className="chat-ctxfolder-name">
                  {folderName(contextFolder)}
                </span>
              </button>
              <button
                className="btn-ghost chat-ctxfolder-clear"
                onClick={onClearFolder}
                title={t("chat.removeContextFolder")}
              >
                <X size={12} />
              </button>
              <button
                className={`btn-ghost chat-worktree-toggle ${worktreeVisible ? "chat-worktree-active" : ""}`}
                onClick={onToggleWorktree}
                title={
                  worktreeVisible
                    ? t("chat.hideWorktree")
                    : t("chat.showWorktree")
                }
              >
                <FolderTree size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn-ghost chat-ctxfolder-btn"
              onClick={onPickFolder}
              title={t("chat.setContextFolder")}
            >
              <FolderOpen size={14} />
            </button>
          ))}
        <div className="chat-fast-wrapper">
          <button
            className={`btn-ghost chat-fast-btn ${fastMode ? "chat-fast-active" : ""}`}
            onClick={onToggleFast}
          >
            <Zap size={14} />
          </button>
          <div className="chat-fast-popover">
            <strong>
              {fastMode ? t("chat.fastModeOn") : t("chat.fastMode")}
            </strong>
            <span>
              {fastMode ? t("chat.fastModeActive") : t("chat.fastModeInactive")}
            </span>
          </div>
        </div>
        {onNewChat && (
          <button
            className="btn-ghost chat-clear-btn"
            onClick={onNewChat}
            title={t("chat.newChat")}
          >
            <Plus size={16} />
          </button>
        )}
        {hasMessages && (
          <button
            className="btn-ghost chat-clear-btn"
            onClick={() => {
              if (window.confirm(t("chat.clearChatConfirm"))) onClear();
            }}
            title={t("chat.clearChat")}
          >
            <Trash size={16} />
          </button>
        )}
      </div>
    </div>
  );
});
