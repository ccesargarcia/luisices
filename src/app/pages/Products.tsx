import { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { firebaseProductService } from '../../services/firebaseProductService';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
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
} from 'lucide-react';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
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
    unitPrice: String(p.unitPrice),
    category: p.category || '',
    description: p.description || '',
  };
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Product | null;
  onSaved: () => void;
  userId: string;
}

function ProductFormDialog({ open, onOpenChange, editing, onSaved, userId }: ProductFormDialogProps) {
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

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Informe o nome do produto'); return; }
    if (!form.unitPrice || isNaN(parseFloat(form.unitPrice))) { toast.error('Informe um preço válido'); return; }

    setSaving(true);
    try {
      const payload: Partial<Product> = {
        name: form.name.trim(),
        unitPrice: parseFloat(form.unitPrice),
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
      onSaved();
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
                  <img src={photoPreview} alt="preview" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="size-3.5" />
                  {photoPreview ? 'Alterar foto' : 'Enviar foto'}
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive"
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  >
                    <X className="size-3.5" /> Remover
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-name">Nome *</Label>
            <Input
              id="p-name"
              placeholder="Ex: Cartão de visita 4x1"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Preço unitário *</Label>
              <Input
                id="p-price"
                type="number"
                min={0}
                step="0.01"
                placeholder="0,00"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-category">Categoria</Label>
              <Input
                id="p-category"
                placeholder="Ex: Impressão"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea
              id="p-desc"
              placeholder="Detalhes do produto..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await firebaseProductService.getProducts();
      setProducts(data);
    } catch (e) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function handleDelete(product: Product) {
    if (!confirm(`Deseja excluir "${product.name}"?`)) return;
    try {
      await firebaseProductService.deleteProduct(product.id);
      toast.success('Produto excluído');
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch {
      toast.error('Erro ao excluir produto');
    }
  }

  function openEdit(p: Product) {
    setEditingProduct(p);
    setFormOpen(true);
  }

  function openNew() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  const filtered = search.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : products;

  // Group by category
  const categories = Array.from(new Set(filtered.map((p) => p.category || 'Sem categoria')));

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
        <Button onClick={openNew}>
          <Plus className="size-4 mr-2" /> Novo Produto
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de produtos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Preço médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.length > 0
                ? formatCurrency(products.reduce((s, p) => s + p.unitPrice, 0) / products.length)
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, categoria ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="size-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">
            {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
          </p>
          {!search && (
            <Button variant="outline" className="mt-4" onClick={openNew}>
              <Plus className="size-4 mr-2" /> Cadastrar primeiro produto
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const items = filtered.filter((p) => (p.category || 'Sem categoria') === cat);
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {cat}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((product) => (
                <div key={product.id} className="hover:shadow-md transition-shadow">
                    <Card className="overflow-hidden">
                      {product.photoUrl && (
                        <div className="w-full h-36 overflow-hidden bg-muted">
                          <img
                            src={product.photoUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs"
                            onClick={() => openEdit(product)}
                          >
                            <Pencil className="size-3 mr-1" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => handleDelete(product)}
                          >
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
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingProduct}
        onSaved={load}
        userId={user?.uid ?? ''}
      />
    </div>
  );
}
