#!/usr/bin/env node
// scripts/hermes-agent-attach.smoke.cjs
//
// Operator-side smoke test for the V2.10.61 Hermes Agent lane
// (and the V2.10.63 surface that wraps it). Mirrors the
// scripts/ironclaw-attach.smoke.cjs pattern but for a Hermes
// runtime, not an IronClaw container.
//
// This script runs OUTSIDE the repo on the operator's local dev
// box. It reads the Hermes API server key from the
// HERMES_TEST_TOKEN environment variable, probes the live
// Hermes gateway on the published port (default 8642), and
// prints PASS / FAIL with the latency. It never echoes the
// key. It never writes the key to a file.
//
// Usage (operator-side, in a local pwsh or bash):
//
//   $env:HERMES_TEST_TOKEN = "<paste key from ~/.hermes/profiles/<profile>/.env>"
//   node scripts/hermes-agent-attach.smoke.cjs
//   # or override host/port/path:
//   $env:HERMES_TEST_URL = "http://gpu-host.lan:9000/health"
//   node scripts/hermes-agent-attach.smoke.cjs
//
// The script is intentionally NOT a vitest test — it is a
// one-shot Node CLI. Running it does not require the
// agent-desktop dev environment. The in-repo smoke test
// (agent-desktop/tests/hermes-agent-attach.smoke.test.ts) is a
// separate unit-level smoke that proves the V2.10.61
// diagnoseRemoteConnection module contract.
//
// Security floor: this script never reads a credential from a
// file, never prints a credential, never logs a credential,
// and never writes a credential to disk. The key is held in
// process.env.HERMES_TEST_TOKEN for the duration of one CLI
// invocation and discarded when the process exits.

const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

// Default to the documented Hermes local-loopback surface.
// Operators can override via HERMES_TEST_URL.
const DEFAULT_URL = "http://127.0.0.1:8642/health";
const PROBE_TIMEOUT_MS = 3000;

// Helper: masked-string printer. Used in any place we might
// otherwise be tempted to log the key.
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
  const url = process.env.HERMES_TEST_URL || DEFAULT_URL;
  const token = process.env.HERMES_TEST_TOKEN || "";

  // Print the URL (operator-supplied, not a secret) but never
  // print the token. Even the masked form is a fingerprint;
  // we print the length and the source instead.
  console.log("[hermes-agent-attach.smoke] URL   :", url);
  console.log(
    "[hermes-agent-attach.smoke] TOKEN :",
    token ? "<set, length=" + token.length + ">" : "<unset>",
  );
  console.log("[hermes-agent-attach.smoke] token preview (masked):", mask(token));
  console.log("[hermes-agent-attach.smoke] probing...");

  const result = await probe(url, token);

  if (result.ok) {
    console.log(
      "[hermes-agent-attach.smoke] PASS  status=" +
        result.status +
        " latency=" +
        result.latencyMs +
        "ms",
    );
    process.exit(0);
  } else {
    console.error(
      "[hermes-agent-attach.smoke] FAIL  status=" +
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
        "[hermes-agent-attach.smoke] hint  : Hermes is not listening on the host:port. Start the local gateway or check the published port.",
      );
    } else if (result.status === 401 || result.status === 403) {
      console.error(
        "[hermes-agent-attach.smoke] hint  : Hermes rejected the bearer. Verify HERMES_TEST_TOKEN matches API_SERVER_KEY in ~/.hermes/profiles/<profile>/.env.",
      );
    } else if (result.status === 404) {
      console.error(
        "[hermes-agent-attach.smoke] hint  : Hermes returned 404 on /health. Try HERMES_TEST_URL=http://host:port/ (the gateway's base URL, not /health) or restart the gateway.",
      );
    } else if (result.error === "timeout") {
      console.error(
        "[hermes-agent-attach.smoke] hint  : Hermes did not respond within " +
          PROBE_TIMEOUT_MS +
          "ms. Check the firewall, the published port, and the gateway status.",
      );
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[hermes-agent-attach.smoke] FAIL  unexpected error:", err);
  process.exit(1);
});
