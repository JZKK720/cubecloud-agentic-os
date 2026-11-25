// Sandbox Tasks screen strings (Japanese).
export default {
  title: "サンドボックスタスク",
  subtitle:
    "IronClaw の WASM サンドボックスゲートウェイにタスクをディスパッチします。ツール呼び出しは隔離されたサンドボックスコンテナ内で実行されます。",
  gatewayUrl: "IronClaw ゲートウェイ URL",
  bearerToken: "Bearer トークン（任意）",
  connect: "接続",
  probing: "確認中...",
  connected: "接続済み",
  notConnected: "未接続",
  model: "モデル",
  contextFolder: "コンテキストフォルダ（任意）",
  taskDescription: "タスクの説明",
  sendToSandbox: "サンドボックスへ送信",
  dispatching: "ディスパッチ中...",
  completed: "完了",
  failed: "失敗",
  reply: "返信",
  toolCalls: "ツール呼び出し（WASM サンドボックス）",
  tokenRequiredHint:
    "ゲートウェイには到達可能です。ゲートウェイトークンを追加して再接続するとモデルを読み込めます。",
} as const;
