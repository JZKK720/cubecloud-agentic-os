export default {
  flowTitle: "ゲートウェイをセットアップ",
  subtitle:
    "あなたのマシンでローカル実行する自己進化型 AI アシスタント。プライベートで、強力で、常に学習します。",
  installIssueTitle: "インストールの問題",
  installLocalRuntime: "ローカルランタイムをインストール",
  getStarted: "始める",
  retryInstall: "再インストール",
  terminalTitle: "または {{runtime}} をワンコマンドでインストール:",
  terminalInstallHint: "ターミナルでインストールしてから戻ってきてください。",
  switchToLocal: "ローカルモードに切り替え",
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  recheck: "インストールしました — 再チェック",
  installSizeHint: "必要なコンポーネント（約 2 GB）をインストールします",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "以下"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "これらは直接ゲートウェイのレーンです。{{ironclaw}} はコンテナランタイムです。公開ポートへ接続するには、リモートパネルから選択してください。",
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
      "エージェントの口調を調整する 3 つのダイヤルです。変更はこのプロファイルにのみ適用され、後で設定から再調整できます。",
    varianceLabel: "Variance",
    varianceHint:
      "言い回しの表現力。0 = 淡々と文字通り、100 = 比喩豊かで華やか。",
    motionLabel: "Motion",
    motionHint:
      "回答の構造の度合い。0 = 流れるようなエッセイ調、100 = 箇条書き中心。",
    densityLabel: "Density",
    densityHint:
      "段落あたりの情報量。0 = ゆったり簡潔、100 = ぎっしり詰め込む。",
    reset: "デフォルトにリセット",
    saved: "保存しました。",
  },
  // V2.10.44 — connect-remote-gateway と connect-ssh パネルで使用。
  connectRemotePanelTitle: "リモートゲートウェイに接続",
  connectRemoteSubtitleHermes:
    "Agent Desktop をローカルにインストールする代わりに、稼働中の {{runtime}} ゲートウェイに接続する場合は、既存のランタイム URL を使用してください。",
  connectRemoteSubtitleOpenclaw:
    "ローカルにインストールする代わりに、稼働中の {{runtime}} 互換エンドポイントに接続します。Agent Desktop は OpenClaw の HTTP 互換サーフェスが有効になっている必要があります。",
  connectRemoteSubtitleIronclaw:
    "ローカルにインストールする代わりに、稼働中の {{runtime}} WASM サンドボックスコンテナゲートウェイに接続します。公開されているゲートウェイポート（デフォルト 3231）と、オペレーター向けの /api/health サーフェスを使用してください。",
  // V2.10.77 — SSH パネルのタイトルとサブタイトル
  connectSshPanelTitle: "SSHで接続",
  connectSshSubtitleHermes:
    "公開ポートを直接公開せずに、既存の{{runtime}}ゲートウェイをSSH経由で転送します。",
  connectSshSubtitleOpenclaw:
    "既存の{{runtime}}ゲートウェイをSSH経由で転送します。HTTP互換機能がリモートゲートウェイで有効になっている必要があります。",
  connectSshSubtitleIronclaw:
    "公開されたコンテナポートを直接公開せずに、既存の{{runtime}}ゲートウェイをSSH経由で転送します。",
  runtimeLane: "ランタイムレーン",
  sshHost: "SSH ホスト",
  sshHostPlaceholder: "192.168.1.100 または myserver.local",
  sshPort: "SSH ポート",
  sshPortPlaceholder: "22",
  sshUsername: "ユーザー名",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "秘密鍵のパス",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "（任意 — デフォルトは ~/.ssh/id_rsa）",
  sshRemotePort: "リモートランタイムポート",
  sshRemotePortNote: "（デフォルト {{port}}）",
  sshRuntimeOpenclawNote:
    "{{runtime}} は通常 {{port}} で待ち受けます。Agent Desktop が接続するには、HTTP 互換サーフェスを有効にする必要があります。",
  sshRuntimeHermesNote:
    "{{runtime}} は通常、SSH 接続用に {{port}} で待ち受けます。",
  sshRuntimeIronclawNote:
    "{{runtime}} は通常、SSH 接続用に {{port}} で待ち受けます。転送先のゲートウェイが /api/health と OpenAI 互換の /v1 エンドポイントを公開している必要があります。",
  sshSecretIronclawNote:
    "（転送先の IronClaw ゲートウェイが GATEWAY_AUTH_TOKEN を強制する場合のみ必須）",
  sshSecretOpenclawNote: "（OpenClaw の認証が有効な場合は必須）",
  sshSecretHermesNote: "（リモートの Hermes ゲートウェイが認証を強制する場合のみ必須）",
  testingSshConnection: "SSH 接続をテスト中…",
  connectViaSsh: "SSH で接続",
  sshSystemHint:
    "システムの SSH を使用します。パスワードなしで ssh {{user}}@{{host}} を実行できることを確認してください。",
  errorLocalInstallHeader: "ローカルインストールに問題があります",
  errorSshHeader: "{{runtime}} への SSH トンネルに問題があります",
  errorRemoteHeader: "リモート {{runtime}} 接続に問題があります",
  retryLocalInstall: "ローカルインストールを再試行",
  retrySshConnection: "SSH 接続を再試行",
  retryRemoteConnection: "リモート接続を再試行",
  reviewSshSettings: "SSH 設定を見直す",
  reviewRemoteSettings: "リモート設定を見直す",
  connectViaSshShort: "SSH で接続",
  connectToRemoteGatewayShort: "リモートゲートウェイに接続",
  errorPleaseEnterUrl: "URL を入力してください。",
  errorConnectionTestFailed: "接続テストに失敗しました。",
  errorHostAndUsernameRequired: "ホストとユーザー名は必須です。",
  errorHostAndUsernameRequiredNoPeriod: "ホストとユーザー名は必須です",
  detectedRuntimesTitle: "稼働中のエージェントを検出しました",
  detectedRuntimesHealthy:
    "今すぐ接続するランタイムを選んでください。ローカルランタイムのインストールは任意です。",
  detectedRuntimesAuth:
    "キーが必要なランタイムが見つかりました。1つ選ぶとリモート接続フォームに事前入力されます。",
  authRequiredHint:
    "これらのランタイムには到達できますが、Agent Desktop が接続する前に API サーバーキーまたはゲートウェイトークンが必要です。",
} as const;
