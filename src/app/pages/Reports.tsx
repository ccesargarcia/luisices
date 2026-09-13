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
import { AdminTeamFilter } from '../components/AdminTeamFilter';
import { useSalesLedger } from '../../hooks/useSalesLedger';
import { Input } from '../components/ui/input';

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

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
  today:   'Hoje',
  week:    'Última Semana',
  month:   'Último Mês',
  quarter: 'Último Trimestre',
  year:    'Último Ano',
  all:     'Todo o Histórico',
  custom:  'Personalizado',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateRange(period: Period, offset = 0, customRange?: { start?: string; end?: string }) {
  const now  = new Date();
  if (period === 'today') {
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    todayStart.setDate(todayStart.getDate() - offset);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    todayEnd.setDate(todayEnd.getDate() - offset);
    return { start: todayStart, end: todayEnd };
  }
  if (period === 'all') {
    return { start: new Date(2000, 0, 1), end: new Date(2100, 0, 1) };
  }
  if (period === 'custom') {
    const cStart = customRange?.start ? new Date(customRange.start) : new Date(2000, 0, 1);
    cStart.setHours(0, 0, 0, 0);
    const cEnd = customRange?.end ? new Date(customRange.end) : new Date();
    cEnd.setHours(23, 59, 59, 999);
    return { start: cStart, end: cEnd };
  }
  const days: Record<string, number> = { week: 7, month: 30, quarter: 90, year: 365 };
  const d    = days[period] || 30;
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
      <TrendingUp className="size-3" /> novo período
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
      {eq ? 'sem variação' : `${up ? '+' : ''}${pct.toFixed(1)}%`}
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
        <div className="min-w-0 break-words text-lg font-bold leading-tight tracking-tight tabular-nums sm:text-2xl">{value}</div>
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
  const {
    orders,
    loading: ordersLoading,
    isFilterActive,
    selectedFilterLabel,
    clearUserFilter,
    selectedUserIds,
  } = useFirebaseOrders();
  const { quotes }                 = useFirebaseQuotes();
  const { customers }              = useFirebaseCustomers();
  const { settings }               = useUserSettings();
  const [period, setPeriod]        = useState<Period>('month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd]     = useState<string>('');
  const [selTags, setSelTags]      = useState<string[]>([]);

  const {
    allSales,
    loading: ledgerLoading,
  } = useSalesLedger({ teamUserIds: selectedUserIds });

  const loading = ordersLoading && ledgerLoading;

  useEffect(() => {
    if (settings?.defaultReportPeriod) setPeriod(settings.defaultReportPeriod);
  }, [settings?.defaultReportPeriod]);

  const { start: curStart, end: curEnd }   = useMemo(
    () => getDateRange(period, 0, { start: customStart, end: customEnd }),
    [period, customStart, customEnd],
  );
  const { start: prevStart, end: prevEnd } = useMemo(
    () => getDateRange(period, 1, { start: customStart, end: customEnd }),
    [period, customStart, customEnd],
  );

  // Vendas históricas consolidadas do ledger (preserva vendas de clientes/pedidos removidos)
  const sourceSales = useMemo(() => {
    if (allSales.length > 0) return allSales;
    return orders.map(o => ({
      id: o.id,
      orderId: o.id,
      orderNumber: o.orderNumber,
      userId: o.userId || '',
      customerId: o.customerId,
      customerName: o.customerName || 'Cliente não informado',
      productName: o.productName,
      quantity: o.quantity || 1,
      amount: o.price || 0,
      paymentStatus: o.payment?.status || 'pending',
      paidAmount: o.payment?.paidAmount || 0,
      paymentMethod: o.payment?.method || null,
      date: o.createdAt,
      status: o.status,
      tags: o.tags,
      createdAt: o.createdAt,
    } as any));
  }, [allSales, orders]);

  const curSales = useMemo(() =>
    sourceSales.filter(s => {
      const d = new Date(s.date || s.createdAt);
      if (d < curStart || d > curEnd) return false;
      if (selTags.length > 0) {
        const t = s.tags?.map((x: any) => x.name) ?? [];
        return selTags.every(sel => t.includes(sel));
      }
      return true;
    }),
    [sourceSales, curStart, curEnd, selTags],
  );

  const prevSales = useMemo(() => {
    if (period === 'all' || period === 'custom') return [];
    return sourceSales.filter(s => {
      const d = new Date(s.date || s.createdAt);
      return d >= prevStart && d <= prevEnd;
    });
  }, [sourceSales, prevStart, prevEnd, period]);

  const allTags = useMemo(() => {
    const map = new Map<string, Tag>();
    sourceSales
      .filter(s => { const d = new Date(s.date || s.createdAt); return d >= curStart && d <= curEnd; })
      .forEach(s => s.tags?.forEach((t: Tag) => map.set(t.name, t)));
    return Array.from(map.values());
  }, [sourceSales, curStart, curEnd]);

  const stats = useMemo(() => {
    const total     = curSales.length;
    const completed = curSales.filter(s => s.status === 'completed').length;
    const cancelled = curSales.filter(s => s.status === 'cancelled').length;
    const inProg    = curSales.filter(s => s.status === 'in-progress').length;
    const pending   = curSales.filter(s => s.status === 'pending').length;

    // Faturamento realizado
    const revenue    = curSales.filter(s => s.status === 'completed').reduce((s, o) => s + (o.amount || 0), 0);

    // Regra: DESCARTA CANCELADOS NO TICKET MÉDIO E CONVERSÃO
    const validSales = curSales.filter(s => s.status !== 'cancelled');
    const validTotal = validSales.length;
    const avgTicket  = completed > 0
      ? revenue / completed
      : (validTotal > 0 ? validSales.reduce((s, o) => s + (o.amount || 0), 0) / validTotal : 0);
    const conversion = validTotal > 0 ? (completed / validTotal) * 100 : 0;

    const prevCompletedSales = prevSales.filter(s => s.status === 'completed');
    const prevValidSales = prevSales.filter(s => s.status !== 'cancelled');
    const prevRevenue  = prevCompletedSales.reduce((s, o) => s + (o.amount || 0), 0);
    const prevAvg      = prevCompletedSales.length > 0
      ? prevRevenue / prevCompletedSales.length
      : (prevValidSales.length > 0 ? prevValidSales.reduce((s, o) => s + (o.amount || 0), 0) / prevValidSales.length : 0);
    const prevConv     = prevValidSales.length > 0 ? (prevCompletedSales.length / prevValidSales.length) * 100 : 0;

    const statusData = [
      { name: STATUS_LABELS['completed'],   value: completed, color: STATUS_COLORS['completed'],   key: 'completed' },
      { name: STATUS_LABELS['in-progress'], value: inProg,    color: STATUS_COLORS['in-progress'], key: 'in-progress' },
      { name: STATUS_LABELS['pending'],     value: pending,   color: STATUS_COLORS['pending'],     key: 'pending' },
      { name: STATUS_LABELS['cancelled'],   value: cancelled, color: STATUS_COLORS['cancelled'],   key: 'cancelled' },
    ].filter(d => d.value > 0);

    const dailyMap = new Map<string, number>();
    curSales.forEach(o => {
      if (o.status === 'completed') {
        const key = new Date(o.date || o.createdAt).toISOString().split('T')[0];
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + (o.amount || 0));
      }
    });
    const dailySales = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: formatShortDate(date), total }));

    const prodMap = new Map<string, { count: number; revenue: number }>();
    curSales.forEach(o => {
      const cur = prodMap.get(o.productName) ?? { count: 0, revenue: 0 };
      prodMap.set(o.productName, {
        count: cur.count + (o.quantity || 1),
        revenue: cur.revenue + (o.status === 'completed' ? (o.amount || 0) : 0),
      });
    });
    const topProducts = Array.from(prodMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const custMap = new Map<string, { count: number; revenue: number }>();
    curSales.forEach(o => {
      if (!o.customerName) return;
      const cur = custMap.get(o.customerName) ?? { count: 0, revenue: 0 };
      custMap.set(o.customerName, {
        count: cur.count + 1,
        revenue: cur.revenue + (o.status === 'completed' ? (o.amount || 0) : 0),
      });
    });
    const topCustomers = Array.from(custMap.entries())
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const payMap = new Map<string, { total: number; count: number }>();
    curSales.forEach(o => {
      const method = (o as any).paymentMethod || (o as any).payment?.method;
      const paid = (o as any).paidAmount || (o as any).payment?.paidAmount || 0;
      if (method && paid > 0) {
        const cur = payMap.get(method) ?? { total: 0, count: 0 };
        payMap.set(method, { total: cur.total + paid, count: cur.count + 1 });
      }
    });
    const paymentData = Array.from(payMap.entries())
      .map(([method, d], i) => ({
        method,
        label: PAYMENT_LABELS[method] ?? method,
        ...d,
        color: PAYMENT_COLORS[i % PAYMENT_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
    const totalPaid = paymentData.reduce((s, p) => s + p.total, 0);

    // Cancelados descartados
    const cancelledAmount = curSales
      .filter(s => s.status === 'cancelled')
      .reduce((s, o) => s + (o.amount || 0), 0);

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
      prevTotal: prevSales.length,
      cancelledAmount,
      statusData, dailySales, topProducts, topCustomers, paymentData, totalPaid,
      quoteCount, quoteValue, quoteApproved, quoteConversion, prevQuoteCount,
      newCustomers, prevNewCustomers,
    };
  }, [curSales, prevSales, quotes, customers, curStart, curEnd, prevStart, prevEnd]);

  const exportCsv = () => {
    const rows = [
      ['Relatório de Vendas', PERIOD_LABELS[period]],
      [],
      ['Receita Total Realizada', formatCurrency(stats.revenue)],
      ['Ticket Médio (sem cancelados)', formatCurrency(stats.avgTicket)],
      ['Total Pedidos', stats.total],
      ['Concluídos', stats.completed],
      ['Cancelados (Descartados)', `${stats.cancelled} (${formatCurrency(stats.cancelledAmount)})`],
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
    <div className="space-y-8 p-3 sm:p-6">

      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">{PERIOD_LABELS[period]}</p>
        </div>
        <Button onClick={exportCsv} variant="outline" className="gap-2 self-start sm:self-auto">
          <Download className="size-4" /> Exportar CSV
        </Button>
      </div>

      {/* Period selector and team filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="glass-chip flex w-fit flex-wrap gap-1 rounded-lg p-1">
          {(['today', 'week', 'month', 'quarter', 'year', 'all', 'custom'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                period === p ? 'bg-primary/15 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p === 'today'
                ? 'Hoje'
                : p === 'week'
                  ? 'Semana'
                  : p === 'month'
                    ? 'Mês'
                    : p === 'quarter'
                      ? 'Trimestre'
                      : p === 'year'
                        ? 'Ano'
                        : p === 'all'
                          ? 'Tudo'
                          : 'Personalizado'}
            </button>
          ))}
        </div>

        <div className="shrink-0">
          <AdminTeamFilter variant="inline" />
        </div>
      </div>

      {/* Custom date range inputs */}
      {period === 'custom' && (
        <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-border/60 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground">De:</span>
          <Input
            type="date"
            className="w-auto h-8 text-sm"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
          />
          <span className="text-xs font-medium text-muted-foreground">Até:</span>
          <Input
            type="date"
            className="w-auto h-8 text-sm"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
          />
        </div>
      )}

      {isFilterActive && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="size-4 shrink-0" />
            <span className="truncate">
              Relatório filtrado por: <strong>{selectedFilterLabel}</strong> ({curSales.length} pedidos no período)
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearUserFilter}
            className="h-7 text-xs text-primary hover:bg-primary/10 shrink-0 font-medium"
          >
            Visualizar tudo
          </Button>
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Tags:</span>
          {allTags.map(tag => (
            <Badge
              key={tag.name}
              className={cn(
                'cursor-pointer border transition-colors hover:brightness-95',
                selTags.includes(tag.name)
                  ? 'border-primary/50 ring-2 ring-primary/30 ring-offset-1'
                  : 'border-border/60',
              )}
              onClick={() => setSelTags(p => p.includes(tag.name) ? p.filter(t => t !== tag.name) : [...p, tag.name])}
              style={{
                backgroundColor: `color-mix(in srgb, ${tag.color} 22%, transparent)`,
                borderColor: selTags.includes(tag.name)
                  ? `color-mix(in srgb, ${tag.color} 55%, var(--border))`
                  : undefined,
                color: 'var(--foreground)',
              }}
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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6 xl:gap-6">
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
          sub={stats.cancelled > 0 ? `${stats.total - stats.cancelled} válidos (${stats.cancelled} desc.)` : `${stats.total} pedidos`}
          icon={BarChart3}
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/30"
          trend={<Trend current={stats.avgTicket} previous={stats.prevAvg} />}
        />
        <KpiCard
          title="Total de Pedidos"
          value={String(stats.total)}
          sub={stats.cancelled > 0 ? `${stats.cancelled} cancelados descartados` : 'Nenhum cancelado'}
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
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
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
                <div className="space-y-2 w-full flex-1">
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
          <CardContent className="flex flex-col sm:flex-row items-center gap-4">
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
                <div className="space-y-2 w-full flex-1 min-w-0">
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
