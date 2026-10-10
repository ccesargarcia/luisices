/**
 * Customer Metrics & Commercial X-Ray Utilities
 *
 * Módulo de inteligência comercial determinístico para cálculo de Raio X,
 * Ticket Médio, Recência, Frequência e Faixas de Clientes (Tiers).
 */

import { Customer, Order } from '../types';

export interface CustomerTiersSettings {
  diamondMin: number; // default: 1000
  goldMin: number;    // default: 500
  silverMin: number;  // default: 200
  inactiveDaysThreshold: number; // default: 60 (dias sem comprar)
}

export const DEFAULT_CUSTOMER_TIERS: CustomerTiersSettings = {
  diamondMin: 1000,
  goldMin: 500,
  silverMin: 200,
  inactiveDaysThreshold: 60,
};

export type CustomerAnalysisPeriod = 'all' | '30d' | '90d' | 'year';

export type CustomerTierKey = 'diamond' | 'gold' | 'silver' | 'bronze' | 'none';

export interface CustomerXRayMetrics {
  customerId: string;
  customerName: string;
  totalRevenue: number;          // Faturamento realizado (pedidos concluídos no período)
  inProductionAmount: number;    // Valor em produção (in-progress, pending)
  totalValidAmount: number;      // totalRevenue + inProductionAmount
  totalOrdersCount: number;      // Total de pedidos válidos no período
  completedOrdersCount: number;  // Pedidos entregues
  averageTicket: number;         // Ticket médio por pedido concluído (ou por pedido válido se nenhum concluído)
  lastOrderDate: string | null;  // Data ISO da compra mais recente
  daysSinceLastOrder: number | null; // Dias desde a última compra
  isInactive: boolean;           // true se já comprou mas está há mais de X dias sem comprar
  frequencyDays: number | null;  // Média de dias entre compras sucessivas (recompra)
  topProduct: { name: string; count: number; revenue: number } | null;
  preferredPaymentMethod: string | null;
  tier: CustomerTierKey;
}

/**
 * Filtra pedidos por período temporal a partir da data de criação/pedido
 */
export function filterOrdersByPeriod<T extends { createdAt?: string; date?: string }>(
  orders: T[],
  period: CustomerAnalysisPeriod,
  now: Date = new Date()
): T[] {
  if (period === 'all') return orders;

  const nowMs = now.getTime();
  let cutoffMs = 0;

  if (period === '30d') {
    cutoffMs = nowMs - 30 * 24 * 60 * 60 * 1000;
  } else if (period === '90d') {
    cutoffMs = nowMs - 90 * 24 * 60 * 60 * 1000;
  } else if (period === 'year') {
    cutoffMs = new Date(now.getFullYear(), 0, 1).getTime();
  }

  return orders.filter((o) => {
    const dateStr = o.date || o.createdAt;
    if (!dateStr) return false;
    const time = new Date(dateStr).getTime();
    return time >= cutoffMs && time <= nowMs;
  });
}

/**
 * Calcula a média de dias entre compras sucessivas de pedidos válidos
 */
export function calculateCustomerFrequency(
  orders: Array<{ createdAt?: string; date?: string; status?: string }>
): number | null {
  const dates = orders
    .filter((o) => o.status !== 'cancelled')
    .map((o) => new Date(o.date || o.createdAt || '').getTime())
    .filter((t) => !isNaN(t))
    .sort((a, b) => a - b);

  if (dates.length < 2) return null;

  let totalDiffMs = 0;
  for (let i = 1; i < dates.length; i++) {
    totalDiffMs += dates[i] - dates[i - 1];
  }
  const avgDiffMs = totalDiffMs / (dates.length - 1);
  return Math.round(avgDiffMs / (24 * 60 * 60 * 1000));
}

/**
 * Identifica o produto mais solicitado pelo cliente
 */
export function getTopCustomerProduct(
  orders: Array<{
    items?: Array<{ name: string; quantity: number; price?: number }>;
    productName?: string;
    quantity?: number;
    amount?: number;
    price?: number;
    status?: string;
  }>
): { name: string; count: number; revenue: number } | null {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  if (validOrders.length === 0) return null;

  const countMap = new Map<string, { count: number; revenue: number }>();

  validOrders.forEach((o) => {
    const isCompleted = o.status === 'completed';
    if (Array.isArray(o.items) && o.items.length > 0) {
      o.items.forEach((item) => {
        const name = item.name || 'Produto';
        const cur = countMap.get(name) || { count: 0, revenue: 0 };
        const qty = item.quantity || 1;
        const rev = isCompleted ? (item.price || 0) * qty : 0;
        countMap.set(name, {
          count: cur.count + qty,
          revenue: cur.revenue + rev,
        });
      });
    } else {
      const name = o.productName || 'Produto';
      const cur = countMap.get(name) || { count: 0, revenue: 0 };
      const qty = o.quantity || 1;
      const rev = isCompleted ? (o.price || o.amount || 0) : 0;
      countMap.set(name, {
        count: cur.count + qty,
        revenue: cur.revenue + rev,
      });
    }
  });

  let best: { name: string; count: number; revenue: number } | null = null;
  countMap.forEach((val, name) => {
    if (!best || val.count > best.count || (val.count === best.count && val.revenue > best.revenue)) {
      best = { name, count: val.count, revenue: val.revenue };
    }
  });

  return best;
}

/**
 * Determina o método de pagamento mais utilizado
 */
export function getPreferredPaymentMethod(
  orders: Array<{
    payment?: { method?: string | null; history?: Array<{ method: string }> | null };
    paymentMethod?: string;
    status?: string;
  }>
): string | null {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  if (validOrders.length === 0) return null;

  const methodCounts: Record<string, number> = {};

  validOrders.forEach((o) => {
    if (o.payment?.history && o.payment.history.length > 0) {
      o.payment.history.forEach((h) => {
        if (h.method) methodCounts[h.method] = (methodCounts[h.method] || 0) + 1;
      });
    } else {
      const m = o.payment?.method || o.paymentMethod;
      if (m) methodCounts[m] = (methodCounts[m] || 0) + 1;
    }
  });

  const entries = Object.entries(methodCounts);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/**
 * Determina a faixa de valor (Tier) do cliente com base nas configurações do ateliê
 */
export function getCustomerTier(
  totalSpent: number,
  tiersConfig: CustomerTiersSettings = DEFAULT_CUSTOMER_TIERS
): CustomerTierKey {
  if (totalSpent <= 0) return 'none';
  if (totalSpent >= tiersConfig.diamondMin) return 'diamond';
  if (totalSpent >= tiersConfig.goldMin) return 'gold';
  if (totalSpent >= tiersConfig.silverMin) return 'silver';
  return 'bronze';
}

/**
 * Rótulos e ícones amigáveis para cada faixa comercial
 */
export const TIER_DEFINITIONS: Record<
  CustomerTierKey,
  { label: string; icon: string; badgeClass: string; description: string }
> = {
  diamond: {
    label: 'Diamante',
    icon: '💎',
    badgeClass: 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-400/40',
    description: 'Nível mais alto de investimento',
  },
  gold: {
    label: 'Ouro',
    icon: '🥇',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-400/40',
    description: 'Alto valor e cliente prioritário',
  },
  silver: {
    label: 'Prata',
    icon: '🥈',
    badgeClass: 'bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-400/40',
    description: 'Cliente frequente em ascensão',
  },
  bronze: {
    label: 'Bronze',
    icon: '🌱',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-400/40',
    description: 'Primeiras compras ou menor volume',
  },
  none: {
    label: 'Sem compras',
    icon: '💤',
    badgeClass: 'bg-muted text-muted-foreground border-border/40',
    description: 'Cadastrado sem pedidos concluídos',
  },
};

/**
 * Computa o Raio X completo de um cliente para um determinado período
 */
export function computeCustomerXRay(
  customer: Customer,
  allOrdersForCustomer: Order[],
  period: CustomerAnalysisPeriod = 'all',
  tiersConfig: CustomerTiersSettings = DEFAULT_CUSTOMER_TIERS,
  now: Date = new Date()
): CustomerXRayMetrics {
  // Filtrar pedidos deste cliente pelo período selecionado
  const periodOrders = filterOrdersByPeriod(allOrdersForCustomer, period, now);

  const validOrders = periodOrders.filter((o) => o.status !== 'cancelled');
  const completedOrders = validOrders.filter((o) => o.status === 'completed');
  const inProductionOrders = validOrders.filter(
    (o) => o.status === 'in-progress' || o.status === 'pending'
  );

  const completedRevenueFromOrders = completedOrders.reduce(
    (sum, o) => sum + (o.price || 0),
    0
  );
  const inProductionAmount = inProductionOrders.reduce(
    (sum, o) => sum + (o.price || 0),
    0
  );

  // Se houver pedidos carregados na sessão, a soma dos pedidos concluídos é a fonte primária e exata.
  // Caso o cliente não possua pedidos na memória (ex: pedidos antigos arquivados), usamos customer.totalSpent como fallback.
  const totalRevenue = period === 'all'
    ? (allOrdersForCustomer.length > 0 ? completedRevenueFromOrders : (customer.totalSpent || 0))
    : completedRevenueFromOrders;

  const totalValidAmount = totalRevenue + inProductionAmount;

  const completedOrdersCount = period === 'all'
    ? (allOrdersForCustomer.length > 0 ? completedOrders.length : (customer.totalOrders || 0))
    : completedOrders.length;

  const totalOrdersCount = period === 'all'
    ? (allOrdersForCustomer.length > 0 ? validOrders.length : (customer.totalOrders || 0))
    : validOrders.length;

  // Ticket Médio
  const averageTicket = completedOrdersCount > 0
    ? totalRevenue / completedOrdersCount
    : (totalOrdersCount > 0 ? totalValidAmount / totalOrdersCount : 0);

  // Data do último pedido (considera todos os pedidos históricos para recência)
  let lastOrderDate: string | null = customer.lastOrderDate || null;
  const historicalValid = allOrdersForCustomer.filter((o) => o.status !== 'cancelled');
  if (historicalValid.length > 0) {
    const dates = historicalValid
      .map((o) => (o as { date?: string }).date || o.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
    if (dates.length > 0) {
      lastOrderDate = dates[0]!;
    }
  }

  // Recência em dias
  let daysSinceLastOrder: number | null = null;
  let isInactive = false;

  if (lastOrderDate) {
    const lastTime = new Date(lastOrderDate).getTime();
    if (!isNaN(lastTime)) {
      const diffMs = now.getTime() - lastTime;
      daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
      const threshold = tiersConfig.inactiveDaysThreshold || DEFAULT_CUSTOMER_TIERS.inactiveDaysThreshold;
      // Inativo se tiver pelo menos 1 compra e a última for há mais de 'threshold' dias
      if (totalOrdersCount > 0 && daysSinceLastOrder >= threshold) {
        isInactive = true;
      }
    }
  }

  const frequencyDays = calculateCustomerFrequency(allOrdersForCustomer);
  const topProduct = getTopCustomerProduct(periodOrders.length > 0 ? periodOrders : allOrdersForCustomer);
  const preferredPaymentMethod = getPreferredPaymentMethod(
    periodOrders.length > 0 ? periodOrders : allOrdersForCustomer
  );
  const tier = getCustomerTier(totalRevenue, tiersConfig);

  return {
    customerId: customer.id,
    customerName: customer.name,
    totalRevenue,
    inProductionAmount,
    totalValidAmount,
    totalOrdersCount,
    completedOrdersCount,
    averageTicket,
    lastOrderDate,
    daysSinceLastOrder,
    isInactive,
    frequencyDays,
    topProduct,
    preferredPaymentMethod,
    tier,
  };
}
