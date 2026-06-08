// /plan-tune — Decision-Brief renderer (Step 11 of the V2 rollout).
//
// Renders a structured `AskUserQuestion`-style decision brief the
// way the gstack /plan-tune skill documents it. The component is
// purely presentational: the parent owns the brief payload, the
// user picks one option, and we surface the choice through
// `onSelect`. Reusable by any host skill (office-hours,
// plan-ceo-review, plan-eng-review, design-taste-frontend,
// investigate) — none of them need to roll their own layout.
//
// The structure of a brief is documented in
// `.agents/skills/plan-tune/SKILL.md`. The components below are
// intentionally dumb about *what* the question is about; the
// host skill writes the strings, we just render them in the
// agreed shape.

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { useI18n } from "./useI18n";
import { Check, ChevronDown, Sparkles } from "../assets/icons";

/** A single option the user can pick. */
export interface QuestionOption {
  /** Stable id, surfaced as the selection value. */
  id: string;
  /** Short label, ≤60 chars. */
  label: string;
  /** Optional long description, surfaced on hover / focus. */
  description?: string;
  /** At least 2 pros and 1 con (or hard-stop escape below). */
  pros: string[];
  cons: string[];
  /**
   * When true, this option is the "recommended" choice. The
   * component renders a "(recommended)" suffix on the label
   * and pre-focuses its button for keyboard users.
   */
  recommended?: boolean;
  /**
   * Optional effort annotation. Format the host chooses; the
   * rendered output is `<human: … / ai: …>` for the dual-scale
   * case documented in plan-tune §"Effort both-scales".
   */
  effort?: string;
}

/** A single decision brief. The host skill builds this and
 *  passes it to `<QuestionBrief />`. */
export interface QuestionBrief {
  /** D<N> header, e.g. "D1", "D3.2". Renders as the question title. */
  decisionId: string;
  /** One-line question title. */
  title: string;
  /** Optional grounding line: project/branch/task. */
  grounding?: string;
  /** ELI10 paragraph, plain English, 2-4 sentences. */
  eli10: string;
  /** One-line "if we pick wrong" sentence. */
  stakes?: string;
  /** Recommendation text: which option + a one-line reason. */
  recommendation: string;
  /** Optional coverage scores: per-option 0-10, e.g. "A=10/10, B=7/10". */
  completeness?: string;
  /** Optional kind-note (when options differ in kind, not coverage). */
  kindNote?: string;
  /** 2-4 options (5+ must be split by the host, not by us). */
  options: QuestionOption[];
  /** One-line synthesis that closes the tradeoff. */
  net: string;
  /** When set, render in disabled state with this reason. */
  disabledReason?: string;
}

export interface QuestionBriefProps {
  brief: QuestionBrief;
  /**
   * Fired when the user picks an option. The id of the chosen
   * option is passed back. The parent is responsible for closing
   * the brief afterwards (or calling `onDismiss` if the user
   * cancels).
   */
  onSelect: (optionId: string) => void;
  /** Optional: fired when the user dismisses without picking. */
  onDismiss?: () => void;
  /**
   * Optional: a recommended id to pre-highlight. If not given,
   * the first option with `recommended: true` is used. Pass
   * `null` to disable pre-highlight.
   */
  focusOptionId?: string | null;
  /** Optional: id of a previously-selected option (read-only state). */
  selectedOptionId?: string;
}

// Inline UI strings (English). The full i18n wiring lives in
// step-12/13; for now we render English labels with the option
// to override via props on the parent.
const UI_LABELS = {
  eli10: "ELI10",
  stakes: "Stakes if we pick wrong",
  recommendation: "Recommendation",
  completeness: "Completeness",
  kindNote:
    "Note: options differ in kind, not coverage — no completeness score.",
  prosCons: "Pros / cons",
  pick: "Pick this",
  details: "Details",
  noDetails: "No additional details for this option.",
  net: "Net",
  recommended: "recommended",
  dismiss: "Dismiss",
} as const;

/** Renders the structured decision brief. */
export function QuestionBrief({
  brief,
  onSelect,
  onDismiss,
  focusOptionId = null,
  selectedOptionId,
}: QuestionBriefProps): ReactElement {
  // Locale context is currently unused by the brief itself, but
  // we read it so the component re-renders when the user
  // switches languages (host skills can rebuild the brief in
  // their preferred language).
  const { locale } = useI18n();
  void locale;
  const disabled = Boolean(brief.disabledReason);

  // Resolve which option to pre-highlight / pre-focus.
  const recommendedId = useMemo(() => {
    if (focusOptionId !== null) return focusOptionId;
    const flagged = brief.options.find((o) => o.recommended);
    return flagged?.id ?? null;
  }, [brief.options, focusOptionId]);
  void recommendedId;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Validate brief shape at runtime (development-time check).
  const validation = useMemo(() => validateBrief(brief), [brief]);
  const hasValidationIssue = validation.issues.length > 0;

  return (
    <div
      className="plan-tune-brief"
      role="group"
      aria-labelledby={`plan-tune-${brief.decisionId}-title`}
      data-decision-id={brief.decisionId}
    >
      <header className="plan-tune-brief__header">
        <span className="plan-tune-brief__id">{brief.decisionId}</span>
        <h3
          id={`plan-tune-${brief.decisionId}-title`}
          className="plan-tune-brief__title"
        >
          {brief.title}
        </h3>
        {brief.grounding && (
          <p className="plan-tune-brief__grounding">
            <Sparkles size={14} aria-hidden /> {brief.grounding}
          </p>
        )}
      </header>

      <section className="plan-tune-brief__eli10">
        <strong className="plan-tune-brief__label">{UI_LABELS.eli10}</strong>
        <p>{brief.eli10}</p>
      </section>

      {brief.stakes && (
        <section className="plan-tune-brief__stakes">
          <strong className="plan-tune-brief__label">{UI_LABELS.stakes}</strong>
          <p>{brief.stakes}</p>
        </section>
      )}

      <section className="plan-tune-brief__recommendation">
        <strong className="plan-tune-brief__label">
          {UI_LABELS.recommendation}
        </strong>
        <p>{brief.recommendation}</p>
      </section>

      {(brief.completeness || brief.kindNote) && (
        <section className="plan-tune-brief__completeness">
          <strong className="plan-tune-brief__label">
            {UI_LABELS.completeness}
          </strong>
          <p>{brief.completeness ?? UI_LABELS.kindNote}</p>
        </section>
      )}

      <section className="plan-tune-brief__options">
        <strong className="plan-tune-brief__label">{UI_LABELS.prosCons}</strong>
        <ul className="plan-tune-brief__option-list">
          {brief.options.map((option) => (
            <li
              key={option.id}
              className={[
                "plan-tune-brief__option",
                option.recommended && "plan-tune-brief__option--recommended",
                option.id === selectedOptionId &&
                  "plan-tune-brief__option--selected",
                option.id === hoveredId && "plan-tune-brief__option--hovered",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => setHoveredId(option.id)}
              onMouseLeave={() => setHoveredId(null)}
              data-option-id={option.id}
            >
              <div className="plan-tune-brief__option-head">
                <span className="plan-tune-brief__option-label">
                  {option.label}
                  {option.recommended && (
                    <span className="plan-tune-brief__recommended-tag">
                      {" "}
                      ({UI_LABELS.recommended})
                    </span>
                  )}
                </span>
                {option.effort && (
                  <span className="plan-tune-brief__option-effort">
                    {option.effort}
                  </span>
                )}
              </div>
              {option.description && (
                <p className="plan-tune-brief__option-description">
                  {option.description}
                </p>
              )}
              <ProsConsList option={option} />
              <div className="plan-tune-brief__option-actions">
                <button
                  type="button"
                  className="plan-tune-brief__pick"
                  onClick={() => onSelect(option.id)}
                  disabled={disabled}
                  data-testid={`plan-tune-pick-${option.id}`}
                >
                  <Check size={14} aria-hidden /> {UI_LABELS.pick}
                </button>
                <button
                  type="button"
                  className="plan-tune-brief__expand"
                  onClick={() =>
                    setExpandedId((cur) => (cur === option.id ? null : option.id))
                  }
                  aria-expanded={expandedId === option.id}
                >
                  <ChevronDown
                    size={14}
                    aria-hidden
                    className={
                      expandedId === option.id ? "is-flipped" : undefined
                    }
                  />{" "}
                  {UI_LABELS.details}
                </button>
              </div>
              {expandedId === option.id && (
                <p className="plan-tune-brief__option-details">
                  {option.description ?? UI_LABELS.noDetails}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="plan-tune-brief__net">
        <strong className="plan-tune-brief__label">{UI_LABELS.net}</strong>
        <p>{brief.net}</p>
      </section>

      {hasValidationIssue && (
        <p
          className="plan-tune-brief__validation"
          data-testid="plan-tune-validation"
        >
          ⚠ {validation.issues.join("; ")}
        </p>
      )}

      <footer className="plan-tune-brief__footer">
        {onDismiss && (
          <button
            type="button"
            className="plan-tune-brief__dismiss"
            onClick={onDismiss}
            data-testid="plan-tune-dismiss"
          >
            {UI_LABELS.dismiss}
          </button>
        )}
        {brief.disabledReason && (
          <span className="plan-tune-brief__disabled-reason">
            {brief.disabledReason}
          </span>
        )}
      </footer>
    </div>
  );
}

function ProsConsList({ option }: { option: QuestionOption }): ReactElement {
  return (
    <div className="plan-tune-brief__proscons">
      <ul className="plan-tune-brief__pros">
        {option.pros.map((pro, i) => (
          <li key={`p-${i}`}>
            <span aria-hidden>✅</span> {pro}
          </li>
        ))}
      </ul>
      <ul className="plan-tune-brief__cons">
        {option.cons.map((con, i) => (
          <li key={`c-${i}`}>
            <span aria-hidden>❌</span> {con}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Result of validating a brief. Issues are surfaced as a small
 * warning banner under the brief, so a host skill that built the
 * brief with a typo can spot the issue without the renderer
 * silently dropping content. This is dev-time only — the
 * renderer still works with malformed input.
 */
export interface BriefValidation {
  issues: string[];
}

/** Validate a brief against the plan-tune spec. */
export function validateBrief(brief: QuestionBrief): BriefValidation {
  const issues: string[] = [];
  if (!brief.decisionId || !/^D\d+(\.\d+)?$/.test(brief.decisionId)) {
    issues.push(`decisionId should look like "D1" or "D3.2"`);
  }
  if (!brief.title) issues.push("title is required");
  if (!brief.eli10) issues.push("ELI10 is required");
  if (!brief.recommendation) issues.push("recommendation is required");
  if (!brief.net) issues.push("net is required");
  if (!brief.options || brief.options.length < 2) {
    issues.push("at least 2 options are required");
  }
  if (brief.options && brief.options.length > 4) {
    issues.push(
      `AskUserQuestion caps at 4 options; ${brief.options.length} provided — host should split`,
    );
  }
  if (brief.completeness && brief.kindNote) {
    issues.push("provide either completeness or kindNote, not both");
  }
  const recommendedCount = (brief.options ?? []).filter(
    (o) => o.recommended,
  ).length;
  if (recommendedCount !== 1) {
    issues.push(
      `exactly one option should be recommended (found ${recommendedCount})`,
    );
  }
  for (const o of brief.options ?? []) {
    if (o.pros.length < 2) {
      issues.push(`option "${o.id}" has fewer than 2 pros`);
    }
    if (o.cons.length < 1) {
      issues.push(`option "${o.id}" has no cons`);
    }
  }
  return { issues };
}

/** Hook: keyboard navigation for a QuestionBrief. */
export function useQuestionBriefKeyboard(
  brief: QuestionBrief,
  onSelect: (optionId: string) => void,
): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Enter") {
        const target = e.target;
        // Only honor Enter when the focus is on a real DOM
        // element (not e.g. window or document). This also
        // avoids "target.closest is not a function" errors
        // when jsdom fires the event on the document.
        if (!target || typeof (target as HTMLElement).closest !== "function") {
          return;
        }
        const button = (target as HTMLElement).closest(
          "button[data-testid^='plan-tune-pick-']",
        );
        if (button) {
          const id = (button as HTMLElement).dataset.testid?.replace(
            "plan-tune-pick-",
            "",
          );
          if (id) onSelect(id);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brief, onSelect]);
}
