#!/usr/bin/env node
// scripts/runtime-gateways.smoke.cjs
//
// Operator-side smoke for the V2.10.84 runtime lanes that were verified
// against live upstream binaries (OpenClaw 2026.11.6, Raven 0.2.8).
//
// Why this exists: `hermes-agent-attach.smoke.cjs` and
// `ironclaw-attach.smoke.cjs` cover two lanes. OpenClaw and Raven had no
// operator-side check at all, which is how the Raven lane stayed pinned to
// port 8855 — a port that has never existed in Raven's source, its
// history, or its shipped wheel.
//
// What each lane asserts, and why:
//   - OpenClaw: GET /health -> 200 AND GET /v1/models -> 200 with the
//     OpenAI model-list shape. OpenClaw's gateway is WebSocket-first, so
//     the HTTP chat surface only exists once
//     `gateway.http.endpoints.chatCompletions.enabled = true`. Without
//     that toggle /v1/models 404s, so this smoke catches the common
//     "gateway is up but the desktop can't attach" state.
//   - Raven: GET /health -> 200 and the body carries `raven-serve`. Raven
//     has NO /v1 surface at all (its API is WebSocket RPC on /rpc), so
//     the smoke deliberately does NOT assert a chat endpoint. A failure
//     here means "not Raven", not "chat is broken".
//
// Tokens are read from the environment, never from a file, never printed.
//
// Usage:
//   $env:OPENCLAW_GATEWAY_TOKEN = "<gateway token>"
//   node scripts/runtime-gateways.smoke.cjs
//
//   # override hosts/ports:
//   $env:OPENCLAW_SMOKE_URL = "http://127.0.0.1:18789"
//   $env:RAVEN_SMOKE_URL    = "http://127.0.0.1:18792"

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const PROBE_TIMEOUT_MS = 5000;

const OPENCLAW_URL = process.env.OPENCLAW_SMOKE_URL || "http://127.0.0.1:18789";
const RAVEN_URL = process.env.RAVEN_SMOKE_URL || "http://127.0.0.1:18792";

function request(urlString, token) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    return Promise.resolve({
      ok: false,
      status: null,
      latencyMs: 0,
      body: "",
      error: "invalid URL: " + err.message,
    });
  }
  const mod = parsed.protocol === "https:" ? https : http;
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = "Bearer " + token;
    const req = mod.request(
      {
        method: "GET",
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        headers,
        timeout: PROBE_TIMEOUT_MS,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          if (body.length < 65536) body += chunk;
        });
        res.on("end", () => {
          const code = res.statusCode;
          resolve({
            ok: code !== null && code >= 200 && code < 300,
            status: code,
            latencyMs: Date.now() - startedAt,
            body,
            error: null,
          });
        });
      },
    );
    req.on("error", (err) => {
      resolve({
        ok: false,
        status: null,
        latencyMs: Date.now() - startedAt,
        body: "",
        error: err.message,
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        status: null,
        latencyMs: PROBE_TIMEOUT_MS,
        body: "",
        error: "timeout",
      });
    });
    req.end();
  });
}

function report(label, pass, detail) {
  const tag = pass ? "PASS" : "FAIL";
  const line = `[runtime-gateways.smoke] ${label.padEnd(9)} ${tag}  ${detail}`;
  if (pass) console.log(line);
  else console.error(line);
  return pass;
}

/**
 * These two lanes are opt-in: the desktop ships without them and an
 * operator starts them by hand. A refusal therefore is not a failure —
 * it means "not opted in". It only becomes a failure when the process is
 * *running* and answering wrongly, which is the state that actually
 * strands a user.
 */
// Node's ECONNREFUSED arrives as "connect ECONNREFUSED 127.0.0.1:18789",
// not a bare code, so match the substring.
function isAbsent(result) {
  return (
    typeof result.error === "string" &&
    (result.error.includes("ECONNREFUSED") ||
      result.error.includes("EHOSTUNREACH") ||
      result.error === "timeout")
  );
}

function skipNote(label, url) {
  console.log(
    `[runtime-gateways.smoke] ${label.padEnd(9)} SKIP    not running at ${url} (opt-in lane; start it to verify)`,
  );
}

async function checkOpenClaw() {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || "";
  console.log(
    "[runtime-gateways.smoke] openclaw URL   :",
    OPENCLAW_URL,
    token ? `(token set, length=${token.length})` : "(no token)",
  );

  const health = await request(`${OPENCLAW_URL}/health`, token);
  if (isAbsent(health)) {
    // Not started. That is the shipped default, not a defect.
    skipNote("openclaw", OPENCLAW_URL);
    return null;
  }
  if (!report("openclaw", health.ok, `GET /health -> ${health.status} ${health.error || ""}`)) {
    if (health.status === 401 || health.status === 403) {
      console.error(
        "[runtime-gateways.smoke] hint: set OPENCLAW_GATEWAY_TOKEN to the value the gateway was started with.",
      );
    }
    return false;
  }

  const models = await request(`${OPENCLAW_URL}/v1/models`, token);
  let shapeOk = false;
  if (models.ok) {
    try {
      const parsed = JSON.parse(models.body);
      shapeOk =
        parsed &&
        parsed.object === "list" &&
        Array.isArray(parsed.data) &&
        parsed.data.some((m) => typeof m.id === "string");
    } catch {
      shapeOk = false;
    }
  }
  const pass = report(
    "openclaw",
    models.ok && shapeOk,
    `GET /v1/models -> ${models.status} (openai list shape: ${shapeOk})`,
  );
  if (!pass) {
    console.error(
      '[runtime-gateways.smoke] hint: enable `openclaw config set gateway.http.endpoints.chatCompletions.enabled true` and restart the gateway.',
    );
  }
  return pass;
}

async function checkRaven() {
  const token = process.env.RAVEN_GATEWAY_TOKEN || "";
  console.log(
    "[runtime-gateways.smoke] raven    URL   :",
    RAVEN_URL,
    token ? `(token set, length=${token.length})` : "(no token)",
  );

  const health = await request(`${RAVEN_URL}/health`, token);
  if (isAbsent(health)) {
    skipNote("raven", RAVEN_URL);
    return null;
  }
  // Raven's marker appears as `"service": "raven-serve"` (spaced) on the
  // live server, so match the token rather than an exact JSON slice.
  const isRaven = health.ok && health.body.includes("raven-serve");
  const pass = report(
    "raven",
    isRaven,
    `GET /health -> ${health.status} (raven-serve marker: ${isRaven})`,
  );
  if (!pass && health.ok) {
    console.error(
      "[runtime-gateways.smoke] hint: a 200 without a raven-serve marker means something else owns this port; Raven is not on 8855 (that port never existed upstream).",
    );
  }
  return pass;
}

async function main() {
  const results = await Promise.all([checkOpenClaw(), checkRaven()]);
  const ran = results.filter((r) => r !== null);
  const failed = ran.filter((r) => r === false).length;
  const passed = ran.length - failed;
  const skipped = results.length - ran.length;
  console.log(
    `[runtime-gateways.smoke] ${passed}/${ran.length} running lanes green` +
      (skipped ? `, ${skipped} not running (opt-in, skipped)` : ""),
  );
  // A lane that is absent is not a failure; a lane that is present and
  // wrong is.
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("[runtime-gateways.smoke] FAIL unexpected error:", err);
  process.exit(1);
});
