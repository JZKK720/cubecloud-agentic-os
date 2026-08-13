// capture-remaining.cjs — capture screenshots for tabs that the main
// capture-previews.js missed (tools, workspace, schedules, gateway, mcp,
// settings, swarm, knowledge). Connects to the existing CDP endpoint.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const previewsDir = path.join(ROOT, 'previews');

const remaining = [
  ['tools.png', 'Tools'],
  ['workspace.png', 'Workspace'],
  ['schedules.png', 'Schedules'],
  ['gateway.png', 'Gateway'],
  ['mcp.png', 'MCP'],
  ['settings.png', 'Settings'],
  ['swarm.png', 'Swarm'],
  ['knowledge.png', 'Knowledge'],
];

(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const contexts = browser.contexts();
  const pages = contexts[0]?.pages() || [];
  const page = pages[0];

  if (!page) {
    console.error('No page found in CDP browser');
    process.exit(1);
  }

  console.log(`[connect] page url: ${page.url()}`);

  // Verify we're in main layout
  const sidebar = await page.locator('.sidebar-nav').count();
  if (sidebar === 0) {
    console.error('Not in main layout — sidebar not found');
    process.exit(1);
  }
  console.log(`[connect] sidebar found, in main layout`);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(500);

  for (const [fileName, tabName] of remaining) {
    try {
      // Try clicking by data-view attribute (more reliable than text matching)
      const btn = page.locator(`button[data-view="${tabName.toLowerCase()}"]`).first();
      const count = await btn.count();
      if (count === 0) {
        console.log(`[skip] ${fileName} — button not found`);
        continue;
      }

      // Scroll into view
      await btn.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(200);

      // Click
      await btn.click({ timeout: 10000 });
      await page.waitForTimeout(800);

      const outPath = path.join(previewsDir, fileName);
      await page.screenshot({ path: outPath, fullPage: true });
      const stat = fs.statSync(outPath);
      console.log(`[captured] ${fileName} (${stat.size} bytes)`);
    } catch (err) {
      console.log(`[FAILED] ${fileName} — ${err.message.slice(0, 100)}`);
    }
  }

  console.log('[done]');
  await browser.close();
  process.exit(0);
})().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});