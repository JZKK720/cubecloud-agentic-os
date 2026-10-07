// Decision triage — DM2 of the decision-core replan
// (`docs/plans/2026-10-07-decision-core-governance-bench-replan.md` §D3.3):
// the two governance decision slots over the Laya System-1 engine, plus
// the typed decision audit log.
//
//   1. preScreenApproval — the governance-relay inbox gains a pre-screen:
//      Laya answers P("needs human review") (noul) + an ordinal risk
//      level; a confident low-risk answer marks the request
//      `autoApprovable`. The console NEVER auto-approves by itself —
//      "autoApprovable" only reorders/highlights the operator's inbox;
//      the human verdict (P6 resolveElicitation) remains the only path
//      that delivers anything to the workspace.
//      **Fail-safe, not fail-open**: an unavailable pre-screener errs to
//      "humanRequired" (approval governance must not wave things through).
//   2. triageStagedSkill — the skills bundle kit's staged proposals
//      (SkillOpt-Sleep lineage) gain a typed triage: promote / hold /

//      reject with confidence + an optional maturity ordinal (maps onto
//      the EverOS agent_skill confidence/maturity fields if that
//      promotion surface is ever adopted). Abstention → hold; errors →
//      hold (a tooling failure never rejects a skill).
//   3. appendDecisionLog / readDecisionLog — the JSONL audit trail
//      (appendFileSync convention mirroring learnings.ts): ts, slot,
//      decision, confidence, subject reference + kind, short detail.
//      Deliberately NO prompt/message/secret fields — the subject is a
//      reference, the detail is a reason; prompts never enter logs.
//
// The decider is INJECTED (same shape discipline as DM1's LayaDecideFn);
// production wiring targets the laya-mcp-server / laya-serve; CI uses
// stubs and never loads checkpoints.
//
// Cubecloud original work (2026). Distributed under the repo's dual
// license per `LICENSE`; see `BRANDING_AND_LICENSE.md` for provenance.

import { appendFileSync, existsSync, readFileSync } from "fs";

export interface PreScreenConfig {
  /** Master toggle (Settings-owned; off = human required, zero calls). */
  enabled: boolean;
  /** Abstention threshold for every field (0..1). */
  minConf: number;
  /** Risk ordinals at or below this may be marked autoApprovable. */
  maxAutoRisk: number;
  /** Policy names that ALWAYS require a human, regardless of Laya. */
  alwaysHumanPolicies?: string[];
}

export interface PreScreenInput {
  sessionId: string;
  elicitationId: string;
  message: string;
  policyName: string | null;
}

export interface PreScreenDecision {
  decision: "autoApprovable" | "humanRequired";
  needsHuman: boolean;
  riskLevel: number | null;
  confidence: number | null;
  reason: string | null;
}

export type LayaNoulDecideFn = (
  state: { message: string },
  context?: { policyName?: string | null },
) => Promise<{
  values: Record<string, string | number | boolean | null>;
  confidence: Record<string, number>;
}>;

// ── Schema (documented for the production decide fn; the injected fn
//    receives the state, not the schema, so tests stay shape-free) ─────
export const PRESCREEN_SCHEMA = {
  type: "object",
  properties: {
    needs_human: { type: "boolean" },
    risk_level: { type: "integer", minimum: 0, maximum: 3 },
  },
  required: ["needs_human", "risk_level"],
} as const;

/** DM2 slot 1 — approval inbox pre-screen. Fail-safe (see module header). */
export async function preScreenApproval(
  input: PreScreenInput,
  decide: LayaNoulDecideFn,
  config: PreScreenConfig,
): Promise<PreScreenDecision> {
  const humanRequired = (reason: string, confidence: number | null = null): PreScreenDecision => ({
    decision: "humanRequired",
    needsHuman: true,
    riskLevel: null,
    confidence,
    reason,
  });

  if (!config.enabled) {
    return humanRequired("pre-screen off");
  }
  // Hard gate: dangerous policies always reach the human.
  if (
    input.policyName &&
    (config.alwaysHumanPolicies ?? []).includes(input.policyName)
  ) {
    return humanRequired(`policy ${input.policyName} always requires review`);
  }
  try {
    const result = await decide(
      { message: input.message },
      { policyName: input.policyName },
    );
    const needsHuman = result.values.needs_human;
    const risk = result.values.risk_level;
    const conf = result.confidence.needs_human ?? null;

    // Abstention (null values under minConf) — never wave through.
    if (needsHuman === null || needsHuman === undefined) {
      return humanRequired(
        `abstained under minConf ${config.minConf}`,
        typeof conf === "number" ? conf : null,
      );
    }
    if (conf !== null && conf < config.minConf) {
      return humanRequired(`confidence ${conf} below minConf`, conf);
    }
    const riskLevel = typeof risk === "number" ? risk : null;
    if (needsHuman === true) {
      return humanRequired("laya flagged needs_human", conf);
    }
    if (riskLevel !== null && riskLevel > config.maxAutoRisk) {
      return humanRequired(`risk ${riskLevel} exceeds maxAutoRisk ${config.maxAutoRisk}`, conf);
    }
    return {
      decision: "autoApprovable",
      needsHuman: false,
      riskLevel,
      confidence: conf,
      reason: null,
    };
  } catch (err) {
    return humanRequired(`pre-screen error: ${String(err).slice(0, 120)}`);
  }
}

// ── Skill triage ──────────────────────────────────────────────

export interface SkillTriageConfig {
  enabled: boolean;
  minConf: number;
}

export interface SkillTriageInput {
  skillName: string;
  summary: string;
}

export interface SkillTriageDecision {
  decision: "promote" | "hold" | "reject";
  maturity: number | null;
  confidence: number | null;
  reason: string | null;
}

export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["promote", "hold", "reject"] },
    maturity: { type: "integer", minimum: 0, maximum: 3 },
  },
  required: ["verdict", "maturity"],
} as const;

/** DM2 slot 2 — staged-skill triage. Abstention and errors hold
 *  (fail-safe for skills too: a tooling failure never rejects). */
export async function triageStagedSkill(
  input: SkillTriageInput,
  decide: (state: { message: string }) => Promise<{
    values: Record<string, string | number | boolean | null>;
    confidence: Record<string, number>;
  }>,
  config: SkillTriageConfig,
): Promise<SkillTriageDecision> {
  const hold = (reason: string, confidence: number | null = null): SkillTriageDecision => ({
    decision: "hold",
    maturity: null,
    confidence,
    reason,
  });
  if (!config.enabled) {
    return hold("skill triage off");
  }
  try {
    const result = await decide({
      message: `Skill: ${input.skillName}. Summary: ${input.summary}`,
    });
    const verdict = result.values.verdict;
    const maturity = result.values.maturity;
    const conf = result.confidence.verdict ?? null;
    if (typeof verdict !== "string") {
      return hold(`abstained under minConf ${config.minConf}`, conf);
    }
    if (conf !== null && conf < config.minConf) {
      return hold(`confidence ${conf} below minConf`, conf);
    }
    return {
      decision: verdict === "promote" || verdict === "reject" ? verdict : "hold",
      maturity: typeof maturity === "number" ? maturity : null,
      confidence: conf,
      reason: `verdict ${verdict}`,
    };
  } catch (err) {
    return hold(`triage error: ${String(err).slice(0, 120)}`);
  }
}

// ── Typed decision audit log (JSONL, learnings.ts convention) ─────────

export type DecisionSlot = "pre_screen" | "skill_triage";

export interface DecisionAuditEntry {
  ts: string;
  slot: DecisionSlot;
  decision: string;
  /** Confidence at decision time (null when abstained/unavailable). */
  confidence: number | null;
  /** Reference only — never the prompt text, never a secret. */
  subject: string;
  subjectKind: "elicitation" | "skill";
  detail: string | null;
}

/** Append one audit line. Synchronous append (hot-path convention from
 *  learnings.ts). Never throws to the caller — audit failure must not
 *  break the decision flow. */
export function appendDecisionLog(
  path: string,
  entry: Omit<DecisionAuditEntry, "ts"> & { ts?: string },
): DecisionAuditEntry {
  const record: DecisionAuditEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    slot: entry.slot,
    decision: entry.decision,
    confidence: entry.confidence,
    subject: entry.subject,
    subjectKind: entry.subjectKind,
    detail: entry.detail === null ? null : String(entry.detail).slice(0, 240),
  };
  try {
    appendFileSync(path, JSON.stringify(record) + "\n", "utf-8");
  } catch {
    /* audit best-effort; the decision still returns */
  }
  return record;
}

/** Read the audit log (typed, tolerant of corrupt lines). */
export function readDecisionLog(path: string): DecisionAuditEntry[] {
  if (!existsSync(path)) return [];
  const entries: DecisionAuditEntry[] = [];
  const raw = readFileSync(path, "utf-8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed) as DecisionAuditEntry;
      if (
        typeof parsed.ts === "string" &&
        typeof parsed.slot === "string" &&
        typeof parsed.decision === "string"
      ) {
        entries.push(parsed);
      }
    } catch {
      /* skip corrupt lines */
    }
  }
  return entries;
}