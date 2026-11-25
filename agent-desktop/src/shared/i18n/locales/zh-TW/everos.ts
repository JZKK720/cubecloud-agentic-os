export default {
  "eyebrow": "記憶",
  "title": "EverOS",
  "summary": "EverOS 是以自架 EverCore 為後端的長期記憶系統。在這裡設定你的 EverOS 服務位址,讓 Shell 跨工作階段記住使用者的偏好。",
  "notWired": {
    "title": "尚未接通",
    "body": "EverOS 集成正在补齐中。后端接口已在主进程实现,完成 preload 桥接后此界面即可使用。",
    "addHarness": "添加 Harness(即将开放)"
  },
  "scope": {
    "label": "範圍",
    "hint": "本主控台僅在 EverOS 的 agentic-os 應用範圍內讀寫資料,不會觸及其他範圍(workspace、其他應用)。"
  },
  "health": {
    "title": "後端",
    "reachable": "已連線",
    "unreachable": "無法連線",
    "probing": "偵測中…",
    "scannedAt": "最近檢查"
  },
  "config": {
    "title": "連線",
    "body": "EverOS 默认运行在 http://localhost:8000。配置后,所有需要长期记忆的操作都会指向该地址。",
    "baseUrl": "服務位址",
    "apiKey": "API 金鑰",
    "userId": "使用者識別",
    "groupId": "群組識別",
    "topK": "Top K",
    "method": "檢索方式",
    "save": "儲存",
    "edit": "設定",
    "cancel": "關閉"
  },
  "add": {
    "title": "記住",
    "body": "把希望代理長期記住的內容寫在這裡。",
    "placeholder": "例如:使用者偏好深色主題和簡短回覆。",
    "cta": "儲存",
    "sending": "送出中…",
    "success": "已儲存 {{count}} 筆記憶。",
    "failed": "儲存失敗:{{error}}"
  },
  "search": {
    "title": "回憶",
    "body": "在使用者的情節記憶中做混合檢索。",
    "placeholder": "使用者偏好什麼?",
    "cta": "搜尋",
    "searching": "搜尋中…",
    "empty": "目前沒有相關記憶。"
  },
  "recent": {
    "title": "最近",
    "empty": "尚未記錄任何記憶。"
  },
  "setup": {
    "title": "本機執行",
    "body": "EverOS 是以 Postgres + Milvus 為基礎的 Python 服務。可透過 Docker Compose 與 uv 啟動。",
    "healthCheck": "確認服務已就緒:"
  },
  "error": {
    "searchFailed": "搜尋失敗。",
    "recentFailed": "無法列出最近的記憶。"
  },
  "sidecar": {
    "title": "本機 sidecar",
    "body": "EverOS 目前未在 {{baseUrl}} 執行。啟動 sidecar 以將記憶保留在這台機器上。",
    "reason": "原因",
    "lastError": "上次錯誤",
    "pid": "PID",
    "port": "連接埠",
    "crashCount": "當機次數",
    "uptime": "運行時間",
    "start": "啟動 sidecar",
    "stop": "停止 sidecar",
    "restart": "重新啟動",
    "refreshLogs": "重新整理記錄",
    "logsSummary": "記錄（{{count}} 行）",
    "clearLogs": "清除記錄"
  },
  "windowsNote": {
    "title": "Windows 注意事項",
    "body": "在 Windows 上，受管理的本機 EverOS 可能仍需要 WSL 或遠端主機。若本機 sidecar 無法啟動，請繼續以指向 WSL 或遠端 EverOS 服務位址的方式使用此畫面。"
  }
};
