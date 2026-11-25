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
  // V2.10.44 — install-lane shell labels (kept as-is per en source)
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  connectRemotePanelTitle: "Conectar al gateway remoto",
  connectRemoteSubtitleHermes:
    "Usa una URL de runtime existente cuando Agent Desktop deba conectarse a un gateway {{runtime}} en ejecución en lugar de instalarlo localmente.",
  connectRemoteSubtitleOpenclaw:
    "Conéctate a un endpoint de compatibilidad {{runtime}} en ejecución en lugar de instalarlo localmente. Agent Desktop espera que la superficie de compatibilidad HTTP de OpenClaw esté habilitada.",
  connectRemoteSubtitleIronclaw:
    "Conéctate a un gateway contenedor WASM-sandbox de {{runtime}} en ejecución en lugar de instalarlo localmente. Usa el puerto de gateway publicado (por defecto 3231) y la superficie /api/health para operadores.",
  runtimeLane: "Carril de runtime",
  sshHost: "Host SSH",
  sshHostPlaceholder: "192.168.1.100 o miservidor.local",
  sshPort: "Puerto SSH",
  sshPortPlaceholder: "22",
  sshUsername: "Nombre de usuario",
  sshUsernamePlaceholder: "usuario",
  sshKeyPath: "Ruta de la clave privada",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "(opcional — por defecto ~/.ssh/id_rsa)",
  sshRemotePort: "Puerto del runtime remoto",
  sshRemotePortNote: "(por defecto {{port}})",
  sshRuntimeOpenclawNote:
    "{{runtime}} suele escuchar en {{port}} y requiere que su superficie de compatibilidad HTTP esté habilitada antes de que Agent Desktop pueda conectarse.",
  sshRuntimeHermesNote:
    "{{runtime}} suele escuchar en {{port}} para la conexión SSH.",
  sshRuntimeIronclawNote:
    "{{runtime}} suele escuchar en {{port}} para la conexión SSH y espera que el gateway reenviado exponga /api/health más los endpoints /v1 compatibles con OpenAI.",
  sshSecretIronclawNote:
    "(opcional a menos que el gateway IronClaw reenviado exija GATEWAY_AUTH_TOKEN)",
  sshSecretOpenclawNote: "(obligatorio cuando la autenticación de OpenClaw está habilitada)",
  sshSecretHermesNote: "(opcional a menos que el gateway Hermes remoto exija autenticación)",
  testingSshConnection: "Probando la conexión SSH…",
  connectViaSsh: "Conectar por SSH",
  sshSystemHint:
    "Usa tu SSH del sistema. Asegúrate de que ya puedes ejecutar ssh {{user}}@{{host}} sin que te pida contraseña.",
  errorLocalInstallHeader: "La instalación local necesita atención",
  errorSshHeader: "El túnel SSH a {{runtime}} necesita atención",
  errorRemoteHeader: "La conexión remota a {{runtime}} necesita atención",
  retryLocalInstall: "Reintentar la instalación local",
  retrySshConnection: "Reintentar la conexión SSH",
  retryRemoteConnection: "Reintentar la conexión remota",
  reviewSshSettings: "Revisar la configuración SSH",
  reviewRemoteSettings: "Revisar la configuración remota",
  connectViaSshShort: "Conectar por SSH",
  connectToRemoteGatewayShort: "Conectar al gateway remoto",
  errorPleaseEnterUrl: "Introduce una URL.",
  errorConnectionTestFailed: "La prueba de conexión falló.",
  errorHostAndUsernameRequired: "El host y el nombre de usuario son obligatorios.",
  errorHostAndUsernameRequiredNoPeriod: "El host y el nombre de usuario son obligatorios",
  detectedRuntimesTitle: "Encontramos agentes en ejecución",
  detectedRuntimesHealthy:
    "Elige un runtime en ejecución para conectarte ahora. Instalar un runtime local es opcional.",
  detectedRuntimesAuth:
    "Encontramos runtimes que requieren una clave. Elige uno para rellenar el formulario de conexión remota.",
  authRequiredHint:
    "Estos runtimes son accesibles pero requieren una clave de API o un token de gateway antes de que Agent Desktop pueda conectarse.",
  // V2.10.77 — SSH panel title + subtitles
  connectSshPanelTitle: "Conectar por SSH",
  connectSshSubtitleHermes:
    "Reenvía una pasarela de {{runtime}} existente por SSH sin exponer el puerto publicado directamente.",
  connectSshSubtitleOpenclaw:
    "Reenvía una pasarela de {{runtime}} existente por SSH. La compatibilidad HTTP debe estar habilitada en la pasarela remota.",
  connectSshSubtitleIronclaw:
    "Reenvía una pasarela de {{runtime}} existente por SSH sin exponer el puerto del contenedor publicado directamente.",
} as const;
