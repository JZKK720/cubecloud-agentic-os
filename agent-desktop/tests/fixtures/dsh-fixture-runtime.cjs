// Fixture DeepSeek Harness runtime. Speaks the SDK wire protocol:
// JSON-RPC 2.0, one message per newline, over stdio.
//
// The adapter test drives this so the wire contract is exercised for real
// rather than mocked at the fetch() level — dsh does not use HTTP at all.
//
// Emits the upstream event vocabulary
// (packages/core/session/src/types.ts): turn/start, assistant/message
// carrying the exact timed model stream, then turn/end.

let buffer = "";
let seq = 1;

function send(frame) {
  process.stdout.write(`${JSON.stringify(frame)}\n`);
}

function event(type, data) {
  send({
    jsonrpc: "2.0",
    method: "session.event",
    params: { sessionId: "s1", event: { type, seq: seq++, time: Date.now(), data } },
  });
}

function handle(line) {
  let frame;
  try {
    frame = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method } = frame;

  if (method === "initialize") {
    send({ jsonrpc: "2.0", id, result: { protocolVersion: "1" } });
    return;
  }

  if (method === "session/prompt") {
    // Receipt first, then the stream — the real runtime enqueues durably.
    send({ jsonrpc: "2.0", id, result: { messageId: "msg-1" } });
    // DSH_FIXTURE_ABORT=1 makes the turn close with reason aborted instead of
    // completed, so the adapter's non-success path is exercised.
    const aborting = process.env.DSH_FIXTURE_ABORT === "1";
    setImmediate(() => {
      event("turn/start", { turn: 1 });
      if (aborting) {
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
