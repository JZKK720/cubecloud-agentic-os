// ConfirmDialog — destructive-action confirmation.
//
// Why it exists: stopping the messaging gateway is a process-affecting,
// operator-visible action, and the Gateway screen did it on a single click
// with no confirmation. The gateway serves every enabled IM platform, so a
// mis-click silently takes the operator's agent offline.
//
// The transport is non-forgeable since d70fcd5; this is the other half — 
// an explicit intent check on the action that actually stops something.
//
// Follows the project's existing modal pattern (models-modal-overlay /
// models-modal, as used by OAuthLoginModal and ApprovalDialog).

import { useEffect, useRef } from "react";

export interface ConfirmDialogProps {
  /** Dialog heading, e.g. "Stop the gateway?" */
  title: string;
  /** One or two sentences naming the consequence. */
  body: string;
  /** Label for the affirmative (destructive) action. */
  confirmLabel: string;
  /** Label for the safe action. */
  cancelLabel: string;
  /** Tints the confirm button as destructive. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.JSX.Element {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus starts on the SAFE action: a stray Enter/Space must not confirm
  // a destructive operation.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  // Escape cancels — the conventional "get me out of here" affordance.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="models-modal-overlay"
      role="presentation"
      onMouseDown={(e) => {
        // Click the backdrop (not the dialog) to dismiss.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="models-modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-body"
      >
        <div className="models-modal-header">
          <h2 className="models-modal-title" id="confirm-dialog-title">
            {title}
          </h2>
        </div>
        <div className="models-modal-body">
          <p className="confirm-dialog-body" id="confirm-dialog-body">
            {body}
          </p>
        </div>
        <div className="models-modal-footer">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${destructive ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
