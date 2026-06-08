// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Cubecloud-original pre-launch defaults — Workspace → EverOS tab.
//
// Three disabled EverOS harnesses shipped pre-installed. The
// user enables each one only after they have installed
// `everos` separately (the desktop does not bundle or install
// the sidecar). Disabled by default so the seed does not
// try to run a harness against a missing sidecar.
//
// The pre-launch bundle is documented in:
//   cubecloud-desktop/BRANDING_AND_LICENSE.md §"V2.9 transitions landed"
//   cubecloud-desktop/docs/HANDBOOK.md §"5.3 Adding a pre-installed harness"
//   .agents/skills/README.md (the developer-time skill index)

import type { EverOsHarness } from "@cubecloud/platform-core";

/**
 * Pre-installed (disabled) EverOS harnesses. Each is a
 * Cubecloud-original harness that runs against the
 * `everos server start` Python sidecar (user-installed
 * separately).
 *
 * Design rules:
 *   - `enabled: false` — user enables after installing
 *     `everos` and validating the sidecar is reachable.
 *   - `profile: "default"` — uses the user's default
 *     profile; user can change.
 *   - `scheduleId: null` — manual run; user can wire to
 *     a schedule after enabling.
 *   - `loopPrompt` is the prompt the harness sends to
 *     the agent runtime when the harness runs.
 *   - `memoryNamespace` is the EverOS memory namespace
 *     the harness reads/writes.
 */
export const DEFAULT_HARNESSES: EverOsHarness[] = [
  {
    id: "cubecloud-memory-distill",
    name: "Memory distillation (weekly)",
    description:
      "Reads last week's chat history and surfaces the 5 most " +
      "actionable items into the Memory tab. Run manually or on " +
      "a Sunday schedule.",
    memoryNamespace: "memory-distill",
    profile: "default",
    scheduleId: null,
    loopPrompt:
      "Review the last 7 days of chat sessions. Identify the 5 most " +
      "actionable items the user has surfaced. For each, write a " +
      "memory entry under the 'cubecloud-distilled' namespace. " +
      "Cite the source session id and timestamp.",
    enabled: false,
  },
  {
    id: "cubecloud-cost-watchdog",
    name: "Cost watchdog (weekly)",
    description:
      "Scans ~/.hermes/logs/ for repeated retry patterns and " +
      "surfaces to the Console tab. Run weekly.",
    memoryNamespace: "cost-watchdog",
    profile: "default",
    scheduleId: null,
    loopPrompt:
      "Scan ~/.hermes/logs/ for retry patterns (3+ retries on the " +
      "same model id within 1 hour). For each pattern, write a " +
      "memory entry summarising the cost, the model, and the " +
      "likely root cause. Surface to the user.",
    enabled: false,
  },
  {
    id: "cubecloud-skill-audit",
    name: "Skill catalog audit (monthly)",
    description:
      "Compares installed skills against the canonical " +
      ".agents/skills/README.md. Surfaces drift (skills that " +
      "are installed but not in the index, or skills in the " +
      "index but not installed).",
    memoryNamespace: "skill-audit",
    profile: "default",
    scheduleId: null,
    loopPrompt:
      "Compare the user's installed skills (Skills screen) " +
      "against the canonical skill catalog at " +
      ".agents/skills/README.md. Identify drift: skills in the " +
      "index that are not installed; skills installed that are " +
      "not in the index. Write a memory entry listing both " +
      "categories. Suggest install / uninstall actions for the " +
      "user.",
    enabled: false,
  },
];

/**
 * Idempotent seed. Call after the user's saved harnesses are
 * loaded; if any seed `id` is not already in the saved set,
 * add it. If the user has deleted a seed, the deletion sticks.
 */
export function seedDefaultHarnesses(saved: EverOsHarness[]): EverOsHarness[] {
  const existing = new Set(saved.map((h) => h.id));
  const additions: EverOsHarness[] = [];
  for (const def of DEFAULT_HARNESSES) {
    if (!existing.has(def.id)) {
      additions.push(def);
    }
  }
  if (additions.length === 0) {
    return saved;
  }
  return [...saved, ...additions];
}

export const DEFAULT_HARNESSES_SEED_VERSION = 1;
