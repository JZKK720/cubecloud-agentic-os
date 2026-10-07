/**
 * DM2 — Approval pre-screening + skill-staging triage tests
 * (`src/main/decision-triage.ts`).
 *
 * Decision-core replan §D3.3 phase DM2: the two governance decision slots
 * over the Laya System-1 engine, both toggle-gated, with a typed audit log
 * (JSONL, mirroring the learnings.ts append precedent):
 *
 *   1. preScreenApproval(input, decide, config) — the governance-relay
 *      inbox gains a pre-screen: for a pending elicitation, Laya answers
 *      the P("needs human review") noul question + a risk ordinal; a
 *      confident low-risk answer returns `autoApprovable` (the console
 *      still requires explicit per-call operator action — never
 *      auto-approving by itself); abstention / high risk / toggle-off →
 *      human required.
 *   2. triageStagedSkill(candidate, decide, config) — the skills kit's
 *      staged proposals gain a typed triage: promote / hold / reject with
 *      confidence; abstention → hold.
 *   3. appendDecisionLog — the JSONL audit line (ts, slot, decision,
 *      confidence, fingerprint-only subject reference, no raw secret, no
 *      full prompt text — truncated).
 *
 * Deciders are INJECTED (same contract as DM1's LayaDecideFn); CI never
 * touches checkpoints or the filesystem unless the audit path is directed
 * into a tmp dir.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync, rmSync } from "fs";
import {
  preScreenApproval,
  triageStagedSkill,
  appendDecisionLog,
  readDecisionLog,
  type PreScreenDecision,
  type SkillTriageDecision,
  type LayaNoulDecideFn,
  type DecisionAuditEntry,
} from "../src/main/decision-triage";

const decideOk = vi.fn(
  async (): Promise<{ values: Record<string, string | number | boolean | null>; confidence: Record<string, number> }> => ({
    values: { needs_human: false, risk_level: 0 },
    confidence: { needs_human: 0.92, risk_level: 0.9 },
  }),
);

describe("preScreenApproval (DM2 slot 1)", () => {
  beforeEach(() => {
    vi.resetModules();
    decideOk.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const enabled = { enabled: true, minConf: 0.6, maxAutoRisk: 1 };

  it("confident low-risk → autoApprovable (operator still gates the action)", async () => {
    const decision = await preScreenApproval(
      {
        sessionId: "conv_1",
        elicitationId: "elicit_1",
        message: "Approve ls -la?",
        policyName: null,
      },
      decideOk,
      enabled,
    );
    expect(decision.decision).toBe("autoApprovable");
    expect(decision.needsHuman).toBe(false);
    expect(decision.riskLevel).toBe(0);
    expect(decision.confidence).toBeCloseTo(0.92, 5);
    expect(decideOk).toHaveBeenCalledTimes(1);
  });

  it("confident high-risk → human required", async () => {
    const decideHigh = vi.fn(
      async () => ({
        values: { needs_human: true, risk_level: 3 },
        confidence: { needs_human: 0.9, risk_level: 0.88 },
      }),
    );
    const decision = await preScreenApproval(
      { sessionId: "conv_1", elicitationId: "e2", message: "rm -rf /tmp", policyName: "dangerous-commands" },
      decideHigh,
      enabled,
    );
    expect(decision.decision).toBe("humanRequired");
    expect(decision.reason).toMatch(/needs_human|risk/i);
  });

  it("abstention (null values under minConf) → human required", async () => {
    const decideAbstain = vi.fn(
      async () => ({
        values: { needs_human: null, risk_level: null },
        confidence: { needs_human: 0.3, risk_level: 0.4 },
      }),
    );
    const decision = await preScreenApproval(
      { sessionId: "conv_1", elicitationId: "e3", message: "x", policyName: null },
      decideAbstain,
      enabled,
    );
    expect(decision.decision).toBe("humanRequired");
    expect(decision.reason).toMatch(/abstain/i);
  });

  it("toggle off → human required without calling Laya", async () => {
    const decision = await preScreenApproval(
      { sessionId: "c", elicitationId: "e", message: "m", policyName: null },
      decideOk,
      { enabled: false, minConf: 0.6, maxAutoRisk: 1 },
    );
    expect(decision.decision).toBe("humanRequired");
    expect(decision.reason).toMatch(/off/i);
    expect(decideOk).not.toHaveBeenCalled();
  });

  it("decision error → human required (fail-safe, not fail-open)", async () => {
    const decideErr = vi.fn(async () => {
      throw new Error("no models");
    });
    const decision = await preScreenApproval(
      { sessionId: "c", elicitationId: "e", message: "m", policyName: null },
      decideErr,
      enabled,
    );
    // Governance inverts the fail-open rule: an unavailable pre-screener
    // must NOT wave things through (fail-safe).
    expect(decision.decision).toBe("humanRequired");
    expect(decision.reason).toMatch(/error/i);
  });

  it("dangerous policy name forces human review regardless of Laya's answer", async () => {
    const decision = await preScreenApproval(
      { sessionId: "c", elicitationId: "e", message: "m", policyName: "high-stakes" },
      decideOk,
      { ...enabled, alwaysHumanPolicies: ["high-stakes"] },
    );
    expect(decision.decision).toBe("humanRequired");
    expect(decision.reason).toMatch(/high-stakes|policy/i);
    expect(decideOk).not.toHaveBeenCalled();
  });
});

describe("triageStagedSkill (DM2 slot 2)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const enabled = { enabled: true, minConf: 0.6 };

  it("confident promote → reorder the staging queue accordingly", async () => {
    const decidePromote = vi.fn(
      async () => ({
        values: { verdict: "promote", maturity: 2 },
        confidence: { verdict: 0.89, maturity: 0.85 },
      }),
    );
    const triage = await triageStagedSkill(
      { skillName: "pdf-notes", summary: "Extracts notes from PDFs" },
      decidePromote,
      enabled,
    );
    expect(triage.decision).toBe("promote");
    expect(triage.maturity).toBe(2);
    expect(triage.reason).toMatch(/verdict/i);
  });

  it("confident reject → reject with surfaced reason", async () => {
    const decideReject = vi.fn(
      async () => ({
        values: { verdict: "reject", maturity: 0 },
        confidence: { verdict: 0.9, maturity: 0.9 },
      }),
    );
    const triage = await triageStagedSkill(
      { skillName: "bad-skill", summary: "duplicates existing" },
      decideReject,
      enabled,
    );
    expect(triage.decision).toBe("reject");
  });

  it("abstention → hold (not reject)", async () => {
    const decideAbstain = vi.fn(
      async () => ({
        values: { verdict: null, maturity: null },
        confidence: { verdict: 0.4, maturity: 0.5 },
      }),
    );
    const triage = await triageStagedSkill(
      { skillName: "unsure", summary: "s" },
      decideAbstain,
      enabled,
    );
    expect(triage.decision).toBe("hold");
    expect(triage.reason).toMatch(/abstain/i);
  });

  it("toggle off → hold without a Laya call", async () => {
    const triage = await triageStagedSkill(
      { skillName: "s", summary: "m" },
      decideOk,
      { enabled: false, minConf: 0.6 },
    );
    expect(triage.decision).toBe("hold");
    expect(triage.reason).toMatch(/off/i);
    expect(decideOk).not.toHaveBeenCalled();
  });

  it("error → hold (skills are never rejected for a tooling failure)", async () => {
    const decideErr = vi.fn(async () => {
      throw new Error("laya down");
    });
    const triage = await triageStagedSkill(
      { skillName: "s", summary: "m" },
      decideErr,
      enabled,
    );
    expect(triage.decision).toBe("hold");
  });
});

describe("decision audit log (DM2)", () => {
  const auditPath = `${process.env.TEMP ?? "/tmp"}/dm2-decisions-test.jsonl`;

  beforeEach(() => {
    rmSync(auditPath, { force: true });
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appendDecisionLog writes JSONL entries with no raw prompt/secret", async () => {
    const entry = await appendDecisionLog(auditPath, {
      slot: "pre_screen",
      decision: "humanRequired",
      confidence: 0.31,
      subject: "conv_1/elicit_3",
      subjectKind: "elicitation",
      detail: "abstained under minConf",
    });
    expect(existsSync(auditPath)).toBe(true);
    const line = readFileSync(auditPath, "utf-8").trim();
    const parsed = JSON.parse(line) as DecisionAuditEntry;
    expect(parsed.slot).toBe("pre_screen");
    expect(parsed.ts).toBe(entry.ts);
    // No full prompt text: the detail field is a short reason, and there
    // is NO prompt/message field in the entry shape at all.
    expect(Object.keys(parsed)).not.toContain("message");
    expect(Object.keys(parsed)).not.toContain("prompt");
  });

  it("readDecisionLog returns the entries (typed)", async () => {
    await appendDecisionLog(auditPath, {
      slot: "skill_triage",
      decision: "promote",
      confidence: 0.9,
      subject: "pdf-notes",
      subjectKind: "skill",
      detail: "verdict promote",
    });
    await appendDecisionLog(auditPath, {
      slot: "skill_triage",
      decision: "hold",
      confidence: 0.4,
      subject: "unsure",
      subjectKind: "skill",
      detail: "abstained",
    });
    const entries = readDecisionLog(auditPath);
    expect(entries).toHaveLength(2);
    expect(entries[1]!.decision).toBe("hold");
  });

  it("corrupt/multiline JSONL tolerated (skips bad lines)", async () => {
    await appendDecisionLog(auditPath, {
      slot: "pre_screen",
      decision: "autoApprovable",
      confidence: 0.9,
      subject: "a/b",
      subjectKind: "elicitation",
      detail: "ok",
    });
    // Manually append garbage the parser must skip.
    const { appendFileSync } = await import("fs");
    appendFileSync(auditPath, '{"slot": "broken"\n', "utf-8");
    const entries = readDecisionLog(auditPath);
    expect(entries).toHaveLength(1);
  });
});