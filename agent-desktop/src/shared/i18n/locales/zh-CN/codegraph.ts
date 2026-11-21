// CodeGraph 屏幕字符串 — 简体中文

export default {
  eyebrow: "代码智能",
  title: "CodeGraph",
  summary:
    "为代码库建立一次索引，之后就能对它提出结构性问题。CodeGraph 通过 AST 梳理入口、导入与调用关系，让智能体无需逐行阅读也能理解代码。",
  runtime: "本地运行时",
  repos: {
    title: "已索引的仓库",
    empty: "尚未索引任何仓库。在下方添加仓库以构建它的图谱。",
  },
  addRepo: "添加仓库",
  files: "个文件",
  nodes: "个节点",
  edges: "条边",
  cli: {
    installed: "CLI 已安装",
    version: "版本",
    missingTitle: "未找到 CodeGraph CLI",
    missingBody:
      "安装 CodeGraph CLI 以便索引仓库，或让 Hermes 指向已有的索引。桌面端不会替你安装它。",
    install: "安装 CodeGraph CLI",
    setupHermes: "配置 Hermes",
  },
  contextBundle: "上下文包",
  contextBundleHint:
    "描述你需要的架构或代码路径。CodeGraph 会把相关文件与调用关系整理成单个附件，可直接拖入 Chat。",
  promptPlaceholder: "概括这个项目的架构、热点路径以及可能的扩展点……",
  build: "构建上下文包",
  building: "构建中……",
  embeddedSearch: "内嵌检索",
  embeddedSearchHint:
    "直接在界面中查询索引。结果按图谱邻近度排序，而不只是文本匹配。",
  embeddedSdkVersion: "SDK 版本",
  embeddedProjectOpen: "项目已打开",
  embeddedOpenProject: "打开项目",
  embeddedSearchPlaceholder: "提一个结构性问题，例如：鉴权在哪里强制执行？",
  embeddedSearchCta: "检索图谱",
};
