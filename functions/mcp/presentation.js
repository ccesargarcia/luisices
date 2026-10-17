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

function formatToolResultText(toolName, result) {
  if (toolName === 'get_order_form' && result?.formMarkdown) return result.formMarkdown;

  if (toolName === 'daily_briefing') {
    return [
      '📌 Resumo do dia',
      result.todayDate && `Data: ${humanizeValue(result.todayDate, 'todayDate')}`,
      `Atrasadas: ${result.delayedCount ?? 0} · Entregas hoje: ${result.todayDeliveriesCount ?? 0}`,
      `Em produção: ${result.inProgressCount ?? 0} · Concluídos: ${result.completedCount ?? 0}`,
      result.pendingPaymentTotal != null && `A receber: ${humanizeValue(result.pendingPaymentTotal, 'pendingPaymentTotal')}`,
    ].filter(Boolean).join('\n');
  }

  if (toolName === 'get_financial_summary') {
    return [
      `💰 Resumo financeiro${result.periodLabel ? ` · ${result.periodLabel}` : ''}`,
      result.faturamentoRealizado != null && `Faturamento: ${humanizeValue(result.faturamentoRealizado, 'faturamentoRealizado')}`,
      result.totalPendenteReceber != null && `A receber: ${humanizeValue(result.totalPendenteReceber, 'totalPendenteReceber')}`,
      result.ticketMedio != null && `Ticket médio: ${humanizeValue(result.ticketMedio, 'ticketMedio')}`,
      result.pedidosCriadosNoPeriodo != null && `Pedidos: ${result.pedidosCriadosNoPeriodo} · Concluídos: ${result.pedidosConcluidos ?? 0}`,
    ].filter(Boolean).join('\n');
  }

  if (toolName === 'generate_whatsapp_message' && (result?.messageText || result?.text)) {
    return `💬 Mensagem pronta para revisar:\n${result.messageText || result.text}`;
  }

  const preview = result?.preview || {};
  if (result?.requiresConfirmation || result?.status === 'preview') {
    const changes = preview.changes && typeof preview.changes === 'object'
      ? Object.entries(preview.changes).filter(([key]) => !isHiddenField(key)).slice(0, 4).map(([key, value]) => `${humanizeKey(key)}: ${humanizeValue(value, key)}`)
      : [];
    const summary = [
      preview.orderNumber && `Pedido ${preview.orderNumber}`,
      preview.customerName && `Cliente: ${preview.customerName}`,
      preview.productName && `Produto: ${preview.productName}`,
      preview.quantity && `Quantidade: ${preview.quantity}`,
      preview.totalPrice != null && `Total: ${humanizeValue(preview.totalPrice, 'totalPrice')}`,
      preview.deliveryDate && `Entrega: ${humanizeValue(preview.deliveryDate, 'deliveryDate')}`,
      preview.toStatus && `Nova etapa: ${humanizeValue(preview.toStatus, 'status')}`,
      ...changes,
    ].filter(Boolean);
    return `📝 Prévia pronta para revisar.\n${summary.join('\n')}\nAguardando sua confirmação para salvar.`;
  }

  const completionLabels = {
    create_order: '✅ Pedido registrado',
    update_order: '✅ Pedido atualizado',
    update_order_status: '✅ Etapa do pedido atualizada',
    register_order_payment: '✅ Pagamento registrado',
    create_customer: '✅ Cliente cadastrado',
    create_quote: '✅ Orçamento criado',
    update_quote_status: '✅ Orçamento atualizado',
  };
  if (result?.success === true && completionLabels[toolName]) {
    const completed = completionLabels[toolName];
    const details = [
      result.orderNumber && `Pedido ${result.orderNumber}`,
      result.customerName && `Cliente: ${result.customerName}`,
      result.productName && `Produto: ${result.productName}`,
      result.totalPrice != null && `Total: ${humanizeValue(result.totalPrice, 'totalPrice')}`,
      result.message && String(result.message).slice(0, 240),
    ].filter(Boolean);
    return [completed, ...details].join('\n');
  }

  const listFields = [
    ['orders', 'pedidos', 'pedido', (item) => [item.orderNumber, item.customerName, item.productName || item.productSummary, item.deliveryDate && humanizeValue(item.deliveryDate, 'deliveryDate'), item.status && humanizeValue(item.status, 'status')].filter(Boolean).join(' · ')],
    ['customers', 'clientes', 'cliente', (item) => [item.name, item.phone, item.city].filter(Boolean).join(' · ')],
    ['items', 'itens', toolName === 'search_gallery_portfolio' ? 'arte' : 'item', (item) => [item.title || item.name || item.orderNumber, item.category, ...(Array.isArray(item.tags) ? item.tags.slice(0, 2) : [])].filter(Boolean).join(' · ')],
    ['deliveries', 'entregas', 'entrega', (item) => [item.orderNumber, item.customerName, item.productName, item.deliveryDate && humanizeValue(item.deliveryDate, 'deliveryDate')].filter(Boolean).join(' · ')],
    ['quotes', 'orçamentos', 'orçamento', (item) => [item.quoteNumber, item.customerName, item.title, item.totalPrice != null && humanizeValue(item.totalPrice, 'totalPrice')].filter(Boolean).join(' · ')],
  ];
  for (const [field, label, singular, describe] of listFields) {
    const items = result?.[field];
    if (Array.isArray(items)) {
      const total = result.totalFound ?? result.totalFiltered ?? result.totalScoped ?? result.totalCount ?? items.length;
      const examples = items.slice(0, 3).map((item) => describe(item)).filter(Boolean);
      const countLabel = total === 1 ? `1 ${singular} encontrado` : `${total} ${label} encontrados`;
      const more = items.length > 3 ? `E mais ${items.length - 3} nesta página.` : result.hasMore ? 'Há mais resultados disponíveis.' : '';
      return [`🔎 ${countLabel}.`, ...examples.map((item) => `• ${item}`), more].filter(Boolean).join('\n');
    }
  }

  const details = [
    result?.orderNumber && `Pedido ${result.orderNumber}`,
    result?.customerName && `Cliente: ${result.customerName}`,
    result?.totalFound != null && `${result.totalFound} resultados encontrados`,
    result?.totalPrice != null && `Total: ${humanizeValue(result.totalPrice, 'totalPrice')}`,
    result?.pendingPaymentTotal != null && `Pendente: ${humanizeValue(result.pendingPaymentTotal, 'pendingPaymentTotal')}`,
    result?.message && String(result.message).slice(0, 240),
  ].filter(Boolean);
  return details.length ? `✅ Consulta concluída.\n${details.join('\n')}` : '✅ Consulta concluída. Os dados detalhados estão disponíveis para responder à sua solicitação.';
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
