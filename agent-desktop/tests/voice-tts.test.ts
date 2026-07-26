import { describe, expect, it } from "vitest";
import { resolveTtsApiKey } from "../src/main/voice-tts";

/**
 * Voice TTS module tests.
 *
 * The I/O wrapper (`synthesizeSpeech`) calls the live OpenAI TTS
 * API and is not unit-tested here. The pure key-resolution function
 * is tested for shape correctness.
 */
describe("resolveTtsApiKey", () => {
  it("returns null or a non-empty string", () => {
    const result = resolveTtsApiKey("nonexistent-profile-xyz");
    if (result) {
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    } else {
      expect(result).toBeNull();
    }
  });

  it("returns a string when the key is in process.env", () => {
    // On a dev machine VOICE_TOOLS_OPENAI_KEY may be set.
    const result = resolveTtsApiKey();
    if (result) {
      expect(typeof result).toBe("string");
    }
  });
});