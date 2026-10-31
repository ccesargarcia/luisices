const HIDDEN_FIELDS = new Set([
  'id', 'uid', 'userId', 'createdBy', 'assignedTo', 'version', 'expectedVersion', 'idempotencyKey',
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

  if (toolName === 'get_order_edit_form' && result?.order) {
    const order = result.order;
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.map((item) => {
      const storedUnitPrice = Number(item.unitPrice);
      const quantity = Number(item.quantity) || 1;
      const subtotal = Number(item.price);
      const subtotalCents = Math.round(subtotal * 100);
      const recoveredUnitPrice = storedUnitPrice === 0 && subtotal > 0
        && Math.abs(subtotal * 100 - subtotalCents) <= 0.001 && subtotalCents % quantity === 0
        ? (subtotalCents / quantity) / 100
        : null;
      const unitPrice = Number.isFinite(storedUnitPrice) && storedUnitPrice > 0
        ? storedUnitPrice
        : (recoveredUnitPrice ?? (Number.isFinite(storedUnitPrice) ? storedUnitPrice : 0));
      return `• ${item.name || 'Produto'} — ${quantity} ${quantity === 1 ? 'unidade' : 'unidades'} × ${humanizeValue(unitPrice, 'unitPrice')}`;
    });
    return [
      `📝 Pedido ${order.orderNumber} — ${order.customerName || 'Cliente não informado'}`,
      'Você pode mudar uma ou várias destas informações; não precisa escolher apenas um campo:',
      ...(Array.isArray(result.editableOptions) ? result.editableOptions.map((option) => `• ${option}`) : []),
      ...(itemLines.length ? ['', 'Itens atuais:', ...itemLines] : []),
      '',
      `Telefone: ${order.customerPhone || 'não informado'} · Etapa: ${humanizeValue(order.status, 'status')}`,
      `Total atual: ${humanizeValue(order.totalPrice, 'totalPrice')} · Quantidade: ${order.quantity}`,
      `Prazo: ${order.deliveryDate ? humanizeValue(order.deliveryDate, 'deliveryDate') : 'não informado'} · Tema: ${order.theme || 'não informado'}`,
      `Observações: ${order.notes || 'nenhuma'}`,
      'Pagamentos registrados serão preservados. Vou mostrar todas as mudanças para você conferir antes de salvar.',
    ].join('\n');
  }

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

  if (toolName === 'calculate_pricing_estimate' || toolName === 'calculate_artisan_pricing') {
    return [
      '🏷️ Sugestão de Precificação',
      result.suggestedUnitPrice != null && `Preço unitário: ${humanizeValue(result.suggestedUnitPrice, 'suggestedUnitPrice')}`,
      result.suggestedTotalPrice != null && `Preço total: ${humanizeValue(result.suggestedTotalPrice, 'suggestedTotalPrice')}`,
      result.unitCost != null && `Custo unitário: ${humanizeValue(result.unitCost, 'unitCost')}`,
      (result.profitMarginPercent != null || result.margin != null) && `Margem de lucro: ${humanizeValue(result.profitMarginPercent ?? result.margin, 'margin')}`,
    ].filter(Boolean).join('\n');
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
    add_order_item: '✅ Item adicionado ao pedido',
    update_order_status: '✅ Etapa do pedido atualizada',
    register_order_payment: '✅ Pagamento registrado',
    create_customer: '✅ Cliente cadastrado',
    update_customer: '✅ Cliente atualizado',
    create_quote: '✅ Orçamento criado',
    update_quote_status: '✅ Orçamento atualizado',
    save_pricing_model: '✅ Modelo de precificação salvo',
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
    ['supplies', 'insumos', 'insumo', (item) => [item.name, item.unit && `Un: ${item.unit}`, item.unitCost != null && `Custo: ${humanizeValue(item.unitCost, 'unitCost')}`, item.stockQuantity != null && `Estoque: ${item.stockQuantity}`].filter(Boolean).join(' · ')],
    ['models', 'modelos de precificação', 'modelo', (item) => [item.name || item.title, item.category, item.suggestedPrice != null && humanizeValue(item.suggestedPrice, 'suggestedPrice')].filter(Boolean).join(' · ')],
    ['products', 'produtos da vitrine', 'produto', (item) => [item.name || item.title, item.price != null && humanizeValue(item.price, 'totalPrice'), item.category].filter(Boolean).join(' · ')],
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
  const detail = String(error?.message || '').toLocaleLowerCase('pt-BR');

  if (error?.code === 'failed-precondition') {
    if (detail.includes('transição não permitida: pending para completed')) {
      return 'Este pedido ainda está pendente. Para concluí-lo, primeiro mova-o para Em produção.';
    }
    if (detail.includes('valor já recebido') || detail.includes('total já recebido')) {
      return 'O novo total não pode ser menor que o valor já pago. Confira o total do pedido e os pagamentos registrados.';
    }
    if (detail.includes('versão do pedido mudou') || detail.includes('pedido foi alterado durante a operação')) {
      return 'Este pedido foi atualizado enquanto você trabalhava nele. Vou consultar os dados atuais antes de tentar novamente.';
    }
    if (detail.includes('pedido mudou durante a operação')) {
      return 'Este pedido mudou desde a prévia. Vou consultar os dados atuais antes de tentar novamente.';
    }
    if (detail.includes('status atual do pedido não é reconhecido')) {
      return 'Não reconheci a etapa atual deste pedido. Nenhuma alteração foi feita; confira o pedido no Luisices.';
    }
    if (detail.includes('gravação segura indisponível')) {
      return 'Não foi possível salvar a alteração com segurança agora. Nenhuma mudança foi feita; tente novamente em instantes.';
    }
    return 'Não foi possível concluir essa ação com os dados atuais. Confira o pedido e tente novamente.';
  }

  const knownMessages = {
    unauthenticated: 'Sua conexão com o Luisices expirou. Entre novamente e tente outra vez.',
    'permission-denied': 'Você não tem acesso para fazer isso. Peça ao administrador do Luisices para liberar essa ação.',
    'invalid-argument': 'Não consegui usar os dados informados. Confira o pedido e os valores e tente novamente.',
    'not-found': 'Não encontrei esse pedido ou você não tem acesso a ele. Confira o número e tente novamente.',
    'already-exists': 'Essa ação já foi realizada ou há informações em conflito. Atualize o pedido antes de tentar novamente.',
  };
  if (knownMessages[error?.code]) return knownMessages[error.code];
  return 'Não consegui concluir agora. Tente novamente em instantes; se o problema continuar, peça ajuda ao suporte.';
}

module.exports = { formatToolResultText, publicErrorMessage };
