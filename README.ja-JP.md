<p align="center">
  <img width="540" alt="Cubecloud" src="agent-desktop/build/branding/cubecloud-logo.svg" />
</p>

# Cubecloud Agentic-OS 日本語ドキュメント（ja-JP）

[English](README.md) · [简体中文](README.zh-CN.md) · **日本語** · [한국어](README.ko-KR.md)

> **移植性、監査可能性、そしてより低いAI運用コストを求めるチームのための、ローカルファーストのエージェントデスクトップと運用モデル。**
> Cubecloudは、ランタイム、プロバイダー、スキル、メモリ、スケジュール、
> オプションのコードインテリジェンスを一つのコントロールプレーンに統合し、
> ユーザーのマシンをホスト型ラッパーの thin client に変えません。

Cubecloud Agentic-OS は **Cubecloud Agent Desktop** とその運用モデルのモノレポです。
デスクトップバイナリは [`agent-desktop/`](agent-desktop/) にあります。
Cubecloudオリジナルのコントロールプレーン、プレローンチバンドル、開発時スキルエコシステムは
[`apps/desktop-shell/`](apps/desktop-shell/)、
[`packages/platform-core/`](packages/platform-core/)、[`.agents/`](.agents/) にあります。

4行でまとめると：

- プロンプト、スキル、メモリ、ランタイム選択をファイル、SQLite、明示的なローカルコントラクトに保存します。
- 日常的な反復作業は可能な限りローカルで実行し、有料のリモート推論は本当に価値のあるターンにのみ使用します。
- ランタイムとプロバイダーを切り替えても、運用モデル全体を書き直す必要はありません。
- 開発者とオペレーターに、CLIやブラウザタブ、ベンダーダッシュボードの寄せ集めではなく、一つのデスクトップコントロールプレーンを提供します。

## プレビュー

以下は、デスクトップ主要表面の厳選ギャラリーです。初めて読む方がアーキテクチャ章を読む前に確認すべき画面を集めています。
各画像は現在のデスクトップビルドの全ページキャプチャです。オンボーディング、ランタイム検出、サイドバーで公開されているすべての主要オペレーター面を網羅した 22 枚のフルギャラリーは
[`agent-desktop/README.md`](agent-desktop/README.md#preview) にあります。

<table>
<tr>
<td width="50%" align="center"><b>ようこそ &amp; 初回起動</b><br/><img width="100%" alt="ようこそ" src="agent-desktop/previews/welcome.png" /></td>
<td width="50%" align="center"><b>ランタイム検出</b><br/><img width="100%" alt="ランタイム検出" src="agent-desktop/previews/runtime-detection.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>チャット</b><br/><img width="100%" alt="チャット" src="agent-desktop/previews/chat.png" /></td>
<td width="50%" align="center"><b>プロフィール &amp; エージェント</b><br/><img width="100%" alt="エージェント" src="agent-desktop/previews/agents.png" /></td>
</tr>
<tr>
<td width="50%" align="center"><b>ゲートウェイ（16 プラットフォーム）</b><br/><img width="100%" alt="ゲートウェイ" src="agent-desktop/previews/gateway.png" /></td>
<td width="50%" align="center"><b>設定 &amp; 制御</b><br/><img width="100%" alt="設定" src="agent-desktop/previews/settings.png" /></td>
</tr>
</table>

## チームがCubecloudを採用する理由

Cubecloudは、デスクトップ製品の利便性を求めつつも、スタックのコントロール面を手放したくないチームのためのものです。

| 成果 | Cubecloudの実現方法 |
|---|---|
| 最初の価値あるセッションまでの時間短縮 | プレローンチバンドルにメモリシード、無効化されたハーネス、無効化されたスケジュール、スターターかんばんボードが含まれており、初回起動が空のシェルではありません。 |
| 運用コストの低減 | ローカルファーストレーンが下書き、検索、オーケストレーション、反復を既存のハードウェアで処理し、リモートのフロンティアモデルはオプションのままです。 |
| ベンダーリスクの低減 | ランタイム選択とプロバイダー選択は別々の決定であるため、モデルやベンダーの変更は再設定イベントであり、システムの書き直しではありません。 |
| 再現可能なオペレーターワークフロー | スキル、スケジュール、プロバイダー定義、状態は、ホスト型ブラックボックスではなく、検査可能なファイル、SQLite、明示的なIPCサーフェスに保存されます。 |
| 調達・法務レビューの容易さ | Cubecloudオリジナル作品はAGPL-3.0-or-later、Apache-2.0、MITの3択で提供され、継承フレームワークはMITのままであり、パスレベルの来歴が明確に文書化されています。 |

## ローカルファーストが優位である理由

ここでの「ローカルファースト」はマーケティング用語ではなく、コントロールプレーンの所在、コスト構造、障害の検査可能性に関する明確な選択です。

| 判断軸 | ホスト型ラッパーのデフォルト | Cubecloudのローカルファーストモデル |
|---|---|---|
| コントロールプレーン | ベンダーアカウント、ベンダーUI、ベンダー維持ループ | ローカルユーザーの管理下にあるネイティブデスクトップ |
| コスト構造 | シート料金 + トークン料金 + ラッパー経済 | 日常業務は可能な限りローカルハードウェアで処理し、リモートコストは本当に価値を生む場合のみ発生 |
| 状態と来歴 | 履歴とオーケストレーション状態は主にホスト製品内に留まる | プロンプト、スキル、スケジュール、メモリは検査・再現可能 |
| ランタイム変更 | 多くの場合、製品の切り替えまたはベンダー抽象化の制限を受け入れることを意味する | ランタイムピッカーが操作面を安定させつつ、基盤ランタイムの進化を許容 |
| プロバイダー変更 | 通常はベンダーファースト、BYOKは二次的 | プロバイダーレイヤーは明示的で、ランタイムレイヤーから分離 |
| 障害復旧 | ベンダーの修正を待つか、限られたログを確認 | ローカル状態、ログ、設定、IPC境界を直接検査 |

**BYOKは調達管理です。ローカルファーストは運用モデルです。**
BYOKが変えるのは請求書の宛先です。ローカルファーストが変えるのは、そのワークフローがそもそもどれだけの有料リモート作業を必要とするかです。

## 誰のためのものか

Cubecloudは以下のようなチームやオペレーターに特に適しています：

- セキュリティレビュー、来歴レビュー、ロールバックパスを必要とする内部エージェントツールを構築するチーム。
- クライアントごとに異なるエージェントスタックを提供する必要があり、すべてのデプロイを同じホスト型ラッパーに結合したくないコンサルティング会社やプラットフォームチーム。
- デスクトップの利便性を求めつつ、ローカルランタイムの制御を手放したくない開発者。
- 高頻度の反復作業をローカルに保ち、必要な場合にのみリモートモデルを使用したいコスト意識の高いオペレーター。

純粋なブラウザ製品、ホスト型SaaSコントロールプレーン、またはモデルベンダーにランタイムライフサイクル全体を任せたい場合は、最適な選択肢ではありません。

## このリポジトリが提供するもの

このモノレポが提供するのは、デスクトップバイナリだけではありません。

- [`agent-desktop/`](agent-desktop/) はエンドユーザーに提供される完全なElectronデスクトップです。
- [`apps/desktop-shell/`](apps/desktop-shell/) はCubecloudオリジナルの状態層とコントロールプレーンワークスペースです。
- [`packages/platform-core/`](packages/platform-core/) は共有TypeScriptコントラクトを保持します。
- [`.agents/skills/`](.agents/skills/) には8つのアップストリームリポジトリから適応された35の第一級オープンソーススキルが含まれ、`~/.agents/skills/` にミラーリングされます。
- [`docs/`](docs/) はハンドブック、脅威モデル、ランタイム計画、法的ポリシー、移行履歴を保持します。

デスクトップの初回起動時に、ユーザーは以下を得ます：

- React 19、i18next、Vite、electron-builderで構築されたネイティブElectronデスクトップ。
- マルチランタイムピッカー：現在はHermes、今後OpenClawとIronClawが追加レーンとして計画されています。
- ランタイムレイヤーから分離されたプロバイダーレイヤー。Ollama、vLLM、llama.cppなどのローカルプロバイダー、またはOpenAI互換のリモートAPIに接続可能。
- 初回起動時からユーザーに表示される3つのスキル：`cubecloud-persona`、`cubecloud-onboarding`、`cubegraph-code-intel`。
- メモリシード、ハーネスプレースホルダー、スケジュールプレースホルダー、スターターかんばんボードを含むプレローンチ運用コンテキスト。
- ユーザーが明示的に有効化するオプションのCodeGraphおよびEverOS統合（サイレント自動インストールではありません）。

**行わない**こと：

- モデルサーバー**ではありません**。推論をバンドルするのではなく、ランタイムとプロバイダーのプロトコルを消費します。
- ホスト型IDE**ではありません**。デスクトップがローカルコントロールサーフェスです。
- 単一ベンダーラッパー**ではありません**。ランタイム選択、プロバイダー選択、スキル資産は移植可能なままです。

## 市場での位置付け

Cubecloudは「最高のクラウドCopilot」「最強の単一ベンダーCLI」「最も軽量なデモテンプレート」を目指しているのではありません。
異なる購買層をターゲットにしています：コントロール、移植性、単位経済を最も重視するチームです。

| 市場オプション | 強み | 制約 | Cubecloudの位置 |
|---|---|---|---|
| Cursor、GitHub Copilot agents などのクラウドIDE Copilot | ホスト型コーディングループが速く、IDE統合が深い | 状態がデフォルトでクラウド、シート経済が重く、コントロールプレーンがベンダー寄り | Cubecloudはローカルデスクトップオペレーターを中心に据え、ランタイム、プロバイダー、スキル資産を交換可能に保つ |
| Claude Code、Codex CLI などの単一ベンダーCLI | 特定ベンダースタックでのターミナルネイティブループが強力 | ターミナルファーストUX、ランタイム移植性が狭い | CubecloudはGUIファーストのコントロールプレーンと移植可能なランタイム/プロバイダーモデルを提供 |
| リファレンスリポジトリとクイックスタート | 学習とデモの立ち上がりが速い | 意見を持った運用面や長期的なオペレーターワークフローがない | Cubecloudは実際のデスクトップワークフロー、ハンドブック、シードされたコンテキスト、文書化された来歴姿勢を提供 |
| BYOKラッパー | 調達との対話が容易 | 多くの場合、トークンコストに加えてラッパーシート経済が重なる | Cubecloudはローカルファースト設計により、ワークフローが有料リモート推論に依存する度合いを削減 |

戦略的ポイントはシンプルです：多くの競合は**ベンダーの深さ**を最適化しています。Cubecloudは**オペレーターのコントロール**を最適化しています。

## プロダクション志向のチームのために

Cubecloudの言う「プロダクション対応」とは「ホスト型SaaSと営業ダッシュボード」ではなく、中核的な運用面が明示的で、検査可能で、交換可能であることを意味します。

- **明示的な信頼境界。** レンダラーはサンドボックス化され、IPCチャネルは明示的に定義され、アウトバウンドネットワークはデフォルトでオプトイン、インバウンドネットワークはユーザー指定ポートでのオプトインです。[`SECURITY.md`](SECURITY.md) と [`THREAT_MODEL.md`](THREAT_MODEL.md) を参照。
- **予測可能な状態。** プロファイル、セッション、プロバイダー定義、メモリ、スケジュール、かんばん状態は、不透明なホスト型ワークフロー層ではなく、永続的なローカル状態に保存されます。
- **交換可能な依存関係。** ランタイム選択とプロバイダー選択が分離されているため、チームはユーザーワークフロー全体を崩壊させることなく、移行、ステージング、ロールバックできます。
- **オプションのサイドカーはオプションのまま。** CodeGraphとEverOSは必要に応じてシステムを拡張しますが、必須の隠れたプラットフォーム依存関係にはなりません。
- **バージョン管理された方法論。** {{SKILLS_UPSTREAM}}スキルエコシステムは文書化され、来歴が追跡され、アップストリームのスキルプロセスから継承されたred-baseline規律によって支えられています。
- **明確な法的表面。** リポジトリはパスレベルの来歴、商標姿勢、商用再ライセンスポリシー、継承フレームワークのMIT carve-outを一箇所で文書化しています。[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md) と [`docs/legal/`](docs/legal/) を参照。

これがエンタープライズストーリーです：「私たちを信じてください」ではなく、「スタックを検査してください」。

## アーキテクチャ概要

デスクトップ体験は3つの協調するレイヤーで構成されています：

**コアランタイムレイヤー**
- **状態層** - [`apps/desktop-shell/src/main/agentControlPlane.ts`](apps/desktop-shell/src/main/agentControlPlane.ts) がプロファイル、セッション、モデル、プロバイダー、スキル、メモリ、スケジュール、かんばん状態を管理。
- **ランタイムオーケストレーション** - [`docs/RUNTIME_ORCHESTRATION_PLAN.md`](docs/RUNTIME_ORCHESTRATION_PLAN.md) が現在のHermesレーンと次のOpenClaw / IronClawレーンを説明。
- **プロバイダーレイヤー** - [`apps/desktop-shell/src/main/providerDiscovery.ts`](apps/desktop-shell/src/main/providerDiscovery.ts) がモデルプロバイダー選択をランタイム選択から分離。
- **スキルハーネス** - [`agent-desktop/src/main/skills-harness.ts`](agent-desktop/src/main/skills-harness.ts) が送信リクエストの周囲にスキルレイヤーを適用。

**統合サポートサーフェス**（オプション、ユーザーが明示的に有効化）
- **CodeGraph面** - [`docs/CODEGRAPH-RUNTIME.md`](docs/CODEGRAPH-RUNTIME.md) がオプションのセマンティックコードインテリジェンスパスを説明。
- **EverOSサイドカー** - [`docs/EVEROS-SIDECAR.md`](docs/EVEROS-SIDECAR.md) がオプションのメモリおよびハーネスサイドカーのライフサイクルを説明。

**ユーザー管理のサードパーティアプリケーション**
- デスクトップは、操作者がすでに使用しているツールに接続できます。例：Open WebUI、OpenCode、Warp ADE、VS Code、Ollama、LM-Studio、Odysseus、ComfyUI、Open Design。これらはバンドルされず、必須でもなく、ユーザーが追加・削除できます。

## どこから始めるか

- **新しいコントリビューター：** [`docs/HANDBOOK.md`](docs/HANDBOOK.md) のセクション1、2、3、5を読んでください。
- **デスクトップを評価する読者：** 最初に [`agent-desktop/README.md`](agent-desktop/README.md) を読み、次に [`docs/HANDBOOK.md`](docs/HANDBOOK.md) のセクション1、3、10を読んでください。
- **レビュアーまたはリリース担当者：** [`docs/HANDBOOK.md`](docs/HANDBOOK.md) のセクション1、3、4、6、9、10、11を順番に読んでください。

## リポジトリレイアウト

```
cubecloud-agentic-os/
├── README.md                     このモノレポREADME
├── LICENSE                       Cubecloudオリジナル作品: AGPL-3.0-or-later / Apache-2.0 / MIT
├── NOTICE                        サードパーティ帰属カタログ
├── BRANDING_AND_LICENSE.md       ライセンス、来歴、バージョン移行履歴
├── CONTRIBUTING.md               DCO 1.1 コントリビューションコントラクト
├── SECURITY.md                   セキュリティポリシーと報告方法
├── THREAT_MODEL.md               ローカルファースト脅威モデル
├── README.i18n.md                翻訳インベントリマニフェスト
├── .agents/                      ~/.agents/skills/ にミラーリングされる35のオープンソーススキル
├── .github/                      エージェント指示、ワークフロースキル、自動化
├── apps/
│   └── desktop-shell/            Cubecloudオリジナルコントロールプレーンワークスペース
├── packages/
│   └── platform-core/            共有TypeScriptコントラクト
├── docs/
│   ├── HANDBOOK.md               マスターハンドブック
│   ├── RETIRED_AND_LEGACY.md     アクティブ / ミラー / スクラッチパッドマップ
│   ├── handbook/                 アーキテクチャ、開発、運用の長文ドキュメント
│   └── legal/                    EULA、商標、商用ライセンスポリシー
├── scripts/
│   ├── sync-docs.ps1             ハードリンクとジャンクション再生成スクリプト
│   └── v2.10.20-readme-combined-pdf.cjs
└── agent-desktop/            ユーザーに提供されるElectronデスクトップ
```

## ライセンス

Cubecloudオリジナル作品は **AGPL-3.0-or-later、Apache-2.0、MIT** の3択で提供されます。
AGPL-3.0-or-laterがプライマリライセンスです。Apache-2.0とMITは、組織のポリシーがすでにこれらのライセンスを中心としているダウンストリーム消費者向けの互換性オプションです。
継承された `hermes-desktop` フレームワークコードは、アップストリームのMIT条件のままです。

パスレベルの内訳については [`LICENSE`](LICENSE)、[`NOTICE`](NOTICE)、
[`BRANDING_AND_LICENSE.md`](BRANDING_AND_LICENSE.md)、[`docs/legal/`](docs/legal/) を参照してください。

## コントリビューション

インバウンドコントリビューションは **DCO 1.1** サインモデルに従います。すべてのコミットに `Signed-off-by:` 行を含める必要があります。
詳細は [`CONTRIBUTING.md`](CONTRIBUTING.md) を参照してください。

スキルレイヤーは主要なコントリビューターワークフロー面です。新しいスキルは通常 `gbrain-skillify`、
`ecc-skill-scout`、`po-write-a-skill`、`sp-write-skill` を経て、その振る舞いが保持する価値があることを証明するred-baselineテストを伴います。

バグや機能リクエストがある場合は [issueを作成](https://github.com/cubecloud-contributors/cubecloud-agentic-os/issues/new) してください。
セキュリティの問題については [`SECURITY.md`](SECURITY.md) に従い、公開issueに認証情報、APIキー、プライベートログを投稿しないでください。

## 翻訳

モノレポは現在、以下の簡体字中国語ドキュメントを提供しています：

- [`README.zh-CN.md`](README.zh-CN.md)
- [`CONTRIBUTING.zh-CN.md`](CONTRIBUTING.zh-CN.md)
- [`SECURITY.zh-CN.md`](SECURITY.zh-CN.md)
- [`THREAT_MODEL.zh-CN.md`](THREAT_MODEL.zh-CN.md)
- [`docs/HANDBOOK.zh-CN.md`](docs/HANDBOOK.zh-CN.md)
- [`docs/handbook/`](docs/handbook/) 以下のzh-CN長文ドキュメント

翻訳インベントリは [`README.i18n.md`](README.i18n.md) にあります。
英中統合README PDFは [`docs/Cubecloud-README-en-zh.pdf`](docs/Cubecloud-README-en-zh.pdf) にあります。

バイナリ向けの翻訳は引き続き `agent-desktop/` の下にあります。
モノレポに日本語や韓国語を追加したい場合、または既存のzh-CNテキストを改善したい場合は、
[`README.i18n.md`](README.i18n.md) のワークフローに従ってください。

---

> **注意：** この日本語訳は機械翻訳による出発点です。日本語ネイティブスピーカーによるレビューを歓迎します。
> 翻訳の改善や修正は [`README.i18n.md`](README.i18n.md) のワークフローに従ってPRを作成してください。
