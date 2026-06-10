// One-off: render the brand comparison page in Playwright, dump every
// <img>'s natural + rendered dimensions, and write a side-by-side screenshot
// to .review-extras/brand-comparison.png so we can visually confirm the
// right-sized asset for each surface (README 540, inner README 360,
// splash 600, sidebar 120, etc.).

const { chromium } = require("../agent-desktop/node_modules/playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const file = "file:///" + path.resolve(".review-extras/brand-comparison.html").replace(/\\/g, "/");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 2200 } });
  const page = await ctx.newPage();
  await page.goto(file);
  await page.waitForLoadState("networkidle");

  const rows = await page.$$eval(".row", (els) =>
    els.map((el) => {
      const label = el.querySelector(".label")?.textContent?.trim() || "";
      const img = el.querySelector("img");
      const rect = img?.getBoundingClientRect();
      const natural = { w: img?.naturalWidth, h: img?.naturalHeight };
      return {
        label,
        rendered: rect ? { w: Math.round(rect.width), h: Math.round(rect.height) } : null,
        natural,
        src: img?.getAttribute("src") || "",
        complete: img?.complete || false,
      };
    }),
  );

  console.log("=== Brand pack visual comparison ===\n");
  for (const r of rows) {
    console.log(
      `${r.label.padEnd(48)} | natural=${String(r.natural.w).padStart(5)}x${String(r.natural.h).padStart(4)} | rendered=${String(r.rendered?.w).padStart(4)}x${String(r.rendered?.h).padStart(4)} | ${r.src}`,
    );
  }

  const png = ".review-extras/brand-comparison.png";
  await page.screenshot({ path: png, fullPage: true });
  console.log(`\nScreenshot written to ${png} (${fs.statSync(png).size} bytes)`);

  await browser.close();
})().catch((e) => {
  console.error("Playwright failed:", e.message);
  process.exit(1);
});
