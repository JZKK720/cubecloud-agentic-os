// Simplified Chinese — Headroom quick-start copy.
// Native review: ready for production. If reviewers want further
// adjustments, edit this file directly and re-run the i18n test
// suite. Other locales fall back to this file when keys are missing.

export default {
  quickStart: {
    title: "快速开始",
    body: "先用 audit（审计）模式运行一次压缩测试，确认节省效果后再切换到 optimize（优化）模式，让代理真正改写请求。",
    step1: "将 Base URL 指向一个已经在跑的 Headroom 代理，或先在下方启动本地 sidecar。",
    step2: "保持 audit 模式，让 Headroom 先测量、再改写请求。",
    step3: "在日常使用 Headroom 之前，先用一段真实的日志或代码包做测试。",
    currentTarget: "当前目标：{{url}}",
    notReachable: "Headroom 暂不可达。先启动 sidecar，或修改 Base URL。",
    startSidecar: "启动本地 sidecar",
    editConnection: "修改连接",
    copyInstall: "复制安装命令",
    copyCommand: "复制命令",
    installHint: "在终端运行这条命令安装 Headroom 运行时。桌面端不会代你安装。",
    installCommand: 'pip install "headroom-ai[all]"',
    firstRunTitle: "首次使用",
    firstRunBody: "Headroom 是一个本地上下文压缩代理。先选一个模式开始。",
    modeAudit: "Audit（审计）",
    modeAuditHint: "只测量，不改写请求。",
    modeOptimize: "Optimize（优化）",
    modeOptimizeHint: "在确认节省效果之后再开始改写。",
    dismiss: "隐藏此卡片",
    reset: "重新展开快速开始",
    collapsedSummary: "快速开始已隐藏。随时可以再次打开，按 audit → 测试 → optimize 顺序走一遍。",
    switchToOptimize: "节省效果已经不错。切换到 optimize，让 Headroom 真正压缩请求。",
    switchingToOptimize: "正在切换...",
    switchMode: "切换到 optimize",
    learnWhy: "为什么需要这一步",
    learnWhyBody: "在 audit 模式下 Headroom 只会测量节省量，不会改写请求；切换到 optimize 后才会真正改写。先在 audit 模式验证，再切换。",
  },
} as const;
