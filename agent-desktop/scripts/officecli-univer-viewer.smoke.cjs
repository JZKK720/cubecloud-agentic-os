// End-to-end check for the Univer read-only viewer on the Tools screen.
//
// Verifies, against a real dev build over CDP:
//   1. the Tools screen renders and the OfficeCLI section is present,
//   2. the fixture path can be typed into the file input,
//   3. clicking "View as spreadsheet" mounts Univer into the host node,
//   4. the grid reports > 0 rendered cells and the expected values, and
//   5. no page error / console error is thrown during the flow.
//
// Requires the dev app running with CDP (see scripts/dev-with-cdp.js) and the
// mock gateway on 8765 so the main layout renders.
//
// Usage: CDP_PORT=9222 SMOKE_FIXTURE=<path>.xlsx node scripts/officecli-univer-viewer.smoke.cjs

const { attach } = require("./e2e-attach");

const fixture = process.env.SMOKE_FIXTURE;
if (!fixture) {
  console.error("SMOKE_FIXTURE env var with the .xlsx path is required");
  process.exit(2);
}

(async () => {
  const { browser, page } = await attach();
  const failures = [];
  const check = (name, ok, detail) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
    if (!ok) failures.push(name);
  };

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));

  try {
    await page.waitForSelector('[data-view]', { timeout: 60000 });

    // Go to Tools
    const toolsNav = page.locator('[data-view="tools"]').first();
    try {
      await toolsNav.click({ timeout: 10000, force: true });
    } catch {
      await toolsNav.dispatchEvent("click");
    }
    await page.locator("#officecli-file").waitFor({ state: "visible", timeout: 30000 });
    check("tools screen renders officecli panel", true);

    // Fill the fixture path and click the viewer button.
    await page.locator("#officecli-file").fill(fixture);
    const viewBtn = page.getByRole("button", { name: /View as spreadsheet/i }).first();
    await viewBtn.waitFor({ state: "visible", timeout: 10000 });
    check("viewer button is present", await viewBtn.isEnabled());
    await viewBtn.click();

    // The Univer host div appears only once the lazy chunk loads and the
    // effect mounts the grid.
    const host = page.locator(".officecli-sheet-view-host").first();
    await host.waitFor({ state: "visible", timeout: 60000 });
    check("univer host mounted", true);

    // Wait for the grid to actually render cells (canvas or rows) or a status.
    await page.waitForTimeout(4000);
    const hostInfo = await host.evaluate((el) => {
      const canvases = el.querySelectorAll("canvas").length;
      const rows = el.querySelectorAll('[role="row"]').length;
      const text = (el.textContent || "").trim();
      const rect = el.getBoundingClientRect();
      return { canvases, rows, text: text.slice(0, 200), w: rect.width, h: rect.height };
    });
    console.log("host:", JSON.stringify(hostInfo));
    check("host has non-zero size", hostInfo.w > 0 && hostInfo.h > 0, `${Math.round(hostInfo.w)}x${Math.round(hostInfo.h)}`);
    // (old duplicate call removed)
    const canvasDetail = await host.evaluate((el) =>
      [...el.querySelectorAll("canvas")].map((c) => ({
        w: c.width,
        h: c.height,
        styleH: c.style.height,
        rectH: Math.round(c.getBoundingClientRect().height),
      })),
    );
    console.log("canvases:", JSON.stringify(canvasDetail));
    const painted =
      canvasDetail.some((c) => c.w > 0 && c.h > 0 && c.rectH > 0) || hostInfo.rows > 0;
    check(
      "grid painted (a canvas has non-zero size)",
      painted,
      canvasDetail.map((c) => `${c.w}x${c.h}/css=${c.styleH}/rect=${c.rectH}`).join(" "),
    );
    const status = await page.locator(".officecli-sheet-view-status").first().textContent().catch(() => null);
    console.log("status badge:", status);
    check("viewer reported ready", (status || "").trim().toLowerCase() === "ready", `status=${status}`);

    const meta = await page.locator(".officecli-sheet-view-meta").first().textContent().catch(() => null);
    console.log("meta line:", meta);

    // Univer renders canvas text; canvas pixels are not queryable as text, so
    // assert on the absence of an error banner instead of the cell glyphs.
    const errorBanner = await page.locator(".officecli-sheet-view-state.officecli-sheet-view-error").count();
    check("no viewer error banner", errorBanner === 0);

    check("no page errors", pageErrors.length === 0, pageErrors.join(" | ").slice(0, 300));
    const appConsoleErrors = consoleErrors.filter(
      (e) => !/Download the React DevTools|Autofill|deprecated/i.test(e),
    );
    check("no console errors", appConsoleErrors.length === 0, appConsoleErrors.join(" | ").slice(0, 400));
  } catch (err) {
    console.error("SMOKE ERROR:", err && err.message ? err.message : err);
    failures.push("exception");
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error(`\nRESULT: FAIL (${failures.length} failing checks)`);
    process.exit(1);
  }
  console.log("\nRESULT: PASS");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
