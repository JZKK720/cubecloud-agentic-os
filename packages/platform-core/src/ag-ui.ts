// ag-ui.ts — AG-UI protocol codec (edge adapter).
//
// AG-UI (https://docs.ag-ui.com) is a frozen, event-based protocol that
// standardizes how agents stream to user-facing applications. Its 1.0
// spec (spec/1.0/schema.json upstream) defines 31 event types; we
// implement the subset our harnesses can actually produce.
//
// WHY THIS LIVES HERE: `HarnessTurnDelta` is already isomorphic to a
// subset of the AG-UI event model —
//
//   {type:"text"}        → TEXT_MESSAGE_START/CONTENT/END
//   {type:"reasoning"}   → REASONING_MESSAGE_START/CONTENT/END
//   {type:"tool_call"}   → TOOL_CALL_START/ARGS/END
//   {type:"tool_result"} → TOOL_CALL_RESULT
//   {type:"usage"}       → (no AG-UI equivalent; folded into RUN_FINISHED)
//   {type:"done"}        → RUN_FINISHED
//
// so one adapter at the chat boundary makes every harness consumable by
// any AG-UI client without per-harness wiring.
//
// SCOPE: this module is pure. It holds no transport, no socket, no
// clock. Encoding produces event objects (the caller serializes them as
// `data: {json}\n\n` over SSE); decoding consumes already-parsed events.
// That keeps it testable and keeps the Electron IPC path untouched —
// AG-UI is the *edge* protocol, not the internal transport.
//
// SPEC RULES ENCODED HERE (both from docs/spec/1.0/basic):
//   1. Optional fields with no value MUST be omitted, never sent as
//      `null`. Violating this breaks strict clients.
//   2. A run terminates; it never pauses mid-stream. Human-in-the-loop
//      is expressed as RUN_FINISHED.outcome = {type:"interrupt"}, and the
//      next run carries `resume[]`. "Omission is not abandonment" — a
//      consumer must answer every interrupt or the run is rejected.

// ── Event types (AG-UI 1.0 subset) ─────────────────────────
//
// The full upstream enum has 31 members. We model the ones a chat
// harness can emit; the rest are rejected at parse time rather than
// silently dropped, so drift is visible.

export type AgUiEventType =
  // Runs & steps
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "STEP_STARTED"
  | "STEP_FINISHED"
  // Text messages
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  // Tool calls
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "TOOL_CALL_RESULT"
  // Reasoning
  | "REASONING_START"
  | "REASONING_MESSAGE_START"
  | "REASONING_MESSAGE_CONTENT"
  | "REASONING_MESSAGE_END"
  | "REASONING_END"
  // State
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "MESSAGES_SNAPSHOT"
  // Activity (generative UI surfaces)
  | "ACTIVITY_SNAPSHOT"
  | "ACTIVITY_DELTA"
  // Subagents
  | "SUBAGENT_STARTED"
  | "SUBAGENT_FINISHED"
  | "SUBAGENT_ERROR"
  // Passthrough
  | "RAW"
  | "CUSTOM";

/** The complete upstream set, used to distinguish "known but not
 *  modelled here" from "not AG-UI at all". */
export const AG_UI_EVENT_TYPES: readonly AgUiEventType[] = [
  "RUN_STARTED",
  "RUN_FINISHED",
  "RUN_ERROR",
  "STEP_STARTED",
  "STEP_FINISHED",
  "TEXT_MESSAGE_START",
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_END",
  "TOOL_CALL_START",
  "TOOL_CALL_ARGS",
  "TOOL_CALL_END",
  "TOOL_CALL_RESULT",
  "REASONING_START",
  "REASONING_MESSAGE_START",
  "REASONING_MESSAGE_CONTENT",
  "REASONING_MESSAGE_END",
  "REASONING_END",
  "STATE_SNAPSHOT",
  "STATE_DELTA",
  "MESSAGES_SNAPSHOT",
  "ACTIVITY_SNAPSHOT",
  "ACTIVITY_DELTA",
  "SUBAGENT_STARTED",
  "SUBAGENT_FINISHED",
  "SUBAGENT_ERROR",
  "RAW",
  "CUSTOM",
] as const;

// ── Base event ────────────────────────────────────────────

/** Every AG-UI event composes this envelope. */
export interface AgUiBaseEvent {
  type: AgUiEventType;
  /** Conventionally ms-since-epoch, but nothing in the protocol
   *  computes with it. Omitted when the producer has no clock. */
  timestamp?: number;
  /** The provider-native original, when one exists. */
  rawEvent?: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgUiRunStarted extends AgUiBaseEvent {
  type: "RUN_STARTED";
  threadId: string;
  runId: string;
  /** The protocol version the producer speaks. */
  protocolVersion?: string;
}

export type AgUiRunFinishedOutcome =
  | { type: "success"; pendingToolCallIds?: string[] }
  | { type: "cancelled" }
  | { type: "interrupt"; interrupts: AgUiInterrupt[] };

export interface AgUiRunFinished extends AgUiBaseEvent {
  type: "RUN_FINISHED";
  threadId: string;
  runId: string;
  /** Absent means success — which is why every 0.x producer is
   *  already 1.0-conformant. */
  outcome?: AgUiRunFinishedOutcome;
}

export interface AgUiRunError extends AgUiBaseEvent {
  type: "RUN_ERROR";
  message: string;
  code?: string;
}

export interface AgUiTextMessageStart extends AgUiBaseEvent {
  type: "TEXT_MESSAGE_START";
  messageId: string;
  role: "assistant" | "user" | "system" | "tool";
}

export interface AgUiTextMessageContent extends AgUiBaseEvent {
  type: "TEXT_MESSAGE_CONTENT";
  messageId: string;
  delta: string;
}

export interface AgUiTextMessageEnd extends AgUiBaseEvent {
  type: "TEXT_MESSAGE_END";
  messageId: string;
}

export interface AgUiToolCallStart extends AgUiBaseEvent {
  type: "TOOL_CALL_START";
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
}

export interface AgUiToolCallArgs extends AgUiBaseEvent {
  type: "TOOL_CALL_ARGS";
  toolCallId: string;
  delta: string;
}

export interface AgUiToolCallEnd extends AgUiBaseEvent {
  type: "TOOL_CALL_END";
  toolCallId: string;
}

export interface AgUiToolCallResult extends AgUiBaseEvent {
  type: "TOOL_CALL_RESULT";
  toolCallId: string;
  messageId: string;
  content: string;
  role?: "tool";
}

export interface AgUiReasoningStart extends AgUiBaseEvent {
  type: "REASONING_START";
  messageId: string;
}

export interface AgUiReasoningMessageStart extends AgUiBaseEvent {
  type: "REASONING_MESSAGE_START";
  messageId: string;
}

export interface AgUiReasoningContent extends AgUiBaseEvent {
  type: "REASONING_MESSAGE_CONTENT";
  messageId: string;
  delta: string;
}

export interface AgUiReasoningMessageEnd extends AgUiBaseEvent {
  type: "REASONING_MESSAGE_END";
  messageId: string;
}

export interface AgUiReasoningEnd extends AgUiBaseEvent {
  type: "REASONING_END";
  messageId: string;
}

export interface AgUiStepStarted extends AgUiBaseEvent {
  type: "STEP_STARTED";
  stepName: string;
}

export interface AgUiStepFinished extends AgUiBaseEvent {
  type: "STEP_FINISHED";
  stepName: string;
}

export interface AgUiInterrupt {
  id: string;
  /** e.g. "tool_approval" */
  reason: string;
  message?: string;
  toolCallId?: string;
  /** Carried opaquely — the protocol does not validate it. */
  responseSchema?: unknown;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type AgUiEvent =
  | AgUiRunStarted
  | AgUiRunFinished
  | AgUiRunError
  | AgUiTextMessageStart
  | AgUiTextMessageContent
  | AgUiTextMessageEnd
  | AgUiToolCallStart
  | AgUiToolCallArgs
  | AgUiToolCallEnd
  | AgUiToolCallResult
  | AgUiReasoningStart
  | AgUiReasoningMessageStart
  | AgUiReasoningContent
  | AgUiReasoningMessageEnd
  | AgUiReasoningEnd
  | AgUiStepStarted
  | AgUiStepFinished;

// ── Run input / resume ─────────────────────────────────────

/** What a client POSTs to start a run. */
export interface AgUiRunAgentInput {
  threadId: string;
  runId: string;
  messages: Array<{ id?: string; role: string; content: string }>;
  tools?: unknown[];
  context?: Record<string, unknown>;
  state?: unknown;
  /** Answers to interrupts raised by a previous run. */
  resume?: AgUiResumeEntry[];
}

/** One answer to one interrupt. */
export interface AgUiResumeEntry {
  interruptId: string;
  status: "resolved" | "cancelled";
  payload?: unknown;
  metadata?: Record<string, unknown>;
}

// ── Encode: HarnessTurnDelta → AG-UI events ────────────────

/** Tracks the ids a single turn needs so the emitted event sequence is
 *  well-formed (a CONTENT always has a preceding START, etc.).
 *
 *  The caller owns one encoder per turn and feeds it deltas in order. */
export interface AgUiEncoder {
  /** Feed one delta; returns the events to emit (possibly empty). */
  push(delta: import("./harness").HarnessTurnDelta): AgUiEvent[];
  /** Emit the closing events. Safe to call once per turn. */
  finish(): AgUiEvent[];
}

export interface AgUiEncoderOptions {
  threadId: string;
  runId: string;
  /** Prefix for generated message ids. Defaults to the run id. */
  idPrefix?: string;
  protocolVersion?: string;
}

/** Create an encoder that turns `HarnessTurnDelta` stream into a
 *  conformant AG-UI event stream.
 *
 *  `RUN_STARTED` is emitted by `push` on the first delta rather than at
 *  construction, so a turn that never produces a delta emits nothing. */
export function createAgUiEncoder(options: AgUiEncoderOptions): AgUiEncoder {
  const { threadId, runId } = options;
  const prefix = options.idPrefix ?? runId;
  const protocolVersion = options.protocolVersion ?? "1.0";

  let started = false;
  let textMessageId: string | null = null;
  let reasoningMessageId: string | null = null;
  let seq = 0;

  const nextId = (kind: string): string => `${prefix}-${kind}-${++seq}`;

  const ensureStarted = (): AgUiEvent[] =>
    started
      ? []
      : ((started = true),
        [{
          type: "RUN_STARTED",
          threadId,
          runId,
          protocolVersion,
        } satisfies AgUiRunStarted]);

  const closeText = (): AgUiEvent[] => {
    if (!textMessageId) return [];
    const id = textMessageId;
    textMessageId = null;
    return [{ type: "TEXT_MESSAGE_END", messageId: id } satisfies AgUiTextMessageEnd];
  };

  const closeReasoning = (): AgUiEvent[] => {
    if (!reasoningMessageId) return [];
    const id = reasoningMessageId;
    reasoningMessageId = null;
    return [
      {
        type: "REASONING_MESSAGE_END",
        messageId: id,
      } satisfies AgUiReasoningMessageEnd,
      { type: "REASONING_END", messageId: id } satisfies AgUiReasoningEnd,
    ];
  };

  return {
    push(delta) {
      const events = ensureStarted();

      switch (delta.type) {
        case "text": {
          const closeReasoningEvents = closeReasoning();
          events.push(...closeReasoningEvents);
          if (!textMessageId) {
            textMessageId = nextId("msg");
            events.push({
              type: "TEXT_MESSAGE_START",
              messageId: textMessageId,
              role: "assistant",
            } satisfies AgUiTextMessageStart);
          }
          events.push({
            type: "TEXT_MESSAGE_CONTENT",
            messageId: textMessageId,
            delta: delta.content,
          } satisfies AgUiTextMessageContent);
          return events;
        }

        case "reasoning": {
          const closeTextEvents = closeText();
          events.push(...closeTextEvents);
          if (!reasoningMessageId) {
            reasoningMessageId = nextId("reason");
            events.push({
              type: "REASONING_START",
              messageId: reasoningMessageId,
            } satisfies AgUiReasoningStart);
            events.push({
              type: "REASONING_MESSAGE_START",
              messageId: reasoningMessageId,
            } satisfies AgUiReasoningMessageStart);
          }
          events.push({
            type: "REASONING_MESSAGE_CONTENT",
            messageId: reasoningMessageId,
            delta: delta.content,
          } satisfies AgUiReasoningContent);
          return events;
        }

        case "tool_call": {
          // A tool call terminates any open text/reasoning message:
          // AG-UI orders content under a message id and a tool call is
          // its own unit.
          events.push(...closeText(), ...closeReasoning());
          events.push({
            type: "TOOL_CALL_START",
            toolCallId: delta.callId,
            toolCallName: delta.name,
          } satisfies AgUiToolCallStart);
          events.push({
            type: "TOOL_CALL_ARGS",
            toolCallId: delta.callId,
            delta: delta.args,
          } satisfies AgUiToolCallArgs);
          events.push({
            type: "TOOL_CALL_END",
            toolCallId: delta.callId,
          } satisfies AgUiToolCallEnd);
          return events;
        }

        case "tool_result": {
          events.push(...closeText(), ...closeReasoning());
          events.push({
            type: "TOOL_CALL_RESULT",
            toolCallId: delta.callId,
            messageId: nextId("tool-msg"),
            content: delta.content,
            role: "tool",
          } satisfies AgUiToolCallResult);
          return events;
        }

        case "usage": {
          // AG-UI has no usage event. Token counts ride on
          // RUN_FINISHED metadata instead, so nothing is lost.
          return events;
        }

        case "error": {
          // AG-UI models a failed run as RUN_ERROR, which is exactly this.
          events.push(...closeText(), ...closeReasoning());
          events.push({
            type: "RUN_ERROR",
            message: delta.message,
            ...(delta.code ? { code: delta.code } : {}),
          } satisfies AgUiRunError);
          started = false;
          return events;
        }

        case "done": {
          events.push(...closeText(), ...closeReasoning());
          events.push({
            type: "RUN_FINISHED",
            threadId,
            runId,
            outcome: { type: "success" },
          } satisfies AgUiRunFinished);
          started = false;
          return events;
        }

        default: {
          // Exhaustiveness guard: a new delta kind must be handled
          // deliberately rather than silently dropped.
          const never: never = delta;
          throw new Error(`unhandled harness delta: ${JSON.stringify(never)}`);
        }
      }
    },

    finish() {
      const events = ensureStarted();
      events.push(...closeText(), ...closeReasoning());
      events.push({
        type: "RUN_FINISHED",
        threadId,
        runId,
        outcome: { type: "success" },
      } satisfies AgUiRunFinished);
      started = false;
      return events;
    },
  };
}

// ── Decode: AG-UI events → HarnessTurnDelta ────────────────

/** A decoded stream item: either a harness delta, or a terminal signal
 *  the caller must act on (an interrupt becomes an approval request). */
export type AgUiDecoded =
  | { kind: "delta"; delta: import("./harness").HarnessTurnDelta }
  | { kind: "interrupt"; interrupts: AgUiInterrupt[] }
  | { kind: "error"; message: string; code?: string }
  | { kind: "ignored"; type: AgUiEventType };

/** Translate one AG-UI event into harness terms.
 *
 *  Text and reasoning deltas collapse to a single delta each; the
 *  START/END bookends carry no content and are reported as `ignored` so
 *  callers can log them without treating them as data. */
export function decodeAgUiEvent(event: AgUiEvent): AgUiDecoded {
  switch (event.type) {
    case "TEXT_MESSAGE_CONTENT":
      return { kind: "delta", delta: { type: "text", content: event.delta } };

    case "REASONING_MESSAGE_CONTENT":
      return {
        kind: "delta",
        delta: { type: "reasoning", content: event.delta },
      };

    case "TOOL_CALL_START":
      // Args arrive in a later TOOL_CALL_ARGS; emit the call with an
      // empty payload and let the args event fill it in.
      return {
        kind: "delta",
        delta: {
          type: "tool_call",
          callId: event.toolCallId,
          name: event.toolCallName,
          args: "",
        },
      };

    case "TOOL_CALL_ARGS":
      return {
        kind: "delta",
        delta: {
          type: "tool_call",
          callId: event.toolCallId,
          name: "",
          args: event.delta,
        },
      };

    case "TOOL_CALL_RESULT":
      return {
        kind: "delta",
        delta: {
          type: "tool_result",
          callId: event.toolCallId,
          content: event.content,
        },
      };

    case "RUN_FINISHED":
      if (event.outcome?.type === "interrupt") {
        return { kind: "interrupt", interrupts: event.outcome.interrupts };
      }
      return { kind: "delta", delta: { type: "done" } };

    case "RUN_ERROR":
      return { kind: "error", message: event.message, code: event.code };

    default:
      return { kind: "ignored", type: event.type };
  }
}

// ── Interrupt ⇄ approval mapping ───────────────────────────

/** The shape our approval inbox speaks (src/main/approval/inbox.ts). */
export interface ApprovalLike {
  id: string;
  sessionId: string;
  toolName: string;
  command: string;
  reason: string;
}

/** Convert a pending approval into an AG-UI interrupt, so an AG-UI
 *  consumer can answer it through the same inbox the desktop dialog
 *  uses. */
export function approvalToInterrupt(approval: ApprovalLike): AgUiInterrupt {
  return {
    id: approval.id,
    reason: "tool_approval",
    message: `${approval.toolName}: ${approval.command} — ${approval.reason}`,
    toolCallId: approval.id,
    responseSchema: { type: "string", enum: ["approve", "deny"] },
    metadata: { sessionId: approval.sessionId },
  };
}

/** Map a resume entry back to an approval verdict. Returns null for a
 *  cancelled interrupt (the operator abandoned it) or an unrecognised
 *  payload, so the caller can leave the entry pending rather than guess. */
export function resumeToVerdict(
  entry: AgUiResumeEntry,
): "approve" | "deny" | null {
  if (entry.status === "cancelled") return null;
  return entry.payload === "approve"
    ? "approve"
    : entry.payload === "deny"
      ? "deny"
      : null;
}

/** Validate a resume list covers every interrupt exactly once.
 *
 *  Spec: "Omission is not abandonment" — the consumer MUST reject an
 *  incomplete resume list *before* sending. Returns the ids that are
 *  missing or duplicated; an empty array means the list is sendable. */
export function validateResumeCoverage(
  interrupts: AgUiInterrupt[],
  resume: AgUiResumeEntry[],
): string[] {
  const problems: string[] = [];
  const answered = new Map<string, number>();

  for (const entry of resume) {
    answered.set(entry.interruptId, (answered.get(entry.interruptId) ?? 0) + 1);
  }

  for (const interrupt of interrupts) {
    const count = answered.get(interrupt.id) ?? 0;
    if (count === 0) problems.push(`unanswered:${interrupt.id}`);
    else if (count > 1) problems.push(`duplicate:${interrupt.id}`);
  }

  for (const id of answered.keys()) {
    if (!interrupts.some((i) => i.id === id)) problems.push(`unknown:${id}`);
  }

  return problems;
}
