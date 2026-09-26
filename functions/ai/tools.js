/**
 * Execução Segura e Validada das Ferramentas de Negócio do Copiloto - Luisices
 */

const { BUSINESS_TIMEZONE, TOOL_LIMITS } = require('./config');
const { calculateRecipePricing, DEFAULT_PRICING_SETTINGS } = require('./pricing/pricingCalculator');

/**
 * Calcula intervalos de data no fuso do negócio (America/Sao_Paulo - UTC-3)
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
  const year = getPart('year');
  const month = getPart('month'); // 1-12
  const day = getPart('day');

  const spOffset = '-03:00';
  const pad = (n) => String(n).padStart(2, '0');

  if (period === 'today') {
    const start = new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00.000${spOffset}`);
    const end = new Date(`${year}-${pad(month)}-${pad(day)}T23:59:59.999${spOffset}`);
    return { startDate: start, endDate: end };
  }

  if (period === 'week') {
    const start = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: d };
  }

  if (period === 'month') {
    const start = new Date(`${year}-${pad(month)}-01T00:00:00.000${spOffset}`);
    return { startDate: start, endDate: d };
  }

  if (period === 'year') {
    const start = new Date(`${year}-01-01T00:00:00.000${spOffset}`);
    return { startDate: start, endDate: d };
  }

  // 'all'
  return {
    startDate: new Date('2000-01-01T00:00:00.000Z'),
    endDate: new Date('2100-01-01T00:00:00.000Z'),
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
      const target = team.find((m) => m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term) || m.uid === term);
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

    const { startDate, endDate } = getPeriodInterval(period);

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
      faturamentoRealizado: Number(realizedRevenue.toFixed(2)),
      volumeTotalEmitido: Number(grossIssuedVolume.toFixed(2)),
      totalRecebido: Number(totalReceived.toFixed(2)),
      totalPendenteReceber: Number(pendingReceivables.toFixed(2)),
      ticketMedio: Number(averageTicket.toFixed(2)),
      taxaConversao: Number(conversionRate.toFixed(1)),
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
    return this.repos.getScopedCustomers(scope, args);
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

    const target = team.find((m) => m.name.toLowerCase().includes(identifier) || m.email.toLowerCase().includes(identifier) || m.uid === identifier);
    if (!target) {
      return {
        authorized: true,
        found: false,
        availableMembers: team.map((m) => m.name),
      };
    }

    const uid = String(target.uid);
    const orders = (await this.repos.getScopedOrders(scope)).filter((o) => o.userId === uid || o.createdBy === uid || o.assignedTo === uid);
    const customersResult = await this.repos.getScopedCustomers(scope);
    const userCustomers = (customersResult.customers || []).filter((c) => c.userId === uid || c.createdBy === uid || c.assignedTo === uid);

    const validOrders = orders.filter((o) => o.status !== 'cancelled' && !o.isDeleted);
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const inProgressOrders = orders.filter((o) => o.status === 'in-progress');
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    const realizedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
    const totalReceived = validOrders.reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);
    const pendingReceivables = validOrders
      .filter((o) => o.paymentStatus !== 'paid')
      .reduce((sum, o) => sum + (Number(o.remainingAmount !== undefined ? o.remainingAmount : (o.totalPrice - (o.paidAmount || 0))) || 0), 0);

    const averageTicket = completedOrders.length > 0 ? realizedRevenue / completedOrders.length : 0;

    return {
      authorized: true,
      found: true,
      user: target,
      metrics: {
        totalCustomers: userCustomers.length,
        recentCustomers: userCustomers.slice(0, 3).map((c) => c.name),
        totalOrders: orders.length,
        totalValidOrders: validOrders.length,
        completedOrders: completedOrders.length,
        inProgressOrders: inProgressOrders.length,
        pendingOrders: pendingOrders.length,
        cancelledOrders: cancelledOrders.length,
        realizedRevenue: Number(realizedRevenue.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        pendingReceivables: Number(pendingReceivables.toFixed(2)),
        averageTicket: Number(averageTicket.toFixed(2)),
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
