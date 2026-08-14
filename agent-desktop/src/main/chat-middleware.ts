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
    if (sidecar.state !== "running") {
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
      },
    };
  } catch {
    // Headroom failure must never break the chat path.
    return { messages, applied: false, label: "headroom:error" };
  }
};

// ── Middleware 2: Runtime routing (before_model) ───────────
//
// This middleware inspects the message and resolves the active
// runtime provider via the harness registry. It annotates the
// context with the routing decision so downstream code (and the
// renderer) can show "routed to IronClaw for sandboxed execution"
// when the provider changes.
//
// The actual turn dispatch still goes through hermes.ts — this
// middleware just surfaces the routing decision in the middleware
// stats. When P1 is fully wired, the HarnessRouter will be the
// actual dispatch layer.

import type { HarnessRegistry } from "./harnesses/registry";

/** Create a runtime routing middleware that uses the harness registry.
 *  When no registry is provided, falls back to the no-op pass-through. */
export function createRuntimeRouteMiddleware(
  registry?: HarnessRegistry,
): BeforeModelMiddleware {
  return async (ctx) => {
    if (!registry) {
      return {
        messages: ctx.messages,
        applied: false,
        label: "route:pass",
      };
    }

    try {
      // Resolve the active provider for a synthetic session id.
      // In the middleware context we don't have the real session id,
      // but the resolver reads from config (not per-session), so any
      // id works.
      const providerId = await registry.resolve("middleware");
      return {
        messages: ctx.messages,
        applied: true,
        label: `route:${providerId}`,
        stats: { routedTo: providerId },
      };
    } catch {
      return {
        messages: ctx.messages,
        applied: false,
        label: "route:error",
      };
    }
  };
}

/** The default no-op middleware (backward compatibility). */
export const runtimeRouteMiddleware: BeforeModelMiddleware =
  createRuntimeRouteMiddleware();

// ── Middleware 3: Compaction (before_model) ────────────────
//
// Uses P5 auto-compaction to summarize old conversation entries when
// the context approaches the model's token budget. Keeps recent
// entries as-is; replaces old entries with a context_summary.
// Degrades gracefully: if compaction is not needed or fails, the
// messages pass through unchanged.

import {
  shouldCompact,
  estimateTokens,
  extractWorkingState,
  pickBoundary,
  type TurnEntry,
} from "@cubecloud/platform-core";

/** Default token budget if model info is unavailable. */
const DEFAULT_TOKEN_BUDGET = 128_000;

export function createCompactionMiddleware(
  summaryFn?: (entries: TurnEntry[]) => Promise<string>,
): BeforeModelMiddleware {
  return async (ctx) => {
    const { messages } = ctx;
    if (messages.length < 6) {
      return { messages, applied: false, label: "compaction:skip(too-short)" };
    }

    // Convert ChatMessage[] to TurnEntry[] for the compaction module
    const history: TurnEntry[] = messages
      .filter((m) => m.content && m.role !== "system")
      .map((m) => ({
        role: m.role as TurnEntry["role"],
        content: m.content!,
        timestamp: Date.now(),
      }));

    // Estimate budget from model name (rough heuristic)
    const budget = ctx.model.includes("128k") ? 128_000
      : ctx.model.includes("200k") ? 200_000
      : ctx.model.includes("1m") || ctx.model.includes("1000k") ? 1_000_000
      : DEFAULT_TOKEN_BUDGET;

    if (!shouldCompact(history, budget)) {
      return { messages, applied: false, label: "compaction:skip(below-threshold)" };
    }

    try {
      const boundary = pickBoundary(history, budget);
      if (boundary <= 0) {
        return { messages, applied: false, label: "compaction:skip(no-boundary)" };
      }

      const workingState = extractWorkingState(history);
      const oldEntries = history.slice(0, boundary);
      const recentEntries = history.slice(boundary);

      // Build summary — use provided summaryFn or mechanical extraction
      let summary: string;
      if (summaryFn) {
        summary = await summaryFn(oldEntries);
      } else {
        // Mechanical summary (no LLM call) — just list working state
        const parts: string[] = ["[Context Summary]"];
        if (workingState.pendingTodos.length > 0) {
          parts.push(`Pending: ${workingState.pendingTodos.map((t) => `[ ] ${t}`).join(", ")}`);
        }
        if (workingState.activeFiles.length > 0) {
          parts.push(`Files: ${workingState.activeFiles.join(", ")}`);
        }
        parts.push(`Compacted ${oldEntries.length} entries.`);
        summary = parts.join("\n");
      }

      // Rebuild messages: system + summary + recent entries
      const systemMsgs = messages.filter((m) => m.role === "system");
      const compacted: ChatMessage[] = [
        ...systemMsgs,
        { role: "user", content: summary },
        ...recentEntries.map((e) => ({
          role: e.role as ChatMessage["role"],
          content: e.content,
        })),
      ];

      const tokensBefore = history.reduce((s, e) => s + estimateTokens(e.content), 0);
      const tokensAfter = compacted.reduce((s, m) => s + estimateTokens(m.content ?? ""), 0);

      return {
        messages: compacted,
        applied: true,
        label: "compaction:applied",
        stats: {
          tokensBefore,
          tokensAfter,
          entriesCompacted: oldEntries.length,
        },
      };
    } catch {
      return { messages, applied: false, label: "compaction:error" };
    }
  };
}

// ── Middleware 4: Memory inject (before_model) ─────────────
//
// Uses P4 memory service to recall relevant facts and inject them
// into the system prompt. This gives the agent persistent memory
// across conversations without modifying the gateway.
// Degrades gracefully: if no memories or service unavailable, passes through.

export function createMemoryInjectMiddleware(
  recallFn?: () => Array<{ content: string; label: string }>,
): BeforeModelMiddleware {
  return async (ctx) => {
    if (!recallFn) {
      return { messages: ctx.messages, applied: false, label: "memory:skip(no-recall-fn)" };
    }

    try {
      const memories = recallFn();
      if (memories.length === 0) {
        return { messages: ctx.messages, applied: false, label: "memory:skip(empty)" };
      }

      // Build a memory context block to prepend to the system message
      const memoryBlock = memories
        .map((m) => `- ${m.content}`)
        .join("\n");
      const memoryPrefix = `[Persistent Memory]\n${memoryBlock}\n[/Persistent Memory]\n\n`;

      const messages = ctx.messages.map((m) => {
        if (m.role === "system" && m.content) {
          return { ...m, content: memoryPrefix + m.content };
        }
        return m;
      });

      // If no system message, prepend one
      if (!messages.some((m) => m.role === "system")) {
        messages.unshift({ role: "system", content: memoryPrefix.trim() });
      }

      return {
        messages,
        applied: true,
        label: "memory:injected",
        stats: { memoryCount: memories.length },
      };
    } catch {
      return { messages: ctx.messages, applied: false, label: "memory:error" };
    }
  };
}

// ── Middleware 5: Tool policy screen (before_model) ────────
//
// Uses P3 tool policy to screen the user's message for commands that
// require approval or should be denied. Does NOT block the message —
// just annotates the context so the after_model chain or the approval
// inbox can act on it. Degrades gracefully.

import {
  createCommandPolicy,
  scannableCommand,
  type CommandPolicyRule,
} from "@cubecloud/platform-core";

/** Default tool policy rules for the desktop. */
const DEFAULT_TOOL_POLICY_RULES: CommandPolicyRule[] = [
  // Deny destructive shell commands
  { pattern: /\brm\s+-rf\s+\//i, decision: "deny", label: "deny:rm-rf-root" },
  { pattern: /\bmkfs\./i, decision: "deny", label: "deny:mkfs" },
  { pattern: /\bdd\s+if=.*of=\/dev\//i, decision: "deny", label: "deny:dd-to-device" },
  // Require approval for package installs
  { pattern: /\bnpm\s+install\b|\bpip\s+install\b|\bapt\s+install\b/i, decision: "require_approval", label: "approve:package-install" },
  // Require approval for git push
  { pattern: /\bgit\s+push\b/i, decision: "require_approval", label: "approve:git-push" },
  // Require approval for network operations
  { pattern: /\bcurl\s+.*\|\s*(bash|sh)\b/i, decision: "require_approval", label: "approve:curl-pipe" },
];

export function createToolPolicyMiddleware(
  customRules?: CommandPolicyRule[],
): BeforeModelMiddleware {
  const policy = createCommandPolicy(customRules ?? DEFAULT_TOOL_POLICY_RULES);

  return async (ctx) => {
    const lastUserMsg = [...ctx.messages].reverse().find((m) => m.role === "user" && m.content);
    if (!lastUserMsg?.content) {
      return { messages: ctx.messages, applied: false, label: "tool-policy:skip(no-user-msg)" };
    }

    try {
      // Scan the user message (including embedded commands) for policy violations
      const scannable = scannableCommand(lastUserMsg.content);
      const result = policy.evaluate(scannable);

      if (result.decision === "allow") {
        return { messages: ctx.messages, applied: false, label: "tool-policy:allow" };
      }

      // Annotate the context — don't block, just report
      return {
        messages: ctx.messages,
        applied: true,
        label: `tool-policy:${result.decision}:${result.label}`,
        stats: {
          decision: result.decision,
          rule: result.label,
        },
      };
    } catch {
      return { messages: ctx.messages, applied: false, label: "tool-policy:error" };
    }
  };
}

// ── Middleware 6: Reflection (after_model) ─────────────────
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

/** Build the default before_model chain for the desktop.
 *  When a harness registry is provided, the runtimeRoute middleware
 *  resolves the active provider and annotates the context.
 *
 *  Chain order (each step degrades gracefully):
 *  1. tool-policy     — screen user message for dangerous/approval-needing commands
 *  2. memory-inject   — inject persistent memories into system prompt
 *  3. headroom        — compress context via Headroom sidecar
 *  4. compaction      — summarize old entries when near token budget
 *  5. runtime-route   — resolve active runtime/provider
 */
export function createBeforeModelChain(
  registry?: HarnessRegistry,
  options?: {
    memoryRecallFn?: () => Array<{ content: string; label: string }>;
    compactionSummaryFn?: (entries: TurnEntry[]) => Promise<string>;
    toolPolicyRules?: CommandPolicyRule[];
  },
): BeforeModelMiddleware[] {
  return [
    createToolPolicyMiddleware(options?.toolPolicyRules),
    createMemoryInjectMiddleware(options?.memoryRecallFn),
    headroomCompressMiddleware,
    createCompactionMiddleware(options?.compactionSummaryFn),
    createRuntimeRouteMiddleware(registry),
  ];
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