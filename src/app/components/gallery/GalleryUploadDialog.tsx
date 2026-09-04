import React, { useState, useRef } from 'react';
import { GalleryItem, Customer, Tag } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Upload, X } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '');
  const [tags, setTags] = useState<Tag[]>([]);
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
      toast.success('Arte adicionada à galeria');
      onSaved(item);
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
      <DialogContent className="w-full max-w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Arte</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Drop zone */}
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg transition-colors cursor-pointer',
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/60',
              preview
                ? 'p-1'
                : 'p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground'
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
                  className="w-full max-h-64 object-contain rounded"
                  loading="lazy"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
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
                <Upload className="size-8 opacity-50" />
                <span className="text-sm font-medium">Clique ou arraste uma imagem</span>
                <span className="text-xs">PNG, JPG, WEBP — até 15MB</span>
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
            <Label htmlFor="gallery-title">
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
            <Label htmlFor="gallery-desc">Descrição</Label>
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
            <Label>Cliente</Label>
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
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} placeholder="Adicionar tag..." />
          </div>
        </div>

        <DialogFooter>
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
