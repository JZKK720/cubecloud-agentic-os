import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SSH_REMOTE_PORT,
  IRONCLAW_DEFAULT_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "../src/shared/runtime-defaults";
import { createSshStartupHelpers } from "../src/main/ssh-startup";

function createDeps(
  overrides: Partial<Parameters<typeof createSshStartupHelpers>[0]> = {},
): Parameters<typeof createSshStartupHelpers>[0] {
  let now = 0;

  return {
    getConnectionConfig: vi.fn().mockReturnValue({
      mode: "ssh",
      remoteUrl: "",
      apiKey: "",
      ssh: {
        host: "gateway.internal",
        port: 22,
        username: "agent",
        keyPath: "",
        remotePort: DEFAULT_SSH_REMOTE_PORT,
        localPort: 18642,
      },
    }),
    startSshTunnel: vi.fn().mockResolvedValue(undefined),
    getSshTunnelUrl: vi.fn().mockReturnValue("http://127.0.0.1:18642"),
    stopSshTunnel: vi.fn(),
    readRemoteGatewayAuth: vi.fn().mockResolvedValue("remote-token"),
    setSshRemoteApiKey: vi.fn(),
    testRemoteConnection: vi.fn().mockResolvedValue(true),
    sshGatewayStatus: vi.fn().mockResolvedValue(false),
    sshStartGateway: vi.fn().mockResolvedValue(undefined),
    openClawLocalGatewayPort: OPENCLAW_LOCAL_GATEWAY_PORT,
    ironClawGatewayPort: IRONCLAW_DEFAULT_PORT,
    now: () => now,
    wait: vi.fn().mockImplementation(async (ms: number) => {
      now += ms;
    }),
    ...overrides,
  };
}

describe("SSH startup flow", () => {
  it("prefers a manually saved SSH token over remote gateway auth lookup", async () => {
    const deps = createDeps({
      getConnectionConfig: vi.fn().mockReturnValue({
        mode: "ssh",
        remoteUrl: "",
        apiKey: "manual-token",
        ssh: {
          host: "gateway.internal",
          port: 22,
          username: "agent",
          keyPath: "",
          remotePort: DEFAULT_SSH_REMOTE_PORT,
          localPort: 18642,
        },
      }),
    });
    const { startConfiguredSshTunnel } = createSshStartupHelpers(deps);

    await expect(startConfiguredSshTunnel()).resolves.toBe(true);

    expect(deps.startSshTunnel).toHaveBeenCalledTimes(1);
    expect(deps.readRemoteGatewayAuth).not.toHaveBeenCalled();
    expect(deps.setSshRemoteApiKey).toHaveBeenCalledWith("manual-token");
    expect(deps.sshStartGateway).not.toHaveBeenCalled();
  });

  it("does not auto-start Hermes when the SSH lane targets OpenClaw", async () => {
    let attempts = 0;
    const deps = createDeps({
      getConnectionConfig: vi.fn().mockReturnValue({
        mode: "ssh",
        remoteUrl: "",
        apiKey: "",
        ssh: {
          host: "gateway.internal",
          port: 22,
          username: "agent",
          keyPath: "",
          remotePort: OPENCLAW_LOCAL_GATEWAY_PORT,
          localPort: 18642,
        },
      }),
      testRemoteConnection: vi.fn().mockImplementation(async () => {
        attempts += 1;
        return attempts >= 8;
      }),
    });
    const { startConfiguredSshTunnel } = createSshStartupHelpers(deps);

    await expect(startConfiguredSshTunnel()).resolves.toBe(true);

    expect(deps.sshStartGateway).not.toHaveBeenCalled();
    expect(deps.stopSshTunnel).not.toHaveBeenCalled();
    expect(deps.readRemoteGatewayAuth).toHaveBeenCalledTimes(1);
    expect(deps.setSshRemoteApiKey).toHaveBeenCalledWith("remote-token");
  });

  it("does not auto-start Hermes when the SSH lane targets IronClaw", async () => {
    let attempts = 0;
    const deps = createDeps({
      getConnectionConfig: vi.fn().mockReturnValue({
        mode: "ssh",
        remoteUrl: "",
        apiKey: "",
        ssh: {
          host: "gateway.internal",
          port: 22,
          username: "agent",
          keyPath: "",
          remotePort: IRONCLAW_DEFAULT_PORT,
          localPort: 18642,
        },
      }),
      testRemoteConnection: vi.fn().mockImplementation(async () => {
        attempts += 1;
        return attempts >= 8;
      }),
    });
    const { startConfiguredSshTunnel, shouldAutoStartHermesSshGateway } =
      createSshStartupHelpers(deps);

    expect(shouldAutoStartHermesSshGateway(IRONCLAW_DEFAULT_PORT)).toBe(false);
    await expect(startConfiguredSshTunnel()).resolves.toBe(true);

    expect(deps.sshStartGateway).not.toHaveBeenCalled();
    expect(deps.stopSshTunnel).not.toHaveBeenCalled();
    expect(deps.readRemoteGatewayAuth).toHaveBeenCalledTimes(1);
    expect(deps.setSshRemoteApiKey).toHaveBeenCalledWith("remote-token");
  });

  it("still auto-starts Hermes on the default SSH runtime lane", async () => {
    let attempts = 0;
    const deps = createDeps({
      testRemoteConnection: vi.fn().mockImplementation(async () => {
        attempts += 1;
        return attempts >= 8;
      }),
    });
    const { startConfiguredSshTunnel } = createSshStartupHelpers(deps);

    await expect(startConfiguredSshTunnel()).resolves.toBe(true);

    expect(deps.sshStartGateway).toHaveBeenCalledTimes(1);
    expect(deps.readRemoteGatewayAuth).toHaveBeenCalledTimes(2);
    expect(deps.setSshRemoteApiKey).toHaveBeenNthCalledWith(1, "remote-token");
    expect(deps.setSshRemoteApiKey).toHaveBeenNthCalledWith(2, "remote-token");
    expect(deps.stopSshTunnel).not.toHaveBeenCalled();
  });
});