import { spawn, spawnSync } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const filePath = fileURLToPath(import.meta.url);
const mainDir = dirname(filePath);
const packageRoot = resolve(mainDir, "../..");
const workspaceRoot = resolve(packageRoot, "..");
const repoRoot = resolve(workspaceRoot, "..");
const require = createRequire(import.meta.url);

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const electronBinary = require("electron") as string;

const describeElectronSmoke =
  process.env.CI === "true" && process.platform !== "win32" ? describe.skip : describe;

function setupPartialHermesHome(localAppDataRoot: string): string {
  const hermesRoot = join(localAppDataRoot, "hermes");
  const repoPath = join(hermesRoot, "hermes-agent");
  mkdirSync(repoPath, { recursive: true });
  writeFileSync(join(hermesRoot, "state.db"), "");
  return hermesRoot;
}

function buildDesktopShell(): void {
  const result =
    process.platform === "win32"
      ? spawnSync(
          process.env.ComSpec ?? "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            `${npmCommand} run build --workspace @cubecloud/desktop-shell`,
          ],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: process.env,
          },
        )
      : spawnSync(
          npmCommand,
          ["run", "build", "--workspace", "@cubecloud/desktop-shell"],
          {
            cwd: repoRoot,
            encoding: "utf8",
            env: process.env,
          },
        );

  if (result.status !== 0) {
    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";
    throw new Error(`Desktop shell build failed.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
  }
}

async function runElectronSmoke(options: {
  bootstrapScriptPath: string;
  hermesLocalAppData: string;
  mainEntryPath: string;
}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(electronBinary, [options.bootstrapScriptPath], {
      cwd: packageRoot,
      env: {
        ...process.env,
        LOCALAPPDATA: options.hermesLocalAppData,
        CUBECLOUD_ELECTRON_MAIN_URL: pathToFileURL(options.mainEntryPath).href,
        CUBECLOUD_SMOKE_TARGET_TEXT: "Repair Hermes locally",
        CUBECLOUD_SMOKE_TIMEOUT_MS: "30000",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timeoutId = setTimeout(() => {
      child.kill();
      rejectPromise(
        new Error(
          `Electron smoke test timed out.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`,
        ),
      );
    }, 45000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timeoutId);
      rejectPromise(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeoutId);
      resolvePromise({ code, stdout, stderr });
    });
  });
}

describeElectronSmoke.sequential("Hermes Electron smoke", () => {
  let tempRoot = "";
  let bootstrapScriptPath = "";
  let hermesLocalAppData = "";
  const builtMainEntry = join(packageRoot, "out", "main", "index.js");

  beforeAll(() => {
    tempRoot = mkdtempSync(join(tmpdir(), "cubecloud-hermes-electron-smoke-"));
    hermesLocalAppData = join(tempRoot, "LocalAppData");
    mkdirSync(hermesLocalAppData, { recursive: true });
    setupPartialHermesHome(hermesLocalAppData);

    bootstrapScriptPath = join(tempRoot, "electron-smoke-bootstrap.mjs");
    writeFileSync(
      bootstrapScriptPath,
      `import { app, BrowserWindow } from "electron";

const mainEntryUrl = process.env.CUBECLOUD_ELECTRON_MAIN_URL;
const targetText = process.env.CUBECLOUD_SMOKE_TARGET_TEXT ?? "Repair Hermes locally";
const timeoutMs = Number(process.env.CUBECLOUD_SMOKE_TIMEOUT_MS ?? "30000");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWindow() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const candidate = BrowserWindow.getAllWindows()[0];
    if (candidate) {
      return candidate;
    }
    await sleep(100);
  }
  throw new Error("Electron window was not created before timeout.");
}

async function waitForText(window) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = await window.webContents.executeJavaScript(
      \`(() => (document.body?.innerText ?? \"\").includes(${JSON.stringify("Repair Hermes locally")}))()\`,
      true,
    );
    if (found) {
      return;
    }
    await sleep(150);
  }
  const pageText = await window.webContents.executeJavaScript(
    '(document.body?.innerText ?? "")',
    true,
  );
  throw new Error(\`Did not find target text "\${targetText}". Page text snapshot:\n\${String(pageText).slice(0, 4000)}\`);
}

async function main() {
  if (!mainEntryUrl) {
    throw new Error("Missing CUBECLOUD_ELECTRON_MAIN_URL.");
  }

  await import(mainEntryUrl);
  await app.whenReady();
  const window = await waitForWindow();

  if (window.webContents.isLoading()) {
    await new Promise((resolve) => window.webContents.once("did-finish-load", resolve));
  }

  await waitForText(window);
  console.log("__CUBECLOUD_ELECTRON_SMOKE_OK__");
  app.exit(0);
}

main().catch((error) => {
  console.error("__CUBECLOUD_ELECTRON_SMOKE_FAIL__");
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  app.exit(1);
});\n`,
      { encoding: "utf8" },
    );

    buildDesktopShell();
  }, 120000);

  afterAll(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it(
    "renders Repair Hermes locally for a live partial Hermes home in the real Electron window",
    async () => {
      expect(existsSync(builtMainEntry)).toBe(true);

      const result = await runElectronSmoke({
        bootstrapScriptPath,
        hermesLocalAppData,
        mainEntryPath: builtMainEntry,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("__CUBECLOUD_ELECTRON_SMOKE_OK__");
      expect(result.stderr).not.toContain("__CUBECLOUD_ELECTRON_SMOKE_FAIL__");
    },
    90000,
  );
});
