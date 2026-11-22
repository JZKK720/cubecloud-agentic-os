// dev-boot-check.cjs — assert `npm run dev` actually starts the app.
//
// WHY THIS EXISTS: `npm run build` succeeding tells you nothing about
// `npm run dev`. They bundle differently. On 2026-11-22 the main bundle emitted a
// runtime `require("@cubecloud/platform-core")` because the workspace package sat
// in `dependencies` and electron-vite externalizes those. Node then loaded
// platform-core's raw TypeScript entry, whose relative imports are extensionless,
// and dev died on startup with ERR_MODULE_NOT_FOUND:
//
//   Cannot find module 'packages/platform-core/src/ag-ui'
//
// Typecheck passed. 1,831 tests passed. `npm run build` passed. CI was green.
// The app would not launch. No gate started the app, so nothing noticed.
//
// This check starts dev with CDP enabled, waits for the DevTools endpoint to
// answer, verifies the renderer actually produced a page target, and then shuts
// everything down. It fails if the process exits early (with the log tail), if
// CDP never answers, or if no page target appears.
//
// Exit codes: 0 pass, 1 fail.
//
// Usage:  node scripts/dev-boot-check.cjs
//         DEV_BOOT_TIMEOUT_MS=120000 node scripts/dev-boot-check.cjs

const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");

const CDP_PORT = Number(process.env.CDP_PORT || 9333);
const TIMEOUT_MS = Number(process.env.DEV_BOOT_TIMEOUT_MS || 120_000);
const POLL_MS = 1_000;

const isWindows = process.platform === "win32";

function log(...args) {
  console.log("[dev-boot-check]", ...args);
}

/** Is anything listening on the port? Used to fail fast with a clear message. */
function portFree(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => resolve(true));
    socket.setTimeout(1_000, () => {
      socket.destroy();
      resolve(true);
    });
  });
}

function fetchJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port: CDP_PORT, path: urlPath, timeout: 3_000 },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("timeout")));
  });
}

function killTree(child) {
  if (!child || child.killed) return;
  if (isWindows) {
    // npm spawns a child tree; killing npm alone leaves electron running and the
    // port bound, which would make the next run fail for the wrong reason.
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      child.kill("SIGKILL");
    }
  }
}

(async () => {
  if (!(await portFree(CDP_PORT))) {
    console.error(
      `[dev-boot-check] FAIL port ${CDP_PORT} is already in use — refusing to test against a foreign process`,
    );
    process.exit(1);
  }

  const cwd = path.join(__dirname, "..");
  const child = spawn(isWindows ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd,
    env: {
      ...process.env,
      ENABLE_CDP: "1",
      CDP_PORT: String(CDP_PORT),
      // Keep electron from trying to open a real window manager dependency on CI.
      ELECTRON_DISABLE_SECURITY_WARNINGS: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    // POSIX: own process group so the whole tree can be killed.
    // Windows: npm.cmd requires a shell to spawn (otherwise EINVAL).
    shell: isWindows,
    detached: !isWindows,
  });

  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (c) => (output += c));
  child.stderr.on("data", (c) => (output += c));

  let exited = null;
  child.on("exit", (code, signal) => {
    exited = { code, signal };
  });

  const deadline = Date.now() + TIMEOUT_MS;
  let version = null;
  let pageTargets = [];

  while (Date.now() < deadline) {
    if (exited) break;
    try {
      version = await fetchJson("/json/version");
      pageTargets = await fetchJson("/json/list");
      break;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  const tail = output.split("\n").slice(-40).join("\n");

  if (exited) {
    killTree(child);
    console.error(
      `[dev-boot-check] FAIL dev exited before the DevTools endpoint answered (code=${exited.code} signal=${exited.signal})`,
    );
    console.error(tail);
    process.exit(1);
  }

  if (!version) {
    killTree(child);
    console.error(
      `[dev-boot-check] FAIL DevTools endpoint on :${CDP_PORT} never answered within ${TIMEOUT_MS}ms`,
    );
    console.error(tail);
    process.exit(1);
  }

  if (!Array.isArray(pageTargets) || pageTargets.length === 0) {
    killTree(child);
    console.error(
      "[dev-boot-check] FAIL CDP answered but exposed no page target — the renderer did not load",
    );
    console.error(tail);
    process.exit(1);
  }

  const page = pageTargets.find((t) => t.type === "page");
  log(`PASS browser=${version.Browser}`);
  log(`PASS page target=${page ? page.url : "(none)"}`);
  log(`PASS dev started and exposed the renderer`);

  killTree(child);
  // Give taskkill a moment, then confirm the port is released.
  await new Promise((r) => setTimeout(r, 2_000));
  if (!(await portFree(CDP_PORT))) {
    log(`WARN port ${CDP_PORT} still bound after kill`);
  }
  process.exit(0);
})().catch((err) => {
  console.error("[dev-boot-check] FAIL unexpected error:", err && err.message);
  process.exit(1);
});
