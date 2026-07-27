export default {
  title: "Ferramentas",
  subtitle:
    "Active ou desactive os conjuntos de ferramentas que o seu agente pode usar durante as conversas",
  web: {
    label: "Pesquisa na Web",
    description: "Pesquisa na web e extrai conteúdo de URLs",
  },
  browser: {
    label: "Navegador",
    description: "Navegar, clicar, escrever e interagir com páginas web",
  },
  terminal: {
    label: "Terminal",
    description: "Executar comandos de shell e scripts",
  },
  file: {
    label: "Operações de Ficheiro",
    description: "Lê, escreve, pesquisa e gere ficheiros",
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
    label: "Competências/Skills",
    description: "Cria, gere e executa competências reutilizáveis",
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
    description: "Pede esclarecimentos ao utilizador quando necessário",
  },
  delegation: {
    label: "Delegação",
    description: "Inicia sub-agentes para tarefas paralelas",
  },
  cronjob: {
    label: "Cron Jobs",
    description: "Cria e gere tarefas agendadas",
  },
  moa: {
    label: "Mixture of Agents",
    description: "Coordena vários modelos de IA em conjunto",
  },
  todo: {
    label: "Planeamento de Tarefas",
    description: "Cria e gere listas de afazeres para tarefas complexas",
  },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "Servidores MCP",
  mcpDescription:
    "Servidores Model Context Protocol configurados no config.yaml. Faça a gestão via <code>hermes mcp add/remove</code> no terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "desactivado",
  // V2.10.77 — Painéis de ferramentas
  panels: {
    gbrain: {
      title: "GBrain (Memória Persistente)",
      subtitle:
        "Cérebro de conhecimento pessoal nativo do Postgres com mais de 30 ferramentas MCP — pesquisa híbrida, síntese, grafo de conhecimento e ciclo de sonhos. Local-first via PGLite (sem configuração, sem Docker). A camada de memória com a qual o seu agente deixa de ser amnésico.",
      healthy: "Saudável",
      unhealthy: "Não saudável",
      notInstalled:
        'GBrain não está instalado. Instale com: <code>bun install -g github:garrytan/gbrain</code> depois inicialize com <code>gbrain init --pglite --no-embedding</code>.',
    },
    wigolo: {
      title: "Wigolo (Inteligência Web Local)",
      subtitle:
        'Inteligência web local-first — pesquisar, obter, rastrear, extrair e investigar. 10 ferramentas MCP, sem chaves de API para ferramentas principais. Uma alternativa local gratuita ao Firecrawl (pago). Disponível como servidor MCP no ecrã MCP.',
      hint: 'Adicione via ecrã MCP: procure por "wigolo". Não precisa de instalação — npx obtém na primeira execução.',
    },
    watchSkill: {
      title: "Watch-Skill (Inteligência de Vídeo)",
      subtitle:
        "Inteligência de vídeo para agentes — ver, lembrar, verificar. 23 ferramentas MCP para análise de vídeo, transcrição, OCR e THE LOOP (verificação de navegador/UI). Disponível como servidor MCP no ecrã MCP.",
      hint: 'Adicione via ecrã MCP: procure por "watch-skill". Instale com: <code>uv tool install watch-skill</code> (Python 3.13+).',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "Automação de navegador controlada por LLM via Chrome DevTools Protocol. O agente abre páginas, clica, escreve, preenche formulários, extrai dados e testa sites. browser-harness é o conector CDP leve; browser-use é o cérebro do agente.",
      installed: "Instalado",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: problemas encontrados",
      doctorNotRun: " — doctor: não executado",
      hint: 'Adicione browser-use como servidor MCP: procure "browser-use" no ecrã MCP. Configure BU_CDP_URL nas Definições para ligar ao Chrome via CDP.',
      notInstalled:
        'Browser Harness não está instalado. Instale com: <code>uv tool install browser-harness</code> (Python 3.12+). Depois ative a depuração remota no Chrome via <code>chrome://inspect/#remote-debugging</code>.',
    },
    officecli: {
      title: "OfficeCLI (Automação de Documentos Office)",
      subtitle:
        "Crie, leia, edite e renderize documentos Word (.docx), Excel (.xlsx) e PowerPoint (.pptx) — sem necessidade de instalar Office. Binário único com renderização HTML/PNG integrada, mais de 350 fórmulas Excel, união de modelos e tabelas dinâmicas. O complemento de escrita para a conversão de leitura do markitdown.",
      installed: "Instalado",
      hint: 'Adicione como servidor MCP: procure "officecli" no ecrã MCP. O agente pode criar, editar e renderizar documentos Office via CLI ou MCP.',
      notInstalled:
        'OfficeCLI não está instalado. Instale com: <code>npm install -g @officecli/officecli</code> ou descarregue de <code>https://github.com/iOfficeAI/OfficeCLI</code>. Binário único, sem .NET runtime necessário.',
    },
    graphify: {
      title: "Graphify (Grafo de Conhecimento Conceitual)",
      subtitle:
        "Transforme qualquer pasta (código, documentos, artigos, imagens) num grafo de conhecimento conceitual navegável com deteção de comunidades. Encontra ligações entre documentos que nunca pensaria em perguntar. Complementa CodeGraph (estrutura AST de código) com grafos conceituais semânticos. Gera HTML interativo, JSON GraphRAG e relatório de auditoria.",
      installed: "Instalado",
      hint: 'Adicione como servidor MCP: procure "graphify" no ecrã MCP. Execute <code>graphify &lt;caminho&gt;</code> para construir um grafo, depois consulte com <code>graphify query "&lt;pergunta&gt;"</code>.',
      notInstalled:
        "Graphify não está instalado. Instale com: <code>uv tool install 'graphifyy[mcp]'</code> (Python 3.12+).",
    },
  },
} as const;
