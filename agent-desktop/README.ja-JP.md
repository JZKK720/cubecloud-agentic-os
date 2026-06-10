<p align="center">
  <img width="360" alt="Cubecloud 智方云" src="build/branding/cubecloud-zhifangyun.svg" />
</p>

> **Cubecloud Agent Desktop — デスクトップ版バイナリ向けドキュメント。**
> Agentic-OS モノレポの README は [`../README.md`](../README.md)、
> マスター索引は [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md) にあります。
> ライセンス / ブランド / コントリビューションポリシーは [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md) をご覧ください。


<img width="100%" alt="CUBECLOUD DESKTOP" src="previews/welcome.png" />

<br/>
<p align="center">
  <a href="../docs/HANDBOOK.md"><img src="https://img.shields.io/badge/Docs-HANDBOOK-FFD700?style=for-the-badge" alt="Documentation"></a>
  <a href="https://t.me/hermes_agent_desktop"><img src="https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0%20%7C%20Apache--2.0%20%7C%20MIT-blue?style=for-the-badge" alt="ライセンス: AGPL-3.0 OR Apache-2.0 OR MIT (Cubecloud 独自)；MIT (継承フレームワーク)" /></a>
  <a href="docs/legal/TRADEMARK_POLICY.md"><img src="https://img.shields.io/badge/Trademark-policy-lightgrey?style=for-the-badge" alt="商標ポリシー"></a>
  <a href="SECURITY.md"><img src="https://img.shields.io/badge/Security-policy-lightgrey?style=for-the-badge" alt="セキュリティポリシー"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/Contributing-DCO%201.1-lightgrey?style=for-the-badge" alt="コントリビュート: DCO 1.1"></a>
  <a href="https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/"><img src="https://img.shields.io/badge/Download-Releases-FF6600?style=for-the-badge" alt="Releases"></a>
<a href="https://github.com/cubecloud-contributors/cubecloud-agentic-os/stargazers">
  <img src="https://img.shields.io/github/stars/cubecloud-contributors/cubecloud-agentic-os?style=for-the-badge&color=FFD700&label=Stars" alt="Stars">
</a>
  <a href="https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/">
  <img src="https://img.shields.io/github/downloads/cubecloud-contributors/cubecloud-agentic-os/total?style=for-the-badge&color=00B496&label=Total%20Downloads" alt="Downloads">
</a>
</p>

> **本プロジェクトは現在も活発に開発中です。** 機能は変更される可能性があり、一部が動作しなくなることもあります。問題に遭遇した場合や、アイデアがある場合は[Issue を作成してください](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues)。コントリビューションも歓迎しています！

## 言語

- English: `README.md`
- 简体中文: `README.zh-CN.md`
- 日本語: `README.ja-JP.md`
- 한국어: `README.ko-KR.md`

Cubecloud Desktop は、[Hermes Agent](https://github.com/NousResearch/hermes-agent)（ツール使用、マルチプラットフォームメッセージング、クローズドな学習ループを備えた、自己改善型 AI アシスタント）のインストール・設定・チャットを行うためのネイティブデスクトップコントロールセンターです。

CLI を手作業で管理する代わりに、本アプリではインストール、プロバイダのセットアップ、日常的な利用までを一箇所でガイドします。公式の Hermes インストールスクリプトを使用し、Hermes を `~/.hermes` に保存し、チャット、セッション、プロファイル、メモリ、スキル、ツール、スケジューリング、メッセージングゲートウェイなどを GUI で操作できます。

## プレビュー

以下は現在のデスクトップビルドから取得したフルページキャプチャです。導入前にプロダクトの表面を把握できるよう、インストール手順より先に配置しています。

<table>
<tr>
<td width="50%" align="center"><b>Welcome</b><br/><img width="100%" alt="Welcome" src="previews/welcome.png" /></td>
<td width="50%" align="center"><b>Remote gateway</b><br/><img width="100%" alt="Remote gateway" src="previews/welcome-remote.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>SSH handoff</b><br/><img width="100%" alt="SSH handoff" src="previews/welcome-ssh.png" /></td>
<td width="50%" align="center"><b>Runtime detection</b><br/><img width="100%" alt="Runtime detection" src="previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Chat</b><br/><img width="100%" alt="Chat" src="previews/chat.png" /></td>
<td width="50%" align="center"><b>Sessions</b><br/><img width="100%" alt="Sessions" src="previews/sessions.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Profiles</b><br/><img width="100%" alt="Profiles" src="previews/agents.png" /></td>
<td width="50%" align="center"><b>Persona</b><br/><img width="100%" alt="Persona" src="previews/persona.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Plans</b><br/><img width="100%" alt="Plans" src="previews/plans.png" /></td>
<td width="50%" align="center"><b>CodeGraph</b><br/><img width="100%" alt="CodeGraph" src="previews/codegraph.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>EverOS</b><br/><img width="100%" alt="EverOS" src="previews/everos.png" /></td>
<td width="50%" align="center"><b>Headroom</b><br/><img width="100%" alt="Headroom" src="previews/headroom.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Models</b><br/><img width="100%" alt="Models" src="previews/models.png" /></td>
<td width="50%" align="center"><b>Providers</b><br/><img width="100%" alt="Providers" src="previews/providers.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Skills</b><br/><img width="100%" alt="Skills" src="previews/skills.png" /></td>
<td width="50%" align="center"><b>Memory</b><br/><img width="100%" alt="Memory" src="previews/memory.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Tools</b><br/><img width="100%" alt="Tools" src="previews/tools.png" /></td>
<td width="50%" align="center"><b>Workspace</b><br/><img width="100%" alt="Workspace" src="previews/workspace.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Schedules</b><br/><img width="100%" alt="Schedules" src="previews/schedules.png" /></td>
<td width="50%" align="center"><b>Gateway</b><br/><img width="100%" alt="Gateway" src="previews/gateway.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>MCP</b><br/><img width="100%" alt="MCP" src="previews/mcp.png" /></td>
<td width="50%" align="center"><b>Settings</b><br/><img width="100%" alt="Settings" src="previews/settings.png" /></td>
</tr>
</table>

## インストール

ダウンロード: [Releases ページ](https://github.com/cubecloud-contributors/cubecloud-agentic-os/releases/) から取得してください。

### Windows

> **Windows ユーザーへ:** インストーラはコード署名されていません。初回起動時に Windows SmartScreen の警告が表示されます。「詳細情報」→「実行」をクリックしてください。

> **WSL ユーザーへ:** インストーラが `Switching to root user to install dependencies...` で停止する場合、Playwright が sudo パスワードを待っていますが、読み取るための TTY がありません。インストール中だけパスワードなしの sudo を許可し、完了後に元へ戻してください。
>
> ```bash
> echo "$USER ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/hermes-install
> # …インストーラを再実行し、完了したら:
> sudo rm /etc/sudoers.d/hermes-install
> ```
>
> この既知のインストーラ問題は、Cubecloud への移行中も引き続き調整中です。

### Fedora (RPM)

```bash
sudo dnf install ./cubecloud-desktop-<version>.rpm
```

> **Fedora ユーザーへ:** `.rpm` は GPG 署名されていません。署名検証を強制する設定の場合は、インストールコマンドに `--nogpgcheck` を追加してください。`.rpm` ビルドは自動アップデートに対応していません（`electron-updater` の制約）。アップデートする場合は新しい `.rpm` を再インストールしてください。

## 機能

- **初回起動時のガイド付きインストール** — Hermes Agent のインストールを進捗表示と依存関係解決付きで案内します
- **ローカル / リモートバックエンド** — Hermes をローカル (`127.0.0.1:8642`) で実行するか、URL + API キーを使ってリモートの Hermes API サーバーに接続できます
- **マルチプロバイダ対応** — OpenRouter, Anthropic, OpenAI, Google (Gemini), xAI (Grok), Nous Portal, Qwen, MiniMax, Hugging Face, Groq、そしてローカルの OpenAI 互換エンドポイント (LM Studio, Ollama, vLLM, llama.cpp)
- **ストリーミングチャット UI** — SSE ストリーミング、ツール進捗インジケータ、Markdown レンダリング、シンタックスハイライト対応
- **トークン使用量のトラッキング** — プロンプト / 出力トークン数とコストをチャットフッターにリアルタイム表示。`/usage` スラッシュコマンドも利用可能
- **22 種類のスラッシュコマンド** — `/new`, `/clear`, `/fast`, `/web`, `/image`, `/browse`, `/code`, `/shell`, `/usage`, `/help`, `/tools`, `/skills`, `/model`, `/memory`, `/persona`, `/version`, `/compact`, `/compress`, `/undo`, `/retry`, `/debug`, `/status` など
- **セッション管理** — 全文検索 (SQLite FTS5)、日付別の履歴表示、会話の再開と横断検索
- **プロファイル切り替え** — Hermes 環境を分離した状態で作成・削除・切り替え可能
- **14 のツールセット** — Web、ブラウザ、ターミナル、ファイル、コード実行、ビジョン、画像生成、TTS、スキル、メモリ、セッション検索、Clarify、Delegation、MoA、タスクプランニング
- **メモリシステム** — メモリエントリの閲覧 / 編集、ユーザープロファイルメモリ、容量トラッキング、検出可能なメモリプロバイダ (Honcho, Hindsight, Mem0, RetainDB, Supermemory, ByteRover) に対応
- **ペルソナエディタ** — エージェントの SOUL.md パーソナリティを編集・リセット可能
- **保存済みモデル** — プロバイダごとのモデル設定を CRUD で管理
- **スケジュールタスク** — 分単位 / 時間単位 / 日単位 / 週単位 / カスタム cron に対応する cron ジョブビルダー（15 種類の配信先）
- **16 種類のメッセージングゲートウェイ** — Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email (IMAP/SMTP), SMS (Twilio/Vonage), iMessage (BlueBubbles), DingTalk, Feishu/Lark, WeCom, WeChat (iLink Bot), Webhooks, Home Assistant
- **Hermes Office (Claw3d)** — ビジュアルな 3D インターフェース。開発サーバーとアダプタの管理機能を備える
- **バックアップ、インポート、デバッグダンプ** — 設定画面からデータの完全なバックアップ / リストアとシステム診断が可能
- **ログビューア** — ゲートウェイとエージェントのログを設定画面から直接閲覧
- **自動アップデーター** — electron-updater を使ったアップデートチェックとインストール
- **i18n 対応** — 全画面に対応する英語ロケールを含む国際化フレームワーク。コミュニティ翻訳の受け入れ準備済み
- **テストスイート** — SSE パーサ、IPC ハンドラ、preload API サーフェス、インストーラユーティリティ、定数バリデーションを Vitest で検証

## 動作の仕組み

初回起動時、アプリは次の手順で動作します。

1. Hermes を**ローカル**で動かすか、**リモート**の Hermes API サーバーに接続するかを尋ねます。
2. **ローカルモード:** `~/.hermes` に Hermes が既にインストールされているかを確認します。なければ、依存関係 (Git, uv, Python 3.11+) を解決しつつ公式インストーラを実行します。
3. **リモートモード:** リモート API の URL と API キーを入力させ、接続を検証し、ローカルインストールをスキップします。
4. API プロバイダまたはローカルモデルのエンドポイントを尋ねます。
5. プロバイダ設定と API キーを Hermes の設定ファイルに保存します。
6. セットアップが完了するとメインのワークスペースを起動します。

ローカルモードでは、チャットリクエストは `http://127.0.0.1:8642` 経由で SSE ストリーミングされます。リモートモードでは、設定したリモート URL に対して同じストリーミングプロトコルで通信します。デスクトップアプリはストリームをリアルタイムで解析し、ツール進捗、Markdown コンテンツ、トークン使用量を順次レンダリングします。

## 画面構成

| 画面          | 説明                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------ |
| **Chat**      | ストリーミング会話 UI。スラッシュコマンド、ツール進捗、トークントラッキングに対応         |
| **Sessions**  | 過去の会話の閲覧、検索、再開                                                               |
| **Agents**    | Hermes プロファイルの作成、削除、切り替え                                                  |
| **Skills**    | バンドル済み / インストール済みスキルの閲覧、インストール、管理                            |
| **Models**    | プロバイダごとに保存されたモデル設定の管理                                                 |
| **Memory**    | メモリエントリとユーザープロファイルの閲覧 / 編集、メモリプロバイダの設定                  |
| **Soul**      | アクティブなプロファイルのペルソナ (SOUL.md) を編集                                        |
| **Tools**     | 個別のツールセットを有効化 / 無効化                                                        |
| **Schedules** | 配信先付きの cron ジョブを作成・管理                                                       |
| **Gateway**   | メッセージングプラットフォーム統合の設定と制御                                             |
| **Office**    | Claw3d ビジュアルインターフェースのセットアップと管理                                      |
| **Settings**  | プロバイダ設定、認証情報プール、バックアップ / インポート、ログビューア、ネットワーク、テーマ |

## 対応プロバイダ

### LLM プロバイダ

| プロバイダ          | 備考                                            |
| ------------------- | ----------------------------------------------- |
| **OpenRouter**      | 単一 API で 200 以上のモデルを利用可能（推奨） |
| **Anthropic**       | Claude に直接アクセス                           |
| **OpenAI**          | GPT に直接アクセス                              |
| **Google (Gemini)** | Google AI Studio                                |
| **xAI (Grok)**      | Grok モデル                                     |
| **Nous Portal**     | 無料枠あり                                      |
| **Qwen**            | QwenAI モデル                                   |
| **MiniMax**         | グローバル / 中国向けエンドポイント             |
| **Hugging Face**    | HF Inference 経由で 20 以上のオープンモデル     |
| **Groq**            | 高速推論 (Voice/STT)                            |
| **Local/Custom**    | 任意の OpenAI 互換エンドポイント                |

LM Studio、Ollama、vLLM、llama.cpp 用のローカルプリセットが付属しています。

### メッセージングプラットフォーム

Telegram、Discord、Slack、WhatsApp、Signal、Matrix/Element、Mattermost、Email (IMAP/SMTP)、SMS (Twilio & Vonage)、iMessage (BlueBubbles)、DingTalk、Feishu/Lark、WeCom、WeChat (iLink Bot)、Webhooks、Home Assistant。

### ツール統合

Exa Search、Parallel API、Tavily、Firecrawl、FAL.ai (画像生成)、Honcho、Browserbase、Weights & Biases、Tinker。

## 開発

### 前提条件

- Node.js と npm
- Hermes インストーラ用の Unix 系シェル環境
- 初回起動時に Hermes をダウンロードするためのネットワークアクセス

### 依存関係のインストール

```bash
npm install
```

### 開発モードでアプリを起動

```bash
npm run dev
```

### チェック実行

```bash
npm run lint
npm run typecheck
```

### テスト実行

```bash
npm run test
npm run test:watch
```

### デスクトップアプリのビルド

```bash
npm run build
```

プラットフォーム別パッケージング:

```bash
npm run build:mac
npm run build:win
npm run build:linux
npm run build:rpm    # Fedora/RHEL .rpm のみ
```

## 初回セットアップ

アプリを初めて開くと、既存の Hermes インストールを検出するか、インストールを提案します。

UI でサポートされているセットアップパス:

- `OpenRouter`
- `Anthropic`
- `OpenAI`
- OpenAI 互換 base URL を使った `Local LLM`

以下のローカルプリセットが付属しています。

- LM Studio
- Ollama
- vLLM
- llama.cpp

Hermes のファイルは以下の場所で管理されます。

- `~/.hermes`
- `~/.hermes/.env`
- `~/.hermes/config.yaml`
- `~/.hermes/hermes-agent`
- `~/.hermes/profiles/` — 名前付きプロファイルディレクトリ
- `~/.hermes/state.db` — セッション履歴データベース
- `~/.hermes/cron/jobs.json` — スケジュールタスク

## 技術スタック

- **Electron** 39 — クロスプラットフォームのデスクトップシェル
- **React** 19 — UI フレームワーク
- **TypeScript** 5.9 — main / renderer プロセス間で型安全性を確保
- **Tailwind CSS** 4 — ユーティリティファーストのスタイリング
- **Vite** 7 + electron-vite — 高速な開発サーバーとビルドツール
- **better-sqlite3** — FTS5 全文検索付きのローカルセッションストレージ
- **i18next** — 国際化フレームワーク
- **Vitest** — テストランナー

## 補足

- 本デスクトップアプリはエージェントの動作やツール実行を上流の Hermes Agent プロジェクトに依存しています。
- 内蔵インストーラは公式の Hermes インストールスクリプトを `--skip-setup` 付きで実行し、その後 GUI でプロバイダ設定を完了します。
- ローカルモデルプロバイダには API キーは不要ですが、互換サーバーが事前に起動している必要があります。
- ネットワーク制限のある環境向けに、代替の npm レジストリ経路をサポートしています。

## ライセンス

V2.5 以降、本コードベースは **デュアルライセンス (dual-license)** 構成です：

- **Cubecloud 独自のコード**（レンダラーの再構築、Cubecloud
  ステートレイヤー、V2.3 で追加されたモジュール
  (`src/main/codegraph-runtime.ts`、
  `src/main/everos-sidecar.ts`、`src/main/skills-harness.ts`)、
  `scripts/` 配下のスモーク / キャプチャ / 検証スクリプト、
  `docs/` 配下のアーキテクチャドキュメント、新規追加された
  Cubecloud ブランドアセット）は、**AGPL-3.0-or-later**、
  **Apache-2.0**、**MIT** のいずれかを選択可能な形で提供
  されます。3 つのライセンスは **択一**（消費者が選ぶ）
  であり、累積ではありません。AGPL-3.0-or-later が **主
  選択肢**、Apache-2.0 と MIT が互換性目的の **副選択肢**
  です。各ファイルには同じ SPDX 式を指す
  `SPDX-License-Identifier` ヘッダーが付いています。
- **継承された `hermes-desktop` フレームワークのコード**は
  上流の MIT 条項のままです。事後的に制限を課すことは
  できず、上記デュアルライセンスは Cubecloud 独自のコードに
  のみ適用されます。

3 つのライセンスの本文はリポジトリ内に同梱されています
（`licenses/` 配下：`licenses/AGPL-3.0.txt`、
`licenses/Apache-2.0.txt`、`licenses/MIT.txt`）。これにより
再配布者がネットワークから取得せず同梱できます。法的拘束力を
持つ本文は [`LICENSE`](LICENSE) を、パスごとの内訳は
[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) を参照
してください。

> **商標、ホスティングサービス、有料機能はコードライセンスの
> 対象外です。** Cubecloud の名称、ロゴタイプ、ワードマーク、
> マーク SVG、スプラッシュアセット、アプリアイコンセット、
> スクリーンショット、ホスティング階層、有料機能は、それぞれ
> [`docs/legal/TRADEMARK_POLICY.md`](docs/legal/TRADEMARK_POLICY.md)、
> [`docs/legal/CUBECLOUD-EULA.md`](docs/legal/CUBECLOUD-EULA.md)、
> [`docs/legal/PAID_SERVICES_TERMS.md`](docs/legal/PAID_SERVICES_TERMS.md)、
> [`docs/legal/COMMERCIAL_LICENSE.md`](docs/legal/COMMERCIAL_LICENSE.md)
> に従います。3 つのコードライセンスのいずれも、Cubecloud
> 商標の権利を黙示的に付与するものでは **ありません**。

> **商用再ライセンス。** AGPL-3.0 §13 のネットワークソース
> 開示義務を回避した形で Cubecloud 派生のネットワークサービス
> を運営したい場合は、
> [`docs/legal/COMMERCIAL_LICENSE.md`](docs/legal/COMMERCIAL_LICENSE.md)
> を参照してください。

## 謝辞

`hermes-desktop`、`@colbymchenry/codegraph` SDK、`everos`
Python CLI、デザインリファレンスとして参照した Odysseus /
opencode / llmfit / Tongyi DeepResearch プロジェクト、npm
ランタイム依存、フォント、より広範なオープンソースコミュニティ
への完全な謝辞は [`ACKNOWLEDGMENTS.md`](ACKNOWLEDGMENTS.md) を
参照してください。パッケージ単位の帰属カタログは
[`NOTICE`](NOTICE) を参照してください。

## コントリビューション

コントリビューションを歓迎します！始め方は[コントリビューション
ガイド](CONTRIBUTING.md)をご覧ください。**受け入れるコントリ
ビューションは DCO 1.1 署名モデル**に従います（各コミットに
`Signed-off-by:` 行が必須です。詳細は `CONTRIBUTING.md` の
"Developer Certificate of Origin (DCO)" セクションを参照）。
どこから手を付ければよいか分からない場合は、
[Open Issues](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues)
を確認してください。バグを見つけた、または機能要望がある場合は
[Issue を作成してください](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new)。
**セキュリティ問題は [`SECURITY.md`](SECURITY.md) に従って
報告してください**。公開 issue にシークレット、API キー、
プライベートなログを貼り付けないでください。

## 関連プロジェクト

コアエージェント、ドキュメント、CLI ワークフローについては、Hermes Agent 本体のリポジトリを参照してください。

- https://github.com/NousResearch/hermes-agent
