import { beforeEach, describe, expect, it, vi } from "vitest";

const { capturedRequests } = vi.hoisted(() => ({
  capturedRequests: [] as Array<{
    url: string;
    options: Record<string, unknown>;
    body: string;
  }>,
}));

function makeBufferedResponse(statusCode: number, body = ""): {
  statusCode: number;
  headers: Record<string, string>;
  on: (event: string, handler: (value?: Buffer) => void) => unknown;
  resume: () => void;
} {
  const listeners: Record<string, Array<(value?: Buffer) => void>> = {};
  const response = {
    statusCode,
    headers: {},
    on: (event: string, handler: (value?: Buffer) => void) => {
      listeners[event] ??= [];
      listeners[event].push(handler);
      return response;
    },
    resume: () => {},
  };

  queueMicrotask(() => {
    if (body) {
      for (const handler of listeners.data ?? []) {
        handler(Buffer.from(body, "utf-8"));
      }
    }
    for (const handler of listeners.end ?? []) {
      handler();
    }
  });

  return response;
}

vi.mock("http", () => ({
  default: {
    request: (
      url: string,
      options: Record<string, unknown>,
      callback?: (response: unknown) => void,
    ) => {
      let requestBody = "";
      const targetUrl = String(url);

      if (typeof callback === "function") {
        if (targetUrl.endsWith("/health")) {
          callback({ statusCode: 404, resume: () => {} });
        } else if (targetUrl.endsWith("/v1/models")) {
          callback(
            makeBufferedResponse(
              200,
              '{"data":[{"id":"openclaw/default"}]}',
            ),
          );
        } else {
          callback(makeBufferedResponse(200));
        }
      }

      return {
        write: (body: string | Buffer) => {
          requestBody += Buffer.isBuffer(body) ? body.toString("utf-8") : body;
        },
        end: () => {
          capturedRequests.push({
            url: targetUrl,
            options,
            body: requestBody,
          });
        },
        on: () => {},
        destroy: () => {},
      };
    },
  },
}));

vi.mock("https", () => ({
  default: {
    request: (
      url: string,
      options: Record<string, unknown>,
      callback?: (response: unknown) => void,
    ) => {
      let requestBody = "";
      if (typeof callback === "function") {
        callback(makeBufferedResponse(200));
      }
      return {
        write: (body: string | Buffer) => {
          requestBody += Buffer.isBuffer(body) ? body.toString("utf-8") : body;
        },
        end: () => {
          capturedRequests.push({
            url: String(url),
            options,
            body: requestBody,
          });
        },
        on: () => {},
        destroy: () => {},
      };
    },
  },
}));

const { TEST_HOME } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require("os");
  return {
    TEST_HOME: path.join(os.tmpdir(), `openclaw-remote-adapter-${Date.now()}`),
  };
});

vi.mock("../src/main/installer", () => ({
  HERMES_HOME: TEST_HOME,
  HERMES_PYTHON: "/usr/bin/python3",
  HERMES_REPO: "/dev/null",
  hermesCliArgs: () => ["/dev/null"],
  getEnhancedPath: () => process.env.PATH || "",
}));

vi.mock("../src/main/config", () => ({
  getModelConfig: () => ({ model: "gpt-4.1", provider: "openai", baseUrl: "" }),
  getApiServerKey: () => "",
  readEnv: () => ({}),
  readDesktopConfig: () => ({}),
  writeDesktopConfig: () => {},
  getConnectionConfig: () => ({
    mode: "remote" as const,
    remoteUrl: "ws://gateway.example:18789/v1",
    apiKey: "gateway-secret",
    gatewayRuntimePreset: "openclaw" as const,
    ssh: {
      host: "",
      port: 22,
      username: "",
      keyPath: "",
      remotePort: 8642,
      localPort: 18642,
    },
  }),
}));

vi.mock("../src/main/ssh-tunnel", () => ({
  getSshTunnelUrl: () => null,
  isSshTunnelActive: () => false,
  isSshTunnelHealthy: () => Promise.resolve(false),
  startSshTunnel: () => Promise.resolve(),
}));

vi.mock("../src/main/utils", () => ({
  stripAnsi: (s: string) => s,
  pidIsAliveAs: () => false,
  profileHome: () => TEST_HOME,
  getActiveProfileNameSync: () => "default",
}));

vi.mock("../src/main/models", () => ({
  readModels: () => [],
}));

vi.mock("../src/main/process-options", () => ({
  HIDDEN_SUBPROCESS_OPTIONS: {},
}));

import { sendMessage, testRemoteConnection } from "../src/main/hermes";

describe("OpenClaw remote adapter", () => {
  beforeEach(() => {
    capturedRequests.length = 0;
  });

  it("switches remote chat requests to the OpenClaw agent contract after probing the gateway", async () => {
    await expect(testRemoteConnection("ws://gateway.example:18789/v1")).resolves.toBe(
      true,
    );

    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
    );

    const chatRequest = capturedRequests.find((request) =>
      request.url.endsWith("/v1/chat/completions"),
    );

    expect(chatRequest).toBeDefined();
    expect(chatRequest!.url).toBe(
      "http://gateway.example:18789/v1/chat/completions",
    );

    const headers = chatRequest!.options.headers as Record<string, string>;
    const body = JSON.parse(chatRequest!.body);

    expect(headers.Authorization).toBe("Bearer gateway-secret");
    expect(headers["x-openclaw-model"]).toBe("gpt-4.1");
    expect(headers["X-Hermes-Session-Id"]).toBeUndefined();
    expect(body.model).toBe("openclaw/default");
    expect(typeof body.user).toBe("string");
    expect(body.user).toMatch(/^desk-/);
    expect(body).not.toHaveProperty("session_id");
  });
});