export default {
  title: "工具",
  subtitle: "啟用或停用 Agent 在對話期間可使用的工具集",
  empty: "沒有可用的工具集",
  emptyHint: "閘道執行後，工具集會顯示在這裡。",
  workspace: {
    subtitle:
      "對話式作業作業基礎 — 工作階段、檔案，以及驅動 CLI 轉接器的執行層。想讓主控台管理它時再附加。",
    start: "啟動",
    stop: "停止",
    probing: "探測中…",
    reachable: "可連線",
    unreachable: "AI Workspace 無法連線於",
    attachedAt: "附加於",
  },
  web: { label: "網路搜尋", description: "搜尋網頁並擷取 URL 內容" },
  browser: { label: "瀏覽器", description: "瀏覽、點擊、輸入並與網頁互動" },
  terminal: { label: "終端機", description: "執行 shell 命令和腳本" },
  file: { label: "檔案操作", description: "讀取、寫入、搜尋和管理檔案" },
  code_execution: {
    label: "程式碼執行",
    description: "直接執行 Python 和 shell 程式碼",
  },
  vision: { label: "視覺", description: "分析圖片和視覺內容" },
  image_gen: { label: "圖片生成", description: "使用 DALL-E 等模型生成圖片" },
  tts: { label: "文字轉語音", description: "把文字轉換為語音音訊" },
  skills: { label: "技能", description: "建立、管理並執行可重複使用技能" },
  memory: { label: "記憶", description: "儲存並召回持久知識" },
  session_search: {
    label: "工作階段搜尋",
    description: "搜尋歷史工作階段內容",
  },
  clarify: { label: "澄清提問", description: "在需要時向使用者發起澄清" },
  delegation: { label: "工作委派", description: "為並行工作派生子 Agent" },
  cronjob: { label: "排程工作", description: "建立和管理排程工作" },
  moa: { label: "多 Agent 協作", description: "協調多個 AI 模型協同工作" },
  todo: { label: "工作規劃", description: "為複雜工作建立和管理待辦列表" },
  file_to_markdown: {
    label: "檔案轉 Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "MCP 伺服器",
  mcpDescription:
    "在 config.yaml 中設定的 Model Context Protocol 伺服器。在終端機中使用 <code>hermes mcp add/remove</code> 管理。",
  http: "HTTP",
  stdio: "標準 I/O",
  disabled: "已停用",
  // V2.10.77 — 工具面板
  panels: {
    laya: {
      subtitle:
        "本機 System-1 決策引擎 — 具型別的 choice/score/noul 決策，附信心值與棄權，透過 MCP 公開給主控台。",
      ready: "就緒",
      broken: "已安裝但版本探測失敗",
    },
    weknora: {
      subtitle:
        "可選的企業級 RAG 知識平台。主控台端僅提供檢索；你的 WeKnora 伺服器自行管理其資料。",
      reachable: "可連線",
      unreachable: "無法連線",
    },
    governance: {
      title: "工作區治理",
      subtitle:
        "來自 AI Workspace 的政策登錄、排程工作與共用 — 主控台的治理檢視。核准裁決由你送達至工作區的 resolve 端點。",
      visible: "可見",
      unavailable: "治理介面無法連線",
    },
    openviking: {
      subtitle:
        "可選的代理上下文資料庫 — 資源、記憶與技能，統一於可瀏覽的 viking:// 檔案系統中（僅互通；AGPL 核心）。",
      reachable: "可連線",
      unreachable: "無法連線",
    },
    gbrain: {
      title: "GBrain（持久記憶）",
      subtitle:
        "Postgres 原生的個人知識腦，配備 30+ MCP 工具 — 混合搜尋、綜合、知識圖譜和夢境循環。透過 PGLite 實現本地優先（零設定、無 Docker）。讓您的代理不再失憶的記憶層。",
      healthy: "健康",
      unhealthy: "不健康",
      notInstalled:
        'GBrain 未安裝。使用 <code>bun install -g github:garrytan/gbrain</code> 安裝，然後用 <code>gbrain init --pglite --no-embedding</code> 初始化。',
    },
    wigolo: {
      title: "Wigolo（本地網路智慧）",
      subtitle:
        '本地優先的網路智慧 — 搜尋、擷取、爬取、提取和研究。10 個 MCP 工具，核心工具無需 API 金鑰。Firecrawl（付費）的免費本地替代方案。在 MCP 畫面中可作為 MCP 伺服器使用。',
      hint: '透過 MCP 畫面新增：搜尋「wigolo」。無需安裝 — npx 在首次執行時自動下載。',
    },
    watchSkill: {
      title: "Watch-Skill（影片智慧）",
      subtitle:
        "代理專用的影片智慧 — 觀看、記憶、驗證。23 個 MCP 工具，用於影片分析、轉錄、OCR 和 THE LOOP（瀏覽器/UI 驗證）。在 MCP 畫面中可作為 MCP 伺服器使用。",
      hint: '透過 MCP 畫面新增：搜尋「watch-skill」。使用 <code>uv tool install watch-skill</code> 安裝（Python 3.13+）。',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "透過 Chrome DevTools Protocol 進行 LLM 驅動的瀏覽器自動化。代理開啟頁面、點擊、輸入、填寫表單、提取資料並測試網站。browser-harness 是輕量 CDP 連接器；browser-use 是代理的大腦。",
      installed: "已安裝",
      doctorOk: " — doctor：正常",
      doctorIssues: " — doctor：發現問題",
      doctorNotRun: " — doctor：未執行",
      hint: '將 browser-use 新增為 MCP 伺服器：在 MCP 畫面搜尋「browser-use」。在設定中設定 BU_CDP_URL 以透過 CDP 連接 Chrome。',
      notInstalled:
        'Browser Harness 未安裝。使用 <code>uv tool install browser-harness</code> 安裝（Python 3.12+）。然後透過 <code>chrome://inspect/#remote-debugging</code> 在 Chrome 中啟用遠端除錯。',
    },
    officecli: {
      title: "OfficeCLI（Office 文件自動化）",
      subtitle:
        "建立、讀取、編輯和渲染 Word (.docx)、Excel (.xlsx) 和 PowerPoint (.pptx) 文件 — 無需安裝 Office。單一二進位檔，內建 HTML/PNG 渲染、350+ Excel 公式、範本合併和樞紐分析表。markitdown 讀取側轉換的寫入側互補。",
      installed: "已安裝",
      hint: '新增為 MCP 伺服器：在 MCP 畫面搜尋「officecli」。代理可透過 CLI 或 MCP 建立、編輯和渲染 Office 文件。',
      notInstalled:
        'OfficeCLI 未安裝。使用 <code>npm install -g @officecli/officecli</code> 安裝，或從 <code>https://github.com/iOfficeAI/OfficeCLI</code> 下載。單一二進位檔，無需 .NET 執行階段。',
      run: {
        title: "執行文件命令",
        fileLabel: "文件路徑",
        filePlaceholder: ".docx、.xlsx 或 .pptx 檔案的絕對路徑",
        verbLabel: "命令",
        argsLabel: "參數",
        argsPlaceholder: "額外參數，例如 --page 1-3（可選）",
        submit: "執行",
        running: "執行中…",
        outputLabel: "輸出",
        emptyHint: "請輸入你的主目錄或暫存目錄中的路徑。根目錄以外的路徑會被拒絕。",
        notInstalled: "OfficeCLI 未安裝，無法執行。",
      },
      view: {
        button: "以試算表檢視",
        loading: "正在載入預覽…",
        loadingUniver: "正在載入 Univer…",
        previewHint: "執行 `officecli view <檔案> text --json` 即可在此預覽試算表。",
      },
    },
    graphify: {
      title: "Graphify（概念知識圖譜）",
      subtitle:
        "將任何資料夾（程式碼、文件、論文、圖片）轉換為可導航的概念知識圖譜，配備社群偵測。發現您從未想過要問的跨文件關聯。以語意概念圖譜補充 CodeGraph（程式碼 AST 結構）。輸出互動式 HTML、GraphRAG JSON 和稽核報告。",
      installed: "已安裝",
      hint: '新增為 MCP 伺服器：在 MCP 畫面搜尋「graphify」。執行 <code>graphify &lt;路徑&gt;</code> 建構圖譜，然後用 <code>graphify query "&lt;問題&gt;"</code> 查詢。',
      notInstalled:
        "Graphify 未安裝。使用 <code>uv tool install 'graphifyy[mcp]'</code> 安裝（Python 3.12+）。",
    },
  },
  agentReachTitle: "網路能力（Agent-Reach）",
  agentReachSubtitle:
    "Agent-Reach 讓你的執行環境代理具備網路存取能力 — Twitter、Reddit、YouTube、GitHub、RSS、網頁搜尋等等。在安裝閘道器的機器上安裝：python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "重新整理",
  agentReachScanning: "掃描中...",
  agentReachInstalled: "已安裝",
  agentReachNotInstalled:
    "Agent-Reach 未安裝。執行環境代理不具備網路能力工具。",
  managedApps: {
    title: "受管理的應用程式",
    subtitle:
      "桌面可附加的所有應用程式，以及其轉接器回報的狀態。唯讀：桌面僅反映這些服務，不會管理它們。",
    refresh: "重新整理",
    loading: "讀取名單中…",
    empty: "沒有已註冊的受管理應用程式。",
    needsSetup: "需要設定",
    needsAuth: "需要設定",
    unavailable: "此版本未提供受管理應用程式名單。",
  },
} as const;
