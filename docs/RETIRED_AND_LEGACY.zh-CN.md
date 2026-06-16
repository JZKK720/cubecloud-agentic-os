# 已退役、遗留与暂存区清单

> **权威来源。** 如果某个目录未在此列出，则它是*活跃*且被跟踪的。
> 如果在此列出，请按照其所在行的指引处理。

本文件的存在是为了回答反复出现的问题："这个目录是退役了还是活跃的？"，
而无需读者从 `package.json` 工作区、`.gitignore` 和 BRANDING_AND_LICENSE
变更日志中反向推导答案。

| 目录 | 路径 | 状态 | 原因 | 操作 |
|---|---|---|---|---|
| Agentic-OS 状态层 + 种子 | `apps/desktop-shell/` | **活跃** | 作为 `@cubecloud/desktop-shell` 工作区接入外层 `package.json`（dev / build / typecheck）。包含 agentic-OS 原创状态层（`agentControlPlane.ts`、`runtimeSessions.ts`、`providerDiscovery.ts`、`hermesLifecycle.ts`）、5 个预启动种子文件（`default*.ts`）以及 5 个 vitest 测试文件。冒烟测试 `prelaunchSeed.smoke.mjs`（40/40）锁定 V2.9 契约。 | 保留。在 README + HANDBOOK 中记录。 |
| 完整 Electron 框架（hermes-desktop 谱系） | `cubecloud-desktop/` | **活跃**（构建目标） | 用户安装的 Electron 应用。包含继承的 hermes-desktop 框架（MIT）、品牌层、渲染器、构建流水线，以及 Cubecloud 原创运行时包装器（`codegraph-runtime.ts`、`everos-sidecar.ts`、`skills-harness.ts`）。不在工作区中；由 `apps/desktop-shell` 的 `npm install` + `npm run build` 在共享 electron-vite 层消费。 | 保留。在 HANDBOOK §3（层级图）中记录。 |
| 预启动包种子（V2.9） | `apps/desktop-shell/src/main/default{Skills,Memories,Harnesses,Schedules,Kanban}.ts` + `prelaunchSeed.test.ts` + `prelaunchSeed.smoke.mjs` | **活跃** | 3 个用户可见技能 + 6 个记忆种子 + 3 个默认禁用的 harness + 1 个默认禁用的计划任务 + 1 个入门看板。由 40/40 冒烟测试锁定。 | 保留。在 HANDBOOK §5.6 中记录。 |
| `.agents/` 技能生态 | `.agents/skills/<name>/SKILL.md`（{{SKILLS_TOTAL}} 个技能，其中 {{SKILLS_UPSTREAM}} 个上游改编） | **活跃** | {{SKILLS_UPSTREAM}} 技能贡献者界面。在开发者机器上镜像到 `~/.agents/skills/`。 | 保留。在 HANDBOOK §5 + `.agents/skills/README.md` 中记录。 |
| 暂存区：克隆的上游仓库 | `.review-extras/` 和 `.review-codegraph/` | **暂存区，不在 git 中** | 在 V2.6 + V2.7 技能导入期间用于研究上游来源的本地克隆。不属于构建的一部分，不被任何活跃代码引用，可随时删除，并在需要时重新克隆。 | 可安全清理本地副本；只有在需要重新研究上游来源时再重新克隆。 |
| 治理文档 | 外层根目录下的 `README.md`、`LICENSE`、`NOTICE`、`BRANDING_AND_LICENSE.md`、`CONTRIBUTING.md`、`ACKNOWLEDGMENTS.md`；外层 `docs/` 下的 `docs/HANDBOOK.md`、`docs/handbook/*`、`docs/legal/*` | **活跃**（真实来源） | 在 V2.10（方案 A）中从 `cubecloud-desktop/` 移至外层根目录。内层镜像通过 `scripts/sync-docs.ps1` 以 Windows 硬链接（文件）和目录连接（目录）的形式重新创建。 | 保留。内层影子自动重新生成。 |
| `cubecloud-desktop/{README,LICENSE,NOTICE,BRANDING_AND_LICENSE,CONTRIBUTING,ACKNOWLEDGMENTS}.md` 和 `cubecloud-desktop/docs/HANDBOOK.md` + `docs/handbook/*` | 内层镜像 | **硬链接**（不作为链接跟踪） | 见上文。这些路径下的 shell 渲染是无管理员权限的镜像，以便 Electron 构建继续在旧位置找到文档。 | 在外层文件编辑后通过 `scripts/sync-docs.ps1` 重新生成。 |

## 为什么保留 `apps/desktop-shell/` 即使 `agent-desktop/` 看起来相似

两者是**互补**的，而非重复。`cubecloud-desktop/` 是带有继承 hermes-desktop 框架的**完整 Electron 应用**。它是渲染器、主进程和构建流水线所在的位置。它**不在**外层 `package.json` 工作区中，因为工作区数组是 `node` 的概念（它告诉 `npm install` 在哪里查找工作区），而内层树是一个带有自己 `node_modules/` 的 vendored 副本。

`apps/desktop-shell/` 是**agentic-OS 原创状态层**，它在继承框架之上重建桌面的*控制面*。`apps/desktop-shell/src/main/` 中的五个 `default*.ts` 种子文件由同一文件夹中的 `agentControlPlane.ts` 读取消费。这些读取由 `cubecloud-desktop/src/main/` 中的 IPC 处理器调用。因此边界是：

- `cubecloud-desktop/src/main/ipc/**` — IPC 桥接（继承框架，MIT）。
- `apps/desktop-shell/src/main/agentControlPlane.ts` — 状态平面（agentic-OS 原创，双许可）。
- `apps/desktop-shell/src/main/default*.ts` — 预启动种子（agentic-OS 原创，双许可）。
- `cubecloud-desktop/src/main/skills-harness.ts` — 技能清单解析器（agentic-OS 原创，双许可）。

消除重复的正确方式**不是**删除两者之一，而是明确边界（本文件所做的），并保持冒烟测试（`apps/desktop-shell/prelaunchSeed.smoke.mjs`，40/40）作为两半之间的契约。

| 目录 | 路径 | 状态 | 原因 | 操作 |
|---|---|---|---|---|
| 外层 agentic-OS 单仓 README | `README.md`（外层根目录） | **活跃**（V2.10.6） | agentic-OS 单仓 README。范围、原则、为什么存在、混合技术能力、智能体效率、我们的不同之处、仓库布局。之前是内层 Electron 应用 README 的硬链接；V2.10.6 过渡打破了硬链接，并针对 agentic-OS 单仓受众重写。 | 保留。内层镜像仍有自己的安装 + 功能 README。 |
| 内层 Electron 二进制 README | `cubecloud-desktop/README.md` | **活跃**（V2.10.6） | Electron 二进制的安装 + 功能 + 提供者文档。之前与外层 README 是同一文件（通过硬链接）。 | 保留。交叉链接到外层 README 和主手册。 |
| 外层 i18n 清单 | `README.i18n.md`（外层根目录） | **活跃**（V2.10.7） | 翻译的唯一真实来源。列出 4 个 i18n 文件及其路径、语言、状态、维护者和翻译工作流。截至 V2.10.7，agentic-OS 单仓 README 仅提供英文；*二进制*内容的社区翻译（即内层 i18n 文件所涵盖的）保留在内层位置。 | 保留。重新翻译由社区驱动，参见 `README.i18n.md` §"V2.10.7 范围之外"。 |
| 内层 i18n 文件（二进制翻译） | `cubecloud-desktop/README.ja-JP.md`、`cubecloud-desktop/README.zh-CN.md`、`cubecloud-desktop/CONTRIBUTING.ja-JP.md`、`cubecloud-desktop/CONTRIBUTING.zh-CN.md` | **活跃，V2.10.31 文案润色** | 二进制日文与简体中文 README / CONTRIBUTING 表面现已完成顶层 Cubecloud 文案清理，安装/预览文案刷新，以及更小的当前截图子集替换。它们仍需要母语者复核，但最明显的跨语言混杂与过时预览引用已经去除。 | 保留。下一步仍是母语者复核。 |
| 外层威胁模型 | `THREAT_MODEL.md`（外层根目录） | **活跃**（V2.10.8） | agentic-OS 单仓 + Electron 二进制的威胁模型。在 V2.4 增补期间于内层位置编写，通过 V2.6 更新以覆盖 CodeGraph + EverOS 表面区域。V2.10.8 将其移至外层根目录；内层位置通过 `scripts/sync-docs.ps1` 重新创建为硬链接（THREAT_MODEL.md 属于 8 文件硬链接集：LICENSE、NOTICE、BRANDING、CONTRIBUTING、ACKNOWLEDGMENTS、THREAT_MODEL、SECURITY、README.i18n）。 | 保留。已兼容 V2.6+；移动时无需内容编辑。 |
| 外层安全策略 | `SECURITY.md`（外层根目录） | **活跃**（V2.10.8） | 安全策略：支持的版本、部署指南、漏洞报告。与 THREAT_MODEL.md 配对（互相交叉引用）。V2.10.8 将其移至外层根目录；内层位置为硬链接。支持的版本表作为发布流程的一部分更新。 | 保留。 |
| 二进制预览截图（刷新后的子集） | `cubecloud-desktop/previews/{welcome,chat,gateway,runtime-detection}.png` | **活跃，V2.10.30**（刷新后的子集） | 二进制 README 现已改为引用一组更小、更新的 Cubecloud 品牌截图：初始设置、聊天、网关与运行时发现。旧的继承预览图库已从 README 表面退役，未再引用的文件可在本地安全删除。 | 保留这组刷新后的子集；在确认没有文档再引用旧文件后删除其余预览图。 |
| 二进制图标集 | `cubecloud-desktop/build/icon.{png,ico,icns}`、`cubecloud-desktop/resources/icon.png`、`cubecloud-desktop/src/renderer/src/assets/icon.png` | **活跃，V2.10.31**（基于当前 Cubecloud 标记重新生成） | 打包图标资源已基于当前 Cubecloud 光栅标记重新生成，使桌面构建资源、打包资源以及 renderer 图标副本重新保持一致。 | 保留。当品牌标记变化时，基于当前 Cubecloud 标记重新生成。 |
| 遗留法律文档交叉链接 | `docs/legal/PROVENANCE_TRACKER.md` → `docs/legal/TRADEMARK_POLICY.md` | **活跃 + 已交叉链接**（V2.10.11） | `PROVENANCE_TRACKER.md` 是工程路径族谱分类账（`docs/legal/**`、`previews/**`、`src/renderer/**` 等的状态）；V2.10.11 添加了"相关策略"部分，引导读者查看 `TRADEMARK_POLICY.md`（自 V2.5 以来的操作性品牌策略）。无规则变更。 |
| 外层单仓 README i18n 指针 | `README.md`（外层根目录） | **活跃 + 指针**（V2.10.12） | 在外层单仓 README 中添加了 1 段 `## Translations` 部分，指向 `README.i18n.md`（V2.10.7 清单）。清单未更改；README 是指针。无规则变更，无文件添加。 |
| 内层 CONTRIBUTING 交叉链接 | `CONTRIBUTING.md`（外层 + 内层） | **硬链接，无变更**（V2.10.13 无操作） | V2.10.12 收尾将其列为候选，但 `fsutil hardlink list` 显示外层 + 内层 `CONTRIBUTING.md` 是同一个 Windows 硬链接（8,935 字节，17 个标题）。共享文件已涵盖 DCO、i18n 策略、许可证、社区、漏洞报告和致谢——因此"缺失交叉链接"的差距是误报。V2.10.13 是故意的无操作；此行记录该决定，以便未来的维护者不会重新标记。 |
| `docs/handbook/` 刷新 | `docs/handbook/{ARCHITECTURE,DEVELOPMENT,OPERATIONS,README}.md` | **活跃 + V2.10.14 尾部指针**（增量，非重写） | 在 4 个外层手册文件的每个末尾添加了 1 段"**近期更新（V2.6 — V2.10）。**"，指向 BRANDING_AND_LICENSE.md 和 RETIRED_AND_LEGACY.md。无内容重写，无硬链接破坏，无源代码变更。这 4 个文件已兼容 V2.6；差距在于缺少 V2.7-V2.10 过渡指针，而非内容过时。 |
| 外层单仓 README i18n 占位 | `README.ja-JP.md`、`README.zh-CN.md`、`README.ko-KR.md`（外层根目录） | **活跃 + 占位，V2.10.15**（3 个新文件 + 清单更新） | 在外层根目录添加了 3 个占位文件，以便非英语读者在发现内层二进制翻译之前看到"你的语言也有这个"。每个文件是 1 段占位（非翻译）；母语者可以 fork + 翻译 + 按照 `README.i18n.md` 工作流提交 PR。韩语（`ko-KR`）是该语言首次出现在清单中（内层尚无 `ko-KR` 文件）。`README.i18n.md` 表已更新，添加了 4 行（英文单仓 + 3 个占位行）和韩语条目。 |
| i18n 清理（占位退役 + zh-CN 发布） | `README.zh-CN.md`（外层根目录，新增）；`README.ja-JP.md` + `README.ko-KR.md`（外层根目录，已删除） | **活跃，V2.10.16**（1 个新文件，2 个已删除，清单已更新） | 删除了 3 个 V2.10.15 占位文件（这些是 1 段英文元注释，对非英语读者造成困惑）。发布了外层 README 的真实简体中文翻译 `README.zh-CN.md`。4 个内层 CJK 文件已逐字节审计，确认为真实的 UTF-8 社区翻译（非乱码——那是 PowerShell 显示损坏）；已保留。清单已更新，标记外层 zh-CN 为活跃，外层 ja-JP + ko-KR 为"尚未翻译"。 |
| 外层单仓 CONTRIBUTING.zh-CN.md | `CONTRIBUTING.zh-CN.md`（外层根目录，新增） | **活跃，V2.10.17**（1 个新文件 + 清单更新） | 外层 `CONTRIBUTING.md` 的简体中文翻译。外层 + 内层 `CONTRIBUTING.md` 仍是同一硬链接（V2.10.13），但 `.zh-CN.md` 同级文件是独立的。涵盖单仓视角：贡献者策略 + DCO + 代码风格 + 社区渠道 + 新的 V2.6+ 技能生态。 |
| 外层单仓 SECURITY.zh-CN.md + fixptbr 退役 | `SECURITY.zh-CN.md`（外层根目录，新增）；`fixptbr.cmd` + `fixptbr.ps1`（外层根目录，已退役） | **活跃，V2.10.18**（1 个新文件，2 个已退役，清单已更新） | 外层 `SECURITY.md` 的简体中文翻译。2 个 `fixptbr.*` 文件是用于 pt-PT 乱码修复的一次性工具，该修复已应用（目标文件现为真实 UTF-8）；它们是没有剩余用途的死代码。外层 + 内层 `SECURITY.md` 仍是同一硬链接（V2.10.8）；`.zh-CN.md` 同级文件是独立的。 |
| 外层单仓 THREAT_MODEL.zh-CN.md | `THREAT_MODEL.zh-CN.md`（外层根目录，新增） | **活跃，V2.10.19**（1 个新文件 + 清单更新） | 外层 `THREAT_MODEL.md` 的简体中文翻译。为中国读者完成了**核心 4 个外层单仓文档**：README + CONTRIBUTING + SECURITY + THREAT_MODEL。外层 + 内层 `THREAT_MODEL.md` 仍是同一硬链接（V2.10.8）；`.zh-CN.md` 同级文件是独立的。 |
| 合并 README PDF（英文 + 简体中文） | `docs/Cubecloud-README-en-zh.pdf`（新增，1.3 MB，18 页） | **活跃，V2.10.20**（1 个新文件 + 1 个新脚本） | 将外层 `README.md`（英文）和 `README.zh-CN.md`（简体中文）合并为单个 PDF，通过无头 Google Chrome 的 `--print-to-pdf` 渲染。内置最小化 Markdown → HTML 转换器（无 npm 依赖）。章节之间有 `page-break-before: always` 的分隔页。中间 HTML 写入 `.review-extras/pdf-build/combined.html`（暂存区）。作为发布产物跟踪；团队如不需要可以 `gitignore`。 |
| 翻译修正 + PDF 重新渲染 | `README.md`、`README.zh-CN.md`、`README.i18n.md`、`docs/Cubecloud-README-en-zh.pdf` | **活跃，V2.10.21**（3 个文件修正 + 1 个产物刷新） | 修正了 `README.md` 中过时的英文 `## Translations` 策略，重写了 `README.i18n.md` 以反映外层单仓翻译 vs. 内层二进制翻译，修复了 `README.zh-CN.md` 中明显的机器翻译痕迹，并重新渲染了合并的英文 + 中文 PDF，使产物与修正后的源文档匹配。 |
| 主手册修复 + HANDBOOK.zh-CN.md | `docs/HANDBOOK.md`（已修复），`docs/HANDBOOK.zh-CN.md`（新增） | **活跃，V2.10.24**（1 个源修复 + 1 个新翻译 + 清单更新） | 修复了主手册中的真实乱码并恢复了错位的 §5.4 块，然后添加了主手册索引的简体中文翻译。这使得手册层成为有效的英文源加上可发现的中文索引，为翻译 `docs/handbook/` 下的 4 个更深文档做准备。 |
| 手册 zh-CN 叶子文档波次 | `docs/handbook/{README,ARCHITECTURE,DEVELOPMENT,OPERATIONS}.zh-CN.md`（新增） | **活跃，V2.10.25**（4 个新文件 + 清单连接） | 为 4 个长篇手册叶子文档添加了简体中文翻译，并将其连接到 `docs/HANDBOOK.zh-CN.md`、`README.i18n.md` 和顶层 README 翻译指针中。与 V2.10.24 的 `docs/HANDBOOK.zh-CN.md` 一起，完成了 zh-CN 手册层。 |
| README 价值框架刷新 + PDF 重新渲染 | `README.md`、`README.zh-CN.md`、`docs/Cubecloud-README-en-zh.pdf` | **活跃，V2.10.22**（2 个文件优化 + 1 个产物刷新） | 在英文和中文 README 中添加了新章节，解释本地优先 AI 的确定性知识价值、技术杠杆、效率价值和财务价值。新措辞还使 BYOK-vs-本地优先的成本论点更加明确。重新渲染了合并的英文 + 中文 PDF，使产物与刷新后的源文档匹配。 |
| PDF 渲染器清理 | `scripts/v2.10.20-readme-combined-pdf.cjs`、`docs/Cubecloud-README-en-zh.pdf` | **活跃，V2.10.23**（1 个脚本清理 + 1 个产物刷新） | 修复了 PDF 布局问题的实际根源：自定义 Markdown 转换器生成的有效 HTML。渲染器现在保留原始 HTML 块、连接换行段落、正确处理有序/无序列表、收集完整表格体，并使用统一的 CJK 兼容字体栈和显式打印边距。修复后重新渲染了 PDF。 |
| 完整 README 重写 + PDF 重新渲染 | `README.md`、`README.zh-CN.md`、`README.i18n.md`、`docs/Cubecloud-README-en-zh.pdf` | **活跃，V2.10.26**（3 个文档重写 + 1 个产物刷新） | 从头到尾重写了外层 README，具有更具商业吸引力的开篇、更清晰的本地优先经济学、更鲜明的竞品定位、更清晰的分节顺序和更紧凑的生产就绪叙事。将外层中文 README 同步到新结构，更新了翻译清单，重新渲染了合并 PDF，并修复了外层 README 徽标路径指向已跟踪的 Cubecloud 品牌资产。 |
| zh-CN README 编辑润色 + PDF 重新渲染 | `README.zh-CN.md`、`README.i18n.md`、`docs/Cubecloud-README-en-zh.pdf` | **活跃，V2.10.27**（1 个文档润色 + 1 个清单更新 + 1 个产物刷新） | 润色了简体中文单仓 README，使其读起来不像英文重写的字面同步：收紧商业/价值框架，规范化了若干音译术语，改进了市场定位和生产就绪措辞，更新了清单以反映编辑润色，并重新渲染了合并 PDF。 |

## 如何确认一个目录是活跃的

一个目录是**活跃**的当且仅当**以下三项全部**为真：

1. 它**不在**外层 `cubecloud-agentic-os/.gitignore`（或活跃树下的任何嵌套 `.gitignore`）中。
2. 它被外层 `package.json` 工作区、构建脚本、测试或已跟踪的文档**引用**。
3. 它在顶层 `README.md`、`docs/HANDBOOK.md` 或本文件中**有记录**。

如果一个目录在 `.gitignore` 中且未被上述任何一项引用，则它是**暂存区**。
如果一个目录是活跃目录的硬链接 / 目录连接 / 构建输出，则它是**遗留 / 镜像**。

如果你发现一个目录不在此表中，请在创建它的同一个 PR 中**将其添加到这里**，
这样下一个读者就不必再问这个问题。
