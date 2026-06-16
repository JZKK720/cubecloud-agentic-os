export default {
  title: "Models",
  freeBadge: "(free)",
  searchPlaceholder: "Search models...",
  empty: "No models yet",
  noMatch: "No models match your search",
  deleteConfirm: "Delete?",
  displayName: "Display Name",
  modelId: "Model ID",
  namePlaceholder: "e.g. Claude Sonnet 4",
  modelIdPlaceholder: "e.g. anthropic/claude-sonnet-4-20250514",
  baseUrlPlaceholder: "http://localhost:1234/v1",
  subtitle:
    "Manage your model library. These models will appear in the chat page model selector.",
  addModel: "Add Model",
  emptyHint:
    "After adding models here, you can use them in the chat page model selector. Models you configure in settings will also be automatically added here.",
  editModel: "Edit Model",
  update: "Update",
  deleteModelTitle: "Delete Model",
  yes: "Yes",
  no: "No",
  nameRequired: "Name and Model ID are required",
  customProviderHint: "Only required for custom or local providers",
  apiKeyLabel: "API Key",
  apiKeyHint:
    "Stored as an environment variable. Picks the matching env key based on the URL, or CUSTOM_API_KEY otherwise.",
  pillActive: "Active",
  pillKeyLinked: "API key linked",
  pillKeyMissing: "No API key",
  // V2.10.60: Local-LLM detection. The Models page has a
  // "Detect running servers" button that probes 127.0.0.1
  // (and ::1) on the well-known Ollama and LM Studio ports.
  // The matched servers land in a dropdown the user can
  // one-click into the Base URL field. Each saved Model
  // card also has a small health dot that refreshes
  // periodically and shows a tooltip with the round-trip
  // latency.
  scanLocal: "Detect running servers",
  scanLocalHelp:
    "Probe 127.0.0.1 / ::1 on the well-known Ollama and LM Studio ports. LAN hosts are not scanned by default — use a custom URL for those.",
  scanning: "Scanning…",
  localFound: "Detected",
  localFoundNone: "No local LLM runtimes found on loopback",
  noLocalServerFound: "No running servers detected",
  useThisServer: "Use this server",
  detectedServerBadge: "Detected",
  healthUp: "Reachable",
  healthDown: "Not reachable",
  healthUnknown: "Not yet checked",
  healthChecking: "Checking…",
  healthLatencyMs: "{ms} ms",
  healthProbeFailed: "Probe failed",
  runAgain: "Run again",
} as const;
