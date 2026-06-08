// EverOS client — thin HTTP wrapper for the self-hosted EverOS / EverCore
// backend (https://github.com/JZKK720/EverOS).
//
// The backend exposes:
//   GET  /health
//   POST /api/v1/memories          (store a conversation turn)
//   POST /api/v1/memories/search   (hybrid / keyword / vector retrieval)
//
// We deliberately keep this client small and decoupled from the rest of
// the shell: the user is on remote/local, with or without a gateway, and
// the EverOS backend may or may not be running. The desktop surfaces a
// "configure" form so the operator points the shell at their own EverOS
// instance. If the backend is unreachable, the UI degrades gracefully
// with an "EverOS backend not reachable" hint instead of crashing.

import { promises as fs } from "fs";
import { existsSync } from "fs";
import { join } from "path";

const EVEROS_DEFAULT_BASE_URL = "http://127.0.0.1:1995";
const EVEROS_HEALTH_TIMEOUT_MS = 4_000;
const EVEROS_API_TIMEOUT_MS = 15_000;
const EVEROS_SEARCH_TIMEOUT_MS = 20_000;

export interface EverOsConfig {
  baseUrl: string;
  userId: string;
  groupId: string;
  topK: number;
  memoryTypes: string[];
  retrieveMethod: "hybrid" | "keyword" | "vector";
  enabled: boolean;
  apiKey: string | null;
}

export const DEFAULT_EVEROS_CONFIG: EverOsConfig = {
  baseUrl: EVEROS_DEFAULT_BASE_URL,
  userId: "agent-desktop",
  groupId: "agent-desktop",
  topK: 5,
  memoryTypes: ["episodic_memory"],
  retrieveMethod: "hybrid",
  enabled: false,
  apiKey: null,
};

export interface EverOsHealthStatus {
  reachable: boolean;
  status: string | null;
  detail: string | null;
  version: string | null;
  scannedAt: string;
}

export interface EverOsMessageInput {
  messageId?: string;
  role: "user" | "assistant" | "system";
  senderId?: string;
  senderName?: string;
  content: string;
  timestamp?: number;
}

export interface EverOsAddResult {
  success: boolean;
  storedCount: number;
  error?: string;
}

export interface EverOsEpisode {
  episodeId: string;
  content: string;
  score: number;
  createdAt: number | null;
  metadata: Record<string, unknown> | null;
}

export interface EverOsSearchResult {
  success: boolean;
  episodes: EverOsEpisode[];
  pendingMessages: number;
  totalEstimated: number | null;
  error?: string;
}

export interface EverOsRecentItem {
  id: string;
  content: string;
  senderId: string | null;
  role: string | null;
  createdAt: number | null;
}

export interface EverOsRecentResult {
  success: boolean;
  items: EverOsRecentItem[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Config persistence (desktop.json is the canonical store; we read/write
// the everos block through the same helpers the rest of the shell uses).
// ---------------------------------------------------------------------------

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

export async function loadEverOsConfig(
  homeDir: string,
): Promise<EverOsConfig> {
  const root = await readConfigFromHome(homeDir);
  const block = (root.everos as Partial<EverOsConfig> | undefined) ?? {};
  return { ...DEFAULT_EVEROS_CONFIG, ...block };
}

export async function saveEverOsConfig(
  homeDir: string,
  patch: Partial<EverOsConfig>,
): Promise<EverOsConfig> {
  const root = await readConfigFromHome(homeDir);
  const merged: EverOsConfig = {
    ...DEFAULT_EVEROS_CONFIG,
    ...((root.everos as Partial<EverOsConfig> | undefined) ?? {}),
    ...patch,
  };
  await writeConfigToHome(homeDir, { ...root, everos: merged });
  return merged;
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

function buildHeaders(cfg: EverOsConfig): Record<string, string> {
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

export async function pingEverOs(
  cfg: Pick<EverOsConfig, "baseUrl">,
): Promise<EverOsHealthStatus> {
  const base = trimTrailingSlash(cfg.baseUrl || EVEROS_DEFAULT_BASE_URL);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EVEROS_HEALTH_TIMEOUT_MS);
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
          : typeof body.everos_version === "string"
            ? body.everos_version
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

export async function addEverOsMemory(
  cfg: EverOsConfig,
  messages: EverOsMessageInput[],
): Promise<EverOsAddResult> {
  if (!messages.length) {
    return { success: true, storedCount: 0 };
  }
  const base = trimTrailingSlash(cfg.baseUrl);
  const stamp = Date.now();
  const headers = buildHeaders(cfg);
  let stored = 0;
  let lastError: string | undefined;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const payload = {
      message_id:
        m.messageId ??
        `ad_${stamp}_${i}_${Math.random().toString(36).slice(2, 8)}`,
      create_time: new Date(m.timestamp ?? stamp + i).toISOString(),
      role: m.role,
      sender: m.senderId ?? cfg.userId,
      sender_name: m.senderName ?? (m.role === "assistant" ? "assistant" : cfg.userId),
      content: m.content,
      group_id: cfg.groupId,
      group_name: cfg.groupId,
      scene: "assistant",
      raw_data_type: "AgentConversation",
      user_id: cfg.userId,
      session_id: cfg.groupId,
    };
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      EVEROS_API_TIMEOUT_MS,
    );
    try {
      const res = await fetch(`${base}/api/v1/memories`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        lastError = `HTTP ${res.status} storing memory`;
        continue;
      }
      stored++;
    } catch (err) {
      lastError = (err as Error).message;
    } finally {
      clearTimeout(timer);
    }
  }
  return stored
    ? { success: true, storedCount: stored }
    : {
        success: false,
        storedCount: 0,
        error: lastError ?? "unknown error",
      };
}

export async function searchEverOsMemory(
  cfg: EverOsConfig,
  query: string,
  options?: { topK?: number; method?: EverOsConfig["retrieveMethod"] },
): Promise<EverOsSearchResult> {
  const base = trimTrailingSlash(cfg.baseUrl);
  const topK = options?.topK ?? cfg.topK;
  const method = options?.method ?? cfg.retrieveMethod;
  const payload = {
    query,
    method,
    memory_types: cfg.memoryTypes,
    top_k: topK,
    filters: { user_id: cfg.userId, group_id: cfg.groupId },
  };
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    EVEROS_SEARCH_TIMEOUT_MS,
  );
  try {
    const res = await fetch(`${base}/api/v1/memories/search`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        success: false,
        episodes: [],
        pendingMessages: 0,
        totalEstimated: null,
        error: `HTTP ${res.status} from /memories/search`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const data = (body.data as Record<string, unknown> | undefined) ?? {};
    const rawEpisodes = Array.isArray(data.episodes)
      ? (data.episodes as Array<Record<string, unknown>>)
      : [];
    const episodes: EverOsEpisode[] = rawEpisodes.map((ep, idx) => {
      const meta =
        ep.metadata && typeof ep.metadata === "object"
          ? (ep.metadata as Record<string, unknown>)
          : null;
      return {
        episodeId:
          typeof ep.episode_id === "string"
            ? (ep.episode_id as string)
            : `ep_${idx}_${Math.random().toString(36).slice(2, 8)}`,
        content:
          typeof ep.episode === "string"
            ? (ep.episode as string)
            : typeof ep.content === "string"
              ? (ep.content as string)
              : "",
        score: typeof ep.score === "number" ? (ep.score as number) : 0,
        createdAt:
          typeof ep.created_at === "number"
            ? (ep.created_at as number)
            : meta && typeof meta.timestamp === "number"
              ? (meta.timestamp as number)
              : null,
        metadata: meta,
      };
    });
    return {
      success: true,
      episodes,
      pendingMessages:
        typeof data.pending_messages === "number"
          ? (data.pending_messages as number)
          : 0,
      totalEstimated:
        typeof data.total === "number" ? (data.total as number) : null,
    };
  } catch (err) {
    return {
      success: false,
      episodes: [],
      pendingMessages: 0,
      totalEstimated: null,
      error: (err as Error).message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Best-effort fetch of recent memories. The EverOS openapi spec does not
 *  expose a public list endpoint yet, so we attempt a search with an
 *  empty-ish query and return whatever the backend gives back. If the
 *  backend returns nothing, the caller renders an empty state. */
export async function listRecentEverOsMemory(
  cfg: EverOsConfig,
  limit = 20,
): Promise<EverOsRecentResult> {
  const result = await searchEverOsMemory(cfg, "*", {
    topK: limit,
    method: "hybrid",
  });
  if (!result.success) {
    return { success: false, items: [], error: result.error };
  }
  return {
    success: true,
    items: result.episodes.map((ep) => ({
      id: ep.episodeId,
      content: ep.content,
      senderId: null,
      role: null,
      createdAt: ep.createdAt,
    })),
  };
}
