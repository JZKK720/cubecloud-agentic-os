export default {
  title: "Gateway",
  messagingGateway: "Gateway de Mensagens",
  platforms: "Plataformas",
  status: "Status",
  running: "Em execução",
  stopped: "Parado",
  gatewayHint:
    "Conecta o Hermes ao Telegram, Discord, Slack e outras plataformas",
  group: {
    messaging: "Mensageria",
    eastern: "Plataformas asiáticas",
    async: "Canais assíncronos",
    home: "Automação residencial",
  },  runtimes: {
    title: "Runtimes",
    summary:
      "O mesmo registro de runtimes exibido na tela de boas-vindas. Cada linha mostra se o runtime est谩 pronto nesta m谩quina.",
    registryLabel: "Registro de runtimes",
    refreshAria: "Re-escanear o registro de runtimes",
    empty: "Nenhum runtime instalado ainda. A tela de boas-vindas instala o Hermes por padr茫o.",
    statusReady: "Runtime pronto para hospedar o gateway.",
    statusUnavailable: "Runtime ainda n茫o dispon铆vel nesta m谩quina.",
    detected: "Detectado",
    responded: "Respondeu",
    scanning: "Escaneando…",
    localProbesLabel: "Sondagens do gateway local",
    localProbesRefreshAria: "Sondar portas do gateway local",
    localProbesEmpty:
      "Nenhum gateway local respondeu. Volte 脿 tela de boas-vindas para instalar ou conectar.",
    discoveryHint:
      "Este runtime exp玫e uma superf铆cie de descoberta que pode ser chamada da tela de boas-vindas.",
  },
  container: {
    title: "Descoberta de cont锚ineres",
    summary:
      "Examina o Docker Desktop em busca de runtimes pareados (IronClaw, OpenClaw e qualquer provedor com gateway Docker).",
    sharedHint:
      "Mesmo registro da tela de boas-vindas. Fa莽a uma nova varredura aqui ap贸s iniciar ou parar um cont锚iner.",
    statusLabel: "Status da varredura Docker",
    refreshAria: "Re-escanear os runtimes do Docker Desktop",
    rescan: "Re-escanear",
    empty: "Nenhum runtime Docker foi detectado. Instale o Docker Desktop ou inicie um cont锚iner pareado.",
    scannedAt: "趌tima varredura {{value}}",
  },} as const;
