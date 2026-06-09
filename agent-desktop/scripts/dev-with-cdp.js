// Spawn the dev server with ENABLE_CDP=1 propagated to electron-vite/electron.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const root = path.resolve(__dirname, "..");

// Optional: connection mode for the staged HERMES_HOME
//   "remote" (default) — point at the mock gateway so the renderer
//                        enters the main layout, useful for tab captures.
//   "local"             — leave remote URL empty so the renderer stays
//                        on the Welcome screen, useful for onboarding
//                        capture.
const mode = process.env.STAGE_MODE || "remote";

const stageDir = path.join(
  os.tmpdir(),
  `hermes-preview-${Date.now()}`,
);
fs.mkdirSync(stageDir, { recursive: true });
const desktopJson = {
  connectionMode: mode,
  remoteUrl:
    mode === "remote"
      ? process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1"
      : "",
  apiKey: "",
  gatewayRuntimePreset: "hermes",
  activeProfile: "default",
  locale: "en",
};
fs.writeFileSync(
  path.join(stageDir, "desktop.json"),
  JSON.stringify(desktopJson, null, 2),
);
console.log(`[dev] staging HERMES_HOME at ${stageDir} (mode=${mode})`);

const child = spawn("cmd.exe", ["/c", "npm run dev"], {
  cwd: root,
  env: {
    ...process.env,
    ENABLE_CDP: "1",
    CDP_PORT: "9222",
    HERMES_HOME: stageDir,
  },
  stdio: "inherit",
  shell: true,
});
child.on("exit", (code) => process.exit(code || 0));
