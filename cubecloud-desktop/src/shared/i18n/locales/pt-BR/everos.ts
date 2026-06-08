export default {
  "eyebrow": "Memória",
  "title": "EverOS",
  "summary": "EverOS é uma plataforma de memória de longo prazo apoiada por um servidor EverCore auto-hospedado. Aponte o shell para a URL base do seu EverOS para lembrar o que o usuário disse em sessões anteriores.",
  "notWired": {
    "title": "Not wired",
    "body": "EverOS integration is being added. The backend spec is already implemented in main; this screen will light up once the preload bridge is finalised.",
    "addHarness": "Add harness (coming soon)"
  },
  "health": {
    "title": "Backend",
    "reachable": "Acessível",
    "unreachable": "Inacessível",
    "probing": "Verificando…",
    "scannedAt": "Última verificação"
  },
  "config": {
    "title": "Conexão",
    "body": "O EverOS roda em http://localhost:1995 por padrão. O shell aponta para a URL base configurada sempre que o usuário pede memória de longo prazo.",
    "baseUrl": "URL base",
    "apiKey": "Chave de API",
    "userId": "ID do usuário",
    "groupId": "ID do grupo",
    "topK": "Top K",
    "method": "Método de recuperação",
    "save": "Salvar",
    "edit": "Configurar",
    "cancel": "Fechar"
  },
  "add": {
    "title": "Lembrar",
    "body": "Anote um fato que o agente deve guardar. É salvo no usuário/grupo configurado.",
    "placeholder": "ex. O usuário prefere modo escuro e respostas curtas.",
    "cta": "Salvar",
    "sending": "Salvando…",
    "success": "{{count}} memória(s) salva(s).",
    "failed": "Falha ao salvar: {{error}}"
  },
  "search": {
    "title": "Relembrar",
    "body": "Busca híbrida sobre a memória episódica do usuário.",
    "placeholder": "O que o usuário prefere?",
    "cta": "Buscar",
    "searching": "Buscando…",
    "empty": "Ainda sem memórias correspondentes."
  },
  "recent": {
    "title": "Recentes",
    "empty": "Nenhuma memória salva ainda."
  },
  "setup": {
    "title": "Execute localmente",
    "body": "O EverOS é um serviço Python apoiado em Postgres + Milvus. Levante com Docker Compose e o runner baseado em uv.",
    "healthCheck": "Verifique se está no ar:"
  },
  "error": {
    "searchFailed": "Busca falhou.",
    "recentFailed": "Não foi possível listar memórias recentes."
  }
};
