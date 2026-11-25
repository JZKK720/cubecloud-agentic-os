export default {
  title: "ツール",
  subtitle: "会話中にエージェントが使えるツールセットを有効化／無効化",
  empty: "利用可能なツールセットはありません",
  emptyHint: "ツールセットはゲートウェイの起動後にここに表示されます。",
  web: {
    label: "Web 検索",
    description: "Web を検索し、URL からコンテンツを抽出",
  },
  browser: {
    label: "ブラウザ",
    description: "Web ページを巡回・クリック・入力・操作",
  },
  terminal: {
    label: "ターミナル",
    description: "シェルコマンドとスクリプトを実行",
  },
  file: {
    label: "ファイル操作",
    description: "ファイルの読み書き・検索・管理",
  },
  code_execution: {
    label: "コード実行",
    description: "Python とシェルコードを直接実行",
  },
  vision: { label: "Vision", description: "画像と視覚コンテンツを分析" },
  image_gen: {
    label: "画像生成",
    description: "DALL-E など各種モデルで画像を生成",
  },
  tts: { label: "音声合成", description: "テキストを音声に変換" },
  skills: {
    label: "スキル",
    description: "再利用可能なスキルの作成・管理・実行",
  },
  memory: {
    label: "メモリ",
    description: "永続的な知識の保存と呼び出し",
  },
  session_search: {
    label: "セッション検索",
    description: "過去の会話を横断検索",
  },
  clarify: {
    label: "確認質問",
    description: "必要に応じてユーザーに確認を求める",
  },
  delegation: {
    label: "委任",
    description: "並列タスクのためにサブエージェントを生成",
  },
  cronjob: {
    label: "Cron ジョブ",
    description: "スケジュールタスクの作成・管理",
  },
  moa: {
    label: "Mixture of Agents",
    description: "複数の AI モデルを協調動作させる",
  },
  todo: {
    label: "タスク計画",
    description: "複雑なタスク用の TODO リストを作成・管理",
  },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "MCP サーバ",
  workspace: {
    subtitle:
      "会話型のオペレーティングファブリック — セッション、ファイル、CLI アダプターを駆動するランナーファブリックです。コンソールで管理したい場合に接続してください。",
    start: "起動",
    stop: "停止",
    probing: "確認中…",
    reachable: "到達可能",
    unreachable: "AI Workspace に到達できません",
    attachedAt: "接続先",
  },
  mcpDescription:
    "config.yaml で構成された Model Context Protocol サーバ。ターミナルで <code>hermes mcp add/remove</code> から管理します。",
  http: "HTTP",
  stdio: "stdio",
  disabled: "無効",
  agentReachTitle: "インターネット機能 (Agent-Reach)",
  agentReachSubtitle:
    "Agent-Reach は、実行中のエージェントにインターネットアクセス（Twitter、Reddit、YouTube、GitHub、RSS、Web 検索など）を提供します。ゲートウェイマシンで次を実行してインストールしてください: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "更新",
  agentReachScanning: "スキャン中...",
  agentReachInstalled: "インストール済み",
  agentReachNotInstalled:
    "Agent-Reach がインストールされていません。ランタイムエージェントにはインターネット機能ツールがありません。",
  managedApps: {
    title: "管理対象アプリ",
    subtitle:
      "デスクトップが接続できるすべてのアプリと、各アダプターが報告する状態です。読み取り専用です。デスクトップはこれらのサービスをミラーするだけで、管理は行いません。",
    refresh: "更新",
    loading: "一覧を読み込み中…",
    empty: "登録されている管理対象アプリはありません。",
    needsSetup: "セットアップが必要",
    needsAuth: "セットアップが必要",
    unavailable: "このビルドでは管理対象アプリの一覧を利用できません。",
  },
  // V2.10.77 — ツールパネル
  panels: {
    laya: {
      subtitle:
        "ローカルの System-1 意思決定エンジン — 確信度と棄権を伴う型付きの choice/score/noul 判定を MCP 経由でコンソールに提供します。",
      ready: "準備完了",
      broken: "インストール済みですがバージョンプローブに失敗しました",
    },
    weknora: {
      subtitle:
        "オプションのエンタープライズ RAG ナレッジプラットフォーム。コンソール側は検索専用です。データはお使いの WeKnora サーバーが管理します。",
      reachable: "到達可能",
      unreachable: "到達不能",
    },
    governance: {
      title: "ワークスペースガバナンス",
      subtitle:
        "AI Workspace のポリシーレジストリ、スケジュールタスク、共有 — コンソールのガバナンスビューです。承認の判定はワークスペースの resolve エンドポイント宛にあなたが行います。",
      visible: "表示可能",
      unavailable: "ガバナンス画面に到達できません",
    },
    openviking: {
      subtitle:
        "オプションのエージェントコンテキストデータベース — リソース、メモリ、スキルを 1 つの viking:// ファイルシステムで参照できます（相互運用のみ、AGPL コア）。",
      reachable: "到達可能",
      unreachable: "到達不能",
    },
    gbrain: {
      title: "GBrain（永続メモリ）",
      subtitle:
        "Postgresネイティブの個人知識脳。30以上のMCPツール — ハイブリッド検索、統合、知識グラフ、ドリームサイクル。PGLiteでローカルファースト（設定不要、Docker不要）。エージェントが健忘にならないメモリ層。",
      healthy: "正常",
      unhealthy: "異常",
      notInstalled:
        'GBrainがインストールされていません。<code>bun install -g github:garrytan/gbrain</code>でインストールし、<code>gbrain init --pglite --no-embedding</code>で初期化してください。',
    },
    wigolo: {
      title: "Wigolo（ローカルWebインテリジェンス）",
      subtitle:
        'ローカルファーストのWebインテリジェンス — 検索、取得、クロール、抽出、調査。10個のMCPツール、コアツールにAPIキー不要。Firecrawl（有料）の無料ローカル代替。MCP画面でMCPサーバーとして利用可能。',
      hint: 'MCP画面から追加: 「wigolo」を検索。インストール不要 — npxが初回実行時に取得します。',
    },
    watchSkill: {
      title: "Watch-Skill（動画インテリジェンス）",
      subtitle:
        "エージェント向け動画インテリジェンス — 見る、記憶する、検証する。動画分析、文字起こし、OCR、THE LOOP（ブラウザ/UI検証）用の23個のMCPツール。MCP画面でMCPサーバーとして利用可能。",
      hint: 'MCP画面から追加: 「watch-skill」を検索。<code>uv tool install watch-skill</code>（Python 3.13+）でインストール。',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "Chrome DevTools Protocol経由のLLM駆動ブラウザ自動化。エージェントがページを開き、クリック、入力、フォーム入力、データ抽出、WebサイトのQAテストを行います。browser-harnessは軽量CDPコネクタ、browser-useはエージェントの脳です。",
      installed: "インストール済み",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: 問題あり",
      doctorNotRun: " — doctor: 未実行",
      hint: 'browser-useをMCPサーバーとして追加: MCP画面で「browser-use」を検索。設定でBU_CDP_URLを設定してChromeにCDPで接続。',
      notInstalled:
        'Browser Harnessがインストールされていません。<code>uv tool install browser-harness</code>（Python 3.12+）でインストール。その後<code>chrome://inspect/#remote-debugging</code>でChromeのリモートデバッグを有効化。',
    },
    officecli: {
      title: "OfficeCLI（Office文書自動化）",
      subtitle:
        "Word (.docx)、Excel (.xlsx)、PowerPoint (.pptx)文書の作成、読み取り、編集、レンダリング — Officeインストール不要。HTML/PNGレンダリング、350以上のExcel数式、テンプレートマージ、ピボットテーブルを内蔵したシングルバイナリ。markitdownの読み取り側変換に対する書き込み側の補完。",
      installed: "インストール済み",
      hint: 'MCPサーバーとして追加: MCP画面で「officecli」を検索。エージェントはCLIまたはMCP経由でOffice文書を作成、編集、レンダリングできます。',
      notInstalled:
        'OfficeCLIがインストールされていません。<code>npm install -g @officecli/officecli</code>でインストール、または<code>https://github.com/iOfficeAI/OfficeCLI</code>からダウンロード。.NETランタイム不要のシングルバイナリ。',
      run: {
        title: "ドキュメントコマンドを実行",
        fileLabel: "ドキュメントのパス",
        filePlaceholder: ".docx / .xlsx / .pptx の絶対パス",
        verbLabel: "コマンド",
        argsLabel: "引数",
        argsPlaceholder: "追加の引数（例: --page 1-3、省略可）",
        submit: "実行",
        running: "実行中…",
        outputLabel: "出力",
        emptyHint: "ホームフォルダーまたは一時フォルダー内のパスを入力してください。それ以外のパスは拒否されます。",
        notInstalled: "OfficeCLI がインストールされていないため、実行できません。",
      },
      view: {
        button: "スプレッドシートとして表示",
        loading: "プレビューを読み込み中…",
        loadingUniver: "Univer を読み込み中…",
      },
    },
    graphify: {
      title: "Graphify（概念知識グラフ）",
      subtitle:
        "あらゆるフォルダ（コード、ドキュメント、論文、画像）をコミュニティ検出付きのナビゲート可能な概念知識グラフに変換。思いもよらない文書間のつながりを発見。CodeGraph（コードAST構造）を意味概念グラフで補完。対話型HTML、GraphRAG JSON、監査レポートを出力。",
      installed: "インストール済み",
      hint: 'MCPサーバーとして追加: MCP画面で「graphify」を検索。<code>graphify &lt;パス&gt;</code>でグラフを構築し、<code>graphify query "&lt;質問&gt;"</code>でクエリ。',
      notInstalled:
        "Graphifyがインストールされていません。<code>uv tool install 'graphifyy[mcp]'</code>（Python 3.12+）でインストール。",
    },
  },
} as const;
