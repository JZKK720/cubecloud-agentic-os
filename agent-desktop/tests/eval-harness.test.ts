import { describe, expect, it } from "vitest";
import {
  scoreEvalResponse,
  DEFAULT_EVAL_CASES,
  type EvalCase,
} from "../src/main/eval-harness";

/**
 * Agent eval harness tests.
 *
 * The I/O wrapper (`runEvalSuite`) calls the live gateway and is
 * not unit-tested here. The pure scoring function
 * (`scoreEvalResponse`) is tested exhaustively.
 */
describe("scoreEvalResponse", () => {
  const testCase: EvalCase = {
    id: "test-1",
    description: "Test case",
    prompt: "ignored",
    expectedKeywords: ["hello", "world"],
    forbiddenKeywords: ["error", "fail"],
  };

  it("passes when an expected keyword is found and no forbidden keywords", () => {
    const result = scoreEvalResponse("Hello there, world!", testCase);
    expect(result.passed).toBe(true);
    expect(result.matchedKeywords).toContain("hello");
    expect(result.matchedKeywords).toContain("world");
    expect(result.violatedKeywords).toHaveLength(0);
  });

  it("passes with just one expected keyword (no forbidden)", () => {
    const result = scoreEvalResponse("Hello!", testCase);
    expect(result.passed).toBe(true);
    expect(result.matchedKeywords).toContain("hello");
  });

  it("fails when no expected keywords are found", () => {
    const result = scoreEvalResponse("Goodbye there", testCase);
    expect(result.passed).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it("fails when a forbidden keyword is present even if expected is found", () => {
    const result = scoreEvalResponse("Hello world, this is an error", testCase);
    expect(result.passed).toBe(false);
    expect(result.matchedKeywords).toContain("hello");
    expect(result.violatedKeywords).toContain("error");
  });

  it("is case-insensitive", () => {
    const result = scoreEvalResponse("HELLO WORLD", testCase);
    expect(result.passed).toBe(true);
    expect(result.matchedKeywords).toContain("hello");
  });

  it("handles empty response", () => {
    const result = scoreEvalResponse("", testCase);
    expect(result.passed).toBe(false);
    expect(result.matchedKeywords).toHaveLength(0);
  });

  it("handles case with no forbidden keywords", () => {
    const noForbidden: EvalCase = {
      id: "test-2",
      description: "No forbidden",
      prompt: "ignored",
      expectedKeywords: ["yes"],
    };
    const result = scoreEvalResponse("yes yes yes", noForbidden);
    expect(result.passed).toBe(true);
  });
});

describe("DEFAULT_EVAL_CASES", () => {
  it("ships at least 5 starter cases", () => {
    expect(DEFAULT_EVAL_CASES.length).toBeGreaterThanOrEqual(5);
  });

  it("every case has a unique id", () => {
    const ids = DEFAULT_EVAL_CASES.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every case has at least one expected keyword", () => {
    for (const c of DEFAULT_EVAL_CASES) {
      expect(c.expectedKeywords.length).toBeGreaterThan(0);
    }
  });

  it("safety-refusal case has forbidden keywords", () => {
    const safety = DEFAULT_EVAL_CASES.find((c) => c.id === "safety-refusal");
    expect(safety).toBeDefined();
    expect(safety!.forbiddenKeywords).toBeDefined();
    expect(safety!.forbiddenKeywords!.length).toBeGreaterThan(0);
  });
});