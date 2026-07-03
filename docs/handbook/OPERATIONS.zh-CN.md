# 运维指南

> **主手册（`docs/HANDBOOK.md` §6、§9、§11）的配套长文。** 主手册给你一屏式摘要；本页给的是面向 on-call 操作员的长篇运维说明。

## Day-1 设置（用户）

### Windows

```powershell
# 从 GitHub release 页面下载最新 MSI
# （Cubecloud-pending: 一旦品牌切换完成，替换为 Cubecloud 自有发布 URL）
Invoke-WebRequest -Uri https://github.com/JZKK720/cubecloud-agentic-os/releases/latest/download/agent-desktop-setup.msi -OutFile cubecloud-setup.msi

# 运行安装器（SmartScreen 会告警——点击 “More info” → “Run anyway”）
msiexec /i cubecloud-setup.msi
```

### Fedora

```bash
curl -L -o cubecloud.rpm https://github.com/JZKK720/cubecloud-agentic-os/releases/latest/download/agent-desktop-x86_64.rpm
sudo dnf install ./cubecloud.rpm
# 如果你的系统强制检查签名：sudo dnf install ./cubecloud.rpm --nogpgcheck
```

### macOS

```bash
curl -L -o cubecloud.dmg https://github.com/JZKK720/cubecloud-agentic-os/releases/latest/download/agent-desktop-x64.dmg
open cubecloud.dmg
# 将 Cubecloud.app 拖入 /Applications
```

### 首次启动向导

首次启动时，桌面端会引导用户完成：

1. **运行时选择** —— 本地安装 Hermes（默认），或连接到远程 / Docker 发布 / SSH 隧道的 gateway。
2. **提供者设置** —— 选择本地模型端点（Ollama、vLLM、llama.cpp）或远程提供者（任何 OpenAI-compatible API）。
3. **API key** —— 仅远程提供者需要。存储在用户 home 目录下的运行时配置目录中，不进入桌面端自己的数据库。
4. **测试聊天** —— 向导会发送一条一次性测试消息，以确认 runtime + provider 线路已打通。

## Day-2 运维

### 数据存放位置

- **桌面端状态**（profiles、sessions、models、providers、skills、memory、tools、schedules、kanban）—— 位于用户应用数据目录下的 SQLite 数据库。
  - Windows: `%APPDATA%\agent-desktop\state.db`
  - macOS: `~/Library/Application Support/agent-desktop/state.db`
  - Linux: `~/.config/agent-desktop/state.db`
- **运行时状态**（Hermes / OpenClaw / IronClaw）—— 位于运行时自己的 home 目录中。
  - Hermes: `~/.hermes/`
  - OpenClaw: `~/.openclaw/`
  - IronClaw: 安装时配置
- **日志** —— 位于运行时日志目录；桌面端会在应用内 “Console” 界面中 tail 它们。
- **备份** —— 可通过桌面端 Settings → Backup 产生，也可以手动用 `tar -czf cubecloud-backup.tar.gz <state-db-path> <runtime-home>` 生成。

### 常见运维任务

#### 重启卡死的运行时

桌面端 Settings → Runtime → “Restart” 按钮是最安全的路径。如果按钮失效而运行时卡住，操作员可以直接在操作系统层面对其发送 SIGTERM：

```bash
# 找到 runtime pid
pgrep -f "hermes-server\|openclaw\|ironclaw"

# SIGTERM
kill <pid>

# 如果 10 秒后仍无响应，再 SIGKILL
kill -9 <pid>

# 重启
# 桌面端的 runtime picker 会自动识别新的进程。
```

#### 检查失败的聊天

1. 打开 Settings → Console。
2. 在聊天界面找到该会话的 session ID。
3. 在 gateway log 中搜索 session ID。
4. 大多数聊天失败属于以下几类：
   - **Provider unreachable** —— 用户本地模型服务挂了，或者远程 API key 无效。修好 provider 后重试聊天。
   - **Runtime gateway stuck** —— 运行时 HTTP 服务还活着，但已不响应。重启运行时。
   - **Skill activation loop** —— 某个技能在自动激活并递归激活自身。去 Settings → Skills 禁用它。

#### 回滚一个发布版本

桌面端会在用户 app-data 目录下保留上一版本安装器的有效载荷。要回滚：

1. Settings → Updates → “Show update history”。
2. 点击 “Roll back to <version>”。
3. 桌面端将卸载当前版本并安装上一版本。

对于紧急回滚（例如 auto-update 本身坏了），操作员可以：

1. 从 GitHub release 页面下载上一版本的 MSI / RPM / DMG。
2. 在当前安装之上直接运行安装器。
3. 由于桌面端的 `electron-updater` 会在下一次启动时尝试向前更新，请先在 Settings → Updates 中关闭自动更新。

#### 备份与恢复

桌面端 Settings → Backup 生成的 tar.gz 包含：

- 状态 SQLite 数据库；
- 运行时 home 目录（Hermes / OpenClaw / IronClaw，取决于用户当前配置）；
- 用户全局技能镜像目录 `~/.agents/skills/`；
- 一个小型 manifest，其中包含桌面端版本、运行时版本、技能名，以及 tarball 的 SHA-256。

恢复流程：

1. Settings → Backup → Restore。
2. 选择 tar.gz。
3. 桌面端校验 SHA-256，停止当前运行时，恢复状态，再重新启动运行时。

#### 干净卸载

要移除桌面端及其全部状态：

```bash
# macOS
rm -rf "/Applications/Cubecloud.app"
rm -rf ~/Library/Application\ Support/agent-desktop
rm -rf ~/Library/Logs/agent-desktop

# Windows
# 使用 “Apps & Features” → Cubecloud Desktop → Uninstall。
# 然后删除 %APPDATA%\agent-desktop 和 %LOCALAPPDATA%\agent-desktop。

# Linux
sudo dnf remove agent-desktop
rm -rf ~/.config/agent-desktop
rm -rf ~/.local/share/agent-desktop
```

运行时 home（`~/.hermes/` 等）**不会**由桌面端卸载器删除；如果用户希望完全清空状态，需要自己单独删除它们。

## Day-2 运维（operator / release）

### 发布清单

具有约束力的清单见 `docs/HANDBOOK.md` §9。V2.4 → V2.5 → V2.6 波次的完整差异叙述见 `BRANDING_AND_LICENSE.md` §“V2.4 / V2.5 / V2.6 transitions landed”。发布规范见 `docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`。

### 监控

- **In-app Console** —— Settings → Console 会 tail 运行时日志。
- **逐屏 smoke runs** —— `scripts/verify-*.js`（基于 CDP）。每次发布前执行。
- **聚合 smoke run** —— `scripts/smoke-all.js` 顺序执行所有 `verify-*.js`。
- **预览截图** —— `scripts/capture-*.js` 生成随 release notes 发布的逐屏 PNG。

### 事件响应

具有约束力的文档是 `SECURITY.md`。要点如下：

- **安全报告** —— 私有报告渠道见 `SECURITY.md`。安全问题不要开公开 issue。
- **漏洞披露时间线** —— 自私下报告起 90 天后公开披露；若报告者要求，可额外给 14 天宽限期。
- **支持版本** —— 最新 major 的最新 minor（N）以及前一个 minor（N-1）。更老版本不再修复。

### 可观测性（当前状态）

- **日志** —— 仅本地文件。桌面端不附带远程日志发送器。
- **指标** —— 无。没有 Prometheus / OpenTelemetry 集成。
- **链路追踪** —— 无。没有分布式 tracing 集成。
- **告警** —— 无。没有 alerting 集成。

这是 V2.5 的一个刻意决定：桌面端的威胁模型是本地用户优先，接入远程遥测会扩大信任表面。需要可观测性的操作员可以直接 tail 应用内 Console、运行时日志目录，或者 auto-update 通道的 CDN 日志。

## 合规与治理

- **许可** —— `LICENSE`（双许可：AGPL-3.0-or-later 为主 + Apache-2.0 + MIT 兼容）。继承框架代码是硬 MIT。
- **商标** —— `docs/legal/TRADEMARK_POLICY.md`。Cubecloud 商标为 All-rights-reserved；允许 nominative use；不允许混淆性命名。
- **隐私** —— 无遥测、无分析、无远程证明。桌面端不会回传数据。
- **SBOM** —— 每次发布的 `package-lock.json` 是 JS 依赖的权威 SBOM。Python SBOM（autoresearch harness）是 `ar-autoresearch/harness/uv.lock`（由 `uv lock` 生成）。
- **DCO** —— 每个 commit 必须带 `Signed-off-by:`。见 `CONTRIBUTING.md`。

## 迁移路径

### 从上游 `hermes-desktop` 迁移到 `agent-desktop`

V2.3 → V2.4 → V2.5 的工作是品牌迁移；底层框架仍然是 `hermes-desktop`（MIT）。迁移流程：

1. 备份上游安装：`cp -r ~/.hermes ~/.hermes.bak`。
2. 在上游安装之上安装 `agent-desktop`。
3. 桌面端首次启动向导会检测现有 `~/.hermes/` 并提供导入选项。
4. 导入完成后，桌面端中的 `~/.hermes/` 在内容上保持不变；可见变化主要是品牌层（图标、splash、locale strings）。

### 从单运行时迁移到多运行时

V2.6 → V2.7 波次增加了 OpenClaw 和 IronClaw 作为额外车道。要添加第二个运行时：

1. 按运行时自己的文档安装它（例如 `pip install openclaw`）。
2. 打开 Settings → Runtime → “Add runtime”。
3. 选择运行时类型，并提供安装路径 / 端口。
4. 桌面端的 runtime picker 现在会列出多个运行时；用户可以按会话选择聊天目标。

### 从桌面端迁移到托管服务

`docs/legal/CUBECLOUD-EULA.md` 是托管服务路径的 EULA。若操作员希望运行一个 Cubecloud 衍生服务，同时不触发 AGPL-3.0 §13 的网络源代码开放义务，可以使用 `docs/legal/COMMERCIAL_LICENSE.md` 中记录的商业重许可路径。

---

**接下来读什么。** [`docs/HANDBOOK.md`](../HANDBOOK.md) 是主索引；[`SECURITY.md`](../../SECURITY.md) 讲安全政策；[`THREAT_MODEL.md`](../../THREAT_MODEL.md) 讲工作中的威胁模型；[`CONTRIBUTING.md`](../../CONTRIBUTING.md) 讲 DCO；[`docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md) 讲发布设计。

**Recent updates（V2.6 — V2.10）.** 本文件上次实质性编辑发生在 V2.4 — V2.6 品牌/许可波次期间。V2.7（superpowers 技能）、V2.8（description-trim 审计）、V2.9（预启动包，40/40 smoke）以及 V2.10（文档迁移、README 拆分、i18n 清理、previews 清理、provenance cross-link、README Translations pointer）都记录在 [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) 对应的 `## V2.7 / V2.8 / V2.9 / V2.10` 小节中；每轮变更也都记录在 [`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §“How to confirm a surface is live” 中。V2.10.14 对本文件所做的是补充性尾注，而不是正文重写。
