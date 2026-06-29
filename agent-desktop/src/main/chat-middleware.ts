// chat-middleware.ts — orchestration-level middleware chain for the chat hot path.
//
// Inspired by DeerFlow 2.0's middleware chain (before_agent / before_model /
// after_model), adapted to the Cubecloud Agent Desktop's "command center"
// positioning: the desktop pre/post-processes the conversation; the runtime
// executes. The desktop never spawns sub-agents or touches a sandbox.
//
// The chain plugs into hermes.ts#finalizePreparedRequest (before_model) and
// the streaming response completion (after_model). Each middleware is a
// pure async function — no side effects beyond its declared contract.
//
// Current middlewares:
//   before_model:
//     1. headroomCompress  — compress messages via Headroom (existing, extracted)
//     2. runtimeRoute      — inspect message; hint at runtime routing
//
//   after_model:
//     3. reflection       — critique the response for quality (opt-in)
//     4. memoryExtract     — extract key facts → EverOS (future)
//     5. titleGenerate    — auto-title the conversation (future)
//
// Design constraints:
//   - Each middleware degrades gracefully: on error, it returns the input
//     unchanged. The chat path must never break because a middleware failed.
//   - before_model middlewares run synchronously in sequence before
//     Content-Length is set (same constraint as the existing Headroom hook).
//   - after_model middlewares run after the streaming response completes;
//     they must not block the user-visible response.
//   - The chain is configurable: middlewares can be enabled/disabled via
//     settings. The Headroom middleware respects the existing Headroom config;
//     the reflection middleware has its own opt-in toggle.

import { compressMessages, loadHeadroomConfig } from "./headroom";
import { getHeadroomSidecarStatus } from "./headroom-sidecar";

// ── Types ─────────────────────────────────────────────────

/** A chat message in the OpenAI-compatible shape the desktop uses internally. */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

/** Context passed to every before_model middleware. */
export interface BeforeModelContext {
  /** The messages array (mutable — middlewares may replace it). */
  messages: ChatMessage[];
  /** The selected model name. */
  model: string;
  /** The provider hint (e.g. "openai", "local:ollama"). */
  providerHint: string;
  /** The Hermes home directory (for config reads). */
  hermesHome: string;
}

/** Context passed to every after_model middleware. */
export interface AfterModelContext {
  /** The user's original message content. */
  userContent: string;
  /** The assistant's response text (accumulated from streaming). */
  responseText: string;
  /** The selected model name. */
  model: string;
  /** The provider hint. */
  providerHint: string;
  /** The Hermes home directory. */
  hermesHome: string;
}

/** Result of a before_model middleware. */
export interface BeforeModelResult {
  /** The (possibly modified) messages. */
  messages: ChatMessage[];
  /** Whether this middleware applied a transformation. */
  applied: boolean;
  /** Human-readable label for stats/debugging. */
  label: string;
  /** Optional stats block (e.g. Headroom token savings). */
  stats?: Record<string, unknown>;
}

/** Result of an after_model middleware. */
export interface AfterModelResult {
  /** Whether this middleware ran successfully. */
  applied: boolean;
  /** Human-readable label. */
  label: string;
  /** Optional output (e.g. reflection critique, extracted memory). */
  output?: string;
  /** Optional stats. */
  stats?: Record<string, unknown>;
}

/** A before_model middleware function. */
export type BeforeModelMiddleware = (
  ctx: BeforeModelContext,
) => Promise<BeforeModelResult>;

/** An after_model middleware function. */
export type AfterModelMiddleware = (
  ctx: AfterModelContext,
) => Promise<AfterModelResult>;

// ── Middleware 1: Headroom compress (before_model) ─────────

/** Per-call timeout for chat compression. Same as the existing hook. */
const CHAT_COMPRESS_TIMEOUT_MS = 1_500;

/** Minimum messages before compression is worth attempting. */
const MIN_MESSAGES_TO_COMPRESS = 4;

export const headroomCompressMiddleware: BeforeModelMiddleware = async (
  ctx,
) => {
  const { messages } = ctx;

  // Gate 1: no non-text content (Headroom can't handle image arrays).
  const hasNonTextContent = messages.some(
    (m) => m.content !== null && typeof m.content !== "string",
  );
  if (hasNonTextContent) {
    return { messages, applied: false, label: "headroom:skip(non-text)" };
  }

  // Gate 2: too few messages to be worth compressing.
  if (messages.length < MIN_MESSAGES_TO_COMPRESS) {
    return { messages, applied: false, label: "headroom:skip(too-few)" };
  }

  try {
    const cfg = await loadHeadroomConfig(ctx.hermesHome);
    if (!cfg.enabled) {
      return { messages, applied: false, label: "headroom:skip(disabled)" };
    }

    const sidecar = getHeadroomSidecarStatus();
    if (sidecar.status !== "running") {
      return { messages, applied: false, label: "headroom:skip(no-sidecar)" };
    }

    const headroomInput = messages.map((m) => ({
      role: m.role,
      content: (m.content as string) ?? "",
    }));

    // compressMessages signature: (cfg: HeadroomConfig, messages, model?)
    // We already loaded cfg above via loadHeadroomConfig.
    const result = await compressMessages(cfg, headroomInput, ctx.model);

    if (!result.compressed) {
      return {
        messages,
        applied: false,
        label: `headroom:skip(${result.error ?? "no-savings"})`,
      };
    }

    const compressed: ChatMessage[] = result.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    return {
      messages: compressed,
      applied: true,
      label: "headroom:compressed",
      stats: {
        tokensBefore: result.tokensBefore,
        tokensAfter: result.tokensAfter,
        savingsPercent: result.savingsPercent,
        compressMs: result.compressMs,
      },
    };
  } catch {
    // Headroom failure must never break the chat path.
    return { messages, applied: false, label: "headroom:error" };
  }
};

// ── Middleware 2: Runtime routing (before_model) ───────────
//
// This middleware inspects the message and sets a routing hint.
// It does NOT change the runtime — the actual routing decision
// is made by hermes.ts based on the active runtime provider. This
// middleware just annotates the context so downstream code (and
// the renderer) can show "routed to IronClaw for sandboxed execution"
// when the message contains code-execution intent.
//
// For now this is a no-op annotation pass; the actual routing
// logic will be wired when the TaskOrchestrator engine is built.

export const runtimeRouteMiddleware: BeforeModelMiddleware = async (ctx) => {
  // No transformation — just pass through. The routing hint is
  // computed but not yet consumed. This is the insertion point
  // for future capability-based routing.
  return { messages: ctx.messages, applied: false, label: "route:pass" };
};

// ── Middleware 3: Reflection (after_model) ─────────────────
//
// Runs a second LLM pass that critiques the response for accuracy,
// completeness, and coherence. Opt-in via the reflectionEnabled
// setting. Budget: 1 extra LLM call per response.
//
// The LLM call is injected via `critiqueFn` so tests can mock it.
// In production, the caller wires it to a non-streaming POST to the
// active runtime gateway's /v1/chat/completions endpoint with a
// critique system prompt. The middleware itself is runtime-agnostic;
// it just calls the injected function and reports the result.

export interface ReflectionConfig {
  enabled: boolean;
}

/** Injected function: given the user's question and the assistant's
 *  response, return a critique string. In production this makes a
 *  non-streaming LLM call with a critique system prompt. */
export type CritiqueFn = (
  userContent: string,
  responseText: string,
  model: string,
) => Promise<string>;

/** Default critique system prompt. Instructs the LLM to evaluate
 *  the response for accuracy, completeness, and coherence, and
 *  return a concise verdict. */
export const REFLECTION_SYSTEM_PROMPT = `You are a quality reviewer. Evaluate the assistant's response for:
1. Accuracy — Are the facts correct?
2. Completeness — Does it address the user's full question?
3. Coherence — Is it well-structured and clear?

Return a concise verdict in 2-3 sentences. If the response is good, say "PASS: <reason>". If deficient, say "ISSUE: <what's wrong>". Do not rewrite the response.`;

/** Create a reflection middleware with an injected critique function.
 *  If no critiqueFn is provided, the middleware runs but produces a
 *  "no-critique-fn" label — this is the production-safe default when
 *  the caller hasn't wired the LLM call yet. */
export function createReflectionMiddleware(
  config: ReflectionConfig,
  critiqueFn?: CritiqueFn,
): AfterModelMiddleware {
  return async (ctx) => {
    if (!config.enabled) {
      return { applied: false, label: "reflection:skip(disabled)" };
    }

    if (!critiqueFn) {
      return {
        applied: false,
        label: "reflection:skip(no-critique-fn)",
        stats: { responseLength: ctx.responseText.length },
      };
    }

    try {
      const critique = await critiqueFn(
        ctx.userContent,
        ctx.responseText,
        ctx.model,
      );
      return {
        applied: true,
        label: "reflection:done",
        output: critique,
        stats: {
          responseLength: ctx.responseText.length,
          critiqueLength: critique.length,
        },
      };
    } catch (err) {
      // Reflection failure must never break the chat path.
      return {
        applied: false,
        label: "reflection:error",
        stats: {
          responseLength: ctx.responseText.length,
          error: (err as Error).message.slice(0, 200),
        },
      };
    }
  };
}

// ── Chain runner ────────────────────────────────────────────

/** Run all before_model middlewares in sequence. */
export async function runBeforeModelChain(
  ctx: BeforeModelContext,
  middlewares: BeforeModelMiddleware[],
): Promise<{ messages: ChatMessage[]; results: BeforeModelResult[] }> {
  let messages = ctx.messages;
  const results: BeforeModelResult[] = [];

  for (const mw of middlewares) {
    try {
      const result = await mw({ ...ctx, messages });
      messages = result.messages;
      results.push(result);
    } catch {
      // Middleware failure must never break the chat path.
      results.push({
        messages,
        applied: false,
        label: `${mw.name ?? "middleware"}:error`,
      });
    }
  }

  return { messages, results };
}

/** Run all after_model middlewares in sequence (non-blocking). */
export async function runAfterModelChain(
  ctx: AfterModelContext,
  middlewares: AfterModelMiddleware[],
): Promise<AfterModelResult[]> {
  const results: AfterModelResult[] = [];

  for (const mw of middlewares) {
    try {
      const result = await mw(ctx);
      results.push(result);
    } catch {
      results.push({
        applied: false,
        label: `${mw.name ?? "middleware"}:error`,
      });
    }
  }

  return results;
}

// ── Default chain factory ───────────────────────────────────

/** Build the default before_model chain for the desktop. */
export function createBeforeModelChain(): BeforeModelMiddleware[] {
  return [headroomCompressMiddleware, runtimeRouteMiddleware];
}

/** Build the default after_model chain for the desktop.
 *  The optional `critiqueFn` wires the reflection LLM call. When
 *  omitted, the reflection middleware self-skips with "no-critique-fn". */
export function createAfterModelChain(
  reflectionConfig: ReflectionConfig,
  critiqueFn?: CritiqueFn,
): AfterModelMiddleware[] {
  return [createReflectionMiddleware(reflectionConfig, critiqueFn)];
}