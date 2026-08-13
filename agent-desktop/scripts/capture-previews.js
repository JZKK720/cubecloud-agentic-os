const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const { attach } = require("./e2e-attach");

const rootDir = path.resolve(__dirname, "..");
const previewsDir = path.join(rootDir, "previews");

const tabScreens = [
  ["chat.png", "Chat"],
  ["sessions.png", "Sessions"],
  ["agents.png", "Profiles"],
  ["persona.png", "Persona"],
  ["plans.png", "Plans"],
  ["codegraph.png", "CodeGraph"],
  ["everos.png", "EverOS"],
  ["headroom.png", "Headroom"],
  ["models.png", "Models"],
  ["providers.png", "Providers"],
  ["skills.png", "Skills"],
  ["memory.png", "Memory"],
  ["tools.png", "Tools"],
  ["workspace.png", "Workspace"],
  ["schedules.png", "Schedules"],
  ["gateway.png", "Gateway"],
  ["mcp.png", "MCP"],
  ["settings.png", "Settings"],
  // V2.10.78 — new screens added after the original set.
  ["swarm.png", "Swarm"],
  ["knowledge.png", "Knowledge"],
  // Renamed-and-renumbered screens. The order is: existing flow
  // tabs, then the new runtime / platform tabs that were embedded
  // during the rollout. Keeping new screens last means a tab click
  // failure surfaces after the originals are written, so the
  // dupe-detection check can blame a single offender.
];

function assertDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function stagePreviewConfig() {
  // Re-stamp `desktop.json` for the staged HERMES_HOME so previous
  // runs that left a non-English locale or stale remote URL don't
  // cause the visual pass to fail. Only runs when HERMES_HOME is
  // explicitly set to a preview path.
  const home = process.env.HERMES_HOME;
  if (!home) return;
  if (!fs.existsSync(home)) return;
  const desktopJson = path.join(home, "desktop.json");
  const stagedConfig = {
    connectionMode: "remote",
    remoteUrl: process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1",
    remoteApiKey: "preview-only-not-real",
    gatewayRuntimePreset: "hermes",
    locale: "en",
  };
  fs.writeFileSync(
    desktopJson,
    JSON.stringify(stagedConfig, null, 2),
    "utf-8",
  );
  console.log(`[stage] wrote ${desktopJson}`);
}

async function clickTab(page, label) {
  // Scope to the sidebar nav so we don't pick up tab mentions elsewhere
  // on the page (e.g. a "Use in Chat" button on Workspace).
  const scope = page.locator(".sidebar-nav, .sidebar");
  const exact = scope
    .getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}$`) })
    .first();
  if (await exact.count()) {
    await exact.scrollIntoViewIfNeeded({ timeout: 3000 });
    await exact.click({ timeout: 10000 });
    return true;
  }
  const fallback = scope.getByText(label, { exact: true }).first();
  if (await fallback.count()) {
    await fallback.scrollIntoViewIfNeeded({ timeout: 3000 });
    await fallback.click({ timeout: 10000 });
    return true;
  }
  return false;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeSetupOverlay(inputPng) {
  const outputPng = inputPng.replace(/\.png$/i, ".sanitized.png");
  const filters = [
    // Intro paragraph area
    "drawbox=x=740:y=98:w=500:h=120:color=white@0.88:t=fill",
    // Docker card text area
    "drawbox=x=690:y=300:w=560:h=125:color=white@0.86:t=fill",
    // Existing runtime card text area
    "drawbox=x=690:y=620:w=560:h=145:color=white@0.86:t=fill",
  ].join(",");

  execFileSync("ffmpeg", ["-y", "-i", inputPng, "-vf", filters, outputPng], {
    stdio: "ignore",
  });
  fs.renameSync(outputPng, inputPng);
}

async function captureUiPreviews() {
  const { browser, page } = await attach();
  try {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(700);

    // Force a renderer reload so the runInstallCheck() probe runs
    // against the live mock gateway (the dev may have booted before
    // the mock was started, leaving the renderer stuck on Welcome).
    try {
      await page.reload({ waitUntil: "domcontentloaded" });
    } catch (err) {
      console.log(`[reload] skipped: ${err && err.message ? err.message : err}`);
    }
    await page.waitForTimeout(1500);

    // Clear the renderer's cached locale before the first reload so the
    // visual pass doesn't inherit a previous run's `localStorage`
    // `hermes-locale` value. The desktop's own IPC locale still
    // wins, but the renderer's synchronous `readStoredLocale()` in
    // `I18nProvider` would otherwise race the IPC reply and lock
    // the UI into whatever the last user picked. Run after the
    // reload so the page is actually mounted and `localStorage`
    // is reachable.
    try {
      await page.evaluate(() => {
        try {
          localStorage.removeItem("hermes-locale");
        } catch {
          /* localStorage may be blocked — that's fine, the IPC will still set the right value */
        }
      });
    } catch (err) {
      console.log(`[locale-clear] skipped: ${err && err.message ? err.message : err}`);
    }

    // Drive the Welcome flow into a remote connection against the mock
    // gateway. The desktop only enters the main layout once a remote
    // diagnostic succeeds, so a working stand-in is required for a
    // real visual pass — sanitizing setup screens produces fake PNGs.
    await connectToMockGatewayIfNeeded(page);

    // Locale is set in the staged HERMES_HOME before launch. The
    // I18nProvider resolves it via getLocale() on mount, so the
    // sidebar should already be in English when we reach this point.
    // As a defensive check, bail out if the sidebar text isn't English.
    const sidebarText = await page
      .locator(".sidebar-nav")
      .innerText()
      .catch(() => "");
    if (/[一-鿿]/.test(sidebarText)) {
      throw new Error(
        `capture-previews: sidebar is still in a CJK locale after staged HERMES_HOME. ` +
          `Detected sidebar text: ${JSON.stringify(sidebarText.slice(0, 120))}`,
      );
    }

    // Fail fast when the app is still on the Welcome / Setup flow —
    // clicking a tab label on those screens hits the brand wordmark or
    // doesn't change the rendered surface, so every PNG would collapse
    // to a duplicate of the same setup screen.
    const isOnboarding = await isOnboardingScreen(page);
    if (isOnboarding) {
      const screens = await page.locator(".screen, [class*='screen']").count();
      const onWelcome = await page
        .locator("text=Welcome to Cubecloud")
        .count();
      const onSetup = await page.locator("text=Agent Desktop").count();
      throw new Error(
        `capture-previews: app is still on the onboarding/setup flow. ` +
          `Rerun with the desktop in main layout (post-setup or remote mode). ` +
          `Diagnostics: screens=${screens} welcomeMatches=${onWelcome} setupMatches=${onSetup}`,
      );
    }

    const writtenHashes = new Map();
    const failures = [];
    for (const [fileName, tabName] of tabScreens) {
      const clicked = await clickTab(page, tabName);
      await page.waitForTimeout(500);
      const outPath = path.join(previewsDir, fileName);
      await page.screenshot({ path: outPath, fullPage: true });
      if (!clicked) {
        failures.push(
          `${fileName}: tab label "${tabName}" not found in main layout`,
        );
        console.error(`[miss] ${fileName} (no tab "${tabName}")`);
        continue;
      }
      const hash = sha256Of(outPath);
      writtenHashes.set(fileName, hash);
      console.log(`[captured] ${fileName} (sha256=${hash.slice(0, 12)}…)`);
    }

    // Reject the run if more than one preview collapsed to the same
    // screenshot — that means a tab click failed silently and we
    // captured a duplicate of an earlier surface.
    const seen = new Map();
    for (const [file, hash] of writtenHashes.entries()) {
      const list = seen.get(hash) ?? [];
      list.push(file);
      seen.set(hash, list);
    }
    const dupes = [...seen.entries()].filter(
      ([, list]) => list.length > 1,
    );
    if (dupes.length > 0) {
      const detail = dupes
        .map(
          ([hash, list]) =>
            `${list.join(", ")} (sha256=${hash.slice(0, 12)}…)`,
        )
        .join("; ");
      throw new Error(
        `capture-previews: ${dupes.length} duplicate preview group(s) detected — ${detail}. ` +
          `Refusing to overwrite previews with duplicate captures.`,
      );
    }

    if (failures.length > 0) {
      throw new Error(
        `capture-previews: ${failures.length} tab(s) failed to switch:\n  - ${failures.join("\n  - ")}`,
      );
    }
  } finally {
    await browser.close();
  }
}

async function isOnboardingScreen(page) {
  // The main layout always renders a sidebar; if we don't see one the
  // app is still on Welcome / Setup / Install.
  if (await page.locator(".sidebar").count()) return false;
  if (await page.locator(".sidebar-nav").count()) return false;
  if (await page.locator(".layout").count()) return false;
  return true;
}

async function connectToMockGatewayIfNeeded(page) {
  if (!(await isOnboardingScreen(page))) {
    console.log("[connect] already in main layout, skipping connect");
    return;
  }
  const url = process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1";
  // The Welcome screen's main card has a button to open the remote
  // gateway form. If the panel is not already open, click it first.
  let urlInput = page
    .locator(".welcome-remote-input")
    .first();
  if (!(await urlInput.count())) {
    const openPanel = page
      .locator('button:has-text("Connect to remote gateway")')
      .first();
    if (!(await openPanel.count())) {
      throw new Error(
        `capture-previews: cannot find "Connect to remote gateway" button on Welcome screen; aborting visual pass.`,
      );
    }
    await openPanel.click();
    await page.waitForTimeout(400);
    urlInput = page.locator(".welcome-remote-input").first();
  }
  await urlInput.fill(url);
  // The Connect button is identifiable by `.welcome-connect-btn`. Press
  // Enter on the URL input as a robust fallback because the panel may
  // re-render the button while the form is mounting.
  const connectButton = page.locator(".welcome-connect-btn").first();
  if (await connectButton.count()) {
    await connectButton.click();
  } else {
    await urlInput.press("Enter");
  }
  // Wait for the app to enter the main layout. The renderer re-runs the
  // install check, so this can take a couple of seconds.
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.waitForTimeout(500);
    if (!(await isOnboardingScreen(page))) {
      console.log(`[connect] reached main layout in ${(attempt + 1) * 0.5}s`);
      return;
    }
  }
  throw new Error(
    `capture-previews: connect to ${url} did not reach main layout within 15s.`,
  );
}

function sha256Of(filePath) {
  const { createHash } = require("crypto");
  const data = fs.readFileSync(filePath);
  return createHash("sha256").update(data).digest("hex");
}

function toWebp(inputPng, outputWebp) {
  execFileSync(
    "ffmpeg",
    ["-y", "-i", inputPng, "-c:v", "libwebp", "-quality", "90", outputWebp],
    { stdio: "ignore" },
  );
}

async function renderBanner({ html, width, height, outWebp }) {
  const { browser, page } = await attach();
  try {
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: "load" });
    const outPng = outWebp.replace(/\.webp$/i, ".png");
    await page.screenshot({ path: outPng, type: "png" });
    toWebp(outPng, outWebp);
    fs.unlinkSync(outPng);
    console.log(`[captured] ${path.basename(outWebp)}`);
  } finally {
    await browser.close();
  }
}

function headerHtml() {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#e8c140;font-family:Segoe UI,Arial,sans-serif;">
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
      <div style="width:98%;height:94%;border-radius:38px;background:#e8c140;display:flex;align-items:center;padding:28px 56px;box-sizing:border-box;gap:28px;">
        <div style="font-size:150px;line-height:1;color:#111;">☁</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="font-size:108px;line-height:1.02;font-weight:800;color:#0b0b0b;letter-spacing:1px;">CUBECLOUD AGENT DESKTOP</div>
          <div style="font-size:60px;line-height:1.2;color:#131313;">Desktop control center for Cubecloud Agentic-OS</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function downloadHtml() {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#e8c140;font-family:Segoe UI,Arial,sans-serif;">
    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
      <div style="width:98%;height:92%;border-radius:32px;background:#e8c140;display:flex;align-items:center;padding:24px 50px;box-sizing:border-box;gap:30px;">
        <div style="font-size:110px;line-height:1;color:#111;">⬇</div>
        <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
          <div style="font-size:92px;line-height:1.05;font-weight:800;color:#0b0b0b;">DOWNLOAD NOW</div>
          <div style="font-size:42px;letter-spacing:10px;color:#1b1b1b;">LATEST RELEASE OF AGENT DESKTOP</div>
        </div>
        <div style="font-size:72px;color:#111;white-space:nowrap;">APPLE  WINDOWS  LINUX</div>
      </div>
    </div>
  </body>
</html>`;
}

async function main() {
  assertDir(previewsDir);
  stagePreviewConfig();
  const gateway = startMockGateway();
  try {
    await captureUiPreviews();

    await renderBanner({
      html: headerHtml(),
      width: 1918,
      height: 604,
      outWebp: path.join(previewsDir, "header.webp"),
    });

    await renderBanner({
      html: downloadHtml(),
      width: 1918,
      height: 352,
      outWebp: path.join(previewsDir, "download.webp"),
    });

    console.log("[done] previews regenerated");
  } finally {
    stopMockGateway(gateway);
  }
}

function startMockGateway() {
  if (process.env.SKIP_MOCK_GATEWAY === "1") {
    console.log("[gateway] SKIP_MOCK_GATEWAY=1, expecting app to already be in main layout");
    return null;
  }
  const script = path.join(__dirname, "preview-mock-gateway.js");
  const child = spawn(process.execPath, [script], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MOCK_GATEWAY_PORT: "8765" },
  });
  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[gateway] ${chunk}`);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[gateway] ${chunk}`);
  });
  return child;
}

function stopMockGateway(child) {
  if (!child) return;
  if (child.exitCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    /* ignore */
  }
}

main().catch((error) => {
  console.error("FAILED:", error.stack || error.message || error);
  process.exit(1);
});
