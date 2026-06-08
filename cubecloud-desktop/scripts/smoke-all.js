// Master smoke runner. Spawns each `verify-` script in sequence
// and prints a single pass/fail summary. Designed to be a single
// "is the build healthy?" command that an operator can run
// before a release.
//
// Cubecloud-original work (2026). Distributed under the dual
// license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
// see `BRANDING_AND_LICENSE.md` for the per-path provenance
// breakdown.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Run:
//   ENABLE_CDP=1 CDP_PORT=9222 npm run dev   (in one shell)
//   node scripts/preview-mock-gateway.js     (in another, optional)
//   node scripts/smoke-all.js                (in this one)
//
// Each script in the SUITE array runs as a child process. We
// capture its exit code; if it returns non-zero, that suite is
// red. The smoke runner exits 1 if any suite is red.
//
// The suites are intentionally run sequentially — they all
// share the same dev electron on CDP_PORT 9222, and parallel
// attach-attempts from Playwright would race on the single
// browser context.

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");

const SUITE = [
  {
    name: "verify-step3-4-ipc",
    script: "scripts/verify-step3-4-ipc.js",
    // The 12 new IPC channels from Steps 3+4.
    description: "CodeGraph runtime + EverOS sidecar IPC channels (12 channels)",
  },
  {
    name: "verify-everything",
    script: "scripts/verify-everything.js",
    // The wider read-only / in-staging channel probe.
    description: "Broader IPC surface (80 read-only + in-staging channels)",
  },
  {
    name: "verify-nous-discovery",
    script: "scripts/verify-nous-discovery.js",
    // Nous provider model discovery (#367).
    description: "Nous provider model discovery (network-dependent)",
    // Skipped by default because it requires Nous API access.
    skip: !process.env.INCLUDE_NETWORK_SUITE,
  },
  {
    name: "capture-codegraph-everos",
    script: "scripts/capture-codegraph-everos.js",
    // PNG captures for the two new screens.
    description: "Visual capture of CodeGraph + EverOS screens",
  },
];

const results = [];

function logHeader(text) {
  const line = "─".repeat(72);
  console.log("");
  console.log(line);
  console.log(`▶ ${text}`);
  console.log(line);
}

async function runSuite(suite) {
  if (suite.skip) {
    console.log("");
    console.log(`⏭  ${suite.name} — skipped (${suite.description})`);
    return { name: suite.name, ok: true, skipped: true, durationMs: 0 };
  }
  logHeader(`${suite.name} — ${suite.description}`);
  const start = Date.now();
  return new Promise((resolve) => {
    const child = spawn("node", [path.join(root, suite.script)], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      process.stderr.write(s);
    });
    child.on("close", (code) => {
      const durationMs = Date.now() - start;
      const ok = code === 0;
      results.push({ name: suite.name, ok, durationMs, stdout, stderr, code });
      resolve({ name: suite.name, ok, durationMs });
    });
  });
}

async function main() {
  console.log("Master smoke runner");
  console.log("===================");
  console.log(`Suites planned: ${SUITE.length}`);
  for (const suite of SUITE) {
    console.log(`  - ${suite.name} ${suite.skip ? "(skip)" : ""}`);
  }

  for (const suite of SUITE) {
    await runSuite(suite);
  }

  console.log("");
  console.log("===================");
  console.log("Master smoke summary");
  console.log("===================");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  const totalMs = results.reduce((acc, r) => acc + r.durationMs, 0);
  for (const r of results) {
    const sym = r.skipped ? "⏭ " : r.ok ? "✅" : "🔴";
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`;
    console.log(`  ${sym} ${r.name.padEnd(28)} ${dur.padStart(7)}`);
  }
  console.log("");
  console.log(`[summary] ${passed}/${results.length} suites OK in ${(totalMs / 1000).toFixed(1)}s`);
  if (failed > 0) {
    console.log(`[summary] ${failed} suite(s) FAILED`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[smoke-all] FAILED:", err.message);
  process.exit(1);
});
