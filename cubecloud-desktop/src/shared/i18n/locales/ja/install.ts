export default {
  preparing: "準備中...",
  startingInstall: "インストールを開始しています",
  installationComplete: "インストール完了",
  installationFailed: "インストール失敗",
  installingHermes: "ローカルランタイムをインストール中",
  installationFailedHint:
    "インストールに失敗しました。再試行するか、ターミナル経由でインストールしてください。",
  retryInstallation: "再試行",
  copied: "コピーしました！",
  copyLogs: "ログをコピー",
  stepLabel: "ステップ {{step}}/{{total}}：{{title}}",
  waitingToStart: "開始待機中...",
  continueToSetup: "セットアップへ進む",
  confirmTitle: "インストール前の確認",
  confirmLocationLabel: "ローカルランタイムのインストール先:",
  confirmFresh:
    "ここに既存のインストールは見つかりませんでした。新しくインストールされます。",
  confirmUpdate:
    "ここに既存のローカルランタイムがあります。最新バージョンに更新されます。",
  confirmReplace:
    "ここにフォルダがありますが、有効なローカルランタイムではありません。インストールすると削除されて置き換えられます。",
  confirmNotInherited:
    "ランタイムを別の場所、またはコマンドラインでインストールした場合、それは引き継がれません。",
  confirmInstallBtn: "ローカルランタイムをインストール",
  useExistingBtn: "既存のインストールを使用",
  useExistingHint:
    "既存のローカルランタイムが含まれるフォルダ（hermes-agent フォルダを含むフォルダ）を選択してください。",
  useExistingInvalid:
    "そのフォルダで使用可能なローカルランタイムが見つかりませんでした。",
  useExistingDone:
    "既存のインストールを設定しました。Cubecloud Desktop を終了して再度開くと適用されます。",
  useExistingQuitBtn: "Cubecloud Desktop を終了",
} as const;
