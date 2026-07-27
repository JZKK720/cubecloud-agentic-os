export default {
  title: "工具",
  subtitle: "啟用或停用 Agent 在對話期間可使用的工具集",
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
    label: "File to Markdown",
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
} as const;
