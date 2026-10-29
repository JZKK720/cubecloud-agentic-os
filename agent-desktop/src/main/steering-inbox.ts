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

// ── ApprovalInbox (moved) ─────────────────────────────────
//
// The synchronous store that used to live here could record a decision but
// could never make anything WAIT for one — see approval/inbox.ts for the
// deferred-resolution replacement. Re-exported so existing imports keep
// working; new code should import from "./approval/inbox".

export {
  createApprovalInbox,
  getApprovalInbox,
  setApprovalInbox,
  __resetApprovalInboxForTests,
} from "./approval/inbox";
export type {
  ApprovalDecision,
  ApprovalEntry,
  ApprovalInput,
  ApprovalInbox,
  ApprovalStatus,
  ApprovalInboxOptions,
} from "./approval/inbox";
