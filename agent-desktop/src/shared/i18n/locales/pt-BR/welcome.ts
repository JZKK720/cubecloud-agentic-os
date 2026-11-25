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
  existingGatewayNote: "Um gateway em execução foi detectado — a instalação é opcional.",
  addOnRuntimesNote: "Ollama, LM Studio, vLLM e outros são configurados na próxima etapa.",
  dockerScanCopy:
    "Para um contêiner de gateway existente ({{runtimes}}). Continue com a instalação local padrão abaixo se nenhum estiver em execução.",
  dockerScanning: "Escaneando Docker Desktop para contêineres de gateway {{runtime}}...",
  dockerEmpty:
    "Nenhum gateway ({{runtimes}}) estava pronto para conectar. Inicie o contêiner, publique sua porta local e faça uma nova varredura.",
  localGatewayCopy: "Se um gateway localhost já está em execução, o Agent Desktop pode usá-lo diretamente. Esta sonda também verifica a porta loopback padrão do OpenClaw.",
  localGatewayEmpty: "Nenhum gateway localhost respondeu em {{ports}}. Instale o {{runtime}} local apenas se nenhum outro gateway estiver acessível.",
  designDials: {
    title: "Design Dials",
    subtitle:
      "Três botões que ajustam o tom do agente. As mudanças valem apenas para este perfil e podem ser ajustadas depois em Configurações.",
    varianceLabel: "Variance",
    varianceHint:
      "Quão expressiva é a redação. 0 = seca e literal, 100 = metafórica e colorida.",
    motionLabel: "Motion",
    motionHint:
      "Quão estruturada é a resposta. 0 = ensaio fluido, 100 = lista de marcadores pesada.",
    densityLabel: "Density",
    densityHint:
      "Quanta informação por parágrafo. 0 = arejada e curta, 100 = bem densa.",
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
