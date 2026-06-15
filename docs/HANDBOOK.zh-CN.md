# Cubecloud Agent Desktop — 手册

> **一个统一入口，用来回答“这是什么”、“为什么这样设计”，以及“接下来该看哪里”。** 这是项目的主索引。它刻意保持简短。每个部分都链接到更深入的文档，而不是把所有内容重新写一遍。如果某一节开始长到超过一屏，就说明它应该被拆分到 `docs/handbook/<topic>.md`，再从这里链接出去。

---

## 如何阅读本手册

你会从以下三种入口之一来到这里：

1. **你是新贡献者。** 先读 §1 → §2 → §3，再读 §5（“技能层”）来理解工作方式。第一次阅读可以先跳过 §4。
2. **你是评估桌面端的下游用户。** 先读 §1 → §3.1，再读 §10（“许可 / 品牌”）来理解你能如何使用或分发该二进制文件。
3. **你正在做代码审查、安全审查或发布。** 按顺序阅读 §1、§3、§4、§6、§9、§10、§11。发布清单以 §11 中的版本为准。

如果你只有 5 分钟：请读 §1（“这是什么”）、§2（“为什么是这样”）和 §10（“许可 / 品牌”）。其余部分是支撑性说明。

---

## §1. 什么是 Cubecloud Agent Desktop？

它是 [Cubecloud Agentic-OS](https://github.com/cubecloud-contributors/cubecloud-agentic-os) 的一个原生桌面控制中心——也就是这个仓库所在的 agent 操作系统。桌面端把本地或远程 agent 运行时（今天是 Hermes，下一步是 OpenClaw 和 IronClaw）封装进一个统一 GUI，让用户不需要手动操作 CLI。

它是以下能力的**前门**：

- 本地安装的 agent 运行时（当前默认是 Hermes；V2.6 + V2.7 会把 OpenClaw 和 IronClaw 加入为可选运行时）；
- 本地模型端点（Ollama、vLLM、llama.cpp，运行在 loopback）**或者**远程提供者（任何 OpenAI-compatible API）；
- 聊天界面、会话历史、配置档案、persona 编辑器、技能、记忆、工具、计划任务，以及 16 个消息网关；
- 可选的 **CodeGraph** 语义代码智能界面（MCP）以及可选的 **EverOS** sidecar（HTTP，记忆与 harness）；
- 一个由 35 个一等公民级技能组成的**技能层**（`.agents/skills/` 树），使桌面端不仅适合“使用”，也适合“开发”。

它**不**是什么：

- 它**不是**模型服务器。它不托管权重，不执行推理，也不与 Ollama / vLLM / llama.cpp 竞争。它是这些系统的**客户端**。
- 它**不是**纯产品仓库。它是一个 Cubecloud 品牌化的**继任者**，建立在上游框架 `hermes-desktop`（MIT）之上，当前源码树中仍有相当一部分来自该继承框架。关于品牌与法律边界，§10 有明确说明。
- 它**不是**一个仅有 AGPL-3.0 的产品。Cubecloud 原创部分采用双许可（AGPL-3.0-or-later 为主，Apache-2.0 与 MIT 作为兼容选项）；继承框架代码是硬 MIT。详见 `LICENSE` 与 `BRANDING_AND_LICENSE.md`。

## §2. 为什么它会是现在这个样子？

设计由以下三个承诺驱动，按优先级排序：

1. **用户不应该为了使用桌面端而接触 CLI。** 安装、配置、聊天、计划任务、备份、更新——都应该在 GUI 中完成。
2. **用户不应该被锁定到某一个运行时或某一个提供者。** 今天是 Hermes，明天是 OpenClaw / IronClaw；今天是 Ollama、vLLM、llama.cpp、OpenRouter、Azure OpenAI，明天可以更多。
3. **用户不应该被锁定到一个无法使用的许可证上。** Cubecloud 原创部分采用双许可；继承框架保持 MIT；下游使用者应该能选择符合自己组织政策的许可证。

这三个承诺自然带来了三件事：

- 桌面端必须拥有一个**宽 IPC 表面**（`src/main/index.ts`、`src/preload/index.ts`），把运行时、模型注册表、提供者注册表、技能清单、记忆平面、计划任务执行器与网关层暴露给渲染层。这个表面是集成边界，同时也是继承框架中最大的一块。
- 桌面端需要一套**多运行时计划**（`docs/RUNTIME_ORCHESTRATION_PLAN.md`），让 Hermes 是 day-1 主车道，同时在 V2.6 → V2.7 窗口把 OpenClaw / IronClaw 加入为额外车道。V2.4 → V2.5 的品牌与许可梳理，使得第二个运行时的加入不需要重开法律表面。
- 桌面端需要一个**35 技能生态**（`.agents/skills/` 树），让“构建桌面端的人”而不只是“使用桌面端的人”受益。技能层是桌面端与更广阔 agent-runtime 生态之间的桥梁。详见 §5。

## §3. 架构

### 3.1 层级地图

| 层 | 所在位置 | 责任 | 是否已被 Cubecloud 原创替换？ |
|---|---|---|---|
| Electron shell | `src/main/index.ts`, `src/preload/index.ts`, `electron.vite.config.ts` | 启动主进程、挂载渲染器、暴露 preload bridge。 | 继承自 `hermes-desktop`（MIT）。 |
| IPC channel surface | `src/main/ipc/**` | 渲染器可调用的每一个通道的处理器。 | 混合。新通道（CodeGraph、EverOS、skills harness）为 Cubecloud 原创。 |
| Renderer UI | `src/renderer/src/**` | React 19 + i18next，所有界面。 | **Cubecloud 原创重建**，建立在继承框架之上。 |
| State layer | `apps/desktop-shell/src/state/**` | Profiles、sessions、models、providers、skills、memory、tools、schedules、kanban。 | **Cubecloud 原创。** SQLite schema、dispatch 逻辑、kanban board、agent-profile model 都是 Cubecloud 原创。 |
| Runtime orchestration | `src/main/hermes-runtime/**`, `src/main/openclaw/**`, `src/main/ironclaw/**` | 检测、安装、配置并代理每个 agent 运行时。 | 混合。Hermes 是继承的；OpenClaw 与 IronClaw 是 Cubecloud 原创新增。 |
| CodeGraph surface | `src/main/codegraph-runtime.ts`, `src/main/codegraph.ts` | CodeGraph 界面的两种后端：CLI 子进程（继承）与嵌入式 SDK 包装（Cubecloud 原创）。 | 详见 `docs/CODEGRAPH-RUNTIME.md`。 |
| EverOS sidecar | `src/main/everos-sidecar.ts` | 可选 `everos server start` Python sidecar 的生命周期管理器。 | Cubecloud 原创。详见 `docs/EVEROS-SIDECAR.md`。 |
| Skills harness | `src/main/skills-harness.ts` | 解析 agent-runtime 技能层。 | Cubecloud 原创。 |
| Smoke / capture scripts | `scripts/verify-*.js`, `scripts/smoke-all.js`, `scripts/capture-*.js` | 基于 CDP 的 smoke run 和预览截图。 | Cubecloud 原创。 |
| 品牌资产 | `build/branding/cubecloud-*.svg`, `src/renderer/src/assets/cubecloud-*.svg` | logo、mark、wordmark、splash background。 | Cubecloud 原创。保留所有权。详见 `docs/legal/TRADEMARK_POLICY.md`。 |

### 3.2 边界在哪里？

- **信任边界** —— 本地用户。桌面端默认不信任网络；出站调用要么经过 GUI 明确确认，要么被限制在已知的 loopback 端点。`THREAT_MODEL.md` 是具有约束力的文档。
- **许可边界** —— 继承框架代码（MIT，不可追溯收紧）与 Cubecloud 原创工作（双许可，AGPL-3.0-or-later 为主）之间的边界。`BRANDING_AND_LICENSE.md` 与 `LICENSE` 是具有约束力的文档。
- **品牌边界** —— Cubecloud 商标（logo、wordmark、splash、screenshots）是 All-rights-reserved。`docs/legal/TRADEMARK_POLICY.md` 是具有约束力的文档。
- **进程边界** —— main process、preload、renderer，以及（可选的）EverOS sidecar 进程。CodeGraph SDK 运行在进程内，CodeGraph CLI 以子进程方式运行。

### 3.3 双层溯源：如何阅读源代码树

V2.5 之后的许可姿态是**双层结构**：

- **继承的 `hermes-desktop` 框架代码**（承载 Cubecloud 重建的 Electron main / preload / renderer 框架）是硬 MIT，并继续沿用上游 MIT 条款。`LICENSE` 中的框架 carve-out 明确说明了这一点。
- **Cubecloud 原创工作**（重建后的 renderer、state layer、V2.3 模块、SQLite schema、provider-discovery 逻辑、hidden skills harness、smoke / capture 脚本、架构文档）则采用 AGPL-3.0-or-later / Apache-2.0 / MIT 三选一双许可，其中 AGPL-3.0-or-later 为主选项。

Cubecloud 原创源文件带有逐文件 `SPDX-License-Identifier` 头。MIT-only 的继承框架文件不需要 SPDX 头（它们保持 MIT）。

## §4. 运行时编排

桌面端是 agent runtime 的**客户端**，不是运行时本身。运行时编排层负责让这一点成立。

### 4.1 三个运行时

| 运行时 | 状态 | 角色 | 文档 |
|---|---|---|---|
| **Hermes** | Day-1，当前默认 | 主 assistant 运行时。自我改进、技能感知、网关驱动。 | 继承框架；V2.4 + V2.5 增加 Cubecloud 包装层。 |
| **OpenClaw** | V2.6 → V2.7，可选 | 第二 assistant 运行时。OpenAI-compatible HTTP 表面，适合 SSH 隧道。 | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |
| **IronClaw** | V2.6 → V2.7，可选 | 安全优先运行时。WASM 沙箱，工具执行需审批。 | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |

详细编排见 `docs/RUNTIME_ORCHESTRATION_PLAN.md`。核心结论是：Hermes 是 day-1 主车道；OpenClaw 和 IronClaw 被加入为**车道**，供用户从运行时选择器中选择，而不是作为 Hermes 的**替代品**。用户可以在同一台机器上运行多个运行时（Hermes 在 `127.0.0.1:8642` + OpenClaw 在 `127.0.0.1:18789` + IronClaw 在 Docker 发布的端口），桌面端的运行时选择器会把聊天请求路由到正确的运行时。

### 4.2 Provider layer

Provider layer 与 runtime layer 是**分离的**。运行时（Hermes）与提供者（Ollama、vLLM、llama.cpp、OpenAI-compatible remote 等）交互。桌面端暴露：

- **本地 provider discovery** —— Ollama 在 `127.0.0.1:11434`，vLLM 在用户配置的端口，llama.cpp 在用户配置的端口。
- **远程 provider 配置** —— 任何 OpenAI-compatible API，由用户提供 base URL 与 API key。
- **模型注册表** —— 用户可以跨提供者保存、命名和切换模型。

这些本地 provider 的许可证分别是 MIT / Apache-2.0（Ollama MIT、vLLM Apache-2.0、llama.cpp MIT）。桌面端不打包、不发布、不安装任何一个，只消费它们的 HTTP 协议。详见 `NOTICE` §“Interoperated services”。

### 4.3 概念模型：对象 + 动作（V2.10.35）

桌面端的本地表面可以干净地映射到一个小的**对象 + 动作**模型。
这个模型在概念上接近 Palantir Foundry 所说的企业级“本体（Ontology）”，
但**范围被收敛到单个操作者的一张桌面上**：

- **对象（名词）** 是智能体操作的持久化事物。在本仓库中，
  它们是 [`packages/platform-core/src/index.ts`](../../packages/platform-core/src/index.ts)
  里的名词型 TypeScript 接口 —— `AgentSkill`、`AgentMemoryEntry`、`AgentTool`、
  `AgentSchedule`、`AgentProfile`、`AgentModelEndpoint`、`AgentProviderConfig`、
  `EverOsHarness`、`CodeGraphRepoSummary`、`CodeGraphEntrypoint`、
  `CodeGraphQueryTemplate` 等。它们以显式 JSON 注册表的形式持久化、归本地用户掌控，
  而不是托管在工作流引擎里的不透明 blob。
- **动作（动词）** 是智能体对这些对象执行的操作。在本仓库中，它们是
  [`apps/desktop-shell/src/main/agentControlPlane.ts`](../../apps/desktop-shell/src/main/agentControlPlane.ts)
  里的分发流水（`ControlPlaneDispatchRuntimeRequest` / `Result` / `Executor`）、
  计划任务执行（`AgentSchedule.cron + prompt + profile`）、
  CodeGraph 查询应用（`CodeGraphQueryTemplate.mode`），
  以及 `headroom learn --apply` 的复核流。
  `headroom learn --apply` 是仓库里唯一一个完整实现了
  **分支-复核** 闸门的地方：AI 先提出修改提案，
  人类在 UI 上复核，再由“Commit”或“Revert”决定这次修改
  是否真正落到 `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`。
- **操作者范围。** Foundry 的本体是组织的数字孪生；Cubecloud 的本体是一张桌面的数字孪生。
  这是一个有意识的尺度差异，不是缺失功能。同样的名词/动词结构
  可以下放到独立开发者与小型企业操作者身上，而不需要让他们为他们并不需要的
  多租户平台付费。

明确写出这个模型的目的，是让新的贡献者能够把任何未来的特性
映射到“这是一个新对象”或“这是一个新动作”，并把它放到架构中正确的层。
当前实现仍然使用手写的 JSON 注册表；未来某次硬化重构可以把它们
合并成一个强类型的注册表，而不需要改变这份概念契约。

公开的最近参考材料是 Satoshi Yamauchi 的开源书籍
[`palantir-ontology-strategy`](https://github.com/Leading-AI-IO/palantir-ontology-strategy)
以及 51CTO 上的中文导读文章
[《Palantir 的"本体论"（Ontology）究竟是什么？》](https://www.51cto.com/aigc/9397.html)。
这两份材料推荐给愿意进一步了解这个框架的贡献者阅读，但不是必须的预读材料。

## §5. 技能层

桌面端的**技能层**由位于 `.agents/skills/<name>/SKILL.md` 的 35 技能生态组成，另有 `ar-autoresearch` 的可运行 Python 参考 harness。技能由 agent runtime 加载（今天是 Copilot Chat，明天可以是任何具备技能感知能力的 agent runtime），并根据 frontmatter 中的 `description` 自动激活。

### 5.1 为什么需要技能层？

桌面端是聊天界面的**前门**，但**构建桌面端的人**需要比 GUI 本身更丰富的工作表面：结构化工作流、诊断回路、计划仪式、复盘与收尾。技能层就是这个表面。它**不会**交付给桌面端二进制文件的最终用户；它是 `cubecloud-agentic-os` 贡献者的开发者工效层。

这些技能还会镜像到开发者机器的**全局用户目录** `~/.agents/skills/`，因此它们会在同一台机器上的**任何** Copilot 工作区中自动激活，而不仅仅是 `cubecloud-agentic-os` 工作区。镜像方式是普通文件复制：Windows 用 `Copy-Item -Recurse`，macOS / Linux 用 `cp -r`。

### 5.2 34 项技能（V2.6 + V2.7）

| 前缀 | 来源 | 技能数 | 技能 |
|---|---|---|---|
| `ar-` | [autoresearch](https://github.com/JZKK720/autoresearch)（MIT，Karpathy） | 1 | `ar-autoresearch` |
| `karpathy-` | [andrej-karpathy-skills](https://github.com/JZKK720/andrej-karpathy-skills)（MIT，Karpathy） | 1 | `karpathy-guidelines` |
| `po-` | [poskills](https://github.com/JZKK720/poskills)（MIT，Matt Pocock） | 7 | `po-caveman`, `po-diagnose`, `po-tdd`, `po-write-a-skill`, `po-grill-with-docs`, `po-improve-codebase-architecture`, `po-to-prd` |
| `ecc-` | [ECC](https://github.com/JZKK720/ECC)（MIT，Matt Pocock） | 3 | `ecc-skill-development-guide`, `ecc-skill-scout`, `ecc-coding-standards` |
| `gbrain-` | [gbrain](https://github.com/JZKK720/gbrain)（MIT） | 2 | `gbrain-skillify`, `gbrain-eiirp` |
| `gstack-` | [gstack](https://github.com/JZKK720/gstack)（MIT） | 6 | `gstack-plan-ceo-review`, `gstack-plan-eng-review`, `gstack-plan-design-review`, `gstack-retro`, `gstack-investigate`, `gstack-qa` |
| `sp-` | [superpowers](https://github.com/JZKK720/superpowers)（MIT，Jesse Vincent） | **14** | `sp-skill-first`, `sp-tdd`, `sp-debug`, `sp-verify`, `sp-brainstorm`, `sp-plan`, `sp-execute`, `sp-subagents`, `sp-parallel`, `sp-request-review`, `sp-receive-review`, `sp-worktree`, `sp-finish-branch`, `sp-write-skill` |

14 个 `sp-` 技能是从上游 `superpowers` 仓库（MIT，Jesse Vincent）改编而来的**隐藏风格层**。`sp-` 前缀是 Cubecloud 原创的消歧标记；上游使用的是裸技能名（如 `brainstorming`、`test-driven-development` 等）。完整集合见 [`.agents/skills/README.md`](../.agents/skills/README.md)。每个来源仓库的许可证文本 vendored 在 `licenses/<repo>-MIT.txt` 中。REUSE 目录形式见 `NOTICE` §“Adapted dependencies” §“Skills ecosystem”。许可分析见 `BRANDING_AND_LICENSE.md` §“V2.7 transitions landed”。

完整决策树以及逐技能 `metadata.source` 溯源指针见 [`.agents/skills/README.md`](../.agents/skills/README.md)。同一信息的 REUSE 目录形式见 `NOTICE` §“Adapted dependencies”。许可分析见 `BRANDING_AND_LICENSE.md` §“V2.6 transitions landed”。

### 5.3 autoresearch Python harness（唯一随仓提供的可运行参考代码）

`ar-autoresearch/harness/{prepare.py, train.py, pyproject.toml, README.md}` 是桌面端仓库中唯一一个随仓附带**可运行代码**而不仅仅是文档/技能说明的部分。该 harness 保留了 Karpathy 上游 `prepare.py` 和 `train.py` 的实现：数据下载、BPE tokenizer、GPT 模型（rotary embeddings、value embeddings、softcap、ReLU² MLP）、MuonAdamW optimizer、best-fit packing、训练循环、eval 与 summary print 都保持完整。

该 harness **不会**在桌面端运行时被加载，**不会**链接进 Electron app，**不会**被打包进安装器，也**不是**任何桌面端功能所必需。它存在的原因只是让 `ar-autoresearch` 技能在开发者机器上拥有一个可供 agent 实验的真实参考。删除它不会改变桌面端的构建、运行时或信任表面。

### 5.4 添加一个新技能

运行 `gbrain-skillify`（11 轴门禁）→ 运行 `ecc-skill-scout`（写前检索）→ 阅读 `po-write-a-skill`（作者契约）→ 编写 SKILL.md（500 行上限）→ 向 `.agents/skills/README.md` 添加一行 → 镜像到 `~/.agents/skills/`。完整流程写在这些技能自身中；核心原则是“不要把一次性想法技能化，也不要把模糊想法技能化”。

### 5.5 流程方法论（V2.7 superpowers import）

14 个 `sp-` 技能构成了一套会在聊天会话生命周期中自动激活的**流程方法论**：

1. **`sp-skill-first`**（启动器）——每条消息前，agent 先检查相关技能。
2. **`sp-brainstorm`** —— 处理创造性工作时，启动苏格拉底式设计细化。
3. **`sp-plan`** —— 设计获批后，拆解为可执行的小任务计划。
4. **`sp-worktree`** —— 开始实现前，先创建隔离 worktree 并确认基线干净。
5. **`sp-tdd`** —— 每次代码修改都遵循 RED-GREEN-REFACTOR。
6. **`sp-debug`** —— 出现问题时走四阶段根因流程。
7. **`sp-execute`** 或 **`sp-subagents`** —— 执行计划（顺序或并行）。
8. **`sp-verify`** —— “是否完成？”必须给出证据，而不是意图。
9. **`sp-request-review`** —— 交接前的预审查清单。
10. **`sp-receive-review`** —— 分类、修复、辩护、必要时反驳。
11. **`sp-parallel`** —— 用于一次性并行研究，不用于执行计划。
12. **`sp-finish-branch`** —— 验证、给出 4 个选项（merge / PR / keep / discard）、清理现场。

该方法论是由**description 契约**强制执行的，而不是依赖用户手动调用。每个技能的 `description` 都是 *trigger-only*（遵循 `sp-write-a-skill` 的 Description Trap）：description 中不包含过程摘要，因此 agent 必须读取正文来学习流程。V2.8 审计把全部 35 个技能的 description 都裁剪为 trigger-only；同时所有 35 个技能都带有一个 `tests/red-baseline.md`，对应 TDD-for-skills 纪律。

### 5.6 预启动包（V2.9——最终用户首次启动时看到什么）

35 技能的开发者生态是**贡献者层**。桌面端最终用户看到的是另外一个表面：**预启动包**，它是随二进制文件一同交付的精简子集。完整种子列表如下：

- **技能（3，用户可见）** —— `cubecloud-persona`（操作员语气）、`cubecloud-onboarding`（前 5 分钟）、`cubegraph-code-intel`（把现有 CodeGraph IPC 包装为技能）。来源：`apps/desktop-shell/src/main/defaultSkills.ts`。
- **记忆（6）** —— 约定、运行时拓扑、双层技能、许可/品牌、工作区约定、安全姿态。来源：`apps/desktop-shell/src/main/defaultMemories.ts`。
- **Harness（3，默认禁用）** —— `cubecloud-memory-distill`、`cubecloud-cost-watchdog`、`cubecloud-skill-audit`。用户安装 `everos` 后启用。来源：`apps/desktop-shell/src/main/defaultHarnesses.ts`。
- **计划任务（1，默认禁用）** —— `cubecloud-daily-standup`。用户配置好 profile 后启用。来源：`apps/desktop-shell/src/main/defaultSchedules.ts`。
- **Kanban（1 个起始 board + 5 个可删除示例任务）** —— “Onboarding — delete me”，内含 5 个任务，带用户完成安装 / 配置 / 聊天 / 技能 / 计划流程。来源：`apps/desktop-shell/src/main/defaultKanban.ts`。

这些种子是**幂等的**（对已植入的种子再次运行不会重复添加），并且**尊重用户删除**（如果用户删除了某个种子，种子逻辑不会再把它加回来）。其契约由 `apps/desktop-shell/src/main/prelaunchSeed.test.ts` 固定。用户可以在桌面 UI 中逐项删除；种子逻辑不会重新插入。

预启动包记录在 `BRANDING_AND_LICENSE.md` §“V2.9 transitions landed” 中。完整溯源见 `NOTICE` §“Direct dependencies — Cubecloud-original work (2026)”。

## §6. Security & threat model

桌面端的安全姿态是本地用户优先模型。具有约束力的文档是 `SECURITY.md` 与 `THREAT_MODEL.md`。要点如下：

- **信任边界** —— 本地用户。agent 运行时运行在用户上下文中；renderer 由 Electron 标准隔离机制沙箱化；IPC 通道显式且不可猜测。
- **出站网络** —— opt-in。出站调用要么由 GUI 明确确认，要么被限制在已知 loopback 端点。无遥测、无分析调用、无远程证明。
- **入站网络** —— opt-in。用户必须显式启用 gateway lane 并提供端口；默认端口仅绑定 `127.0.0.1`（loopback）。
- **自动更新** —— opt-in。稳定版本默认启用 `electron-updater` 通道；可在 Settings 中关闭。
- **Sidecar 进程** —— 可选、受限。CodeGraph 可以作为子进程运行，也可以作为进程内 SDK wrapper 运行；EverOS 作为 Python sidecar 通过 HTTP 运行，并由桌面端负责生命周期管理。桌面端不会自动安装二者中的任何一个。
- **上报** —— 私有渠道列在 `SECURITY.md`。当前没有公开漏洞赏金计划。

## §7. 国际化

- English: `README.md`
- 简体中文: `README.zh-CN.md`
- 日本語: `README.ja-JP.md`

i18n runtime 使用 i18next（MIT）。英文 locale 是事实来源；翻译后的 README 由社区维护。翻译贡献流程见 `CONTRIBUTING.md`。

## §8. 贡献

- 每个 commit 都必须带有 DCO 1.1 sign-off（见 `CONTRIBUTING.md`）。DCO 是本项目采用的入库贡献模型——**不是** CLA——因为它以 commit 为粒度、摩擦极低，并且对本项目的法律场景已经足够。
- V2.5 + V2.6 的许可姿态明确了双许可结构：Cubecloud-original 工作采用双许可；继承框架保持 MIT。新增 Cubecloud-original 文件时，需要添加 SPDX 头：`SPDX-License-Identifier: (AGPL-3.0-or-later OR Apache-2.0 OR MIT)`。新增继承文件时则保持 MIT（无需头部）。
- 新技能需要经过 `gbrain-skillify` 门禁。新 platform app 通过 `packages/platform-core/src/index.ts` 中的 `PLATFORM_APPS` 注册表接入。新品牌资产需要经过 `docs/legal/TRADEMARK_POLICY.md` 审核。新法律文档放在 `docs/legal/`。新架构文档放在 `docs/`。新的 smoke 脚本放在 `scripts/` 并带相同 SPDX 头。
- CI 管道运行 lint + typecheck + vitest。Smoke runs（基于 CDP 的 `verify-*.js` 和 `smoke-all.js`）会在每次发布前手动执行。

## §9. 发布流程

发布流程记录在 `docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`（V2.6 发布规范）以及 `BRANDING_AND_LICENSE.md` §“Pending rebrand surfaces” 列表（下一次公开发布前必须关闭的事项）中。具有约束力的清单如下：

1. **关闭剩余的品牌重构表面** —— 翻译后的 README（同步品牌改动）、应用内 locale 字符串，以及发布自动化元数据。预览截图已在 V2.10.30 中收敛为更小的 Cubecloud 品牌子集，而打包图标集已在 V2.10.31 基于当前 Cubecloud 标记重新生成。
2. **运行 smoke** —— `npm run smoke:all` 以及逐屏 CDP verify。必须全部通过。
3. **法律复核** —— `BRANDING_AND_LICENSE.md`, `NOTICE`, `ACKNOWLEDGMENTS.md`, `SECURITY.md`, `THREAT_MODEL.md`, `CONTRIBUTING.md`, `docs/legal/*`。自上次发布以来新增的任何文件都必须进入正确章节。
4. **Changelog** —— 追加 `changelogs/<version>.md`，写明用户可见变化。
5. **Tag & publish** —— 给发布 commit 打 tag，推送到 Cubecloud-owned 的发布分支，运行三平台的 `electron-builder` 管道（Windows MSI、Fedora RPM、macOS DMG）。
6. **Smoke 已发布产物** —— 从已发布 URL 安装，走一遍安装 / 首次启动 / 聊天流程，并确认自动更新。

## §10. 许可 / 品牌

这是 `hermes-desktop`（Nous Research / Hermes Agent 系谱）的一个 Cubecloud 品牌继任版本。V2.4 → V2.5 → V2.6 的工作把许可 / 品牌姿态固定下来。具有约束力的文档包括：

- `LICENSE` —— 双许可说明。Cubecloud-original 工作采用 AGPL-3.0-or-later（主）+ Apache-2.0 + MIT（兼容选项）；继承的 `hermes-desktop` 框架是硬 MIT。
- `BRANDING_AND_LICENSE.md` —— 历史叙述 + 按路径划分的溯源说明。要看最近三轮变更的差异，请读 §“V2.4 / V2.5 / V2.6 transitions landed”。
- `NOTICE` —— 符合 REUSE 的第三方归属目录。要看 `.agents/skills/` 中 6 个上游仓库的技能，请读 §“Adapted dependencies”。
- `ACKNOWLEDGMENTS.md` —— 人类可读的致谢页。V2.6 的技能导入详见 §“Skills adapted from third-party repos”。
- `docs/legal/TRADEMARK_POLICY.md` —— Cubecloud 商标（logo、wordmark、splash、screenshots）为 All-rights-reserved；该政策列出了允许的 nominative use，并给出 `FORK-NOTICE.md` 模板。
- `docs/legal/CUBECLOUD-EULA.md` —— 托管服务路径的 EULA。
- `docs/legal/PAID_SERVICES_TERMS.md` —— 付费功能条款。
- `docs/legal/COMMERCIAL_LICENSE.md` —— 商业重许可路径。
- `docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md` —— clean-room replacement 路线图。
- `docs/legal/PROVENANCE_TRACKER.md` —— 按路径追踪的 provenance tracker。
- `CONTRIBUTING.md` —— DCO 1.1 贡献条款。
- `SECURITY.md` —— 安全政策、支持版本、部署指南、漏洞上报。
- `THREAT_MODEL.md` —— 工作中的威胁模型。

## §11. 接下来读什么

| 如果你想…… | 请读 |
|---|---|
| 构建和运行桌面端 | `README.md` |
| 了解运行时计划 | `docs/RUNTIME_ORCHESTRATION_PLAN.md` |
| 了解 CodeGraph 集成 | `docs/CODEGRAPH-RUNTIME.md` |
| 了解 EverOS 集成 | `docs/EVEROS-SIDECAR.md` |
| 了解 V2-COMMIT 计划（V2.4 / V2.5 / V2.6 之前的工作） | `docs/V2-COMMIT-PLAN.md`, `docs/COMMIT-1-2-APPLIED.md`, `docs/COMMIT-3-9-APPLIED.md` |
| 了解 SSH 隧道部署到 VPS | `docs/SSH-TUNNEL-VPS.md` |
| 了解工作区迁移（从 hermes-desktop 迁移到 cubecloud-agentic-os） | `docs/CODEGRAPH_WORKSPACE_MIGRATION.md` |
| 添加一个新技能 | `.agents/skills/README.md` → `gbrain-skillify` → `po-write-a-skill` |
| 添加一个新 platform app | `packages/platform-core/src/index.ts` §“PLATFORM_APPS” |
| 添加一个新法律文档 | `docs/legal/`（遵循现有文件风格） |
| 添加一个新架构文档 | `docs/`（遵循 SPDX 头 + provenance 指针模式） |
| 添加一个新的 smoke / capture 脚本 | `scripts/`（遵循 SPDX 头模式） |
| 提交安全报告 | `SECURITY.md` |
| 了解发布管道 | `docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md` |
| 全局安装技能层 | `docs/GLOBAL-INSTALL-PLAN.md` 与 `docs/agent-skills-bundle/` 下的 bundle installer |

---

**Attribution note.** 本手册由 Cubecloud Contributors 于 2026 年撰写。其结构参考了 V2.4 → V2.5 → V2.6 的 `BRANDING_AND_LICENSE.md` 历史，以及 `docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md` 的发布设计。它的定位是项目的**主索引**；其他所有文档都是从这里分出的叶子文档。
