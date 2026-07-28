export default {
  kicker: "コードインテリジェンスサーフェス",
  summary:
    "CodeGraphでローカルリポジトリをインデックスし、実際のグラフ統計を調べ、Hermesワークフロー用のコンテキストバンドルを構築します。これは旧Officeウェブビューではないことを前提としています。",
  cliDetected: "CLI検出",
  cliRequired: "CLI必須",
  externalLocalProcess: "外部ローカルプロセス",
  prototypeHint:
    "現在のプロトタイプはIPC経由でローカルCodeGraph CLIを使用します。リモートHTTPトンネルは使用せず、ワークスペースウェブビューも埋め込んでいません。",
  runtime: "ランタイム",
  refreshing: "更新中",
  refresh: "更新",
  version: "バージョン",
  command: "コマンド",
  checking: "確認中...",
  notDetected: "検出されません",
  installHint:
    "Agent Desktopは`codegraph` CLIがマシンのPATHで利用可能な場合のみ、このサーフェスを操作できます。",
  installingCli: "CLIをインストール中...",
  installCodeGraphCli: "CodeGraph CLIをインストール",
} as const;
