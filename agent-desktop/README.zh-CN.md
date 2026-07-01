<p align="center">
  <img width="360" alt="Cubecloud" src="build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agent Desktop — 二进制文件

> **这是桌面二进制文件的安装与功能文档。** agentic-OS monorepo 的 README 位于
> [`../README.md`](../README.md)；关于“这是什么、为什么是这样、下一步看哪里”的总索引位于
> [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)。

Cubecloud Agent Desktop 是一个原生 Electron 桌面应用，为单个操作者提供统一的控制面板，用于管理**运行时选择**、**提供者选择**、**技能**、**记忆**、**计划任务**和**可选的代码智能**——而不会将工作流绑定到托管包装层或单一供应商 CLI。

**最新版本：[v2.10.73](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73)** —
MCP 注册表大修：Firecrawl 替换 Tavily（无密钥额度，可自托管），
新增 SkillSpector 和 OpenKnowledge，Qdrant 默认使用本地 Docker（无需 API 密钥）。

## 用户可见内容

- 首次启动时的**多运行时选择器** — Hermes（默认，端口 8642）、IronClaw（网关交接，端口 3231）和 OpenClaw（可选，端口 18789）。运行时选择与提供者选择是相互独立的决策。
- **提供者层** — 与本地提供者（Ollama、LM Studio、vLLM、llama.cpp、任何 OpenAI 兼容端点）和远程 API（OpenAI、Anthropic、Google Gemini、Azure OpenAI、OpenRouter，以及操作者自己的网关）通信。
- **模型页面** — 扫描 `127.0.0.1` 上的运行中本地服务器，并以单击方式提供 Ollama / LM Studio 建议，每张卡片带 30 秒探测间隔的健康点。
- **对话界面** — 支持 SSE 流式传输、Markdown 渲染、语法高亮和令牌用量显示。
- **会话管理** — 全文搜索（SQLite FTS5）、按日期分组的历史记录、跨对话恢复与搜索。
- **配置文件切换** — 每个配置文件的提供者、会话和状态相互隔离。
- **Sandbox Tasks 屏幕**（V2.10.65）— 用于 IronClaw WASM 沙盒工作流。
- **可选 sidecar** — CodeGraph（语义代码智能）、EverOS（记忆 + harness）、Headroom（上下文压缩）— 全部由用户主动启用，不会静默安装。
- **技能、记忆、计划任务、看板和方案** 面板 — 由用户控制的、可检视的 JSON 注册表支持。
- **自动更新** — 通过 `electron-updater` 指向本仓库的 GitHub Releases feed。
- **国际化** — 通过 i18next 支持 9 种语言环境。

## 预览

每张图片均为当前桌面构建的全页截图。画廊涵盖首次启动、运行时发现以及侧边栏中暴露的每个主要操作者界面。

<table>
<tr>
<td width="50%" align="center"><b>欢迎 &amp; 首次启动</b><br/><img width="100%" alt="欢迎" src="previews/welcome.png" /></td>
<td width="50%" align="center"><b>远程网关接入</b><br/><img width="100%" alt="远程网关" src="previews/welcome-remote.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>SSH 隧道交接</b><br/><img width="100%" alt="SSH 交接" src="previews/welcome-ssh.png" /></td>
<td width="50%" align="center"><b>运行时检测</b><br/><img width="100%" alt="运行时检测" src="previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>对话（SSE 流式）</b><br/><img width="100%" alt="对话" src="previews/chat.png" /></td>
<td width="50%" align="center"><b>会话（SQLite FTS5）</b><br/><img width="100%" alt="会话" src="previews/sessions.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>配置文件</b><br/><img width="100%" alt="配置文件" src="previews/agents.png" /></td>
<td width="50%" align="center"><b>角色（遗留）</b><br/><img width="100%" alt="角色" src="previews/persona.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>方案</b><br/><img width="100%" alt="方案" src="previews/plans.png" /></td>
<td width="50%" align="center"><b>CodeGraph（可选 sidecar）</b><br/><img width="100%" alt="CodeGraph" src="previews/codegraph.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>EverOS（可选 sidecar）</b><br/><img width="100%" alt="EverOS" src="previews/everos.png" /></td>
<td width="50%" align="center"><b>Headroom（可选 sidecar）</b><br/><img width="100%" alt="Headroom" src="previews/headroom.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>模型（Ollama + LM Studio 扫描）</b><br/><img width="100%" alt="模型" src="previews/models.png" /></td>
<td width="50%" align="center"><b>提供者</b><br/><img width="100%" alt="提供者" src="previews/providers.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>技能</b><br/><img width="100%" alt="技能" src="previews/skills.png" /></td>
<td width="50%" align="center"><b>记忆</b><br/><img width="100%" alt="记忆" src="previews/memory.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>工具</b><br/><img width="100%" alt="工具" src="previews/tools.png" /></td>
<td width="50%" align="center"><b>工作区</b><br/><img width="100%" alt="工作区" src="previews/workspace.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>计划任务</b><br/><img width="100%" alt="计划任务" src="previews/schedules.png" /></td>
<td width="50%" align="center"><b>网关</b><br/><img width="100%" alt="网关" src="previews/gateway.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>MCP</b><br/><img width="100%" alt="MCP" src="previews/mcp.png" /></td>
<td width="50%" align="center"><b>设置</b><br/><img width="100%" alt="设置" src="previews/settings.png" /></td>
</tr>
</table>

## Skills 生态 —— 3 层划分

Skills 表面来自三个相互独立的技能树，各有不同的生命周期。三者之间**不存在重复**——它们面向不同的受众、解决不同的问题。

### 第 1 层 —— 桌面内置（{{SKILLS_TOTAL}} 个技能，随 asar 打包发布）

这些是首次启动后可在 **Skills → Browse** 标签页看到的技能。它们位于打包后二进制内的 `agent-desktop/.agents/skills/<name>/SKILL.md`，因此从用户安装桌面的那一刻起，就可以在离线状态下使用。

**5 个新增的运维导向技能（V2.10.71）：**

| 技能 | 何时应使用 |
|---|---|
| `first-5-minutes` | "我是新手"、"从哪里开始"、"刚装好" —— 引导完成选择运行时、挂载提供者、跑通第一次对话 |
| `runtime-attach` | "运行时连不上"、"ECONNREFUSED 127.0.0.1:8642" —— attach 失败时排查的 5 件事（Hermes / IronClaw / OpenClaw） |
| `models-page-scan` | "Models 页面看不到我的 Ollama"、"健康指示灯是红的" —— 回环扫描、健康探针、LAN 显式启用 |
| `sidecar-setup` | "怎么装 CodeGraph / EverOS / Headroom" —— 3 个可选 sidecar，每个 profile 独立启用 |
| `session-search` | "找到我关于 X 的对话"、"搜索历史会话" —— SQLite FTS5 模式，能做什么、不能做什么 |

**23 个已有技能（沿袭自运行时集成）：**

| 类别 | 技能 |
|---|---|
| 运行时模式 | `hermes-agent`、`hermes-imports`、`openclaw-persona-forge` |
| 工程实践 | `karpathy-guidelines`、`careful`、`continuous-learning-v2`、`learn`、`eval-harness`、`freeze` |
| Electron 专属 | `electron-pro`、`windows-desktop-e2e` |
| 设计与质量 | `design-taste-frontend` |
| 工作流 | `plan-tune`、`wiki-conventions`、`kanban-task-shape`、`diff-overlay-writer` |
| 元调度 | `agent-harness-construction`、`autonomous-agent-harness`、`agentic-engineering` |
| 工具 | `markitdown-mcp`、`office-hours`、`investigate` |

用户可以一键安装任意一项。5 个新增的运维导向技能会在 Browse 标签页上用 `source: "bundled-desktop"` 以及 frontmatter 中的 `source: "cubecloud"` 标记出来，方便运维区分哪些是为桌面写的、哪些是从上游适配的。

### 第 2 层 —— Hermes 内置（安装运行时后引入）

当 Hermes 运行时被安装（首次启动的本地安装）后，桌面会发现在 hermes-agent 仓库内随发行版一起发布的技能，路径为 `<HERMES_REPO>/skills/<category>/<name>/SKILL.md`。它们会与桌面内置的条目一起出现在 Skills → Browse 标签页，标记为 `source: "bundled"`。数量随 Hermes 版本变化；运行时安装完成后通常会有 100+ 条。

### 第 3 层 —— Monorepo 开发者态（{{SKILLS_TOTAL}} 个技能，仅源码）

仓库根的 `.agents/skills/` 目录保存了 {{SKILLS_TOTAL}} 个从 {{SKILLS_REPOS}} 上游仓库适配而来的技能。这些**不会随二进制一起发布**——它们存在于源码树中，供在本 monorepo 内运行 Copilot / Claude Code / 其他 agent 的贡献者使用。桌面看不到它们；它们面向贡献者，而非终端用户。

每个技能的完整明细见 monorepo README 的 ["What ships in this repo"](../README.md#what-ships-in-this-repo)。

## 安装

最新的稳定安装包是 **v2.10.73**，发布地址：
<https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73>。
较早的版本列于
[Releases 页面](https://github.com/JZKK720/cubecloud-agentic-os/releases)。
v0.6.0 和 v0.6.1 已被标记为预发布版本，因为它们是从现已退役的 `apps/desktop-shell/` wrapper 树构建的；**请使用 v2.10.73 或更新版本**。

### Windows

从
[v2.10.73 发布](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73)
下载 `cubecloud-agent-desktop-2.10.73-setup.exe` 并运行。NSIS 安装程序为每用户一键安装，会在 Windows“程序和功能”中注册 `cubecloud-agent-desktop`。

> **Windows 用户提示：** 安装程序未进行代码签名。Windows SmartScreen 在首次启动时会发出警告——点击**更多信息**→**仍要运行**。代码签名是已知的跟进项；OEM 构建路径（含企业证书）详见
> [`../docs/legal/COMMERCIAL_LICENSE.md`](../docs/legal/COMMERCIAL_LICENSE.md)。

若不需要安装程序，也可以下载 `cubecloud-agent-desktop-2.10.73-portable.exe` — 单文件便携版，无需安装步骤。

### macOS / Linux

`electron-builder` 可以生成 macOS（`.dmg`）和 Linux（`.deb`、`.rpm`、`.AppImage`、`.snap`）目标，但本仓库的 CI 构建流水线目前只发布 Windows 产物。多平台 CI 是跟进项，需要在仓库设置中配置 App Store Connect、代码签名和 Linux 应用商店凭据。

## 工作原理

首次启动时，应用会：

1. 询问是在**本地**运行智能体（桌面在 `127.0.0.1:<port>` 上启动运行时）、通过 HTTPS 连接到**远程**网关，还是通过 SSH 隧道进行**SSH 转发**。
2. **本地模式：** 检查所选运行时是否已在运行；若未运行，则执行官方安装程序，进行依赖解析与进度跟踪。
3. **远程 / SSH 模式：** 提示输入网关 URL，通过 HTTPS 验证 `/v1/models` 端点，并跳过本地安装。
4. 提示输入**提供者**（本地模型端点或远程 API），并将凭据存储于每配置文件的凭据池中。
5. 设置完成后启动主工作区。

在本地模式下，对话请求通过 SSE 流式传输走 `http://127.0.0.1:8642`（Hermes）或 `http://127.0.0.1:3231`（IronClaw）。在远程模式下，应用以同样的流式协议与配置的远程 URL 通信。渲染端实时解析流，呈现工具进度、Markdown 内容和令牌用量。

## 支持的运行时与提供者

### 运行时提供者（3 个）

| 运行时 | 角色 | 默认端口 | 集成模式 |
|---|---|---|---|
| **Hermes** | 默认核心运行时 | 8642 | `native-core` |
| **IronClaw** | WASM 沙盒网关交接通道 | 3231 | `optional-bridge` |
| **OpenClaw** | 可选未来通道 | 18789 | `optional-runtime` |

Hermes 与 IronClaw 是当前通道。OpenClaw 已接入运行时选择器，但作为可选接入目标提供。

### 提供者类型（环回与远程）

- **本地 / 环回：** Ollama、LM Studio、vLLM、llama.cpp，以及用户在 `127.0.0.1` 上运行的任何其他 OpenAI 兼容端点。模型页面（V2.10.60）会扫描这些端点并以单击方式给出建议。
- **远程（HTTPS）：** OpenAI、Anthropic、Google Gemini、Azure OpenAI、OpenRouter，以及操作者配置的任何其他 OpenAI 兼容 API。

本地服务器发现默认仅限环回；LAN 主机需通过渲染端 `scanLocalServers` 调用的 `extraHosts` 参数显式启用。

## 可选 sidecar（由用户主动启用，不内置）

- **CodeGraph**（`pip install codegraph` + `codegraph init`）— 语义代码智能路径。详见
  [`../docs/CODEGRAPH-RUNTIME.md`](../docs/CODEGRAPH-RUNTIME.md)。
- **EverOS**（`pip install everos`）— 记忆 + harness sidecar。详见
  [`../docs/EVEROS-SIDECAR.md`](../docs/EVEROS-SIDECAR.md)。
- **Headroom**（`pip install headroom-ai`）— 上下文压缩代理。详见
  [`../docs/agent-skills-bundle/HEADROOM.md`](../docs/agent-skills-bundle/HEADROOM.md)
  及仓库内置的工作流技能
  [`../.github/skills/headroom-workflow/`](../.github/skills/headroom-workflow/)。

以上均为可选。桌面在没有任何 sidecar 的情况下完全可用；集成按用户粒度启用。

## 开发

### 环境要求

- Node.js 22（与 `.github/workflows/ci.yml` 中固定的版本一致）
- npm 10+（随 Node 22 附带）
- Windows 10/11 — NSIS / 便携版构建目标
- 类 Unix shell — 开发模式（macOS、Linux、WSL 上均可）

### 安装依赖

```bash
cd agent-desktop
npm install
```

安装会填充 `agent-desktop/node_modules/`，包含桌面运行所需的 930 个运行时包。这是**独立安装** — monorepo 根不管理桌面的 `node_modules/`。

### 开发模式启动

```bash
cd agent-desktop
npm run dev
```

`electron-vite dev` 启动带热更新的 Vite 渲染端、带自动重启的 Electron 主进程，以及 preload 桥。

### 运行聚焦测试套件

```bash
cd agent-desktop
npm run test
```

完整套件约 95 个 Vitest 文件。CI 运行发布把关的 3 个聚焦测试（`App.gateway.dom.test.tsx`、`App.kanban.dom.test.tsx`、`runtimeSessions.test.ts`）。

### 构建 Windows 安装包

```bash
cd agent-desktop
npm run build:win
```

`electron-builder` 会在 `agent-desktop/dist/` 下生成 NSIS 安装包和便携版可执行文件。需要 Windows。

### 校验打包后的 asar

```bash
cd agent-desktop
npm run verify:bundle
```

运行 `release-bundle.test.ts` 套件，断言 asar 包含预期的 `node_modules/`、`out/main/index.js` 与 `out/preload/index.js` 条目，且存在 `BrowserWindow` / `createWindow` / `whenReady` 引用。

## 下一步看哪里

- **agentic-OS monorepo README** — [`../README.md`](../README.md)
- **总手册** — [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)（一屏总览）
- **长篇分主题深入文档** — [`../docs/handbook/`](../docs/handbook/)（架构、开发、运维）
- **许可证 / 品牌** — [`../LICENSE`](../LICENSE) 与 [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
- **活跃 / 暂存 / 镜像索引** — [`../docs/RETIRED_AND_LEGACY.md`](../docs/RETIRED_AND_LEGACY.md)
- **技能生态** — [`../.agents/skills/README.md`](../.agents/skills/README.md)（{{SKILLS_UPSTREAM}} 个技能，镜像至 `~/.agents/skills/`）
- **运行时编排深入文档** — [`../docs/handbook/ARCHITECTURE.md`](../docs/handbook/ARCHITECTURE.md#runtime-orchestration-deep)
- **Hermes / IronClaw / OpenClaw 接入 smoke** — [`../docs/hermes-agent-attach.smoke.md`](../docs/hermes-agent-attach.smoke.md) 与 [`../docs/ironclaw-attach.smoke.md`](../docs/ironclaw-attach.smoke.md)

## 许可证

Cubecloud 原创工作以 **AGPL-3.0-or-later、Apache-2.0 或 MIT** 三选一方式授权。承载 Cubecloud 原创模块的继承自 `hermes-desktop` 的框架代码保持强 MIT 许可。逐路径拆分与逐版本过渡历史见 [`../LICENSE`](../LICENSE) 与 [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)。
