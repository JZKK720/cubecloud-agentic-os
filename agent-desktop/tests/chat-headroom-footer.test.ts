/**
 * Unit tests for the Headroom line in the chat usage
 * footer (src/renderer/src/screens/Chat/ChatHeader.tsx).
 *
 * `formatHeadroom` is the small pure function that turns
 * the `headroom` field on the `onChatUsage` payload into
 * a user-readable string. It's the only piece of the
 * chat header that's worth covering in isolation — the
 * rest is React markup that gets covered by snapshot /
 * integration tests in the renderer.
 */

import { describe, expect, it } from "vitest";
import { formatHeadroom } from "../src/renderer/src/screens/Chat/ChatHeader";

describe("formatHeadroom", () => {
  it("returns empty string when headroom is undefined", () => {
    expect(formatHeadroom(undefined)).toBe("");
  });

  it("renders compressed line with savings and provider", () => {
    const line = formatHeadroom({
      compressed: true,
      tokensBefore: 2400,
      tokensAfter: 600,
      savingsPercent: 75,
      compressMs: 12,
      providerHint: "local:ollama",
    });
    expect(line).toBe(
      "Headroom \u221275% (2,400 \u2192 600 tokens) on local Ollama",
    );
  });

  it("renders compressed line without provider when hint is empty", () => {
    const line = formatHeadroom({
      compressed: true,
      tokensBefore: 1000,
      tokensAfter: 200,
      savingsPercent: 80,
      compressMs: 5,
      providerHint: "",
    });
    expect(line).toBe("Headroom \u221280% (1,000 \u2192 200 tokens)");
  });

  it("renders remote provider hint lower-cased", () => {
    const line = formatHeadroom({
      compressed: true,
      tokensBefore: 5000,
      tokensAfter: 1500,
      savingsPercent: 70,
      compressMs: 20,
      providerHint: "anthropic",
    });
    expect(line).toBe(
      "Headroom \u221270% (5,000 \u2192 1,500 tokens) on anthropic",
    );
  });

  it("renders local provider hint capitalised", () => {
    for (const [hint, expected] of [
      ["local:ollama", "local Ollama"],
      ["local:vllm", "local Vllm"],
      ["local:llamacpp", "local Llamacpp"],
      ["local:lmstudio", "local Lmstudio"],
    ]) {
      const line = formatHeadroom({
        compressed: true,
        tokensBefore: 100,
        tokensAfter: 50,
        savingsPercent: 50,
        compressMs: 0,
        providerHint: hint,
      });
      expect(line).toContain(`on ${expected}`);
    }
  });

  it("renders skip reason when compression was not applied", () => {
    const line = formatHeadroom({
      compressed: false,
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressMs: 0,
      providerHint: "local:ollama",
      skipReason: "too-few-messages",
    });
    expect(line).toBe("Headroom skipped: too few messages");
  });

  it("renders error string when compress call failed", () => {
    const line = formatHeadroom({
      compressed: false,
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressMs: 1500,
      providerHint: "local:ollama",
      error: "compress-failed-or-timeout",
    });
    expect(line).toBe("Headroom error: compress-failed-or-timeout");
  });

  it("renders empty string for unknown skip reasons", () => {
    const line = formatHeadroom({
      compressed: false,
      tokensBefore: 0,
      tokensAfter: 0,
      savingsPercent: 0,
      compressMs: 0,
      providerHint: "openai",
      skipReason: "some-future-reason",
    });
    // Unknown skip reasons don't leak the token string to
    // the user. The footer simply omits the line.
    expect(line).toBe("");
  });

  it("formats large token counts with thousand separators", () => {
    const line = formatHeadroom({
      compressed: true,
      tokensBefore: 124_000,
      tokensAfter: 18_000,
      savingsPercent: 85,
      compressMs: 80,
      providerHint: "openai",
    });
    expect(line).toBe(
      "Headroom \u221285% (124,000 \u2192 18,000 tokens) on openai",
    );
  });
});
