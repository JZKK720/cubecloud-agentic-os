#!/usr/bin/env node
// scripts/ironclaw-attach.smoke.cjs
//
// Operator-side smoke test for the V2.10.61 IronClaw third lane.
//
// This script runs OUTSIDE the repo on the operator's local dev box.
// It reads the IronClaw bearer token from the IRONCLAW_TEST_TOKEN
// environment variable, probes the live IronClaw on the published
// gateway port (default 3231), and prints PASS / FAIL with the
// latency. It
// never echoes the token. It never writes the token to a file.
//
// Usage (operator-side, in a local pwsh or bash):
//
//   $env:IRONCLAW_TEST_TOKEN = "<paste token from IronClaw operator panel>"
//   node scripts/ironclaw-attach.smoke.cjs
//   # or override host/port/path:
//   $env:IRONCLAW_TEST_URL = "http://gpu-host.lan:9000/api/health"
//   node scripts/ironclaw-attach.smoke.cjs
//
// The script is intentionally NOT a vitest test — it is a one-shot
// Node CLI. Running it does not require the agent-desktop dev
// environment. The in-repo smoke test
// (agent-desktop/tests/ironclaw-attach.smoke.test.ts) is a separate
// unit-level smoke that proves the V2.10.60 probe module contract.
//
// Security floor: this script never reads a credential from a file,
// never prints a credential, never logs a credential, and never
// writes a credential to disk. The token is held in
// process.env.IRONCLAW_TEST_TOKEN for the duration of one CLI
// invocation and discarded when the process exits.

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

// Default to the live browser-facing IronClaw gateway surface. Operators
// can override via IRONCLAW_TEST_URL.
const DEFAULT_URL = "http://127.0.0.1:3231/api/health";
const PROBE_TIMEOUT_MS = 3000;

// Helper: redacted-string printer. Used in any place we might
// otherwise be tempted to log the token.
function mask(token) {
  if (typeof token !== "string" || token.length === 0) return "<unset>";
  if (token.length <= 8) return "***";
  return token.slice(0, 4) + "…" + token.slice(-4);
}

function probe(urlString, token) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch (err) {
    return Promise.resolve({
      ok: false,
      status: null,
      latencyMs: 0,
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
        path: parsed.pathname,
        headers,
        timeout: PROBE_TIMEOUT_MS,
      },
      (res) => {
        // Drain so the socket can close cleanly.
        res.resume();
        const code = res.statusCode;
        resolve({
          ok: code !== null && code >= 200 && code < 300,
          status: code,
          latencyMs: Date.now() - startedAt,
          error: null,
        });
      },
    );
    req.on("error", (err) => {
      resolve({
        ok: false,
        status: null,
        latencyMs: Date.now() - startedAt,
        error: err.message,
      });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        status: null,
        latencyMs: PROBE_TIMEOUT_MS,
        error: "timeout",
      });
    });
    req.end();
  });
}

async function main() {
  const url = process.env.IRONCLAW_TEST_URL || DEFAULT_URL;
  const token = process.env.IRONCLAW_TEST_TOKEN || "";

  // Print the URL (operator-supplied, not a secret) but never
  // print the token. Even the masked form is a fingerprint;
  // we print the length and the source instead.
  console.log("[ironclaw-attach.smoke] URL   :", url);
  console.log(
    "[ironclaw-attach.smoke] TOKEN :",
    token ? "<set, length=" + token.length + ">" : "<unset>",
  );
  console.log("[ironclaw-attach.smoke] token preview (masked):", mask(token));
  console.log("[ironclaw-attach.smoke] probing...");

  const result = await probe(url, token);

  if (result.ok) {
    console.log(
      "[ironclaw-attach.smoke] PASS  status=" +
        result.status +
        " latency=" +
        result.latencyMs +
        "ms",
    );
    process.exit(0);
  } else {
    console.error(
      "[ironclaw-attach.smoke] FAIL  status=" +
        result.status +
        " latency=" +
        result.latencyMs +
        "ms error=" +
        (result.error || "<none>"),
    );
    // Common-failure hints, mapped to operator-actionable next
    // steps. The token is never referenced in the hints.
    if (result.error === "ECONNREFUSED") {
      console.error(
        "[ironclaw-attach.smoke] hint  : IronClaw is not listening on the host:port. Start the container or check the published port.",
      );
    } else if (result.status === 401 || result.status === 403) {
      console.error(
        "[ironclaw-attach.smoke] hint  : IronClaw rejected the bearer. Verify the token in the IronClaw operator panel matches IRONCLAW_TEST_TOKEN.",
      );
    } else if (result.status === 404) {
      console.error(
        "[ironclaw-attach.smoke] hint  : IronClaw returned 404 on this path. Try IRONCLAW_TEST_URL=http://host:port/api/health or another published gateway path.",
      );
    } else if (result.error === "timeout") {
      console.error(
        "[ironclaw-attach.smoke] hint  : IronClaw did not respond within " +
          PROBE_TIMEOUT_MS +
          "ms. Check the firewall, the published port, and the IronClaw container status.",
      );
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[ironclaw-attach.smoke] FAIL  unexpected error:", err);
  process.exit(1);
});
