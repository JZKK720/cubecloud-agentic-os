import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  dialog,
  clipboard,
} from "electron";
import { join, extname } from "path";
import { readdir, readFile } from "fs/promises";
import { electronApp, optimizer, is } from "@electron-toolkit/utils";
import type { AppUpdater } from "electron-updater";
import icon from "../../resources/icon.png?asset";
import type { Attachment } from "../shared/attachments";
import { stageAttachment, clearStagedAttachments } from "./attachment-staging";
import { discoverProviderModels } from "./model-discovery";
import { scanLocalServers, probeLocalModelHealth } from "./local-server-scan";
import {
  probeIronClawGateway,
  listIronClawModels,
  dispatchSandboxTask,
} from "./ironclaw-sandbox";
import { probeAgentReach } from "./agent-reach";
import { scanLocalhostRuntimes } from "./auto-discovery";
import { readMediaAsDataUrl, saveMedia, mediaFileExists } from "./media";
import {
  checkInstallStatus,
  verifyInstall,
  runInstall,
  inspectInstallTarget,
  validateHermesHome,
  setHermesHomeOverride,
  getHermesVersion,
  clearVersionCache,
  runHermesDoctor,
  runHermesUpdate,
  checkOpenClawExists,
  runClawMigrate,
  runHermesBackup,
  runHermesImport,
  runHermesDump,
  listMcpServers,
  setMcpServerEnabled,
  addMcpServer,
  removeMcpServer,
  ensureDefaultMcpServers,
  discoverMemoryProviders,
  discoverCodebaseMemory,
  listCodebaseMemoryProjects,
  discoverLast30Days,
  readLogs,
  InstallProgress,
} from "./installer";
import { updaterLogger } from "./updater-log";
import { discoverAgentClis } from "./agent-clis";
import {
  discoverBrowserHarness,
  runBrowserHarnessDoctor,
} from "./browser-harness";
import {
  listAllOutputs,
  listThreadOutputs,
  ensureThreadOutputDir,
  clearThreadOutputs,
} from "./output-aggregation";
import { discoverDockerRuntimes } from "./docker-runtimes";
import {
  loadEverOsConfig,
  saveEverOsConfig,
  pingEverOs,
  addEverOsMemory,
  searchEverOsMemory,
  listRecentEverOsMemory,
  DEFAULT_EVEROS_CONFIG,
  type EverOsConfig,
  type EverOsMessageInput,
} from "./everos";
import {
  clearEverOsSidecarLogs,
  getEverOsSidecarLogTail,
  getEverOsSidecarStatus,
  restartEverOsSidecar,
  startEverOsSidecar,
  stopEverOsSidecar,
  type EverOsSidecarStartOptions,
} from "./everos-sidecar";
import {
  clearMooTasksSidecarLogs,
  getMooTasksSidecarLogTail,
  getMooTasksSidecarStatus,
  restartMooTasksSidecar,
  startMooTasksSidecar,
  stopMooTasksSidecar,
  stopAllMooTasksSidecars,
  type MooTasksSidecarStartOptions,
} from "./moo-tasks-sidecar";
import {
  clearHeadroomSidecarLogs,
  getHeadroomSidecarLogTail,
  getHeadroomSidecarStatus,
  restartHeadroomSidecar,
  startHeadroomSidecar,
  stopHeadroomSidecar,
  type HeadroomSidecarStartOptions,
} from "./headroom-sidecar";
import {
  clearHeadroomMcpLogs,
  getHeadroomMcpLogTail,
  getHeadroomMcpStatus,
  restartHeadroomMcpServer,
  setHeadroomMcpDispatcher,
  startHeadroomMcpServer,
  stopHeadroomMcpServer,
  type HeadroomMcpStartOptions,
} from "./mcp/headroom-mcp-server";
import {
  compressMessages,
  getHeadroomStats,
  loadHeadroomConfig,
  pingHeadroom,
  retrieveOriginal,
  saveHeadroomConfig,
  type HeadroomConfig,
  type HeadroomMessage,
} from "./headroom";
import {
  applyHeadroomLearn,
  commitHeadroomLearn,
  getLastHeadroomLearnReport,
  revertHeadroomLearn,
  runHeadroomLearn,
  stopHeadroomLearn,
  type HeadroomLearnApplyFileDiff,
  type HeadroomLearnApplyOptions,
  type HeadroomLearnOptions,
  type HeadroomLearnProposal,
} from "./headroom-learn";
import { listRuntimeProviders } from "./runtime-registry";
import { probeGbrain, type GbrainProbeResult } from "./gbrain-probe";
import { transcribeAudio, type VoiceTranscriptionResult } from "./voice-stt";
import { synthesizeSpeech, type VoiceTtsResult } from "./voice-tts";
import {
  detectHandy,
  toggleHandyTranscription,
  cancelHandyTranscription,
  type HandyToggleResult,
} from "./handy-stt";
import {
  discoverGraphify,
  runGraphifyVersion,
  type GraphifyDiscovery,
  type GraphifyVersionResult,
} from "./graphify-probe";
import { runRuntimeProviderAction } from "./runtime-provider-actions";
import { listTaskOrchestrators } from "./task-orchestrators";
import {
  runHermesAuthLogin,
  cancelHermesAuthLogin,
  detectDeviceCode,
} from "./hermes-auth";
import {
  diagnoseRemoteConnection,
  isRemoteMode,
  isRemoteOnlyMode,
  sendMessage,
  startGateway,
  stopGateway,
  isGatewayRunning,
  testRemoteConnection,
  stopHealthPolling,
  restartGateway,
  ensureSshTunnelIfNeeded,
  setSshRemoteApiKey,
  getRemoteAuthHeader,
} from "./hermes";
import type { GatewayRuntimePresetId } from "../shared/gateway-runtime-presets";
import {
  diagnoseSshConnection,
  startSshTunnel,
  stopSshTunnel,
  testSshConnection,
  isSshTunnelActive,
  isSshTunnelHealthy,
  getSshTunnelUrl,
} from "./ssh-tunnel";
import {
  shouldAutoStartHermesSshGateway,
  waitForRemoteGateway,
  startConfiguredSshTunnel,
} from "./ssh-startup";
import {
  buildCodeGraphContext,
  getCodeGraphCliStatus,
  getCodeGraphProjectStatus,
  initCodeGraphProject,
  installCodeGraphCli,
  setupCodeGraphHermes,
} from "./codegraph";
import {
  closeAllCodeGraphRuntimes,
  closeCodeGraphRuntime,
  getCodeGraphRuntimeStatus,
  getCodeGraphRuntimeStats,
  getImpactRadiusRuntime,
  openCodeGraphRuntime,
  searchCodeGraphRuntime,
} from "./codegraph-runtime";
import {
  readEnv,
  setEnvValue,
  getConfigValue,
  setConfigValue,
  getHermesHome,
  getModelConfig,
  setModelConfig,
  getCredentialPool,
  setCredentialPool,
  addCredentialPoolEntry,
  getConnectionConfig,
  getPublicConnectionConfig,
  resolveConnectionApiKeyUpdate,
  resolveConnectionGatewayRuntimePresetUpdate,
  setConnectionConfig,
  getPlatformEnabled,
  setPlatformEnabled,
  getApiServerKey,
} from "./config";
import {
  listSessions,
  getSessionMessages,
  searchSessions,
  deleteSession,
} from "./sessions";
import {
  syncSessionCache,
  listCachedSessions,
  updateSessionTitle,
} from "./session-cache";
import { listModels, addModel, removeModel, updateModel } from "./models";
import {
  listProfiles,
  createProfile,
  deleteProfile,
  setActiveProfile,
} from "./profiles";
import {
  readMemory,
  addMemoryEntry,
  updateMemoryEntry,
  removeMemoryEntry,
  writeUserProfile,
} from "./memory";
import {
  readWikiIndex,
  readWikiLog,
  listWikiSources,
  readWikiPage,
  writeWikiPage,
  writeWikiIndex,
  readWikiSchema,
  bootstrapWiki,
  getWikiStatus,
  appendWikiLog,
  writeWikiRawSource,
} from "./wiki";
import { readSoul, writeSoul, resetSoul } from "./soul";
import { getToolsets, setToolsetEnabled } from "./tools";
// V2.2 skills: /retro, /triage, /handoff (ported from gstack)
import {
  buildRetroContext,
  commitRetro,
  exportRetroMarkdown,
  summarizeRetro,
  type RetroLearning,
  type RetroContext,
} from "./retro";
import {
  triageItems,
  triageRecentSessions,
  type TriageItemInput,
  type TriageReport,
} from "./triage";
import {
  buildHandoff,
  saveHandoff,
  buildAndSaveHandoff,
  type HandoffDoc,
} from "./handoff";
import {
  convertFileToMarkdown,
  isMarkitdownAvailable,
  type DocumentConverterOutcome,
} from "./converters";
import {
  getDesignDials,
  setDesignDials,
  type DesignDials,
} from "./design-dials";
import {
  checkCareful,
  findDestructiveCommandInBody,
  isDestructive,
  type CarefulResult,
} from "./safety";
import {
  readLearnings,
  appendLearning,
  searchLearnings,
  statsLearnings,
  exportLearningsAsMarkdown,
  findStaleLearnings,
  clearLearningsFile,
  learningsFileInfo,
  type Learning,
  type LearningStats,
  type LearningDeduped,
} from "./learnings";
import {
  listBundledPacks,
  readActivePackId,
  setActivePackId,
  resolveActivePack,
  inferPageType,
  type SchemaPack,
} from "./schemas";
import { synthesize, type Synthesis } from "./synthesis";
import {
  knowledgeGet,
  knowledgeList,
  knowledgeRawSources,
  knowledgeSearch,
  KNOWLEDGE_TOOLS,
  type KnowledgeSearchResult,
  type McpTool,
} from "./knowledge";
import {
  buildBriefsForPlan,
  recordDispatchFailure,
  type PlanTuneBriefSeed,
} from "./autoplan";
import {
  parsePlan,
  savePlan,
  getPlan as getStoredPlan,
  listPlans,
  deletePlan,
  dispatchPlan as dispatchStoredPlan,
  type Plan,
  type DispatchResult,
} from "./plans";
import {
  listInstalledSkills,
  listBundledSkills,
  getDesktopBundledSkillPath,
  getSkillContent,
  installSkill,
  uninstallSkill,
} from "./skills";
import {
  listCronJobs,
  createCronJob,
  removeCronJob,
  pauseCronJob,
  resumeCronJob,
  triggerCronJob,
} from "./cronjobs";
import {
  createTask as kanbanCreateTask,
  dispatchOnce as kanbanDispatchOnce,
  CreateTaskInput,
} from "./kanban";
import { getAppLocale, setAppLocale } from "./locale";
import {
  hardenAttachedWebContents,
  hardenWebviewPreferences,
  isAllowedAppNavigationUrl,
  isAllowedExternalUrl,
  isAllowedWebviewUrl,
} from "./security";
import { SSH_CONNECTION_TEST_LOCAL_PORT } from "../shared/runtime-defaults";
import type { AppLocale } from "../shared/i18n/types";
import {
  sshListInstalledSkills,
  sshGetSkillContent,
  sshInstallSkill,
  sshUninstallSkill,
  sshListBundledSkills,
  sshReadMemory,
  sshAddMemoryEntry,
  sshUpdateMemoryEntry,
  sshRemoveMemoryEntry,
  sshWriteUserProfile,
  sshReadSoul,
  sshWriteSoul,
  sshResetSoul,
  sshGetToolsets,
  sshSetToolsetEnabled,
  sshReadEnv,
  sshSetEnvValue,
  sshGetConfigValue,
  sshSetConfigValue,
  sshGetHermesHome,
  sshGetModelConfig,
  sshSetModelConfig,
  sshListSessions,
  sshGetSessionMessages,
  sshSearchSessions,
  sshListProfiles,
  sshCreateProfile,
  sshDeleteProfile,
  sshGatewayStatus,
  sshStartGateway,
  sshStopGateway,
  sshReadRemoteGatewayAuth,
  sshGetHermesVersion,
  sshReadLogs,
  sshGetPlatformEnabled,
  sshSetPlatformEnabled,
  sshListCachedSessions,
  sshRunDoctor,
  sshListModels,
  sshAddModel,
  sshRemoveModel,
  sshUpdateModel,
  sshRunUpdate,
  sshRunDump,
  sshDiscoverMemoryProviders,
} from "./ssh-remote";

process.on("uncaughtException", (err) => {
  console.error("[MAIN UNCAUGHT]", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[MAIN UNHANDLED REJECTION]", reason);
});

let mainWindow: BrowserWindow | null = null;
let currentChatAbort: (() => void) | null = null;

function openExternalUrl(rawUrl: unknown): void {
  if (!isAllowedExternalUrl(rawUrl)) {
    console.warn("[SECURITY] Blocked unsafe external URL");
    return;
  }

  shell.openExternal(rawUrl).catch((err) => {
    console.error("[SECURITY] Failed to open external URL:", err);
  });
}

function createWindow(): void {
  const rendererHtmlPath = join(__dirname, "../renderer/index.html");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    title: "Agent Desktop",
    minWidth: 900,
    // Lowered from 820 to fit on 768p / 720p displays —Linux WMs
    // enforce minHeight strictly, clipping content (chat input, bottom
    // nav items) below the screen edge on 1366×768 laptops. Issue #393.
    // Companion CSS change makes .sidebar-nav scrollable when content
    // exceeds available vertical space.
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : undefined,
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 16, y: 16 } }
      : {}),
    ...(process.platform !== "darwin" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: true,
    },
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow!.show();
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(
      "[CRASH] Renderer process gone:",
      details.reason,
      details.exitCode,
    );
  });

  mainWindow.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      if (level >= 2) {
        console.error(`[RENDERER ERROR] ${message} (${sourceId}:${line})`);
      }
    },
  );

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error("[LOAD FAIL]", errorCode, errorDescription);
    },
  );

  mainWindow.webContents.setWindowOpenHandler((details) => {
    openExternalUrl(details.url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (
      isAllowedAppNavigationUrl(
        url,
        rendererHtmlPath,
        is.dev ? process.env["ELECTRON_RENDERER_URL"] : undefined,
      )
    ) {
      return;
    }

    event.preventDefault();
    openExternalUrl(url);
  });

  mainWindow.webContents.on(
    "will-attach-webview",
    (event, webPreferences, params) => {
      if (!isAllowedWebviewUrl(params.src)) {
        event.preventDefault();
        console.warn("[SECURITY] Blocked webview attachment for untrusted URL");
        return;
      }

      hardenWebviewPreferences(webPreferences);
    },
  );

  // Right-click context menu (issue #298): native Cut/Copy/Paste/Select All
  // via Electron roles —they act on the focused field / selection and work
  // across the whole app —plus two items to copy the whole conversation.
  mainWindow.webContents.on("context-menu", (_event, params) => {
    const { editFlags, isEditable } = params;
    const template: Electron.MenuItemConstructorOptions[] = [];
    if (isEditable) {
      template.push(
        { role: "cut", enabled: editFlags.canCut },
        { role: "copy", enabled: editFlags.canCopy },
        { role: "paste", enabled: editFlags.canPaste },
        { type: "separator" },
        // The selectAll role scopes correctly to the focused input field.
        { role: "selectAll" },
      );
    } else {
      template.push(
        { role: "copy", enabled: editFlags.canCopy },
        { type: "separator" },
        // The selectAll role would select the entire window for non-editable
        // content —scope it to the message bubble under the cursor instead.
        {
          label: "Select All",
          click: () =>
            mainWindow?.webContents.send("context-menu-select-bubble", {
              x: params.x,
              y: params.y,
            }),
        },
      );
    }
    template.push(
      { type: "separator" },
      {
        label: "Copy entire chat (text)",
        click: () =>
          mainWindow?.webContents.send("context-menu-copy-chat", "text"),
      },
      {
        label: "Copy entire chat (Markdown)",
        click: () =>
          mainWindow?.webContents.send("context-menu-copy-chat", "markdown"),
      },
    );
    Menu.buildFromTemplate(template).popup();
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(rendererHtmlPath);
  }
}

function setupIPC(): void {
  // Installation
  ipcMain.handle("check-install", () => {
    return checkInstallStatus();
  });

  ipcMain.handle("verify-install", () => verifyInstall());

  ipcMain.handle("start-install", async (event) => {
    try {
      await runInstall((progress: InstallProgress) => {
        event.sender.send("install-progress", progress);
      }, mainWindow);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Pre-install inspection + "use an existing installation" (issue #272).
  ipcMain.handle("inspect-install-target", () => inspectInstallTarget());
  ipcMain.handle("validate-hermes-home", (_event, dir: string) =>
    validateHermesHome(dir),
  );
  ipcMain.handle("adopt-hermes-home", (_event, dir: string) => {
    if (!validateHermesHome(dir)) return false;
    // Persist the choice only. HERMES_HOME is resolved once at module
    // load, so the override takes effect on the next launch —the renderer
    // asks the user to restart. (An app-driven relaunch is unreliable
    // under the dev server, which is torn down with the process.)
    setHermesHomeOverride(dir);
    return true;
  });
  ipcMain.handle("quit-app", () => app.quit());

  // Hermes engine info
  ipcMain.handle("get-hermes-version", async () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshGetHermesVersion(conn.ssh);
    return getHermesVersion();
  });
  ipcMain.handle("refresh-hermes-version", async () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshGetHermesVersion(conn.ssh);
    clearVersionCache();
    return getHermesVersion();
  });
  ipcMain.handle("run-hermes-doctor", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshRunDoctor(conn.ssh);
    return runHermesDoctor();
  });
  ipcMain.handle("run-hermes-update", async (event) => {
    try {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        event.sender.send("install-progress", {
          step: 1,
          totalSteps: 1,
          title: "Updating remote Hermes Agent",
          detail: "Running hermes update over SSH...",
          log: "Running hermes update over SSH...\n",
        });
        await sshRunUpdate(conn.ssh);
        await sshStartGateway(conn.ssh);
        await startSshTunnel(conn.ssh);
        const key = conn.apiKey || (await sshReadRemoteGatewayAuth(conn.ssh));
        setSshRemoteApiKey(key);
        return { success: true };
      }
      await runHermesUpdate((progress: InstallProgress) => {
        event.sender.send("install-progress", progress);
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // OpenClaw migration
  ipcMain.handle("check-openclaw", () => checkOpenClawExists());
  ipcMain.handle("run-claw-migrate", async (event) => {
    try {
      await runClawMigrate((progress: InstallProgress) => {
        event.sender.send("install-progress", progress);
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // OAuth provider sign-in —spawns `hermes auth add <provider> --type
  // oauth`, streaming the CLI's output to the renderer's sign-in modal.
  ipcMain.handle("oauth-login", (event, provider: string, profile?: string) => {
    // Codex uses a device-code flow: it prints a URL + code instead
    // of opening a browser. Watch the stream for that prompt, then
    // open the page and pre-copy the code so the user just pastes.
    let buffer = "";
    let deviceHandled = false;
    return runHermesAuthLogin(
      provider,
      (chunk) => {
        // The user can close the modal mid-flow before cancelHermesAuthLogin
        // tears down the subprocess; any send on a destroyed sender throws.
        if (event.sender.isDestroyed()) return;
        event.sender.send("oauth-login-progress", chunk);
        if (deviceHandled) return;
        buffer += chunk;
        const device = detectDeviceCode(buffer);
        if (device) {
          deviceHandled = true;
          openExternalUrl(device.url);
          clipboard.writeText(device.code);
          event.sender.send(
            "oauth-login-progress",
            `\n—Code ${device.code} copied to clipboard —opening browser...\n`,
          );
        }
      },
      profile,
    );
  });
  ipcMain.handle("oauth-login-cancel", () => cancelHermesAuthLogin());

  // Configuration (profile-aware)
  ipcMain.handle("get-locale", () => getAppLocale());
  ipcMain.handle("set-locale", (_event, locale: AppLocale) =>
    setAppLocale(locale),
  );

  ipcMain.handle("get-env", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshReadEnv(conn.ssh, profile);
    return readEnv(profile);
  });

  ipcMain.handle(
    "set-env",
    async (_event, key: string, value: string, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        await sshSetEnvValue(conn.ssh, key, value, profile);
        return true;
      }
      setEnvValue(key, value, profile);
      // Restart gateway so it picks up the new API key.
      // The earlier condition had a precedence bug —
      //   `(isGatewayRunning() && _API_KEY) || _TOKEN || HF_TOKEN`
      // —that triggered a restart for `_TOKEN`/`HF_TOKEN` writes even
      // when no local gateway was running, which in remote mode hit the
      // `startGateway` path with no local install (issue #266).
      // restartGateway() now also self-gates on isRemoteMode(), so this
      // is belt-and-braces, but the condition is fixed too for clarity.
      const looksLikeCredential =
        key.endsWith("_API_KEY") ||
        key.endsWith("_TOKEN") ||
        key === "HF_TOKEN";
      if (isGatewayRunning() && looksLikeCredential) {
        restartGateway(profile);
      }
      return true;
    },
  );

  ipcMain.handle("get-config", (_event, key: string, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetConfigValue(conn.ssh, key, profile);
    return getConfigValue(key, profile);
  });

  ipcMain.handle(
    "set-config",
    async (_event, key: string, value: string, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        await sshSetConfigValue(conn.ssh, key, value, profile);
        return true;
      }
      setConfigValue(key, value, profile);
      return true;
    },
  );

  ipcMain.handle("get-hermes-home", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetHermesHome(conn.ssh, profile);
    return getHermesHome(profile);
  });

  ipcMain.handle("get-model-config", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetModelConfig(conn.ssh, profile);
    return getModelConfig(profile);
  });

  ipcMain.handle(
    "set-model-config",
    async (
      _event,
      provider: string,
      model: string,
      baseUrl: string,
      profile?: string,
    ) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        const prev = await sshGetModelConfig(conn.ssh, profile);
        await sshSetModelConfig(conn.ssh, provider, model, baseUrl, profile);
        if (
          (await sshGatewayStatus(conn.ssh)) &&
          (prev.provider !== provider ||
            prev.model !== model ||
            prev.baseUrl !== baseUrl)
        ) {
          await sshStopGateway(conn.ssh);
          await sshStartGateway(conn.ssh);
        }
        return true;
      }
      const prev = getModelConfig(profile);
      setModelConfig(provider, model, baseUrl, profile);

      // Restart gateway when provider, model, or endpoint changes so it picks up new config
      if (
        isGatewayRunning() &&
        (prev.provider !== provider ||
          prev.model !== model ||
          prev.baseUrl !== baseUrl)
      ) {
        restartGateway(profile);
      }

      return true;
    },
  );

  // API_SERVER_KEY management —lets the renderer detect a missing key and
  // generate one with a button click (local mode) or show instructions (remote/SSH).
  ipcMain.handle("get-api-server-key-status", (_event, profile?: string) => {
    const key = getApiServerKey(profile);
    return { hasKey: key.length > 0 };
  });

  ipcMain.handle(
    "generate-api-server-key",
    async (_event, profile?: string) => {
      const { randomUUID } = await import("crypto");
      const key = `desk-${randomUUID()}`;
      // Write to both the active profile .env and the default .env so the
      // gateway (which reads the profile .env) and the desktop (which reads
      // the default .env as fallback) both see the same key.
      setEnvValue("API_SERVER_KEY", key, profile);
      if (profile && profile !== "default") {
        setEnvValue("API_SERVER_KEY", key);
      }
      // Restart gateway so it picks up the new key immediately.
      if (isGatewayRunning()) {
        stopGateway();
        await new Promise<void>((r) => setTimeout(r, 800));
        startGateway(profile);
      }
      return { key };
    },
  );

  // Connection mode (local / remote / ssh)
  ipcMain.handle("is-remote-mode", () => isRemoteMode());
  ipcMain.handle("is-remote-only-mode", () => isRemoteOnlyMode());
  ipcMain.handle("get-connection-config", () => getPublicConnectionConfig());
  ipcMain.handle("is-ssh-tunnel-active", () => isSshTunnelActive());

  ipcMain.handle(
    "set-connection-config",
    (
      _event,
      mode: "local" | "remote" | "ssh",
      remoteUrl: string,
      apiKey?: string,
      gatewayRuntimePreset?: GatewayRuntimePresetId,
    ) => {
      const existing = getConnectionConfig();
      setConnectionConfig({
        ...existing,
        mode,
        remoteUrl,
        apiKey: resolveConnectionApiKeyUpdate(
          existing,
          mode,
          remoteUrl,
          apiKey,
        ),
        gatewayRuntimePreset: resolveConnectionGatewayRuntimePresetUpdate(
          existing,
          { mode, remoteUrl, gatewayRuntimePreset },
        ),
      });
      return true;
    },
  );

  ipcMain.handle(
    "set-ssh-config",
    (
      _event,
      host: string,
      port: number,
      username: string,
      keyPath: string,
      remotePort: number,
      localPort: number,
      apiKey?: string,
      gatewayRuntimePreset?: GatewayRuntimePresetId,
    ) => {
      const current = getConnectionConfig();
      setConnectionConfig({
        ...current,
        mode: "ssh",
        apiKey: apiKey === undefined ? current.apiKey : apiKey.trim(),
        gatewayRuntimePreset: resolveConnectionGatewayRuntimePresetUpdate(
          current,
          {
            mode: "ssh",
            sshRemotePort: remotePort,
            gatewayRuntimePreset,
          },
        ),
        ssh: { host, port, username, keyPath, remotePort, localPort },
      });
      return true;
    },
  );

  ipcMain.handle(
    "diagnose-remote-connection",
    (
      _event,
      url: string,
      gatewayRuntimePreset?: GatewayRuntimePresetId,
      apiKey?: string,
    ) => diagnoseRemoteConnection(url, gatewayRuntimePreset, apiKey),
  );

  ipcMain.handle(
    "test-remote-connection",
    (_event, url: string, apiKey?: string) => testRemoteConnection(url, apiKey),
  );

  ipcMain.handle("discover-docker-runtimes", () => discoverDockerRuntimes());

  ipcMain.handle("discover-agent-clis", () => discoverAgentClis());

  ipcMain.handle("discover-browser-harness", () =>
    discoverBrowserHarness(),
  );

  ipcMain.handle("browser-harness-doctor", () =>
    runBrowserHarnessDoctor(),
  );

  ipcMain.handle("list-all-outputs", (_e, profile?: string) =>
    listAllOutputs(profile),
  );
  ipcMain.handle("list-thread-outputs", (_e, threadId: string, profile?: string) =>
    listThreadOutputs(threadId, profile),
  );
  ipcMain.handle("ensure-thread-output-dir", (_e, threadId: string, profile?: string) =>
    ensureThreadOutputDir(threadId, profile),
  );
  ipcMain.handle("clear-thread-outputs", (_e, threadId: string, profile?: string) =>
    clearThreadOutputs(threadId, profile),
  );

  ipcMain.handle("list-runtime-providers", () => listRuntimeProviders());

  ipcMain.handle(
    "run-runtime-provider-action",
    async (event, providerId, actionId) =>
      runRuntimeProviderAction(providerId, actionId, (progress) => {
        event.sender.send("install-progress", progress);
      }),
  );

  ipcMain.handle("list-task-orchestrators", () => listTaskOrchestrators());

  ipcMain.handle(
    "diagnose-ssh-connection",
    (
      _event,
      host: string,
      port: number,
      username: string,
      keyPath: string,
      remotePort: number,
      gatewayRuntimePreset?: GatewayRuntimePresetId,
      apiKey?: string,
    ) => {
      const current = getConnectionConfig();
      const resolvedApiKey =
        apiKey === undefined ? current.apiKey : apiKey.trim();
      return diagnoseSshConnection(
        {
          host,
          port,
          username,
          keyPath,
          remotePort,
          localPort: SSH_CONNECTION_TEST_LOCAL_PORT,
        },
        gatewayRuntimePreset,
        resolvedApiKey,
      );
    },
  );

  ipcMain.handle(
    "test-ssh-connection",
    (
      _event,
      host: string,
      port: number,
      username: string,
      keyPath: string,
      remotePort: number,
      apiKey?: string,
    ) => {
      const current = getConnectionConfig();
      const resolvedApiKey =
        apiKey === undefined ? current.apiKey : apiKey.trim();
      return testSshConnection(
        {
          host,
          port,
          username,
          keyPath,
          remotePort,
          localPort: SSH_CONNECTION_TEST_LOCAL_PORT,
        },
        resolvedApiKey,
      );
    },
  );

  ipcMain.handle("start-ssh-tunnel", async () => startConfiguredSshTunnel());

  ipcMain.handle("stop-ssh-tunnel", () => {
    stopSshTunnel();
    return true;
  });

  // Chat —lazy-start gateway on first message
  ipcMain.handle(
    "send-message",
    async (
      event,
      message: string,
      profile?: string,
      resumeSessionId?: string,
      history?: Array<{ role: string; content: string }>,
      attachments?: Attachment[],
      contextFolder?: string,
    ) => {
      if (!isRemoteMode() && !isGatewayRunning()) {
        startGateway(profile);
      }

      await ensureSshTunnelIfNeeded();
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        const tunnelHealthy = await isSshTunnelHealthy();
        if (!tunnelHealthy) {
          await startSshTunnel(conn.ssh);
        }

        if (!getRemoteAuthHeader().Authorization) {
          const key = conn.apiKey || (await sshReadRemoteGatewayAuth(conn.ssh));
          setSshRemoteApiKey(key);
        }

        if (shouldAutoStartHermesSshGateway(conn.ssh.remotePort)) {
          const gatewayRunning = await sshGatewayStatus(conn.ssh);
          if (!gatewayRunning) {
            await sshStartGateway(conn.ssh);
            const tunnelUrl = getSshTunnelUrl();
            const authHeader = getRemoteAuthHeader().Authorization || "";
            const apiKey = authHeader.startsWith("Bearer ")
              ? authHeader.slice("Bearer ".length)
              : "";
            if (
              tunnelUrl &&
              !(await waitForRemoteGateway(tunnelUrl, apiKey, 20000))
            ) {
              throw new Error(
                "Remote Hermes gateway did not become ready over SSH.",
              );
            }
          }
        }
      }

      if (currentChatAbort) {
        currentChatAbort();
      }

      let fullResponse = "";
      const chatStartTime = Date.now();
      let resolveChat: (v: { response: string; sessionId?: string }) => void;
      let rejectChat: (reason?: unknown) => void;
      const promise = new Promise<{ response: string; sessionId?: string }>(
        (res, rej) => {
          resolveChat = res;
          rejectChat = rej;
        },
      );

      // Streaming sends to `event.sender` will throw "Object has been
      // destroyed" if the renderer WebContents goes away mid-response
      // (window closed, reloaded, navigated away). Guard every send so a
      // dead sender doesn't crash the IPC handler, and abort the in-flight
      // chat the first time we see one —there's nobody listening anymore.
      const safeSend = (channel: string, payload: unknown): boolean => {
        if (event.sender.isDestroyed()) return false;
        try {
          event.sender.send(channel, payload);
          return true;
        } catch {
          return false;
        }
      };

      const handle = await sendMessage(
        message,
        {
          onChunk: (chunk) => {
            fullResponse += chunk;
            if (!safeSend("chat-chunk", chunk) && currentChatAbort) {
              // Renderer is gone —stop generating and resolve with what we
              // have so the awaiting promise doesn't leak.
              currentChatAbort();
            }
          },
          onReasoningChunk: (chunk) => {
            // Forward reasoning/thinking tokens on a dedicated channel so
            // the renderer can render the thinking bubble live during the
            // stream rather than waiting for a focus-change refresh (#352).
            // Same renderer-gone abort guard as the content channel.
            if (!safeSend("chat-reasoning-chunk", chunk) && currentChatAbort) {
              currentChatAbort();
            }
          },
          onDone: (sessionId) => {
            currentChatAbort = null;
            safeSend("chat-done", sessionId || "");
            resolveChat({ response: fullResponse, sessionId });
            // Desktop notification when window is not focused and response took >10s
            if (
              mainWindow &&
              !mainWindow.isFocused() &&
              Date.now() - chatStartTime > 10000
            ) {
              const preview = fullResponse
                .replace(/[#*_`~\n]+/g, " ")
                .trim()
                .slice(0, 80);
              new Notification({
                title: "Agent Desktop",
                body: preview || "Response ready",
              }).show();
            }
          },
          onError: (error) => {
            currentChatAbort = null;
            safeSend("chat-error", error);
            rejectChat(new Error(error));
            // Notify on error too if window not focused
            if (mainWindow && !mainWindow.isFocused()) {
              new Notification({
                title: "Agent Desktop —Error",
                body: error.slice(0, 100),
              }).show();
            }
          },
          onToolProgress: (tool) => {
            safeSend("chat-tool-progress", tool);
          },
          onUsage: (usage) => {
            safeSend("chat-usage", usage);
          },
        },
        profile,
        resumeSessionId,
        history,
        attachments,
        contextFolder,
      );

      currentChatAbort = handle.abort;
      return promise;
    },
  );

  ipcMain.handle("abort-chat", () => {
    if (currentChatAbort) {
      currentChatAbort();
      currentChatAbort = null;
    }
  });

  // Renderer-driven clipboard write (issue #298 —"Copy entire chat").
  // Routed through the main process so it doesn't depend on the renderer's
  // document being focused, which the navigator.clipboard API requires.
  ipcMain.handle("copy-to-clipboard", (_event, text: string) => {
    clipboard.writeText(typeof text === "string" ? text : "");
  });

  // Media —render agent-generated images and save them to disk (#299).
  ipcMain.handle("read-media-file", (_event, filePath: string) =>
    readMediaAsDataUrl(filePath),
  );
  ipcMain.handle("save-media-file", (event, src: string, name: string) =>
    saveMedia(src, name, BrowserWindow.fromWebContents(event.sender)),
  );
  ipcMain.handle("media-file-exists", (_event, filePath: string) =>
    mediaFileExists(filePath),
  );

  // Native right-click menu for a rendered media element (#299): "Open"
  // hands the file to the OS default handler (or a web URL to the browser),
  // "Save as— writes a copy elsewhere. Labels are passed in from the
  // renderer so the menu honours the active UI locale.
  ipcMain.on(
    "show-media-menu",
    (
      event,
      src: string,
      name: string,
      labels: { open: string; saveAs: string },
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win || !src) return;
      const isUrl = /^https?:\/\//i.test(src);
      const isData = src.startsWith("data:");
      const template: Electron.MenuItemConstructorOptions[] = [];
      // "Open" needs a real target —a local file or a web URL. A data:
      // URL is inline bytes with nothing to hand to the OS, so it is
      // save-only.
      if (!isData) {
        template.push({
          label: labels.open,
          click: () => {
            if (isUrl) {
              openExternalUrl(src);
            } else {
              shell.openPath(src).then((err) => {
                if (err) console.error("[media] open failed:", err);
              });
            }
          },
        });
      }
      template.push({
        label: labels.saveAs,
        click: () => {
          void saveMedia(src, name, win);
        },
      });
      Menu.buildFromTemplate(template).popup({ window: win });
    },
  );

  // Attachment staging —for pasted blobs that have no filesystem origin.
  ipcMain.handle(
    "stage-attachment",
    (_event, sessionId: string, filename: string, base64Bytes: string) => {
      return stageAttachment(sessionId, filename, base64Bytes);
    },
  );
  ipcMain.handle("clear-staged-attachments", (_event, sessionId: string) => {
    clearStagedAttachments(sessionId);
  });

  // Model discovery —fetch the provider's /v1/models for autocomplete.
  ipcMain.handle(
    "discover-provider-models",
    (
      _event,
      provider: string,
      baseUrl: string | undefined,
      apiKey: string | undefined,
      profile?: string,
    ) => {
      return discoverProviderModels(provider, baseUrl, apiKey, profile);
    },
  );

  // Local-LLM server scan (V2.10.60) —probes 127.0.0.1 + ::1 on
  // Ollama's :11434 and LM Studio's :1234 to answer the question
  // "is there a local LLM runtime already running?". Returns the
  // raw probe list + ready-to-paste `suggestions` for the renderer.
  // 1.5s per probe, all probes in parallel; the renderer shows a
  // spinner while it runs.
  ipcMain.handle("scan-local-servers", (_event, extraHosts?: string[]) =>
    scanLocalServers({ extraHosts: extraHosts ?? [] }),
  );

  // Local-LLM health check for the saved-Model card's status dot
  // (V2.10.60). The renderer debounces these per card and only
  // hits them for cards whose provider is a local one (ollama /
  // lmstudio / custom on a private/loopback host).
  ipcMain.handle("probe-local-model-health", (_event, baseUrl: string) =>
    probeLocalModelHealth(baseUrl),
  );

  // V2.10.65 — IronClaw Sandbox Tasks IPC handlers. The renderer
  // SandboxTasks screen calls these to probe the IronClaw gateway,
  // list available models, and dispatch sandbox tasks. The bearer
  // token is passed from the renderer's connection form and is
  // never persisted or logged.
  ipcMain.handle(
    "ironclaw-probe",
    (_event, url: string, token?: string) =>
      probeIronClawGateway(url, token),
  );
  ipcMain.handle(
    "ironclaw-models",
    (_event, url: string, token?: string) =>
      listIronClawModels(url, token),
  );
  ipcMain.handle(
    "ironclaw-dispatch",
    (_event, url: string, token: string | undefined, task: { model: string; message: string; contextFolder?: string }) =>
      dispatchSandboxTask(url, token, task),
  );

  // V2.10.66 — Agent-Reach internet capability status probe.
  // Runs `agent-reach doctor` to check which internet channels
  // are configured. Never reads credentials — doctor only
  // reports channel status.
  ipcMain.handle("agent-reach-probe", () => probeAgentReach());

  // V2.10.67 — Auto-discovery: scan localhost for running runtime
  // gateways (Hermes, IronClaw, OpenClaw). Probes known ports in
  // parallel using the existing diagnoseRemoteConnection function.
  // Never sends credentials — only health-check probes.
  ipcMain.handle("auto-discovery-scan", () => scanLocalhostRuntimes());

  // Gateway
  ipcMain.handle("start-gateway", async () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) {
      await sshStartGateway(conn.ssh);
      return true;
    }
    if (conn.mode === "remote") {
      // The remote server runs its own gateway; nothing to start locally.
      // Without this guard we'd fall through to `startGateway()` and
      // spawn a non-existent local hermes-agent (issue #266).
      return false;
    }
    return startGateway();
  });
  ipcMain.handle("stop-gateway", async () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) {
      await sshStopGateway(conn.ssh);
      return true;
    }
    if (conn.mode === "remote") {
      // No local gateway to stop in pure remote mode.
      return true;
    }
    stopGateway(true);
    return true;
  });
  ipcMain.handle("gateway-status", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshGatewayStatus(conn.ssh);
    return isGatewayRunning();
  });

  // Platform toggles (config.yaml platforms section)
  ipcMain.handle("get-platform-enabled", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetPlatformEnabled(conn.ssh, profile);
    return getPlatformEnabled(profile);
  });
  ipcMain.handle(
    "set-platform-enabled",
    async (_event, platform: string, enabled: boolean, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        await sshSetPlatformEnabled(conn.ssh, platform, enabled, profile);
        return true;
      }
      setPlatformEnabled(platform, enabled, profile);
      // Restart gateway so it picks up the new platform config
      if (isGatewayRunning()) {
        restartGateway(profile);
      }
      return true;
    },
  );

  // Sessions
  ipcMain.handle("list-sessions", (_event, limit?: number, offset?: number) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshListSessions(conn.ssh, limit, offset);
    return listSessions(limit, offset);
  });

  ipcMain.handle("get-session-messages", (_event, sessionId: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetSessionMessages(conn.ssh, sessionId);
    return getSessionMessages(sessionId);
  });

  ipcMain.handle("delete-session", (_event, sessionId: string) => {
    return deleteSession(sessionId);
  });

  // Profiles
  ipcMain.handle("list-profiles", async () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshListProfiles(conn.ssh);
    return listProfiles();
  });
  ipcMain.handle("create-profile", (_event, name: string, clone: boolean) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshCreateProfile(conn.ssh, name, clone);
    return createProfile(name, clone);
  });
  ipcMain.handle("delete-profile", (_event, name: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshDeleteProfile(conn.ssh, name);
    return deleteProfile(name);
  });
  ipcMain.handle("set-active-profile", (_event, name: string) => {
    if (getConnectionConfig().mode !== "ssh") setActiveProfile(name);
    return true;
  });

  // Memory
  ipcMain.handle("read-memory", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshReadMemory(conn.ssh, profile);
    return readMemory(profile);
  });
  ipcMain.handle(
    "add-memory-entry",
    (_event, content: string, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshAddMemoryEntry(conn.ssh, content, profile);
      return addMemoryEntry(content, profile);
    },
  );
  ipcMain.handle(
    "update-memory-entry",
    (_event, index: number, content: string, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshUpdateMemoryEntry(conn.ssh, index, content, profile);
      return updateMemoryEntry(index, content, profile);
    },
  );
  ipcMain.handle(
    "remove-memory-entry",
    (_event, index: number, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshRemoveMemoryEntry(conn.ssh, index, profile);
      return removeMemoryEntry(index, profile);
    },
  );
  ipcMain.handle(
    "write-user-profile",
    (_event, content: string, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshWriteUserProfile(conn.ssh, content, profile);
      return writeUserProfile(content, profile);
    },
  );

  // Wiki (Karpathy-pattern 3-layer memory: raw / wiki / schema)
  // Local-only: the wiki is the user's personal knowledge base and
  // lives on the device running the desktop, not on a remote gateway.
  // Future: a "share via EverOS" surface could sync the index to a
  // hosted knowledge base.
  ipcMain.handle("wiki-get-status", (_event, profile?: string) =>
    getWikiStatus(profile),
  );
  ipcMain.handle("wiki-bootstrap", (_event, profile?: string) =>
    bootstrapWiki(profile),
  );
  ipcMain.handle("wiki-read-index", (_event, profile?: string) =>
    readWikiIndex(profile),
  );
  ipcMain.handle("wiki-write-index", (_event, content: string, profile?: string) =>
    writeWikiIndex(content, profile),
  );
  ipcMain.handle("wiki-read-log", (_event, profile?: string) =>
    readWikiLog(profile),
  );
  ipcMain.handle(
    "wiki-append-log",
    (
      _event,
      kind: "ingest" | "query" | "lint" | "synthesis" | "edit",
      title: string,
      body: string | undefined,
      profile?: string,
    ) => {
      appendWikiLog(profile, kind, title, body);
      return { success: true };
    },
  );
  ipcMain.handle("wiki-list-sources", (_event, profile?: string) =>
    listWikiSources(profile),
  );
  ipcMain.handle("wiki-read-schema", (_event, profile?: string) =>
    readWikiSchema(profile),
  );
  ipcMain.handle(
    "wiki-read-page",
    (_event, relPath: string, profile?: string) =>
      readWikiPage(relPath, profile),
  );
  ipcMain.handle(
    "wiki-write-page",
    (_event, relPath: string, content: string, profile?: string) =>
      writeWikiPage(relPath, content, profile),
  );

  // file_to_markdown ingest (Step 4 of the harvest rollout).
  // Runs the file through the converter chain (markitdown CLI when
  // available, otherwise pure-JS fallbacks for text/json/csv/html),
  // then writes the resulting markdown into the wiki's
  // `raw/sources/` directory. Returns the converted markdown + the
  // path it landed at so the renderer can show the user where the
  // file went and append an entry to the wiki log.
  ipcMain.handle(
    "wiki-ingest-file-as-markdown",
    async (
      _event,
      filePath: string,
      title: string | undefined,
      profile?: string,
    ): Promise<{
      success: boolean;
      conversion?: ReturnType<typeof convertFileToMarkdown> extends Promise<infer T> ? T : never;
      relPath?: string;
      size?: number;
      error?: string;
    }> => {
      const conversion = await convertFileToMarkdown(filePath);
      if (!conversion.success) {
        return { success: false, error: conversion.error };
      }
      const displayName = title || filePath.split(/[\\/]/).pop() || "untitled";
      const written = writeWikiRawSource(
        displayName,
        conversion.result.markdown,
        profile,
      );
      // Append a log entry so future ingests are auditable.
      appendWikiLog(
        profile,
        "ingest",
        displayName,
        `Converted via ${conversion.result.converter} (${conversion.result.markdown.length} bytes) → ${written.relPath}`,
      );
      return {
        success: true,
        conversion,
        relPath: written.relPath,
        size: written.size,
      };
    },
  );

  // Soul
  ipcMain.handle("read-soul", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshReadSoul(conn.ssh, profile);
    return readSoul(profile);
  });
  ipcMain.handle("write-soul", (_event, content: string, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshWriteSoul(conn.ssh, content, profile);
    return writeSoul(content, profile);
  });
  ipcMain.handle("reset-soul", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshResetSoul(conn.ssh, profile);
    return resetSoul(profile);
  });

  // Tools
  ipcMain.handle("get-toolsets", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetToolsets(conn.ssh, profile);
    return getToolsets(profile);
  });
  ipcMain.handle(
    "set-toolset-enabled",
    (_event, key: string, enabled: boolean, profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshSetToolsetEnabled(conn.ssh, key, enabled, profile);
      return setToolsetEnabled(key, enabled, profile);
    },
  );

  // File-to-Markdown converter (Step 4 of the harvest rollout).
  // Routes a file path through the converter chain (markitdown CLI
  // when present, otherwise pure-JS fallbacks for text/json/csv/html)
  // and returns a uniform DocumentConverterOutcome.
  ipcMain.handle(
    "convert-file-to-markdown",
    async (_event, filePath: string): Promise<DocumentConverterOutcome> => {
      return convertFileToMarkdown(filePath);
    },
  );
  ipcMain.handle(
    "is-markitdown-available",
    (): { available: boolean } => ({
      available: isMarkitdownAvailable(),
    }),
  );

  // Design Dials (Step 5 of the harvest rollout). The Welcome
  // screen lets the user adjust three numbers (variance, motion,
  // density) that get injected into the agent's system prompt as
  // a soft style hint. We persist the values per profile so each
  // profile can have its own taste.
  ipcMain.handle(
    "get-design-dials",
    (_event, profile?: string): DesignDials => getDesignDials(profile),
  );
  ipcMain.handle(
    "set-design-dials",
    (
      _event,
      dials: Partial<DesignDials>,
      profile?: string,
    ): DesignDials => setDesignDials(dials, profile),
  );

  // Careful (Step 9 of the V2 rollout, ported from gstack's /careful).
  // The renderer can call these before running a destructive command
  // (or before dispatching a plan whose body contains one). The
  // verdict is advisory in V1 — the user can always override; careful
  // is a guardrail, not a block.
  ipcMain.handle(
    "careful-check",
    (_event, command: string): CarefulResult => checkCareful(command),
  );
  ipcMain.handle(
    "careful-find-in-body",
    (_event, body: string): string | null =>
      findDestructiveCommandInBody(body),
  );
  ipcMain.handle(
    "careful-is-destructive",
    (_event, command: string): boolean => isDestructive(command),
  );

  // /learn (Step 10 of the V2 rollout, ported from gstack's
  // /learn). Per-profile append-only JSONL log of durable
  // patterns, pitfalls, preferences, and architecture
  // decisions. The renderer shows recent / search / stats /
  // export / prune / manual-add screens; this IPC is the
  // thin wrapper.
  ipcMain.handle(
    "learnings-read",
    (_event, profile?: string): Learning[] => readLearnings(profile),
  );
  ipcMain.handle(
    "learnings-search",
    (_event, query: string, profile?: string): LearningDeduped[] =>
      searchLearnings(query, readLearnings(profile)),
  );
  ipcMain.handle(
    "learnings-stats",
    (_event, profile?: string): LearningStats =>
      statsLearnings(readLearnings(profile)),
  );
  ipcMain.handle(
    "learnings-export",
    (_event, profile?: string): string =>
      exportLearningsAsMarkdown(readLearnings(profile)),
  );
  ipcMain.handle(
    "learnings-find-stale",
    (_event, profile?: string): LearningDeduped[] =>
      findStaleLearnings(readLearnings(profile)),
  );
  ipcMain.handle(
    "learnings-clear",
    (_event, profile?: string): { success: boolean } => {
      clearLearningsFile(profile);
      return { success: true };
    },
  );
  ipcMain.handle(
    "learnings-file-info",
    (
      _event,
      profile?: string,
    ): { exists: boolean; size: number; lastModified: number | null } =>
      learningsFileInfo(profile),
  );
  ipcMain.handle(
    "learnings-append",
    (
      _event,
      input: Omit<Learning, "ts"> & { ts?: string },
      profile?: string,
    ): Learning => appendLearning(input, profile),
  );

  // V2.2 — /retro (gstack). Build a retro report (proposed
  // learnings from the most recent N sessions), expose it to
  // the renderer for the user to review, and commit the
  // kept entries on demand. See retro.ts for the heuristics.
  ipcMain.handle(
    "retro-summarize",
    (_event, profile?: string, lookback?: number): ReturnType<typeof summarizeRetro> =>
      summarizeRetro(profile, lookback),
  );
  ipcMain.handle(
    "retro-build-context",
    (_event, profile?: string, lookback?: number): RetroContext =>
      buildRetroContext(profile, lookback),
  );
  ipcMain.handle(
    "retro-commit",
    (
      _event,
      proposals: RetroLearning[],
      profile?: string,
    ): Learning[] => commitRetro(proposals, profile),
  );
  ipcMain.handle(
    "retro-export",
    (_event, profile?: string): string => exportRetroMarkdown(profile),
  );

  // V2.2 — /triage (gstack). Run a triage pass on a batch of
  // items (issues, PRs, or messages), or on the most recent
  // sessions as a default. Pure read; no disk writes.
  ipcMain.handle(
    "triage-items",
    (_event, items: TriageItemInput[], profile?: string): TriageReport =>
      triageItems(items, profile),
  );
  ipcMain.handle(
    "triage-recent-sessions",
    (_event, profile?: string, lookback?: number): TriageReport =>
      triageRecentSessions(profile, lookback),
  );

  // V2.2 — /handoff (gstack). Build a context handoff doc for
  // the active profile, optionally saving it to disk so the
  // user can attach it to a PR or DM.
  ipcMain.handle(
    "handoff-build",
    (_event, profile?: string): HandoffDoc => buildHandoff(profile),
  );
  ipcMain.handle(
    "handoff-save",
    (
      _event,
      doc: HandoffDoc,
      outDir?: string,
    ): { path: string; bytes: number } => saveHandoff(doc, outDir),
  );
  ipcMain.handle(
    "handoff-build-and-save",
    (
      _event,
      profile?: string,
      outDir?: string,
    ): { doc: HandoffDoc; saved: { path: string; bytes: number } } =>
      buildAndSaveHandoff(profile, outDir),
  );

  // Schema packs + wiki synthesis (Steps 12 + 13 of the V2
  // rollout, ported from gbrain). The brain layer on top of
  // the existing 3-layer memory (raw / wiki / schema): the
  // active schema pack declares what page types the wiki
  // recognises; the synthesis layer composes a topic answer
  // from those pages with per-claim citations and a gap list.
  ipcMain.handle("schemas-list-bundled", (): SchemaPack[] =>
    listBundledPacks(),
  );
  ipcMain.handle(
    "schemas-get-active",
    (_event, profile?: string): SchemaPack => resolveActivePack(profile),
  );
  ipcMain.handle(
    "schemas-get-active-id",
    (_event, profile?: string): string | null => readActivePackId(profile),
  );
  ipcMain.handle(
    "schemas-set-active",
    (_event, packId: string, profile?: string): { success: boolean } => {
      setActivePackId(packId, profile);
      return { success: true };
    },
  );
  ipcMain.handle(
    "schemas-infer-type",
    (_event, relPath: string, profile?: string): string =>
      inferPageType(relPath, resolveActivePack(profile)),
  );
  ipcMain.handle(
    "synthesis-build",
    (
      _event,
      topic: string,
      profile?: string,
      opts?: { maxClaims?: number; maxGaps?: number },
    ): Synthesis => synthesize(topic, profile, opts),
  );

  // Knowledge MCP (Step 14 of the V2 rollout, ported from
  // gbrain's MCP surface). The four-verb search / get / list /
  // sources family, plus a tool manifest the renderer can
  // register with the agent's tool-use layer.
  ipcMain.handle("knowledge-tool-manifest", (): McpTool[] => [
    ...KNOWLEDGE_TOOLS,
  ]);
  ipcMain.handle(
    "knowledge-search",
    (_event, query: string, profile?: string): KnowledgeSearchResult =>
      knowledgeSearch(query, profile),
  );
  ipcMain.handle(
    "knowledge-get",
    (
      _event,
      relPath: string,
      profile?: string,
    ): {
      relPath: string;
      title: string;
      type: string;
      body: string;
    } | null => knowledgeGet(relPath, profile),
  );
  ipcMain.handle(
    "knowledge-list",
    (
      _event,
      filter: { type?: string } = {},
      profile?: string,
    ): Array<{ relPath: string; title: string; type: string }> =>
      knowledgeList(filter, profile),
  );
  ipcMain.handle(
    "knowledge-sources",
    (
      _event,
      profile?: string,
    ): Array<{ filename: string; size: number; lastModified: number }> =>
      knowledgeRawSources(profile),
  );

  // Skills
  ipcMain.handle("list-installed-skills", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshListInstalledSkills(conn.ssh, profile);
    return listInstalledSkills(profile);
  });
  ipcMain.handle("list-bundled-skills", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshListBundledSkills(conn.ssh);
    return listBundledSkills();
  });
  ipcMain.handle("get-skill-content", (_event, skillPath: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshGetSkillContent(conn.ssh, skillPath);
    return getSkillContent(skillPath);
  });
  ipcMain.handle(
    "get-desktop-bundled-skill-path",
    (_event, name: string) => {
      // Local-only: desktop-bundled skills live on the user's machine
      // next to the app, not on a remote gateway.
      if (getConnectionConfig().mode === "ssh") return null;
      return getDesktopBundledSkillPath(name);
    },
  );
  ipcMain.handle(
    "install-skill",
    (_event, identifier: string, _profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshInstallSkill(conn.ssh, identifier);
      return installSkill(identifier, _profile);
    },
  );
  ipcMain.handle(
    "uninstall-skill",
    (_event, name: string, _profile?: string) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshUninstallSkill(conn.ssh, name);
      return uninstallSkill(name, _profile);
    },
  );

  // Session cache (fast local cache with generated titles)
  ipcMain.handle(
    "list-cached-sessions",
    (_event, limit?: number, offset?: number) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshListCachedSessions(conn.ssh, limit, offset);
      return listCachedSessions(limit, offset);
    },
  );
  ipcMain.handle("sync-session-cache", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshListCachedSessions(conn.ssh, 50);
    try {
      return syncSessionCache();
    } catch (error) {
      console.error("sync-session-cache failed; using local cache", error);
      return listCachedSessions(50);
    }
  });
  ipcMain.handle(
    "update-session-title",
    (_event, sessionId: string, title: string) =>
      updateSessionTitle(sessionId, title),
  );

  // Session search
  ipcMain.handle("search-sessions", (_event, query: string, limit?: number) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshSearchSessions(conn.ssh, query, limit);
    return searchSessions(query, limit);
  });

  // Credential Pool —profile-aware. When `profile` is omitted, the
  // credential pool helpers default to the currently active profile's
  // auth.json (see config.ts:authFilePath), so the renderer can pass an
  // explicit profile or rely on the active-profile fallback.
  ipcMain.handle("get-credential-pool", (_event, profile?: string) =>
    getCredentialPool(profile),
  );
  ipcMain.handle(
    "set-credential-pool",
    (
      _event,
      provider: string,
      entries: Array<Record<string, unknown>>,
      profile?: string,
    ) => {
      setCredentialPool(provider, entries, profile);
      return true;
    },
  );

  // Append a user-typed key as a properly-shaped credential pool
  // entry. Constructs the full upstream schema (id, label, auth_type,
  // priority, source, access_token, base_url, request_count) so the
  // engine's resolver can read it —issue #367 Bug 3.
  ipcMain.handle(
    "add-credential-pool-entry",
    (
      _event,
      provider: string,
      apiKey: string,
      label: string,
      profile?: string,
    ) => {
      return addCredentialPoolEntry(provider, apiKey, label, profile);
    },
  );

  // Models
  ipcMain.handle("list-models", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshListModels(conn.ssh);
    return listModels();
  });
  ipcMain.handle(
    "add-model",
    (
      _event,
      name: string,
      provider: string,
      model: string,
      baseUrl: string,
    ) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh) {
        return sshAddModel(conn.ssh, name, provider, model, baseUrl);
      }
      return addModel(name, provider, model, baseUrl);
    },
  );
  ipcMain.handle("remove-model", (_event, id: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshRemoveModel(conn.ssh, id);
    return removeModel(id);
  });
  ipcMain.handle(
    "update-model",
    (_event, id: string, fields: Record<string, string>) => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" && conn.ssh)
        return sshUpdateModel(conn.ssh, id, fields);
      return updateModel(id, fields);
    },
  );

  // Cron Jobs
  ipcMain.handle(
    "list-cron-jobs",
    (_event, includeDisabled?: boolean, profile?: string) =>
      listCronJobs(includeDisabled, profile),
  );
  ipcMain.handle(
    "create-cron-job",
    (
      _event,
      schedule: string,
      prompt?: string,
      name?: string,
      deliver?: string,
      profile?: string,
    ) => createCronJob(schedule, prompt, name, deliver, profile),
  );
  ipcMain.handle("remove-cron-job", (_event, jobId: string, profile?: string) =>
    removeCronJob(jobId, profile),
  );
  ipcMain.handle("pause-cron-job", (_event, jobId: string, profile?: string) =>
    pauseCronJob(jobId, profile),
  );
  ipcMain.handle("resume-cron-job", (_event, jobId: string, profile?: string) =>
    resumeCronJob(jobId, profile),
  );
  ipcMain.handle(
    "trigger-cron-job",
    (_event, jobId: string, profile?: string) => triggerCronJob(jobId, profile),
  );

  // Kanban (plan dispatch only — board UI removed, task creation
  // and dispatch retained for the Plans screen's Dispatch button)
  ipcMain.handle(
    "kanban-create-task",
    (_event, input: CreateTaskInput, profile?: string) =>
      kanbanCreateTask(input, profile),
  );
  // Plans / Orchestrator surface (Step 7 of the harvest rollout).
  // Ingest a markdown plan or RFC, decompose it into ordered steps,
  // persist to <profile>/plans/<id>/plan.json, and dispatch every step
  // to the Kanban orchestrator as a separate task. Plans are local-only:
  // they live on the device, not on a remote gateway. SSH/remote
  // modes return an empty DispatchResult so the renderer can branch on
  // a "dispatchedAt + stepResults.length === 0" check rather than a
  // thrown exception.
  ipcMain.handle(
    "plans-parse",
    (_event, title: string, markdown: string): Plan => parsePlan(title, markdown),
  );
  ipcMain.handle(
    "plans-save",
    (_event, plan: Plan, profile?: string): Plan => savePlan(plan, profile),
  );
  ipcMain.handle(
    "plans-list",
    (_event, profile?: string): Plan[] => listPlans(profile),
  );
  ipcMain.handle(
    "plans-get",
    (_event, id: string, profile?: string): Plan => getStoredPlan(id, profile),
  );
  ipcMain.handle(
    "plans-delete",
    (_event, id: string, profile?: string): { success: boolean; existed: boolean } => {
      const existed = deletePlan(id, profile);
      return { success: true, existed };
    },
  );
  ipcMain.handle(
    "plans-dispatch",
    async (
      _event,
      id: string,
      profile?: string,
    ): Promise<DispatchResult> => {
      const conn = getConnectionConfig();
      if (conn.mode === "ssh" || conn.mode === "remote") {
        // Dispatch shells out to kanbanCreateTask, which is local-only.
        // Return the canonical "empty" DispatchResult so the renderer can
        // branch on a single discriminator (stepResults.length === 0).
        return {
          planId: id,
          dispatchedAt: new Date().toISOString(),
          stepResults: [],
        };
      }
      // Step 9 (V2 rollout): careful precheck. Before we create
      // any kanban tasks, scan the plan's step bodies for a
      // destructive shell command. If we find one, surface it as
      // a `careful` advisory on the DispatchResult so the
      // renderer can show a confirm dialog before the user
      // re-dispatches. V1 only — V2 will refuse by default.
      try {
        const plan = getStoredPlan(id, profile);
        for (const step of plan.steps) {
          const found = findDestructiveCommandInBody(step.body);
          if (found) {
            const verdict = checkCareful(found);
            if (verdict.verdict !== "safe") {
              return {
                planId: id,
                dispatchedAt: new Date().toISOString(),
                stepResults: [],
                careful: {
                  stepId: step.id,
                  command: found,
                  verdict: verdict.verdict === "block" ? "block" : "warn",
                  reason: verdict.reason ?? "Destructive command detected.",
                },
              };
            }
          }
        }
      } catch {
        // If the plan can't be read here, the dispatch below will
        // surface the same error — don't double-report.
      }
      return dispatchStoredPlan(
        id,
        {
          createTask: async (input) => {
            const result = await kanbanCreateTask(
              {
                title: input.title,
                body: input.body,
                skills: input.skills,
                maxRetries: input.maxRetries,
              },
              profile,
            );
            if (!result.success || !result.data) {
              // Step 15 (V2 rollout): when a plan step fails to
              // dispatch, log the failure mode into the profile's
              // learnings.jsonl as a `pitfall`. The dedup key
              // collapses re-runs of the same bug into one entry.
              const planStep = findPlanStep(input.title, profile);
              if (planStep) {
                try {
                  recordDispatchFailure(
                    planStep,
                    result.error ?? "Kanban rejected the plan step task.",
                    profile,
                  );
                } catch {
                  // Best-effort: never let a learning-write failure
                  // block the dispatch from returning its error.
                }
              }
              throw new Error(
                result.error ?? "Kanban rejected the plan step task.",
              );
            }
            return result.data.id;
          },
        },
        profile,
      );
    },
  );
  // Step 15 (V2 rollout): autoplan — pre-fill plan-tune briefs.
  // Walks every step in the saved plan that carries the
  // `plan-tune` skill, parses its body for inline questions
  // (fenced JSON or blockquote `> **D<N> — ...**` lines), and
  // returns a per-step list of brief seeds the renderer can
  // render with <QuestionBrief />. The renderer collects the
  // user's answers and passes them back through
  // `applyBriefAnswers` to stitch into the step body before
  // re-dispatching.

  // Helper: look up a step by its rendered task title (the
  // dispatch path passes `input.title` which is the plan
  // step's `title` field). Returns null when the plan or
  // step is missing.
  function findPlanStep(
    title: string,
    profileArg: string | undefined,
  ): import("./plans").PlanStep | null {
    return findPlanStepByPredicate(
      (s) => s.title === title,
      profileArg,
    );
  }
  function findPlanStepById(
    stepId: string,
    planId: string,
    profileArg: string | undefined,
  ): import("./plans").PlanStep | null {
    return findPlanStepByPredicate(
      (s) => s.id === stepId,
      profileArg,
      planId,
    );
  }
  function findPlanStepByPredicate(
    predicate: (s: import("./plans").PlanStep) => boolean,
    profileArg: string | undefined,
    planIdOverride?: string,
  ): import("./plans").PlanStep | null {
    try {
      // We don't know the planId for `findPlanStep(title)`,
      // so we walk every saved plan. For `findPlanStepById`
      // we use the explicit planId.
      if (planIdOverride) {
        const plan = getStoredPlan(planIdOverride, profileArg);
        return plan.steps.find(predicate) ?? null;
      }
      // listPlans returns plans sorted newest-first; for the
      // failure-recording path, the most recent plan is the
      // right one. Plans are usually <100 steps so this
      // scan is cheap.
      for (const plan of listPlans(profileArg)) {
        const hit = plan.steps.find(predicate);
        if (hit) return hit;
      }
      return null;
    } catch {
      return null;
    }
  }

  ipcMain.handle(
    "autoplan-build-briefs",
    (
      _event,
      planId: string,
      profile?: string,
    ): Array<{ stepId: string; briefs: PlanTuneBriefSeed[] }> => {
      const plan = getStoredPlan(planId, profile);
      const groups = buildBriefsForPlan(plan);
      return groups.map((g) => ({
        stepId: g.step.id,
        briefs: g.briefs,
      }));
    },
  );
  // Step 15 (V2 rollout): record a dispatch failure on demand
  // (the kanban IPC path already records internally; this one
  // is for renderer-driven hand-tests and the
  // `autoplan-bench` skill's dry-run).
  ipcMain.handle(
    "autoplan-record-failure",
    (
      _event,
      stepId: string,
      error: string,
      planId: string,
      profile?: string,
    ): { success: boolean } => {
      const step = findPlanStepById(stepId, planId, profile);
      if (!step) return { success: false };
      try {
        recordDispatchFailure(step, error, profile);
        return { success: true };
      } catch {
        return { success: false };
      }
    },
  );

  // Workspace / CodeGraph
  ipcMain.handle("codegraph-cli-status", () => getCodeGraphCliStatus());
  ipcMain.handle("codegraph-install-cli", () => installCodeGraphCli());
  ipcMain.handle("codegraph-setup-hermes", () => setupCodeGraphHermes());
  ipcMain.handle("codegraph-project-status", (_event, projectPath: string) =>
    getCodeGraphProjectStatus(projectPath),
  );
  ipcMain.handle("codegraph-init-project", (_event, projectPath: string) =>
    initCodeGraphProject(projectPath),
  );
  ipcMain.handle(
    "codegraph-build-context",
    (_event, projectPath: string, prompt: string) =>
      buildCodeGraphContext(projectPath, prompt),
  );
  // CodeGraph runtime (embedded library) — preferred path when
  // @colbymchenry/codegraph is installed; falls back to a structured
  // "unavailable" error so the renderer can branch to the CLI CTA.
  // These channels are the runtime-side mirror of the existing
  // `codegraph-*` channels (which are CLI-based) and are the ones
  // the sidebar CodeGraph screen calls when the SDK is present.
  ipcMain.handle("codegraph-runtime-status", () => getCodeGraphRuntimeStatus());
  ipcMain.handle("codegraph-runtime-open", (_event, projectPath: string) =>
    openCodeGraphRuntime(projectPath),
  );
  ipcMain.handle("codegraph-runtime-close", (_event, projectPath: string) =>
    closeCodeGraphRuntime(projectPath),
  );
  ipcMain.handle(
    "codegraph-runtime-search",
    (
      _event,
      projectPath: string,
      query: string,
      options?: { limit?: number },
    ) => searchCodeGraphRuntime(projectPath, query, options),
  );
  ipcMain.handle(
    "codegraph-runtime-impact",
    (_event, projectPath: string, nodeId: string, maxDepth?: number) =>
      getImpactRadiusRuntime(projectPath, nodeId, maxDepth),
  );
  ipcMain.handle("codegraph-runtime-stats", (_event, projectPath: string) =>
    getCodeGraphRuntimeStats(projectPath),
  );

  ipcMain.handle("select-folder", async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ["openDirectory"] })
      : await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Reveal the data directory in the OS file browser. Returns
  // shell.openPath's string result, which is the empty string on
  // success and an error message on failure. The renderer surfaces
  // that as a toast so the user knows the folder failed to open.
  ipcMain.handle("open-data-folder", async (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) {
      // Remote data lives on the SSH host — there's no local path
      // to open. The Settings card hides the button in that mode
      // so the user shouldn't reach this branch, but guard anyway.
      return "remote-mode-no-local-folder";
    }
    const home = getHermesHome(profile);
    const err = await shell.openPath(home);
    return err;
  });

  // Read directory contents for worktree panel
  ipcMain.handle(
    "read-directory",
    async (
      _event,
      dirPath: string,
    ): Promise<{ name: string; isDirectory: boolean }[] | null> => {
      try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      } catch {
        return null;
      }
    },
  );

  // Read file contents for file viewer
  ipcMain.handle(
    "read-file",
    async (
      _event,
      filePath: string,
      maxBytes?: number,
    ): Promise<{ content: string; truncated: boolean } | null> => {
      try {
        const limit = maxBytes ?? 102400; // Default 100KB
        const buffer = await readFile(filePath);
        const truncated = buffer.byteLength > limit;
        const content = truncated
          ? buffer.subarray(0, limit).toString("utf-8")
          : buffer.toString("utf-8");
        return { content, truncated };
      } catch {
        return null;
      }
    },
  );

  // Open file in default application
  ipcMain.handle("open-file-in-editor", async (_event, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return true;
    } catch {
      return false;
    }
  });

  // Read image file as data URL for preview
  ipcMain.handle(
    "read-image-file",
    async (_event, filePath: string): Promise<string | null> => {
      try {
        const buffer = await readFile(filePath);
        const ext = extname(filePath).toLowerCase().slice(1);
        const mimeType =
          ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : ext === "gif"
                ? "image/gif"
                : ext === "webp"
                  ? "image/webp"
                  : ext === "svg"
                    ? "image/svg+xml"
                    : ext === "bmp"
                      ? "image/bmp"
                      : ext === "ico"
                        ? "image/x-icon"
                        : "application/octet-stream";
        const base64 = buffer.toString("base64");
        return `data:${mimeType};base64,${base64}`;
      } catch {
        return null;
      }
    },
  );
  ipcMain.handle(
    "kanban-dispatch-once",
    (_event, dryRun?: boolean, profile?: string) =>
      kanbanDispatchOnce(dryRun, profile),
  );

  // EverOS —long-term memory harnesses backed by a self-hosted
  // EverCore / EverOS server (https://github.com/JZKK720/EverOS).
  // The desktop can call the API even before the local runtime is
  // installed; we only need the user to point us at a reachable
  // base URL via getEverOsConfig / saveEverOsConfig.
  ipcMain.handle("everos-get-config", () => loadEverOsConfig(getHermesHome()));
  ipcMain.handle("everos-save-config", (_event, patch: Partial<EverOsConfig>) =>
    saveEverOsConfig(getHermesHome(), patch),
  );
  ipcMain.handle("everos-ping", async (_event, patch?: Partial<EverOsConfig>) => {
    if (patch && Object.keys(patch).length > 0) {
      // Caller is asking "would this config be reachable?" —merge
      // with the on-disk config so a partial edit still pings.
      const merged = { ...DEFAULT_EVEROS_CONFIG, ...patch };
      return pingEverOs(merged);
    }
    return pingEverOs(await loadEverOsConfig(getHermesHome()));
  });
  ipcMain.handle(
    "everos-add-memory",
    async (
      _event,
      messages: EverOsMessageInput[],
      patch?: Partial<EverOsConfig>,
    ) =>
      addEverOsMemory(
        patch
          ? { ...DEFAULT_EVEROS_CONFIG, ...patch }
          : await loadEverOsConfig(getHermesHome()),
        messages,
      ),
  );
  ipcMain.handle(
    "everos-search",
    async (
      _event,
      query: string,
      options?: { topK?: number; method?: "hybrid" | "keyword" | "vector" },
      patch?: Partial<EverOsConfig>,
    ) =>
      searchEverOsMemory(
        patch
          ? { ...DEFAULT_EVEROS_CONFIG, ...patch }
          : await loadEverOsConfig(getHermesHome()),
        query,
        options,
      ),
  );
  ipcMain.handle(
    "everos-list-recent",
    async (_event, limit?: number, patch?: Partial<EverOsConfig>) =>
      listRecentEverOsMemory(
        patch
          ? { ...DEFAULT_EVEROS_CONFIG, ...patch }
          : await loadEverOsConfig(getHermesHome()),
        limit,
      ),
  );

  // EverOS sidecar (lifecycle manager around the
  // `everos server start` Python process). The desktop auto-spawns
  // the sidecar on the first IPC call to `everos-sidecar-start`;
  // the renderer decides whether to show a "Start" button or a
  // "Restart" pill based on `state`. All channels are
  // best-effort: a missing Python install returns the
  // `state: "stopped"` + `reason: "no binary on PATH"` shape
  // rather than throwing.
  ipcMain.handle("everos-sidecar-status", () => getEverOsSidecarStatus());
  ipcMain.handle("everos-sidecar-log-tail", () => getEverOsSidecarLogTail());
  ipcMain.handle("everos-sidecar-clear-logs", () => {
    clearEverOsSidecarLogs();
    return { success: true };
  });
  ipcMain.handle(
    "everos-sidecar-start",
    (_event, options?: EverOsSidecarStartOptions) =>
      startEverOsSidecar(options ?? {}),
  );
  ipcMain.handle("everos-sidecar-stop", () => stopEverOsSidecar());
  ipcMain.handle(
    "everos-sidecar-restart",
    (_event, options?: EverOsSidecarStartOptions) =>
      restartEverOsSidecar(options ?? {}),
  );

  // Headroom proxy (context compression for LLM calls).
  // The desktop auto-spawns the sidecar on the first IPC call
  // to `headroom-sidecar-start`; the renderer decides whether
  // to show a "Start" button or a "Restart" pill based on
  // `state`. All channels are best-effort: a missing Python
  // install returns `state: "stopped"` + `reason` rather than
  // throwing.
  ipcMain.handle("headroom-sidecar-status", () => getHeadroomSidecarStatus());
  ipcMain.handle("headroom-sidecar-log-tail", () => getHeadroomSidecarLogTail());
  ipcMain.handle("headroom-sidecar-clear-logs", () => {
    clearHeadroomSidecarLogs();
    return { success: true };
  });
  ipcMain.handle(
    "headroom-sidecar-start",
    (_event, options?: HeadroomSidecarStartOptions) =>
      startHeadroomSidecar(options ?? {}),
  );
  ipcMain.handle("headroom-sidecar-stop", () => stopHeadroomSidecar());
  ipcMain.handle(
    "headroom-sidecar-restart",
    (_event, options?: HeadroomSidecarStartOptions) =>
      restartHeadroomSidecar(options ?? {}),
  );

  // GBrain health probe. GBrain's local mode is stdio MCP (no HTTP
  // port), so we probe via `gbrain doctor --json` instead of an HTTP
  // health endpoint. Returns `{ installed: false }` when gbrain is not
  // on PATH —never throws.
  ipcMain.handle("gbrain-probe", (): GbrainProbeResult => probeGbrain());

  // Voice STT transcription. The renderer captures audio via
  // MediaRecorder and sends the buffer here. The main process
  // forwards it to the configured STT provider (Groq or OpenAI
  // Whisper). Audio never touches disk. Never throws — degrades to
  // { success: false, error }.
  ipcMain.handle(
    "voice-transcribe",
    async (_event, audioBuffer: Buffer): Promise<VoiceTranscriptionResult> =>
      transcribeAudio(audioBuffer),
  );

  // Voice TTS synthesis. The renderer sends text + optional voice
  // selection; the main process calls OpenAI TTS (hardcoded tts-1
  // model, same VOICE_TOOLS_OPENAI_KEY as STT). Returns an MP3
  // buffer the renderer plays via <audio>. Never throws.
  ipcMain.handle(
    "voice-synthesize",
    async (
      _event,
      text: string,
      voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
    ): Promise<VoiceTtsResult> => synthesizeSpeech(text, voice),
  );

  // Handy local-first STT. Detect whether the Handy app is installed
  // (cached PATH lookup). Toggle/cancel control a running Handy
  // instance via CLI flags. Text is pasted into the focused textarea
  // by Handy itself —no audio crosses the IPC boundary.
  ipcMain.handle("handy-detect", (): boolean => detectHandy());
  ipcMain.handle(
    "handy-toggle",
    async (): Promise<HandyToggleResult> => toggleHandyTranscription(),
  );
  ipcMain.handle(
    "handy-cancel",
    async (): Promise<HandyToggleResult> => cancelHandyTranscription(),
  );

  // Graphify discovery + version probe. Graphify turns any folder
  // (code, docs, papers) into a concept knowledge graph with
  // community detection. Complements CodeGraph (code AST) with
  // cross-document semantic connections.
  ipcMain.handle(
    "graphify-discover",
    (): GraphifyDiscovery => discoverGraphify(),
  );
  ipcMain.handle(
    "graphify-version",
    (): GraphifyVersionResult => runGraphifyVersion(),
  );

  // Headroom HTTP client channels. These work against any
  // reachable Headroom proxy (sidecar-managed or external).
  ipcMain.handle("headroom-get-config", () =>
    loadHeadroomConfig(getHermesHome()),
  );
  ipcMain.handle(
    "headroom-save-config",
    (_event, patch: Partial<HeadroomConfig>) =>
      saveHeadroomConfig(getHermesHome(), patch),
  );
  ipcMain.handle("headroom-ping", async () => {
    const cfg = await loadHeadroomConfig(getHermesHome());
    return pingHeadroom(cfg);
  });
  ipcMain.handle(
    "headroom-compress",
    async (_event, messages: HeadroomMessage[], model?: string) => {
      const cfg = await loadHeadroomConfig(getHermesHome());
      return compressMessages(cfg, messages, model);
    },
  );
  ipcMain.handle(
    "headroom-retrieve",
    async (_event, cacheKey: string) => {
      const cfg = await loadHeadroomConfig(getHermesHome());
      return retrieveOriginal(cfg, cacheKey);
    },
  );
  ipcMain.handle("headroom-stats", async () => {
    const cfg = await loadHeadroomConfig(getHermesHome());
    return getHeadroomStats(cfg);
  });

  // Headroom MCP server (Streamable-HTTP transport, lives at
  // 127.0.0.1:8788 by default). The supervisor's dispatcher is
  // installed once at boot and forwards each tools/call into
  // the existing headroom IPC handlers, so the MCP surface is a
  // thin pass-through — no extra API surface, no extra config.
  // Lifecycle mirrors the headroom sidecar (auto-restart on
  // crash, log tail, start/stop/restart).
  setHeadroomMcpDispatcher({
    async compress(messages, model) {
      const cfg = await loadHeadroomConfig(getHermesHome());
      // Cast: the dispatcher payload is `unknown[]` to avoid a
      // hard dep on the headroom IPC's exact message shape;
      // compressMessages re-validates internally.
      return compressMessages(
        cfg,
        messages as Parameters<typeof compressMessages>[1],
        model,
      ) as unknown as Promise<Record<string, unknown>>;
    },
    async retrieve(cacheKey) {
      const cfg = await loadHeadroomConfig(getHermesHome());
      return retrieveOriginal(
        cfg,
        cacheKey,
      ) as unknown as Promise<Record<string, unknown>>;
    },
    async stats() {
      const cfg = await loadHeadroomConfig(getHermesHome());
      return getHeadroomStats(cfg) as unknown as Promise<
        Record<string, unknown>
      >;
    },
  });
  ipcMain.handle("headroom-mcp-status", () => getHeadroomMcpStatus());
  ipcMain.handle("headroom-mcp-log-tail", () => getHeadroomMcpLogTail());
  ipcMain.handle("headroom-mcp-clear-logs", () => {
    clearHeadroomMcpLogs();
    return { success: true };
  });
  ipcMain.handle(
    "headroom-mcp-start",
    (_event, options?: HeadroomMcpStartOptions) =>
      startHeadroomMcpServer(options ?? {}),
  );
  ipcMain.handle("headroom-mcp-stop", () => stopHeadroomMcpServer());
  ipcMain.handle(
    "headroom-mcp-restart",
    (_event, options?: HeadroomMcpStartOptions) =>
      restartHeadroomMcpServer(options ?? {}),
  );

  // Headroom learn (failure mining via upstream `headroom
  // learn` CLI). The desktop is a thin wrapper — the heavy
  // lifting is done by the Python sidecar. The renderer's
  // /retro review screen consumes the result the same way
  // it consumes the heuristic retro report.
  ipcMain.handle(
    "headroom-learn-run",
    async (_event, options: HeadroomLearnOptions) => {
      return runHeadroomLearn(options);
    },
  );
  ipcMain.handle("headroom-learn-last-report", () =>
    getLastHeadroomLearnReport(),
  );
  ipcMain.handle("headroom-learn-stop", () => {
    stopHeadroomLearn();
    return { success: true };
  });
  ipcMain.handle(
    "headroom-learn-commit",
    (
      _event,
      proposals: HeadroomLearnProposal[],
      profile?: string,
    ): unknown[] => commitHeadroomLearn(proposals, profile),
  );
  // Headroom learn — apply (`--apply`): runs the upstream
  // CLI's apply pass and returns per-file before/after
  // snapshots so the renderer can show a diff preview. The
  // writer uses marker-delimited sections (`<!-- headroom:learn:start -->`
  // ... `<!-- headroom:learn:end -->`), so a future "accept"
  // action is a no-op (the file is already written) and a
  // "revert" action restores the prior content.
  ipcMain.handle(
    "headroom-learn-apply",
    async (_event, options: HeadroomLearnApplyOptions) => {
      return applyHeadroomLearn(options);
    },
  );
  ipcMain.handle(
    "headroom-learn-revert",
    async (_event, diffs: HeadroomLearnApplyFileDiff[]) => {
      return revertHeadroomLearn(diffs);
    },
  );

  // Shell
  ipcMain.handle("open-external", (_event, url: string) => {
    openExternalUrl(url);
  });

  // Backup / Import
  ipcMain.handle("run-hermes-backup", (_event, profile?: string) =>
    runHermesBackup(profile),
  );
  ipcMain.handle(
    "run-hermes-import",
    (_event, archivePath: string, profile?: string) =>
      runHermesImport(archivePath, profile),
  );

  // Debug dump
  ipcMain.handle("run-hermes-dump", () => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh) return sshRunDump(conn.ssh);
    return runHermesDump();
  });

  // MCP servers
  ipcMain.handle("list-mcp-servers", (_event, profile?: string) =>
    listMcpServers(profile),
  );
  ipcMain.handle(
    "set-mcp-server-enabled",
    (
      _event,
      name: string,
      enabled: boolean,
      profile?: string,
    ): { ok: boolean; error?: string } => setMcpServerEnabled(name, enabled, profile),
  );
  ipcMain.handle(
    "add-mcp-server",
    (
      _event,
      entry: { name: string; type: "http" | "stdio"; enabled: boolean; detail: string },
      profile?: string,
    ): { ok: boolean; error?: string } => addMcpServer(entry, profile),
  );
  ipcMain.handle(
    "remove-mcp-server",
    (_event, name: string, profile?: string): { ok: boolean; error?: string } =>
      removeMcpServer(name, profile),
  );

  // Memory providers
  ipcMain.handle("discover-memory-providers", (_event, profile?: string) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshDiscoverMemoryProviders(conn.ssh, profile);
    return discoverMemoryProviders(profile);
  });

  // Codebase Memory binary discovery
  ipcMain.handle("discover-codebase-memory", () =>
    discoverCodebaseMemory(),
  );
  ipcMain.handle("list-codebase-memory-projects", () =>
    listCodebaseMemoryProjects(),
  );
  ipcMain.handle("discover-last30days", () =>
    discoverLast30Days(),
  );

  // Moo Tasks sidecar (agent-native kanban board with MCP server).
  // The desktop spawns the Nuxt server as a child process and
  // manages its lifecycle. The MCP endpoint at /mcp is added
  // to config.yaml via the MCP registry so Hermes can use the
  // 14 task tools (list-tasks, create-task, accept-task, etc.).
  ipcMain.handle("moo-tasks-sidecar-status", () =>
    getMooTasksSidecarStatus(),
  );
  ipcMain.handle("moo-tasks-sidecar-log-tail", () =>
    getMooTasksSidecarLogTail(),
  );
  ipcMain.handle("moo-tasks-sidecar-clear-logs", () => {
    clearMooTasksSidecarLogs();
    return { success: true };
  });
  ipcMain.handle(
    "moo-tasks-sidecar-start",
    (_event, options?: MooTasksSidecarStartOptions) =>
      startMooTasksSidecar(options ?? {}),
  );
  ipcMain.handle("moo-tasks-sidecar-stop", () =>
    stopMooTasksSidecar(),
  );
  ipcMain.handle(
    "moo-tasks-sidecar-restart",
    (_event, options?: MooTasksSidecarStartOptions) =>
      restartMooTasksSidecar(options ?? {}),
  );

  // Log viewer
  ipcMain.handle("read-logs", (_event, logFile?: string, lines?: number) => {
    const conn = getConnectionConfig();
    if (conn.mode === "ssh" && conn.ssh)
      return sshReadLogs(conn.ssh, logFile, lines);
    return readLogs(logFile, lines);
  });
}

function buildMenu(): void {
  const isMac = process.platform === "darwin";

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "Chat",
      submenu: [
        {
          label: "New Chat",
          accelerator: "CmdOrCtrl+N",
          click: (): void => {
            mainWindow?.webContents.send("menu-new-chat");
          },
        },
        { type: "separator" },
        {
          label: "Search Sessions",
          accelerator: "CmdOrCtrl+K",
          click: (): void => {
            mainWindow?.webContents.send("menu-search-sessions");
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
        ...(is.dev
          ? [
              { type: "separator" as const },
              { role: "reload" as const },
              { role: "toggleDevTools" as const },
            ]
          : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" as const }, { role: "front" as const }]
          : [{ role: "close" as const }]),
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Hermes Agent Runtime on GitHub",
          click: (): void => {
            openExternalUrl("https://github.com/NousResearch/hermes-agent/");
          },
        },
        {
          label: "Agent Desktop Issues",
          click: (): void => {
            openExternalUrl("https://github.com/JZKK720/cubecloud-agentic-os/issues");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function setupUpdater(): void {
  // IPC handlers must always be registered to avoid invoke errors
  ipcMain.handle("get-app-version", () => app.getVersion());

  // Portable Windows builds set PORTABLE_EXECUTABLE_DIR. They have no
  // install location for electron-updater to replace in place, so an
  // update check just fails and surfaces a spurious "Update failed".
  // Skip the updater for them (users update by downloading a new
  // portable .exe), same as dev mode.
  const isPortableBuild = !!process.env.PORTABLE_EXECUTABLE_DIR;

  if (!app.isPackaged || isPortableBuild) {
    // Skip auto-update in dev mode and portable builds
    ipcMain.handle("check-for-updates", async () => null);
    ipcMain.handle("download-update", () => true);
    ipcMain.handle("install-update", () => {});
    return;
  }

  // Dynamic import to avoid electron-updater issues in dev mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { autoUpdater } = require("electron-updater") as {
    autoUpdater: AppUpdater;
  };

  // Log the updater's own lifecycle to <userData>/logs/updater.log so a
  // failed update (e.g. issue #271) leaves something to diagnose.
  autoUpdater.logger = updaterLogger;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update-available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    mainWindow?.webContents.send("update-download-progress", {
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update-downloaded");
  });

  autoUpdater.on("error", (err) => {
    mainWindow?.webContents.send("update-error", err.message);
  });

  ipcMain.handle("check-for-updates", async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo?.version || null;
    } catch {
      return null;
    }
  });

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      mainWindow?.webContents.send("update-error", message);
      return false;
    }
  });

  ipcMain.handle("install-update", () => {
    // Bracket the suspect call: if the log shows this line but the app
    // never relaunches, the failure is in quitAndInstall / the installer.
    updaterLogger.info(
      "Restart requested by user —calling quitAndInstall(isSilent=false, isForceRunAfter=true)",
    );
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}

// Opt-in Chrome DevTools Protocol port for E2E testing. Set
// ENABLE_CDP=1 (with optional CDP_PORT, default 9222) before launching
// `npm run dev` to expose the renderer for Playwright (or any CDP
// client) to attach and drive the UI without going through
// screenshots / OCR. Off by default —no effect on normal dev or
// production builds. See `scripts/README.md` for the harness workflow.
if (process.env.ENABLE_CDP === "1") {
  app.commandLine.appendSwitch(
    "remote-debugging-port",
    process.env.CDP_PORT || "9222",
  );
}

app.whenReady().then(() => {
  app.name = "Agent Desktop";
  electronApp.setAppUserModelId("io.cubecloud.desktop");

  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("web-contents-created", (_event, contents) => {
    if (contents.getType() === "webview") {
      hardenAttachedWebContents(contents);
    }
  });

  buildMenu();
  setupIPC();
  createWindow();
  setupUpdater();

  // Pre-populate default MCP servers on first run so the MCP screen
  // shows pre-installed servers instead of an empty list.
  try {
    ensureDefaultMcpServers();
  } catch {
    // best effort — don't crash startup
  }

  // Auto-start SSH tunnel if configured
  const conn = getConnectionConfig();
  if (conn.mode === "ssh" && conn.ssh.host) {
    (async () => {
      await startConfiguredSshTunnel();
    })().catch((err) => {
      console.error("[SSH TUNNEL] Failed to start on launch:", err);
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    stopGateway();
    stopSshTunnel();
    app.quit();
  }
});

app.on("before-quit", () => {
  stopHealthPolling();
  if (currentChatAbort) {
    currentChatAbort();
    currentChatAbort = null;
  }
  stopGateway();
  stopSshTunnel();
  // Release any open CodeGraph runtime SQLite handles so the
  // OS can drop the DB locks before the process exits. Best-effort
  // — `close()` is idempotent for the wrapper but the SDK throws
  // if the underlying DB is already gone (e.g. interrupted
  // indexing), so we swallow.
  try {
    closeAllCodeGraphRuntimes();
  } catch (err) {
    console.error("[codegraph-runtime] closeAll on shutdown failed:", err);
  }
  // Ask the EverOS sidecar to stop. The manager has its own
  // SIGTERM → SIGKILL timer (see everos-sidecar.ts), so we
  // don't need to wait synchronously here — the child is
  // detached from the parent process group and will exit
  // shortly. Best-effort: a missing binary or already-stopped
  // process resolves immediately with `state: "stopped"`.
  try {
    stopEverOsSidecar();
  } catch (err) {
    console.error("[everos-sidecar] stop on shutdown failed:", err);
  }

  // Ask the Headroom proxy sidecar to stop. Same best-effort
  // pattern as EverOS — the manager has its own SIGTERM →
  // SIGKILL timer.
  try {
    stopHeadroomSidecar();
  } catch (err) {
    console.error("[headroom-sidecar] stop on shutdown failed:", err);
  }

  // Kill any in-flight `headroom learn` subprocess. The
  // learn runner spawns a long-lived Python process for
  // LLM-backed analysis; we want to clean it up on quit.
  try {
    stopHeadroomLearn();
  } catch (err) {
    console.error("[headroom-learn] stop on shutdown failed:", err);
  }

  // Stop the Headroom MCP server. The supervisor has its own
  // SIGTERM → SIGKILL timer (3s); calling stop() here just
  // kicks it off and returns. The subprocess is detached
  // from the parent process group so the kill timer is
  // observed even after Electron has begun tearing down.
  try {
    stopHeadroomMcpServer();
  } catch (err) {
    console.error("[headroom-mcp] stop on shutdown failed:", err);
  }

  // Ask the Moo Tasks sidecar to stop. Same best-effort pattern.
  try {
    stopAllMooTasksSidecars();
  } catch (err) {
    console.error("[moo-tasks-sidecar] stop on shutdown failed:", err);
  }
});
