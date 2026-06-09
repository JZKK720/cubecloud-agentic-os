import { getConnectionConfig } from "./config";
import {
  setSshRemoteApiKey,
  testRemoteConnection,
} from "./hermes";
import {
  sshGatewayStatus,
  sshReadRemoteGatewayAuth,
  sshStartGateway,
} from "./ssh-remote";
import {
  getSshTunnelUrl,
  startSshTunnel,
  stopSshTunnel,
} from "./ssh-tunnel";
import { OPENCLAW_LOCAL_GATEWAY_PORT } from "../shared/runtime-defaults";

type SshStartupDeps = {
  getConnectionConfig: typeof getConnectionConfig;
  startSshTunnel: typeof startSshTunnel;
  getSshTunnelUrl: typeof getSshTunnelUrl;
  stopSshTunnel: typeof stopSshTunnel;
  readRemoteGatewayAuth: typeof sshReadRemoteGatewayAuth;
  setSshRemoteApiKey: typeof setSshRemoteApiKey;
  testRemoteConnection: typeof testRemoteConnection;
  sshGatewayStatus: typeof sshGatewayStatus;
  sshStartGateway: typeof sshStartGateway;
  openClawLocalGatewayPort: number;
  now: () => number;
  wait: (ms: number) => Promise<void>;
};

export function createSshStartupHelpers(deps: SshStartupDeps): {
  shouldAutoStartHermesSshGateway: (remotePort: number) => boolean;
  waitForRemoteGateway: (
    url: string,
    apiKey: string,
    timeoutMs: number,
  ) => Promise<boolean>;
  startConfiguredSshTunnel: () => Promise<boolean>;
} {
  function shouldAutoStartHermesSshGateway(remotePort: number): boolean {
    return remotePort !== deps.openClawLocalGatewayPort;
  }

  async function waitForRemoteGateway(
    url: string,
    apiKey: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = deps.now() + timeoutMs;
    while (deps.now() <= deadline) {
      if (await deps.testRemoteConnection(url, apiKey)) {
        return true;
      }
      await deps.wait(500);
    }
    return false;
  }

  async function startConfiguredSshTunnel(): Promise<boolean> {
    const conn = deps.getConnectionConfig();
    if (conn.mode !== "ssh") return false;

    await deps.startSshTunnel(conn.ssh);

    const tunnelUrl = deps.getSshTunnelUrl();
    let key = conn.apiKey || (await deps.readRemoteGatewayAuth(conn.ssh));
    deps.setSshRemoteApiKey(key);

    if (
      tunnelUrl &&
      !(await waitForRemoteGateway(tunnelUrl, key, 3000)) &&
      shouldAutoStartHermesSshGateway(conn.ssh.remotePort)
    ) {
      if (!(await deps.sshGatewayStatus(conn.ssh))) {
        await deps.sshStartGateway(conn.ssh);
      }
      key = conn.apiKey || (await deps.readRemoteGatewayAuth(conn.ssh));
      deps.setSshRemoteApiKey(key);
      if (!(await waitForRemoteGateway(tunnelUrl, key, 20000))) {
        deps.stopSshTunnel();
        throw new Error(
          "SSH tunnel connected, but the remote runtime did not respond on the forwarded port.",
        );
      }
    } else if (tunnelUrl && !(await deps.testRemoteConnection(tunnelUrl, key))) {
      deps.stopSshTunnel();
      throw new Error(
        "SSH tunnel connected, but the remote runtime did not respond. Check the remote port and add the gateway token/password if this runtime requires auth.",
      );
    }

    return true;
  }

  return {
    shouldAutoStartHermesSshGateway,
    waitForRemoteGateway,
    startConfiguredSshTunnel,
  };
}

const defaultSshStartupHelpers = createSshStartupHelpers({
  getConnectionConfig,
  startSshTunnel,
  getSshTunnelUrl,
  stopSshTunnel,
  readRemoteGatewayAuth: sshReadRemoteGatewayAuth,
  setSshRemoteApiKey,
  testRemoteConnection,
  sshGatewayStatus,
  sshStartGateway,
  openClawLocalGatewayPort: OPENCLAW_LOCAL_GATEWAY_PORT,
  now: () => Date.now(),
  wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const {
  shouldAutoStartHermesSshGateway,
  waitForRemoteGateway,
  startConfiguredSshTunnel,
} = defaultSshStartupHelpers;