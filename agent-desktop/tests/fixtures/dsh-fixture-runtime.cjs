// Fixture DeepSeek Harness runtime — modelled on the REAL protocol, verified
// against @deepseek-ai/dsh@0.2.2-rc.5 over stdio.
//
// What the first fixture got wrong (and this one fixes):
//   1. `initialize` requires cwd, provider and model. The old fixture accepted
//      anything, which is exactly why the client shipped without them and the
//      real runtime answered '"paths[0]" must be of type string'.
//   2. An unknown provider answers 'no adapter registered for provider "X"'.
//   3. The model must come from the shipped catalog (deepseek-flash /
//      deepseek-v4-pro); deepseek-chat is accepted by the runtime but is not
//      an advertised model.
//   4. A provider failure emits assistant/attempt with a finish chunk of
//      reason.kind 'error' and NO text, then turn/end with reason.kind 'error'.
//      An adapter that ignores that reports a clean but empty turn — which is
//      what happened on the first real run.
//
// Env knobs:
//   DSH_FIXTURE_ABORT=1    -> turn/end reason {kind:'aborted'}
//   DSH_FIXTURE_ERROR=1    -> the real ACCOUNT_SIGN_IN_REQUIRED failure shape
//   DSH_FIXTURE_BADPROTO=1 -> a non-JSON line instead of a reply

let buffer = "";
let seq = 1;
let initialized = false;

const PROVIDERS = new Set([
  "ollama",
  "lmstudio",
  "llamacpp",
  "vllm",
  "deepseek-account",
  "deepseek-official",
]);
// A local server's catalog is whatever the operator pulled, so accept any
// non-empty model id for the local routes. The cloud routes keep the strict
// catalog check so the fixture still catches a wrong id there.
const LOCAL_ROUTES = new Set(["ollama", "lmstudio", "llamacpp", "vllm"]);
const CLOUD_MODELS = new Set(["deepseek-flash", "deepseek-v4-pro"]);

function send(frame) {
  process.stdout.write(`${JSON.stringify(frame)}\n`);
}

function event(type, data) {
  send({
    jsonrpc: "2.0",
    method: "session.event",
    params: {
      sessionId: "s1",
      event: { type, seq: seq++, time: Date.now(), data },
    },
  });
}

function handle(line) {
  let frame;
  try {
    frame = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params = {} } = frame;

  if (method === "initialize") {
    if (process.env.DSH_FIXTURE_BADPROTO === "1") {
      process.stdout.write("this is not json-rpc\n");
      return;
    }
    if (typeof params.cwd !== "string") {
      send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message:
            'The "paths[0]" argument must be of type string. Received undefined',
        },
      });
      return;
    }
    if (!PROVIDERS.has(params.provider)) {
      send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: `no adapter registered for provider "${params.provider}"`,
        },
      });
      return;
    }
    const isLocal = LOCAL_ROUTES.has(params.provider);
    if (isLocal ? typeof params.model !== "string" : !CLOUD_MODELS.has(params.model)) {
      send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: `unknown model "${params.model}" for provider "${params.provider}"`,
        },
      });
      return;
    }
    initialized = true;
    send({
      jsonrpc: "2.0",
      id,
      result: {
        serverInfo: { name: "deepseek-harness-sdk-runtime", version: "0.0.1" },
      },
    });
    return;
  }

  if (method === "session/prompt") {
    if (!initialized) {
      send({
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: "initialize first" },
      });
      return;
    }
    send({ jsonrpc: "2.0", id, result: { messageId: "msg-1" } });

    setImmediate(() => {
      event("turn/start", { turn: 1 });

      if (process.env.DSH_FIXTURE_ERROR === "1") {
        event("assistant/attempt", {
          turn: 1,
          step: 1,
          stream: [
            {
              type: "chunk",
              time: Date.now(),
              chunk: {
                type: "finish",
                reason: {
                  kind: "error",
                  failure: {
                    message:
                      "Sign in to DeepSeek to use the account provider. The request destination must allow account authentication.",
                    code: "ACCOUNT_SIGN_IN_REQUIRED",
                  },
                },
              },
            },
          ],
        });
        event("step/end", { turn: 1, step: 1 });
        event("turn/end", {
          turn: 1,
          reason: {
            kind: "error",
            error: {
              message:
                "Sign in to DeepSeek to use the account provider. The request destination must allow account authentication.",
              code: "ACCOUNT_SIGN_IN_REQUIRED",
            },
          },
        });
        return;
      }

      if (process.env.DSH_FIXTURE_ABORT === "1") {
        event("turn/end", { turn: 1, reason: { kind: "aborted" } });
        return;
      }

      event("tool/call", {
        turn: 1,
        step: 1,
        callId: "call-1",
        name: "read_file",
        arguments: '{"path":"a.txt"}',
      });
      event("tool/result", {
        turn: 1,
        step: 1,
        message: { content: "file contents" },
      });
      event("assistant/message", {
        turn: 1,
        step: 1,
        message: { role: "assistant" },
        stream: [
          {
            type: "reasoning-chunks",
            time0: Date.now(),
            index: 0,
            dt: [1],
            texts: ["considering"],
          },
          {
            type: "text-chunks",
            time0: Date.now(),
            index: 1,
            dt: [1, 2],
            texts: ["Hello from ", "DeepSeek Harness."],
          },
        ],
        usage: { inputTokens: 12, outputTokens: 4 },
      });
      event("step/end", { turn: 1, step: 1 });
      event("turn/end", { turn: 1, reason: { kind: "completed" } });
    });
    return;
  }

  if (method === "shutdown") {
    send({ jsonrpc: "2.0", id, result: {} });
    setImmediate(() => process.exit(0));
    return;
  }

  if (id !== undefined) {
    send({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `unknown method ${method}` },
    });
  }
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx = buffer.indexOf("\n");
  while (idx !== -1) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) handle(line);
    idx = buffer.indexOf("\n");
  }
});
