import React, { useState, useRef } from 'react';
import { Customer, GalleryItem, Tag } from '../../types';
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
import { TagInput } from '../TagInput';
import { Upload, X, Loader2 } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { toast } from 'sonner';

interface CustomerGalleryUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  userId: string;
  onUploaded: (item: GalleryItem) => void;
}

export function CustomerGalleryUploadDialog({
  open,
  onOpenChange,
  customer,
  userId,
  onUploaded,
}: CustomerGalleryUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setTitle('');
    setDescription('');
    setTags([]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleFilePick = (f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 15MB');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSave = async () => {
    if (!file || !customer || !userId) return;
    if (!title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await firebaseGalleryService.uploadImage(file, userId, tempId);
      const item = await firebaseGalleryService.createItem(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        imageUrl,
        customerId: customer.id,
        customerName: customer.name,
        tags,
      });

      onUploaded(item);
      toast.success('Arte adicionada à galeria');
      handleClose(false);
    } catch (err) {
      toast.error('Erro ao salvar arte');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Arte — {customer?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFilePick(f);
            }}
          />

          <div
            className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              preview
                ? 'p-1'
                : 'p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/60'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFilePick(f);
            }}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="preview"
                  className="w-full max-h-56 object-contain rounded"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
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
                <Upload className="size-7 opacity-50" />
                <span className="text-sm font-medium">Clique ou arraste uma imagem</span>
                <span className="text-xs">PNG, JPG, WEBP — até 15MB</span>
              </>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="gu-title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="gu-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da arte"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="gu-desc">Descrição</Label>
            <Textarea
              id="gu-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas sobre a arte..."
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} placeholder="Adicionar tag..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !file}>
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
