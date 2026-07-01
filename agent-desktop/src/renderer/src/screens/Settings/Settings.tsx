import { useState, useEffect, useRef, useCallback, useId } from "react";
import { useTheme } from "../../components/ThemeProvider";
import { THEME_OPTIONS } from "../../constants";
import { useI18n } from "../../components/useI18n";
import { APP_LOCALES, type AppLocale } from "../../../../shared/i18n";
import {
  DEFAULT_SSH_LOCAL_PORT,
  DEFAULT_SSH_REMOTE_PORT,
  OPENCLAW_LOCAL_GATEWAY_PORT,
} from "../../../../shared/runtime-defaults";
import {
  formatConnectionDiagnosticDetail,
  formatConnectionDiagnosticStatus,
} from "../../../../shared/connection-diagnostics";
import {
  applyGatewayRuntimePresetToRemoteUrl,
  GATEWAY_RUNTIME_PRESETS,
  inferGatewayRuntimePreset,
  type GatewayRuntimePresetId,
} from "../../../../shared/gateway-runtime-presets";
import {
  getCachedGatewayRuntimePreset,
  setCachedGatewayRuntimePreset,
} from "../../utils/gatewayRuntimePresetCache";
import {
  Check,
  ChevronDown,
  Download,
  Upload,
  FileText,
  Send,
} from "lucide-react";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
} from "../../utils/analytics";
import { SchemasSection } from "./SchemasSection";
import { CarefulTester } from "./CarefulTester";

type RuntimeProviderSnapshot = Awaited<
  ReturnType<typeof window.hermesAPI.listRuntimeProviders>
>[number];
type TaskOrchestratorSnapshot = Awaited<
  ReturnType<typeof window.hermesAPI.listTaskOrchestrators>
>[number];

const TELEGRAM_COMMUNITY_URL = "https://t.me/hermes_agent_desktop";

const LANGUAGE_NATIVE_NAMES: Record<AppLocale, string> = {
  en: "English",
  es: "Español",
  id: "Bahasa Indonesia",
  ja: "日本語",
  "pt-BR": "Português (BR)",
  "pt-PT": "Português (PT)",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文（台灣）",
};

// Build a mask string the same width as the stored API key so the
// "saved" state of the input looks like a key, not a constant blob.
// Length is exposed by the main process via PublicConnectionConfig.
// 0 falls back to 8 dots so the user gets a visible "set" indicator
// even if main didn't report a length yet. Capped to keep absurdly
// long keys from blowing up the field.
function makeApiKeyMask(length: number): string {
  const n = Math.min(Math.max(length, 8), 128);
  return "*".repeat(n);
}

// Read cached values from localStorage for instant display
function getCachedVersion(): string | null {
  try {
    return localStorage.getItem("hermes-version-cache");
  } catch {
    return null;
  }
}

function getCachedOpenClaw(): { found: boolean; path: string | null } | null {
  try {
    const raw = localStorage.getItem("hermes-openclaw-cache");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function Settings({ profile }: { profile?: string }): React.JSX.Element {
  const { t, locale, setLocale } = useI18n();
  const [hermesHome, setHermesHome] = useState("");
  const { theme, setTheme } = useTheme();
  const [gatewayRuntimePreset, setGatewayRuntimePreset] = useState<
    GatewayRuntimePresetId
  >(() => getCachedGatewayRuntimePreset());

  // Hermes engine info — initialize from localStorage cache for instant display
  const [hermesVersion, setHermesVersion] = useState<string | null>(
    getCachedVersion,
  );
  const [appVersion, setAppVersion] = useState("");
  const [doctorOutput, setDoctorOutput] = useState<string | null>(null);
  const [doctorRunning, setDoctorRunning] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [updateResultType, setUpdateResultType] = useState<
    "success" | "error" | null
  >(null);

  // OpenClaw migration — initialize from localStorage cache
  const cachedClaw = getCachedOpenClaw();
  const [openclawFound, setOpenclawFound] = useState(
    cachedClaw?.found ?? false,
  );
  const [openclawPath, setOpenclawPath] = useState<string | null>(
    cachedClaw?.path ?? null,
  );
  const [migrationDismissed, setMigrationDismissed] = useState(
    () => localStorage.getItem("hermes-openclaw-dismissed") === "true",
  );
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState("");
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [migrationResultType, setMigrationResultType] = useState<
    "success" | "error" | null
  >(null);
  const migrationLogRef = useRef<HTMLPreElement>(null);
  const [runtimeProviders, setRuntimeProviders] = useState<
    RuntimeProviderSnapshot[]
  >([]);
  const [taskOrchestrators, setTaskOrchestrators] = useState<
    TaskOrchestratorSnapshot[]
  >([]);

  // Connection mode
  const [connMode, setConnMode] = useState<"local" | "remote" | "ssh">("local");
  const [connRemoteUrl, setConnRemoteUrl] = useState("");
  const [connApiKey, setConnApiKey] = useState("");
  const [connApiKeyMask, setConnApiKeyMask] = useState("");
  const [connHasApiKey, setConnHasApiKey] = useState(false);
  const [connTesting, setConnTesting] = useState(false);
  const [connStatus, setConnStatus] = useState<string | null>(null);
  const connLoaded = useRef(false);
  const [apiServerKeyMissing, setApiServerKeyMissing] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);

  // SSH connection state
  const [sshHost, setSshHost] = useState("");
  const [sshPort, setSshPort] = useState("");
  const [sshUser, setSshUser] = useState("");
  const [sshKeyPath, setSshKeyPath] = useState("");
  const [sshRemotePort, setSshRemotePort] = useState("");

  // Backup / Import state
  const [backingUp, setBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Log viewer state
  const [logContent, setLogContent] = useState("");
  const [logFile, setLogFile] = useState("gateway.log");
  const [logPath, setLogPath] = useState("");
  const [logsExpanded, setLogsExpanded] = useState(false);

  // Network settings
  const [forceIpv4, setForceIpv4] = useState(false);
  const [httpProxy, setHttpProxy] = useState("");
  const [networkSaved, setNetworkSaved] = useState(false);

  // Debug dump
  const [dumpOutput, setDumpOutput] = useState<string | null>(null);
  const [dumpRunning, setDumpRunning] = useState(false);

  // Analytics consent
  const [analyticsEnabled, setAnalyticsEnabled] = useState(() =>
    getAnalyticsConsent(),
  );

  // Privacy / data location
  const [openingFolder, setOpeningFolder] = useState(false);
  const [openFolderError, setOpenFolderError] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  // Profile switcher
  const [profiles, setProfiles] = useState<
    Array<{
      name: string;
      isActive: boolean;
      gatewayRunning: boolean;
    }>
  >([]);
  const [switchingProfile, setSwitchingProfile] = useState<string | null>(
    null,
  );
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileClone, setNewProfileClone] = useState(true);
  const [newProfileError, setNewProfileError] = useState<string | null>(null);
  const [newProfileBusy, setNewProfileBusy] = useState(false);
  const openclawProvider =
    runtimeProviders.find(
      (provider) => provider.definition.id === "openclaw",
    ) ?? null;
  // Provider snapshots drive lane labels on the connection panels.
  // IronClaw now supports SSH attach through the same forwarded
  // gateway path as OpenClaw, so both panels should expose it.
  const ironclawProvider =
    runtimeProviders.find(
      (provider) => provider.definition.id === "ironclaw",
    ) ?? null;
  const openclawImportAction =
    openclawProvider?.actions.find(
      (action) => action.id === "import-existing-state",
    ) ?? null;
  const openclawWslInstallAction =
    openclawProvider?.actions.find((action) => action.id === "install-via-wsl") ??
    null;
  const openclawInstallGuideAction =
    openclawProvider?.actions.find((action) => action.id === "open-install-guide") ??
    null;
  // V2.10.61 — widened to handle the ironclaw preset. The
  // selectedGatewayRuntime drives the URL placeholder, the secret
  // label, and the connection-mode hint copy in the remote panel.
  const selectedGatewayRuntime = (() => {
    if (gatewayRuntimePreset === "hermes") {
      return {
        ...GATEWAY_RUNTIME_PRESETS.hermes,
        displayName:
          runtimeProviders.find((provider) => provider.definition.id === "hermes")
            ?.definition.displayName ?? GATEWAY_RUNTIME_PRESETS.hermes.displayName,
      };
    }
    if (gatewayRuntimePreset === "ironclaw") {
      return {
        ...GATEWAY_RUNTIME_PRESETS.ironclaw,
        displayName:
          ironclawProvider?.definition.displayName ??
          GATEWAY_RUNTIME_PRESETS.ironclaw.displayName,
      };
    }
    return {
      ...GATEWAY_RUNTIME_PRESETS.openclaw,
      displayName:
        openclawProvider?.definition.displayName ??
        GATEWAY_RUNTIME_PRESETS.openclaw.displayName,
    };
  })();

  function persistGatewayRuntimePreset(next: GatewayRuntimePresetId): void {
    setGatewayRuntimePreset(next);
    setCachedGatewayRuntimePreset(next);
  }

  function runtimeDisplayNameFor(
    presetId: GatewayRuntimePresetId,
  ): string {
    if (presetId === "ironclaw") {
      return (
        ironclawProvider?.definition.displayName ??
        GATEWAY_RUNTIME_PRESETS.ironclaw.displayName
      );
    }
    if (presetId === "openclaw") {
      return (
        openclawProvider?.definition.displayName ??
        GATEWAY_RUNTIME_PRESETS.openclaw.displayName
      );
    }
    return (
      runtimeProviders.find((provider) => provider.definition.id === "hermes")
        ?.definition.displayName ?? GATEWAY_RUNTIME_PRESETS.hermes.displayName
    );
  }

  function applyGatewayRuntimePreset(next: GatewayRuntimePresetId): void {
    persistGatewayRuntimePreset(next);
    setConnRemoteUrl((current) =>
      applyGatewayRuntimePresetToRemoteUrl(current, next),
    );
    setSshRemotePort(String(GATEWAY_RUNTIME_PRESETS[next].sshRemotePort));
  }

  async function refreshRuntimeRegistry(): Promise<void> {
    const providers = await window.hermesAPI.listRuntimeProviders();
    setRuntimeProviders(providers);
    const openclaw = providers.find(
      (provider) => provider.definition.id === "openclaw",
    );
    const cached = {
      found: Boolean(openclaw?.detected),
      path: openclaw?.detectedPath ?? null,
    };
    setOpenclawFound(cached.found);
    setOpenclawPath(cached.path);
    try {
      localStorage.setItem("hermes-openclaw-cache", JSON.stringify(cached));
    } catch {
      /* ignore */
    }
  }

  async function refreshTaskOrchestrators(): Promise<void> {
    const orchestrators = await window.hermesAPI.listTaskOrchestrators();
    setTaskOrchestrators(orchestrators);
  }

  async function refreshProfiles(): Promise<void> {
    try {
      const list = await window.hermesAPI.listProfiles();
      setProfiles(
        list.map((p) => ({
          name: p.name,
          isActive: p.isActive,
          gatewayRunning: p.gatewayRunning,
        })),
      );
    } catch {
      // Profile discovery is local-only; SSH/remote modes return []
      // and we keep the empty list rather than surfacing an error.
      setProfiles([]);
    }
  }

  async function handleOpenDataFolder(): Promise<void> {
    setOpeningFolder(true);
    setOpenFolderError(null);
    try {
      const result = await window.hermesAPI.openDataFolder(profile);
      if (result) {
        setOpenFolderError(result);
      }
    } catch (err) {
      setOpenFolderError(String(err));
    } finally {
      setOpeningFolder(false);
    }
  }

  async function handleCopyPath(): Promise<void> {
    if (!hermesHome) return;
    try {
      await window.hermesAPI.copyToClipboard(hermesHome);
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 1500);
    } catch {
      // Best-effort: clipboard write can fail in some sandbox contexts.
      // We don't surface a banner so the user doesn't think their data
      // is at risk; the Open Folder button is the real action.
    }
  }

  async function handleSwitchProfile(name: string): Promise<void> {
    if (switchingProfile) return;
    setSwitchingProfile(name);
    setOpenFolderError(null);
    try {
      const ok = await window.hermesAPI.setActiveProfile(name);
      if (ok) {
        // Active profile is a renderer-wide concern; the Layout
        // listens for a custom event to refresh. We dispatch here
        // so the sidebar reloads without a full app reload.
        window.dispatchEvent(
          new CustomEvent("profile:changed", { detail: { name } }),
        );
        await refreshProfiles();
      }
    } finally {
      setSwitchingProfile(null);
    }
  }

  async function handleCreateProfile(): Promise<void> {
    if (newProfileBusy) return;
    const name = newProfileName.trim();
    if (!name) {
      setNewProfileError(t("settings.profileNameRequired"));
      return;
    }
    setNewProfileError(null);
    setNewProfileBusy(true);
    try {
      const res = await window.hermesAPI.createProfile(name, newProfileClone);
      if (!res.success) {
        setNewProfileError(res.error ?? t("settings.profileCreateFailed"));
        return;
      }
      setNewProfileName("");
      setShowNewProfile(false);
      await refreshProfiles();
    } finally {
      setNewProfileBusy(false);
    }
  }

  const loadConfig = useCallback(async (): Promise<void> => {
    // Load fast config first (cached in main process)
    const [home, aVersion, conn, keyStatus] = await Promise.all([
      window.hermesAPI.getHermesHome(profile),
      window.hermesAPI.getAppVersion(),
      window.hermesAPI.getConnectionConfig(),
      window.hermesAPI.getApiServerKeyStatus(profile),
    ]);
    setHermesHome(home);
    setAppVersion(aVersion);
    setConnMode(conn.mode);
    setConnRemoteUrl(conn.remoteUrl);
    setConnHasApiKey(conn.hasApiKey);
    const mask = conn.hasApiKey ? makeApiKeyMask(conn.apiKeyLength) : "";
    setConnApiKeyMask(mask);
    setConnApiKey(mask);
    persistGatewayRuntimePreset(
      conn.gatewayRuntimePreset ??
        inferGatewayRuntimePreset({
          remoteUrl: conn.remoteUrl,
          sshRemotePort: conn.ssh?.remotePort,
        }),
    );
    setSshHost(conn.ssh?.host || "");
    setSshPort(conn.ssh?.port ? String(conn.ssh.port) : "");
    setSshUser(conn.ssh?.username || "");
    setSshKeyPath(conn.ssh?.keyPath || "");
    setSshRemotePort(conn.ssh?.remotePort ? String(conn.ssh.remotePort) : "");
    setApiServerKeyMissing(!keyStatus.hasKey);
    connLoaded.current = true;

    // Load network settings from config.yaml
    window.hermesAPI.getConfig("network.force_ipv4", profile).then((v) => {
      setForceIpv4(v === "true" || v === "True");
    });
    window.hermesAPI.getConfig("network.proxy", profile).then((v) => {
      setHttpProxy(v || "");
    });

    // Defer slow calls — background refresh, cached values show instantly
    window.hermesAPI.getHermesVersion().then((v) => {
      setHermesVersion(v);
      if (v) {
        try {
          localStorage.setItem("hermes-version-cache", v);
        } catch {
          /* ignore */
        }
      }
    });

    if (localStorage.getItem("hermes-openclaw-dismissed") !== "true") {
      void refreshRuntimeRegistry();
    }
    void refreshTaskOrchestrators();
    void refreshProfiles();
  }, [profile]);

  useEffect(() => {
    void Promise.resolve().then(loadConfig);
  }, [loadConfig]);

  async function handleMigrate(): Promise<void> {
    if (!openclawImportAction) {
      setMigrationResult(t("settings.errorOpenClawImportUnavailable"));
      setMigrationResultType("error");
      return;
    }

    setMigrating(true);
    setMigrationLog("");
    setMigrationResult(null);

    const cleanup = window.hermesAPI.onInstallProgress((p) => {
      setMigrationLog(p.log);
    });

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawImportAction.id,
      );
      cleanup();
      if (result.success) {
        setMigrationResult(result.message || t("settings.migrationComplete"));
        setMigrationResultType("success");
        setOpenclawFound(false);
        void refreshRuntimeRegistry();
      } else {
        setMigrationResult(result.error || t("settings.migrationFailed"));
        setMigrationResultType("error");
      }
    } catch (err) {
      cleanup();
      setMigrationResult(
        (err as Error).message || t("settings.migrationFailed"),
      );
      setMigrationResultType("error");
    }
    setMigrating(false);
  }

  async function handleOpenClawInstallGuide(): Promise<void> {
    if (!openclawInstallGuideAction) {
      return;
    }

    setMigrationResult(null);
    setMigrationResultType(null);

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawInstallGuideAction.id,
      );
      setMigrationResult(
        result.success
          ? result.message || "OpenClaw install guide opened."
          : result.error || "Could not open the OpenClaw install guide.",
      );
      setMigrationResultType(result.success ? "success" : "error");
    } catch (err) {
      setMigrationResult(
        (err as Error).message || "Could not open the OpenClaw install guide.",
      );
      setMigrationResultType("error");
    }
  }

  async function handleOpenClawWslInstall(): Promise<void> {
    if (!openclawWslInstallAction) {
      return;
    }

    setMigrationResult(null);
    setMigrationResultType(null);

    try {
      const result = await window.hermesAPI.runRuntimeProviderAction(
        "openclaw",
        openclawWslInstallAction.id,
      );
      setMigrationResult(
        result.success
          ? result.message ||
              "Opened a WSL shell for OpenClaw onboarding. Finish the flow there, then return here to attach or import it."
          : result.error || "Could not launch the OpenClaw WSL handoff.",
      );
      setMigrationResultType(result.success ? "success" : "error");
    } catch (err) {
      setMigrationResult(
        (err as Error).message || "Could not launch the OpenClaw WSL handoff.",
      );
      setMigrationResultType("error");
    }
  }

  function handleDismissMigration(): void {
    localStorage.setItem("hermes-openclaw-dismissed", "true");
    setMigrationDismissed(true);
  }

  function getConnectionApiKeyForSave(): string | undefined {
    // Mask sentinel in the field means "the secret is still server-side
    // and the user hasn't touched it" — always preserve the stored key.
    // The old code wiped the key whenever the URL changed, so a one-
    // character URL edit (fix typo, add /v1) silently dropped the saved
    // credential. To clear the key, the user must explicitly erase the
    // field.
    if (connHasApiKey && connApiKey === connApiKeyMask) {
      return undefined;
    }
    return connApiKey.trim();
  }

  async function handleSaveConnection(): Promise<void> {
    if (connMode === "ssh") {
      const apiKey = getConnectionApiKeyForSave();
      const resolvedRemotePort =
        parseInt(sshRemotePort, 10) || selectedGatewayRuntime.sshRemotePort;
      await window.hermesAPI.setSshConfig(
        sshHost.trim(),
        parseInt(sshPort, 10) || 22,
        sshUser.trim(),
        sshKeyPath.trim(),
        resolvedRemotePort,
        DEFAULT_SSH_LOCAL_PORT,
        apiKey,
        gatewayRuntimePreset,
      );
      if (apiKey !== undefined) {
        const hasApiKey = apiKey.length > 0;
        setConnHasApiKey(hasApiKey);
        if (hasApiKey) {
          const mask = makeApiKeyMask(apiKey.length);
          setConnApiKeyMask(mask);
          setConnApiKey(mask);
        } else {
          setConnApiKey("");
          setConnApiKeyMask("");
        }
      }
    } else {
      const apiKey = getConnectionApiKeyForSave();
      await window.hermesAPI.setConnectionConfig(
        connMode,
        connRemoteUrl,
        apiKey,
        gatewayRuntimePreset,
      );
      if (apiKey !== undefined) {
        const hasApiKey = apiKey.length > 0;
        setConnHasApiKey(hasApiKey);
        if (hasApiKey) {
          const mask = makeApiKeyMask(apiKey.length);
          setConnApiKeyMask(mask);
          setConnApiKey(mask);
        } else {
          setConnApiKeyMask("");
        }
      }
    }
    setConnStatus("Saved");
    setTimeout(() => setConnStatus(null), 2000);
  }

  async function handleTestConnection(): Promise<void> {
    if (connMode === "ssh") {
      if (!sshHost.trim() || !sshUser.trim()) {
        setConnStatus(t("settings.errorHostAndUsernameRequired"));
        return;
      }
      setConnTesting(true);
      setConnStatus(null);
      const resolvedRemotePort =
        parseInt(sshRemotePort, 10) || selectedGatewayRuntime.sshRemotePort;
      const diagnostic = await window.hermesAPI.diagnoseSshConnection(
        sshHost.trim(),
        parseInt(sshPort, 10) || 22,
        sshUser.trim(),
        sshKeyPath.trim(),
        resolvedRemotePort,
        gatewayRuntimePreset,
        getConnectionApiKeyForSave(),
      );
      setConnTesting(false);
      const displayPreset = diagnostic.runtime ?? gatewayRuntimePreset;
      if (diagnostic.ok && displayPreset !== gatewayRuntimePreset) {
        persistGatewayRuntimePreset(displayPreset);
      }
      setConnStatus(
        diagnostic.ok
          ? formatConnectionDiagnosticStatus({
              diagnostic,
              runtimeDisplayName: runtimeDisplayNameFor(displayPreset),
              runtimePresetId: displayPreset,
            })
          : formatConnectionDiagnosticDetail({
              diagnostic,
              runtimeDisplayName: runtimeDisplayNameFor(displayPreset),
              runtimePresetId: displayPreset,
            }),
      );
    } else {
      const url = connRemoteUrl.trim();
      if (!url) {
        setConnStatus(t("settings.errorPleaseEnterUrl"));
        return;
      }
      setConnTesting(true);
      setConnStatus(null);
      const diagnostic = await window.hermesAPI.diagnoseRemoteConnection(
        url,
        gatewayRuntimePreset,
        getConnectionApiKeyForSave(),
      );
      setConnTesting(false);
      const displayPreset = diagnostic.runtime ?? gatewayRuntimePreset;
      if (diagnostic.ok && displayPreset !== gatewayRuntimePreset) {
        persistGatewayRuntimePreset(displayPreset);
      }
      setConnStatus(
        diagnostic.ok
          ? formatConnectionDiagnosticStatus({
              diagnostic,
              runtimeDisplayName: runtimeDisplayNameFor(displayPreset),
              runtimePresetId: displayPreset,
            })
          : formatConnectionDiagnosticDetail({
              diagnostic,
              runtimeDisplayName: runtimeDisplayNameFor(displayPreset),
              runtimePresetId: displayPreset,
            }),
      );
    }
  }

  async function handleSwitchToLocal(): Promise<void> {
    setConnMode("local");
    setConnRemoteUrl("");
    setConnApiKey("");
    setConnApiKeyMask("");
    setConnHasApiKey(false);
    await window.hermesAPI.setConnectionConfig("local", "", "");
    setConnStatus(t("settings.switchedToLocal"));
    setTimeout(() => setConnStatus(null), 2000);
  }

  function handleQuickWire(
    mode: "remote" | "ssh",
    runtime: GatewayRuntimePresetId,
  ): void {
    setConnMode(mode);
    applyGatewayRuntimePreset(runtime);
    setConnStatus(
      `Quick preset loaded: ${runtimeDisplayNameFor(runtime)} (${mode === "ssh" ? "SSH tunnel" : "remote gateway"}).`,
    );
    setTimeout(() => setConnStatus(null), 2500);
  }

  const connectionModeHint =
    connMode === "local"
      ? t("settings.modeLocalHint")
      : connMode === "ssh"
        ? gatewayRuntimePreset === "openclaw"
          ? `Tunnel to a remote ${selectedGatewayRuntime.displayName} compatibility gateway over SSH with no exposed ports. OpenClaw HTTP compatibility must be enabled on the remote host.`
          : gatewayRuntimePreset === "ironclaw"
            ? `Tunnel to a remote ${selectedGatewayRuntime.displayName} gateway over SSH with no exposed ports. The forwarded gateway should expose /api/health plus the OpenAI-compatible /v1 endpoints, and may require a gateway token.`
            : `Tunnel to a remote ${selectedGatewayRuntime.displayName} gateway over SSH with no exposed ports. Save its API server key here if auth is enabled.`
        : gatewayRuntimePreset === "openclaw"
          ? `Attach directly to a remote ${selectedGatewayRuntime.displayName} compatibility endpoint. Use the URL ending in /v1 and provide the gateway token or password if auth is enabled.`
          : gatewayRuntimePreset === "ironclaw"
            ? `Attach directly to a remote ${selectedGatewayRuntime.displayName} WASM-sandbox container gateway. Use the published container port (default 8281) and the /health operator-facing surface.`
            : `Attach directly to a remote ${selectedGatewayRuntime.displayName} gateway over HTTP. Provide the API server key if auth is enabled.`;

  async function handleBackup(): Promise<void> {
    setBackingUp(true);
    setBackupResult(null);
    const result = await window.hermesAPI.runHermesBackup(profile);
    setBackingUp(false);
    if (result.success) {
      setBackupResult(`Backup created: ${result.path || "success"}`);
    } else {
      setBackupResult(result.error || "Backup failed.");
    }
  }

  async function handleImport(): Promise<void> {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".tar.gz,.tgz,.zip";
    input.onchange = async (): Promise<void> => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setImportResult(null);
      const filePath = (file as File & { path: string }).path;
      const result = await window.hermesAPI.runHermesImport(filePath, profile);
      setImporting(false);
      if (result.success) {
        setImportResult(t("settings.migrationComplete"));
      } else {
        setImportResult(result.error || t("settings.migrationFailed"));
      }
    };
    input.click();
  }

  async function loadLogs(): Promise<void> {
    const result = await window.hermesAPI.readLogs(logFile, 300);
    setLogContent(result.content);
    setLogPath(result.path);
  }

  async function handleDoctor(): Promise<void> {
    setDoctorRunning(true);
    setDoctorOutput(null);
    const output = await window.hermesAPI.runHermesDoctor();
    setDoctorOutput(output);
    setDoctorRunning(false);
  }

  // Helper to fetch fresh version, clear backend cache, and update localStorage
  function refreshVersion(): void {
    window.hermesAPI.refreshHermesVersion().then((v) => {
      setHermesVersion(v);
      if (v) {
        try {
          localStorage.setItem("hermes-version-cache", v);
        } catch {
          /* ignore */
        }
      }
    });
  }

  async function handleUpdateHermes(): Promise<void> {
    setUpdating(true);
    setUpdateResult(null);
    const result = await window.hermesAPI.runHermesUpdate();
    setUpdating(false);
    if (result.success) {
      setUpdateResult(t("settings.updateSuccess"));
      setUpdateResultType("success");
      refreshVersion();
    } else {
      setUpdateResult(result.error || t("settings.updateFailed"));
      setUpdateResultType("error");
    }
  }

  // Parse "Hermes Agent v0.7.0 (2026.4.3) Project: ... Python: 3.11.15 OpenAI SDK: 2.30.0 Update available: ..."
  const parsedVersion = (() => {
    if (!hermesVersion) return null;
    const v = hermesVersion;
    const version = v.match(/v([\d.]+)/)?.[1] || "";
    const date = v.match(/\(([\d.]+)\)/)?.[1] || "";
    const python = v.match(/Python:\s*([\d.]+)/)?.[1] || "";
    const sdk = v.match(/OpenAI SDK:\s*([\d.]+)/)?.[1] || "";
    const updateMatch = v.match(/Update available:\s*(.+?)(?:\s*—|$)/);
    const updateInfo = updateMatch?.[1]?.trim() || null;
    return { version, date, python, sdk, updateInfo };
  })();

  return (
    <div className="settings-container">
      <h1 className="settings-header">{t("settings.title")}</h1>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.sections.hermesAgent")}
        </div>
        <div className="settings-hermes-info">
          <div className="settings-hermes-row">
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">
                {t("common.engine")}
              </span>
              {hermesVersion === null ? (
                <span className="skeleton skeleton-sm" />
              ) : (
                <span className="settings-hermes-value">
                  {parsedVersion
                    ? `v${parsedVersion.version}`
                    : t("settings.notDetected")}
                </span>
              )}
            </div>
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">
                {t("common.released")}
              </span>
              {hermesVersion === null ? (
                <span className="skeleton skeleton-sm" />
              ) : (
                <span className="settings-hermes-value">
                  {parsedVersion?.date || "—"}
                </span>
              )}
            </div>
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">
                {t("common.desktop")}
              </span>
              {!appVersion ? (
                <span className="skeleton skeleton-sm" />
              ) : (
                <span className="settings-hermes-value">
                  {t("settings.version", { version: appVersion })}
                </span>
              )}
            </div>
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">Python</span>
              {hermesVersion === null ? (
                <span className="skeleton skeleton-sm" />
              ) : (
                <span className="settings-hermes-value">
                  {parsedVersion?.python || "—"}
                </span>
              )}
            </div>
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">OpenAI SDK</span>
              {hermesVersion === null ? (
                <span className="skeleton skeleton-sm" />
              ) : (
                <span className="settings-hermes-value">
                  {parsedVersion?.sdk || "—"}
                </span>
              )}
            </div>
            <div className="settings-hermes-detail">
              <span className="settings-hermes-label">{t("common.home")}</span>
              {!hermesHome ? (
                <span className="skeleton skeleton-md" />
              ) : (
                <span className="settings-hermes-value settings-hermes-path">
                  {hermesHome}
                </span>
              )}
            </div>
          </div>
          {parsedVersion?.updateInfo && (
            <div className="settings-hermes-update-badge">
              {parsedVersion.updateInfo}
            </div>
          )}
          <div className="settings-hermes-actions">
            {parsedVersion?.updateInfo ? (
              <button
                className="btn btn-primary "
                onClick={handleUpdateHermes}
                disabled={updating}
              >
                {updating ? t("settings.updating") : t("settings.updateEngine")}
              </button>
            ) : (
              <button className="btn btn-secondary" disabled>
                {t("settings.latestVersion")}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleDoctor}
              disabled={doctorRunning}
            >
              {doctorRunning
                ? t("settings.runningDiagnosis")
                : t("settings.runDiagnosis")}
            </button>
            <button
              className="btn btn-secondary"
              onClick={async () => {
                setDumpRunning(true);
                setDumpOutput(null);
                const output = await window.hermesAPI.runHermesDump();
                setDumpOutput(output);
                setDumpRunning(false);
              }}
              disabled={dumpRunning}
            >
              {dumpRunning ? t("settings.running") : t("settings.debugDump")}
            </button>
          </div>
          {updateResult && (
            <div
              className={`settings-hermes-result ${updateResultType || "error"}`}
            >
              {updateResult}
            </div>
          )}
          {doctorOutput && (
            <pre className="settings-hermes-doctor">{doctorOutput}</pre>
          )}
          {dumpOutput && (
            <pre className="settings-hermes-doctor">{dumpOutput}</pre>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Community</div>
        <div className="settings-field">
          <div className="settings-field-hint settings-field-hint--spaced-sm">
            Open the current community channel to ask questions, report issues,
            and share feedback.
          </div>
          <div className="settings-hermes-actions">
            <button
              className="btn btn-secondary"
              onClick={() =>
                window.hermesAPI.openExternal(TELEGRAM_COMMUNITY_URL)
              }
              title={TELEGRAM_COMMUNITY_URL}
            >
              <Send size={14} className="settings-inline-icon" />
              Open Community Channel
            </button>
          </div>
        </div>
      </div>

      <SchemasSection profile={profile} />

      <div className="settings-section">
        <div className="settings-section-title">/careful guard</div>
        <div
          className="settings-field-hint settings-field-hint--spaced-md settings-field-hint--relaxed"
        >
          V2 Step 9 — checks shell commands against the destructive-pattern
          list. The main use site is the Plans dispatch flow, which surfaces
          a <code>warn</code> advisory when the body contains a destructive
          command. This panel lets you test the matcher ad-hoc.
        </div>
        <CarefulTester profile={profile} />
      </div>

      <div className="settings-section">
        <div className="settings-section-title">Task orchestration</div>
        <div className="settings-field-hint settings-field-hint--spaced-md">
          Hermes remains the default orchestrator. Optional runtimes and
          bridges can be surfaced here without reviving the retired Office
          surface.
        </div>
        {taskOrchestrators.map((orchestrator) => (
          <div key={orchestrator.definition.id} className="settings-field">
            <label className="settings-field-label">
              {orchestrator.definition.displayName}
            </label>
            <div className="settings-field-hint">{orchestrator.summary}</div>
            <div className="settings-field-hint">{orchestrator.detail}</div>
            <div className="settings-field-hint">
              Status: {orchestrator.status}
              {orchestrator.detectedCommand
                ? ` · command: ${orchestrator.detectedCommand}`
                : ""}
            </div>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.connectionSection")}
          {connStatus && (
              <span className="settings-saved settings-saved--offset">
              {connStatus}
            </span>
          )}
        </div>

        <div className="settings-field">
          <label className="settings-field-label">Quick wire presets</label>
          <div className="settings-hermes-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => handleQuickWire("remote", "hermes")}
            >
              Hermes API (remote)
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => handleQuickWire("remote", "ironclaw")}
            >
              IronClaw gateway (remote)
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => handleQuickWire("ssh", "ironclaw")}
            >
              IronClaw gateway (SSH)
            </button>
          </div>
          <div className="settings-field-hint">
            Pick a preset to auto-select mode + runtime lane. Then set host URL and token, test, and save.
          </div>
        </div>

        <div className="settings-field">
          <label className="settings-field-label">
            {t("settings.connectionMode")}
          </label>
          <div className="settings-theme-options">
            <button
              className={`settings-theme-option ${connMode === "local" ? "active" : ""}`}
              onClick={() => {
                setConnMode("local");
                if (connLoaded.current) handleSwitchToLocal();
              }}
            >
              {t("settings.modeLocal")}
            </button>
            <button
              className={`settings-theme-option ${connMode === "remote" ? "active" : ""}`}
              onClick={() => setConnMode("remote")}
            >
              {t("settings.modeRemote")}
            </button>
            <button
              className={`settings-theme-option ${connMode === "ssh" ? "active" : ""}`}
              onClick={() => setConnMode("ssh")}
            >
              SSH Tunnel
            </button>
          </div>
          <div className="settings-field-hint">
            {connectionModeHint}
          </div>
        </div>

        {!apiServerKeyMissing ? null : connMode === "local" ? (
          <div className="settings-api-key-banner">
            <div className="settings-api-key-banner-title">
              Session history disabled — <code>API_SERVER_KEY</code> not set
            </div>
            <div className="settings-api-key-banner-desc">
              Without an API server key the gateway cannot authenticate session
              continuation requests. Messages will still send, but conversation
              history won&apos;t be preserved across restarts.
            </div>
            <button
              className="btn btn-primary"
              disabled={generatingKey}
              onClick={async () => {
                setGeneratingKey(true);
                await window.hermesAPI.generateApiServerKey(profile);
                setApiServerKeyMissing(false);
                setGeneratingKey(false);
                setConnStatus("API key generated — gateway restarting…");
                setTimeout(() => setConnStatus(null), 4000);
              }}
            >
              {generatingKey ? "Generating…" : "Generate & save a key for me"}
            </button>
          </div>
        ) : (
          <div className="settings-api-key-banner settings-api-key-banner--info">
            <div className="settings-api-key-banner-title">
              {gatewayRuntimePreset === "openclaw"
                ? "Configure OpenClaw gateway auth on the remote server"
                : <><code>API_SERVER_KEY</code> on the remote server</>}
            </div>
            <div className="settings-api-key-banner-desc">
              {gatewayRuntimePreset === "openclaw"
                ? connMode === "ssh"
                  ? "SSH mode: enable OpenClaw HTTP compatibility on the remote host, then provide the gateway token or password here if auth is enabled."
                  : "Remote mode: point Agent Desktop at the OpenClaw compatibility URL, usually ending in /v1, and provide the gateway token or password if auth is enabled."
                : gatewayRuntimePreset === "ironclaw"
                  ? connMode === "ssh"
                    ? "SSH mode: point the tunnel at the published IronClaw gateway port (default 3231). The forwarded gateway should expose /api/health plus the OpenAI-compatible /v1 endpoints, and the Bearer token is optional unless the gateway enforces auth."
                    : "Remote mode: point Agent Desktop at the published IronClaw gateway port (default 3231) and the /api/health operator-facing surface. The Bearer token is optional unless the container enforces auth."
                  : connMode === "ssh"
                    ? "SSH mode: add API_SERVER_KEY=<your-key> to ~/.hermes/profiles/<profile>/.env on the remote host, then restart the gateway there."
                    : "Remote mode: add API_SERVER_KEY=<your-key> to the .env on your remote runtime host, then restart the gateway."}
            </div>
          </div>
        )}

        {connMode === "remote" && (
          <>
            <div className="settings-field">
              <label className="settings-field-label">Runtime lane</label>
              <div className="settings-theme-options">
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "hermes" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("hermes")}
                >
                  {GATEWAY_RUNTIME_PRESETS.hermes.displayName}
                </button>
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "openclaw" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("openclaw")}
                >
                  {selectedGatewayRuntime.displayName === GATEWAY_RUNTIME_PRESETS.hermes.displayName
                    ? GATEWAY_RUNTIME_PRESETS.openclaw.displayName
                    : selectedGatewayRuntime.displayName}
                </button>
                {/* V2.10.61 — IronClaw remote-gateway lane. IronClaw
                    only supports remote-gateway attach (not SSH
                    tunnel), so the button is rendered unconditionally
                    in the remote panel and intentionally omitted from
                    the SSH panel below. */}
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "ironclaw" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("ironclaw")}
                >
                  {selectedGatewayRuntime.displayName === GATEWAY_RUNTIME_PRESETS.hermes.displayName
                    ? GATEWAY_RUNTIME_PRESETS.ironclaw.displayName
                    : selectedGatewayRuntime.displayName}
                </button>
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field-label">
                {t("settings.remoteUrl")}
              </label>
              <input
                className="input"
                type="url"
                value={connRemoteUrl}
                onChange={(e) => setConnRemoteUrl(e.target.value)}
                placeholder={selectedGatewayRuntime.remoteExampleUrl}
                onBlur={handleSaveConnection}
              />
              <div className="settings-field-hint">
                {selectedGatewayRuntime.remoteHint}
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field-label">
                {selectedGatewayRuntime.remoteSecretLabel}
              </label>
              <input
                className="input"
                type="password"
                value={connApiKey}
                onChange={(e) => setConnApiKey(e.target.value)}
                onFocus={(e) => {
                  if (connApiKey === connApiKeyMask) {
                    e.currentTarget.select();
                  }
                }}
                placeholder={selectedGatewayRuntime.remoteSecretPlaceholder}
                onBlur={handleSaveConnection}
              />
              <div className="settings-field-hint">
                {selectedGatewayRuntime.remoteSecretHint}
              </div>
            </div>
            <div className="settings-hermes-actions">
              <button
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={connTesting}
              >
                {connTesting
                  ? t("settings.testingConnection")
                  : t("settings.testConnection")}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveConnection}
              >
                {t("settings.save")}
              </button>
            </div>
          </>
        )}

        {connMode === "ssh" && (
          <>
            <div className="settings-field">
              <label className="settings-field-label">Runtime lane</label>
              <div className="settings-theme-options">
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "hermes" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("hermes")}
                >
                  {GATEWAY_RUNTIME_PRESETS.hermes.displayName}
                </button>
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "openclaw" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("openclaw")}
                >
                  {selectedGatewayRuntime.displayName === GATEWAY_RUNTIME_PRESETS.hermes.displayName
                    ? GATEWAY_RUNTIME_PRESETS.openclaw.displayName
                    : selectedGatewayRuntime.displayName}
                </button>
                <button
                  className={`settings-theme-option ${gatewayRuntimePreset === "ironclaw" ? "active" : ""}`}
                  type="button"
                  onClick={() => applyGatewayRuntimePreset("ironclaw")}
                >
                  {ironclawProvider?.definition.displayName ?? GATEWAY_RUNTIME_PRESETS.ironclaw.displayName}
                </button>
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field-label">SSH Host</label>
              <input
                className="input"
                type="text"
                value={sshHost}
                onChange={(e) => setSshHost(e.target.value)}
                placeholder="192.168.1.100 or myserver.local"
              />
            </div>
            <div className="settings-field">
              <label className="settings-field-label">SSH Port</label>
              <input
                className="input"
                type="number"
                value={sshPort}
                onChange={(e) => setSshPort(e.target.value)}
                placeholder="22"
              />
            </div>
            <div className="settings-field">
              <label className="settings-field-label">Username</label>
              <input
                className="input"
                type="text"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value)}
                placeholder="user"
              />
            </div>
            <div className="settings-field">
              <label className="settings-field-label">
                Private Key Path{" "}
                <span className="settings-field-note">
                  (optional, defaults to ~/.ssh/id_rsa)
                </span>
              </label>
              <input
                className="input"
                type="text"
                value={sshKeyPath}
                onChange={(e) => setSshKeyPath(e.target.value)}
                placeholder="~/.ssh/id_rsa"
              />
            </div>
            <div className="settings-field">
              <label className="settings-field-label">
                Remote Runtime Port{" "}
                <span className="settings-field-note">
                  (default {selectedGatewayRuntime.sshRemotePort})
                </span>
              </label>
              <input
                className="input"
                type="number"
                value={sshRemotePort}
                onChange={(e) => setSshRemotePort(e.target.value)}
                placeholder={String(selectedGatewayRuntime.sshRemotePort)}
              />
              <div className="settings-field-hint">
                Make sure you can run{" "}
                <code className="settings-inline-code">
                  ssh {sshUser || "user"}@{sshHost || "host"}
                </code>{" "}
                without a password prompt. The first connection trusts the host
                key and stores it in{" "}
                <code className="settings-inline-code">
                  ~/.ssh/known_hosts
                </code>
                ; SSH will fail closed if that key changes later.
              </div>
              <div className="settings-field-hint">
                {gatewayRuntimePreset === "openclaw"
                  ? `${selectedGatewayRuntime.displayName} usually listens on ${OPENCLAW_LOCAL_GATEWAY_PORT} and requires its HTTP compatibility surface to be enabled before Agent Desktop can attach.`
                  : `${selectedGatewayRuntime.displayName} usually listens on ${DEFAULT_SSH_REMOTE_PORT} for SSH attach.`}
              </div>
            </div>
            <div className="settings-field">
              <label className="settings-field-label">
                {selectedGatewayRuntime.sshSecretLabel}
              </label>
              <input
                className="input"
                type="password"
                value={connApiKey}
                onChange={(e) => setConnApiKey(e.target.value)}
                onFocus={(e) => {
                  if (connApiKey === connApiKeyMask) {
                    e.currentTarget.select();
                  }
                }}
                placeholder={selectedGatewayRuntime.remoteSecretPlaceholder}
              />
              <div className="settings-field-hint">
                {selectedGatewayRuntime.sshSecretHint}
              </div>
            </div>
            <div className="settings-hermes-actions">
              <button
                className="btn btn-secondary"
                onClick={handleTestConnection}
                disabled={connTesting}
              >
                {connTesting ? "Testing SSH…" : "Test SSH Connection"}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveConnection}
              >
                {t("settings.save")}
              </button>
            </div>
          </>
        )}
      </div>

      {!openclawFound &&
        (openclawWslInstallAction || openclawInstallGuideAction) && (
          <div className="settings-migration-banner">
            <div className="settings-migration-header">
              <div>
                <div className="settings-migration-title">
                  {openclawProvider?.definition.displayName ?? "OpenClaw"} optional runtime
                </div>
                <div className="settings-migration-desc">
                  {openclawProvider?.summary ??
                    "OpenClaw stays behind a guided install lane instead of being bundled into Agent Desktop."}
                </div>
                <div className="settings-field-hint">
                  {openclawProvider?.detail ??
                    "Use the WSL handoff on Windows or open the upstream onboarding guide before you attach or import it here."}
                </div>
              </div>
            </div>
            {migrationResult && (
              <div
                className={`settings-hermes-result ${migrationResultType || "error"}`}
              >
                {migrationResult}
              </div>
            )}
            <div className="settings-migration-actions">
              {openclawWslInstallAction && (
                <button
                  className="btn btn-primary"
                  onClick={() => void handleOpenClawWslInstall()}
                >
                  {openclawWslInstallAction.label}
                </button>
              )}
              {openclawInstallGuideAction && (
                <button
                  className="btn btn-secondary"
                  onClick={() => void handleOpenClawInstallGuide()}
                >
                  {openclawInstallGuideAction.label}
                </button>
              )}
            </div>
          </div>
        )}

      {openclawFound && !migrationDismissed && (
        <div className="settings-migration-banner">
          <div className="settings-migration-header">
            <div>
              <div className="settings-migration-title">
                {openclawProvider?.definition.displayName ?? t("settings.migrationDetected")}
              </div>
              <div
                className="settings-migration-desc"
                dangerouslySetInnerHTML={{
                  __html: t("settings.migrationDesc", {
                    path: openclawPath || "",
                  }),
                }}
              />
            </div>
            <button
              className="btn-ghost settings-migration-dismiss"
              onClick={handleDismissMigration}
              title={t("settings.migrationDismiss")}
            >
              &times;
            </button>
          </div>
          {migrationLog && (
            <pre className="settings-hermes-doctor" ref={migrationLogRef}>
              {migrationLog}
            </pre>
          )}
          {migrationResult && (
            <div
              className={`settings-hermes-result ${migrationResultType || "error"}`}
            >
              {migrationResult}
            </div>
          )}
          <div className="settings-migration-actions">
            <button
              className="btn btn-primary "
              onClick={handleMigrate}
              disabled={migrating}
            >
              {migrating
                ? t("settings.migrating")
                : openclawImportAction?.label ?? t("settings.migrateToHermes")}
            </button>
            <button
              className="btn btn-secondary "
              onClick={handleDismissMigration}
            >
              {t("settings.skip")}
            </button>
          </div>
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.sections.appearance")}
        </div>
        <div className="settings-field">
          <label className="settings-field-label">
            {t("settings.theme.label")}
          </label>
          <div className="settings-theme-options">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`settings-theme-option ${theme === opt.value ? "active" : ""}`}
                onClick={() => setTheme(opt.value)}
              >
                {opt.value === "system"
                  ? t("settings.theme.system")
                  : opt.value === "light"
                    ? t("settings.theme.light")
                    : t("settings.theme.dark")}
              </button>
            ))}
          </div>
          <div className="settings-field-hint">
            {t("settings.appearanceHint")}
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-field-label">
            {t("settings.language.label")}
          </label>
          <div className="settings-language-quick" role="group" aria-label="Quick language switch">
            <button
              type="button"
              className={`settings-language-quick-option ${locale === "en" ? "active" : ""}`.trim()}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
            <button
              type="button"
              className={`settings-language-quick-option ${locale === "zh-CN" ? "active" : ""}`.trim()}
              onClick={() => setLocale("zh-CN")}
            >
              中文
            </button>
          </div>
          <LanguageSelect locale={locale} onSelect={setLocale} />
          <div className="settings-field-hint">
            {t("settings.language.hint")}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.sections.privacy")}
        </div>
        <div className="settings-field">
          <div className="settings-field-label-row">
            <span className="settings-field-label">
              {t("settings.analytics.label")}
            </span>
            <label
              className="tools-toggle settings-toggle-inline"
              aria-label={t("settings.analytics.label")}
            >
              <input
                type="checkbox"
                aria-label={t("settings.analytics.label")}
                title={t("settings.analytics.label")}
                checked={analyticsEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setAnalyticsEnabled(enabled);
                  setAnalyticsConsent(enabled);
                }}
              />
              <span className="tools-toggle-track" />
            </label>
          </div>
          <div className="settings-field-hint">
            {t("settings.analytics.hint")}
          </div>
          <ul className="settings-field-hint settings-inline-list">
            <li>{t("settings.analytics.disclosure.uuid")}</li>
            <li>{t("settings.analytics.disclosure.platform")}</li>
            <li>{t("settings.analytics.disclosure.navigation")}</li>
            <li>{t("settings.analytics.disclosure.endpoint")}</li>
            <li>{t("settings.analytics.disclosure.notCollected")}</li>
          </ul>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.networkSection")}
          {networkSaved && (
              <span className="settings-saved settings-saved--offset">
              {t("settings.saved")}
            </span>
          )}
        </div>
        <div className="settings-field">
            <div className="settings-field-label-row">
              <span className="settings-field-label">
                {t("settings.forceIpv4")}
              </span>
            <label
                className="tools-toggle settings-toggle-inline"
                aria-label={t("settings.forceIpv4")}
            >
              <input
                type="checkbox"
                  aria-label={t("settings.forceIpv4")}
                  title={t("settings.forceIpv4")}
                checked={forceIpv4}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setForceIpv4(val);
                  await window.hermesAPI.setConfig(
                    "network.force_ipv4",
                    val ? "true" : "false",
                    profile,
                  );
                  setNetworkSaved(true);
                  setTimeout(() => setNetworkSaved(false), 2000);
                }}
              />
              <span className="tools-toggle-track" />
            </label>
          </div>
          <div className="settings-field-hint">
            {t("settings.forceIpv4Hint")}
          </div>
        </div>
        <div className="settings-field">
          <label className="settings-field-label">
            {t("settings.httpProxy")}
          </label>
          <input
            className="input"
            type="text"
            value={httpProxy}
            onChange={(e) => setHttpProxy(e.target.value)}
            onBlur={async () => {
              await window.hermesAPI.setConfig(
                "network.proxy",
                httpProxy.trim(),
                profile,
              );
              setNetworkSaved(true);
              setTimeout(() => setNetworkSaved(false), 2000);
            }}
            placeholder={t("settings.proxyPlaceholder")}
          />
          <div className="settings-field-hint">
            {t("settings.httpProxyHint")}
          </div>
        </div>
      </div>

      {connMode === "remote" && (
        <div className="settings-section">
          <div className="settings-section-title">
            {t("settings.serverConfigTitle")}
          </div>
          <div
            className="settings-field-hint"
            dangerouslySetInnerHTML={{ __html: t("settings.serverConfigHint") }}
          />
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.dataSection")}
        </div>
        <div className="settings-field">
          <div className="settings-field-hint settings-field-hint--spaced-sm">
            {t("settings.dataHint")}
          </div>
          <div className="settings-hermes-actions">
            <button
              className="btn btn-secondary"
              onClick={handleBackup}
              disabled={backingUp}
            >
              <Download size={14} className="settings-inline-icon" />
              {backingUp ? t("settings.backingUp") : t("settings.exportBackup")}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleImport}
              disabled={importing}
            >
              <Upload size={14} className="settings-inline-icon" />
              {importing ? t("settings.importing") : t("settings.importBackup")}
            </button>
          </div>
          {backupResult && (
            <div
              className={`settings-hermes-result settings-hermes-result--spaced ${backupResult.includes("created") || backupResult.includes("success") ? "success" : "error"}`}
            >
              {backupResult}
            </div>
          )}
          {importResult && (
            <div
              className={`settings-hermes-result settings-hermes-result--spaced ${importResult.includes("complete") ? "success" : "error"}`}
            >
              {importResult}
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          <button
            type="button"
            className="settings-section-toggle"
            onClick={() => {
              const next = !logsExpanded;
              setLogsExpanded(next);
              if (next) loadLogs();
            }}
          >
            <FileText
              size={14}
              className="settings-inline-icon"
            />
            {t("settings.logsSection")} {logsExpanded ? "▾" : "▸"}
          </button>
        </div>
        {logsExpanded && (
          <div className="settings-field">
            <div className="settings-log-toolbar">
              {["gateway.log", "agent.log", "errors.log"].map((f) => (
                <button
                  key={f}
                  className={`btn btn-sm ${logFile === f ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setLogFile(f);
                    window.hermesAPI.readLogs(f, 300).then((r) => {
                      setLogContent(r.content);
                      setLogPath(r.path);
                    });
                  }}
                >
                  {f.replace(".log", "")}
                </button>
              ))}
              <button className="btn btn-sm btn-secondary" onClick={loadLogs}>
                {t("settings.refresh")}
              </button>
            </div>
            {logPath && (
              <div className="settings-field-hint settings-field-hint--log-path">
                {logPath}
              </div>
            )}
            <pre className="settings-hermes-doctor settings-hermes-doctor--log">
              {logContent || t("settings.emptyLog")}
            </pre>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.sections.dataLocation")}
        </div>
        <div className="settings-field">
          <label className="settings-field-label">
            {t("settings.dataLocation.path")}
          </label>
          <div
            className="settings-privacy-path"
            aria-label={t("settings.dataLocation.path")}
            title={hermesHome || ""}
          >
            {hermesHome || t("settings.dataLocation.unavailable")}
          </div>
          <div className="settings-field-hint">
            {t("settings.dataLocation.hint")}
          </div>
          <div className="settings-hermes-actions">
            <button
              className="btn btn-secondary"
              onClick={handleOpenDataFolder}
              disabled={openingFolder || !hermesHome}
            >
              <Download size={14} className="settings-inline-icon" />
              {openingFolder
                ? t("settings.dataLocation.opening")
                : t("settings.dataLocation.openFolder")}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCopyPath}
              disabled={!hermesHome}
            >
              {copiedPath
                ? t("settings.dataLocation.copied")
                : t("settings.dataLocation.copyPath")}
            </button>
          </div>
          {openFolderError && (
            <div
              className="settings-hermes-result settings-hermes-result--spaced error"
            >
              {openFolderError}
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">
          {t("settings.sections.profiles")}
        </div>
        <div className="settings-field-hint settings-field-hint--spaced-sm">
          {t("settings.profiles.hint")}
        </div>
        {profiles.length === 0 ? (
          <div className="settings-field-hint">
            {connMode === "local"
              ? t("settings.profiles.loading")
              : t("settings.profiles.remoteHidden")}
          </div>
        ) : (
          <div className="settings-profile-list">
            {profiles.map((p) => {
              const switching = switchingProfile === p.name;
              return (
                <div
                  key={p.name}
                  className={`settings-profile-row ${
                    p.isActive ? "settings-profile-row-active" : ""
                  }`}
                >
                  <div className="settings-profile-meta">
                    <span className="settings-profile-name">{p.name}</span>
                    <div className="settings-profile-badges">
                      {p.isActive && (
                        <span className="settings-profile-badge settings-profile-badge-active">
                          {t("settings.profiles.activeBadge")}
                        </span>
                      )}
                      {p.gatewayRunning && (
                        <span className="settings-profile-badge settings-profile-badge-running">
                          {t("settings.profiles.gatewayRunning")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="settings-profile-actions">
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => void handleSwitchProfile(p.name)}
                      disabled={p.isActive || switching}
                    >
                      {switching
                        ? t("settings.profiles.switching")
                        : p.isActive
                          ? t("settings.profiles.current")
                          : t("settings.profiles.switch")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {profiles.length > 0 && !showNewProfile && (
          <button
            className="btn btn-secondary settings-profile-new-trigger"
            onClick={() => {
              setShowNewProfile(true);
              setNewProfileError(null);
            }}
          >
            {t("settings.profiles.newProfile")}
          </button>
        )}
        {showNewProfile && (
          <div className="settings-profile-new">
            <div className="settings-field">
              <label className="settings-field-label">
                {t("settings.profiles.nameLabel")}
              </label>
              <input
                className="input"
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder={t("settings.profiles.namePlaceholder")}
                disabled={newProfileBusy}
              />
            </div>
            <label
              className="settings-profile-clone"
            >
              <input
                type="checkbox"
                checked={newProfileClone}
                onChange={(e) => setNewProfileClone(e.target.checked)}
                disabled={newProfileBusy}
              />
              <span>{t("settings.profiles.clone")}</span>
            </label>
            {newProfileError && (
              <div
                className="settings-hermes-result settings-hermes-result--tight error"
              >
                {newProfileError}
              </div>
            )}
            <div className="settings-hermes-actions">
              <button
                className="btn btn-primary"
                onClick={() => void handleCreateProfile()}
                disabled={newProfileBusy}
              >
                {newProfileBusy
                  ? t("settings.profiles.creating")
                  : t("settings.profiles.create")}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowNewProfile(false);
                  setNewProfileName("");
                  setNewProfileError(null);
                }}
                disabled={newProfileBusy}
              >
                {t("settings.profiles.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LanguageSelect({
  locale,
  onSelect,
}: {
  locale: AppLocale;
  onSelect: (l: AppLocale) => void;
}): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div className="settings-language-select" ref={ref}>
      {isOpen ? (
        <button
          type="button"
          className="settings-language-trigger"
          onClick={() => setIsOpen(false)}
          aria-haspopup="listbox"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-label="Select language"
        >
          <span>{LANGUAGE_NATIVE_NAMES[locale]}</span>
          <ChevronDown size={14} />
        </button>
      ) : (
        <button
          type="button"
          className="settings-language-trigger"
          onClick={() => setIsOpen(true)}
          aria-haspopup="listbox"
          aria-expanded="false"
          aria-controls={listboxId}
          aria-label="Select language"
        >
          <span>{LANGUAGE_NATIVE_NAMES[locale]}</span>
          <ChevronDown size={14} />
        </button>
      )}
      {isOpen && (
        <div
          id={listboxId}
          className="settings-language-dropdown"
          role="listbox"
          aria-label="Language options"
        >
          {APP_LOCALES.map((l) => {
            const active = l === locale;
            return (
              active ? (
                <button
                  key={l}
                  type="button"
                  role="option"
                  aria-selected="true"
                  className="settings-language-option active"
                  onClick={() => {
                    onSelect(l);
                    setIsOpen(false);
                  }}
                >
                  <span>{LANGUAGE_NATIVE_NAMES[l]}</span>
                  <Check size={14} />
                </button>
              ) : (
                <button
                  key={l}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="settings-language-option"
                  onClick={() => {
                    onSelect(l);
                    setIsOpen(false);
                  }}
                >
                  <span>{LANGUAGE_NATIVE_NAMES[l]}</span>
                </button>
              )
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Settings;
