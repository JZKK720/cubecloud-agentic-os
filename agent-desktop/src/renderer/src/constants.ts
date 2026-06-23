// ── Shared Types ────────────────────────────────────────

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  hint: string;
}

export interface SectionDef {
  title: string;
  items: FieldDef[];
}

// ── Providers ───────────────────────────────────────────

export const PROVIDERS = {
  // Ordered for the Providers / model-picker dropdown.  Each value must
  // match a provider name `hermes-agent` recognises (see
  // hermes_cli/auth.py::resolve_provider — _PROVIDER_ALIASES + PROVIDER_REGISTRY)
  // so the gateway routes correctly when the user picks the entry.  The
  // catch-all `custom` stays last for unlisted OpenAI-compatible endpoints.
  options: [
    { value: "auto", label: "constants.autoDetect" },
    // Aggregators
    { value: "openrouter", label: "constants.openrouterName" },
    // First-party API providers
    { value: "anthropic", label: "constants.anthropicName" },
    { value: "openai", label: "constants.openaiName" },
    { value: "openai-codex", label: "constants.openaiCodexName" },
    { value: "google", label: "constants.googleName" },
    { value: "xai", label: "constants.xaiName" },
    { value: "mistral", label: "Mistral" },
    { value: "deepseek", label: "DeepSeek" },
    { value: "groq", label: "Groq" },
    { value: "together", label: "Together AI" },
    { value: "fireworks", label: "Fireworks AI" },
    { value: "cerebras", label: "Cerebras" },
    { value: "perplexity", label: "Perplexity" },
    { value: "huggingface", label: "Hugging Face" },
    { value: "nvidia", label: "NVIDIA NIM" },
    { value: "zai", label: "Z.ai / GLM" },
    { value: "qwen", label: "Qwen" },
    { value: "minimax", label: "MiniMax" },
    { value: "nous", label: "constants.nousName" },
    // Additional OpenAI-compatible inference providers
    { value: "siliconflow", label: "SiliconFlow" },
    { value: "novita", label: "NovitaAI" },
    { value: "deepinfra", label: "DeepInfra" },
    { value: "sambanova", label: "SambaNova" },
    { value: "replicate", label: "Replicate" },
    // Subscription / OAuth plans
    // openai-codex is listed once above (first-party group) via #102 —
    // not repeated here to avoid a duplicate <option> value.
    { value: "xai-oauth", label: "xAI Grok (OAuth)" },
    { value: "qwen-oauth", label: "Qwen (OAuth)" },
    { value: "google-gemini-cli", label: "Gemini (CLI OAuth)" },
    { value: "minimax-oauth", label: "MiniMax (OAuth)" },
    { value: "kimi-coding", label: "Kimi (Coding Plan)" },
    { value: "moonshot", label: "Moonshot AI (Kimi)" },
    // Local LLMs — OpenAI-compatible shims that ship with the most
    // common self-hosted runtimes. The named ids give the model
    // card a useful label ("Ollama" / "LM Studio") instead of the
    // generic "OpenAI Compatible / Local" one. `local` is kept as
    // an alias for backwards compat.
    { value: "ollama", label: "Ollama (local)" },
    { value: "lmstudio", label: "LM Studio (local)" },
    { value: "local", label: "constants.localName" },
    // Catch-all for any other OpenAI-compatible endpoint or local LLM
    { value: "custom", label: "constants.customOpenAICompatibleName" },
  ],

  labels: {
    openrouter: "constants.openrouterName",
    anthropic: "constants.anthropicName",
    openai: "constants.openaiName",
    "openai-codex": "constants.openaiCodexName",
    google: "constants.googleName",
    xai: "constants.xaiName",
    mistral: "Mistral",
    deepseek: "DeepSeek",
    groq: "Groq",
    together: "Together AI",
    fireworks: "Fireworks AI",
    cerebras: "Cerebras",
    perplexity: "Perplexity",
    huggingface: "Hugging Face",
    nvidia: "NVIDIA NIM",
    zai: "Z.ai / GLM",
    qwen: "Qwen",
    minimax: "MiniMax",
    nous: "constants.nousName",
    siliconflow: "SiliconFlow",
    novita: "NovitaAI",
    deepinfra: "DeepInfra",
    sambanova: "SambaNova",
    replicate: "Replicate",
    "xai-oauth": "xAI Grok (OAuth)",
    "qwen-oauth": "Qwen (OAuth)",
    "google-gemini-cli": "Gemini (CLI OAuth)",
    "minimax-oauth": "MiniMax (OAuth)",
    "kimi-coding": "Kimi (Coding Plan)",
    moonshot: "Moonshot AI (Kimi)",
    ollama: "Ollama (local)",
    lmstudio: "LM Studio (local)",
    local: "Local",
    custom: "OpenAI Compatible / Local",
  } as Record<string, string>,

  setup: [
    {
      id: "openrouter",
      name: "constants.openrouterName",
      desc: "constants.openrouterDesc",
      tag: "constants.openrouterTag",
      envKey: "OPENROUTER_API_KEY",
      url: "https://openrouter.ai/keys",
      placeholder: "sk-or-v1-...",
      configProvider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      needsKey: true,
    },
    {
      id: "anthropic",
      name: "constants.anthropicName",
      desc: "constants.anthropicDesc",
      tag: "",
      envKey: "ANTHROPIC_API_KEY",
      url: "https://console.anthropic.com/settings/keys",
      placeholder: "sk-ant-...",
      configProvider: "anthropic",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "openai",
      name: "constants.openaiName",
      desc: "constants.openaiDesc",
      tag: "",
      envKey: "OPENAI_API_KEY",
      url: "https://platform.openai.com/api-keys",
      placeholder: "sk-...",
      // Routed through the `custom` provider with an explicit base_url:
      // hermes-agent's resolve_provider does not recognise a bare `openai`
      // provider id (issue #294). The `custom` + api.openai.com path is
      // accepted, and the OpenAI key is picked up via the known-host
      // base-URL mapping.
      configProvider: "custom",
      baseUrl: "https://api.openai.com/v1",
      needsKey: true,
    },
    {
      id: "openai-codex",
      name: "constants.openaiCodexName",
      desc: "constants.openaiCodexDesc",
      tag: "constants.openaiCodexTag",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "openai-codex",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "google-gemini-cli",
      name: "Gemini CLI",
      desc: "Use your Gemini CLI / Google AI subscription",
      tag: "CLI OAuth",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "google-gemini-cli",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "google",
      name: "constants.googleName",
      desc: "constants.googleDesc",
      tag: "",
      envKey: "GOOGLE_API_KEY",
      url: "https://aistudio.google.com/app/apikey",
      placeholder: "AIza...",
      configProvider: "google",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "xai",
      name: "constants.xaiName",
      desc: "constants.xaiDesc",
      tag: "",
      envKey: "XAI_API_KEY",
      url: "https://console.x.ai",
      placeholder: "xai-...",
      configProvider: "xai",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "xai-oauth",
      name: "xAI Grok (OAuth)",
      desc: "Use your xAI subscription from the local OAuth flow",
      tag: "OAuth",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "xai-oauth",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "groq",
      name: "Groq",
      desc: "Fast hosted inference for open models",
      tag: "API Key",
      envKey: "GROQ_API_KEY",
      url: "https://console.groq.com/keys",
      placeholder: "gsk_...",
      configProvider: "groq",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      desc: "Hosted chat and coder models",
      tag: "API Key",
      envKey: "DEEPSEEK_API_KEY",
      url: "https://platform.deepseek.com/api_keys",
      placeholder: "sk-...",
      configProvider: "deepseek",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "together",
      name: "Together AI",
      desc: "Hosted open-model API",
      tag: "API Key",
      envKey: "TOGETHER_API_KEY",
      url: "https://api.together.xyz/settings/api-keys",
      placeholder: "...",
      configProvider: "together",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "fireworks",
      name: "Fireworks AI",
      desc: "Open-model inference with OpenAI-compatible API",
      tag: "API Key",
      envKey: "FIREWORKS_API_KEY",
      url: "https://app.fireworks.ai/account/api-keys",
      placeholder: "fw_...",
      configProvider: "fireworks",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "cerebras",
      name: "Cerebras",
      desc: "Ultra-fast hosted inference",
      tag: "API Key",
      envKey: "CEREBRAS_API_KEY",
      url: "https://cloud.cerebras.ai/platform/api-keys",
      placeholder: "csk_...",
      configProvider: "cerebras",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "mistral",
      name: "Mistral",
      desc: "Mistral and Codestral hosted models",
      tag: "API Key",
      envKey: "MISTRAL_API_KEY",
      url: "https://console.mistral.ai/api-keys",
      placeholder: "...",
      configProvider: "mistral",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "perplexity",
      name: "Perplexity",
      desc: "Sonar models with web-backed answers",
      tag: "API Key",
      envKey: "PERPLEXITY_API_KEY",
      url: "https://www.perplexity.ai/settings/api",
      placeholder: "pplx-...",
      configProvider: "perplexity",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "huggingface",
      name: "Hugging Face",
      desc: "Hosted open-model inference",
      tag: "API Key",
      envKey: "HF_TOKEN",
      url: "https://huggingface.co/settings/tokens",
      placeholder: "hf_...",
      configProvider: "huggingface",
      baseUrl: "",
      needsKey: true,
    },
    {
      id: "nvidia",
      name: "NVIDIA NIM",
      desc: "Hosted NVIDIA inference endpoints",
      tag: "API Key",
      envKey: "NVIDIA_API_KEY",
      url: "https://build.nvidia.com/api-keys",
      placeholder: "nvapi-...",
      configProvider: "nvidia",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      needsKey: true,
    },
    {
      id: "zai",
      name: "Z.ai / GLM",
      desc: "Hosted GLM inference",
      tag: "API Key",
      envKey: "GLM_API_KEY",
      url: "https://open.bigmodel.cn/usercenter/apikeys",
      placeholder: "...",
      configProvider: "zai",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      needsKey: true,
    },
    {
      id: "qwen",
      name: "Qwen",
      desc: "Hosted Qwen models",
      tag: "API Key",
      envKey: "QWEN_API_KEY",
      url: "https://bailian.console.aliyun.com/",
      placeholder: "...",
      configProvider: "qwen",
      baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      needsKey: true,
    },
    {
      id: "qwen-oauth",
      name: "Qwen (OAuth)",
      desc: "Use your local Qwen subscription login",
      tag: "OAuth",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "qwen-oauth",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "minimax",
      name: "MiniMax",
      desc: "Hosted MiniMax models",
      tag: "API Key",
      envKey: "MINIMAX_API_KEY",
      url: "https://www.minimax.io/platform/user-center/basic-information/interface-key",
      placeholder: "...",
      configProvider: "minimax",
      baseUrl: "https://api.minimax.chat/v1",
      needsKey: true,
    },
    {
      id: "minimax-oauth",
      name: "MiniMax (OAuth)",
      desc: "Use your local MiniMax subscription login",
      tag: "OAuth",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "minimax-oauth",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "kimi-coding",
      name: "Kimi (Coding Plan)",
      desc: "Use your Moonshot / Kimi coding subscription",
      tag: "Subscription",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "kimi-coding",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "moonshot",
      name: "Moonshot AI (Kimi)",
      desc: "Hosted Kimi models via direct API key",
      tag: "API Key",
      envKey: "MOONSHOT_API_KEY",
      url: "https://platform.moonshot.cn/console/api-keys",
      placeholder: "sk-...",
      configProvider: "moonshot",
      baseUrl: "https://api.moonshot.cn/v1",
      needsKey: true,
    },
    {
      id: "nous",
      name: "constants.nousName",
      desc: "constants.nousDesc",
      tag: "constants.nousTag",
      envKey: "",
      url: "",
      placeholder: "",
      configProvider: "nous",
      baseUrl: "",
      needsKey: false,
    },
    {
      id: "siliconflow",
      name: "SiliconFlow",
      desc: "Open-model inference platform (DeepSeek, GLM, Qwen, Llama)",
      tag: "API Key",
      envKey: "SILICONFLOW_API_KEY",
      url: "https://cloud.siliconflow.com/account/ak",
      placeholder: "sk-...",
      configProvider: "siliconflow",
      baseUrl: "https://api.siliconflow.com/v1",
      needsKey: true,
    },
    {
      id: "novita",
      name: "NovitaAI",
      desc: "Hosted open-model inference with 68+ models",
      tag: "API Key",
      envKey: "NOVITA_API_KEY",
      url: "https://novita.ai/dashboard/key",
      placeholder: "...",
      configProvider: "novita",
      baseUrl: "https://api.novita.ai/v1",
      needsKey: true,
    },
    {
      id: "deepinfra",
      name: "DeepInfra",
      desc: "Hosted open-model inference, 84+ models",
      tag: "API Key",
      envKey: "DEEPINFRA_API_KEY",
      url: "https://deepinfra.com/dashboard/settings/key",
      placeholder: "...",
      configProvider: "deepinfra",
      baseUrl: "https://api.deepinfra.com/v1",
      needsKey: true,
    },
    {
      id: "sambanova",
      name: "SambaNova",
      desc: "Fast hosted inference for open models",
      tag: "API Key",
      envKey: "SAMBANOVA_API_KEY",
      url: "https://cloud.sambanova.ai/apis",
      placeholder: "...",
      configProvider: "sambanova",
      baseUrl: "https://api.sambanova.ai/v1",
      needsKey: true,
    },
    {
      id: "replicate",
      name: "Replicate",
      desc: "Model hosting platform, OpenAI-compatible",
      tag: "API Key",
      envKey: "REPLICATE_API_KEY",
      url: "https://replicate.com/account/api-tokens",
      placeholder: "r8_...",
      configProvider: "replicate",
      baseUrl: "https://api.replicate.com/v1",
      needsKey: true,
    },
    {
      id: "local",
      name: "constants.localName",
      desc: "constants.localDesc",
      tag: "Ollama / Local API",
      envKey: "",
      url: "",
      placeholder: "sk-...",
      configProvider: "custom",
      baseUrl: "http://localhost:1234/v1",
      needsKey: false,
    },
    {
      // Ollama — `ollama serve` exposes both the native `/api/tags`
      // endpoint and an OpenAI-compat `/v1/models` shim on
      // 127.0.0.1:11434. The model-discovery probe falls back to
      // `/api/tags` automatically when the OpenAI shim returns
      // empty, so the Add/Edit dialog's autocomplete populates
      // even on older Ollama builds that ship the native API only.
      id: "ollama",
      name: "Ollama",
      desc: "Local LLM runtime from ollama.com",
      tag: "Local",
      envKey: "OLLAMA_API_KEY",
      url: "https://ollama.com",
      placeholder: "(optional)",
      configProvider: "ollama",
      baseUrl: "http://127.0.0.1:11434/v1",
      needsKey: false,
    },
    {
      // LM Studio — desktop app that runs GGUF models behind a
      // local OpenAI-compat server on 127.0.0.1:1234. The local
      // server is anonymous by default; users who turn on a
      // server-side key drop it into `LMSTUDIO_API_KEY`.
      id: "lmstudio",
      name: "LM Studio",
      desc: "Local LLM desktop app from lmstudio.ai",
      tag: "Local",
      envKey: "LMSTUDIO_API_KEY",
      url: "https://lmstudio.ai",
      placeholder: "(optional)",
      configProvider: "lmstudio",
      baseUrl: "http://127.0.0.1:1234/v1",
      needsKey: false,
    },
  ],
};

// Subscription / OAuth-plan providers — these authenticate through an
// interactive browser login (`hermes auth add <id> --type oauth`) rather
// than a static API key. The Providers screen renders a "Sign in" card
// for each. Values must match hermes-agent's provider registry.
export interface OAuthProviderDef {
  id: string;
  name: string;
  desc: string;
}

export const OAUTH_PROVIDERS: OAuthProviderDef[] = [
  {
    id: "openai-codex",
    name: "ChatGPT (Codex Plan)",
    desc: "providers.oauth.codexDesc",
  },
  {
    id: "xai-oauth",
    name: "xAI Grok (OAuth)",
    desc: "providers.oauth.xaiDesc",
  },
  { id: "qwen-oauth", name: "Qwen (OAuth)", desc: "providers.oauth.qwenDesc" },
  {
    id: "google-gemini-cli",
    name: "Gemini (CLI OAuth)",
    desc: "providers.oauth.geminiDesc",
  },
  {
    id: "minimax-oauth",
    name: "MiniMax (OAuth)",
    desc: "providers.oauth.minimaxDesc",
  },
  // Nous Portal OAuth — issue #367 Bug 2. The engine's
  // PROVIDER_REGISTRY registers `nous` with auth_type="oauth_device_code";
  // without this card the only way to trigger the sign-in flow was
  // `hermes auth add nous --type oauth` from PowerShell.
  {
    id: "nous",
    name: "Nous Portal (OAuth)",
    desc: "providers.oauth.nousDesc",
  },
];

export interface LocalPreset {
  id: string;
  name: string;
  baseUrl: string;
  group: "local" | "remote";
  envKey?: string;
}

export const LOCAL_PRESETS: LocalPreset[] = [
  {
    id: "lmstudio",
    name: "constants.lmstudio",
    baseUrl: "http://localhost:1234/v1",
    group: "local",
  },
  {
    id: "atomicchat",
    name: "constants.atomicchat",
    baseUrl: "http://localhost:1337/v1",
    group: "local",
  },
  {
    id: "ollama",
    name: "constants.ollama",
    baseUrl: "http://localhost:11434/v1",
    group: "local",
  },
  {
    id: "vllm",
    name: "constants.vllm",
    baseUrl: "http://localhost:8000/v1",
    group: "local",
  },
  {
    id: "llamacpp",
    name: "constants.llamacpp",
    baseUrl: "http://localhost:8080/v1",
    group: "local",
  },
  {
    id: "groq",
    name: "constants.groq",
    baseUrl: "https://api.groq.com/openai/v1",
    group: "remote",
    envKey: "GROQ_API_KEY",
  },
  {
    id: "deepseek",
    name: "constants.deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    group: "remote",
    envKey: "DEEPSEEK_API_KEY",
  },
  {
    id: "together",
    name: "constants.together",
    baseUrl: "https://api.together.xyz/v1",
    group: "remote",
    envKey: "TOGETHER_API_KEY",
  },
  {
    id: "fireworks",
    name: "constants.fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    group: "remote",
    envKey: "FIREWORKS_API_KEY",
  },
  {
    id: "cerebras",
    name: "constants.cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    group: "remote",
    envKey: "CEREBRAS_API_KEY",
  },
  {
    id: "mistral",
    name: "constants.mistral",
    baseUrl: "https://api.mistral.ai/v1",
    group: "remote",
    envKey: "MISTRAL_API_KEY",
  },
];

// ── Theme ───────────────────────────────────────────────

export const THEME_OPTIONS = [
  { value: "system" as const, label: "constants.themeSystem" },
  { value: "light" as const, label: "constants.themeLight" },
  { value: "dark" as const, label: "constants.themeDark" },
];

export const THEME_STORAGE_KEY = "hermes-theme";

// ── Settings API Key Sections ───────────────────────────

export const SETTINGS_SECTIONS: SectionDef[] = [
  {
    title: "constants.sectionLlmProviders",
    items: [
      {
        key: "OPENROUTER_API_KEY",
        label: "constants.openrouterApiKey",
        type: "password",
        hint: "constants.openrouterHint",
      },
      {
        key: "OPENAI_API_KEY",
        label: "constants.openaiApiKey",
        type: "password",
        hint: "constants.openaiHint",
      },
      {
        key: "ANTHROPIC_API_KEY",
        label: "constants.anthropicApiKey",
        type: "password",
        hint: "constants.anthropicHint",
      },
      {
        key: "GROQ_API_KEY",
        label: "constants.groqApiKey",
        type: "password",
        hint: "constants.groqHint",
      },
      {
        key: "GLM_API_KEY",
        label: "constants.glmApiKey",
        type: "password",
        hint: "constants.glmHint",
      },
      {
        key: "KIMI_API_KEY",
        label: "constants.kimiApiKey",
        type: "password",
        hint: "constants.kimiHint",
      },
      {
        key: "MOONSHOT_API_KEY",
        label: "Moonshot AI API Key",
        type: "password",
        hint: "For direct API access to Kimi models (api.moonshot.cn)",
      },
      {
        key: "MINIMAX_API_KEY",
        label: "constants.minimaxApiKey",
        type: "password",
        hint: "constants.minimaxHint",
      },
      // Nous Portal API-key variant — the OAuth variant has its own
      // card in the OAuth section below. Missing-API-key-card was
      // issue #367 Bug 1.
      {
        key: "NOUS_API_KEY",
        label: "constants.nousApiKey",
        type: "password",
        hint: "constants.nousHint",
      },
      {
        key: "MINIMAX_CN_API_KEY",
        label: "constants.minimaxCnApiKey",
        type: "password",
        hint: "constants.minimaxCnHint",
      },
      {
        key: "OPENCODE_ZEN_API_KEY",
        label: "constants.opencodeZenApiKey",
        type: "password",
        hint: "constants.opencodeZenHint",
      },
      {
        key: "OPENCODE_GO_API_KEY",
        label: "constants.opencodeGoApiKey",
        type: "password",
        hint: "constants.opencodeGoHint",
      },
      {
        key: "HF_TOKEN",
        label: "constants.hfToken",
        type: "password",
        hint: "constants.hfHint",
      },
      {
        key: "DEEPSEEK_API_KEY",
        label: "constants.deepseekApiKey",
        type: "password",
        hint: "constants.deepseekHint",
      },
      {
        key: "TOGETHER_API_KEY",
        label: "constants.togetherApiKey",
        type: "password",
        hint: "constants.togetherHint",
      },
      {
        key: "FIREWORKS_API_KEY",
        label: "constants.fireworksApiKey",
        type: "password",
        hint: "constants.fireworksHint",
      },
      {
        key: "CEREBRAS_API_KEY",
        label: "constants.cerebrasApiKey",
        type: "password",
        hint: "constants.cerebrasHint",
      },
      {
        key: "MISTRAL_API_KEY",
        label: "constants.mistralApiKey",
        type: "password",
        hint: "constants.mistralHint",
      },
      {
        key: "PERPLEXITY_API_KEY",
        label: "constants.perplexityApiKey",
        type: "password",
        hint: "constants.perplexityHint",
      },
      {
        key: "NVIDIA_API_KEY",
        label: "constants.nvidiaApiKey",
        type: "password",
        hint: "constants.nvidiaHint",
      },
      {
        key: "CUSTOM_API_KEY",
        label: "constants.customApiKey",
        type: "password",
        hint: "constants.customHint",
      },
      {
        key: "GOOGLE_API_KEY",
        label: "constants.googleApiKey",
        type: "password",
        hint: "constants.googleHint",
      },
      {
        key: "XAI_API_KEY",
        label: "constants.xaiApiKey",
        type: "password",
        hint: "constants.xaiHint",
      },
    ],
  },
  {
    title: "constants.sectionToolApiKeys",
    items: [
      {
        key: "EXA_API_KEY",
        label: "constants.exaApiKey",
        type: "password",
        hint: "constants.exaHint",
      },
      {
        key: "PARALLEL_API_KEY",
        label: "constants.parallelApiKey",
        type: "password",
        hint: "constants.parallelHint",
      },
      {
        key: "TAVILY_API_KEY",
        label: "constants.tavilyApiKey",
        type: "password",
        hint: "constants.tavilyHint",
      },
      {
        key: "FIRECRAWL_API_KEY",
        label: "constants.firecrawlApiKey",
        type: "password",
        hint: "constants.firecrawlHint",
      },
      {
        key: "FAL_KEY",
        label: "constants.falKey",
        type: "password",
        hint: "constants.falHint",
      },
      {
        key: "HONCHO_API_KEY",
        label: "constants.honchoApiKey",
        type: "password",
        hint: "constants.honchoHint",
      },
    ],
  },
  {
    title: "constants.sectionBrowserAutomation",
    items: [
      {
        key: "BROWSERBASE_API_KEY",
        label: "constants.browserbaseApiKey",
        type: "password",
        hint: "constants.browserbaseHint",
      },
      {
        key: "BROWSERBASE_PROJECT_ID",
        label: "constants.browserbaseProjectId",
        type: "text",
        hint: "constants.browserbaseProjectHint",
      },
    ],
  },
  {
    title: "constants.sectionVoiceStt",
    items: [
      {
        key: "VOICE_TOOLS_OPENAI_KEY",
        label: "constants.voiceOpenaiKey",
        type: "password",
        hint: "constants.voiceOpenaiHint",
      },
    ],
  },
  {
    title: "constants.sectionResearchTraining",
    items: [
      {
        key: "TINKER_API_KEY",
        label: "constants.tinkerApiKey",
        type: "password",
        hint: "constants.tinkerHint",
      },
      {
        key: "WANDB_API_KEY",
        label: "constants.wandbKey",
        type: "password",
        hint: "constants.wandbHint",
      },
    ],
  },
];

// ── Gateway Sections ────────────────────────────────────

export const GATEWAY_SECTIONS: SectionDef[] = [
  {
    title: "constants.gatewayMessagingPlatforms",
    items: [
      {
        key: "TELEGRAM_BOT_TOKEN",
        label: "constants.telegramBotToken",
        type: "password",
        hint: "constants.telegramBotHint",
      },
      {
        key: "TELEGRAM_ALLOWED_USERS",
        label: "constants.telegramAllowedUsers",
        type: "text",
        hint: "constants.telegramUsersHint",
      },
      {
        key: "DISCORD_BOT_TOKEN",
        label: "constants.discordBotToken",
        type: "password",
        hint: "constants.discordBotHint",
      },
      {
        key: "DISCORD_ALLOWED_CHANNELS",
        label: "constants.discordAllowedChannels",
        type: "text",
        hint: "constants.discordChannelsHint",
      },
      {
        key: "SLACK_BOT_TOKEN",
        label: "constants.slackBotToken",
        type: "password",
        hint: "constants.slackBotHint",
      },
      {
        key: "SLACK_APP_TOKEN",
        label: "constants.slackAppToken",
        type: "password",
        hint: "constants.slackAppHint",
      },
      {
        key: "WHATSAPP_API_URL",
        label: "constants.whatsappApiUrl",
        type: "text",
        hint: "constants.whatsappUrlHint",
      },
      {
        key: "WHATSAPP_API_TOKEN",
        label: "constants.whatsappApiToken",
        type: "password",
        hint: "constants.whatsappTokenHint",
      },
      {
        key: "SIGNAL_PHONE_NUMBER",
        label: "constants.signalPhoneNumber",
        type: "text",
        hint: "constants.signalPhoneHint",
      },
      {
        key: "MATRIX_HOMESERVER",
        label: "constants.matrixHomeserver",
        type: "text",
        hint: "constants.matrixHomeHint",
      },
      {
        key: "MATRIX_USER_ID",
        label: "constants.matrixUserId",
        type: "text",
        hint: "constants.matrixUserHint",
      },
      {
        key: "MATRIX_ACCESS_TOKEN",
        label: "constants.matrixAccessToken",
        type: "password",
        hint: "constants.matrixTokenHint",
      },
      {
        key: "MATTERMOST_URL",
        label: "constants.mattermostUrl",
        type: "text",
        hint: "constants.mattermostUrlHint",
      },
      {
        key: "MATTERMOST_TOKEN",
        label: "constants.mattermostToken",
        type: "password",
        hint: "constants.mattermostTokenHint",
      },
      {
        key: "EMAIL_IMAP_SERVER",
        label: "constants.emailImapServer",
        type: "text",
        hint: "constants.emailImapHint",
      },
      {
        key: "EMAIL_SMTP_SERVER",
        label: "constants.emailSmtpServer",
        type: "text",
        hint: "constants.emailSmtpHint",
      },
      {
        key: "EMAIL_ADDRESS",
        label: "constants.emailAddress",
        type: "text",
        hint: "constants.emailAddrHint",
      },
      {
        key: "EMAIL_PASSWORD",
        label: "constants.emailPassword",
        type: "password",
        hint: "constants.emailPassHint",
      },
      {
        key: "SMS_PROVIDER",
        label: "constants.smsProvider",
        type: "text",
        hint: "constants.smsProviderHint",
      },
      {
        key: "TWILIO_ACCOUNT_SID",
        label: "constants.twilioAccountSid",
        type: "text",
        hint: "constants.twilioSidHint",
      },
      {
        key: "TWILIO_AUTH_TOKEN",
        label: "constants.twilioAuthToken",
        type: "password",
        hint: "constants.twilioTokenHint",
      },
      {
        key: "TWILIO_PHONE_NUMBER",
        label: "constants.twilioPhoneNumber",
        type: "text",
        hint: "constants.twilioPhoneHint",
      },
      {
        key: "BLUEBUBBLES_URL",
        label: "constants.bluebubblesUrl",
        type: "text",
        hint: "constants.bluebubblesUrlHint",
      },
      {
        key: "BLUEBUBBLES_PASSWORD",
        label: "constants.bluebubblesPassword",
        type: "password",
        hint: "constants.bluebubblesPassHint",
      },
      {
        key: "DINGTALK_APP_KEY",
        label: "constants.dingtalkAppKey",
        type: "password",
        hint: "constants.dingtalkKeyHint",
      },
      {
        key: "DINGTALK_APP_SECRET",
        label: "constants.dingtalkAppSecret",
        type: "password",
        hint: "constants.dingtalkSecretHint",
      },
      {
        key: "FEISHU_APP_ID",
        label: "constants.feishuAppId",
        type: "text",
        hint: "constants.feishuIdHint",
      },
      {
        key: "FEISHU_APP_SECRET",
        label: "constants.feishuAppSecret",
        type: "password",
        hint: "constants.feishuSecretHint",
      },
      {
        key: "WECOM_CORP_ID",
        label: "constants.wecomCorpId",
        type: "text",
        hint: "constants.wecomCorpHint",
      },
      {
        key: "WECOM_AGENT_ID",
        label: "constants.wecomAgentId",
        type: "text",
        hint: "constants.wecomAgentHint",
      },
      {
        key: "WECOM_SECRET",
        label: "constants.wecomSecret",
        type: "password",
        hint: "constants.wecomSecretHint",
      },
      {
        key: "WEIXIN_BOT_TOKEN",
        label: "constants.weixinBotToken",
        type: "password",
        hint: "constants.weixinTokenHint",
      },
      {
        key: "WEBHOOK_SECRET",
        label: "constants.webhookSecret",
        type: "password",
        hint: "constants.webhookHint",
      },
      {
        key: "HASS_URL",
        label: "constants.haUrl",
        type: "text",
        hint: "constants.haUrlHint",
      },
      {
        key: "HASS_TOKEN",
        label: "constants.haToken",
        type: "password",
        hint: "constants.haTokenHint",
      },
    ],
  },
];

export interface PlatformDef {
  key: string;
  label: string;
  description: string;
  fields: string[]; // env keys that belong to this platform
  /** Coarse grouping used by the Gateway screen to render section
   *  headers. Keep the same order in GATEWAY_PLATFORMS as the visual
   *  layout the user sees. */
  group: "messaging" | "eastern" | "async" | "home";
}

export const GATEWAY_PLATFORMS: PlatformDef[] = [
  {
    key: "telegram",
    label: "constants.platformTelegram",
    description: "constants.platformTelegramDesc",
    fields: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS"],
    group: "messaging",
  },
  {
    key: "discord",
    label: "constants.platformDiscord",
    description: "constants.platformDiscordDesc",
    fields: ["DISCORD_BOT_TOKEN", "DISCORD_ALLOWED_CHANNELS"],
    group: "messaging",
  },
  {
    key: "slack",
    label: "constants.platformSlack",
    description: "constants.platformSlackDesc",
    fields: ["SLACK_BOT_TOKEN", "SLACK_APP_TOKEN"],
    group: "messaging",
  },
  {
    key: "whatsapp",
    label: "constants.platformWhatsapp",
    description: "constants.platformWhatsappDesc",
    fields: ["WHATSAPP_API_URL", "WHATSAPP_API_TOKEN"],
    group: "messaging",
  },
  {
    key: "signal",
    label: "constants.platformSignal",
    description: "constants.platformSignalDesc",
    fields: ["SIGNAL_PHONE_NUMBER"],
    group: "messaging",
  },
  {
    key: "matrix",
    label: "constants.platformMatrix",
    description: "constants.platformMatrixDesc",
    fields: ["MATRIX_HOMESERVER", "MATRIX_USER_ID", "MATRIX_ACCESS_TOKEN"],
    group: "messaging",
  },
  {
    key: "mattermost",
    label: "constants.platformMattermost",
    description: "constants.platformMattermostDesc",
    fields: ["MATTERMOST_URL", "MATTERMOST_TOKEN"],
    group: "messaging",
  },
  {
    key: "email",
    label: "constants.platformEmail",
    description: "constants.platformEmailDesc",
    fields: [
      "EMAIL_IMAP_SERVER",
      "EMAIL_SMTP_SERVER",
      "EMAIL_ADDRESS",
      "EMAIL_PASSWORD",
    ],
    group: "async",
  },
  {
    key: "sms",
    label: "constants.platformSms",
    description: "constants.platformSmsDesc",
    fields: [
      "SMS_PROVIDER",
      "TWILIO_ACCOUNT_SID",
      "TWILIO_AUTH_TOKEN",
      "TWILIO_PHONE_NUMBER",
    ],
    group: "async",
  },
  {
    key: "bluebubbles",
    label: "constants.platformImessage",
    description: "constants.platformImessageDesc",
    fields: ["BLUEBUBBLES_URL", "BLUEBUBBLES_PASSWORD"],
    group: "async",
  },
  {
    key: "dingtalk",
    label: "constants.platformDingtalk",
    description: "constants.platformDingtalkDesc",
    fields: ["DINGTALK_APP_KEY", "DINGTALK_APP_SECRET"],
    group: "eastern",
  },
  {
    key: "feishu",
    label: "constants.platformFeishu",
    description: "constants.platformFeishuDesc",
    fields: ["FEISHU_APP_ID", "FEISHU_APP_SECRET"],
    group: "eastern",
  },
  {
    key: "wecom",
    label: "constants.platformWecom",
    description: "constants.platformWecomDesc",
    fields: ["WECOM_CORP_ID", "WECOM_AGENT_ID", "WECOM_SECRET"],
    group: "eastern",
  },
  {
    key: "weixin",
    label: "constants.platformWeixin",
    description: "constants.platformWeixinDesc",
    fields: ["WEIXIN_BOT_TOKEN"],
    group: "eastern",
  },
  {
    key: "webhooks",
    label: "constants.platformWebhooks",
    description: "constants.platformWebhooksDesc",
    fields: ["WEBHOOK_SECRET"],
    group: "async",
  },
  {
    key: "home_assistant",
    label: "constants.platformHomeAssistant",
    description: "constants.platformHomeAssistantDesc",
    fields: ["HASS_URL", "HASS_TOKEN"],
    group: "home",
  },
];

// ── Install ─────────────────────────────────────────────

// Two separate install surfaces, one per host shell. The renderer
// uses them as the source of truth for the "copy-paste install"
// lanes on the welcome screen. URLs are not localised — they point
// at the same hermes-agent.nousresearch.com download regardless of
// locale.
export const WSL_BASH_INSTALL_CMD =
  "curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash";
export const POWERSHELL_INSTALL_CMD =
  'iex (irm https://hermes-agent.nousresearch.com/install.ps1)';

// Back-compat aliases consumed by the legacy error-state fallback.
export const UNIX_INSTALL_CMD = WSL_BASH_INSTALL_CMD;
export const INSTALL_CMD_UNIX = WSL_BASH_INSTALL_CMD;
export const WINDOWS_INSTALL_CMD = POWERSHELL_INSTALL_CMD;
export const INSTALL_CMD =
  typeof window !== "undefined" &&
  window.electron?.process?.platform === "win32"
    ? POWERSHELL_INSTALL_CMD
    : WSL_BASH_INSTALL_CMD;

export const INSTALL_CMD_WIN = POWERSHELL_INSTALL_CMD;

export function getInstallCmd(): string {
  return window.electron?.process?.platform === "win32"
    ? POWERSHELL_INSTALL_CMD
    : WSL_BASH_INSTALL_CMD;
}

// Helper to resolve i18n key or return as-is
export function tk(t: (key: string) => string, value: string): string {
  if (value.startsWith("constants.")) {
    return t(value);
  }
  return value;
}
