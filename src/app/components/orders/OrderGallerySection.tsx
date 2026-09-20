import React, { useRef, useState } from 'react';
import { GalleryItem } from '../../types';
import { SafeImg } from '../SafeMedia';
import { Images, Plus, ZoomIn, X, Loader2 } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
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

interface OrderGallerySectionProps {
  customerName: string;
  customerId?: string;
  orderId: string;
  userId?: string;
  gallery: GalleryItem[];
  loading: boolean;
  canCreate: boolean;
  onGalleryUpdated: (items: GalleryItem[]) => void;
}

export function OrderGallerySection({
  customerName,
  customerId,
  orderId,
  userId,
  gallery,
  loading,
  canCreate,
  onGalleryUpdated,
}: OrderGallerySectionProps) {
  const [galleryLightbox, setGalleryLightbox] = useState<GalleryItem | null>(null);
  const [galleryUploadOpen, setGalleryUploadOpen] = useState(false);
  const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
  const [galleryUploadPreview, setGalleryUploadPreview] = useState<string | null>(null);
  const [galleryUploadTitle, setGalleryUploadTitle] = useState('');
  const [galleryUploadSaving, setGalleryUploadSaving] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryFilePick = (f: File) => {
    if (!f.type.startsWith('image/')) return;
    setGalleryUploadFile(f);
    setGalleryUploadPreview(URL.createObjectURL(f));
    if (!galleryUploadTitle) setGalleryUploadTitle(f.name.replace(/\.[^.]+$/, ''));
    setGalleryUploadOpen(true);
  };

  const handleGalleryUploadSave = async () => {
    if (!galleryUploadFile || !userId || !orderId || !galleryUploadTitle.trim()) return;
    setGalleryUploadSaving(true);
    try {
      const tempId = `${Date.now()}`;
      const imageUrl = await firebaseGalleryService.uploadImage(galleryUploadFile, userId, tempId);
      const item = await firebaseGalleryService.createItem(userId, {
        title: galleryUploadTitle.trim(),
        imageUrl,
        customerId,
        customerName,
        orderId,
      });
      onGalleryUpdated([item, ...gallery]);
      setGalleryUploadOpen(false);
      setGalleryUploadFile(null);
      if (galleryUploadPreview) URL.revokeObjectURL(galleryUploadPreview);
      setGalleryUploadPreview(null);
      setGalleryUploadTitle('');
    } catch (err) {
      console.error('Erro ao salvar arte na galeria:', err);
    } finally {
      setGalleryUploadSaving(false);
    }
  };

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-medium text-sm flex items-center gap-2 min-w-0">
          <Images className="size-4 shrink-0" />{' '}
          <span className="truncate">Artes de {customerName}</span>
          {!loading && gallery.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({gallery.length})</span>
          )}
        </h3>
        {canCreate && (
          <label className="cursor-pointer">
            <input
              ref={galleryInputRef}
              type="file"
              className="sr-only"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleGalleryFilePick(f);
                e.target.value = '';
              }}
            />
            <span className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors cursor-pointer">
              <Plus className="size-3.5" /> Adicionar arte
            </span>
          </label>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
          ))}
        </div>
      ) : gallery.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3 text-center">
          Nenhuma arte vinculada. Clique em "Adicionar arte" para enviar.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {gallery.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setGalleryLightbox(item)}
              className="group relative aspect-square rounded-md overflow-hidden border bg-muted"
            >
              <SafeImg
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ZoomIn className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Upload arte — mini dialog */}
      <Dialog open={galleryUploadOpen} onOpenChange={setGalleryUploadOpen}>
        <DialogContent size="sm" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border">
            <DialogTitle>Adicionar Arte</DialogTitle>
          </DialogHeader>
          <DialogBody className="p-4 sm:p-6 space-y-3">
            {galleryUploadPreview && (
              <SafeImg
                src={galleryUploadPreview}
                alt="preview"
                className="w-full max-h-44 object-contain rounded-lg border bg-muted/30"
              />
            )}
            <div className="space-y-1.5">
              <Label htmlFor="order-art-title" className="text-xs font-medium">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="order-art-title"
                value={galleryUploadTitle}
                onChange={(e) => setGalleryUploadTitle(e.target.value)}
                placeholder="Nome da arte"
                autoFocus
              />
            </div>
          </DialogBody>
          <DialogFooter className="p-4 sm:p-6 pt-3 border-t border-border flex items-center justify-end gap-2 bg-card">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGalleryUploadOpen(false)}
              disabled={galleryUploadSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGalleryUploadSave}
              disabled={galleryUploadSaving || !galleryUploadTitle.trim()}
            >
              {galleryUploadSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox da galeria */}
      {galleryLightbox && (
        <Dialog open={Boolean(galleryLightbox)} onOpenChange={(open) => !open && setGalleryLightbox(null)}>
          <DialogContent size="3xl" noPadding className="max-h-[90dvh] flex flex-col overflow-hidden bg-black/95 border-border/50 text-white">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 shrink-0">
              <DialogTitle className="text-sm font-semibold truncate text-white">
                {galleryLightbox.title}
              </DialogTitle>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 min-h-60 overflow-hidden">
              <SafeImg
                src={galleryLightbox.imageUrl}
                alt={galleryLightbox.title}
                className="max-w-full max-h-[75vh] object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
