const { attach } = require("./e2e-attach");
const { spawn } = require("child_process");
const path = require("path");

const child = spawn(process.execPath, [path.join(__dirname, "preview-mock-gateway.js")], {
  env: { ...process.env, MOCK_GATEWAY_PORT: "8765" },
  stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (d) => process.stdout.write(`[gateway] ${d}`));
child.stderr.on("data", (d) => process.stderr.write(`[gateway] ${d}`));

(async () => {
  try {
    const { browser, page } = await attach();
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1500);
    if (await page.evaluate(() => Boolean(window.hermesAPI?.setLocale))) {
      const result = await page.evaluate(() => window.hermesAPI.setLocale("en"));
      console.log("setLocale result:", result);
      await page.waitForTimeout(800);
    }
    const html = await page.content();
    const sidebarCount = await page.locator(".sidebar").count();
    const sidebarNavCount = await page.locator(".sidebar-nav").count();
    const layoutCount = await page.locator(".layout").count();
    const buttons = await page.locator("button").count();
    const navItems = await page
      .locator(".sidebar-nav button, .sidebar button, .welcome-remote-card button")
      .allTextContents();
    const title = await page.title();
    const url = page.url();
    const connMode = await page.evaluate(() =>
      window.hermesAPI?.getConnectionConfig
        ? window.hermesAPI.getConnectionConfig()
        : null,
    );
    const isRemote = await page.evaluate(() =>
      window.hermesAPI?.isRemoteOnlyMode
        ? window.hermesAPI.isRemoteOnlyMode()
        : null,
    );
    console.log("title:", title);
    console.log("url:", url);
    console.log("sidebar:", sidebarCount, "sidebar-nav:", sidebarNavCount, "layout:", layoutCount, "buttons:", buttons);
    console.log("nav button texts:", JSON.stringify(navItems.slice(0, 40)));
    console.log("connMode:", JSON.stringify(connMode));
    console.log("isRemoteOnly:", isRemote);
    const sample = html.length > 4000 ? html.slice(0, 4000) + "..." : html;
    console.log("----HTML SNIPPET----");
    console.log(sample);
    await browser.close();
  } catch (e) {
    console.error("DEBUG FAILED:", e.stack || e.message);
  } finally {
    child.kill();
  }
})();
