import { useState, useMemo } from 'react';
import { Order, Tag } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { getTextColor } from '../utils/tagColors';
import {
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Loader2,
  X
} from 'lucide-react';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';

type Period = 'week' | 'month' | 'quarter' | 'year';

export function Reports() {
  const { orders, loading } = useFirebaseOrders();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const getDateRange = (period: Period) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    return { start, end: now };
  };

  const periodLabels: Record<Period, string> = {
    week: 'Última Semana',
    month: 'Último Mês',
    quarter: 'Último Trimestre',
    year: 'Último Ano',
  };

  const filteredOrders = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate < start || orderDate > end) return false;
      if (selectedTags.length > 0) {
        const orderTags = order.tags?.map(t => t.name) || [];
        return selectedTags.every(t => orderTags.includes(t));
      }
      return true;
    });
  }, [orders, selectedPeriod, selectedTags]);

  const allTags = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    const tagMap = new Map<string, Tag>();
    orders
      .filter(o => { const d = new Date(o.createdAt); return d >= start && d <= end; })
      .forEach(o => o.tags?.forEach(t => tagMap.set(t.name, t)));
    return Array.from(tagMap.values());
  }, [orders, selectedPeriod]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const completed = filteredOrders.filter(o => o.status === 'completed').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;

    const totalRevenue = filteredOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.price, 0);

    const totalCost = filteredOrders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.cost || 0), 0);

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const averageOrderValue = total > 0
      ? filteredOrders.reduce((sum, o) => sum + o.price, 0) / total
      : 0;

    const totalPaid = filteredOrders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);
    const totalPending = filteredOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.payment?.remainingAmount || 0), 0);

    // Produtos mais vendidos
    const productCounts = new Map<string, { count: number; revenue: number; cost: number }>();
    filteredOrders.forEach(order => {
      const current = productCounts.get(order.productName) || { count: 0, revenue: 0, cost: 0 };
      productCounts.set(order.productName, {
        count: current.count + order.quantity,
        revenue: current.revenue + (order.status === 'completed' ? order.price : 0),
        cost: current.cost + (order.status === 'completed' ? (order.cost || 0) : 0),
      });
    });

    const topProducts = Array.from(productCounts.entries())
      .map(([name, data]) => ({
        name,
        ...data,
        profit: data.revenue - data.cost,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Métodos de pagamento
    const paymentMethods = new Map<string, { total: number; count: number }>();
    filteredOrders.forEach(order => {
      if (order.payment?.method && order.payment.paidAmount > 0) {
        const current = paymentMethods.get(order.payment.method) || { total: 0, count: 0 };
        paymentMethods.set(order.payment.method, {
          total: current.total + order.payment.paidAmount,
          count: current.count + 1,
        });
      }
    });

    const topPaymentMethods = Array.from(paymentMethods.entries())
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.total - a.total);

    // Vendas por dia
    const salesByDay = new Map<string, number>();
    filteredOrders.forEach(order => {
      if (order.status === 'completed') {
        const date = new Date(order.createdAt).toLocaleDateString('pt-BR');
        salesByDay.set(date, (salesByDay.get(date) || 0) + order.price);
      }
    });

    const dailySales = Array.from(salesByDay.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() -
                       new Date(b.date.split('/').reverse().join('-')).getTime());

    // Taxa de conversão
    const conversionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      cancelled,
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      averageOrderValue,
      totalPaid,
      totalPending,
      topProducts,
      topPaymentMethods,
      dailySales,
      conversionRate,
    };
  }, [filteredOrders]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const paymentMethodLabels: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    credit: 'Cartão de Crédito',
    debit: 'Cartão de Débito',
    transfer: 'Transferência',
  };

  const exportReport = () => {
    const csvContent = [
      ['Relatório de Vendas', periodLabels[selectedPeriod]],
      [],
      ['Resumo Financeiro'],
      ['Total de Pedidos', stats.total],
      ['Pedidos Concluídos', stats.completed],
      ['Pedidos Cancelados', stats.cancelled],
      ['Receita Total', formatCurrency(stats.totalRevenue)],
      ['Custo Total', formatCurrency(stats.totalCost)],
      ['Lucro', formatCurrency(stats.profit)],
      ['Margem de Lucro', `${stats.profitMargin.toFixed(2)}%`],
      ['Ticket Médio', formatCurrency(stats.averageOrderValue)],
      ['Taxa de Conversão', `${stats.conversionRate.toFixed(2)}%`],
      [],
      ['Produtos Mais Vendidos'],
      ['Produto', 'Quantidade', 'Receita', 'Custo', 'Lucro'],
      ...stats.topProducts.map(p => [
        p.name,
        p.count,
        formatCurrency(p.revenue),
        formatCurrency(p.cost),
        formatCurrency(p.profit),
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-vendas-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Relatórios e Análises</h1>
          <p className="text-muted-foreground text-sm">Análise detalhada de vendas e desempenho</p>
        </div>
        <Button onClick={exportReport} className="gap-2 self-start sm:self-auto">
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Filtrar por tags:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag.name}
                className={cn(
                  'cursor-pointer hover:opacity-80 transition-opacity border-0',
                  selectedTags.includes(tag.name) ? 'ring-2 ring-offset-2 ring-black' : ''
                )}
                onClick={() =>
                  setSelectedTags(prev =>
                    prev.includes(tag.name) ? prev.filter(t => t !== tag.name) : [...prev, tag.name]
                  )
                }
                style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
              >
                {tag.name}
                {selectedTags.includes(tag.name) && <X className="size-3 ml-1" />}
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="cursor-pointer" onClick={() => setSelectedTags([])}>
                Limpar filtros
              </Badge>
            )}
          </div>
        </div>
      )}

      <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
        <TabsList className="grid grid-cols-4 w-full sm:w-auto">
          <TabsTrigger value="week">Semana</TabsTrigger>
          <TabsTrigger value="month">Mês</TabsTrigger>
          <TabsTrigger value="quarter">Trimestre</TabsTrigger>
          <TabsTrigger value="year">Ano</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedPeriod} className="space-y-6">
          {/* Métricas principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completed} pedidos concluídos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Lucro</CardTitle>
                <TrendingUp className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.profit)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Margem: {stats.profitMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Package className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total} pedidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                <BarChart3 className="size-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completed}/{stats.total} concluídos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Produtos mais vendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                Top 10 Produtos - {periodLabels[selectedPeriod]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{product.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {product.count} unidades vendidas
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                      <div className="text-sm text-muted-foreground">
                        Lucro: {formatCurrency(product.profit)}
                      </div>
                    </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum produto vendido neste período
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Métodos de pagamento */}
          {stats.topPaymentMethods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="size-5" />
                  Métodos de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topPaymentMethods.map((method) => {
                    const percentage = (method.total / stats.totalPaid) * 100;
                    return (
                      <div key={method.method} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {paymentMethodLabels[method.method] || method.method}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {method.count} {method.count === 1 ? 'transação' : 'transações'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(method.total)}</div>
                            <div className="text-xs text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vendas ao longo do tempo */}
          {stats.dailySales.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="size-5" />
                  Vendas Diárias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.dailySales.map((day) => (
                    <div key={day.date} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm font-medium">{day.date}</span>
                      <span className="font-semibold">{formatCurrency(day.total)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
