import { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { firebaseProductService } from '../../services/firebaseProductService';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { SafeImg } from '../components/SafeMedia';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
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
  Pencil,
  Trash2,
  Search,
  Package,
  Loader2,
  Upload,
  X,
  ImageIcon,
  LayoutGrid,
  LayoutList,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

/** Formats a numeric input into BRL display format (e.g. "1234" → "12,34") */
function parsePriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function priceInputToFloat(display: string): number {
  return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
}

// ─── Form Dialog ─────────────────────────────────────────────────────────────

interface ProductFormState {
  name: string;
  unitPrice: string;
  category: string;
  description: string;
}

function emptyForm(): ProductFormState {
  return { name: '', unitPrice: '', category: '', description: '' };
}

function formFromProduct(p: Product): ProductFormState {
  return {
    name: p.name,
    unitPrice: p.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    category: p.category || '',
    description: p.description || '',
  };
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Product | null;
  existingCategories: string[];
  userId: string;
}

function ProductFormDialog({ open, onOpenChange, editing, existingCategories, userId }: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormState>(editing ? formFromProduct(editing) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm(editing ? formFromProduct(editing) : emptyForm());
      setPhotoFile(null);
      setPhotoPreview(editing?.photoUrl ?? null);
    }
  }, [open]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione uma imagem'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Imagem muito grande. Máximo: 5MB'); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  function handlePriceChange(raw: string) {
    setForm({ ...form, unitPrice: parsePriceInput(raw) });
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Informe o nome do produto'); return; }
    const price = priceInputToFloat(form.unitPrice);
    if (!form.unitPrice || isNaN(price)) { toast.error('Informe um preço válido'); return; }

    setSaving(true);
    try {
      const payload: Partial<Product> = {
        name: form.name.trim(),
        unitPrice: price,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
      };
      let savedProduct: Product;
      if (editing) {
        await firebaseProductService.updateProduct(editing.id, payload);
        savedProduct = { ...editing, ...payload };
        if (photoFile) {
          const url = await firebaseProductService.uploadPhoto(editing.id, photoFile, userId);
          savedProduct = { ...savedProduct, photoUrl: url };
        }
        toast.success('Produto atualizado!');
      } else {
        savedProduct = await firebaseProductService.createProduct(payload);
        if (photoFile) {
          await firebaseProductService.uploadPhoto(savedProduct.id, photoFile, userId);
        }
        toast.success('Produto cadastrado!');
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Foto */}
          <div className="space-y-2">
            <Label>Foto do produto</Label>
            <div className="flex items-center gap-3">
              <div className="size-20 rounded-lg border-2 border-dashed border-muted-foreground/30 overflow-hidden flex items-center justify-center bg-muted/30 flex-shrink-0">
                {photoPreview ? (
                  <SafeImg src={photoPreview} alt="preview" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-2"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-3.5" />
                  {photoPreview ? 'Alterar foto' : 'Enviar foto'}
                </Button>
                {photoPreview && (
                  <Button type="button" variant="ghost" size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}>
                    <X className="size-3.5" /> Remover
                  </Button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input id="p-name" placeholder="Ex: Cartão de visita 4x1" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Preço unitário *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">R$</span>
                <Input id="p-price" inputMode="numeric" placeholder="0,00" value={form.unitPrice}
                  onChange={(e) => handlePriceChange(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-category">Categoria</Label>
              <Input id="p-category" list="category-options" placeholder="Ex: Impressão"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                autoComplete="off" />
              <datalist id="category-options">
                {existingCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" placeholder="Detalhes do produto..." value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
            {editing ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Real-time subscription via onSnapshot
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub = firebaseProductService.subscribeToProducts(user.uid, (data) => {
      setProducts(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await firebaseProductService.deleteProduct(deleteTarget.id);
      toast.success('Produto excluído');
    } catch {
      toast.error('Erro ao excluir produto');
    } finally {
      setDeleteTarget(null);
    }
  }

  function openEdit(p: Product) { setEditingProduct(p); setFormOpen(true); }
  function openNew() { setEditingProduct(null); setFormOpen(true); }

  const allCategories = Array.from(new Set(products.map((p) => p.category || 'Sem categoria')))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const existingCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const filtered = products.filter((p) => {
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || (p.category || 'Sem categoria') === filterCategory;
    return matchSearch && matchCat;
  });

  const displayCategories = Array.from(new Set(filtered.map((p) => p.category || 'Sem categoria')))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const prices = products.map((p) => p.unitPrice);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Cadastre produtos e serviços para usar rapidamente nos orçamentos e pedidos
          </p>
        </div>
        <Button onClick={openNew}><Plus className="size-4 mr-2" /> Novo Produto</Button>
      </div>

      {/* Stats – 4 cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de produtos</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{products.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(products.map((p) => p.category || 'Sem categoria')).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="size-3.5 text-green-500" /> Menor preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{minPrice !== null ? formatCurrency(minPrice) : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3.5 text-primary" /> Maior preço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maxPrice !== null ? formatCurrency(maxPrice) : '—'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search + view toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          )}
        </div>
        <div className="flex border rounded-md overflow-hidden">
          <Button variant="ghost" size="icon"
            className={cn('rounded-none border-0', viewMode === 'grid' && 'bg-muted')}
            onClick={() => setViewMode('grid')}>
            <LayoutGrid className="size-4" />
          </Button>
          <Button variant="ghost" size="icon"
            className={cn('rounded-none border-0', viewMode === 'list' && 'bg-muted')}
            onClick={() => setViewMode('list')}>
            <LayoutList className="size-4" />
          </Button>
        </div>
      </div>

      {/* Category filter chips */}
      {allCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory('')}
            className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors border',
              !filterCategory
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground')}>
            Todas
          </button>
          {allCategories.map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
              className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors border',
                filterCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground')}>
              {cat}
              <span className="ml-1.5 opacity-60">
                {products.filter((p) => (p.category || 'Sem categoria') === cat).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="size-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {search || filterCategory ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
          </p>
          {!search && !filterCategory && (
            <Button variant="outline" className="mt-4" onClick={openNew}>
              <Plus className="size-4 mr-2" /> Cadastrar primeiro produto
            </Button>
          )}
        </div>

      ) : viewMode === 'grid' ? (
        /* ── Grid view ────────────────────────────────────────────── */
        <div className="space-y-6">
          {displayCategories.map((cat) => {
            const items = filtered.filter((p) => (p.category || 'Sem categoria') === cat);
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {cat} <span className="font-normal opacity-60">({items.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((product) => (
                    <div key={product.id} className="hover:shadow-md transition-shadow">
                      <Card className="overflow-hidden h-full flex flex-col">
                        {/* Photo – always same height; renders placeholder if no image */}
                        <div className="w-full h-36 overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                          {product.photoUrl ? (
                            <SafeImg src={product.photoUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="size-10 text-muted-foreground/25" />
                          )}
                        </div>
                        <CardContent className="p-4 flex flex-col flex-1">
                          <div className="flex items-start justify-between gap-2 flex-1">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="font-bold text-sm">{formatCurrency(product.unitPrice)}</p>
                              <p className="text-xs text-muted-foreground">por unidade</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs"
                              onClick={() => openEdit(product)}>
                              <Pencil className="size-3 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(product)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

      ) : (
        /* ── List view ────────────────────────────────────────────── */
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10"></th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Preço</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => (
                <tr key={product.id}
                  className={cn('border-b last:border-0 hover:bg-muted/30 transition-colors', i % 2 !== 0 && 'bg-muted/10')}>
                  <td className="px-4 py-2.5">
                    <div className="size-8 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {product.photoUrl ? (
                        <SafeImg src={product.photoUrl} alt={product.name} className="size-full object-cover" />
                      ) : (
                        <Package className="size-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-medium">{product.name}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    {product.category
                      ? <Badge variant="secondary" className="text-xs font-normal">{product.category}</Badge>
                      : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-muted-foreground max-w-[220px] truncate">
                    {product.description || <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {formatCurrency(product.unitPrice)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(product)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        className="size-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(product)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form dialog */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingProduct}
        existingCategories={existingCategories}
        userId={user?.uid ?? ''}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
