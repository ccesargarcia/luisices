import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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
  const [batchCategory, setBatchCategory] = useState('');
  const [batchPrice, setBatchPrice] = useState('');
  const [batchLeadTime, setBatchLeadTime] = useState('5');
  const [isDragging, setIsDragging] = useState(false);

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
      setBatchCategory('');
      setBatchPrice('');
      setBatchLeadTime('5');
      setProgressCount(0);
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
    toast.success(`${validFiles.length} foto(s) adicionada(s) à lista!`);
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
      toast.error(`Existem ${invalidItems.length} item(ns) com nome ou preço de venda não preenchidos.`);
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
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        {/* Header Fixo */}
        <DialogHeader className="p-4 sm:p-6 border-b border-border bg-card/60 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Images className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  Adicionar Fotos em Massa na Vitrine
                  {items.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-full font-semibold">
                      {items.length} {items.length === 1 ? 'produto detectado' : 'produtos detectados'}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Selecione várias fotos de uma vez. O modal gera os campos de cada produto automaticamente.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-1.5 shrink-0 text-xs font-semibold cursor-pointer"
            >
              <Upload size={14} className="text-primary" />
              <span>{items.length === 0 ? 'Selecionar Fotos' : '+ Mais Fotos'}</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Barra de Replicar em Lote (Aparece quando há 2 ou mais fotos) */}
          {items.length >= 2 && !isProcessing && (
            <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs bg-muted/30 p-2.5 rounded-xl">
              <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs mr-1">
                <Sparkles size={13} className="text-primary" />
                Preenchimento Rápido em Lote:
              </span>

              {/* Preço Comum */}
              <div className="flex items-center gap-1">
                <Input
                  placeholder="R$ Preço"
                  value={batchPrice}
                  onChange={(e) => setBatchPrice(parsePriceInput(e.target.value))}
                  className="h-7 w-24 text-xs font-medium bg-background"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyBatchPrice}
                  className="h-7 px-2 text-xs text-primary hover:text-primary cursor-pointer"
                  title="Aplicar este preço em todos os itens"
                >
                  <Copy size={12} className="mr-1" />
                  Aplicar
                </Button>
              </div>

              {/* Categoria Comum */}
              <div className="flex items-center gap-1">
                <Input
                  placeholder="Categoria"
                  value={batchCategory}
                  onChange={(e) => setBatchCategory(e.target.value)}
                  className="h-7 w-28 text-xs bg-background"
                  list="bulk-existing-categories"
                />
                <datalist id="bulk-existing-categories">
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyBatchCategory}
                  className="h-7 px-2 text-xs text-primary hover:text-primary cursor-pointer"
                  title="Aplicar esta categoria em todos os itens"
                >
                  <Copy size={12} className="mr-1" />
                  Aplicar
                </Button>
              </div>

              {/* Prazo Comum */}
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  placeholder="Dias"
                  value={batchLeadTime}
                  onChange={(e) => setBatchLeadTime(e.target.value)}
                  className="h-7 w-16 text-xs bg-background"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyBatchLeadTime}
                  className="h-7 px-2 text-xs text-primary hover:text-primary cursor-pointer"
                  title="Aplicar este prazo em todos os itens"
                >
                  <Copy size={12} className="mr-1" />
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Área Central Rolável com os Cards Dinâmicos */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 transition-colors ${
            isDragging ? 'bg-primary/5 border-2 border-dashed border-primary' : ''
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          {items.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="h-full min-h-[320px] flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-2xl p-8 hover:border-primary/50 transition-colors cursor-pointer bg-card/30"
            >
              <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
                <Upload className="size-8" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Arraste suas fotos aqui ou clique para selecionar
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1.5 leading-relaxed">
                Você pode enviar 5, 10, 20 ou mais fotos simultâneas. O sistema expandirá automaticamente os campos de cada produto para você revisar e precificar.
              </p>
              <div className="flex items-center gap-2 mt-4 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
                <FileImage size={13} />
                <span>Formatos aceitos: JPG, PNG, WebP (até 8MB cada)</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                    item.status === 'success'
                      ? 'bg-emerald-500/5 border-emerald-500/30'
                      : item.status === 'error'
                      ? 'bg-red-500/5 border-red-500/30'
                      : item.status === 'uploading'
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                    {/* Miniatura da Foto com Badge de Ordem */}
                    <div className="relative size-18 sm:size-20 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/80 shadow-2xs group">
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1 left-1 size-5 rounded-md bg-black/70 text-white text-[10px] font-bold flex items-center justify-center">
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
                          <CheckCircle2 className="size-6" />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="absolute inset-0 bg-red-600/80 flex items-center justify-center text-white">
                          <AlertCircle className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* Campos do Produto */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 w-full">
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

                      {/* Preço (R$) */}
                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Preço de Venda (R$) *
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

                      {/* Categoria */}
                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[11px] font-semibold text-muted-foreground">
                          Categoria
                        </Label>
                        <Input
                          value={item.category}
                          disabled={isProcessing || item.status === 'success'}
                          onChange={(e) => updateItem(item.id, { category: e.target.value })}
                          placeholder="Geral"
                          className="h-8 text-xs"
                          list="bulk-existing-categories"
                        />
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

                    {/* Botão de Remover Item */}
                    {!isProcessing && item.status !== 'success' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="size-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl shrink-0 cursor-pointer"
                        title="Remover este item"
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
        </div>

        {/* Footer com Progresso e Publicação */}
        <DialogFooter className="p-4 sm:p-5 border-t border-border bg-card/60 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                <span className="font-semibold text-foreground">
                  Publicando produtos ({progressCount} de {items.length})...
                </span>
              </div>
            ) : items.length > 0 ? (
              <span>
                {items.length} {items.length === 1 ? 'item pronto' : 'itens prontos'} para publicação na lojinha.
              </span>
            ) : (
              <span>Nenhuma foto selecionada ainda.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isProcessing || items.length === 0}
              onClick={handlePublishAll}
              className="text-xs font-bold gap-1.5 shadow-xs cursor-pointer min-w-[140px]"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Publicar Todos ({items.length})</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
