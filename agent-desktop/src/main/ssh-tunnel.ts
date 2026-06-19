import { ChildProcess, spawn } from "child_process";
import { homedir } from "os";
import { join } from "path";
import net from "net";
import http from "http";
import { buildSshControlOptions } from "./ssh-options";
import { HIDDEN_SUBPROCESS_OPTIONS } from "./process-options";
import type { ConnectionDiagnostic } from "../shared/connection-diagnostics";
import type { GatewayRuntimePresetId } from "../shared/gateway-runtime-presets";
import {
  DEFAULT_SSH_LOCAL_PORT,
  SSH_CONNECTION_TEST_LOCAL_PORT,
  buildLocalGatewayUrl,
} from "../shared/runtime-defaults";

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  keyPath: string;
  remotePort: number;
  localPort: number;
}

let tunnelProcess: ChildProcess | null = null;
let activeConfig: SshConfig | null = null;
let tunnelRunning = false;

export function getSshTunnelUrl(): string | null {
  if (!activeConfig || !tunnelRunning) return null;
  return buildLocalGatewayUrl(activeConfig.localPort);
}

export function isSshTunnelActive(): boolean {
  return tunnelRunning && activeConfig !== null;
}

function checkTunnelPortOpen(port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function checkTunnelHealth(port: number, timeoutMs = 3000): Promise<boolean> {
  return checkTunnelPortOpen(port, timeoutMs);
}

function requestTunnelEndpoint(
  port: number,
  path: string,
  apiKey?: string,
  timeoutMs = 3000,
): Promise<{ statusCode: number; body: string } | null> {
  return new Promise((resolve) => {
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined;
    const req = http.request(
      `${buildLocalGatewayUrl(port)}${path}`,
      { method: "GET", timeout: timeoutMs, headers },
      (res) => {
        let body = "";
        res.setEncoding("utf-8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

function isOpenClawModelsResponse(body: string): boolean {
  if (!body) return false;

  try {
    const parsed = JSON.parse(body) as {
      data?: Array<{ id?: string }>;
    };
    return Array.isArray(parsed.data)
      ? parsed.data.some(
          (entry) =>
            typeof entry?.id === "string" && /^openclaw(?:\/|$)/i.test(entry.id),
        )
      : false;
  } catch {
    return /openclaw\/default/i.test(body);
  }
}

function isIronClawHealthResponse(body: string): boolean {
  if (!body) return false;

  try {
    const parsed = JSON.parse(body) as {
      status?: string;
      channel?: string;
    };
    return parsed.channel === "gateway" && typeof parsed.status === "string";
  } catch {
    return /"channel"\s*:\s*"gateway"/i.test(body);
  }
}

function isAuthStatusCode(statusCode: number): boolean {
  return statusCode === 401 || statusCode === 403;
}

export async function diagnoseSshForwardedGateway(
  port: number,
  expectedRuntime?: GatewayRuntimePresetId,
  apiKey?: string,
): Promise<ConnectionDiagnostic> {
  const ironClaw = await requestTunnelEndpoint(port, "/api/health", apiKey);
  if (
    ironClaw?.statusCode === 200 &&
    isIronClawHealthResponse(ironClaw.body)
  ) {
    return {
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "ironclaw",
      statusCode: ironClaw.statusCode,
    };
  }

  if (ironClaw && isAuthStatusCode(ironClaw.statusCode)) {
    return {
      ok: false,
      code: "auth",
      transport: "ssh",
      runtime: "ironclaw",
      statusCode: ironClaw.statusCode,
    };
  }

  const health = await requestTunnelEndpoint(port, "/health", apiKey);
  if (health?.statusCode === 200) {
    return {
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "hermes",
      statusCode: health.statusCode,
    };
  }

  if (health && isAuthStatusCode(health.statusCode)) {
    return {
      ok: false,
      code: "auth",
      transport: "ssh",
      runtime: "hermes",
      statusCode: health.statusCode,
    };
  }

  const openClaw = await requestTunnelEndpoint(port, "/v1/models", apiKey);
  if (openClaw?.statusCode === 200 && isOpenClawModelsResponse(openClaw.body)) {
    return {
      ok: true,
      code: "ok",
      transport: "ssh",
      runtime: "openclaw",
      statusCode: openClaw.statusCode,
    };
  }

  if (openClaw && isAuthStatusCode(openClaw.statusCode)) {
    return {
      ok: false,
      code: "auth",
      transport: "ssh",
      runtime: "openclaw",
      statusCode: openClaw.statusCode,
    };
  }

  if (expectedRuntime === "openclaw") {
    return {
      ok: false,
      code: "openclaw-compat-disabled",
      transport: "ssh",
      runtime: null,
      statusCode:
        openClaw?.statusCode ?? ironClaw?.statusCode ?? health?.statusCode ?? null,
    };
  }

  return {
    ok: false,
    code: "wrong-port",
    transport: "ssh",
    runtime: null,
    statusCode:
      openClaw?.statusCode ?? ironClaw?.statusCode ?? health?.statusCode ?? null,
  };
}

export async function probeSshForwardedGateway(
  port: number,
  apiKey?: string,
): Promise<boolean> {
  const diagnostic = await diagnoseSshForwardedGateway(port, undefined, apiKey);
  return diagnostic.ok;
}

async function waitForHealth(port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await checkTunnelHealth(port, 1500)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`SSH tunnel did not become reachable after ${timeoutMs}ms`);
}

export async function isSshTunnelHealthy(): Promise<boolean> {
  return activeConfig !== null && tunnelRunning
    ? checkTunnelPortOpen(activeConfig.localPort)
    : false;
}

function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(preferred, "127.0.0.1", () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on("error", () => {
      const fallback = net.createServer();
      fallback.listen(0, "127.0.0.1", () => {
        const port = (fallback.address() as net.AddressInfo).port;
        fallback.close(() => resolve(port));
      });
    });
  });
}

function waitForPort(port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt(): void {
      const socket = net.connect(port, "127.0.0.1", () => {
        socket.destroy();
        resolve();
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`SSH tunnel not ready after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 400);
        }
      });
    }
    attempt();
  });
}

function buildSshArgs(config: SshConfig, localPort: number): string[] {
  const keyPath = config.keyPath || join(homedir(), ".ssh", "id_rsa");
  return [
    "-N",
    "-L",
    `${localPort}:127.0.0.1:${config.remotePort}`,
    "-p",
    String(config.port),
    "-i",
    keyPath,
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "BatchMode=yes",
    ...buildSshControlOptions(process.platform, { forTunnel: true }),
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3",
    `${config.username}@${config.host}`,
  ];
}

export async function startSshTunnel(config: SshConfig): Promise<void> {
  stopSshTunnel();

  const localPort = await findFreePort(config.localPort || DEFAULT_SSH_LOCAL_PORT);
  activeConfig = { ...config, localPort };
  tunnelRunning = false;

  tunnelProcess = spawn("ssh", buildSshArgs(config, localPort), {
    stdio: "ignore",
    detached: false,
    ...HIDDEN_SUBPROCESS_OPTIONS,
  });

  tunnelProcess.on("exit", () => {
    tunnelProcess = null;
    // With ControlMaster=auto, the spawned SSH process exits immediately
    // after handing off to the master. The tunnel may still be alive via
    // the mux master, so check the forwarded port before declaring it dead.
    checkTunnelPortOpen(localPort, 2000).then((healthy) => {
      if (!healthy) {
        tunnelRunning = false;
        activeConfig = null;
      }
    });
  });

  tunnelProcess.on("error", () => {
    tunnelProcess = null;
    checkTunnelPortOpen(localPort, 2000).then((healthy) => {
      if (!healthy) {
        tunnelRunning = false;
        activeConfig = null;
      }
    });
  });

  try {
    await waitForPort(localPort, 12000);
    tunnelRunning = true;
    await waitForHealth(localPort, 20000);
  } catch (err) {
    stopSshTunnel();
    throw err;
  }
}

export function stopSshTunnel(): void {
  if (tunnelProcess && !tunnelProcess.killed) {
    tunnelProcess.kill("SIGTERM");
  }
  tunnelRunning = false;
  activeConfig = null;
}

export async function ensureSshTunnel(config: SshConfig): Promise<void> {
  if (isSshTunnelActive() && (await isSshTunnelHealthy())) return;
  await startSshTunnel(config);
}

const SSH_UNREACHABLE_DIAGNOSTIC: ConnectionDiagnostic = {
  ok: false,
  code: "unreachable",
  transport: "ssh",
  runtime: null,
  statusCode: null,
};

export function diagnoseSshConnection(
  config: SshConfig,
  expectedRuntime?: GatewayRuntimePresetId,
  apiKey?: string,
): Promise<ConnectionDiagnostic> {
  return findFreePort(config.localPort || SSH_CONNECTION_TEST_LOCAL_PORT)
    .then(
      (localPort) =>
        new Promise<ConnectionDiagnostic>((resolve) => {
          const args = buildSshArgs(config, localPort);
          const proc = spawn("ssh", args, {
            stdio: "ignore",
            ...HIDDEN_SUBPROCESS_OPTIONS,
          });

          let done = false;
          let lastDiagnostic = SSH_UNREACHABLE_DIAGNOSTIC;

          const finish = (result: ConnectionDiagnostic): void => {
            if (done) return;
            done = true;
            proc.kill("SIGTERM");
            resolve(result);
          };

          proc.on("error", () => finish(SSH_UNREACHABLE_DIAGNOSTIC));

          const timeout = setTimeout(() => finish(lastDiagnostic), 20000);

          const deadline = Date.now() + 15000;
          async function poll(): Promise<void> {
            if (done) return;
            const portOpen = await checkTunnelPortOpen(localPort);

            if (!portOpen) {
              if (Date.now() > deadline) {
                clearTimeout(timeout);
                finish(lastDiagnostic);
                return;
              }
              setTimeout(poll, 400);
              return;
            }

            const diagnostic = await diagnoseSshForwardedGateway(
              localPort,
              expectedRuntime,
              apiKey,
            );
            lastDiagnostic = diagnostic;

            if (
              diagnostic.ok ||
              diagnostic.code === "auth" ||
              diagnostic.code === "wrong-port" ||
              diagnostic.code === "openclaw-compat-disabled"
            ) {
              clearTimeout(timeout);
              finish(diagnostic);
              return;
            }

            if (Date.now() > deadline) {
              clearTimeout(timeout);
              finish(diagnostic);
              return;
            }

            setTimeout(poll, 400);
          }

          setTimeout(poll, 600);
        }),
    )
    .catch(() => SSH_UNREACHABLE_DIAGNOSTIC);
}

// Test SSH reachability + forwarded runtime probe through a temporary tunnel.
export function testSshConnection(
  config: SshConfig,
  apiKey?: string,
): Promise<boolean> {
  return diagnoseSshConnection(config, undefined, apiKey).then(
    (diagnostic) => diagnostic.ok,
  );
}
