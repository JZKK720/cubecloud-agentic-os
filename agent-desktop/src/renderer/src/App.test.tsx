import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import App from "./App";

const mockInstallStatus = {
  installed: true,
  configured: true,
  hasApiKey: true,
  verified: true,
  activeProfile: "default",
};

const hermesAPI = {
  getConnectionConfig: vi.fn().mockResolvedValue({
    mode: "local",
    remoteUrl: "",
    apiKey: "",
    gatewayRuntimePreset: "hermes",
    ssh: {
      host: "",
      port: 22,
      username: "",
      keyPath: "",
      remotePort: 8642,
      localPort: 18642,
    },
  }),
  autoDiscoveryScan: vi.fn().mockResolvedValue({
    healthyCount: 0,
    discovered: [],
  }),
  checkInstall: vi.fn().mockResolvedValue(mockInstallStatus),
  verifyInstall: vi.fn().mockResolvedValue(true),
  diagnoseRemoteConnection: vi.fn(),
  startSshTunnel: vi.fn(),
  setConnectionConfig: vi.fn(),
  setCachedGatewayRuntimePreset: vi.fn(),
};

Object.defineProperty(window, "hermesAPI", {
  configurable: true,
  value: hermesAPI,
});

Object.defineProperty(window, "electron", {
  configurable: true,
  value: { process: { platform: "win32" } },
});

vi.mock("./screens/Welcome/Welcome", () => ({
  default: () => <div>Welcome screen</div>,
}));

vi.mock("./screens/Install/Install", () => ({
  default: () => <div>Install screen</div>,
}));

vi.mock("./screens/Setup/Setup", () => ({
  default: () => <div>Setup screen</div>,
}));

vi.mock("./screens/Layout/Layout", () => ({
  default: () => <div>Main layout</div>,
}));

vi.mock("./screens/SplashScreen/SplashScreen", () => ({
  default: ({ onFinished }: { onFinished: () => void }) => {
    onFinished();
    return <div>Splash screen</div>;
  },
}));

vi.mock("./components/ThemeProvider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./components/ErrorBoundary", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./utils/analytics", () => ({
  captureScreenView: vi.fn(),
}));

vi.mock("./utils/gatewayRuntimePresetCache", () => ({
  setCachedGatewayRuntimePreset: vi.fn(),
}));

vi.mock("../../shared/connection-diagnostics", () => ({
  formatConnectionDiagnosticDetail: vi.fn(),
}));

vi.mock("../../shared/gateway-runtime-presets", () => ({
  GATEWAY_RUNTIME_PRESETS: {
    hermes: { displayName: "Hermes" },
    ironclaw: { displayName: "IronClaw" },
    openclaw: { displayName: "OpenClaw" },
  },
}));

beforeEach(() => {
  hermesAPI.getConnectionConfig.mockResolvedValue({
    mode: "local",
    remoteUrl: "",
    apiKey: "",
    gatewayRuntimePreset: "hermes",
    ssh: {
      host: "",
      port: 22,
      username: "",
      keyPath: "",
      remotePort: 8642,
      localPort: 18642,
    },
  });
  hermesAPI.autoDiscoveryScan.mockResolvedValue({
    healthyCount: 0,
    discovered: [],
  });
  hermesAPI.checkInstall.mockResolvedValue(mockInstallStatus);
});

describe("App startup gating", () => {
  it("stays on Welcome when Hermes is installed but no runtime was discovered", async () => {
    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText("Welcome screen")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText("Main layout")).toBeNull();
    expect(hermesAPI.autoDiscoveryScan).toHaveBeenCalledTimes(1);
    expect(hermesAPI.checkInstall).toHaveBeenCalledTimes(1);
  });
});
