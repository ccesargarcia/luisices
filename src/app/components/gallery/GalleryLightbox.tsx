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
          size="4xl"
          noPadding
          hideClose
          className="max-h-[95dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header bar */}
          <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 border-b bg-card shrink-0">
            <DialogTitle className="text-sm sm:text-base font-semibold truncate flex-1 pr-2">
              {item.title}
            </DialogTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 sm:size-9 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                onClick={() => setConfirmDelete(true)}
                title="Excluir arte"
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 sm:size-9 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={onClose}
                title="Fechar"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Main content: Responsive side-by-side on desktop, vertical scroll on mobile */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden bg-background">
            {/* Image area */}
            <div className="relative flex-1 flex items-center justify-center bg-black/95 min-h-56 md:min-h-0 shrink-0 md:shrink overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="max-w-full max-h-[45vh] md:max-h-[75vh] w-auto h-auto object-contain select-none transition-transform"
                loading="lazy"
              />
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    disabled={idx === 0}
                    aria-label="Imagem anterior"
                    className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full size-9 sm:size-10 flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shadow-md"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={idx === items.length - 1}
                    aria-label="Próxima imagem"
                    className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full size-9 sm:size-10 flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shadow-md"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-white/90 bg-black/70 backdrop-blur-xs px-2.5 py-0.5 rounded-full font-mono">
                    {idx + 1} / {items.length}
                  </span>
                </>
              )}
            </div>

            {/* Info panel */}
            <div className="md:w-72 lg:w-80 px-4 py-4 space-y-3.5 overflow-y-auto border-t md:border-t-0 md:border-l border-border bg-card text-sm shrink-0">
              {item.productType && (
                <div>
                  <Badge variant="outline" className="text-xs bg-muted/60 text-muted-foreground">
                    {item.productType}
                  </Badge>
                </div>
              )}

              {item.description && (
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{item.description}</p>
              )}

              {/* Análise Inteligente de Visão IA */}
              {item.aiDescription && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    <Sparkles className="size-3.5 shrink-0" />
                    <span>Visão Computacional IA</span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">{item.aiDescription}</p>
                  {item.colors && item.colors.length > 0 && (
                    <div className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-foreground/80">Cores:</span>
                      {item.colors.map(c => (
                        <span key={c} className="px-1.5 py-0.5 bg-background border rounded text-[10px]">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {item.customerName && (
                <div className="flex items-center gap-2 text-xs sm:text-sm">
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
                      className="text-[11px] px-2 py-0.5"
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}

              <Button
                variant={item.aiDescription ? "outline" : "default"}
                size="sm"
                className="w-full gap-1.5 text-xs font-medium cursor-pointer"
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

              <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatDate(item.createdAt)}</span>
                <a href={item.imageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground inline-flex items-center gap-1 font-medium">
                  <ZoomIn className="size-3" /> Abrir original
                </a>
              </div>
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
