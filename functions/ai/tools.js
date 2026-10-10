/**
 * Execução Segura e Validada das Ferramentas de Negócio do Copiloto - Luisices
 */

const { BUSINESS_TIMEZONE, TOOL_LIMITS } = require('./config');
const { calculateRecipePricing, calculateHourlyRate, DEFAULT_PRICING_SETTINGS } = require('./pricing/pricingCalculator');

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

  if (cleanPeriod === 'week' || cleanPeriod === 'semana' || cleanPeriod === 'ultimos_7_dias') {
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

    let orders = await this.repos.getScopedOrders(scope);

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
    const totalReceived = validOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const pendingReceivables = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.remainingAmount !== undefined ? o.remainingAmount : (o.totalPrice - (o.paidAmount || 0))) || 0), 0);

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
    const orders = (await this.repos.getScopedOrders(scope)).filter((o) => !o.isDeleted);
    const todayDate = new Date().toISOString().split('T')[0];

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

    const pendingPaymentOrders = validOrders.filter((o) => o.paymentStatus !== 'paid');
    const pendingPaymentTotal = pendingPaymentOrders.reduce(
      (acc, curr) => acc + (Number(curr.remainingAmount !== undefined ? curr.remainingAmount : (curr.totalPrice - (curr.paidAmount || 0))) || 0),
      0
    );
    const realizedRevenue = completedOrders.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
    const totalReceived = validOrders.reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

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
    const orders = await this.repos.getScopedOrders(scope);
    let filtered = orders;

    if (args.status && args.status !== 'all') {
      filtered = filtered.filter((o) => o.status === args.status);
    }

    if (args.searchTerm) {
      const term = String(args.searchTerm).toLowerCase().trim();
      const phoneDigits = term.replace(/\D/g, '');
      filtered = filtered.filter((o) => {
        const numMatch = o.orderNumber && o.orderNumber.toLowerCase().includes(term);
        const nameMatch = o.customerName && o.customerName.toLowerCase().includes(term);
        const prodMatch = (o.productName || o.productSummary) && (o.productName || o.productSummary).toLowerCase().includes(term);
        const phoneMatch = phoneDigits && o.customerPhone && o.customerPhone.replace(/\D/g, '').includes(phoneDigits);
        return numMatch || nameMatch || prodMatch || phoneMatch;
      });
    }

    const limit = Math.min(Math.max(Number(args.limit) || TOOL_LIMITS.ORDERS_PAGE_LIMIT, 1), 50);
    return {
      orders: filtered.slice(0, limit),
      totalFound: filtered.length,
      hasMore: filtered.length > limit,
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
        const allOrders = await this.repos.getScopedOrders(scope);
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
              collaboratorFound: matchedMember ? { name: matchedMember.name, email: matchedMember.email } : { identifier: term },
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
    const read = (field, fallback, configField, min = 0, max = Infinity) => {
      const supplied = args[field] !== undefined;
      const value = supplied ? parse(args[field], field, min, max) : fallback;
      const source = supplied ? 'argument' : (configField ? inputs[configField].source : 'default');
      inputs[field] = { value, source, label: labels[field], ...(configField ? { configurationField: configField } : {}) };
      return value;
    };
    // Valida ambos os aliases; divergência é ambígua, não deve ser resolvida silenciosamente.
    const alias = args.unitCostRaw !== undefined ? parse(args.unitCostRaw, 'unitCostRaw') : undefined;
    const raw = args.rawMaterialsCost !== undefined ? parse(args.rawMaterialsCost, 'rawMaterialsCost') : undefined;
    if (alias !== undefined && raw !== undefined && alias !== raw) invalid('unitCostRaw/rawMaterialsCost (valores divergentes)');
    const rawCost = raw ?? alias ?? 15;
    inputs.rawMaterialsCost = { value: rawCost, source: raw !== undefined || alias !== undefined ? 'argument' : 'default', label: labels.rawMaterialsCost, argumentFields: ['rawMaterialsCost', 'unitCostRaw'].filter((key) => args[key] !== undefined) };
    const qty = read('quantity', 1, null, 1);
    if (!Number.isSafeInteger(qty)) invalid('quantity');
    const customCost = read('customizationCost', 5);
    const laborTimeMinutes = read('laborTimeMinutes', 15);
    const setupTimeMinutes = read('setupTimeMinutes', 0);
    const profitMarginPercent = read('profitMarginPercent', studioSettings.defaultProfitMarginPercent, 'defaultProfitMarginPercent', 0, 95);
    const paymentFeePercent = read('paymentFeePercent', studioSettings.defaultPaymentFeePercent, 'defaultPaymentFeePercent');
    const wasteMarginPercent = read('wasteMarginPercent', studioSettings.defaultWasteMarginPercent, 'defaultWasteMarginPercent');
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

    const calcResult = calculateRecipePricing({
      items,
      wasteMarginPercent,
      laborMode: 'time',
      productionTimeMinutes: laborTimeMinutes,
      setupTimeMinutes,
      profitMarginPercent,
      paymentFeePercent,
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
      profitMarginPercent, paymentFeePercent, settings: studioSettings,
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

    const orders = (await this.repos.getScopedOrders(scope)).filter((order) => !order.isDeleted);
    const cleanTarget = String(orderNumber || '').toLowerCase().replace('#', '').trim();
    const nameTarget = String(recipientName).trim().toLowerCase();
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
        totalPrice: realOrder.totalPrice,
        paidAmount: realOrder.paidAmount,
        remainingAmount: realOrder.remainingAmount,
        status: realOrder.status,
        paymentStatus: realOrder.paymentStatus,
        deliveryDate: realOrder.deliveryDate,
      };

      if (realOrder.status === 'cancelled') {
        generatedText = `Olá, ${realOrder.customerName}! Consta em nosso sistema que o pedido ${realOrder.orderNumber} (${realOrder.productSummary}) foi cancelado. Se desejar reativar ou tiver dúvidas, estamos à disposição! ✨`;
      } else if (normalizedType === 'cobranca') {
        if (realOrder.paymentStatus === 'paid' || remaining <= 0) {
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

    const allScopedOrders = await this.repos.getScopedOrders(scope);

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
    const totalReceived = validOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const pendingReceivables = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.remainingAmount !== undefined ? o.remainingAmount : (o.totalPrice - (o.paidAmount || 0))) || 0), 0);

    const averageTicket = completedOrders.length > 0
      ? realizedRevenue / completedOrders.length
      : validOrders.length > 0
        ? grossIssuedVolume / validOrders.length
        : 0;

    const sampleOrders = orders.slice(0, 10).map((o) => ({
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      productName: o.productName || o.productSummary,
      totalPrice: Number((Number(o.totalPrice) || 0).toFixed(2)),
      paidAmount: Number((Number(o.paidAmount) || 0).toFixed(2)),
      status: o.status,
      deliveryDate: o.deliveryDate,
    }));

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
   * Ferramenta 9: Rascunho de Pedido com Contrato Compatível (IA-03 & R03)
   */
  async executeExtractOrderDraft(args = {}, scope) {
    const identity = await this.resolveCustomerIdentity(args.customerName, args.customerPhone, scope);
    if (identity.ambiguous) {
      return { preparationStatus: 'identification_required', requiresIdentification: true,
        preparationNotice: 'Nome ambíguo. Informe o telefone ou identificador do cliente antes de preparar o rascunho.' };
    }
    const phone = identity.phone;

    const pName = args.productName || args.productSummary || 'Personalizado Luisices';

    return {
      preparationStatus: 'draft_prepared',
      customerName: args.customerName || 'Cliente',
      customerPhone: normalizePhone(phone),
      productName: pName,
      productSummary: pName,
      quantity: args.quantity != null && Number(args.quantity) > 0 && Number.isFinite(Number(args.quantity)) ? Number(args.quantity) : undefined,
      totalPrice: args.totalPrice != null && args.totalPrice !== '' && Number.isFinite(Number(args.totalPrice)) ? Number(args.totalPrice) : undefined,
      paidAmount: args.paidAmount != null && args.paidAmount !== '' && Number.isFinite(Number(args.paidAmount)) ? Number(args.paidAmount) : undefined,
      deliveryDate: args.deliveryDate || '',
      theme: args.theme || '',
      notes: args.notes || '',
    };
  }
}

module.exports = {
  AiToolsExecutor,
  getPeriodInterval,
  normalizePhone,
};
