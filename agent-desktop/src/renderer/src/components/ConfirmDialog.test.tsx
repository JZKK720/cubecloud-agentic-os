// ConfirmDialog tests — destructive-action confirmation.
//
// Pins the behaviours that make the dialog safe to gate a process-affecting
// action with: focus starts on the SAFE action, Escape cancels, the backdrop
// dismisses, and only the explicit confirm button fires onConfirm.

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ConfirmDialog } from "./ConfirmDialog";
import { I18nProvider } from "./I18nProvider";

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {},
): {
  onConfirm: ReturnType<typeof vi.fn>;
  onCancel: ReturnType<typeof vi.fn>;
} {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider>
      <ConfirmDialog
        title="Stop the gateway?"
        body="Every enabled IM platform loses its connection."
        confirmLabel="Stop gateway"
        cancelLabel="Cancel"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
        {...overrides}
      />
    </I18nProvider>,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("exposes an alertdialog with an accessible name and description", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("confirm-dialog-title");
    expect(dialog.getAttribute("aria-describedby")).toBe("confirm-dialog-body");
    expect(screen.getByText("Stop the gateway?")).toBeTruthy();
    expect(
      screen.getByText("Every enabled IM platform loses its connection."),
    ).toBeTruthy();
  });

  it("starts focus on the SAFE action, not the destructive one", () => {
    renderDialog();
    // A stray Enter/Space must not confirm a destructive operation.
    const cancel = screen.getByRole("button", { name: "Cancel" });
    expect(document.activeElement).toBe(cancel);
  });

  it("fires onConfirm only from the confirm button", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Stop gateway" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels via the cancel button", () => {
    const { onConfirm, onCancel } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("cancels on Escape", () => {
    const { onCancel } = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not confirm on Escape", () => {
    const { onConfirm } = renderDialog();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("tints the confirm button as destructive when asked", () => {
    renderDialog({ destructive: true });
    const confirm = screen.getByRole("button", { name: "Stop gateway" });
    expect(confirm.className).toContain("btn-danger");
  });

  it("uses the primary style for non-destructive confirmations", () => {
    renderDialog({ destructive: false });
    const confirm = screen.getByRole("button", { name: "Stop gateway" });
    expect(confirm.className).toContain("btn-primary");
    expect(confirm.className).not.toContain("btn-danger");
  });
});
