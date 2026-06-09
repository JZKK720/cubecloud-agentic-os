# 开发指�?
> **主手册（`docs/HANDBOOK.md` §8）的配套长文�?* 主手册给你的是一屏式摘要；本页给你的是一份更完整的开发者操作指南�?
## 前置条件

- **Node.js 20+**（建议使�?LTS）。如果使�?nvm，可执行 `nvm use 20`�?- **pnpm**（首选）�?**npm**。仓库锁文件�?`package-lock.json`；pnpm �?npm 都能读取它，�?pnpm 更快�?- **Python 3.11+** �?**uv**（仅在你要运�?`ar-autoresearch/harness` 参考代码时需要；桌面端运行本身不依赖 Python）�?- **Git 2.30+**�?- 一个本地或远程 agent 运行时（默认�?Hermes；见下方“运行时设置”）�?- 一个本地或远程模型端点（Ollama、vLLM、llama.cpp，或任何 OpenAI-compatible API）�?
## 首次设置

```bash
# 克隆
git clone https://github.com/cubecloud-contributors/cubecloud-agentic-os
cd cubecloud-agentic-os/agent-desktop

# 安装 JS 依赖
npm ci   # �? pnpm install --frozen-lockfile

# 可选：安装 autoresearch Python harness 依赖
# 只有在你要在本机运行 autoresearch loop 时才需要�?# 对桌面端的构建、运行或发布不是必需�?cd .agents/skills/ar-autoresearch/harness
uv sync
cd ../../..

# Lint + typecheck + test
npm run lint
npm run typecheck
npm run test
```

## 运行模式

### 开发模式（Vite + Electron，热重载�?
```bash
npm run dev
```

该命令会�?renderer 启动 Vite，编�?main �?preload，并启动 Electron 指向开发构建。Renderer 的改动会热重载；main / preload 的改动会重启 Electron�?
### �?CDP 的开发模式（�?smoke scripts 使用�?
```bash
npm run dev:cdp
```

该模式会�?9229 端口启用 Chrome DevTools Protocol，以�?`scripts/capture-*.js` �?`scripts/verify-*.js` 连接�?*只能在开发环境中使用**；不要将 CDP 暴露到公共网络�?
### 构建（生产资源，不打安装器）

```bash
npm run build
```

输出�?`dist/`。该输出可以直接运行；安装器需要单独构建�?
### 打包（electron-builder 安装器）

```bash
npm run package:win     # Windows MSI
npm run package:linux   # Fedora RPM（以及如果已配置则输�?Debian .deb�?npm run package:mac     # macOS DMG
```

## 项目布局

```
agent-desktop/
├── .agents/skills/              # 技能层�?4 技�?+ autoresearch harness�?�?  ├── README.md                # 顶层技能索引与决策�?�?  ├── ar-autoresearch/         # 唯一一个带可运行代�?harness 的技�?�?  ├── po-*/                    # poskills 改编
�?  ├── ecc-*/                   # ECC 改编
�?  ├── gbrain-*/                # gbrain 改编
�?  ├── gstack-*/                # gstack 改编
�?  └── karpathy-guidelines/     # 四项原则
├── apps/
�?  └── desktop-shell/           # Cubecloud 原创状态层（SQLite + dispatch�?├── build/
�?  ├── branding/                # Cubecloud 品牌资产（logos、marks�?�?  ├── entitlements.mac.plist   # macOS entitlements
�?  ├── afterPack.js             # 打包后钩�?�?  └── icon.*                   # 二进制应用图标（Cubecloud 自有源图仍待补齐�?├── changelogs/                  # 每个版本�?changelog
├── dist/                        # 构建输出（gitignored�?├── docs/                        # 架构 + 法律 + 规范
�?  ├── HANDBOOK.md              # 主索引（仓库中的总入口）
�?  ├── handbook/                # 长文配套�?�?  ├── legal/                   # Cubecloud 法律文档（EULA、trademark 等）
�?  ├── superpowers/specs/       # V2.x 波次的设计规�?�?  └── *.md                     # 架构文档（CodeGraph、EverOS、runtime plan�?├── electron.vite.config.ts      # electron-vite 构建配置
├── licenses/                    # vendored 的上游许可证文本
├── out/                         # 构建输出（gitignored�?├── previews/                    # 预览截图（应�?Cubecloud 源素材重新生成）
├── resources/                   # 随二进制打包的静态资�?├── scripts/                     # 基于 CDP �?smoke + capture 脚本
├── src/
�?  ├── main/                    # 主进程（Node 20 target�?�?  �?  ├── index.ts             # 入口；注�?IPC 通道
�?  �?  ├── codegraph.ts         # CodeGraph CLI 子进�?�?  �?  ├── codegraph-runtime.ts # CodeGraph 嵌入�?SDK（Cubecloud 原创�?�?  �?  ├── everos-sidecar.ts    # EverOS 生命周期（Cubecloud 原创�?�?  �?  ├── hermes-runtime/      # Hermes 编排
�?  �?  ├── openclaw/            # OpenClaw 编排（V2.6+�?�?  �?  ├── ironclaw/            # IronClaw 编排（V2.6+�?�?  �?  └── skills-harness.ts    # Skills 解析器（Cubecloud 原创�?�?  ├── preload/                 # Preload 进程（contextBridge 表面�?�?  �?  └── index.ts             # �?IPC bridge
�?  └── renderer/                # Renderer（React 19 + i18next�?�?      └── src/                 # 各个界面
├── tests/                       # Vitest 测试
├── ACKNOWLEDGMENTS.md           # 可读的上游致�?├── BRANDING_AND_LICENSE.md      # 许可 + 品牌历史
├── CONTRIBUTING.md              # DCO 1.1 贡献条款
├── LICENSE                      # 双许可说�?├── NOTICE                       # 符合 REUSE 的归属目�?├── README.md                    # README（英文）
├── README.zh-CN.md              # README（简体中文）
├── README.ja-JP.md              # README（日本語�?├── SECURITY.md                  # 安全政策
└── THREAT_MODEL.md              # 工作中的威胁模型
```

## 编码规范

完整规范见通用编码标准技�?[`.agents/skills/ecc-coding-standards/SKILL.md`](../../.agents/skills/ecc-coding-standards/SKILL.md)。桌面端特定的重点如下：

- **TypeScript strict** —�?�?`tsconfig.json` 与两个派�?tsconfig 中均启用 `strict: true`。API 边界禁止 `any`；使�?`unknown` 后再缩窄�?- **React 19 函数组件** —�?不使�?class component，仅使用 hooks�?- **i18n-first** —�?所有面向用户的字符串都必须经过 `i18next`。JSX 中不应出现硬编码英文�?- **SPDX �?* —�?每个 Cubecloud-original 文件都带�?`SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`。继承框架文件为 MIT，不需要头�?- **不做顺手重构** —�?每次修改聚焦于用户明确要求的事情。纯格式化改动应放到单独 commit�?- **不顺手重排无关代�?* —�?保持现有风格，即便你自己会写得不同�?
## 边界在哪里（从主手册重复强调�?
- **信任边界** —�?本地用户。agent 运行时运行在用户上下文中；renderer �?Electron 标准隔离机制沙箱化；IPC 通道显式且不可猜测�?- **许可边界** —�?继承框架代码（MIT，不可追溯收紧）�?Cubecloud-original 工作（双许可，AGPL-3.0-or-later 为主）。`BRANDING_AND_LICENSE.md` �?`LICENSE` 是具有约束力的文档�?- **品牌边界** —�?Cubecloud 商标�?All-rights-reserved。`docs/legal/TRADEMARK_POLICY.md` 是具有约束力的文档�?- **进程边界** —�?main process、preload、renderer，以及（可选的）EverOS sidecar 进程�?
## 按任务划分的工作�?
### 添加一个新�?IPC 通道

1. �?`src/main/<topic>.ts` 中添�?handler�?2. �?`src/main/index.ts` 中通过 `ipcMain.handle('topic:verb', ...)` 注册�?3. �?`src/preload/index.ts` 中通过 `contextBridge.exposeInMainWorld('api', { topicVerb: (...) => ipcRenderer.invoke('topic:verb', ...) })` 暴露�?4. �?renderer 中通过暴露出来�?API 调用�?5. �?`tests/` 中添加测试�?6. 更新 `docs/handbook/ARCHITECTURE.md` �?“IPC surface�?小节，让后续贡献者知道这个通道存在�?
### 添加一个新的界�?
1. �?`src/renderer/src/screens/<screen-name>/` 中创建界面组件�?2. 将路由加�?renderer 的路由器�?3. �?i18n key 加入英文 locale（如果可以，也补充翻�?locale）�?4. 按上面的流程添加任何�?IPC 通道�?5. �?`scripts/` 下添加一�?`capture-<screen-name>.js` 预览截图脚本（基�?CDP）�?6. 如果该界面是主要表面，更�?`docs/HANDBOOK.md`�?
### 添加一个新�?Cubecloud-original 文件

1. 在文件顶部加�?SPDX 头：
   ```
   // SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
   ```
2. 如果文件�?TypeScript / TSX / JavaScript / Python 源码，加一条简短注释说明上游基础（例�?“Cubecloud-original work (2026); no upstream basis”），方便后续维护者回溯链条�?3. 将该文件加入 `NOTICE` §“Direct dependencies �?Cubecloud-original work”�?4. 如果文件新增了品牌表面（logo、wordmark、splash），则把它加�?`docs/legal/TRADEMARK_POLICY.md`�?
### 添加一个新技�?
1. 运行 [`gbrain-skillify`](../../.agents/skills/gbrain-skillify/SKILL.md) —�?11 轴门禁。多数想法会在这里被否决�?2. 运行 [`ecc-skill-scout`](../../.agents/skills/ecc-skill-scout/SKILL.md) —�?写前检索�?3. 阅读 [`po-write-a-skill`](../../.agents/skills/po-write-a-skill/SKILL.md) 获取作者契约�?4. 编写 SKILL.md�?00 行上限）�?5. �?[`.agents/skills/README.md`](../../.agents/skills/README.md) 增加一行�?6. 镜像�?`~/.agents/skills/`（全局安装流程�?`docs/GLOBAL-INSTALL-PLAN.md`）�?
### 添加新的 smoke / capture 脚本

1. �?`scripts/` 下创建脚本�?2. 在顶部加�?SPDX 头：
   ```js
   // SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)
   ```
3. 脚本应通过 CDP 连接到运行中的桌面端�?229 端口）。惯例形状：`await cdp.connect(9229);`�?4. 如果该脚本应成为发布�?smoke pass 的一部分，把它加�?`scripts/smoke-all.js` 聚合器�?5. 在脚本顶部写一�?docstring，说明它验证什么�?
## 调试

- **主进程日�?* —�?`~/.hermes/logs/gateway.log` 以及每个运行时自己的日志文件。桌面端也会将这些日志拉到应用内 “Console�?界面�?- **渲染器日�?* —�?开发模式下�?DevTools Console 中查看（Ctrl+Shift+I）�?- **Preload 日志** —�?DevTools �?Console 标签页中可看�?Node 20 控制台输出�?- **CDP attach** —�?�?`npm run dev:cdp` 启动桌面端，然后�?Chrome 中打开 `chrome://inspect` 并附加到 `127.0.0.1:9229`�?- **Vitest** —�?`npm run test` 执行单元测试；`npm run test:watch` 进入 watch mode�?- **TypeScript** —�?`npm run typecheck` 做一次性检查；平时依赖编辑器的 TS language server 实时提示�?
## 常见坑点

- **“我加了一�?IPC 通道，但 renderer 看不到它�?* —�?preload bridge（`src/preload/index.ts`）是 renderer 能看见的唯一表面。只�?main 里注�?handler 还不够；你还必须�?preload 中把它暴露出来�?- **“构建成功了，但二进制启动不起来�?* —�?检�?entitlements（macOS 上是 `build/entitlements.mac.plist`）和 auto-updater 通道。桌面端稳定版本使用 `electron-updater`；如果该通道配置错误，自动更新逻辑可能阻塞启动�?- **“技能不会自动激活�?* —�?先检�?frontmatter。`description` 字段�?agent runtime 决定是否加载技能时唯一能看到的内容。如果写得太模糊，技能就会在错误的时候加载（或者永远不加载）�?- **“TypeScript 构建提示缺少类型�?* —�?桌面端的类型和锁文件绑定。运�?`npm ci` 恢复与锁文件一致的依赖；不要在不更新锁文件的情况下直接 `npm install <package>`�?
---

**接下来读什么�?* [`docs/HANDBOOK.md`](../HANDBOOK.md) 是主索引，[`.agents/skills/po-diagnose/`](../../.agents/skills/po-diagnose/SKILL.md) 适合调试流程，[`.agents/skills/po-tdd/`](../../.agents/skills/po-tdd/SKILL.md) 适合测试优先流程，[`.agents/skills/gstack-qa/`](../../.agents/skills/gstack-qa/SKILL.md) 适合发布前质量闸门�?
**Recent updates（V2.6 �?V2.10�?** 本文件上次实质性编辑发生在 V2.4 �?V2.6 品牌/许可波次期间。V2.7（superpowers 技能）、V2.8（description-trim 审计）、V2.9（预启动包，40/40 smoke）以�?V2.10（文档迁移、README 拆分、i18n 清理、previews 清理、provenance cross-link、README Translations pointer）都记录�?[`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) 对应�?`## V2.7 / V2.8 / V2.9 / V2.10` 小节中；每轮变更也都记录�?[`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §“How to confirm a surface is live�?中。V2.10.14 对本文件所做的是补充性尾注，而不是正文重写�?