# 架构深潜

> **主手册（`docs/HANDBOOK.md` §3）的配套长文。** 主手册给你的是一屏式地图；本页给你的是一次完整的 30 屏架构导览。

## 进程模型

桌面端是一个 Electron 应用。它采用标准的 Electron 三进程模型，并带有一个可选的第四进程（EverOS sidecar）。

```
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────────┐
│      Renderer      │ ←→ │      Preload       │ ←→ │        Main            │
│  React 19 + UI     │    │ contextBridge API  │    │   IPC handlers,        │
│  screens, state    │    │ exposes a narrow   │    │   lifecycle,           │
│  via Zustand +     │    │ IPC surface        │    │   runtime orchestrator │
│  TanStack Query    │    │                    │    │   CodeGraph, EverOS    │
└────────────────────┘    └────────────────────┘    └──────────┬─────────────┘
                                                               │
                            ┌──────────────────────────────────┤
                            │                                  │
                            ▼                                  ▼
                  ┌────────────────────┐            ┌────────────────────┐
                  │  Hermes runtime    │            │  EverOS sidecar    │
                  │  (process or       │            │  (optional,        │
                  │   remote HTTP)     │            │   Python HTTP)     │
                  └────────────────────┘            └────────────────────┘
```

### Main process

主进程入口是 `src/main/index.ts` 以及 `src/main/` 下的各个目录。它负责：

- 以正确的 preload bridge 启动 renderer；
- 注册每一个 IPC 通道，并将调用分发给正确的 handler；
- 管理 runtime orchestrator（`src/main/hermes-runtime/`、`src/main/openclaw/`、`src/main/ironclaw/`）；
- 管理 CodeGraph surface（CLI 子进程路径用 `src/main/codegraph.ts`，嵌入式 SDK 路径用 `src/main/codegraph-runtime.ts`）；
- 管理 EverOS sidecar 生命周期（`src/main/everos-sidecar.ts`）；
- 管理 skills harness（`src/main/skills-harness.ts`）；
- 管理 SQLite 状态（`src/main/db/`、`apps/desktop-shell/src/state/`）；
- 驱动 auto-updater（`electron-updater`）；
- 驱动 system tray 与 global shortcuts。

### Preload process

Preload 是位于 `src/preload/index.ts` 的一层轻量 `contextBridge`。它向 renderer 暴露一个**窄表面**——只开放 renderer 真正需要的 IPC 通道，并附带正确的参数形状与返回类型。Preload 是 renderer（不可信 UI）与 main（可信 orchestrator）之间的**信任边界**。

### Renderer

Renderer 是位于 `src/renderer/src/` 下的 React 19 + i18next 应用。界面包括 chat、sessions、agents、persona、kanban、codegraph、everos、models、providers、skills、memory、tools、schedules、console、workspace、gateway、operations 与 settings。Renderer 只能通过 preload bridge 与 main 通信。

### EverOS sidecar（可选）

当用户安装了 `everos` 并启用 EverOS 车道后，main process 会启动一个 `everos server start` Python 子进程并管理其生命周期。桌面端是 sidecar HTTP 表面的**客户端**，并不会重写其功能本身。Sidecar **不会**随桌面端一起打包；用户必须单独安装。生命周期管理器是 Cubecloud 原创，而 sidecar 本体来自上游 `EverMind-AI/EverOS`。

## IPC 表面

IPC 表面可以理解为：所有在 `src/main/index.ts` 注册、并通过 `src/preload/index.ts` 暴露给 renderer 的通道之并集。其形状如下：

```typescript
type IpcChannel =
  // Runtime
  | 'runtime:detect'
  | 'runtime:install'
  | 'runtime:start'
  | 'runtime:stop'
  | 'runtime:status'
  | 'runtime:switch'        // V2.6 — pick a runtime lane
  | 'runtime:list'          // V2.6 — list installed runtimes

  // Provider
  | 'provider:discover'
  | 'provider:configure'
  | 'provider:list'
  | 'provider:test'

  // Model
  | 'model:list'
  | 'model:save'
  | 'model:delete'
  | 'model:test'

  // Chat
  | 'chat:send'
  | 'chat:stream'
  | 'chat:cancel'
  | 'chat:history'

  // Memory
  | 'memory:list'
  | 'memory:save'
  | 'memory:delete'

  // Skills
  | 'skill:list'
  | 'skill:install'
  | 'skill:enable'
  | 'skill:disable'

  // Tools
  | 'tool:list'
  | 'tool:configure'

  // Schedules
  | 'schedule:list'
  | 'schedule:save'
  | 'schedule:delete'
  | 'schedule:run-now'

  // CodeGraph (V2.3)
  | 'codegraph:init'
  | 'codegraph:status'
  | 'codegraph:context'
  | 'codegraph:search'
  | 'codegraph:impact'
  | 'codegraph:export-ua-graph'

  // EverOS sidecar (V2.3)
  | 'everos:start'
  | 'everos:stop'
  | 'everos:status'
  | 'everos:list-harnesses'
  | 'everos:run-harness'

  // Workspace / dispatch
  | 'workspace:list-kanban-boards'
  | 'workspace:create-task'
  | 'workspace:dispatch'
  | 'workspace:get-dispatch-context'

  // Settings
  | 'settings:get'
  | 'settings:set'
  | 'settings:backup'
  | 'settings:restore'
  | 'settings:export-debug-dump'
```

每个通道都是显式 opt-in；renderer 无法调用未暴露的通道。完整集合在 `src/main/index.ts`（注册侧）和 `src/preload/index.ts`（bridge 侧）。增加一个新通道意味着这两个文件都要更新；上面的 type union 只是给贡献者看的速览，不是约束性协议。

## 状态模型

状态模型是一个**双层模型**：

1. **本地 UI 状态** —— 位于 renderer 中。使用 React `useState` / `useReducer` 管理短暂表单状态，使用 TanStack Query 管理从 main process 获取的数据。UI 状态不会离开 renderer。
2. **持久化状态** —— 位于 main process 的 SQLite 数据库中。由 `apps/desktop-shell/src/state/` 中的薄 ORM 层驱动。每个实体（profile、session、model、provider、skill、memory entry、tool config、schedule、kanban board、kanban task）都存储在 SQLite 中。schema 位于 `apps/desktop-shell/src/state/schema.sql`（或当前 schema migration 所在位置）。

连接这两层的是前面的 IPC 表面：renderer 发起请求，main 执行读写，结果再通过 bridge 返回。

## 运行时编排（深入）

运行时编排器位于 `src/main/hermes-runtime/`（Hermes）、`src/main/openclaw/`（OpenClaw）和 `src/main/ironclaw/`（IronClaw）。每个运行时目录都遵循同样的形状：

```
runtime-name/
├── detect.ts          # Is this runtime installed? Where?
├── install.ts         # The install flow (or a "not our installer" stub)
├── start.ts           # Start the runtime (spawn process or open tunnel)
├── stop.ts            # Stop the runtime gracefully
├── status.ts          # Health, pid, log tail
├── config.ts          # Read / write the runtime's config
└── smoke.ts           # The smoke target registration
```

编排器通过 `packages/platform-core/src/index.ts` §“PLATFORM_RUNTIME_PROVIDERS” 注册为 `PlatformRuntimeProviderDescriptor`。该 descriptor 描述连接模式（embedded-local、local-gateway、remote-gateway、ssh-tunnel、docker-gateway、migration-import）与能力位（canInstallLocally、canAttachToExistingLocalGateway、canAttachViaSshTunnel 等）。`runtime:switch` 与 `runtime:list` 这两个 IPC 通道会遍历已注册的 provider。

## CodeGraph（深入）

CodeGraph surface 有两种后端：

1. **CLI 子进程** —— `src/main/codegraph.ts` 调用 `codegraph` 二进制执行 `init`、`status`、`context` 与 `export-ua-graph`。只要 CLI 在 PATH 中就可使用。该 CLI 来自 `colbymchenry/codegraph` 的独立 Go 项目，并未 vendored 到本仓库。
2. **嵌入式 SDK** —— `src/main/codegraph-runtime.ts` 把 `@colbymchenry/codegraph` npm 包作为 TypeScript 库封装起来，并在 main process 中为每个项目保留一个 `CodeGraph` 实例，以便 renderer 可以执行 `searchNodes`、`getImpactRadius` 和 `getStats`，而不必每次调用都创建一个新子进程。

详细说明见 `docs/CODEGRAPH-RUNTIME.md`。核心结论：嵌入式 SDK 路径现在是默认；CLI 子进程路径为已经把 CLI 放进 PATH 的用户保留。

## EverOS sidecar（深入）

EverOS sidecar 是一个用户单独安装的 Python HTTP 服务器（`everos server start`）。桌面端中的 `src/main/everos-sidecar.ts` 是其生命周期管理器：

- Detect：`everos` 是否在 PATH 中？版本是多少？
- Start：使用正确的环境变量启动 `everos server start`，并把 stdout/stderr 捕获到日志文件；
- Stop：先 SIGTERM，等待，必要时再 SIGKILL；
- Status：pid、port、最后一行日志、health probe（对发布端口执行 HTTP GET）；
- Harnesses：列出配置的 EverOS harness，并在需要时执行其中一个。

桌面端是 sidecar HTTP 表面的**客户端**。Sidecar **不**是 vendored 代码，**不**会被打包，**不**由桌面端安装。深度说明见 `docs/EVEROS-SIDECAR.md`。

## Skills harness（深入）

Skills harness（`src/main/skills-harness.ts`）是 agent runtime 在启动时解析技能的解析器。它会：

- 读取仓库内 `.agents/skills/<name>/SKILL.md` 和用户全局 `~/.agents/skills/<name>/SKILL.md`；
- 校验 frontmatter（name、description、license、metadata.source）；
- 返回合并后的技能集合，其中 repo-local 优先于 user-global；
- 将结果缓存在内存中，并在文件系统变更时重新加载。

Harness 解析的 {{SKILLS_UPSTREAM}} 技能生态见 `docs/HANDBOOK.md` §5 和 `.agents/skills/README.md`。Harness 本身是 Cubecloud 原创；技能内容来自上游 MIT-licensed repos 的改编（详见 `NOTICE` §“Adapted dependencies”）。

## 构建流水线

构建使用标准 electron-vite 流程。项目包含三个 TypeScript project：

- `tsconfig.json` —— main process（Node 20 target）；
- `tsconfig.web.json` —— renderer（browser target）；
- `tsconfig.node.json` —— 构建脚本与工具链（Node 20 target）。

构建输出位于 `out/main`、`out/preload`、`out/renderer`。`electron-builder` 会将这三份输出与继承资源一起打包成三个目标安装器（Windows MSI、Fedora RPM、macOS DMG）。打包图标集已在 V2.10.31 基于当前 Cubecloud 标记重新生成（`build/icon.png`、`build/icon.ico`、`build/icon.icns`，以及 `resources/` 与 renderer 资产树中的对应 PNG 副本）。

## 测试

测试套件使用 Vitest，由 `vitest.config.ts` 驱动。测试文件位于 `tests/` 以及各模块旁边的 `*.test.ts`。Smoke runs（基于 CDP、针对运行中的桌面端）位于 `scripts/verify-*.js` 和 `scripts/smoke-all.js`。Smoke runs 在每次发布前手动执行；单元测试则在每次 PR 的 CI 中运行。

---

**接下来读什么。** [`docs/CODEGRAPH-RUNTIME.md`](CODEGRAPH-RUNTIME.md)、[`docs/EVEROS-SIDECAR.md`](EVEROS-SIDECAR.md)、[`docs/RUNTIME_ORCHESTRATION_PLAN.md`](RUNTIME_ORCHESTRATION_PLAN.md)、[`docs/CODEGRAPH_WORKSPACE_MIGRATION.md`](CODEGRAPH_WORKSPACE_MIGRATION.md)。

**Recent updates（V2.6 — V2.10）.** 本文件上一次实质性修改发生在 V2.4 — V2.6 品牌 / 许可波次期间。V2.7（superpowers 技能）、V2.8（description-trim audit）、V2.9（预启动包，40/40 smoke）以及 V2.10（文档迁移、README 拆分、i18n 清理、previews 清理、provenance cross-link、README Translations pointer）都记录在 [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) 对应的 `## V2.7 / V2.8 / V2.9 / V2.10` 小节中；每一轮变更也记录在 [`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §“How to confirm a surface is live” 中。V2.10.14 对本文件做的是补充性尾注，而不是正文重写。
