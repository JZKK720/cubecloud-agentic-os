// Source-of-truth CodeGraph screen strings (Spanish).

export default {
  eyebrow: "Inteligencia de código",
  title: "CodeGraph",
  summary:
    "Indexa un repositorio una vez y luego haz preguntas estructurales sobre él. CodeGraph recorre el AST para mapear puntos de entrada, importaciones y aristas de llamadas para que el agente pueda razonar sobre código que no ha leído línea por línea.",
  runtime: "Runtime local",
  repos: {
    title: "Repositorios indexados",
    empty:
      "Aún no hay repositorios indexados. Añade un repositorio abajo para crear su grafo.",
  },
  addRepo: "Añadir repositorio",
  files: "archivos",
  nodes: "nodos",
  edges: "aristas",
  cli: {
    installed: "CLI instalada",
    version: "Versión",
    missingTitle: "CodeGraph CLI no encontrado",
    missingBody:
      "Instala la CLI de CodeGraph para indexar repositorios, o apunta Hermes a un índice existente. El escritorio nunca la instala por ti.",
    install: "Instalar CodeGraph CLI",
    setupHermes: "Configurar Hermes",
  },
  contextBundle: "Paquete de contexto",
  contextBundleHint:
    "Describe la arquitectura o la ruta de código para la que quieres contexto. CodeGraph reúne los archivos y aristas relevantes en un único adjunto que puedes soltar en el Chat.",
  promptPlaceholder:
    "Resume la arquitectura, las rutas críticas y los puntos de extensión probables para …",
  build: "Construir paquete",
  building: "Construyendo…",
  embeddedSearch: "Búsqueda integrada",
  embeddedSearchHint:
    "Consulta el índice directamente desde el shell. Los resultados se clasifican por proximidad en el grafo, no solo por coincidencia de texto.",
  embeddedSdkVersion: "Versión de SDK",
  embeddedProjectOpen: "Proyecto abierto",
  embeddedOpenProject: "Abrir proyecto",
  embeddedSearchPlaceholder: "Haz una pregunta estructural, p. ej. dónde se aplica la autenticación",
  embeddedSearchCta: "Buscar en el grafo",
};
