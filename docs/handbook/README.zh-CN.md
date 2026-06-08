# 手册子文档索引

> **主手册（`docs/HANDBOOK.md`）的配套页面。** 主手册提供一屏式总览；本页则提供按主题展开的长文入口。

主手册即 `docs/HANDBOOK.md` 的 **§1 → §11**。下面列出的每一篇长文，都是主手册某个部分展开后的叶子文档。建议先阅读主手册，再深入你真正需要的主题。

## 导航图

| 主手册章节 | 长文文档 |
|---|---|
| §3 架构 | [`docs/handbook/ARCHITECTURE.md`](ARCHITECTURE.md) |
| §3.3 双层溯源 | [`docs/legal/PROVENANCE_TRACKER.md`](../legal/PROVENANCE_TRACKER.md) |
| §4 运行时编排 | [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](../RUNTIME_ORCHESTRATION_PLAN.md) |
| §5 技能层 | [`.agents/skills/README.md`](../../../.agents/skills/README.md) |
| §6 安全与威胁模型 | [`SECURITY.md`](../../SECURITY.md), [`THREAT_MODEL.md`](../../THREAT_MODEL.md) |
| §8 贡献 | [`CONTRIBUTING.md`](../../CONTRIBUTING.md), [`docs/handbook/DEVELOPMENT.md`](DEVELOPMENT.md) |
| §9 发布流程 | [`docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md) |
| §10 许可 / 品牌 | [`LICENSE`](../../LICENSE), [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md), [`NOTICE`](../../NOTICE), [`ACKNOWLEDGMENTS.md`](../../ACKNOWLEDGMENTS.md), [`docs/legal/`](../legal/) |
| §11 接下来读什么 | [`docs/handbook/OPERATIONS.md`](OPERATIONS.md), [`docs/handbook/DEVELOPMENT.md`](DEVELOPMENT.md) |

## 按主题深入阅读

### 架构
- [`docs/CODEGRAPH-RUNTIME.md`](../CODEGRAPH-RUNTIME.md) —— CodeGraph 界面、两种后端、嵌入式 SDK 与 CLI 子进程的区别。
- [`docs/EVEROS-SIDECAR.md`](../EVEROS-SIDECAR.md) —— EverOS sidecar 生命周期、端口映射、smoke harness。
- [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](../RUNTIME_ORCHESTRATION_PLAN.md) —— 多运行时计划（Hermes 为 day-1，OpenClaw + IronClaw 为 V2.6+）。
- [`docs/CODEGRAPH_WORKSPACE_MIGRATION.md`](../CODEGRAPH_WORKSPACE_MIGRATION.md) —— 从 `hermes-desktop` 工作区迁移到 `cubecloud-agentic-os` 工作区的说明。
- [`docs/SSH-TUNNEL-VPS.md`](../SSH-TUNNEL-VPS.md) —— 通过 SSH 隧道将桌面端部署到远程 VPS。

### V2 历史
- [`docs/V2-COMMIT-PLAN.md`](../V2-COMMIT-PLAN.md) —— V2 提交计划。
- [`docs/COMMIT-1-2-APPLIED.md`](../COMMIT-1-2-APPLIED.md) —— V2 的 1–2 号提交。
- [`docs/COMMIT-3-9-APPLIED.md`](../COMMIT-3-9-APPLIED.md) —— V2 的 3–9 号提交。

### 法律与治理
- [`docs/legal/TRADEMARK_POLICY.md`](../legal/TRADEMARK_POLICY.md) —— Cubecloud 商标、允许用途、fork 规则。
- [`docs/legal/CUBECLOUD-EULA.md`](../legal/CUBECLOUD-EULA.md) —— 托管服务 EULA。
- [`docs/legal/PAID_SERVICES_TERMS.md`](../legal/PAID_SERVICES_TERMS.md) —— 付费功能条款。
- [`docs/legal/COMMERCIAL_LICENSE.md`](../legal/COMMERCIAL_LICENSE.md) —— 商业重许可路径。
- [`docs/legal/CLEAN_ROOM_REPLACEMENT_PLAN.md`](../legal/CLEAN_ROOM_REPLACEMENT_PLAN.md) —— clean-room replacement 路线图。
- [`docs/legal/PROVENANCE_TRACKER.md`](../legal/PROVENANCE_TRACKER.md) —— 按路径记录的溯源追踪器。

### 技能层
- [`.agents/skills/README.md`](../../../.agents/skills/README.md) —— 顶层技能索引与决策树。
- [`.agents/skills/SKILLS.md`](../../../.agents/skills/SKILLS.md) —— （如果以后写出逐技能索引文件，可从这里链接）。

### 全局安装
- [`docs/GLOBAL-INSTALL-PLAN.md`](../../../docs/GLOBAL-INSTALL-PLAN.md) —— 技能层的全局安装计划。
- [`docs/agent-skills-bundle/`](../../../docs/agent-skills-bundle/) —— bundle 安装脚本。

### 设计规范
- [`docs/superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md`](../superpowers/specs/2026-04-30-windows-winget-fedora-rpm-release-design.md) —— V2.6 的发布设计规范。

### 记忆
- `/memories/cubecloud-skills-ecosystem.md`（agent memory，不在仓库中）——20 技能生态记忆笔记，包含 autoresearch / codegraph 冲突检查结果。

## 这个索引如何更新

当 `docs/` 或 `docs/handbook/` 中新增长文时，请在上面的“导航图”表中增加一行。主手册（`docs/HANDBOOK.md`）是唯一可以把自己加入叶子文档“Where to look next”部分的文档。

当某个叶子文档被废弃或删除时，请从导航图中移除对应行。不要留下悬空链接。

---

**Attribution note.** 本索引由 Cubecloud Contributors 于 2026 年编写。它是 Cubecloud 原创文档；其结构参考了 V2.4 → V2.5 → V2.6 的品牌 / 许可历史，以及 `docs/superpowers/specs/` 设计规范约定。

**Recent updates（V2.6 — V2.10）.** 本文件在 V2.4 — V2.6 品牌 / 许可波次期间进行了实质性编辑。V2.7（superpowers 技能）、V2.8（description-trim 审计）、V2.9（预启动包，40/40 smoke）、以及 V2.10（文档迁移、README 拆分、i18n 清理、previews 清理、provenance 交叉链接、README Translations 指针）都记录在 [`BRANDING_AND_LICENSE.md`](../../BRANDING_AND_LICENSE.md) 对应的 `## V2.7 / V2.8 / V2.9 / V2.10` 小节中；每一轮变更也都记录在 [`docs/RETIRED_AND_LEGACY.md`](../RETIRED_AND_LEGACY.md) §“How to confirm a surface is live” 中。V2.10.14 对本文件做的是补充性尾注，而不是正文重写。
