export default {
  flowTitle: "Configure o seu gateway",
  subtitle:
    "O seu agente de IA que se auto-aperfeiçoa, executado localmente na sua máquina. Privado, poderoso e sempre a aprender.",
  installIssueTitle: "Problema na Instalação",
  installLocalRuntime: "Instalar runtime local",
  getStarted: "Começar",
  retryInstall: "Tentar Instalação Novamente",
  terminalTitle: "Ou instale {{runtime}} com um único comando:",
  terminalInstallHint: "Instale via terminal e depois volte aqui:",
  recheck: "Já instalei — verificar novamente",
  switchToLocal: "Mudar para modo local",
  installSizeHint: "Isto irá instalar os componentes necessários (~2 GB)",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "abaixo"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "Estas são pistas de gateway direto. {{ironclaw}} é distribuído como um runtime de contentor — selecione-o no painel remoto para anexar à porta publicada.",
  copyInstallCommand: "Copiar comando de instalação",
  dividerOr: "ou",
  connectRemote: "Ligar ao runtime remoto",
  connectRemoteTitle: "Ligar ao runtime remoto",
  connectRemoteSubtitle:
    "Introduza o URL de um servidor de API compatível com Cubecloud em execução.",
  remoteServerUrl: "URL do Servidor",
  remoteApiKey: "Chave da API (opcional)",
  remoteApiKeyPlaceholder: "Token Bearer (API_SERVER_KEY)",
  testingConnection: "A testar",
  connect: "Ligar",
  remoteHint:
    "Deixe a chave em branco se o servidor aceitar pedidos não autenticados (ex: via túnel SSH para o localhost).",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "Para um contentor de gateway existente ({{runtimes}}). Continue com a instalação local predefinida abaixo se nenhum estiver em execução.",
  dockerScanning: "A examinar o Docker Desktop para contentores de gateway {{runtime}}...",
  dockerEmpty:
    "Nenhum gateway ({{runtimes}}) estava pronto para ligar. Inicie o contentor, publique a sua porta local e examine novamente.",
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
    reset: "Restaurar predefinições",
    saved: "Guardado.",
  },
  // V2.10.77 — Título + subtítulos do painel SSH
  connectSshPanelTitle: "Ligar via SSH",
  connectSshSubtitleHermes:
    "Encaminhe um gateway {{runtime}} existente via SSH sem expor a porta publicada diretamente.",
  connectSshSubtitleOpenclaw:
    "Encaminhe um gateway {{runtime}} existente via SSH. A compatibilidade HTTP tem de estar ativada no gateway remoto.",
  connectSshSubtitleIronclaw:
    "Encaminhe um gateway {{runtime}} existente via SSH sem expor a porta do contentor publicada diretamente.",
} as const;
