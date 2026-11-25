export default {
  flowTitle: "Configure seu gateway",
  subtitle:
    "Seu assistente de IA que se aprimora sozinho e roda localmente na sua máquina. Privado, poderoso e sempre aprendendo.",
  installIssueTitle: "Problema na Instalação",
  installLocalRuntime: "Instalar runtime local",
  getStarted: "Começar",
  retryInstall: "Tentar Instalação Novamente",
  terminalTitle: "Ou instale {{runtime}} com um único comando:",
  terminalInstallHint: "Instale via terminal e depois volte aqui:",
  recheck: "Eu já instalei — verificar novamente",
  switchToLocal: "Mudar para modo local",
  installSizeHint: "Isso instalará os componentes necessários (~2 GB)",
  lanePickerHint:
    // V2.10.61 — rewritten to drop the false-promise "abaixo"
    // Docker handoff reference (the panel is not rendered in
    // Welcome.tsx). The Docker Desktop attach panel is a clean
    // V2.10.62 candidate; until then, the lane picker points
    // users at the remote panel as the truthful IronClaw path.
    "Estas são pistas de gateway direto. {{ironclaw}} é distribuído como um runtime de contêiner — selecione-o no painel remoto para anexar à porta publicada.",
  copyInstallCommand: "Copiar comando de instalação",
  dividerOr: "ou",
  connectRemote: "Conectar ao runtime remoto",
  connectRemoteTitle: "Conectar ao runtime remoto",
  connectRemoteSubtitle:
    "Insira a URL de um servidor de API compatível com Cubecloud em execução.",
  remoteServerUrl: "URL do Servidor",
  remoteApiKey: "Chave da API (opcional)",
  remoteApiKeyPlaceholder: "Token Bearer (API_SERVER_KEY)",
  testingConnection: "Testando",
  connect: "Conectar",
  remoteHint:
    "Deixe a chave vazia se o servidor aceitar requisições não autenticadas (ex: via túnel SSH para o localhost).",
  connectViaSshShort: "Conectar via SSH",
  connectToRemoteGatewayShort: "Conectar ao gateway remoto",
  flowStepInstall: "Install",
  flowStepConnect: "Connect",
  flowStepDone: "Start",
  existingGatewayNote: "A live gateway was detected — install is optional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM, and more are configured in the next step.",
  dockerScanCopy:
    "Para um contêiner de gateway existente ({{runtimes}}). Continue com a instalação local padrão abaixo se nenhum estiver em execução.",
  dockerScanning: "Escaneando Docker Desktop para contêineres de gateway {{runtime}}...",
  dockerEmpty:
    "Nenhum gateway ({{runtimes}}) estava pronto para conectar. Inicie o contêiner, publique sua porta local e faça uma nova varredura.",
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
    reset: "Restaurar padrões",
    saved: "Salvo.",
  },
  // V2.10.77 — Título + subtítulos do painel SSH
  installLaneWindowsShell: "Windows PowerShell",
  installLaneUnixShell: "WSL / macOS / Linux",
  connectRemotePanelTitle: "Conectar ao gateway remoto",
  connectSshPanelTitle: "Conectar via SSH",
  connectSshSubtitleHermes:
    "Encaminhe um gateway {{runtime}} existente via SSH sem expor a porta publicada diretamente.",
  connectSshSubtitleOpenclaw:
    "Encaminhe um gateway {{runtime}} existente via SSH. A compatibilidade HTTP deve estar habilitada no gateway remoto.",
  connectSshSubtitleIronclaw:
    "Encaminhe um gateway {{runtime}} existente via SSH sem expor a porta do contêiner publicada diretamente.",
  connectRemoteSubtitleHermes:
    "Use uma URL de runtime existente quando o Agent Desktop deve se conectar a um gateway {{runtime}} em execução em vez de instalar localmente.",
  connectRemoteSubtitleOpenclaw:
    "Conecte-se a um endpoint de compatibilidade {{runtime}} em execução em vez de instalar localmente. O Agent Desktop espera a superfície de compatibilidade HTTP do OpenClaw habilitada.",
  connectRemoteSubtitleIronclaw:
    "Conecte-se a um gateway de contêiner de sandbox WASM {{runtime}} em execução em vez de instalar localmente. Use a porta de gateway publicada (padrão 3231) e a superfície /api/health voltada ao operador.",
  runtimeLane: "Faixa de runtime",
  sshHost: "Host SSH",
  sshHostPlaceholder: "192.168.1.100 ou myserver.local",
  sshPort: "Porta SSH",
  sshPortPlaceholder: "22",
  sshUsername: "Usuário",
  sshUsernamePlaceholder: "user",
  sshKeyPath: "Caminho da Chave Privada",
  sshKeyPathPlaceholder: "~/.ssh/id_rsa",
  sshKeyPathNote: "(opcional — padrão ~/.ssh/id_rsa)",
  sshRemotePort: "Porta do Runtime Remoto",
  sshRemotePortNote: "(padrão {{port}})",
  sshRuntimeOpenclawNote:
    "{{runtime}} geralmente escuta na porta {{port}} e exige que sua superfície de compatibilidade HTTP esteja habilitada antes que o Agent Desktop possa se conectar.",
  sshRuntimeHermesNote:
    "{{runtime}} geralmente escuta na porta {{port}} para conexão via SSH.",
  sshRuntimeIronclawNote:
    "{{runtime}} geralmente escuta na porta {{port}} para conexão via SSH e espera que o gateway encaminhado exponha /api/health mais os endpoints /v1 compatíveis com OpenAI.",
  sshSecretIronclawNote:
    "(opcional, a menos que o gateway IronClaw encaminhado exija GATEWAY_AUTH_TOKEN)",
  sshSecretOpenclawNote: "(obrigatório quando a autenticação do OpenClaw está ativada)",
  sshSecretHermesNote: "(opcional, a menos que o gateway Hermes remoto exija autenticação)",
  testingSshConnection: "Testando conexão SSH…",
  connectViaSsh: "Conectar via SSH",
  sshSystemHint:
    "Usa o SSH do seu sistema. Certifique-se de que você já consegue executar ssh {{user}}@{{host}} sem prompt de senha.",
  errorLocalInstallHeader: "A instalação local precisa de atenção",
  errorSshHeader: "O túnel SSH para {{runtime}} precisa de atenção",
  errorRemoteHeader: "A conexão remota com {{runtime}} precisa de atenção",
  retryLocalInstall: "Tentar instalação local novamente",
  retrySshConnection: "Tentar conexão SSH novamente",
  retryRemoteConnection: "Tentar conexão remota novamente",
  reviewSshSettings: "Revisar configurações SSH",
  reviewRemoteSettings: "Revisar configurações remotas",
  errorPleaseEnterUrl: "Por favor, insira uma URL.",
  errorConnectionTestFailed: "Falha no teste de conexão.",
  errorHostAndUsernameRequired: "Host e nome de usuário são obrigatórios.",
  errorHostAndUsernameRequiredNoPeriod: "Host e nome de usuário são obrigatórios",
  detectedRuntimesTitle: "Encontramos agentes em execução",
  detectedRuntimesHealthy:
    "Escolha um runtime em execução para conectar agora. Instalar um runtime local é opcional.",
  detectedRuntimesAuth:
    "Encontramos runtimes que exigem uma chave. Escolha um para preencher o formulário de conexão remota.",
  authRequiredHint:
    "Estes runtimes estão acessíveis, mas exigem uma chave de servidor de API ou token de gateway antes que o Agent Desktop possa se conectar.",
} as const;
