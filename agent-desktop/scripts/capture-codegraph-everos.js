// Capture the two screens that got new UI in Steps 3+4 of the rollout:
//   - previews/codegraph.png — embedded CodeGraph runtime panel
//   - previews/everos.png   — embedded EverOS sidecar lifecycle card
//
// Cubecloud-original work (2026). Distributed under the dual
// license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
// see `BRANDING_AND_LICENSE.md` for the per-path provenance
// breakdown.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// Connects to an already-running dev electron over CDP. Expects:
//   - Dev electron launched with ENABLE_CDP=1 CDP_PORT=9222
//   - Mock gateway running at MOCK_GATEWAY_URL (default http://127.0.0.1:8765/v1)
//   - The renderer on the Welcome screen
//
// Run:  node scripts/capture-codegraph-everos.js

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const previewsDir = path.join(root, "previews");
const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;
const mockUrl = process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1";

async function isOnWelcome(page) {
  return (
    (await page
      .locator('button:has-text("Connect to remote gateway")')
      .count()) > 0
  );
}

async function isOnMain(page) {
  return (await page.locator(".sidebar-nav").count()) > 0;
}

async function connectToMockGateway(page) {
  if (await isOnMain(page)) {
    console.log("[connect] already in main layout, skipping connect");
    return;
  }
  if (!(await isOnWelcome(page))) {
    throw new Error(
      "Renderer is not on the Welcome screen — can't drive connect flow. " +
        "Pre-stage HERMES_HOME with an empty desktop.json so it boots to Welcome.",
    );
  }
  const openPanel = page
    .locator('button:has-text("Connect to remote gateway")')
    .first();
  await openPanel.click();
  await page.waitForTimeout(400);
  const urlInput = page.locator(".welcome-remote-input").first();
  if (!(await urlInput.count())) {
    throw new Error("Remote panel did not surface a URL input");
  }
  await urlInput.fill(mockUrl);
  const connectBtn = page.locator(".welcome-connect-btn").first();
  if (await connectBtn.count()) {
    await connectBtn.click();
  } else {
    await urlInput.press("Enter");
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.waitForTimeout(500);
    if (await isOnMain(page)) {
      console.log(`[connect] reached main layout in ${(attempt + 1) * 0.5}s`);
      return;
    }
  }
  throw new Error(`connect to ${mockUrl} did not reach main layout within 15s`);
}

async function clickTab(page, label) {
  const scope = page.locator(".sidebar-nav, .sidebar");
  const exact = scope
    .getByRole("button", { name: new RegExp(`^${label}$`) })
    .first();
  if (await exact.count()) {
    await exact.click({ timeout: 5000 });
    return true;
  }
  const fallback = scope.getByText(label, { exact: true }).first();
  if (await fallback.count()) {
    await fallback.click({ timeout: 5000 });
    return true;
  }
  return false;
}

async function captureTab(page, label, outName) {
  const clicked = await clickTab(page, label);
  await page.waitForTimeout(800);
  const outPath = path.join(previewsDir, outName);
  await page.screenshot({ path: outPath, fullPage: true });
  const stat = fs.statSync(outPath);
  console.log(
    `[captured] ${outName} (${stat.size} bytes) — tab ${clicked ? "OK" : "MISS"}`,
  );
  if (!clicked) {
    throw new Error(
      `tab label "${label}" not found in sidebar nav — surface may not be wired up`,
    );
  }
}

async function main() {
  fs.mkdirSync(previewsDir, { recursive: true });
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    await connectToMockGateway(page);

    // Capture the two new screens.
    await captureTab(page, "CodeGraph", "codegraph.png");
    await captureTab(page, "EverOS", "everos.png");

    console.log("[done] both previews captured");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[capture-codegraph-everos] FAILED:", err.message);
  process.exit(1);
});
