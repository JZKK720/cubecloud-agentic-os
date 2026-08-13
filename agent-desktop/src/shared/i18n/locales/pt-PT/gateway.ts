export default {
  title: "Gateway",
  messagingGateway: "Gateway de Mensagens",
  platforms: "Plataformas",
  status: "Estado",
  running: "Em execução",
  stopped: "Parado",
  gatewayHint: "Liga o Hermes ao Telegram, Discord, Slack e outras plataformas",
  kicker: "Plano de controlo pós-configuração",
  heroSummary:
    "Mantenha as credenciais do gateway locais no Hermes, ative apenas as pontes de plataforma necessárias e gira as mesmas faixas de runtime apresentadas durante o onboarding a partir de um único plano de controlo do ambiente de trabalho.",
  platformsHint:
    "O onboarding define o primeiro runtime e modelo. Este ecrã mantém o serviço do gateway e as entregas de plataforma alinhados depois.",
  supportedBridgesHint:
    "As pontes compatíveis permanecem desativadas até optar por ativá-las. Ative apenas os fornecedores e as faixas de mensagens que esta máquina deve expor.",
  platformsEnabled: "{{enabled}}/{{total}} plataformas ativadas",
  imChannels: {
    title: "Canais de IM",
    summary:
      "Ligue o agente a plataformas de IM empresariais. As mensagens dos clientes de IM são encaminhadas para o runtime ativo; as respostas são enviadas de volta à conversa.",
  },
  group: {
    messaging: "Mensagens",
    eastern: "Plataformas asiáticas",
    async: "Canais assíncronos",
    home: "Domótica",
  },  runtimes: {
    title: "Runtimes",
    summary:
      "O mesmo registo de runtimes que aparece no ecrã de boas-vindas. Cada linha mostra se o runtime está pronto nesta máquina.",
    registryLabel: "Registo de runtimes",
    refreshAria: "Voltar a analisar o registo de runtimes",
    empty: "Ainda não há runtimes instalados. O ecrã de boas-vindas instala o Hermes por omissão.",
    statusReady: "Runtime pronto para alojar o gateway.",
    statusUnavailable: "Runtime ainda não disponível nesta máquina.",
    detected: "Detetado",
    responded: "Respondeu",
    scanning: "A analisar…",
    localProbesLabel: "Sondagens do gateway local",
    localProbesRefreshAria: "Sondar portas do gateway local",
    localProbesEmpty:
      "Nenhum gateway local respondeu. Volte ao ecrã de boas-vindas para instalar ou ligar.",
    discoveryHint:
      "Este runtime expõe uma superfície de descoberta que pode ser chamada a partir do ecrã de boas-vindas.",
  },
  container: {
    title: "Descoberta de contentores",
    summary:
      "Analisa o Docker Desktop à procura de runtimes emparelhados (IronClaw, OpenClaw e qualquer fornecedor com gateway Docker).",
    sharedHint:
      "O mesmo registo do ecrã de boas-vindas. Analise novamente aqui depois de iniciar ou parar um contentor.",
    statusLabel: "Estado da análise Docker",
    refreshAria: "Voltar a analisar os runtimes do Docker Desktop",
    rescan: "Re-analisar",
    empty:
      "Não foram detetados runtimes em Docker. Instale o Docker Desktop ou inicie um contentor emparelhado.",
    scannedAt: "Última análise {{value}}",
  },} as const;
