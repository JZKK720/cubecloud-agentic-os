import { useState, useEffect, useCallback } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Welcome from "./screens/Welcome/Welcome";
import Install from "./screens/Install/Install";
import Setup from "./screens/Setup/Setup";
import Layout from "./screens/Layout/Layout";
import SplashScreen from "./screens/SplashScreen/SplashScreen";
import { captureScreenView } from "./utils/analytics";
import { formatConnectionDiagnosticDetail } from "../../shared/connection-diagnostics";
import {
  GATEWAY_RUNTIME_PRESETS,
  type GatewayRuntimePresetId,
} from "../../shared/gateway-runtime-presets";
import { setCachedGatewayRuntimePreset } from "./utils/gatewayRuntimePresetCache";

type Screen = "splash" | "welcome" | "installing" | "setup" | "main";

// Minimum time the splash stays visible so the brand animation plays
// through. Tracks the splash logo fade-in duration in main.css.
const SPLASH_MIN_MS = 1300;

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>("splash");
  const [installError, setInstallError] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<
    "local" | "remote" | "ssh"
  >("local");
  const [gatewayRuntimePreset, setGatewayRuntimePreset] =
    useState<GatewayRuntimePresetId>("hermes");
  // Soft warning: install files exist but the deep `verifyInstall` probe
  // failed (e.g. slow Python startup, restricted network). We surface this
  // as a dismissible banner instead of bouncing the user back to Welcome,
  // which previously trapped restricted-network users in a reinstall
  // loop on every launch (#130).
  const [verifyWarning, setVerifyWarning] = useState(false);
  const isMac = window.electron?.process?.platform === "darwin";

  const runInstallCheck = useCallback(async () => {
    const startedAt = Date.now();
    let next: Screen = "welcome";
    let error: string | null = null;
    let isRemote = false;

    try {
      const conn = await window.hermesAPI.getConnectionConfig();
      isRemote = conn.mode === "remote" || conn.mode === "ssh";
      setConnectionMode(conn.mode);
      setGatewayRuntimePreset(conn.gatewayRuntimePreset);
      setCachedGatewayRuntimePreset(conn.gatewayRuntimePreset);

      if (conn.mode === "ssh" && conn.ssh) {
        // Start (or ensure) the SSH tunnel, then go straight to main
        try {
          await window.hermesAPI.startSshTunnel();
          next = "main";
        } catch (tunnelErr) {
          const runtimeName =
            GATEWAY_RUNTIME_PRESETS[conn.gatewayRuntimePreset].displayName;
          error =
            conn.gatewayRuntimePreset === "openclaw"
              ? `SSH tunnel failed before Agent Desktop could reach the remote ${runtimeName} compatibility gateway: ${(tunnelErr as Error).message}`
              : `SSH tunnel failed before Agent Desktop could reach the remote ${runtimeName} gateway: ${(tunnelErr as Error).message}`;
          next = "welcome";
        }
      } else if (conn.mode === "remote" && conn.remoteUrl) {
        const diagnostic = await window.hermesAPI.diagnoseRemoteConnection(
          conn.remoteUrl,
          conn.gatewayRuntimePreset,
        );
        const resolvedPreset = diagnostic.runtime ?? conn.gatewayRuntimePreset;
        setGatewayRuntimePreset(resolvedPreset);
        setCachedGatewayRuntimePreset(resolvedPreset);
        if (diagnostic.ok) {
          next = "main";
        } else {
          error = formatConnectionDiagnosticDetail({
            diagnostic,
            runtimeDisplayName:
              GATEWAY_RUNTIME_PRESETS[resolvedPreset].displayName,
            runtimePresetId: resolvedPreset,
          });
          next = "welcome";
        }
      } else {
        const status = await window.hermesAPI.checkInstall();
        if (!status.installed) {
          // V2.10.67 — Auto-discovery: no local install and no
          // saved remote connection. Scan localhost for running
          // runtime gateways before falling back to the Welcome
          // form. If exactly one healthy gateway is found, auto-
          // connect and go to main. If multiple are found, go to
          // Welcome with a picker. If none, go to Welcome as
          // before.
          try {
            const scan = await window.hermesAPI.autoDiscoveryScan();
            if (scan.healthyCount === 1) {
              const found = scan.discovered.find((d) => d.healthy);
              if (found) {
                // Auto-connect: save the connection and go to main
                await window.hermesAPI.setConnectionConfig({
                  mode: "remote",
                  remoteUrl: found.url,
                  apiKey: "",
                  gatewayRuntimePreset: found.runtime,
                });
                setConnectionMode("remote");
                setGatewayRuntimePreset(found.runtime);
                setCachedGatewayRuntimePreset(found.runtime);
                next = "main";
              } else {
                next = "welcome";
              }
            } else {
              // 0 or multiple healthy — go to Welcome (picker
              // or manual form). The scan results are passed
              // via the installError hint so Welcome can show
              // "We found N agents" if multiple.
              next = "welcome";
            }
          } catch {
            // Auto-scan failed — fall back to Welcome
            next = "welcome";
          }
        } else if (!status.hasApiKey) {
          next = "setup";
        } else {
          next = "main";
        }
      }
    } catch {
      next = "welcome";
    }

    if (error) setInstallError(error);

    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, SPLASH_MIN_MS - elapsed);
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
    setScreen(next);

    // Lazy deep-verify in the background after the UI is up. If the
    // install is broken, surface the warning then — don't block startup.
    //
    // Skip for remote-mode connections: verifyInstall() probes the LOCAL
    // Python + script paths (HERMES_PYTHON / HERMES_SCRIPT in installer.ts),
    // which don't exist on machines that only use a remote backend. Without
    // this guard the user is bounced back to Welcome with an "installBroken"
    // error immediately after a successful remote connect. (#47, #41, #30)
    if ((next === "main" || next === "setup") && !isRemote) {
      window.hermesAPI.verifyInstall().then((ok) => {
        // Files exist (checkInstall passed) but the probe failed. Surface
        // a soft warning instead of bouncing to Welcome — see #130.
        if (!ok) setVerifyWarning(true);
      });
    }
  }, []);

  useEffect(() => {
    runInstallCheck();
  }, [runInstallCheck]);

  // Track screen views for analytics
  useEffect(() => {
    captureScreenView(screen);
  }, [screen]);

  const handleSplashFinished = useCallback(() => {
    /* splash transition is driven by the install check, not a timer */
  }, []);

  function handleInstallComplete(): void {
    setInstallError(null);
    setScreen("setup");
  }

  function handleInstallFailed(error: string): void {
    setInstallError(error);
    setScreen("welcome");
  }

  function handleRetryInstall(): void {
    setInstallError(null);
    setScreen("installing");
  }

  function handleRecheck(): void {
    setInstallError(null);
    setScreen("splash");
    runInstallCheck();
  }

  async function handleSwitchToLocal(): Promise<void> {
    await window.hermesAPI.setConnectionConfig("local", "", "");
    setConnectionMode("local");
    handleRecheck();
  }

  function handleVerifyReinstall(): void {
    setVerifyWarning(false);
    setInstallError(null);
    setScreen("installing");
  }

  function handleDismissVerifyWarning(): void {
    setVerifyWarning(false);
  }

  function renderScreen(): React.JSX.Element {
    switch (screen) {
      case "splash":
        return <SplashScreen onFinished={handleSplashFinished} />;
      case "welcome":
        return (
          <Welcome
            error={installError}
            connectionMode={connectionMode}
            initialGatewayRuntimePreset={gatewayRuntimePreset}
            onStart={handleRetryInstall}
            onRecheck={handleRecheck}
            onSwitchToLocal={handleSwitchToLocal}
          />
        );
      case "installing":
        return (
          <Install
            onComplete={handleInstallComplete}
            onFailed={handleInstallFailed}
            onCancel={() => setScreen("welcome")}
          />
        );
      case "setup":
        return (
          <Setup
            onComplete={() => setScreen("main")}
            verifyWarning={verifyWarning}
            onReinstall={handleVerifyReinstall}
            onDismissVerifyWarning={handleDismissVerifyWarning}
          />
        );
      case "main":
        return (
          <Layout
            verifyWarning={verifyWarning}
            onReinstall={handleVerifyReinstall}
            onDismissVerifyWarning={handleDismissVerifyWarning}
            onSwitchToLocal={handleSwitchToLocal}
          />
        );
    }
  }

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <div className="app">
          {isMac && <div className="drag-region" />}
          <div className="app-content">{renderScreen()}</div>
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
