import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let userDataDir = "";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name !== "userData") {
        throw new Error(`Unexpected path lookup: ${name}`);
      }

      return userDataDir;
    },
  },
}));

describe("agentWorkspace", () => {
  beforeEach(() => {
    userDataDir = mkdtempSync(join(tmpdir(), "cubecloud-agent-workspace-"));
  });

  afterEach(() => {
    rmSync(userDataDir, { recursive: true, force: true });
  });

  it("stores, updates, and removes workspace models", async () => {
    const workspace = await import("./agentWorkspace");

    const created = workspace.saveWorkspaceModel({
      name: "Primary model",
      provider: "openai",
      model: "gpt-4.1",
      baseUrl: "https://example.invalid/v1",
    });
    expect(created).toHaveLength(1);

    const updated = workspace.saveWorkspaceModel({
      id: created[0].id,
      name: "Renamed model",
      provider: "openai",
      model: "gpt-4.1-mini",
      baseUrl: "https://example.invalid/v1",
    });
    expect(updated[0]).toEqual(
      expect.objectContaining({
        name: "Renamed model",
        model: "gpt-4.1-mini",
      }),
    );

    expect(workspace.removeWorkspaceModel(created[0].id)).toEqual([]);
  });

  it("persists workspace memory and builtin tool toggles", async () => {
    const workspace = await import("./agentWorkspace");

    const memory = workspace.saveWorkspaceMemoryEntry({
      label: "Operator note",
      content: "Remember to verify the transcript panel.",
    });
    expect(memory[0]).toEqual(
      expect.objectContaining({
        label: "Operator note",
        content: "Remember to verify the transcript panel.",
      }),
    );

    const tools = workspace.setWorkspaceToolEnabled("browser", false);
    expect(tools.find((tool) => tool.name === "browser")?.enabled).toBe(false);
  });

  it("creates schedules and updates their run metadata", async () => {
    const workspace = await import("./agentWorkspace");

    const schedules = workspace.saveWorkspaceSchedule({
      name: "Refresh summary",
      cron: "30m",
      prompt: "Summarize recent changes.",
      profile: "default",
      enabled: true,
    });
    const created = schedules[0];

    expect(created.nextRunAt).toBeTypeOf("number");

    const disabled = workspace.setWorkspaceScheduleEnabled(created.id, false);
    expect(disabled[0].enabled).toBe(false);
    expect(disabled[0].nextRunAt).toBeNull();

    const triggered = workspace.triggerWorkspaceSchedule(created.id);
    expect(triggered[0].lastRunAt).toBeTypeOf("number");
  });
});