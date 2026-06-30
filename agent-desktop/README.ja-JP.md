<p align="center">
  <img width="360" alt="Cubecloud" src="build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agent Desktop — バイナリ

> **これはデスクトップバイナリのインストールと機能のドキュメントです。** agentic-OS モノレポの README は
> [`../README.md`](../README.md) に、「これは何であるか、なぜこのようになっているか、次に何を見るべきか」の総合インデックスは
> [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md) にあります。

Cubecloud Agent Desktop は、ネイティブの Electron デスクトップで、単一オペレーターに対し**ランタイム選択**、**プロバイダー選択**、**スキル**、**メモリ**、**スケジュール**、**オプションのコードインテリジェンス**を統合したコントロールプレーンを提供します。ホスト型ラッパーや単一ベンダ CLI にワークフローを縛り付けません。

**最新リリース：[v2.10.73](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73)** —
MCP レジストリ刷新：Firecrawl が Tavily を置き換え（キーレス枠、セルフホスト可能）、
SkillSpector と OpenKnowledge を追加、Qdrant はローカル Docker がデフォルト（API キー不要）。

## ユーザーに見えるもの

- 初回起動時の**マルチラuntimeピッカー** — Hermes（デフォルト、ポート 8642）、IronClaw（ゲートウェイ引き渡し、ポート 3231）、OpenClaw（オプション、ポート 18789）。ランタイム選択とプロバイダー選択は独立した決定です。
- **プロバイダーレイヤー** — ローカルプロバイダー（Ollama、LM Studio、vLLM、llama.cpp、あらゆる OpenAI 互換エンドポイント）とリモート API（OpenAI、Anthropic、Google Gemini、Azure OpenAI、OpenRouter、その他オペレーター独自のゲートウェイ）に接続。
- **Models ページ** — `127.0.0.1` 上のローカルサーバーをスキャンし、Ollama / LM Studio をワンクリックで提案。各カードに 30 秒間隔のプローブによるヘルスドットを表示。
- **チャット UI** — SSE ストリーミング、Markdown レンダリング、シンタックスハイライト、トークン使用量のフッター表示。
- **セッション管理** — 全文検索（SQLite FTS5）、日付グルーピング履歴、会話横断の復元と検索。
- **プロファイル切替** — プロバイダー、セッション、状態をプロファイルごとに分離。
- **Sandbox Tasks 画面**（V2.10.65） — IronClaw WASM サンドボックスワークフロー向け。
- **オプション sidecar** — CodeGraph（セマンティックコード解析）、EverOS（メモリ + ハーネス）、Headroom（コンテキスト圧縮）。いずれもユーザー主導で有効化し、サイレントインストールはしません。
- **スキル、メモリ、スケジュール、カンバン、プラン**の各画面 — ユーザーが確認できる JSON レジストリで支えられています。
- **自動アップデータ** — `electron-updater` 経由で本リポジトリの GitHub Releases フィードを参照。
- **i18n** — i18next により 9 ロケールを配線。

## プレビュー

以下の各画像は現在のデスクトップビルドの全ページキャプチャです。ギャラリーは初回起動、ランタイム検出、サイドバーで公開されている主要なオペレーター画面を網羅しています。

<table>
<tr>
<td width="50%" align="center"><b>ようこそ &amp; 初回起動</b><br/><img width="100%" alt="ようこそ" src="previews/welcome.png" /></td>
<td width="50%" align="center"><b>リモートゲートウェイ接続</b><br/><img width="100%" alt="リモートゲートウェイ" src="previews/welcome-remote.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>SSH トンネル引き渡し</b><br/><img width="100%" alt="SSH 引き渡し" src="previews/welcome-ssh.png" /></td>
<td width="50%" align="center"><b>ランタイム検出</b><br/><img width="100%" alt="ランタイム検出" src="previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>チャット（SSE ストリーミング）</b><br/><img width="100%" alt="チャット" src="previews/chat.png" /></td>
<td width="50%" align="center"><b>セッション（SQLite FTS5）</b><br/><img width="100%" alt="セッション" src="previews/sessions.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>プロファイル</b><br/><img width="100%" alt="プロファイル" src="previews/agents.png" /></td>
<td width="50%" align="center"><b>ペルソナ（レガシー）</b><br/><img width="100%" alt="ペルソナ" src="previews/persona.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>プラン</b><br/><img width="100%" alt="プラン" src="previews/plans.png" /></td>
<td width="50%" align="center"><b>CodeGraph（オプション sidecar）</b><br/><img width="100%" alt="CodeGraph" src="previews/codegraph.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>EverOS（オプション sidecar）</b><br/><img width="100%" alt="EverOS" src="previews/everos.png" /></td>
<td width="50%" align="center"><b>Headroom（オプション sidecar）</b><br/><img width="100%" alt="Headroom" src="previews/headroom.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>Models（Ollama + LM Studio スキャン）</b><br/><img width="100%" alt="Models" src="previews/models.png" /></td>
<td width="50%" align="center"><b>プロバイダー</b><br/><img width="100%" alt="プロバイダー" src="previews/providers.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>スキル</b><br/><img width="100%" alt="スキル" src="previews/skills.png" /></td>
<td width="50%" align="center"><b>メモリ</b><br/><img width="100%" alt="メモリ" src="previews/memory.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>ツール</b><br/><img width="100%" alt="ツール" src="previews/tools.png" /></td>
<td width="50%" align="center"><b>ワークスペース</b><br/><img width="100%" alt="ワークスペース" src="previews/workspace.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>スケジュール</b><br/><img width="100%" alt="スケジュール" src="previews/schedules.png" /></td>
<td width="50%" align="center"><b>ゲートウェイ</b><br/><img width="100%" alt="ゲートウェイ" src="previews/gateway.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>MCP</b><br/><img width="100%" alt="MCP" src="previews/mcp.png" /></td>
<td width="50%" align="center"><b>設定</b><br/><img width="100%" alt="設定" src="previews/settings.png" /></td>
</tr>
</table>

## Skills エコシステム —— 3 層構成

Skills サーフェスは、互いに独立した 3 つのスキルツリーから成り立ちます。それぞれライフサイクルが異なり、**重複は意図的に存在しません**。対象読者と目的が異なります。

### 第 1 層 —— デスクトップ内蔵（28 スキル、asar に同梱）

これらは初回起動時に **Skills → Browse** タブに表示されるスキルです。パッケージ済みバイナリ内の `agent-desktop/.agents/skills/<name>/SKILL.md` に置かれているため、ユーザーがデスクトップをインストールした瞬間からオフラインで利用可能です。

**5 件の新規運用者向けスキル（V2.10.71）：**

| スキル | 運用者が使うべき場面 |
|---|---|
| `first-5-minutes` | 「初めてです」「どこから始めればいいですか」「インストールしたばかりです」—— ランタイム選択、プロバイダ接続、初回チャットまでの手順 |
| `runtime-attach` | 「ランタイムが繋がらない」「ECONNREFUSED 127.0.0.1:8642」—— attach 失敗時に確認すべき 5 項目（Hermes / IronClaw / OpenClaw） |
| `models-page-scan` | 「Models ページに Ollama が出てこない」「ヘルスランプが赤い」—— ループバックスキャン、ヘルスプローブ、LAN オプトイン |
| `sidecar-setup` | 「CodeGraph / EverOS / Headroom の入れ方」—— 任意の 3 つの sidecar、profile ごとにオプトイン |
| `session-search` | 「X に関する自分のチャットを探したい」「過去のセッションを検索」—— SQLite FTS5 のパターン、できること／できないこと |

**既存の 23 スキル（ランタイム統合から引き継ぎ）：**

| カテゴリ | スキル |
|---|---|
| ランタイムパターン | `hermes-agent`、`hermes-imports`、`openclaw-persona-forge` |
| エンジニアリング習慣 | `karpathy-guidelines`、`careful`、`continuous-learning-v2`、`learn`、`eval-harness`、`freeze` |
| Electron 専用 | `electron-pro`、`windows-desktop-e2e` |
| デザインと品質 | `design-taste-frontend` |
| ワークフロー | `plan-tune`、`wiki-conventions`、`kanban-task-shape`、`diff-overlay-writer` |
| メタハーネス | `agent-harness-construction`、`autonomous-agent-harness`、`agentic-engineering` |
| ツール | `markitdown-mcp`、`office-hours`、`investigate` |

ユーザーはこれらを 1 クリックでインストールできます。新規 5 件の運用者向けスキルは Browse タブで `source: "bundled-desktop"` フラグと frontmatter の `source: "cubecloud"` タグが表示され、デスクトップ向けに新規執筆されたか上流由来かを区別できます。

### 第 2 層 —— Hermes 内蔵（ランタイム導入時に追加）

Hermes ランタイムをインストールすると（初回ローカル導入時）、デスクトップは hermes-agent リポジトリ内に同梱されているスキルを検出します。配置先は `<HERMES_REPO>/skills/<category>/<name>/SKILL.md`。これらは Skills → Browse タブにデスクトップ内蔵分と一緒に表示され、`source: "bundled"` タグが付きます。数は Hermes のバージョンにより変動し、ランタイム導入後は概ね 100+ 件になります。

### 第 3 層 —— Monorepo 開発者向け（{{SKILLS_TOTAL}} スキル、ソースのみ）

ルート `.agents/skills/` には {{SKILLS_REPOS}} 個の上流リポジトリから適合された {{SKILLS_TOTAL}} 件のスキルがあります。これらは**バイナリには同梱されません**。本 monorepo 内で Copilot / Claude Code / 他のエージェントを動かす貢献者向けにソースツリー内に存在します。デスクトップからは見えず、エンドユーザー向けではなく貢献者向けです。

スキルごとの全明細は monorepo README の ["What ships in this repo"](../README.md#what-ships-in-this-repo) を参照してください。

## インストール

最新の安定版インストーラーは **v2.10.73** です。公開先：
<https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73>。
過去のリリースは
[Releases ページ](https://github.com/JZKK720/cubecloud-agentic-os/releases)
に掲載。v0.6.0 と v0.6.1 は廃止済みの `apps/desktop-shell/` ラッパーツリーからビルドされたため、プレリリースとしてマークされています。**v2.10.73 以降を使用してください**。

### Windows

[v2.10.73 リリース](https://github.com/JZKK720/cubecloud-agentic-os/releases/tag/v2.10.73)
から `cubecloud-agent-desktop-2.10.73-setup.exe` をダウンロードして実行してください。NSIS インストーラーはユーザーごとにワンクリックで、Windows の「プログラムと機能」に `cubecloud-agent-desktop` を登録します。

> **Windows ユーザーへ：** インストーラーはコード署名されていません。Windows SmartScreen が初回起動時に警告を表示します。**詳細情報** → **実行** をクリックしてください。コード署名は既知のフォローアップ項目です。企業証明書を含む OEM ビルドパスは
> [`../docs/legal/COMMERCIAL_LICENSE.md`](../docs/legal/COMMERCIAL_LICENSE.md) を参照してください。

インストーラーを避けたい場合は `cubecloud-agent-desktop-2.10.73-portable.exe` をダウンロードしてください。インストール不要の単一ファイル版です。

### macOS / Linux

`electron-builder` は macOS（`.dmg`）と Linux（`.deb`、`.rpm`、`.AppImage`、`.snap`）ターゲットを生成できますが、本リポジトリの CI パイプラインは現時点で Windows アーティファクトのみを出力します。マルチプラットフォーム CI はフォローアップであり、App Store Connect、コード署名、Linux ストアの資格情報をリポジトリ設定に追加する必要があります。

## 仕組み

初回起動時に、アプリは次の手順を踏みます：

1. エージェントを**ローカル**で実行するか（`127.0.0.1:<port>` でランタイムを起動）、HTTPS 経由で**リモート**ゲートウェイに接続するか、SSH トンネルで**SSH フォワード**するかを尋ねます。
2. **ローカルモード：** 選択したランタイムが既に動作しているかを確認します。動作していない場合は、依存関係解決と進捗表示付きで公式インストーラーを実行します。
3. **リモート / SSH モード：** ゲートウェイ URL の入力を求め、HTTPS 経由で `/v1/models` エンドポイントを検証し、ローカルインストールをスキップします。
4. **プロバイダー**（ローカルモデルエンドポイントまたはリモート API）の入力を求め、認証情報をプロファイル単位の資格情報プールに保存します。
5. セットアップ完了後にメインワークスペースを起動します。

ローカルモードでは、チャットリクエストは SSE ストリーミングで `http://127.0.0.1:8642`（Hermes）または `http://127.0.0.1:3231`（IronClaw）へ送られます。リモートモードでは、同じストリーミングプロトコルで設定されたリモート URL と通信します。レンダラーはストリームをリアルタイムで解析し、ツールの進捗、Markdown コンテンツ、トークン使用量を順次描画します。

## サポートされるランタイムとプロバイダー

### ランタイムプロバイダー（3 種類）

| ランタイム | 役割 | デフォルトポート | 統合モード |
|---|---|---|---|
| **Hermes** | デフォルトのコアランタイム | 8642 | `native-core` |
| **IronClaw** | WASM サンドボックスゲートウェイ引き渡しレーン | 3231 | `optional-bridge` |
| **OpenClaw** | オプションの将来レーン | 18789 | `optional-runtime` |

Hermes と IronClaw が現在のレーンです。OpenClaw はランタイムピッカーから選択可能ですが、オプションのアタッチターゲットとして提供されます。

### プロバイダー種別（ループバック / リモート）

- **ローカル / ループバック：** Ollama、LM Studio、vLLM、llama.cpp、および `127.0.0.1` 上で動作するあらゆる OpenAI 互換エンドポイント。Models ページ（V2.10.60）がこれらをスキャンし、ワンクリックで提案します。
- **リモート（HTTPS）：** OpenAI、Anthropic、Google Gemini、Azure OpenAI、OpenRouter、その他オペレーターが設定する OpenAI 互換 API。

ローカルサーバー探索はデフォルトでループバックのみです。LAN ホストを含めるには、レンダラーの `scanLocalServers` 呼び出しに `extraHosts` 引数を渡して有効化します。

## オプション sidecar（ユーザー主導、内蔵なし）

- **CodeGraph**（`pip install codegraph` + `codegraph init`） — セマンティックコード解析パス。詳細は
  [`../docs/CODEGRAPH-RUNTIME.md`](../docs/CODEGRAPH-RUNTIME.md)。
- **EverOS**（`pip install everos`） — メモリ + ハーネス sidecar。詳細は
  [`../docs/EVEROS-SIDECAR.md`](../docs/EVEROS-SIDECAR.md)。
- **Headroom**（`pip install headroom-ai`） — コンテキスト圧縮プロキシ。詳細は
  [`../docs/agent-skills-bundle/HEADROOM.md`](../docs/agent-skills-bundle/HEADROOM.md)
  およびリポジトリ同梱のワークフロースキル
  [`../.github/skills/headroom-workflow/`](../.github/skills/headroom-workflow/)。

これらはすべて任意です。サイドカーなしでもデスクトップは完全に動作します。統合はユーザー単位で opt-in です。

## 開発

### 前提条件

- Node.js 22（`.github/workflows/ci.yml` で固定されたバージョン）
- npm 10+（Node 22 同梱）
- Windows 10/11 — NSIS / ポータブルビルドターゲット用
- Unix 系シェル — 開発モード（macOS、Linux、WSL で動作）

### 依存関係のインストール

```bash
cd agent-desktop
npm install
```

インストールは `agent-desktop/node_modules/` に 930 個のランタイムパッケージを配置します。これは**スタンドアロンインストール**であり、モノレポルートはデスクトップの `node_modules/` を管理しません。

### 開発モードでの起動

```bash
cd agent-desktop
npm run dev
```

`electron-vite dev` が、ホットリロード対応の Vite レンダラー、自動再起動対応の Electron メインプロセス、preload ブリッジを起動します。

### 注目テストの実行

```bash
cd agent-desktop
npm run test
```

フルスイートは約 95 個の Vitest ファイルです。CI ではリリースをゲートする 3 件のテスト（`App.gateway.dom.test.tsx`、`App.kanban.dom.test.tsx`、`runtimeSessions.test.ts`）を実行します。

### Windows インストーラーのビルド

```bash
cd agent-desktop
npm run build:win
```

`electron-builder` が `agent-desktop/dist/` 配下に NSIS インストーラーとポータブル版を生成します。Windows が必要です。

### パッケージ済み asar の検証

```bash
cd agent-desktop
npm run verify:bundle
```

`release-bundle.test.ts` スイートを実行し、asar に期待される `node_modules/`、`out/main/index.js`、`out/preload/index.js` の各エントリと、`BrowserWindow` / `createWindow` / `whenReady` 参照の存在を検証します。

## 次にどこを見るか

- **agentic-OS モノレポ README** — [`../README.md`](../README.md)
- **統合ハンドブック** — [`../docs/HANDBOOK.md`](../docs/HANDBOOK.md)（1 画面ツアー）
- **長編の分野別ドキュメント** — [`../docs/handbook/`](../docs/handbook/)（アーキテクチャ、開発、オペレーション）
- **ライセンス / ブランド** — [`../LICENSE`](../LICENSE) と [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md)
- **ライブ / スクラッチパッド / ミラー索引** — [`../docs/RETIRED_AND_LEGACY.md`](../docs/RETIRED_AND_LEGACY.md)
- **スキルエコシステム** — [`../.agents/skills/README.md`](../.agents/skills/README.md)（{{SKILLS_UPSTREAM}} 個のスキル、`~/.agents/skills/` にミラー）
- **ランタイムオーケストレーション詳細** — [`../docs/handbook/ARCHITECTURE.md`](../docs/handbook/ARCHITECTURE.md#runtime-orchestration-deep)
- **Hermes / IronClaw / OpenClaw アタッチ smoke** — [`../docs/hermes-agent-attach.smoke.md`](../docs/hermes-agent-attach.smoke.md) と [`../docs/ironclaw-attach.smoke.md`](../docs/ironclaw-attach.smoke.md)

## ライセンス

Cubecloud 独自の成果物は **AGPL-3.0-or-later、Apache-2.0、MIT** のいずれかを任意に選択するデュアルライセンスです。Cubecloud 独自モジュールをホストする継承された `hermes-desktop` フレームワークコードは、ハード MIT のままです。パス単位の内訳とバージョン単位の移行履歴は [`../LICENSE`](../LICENSE) と [`../BRANDING_AND_LICENSE.md`](../BRANDING_AND_LICENSE.md) を参照してください。
