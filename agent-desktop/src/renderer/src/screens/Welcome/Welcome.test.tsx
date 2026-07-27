import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// V2.10.44 — the i18n mock used to return the raw key, but the
// Welcome screen now wraps almost every visible string in
// t("welcome.*") / t("common.*") / t("welcome.designDials.*").
// To keep the assertions below readable (and to keep them honest
// about the literal English copy that ships in the renderer),
// resolve keys against the en locale files the same way the
// production i18n bootstrap does.
import enCommon from "../../../../shared/i18n/locales/en/common";
import enWelcome from "../../../../shared/i18n/locales/en/welcome";

type LocaleTree = Record<string, unknown>;

function resolveKey(tree: LocaleTree, key: string): string {
  const segments = key.split(".");
  let cursor: unknown = tree;
  for (const segment of segments) {
    if (cursor && typeof cursor === "object" && segment in (cursor as LocaleTree)) {
      cursor = (cursor as LocaleTree)[segment];
    } else {
      return key;
    }
  }
  return typeof cursor === "string" ? cursor : key;
}

function interpolate(template: string, options?: Record<string, unknown>): string {
  if (!options) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name) => {
    const value = options[name];
    return value == null ? `{{${name}}}` : String(value);
  });
}

const enBundles: Record<string, LocaleTree> = {
  common: enCommon as unknown as LocaleTree,
  welcome: enWelcome as unknown as LocaleTree,
};

function translate(key: string, options?: Record<string, unknown>): string {
  const [namespace, ...rest] = key.split(".");
  const bundle = enBundles[namespace];
  if (!bundle || rest.length === 0) {
    // Either the key was a flat non-namespaced key (rare) or the
    // test referenced a namespace the mock doesn't ship. In both
    // cases, fall back to the raw key so the test surfaces a clear
    // miss instead of a silently-empty string.
    return key;
  }
  const subKey = rest.join(".");
  return interpolate(resolveKey(bundle, subKey), options);
}

vi.mock("../../components/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => translate(key, options),
    locale: "en",
    setLocale: () => {},
  }),
}));

import Welcome from "./Welcome";

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
          id: "ironclaw",
          displayName: "IronClaw",
          role: "gateway-handoff",
          integrationStatus: "current",
          onboardingSurface: "welcome",
          connectionModes: ["docker-gateway", "remote-gateway"],
          capabilities: {
            canInstallLocally: false,
            canAttachToExistingLocalGateway: false,
            canAttachToRemoteGateway: true,
            canAttachViaSshTunnel: true,
            canDiscoverViaDocker: true,
            canImportExistingState: false,
            canDiscoverLocalCli: false,
            exposesChatGateway: true,
            supportsTaskExecution: false,
            supportsWorkflowDispatch: false,
          },
          preferredTaskOrchestratorIds: ["hermes", "ecc"],
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
            id: "scan-docker-gateways",
            kind: "scan",
            label: "Rescan",
            detail: "",
            primary: false,
          },
        ],
        summary: "",
        detail: "",
      },
    ]),
    runRuntimeProviderAction: vi.fn().mockResolvedValue({
      success: true,
      message: "Docker scan complete.",
      payload: {
        status: "empty",
        message:
          "No IronClaw gateway container was detected in Docker Desktop. Start IronClaw and rescan if you want to hand off through the container gateway.",
        scannedAt: new Date().toISOString(),
        runtimes: [],
      },
    }),
    diagnoseRemoteConnection: vi.fn().mockResolvedValue({
      ok: false,
      code: "unreachable",
      transport: "remote",
      runtime: null,
      statusCode: null,
    }),
    diagnoseSshConnection: vi.fn().mockResolvedValue({
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "openclaw",
      statusCode: 200,
    }),
    testRemoteConnection: vi.fn().mockResolvedValue(false),
    testSshConnection: vi.fn().mockResolvedValue(true),
    setSshConfig: vi.fn().mockResolvedValue(true),
    setConnectionConfig: vi.fn().mockResolvedValue(true),
    ...overrides,
  };

  Object.defineProperty(window, "hermesAPI", {
    configurable: true,
    value: api,
  });

  return api;
}

describe("Welcome handoffs", () => {
  it("starts local install when the primary CTA is clicked", async () => {
    const api = installHermesAPI();
    const onInstallLocal = vi.fn();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={onInstallLocal}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    const ctaName = translate("welcome.installLocalRuntime");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: ctaName }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: ctaName }));

    expect(onInstallLocal).toHaveBeenCalledTimes(1);
    // The mount-time `refreshRuntimeProviders` call still runs (it
    // powers the runtime-name labels in the SSH/Remote panels), but
    // the Docker-scan and localhost-probe side effects are gone.
    expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    expect(api.runRuntimeProviderAction).not.toHaveBeenCalled();
  });

  it("renders the install CTA without legacy shell command copy", async () => {
    installHermesAPI();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: translate("welcome.recheck") }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("iex (irm https://hermes-agent.nousresearch.com/install.ps1)"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("welcome-install-cta")).toBeInTheDocument();
  });

  it("opens the Hermes and Raven wire panels with local defaults", async () => {
    installHermesAPI();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Wire Hermes API" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Wire Hermes API" }));

    expect(screen.getByDisplayValue("http://127.0.0.1:8642")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    // V2.10.77 — IronClaw demoted from primary onboarding; Raven
    // is now the second primary runtime alongside Hermes.
    fireEvent.click(
      screen.getByRole("button", { name: "Raven via SSH" }),
    );

    expect(screen.getByDisplayValue("8855")).toBeInTheDocument();
  });

  it("hides the local install CTA when runtimes were already discovered", async () => {
    installHermesAPI();
    const onConnectDiscovered = vi.fn();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        discoveredRuntimes={[
          {
            url: "http://127.0.0.1:8789",
            runtime: "hermes",
            healthy: true,
            authRequired: false,
            statusCode: 200,
            latencyMs: 24,
          },
        ]}
        onConnectDiscovered={onConnectDiscovered}
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Hermes Agent · 127.0.0.1:8789" }),
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("welcome-install-cta")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: translate("welcome.installLocalRuntime") }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Hermes Agent · 127.0.0.1:8789" }),
    );

    expect(onConnectDiscovered).toHaveBeenCalledWith(
      "http://127.0.0.1:8789",
      "hermes",
    );
  });

  it("passes an SSH gateway token through the SSH attach flow", async () => {
    const api = installHermesAPI();
    const onRecheck = vi.fn();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={onRecheck}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Connect via SSH" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "OpenClaw" }));

    fireEvent.change(
      screen.getByPlaceholderText("192.168.1.100 or myserver.local"),
      { target: { value: "myserver.local" } },
    );
    fireEvent.change(screen.getByPlaceholderText("user"), {
      target: { value: "agent" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Paste the OpenClaw gateway token or password"),
      { target: { value: "openclaw-secret" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Connect via SSH" }));

    await waitFor(() => {
      expect(api.diagnoseSshConnection).toHaveBeenCalledWith(
        "myserver.local",
        22,
        "agent",
        "",
        18789,
        "openclaw",
        "openclaw-secret",
      );
      expect(api.setSshConfig).toHaveBeenCalledWith(
        "myserver.local",
        22,
        "agent",
        "",
        18789,
        18642,
        "openclaw-secret",
        "openclaw",
      );
    });

    expect(onRecheck).toHaveBeenCalledTimes(1);
  });

  it("shows a runtime-aware retry banner for saved remote OpenClaw failures", async () => {
    const api = installHermesAPI();

    render(
      <Welcome
        error="OpenClaw compatibility endpoint not ready."
        connectionMode="remote"
        initialGatewayRuntimePreset="openclaw"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    // The error-state path no longer spawns a Docker / localhost
    // probe; the welcome surface keeps the focus on the remote
    // retry action. We assert the banner and retry button render,
    // and explicitly check that no Docker scan was kicked off.
    expect(
      screen.getByRole("heading", {
        name: "Remote OpenClaw connection needs attention",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry remote connection" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry local install" }),
    ).not.toBeInTheDocument();
    expect(api.runRuntimeProviderAction).not.toHaveBeenCalled();
  });

  it("prefills the remote OpenClaw compatibility URL when that runtime lane is selected", async () => {
    const api = installHermesAPI();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Connect to remote gateway" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "OpenClaw" }));

    expect(
      screen.getByDisplayValue("http://192.168.1.100:18789/v1"),
    ).toBeInTheDocument();
  });

  it("switches the SSH port when the OpenClaw runtime lane is selected", async () => {
    const api = installHermesAPI();

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Connect via SSH" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "OpenClaw" }));

    expect(screen.getByDisplayValue("18789")).toBeInTheDocument();
  });

  it("shows the IronClaw SSH lane and snaps the remote port to the IronClaw gateway port", async () => {
    const api = installHermesAPI({
      diagnoseSshConnection: vi.fn().mockResolvedValue({
        ok: true,
        code: "ok",
        transport: "ssh",
        runtime: "ironclaw",
        statusCode: 200,
      }),
    });

    render(
      <Welcome
        error={null}
        connectionMode="local"
        onInstallLocal={() => {}}
        onRecheck={() => {}}
        onSwitchToLocal={() => {}}
      />,
    );

    await waitFor(() => {
      expect(api.listRuntimeProviders).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Connect via SSH" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "IronClaw" }));

    expect(screen.getByDisplayValue("3231")).toBeInTheDocument();
  });
});