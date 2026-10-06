import React, { useMemo, useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router';
import { Order, OrderStatus } from '../types';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { formatCurrency } from '../utils/currency';
import { formatDateShort, parseLocalDate } from '../utils/date';
import { exportOrdersToExcel } from '../utils/exportData';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { OrderTable } from '../components/OrderTable';
import { OrderCard } from '../components/OrderCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Archive,
  ArchiveRestore,
  Search,
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Trash2,
  ArrowLeft,
  Settings,
  LayoutGrid,
  LayoutList,
  Filter,
  Package,
  RotateCcw,
  CheckCircle,
} from 'lucide-react';
import { cn } from '../components/ui/utils';
import { toast } from 'sonner';

type DateFilterType = 'archivedAt' | 'deliveryDate' | 'createdAt';
type DatePreset = 'all' | 'today' | '7days' | '30days' | 'this_month' | 'last_month' | 'this_year' | 'custom';
type SortOption =
  | 'archived_desc'
  | 'archived_asc'
  | 'delivery_desc'
  | 'delivery_asc'
  | 'price_desc'
  | 'price_asc'
  | 'customer_asc';

export function ArchivedOrders() {
  const { user, userProfile, hasPermission } = useAuth();
  const { orders, loading, error, refreshOrders } = useFirebaseOrders();
  const { settings } = useUserSettings();

  // Estados de busca e filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>('archivedAt');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partial' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('archived_desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados de seleção e visualização
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      return localStorage.getItem('archived_orders_view_mode') === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  // Modais de exclusão / desarquivamento
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [orderToUnarchive, setOrderToUnarchive] = useState<Order | null>(null);
  const [unarchiving, setUnarchiving] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(12);

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('archived_orders_view_mode', mode);
    } catch {}
  };

  // Todos os pedidos arquivados no contexto
  const rawArchivedOrders = useMemo(() => {
    return orders.filter((o) => Boolean(o.isArchived));
  }, [orders]);

  // Aplicar preset de datas
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      setStartDate(pastStr);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const pastStr = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
      setStartDate(pastStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(`${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`);
    } else if (preset === 'this_year') {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(`${now.getFullYear()}-12-31`);
    }
  };

  // Filtragem dos pedidos arquivados
  const filteredArchivedOrders = useMemo(() => {
    let result = rawArchivedOrders;

    // 1. Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((order) => {
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesProduct = order.productName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.includes(q);
        const matchesNumber = (order.orderNumber || '').toLowerCase().includes(q);
        const matchesNotes = (order.notes || '').toLowerCase().includes(q);
        const matchesTags = order.tags?.some((t) => t.name.toLowerCase().includes(q)) ?? false;
        return matchesName || matchesProduct || matchesPhone || matchesNumber || matchesNotes || matchesTags;
      });
    }

    // 2. Filtro por campo de data
    if (startDate || endDate) {
      result = result.filter((order) => {
        let orderDateStr = '';
        if (dateFilterType === 'archivedAt') {
          orderDateStr = order.archivedAt ? order.archivedAt.slice(0, 10) : (order.updatedAt ? order.updatedAt.slice(0, 10) : order.createdAt.slice(0, 10));
        } else if (dateFilterType === 'deliveryDate') {
          orderDateStr = order.deliveryDate ? order.deliveryDate.slice(0, 10) : '';
        } else {
          orderDateStr = order.createdAt ? order.createdAt.slice(0, 10) : '';
        }

        if (!orderDateStr) return false;
        if (startDate && orderDateStr < startDate) return false;
        if (endDate && orderDateStr > endDate) return false;
        return true;
      });
    }

    // 3. Filtro por status de pagamento
    if (paymentFilter !== 'all') {
      result = result.filter((order) => {
        const status = order.payment?.status || 'pending';
        return status === paymentFilter;
      });
    }

    // 4. Ordenação
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case 'archived_desc': {
          const dateA = a.archivedAt || a.createdAt;
          const dateB = b.archivedAt || b.createdAt;
          return String(dateB).localeCompare(String(dateA));
        }
        case 'archived_asc': {
          const dateA = a.archivedAt || a.createdAt;
          const dateB = b.archivedAt || b.createdAt;
          return String(dateA).localeCompare(String(dateB));
        }
        case 'delivery_desc':
          return String(b.deliveryDate || '').localeCompare(String(a.deliveryDate || ''));
        case 'delivery_asc':
          return String(a.deliveryDate || '').localeCompare(String(b.deliveryDate || ''));
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'customer_asc':
          return a.customerName.localeCompare(b.customerName);
        default:
          return 0;
      }
    });
  }, [rawArchivedOrders, searchQuery, startDate, endDate, dateFilterType, paymentFilter, sortBy]);

  // Estatísticas agregadas
  const stats = useMemo(() => {
    const totalCount = rawArchivedOrders.length;
    const totalRevenue = rawArchivedOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalPaid = rawArchivedOrders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);
    const pendingCount = rawArchivedOrders.filter((o) => !o.payment || o.payment.status !== 'paid').length;
    const totalPending = rawArchivedOrders.reduce((sum, o) => {
      if (!o.payment) return sum + (o.price || 0);
      return sum + (o.payment.remainingAmount ?? Math.max(0, o.price - (o.payment.paidAmount || 0)));
    }, 0);

    return { totalCount, totalRevenue, totalPaid, pendingCount, totalPending };
  }, [rawArchivedOrders]);

  // Paginação
  const totalItems = filteredArchivedOrders.length;
  const effectivePageSize = typeof pageSize === 'number' ? pageSize : 12;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / effectivePageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, datePreset, startDate, endDate, paymentFilter, sortBy, pageSize]);

  const pagedOrders = useMemo(() => {
    if (pageSize === 'all') return filteredArchivedOrders;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredArchivedOrders.slice(start, start + effectivePageSize);
  }, [filteredArchivedOrders, currentPage, pageSize, effectivePageSize]);

  const allVisibleSelected = pagedOrders.length > 0 && pagedOrders.every((o) => selectedOrderIds.includes(o.id));

  const toggleSelectOrder = (orderId: string, selected: boolean) => {
    setSelectedOrderIds((prev) => (selected ? [...prev, orderId] : prev.filter((id) => id !== orderId)));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !pagedOrders.some((o) => o.id === id)));
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        pagedOrders.forEach((o) => next.add(o.id));
        return [...next];
      });
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPaymentFilter('all');
    setSortBy('archived_desc');
  };

  const hasActiveFilters = Boolean(
    searchQuery || startDate || endDate || datePreset !== 'all' || paymentFilter !== 'all' || sortBy !== 'archived_desc'
  );

  // Ações de desarquivamento
  const handleUnarchiveSingle = async (order: Order) => {
    setUnarchiving(true);
    try {
      await firebaseOrderService.unarchiveOrder(order.id);
      toast.success(`Pedido ${order.orderNumber || order.productName} restaurado para o painel principal!`);
      setOrderToUnarchive(null);
    } catch {
      toast.error('Erro ao desarquivar pedido');
    } finally {
      setUnarchiving(false);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedOrderIds.length === 0) return;
    setUnarchiving(true);
    try {
      await firebaseOrderService.unarchiveOrdersBulk(selectedOrderIds);
      toast.success(
        `${selectedOrderIds.length} pedido${selectedOrderIds.length === 1 ? '' : 's'} restaurado${selectedOrderIds.length === 1 ? '' : 's'} para o painel principal!`
      );
      setSelectedOrderIds([]);
    } catch {
      toast.error('Erro ao desarquivar pedidos em lote');
    } finally {
      setUnarchiving(false);
    }
  };

  // Exclusão em lote
  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const toDelete = rawArchivedOrders.filter((o) => selectedOrderIds.includes(o.id));
      await Promise.all(
        toDelete.map(async (order) => {
          await firebaseOrderService.deleteOrder(order.id);
          if (order.customerId && order.price && order.status === 'pending') {
            await firebaseCustomerService.decrementCustomerStats(order.customerId, order.price).catch(() => {});
          }
        })
      );
      toast.success(`${toDelete.length} pedido${toDelete.length === 1 ? '' : 's'} excluído${toDelete.length === 1 ? '' : 's'}!`);
      setSelectedOrderIds([]);
      setIsBulkDeleteOpen(false);
    } catch {
      toast.error('Erro ao excluir pedidos selecionados');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleExportExcel = () => {
    const listToExport = selectedOrderIds.length > 0
      ? filteredArchivedOrders.filter((o) => selectedOrderIds.includes(o.id))
      : filteredArchivedOrders;

    if (listToExport.length === 0) {
      toast.error('Nenhum pedido arquivado para exportar');
      return;
    }
    exportOrdersToExcel(listToExport);
    toast.success(`${listToExport.length} pedidos arquivados exportados!`);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Voltar ao Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Archive className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pedidos Arquivados</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Histórico de pedidos concluídos arquivados para não poluir sua esteira diária de produção
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/configuracoes">
            <Button variant="outline" size="sm" className="gap-2 h-9 text-xs sm:text-sm">
              <Settings className="size-4" />
              Configurar Arquivamento
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-2 h-9 text-xs sm:text-sm"
            disabled={filteredArchivedOrders.length === 0}
          >
            <Download className="size-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Arquivados</CardTitle>
            <Archive className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pedidos fora do painel ativo</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Faturamento Arquivado</CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Preservado nas métricas</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
            <CheckCircle className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(stats.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Valores quitados</p>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pendente a Receber</CardTitle>
            <Calendar className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(stats.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.pendingCount} pedido(s) c/ pendência</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="glass-panel">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Input de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, pedido #, produto, telefone ou tags..."
                className="pl-9 pr-9 h-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showAdvancedFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="gap-1.5 h-10 text-xs sm:text-sm"
              >
                <Filter className="size-4" />
                Filtros de Data & Pagamento
                {hasActiveFilters && (
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                )}
              </Button>

              {/* Seletor Grid / Table */}
              <div
                className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
                role="group"
              >
                <button
                  type="button"
                  onClick={() => handleSetViewMode('grid')}
                  className={cn(
                    'p-2 rounded-md transition-all flex items-center justify-center cursor-pointer',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Visualização em Cards"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('table')}
                  className={cn(
                    'p-2 rounded-md transition-all flex items-center justify-center cursor-pointer',
                    viewMode === 'table'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Visualização em Tabela"
                >
                  <LayoutList className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Painel de Filtros Avançados (Data, Pagamento e Ordenação) */}
          {(showAdvancedFilters || startDate || endDate || paymentFilter !== 'all') && (
            <div className="pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Campo de Seleção do Tipo de Data */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Filtrar pelo campo de data</label>
                <Select value={dateFilterType} onValueChange={(val: DateFilterType) => setDateFilterType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="archivedAt">Data de Arquivamento</SelectItem>
                    <SelectItem value="deliveryDate">Data de Entrega</SelectItem>
                    <SelectItem value="createdAt">Data de Criação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Período / Preset */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Período pré-definido</label>
                <Select value={datePreset} onValueChange={(val: DatePreset) => handleDatePresetChange(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todo o período</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="7days">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days">Últimos 30 dias</SelectItem>
                    <SelectItem value="this_month">Este Mês</SelectItem>
                    <SelectItem value="last_month">Mês Anterior</SelectItem>
                    <SelectItem value="this_year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Datas Início e Fim */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Intervalo de datas</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="h-9 text-xs px-2"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset('custom');
                    }}
                    className="h-9 text-xs px-2"
                  />
                </div>
              </div>

              {/* Pagamento e Ordenação */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Pagamento e Ordenação</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Select value={paymentFilter} onValueChange={(val: any) => setPaymentFilter(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(val: SortOption) => setSortBy(val)}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="archived_desc">Mais recente</SelectItem>
                      <SelectItem value="archived_asc">Mais antigo</SelectItem>
                      <SelectItem value="delivery_desc">Entrega (desc)</SelectItem>
                      <SelectItem value="delivery_asc">Entrega (asc)</SelectItem>
                      <SelectItem value="price_desc">Maior valor</SelectItem>
                      <SelectItem value="price_asc">Menor valor</SelectItem>
                      <SelectItem value="customer_asc">Cliente (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Badges de filtros ativos */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Filtros ativos:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Busca: "{searchQuery}"
                  <X className="size-3 cursor-pointer" onClick={() => setSearchQuery('')} />
                </Badge>
              )}
              {startDate && (
                <Badge variant="secondary" className="gap-1">
                  De: {startDate}
                  <X className="size-3 cursor-pointer" onClick={() => setStartDate('')} />
                </Badge>
              )}
              {endDate && (
                <Badge variant="secondary" className="gap-1">
                  Até: {endDate}
                  <X className="size-3 cursor-pointer" onClick={() => setEndDate('')} />
                </Badge>
              )}
              {paymentFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Pagamento: {paymentFilter}
                  <X className="size-3 cursor-pointer" onClick={() => setPaymentFilter('all')} />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3 mr-1" />
                Limpar todos os filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de Ações em Lote */}
      {selectedOrderIds.length > 0 && (
        <div className="glass-chip flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-primary">
              {selectedOrderIds.length} selecionado{selectedOrderIds.length === 1 ? '' : 's'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAllVisible}
              className="h-8 text-xs"
            >
              {allVisibleSelected
                ? `Desmarcar página (${pagedOrders.length})`
                : `Selecionar página (${pagedOrders.length})`}
            </Button>
            {totalItems > pagedOrders.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedOrderIds.length === totalItems) {
                    setSelectedOrderIds([]);
                  } else {
                    setSelectedOrderIds(filteredArchivedOrders.map((o) => o.id));
                  }
                }}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {selectedOrderIds.length === totalItems
                  ? 'Desmarcar todos os itens arquivados'
                  : `Selecionar todos os ${totalItems} itens arquivados`}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUnarchive}
              disabled={unarchiving}
              className="gap-1.5 h-8 text-xs font-medium text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
            >
              <ArchiveRestore className="size-3.5 shrink-0" />
              Desarquivar ({selectedOrderIds.length})
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Trash2 className="size-3.5 shrink-0" />
              Excluir selecionados
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedOrderIds([])}
              className="h-8 text-xs"
            >
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Listagem de Pedidos */}
      {filteredArchivedOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-xl">
          <Archive className="size-14 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">Nenhum pedido arquivado encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            {rawArchivedOrders.length === 0
              ? 'Ao marcar pedidos como concluídos no Dashboard, você pode arquivá-los para não poluir sua tela operacional.'
              : 'Tente ajustar os filtros de busca ou o período de data selecionado.'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4 gap-2">
              <RotateCcw className="size-4" />
              Limpar Filtros
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <OrderTable
          orders={pagedOrders}
          selectedOrderIds={selectedOrderIds}
          onToggleSelect={toggleSelectOrder}
          onOrderClick={(order) => {
            setSelectedOrder(order);
            setDetailsOpen(true);
          }}
          onToggleSelectAll={toggleSelectAllVisible}
          allSelected={allVisibleSelected}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedOrders.map((order) => (
            <div key={order.id} className="relative group">
              <OrderCard
                order={order}
                isSelected={selectedOrderIds.includes(order.id)}
                onToggleSelect={toggleSelectOrder}
                onClick={() => {
                  setSelectedOrder(order);
                  setDetailsOpen(true);
                }}
              />
              {/* Botão de desarquivamento rápido no card */}
              <div className="absolute right-3 top-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-xs gap-1 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOrderToUnarchive(order);
                  }}
                  title="Restaurar para o painel principal"
                >
                  <ArchiveRestore className="size-3 text-emerald-600 dark:text-emerald-400" />
                  Desarquivar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {pageSize !== 'all' && totalPages > 1 && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mostrando {totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1}–
            {Math.min(currentPage * effectivePageSize, totalItems)} de {totalItems} pedido{totalItems !== 1 ? 's' : ''} — Página{' '}
            <strong className="text-foreground">{currentPage}</strong> de <strong>{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => totalPages <= 5 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, array) => {
                  const prev = array[index - 1];
                  const hasGap = prev && page - prev > 1;
                  return (
                    <Fragment key={page}>
                      {hasGap && <span className="px-1 text-xs text-muted-foreground">…</span>}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className="size-8 p-0 text-xs"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </Fragment>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setTimeout(() => setSelectedOrder(null), 300);
          }
        }}
        onUpdateStatus={async (orderId, status) => {
          try {
            await firebaseOrderService.updateOrderStatus(orderId, status, selectedOrder?.version);
            if (selectedOrder) {
              setSelectedOrder({ ...selectedOrder, status });
            }
          } catch {
            toast.error('Erro ao atualizar status');
          }
        }}
        onDeleteOrder={async (orderId) => {
          try {
            await firebaseOrderService.deleteOrder(orderId);
            setDetailsOpen(false);
            setSelectedOrder(null);
            toast.success('Pedido removido!');
          } catch {
            toast.error('Erro ao excluir pedido');
          }
        }}
        onToggleArchive={(orderId, archive) => {
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, isArchived: archive });
          }
        }}
      />

      {/* Modal de Confirmação para Desarquivar */}
      <AlertDialog
        open={!!orderToUnarchive}
        onOpenChange={(open) => {
          if (!open) setOrderToUnarchive(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ArchiveRestore className="size-5 text-emerald-500" />
              Restaurar pedido para o painel principal?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O pedido{' '}
              <strong>{orderToUnarchive?.orderNumber || orderToUnarchive?.customerName}</strong> será
              desarquivado e voltará a ser visível na lista operacional do Dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unarchiving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToUnarchive && handleUnarchiveSingle(orderToUnarchive)}
              disabled={unarchiving}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArchiveRestore className="size-4" />
              {unarchiving ? 'Restaurando...' : 'Desarquivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Exclusão em Massa */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedidos arquivados selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente{' '}
              <strong>{selectedOrderIds.length}</strong> pedido(s) arquivado(s). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleting}
            >
              {bulkDeleting ? 'Excluindo...' : 'Excluir selecionados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ArchivedOrders;
