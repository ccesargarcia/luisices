import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Store,
  Sparkles,
  Loader2,
  Upload,
  X,
  Globe,
  Tag,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { StoreProduct } from '../../types';
import { firebaseStoreProductService } from '../../../services/firebaseStoreProductService';
import { FormattedDescription } from '../FormattedDescription';
import { optimizeImageForAi } from '../../utils/imageOptimizer';

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
  status: "active" | "paused" | "hidden";
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
    status: "active",
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
    status: p.status || (p.active === false ? "hidden" : "active"),
  };
}

// ─── Modal de Criação / Edição de Produto da Lojinha ─────────────────────────
export interface StoreProductDialogProps {
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

export function StoreProductDialog({ open, onOpenChange, editing, existingCategories }: StoreProductDialogProps) {
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
        const optimized = await optimizeImageForAi(targetFile);
        imageBase64 = await fileToBase64(optimized);
        mimeType = optimized.type;
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
        active: form.status !== 'hidden',
        status: form.status,
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

            
            <div className="pt-3 border-t border-border/60">
              <Label className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                <Globe size={13} className="text-emerald-600" />
                Status na Vitrine
              </Label>
              <Select value={form.status} onValueChange={(val) => {
                if (val === 'active' || val === 'paused' || val === 'hidden') {
                  setForm({ ...form, status: val });
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="font-semibold text-emerald-600">🟢 Ativo (Vendas abertas)</span>
                  </SelectItem>
                  <SelectItem value="paused">
                    <span className="font-semibold text-amber-500">🟠 Pausado (Esgotado / Vitrine apenas)</span>
                  </SelectItem>
                  <SelectItem value="hidden">
                    <span className="font-semibold text-red-500">🔴 Oculto (Não aparece no catálogo)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
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

