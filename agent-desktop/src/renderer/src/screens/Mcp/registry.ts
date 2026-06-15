// Bundled MCP server registry. Sourced from public MCP server lists
// and the project's own .mcp.json. This is a *bundled* registry —
// no network calls, no third-party dependency. The renderer filters
// the list client-side from a search input on the Mcp screen.
//
// Schema kept loose (string-literal `transport` instead of an enum)
// so future entries can add transports without a code change to the
// registry itself.

export interface BundledMcpServer {
  /** Stable identifier; also the name written to config.yaml. */
  name: string;
  /** Short human-readable title (English; the UI translates). */
  title: string;
  /** One-sentence description of what the server does. */
  description: string;
  /** Coarse category for grouping / filter. */
  category:
    | "developer"
    | "search"
    | "browser"
    | "data"
    | "memory"
    | "reasoning"
    | "productivity"
    | "media"
    | "utility";
  /** Transport advertised by the source. The user can still override
   *  on the add form. */
  transport: "http" | "stdio";
  /** HTTP URL for `http` transport, or shell command for `stdio`. */
  detail: string;
  /** Optional list of env-var keys the server typically needs. */
  envKeys?: string[];
  /** Optional hint shown beneath the detail in the search results. */
  hint?: string;
}

export const BUNDLED_MCP_SERVERS: BundledMcpServer[] = [
  // ── Developer / GitHub ───────────────────────────────
  {
    name: "github",
    title: "GitHub",
    description: "Search, read, and manage GitHub repositories, issues, and PRs.",
    category: "developer",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-github@2025.4.8",
    envKeys: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    hint: "Requires a GitHub personal access token.",
  },
  {
    name: "gitlab",
    title: "GitLab",
    description: "Read GitLab projects, merge requests, and pipelines.",
    category: "developer",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-gitlab",
    envKeys: ["GITLAB_PERSONAL_ACCESS_TOKEN"],
  },
  {
    name: "filesystem",
    title: "Filesystem",
    description: "Read, write, and search files in a sandboxed directory.",
    category: "developer",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-filesystem",
    envKeys: ["FILESYSTEM_ALLOWED_DIRS"],
    hint: "Configure allowed directories to avoid the agent writing outside the project.",
  },
  {
    name: "git",
    title: "Git",
    description: "Read git history, diffs, and status without a working shell.",
    category: "developer",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-git",
  },

  // ── Search ───────────────────────────────────────────
  {
    name: "brave-search",
    title: "Brave Search",
    description: "Web search via the Brave Search API.",
    category: "search",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-brave-search",
    envKeys: ["BRAVE_API_KEY"],
  },
  {
    name: "exa",
    title: "Exa",
    description: "Neural web search with content extraction.",
    category: "search",
    transport: "http",
    detail: "https://mcp.exa.ai/mcp",
  },
  {
    name: "context7",
    title: "Context7",
    description: "Up-to-date library docs and code examples.",
    category: "search",
    transport: "http",
    detail: "https://mcp.context7.com/mcp",
  },
  {
    name: "tavily",
    title: "Tavily",
    description: "Search and crawl for AI agents with citation support.",
    category: "search",
    transport: "http",
    detail: "https://mcp.tavily.com/mcp",
    envKeys: ["TAVILY_API_KEY"],
  },
  {
    name: "kagi-search",
    title: "Kagi Search",
    description: "Privacy-respecting web search via Kagi.",
    category: "search",
    transport: "stdio",
    detail: "npx -y @kagi-mcp/server",
    envKeys: ["KAGI_API_KEY"],
  },

  // ── Browser ──────────────────────────────────────────
  {
    name: "playwright",
    title: "Playwright",
    description: "Drive a real browser, take screenshots, click and type.",
    category: "browser",
    transport: "stdio",
    detail: "npx -y @playwright/mcp@0.0.69",
  },

  // ── Internet research (third-party) ───────────────────
  {
    name: "agent-reach",
    title: "Agent Reach",
    description:
      "Headless internet research across 13+ platforms (web, Twitter/X, Reddit, YouTube, Bilibili, XiaoHongShu, GitHub, RSS, and more).",
    category: "search",
    transport: "stdio",
    detail: "python -m agent_reach.integrations.mcp_server",
    hint: "Install with `pip install agent-reach[mcp]` in the environment that runs your agents. Only exposes a status tool; actual reads use upstream CLIs managed by Agent Reach.",
  },
  {
    name: "puppeteer",
    title: "Puppeteer",
    description: "Browser automation with Chrome DevTools Protocol.",
    category: "browser",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-puppeteer",
  },

  // ── Data / databases ────────────────────────────────
  {
    name: "sqlite",
    title: "SQLite",
    description: "Query and inspect local SQLite databases.",
    category: "data",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-sqlite",
  },
  {
    name: "postgres",
    title: "PostgreSQL",
    description: "Read-only query access to a PostgreSQL database.",
    category: "data",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-postgres",
    envKeys: ["POSTGRES_URL"],
  },
  {
    name: "redis",
    title: "Redis",
    description: "Inspect and modify keys in a Redis instance.",
    category: "data",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-redis",
    envKeys: ["REDIS_URL"],
  },
  {
    name: "mongodb",
    title: "MongoDB",
    description: "Query MongoDB collections and aggregations.",
    category: "data",
    transport: "stdio",
    detail: "npx -y @mongodb/mcp-server",
    envKeys: ["MONGODB_URI"],
  },

  // ── Memory / RAG ────────────────────────────────────
  {
    name: "memory",
    title: "Memory",
    description: "Persistent knowledge graph across sessions.",
    category: "memory",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-memory@2026.1.26",
  },
  {
    name: "knowledge-graph",
    title: "Knowledge Graph",
    description: "Read and write a small RDF-style knowledge graph.",
    category: "memory",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-knowledge-graph",
  },
  {
    name: "qdrant",
    title: "Qdrant",
    description: "Vector search against a Qdrant collection.",
    category: "memory",
    transport: "http",
    detail: "https://qdrant.example/mcp",
    envKeys: ["QDRANT_URL", "QDRANT_API_KEY"],
    hint: "Replace the URL with your Qdrant instance endpoint.",
  },
  {
    name: "headroom",
    title: "Headroom (local)",
    description:
      "Local Headroom proxy exposed as an MCP server. Wraps the existing headroom-compress / headroom-retrieve / headroom-stats IPCs so an external agent (Claude Code, Codex, etc.) can read the same compression surface the desktop uses. The desktop supervises the subprocess; no external install required.",
    category: "memory",
    transport: "http",
    // Loopback default — the desktop supervisor binds this. Users
    // running the server on a different host would override the
    // URL via the add form's detail field. (Same convention the
    // knowledge-mcp surface uses for its self-hosted endpoint.)
    detail: "http://127.0.0.1:8788/mcp",
    envKeys: [],
    hint: "Start the server from the Headroom screen, then enable this entry to expose the same three tools to any MCP client (Claude Code, Codex CLI, etc.) that can reach 127.0.0.1:8788.",
  },

  // ── Reasoning ────────────────────────────────────────
  {
    name: "sequential-thinking",
    title: "Sequential Thinking",
    description: "Step-by-step reasoning with intermediate checkpoints.",
    category: "reasoning",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-sequential-thinking@2025.12.18",
  },

  // ── Productivity ─────────────────────────────────────
  {
    name: "slack",
    title: "Slack",
    description: "Read and post messages to Slack channels.",
    category: "productivity",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-slack",
    envKeys: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
  },
  {
    name: "notion",
    title: "Notion",
    description: "Read and edit Notion pages and databases.",
    category: "productivity",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-notion",
    envKeys: ["NOTION_API_KEY"],
  },
  {
    name: "google-drive",
    title: "Google Drive",
    description: "Read and search files in Google Drive.",
    category: "productivity",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-gdrive",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    name: "linear",
    title: "Linear",
    description: "Read and update Linear issues and projects.",
    category: "productivity",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-linear",
    envKeys: ["LINEAR_API_KEY"],
  },
  {
    name: "todoist",
    title: "Todoist",
    description: "Read and create Todoist tasks and projects.",
    category: "productivity",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-todoist",
    envKeys: ["TODOIST_API_TOKEN"],
  },

  // ── Media ────────────────────────────────────────────
  {
    name: "everart",
    title: "EverArt",
    description: "Generate images via EverArt's hosted models.",
    category: "media",
    transport: "http",
    detail: "https://mcp.everart.ai/mcp",
    envKeys: ["EVERART_API_KEY"],
  },

  // ── Utility ──────────────────────────────────────────
  {
    name: "fetch",
    title: "Fetch",
    description: "Generic HTTP fetch with HTML-to-Markdown conversion.",
    category: "utility",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-fetch",
  },
  {
    name: "time",
    title: "Time",
    description: "Get the current time and convert between timezones.",
    category: "utility",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-time",
  },
  {
    name: "weather",
    title: "Weather",
    description: "Look up current weather and forecasts.",
    category: "utility",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-weather",
    envKeys: ["WEATHER_API_KEY"],
  },
  {
    name: "calculator",
    title: "Calculator",
    description: "Evaluate arithmetic and basic math expressions.",
    category: "utility",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-calculator",
  },
  {
    name: "sentry",
    title: "Sentry",
    description: "Inspect Sentry issues and recent error events.",
    category: "developer",
    transport: "stdio",
    detail: "npx -y @modelcontextprotocol/server-sentry",
    envKeys: ["SENTRY_AUTH_TOKEN"],
  },
];

/** Filter the bundled registry against a free-text query. Matches
 *  name, title, description, and category. */
export function searchBundledMcpServers(
  query: string,
): BundledMcpServer[] {
  const q = query.trim().toLowerCase();
  if (!q) return BUNDLED_MCP_SERVERS;
  return BUNDLED_MCP_SERVERS.filter((s) => {
    return (
      s.name.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });
}

/** Validate a user-supplied URL or stdio command. Returns null when
 *  the value looks acceptable; otherwise an error message. */
export function validateMcpDetail(
  transport: "http" | "stdio",
  detail: string,
): string | null {
  const trimmed = detail.trim();
  if (!trimmed) return "empty";
  if (trimmed.length > 2048) return "tooLong";
  if (transport === "http") {
    if (!/^https?:\/\//i.test(trimmed)) return "httpScheme";
    return null;
  }
  // stdio: require a known binary prefix. Bare arguments are not
  // accepted because they don't tell the agent which runtime to use.
  if (!/^(npx|node|python|python3|bun|uv|pipx)\b/i.test(trimmed)) {
    return "stdioPrefix";
  }
  return null;
}
