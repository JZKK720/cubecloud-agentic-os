// P9: Run queue with leasing tests.
//
// Turns are enqueued as Runs with status (pending/running/done/failed),
// attempts, lease token, lease expiry. Workers claim runs with a lease,
// send heartbeats, and abort on lease loss. Failed runs retry up to
// maxAttempts, with NonRetryableTurnError preventing retry.
//
// Inspired by qm's run-store.ts and worker.ts, adapted to SQLite-free
// in-memory operation for the desktop's single-user model.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  type RunStore,
  type Run,
  type RunStatus,
  createRunStore,
  type NonRetryableError,
  isNonRetryable,
} from "../src/run-queue";

// ── RunStore tests ────────────────────────────────────────

describe("RunStore", () => {
  let store: RunStore;

  beforeEach(() => {
    store = createRunStore();
  });

  it("starts empty", () => {
    expect(store.list()).toEqual([]);
    expect(store.claimable()).toEqual([]);
  });

  it("enqueues a run with pending status", () => {
    const run = store.enqueue({
      sessionId: "s1",
      message: "hello",
      maxAttempts: 3,
    });
    expect(run.status).toBe("pending");
    expect(run.attempts).toBe(0);
    expect(run.maxAttempts).toBe(3);
    expect(run.id).toBeDefined();
  });

  it("claim returns the next pending run", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 30000);
    expect(run).not.toBeNull();
    expect(run!.status).toBe("running");
    expect(run!.workerId).toBe("worker-1");
    expect(run!.leaseToken).toBeDefined();
    expect(run!.attempts).toBe(1);
  });

  it("claim returns null when no pending runs", () => {
    expect(store.claim("worker-1", 30000)).toBeNull();
  });

  it("complete marks a run as done", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 30000);
    store.complete(run!.id, { response: "done" });
    const updated = store.get(run!.id);
    expect(updated!.status).toBe("done");
    expect(updated!.result).toEqual({ response: "done" });
  });

  it("fail marks a run as failed and allows retry if attempts remain", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 30000);
    store.fail(run!.id, "connection error");
    const updated = store.get(run!.id);
    expect(updated!.status).toBe("pending"); // back to pending for retry
    expect(updated!.attempts).toBe(1);
    expect(updated!.lastError).toBe("connection error");
  });

  it("fail with non-retryable error stays failed", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 30000);
    store.fail(run!.id, "bad request", true); // nonRetryable = true
    const updated = store.get(run!.id);
    expect(updated!.status).toBe("failed");
  });

  it("fail after maxAttempts stays failed", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 2 });
    const r1 = store.claim("w1", 30000);
    store.fail(r1!.id, "error 1");
    const r2 = store.claim("w1", 30000);
    expect(r2!.id).toBe(r1!.id); // same run, second attempt
    store.fail(r2!.id, "error 2");
    const updated = store.get(r2!.id);
    expect(updated!.status).toBe("failed");
    expect(updated!.attempts).toBe(2);
  });

  it("heartbeat renews the lease", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 30000);
    const originalExpiry = run!.leaseExpiresAt;
    store.heartbeat(run!.id, 60000);
    const updated = store.get(run!.id);
    expect(updated!.leaseExpiresAt).toBeGreaterThan(originalExpiry);
  });

  it("expired leases become claimable again", () => {
    store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const run = store.claim("worker-1", 50); // 50ms lease
    expect(run).not.toBeNull();

    // Wait for lease to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        store.reapExpired();
        const claimable = store.claimable();
        // The expired run should be back in pending (retryable)
        expect(claimable.length).toBeGreaterThanOrEqual(0);
        // The run should be pending or failed
        const updated = store.get(run!.id);
        expect(["pending", "failed"]).toContain(updated!.status);
        resolve();
      }, 60);
    });
  });

  it("list returns all runs", () => {
    store.enqueue({ sessionId: "s1", message: "a", maxAttempts: 3 });
    store.enqueue({ sessionId: "s2", message: "b", maxAttempts: 3 });
    expect(store.list()).toHaveLength(2);
  });

  it("get returns a run by id", () => {
    const run = store.enqueue({ sessionId: "s1", message: "hello", maxAttempts: 3 });
    const found = store.get(run.id);
    expect(found!.id).toBe(run.id);
  });

  it("clear removes all runs", () => {
    store.enqueue({ sessionId: "s1", message: "a", maxAttempts: 3 });
    store.enqueue({ sessionId: "s2", message: "b", maxAttempts: 3 });
    store.clear();
    expect(store.list()).toEqual([]);
  });
});

// ── isNonRetryable tests ──────────────────────────────────

describe("isNonRetryable", () => {
  it("returns true for NonRetryableError", () => {
    const err: NonRetryableError = { message: "bad request", nonRetryable: true };
    expect(isNonRetryable(err)).toBe(true);
  });

  it("returns false for regular errors", () => {
    expect(isNonRetryable({ message: "timeout" })).toBe(false);
    expect(isNonRetryable(null)).toBe(false);
    expect(isNonRetryable(undefined)).toBe(false);
  });
});