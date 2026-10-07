// Laya decision middlewares — DM1 of the decision-core replan
// (`docs/plans/2026-10-07-decision-core-governance-bench-replan.md` §D3.3).
//
// Two before_model slots over the Laya System-1 decision engine, both
// fail-open and toggle-gated (the chat path must never break because a
// middleware failed — the chain-wide rule):
//   1. layaGuard       — pre-LLM prompt screening (guard/moderation
//                        presets: choice verdict + ordinal severity, with
//                        confidence-gated abstention). Annotates the
//                        context; NEVER blocks by itself — the tool-policy
//                        middleware + governance approvals own blocking.
//   2. layaRoutingHint — advisory lane hint (annotate only; the runtime
//                        route middleware + registry own lane selection).
//
// The Laya entry point is INJECTED (`LayaDecideFn`) — in production the
// caller wires it to the `laya-mcp-server` MCP tools (via the desktop's
// MCP client) or a local `laya-serve` HTTP `/v1/systemone` call; in tests
// a stub. CI never loads checkpoints.
//
// Typed-decision semantics honored (Laya contract):
//   - values: enum members / integers / booleans (or null = abstention
//     under `minConf`)
//   - confidence: per-field, reported even for abstentions
//   - routing: { model, reason } metadata for the audit trail
//
// Cubecloud original work (2026). Distributed under the repo's dual license
// per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import type {
  BeforeModelMiddleware,
  BeforeModelContext,
  BeforeModelResult,
} from "./chat-middleware";

/** The injected Laya decision call (one forward pass). Production wiring:
 *  MCP tool `laya_decide` / `laya_preset(guard)` against the configured
 *  server. Tests stub it — checkpoints never load in CI. */
export type LayaDecideFn = (
  state: { message: string },
  schema: LayaQuestionSchema,
  options?: { preset?: string; minConfidence?: number },
) => Promise<LayaDecideResult>;

/** Laya's typed answer shape (subset the middlewares consume). */
export interface LayaDecideResult {
  /** Decided values per question; null = abstention under minConf. */
  values: Record<string, string | number | boolean | null>;
  /** Per-field confidence in [0,1] (reported even for abstentions). */
  confidence: Record<string, number>;
  probabilities: Record<string, number[]> | null;
  routing: { model: string; reason: string | null };
  latencyMs: number;
}

/** The one-question-per-property schema Laya's decide() projects. */
export interface LayaQuestionSchema {
  type: "object";
  properties: Record<
    string,
    | { type: "boolean" }
    | { type: "string"; enum: string[] }
    | { type: "integer"; minimum: number; maximum: number }
  >;
  required?: string[];
}

export interface LayaMiddlewareConfig {
  /** Master toggle (Settings-owned; off = skip, zero Laya calls). */
  enabled: boolean;
  /** Abstention threshold (0..1). A field below it comes back null. */
  minConf: number;
}

// ── Schema: the guard question set ─────────────────────────——

/** The guard question set (maps to Laya's `guard`/`moderation` presets:
 *  verdict = choice, severity = ordinal 0..3). */
export const GUARD_SCHEMA: LayaQuestionSchema = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["benign", "suspicious", "injection"] },
    severity: { type: "integer", minimum: 0, maximum: 3 },
  },
  required: ["verdict", "severity"],
};

/** The routing hint question set (advisory lane classification). */
export const ROUTE_SCHEMA: LayaQuestionSchema = {
  type: "object",
  properties: {
    lane: {
      type: "string",
      enum: ["hermes", "ironclaw", "openclaw", "raven", "workspace", "none"],
    },
  },
  required: ["lane"],
};

/** Severity >= this counts as "severe" in the audit annotation. */
const SEVERE_THRESHOLD = 2;

function lastUserContent(ctx: BeforeModelContext): string | null {
  for (let i = ctx.messages.length - 1; i >= 0; i--) {
    const m = ctx.messages[i];
    if (m && m.role === "user" && m.content) return m.content;
  }
  return null;
}

// ── Middleware: layaGuard (before_model) ─────────────────═════

/** Pre-LLM prompt screening. Fail-open: on any skip/error the messages
 *  pass through unchanged and unannotated. The annotation is advisory —
 *  blocking stays with tool-policy + governance approvals. */
export function createLayaGuardMiddleware(
  config: LayaMiddlewareConfig,
  decide: LayaDecideFn,
): BeforeModelMiddleware {
  return async (ctx: BeforeModelContext): Promise<BeforeModelResult> => {
    if (!config.enabled) {
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-guard:skip(off)",
      };
    }
    const content = lastUserContent(ctx);
    if (!content) {
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-guard:skip(no-user-msg)",
      };
    }
    try {
      const result = await decide(
        { message: content },
        GUARD_SCHEMA,
        { preset: "guard", minConfidence: config.minConf },
      );
      const verdict = result.values.verdict;
      const severity = result.values.severity;
      if (verdict === null || verdict === undefined) {
        // Abstention — not confident enough to annotate; pass through.
        return {
          messages: ctx.messages,
          applied: false,
          label: `laya-guard:abstain(${result.confidence.verdict ?? "?"})`,
          stats: { abstained: true, latencyMs: result.latencyMs },
        };
      }
      const severe =
        typeof severity === "number" && severity >= SEVERE_THRESHOLD;
      return {
        // Fail-open: messages unchanged — annotation only.
        messages: ctx.messages,
        applied: true,
        label: `laya-guard:${verdict}${severe ? "+severe" : ""}`,
        stats: {
          verdict,
          severity: typeof severity === "number" ? severity : null,
          severe,
          confidence: result.confidence.verdict ?? null,
          routingModel: result.routing.model,
          latencyMs: result.latencyMs,
        },
      };
    } catch {
      // Fail-open: a Laya failure must never break the chat path.
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-guard:error",
      };
    }
  };
}

// ── Middleware: layaRoutingHint (before_model) ─────────────═════

/** Advisory lane hint. NEVER selects the lane — the runtime route
 *  middleware + harness registry own lane selection; this only
 *  annotates the context for the operator's trace. */
export function createLayaRoutingHintMiddleware(
  config: LayaMiddlewareConfig,
  decide: LayaDecideFn,
): BeforeModelMiddleware {
  return async (ctx: BeforeModelContext): Promise<BeforeModelResult> => {
    if (!config.enabled) {
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-route:skip(off)",
      };
    }
    const content = lastUserContent(ctx);
    if (!content) {
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-route:skip(no-user-msg)",
      };
    }
    try {
      const result = await decide(
        { message: content },
        ROUTE_SCHEMA,
        { minConfidence: config.minConf },
      );
      const lane = result.values.lane;
      if (typeof lane !== "string" || lane === "none") {
        return {
          messages: ctx.messages,
          applied: false,
          label: "laya-route:abstain",
          stats: { abstained: true, latencyMs: result.latencyMs },
        };
      }
      return {
        messages: ctx.messages,
        applied: true,
        label: `laya-route:${lane}`,
        stats: {
          suggestedLane: lane,
          confidence: result.confidence.lane ?? null,
          routingModel: result.routing.model,
          latencyMs: result.latencyMs,
        },
      };
    } catch {
      return {
        messages: ctx.messages,
        applied: false,
        label: "laya-route:error",
      };
    }
  };
}

// ── Chain composition (slots before the existing chain) ───═════

/** Build the DM1 Laya pair as the leading before_model middlewares. The
 *  caller composes it with the platform chain (tool-policy → memory → …):
 *  guard first, routing hint second — both no-ops when disabled. */
export function createLayaBeforeModelChain(
  config: { guard: LayaMiddlewareConfig; routing: LayaMiddlewareConfig },
  decide: LayaDecideFn,
): BeforeModelMiddleware[] {
  return [
    createLayaGuardMiddleware(config.guard, decide),
    createLayaRoutingHintMiddleware(config.routing, decide),
  ];
}