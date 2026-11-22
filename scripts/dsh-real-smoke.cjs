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
//   2. pi-ai refuses a route with no credential at all — a *local* route still
//      needs an `apiKeyEnv` holding a placeholder, which local servers ignore.
//   3. `turn/end.reason.kind` can be 'error' with an `error`/`failure` object.
//   4. A provider failure emits assistant/attempt with a finish chunk of
//      reason.kind 'error' and NO text, then turn/end 'error'. An adapter that
//      ignores it reports a clean but empty turn.
//   5. Sessions persist in $DSH_HOME/storages/sessions/<id>.json, so reusing an
//      id fails with `session "<id>" already exists`.
//   6. The route's `api:` dictates the fake's wire format: an
//      `openai-completions` route fed an Anthropic-shaped stream reports
//      "Stream ended without finish_reason".
//
// USAGE
//   node scripts/dsh-real-smoke.cjs
//
// It installs nothing. It requires `@deepseek-ai/dsh` to be resolvable from
// DSH_PACKAGE_DIR (default: a temp install) and skips with exit 0 when absent,
// so it is safe to wire into a local audit ladder but never into required CI.
//
// Both paths are LOCAL-ONLY: no cloud host, no real credential, no egress.
//   A. failure path  — a loopback route pointing at a dead port on 127.0.0.1.
//   B. success path  — a loopback OpenAI-compatible route, which is the shape
//                      Ollama / LM Studio / vLLM expose.
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

/** An OpenAI-compatible SSE endpoint the local route can talk to.
 *
 * Format matters: the route declares `api: openai-completions`, so the fake
 * must stream `chat.completion.chunk` frames plus a `[DONE]` sentinel. An
 * Anthropic Messages-shaped stream makes the runtime report "Stream ended
 * without finish_reason".
 */
function startFakeModel(port, replyText) {
  const server = http.createServer((req, res) => {
    if (String(req.url).endsWith("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          object: "list",
          data: [{ id: "local-smoke-model", object: "model" }],
        }),
      );
      return;
    }
    if (req.method !== "POST") {
      res.writeHead(404).end();
      return;
    }
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      const send = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
      const base = {
        id: "chatcmpl-smoke",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: "local-smoke-model",
      };
      send({
        ...base,
        choices: [{ index: 0, delta: { role: "assistant", content: replyText }, finish_reason: null }],
      });
      send({
        ...base,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 7, completion_tokens: 1, total_tokens: 8 },
      });
      res.write("data: [DONE]\n\n");
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
  // LOCAL-FIRST failure: a loopback route pointing at a port nothing listens
  // on. This is the realistic local-first failure mode (Ollama not started),
  // and it needs no cloud provider and no credential. What we assert is that
  // the failure is VISIBLE — not that the turn succeeds.
  const home = path.join(os.tmpdir(), `dsh-smoke-fail-${Date.now()}`);
  const dir = path.join(home, "profiles", "sdk");
  fs.mkdirSync(dir, { recursive: true });
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
  fs.writeFileSync(
    path.join(dir, "cordis.patch.yml"),
    [
      "- id: llm-pi-ai",
      "  name: '@deepseek-ai/dsh-llm-pi-ai'",
      "  config:",
      "    providers:",
      "      dead-local:",
      '        displayName: "Dead loopback (nothing listening)"',
      "        api: openai-completions",
      "        baseURL: http://127.0.0.1:9/v1",
      "        apiKeyEnv: DSH_SMOKE_DEAD_KEY",
      "        models:",
      "          - id: dead-model",
      "            contextWindow: 8192",
      "",
    ].join("\n"),
  );

  const rt = startRuntime({
    dshBin,
    dshHome: home,
    env: { DSH_SMOKE_DEAD_KEY: "local-placeholder-no-key" },
  });
  const send = (f) => rt.child.stdin.write(JSON.stringify(f) + "\n");

  try {
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        cwd: os.tmpdir(),
        provider: "dead-local",
        model: "dead-model",
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

    const kind = end.params.event.data.reason?.kind;
    if (kind === "completed") {
      return { ok: false, why: "a dead endpoint reported a completed turn" };
    }
    const detail =
      end.params.event.data.reason?.error?.message ??
      end.params.event.data.reason?.failure?.message ??
      `ended with kind=${kind}`;
    return { ok: true, detail: `${kind}: ${String(detail).slice(0, 90)}` };
  } finally {
    rt.child.kill();
  }
}

async function successPath({ dshBin }) {
  const PORT = Number(process.env.DSH_SMOKE_PORT || 8802);
  const fake = await startFakeModel(PORT, "pong from real runtime");
  const home = path.join(os.tmpdir(), `dsh-smoke-ok-${Date.now()}`);
  const dir = path.join(home, "profiles", "sdk");
  fs.mkdirSync(dir, { recursive: true });
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

  // LOCAL-FIRST: the route is a loopback OpenAI-compatible endpoint, exactly
  // what Ollama exposes. No cloud host, no real credential — pi-ai still
  // insists on a credential reference, so a placeholder env var satisfies it
  // and the local server ignores the header.
  const patchPath = path.join(dir, "cordis.patch.yml");
  fs.writeFileSync(
    patchPath,
    [
      "- id: llm-pi-ai",
      "  name: '@deepseek-ai/dsh-llm-pi-ai'",
      "  config:",
      "    providers:",
      "      local-smoke:",
      '        displayName: "Local smoke (OpenAI-compatible)"',
      "        api: openai-completions",
      `        baseURL: http://127.0.0.1:${PORT}/v1`,
      "        apiKeyEnv: DSH_SMOKE_LOCAL_KEY",
      "        models:",
      "          - id: local-smoke-model",
      "            contextWindow: 262144",
      "",
    ].join("\n"),
  );

  const rt = startRuntime({
    dshBin,
    dshHome: home,
    env: {
      DSH_SMOKE_LOCAL_KEY: "local-placeholder-no-key",
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
        provider: "local-smoke",
        model: "local-smoke-model",
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
      return {
        ok: false,
        why: `turn ended with kind=${kind}: ${JSON.stringify(end.params.event.data.reason?.error ?? null)} stderr=${rt.getStderr().slice(-300)}`,
      };
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

    // The sdk profile's full tool surface must survive the provider swap.
    const hdr = rt.frames.find(
      (f) => f.method === "session.event" && f.params.event.type === "request/header",
    );
    const toolCount = hdr?.params.event.data.header?.tools?.length ?? 0;
    if (toolCount < 20) {
      return { ok: false, why: `expected the full sdk tool surface, saw ${toolCount} tools` };
    }

    return {
      ok: true,
      detail: `${JSON.stringify(text)}, ${toolCount} tools, loopback only`,
    };
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

  console.log("\n── A. failure path (dead loopback route) ──");
  const a = await failurePath({ dshBin });
  console.log(a.ok ? `PASS  ${a.detail}` : `FAIL  ${a.why}`);
  if (!a.ok) failed++;

  console.log("\n── B. success path (loopback OpenAI-compatible, no cloud) ──");
  const b = await successPath({ dshBin });
  console.log(b.ok ? `PASS  ${b.detail}` : `FAIL  ${b.why}`);
  if (!b.ok) failed++;

  console.log(failed === 0 ? "\n✅ real-runtime smoke passed" : `\n❌ ${failed} path(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
})();

