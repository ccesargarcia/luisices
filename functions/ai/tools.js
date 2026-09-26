/**
 * Execução Segura e Validada das Ferramentas de Negócio do Copiloto - Luisices
 */

const { BUSINESS_TIMEZONE, TOOL_LIMITS } = require('./config');
const { calculateRecipePricing, DEFAULT_PRICING_SETTINGS } = require('./pricing/pricingCalculator');

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
  async resolveCustomerPhone(customerName, existingPhone, scope) {
    if (existingPhone && typeof existingPhone === 'string' && existingPhone.replace(/\D/g, '').length >= 10) {
      return normalizePhone(existingPhone);
    }
    if (!customerName || typeof customerName !== 'string') return '';

    const clean = customerName.trim().toLowerCase();
    const result = await this.repos.getScopedCustomers(scope, { searchTerm: clean });
    const matches = result.customers || [];

    if (matches.length === 1 && matches[0].phone) {
      return normalizePhone(matches[0].phone);
    }

    // Se houver correspondência exata de nome
    const exactMatches = matches.filter((c) => c.name.toLowerCase() === clean && c.phone);
    if (exactMatches.length === 1) {
      return normalizePhone(exactMatches[0].phone);
    }

    return '';
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
      const orderDate = new Date(o.createdAt || o.deliveryDate || Date.now());
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
      criterioFiltro: 'Data de criação do pedido (createdAt)',
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
    const qty = Math.max(1, Number(args.quantity) || 1);
    const rawCost = args.rawMaterialsCost !== undefined && !isNaN(Number(args.rawMaterialsCost))
      ? Math.max(0, Number(args.rawMaterialsCost))
      : (args.unitCostRaw !== undefined && !isNaN(Number(args.unitCostRaw))
        ? Math.max(0, Number(args.unitCostRaw))
        : 15);
    const customCost = args.customizationCost !== undefined && !isNaN(Number(args.customizationCost))
      ? Math.max(0, Number(args.customizationCost))
      : 5;
    const laborTimeMinutes = args.laborTimeMinutes !== undefined && !isNaN(Number(args.laborTimeMinutes))
      ? Math.max(0, Number(args.laborTimeMinutes))
      : 15;
    const setupTimeMinutes = args.setupTimeMinutes !== undefined && !isNaN(Number(args.setupTimeMinutes))
      ? Math.max(0, Number(args.setupTimeMinutes))
      : 0;

    let studioSettings = DEFAULT_PRICING_SETTINGS;
    if (this.repos && typeof this.repos.getPricingSettings === 'function' && scope) {
      const loaded = await this.repos.getPricingSettings(scope);
      if (loaded) studioSettings = { ...DEFAULT_PRICING_SETTINGS, ...loaded };
    }

    const profitMarginPercent = args.profitMarginPercent !== undefined && !isNaN(Number(args.profitMarginPercent))
      ? Math.min(95, Math.max(0, Number(args.profitMarginPercent)))
      : studioSettings.defaultProfitMarginPercent;
    const paymentFeePercent = args.paymentFeePercent !== undefined && !isNaN(Number(args.paymentFeePercent))
      ? Math.max(0, Number(args.paymentFeePercent))
      : studioSettings.defaultPaymentFeePercent;
    const wasteMarginPercent = args.wasteMarginPercent !== undefined && !isNaN(Number(args.wasteMarginPercent))
      ? Math.max(0, Number(args.wasteMarginPercent))
      : studioSettings.defaultWasteMarginPercent;

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

    // Se temos setup e qty >= 1, calcula custo unitário e preço unitário na base efetiva do lote
    const minuteRate = calcResult.minuteRateApplied || 0.47;
    const setupLaborPerUnit = (setupTimeMinutes / qty) * minuteRate;
    const directLaborPerUnit = laborTimeMinutes * minuteRate;
    const matWithWaste = (rawCost + customCost) * (1 + wasteMarginPercent / 100);
    const fixedCostsSharePerUnit = calcResult.fixedCostsShare ? (calcResult.fixedCostsShare) : 0;
    const unitCostForQty = matWithWaste + directLaborPerUnit + setupLaborPerUnit + fixedCostsSharePerUnit;

    const divisor = Math.max(0.02, 1 - (paymentFeePercent + profitMarginPercent) / 100);
    let unitPriceForQty = Math.round((unitCostForQty / divisor) * 100) / 100;
    const breakevenForQty = Math.round((unitCostForQty / Math.max(0.02, 1 - paymentFeePercent / 100)) * 100) / 100;

    let suggestedTotalPrice = 0;
    const matchingTier = calcResult.batchTiers.find((t) => t.quantity === qty);
    if (matchingTier) {
      unitPriceForQty = matchingTier.unitPrice;
      suggestedTotalPrice = matchingTier.totalPrice;
    } else {
      suggestedTotalPrice = Math.round(unitPriceForQty * qty * 100) / 100;
    }

    return {
      productName: args.productName || 'Personalizado Luisices',
      quantity: qty,
      unitCost: Number(unitCostForQty.toFixed(2)),
      suggestedUnitPrice: Number(unitPriceForQty.toFixed(2)),
      suggestedTotalPrice,
      profitMarginPercent,
      breakevenPrice: Number(breakevenForQty.toFixed(2)),
      maxDiscountPercent: calcResult.maxDiscountPercent,
      batchTiers: calcResult.batchTiers,
      isExplicitMaterialsCost: args.rawMaterialsCost !== undefined,
      isExplicitLaborTime: args.laborTimeMinutes !== undefined,
      breakdown: {
        materialsBase: Number((rawCost + customCost).toFixed(2)),
        wasteMarginAmount: calcResult.wasteAmount,
        totalMaterialsWithWaste: Number(matWithWaste.toFixed(2)),
        directLaborPerUnit: Number(directLaborPerUnit.toFixed(2)),
        setupLaborPerUnit: Number(setupLaborPerUnit.toFixed(2)),
        specializedLabor: Number((directLaborPerUnit + setupLaborPerUnit).toFixed(2)),
        fixedCostsShare: Number(fixedCostsSharePerUnit.toFixed(2)),
      },
    };
  }

  /**
   * Ferramenta 6: Cobranças e WhatsApp com Contrato Totalmente Compatível (IA-03, R03, R09)
   */
  async executeGenerateWhatsAppMessage(args = {}, scope) {
    const { recipientName = 'Cliente', orderNumber, messageType = 'cobranca', customText } = args;

    // Normaliza tipo para os enums compatíveis com AiCopilotSheet.tsx (VARIANTS)
    let normalizedType = 'cobranca';
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

    if (orderNumber) {
      const orders = await this.repos.getScopedOrders(scope);
      const cleanTarget = String(orderNumber).toLowerCase().replace('#', '').trim();
      realOrder = orders.find((o) =>
        o.orderId.toLowerCase() === cleanTarget ||
        (o.orderNumber && o.orderNumber.toLowerCase().replace('#', '').trim() === cleanTarget)
      );
    }

    if (realOrder) {
      if (realOrder.customerPhone) {
        phone = realOrder.customerPhone;
      }
    }

    if (!phone && recipientName) {
      phone = await this.resolveCustomerPhone(recipientName, null, scope);
    }

    phone = normalizePhone(phone);

    let generatedText = '';
    let orderDetails = null;

    if (realOrder) {
      const remainingFmt = Number(realOrder.remainingAmount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        if (realOrder.paymentStatus === 'paid' || realOrder.remainingAmount <= 0) {
          generatedText = `Olá, ${realOrder.customerName}! Tudo bem? Passando para avisar que seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) já está com pagamento totalmente quitado! Qualquer dúvida estamos à disposição. ✨`;
        } else {
          // O saldo restante oficial SEMPRE prevalece sobre valores arbitrários
          generatedText = `Olá, ${realOrder.customerName}! Tudo bem? Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary})${dateFmt} está em produção! O saldo restante oficial é de ${remainingFmt} (Total: ${totalFmt}). Quando puder, nos envie o comprovante para agendarmos a entrega com todo carinho! ✨`;
        }
      } else if (normalizedType === 'pronto_retirada') {
        generatedText = `Olá, ${realOrder.customerName}! Ótima notícia: seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) está prontinho e embalado com muito afeto! Ficou lindo demais! ✨`;
      } else if (normalizedType === 'status_producao') {
        generatedText = `Olá, ${realOrder.customerName}! Seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}) já entrou na etapa de produção e personalização! ✨`;
      } else {
        generatedText = `Olá, ${realOrder.customerName}! Confirmamos o recebimento dos detalhes do seu pedido ${realOrder.orderNumber} (${realOrder.productSummary}). Já iniciamos os preparativos! ✨`;
      }
    } else {
      generatedText = customText || `Olá, ${recipientName}! Tudo bem? Entramos em contato para passar informações sobre seus personalizados Luisices. Estamos à disposição para qualquer dúvida! ✨`;
    }

    return {
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
    let phone = args.customerPhone || '';
    if (!phone && args.customerName) {
      phone = await this.resolveCustomerPhone(args.customerName, null, scope);
    }

    const pName = args.productName || args.productSummary || 'Personalizado Luisices';

    return {
      customerName: args.customerName || 'Cliente',
      customerPhone: normalizePhone(phone),
      productName: pName,
      productSummary: pName,
      quantity: Number(args.quantity) || 1,
      totalPrice: Number(args.totalPrice) || 0,
      paidAmount: Number(args.paidAmount) || 0,
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
