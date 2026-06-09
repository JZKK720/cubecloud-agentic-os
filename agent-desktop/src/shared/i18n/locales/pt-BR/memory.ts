export default {
  title: "Mem贸ria",
  subtitle: "O que o Hermes lembra sobre voc锚 e seu ambiente entre as sess玫es.",
  sessions: "Sess玫es",
  messages: "Mensagens",
  memories: "Mem贸rias",
  providersTitle: "Provedores",
  agentMemory: "Mem贸ria do Agente",
  userProfile: "Perfil do Usu谩rio",
  entries: "{{count}} entradas",
  addMemory: "Adicionar Mem贸ria",
  addFailed: "Falha ao adicionar entrada",
  updateFailed: "Falha ao atualizar entrada",
  saveFailed: "Falha ao salvar",
  entriesPlaceholder:
    "ex: O usu谩rio prefere TypeScript em vez de JavaScript. Sempre use o modo estrito.",
  userProfilePlaceholder:
    "ex: Nome: Alex. Desenvolvedor s锚nior. Prefere respostas concisas. Usa macOS com zsh. Fuso hor谩rio: PST.",
  noProvidersFound: "Nenhum provedor de mem贸ria encontrado nesta instala莽茫o.",
  openProviderWebsite: "Abrir site do provedor",
  noMemoriesYet:
    "Nenhuma mem贸ria ainda. O Hermes salvar谩 fatos importantes conforme voc锚s conversam.",
  noMemoryEntries: "Nenhuma entrada de mem贸ria ainda.",
  noToolsetsFound: "Nenhum conjunto de ferramentas encontrado.",
  addManuallyHint:
    "Voc锚 tamb茅m pode adicionar mem贸rias manualmente usando o bot茫o acima.",
  userProfileHint:
    "Conte ao Hermes sobre voc锚 鈥?nome, cargo, prefer锚ncias, estilo de comunica莽茫o.",
  providersHint:
    "Provedores de mem贸ria plug谩veis d茫o ao Hermes uma mem贸ria de longo prazo avan莽ada. A mem贸ria integrada (acima) est谩 sempre ativa ao lado do provedor selecionado.",
  providersHintActive: "Ativo: <strong>{{provider}}</strong>",
  providersHintInactive:
    "Nenhum provedor externo ativo 鈥?usando apenas a integrada.",
  enterEnvKey: "Digite {{key}}",
  chars: "{{count}} caracteres",
  cancel: "Cancelar",
  save: "Salvar",
  edit: "Editar",
  deleteConfirm: "Excluir?",
  yes: "Sim",
  no: "N茫o",
  saveProfile: "Salvar Perfil",
  active: "Ativo",
  deactivate: "Desativar",
  activating: "Ativando...",
  activate: "Ativar",  wikiTab: "Base de conhecimento",  learningsTab: "Aprendizados",

  providers: {
    honcho:
      "Modelagem de usu谩rio entre sess玫es nativa de IA com Q&A dial茅tico e busca sem芒ntica",
    hindsight:
      "Memóriaria de longo prazo com grafo de conhecimento e recuperaçãoo multi-estratégiagia",
    mem0: "Server-side LLM fact extraction with semantic search and auto-deduplication",
    retaindb: "Cloud memory API with hybrid search and 7 memory types",
    supermemory: "Semantic long-term memory with profile recall and entity extraction",
    holographic: "Local SQLite fact store with FTS5 search and trust scoring (no API key needed)",
    openviking: "Session-managed memory with tiered retrieval and knowledge browsing",
    
    byterover: "Árvore de conhecimento persistente com recuperação em camadas via CLI brv",
  },

  // Learnings (V2 Step 10 — gstack /learn)
  learnings: {
    subtitle:
      "Padrões, armadilhas e preferências duráveis observados entre sessões.",
    empty: "Ainda não há aprendizados. Eles serão adicionados aqui conforme ocorrerem.",
    searchPlaceholder: "Buscar por chave, habilidade ou insight…",
    typeLabel: "Tipo",
    sourceLabel: "Origem",
    allTypes: "Todos os tipos",
    allSources: "Todas as origens",
    stats: {
      total: "{{count}} no total",
      unique: "{{count}} únicos",
      avgConfidence: "confiança média {{value}}",
      byType: "por tipo",
      bySource: "por origem",
      topKeys: "principais chaves",
    },
    add: "Adicionar aprendizado",
    addTitle: "Adicionar um aprendizado",
    keyLabel: "Chave",
    keyPlaceholder: "ex. careful.rm-recursive",
    insightLabel: "Insight",
    insightPlaceholder: "O que aprendemos?",
    skillLabel: "Habilidade (opcional)",
    typeField: "Tipo",
    sourceField: "Origem",
    confidenceLabel: "Confiança (0-1)",
    filesLabel: "Arquivos (separados por vírgula, opcional)",
    cancel: "Cancelar",
    save: "Salvar",
    export: "Exportar como Markdown",
    copied: "Copiado para a área de transferência",
    copy: "Copiar",
    findStale: "Encontrar obsoletos",
    clear: "Limpar tudo",
    clearConfirm:
      "Apagar todos os aprendizados deste perfil? Isso não pode ser desfeito.",
    noFile: "Ainda não há learnings.jsonl.",
    noSearchResults:
      "Nenhum aprendizado corresponde aos filtros atuais.",
    staleness: {
      label: "obsoleto",
      empty: "Nenhum aprendizado obsoleto.",
    },
  },

  // Knowledge (V2 Step 14 — gbrain knowledge MCP)
  knowledge: {
    searchPlaceholder: "Buscar na base de conhecimento…",
    search: "Buscar",
    list: "Listar",
    sources: "Fontes brutas",
    synthesize: "Sintetizar tópico",
    topicPlaceholder: "O que você quer saber?",
    filterType: "Filtrar por tipo",
    allTypes: "Todos os tipos",
    open: "Abrir",
    empty: "Ainda não há páginas de conhecimento.",
    sourcesEmpty: "Nenhuma fonte bruta foi ingerida.",
    result: "{{count}} resultado(s)",
    synthesisTitle: "Síntese",
    claimsTitle: "Alegações ({{count}})",
    gapsTitle: "Lacunas ({{count}})",
    sourcesTitle: "Fontes ({{count}})",
    freshness: "Atualidade: {{when}}",
    noSynthesis:
      "Execute uma síntese para ver a resposta da camada-cérebro.",
    citation: "cit.",
  },
} as const;