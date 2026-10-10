import React from 'react';
import { UserPlus, DollarSign, ShoppingBag, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';

interface CustomerStatsCardsProps {
  total: number;
  totalRevenue: number;
  totalOrders: number;
  averagePerCustomer: number;
  inProductionAmount?: number;
  completedOrdersCount?: number;
  inProductionOrdersCount?: number;
}

export function CustomerStatsCards({
  total,
  totalRevenue,
  totalOrders,
  averagePerCustomer,
  inProductionAmount,
  completedOrdersCount,
  inProductionOrdersCount,
}: CustomerStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="p-3.5 sm:p-4 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-xs">
        <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
          <UserPlus className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium">Total de Clientes</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{total}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">Carteira cadastrada</p>
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-xs">
        <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
          <DollarSign className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium">Faturamento Realizado</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight truncate">
            {formatCurrency(totalRevenue)}
          </p>
          {inProductionAmount && inProductionAmount > 0 ? (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5" title={`+ ${formatCurrency(inProductionAmount)} em pedidos em produção`}>
              + {formatCurrency(inProductionAmount)} em produção
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Pedidos concluídos</p>
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-xs">
        <div className="p-2 sm:p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
          <ShoppingBag className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium">Total de Pedidos</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight">{totalOrders}</p>
          {completedOrdersCount !== undefined && inProductionOrdersCount !== undefined ? (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {completedOrdersCount} entregues • {inProductionOrdersCount} abertos
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">Histórico da carteira</p>
          )}
        </div>
      </div>

      <div className="p-3.5 sm:p-4 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-xs">
        <div className="p-2 sm:p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
          <Sparkles className="size-4 sm:size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate font-medium">Ticket Médio</p>
          <p className="text-lg sm:text-2xl font-bold text-foreground leading-tight truncate">
            {formatCurrency(averagePerCustomer)}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">Por pedido entregue</p>
        </div>
      </div>
    </div>
  );
}
