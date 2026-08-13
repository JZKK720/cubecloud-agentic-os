export default {
  title: "ゲートウェイ",
  messagingGateway: "メッセージングゲートウェイ",
  platforms: "プラットフォーム",
  status: "ステータス",
  running: "稼働中",
  stopped: "停止中",
  gatewayHint:
    "Hermes を Telegram・Discord・Slack などのプラットフォームに接続します",
  kicker: "セットアップ後のコントロールプレーン",
  heroSummary:
    "Hermes にゲートウェイの認証情報をローカルに保持し、必要なプラットフォームブリッジのみを有効化し、オンボーディングで提示されたのと同じランタイムレーンをひとつのデスクトップコントロールプレーンから管理します。",
  platformsHint:
    "オンボーディングが最初のランタイムとモデルを設定します。この画面は以降、ゲートウェイサービスとプラットフォームの連携を整合させ続けます。",
  supportedBridgesHint:
    "対応ブリッジはオプトインするまで無効のままです。このマシンが公開すべきプロバイダーとメッセージングレーンのみを有効化してください。",
  platformsEnabled: "{{enabled}}/{{total}} 件のプラットフォームが有効",
  imChannels: {
    title: "IMチャネル",
    summary:
      "エージェントをエンタープライズIMプラットフォームに接続します。IMクライアントからのメッセージはアクティブなランタイムにルーティングされ、返信が会話に送り返されます。",
  },
  group: {
    messaging: "メッセージング",
    eastern: "東アジアのプラットフォーム",
    async: "非同期チャネル",
    home: "ホームオートメーション",
  },
  runtimes: {
    title: "ランタイム",
    summary:
      "ウェルカム画面で提示するのと同じランタイム登録表。ホストが利用可能かを行ごとに表示します。",
    registryLabel: "ランタイム登録表",
    refreshAria: "ランタイム登録表を再スキャン",
    empty: "ランタイムは未インストールです。ウェルカム画面でデフォルトの Hermes をインストールします。",
    statusReady: "ランタイムは正常稼働中です。",
    statusUnavailable: "ランタイムはこのマシンではまだ利用できません。",
    detected: "検出",
    responded: "応答あり",
    scanning: "スキャン中…",
    localProbesLabel: "ローカルゲートウェイの検査",
    localProbesRefreshAria: "ローカルホストのゲートウェイポートを検査",
    localProbesEmpty: "ローカルゲートウェイが応答しませんでした。ウェルカム画面からインストールまたは接続してください。",
    discoveryHint: "このランタイムはウェルカム画面から呼び出せる検出イベントを公開しています。",
  },
  container: {
    title: "コンテナ探索",
    summary:
      "ペアリング済みのランタイム（IronClaw、OpenClaw、Docker ゲートウェイを公開するプロバイダ）を Docker Desktop から探索します。",
    sharedHint:
      "ウェルカム画面と同じ登録表を共有しています。コンテナの起動・停止後はここで再スキャンしてください。",
    statusLabel: "Docker スキャン状態",
    refreshAria: "Docker Desktop のランタイムを再スキャン",
    rescan: "再スキャン",
    empty: "Docker ランタイムが検出されませんでした。Docker Desktop をインストールするか、ペアリング済みコンテナを起動してください。",
    scannedAt: "最終スキャン: {{value}}",
  },
} as const;
