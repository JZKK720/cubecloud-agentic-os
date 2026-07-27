export default {
  title: "Ferramentas",
  subtitle:
    "Ative ou desative os conjuntos de ferramentas que seu agente pode usar durante as conversas",
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
  mcpDescription:
    "Servidores Model Context Protocol configurados no config.yaml. Gerencie via <code>hermes mcp add/remove</code> no terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "desativado",
  // V2.10.77 — Painéis de ferramentas
  panels: {
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
} as const;
