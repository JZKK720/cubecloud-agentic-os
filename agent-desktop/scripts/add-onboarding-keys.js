#!/usr/bin/env node
/**
 * Adds the new onboarding copy keys to all 7 non-en locales.
 * Adds English fallback for non-CJK locales, and Chinese translations
 * for zh-CN, zh-TW, ja.
 *
 * Idempotent: re-running the script does not duplicate keys.
 */
const fs = require("fs");
const path = require("path");

const LOCALES = ["es", "id", "ja", "pt-BR", "pt-PT", "zh-CN", "zh-TW"];

const SETUP_NEW_KEYS = {
  stepIndicator: "Step {{step}} of {{total}}",
  stepPickCli: "Pick CLI",
  stepPickProvider: "Pick provider",
  stepConnect: "Connect",
  cliSectionKicker: "CLI",
  cliSectionTitle: "Pick the CLI that runs your prompts",
  cliSectionCopy: "Installed CLIs auto-pick their matching provider.",
  taskOrchestratorTitle: "Task orchestration",
  taskOrchestratorCopy: "Hermes coordinates agents, tasks, and workflows by default.",
  addOnRuntimesTitle: "Add-on runtimes",
  addOnRuntimesCopy: "LM Studio, Ollama, vLLM, Groq, DeepSeek, and more work out of the box.",
  providerGatewayTitle: "Provider & gateway",
  providerGatewayCopy: "Choose the lane Agent Desktop will use first.",
  formTitle: "Provider configuration",
  formCopy: "Credentials stay in your local Hermes profile on this machine.",
  openclawMigrationComplete: "OpenClaw migration completed. Continue with provider setup below.",
  openclawOptionalTitle: "{{name}} optional",
  openclawMigrationTitle: "{{name}} migration",
  openclawDetected: "Detected on this machine — import to continue.",
  openclawNotDetected: "Not detected on this machine.",
  cliSectionEmpty:
    "No agents detected yet. Install Claude Code, Codex, Gemini CLI, OpenCode, or another supported CLI, then click Rescan.",
  cliSectionPathHint:
    "If a CLI is missing, ensure its bin directory is on the PATH inherited by Agent Desktop.",
};

const WELCOME_NEW_KEYS = {
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "For an existing {{runtime}} gateway container. Continue with the default local install below if you don't already have {{runtime}} running.",
  dockerScanning: "Scanning Docker Desktop for {{runtime}} gateway containers...",
  dockerEmpty:
    "No {{runtime}} gateway was ready to connect. Start the container, publish its local port, then rescan.",
  localGatewayCopy:
    "If a localhost gateway is already running, Agent Desktop can use it directly. This probe also checks the default OpenClaw loopback port.",
  localGatewayEmpty:
    "No live localhost gateway responded on {{ports}}. Install the local {{runtime}} only if no other gateway is reachable.",
};

// Per-locale translated versions of selected new keys
const CJK_TRANSLATIONS = {
  ja: {
    welcome: {
      flowStepInstall: "インストール",
      flowStepConnect: "接続",
      flowStepDone: "開始",
      existingGatewayNote: "稼働中のゲートウェイを検出 — インストールは任意です。",
      addOnRuntimesNote: "Ollama、LM Studio、vLLM などは次のステップで設定します。",
      dockerScanCopy:
        "既存の {{runtime}} ゲートウェイコンテナがある場合のみ使用します。{{runtime}} を実行していない場合は、下のデフォルトのローカルインストールを続行してください。",
      dockerScanning: "Docker Desktop で {{runtime}} ゲートウェイコンテナをスキャン中...",
      dockerEmpty:
        "接続可能な {{runtime}} ゲートウェイがありません。コンテナを起動しローカルポートを公開してから再スキャンしてください。",
      localGatewayCopy:
        "localhost ゲートウェイが既に動作している場合は、Agent Desktop が直接利用できます。OpenClaw のループバックポートも確認します。",
      localGatewayEmpty:
        "{{ports}} で localhost ゲートウェイが応答しませんでした。到達可能な他のゲートウェイがない場合にのみ {{runtime}} をインストールしてください。",
    },
    setup: {
      stepPickCli: "CLI を選択",
      stepPickProvider: "プロバイダーを選択",
      stepConnect: "接続",
      cliSectionKicker: "CLI",
      cliSectionTitle: "プロンプトを実行する CLI を選択",
      cliSectionCopy: "インストール済みの CLI は自動で対応するプロバイダーを選択します。",
      taskOrchestratorTitle: "タスク調整",
      taskOrchestratorCopy: "Hermes がデフォルトでエージェントとタスクを調整します。",
      addOnRuntimesTitle: "追加ランタイム",
      addOnRuntimesCopy: "LM Studio、Ollama、vLLM、Groq、DeepSeek などがそのまま使えます。",
      providerGatewayTitle: "プロバイダー & ゲートウェイ",
      providerGatewayCopy: "Agent Desktop が最初に使うレーンを選択してください。",
      formTitle: "プロバイダー設定",
      formCopy: "認証情報はこのマシンのローカル Hermes プロファイルに保存されます。",
      openclawDetected: "このマシンで検出 — インポートして続行します。",
      openclawNotDetected: "このマシンでは検出されませんでした。",
      cliSectionEmpty: "agent が検出されません。Claude Code、Codex、Gemini CLI、OpenCode などをインストールしてから再スキャンしてください。",
      cliSectionPathHint: "CLI が表示されない場合は、bin ディレクトリが Agent Desktop の PATH に含まれているか確認してください。",
    },
  },
  "zh-CN": {
    welcome: {
      flowStepInstall: "安装",
      flowStepConnect: "连接",
      flowStepDone: "开始",
      existingGatewayNote: "检测到正在运行的网关 — 安装是可选的。",
      addOnRuntimesNote: "Ollama、LM Studio、vLLM 等在下一步配置。",
      dockerScanCopy: "用于已存在的 {{runtime}} 网关容器。如果未运行 {{runtime}}，请继续下面的默认本地安装。",
      dockerScanning: "正在扫描 Docker Desktop 中的 {{runtime}} 网关容器…",
      dockerEmpty: "没有可连接的 {{runtime}} 网关。请启动容器并发布本地端口后重新扫描。",
      localGatewayCopy: "如果 localhost 上已有运行中的网关，Agent Desktop 可直接使用。同时也会探测默认的 OpenClaw 回环端口。",
      localGatewayEmpty: "在 {{ports}} 上没有响应中的 localhost 网关。如果没有任何可达的网关，请安装本地 {{runtime}}。",
    },
    setup: {
      stepPickCli: "选择 CLI",
      stepPickProvider: "选择提供商",
      stepConnect: "连接",
      cliSectionKicker: "CLI",
      cliSectionTitle: "选择运行提示词的 CLI",
      cliSectionCopy: "已安装的 CLI 会自动匹配对应的提供商。",
      taskOrchestratorTitle: "任务编排",
      taskOrchestratorCopy: "Hermes 默认协调代理、任务和工作流。",
      addOnRuntimesTitle: "附加运行时",
      addOnRuntimesCopy: "LM Studio、Ollama、vLLM、Groq、DeepSeek 等开箱即用。",
      providerGatewayTitle: "提供商与网关",
      providerGatewayCopy: "选择 Agent Desktop 首先要使用的通道。",
      formTitle: "提供商配置",
      formCopy: "凭据保存在本机的 Hermes 配置文件中。",
      openclawDetected: "在本机已检测到 — 导入以继续。",
      openclawNotDetected: "本机未检测到。",
      cliSectionEmpty: "未检测到任何 agent。请安装 Claude Code、Codex、Gemini CLI、OpenCode 等支持的 CLI 后点击重新扫描。",
      cliSectionPathHint: "若 CLI 仍显示缺失，请确认其 bin 目录已加入 Agent Desktop 继承的 PATH。",
    },
  },
  "zh-TW": {
    welcome: {
      flowStepInstall: "安裝",
      flowStepConnect: "連線",
      flowStepDone: "開始",
      existingGatewayNote: "偵測到執行中的閘道 — 安裝為選用。",
      addOnRuntimesNote: "Ollama、LM Studio、vLLM 等在下一步設定。",
      dockerScanCopy: "用於已存在的 {{runtime}} 閘道容器。如果未執行 {{runtime}}，請繼續下方的預設本機安裝。",
      dockerScanning: "正在掃描 Docker Desktop 中的 {{runtime}} 閘道容器…",
      dockerEmpty: "沒有可連線的 {{runtime}} 閘道。請啟動容器並發佈本機連接埠後重新掃描。",
      localGatewayCopy: "若 localhost 上已有執行中的閘道，Agent Desktop 可直接使用。同時也會探測預設的 OpenClaw 回環連接埠。",
      localGatewayEmpty: "在 {{ports}} 上沒有回應的本機閘道。若無其他可達的閘道，請安裝本機 {{runtime}}。",
    },
    setup: {
      stepPickCli: "選擇 CLI",
      stepPickProvider: "選擇提供者",
      stepConnect: "連線",
      cliSectionKicker: "CLI",
      cliSectionTitle: "選擇執行提示的 CLI",
      cliSectionCopy: "已安裝的 CLI 會自動配對對應的提供者。",
      taskOrchestratorTitle: "工作編排",
      taskOrchestratorCopy: "Hermes 預設協調代理、工作與工作流程。",
      addOnRuntimesTitle: "附加執行階段",
      addOnRuntimesCopy: "LM Studio、Ollama、vLLM、Groq、DeepSeek 等可立即使用。",
      providerGatewayTitle: "提供者與閘道",
      providerGatewayCopy: "選擇 Agent Desktop 首先要使用的通道。",
      formTitle: "提供者設定",
      formCopy: "憑證儲存在本機的 Hermes 設定檔。",
      openclawDetected: "已在本機偵測到 — 匯入以繼續。",
      openclawNotDetected: "本機未偵測到。",
      cliSectionEmpty: "尚未偵測到任何 agent。請安裝 Claude Code、Codex、Gemini CLI、OpenCode 等支援的 CLI 後按重新掃描。",
      cliSectionPathHint: "若 CLI 仍顯示為缺失，請確認其 bin 目錄已加入 Agent Desktop 繼承的 PATH。",
    },
  },
};

const LOCALES_DIR = path.join(__dirname, "..", "src", "shared", "i18n", "locales");

function readLocaleFile(locale, file) {
  const filePath = path.join(LOCALES_DIR, locale, file);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf8");
}

function writeLocaleFile(locale, file, content) {
  const filePath = path.join(LOCALES_DIR, locale, file);
  fs.writeFileSync(filePath, content, "utf8");
}

function parseKeys(content) {
  // Naive parser: extract "key: 'value'," patterns. We don't need to be
  // perfect — only the keys at the top of the object matter.
  const keys = new Set();
  const matches = content.matchAll(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:/gm);
  for (const m of matches) keys.add(m[1]);
  return keys;
}

function buildStringInsertion(existingKeys, newEntries) {
  // Build a new "key: 'value',\n  " block to insert before "} as const"
  const lines = [];
  for (const [key, value] of Object.entries(newEntries)) {
    if (existingKeys.has(key)) continue;
    // Escape single quotes in value
    const escaped = String(value).replace(/'/g, "\\'");
    lines.push(`  ${key}: "${escaped}",`);
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

function applyNewKeys(locale, file, newEntries) {
  const content = readLocaleFile(locale, file);
  if (!content) {
    console.warn(`missing ${locale}/${file}, skipping`);
    return;
  }
  const existingKeys = parseKeys(content);
  const insertion = buildStringInsertion(existingKeys, newEntries);
  if (!insertion) {
    console.log(`${locale}/${file}: all keys already present`);
    return;
  }
  // Find the "} as const;" marker — insert before it
  const marker = "} as const;";
  const idx = content.lastIndexOf(marker);
  if (idx === -1) {
    console.warn(`${locale}/${file}: no "} as const;" marker, skipping`);
    return;
  }
  const before = content.slice(0, idx).replace(/\s+$/u, "");
  const after = content.slice(idx);
  const updated = before + "\n" + insertion + after;
  writeLocaleFile(locale, file, updated);
  console.log(`${locale}/${file}: inserted ${insertion.split("\n").length - 1} keys`);
}

function main() {
  for (const locale of LOCALES) {
    const welcomeKeys = { ...WELCOME_NEW_KEYS };
    const setupKeys = { ...SETUP_NEW_KEYS };
    // Override with localized CJK values where available
    if (CJK_TRANSLATIONS[locale]) {
      if (CJK_TRANSLATIONS[locale].welcome) {
        Object.assign(welcomeKeys, CJK_TRANSLATIONS[locale].welcome);
      }
      if (CJK_TRANSLATIONS[locale].setup) {
        Object.assign(setupKeys, CJK_TRANSLATIONS[locale].setup);
      }
    }
    applyNewKeys(locale, "welcome.ts", welcomeKeys);
    applyNewKeys(locale, "setup.ts", setupKeys);
  }
}

main();
