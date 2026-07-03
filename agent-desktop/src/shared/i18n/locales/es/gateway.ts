export default {
  title: "Gateway",
  messagingGateway: "Gateway de mensajería",
  platforms: "Plataformas",
  status: "Estado",
  running: "En ejecución",
  stopped: "Detenido",
  gatewayHint:
    "Conecta Hermes con Telegram, Discord, Slack y otras plataformas",
  kicker: "Plano de control post-configuración",
  heroSummary:
    "Mantén las credenciales del gateway locales en Hermes, habilita solo los puentes de plataforma que necesites y gestiona los mismos carriles de runtime presentados durante el onboarding desde un único plano de control de escritorio.",
  platformsHint:
    "El onboarding establece el primer runtime y modelo. Esta pantalla mantiene alineados el servicio del gateway y las entregas de plataforma después.",
  supportedBridgesHint:
    "Los puentes compatibles permanecen deshabilitados hasta que optes por ellos. Habilita solo los proveedores y los carriles de mensajería que esta máquina deba exponer.",
  platformsEnabled: "{{enabled}}/{{total}} plataformas habilitadas",
  group: {
    messaging: "Mensajería",
    eastern: "Plataformas asiáticas",
    async: "Canales asíncronos",
    home: "Automatización del hogar",
  },  runtimes: {
    title: "Runtimes",
    summary:
      "El mismo registro de runtimes que aparece en la bienvenida. Cada fila muestra si el runtime est谩 disponible en esta m谩quina.",
    registryLabel: "Registro de runtimes",
    refreshAria: "Volver a escanear el registro de runtimes",
    empty:
      "Todav铆a no hay runtimes instalados. La bienvenida instalar谩 Hermes por defecto.",
    statusReady: "El runtime est谩 listo para hospedar el gateway.",
    statusUnavailable: "El runtime a煤n no est谩 disponible en esta m谩quina.",
    detected: "Detectado",
    responded: "Respondi贸",
    scanning: "Escaneando…",
    localProbesLabel: "Sondeos del gateway local",
    localProbesRefreshAria: "Sondear los puertos del gateway local",
    localProbesEmpty:
      "Ning煤n gateway local respondi贸. Vuelve a la bienvenida para instalar o conectar uno.",
    discoveryHint:
      "Este runtime expone una superficie de descubrimiento a la que puedes llamar desde la bienvenida.",
  },
  container: {
    title: "Descubrimiento de contenedores",
    summary:
      "Escanea Docker Desktop en busca de runtimes emparejados (IronClaw, OpenClaw y cualquier proveedor que exponga un gateway Docker).",
    sharedHint:
      "Mismo registro que la pantalla de bienvenida. Vuelve a escanear aquí después de iniciar o detener un contenedor.",
    statusLabel: "Estado del escaneo Docker",
    refreshAria: "Volver a escanear los runtimes de Docker Desktop",
    rescan: "Re-escanear",
    empty:
      "No se detectaron runtimes en Docker. Instala Docker Desktop o inicia un contenedor emparejado.",
    scannedAt: "趌timo escaneo {{value}}",
  },} as const;
