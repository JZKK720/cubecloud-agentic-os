export default {
  title: "Ferramentas",
  subtitle:
    "Ative ou desative os conjuntos de ferramentas que seu agente pode usar durante as conversas",
  empty: "Nenhum conjunto de ferramentas disponível",
  emptyHint: "Os conjuntos de ferramentas aparecerão aqui quando o gateway estiver em execução.",
  web: {
    label: "Pesquisa na Web",
    description: "Pesquisa na web e extrai conteúdo de URLs",
  },
  browser: {
    label: "Navegador",
    description: "Navega, clica, digita e interage com páginas da web",
  },
  terminal: {
    label: "Terminal",
    description: "Executa comandos de shell e scripts",
  },
  file: {
    label: "Operações de Arquivo",
    description: "Lê, escreve, pesquisa e gerencia arquivos",
  },
  code_execution: {
    label: "Execução de Código",
    description: "Executa código Python e shell diretamente",
  },
  vision: { label: "Visão", description: "Analisa imagens e conteúdo visual" },
  image_gen: {
    label: "Geração de Imagens",
    description: "Gera imagens com DALL-E e outros modelos",
  },
  tts: {
    label: "Texto para Voz",
    description: "Converte texto em áudio falado",
  },
  skills: {
    label: "Habilidades",
    description: "Cria, gerencia e executa habilidades reutilizáveis",
  },
  memory: {
    label: "Memória",
    description: "Armazena e recupera conhecimento persistente",
  },
  session_search: {
    label: "Pesquisa de Sessão",
    description: "Pesquisa em conversas passadas",
  },
  clarify: {
    label: "Perguntas de Esclarecimento",
    description: "Pede esclarecimentos ao usuário quando necessário",
  },
  delegation: {
    label: "Delegação",
    description: "Inicia sub-agentes para tarefas paralelas",
  },
  cronjob: {
    label: "Cron Jobs",
    description: "Cria e gerencia tarefas agendadas",
  },
  moa: {
    label: "Mixture of Agents",
    description: "Coordena vários modelos de IA juntos",
  },
  todo: {
    label: "Planejamento de Tarefas",
    description: "Cria e gerencia listas de afazeres para tarefas complexas",
  },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "Servidores MCP",
  workspace: {
    subtitle:
      "O tecido operacional conversacional — sessões, arquivos e o tecido de execução que aciona os adaptadores CLI. Anexe quando quiser que o console o administre.",
    start: "Iniciar",
    stop: "Parar",
    probing: "Verificando…",
    reachable: "Acessível",
    unreachable: "AI Workspace não está acessível em",
    attachedAt: "Anexado em",
  },
  mcpDescription:
    "Servidores Model Context Protocol configurados no config.yaml. Gerencie via <code>hermes mcp add/remove</code> no terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "desativado",
  // V2.10.77 — Painéis de ferramentas
  panels: {
    laya: {
      subtitle:
        "Motor de decisão local System-1 — decisões tipadas de escolha/pontuação/nula com confiança e abstenção, exposto ao console via MCP.",
      ready: "Pronto",
      broken: "Instalado, mas a verificação de versão falhou",
    },
    weknora: {
      subtitle:
        "Plataforma opcional de conhecimento RAG empresarial. Apenas recuperação no lado do console; o seu servidor WeKnora é dono dos dados dele.",
      reachable: "Acessível",
      unreachable: "Não acessível",
    },
    governance: {
      title: "Governança do workspace",
      subtitle:
        "Registro de políticas, tarefas agendadas e compartilhamento do AI Workspace — a visão de governança do console. Os vereditos de aprovação são entregues por você, ao endpoint de resolução do workspace.",
      visible: "Visível",
      unavailable: "Superfícies de governança não acessíveis",
    },
    openviking: {
      subtitle:
        "Banco de dados de contexto de agente opcional — recursos, memórias e habilidades em um único sistema de arquivos viking:// navegável (somente interoperabilidade; núcleo AGPL).",
      reachable: "Acessível",
      unreachable: "Não acessível",
    },
    gbrain: {
      title: "GBrain (Memória Persistente)",
      subtitle:
        "Cérebro de conhecimento pessoal nativo do Postgres com mais de 30 ferramentas MCP — busca híbrida, síntese, grafo de conhecimento e ciclo de sonhos. Local-first via PGLite (sem configuração, sem Docker). A camada de memória com a qual seu agente deixa de ser amnésico.",
      healthy: "Saudável",
      unhealthy: "Não saudável",
      notInstalled:
        'GBrain não está instalado. Instale com: <code>bun install -g github:garrytan/gbrain</code> depois inicialize com <code>gbrain init --pglite --no-embedding</code>.',
    },
    wigolo: {
      title: "Wigolo (Inteligência Web Local)",
      subtitle:
        'Inteligência web local-first — buscar, obter, rastrear, extrair e pesquisar. 10 ferramentas MCP, sem chaves de API para ferramentas principais. Uma alternativa local gratuita ao Firecrawl (pago). Disponível como servidor MCP na tela MCP.',
      hint: 'Adicione via tela MCP: procure por "wigolo". Não precisa instalação — npx busca na primeira execução.',
    },
    watchSkill: {
      title: "Watch-Skill (Inteligência de Vídeo)",
      subtitle:
        "Inteligência de vídeo para agentes — assistir, lembrar, verificar. 23 ferramentas MCP para análise de vídeo, transcrição, OCR e THE LOOP (verificação de navegador/UI). Disponível como servidor MCP na tela MCP.",
      hint: 'Adicione via tela MCP: procure por "watch-skill". Instale com: <code>uv tool install watch-skill</code> (Python 3.13+).',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "Automação de navegador controlada por LLM via Chrome DevTools Protocol. O agente abre páginas, clica, digita, preenche formulários, extrai dados e testa sites. browser-harness é o conector CDP leve; browser-use é o cérebro do agente.",
      installed: "Instalado",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: problemas encontrados",
      doctorNotRun: " — doctor: não executado",
      hint: 'Adicione browser-use como servidor MCP: procure "browser-use" na tela MCP. Configure BU_CDP_URL nas Configurações para conectar ao Chrome via CDP.',
      notInstalled:
        'Browser Harness não está instalado. Instale com: <code>uv tool install browser-harness</code> (Python 3.12+). Depois habilite depuração remota no Chrome via <code>chrome://inspect/#remote-debugging</code>.',
    },
    officecli: {
      title: "OfficeCLI (Automação de Documentos Office)",
      subtitle:
        "Crie, leia, edite e renderize documentos Word (.docx), Excel (.xlsx) e PowerPoint (.pptx) — sem necessidade de instalar Office. Binário único com renderização HTML/PNG integrada, mais de 350 fórmulas Excel, mesclagem de templates e tabelas dinâmicas. O complemento de escrita para a conversão de leitura do markitdown.",
      installed: "Instalado",
      hint: 'Adicione como servidor MCP: procure "officecli" na tela MCP. O agente pode criar, editar e renderizar documentos Office via CLI ou MCP.',
      notInstalled:
        'OfficeCLI não está instalado. Instale com: <code>npm install -g @officecli/officecli</code> ou baixe de <code>https://github.com/iOfficeAI/OfficeCLI</code>. Binário único, sem .NET runtime necessário.',
      run: {
        title: "Executar um comando de documento",
        fileLabel: "Caminho do documento",
        filePlaceholder: "Caminho absoluto para um .docx, .xlsx ou .pptx",
        verbLabel: "Comando",
        argsLabel: "Argumentos",
        argsPlaceholder: "Argumentos extras, ex.: --page 1-3 (opcional)",
        submit: "Executar",
        running: "Executando…",
        outputLabel: "Saída",
        emptyHint: "Informe um caminho dentro da sua pasta pessoal ou temp. Caminhos fora dessas raízes são recusados.",
        notInstalled: "O OfficeCLI não está instalado, então não há o que executar.",
      },
      view: {
        button: "Ver como planilha",
        loading: "Carregando pré-visualização…",
        loadingUniver: "Carregando Univer…",
      },
    },
    graphify: {
      title: "Graphify (Grafo de Conhecimento Conceitual)",
      subtitle:
        "Transforme qualquer pasta (código, documentos, artigos, imagens) em um grafo de conhecimento conceitual navegável com detecção de comunidades. Encontra conexões entre documentos que você nunca pensaria em perguntar. Complementa CodeGraph (estrutura AST de código) com grafos conceituais semânticos. Gera HTML interativo, JSON GraphRAG e relatório de auditoria.",
      installed: "Instalado",
      hint: 'Adicione como servidor MCP: procure "graphify" na tela MCP. Execute <code>graphify &lt;caminho&gt;</code> para construir um grafo, depois consulte com <code>graphify query "&lt;pergunta&gt;"</code>.',
      notInstalled:
        "Graphify não está instalado. Instale com: <code>uv tool install 'graphifyy[mcp]'</code> (Python 3.12+).",
    },
  },
  agentReachTitle: "Capacidades de Internet (Agent-Reach)",
  agentReachSubtitle:
    "O Agent-Reach dá ao seu agente de runtime acesso à internet — Twitter, Reddit, YouTube, GitHub, RSS, busca na web e mais. Instale na máquina do gateway com: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "Atualizar",
  agentReachScanning: "Escaneando...",
  agentReachInstalled: "Instalado",
  agentReachNotInstalled:
    "O Agent-Reach não está instalado. O agente de runtime não tem ferramentas de capacidade de internet.",
  managedApps: {
    title: "Aplicativos gerenciados",
    subtitle:
      "Todo aplicativo ao qual o desktop pode se conectar, com o estado que o adaptador dele informa. Somente leitura: o desktop espelha esses serviços, não os gerencia.",
    refresh: "Atualizar",
    loading: "Lendo a lista…",
    empty: "Nenhum aplicativo gerenciado registrado.",
    needsSetup: "requer configuração",
    needsAuth: "requer configuração",
    unavailable: "A lista de aplicativos gerenciados não está disponível nesta versão.",
  },
} as const;
