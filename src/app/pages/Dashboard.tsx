import { useMemo, useState, useEffect } from 'react';
import { Order, OrderStatus, UserProfile } from '../types';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { DeliveryAlerts } from '../components/DeliveryAlerts';
import { OverdueOrders } from '../components/OverdueOrders';
import { DashboardCardSkeleton, OrderCardSkeleton } from '../components/SkeletonLoaders';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  Search,
  X,
  Loader2,
  DollarSign,
  AlertCircle,
  TrendingDown,
  Calendar,
  Target,
  Repeat2,
  Download,
  Trash2,
  Users,
  UserCheck,
} from 'lucide-react';
import { AdminTeamFilter } from '../components/AdminTeamFilter';
import { getTextColor } from '../utils/tagColors';
import { useFirebaseOrders } from '../../hooks/useFirebaseOrders';
import { firebaseOrderService } from '../../services/firebaseOrderService';
import { firebaseUserService } from '../../services/firebaseUserService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { useSalesLedger } from '../../hooks/useSalesLedger';
import { DEFAULT_DASHBOARD_CARDS } from '../utils/dashboardCards';
import { parseLocalDate } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { exportOrdersToExcel } from '../utils/exportData';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '../components/ui/chart';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
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

const statusChartConfig = {
  value: { label: 'Pedidos' },
} satisfies ChartConfig;

const weeklyChartConfig = {
  pedidos: { label: 'Pedidos', color: 'hsl(var(--primary))' },
} satisfies ChartConfig;

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
      <Package className="size-12 opacity-25 mb-4" />
      <p className="font-medium">{message}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 6) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Dashboard() {
  const { user, userProfile, hasPermission } = useAuth();
  const {
    orders,
    loading,
    error,
    isFilterActive,
    selectedFilterLabel,
    clearUserFilter,
    teamMembers,
    selectedUserIds,
  } = useFirebaseOrders();
  const { settings } = useUserSettings();
  const { stats: ledgerStats } = useSalesLedger({ teamUserIds: selectedUserIds });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isBulkOrderDeleteOpen, setIsBulkOrderDeleteOpen] = useState(false);
  const [bulkOrderDeleting, setBulkOrderDeleting] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignTargetUid, setBulkAssignTargetUid] = useState<string>('__none__');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showExchangeOnly, setShowExchangeOnly] = useState(false);
  const [creatorProfiles, setCreatorProfiles] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (userProfile?.role !== 'admin' && userProfile?.role !== 'funcionario') {
      setCreatorProfiles([]);
      return;
    }
    firebaseUserService.listUsers().then(setCreatorProfiles).catch(() => setCreatorProfiles([]));
  }, [userProfile?.role]);

  const currentMonthName = useMemo(() => {
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date());
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  const visibleCards = settings?.dashboardCards ?? DEFAULT_DASHBOARD_CARDS;
  const showCard = (id: string) => visibleCards.includes(id);
  const firstGridCount = ['total', 'revenue', 'open', 'avgTicket'].filter(showCard).length;
  const secondGridCount = ['inProgress', 'toReceive', 'received'].filter(showCard).length;
  const firstGridClass = firstGridCount === 1
    ? 'grid-cols-1'
    : firstGridCount === 2
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
      : firstGridCount === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';
  const secondGridClass = secondGridCount === 1
    ? 'grid-cols-1'
    : secondGridCount === 2
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
      : 'grid-cols-2 lg:grid-cols-3';
  const firstGridLastItemClass = firstGridCount === 3 ? 'col-span-2 lg:col-span-1' : '';
  const secondGridLastItemClass = secondGridCount === 3 ? 'col-span-2 lg:col-span-1' : '';
  const handleOrderClick = (order: Order) => {
    const creatorName = (order.createdByName && order.createdByName !== 'Usuário proprietário')
      ? order.createdByName
      : creatorProfiles.find(profile => profile.uid === order.userId)?.displayName
        || (order.userId === user?.uid ? user.displayName || user.email || 'Você' : undefined)
        || (order.createdByName !== 'Usuário proprietário' ? order.createdByName : undefined);

    setSelectedOrder({
      ...order,
      createdByName: creatorName,
    });
    setDetailsOpen(true);
  };

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await firebaseOrderService.updateOrderStatus(orderId, status);
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status });
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      toast.error('Erro ao atualizar status do pedido');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await firebaseOrderService.deleteOrder(orderId);
      // Preserva histórico se já gerou receita/foi concluído;
      // apenas decrementa do cliente se era um rascunho pendente nunca pago
      if (order?.customerId && order.price && order.status === 'pending' && (!order.payment || order.payment.status === 'pending')) {
        await firebaseCustomerService.decrementCustomerStats(order.customerId, order.price).catch(() => {});
      }
      setDetailsOpen(false);
      setSelectedOrder(null);
      toast.success('Pedido removido!');
    } catch (err) {
      console.error('Erro ao deletar pedido:', err);
      toast.error('Não foi possível remover o pedido. Tente novamente.');
    }
  };

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in-progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    // Métricas financeiras consolidadas (preserva vendas mesmo de pedidos arquivados/removidos do quadro)
    const fallbackRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.price, 0);
    const totalRevenue = ledgerStats.completedRevenue > 0
      ? ledgerStats.completedRevenue
      : fallbackRevenue;

    // Pagamentos
    const paidOrders = orders.filter(o => o.payment?.status === 'paid').length;
    const partialOrders = orders.filter(o => o.payment?.status === 'partial').length;

    // Pedidos ativos (não cancelados) sem pagamento completo
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const pendingPayments = activeOrders.filter(o =>
      !o.payment || o.payment.status === 'pending' || o.payment.status === 'partial'
    ).length;

    const totalPaid = ledgerStats.totalPaid > 0
      ? ledgerStats.totalPaid
      : orders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);

    // "A Receber": total do que ainda não foi pago em pedidos ativos
    const totalPending = activeOrders
      .filter(o => !o.payment || o.payment.status !== 'paid')
      .reduce((sum, o) => {
        if (!o.payment) return sum + o.price; // sem pagamento = tudo pendente
        return sum + (o.payment.remainingAmount ?? o.price - (o.payment.paidAmount || 0));
      }, 0);

    // Previsão de receita (pedidos em andamento + pendentes)
    const expectedRevenue = orders
      .filter(o => o.status === 'pending' || o.status === 'in-progress')
      .reduce((sum, o) => sum + o.price, 0);

    // Ticket médio: DESCARTA CANCELADOS!
    const validOrders = orders.filter(o => o.status !== 'cancelled');
    const fallbackAverageOrderValue = validOrders.length > 0
      ? validOrders.reduce((sum, o) => sum + o.price, 0) / validOrders.length
      : 0;

    const averageOrderValue = ledgerStats.averageTicket > 0
      ? ledgerStats.averageTicket
      : fallbackAverageOrderValue;

    // Produtos mais vendidos
    const productCounts = new Map<string, { count: number; revenue: number }>();
    orders.forEach(order => {
      const current = productCounts.get(order.productName) || { count: 0, revenue: 0 };
      productCounts.set(order.productName, {
        count: current.count + 1,
        revenue: current.revenue + order.price,
      });
    });

    const topProducts = Array.from(productCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Taxa de entrega no prazo (pedidos entregues na semana atual vs entrega esperada)
    const thisWeekOrders = orders.filter(o => {
      const deliveryDate = parseLocalDate(o.deliveryDate);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return deliveryDate >= weekStart && deliveryDate < weekEnd;
    });

    const deliveriesThisWeek = thisWeekOrders.length;

    // Pedidos atrasados: pendentes ou em produção com data de entrega já passada
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueOrders = orders.filter(o => {
      if (o.status !== 'pending' && o.status !== 'in-progress') return false;
      const delivery = parseLocalDate(o.deliveryDate);
      return delivery < today;
    });
    const overdue = overdueOrders.length;

    return {
      total,
      pending,
      inProgress,
      completed,
      cancelled,
      totalRevenue,
      paidOrders,
      partialOrders,
      pendingPayments,
      totalPaid,
      totalPending,
      expectedRevenue,
      averageOrderValue,
      topProducts,
      deliveriesThisWeek,
      overdue,
    };
  }, [orders]);

  const statusChartData = useMemo(() => [
    { status: 'Pendente', value: stats.pending, fill: '#f59e0b' },
    { status: 'Em Produção', value: stats.inProgress, fill: '#3b82f6' },
    { status: 'Concluído', value: stats.completed, fill: '#22c55e' },
    { status: 'Cancelado', value: stats.cancelled, fill: '#ef4444' },
  ].filter(d => d.value > 0), [stats]);

  const ordersPerWeek = useMemo(() => {
    const now = new Date();
    const currentSunday = new Date(now);
    currentSunday.setDate(now.getDate() - now.getDay());
    currentSunday.setHours(0, 0, 0, 0);
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(currentSunday);
      weekStart.setDate(currentSunday.getDate() - (7 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const count = orders.filter(o => {
        const created = new Date(o.createdAt);
        return created >= weekStart && created < weekEnd;
      }).length;
      return {
        semana: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        pedidos: count,
      };
    });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.customerName.toLowerCase().includes(query) ||
        order.productName.toLowerCase().includes(query) ||
        order.customerPhone.includes(query) ||
        (order.tags && order.tags.some(tag => tag.name.toLowerCase().includes(query)))
      );
    }

    // Filtro por tags selecionadas
    if (selectedTags.length > 0) {
      filtered = filtered.filter(order =>
        order.tags && selectedTags.every(selectedTag => order.tags!.some(tag => tag.name === selectedTag))
      );
    }

    // Filtro por permuta/parceria
    if (showExchangeOnly) {
      filtered = filtered.filter(order => order.isExchange);
    }

    return filtered;
  }, [orders, searchQuery, selectedTags, showExchangeOnly]);

  // Obter todas as tags únicas
  const allTags = useMemo(() => {
    const tagsMap = new Map<string, string>();
    orders.forEach(order => {
      order.tags?.forEach(tag => {
        if (!tagsMap.has(tag.name)) {
          tagsMap.set(tag.name, tag.color);
        }
      });
    });
    return Array.from(tagsMap.entries())
      .map(([name, color]) => ({ name, color }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [orders]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const toggleOrderSelection = (orderId: string, selected: boolean) => {
    setSelectedOrderIds(prev => {
      if (selected) {
        return prev.includes(orderId) ? prev : [...prev, orderId];
      }
      return prev.filter(id => id !== orderId);
    });
  };

  const allFilteredOrdersSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every(order => selectedOrderIds.includes(order.id));

  const toggleSelectAllVisibleOrders = () => {
    if (allFilteredOrdersSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !filteredOrders.some(order => order.id === id)));
      return;
    }

    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      filteredOrders.forEach(order => next.add(order.id));
      return [...next];
    });
  };

  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;

    setBulkOrderDeleting(true);
    try {
      const ordersToDelete = orders.filter((order) => selectedOrderIds.includes(order.id));

      await Promise.all(
        ordersToDelete.map(async (order) => {
          await firebaseOrderService.deleteOrder(order.id);
          if (order.customerId && order.price && order.status === 'pending' && (!order.payment || order.payment.status === 'pending')) {
            await firebaseCustomerService.decrementCustomerStats(order.customerId, order.price).catch(() => {});
          }
        }),
      );

      toast.success(`${ordersToDelete.length} pedido${ordersToDelete.length === 1 ? '' : 's'} excluído${ordersToDelete.length === 1 ? '' : 's'}`);
      setSelectedOrderIds([]);
      setIsBulkOrderDeleteOpen(false);
    } catch (err) {
      console.error('Erro ao excluir pedidos em massa:', err);
      toast.error('Erro ao excluir pedidos selecionados');
    } finally {
      setBulkOrderDeleting(false);
    }
  };

  const handleBulkAssignOrders = async () => {
    if (selectedOrderIds.length === 0 || userProfile?.role !== 'admin') return;

    const targetMember = bulkAssignTargetUid !== '__none__'
      ? teamMembers.find((m) => m.uid === bulkAssignTargetUid) || null
      : null;

    setBulkAssigning(true);
    try {
      await firebaseOrderService.assignOrdersBulk(selectedOrderIds, targetMember);
      const targetName = targetMember ? targetMember.displayName : 'Sem responsável';
      toast.success(
        `${selectedOrderIds.length} pedido${selectedOrderIds.length === 1 ? '' : 's'} atribuído${selectedOrderIds.length === 1 ? '' : 's'} para ${targetName}`
      );
      setSelectedOrderIds([]);
      setIsBulkAssignOpen(false);
    } catch (err: any) {
      console.error('Erro ao atribuir pedidos em lote:', err);
      toast.error(err?.message || 'Erro ao atribuir pedidos');
    } finally {
      setBulkAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{getGreeting()}!</h1>
            <p className="text-muted-foreground">Carregando seus pedidos...</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
          <DashboardCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">Erro ao carregar pedidos</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {getGreeting()}{user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}!
          </h1>
          <p className="mt-1 text-muted-foreground">Gerencie seus pedidos personalizados</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="default"
            onClick={() => exportOrdersToExcel(filteredOrders)}
            disabled={filteredOrders.length === 0}
            className="gap-2"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <NewOrderDialog />
        </div>
      </div>

      {isFilterActive && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Users className="size-4 shrink-0" />
            <span className="truncate">
              Visualizando dados de: <strong>{selectedFilterLabel}</strong> ({orders.length} pedidos encontrados)
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
      <div data-kpi-grid data-count={secondGridCount} className={`grid gap-4 lg:gap-6 ${secondGridClass}`}>
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
      {showCard('delivery') && <DeliveryAlerts orders={orders} daysThreshold={settings?.deliveryAlertDays ?? 3} onOrderClick={handleOrderClick} />}

      {/* Pedidos Atrasados */}
      {showCard('overdue') && <OverdueOrders orders={orders} onOrderClick={handleOrderClick} />}

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, produto ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {userProfile?.role === 'admin' && (
          <div className="shrink-0">
            <AdminTeamFilter variant="inline" />
          </div>
        )}
      </div>

      {(allTags.length > 0 || true) && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Filtrar por tags:</div>
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <Badge
                key={tag.name}
                className={`cursor-pointer border transition-colors hover:brightness-95 ${
                  selectedTags.includes(tag.name)
                    ? 'border-primary/50 ring-2 ring-primary/30 ring-offset-1'
                    : 'border-border/60'
                }`}
                onClick={() => toggleTag(tag.name)}
                style={{
                  backgroundColor: `color-mix(in srgb, ${tag.color} 22%, transparent)`,
                  borderColor: selectedTags.includes(tag.name)
                    ? `color-mix(in srgb, ${tag.color} 55%, var(--border))`
                    : undefined,
                  color: 'var(--foreground)',
                }}
              >
                {tag.name}
                {selectedTags.includes(tag.name) && (
                  <X className="size-3 ml-1" />
                )}
              </Badge>
            ))}
            <Badge
              className={`cursor-pointer hover:opacity-80 transition-opacity gap-1 ${
                showExchangeOnly
                  ? 'border border-primary/50 bg-primary/20 text-primary ring-2 ring-primary/30 ring-offset-1'
                  : 'border border-border/60 bg-muted/40 text-muted-foreground'
              }`}
              onClick={() => setShowExchangeOnly(prev => !prev)}
            >
              <Repeat2 className="size-3" />
              Permuta / Parceria
              {showExchangeOnly && <X className="size-3 ml-0.5" />}
            </Badge>
            {(selectedTags.length > 0 || showExchangeOnly || isFilterActive) && (
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-muted"
                onClick={() => { setSelectedTags([]); setShowExchangeOnly(false); clearUserFilter(); }}
              >
                Limpar filtros
              </Badge>
            )}
          </div>
        </div>
      )}

      {(selectedOrderIds.length > 0 || filteredOrders.length > 0) && (
        <div className="glass-chip flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-primary">
              {selectedOrderIds.length} selecionado{selectedOrderIds.length === 1 ? '' : 's'}
            </p>
            <Button variant="outline" size="sm" onClick={toggleSelectAllVisibleOrders}>
              {allFilteredOrdersSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedOrderIds.length > 0 && userProfile?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-xs sm:text-sm font-medium"
                onClick={() => {
                  setBulkAssignTargetUid('__none__');
                  setIsBulkAssignOpen(true);
                }}
              >
                <UserCheck className="size-4 text-primary shrink-0" />
                <span>Atribuir ({selectedOrderIds.length})</span>
              </Button>
            )}
            {selectedOrderIds.length > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-xs sm:text-sm" onClick={() => setSelectedOrderIds([])}>
                Limpar
              </Button>
            )}
            {selectedOrderIds.length > 0 && (hasPermission(p => p.orders?.delete ?? false) || userProfile?.role === 'user') && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-2 h-9 text-xs sm:text-sm"
                onClick={() => setIsBulkOrderDeleteOpen(true)}
                disabled={bulkOrderDeleting}
              >
                <Trash2 className="size-4 shrink-0" />
                Excluir selecionados
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="flex-1 sm:flex-none">Todos ({filteredOrders.length})</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1 sm:flex-none">
            Pendentes ({filteredOrders.filter(o => o.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="flex-1 sm:flex-none">
            Em Produção ({filteredOrders.filter(o => o.status === 'in-progress').length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-none">
            Concluídos ({filteredOrders.filter(o => o.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredOrders.length === 0 ? (
            <EmptyState
              message="Nenhum pedido encontrado"
              hint={searchQuery || selectedTags.length > 0 || showExchangeOnly ? 'Ajuste os filtros para realizar uma nova busca.' : 'Crie seu primeiro pedido selecionando “Novo Pedido”.'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isSelected={selectedOrderIds.includes(order.id)}
                  onToggleSelect={toggleOrderSelection}
                  onClick={() => handleOrderClick(order)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {filteredOrders.filter(o => o.status === 'pending').length === 0 ? (
            <EmptyState message="Nenhum pedido pendente" hint="Pedidos aguardando início aparecem aqui." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders
                .filter(o => o.status === 'pending')
                .map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={toggleOrderSelection}
                    onClick={() => handleOrderClick(order)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {filteredOrders.filter(o => o.status === 'in-progress').length === 0 ? (
            <EmptyState message="Nenhum pedido em produção" hint="Pedidos em andamento aparecem aqui." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders
                .filter(o => o.status === 'in-progress')
                .map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={toggleOrderSelection}
                    onClick={() => handleOrderClick(order)}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {filteredOrders.filter(o => o.status === 'completed').length === 0 ? (
            <EmptyState message="Nenhum pedido concluído" hint="Pedidos entregues aparecem aqui." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders
                .filter(o => o.status === 'completed')
                .map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderIds.includes(order.id)}
                    onToggleSelect={toggleOrderSelection}
                    onClick={() => handleOrderClick(order)}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Diálogo de Atribuição em Lote */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-md max-h-[85dvh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="size-5 text-primary" />
              Atribuir Pedidos em Lote
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Defina o responsável pela execução dos <strong className="text-foreground">{selectedOrderIds.length}</strong> pedidos selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-2">
            <label className="text-xs sm:text-sm font-medium">Membro da equipe responsável</label>
            <Select
              value={bulkAssignTargetUid}
              onValueChange={setBulkAssignTargetUid}
            >
              <SelectTrigger className="h-11 sm:h-10 text-base sm:text-sm">
                <SelectValue placeholder="Selecione um responsável" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="__none__">Sem responsável (Remover atribuição)</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.uid} value={member.uid}>
                    {member.displayName} {member.role === 'funcionario' ? '(Equipe)' : member.role === 'admin' ? '(Admin)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkAssignOpen(false)}
              disabled={bulkAssigning}
              className="w-full sm:w-auto h-10 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAssignOrders}
              disabled={bulkAssigning}
              className="w-full sm:w-auto h-10 text-sm gap-2"
            >
              {bulkAssigning && <Loader2 className="size-4 animate-spin" />}
              Salvar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isBulkOrderDeleteOpen} onOpenChange={setIsBulkOrderDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedidos selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{selectedOrderIds.length}</strong> pedido{selectedOrderIds.length === 1 ? '' : 's'}.
              Essa ação pode ser revertida apenas removendo os registros do banco.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteOrders}
              className="bg-destructive text-destructive-foreground"
              disabled={bulkOrderDeleting}
            >
              {bulkOrderDeleting ? 'Excluindo...' : 'Excluir selecionados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            // Limpa o pedido selecionado após a animação de fechamento
            setTimeout(() => setSelectedOrder(null), 300);
          }
        }}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />
    </div>
  );
}