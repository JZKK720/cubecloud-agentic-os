// Run the agent-desktop mock gateway + dev + capture pipeline in a single
// process so the dev doesn't get killed when the launching shell exits.
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const root = path.resolve(__dirname, "..");

function spawnBg(name, cmd, args, env, logFile) {
  console.log(`[${name}] starting…`);
  const out = fs.openSync(logFile, "w");
  const child = spawn(cmd, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", out, out],
    shell: true,
    windowsHide: true,
  });
  console.log(`[${name}] pid=${child.pid} log=${logFile}`);
  return child;
}

const stageDir = path.join(
  os.tmpdir(),
  `hermes-shell-cd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
);
fs.mkdirSync(stageDir, { recursive: true });

// Stage desktop.json so the renderer lands in main layout
const desktopJson = path.join(stageDir, "desktop.json");
fs.writeFileSync(
  desktopJson,
  JSON.stringify(
    {
      connectionMode: "remote",
      remoteUrl: "http://127.0.0.1:8765/v1",
      remoteApiKey: "preview-only-not-real",
      gatewayRuntimePreset: "hermes",
      locale: "en",
    },
    null,
    2,
  ),
);
console.log(`[stage] wrote ${desktopJson}`);

const mock = spawnBg(
  "mock",
  "node",
  [path.join(root, "scripts", "preview-mock-gateway.js")],
  {},
  path.join(stageDir, "mock.log"),
);

const dev = spawnBg(
  "dev",
  "cmd.exe",
  ["/c", "npm run dev"],
  {
    ENABLE_CDP: "1",
    CDP_PORT: "9222",
    HERMES_HOME: stageDir,
  },
  path.join(stageDir, "dev.log"),
);

// Wait for CDP to be available before kicking off the capture
async function waitForCdp(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 200) {
        console.log(`[wait] CDP is up at ${url}`);
        return;
      }
    } catch (_) {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn(`[wait] CDP did not come up within ${timeoutMs}ms`);
}

(async () => {
  await waitForCdp("http://127.0.0.1:9222/json/version", 90_000);

  const cap = spawn(
    "node",
    [path.join(root, "scripts", "capture-previews.js")],
    {
      cwd: root,
      env: { ...process.env, HERMES_HOME: stageDir },
      stdio: "inherit",
      shell: true,
      windowsHide: true,
    },
  );

  cap.on("exit", (code) => {
    console.log(`[capture] exited with code ${code}`);
    setTimeout(() => {
      try { process.kill(mock.pid); } catch (_) {}
      try { process.kill(dev.pid); } catch (_) {}
      process.exit(code || 0);
    }, 1500);
  });
})().catch((err) => {
  console.error("[orchestrator] FAILED", err);
  try { process.kill(mock.pid); } catch (_) {}
  try { process.kill(dev.pid); } catch (_) {}
  process.exit(1);
});

const shutdown = () => {
  try { process.kill(mock.pid); } catch (_) {}
  try { process.kill(dev.pid); } catch (_) {}
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
