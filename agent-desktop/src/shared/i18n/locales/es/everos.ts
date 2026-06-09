export default {
  "eyebrow": "Memoria",
  "title": "EverOS",
  "summary": "EverOS es una plataforma de memoria a largo plazo respaldada por un servidor EverCore auto-hospedado. Apunta el shell a tu URL base de EverOS para recordar lo que el usuario ha dicho en sesiones anteriores.",
  "notWired": {
    "title": "Not wired",
    "body": "EverOS integration is being added. The backend spec is already implemented in main; this screen will light up once the preload bridge is finalised.",
    "addHarness": "Add harness (coming soon)"
  },
  "health": {
    "title": "Backend",
    "reachable": "Accesible",
    "unreachable": "No accesible",
    "probing": "Probando…",
    "scannedAt": "Última comprobación"
  },
  "config": {
    "title": "Conexión",
    "body": "EverOS se ejecuta por defecto en http://localhost:1995. El shell apuntará a la URL base configurada cada vez que el usuario pida memoria a largo plazo.",
    "baseUrl": "URL base",
    "apiKey": "Clave API",
    "userId": "ID de usuario",
    "groupId": "ID de grupo",
    "topK": "Top K",
    "method": "Método de recuperación",
    "save": "Guardar",
    "edit": "Configurar",
    "cancel": "Cerrar"
  },
  "add": {
    "title": "Recordar",
    "body": "Anota un hecho que el agente deba guardar. Se almacena con el usuario y grupo configurados.",
    "placeholder": "ej. El usuario prefiere modo oscuro y respuestas concisas.",
    "cta": "Guardar",
    "sending": "Guardando…",
    "success": "{{count}} memoria(s) guardada(s).",
    "failed": "Error al guardar: {{error}}"
  },
  "search": {
    "title": "Recordar",
    "body": "Búsqueda híbrida sobre la memoria episódica del usuario.",
    "placeholder": "¿Qué prefiere el usuario?",
    "cta": "Buscar",
    "searching": "Buscando…",
    "empty": "Aún no hay memorias coincidentes."
  },
  "recent": {
    "title": "Recientes",
    "empty": "No hay memorias guardadas aún."
  },
  "setup": {
    "title": "Ejecútalo en local",
    "body": "EverOS es un servicio Python respaldado por Postgres y Milvus. Levántalo con Docker Compose y el runner basado en uv.",
    "healthCheck": "Verifica que esté en marcha:"
  },
  "error": {
    "searchFailed": "Búsqueda fallida.",
    "recentFailed": "No se pudieron listar las memorias recientes."
  }
};
