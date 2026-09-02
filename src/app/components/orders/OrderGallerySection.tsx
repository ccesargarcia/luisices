import React, { useRef, useState } from 'react';
import { GalleryItem } from '../../types';
import { SafeImg } from '../SafeMedia';
import { Images, Plus, ZoomIn, X } from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';

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
      {galleryUploadOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setGalleryUploadOpen(false)}
        >
          <div
            className="bg-background rounded-lg shadow-xl p-5 w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Adicionar Arte</h4>
              <button type="button" onClick={() => setGalleryUploadOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            {galleryUploadPreview && (
              <SafeImg
                src={galleryUploadPreview}
                alt="preview"
                className="w-full max-h-40 object-contain rounded border"
              />
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Título <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={galleryUploadTitle}
                onChange={(e) => setGalleryUploadTitle(e.target.value)}
                placeholder="Nome da arte"
                autoFocus
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 border rounded-md py-1.5 text-sm hover:bg-muted transition-colors"
                onClick={() => setGalleryUploadOpen(false)}
                disabled={galleryUploadSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="flex-1 bg-primary text-primary-foreground rounded-md py-1.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={handleGalleryUploadSave}
                disabled={galleryUploadSaving || !galleryUploadTitle.trim()}
              >
                {galleryUploadSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox da galeria */}
      {galleryLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setGalleryLightbox(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-8 right-0 text-white/80 hover:text-white"
              onClick={() => setGalleryLightbox(null)}
            >
              <X className="size-5" />
            </button>
            <SafeImg
              src={galleryLightbox.imageUrl}
              alt={galleryLightbox.title}
              className="w-full max-h-[80vh] object-contain rounded-lg"
            />
            <p className="text-white/90 text-sm mt-2 text-center">{galleryLightbox.title}</p>
          </div>
        </div>
      )}
    </div>
  );
}
