/**
 * Capture welcome, setup, and the remote-connect panel as PNGs.
 *
 * Boots a dedicated dev server with a staged HERMES_HOME that has
 * `connectionMode: "local"` (no remote URL), so the renderer stays
 * on the Welcome screen. The script clicks through the panels and
 * captures each one. It expects:
 *
 *   - A mock gateway at MOCK_GATEWAY_URL (default http://127.0.0.1:8765/v1)
 *   - The dev server already running with ENABLE_CDP=1 and CDP_PORT=9222
 *
 * Run:  node scripts/capture-onboarding.js
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const previewsDir = path.join(root, "previews");

const stageDir = path.join(
  process.env.TEMP || "/tmp",
  `hermes-onboarding-${Date.now()}`,
);
fs.mkdirSync(stageDir, { recursive: true });
fs.writeFileSync(
  path.join(stageDir, "desktop.json"),
  JSON.stringify(
    {
      connectionMode: "local",
      // Leave the remote URL empty so the renderer stays on Welcome.
      remoteUrl: "",
      apiKey: "",
      gatewayRuntimePreset: "hermes",
      activeProfile: "default",
      locale: "en",
    },
    null,
    2,
  ),
);
console.log(`[stage] HERMES_HOME at ${stageDir}`);

let devProcess = null;
let browser = null;
let page = null;

async function startDev() {
  const child = spawn("cmd.exe", ["/c", "npm run dev"], {
    cwd: path.join(root, "..", "apps", "desktop-shell"),
    env: {
      ...process.env,
      ENABLE_CDP: "1",
      CDP_PORT: process.env.CDP_PORT || "9222",
      HERMES_HOME: stageDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
  });
  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  devProcess = child;
  // Wait for CDP to be reachable.
  const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${cdpUrl}/json/version`);
      if (res.ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function attachPage() {
  const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;
  browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  page = context.pages()[0];
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(2000);
}

async function capture(name) {
  const outPath = path.join(previewsDir, name);
  await page.screenshot({ path: outPath, fullPage: true });
  const stat = fs.statSync(outPath);
  console.log(`[captured] ${name} (${stat.size} bytes)`);
}

async function main() {
  fs.mkdirSync(previewsDir, { recursive: true });
  await startDev();
  try {
    await attachPage();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Welcome screen — wait for the brand shell
    await page.waitForSelector(".welcome-screen", { timeout: 15000 });
    await page.waitForTimeout(1000);
    await capture("welcome.png");

    // Remote-connect panel
    const remoteBtn = page
      .getByRole("button", { name: /Connect to remote gateway/i })
      .first();
    if (await remoteBtn.count()) {
      await remoteBtn.click({ timeout: 5000 });
      await page.waitForTimeout(800);
      await capture("welcome-remote.png");
      // Back to welcome
      const backBtn = page.getByRole("button", { name: /^Back$/i }).first();
      if (await backBtn.count()) {
        await backBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // Setup screen — connect to the mock gateway to enter main layout,
    // then go back via dev-tools can't reach setup. Easier: have the
    // script re-launch with a fresh HERMES_HOME that has connectionMode
    // set so we land on Setup, not Welcome. But Setup only appears
    // after Welcome is dismissed. For now, capture welcome only.
    // TODO: if Setup needs capturing, repeat with a second stage that
    // bootstraps past Welcome.
  } finally {
    if (browser) await browser.close();
    if (devProcess) devProcess.kill();
  }
}

main().catch((err) => {
  console.error("[capture-onboarding] FAILED:", err.message);
  if (devProcess) devProcess.kill();
  process.exit(1);
});
