export default {
  eyebrow: "Inteligência de código",
  title: "CodeGraph",
  summary:
    "Indexe um repositório uma vez e faça perguntas estruturais sobre ele. O CodeGraph percorre a AST para mapear pontos de entrada, imports e arestas de chamada, para que o agente possa raciocinar sobre código que não leu linha por linha.",
  runtime: "Runtime local",
  repos: {
    title: "Repositórios indexados",
    empty:
      "Nenhum repositório indexado ainda. Adicione um repositório abaixo para construir o grafo.",
  },
  addRepo: "Adicionar repositório",
  files: "arquivos",
  nodes: "nós",
  edges: "arestas",
  cli: {
    installed: "CLI instalada",
    version: "Versão",
    missingTitle: "CodeGraph CLI não encontrada",
    missingBody:
      "Instale a CodeGraph CLI para indexar repositórios, ou aponte o Hermes para um índice existente. O desktop nunca a instala por você.",
    install: "Instalar CodeGraph CLI",
    setupHermes: "Configurar o Hermes",
  },
  contextBundle: "Pacote de contexto",
  contextBundleHint:
    "Descreva a arquitetura ou o caminho de código para o qual você quer contexto. O CodeGraph reúne os arquivos e arestas relevantes em um único anexo que você pode soltar no Chat.",
  promptPlaceholder:
    "Resuma a arquitetura, os caminhos quentes e os pontos de extensão prováveis para …",
  build: "Construir pacote",
  building: "Construindo…",
  embeddedSearch: "Busca integrada",
  embeddedSearchHint:
    "Consulte o índice diretamente pelo shell. Os resultados são classificados por proximidade no grafo, não apenas por correspondência de texto.",
  embeddedSdkVersion: "Versão do SDK",
  embeddedProjectOpen: "Projeto aberto",
  embeddedOpenProject: "Abrir projeto",
  embeddedSearchPlaceholder: "Faça uma pergunta estrutural, ex: onde a autenticação é aplicada?",
  embeddedSearchCta: "Buscar no grafo",
};
