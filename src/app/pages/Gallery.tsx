import { useState, useEffect, useMemo } from 'react';
import { Images, Plus, Search, X, Tag as TagIcon, User, FolderOpen, LayoutGrid, ArrowLeft, ChevronRight, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Gallery() {
  const { user, hasPermission } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'folders' | 'flat'>('folders');
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderColors, setFolderColors] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_colors') || '{}'); } catch { return {}; }
  });
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [editFolderOpen, setEditFolderOpen] = useState<string | null>(null); // folderId
  const [folderCovers, setFolderCovers] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_covers') || '{}'); } catch { return {}; }
  });
  const [folderTags, setFolderTagsState] = useState<Record<string, Tag[]>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_folder_tags') || '{}'); } catch { return {}; }
  });
  const [filterFolderTag, setFilterFolderTag] = useState('');
  const [manualFolders, setManualFolders] = useState<Array<{ customerId: string; customerName: string }>>(() => {
    try { return JSON.parse(localStorage.getItem('gallery_manual_folders') || '[]'); } catch { return []; }
  });

  // Load data
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const [galleryItems, cList] = await Promise.all([
          firebaseGalleryService.getItems(user.uid),
          firebaseCustomerService.getCustomers(user.uid),
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
  }, [user]);

  // Group items into folders by customer, merging with manual empty folders
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

  const allTags = useMemo(() =>
    Array.from(new Set(items.flatMap(i => (i.tags ?? []).map(t => t.name)))).sort(),
    [items]
  );

  const openFolder = openFolderId !== null ? folders.find(f => f.id === openFolderId) : null;

  const displayedItems = useMemo(() => {
    if (viewMode === 'folders' && openFolderId !== null) {
      const base = openFolder?.items ?? [];
      const q = search.toLowerCase();
      return q ? base.filter(i => i.title.toLowerCase().includes(q)) : base;
    }
    const q = search.toLowerCase();
    return items.filter(item => {
      const matchSearch = !q || item.title.toLowerCase().includes(q) || (item.customerName ?? '').toLowerCase().includes(q);
      const matchCustomer = !filterCustomer || item.customerId === filterCustomer;
      const matchTag = !filterTag || (item.tags ?? []).some(t => t.name === filterTag);
      return matchSearch && matchCustomer && matchTag;
    });
  }, [items, viewMode, openFolderId, openFolder, search, filterCustomer, filterTag]);

  const displayedFolders = useMemo(() => {
    let result = folders;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    if (filterFolderTag) {
      result = result.filter(f => (folderTags[f.id] ?? []).some(t => t.name === filterFolderTag));
    }
    return result;
  }, [folders, search, filterFolderTag, folderTags]);

  const allFolderTags = useMemo(() => {
    const set = new Set<string>();
    Object.values(folderTags).forEach(tags => tags.forEach(t => set.add(t.name)));
    return Array.from(set).sort();
  }, [folderTags]);

  const handleDelete = async (item: GalleryItem) => {
    try {
      await firebaseGalleryService.deleteItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      toast.success('Arte removida');
    } catch {
      toast.error('Erro ao remover arte');
    }
  };

  const setFolderColor = (folderId: string, color: string) => {
    const next = { ...folderColors, [folderId]: color };
    setFolderColors(next);
    try { localStorage.setItem('gallery_folder_colors', JSON.stringify(next)); } catch {}
  };

  const setFolderCover = (folderId: string, cover: string | null) => {
    const next = { ...folderCovers };
    if (cover) next[folderId] = cover; else delete next[folderId];
    setFolderCovers(next);
    try { localStorage.setItem('gallery_folder_covers', JSON.stringify(next)); } catch {}
  };

  const setFolderTags = (folderId: string, tags: Tag[]) => {
    const next = { ...folderTags, [folderId]: tags };
    setFolderTagsState(next);
    try { localStorage.setItem('gallery_folder_tags', JSON.stringify(next)); } catch {}
  };

  const handleEditFolder = (update: { color: string; cover: string | null; tags: Tag[] }) => {
    if (!editFolderOpen) return;
    setFolderColor(editFolderOpen, update.color);
    setFolderCover(editFolderOpen, update.cover);
    setFolderTags(editFolderOpen, update.tags);
  };

  const handleNewFolder = (folder: { customerId: string; customerName: string; color: string; tags: Tag[] }) => {
    const next = [...manualFolders.filter(f => f.customerId !== folder.customerId), { customerId: folder.customerId, customerName: folder.customerName }];
    setManualFolders(next);
    try { localStorage.setItem('gallery_manual_folders', JSON.stringify(next)); } catch {}
    setFolderColor(folder.customerId, folder.color);
    setFolderTags(folder.customerId, folder.tags);
    toast.success('Pasta criada');
  };

  const handleDeleteEmptyFolder = (folderId: string) => {
    const next = manualFolders.filter(f => f.customerId !== folderId);
    setManualFolders(next);
    try { localStorage.setItem('gallery_manual_folders', JSON.stringify(next)); } catch {}
    toast.success('Pasta removida');
  };

  const goToRoot = () => { setOpenFolderId(null); setSearch(''); };
  const hasFilters = !!(search || filterCustomer || filterTag);

  const isRootFolders = viewMode === 'folders' && openFolderId === null;
  const isInsideFolder = viewMode === 'folders' && openFolderId !== null;
  const isFlatView = viewMode === 'flat';

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 min-w-0">
          {isInsideFolder && (
            <Button variant="ghost" size="icon" onClick={goToRoot} className="-ml-1 shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div className="min-w-0">
            {isInsideFolder ? (
              <>
                <div className="flex items-center gap-1 text-sm">
                  <button
                    onClick={goToRoot}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Galeria
                  </button>
                  <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold truncate">{openFolder?.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {openFolder?.items.length ?? 0} {(openFolder?.items.length ?? 0) === 1 ? 'arte' : 'artes'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight">Galeria de Artes</h1>
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? 'arte' : 'artes'}
                  {isRootFolders && folders.length > 0 && ` · ${folders.length} ${folders.length === 1 ? 'pasta' : 'pastas'}`}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isInsideFolder && (
            <div className="flex rounded-md border overflow-hidden">
              <Button
                variant={viewMode === 'folders' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-0 gap-1.5 px-3"
                onClick={() => { setViewMode('folders'); setSearch(''); setFilterCustomer(''); setFilterTag(''); }}
              >
                <FolderOpen className="size-4" />
                <span className="hidden sm:inline text-xs">Pastas</span>
              </Button>
              <Button
                variant={viewMode === 'flat' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none border-0 border-l gap-1.5 px-3"
                onClick={() => { setViewMode('flat'); setSearch(''); }}
              >
                <LayoutGrid className="size-4" />
                <span className="hidden sm:inline text-xs">Grade</span>
              </Button>
            </div>
          )}
          {hasPermission(p => p.gallery?.create ?? false) && (
            <>
              <Button
                variant="outline"
                onClick={() => setNewFolderOpen(true)}
                className="gap-2"
                title="Criar nova pasta para organizar artes"
              >
                <FolderPlus className="size-4" />
                <span className="hidden sm:inline">Nova Pasta</span>
              </Button>
              <Button
                onClick={() => setUploadOpen(true)}
                className="gap-2"
                title="Adicionar nova arte à galeria"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nova Arte</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Search / Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              isRootFolders ? 'Buscar pasta...' :
              isInsideFolder ? 'Buscar arte na pasta...' :
              'Buscar por título ou cliente...'
            }
            className="pl-9"
          />
        </div>
        {isFlatView && (
          <>
            <Select value={filterCustomer || '__all__'} onValueChange={v => setFilterCustomer(v === '__all__' ? '' : v)}>
              <SelectTrigger className="w-44">
                <User className="size-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os clientes</SelectItem>
                {customers.filter(c => items.some(i => i.customerId === c.id)).map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allTags.length > 0 && (
              <Select value={filterTag || '__all__'} onValueChange={v => setFilterTag(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-36">
                  <TagIcon className="size-4 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas as tags</SelectItem>
                  {allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </>
        )}
        {isRootFolders && allFolderTags.length > 0 && (
          <Select value={filterFolderTag || '__all__'} onValueChange={v => setFilterFolderTag(v === '__all__' ? '' : v)}>
            <SelectTrigger className="w-36">
              <TagIcon className="size-4 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as tags</SelectItem>
              {allFolderTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {(hasFilters || filterFolderTag) && (
          <Button variant="ghost" size="icon" onClick={() => { setSearch(''); setFilterCustomer(''); setFilterTag(''); setFilterFolderTag(''); }}>
            <X className="size-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <Skeleton className="aspect-video rounded-xl" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : isRootFolders ? (
        displayedFolders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Images className="size-12 opacity-30" />
            <p className="text-base font-medium">
              {search ? 'Nenhuma pasta encontrada' : 'Galeria vazia'}
            </p>
            {!search && (
              <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2 mt-1">
                <Plus className="size-4" /> Adicionar primeira arte
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {displayedFolders.map(folder => (
              <FolderCard
                key={folder.id}
                name={folder.name}
                count={folder.items.length}
                color={folderColors[folder.id] || DEFAULT_FOLDER_COLOR}
                cover={folderCovers[folder.id]}
                tags={folderTags[folder.id]}
                onClick={() => { setEditFolderOpen(null); setOpenFolderId(folder.id); setSearch(''); }}
                onEdit={e => { e.stopPropagation(); setEditFolderOpen(folder.id); }}
                onDelete={folder.items.length === 0 ? e => { e.stopPropagation(); handleDeleteEmptyFolder(folder.id); } : undefined}
              />
            ))}
          </div>
        )
      ) : (
        displayedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Images className="size-12 opacity-30" />
            <p className="text-base font-medium">
              {hasFilters || search ? 'Nenhuma arte encontrada' : 'Pasta vazia'}
            </p>
            {!hasFilters && !search && hasPermission(p => p.gallery?.create ?? false) && (
              <Button variant="outline" onClick={() => setUploadOpen(true)} className="gap-2 mt-1">
                <Plus className="size-4" /> Adicionar arte
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {displayedItems.map((item, i) => (
              <GalleryCard key={item.id} item={item} onClick={() => setLightboxIdx(i)} />
            ))}
          </div>
        )
      )}

      {/* Edit Folder dialog */}
      {editFolderOpen && user && (() => {
        const f = folders.find(x => x.id === editFolderOpen);
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

      {/* New Folder dialog */}
      {newFolderOpen && (
        <NewFolderDialog
          open={newFolderOpen}
          onClose={() => setNewFolderOpen(false)}
          customers={customers}
          existingFolderIds={folders.map(f => f.id)}
          onSaved={handleNewFolder}
        />
      )}

      {/* Upload dialog */}
      {uploadOpen && user && (
        <GalleryUploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onSaved={item => setItems(prev => [item, ...prev])}
          customers={customers}
          userId={user.uid}
          initialCustomerId={openFolder && openFolder.id !== '__none__' ? openFolder.id : undefined}
        />
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <GalleryLightbox
          items={displayedItems}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
