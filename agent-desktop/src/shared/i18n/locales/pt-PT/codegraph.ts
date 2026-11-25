export default {
  eyebrow: "Inteligência de código",
  title: "CodeGraph",
  summary:
    "Indexe um repositório uma vez e depois faça perguntas estruturais sobre ele. O CodeGraph percorre a AST para mapear pontos de entrada, importações e arestas de chamadas, para que o agente possa raciocinar sobre código que não leu linha a linha.",
  runtime: "Runtime local",
  repos: {
    title: "Repositórios indexados",
    empty:
      "Ainda não há repositórios indexados. Adicione um repositório abaixo para construir o seu grafo.",
  },
  addRepo: "Adicionar repositório",
  files: "ficheiros",
  nodes: "nós",
  edges: "arestas",
  cli: {
    installed: "CLI instalado",
    version: "Versão",
    missingTitle: "CLI do CodeGraph não encontrado",
    missingBody:
      "Instale o CodeGraph CLI para indexar repositórios ou aponte o Hermes para um índice existente. O ambiente de trabalho nunca o instala por si.",
    install: "Instalar CodeGraph CLI",
    setupHermes: "Configurar Hermes",
  },
  contextBundle: "Pacote de contexto",
  contextBundleHint:
    "Descreva a arquitetura ou o caminho de código para o qual pretende contexto. O CodeGraph reúne os ficheiros e arestas relevantes num único anexo que pode largar no Chat.",
  promptPlaceholder:
    "Resuma a arquitetura, os caminhos quentes e os pontos de extensão prováveis para …",
  build: "Construir pacote",
  building: "A construir…",
  embeddedSearch: "Pesquisa incorporada",
  embeddedSearchHint:
    "Consulte o índice diretamente a partir do shell. Os resultados são classificados por proximidade no grafo, não apenas por correspondência de texto.",
  embeddedSdkVersion: "Versão do SDK",
  embeddedProjectOpen: "Projeto aberto",
  embeddedOpenProject: "Abrir projeto",
  embeddedSearchPlaceholder: "Faça uma pergunta estrutural, ex.: onde é aplicada a autenticação?",
  embeddedSearchCta: "Pesquisar no grafo",
} as const;
