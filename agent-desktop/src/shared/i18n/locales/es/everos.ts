export default {
  "eyebrow": "Memoria",
  "title": "EverOS",
  "summary": "EverOS es una plataforma de memoria a largo plazo respaldada por un servidor EverCore auto-hospedado. Apunta el shell a tu URL base de EverOS para recordar lo que el usuario ha dicho en sesiones anteriores.",
  "notWired": {
    "title": "Sin conectar",
    "body": "La integración de EverOS se está añadiendo. La especificación del backend ya está implementada en main; esta pantalla se activará cuando el puente preload esté finalizado.",
    "addHarness": "Add harness (coming soon)"
  },
  "scope": {
    "label": "Alcance",
    "hint": "Esta consola lee y escribe únicamente el ámbito de app agentic-os en EverOS. Otros ámbitos (workspace, otras apps) no se tocan nunca."
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
    "body": "EverOS se ejecuta por defecto en http://localhost:8000. El shell apuntará a la URL base configurada cada vez que el usuario pida memoria a largo plazo.",
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
  },
  "sidecar": {
    "title": "Sidecar local",
    "body": "EverOS no se está ejecutando en {{baseUrl}}. Inicia el sidecar para mantener la memoria en esta máquina.",
    "reason": "Motivo",
    "lastError": "Último error",
    "pid": "PID",
    "port": "Puerto",
    "crashCount": "Caídas",
    "uptime": "Tiempo de actividad",
    "start": "Iniciar sidecar",
    "stop": "Detener sidecar",
    "restart": "Reiniciar",
    "refreshLogs": "Actualizar registros",
    "logsSummary": "Registros ({{count}} líneas)",
    "clearLogs": "Borrar registros"
  },
  "windowsNote": {
    "title": "Nota de Windows",
    "body": "El EverOS local administrado aún puede requerir WSL o un host remoto en Windows. Si el sidecar local no arranca, sigue usando esta pantalla contra una URL base de EverOS alojada en WSL o remota."
  }
};
