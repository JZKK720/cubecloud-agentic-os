// One-off: render the 1290X480 常规.svg at 540 (root README hero size) AND
// the 120X120 常规.svg at 36h (welcome/setup wordmark height) into a
// single dark+light side-by-side PNG so we can read the wordmark in the
// chat.  Saves to .review-extras/brand-compare-strip.png.

const { chromium } = require("../agent-desktop/node_modules/playwright");
const path = require("path");
const fs = require("fs");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1100 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const html = `<!doctype html><html><head><meta charset="utf-8"><base href="file:///D:/users/joeyzh/github-pr/cubecloud-agentic-os/" /><style>
    body{margin:0;background:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;color:#111}
    h1{font-size:16px;margin:0 0 4px}
    p{font-size:12px;color:#666;margin:0 0 12px}
    .row{display:flex;align-items:center;gap:16px;padding:12px 0;border-top:1px solid #eee}
    .row:last-child{border-bottom:1px solid #eee}
    .lbl{font:11px ui-monospace,SFMono-Regular,monospace;color:#888;min-width:200px}
    .dark{background:#0b1b3a;padding:10px;border-radius:6px}
    img{display:block}
  </style></head><body>
    <h1>Brand-pack sizing test (Playwright render, native Chrome)</h1>
    <p>Asset &nbsp; Rendered px &nbsp;&nbsp; Read: 1290×480 (real wordmark) at README sizes.</p>
    <div class="row"><div class="lbl">1290X480 常规.svg @ 540 (root README)</div><img src="docs/logos/logo.svg/1290X480 常规.svg" width="540" /></div>
    <div class="row"><div class="lbl">1290X480 常规.svg @ 360 (inner README)</div><img src="docs/logos/logo.svg/1290X480 常规.svg" width="360" /></div>
    <div class="row"><div class="lbl">1290X480 常规.svg @ 600 (splash)</div><img src="docs/logos/logo.svg/1290X480 常规.svg" width="600" /></div>
    <div class="row"><div class="lbl">1290X480 反白.svg @ 360 (dark bg)</div><div class="dark"><img src="docs/logos/logo.svg/1290X480 反白.svg" width="360" /></div></div>
    <div class="row"><div class="lbl">120X120 常规.svg @ 120 (sidebar)</div><img src="docs/logos/logo.svg/120X120 常规.svg" width="120" height="120" /></div>
    <div class="row"><div class="lbl">512X512 常规.svg @ 240 (icon)</div><img src="docs/logos/logo.svg/512X512 常规.svg" width="240" height="240" /></div>
  </body></html>`;

  await page.setContent(html, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);

  // Dump a markdown-friendly size report
  const report = await page.$$eval("img", (imgs) =>
    imgs.map((img) => {
      const r = img.getBoundingClientRect();
      return { src: img.getAttribute("src"), w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );
  console.log("=== Rendered sizes (DOM measurement) ===");
  for (const r of report) {
    console.log(`${(r.src || "").padEnd(60)} ${String(r.w).padStart(4)}x${String(r.h).padStart(4)}`);
  }

  const out = ".review-extras/brand-compare-strip.png";
  await page.screenshot({ path: out, fullPage: true });
  console.log("Screenshot: " + out + " (" + fs.statSync(out).size + " bytes)");

  await browser.close();
})().catch((e) => {
  console.error("Failed:", e.message);
  process.exit(1);
});
