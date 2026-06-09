export default {
  "eyebrow": "Memory",
  "title": "EverOS",
  "summary": "Long-term memory harnesses backed by a self-hosted EverCore server. Point the shell at your EverOS base URL to recall what the user has said in past sessions.",
  "notWired": {
    "title": "Not wired",
    "body": "EverOS integration is being added. The backend spec is already implemented in main; this screen will light up once the preload bridge is finalised.",
    "addHarness": "Add harness (coming soon)"
  },
  "health": {
    "title": "Backend",
    "reachable": "Reachable",
    "unreachable": "Unreachable",
    "probing": "Probing…",
    "scannedAt": "Last checked"
  },
  "config": {
    "title": "Connection",
    "body": "EverOS lives at http://localhost:1995 by default. The desktop points at the configured base URL whenever the user asks for memory recall.",
    "baseUrl": "Base URL",
    "apiKey": "API key",
    "userId": "User ID",
    "groupId": "Group ID",
    "topK": "Top K",
    "method": "Retrieval method",
    "save": "Save",
    "edit": "Configure",
    "cancel": "Close"
  },
  "add": {
    "title": "Remember",
    "body": "Drop a fact the agent should keep. Stored against the configured user / group.",
    "placeholder": "e.g. The user prefers dark mode and concise responses.",
    "cta": "Store",
    "sending": "Storing…",
    "success": "Stored {{count}} memory.",
    "failed": "Store failed: {{error}}"
  },
  "search": {
    "title": "Recall",
    "body": "Hybrid search over the user's episodic memory.",
    "placeholder": "What does the user prefer?",
    "cta": "Search",
    "searching": "Searching…",
    "empty": "No matching memories yet."
  },
  "recent": {
    "title": "Recent",
    "empty": "No memories stored yet."
  },
  "setup": {
    "title": "Run it locally",
    "body": "EverOS is a Python service backed by Postgres + Milvus. Spin it up with Docker Compose and the included uv-based runner.",
    "healthCheck": "Verify it is up:"
  },
  "error": {
    "searchFailed": "Search failed.",
    "recentFailed": "Could not list recent memories."
  }
};
