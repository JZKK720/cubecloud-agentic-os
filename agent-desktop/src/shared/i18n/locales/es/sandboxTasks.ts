// Source-of-truth Sandbox Tasks screen strings (Spanish).

export default {
  title: "Tareas de sandbox",
  subtitle:
    "Envía tareas al gateway de sandbox WASM de IronClaw. Las llamadas a herramientas se ejecutan en contenedores sandbox aislados.",
  gatewayUrl: "URL del gateway de IronClaw",
  bearerToken: "Token Bearer (opcional)",
  connect: "Conectar",
  probing: "Sondeando...",
  connected: "Conectado",
  notConnected: "No conectado",
  model: "Modelo",
  contextFolder: "Carpeta de contexto (opcional)",
  taskDescription: "Describe la tarea",
  sendToSandbox: "Enviar al sandbox",
  dispatching: "Enviando...",
  completed: "Completada",
  failed: "Fallida",
  reply: "Respuesta",
  toolCalls: "Llamadas a herramientas (sandbox WASM)",
  tokenRequiredHint:
    "El gateway está accesible. Añade un token de gateway y vuelve a conectar para cargar los modelos.",
} as const;
