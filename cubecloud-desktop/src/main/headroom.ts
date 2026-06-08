/**
 * Headroom client — thin HTTP wrapper for the Headroom proxy
 * (https://github.com/JZKK720/headroom).
 *
 * The proxy exposes:
 *   GET  /health
 *   POST /v1/compress          (compress messages)
 *   POST /v1/retrieve          (CCR retrieve original)
 *   GET  /v1/stats             (compression statistics)
 *
 * We deliberately keep this client small and decoupled from the rest of
 * the shell. The proxy may or may not be running — the desktop surfaces
 * a lifecycle card (via headroom-sidecar.ts) so the operator can start,
 * stop, and monitor the proxy. If the proxy is unreachable, the UI
 * degrades gracefully with a "proxy not reachable" hint.
 */

import { promises as fs } from "fs";
import { existsSync } from "fs";
import { join } from "path";

const HEADROOM_DEFAULT_BASE_URL = "http://127.0.0.1:8787";
const HEADROOM_HEALTH_TIMEOUT_MS = 4_000;
const HEADROOM_COMPRESS_TIMEOUT_MS = 30_000;
const HEADROOM_RETRIEVE_TIMEOUT_MS = 15_000;
const HEADROOM_STATS_TIMEOUT_MS = 10_000;

// (Bundle compression helpers live in ./headroom-bundle.ts so
//  they can be tested in isolation. The main `headroom.ts`
//  exports the raw HTTP client; the bundle layer is a thin
//  best-effort wrapper that adds gating and graceful
//  degradation.)

// ─── Config types ─────────────────────────────────────────────────

export interface HeadroomConfig {
  baseUrl: string;
  mode: "audit" | "optimize";
  enabled: boolean;
  apiKey: string | null;
  /**
   * Operator-only UI flag. When true, the desktop's
   * "Quick start" card on the Headroom screen collapses into
   * a one-line summary + "Reset quick start" link instead of
   * the full audit/test/optimize walkthrough. Persisted in
   * desktop.json so it survives restarts. The proxy runtime
   * is not affected by this flag.
   */
  firstRunDismissed?: boolean;
}

export const DEFAULT_HEADROOM_CONFIG: HeadroomConfig = {
  baseUrl: HEADROOM_DEFAULT_BASE_URL,
  mode: "audit",
  enabled: false,
  apiKey: null,
  firstRunDismissed: false,
};

// ─── API types ────────────────────────────────────────────────────

export interface HeadroomHealthStatus {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
}

/** A single message in OpenAI chat format. */
export interface HeadroomMessage {
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

export interface HeadroomCompressResult {
  success: boolean;
  /** The compressed messages (or originals if no compression applied). */
  messages: HeadroomMessage[];
  /** Token count before compression. */
  tokensBefore: number;
  /** Token count after compression. */
  tokensAfter: number;
  /** Percentage of tokens saved (0–100). */
  savingsPercent: number;
  /** Whether any compression was actually applied. */
  compressed: boolean;
  error?: string;
}

export interface HeadroomRetrieveResult {
  success: boolean;
  /** The original uncompressed content. */
  content: string | null;
  error?: string;
}

export interface HeadroomStats {
  success: boolean;
  totalRequests: number;
  totalTokensSaved: number;
  totalTokensBefore: number;
  totalTokensAfter: number;
  avgSavingsPercent: number;
  ccrEntries: number;
  uptimeSeconds: number;
  error?: string;
}

// ─── Config persistence ───────────────────────────────────────────

function configPath(homeDir: string): string {
  return join(homeDir, "desktop.json");
}

async function readConfigFromHome(
  homeDir: string,
): Promise<Record<string, unknown>> {
  const p = configPath(homeDir);
  if (!existsSync(p)) return {};
  try {
    const raw = await fs.readFile(p, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeConfigToHome(
  homeDir: string,
  cfg: Record<string, unknown>,
): Promise<boolean> {
  const p = configPath(homeDir);
  try {
    await fs.writeFile(p, JSON.stringify(cfg, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}

export async function loadHeadroomConfig(
  homeDir: string,
): Promise<HeadroomConfig> {
  const root = await readConfigFromHome(homeDir);
  const block = (root.headroom as Partial<HeadroomConfig> | undefined) ?? {};
  return { ...DEFAULT_HEADROOM_CONFIG, ...block };
}

export async function saveHeadroomConfig(
  homeDir: string,
  patch: Partial<HeadroomConfig>,
): Promise<HeadroomConfig> {
  const root = await readConfigFromHome(homeDir);
  const merged: HeadroomConfig = {
    ...DEFAULT_HEADROOM_CONFIG,
    ...((root.headroom as Partial<HeadroomConfig> | undefined) ?? {}),
    ...patch,
  };
  await writeConfigToHome(homeDir, { ...root, headroom: merged });
  return merged;
}

// ─── HTTP transport ───────────────────────────────────────────────

function buildHeaders(cfg: HeadroomConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cfg.apiKey) {
    headers.Authorization = `Bearer ${cfg.apiKey}`;
  }
  return headers;
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function pingHeadroom(
  cfg: Pick<HeadroomConfig, "baseUrl">,
): Promise<HeadroomHealthStatus> {
  const base = trimTrailingSlash(cfg.baseUrl || HEADROOM_DEFAULT_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEADROOM_HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        reachable: false,
        status: null,
        detail: `HTTP ${res.status} from /health`,
        version: null,
        scannedAt: new Date().toISOString(),
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return {
      reachable: true,
      status: typeof body.status === "string" ? body.status : "ok",
      detail: null,
      version:
        typeof body.version === "string"
          ? body.version
          : null,
      scannedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      reachable: false,
      status: null,
      detail: (err as Error).message,
      version: null,
      scannedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function compressMessages(
  cfg: HeadroomConfig,
  messages: HeadroomMessage[],
  model?: string,
): Promise<HeadroomCompressResult> {
  if (!messages.length) {
    return {
      success: true,
      messages: [],
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressed: false,
    };
  }
  const base = trimTrailingSlash(cfg.baseUrl);
  const payload: Record<string, unknown> = {
    messages,
    mode: cfg.mode,
  };
  if (model) payload.model = model;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    HEADROOM_COMPRESS_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${base}/v1/compress`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        success: false,
        messages,
        tokensBefore: 0,
        tokensAfter: 0,
        savingsPercent: 0,
        compressed: false,
        error: `HTTP ${res.status} from /v1/compress`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const compressedMessages = Array.isArray(body.messages)
      ? (body.messages as HeadroomMessage[])
      : messages;
    const tokensBefore =
      typeof body.tokens_before === "number" ? body.tokens_before : 0;
    const tokensAfter =
      typeof body.tokens_after === "number" ? body.tokens_after : 0;
    const savingsPercent =
      tokensBefore > 0
        ? Math.round(((tokensBefore - tokensAfter) / tokensBefore) * 100)
        : 0;
    return {
      success: true,
      messages: compressedMessages,
      tokensBefore,
      tokensAfter,
      savingsPercent,
      compressed: tokensAfter < tokensBefore,
    };
  } catch (err) {
    return {
      success: false,
      messages,
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressed: false,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function retrieveOriginal(
  cfg: HeadroomConfig,
  cacheKey: string,
): Promise<HeadroomRetrieveResult> {
  const base = trimTrailingSlash(cfg.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    HEADROOM_RETRIEVE_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${base}/v1/retrieve`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify({ key: cacheKey }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        success: false,
        content: null,
        error: `HTTP ${res.status} from /v1/retrieve`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return {
      success: true,
      content: typeof body.content === "string" ? body.content : null,
    };
  } catch (err) {
    return {
      success: false,
      content: null,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function getHeadroomStats(
  cfg: HeadroomConfig,
): Promise<HeadroomStats> {
  const base = trimTrailingSlash(cfg.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    HEADROOM_STATS_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${base}/v1/stats`, {
      method: "GET",
      headers: buildHeaders(cfg),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        success: false,
        totalRequests: 0,
        totalTokensSaved: 0,
        totalTokensBefore: 0,
        totalTokensAfter: 0,
        avgSavingsPercent: 0,
        ccrEntries: 0,
        uptimeSeconds: 0,
        error: `HTTP ${res.status} from /v1/stats`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return {
      success: true,
      totalRequests:
        typeof body.total_requests === "number" ? body.total_requests : 0,
      totalTokensSaved:
        typeof body.total_tokens_saved === "number"
          ? body.total_tokens_saved
          : 0,
      totalTokensBefore:
        typeof body.total_tokens_before === "number"
          ? body.total_tokens_before
          : 0,
      totalTokensAfter:
        typeof body.total_tokens_after === "number"
          ? body.total_tokens_after
          : 0,
      avgSavingsPercent:
        typeof body.avg_savings_percent === "number"
          ? body.avg_savings_percent
          : 0,
      ccrEntries:
        typeof body.ccr_entries === "number" ? body.ccr_entries : 0,
      uptimeSeconds:
        typeof body.uptime_seconds === "number" ? body.uptime_seconds : 0,
    };
  } catch (err) {
    return {
      success: false,
      totalRequests: 0,
      totalTokensSaved: 0,
      totalTokensBefore: 0,
      totalTokensAfter: 0,
      avgSavingsPercent: 0,
      ccrEntries: 0,
      uptimeSeconds: 0,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}
