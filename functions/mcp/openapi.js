/**
 * Gerador Dinâmico da Especificação OpenAPI 3.1.0 para Plugins ChatGPT e Clientes MCP.
 */

const { TOOL_SCOPE_MAP, MCP_SCOPES } = require('./constants');

/**
 * Definição padronizada de cada ferramenta com schemas de entrada e saída.
 */
const TOOLS_METADATA = [
  {
    name: 'query_orders_view',
    scope: 'orders:read',
    summary: 'Consultar Fila de Pedidos & Produção',
    description: 'Consulta pedidos por status (em_producao, pendente, concluido, entregue), termo de busca ou data de entrega.',
    requestBody: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['todos', 'pendente', 'em_producao', 'concluido', 'entregue', 'atrasado'],
          description: 'Filtro por status do pedido. Padrão: todos.',
        },
        searchTerm: {
          type: 'string',
          description: 'Busca por nome do cliente, número do pedido ou resumo do produto.',
        },
        startDate: {
          type: 'string',
          description: 'Data inicial no formato AAAA-MM-DD.',
        },
        endDate: {
          type: 'string',
          description: 'Data final no formato AAAA-MM-DD.',
        },
        limit: {
          type: 'integer',
          description: 'Quantidade máxima de pedidos retornados (máximo 20). Padrão: 15.',
          default: 15,
        },
      },
    },
  },
  {
    name: 'daily_briefing',
    scope: 'orders:read',
    summary: 'Raio-X Operacional do Dia',
    description: 'Retorna entregas previstas para hoje, pedidos em atraso, contagem em produção e pagamentos pendentes.',
    requestBody: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'Data de referência (AAAA-MM-DD). Se omitida, utiliza a data de hoje.',
        },
      },
    },
  },
  {
    name: 'query_customers',
    scope: 'customers:read',
    summary: 'Consultar Clientes & Contatos',
    description: 'Pesquisa clientes na base por nome, telefone WhatsApp, cidade ou responsável.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Nome, número de telefone ou cidade do cliente.',
        },
        limit: {
          type: 'integer',
          description: 'Limite de clientes a retornar (máximo 15).',
          default: 10,
        },
      },
    },
  },
  {
    name: 'get_financial_summary',
    scope: 'financial:read',
    summary: 'Resumo Financeiro & Faturamento',
    description: 'Retorna métricas de faturamento realizado, total recebido, valores pendentes e ticket médio no período.',
    requestBody: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Período desejado: "hoje", "esta_semana", "mes" (padrão), "mes_anterior", "ano", ou mês específico como "setembro".',
          default: 'mes',
        },
        userIdentifier: {
          type: 'string',
          description: 'Filtrar por colaborador específico (apenas administradores).',
        },
      },
    },
  },
  {
    name: 'calculate_pricing_estimate',
    scope: 'pricing:estimate',
    summary: 'Calculadora de Precificação & Custos',
    description: 'Calcula estimativa de preço de venda, custo unitário e margem de lucro com base em materiais e tempo de produção.',
    requestBody: {
      type: 'object',
      required: ['productName', 'quantity'],
      properties: {
        productName: {
          type: 'string',
          description: 'Nome ou tipo do produto (ex: "Caixa Cartonada 15x15", "Convite Luxo").',
        },
        quantity: {
          type: 'integer',
          description: 'Quantidade de peças desejadas.',
        },
        materialsCost: {
          type: 'number',
          description: 'Custo total estimado dos materiais/papéis.',
        },
        laborHours: {
          type: 'number',
          description: 'Horas estimadas de trabalho e máquina.',
        },
        targetMarginPercent: {
          type: 'number',
          description: 'Margem de lucro desejada em porcentagem (ex: 45 para 45%).',
        },
      },
    },
  },
  {
    name: 'generate_whatsapp_message',
    scope: 'whatsapp:compose',
    summary: 'Gerar Rascunho de Mensagem WhatsApp',
    description: 'Monta texto de mensagem personalizado para enviar ao cliente (cobrança de saldo, pedido pronto ou confirmação).',
    requestBody: {
      type: 'object',
      required: ['recipientName'],
      properties: {
        recipientName: {
          type: 'string',
          description: 'Nome do cliente.',
        },
        recipientPhone: {
          type: 'string',
          description: 'Telefone/WhatsApp do cliente.',
        },
        orderNumber: {
          type: 'string',
          description: 'Número do pedido.',
        },
        messageType: {
          type: 'string',
          enum: ['cobranca_saldo', 'pedido_pronto', 'confirmacao_pedido', 'lembrete_geral'],
          description: 'Tipo de mensagem.',
        },
        customText: {
          type: 'string',
          description: 'Observações específicas a incluir no texto.',
        },
      },
    },
  },
  {
    name: 'get_order_form',
    scope: 'orders:draft',
    summary: 'Obter Formulário Estruturado de Pedido',
    description: 'Retorna o modelo de formulário padronizado em Markdown para coleta guiada dos dados do cliente e do pedido de papelaria personalizada.',
    requestBody: {
      type: 'object',
      properties: {
        customerName: {
          type: 'string',
          description: 'Nome do cliente se já informado.',
        },
        productCategory: {
          type: 'string',
          description: 'Categoria opcional do produto (ex: "caixas_milk", "festa_infantil", "convites", "corporativo").',
        },
      },
    },
  },
  {
    name: 'extract_order_draft',
    scope: 'orders:draft',
    summary: 'Montar Rascunho de Pedido',
    description: 'Extrai dados informados por cliente em conversa e estrutura um rascunho de pedido para conferência. Para efetivar e registrar o pedido no sistema, execute a ação create_order.',
    requestBody: {
      type: 'object',
      required: ['customerName', 'productSummary'],
      properties: {
        customerName: {
          type: 'string',
          description: 'Nome do cliente.',
        },
        customerPhone: {
          type: 'string',
          description: 'Telefone do cliente.',
        },
        productSummary: {
          type: 'string',
          description: 'Descrição dos itens encomendados.',
        },
        quantity: {
          type: 'integer',
          description: 'Quantidade.',
        },
        totalPrice: {
          type: 'number',
          description: 'Valor total acertado.',
        },
        deliveryDate: {
          type: 'string',
          description: 'Data prometida de entrega (AAAA-MM-DD).',
        },
        theme: {
          type: 'string',
          description: 'Tema ou paleta de cores.',
        },
        notes: {
          type: 'string',
          description: 'Observações de acabamento.',
        },
      },
    },
  },
  {
    name: 'create_order',
    scope: 'orders:create',
    summary: 'Criar e Registrar Novo Pedido no Sistema',
    description: 'Cria e grava um novo pedido oficial na fila de produção do Ateliê Luisices. Gera número sequencial (#AAAA-0001), vincula o cliente, calcula o saldo pendente e define o status como pendente com a tag "ChatGPT".',
    requestBody: {
      type: 'object',
      required: ['customerName', 'productName', 'quantity', 'totalPrice', 'deliveryDate'],
      properties: {
        customerName: {
          type: 'string',
          description: 'Nome completo ou primeiro nome do cliente.',
        },
        customerPhone: {
          type: 'string',
          description: 'Telefone ou WhatsApp do cliente para contato.',
        },
        productName: {
          type: 'string',
          description: 'Nome e descrição do produto encomendado (ex: "30 Caixas Milk Personalizadas", "Topo de Bolo").',
        },
        quantity: {
          type: 'integer',
          description: 'Quantidade encomendada (mínimo 1).',
          minimum: 1,
        },
        totalPrice: {
          type: 'number',
          description: 'Valor total do pedido em reais (ex: 210.00).',
          minimum: 0,
        },
        paidAmount: {
          type: 'number',
          description: 'Valor de entrada ou sinal já pago pelo cliente (ex: 100.00). Padrão: 0.',
          default: 0,
        },
        paymentMethod: {
          type: 'string',
          enum: ['pix', 'cartao_credito', 'cartao_debito', 'dinheiro', 'transferencia', 'outro'],
          description: 'Forma de pagamento utilizada pelo cliente.',
        },
        deliveryDate: {
          type: 'string',
          description: 'Data limite prometida para entrega no formato AAAA-MM-DD (ou DD/MM/AAAA).',
        },
        theme: {
          type: 'string',
          description: 'Tema da festa ou personalização (ex: "Safari Baby", "Jardim Encantado").',
        },
        notes: {
          type: 'string',
          description: 'Observações de produção, personalização ou instruções especiais.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags adicionais para organizar o pedido (a tag "ChatGPT" é adicionada automaticamente).',
        },
        idempotencyKey: {
          type: 'string',
          description: 'Chave única de idempotência opcional para evitar duplicação em caso de reexecução de chamada.',
        },
      },
    },
  },
  {
    name: 'search_gallery_portfolio',
    scope: 'gallery:read',
    summary: 'Consultar Portfólio / Acervo',
    description: 'Pesquisa itens e fotos produzidos no acervo do ateliê.',
    requestBody: {
      type: 'object',
      properties: {
        searchTerm: {
          type: 'string',
          description: 'Termo de busca (tema, tipo de peça ou técnica).',
        },
        limit: {
          type: 'integer',
          description: 'Quantidade máxima (padrão 8).',
          default: 8,
        },
      },
    },
  },
  {
    name: 'get_user_summary',
    scope: 'team:read',
    summary: 'Auditar Desempenho da Equipe',
    description: 'Consulta pedidos e produtividade de um colaborador específico (restrito a administradores).',
    requestBody: {
      type: 'object',
      required: ['userIdentifier'],
      properties: {
        userIdentifier: {
          type: 'string',
          description: 'Nome, email ou identificador do colaborador.',
        },
      },
    },
  },
];

/**
 * Gera a especificação OpenAPI 3.1.0 dinâmica.
 * @param {string} baseUrl - URL base da Cloud Function
 * @param {string[]} [allowedScopes] - Se informado, filtra apenas as ferramentas autorizadas para a chave
 */
function buildOpenApiSchema(baseUrl, allowedScopes = null) {
  const paths = {};

  // Filtra as ferramentas se houver lista de escopos permitidos
  const filteredTools = TOOLS_METADATA.filter((tool) => {
    if (!allowedScopes) return true;
    if (allowedScopes.includes('*')) return true;
    return allowedScopes.includes(tool.scope);
  });

  filteredTools.forEach((tool) => {
    paths[`/tools/${tool.name}`] = {
      post: {
        operationId: tool.name,
        summary: tool.summary,
        description: `${tool.description} (Escopo necessário: ${tool.scope})`,
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: Boolean(tool.requestBody && Array.isArray(tool.requestBody.required) && tool.requestBody.required.length > 0),
          content: {
            'application/json': {
              schema: tool.requestBody,
            },
          },
        },
        responses: {
          '200': {
            description: 'Operação executada com sucesso.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    tool: { type: 'string' },
                    timestamp: { type: 'string' },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Parâmetros inválidos.',
          },
          '401': {
            description: 'Não autenticado ou chave inválida.',
          },
          '403': {
            description: 'Permissão negada para esta ferramenta ou chave desativada.',
          },
          '429': {
            description: 'Limite de requisições excedido.',
          },
          '500': {
            description: 'Erro interno ao processar operação.',
          },
        },
      },
    };
  });

  return {
    openapi: '3.0.3',
    info: {
      title: 'Luisices - Copiloto de Ateliê (ChatGPT & MCP Tools)',
      description: 'API de ferramentas de negócio para consulta de pedidos, clientes, precificação e orçamentos do ateliê Luisices.',
      version: '1.0.0',
    },
    servers: [
      {
        url: baseUrl,
        description: 'Servidor de Ferramentas Luisices',
      },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    paths,
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key (lui_...)',
          description: 'Chave de acesso gerada no painel de configurações do Luisices (lui_dev_... ou lui_live_...).',
        },
      },
    },
  };
}

module.exports = {
  TOOLS_METADATA,
  buildOpenApiSchema,
};
