// AI Workspace (cubecloud-agent) READ-ONLY session + agent inventory —
// contract row D (session console) and coordination row R1 (inventory
// reconciliation) of the workspace↔desktop control-console plans:
//   docs/plans/2026-10-06-cubecloud-agent-integration-plan.md      (§5.2 D)
//   docs/plans/2026-10-06-workspace-agentic-os-coordination-matrix.md (R1)
//
// The desktop is a VIEWER, not an owner: the cubecloud-agent server is
// the single session truth (Part-I §4.1), so this module issues GETs
// only — POST/PATCH/DELETE/PUT and the /events mutation endpoint are
// ban-listed by the same-commit CI guard test
// (`tests/cubecloud-agent-sessions.test.ts`).
//
// Endpoints used (all exist today, cubecloud_agent/server/API.md):
//   GET /v1/sessions            — paginated list (cursor + has_more)
//   GET /v1/sessions/{id}       — snapshot (identity, status, items)
//   GET /api/agents             — agent bundle registry (object:list)
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.
//
// Mirrors `cubecloud-agent-probe.ts` conventions: never throws, stable
// result shapes, defensive normalization of unknown payloads.

const REQUEST_TIMEOUT_MS = 10_000;
const LIST_PAGE_SIZE = 50;

export type WorkspaceSessionStatus = "idle" | "running" | "waiting" | "failed";

export interface WorkspaceSessionSummary {
  id: string;
  agentId: string | null;
  agentName: string | null;
  status: WorkspaceSessionStatus;
  title: string | null;
  createdAt: number | null;
  runnerId: string | null;
  /** Strict runner liveness from the Workspace (null = not wired). */
  runnerOnline: boolean | null;
  /** Host tunnel liveness (null = no host binding). */
  hostOnline: boolean | null;
  externalSessionId: string | null;
  modelOverride: string | null;
  gitBranch: string | null;
}

export interface WorkspaceSessionItem {
  id: string;
  kind: string;
  role: string | null;
  status: string | null;
  text: string | null;
}

export interface WorkspaceSessionSnapshot {
  success: boolean;
  status: WorkspaceSessionStatus | null;
  summary: WorkspaceSessionSummary | null;
  items: WorkspaceSessionItem[];
  error?: string;
}

export interface WorkspaceSessionListResult {
  success: boolean;
  data: WorkspaceSessionSummary[];
  hasMore: boolean;
  error?: string;
}

export interface WorkspaceAgentBundle {
  id: string;
  name: string;
  description: string | null;
  createdAt: number | null;
}

export interface WorkspaceAgentListResult {
  success: boolean;
  data: WorkspaceAgentBundle[];
  hasMore: boolean;
  error?: string;
}

/** R1 — the three-way join result for the operator's registry view. */
export interface WorkspaceInventoryReconciliation {
  workspaceAgents: WorkspaceAgentBundle[];
  /** Desktop catalog entries that also appear as workspace adapters. */
  coordinated: string[];
  /** Desktop catalog entries with no workspace adapter (view-only). */
  consoleOnly: string[];
  /** Workspace bundles with no desktop catalog counterpart (adoption
   *  candidates for row R2/R3). */
  workspaceOnly: string[];
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function fetchJson(
  url: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    const body: unknown = res.ok
      ? await res.json().catch(() => ({}))
      : undefined;
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function asBoolOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeStatus(value: unknown): WorkspaceSessionStatus {
  return value === "idle" ||
    value === "running" ||
    value === "waiting" ||
    value === "failed"
    ? value
    : "idle";
}

function normalizeSession(raw: Record<string, unknown>): WorkspaceSessionSummary {
  return {
    id: asStringOrNull(raw.id) ?? "",
    agentId: asStringOrNull(raw.agent_id),
    agentName: asStringOrNull(raw.agent_name),
    status: normalizeStatus(raw.status),
    title: asStringOrNull(raw.title),
    createdAt: asNumberOrNull(raw.created_at),
    runnerId: asStringOrNull(raw.runner_id),
    runnerOnline: asBoolOrNull(raw.runner_online),
    hostOnline: asBoolOrNull(raw.host_online),
    externalSessionId: asStringOrNull(raw.external_session_id),
    modelOverride: asStringOrNull(raw.model_override),
    gitBranch: asStringOrNull(raw.git_branch),
  };
}

/** Pull the display text out of an item's `content` blocks (the
 *  `input_text`/`output_text` shape from the items schema). */
function extractItemText(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content) {
    if (
      block &&
      typeof block === "object" &&
      typeof (block as Record<string, unknown>).text === "string"
    ) {
      parts.push((block as Record<string, unknown>).text as string);
    }
  }
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : null;
}

function normalizeItem(raw: Record<string, unknown>): WorkspaceSessionItem {
  return {
    id: asStringOrNull(raw.id) ?? "",
    kind: asStringOrNull(raw.type) ?? "unknown",
    role: asStringOrNull(raw.role),
    status: asStringOrNull(raw.status),
    text: extractItemText(raw.content),
  };
}

/** GET /v1/sessions — paginated list, items and snapshot-only fields
 *  absent. Never throws. */
export async function listWorkspaceSessions(
  baseUrl: string,
  options: { limit?: number; searchQuery?: string; kind?: "default" | "sub_agent" | "any" } = {},
): Promise<WorkspaceSessionListResult> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? LIST_PAGE_SIZE));
  if (options.searchQuery) params.set("search_query", options.searchQuery);
  if (options.kind) params.set("kind", options.kind);
  try {
    const { ok, status, body } = await fetchJson(
      `${trimTrailingSlash(baseUrl)}/v1/sessions?${params.toString()}`,
    );
    if (!ok || typeof body !== "object" || body === null) {
      return {
        success: false,
        data: [],
        hasMore: false,
        error: `HTTP ${status} from /v1/sessions`,
      };
    }
    const data = (body as Record<string, unknown>).data;
    const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    return {
      success: true,
      data: rows.map(normalizeSession).filter((s) => s.id.length > 0),
      hasMore: (body as Record<string, unknown>).has_more === true,
    };
  } catch (err) {
    return {
      success: false,
      data: [],
      hasMore: false,
      error: (err as Error).message,
    };
  }
}

/** GET /v1/sessions/{id}?include_items=true — the snapshot read.
 *  Read-only display data; never throws. */
export async function getWorkspaceSessionSnapshot(
  baseUrl: string,
  sessionId: string,
): Promise<WorkspaceSessionSnapshot> {
  try {
    const { ok, status, body } = await fetchJson(
      `${trimTrailingSlash(baseUrl)}/v1/sessions/${encodeURIComponent(sessionId)}?include_items=true`,
    );
    if (!ok || typeof body !== "object" || body === null) {
      return {
        success: false,
        status: null,
        summary: null,
        items: [],
        error: `HTTP ${status} from /v1/sessions/${sessionId}`,
      };
    }
    const record = body as Record<string, unknown>;
    const rawItems = Array.isArray(record.items)
      ? (record.items as Array<Record<string, unknown>>)
      : [];
    return {
      success: true,
      status: normalizeStatus(record.status),
      summary: normalizeSession(record),
      items: rawItems
        .map(normalizeItem)
        .filter((item) => item.id.length > 0 || item.text !== null),
    };
  } catch (err) {
    return {
      success: false,
      status: null,
      summary: null,
      items: [],
      error: (err as Error).message,
    };
  }
}

/** GET /api/agents — the agent bundle registry (object:list). Read-only
 *  view for the R1 reconciliation; promotion lives in the R2/R3
 *  translator phase. Never throws. */
export async function listWorkspaceAgents(
  baseUrl: string,
  limit = 100,
): Promise<WorkspaceAgentListResult> {
  try {
    const { ok, status, body } = await fetchJson(
      `${trimTrailingSlash(baseUrl)}/api/agents?limit=${encodeURIComponent(String(limit))}`,
    );
    if (!ok || typeof body !== "object" || body === null) {
      return {
        success: false,
        data: [],
        hasMore: false,
        error: `HTTP ${status} from /api/agents`,
      };
    }
    const record = body as Record<string, unknown>;
    const rows = Array.isArray(record.data)
      ? (record.data as Array<Record<string, unknown>>)
      : [];
    return {
      success: true,
      data: rows
        .map((raw) => ({
          id: asStringOrNull(raw.id) ?? "",
          name: asStringOrNull(raw.name) ?? asStringOrNull(raw.id) ?? "",
          description: asStringOrNull(raw.description),
          createdAt: asNumberOrNull(raw.created_at),
        }))
        .filter((a) => a.id.length > 0),
      hasMore: record.has_more === true,
    };
  } catch (err) {
    return {
      success: false,
      data: [],
      hasMore: false,
      error: (err as Error).message,
    };
  }
}

/** R1 — reconcile the desktop CLI catalog against the workspace's agent
 *  bundle registry. Matching is name-based on the shared adapter names
 *  (the Workspace's bundle `name` for native adapters is the CLI name,
 *  e.g. "claude", "codex" — `harness_aliases.py`). Never throws. */
export async function reconcileWorkspaceInventory(
  baseUrl: string,
  consoleCatalog: Array<{ id: string; name: string }>,
): Promise<WorkspaceInventoryReconciliation> {
  const agentsResult = await listWorkspaceAgents(baseUrl, 1000);
  const workspaceAgents = agentsResult.success ? agentsResult.data : [];
  const workspaceNames = new Set(workspaceAgents.map((a) => a.name.toLowerCase()));

  const coordinated: string[] = [];
  const consoleOnly: string[] = [];
  for (const entry of consoleCatalog) {
    if (workspaceNames.has(entry.id.toLowerCase())) coordinated.push(entry.id);
    else consoleOnly.push(entry.id);
  }

  const catalogIds = new Set(consoleCatalog.map((c) => c.id.toLowerCase()));
  const workspaceOnly = workspaceAgents
    .map((a) => a.name)
    .filter((name) => name && !catalogIds.has(name.toLowerCase()));

  return { workspaceAgents, coordinated, consoleOnly, workspaceOnly };
}