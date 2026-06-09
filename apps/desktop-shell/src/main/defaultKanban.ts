// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Cubecloud-original pre-launch defaults —Workspace →Kanban tab.
//
// One starter board with 5 deletable example tasks. The user
// can delete the board, delete the tasks, or convert them
// into real work. The seed is idempotent and respects the
// user's deletions.
//
// The pre-launch bundle is documented in:
//   agent-desktop/BRANDING_AND_LICENSE.md §"V2.9 transitions landed"
//   agent-desktop/docs/HANDBOOK.md §"5.3 Adding a pre-installed board"

import type { KanbanBoard, KanbanTask } from "@cubecloud/platform-core";

/**
 * The starter board. Marked with `slug: "onboarding"` so
 * the agent can identify it (e.g. for the "Hide onboarding
 * board" settings toggle in a future release).
 */
export const DEFAULT_KANBAN_BOARD: KanbanBoard = {
  slug: "onboarding",
  name: "Onboarding (delete me)",
  description:
    "Pre-installed example board with 5 deletable tasks. " +
    "Use this to learn the kanban flow, then delete the " +
    "board when you're ready.",
  isCurrent: true,
};

/**
 * The 5 example tasks. Each has a clear "delete me" cue
 * in the title and body so the user knows these are
 * examples, not real work.
 *
 * The tasks are ordered: "queued" first, "active" second,
 * "done" third. The remaining two are split between
 * "queued" (a dependency) and "failed" (a learning
 * example).
 */
export const DEFAULT_KANBAN_TASKS: KanbanTask[] = [
  {
    id: "onboarding-install-runtime",
    title: "Install a runtime (delete me)",
    body:
      "Example task. Click the install button on the Runtime " +
      "screen to install Hermes. Or use a remote gateway if " +
      "you already have one. Delete this task when done.",
    status: "queued",
    priority: 1,
    assignee: "default",
    skills: ["cubecloud-onboarding"],
  },
  {
    id: "onboarding-configure-provider",
    title: "Configure a provider (delete me)",
    body:
      "Example task. Pick Ollama (local) or any OpenAI-" +
      "compatible remote. Save the model. Delete this " +
      "task when done.",
    status: "queued",
    priority: 2,
    assignee: "default",
    skills: ["cubecloud-onboarding"],
  },
  {
    id: "onboarding-first-chat",
    title: "Run your first chat (delete me)",
    body:
      "Example task. Send a message in the Chat screen. " +
      "Confirm the runtime responds. Delete this task when " +
      "done.",
    status: "active",
    priority: 1,
    assignee: "default",
    skills: ["cubecloud-onboarding"],
  },
  {
    id: "onboarding-install-skill",
    title: "Install your first skill (delete me)",
    body:
      "Example task. Open the Skills screen and install a " +
      "skill from the registry. Delete this task when done.",
    status: "queued",
    priority: 3,
    assignee: "default",
    skills: [],
  },
  {
    id: "onboarding-first-schedule",
    title: "Schedule a task (delete me)",
    body:
      "Example task. Open the Schedules screen and create a " +
      "daily standup digest. Enable the pre-installed " +
      "'cubecloud-daily-standup' if you want a head start. " +
      "Delete this task when done.",
    status: "failed",
    priority: 4,
    assignee: "default",
    skills: [],
  },
];

/**
 * Idempotent seed. Call after the user's saved kanban state
 * is loaded; if the `onboarding` board is not present, add
 * it. If the user has deleted the board, the deletion
 * sticks.
 */
export function seedDefaultKanban(
  boards: KanbanBoard[],
  tasks: KanbanTask[],
): { boards: KanbanBoard[]; tasks: KanbanTask[] } {
  const existing = new Set(boards.map((b) => b.slug));
  let nextBoards = boards;
  let nextTasks = tasks;
  if (!existing.has(DEFAULT_KANBAN_BOARD.slug)) {
    nextBoards = [...boards, DEFAULT_KANBAN_BOARD];
    // Only add the example tasks if the user has no tasks
    // on the onboarding board already.
    const hasOnboardingTasks = tasks.some(
      (t) => t.id.startsWith("onboarding-"),
    );
    if (!hasOnboardingTasks) {
      nextTasks = [...tasks, ...DEFAULT_KANBAN_TASKS];
    }
  }
  return { boards: nextBoards, tasks: nextTasks };
}

export const DEFAULT_KANBAN_SEED_VERSION = 1;
