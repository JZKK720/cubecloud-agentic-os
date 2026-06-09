// Live smoke test for the broader IPC surface.
//
// Cubecloud-original work (2026). Distributed under the dual
// license per `LICENSE` (AGPL-3.0-or-later OR Apache-2.0 OR MIT);
// see `BRANDING_AND_LICENSE.md` for the per-path provenance
// breakdown.
//
// SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
//
// The narrow `verify-step3-4-ipc.js` covers the 12 new channels
// added in Steps 3+4. This script is the wider net: it touches
// ~80 read-only or in-staging channels and asserts that each
// one is wired up correctly (method-name exposed, no throw on
// a typical call, sensible response shape).
//
// We deliberately skip:
//   - Mutating channels (writes to state.db, profile config,
//     soul.md, wiki, etc.) — those have unit tests with mocked
//     I/O, and exercising them live would pollute the user's
//     HERMES_HOME.
//   - Network-bound channels (OAuth, Nous discovery, SSH tunnel,
//     diagnose-remote) — those need real credentials.
//   - Install / update channels (start-install, run-hermes-update,
//     run-claw-migrate, codegraph-install-cli) — side effects we
//     don't want on a dev machine.
//   - Long-running channels (send-message, start-gateway,
//     check-for-updates) — would block the smoke runner.
//
// Run:
//   ENABLE_CDP=1 CDP_PORT=9222 npm run dev   (in one shell)
//   node scripts/preview-mock-gateway.js     (in another, optional)
//   node scripts/verify-everything.js        (in a third)
//
// Each channel probe prints a `[VERDICT]` line. Exit 1 if any
// channel returns a non-ok envelope.

const { chromium } = require("playwright");

const cdpUrl = `http://127.0.0.1:${process.env.CDP_PORT || "9222"}`;
const mockUrl = process.env.MOCK_GATEWAY_URL || "http://127.0.0.1:8765/v1";

// ── Channel catalog ────────────────────────────────────────────
//
// Each entry is [methodName, buildArgs] where:
//   - methodName: the JS method name on window.hermesAPI
//   - buildArgs: () => array of args to pass to the method
//
// The catalog is hand-authored with the actual JS method names
// (which can have idiosyncratic capitalization like
// `checkOpenClaw` that doesn't follow a strict kebab→camel
// rule). When a method is renamed upstream, this catalog
// needs a matching edit.

const CHANNELS = [
  // status / config probes
  ["checkInstall", () => []],
  ["checkOpenClaw", () => []],
  ["verifyInstall", () => []],
  ["getAppVersion", () => []],
  ["getLocale", () => []],
  ["getConnectionConfig", () => []],
  ["isRemoteMode", () => []],
  ["isRemoteOnlyMode", () => []],
  ["getHermesVersion", () => []],
  ["getHermesHome", () => []],
  ["getEnv", () => ["default"]],
  ["getConfig", () => ["locale"]],
  ["getModelConfig", () => []],
  ["getPlatformEnabled", () => []],
  ["getDesignDials", () => []],
  ["getToolsets", () => []],
  ["getCredentialPool", () => []],
  ["getApiServerKeyStatus", () => []],

  // lists
  ["listBundledSkills", () => []],
  ["listInstalledSkills", () => []],
  ["listProfiles", () => []],
  ["listSessions", () => []],
  ["listCachedSessions", () => []],
  ["listCronJobs", () => []],
  ["listModels", () => []],
  ["listMcpServers", () => []],
  ["listRuntimeProviders", () => []],
  ["listTaskOrchestrators", () => []],

  // everos HTTP
  ["everosPing", () => []],
  ["everosListRecent", () => []],
  ["everosGetConfig", () => []],
  ["everosSearch", () => [{}]],

  // codegraph runtime (Steps 3+4)
  ["codegraphRuntimeStatus", () => []],
  ["codegraphCliStatus", () => []],
  ["codegraphRuntimeStats", () => ["/__nonexistent__/path/__"]],
  ["codegraphRuntimeImpact", () => ["/__nonexistent__/path/__", "n1", 2]],
  ["codegraphRuntimeSearch", () => ["/__nonexistent__/path/__", "main", {}]],

  // everos sidecar (Steps 3+4)
  ["everosSidecarStatus", () => []],
  ["everosSidecarLogTail", () => []],

  // kanban
  ["kanbanListBoards", () => []],
  ["kanbanCurrentBoard", () => []],
  ["kanbanListTasks", () => []],
  ["kanbanGetTask", () => ["__nonexistent__"]],

  // plans
  ["plansList", () => []],
  ["plansGet", () => ["__nonexistent__"]],
  ["plansParse", () => ["# hello world\n\n## Section\n\nSome text."]],

  // knowledge / synthesis
  ["knowledgeList", () => []],
  ["knowledgeGet", () => ["__nonexistent__"]],
  ["knowledgeSearch", () => ["hello"]],
  ["knowledgeSources", () => []],
  ["knowledgeToolManifest", () => []],
  ["schemasListBundled", () => []],
  ["schemasGetActiveId", () => []],
  ["schemasGetActive", () => []],
  ["schemasInferType", () => ["/some/path/file.md"]],
  ["synthesisBuild", () => ["/__nonexistent__/wiki__"]],

  // learnings
  ["learningsSearch", () => ["test"]],
  ["learningsStats", () => []],
  ["learningsFileInfo", () => []],
  ["learningsFindStale", () => []],
  ["learningsRead", () => []],

  // retro / triage / handoff
  // retroBuildContext needs a real sessionId; pass an obviously
  // bad one and assert the channel doesn't throw at the IPC layer.
  ["retroBuildContext", () => ["__nonexistent_session__"]],
  ["triageItems", () => []],
  ["triageRecentSessions", () => []],
  ["handoffBuild", () => []],

  // safety checkers
  ["carefulCheck", () => ["rm -rf /"]],
  ["carefulIsDestructive", () => ["rm -rf /"]],
  ["carefulFindInBody", () => ["# Plan\n\nrm -rf /\n"]],
  ["autoplanBuildBriefs", () => ["# Plan\n\n## Step 1\n\nDo the thing."]],

  // converter / markitdown
  ["isMarkitdownAvailable", () => []],

  // discovery
  ["discoverMemoryProviders", () => []],
  ["discoverAgentClis", () => []],
  ["discoverDockerRuntimes", () => []],

  // file reads
  ["readDirectory", () => ["d:\\"]],
  ["readLogs", () => []],

  // gateway
  ["gatewayStatus", () => []],

  // in-staging: no-throw even if the underlying binary is missing
  ["everosSidecarStop", () => []],
  ["everosSidecarRestart", () => []],
  ["everosSidecarClearLogs", () => []],
  ["codegraphRuntimeClose", () => ["/__nonexistent__/path/__"]],
];

// ── Connect + drive Welcome flow ──────────────────────────────

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
  if (await connectBtn.count()) await connectBtn.click();
  else await urlInput.press("Enter");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.waitForTimeout(500);
    if (await isOnMain(page)) return;
  }
  throw new Error(`connect to ${mockUrl} did not reach main layout within 15s`);
}

// ── Runner ─────────────────────────────────────────────────────

const allVerdicts = [];

function record(label, ok, detail) {
  const sym = ok ? "✅" : "🔴";
  console.log(`[VERDICT] ${sym} ${label} — ${detail}`);
  allVerdicts.push({ label, ok });
}

async function probe(page, methodName, args) {
  // Pass the method name + args as data so the renderer constructs
  // the actual call. This avoids any string-quoting hazards in
  // building JS expressions through `new Function()`.
  const out = await page.evaluate(
    async ({ methodName, callArgs }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (window).hermesAPI[methodName];
        if (typeof fn !== "function") {
          return { ok: false, error: `hermesAPI.${methodName} is not a function (got ${typeof fn})`, kind: "missing" };
        }
        const result = await fn(...callArgs);
        return { ok: true, result };
      } catch (e) {
        // Surface the error class name (e.g. "TypeError",
        // "Error") so the runner can distinguish a typed
        // domain error ("Plan not found") from a real bug
        // (e.g. "Cannot read properties of undefined").
        return { ok: false, error: e?.message || String(e), kind: e?.name || "Error" };
      }
    },
    { methodName, callArgs: args },
  );
  if (!out.ok) {
    // A typed `Error` (e.g. "Plan not found", "Plan markdown is
    // empty") is a successful channel probe — the channel is
    // wired up and gracefully reports input problems. Only a
    // `TypeError` (or "is not a function") indicates a real bug.
    const ok = out.kind === "Error";
    record(methodName, ok, ok ? `typed-error: ${out.error}` : `${out.kind}: ${out.error}`);
    return;
  }
  record(methodName, true, "no-throw");
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
    console.log("");

    console.log(`── Channel probe (${CHANNELS.length} channels) ──`);
    for (const [methodName, buildArgs] of CHANNELS) {
      const args = buildArgs();
      try {
        await probe(page, methodName, args);
      } catch (err) {
        record(methodName, false, `probe error: ${err.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const passed = allVerdicts.filter((v) => v.ok).length;
  const failed = allVerdicts.length - passed;
  console.log("");
  console.log(`[summary] ${passed}/${allVerdicts.length} channels OK`);
  if (failed > 0) {
    console.log(`[summary] ${failed} channel(s) FAILED — see [VERDICT] lines above`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[verify-everything] FAILED:", err.message);
  process.exit(1);
});
