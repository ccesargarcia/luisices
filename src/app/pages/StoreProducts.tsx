import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router';
import { formatCurrency } from '../utils/currency';
import { StoreProduct, Product } from '../types';
import { firebaseStoreProductService } from '../../services/firebaseStoreProductService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
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
  EyeOff,
  PackagePlus,
  CheckCircle2,
  Tag,
  ShoppingBag,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

function parsePriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function priceInputToFloat(display: string): number {
  return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
}

interface StoreProductFormState {
  name: string;
  price: string;
  category: string;
  description: string;
  leadTimeDays: string;
  badge: string;
  isCustomizable: boolean;
  active: boolean;
}

function emptyForm(): StoreProductFormState {
  return {
    name: '',
    price: '',
    category: '',
    description: '',
    leadTimeDays: '5',
    badge: '',
    isCustomizable: true,
    active: true,
  };
}

function formFromStoreProduct(p: StoreProduct): StoreProductFormState {
  return {
    name: p.name,
    price: p.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    category: p.category || '',
    description: p.description || '',
    leadTimeDays: String(p.leadTimeDays ?? 5),
    badge: p.badge || '',
    isCustomizable: p.isCustomizable !== false,
    active: p.active !== false,
  };
}

// ─── Modal de Criação / Edição de Produto da Lojinha ─────────────────────────
interface StoreProductDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: StoreProduct | null;
  existingCategories: string[];
}

function StoreProductDialog({ open, onOpenChange, editing, existingCategories }: StoreProductDialogProps) {
  const [form, setForm] = useState<StoreProductFormState>(editing ? formFromStoreProduct(editing) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const initial = editing ? formFromStoreProduct(editing) : emptyForm();
      // Se estamos criando novo produto e já existem categorias, sugere a primeira se não tiver selecionado
      if (!editing && existingCategories.length > 0 && !initial.category) {
        initial.category = existingCategories[0];
      }
      setForm(initial);
      setPhotoFile(null);
      setPhotoPreview(editing?.imageUrl ?? null);

      if (existingCategories.length === 0) {
        setIsCustomCategory(true);
      } else if (editing?.category && !existingCategories.includes(editing.category)) {
        setIsCustomCategory(true);
      } else {
        setIsCustomCategory(false);
      }
    }
  }, [open, editing, existingCategories]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida (JPG, PNG ou WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo permitido: 5MB');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Informe o nome do produto');
      return;
    }
    const priceVal = priceInputToFloat(form.price);
    if (!form.price || isNaN(priceVal) || priceVal <= 0) {
      toast.error('Informe um valor de venda válido para o produto');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<StoreProduct> = {
        name: form.name.trim(),
        price: priceVal,
        category: form.category.trim() || 'Geral',
        description: form.description.trim() || undefined,
        leadTimeDays: parseInt(form.leadTimeDays, 10) || 5,
        badge: form.badge.trim() || undefined,
        isCustomizable: form.isCustomizable,
        active: form.active,
      };

      let prodId = editing?.id;
      if (editing) {
        await firebaseStoreProductService.updateStoreProduct(editing.id, payload);
      } else {
        const created = await firebaseStoreProductService.createStoreProduct(payload);
        prodId = created.id;
      }

      if (photoFile && prodId) {
        await firebaseStoreProductService.uploadPhoto(prodId, photoFile);
      }

      toast.success(editing ? 'Produto da vitrine atualizado!' : 'Produto publicado na vitrine da lojinha!');
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar produto da lojinha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            {editing ? 'Editar Produto da Lojinha' : 'Novo Produto da Lojinha'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Este produto ficará visível no catálogo online para seus clientes realizarem encomendas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Foto Comercial de Vitrine */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Foto de Vitrine</Label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative size-24 rounded-2xl border-2 border-dashed border-primary/40 bg-muted/30 hover:bg-primary/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-colors shrink-0 shadow-xs"
              >
                {photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Prévia" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                      title="Remover foto"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center">
                    <Upload size={18} className="text-primary" />
                    <span className="text-[10px] font-medium leading-tight">Adicionar foto</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Dica para boa conversão:</p>
                <p>Use fotos nítidas, bem iluminadas e em formato quadrado (1:1). Máximo 5MB.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Nome do Produto */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-name" className="text-xs font-semibold">Nome comercial na vitrine *</Label>
            <Input
              id="sp-name"
              placeholder="Ex: Caderneta de Saúde Ursinho Baby"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Categoria & Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sp-category" className="text-xs font-semibold">Categoria</Label>
                {existingCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !isCustomCategory;
                      setIsCustomCategory(next);
                      if (next) {
                        setForm((prev) => ({ ...prev, category: '' }));
                      } else {
                        setForm((prev) => ({ ...prev, category: existingCategories[0] || '' }));
                      }
                    }}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    {isCustomCategory ? '← Escolher existente' : '+ Nova categoria'}
                  </button>
                )}
              </div>

              {isCustomCategory || existingCategories.length === 0 ? (
                <div className="space-y-1">
                  <Input
                    id="sp-category"
                    placeholder="Digite o nome da nova categoria..."
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    autoFocus={isCustomCategory && existingCategories.length > 0}
                  />
                  {existingCategories.length > 0 && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Ficará salva no dropdown para futuros cadastros.
                    </p>
                  )}
                </div>
              ) : (
                <select
                  id="sp-category"
                  value={form.category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsCustomCategory(true);
                      setForm({ ...form, category: '' });
                    } else {
                      setForm({ ...form, category: e.target.value });
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="" disabled>Selecione uma categoria...</option>
                  {existingCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">➕ Cadastrar nova categoria...</option>
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-price" className="text-xs font-semibold">Preço de Venda (R$) *</Label>
              <Input
                id="sp-price"
                placeholder="0,00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parsePriceInput(e.target.value) })}
                className="font-bold text-primary"
              />
            </div>
          </div>

          {/* Descrição Comercial */}
          <div className="space-y-1.5">
            <Label htmlFor="sp-desc" className="text-xs font-semibold">Descrição para o cliente</Label>
            <Textarea
              id="sp-desc"
              rows={3}
              placeholder="Descreva acabamentos, materiais nobres, dimensões e encantos da peça..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Prazo de Confecção & Selo de Destaque */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sp-leadtime" className="text-xs font-semibold flex items-center gap-1">
                <Clock size={12} className="text-amber-600" />
                Prazo de Confecção (dias úteis)
              </Label>
              <Input
                id="sp-leadtime"
                type="number"
                min="1"
                placeholder="5"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-badge" className="text-xs font-semibold flex items-center gap-1">
                <Tag size={12} className="text-primary" />
                Selo / Destaque (opcional)
              </Label>
              <Input
                id="sp-badge"
                placeholder="Ex: Mais Vendido, Lançamento"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
              />
            </div>
          </div>

          {/* Opções de Personalização e Ativação na Vitrine */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sp-customizable" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#613d3e] dark:text-[#f4b7b9]" />
                  Permite Personalização com Nome ou Tema
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  O cliente poderá digitar o nome da criança ou tema desejado antes de enviar para o WhatsApp.
                </p>
              </div>
              <Switch
                id="sp-customizable"
                checked={form.isCustomizable}
                onCheckedChange={(checked) => setForm({ ...form, isCustomizable: checked })}
              />
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sp-active" className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Globe size={13} className="text-emerald-600" />
                  Ativo e visível no Catálogo Online
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Se desmarcado, o produto fica pausado e não aparece para os clientes.
                </p>
              </div>
              <Switch
                id="sp-active"
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {editing ? 'Salvar Alterações' : 'Publicar na Vitrine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Importação de Produtos do Ateliê ──────────────────────────────
interface ImportFromAtelierDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}

function ImportFromAtelierDialog({ open, onOpenChange, onImported }: ImportFromAtelierDialogProps) {
  const [internalProducts, setInternalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      firebaseProductService
        .getProducts()
        .then(setInternalProducts)
        .catch(() => toast.error('Erro ao buscar produtos internos do ateliê'))
        .finally(() => setLoading(false));
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return internalProducts;
    const q = search.toLowerCase();
    return internalProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q))
    );
  }, [internalProducts, search]);

  async function handleImport(prod: Product) {
    setImportingId(prod.id);
    try {
      await firebaseStoreProductService.importFromInternalProduct(prod);
      toast.success(`"${prod.name}" importado para a vitrine da lojinha!`);
      onImported();
    } catch {
      toast.error('Erro ao importar produto');
    } finally {
      setImportingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5 text-primary" />
            Importar Produtos do Ateliê para a Lojinha
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione uma peça já cadastrada internamente para publicá-la na vitrine comercial sem precisar digitar tudo de novo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative my-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar peça no catálogo do ateliê..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="py-12 flex justify-center items-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin" /> Carregando produtos do ateliê...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Nenhum produto interno encontrado.
            </div>
          ) : (
            filtered.map((prod) => (
              <div
                key={prod.id}
                className="p-3 rounded-xl border border-border/70 hover:border-primary/40 bg-card/60 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {prod.photoUrl ? (
                    <img src={prod.photoUrl} alt={prod.name} className="size-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="size-11 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <ImageIcon size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-foreground truncate">{prod.name}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{prod.category || 'Geral'}</span>
                      <span>•</span>
                      <span className="font-bold text-primary">{formatCurrency(prod.unitPrice)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleImport(prod)}
                  disabled={importingId === prod.id}
                  className="shrink-0 text-xs gap-1.5 hover:bg-primary hover:text-white"
                >
                  {importingId === prod.id ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={13} />
                  )}
                  <span>Publicar na Lojinha</span>
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STORE_PRODUCTS_VIEW_MODE_KEY = 'luisices_store_products_view_mode';

// ─── Página Principal de Produtos da Lojinha ─────────────────────────────────
export function StoreProducts() {
  const { userProfile } = useAuth();
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'pausados'>('todos');
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

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StoreProduct | null>(null);

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
        (filterStatus === 'ativos' && p.active !== false) ||
        (filterStatus === 'pausados' && p.active === false);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [storeProducts, search, filterCategory, filterStatus]);

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

  async function handleToggleActive(p: StoreProduct) {
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine');
      return;
    }
    const nextState = !p.active;
    try {
      await firebaseStoreProductService.toggleStoreProductActive(p.id, nextState);
      toast.success(nextState ? `"${p.name}" ativado na vitrine!` : `"${p.name}" pausado na vitrine.`);
    } catch {
      toast.error('Erro ao alternar status do produto');
    }
  }

  const activeCount = storeProducts.filter((p) => p.active !== false).length;
  const pausedCount = storeProducts.filter((p) => p.active === false).length;

  return (
    <div className="space-y-6 pb-16 w-full max-w-full overflow-x-hidden">
      {/* Header com Boas-vindas e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <Store className="size-7 text-primary" />
            Produtos da Lojinha Online
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie exclusivamente os itens que ficam visíveis na vitrine pública para seus clientes encomendarem pelo WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/catalogo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors shadow-2xs cursor-pointer"
          >
            <Globe size={14} className="text-primary" />
            <span>Ver Lojinha Online</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>

          {canCreate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="gap-1.5 text-xs font-semibold"
              >
                <PackagePlus size={14} className="text-primary" />
                <span>Importar do Ateliê</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEditingProduct(null);
                  setFormOpen(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-xs"
              >
                <Plus size={14} />
                <span>Novo Produto da Lojinha</span>
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
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total na Vitrine</p>
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
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Ativos no Catálogo</p>
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
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pausados</p>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{pausedCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Tag className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Categorias</p>
              <p className="text-xl font-black text-foreground">{categories.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-2xs">
        <div className="w-full sm:flex-1 relative min-w-0">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, categoria ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Filtro de Categoria */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1 sm:flex-none min-w-[130px] max-w-full"
          >
            <option value="todos">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro de Status */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="h-9 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1 sm:flex-none min-w-[110px] max-w-full"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="pausados">Apenas Pausados</option>
          </select>

          {/* Alternador Grid / Lista */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visualização em galeria (grade)"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visualização em lista"
            >
              <LayoutList size={15} />
            </button>
          </div>
        </div>
      </div>

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
          {filteredProducts.map((prod) => (
            <Card
              key={prod.id}
              className={`overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col ${
                !prod.active ? 'opacity-65 border-dashed bg-muted/20' : 'bg-card'
              }`}
            >
              {/* Imagem do Produto */}
              <div className="relative aspect-square w-full bg-muted overflow-hidden">
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
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#613d3e] text-white shadow-xs">
                    {prod.badge}
                  </span>
                )}

                {/* Switch de Ativação Rápida */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full text-white">
                  <span className="text-[10px] font-semibold">{prod.active ? 'No ar' : 'Pausado'}</span>
                  <Switch
                    checked={prod.active}
                    onCheckedChange={() => handleToggleActive(prod)}
                    className="scale-75 cursor-pointer"
                  />
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
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted/30 transition-colors"
            >
              {/* Foto + Dados principais */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
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

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {prod.active ? 'No ar' : 'Pausado'}
                  </span>
                  <Switch
                    checked={prod.active}
                    onCheckedChange={() => handleToggleActive(prod)}
                  />
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

      {/* Modal de Formulário */}
      <StoreProductDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editingProduct}
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
