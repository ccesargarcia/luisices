import { BulkDeleteStoreProductsDialog } from '../components/store/BulkDeleteStoreProductsDialog';
import { BulkStoreProductsDialog } from '../components/store/BulkStoreProductsDialog';
import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { cn } from '../components/ui/utils';
import { Link } from 'react-router';
import { formatCurrency } from '../utils/currency';
import { StoreProduct, Product } from '../types';
import { firebaseStoreProductService } from '../../services/firebaseStoreProductService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSettings } from '../../hooks/useUserSettings';
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
  EyeOff,
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const base64 = res.includes(",") ? res.split(",")[1] : res;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function StoreProductDialog({ open, onOpenChange, editing, existingCategories }: StoreProductDialogProps) {
  const { userProfile } = useAuth();
  const isAdmin = userProfile?.role === "admin";
  const canUseAi = isAdmin || userProfile?.permissions?.aiCopilot === true;

  const [form, setForm] = useState<StoreProductFormState>(editing ? formFromStoreProduct(editing) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [analyzingWithAi, setAnalyzingWithAi] = useState(false);
  const [autoAiOnPhoto, setAutoAiOnPhoto] = useState(true);
  const [descTab, setDescTab] = useState<"editor" | "preview">("editor");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const initial = editing ? formFromStoreProduct(editing) : emptyForm();
      if (!editing && existingCategories.length > 0 && !initial.category) {
        initial.category = existingCategories[0];
      }
      setForm(initial);
      setPhotoFile(null);
      setPhotoPreview(editing?.imageUrl ?? null);
      setDescTab("editor");
      setAnalyzingWithAi(false);

      if (existingCategories.length === 0) {
        setIsCustomCategory(true);
      } else if (editing?.category && !existingCategories.includes(editing.category)) {
        setIsCustomCategory(true);
      } else {
        setIsCustomCategory(false);
      }
    }
  }, [open, editing, existingCategories]);

  async function runAiAnalysis(source?: { file?: File | null; url?: string | null }) {
    const targetFile = source?.file !== undefined ? source.file : photoFile;
    const targetUrl = source?.url !== undefined ? source.url : photoPreview;

    if (!targetFile && !targetUrl) {
      toast.info("Selecione uma foto primeiro para a IA analisar.");
      return;
    }

    if (!canUseAi) {
      toast.error("Seu usuário não possui permissão para utilizar recursos de IA.");
      return;
    }

    setAnalyzingWithAi(true);
    try {
      let imageBase64: string | undefined;
      let mimeType: string | undefined;

      if (targetFile) {
        imageBase64 = await fileToBase64(targetFile);
        mimeType = targetFile.type;
      }

      const suggestion = await firebaseStoreProductService.enrichStoreProductWithAi({
        imageBase64,
        mimeType,
        imageUrl: !targetFile && targetUrl ? targetUrl : undefined,
        currentName: form.name,
        currentCategory: form.category,
        currentDescription: form.description,
      });

      setForm((prev) => {
        const next = { ...prev };
        if (suggestion.name && (!prev.name.trim() || prev.name.length < 5 || !editing)) {
          next.name = suggestion.name;
        }
        if (suggestion.category) {
          next.category = suggestion.category;
          if (!existingCategories.includes(suggestion.category)) {
            setIsCustomCategory(true);
          }
        }
        if (suggestion.description) {
          next.description = suggestion.description;
        }
        if (suggestion.badge && !prev.badge) {
          next.badge = suggestion.badge;
        }
        if (suggestion.leadTimeDays && (!prev.leadTimeDays || prev.leadTimeDays === "5")) {
          next.leadTimeDays = String(suggestion.leadTimeDays);
        }
        return next;
      });

      toast.success("Foto analisada e dados preenchidos com IA! ✨");
    } catch (err: any) {
      console.error("Erro na análise por IA:", err);
      toast.error(err?.message || "Não foi possível analisar a foto com IA.");
    } finally {
      setAnalyzingWithAi(false);
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida (JPG, PNG ou WebP)");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo permitido: 8MB");
      return;
    }

    setPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    e.target.value = "";

    // Análise automática por IA se habilitado e com permissão
    if (canUseAi && autoAiOnPhoto) {
      runAiAnalysis({ file });
    }
  }

  function handleInsertTemplate(snippet: string) {
    setForm((prev) => ({
      ...prev,
      description: prev.description ? `${prev.description}\n${snippet}` : snippet,
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto");
      return;
    }

    const priceVal = priceInputToFloat(form.price);
    if (!form.price || isNaN(priceVal) || priceVal <= 0) {
      toast.error("Informe um valor de venda válido para o produto");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<StoreProduct> = {
        name: form.name.trim(),
        price: priceVal,
        category: form.category.trim() || "Geral",
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

      toast.success(editing ? "Produto da vitrine atualizado!" : "Produto publicado na vitrine da lojinha!");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar produto da lojinha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            {editing ? "Editar Produto da Lojinha" : "Novo Produto da Lojinha"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Este produto ficará visível no catálogo online para seus clientes realizarem encomendas.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 space-y-4">
          {/* Foto Comercial de Vitrine */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Foto de Vitrine</Label>
              {canUseAi && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    id="auto-ai-photo"
                    checked={autoAiOnPhoto}
                    onChange={(e) => setAutoAiOnPhoto(e.target.checked)}
                    className="size-3.5 text-primary rounded cursor-pointer accent-primary shrink-0"
                  />
                  <Label htmlFor="auto-ai-photo" className="cursor-pointer text-[11px] font-medium flex items-center gap-1">
                    <Sparkles size={11} className="text-primary" /> Auto-IA ao carregar
                  </Label>
                </div>
              )}
            </div>

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

              <div className="space-y-2 text-xs text-muted-foreground flex-1">
                <p className="font-medium text-foreground">Dica para boa conversão:</p>
                <p className="text-[11px]">Use fotos nítidas, bem iluminadas e em formato quadrado (1:1). Máximo 8MB.</p>
                
                {canUseAi && (photoPreview || photoFile) && (
                  <div className="pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={analyzingWithAi}
                      onClick={() => runAiAnalysis()}
                      className="h-7 text-[11px] gap-1.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 font-semibold cursor-pointer"
                    >
                      {analyzingWithAi ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-primary" />
                          <span>Analisando foto com IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} className="text-primary" />
                          <span>Analisar foto e preencher com IA</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}

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
              placeholder="Ex: Tubo Lata Floral 7x10 com Laço de Cetim"
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
                        setForm((prev) => ({ ...prev, category: "" }));
                      } else {
                        setForm((prev) => ({ ...prev, category: existingCategories[0] || "" }));
                      }
                    }}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    {isCustomCategory ? "← Escolher existente" : "+ Nova categoria"}
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
                <Select
                  value={form.category || undefined}
                  onValueChange={(val) => {
                    if (val === "__new__") {
                      setIsCustomCategory(true);
                      setForm({ ...form, category: "" });
                    } else {
                      setForm({ ...form, category: val });
                    }
                  }}
                >
                  <SelectTrigger id="sp-category" className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                    ))}
                    <SelectItem value="__new__" className="text-primary font-medium text-xs cursor-pointer">
                      ➕ Cadastrar nova categoria...
                    </SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Descrição Comercial com Suporte Rico a Formatação & Prévia */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sp-desc" className="text-xs font-semibold">Descrição para o cliente</Label>
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => setDescTab("editor")}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                    descTab === "editor" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  ✏️ Editor
                </button>
                <button
                  type="button"
                  onClick={() => setDescTab("preview")}
                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    descTab === "preview" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Eye size={11} /> Prévia Formatada
                </button>
              </div>
            </div>

            {descTab === "editor" ? (
              <div className="space-y-1.5">
                <Textarea
                  id="sp-desc"
                  rows={5}
                  placeholder="Descreva acabamentos, materiais, ocasiões e encantos da peça...&#10;&#10;✨ Perfeita para:&#10;- Lembrancinhas e aniversários&#10;&#10;🎀 Detalhes do produto:&#10;- Acabamento com laço de cetim&#10;- Destaques em **negrito**"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="font-mono text-xs leading-relaxed"
                />

                {/* Atalhos rápidos de formatação */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[10px]">
                  <span className="text-muted-foreground font-medium">Atalhos rápidos:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate("✨ Perfeita para:\n- ")}
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 cursor-pointer"
                  >
                    ✨ Perfeita para
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate("🎀 Detalhes do produto:\n- ")}
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 cursor-pointer"
                  >
                    🎀 Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate("- Novo tópico")}
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 cursor-pointer"
                  >
                    • Lista (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertTemplate("**Destaque em negrito**")}
                    className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground border border-border/60 cursor-pointer font-bold"
                  >
                    **Negrito**
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Aceita formatação com quebras de linha, emojis (✨, 🎀, 📦), tópicos (-) e **negrito**.
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-border bg-card/50 min-h-[120px] text-xs space-y-1">
                {form.description.trim() ? (
                  <FormattedDescription text={form.description} className="text-xs" />
                ) : (
                  <p className="text-muted-foreground italic text-center py-6">
                    Nenhuma descrição digitada ainda. Volte ao editor ou gere uma descrição com IA.
                  </p>
                )}
              </div>
            )}
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
        </DialogBody>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || analyzingWithAi}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {editing ? "Salvar Alterações" : "Publicar na Vitrine"}
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
      <DialogContent size="xl" noPadding className="max-h-[88dvh] flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5 text-primary" />
            Importar Produtos do Ateliê para a Lojinha
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecione uma peça já cadastrada internamente para publicá-la na vitrine comercial sem precisar digitar tudo de novo.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="p-4 sm:p-6 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar peça no catálogo do ateliê..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 pr-1">
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
        </DialogBody>

        <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [filterStatus, setFilterStatus] = useState<'todos' | 'ativos' | 'pausados'>('todos');
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
      toast.success(nextState ? `"${p.name}" publicado na vitrine!` : `"${p.name}" pausado na vitrine.`);
    } catch {
      toast.error('Erro ao alternar status da publicação');
    }
  }

  async function handleBulkToggleActive(active: boolean) {
    if (selectedProductIds.length === 0) return;
    if (!canEdit) {
      toast.error('Você não tem permissão para alterar produtos da vitrine.');
      return;
    }
    setIsBulkStatusUpdating(true);
    try {
      await firebaseStoreProductService.bulkToggleActive(selectedProductIds, active);
      toast.success(
        active
          ? `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'publicação ativada' : 'publicações ativadas'} no catálogo.`
          : `${selectedProductIds.length} ${selectedProductIds.length === 1 ? 'publicação pausada' : 'publicações pausadas'} no catálogo.`
      );
      setSelectedProductIds([]);
    } catch (err) {
      console.error('Erro na alteração em lote de status:', err);
      toast.error('Ocorreu um erro ao atualizar o status das publicações selecionadas.');
    } finally {
      setIsBulkStatusUpdating(false);
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
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Publicações Pausadas</p>
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
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Categorias Ativas</p>
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

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Filtro de Categoria */}
          <Select
            value={filterCategory}
            onValueChange={(val) => setFilterCategory(val)}
          >
            <SelectTrigger aria-label="Filtro de Categoria" className="h-9 text-xs flex-1 sm:flex-none min-w-[140px] max-w-full">
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
            <SelectTrigger aria-label="Filtro de Status" className="h-9 text-xs flex-1 sm:flex-none min-w-[130px] max-w-full">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos os Status</SelectItem>
              <SelectItem value="ativos" className="text-xs">Apenas Publicados</SelectItem>
              <SelectItem value="pausados" className="text-xs">Apenas Pausados</SelectItem>
            </SelectContent>
          </Select>

          {/* Seletor de Limite por Página */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground px-1 hidden md:inline">Exibir:</span>
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
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visualização em galeria (grade)"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              title="Visualização em lista"
            >
              <LayoutList size={15} />
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
                    onClick={() => handleBulkToggleActive(false)}
                    className="flex-1 sm:flex-initial h-8.5 sm:h-8 px-2 sm:px-2.5 text-xs font-semibold gap-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer shadow-2xs"
                    title="Pausar publicações na vitrine"
                  >
                    {isBulkStatusUpdating ? (
                      <Loader2 size={13} className="animate-spin shrink-0" />
                    ) : (
                      <EyeOff size={13} className="shrink-0" />
                    )}
                    <span>Pausar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isBulkStatusUpdating}
                    onClick={() => handleBulkToggleActive(true)}
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
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs px-2 py-1 rounded-full text-white">
                  <span className="text-[10px] font-semibold">{prod.active ? 'Publicado' : 'Pausado'}</span>
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

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {prod.active ? 'Publicado' : 'Pausado'}
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

      {/* Controles de Paginação */}
      {pageSize !== 'all' && totalPages > 1 && totalProducts > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Mostrando {startItem}–{endItem} de {totalProducts} produto{totalProducts !== 1 ? 's' : ''} — Página{' '}
            <strong className="text-foreground">{currentPage}</strong> de <strong>{totalPages}</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="text-xs h-8 cursor-pointer"
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
                      {hasGap && <span className="px-1 text-xs text-muted-foreground select-none">…</span>}
                      <Button
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        className="size-8 p-0 text-xs cursor-pointer"
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
              className="text-xs h-8 cursor-pointer"
            >
              Próxima
            </Button>
          </div>
        </div>
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
