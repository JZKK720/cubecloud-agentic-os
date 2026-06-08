// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AgentTool, PlatformOverview, PlatformView } from "@cubecloud/platform-core";
import {
  buildPlatformOverview,
  createDefaultPlatformState,
  setActiveRuntimeProvider,
  setActiveView,
} from "@cubecloud/platform-core";
import App from "./App";
import { ThemeProvider } from "./ThemeProvider";

function createOverview(activeView: PlatformView): PlatformOverview {
  let state = createDefaultPlatformState();
  state = setActiveRuntimeProvider(state, "hermes");
  state = setActiveView(state, activeView);

  const overview = buildPlatformOverview(state);

  return {
    ...overview,
    runtimeProviders: overview.runtimeProviders.map((provider) =>
      provider.id === "hermes"
        ? {
            ...provider,
            surfaceMode: "desktop",
            surfaceUrl: "http://127.0.0.1:8644",
          }
        : provider,
    ),
  };
}

function renderApp(): void {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
}

function installPlatformApi(options: {
  activeView: PlatformView;
  tools?: AgentTool[];
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listWorkspaceTools: ReturnType<typeof vi.fn>;
  saveWorkspaceTool: ReturnType<typeof vi.fn>;
  removeWorkspaceTool: ReturnType<typeof vi.fn>;
  setWorkspaceToolEnabled: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview(options.activeView);
  let currentTools = [...(options.tools ?? [])];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listWorkspaceTools: vi.fn(async () => currentTools),
    saveWorkspaceTool: vi.fn(async (input: {
      name: string;
      description: string;
      endpoint: string;
      type: string;
      enabled: boolean;
      existingName?: string;
    }) => {
      const lookupName = (input.existingName ?? input.name).trim();
      const nextTool: AgentTool = {
        name: input.name.trim() || "workspace-tool",
        description: input.description.trim() || "Workspace tool",
        endpoint: input.endpoint.trim(),
        type: input.type.trim() || "mcp",
        enabled: input.enabled,
      };

      currentTools = currentTools.some((tool) => tool.name === lookupName)
        ? currentTools.map((tool) => (tool.name === lookupName ? nextTool : tool))
        : [...currentTools, nextTool];

      return currentTools;
    }),
    removeWorkspaceTool: vi.fn(async (name: string) => {
      currentTools = currentTools.filter((tool) => tool.name !== name);
      return currentTools;
    }),
    setWorkspaceToolEnabled: vi.fn(async (name: string, enabled: boolean) => {
      currentTools = currentTools.map((tool) =>
        tool.name === name ? { ...tool, enabled } : tool,
      );
      return currentTools;
    }),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listWorkspaceTools: ReturnType<typeof vi.fn>;
    saveWorkspaceTool: ReturnType<typeof vi.fn>;
    removeWorkspaceTool: ReturnType<typeof vi.fn>;
    setWorkspaceToolEnabled: ReturnType<typeof vi.fn>;
  };

  window.platformAPI = platformAPI;
  return platformAPI;
}

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("App tools editor", () => {
  it("keeps tools in draft mode and still allows builtin toggles", async () => {
    const platformAPI = installPlatformApi({
      activeView: "tools",
      tools: [
        {
          name: "web",
          description: "Fetch and inspect HTTP resources for agent workflows.",
          endpoint: "workspace://toolsets/web",
          type: "builtin",
          enabled: true,
        },
        {
          name: "observability-mcp",
          description: "Inspect runtime telemetry and alerts.",
          endpoint: "http://127.0.0.1:8765/mcp",
          type: "mcp",
          enabled: true,
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "web" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Disable tool" }));

    await waitFor(() => {
      expect(platformAPI.setWorkspaceToolEnabled).toHaveBeenCalledWith("web", false);
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create tool" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Type") as HTMLInputElement).value).toBe("mcp");
    expect((screen.getByLabelText("Endpoint") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Description") as HTMLTextAreaElement).value).toBe("");
  });

  it("creates, updates, and removes custom tools from the editor", async () => {
    const platformAPI = installPlatformApi({
      activeView: "tools",
      tools: [
        {
          name: "web",
          description: "Fetch and inspect HTTP resources for agent workflows.",
          endpoint: "workspace://toolsets/web",
          type: "builtin",
          enabled: true,
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "web" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "observability-mcp" },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "mcp" },
    });
    fireEvent.change(screen.getByLabelText("Endpoint"), {
      target: { value: "http://127.0.0.1:8765/mcp" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Inspect runtime telemetry and alerts." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save new" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceTool).toHaveBeenCalledWith({
        name: "observability-mcp",
        description: "Inspect runtime telemetry and alerts.",
        endpoint: "http://127.0.0.1:8765/mcp",
        type: "mcp",
        enabled: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "observability-mcp" })).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Inspect runtime telemetry, logs, and alerts." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draft starts enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Update selected" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceTool).toHaveBeenLastCalledWith({
        name: "observability-mcp",
        description: "Inspect runtime telemetry, logs, and alerts.",
        endpoint: "http://127.0.0.1:8765/mcp",
        type: "mcp",
        enabled: false,
        existingName: "observability-mcp",
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Draft starts disabled" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Delete selected" }));

    await waitFor(() => {
      expect(platformAPI.removeWorkspaceTool).toHaveBeenCalledWith("observability-mcp");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "web" })).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: /observability-mcp/i })).toBeNull();
  });
});