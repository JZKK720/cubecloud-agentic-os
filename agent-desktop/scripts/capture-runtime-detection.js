// Capture the setup / runtime-detection surface as a standalone preview.
//
// Starts a fresh dev Electron with a local-mode staged HERMES_HOME so the
// renderer lands on Welcome, clicks the primary install CTA, waits for the
// setup screen to mount, and writes `previews/runtime-detection.png`.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const previewsDir = path.join(root, "previews");

function detectPythonRoot() {
  const explicit = process.env.PREVIEW_SOURCE_PYTHONHOME;
  if (explicit && fs.existsSync(path.join(explicit, "pythonw.exe"))) {
    return explicit;
  }

  const candidates = [
    "C:\\Python314",
    "C:\\Program Files\\Python312",
    "C:\\ProgramData\\miniforge3",
    "C:\\ProgramData\\miniconda3",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "pythonw.exe"))) {
      return candidate;
    }
  }

  throw new Error(
    "capture-runtime-detection: no usable pythonw.exe found. " +
      "Set PREVIEW_SOURCE_PYTHONHOME to a Python installation root.",
  );
}

const pythonRoot = detectPythonRoot();

const stageDir = path.join(
  os.tmpdir(),
  `agent-desktop-runtime-${Date.now().toString(36)}`,
);

fs.mkdirSync(stageDir, { recursive: true });
const stageRepo = path.join(stageDir, "hermes-agent");
const stageScripts = path.join(stageRepo, "venv", "Scripts");
const stageHermesCli = path.join(stageRepo, "hermes_cli");
fs.mkdirSync(stageScripts, { recursive: true });
fs.mkdirSync(stageHermesCli, { recursive: true });

for (const fileName of [
  "pythonw.exe",
  "python3.dll",
  "python314.dll",
  "python312.dll",
  "vcruntime140.dll",
  "vcruntime140_1.dll",
]) {
  const source = path.join(pythonRoot, fileName);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(stageScripts, fileName));
  }
}

fs.writeFileSync(path.join(stageScripts, "hermes.exe"), "preview-runtime-cli");
fs.writeFileSync(path.join(stageHermesCli, "__init__.py"), "", "utf8");
fs.writeFileSync(
  path.join(stageHermesCli, "main.py"),
  [
    'import sys',
    '',
    'def main():',
    '    if "--version" in sys.argv:',
    '        print("preview-runtime 0.0.0")',
    '        return 0',
    '    return 0',
    '',
    'if __name__ == "__main__":',
    '    raise SystemExit(main())',
    '',
  ].join("\n"),
  "utf8",
);
fs.writeFileSync(path.join(stageDir, ".env"), "# intentionally empty to force setup\n", "utf8");
fs.writeFileSync(
  path.join(stageDir, "desktop.json"),
  JSON.stringify(
    {
      connectionMode: "local",
      remoteUrl: "",
      apiKey: "",
      gatewayRuntimePreset: "hermes",
      activeProfile: "default",
      locale: "en",
    },
    null,
    2,
  ),
  "utf8",
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForDevtoolsWebSocket(child) {
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => {
      cleanup();
      reject(new Error("DevTools websocket did not appear within 120s"));
    }, 120_000);

    function onChunk(chunk) {
      const text = chunk.toString();
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        cleanup();
        resolve(match[1]);
      }
    }

    function onExit(code) {
      cleanup();
      reject(new Error(`dev process exited before DevTools websocket appeared (code=${code})`));
    }

    function cleanup() {
      clearTimeout(deadline);
      child.stdout.off("data", onChunk);
      child.stderr.off("data", onChunk);
      child.off("exit", onExit);
    }

    child.stdout.on("data", onChunk);
    child.stderr.on("data", onChunk);
    child.on("exit", onExit);
  });
}

async function main() {
  fs.mkdirSync(previewsDir, { recursive: true });

  const devProcess = spawn("cmd.exe", ["/c", "npm run dev"], {
    cwd: root,
    env: {
      ...process.env,
      ENABLE_CDP: "1",
      CDP_PORT: process.env.CDP_PORT || "9224",
      HERMES_HOME: stageDir,
      PYTHONHOME: pythonRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    windowsHide: true,
  });

  devProcess.stdout.on("data", (chunk) => process.stdout.write(chunk));
  devProcess.stderr.on("data", (chunk) => process.stderr.write(chunk));

  let browser = null;
  try {
    const devtoolsWs = await waitForDevtoolsWebSocket(devProcess);
    browser = await chromium.connectOverCDP(devtoolsWs);
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await page.waitForSelector(".setup-screen", { timeout: 30_000 });
    await page.waitForTimeout(1500);

    const outPath = path.join(previewsDir, "runtime-detection.png");
    await page.screenshot({ path: outPath, fullPage: true });
    const stat = fs.statSync(outPath);
    console.log(`[captured] runtime-detection.png (${stat.size} bytes)`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    try {
      devProcess.kill();
    } catch {
      // ignore
    }
  }
}

main().catch((error) => {
  console.error(
    "[capture-runtime-detection] FAILED:",
    error && error.stack ? error.stack : error,
  );
  process.exit(1);
});