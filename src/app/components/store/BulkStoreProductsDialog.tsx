import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Upload,
  Trash2,
  Images,
  Loader2,
  Copy,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Plus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { firebaseStoreProductService } from '../../../services/firebaseStoreProductService';
import { StoreProduct } from '../../types';

interface BulkItemState {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  price: string;
  category: string;
  leadTimeDays: string;
  isCustomizable: boolean;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

interface BulkStoreProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCategories: string[];
}

function parsePriceInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function priceInputToFloat(display: string): number {
  return parseFloat(display.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Converte o nome do arquivo da imagem em um título amigável de produto
 * Exemplo: "caixa_milk-luxo-dourada_01.jpg" -> "Caixa Milk Luxo Dourada"
 */
function formatFilenameToTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const clean = withoutExt
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove números isolados no fim se for apenas índice (ex: "Produto 01" -> "Produto")
  const strippedIndex = clean.replace(/\s+\d+$/, '');
  const target = strippedIndex.length >= 3 ? strippedIndex : clean;

  // Capitaliza primeira letra de cada palavra
  return target
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function BulkStoreProductsDialog({
  open,
  onOpenChange,
  existingCategories,
}: BulkStoreProductsDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<BulkItemState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressCount, setProgressCount] = useState(0);

  // Estados para replicação em lote (Barra Superior Rápida)
  const [batchCategory, setBatchCategory] = useState(existingCategories.length > 0 ? existingCategories[0] : '');
  const [batchCategoryIsNew, setBatchCategoryIsNew] = useState(false);
  const [batchPrice, setBatchPrice] = useState('');
  const [batchLeadTime, setBatchLeadTime] = useState('5');
  const [isDragging, setIsDragging] = useState(false);
  const [newCategoryItemIds, setNewCategoryItemIds] = useState<Set<string>>(new Set());

  // Limpa estados ao fechar ou reabrir
  const handleOpenChange = (nextOpen: boolean) => {
    if (isProcessing && !nextOpen) {
      toast.warning('Aguarde a finalização dos uploads em andamento.');
      return;
    }
    if (!nextOpen) {
      // Libera object URLs para não vazar memória
      items.forEach(it => URL.revokeObjectURL(it.previewUrl));
      setItems([]);
      setBatchCategory(existingCategories.length > 0 ? existingCategories[0] : '');
      setBatchCategoryIsNew(false);
      setBatchPrice('');
      setBatchLeadTime('5');
      setProgressCount(0);
      setNewCategoryItemIds(new Set());
    }
    onOpenChange(nextOpen);
  };

  function processFiles(files: FileList | File[]) {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        toast.error(`"${file.name}" não é uma imagem válida.`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`"${file.name}" ultrapassa 8MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const defaultCategory = batchCategory.trim() || (existingCategories.length > 0 ? existingCategories[0] : 'Geral');

    const newItems: BulkItemState[] = validFiles.map((file, idx) => ({
      id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: formatFilenameToTitle(file.name),
      price: batchPrice || '',
      category: defaultCategory,
      leadTimeDays: batchLeadTime || '5',
      isCustomizable: true,
      status: 'pending',
    }));

    setItems(prev => [...prev, ...newItems]);
    toast.success(`${validFiles.length} foto(s) adicionada(s)!`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function removeItem(id: string) {
    setItems(prev => {
      const item = prev.find(it => it.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(it => it.id !== id);
    });
  }

  function clearAllItems() {
    if (items.length === 0) return;
    items.forEach(it => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    toast.info('Lista de fotos redefinida.');
  }

  function updateItem(id: string, patch: Partial<BulkItemState>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }

  // Ações de preenchimento em lote
  function applyBatchCategory() {
    if (!batchCategory.trim()) {
      toast.error('Informe uma categoria para aplicar');
      return;
    }
    setItems(prev => prev.map(it => ({ ...it, category: batchCategory.trim() })));
    toast.success(`Categoria "${batchCategory.trim()}" aplicada a todos os itens!`);
  }

  function applyBatchPrice() {
    if (!batchPrice) {
      toast.error('Informe um valor para aplicar');
      return;
    }
    setItems(prev => prev.map(it => ({ ...it, price: batchPrice })));
    toast.success(`Preço R$ ${batchPrice} aplicado a todos os itens!`);
  }

  function applyBatchLeadTime() {
    if (!batchLeadTime) return;
    setItems(prev => prev.map(it => ({ ...it, leadTimeDays: batchLeadTime })));
    toast.success(`Prazo de ${batchLeadTime} dias aplicado a todos os itens!`);
  }

  async function handlePublishAll() {
    if (items.length === 0) {
      toast.error('Adicione pelo menos uma foto para publicar');
      return;
    }

    // Validações básicas antes de iniciar
    const invalidItems = items.filter(it => !it.name.trim() || priceInputToFloat(it.price) <= 0);
    if (invalidItems.length > 0) {
      toast.error(`Existem ${invalidItems.length} item(ns) com nome ou preço não preenchidos.`);
      return;
    }

    setIsProcessing(true);
    setProgressCount(0);
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Pula os que já foram enviados com sucesso
      if (item.status === 'success') {
        successCount++;
        continue;
      }

      updateItem(item.id, { status: 'uploading' });

      try {
        const payload: Partial<StoreProduct> = {
          name: item.name.trim(),
          price: priceInputToFloat(item.price),
          category: item.category.trim() || 'Geral',
          leadTimeDays: parseInt(item.leadTimeDays, 10) || 5,
          isCustomizable: item.isCustomizable,
          active: true,
          description: 'Produto artesanal confeccionado sob encomenda com acabamento refinado.',
        };

        // 1. Cria produto no Firestore
        const created = await firebaseStoreProductService.createStoreProduct(payload);

        // 2. Faz upload da foto para o Storage associado ao produto recém-criado
        if (created.id && item.file) {
          await firebaseStoreProductService.uploadPhoto(created.id, item.file);
        }

        updateItem(item.id, { status: 'success' });
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao publicar "${item.name}":`, err);
        updateItem(item.id, {
          status: 'error',
          errorMessage: err?.message || 'Falha ao salvar produto',
        });
      }

      setProgressCount(i + 1);
    }

    setIsProcessing(false);

    if (successCount === items.length) {
      toast.success(`Parabéns! Todos os ${successCount} produtos foram publicados na vitrine com sucesso!`);
      setTimeout(() => {
        handleOpenChange(false);
      }, 1200);
    } else {
      toast.warning(`${successCount} de ${items.length} produtos foram publicados. Verifique os itens com erro.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="4xl" noPadding className="h-[92vh] sm:h-[88vh] flex flex-col overflow-hidden">
        {/* Header Fixo Mobile-First */}
        <DialogHeader className="p-3.5 sm:p-5 border-b border-border bg-card/90 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Título & Badge */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 sm:size-10 rounded-xl sm:rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Images className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold truncate">
                    Publicação em Lote via Fotografias
                  </DialogTitle>
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-primary/15 text-primary border-primary/20 shrink-0">
                      {items.length} {items.length === 1 ? 'foto' : 'fotos'}
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                  Adicione fotografias para gerar e cadastrar produtos no catálogo online de forma simultânea.
                </DialogDescription>
              </div>
            </div>

            {/* Ações Rápidas do Header */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial h-9 sm:h-8 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={15} className="shrink-0 stroke-[2.5]" />
                <span>{items.length === 0 ? 'Escolher Fotos' : 'Mais Fotos'}</span>
              </Button>

              {items.length > 0 && !isProcessing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllItems}
                  className="h-9 sm:h-8 px-2.5 text-xs text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                  title="Limpar todas as fotos"
                >
                  <Trash2 size={14} className="mr-1" />
                  <span className="hidden sm:inline">Limpar Lista</span>
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Barra de Replicar em Lote (Aparece quando há 2 ou mais fotos) */}
          {items.length >= 2 && !isProcessing && (
            <div className="pt-2.5 border-t border-border/60 bg-muted/40 p-2.5 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <Sparkles size={12} className="text-primary" />
                <span>Preenchimento Automático em Lote:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Preço Comum */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                  <span className="text-[11px] font-bold text-muted-foreground pl-1.5">R$</span>
                  <Input
                    placeholder="0,00"
                    value={batchPrice}
                    onChange={(e) => setBatchPrice(parsePriceInput(e.target.value))}
                    className="h-7 text-xs font-bold border-0 focus-visible:ring-0 shadow-none px-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={applyBatchPrice}
                    className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    title="Aplicar este preço em todas as fotos"
                  >
                    <Copy size={11} className="mr-1" />
                    Aplicar
                  </Button>
                </div>

                {/* Categoria Comum */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                  {batchCategoryIsNew ? (
                    <>
                      <Input
                        autoFocus
                        placeholder="Nova categoria..."
                        value={batchCategory}
                        onChange={(e) => setBatchCategory(e.target.value)}
                        className="h-7 text-xs border-0 focus-visible:ring-0 shadow-none px-1.5 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBatchCategoryIsNew(false);
                          setBatchCategory(existingCategories.length > 0 ? existingCategories[0] : '');
                        }}
                        className="h-7 px-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                        title="Voltar para categorias existentes"
                      >
                        <X size={12} />
                      </Button>
                    </>
                  ) : (
                    <Select
                      value={batchCategory || '__none__'}
                      onValueChange={(v) => {
                        if (v === '__new__') {
                          setBatchCategoryIsNew(true);
                          setBatchCategory('');
                        } else {
                          setBatchCategory(v === '__none__' ? '' : v);
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs border-0 focus-visible:ring-0 shadow-none px-1.5 flex-1">
                        <SelectValue placeholder="Categoria..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Nenhuma —</SelectItem>
                        {existingCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="__new__" className="text-primary font-semibold">
                          <span className="flex items-center gap-1"><Plus size={12} /> Nova categoria</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={applyBatchCategory}
                    className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    title="Aplicar esta categoria em todas as fotos"
                  >
                    <Copy size={11} className="mr-1" />
                    Aplicar
                  </Button>
                </div>

                {/* Prazo Comum */}
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground pl-1.5">Prazo:</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Dias"
                    value={batchLeadTime}
                    onChange={(e) => setBatchLeadTime(e.target.value)}
                    className="h-7 text-xs border-0 focus-visible:ring-0 shadow-none px-1 text-center"
                  />
                  <span className="text-[11px] text-muted-foreground pr-1">dias</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={applyBatchLeadTime}
                    className="h-7 px-2 text-[11px] font-bold text-primary hover:text-primary hover:bg-primary/10 shrink-0 cursor-pointer"
                    title="Aplicar este prazo em todas as fotos"
                  >
                    <Copy size={11} className="mr-1" />
                    Aplicar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Área Central Rolável com os Cards Dinâmicos (Mobile First) */}
        <DialogBody
          className={`p-3 sm:p-5 space-y-3 transition-colors ${
            isDragging ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {items.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-full min-h-[260px] flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-2xl p-6 sm:p-8 hover:border-primary/50 transition-colors cursor-pointer bg-card/30"
            >
              <div className="size-14 sm:size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3.5 shadow-2xs">
                <Upload className="size-6 sm:size-8" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Toque para selecionar as fotografias
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                Selecione imagens diretamente da galeria do celular ou do computador para gerar produtos e configurar preços e categorias.
              </p>
              <div className="flex items-center gap-1.5 mt-3.5 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1 rounded-full">
                <FileImage size={12} />
                <span>Formatos: JPG, PNG, WebP (até 8MB cada)</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                    item.status === 'success'
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : item.status === 'error'
                      ? 'bg-red-500/5 border-red-500/30'
                      : item.status === 'uploading'
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Linha Superior Mobile: Foto + Título/Numeração + Botão de Excluir */}
                    <div className="flex items-center gap-3">
                      {/* Miniatura da Foto com Badge de Ordem */}
                      <div className="relative size-16 sm:size-18 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/80 shadow-2xs">
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-1 left-1 size-5 rounded-md bg-black/75 text-white text-[10px] font-bold flex items-center justify-center">
                          {index + 1}
                        </span>

                        {/* Status Overlay */}
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                            <Loader2 className="size-5 animate-spin text-primary" />
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center text-white">
                            <CheckCircle2 className="size-5" />
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center text-white">
                            <AlertCircle className="size-5" />
                          </div>
                        )}
                      </div>

                      {/* No mobile, exibe o nome resumido e o botão de lixeira no topo */}
                      <div className="flex-1 sm:hidden min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{item.name || 'Sem nome'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.price ? `R$ ${item.price}` : 'Preço pendente'}
                        </p>
                      </div>

                      {!isProcessing && item.status !== 'success' && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          className="size-8 sm:hidden text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg shrink-0 cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </div>

                    {/* Campos do Produto (Grid Responsivo) */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2 w-full">
                      {/* Nome do Produto */}
                      <div className="sm:col-span-5 space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Nome do Produto *
                        </Label>
                        <Input
                          value={item.name}
                          disabled={isProcessing || item.status === 'success'}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                          placeholder="Ex: Caixa Milk Luxo"
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      {/* Preço e Prazo lado a lado no mobile */}
                      <div className="grid grid-cols-2 sm:contents gap-2">
                        {/* Preço (R$) */}
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Preço (R$) *
                          </Label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-semibold">
                              R$
                            </span>
                            <Input
                              value={item.price}
                              disabled={isProcessing || item.status === 'success'}
                              onChange={(e) => updateItem(item.id, { price: parsePriceInput(e.target.value) })}
                              placeholder="0,00"
                              className="h-8 text-xs font-bold pl-7"
                            />
                          </div>
                        </div>

                        {/* Prazo (Dias) */}
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[11px] font-semibold text-muted-foreground">
                            Prazo (dias)
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.leadTimeDays}
                            disabled={isProcessing || item.status === 'success'}
                            onChange={(e) => updateItem(item.id, { leadTimeDays: e.target.value })}
                            className="h-8 text-xs text-center"
                          />
                        </div>
                      </div>

                      {/* Categoria */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Categoria
                        </Label>
                        {newCategoryItemIds.has(item.id) ? (
                          <div className="flex items-center gap-1">
                            <Input
                              autoFocus
                              placeholder="Nova categoria..."
                              value={item.category}
                              disabled={isProcessing || item.status === 'success'}
                              onChange={(e) => updateItem(item.id, { category: e.target.value })}
                              className="h-8 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setNewCategoryItemIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(item.id);
                                  return next;
                                });
                                updateItem(item.id, { category: existingCategories[0] || '' });
                              }}
                              disabled={isProcessing || item.status === 'success'}
                              className="size-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                              title="Voltar para categorias existentes"
                            >
                              <X size={13} />
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={item.category || '__none__'}
                            onValueChange={(v) => {
                              if (v === '__new__') {
                                setNewCategoryItemIds(prev => new Set(prev).add(item.id));
                                updateItem(item.id, { category: '' });
                              } else {
                                updateItem(item.id, { category: v === '__none__' ? '' : v });
                              }
                            }}
                            disabled={isProcessing || item.status === 'success'}
                          >
                            <SelectTrigger size="sm" className="h-8 text-xs">
                              <SelectValue placeholder="Geral" />
                            </SelectTrigger>
                            <SelectContent>
                              {existingCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                              <SelectItem value="__new__" className="text-primary font-semibold">
                                <span className="flex items-center gap-1"><Plus size={12} /> Nova categoria</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Botão de Remover Item (No desktop fica na extrema direita) */}
                    {!isProcessing && item.status !== 'success' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="hidden sm:inline-flex size-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0 cursor-pointer"
                        title="Remover foto"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>

                  {item.errorMessage && (
                    <p className="text-[11px] text-red-500 mt-2 flex items-center gap-1 font-medium">
                      <AlertCircle size={12} />
                      {item.errorMessage}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        {/* Footer com Progresso e Publicação (Mobile First) */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card/90 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="font-semibold text-foreground">
                  Publicando produtos ({progressCount} de {items.length})...
                </span>
              </div>
            ) : items.length > 0 ? (
              <span>
                <strong>{items.length}</strong> {items.length === 1 ? 'produto pronto' : 'produtos prontos'} para publicação.
              </span>
            ) : (
              <span>Nenhuma foto na fila de envio.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleOpenChange(false)}
              className="flex-1 sm:flex-initial h-9 sm:h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isProcessing || items.length === 0}
              onClick={handlePublishAll}
              className="flex-1 sm:flex-initial h-9 sm:h-8 text-xs font-bold gap-1.5 shadow-xs cursor-pointer min-w-[130px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Publicar ({items.length})</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
