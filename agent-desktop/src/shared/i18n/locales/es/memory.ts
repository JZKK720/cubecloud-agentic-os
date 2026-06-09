export default {
  title: "Memoria",
  subtitle: "Lo que Hermes recuerda sobre ti y tu entorno entre sesiones.",
  sessions: "Sesiones",
  messages: "Mensajes",
  memories: "Recuerdos",
  providersTitle: "Proveedores",
  agentMemory: "Memoria del agente",
  userProfile: "Perfil del usuario",
  entries: "{{count}} entradas",
  addMemory: "Agregar recuerdo",
  addFailed: "No se pudo agregar la entrada",
  updateFailed: "No se pudo actualizar la entrada",
  saveFailed: "No se pudo guardar",
  entriesPlaceholder:
    "p. ej. El usuario prefiere TypeScript en lugar de JavaScript. Usa siempre el modo estricto.",
  userProfilePlaceholder:
    "p. ej. Nombre: Alex. Desarrollador sénior. Prefiere respuestas concisas. Usa macOS con zsh. Zona horaria: PST.",
  noProvidersFound:
    "No se encontraron proveedores de memoria en esta instalación.",
  openProviderWebsite: "Abrir el sitio web del proveedor",
  noMemoriesYet:
    "Todavía no hay recuerdos. Hermes guardará los datos importantes mientras chateas.",
  noMemoryEntries: "Todavía no hay entradas de memoria.",
  noToolsetsFound: "No se encontraron conjuntos de herramientas.",
  addManuallyHint:
    "También puedes agregar recuerdos manualmente con el botón de arriba.",
  userProfileHint:
    "Cuéntale a Hermes sobre ti: nombre, rol, preferencias y estilo de comunicación.",
  providersHint:
    "Los proveedores de memoria conectables ofrecen a Hermes memoria avanzada a largo plazo. La memoria integrada (arriba) siempre está activa junto con el proveedor seleccionado.",
  providersHintActive: "Activo: <strong>{{provider}}</strong>",
  providersHintInactive:
    "No hay ningún proveedor externo activo — usando solo la memoria integrada.",
  enterEnvKey: "Introduce {{key}}",
  chars: "{{count}} caracteres",
  cancel: "Cancelar",
  save: "Guardar",
  edit: "Editar",
  deleteConfirm: "¿Eliminar?",
  yes: "Sí",
  no: "No",
  saveProfile: "Guardar perfil",
  active: "Activo",
  deactivate: "Desactivar",
  activating: "Activando...",
  activate: "Activar",  wikiTab: "Base de conocimiento",  learningsTab: "Aprendizajes",

  providers: {
    honcho:
      "Modelado de usuarios nativo para IA entre sesiones con preguntas y respuestas dialécticas y búsqueda semántica",
    hindsight:
      "Memoria a largo plazo con grafo de conocimiento y recuperación con múltiples estrategias",
    mem0: "Extracción de hechos con LLM en el servidor, con búsqueda semántica y eliminación automática de duplicados",
    retaindb:
      "API de memoria en la nube con búsqueda híbrida y 7 tipos de memoria",
    supermemory:
      "Memoria semántica a largo plazo con recuperación de perfiles y extracción de entidades",
    holographic:
      "Almacén local de hechos en SQLite con búsqueda FTS5 y puntuación de confianza (no requiere API key)",
    openviking:
      "Memoria gestionada por sesiones con recuperación por niveles y exploración del conocimiento",
    byterover:
      "Árbol de conocimiento persistente con recuperación por niveles mediante la CLI de brv",
  },

  // Learnings (V2 Step 10 — gstack /learn)
  learnings: {
    subtitle:
      "Patrones, errores y preferencias duraderos observados entre sesiones.",
    empty: "Aún no hay aprendizajes. Se añadirán aquí a medida que ocurran.",
    searchPlaceholder: "Buscar por clave, habilidad o idea…",
    typeLabel: "Tipo",
    sourceLabel: "Fuente",
    allTypes: "Todos los tipos",
    allSources: "Todas las fuentes",
    stats: {
      total: "{{count}} total",
      unique: "{{count}} únicos",
      avgConfidence: "confianza media {{value}}",
      byType: "por tipo",
      bySource: "por fuente",
      topKeys: "claves principales",
    },
    add: "Añadir aprendizaje",
    addTitle: "Añadir un aprendizaje",
    keyLabel: "Clave",
    keyPlaceholder: "p. ej. careful.rm-recursive",
    insightLabel: "Idea",
    insightPlaceholder: "¿Qué aprendimos?",
    skillLabel: "Habilidad (opcional)",
    typeField: "Tipo",
    sourceField: "Fuente",
    confidenceLabel: "Confianza (0-1)",
    filesLabel: "Archivos (separados por comas, opcional)",
    cancel: "Cancelar",
    save: "Guardar",
    export: "Exportar como Markdown",
    copied: "Copiado al portapapeles",
    copy: "Copiar",
    findStale: "Buscar obsoletos",
    clear: "Borrar todo",
    clearConfirm:
      "¿Borrar todos los aprendizajes de este perfil? No se puede deshacer.",
    noFile: "Aún no hay learnings.jsonl.",
    noSearchResults: "Ningún aprendizaje coincide con los filtros actuales.",
    staleness: {
      label: "obsoleto",
      empty: "No hay aprendizajes obsoletos.",
    },
  },

  // Knowledge (V2 Step 14 — gbrain knowledge MCP)
  knowledge: {
    searchPlaceholder: "Buscar en la base de conocimiento…",
    search: "Buscar",
    list: "Listar",
    sources: "Fuentes sin procesar",
    synthesize: "Sintetizar tema",
    topicPlaceholder: "¿Qué quieres saber?",
    filterType: "Filtrar por tipo",
    allTypes: "Todos los tipos",
    open: "Abrir",
    empty: "Aún no hay páginas de conocimiento.",
    sourcesEmpty: "No se han ingestado fuentes sin procesar.",
    result: "{{count}} resultado(s)",
    synthesisTitle: "Síntesis",
    claimsTitle: "Afirmaciones ({{count}})",
    gapsTitle: "Vacíos ({{count}})",
    sourcesTitle: "Fuentes ({{count}})",
    freshness: "Frescura: {{when}}",
    noSynthesis: "Ejecuta una síntesis para ver la respuesta de la capa de cerebro.",
    citation: "cita",
  },
} as const;
