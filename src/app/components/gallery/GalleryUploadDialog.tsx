import React, { useState, useRef } from 'react';
import { GalleryItem, Customer, Tag } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TagInput } from '../TagInput';
import { Upload, X, Sparkles } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface GalleryUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: (item: GalleryItem) => void;
  customers: Customer[];
  userId: string;
  initialCustomerId?: string;
}

export function GalleryUploadDialog({
  open,
  onClose,
  onSaved,
  customers,
  userId,
  initialCustomerId,
}: GalleryUploadDialogProps) {
  const { hasPermission, isAdmin } = useAuth();
  const canUseAi = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '');
  const [tags, setTags] = useState<Tag[]>([]);
  const [autoEnrich, setAutoEnrich] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const acceptedImageTypes = 'image/jpeg,image/png,image/webp';

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTitle('');
    setDescription('');
    setCustomerId(initialCustomerId ?? '');
    setTags([]);
    setAutoEnrich(true);
    setSaving(false);
    setDragging(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickFile = (f: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 15MB');
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };

  const handleSave = async () => {
    if (!file) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await firebaseGalleryService.uploadImage(file, userId, tempId);
      const customer = customers.find((c) => c.id === customerId);
      const item = await firebaseGalleryService.createItem(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl,
        customerId: customer?.id,
        customerName: customer?.name,
        tags,
      });

      let finalItem = item;
      if (canUseAi && autoEnrich) {
        try {
          const aiRes = await firebaseGalleryService.enrichItemWithAi(item.id);
          finalItem = {
            ...item,
            aiDescription: aiRes.aiDescription,
            productType: aiRes.productType,
            colors: aiRes.colors,
            aiTags: aiRes.suggestedTags,
            tags: (item.tags && item.tags.length > 0)
              ? item.tags
              : (aiRes.suggestedTags || []).map((t, idx) => ({
                  id: `tag-${idx}`,
                  name: t,
                  color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 5],
                })),
            aiAnalyzedAt: new Date().toISOString(),
          };
          toast.success('Arte adicionada e catalogada com IA ✨');
        } catch {
          toast.success('Arte adicionada à galeria');
        }
      } else {
        toast.success('Arte adicionada à galeria');
      }

      onSaved(finalItem);
      handleClose();
    } catch (err) {
      toast.error('Erro ao salvar arte');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent size="lg" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 border-b">
          <DialogTitle>Nova Arte</DialogTitle>
        </DialogHeader>

        <DialogBody className="px-4 sm:px-6 py-4 space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/60',
              preview
                ? 'p-1'
                : 'py-6 px-4 flex flex-col items-center justify-center gap-1.5 text-muted-foreground'
            )}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="preview"
                  className="w-full max-h-48 sm:max-h-56 object-contain rounded"
                  loading="lazy"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="size-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="size-7 opacity-60" />
                <span className="text-xs sm:text-sm font-medium">Clique ou arraste uma imagem</span>
                <span className="text-[11px] text-muted-foreground">PNG, JPG, WEBP — até 15MB</span>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={acceptedImageTypes}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
            }}
          />

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="gallery-title" className="text-xs sm:text-sm">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="gallery-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da arte"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="gallery-desc" className="text-xs sm:text-sm">Descrição</Label>
            <Textarea
              id="gallery-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre a arte..."
              rows={2}
            />
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Cliente</Label>
            <Select
              value={customerId || '__none__'}
              onValueChange={(v) => setCustomerId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label className="text-xs sm:text-sm">Tags</Label>
            <TagInput tags={tags} onChange={setTags} placeholder="Adicionar tag..." />
          </div>

          {/* AI Auto-Catalog Option */}
          {canUseAi && (
            <div className="flex items-center gap-2.5 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <input
                type="checkbox"
                id="ai-auto-catalog"
                checked={autoEnrich}
                onChange={(e) => setAutoEnrich(e.target.checked)}
                className="size-4 text-amber-600 rounded cursor-pointer accent-amber-500 shrink-0"
              />
              <Label htmlFor="ai-auto-catalog" className="text-xs font-medium cursor-pointer flex items-center gap-1.5 text-foreground select-none leading-snug">
                <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                Catalogar e analisar automaticamente com IA ✨
              </Label>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-card/60">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !file}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
