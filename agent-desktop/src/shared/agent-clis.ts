export type AgentCliId =
  | "open-design-amr"
  | "claude-code"
  | "codex-cli"
  | "devin-terminal"
  | "gemini-cli"
  | "opencode"
  | "hermes"
  | "trae-cli"
  | "grok-build"
  | "kimi-cli"
  | "cursor-agent"
  | "qwen-code"
  | "qoder-cli"
  | "github-copilot-cli"
  | "pi"
  | "kiro-cli"
  | "kilo"
  | "mistral-vibe-cli"
  | "deepseek-tui"
  | "aider"
  | "antigravity"
  | "deepseek-reasonix"
  | "openclaw"
  | "markitdown"
  | "raven"
  | "officecli"
  | "graphify";

export interface AgentCliCatalogEntry {
  id: AgentCliId;
  name: string;
  description: string;
  docsUrl: string;
  installUrl: string;
  commands: string[];
  logoProvider?: string;
  providerId?: string;
  oauthProviderId?: string;
}

export const AGENT_CLI_CATALOG: readonly AgentCliCatalogEntry[] = [
  {
    id: "open-design-amr",
    name: "Open Design AMR",
    description: "Open Design automation runtime",
    docsUrl: "https://open.design/",
    installUrl: "https://open.design/",
    commands: ["amr", "open-design", "open-design-amr"],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Anthropic official CLI",
    docsUrl: "https://docs.anthropic.com/en/docs/claude-code/overview",
    installUrl: "https://docs.anthropic.com/en/docs/claude-code/setup",
    commands: ["claude"],
    logoProvider: "claude",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    description: "OpenAI official CLI",
    docsUrl: "https://developers.openai.com/codex/cli",
    installUrl: "https://developers.openai.com/codex/cli",
    commands: ["codex"],
    logoProvider: "openai-codex",
    providerId: "openai-codex",
    oauthProviderId: "openai-codex",
  },
  {
    id: "devin-terminal",
    name: "Devin for Terminal",
    description: "Cognition terminal CLI",
    docsUrl: "https://docs.devin.ai/",
    installUrl: "https://docs.devin.ai/",
    commands: ["devin"],
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    description: "Google official CLI",
    docsUrl: "https://github.com/google-gemini/gemini-cli",
    installUrl: "https://github.com/google-gemini/gemini-cli",
    commands: ["gemini"],
    logoProvider: "google-gemini-cli",
    providerId: "google-gemini-cli",
    oauthProviderId: "google-gemini-cli",
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Open-source agent CLI",
    docsUrl: "https://github.com/opencode-ai/opencode",
    installUrl: "https://github.com/opencode-ai/opencode",
    commands: ["opencode"],
    logoProvider: "opencode",
  },
  {
    id: "hermes",
    name: "Hermes",
    description: "ACP agent CLI",
    docsUrl: "https://github.com/NousResearch/hermes-agent",
    installUrl: "https://github.com/NousResearch/hermes-agent",
    commands: ["hermes"],
    logoProvider: "nous",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    description: "OpenClaw assistant CLI and gateway",
    docsUrl: "https://docs.openclaw.ai/start/getting-started",
    installUrl: "https://docs.openclaw.ai/start/getting-started",
    commands: ["openclaw"],
  },
  {
    id: "markitdown",
    name: "markitdown",
    description:
      "Microsoft markitdown — convert PDF/DOCX/PPTX/Image/HTML to Markdown for the agent file_to_markdown tool.",
    docsUrl: "https://github.com/microsoft/markitdown",
    installUrl: "https://github.com/microsoft/markitdown#installation",
    commands: ["markitdown"],
  },
  {
    id: "officecli",
    name: "OfficeCLI",
    description:
      "OfficeCLI — create, read, edit, and render Word/Excel/PowerPoint documents. Single binary, no Office required. The write-side complement to markitdown.",
    docsUrl: "https://github.com/iOfficeAI/OfficeCLI",
    installUrl: "https://github.com/iOfficeAI/OfficeCLI#installation",
    commands: ["officecli"],
  },
  {
    id: "graphify",
    name: "Graphify",
    description:
      "Graphify — turn any folder (code, docs, papers) into a concept knowledge graph with community detection. Cross-document semantic connections. Complements CodeGraph.",
    docsUrl: "https://github.com/cubecloud-agentic-os/graphify",
    installUrl: "https://pypi.org/project/graphifyy/",
    commands: ["graphify", "graphifyy"],
  },
  {
    id: "trae-cli",
    name: "Trae CLI",
    description: "Trae coding CLI",
    docsUrl: "https://www.trae.ai/",
    installUrl: "https://www.trae.ai/",
    commands: ["trae"],
  },
  {
    id: "grok-build",
    name: "Grok Build",
    description: "xAI coding CLI",
    docsUrl: "https://x.ai/",
    installUrl: "https://x.ai/",
    commands: ["grok"],
    logoProvider: "grok",
  },
  {
    id: "kimi-cli",
    name: "Kimi CLI",
    description: "Moonshot Kimi CLI",
    docsUrl: "https://www.moonshot.ai/",
    installUrl: "https://www.moonshot.ai/",
    commands: ["kimi"],
    logoProvider: "kimi-coding",
    providerId: "kimi-coding",
  },
  {
    id: "cursor-agent",
    name: "Cursor Agent",
    description: "Cursor command line",
    docsUrl: "https://cursor.com/",
    installUrl: "https://cursor.com/",
    commands: ["cursor-agent", "cursor"],
  },
  {
    id: "qwen-code",
    name: "Qwen Code",
    description: "Qwen coding CLI",
    docsUrl: "https://github.com/QwenLM/qwen-code",
    installUrl: "https://github.com/QwenLM/qwen-code",
    commands: ["qwen"],
    logoProvider: "qwen-oauth",
    providerId: "qwen-oauth",
    oauthProviderId: "qwen-oauth",
  },
  {
    id: "qoder-cli",
    name: "Qoder CLI",
    description: "Alibaba coding CLI",
    docsUrl: "https://www.alibabacloud.com/help/",
    installUrl: "https://www.alibabacloud.com/help/",
    commands: ["qoder"],
  },
  {
    id: "github-copilot-cli",
    name: "GitHub Copilot CLI",
    description: "GitHub coding CLI",
    docsUrl: "https://github.com/github/copilot-cli",
    installUrl: "https://github.com/github/copilot-cli",
    commands: ["github-copilot", "copilot", "gh-copilot"],
  },
  {
    id: "pi",
    name: "Pi",
    description: "Inflection chat CLI",
    docsUrl: "https://pi.ai/",
    installUrl: "https://pi.ai/",
    commands: ["pi"],
  },
  {
    id: "kiro-cli",
    name: "Kiro CLI",
    description: "Kiro agent CLI",
    docsUrl: "https://kiro.dev/",
    installUrl: "https://kiro.dev/",
    commands: ["kiro"],
  },
  {
    id: "kilo",
    name: "Kilo",
    description: "Kilo Code CLI",
    docsUrl: "https://kilocode.ai/",
    installUrl: "https://kilocode.ai/",
    commands: ["kilo"],
  },
  {
    id: "mistral-vibe-cli",
    name: "Mistral Vibe CLI",
    description: "Mistral open-source CLI",
    docsUrl: "https://docs.mistral.ai/",
    installUrl: "https://docs.mistral.ai/",
    commands: ["mistral", "mistral-vibe"],
    logoProvider: "mistral",
  },
  {
    id: "deepseek-tui",
    name: "DeepSeek TUI",
    description: "DeepSeek terminal UI",
    docsUrl: "https://platform.deepseek.com/",
    installUrl: "https://platform.deepseek.com/",
    commands: ["deepseek"],
    logoProvider: "deepseek",
  },
  {
    id: "aider",
    name: "Aider",
    description: "Aider coding assistant",
    docsUrl: "https://aider.chat/",
    installUrl: "https://aider.chat/docs/install.html",
    commands: ["aider"],
  },
  {
    id: "antigravity",
    name: "Antigravity",
    description: "Antigravity coding CLI",
    docsUrl: "https://github.com/antigravity-ai/antigravity",
    installUrl: "https://github.com/antigravity-ai/antigravity",
    commands: ["antigravity"],
  },
  {
    id: "deepseek-reasonix",
    name: "DeepSeek Reasonix",
    description: "DeepSeek native coding CLI",
    docsUrl: "https://platform.deepseek.com/",
    installUrl: "https://platform.deepseek.com/",
    commands: ["reasonix", "deepseek-reasonix"],
    logoProvider: "deepseek",
  },
  {
    id: "raven",
    name: "Raven",
    description: "EverMind self-improving agent harness with EverOS memory, SkillForge skills, Sentinel proactivity, and 12 messaging gateways",
    docsUrl: "https://github.com/EverMind-AI/Raven",
    installUrl: "https://raven.evermind.ai/",
    commands: ["raven"],
  },
] as const;