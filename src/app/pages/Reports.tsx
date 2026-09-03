import { useState, useMemo, useEffect } from 'react';
import { formatCurrency } from '../utils/currency';
import { parseLocalDate } from '../utils/date';
import { Tag } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { getTextColor } from '../utils/tagColors';
import {
  DollarSign,
  Package,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Loader2,
  X,
  FileText,
  UserPlus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { useFirebaseQuotes } from '../../hooks/useFirebaseQuotes';
import { useFirebaseCustomers } from '../../hooks/useFirebaseCustomers';
import { useUserSettings } from '../../hooks/useUserSettings';

type Period = 'week' | 'month' | 'quarter' | 'year';

const STATUS_COLORS: Record<string, string> = {
  completed:     '#10B981',
  'in-progress': '#3B82F6',
  pending:       '#F59E0B',
  cancelled:     '#EF4444',
};

const STATUS_LABELS: Record<string, string> = {
  completed:     'Concluído',
  'in-progress': 'Em andamento',
  pending:       'Pendente',
  cancelled:     'Cancelado',
};

const PAYMENT_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const PAYMENT_LABELS: Record<string, string> = {
  pix:      'PIX',
  cash:     'Dinheiro',
  credit:   'Crédito',
  debit:    'Débito',
  transfer: 'Transferência',
};

const PERIOD_LABELS: Record<Period, string> = {
  week:    'Última Semana',
  month:   'Último Mês',
  quarter: 'Último Trimestre',
  year:    'Último Ano',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(period: Period, offset = 0) {
  const now  = new Date();
  const days: Record<Period, number> = { week: 7, month: 30, quarter: 90, year: 365 };
  const d    = days[period];
  const end  = new Date(now); end.setDate(now.getDate() - d * offset);
  const start = new Date(now); start.setDate(now.getDate() - d * (offset + 1));
  return { start, end };
}

function formatShortDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
      <TrendingUp className="size-3" /> novo
    </span>
  );
  const pct = ((current - previous) / previous) * 100;
  const up  = pct > 0.5;
  const eq  = Math.abs(pct) < 0.5;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-medium',
      eq ? 'text-muted-foreground' : up ? 'text-emerald-600' : 'text-red-500',
    )}>
      {eq ? <Minus className="size-3" /> : up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
      {eq ? 'igual' : `${up ? '+' : ''}${pct.toFixed(1)}%`}
    </span>
  );
}

function KpiCard({ title, value, sub, icon: Icon, iconClass, trend }: {
  title: string; value: string; sub: string;
  icon: React.ElementType; iconClass: string;
  trend?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn('rounded-lg p-2', iconClass)}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">{sub}</p>
          {trend}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Reports() {
  const { orders, loading }        = useFirebaseOrders();
  const { quotes }                 = useFirebaseQuotes();
  const { customers }              = useFirebaseCustomers();
  const { settings }               = useUserSettings();
  const [period, setPeriod]        = useState<Period>('month');
  const [selTags, setSelTags]      = useState<string[]>([]);

  useEffect(() => {
    if (settings?.defaultReportPeriod) setPeriod(settings.defaultReportPeriod);
  }, [settings?.defaultReportPeriod]);

  const { start: curStart, end: curEnd }   = getDateRange(period, 0);
  const { start: prevStart, end: prevEnd } = getDateRange(period, 1);

  const curOrders = useMemo(() =>
    orders.filter(o => {
      const d = new Date(o.createdAt);
      if (d < curStart || d > curEnd) return false;
      if (selTags.length > 0) {
        const t = o.tags?.map(x => x.name) ?? [];
        return selTags.every(s => t.includes(s));
      }
      return true;
    }),
    [orders, curStart, curEnd, selTags],
  );

  const prevOrders = useMemo(() =>
    orders.filter(o => { const d = new Date(o.createdAt); return d >= prevStart && d <= prevEnd; }),
    [orders, prevStart, prevEnd],
  );

  const allTags = useMemo(() => {
    const map = new Map<string, Tag>();
    orders
      .filter(o => { const d = new Date(o.createdAt); return d >= curStart && d <= curEnd; })
      .forEach(o => o.tags?.forEach(t => map.set(t.name, t)));
    return Array.from(map.values());
  }, [orders, curStart, curEnd]);

  const stats = useMemo(() => {
    const total     = curOrders.length;
    const completed = curOrders.filter(o => o.status === 'completed').length;
    const cancelled = curOrders.filter(o => o.status === 'cancelled').length;
    const inProg    = curOrders.filter(o => o.status === 'in-progress').length;
    const pending   = curOrders.filter(o => o.status === 'pending').length;

    const revenue    = curOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.price, 0);
    const avgTicket  = total > 0 ? curOrders.reduce((s, o) => s + o.price, 0) / total : 0;
    const conversion = total > 0 ? (completed / total) * 100 : 0;

    const prevRevenue  = prevOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.price, 0);
    const prevAvg      = prevOrders.length > 0 ? prevOrders.reduce((s, o) => s + o.price, 0) / prevOrders.length : 0;
    const prevConv     = prevOrders.length > 0 ? (prevOrders.filter(o => o.status === 'completed').length / prevOrders.length) * 100 : 0;

    const statusData = [
      { name: STATUS_LABELS['completed'],   value: completed, color: STATUS_COLORS['completed'],   key: 'completed' },
      { name: STATUS_LABELS['in-progress'], value: inProg,    color: STATUS_COLORS['in-progress'], key: 'in-progress' },
      { name: STATUS_LABELS['pending'],     value: pending,   color: STATUS_COLORS['pending'],     key: 'pending' },
      { name: STATUS_LABELS['cancelled'],   value: cancelled, color: STATUS_COLORS['cancelled'],   key: 'cancelled' },
    ].filter(d => d.value > 0);

    const dailyMap = new Map<string, number>();
    curOrders.forEach(o => {
      if (o.status === 'completed') {
        const key = new Date(o.createdAt).toISOString().split('T')[0];
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + o.price);
      }
    });
    const dailySales = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: formatShortDate(date), total }));

    const prodMap = new Map<string, { count: number; revenue: number }>();
    curOrders.forEach(o => {
      const cur = prodMap.get(o.productName) ?? { count: 0, revenue: 0 };
      prodMap.set(o.productName, { count: cur.count + o.quantity, revenue: cur.revenue + (o.status === 'completed' ? o.price : 0) });
    });
    const topProducts = Array.from(prodMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const custMap = new Map<string, { count: number; revenue: number }>();
    curOrders.forEach(o => {
      if (!o.customerName) return;
      const cur = custMap.get(o.customerName) ?? { count: 0, revenue: 0 };
      custMap.set(o.customerName, { count: cur.count + 1, revenue: cur.revenue + (o.status === 'completed' ? o.price : 0) });
    });
    const topCustomers = Array.from(custMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const payMap = new Map<string, { total: number; count: number }>();
    curOrders.forEach(o => {
      if (o.payment?.method && o.payment.paidAmount > 0) {
        const cur = payMap.get(o.payment.method) ?? { total: 0, count: 0 };
        payMap.set(o.payment.method, { total: cur.total + o.payment.paidAmount, count: cur.count + 1 });
      }
    });
    const paymentData = Array.from(payMap.entries())
      .map(([method, d], i) => ({ method, label: PAYMENT_LABELS[method] ?? method, ...d, color: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }))
      .sort((a, b) => b.total - a.total);
    const totalPaid = paymentData.reduce((s, p) => s + p.total, 0);

    // ── Quote stats ───────────────────────────────────────────────────────────
    const curQuotes  = quotes.filter(q => { const d = new Date(q.createdAt); return d >= curStart && d <= curEnd; });
    const prevQuotes = quotes.filter(q => { const d = new Date(q.createdAt); return d >= prevStart && d <= prevEnd; });
    const quoteCount      = curQuotes.length;
    const quoteValue      = curQuotes.reduce((s, q) => s + q.totalPrice, 0);
    const quoteApproved   = curQuotes.filter(q => q.status === 'approved' || !!q.orderId).length;
    const quoteConversion = quoteCount > 0 ? (quoteApproved / quoteCount) * 100 : 0;
    const prevQuoteCount  = prevQuotes.length;

    // ── New customers ─────────────────────────────────────────────────────────
    const newCustomers     = customers.filter(c => { const d = new Date(c.createdAt); return d >= curStart && d <= curEnd; }).length;
    const prevNewCustomers = customers.filter(c => { const d = new Date(c.createdAt); return d >= prevStart && d <= prevEnd; }).length;

    return {
      total, completed, cancelled, inProg, pending,
      revenue, prevRevenue, avgTicket, prevAvg, conversion, prevConv,
      prevTotal: prevOrders.length,
      statusData, dailySales, topProducts, topCustomers, paymentData, totalPaid,
      quoteCount, quoteValue, quoteApproved, quoteConversion, prevQuoteCount,
      newCustomers, prevNewCustomers,
    };
  }, [curOrders, prevOrders, quotes, customers, curStart, curEnd, prevStart, prevEnd]);

  const exportCsv = () => {
    const rows = [
      ['Relatório de Vendas', PERIOD_LABELS[period]],
      [],
      ['Receita Total', formatCurrency(stats.revenue)],
      ['Ticket Médio', formatCurrency(stats.avgTicket)],
      ['Total Pedidos', stats.total],
      ['Concluídos', stats.completed],
      ['Cancelados', stats.cancelled],
      ['Taxa de Conversão', `${stats.conversion.toFixed(1)}%`],
      [],
      ['Orçamentos', stats.quoteCount],
      ['Valor Total Orçamentos', formatCurrency(stats.quoteValue)],
      ['Orçamentos Aprovados', stats.quoteApproved],
      ['Taxa Aprovação Orçamentos', `${stats.quoteConversion.toFixed(1)}%`],
      ['Novos Clientes', stats.newCustomers],
      [],
      ['Produto', 'Qtd', 'Receita'],
      ...stats.topProducts.map(p => [p.name, p.count, formatCurrency(p.revenue)]),
      [],
      ['Cliente', 'Pedidos', 'Receita'],
      ...stats.topCustomers.map(c => [c.name, c.count, formatCurrency(c.revenue)]),
    ].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows], { type: 'text/csv;charset=utf-8;' }));
    a.download = `relatorio-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxProd = stats.topProducts[0]?.revenue ?? 1;
  const maxCust = stats.topCustomers[0]?.revenue ?? 1;

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground text-sm">{PERIOD_LABELS[period]}</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2 self-start sm:self-auto">
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
        {(['week', 'month', 'quarter', 'year'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              period === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : 'Ano'}
          </button>
        ))}
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {allTags.map(tag => (
            <Badge
              key={tag.name}
              className={cn('cursor-pointer hover:opacity-80 border-0 transition-opacity',
                selTags.includes(tag.name) ? 'ring-2 ring-offset-2 ring-black/50' : '')}
              onClick={() => setSelTags(p => p.includes(tag.name) ? p.filter(t => t !== tag.name) : [...p, tag.name])}
              style={{ backgroundColor: tag.color, color: getTextColor(tag.color) }}
            >
              {tag.name}
              {selTags.includes(tag.name) && <X className="size-3 ml-1" />}
            </Badge>
          ))}
          {selTags.length > 0 && (
            <button onClick={() => setSelTags([])} className="text-xs text-muted-foreground hover:text-foreground">Limpar</button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Receita Total"
          value={formatCurrency(stats.revenue)}
          sub={`${stats.completed} concluídos`}
          icon={DollarSign}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
          trend={<Trend current={stats.revenue} previous={stats.prevRevenue} />}
        />
        <KpiCard
          title="Ticket Médio"
          value={formatCurrency(stats.avgTicket)}
          sub={`${stats.total} pedidos`}
          icon={BarChart3}
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30"
          trend={<Trend current={stats.avgTicket} previous={stats.prevAvg} />}
        />
        <KpiCard
          title="Total de Pedidos"
          value={String(stats.total)}
          sub={`${stats.cancelled} cancelados`}
          icon={Package}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
          trend={<Trend current={stats.total} previous={stats.prevTotal} />}
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${stats.conversion.toFixed(1)}%`}
          sub={`${stats.completed}/${stats.total} concluídos`}
          icon={TrendingUp}
          iconClass="bg-orange-100 text-orange-600 dark:bg-orange-900/30"
          trend={<Trend current={stats.conversion} previous={stats.prevConv} />}
        />
        <KpiCard
          title="Orçamentos"
          value={String(stats.quoteCount)}
          sub={stats.quoteCount > 0
            ? `${formatCurrency(stats.quoteValue)} · ${stats.quoteConversion.toFixed(0)}% aprovados`
            : 'Nenhum no período'}
          icon={FileText}
          iconClass="bg-sky-100 text-sky-600 dark:bg-sky-900/30"
          trend={<Trend current={stats.quoteCount} previous={stats.prevQuoteCount} />}
        />
        <KpiCard
          title="Novos Clientes"
          value={String(stats.newCustomers)}
          sub={stats.newCustomers === 1 ? '1 cliente cadastrado' : `${stats.newCustomers} clientes cadastrados`}
          icon={UserPlus}
          iconClass="bg-pink-100 text-pink-600 dark:bg-pink-900/30"
          trend={<Trend current={stats.newCustomers} previous={stats.prevNewCustomers} />}
        />
      </div>

      {/* Area chart — receita no tempo */}
      {stats.dailySales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita ao longo do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.dailySales} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                  tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={52}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Area
                  type="monotone" dataKey="total" stroke="#6366F1" strokeWidth={2}
                  fill="url(#revenueGrad)" dot={false} activeDot={{ r: 4 }} name="Receita"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Row: status donut + payment pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card>
          <CardHeader><CardTitle className="text-base">Status dos Pedidos</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            {stats.statusData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum pedido no período</p>
            ) : (
              <>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {stats.statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, 'pedidos']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {stats.statusData.map(d => (
                    <div key={d.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">{d.value}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {stats.total > 0 ? `${((d.value / stats.total) * 100).toFixed(0)}%` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Métodos de Pagamento</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-4">
            {stats.paymentData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum pagamento no período</p>
            ) : (
              <>
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={stats.paymentData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={3} dataKey="total" strokeWidth={0}>
                      {stats.paymentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [formatCurrency(v), '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1 min-w-0">
                  {stats.paymentData.map(d => (
                    <div key={d.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground truncate">{d.label}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-semibold tabular-nums text-xs">{formatCurrency(d.total)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {stats.totalPaid > 0 ? `${((d.total / stats.totalPaid) * 100).toFixed(0)}%` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row: top products + top customers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4 text-muted-foreground" /> Top Produtos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum produto no período</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((p, i) => (
                  <div key={p.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <span className="truncate font-medium">{p.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0 tabular-nums">{formatCurrency(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(p.revenue / maxProd) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" /> Top Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topCustomers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Nenhum cliente no período</p>
            ) : (
              <div className="space-y-3">
                {stats.topCustomers.map((c, i) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <div className="size-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 uppercase">
                          {c.name.charAt(0)}
                        </div>
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-xs tabular-nums">{formatCurrency(c.revenue)}</div>
                        <div className="text-[10px] text-muted-foreground">{c.count} {c.count === 1 ? 'pedido' : 'pedidos'}</div>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(c.revenue / maxCust) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
