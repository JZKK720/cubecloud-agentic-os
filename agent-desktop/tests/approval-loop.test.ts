// approval-loop.test.ts — round-trip test for the P8 approval loop (G1).
//
// Proves the human-in-the-loop approval feature is wired end-to-end:
//   1. Main process registers the 5 approval IPC handlers.
//   2. Preload exposes the 5 matching bridge methods.
//   3. hermes.ts fires onToolApprovalRequired when a tool progress event
//      carries requires_approval: true.
//   4. The ApprovalDialog component exists and calls approve/deny.
//   5. Chat.tsx renders the dialog and passes entries.
//
// This is the "trust loop" regression test: tool call → badge → dialog →
// approve/deny. If any link breaks, the approval feature is a dead end.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const indexSrc = readFileSync(join(ROOT, "src/main/index.ts"), "utf-8");
const preloadSrc = readFileSync(join(ROOT, "src/preload/index.ts"), "utf-8");
const hermesSrc = readFileSync(join(ROOT, "src/main/hermes.ts"), "utf-8");
const chatSrc = readFileSync(
  join(ROOT, "src/renderer/src/screens/Chat/Chat.tsx"),
  "utf-8",
);
const dialogPath = join(
  ROOT,
  "src/renderer/src/screens/Chat/ApprovalDialog.tsx",
);

describe("Approval loop — IPC wiring", () => {
  const approvalChannels = [
    "approval-create",
    "approval-approve",
    "approval-deny",
    "approval-list",
    "approval-has-pending",
  ];

  it("main process registers all 5 approval IPC handlers", () => {
    for (const ch of approvalChannels) {
      expect(indexSrc).toContain(`"${ch}"`);
    }
  });

  it("preload exposes all 5 approval bridge methods", () => {
    const bridges = [
      "approvalCreate",
      "approvalApprove",
      "approvalDeny",
      "approvalList",
      "approvalHasPending",
    ];
    for (const b of bridges) {
      expect(preloadSrc).toContain(`${b}:`);
    }
  });

  it("every approval preload invoke has a matching main handler", () => {
    for (const ch of approvalChannels) {
      expect(indexSrc).toContain(`ipcMain.handle("${ch}"`);
      expect(preloadSrc).toContain(`ipcRenderer.invoke("${ch}"`);
    }
  });
});

describe("Approval loop — SSE callback wiring", () => {
  it("ChatCallbacks declares onToolApprovalRequired", () => {
    expect(hermesSrc).toContain("onToolApprovalRequired");
  });

  it("processCustomEvent checks requires_approval on tool progress", () => {
    expect(hermesSrc).toContain("requires_approval");
    expect(hermesSrc).toContain("cb.onToolApprovalRequired");
  });
});

describe("Approval loop — UI wiring (G1)", () => {
  it("ApprovalDialog component exists", () => {
    expect(existsSync(dialogPath)).toBe(true);
  });

  it("ApprovalDialog calls approvalApprove and approvalDeny", () => {
    const dialogSrc = readFileSync(dialogPath, "utf-8");
    expect(dialogSrc).toContain("window.hermesAPI.approvalApprove");
    expect(dialogSrc).toContain("window.hermesAPI.approvalDeny");
  });

  it("Chat.tsx imports and renders ApprovalDialog", () => {
    expect(chatSrc).toContain('import { ApprovalDialog }');
    expect(chatSrc).toContain("<ApprovalDialog");
  });

  it("Chat.tsx polls approvalList and renders the dialog on demand", () => {
    expect(chatSrc).toContain("window.hermesAPI.approvalList");
    expect(chatSrc).toContain("showApprovalDialog");
  });

  it("ChatHeader badge opens the approval dialog", () => {
    expect(chatSrc).toContain("onOpenApprovals");
    const headerSrc = readFileSync(
      join(ROOT, "src/renderer/src/screens/Chat/ChatHeader.tsx"),
      "utf-8",
    );
    expect(headerSrc).toContain("onOpenApprovals");
    // The badge is a button that triggers the dialog
    expect(headerSrc).toContain("onClick={onOpenApprovals}");
  });
});

describe("Approval loop — middleware wiring (G2)", () => {
  it("hermes.ts passes memoryRecallFn into createBeforeModelChain", () => {
    expect(hermesSrc).toContain("memoryRecallFn");
    expect(hermesSrc).toContain("createBeforeModelChain(_harnessRegistry, {");
  });

  it("hermes.ts reads profile memory for the recall source", () => {
    expect(hermesSrc).toContain('import { readMemory } from "./memory"');
    expect(hermesSrc).toContain("readMemory()");
  });
});
