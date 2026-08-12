// run-queue.ts — P9: Run queue with leasing.
//
// Turns are enqueued as Runs with status (pending/running/done/failed),
// attempts, lease token, lease expiry. Workers claim runs with a lease,
// send heartbeats, and abort on lease loss. Failed runs retry up to
// maxAttempts, with NonRetryableTurnError preventing retry.
//
// Inspired by qm's run-store.ts and worker.ts, adapted to in-memory
// operation for the desktop's single-user model (SQLite not needed).

// ── Types ─────────────────────────────────────────────────

/** The status of a run in the queue. */
export type RunStatus = "pending" | "running" | "done" | "failed";

/** Input for enqueuing a new run. */
export interface RunInput {
  sessionId: string;
  message: string;
  maxAttempts: number;
  history?: Array<{ role: string; content: string }>;
  model?: string;
}

/** A run in the queue. */
export interface Run {
  id: string;
  sessionId: string;
  message: string;
  history?: Array<{ role: string; content: string }>;
  model?: string;
  status: RunStatus;
  attempts: number;
  maxAttempts: number;
  result?: { response: string };
  lastError?: string;
  workerId?: string;
  leaseToken?: string;
  leaseExpiresAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** An error that should not be retried. */
export interface NonRetryableError {
  message: string;
  nonRetryable: true;
}

/** Check if an error is non-retryable. */
export function isNonRetryable(err: unknown): err is NonRetryableError {
  return (
    err !== null &&
    err !== undefined &&
    typeof err === "object" &&
    "nonRetryable" in err &&
    (err as NonRetryableError).nonRetryable === true
  );
}

/** The run store interface. */
export interface RunStore {
  /** Enqueue a new run. */
  enqueue(input: RunInput): Run;
  /** Claim the next pending run for a worker. */
  claim(workerId: string, leaseTtlMs: number): Run | null;
  /** Mark a run as done with a result. */
  complete(runId: string, result: { response: string }): void;
  /** Mark a run as failed. If non-retryable or attempts exhausted, stays failed. */
  fail(runId: string, error: string, nonRetryable?: boolean): void;
  /** Renew a run's lease. */
  heartbeat(runId: string, leaseTtlMs: number): void;
  /** Reap expired leases — return expired runs to pending. */
  reapExpired(): void;
  /** Get a run by id. */
  get(runId: string): Run | undefined;
  /** List all runs. */
  list(): Run[];
  /** List claimable (pending) runs. */
  claimable(): Run[];
  /** Clear all runs. */
  clear(): void;
}

// ── createRunStore ────────────────────────────────────────

/** Create an in-memory run store. */
export function createRunStore(): RunStore {
  const _runs = new Map<string, Run>();

  function generateId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function generateLeaseToken(): string {
    return `lease-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  return {
    enqueue(input: RunInput): Run {
      const now = Date.now();
      const run: Run = {
        id: generateId(),
        sessionId: input.sessionId,
        message: input.message,
        history: input.history,
        model: input.model,
        status: "pending",
        attempts: 0,
        maxAttempts: input.maxAttempts,
        createdAt: now,
        updatedAt: now,
      };
      _runs.set(run.id, run);
      return run;
    },

    claim(workerId: string, leaseTtlMs: number): Run | null {
      // Find the first pending run
      for (const run of _runs.values()) {
        if (run.status === "pending") {
          const now = Date.now();
          const updated: Run = {
            ...run,
            status: "running",
            attempts: run.attempts + 1,
            workerId,
            leaseToken: generateLeaseToken(),
            leaseExpiresAt: now + leaseTtlMs,
            updatedAt: now,
          };
          _runs.set(run.id, updated);
          return updated;
        }
      }
      return null;
    },

    complete(runId: string, result: { response: string }): void {
      const run = _runs.get(runId);
      if (!run) return;
      _runs.set(runId, {
        ...run,
        status: "done",
        result,
        leaseToken: undefined,
        leaseExpiresAt: undefined,
        updatedAt: Date.now(),
      });
    },

    fail(runId: string, error: string, nonRetryable?: boolean): void {
      const run = _runs.get(runId);
      if (!run) return;
      const now = Date.now();

      if (nonRetryable || run.attempts >= run.maxAttempts) {
        _runs.set(runId, {
          ...run,
          status: "failed",
          lastError: error,
          leaseToken: undefined,
          leaseExpiresAt: undefined,
          updatedAt: now,
        });
      } else {
        // Back to pending for retry
        _runs.set(runId, {
          ...run,
          status: "pending",
          lastError: error,
          workerId: undefined,
          leaseToken: undefined,
          leaseExpiresAt: undefined,
          updatedAt: now,
        });
      }
    },

    heartbeat(runId: string, leaseTtlMs: number): void {
      const run = _runs.get(runId);
      if (!run || run.status !== "running") return;
      _runs.set(runId, {
        ...run,
        leaseExpiresAt: Date.now() + leaseTtlMs,
        updatedAt: Date.now(),
      });
    },

    reapExpired(): void {
      const now = Date.now();
      for (const [id, run] of _runs) {
        if (
          run.status === "running" &&
          run.leaseExpiresAt &&
          run.leaseExpiresAt < now
        ) {
          // Lease expired — return to pending for retry
          this.fail(id, "lease expired");
        }
      }
    },

    get(runId: string): Run | undefined {
      return _runs.get(runId);
    },

    list(): Run[] {
      return Array.from(_runs.values());
    },

    claimable(): Run[] {
      return Array.from(_runs.values()).filter((r) => r.status === "pending");
    },

    clear(): void {
      _runs.clear();
    },
  };
}