// CodeGraph screen strings (Japanese).
export default {
  eyebrow: "コードインテリジェンス",
  title: "CodeGraph",
  summary:
    "リポジトリを一度インデックス化すれば、構造的な質問を投げかけられます。CodeGraph は AST をたどってエントリーポイント、import、呼び出しエッジをマッピングし、エージェントが一行ずつ読んでいないコードについても推論できるようにします。",
  runtime: "ローカルランタイム",
  repos: {
    title: "インデックス済みリポジトリ",
    empty:
      "まだインデックスされたリポジトリはありません。下からリポジトリを追加してグラフを構築してください。",
  },
  addRepo: "リポジトリを追加",
  files: "ファイル",
  nodes: "ノード",
  edges: "エッジ",
  cli: {
    installed: "CLI インストール済み",
    version: "バージョン",
    missingTitle: "CodeGraph CLI が見つかりません",
    missingBody:
      "リポジトリをインデックス化するには CodeGraph CLI をインストールするか、Hermes に既存のインデックスを指定してください。デスクトップが代わりにインストールすることはありません。",
    install: "CodeGraph CLI をインストール",
    setupHermes: "Hermes を設定",
  },
  contextBundle: "コンテキストバンドル",
  contextBundleHint:
    "コンテキストが必要なアーキテクチャやコードパスを説明してください。CodeGraph が関連ファイルとエッジを 1 つの添付ファイルにまとめます。それを Chat にドロップできます。",
  promptPlaceholder:
    "アーキテクチャ、ホットパス、有力な拡張ポイントを要約してください …",
  build: "バンドルを生成",
  building: "生成中…",
  embeddedSearch: "埋め込み検索",
  embeddedSearchHint:
    "インデックスをシェルから直接クエリします。結果はテキスト一致だけでなく、グラフ上の近さでランク付けされます。",
  embeddedSdkVersion: "SDK バージョン",
  embeddedProjectOpen: "プロジェクトを開く",
  embeddedOpenProject: "プロジェクトを開く",
  embeddedSearchPlaceholder: "構造的な質問を入力してください（例: 認証はどこで適用されていますか？）",
  embeddedSearchCta: "グラフを検索",
} as const;
