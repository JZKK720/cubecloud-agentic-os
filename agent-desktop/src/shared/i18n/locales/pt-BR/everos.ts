export default {
  "eyebrow": "Memória",
  "title": "EverOS",
  "summary": "EverOS é uma plataforma de memória de longo prazo apoiada por um servidor EverCore auto-hospedado. Aponte o shell para a URL base do seu EverOS para lembrar o que o usuário disse em sessões anteriores.",
  "notWired": {
    "title": "Não conectado",
    "body": "A integração com o EverOS está sendo adicionada. A especificação do backend já está implementada na main; esta tela ficará ativa quando a ponte preload for finalizada.",
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
    "body": "O EverOS roda em http://localhost:8000 por padrão. O shell aponta para a URL base configurada sempre que o usuário pede memória de longo prazo.",
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
  },
  "sidecar": {
    "title": "Sidecar local",
    "body": "O EverOS não está em execução em {{baseUrl}}. Inicie o sidecar para manter a memória nesta máquina.",
    "reason": "Motivo",
    "lastError": "Último erro",
    "pid": "PID",
    "port": "Porta",
    "crashCount": "Falhas",
    "uptime": "Tempo ativo",
    "start": "Iniciar sidecar",
    "stop": "Parar sidecar",
    "restart": "Reiniciar",
    "refreshLogs": "Atualizar logs",
    "logsSummary": "Logs ({{count}} linhas)",
    "clearLogs": "Limpar logs"
  },
  "windowsNote": {
    "title": "Nota do Windows",
    "body": "O EverOS local gerenciado ainda pode exigir WSL ou um host remoto no Windows. Se o sidecar local não iniciar, continue usando esta tela com um EverOS hospedado no WSL ou em um host remoto."
  }
};
