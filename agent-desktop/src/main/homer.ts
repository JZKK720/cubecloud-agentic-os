// homer.ts — the headless Hermes-home resolver + path constants.
//
// C1 (doctrine §3): the kernel must boot without Electron. The
// installer wizard's drop (user decision 2026-10-07) removes
// runInstall/verifyInstall flow from the kernel's concern, but 29
// modules import its ELECTRON-FREE constants (HERMES_HOME family,
// getEnhancedPath). This module carries exactly those exports, with
// identical resolution semantics — lifted from installer.ts — so the
// wizard module (and its Electron imports) can stay desktop-shell-only
// and die with C3.

import {
  existsSync,
  readFileSync,
  readdirSync,
} from "fs";
import { join, delimiter } from "path";
import { homedir } from "os";

const IS_WINDOWS = process.platform === "win32";

// Resolve the Hermes data directory. Precedence:
//   1. HERMES_HOME env var if set (install.ps1 sets it User-scope on
//      Windows; users may also override manually for WSL/custom setups).
//   2. On Windows, probe both candidates and pick whichever already has
//      data. install.ps1's default is %LOCALAPPDATA%\hermes, but some
//      setups put data at ~/.hermes (e.g. a junction into WSL, or a
//      custom -HermesHome flag on install). Without probing we'd silently
//      switch directories on users who had it working before.
//   3. Fresh install fallback: %LOCALAPPDATA%\hermes on Windows (matches
//      install.ps1's default), ~/.hermes elsewhere.
//
// NOTE (kernel port): the Electron-only "launch from Start Menu may not
// inherit shell env" heuristic (app.getPath probing) stays in
// installer.ts; the kernel always sees a real process env because it
// boots from a shell or a compose service definition.
function looksLikeHermesHome(dir: string): boolean {
  if (!existsSync(dir)) return false;
  return (
    existsSync(join(dir, "hermes-agent")) ||
    existsSync(join(dir, "gateway.pid")) ||
    existsSync(join(dir, "config.yaml")) ||
    existsSync(join(dir, "active_profile")) ||
    existsSync(join(dir, ".env"))
  );
}

function defaultHermesHome(): string {
  const homeDot = join(homedir(), ".hermes");
  if (!IS_WINDOWS) return homeDot;

  const localApp = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "hermes")
    : null;

  if (localApp && looksLikeHermesHome(localApp)) return localApp;
  if (looksLikeHermesHome(homeDot)) return homeDot;

  return localApp ?? homeDot;
}

export const HERMES_HOME =
  process.env.HERMES_HOME?.trim() || defaultHermesHome();
export const HERMES_REPO = join(HERMES_HOME, "hermes-agent");
export const HERMES_VENV = join(HERMES_REPO, "venv");
// On Windows, use `pythonw.exe` (the GUI-subsystem interpreter that ships in
// every venv) instead of `python.exe` so that subprocess spawns don't flash
// a blank console window — bit-identical interpreter otherwise.
export const HERMES_PYTHON = IS_WINDOWS
  ? join(HERMES_VENV, "Scripts", "pythonw.exe")
  : join(HERMES_VENV, "bin", "python");
export const HERMES_SCRIPT = IS_WINDOWS
  ? join(HERMES_VENV, "Scripts", "hermes.exe")
  : join(HERMES_REPO, "hermes");
export const HERMES_ENV_FILE = join(HERMES_HOME, ".env");
export const HERMES_CONFIG_FILE = join(HERMES_HOME, "config.yaml");
export const HERMES_AUTH_FILE = join(HERMES_HOME, "auth.json");

export function hermesCliArgs(args: string[] = []): string[] {
  if (process.platform === "win32") {
    return ["-m", "hermes_cli.main", ...args];
  }
  // Verbatim installer.ts semantics: POSIX runs the venv script
  // directly (the lift must not drop this — the earlier lossy lift
  // returned bare args, which broke spawn-arg parity).
  return [HERMES_SCRIPT, ...args];
}

/** The PATH used for kernel-side CLI discovery: the process PATH plus
 *  the well-known tool directories the desktop shell added. Mirrors
 *  installer.getEnhancedPath minus its app.getPath callers (no
 *  Electron). */
export function getEnhancedPath(): string {
  const home = homedir();
  const extra = (
    IS_WINDOWS
      ? [
          // Bundled by install.ps1 inside HERMES_HOME — these matter when the
          // user's system PATH doesn't include git or node yet.
          join(HERMES_HOME, "git", "bin"),
          join(HERMES_HOME, "git", "cmd"),
          join(HERMES_HOME, "git", "usr", "bin"),
          join(HERMES_HOME, "node"),
          join(HERMES_VENV, "Scripts"),
          // Common user/system installs.
          process.env.NVM_SYMLINK,
          process.env.APPDATA ? join(process.env.APPDATA, "npm") : undefined,
          process.env.ProgramFiles
            ? join(process.env.ProgramFiles, "nodejs")
            : undefined,
          process.env["ProgramFiles(x86)"]
            ? join(process.env["ProgramFiles(x86)"], "nodejs")
            : undefined,
          process.env.ProgramFiles
            ? join(process.env.ProgramFiles, "Git", "cmd")
            : undefined,
          process.env.LOCALAPPDATA
            ? join(process.env.LOCALAPPDATA, "Programs", "Git", "cmd")
            : undefined,
          // Where `uv` lands when astral.sh's installer runs.
          join(home, ".local", "bin"),
          join(home, ".cargo", "bin"),
        ]
      : [
          join(home, ".local", "bin"),
          join(home, ".cargo", "bin"),
          join(HERMES_VENV, "bin"),
          // Node version manager shim directories
          join(home, ".volta", "bin"),
          join(home, ".asdf", "shims"),
          join(home, ".local", "share", "fnm", "aliases", "default", "bin"),
          join(home, ".fnm", "aliases", "default", "bin"),
          ...resolveNvmBin(home),
          "/usr/local/bin",
          "/opt/homebrew/bin",
          "/opt/homebrew/sbin",
        ]
  ).filter((entry): entry is string => Boolean(entry));
  return [...extra, process.env.PATH || ""].filter(Boolean).join(delimiter);
}

/** Resolve the active nvm node version's bin directory. */
function resolveNvmBin(home: string): string[] {
  const nvmDir = process.env.NVM_DIR || join(home, ".nvm");
  const versionsDir = join(nvmDir, "versions", "node");
  if (!existsSync(versionsDir)) return [];
  try {
    const aliasFile = join(nvmDir, "alias", "default");
    if (existsSync(aliasFile)) {
      const alias = readFileSync(aliasFile, "utf-8").trim();
      if (alias.startsWith("v")) {
        const bin = join(versionsDir, alias, "bin");
        if (existsSync(bin)) return [bin];
      }
    }
    const versions = (readdirSync(versionsDir) as string[])
      .filter((d: string) => d.startsWith("v"))
      .sort()
      .reverse();
    if (versions.length > 0) {
      return [join(versionsDir, versions[0]!, "bin")];
    }
  } catch {
    /* non-fatal */
  }
  return [];
}

/** Resolve the env var name the gateway expects for a given model
 *  config. Returns null when the provider/URL combination has no
 *  known canonical env var. Exact installer.ts signature. */
export function expectedEnvKeyForModel(
  provider: string,
  baseUrl: string,
): string | null {
  const PROVIDER_ENV_KEYS: Record<string, string> = {
    openrouter: "OPENROUTER_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    xai: "XAI_API_KEY",
    groq: "GROQ_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    together: "TOGETHER_API_KEY",
    fireworks: "FIREWORKS_API_KEY",
    cerebras: "CEREBRAS_API_KEY",
    mistral: "MISTRAL_API_KEY",
    perplexity: "PERPLEXITY_API_KEY",
    huggingface: "HF_TOKEN",
    hf: "HF_TOKEN",
    qwen: "QWEN_API_KEY",
    minimax: "MINIMAX_API_KEY",
    glm: "GLM_API_KEY",
    kimi: "KIMI_API_KEY",
    moonshot: "MOONSHOT_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    novita: "NOVITA_API_KEY",
    deepinfra: "DEEPINFRA_API_KEY",
    sambanova: "SAMBANOVA_API_KEY",
    replicate: "REPLICATE_API_KEY",
    stepfun: "STEPFUN_API_KEY",
    hunyuan: "HUNYUAN_API_KEY",
    volcano: "VOLCANO_API_KEY",
    qianfan: "QIANFAN_API_KEY",
    nvidia: "NVIDIA_API_KEY",
    ollama: "OLLAMA_API_KEY",
    lmstudio: "LMSTUDIO_API_KEY",
  };

  const URL_TO_ENV_KEY: Array<[RegExp, string]> = [
    [/openrouter\.ai/i, "OPENROUTER_API_KEY"],
    [/anthropic\.com/i, "ANTHROPIC_API_KEY"],
    [/openai\.com/i, "OPENAI_API_KEY"],
    [/huggingface\.co/i, "HF_TOKEN"],
    [/api\.groq\.com/i, "GROQ_API_KEY"],
    [/api\.deepseek\.com/i, "DEEPSEEK_API_KEY"],
    [/api\.together\.xyz/i, "TOGETHER_API_KEY"],
    [/api\.fireworks\.ai/i, "FIREWORKS_API_KEY"],
    [/api\.cerebras\.ai/i, "CEREBRAS_API_KEY"],
    [/api\.mistral\.ai/i, "MISTRAL_API_KEY"],
    [/api\.perplexity\.ai/i, "PERPLEXITY_API_KEY"],
    [/integrate\.api\.nvidia\.com/i, "NVIDIA_API_KEY"],
    [/open\.bigmodel\.cn/i, "GLM_API_KEY"],
    [/dashscope(-intl)?\.aliyuncs\.com/i, "QWEN_API_KEY"],
    [/api\.minimax(i)?\.(chat|com)/i, "MINIMAX_API_KEY"],
    [/api\.moonshot\.cn/i, "MOONSHOT_API_KEY"],
    [/api\.siliconflow\.com/i, "SILICONFLOW_API_KEY"],
    [/api\.novita\.ai/i, "NOVITA_API_KEY"],
    [/api\.deepinfra\.com/i, "DEEPINFRA_API_KEY"],
    [/api\.sambanova\.ai/i, "SAMBANOVA_API_KEY"],
    [/api\.replicate\.com/i, "REPLICATE_API_KEY"],
    [/api\.stepfun\.com/i, "STEPFUN_API_KEY"],
    [/api\.hunyuan\.cloud\.tencent\.com/i, "HUNYUAN_API_KEY"],
    [/ark\.cn-beijing\.volces\.com/i, "VOLCANO_API_KEY"],
    [/qianfan\.baidubce\.com/i, "QIANFAN_API_KEY"],
    [/(^|\/\/)(127\.0\.0\.1|localhost):11434\b/i, "OLLAMA_API_KEY"],
    [/(^|\/\/)(127\.0\.0\.1|localhost):1234\b/i, "LMSTUDIO_API_KEY"],
  ];

  const direct = PROVIDER_ENV_KEYS[provider.trim().toLowerCase()];
  if (direct) return direct;
  for (const [pattern, envKey] of URL_TO_ENV_KEY) {
    if (pattern.test(baseUrl)) return envKey;
  }
  return null;
}

const OPENCLAW_DIR_NAMES = [".openclaw", ".clawdbot", ".moldbot"];

// Earlier desktop builds could create ~/.openclaw/claw3d/ scaffolding before
// a real OpenClaw install existed, so a bare existsSync check would surface
// that empty stub as a "real" install. Require at least one regular file.
function dirContainsAnyFile(dir: string, maxDepth = 3): boolean {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) return true;
      if (entry.isDirectory() && maxDepth > 0) {
        if (dirContainsAnyFile(join(dir, entry.name), maxDepth - 1)) {
          return true;
        }
      }
    }
  } catch {
    // unreadable → treat as empty
  }
  return false;
}

export function checkOpenClawExists(home: string = homedir()): {
  found: boolean;
  path: string | null;
} {
  for (const name of OPENCLAW_DIR_NAMES) {
    const dir = join(home, name);
    if (existsSync(dir) && dirContainsAnyFile(dir)) {
      return { found: true, path: dir };
    }
  }
  return { found: false, path: null };
}

/** Memory-provider descriptor (pure interface lifted from
 *  installer.ts so ssh-remote — and therefore the kernel's hermes
 *  import chain — stays Electron-free). Keep in lockstep. */
export interface MemoryProviderInfo {
  name: string;
  description: string;
  installed: boolean;
  active: boolean;
  envVars: string[];
}