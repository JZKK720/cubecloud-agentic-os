export default {
  "eyebrow": "Memória",
  "title": "EverOS",
  "summary": "EverOS é uma plataforma de memória de longo prazo apoiada por um servidor EverCore auto-hospedado. Aponte o shell para o URL base do seu EverOS para recordar o que o utilizador disse em sessões anteriores.",
  "notWired": {
    "title": "Not wired",
    "body": "EverOS integration is being added. The backend spec is already implemented in main; this screen will light up once the preload bridge is finalised.",
    "addHarness": "Add harness (coming soon)"
  },
  "health": {
    "title": "Servidor",
    "reachable": "Acessível",
    "unreachable": "Inacessível",
    "probing": "A verificar…",
    "scannedAt": "Última verificação"
  },
  "config": {
    "title": "Ligação",
    "body": "O EverOS corre em http://localhost:1995 por defeito. O shell aponta para o URL base configurado sempre que o utilizador pede memória de longo prazo.",
    "baseUrl": "URL base",
    "apiKey": "Chave de API",
    "userId": "ID do utilizador",
    "groupId": "ID do grupo",
    "topK": "Top K",
    "method": "Método de recuperação",
    "save": "Guardar",
    "edit": "Configurar",
    "cancel": "Fechar"
  },
  "add": {
    "title": "Lembrar",
    "body": "Anote um facto que o agente deve guardar. É guardado no utilizador/grupo configurado.",
    "placeholder": "ex. O utilizador prefere modo escuro e respostas curtas.",
    "cta": "Guardar",
    "sending": "A guardar…",
    "success": "{{count}} memória(s) guardada(s).",
    "failed": "Falha ao guardar: {{error}}"
  },
  "search": {
    "title": "Recordar",
    "body": "Pesquisa híbrida sobre a memória episódica do utilizador.",
    "placeholder": "O que prefere o utilizador?",
    "cta": "Procurar",
    "searching": "A procurar…",
    "empty": "Ainda sem memórias correspondentes."
  },
  "recent": {
    "title": "Recentes",
    "empty": "Nenhuma memória guardada ainda."
  },
  "setup": {
    "title": "Executar localmente",
    "body": "O EverOS é um serviço Python apoiado em Postgres + Milvus. Levante com Docker Compose e o runner baseado em uv.",
    "healthCheck": "Verifique se está em execução:"
  },
  "error": {
    "searchFailed": "Pesquisa falhou.",
    "recentFailed": "Não foi possível listar memórias recentes."
  }
};
