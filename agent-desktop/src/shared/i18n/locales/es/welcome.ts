export default {
  flowTitle: "Configura tu gateway",
  subtitle:
    "Tu asistente de IA autoevolutivo que se ejecuta localmente en tu equipo. Privado, potente y siempre aprendiendo.",
  installIssueTitle: "Problema de instalación",
  installLocalRuntime: "Instalar runtime local",
  getStarted: "Comenzar",
  retryInstall: "Reintentar la instalación",
  terminalTitle: "O instala {{runtime}} con un solo comando:",
  terminalInstallHint: "Instálalo desde la terminal y luego vuelve:",
  recheck: "Ya lo instalé — comprobar de nuevo",
  switchToLocal: "Cambiar a modo local",
  installSizeHint: "Esto instalará los componentes necesarios (~2 GB)",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "below"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "Estos son carriles de gateway directo. {{ironclaw}} se distribuye como un runtime de contenedor — selecciónalo desde el panel remoto para conectarte al puerto publicado.",
  copyInstallCommand: "Copiar comando de instalación",
  dividerOr: "o",
  connectRemote: "Conectarse al runtime remoto",
  connectRemoteTitle: "Conectarse al runtime remoto",
  connectRemoteSubtitle:
    "Introduce la URL de un servidor de API compatible con Cubecloud en ejecución.",
  remoteServerUrl: "URL del servidor",
  remoteApiKey: "API key (opcional)",
  remoteApiKeyPlaceholder: "Token Bearer (API_SERVER_KEY)",
  testingConnection: "Probando",
  connect: "Conectar",
  remoteHint:
    "Deja la clave vacía si el servidor acepta solicitudes no autenticadas (por ejemplo, mediante un túnel SSH a localhost).",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "Para un contenedor de gateway existente ({{runtimes}}). Continúa con la instalación local predeterminada si ninguno está en ejecución.",
  dockerScanning: "Escaneando Docker Desktop para contenedores de gateway {{runtime}}...",
  dockerEmpty:
    "Ningún gateway ({{runtimes}}) estaba listo para conectar. Inicia el contenedor, publica su puerto local y vuelve a escanear.",
  localGatewayCopy: "If a localhost gateway is already running, Agent Desktop can use it directly. This probe also checks the default OpenClaw loopback port.",
  localGatewayEmpty: "No live localhost gateway responded on {{ports}}. Install the local {{runtime}} only if no other gateway is reachable.",
  designDials: {
    title: "Design Dials",
    subtitle:
      "Three knobs that nudge the agent's tone. Changes apply to this profile only and can be tuned later from Settings.",
    varianceLabel: "Variance",
    varianceHint:
      "How expressive the phrasing is. 0 = dry and literal, 100 = metaphorical and colorful.",
    motionLabel: "Motion",
    motionHint:
      "How structured the response is. 0 = flowing essay, 100 = heavy bullet / step list.",
    densityLabel: "Density",
    densityHint:
      "How much information per paragraph. 0 = airy and short, 100 = tightly packed.",
    reset: "Restablecer a valores predeterminados",
    saved: "Guardado.",
  },
  // V2.10.77 — SSH panel title + subtitles
  connectSshPanelTitle: "Conectar por SSH",
  connectSshSubtitleHermes:
    "Reenvía una pasarela de {{runtime}} existente por SSH sin exponer el puerto publicado directamente.",
  connectSshSubtitleOpenclaw:
    "Reenvía una pasarela de {{runtime}} existente por SSH. La compatibilidad HTTP debe estar habilitada en la pasarela remota.",
  connectSshSubtitleIronclaw:
    "Reenvía una pasarela de {{runtime}} existente por SSH sin exponer el puerto del contenedor publicado directamente.",
} as const;
