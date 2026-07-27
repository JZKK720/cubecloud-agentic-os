export default {
  title: "Herramientas",
  subtitle:
    "Activa o desactiva los conjuntos de herramientas que tu agente puede usar durante las conversaciones",
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
  // V2.10.77 — Paneles de herramientas
  panels: {
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
} as const;
