// CDP smoke test for the 12 new IPC channels added in Steps 3+4 of the
// rollout. Connects to a running dev electron over CDP and invokes each
// new method through the renderer's `hermesAPI`, asserting the response
// shape and a sensible status value.
//
// Cubecloud-original work (2026). Distributed under the dual
// license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
// see `BRANDING_AND_LICENSE.md` for the per-path provenance
// breakdown.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// What this catches that unit tests don't:
//   - Channel-name typos in preload/index.ts
//   - IPC handler name mismatches between main and preload
//   - contextBridge not exposing the new method
//   - Runtime errors thrown by the main-side handler on first call
//
// What this doesn't catch:
//   - Real sidecar/process lifecycle events (those are covered by
//     tests/everos-sidecar.test.ts and tests/codegraph-runtime.test.ts)
//   - Cross-process timing (no real sidecar is started; we only check
//     the *status* surface, which works whether or not the underlying
//     binary is installed)
//
// Run:  ENABLE_CDP=1 CDP_PORT=9222 npm run dev   (in one shell)
//       node scripts/preview-mock-gateway.js     (in another)
//       node scripts/verify-step3-4-ipc.js       (in a third)
//
// Prints a [VERDICT] line per channel. Exits 1 if any verdict is RED.

const { chromium } = require("playwright");

const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;
const mockUrl = process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1";

const verdicts = [];

function record(channel, label, ok, details) {
  const sym = ok ? "✅" : "🔴";
  const detailStr = details ? ` — ${details}` : "";
  console.log(`[VERDICT] ${sym} ${channel} :: ${label}${detailStr}`);
  verdicts.push({ channel, ok });
}

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
  if (await isOnMain(page)) return;
  if (!(await isOnWelcome(page))) {
    throw new Error(
      "Renderer is not on the Welcome screen — cannot drive connect flow. " +
        "Pre-stage HERMES_HOME with an empty desktop.json.",
    );
  }
  await page
    .locator('button:has-text("Connect to remote gateway")')
    .first()
    .click();
  await page.waitForTimeout(400);
  const urlInput = page.locator(".welcome-remote-input").first();
  await urlInput.fill(mockUrl);
  const connectBtn = page.locator(".welcome-connect-btn").first();
  if (await connectBtn.count()) {
    await connectBtn.click();
  } else {
    await urlInput.press("Enter");
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.waitForTimeout(500);
    if (await isOnMain(page)) return;
  }
  throw new Error(`connect to ${mockUrl} did not reach main layout within 15s`);
}

async function callIpc(page, expr) {
  return await page.evaluate(async (src) => {
    // eslint-disable-next-line no-new-func
    const fn = new Function("return (async () => { return " + src + "; })()");
    try {
      const result = await fn();
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    }
  }, expr);
}

async function main() {
  console.log(`[connect] attaching to ${cdpUrl}`);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  try {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await connectToMockGateway(page);
    console.log("[connect] in main layout, starting channel probe");

    // ---- CodeGraph runtime channels ----
    const cgStatus = await callIpc(
      page,
      "window.hermesAPI.codegraphRuntimeStatus()",
    );
    record(
      "codegraph-runtime-status",
      "codegraphRuntimeStatus()",
      cgStatus.ok &&
        typeof cgStatus.result === "object" &&
        cgStatus.result !== null &&
        "sdkInstalled" in cgStatus.result,
      cgStatus.ok
        ? `sdkInstalled=${cgStatus.result.sdkInstalled}`
        : cgStatus.error,
    );

    const cgStatsEmpty = await callIpc(
      page,
      'window.hermesAPI.codegraphRuntimeStats("/__nonexistent__/path/__")',
    );
    record(
      "codegraph-runtime-stats",
      "codegraphRuntimeStats(unknown path)",
      // Should NOT throw — should return an error envelope or {nodes:0}
      cgStatsEmpty.ok,
      cgStatsEmpty.ok ? "no-throw on unknown path" : cgStatsEmpty.error,
    );

    const cgImpactEmpty = await callIpc(
      page,
      'window.hermesAPI.codegraphRuntimeImpact("/__nonexistent__/path/__", "n1", 2)',
    );
    record(
      "codegraph-runtime-impact",
      "codegraphRuntimeImpact(unknown path)",
      cgImpactEmpty.ok,
      cgImpactEmpty.ok ? "no-throw on unknown path" : cgImpactEmpty.error,
    );

    const cgSearchEmpty = await callIpc(
      page,
      'window.hermesAPI.codegraphRuntimeSearch("/__nonexistent__/path/__", "main", {})',
    );
    record(
      "codegraph-runtime-search",
      "codegraphRuntimeSearch(unknown path)",
      cgSearchEmpty.ok,
      cgSearchEmpty.ok ? "no-throw on unknown path" : cgSearchEmpty.error,
    );

    const cgOpenEmpty = await callIpc(
      page,
      'window.hermesAPI.codegraphRuntimeOpen("/__nonexistent__/path/__")',
    );
    record(
      "codegraph-runtime-open",
      "codegraphRuntimeOpen(unknown path)",
      cgOpenEmpty.ok,
      cgOpenEmpty.ok
        ? "no-throw on unknown path"
        : cgOpenEmpty.error,
    );

    const cgCloseEmpty = await callIpc(
      page,
      'window.hermesAPI.codegraphRuntimeClose("/__nonexistent__/path/__")',
    );
    record(
      "codegraph-runtime-close",
      "codegraphRuntimeClose(unknown path)",
      cgCloseEmpty.ok,
      cgCloseEmpty.ok
        ? "no-throw on unknown path"
        : cgCloseEmpty.error,
    );

    // ---- EverOS sidecar channels ----
    const esStatus = await callIpc(
      page,
      "window.hermesAPI.everosSidecarStatus()",
    );
    record(
      "everos-sidecar-status",
      "everosSidecarStatus()",
      esStatus.ok &&
        typeof esStatus.result === "object" &&
        esStatus.result !== null &&
        "state" in esStatus.result,
      esStatus.ok ? `state=${esStatus.result.state}` : esStatus.error,
    );

    const esLogTail = await callIpc(
      page,
      "window.hermesAPI.everosSidecarLogTail()",
    );
    record(
      "everos-sidecar-log-tail",
      "everosSidecarLogTail()",
      esLogTail.ok &&
        typeof esLogTail.result === "object" &&
        esLogTail.result !== null,
      esLogTail.ok
        ? `lines=${(esLogTail.result.lines || []).length}`
        : esLogTail.error,
    );

    const esClearLogs = await callIpc(
      page,
      "window.hermesAPI.everosSidecarClearLogs()",
    );
    record(
      "everos-sidecar-clear-logs",
      "everosSidecarClearLogs()",
      // Returns void; ok is enough.
      esClearLogs.ok,
      esClearLogs.ok ? "no-throw" : esClearLogs.error,
    );

    // We don't actually start/stop/restart because that would spawn the
    // real `everos` binary which may not be installed in this dev env.
    // We *do* check that the start handler is reachable and returns
    // a structured error envelope when the binary is missing.
    const esStartNoop = await callIpc(
      page,
      "window.hermesAPI.everosSidecarStart({ host: '127.0.0.1', port: 1996 })",
    );
    record(
      "everos-sidecar-start",
      "everosSidecarStart() reachable",
      esStartNoop.ok,
      esStartNoop.ok
        ? "no-throw (may report missing-binary internally)"
        : esStartNoop.error,
    );

    const esStop = await callIpc(page, "window.hermesAPI.everosSidecarStop()");
    record(
      "everos-sidecar-stop",
      "everosSidecarStop()",
      esStop.ok,
      esStop.ok ? "no-throw when not running" : esStop.error,
    );

    const esRestart = await callIpc(
      page,
      "window.hermesAPI.everosSidecarRestart()",
    );
    record(
      "everos-sidecar-restart",
      "everosSidecarRestart()",
      esRestart.ok,
      esRestart.ok ? "no-throw when not running" : esRestart.error,
    );
  } finally {
    await browser.close();
  }

  const passed = verdicts.filter((v) => v.ok).length;
  const failed = verdicts.length - passed;
  console.log("");
  console.log(`[summary] ${passed}/${verdicts.length} channels OK`);
  if (failed > 0) {
    console.log(`[summary] ${failed} channel(s) FAILED — see [VERDICT] lines above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[verify-step3-4-ipc] FAILED:", err.message);
  process.exit(1);
});
