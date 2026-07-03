import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash, Refresh, Sparkles, Alert, Check } from "../../assets/icons";
import { useI18n } from "../../components/useI18n";
interface PlanStep {
  id: string;
  title: string;
  body: string;
  owner: string | null;
  dependsOn: string[];
  skills: string[];
  tags: string[];
}

interface PlanShape {
  id: string;
  title: string;
  markdown: string;
  steps: PlanStep[];
  createdAt: string;
  dispatchedAt: string | null;
}

interface DispatchResult {
  planId: string;
  dispatchedAt: string;
  stepResults: Array<{
    stepId: string;
    taskId: string | null;
    error: string | null;
  }>;
  careful?: {
    stepId: string;
    command: string;
    verdict: "warn" | "block";
    reason: string;
  };
}

interface BriefAnswer {
  stepId: string;
  decisionId: string;
  selection: number;
  note?: string;
}

interface PlanTuneBrief {
  decisionId: string;
  title: string;
  eli10: string;
  stakes?: string;
  recommendation: string;
  stepId: string;
  blockOffset: number;
}

interface StepBriefs {
  stepId: string;
  briefs: PlanTuneBrief[];
}

interface PlansProps {
  profile?: string;
  visible?: boolean;
}

const SAMPLE_PLAN = `# Welcome plan

This is a starter plan to help you shape ideas into actionable steps. Edit
the markdown below and click **Parse** to refresh the step list.

## Overview
A quick tour of the orchestrator surface. We use plain markdown: every
\##\` heading becomes a step. Use the \`Owner:\` and \`Depends on:\` lines
to attach ownership and ordering. Tags like \`#mvp\` are surfaced as
filters on the board.

## Set up the welcome screen
Owner: joey
This is a small step that wires the welcome dialog into the onboarding
flow. The first run should seed the dials from the design-taste-frontend
skill #mvp.

## Wire the dial sliders
Depends on: Set up the welcome screen
We persist variance / motion / density to a JSON file under the profile
and inject them into the system prompt. The setter takes \`Partial<DesignDials>\`.

## Roll the welcome modal into the layout
The modal should be one of the surfaces the user can dismiss-and-remember
per profile.
`;

function Plans({ profile, visible }: PlansProps): React.JSX.Element {
  const { t } = useI18n();
  const [plans, setPlans] = useState<PlanShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftMarkdown, setDraftMarkdown] = useState(SAMPLE_PLAN);
  const [parsed, setParsed] = useState<PlanShape | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dispatchResult, setDispatchResult] =
    useState<DispatchResult | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // V2 — Briefs (autoplan) + careful precheck
  const [briefs, setBriefs] = useState<StepBriefs[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, BriefAnswer>>({});
  const [briefsApplied, setBriefsApplied] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const list = await window.hermesAPI.plansList(profile);
      setPlans(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [profile]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // When the user navigates to the pane, refetch the list.
  useEffect(() => {
    if (visible) void reload();
  }, [visible, reload]);

  const handleParse = useCallback(async (): Promise<void> => {
    setBusy(true);
    setParseError(null);
    try {
      const result = await window.hermesAPI.plansParse(
        draftTitle,
        draftMarkdown,
      );
      setParsed(result as PlanShape);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [draftTitle, draftMarkdown]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const saved = (await window.hermesAPI.plansSave(
        parsed,
        profile,
      )) as PlanShape;
      setParsed(null);
      setDraftTitle("");
      setDraftMarkdown(SAMPLE_PLAN);
      await reload();
      setSelectedId(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, [parsed, profile, reload]);

  const handleDelete = useCallback(
    async (id: string): Promise<void> => {
      if (
        !window.confirm(t("plans.confirmDelete"))
      ) {
        return;
      }
      setBusy(true);
      try {
        await window.hermesAPI.plansDelete(id, profile);
        if (selectedId === id) setSelectedId(null);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [profile, reload, selectedId, t],
  );

  const handleDispatch = useCallback(
    async (id: string): Promise<void> => {
      setBusy(true);
      setDispatchError(null);
      setDispatchResult(null);
      try {
        const res = (await window.hermesAPI.plansDispatch(
          id,
          profile,
        )) as DispatchResult;
        setDispatchResult(res);
        await reload();
      } catch (err) {
        setDispatchError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [profile, reload],
  );

  const handleBuildBriefs = useCallback(
    async (id: string): Promise<void> => {
      setBusy(true);
      setError(null);
      try {
        const list = (await window.hermesAPI.autoplanBuildBriefs(
          id,
          profile,
        )) as StepBriefs[];
        setBriefs(list);
        // Reset any previous answers
        const next: Record<string, BriefAnswer> = {};
        for (const sb of list) {
          for (const b of sb.briefs) {
            next[`${sb.stepId}::${b.decisionId}`] = {
              stepId: sb.stepId,
              decisionId: b.decisionId,
              selection: 0,
            };
          }
        }
        setAnswers(next);
        setBriefsApplied(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [profile],
  );

  const handleApplyAnswers = useCallback(
    async (plan: PlanShape): Promise<void> => {
      if (!briefs) return;
      setBusy(true);
      setError(null);
      try {
        // Build a body map: step.id -> updated body
        const stepBodies = new Map<string, string>();
        for (const sb of briefs) {
          const step = plan.steps.find((s) => s.id === sb.stepId);
          if (!step) continue;
          const lines: string[] = [step.body];
          for (const b of sb.briefs) {
            const key = `${sb.stepId}::${b.decisionId}`;
            const ans = answers[key];
            if (!ans) continue;
            // Simple textual answer: just the selection index label
            // (e.g. "Answer: option 0"). A more elaborate renderer
            // would resolve to a per-brief shape; we keep the
            // interface minimal here.
            lines.push(
              `\n\n## Answers\n\n- **${b.decisionId}**: selection ${ans.selection}${ans.note ? ` — ${ans.note}` : ""}`,
            );
          }
          stepBodies.set(sb.stepId, lines.join(""));
        }
        // Stitch back into plan markdown (append `## Answers` blocks
        // to each affected step heading section). For simplicity, we
        // re-call the main-process `applyBriefAnswers` via a small
        // hack: pass the answers as a serialized JSON blob to the
        // autoplanApplyAnswers IPC, but since that doesn't exist
        // yet, fall back to rewriting locally and saving.
        let newMarkdown = plan.markdown;
        for (const [stepId, body] of stepBodies) {
          // Replace the first occurrence of "## <stepId>" block.
          const re = new RegExp(
            `(##\\s+${stepId}[^\\n]*\\n)([\\s\\S]*?)(?=\\n##\\s|$)`,
            "m",
          );
          newMarkdown = newMarkdown.replace(re, (_m, head) => {
            return `${head}${body}\n`;
          });
        }
        const updated: PlanShape = {
          ...plan,
          markdown: newMarkdown,
        };
        const saved = (await window.hermesAPI.plansSave(
          updated,
          profile,
        )) as PlanShape;
        await reload();
        setSelectedId(saved.id);
        setBriefsApplied(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [briefs, answers, profile, reload],
  );

  const selected = useMemo<PlanShape | null>(
    () => plans.find((p) => p.id === selectedId) ?? null,
    [plans, selectedId],
  );

  return (
    <div className="plans-root">
      <header className="plans-header">
        <div className="plans-title-block">
          <h2>{t("plans.title")}</h2>
          <p className="plans-subtitle">{t("plans.subtitle")}</p>
        </div>
        <button
          className="plans-refresh"
          type="button"
          onClick={() => void reload()}
          title={t("common.refresh")}
        >
          <Refresh size={14} /> {t("common.refresh")}
        </button>
      </header>

      {error && (
        <div className="plans-error">
          <Alert size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="plans-body">
        <aside className="plans-sidebar">
          <section className="plans-list">
            <h3 className="plans-section-title">{t("plans.savedPlans")}</h3>
            {plans.length === 0 && (
              <p className="plans-empty">{t("plans.empty")}</p>
            )}
            <ul>
              {plans.map((p) => (
                <li
                  key={p.id}
                  className={`plans-item ${
                    p.id === selectedId ? "active" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="plans-item-button"
                    onClick={() => setSelectedId(p.id)}
                  >
                    <span className="plans-item-title">{p.title}</span>
                    <span className="plans-item-meta">
                      {p.steps.length}{" "}
                      {p.steps.length === 1
                        ? t("plans.stepSingular")
                        : t("plans.stepPlural")}
                      {p.dispatchedAt && (
                        <>
                          {" · "}
                          <Check size={11} /> {t("plans.dispatched")}
                        </>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="plans-composer">
            <h3 className="plans-section-title">{t("plans.composer")}</h3>
            <input
              className="plans-title-input"
              type="text"
              placeholder={t("plans.titlePlaceholder")}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
            />
            <textarea
              className="plans-markdown"
              rows={10}
              value={draftMarkdown}
              onChange={(e) => setDraftMarkdown(e.target.value)}
              spellCheck={false}
            />
            <div className="plans-composer-actions">
              <button
                type="button"
                className="plans-parse"
                onClick={() => void handleParse()}
                disabled={busy || !draftMarkdown.trim()}
              >
                <Sparkles size={13} /> {t("plans.parse")}
              </button>
              <button
                type="button"
                className="plans-save"
                onClick={() => void handleSave()}
                disabled={busy || !parsed}
              >
                <Plus size={13} /> {t("plans.save")}
              </button>
            </div>
            {parseError && (
              <p className="plans-error-inline">
                <Alert size={12} /> {parseError}
              </p>
            )}
            {parsed && (
              <div className="plans-parsed">
                <p>
                  <strong>{t("plans.parsedSteps")}:</strong>{" "}
                  {parsed.steps.length}
                </p>
                <ol>
                  {parsed.steps.map((s) => (
                    <li key={s.id}>
                      <span className="plans-step-title">{s.title}</span>
                      {s.owner && (
                        <span className="plans-step-owner"> · {s.owner}</span>
                      )}
                      {s.dependsOn.length > 0 && (
                        <span className="plans-step-deps">
                          {" "}
                          ↳ {s.dependsOn.join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        </aside>

        <main className="plans-detail">
          {selected ? (
            <div className="plans-detail-content">
              <header className="plans-detail-header">
                <h3>{selected.title}</h3>
                <div className="plans-detail-actions">
                  <button
                    type="button"
                    className="plans-briefs-scan"
                    onClick={() => void handleBuildBriefs(selected.id)}
                    disabled={busy}
                    title={t("plans.briefsTitle")}
                  >
                    {t("plans.buildBriefs")}
                  </button>
                  <button
                    type="button"
                    className="plans-dispatch"
                    onClick={() => void handleDispatch(selected.id)}
                    disabled={busy}
                  >
                    {t("plans.dispatch")}
                  </button>
                  <button
                    type="button"
                    className="plans-delete"
                    onClick={() => void handleDelete(selected.id)}
                    disabled={busy}
                  >
                    <Trash size={12} /> {t("common.delete")}
                  </button>
                </div>
              </header>
              {selected.dispatchedAt && (
                <p className="plans-meta">
                  {t("plans.dispatchedAt", {
                    when: new Date(selected.dispatchedAt).toLocaleString(),
                  })}
                </p>
              )}
              <ol className="plans-steps">
                {selected.steps.map((s) => (
                  <li key={s.id} className="plans-step">
                    <div className="plans-step-head">
                      <span className="plans-step-id">{s.id}</span>
                      <span className="plans-step-title">{s.title}</span>
                      {s.owner && (
                        <span className="plans-step-owner">
                          {t("plans.owner", { name: s.owner })}
                        </span>
                      )}
                    </div>
                    {s.body && (
                      <pre className="plans-step-body">{s.body}</pre>
                    )}
                    {(s.skills.length > 0 || s.tags.length > 0) && (
                      <div className="plans-step-tags">
                        {s.skills.map((skill) => (
                          <span
                            key={skill}
                            className="plans-pill plans-pill-skill"
                          >
                            {skill}
                          </span>
                        ))}
                        {s.tags.map((tag) => (
                          <span
                            key={tag}
                            className="plans-pill plans-pill-tag"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.dependsOn.length > 0 && (
                      <p className="plans-step-deps">
                        {t("plans.dependsOn", {
                          ids: s.dependsOn.join(", "),
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
              {briefs && briefs.length > 0 && (
                <div className="plans-briefs">
                  <h4>{t("plans.briefsTitle")}</h4>
                  <p className="plans-briefs-hint">
                    {t("plans.briefsHint")}
                  </p>
                  {briefs.map((sb) =>
                    sb.briefs.length === 0 ? null : (
                      <div
                        key={sb.stepId}
                        className="plans-briefs-step"
                      >
                        <div className="plans-briefs-step-label">
                          {sb.stepId}
                        </div>
                        {sb.briefs.map((b) => {
                          const key = `${sb.stepId}::${b.decisionId}`;
                          const ans = answers[key] ?? {
                            stepId: sb.stepId,
                            decisionId: b.decisionId,
                            selection: 0,
                          };
                          return (
                            <div
                              key={b.decisionId}
                              className="plans-brief-card"
                            >
                              <div className="plans-brief-card-head">
                                <code className="plans-brief-id">
                                  {b.decisionId}
                                </code>
                                <strong>{b.title}</strong>
                              </div>
                              <p className="plans-brief-eli10">{b.eli10}</p>
                              {b.stakes && (
                                <p className="plans-brief-stakes">
                                  <em>Stakes:</em> {b.stakes}
                                </p>
                              )}
                              <p className="plans-brief-rec">
                                <strong>Recommendation:</strong>{" "}
                                {b.recommendation}
                              </p>
                              <div className="plans-brief-form">
                                <label>
                                  <span>{t("plans.briefRequired")}</span>
                                  <input
                                    type="text"
                                    value={ans.note ?? ""}
                                    placeholder="e.g. 0"
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setAnswers((prev) => ({
                                        ...prev,
                                        [key]: {
                                          ...ans,
                                          selection: Number(v) || 0,
                                          note: v,
                                        },
                                      }));
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ),
                  )}
                  <div className="plans-briefs-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => void handleApplyAnswers(selected)}
                      disabled={
                        busy ||
                        !briefs.some((sb) => sb.briefs.length > 0)
                      }
                    >
                      {t("plans.applyAnswers")}
                    </button>
                    {briefsApplied && (
                      <span className="plans-briefs-applied">
                        <Check size={12} /> {t("plans.answersApplied")}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {dispatchResult?.careful && (
                <div
                  className={`plans-careful plans-careful-${dispatchResult.careful.verdict}`}
                >
                  <div className="plans-careful-head">
                    <Alert size={14} />{" "}
                    <strong>{t("plans.carefulWarning")}</strong>
                  </div>
                  <p>
                    {t("plans.carefulVerdict", {
                      verdict: dispatchResult.careful.verdict,
                    })}
                  </p>
                  <p>
                    <code>{dispatchResult.careful.command}</code>
                  </p>
                  <p>
                    {t("plans.carefulReason", {
                      reason: dispatchResult.careful.reason,
                    })}
                  </p>
                </div>
              )}
              {dispatchResult && (
                <div className="plans-dispatch-result">
                  <h4>{t("plans.dispatchResult")}</h4>
                  <p>
                    {t("plans.dispatchResultSummary", {
                      count: dispatchResult.stepResults.length,
                    })}
                  </p>
                  <ul>
                    {dispatchResult.stepResults.map((r) => (
                      <li key={r.stepId}>
                        <span className="plans-step-id">{r.stepId}</span>{" "}
                        {r.taskId ?? t("plans.noTaskId")}
                        {r.error && (
                          <span className="plans-step-error"> · {r.error}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {dispatchError && (
                <p className="plans-error-inline">
                  <Alert size={12} /> {dispatchError}
                </p>
              )}
            </div>
          ) : (
            <div className="plans-empty-detail">
              <Sparkles size={24} />
              <p>{t("plans.emptyDetail")}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Plans;
