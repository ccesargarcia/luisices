import { useState, useMemo, useRef, Fragment } from 'react';
import { formatCurrency } from '../utils/currency';
import { parseLocalDate } from '../utils/date';
import { Order } from '../types';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  ArrowLeftRight,
  Download,
  Printer,
  Search,
  TrendingUp,
  TrendingDown,
  Scale,
  Package,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useUserSettings } from '../../hooks/useUserSettings';
import { openWhatsAppForExchange, generateExchangeSummaryMessage, openWhatsApp } from '../utils/whatsapp';
import { toast } from 'sonner';
import { OrderStatus } from '../types';

type Period = 'all' | 'month' | 'quarter' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  all:     'Todos os períodos',
  month:   'Último mês',
  quarter: 'Último trimestre',
  year:    'Último ano',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:     'Pendente',
  'in-progress': 'Em Produção',
  completed:   'Concluído',
  cancelled:   'Cancelado',
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
  completed:   'bg-green-100 text-green-800 border-green-200',
  cancelled:   'bg-red-100 text-red-800 border-red-200',
};

function formatDateBR(str: string) {
  return new Date(str + 'T12:00:00').toLocaleDateString('pt-BR');
}

function getPeriodStart(period: Period): Date | null {
  if (period === 'all') return null;
  const now = new Date();
  const days = { month: 30, quarter: 90, year: 365 };
  const d = new Date(now);
  d.setDate(now.getDate() - days[period]);
  return d;
}

export function Exchanges() {
  const { orders, loading } = useFirebaseOrders();
  const { settings } = useUserSettings();
  const [period, setPeriod] = useState<Period>('all');
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const businessName = settings?.businessName || 'Papelaria Personalizada';

  // Stats computed from ALL exchange orders (ignoring filters) — for the alert card
  const openStats = useMemo(() => {
    const all = orders.filter(o => o.isExchange);
    const open = all.filter(o => o.status === 'pending' || o.status === 'in-progress');
    return {
      openCount: open.length,
      openCost: open.reduce((s, o) => s + (o.price || 0), 0),
    };
  }, [orders]);

  // Unique customers that appear in any exchange order (derived before filtering)
  const exchangeCustomers = useMemo(() => {
    const seen = new Map<string, string>();
    orders
      .filter(o => o.isExchange)
      .forEach(o => { if (o.customerId && !seen.has(o.customerId)) seen.set(o.customerId, o.customerName); });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [orders]);

  const exchangeOrders = useMemo(() => {
    const periodStart = getPeriodStart(period);
    return orders
      .filter(o => o.isExchange)
      .filter(o => customerFilter === 'all' || o.customerId === customerFilter)
      .filter(o => statusFilter === 'all' || o.status === statusFilter)
      .filter(o => {
        if (!periodStart) return true;
        return parseLocalDate(o.deliveryDate) >= periodStart;
      })
      .filter(o => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          o.customerName.toLowerCase().includes(q) ||
          o.productName.toLowerCase().includes(q) ||
          o.exchangeNotes?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
  }, [orders, period, search, customerFilter, statusFilter]);

  // Group filtered orders by customer
  const groupedOrders = useMemo(() => {
    const map = new Map<string, { key: string; customerName: string; customerPhone: string; orders: Order[] }>();
    for (const o of exchangeOrders) {
      const key = o.customerId || o.customerName;
      if (!map.has(key)) map.set(key, { key, customerName: o.customerName, customerPhone: o.customerPhone, orders: [] });
      map.get(key)!.orders.push(o);
    }
    return Array.from(map.values());
  }, [exchangeOrders]);

  const stats = useMemo(() => {
    const totalDelivered = exchangeOrders.reduce((s, o) => s + (o.price || 0), 0);
    const totalReceived = exchangeOrders.reduce((s, o) =>
      s + (o.exchangeItems?.reduce((si, i) => si + (i.value || 0) * i.quantity, 0) || 0), 0);
    return {
      count: exchangeOrders.length,
      totalDelivered,
      totalReceived,
      balance: totalReceived - totalDelivered,
    };
  }, [exchangeOrders]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await firebaseOrderService.updateOrderStatus(orderId, status);
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status });
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await firebaseOrderService.deleteOrder(orderId);
      if (order?.customerId && order.price) {
        await firebaseCustomerService.decrementCustomerStats(order.customerId, order.price).catch(() => {});
      }
      setDetailsOpen(false);
      setSelectedOrder(null);
    } catch {
      toast.error('Erro ao deletar pedido');
    }
  };

  // ─── Per-order PDF ────────────────────────────────────────────────────────────
  const printSingleOrder = (order: Order) => {
    const pw = window.open('', '_blank');
    if (!pw) return;
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    pw.document.write(`
      <!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8" />
      <title>Permuta — ${order.customerName}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; max-width: 600px; margin: auto; }
        h1 { font-size: 20px; margin-bottom: 2px; }
        .meta { color: #666; font-size: 11px; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 4px; }
        .value { font-size: 15px; font-weight: 600; }
        .row { display: flex; gap: 32px; margin-bottom: 16px; }
        .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
        .notes { background: #fafafa; border: 1px solid #eee; border-radius: 6px; padding: 10px 14px; font-style: italic; color: #555; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>🔄 Comprovante de Permuta</h1>
      <div class="meta">${businessName} — ${now}</div>
      <div class="row">
        <div><div class="label">Cliente</div><div class="value">${order.customerName}</div><div style="color:#666;font-size:11px">${order.customerPhone}</div></div>
        <div><div class="label">Data de entrega</div><div class="value">${formatDateBR(order.deliveryDate)}</div></div>
      </div>
      <div class="row">
        <div><div class="label">Produto</div><div class="value">${order.productName}</div></div>
        <div><div class="label">Custo</div><div class="value">R$ ${(order.price || 0).toFixed(2).replace('.', ',')}</div></div>
      </div>
      ${order.exchangeNotes ? `<div class="section"><div class="label">Observações</div><div class="notes">${order.exchangeNotes}</div></div>` : ''}
      <div class="footer">${businessName} • Documento gerado automaticamente</div>
      </body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => pw.print(), 300);
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = [
      'Data Entrega',
      'N° Pedido',
      'Cliente',
      'Telefone',
      'Produto',
      'Custo (R$)',
      'Status',
      'Observações',
    ];

    const rows = exchangeOrders.map(o => {
      return [
        formatDateBR(o.deliveryDate),
        o.orderNumber || '',
        o.customerName,
        o.customerPhone,
        o.productName,
        (o.price || 0).toFixed(2),
        STATUS_LABELS[o.status],
        o.exchangeNotes || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permutas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado com sucesso!');
  };

  // ─── Print / PDF ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Permutas — ${businessName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
          .stats { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
          .stat { border: 1px solid #ddd; border-radius: 6px; padding: 10px 16px; min-width: 140px; }
          .stat-label { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
          .stat-value { font-size: 16px; font-weight: bold; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; }
          thead { background: #f3f4f6; }
          th { text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #555; border-bottom: 2px solid #ddd; }
          td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
          tr:nth-child(even) td { background: #fafafa; }
          .items-list { font-size: 11px; color: #444; margin-top: 3px; }
          .items-list li { list-style: disc; margin-left: 14px; }
          .badge { display: inline-block; padding: 1px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; border: 1px solid; }
          .badge-pending    { background:#fef9c3; color:#854d0e; border-color:#fde68a; }
          .badge-progress   { background:#dbeafe; color:#1e40af; border-color:#bfdbfe; }
          .badge-completed  { background:#dcfce7; color:#166534; border-color:#bbf7d0; }
          .badge-cancelled  { background:#fee2e2; color:#991b1b; border-color:#fecaca; }
          .positive { color: #166534; font-weight: bold; }
          .negative { color: #991b1b; font-weight: bold; }
          .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <h1>📋 Relatório de Permutas</h1>
        <div class="meta">${businessName} — Gerado em ${now} • Período: ${PERIOD_LABELS[period]}</div>

        <div class="stats">
          <div class="stat">
            <div class="stat-label">Total de Permutas</div>
            <div class="stat-value">${stats.count}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Valor Entregue</div>
            <div class="stat-value">R$ ${stats.totalDelivered.toFixed(2).replace('.', ',')}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Valor Recebido</div>
            <div class="stat-value">R$ ${stats.totalReceived.toFixed(2).replace('.', ',')}</div>
          </div>
          <div class="stat">
            <div class="stat-label">Saldo</div>
            <div class="stat-value ${stats.balance >= 0 ? 'positive' : 'negative'}">
              ${stats.balance >= 0 ? '+' : ''}R$ ${Math.abs(stats.balance).toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Produto</th>
              <th style="text-align:right">Custo</th>
              <th style="text-align:right">Saldo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${exchangeOrders.map(o => {
              const statusClass = { pending: 'pending', 'in-progress': 'progress', completed: 'completed', cancelled: 'cancelled' }[o.status];
              const notes = o.exchangeNotes ? `<div class="items-list" style="margin-top:4px;font-style:italic">${o.exchangeNotes}</div>` : '';
              return `
                <tr>
                  <td>${formatDateBR(o.deliveryDate)}</td>
                  <td><strong>${o.customerName}</strong><br><span style="color:#666;font-size:10px">${o.customerPhone}</span></td>
                  <td>${o.productName}${notes}</td>
                  <td style="text-align:right">${formatCurrency(o.price || 0)}</td>
                  <td><span class="badge badge-${statusClass}">${STATUS_LABELS[o.status]}</span></td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">${businessName} • Relatório gerado automaticamente pelo sistema de gestão</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ArrowLeftRight className="size-7 text-purple-600" />
            Permutas
          </h1>
          <p className="text-muted-foreground">Controle de trocas e parcerias</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="size-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4" />
            PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Alert card — open exchanges */}
      {openStats.openCount > 0 && (
        <div
          className="flex items-start sm:items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 px-4 py-3 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors"
          onClick={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
          title="Clique para filtrar permutas abertas"
        >
          <AlertTriangle className="size-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
              {openStats.openCount} permuta{openStats.openCount !== 1 ? 's' : ''} em aberto
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              {formatCurrency(openStats.openCost)} em produtos ainda pendentes ou em produção.
              {statusFilter !== 'all' ? '' : ' Clique para filtrar.'}
            </p>
          </div>
          {statusFilter !== 'all' && (
            <button
              className="text-xs text-yellow-700 dark:text-yellow-400 underline shrink-0"
              onClick={e => { e.stopPropagation(); setStatusFilter('all'); }}
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Permutas</CardTitle>
            <ArrowLeftRight className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
            <p className="text-xs text-muted-foreground mt-1">no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entregamos</CardTitle>
            <TrendingDown className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDelivered)}</div>
            <p className="text-xs text-muted-foreground mt-1">valor dos produtos entregues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recebemos</CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalReceived)}</div>
            <p className="text-xs text-muted-foreground mt-1">valor estimado dos itens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Scale className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">recebido − entregue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou observação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {exchangeCustomers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">⏳ Pendente</SelectItem>
            <SelectItem value="in-progress">🔄 Em Produção</SelectItem>
            <SelectItem value="completed">✅ Concluído</SelectItem>
            <SelectItem value="cancelled">❌ Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={v => setPeriod(v as Period)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {exchangeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground border rounded-lg bg-muted/30">
          <ArrowLeftRight className="size-12 opacity-20 mb-4" />
          <p className="font-medium">Nenhuma permuta encontrada</p>
          <p className="text-sm mt-1">
            {search ? 'Tente ajustar a busca.' : 'Crie um pedido marcado como "Permuta / Parceria" no Dashboard.'}
          </p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produto</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saldo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedOrders.map(group => {
                    const groupTotal = group.orders.reduce((s, o) => s + (o.price || 0), 0);
                    return (
                      <Fragment key={group.key}>
                        {/* Customer group header */}
                        <tr className="bg-purple-50/60 dark:bg-purple-950/20 border-t-2 border-border">
                          <td colSpan={3} className="px-4 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{group.customerName}</span>
                              <span className="text-xs text-muted-foreground">{group.customerPhone}</span>
                              <Badge variant="secondary" className="text-xs h-5">
                                {group.orders.length} permuta{group.orders.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-semibold">{formatCurrency(groupTotal)}</td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2"></td>
                          <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-green-600 hover:text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50 whitespace-nowrap"
                              title="Enviar resumo de todas as permutas por WhatsApp"
                              onClick={() => openWhatsApp(group.customerPhone, generateExchangeSummaryMessage(group.customerName, group.orders, businessName))}
                            >
                              <MessageCircle className="size-3.5" />
                              <span className="hidden lg:inline text-xs">Enviar resumo</span>
                            </Button>
                          </td>
                        </tr>
                        {/* Individual order rows */}
                        {group.orders.map(order => {
                          const receivedValue = order.exchangeItems?.reduce((s, i) => s + (i.value || 0) * i.quantity, 0) || 0;
                          const balance = receivedValue - (order.price || 0);
                          return (
                            <tr
                              key={order.id}
                              className="hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => { setSelectedOrder(order); setDetailsOpen(true); }}
                            >
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {formatDateBR(order.deliveryDate)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium">{order.customerName}</div>
                                <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                              </td>
                              <td className="px-4 py-3 max-w-[200px]">
                                <div className="truncate">{order.productName}</div>
                                {order.exchangeNotes && (
                                  <div className="text-xs text-muted-foreground italic truncate mt-0.5">{order.exchangeNotes}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">{formatCurrency(order.price || 0)}</td>
                              <td className={`px-4 py-3 text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                              </td>
                              <td className="px-4 py-3">
                                <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                                  {STATUS_LABELS[order.status]}
                                </Badge>
                              </td>
                              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 gap-1.5 text-green-600 hover:text-green-700 border-green-200 hover:border-green-400 hover:bg-green-50"
                                    title="Enviar por WhatsApp"
                                    onClick={() => openWhatsAppForExchange(order, businessName)}
                                  >
                                    <MessageCircle className="size-3.5" />
                                    <span className="hidden lg:inline text-xs">WhatsApp</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                    title="Exportar PDF"
                                    onClick={() => printSingleOrder(order)}
                                  >
                                    <Printer className="size-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
                {/* Footer totals */}
                <tfoot className="bg-muted/50 border-t font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm">Total ({stats.count} permutas)</td>
                    <td className="px-4 py-3 text-right text-sm">{formatCurrency(stats.totalDelivered)}</td>
                    <td className={`px-4 py-3 text-right text-sm ${stats.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.balance >= 0 ? '+' : ''}{formatCurrency(stats.balance)}
                    </td>
                    <td></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {groupedOrders.map(group => {
                const groupTotal = group.orders.reduce((s, o) => s + (o.price || 0), 0);
                return (
                  <div key={group.key}>
                    {/* Customer group header */}
                    <div className="flex items-center justify-between gap-2 px-4 py-2 bg-purple-50/60 dark:bg-purple-950/20 border-b">
                      <div className="min-w-0">
                        <span className="font-semibold text-sm">{group.customerName}</span>
                        <span className="text-xs text-muted-foreground ml-2">{group.orders.length} permuta{group.orders.length !== 1 ? 's' : ''} • {formatCurrency(groupTotal)}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-green-600 hover:text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => openWhatsApp(group.customerPhone, generateExchangeSummaryMessage(group.customerName, group.orders, businessName))}
                      >
                        <MessageCircle className="size-3.5" />
                        Resumo
                      </Button>
                    </div>
                    {/* Individual order cards */}
                    {group.orders.map(order => {
                      const receivedValue = order.exchangeItems?.reduce((s, i) => s + (i.value || 0) * i.quantity, 0) || 0;
                      const balance = receivedValue - (order.price || 0);
                      const expanded = expandedRows.has(order.id);
                      return (
                        <div key={order.id} className="px-4 py-3 border-b last:border-b-0">
                          <div
                            className="flex items-center justify-between gap-2 cursor-pointer"
                            onClick={() => toggleRow(order.id)}
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate text-sm">{order.productName}</div>
                              <div className="text-xs text-muted-foreground">{formatDateBR(order.deliveryDate)} • {formatCurrency(order.price || 0)}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={`text-xs ${STATUS_COLORS[order.status]}`}>
                                {STATUS_LABELS[order.status]}
                              </Badge>
                              {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                            </div>
                          </div>

                          {expanded && (
                            <div className="mt-3 space-y-2 text-sm pl-1">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground flex items-center gap-1"><Package className="size-3" /> Produto</span>
                                <span className="font-medium truncate max-w-[180px] text-right">{order.productName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Custo</span>
                                <span className="font-medium">{formatCurrency(order.price || 0)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-2 font-semibold">
                                <span>Saldo</span>
                                <span className={balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                                </span>
                              </div>
                              {order.exchangeNotes && (
                                <p className="text-xs text-muted-foreground italic border-l-2 pl-2">{order.exchangeNotes}</p>
                              )}
                              <div className="flex gap-2 mt-1">
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => openWhatsAppForExchange(order, businessName)}
                                >
                                  <MessageCircle className="size-4" /> WhatsApp
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 gap-1.5"
                                  onClick={() => printSingleOrder(order)}
                                >
                                  <Printer className="size-4" /> PDF
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-1"
                                onClick={() => { setSelectedOrder(order); setDetailsOpen(true); }}
                              >
                                Ver detalhes do pedido
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={open => { setDetailsOpen(open); if (!open) setTimeout(() => setSelectedOrder(null), 300); }}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}
