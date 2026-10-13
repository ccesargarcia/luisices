/**
 * Definições de Escopos, Ferramentas e Configurações de Segurança do MCP / ChatGPT - Luisices.
 */

const MCP_SCOPES = {
  ORDERS_READ: {
    id: 'orders:read',
    label: 'Consultar Pedidos & Prazos',
    description: 'Permite consultar a fila de produção, pedidos do dia e status de encomendas.',
    module: 'Pedidos & Produção',
    requiresAdmin: false,
    defaultGranted: true,
  },
  ORDERS_DRAFT: {
    id: 'orders:draft',
    label: 'Criar Rascunhos de Encomendas',
    description: 'Permite extrair dados do cliente e montar rascunhos de pedidos a partir de conversas.',
    module: 'Pedidos & Produção',
    requiresAdmin: false,
    defaultGranted: false,
  },
  ORDERS_CREATE: {
    id: 'orders:create',
    label: 'Criar Pedidos no Sistema',
    description: 'Permite registrar novos pedidos diretamente na fila de produção do ateliê.',
    module: 'Pedidos & Produção',
    requiresAdmin: false,
    defaultGranted: true,
  },
  CUSTOMERS_READ: {
    id: 'customers:read',
    label: 'Consultar Clientes & Contatos',
    description: 'Permite buscar histórico e telefones de clientes para atendimento.',
    module: 'Clientes',
    requiresAdmin: false,
    defaultGranted: true,
  },
  FINANCIAL_READ: {
    id: 'financial:read',
    label: 'Relatórios Financeiros & DRE',
    description: 'Acesso a faturamento realizado, ticket médio e valores a receber.',
    module: 'Financeiro (Sensível)',
    requiresAdmin: true,
    defaultGranted: false,
  },
  TEAM_READ: {
    id: 'team:read',
    label: 'Auditoria & Desempenho da Equipe',
    description: 'Permite auditar pedidos e produtividade de outros colaboradores.',
    module: 'Equipe (Sensível)',
    requiresAdmin: true,
    defaultGranted: false,
  },
  PRICING_ESTIMATE: {
    id: 'pricing:estimate',
    label: 'Calculadora de Precificação',
    description: 'Permite calcular sugestões de preço, insumos e margem de lucro.',
    module: 'Precificação & Orçamentos',
    requiresAdmin: false,
    defaultGranted: true,
  },
  WHATSAPP_COMPOSE: {
    id: 'whatsapp:compose',
    label: 'Gerador de Mensagens WhatsApp',
    description: 'Prepara mensagens para envio (cobrança de saldo, pedido pronto ou aviso).',
    module: 'Atendimento WhatsApp',
    requiresAdmin: false,
    defaultGranted: true,
  },
  GALLERY_READ: {
    id: 'gallery:read',
    label: 'Consultar Portfólio / Acervo',
    description: 'Permite buscar fotos e modelos da galeria de produtos.',
    module: 'Galeria & Portfólio',
    requiresAdmin: false,
    defaultGranted: true,
  },
};

const TOOL_SCOPE_MAP = {
  query_orders_view: 'orders:read',
  daily_briefing: 'orders:read',
  extract_order_draft: 'orders:draft',
  get_order_form: 'orders:draft',
  create_order: 'orders:create',
  query_customers: 'customers:read',
  get_financial_summary: 'financial:read',
  get_user_summary: 'team:read',
  calculate_pricing_estimate: 'pricing:estimate',
  generate_whatsapp_message: 'whatsapp:compose',
  search_gallery_portfolio: 'gallery:read',
};

const COLLECTIONS = {
  SETTINGS: 'integrationSettings',
  SETTINGS_DOC_MCP: 'mcp',
  KEYS: 'mcpApiKeys',
  USERS: 'userProfiles',
};

const CACHE_TTL_MS = {
  KEY: 15 * 1000, // 15 segundos de cache em memória para rajadas de chamadas consecutivas
  SETTINGS: 15 * 1000, // 15 segundos para configurações globais
};

const DEFAULT_RATE_LIMIT_PER_HOUR = 60;

module.exports = {
  MCP_SCOPES,
  TOOL_SCOPE_MAP,
  COLLECTIONS,
  CACHE_TTL_MS,
  DEFAULT_RATE_LIMIT_PER_HOUR,
};
