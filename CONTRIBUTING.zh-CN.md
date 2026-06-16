# 贡献者指南（Agent Desktop）

谢谢你有意贡献给 Agent Desktop！无论是 bug 修复、新功能、文档改进，还是一个错字——每一份贡献都价值连城。

本项目受 `hermes-desktop` 启发，现以 Cubecloud Agent Desktop 的名义继续开发；贡献应与 Cubecloud 的产品方向与代码规范保持一致。

## 语言

- 英文：`CONTRIBUTING.md`
- 简体中文：`CONTRIBUTING.zh-CN.md`（本文件）
- 日文：`CONTRIBUTING.ja-JP.md`（尚未翻译）

> **说明：**本文件是 Cubecloud Agentic-OS 单仓的贡献者政策。
> 它与内置二进制文件（`cubecloud-desktop/CONTRIBUTING.zh-CN.md`）不同，
> 后者描述二进制文件安装包的贡献者政策。两者通过
> 全局 Windows 硬链接共享英文文件。

## 从这里开始

1. **Fork** 本仓库，并以 fork 仓库在本地克隆。
2. **安装依赖：**

   ```bash
   npm install
   ```

3. **以开发模式启动应用：**

   ```bash
   npm run dev
   ```

## 进行修改

1. 从 `main` 分支创建新分支：

   ```bash
   git checkout -b your-branch-name
   ```

2. 进行修改。保持提交聚焦——每个提交仅包含一项逻辑修改。
3. 提交前运行检查：

   ```bash
   npm run lint
   npm run typecheck
   ```

4. 在本地使用 `npm run dev` 测试你的修改，确保一切照常运行。

## 提交拉取请求

1. 将你的分支推送到你的 fork。
2. 针对上游仓库的 `main` 开启拉取请求。
3. 写明确的描述，说明你改了什么以及为什么。
4. 如果你的 PR 解决了某个已打开的问题，请引用其号（例如 `Fixes #42`）。

### 保持 PR 的精简

请保持 PR 的精简与聚焦——它们更容易被审查与合并。体量过大、混入无关改动的 PR 可能会被要求拆分，甚至不被接受。

- 每个 PR 仅包含一项逻辑改动（一个修复、一个功能、一次重构）。
- 如果你发现自己动了很多无关文件，请拆分成多个 PR。
- 避免在同一 PR 中混入格式 / 风格扫描与功能性改动。
- 更小的 PR 会更快被审查与合并。

维护者会审查你的 PR 并可能要求修改。一旦获批，它会被合并。

## 报告 bug

发现了 bug？[提交 issue](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new)，附上：

- 清晰的标题与描述。
- 复现该问题的步骤。
- 你期望发生什么与实际发生了什么。
- 你的操作系统与应用版本（如果相关）。

## 提出功能请求

有个创意？[提交 issue](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new)，描述：

- 你想解决的问题。
- 你期望它如何工作。
- 你已考虑过的替代方案。

## 项目结构

Cubecloud Agentic-OS 是一个单仓，包含以下主要部分：

- `apps/desktop-shell/` — 活跃的 `@cubecloud/desktop-shell` 工作区。
- `cubecloud-desktop/` — 完整的 Electron 二进制文件（含沉继的 hermes-desktop 框架）。
- `packages/platform-core/` — 单仓全局共享的 TS 类型。
- `docs/handbook/` — 按主题长文：ARCHITECTURE / DEVELOPMENT / OPERATIONS / README。
- `docs/legal/` — TRADEMARK_POLICY、EULA、COMMERCIAL_LICENSE 等法律文件。
- `.agents/skills/` — {{SKILLS_UPSTREAM}} 个技能包，镜像到 `~/.agents/skills/`。

详见仓库根目录下的 `README.md` 与 `docs/HANDBOOK.md`。

## 代码风格

代码风格要求：

- TypeScript：严格模式。避免 `any`，除非有明确理由。
- React 19 与函数组件。优先使用 hooks，而非 class 组件。
- Electron IPC 调用：所有 IPC 渠道必须显式在 `cubecloud-desktop/src/main/ipc/` 下注册。
- 依赖：使用 `npm ci` 以保证与锁定文件一致。不要走 `npm install <package>` 而不同步锁定。
- Lint：提交前运行 `npm run lint`。
- 测试：为 bug 修复与新功能添加单元测试。

## 社区

社区沟通：请先使用 [GitHub Issues](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues)。

代码行为准则：举手之劳，对他人质疑前先默认他们是为了一个合理目的。反馈中对人不负责任。

## 许可

Cubecloud-original 工作以三选一的双许可发布：

- **AGPL-3.0-or-later**（主）
- **Apache-2.0**（兼容选项）
- **MIT**（兼容选项）

沉继的 `hermes-desktop` 框架代码保持原始 MIT 许可。
详见仓库根目录下的 [`LICENSE`](../LICENSE) 与 [`BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)。

## 开发者证书来源（DCO）

所有入库贡献必须遵循 **DCO 1.1** 签名模型。不使用 CLA。
每个提交必须包含一行 `Signed-off-by:`，样例：

```
feat(skills): add 3 promoted user-visible skills at first launch

# Signed-off-by: Your Name <your.email@example.com>
```

使用 `git commit -s` 自动追加该行。如果忘了 `-s`，在推送前使用 `git commit --amend -s` 编辑提交信息。

贡献者代码需要原创作者个人同意（个人贡献）或者是你拥有合法权利提交的作品（工作产出）。

## 报告漏洞

安全报告请遵循 [`SECURITY.md`](../SECURITY.md)—请勿在公开问题中发布凑书、API 密钥、私人日志、个人文档或公共 IP 。
安全修复遵循与功能提交相同的 DCO 签名规则；时闤不是许可证空子。

## 致谢

上游作者与社区贡献者的完整名单位于 [`ACKNOWLEDGMENTS.md`](../ACKNOWLEDGMENTS.md)。
第三方归属目录位于 [`NOTICE`](../NOTICE)。
如果你的贡献基于别人的工作（来自上游项目的修复、来自参考代码库的模式、转述的算法），请在你的提交信息中给予归属，并在必要时将他们加入 `NOTICE`。
