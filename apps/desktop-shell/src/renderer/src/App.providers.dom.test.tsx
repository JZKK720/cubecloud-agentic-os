// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type {
  AgentProviderConfig,
  PlatformOverview,
  PlatformView,
} from "@cubecloud/platform-core";
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

function installPlatformApi(options?: {
  providers?: AgentProviderConfig[];
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  listWorkspaceProviders: ReturnType<typeof vi.fn>;
  discoverProviderModels: ReturnType<typeof vi.fn>;
  saveWorkspaceModel: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview("providers");
  const providersState = options?.providers ?? [];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listWorkspaceProviders: vi.fn(async () => providersState),
    discoverProviderModels: vi.fn(async () => ({
      providerType: "ollama",
      status: "ok",
      models: ["llama3.2:3b"],
      detail: "Discovered 1 Ollama model.",
      checkedAt: 1717000000000,
    })),
    saveWorkspaceModel: vi.fn(async (input) => [
      {
        id: "model-1",
        ...input,
        createdAt: 1717000000000,
      },
    ]),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    listWorkspaceProviders: ReturnType<typeof vi.fn>;
    discoverProviderModels: ReturnType<typeof vi.fn>;
    saveWorkspaceModel: ReturnType<typeof vi.fn>;
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

describe("App providers view", () => {
  it("loads the Ollama preset, probes the provider, and saves a discovered model endpoint", async () => {
    const platformAPI = installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Create provider" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Ollama Local/i }));

    expect(await screen.findByDisplayValue("Ollama")).toBeTruthy();
    expect(screen.getByDisplayValue("ollama")).toBeTruthy();
    expect(screen.getByDisplayValue("http://127.0.0.1:11434/v1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Probe provider" }));

    await waitFor(() => {
      expect(platformAPI.discoverProviderModels).toHaveBeenCalledWith(
        "ollama",
        "http://127.0.0.1:11434/v1",
        "",
      );
    });

    expect(await screen.findByText("llama3.2:3b")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save endpoint" }));

    await waitFor(() => {
      expect(platformAPI.saveWorkspaceModel).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "ollama",
          model: "llama3.2:3b",
          baseUrl: "http://127.0.0.1:11434/v1",
        }),
      );
    });
  });

  it("keeps New draft and preset loading in provider draft mode when saved providers exist", async () => {
    installPlatformApi({
      providers: [
        {
          id: "provider-1",
          name: "OpenAI Prod",
          type: "openai",
          apiKey: "sk-live-test",
          baseUrl: "https://api.openai.com/v1",
        },
        {
          id: "provider-2",
          name: "DeepSeek Lab",
          type: "deepseek",
          apiKey: "deepseek-key",
          baseUrl: "https://api.deepseek.com/v1",
        },
      ],
    });

    renderApp();

    expect(await screen.findByRole("heading", { name: "OpenAI Prod" })).toBeTruthy();

    await waitFor(() => {
      expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("OpenAI Prod");
    });

    fireEvent.click(screen.getByRole("button", { name: "New draft" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create provider" })).toBeTruthy();
    });

    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Type") as HTMLInputElement).value).toBe("custom");
    expect((screen.getByLabelText("Base URL") as HTMLInputElement).value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: /Ollama Local/i }));

    expect(await screen.findByRole("heading", { name: "Create provider" })).toBeTruthy();
    expect(screen.getByDisplayValue("Ollama")).toBeTruthy();
    expect(screen.getByDisplayValue("ollama")).toBeTruthy();
    expect(screen.getByDisplayValue("http://127.0.0.1:11434/v1")).toBeTruthy();
  });
});