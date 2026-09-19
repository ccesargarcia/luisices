import React, { useState, useEffect, useCallback } from 'react';
import { GalleryItem } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  User,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { toast } from 'sonner';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface GalleryLightboxProps {
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (item: GalleryItem) => void;
  onItemUpdated?: (item: GalleryItem) => void;
}

export function GalleryLightbox({
  items,
  initialIndex,
  onClose,
  onDelete,
  onItemUpdated,
}: GalleryLightboxProps) {
  const [idx, setIdx] = useState(initialIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const item = items[idx];

  const handleEnrichAi = async () => {
    if (!item?.id || analyzingAi) return;
    setAnalyzingAi(true);
    try {
      const res = await firebaseGalleryService.enrichItemWithAi(item.id);
      toast.success('Arte catalogada e descrita com IA!');
      const updated: GalleryItem = {
        ...item,
        aiDescription: res.aiDescription,
        productType: res.productType,
        colors: res.colors,
        aiTags: res.suggestedTags,
        tags: (item.tags && item.tags.length > 0)
          ? item.tags
          : (res.suggestedTags || []).map((t, i) => ({
              id: `tag-${i}`,
              name: t,
              color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5],
            })),
        aiAnalyzedAt: new Date().toISOString(),
      };
      if (onItemUpdated) {
        onItemUpdated(updated);
      }
    } catch (err: any) {
      console.error('[handleEnrichAi] Erro:', err);
      toast.error(err.message || 'Erro ao analisar com IA.');
    } finally {
      setAnalyzingAi(false);
    }
  };

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setIdx((i) => Math.min(items.length - 1, i + 1)),
    [items.length]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  if (!item) return null;

  return (
    <>
      <Dialog
        open
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent
          className="w-full max-w-full sm:max-w-4xl max-h-[95vh] p-0 overflow-hidden flex flex-col"
          hideClose
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <DialogTitle className="text-base font-semibold truncate flex-1">
              {item.title}
            </DialogTitle>
            <div className="flex items-center gap-2 ml-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Image area */}
            <div className="relative flex-1 flex items-center justify-center bg-black/90 min-h-48">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-w-full max-h-[60vh] md:max-h-[80vh] object-contain"
                loading="lazy"
              />
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    disabled={idx === 0}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/70"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={idx === items.length - 1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 disabled:opacity-20 hover:bg-black/70"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                    {idx + 1} / {items.length}
                  </span>
                </>
              )}
            </div>

            {/* Info panel */}
            <div className="md:w-64 px-4 py-4 space-y-3 overflow-y-auto border-l bg-card text-sm shrink-0">
              {item.productType && (
                <div>
                  <Badge variant="outline" className="text-xs bg-muted/60 text-muted-foreground">
                    {item.productType}
                  </Badge>
                </div>
              )}

              {item.description && (
                <p className="text-muted-foreground">{item.description}</p>
              )}

              {/* Análise Inteligente de Visão IA */}
              {item.aiDescription && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Sparkles className="size-3.5" />
                    <span>Visão Computacional IA</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{item.aiDescription}</p>
                  {item.colors && item.colors.length > 0 && (
                    <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-foreground/80">Cores:</span>
                      {item.colors.map(c => (
                        <span key={c} className="px-1.5 py-0.2 bg-background border rounded text-[10px]">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {item.customerName && (
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{item.customerName}</span>
                </div>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <Badge
                      key={t.name}
                      style={{ backgroundColor: t.color, color: '#fff' }}
                      className="text-xs"
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                variant={item.aiDescription ? "outline" : "default"}
                size="sm"
                className="w-full gap-1.5 text-xs font-medium"
                onClick={handleEnrichAi}
                disabled={analyzingAi}
              >
                {analyzingAi ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Analisando foto com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>{item.aiDescription ? 'Reanalisar com IA' : 'Catalogar com IA ✨'}</span>
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
              <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-1">
                  <ZoomIn className="size-3" /> Abrir original
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arte?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDelete(false);
                onDelete(item);
                onClose();
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
