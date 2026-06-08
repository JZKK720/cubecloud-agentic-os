/**
 * Headroom chat compression — the LLM hot-path hook.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *
 * Background:
 *   `hermes.ts` is the desktop's only LLM chat orchestrator. Every
 *   chat — local Ollama, remote OpenAI, Anthropic, OpenRouter — goes
 *   through the same `sendMessageViaApi` → `finalizePreparedRequest`
 *   → `http.request POST /v1/chat/completions` path. The body that
 *   goes over the wire is a JSON blob with `{ model, messages, stream }`.
 *
 *   This module is the chokepoint we hook into. Right before
 *   `Content-Length` is set on the request, we optionally send the
 *   `messages` array to Headroom's `/v1/compress` endpoint and swap
 *   in the compressed variant. Token savings show up in the chat
 *   usage footer; original messages are retrievable via CCR
 *   (`headroom_retrieve`) if the LLM needs the full context.
 *
 * Design constraints:
 *   - Local Ollama users explicitly opt in: Headroom's audit mode is
 *     essentially free (no transforms, just measurement), and Ollama
 *     can benefit from compression when the user is running on a
 *     small context window (8K, 16K) on modest hardware.
 *   - Streaming responses: we compress SYNCHRONOUSLY before the body
 *     is written to the request, so the SSE stream from the gateway
 *     is unaffected. Headroom's 30s internal compress timeout is
 *     too generous here; we race against a 1.5s budget and degrade
 *     to the original messages if it fires.
 *   - Never throws: the chat path is the most user-visible code in
 *     the app. A Headroom failure must never bubble up as a chat
 *     failure.
 *   - Lives in its own module so the dependencies (`compressMessages`,
 *     `loadHeadroomConfig`, `getHeadroomSidecarStatus`) are mockable
 *     at the import boundary.
 *
 * Usage:
 *   The hook is called once per chat request, right before
 *   `headers["Content-Length"] = String(bodyBuf.length)` in
 *   `hermes.ts#finalizePreparedRequest`. The hook returns the
 *   (possibly compressed) messages array plus a stats block
 *   the caller can attach to the `onUsage` callback.
 */

import { compressMessages, loadHeadroomConfig } from "./headroom";
import { getHeadroomSidecarStatus } from "./headroom-sidecar";

/** OpenAI-shaped chat message. Mirrors the local
 *  `ChatContent`/`{role, content}` shape that hermes.ts
 *  builds. */
export interface HeadroomChatMessage {
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

export interface HeadroomChatCompressResult {
  /** The (possibly compressed) messages to send. */
  messages: HeadroomChatMessage[];
  /** Whether compression was actually applied. */
  compressed: boolean;
  /** Provider target — informs the UI which savings are
   *  attributable to which model. */
  providerHint: string;
  /** Tokens before compression (Headroom's reported count). */
  tokensBefore: number;
  /** Tokens after compression. */
  tokensAfter: number;
  /** 0–100 percentage saved. */
  savingsPercent: number;
  /** Wall-clock latency added by the compress call. Useful
   *  for the audit-mode "no measurable latency hit" check. */
  compressMs: number;
  /** Reason compression was skipped, if any. Null on success
   *  or when compression was applied. */
  skipReason: string | null;
  /** Underlying error from the compress call, if any. */
  error: string | null;
}

/** Per-call timeout for the chat compression path. Shorter
 *  than the generic 30s compress timeout because the user is
 *  waiting for a streaming response; if Headroom takes more
 *  than 1.5s we degrade to the original messages. Tuned to
 *  be just under typical LLM TTFB so the user doesn't notice
 *  the extra round-trip. */
export const CHAT_COMPRESS_TIMEOUT_MS = 1_500;

/** Don't compress trivially short conversations. Below this
 *  many messages (or this many estimated tokens) the
 *  round-trip cost outweighs the savings. */
export const MIN_MESSAGES_TO_COMPRESS = 2;

/** Compress a chat `messages` array through Headroom, with
 *  Ollama-aware defaults. `providerHint` is a label for the
 *  renderer's usage footer — it doesn't change compression
 *  behavior, but it makes the savings attribution honest
 *  when the user is on a local model. */
export async function compressForChat(
  messages: HeadroomChatMessage[],
  options: {
    model?: string;
    providerHint?: string;
  } = {},
): Promise<HeadroomChatCompressResult> {
  const startedAt = Date.now();
  const providerHint = options.providerHint ?? "openai";

  const fallback: HeadroomChatCompressResult = {
    messages,
    compressed: false,
    providerHint,
    tokensBefore: 0,
    tokensAfter: 0,
    savingsPercent: 0,
    compressMs: 0,
    skipReason: null,
    error: null,
  };

  // Gate 1: too few messages to be worth compressing.
  if (messages.length < MIN_MESSAGES_TO_COMPRESS) {
    return { ...fallback, skipReason: "too-few-messages" };
  }

  // Gate 2: config must be enabled.
  const cfg = await loadHeadroomConfig(process.env.HERMES_HOME ?? "");
  if (!cfg.enabled) {
    return { ...fallback, skipReason: "headroom-disabled" };
  }

  // Gate 3: sidecar must be running.
  const sidecar = getHeadroomSidecarStatus();
  if (sidecar.state !== "running") {
    return { ...fallback, skipReason: "sidecar-not-running" };
  }

  // Compress with a tight 1.5s budget via Promise.race. The
  // .catch converts rejections to null so the timeout path
  // and the error path can share the same fallback.
  const compressCall = compressMessages(
    cfg,
    messages,
    options.model,
  ).catch(() => null);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), CHAT_COMPRESS_TIMEOUT_MS),
  );
  const result = await Promise.race([compressCall, timeout]);

  const compressMs = Date.now() - startedAt;

  if (!result || !result.success) {
    return {
      ...fallback,
      compressMs,
      error: result?.error ?? "compress-failed-or-timeout",
    };
  }

  if (!result.compressed) {
    // Proxy is up but no compression was applied (e.g. the
    // payload was already minimal). Not an error.
    return {
      ...fallback,
      compressMs,
      skipReason: "no-compression-applied",
    };
  }

  return {
    messages: result.messages as HeadroomChatMessage[],
    compressed: true,
    providerHint,
    tokensBefore: result.tokensBefore,
    tokensAfter: result.tokensAfter,
    savingsPercent: result.savingsPercent,
    compressMs,
    skipReason: null,
    error: null,
  };
}

/** Best-effort: does the current connection look like a local
 *  Ollama (or Ollama-compatible) endpoint? Used by callers
 *  to surface "compressed: −X% on local Ollama" in the UI
 *  and to decide whether to bother the user with a
 *  compression prompt on first launch.
 *
 *  Detection: any provider in `OPENAI_COMPAT_PROVIDERS`
 *  whose identifier contains "ollama" — the desktop's
 *  `models.json` convention. We don't try to ping the
 *  endpoint; the caller passes the resolved model config
 *  in. */
export function isOllamaLikeProvider(providerId: string | null | undefined): boolean {
  if (!providerId) return false;
  const p = providerId.toLowerCase();
  return p === "ollama" || p === "llamacpp" || p === "lmstudio" || p === "vllm";
}
