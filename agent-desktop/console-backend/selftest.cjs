// C0 live selftest: boot the kernel, hit /health + one real route
// (the probe route against a stub, then the supervisor status route
// which is safe-by-default), verify shapes, shut down.
//
// Run from agent-desktop/: node console-backend/selftest.cjs
// (tsx is available as a devDependency of the repo's toolchain; this
// script shells out to it.)

const { spawnSync, spawn } = require("child_process");
const path = require("path");

const agentDir = path.resolve(__dirname, "..");
const PORT = 6799;
const BASE = `http://127.0.0.1:${PORT}`;

function fail(msg) {
  console.error(`SELFTEST FAIL — ${msg}`);
  process.exit(1);
}

// 1. Boot the kernel as a real child proc. Node 24 natively strips
// TS types (--experimental-strip-types) — no tsx/esbuild loader needed
// for this import-free module family. The resolve-ts loader rewrites
// the repo's extensionless TS imports (Bundler-conventional) to .ts
// siblings so the untouched sources boot under native Node ESM.
const child = spawn(
  process.execPath,
  [
    "--experimental-strip-types",
    "--import",
    "file:///D:/users/joeyzh/github-pr/cubecloud-agentic-os-c0-kernel/agent-desktop/console-backend/register-loader.mjs",
    "console-backend/server.ts",
  ],
  {
    cwd: agentDir,
    env: { ...process.env, CONSOLE_KERNEL_PORT: String(PORT) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let log = "";
child.stdout.on("data", (d) => (log += d));
child.stderr.on("data", (d) => (log += d));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHealth(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await wait(250);
  }
  fail(`kernel did not become healthy — log:\n${log}`);
}

(async () => {
  const health = await waitForHealth();
  if (health.status !== "ok") fail(`health status: ${JSON.stringify(health)}`);
  // Phase A: 17 hand seeds + the generic bridge (every desktop IPC
  // channel from dispatch-table.json). Floor, not exact count — the
  // bridge grows with the desktop surface.
  if (health.capabilities < 290) {
    fail(`expected >=290 capabilities (17 seeds + generic bridge), got ${health.capabilities}`);
  }
  console.log(`PASS /health — ${health.capabilities} capabilities registered`);

  // 2. Supervisor status (safe-by-default: no CLI touched, no spawn).
  const supRes = await fetch(`${BASE}/api/console/workspaceSupervisorStatus`, {
    method: "POST",
    body: "[]",
  });
  const sup = await supRes.json();
  if (!supRes.ok || typeof sup.state !== "string") {
    fail(`supervisor status unexpected: HTTP ${supRes.status} ${JSON.stringify(sup)}`);
  }
  console.log(`PASS workspaceSupervisorStatus — ${JSON.stringify(sup.state)}`);

  // 3. workspaceProbeUrl — pure function route.
  const urlRes = await fetch(`${BASE}/api/console/workspaceProbeUrl`, {
    method: "POST",
  });
  const url = await urlRes.json();
  if (url !== "http://127.0.0.1:6767") {
    fail(`workspaceProbeUrl returned ${url}`);
  }
  console.log("PASS workspaceProbeUrl — loopback default");

  // 4. kernelHome (C1) — homer resolution served by the kernel.
  const homeRes = await fetch(`${BASE}/api/console/kernelHome`, {
    method: "POST",
  });
  const home = await homeRes.json();
  if (!home.success || typeof home.hermesHome !== "string" || !home.hermesHome) {
    fail(`kernelHome unexpected: ${JSON.stringify(home)}`);
  }
  console.log(`PASS kernelHome — ${home.hermesHome}`);

  // 5. SSE push transport (Phase A): /api/events/<channel> must open
  // an event stream. The emit path (emitKernelEvent → sink.write) is
  // the same code the chat/progress handlers use.
  const sse = await fetch(`${BASE}/api/events/install-progress`);
  const ct = sse.headers.get("content-type") ?? "";
  if (!ct.includes("text/event-stream")) {
    fail(`SSE endpoint content-type: ${ct}`);
  }
  await sse.body?.cancel();
  console.log("PASS SSE transport — /api/events/<channel> opens event stream");

  child.kill();
  // Windows teardown: destroying the stdio pipes BEFORE the exit avoids
  // the libuv "UV_HANDLE_CLOSING" assertion when the child is killed
  // mid-read (assertion fires after all PASS lines — cosmetic, but it
  // flips the task exit code to 1).
  child.stdout?.destroy();
  child.stderr?.destroy();
  await wait(200);
  console.log("SELFTEST PASS — kernel boots, routes serve, shapes correct");
  process.exit(0);
})().catch((err) => {
  console.error(`SELFTEST FAIL — ${err}`);
  child.kill();
  process.exit(1);
});