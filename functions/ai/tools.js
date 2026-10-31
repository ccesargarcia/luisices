/**
 * Execução Segura e Validada das Ferramentas de Negócio do Copiloto - Luisices
 */

const { BUSINESS_TIMEZONE, TOOL_LIMITS } = require('./config');
const { calculateRecipePricing, calculateHourlyRate, DEFAULT_PRICING_SETTINGS } = require('./pricing/pricingCalculator');
const { sanitizeCollaboratorInfo, filterOrdersByScope } = require('./authorization');
const { resolvePaymentAmounts, sumPaymentCents } = require('./financialMath');

function getBusinessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function normalizeMcpTimestamp(value) {
  if (!value) return '';
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && Number.isFinite(value._seconds)) return new Date(value._seconds * 1000).toISOString();
  return String(value);
}

function isValidDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isConfirmed(value) {
  return value === true || value === 'true';
}

function getStoredItemUnitPrice(item) {
  const unitPrice = Number(item?.unitPrice);
  if (Number.isFinite(unitPrice) && unitPrice > 0) return unitPrice;

  const quantity = Number(item?.quantity);
  const subtotal = Number(item?.price);
  if (unitPrice === 0 && Number.isSafeInteger(quantity) && quantity > 0
    && Number.isFinite(subtotal) && subtotal > 0) {
    const subtotalCents = Math.round(subtotal * 100);
    if (Math.abs(subtotal * 100 - subtotalCents) <= 0.001 && subtotalCents % quantity === 0) {
      return (subtotalCents / quantity) / 100;
    }
  }
  return Number.isFinite(unitPrice) ? unitPrice : 0;
}

/**
 * Calcula intervalos de data no fuso do negócio (America/Sao_Paulo - UTC-3)
 */
/**
 * Calcula intervalos de data no fuso do negócio (America/Sao_Paulo - UTC-3) com suporte a meses específicos e rótulos
 */
function getPeriodInterval(period = 'month', baseDate = new Date()) {
  const d = new Date(baseDate);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const getPart = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  const currentYear = getPart('year');
  const currentMonth = getPart('month'); // 1-12
  const currentDay = getPart('day');

  const spOffset = '-03:00';
  const pad = (n) => String(n).padStart(2, '0');
  const formatBr = (date) => {
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: BUSINESS_TIMEZONE }).format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  };

  const MONTH_NAMES_PT = {
    janeiro: 1, jan: 1,
    fevereiro: 2, fev: 2,
    marco: 3, março: 3, mar: 3,
    abril: 4, abr: 4,
    maio: 5, mai: 5,
    junho: 6, jun: 6,
    julho: 7, jul: 7,
    agosto: 8, ago: 8,
    setembro: 9, set: 9,
    outubro: 10, out: 10,
    novembro: 11, nov: 11,
    dezembro: 12, dez: 12,
  };

  const cleanPeriod = String(period || 'month').toLowerCase().trim();

  // 1. Checa se é um mês específico por nome ou chave (ex: "setembro", "setembro 2026", "2026-09", "09/2026")
  let targetYear = currentYear;
  let targetMonth = null;

  const yyyyMmMatch = cleanPeriod.match(/^(\d{4})[-/](\d{1,2})$/);
  const mmYyyyMatch = cleanPeriod.match(/^(\d{1,2})[-/](\d{4})$/);

  if (yyyyMmMatch) {
    targetYear = Number(yyyyMmMatch[1]);
    targetMonth = Number(yyyyMmMatch[2]);
  } else if (mmYyyyMatch) {
    targetMonth = Number(mmYyyyMatch[1]);
    targetYear = Number(mmYyyyMatch[2]);
  } else {
    for (const [mName, mNum] of Object.entries(MONTH_NAMES_PT)) {
      if (cleanPeriod.includes(mName)) {
        targetMonth = mNum;
        const yearInStr = cleanPeriod.match(/\b(20\d{2})\b/);
        if (yearInStr) targetYear = Number(yearInStr[1]);
        break;
      }
    }
  }

  if (targetMonth && targetMonth >= 1 && targetMonth <= 12) {
    const isCurrentMonthAndYear = targetYear === currentYear && targetMonth === currentMonth;
    const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
    const start = new Date(`${targetYear}-${pad(targetMonth)}-01T00:00:00.000${spOffset}`);
    const end = isCurrentMonthAndYear
      ? d
      : new Date(`${targetYear}-${pad(targetMonth)}-${pad(lastDayOfMonth)}T23:59:59.999${spOffset}`);
    
    const monthNameCapitalized = Object.keys(MONTH_NAMES_PT).find((k) => MONTH_NAMES_PT[k] === targetMonth && k.length > 3) || `Mês ${targetMonth}`;
    const formattedName = monthNameCapitalized.charAt(0).toUpperCase() + monthNameCapitalized.slice(1);

    return {
      startDate: start,
      endDate: end,
      periodLabel: `${formattedName} de ${targetYear} (${formatBr(start)} a ${formatBr(end)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(end),
      targetMonth,
      targetYear,
    };
  }

  if (cleanPeriod === 'today' || cleanPeriod === 'hoje') {
    const start = new Date(`${currentYear}-${pad(currentMonth)}-${pad(currentDay)}T00:00:00.000${spOffset}`);
    const end = new Date(`${currentYear}-${pad(currentMonth)}-${pad(currentDay)}T23:59:59.999${spOffset}`);
    return {
      startDate: start,
      endDate: end,
      periodLabel: `Hoje (${formatBr(start)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(end),
    };
  }

  if (cleanPeriod === 'yesterday' || cleanPeriod === 'ontem') {
    const yestDate = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    const yParts = formatter.formatToParts(yestDate);
    const yYear = Number(yParts.find((p) => p.type === 'year')?.value || currentYear);
    const yMonth = Number(yParts.find((p) => p.type === 'month')?.value || currentMonth);
    const yDay = Number(yParts.find((p) => p.type === 'day')?.value || currentDay);

    const start = new Date(`${yYear}-${pad(yMonth)}-${pad(yDay)}T00:00:00.000${spOffset}`);
    const end = new Date(`${yYear}-${pad(yMonth)}-${pad(yDay)}T23:59:59.999${spOffset}`);
    return {
      startDate: start,
      endDate: end,
      periodLabel: `Ontem (${formatBr(start)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(end),
    };
  }

  if (cleanPeriod === 'week' || cleanPeriod === 'semana' || cleanPeriod === 'esta_semana' || cleanPeriod === 'ultimos_7_dias') {
    const start = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: start,
      endDate: d,
      periodLabel: `Últimos 7 dias (${formatBr(start)} a ${formatBr(d)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(d),
    };
  }

  if (cleanPeriod === 'last_month' || cleanPeriod === 'previous_month' || cleanPeriod === 'mes_passado' || cleanPeriod === 'mes_anterior') {
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const lastDayOfPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
    const start = new Date(`${prevYear}-${pad(prevMonth)}-01T00:00:00.000${spOffset}`);
    const end = new Date(`${prevYear}-${pad(prevMonth)}-${pad(lastDayOfPrevMonth)}T23:59:59.999${spOffset}`);
    return {
      startDate: start,
      endDate: end,
      periodLabel: `Mês Anterior (${formatBr(start)} a ${formatBr(end)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(end),
    };
  }

  if (cleanPeriod === 'month' || cleanPeriod === 'mes' || cleanPeriod === 'este_mes' || cleanPeriod === 'mes_atual') {
    const start = new Date(`${currentYear}-${pad(currentMonth)}-01T00:00:00.000${spOffset}`);
    return {
      startDate: start,
      endDate: d,
      periodLabel: `Mês Atual (${formatBr(start)} a ${formatBr(d)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(d),
    };
  }

  if (cleanPeriod === 'year' || cleanPeriod === 'ano' || cleanPeriod === 'este_ano') {
    const start = new Date(`${currentYear}-01-01T00:00:00.000${spOffset}`);
    return {
      startDate: start,
      endDate: d,
      periodLabel: `Ano ${currentYear} (${formatBr(start)} a ${formatBr(d)})`,
      startFormatted: formatBr(start),
      endFormatted: formatBr(d),
    };
  }

  // 'all' / 'todos'
  const startAll = new Date('2020-01-01T00:00:00.000Z');
  return {
    startDate: startAll,
    endDate: new Date('2100-01-01T00:00:00.000Z'),
    periodLabel: 'Todo o Histórico',
    startFormatted: 'Início do sistema',
    endFormatted: formatBr(d),
  };
}

/**
 * Normaliza número de telefone para formato WhatsApp
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? digits : `55${digits}`;
}

/**
 * Validação rigorosa de prazos de entrega no fuso horário do negócio (America/Sao_Paulo)
 */
function validateAndNormalizeDeliveryDate(rawDateString) {
  let rawDate = String(rawDateString || '').trim();
  if (!rawDate) {
    throw new Error('Data de entrega é obrigatória para registrar o pedido.');
  }

  // Normaliza DD/MM/AAAA ou DD-MM-AAAA para AAAA-MM-DD
  const brMatch = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    rawDate = `${year}-${month}-${day}`;
  }

  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    throw new Error(`Formato de data de entrega inválido ("${rawDateString}"). Utilize o formato AAAA-MM-DD ou DD/MM/AAAA.`);
  }

  // Obter a data de hoje no fuso horário do negócio
  const todayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const getP = (type) => todayParts.find((p) => p.type === type)?.value || '00';
  const todayStr = `${getP('year')}-${getP('month')}-${getP('day')}`;

  if (rawDate < todayStr) {
    throw new Error(
      `Data de entrega inválida (${rawDate}). A data de entrega não pode ser anterior à data de hoje (${todayStr} no horário de Brasília).`
    );
  }

  const isToday = rawDate === todayStr;
  const deliveryTime = new Date(`${rawDate}T12:00:00-03:00`).getTime();
  const todayTime = new Date(`${todayStr}T12:00:00-03:00`).getTime();
  const diffDays = Math.round((deliveryTime - todayTime) / (24 * 60 * 60 * 1000));
  const isUrgent = diffDays <= 1;

  return {
    deliveryDate: rawDate,
    todayStr,
    isToday,
    diffDays,
    isUrgent,
  };
}

function requireMcpModulePermission(scope, module, action, label) {
  if (!scope?.uid) {
    const error = new Error('Usuário não autenticado.');
    error.code = 'unauthenticated';
    throw error;
  }
  const permission = scope.permissions?.[module];
  const allowed = scope.isAdmin || permission === true || (permission && typeof permission === 'object' && permission[action] === true);
  if (!allowed) {
    const error = new Error(`Você não possui permissão para ${label}.`);
    error.code = 'permission-denied';
    throw error;
  }
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizePaymentMethod(value) {
  const aliases = {
    pix: 'pix',
    dinheiro: 'cash', cash: 'cash',
    cartao_credito: 'credit', credito: 'credit', credit: 'credit',
    cartao_debito: 'debit', debito: 'debit', debit: 'debit',
    transferencia: 'transfer', transfer: 'transfer',
  };
  return aliases[String(value || '').trim().toLowerCase()] || null;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function getMcpIdempotencyContext(db, scope, toolName, key, args) {
  const idempotencyKey = typeof key === 'string' ? key.trim() : '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    const error = new Error('Informe uma chave de idempotência válida com 8 a 128 caracteres.');
    error.code = 'invalid-argument';
    throw error;
  }
  const crypto = require('crypto');
  const operationId = crypto.createHash('sha256').update(`${scope.uid}:${toolName}:${idempotencyKey}`).digest('hex');
  const payload = { ...args };
  delete payload.idempotencyKey;
  const payloadHash = crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex');
  return { ref: db.collection('mcpIdempotency').doc(operationId), payloadHash };
}

function readIdempotentResult(snapshot, payloadHash) {
  if (!snapshot.exists) return null;
  const previous = snapshot.data() || {};
  if (previous.payloadHash !== payloadHash) {
    const error = new Error('Esta chave de idempotência já foi usada com outros dados. Gere uma nova chave para uma operação diferente.');
    error.code = 'already-exists';
    throw error;
  }
  if (!previous.completed || !previous.result) {
    const error = new Error('Esta operação ainda está sendo processada. Repita a chamada com a mesma chave em alguns instantes.');
    error.code = 'failed-precondition';
    throw error;
  }
  return previous.result;
}

class AiToolsExecutor {
  constructor(repositories) {
    this.repos = repositories;
  }

  /**
   * Resolução de telefone de cliente com tratamento de homônimos (R09)
   */
  async resolveCustomerIdentity(customerName, existingPhone, scope) {
    const phone = normalizePhone(existingPhone);
    // Telefone explícito já identifica o destinatário declarado do rascunho.
    if (phone.length >= 12 || !customerName || typeof customerName !== 'string') return { phone, ambiguous: false };
    const clean = customerName.trim().toLowerCase();
    const result = await this.repos.getScopedCustomers(scope, { searchTerm: clean });
    const matches = result.customers || [];
    const exact = matches.filter((customer) => String(customer.name || '').toLowerCase().trim() === clean);
    let candidates = exact.length ? exact : matches;
    if (phone) candidates = candidates.filter((customer) => normalizePhone(customer.phone) === phone);
    const ambiguous = candidates.length > 1 || Boolean(result.hasMore);
    return { phone: ambiguous ? '' : phone || normalizePhone(candidates[0]?.phone), ambiguous };
  }

  async resolveCustomerPhone(customerName, existingPhone, scope) {
    return (await this.resolveCustomerIdentity(customerName, existingPhone, scope)).phone;
  }

  /**
   * Ferramenta 1: Resumo Financeiro Exato (IA-02 & R13)
   */
  async executeFinancialSummary(args = {}, scope) {
    const validatedArgs = typeof args === 'object' && args !== null ? args : { period: String(args || 'month') };
    const period = validatedArgs.period || 'month';

    let orders = await this.repos.getScopedOrders(scope, { skipCache: true });

    // Filtro por colaborador específico (apenas admin pode auditar outro colaborador)
    if (scope.isAdmin && validatedArgs.userIdentifier) {
      const term = String(validatedArgs.userIdentifier).trim().toLowerCase();
      const team = await this.repos.getTeamMembers();
      let target = team.find(
        (m) =>
          m.name.toLowerCase().includes(term) ||
          m.email.toLowerCase().includes(term) ||
          m.uid.toLowerCase() === term ||
          term.includes(m.email.toLowerCase()) ||
          (m.email && term.includes(m.email.toLowerCase().split('@')[0]))
      );

      if (!target) {
        const matchingOrder = orders.find(
          (o) =>
            (o.userId && o.userId.toLowerCase() === term) ||
            (o.createdBy && o.createdBy.toLowerCase() === term) ||
            (o.assignedTo && o.assignedTo.toLowerCase() === term) ||
            (o.createdByName && o.createdByName.toLowerCase().includes(term)) ||
            (o.assignedToName && o.assignedToName.toLowerCase().includes(term))
        );
        if (matchingOrder) {
          const uid = matchingOrder.userId || matchingOrder.createdBy || matchingOrder.assignedTo;
          target = {
            uid,
            name: matchingOrder.createdByName || matchingOrder.assignedToName || term,
            email: term.includes('@') ? term : '',
          };
        }
      }

      if (target) {
        const uid = String(target.uid);
        orders = orders.filter((o) => o.userId === uid || o.createdBy === uid || o.assignedTo === uid);
      } else {
        return {
          period,
          userIdentifier: validatedArgs.userIdentifier,
          collaboratorNotFound: true,
          faturamentoRealizado: 0,
          volumeTotalEmitido: 0,
          totalRecebido: 0,
          totalPendenteReceber: 0,
          ticketMedio: 0,
          taxaConversao: 0,
          pedidosConcluidos: 0,
          pedidosEmProducao: 0,
          pedidosPendentes: 0,
          pedidosCancelados: 0,
          totalPedidosValidos: 0,
        };
      }
    }

    const interval = getPeriodInterval(period);
    const { startDate, endDate } = interval;

    const filtered = orders.filter((o) => {
      if (o.isDeleted) return false;
      if (period === 'all') return true;
      const orderDate = new Date(o.createdAt || NaN);
      return orderDate >= startDate && orderDate <= endDate;
    });

    const validOrders = filtered.filter((o) => o.status !== 'cancelled');
    const completedOrders = filtered.filter((o) => o.status === 'completed');
    const inProgressOrders = filtered.filter((o) => o.status === 'in-progress');
    const pendingOrders = filtered.filter((o) => o.status === 'pending');
    const cancelledOrders = filtered.filter((o) => o.status === 'cancelled');

    const realizedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const grossIssuedVolume = validOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalReceived = sumPaymentCents(validOrders, 'paidCents') / 100;
    const pendingReceivables = sumPaymentCents(validOrders, 'remainingCents') / 100;

    const averageTicket = completedOrders.length > 0
      ? realizedRevenue / completedOrders.length
      : validOrders.length > 0
        ? grossIssuedVolume / validOrders.length
        : 0;

    const conversionRate = validOrders.length > 0 ? (completedOrders.length / validOrders.length) * 100 : 0;

    return {
      period,
      periodLabel: interval.periodLabel,
      intervaloDatas: {
        inicio: interval.startFormatted,
        fim: interval.endFormatted,
      },
      criterioFiltro: period === 'all' ? 'Todo o histórico, sem filtro de datas' : 'Data de criação do pedido (createdAt); sem data válida excluído do intervalo',
      selectionDateField: period === 'all' ? null : 'createdAt',
      paymentDateBasis: 'not_available',
      paymentScopeNotice: 'Pagamentos acumulados nos pedidos selecionados, inclusive registrados depois do período. Esta consulta não apura entradas de caixa por data de recebimento.',
      excludedMissingCreationDate: period === 'all' ? 0 : orders.filter((o) => !o.isDeleted && !Number.isFinite(new Date(o.createdAt || NaN).getTime())).length,
      faturamentoRealizado: Number(realizedRevenue.toFixed(2)),
      volumeTotalEmitido: Number(grossIssuedVolume.toFixed(2)),
      totalRecebido: Number(totalReceived.toFixed(2)),
      totalPendenteReceber: Number(pendingReceivables.toFixed(2)),
      ticketMedio: Number(averageTicket.toFixed(2)),
      taxaConversao: Number(conversionRate.toFixed(1)),
      pedidosCriadosNoPeriodo: filtered.length,
      pedidosConcluidos: completedOrders.length,
      pedidosEmProducao: inProgressOrders.length,
      pedidosPendentes: pendingOrders.length,
      pedidosCancelados: cancelledOrders.length,
      totalPedidosValidos: validOrders.length,
    };
  }

  /**
   * Ferramenta 2: Daily Briefing
   */
  async executeDailyBriefing(args, scope) {
    const orders = (await this.repos.getScopedOrders(scope, { skipCache: true })).filter((o) => !o.isDeleted);
    const todayDate = args?.date ? String(args.date).trim() : getBusinessDate();
    if (!isValidDateOnly(todayDate)) {
      const error = new Error('A data de referência deve usar o formato AAAA-MM-DD.');
      error.code = 'invalid-argument';
      throw error;
    }

    const delayedOrders = orders.filter(
      (o) =>
        o.deliveryDate &&
        o.deliveryDate < todayDate &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
    );
    const todayDeliveries = orders.filter((o) => o.deliveryDate === todayDate && o.status !== 'cancelled');
    const inProgressOrders = orders.filter((o) => o.status === 'in-progress');
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const validOrders = orders.filter((o) => o.status !== 'cancelled');

    const pendingPaymentOrders = validOrders.filter((order) => resolvePaymentAmounts(order).remainingCents > 0);
    const pendingPaymentTotal = sumPaymentCents(validOrders, 'remainingCents') / 100;
    const realizedRevenue = completedOrders.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
    const totalReceived = sumPaymentCents(validOrders, 'paidCents') / 100;

    return {
      todayDate,
      delayedCount: delayedOrders.length,
      delayedOrders: delayedOrders.slice(0, 5),
      todayDeliveriesCount: todayDeliveries.length,
      todayDeliveries: todayDeliveries.slice(0, 5),
      inProgressCount: inProgressOrders.length,
      completedCount: completedOrders.length,
      pendingPaymentCount: pendingPaymentOrders.length,
      pendingPaymentTotal: Number(pendingPaymentTotal.toFixed(2)),
      realizedRevenue: Number(realizedRevenue.toFixed(2)),
      totalReceived: Number(totalReceived.toFixed(2)),
    };
  }

  /**
   * Ferramenta 3: Consulta de Pedidos com Filtro e Paginação
   */
  async executeQueryOrdersView(args = {}, scope) {
    const limit = Math.min(Math.max(Number(args.limit) || TOOL_LIMITS.ORDERS_PAGE_LIMIT, 1), 50);
    // Otimização de performance: busca apenas a janela necessária no Firestore
    const hasStatusFilter = args.status && !['all', 'todos'].includes(String(args.status).toLowerCase().trim());
    const hasHistoryFilter = Boolean(args.searchTerm || args.startDate || args.endDate || hasStatusFilter);
    const searchTerm = String(args.searchTerm || '').trim();
    const exactOrderNumber = /^#[A-Za-z0-9][A-Za-z0-9-]*$/.test(searchTerm) && !args.startDate && !args.endDate;
    const maxLimit = hasHistoryFilter ? 5000 : Math.max(limit * 2, 50);
    let orders;
    if (exactOrderNumber && typeof this.repos.getScopedOrderSummary === 'function') {
      const order = await this.repos.getScopedOrderSummary(scope, searchTerm);
      orders = order ? [order] : [];
    } else {
      orders = await this.repos.getScopedOrders(scope, { maxLimit, allowPartial: !hasHistoryFilter, skipCache: true });
    }
    let filtered = orders;

    const statusAliases = {
      all: 'all',
      todos: 'all',
      pending: 'pending',
      pendente: 'pending',
      'in-progress': 'in-progress',
      in_progress: 'in-progress',
      em_producao: 'in-progress',
      'em produção': 'in-progress',
      'em producao': 'in-progress',
      completed: 'completed',
      concluido: 'completed',
      concluído: 'completed',
      entregue: 'completed',
      delivered: 'completed',
      cancelled: 'cancelled',
      canceled: 'cancelled',
      cancelado: 'cancelled',
      cancelada: 'cancelled',
      atrasado: 'overdue',
    };
    const requestedStatus = args.status == null ? 'all' : statusAliases[String(args.status).toLowerCase().trim()];
    if (!requestedStatus) {
      const error = new Error('Status inválido para consulta de pedidos.');
      error.code = 'invalid-argument';
      throw error;
    }
    if (requestedStatus === 'overdue') {
      const today = getBusinessDate();
      filtered = filtered.filter((o) => o.deliveryDate && o.deliveryDate < today && !['completed', 'cancelled'].includes(o.status));
    } else if (requestedStatus !== 'all') {
      filtered = filtered.filter((o) => o.status === requestedStatus);
    }

    const startDate = args.startDate ? String(args.startDate).trim() : '';
    const endDate = args.endDate ? String(args.endDate).trim() : '';
    if ((startDate && !isValidDateOnly(startDate)) || (endDate && !isValidDateOnly(endDate))) {
      const error = new Error('As datas devem usar o formato AAAA-MM-DD.');
      error.code = 'invalid-argument';
      throw error;
    }
    if (startDate) filtered = filtered.filter((o) => o.deliveryDate && o.deliveryDate >= startDate);
    if (endDate) filtered = filtered.filter((o) => o.deliveryDate && o.deliveryDate <= endDate);
    if (args.searchTerm) {
      const term = String(args.searchTerm).toLowerCase().trim();
      const phoneDigits = term.replace(/\D/g, '');
      filtered = filtered.filter((o) => {
        const numMatch = String(o.orderNumber || '').toLowerCase().includes(term);
        const nameMatch = String(o.customerName || '').toLowerCase().includes(term);
        const prodMatch = String(o.productName || o.productSummary || '').toLowerCase().includes(term);
        const phoneMatch = phoneDigits && String(o.customerPhone || '').replace(/\D/g, '').includes(phoneDigits);
        return numMatch || nameMatch || prodMatch || phoneMatch;
      });
    }

    return {
      orders: filtered.slice(0, limit),
      totalFound: filtered.length,
      hasMore: filtered.length > limit,
    };
  }

  /** Agenda limitada por janela e por propriedade do pedido para reduzir leituras. */
  async executeQueryDeliverySchedule(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'view', 'consultar a agenda de entregas');
    const startDate = String(args.startDate || '').trim();
    const endDate = String(args.endDate || '').trim();
    if (!isValidDateOnly(startDate) || !isValidDateOnly(endDate)) {
      const error = new Error('Informe as datas no formato AAAA-MM-DD.');
      error.code = 'invalid-argument';
      throw error;
    }
    const spanDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
    if (spanDays < 0 || spanDays > 30) {
      const error = new Error('O período deve ser válido e ter no máximo 31 dias.');
      error.code = 'invalid-argument';
      throw error;
    }
    const status = args.status || 'all';
    const limit = Math.min(Math.max(Number(args.limit) || 20, 1), 50);
    const db = this.repos.db;
    if (!db) throw new Error('Banco de dados indisponível.');
    const baseQuery = () => db.collection('orders').where('deliveryDate', '>=', startDate).where('deliveryDate', '<=', endDate).orderBy('deliveryDate', 'asc');
    const queryLimit = 100;
    let snapshots;
    if (scope.isAdmin) {
      snapshots = [await baseQuery().limit(queryLimit).get()];
    } else {
      snapshots = await Promise.all(['userId', 'assignedTo', 'createdBy'].map((field) =>
        baseQuery().where(field, '==', scope.uid).limit(queryLimit).get()
      ));
    }
    const docsById = new Map();
    snapshots.flatMap((snapshot) => snapshot.docs || []).forEach((doc) => docsById.set(doc.id, doc));
    const statusAliases = { pending: 'pending', pendente: 'pending', received: 'pending', recebido: 'pending', in_contact: 'pending', 'in-progress': 'in-progress', in_progress: 'in-progress', em_producao: 'in-progress', 'em produção': 'in-progress', 'em producao': 'in-progress', 'em-andamento': 'in-progress', em_andamento: 'in-progress', producao: 'in-progress', produção: 'in-progress', completed: 'completed', concluido: 'completed', concluído: 'completed', delivered: 'completed', entregue: 'completed', pronto: 'completed', finished: 'completed', cancelled: 'cancelled', canceled: 'cancelled', cancelado: 'cancelled', cancelada: 'cancelled' };
    const authorized = filterOrdersByScope(Array.from(docsById.values(), (doc) => ({ ...(doc.data() || {}), id: doc.id })), scope)
      .filter((order) => String(order.deliveryDate || '').slice(0, 10) >= startDate && String(order.deliveryDate || '').slice(0, 10) <= endDate)
      .filter((order) => status === 'all' || statusAliases[String(order.status || 'pending').toLowerCase().trim()] === status)
      .sort((a, b) => String(a.deliveryDate).localeCompare(String(b.deliveryDate)) || String(a.orderNumber).localeCompare(String(b.orderNumber)));
    const canReadPayments = scope.mcpScopes?.includes('payments:read') || scope.mcpScopes?.includes('financial:read');
    const orders = authorized.slice(0, limit).map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      productName: order.productName,
      quantity: order.quantity,
      deliveryDate: String(order.deliveryDate || '').slice(0, 10),
      status: statusAliases[String(order.status || 'pending').toLowerCase().trim()] || 'unknown',
      ...(canReadPayments ? { totalPrice: order.totalPrice, paidAmount: order.paidAmount, remainingAmount: order.remainingAmount } : {}),
    }));
    return {
      startDate,
      endDate,
      orders,
      totalFound: authorized.length,
      hasMore: authorized.length > limit || snapshots.some((snapshot) => (snapshot.docs || []).length === queryLimit),
    };
  }

  /** Histórico restrito ao cliente autorizado e aos pedidos visíveis ao usuário. */
  async executeGetCustomerHistory(args = {}, scope) {
    requireMcpModulePermission(scope, 'customers', 'view', 'consultar o histórico do cliente');
    const customer = await this.repos.getScopedCustomerDocument(scope, String(args.customerId || ''));
    if (!customer || customer.data.deletedAt || customer.data.isDeleted) {
      const error = new Error('Cliente não encontrado ou sem permissão para consultá-lo.');
      error.code = 'not-found';
      throw error;
    }
    const db = this.repos.db;
    const customerName = String(customer.data.name || customer.data.fullName || '').trim();
    const customerPhone = String(customer.data.phone || customer.data.whatsapp || '').replace(/\D/g, '');
    const canReadOrders = scope.isAdmin || scope.mcpScopes?.includes('orders:read');
    if (!canReadOrders) {
      return {
        customer: { id: customer.id, name: customerName, phone: customer.data.phone || customer.data.whatsapp || '', city: customer.data.city || '' },
        orders: [],
        totalFound: 0,
        hasMore: false,
        ordersPermissionRequired: 'orders:read',
      };
    }
    const queries = [db.collection('orders').where('customerId', '==', customer.id).limit(100).get()];
    // Compatibilidade com pedidos antigos sem customerId: fallback com nome e telefone exatos.
    if (customerName && customerPhone) {
      queries.push(db.collection('orders').where('customerName', '==', customerName).limit(100).get());
    }
    const snapshots = await Promise.all(queries);
    const unique = new Map();
    snapshots.flatMap((snapshot) => snapshot.docs || []).forEach((doc) => unique.set(doc.id, doc));
    const visible = filterOrdersByScope(Array.from(unique.values(), (doc) => ({ ...(doc.data() || {}), id: doc.id })), scope)
      .filter((order) => order.customerId === customer.id || (
        String(order.customerName || '').trim() === customerName &&
        (!customerPhone || String(order.customerPhone || '').replace(/\D/g, '') === customerPhone)
      ))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
    const canReadPayments = scope.mcpScopes?.includes('payments:read') || scope.mcpScopes?.includes('financial:read');
    return {
      customer: { id: customer.id, name: customerName, phone: customer.data.phone || customer.data.whatsapp || '', city: customer.data.city || '' },
      orders: visible.slice(0, limit).map((order) => ({
        orderNumber: order.orderNumber || order.id,
        productName: order.productName || order.productSummary || '',
        quantity: Number(order.quantity) || 1,
        deliveryDate: order.deliveryDate || null,
        status: order.status || 'pending',
        createdAt: normalizeMcpTimestamp(order.createdAt) || null,
        ...(canReadPayments ? {
          totalPrice: Number(order.price ?? order.totalPrice ?? order.payment?.totalAmount) || 0,
          paidAmount: Number(order.payment?.paidAmount ?? order.paidAmount) || 0,
          remainingAmount: Number(order.payment?.remainingAmount ?? order.remainingAmount) || 0,
        } : {}),
      })),
      totalFound: visible.length,
      hasMore: visible.length > limit || snapshots.some((snapshot) => (snapshot.docs || []).length === 100),
    };
  }

  /**
   * Ferramenta 4: Consulta de Clientes
   */
  async executeQueryCustomers(args = {}, scope) {
    let customersResult = await this.repos.getScopedCustomers(scope, args);

    // Se a busca tradicional retornou vazio ou se foi explicitado um colaborador (userIdentifier),
    // verifica se o termo de busca refere-se a um membro da equipe para listar os clientes atendidos por ele através dos pedidos!
    const userIdentifier = args.userIdentifier || args.searchTerm;
    if (userIdentifier && (customersResult.customers.length === 0 || args.userIdentifier)) {
      const term = String(userIdentifier).trim().toLowerCase();
      const team = await this.repos.getTeamMembers();
      const matchedMember = team.find((m) =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        m.uid.toLowerCase() === term ||
        term.includes(m.email.toLowerCase()) ||
        (m.email && term.includes(m.email.toLowerCase().split('@')[0]))
      );

      if (matchedMember || args.userIdentifier) {
        const uid = matchedMember ? String(matchedMember.uid) : term;
        const allOrders = await this.repos.getScopedOrders(scope, { skipCache: true });
        const collaboratorOrders = allOrders.filter((o) =>
          o.userId === uid ||
          o.createdBy === uid ||
          o.assignedTo === uid ||
          (o.createdByName && o.createdByName.toLowerCase().includes(term)) ||
          (o.assignedToName && o.assignedToName.toLowerCase().includes(term))
        );

        if (collaboratorOrders.length > 0) {
          const map = new Map();
          collaboratorOrders.forEach((o) => {
            const name = (o.customerName || '').trim();
            if (!name || name.toLowerCase() === 'cliente não informado') return;
            const key = name.toLowerCase();
            const existing = map.get(key) || {
              id: `cust-${key.replace(/[^a-z0-9]/g, '-')}`,
              name,
              phone: o.customerPhone || '',
              city: '',
              totalOrders: 0,
              totalSpent: 0,
              recentProducts: [],
              collaborator: matchedMember ? matchedMember.name : term,
            };
            existing.totalOrders += 1;
            existing.totalSpent += Number(o.totalPrice) || 0;
            if (!existing.phone && o.customerPhone) existing.phone = o.customerPhone;
            const pName = o.productSummary || o.productName;
            if (pName && !existing.recentProducts.includes(pName) && existing.recentProducts.length < 3) {
              existing.recentProducts.push(pName);
            }
            map.set(key, existing);
          });

          const derivedCustomers = Array.from(map.values())
            .sort((a, b) => b.totalOrders - a.totalOrders || b.totalSpent - a.totalSpent);

          if (derivedCustomers.length > 0) {
            const limit = Math.min(Math.max(Number(args.limit) || TOOL_LIMITS.CUSTOMERS_PAGE_LIMIT, 1), 50);
            return {
              customers: derivedCustomers.slice(0, limit),
              totalScoped: derivedCustomers.length,
              totalFiltered: derivedCustomers.length,
              isFiltered: true,
              hasMore: derivedCustomers.length > limit,
              collaboratorFound: matchedMember
                ? sanitizeCollaboratorInfo(matchedMember, scope)
                : { identifier: term },
            };
          }
        }
      }
    }

    return customersResult;
  }

  /**
   * Ferramenta 5: Estimativa de Precificação com Configurações Reais e Diluição de Setup (IA-04 & R08)
   */
  async executePricingEstimate(args = {}, scope) {
    // Ausência usa uma premissa identificada; valores presentes inválidos falham.
    const inputs = {};
    const labels = {
      quantity: 'Quantidade', rawMaterialsCost: 'Matéria-prima por unidade (R$)',
      customizationCost: 'Personalização por unidade (R$)', laborTimeMinutes: 'Montagem por unidade (min)',
      setupTimeMinutes: 'Setup do lote (min)', profitMarginPercent: 'Margem (%)',
      paymentFeePercent: 'Taxa de pagamento (%)', wasteMarginPercent: 'Perdas (%)',
      desiredSalary: 'Salário mensal (R$)', workingDaysPerMonth: 'Dias por mês', workingHoursPerDay: 'Horas por dia',
      defaultWasteMarginPercent: 'Perdas configuradas (%)', defaultPaymentFeePercent: 'Taxa configurada (%)', defaultProfitMarginPercent: 'Margem configurada (%)',
    };
    const invalid = (field) => {
      const error = new Error(`Valor inválido para ${field}: informe número finito não negativo dentro do intervalo permitido.`);
      error.code = 'invalid-argument';
      throw error;
    };
    const parse = (value, field, min = 0, max = Infinity) => {
      if ((typeof value !== 'number' && typeof value !== 'string') || value === null || (typeof value === 'string' && !value.trim())) invalid(field);
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) invalid(field);
      return number;
    };
    const loaded = this.repos && typeof this.repos.getPricingSettings === 'function' && scope
      ? await this.repos.getPricingSettings(scope) : null;
    const studioSettings = {};
    // Configurações inválidas não viram custo zero: substituição explícita por padrão.
    for (const [field, fallback] of Object.entries(DEFAULT_PRICING_SETTINGS)) {
      if (field === 'monthlyFixedExpenses') continue;
      const value = loaded?.[field];
      const numeric = typeof value === 'number' || (typeof value === 'string' && value.trim());
      const max = field === 'defaultProfitMarginPercent' ? 95 : Infinity;
      const valid = numeric && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max;
      studioSettings[field] = valid ? Number(value) : fallback;
      inputs[field] = { value: studioSettings[field], source: valid ? 'configuration' : 'default', label: labels[field] || field, invalidConfiguration: value !== undefined && !valid };
    }
    studioSettings.monthlyFixedExpenses = {};
    for (const [field, fallback] of Object.entries(DEFAULT_PRICING_SETTINGS.monthlyFixedExpenses)) {
      const value = loaded?.monthlyFixedExpenses?.[field];
      const valid = (typeof value === 'number' || (typeof value === 'string' && value.trim())) && Number.isFinite(Number(value)) && Number(value) >= 0;
      studioSettings.monthlyFixedExpenses[field] = valid ? Number(value) : fallback;
      inputs[`monthlyFixedExpenses.${field}`] = { value: studioSettings.monthlyFixedExpenses[field], source: valid ? 'configuration' : 'default', label: `Despesa fixa mensal: ${field} (R$)`, invalidConfiguration: value !== undefined && !valid };
    }
    if (args.hourlyRate !== undefined) {
      const requestedRate = parse(args.hourlyRate, 'hourlyRate', 0, 10000);
      const monthlyHours = Math.max(1, studioSettings.workingDaysPerMonth * studioSettings.workingHoursPerDay);
      const fixedPerHour = Object.values(studioSettings.monthlyFixedExpenses).reduce((sum, value) => sum + value, 0) / monthlyHours;
      // O valor informado substitui a parcela de salário; os custos fixos cadastrados continuam cobertos.
      studioSettings.desiredSalary = Math.max(0, (requestedRate - fixedPerHour) * monthlyHours);
      inputs.desiredSalary = {
        value: studioSettings.desiredSalary,
        source: 'argument',
        label: 'Salário mensal equivalente à hora informada (R$)',
      };
      inputs.hourlyRate = { value: Math.max(requestedRate, fixedPerHour), source: 'argument', label: 'Valor da hora solicitado (R$)', fixedCostFloor: fixedPerHour };
    }
    const read = (field, fallback, configField, min = 0, max = Infinity) => {
      const supplied = args[field] !== undefined;
      const value = supplied ? parse(args[field], field, min, max) : fallback;
      const source = supplied ? 'argument' : (configField ? inputs[configField].source : 'default');
      inputs[field] = { value, source, label: labels[field], ...(configField ? { configurationField: configField } : {}) };
      return value;
    };
    const qty = read('quantity', 1, null, 1, 100000);
    if (!Number.isSafeInteger(qty)) invalid('quantity');
    // Contrato legado: esses valores representam o lote inteiro; o motor calcula custo unitário.
    const batchMaterials = args.materialsCost !== undefined ? parse(args.materialsCost, 'materialsCost', 0, 10000000) / qty : undefined;
    const batchLaborMinutes = args.laborHours !== undefined ? parse(args.laborHours, 'laborHours', 0, 1000) * 60 / qty : undefined;
    const targetMargin = args.targetMarginPercent !== undefined ? parse(args.targetMarginPercent, 'targetMarginPercent', 0, 95) : undefined;
    if (batchMaterials !== undefined && args.rawMaterialsCost !== undefined && batchMaterials !== parse(args.rawMaterialsCost, 'rawMaterialsCost')) invalid('materialsCost/rawMaterialsCost (valores divergentes)');
    if (batchMaterials !== undefined && args.unitCostRaw !== undefined && batchMaterials !== parse(args.unitCostRaw, 'unitCostRaw')) invalid('materialsCost/unitCostRaw (valores divergentes)');
    if (batchLaborMinutes !== undefined && args.laborTimeMinutes !== undefined && batchLaborMinutes !== parse(args.laborTimeMinutes, 'laborTimeMinutes')) invalid('laborHours/laborTimeMinutes (valores divergentes)');
    if (targetMargin !== undefined && args.profitMarginPercent !== undefined && targetMargin !== parse(args.profitMarginPercent, 'profitMarginPercent', 0, 95)) invalid('targetMarginPercent/profitMarginPercent (valores divergentes)');
    const alias = args.unitCostRaw !== undefined ? parse(args.unitCostRaw, 'unitCostRaw', 0, 10000000) : undefined;
    const raw = args.rawMaterialsCost !== undefined ? parse(args.rawMaterialsCost, 'rawMaterialsCost', 0, 10000000) : undefined;
    if (alias !== undefined && raw !== undefined && alias !== raw) invalid('unitCostRaw/rawMaterialsCost (valores divergentes)');
    const rawCost = batchMaterials ?? raw ?? alias ?? 15;
    inputs.rawMaterialsCost = { value: rawCost, source: batchMaterials !== undefined || raw !== undefined || alias !== undefined ? 'argument' : 'default', label: labels.rawMaterialsCost, argumentFields: ['materialsCost', 'rawMaterialsCost', 'unitCostRaw'].filter((key) => args[key] !== undefined) };
    const customCost = read('customizationCost', 5, null, 0, 10000000);
    const laborTimeMinutes = batchLaborMinutes ?? read('laborTimeMinutes', 15, null, 0, 60000);
    inputs.laborTimeMinutes = { value: laborTimeMinutes, source: batchLaborMinutes !== undefined ? 'argument' : (args.laborTimeMinutes !== undefined ? 'argument' : 'default'), label: labels.laborTimeMinutes, argumentFields: ['laborHours', 'laborTimeMinutes'].filter((key) => args[key] !== undefined) };
    const setupTimeMinutes = read('setupTimeMinutes', 0, null, 0, 600000);
    const profitMarginPercent = targetMargin ?? read('profitMarginPercent', studioSettings.defaultProfitMarginPercent, 'defaultProfitMarginPercent', 0, 95);
    if (targetMargin !== undefined) inputs.profitMarginPercent = { value: targetMargin, source: 'argument', label: labels.profitMarginPercent, argumentFields: ['targetMarginPercent'] };
    const paymentFeePercent = read('paymentFeePercent', studioSettings.defaultPaymentFeePercent, 'defaultPaymentFeePercent', 0, 100);
    const wasteMarginPercent = read('wasteMarginPercent', studioSettings.defaultWasteMarginPercent, 'defaultWasteMarginPercent', 0, 1000);
    const sourceLabels = { argument: 'argumento recebido pela ferramenta (origem humana não comprovada)', configuration: 'configuração cadastrada', default: 'padrão assumido' };
    const assumptions = Object.values(inputs).map((input) => `${input.label}: ${input.value} — ${sourceLabels[input.source]}${input.invalidConfiguration ? ' (configuração inválida substituída)' : ''}.`);

    const items = [
      {
        name: 'Matéria-prima Direta',
        unit: 'unidade',
        unitCost: rawCost,
        quantityUsed: 1,
        totalCost: rawCost,
      },
    ];

    if (customCost > 0) {
      items.push({
        name: 'Personalização e Acabamentos Especiais',
        unit: 'unidade',
        unitCost: customCost,
        quantityUsed: 1,
        totalCost: customCost,
      });
    }

    const pricingMethod = args.pricingMode === 'markup' ? 'markup_on_cost' : 'margin_on_sale';
    const calcResult = calculateRecipePricing({
      items,
      wasteMarginPercent,
      laborMode: 'time',
      productionTimeMinutes: laborTimeMinutes,
      setupTimeMinutes,
      profitMarginPercent,
      paymentFeePercent,
      pricingMethod,
      settings: studioSettings,
    });

    // Usa a mesma composição do motor. A taxa já inclui despesas fixas.
    // A eficiência dos tiers existentes é preservada; quantidades fora dos tiers
    // continuam sem desconto por eficiência, com setup rateado pelo lote.
    const matchingTier = calcResult.batchTiers.find((tier) => tier.quantity === qty);
    const seriesEfficiency = matchingTier && qty !== 1 ? Math.max(0.8, 1 - Math.log10(qty) * 0.1) : 1;
    const effective = calculateRecipePricing({
      items, wasteMarginPercent, laborMode: 'time',
      productionTimeMinutes: laborTimeMinutes * seriesEfficiency,
      setupTimeMinutes: setupTimeMinutes / qty,
      profitMarginPercent, paymentFeePercent, pricingMethod, settings: studioSettings,
    });
    const rates = calculateHourlyRate(studioSettings);
    const setupLaborPerUnit = (setupTimeMinutes / qty) * rates.minuteRate;
    const directLaborPerUnit = laborTimeMinutes * seriesEfficiency * rates.minuteRate;
    const matWithWaste = (rawCost + customCost) * (1 + wasteMarginPercent / 100);
    inputs.seriesEfficiency = { value: seriesEfficiency, source: 'default', label: 'Fator de eficiência do motor para este lote' };
    assumptions.push(`Setup de ${setupTimeMinutes} min rateado em ${qty} unidade(s); fator de eficiência da montagem: ${seriesEfficiency}. Despesas fixas já incluídas na mão de obra; não somar novamente.`);
    const suggestedTotalPrice = matchingTier?.totalPrice ?? Math.round(effective.suggestedUnitPrice * qty * 100) / 100;
    if (![effective.totalUnitCost, effective.suggestedUnitPrice, suggestedTotalPrice, effective.breakevenPrice, ...calcResult.batchTiers.flatMap((tier) => [tier.unitCost, tier.unitPrice, tier.totalPrice])].every(Number.isFinite)) invalid('resultado fora da capacidade numérica');

    return {
      productName: args.productName || 'Personalizado Luisices',
      quantity: qty,
      unitCost: effective.totalUnitCost,
      suggestedUnitPrice: effective.suggestedUnitPrice,
      suggestedTotalPrice,
      profitMarginPercent,
      breakevenPrice: effective.breakevenPrice,
      maxDiscountPercent: effective.maxDiscountPercent,
      batchTiers: calcResult.batchTiers,
      contractVersion: 2,
      inputs,
      assumptions,
      requiresReview: true,
      isExplicitMaterialsCost: inputs.rawMaterialsCost.source === 'argument',
      isExplicitLaborTime: args.laborTimeMinutes !== undefined,
      breakdown: {
        rawMaterials: rawCost,
        customization: customCost,
        materialsBase: Number((rawCost + customCost).toFixed(2)),
        wasteMarginAmount: effective.wasteAmount,
        totalMaterialsWithWaste: Number(matWithWaste.toFixed(2)),
        directLaborPerUnit: Number(directLaborPerUnit.toFixed(2)),
        setupLaborPerUnit: Number(setupLaborPerUnit.toFixed(2)),
        specializedLabor: Number((directLaborPerUnit + setupLaborPerUnit).toFixed(2)),
        fixedCostsShare: effective.fixedCostsShare,
        fixedCostsIncludedInLabor: true,
      },
    };
  }

  /**
   * Ferramenta 6: Cobranças e WhatsApp com Contrato Totalmente Compatível (IA-03, R03, R09)
   */
  async executeGenerateWhatsAppMessage(args = {}, scope) {
    const { recipientName = 'Cliente', orderNumber, messageType = 'cobranca', customText } = args;

    // Normaliza tipo para os enums compatíveis com AiCopilotSheet.tsx (VARIANTS)
    let normalizedType = 'geral';
    if (messageType === 'cobranca' || messageType === 'cobranca_saldo') {
      normalizedType = 'cobranca';
    } else if (messageType === 'pronto_retirada' || messageType === 'pedido_pronto') {
      normalizedType = 'pronto_retirada';
    } else if (messageType === 'status_producao' || messageType === 'producao') {
      normalizedType = 'status_producao';
    } else if (messageType === 'confirmacao_pedido' || messageType === 'confirmacao') {
      normalizedType = 'confirmacao_pedido';
    }

    let phone = args.recipientPhone || '';
    let realOrder = null;

    const exactOrder = orderNumber && typeof this.repos.getScopedOrderSummary === 'function'
      ? await this.repos.getScopedOrderSummary(scope, String(orderNumber))
      : null;
    const orders = orderNumber && typeof this.repos.getScopedOrderSummary === 'function'
      ? (exactOrder ? [exactOrder] : [])
      : (await this.repos.getScopedOrders(scope, { skipCache: true })).filter((order) => !order.isDeleted);
    const cleanTarget = String(orderNumber || '').toLowerCase().replace('#', '').trim();
    const nameTarget = String(recipientName).trim().toLowerCase();
    const canReadPaymentDetails = !Array.isArray(scope?.mcpScopes)
      || scope.mcpScopes.includes('*')
      || scope.mcpScopes.includes('payments:read')
      || scope.mcpScopes.includes('financial:read');
    const matches = orders.filter((order) => cleanTarget
      ? String(order.orderId || '').toLowerCase() === cleanTarget || String(order.orderNumber || '').toLowerCase().replace('#', '').trim() === cleanTarget
      : String(order.customerName || '').trim().toLowerCase() === nameTarget)
      .filter((order) => orderNumber || !args.recipientPhone || normalizePhone(order.customerPhone) === normalizePhone(args.recipientPhone));
    const identificationRequired = matches.length > 1 || ((orderNumber || normalizedType !== 'geral') && matches.length === 0);
    if (identificationRequired) {
      return { preparationStatus: 'identification_required', requiresIdentification: true,
        preparationNotice: matches.length > 1 ? 'Há mais de um pedido ou cliente correspondente. Informe o número do pedido antes de preparar a mensagem.' : 'Pedido não localizado. Informe um identificador válido antes de preparar uma mensagem vinculada ao pedido.',
        recipientName, recipientPhone: '', type: normalizedType, messageText: '', text: '', orderDetails: null };
    }
    let nameIdentity = null;
    if (!orderNumber && matches.length === 1) {
      nameIdentity = await this.resolveCustomerIdentity(recipientName, args.recipientPhone, scope);
      if (nameIdentity.ambiguous) {
        return { preparationStatus: 'identification_required', requiresIdentification: true,
          preparationNotice: 'Nome ambíguo. Informe o número do pedido ou telefone do cliente antes de preparar a mensagem.',
          recipientName, recipientPhone: '', type: normalizedType, messageText: '', text: '', orderDetails: null };
      }
    }
    realOrder = matches[0] || null;
    if (!realOrder) {
      const result = await this.repos.getScopedCustomers(scope, { searchTerm: nameTarget });
      const customers = result.customers || [];
      const exact = customers.filter((customer) => String(customer.name || '').trim().toLowerCase() === nameTarget);
      let candidates = exact.length ? exact : customers;
      if (phone) candidates = candidates.filter((customer) => normalizePhone(customer.phone) === normalizePhone(phone));
      if (candidates.length > 1 || result.hasMore) {
        return { preparationStatus: 'identification_required', requiresIdentification: true,
          preparationNotice: 'Nome ambíguo. Identifique o cliente pelo telefone ou pedido antes de preparar a mensagem.',
          recipientName, recipientPhone: '', type: normalizedType, messageText: '', text: '', orderDetails: null };
      }
      phone = phone || candidates[0]?.phone || '';
    }

    if (realOrder) {
      if (realOrder.customerPhone) {
        phone = realOrder.customerPhone;
      }
    }

    if (!phone && realOrder?.customerName) {
      phone = nameIdentity ? nameIdentity.phone : await this.resolveCustomerPhone(realOrder.customerName, null, scope);
    }

    phone = normalizePhone(phone);

    let generatedText = '';
    let orderDetails = null;

    if (realOrder) {
      const remaining = Number(realOrder.remainingAmount ?? Math.max(0, Number(realOrder.totalPrice || 0) - Number(realOrder.paidAmount || 0)));
      const remainingFmt = remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const totalFmt = Number(realOrder.totalPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const dateFmt = realOrder.deliveryDate ? ` para entrega em ${realOrder.deliveryDate}` : '';

      orderDetails = {
        orderId: realOrder.orderId,
        orderNumber: realOrder.orderNumber,
        customerName: realOrder.customerName,
        status: realOrder.status,
        deliveryDate: realOrder.deliveryDate,
        ...(canReadPaymentDetails ? {
          totalPrice: realOrder.totalPrice,
          paidAmount: realOrder.paidAmount,
          remainingAmount: realOrder.remainingAmount,
          paymentStatus: realOrder.paymentStatus,
        } : {}),
      };

      if (realOrder.status === 'cancelled') {
        generatedText = `Olá, ${realOrder.customerName}! Consta em nosso sistema que o pedido ${realOrder.orderNumber} (${realOrder.productSummary}) foi cancelado. Se desejar reativar ou tiver dúvidas, estamos à disposição! ✨`;
      } else if (normalizedType === 'cobranca') {
        if (!canReadPaymentDetails) {
          generatedText = `Olá, ${realOrder.customerName}! Tudo bem? Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary})${dateFmt} está registrado. Para consultar os valores e o saldo, fale conosco por aqui. ✨`;
        } else if (realOrder.paymentStatus === 'paid' || remaining <= 0) {
          generatedText = `Olá, ${realOrder.customerName}! Tudo bem? Passando para avisar que seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) já está com pagamento totalmente quitado! Qualquer dúvida estamos à disposição. ✨`;
        } else {
          // O saldo restante oficial SEMPRE prevalece sobre valores arbitrários
          generatedText = `Olá, ${realOrder.customerName}! Tudo bem? Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary})${dateFmt} está registrado no sistema! O saldo restante oficial é de ${remainingFmt} (Total: ${totalFmt}). Quando puder, nos envie o comprovante para agendarmos a entrega com todo carinho! ✨`;
        }
      } else if (normalizedType === 'pronto_retirada') {
        generatedText = realOrder.status === 'completed'
          ? `Olá, ${realOrder.customerName}! Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) consta como concluído no sistema. Vamos combinar os próximos passos? ✨`
          : `Olá, ${realOrder.customerName}! Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) ainda não consta como concluído. Avisaremos quando houver atualização. ✨`;
      } else if (normalizedType === 'status_producao') {
        const statusLabel = { pending: 'pendente', 'in-progress': 'em produção', completed: 'concluído' }[realOrder.status] || 'com status a conferir';
        generatedText = `Olá, ${realOrder.customerName}! Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) consta como ${statusLabel} no sistema. ✨`;
      } else {
        generatedText = `Olá, ${realOrder.customerName}! Confirmamos o recebimento dos detalhes do seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}). Consulte-nos para combinar os próximos passos. ✨`;
      }
    } else {
      generatedText = customText || `Olá, ${recipientName}! Tudo bem? Entramos em contato para passar informações sobre seus personalizados Luisices. Estamos à disposição para qualquer dúvida! ✨`;
    }

    return {
      preparationStatus: 'draft_prepared',
      recipientName: realOrder?.customerName || recipientName,
      recipientPhone: phone,
      orderNumber: realOrder?.orderNumber || orderNumber || '',
      type: normalizedType,
      messageType: normalizedType,
      text: generatedText,
      messageText: generatedText,
      orderDetails,
    };
  }

  /**
   * Ferramenta 7: Auditoria de Colaborador (get_user_summary)
   */
  async executeUserSummary(args = {}, scope) {
    if (!scope.isAdmin) {
      return { authorized: false, message: 'Acesso restrito a administradores.' };
    }

    const team = await this.repos.getTeamMembers();
    const identifier = String(args.userIdentifier || '').trim().toLowerCase();

    if (!identifier) {
      return {
        authorized: true,
        isList: true,
        members: team,
      };
    }

    let target = team.find(
      (m) =>
        m.name.toLowerCase().includes(identifier) ||
        m.email.toLowerCase().includes(identifier) ||
        m.uid.toLowerCase() === identifier ||
        identifier.includes(m.email.toLowerCase()) ||
        (m.email && identifier.includes(m.email.toLowerCase().split('@')[0]))
    );

    const allScopedOrders = await this.repos.getScopedOrders(scope, { skipCache: true });

    if (!target) {
      const matchingOrder = allScopedOrders.find(
        (o) =>
          (o.userId && o.userId.toLowerCase() === identifier) ||
          (o.createdBy && o.createdBy.toLowerCase() === identifier) ||
          (o.assignedTo && o.assignedTo.toLowerCase() === identifier) ||
          (o.createdByName && o.createdByName.toLowerCase().includes(identifier)) ||
          (o.assignedToName && o.assignedToName.toLowerCase().includes(identifier))
      );
      if (matchingOrder) {
        const uid = matchingOrder.userId || matchingOrder.createdBy || matchingOrder.assignedTo;
        target = {
          uid,
          name: matchingOrder.createdByName || matchingOrder.assignedToName || identifier,
          email: identifier.includes('@') ? identifier : '',
          role: 'user',
        };
      }
    }

    if (!target) {
      return {
        authorized: true,
        found: false,
        availableMembers: team.map((m) => m.name),
      };
    }

    const uid = String(target.uid);
    const orders = allScopedOrders.filter((o) => o.userId === uid || o.createdBy === uid || o.assignedTo === uid);
    const customersResult = await this.repos.getScopedCustomers(scope);

    // Consolida clientes atendidos tanto pela coleção de clientes quanto diretamente pelos pedidos
    const customerMap = new Map();

    (customersResult.customers || []).forEach((c) => {
      if (c.userId === uid || c.createdBy === uid || c.assignedTo === uid) {
        const key = (c.name || '').toLowerCase().trim();
        if (key) {
          customerMap.set(key, {
            name: c.name,
            phone: c.phone || '',
            city: c.city || '',
            totalOrders: Number(c.totalOrders) || 0,
            totalSpent: Number(c.totalSpent) || 0,
            recentProducts: [],
          });
        }
      }
    });

    orders.forEach((o) => {
      const cName = (o.customerName || '').trim();
      if (!cName || cName.toLowerCase() === 'cliente não informado') return;
      const key = cName.toLowerCase();
      const existing = customerMap.get(key) || {
        name: cName,
        phone: o.customerPhone || '',
        city: '',
        totalOrders: 0,
        totalSpent: 0,
        recentProducts: [],
      };
      existing.totalOrders += 1;
      existing.totalSpent += Number(o.totalPrice) || 0;
      if (!existing.phone && o.customerPhone) existing.phone = o.customerPhone;
      const pName = o.productSummary || o.productName;
      if (pName && !existing.recentProducts.includes(pName) && existing.recentProducts.length < 3) {
        existing.recentProducts.push(pName);
      }
      customerMap.set(key, existing);
    });

    const attendedCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.totalOrders - a.totalOrders || b.totalSpent - a.totalSpent);

    const validOrders = orders.filter((o) => o.status !== 'cancelled' && !o.isDeleted);
    const completedOrders = orders.filter((o) => o.status === 'completed' && !o.isDeleted);
    const inProgressOrders = orders.filter((o) => o.status === 'in-progress' && !o.isDeleted);
    const pendingOrders = orders.filter((o) => o.status === 'pending' && !o.isDeleted);
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled' || o.isDeleted);

    const grossIssuedVolume = validOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const realizedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalReceived = sumPaymentCents(validOrders, 'paidCents') / 100;
    const pendingReceivables = sumPaymentCents(validOrders, 'remainingCents') / 100;

    const averageTicket = completedOrders.length > 0
      ? realizedRevenue / completedOrders.length
      : validOrders.length > 0
        ? grossIssuedVolume / validOrders.length
        : 0;

    const sampleOrders = orders.slice(0, 10).map((o) => {
      const payment = resolvePaymentAmounts(o);
      return {
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        productName: o.productName || o.productSummary,
        totalPrice: payment.totalPrice,
        paidAmount: payment.paidAmount,
        remainingAmount: payment.remainingAmount,
        status: o.status,
        deliveryDate: o.deliveryDate,
      };
    });

    return {
      authorized: true,
      found: true,
      user: target,
      customers: attendedCustomers.map((c) => ({
        name: c.name,
        phone: c.phone,
        totalOrders: c.totalOrders,
        totalSpent: Number(c.totalSpent.toFixed(2)),
        recentProducts: c.recentProducts,
      })),
      totalCustomers: attendedCustomers.length,
      sampleOrders,
      metrics: {
        totalCustomers: attendedCustomers.length,
        recentCustomers: attendedCustomers.slice(0, 5).map((c) => c.name),
        totalOrders: orders.length,
        totalValidOrders: validOrders.length,
        completedOrders: completedOrders.length,
        inProgressOrders: inProgressOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        volumeTotalEmitido: Number(grossIssuedVolume.toFixed(2)),
        grossIssuedVolume: Number(grossIssuedVolume.toFixed(2)),
        faturamentoRealizado: Number(realizedRevenue.toFixed(2)),
        realizedRevenue: Number(realizedRevenue.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        totalRecebido: Number(totalReceived.toFixed(2)),
        pendingReceivables: Number(pendingReceivables.toFixed(2)),
        totalPendenteReceber: Number(pendingReceivables.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
        ticketMedio: Number(averageTicket.toFixed(2)),
      },
    };
  }

  /**
   * Ferramenta 8: Busca na Galeria
   */
  async executeSearchGalleryPortfolio(args = {}, scope) {
    return this.repos.getGalleryItems(scope, { ...args, fetchAll: true, returnPage: true });
  }

  /**
   * Ferramenta de Formulário Estruturado de Pedido
   */
  async executeGetOrderForm(args = {}, scope) {
    const cName = args.customerName ? ` para **${args.customerName}**` : '';
    const category = args.productCategory ? `\n**Categoria selecionada:** ${String(args.productCategory).trim()}` : '';
    const formMarkdown = [
      `📋 **Formulário de Pedido — Luisices Ateliê de Papelaria Personalizada**${cName}${category}`,
      `*Preencha ou responda os campos abaixo no chat (você pode responder tudo de uma vez, em lista, por partes ou enviar um áudio):*`,
      ``,
      `1. **Nome do Cliente:** ${args.customerName || ''}`,
      `2. **Telefone / WhatsApp:** `,
      `3. **Produto / Kit Desejado:** *(ex: Kit Festinha, 30 Caixas Milk, Topo de Bolo, Convites)*`,
      `4. **Tema ou Paleta de Cores:** *(ex: Safari Baby, Sereia, Jardim Encantado, Dourado e Rosa)*`,
      `5. **Nome e Idade do Aniversariante:** *(ex: Bernardo, 5 anos)*`,
      `6. **Data de Entrega / Data da Festa:** *(no formato DD/MM/AAAA ou AAAA-MM-DD)*`,
      `7. **Quantidade de Peças:** `,
      `8. **Valor Total Combinado (R$):** *(se já orçado)*`,
      `9. **Sinal / Valor de Entrada (R$):** *(ex: 50% de entrada)*`,
      `10. **Forma de Pagamento:** *(PIX, Cartão, Dinheiro)*`,
      `11. **Observações & Acabamentos:** *(ex: Laço de cetim azul marinho, lamination fosca)*`,
      ``,
      `💡 *Após o preenchimento, a IA processará os dados com extract_order_draft para conferência e create_order para gravar o pedido oficial no sistema.*`,
    ].join('\n');

    return {
      success: true,
      templateTitle: 'Formulário Estruturado de Pedido',
      formMarkdown,
      instructions: 'Apresente o formulário em Markdown acima para o usuário preencher no chat.',
    };
  }

  /** Carrega os dados autorizados de um pedido para o formulário MCP Apps. */
  async executeGetOrderEditForm(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'edit', 'editar pedidos');
    const identifier = String(args.orderNumber || '').trim();
    if (!identifier) {
      const error = new Error('Informe o número ou ID do pedido.');
      error.code = 'invalid-argument';
      throw error;
    }
    const order = await this.repos.getScopedOrderDocument(scope, identifier);
    if (!order || order.data.deletedAt || order.data.isDeleted) {
      const error = new Error('Pedido não encontrado ou sem permissão para editá-lo.');
      error.code = 'not-found';
      throw error;
    }
    const statusAliases = { pending: 'pending', pendente: 'pending', received: 'pending', recebido: 'pending', in_contact: 'pending', 'in-progress': 'in-progress', in_progress: 'in-progress', em_producao: 'in-progress', 'em produção': 'in-progress', 'em producao': 'in-progress', 'em-andamento': 'in-progress', em_andamento: 'in-progress', producao: 'in-progress', produção: 'in-progress', completed: 'completed', concluido: 'completed', concluído: 'completed', delivered: 'completed', entregue: 'completed', pronto: 'completed', finished: 'completed', cancelled: 'cancelled', canceled: 'cancelled', cancelado: 'cancelled', cancelada: 'cancelled' };
    const hasStoredItems = Array.isArray(order.data.items) && order.data.items.length > 0;
    const resolvedItems = hasStoredItems
      ? order.data.items.map((item, existingIndex) => ({
          existingIndex,
          name: String(item.name || item.productName || '').slice(0, 200),
          quantity: Number.isSafeInteger(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          unitPrice: item.unitPrice !== null && item.unitPrice !== undefined && item.unitPrice !== '' && Number.isFinite(Number(item.unitPrice))
            ? getStoredItemUnitPrice(item)
            : (Number(item.quantity) > 0 ? Number(item.price || 0) / Number(item.quantity) : Number(item.price || 0)),
        }))
      : (order.data.productName ? [{
          existingIndex: 0,
          name: String(order.data.productName).slice(0, 200),
          quantity: Number.isSafeInteger(Number(order.data.quantity)) && Number(order.data.quantity) > 0 ? Number(order.data.quantity) : 1,
          unitPrice: order.data.unitPrice !== null && order.data.unitPrice !== undefined && order.data.unitPrice !== '' && Number.isFinite(Number(order.data.unitPrice)) && Number(order.data.unitPrice) > 0
            ? Number(order.data.unitPrice)
            : (Number(order.data.quantity) > 0
                ? Math.round(((Number(order.data.price ?? order.data.totalPrice ?? 0)) / Number(order.data.quantity)) * 100) / 100
                : Number(order.data.price ?? order.data.totalPrice ?? 0)),
        }] : []);
    return {
      state: 'editing',
      order: {
        orderNumber: order.data.orderNumber || identifier,
        customerName: order.data.customerName || '',
        customerPhone: order.data.customerPhone || '',
        productName: order.data.productName || '',
        items: resolvedItems,
        quantity: Number(order.data.quantity) > 0 ? Number(order.data.quantity) : 1,
        totalPrice: Number(order.data.price ?? order.data.totalPrice ?? order.data.payment?.totalAmount ?? 0),
        deliveryDate: order.data.deliveryDate || '',
        theme: order.data.theme || '',
        notes: order.data.notes || '',
        status: statusAliases[String(order.data.status || 'pending').toLowerCase().trim()] || 'unknown',
        version: Number.isSafeInteger(order.data.version) && order.data.version > 0 ? order.data.version : 1,
      },
      editableOptions: [
        'Nome e telefone do cliente',
        'Produtos: nome, quantidade e preço unitário de cada item; adicionar ou remover itens (até 10)',
        ...(!hasStoredItems ? ['Quantidade geral e valor total ou preço unitário do pedido'] : []),
        'Prazo de entrega',
        'Tema do pedido',
        'Observações',
        ...(statusAliases[String(order.data.status || 'pending').toLowerCase().trim()] === 'pending' ? ['Etapa de produção: avançar para em produção'] : []),
        ...(statusAliases[String(order.data.status || 'pending').toLowerCase().trim()] === 'in-progress' ? ['Etapa de produção: avançar para concluído'] : []),
      ],
      message: 'Você pode alterar um ou vários desses campos na mesma solicitação. As alterações serão apresentadas para conferência antes de salvar; pagamentos já registrados são preservados.',
    };
  }

  /** Atualiza dados operacionais e valor do pedido autorizado, preservando o histórico de pagamentos. */
  async executeUpdateOrder(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'edit', 'editar pedidos');
    const identifier = String(args.orderNumber || '').trim();
    if (!identifier) {
      const error = new Error('Informe o número ou ID do pedido.');
      error.code = 'invalid-argument';
      throw error;
    }
    const updates = {};
    const textFields = { customerName: 200, customerPhone: 50, productName: 300, theme: 200, notes: 1000 };
    for (const [field, maxLength] of Object.entries(textFields)) {
      if (args[field] === undefined) continue;
      if (typeof args[field] !== 'string' || args[field].length > maxLength || (field === 'customerName' || field === 'productName') && !args[field].trim()) {
        const error = new Error(`O campo ${field} é inválido ou excede ${maxLength} caracteres.`);
        error.code = 'invalid-argument';
        throw error;
      }
      updates[field] = args[field].trim() || null;
    }
    if (args.quantity !== undefined) {
      const quantity = Number(args.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000) {
        const error = new Error('A quantidade deve ser um inteiro entre 1 e 10000.');
        error.code = 'invalid-argument';
        throw error;
      }
      updates.quantity = quantity;
    }
    if (args.totalPrice !== undefined && args.unitPrice !== undefined) {
      const error = new Error('Informe totalPrice ou unitPrice, nunca os dois.');
      error.code = 'invalid-argument';
      throw error;
    }
    if (args.items !== undefined && (args.totalPrice !== undefined || args.unitPrice !== undefined || args.quantity !== undefined)) {
      const error = new Error('Ao editar os itens, não informe também quantidade geral, totalPrice ou unitPrice. A quantidade e o total serão calculados pelos itens.');
      error.code = 'invalid-argument';
      throw error;
    }
    let requestedPrice = args.totalPrice !== undefined ? args.totalPrice : args.unitPrice;
    let itemSourceIndexes = null;
    let itemChanges = null;
    if (args.items !== undefined) {
      if (!Array.isArray(args.items) || args.items.length < 1 || args.items.length > 10) {
        const error = new Error('Informe de 1 a 10 itens para o pedido.');
        error.code = 'invalid-argument';
        throw error;
      }
      let totalCents = 0;
      let totalQuantity = 0;
      const usedSourceIndexes = new Set();
      itemSourceIndexes = [];
      updates.items = args.items.map((item) => {
        const name = typeof item?.name === 'string' ? item.name.trim() : '';
        const quantity = Number(item?.quantity);
        const unitPrice = item?.unitPrice;
        const existingIndex = item?.existingIndex;
        if (!name || name.length > 200 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10000 || typeof unitPrice !== 'number' || !Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 1000000) {
          const error = new Error('Cada item precisa de nome, quantidade inteira entre 1 e 10000 e preço unitário válido de até R$ 1.000.000,00.');
          error.code = 'invalid-argument';
          throw error;
        }
        if (existingIndex !== undefined && (!Number.isSafeInteger(existingIndex) || existingIndex < 0 || existingIndex > 49 || usedSourceIndexes.has(existingIndex))) {
          const error = new Error('O índice de um item existente é inválido ou foi repetido. Consulte novamente os itens do pedido.');
          error.code = 'invalid-argument';
          throw error;
        }
        if (existingIndex !== undefined) usedSourceIndexes.add(existingIndex);
        itemSourceIndexes.push(existingIndex ?? null);
        const unitCents = Math.round(unitPrice * 100);
        const lineCents = unitCents * quantity;
        totalCents += lineCents;
        totalQuantity += quantity;
        if (!Number.isSafeInteger(totalCents) || totalCents > 1000000000 || totalQuantity > 100000) {
          const error = new Error('O total ou a quantidade somada dos itens excede o limite permitido.');
          error.code = 'invalid-argument';
          throw error;
        }
        return { name, quantity, unitPrice: unitCents / 100, price: lineCents / 100 };
      });
      updates.quantity = totalQuantity;
      updates.productName = updates.items
        .map((item) => item.quantity > 1 ? `${item.name} (${item.quantity}x)` : item.name)
        .join(', ')
        .slice(0, 300);
      requestedPrice = totalCents / 100;
    }
    if (requestedPrice !== undefined) {
      if (typeof requestedPrice !== 'number' || !Number.isFinite(requestedPrice) || requestedPrice < 0) {
        const error = new Error('O valor informado deve ser um número não negativo em reais.');
        error.code = 'invalid-argument';
        throw error;
      }
      const cents = Math.round(requestedPrice * 100);
      const maxCents = args.totalPrice !== undefined || args.items !== undefined ? 1000000000 : 100000000;
      if (!Number.isSafeInteger(cents) || cents > maxCents) {
        const error = new Error('O valor informado excede o limite permitido.');
        error.code = 'invalid-argument';
        throw error;
      }
      updates.price = cents / 100;
    }
    if (args.deliveryDate !== undefined) {
      try {
        updates.deliveryDate = validateAndNormalizeDeliveryDate(args.deliveryDate).deliveryDate;
      } catch (cause) {
        const error = new Error(cause.message || 'A data de entrega informada é inválida.');
        error.code = 'invalid-argument';
        throw error;
      }
    }
    if (!Object.keys(updates).length) {
      return await this.executeGetOrderEditForm(args, scope);
    }
    const order = await this.repos.getScopedOrderDocument(scope, identifier);
    if (!order || order.data.deletedAt || order.data.isDeleted) {
      const error = new Error('Pedido não encontrado ou sem permissão para editá-lo.');
      error.code = 'not-found';
      throw error;
    }
    if (itemSourceIndexes) {
      const currentItems = Array.isArray(order.data.items) && order.data.items.length > 0
        ? order.data.items
        : (order.data.productName ? [{
            name: String(order.data.productName).slice(0, 200),
            quantity: Number.isSafeInteger(Number(order.data.quantity)) && Number(order.data.quantity) > 0 ? Number(order.data.quantity) : 1,
            unitPrice: order.data.unitPrice !== null && order.data.unitPrice !== undefined && order.data.unitPrice !== '' && Number.isFinite(Number(order.data.unitPrice)) && Number(order.data.unitPrice) > 0
              ? Number(order.data.unitPrice)
              : (Number(order.data.quantity) > 0
                  ? Math.round(((Number(order.data.price ?? order.data.totalPrice ?? 0)) / Number(order.data.quantity)) * 100) / 100
                  : Number(order.data.price ?? order.data.totalPrice ?? 0)),
            price: Number(order.data.price ?? order.data.totalPrice ?? 0),
          }] : []);
      const staleIndex = itemSourceIndexes.find((index) => index !== null && index >= currentItems.length);
      if (staleIndex !== undefined) {
        const error = new Error('Os itens do pedido mudaram desde a consulta. Carregue novamente antes de editar.');
        error.code = 'failed-precondition';
        throw error;
      }
      const retainedIndexes = new Set(itemSourceIndexes.filter((index) => index !== null));
      updates.items = updates.items.map((item, index) => {
        const sourceIndex = itemSourceIndexes[index];
        if (sourceIndex === null) return item;
        const preservedItemData = Object.fromEntries(
          Object.entries(currentItems[sourceIndex] || {}).filter(([key]) => key !== 'existingIndex')
        );
        return { ...preservedItemData, ...item };
      });
      itemChanges = {
        changed: updates.items.map((after, index) => {
          const sourceIndex = itemSourceIndexes[index];
          const before = sourceIndex === null ? null : currentItems[sourceIndex];
          const beforeQuantity = Number(before?.quantity) || 1;
          const beforeUnitPrice = before?.unitPrice !== null && before?.unitPrice !== undefined && Number.isFinite(Number(before.unitPrice))
            ? getStoredItemUnitPrice(before)
            : Number(before?.price || 0) / beforeQuantity;
          const same = before && before.name === after.name && beforeQuantity === after.quantity && Math.round(beforeUnitPrice * 100) === Math.round(after.unitPrice * 100);
          const metadataPreserved = Boolean(before && Object.keys(before).some((key) => !['name', 'quantity', 'unitPrice', 'price', 'existingIndex'].includes(key)));
          return {
            action: before ? (same ? 'unchanged' : 'updated') : 'added',
            metadataPreserved,
            ...(before ? { before: { name: before.name || before.productName || '', quantity: beforeQuantity, unitPrice: Math.round(beforeUnitPrice * 100) / 100, subtotal: Number(before.price ?? beforeQuantity * beforeUnitPrice) } } : {}),
            after: { name: after.name, quantity: after.quantity, unitPrice: after.unitPrice, subtotal: after.price },
          };
        }),
        removed: currentItems
          .map((item, index) => ({ item, index }))
          .filter(({ index }) => !retainedIndexes.has(index))
          .map(({ item }) => {
            const quantity = Number(item.quantity) || 1;
            const unitPrice = Number(item.unitPrice) || 0;
            return { name: item.name || item.productName || '', quantity, unitPrice, subtotal: Number(item.price ?? quantity * unitPrice) };
          }),
      };
    }
    if (requestedPrice !== undefined && args.unitPrice !== undefined) {
      const quantity = updates.quantity ?? (Number(order.data.quantity) > 0 ? Number(order.data.quantity) : 1);
      const totalCents = Math.round(requestedPrice * 100) * quantity;
      if (!Number.isSafeInteger(totalCents) || totalCents > 1000000000) {
        const error = new Error('O total calculado excede o limite permitido.');
        error.code = 'invalid-argument';
        throw error;
      }
      updates.price = totalCents / 100;
    }
    if (requestedPrice !== undefined) {
      const alreadyPaid = Math.max(0, Number(order.data.payment?.paidAmount) || 0);
      if (alreadyPaid > updates.price) {
        const error = new Error('O novo valor não pode ficar abaixo do total já recebido. Ajuste o valor recebido pelo fluxo financeiro autorizado.');
        error.code = 'failed-precondition';
        throw error;
      }
    }
    const version = Number.isSafeInteger(order.data.version) && order.data.version > 0 ? order.data.version : 1;
    if (!Number.isSafeInteger(Number(args.expectedVersion)) || Number(args.expectedVersion) !== version) {
      const error = new Error(`A versão do pedido mudou ou não foi informada. Consulte novamente antes de editar (versão atual: ${version}).`);
      error.code = 'failed-precondition';
      throw error;
    }

    const previewChanges = { ...updates };
    if (Array.isArray(updates.items)) {
      previewChanges.items = updates.items.map(({ name, quantity, unitPrice, price }) => ({ name, quantity, unitPrice, price }));
    }
    const summary = {
      orderNumber: order.data.orderNumber || identifier,
      customerName: order.data.customerName || '',
      changes: previewChanges,
      ...(itemChanges ? { itemChanges } : {}),
      ...(requestedPrice !== undefined ? {
        pricing: {
          mode: args.items !== undefined ? 'items' : args.unitPrice !== undefined ? 'unit' : 'total',
          totalPrice: updates.price,
          ...(args.items !== undefined ? { items: updates.items.map(({ name, quantity, unitPrice, price }) => ({ name, quantity, unitPrice, price })) } : {
            unitPrice: args.unitPrice !== undefined ? Math.round(Number(args.unitPrice) * 100) / 100 : Math.round((updates.price / (updates.quantity ?? (Number(order.data.quantity) || 1))) * 100) / 100,
          }),
        },
      } : {}),
      version,
    };
    if (!isConfirmed(args.confirmed)) return { success: true, status: 'preview', requiresConfirmation: true, preview: summary, message: 'Prévia pronta. Mostre as alterações ao usuário e só grave após confirmação explícita.' };

    if (typeof args.idempotencyKey !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(args.idempotencyKey)) {
      const error = new Error('Informe uma chave de idempotência válida para confirmar a alteração.');
      error.code = 'invalid-argument';
      throw error;
    }

    const db = this.repos.db;
    const idempotency = getMcpIdempotencyContext(db, scope, 'update_order', args.idempotencyKey, args);
    const now = new Date().toISOString();
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(order.id);
      const saleRef = db.collection('salesLedger').doc(order.id);
      const [idempotencySnap, orderSnap, saleSnap] = await Promise.all([
        transaction.get(idempotency.ref), transaction.get(orderRef), transaction.get(saleRef),
      ]);
      const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
      if (replay) return replay;
      if (!orderSnap.exists) {
        const error = new Error('Pedido não encontrado.');
        error.code = 'not-found';
        throw error;
      }
      const current = orderSnap.data() || {};
      const { filterOrdersByScope } = require('./authorization');
      if (current.deletedAt || current.isDeleted || !filterOrdersByScope([{ ...current, id: order.id }], scope).length) {
        const error = new Error('Pedido não encontrado ou sem permissão para editá-lo.');
        error.code = 'not-found';
        throw error;
      }
      const currentVersion = Number.isSafeInteger(current.version) && current.version > 0 ? current.version : 1;
      if (currentVersion !== version) {
        const error = new Error(`O pedido foi alterado durante a operação. Consulte novamente e tente de novo (versão atual: ${currentVersion}).`);
        error.code = 'failed-precondition';
        throw error;
      }
      const orderUpdates = { ...updates, version: currentVersion + 1, updatedAt: now };
      if (args.items !== undefined) {
        orderUpdates.pricingMode = updates.items.length > 1 ? 'items' : 'unit';
        orderUpdates.unitPrice = updates.items.length === 1 ? updates.items[0].unitPrice : null;
      }
      if (requestedPrice !== undefined) {
        orderUpdates.totalPrice = updates.price;
        const payment = current.payment && typeof current.payment === 'object' ? current.payment : {};
        const paidAmount = Math.max(0, Number(payment.paidAmount) || 0);
        if (paidAmount > updates.price) {
          const error = new Error('O novo valor não pode ficar abaixo do total já recebido. Ajuste o valor recebido pelo fluxo financeiro autorizado.');
          error.code = 'failed-precondition';
          throw error;
        }
        const remainingAmount = Math.round((updates.price - paidAmount) * 100) / 100;
        const paymentStatus = paidAmount === 0 ? 'pending' : paidAmount === updates.price ? 'paid' : 'partial';
        orderUpdates.payment = { ...payment, status: paymentStatus, totalAmount: updates.price, paidAmount, remainingAmount };
      }
      transaction.update(orderRef, orderUpdates);
      if (saleSnap.exists) {
        const saleUpdates = { updatedAt: now };
        for (const field of ['customerName', 'customerPhone', 'productName', 'quantity', 'deliveryDate', 'items']) {
          if (updates[field] !== undefined) saleUpdates[field] = updates[field];
        }
        if (args.items !== undefined) {
          saleUpdates.pricingMode = orderUpdates.pricingMode;
          saleUpdates.unitPrice = orderUpdates.unitPrice;
        }
        if (requestedPrice !== undefined) {
          saleUpdates.amount = updates.price;
          saleUpdates.paymentStatus = orderUpdates.payment.status;
          saleUpdates.paidAmount = orderUpdates.payment.paidAmount;
        }
        transaction.update(saleRef, saleUpdates);
      } else if (requestedPrice !== undefined) {
        const payment = orderUpdates.payment;
        transaction.set(saleRef, {
          id: order.id,
          orderId: order.id,
          orderNumber: current.orderNumber || identifier,
          userId: current.userId || scope.uid,
          assignedTo: current.assignedTo || null,
          assignedToName: current.assignedToName || null,
          customerId: current.customerId || null,
          customerName: updates.customerName ?? current.customerName ?? 'Cliente não informado',
          customerPhone: updates.customerPhone ?? current.customerPhone ?? null,
          productName: updates.productName ?? current.productName ?? 'Produto',
          quantity: updates.quantity ?? current.quantity ?? 1,
          items: updates.items ?? current.items ?? [],
          pricingMode: orderUpdates.pricingMode ?? current.pricingMode ?? 'unit',
          unitPrice: orderUpdates.unitPrice ?? current.unitPrice ?? null,
          amount: updates.price,
          paymentStatus: payment.status,
          paidAmount: payment.paidAmount,
          paymentMethod: payment.method || null,
          date: current.createdAt || now,
          deliveryDate: updates.deliveryDate ?? current.deliveryDate ?? null,
          status: current.status || 'pending',
          isDeletedFromOrders: false,
          notes: updates.notes ?? current.notes ?? null,
          tags: current.tags || null,
          createdAt: current.createdAt || now,
          updatedAt: now,
        });
      }
      const response = { success: true, orderNumber: order.data.orderNumber || identifier, version: version + 1, message: 'Pedido atualizado.' };
      transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: now });
      return response;
    });
    return result;
  }

  /** Atualização de etapa com transição monotônica, prévia, versão e idempotência. */
  async executeUpdateOrderStatus(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'edit', 'atualizar a etapa de produção');
    const identifier = String(args.orderNumber || '').trim();
    const targetStatus = args.status;
    if (!identifier || !['in-progress', 'completed'].includes(targetStatus)) {
      const error = new Error('Informe o pedido e uma etapa de destino válida.');
      error.code = 'invalid-argument';
      throw error;
    }
    const db = this.repos.db;
    let idempotency = null;
    if (isConfirmed(args.confirmed)) {
      idempotency = getMcpIdempotencyContext(db, scope, 'update_order_status', args.idempotencyKey, args);
      const previous = await idempotency.ref.get();
      const replay = readIdempotentResult(previous, idempotency.payloadHash);
      if (replay) return replay;
    }
    const order = await this.repos.getScopedOrderDocument(scope, identifier);
    if (!order || order.data.deletedAt || order.data.isDeleted) {
      const error = new Error('Pedido não encontrado ou sem permissão para editá-lo.');
      error.code = 'not-found';
      throw error;
    }
    const statusAliases = {
      pending: 'pending', pendente: 'pending', received: 'pending', recebido: 'pending', in_contact: 'pending',
      'in-progress': 'in-progress', in_progress: 'in-progress', em_producao: 'in-progress', 'em produção': 'in-progress', 'em producao': 'in-progress', 'em-andamento': 'in-progress', em_andamento: 'in-progress', producao: 'in-progress', produção: 'in-progress',
      completed: 'completed', concluido: 'completed', concluído: 'completed', delivered: 'completed', entregue: 'completed', pronto: 'completed', finished: 'completed',
      cancelled: 'cancelled', canceled: 'cancelled', cancelado: 'cancelled', cancelada: 'cancelled',
    };
    const currentStatus = statusAliases[String(order.data.status || 'pending').toLowerCase().trim()];
    if (!currentStatus) {
      const error = new Error('O status atual do pedido não é reconhecido; nenhuma alteração foi feita.');
      error.code = 'failed-precondition';
      throw error;
    }
    const allowedNext = { pending: ['in-progress'], 'in-progress': ['completed'], completed: [], cancelled: [] };
    if (!allowedNext[currentStatus]?.includes(targetStatus)) {
      const error = new Error(`Transição não permitida: ${currentStatus} para ${targetStatus}. O fluxo só permite pendente → em produção → concluído.`);
      error.code = 'failed-precondition';
      throw error;
    }
    const version = Number.isSafeInteger(order.data.version) && order.data.version > 0 ? order.data.version : 1;
    if (!Number.isSafeInteger(args.expectedVersion) || args.expectedVersion !== version) {
      const error = new Error(`A versão do pedido mudou ou não foi informada. Consulte novamente antes de alterar (versão atual: ${version}).`);
      error.code = 'failed-precondition';
      throw error;
    }
    const preview = {
      orderNumber: order.data.orderNumber || identifier,
      customerName: order.data.customerName || '',
      fromStatus: currentStatus,
      toStatus: targetStatus,
      version,
    };
    if (!isConfirmed(args.confirmed)) return { success: true, status: 'preview', requiresConfirmation: true, preview, message: 'Mostre a mudança de etapa e só grave após confirmação explícita.' };
    if (typeof db?.runTransaction !== 'function') {
      const error = new Error('Gravação segura indisponível; a etapa não foi alterada.');
      error.code = 'failed-precondition';
      throw error;
    }
    const now = new Date().toISOString();
    return db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(order.id);
      const saleRef = db.collection('salesLedger').doc(order.id);
      const [idempotencySnap, orderSnap, saleSnap] = await Promise.all([
        transaction.get(idempotency.ref), transaction.get(orderRef), transaction.get(saleRef),
      ]);
      const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
      if (replay) return replay;
      if (!orderSnap.exists) {
        const error = new Error('Pedido não encontrado.');
        error.code = 'not-found';
        throw error;
      }
      const current = orderSnap.data() || {};
      if (current.deletedAt || current.isDeleted || !filterOrdersByScope([{ ...current, id: order.id }], scope).length) {
        const error = new Error('Pedido não encontrado ou sem permissão para editá-lo.');
        error.code = 'not-found';
        throw error;
      }
      const currentVersion = Number.isSafeInteger(current.version) && current.version > 0 ? current.version : 1;
      const liveStatus = statusAliases[String(current.status || 'pending').toLowerCase().trim()];
      if (currentVersion !== version || !liveStatus || liveStatus !== currentStatus || !allowedNext[liveStatus]?.includes(targetStatus)) {
        const error = new Error('O pedido mudou durante a operação. Consulte novamente e tente outra vez.');
        error.code = 'failed-precondition';
        throw error;
      }
      transaction.update(orderRef, { status: targetStatus, version: currentVersion + 1, updatedAt: now });
      if (saleSnap.exists) transaction.update(saleRef, { status: targetStatus, updatedAt: now });
      const response = { success: true, orderNumber: current.orderNumber || identifier, status: targetStatus, version: currentVersion + 1, message: 'Etapa do pedido atualizada.' };
      transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: now });
      return response;
    });
  }

  /** Atalho com schema restrito para alterações de entrega; reutiliza toda a validação transacional existente. */
  async executeUpdateDeliveryDetails(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'edit', 'alterar dados de entrega');
    if (args.deliveryDate === undefined && args.notes === undefined) {
      const error = new Error('Informe uma nova data ou observação de entrega.');
      error.code = 'invalid-argument';
      throw error;
    }
    return this.executeUpdateOrder({
      orderNumber: args.orderNumber,
      ...(args.deliveryDate !== undefined ? { deliveryDate: args.deliveryDate } : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
      expectedVersion: args.expectedVersion,
      idempotencyKey: `${String(args.idempotencyKey).slice(0, 119)}:delivery`,
      confirmed: args.confirmed,
    }, scope);
  }

  /** Cria um cliente com campos permitidos e confirmação explícita. */
  async executeCreateCustomer(args = {}, scope) {
    requireMcpModulePermission(scope, 'customers', 'create', 'cadastrar clientes');
    const fields = ['name', 'phone', 'email', 'street', 'number', 'complement', 'city', 'state', 'zipCode', 'notes'];
    const limits = { name: 200, phone: 50, email: 254, street: 200, number: 30, complement: 100, city: 100, state: 50, zipCode: 20, notes: 1000 };
    const customer = {};
    for (const field of fields) {
      if (args[field] === undefined) continue;
      if (typeof args[field] !== 'string' || args[field].length > limits[field]) throw new Error(`O campo ${field} é inválido ou excede ${limits[field]} caracteres.`);
      const value = args[field].trim();
      if (field === 'name' && !value) throw new Error('Nome do cliente é obrigatório.');
      if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Informe um e-mail válido.');
      customer[field] = value;
    }
    if (!customer.name) throw new Error('Nome do cliente é obrigatório.');
    const phoneDigits = String(customer.phone || '').replace(/\D/g, '');
    const preview = { ...customer };
    if (!isConfirmed(args.confirmed)) return { success: true, status: 'preview', requiresConfirmation: true, preview, message: 'Prévia pronta. Mostre os dados ao usuário e só cadastre após confirmação explícita.' };

    const db = this.repos.db;
    if (!db) throw new Error('Banco de dados indisponível.');
    const customerRef = db.collection('customers').doc();
    const idempotency = getMcpIdempotencyContext(db, scope, 'create_customer', args.idempotencyKey, args);
    const now = new Date().toISOString();
    const result = await db.runTransaction(async (transaction) => {
      const idempotencySnap = await transaction.get(idempotency.ref);
      const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
      if (replay) return replay;
      if (phoneDigits) {
        const duplicateQuery = db.collection('customers').where('phoneDigits', '==', phoneDigits);
        const duplicateSnap = await transaction.get(duplicateQuery);
        const { filterCustomersByScope } = require('./authorization');
        const duplicate = (duplicateSnap.docs || []).some((doc) => filterCustomersByScope([{ ...(doc.data() || {}), id: doc.id }], scope).length > 0);
        if (duplicate) throw new Error('Já existe um cliente acessível com este telefone. Consulte a base e atualize o cadastro existente.');
      }
      transaction.set(customerRef, {
        ...customer,
        phoneDigits,
        userId: scope.uid,
        createdBy: scope.uid,
        createdByName: scope.displayName || scope.email || 'ChatGPT',
        createdAt: now,
        updatedAt: now,
        totalOrders: 0,
        totalSpent: 0,
      });
      const response = { success: true, customerId: customerRef.id, message: 'Cliente cadastrado.' };
      transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: now });
      return response;
    });
    return result;
  }

  /** Atualiza somente campos de contato permitidos de um cliente autorizado. */
  async executeUpdateCustomer(args = {}, scope) {
    requireMcpModulePermission(scope, 'customers', 'edit', 'editar clientes');
    const customerId = String(args.customerId || '').trim();
    if (!customerId || customerId.includes('/')) throw new Error('Informe um ID de cliente válido.');
    const fields = ['name', 'phone', 'email', 'street', 'number', 'complement', 'city', 'state', 'zipCode', 'notes'];
    const limits = { name: 200, phone: 50, email: 254, street: 200, number: 30, complement: 100, city: 100, state: 50, zipCode: 20, notes: 1000 };
    const updates = {};
    for (const field of fields) {
      if (args[field] === undefined) continue;
      if (typeof args[field] !== 'string' || args[field].length > limits[field]) throw new Error(`O campo ${field} é inválido ou excede ${limits[field]} caracteres.`);
      const value = args[field].trim();
      if (field === 'name' && !value) throw new Error('O nome do cliente não pode ficar vazio.');
      if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Informe um e-mail válido.');
      updates[field] = value;
    }
    if (!Object.keys(updates).length) throw new Error('Informe pelo menos um campo para alterar.');
    const customer = await this.repos.getScopedCustomerDocument(scope, customerId);
    if (!customer || customer.data.deletedAt || customer.data.isDeleted) throw new Error('Cliente não encontrado ou sem permissão.');
    const preview = { customerId, currentName: customer.data.name || customer.data.fullName || '', changes: updates };
    if (!isConfirmed(args.confirmed)) return { success: true, status: 'preview', requiresConfirmation: true, preview, message: 'Prévia pronta. Mostre as alterações e só salve após confirmação explícita.' };

    const db = this.repos.db;
    const idempotency = getMcpIdempotencyContext(db, scope, 'update_customer', args.idempotencyKey, args);
    const customerRef = db.collection('customers').doc(customerId);
    const result = await db.runTransaction(async (transaction) => {
      const [idempotencySnap, customerSnap] = await Promise.all([transaction.get(idempotency.ref), transaction.get(customerRef)]);
      const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
      if (replay) return replay;
      if (!customerSnap.exists) throw new Error('Cliente não encontrado ou sem permissão.');
      const current = customerSnap.data() || {};
      const { filterCustomersByScope } = require('./authorization');
      if (!filterCustomersByScope([{ ...current, id: customerId }], scope).length) throw new Error('Cliente não encontrado ou sem permissão.');
      if (updates.phone !== undefined) {
        const phoneDigits = updates.phone.replace(/\D/g, '');
        if (phoneDigits) {
          const duplicateQuery = db.collection('customers').where('phoneDigits', '==', phoneDigits);
          const duplicateSnap = await transaction.get(duplicateQuery);
          const duplicate = (duplicateSnap.docs || []).some((doc) => doc.id !== customerId && filterCustomersByScope([{ ...(doc.data() || {}), id: doc.id }], scope).length > 0);
          if (duplicate) throw new Error('Já existe outro cliente acessível com este telefone.');
        }
        updates.phoneDigits = phoneDigits;
      }
      const now = new Date().toISOString();
      transaction.update(customerRef, { ...updates, updatedAt: now });
      const response = { success: true, customerId, message: 'Cliente atualizado.' };
      transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: now });
      return response;
    });
    return result;
  }

  /** Consulta histórico de pagamentos sem expor pedidos fora do escopo do usuário. */
  async executeQueryOrderPayments(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'view', 'consultar pagamentos de pedidos');
    const identifier = String(args.orderNumber || '').trim();
    if (!identifier) throw new Error('Informe o número ou ID do pedido.');
    const order = await this.repos.getScopedOrderDocument(scope, identifier);
    if (!order || order.data.deletedAt || order.data.isDeleted) throw new Error('Pedido não encontrado ou sem permissão.');
    const payment = order.data.payment || {};
    const totalAmount = Number(payment.totalAmount ?? order.data.price ?? order.data.totalPrice ?? 0);
    const paidAmount = Number(payment.paidAmount ?? order.data.paidAmount ?? 0);
    const remainingAmount = Math.max(0, roundMoney(totalAmount - paidAmount));
    return {
      orderNumber: order.data.orderNumber || identifier,
      customerName: order.data.customerName || '',
      totalAmount: roundMoney(totalAmount),
      paidAmount: roundMoney(paidAmount),
      remainingAmount,
      status: payment.status || (remainingAmount === 0 && totalAmount > 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'pending'),
      history: Array.isArray(payment.history) ? payment.history : [],
      historyAvailable: Array.isArray(payment.history),
    };
  }

  /** Registra um pagamento em transação, com saldo validado e idempotência. */
  async executeRegisterOrderPayment(args = {}, scope) {
    requireMcpModulePermission(scope, 'orders', 'edit', 'registrar pagamentos');
    const identifier = String(args.orderNumber || '').trim();
    const amount = roundMoney(args.amount);
    const method = normalizePaymentMethod(args.method);
    const idempotencyKey = String(args.idempotencyKey || '').trim();
    if (!identifier) throw new Error('Informe o número ou ID do pedido.');
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error('O valor do pagamento deve ser maior que zero e menor ou igual a R$ 1.000.000,00.');
    if (!method) throw new Error('Forma de pagamento inválida. Utilize PIX, dinheiro, crédito, débito ou transferência.');
    if (idempotencyKey.length < 8 || idempotencyKey.length > 128) throw new Error('Informe uma chave de idempotência entre 8 e 128 caracteres.');
    const notes = args.notes === undefined ? '' : String(args.notes).trim();
    if (notes.length > 300) throw new Error('A observação do pagamento deve ter no máximo 300 caracteres.');

    const order = await this.repos.getScopedOrderDocument(scope, identifier);
    if (!order || order.data.deletedAt || order.data.isDeleted) throw new Error('Pedido não encontrado ou sem permissão.');
    const currentPayment = order.data.payment || {};
    const totalAmount = roundMoney(currentPayment.totalAmount ?? order.data.price ?? order.data.totalPrice ?? 0);
    const paidAmount = roundMoney(currentPayment.paidAmount ?? order.data.paidAmount ?? 0);
    const remainingAmount = Math.max(0, roundMoney(totalAmount - paidAmount));
    if (amount > remainingAmount) throw new Error(`O pagamento supera o saldo do pedido (R$ ${remainingAmount.toFixed(2)}). Consulte os pagamentos antes de tentar novamente.`);
    const preview = {
      orderNumber: order.data.orderNumber || identifier,
      customerName: order.data.customerName || '',
      amount,
      method,
      currentPaidAmount: paidAmount,
      newPaidAmount: roundMoney(paidAmount + amount),
      remainingAfterPayment: roundMoney(remainingAmount - amount),
      notes,
    };
    if (!isConfirmed(args.confirmed)) return { success: true, status: 'preview', requiresConfirmation: true, preview, message: 'Prévia pronta. Mostre o valor, pedido e forma de pagamento ao usuário; só registre após confirmação explícita.' };

    const db = this.repos.db;
    const idempotency = getMcpIdempotencyContext(db, scope, 'register_order_payment', args.idempotencyKey, args);
    const paymentEntry = {
      amount,
      date: new Date().toISOString(),
      method,
      notes: notes || null,
      idempotencyKey,
      registeredBy: scope.uid,
      source: 'chatgpt-mcp',
    };
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(order.id);
      const saleRef = db.collection('salesLedger').doc(order.id);
      const [idempotencySnap, orderSnap, saleSnap] = await Promise.all([
        transaction.get(idempotency.ref), transaction.get(orderRef), transaction.get(saleRef),
      ]);
      const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
      if (replay) return { response: replay };
      if (!orderSnap.exists) throw new Error('Pedido não encontrado.');
      const current = orderSnap.data() || {};
      const { filterOrdersByScope } = require('./authorization');
      if (current.deletedAt || current.isDeleted || !filterOrdersByScope([{ ...current, id: order.id }], scope).length) {
        throw new Error('Pedido não encontrado ou sem permissão.');
      }
      const payment = current.payment || {};
      const liveTotal = roundMoney(payment.totalAmount ?? current.price ?? current.totalPrice ?? 0);
      const livePaid = roundMoney(payment.paidAmount ?? current.paidAmount ?? 0);
      const history = Array.isArray(payment.history) ? payment.history : [];
      const duplicate = history.find((entry) => entry?.idempotencyKey === idempotencyKey);
      if (duplicate) {
        if (roundMoney(duplicate.amount) !== amount || duplicate.method !== method || (duplicate.notes || '') !== (notes || '')) {
          const error = new Error('Esta chave de pagamento já foi usada com dados diferentes.');
          error.code = 'already-exists';
          throw error;
        }
        const response = { success: true, duplicate: true, orderNumber: current.orderNumber || identifier, payment: duplicate, message: 'Este pagamento já havia sido registrado; nenhuma duplicata foi criada.' };
        transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: paymentEntry.date });
        return { response };
      }
      const liveRemaining = Math.max(0, roundMoney(liveTotal - livePaid));
      if (amount > liveRemaining) throw new Error(`O saldo mudou durante a operação. Saldo atual: R$ ${liveRemaining.toFixed(2)}.`);
      const newPaid = roundMoney(livePaid + amount);
      const status = newPaid >= liveTotal && liveTotal > 0 ? 'paid' : 'partial';
      const newHistory = [...history, paymentEntry];
      const updatedPayment = {
        ...payment,
        status,
        method,
        totalAmount: liveTotal,
        paidAmount: newPaid,
        remainingAmount: roundMoney(liveTotal - newPaid),
        paymentDate: paymentEntry.date,
        history: newHistory,
      };
      const now = new Date().toISOString();
      transaction.update(orderRef, {
        payment: updatedPayment,
        version: (Number.isSafeInteger(current.version) && current.version > 0 ? current.version : 1) + 1,
        updatedAt: now,
      });
      if (saleSnap.exists) {
        transaction.update(saleRef, { paidAmount: newPaid, paymentStatus: status, paymentMethod: method, updatedAt: now });
      } else {
        transaction.set(saleRef, {
          id: order.id,
          orderId: order.id,
          orderNumber: current.orderNumber || '',
          userId: current.userId || scope.uid,
          assignedTo: current.assignedTo || null,
          assignedToName: current.assignedToName || null,
          customerId: current.customerId || null,
          customerName: current.customerName || 'Cliente não informado',
          customerPhone: current.customerPhone || null,
          productName: current.productName || 'Produto',
          quantity: Number(current.quantity) || 1,
          amount: liveTotal,
          paymentStatus: status,
          paidAmount: newPaid,
          paymentMethod: method,
          date: current.createdAt || now,
          deliveryDate: current.deliveryDate || null,
          status: current.status || 'pending',
          isDeletedFromOrders: false,
          createdAt: current.createdAt || now,
          updatedAt: now,
        });
      }
      const response = { success: true, orderNumber: current.orderNumber || identifier, paidAmount: newPaid, remainingAmount: updatedPayment.remainingAmount, status, message: `Pagamento de R$ ${amount.toFixed(2)} registrado no pedido ${current.orderNumber || identifier}.` };
      transaction.set(idempotency.ref, { payloadHash: idempotency.payloadHash, result: response, completed: true, createdAt: paymentEntry.date });
      return { response };
    });
    return result.response;
  }

  /**
   * Ferramenta 9: Rascunho de Pedido com Contrato Compatível (IA-03 & R03)
   */
  async executeExtractOrderDraft(args = {}, scope) {
    if (!args.customerName && !args.productSummary && !args.productName) {
      return await this.executeGetOrderForm(args, scope);
    }

    const identity = await this.resolveCustomerIdentity(args.customerName, args.customerPhone, scope);
    if (identity.ambiguous) {
      return { preparationStatus: 'identification_required', requiresIdentification: true,
        preparationNotice: 'Nome ambíguo. Informe o telefone ou identificador do cliente antes de preparar o rascunho.' };
    }
    const phone = identity.phone;

    const pName = args.productName || args.productSummary || 'Personalizado Luisices';

    let draftDeliveryDate = args.deliveryDate || '';
    const draftWarnings = [];
    if (draftDeliveryDate) {
      try {
        const dVal = validateAndNormalizeDeliveryDate(draftDeliveryDate);
        draftDeliveryDate = dVal.deliveryDate;
        if (dVal.isUrgent) {
          draftWarnings.push('Prazo urgente detectado: data de entrega em menos de 24-48 horas.');
        }
      } catch (dErr) {
        draftWarnings.push(`Atenção ao prazo: ${dErr.message}`);
      }
    }

    const draftLines = [
      `📝 **Rascunho de Pedido Preparado**`,
      `• **Cliente:** ${args.customerName || 'Cliente'}${phone ? ` (${normalizePhone(phone)})` : ''}`,
      `• **Produto:** ${pName}${args.quantity ? ` (${args.quantity} un)` : ''}`,
    ];
    if (args.theme) draftLines.push(`• **Tema:** ${args.theme}`);
    if (draftDeliveryDate) draftLines.push(`• **Data Prevista:** ${draftDeliveryDate}`);
    if (args.totalPrice != null && args.totalPrice !== '') draftLines.push(`• **Valor Estimado:** R$ ${Number(args.totalPrice).toFixed(2)}`);
    if (draftWarnings.length > 0) {
      draftLines.push(`⚠️ **Alertas:** ${draftWarnings.join(' | ')}`);
    }
    draftLines.push(`\n💡 *Para confirmar e salvar oficialmente este pedido na fila do ateliê, execute a ferramenta create_order com estes dados.*`);
    const formattedSummary = draftLines.join('\n');

    return {
      preparationStatus: 'draft_prepared',
      customerName: args.customerName || 'Cliente',
      customerPhone: normalizePhone(phone),
      productName: pName,
      productSummary: pName,
      quantity: args.quantity != null && Number(args.quantity) > 0 && Number.isFinite(Number(args.quantity)) ? Number(args.quantity) : undefined,
      totalPrice: args.totalPrice != null && args.totalPrice !== '' && Number.isFinite(Number(args.totalPrice)) ? Number(args.totalPrice) : undefined,
      paidAmount: args.paidAmount != null && args.paidAmount !== '' && Number.isFinite(Number(args.paidAmount)) ? Number(args.paidAmount) : undefined,
      deliveryDate: draftDeliveryDate,
      theme: args.theme || '',
      notes: args.notes || '',
      warnings: draftWarnings.length > 0 ? draftWarnings : undefined,
      formattedSummary,
      nextActionHint: 'Para gravar e registrar oficialmente este pedido na fila de produção do sistema Luisices, execute a ferramenta create_order com estes parâmetros.',
    };
  }

  /**
   * Ferramenta 10: Criar e Registrar Pedido no Sistema (via ChatGPT / MCP)
   */
  async executeCreateOrder(args = {}, scope) {
    if (!scope || !scope.uid) {
      throw new Error('Usuário não autenticado.');
    }

    requireMcpModulePermission(scope, 'orders', 'create', 'criar pedidos');

    // O contrato original de create_order não incluía confirmed. Esses clientes
    // invocam uma ação de gravação após autorização no host. A prévia permanece
    // disponível explicitamente, sem transformar chamadas antigas em rascunhos.
    if (args.confirmed !== undefined && ![true, false, 'true', 'false'].includes(args.confirmed)) {
      const error = new Error('confirmed deve ser verdadeiro ou falso.');
      error.code = 'invalid-argument';
      throw error;
    }
    const previewOnly = args.confirmed === false || args.confirmed === 'false';

    const cleanCustomer = String(args.customerName || '').trim();
    if (!cleanCustomer) {
      throw new Error('Nome do cliente é obrigatório para registrar o pedido.');
    }

    const cleanProduct = String(args.productName || args.productSummary || '').trim();
    if (!cleanProduct) {
      throw new Error('Nome do produto é obrigatório para registrar o pedido.');
    }

    const rawQuantity = Number(args.quantity);
    const rawTotalPrice = Number(args.totalPrice);
    const rawPaidAmount = args.paidAmount === undefined ? 0 : Number(args.paidAmount);
    if (!Number.isSafeInteger(rawQuantity) || rawQuantity < 1 || rawQuantity > 100000) {
      const error = new Error('A quantidade deve ser um inteiro entre 1 e 100000.');
      error.code = 'invalid-argument';
      throw error;
    }
    if (!Number.isFinite(rawTotalPrice) || rawTotalPrice < 0 || rawTotalPrice > 10000000) {
      const error = new Error('O valor total deve estar entre R$ 0,00 e R$ 10.000.000,00.');
      error.code = 'invalid-argument';
      throw error;
    }
    if (!Number.isFinite(rawPaidAmount) || rawPaidAmount < 0 || rawPaidAmount > rawTotalPrice) {
      const error = new Error('O valor pago deve ser não negativo e não pode superar o total do pedido.');
      error.code = 'invalid-argument';
      throw error;
    }
    const cleanQuantity = rawQuantity;
    const cleanTotalPrice = roundMoney(rawTotalPrice);
    const cleanPaidAmount = roundMoney(rawPaidAmount);
    if ((cleanPaidAmount > 0 || args.paymentMethod !== undefined) && !scope.mcpScopes?.includes('payments:write')) {
      const error = new Error('A permissão Registrar Pagamentos é necessária para informar um pagamento inicial no pedido.');
      error.code = 'permission-denied';
      throw error;
    }
    const remainingAmount = Math.max(0, Math.round((cleanTotalPrice - cleanPaidAmount) * 100) / 100);

    // Validação rigorosa de prazo no fuso de Brasília
    const dateValidation = validateAndNormalizeDeliveryDate(args.deliveryDate);
    const rawDate = dateValidation.deliveryDate;

    // Busca cliente na base
    let customerPhone = normalizePhone(args.customerPhone || '');
    let customerId = null;
    try {
      const identity = await this.resolveCustomerIdentity(cleanCustomer, customerPhone, scope);
      if (identity && identity.phone) {
        customerPhone = identity.phone;
      }
      const custMatches = await this.repos.getScopedCustomers(scope, { searchTerm: cleanCustomer });
      const found = (custMatches.customers || []).find(
        (c) => String(c.name || '').toLowerCase().trim() === cleanCustomer.toLowerCase()
      );
      if (found) {
        customerId = found.id;
        if (!customerPhone && found.phone) {
          customerPhone = normalizePhone(found.phone);
        }
      }
    } catch (_cErr) {
      // Ignora erro de busca de cliente
    }

    // Determina status de pagamento
    let paymentStatus = 'pending';
    if (cleanPaidAmount >= cleanTotalPrice && cleanTotalPrice > 0) {
      paymentStatus = 'completed';
    } else if (cleanPaidAmount > 0) {
      paymentStatus = 'partial';
    }

    // ─── Trava de Alçada e Análise de Risco Financeiro ───
    const isHighValue = cleanTotalPrice >= 500;
    const isSuperHighValue = cleanTotalPrice >= 1500;
    const isZeroDeposit = cleanPaidAmount === 0 && cleanTotalPrice > 0;
    const minimumRecommendedDeposit = Math.round(cleanTotalPrice * 0.3 * 100) / 100;

    let requiresFinancialApproval = false;
    let financialWarning = null;

    if (isSuperHighValue && isZeroDeposit && !scope.isAdmin) {
      requiresFinancialApproval = true;
      financialWarning = `Pedido de grande porte (R$ ${cleanTotalPrice.toFixed(2)}) registrado sem entrada. A produção aguardará aprovação da administração ou pagamento de sinal mínimo (R$ ${minimumRecommendedDeposit.toFixed(2)}).`;
    } else if (isHighValue && isZeroDeposit) {
      financialWarning = `Atenção: Pedido com valor de R$ ${cleanTotalPrice.toFixed(2)} registrado sem sinal. Recomenda-se cobrar pelo menos R$ ${minimumRecommendedDeposit.toFixed(2)} antes de iniciar a produção.`;
    }

    // Tags
    const tags = [{ name: 'ChatGPT', color: '#10a37f' }];
    if (dateValidation.isUrgent) {
      tags.push({ name: 'Prazo Urgente', color: '#ef4444' });
    }
    if (isZeroDeposit && cleanTotalPrice > 0) {
      tags.push({ name: 'Aguardando Sinal', color: '#f59e0b' });
    }
    if (Array.isArray(args.tags)) {
      for (const t of args.tags) {
        if (typeof t === 'string' && t.trim() && t.trim().toLowerCase() !== 'chatgpt' && t.trim().toLowerCase() !== 'prazo urgente' && t.trim().toLowerCase() !== 'aguardando sinal') {
          tags.push({ name: t.trim(), color: '#6366f1' });
        }
      }
    }

    // Observações
    let cleanNotes = String(args.notes || '').trim();
    if (args.theme) {
      cleanNotes = cleanNotes ? `Tema: ${args.theme}\n${cleanNotes}` : `Tema: ${args.theme}`;
    }

    if (previewOnly) {
      return {
        success: true,
        status: 'preview',
        requiresConfirmation: true,
        preview: {
          customerName: cleanCustomer,
          customerPhone: customerPhone || null,
          productName: cleanProduct,
          quantity: cleanQuantity,
          totalPrice: cleanTotalPrice,
          paidAmount: cleanPaidAmount,
          remainingAmount,
          deliveryDate: rawDate,
          theme: args.theme || null,
          notes: cleanNotes || null,
          paymentMethod: args.paymentMethod || null,
        },
        message: 'Prévia do pedido gerada com sucesso. Apresente os dados com clareza ao usuário e confirme se deseja oficializar a gravação.',
      };
    }

    const db = this.repos.db;
    const uid = scope.uid;
    const year = new Date().getFullYear();

    // Omitido e true representam a mesma operação de criação. Normalizar evita
    // conflito na repetição após uma atualização do schema do conector e mantém
    // compatibilidade com hashes já gravados com confirmed=true.
    const idempotency = getMcpIdempotencyContext(db, scope, 'create_order', args.idempotencyKey, { ...args, confirmed: true });

    const orderRef = db.collection('orders').doc();
    const orderId = orderRef.id;

    let FieldValue = null;
    try {
      FieldValue = require('firebase-admin/firestore').FieldValue;
    } catch (_e) {
      // fallback
    }

    if (typeof db.runTransaction !== 'function') {
      const error = new Error('A gravação segura não está disponível; o pedido não foi criado.');
      error.code = 'failed-precondition';
      throw error;
    }
    const creationResult = await db.runTransaction(async (transaction) => {
        const idempotencySnap = await transaction.get(idempotency.ref);
        const replay = readIdempotentResult(idempotencySnap, idempotency.payloadHash);
        if (replay) return { ...replay, replayed: true };
        const counterRef = db.doc(`users/${uid}/metadata/counters`);
        const counterSnap = await transaction.get(counterRef);
        const currentCount = counterSnap.exists ? Number(counterSnap.data()?.orderCounter || 0) : 0;
        const nextCount = currentCount + 1;
        const orderNumber = `#${year}-${String(nextCount).padStart(4, '0')}`;

        transaction.set(counterRef, { orderCounter: nextCount }, { merge: true });

        const newOrderDoc = {
          userId: uid,
          createdByName: scope.displayName || scope.email || 'ChatGPT Assistant',
          createdByUid: uid,
          orderNumber,
          customerName: cleanCustomer,
          customerPhone: customerPhone || '',
          customerId: customerId || null,
          productName: cleanProduct,
          quantity: cleanQuantity,
          price: cleanTotalPrice,
          totalPrice: cleanTotalPrice,
          status: 'pending',
          deliveryDate: rawDate,
          notes: cleanNotes || null,
          theme: args.theme || null,
          tags,
          assignedTo: null,
          assignedToName: null,
          assignedAt: null,
          assignedBy: null,
          payment: {
            status: paymentStatus,
            method: args.paymentMethod || (cleanPaidAmount > 0 ? 'pix' : null),
            totalAmount: cleanTotalPrice,
            paidAmount: cleanPaidAmount,
            remainingAmount,
            paymentDate: cleanPaidAmount > 0 ? new Date().toISOString() : null,
            notes: null,
            history: cleanPaidAmount > 0 ? [{
              amount: cleanPaidAmount,
              date: new Date().toISOString(),
              method: args.paymentMethod || 'sinal',
              notes: 'Sinal registrado via ChatGPT'
            }] : null,
          },
          source: 'chatgpt-mcp',
          idempotencyKey: String(args.idempotencyKey).trim(),
          requiresFinancialApproval: Boolean(requiresFinancialApproval),
          financialWarning: financialWarning || null,
          productionWorkflow: {
            currentStep: 'design',
            steps: {
              design: { completed: false },
              approval: { completed: false },
              printing: { completed: false },
              cutting: { completed: false },
              assembly: { completed: false },
              'quality-check': { completed: false },
              packaging: { completed: false },
            },
            startedAt: new Date().toISOString(),
          },
          version: 1,
          createdAt: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
          updatedAt: FieldValue && FieldValue.serverTimestamp ? FieldValue.serverTimestamp() : new Date().toISOString(),
          deletedAt: null,
        };

        transaction.set(orderRef, newOrderDoc);
        const result = { orderId, orderNumber };
        transaction.set(idempotency.ref, {
          payloadHash: idempotency.payloadHash,
          result,
          completed: true,
          createdAt: new Date().toISOString(),
        });
        return { ...result, replayed: false };
      });
    const createdOrderNumber = creationResult.orderNumber;

    let brDisplayDate = rawDate;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split('-');
      brDisplayDate = `${d}/${m}/${y}`;
    }

    const summaryLines = [
      `✅ **Pedido ${createdOrderNumber} Registrado no Sistema Luisices!**`,
      `• **Cliente:** ${cleanCustomer}${customerPhone ? ` (${customerPhone})` : ''}`,
      `• **Produto:** ${cleanProduct} (${cleanQuantity} un)`,
    ];
    if (args.theme) summaryLines.push(`• **Tema:** ${args.theme}`);
    summaryLines.push(
      `• **Data de Entrega:** ${brDisplayDate} (${dateValidation.diffDays === 0 ? 'Hoje' : dateValidation.diffDays === 1 ? 'Amanhã' : `em ${dateValidation.diffDays} dias`})`
    );
    summaryLines.push(
      `• **Financeiro:** Total R$ ${cleanTotalPrice.toFixed(2)} | Sinal pago: R$ ${cleanPaidAmount.toFixed(2)} | Saldo a receber: R$ ${remainingAmount.toFixed(2)}`
    );
    summaryLines.push(`• **Fila de Produção:** Etapa Inicial (Design)`);
    if (financialWarning) {
      summaryLines.push(`⚠️ **Aviso Financeiro:** ${financialWarning}`);
    }
    if (dateValidation.isUrgent) {
      summaryLines.push(`🚨 **Urgência:** Pedido com tag de Prazo Urgente.`);
    }

    const formattedSummary = summaryLines.join('\n');

    return {
      success: true,
      orderId: creationResult.orderId,
      orderNumber: createdOrderNumber,
      customerName: cleanCustomer,
      customerPhone: customerPhone || 'Não informado',
      productName: cleanProduct,
      quantity: cleanQuantity,
      totalPrice: cleanTotalPrice,
      paidAmount: cleanPaidAmount,
      remainingAmount,
      paymentStatus,
      deliveryDate: rawDate,
      status: 'pending',
      requiresFinancialApproval,
      financialWarning: financialWarning || undefined,
      formattedSummary,
      isDuplicate: creationResult.replayed,
      message: creationResult.replayed
        ? `Pedido ${createdOrderNumber} já havia sido criado para ${cleanCustomer}; nenhuma duplicata foi gravada.`
        : `Pedido ${createdOrderNumber} criado com sucesso para ${cleanCustomer}!`,
    };
  }

  async executeCalculateArtisanPricing(args = {}, scope) {
    const productName = String(args.productName || 'Encomenda').trim();
    const quantity = args.quantity === undefined ? 1 : Number(args.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
      const error = new Error('Quantidade inválida: informe um número inteiro entre 1 e 100.000.');
      error.code = 'invalid-argument';
      throw error;
    }
    const pricingMode = args.pricingMode === undefined || args.pricingMode === 'margem' ? 'margem' : 'markup';
    const selectedPercent = pricingMode === 'markup'
      ? (args.markupPercent === undefined ? 100 : Number(args.markupPercent))
      : (args.profitMarginPercent === undefined ? 50 : Number(args.profitMarginPercent));
    const maxPercent = pricingMode === 'markup' ? 1000 : 95;
    if (!Number.isFinite(selectedPercent) || selectedPercent < 0 || selectedPercent > maxPercent) {
      const error = new Error(`Percentual inválido: informe valor entre 0 e ${maxPercent}%.`);
      error.code = 'invalid-argument';
      throw error;
    }

    let itemsCostTotal = 0;
    const itemBreakdown = [];
    if (Array.isArray(args.items)) {
      for (const item of args.items) {
        const qty = Number(item.quantity);
        const unit = Number(item.unitCost);
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unit) || unit < 0) {
          const error = new Error('Insumos devem ter quantidade e custo unitário não negativos.');
          error.code = 'invalid-argument';
          throw error;
        }
        const sub = Math.round(qty * unit * 100) / 100;
        itemsCostTotal += sub;
        itemBreakdown.push({
          name: item.name || 'Insumo',
          quantity: qty,
          unitCost: unit,
          subtotalCost: sub,
        });
      }
    }

    const laborTimeMinutes = args.laborTimeMinutes === undefined ? 0 : Number(args.laborTimeMinutes);
    if (!Number.isFinite(laborTimeMinutes) || laborTimeMinutes < 0 || laborTimeMinutes > 60000) {
      const error = new Error('Tempo de trabalho inválido: informe minutos entre 0 e 60.000.');
      error.code = 'invalid-argument';
      throw error;
    }
    const estimate = await this.executePricingEstimate({
      productName,
      quantity,
      rawMaterialsCost: itemsCostTotal / quantity,
      customizationCost: 0,
      laborTimeMinutes: laborTimeMinutes / quantity,
      profitMarginPercent: selectedPercent,
      pricingMode,
      ...(args.hourlyRate !== undefined ? { hourlyRate: args.hourlyRate } : {}),
    }, scope);
    const totalCost = Math.round(estimate.unitCost * quantity * 100) / 100;
    const laborCost = Math.round((estimate.breakdown.specializedLabor * quantity) * 100) / 100;
    const suggestedTotalPrice = estimate.suggestedTotalPrice;
    const unitPrice = estimate.suggestedUnitPrice;
    const markupPercent = pricingMode === 'markup' ? selectedPercent : 0;
    const profitMarginPercent = pricingMode === 'margem' ? selectedPercent : 0;

    const depositPct = args.depositOption === '30' ? 30 : args.depositOption === '100' ? 100 : 50;
    const depositAmount = Math.round(suggestedTotalPrice * (depositPct / 100) * 100) / 100;
    const remainingAmount = Math.round((suggestedTotalPrice - depositAmount) * 100) / 100;

    return {
      success: true,
      productName,
      quantity,
      pricingMode,
      itemsCostTotal,
      laborCost,
      totalCost,
      suggestedTotalPrice,
      unitPrice,
      suggestedUnitPrice: unitPrice,
      depositPercentage: depositPct,
      depositAmount,
      remainingAmount,
      itemBreakdown,
      paymentFeePercent: estimate.inputs.paymentFeePercent.value,
      breakdown: estimate.breakdown,
      assumptions: estimate.assumptions,
      formattedSummary: `💰 **Precificação calculada para "${productName}" (${quantity} un):**\n• Custo total de insumos e mão de obra: R$ ${totalCost.toFixed(2)}\n• Preço final sugerido (${pricingMode === 'markup' ? `Markup ${markupPercent}%` : `Margem ${profitMarginPercent}%`}): R$ ${suggestedTotalPrice.toFixed(2)} (R$ ${unitPrice.toFixed(2)}/un)\n• Sinal (${depositPct}%): R$ ${depositAmount.toFixed(2)} | Saldo restante: R$ ${remainingAmount.toFixed(2)}\n• Taxa de pagamento: ${estimate.inputs.paymentFeePercent.value}% (configuração do ateliê)`,
    };
  }

  async executeListSupplies(args = {}, scope) {
    const supplies = await this.repos.getSupplies(scope);
    const searchTerm = String(args.searchTerm || '').toLowerCase().trim();
    let filtered = supplies;
    if (searchTerm) {
      filtered = supplies.filter((s) => s.name.toLowerCase().includes(searchTerm) || s.category.toLowerCase().includes(searchTerm));
    }
    const limit = Math.min(100, Math.max(1, Number(args.limit) || 50));
    const resultList = filtered.slice(0, limit);
    return {
      success: true,
      totalCount: filtered.length,
      supplies: resultList,
      formattedSummary: `📦 Encontrados ${resultList.length} insumos de estoque:\n` + resultList.map((s) => `• ${s.name}: R$ ${s.unitCost.toFixed(2)}/un | Estoque: ${s.currentStock || 0}`).join('\n'),
    };
  }

  async executeListPricingModels(args = {}, scope) {
    const recipes = await this.repos.getPricingRecipes(scope, { limit: args.limit || 20 });
    const searchTerm = String(args.searchTerm || '').toLowerCase().trim();
    let filtered = recipes;
    if (searchTerm) {
      filtered = recipes.filter((r) => r.productName.toLowerCase().includes(searchTerm) || r.category.toLowerCase().includes(searchTerm));
    }
    return {
      success: true,
      totalCount: filtered.length,
      models: filtered,
      formattedSummary: `📋 Encontrados ${filtered.length} modelos de precificação salvos:\n` + filtered.map((r) => `• ${r.productName} (R$ ${r.suggestedUnitPrice.toFixed(2)})`).join('\n'),
    };
  }

  async executeGetPricingModel(args = {}, scope) {
    const model = await this.repos.getPricingRecipeById(scope, args.modelId);
    if (!model) {
      const err = new Error('Modelo de precificação não encontrado.');
      err.code = 'not-found';
      throw err;
    }
    return {
      success: true,
      model,
      formattedSummary: `📐 **Modelo Salvo: "${model.productName}"**\n• Preço Sugerido: R$ ${model.suggestedUnitPrice.toFixed(2)}\n• Método: ${model.pricingMethod === 'markup_on_cost' ? 'Markup sobre Custo' : 'Margem sobre Venda'}\n• Insumos: ${model.items.length} itens cadastrados.`,
    };
  }

  async executeSavePricingModel(args = {}, scope) {
    requireMcpModulePermission(scope, 'pricing', 'create', 'salvar modelos de precificação');
    if (!isConfirmed(args.confirmed)) {
      return {
        success: true,
        preview: true,
        productName: args.productName,
        pricingMethod: args.pricingMethod || 'markup_on_cost',
        message: `Prévia da gravação do modelo "${args.productName}". Confirme para salvar.`,
      };
    }

    const saved = await this.repos.savePricingRecipe(scope, args);
    return {
      success: true,
      modelId: saved.id,
      productName: saved.productName,
      message: `Modelo "${saved.productName}" salvo com sucesso!`,
    };
  }

  async executeQueryQuotes(args = {}, scope) {
    const quotes = await this.repos.getQuotes(scope, { limit: args.limit || 20 });
    const searchTerm = String(args.searchTerm || '').toLowerCase().trim();
    const statusFilter = String(args.status || 'all').toLowerCase();

    let filtered = quotes;
    if (statusFilter !== 'all') {
      filtered = filtered.filter((q) => q.status.toLowerCase() === statusFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter((q) => q.customerName.toLowerCase().includes(searchTerm) || q.quoteNumber.toLowerCase().includes(searchTerm));
    }

    return {
      success: true,
      totalCount: filtered.length,
      quotes: filtered,
      formattedSummary: `📝 Encontrados ${filtered.length} orçamentos:\n` + filtered.map((q) => `• ${q.quoteNumber} | ${q.customerName} - R$ ${q.totalPrice.toFixed(2)} [Status: ${q.status}]`).join('\n'),
    };
  }

  async executeCreateQuote(args = {}, scope) {
    requireMcpModulePermission(scope, 'quotes', 'create', 'criar orçamentos');
    if (!isConfirmed(args.confirmed)) {
      return {
        success: true,
        preview: true,
        customerName: args.customerName,
        totalPrice: args.totalPrice,
        message: `Prévia do orçamento para ${args.customerName} (R$ ${args.totalPrice}). Confirme para gerar o orçamento oficial.`,
      };
    }

    const quote = await this.repos.createQuote(scope, args);
    return {
      success: true,
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      customerName: quote.customerName,
      totalPrice: quote.totalPrice,
      message: `Orçamento ${quote.quoteNumber} gerado com sucesso para ${quote.customerName}!`,
    };
  }

  async executeUpdateQuoteStatus(args = {}, scope) {
    requireMcpModulePermission(scope, 'quotes', 'edit', 'atualizar orçamentos');
    if (!isConfirmed(args.confirmed)) {
      return {
        success: true,
        preview: true,
        quoteNumber: args.quoteNumber,
        status: args.status,
        convertToOrder: Boolean(args.convertToOrder),
        message: `Prévia da atualização do orçamento ${args.quoteNumber} para ${args.status}. Confirme para aplicar.`,
      };
    }

    if (args.convertToOrder && !scope?.mcpScopes?.includes('*') && !scope?.mcpScopes?.includes('orders:create')) {
      const error = new Error('Permissão insuficiente para criar pedidos a partir de orçamentos.');
      error.code = 'permission-denied';
      throw error;
    }

    const updated = await this.repos.updateQuoteStatus(scope, args.quoteNumber, args.status);
    let orderCreated = null;

    if (args.status === 'approved' && args.convertToOrder) {
      const quotes = await this.repos.getQuotes(scope, { limit: 10 });
      const targetQuote = quotes.find((q) => q.id === updated.id || q.quoteNumber === updated.quoteNumber);
      if (targetQuote) {
        orderCreated = await this.executeCreateOrder({
          customerName: targetQuote.customerName,
          customerPhone: targetQuote.customerPhone,
          productName: targetQuote.productName,
          quantity: 1,
          totalPrice: targetQuote.totalPrice,
          // Aprovar o orçamento não comprova que o sinal foi recebido.
          paidAmount: 0,
          deliveryDate: args.deliveryDate || getBusinessDate(new Date(Date.now() + 7 * 86400000)),
          idempotencyKey: args.idempotencyKey || `conv-quote-${updated.id}`,
          confirmed: true,
        }, scope);
      }
    }

    return {
      success: true,
      quoteNumber: updated.quoteNumber,
      status: updated.status,
      orderCreated: orderCreated ? orderCreated.orderNumber : undefined,
      message: orderCreated
        ? `Orçamento ${updated.quoteNumber} aprovado e convertido no pedido ${orderCreated.orderNumber}!`
        : `Status do orçamento ${updated.quoteNumber} atualizado para ${updated.status}.`,
    };
  }

  async executeListStoreProducts(args = {}, scope) {
    const products = await this.repos.getStoreProducts();
    const searchTerm = String(args.searchTerm || '').toLowerCase().trim();
    let filtered = products;
    if (searchTerm) {
      filtered = products.filter((p) => p.name.toLowerCase().includes(searchTerm) || p.category.toLowerCase().includes(searchTerm));
    }
    const limit = Math.min(50, Math.max(1, Number(args.limit) || 20));
    const result = filtered.slice(0, limit);
    return {
      success: true,
      totalCount: filtered.length,
      products: result,
      formattedSummary: `🛒 Encontrados ${result.length} produtos na loja virtual:\n` + result.map((p) => `• ${p.name} - R$ ${p.price.toFixed(2)}`).join('\n'),
    };
  }
}

module.exports = {
  AiToolsExecutor,
  getPeriodInterval,
  normalizePhone,
  validateAndNormalizeDeliveryDate,
};
