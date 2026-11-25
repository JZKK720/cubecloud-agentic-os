export default {
  eyebrow: "Compressão de contexto",
  title: "Headroom",
  summary:
    "O Headroom fica entre o ambiente de trabalho e o modelo para reduzir prompts longos antes de saírem da máquina. Ele informa quanto poupou e nunca reescreve um pedido a menos que o passe para o modo de otimização.",
  // V2.10.44 — form-validation and runtime errors raised
  // in the Headroom screen. Prior versions hardcoded these
  // strings in Headroom.tsx, so the Chinese locale saw
  // English toast messages.
  errorChooseProjectFolder: "Escolha primeiro uma pasta de projeto.",
  errorPickOneProposal: "Escolha pelo menos uma proposta para confirmar.",
  errorHeadroomLearnFailed: "headroom learn falhou.",
  quickStart: {
    title: "Início rápido",
    body:
      "Comece no modo de auditoria, verifique as poupanças com o teste de compressão e depois mude para otimizar quando o proxy estiver saudável e os resultados estiverem corretos.",
    step1: "Aponte a Base URL para um proxy Headroom em execução ou inicie o sidecar local abaixo.",
    step2: "Mantenha o modo em auditoria primeiro para que o Headroom meça antes de reescrever pedidos.",
    step3: "Teste um registo real ou pacote de código antes de ativar o Headroom num fluxo de trabalho diário.",
    currentTarget: "Alvo atual: {{url}}",
    notReachable:
      "O Headroom ainda não está acessível. Inicie o sidecar ou edite a Base URL primeiro.",
    startSidecar: "Iniciar sidecar local",
    editConnection: "Editar ligação",
    copyInstall: "Copiar comando de instalação",
    copyCommand: "Copiar comando",
    installHint:
      "Execute isto num terminal para instalar o runtime do Headroom. O ambiente de trabalho não o instala por si.",
    installCommand: "pip install \"headroom-ai[all]\"",
    firstRunTitle: "Configuração inicial",
    firstRunBody:
      "O Headroom é um proxy local de compressão de contexto. Escolha um modo para começar.",
    modeAudit: "Auditoria",
    modeAuditHint: "Apenas medir — sem reescrita de pedidos.",
    modeOptimize: "Otimizar",
    modeOptimizeHint: "Aplicar transformações quando as poupanças parecerem corretas.",
    dismiss: "Ocultar este cartão",
    reset: "Repor início rápido",
    collapsedSummary:
      "Início rápido oculto. Abra-o a qualquer momento para repetir o percurso auditoria → teste → otimização.",
    switchToOptimize:
      "As poupanças parecem boas. Mude para otimizar para realmente comprimir os pedidos.",
    switchingToOptimize: "A mudar...",
    switchMode: "Mudar para otimizar",
    learnWhy: "Porque é que isto importa",
    learnWhyBody:
      "No modo de auditoria o Headroom mede poupanças mas nunca reescreve pedidos. No modo de otimização aplica as transformações. Comece na auditoria, valide e depois mude.",
  },
  health: {
    title: "Saúde do proxy",
    reachable: "Acessível",
    unreachable: "Inacessível",
    probing: "A sondar…",
  },
  stats: {
    title: "Poupanças",
    requests: "Pedidos",
    tokensSaved: "Tokens poupados",
    avgSavings: "Poupança média",
    ccrEntries: "Entradas CCR",
    uptime: "Tempo de atividade",
  },
  config: {
    title: "Ligação",
    body:
      "Aponte o Headroom para um proxy em execução ou inicie o sidecar local abaixo. Nada sai da máquina.",
    baseUrl: "Base URL",
    apiKey: "Chave da API",
    mode: "Modo",
    save: "Guardar",
    edit: "Configurar",
    cancel: "Fechar",
  },
  sidecar: {
    title: "Sidecar local",
    body: "O Headroom não está em execução em {{baseUrl}}. Inicie o sidecar para comprimir a partir desta máquina.",
    reason: "Motivo",
    lastError: "Último erro",
    pid: "PID",
    port: "Porta",
    mode: "Modo",
    crashCount: "Falhas",
    uptime: "Tempo de atividade",
    start: "Iniciar sidecar",
    stop: "Parar sidecar",
    restart: "Reiniciar",
    refreshLogs: "Atualizar registos",
    logsSummary: "Registos ({{count}} linhas)",
    clearLogs: "Limpar registos",
  },
  compress: {
    title: "Teste de compressão",
    body:
      "Cole um prompt real ou pacote de código e execute-o através do Headroom. Obtém as contagens de tokens antes e depois sem enviar nada a um modelo.",
    input: "Entrada de exemplo",
    placeholder: "Cole um prompt longo, um registo ou um pacote CodeGraph…",
    run: "Comprimir",
    compressing: "A comprimir…",
    compressed: "Comprimido",
    tokensBefore: "Tokens antes",
    tokensAfter: "Tokens depois",
    saved: "Poupou {{percent}}%",
  },
  retrieve: {
    title: "Recuperar original",
    body:
      "O conteúdo comprimido é substituído por uma referência. Procure o original pela sua chave quando precisar do texto completo.",
    key: "Chave de referência",
    run: "Recuperar",
    retrieving: "A recuperar…",
    notFound: "Nenhum conteúdo guardado sob essa chave.",
  },
  learn: {
    title: "Aprender com sessões",
    body:
      "Analise sessões anteriores num projeto e prepare notas duradouras — padrões, armadilhas, preferências — que o Headroom pode reutilizar. Nada é escrito até confirmar as propostas que escolher.",
    projectPath: "Caminho do projeto",
    model: "Modelo",
    agent: "Agente",
    run: "Executar learn",
    running: "A aprender com as sessões…",
    stop: "Parar",
    reportSummary:
      "Analisadas {{sessionCount}} sessões em {{durationSec}}s e preparadas {{proposalCount}} propostas.",
    targets: "Alvos escritos",
    noProposals: "Nenhuma nota duradoura encontrada nestas sessões.",
    rawOutput: "Saída bruta",
    commit: "Confirmar {{count}} propostas",
    committing: "A confirmar…",
    apply: "Aplicar diffs",
    applying: "A aplicar…",
    revert: "Reverter",
    reverting: "A reverter…",
    diffSummary: "Diffs pendentes ({{count}})",
  },
} as const;
