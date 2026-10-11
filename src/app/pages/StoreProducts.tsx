import { BulkDeleteStoreProductsDialog } from '../components/store/BulkDeleteStoreProductsDialog';
import { BulkStoreProductsDialog } from '../components/store/BulkStoreProductsDialog';
import { StoreProductDialog } from '../components/store/StoreProductDialog';
import { ImportFromAtelierDialog } from '../components/store/ImportFromAtelierDialog';
import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { cn } from '../components/ui/utils';
import { Link } from 'react-router';
import { formatCurrency } from '../utils/currency';
import { StoreProduct, Product } from '../types';
import { firebaseStoreProductService } from '../../services/firebaseStoreProductService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
import { PaginationControls } from '../components/common/PaginationControls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogDescription } from '../components/ui/dialog';
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
  Plus,
  Images,
  Pencil,
  Trash2,
  Search,
  Store,
  Loader2,
  Upload,
  X,
  ImageIcon,
  LayoutGrid,
  LayoutList,
  Clock,
  Sparkles,
  Globe,
  ExternalLink,
  Eye,
  EyeOff, Pause,
  PackagePlus,
  CheckCircle2,
  CheckSquare,
  Square,
  Tag,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { FormattedDescription } from '../components/FormattedDescription';
const STORE_PRODUCTS_VIEW_MODE_KEY = 'luisices_store_products_view_mode';
const STORE_PRODUCTS_PAGE_SIZE_KEY = 'luisices_store_products_page_size';

// ─── Página Principal de Produtos da Lojinha ─────────────────────────────────
export function StoreProducts() {
  const { userProfile } = useAuth();
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'pausados' | 'ocultos'>('todos');
  const [pageSize, setPageSize] = useState<number | 'all'>((() => {
    try {
      const saved = localStorage.getItem(STORE_PRODUCTS_PAGE_SIZE_KEY);
      if (saved === 'all') return 'all';
      if (saved) {
        const num = Number(saved);
        if ([12, 24, 48, 96].includes(num)) return num;
      }
    } catch {}
    return 24;
  }));
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageSizeChange = (newSize: number | 'all') => {
    setPageSize(newSize);
    setCurrentPage(1);
    try {
      localStorage.setItem(STORE_PRODUCTS_PAGE_SIZE_KEY, String(newSize));
    } catch {}
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem(STORE_PRODUCTS_VIEW_MODE_KEY);
      if (saved === 'grid' || saved === 'list') return saved;
    } catch {}
    return 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORE_PRODUCTS_VIEW_MODE_KEY, mode);
    } catch {}
  };

  const { settings, toggleStorePublished } = useUserSettings();
  const storePublished = settings?.storePublished !== undefined ? Boolean(settings.storePublished) : true;
  const [togglingStore, setTogglingStore] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreProduct | null>(null);
  const isAnyModalOpen = bulkDeleteOpen || bulkOpen || formOpen || importOpen || Boolean(deleteTarget);
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const clearSelection = () => {
    setSelectedProductIds([]);
  };


  // Permissões
  const canCreate = userProfile?.role === 'admin' || userProfile?.permissions?.storeProducts?.create || userProfile?.permissions?.store;
  const canEdit = userProfile?.role === 'admin' || userProfile?.permissions?.storeProducts?.edit || userProfile?.permissions?.store;
  const canDelete = userProfile?.role === 'admin' || userProfile?.permissions?.storeProducts?.delete;

  // Escuta produtos da vitrine em tempo real
  useEffect(() => {
    setLoading(true);
    const unsub = firebaseStoreProductService.subscribeToStoreProducts(
      (list) => {
        setStoreProducts(list);
        setLoading(false);
        setPermissionError(false);
      },
      (err: any) => {
        setLoading(false);
        if (
          err?.code === 'permission-denied' ||
          String(err?.message || '').toLowerCase().includes('permission')
        ) {
          setPermissionError(true);
        }
      }
    );
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    storeProducts.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [storeProducts]);

  const filteredProducts = useMemo(() => {
    return storeProducts.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase());

      const matchesCat = filterCategory === 'todos' || p.category.toLowerCase() === filterCategory.toLowerCase();

      
      const matchesStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'ativos' && (p.status === 'active' || (!p.status && p.active !== false))) ||
        (filterStatus === 'pausados' && p.status === 'paused') ||
        (filterStatus === 'ocultos' && (p.status === 'hidden' || (!p.status && p.active === false)));


      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [storeProducts, search, filterCategory, filterStatus]);

  // Reset de pagina ao filtrar ou alterar tamanho da pagina
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory, filterStatus, pageSize]);

  const totalProducts = filteredProducts.length;
  const effectivePageSize = typeof pageSize === "number" ? pageSize : (totalProducts || 1);
  const totalPages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalProducts / effectivePageSize));

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedProducts = useMemo(() => {
    if (pageSize === "all") return filteredProducts;
    const start = (currentPage - 1) * effectivePageSize;
    return filteredProducts.slice(start, start + effectivePageSize);
  }, [filteredProducts, currentPage, pageSize, effectivePageSize]);

  const startItem = totalProducts === 0 ? 0 : (pageSize === "all" ? 1 : (currentPage - 1) * effectivePageSize + 1);
  const endItem = pageSize === "all" ? totalProducts : Math.min(currentPage * effectivePageSize, totalProducts);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await firebaseStoreProductService.deleteStoreProduct(deleteTarget.id);
      toast.success('Produto removido da vitrine');
    } catch {
      toast.error('Erro ao excluir produto');
    } finally {
      setDeleteTarget(null);
    }
  }

  
  async function handleStatusChange(p: StoreProduct, status: 'active' | 'paused' | 'hidden') {
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine');
      return;
    }
    try {
      await firebaseStoreProductService.bulkUpdateStatus([p.id], status);
      toast.success(`"${p.name}" ${status === 'active' ? 'ativado' : status === 'paused' ? 'pausado' : 'oculto'}!`);
    } catch {
      toast.error('Erro ao alternar status da publicação');
    }
  }


  
  async function handleBulkUpdateStatus(status: 'active' | 'paused' | 'hidden') {
    if (selectedProductIds.length === 0) return;
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine.');
      return;
    }
    setIsBulkStatusUpdating(true);
    try {
      await firebaseStoreProductService.bulkUpdateStatus(selectedProductIds, status);
      toast.success(
        status === 'active'
          ? `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'publicação ativada' : 'publicações ativadas'} no catálogo.`
          : status === 'paused'
          ? `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'publicação pausada' : 'publicações pausadas'} no catálogo.`
          : `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'publicação oculta' : 'publicações ocultas'}.`
      );
      setSelectedProductIds([]);
    } catch (err) {
      console.error('Erro na alteração em lote de status:', err);
      toast.error('Ocorreu um erro ao atualizar o status das publicações selecionadas.');
    } finally {
      setIsBulkStatusUpdating(false);
    }
  }


  
  const activeCount = storeProducts.filter((p) => p.status === 'active' || (!p.status && p.active !== false)).length;
  const pausedCount = storeProducts.filter((p) => p.status === 'paused').length;
  const hiddenCount = storeProducts.filter((p) => p.status === 'hidden' || (!p.status && p.active === false)).length;


  return (
    <div className="space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
      {/* Header com Boas-vindas e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Store className="size-7 text-primary" />
            Produtos da Lojinha & Vitrine Online
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
            <p className="text-sm text-muted-foreground">
              Gestão do catálogo público e vitrine online para pedidos e encomendas personalizadas via WhatsApp.
            </p>
            <button
              type="button"
              disabled={togglingStore}
              onClick={async () => {
                setTogglingStore(true);
                try {
                  await toggleStorePublished(!storePublished);
                  if (!storePublished) {
                    toast.success("🟢 Loja publicada com sucesso! A vitrine está online.");
                  } else {
                    toast.warning("🔴 Loja despublicada! A vitrine está em modo manutenção.");
                  }
                } catch (err) {
                  toast.error("Erro ao alternar status da loja.");
                } finally {
                  setTogglingStore(false);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                storePublished
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 hover:bg-red-500/20"
              }`}
              title="Clique para alternar o status da vitrine"
            >
              <span className={`size-1.5 rounded-full ${storePublished ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span>{storePublished ? "Loja Online" : "Loja Fora do Ar"}</span>
              <span className="text-[10px] opacity-75 underline">
                ({togglingStore ? "Salvando..." : storePublished ? "Pausar Loja" : "Publicar"})
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors shadow-2xs cursor-pointer h-9"
          >
            <Globe size={14} className="text-primary shrink-0" />
            <span className="truncate">Ver Lojinha</span>
            <ExternalLink size={11} className="opacity-60 shrink-0" />
          </a>

          {canCreate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="gap-1.5 text-xs font-semibold h-9"
              >
                <PackagePlus size={14} className="text-primary shrink-0" />
                <span className="truncate">Importar Ateliê</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkOpen(true)}
                className="gap-1.5 text-xs font-semibold h-9 text-primary border-primary/30 hover:bg-primary/5"
              >
                <Images size={14} className="text-primary shrink-0" />
                <span className="truncate">Fotos em Lote</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingProduct(null);
                  setFormOpen(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-xs h-9 bg-primary text-primary-foreground"
              >
                <Plus size={15} className="shrink-0 stroke-[2.5]" />
                <span className="truncate">Novo Produto</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Alerta de Sincronização de Regras do Firestore */}
      {permissionError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-foreground text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Regras do Firestore pendentes de sincronização</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            O Firestore recusou a leitura da coleção <code>storeProducts</code> (<em>Missing or insufficient permissions</em>). As regras de segurança para liberar a vitrine pública e a gestão já foram atualizadas no arquivo <code>firestore.rules</code> do projeto.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Para aplicar no seu projeto Firebase, basta executar no terminal: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-foreground">firebase deploy --only firestore:rules</code> ou copiar a regra para o Console do Firebase (Firestore Database &gt; Regras).
          </p>
        </div>
      )}

      {/* Mini Cards de Indicadores Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Cadastrado</p>
              <p className="text-xl font-black text-foreground">{storeProducts.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Eye className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Publicados no Ar</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <EyeOff className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pausados / Ocultos</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{pausedCount + hiddenCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Categorias Ativas</p>
              <p className="text-xl font-black text-foreground">{categories.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

            {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="w-full lg:flex-1 relative min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do produto, categoria ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md cursor-pointer"
              title="Limpar busca"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro de Categoria */}
          <Select
            value={filterCategory}
            onValueChange={(val) => setFilterCategory(val)}
          >
            <SelectTrigger aria-label="Filtro de Categoria" className="h-9 text-xs flex-1 sm:flex-none min-w-[130px] max-w-full">
              <SelectValue placeholder="Todas as Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todas as Categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de Status */}
          <Select
            value={filterStatus}
            onValueChange={(val) => setFilterStatus(val as any)}
          >
            <SelectTrigger aria-label="Filtro de Status" className="h-9 text-xs flex-1 sm:flex-none min-w-[120px] max-w-full">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos os Status</SelectItem>
              <SelectItem value="ativos" className="text-xs">Apenas Publicados</SelectItem>
              <SelectItem value="pausados" className="text-xs">Pausados (Vitrine)</SelectItem>
              <SelectItem value="ocultos" className="text-xs">Ocultos</SelectItem>
            </SelectContent>
          </Select>

          {/* Seletor de Limite por Página */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground px-1 hidden xl:inline">Exibir:</span>
            {([12, 24, 48, 'all'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handlePageSizeChange(size)}
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer',
                  pageSize === size
                    ? 'bg-background shadow-xs text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                title={size === 'all' ? 'Exibir todos os produtos' : `Exibir ${size} produtos por página`}
              >
                {size === 'all' ? 'Todos' : size}
              </button>
            ))}
          </div>

          {/* Alternador Grid / Lista */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border shrink-0 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-background shadow-xs text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Visualização em galeria (grade)"
            >
              <LayoutGrid size={14} className="shrink-0" />
              <span className="hidden sm:inline text-[11px]">Grade</span>
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('list')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-background shadow-xs text-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Visualização em lista"
            >
              <LayoutList size={14} className="shrink-0" />
              <span className="hidden sm:inline text-[11px]">Lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Ações em Massa - Totalmente Adaptativa (Excelente em Retrato/Mobile e Paisagem/Desktop) */}
      {selectedProductIds.length > 0 && (canDelete || canEdit) && !isAnyModalOpen && (
        <aside
          aria-label="Ações em massa para produtos selecionados"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] inset-x-2.5 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-auto sm:max-w-2xl z-floating-bar p-2.5 sm:p-2 sm:px-3 rounded-2xl bg-card/95 dark:bg-stone-900/95 backdrop-blur-xl border border-primary/30 dark:border-white/15 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
            {/* Topo / Linha de seleção no mobile (ou lado esquerdo no desktop) */}
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="h-8 px-2 text-xs font-semibold gap-1.5 cursor-pointer hover:bg-primary/10"
                >
                  {selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0 ? (
                    <>
                      <CheckSquare size={15} className="text-primary stroke-[2.5]" />
                      <span>Desmarcar todos</span>
                    </>
                  ) : (
                    <>
                      <Square size={15} className="text-muted-foreground" />
                      <span>Todos ({filteredProducts.length})</span>
                    </>
                  )}
                </Button>
                <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border-primary/20 shrink-0">
                  {selectedProductIds.length} selecionado{selectedProductIds.length > 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Botão Cancelar visível no topo no mobile */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer sm:hidden flex items-center gap-1"
                title="Cancelar seleção"
              >
                <X size={15} />
                <span className="text-[11px]">Cancelar</span>
              </Button>
            </div>

            {/* Linha de ações no mobile (distribuída com flex-1 em largura total) / inline no desktop */}
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              {canEdit && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkStatusUpdating}
                    onClick={() => handleBulkUpdateStatus('hidden')}
                    className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 cursor-pointer shadow-2xs"
                    title="Ocultar publicações da vitrine"
                  >
                    {isBulkStatusUpdating ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <EyeOff size={13} className="shrink-0" />
                    )}
                    <span>Ocultar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkStatusUpdating}
                    onClick={() => handleBulkUpdateStatus('paused')}
                    className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-2xs"
                    title="Pausar vendas na vitrine"
                  >
                    {isBulkStatusUpdating ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <Pause size={13} className="shrink-0" />
                    )}
                    <span>Pausar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkStatusUpdating}
                    onClick={() => handleBulkUpdateStatus("active")}
                    className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
                    title="Ativar publicações na vitrine"
                  >
                    {isBulkStatusUpdating ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <Eye size={13} className="shrink-0" />
                    )}
                    <span>Ativar</span>
                  </Button>
                </>
              )}
              {canDelete && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-3 sm:px-2.5 text-xs font-bold gap-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white cursor-pointer shadow-xs shrink-0"
                  title="Remover publicações selecionadas da vitrine"
                >
                  <Trash2 size={14} className="shrink-0" />
                  <span>Excluir</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="hidden sm:inline-flex h-8 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                title="Cancelar seleção"
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        </aside>
      )}
      {/* Barra Informativa com Botão de Selecionar Todos quando nenhum selecionado */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground px-1 -mt-2">
          <div>
            {pageSize === 'all' || totalPages <= 1 ? (
              <span>
                Exibindo <strong>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'produto' : 'produtos'}
              </span>
            ) : (
              <span>
                Exibindo <strong>{startItem}–{endItem}</strong> de <strong>{totalProducts}</strong> produtos
              </span>
            )}
          </div>
          {selectedProductIds.length === 0 && (canDelete || canEdit) && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-lg hover:bg-muted/50 self-start sm:self-auto"
            >
              <Square size={13} />
              <span>Selecionar todos ({filteredProducts.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Grade / Lista de Produtos */}
      {loading ? (
        <div className="py-24 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span>Carregando vitrine da lojinha...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed rounded-3xl p-8 space-y-3 bg-muted/10">
          <Store size={40} className="mx-auto opacity-30 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {storeProducts.length === 0
                ? 'Nenhum produto cadastrado na vitrine da lojinha ainda.'
                : 'Nenhum produto encontrado para o filtro selecionado.'}
            </p>
            <p className="text-xs">
              {storeProducts.length === 0
                ? 'Publique produtos para que seus clientes possam navegar e pedir via WhatsApp.'
                : 'Tente limpar a busca ou selecionar outra categoria.'}
            </p>
          </div>
          {canCreate && storeProducts.length === 0 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="gap-1.5 text-xs">
                <PackagePlus size={14} /> Importar do Ateliê
              </Button>
              <Button size="sm" onClick={() => { setEditingProduct(null); setFormOpen(true); }} className="gap-1.5 text-xs">
                <Plus size={14} /> Novo Produto da Lojinha
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {pagedProducts.map((prod) => (
            <Card
              key={prod.id}
              className={`overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col ${
                selectedProductIds.includes(prod.id)
                  ? 'ring-2 ring-primary/70 border-primary shadow-md bg-primary/[0.02]'
                  : !prod.active
                  ? 'opacity-70 border-dashed bg-muted/20'
                  : 'bg-card'
              }`}
            >
              {/* Imagem do Produto */}
              <div className="relative aspect-square w-full bg-muted overflow-hidden group">
                {/* Checkbox de Seleção em Massa */}
                {(canDelete || canEdit) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectProduct(prod.id);
                    }}
                    className={`absolute top-2 left-2 z-20 size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      selectedProductIds.includes(prod.id)
                        ? 'bg-primary text-primary-foreground scale-105 ring-2 ring-white/90 dark:ring-black/90'
                        : 'bg-black/60 text-white hover:bg-black/80 hover:scale-105'
                    }`}
                    title={selectedProductIds.includes(prod.id) ? 'Desmarcar produto' : 'Selecionar para ações em lote'}
                  >
                    {selectedProductIds.includes(prod.id) ? (
                      <CheckSquare size={16} className="stroke-[2.5]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                )}
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-1">
                    <ImageIcon size={28} className="opacity-40" />
                    <span className="text-[10px]">Sem foto</span>
                  </div>
                )}

                {/* Selo de Destaque */}
                {prod.badge && (
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#613d3e] text-white shadow-xs z-10">
                    {prod.badge}
                  </span>
                )}

                {/* Switch de Ativação Rápida */}
                
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-1 py-1 rounded text-white shadow-xl">
                  <Select value={prod.status || (prod.active === false ? 'hidden' : 'active')} onValueChange={(val) => handleStatusChange(prod, val as any)}>
                    <SelectTrigger className="h-5 text-[10px] px-1.5 bg-transparent border-none text-white focus:ring-0 w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active"><span className="text-emerald-500 font-bold text-[10px]">Ativo</span></SelectItem>
                      <SelectItem value="paused"><span className="text-amber-500 font-bold text-[10px]">Pausado</span></SelectItem>
                      <SelectItem value="hidden"><span className="text-red-500 font-bold text-[10px]">Oculto</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Informações */}
              <CardContent className="p-3.5 flex-1 flex flex-col justify-between space-y-3 min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 max-w-full">
                      <Tag size={10} className="shrink-0" />
                      <span className="truncate">{prod.category || 'Geral'}</span>
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight break-words" title={prod.name}>
                    {prod.name}
                  </h3>
                  {prod.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 pt-0.5 leading-relaxed break-words">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={11} className="text-amber-600" />
                      Até {prod.leadTimeDays} dias
                    </span>
                    {prod.isCustomizable && (
                      <span className="text-[10px] font-semibold text-primary flex items-center gap-0.5">
                        <Sparkles size={10} /> Personalizável
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline justify-between pt-0.5">
                    <span className="text-xs text-muted-foreground">Valor vitrine:</span>
                    <span className="text-base font-extrabold text-primary tabular-nums">
                      {formatCurrency(prod.price)}
                    </span>
                  </div>

                  {/* Ações de Edição e Exclusão */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingProduct(prod);
                            setFormOpen(true);
                          }}
                          className="flex-1 text-xs h-8 gap-1"
                        >
                          <Pencil size={12} />
                          <span>Editar</span>
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTarget(prod)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 px-2.5"
                          title="Excluir produto da vitrine"
                        >
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Visualização em Lista - Responsiva sem overflow ou barra de rolagem horizontal */
        <div className="rounded-2xl border border-border overflow-hidden bg-card divide-y divide-border">
          {pagedProducts.map((prod) => (
            <div
              key={prod.id}
              className={`p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                selectedProductIds.includes(prod.id)
                  ? 'bg-primary/5 ring-1 ring-inset ring-primary/40'
                  : 'hover:bg-muted/30'
              }`}
            >
              {/* Foto + Dados principais */}
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {(canDelete || canEdit) && (
                  <button
                    type="button"
                    onClick={() => toggleSelectProduct(prod.id)}
                    className={`size-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      selectedProductIds.includes(prod.id)
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                    title={selectedProductIds.includes(prod.id) ? 'Desmarcar' : 'Selecionar'}
                  >
                    {selectedProductIds.includes(prod.id) ? (
                      <CheckSquare size={16} className="stroke-[2.5]" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                )}
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="size-12 sm:size-14 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="size-12 sm:size-14 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-full" title={prod.name}>
                      {prod.name}
                    </h3>
                    {prod.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#613d3e] text-white shrink-0">
                        {prod.badge}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 shrink-0">
                      <Tag size={10} className="shrink-0" />
                      <span>{prod.category || 'Geral'}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      • Até {prod.leadTimeDays} dias úteis{prod.isCustomizable ? ' • Personalizável' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preço + Switch Ativo + Ações */}
              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                <span className="text-sm font-extrabold text-primary tabular-nums">
                  {formatCurrency(prod.price)}
                </span>

                
                <div className="flex items-center gap-1.5 w-28 sm:w-32">
                  <Select value={prod.status || (prod.active === false ? 'hidden' : 'active')} onValueChange={(val) => handleStatusChange(prod, val as any)}>
                    <SelectTrigger className="h-8 text-xs px-2 bg-transparent border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active"><span className="text-emerald-600 font-semibold">Ativo</span></SelectItem>
                      <SelectItem value="paused"><span className="text-amber-500 font-semibold">Pausado</span></SelectItem>
                      <SelectItem value="hidden"><span className="text-red-500 font-semibold">Oculto</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                {(canEdit || canDelete) && (
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingProduct(prod);
                          setFormOpen(true);
                        }}
                        className="size-8"
                        title="Editar produto"
                      >
                        <Pencil size={13} />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(prod)}
                        className="size-8 text-red-500 hover:text-red-700"
                        title="Excluir produto"
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controles de Paginação */}
      {filteredProducts.length > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={[12, 24, 48, 96, 'all']}
          itemName="produto"
          itemPluralName="produtos"
        />
      )}

      {/* Modal de Formulário */}
      <StoreProductDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingProduct}
        existingCategories={categories}
      />

      {/* Modal de Exclusão em Massa */}
      <BulkDeleteStoreProductsDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        selectedIds={selectedProductIds}
        products={storeProducts}
        onSuccess={() => setSelectedProductIds([])}
      />

      {/* Modal de Importação em Massa por Fotos */}
      <BulkStoreProductsDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        existingCategories={categories}
      />
      {/* Modal de Importação do Ateliê */}
      <ImportFromAtelierDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {}}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover produto da vitrine?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              O produto <strong>{deleteTarget?.name}</strong> deixará de ser exibido na lojinha online pública. Os pedidos anteriores não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700 text-white">
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default StoreProducts;
