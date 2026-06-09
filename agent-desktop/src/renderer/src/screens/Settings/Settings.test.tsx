import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string>) => {
      if (key === "settings.migrationDesc") {
        return `Import from ${vars?.path ?? ""}`;
      }
      return key;
    },
    locale: "en",
    setLocale: () => {},
  }),
}));

vi.mock("../../components/ThemeProvider", () => ({
  useTheme: () => ({
    theme: "system",
    resolved: "light",
    setTheme: () => {},
  }),
}));

import Settings from "./Settings";

function installHermesAPI(
  overrides: Partial<Window["hermesAPI"]> = {},
): Partial<Window["hermesAPI"]> {
  const api: Partial<Window["hermesAPI"]> = {
    getHermesHome: vi.fn().mockResolvedValue("C:/Users/test/.hermes"),
    getAppVersion: vi.fn().mockResolvedValue("0.5.2"),
    getConnectionConfig: vi.fn().mockResolvedValue({
      mode: "local",
      remoteUrl: "",
      hasApiKey: false,
      apiKeyLength: 0,
      gatewayRuntimePreset: "hermes",
      ssh: {
        host: "",
        port: 22,
        username: "",
        keyPath: "",
        remotePort: 8718,
        localPort: 8719,
      },
    }),
    getApiServerKeyStatus: vi.fn().mockResolvedValue({ hasKey: true }),
    getConfig: vi.fn().mockResolvedValue(""),
    getHermesVersion: vi
      .fn()
      .mockResolvedValue(
        "Hermes Agent v0.7.0 (2026.4.3) Python: 3.11.15 OpenAI SDK: 2.30.0",
      ),
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
        summary: "Hermes runtime ready.",
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
        summary: "OpenClaw detected.",
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
    ]),
    runRuntimeProviderAction: vi.fn().mockResolvedValue({
      success: true,
      message:
        "OpenClaw migration completed. Continue with provider setup below.",
    }),
    onInstallProgress: vi.fn().mockReturnValue(() => {}),
    diagnoseRemoteConnection: vi.fn().mockResolvedValue({
      ok: true,
      code: "ok",
      transport: "remote",
      runtime: "openclaw",
      statusCode: 200,
    }),
    diagnoseSshConnection: vi.fn().mockResolvedValue({
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "openclaw",
      statusCode: 200,
    }),
    openExternal: vi.fn(),
    listProfiles: vi.fn().mockResolvedValue([
      { name: "default", isActive: true, gatewayRunning: false },
    ]),
    setActiveProfile: vi.fn().mockResolvedValue(true),
    createProfile: vi.fn().mockResolvedValue({ success: true }),
    openDataFolder: vi.fn().mockResolvedValue(""),
    copyToClipboard: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
  });

  return api;
}

describe("Settings orchestration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the orchestration section and migrates OpenClaw from Settings", async () => {
    const api = installHermesAPI();

    render(<Settings />);

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
      expect(api.listTaskOrchestrators).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("Task orchestration")).toBeInTheDocument();
    expect(
      screen.getByText("Hermes Kanban and Dispatch"),
    ).toBeInTheDocument();
    expect(screen.getByText("OpenClaw")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Import OpenClaw" }),
    );

    await waitFor(() => {
      expect(api.runRuntimeProviderAction).toHaveBeenCalledWith(
        "openclaw",
        "import-existing-state",
      );
    });
  });

  it("surfaces the OpenClaw WSL install handoff when OpenClaw is not detected", async () => {
    const api = installHermesAPI({
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
          summary: "Hermes runtime ready.",
          detail: "",
        },
        {
          definition: {
            id: "openclaw",
            displayName: "OpenClaw",
            role: "gateway-handoff",
            integrationStatus: "optional",
            onboardingSurface: "setup",
            connectionModes: ["local-gateway", "remote-gateway"],
            capabilities: {
              canInstallLocally: true,
              canAttachToExistingLocalGateway: true,
              canAttachToRemoteGateway: true,
              canAttachViaSshTunnel: false,
              canDiscoverViaDocker: false,
              canImportExistingState: true,
              canDiscoverLocalCli: true,
              exposesChatGateway: true,
              supportsTaskExecution: true,
              supportsWorkflowDispatch: true,
            },
            preferredTaskOrchestratorIds: ["openclaw", "ecc"],
            notes: [],
          },
          status: "available",
          available: true,
          detected: false,
          detectedCount: 0,
          detectedPath: null,
          detectedCommand: null,
          currentConnectionMode: null,
          actions: [
            {
              id: "install-via-wsl",
              kind: "install",
              label: "Install OpenClaw in WSL",
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
          summary: "OpenClaw is optional.",
          detail: "Use WSL on Windows when you want its CLI and daemon available.",
        },
      ]),
    });

    render(<Settings />);

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      await screen.findByRole("button", { name: "Install OpenClaw in WSL" }),
    );

    await waitFor(() => {
      expect(api.runRuntimeProviderAction).toHaveBeenCalledWith(
        "openclaw",
        "install-via-wsl",
      );
    });
  });

  it("prefills the remote OpenClaw compatibility URL from Settings when that lane is selected", async () => {
    const api = installHermesAPI();

    render(<Settings />);

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "settings.modeRemote" }));
    fireEvent.click(screen.getByRole("button", { name: "OpenClaw" }));

    expect(
      screen.getByDisplayValue("http://192.168.1.100:18789/v1"),
    ).toBeInTheDocument();
  });

  it("reopens Settings on the saved OpenClaw lane before any manual lane switch", async () => {
    const api = installHermesAPI({
      getConnectionConfig: vi.fn().mockResolvedValue({
        mode: "remote",
        remoteUrl: "http://192.168.1.100:18789/v1",
        hasApiKey: false,
        apiKeyLength: 0,
        gatewayRuntimePreset: "openclaw",
        ssh: {
          host: "",
          port: 22,
          username: "",
          keyPath: "",
          remotePort: 18789,
          localPort: 8719,
        },
      }),
    });

    render(<Settings />);

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByDisplayValue("http://192.168.1.100:18789/v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Gateway token or password"),
    ).toBeInTheDocument();
  });

  it("switches the SSH port to the OpenClaw default from Settings", async () => {
    const api = installHermesAPI();

    render(<Settings />);

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "SSH Tunnel" }));
    fireEvent.click(screen.getByRole("button", { name: "OpenClaw" }));

    expect(screen.getByDisplayValue("18789")).toBeInTheDocument();
  });
});
describe("Settings data location and profiles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the hermes data path and an open-folder button", async () => {
    const openDataFolder = vi.fn().mockResolvedValue("");
    const api = installHermesAPI({ openDataFolder });
    render(<Settings />);

    // The new Data Location section is the canonical home for the
    // hermes home path; the engine section also shows it as a
    // secondary display, so scope the assertion to the new element
    // by its aria-label.
    const pathBlock = await screen.findByLabelText(
      "settings.dataLocation.path",
    );
    expect(pathBlock).toHaveTextContent("C:/Users/test/.hermes");
    const openButton = await screen.findByRole("button", {
      name: "settings.dataLocation.openFolder",
    });
    fireEvent.click(openButton);
    await waitFor(() => {
      expect(openDataFolder).toHaveBeenCalledWith(undefined);
    });
    expect(api.openDataFolder).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error when open-folder returns a non-empty string", async () => {
    const openDataFolder = vi
      .fn()
      .mockResolvedValue("remote-mode-no-local-folder");
    installHermesAPI({ openDataFolder });
    render(<Settings />);

    const openButton = await screen.findByRole("button", {
      name: "settings.dataLocation.openFolder",
    });
    fireEvent.click(openButton);
    expect(
      await screen.findByText("remote-mode-no-local-folder"),
    ).toBeInTheDocument();
  });

  it("lists profiles, marks the active one, and switches via the button", async () => {
    const setActiveProfile = vi.fn().mockResolvedValue(true);
    const listProfiles = vi.fn().mockResolvedValue([
      { name: "default", isActive: true, gatewayRunning: true },
      { name: "work", isActive: false, gatewayRunning: false },
    ]);
    const listeners: Array<Event> = [];
    const dispatchSpy = vi
      .spyOn(window, "dispatchEvent")
      .mockImplementation((event: Event) => {
        listeners.push(event);
        return true;
      });
    installHermesAPI({ listProfiles, setActiveProfile });
    render(<Settings />);

    expect(
      await screen.findByText("settings.profiles.activeBadge"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.profiles.gatewayRunning"),
    ).toBeInTheDocument();

    const switchButton = screen.getByRole("button", {
      name: "settings.profiles.switch",
    });
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(setActiveProfile).toHaveBeenCalledWith("work");
    });
    await waitFor(() => {
      const profileEvent = listeners.find(
        (event) =>
          (event as CustomEvent).type === "profile:changed" &&
          (event as CustomEvent).detail?.name === "work",
      );
      expect(profileEvent).toBeDefined();
    });
    expect(listProfiles).toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });

  it("requires a name when creating a new profile", async () => {
    installHermesAPI();
    render(<Settings />);

    await screen.findByText("settings.profiles.activeBadge");
    fireEvent.click(
      screen.getByRole("button", { name: "settings.profiles.newProfile" }),
    );

    const createButton = screen.getByRole("button", {
      name: "settings.profiles.create",
    });
    fireEvent.click(createButton);
    expect(
      await screen.findByText("settings.profileNameRequired"),
    ).toBeInTheDocument();
  });

  it("creates a profile with the typed name and clone toggle", async () => {
    const createProfile = vi.fn().mockResolvedValue({ success: true });
    installHermesAPI({ createProfile });
    render(<Settings />);

    await screen.findByText("settings.profiles.activeBadge");
    fireEvent.click(
      screen.getByRole("button", { name: "settings.profiles.newProfile" }),
    );

    const nameInput = screen.getByPlaceholderText(
      "settings.profiles.namePlaceholder",
    );
    fireEvent.change(nameInput, { target: { value: "work" } });

    const cloneToggle = screen.getByLabelText("settings.profiles.clone");
    fireEvent.click(cloneToggle);

    fireEvent.click(
      screen.getByRole("button", { name: "settings.profiles.create" }),
    );

    await waitFor(() => {
      expect(createProfile).toHaveBeenCalledWith("work", false);
    });
  });
});
