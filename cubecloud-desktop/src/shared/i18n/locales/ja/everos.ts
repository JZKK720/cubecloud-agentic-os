export default {
  "eyebrow": "メモリ",
  "title": "EverOS",
  "summary": "EverOS はセルフホストの EverCore バックエンドを基盤とする長期メモリ・ハーネスです。EverOS のベース URL を指定して、過去のセッションの発言を思い出すために使います。",
  "notWired": {
    "title": "未接続",
    "body": "EverOS の統合は実装中です。バックエンドの仕様は main 側に入っており、preload ブリッジの整備が完了するとこの画面が点灯します。",
    "addHarness": "ハーネスを追加(近日公開)"
  },
  "health": {
    "title": "バックエンド",
    "reachable": "到達可能",
    "unreachable": "到達不能",
    "probing": "確認中…",
    "scannedAt": "最終確認"
  },
  "config": {
    "title": "接続",
    "body": "EverOS は既定で http://localhost:1995 で動作します。設定後、メモリ呼び出しは常にこのベース URL へ向きます。",
    "baseUrl": "ベース URL",
    "apiKey": "API キー",
    "userId": "ユーザー ID",
    "groupId": "グループ ID",
    "topK": "Top K",
    "method": "検索方式",
    "save": "保存",
    "edit": "設定",
    "cancel": "閉じる"
  },
  "add": {
    "title": "記憶する",
    "body": "エージェントに覚えておいてほしい事実をここに書きます。",
    "placeholder": "例:ユーザーはダークモードと簡潔な回答を好む。",
    "cta": "保存",
    "sending": "保存中…",
    "success": "{{count}} 件のメモリを保存しました。",
    "failed": "保存に失敗しました:{{error}}"
  },
  "search": {
    "title": "思い出す",
    "body": "ユーザーのエピソードメモリをハイブリッド検索します。",
    "placeholder": "ユーザーは何を好む?",
    "cta": "検索",
    "searching": "検索中…",
    "empty": "一致するメモリはまだありません。"
  },
  "recent": {
    "title": "最近",
    "empty": "まだメモリは保存されていません。"
  },
  "setup": {
    "title": "ローカル実行",
    "body": "EverOS は Postgres + Milvus を使った Python サービスです。Docker Compose と uv ベースのランナーで起動します。",
    "healthCheck": "稼働確認:"
  },
  "error": {
    "searchFailed": "検索に失敗しました。",
    "recentFailed": "最近のメモリを取得できませんでした。"
  }
};
