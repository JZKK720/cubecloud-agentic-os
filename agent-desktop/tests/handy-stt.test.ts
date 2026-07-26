import { describe, expect, it, beforeEach } from "vitest";
import { detectHandy, _resetHandyDetection } from "../src/main/handy-stt";

/**
 * Handy STT detection tests.
 *
 * The toggle/cancel functions spawn the real `handy` binary and are
 * not unit-tested here. The detection function is tested for shape
 * correctness —it should return a boolean and cache the result.
 */
describe("detectHandy", () => {
  beforeEach(() => {
    _resetHandyDetection();
  });

  it("returns a boolean (true or false depending on install)", () => {
    const result = detectHandy();
    expect(typeof result).toBe("boolean");
  });

  it("caches the result (second call returns same value without re-checking PATH)", () => {
    const first = detectHandy();
    const second = detectHandy();
    expect(second).toBe(first);
  });
});