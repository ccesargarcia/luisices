const HIDDEN_FIELDS = new Set([
  'id', 'uid', 'userId', 'createdBy', 'assignedTo', 'version', 'expectedVersion',
  'selectionDateField', 'paymentDateBasis', 'mcpScopes', 'rawData', 'debug',
  'traceId', 'requestId', 'modelId', 'recipeId', 'cacheKey', 'token',
]);

const LABELS = {
  orderNumber: 'Pedido', customerName: 'Cliente', customerPhone: 'Telefone',
  productName: 'Produto', productSummary: 'Produto', quantity: 'Quantidade',
  status: 'Situação', paymentStatus: 'Pagamento', deliveryDate: 'Entrega',
  createdAt: 'Criado em', updatedAt: 'Atualizado em', totalPrice: 'Valor total',
  paidAmount: 'Valor pago', remainingAmount: 'Valor restante', totalSpent: 'Total comprado',
  totalFound: 'Resultados encontrados', hasMore: 'Há mais resultados',
  todayDate: 'Data', delayedCount: 'Entregas atrasadas', todayDeliveriesCount: 'Entregas de hoje',
  inProgressCount: 'Em produção', completedCount: 'Concluídos', pendingCount: 'Pendentes',
  pendingPaymentCount: 'Pagamentos pendentes', pendingPaymentTotal: 'Total pendente',
  realizedRevenue: 'Faturamento realizado', totalReceived: 'Total recebido',
  periodLabel: 'Período', intervaloDatas: 'Intervalo', inicio: 'Início', fim: 'Fim',
  period: 'Período',
  criterioFiltro: 'Critério usado', paymentScopeNotice: 'Observação sobre pagamentos',
  faturamentoRealizado: 'Faturamento realizado', volumeTotalEmitido: 'Valor total dos pedidos',
  totalPendenteReceber: 'Total a receber', ticketMedio: 'Valor médio por pedido',
  taxaConversao: 'Taxa de conclusão', pedidosCriadosNoPeriodo: 'Pedidos no período',
  pedidosConcluidos: 'Pedidos concluídos', pedidosEmProducao: 'Pedidos em produção',
  pedidosPendentes: 'Pedidos pendentes', pedidosCancelados: 'Pedidos cancelados',
  totalPedidosValidos: 'Pedidos ativos', delayedOrders: 'Pedidos atrasados',
  todayDeliveries: 'Entregas de hoje', orders: 'Pedidos', customers: 'Clientes',
  name: 'Nome', phone: 'Telefone', email: 'E-mail', address: 'Endereço',
  message: 'Mensagem', text: 'Texto', notes: 'Observações', description: 'Descrição',
  success: 'Concluído', confirmed: 'Confirmado', requiresReview: 'Precisa de conferência',
  suggestedTotalPrice: 'Preço sugerido total', suggestedUnitPrice: 'Preço sugerido por unidade',
  unitCost: 'Custo por unidade', assumptions: 'Pontos para conferir',
  preparationStatus: 'Preparação',
};

const STATUS_LABELS = {
  pending: 'Pendente', 'in-progress': 'Em produção', completed: 'Concluído',
  cancelled: 'Cancelado', paid: 'Pago', partial: 'Parcialmente pago', unpaid: 'Não pago',
  overdue: 'Atrasado', draft_prepared: 'Rascunho preparado',
  received: 'Recebido', in_contact: 'Em contato',
};
const CURRENCY_FIELDS = new Set([
  'totalPrice', 'paidAmount', 'remainingAmount', 'totalSpent', 'pendingPaymentTotal',
  'realizedRevenue', 'totalReceived', 'faturamentoRealizado', 'volumeTotalEmitido',
  'totalPendenteReceber', 'ticketMedio', 'averageTicket', 'suggestedTotalPrice',
  'suggestedUnitPrice', 'unitCost', 'grossIssuedVolume', 'pendingReceivables',
]);

function isHiddenField(key) {
  return HIDDEN_FIELDS.has(key) || /(?:^|_)(?:id|uid|token|version)$/i.test(key) || /(?:Id|Uid|Token|Version)$/.test(key);
}

function humanizeKey(key) {
  if (LABELS[key]) return LABELS[key];
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function humanizeValue(value, key) {
  if (value == null || value === '') return 'Não informado';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'string') {
    if (key === 'status' || key === 'paymentStatus' || key === 'preparationStatus') return STATUS_LABELS[value] || value;
    if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
      if (Number.isFinite(date.getTime())) return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', ...(!dateOnly ? { timeStyle: 'short' } : {}), timeZone: dateOnly ? 'UTC' : 'America/Sao_Paulo' }).format(date);
    }
    return value;
  }
  if (typeof value === 'number') {
    if (CURRENCY_FIELDS.has(key) || /(?:Price|Amount|Revenue|Spent|Cost|Faturamento|Receber)$/i.test(key)) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }
    if (/percent|rate|taxa|margin|conversion/i.test(key)) return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  return value;
}

function renderFields(value, depth = 0) {
  if (Array.isArray(value)) {
    if (!value.length) return 'Nenhum registro encontrado.';
    return value.map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const fields = Object.entries(item).filter(([key, fieldValue]) => !isHiddenField(key) && fieldValue != null && fieldValue !== '');
        return `${'  '.repeat(depth)}${index + 1}. ${fields.map(([key, fieldValue]) => `${humanizeKey(key)}: ${fieldValue && typeof fieldValue === 'object' ? renderFields(fieldValue, depth + 1) : humanizeValue(fieldValue, key)}`).join(' · ')}`;
      }
      return `${'  '.repeat(depth)}${index + 1}. ${humanizeValue(item, '')}`;
    }).join('\n');
  }
  if (value && typeof value === 'object') {
    const fields = Object.entries(value).filter(([key, fieldValue]) => !isHiddenField(key) && fieldValue !== undefined);
    return fields.map(([key, fieldValue]) => {
      const label = humanizeKey(key);
      if (Array.isArray(fieldValue)) return `${label} (${fieldValue.length}):\n${renderFields(fieldValue, depth + 1)}`;
      if (fieldValue && typeof fieldValue === 'object') return `${label}:\n${renderFields(fieldValue, depth + 1)}`;
      return `${label}: ${humanizeValue(fieldValue, key)}`;
    }).join('\n');
  }
  return humanizeValue(value, '');
}

function formatToolResultText(toolName, result) {
  const body = renderFields(result);
  const headers = {
    query_orders_view: 'Aqui está o resultado da consulta de pedidos:',
    daily_briefing: 'Resumo do dia:',
    query_customers: 'Aqui estão os clientes encontrados:',
    get_customer_history: 'Histórico do cliente:',
    query_delivery_schedule: 'Agenda de entregas:',
    get_financial_summary: 'Resumo financeiro:',
    create_order: 'Pedido:', create_customer: 'Cliente:', create_quote: 'Orçamento:',
    update_order: 'Atualização do pedido:', update_order_status: 'Atualização do pedido:',
    update_quote_status: 'Atualização do orçamento:', register_order_payment: 'Pagamento:',
    calculate_pricing_estimate: 'Estimativa de preço:', calculate_artisan_pricing: 'Sugestão de preço:',
    generate_whatsapp_message: 'Mensagem preparada:',
  };
  return `${headers[toolName] || 'Resultado:'}\n${body || 'Operação concluída.'}`;
}

function publicErrorMessage(error) {
  const knownMessages = {
    unauthenticated: 'Sua sessão não foi reconhecida. Conecte sua conta novamente e tente outra vez.',
    'permission-denied': 'Seu perfil não tem permissão para esta ação. Peça acesso a um administrador.',
    'invalid-argument': 'Alguma informação precisa de ajuste. Confira os campos, valores e datas e tente novamente.',
    'not-found': 'Não encontrei esse registro ou você não tem acesso a ele. Confira os dados e tente novamente.',
    'failed-precondition': 'Os dados atuais não permitem concluir esta ação. Atualize as informações e tente novamente.',
    'already-exists': 'Esta ação já foi realizada ou os dados entram em conflito. Atualize as informações antes de tentar novamente.',
  };
  if (knownMessages[error?.code]) return knownMessages[error.code];
  return 'Não consegui concluir agora. Tente novamente em instantes; se o problema continuar, peça ajuda ao suporte.';
}

module.exports = { formatToolResultText, publicErrorMessage };
