export default {
  title: "工具",
  subtitle: "启用或禁用代理在对话期间可使用的工具集",
  empty: "暂无可用工具集",
  emptyHint: "网关运行后，工具集将显示在这里。",
  web: { label: "网络搜索", description: "搜索网页并提取 URL 内容" },
  browser: { label: "浏览器", description: "浏览、点击、输入并与网页交互" },
  terminal: { label: "终端", description: "执行 shell 命令和脚本" },
  file: { label: "文件操作", description: "读取、写入、搜索和管理文件" },
  code_execution: {
    label: "代码执行",
    description: "直接执行 Python 和 shell 代码",
  },
  vision: { label: "视觉", description: "分析图片和视觉内容" },
  image_gen: { label: "图像生成", description: "使用 DALL-E 等模型生成图片" },
  tts: { label: "文本转语音", description: "把文本转换为语音音频" },
  skills: { label: "技能", description: "创建、管理并执行可复用技能" },
  memory: { label: "记忆", description: "存储并召回持久知识" },
  session_search: { label: "会话搜索", description: "搜索历史会话内容" },
  clarify: { label: "澄清提问", description: "在需要时向用户发起澄清" },
  delegation: { label: "任务委派", description: "为并行任务派生子代理" },
  cronjob: { label: "计划任务", description: "创建和管理定时任务" },
  moa: { label: "多代理协作", description: "协调多个 AI 模型协同工作" },
  todo: { label: "任务规划", description: "为复杂任务创建和管理待办列表" },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "MCP 服务器",
  workspace: {
    subtitle:
      "对话式运行底座：会话、文件，以及驱动各家 CLI 适配器的执行层。想让它受控于控制台时再连接。",
    start: "启动",
    stop: "停止",
    probing: "探测中……",
    reachable: "已连接",
    unreachable: "AI Workspace 无法连接：",
    attachedAt: "连接时间",
  },
  mcpDescription:
    "在 config.yaml 中配置的模型上下文协议服务器。在终端中使用 <code>hermes mcp add/remove</code> 管理。",
  http: "HTTP",
  stdio: "标准IO",
  disabled: "已禁用",
  panels: {
    laya: {
      subtitle:
        "本地 System-1 决策引擎 — 带置信度与弃权的 typed choice/score/noul 决策，通过 MCP 暴露给控制台。",
      ready: "就绪",
      broken: "已安装，但版本探测失败",
    },
    weknora: {
      subtitle:
        "可选的企业级 RAG 知识平台。控制台侧只做检索，数据由你自己的 WeKnora 服务器持有。",
      reachable: "已连接",
      unreachable: "无法连接",
    },
    governance: {
      title: "工作区治理",
      subtitle:
        "来自 AI Workspace 的策略注册表、计划任务与共享设置 — 即控制台的治理视图。审批结论由你投递到工作区的 resolve 接口。",
      visible: "可见",
      unavailable: "治理界面无法连接",
    },
    openviking: {
      subtitle:
        "可选的智能体上下文数据库 — 资源、记忆与技能统一存放在可浏览的 viking:// 文件系统中（仅互操作；核心为 AGPL）。",
      reachable: "已连接",
      unreachable: "无法连接",
    },
    gbrain: {
      title: "GBrain（持久记忆）",
      subtitle:
        "基于 Postgres 的个人知识大脑，提供 30+ MCP 工具 — 混合搜索、综合分析、知识图谱和梦境循环。通过 PGLite 实现本地优先（零配置，无需 Docker）。让你的代理不再失忆的记忆层。",
      healthy: "健康",
      unhealthy: "异常",
      notInstalled:
        'GBrain 未安装。使用 <code>bun install -g github:garrytan/gbrain</code> 安装，然后用 <code>gbrain init --pglite --no-embedding</code> 初始化。',
    },
    wigolo: {
      title: "Wigolo（本地网络智能）",
      subtitle:
        "本地优先的网络智能 — 搜索、抓取、爬虫、提取和研究。10 个 MCP 工具，核心工具无需 API 密钥。Firecrawl（付费）的免费本地替代品。可在 MCP 屏幕中作为 MCP 服务器添加。",
      hint: '通过 MCP 屏幕添加：搜索 "wigolo"。无需安装 — npx 首次运行时自动获取。',
    },
    watchSkill: {
      title: "Watch-Skill（视频智能）",
      subtitle:
        "面向代理的视频智能 — 观察、记忆、验证。23 个 MCP 工具，用于视频分析、转录、OCR 和 THE LOOP（浏览器/UI 验证）。可在 MCP 屏幕中作为 MCP 服务器添加。",
      hint: '通过 MCP 屏幕添加：搜索 "watch-skill"。使用 <code>uv tool install watch-skill</code> 安装（Python 3.13+）。',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "通过 Chrome DevTools Protocol 实现的 LLM 驱动浏览器自动化。代理可以打开页面、点击、输入、填表、提取数据并进行网站 QA 测试。browser-harness 是 CDP 连接器，browser-use 是代理大脑。与 agent-reach（研究）和 watch-skill（视频验证）配合实现完整的网络能力。",
      installed: "已安装",
      doctorOk: " — 诊断：正常",
      doctorIssues: " — 诊断：发现问题",
      doctorNotRun: " — 诊断：未运行",
      hint: '将 browser-use 添加为 MCP 服务器：在 MCP 屏幕搜索 "browser-use"。在设置中配置 BU_CDP_URL 以通过 CDP 连接 Chrome。',
      notInstalled:
        "Browser Harness 未安装。使用 <code>uv tool install browser-harness</code> 安装（Python 3.12+）。然后在 Chrome 中通过 <code>chrome://inspect/#remote-debugging</code> 启用远程调试。",
    },
    officecli: {
      title: "OfficeCLI（Office 文档自动化）",
      subtitle:
        "创建、读取、编辑和渲染 Word (.docx)、Excel (.xlsx) 和 PowerPoint (.pptx) 文档 — 无需安装 Office。单一二进制文件，内置 HTML/PNG 渲染引擎、350+ Excel 公式、模板合并和数据透视表。markitdown 读取转换的写入端补充。可在 MCP 屏幕中作为 MCP 服务器添加。",
      installed: "已安装",
      hint: '添加为 MCP 服务器：在 MCP 屏幕搜索 "officecli"。代理可以通过 CLI 或 MCP 创建、编辑和渲染 Office 文档。',
      notInstalled:
        "OfficeCLI 未安装。使用 <code>npm install -g @officecli/officecli</code> 安装或从 <code>https://github.com/iOfficeAI/OfficeCLI</code> 下载。单一二进制文件，无需 .NET 运行时。",
      run: {
        title: "运行文档命令",
        fileLabel: "文档路径",
        filePlaceholder: ".docx、.xlsx 或 .pptx 文件的绝对路径",
        verbLabel: "命令",
        argsLabel: "参数",
        argsPlaceholder: "额外参数，例如 --page 1-3（可选）",
        submit: "运行",
        running: "运行中…",
        outputLabel: "输出",
        emptyHint: "请输入你的主目录或临时目录中的路径。根目录之外的路径会被拒绝。",
        notInstalled: "OfficeCLI 未安装，无法运行。",
      },
      view: {
        button: "以电子表格查看",
        loading: "正在加载预览…",
        loadingUniver: "正在加载 Univer…",
      },
    },
    graphify: {
      title: "Graphify（概念知识图谱）",
      subtitle:
        "将任何文件夹（代码、文档、论文、图片）转换为可导航的概念知识图谱，带有社区检测。发现你从未想到的跨文档连接。用语义概念图谱补充 CodeGraph（代码 AST 结构）。输出：交互式 HTML、GraphRAG JSON、审计报告。可作为 MCP 服务器供代理查询。",
      installed: "已安装",
      hint: '添加为 MCP 服务器：在 MCP 屏幕搜索 "graphify"。运行 <code>graphify &lt;路径&gt;</code> 构建图谱，然后用 <code>graphify query "&lt;问题&gt;"</code> 查询。',
      notInstalled:
        "Graphify 未安装。使用 <code>uv tool install 'graphifyy[mcp]'</code> 安装（Python 3.12+）。",
    },
  },
  agentReachTitle: "互联网能力（Agent-Reach）",
  agentReachSubtitle:
    "Agent-Reach 让运行时智能体具备联网能力 — Twitter、Reddit、YouTube、GitHub、RSS、网页搜索等。在网关机器上安装：python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "刷新",
  agentReachScanning: "扫描中……",
  agentReachInstalled: "已安装",
  agentReachNotInstalled:
    "Agent-Reach 未安装。运行时智能体没有联网能力工具。",
  managedApps: {
    title: "受管应用",
    subtitle:
      "桌面端可连接的每一个应用，以及其适配器上报的状态。只读：桌面端只是镜像这些服务，并不管理它们。",
    refresh: "刷新",
    loading: "正在读取名册……",
    empty: "尚未注册任何受管应用。",
    needsSetup: "需要设置",
    needsAuth: "需要设置",
    unavailable: "此构建中不提供受管应用名册。",
  },
} as const;
