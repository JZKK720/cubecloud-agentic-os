// steering-inbox.ts — P8: Steering queue + unattended approval inbox.
//
// Steering: user injects input mid-turn without stopping the agent.
// The input is queued and processed at the next iteration boundary.
//
// Unattended inbox: when an approval request is made and the user
// is away, the approval parks instead of blocking. When the user
// returns, they can review and override parked approvals.
//
// Inspired by openworker's TurnEngine steering and unattended inbox,
// adapted to the Cubecloud Agent Desktop.

// ── SteeringQueue ─────────────────────────────────────────

/** A FIFO queue for steering inputs (user messages injected mid-turn). */
export interface SteeringQueue {
  /** Add a steering input to the queue. */
  enqueue(input: string): void;
  /** Remove and return the next steering input (or null if empty). */
  dequeue(): string | null;
  /** Peek at the next steering input without removing it. */
  peek(): string | null;
  /** Check if the queue is empty. */
  isEmpty(): boolean;
  /** Get the number of queued inputs. */
  size(): number;
  /** Clear all queued inputs. */
  clear(): void;
}

/** Create a steering queue. */
export function createSteeringQueue(): SteeringQueue {
  const _queue: string[] = [];

  return {
    enqueue(input: string) {
      _queue.push(input);
    },
    dequeue() {
      return _queue.shift() ?? null;
    },
    peek() {
      return _queue[0] ?? null;
    },
    isEmpty() {
      return _queue.length === 0;
    },
    size() {
      return _queue.length;
    },
    clear() {
      _queue.length = 0;
    },
  };
}

// ── ApprovalInbox ─────────────────────────────────────────

/** The status of an approval entry. */
export type ApprovalStatus = "pending" | "approved" | "denied" | "expired";

/** A single approval entry in the inbox. */
export interface ApprovalEntry {
  id: string;
  sessionId: string;
  toolName: string;
  command: string;
  reason: string;
  status: ApprovalStatus;
  createdAt: number;
  resolvedAt: number | null;
  /** Auto-expire timeout in ms (undefined = no auto-expire). */
  timeoutMs?: number;
}

/** Input for creating a new approval entry. */
export interface ApprovalInput {
  sessionId: string;
  toolName: string;
  command: string;
  reason: string;
  timeoutMs?: number;
}

/** The approval inbox interface. */
export interface ApprovalInbox {
  /** Create a new pending approval entry. */
  create(input: ApprovalInput): ApprovalEntry;
  /** Approve a pending entry. Returns false if not found or not pending. */
  approve(id: string): boolean;
  /** Deny a pending entry. Returns false if not found or not pending. */
  deny(id: string): boolean;
  /** Get an entry by id (regardless of status). */
  get(id: string): ApprovalEntry | undefined;
  /** List entries. By default only pending; use includeAll for all. */
  list(includeAll?: boolean): ApprovalEntry[];
  /** Check if there are any pending approvals. */
  hasPending(): boolean;
  /** Clear all entries. */
  clear(): void;
}

/** Create an approval inbox. */
export function createApprovalInbox(): ApprovalInbox {
  const _entries = new Map<string, ApprovalEntry>();
  const _timers = new Map<string, ReturnType<typeof setTimeout>>();

  function expireIfNeeded(entry: ApprovalEntry): void {
    if (entry.timeoutMs && entry.status === "pending") {
      const timer = setTimeout(() => {
        const current = _entries.get(entry.id);
        if (current && current.status === "pending") {
          _entries.set(entry.id, {
            ...current,
            status: "expired",
            resolvedAt: Date.now(),
          });
        }
        _timers.delete(entry.id);
      }, entry.timeoutMs);
      _timers.set(entry.id, timer);
    }
  }

  return {
    create(input: ApprovalInput): ApprovalEntry {
      const id = `approval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const entry: ApprovalEntry = {
        id,
        sessionId: input.sessionId,
        toolName: input.toolName,
        command: input.command,
        reason: input.reason,
        status: "pending",
        createdAt: Date.now(),
        resolvedAt: null,
        timeoutMs: input.timeoutMs,
      };
      _entries.set(id, entry);
      expireIfNeeded(entry);
      return entry;
    },

    approve(id: string): boolean {
      const entry = _entries.get(id);
      if (!entry || entry.status !== "pending") return false;
      const timer = _timers.get(id);
      if (timer) clearTimeout(timer);
      _timers.delete(id);
      _entries.set(id, {
        ...entry,
        status: "approved",
        resolvedAt: Date.now(),
      });
      return true;
    },

    deny(id: string): boolean {
      const entry = _entries.get(id);
      if (!entry || entry.status !== "pending") return false;
      const timer = _timers.get(id);
      if (timer) clearTimeout(timer);
      _timers.delete(id);
      _entries.set(id, {
        ...entry,
        status: "denied",
        resolvedAt: Date.now(),
      });
      return true;
    },

    get(id: string): ApprovalEntry | undefined {
      return _entries.get(id);
    },

    list(includeAll?: boolean): ApprovalEntry[] {
      const all = Array.from(_entries.values());
      if (includeAll) return all;
      return all.filter((e) => e.status === "pending");
    },

    hasPending(): boolean {
      for (const entry of _entries.values()) {
        if (entry.status === "pending") return true;
      }
      return false;
    },

    clear(): void {
      for (const timer of _timers.values()) {
        clearTimeout(timer);
      }
      _timers.clear();
      _entries.clear();
    },
  };
}