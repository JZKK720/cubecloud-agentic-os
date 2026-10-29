// approval-loop.test.ts — behavioural regression test for the approval loop.
//
// REPLACES the previous version, which asserted that certain strings appeared
// in source files:
//
//     expect(indexSrc).toContain(`ipcMain.handle("${ch}"`);
//     expect(preloadSrc).toContain(`ipcRenderer.invoke("${ch}"`);
//
// That test would have passed if every handler were `() => {}` — it certified
// wiring that could not work, and it is why the feature shipped un-gated.
//
// This version invokes the code and asserts observed behaviour. The gate
// itself (deny stops a request) is proven in middleware-block.test.ts,
// chat-gate.test.ts and hermes-preflight.test.ts; this file covers the
// decision store and its end-to-end round-trip.

import { describe, it, expect, beforeEach } from "vitest";
import {
  createApprovalInbox,
  getApprovalInbox,
  __resetApprovalInboxForTests,
  type ApprovalInbox,
} from "../src/main/approval/inbox";
import { createApprovalIpc } from "../src/main/approval/ipc";

const input = {
  sessionId: "session-1",
  toolName: "shell",
  command: "rm -rf build",
  reason: "destructive command",
};

describe("approval loop — store round-trip", () => {
  let inbox: ApprovalInbox;

  beforeEach(() => {
    inbox = createApprovalInbox({ timeoutMs: 60_000 });
  });

  it("create → pending → approve resolves the waiting caller", async () => {
    const entry = inbox.create(input);
    expect(entry.status).toBe("pending");

    const waiting = inbox.awaitDecision(entry.id);
    inbox.approve(entry.id);

    await expect(waiting).resolves.toBe("approve");
    expect(inbox.get(entry.id)!.status).toBe("approved");
    expect(inbox.hasPending()).toBe(false);
  });

  it("create → pending → deny resolves the waiting caller", async () => {
    const entry = inbox.create(input);
    const waiting = inbox.awaitDecision(entry.id);
    inbox.deny(entry.id);

    await expect(waiting).resolves.toBe("deny");
    expect(inbox.get(entry.id)!.status).toBe("denied");
  });

  it("pending entries are listable while unresolved and gone after", () => {
    const a = inbox.create(input);
    inbox.create(input);
    expect(inbox.list()).toHaveLength(2);

    inbox.approve(a.id);
    expect(inbox.list()).toHaveLength(1);
    expect(inbox.list(true)).toHaveLength(2);
  });
});

describe("approval loop — IPC surface", () => {
  let inbox: ApprovalInbox;
  let ipc: ReturnType<typeof createApprovalIpc>;

  beforeEach(() => {
    inbox = createApprovalInbox({ timeoutMs: 60_000 });
    ipc = createApprovalIpc(inbox);
  });

  it("create returns an id the renderer can act on immediately", () => {
    const entry = ipc.create(input);
    expect(entry.id).toBeTruthy();
    // The renderer needs the id BEFORE it can render approve/deny buttons.
    expect(inbox.get(entry.id)).toBeDefined();
  });

  it("approve via IPC resolves a decision the harness is awaiting", async () => {
    const entry = ipc.create(input);
    const waiting = inbox.awaitDecision(entry.id);

    expect(ipc.approve(entry.id)).toBe(true);
    await expect(waiting).resolves.toBe("approve");
  });

  it("deny via IPC resolves a decision the harness is awaiting", async () => {
    const entry = ipc.create(input);
    const waiting = inbox.awaitDecision(entry.id);

    expect(ipc.deny(entry.id)).toBe(true);
    await expect(waiting).resolves.toBe("deny");
  });

  it("hasPending reflects the decision", () => {
    const entry = ipc.create(input);
    expect(ipc.hasPending()).toBe(true);
    ipc.approve(entry.id);
    expect(ipc.hasPending()).toBe(false);
  });

  it("a second decision on the same id is refused", () => {
    const entry = ipc.create(input);
    expect(ipc.approve(entry.id)).toBe(true);
    expect(ipc.deny(entry.id)).toBe(false);
  });
});

describe("approval loop — singleton sharing", () => {
  beforeEach(() => __resetApprovalInboxForTests());

  it("IPC and the requesting harness observe the same store", async () => {
    // Two independent getApprovalInbox() calls must return the SAME object.
    // If they did not, a decision recorded over IPC would never reach the
    // waiting turn — a silently broken gate.
    const ipcSide = getApprovalInbox();
    const harnessSide = getApprovalInbox();
    expect(ipcSide).toBe(harnessSide);

    const entry = ipcSide.create(input);
    const waiting = harnessSide.awaitDecision(entry.id);
    createApprovalIpc(ipcSide).approve(entry.id);

    await expect(waiting).resolves.toBe("approve");
  });
});
