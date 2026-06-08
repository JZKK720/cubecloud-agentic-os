// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AgentModelEndpoint, PlatformOverview, PlatformView } from "@cubecloud/platform-core";
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
  models?: AgentModelEndpoint[];
}): Window["platformAPI"] & {
  getOverview: ReturnType<typeof vi.fn>;
  setActiveView: ReturnType<typeof vi.fn>;
  listWorkspaceModels: ReturnType<typeof vi.fn>;
} {
  let currentOverview = createOverview("models");
  const modelsState = options?.models ?? [
    {
      id: "model-1",
      name: "Primary lane model",
      provider: "openai",
      model: "gpt-4.1",
      baseUrl: "https://api.openai.com/v1",
      createdAt: 1717000000000,
    },
    {
      id: "model-2",
      name: "DeepSeek staging",
      provider: "deepseek",
      model: "deepseek-chat",
      baseUrl: "https://api.deepseek.com/v1",
      createdAt: 1717003600000,
    },
  ];

  const platformAPI = {
    getOverview: vi.fn(async () => currentOverview),
    setActiveView: vi.fn(async (view: PlatformView) => {
      currentOverview = createOverview(view);
      return currentOverview;
    }),
    listWorkspaceModels: vi.fn(async () => modelsState),
  } as unknown as Window["platformAPI"] & {
    getOverview: ReturnType<typeof vi.fn>;
    setActiveView: ReturnType<typeof vi.fn>;
    listWorkspaceModels: ReturnType<typeof vi.fn>;
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

describe("App models view", () => {
  it("filters the library and keeps Add model in draft mode with saved models present", async () => {
    installPlatformApi();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Primary lane model" })).toBeTruthy();

    fireEvent.change(screen.getByRole("textbox", { name: /Search models/i }), {
      target: { value: "deepseek" },
    });

    expect(await screen.findByRole("button", { name: /DeepSeek staging/i })).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Primary lane model/i })).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add model" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Create model endpoint" })).toBeTruthy();
    });

    expect(screen.queryByRole("heading", { name: "Primary lane model" })).toBeNull();
    expect((screen.getByLabelText("Provider") as HTMLInputElement).value).toBe("custom");
    expect((screen.getByLabelText("Model ID") as HTMLInputElement).value).toBe("");
  });
});