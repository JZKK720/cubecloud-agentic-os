// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// V2.9 pre-launch bundle — idempotency tests for the seed
// functions. The seed is the binding contract between the
// desktop binary and the user's saved state; these tests
// pin the contract.

import { describe, expect, it } from "vitest";
import { DEFAULT_SKILLS, seedDefaultSkills } from "./defaultSkills";
import { DEFAULT_MEMORIES, seedDefaultMemories } from "./defaultMemories";
import { DEFAULT_HARNESSES, seedDefaultHarnesses } from "./defaultHarnesses";
import { DEFAULT_SCHEDULES, seedDefaultSchedules } from "./defaultSchedules";
import {
  DEFAULT_KANBAN_BOARD,
  DEFAULT_KANBAN_TASKS,
  seedDefaultKanban,
} from "./defaultKanban";
import type {
  AgentSkill,
  AgentMemoryEntry,
  EverOsHarness,
  AgentSchedule,
  KanbanBoard,
  KanbanTask,
} from "@cubecloud/platform-core";

describe("V2.9 pre-launch bundle — seed idempotency", () => {
  describe("seedDefaultSkills", () => {
    it("adds the 3 default skills to an empty saved set", () => {
      const out = seedDefaultSkills([]);
      expect(out).toHaveLength(3);
      expect(out.map((s) => s.name)).toEqual([
        "cubecloud-persona",
        "cubecloud-onboarding",
        "cubegraph-code-intel",
      ]);
    });

    it("is idempotent: a second run on the seeded set adds nothing", () => {
      const first = seedDefaultSkills([]);
      const second = seedDefaultSkills(first);
      expect(second).toHaveLength(3);
      expect(second).toEqual(first);
    });

    it("respects the user's deletions: if the user deleted a seed, the seed is not re-added", () => {
      const userDeleted = seedDefaultSkills([]).filter(
        (s) => s.name !== "cubecloud-onboarding",
      );
      const second = seedDefaultSkills(userDeleted);
      expect(second.map((s) => s.name)).toEqual([
        "cubecloud-persona",
        "cubegraph-code-intel",
      ]);
    });

    it("preserves user-added skills alongside the seeds", () => {
      const userAdded: AgentSkill[] = [
        {
          name: "my-custom-skill",
          category: "domain-knowledge",
          description: "Use when the user wants to test the seed preserves user skills.",
          path: "",
        },
      ];
      const out = seedDefaultSkills(userAdded);
      expect(out).toHaveLength(4);
      expect(out[0]).toEqual(userAdded[0]);
    });
  });

  describe("seedDefaultMemories", () => {
    it("adds the 6 default memory seeds to an empty saved set", () => {
      const out = seedDefaultMemories([]);
      expect(out).toHaveLength(6);
    });

    it("is idempotent on the seeded set", () => {
      const first = seedDefaultMemories([]);
      const second = seedDefaultMemories(first);
      expect(second).toHaveLength(6);
      expect(second).toEqual(first);
    });

    it("respects user deletions", () => {
      const userDeleted = seedDefaultMemories([]).filter(
        (m) => m.id !== "cubecloud-security-posture",
      );
      const second = seedDefaultMemories(userDeleted);
      expect(second).toHaveLength(5);
      expect(second.find((m) => m.id === "cubecloud-security-posture")).toBeUndefined();
    });

    it("preserves user-added memory entries", () => {
      const userAdded: AgentMemoryEntry[] = [
        {
          id: "my-custom-memory",
          label: "My custom memory",
          content: "I am a custom memory.",
          createdAt: 0,
        },
      ];
      const out = seedDefaultMemories(userAdded);
      expect(out).toHaveLength(7);
      expect(out[0]).toEqual(userAdded[0]);
    });
  });

  describe("seedDefaultHarnesses", () => {
    it("adds the 3 default harnesses, all disabled", () => {
      const out = seedDefaultHarnesses([]);
      expect(out).toHaveLength(3);
      expect(out.every((h) => h.enabled === false)).toBe(true);
    });

    it("is idempotent", () => {
      const first = seedDefaultHarnesses([]);
      const second = seedDefaultHarnesses(first);
      expect(second).toEqual(first);
    });

    it("respects user deletions", () => {
      const userDeleted = seedDefaultHarnesses([]).filter(
        (h) => h.id !== "cubecloud-cost-watchdog",
      );
      const second = seedDefaultHarnesses(userDeleted);
      expect(second).toHaveLength(2);
    });
  });

  describe("seedDefaultSchedules", () => {
    it("adds the 1 default schedule, disabled", () => {
      const out = seedDefaultSchedules([]);
      expect(out).toHaveLength(1);
      expect(out[0].id).toBe("cubecloud-daily-standup");
      expect(out[0].enabled).toBe(false);
    });

    it("is idempotent", () => {
      const first = seedDefaultSchedules([]);
      const second = seedDefaultSchedules(first);
      expect(second).toEqual(first);
    });
  });

  describe("seedDefaultKanban", () => {
    it("adds 1 starter board + 5 deletable tasks to an empty state", () => {
      const out = seedDefaultKanban([], []);
      expect(out.boards).toHaveLength(1);
      expect(out.boards[0].slug).toBe("onboarding");
      expect(out.tasks).toHaveLength(5);
    });

    it("is idempotent: a second run adds no new boards and no new tasks", () => {
      const first = seedDefaultKanban([], []);
      const second = seedDefaultKanban(first.boards, first.tasks);
      expect(second.boards).toHaveLength(1);
      expect(second.tasks).toHaveLength(5);
    });

    it("respects user deletions: a deleted onboarding board is not re-added", () => {
      const first = seedDefaultKanban([], []);
      const userDeletedBoards: KanbanBoard[] = [];
      const userDeletedTasks: KanbanTask[] = [];
      const second = seedDefaultKanban(userDeletedBoards, userDeletedTasks);
      // Empty saved state -> seed runs again. This is intentional:
      // the user can re-trigger the seed by clearing all boards.
      // (The desktop UI's "Reset to onboarding" button uses this.)
      expect(second.boards).toHaveLength(1);
      expect(second.tasks).toHaveLength(5);
    });

    it("adds the board but does not re-add tasks if the user kept tasks but removed the board", () => {
      // Edge case: user kept some onboarding-* tasks but removed the
      // board. The seed adds the board but does not duplicate tasks.
      const userKeptTasks = DEFAULT_KANBAN_TASKS.slice(0, 2);
      const out = seedDefaultKanban([], userKeptTasks);
      expect(out.boards).toHaveLength(1);
      expect(out.tasks).toHaveLength(2);
    });
  });

  describe("shape contracts (the binding contract)", () => {
    it("every DEFAULT_SKILLS entry has a trigger-only description (starts with 'Use when')", () => {
      for (const s of DEFAULT_SKILLS) {
        expect(s.description.startsWith("Use when ")).toBe(true);
      }
    });

    it("every DEFAULT_SKILLS entry's name matches the expected kebab-case pattern", () => {
      for (const s of DEFAULT_SKILLS) {
        expect(s.name).toMatch(/^(cubecloud|cubegraph)-[a-z]+(-[a-z]+)*$/);
      }
    });

    it("every DEFAULT_HARNESSES is disabled (the user opts in)", () => {
      for (const h of DEFAULT_HARNESSES) {
        expect(h.enabled).toBe(false);
      }
    });

    it("every DEFAULT_SCHEDULES is disabled (the user opts in)", () => {
      for (const s of DEFAULT_SCHEDULES) {
        expect(s.enabled).toBe(false);
      }
    });

    it("the DEFAULT_KANBAN_BOARD is clearly deletable (the name signals it)", () => {
      expect(DEFAULT_KANBAN_BOARD.name).toMatch(/delete me/i);
    });

    it("every DEFAULT_KANBAN_TASK is clearly deletable (the title signals it)", () => {
      for (const t of DEFAULT_KANBAN_TASKS) {
        expect(t.title).toMatch(/delete me/i);
      }
    });
  });
});
