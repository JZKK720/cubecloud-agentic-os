/**
 * Headroom bundle compression — CodeGraph → Headroom pipeline.
 *
 * Cubecloud-original work (2026). Distributed under the inherited
 * MIT license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for
 * the per-path provenance breakdown.
 *
 * SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
 *
 * Background:
 *   When the user builds a CodeGraph context bundle and clicks
 *   "Use in chat", the raw markdown is attached as a `text-file`
 *   attachment. If the Headroom proxy is running, we want to
 *   compress that bundle first — same pipeline that Headroom
 *   uses for tool outputs, but applied to a single large
 *   markdown blob.
 *
 *   This module is a thin best-effort wrapper. It:
 *     1. Skips bundles below MIN_BUNDLE_BYTES (the round-trip
 *        cost of the HTTP call isn't worth the savings).
 *     2. Skips when the user hasn't enabled Headroom or the
 *        sidecar isn't running.
 *     3. Skips when the proxy times out or returns no
 *        compression.
 *     4. Never throws — always degrades to the original bundle.
 *
 *   The function lives in its own module so the dependencies
 *   (`compressMessages`, `loadHeadroomConfig`,
 *   `getHeadroomSidecarStatus`) are mockable at the import
 *   boundary. Putting this in `headroom.ts` would make the
 *   function immune to `vi.mock` because it shares the same
 *   module scope as its dependencies.
 */

import {
  compressMessages,
  loadHeadroomConfig,
} from "./headroom";
import { getHeadroomSidecarStatus } from "./headroom-sidecar";

/** Result of compressing a CodeGraph context bundle through
 *  Headroom. `compressed === true` means the returned
 *  `context` is smaller than the input; on any failure path
 *  the original is returned with `compressed: false` and
 *  `error` set. The caller (buildCodeGraphContext) attaches
 *  this to the IPC payload so the renderer can show
 *  "compressed: 8.2K → 2.1K tokens (−74%)" in the UI. */
export interface HeadroomBundleCompressResult {
  context: string;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  error: string | null;
}

/** Maximum bundle size we'll attempt to compress, in bytes.
 *  Below this threshold the round-trip cost of the Headroom
 *  HTTP call is not worth the token savings, so we skip it
 *  and return the original. Tuned to roughly 4KB of text —
 *  a typical CodeGraph context bundle for a small repo. */
export const MIN_BUNDLE_BYTES = 4096;

/** Per-call timeout for the bundle compression path. Shorter
 *  than the generic 30s compress timeout because the user is
 *  staring at a "Use in chat" button; if Headroom takes more
 *  than 2s we degrade to the original bundle. */
export const BUNDLE_COMPRESS_TIMEOUT_MS = 2_000;

/** Compress a CodeGraph context bundle through Headroom.
 *  Gracefully degrades to the original on any failure path
 *  (proxy not running, not enabled, timeout, network error)
 *  so the caller never has to handle an exception. */
export async function compressCodeGraphBundle(
  bundle: string,
): Promise<HeadroomBundleCompressResult> {
  const original = bundle;
  const originalSize = new TextEncoder().encode(bundle).length;
  const fallback: HeadroomBundleCompressResult = {
    context: original,
    compressed: false,
    originalSize,
    compressedSize: originalSize,
    savingsPercent: 0,
    error: null,
  };

  // Gate 1: bundle is too small to be worth compressing.
  if (originalSize < MIN_BUNDLE_BYTES) {
    return fallback;
  }

  // Gate 2: config must be enabled and sidecar must be running.
  const cfg = await loadHeadroomConfig(process.env.HERMES_HOME ?? "");
  if (!cfg.enabled) {
    return fallback;
  }
  const sidecar = getHeadroomSidecarStatus();
  if (sidecar.state !== "running") {
    return fallback;
  }

  // Compress the bundle as a single user message. Headroom's
  // /v1/compress endpoint accepts any OpenAI-shaped messages
  // array, so a single-turn payload is valid. We use a custom
  // timeout via Promise.race because compressMessages uses
  // its own internal timeout (30s) that's too generous here.
  // The race result is a union; `null` means the timeout
  // fired (we degrade to fallback).
  const compressCall = compressMessages(cfg, [
    { role: "user", content: bundle },
  ]).catch(() => null);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), BUNDLE_COMPRESS_TIMEOUT_MS),
  );
  const result = await Promise.race([compressCall, timeout]);

  if (!result || !result.success || !result.compressed) {
    return {
      ...fallback,
      error: result?.error ?? null,
    };
  }

  // Headroom returns the compressed messages; for a single
  // user turn it's one message whose content is the compressed
  // bundle (may be a string or a parts array — we only handle
  // the string case for the bundle path).
  const compressedContent =
    result.messages.length > 0
      ? extractTextContent(result.messages[0].content)
      : "";
  if (!compressedContent) {
    return {
      ...fallback,
      error: "Headroom returned empty content",
    };
  }

  const compressedSize = new TextEncoder().encode(compressedContent).length;
  const savingsPercent =
    originalSize > 0
      ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
      : 0;

  return {
    context: compressedContent,
    compressed: compressedSize < originalSize,
    originalSize,
    compressedSize,
    savingsPercent,
    error: null,
  };
}

/** Coerce a Headroom message content field (string | parts
 *  array | null) to a plain string. Only the string case is
 *  expected for the bundle path. */
function extractTextContent(
  content: string | null | unknown,
): string {
  if (typeof content === "string") return content;
  if (content == null) return "";
  return "";
}
