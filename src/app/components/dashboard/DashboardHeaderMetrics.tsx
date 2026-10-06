import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { SectionErrorBoundary } from '../common/SectionErrorBoundary';
import { DeliveryAlerts } from '../DeliveryAlerts';
import { OverdueOrders } from '../OverdueOrders';
import { formatCurrency } from '../../utils/currency';
import { Order } from '../../types';
import {
  Package,
  Clock,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Target,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../ui/chart';

const statusChartConfig = {
  value: { label: 'Pedidos' },
} satisfies ChartConfig;

const weeklyChartConfig = {
  pedidos: { label: 'Pedidos', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

export interface DashboardMetricsStats {
  total: number;
  completed: number;
  totalRevenue: number;
  expectedRevenue: number;
  averageOrderValue: number;
  inProgress: number;
  pending: number;
  totalPending: number;
  pendingPayments: number;
  totalPaid: number;
  topProducts: { name: string; count: number; revenue: number }[];
}

export interface DashboardLedgerStats {
  completedCount: number;
  completedRevenue: number;
  totalPaid: number;
  averageTicket: number;
}

interface DashboardHeaderMetricsProps {
  stats: DashboardMetricsStats;
  ledgerStats: DashboardLedgerStats;
  visibleCards: string[];
  currentMonthName: string;
  statusChartData: { status: string; value: number; fill: string }[];
  ordersPerWeek: { semana: string; pedidos: number }[];
  deliveryAlertDays: number;
  orders: Order[];
  onOrderClick: (order: Order) => void;
}

export function DashboardHeaderMetrics({
  stats,
  ledgerStats,
  visibleCards,
  currentMonthName,
  statusChartData,
  ordersPerWeek,
  deliveryAlertDays,
  orders,
  onOrderClick,
}: DashboardHeaderMetricsProps) {
  const showCard = (id: string) => visibleCards.includes(id);

  const firstGridCount = ['total', 'revenue', 'open', 'avgTicket'].filter(showCard).length;
  const secondGridCount = ['inProgress', 'toReceive', 'received'].filter(showCard).length;

  const firstGridClass =
    firstGridCount === 1
      ? 'grid-cols-1'
      : firstGridCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : firstGridCount === 3
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const secondGridClass =
    secondGridCount === 1
      ? 'grid-cols-1'
      : secondGridCount === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-3';

  return (
    <div className="space-y-6">
      <SectionErrorBoundary title="Métricas Financeiras">
        <div data-kpi-grid data-count={firstGridCount} className={`grid gap-4 lg:gap-6 ${firstGridClass}`}>
          {showCard('total') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.completed} concluído{stats.completed !== 1 ? 's' : ''} no quadro
                </p>
              </CardContent>
            </Card>
          )}

          {showCard('revenue') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita ({currentMonthName})</CardTitle>
                <DollarSign className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ledgerStats.completedCount > 0
                    ? `${ledgerStats.completedCount} pedido${ledgerStats.completedCount !== 1 ? 's' : ''} concluído${ledgerStats.completedCount !== 1 ? 's' : ''} em ${currentMonthName.toLowerCase()}`
                    : `${stats.completed} pedido${stats.completed !== 1 ? 's' : ''} concluído${stats.completed !== 1 ? 's' : ''}`}
                </p>
              </CardContent>
            </Card>
          )}

          {showCard('open') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
                <TrendingUp className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{formatCurrency(stats.expectedRevenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pending + stats.inProgress} pedido{(stats.pending + stats.inProgress) !== 1 ? 's' : ''} a entregar
                </p>
              </CardContent>
            </Card>
          )}

          {showCard('avgTicket') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio ({currentMonthName})</CardTitle>
                <Target className="size-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{formatCurrency(stats.averageOrderValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Média por venda em {currentMonthName.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Métricas adicionais */}
        <div data-kpi-grid data-count={secondGridCount} className={`grid gap-4 lg:gap-6 mt-4 lg:mt-6 ${secondGridClass}`}>
          {showCard('inProgress') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
                <Clock className="size-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pending} aguardando início
                </p>
              </CardContent>
            </Card>
          )}

          {showCard('toReceive') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">A Receber</CardTitle>
                <AlertCircle className="size-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{formatCurrency(stats.totalPending)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.pendingPayments} {stats.pendingPayments === 1 ? 'pedido ativo pendente' : 'pedidos ativos pendentes'}
                </p>
              </CardContent>
            </Card>
          )}

          {showCard('received') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recebido ({currentMonthName})</CardTitle>
                <TrendingUp className="size-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="min-w-0 break-words text-lg font-bold leading-tight tabular-nums sm:text-2xl">{formatCurrency(stats.totalPaid)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Pagamentos em {currentMonthName.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </SectionErrorBoundary>

      {/* Gráficos */}
      {stats.total > 0 && (showCard('statusChart') || showCard('weeklyChart')) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {showCard('statusChart') && (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição de Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={statusChartConfig} className="h-[180px]">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                  {statusChartData.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-1.5 text-xs">
                      <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                      <span className="text-muted-foreground">{entry.status}</span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {showCard('weeklyChart') && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pedidos por Semana</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-hidden">
                <ChartContainer config={weeklyChartConfig} className="h-[240px] w-full">
                  <BarChart data={ordersPerWeek} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="semana" interval="preserveStartEnd" tick={{ fontSize: 9 }} tickMargin={8} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pedidos" fill="var(--color-pedidos)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top produtos */}
      {showCard('topProducts') && stats.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{product.count} pedidos</div>
                    </div>
                  </div>
                  <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Entrega */}
      {showCard('delivery') && <DeliveryAlerts orders={orders} daysThreshold={deliveryAlertDays} onOrderClick={onOrderClick} />}

      {/* Pedidos Atrasados */}
      {showCard('overdue') && <OverdueOrders orders={orders} onOrderClick={onOrderClick} />}
    </div>
  );
}
