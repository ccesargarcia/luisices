import { useState, useEffect, useMemo } from 'react';
import {
  Images,
  Plus,
  Search,
  X,
  Tag as TagIcon,
  User,
  FolderOpen,
  LayoutGrid,
  Columns,
  ArrowLeft,
  ChevronRight,
  FolderPlus,
  Sparkles,
  CheckSquare,
  Trash2,
  Copy,
  ArrowUpDown,
  FolderHeart,
  Palette,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { firebaseGalleryService } from '../../services/firebaseGalleryService';
import { firebaseCustomerService } from '../../services/firebaseCustomerService';
import type { GalleryItem, Customer, Tag } from '../types';
import { GalleryUploadDialog } from '../components/gallery/GalleryUploadDialog';
import { GalleryLightbox } from '../components/gallery/GalleryLightbox';
import { GalleryCard } from '../components/gallery/GalleryCard';
import { FolderCard, DEFAULT_FOLDER_COLOR } from '../components/gallery/FolderCard';
import { EditFolderDialog } from '../components/gallery/EditFolderDialog';
import { NewFolderDialog } from '../components/gallery/NewFolderDialog';
import { cn } from '../components/ui/utils';

// Tags de inspiração sugeridas para papelaria fina
const SUGGESTED_INSPIRATION_TAGS = [
  'Topo de Bolo',
  'Casamento',
  'Convite Luxo',
  'Lembrancinhas',
  'Batizado',
  'Caixa Cenário',
  'Lamicote',
  'Infantil',
  'Maternidade',
  'Papelaria Fina',
];

export function Gallery() {
  const { user, userProfile, hasPermission } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros & Busca
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterFolderTag, setFilterFolderTag] = useState('');
  const [activeInspirationChip, setActiveInspirationChip] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title' | 'ai'>('recent');

  // Modos de Visualização: 'folders' (Coleções), 'grid' (Grade Uniforme), 'masonry' (Mural / Moodboard)
  const [viewMode, setViewMode] = useState<'folders' | 'grid' | 'masonry'>('folders');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  // Seleção Múltipla & Gestão em Lote
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Modais
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState<string | null>(null);

  // Pastas locais / personalizadas
  const [folderColors, setFolderColors] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gallery_folder_colors') || '{}');
    } catch {
      return {};
    }
  });
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gallery_folder_covers') || '{}');
    } catch {
      return {};
    }
  });
  const [folderTags, setFolderTagsState] = useState<Record<string, Tag[]>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gallery_folder_tags') || '{}');
    } catch {
      return {};
    }
  });
  const [manualFolders, setManualFolders] = useState<Array<{ customerId: string; customerName: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('gallery_manual_folders') || '[]');
    } catch {
      return [];
    }
  });

  // Carregar dados iniciais do Firestore (executa 1 vez com cache em memória)
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const isAdmin = userProfile?.role === 'admin';
        const [galleryItems, cList] = await Promise.all([
          firebaseGalleryService.getItems(user.uid, isAdmin),
          firebaseCustomerService.getCustomers(user.uid, isAdmin),
        ]);
        setItems(galleryItems);
        setCustomers(cList);
      } catch (err) {
        toast.error('Erro ao carregar galeria');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, userProfile?.role]);

  // Agrupamento de itens em pastas por cliente + pastas manuais
  const folders = useMemo(() => {
    const map = new Map<string, { name: string; items: GalleryItem[] }>();
    for (const item of items) {
      const key = item.customerId || '__none__';
      const name = item.customerName || 'Sem cliente';
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(item);
    }
    for (const mf of manualFolders) {
      if (!map.has(mf.customerId)) {
        map.set(mf.customerId, { name: mf.customerName, items: [] });
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, items: v.items }))
      .sort((a, b) => {
        if (a.id === '__none__') return 1;
        if (b.id === '__none__') return -1;
        return b.items.length - a.items.length;
      });
  }, [items, manualFolders]);

  // Todas as tags existentes nos itens
  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => (i.tags ?? []).forEach((t) => set.add(t.name)));
    return Array.from(set).sort();
  }, [items]);

  // Tags combinadas para o carrossel de inspiração
  const combinedInspirationTags = useMemo(() => {
    const set = new Set<string>(SUGGESTED_INSPIRATION_TAGS);
    allTags.forEach((t) => set.add(t));
    return Array.from(set).slice(0, 16);
  }, [allTags]);

  const openFolder = openFolderId !== null ? folders.find((f) => f.id === openFolderId) : null;

  // Filtragem e ordenação em memória (0 ms de latência, zero leituras adicionais)
  const displayedItems = useMemo(() => {
    let list: GalleryItem[] = [];

    if (viewMode === 'folders' && openFolderId !== null) {
      list = openFolder?.items ?? [];
    } else {
      list = items;
    }

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.customerName ?? '').toLowerCase().includes(q) ||
          (item.productType ?? '').toLowerCase().includes(q) ||
          (item.tags ?? []).some((t) => t.name.toLowerCase().includes(q))
      );
    }

    if (viewMode !== 'folders' || openFolderId === null) {
      if (filterCustomer) {
        list = list.filter((item) => item.customerId === filterCustomer);
      }
      if (filterTag) {
        list = list.filter((item) => (item.tags ?? []).some((t) => t.name === filterTag));
      }
    }

    // Filtro por Chip de Inspiração
    if (activeInspirationChip !== 'all') {
      const chipLower = activeInspirationChip.toLowerCase();
      list = list.filter(
        (item) =>
          (item.tags ?? []).some((t) => t.name.toLowerCase() === chipLower) ||
          (item.productType ?? '').toLowerCase().includes(chipLower) ||
          item.title.toLowerCase().includes(chipLower)
      );
    }

    // Ordenação
    return [...list].sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'ai') {
        const aHasAi = Boolean(a.aiDescription) ? 1 : 0;
        const bHasAi = Boolean(b.aiDescription) ? 1 : 0;
        if (aHasAi !== bHasAi) return bHasAi - aHasAi;
      }
      // default: 'recent'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    items,
    viewMode,
    openFolderId,
    openFolder,
    search,
    filterCustomer,
    filterTag,
    activeInspirationChip,
    sortBy,
  ]);

  const displayedFolders = useMemo(() => {
    let result = folders;
    if (search) {
      const q = search.toLowerCase().trim();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    if (filterFolderTag) {
      result = result.filter((f) =>
        (folderTags[f.id] ?? []).some((t) => t.name === filterFolderTag)
      );
    }
    return result;
  }, [folders, search, filterFolderTag, folderTags]);

  const allFolderTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(folderTags).forEach((tags) => tags.forEach((t) => set.add(t.name)));
    return Array.from(set).sort();
  }, [folderTags]);

  // Estatísticas do Portfólio
  const stats = useMemo(() => {
    const totalArts = items.length;
    const totalFolders = folders.length;
    const aiCount = items.filter((i) => Boolean(i.aiDescription)).length;
    const customersCount = new Set(items.map((i) => i.customerId).filter(Boolean)).size;
    return { totalArts, totalFolders, aiCount, customersCount };
  }, [items, folders]);

  // Manipulação de Pastas
  const setFolderColor = (folderId: string, color: string) => {
    const next = { ...folderColors, [folderId]: color };
    setFolderColors(next);
    try {
      localStorage.setItem('gallery_folder_colors', JSON.stringify(next));
    } catch {}
  };

  const setFolderCover = (folderId: string, cover: string | null) => {
    const next = { ...folderCovers };
    if (cover) next[folderId] = cover;
    else delete next[folderId];
    setFolderCovers(next);
    try {
      localStorage.setItem('gallery_folder_covers', JSON.stringify(next));
    } catch {}
  };

  const setFolderTags = (folderId: string, tags: Tag[]) => {
    const next = { ...folderTags, [folderId]: tags };
    setFolderTagsState(next);
    try {
      localStorage.setItem('gallery_folder_tags', JSON.stringify(next));
    } catch {}
  };

  const handleEditFolder = (update: { color: string; cover: string | null; tags: Tag[] }) => {
    if (!editFolderOpen) return;
    setFolderColor(editFolderOpen, update.color);
    setFolderCover(editFolderOpen, update.cover);
    setFolderTags(editFolderOpen, update.tags);
  };

  const handleNewFolder = (folder: {
    customerId: string;
    customerName: string;
    color: string;
    tags: Tag[];
  }) => {
    const next = [
      ...manualFolders.filter((f) => f.customerId !== folder.customerId),
      { customerId: folder.customerId, customerName: folder.customerName },
    ];
    setManualFolders(next);
    try {
      localStorage.setItem('gallery_manual_folders', JSON.stringify(next));
    } catch {}
    setFolderColor(folder.customerId, folder.color);
    setFolderTags(folder.customerId, folder.tags);
    toast.success('Álbum de coleção criado!');
  };

  const handleDeleteEmptyFolder = (folderId: string) => {
    const next = manualFolders.filter((f) => f.customerId !== folderId);
    setManualFolders(next);
    try {
      localStorage.setItem('gallery_manual_folders', JSON.stringify(next));
    } catch {}
    toast.success('Álbum removido!');
  };

  // Exclusão de Item Individual
  const handleDelete = async (item: GalleryItem) => {
    try {
      await firebaseGalleryService.deleteItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Arte removida da galeria');
    } catch {
      toast.error('Erro ao remover arte');
    }
  };

  // Gestão de Seleção Múltipla
  const handleToggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === displayedItems.length && displayedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayedItems.map((i) => i.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleBulkCopyLinks = () => {
    const selected = displayedItems.filter((i) => selectedIds.has(i.id) && i.imageUrl);
    if (selected.length === 0) return;
    const text = selected.map((i) => `${i.title}: ${i.imageUrl}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`${selected.length} link(s) copiado(s)!`);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const results = await Promise.allSettled(
        idsToDelete.map((id) => firebaseGalleryService.deleteItem(id))
      );
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      if (successCount > 0) {
        setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
        toast.success(`${successCount} arte(s) removida(s) com sucesso!`);
      } else {
        toast.error('Não foi possível remover as artes selecionadas.');
      }
      handleClearSelection();
      setBulkDeleteDialogOpen(false);
    } catch (err) {
      console.error('Erro ao apagar em lote:', err);
      toast.error('Erro ao processar exclusão em lote.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const goToRoot = () => {
    setOpenFolderId(null);
    setSearch('');
  };

  const hasFilters = Boolean(
    search || filterCustomer || filterTag || activeInspirationChip !== 'all'
  );
  const isRootFolders = viewMode === 'folders' && openFolderId === null;
  const isInsideFolder = viewMode === 'folders' && openFolderId !== null;
  const canCreate = hasPermission((p) => p.gallery?.create ?? false);
  const canDelete = hasPermission((p) => p.gallery?.delete ?? false);

  return (
    <div className="space-y-4 sm:space-y-5 p-3 sm:p-5 md:p-6 max-w-full">
      {/* ─── Cabeçalho Principal & Ações ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isInsideFolder && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goToRoot}
              className="size-9 rounded-full bg-primary/10 hover:bg-primary/20 text-foreground shrink-0 cursor-pointer transition-colors"
              title="Voltar para todas as coleções"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}

          <div className="min-w-0">
            {isInsideFolder ? (
              <>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <button
                    onClick={goToRoot}
                    className="text-muted-foreground hover:text-foreground font-medium transition-colors cursor-pointer"
                  >
                    Galeria
                  </button>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-bold truncate text-foreground">{openFolder?.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {openFolder?.items.length ?? 0}{' '}
                  {(openFolder?.items.length ?? 0) === 1 ? 'arte catalogada' : 'artes catalogadas'}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    Galeria de Artes
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-primary/10 text-primary border-primary/20 font-bold hidden xs:inline-flex"
                  >
                    PORTFÓLIO
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Coleções criativas, peças de papelaria fina e catálogo visual do ateliê
                </p>
              </>
            )}
          </div>
        </div>

        {/* Controles de Modo de Visualização e Botões de Criação */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {!isInsideFolder && (
            <div className="flex rounded-xl border border-white/60 dark:border-white/10 luisices-glass p-0.5 shadow-xs">
              <Button
                variant={viewMode === 'folders' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-lg font-medium cursor-pointer transition-colors',
                  viewMode === 'folders'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  setViewMode('folders');
                  setSearch('');
                  setFilterCustomer('');
                  setFilterTag('');
                  setActiveInspirationChip('all');
                }}
                title="Exibir como Álbuns de Coleção"
              >
                <FolderOpen className="size-3.5" />
                <span className="hidden sm:inline">Coleções</span>
              </Button>

              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-lg font-medium cursor-pointer transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  setViewMode('grid');
                  setSearch('');
                }}
                title="Exibir como Grade Uniforme (Instagram)"
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Grade</span>
              </Button>

              <Button
                variant={viewMode === 'masonry' ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-lg font-medium cursor-pointer transition-colors',
                  viewMode === 'masonry'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => {
                  setViewMode('masonry');
                  setSearch('');
                }}
                title="Exibir como Mural / Moodboard (Pinterest)"
              >
                <Columns className="size-3.5" />
                <span className="hidden sm:inline">Mural</span>
              </Button>
            </div>
          )}

          {/* Botão Selecionar para Modo em Lote */}
          {(viewMode !== 'folders' || isInsideFolder) && displayedItems.length > 0 && (
            <Button
              variant={isSelectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (isSelectionMode) handleClearSelection();
                else setIsSelectionMode(true);
              }}
              className={cn(
                'h-8 px-2.5 text-xs gap-1.5 rounded-xl cursor-pointer font-medium',
                isSelectionMode
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-border/80 hover:bg-muted/60'
              )}
            >
              <CheckSquare className="size-3.5" />
              <span>{isSelectionMode ? 'Cancelar' : 'Selecionar'}</span>
            </Button>
          )}

          {/* Botões CTA Nova Pasta / Nova Arte */}
          {canCreate && (
            <div className="flex items-center gap-1.5">
              {!isInsideFolder && viewMode === 'folders' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewFolderOpen(true)}
                  className="h-8 px-2.5 text-xs gap-1.5 rounded-xl cursor-pointer border-border/80 hover:bg-muted/60 font-medium"
                  title="Criar novo álbum de coleção"
                >
                  <FolderPlus className="size-3.5 text-primary" />
                  <span className="hidden sm:inline">Nova Pasta</span>
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setUploadOpen(true)}
                className="h-8 px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1.5 rounded-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
                title="Adicionar nova foto de arte"
              >
                <Plus className="size-3.5" />
                <span>Nova Arte</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Barra de Estatísticas do Portfólio (Liquid Glassmorphism) ───────── */}
      {!isInsideFolder && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="p-3 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Images className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate font-medium">Total de Artes</p>
              <p className="text-base font-bold text-foreground leading-tight">{stats.totalArts}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <FolderHeart className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate font-medium">Álbuns & Coleções</p>
              <p className="text-base font-bold text-foreground leading-tight">{stats.totalFolders}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate font-medium">Visão Computacional</p>
              <p className="text-base font-bold text-foreground leading-tight">{stats.aiCount} com IA</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <User className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate font-medium">Clientes Atendidos</p>
              <p className="text-base font-bold text-foreground leading-tight">{stats.customersCount}</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Barra Flutuante de Ações em Lote (Modo Seleção) ─────────────────── */}
      {isSelectionMode && (
        <div className="sticky top-2 z-30 px-3.5 sm:px-4 py-2.5 rounded-2xl luisices-glass border border-primary/30 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-2.5 backdrop-blur-xl animate-in fade-in-0 duration-200">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-4 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {selectedIds.size} de {displayedItems.length} arte(s) selecionada(s)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSelectAll}
              className="h-7 text-xs font-medium cursor-pointer rounded-lg"
            >
              {selectedIds.size === displayedItems.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkCopyLinks}
              disabled={selectedIds.size === 0}
              className="h-7 text-xs gap-1 font-medium cursor-pointer rounded-lg"
              title="Copiar links das fotos selecionadas"
            >
              <Copy className="size-3" />
              <span>Copiar Links</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearSelection}
              className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
            >
              Fechar
            </Button>
            {canDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={selectedIds.size === 0}
                className="h-7 text-xs gap-1.5 font-semibold cursor-pointer rounded-lg shadow-xs"
              >
                <Trash2 className="size-3" />
                <span>Apagar ({selectedIds.size})</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── Barra de Filtros Rápidos, Busca e Ordenação ─────────────────────── */}
      <div className="p-3 rounded-2xl luisices-glass border border-white/60 dark:border-white/10 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Campo de Busca com Atalho Visual */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isRootFolders
                  ? 'Buscar álbum de coleção...'
                  : isInsideFolder
                  ? `Buscar em "${openFolder?.name}"...`
                  : 'Buscar arte por título, cliente ou insumo...'
              }
              className="pl-9 h-9 text-xs bg-background/80 rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs cursor-pointer p-0.5"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros em Modo Grade / Mural */}
          {(!isRootFolders || isInsideFolder) && (
            <>
              {/* Filtro por Cliente */}
              <Select
                value={filterCustomer || '__all__'}
                onValueChange={(v) => setFilterCustomer(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full sm:w-44 h-9 text-xs bg-background/80 rounded-xl">
                  <User className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="__all__">Todos os clientes</SelectItem>
                  {customers
                    .filter((c) => items.some((i) => i.customerId === c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* Ordenação */}
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as any)}
              >
                <SelectTrigger className="w-full sm:w-38 h-9 text-xs bg-background/80 rounded-xl">
                  <ArrowUpDown className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais Recentes</SelectItem>
                  <SelectItem value="oldest">Mais Antigas</SelectItem>
                  <SelectItem value="title">Título (A-Z)</SelectItem>
                  <SelectItem value="ai">Com Visão IA</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}

          {/* Filtro por Tag em Modo Pastas */}
          {isRootFolders && allFolderTags.length > 0 && (
            <Select
              value={filterFolderTag || '__all__'}
              onValueChange={(v) => setFilterFolderTag(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-full sm:w-40 h-9 text-xs bg-background/80 rounded-xl">
                <TagIcon className="size-3.5 mr-1 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Tag da Pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as tags</SelectItem>
                {allFolderTags.map((t) => (
                  <SelectItem key={t} value={t}>
                    #{t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Botão de Limpar Filtros */}
          {(hasFilters || filterFolderTag) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setFilterCustomer('');
                setFilterTag('');
                setFilterFolderTag('');
                setActiveInspirationChip('all');
              }}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer rounded-xl"
              title="Redefinir todos os filtros"
            >
              <X className="size-3.5 mr-1" />
              <span>Limpar</span>
            </Button>
          )}
        </div>

        {/* ─── Carrossel Horizontal de Chips de Inspiração (Tags Rápidas) ── */}
        {(!isRootFolders || isInsideFolder) && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 -mx-1 px-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setActiveInspirationChip('all')}
              className={cn(
                'text-[11px] px-3 py-1 rounded-full font-semibold shrink-0 transition-all cursor-pointer border',
                activeInspirationChip === 'all'
                  ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                  : 'bg-background/80 text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/60'
              )}
            >
              ✨ Todas as peças
            </button>

            {combinedInspirationTags.map((tag) => {
              const isActive = activeInspirationChip.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveInspirationChip(isActive ? 'all' : tag)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full font-medium shrink-0 transition-all cursor-pointer border',
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs font-semibold'
                      : 'bg-background/70 text-muted-foreground hover:text-foreground border-border/70 hover:bg-muted/60'
                  )}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Conteúdo da Galeria (Skeletons / Álbuns / Grade / Mural) ───────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2 p-2 rounded-2xl luisices-glass">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      ) : isRootFolders ? (
        /* Modo 1: Álbuns de Coleções & Portfólios */
        displayedFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 p-8 text-center rounded-3xl luisices-glass border border-white/60 dark:border-white/10">
            <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
              <FolderHeart className="size-8" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="text-base font-bold text-foreground">
                {search ? 'Nenhum álbum encontrado' : 'Nenhuma coleção criada ainda'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {search
                  ? 'Tente pesquisar por outro nome ou limpe os filtros de busca.'
                  : 'Crie seu primeiro álbum para organizar suas fotos de casamentos, aniversários e kits.'}
              </p>
            </div>
            {!search && canCreate && (
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(true)}
                className="gap-2 mt-2 rounded-xl text-xs font-medium cursor-pointer"
              >
                <FolderPlus className="size-4" /> Criar Primeiro Álbum
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
            {displayedFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                name={folder.name}
                count={folder.items.length}
                color={folderColors[folder.id] || DEFAULT_FOLDER_COLOR}
                cover={folderCovers[folder.id]}
                tags={folderTags[folder.id]}
                onClick={() => {
                  setEditFolderOpen(null);
                  setOpenFolderId(folder.id);
                  setSearch('');
                  setActiveInspirationChip('all');
                }}
                onEdit={(e) => {
                  e.stopPropagation();
                  setEditFolderOpen(folder.id);
                }}
                onDelete={
                  folder.items.length === 0 && canDelete
                    ? (e) => {
                        e.stopPropagation();
                        handleDeleteEmptyFolder(folder.id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )
      ) : displayedItems.length === 0 ? (
        /* Estado Vazio de Artes */
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3 p-8 text-center rounded-3xl luisices-glass border border-white/60 dark:border-white/10">
          <div className="size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
            <Images className="size-8" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {hasFilters ? 'Nenhuma arte corresponde aos filtros' : 'Nenhuma arte catalogada'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {hasFilters
                ? 'Tente remover os filtros ou buscar por outro termo para visualizar as fotos.'
                : 'Adicione suas fotos de produções para exibir aos clientes e catalogar no ateliê.'}
            </p>
          </div>
          {!hasFilters && canCreate && (
            <Button
              variant="outline"
              onClick={() => setUploadOpen(true)}
              className="gap-2 mt-2 rounded-xl text-xs font-medium cursor-pointer"
            >
              <Plus className="size-4" /> Adicionar Primeira Arte
            </Button>
          )}
        </div>
      ) : viewMode === 'masonry' ? (
        /* Modo 3: Mural / Moodboard Orgânico (Pinterest Style) */
        <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3.5 sm:gap-4.5 space-y-3.5 sm:space-y-4.5">
          {displayedItems.map((item, i) => (
            <GalleryCard
              key={item.id}
              item={item}
              isMasonry={true}
              onClick={() => setLightboxIdx(i)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={() => handleToggleSelection(item.id)}
            />
          ))}
        </div>
      ) : (
        /* Modo 2: Grade Uniforme Quadrada (Instagram Style) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4.5">
          {displayedItems.map((item, i) => (
            <GalleryCard
              key={item.id}
              item={item}
              isMasonry={false}
              onClick={() => setLightboxIdx(i)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelection={() => handleToggleSelection(item.id)}
            />
          ))}
        </div>
      )}

      {/* ─── Modal de Edição de Pasta/Álbum ──────────────────────────────────── */}
      {editFolderOpen && user && (() => {
        const f = folders.find((x) => x.id === editFolderOpen);
        if (!f) return null;
        return (
          <EditFolderDialog
            open
            onClose={() => setEditFolderOpen(null)}
            folderName={f.name}
            currentColor={folderColors[f.id] || DEFAULT_FOLDER_COLOR}
            currentCover={folderCovers[f.id]}
            currentTags={folderTags[f.id]}
            folderItems={f.items}
            userId={user.uid}
            onSaved={handleEditFolder}
          />
        );
      })()}

      {/* ─── Modal de Novo Álbum / Pasta ─────────────────────────────────────── */}
      {newFolderOpen && (
        <NewFolderDialog
          open={newFolderOpen}
          onClose={() => setNewFolderOpen(false)}
          customers={customers}
          existingFolderIds={folders.map((f) => f.id)}
          onSaved={handleNewFolder}
        />
      )}

      {/* ─── Modal de Upload de Nova Arte ────────────────────────────────────── */}
      {uploadOpen && user && (
        <GalleryUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSaved={(item) => setItems((prev) => [item, ...prev])}
          customers={customers}
          userId={user.uid}
          initialCustomerId={openFolder && openFolder.id !== '__none__' ? openFolder.id : undefined}
        />
      )}

      {/* ─── Visualizador Imersivo Estúdio (Lightbox) ────────────────────────── */}
      {lightboxIdx !== null && (
        <GalleryLightbox
          items={displayedItems}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDelete}
          onItemUpdated={(updated) => {
            setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
          }}
        />
      )}

      {/* ─── Confirmação de Exclusão em Lote ─────────────────────────────────── */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent size="sm" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-4" />
              <span>Remover {selectedIds.size} arte(s)?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá as artes selecionadas permanentemente da galeria do ateliê.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="px-5 py-3 border-t luisices-glass flex items-center justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkDeleting}
              onClick={() => setBulkDeleteDialogOpen(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleConfirmBulkDelete}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>{bulkDeleting ? 'Removendo...' : `Confirmar e Apagar (${selectedIds.size})`}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Gallery;
