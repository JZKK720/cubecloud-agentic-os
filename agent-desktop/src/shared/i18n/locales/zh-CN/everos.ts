export default {
  "eyebrow": "记忆",
  "title": "EverOS",
  "summary": "EverOS 是基于自托管 EverCore 后端的长期记忆系统。在此处配置你的 EverOS 服务地址,让 Shell 跨会话记住用户的偏好。",
  "notWired": {
    "title": "尚未接通",
    "body": "EverOS 集成正在补齐中。后端接口已在主进程实现,完成 preload 桥接后此界面即可使用。",
    "addHarness": "添加 Harness(即将开放)"
  },
  "health": {
    "title": "后端",
    "reachable": "已连接",
    "unreachable": "无法连接",
    "probing": "检测中…",
    "scannedAt": "最近检查"
  },
  "config": {
    "title": "连接",
    "body": "EverOS 默认运行在 http://localhost:1995。配置后,所有需要长期记忆的操作都会指向该地址。",
    "baseUrl": "服务地址",
    "apiKey": "API Key",
    "userId": "用户标识",
    "groupId": "分组标识",
    "topK": "Top K",
    "method": "检索方式",
    "save": "保存",
    "edit": "配置",
    "cancel": "关闭"
  },
  "add": {
    "title": "记住",
    "body": "把希望智能体长期记住的内容写在这里。",
    "placeholder": "例如:用户偏好暗色主题和简短回答。",
    "cta": "存储",
    "sending": "提交中…",
    "success": "已存储 {{count}} 条记忆。",
    "failed": "存储失败:{{error}}"
  },
  "search": {
    "title": "回忆",
    "body": "在用户的情景记忆中做混合检索。",
    "placeholder": "用户偏好什么?",
    "cta": "搜索",
    "searching": "搜索中…",
    "empty": "暂无相关记忆。"
  },
  "recent": {
    "title": "最近",
    "empty": "尚未记录任何记忆。"
  },
  "setup": {
    "title": "本地运行",
    "body": "EverOS 是基于 Postgres + Milvus 的 Python 服务。可通过 Docker Compose 与 uv 启动。",
    "healthCheck": "确认服务已就绪:"
  },
  "error": {
    "searchFailed": "搜索失败。",
    "recentFailed": "无法列出最近的记忆。"
  },
  "sidecar": {
    "title": "本地 sidecar",
    "body": "EverOS 未在 {{baseUrl}} 运行。启动 sidecar 即可让记忆保留在本机。",
    "reason": "原因",
    "lastError": "最近错误",
    "pid": "进程 ID",
    "port": "端口",
    "crashCount": "崩溃次数",
    "uptime": "运行时长",
    "start": "启动 sidecar",
    "stop": "停止 sidecar",
    "restart": "重启",
    "refreshLogs": "刷新日志",
    "logsSummary": "日志（{{count}} 行）",
    "clearLogs": "清空日志"
  },
  "windowsNote": {
    "title": "Windows 提示",
    "body": "在 Windows 上，由桌面端托管的本地 EverOS 可能仍需要 WSL 或远程主机。如果本地 sidecar 启动失败，请继续用本页面连接运行在 WSL 或远程主机上的 EverOS 地址。"
  }
};
