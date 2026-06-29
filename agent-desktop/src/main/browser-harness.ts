// browser-harness.ts — discovery and doctor for the browser-harness CDP tool.
//
// browser-harness (https://github.com/browser-use/browser-harness) is a
// Python CDP harness that connects an LLM agent directly to a real browser
// via Chrome DevTools Protocol. It runs as a CLI (`browser-harness`) with
// a daemon + helpers pattern, and ships a `--doctor` diagnostic.
//
// The desktop's role is discovery + config passthrough — it finds
// browser-harness on PATH, surfaces its health via `--doctor`, and passes
// BH_* env vars to the Hermes runtime so the agent can invoke it. The
// desktop does NOT spawn or manage the browser-harness daemon itself;
// the runtime agent does that.

import { spawnSync } from "child_process";
import { getEnhancedPath } from "./installer";
import { resolveCommandOnPath } from "./agent-clis";

/** Commands that the browser-harness CLI might be installed as. */
const BROWSER_HARNESS_COMMANDS = ["browser-harness", "bh"];

export interface BrowserHarnessDiscovery {
  scannedAt: string;
  installed: boolean;
  detectedCommand: string | null;
  resolvedPath: string | null;
}

export interface BrowserHarnessDoctorResult {
  ok: boolean;
  exitCode: number;
  output: string;
  scannedAt: string;
}

/** Discover browser-harness on PATH. */
export function discoverBrowserHarness(): BrowserHarnessDiscovery {
  const envPath = getEnhancedPath();

  for (const command of BROWSER_HARNESS_COMMANDS) {
    const resolvedPath = resolveCommandOnPath(command, envPath);
    if (resolvedPath) {
      return {
        scannedAt: new Date().toISOString(),
        installed: true,
        detectedCommand: command,
        resolvedPath,
      };
    }
  }

  return {
    scannedAt: new Date().toISOString(),
    installed: false,
    detectedCommand: null,
    resolvedPath: null,
  };
}

/** Run `browser-harness --doctor` and return the result. */
export function runBrowserHarnessDoctor(): BrowserHarnessDoctorResult {
  const discovery = discoverBrowserHarness();
  const command = discovery.detectedCommand ?? "browser-harness";
  const envPath = getEnhancedPath();

  const result = spawnSync(command, ["--doctor"], {
    encoding: "utf8",
    env: { ...process.env, PATH: envPath },
    timeout: 15000,
    windowsHide: true,
  });

  const output = [
    result.stdout ?? "",
    result.stderr ?? "",
  ]
    .join("\n")
    .trim();

  return {
    ok: result.status === 0,
    exitCode: result.status ?? -1,
    output: output || "(no output)",
    scannedAt: new Date().toISOString(),
  };
}