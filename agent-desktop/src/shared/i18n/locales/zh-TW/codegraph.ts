// CodeGraph 畫面字串的繁體中文（台灣）翻譯。

export default {
  eyebrow: "程式碼智慧",
  title: "CodeGraph",
  summary:
    "只需索引一次存放庫，之後即可提出結構性問題。CodeGraph 會走訪 AST 以對應進入點、匯入與呼叫邊，讓代理能夠推理尚未逐行閱讀的程式碼。",
  runtime: "本機執行環境",
  repos: {
    title: "已索引的存放庫",
    empty: "尚未索引任何存放庫。請在下方新增存放庫以建立其圖譜。",
  },
  addRepo: "新增存放庫",
  files: "個檔案",
  nodes: "個節點",
  edges: "條邊",
  cli: {
    installed: "CLI 已安裝",
    version: "版本",
    missingTitle: "找不到 CodeGraph CLI",
    missingBody:
      "請安裝 CodeGraph CLI 以索引存放庫，或將 Hermes 指向現有的索引。桌面應用程式不會為你安裝它。",
    install: "安裝 CodeGraph CLI",
    setupHermes: "設定 Hermes",
  },
  contextBundle: "上下文組合包",
  contextBundleHint:
    "描述你想獲取上下文的架構或程式碼路徑。CodeGraph 會將相關檔案與邊組裝成單一附件，可直接放入 Chat。",
  promptPlaceholder:
    "摘要說明架構、熱路徑與可能的擴充點…",
  build: "建立組合包",
  building: "建立中…",
  embeddedSearch: "嵌入式搜尋",
  embeddedSearchHint:
    "直接從殼層查詢索引。結果依圖距離排序，而不僅是文字比對。",
  embeddedSdkVersion: "SDK 版本",
  embeddedProjectOpen: "專案已開啟",
  embeddedOpenProject: "開啟專案",
  embeddedSearchPlaceholder: "提出結構性問題，例如：auth 在哪裡強制執行？",
  embeddedSearchCta: "搜尋圖譜",
} as const;
