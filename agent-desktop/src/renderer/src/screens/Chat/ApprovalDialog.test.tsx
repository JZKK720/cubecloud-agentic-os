// ApprovalDialog.test.tsx — the dialog must not imply it blocked something
// the gateway already ran.
//
// The failure this guards against is subtler than "the button does nothing":
// showing Approve/Deny for a post-hoc observation tells the user they have a
// choice about an action that already happened. That is worse than no dialog.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApprovalDialog, type ApprovalDialogEntry } from "./ApprovalDialog";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (k: string) =>
      ({
        "chat.approval.title": "Approvals",
        "chat.approval.hint": "Review the actions below.",
        "chat.approval.empty": "Nothing waiting.",
        "chat.approval.approve": "Approve",
        "chat.approval.deny": "Deny",
        "chat.approval.working": "Working…",
        "chat.approval.postHocTitle": "Already ran",
        "chat.approval.postHocHint":
          "These actions ran before the desktop could ask. They cannot be undone from here.",
        "common.close": "Close",
      })[k] ?? k,
  }),
}));

function entry(over: Partial<ApprovalDialogEntry> = {}): ApprovalDialogEntry {
  return {
    id: "a1",
    sessionId: "s1",
    toolName: "shell",
    command: "rm -rf build",
    reason: "destructive",
    status: "pending",
    createdAt: Date.now(),
    resolvedAt: null,
    ...over,
  };
}

describe("ApprovalDialog", () => {
  it("offers Approve and Deny for a preflight entry", () => {
    render(
      <ApprovalDialog
        entries={[entry()]}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(screen.getByText("Approve")).toBeTruthy();
    expect(screen.getByText("Deny")).toBeTruthy();
    expect(screen.getByText("shell")).toBeTruthy();
    expect(screen.getByText("rm -rf build")).toBeTruthy();
  });

  it("shows NO Approve/Deny for a post-hoc observation", () => {
    render(
      <ApprovalDialog
        entries={[entry({ postHoc: true })]}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    // The action already ran. Offering a decision would be a lie.
    expect(screen.queryByText("Approve")).toBeNull();
    expect(screen.queryByText("Deny")).toBeNull();
    expect(screen.getByText("Already ran")).toBeTruthy();
  });

  it("still shows the tool and command for a post-hoc observation", () => {
    render(
      <ApprovalDialog
        entries={[entry({ postHoc: true })]}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(screen.getByText("shell")).toBeTruthy();
    expect(screen.getByText("rm -rf build")).toBeTruthy();
  });

  it("separates the two groups when both are present", () => {
    render(
      <ApprovalDialog
        entries={[entry({ id: "a1" }), entry({ id: "a2", postHoc: true })]}
        onClose={vi.fn()}
        onResolved={vi.fn()}
      />,
    );
    expect(screen.getByText("Approve")).toBeTruthy();
    expect(screen.getByText("Already ran")).toBeTruthy();
  });

  it("shows the empty state when nothing is pending and nothing observed", () => {
    render(
      <ApprovalDialog entries={[]} onClose={vi.fn()} onResolved={vi.fn()} />,
    );
    expect(screen.getByText("Nothing waiting.")).toBeTruthy();
  });
});
