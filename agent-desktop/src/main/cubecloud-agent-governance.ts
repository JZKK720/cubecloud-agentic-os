// cubecloud-agent governance relay — P6 / contract row G of the
// control-console plan
// (`docs/plans/2026-10-06-cubecloud-agent-integration-plan.md` §5.2) with
// the approval-inbox duties from the coordination matrix (R4 view + G).
//
// What the console DOES deliver (one deliberate write):
//   - Human approval verdicts → POST /v1/sessions/{sid}/elicitations/
//     {eid}/resolve (the resource-scoped URL the workspace docs mandate;
//     keeps the verdict out of the in-band event channel so policy ASK
//     gates cannot conflate it). Body = MCP ElicitationResult
//     `{ action: "accept" | "decline" | "cancel", content? }` → 202.
//     Mirrored-child requests carry params.target_session_id — the
//     verdict goes to THAT session, per API.md.
//
// What the console only READS (GET):
//   - GET /v1/sessions/{id}?include_items=true → snapshot
//     `pending_elicitations[]` parsed into a renderer-friendly shape
//     (form/url modes, policy context, mirrored-child target).
//   - GET /v1/scheduled_tasks, /v1/policy-registry, /v1/sharing → the
//     governance-surface view (row R4's registry-view duty, fixture-
//     tolerant: older builds answer 404 and are skipped with a recorded
//     error, never a throw).
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

export type GovernanceVerdictAction = "accept" | "decline" | "cancel";

export interface GovernanceVerdictBody {
  action: GovernanceVerdictAction;
  content?: unknown;
}

const GOVERNANCE_TIMEOUT_MS = 10_000;

export interface PendingElicitation {
  elicitationId: string;
  mode: "form" | "url";
  message: string | null;
  /** JSON-Schema block for form mode (camelCase per MCP). */
  requestedSchema: unknown;
  /** External URL for url mode. */
  url: string | null;
  phase: string | null;
  policyName: string | null;
  contentPreview: string | null;
  /** Mirrored-child routing: the session that must receive the verdict. */
  targetSessionId: string | null;
}

export interface PendingElicitationResult {
  success: boolean;
  requests: PendingElicitation[];
  error?: string;
}

export interface GovernanceResolveResult {
  success: boolean;
  /** Server echo (202) — true when delivered async. */
  queued: boolean | null;
  error?: string;
  /** Original network error text, when the failure was a network one. */
  cause?: string | null;
}

export interface GovernanceSurfaceItem {
  id: string | null;
  name: string;
  mode: string | null;
  nextRun: number | null;
}

export interface GovernanceSurfacesResult {
  scheduledTasks: GovernanceSurfaceItem[];
  /** policyName + mode rows from the policy registry. */
  policies: Array<{ name: string; mode: string | null }>;
  shares: unknown[];
  /** Per-surface fetch failures (older builds 404 — tolerated). */
  errors: string[];
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function withTimeoutRace<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function fetchJson(
  url: string,
  init: RequestInit = {},
): Promise<{
  ok: boolean;
  status: number | null;
  body: unknown;
  error: string | null;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOVERNANCE_TIMEOUT_MS);
  try {
    const response: Response = await withTimeoutRace(
      fetch(url, { ...init, signal: controller.signal }),
      GOVERNANCE_TIMEOUT_MS,
    );
    const body = response.ok
      ? ((await withTimeoutRace(
          response.json().catch(() => null),
          GOVERNANCE_TIMEOUT_MS,
        )) as unknown)
      : null;
    return { ok: response.ok, status: response.status, body, error: null };
  } catch (err) {
    return { ok: false, status: null, body: null, error: String(err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Prefer the original error text (e.g. ECONNREFUSED) over a generic
 *  "unreachable" when both are available. */
function describeFailure(
  result: Awaited<ReturnType<typeof fetchJson>>,
  label: string,
): string {
  if (result.error) return `${label}: ${result.error}`;
  return `HTTP ${result.status ?? "unreachable"} — ${label}`;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseElicitation(raw: unknown): PendingElicitation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (record.type !== "response.elicitation_request") return null;
  const elicitationId = asStringOrNull(record.elicitation_id);
  if (!elicitationId) return null;
  const params =
    typeof record.params === "object" && record.params !== null
      ? (record.params as Record<string, unknown>)
      : {};
  const mode = params.mode === "url" ? "url" : params.mode === "form" ? "form" : null;
  return {
    elicitationId,
    mode: mode ?? "form",
    message: asStringOrNull(params.message),
    requestedSchema: params.requestedSchema ?? null,
    url: asStringOrNull(params.url),
    phase: asStringOrNull(params.phase),
    policyName: asStringOrNull(params.policy_name),
    contentPreview: asStringOrNull(params.content_preview),
    // Mirrored-child routing (API.md): the verdict goes to the child.
    targetSessionId: asStringOrNull(params.target_session_id),
  };
}

/** GET the snapshot and lift its pending_elicitations into the inbox
 *  shape. Never throws. */
export async function listPendingElicitations(
  baseUrl: string,
  sessionId: string,
): Promise<PendingElicitationResult> {
  if (!sessionId || !sessionId.trim()) {
    return { success: false, requests: [], error: "sessionId is required" };
  }
  try {
    const { ok, status, body } = await fetchJson(
      `${trimTrailingSlash(baseUrl)}/v1/sessions/${encodeURIComponent(sessionId)}?include_items=true`,
    );
    if (!ok || typeof body !== "object" || body === null) {
      return {
        success: false,
        requests: [],
        error: `HTTP ${status ?? "unreachable"} from /v1/sessions/${sessionId}`,
      };
    }
    const pending = (body as Record<string, unknown>).pending_elicitations;
    const rows = Array.isArray(pending) ? pending : [];
    return {
      success: true,
      requests: rows
        .map(parseElicitation)
        .filter((r): r is PendingElicitation => r !== null),
    };
  } catch (err) {
    return { success: false, requests: [], error: String(err) };
  }
}

/** Deliver the human verdict to the resource-scoped resolve URL. This is
 *  the module's ONE write — the approval-inbox deliver path (contract
 *  row G). Never throws. */
export async function resolveElicitation(
  baseUrl: string,
  sessionId: string,
  elicitationId: string,
  verdict: { action: "accept" | "decline" | "cancel"; content?: unknown },
): Promise<GovernanceResolveResult> {
  if (!elicitationId || !elicitationId.trim()) {
    return { success: false, queued: null, error: "elicitationId is required" };
  }
  try {
    const fetchResult = await fetchJson(
      `${trimTrailingSlash(baseUrl)}/v1/sessions/${encodeURIComponent(sessionId)}/elicitations/${encodeURIComponent(elicitationId)}/resolve`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(verdict),
      },
    );
    const { ok, body, error: fetchError } = fetchResult;
    if (!ok) {
      return {
        success: false,
        queued: null,
        error: describeFailure(fetchResult, "/resolve"),
        // Preserve the original cause for the renderer's detail line.
        cause: fetchError,
      };
    }
    const queued =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).queued === true
        : null;
    return { success: true, queued };
  } catch (err) {
    return { success: false, queued: null, error: String(err) };
  }
}

function extractArray(
  body: unknown,
  keys: string[],
): Array<Record<string, unknown>> {
  if (typeof body !== "object" || body === null) return [];
  // Shape A: a top-level array ({data: [...]}, the paginated-list shape).
  const topData = (body as Record<string, unknown>).data;
  if (Array.isArray(topData)) {
    return topData as Array<Record<string, unknown>>;
  }
  // Shape B: named key at the top level.
  for (const key of keys) {
    const direct = Array.isArray((body as Record<string, unknown>)[key])
      ? ((body as Record<string, unknown>)[key] as Array<Record<string, unknown>>)
      : undefined;
    if (direct) return direct;
  }
  // Shape C: named key inside `data` ({data: {scheduled_tasks: [...]}}).
  if (typeof topData === "object" && topData !== null) {
    for (const key of keys) {
      const inner = (topData as Record<string, unknown>)[key];
      if (Array.isArray(inner)) {
        return inner as Array<Record<string, unknown>>;
      }
    }
  }
  return [];
}

/** The row-R4/row-G governance view: one stable join of scheduled tasks,
 *  the policy registry, and sharing. Older builds 404 individual
 *  surfaces — recorded in `errors`, never thrown. */
export async function listGovernanceSurfaces(
  baseUrl: string,
): Promise<{
  scheduledTasks: GovernanceSurfaceItem[];
  policies: Array<{ name: string; mode: string | null }>;
  shares: unknown[];
  errors: string[];
}> {
  const base = trimTrailingSlash(baseUrl);
  const errors: string[] = [];

  const [tasks, policies, sharing] = await Promise.all([
    fetchJson(`${base}/v1/scheduled_tasks`),
    fetchJson(`${base}/v1/policy-registry`),
    fetchJson(`${base}/v1/sharing`),
  ]);

  const scheduledTasks = extractArray(tasks.body, [
    "scheduled_tasks",
    "tasks",
  ]).map((raw) => ({
    id: asStringOrNull(raw.id),
    name: asStringOrNull(raw.name) ?? asStringOrNull(raw.id) ?? "(unnamed)",
    mode: asStringOrNull(raw.mode),
    nextRun:
      typeof raw.next_run === "number"
        ? raw.next_run
        : typeof raw.next_run_at === "number"
          ? (raw.next_run_at as number)
          : null,
  }));

  const policyRows: Array<{ name: string; mode: string | null }> = [];
  const policiesBody = policies.body;
  if (typeof policiesBody === "object" && policiesBody !== null) {
    const data = (policiesBody as Record<string, unknown>).data;
    const candidates: Array<Record<string, unknown>> = [];
    if (typeof data === "object" && data !== null) {
      const inner = (data as Record<string, unknown>).policies;
      if (Array.isArray(inner)) {
        candidates.push(...(inner as Array<Record<string, unknown>>));
      }
    } else if (Array.isArray(policiesBody)) {
      candidates.push(...(policiesBody as Array<Record<string, unknown>>));
    }
    for (const raw of candidates) {
      const name = asStringOrNull(raw.name) ?? asStringOrNull(raw.id);
      if (!name) continue;
      policyRows.push({
        name,
        mode: asStringOrNull(raw.mode) ?? asStringOrNull(raw.state),
      });
    }
  }

  const shares = extractArray(sharing.body, ["shares", "sharings", "data"]);

  if (!tasks.ok && tasks.status !== null) errors.push(`scheduled_tasks HTTP ${tasks.status}`);
  if (!policies.ok && policies.status !== null) errors.push(`policy-registry HTTP ${policies.status}`);
  if (!sharing.ok && sharing.status !== null) errors.push(`sharing HTTP ${sharing.status}`);

  return { scheduledTasks, policies: policyRows, shares, errors };
}