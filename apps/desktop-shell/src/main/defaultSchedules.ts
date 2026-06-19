// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Cubecloud-original pre-launch defaults —Workspace →Schedules tab.
//
// One disabled schedule shipped pre-installed. The user
// enables it after they have configured a profile (the
// schedule is wired to the user's default profile). Disabled
// by default so the seed does not try to run on a profile
// that the user has not yet configured.
//
// The pre-launch bundle is documented in:
//   agent-desktop/BRANDING_AND_LICENSE.md §"V2.9 transitions landed"
//   agent-desktop/docs/HANDBOOK.md §"5.3 Adding a pre-installed schedule"

import type { AgentSchedule } from "@cubecloud/platform-core";

/**
 * Pre-installed (disabled) schedules. The user enables after
 * they have configured a profile; the schedule then runs
 * against that profile.
 *
 * Design rules:
 *   - `enabled: false` —user enables explicitly.
 *   - `profile: "default"` —uses the user's default
 *     profile; user can change.
 *   - `cron` is a 5-field standard cron expression.
 *   - `prompt` is the prompt the schedule sends to the
 *     agent runtime when the schedule fires.
 *   - `kanbanBoardSlug: null` —no kanban board wired
 *     initially; user can wire after enabling.
 */
export const DEFAULT_SCHEDULES: AgentSchedule[] = [
  {
    id: "cubecloud-daily-standup",
    name: "Daily standup digest",
    cron: "0 9 * * 1-5",
    prompt:
      "Summarise the last 24 hours of activity. Group by: chat " +
      "sessions (count, top topics), kanban moves (created / " +
      "completed / failed), scheduled-task runs (success / " +
      "failure), EverOS harness outputs. Be concise. " +
      "Cite session ids / task ids / harness ids for each " +
      "claim. Do not speculate; if a category is empty, " +
      "say so.",
    profile: "default",
    kanbanBoardSlug: null,
    enabled: false,
    nextRunAt: null,
    lastRunAt: null,
  },
];

/**
 * Idempotent seed. Call after the user's saved schedules are
 * loaded; if any seed `id` is not already in the saved set,
 * add it. If the user has deleted a seed, the deletion sticks.
 */
export function seedDefaultSchedules(saved: AgentSchedule[]): AgentSchedule[] {
  const existing = new Set(saved.map((s) => s.id));
  const additions: AgentSchedule[] = [];
  for (const def of DEFAULT_SCHEDULES) {
    if (!existing.has(def.id)) {
      additions.push(def);
    }
  }
  if (additions.length === 0) {
    return saved;
  }
  return [...saved, ...additions];
}

export const DEFAULT_SCHEDULES_SEED_VERSION = 1;
