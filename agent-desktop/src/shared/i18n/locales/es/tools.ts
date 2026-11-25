export default {
  title: "Herramientas",
  subtitle:
    "Activa o desactiva los conjuntos de herramientas que tu agente puede usar durante las conversaciones",
  empty: "No hay conjuntos de herramientas disponibles",
  emptyHint: "Los conjuntos de herramientas aparecerán aquí cuando el gateway esté en ejecución.",
  web: {
    label: "Búsqueda web",
    description: "Busca en la web y extrae contenido de URLs",
  },
  browser: {
    label: "Navegador",
    description: "Navega, haz clic, escribe e interactúa con páginas web",
  },
  terminal: {
    label: "Terminal",
    description: "Ejecuta comandos y scripts de shell",
  },
  file: {
    label: "Operaciones con archivos",
    description: "Lee, escribe, busca y administra archivos",
  },
  code_execution: {
    label: "Ejecución de código",
    description: "Ejecuta código de Python y shell directamente",
  },
  vision: {
    label: "Visión",
    description: "Analiza imágenes y contenido visual",
  },
  image_gen: {
    label: "Generación de imágenes",
    description: "Genera imágenes con DALL-E y otros modelos",
  },
  tts: {
    label: "Texto a voz",
    description: "Convierte texto en audio hablado",
  },
  skills: {
    label: "Habilidades",
    description: "Crea, administra y ejecuta habilidades reutilizables",
  },
  memory: {
    label: "Memoria",
    description: "Almacena y recupera conocimiento persistente",
  },
  session_search: {
    label: "Búsqueda de sesiones",
    description: "Busca en conversaciones anteriores",
  },
  clarify: {
    label: "Preguntas de aclaración",
    description: "Pide aclaraciones al usuario cuando sea necesario",
  },
  delegation: {
    label: "Delegación",
    description: "Lanza subagentes para tareas en paralelo",
  },
  cronjob: {
    label: "Tareas cron",
    description: "Crea y administra tareas programadas",
  },
  moa: {
    label: "Mezcla de agentes",
    description: "Coordina varios modelos de IA en conjunto",
  },
  todo: {
    label: "Planificación de tareas",
    description: "Crea y administra listas de tareas para trabajos complejos",
  },
  file_to_markdown: {
    label: "File to Markdown",
    description:
      "Convert dropped files (PDF, DOCX, PPTX, image, HTML, ...) to clean Markdown for the agent to ingest.",
  },
  mcpServers: "Servidores MCP",
  mcpDescription:
    "Servidores Model Context Protocol configurados en config.yaml. Adminístralos con <code>hermes mcp add/remove</code> en la terminal.",
  http: "HTTP",
  stdio: "stdio",
  disabled: "desactivado",
  workspace: {
    subtitle:
      "El tejido operativo conversacional — sesiones, archivos y el tejido runner que impulsa los adaptadores CLI. Conéctalo cuando quieras que la consola lo gobierne.",
    start: "Iniciar",
    stop: "Detener",
    probing: "Sondeando…",
    reachable: "Accesible",
    unreachable: "AI Workspace no accesible en",
    attachedAt: "Conectado el",
  },
  // V2.10.77 — Paneles de herramientas
  panels: {
    laya: {
      subtitle:
        "Motor de decisiones local de Sistema-1 — decisiones tipadas choice/score/noul con confianza y abstención, expuesto a la consola mediante MCP.",
      ready: "Listo",
      broken: "Instalado pero la comprobación de versión falló",
    },
    weknora: {
      subtitle:
        "Plataforma opcional de conocimiento RAG empresarial. Solo recuperación en el lado de la consola; tu servidor WeKnora es dueño de sus datos.",
      reachable: "Accesible",
      unreachable: "No accesible",
    },
    governance: {
      title: "Gobernanza del workspace",
      subtitle:
        "Registro de políticas, tareas programadas y compartición desde AI Workspace — la vista de gobernanza de la consola. Los veredictos de aprobación los entregas tú, en el endpoint resolve del workspace.",
      visible: "Visible",
      unavailable: "Las superficies de gobernanza no están accesibles",
    },
    openviking: {
      subtitle:
        "Base de datos opcional de contexto del agente — recursos, memorias y habilidades en un sistema de archivos viking:// navegable (solo interoperabilidad; núcleo AGPL).",
      reachable: "Accesible",
      unreachable: "No accesible",
    },
    gbrain: {
      title: "GBrain (Memoria Persistente)",
      subtitle:
        "Cerebro de conocimiento personal nativo de Postgres con más de 30 herramientas MCP — búsqueda híbrida, síntesis, grafo de conocimiento y ciclo de sueños. Local primero via PGLite (sin configuración, sin Docker). La capa de memoria con la que tu agente deja de ser amnésico.",
      healthy: "Saludable",
      unhealthy: "No saludable",
      notInstalled:
        'GBrain no está instalado. Instala con: <code>bun install -g github:garrytan/gbrain</code> luego inicializa con <code>gbrain init --pglite --no-embedding</code>.',
    },
    wigolo: {
      title: "Wigolo (Inteligencia Web Local)",
      subtitle:
        'Inteligencia web local primero — buscar, extraer, rastrear, investigar. 10 herramientas MCP, sin claves API para herramientas principales. Un complemento local gratuito a Firecrawl (de pago). Disponible como servidor MCP en la pantalla MCP.',
      hint: 'Añade via la pantalla MCP: busca "wigolo". No necesita instalación — npx se descarga en la primera ejecución.',
    },
    watchSkill: {
      title: "Watch-Skill (Inteligencia de Video)",
      subtitle:
        "Inteligencia de video para agentes — ver, recordar, verificar. 23 herramientas MCP para análisis de video, transcripción, OCR y THE LOOP (verificación de navegador/UI). Disponible como servidor MCP en la pantalla MCP.",
      hint: 'Añade via la pantalla MCP: busca "watch-skill". Instala con: <code>uv tool install watch-skill</code> (Python 3.13+).',
    },
    browserHarness: {
      title: "Browser Harness + Browser Use",
      subtitle:
        "Automatización de navegador controlada por LLM via Chrome DevTools Protocol. El agente abre páginas, hace clic, escribe, rellena formularios, extrae datos y prueba sitios web. browser-harness es el conector CDP ligero; browser-use es el cerebro del agente.",
      installed: "Instalado",
      doctorOk: " — doctor: OK",
      doctorIssues: " — doctor: problemas encontrados",
      doctorNotRun: " — doctor: no ejecutado",
      hint: 'Añade browser-use como servidor MCP: busca "browser-use" en la pantalla MCP. Configura BU_CDP_URL en Ajustes para conectar a tu Chrome via CDP.',
      notInstalled:
        'Browser Harness no está instalado. Instala con: <code>uv tool install browser-harness</code> (Python 3.12+). Luego habilita la depuración remota en Chrome via <code>chrome://inspect/#remote-debugging</code>.',
    },
    officecli: {
      title: "OfficeCLI (Automatización de Documentos Office)",
      subtitle:
        "Crea, lee, edita y renderiza documentos Word (.docx), Excel (.xlsx) y PowerPoint (.pptx) — sin necesidad de instalar Office. Un solo binario con renderizado HTML/PNG integrado, más de 350 fórmulas de Excel, combinación de plantillas y tablas dinámicas. El complemento de escritura a la conversión de lectura de markitdown.",
      installed: "Instalado",
      hint: 'Añade como servidor MCP: busca "officecli" en la pantalla MCP. El agente puede crear, editar y renderizar documentos Office via CLI o MCP.',
      notInstalled:
        'OfficeCLI no está instalado. Instala con: <code>npm install -g @officecli/officecli</code> o descarga desde <code>https://github.com/iOfficeAI/OfficeCLI</code>. Un solo binario, sin necesidad de .NET runtime.',
      run: {
        title: "Ejecutar un comando de documento",
        fileLabel: "Ruta del documento",
        filePlaceholder: "Ruta absoluta a un archivo .docx, .xlsx o .pptx",
        verbLabel: "Comando",
        argsLabel: "Argumentos",
        argsPlaceholder: "Argumentos extra, p. ej. --page 1-3 (opcional)",
        submit: "Ejecutar",
        running: "Ejecutando…",
        outputLabel: "Salida",
        emptyHint: "Introduce una ruta dentro de tu carpeta personal o temporal. Las rutas fuera de esas raíces se rechazan.",
        notInstalled: "OfficeCLI no está instalado, por lo que no hay nada que ejecutar.",
      },
      view: {
        button: "Ver como hoja de cálculo",
        loading: "Cargando vista previa…",
        loadingUniver: "Cargando Univer…",
      },
    },
    graphify: {
      title: "Graphify (Grafo de Conocimiento Conceptual)",
      subtitle:
        "Convierte cualquier carpeta (código, documentos, artículos, imágenes) en un grafo de conocimiento conceptual navegable con detección de comunidades. Encuentra conexiones entre documentos que nunca se te ocurriría preguntar. Complementa CodeGraph (estructura AST de código) con grafos conceptuales semánticos. Genera HTML interactivo, JSON GraphRAG e informe de auditoría.",
      installed: "Instalado",
      hint: 'Añade como servidor MCP: busca "graphify" en la pantalla MCP. Ejecuta <code>graphify &lt;ruta&gt;</code> para construir un grafo, luego consulta con <code>graphify query "&lt;pregunta&gt;"</code>.',
      notInstalled:
        "Graphify no está instalado. Instala con: <code>uv tool install 'graphifyy[mcp]'</code> (Python 3.12+).",
    },
  },
  agentReachTitle: "Capacidades de Internet (Agent-Reach)",
  agentReachSubtitle:
    "Agent-Reach da a tu agente de runtime acceso a internet — Twitter, Reddit, YouTube, GitHub, RSS, búsqueda web y más. Instálalo en la máquina del gateway con: python -m pip install --user git+https://github.com/Panniantong/Agent-Reach.git",
  agentReachRefresh: "Actualizar",
  agentReachScanning: "Escaneando...",
  agentReachInstalled: "Instalado",
  agentReachNotInstalled:
    "Agent-Reach no está instalado. El agente de runtime no tiene herramientas de capacidad de internet.",
  managedApps: {
    title: "Apps administradas",
    subtitle:
      "Todas las apps a las que el escritorio puede conectarse, con el estado que reporta su adaptador. Solo lectura: el escritorio refleja estos servicios, no los administra.",
    refresh: "Actualizar",
    loading: "Leyendo el listado…",
    empty: "No hay apps administradas registradas.",
    needsSetup: "requiere configuración",
    needsAuth: "requiere configuración",
    unavailable: "El listado de apps administradas no está disponible en esta compilación.",
  },
} as const;
