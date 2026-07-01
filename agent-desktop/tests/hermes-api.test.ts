import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Shared state for capturing HTTP requests (hoisted before mocks) ──

const { capturedRequests, makeMockRequest } = vi.hoisted(() => {
  const capturedRequests: Array<{
    url: string;
    options: Record<string, unknown>;
    body: string;
  }> = [];

  function makeMockRequest(
    url: string,
    options: Record<string, unknown>,
  ): {
    write: (body: string) => void;
    end: () => void;
    on: (event: string, cb: () => void) => void;
    destroy: () => void;
  } {
    return {
      write: (body: string) => {
        capturedRequests.push({ url, options, body });
      },
      end: () => {},
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      on: (_event: string, _cb: () => void) => {},
      destroy: () => {},
    };
  }

  return {
    capturedRequests,
    makeMockRequest,
  };
});

// ── Mock Node.js http/https modules ──

vi.mock("http", () => ({
  default: {
    request: (url: string, options: Record<string, unknown>) =>
      makeMockRequest(url, options),
  },
}));

vi.mock("https", () => ({
  default: {
    request: (url: string, options: Record<string, unknown>) =>
      makeMockRequest(url, options),
  },
}));

// ── Mock project dependencies ──

const { TEST_HOME } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const os = require("os");
  return {
    TEST_HOME: path.join(os.tmpdir(), `hermes-api-test-${Date.now()}`),
  };
});

const { mockConnectionConfig, mockApiServerKey } = vi.hoisted(() => {
  return {
    mockConnectionConfig: {
      mode: "remote" as const,
      remoteUrl: "http://test-api.example.com",
      apiKey: "test-key",
      ssh: {
        host: "",
        port: 22,
        username: "",
        keyPath: "",
        remotePort: 8642,
        localPort: 18642,
      },
    },
    mockApiServerKey: {
      value: "",
    },
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
  getModelConfig: () => ({ model: "test-model", provider: "openrouter" }),
  readEnv: () => ({}),
  readDesktopConfig: () => ({}),
  writeDesktopConfig: () => {},
  getConnectionConfig: () => mockConnectionConfig,
  getApiServerKey: () => mockApiServerKey.value,
}));

vi.mock("../src/main/ssh-tunnel", () => ({
  getSshTunnelUrl: () => null,
  isSshTunnelActive: () => false,
  isSshTunnelHealthy: () => Promise.resolve(false),
  startSshTunnel: () => Promise.resolve(),
}));

vi.mock("../src/main/utils", () => ({
  stripAnsi: (s: string) => s,
}));

vi.mock("../src/main/models", () => ({
  readModels: () => [],
}));

vi.mock("../src/main/process-options", () => ({
  HIDDEN_SUBPROCESS_OPTIONS: {},
}));

// Headroom is async in finalizePreparedRequest (await loadHeadroomConfig +
// await compressForChat). Without these mocks the await chain stalls in the
// test environment (no real HERMES_HOME, no sidecar) and startPreparedRequest
// never fires, so capturedRequests stays empty and every assertion on
// chatRequest fails with "expected undefined to be defined". Mock Headroom as
// disabled so finalizePreparedRequest resolves immediately.
vi.mock("../src/main/headroom", () => ({
  loadHeadroomConfig: () => Promise.resolve({ enabled: false }),
}));

vi.mock("../src/main/headroom-chat", () => ({
  compressForChat: () => Promise.resolve({ compressed: false }),
  isOllamaLikeProvider: () => false,
}));

// ── Import module under test ──

import {
  sendMessage,
  stopHealthPolling as realStopHealthPolling,
} from "../src/main/hermes";

// sendMessageViaApi fires its HTTP request from a fire-and-forget async
// IIFE (void (async () => { await finalizePreparedRequest(); startPreparedRequest(); })()).
// await sendMessage(...) resolves as soon as the handle is returned, before
// the IIFE flushes. Flush a few macrotasks so the mocked http.request's
// req.write(body) fires and capturedRequests is populated before assertions.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

describe("sendMessageViaApi forwards resumeSessionId", () => {
  beforeEach(() => {
    capturedRequests.length = 0;
  });

  afterEach(() => {
    realStopHealthPolling();
    capturedRequests.length = 0;
  });

  it("includes session_id in request body when resumeSessionId is provided", async () => {
    const testSessionId = "session-abc-123";

    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      testSessionId,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const parsed = JSON.parse(chatRequest!.body);

    expect(parsed.session_id).toBe(testSessionId);
  });

  it("does not include session_id field when resumeSessionId is absent", async () => {
    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      undefined,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const parsed = JSON.parse(chatRequest!.body);

    expect(parsed).not.toHaveProperty("session_id");
  });

  it("does not send empty string session_id when resumeSessionId is empty string", async () => {
    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      "",
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const parsed = JSON.parse(chatRequest!.body);

    expect(parsed).not.toHaveProperty("session_id");
  });

  it("sends the X-Hermes-Session-Id request header when resuming", async () => {
    const testSessionId = "session-abc-123";

    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      testSessionId,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const headers = chatRequest!.options.headers as Record<string, string>;

    // The gateway resumes an existing session from this request header;
    // the session_id body field is ignored. Without it every request
    // forks a new server-side session (issue #226).
    expect(headers["X-Hermes-Session-Id"]).toBe(testSessionId);
  });

  it("generates a fresh `desk-`-prefixed X-Hermes-Session-Id when no resumeSessionId is passed", async () => {
    // Pin the new-chat session-id behaviour: instead of letting the
    // gateway fall back to its `_derive_chat_session_id` fingerprint
    // (sha256(system_prompt + first_user_message)[:16]), the desktop
    // generates `desk-<ms>-<uuid>` per fresh chat and ships it via the
    // header. The fingerprint collides across all chats whose first
    // message is the same — see NousResearch/hermes-agent#7484.
    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      undefined,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const headers = chatRequest!.options.headers as Record<string, string>;

    expect(headers).toHaveProperty("X-Hermes-Session-Id");
    expect(headers["X-Hermes-Session-Id"]).toMatch(
      /^desk-\d{13,}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates a different X-Hermes-Session-Id on each fresh send (no fingerprint collision)", async () => {
    // The same first message twice MUST NOT produce the same session
    // id — the whole point of the fix.
    await sendMessage(
      "Hello there",
      { onChunk: () => {}, onDone: () => {}, onError: () => {} },
      "default",
      undefined,
    );
    await sendMessage(
      "Hello there",
      { onChunk: () => {}, onDone: () => {}, onError: () => {} },
      "default",
      undefined,
    );

    await flush();

    const chatRequests = capturedRequests.filter((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequests.length).toBeGreaterThanOrEqual(2);
    const ids = chatRequests.map(
      (r) =>
        (r.options.headers as Record<string, string>)["X-Hermes-Session-Id"],
    );
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe("sendMessageViaApi routes to IronClaw", () => {
  // IronClaw is an OpenAI-compatible gateway on port 3231. When the user
  // attaches IronClaw via Settings → Remote, the desktop stores the URL
  // (e.g. http://127.0.0.1:3231/api/health) in remoteUrl and the bearer
  // token in apiKey, tagged with gatewayRuntimePreset: "ironclaw".
  // diagnoseRemoteConnection detects IronClaw and caches runtimeKind =
  // "ironclaw". The main chat path must then:
  //   - hit /v1/chat/completions on the bare host (not /api/health/v1/...)
  //   - send Authorization: Bearer <token>
  //   - send the session id as the `user` body field (not session_id)
  //   - NOT send X-Hermes-Session-Id (that's Hermes-specific)
  beforeEach(() => {
    capturedRequests.length = 0;
  });

  afterEach(() => {
    realStopHealthPolling();
    capturedRequests.length = 0;
  });

  it("strips /api/health from the IronClaw URL so chat hits /v1/chat/completions", async () => {
    // The user pastes http://127.0.0.1:3231/api/health (the preset's
    // remoteExampleUrl). normaliseRemoteUrl must strip /api/health so
    // the chat request resolves to .../v1/chat/completions, not
    // .../api/health/v1/chat/completions.
    const { normaliseRemoteUrl } = await import("../src/main/hermes");
    expect(normaliseRemoteUrl("http://127.0.0.1:3231/api/health")).toBe(
      "http://127.0.0.1:3231",
    );
    // /v1 stripping still works (OpenClaw case)
    expect(normaliseRemoteUrl("http://127.0.0.1:18789/v1")).toBe(
      "http://127.0.0.1:18789",
    );
    // Bare host is untouched
    expect(normaliseRemoteUrl("http://127.0.0.1:8642")).toBe(
      "http://127.0.0.1:8642",
    );
  });
});

describe("sendMessageViaApi uses the local API key for loopback remote URLs", () => {
  beforeEach(() => {
    capturedRequests.length = 0;
    mockConnectionConfig.mode = "remote";
    mockConnectionConfig.remoteUrl = "http://127.0.0.1:8642";
    mockConnectionConfig.apiKey = "";
    mockApiServerKey.value = "local-api-secret";
  });

  afterEach(() => {
    realStopHealthPolling();
    capturedRequests.length = 0;
    mockApiServerKey.value = "";
  });

  it("sends the local API server key when remote mode points at localhost", async () => {
    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      undefined,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const headers = chatRequest!.options.headers as Record<string, string>;

    expect(headers.Authorization).toBe("Bearer local-api-secret");
  });

  it("sends the local API server key when remote URL is host.docker.internal", async () => {
    mockConnectionConfig.remoteUrl = "http://host.docker.internal:8642";

    await sendMessage(
      "hello",
      {
        onChunk: () => {},
        onDone: () => {},
        onError: () => {},
      },
      "default",
      undefined,
    );

    await flush();

    const chatRequest = capturedRequests.find((r) =>
      r.url.includes("/v1/chat/completions"),
    );
    expect(chatRequest).toBeDefined();
    const headers = chatRequest!.options.headers as Record<string, string>;

    expect(headers.Authorization).toBe("Bearer local-api-secret");
  });
});
