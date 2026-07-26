/**
 * Voice speech-to-text (STT) transcription.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * Background:
 *   The desktop already has a `VOICE_TOOLS_OPENAI_KEY` config field
 *   (constants.ts → sectionVoiceStt) and Groq is configured as a
 *   provider. This module wires those config values to a real STT
 *   transcription pipeline so the chat composer mic button can
 *   record audio → send to the configured provider → get text back.
 *
 * Design constraints:
 *   - Provider is selected by which API key is available. Priority:
 *     Groq (fast, free tier, Whisper Large) → OpenAI (Whisper).
 *   - Audio is captured in the renderer (MediaRecorder API) and sent
 *     to the main process as a Buffer. The main process forwards it
 *     to the STT provider's API. Audio never touches disk.
 *   - Never throws — degrades to an error string the renderer can
 *     display.
 *   - No audio persistence: the buffer is discarded after
 *     transcription. No files, no temp dirs.
 *   - Config keys are read from the Hermes profile env (same as
 *     every other provider key in the desktop).
 */

import { readFileSync } from "fs";
import { join } from "path";
import { profileHome } from "./utils";

/**
 * Result of a voice transcription call.
 */
export interface VoiceTranscriptionResult {
  /** true when transcription succeeded. */
  success: boolean;
  /** Transcribed text (empty string on failure). */
  text: string;
  /** Error message on failure, or null on success. */
  error: string | null;
  /** Which provider was used, for the UI tooltip. */
  provider: "groq" | "openai" | null;
}

/**
 * Resolve the active STT provider from the profile env.
 * Returns the provider id and the API key, or null if no key is set.
 *
 * Pure-ish: reads the .env file but does not mutate. Exported for
 * unit testing.
 */
export function resolveSttProvider(
  profile?: string,
): { provider: "groq" | "openai"; apiKey: string } | null {
  const env = loadProfileEnv(profile);
  const groqKey = env.GROQ_API_KEY?.trim();
  if (groqKey) return { provider: "groq", apiKey: groqKey };
  const openaiKey = env.VOICE_TOOLS_OPENAI_KEY?.trim();
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };
  return null;
}

/**
 * Load env vars from the profile .env file. Returns a flat
 * Record<string, string>. Falls back to process.env for keys not
 * in the file. Pure-ish: reads the file but does not mutate.
 */
function loadProfileEnv(profile?: string): Record<string, string> {
  const env: Record<string, string> = {};
  // Start with process.env so system-wide keys work too.
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") env[k] = v;
  }
  // Overlay the profile .env file.
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
      // Strip surrounding quotes.
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch {
    // .env may not exist yet — that's fine, fall back to process.env.
  }
  return env;
}

/**
 * Transcribe an audio buffer using the configured STT provider.
 *
 * The audio buffer should be a WebM/Opus blob from MediaRecorder
 * (the renderer captures it). Both Groq and OpenAI accept this
 * format via their Whisper endpoints.
 *
 * Never throws — all failures degrade to `{ success: false, error }`.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  profile?: string,
): Promise<VoiceTranscriptionResult> {
  const provider = resolveSttProvider(profile);
  if (!provider) {
    return {
      success: false,
      text: "",
      error:
        "No STT API key configured. Set GROQ_API_KEY or VOICE_TOOLS_OPENAI_KEY in Settings.",
      provider: null,
    };
  }

  try {
    if (provider.provider === "groq") {
      return await transcribeWithGroq(audioBuffer, provider.apiKey);
    }
    return await transcribeWithOpenAI(audioBuffer, provider.apiKey);
  } catch (err) {
    const msg = (err as Error).message ?? "Transcription failed";
    return {
      success: false,
      text: "",
      error: msg.slice(0, 200),
      provider: provider.provider,
    };
  }
}

/**
 * Transcribe using Groq's Whisper API (OpenAI-compatible).
 * Groq is preferred — it's fast and has a free tier.
 */
async function transcribeWithGroq(
  audioBuffer: Buffer,
  apiKey: string,
): Promise<VoiceTranscriptionResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      success: false,
      text: "",
      error: `Groq STT failed (HTTP ${res.status}): ${body.slice(0, 120)}`,
      provider: "groq",
    };
  }

  const data = (await res.json()) as { text?: string };
  return {
    success: true,
    text: (data.text ?? "").trim(),
    error: null,
    provider: "groq",
  };
}

/**
 * Transcribe using OpenAI's Whisper API.
 */
async function transcribeWithOpenAI(
  audioBuffer: Buffer,
  apiKey: string,
): Promise<VoiceTranscriptionResult> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" });
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      success: false,
      text: "",
      error: `OpenAI STT failed (HTTP ${res.status}): ${body.slice(0, 120)}`,
      provider: "openai",
    };
  }

  const data = (await res.json()) as { text?: string };
  return {
    success: true,
    text: (data.text ?? "").trim(),
    error: null,
    provider: "openai",
  };
}