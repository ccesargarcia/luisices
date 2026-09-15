import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { formatCurrency } from '../../utils/currency';

interface QuoteStatsCardsProps {
  stats: {
    total: number;
    draft: number;
    sent: number;
    approved: number;
    rejected: number;
    expired: number;
    pendingTotal: number;
    conversionRate: number | null;
  };
}

export function QuoteStatsCards({ stats }: QuoteStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Em aberto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{stats.draft + stats.sent}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(stats.pendingTotal)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Aprovados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums text-green-600 sm:text-2xl">{stats.approved}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.conversionRate !== null
              ? `${stats.conversionRate}% de conversão`
              : 'pedidos gerados'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Rejeitados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums text-red-600 sm:text-2xl">
            {stats.rejected + stats.expired}
          </div>
          <p className="text-xs text-muted-foreground mt-1">não convertidos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de orçamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{stats.total}</div>
        </CardContent>
      </Card>
    </div>
  );
}
