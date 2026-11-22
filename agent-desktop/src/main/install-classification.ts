// install-classification.ts — pure install decisions, Electron-free.
//
// WHY THIS FILE EXISTS: `installer.ts` imports `electron` (it drives the
// desktop's installer UI), so anything importing a *pure* classifier from it —
// including its tests — pays for the Electron runtime. That made three test
// files fail on any machine where Electron's binary was not downloaded,
// notably the console-kernel container builder, which runs
// `npm ci --ignore-scripts` on purpose.
//
// What lives here is decision logic with no I/O and no Electron: which env var
// a provider expects, and what the installer will do to a target directory.
// The filesystem probing that feeds these stays in `installer.ts`.
//
// `installer.ts` re-exports every name below, so no existing caller changed.

// Canonical env-var name per known model provider. Keys here are values
// the user might see in `model.provider` in config.yaml; values are the
// env vars the gateway expects to read from .env. Names that don't
// appear here either don't need a key (local providers, nous) or have
// OAuth-style credentials (covered separately via hasHermesAuthCredential).
//
// Used by the install-gate check below. Previously that check
// hard-coded only OPENROUTER_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY,
// so any user configured for DeepSeek, Groq, Mistral, etc. saw the
// "set AI provider" first-run screen even with a valid key in .env.
// See issue #236.
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
  // Local-LLM providers — Ollama and LM Studio both accept an
  // optional static `Authorization: Bearer <anything>` header. We
  // surface `LMSTUDIO_API_KEY` and `OLLAMA_API_KEY` so a user who
  // turns on a server-side key on either runtime can drop it into
  // .env without reaching for a generic `CUSTOM_API_KEY`.
  ollama: "OLLAMA_API_KEY",
  lmstudio: "LMSTUDIO_API_KEY",
};

// When provider is "custom" or "auto", the desktop's setup flow falls
// back to recognizing the endpoint by base URL. Same patterns hermes.ts
// uses for runtime header injection.
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
  // Match Ollama's loopback before the generic custom:11434 rule
  // below so a user with both running still gets the named key
  // surfaced in install-gate prompts.
  [/(^|\/\/)(127\.0\.0\.1|localhost):11434\b/i, "OLLAMA_API_KEY"],
  [/(^|\/\/)(127\.0\.0\.1|localhost):1234\b/i, "LMSTUDIO_API_KEY"],
];

/**
 * Resolve the env var name the gateway expects for a given model config.
 * Returns null when the provider/URL combination has no known canonical
 * env var (the caller falls back to a permissive `*_API_KEY|*_TOKEN`
 * scan, matching the spirit of the prior hard-coded check).
 *
 * Exported for unit testing.
 */
export function expectedEnvKeyForModel(
  provider: string,
  baseUrl: string,
): string | null {
  const direct = PROVIDER_ENV_KEYS[provider.trim().toLowerCase()];
  if (direct) return direct;
  for (const [pattern, envKey] of URL_TO_ENV_KEY) {
    if (pattern.test(baseUrl)) return envKey;
  }
  return null;
}

export type InstallTargetState = "fresh" | "update" | "replace";

export interface InstallTargetInfo {
  /** Where the desktop will install — shown to the user before they commit. */
  hermesHome: string;
  repoPath: string;
  /** What the installer will do to `repoPath`:
   *  - `fresh`   — nothing is there; a clean install.
   *  - `update`  — a valid git checkout; install.sh/ps1 updates it in place.
   *  - `replace` — a directory is there but not a valid checkout, so the
   *                install script deletes and re-clones it. */
  state: InstallTargetState;
}

/** Classify what the installer will do to the target directory. Pure — the
 *  filesystem probing lives in `inspectInstallTarget`. */
export function classifyInstallTarget(
  repoExists: boolean,
  repoIsGitRepo: boolean,
): InstallTargetState {
  if (!repoExists) return "fresh";
  return repoIsGitRepo ? "update" : "replace";
}
