// approval/inbox.ts — deferred-resolution approval inbox.
//
// Supersedes the synchronous approval store in `steering-inbox.ts`, which
// could record a decision but could never make anything *wait* for one.
//
// Two halves, deliberately separate:
//   create(input) -> entry     returns immediately, so the renderer can
//                              obtain an id before it renders a dialog.
//   awaitDecision(id)          returns a Promise that settles on decision
//                              or times out to "deny".
//
// Fail-closed: an unknown id, a timeout, or a missing decision all resolve
// to "deny". Nothing here can resolve to "approve" without a human action.

/** The decision a caller awaits. */
export type ApprovalDecision = "approve" | "deny";

/** The status of an approval entry. */
export type ApprovalStatus = "pending" | "approved" | "denied" | "timeout";

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
  /** Auto-expire timeout in ms (undefined = inbox default). */
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
  /** Create a pending entry. Returns immediately — never blocks. */
  create(input: ApprovalInput): ApprovalEntry;
  /** Resolve a pending entry. Returns false if unknown or already settled. */
  settle(id: string, decision: ApprovalDecision): boolean;
  /** Await the decision for an entry. Unknown id → "deny". */
  awaitDecision(id: string, opts?: { timeoutMs?: number }): Promise<ApprovalDecision>;
  /** Convenience: create + await. */
  request(input: ApprovalInput, opts?: { timeoutMs?: number }): Promise<ApprovalDecision>;

  // Legacy boolean API, preserved so existing IPC callers keep working.
  approve(id: string): boolean;
  deny(id: string): boolean;

  get(id: string): ApprovalEntry | undefined;
  list(includeAll?: boolean): ApprovalEntry[];
  hasPending(): boolean;
  pendingCount(): number;
  clear(): void;
}

export interface ApprovalInboxOptions {
  /** Default expiry for entries that do not carry their own. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

/** Create an approval inbox. */
export function createApprovalInbox(options: ApprovalInboxOptions = {}): ApprovalInbox {
  const defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const entries = new Map<string, ApprovalEntry>();
  const waiters = new Map<string, (decision: ApprovalDecision) => void>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  let seq = 0;

  function makeId(): string {
    seq += 1;
    return `approval-${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function clearTimer(id: string): void {
    const timer = timers.get(id);
    if (timer) clearTimeout(timer);
    timers.delete(id);
  }

  function settleInternal(id: string, status: ApprovalStatus): boolean {
    const entry = entries.get(id);
    if (!entry || entry.status !== "pending") return false;

    clearTimer(id);
    entries.set(id, { ...entry, status, resolvedAt: Date.now() });

    const waiter = waiters.get(id);
    if (waiter) {
      waiters.delete(id);
      // "timeout" is a denial. Only an explicit approval approves.
      waiter(status === "approved" ? "approve" : "deny");
    }
    return true;
  }

  function startTimer(id: string, timeoutMs: number): void {
    clearTimer(id);
    const timer = setTimeout(() => {
      timers.delete(id);
      settleInternal(id, "timeout");
    }, timeoutMs);
    // Do not hold the process open for a pending approval.
    if (typeof timer === "object" && timer !== null && "unref" in timer) {
      (timer as { unref: () => void }).unref();
    }
    timers.set(id, timer);
  }

  return {
    create(input: ApprovalInput): ApprovalEntry {
      const id = makeId();
      const timeoutMs = input.timeoutMs ?? defaultTimeoutMs;
      const entry: ApprovalEntry = {
        id,
        sessionId: input.sessionId,
        toolName: input.toolName,
        command: input.command,
        reason: input.reason,
        status: "pending",
        createdAt: Date.now(),
        resolvedAt: null,
        timeoutMs,
      };
      entries.set(id, entry);
      startTimer(id, timeoutMs);
      return entry;
    },

    settle(id: string, decision: ApprovalDecision): boolean {
      return settleInternal(id, decision === "approve" ? "approved" : "denied");
    },

    awaitDecision(id: string, opts?: { timeoutMs?: number }): Promise<ApprovalDecision> {
      const entry = entries.get(id);

      // Unknown id: fail closed rather than hang.
      if (!entry) return Promise.resolve("deny");

      // Already settled: answer immediately.
      if (entry.status !== "pending") {
        return Promise.resolve(entry.status === "approved" ? "approve" : "deny");
      }

      return new Promise<ApprovalDecision>((resolve) => {
        waiters.set(id, resolve);
        if (opts?.timeoutMs !== undefined) startTimer(id, opts.timeoutMs);
      });
    },

    async request(input: ApprovalInput, opts?: { timeoutMs?: number }): Promise<ApprovalDecision> {
      const entry = this.create(input);
      return this.awaitDecision(entry.id, opts);
    },

    approve(id: string): boolean {
      return settleInternal(id, "approved");
    },

    deny(id: string): boolean {
      return settleInternal(id, "denied");
    },

    get(id: string): ApprovalEntry | undefined {
      return entries.get(id);
    },

    list(includeAll?: boolean): ApprovalEntry[] {
      const all = Array.from(entries.values());
      return includeAll ? all : all.filter((e) => e.status === "pending");
    },

    hasPending(): boolean {
      for (const entry of entries.values()) {
        if (entry.status === "pending") return true;
      }
      return false;
    },

    pendingCount(): number {
      let n = 0;
      for (const entry of entries.values()) {
        if (entry.status === "pending") n += 1;
      }
      return n;
    },

    clear(): void {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      entries.clear();
      // Any waiter is released as a denial so no caller hangs forever.
      for (const [id, resolve] of waiters) {
        waiters.delete(id);
        resolve("deny");
      }
    },
  };
}

// ── Process-wide singleton ────────────────────────────────
//
// There must be exactly ONE inbox per process. If the IPC layer and the
// harness each held their own, a decision recorded over IPC would never
// reach the waiting turn — a silently broken gate.

let singleton: ApprovalInbox | null = null;

export function getApprovalInbox(): ApprovalInbox {
  if (!singleton) singleton = createApprovalInbox();
  return singleton;
}

/** Replace the singleton (tests, or wiring a configured timeout at boot). */
export function setApprovalInbox(inbox: ApprovalInbox | null): void {
  singleton = inbox;
}

/** Test seam — clears the singleton so suites do not leak state. */
export function __resetApprovalInboxForTests(): void {
  singleton = null;
}
