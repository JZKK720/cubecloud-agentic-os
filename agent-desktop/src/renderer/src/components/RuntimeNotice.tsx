import { useState } from "react";
import { Signal, Refresh } from "../assets/icons";
import { Unplug } from "lucide-react";

export type RuntimeNoticeVariant = "remote" | "unreachable";

interface RuntimeNoticeProps {
  feature: string;
  variant?: RuntimeNoticeVariant;
  detail?: string;
  onRetry?: () => void | Promise<void>;
  onSwitchToLocal?: () => void | Promise<void>;
  compact?: boolean;
}

/**
 * RuntimeNotice — small in-screen state shown when a feature cannot
 * render its data because the desktop is connected to a remote
 * runtime (or the local runtime is unreachable).
 *
 * Replaces the older `RemoteNotice` which only said "not available in
 * remote mode" with no path forward. The new component exposes Retry
 * and Switch-to-local actions so the user can resolve the runtime
 * issue without leaving the current tab.
 */
function RuntimeNotice({
  feature,
  variant = "remote",
  detail,
  onRetry,
  onSwitchToLocal,
  compact = false,
}: RuntimeNoticeProps): React.JSX.Element {
  const [busy, setBusy] = useState<"retry" | "switch" | null>(null);

  async function handleRetry(): Promise<void> {
    if (!onRetry) return;
    setBusy("retry");
    try {
      await onRetry();
    } finally {
      setBusy(null);
    }
  }

  async function handleSwitch(): Promise<void> {
    if (!onSwitchToLocal) return;
    setBusy("switch");
    try {
      await onSwitchToLocal();
    } finally {
      setBusy(null);
    }
  }

  const title =
    variant === "remote"
      ? "Connected to remote runtime"
      : "Local runtime is unreachable";
  const description =
    variant === "remote"
      ? `${feature} reads state that lives on this machine. Switch to a local runtime to use it, or retry if a remote gateway now exposes it.`
      : `${feature} could not reach the local runtime. Reconnect and retry, or check the Gateway tab.`;

  return (
    <div
      className={`remote-notice ${compact ? "remote-notice--compact" : ""}`.trim()}
      role="status"
    >
      <Signal size={compact ? 18 : 28} className="remote-notice-icon" />
      <p className="remote-notice-title">{title}</p>
      <p className="remote-notice-desc">
        {detail ?? description}
      </p>
      {(onRetry || onSwitchToLocal) && (
        <div className="remote-notice-actions">
          {onRetry && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleRetry}
              disabled={busy !== null}
            >
              <Refresh size={13} />
              {busy === "retry" ? "Retrying…" : "Retry"}
            </button>
          )}
          {onSwitchToLocal && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSwitch}
              disabled={busy !== null}
            >
              <Unplug size={13} />
              {busy === "switch" ? "Switching…" : "Switch to local"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default RuntimeNotice;
