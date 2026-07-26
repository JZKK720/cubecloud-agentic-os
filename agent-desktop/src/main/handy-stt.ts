/**
 * Handy local-first STT detection and control.
 *
 * Cubecloud-original work (2026). Distributed under the dual
 * license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
 * see `BRANDING_AND_LICENSE.md` for the per-path provenance
 * breakdown.
 *
 * Background:
 *   Handy (https://github.com/cjpais/Handy) is a free, open-source,
 *   completely offline speech-to-text application. It runs Whisper
 *   models locally (GGML/GGUF or Parakeet V3) with Silero VAD —no
 *   API keys, no cloud, no audio leaving the machine.
 *
 *   Handy works as a companion application, not a library. It
 *   captures audio via a global shortcut, transcribes locally, and
 *   pastes the result into whatever text field has focus. The
 *   integration path for agent-desktop is:
 *
 *   1. User clicks the mic button in ChatInput → focus is on the
 *      textarea.
 *   2. Agent-desktop calls `handy --toggle-transcription` to start
 *      recording.
 *   3. User speaks.
 *   4. User clicks the mic button again → `handy --toggle-
 *      transcription` to stop.
 *   5. Handy transcribes locally and pastes into the focused
 *      textarea (the chat input).
 *   6. Text appears in the chat input —user edits before sending.
 *
 *   This is the primary STT path, honoring the "sovereign
 *   local-first, data-stays-in-house" framing. The cloud STT
 *   (voice-stt.ts with Groq/OpenAI) is a fallback for machines
 *   where Handy isn't installed.
 *
 * Design constraints:
 *   - Lazy PATH lookup —no hard dep on Handy being installed.
 *   - `detectHandy()` returns true/false. Cached after first call.
 *   - `toggleHandyTranscription()` spawns `handy --toggle-
 *     transcription`. Never throws —degrades to a no-op + error.
 *   - `cancelHandyTranscription()` spawns `handy --cancel`.
 *   - The CLI flags are sent to a running Handy instance via the
 *     single-instance plugin (Tauri). If Handy isn't running, the
 *     flag starts Handy with that action pending.
 */

import { spawnSync, exec } from "child_process";
import { getEnhancedPath } from "./installer";

/** Cached detection result. null = not yet checked. */
let handyDetected: boolean | null = null;

/**
 * Detect whether the Handy application is installed and on PATH.
 * Checks via `where` (Windows) or `which` (Unix). Caches the
 * result after the first call.
 */
export function detectHandy(): boolean {
  if (handyDetected !== null) return handyDetected;

  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const envPath = getEnhancedPath();
  try {
    const result = spawnSync(lookup, ["handy"], {
      encoding: "utf8",
      env: { ...process.env, PATH: envPath },
      timeout: 5000,
      windowsHide: true,
    });
    handyDetected =
      !result.error && result.status === 0 && !!result.stdout?.trim();
  } catch {
    handyDetected = false;
  }
  return handyDetected;
}

/**
 * Result of a Handy toggle/cancel command.
 */
export interface HandyToggleResult {
  /** true when the command was spawned without error. */
  success: boolean;
  /** Error message on failure, or null on success. */
  error: string | null;
}

/**
 * Toggle Handy transcription (start/stop recording). This is an
 * async fire-and-forget —the Handy app handles the actual recording
 * and transcription. The text will be pasted into the focused field
 * (the chat textarea) when transcription completes.
 *
 * Never throws —degrades to `{ success: false, error }`.
 */
export function toggleHandyTranscription(): Promise<HandyToggleResult> {
  return runHandyCommand(["--toggle-transcription"]);
}

/**
 * Cancel the current Handy operation (if recording, stops without
 * transcribing). Never throws.
 */
export function cancelHandyTranscription(): Promise<HandyToggleResult> {
  return runHandyCommand(["--cancel"]);
}

/**
 * Toggle Handy with post-processing enabled. Post-processing runs
 * an additional cleanup pass on the transcription. Never throws.
 */
export function toggleHandyPostProcess(): Promise<HandyToggleResult> {
  return runHandyCommand(["--toggle-post-process"]);
}

/**
 * Spawn `handy` with the given CLI flags. The flags are sent to a
 * running instance via Tauri's single-instance plugin. Returns a
 * promise that resolves when the spawn completes (not when
 * transcription finishes —that happens asynchronously in the Handy
 * app).
 */
function runHandyCommand(args: string[]): Promise<HandyToggleResult> {
  return new Promise((resolve) => {
    if (!detectHandy()) {
      resolve({
        success: false,
        error: "Handy is not installed. Install from https://github.com/cjpais/Handy or use cloud STT fallback.",
      });
      return;
    }

    const envPath = getEnhancedPath();
    try {
      const child = exec(
        `handy ${args.join(" ")}`,
        {
          env: { ...process.env, PATH: envPath },
          timeout: 10_000,
          windowsHide: true,
        },
        (err, _stdout, stderr) => {
          if (err) {
            // On some platforms the single-instance IPC exits non-zero
            // even on success (it signals "message sent" and quits).
            // Treat ECONNREFUSED / exit-with-no-stderr as success.
            if (!stderr?.trim() && err.message.includes("Command failed")) {
              resolve({ success: true, error: null });
            } else {
              resolve({
                success: false,
                error: (stderr?.trim() || err.message).slice(0, 200),
              });
            }
          } else {
            resolve({ success: true, error: null });
          }
        },
      );
      // Unref so the child doesn't keep the process alive.
      child.unref();
    } catch (err) {
      resolve({
        success: false,
        error: (err as Error).message?.slice(0, 200) ?? "Handy spawn failed",
      });
    }
  });
}

/**
 * Reset the detection cache. Exported for testing.
 */
export function _resetHandyDetection(): void {
  handyDetected = null;
}