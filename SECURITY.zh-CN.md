# 安全政策

## 受支持的版本

| 版本 | 受支持状态 |
|---------|-----------|
| 0.6.x   | ✅ 是（正在开发） |
| 0.5.x   | ⚠️ 仅提供严重修复，截至 2026-09-30 |
| < 0.5   | ❌ 已停止维护 |

`main` 分支与 `dev` 分支都会收到安全修复；
大多数用户运行的是绋选后的 `main` 分支。
预发布版本（`*-rc.*`、`*-beta.*`）不在安全支持范围内。

## 部署指南

桌面端具有特权本地能力：请求 shell 、读写文件、下载模型、
网络研究、邮件 / 日历集成、API 令牌，
以及一个运行外部二进制文件的辅助进程。**请将其当作管理员控制台。**

- 将本地开发运行绑定到 `127.0.0.1`；若要暴露公共互联网，
  请务必启用 HTTPS + 可信任的反向代理或私有访问层。
- 若你创建 fork 并重新品牌，请遵循 [`docs/legal/TRADEMARK_POLICY.md`](docs/legal/TRADEMARK_POLICY.md) 
  中的打包 / 发布规则。一个保留原始 Cubecloud 标记的 fork，
  在我们的法律视角下就是一个 Cubecloud 发布物；请勿将其对外表述为无关产品。
- 将 `.env`、`HERMES_HOME/`、`data/`、`logs/`、数据库、上传文件、
  生成的媒体、备份、认证 / 会话文件、API 密钥、
  模型 / 提供者令牌保持在 Git 与私有人分享之外。
  他们默认已被忽略。
- 首次启动后检查凭证池（`HERMES_HOME/<profile>/auth.json`）：
  除非你有意开放注册，请关闭它；
  只保留你自己的账号为管理员，并保持演示 / 测试账号为非管理员。
- 非管理员用户默认不获得 shell / Python / 文件读写。
  仅限管理员的路由与工具（MCP 管理、API 令牌、
  Webhook、模型 / 菜单服务、备份 / 保险厣、应用设置）被
  限定为管理员。
  其他功能受每用户特权控制——在暴露部署前请检查每个用户的特权。
- 转换任何曾被粘贴过到共享聊天、演示、截图或日志的 API 密钥或令牌。
- 若启用 API 令牌或 Webhook，请为每个集成独立创建令牌，并删除未使用的。
- 可选辅助进程（CodeGraph、EverOS）默认绑定到本地环回，
  除非你有意提供局域网访问。EverOS 辅助进程有一个自动重启上限（
  60 秒内最多 5 次崩溃），用于在错误配置下抑制无限重启循环。
- 桌面端可能绑定或连接的常见内部端口：
  app `7000`（默认，可配置）、可选 CodeGraph SDK（懒加载，
  无默认端口，使用本地 SQLite）、可选 EverOS 辅助进程 `1995`（仅在用户
  安装了 `everos` Python wheel 并启动后使用）、Ollama `11434`（仅在用户运行了
  Ollama 时），以及 `8000-8020` 范围内的其他本地模型 / 提供者 API。
  桌面端**不打包**、不发布、不安装也不管理这些服务，
  仅读取其 HTTP 协议。
  详见 `NOTICE` §"Interoperated services"。

## 发布 fork

推送公开 fork 之前，请运行：

```bash
git status --short
git check-ignore -v .env HERMES_HOME/ data/auth.json state.db logs/
git grep -n -I -E \\
  "(sk-[A-Za-z0-9_-]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{20,}|Bearer [A-Za-z0-9._~+/-]{20,})" -- . \\
  ':!node_modules/**' ':!dist/**' ':!out/**' ':!package-lock.json'
```

仅 `.env.example`、`LICENSE`、`NOTICE`、`BRANDING_AND_LICENSE.md`、文档、源码、测试与静态资源应被提交。
从不提交现场 `.env` 值、`data/` 内容、本地数据库、上传文件、
生成的媒体、日志、备份、认证 / 会话文件、API 密钥、
模型 / 提供者令牌、密码哈希或个人身份信息。

## 报告漏洞

请发送邮件至项目维护者以获得货币 / 重现贤励。
不要在公开 issue 中发布漏洞详情，除非他们已被公开。
报告中请包含：

- 受影响的软件版本、部署设置与运行时。
- 重现路径（concept of proof 、PoC 代码、截图）。
- 估计的影响范围与严重性。
- 联系方式（加密邮件优先）。

我们会在 90 天内首次响应。
同一漏洞可能同时影响多个项目时，优先级以公开调查发布日期为准。

## 安全更新政策

重要安全修复会在最新的重要里程碑后推送。
主分支上的 HEAD 始终可信任。
最近的重要里程碑表位于仓库顶部。
查看最新状态的一个快捷方式是查看 [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) 中的
`## V2.X transitions landed` 区段。

## 合作披露

本项目不接受静态分析，不追踪使用以改进产品，
也不向第三方分享可识别信息。
如果你希望为某个部署启用上报能力，
请以可选依赖的形式提供（如自托管的邮件中转发器）。

## 证明

本项目由 Cubecloud Contributors 以 **AGPL-3.0-or-later / Apache-2.0 / MIT** 发布，
详见 [`LICENSE`](LICENSE) 与 [`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md)。
本文件不对本项目的安全作出任何式式或隐含承诺。
最终解释权归项目维护者与贡献者所有。
