// EverOS v2 client — Phase D of the desktop overhaul
// (`docs/plans/2026-10-08-desktop-overhaul-design.md` §4,
//  `docs/plans/2026-10-14-everos-v2-dashboard-plan.md`).
//
// Speaks ONLY the v2 surface (`/api/v2/memory/*`). The v1 client
// (`./everos.ts`) stays until the adapter swap lands, so the migration is
// reversible at every step.
//
// Scope isolation (doctrine rule 5, "scoped co-location, never fusion"):
// every call pins `app_id: EVEROS_SCOPE_APP_ID`. The AI Workspace uses its
// own scope; this console never reads or writes the workspace's memories.
// The pin is enforced by `buildScope` and cannot be widened by a caller,
// a config file, or an adapter bug.
//
// Wire contract pinned from the live OpenAPI document of an EverOS 1.8.0
// server (captured 2026-11-25) and re-verified against a running instance.
// Key facts the v1 client never had to honour:
//   - `search` / `get` require EXACTLY ONE of `user_id` / `agent_id`
//     (422 otherwise), and the memory_type must match the owner kind
//     (user-owned: episode|profile; agent-owned: agent_case|agent_skill).
//   - Success envelope: `{ request_id, data }`. Error envelope:
//     `{ request_id, error: { code, message, timestamp, path } }`.
//   - `/memory/add` answers 200 (accumulated|extracted) or 202 (queued).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

/** The console's EverOS scope. Fixed — never operator-editable, so the
 *  boundary cannot be widened by a settings change. */
export const EVEROS_SCOPE_APP_ID = "agentic-os" as const;

/** v2 default. Matches EverOS 1.8.x's built-in `:8000`; the v1 client
 *  default was moved here too. Operators override via `config.baseUrl`. */
export const EVEROS_V2_DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export const EVEROS_V2_DEFAULT_PROJECT_ID = "default";
export const EVEROS_V2_DEFAULT_USER_ID = "agent-desktop";

export type EverOsV2Owner =
  | { kind: "user"; id: string }
  | { kind: "agent"; id: string };

export interface EverOsV2Config {
  baseUrl: string;
  apiKey: string | null;
  /** Optional narrower partition inside the app scope. */
  projectId?: string | null;
  /** Owner used for user-scoped reads (episodes, profiles). */
  userId?: string | null;
  /** Owner used for agent-scoped reads (cases, skills). */
  agentId?: string | null;
}

export interface EverOsV2Health {
  reachable: boolean;
  status: number | null;
  /** Advertised server version, when the server reports one. */
  version: string | null;
  detail: string | null;
  scannedAt: string;
}

export type EverOsV2MemoryType = "episode" | "profile" | "agent_case" | "agent_skill";

export const EVEROS_V2_USER_MEMORY_TYPES: readonly EverOsV2MemoryType[] = [
  "episode",
  "profile",
];
export const EVEROS_V2_AGENT_MEMORY_TYPES: readonly EverOsV2MemoryType[] = [
  "agent_case",
  "agent_skill",
];

export type EverOsV2SearchMethod =
  | "keyword"
  | "vector"
  | "hybrid"
  | "agentic"
  | "llm_multiround";

/** Build the v2 scope object. `app_id` is ALWAYS the console's fixed
 *  scope — a caller-supplied `appId` is ignored, never merged. `project_id`
 *  and the owner id are only added when set. */
export function buildScope(opts: {
  projectId?: string | null;
  userId?: string | null;
  agentId?: string | null;
  /** Ignored on purpose: present so a caller that spreads a raw config
   *  object cannot widen the scope. */
  appId?: string | null;
}): Record<string, string> {
  const scope: Record<string, string> = { app_id: EVEROS_SCOPE_APP_ID };
  const projectId = opts.projectId?.trim();
  if (projectId) scope.project_id = projectId;
  // Owner XOR: emit an owner only when exactly one is set. Both-set is
  // ambiguous input, so emit neither and let the server reject the request
  // (422) — fail closed rather than silently pick an owner.
  const userId = opts.userId?.trim();
  const agentId = opts.agentId?.trim();
  if (userId && !agentId) scope.user_id = userId;
  else if (agentId && !userId) scope.agent_id = agentId;
  return scope;
}

/** Resolve the owner for a memory_type, honouring the server's pairing
 *  rule. Returns null when the pairing is impossible for the given config. */
export function ownerForMemoryType(
  config: EverOsV2Config,
  memoryType: EverOsV2MemoryType,
): EverOsV2Owner | null {
  if (EVEROS_V2_USER_MEMORY_TYPES.includes(memoryType)) {
    const id = (config.userId ?? EVEROS_V2_DEFAULT_USER_ID).trim();
    return id ? { kind: "user", id } : null;
  }
  const id = (config.agentId ?? config.userId ?? EVEROS_V2_DEFAULT_USER_ID).trim();
  return id ? { kind: "agent", id } : null;
}

/** Shape guard shared by every response parser. */
export interface EverOsV2Envelope<T> {
  requestId: string | null;
  data: T | null;
  error: { code: string; message: string } | null;
}

// ── Item shapes (field names pinned from the live OpenAPI document) ──────

export interface EverOsV2Episode {
  id: string;
  user_id: string | null;
  app_id: string;
  project_id: string;
  session_id: string | null;
  timestamp: string;
  sender_ids: string[];
  summary: string;
  subject: string;
  episode: string;
  type: string;
  score?: number;
  atomic_facts?: Array<Record<string, unknown>>;
}

export interface EverOsV2Profile {
  id: string;
  user_id: string | null;
  app_id: string;
  project_id: string;
  profile_data: Record<string, unknown>;
  score?: number | null;
}

export interface EverOsV2AgentCase {
  id: string;
  entry_id: string;
  agent_id: string;
  app_id: string;
  project_id: string;
  session_id: string;
  task_intent: string;
  approach: string;
  quality_score: number;
  key_insight?: string | null;
  timestamp: string;
  score?: number;
}

export interface EverOsV2AgentSkill {
  id: string;
  agent_id: string;
  app_id: string;
  project_id: string;
  name: string;
  description: string;
  content: string;
  confidence: number;
  maturity_score: number;
  source_case_ids?: string[];
  score?: number;
}

export interface EverOsV2GetData {
  episodes: EverOsV2Episode[];
  profiles: EverOsV2Profile[];
  agent_cases: EverOsV2AgentCase[];
  agent_skills: EverOsV2AgentSkill[];
  total_count: number;
  count: number;
}

export interface EverOsV2SearchData {
  episodes: EverOsV2Episode[];
  profiles: EverOsV2Profile[];
  agent_cases: EverOsV2AgentCase[];
  agent_skills: EverOsV2AgentSkill[];
  unprocessed_messages: Array<Record<string, unknown>>;
}

export interface EverOsV2AddData {
  status: "accumulated" | "extracted" | "queued";
  messageCount: number | null;
  pending: number | null;
}

export interface EverOsV2FlushData {
  status: "extracted" | "no_extraction" | "queued";
}

export interface EverOsV2GetResult {
  success: boolean;
  data: EverOsV2GetData | null;
  error: string | null;
  requestId: string | null;
}

export interface EverOsV2SearchResult {
  success: boolean;
  data: EverOsV2SearchData | null;
  error: string | null;
  requestId: string | null;
}

export interface EverOsV2WriteResult {
  success: boolean;
  data: EverOsV2AddData | EverOsV2FlushData | null;
  error: string | null;
  requestId: string | null;
  /** True when the server accepted the batch for async processing (HTTP 202). */
  queued: boolean;
}

// ── HTTP transport ───────────────────────────────────────────────

const EVEROS_V2_HEALTH_TIMEOUT_MS = 4_000;
const EVEROS_V2_API_TIMEOUT_MS = 15_000;
const EVEROS_V2_SEARCH_TIMEOUT_MS = 20_000;

const trimTrailingSlash = (url: string) => url.replace(/\/+$/, "");

function buildHeaders(cfg: EverOsV2Config): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  return headers;
}

function resolveBase(cfg: EverOsV2Config): string {
  return trimTrailingSlash(cfg.baseUrl || EVEROS_V2_DEFAULT_BASE_URL);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Parse the canonical `{ request_id, data | error }` envelope. Never throws. */
function parseEnvelope(
  body: unknown,
): { requestId: string | null; data: Record<string, unknown> | null; error: string | null } {
  if (!isRecord(body)) {
    return { requestId: null, data: null, error: "response was not a JSON object" };
  }
  const requestId = asString(body.request_id);
  if (isRecord(body.error)) {
    const code = asString(body.error.code);
    const message = asString(body.error.message) ?? "unknown error";
    return { requestId, data: null, error: code ? `${code}: ${message}` : message };
  }
  const data = isRecord(body.data) ? body.data : null;
  if (!data) {
    return { requestId, data: null, error: "response is missing `data`" };
  }
  return { requestId, data, error: null };
}

async function postJson(
  cfg: EverOsV2Config,
  path: string,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ status: number; body: unknown; networkError: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveBase(cfg)}${path}`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        body = null;
      }
    }
    return { status: res.status, body, networkError: null };
  } catch (err) {
    return { status: 0, body: null, networkError: (err as Error).message };
  } finally {
    clearTimeout(timer);
  }
}

export async function pingEverOsV2(
  cfg: Pick<EverOsV2Config, "baseUrl" | "apiKey">,
): Promise<EverOsV2Health> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EVEROS_V2_HEALTH_TIMEOUT_MS);
  try {
    const res = await fetch(`${resolveBase(cfg)}/health`, {
      method: "GET",
      headers: buildHeaders({ ...cfg, projectId: null, userId: null, agentId: null }),
      signal: controller.signal,
    });
    if (!res.ok) {
      return {
        reachable: false,
        status: res.status,
        version: null,
        detail: `HTTP ${res.status} from /health`,
        scannedAt: new Date().toISOString(),
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      reachable: true,
      status: res.status,
      version: asString(body.version),
      detail: null,
      scannedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      reachable: false,
      status: null,
      version: null,
      detail: (err as Error).message,
      scannedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Memory reads ─────────────────────────────────────────────────

function toStringArray(value: unknown): string[] {
  return asStringArray(value);
}

function coerceEpisodes(value: unknown): EverOsV2Episode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id) ?? "",
    user_id: asString(item.user_id),
    app_id: asString(item.app_id) ?? EVEROS_SCOPE_APP_ID,
    project_id: asString(item.project_id) ?? EVEROS_V2_DEFAULT_PROJECT_ID,
    session_id: asString(item.session_id),
    timestamp: asString(item.timestamp) ?? "",
    sender_ids: toStringArray(item.sender_ids),
    summary: asString(item.summary) ?? "",
    subject: asString(item.subject) ?? "",
    episode: asString(item.episode) ?? "",
    type: asString(item.type) ?? "Conversation",
    ...(typeof item.score === "number" ? { score: item.score } : {}),
    ...(Array.isArray(item.atomic_facts)
      ? { atomic_facts: item.atomic_facts.filter(isRecord) }
      : {}),
  }));
}

function coerceProfiles(value: unknown): EverOsV2Profile[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id) ?? "",
    user_id: asString(item.user_id),
    app_id: asString(item.app_id) ?? EVEROS_SCOPE_APP_ID,
    project_id: asString(item.project_id) ?? EVEROS_V2_DEFAULT_PROJECT_ID,
    profile_data: isRecord(item.profile_data) ? item.profile_data : {},
    ...(typeof item.score === "number" || item.score === null ? { score: item.score as number | null } : {}),
  }));
}

function coerceAgentCases(value: unknown): EverOsV2AgentCase[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id) ?? "",
    entry_id: asString(item.entry_id) ?? "",
    agent_id: asString(item.agent_id) ?? "",
    app_id: asString(item.app_id) ?? EVEROS_SCOPE_APP_ID,
    project_id: asString(item.project_id) ?? EVEROS_V2_DEFAULT_PROJECT_ID,
    session_id: asString(item.session_id) ?? "",
    task_intent: asString(item.task_intent) ?? "",
    approach: asString(item.approach) ?? "",
    quality_score: typeof item.quality_score === "number" ? item.quality_score : 0,
    key_insight: asString(item.key_insight),
    timestamp: asString(item.timestamp) ?? "",
    ...(typeof item.score === "number" ? { score: item.score } : {}),
  }));
}

function coerceAgentSkills(value: unknown): EverOsV2AgentSkill[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((item) => ({
    id: asString(item.id) ?? "",
    agent_id: asString(item.agent_id) ?? "",
    app_id: asString(item.app_id) ?? EVEROS_SCOPE_APP_ID,
    project_id: asString(item.project_id) ?? EVEROS_V2_DEFAULT_PROJECT_ID,
    name: asString(item.name) ?? "",
    description: asString(item.description) ?? "",
    content: asString(item.content) ?? "",
    confidence: typeof item.confidence === "number" ? item.confidence : 0,
    maturity_score: typeof item.maturity_score === "number" ? item.maturity_score : 0,
    source_case_ids: toStringArray(item.source_case_ids),
    ...(typeof item.score === "number" ? { score: item.score } : {}),
  }));
}

function coerceGetData(data: Record<string, unknown>): EverOsV2GetData {
  return {
    episodes: coerceEpisodes(data.episodes),
    profiles: coerceProfiles(data.profiles),
    agent_cases: coerceAgentCases(data.agent_cases),
    agent_skills: coerceAgentSkills(data.agent_skills),
    total_count: typeof data.total_count === "number" ? data.total_count : 0,
    count: typeof data.count === "number" ? data.count : 0,
  };
}

function coerceSearchData(data: Record<string, unknown>): EverOsV2SearchData {
  return {
    episodes: coerceEpisodes(data.episodes),
    profiles: coerceProfiles(data.profiles),
    agent_cases: coerceAgentCases(data.agent_cases),
    agent_skills: coerceAgentSkills(data.agent_skills),
    unprocessed_messages: Array.isArray(data.unprocessed_messages)
      ? data.unprocessed_messages.filter(isRecord)
      : [],
  };
}

export interface EverOsV2GetOptions {
  memoryType: EverOsV2MemoryType;
  page?: number;
  pageSize?: number;
  sortBy?: "timestamp" | "updated_at";
  sortOrder?: "asc" | "desc";
}

export async function getMemoriesV2(
  cfg: EverOsV2Config,
  opts: EverOsV2GetOptions,
): Promise<EverOsV2GetResult> {
  const owner = ownerForMemoryType(cfg, opts.memoryType);
  if (!owner) {
    return { success: false, data: null, error: "no owner available for this memory type", requestId: null };
  }
  const scope = buildScope({
    projectId: cfg.projectId,
    userId: owner.kind === "user" ? owner.id : null,
    agentId: owner.kind === "agent" ? owner.id : null,
  });
  const payload: Record<string, unknown> = {
    ...scope,
    memory_type: opts.memoryType,
    page: opts.page ?? 1,
    page_size: opts.pageSize ?? 20,
    sort_by: opts.sortBy ?? "timestamp",
    sort_order: opts.sortOrder ?? "desc",
  };
  const { status, body, networkError } = await postJson(
    cfg,
    "/api/v2/memory/get",
    payload,
    EVEROS_V2_API_TIMEOUT_MS,
  );
  if (networkError) {
    return { success: false, data: null, error: networkError, requestId: null };
  }
  const parsed = parseEnvelope(body);
  if (parsed.error || !parsed.data) {
    return {
      success: false,
      data: null,
      error: parsed.error ?? (status >= 400 ? `HTTP ${status}` : "malformed response"),
      requestId: parsed.requestId,
    };
  }
  return {
    success: true,
    data: coerceGetData(parsed.data),
    error: null,
    requestId: parsed.requestId,
  };
}

export interface EverOsV2SearchOptions {
  method?: EverOsV2SearchMethod;
  topK?: number;
  /** "user" (default) or "agent" — picks which owner id is sent. */
  owner?: "user" | "agent";
  includeProfile?: boolean;
}

export async function searchMemoriesV2(
  cfg: EverOsV2Config,
  query: string,
  opts: EverOsV2SearchOptions = {},
): Promise<EverOsV2SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { success: false, data: null, error: "query must not be empty", requestId: null };
  }
  const ownerKind = opts.owner ?? "user";
  const ownerId =
    ownerKind === "agent"
      ? (cfg.agentId ?? EVEROS_V2_DEFAULT_USER_ID).trim()
      : (cfg.userId ?? EVEROS_V2_DEFAULT_USER_ID).trim();
  if (!ownerId) {
    return { success: false, data: null, error: "no owner id configured", requestId: null };
  }
  const scope = buildScope({
    projectId: cfg.projectId,
    userId: ownerKind === "user" ? ownerId : null,
    agentId: ownerKind === "agent" ? ownerId : null,
  });
  const payload: Record<string, unknown> = {
    ...scope,
    query: trimmed,
    method: opts.method ?? "hybrid",
    top_k: opts.topK ?? -1,
    include_profile: opts.includeProfile ?? false,
  };
  const { status, body, networkError } = await postJson(
    cfg,
    "/api/v2/memory/search",
    payload,
    EVEROS_V2_SEARCH_TIMEOUT_MS,
  );
  if (networkError) {
    return { success: false, data: null, error: networkError, requestId: null };
  }
  const parsed = parseEnvelope(body);
  if (parsed.error || !parsed.data) {
    return {
      success: false,
      data: null,
      error: parsed.error ?? (status >= 400 ? `HTTP ${status}` : "malformed response"),
      requestId: parsed.requestId,
    };
  }
  return {
    success: true,
    data: coerceSearchData(parsed.data),
    error: null,
    requestId: parsed.requestId,
  };
}

// ── Memory writes ────────────────────────────────────────────────

export interface EverOsV2Message {
  sender_id: string;
  sender_name?: string | null;
  role: "user" | "assistant" | "tool";
  /** Unix epoch in milliseconds (v2 contract). */
  timestamp: number;
  content: string;
}

export interface EverOsV2AddOptions {
  sessionId: string;
  messages: EverOsV2Message[];
  /** Persist without triggering boundary detection / extraction. */
  deferExtraction?: boolean;
  /** Return 202 and process on the memorize queue instead of inline. */
  asyncMode?: boolean;
}

export async function addMemoryV2(
  cfg: EverOsV2Config,
  opts: EverOsV2AddOptions,
): Promise<EverOsV2WriteResult> {
  if (!opts.messages.length) {
    // Nothing to write. Report a no-op success, not a queued job that will
    // never exist.
    return {
      success: true,
      data: { status: "accumulated", messageCount: 0, pending: 0 },
      error: null,
      requestId: null,
      queued: false,
    };
  }
  const scope = buildScope({ projectId: cfg.projectId });
  const payload: Record<string, unknown> = {
    ...scope,
    session_id: opts.sessionId,
    messages: opts.messages.map((m) => ({
      sender_id: m.sender_id,
      sender_name: m.sender_name ?? null,
      role: m.role,
      timestamp: m.timestamp,
      content: m.content,
    })),
    defer_extraction: opts.deferExtraction ?? false,
    async_mode: opts.asyncMode ?? false,
  };
  const { status, body, networkError } = await postJson(
    cfg,
    "/api/v2/memory/add",
    payload,
    EVEROS_V2_API_TIMEOUT_MS,
  );
  if (networkError) {
    return { success: false, data: null, error: networkError, requestId: null, queued: false };
  }
  const parsed = parseEnvelope(body);
  if (parsed.error || !parsed.data) {
    return {
      success: false,
      data: null,
      error: parsed.error ?? (status >= 400 ? `HTTP ${status}` : "malformed response"),
      requestId: parsed.requestId,
      queued: false,
    };
  }
  const queued = status === 202 || parsed.data.status === "queued";
  return {
    success: true,
    data: {
      status: (asString(parsed.data.status) ?? (queued ? "queued" : "accumulated")) as
        | "accumulated"
        | "extracted"
        | "queued",
      messageCount:
        typeof parsed.data.message_count === "number" ? parsed.data.message_count : null,
      pending: typeof parsed.data.pending === "number" ? parsed.data.pending : null,
    },
    error: null,
    requestId: parsed.requestId,
    queued,
  };
}

export async function flushMemoriesV2(
  cfg: EverOsV2Config,
  sessionId: string,
): Promise<EverOsV2WriteResult> {
  const scope = buildScope({ projectId: cfg.projectId });
  const payload: Record<string, unknown> = { ...scope, session_id: sessionId };
  const { status, body, networkError } = await postJson(
    cfg,
    "/api/v2/memory/flush",
    payload,
    EVEROS_V2_API_TIMEOUT_MS,
  );
  if (networkError) {
    return { success: false, data: null, error: networkError, requestId: null, queued: false };
  }
  const parsed = parseEnvelope(body);
  if (parsed.error || !parsed.data) {
    return {
      success: false,
      data: null,
      error: parsed.error ?? (status >= 400 ? `HTTP ${status}` : "malformed response"),
      requestId: parsed.requestId,
      queued: false,
    };
  }
  const queued = status === 202 || parsed.data.status === "queued";
  const statusValue = asString(parsed.data.status) ?? (queued ? "queued" : "no_extraction");
  return {
    success: true,
    data: { status: statusValue as EverOsV2FlushData["status"] },
    error: null,
    requestId: parsed.requestId,
    queued,
  };
}

/** Source config shape accepted by `toEverOsV2Config` — structurally
 *  compatible with both the persisted `everos` block (groupId/userId)
 *  and any future caller. Kept structural so this module does not need
 *  to import the v1 client. */
export interface EverOsV2SourceConfig {
  baseUrl: string;
  apiKey?: string | null;
  /** Group id from the v1-era config block; reused as the v2 project scope. */
  groupId?: string | null;
  userId?: string | null;
  agentId?: string | null;
  projectId?: string | null;
}

/** Project a loose source config onto the v2 wire config. `app_id` is
 *  never taken from the source — the scope pin in `buildScope` is the
 *  only place it is set. */
export function toEverOsV2Config(src: EverOsV2SourceConfig): EverOsV2Config {
  const project = src.projectId?.trim() || src.groupId?.trim() || null;
  const user = src.userId?.trim() || null;
  const agent = src.agentId?.trim() || null;
  return {
    baseUrl: src.baseUrl,
    apiKey: src.apiKey ?? null,
    projectId: project,
    // Owner XOR: an explicit agentId wins; otherwise mirror userId so the
    // desktop's single "userId" setting still has an agent-owner identity.
    userId: user,
    agentId: agent ?? user,
  };
}
