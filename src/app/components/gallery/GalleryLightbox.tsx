import React, { useState, useEffect, useCallback } from 'react';
import { GalleryItem } from '../../types';
import {
  Dialog,
  DialogContent,
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
  ZoomOut,
  User,
  Sparkles,
  Loader2,
  Share2,
  Copy,
  ExternalLink,
  Calendar,
  Layers,
} from 'lucide-react';
import { firebaseGalleryService } from '../../../services/firebaseGalleryService';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
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
  const [isZoomed, setIsZoomed] = useState(false);
  const { hasPermission, isAdmin } = useAuth();
  const canUseAi = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));
  const canDelete = isAdmin || hasPermission((p) => p.gallery?.delete ?? false);
  const item = items[idx];

  // Reset zoom when navigating images
  useEffect(() => {
    setIsZoomed(false);
  }, [idx]);

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
              color: ['#613D3E', '#8C7BA6', '#C89D4B', '#5E8271', '#D9777F'][i % 5],
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

  const handleShareWhatsApp = () => {
    if (!item) return;
    const text = encodeURIComponent(
      `Confira a arte do nosso catálogo: *${item.title}* ✨\n${item.imageUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = () => {
    if (!item?.imageUrl) return;
    navigator.clipboard.writeText(item.imageUrl);
    toast.success('Link da arte copiado!');
  };

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
          size="5xl"
          noPadding
          hideClose
          className="max-h-[96dvh] sm:max-h-[92dvh] flex flex-col overflow-hidden luisices-glass border border-white/40 dark:border-white/10 shadow-2xl rounded-2xl sm:rounded-3xl"
        >
          {/* Header bar com Acabamento Glassmorphism */}
          <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-border/60 bg-card/90 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <Layers className="size-4" />
              </div>
              <DialogTitle className="text-xs sm:text-base font-bold truncate text-foreground leading-tight">
                {item.title}
              </DialogTitle>
              {item.productType && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-primary/10 text-primary border-primary/20 hidden md:inline-flex shrink-0 font-medium"
                >
                  {item.productType}
                </Badge>
              )}
            </div>

            {/* Ações do Header */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-8 px-2 sm:px-2.5 text-xs gap-1.5 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer rounded-lg"
                title="Compartilhar pelo WhatsApp"
              >
                <Share2 className="size-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
                title="Copiar link da foto"
              >
                <Copy className="size-3.5" />
              </Button>

              <a
                href={item.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground inline-flex items-center justify-center hover:bg-muted/60 transition-colors"
                title="Abrir imagem original em nova aba"
              >
                <ExternalLink className="size-3.5" />
              </a>

              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-lg"
                  onClick={() => setConfirmDelete(true)}
                  title="Excluir arte da galeria"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg ml-1"
                onClick={onClose}
                title="Fechar visualizador"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Área Principal: Foto à esquerda / Painel à direita */}
          <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden bg-background">
            {/* Foto Estúdio com Zoom e Navegação */}
            <div className="relative flex-1 flex items-center justify-center bg-black/95 min-h-64 sm:min-h-80 md:min-h-0 shrink-0 md:shrink overflow-hidden select-none">
              <div
                className={cn(
                  'relative max-w-full max-h-[50vh] md:max-h-[75vh] flex items-center justify-center transition-transform duration-300',
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'
                )}
                onClick={() => setIsZoomed((prev) => !prev)}
                title={isZoomed ? 'Clique para reduzir o zoom' : 'Clique para dar zoom e inspecionar detalhes'}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="max-w-full max-h-[50vh] md:max-h-[75vh] w-auto h-auto object-contain select-none"
                  loading="lazy"
                />
              </div>

              {/* Botão Flutuante de Zoom */}
              <button
                type="button"
                onClick={() => setIsZoomed((prev) => !prev)}
                className="absolute bottom-3 right-3 z-10 size-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer border border-white/20 shadow-md"
                title={isZoomed ? 'Reduzir zoom' : 'Ampliar foto'}
              >
                {isZoomed ? <ZoomOut className="size-4" /> : <ZoomIn className="size-4" />}
              </button>

              {/* Controles de Navegação Anterior/Próximo */}
              {items.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prev}
                    disabled={idx === 0}
                    aria-label="Imagem anterior"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white rounded-full size-9 sm:size-11 flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shadow-lg border border-white/10 active:scale-95"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={next}
                    disabled={idx === items.length - 1}
                    aria-label="Próxima imagem"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white rounded-full size-9 sm:size-11 flex items-center justify-center disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer shadow-lg border border-white/10 active:scale-95"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] text-white/90 bg-black/70 backdrop-blur-md px-3 py-0.5 rounded-full font-mono border border-white/15">
                    {idx + 1} de {items.length}
                  </span>
                </>
              )}
            </div>

            {/* Painel Lateral com Ficha de Acabamento & IA */}
            <div className="md:w-80 lg:w-96 p-4 sm:p-5 space-y-4 overflow-y-auto border-t md:border-t-0 md:border-l border-border/70 bg-card/85 backdrop-blur-xl text-sm shrink-0 custom-scrollbar">
              {/* Título & Descrição */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Detalhes da Peça
                </span>
                <h3 className="text-base font-bold text-foreground leading-snug">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap pt-0.5">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Informações do Cliente */}
              {item.customerName && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Cliente Associado
                  </span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <User className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{item.customerName}</span>
                  </div>
                </div>
              )}

              {/* Ficha Inteligente de Visão Computacional IA */}
              {canUseAi && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                      <Sparkles className="size-3.5 shrink-0" />
                      <span>Visão Computacional IA</span>
                    </div>
                    {item.aiAnalyzedAt && (
                      <span className="text-[9px] text-amber-600/80 font-mono">
                        Catalogado
                      </span>
                    )}
                  </div>

                  {item.aiDescription ? (
                    <p className="text-xs text-foreground/90 leading-relaxed">
                      {item.aiDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Use a IA para catalogar automaticamente insumos, cores e descrição da peça.
                    </p>
                  )}

                  {/* Cores Detectadas como Bolinhas de Paleta */}
                  {item.colors && item.colors.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-amber-500/15">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Paleta de Cores da Peça:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.colors.map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-background border border-border/80 shadow-2xs"
                          >
                            <span className="size-2.5 rounded-full bg-primary/40 shrink-0" />
                            <span>{c}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botão para enriquecer com IA */}
                  <Button
                    variant={item.aiDescription ? 'outline' : 'default'}
                    size="sm"
                    className="w-full gap-1.5 text-xs font-medium cursor-pointer rounded-lg mt-1"
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
                </div>
              )}

              {/* Tags temáticas */}
              {item.tags && item.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Tags & Insumos
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.tags.map((t) => (
                      <span
                        key={t.name}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold luisices-chip leading-none border"
                        style={{
                          backgroundColor: `${t.color}15`,
                          borderColor: `${t.color}35`,
                          color: t.color,
                        }}
                      >
                        #{t.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Data de Registro */}
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arte da galeria?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a arte do portfólio do ateliê. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
              onClick={() => {
                setConfirmDelete(false);
                onDelete(item);
                onClose();
              }}
            >
              Remover Arte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
