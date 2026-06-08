export type {
  Attachment,
  AttachmentKind,
} from "../../../../shared/attachments";

import type { Attachment } from "../../../../shared/attachments";

/**
 * Visible chat bubble (user or assistant). Used for live streaming and as
 * one of the variants of the broader `ChatMessage` history union.
 */
export interface ChatBubbleMessage {
  id: string;
  kind?: "user" | "assistant"; // optional for backward compat; absent ⇒ user/assistant by role
  role: "user" | "agent";
  content: string;
  attachments?: Attachment[];
}

/**
 * Sub-row attached to an assistant turn, surfaced as a collapsible widget
 * in the chat transcript. Created by the main-process session loader from
 * the agent's state DB (`reasoning*` / `tool_calls` / `role='tool'` rows)
 * — none of these have a live-streaming counterpart in the desktop yet.
 */
export interface ReasoningMessage {
  id: string;
  kind: "reasoning";
  role: "agent";
  text: string;
}

export interface ToolCallMessage {
  id: string;
  kind: "tool_call";
  role: "agent";
  callId: string;
  name: string;
  args: string;
}

export interface ToolResultMessage {
  id: string;
  kind: "tool_result";
  role: "agent";
  callId: string;
  name: string;
  content: string;
  attachments?: Attachment[];
}

export type ChatMessage =
  | ChatBubbleMessage
  | ReasoningMessage
  | ToolCallMessage
  | ToolResultMessage;

export interface ModelGroup {
  provider: string;
  providerLabel: string;
  models: {
    provider: string;
    model: string;
    label: string;
    baseUrl: string;
  }[];
}

export interface UsageState {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  /** Headroom compression stats for the most recent turn
   *  where compression was applied or attempted. Undefined
   *  when Headroom is disabled, the sidecar isn't running,
   *  the conversation is too short, or the compress call
   *  timed out. Carries `providerHint` so local Ollama /
   *  vLLM / LM Studio users see "−X% on local Ollama"
   *  in the chat usage footer. */
  headroom?: {
    compressed: boolean;
    tokensBefore: number;
    tokensAfter: number;
    savingsPercent: number;
    compressMs: number;
    providerHint: string;
    skipReason?: string;
    error?: string;
  };
}
