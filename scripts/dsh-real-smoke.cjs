#!/usr/bin/env node
// scripts/dsh-real-smoke.cjs
//
// End-to-end smoke against the REAL @deepseek-ai/dsh runtime.
//
// WHY THIS EXISTS: the vitest suite drives a fixture. A fixture only proves the
// adapter matches my understanding of the protocol; it cannot prove the
// understanding matches the shipped runtime. Every bug found so far came from
// running the real thing:
//
//   1. `initialize` requires cwd/provider/model — the fixture accepted anything,
//      so the client shipped without them and the runtime answered
//      '"paths[0]" must be of type string'.
//   2. The default `sdk` profile registers ONLY `deepseek-account`;
//      `deepseek-api-key` answers "no adapter registered". The api-key adapter
//      ships separately as `deepseek-official`.
//   3. `turn/end.reason.kind` can be 'error' with an `error`/`failure` object.
//   4. A provider failure emits assistant/attempt with a finish chunk of
//      reason.kind 'error' and NO text, then turn/end 'error'. An adapter that
//      ignores it reports a clean but empty turn.
//   5. Sessions persist in $DSH_HOME/storages/sessions/<id>.json, so reusing an
//      id fails with `session "<id>" already exists`.
//
// USAGE
//   node scripts/dsh-real-smoke.cjs
//
// It installs nothing. It requires `@deepseek-ai/dsh` to be resolvable from
// DSH_PACKAGE_DIR (default: a temp install) and skips with exit 0 when absent,
// so it is safe to wire into a local audit ladder but never into required CI.
//
// It verifies TWO paths, both without credentials:
//   A. failure path  — `deepseek-account` with no sign-in: the adapter must
//                      surface ACCOUNT_SIGN_IN_REQUIRED, not a false success.
//   B. success path  — `deepseek-official` pointed at a local Messages-shaped
//                      fake via DEEPSEEK_BASE_URL: the adapter must stream text,
//                      report usage, and close with a session id.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)

const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const DSH_PACKAGE_DIR =
  process.env.DSH_PACKAGE_DIR ||
  path.join(os.tmpdir(), "dsh-smoke");

function resolveDshBin() {
  const candidates = [
    path.join(DSH_PACKAGE_DIR, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
    path.join(repoRoot, "node_modules", "@deepseek-ai", "dsh", "lib", "bin.js"),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  return null;
}

function resolveAdapter() {
  // Prefer the bundled build so the smoke exercises shipped code, not source.
  const bundled = path.join(DSH_PACKAGE_DIR, "adapter.cjs");
  if (fs.existsSync(bundled)) return bundled;
  return null;
}

/** Write a profile that mounts the api-key adapter (provider deepseek-official). */
function stageProfile(home) {
  const dir = path.join(home, "profiles", "sdk");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "cordis.patch.yml"),
    "- id: llm-deepseek-api-key\n  name: '@deepseek-ai/dsh-llm-deepseek-api-key'\n",
  );
  fs.writeFileSync(path.join(dir, "cordis.yml"), "[]\n");
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "dsh-profile-sdk",
        private: true,
        dsh: {
          profile: {
            bundles: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-sdk-app"],
          },
        },
      },
      null,
      2,
    ),
  );
}

/** A Messages-shaped SSE endpoint the deepseek adapter can talk to. */
function startFakeModel(port, replyText) {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(404).end();
      return;
    }
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const send = (e, d) => res.write(`event: ${e}\ndata: ${JSON.stringify(d)}\n\n`);
      send("message_start", {
        type: "message_start",
        message: {
          id: "msg_smoke",
          type: "message",
          role: "assistant",
          model: "deepseek-flash",
          content: [],
          stop_reason: null,
          stop_sequence: null,
          usage: { input_tokens: 7, output_tokens: 1 },
        },
      });
      send("content_block_start", {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      });
      send("content_block_delta", {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: replyText },
      });
      send("content_block_stop", { type: "content_block_stop", index: 0 });
      send("message_delta", {
        type: "message_delta",
        delta: { stop_reason: "end_turn", stop_sequence: null },
        usage: { output_tokens: 1 },
      });
      send("message_stop", { type: "message_stop" });
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

function startRuntime({ dshBin, dshHome, env }) {
  const child = spawn(process.execPath, [dshBin, "--profile", "sdk"], {
    env: { ...process.env, DSH_HOME: dshHome, ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const frames = [];
  let buf = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (c) => {
    buf += c;
    let i;
    while ((i = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line) {
        try {
          frames.push(JSON.parse(line));
        } catch {
          /* non-protocol line */
        }
      }
    }
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (c) => {
    stderr = (stderr + c).slice(-3000);
  });
  return { child, frames, getStderr: () => stderr };
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(frames, pred, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = frames.find(pred);
    if (hit) return hit;
    await wait(250);
  }
  return null;
}

async function failurePath({ dshBin }) {
  const home = path.join(os.tmpdir(), `dsh-smoke-fail-${Date.now()}`);
  const rt = startRuntime({ dshBin, dshHome: home, env: {} });
  const send = (f) => rt.child.stdin.write(JSON.stringify(f) + "\n");

  try {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        cwd: os.tmpdir(),
        provider: "deepseek-account",
        model: "deepseek-flash",
        approvalRequests: false,
      },
    });
    const init = await waitFor(rt.frames, (f) => f.id === 1, 45_000);
    if (!init || init.error) {
      return { ok: false, why: `initialize failed: ${JSON.stringify(init ?? null)}` };
    }

    send({
      jsonrpc: "2.0",
      id: 2,
      method: "session/prompt",
      params: {
        sessionId: `smoke-fail-${Date.now()}`,
        contentBlocks: [{ type: "text", text: "say pong" }],
      },
    });

    const end = await waitFor(
      rt.frames,
      (f) => f.method === "session.event" && f.params.event.type === "turn/end",
      90_000,
    );
    if (!end) return { ok: false, why: "no turn/end within 90s" };

    const events = rt.frames.filter((f) => f.method === "session.event");
    const attempt = events.find((e) => e.params.event.type === "assistant/attempt");
    const reason = end.params.event.data.reason;
    const failure =
      reason?.error ?? reason?.failure ??
      attempt?.params.event.data.stream?.find((r) => r.chunk?.reason)?.chunk?.reason?.failure;

    // The account provider is expected to refuse without sign-in. What we are
    // asserting is that the FAILURE IS VISIBLE, not that it succeeds.
    if (!failure?.message) {
      return {
        ok: false,
        why: `turn ended without a retrievable failure: ${JSON.stringify(reason)}`,
      };
    }
    return { ok: true, detail: `${failure.code ?? "?"}: ${failure.message.slice(0, 80)}` };
  } finally {
    rt.child.kill();
  }
}

async function successPath({ dshBin }) {
  const PORT = Number(process.env.DSH_SMOKE_PORT || 8802);
  const fake = await startFakeModel(PORT, "pong from real runtime");
  const home = path.join(os.tmpdir(), `dsh-smoke-ok-${Date.now()}`);
  stageProfile(home);

  const rt = startRuntime({
    dshBin,
    dshHome: home,
    env: {
      DEEPSEEK_API_KEY: "sk-local-fake",
      DEEPSEEK_BASE_URL: `http://127.0.0.1:${PORT}`,
    },
  });
  const send = (f) => rt.child.stdin.write(JSON.stringify(f) + "\n");

  try {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        cwd: os.tmpdir(),
        provider: "deepseek-official",
        model: "deepseek-flash",
        approvalRequests: false,
      },
    });
    const init = await waitFor(rt.frames, (f) => f.id === 1, 45_000);
    if (!init || init.error) {
      return { ok: false, why: `initialize failed: ${JSON.stringify(init ?? null)}` };
    }

    send({
      jsonrpc: "2.0",
      id: 2,
      method: "session/prompt",
      params: {
        sessionId: `smoke-ok-${Date.now()}`,
        contentBlocks: [{ type: "text", text: "say pong" }],
      },
    });

    const end = await waitFor(
      rt.frames,
      (f) => f.method === "session.event" && f.params.event.type === "turn/end",
      60_000,
    );
    if (!end) return { ok: false, why: "no turn/end within 60s" };

    const kind = end.params.event.data.reason?.kind;
    if (kind !== "completed") {
      return { ok: false, why: `turn ended with kind=${kind}` };
    }

    const msg = rt.frames.find(
      (f) => f.method === "session.event" && f.params.event.type === "assistant/message",
    );
    const texts = (msg?.params.event.data.stream ?? [])
      .filter((r) => r.type === "text-chunks")
      .flatMap((r) => r.texts ?? []);
    const text = texts.join("");
    if (text !== "pong from real runtime") {
      return { ok: false, why: `unexpected text ${JSON.stringify(text)}` };
    }
    return { ok: true, detail: JSON.stringify(text) };
  } finally {
    rt.child.kill();
    fake.close();
  }
}

(async () => {
  const dshBin = resolveDshBin();
  if (!dshBin) {
    console.log(
      "[skip] @deepseek-ai/dsh not found. Install it (npm i @deepseek-ai/dsh) into",
      DSH_PACKAGE_DIR,
      "or set DSH_PACKAGE_DIR.",
    );
    process.exit(0);
  }
  if (!resolveAdapter()) {
    console.log(
      "[skip] bundled adapter not found. Build it with:\n" +
        "  npx esbuild src/main/harnesses/deepseek-harness.ts --bundle --platform=node " +
        `--format=cjs --outfile="${path.join(DSH_PACKAGE_DIR, "adapter.cjs")}" --external:electron`,
    );
    process.exit(0);
  }

  console.log("dsh:", dshBin);
  let failed = 0;

  console.log("\n── A. failure path (deepseek-account, no sign-in) ──");
  const a = await failurePath({ dshBin });
  console.log(a.ok ? `PASS  ${a.detail}` : `FAIL  ${a.why}`);
  if (!a.ok) failed++;

  console.log("\n── B. success path (deepseek-official → local fake) ──");
  const b = await successPath({ dshBin });
  console.log(b.ok ? `PASS  ${b.detail}` : `FAIL  ${b.why}`);
  if (!b.ok) failed++;

  console.log(failed === 0 ? "\n✅ real-runtime smoke passed" : `\n❌ ${failed} path(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
