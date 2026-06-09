import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: "en",
    setLocale: () => {},
  }),
}));

vi.mock("../../hooks/useDiscoveredModels", () => ({
  useDiscoveredModels: () => ({
    models: [],
    status: "idle",
    cached: false,
    freeModels: [],
  }),
}));

import Setup from "./Setup";

function installHermesAPI(
  overrides: Partial<Window["hermesAPI"]> = {},
): Partial<Window["hermesAPI"]> {
  const api: Partial<Window["hermesAPI"]> = {
    listRuntimeProviders: vi.fn().mockResolvedValue([
      {
        definition: {
          id: "hermes",
          displayName: "Hermes Agent",
          role: "primary-runtime",
          integrationStatus: "current",
          onboardingSurface: "welcome",
          connectionModes: [
            "embedded-local",
            "local-gateway",
            "remote-gateway",
            "ssh-tunnel",
          ],
          capabilities: {
            canInstallLocally: true,
            canAttachToExistingLocalGateway: true,
            canAttachToRemoteGateway: true,
            canAttachViaSshTunnel: true,
            canDiscoverViaDocker: false,
            canImportExistingState: false,
            canDiscoverLocalCli: true,
            exposesChatGateway: true,
            supportsTaskExecution: true,
            supportsWorkflowDispatch: true,
          },
          preferredTaskOrchestratorIds: ["hermes", "ecc"],
          notes: [],
        },
        status: "ready",
        available: true,
        detected: true,
        detectedCount: 1,
        detectedPath: null,
        detectedCommand: null,
        currentConnectionMode: "local",
        actions: [],
        summary: "",
        detail: "",
      },
      {
        definition: {
          id: "openclaw",
          displayName: "OpenClaw",
          role: "migration-source",
          integrationStatus: "optional",
          onboardingSurface: "setup",
          connectionModes: ["migration-import"],
          capabilities: {
            canInstallLocally: false,
            canAttachToExistingLocalGateway: false,
            canAttachToRemoteGateway: false,
            canAttachViaSshTunnel: false,
            canDiscoverViaDocker: false,
            canImportExistingState: true,
            canDiscoverLocalCli: true,
            exposesChatGateway: false,
            supportsTaskExecution: true,
            supportsWorkflowDispatch: true,
          },
          preferredTaskOrchestratorIds: ["openclaw", "ecc"],
          notes: [],
        },
        status: "optional",
        available: true,
        detected: true,
        detectedCount: 1,
        detectedPath: "C:/Users/test/.openclaw",
        detectedCommand: "C:/Users/test/AppData/Roaming/npm/openclaw.cmd",
        currentConnectionMode: null,
        actions: [
          {
            id: "import-existing-state",
            kind: "import",
            label: "Import OpenClaw",
            detail: "",
            primary: true,
          },
          {
            id: "open-install-guide",
            kind: "docs",
            label: "Open OpenClaw onboarding guide",
            detail: "",
            primary: false,
          },
        ],
        summary: "",
        detail: "",
      },
    ]),
    listTaskOrchestrators: vi.fn().mockResolvedValue([
      {
        definition: {
          id: "hermes",
          displayName: "Hermes Kanban and Dispatch",
          integrationStatus: "current",
          integrationMode: "native-core",
          compatibleRuntimeProviderIds: ["hermes", "ironclaw"],
          capabilities: {
            canManageAgents: true,
            canAssignTasks: true,
            canDispatchWorkflows: true,
            canMirrorExternalBacklogs: false,
            canBridgeExternalHarness: false,
            canReuseExistingRuntimeConnections: true,
          },
          notes: [],
        },
        status: "ready",
        available: true,
        detected: true,
        enabled: true,
        detectedCommand: null,
        summary: "Hermes orchestrator ready.",
        detail: "",
      },
      {
        definition: {
          id: "ecc",
          displayName: "ECC harness bridge",
          integrationStatus: "planned",
          integrationMode: "optional-bridge",
          compatibleRuntimeProviderIds: ["hermes", "ironclaw", "openclaw"],
          capabilities: {
            canManageAgents: true,
            canAssignTasks: true,
            canDispatchWorkflows: true,
            canMirrorExternalBacklogs: true,
            canBridgeExternalHarness: true,
            canReuseExistingRuntimeConnections: true,
          },
          notes: [],
        },
        status: "planned",
        available: false,
        detected: false,
        enabled: false,
        detectedCommand: null,
        summary: "ECC bridge planned.",
        detail: "",
      },
    ]),
    runRuntimeProviderAction: vi.fn().mockResolvedValue({
      success: true,
      message:
        "OpenClaw migration completed. Continue with provider setup below.",
    }),
    discoverAgentClis: vi.fn().mockResolvedValue({
      installedCount: 0,
      items: [],
    }),
    ...overrides,
  };

  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
  });

  return api;
}

describe("Setup handoffs", () => {
  it("imports OpenClaw from the onboarding banner and reports completion", async () => {
    const api = installHermesAPI();

    render(
      <Setup
        onComplete={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
      expect(api.listTaskOrchestrators).toHaveBeenCalledTimes(1);
      expect(api.discoverAgentClis).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Import OpenClaw" }),
    );

    await waitFor(() => {
      expect(api.runRuntimeProviderAction).toHaveBeenCalledWith(
        "openclaw",
        "import-existing-state",
      );
    });

    expect(
      await screen.findByText(
        "OpenClaw migration completed. Continue with provider setup below.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Import OpenClaw" }),
    ).not.toBeInTheDocument();
  });
});