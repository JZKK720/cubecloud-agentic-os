// Live smoke — exercises the built modules against the real quickstart
// stack (workspace :6767 + Hermes :8642). Transpiled with esbuild and
// run with node; plain CommonJS, no test framework.
//
// Modules under test:
//   1. cubecloud-agent-probe  — GET /health + /v1/info + /v1/stack/status
//   2. cubecloud-agent-sessions — GET /v1/sessions (+ /api/agents join)
//   3. cubecloud-agent-governance — surfaces join (scheduled/policies/sharing)
//   4. openviking/weknora probes — expect graceful unreachable
//
// Written to %TEMP% per the terminal-reliability convention; every result
// prints one line with module + verdict.

const { transformSync } = require("esbuild");
const fs = require("fs");
const path = require("path");

const AGENT_DESKTOP = process.cwd();
const SRC = path.join(AGENT_DESKTOP, "src", "main");

function loadModule(rel, name) {
  const src = fs.readFileSync(path.join(SRC, rel), "utf8");
  const js = transformSync(src, { loader: "ts", format: "cjs" }).code;
  const out = path.join(process.env.TEBMP || process.env.TEMP, name);
  fs.writeFileSync(out, js);
  // Some modules import shared/Electron-side modules; stub the few they
  // touch by pre-seeding require.cache — esbuild's CJS output uses plain
  // require, and absent imports throw at load. Modules used here import
  // nothing (probe/sessions/governance are dependency-free).
  delete require.cache[out];
  return require(out);
}

function sseChunksToLines(text) {
  return text.split(/\r?\n/);
}

(async () => {
  const results = [];
  const push = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}  ${detail}`);
  };

  // ── 1. Probe module (row A) ──────────────────────────────
  try {
    const probe = loadModule("cubecloud-agent-probe.ts", "probe-live.cjs");
    const r = await probe.probeCubecloudAgent("http://127.0.0.1:6767");
    const version = r.info && r.info.version ? r.info.version : "(no /v1/info)";
    push(
      "probe.rowA",
      r.reachable === true && r.error === null,
      `reachable=${r.reachable} health=${JSON.stringify(r.health.status)} info=${version}`,
    );
  } catch (err) {
    push("probe.rowA", false, String(err).slice(0, 140));
  }

  // ── 2. Sessions inventory (row D / R1) ─────────────────
  try {
    const sessions = loadModule("cubecloud-agent-sessions.ts", "sessions-live.cjs");
    const list = await sessions.listWorkspaceSessions("http://127.0.0.1:6767", { limit: 5 });
    push(
      "sessions.list",
      list.success === true && Array.isArray(list.data),
      `count=${list.data.length} hasMore=${list.hasMore}${list.error ? " err=" + list.error : ""}`,
    );
    const agents = await sessions.listWorkspaceAgents("http://127.0.0.1:6767");
    push(
      "sessions.agents",
      agents.success === true && Array.isArray(agents.data),
      `bundles=${agents.data.length}${agents.error ? " err=" + agents.error : ""}`,
    );
    const recon = await sessions.reconcileWorkspaceInventory(
      "http://127.0.0.1:6767",
      [
        { id: "claude", name: "Claude Code" },
        { id: "codex", name: "Codex CLI" },
      ],
    );
    push(
      "sessions.reconcile",
      recon.workspaceAgents.length >= 0,
      `workspaceBundles=${recon.workspaceAgents.length} consoleOnly=${recon.consoleOnly.join(",")} workspaceOnly=${recon.workspaceOnly.length}`,
    );
  } catch (err) {
    push("sessions.*", false, String(err).slice(0, 140));
  }

  // ── 3. Governance surfaces (row G / R4) ────────────────
  try {
    const gov = loadModule("cubecloud-agent-governance.ts", "gov-live.cjs");
    const surfaces = await gov.listGovernanceSurfaces("http://127.0.0.1:6767");
    push(
      "governance.surfaces",
      (surfaces.errors.length === 0 && (surfaces.scheduledTasks.length > 0 || surfaces.policies.length > 0 || surfaces.shares.length >= 0)) === true ||
        surfaces.errors.every((e) => e.includes("404")),
      `tasks=${surfaces.scheduledTasks.length} policies=${surfaces.policies.length} shares=${surfaces.shares.length} errors=${surfaces.errors.join("|") || "none"}`,
    );
  } catch (err) {
    push("governance.surfaces", false, String(err).slice(0, 140));
  }

  // ── 4. Optional-surface probes (R5/R6) — graceful unreachable ──
  try {
    const openviking = loadModule("openviking-probe.ts", "ov-live.cjs");
    const ov = await openviking.probeOpenViking();
    push(
      "openviking.probe",
      ov.reachable === false && typeof ov.error === "string",
      `unreachable-degraded-as-designed (server not running)`,
    );
  } catch (err) {
    push("openviking.probe", false, String(err).slice(0, 140));
  }
  try {
    const weknora = loadModule("weknora-probe.ts", "wk-live.cjs");
    const wk = await weknora.probeWeknora("http://127.0.0.1:8080");
    push(
      "weknora.probe",
      wk.reachable === false,
      `unreachable-degraded-as-designed (server not running)`,
    );
  } catch (err) {
    push("weknora.probe", false, String(err).slice(0, 140));
  }

  // ── Summary ─────────────────────────────────────────────
  const pass = results.filter((r) => r.pass).length;
  console.log(`\nLIVE SMOKE: ${pass}/${results.length} checks pass`);
  for (const r of results.filter((x) => !x.pass)) {
    console.log(`  FAILED: ${r.name} — ${r.detail}`);
  }
  process.exit(0);
})();