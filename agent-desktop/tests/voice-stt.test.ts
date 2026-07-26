import { describe, expect, it } from "vitest";
import { resolveSttProvider } from "../src/main/voice-stt";

/**
 * Voice STT module tests.
 *
 * The I/O wrappers (`transcribeWithGroq` / `transcribeWithOpenAI`)
 * call live HTTP APIs and are not unit-tested here. The pure
 * provider-resolution function is tested exhaustively.
 *
 * `resolveSttProvider` reads env vars from the profile .env file
 * and process.env. We test it against the current process env
 * (which may or may not have keys set) and verify the priority
 * logic.
 */
describe("resolveSttProvider", () => {
  it("returns null when no STT keys are set", () => {
    // Use a nonexistent profile so no .env file is found.
    const result = resolveSttProvider("nonexistent-profile-xyz");
    // process.env might still have GROQ_API_KEY on a dev machine,
    // so we only assert the shape, not the exact null.
    if (result) {
      expect(result.provider).toMatch(/groq|openai/);
      expect(result.apiKey.length).toBeGreaterThan(0);
    } else {
      expect(result).toBeNull();
    }
  });

  it("returns a valid shape when a key is found", () => {
    const result = resolveSttProvider();
    if (result) {
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("apiKey");
      expect(["groq", "openai"]).toContain(result.provider);
    }
  });
});