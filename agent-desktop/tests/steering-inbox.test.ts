// P8: Steering + unattended inbox tests.
//
// Steering: user injects input mid-turn without stopping the agent.
// The input is queued and processed at the next iteration boundary.
//
// Unattended inbox: when an approval request is made and the user
// is away, the approval parks instead of blocking.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type SteeringQueue,
  createSteeringQueue,
  type ApprovalInbox,
  createApprovalInbox,
  type ApprovalEntry,
  type ApprovalStatus,
} from "../src/main/steering-inbox";

// ── SteeringQueue tests ───────────────────────────────────

describe("SteeringQueue", () => {
  let queue: SteeringQueue;

  beforeEach(() => {
    queue = createSteeringQueue();
  });

  it("starts empty", () => {
    expect(queue.isEmpty()).toBe(true);
    expect(queue.dequeue()).toBeNull();
  });

  it("enqueues and dequeues steering input", () => {
    queue.enqueue("Actually, use Python instead");
    expect(queue.isEmpty()).toBe(false);
    const input = queue.dequeue();
    expect(input).toBe("Actually, use Python instead");
    expect(queue.isEmpty()).toBe(true);
  });

  it("preserves FIFO order", () => {
    queue.enqueue("first");
    queue.enqueue("second");
    queue.enqueue("third");
    expect(queue.dequeue()).toBe("first");
    expect(queue.dequeue()).toBe("second");
    expect(queue.dequeue()).toBe("third");
  });

  it("peek returns the next input without removing it", () => {
    queue.enqueue("hello");
    expect(queue.peek()).toBe("hello");
    expect(queue.isEmpty()).toBe(false);
  });

  it("clear removes all queued inputs", () => {
    queue.enqueue("a");
    queue.enqueue("b");
    queue.clear();
    expect(queue.isEmpty()).toBe(true);
  });

  it("size returns the number of queued inputs", () => {
    queue.enqueue("a");
    queue.enqueue("b");
    expect(queue.size()).toBe(2);
  });
});

// ── ApprovalInbox tests ───────────────────────────────────

describe("ApprovalInbox", () => {
  let inbox: ApprovalInbox;

  beforeEach(() => {
    inbox = createApprovalInbox();
  });

  it("starts empty", () => {
    expect(inbox.list()).toEqual([]);
    expect(inbox.hasPending()).toBe(false);
  });

  it("creates a pending approval entry", () => {
    const entry = inbox.create({
      sessionId: "s1",
      toolName: "execute",
      command: "rm -rf /tmp/test",
      reason: "Destructive command requires approval",
    });
    expect(entry.status).toBe("pending");
    expect(entry.command).toBe("rm -rf /tmp/test");
    expect(inbox.hasPending()).toBe(true);
  });

  it("approves a pending entry", () => {
    const entry = inbox.create({
      sessionId: "s1",
      toolName: "execute",
      command: "ls -la",
      reason: "test",
    });
    const result = inbox.approve(entry.id);
    expect(result).toBe(true);
    const updated = inbox.get(entry.id);
    expect(updated?.status).toBe("approved");
    expect(inbox.hasPending()).toBe(false);
  });

  it("denies a pending entry", () => {
    const entry = inbox.create({
      sessionId: "s1",
      toolName: "execute",
      command: "rm -rf /",
      reason: "dangerous",
    });
    const result = inbox.deny(entry.id);
    expect(result).toBe(true);
    const updated = inbox.get(entry.id);
    expect(updated?.status).toBe("denied");
  });

  it("list returns only pending entries by default", () => {
    const e1 = inbox.create({ sessionId: "s1", toolName: "t", command: "a", reason: "r" });
    const e2 = inbox.create({ sessionId: "s1", toolName: "t", command: "b", reason: "r" });
    inbox.approve(e1.id);
    const pending = inbox.list();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(e2.id);
  });

  it("list with includeAll=true returns all entries", () => {
    const e1 = inbox.create({ sessionId: "s1", toolName: "t", command: "a", reason: "r" });
    const e2 = inbox.create({ sessionId: "s1", toolName: "t", command: "b", reason: "r" });
    inbox.approve(e1.id);
    inbox.deny(e2.id);
    const all = inbox.list(true);
    expect(all).toHaveLength(2);
  });

  it("auto-expire pending entries after timeout", () => {
    const entry = inbox.create({
      sessionId: "s1",
      toolName: "execute",
      command: "ls",
      reason: "test",
      timeoutMs: 50, // 50ms timeout
    });
    // Wait for timeout
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const expired = inbox.get(entry.id);
        expect(expired?.status).toBe("expired");
        expect(inbox.hasPending()).toBe(false);
        resolve();
      }, 60);
    });
  });

  it("clear removes all entries", () => {
    inbox.create({ sessionId: "s1", toolName: "t", command: "a", reason: "r" });
    inbox.create({ sessionId: "s1", toolName: "t", command: "b", reason: "r" });
    inbox.clear();
    expect(inbox.list()).toEqual([]);
    expect(inbox.hasPending()).toBe(false);
  });

  it("get returns an entry by id regardless of status", () => {
    const entry = inbox.create({ sessionId: "s1", toolName: "t", command: "a", reason: "r" });
    inbox.approve(entry.id);
    const found = inbox.get(entry.id);
    expect(found?.id).toBe(entry.id);
    expect(found?.status).toBe("approved");
  });
});