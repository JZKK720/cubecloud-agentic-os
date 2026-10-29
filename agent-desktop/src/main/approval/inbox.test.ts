import { describe, it, expect } from "vitest";
import {
  createApprovalInbox,
  getApprovalInbox,
  __resetApprovalInboxForTests,
} from "./inbox";

const input = {
  sessionId: "s1",
  toolName: "shell",
  command: "rm -rf build",
  reason: "destructive",
};

describe("ApprovalInbox — deferred decisions", () => {
  it("create() returns an entry immediately and does not block", () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    expect(entry.id).toBeTruthy();
    expect(entry.status).toBe("pending");
    expect(inbox.hasPending()).toBe(true);
  });

  it("awaitDecision() stays pending until settle() is called", async () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    let resolved: string | undefined;

    void inbox.awaitDecision(entry.id).then((d) => {
      resolved = d;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(resolved).toBeUndefined();
    expect(inbox.get(entry.id)!.status).toBe("pending");

    expect(inbox.settle(entry.id, "approve")).toBe(true);
    await Promise.resolve();
    expect(resolved).toBe("approve");
  });

  it("settle() on an unknown id returns false", () => {
    const inbox = createApprovalInbox();
    expect(inbox.settle("nope", "approve")).toBe(false);
  });

  it("settling twice returns false the second time and keeps the first decision", async () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    const p = inbox.awaitDecision(entry.id);
    expect(inbox.settle(entry.id, "deny")).toBe(true);
    expect(inbox.settle(entry.id, "approve")).toBe(false);
    await expect(p).resolves.toBe("deny");
  });

  it("times out to deny, and records status timeout", async () => {
    const inbox = createApprovalInbox({ timeoutMs: 10 });
    const entry = inbox.create(input);
    await expect(inbox.awaitDecision(entry.id)).resolves.toBe("deny");
    expect(inbox.get(entry.id)!.status).toBe("timeout");
  });

  it("never overwrites an already-settled entry on timeout", async () => {
    const inbox = createApprovalInbox({ timeoutMs: 20 });
    const entry = inbox.create(input);
    inbox.settle(entry.id, "approve");
    await new Promise((r) => setTimeout(r, 40));
    expect(inbox.get(entry.id)!.status).toBe("approved");
  });

  it("hasPending() transitions to false after settling", () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    expect(inbox.hasPending()).toBe(true);
    inbox.settle(entry.id, "approve");
    expect(inbox.hasPending()).toBe(false);
  });

  it("preserves the legacy approve()/deny() boolean API", () => {
    const inbox = createApprovalInbox();
    const a = inbox.create(input);
    expect(inbox.approve(a.id)).toBe(true);
    expect(inbox.get(a.id)!.status).toBe("approved");

    const d = inbox.create(input);
    expect(inbox.deny(d.id)).toBe(true);
    expect(inbox.get(d.id)!.status).toBe("denied");
  });

  it("approve() resolves a waiting awaitDecision()", async () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    const p = inbox.awaitDecision(entry.id);
    inbox.approve(entry.id);
    await expect(p).resolves.toBe("approve");
  });

  it("getApprovalInbox() is a process-wide singleton", async () => {
    __resetApprovalInboxForTests();
    const a = getApprovalInbox();
    const b = getApprovalInbox();
    expect(a).toBe(b);

    const entry = a.create(input);
    const p = b.awaitDecision(entry.id);
    a.settle(entry.id, "approve");
    await expect(p).resolves.toBe("approve");
    __resetApprovalInboxForTests();
  });

  it("awaitDecision() on an already-resolved entry returns immediately", async () => {
    const inbox = createApprovalInbox();
    const entry = inbox.create(input);
    inbox.settle(entry.id, "approve");
    await expect(inbox.awaitDecision(entry.id)).resolves.toBe("approve");
  });

  it("awaitDecision() on an unknown id denies (fail closed)", async () => {
    const inbox = createApprovalInbox();
    await expect(inbox.awaitDecision("does-not-exist")).resolves.toBe("deny");
  });
});
