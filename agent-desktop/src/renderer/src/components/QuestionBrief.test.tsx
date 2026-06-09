import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";

import { I18nProvider } from "./I18nProvider";
import {
  QuestionBrief,
  validateBrief,
  useQuestionBriefKeyboard,
  type QuestionBrief as QuestionBriefType,
  type QuestionOption,
} from "./QuestionBrief";

/**
 * V2 Step 11 — /plan-tune Decision-Brief renderer.
 *
 * The component is purely presentational: it takes a `brief`
 * payload, renders the D<N> / ELI10 / Recommendation / Pros-Cons
 * / Net structure documented in
 * `.agents/skills/plan-tune/SKILL.md`, and surfaces the user's
 * pick via `onSelect`. These tests pin the rendering of every
 * required field, the pros/cons/effort/recommended adornments,
 * the validation banner, and the keyboard hook.
 */

function makeOption(overrides: Partial<QuestionOption> = {}): QuestionOption {
  return {
    id: overrides.id ?? "a",
    label: overrides.label ?? "Option A",
    description: overrides.description,
    pros: overrides.pros ?? [
      "First concrete observable advantage at least 40 chars long.",
      "Second advantage of equal length to satisfy the spec rule.",
    ],
    cons: overrides.cons ?? [
      "An honest downside the user should weigh carefully.",
    ],
    recommended: overrides.recommended,
    effort: overrides.effort,
  };
}

function makeBrief(overrides: Partial<QuestionBriefType> = {}): QuestionBriefType {
  return {
    decisionId: overrides.decisionId ?? "D1",
    title: overrides.title ?? "Which data structure for the kanban graph?",
    grounding:
      overrides.grounding ??
      "Branch feature/kanban-graph, src/main/kanban.ts.",
    eli10:
      overrides.eli10 ??
      "Today the kanban module stores tasks as a flat list. We're going to add an in-memory index. The question is what data structure holds the index.",
    stakes:
      overrides.stakes ??
      "Wrong choice means every board render pays a constant-factor tax.",
    recommendation:
      overrides.recommendation ??
      "Map<TaskId, Set<TaskId>> — it's the only one with O(1) parent lookup.",
    completeness: overrides.completeness ?? "A=10/10, B=7/10, C=8/10",
    options: overrides.options ?? [
      makeOption({ id: "a", label: "Map<TaskId, Set<TaskId>>", recommended: true }),
      makeOption({
        id: "b",
        label: "Array<TaskId> sorted by parent id",
        pros: [
          "One allocation per task, best for cold start.",
          "Cache-friendly iteration when scanning children.",
        ],
      }),
      makeOption({
        id: "c",
        label: "Map<TaskId, Array<TaskId>> (unsorted children)",
      }),
    ],
    net:
      overrides.net ??
      "Pick A unless cold-start memory is your bottleneck, which it isn't here.",
    disabledReason: overrides.disabledReason,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

beforeEach(() => {
  // hermesAPI stub for the I18nProvider; we don't translate in
  // these tests, but the provider asks for the locale on mount.
  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: { getLocale: vi.fn().mockResolvedValue("en") },
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("<QuestionBrief /> — required fields", () => {
  it("renders the D<N> id, title, and grounding line", () => {
    renderWithProviders(
      <QuestionBrief brief={makeBrief()} onSelect={() => {}} />,
    );
    expect(screen.getByText("D1")).toBeTruthy();
    expect(
      screen.getByText("Which data structure for the kanban graph?"),
    ).toBeTruthy();
    expect(
      screen.getByText(/Branch feature\/kanban-graph, src\/main\/kanban\.ts\./),
    ).toBeTruthy();
  });

  it("renders ELI10, Stakes, Recommendation, Completeness, and Net", () => {
    renderWithProviders(
      <QuestionBrief brief={makeBrief()} onSelect={() => {}} />,
    );
    expect(screen.getByText(/Today the kanban module/)).toBeTruthy();
    expect(screen.getByText(/Wrong choice means/)).toBeTruthy();
    expect(screen.getByText(/Map<TaskId, Set<TaskId>> —/)).toBeTruthy();
    expect(screen.getByText("A=10/10, B=7/10, C=8/10")).toBeTruthy();
    expect(
      screen.getByText(/Pick A unless cold-start memory/),
    ).toBeTruthy();
  });

  it("renders the kindNote when completeness is absent", () => {
    const brief = makeBrief();
    delete (brief as { completeness?: string }).completeness;
    brief.kindNote =
      "Note: options differ in kind, not coverage — no completeness score.";
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    expect(
      screen.getByText(/options differ in kind, not coverage/),
    ).toBeTruthy();
  });
});

describe("<QuestionBrief /> — options", () => {
  it("renders one <li> per option with pros and cons", () => {
    renderWithProviders(
      <QuestionBrief brief={makeBrief()} onSelect={() => {}} />,
    );
    const items = document.querySelectorAll(".plan-tune-brief__option");
    expect(items).toHaveLength(3);
    // First option has the recommended tag
    expect(items[0].className).toContain(
      "plan-tune-brief__option--recommended",
    );
  });

  it("calls onSelect with the chosen option id when the user clicks Pick this", () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <QuestionBrief brief={makeBrief()} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByTestId("plan-tune-pick-b"));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("renders the effort annotation when an option has one", () => {
    const brief = makeBrief();
    brief.options = [
      makeOption({
        id: "a",
        recommended: true,
        effort: "(human: ~2 days / ai: ~15 min)",
      }),
      makeOption({ id: "b" }),
    ];
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    expect(
      screen.getByText("(human: ~2 days / ai: ~15 min)"),
    ).toBeTruthy();
  });

  it("toggles the details panel when the user clicks Details", () => {
    const brief = makeBrief();
    brief.options = [
      makeOption({
        id: "a",
        recommended: true,
        description: "Long-form reasoning for option A.",
      }),
      makeOption({ id: "b" }),
    ];
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    const expandButton = screen.getAllByRole("button", { name: /Details/i })[0];
    fireEvent.click(expandButton);
    // The details panel is the .plan-tune-brief__option-details
    // element. The description also shows in
    // .plan-tune-brief__option-description, so the rendered text
    // appears in two places — use a CSS-class-scoped query to
    // pin the toggle behaviour.
    const detail = document.querySelector(
      ".plan-tune-brief__option-details",
    );
    expect(detail).not.toBeNull();
    expect(detail?.textContent).toBe("Long-form reasoning for option A.");
  });
});

describe("<QuestionBrief /> — disabled + dismiss", () => {
  it("disables the Pick buttons when disabledReason is set", () => {
    const brief = makeBrief();
    brief.disabledReason = "Waiting for the human's input upstream.";
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button", { name: /Pick this/i });
    for (const b of buttons) {
      expect((b as HTMLButtonElement).disabled).toBe(true);
    }
    expect(
      screen.getByText("Waiting for the human's input upstream."),
    ).toBeTruthy();
  });

  it("calls onDismiss when the user clicks Dismiss", () => {
    const onDismiss = vi.fn();
    renderWithProviders(
      <QuestionBrief
        brief={makeBrief()}
        onSelect={() => {}}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByTestId("plan-tune-dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe("<QuestionBrief /> — validation banner", () => {
  it("shows no banner for a well-formed brief", () => {
    renderWithProviders(
      <QuestionBrief brief={makeBrief()} onSelect={() => {}} />,
    );
    expect(screen.queryByTestId("plan-tune-validation")).toBeNull();
  });

  it("flags a brief with the wrong decisionId format", () => {
    const brief = makeBrief();
    brief.decisionId = "decision-1";
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    const banner = screen.getByTestId("plan-tune-validation");
    expect(banner.textContent).toMatch(/decisionId/);
  });

  it("flags 5+ options (caller forgot to split)", () => {
    const brief = makeBrief();
    brief.options = [
      makeOption({ id: "a", recommended: true }),
      makeOption({ id: "b" }),
      makeOption({ id: "c" }),
      makeOption({ id: "d" }),
      makeOption({ id: "e" }),
    ];
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    const banner = screen.getByTestId("plan-tune-validation");
    expect(banner.textContent).toMatch(/caps at 4 options/);
  });

  it("flags when zero options are marked recommended", () => {
    const brief = makeBrief();
    brief.options = [
      makeOption({ id: "a" }),
      makeOption({ id: "b" }),
    ];
    renderWithProviders(<QuestionBrief brief={brief} onSelect={() => {}} />);
    const banner = screen.getByTestId("plan-tune-validation");
    expect(banner.textContent).toMatch(/recommended/);
  });
});

describe("validateBrief (pure)", () => {
  it("returns no issues for a well-formed brief", () => {
    const v = validateBrief(makeBrief());
    expect(v.issues).toEqual([]);
  });

  it("flags missing title", () => {
    const v = validateBrief(makeBrief({ title: "" }));
    expect(v.issues.some((i) => i.includes("title"))).toBe(true);
  });

  it("flags an option with fewer than 2 pros", () => {
    const brief = makeBrief({
      options: [
        makeOption({ id: "a", recommended: true, pros: ["only one"] }),
        makeOption({ id: "b" }),
      ],
    });
    const v = validateBrief(brief);
    expect(v.issues.some((i) => i.includes("a") && i.includes("pros"))).toBe(
      true,
    );
  });
});

describe("useQuestionBriefKeyboard", () => {
  it("invokes onSelect when Enter is pressed on a pick button", () => {
    const onSelect = vi.fn();
    function Harness(): React.ReactElement {
      const brief = makeBrief();
      useQuestionBriefKeyboard(brief, onSelect);
      return (
        <div>
          <button data-testid="plan-tune-pick-a">Pick A</button>
          <button data-testid="plan-tune-pick-b">Pick B</button>
        </div>
      );
    }
    render(<Harness />);
    const buttonA = screen.getByTestId("plan-tune-pick-a");
    buttonA.focus();
    act(() => {
      fireEvent.keyDown(buttonA, { key: "Enter" });
    });
    expect(onSelect).toHaveBeenCalledWith("a");
  });

  it("ignores Enter pressed outside any pick button", () => {
    const onSelect = vi.fn();
    function Harness(): React.ReactElement {
      const brief = makeBrief();
      useQuestionBriefKeyboard(brief, onSelect);
      return <div data-testid="outside">outside</div>;
    }
    render(<Harness />);
    act(() => {
      fireEvent.keyDown(window, { key: "Enter" });
    });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
