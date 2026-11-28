export default {
  title: "Tools",
  subtitle:
    "Enable or disable the toolsets your agent can use during conversations",
  empty: "No toolsets available",
  emptyHint: "Toolsets will appear here once the gateway is running.",
  web: {
    label: "Web Search",
    description: "Search the web and extract content from URLs",
  },
  browser: {
    label: "Browser",
    description: "Navigate, click, type, and interact with web pages",
  },
  terminal: {
    label: "Terminal",
    description: "Execute shell commands and scripts",
  },
  file: {
    label: "File Operations",
    description: "Read, write, search, and manage files",
  },
  code_execution: {
    label: "Code Execution",
    description: "Execute Python and shell code directly",
  },
  vision: { label: "Vision", description: "Analyze images and visual content" },
  image_gen: {
    label: "Image Generation",
    description: "Generate images with DALL-E and other models",
  },
  tts: { label: "Text-to-Speech", description: "Convert text to spoken audio" },
  skills: {
    label: "Skills",
    description: "Create, manage, and execute reusable skills",
  },
  memory: {
    label: "Memory",
    description: "Store and recall persistent knowledge",
  },
  session_search: {
    label: "Session Search",
    description: "Search across past conversations",
  },
  clarify: {
    label: "Clarifying Questions",
    description: "Ask the user for clarification when needed",
  },
  delegation: {
    label: "Delegation",
    description: "Spawn sub-agents for parallel tasks",
  },
  cronjob: {
    label: "Cron Jobs",
    description: "Create and manage scheduled tasks",
  },
  moa: {
    label: "Mixture of Agents",
    description: "Coordinate multiple AI models together",
  },
  todo: {
    label: "Task Planning",
    description: "Create and manage to-do lists for complex tasks",
  },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, …) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "MCP Servers",
  workspace: {
    subtitle:
      "The conversational operating fabric — sessions, files, and the runner fabric that drives the CLI adapters. Attach when you want the console to govern it.",
    start: "Start",
    stop: "Stop",
    probing: "Probing…",
    reachable: "Reachable",
    unreachable: "AI Workspace not reachable on",
    attachedAt: "Attached at",
  },
  mcpDescription:
    "Model Context Protocol servers configured in config.yaml. Manage via <code>hermes mcp add/remove</code> in the terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "disabled",
  panels: {
    laya: {
      subtitle:
        "Local System-1 decision engine — typed choice/score/noul decisions with confidence and abstention, exposed to the console via MCP.",
      ready: "Ready",
      broken: "Installed but version probe failed",
    },
    weknora: {
      subtitle:
        "Optional enterprise RAG knowledge platform. Retrieval-only on the console side; your WeKnora server owns its data.",
      reachable: "Reachable",
      unreachable: "Not reachable",
    },
    governance: {
      title: "Workspace governance",
      subtitle:
        "Policy registry, scheduled tasks, and sharing from the AI Workspace — the console's governance view. Approval verdicts are delivered by you, to the workspace's resolve endpoint.",
      visible: "Visible",
      unavailable: "Governance surfaces not reachable",
    },
    openviking: {
      subtitle:
        "Optional agent context database — resources, memories, and skills in one browsable viking:// filesystem (interop-only; AGPL core).",
      reachable: "Reachable",
      unreachable: "Not reachable",
    },
    gbrain: {
      title: "GBrain (Persistent Memory)",
      subtitle:
        "Postgres-native personal knowledge brain with 30+ MCP tools — hybrid search, synthesis, knowledge graph, and the dream cycle. Local-first via PGLite (zero-config, no Docker). The memory layer your agent stops being amnesiac with.",
      healthy: "Healthy",
      unhealthy: "Unhealthy",
      notInstalled:
        'GBrain is not installed. Install with: <code>bun install -g github:garrytan/gbrain</code> then initialize with <code>gbrain init --pglite --no-embedding</code>.',
    },
    wigolo: {
      title: "Wigolo (Local Web Intelligence)",
      subtitle:
        'Local-first web intelligence — search, fetch, crawl, extract, and research. 10 MCP tools, no API keys needed for core tools. A free local complement to Firecrawl (paid). Available as an MCP server in the MCP screen.',
      hint: 'Add via the MCP screen: search for "wigolo". No install needed — npx fetches on first run.',
    },
    watchSkill: {
      title: "Watch-Skill (Video Intelligence)",
      subtitle:
        "Video intelligence for agents — watch, remember, verify. 23 MCP tools for video analysis, transcription, OCR, and THE LOOP (browser/UI verification). Available as an MCP server in the MCP screen.",
      hint: 'Add via the MCP screen: search for "watch-skill". Install with: <code>uv tool install watch-skill</code> (Python 3.13+).',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "LLM-driven browser automation via Chrome DevTools Protocol. The agent opens pages, clicks, types, fills forms, extracts data, and QA-tests websites. browser-harness is the thin CDP connector; browser-use is the agent brain. Pairs with agent-reach (research) and watch-skill (video verification) for full web capability.",
      installed: "Installed",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: issues found",
      doctorNotRun: " — doctor: not run",
      hint: 'Add browser-use as an MCP server: search "browser-use" in the MCP screen. Set BU_CDP_URL in Settings to connect to your Chrome via CDP.',
      notInstalled:
        'Browser Harness is not installed. Install with: <code>uv tool install browser-harness</code> (Python 3.12+). Then enable remote debugging in Chrome via <code>chrome://inspect/#remote-debugging</code>.',
    },
    officecli: {
      title: "OfficeCLI (Office Document Automation)",
      subtitle:
        "Create, read, edit, and render Word (.docx), Excel (.xlsx), and PowerPoint (.pptx) documents — no Office installation required. Single binary with built-in HTML/PNG rendering, 350+ Excel formulas, template merge, and pivot tables. The write-side complement to markitdown's read-side conversion. Available as an MCP server in the MCP screen.",
      installed: "Installed",
      hint: 'Add as an MCP server: search "officecli" in the MCP screen. The agent can create, edit, and render Office documents via CLI or MCP.',
      notInstalled:
        'OfficeCLI is not installed. Install with: <code>npm install -g @officecli/officecli</code> or download from <code>https://github.com/iOfficeAI/OfficeCLI</code>. Single binary, no .NET runtime needed.',
      run: {
        title: "Run a document command",
        fileLabel: "Document path",
        filePlaceholder: "Absolute path to a .docx, .xlsx or .pptx file",
        verbLabel: "Command",
        argsLabel: "Arguments",
        argsPlaceholder: "Extra arguments, e.g. --page 1-3 (optional)",
        submit: "Run",
        running: "Running…",
        outputLabel: "Output",
        emptyHint: "Enter a file path inside your home or temp folder. Paths outside those roots are refused.",
        notInstalled: "OfficeCLI is not installed, so there is nothing to run.",
      },
      view: {
        button: "View as spreadsheet",
        loading: "Loading preview…",
        loadingUniver: "Loading Univer…",
        previewHint: "Run `officecli view <file> text --json` to preview a spreadsheet here.",
      },
    },
    graphify: {
      title: "Graphify (Concept Knowledge Graph)",
      subtitle:
        "Turn any folder (code, docs, papers, images) into a navigable concept knowledge graph with community detection. Finds cross-document connections you'd never think to ask about. Complements CodeGraph (code AST structure) with semantic concept graphs across documents. Outputs: interactive HTML, GraphRAG JSON, audit report. Available as an MCP server for agent-accessible graph queries.",
      installed: "Installed",
      hint: 'Add as an MCP server: search "graphify" in the MCP screen. Run <code>graphify &lt;path&gt;</code> to build a graph, then query with <code>graphify query "&lt;question&gt;"</code>.',
      notInstalled:
        "Graphify is not installed. Install with: <code>uv tool install 'graphifyy[mcp]'</code> (Python 3.12+).",
    },
  },
  agentReachTitle: "Internet Capabilities (Agent-Reach)",
  agentReachSubtitle:
    "Agent-Reach gives your runtime agent internet access — Twitter, Reddit, YouTube, GitHub, RSS, web search, and more. Install it on the gateway machine with: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "Refresh",
  agentReachScanning: "Scanning...",
  agentReachInstalled: "Installed",
  agentReachNotInstalled:
    "Agent-Reach is not installed. The runtime agent does not have internet capability tools.",
  managedApps: {
    title: "Managed apps",
    subtitle:
      "Every app the desktop can attach to, with the state its adapter reports. Read-only: the desktop mirrors these services, it does not manage them.",
    refresh: "Refresh",
    loading: "Reading roster…",
    empty: "No managed apps are registered.",
    needsSetup: "needs setup",
    needsAuth: "needs setup",
    unavailable: "The managed-app roster is not available in this build.",
  },
} as const;
