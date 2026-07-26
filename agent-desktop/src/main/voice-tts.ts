/**
 * Voice text-to-speech (TTS) synthesis.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * Background:
 *   The desktop already has a `tts` toolset toggle (tools.ts) and a
 *   `VOICE_TOOLS_OPENAI_KEY` config field whose hint says "For
 *   Whisper STT and TTS". This module wires that key to OpenAI's
 *   TTS API so the agent can speak responses aloud.
 *
 * Design constraints:
 *   - Uses OpenAI TTS (tts-1 model, hardcoded —no model picker).
 *     The same `VOICE_TOOLS_OPENAI_KEY` powers both STT and TTS.
 *   - Returns audio as a Buffer (MP3). The renderer plays it via
 *     an <audio> element or the Web Audio API. Audio never touches
 *     disk.
 *   - Never throws — degrades to an error string.
 *   - Bounded input length (4096 chars) to stay within OpenAI's
 *     TTS limit.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/**
 * Result of a TTS synthesis call.
 */
export interface VoiceTtsResult {
  /** true when synthesis succeeded. */
  success: boolean;
  /** MP3 audio buffer (empty on failure). */
  audio: Buffer | null;
  /** Error message on failure, or null on success. */
  error: string | null;
}

/** OpenAI TTS input limit. */
const MAX_INPUT_CHARS = 4096;

/**
 * Resolve the OpenAI API key for TTS from the profile env.
 * Uses `VOICE_TOOLS_OPENAI_KEY` (same key as STT).
 * Returns null if no key is set.
 */
export function resolveTtsApiKey(profile?: string): string | null {
  const env = loadProfileEnv(profile);
  return env.VOICE_TOOLS_OPENAI_KEY?.trim() || null;
}

/**
 * Load env vars from the profile .env file. Mirrors the same
 * pattern in voice-stt.ts.
 */
function loadProfileEnv(profile?: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") env[k] = v;
  }
  const envFile = join(profileHome(profile), ".env");
  try {
    const content = readFileSync(envFile, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    // .env may not exist — fall back to process.env.
  }
  return env;
}

/**
 * Synthesize text to speech using OpenAI TTS.
 *
 * Hardcoded to `tts-1` model with `nova` voice (clear, natural).
 * Returns an MP3 buffer. Never throws.
 *
 * @param text  The text to speak (truncated to 4096 chars).
 * @param voice Optional voice override: "alloy" | "echo" |
 *              "fable" | "onyx" | "nova" | "shimmer". Defaults to
 *              "nova".
 * @param profile Optional Hermes profile name.
 */
export async function synthesizeSpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova",
  profile?: string,
): Promise<VoiceTtsResult> {
  const apiKey = resolveTtsApiKey(profile);
  if (!apiKey) {
    return {
      success: false,
      audio: null,
      error:
        "No TTS API key configured. Set VOICE_TOOLS_OPENAI_KEY in Settings.",
    };
  }

  const truncated = text.slice(0, MAX_INPUT_CHARS);
  if (!truncated.trim()) {
    return {
      success: false,
      audio: null,
      error: "Nothing to speak —empty text.",
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice,
        input: truncated,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        success: false,
        audio: null,
        error: `OpenAI TTS failed (HTTP ${res.status}): ${body.slice(0, 120)}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    return {
      success: true,
      audio: Buffer.from(arrayBuffer),
      error: null,
    };
  } catch (err) {
    const msg = (err as Error).message ?? "TTS synthesis failed";
    return {
      success: false,
      audio: null,
      error: msg.slice(0, 200),
    };
  }
}