export type ProviderPresetCategory = "local" | "byok" | "cli";

export type ProviderDiscoveryMode =
  | "openai-compatible"
  | "ollama"
  | "cli";

export type ProviderDiscoveryStatus =
  | "ok"
  | "no-key"
  | "unsupported"
  | "missing-cli"
  | "unreachable";

export interface AgentProviderPreset {
  id: string;
  name: string;
  type: string;
  category: ProviderPresetCategory;
  summary: string;
  baseUrl: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  cliCommand?: string;
  discoveryMode: ProviderDiscoveryMode;
  defaultModels?: readonly string[];
}

export interface AgentProviderDiscoveryResult {
  providerType: string;
  status: ProviderDiscoveryStatus;
  models: string[];
  detail: string;
  checkedAt: number;
}

export interface ProviderDraftSeed {
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string;
}

export interface ModelDraftSeed {
  name: string;
  provider: string;
  model: string;
  baseUrl: string;
}

export const PROVIDER_PRESET_CATEGORY_LABELS: Record<ProviderPresetCategory, string> = {
  local: "Local",
  byok: "BYOK",
  cli: "CLI",
};

export const PROVIDER_PRESETS: readonly AgentProviderPreset[] = [
  {
    id: "ollama",
    name: "Ollama",
    type: "ollama",
    category: "local",
    summary: "Local Ollama daemon with native model discovery through /api/tags.",
    baseUrl: "http://127.0.0.1:11434/v1",
    requiresApiKey: false,
    discoveryMode: "ollama",
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    type: "custom",
    category: "local",
    summary: "Local OpenAI-compatible LM Studio server.",
    baseUrl: "http://127.0.0.1:1234/v1",
    requiresApiKey: false,
    discoveryMode: "openai-compatible",
  },
  {
    id: "llamacpp",
    name: "llama.cpp",
    type: "custom",
    category: "local",
    summary: "Local llama.cpp OpenAI-compatible server.",
    baseUrl: "http://127.0.0.1:8080/v1",
    requiresApiKey: false,
    discoveryMode: "openai-compatible",
  },
  {
    id: "vllm",
    name: "vLLM",
    type: "custom",
    category: "local",
    summary: "Local or LAN vLLM OpenAI-compatible endpoint.",
    baseUrl: "http://127.0.0.1:8000/v1",
    requiresApiKey: false,
    discoveryMode: "openai-compatible",
  },
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    category: "byok",
    summary: "OpenAI BYOK using the standard /models discovery endpoint.",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "OPENAI_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    type: "anthropic",
    category: "byok",
    summary: "Anthropic BYOK using the Anthropic models endpoint.",
    baseUrl: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    type: "openrouter",
    category: "byok",
    summary: "OpenRouter BYOK through its OpenAI-compatible catalog.",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "OPENROUTER_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "groq",
    name: "Groq",
    type: "groq",
    category: "byok",
    summary: "Groq BYOK with OpenAI-compatible model discovery.",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "GROQ_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    type: "deepseek",
    category: "byok",
    summary: "DeepSeek BYOK through the public OpenAI-compatible endpoint.",
    baseUrl: "https://api.deepseek.com/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "DEEPSEEK_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "together",
    name: "Together AI",
    type: "together",
    category: "byok",
    summary: "Together AI BYOK with OpenAI-compatible discovery.",
    baseUrl: "https://api.together.xyz/v1",
    requiresApiKey: true,
    apiKeyEnvVar: "TOGETHER_API_KEY",
    discoveryMode: "openai-compatible",
  },
  {
    id: "custom-openai-compatible",
    name: "Custom OpenAI-compatible",
    type: "custom",
    category: "byok",
    summary: "Manual OpenAI-compatible endpoint for gateways, sidecars, or private routers.",
    baseUrl: "https://api.example.com/v1",
    requiresApiKey: false,
    discoveryMode: "openai-compatible",
  },
  {
    id: "openai-codex",
    name: "OpenAI Codex CLI",
    type: "openai-codex",
    category: "cli",
    summary: "CLI-backed OpenAI Codex flow; the shell checks whether the command is installed.",
    baseUrl: "",
    requiresApiKey: false,
    cliCommand: "codex",
    discoveryMode: "cli",
    defaultModels: ["gpt-5-codex", "gpt-5-mini"],
  },
  {
    id: "google-gemini-cli",
    name: "Gemini CLI",
    type: "google-gemini-cli",
    category: "cli",
    summary: "CLI-backed Gemini workflow; the shell checks whether the command is installed.",
    baseUrl: "",
    requiresApiKey: false,
    cliCommand: "gemini",
    discoveryMode: "cli",
    defaultModels: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
];

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

export function getProviderPreset(value: string): AgentProviderPreset | undefined {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return undefined;
  }

  return PROVIDER_PRESETS.find(
    (preset) =>
      normalizeValue(preset.id) === normalized ||
      normalizeValue(preset.type) === normalized,
  );
}

export function buildProviderDraftFromPreset(
  preset: AgentProviderPreset,
): ProviderDraftSeed {
  return {
    name: preset.name,
    type: preset.type,
    apiKey: "",
    baseUrl: preset.baseUrl,
  };
}

export function buildModelDraftFromProvider(
  provider: Pick<ProviderDraftSeed, "name" | "type" | "baseUrl">,
  modelId: string,
): ModelDraftSeed {
  const trimmedModel = modelId.trim();
  const preset = getProviderPreset(provider.type);
  const providerName = provider.name.trim() || preset?.name || provider.type || "Provider";

  return {
    name: `${providerName} ${trimmedModel}`.trim().slice(0, 72),
    provider: provider.type.trim() || preset?.type || "custom",
    model: trimmedModel,
    baseUrl: provider.baseUrl.trim() || preset?.baseUrl || "",
  };
}

export function summarizeProviderPresetConnection(
  preset: AgentProviderPreset,
): string {
  if (preset.cliCommand) {
    return `Command: ${preset.cliCommand}`;
  }

  if (preset.baseUrl) {
    return preset.baseUrl;
  }

  return preset.requiresApiKey && preset.apiKeyEnvVar
    ? `Env: ${preset.apiKeyEnvVar}`
    : "Manual configuration";
}