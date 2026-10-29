// ApprovalDialog.tsx — human-in-the-loop approval UI (P8).
//
// TWO groups, deliberately separated:
//
//   Preflight  — the desktop stopped the request and is waiting. Approve/Deny
//                are meaningful because nothing has run yet.
//   Post-hoc   — the gateway already ran the tool and told us afterwards.
//                There is nothing to approve; offering buttons would tell the
//                user they had a choice about an action that already happened.
//
// Before this split both groups looked identical, which is why the feature
// read as a gate when it was only ever a notification.

import { useState } from "react";
import { X } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";

export interface ApprovalDialogEntry {
  id: string;
  sessionId: string;
  toolName: string;
  command: string;
  reason: string;
  status: string;
  createdAt: number;
  resolvedAt: number | null;
  timeoutMs?: number;
  /** True when the gateway already executed the tool. No decision is possible. */
  postHoc?: boolean;
}

interface ApprovalDialogProps {
  entries: ApprovalDialogEntry[];
  onClose: () => void;
  /** Called after an approve/deny resolves so the parent can refresh. */
  onResolved: () => void;
}

export function ApprovalDialog({
  entries,
  onClose,
  onResolved,
}: ApprovalDialogProps): React.JSX.Element {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = entries.filter((e) => e.status === "pending" && !e.postHoc);
  const observed = entries.filter((e) => e.postHoc);
  const nothing = pending.length === 0 && observed.length === 0;

  async function handleDecision(id: string, approve: boolean): Promise<void> {
    setBusyId(id);
    try {
      if (approve) {
        await window.hermesAPI.approvalApprove(id);
      } else {
        await window.hermesAPI.approvalDeny(id);
      }
      onResolved();
    } catch {
      // IPC failure — leave the entry as-is; the user can retry.
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="models-modal-overlay" onClick={onClose}>
      <div
        className="models-modal approval-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="models-modal-header">
          <h2 className="models-modal-title">{t("chat.approval.title")}</h2>
          <button
            className="btn-ghost"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>
        <div className="models-modal-body">
          {nothing && (
            <p className="approval-dialog-empty">{t("chat.approval.empty")}</p>
          )}

          {pending.length > 0 && (
            <>
              <p className="approval-dialog-hint">{t("chat.approval.hint")}</p>
              <ul className="approval-dialog-list">
                {pending.map((entry) => (
                  <li key={entry.id} className="approval-dialog-item">
                    <div className="approval-dialog-item-head">
                      <span className="approval-dialog-tool">
                        {entry.toolName}
                      </span>
                      <span className="approval-dialog-reason">
                        {entry.reason}
                      </span>
                    </div>
                    {entry.command && (
                      <code className="approval-dialog-command">
                        {entry.command}
                      </code>
                    )}
                    <div className="approval-dialog-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === entry.id}
                        onClick={() => void handleDecision(entry.id, true)}
                      >
                        {busyId === entry.id
                          ? t("chat.approval.working")
                          : t("chat.approval.approve")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === entry.id}
                        onClick={() => void handleDecision(entry.id, false)}
                      >
                        {t("chat.approval.deny")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {observed.length > 0 && (
            <>
              <h3 className="approval-dialog-section">
                {t("chat.approval.postHocTitle")}
              </h3>
              <p className="approval-dialog-hint">
                {t("chat.approval.postHocHint")}
              </p>
              <ul className="approval-dialog-list">
                {observed.map((entry) => (
                  <li
                    key={entry.id}
                    className="approval-dialog-item approval-dialog-item--observed"
                  >
                    <div className="approval-dialog-item-head">
                      <span className="approval-dialog-tool">
                        {entry.toolName}
                      </span>
                      <span className="approval-dialog-reason">
                        {entry.reason}
                      </span>
                    </div>
                    {entry.command && (
                      <code className="approval-dialog-command">
                        {entry.command}
                      </code>
                    )}
                    {/* No action buttons: the tool already ran. */}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
