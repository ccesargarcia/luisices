import { useMemo, useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router';
import { Order, OrderStatus, UserProfile, canAccessArchivedOrders } from '../types';
import { OrderCard } from '../components/OrderCard';
import { OrderDetailsDialog } from '../components/OrderDetailsDialog';
import { NewOrderDialog } from '../components/NewOrderDialog';
import { DashboardHeaderMetrics } from '../components/dashboard/DashboardHeaderMetrics';
import { DashboardBulkBar } from '../components/dashboard/DashboardBulkBar';
import { DashboardCardSkeleton, OrderCardSkeleton } from '../components/SkeletonLoaders';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { SectionErrorBoundary } from '../components/common/SectionErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
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
  RefreshCw,
  LayoutGrid,
  LayoutList,
  Archive,
  ArchiveRestore,
  ExternalLink,
} from 'lucide-react';
import { OrderTable } from '../components/OrderTable';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogBody,
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
  const { user, userProfile, isAdmin, hasPermission } = useAuth();
  const canViewArchived = isAdmin || canAccessArchivedOrders(userProfile?.permissions, 'view');
  const canArchive = isAdmin || canAccessArchivedOrders(userProfile?.permissions, 'create');
  const canUnarchive = isAdmin || canAccessArchivedOrders(userProfile?.permissions, 'edit');
  const {
    orders,
    loading,
    error,
    refreshOrders,
    isFilterActive,
    selectedFilterLabel,
    clearUserFilter,
    teamMembers,
    selectedUserIds,
  } = useFirebaseOrders();
  const { settings, updateSettings } = useUserSettings();
  const {
    stats: ledgerStats,
    allSales,
    teamFilteredSales,
    loading: ledgerLoading,
  } = useSalesLedger({ teamUserIds: selectedUserIds });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [orderToPromptArchive, setOrderToPromptArchive] = useState<Order | null>(null);
  const [alwaysAutoArchive, setAlwaysAutoArchive] = useState(false);
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [isBulkOrderDeleteOpen, setIsBulkOrderDeleteOpen] = useState(false);
  const [bulkOrderDeleting, setBulkOrderDeleting] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [bulkAssignTargetUid, setBulkAssignTargetUid] = useState<string>('__none__');
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showExchangeOnly, setShowExchangeOnly] = useState(false);
  const [creatorProfiles, setCreatorProfiles] = useState<UserProfile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('orders_view_mode');
      return saved === 'table' ? 'table' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('orders_view_mode', mode);
    } catch {}
  };

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
      const order = orders.find((o) => o.id === orderId);
      await firebaseOrderService.updateOrderStatus(orderId, status, order?.version);
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, status, version: (selectedOrder.version || 1) + 1 });
      }

      // Se foi marcado como concluído:
      if (status === 'completed') {
        if (settings?.autoArchiveCompletedOrders && canArchive) {
          await firebaseOrderService.archiveOrder(orderId);
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, status: 'completed', isArchived: true, version: (selectedOrder.version || 1) + 1 });
          }
          toast.success('Pedido marcado como concluído e arquivado automaticamente!');
        } else if (canArchive) {
          const target = order || (selectedOrder?.id === orderId ? selectedOrder : null);
          if (target) {
            setOrderToPromptArchive({ ...target, status: 'completed' });
          }
        }
      } else if (order?.isArchived && canUnarchive) {
        await firebaseOrderService.unarchiveOrder(orderId);
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

  const currentMonthStats = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    // Fallback caso a coleção sales_ledger ainda não tenha sido sincronizada no ambiente
    const ordersInMonth = orders.filter((o) => {
      const dateStr = o.createdAt;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d.getMonth() === curMonth && d.getFullYear() === curYear;
    });

    const completedInMonth = ordersInMonth.filter((o) => o.status === 'completed');
    const fallbackRevenue = completedInMonth.reduce((sum, o) => sum + (o.price || 0), 0);
    const fallbackCount = completedInMonth.length;
    const fallbackPaid = ordersInMonth.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);
    const validOrdersInMonth = ordersInMonth.filter((o) => o.status !== 'cancelled');
    const fallbackAvgTicket = validOrdersInMonth.length > 0
      ? validOrdersInMonth.reduce((sum, o) => sum + (o.price || 0), 0) / validOrdersInMonth.length
      : 0;

    const hasLedgerData = (isFilterActive ? teamFilteredSales.length : allSales.length) > 0;

    return {
      revenue: hasLedgerData ? ledgerStats.completedRevenue : fallbackRevenue,
      completedCount: hasLedgerData ? ledgerStats.completedCount : fallbackCount,
      avgTicket: hasLedgerData ? ledgerStats.averageTicket : fallbackAvgTicket,
      totalPaid: hasLedgerData ? ledgerStats.totalPaid : fallbackPaid,
    };
  }, [allSales.length, teamFilteredSales.length, isFilterActive, ledgerStats, orders]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const inProgress = orders.filter(o => o.status === 'in-progress').length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;

    // Métricas financeiras canônicas do mês corrente
    const totalRevenue = currentMonthStats.revenue;

    // Pagamentos
    const paidOrders = orders.filter(o => o.payment?.status === 'paid').length;
    const partialOrders = orders.filter(o => o.payment?.status === 'partial').length;

    // Pedidos ativos (não cancelados) sem pagamento completo
    const activeOrders = orders.filter(o => o.status !== 'cancelled');
    const pendingPayments = activeOrders.filter(o =>
      !o.payment || o.payment.status === 'pending' || o.payment.status === 'partial'
    ).length;

    const totalPaid = isFilterActive
      ? orders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0)
      : (ledgerStats.totalPaid > 0
          ? ledgerStats.totalPaid
          : orders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0));

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
  }, [orders, ledgerStats]);

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

  // Paginação e controle por aba
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in-progress' | 'completed' | 'archived'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(() => {
    try {
      const saved = localStorage.getItem('dashboard_orders_page_size');
      if (saved === 'all') return 'all';
      if (saved === '6') return 6;
      if (saved === '12') return 12;
      if (saved === '24') return 24;
    } catch {}
    return 12;
  });

  const activeFilteredOrders = useMemo(() => {
    return filteredOrders.filter(o => !o.isArchived);
  }, [filteredOrders]);

  const archivedFilteredOrders = useMemo(() => {
    return filteredOrders.filter(o => Boolean(o.isArchived));
  }, [filteredOrders]);

  const tabOrdersMap = useMemo(() => ({
    all: activeFilteredOrders,
    pending: activeFilteredOrders.filter((o) => o.status === 'pending'),
    'in-progress': activeFilteredOrders.filter((o) => o.status === 'in-progress'),
    completed: activeFilteredOrders.filter((o) => o.status === 'completed'),
    archived: archivedFilteredOrders,
  }), [activeFilteredOrders, archivedFilteredOrders]);

  const activeTabOrders = tabOrdersMap[activeTab];
  const totalTabOrders = activeTabOrders.length;
  const effectivePageSize = typeof pageSize === 'number' ? pageSize : 12;
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalTabOrders / effectivePageSize));

  useEffect(() => {
    if (activeTab === 'archived' && !canViewArchived) {
      setActiveTab('all');
    }
  }, [activeTab, canViewArchived]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags, showExchangeOnly, activeTab, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const pagedOrders = useMemo(() => {
    if (pageSize === 'all') return activeTabOrders;
    const start = (currentPage - 1) * effectivePageSize;
    return activeTabOrders.slice(start, start + effectivePageSize);
  }, [activeTabOrders, currentPage, pageSize, effectivePageSize]);

  const startItem = totalTabOrders === 0 ? 0 : (pageSize === 'all' ? 1 : (currentPage - 1) * effectivePageSize + 1);
  const endItem = pageSize === 'all' ? totalTabOrders : Math.min(currentPage * effectivePageSize, totalTabOrders);

  const handlePageSizeChange = (newSize: number | 'all') => {
    setPageSize(newSize);
    setCurrentPage(1);
    try {
      localStorage.setItem('dashboard_orders_page_size', String(newSize));
    } catch {}
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    const element = document.getElementById('dashboard-orders-section');
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.top < 0) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const allVisibleOrdersSelected =
    pagedOrders.length > 0 &&
    pagedOrders.every(order => selectedOrderIds.includes(order.id));

  const allTabOrdersSelected =
    activeTabOrders.length > 0 &&
    activeTabOrders.every(order => selectedOrderIds.includes(order.id));

  const toggleSelectAllVisibleOrders = () => {
    if (allVisibleOrdersSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !pagedOrders.some(order => order.id === id)));
      return;
    }

    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      pagedOrders.forEach(order => next.add(order.id));
      return [...next];
    });
  };

  const toggleSelectAllTabOrders = () => {
    if (allTabOrdersSelected) {
      setSelectedOrderIds(prev => prev.filter(id => !activeTabOrders.some(order => order.id === id)));
      return;
    }

    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      activeTabOrders.forEach(order => next.add(order.id));
      return [...next];
    });
  };

  const renderOrdersList = (ordersToRender: Order[]) => {
    if (viewMode === 'table') {
      return (
        <OrderTable
          orders={ordersToRender}
          selectedOrderIds={selectedOrderIds}
          onToggleSelect={toggleOrderSelection}
          onOrderClick={handleOrderClick}
          onToggleSelectAll={toggleSelectAllVisibleOrders}
          allSelected={allVisibleOrdersSelected}
        />
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ordersToRender.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            isSelected={selectedOrderIds.includes(order.id)}
            onToggleSelect={toggleOrderSelection}
            onClick={() => handleOrderClick(order)}
          />
        ))}
      </div>
    );
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

  const handleBulkArchiveOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setBulkArchiving(true);
    try {
      await firebaseOrderService.archiveOrdersBulk(selectedOrderIds);
      toast.success(`${selectedOrderIds.length} pedido${selectedOrderIds.length === 1 ? '' : 's'} arquivado${selectedOrderIds.length === 1 ? '' : 's'} com sucesso!`);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Erro ao arquivar pedidos em lote:', err);
      toast.error('Erro ao arquivar pedidos selecionados');
    } finally {
      setBulkArchiving(false);
    }
  };

  const handleBulkUnarchiveOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setBulkArchiving(true);
    try {
      await firebaseOrderService.unarchiveOrdersBulk(selectedOrderIds);
      toast.success(`${selectedOrderIds.length} pedido${selectedOrderIds.length === 1 ? '' : 's'} restaurado${selectedOrderIds.length === 1 ? '' : 's'} para o painel principal!`);
      setSelectedOrderIds([]);
    } catch (err) {
      console.error('Erro ao desarquivar pedidos em lote:', err);
      toast.error('Erro ao desarquivar pedidos selecionados');
    } finally {
      setBulkArchiving(false);
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

  const isInitialLoading = loading || (ledgerLoading && allSales.length === 0);

  if (isInitialLoading) {
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
      <div className="flex items-center justify-center min-h-[50vh] p-4">
        <div className="flex flex-col items-center justify-center max-w-md p-6 sm:p-8 rounded-2xl bg-card border border-destructive/20 text-center shadow-lg backdrop-blur-md animate-in fade-in">
          <div className="size-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-4">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Erro ao carregar pedidos</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {error.includes('Missing or insufficient permissions')
              ? 'Permissão em sincronização ou sessão expirada. Tente recarregar para restaurar a conexão.'
              : error}
          </p>
          <Button
            type="button"
            onClick={() => refreshOrders()}
            className="gap-2 cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>Tentar Novamente</span>
          </Button>
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

      <DashboardHeaderMetrics
        stats={stats}
        ledgerStats={ledgerStats}
        currentMonthStats={currentMonthStats}
        ledgerLoading={ledgerLoading}
        visibleCards={visibleCards}
        currentMonthName={currentMonthName}
        statusChartData={statusChartData}
        ordersPerWeek={ordersPerWeek}
        deliveryAlertDays={settings?.deliveryAlertDays ?? 3}
        orders={orders}
        onOrderClick={handleOrderClick}
      />

      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por cliente, produto ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 h-10 w-full"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-sm"
              title="Limpar busca"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {userProfile?.role === 'admin' && (
          <div className="shrink-0 w-full sm:w-auto">
            <AdminTeamFilter variant="inline" className="w-full sm:w-auto" />
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

      <DashboardBulkBar
        selectedOrderIds={selectedOrderIds}
        totalTabOrders={totalTabOrders}
        pagedOrdersLength={pagedOrders.length}
        pageSize={pageSize}
        allVisibleOrdersSelected={allVisibleOrdersSelected}
        allTabOrdersSelected={allTabOrdersSelected}
        userProfile={userProfile}
        activeTab={activeTab}
        canArchive={canArchive}
        canUnarchive={canUnarchive}
        bulkArchiving={bulkArchiving}
        bulkOrderDeleting={bulkOrderDeleting}
        hasDeletePermission={hasPermission((p) => p.orders?.delete ?? false) || userProfile?.role === 'user'}
        onToggleSelectAllVisibleOrders={toggleSelectAllVisibleOrders}
        onToggleSelectAllTabOrders={toggleSelectAllTabOrders}
        onClearSelection={() => setSelectedOrderIds([])}
        onOpenBulkAssign={() => {
          setBulkAssignTargetUid('__none__');
          setIsBulkAssignOpen(true);
        }}
        onBulkArchiveOrders={handleBulkArchiveOrders}
        onBulkUnarchiveOrders={handleBulkUnarchiveOrders}
        onOpenBulkDelete={() => setIsBulkOrderDeleteOpen(true)}
      />

      <SectionErrorBoundary title="Esteira de Pedidos">
        <div id="dashboard-orders-section" className="space-y-4">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as any);
            setCurrentPage(1);
          }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                Todos ({tabOrdersMap.all.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="flex-1 sm:flex-none">
                Pendentes ({tabOrdersMap.pending.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="flex-1 sm:flex-none">
                Em Produção ({tabOrdersMap['in-progress'].length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1 sm:flex-none">
                Concluídos ({tabOrdersMap.completed.length})
              </TabsTrigger>
              {canViewArchived && (
                <TabsTrigger value="archived" className="flex-1 sm:flex-none gap-1.5">
                  <Archive className="size-3.5" />
                  Arquivados ({tabOrdersMap.archived.length})
                </TabsTrigger>
              )}
            </TabsList>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {/* Seletor de Modo de Exibição (Cards / Tabela) */}
              <div
                className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
                role="group"
                aria-label="Modo de visualização dos pedidos"
              >
                <button
                  type="button"
                  onClick={() => handleSetViewMode('grid')}
                  className={cn(
                    'p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer',
                    viewMode === 'grid'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Visualização em Cards"
                  aria-label="Visualização em Cards"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('table')}
                  className={cn(
                    'p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer',
                    viewMode === 'table'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Visualização em Tabela"
                  aria-label="Visualização em Tabela"
                >
                  <LayoutList className="size-4" />
                </button>
              </div>

              {/* Seletor de itens por página */}
              {(filteredOrders.length > 6 || pageSize !== 12) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="hidden sm:inline">Exibir:</span>
                  <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
                    {([6, 12, 24, 'all'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handlePageSizeChange(size)}
                        className={cn(
                          'px-2.5 py-1 rounded-md transition-all font-medium cursor-pointer',
                          pageSize === size
                            ? 'bg-background text-foreground shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {size === 'all' ? 'Todos' : size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <TabsContent value="all" className="space-y-4">
            {tabOrdersMap.all.length === 0 ? (
              <EmptyState
                message="Nenhum pedido encontrado"
                hint={searchQuery || selectedTags.length > 0 || showExchangeOnly ? 'Ajuste os filtros para realizar uma nova busca.' : 'Crie seu primeiro pedido selecionando “Novo Pedido”.'}
              />
            ) : (
              renderOrdersList(pagedOrders)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4">
            {tabOrdersMap.pending.length === 0 ? (
              <EmptyState message="Nenhum pedido pendente" hint="Pedidos aguardando início aparecem aqui." />
            ) : (
              renderOrdersList(pagedOrders)
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            {tabOrdersMap['in-progress'].length === 0 ? (
              <EmptyState message="Nenhum pedido em produção" hint="Pedidos em andamento aparecem aqui." />
            ) : (
              renderOrdersList(pagedOrders)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {tabOrdersMap.completed.length === 0 ? (
              <EmptyState message="Nenhum pedido concluído" hint="Pedidos entregues aparecem aqui." />
            ) : (
              renderOrdersList(pagedOrders)
            )}
          </TabsContent>

          {canViewArchived && (
            <TabsContent value="archived" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border/70 bg-muted/20">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Archive className="size-4 text-primary shrink-0" />
                  <span>
                    Estes pedidos foram arquivados para não poluir sua esteira principal.
                  </span>
                </div>
                <Link to="/pedidos-arquivados">
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs font-medium shrink-0">
                    <ExternalLink className="size-3.5" />
                    Abrir Área de Arquivamento Completa
                  </Button>
                </Link>
              </div>
              {tabOrdersMap.archived.length === 0 ? (
                <EmptyState
                  message="Nenhum pedido arquivado"
                  hint="Ao concluir um pedido, você pode enviá-lo para a área de arquivamento para manter a tela limpa."
                />
              ) : (
                renderOrdersList(pagedOrders)
              )}
            </TabsContent>
          )}

          {/* Controles de Paginação */}
          {pageSize !== 'all' && totalPages > 1 && totalTabOrders > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Mostrando {startItem}–{endItem} de {totalTabOrders} pedido{totalTabOrders !== 1 ? 's' : ''} — Página{' '}
                <strong className="text-foreground">{currentPage}</strong> de <strong>{totalPages}</strong>
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1];
                      const hasGap = prevPage && page - prevPage > 1;
                      return (
                        <Fragment key={page}>
                          {hasGap && <span className="px-1 text-xs text-muted-foreground">…</span>}
                          <Button
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            className="size-8 p-0 text-xs"
                            onClick={() => handlePageChange(page)}
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
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </Tabs>
        </div>
      </SectionErrorBoundary>

      {/* Diálogo de Atribuição em Lote */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent size="md" noPadding className="max-h-[85dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="size-5 text-primary" />
              Atribuir Pedidos em Lote
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              Defina o responsável pela execução dos <strong className="text-foreground">{selectedOrderIds.length}</strong> pedidos selecionados.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="p-4 sm:p-6 space-y-3">
            <div className="space-y-2">
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
          </DialogBody>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex-col-reverse sm:flex-row gap-2 sm:gap-0">
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
        onToggleArchive={(orderId, archive) => {
          if (selectedOrder && selectedOrder.id === orderId) {
            setSelectedOrder({ ...selectedOrder, isArchived: archive });
          }
        }}
      />

      {/* Diálogo de Confirmação para Arquivar Pedido Concluído */}
      <Dialog
        open={!!orderToPromptArchive}
        onOpenChange={(open) => {
          if (!open) {
            setOrderToPromptArchive(null);
            setAlwaysAutoArchive(false);
          }
        }}
      >
        <DialogContent size="md" noPadding className="max-h-[85dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Archive className="size-5 text-primary" />
              Arquivar este pedido concluído?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
              O pedido <strong className="text-foreground">{orderToPromptArchive?.orderNumber || orderToPromptArchive?.customerName}</strong> foi marcado como concluído.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="p-4 sm:p-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deseja enviá-lo para a <strong>Área de Pedidos Arquivados</strong>? Isso remove o pedido do painel operacional para não poluir sua tela, mantendo o histórico financeiro e relatórios 100% preservados.
            </p>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border/70 bg-muted/20">
              <Checkbox
                id="always-auto-archive-cb"
                checked={alwaysAutoArchive}
                onCheckedChange={(checked) => setAlwaysAutoArchive(Boolean(checked))}
                className="mt-0.5"
              />
              <label
                htmlFor="always-auto-archive-cb"
                className="text-xs text-muted-foreground cursor-pointer select-none leading-relaxed"
              >
                <strong className="text-foreground block font-medium">Sempre arquivar automaticamente</strong>
                Não perguntar novamente nas próximas conclusões (você pode alterar isso a qualquer momento no menu de Configurações).
              </label>
            </div>
          </DialogBody>

          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex-col-reverse sm:flex-row gap-2 sm:gap-0 justify-between">
            <Button
              variant="outline"
              onClick={async () => {
                if (alwaysAutoArchive) {
                  await updateSettings({ autoArchiveCompletedOrders: true }).catch(() => {});
                }
                setOrderToPromptArchive(null);
                setAlwaysAutoArchive(false);
              }}
              className="w-full sm:w-auto h-10 text-sm"
            >
              Manter no Painel
            </Button>
            <Button
              onClick={async () => {
                if (!orderToPromptArchive) return;
                try {
                  await firebaseOrderService.archiveOrder(orderToPromptArchive.id);
                  if (alwaysAutoArchive) {
                    await updateSettings({ autoArchiveCompletedOrders: true }).catch(() => {});
                  }
                  toast.success('Pedido enviado para a área de arquivamento!');
                } catch {
                  toast.error('Erro ao arquivar pedido');
                } finally {
                  setOrderToPromptArchive(null);
                  setAlwaysAutoArchive(false);
                }
              }}
              className="gap-2 w-full sm:w-auto h-10 text-sm"
            >
              <Archive className="size-4" />
              Sim, Arquivar Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;
