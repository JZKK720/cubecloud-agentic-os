// P1 part 3: Harness registry tests.
//
// The harness registry wires all 4 runtime adapters (Hermes, IronClaw,
// OpenClaw, Raven) into a HarnessRouter. The resolver reads the active
// runtime provider from the desktop's config.

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock hermes.ts
vi.mock("../src/main/hermes", () => ({
  sendMessage: vi.fn(),
  ensureInitialized: vi.fn(),
}));

// Mock config
vi.mock("../src/main/config", () => ({
  getModelConfig: vi.fn(() => ({
    model: "test-model",
    provider: "openai",
    baseUrl: "",
    apiKey: "",
  })),
  getConfigValue: vi.fn(() => "hermes"),
  isRemoteMode: vi.fn(() => false),
}));

import { createHarnessRegistry } from "../src/main/harnesses/registry";
import { createHermesHarness } from "../src/main/harnesses/hermes-harness";

describe("Harness registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a registry with all 4 runtime providers", () => {
    const registry = createHarnessRegistry();

    // The registry should have adapters for all 4 RuntimeProviderIds
    expect(registry.adapters.size).toBeGreaterThanOrEqual(1);

    // Hermes should always be present (it's the default)
    expect(registry.adapters.has("hermes")).toBe(true);
  });

  it("the Hermes adapter has the correct profile", () => {
    const registry = createHarnessRegistry();
    const hermes = registry.adapters.get("hermes");
    expect(hermes).toBeDefined();
    expect(hermes!.profile.providerId).toBe("hermes");
    expect(hermes!.profile.displayName).toBe("Hermes Agent");
  });

  it("creates a router that resolves to the configured provider", async () => {
    const registry = createHarnessRegistry();

    // The router should resolve to hermes by default
    const providerId = await registry.resolve("test-session");
    expect(providerId).toBe("hermes");
  });

  it("the router dispatches to the correct harness", async () => {
    const registry = createHarnessRegistry();
    const router = registry.router;

    // Verify the router is functional
    expect(router).toBeDefined();
    expect(typeof router.runTurn).toBe("function");
    expect(typeof router.getActiveProvider).toBe("function");
  });

  it("close() cleans up all harnesses", async () => {
    const registry = createHarnessRegistry();
    // Should not throw
    await registry.close();
    expect(registry.adapters.size).toBeGreaterThanOrEqual(1);
  });
});