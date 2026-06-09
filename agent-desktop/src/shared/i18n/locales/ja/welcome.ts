export default {
  flowTitle: "ゲートウェイをセットアップ",
  subtitle:
    "あなたのマシンでローカル実行する自己進化型 AI アシスタント。プライベートで、強力で、常に学習します。",
  installIssueTitle: "インストールの問題",
  installLocalRuntime: "ローカルランタイムをインストール",
  getStarted: "始める",
  retryInstall: "再インストール",  terminalTitle: "または {{runtime}} をワンコマンドでインストール:",  terminalInstallHint: "ターミナルでインストールしてから戻ってきてください：",
  recheck: "インストールしました — 再チェック",
  installSizeHint: "必要なコンポーネント（約 2 GB）をインストールします",
  lanePickerHint:
    "これらは直接ゲートウェイのレーンです。{{ironclaw}} はコンテナランタイムであり直接ゲートウェイではないため、以下の Docker Desktop ハンドオフで接続してください。",
  copyInstallCommand: "インストールコマンドをコピー",
  dividerOr: "または",
  connectRemote: "リモートランタイムに接続",
  connectRemoteTitle: "リモートランタイムに接続",
  connectRemoteSubtitle:
    "稼働中の Cubecloud 互換 API サーバの URL を入力してください。",
  remoteServerUrl: "サーバ URL",
  remoteApiKey: "API キー（任意）",
  remoteApiKeyPlaceholder: "Bearer トークン（API_SERVER_KEY）",
  testingConnection: "テスト中",
  connect: "接続",
  remoteHint:
    "サーバが認証なしリクエストを受け付ける（例：SSH トンネル経由で localhost）場合はキーを空欄に。",
  flowStepInstall: "インストール",
  flowStepConnect: "接続",
  flowStepDone: "開始",
  existingGatewayNote: "稼働中のゲートウェイを検出 — インストールは任意です。",
  addOnRuntimesNote: "Ollama、LM Studio、vLLM などは次のステップで設定します。",
  dockerScanCopy:
    "既存の {{runtimes}} コンテナゲートウェイがある場合のみ使用します。どれも実行していない場合は、下のデフォルトのローカルインストールを続行してください。",
  dockerScanning: "Docker Desktop で {{runtime}} ゲートウェイコンテナをスキャン中...",
  dockerEmpty:
    "接続可能な {{runtimes}} コンテナゲートウェイがありません。コンテナを起動しローカルポートを公開してから再スキャンしてください。",
  localGatewayCopy: "localhost ゲートウェイが既に動作している場合は、Agent Desktop が直接利用できます。OpenClaw のループバックポートも確認します。",
  localGatewayEmpty: "{{ports}} で localhost ゲートウェイが応答しませんでした。到達可能な他のゲートウェイがない場合にのみ {{runtime}} をインストールしてください。",
  designDials: {
    title: "Design Dials",
    subtitle:
      "Three knobs that nudge the agent's tone. Changes apply to this profile only and can be tuned later from Settings.",
    varianceLabel: "Variance",
    varianceHint:
      "How expressive the phrasing is. 0 = dry and literal, 100 = metaphorical and colorful.",
    motionLabel: "Motion",
    motionHint:
      "How structured the response is. 0 = flowing essay, 100 = heavy bullet / step list.",
    densityLabel: "Density",
    densityHint:
      "How much information per paragraph. 0 = airy and short, 100 = tightly packed.",
    reset: "Reset to defaults",
    saved: "Saved.",
  },
} as const;
