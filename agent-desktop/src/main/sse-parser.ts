/**
 * Extracted SSE parsing logic — testable without Electron or HTTP.
 */

export interface ParsedUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
}

export interface SseCallbacks {
  onChunk: (text: string) => void;
  onToolProgress?: (tool: string) => void;
  onUsage?: (usage: ParsedUsage) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
}

/** Tool progress pattern: `emoji tool_name` or `emoji description` */
const toolProgressRe = /^`([^\s`]+)\s+([^`]+)`$/;

/**
 * Process a custom SSE event (e.g. hermes.tool.progress).
 * Returns true if the event was handled.
 */
export function processCustomEvent(
  eventType: string,
  data: string,
  cb: Pick<SseCallbacks, "onToolProgress">,
): boolean {
  if (eventType === "hermes.tool.progress" && cb.onToolProgress) {
    try {
      const payload = JSON.parse(data);
      const label = payload.label || payload.tool || "";
      const emoji = payload.emoji || "";
      cb.onToolProgress(emoji ? `${emoji} ${label}` : label);
      return true;
    } catch {
      /* malformed — skip */
    }
  }
  return false;
}

export interface SseDataResult {
  done: boolean;
  hasContent: boolean;
  error?: string;
}

/** Wire dialects this parser can consume. */
export type SseDialect = "openai" | "ag-ui";

/**
 * Process one AG-UI event payload.
 *
 * AG-UI is a *typed event* protocol, not an OpenAI-shaped chunk stream:
 * each SSE `data:` line is one complete event object with a `type`
 * discriminator. The mapping to `SseCallbacks` is deliberately lossless
 * where the callback can express it:
 *
 *   TEXT_MESSAGE_CONTENT      -> onChunk(delta)
 *   REASONING_MESSAGE_CONTENT -> onToolProgress("reasoning")
 *   TOOL_CALL_START           -> onToolProgress(name)
 *   TOOL_CALL_RESULT          -> onToolProgress("tool result")
 *   RUN_FINISHED              -> onDone()
 *   RUN_ERROR                 -> onError(message)
 *
 * `RUN_FINISHED.outcome.type === "interrupt"` is surfaced through
 * `interrupts` so the caller can route it to the approval inbox rather
 * than treating the run as cleanly complete.
 */
export function processAgUiData(
  data: string,
  cb: SseCallbacks,
  state: { hasContent: boolean; lastError: string },
): SseDataResult & { interrupts?: unknown[]; type?: string } {
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(data) as Record<string, unknown>;
  } catch {
    /* malformed chunk — skip */
    return { done: false, hasContent: state.hasContent };
  }

  const type = typeof event.type === "string" ? event.type : "";

  switch (type) {
    case "TEXT_MESSAGE_CONTENT": {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (delta) {
        state.hasContent = true;
        cb.onChunk(delta);
      }
      return { done: false, hasContent: state.hasContent, type };
    }

    case "REASONING_MESSAGE_CONTENT":
      cb.onToolProgress?.("reasoning");
      return { done: false, hasContent: state.hasContent, type };

    case "TOOL_CALL_START":
      cb.onToolProgress?.(
        typeof event.toolCallName === "string" ? event.toolCallName : "tool",
      );
      return { done: false, hasContent: state.hasContent, type };

    case "TOOL_CALL_RESULT":
      cb.onToolProgress?.("tool result");
      return { done: false, hasContent: state.hasContent, type };

    case "RUN_ERROR": {
      const message =
        typeof event.message === "string" ? event.message : "run failed";
      state.lastError = message;
      cb.onError?.(message);
      return { done: false, hasContent: state.hasContent, error: message, type };
    }

    case "RUN_FINISHED": {
      const outcome = event.outcome as { type?: string; interrupts?: unknown[] } | undefined;
      if (outcome?.type === "interrupt") {
        // The run ended waiting for the operator. Not an error, and not
        // a clean done either — hand the interrupts to the caller.
        return {
          done: false,
          hasContent: state.hasContent,
          interrupts: outcome.interrupts ?? [],
          type,
        };
      }
      if (state.hasContent) cb.onDone?.();
      return { done: true, hasContent: state.hasContent, type };
    }

    default:
      // START/END bookends, STATE_*, ACTIVITY_*, SUBAGENT_*, RAW,
      // CUSTOM — carried by the protocol but not meaningful to the
      // text-streaming callbacks.
      return { done: false, hasContent: state.hasContent, type };
  }
}

/**
 * Process a single SSE data payload (after `data: ` prefix is stripped).
 * Returns parsing result.
 *
 * `dialect` selects the wire shape. The default stays `"openai"` so every
 * existing caller is untouched.
 */
export function processSseData(
  data: string,
  cb: SseCallbacks,
  state: { hasContent: boolean; lastError: string },
  dialect: SseDialect = "openai",
): SseDataResult {
  if (dialect === "ag-ui") {
    return processAgUiData(data, cb, state);
  }

  if (data === "[DONE]") {
    if (state.hasContent) {
      cb.onDone?.();
    }
    return { done: true, hasContent: state.hasContent, error: state.lastError };
  }

  try {
    const parsed = JSON.parse(data);

    // Capture error responses forwarded through SSE
    if (parsed.error) {
      state.lastError = parsed.error.message || JSON.stringify(parsed.error);
      return { done: false, hasContent: state.hasContent };
    }

    const delta = parsed.choices?.[0]?.delta;

    // Extract usage from final chunk
    if (parsed.usage && cb.onUsage) {
      cb.onUsage({
        promptTokens: parsed.usage.prompt_tokens || 0,
        completionTokens: parsed.usage.completion_tokens || 0,
        totalTokens: parsed.usage.total_tokens || 0,
        cost: parsed.usage.cost,
        rateLimitRemaining: parsed.usage.rate_limit_remaining,
        rateLimitReset: parsed.usage.rate_limit_reset,
      });
    }

    if (delta?.content) {
      const content = delta.content.trim();
      // Legacy: Detect tool progress lines injected into content
      const match = toolProgressRe.exec(content);
      if (match && cb.onToolProgress) {
        cb.onToolProgress(`${match[1]} ${match[2]}`);
      } else {
        state.hasContent = true;
        cb.onChunk(delta.content);
      }
    }
  } catch {
    /* malformed chunk — skip */
  }

  return { done: false, hasContent: state.hasContent };
}

/**
 * Parse a full SSE block (may contain `event:` and `data:` lines).
 * Returns { eventType, data } or null if no data line found.
 */
export function parseSseBlock(
  block: string,
): { eventType: string; data: string } | null {
  let eventType = "";
  let dataLine = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      dataLine = line.slice(6);
    }
  }
  if (!dataLine) return null;
  return { eventType, data: dataLine };
}
