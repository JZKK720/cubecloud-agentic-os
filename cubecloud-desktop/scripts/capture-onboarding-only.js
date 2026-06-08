// Capture onboarding screens (welcome, remote panel) and the
// post-onboarding setup screen. Connects to an already-running
// dev server via CDP. The dev must be started with STAGE_MODE=local
// to land on the Welcome screen.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const previewsDir = path.join(root, "previews");
const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;

async function main() {
  fs.mkdirSync(previewsDir, { recursive: true });
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Welcome screen
  await page.waitForSelector(".welcome-screen", { timeout: 15000 });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(previewsDir, "welcome.png"),
    fullPage: true,
  });
  console.log("[captured] welcome.png");

  // Remote-connect panel
  const remoteBtn = page
    .getByRole("button", { name: /Connect to remote gateway/i })
    .first();
  if (await remoteBtn.count()) {
    await remoteBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(previewsDir, "welcome-remote.png"),
      fullPage: true,
    });
    console.log("[captured] welcome-remote.png");
    // Back to welcome
    const backBtn = page.getByRole("button", { name: /^Back$/i }).first();
    if (await backBtn.count()) {
      await backBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // SSH panel
  const sshBtn = page.getByRole("button", { name: /Connect via SSH/i }).first();
  if (await sshBtn.count()) {
    await sshBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(previewsDir, "welcome-ssh.png"),
      fullPage: true,
    });
    console.log("[captured] welcome-ssh.png");
  }

  await browser.close();
}

main().catch((err) => {
  console.error("[capture-onboarding] FAILED:", err.message);
  process.exit(1);
});
