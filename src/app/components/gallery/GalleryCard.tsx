import React, { useState } from 'react';
import { GalleryItem } from '../../types';
import { Skeleton } from '../ui/skeleton';
import { ImageOff, User, ZoomIn, Sparkles, CheckSquare, Square, Share2, Copy } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../ui/utils';
import { toast } from 'sonner';

interface GalleryCardProps {
  item: GalleryItem;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  isMasonry?: boolean;
}

export function GalleryCard({
  item,
  onClick,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  isMasonry,
}: GalleryCardProps) {
  const { hasPermission, isAdmin } = useAuth();
  const canUseAi = isAdmin || hasPermission((p) => Boolean(p?.aiCopilot));
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleShareWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = encodeURIComponent(
      `Confira esta arte do nosso catálogo: *${item.title}* ✨\n${item.imageUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.imageUrl) {
      navigator.clipboard.writeText(item.imageUrl);
      toast.success('Link da arte copiado!');
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={isSelectionMode ? onToggleSelection : onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isSelectionMode) onToggleSelection?.();
          else onClick();
        }
      }}
      className={cn(
        'group relative w-full rounded-2xl overflow-hidden luisices-glass border border-white/60 dark:border-white/10 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left cursor-pointer flex flex-col focus:outline-hidden focus:ring-2 focus:ring-primary/40 select-none',
        isMasonry && 'break-inside-avoid mb-3.5',
        isSelectionMode && isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
    >
      {/* Container da Foto com Suporte a Proporção Normal ou Quadrada */}
      <div
        className={cn(
          'relative overflow-hidden bg-muted/30',
          isMasonry ? 'min-h-[140px] max-h-[380px]' : 'aspect-square'
        )}
      >
        {!loaded && !imageError && <Skeleton className="absolute inset-0" />}

        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/60 px-4 text-center text-muted-foreground min-h-[160px]">
            <ImageOff className="size-8 opacity-60" />
            <span className="text-xs font-medium">Imagem indisponível</span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => {
              setImageError(true);
              setLoaded(false);
            }}
            className={cn(
              'w-full h-full object-cover transition-transform duration-500 group-hover:scale-106',
              !loaded && 'opacity-0'
            )}
          />
        )}

        {/* Gradiente sutil inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Checkbox de Seleção em Modo Múltiplo */}
        {isSelectionMode && (
          <div
            className="absolute top-2 left-2 z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onToggleSelection}
              aria-label="Selecionar arte"
              className={cn(
                'size-7 rounded-lg flex items-center justify-center transition-transform active:scale-90 shadow-md backdrop-blur-md cursor-pointer',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-black/50 text-white border border-white/30 hover:bg-black/70'
              )}
            >
              {isSelected ? (
                <CheckSquare className="size-4" />
              ) : (
                <Square className="size-4 opacity-80" />
              )}
            </button>
          </div>
        )}

        {/* Selo IA de Visão Computacional */}
        {canUseAi && item.aiDescription && !isSelectionMode && (
          <div className="absolute top-2 right-2 z-10 bg-amber-500/25 border border-amber-400/40 backdrop-blur-md text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs pointer-events-none">
            <Sparkles className="size-2.5 text-amber-300 animate-pulse" />
            <span>IA</span>
          </div>
        )}

        {/* Tipo de Produto (se detectado) */}
        {item.productType && !isSelectionMode && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-black/60 text-white/95 backdrop-blur-md border border-white/20 shadow-xs uppercase tracking-wider">
              {item.productType}
            </span>
          </div>
        )}

        {/* Barra de Ações Rápidas no Hover */}
        {!isSelectionMode && (
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copiar link da arte"
              aria-label="Copiar link da arte"
              className="size-7 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xs"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              title="Compartilhar no WhatsApp"
              aria-label="Compartilhar no WhatsApp"
              className="size-7 rounded-full bg-emerald-600/80 hover:bg-emerald-600 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-xs"
            >
              <Share2 className="size-3.5" />
            </button>
            <div className="size-7 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xs">
              <ZoomIn className="size-3.5" />
            </div>
          </div>
        )}
      </div>

      {/* Dados e Metadados do Card */}
      <div className="p-3 space-y-1.5 bg-card/85 backdrop-blur-md flex-1 flex flex-col justify-between">
        <div className="space-y-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
            {item.title}
          </h3>

          {item.customerName && (
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5 pt-0.5">
              <User className="size-3 shrink-0 text-primary" />
              <span className="truncate">{item.customerName}</span>
            </p>
          )}
        </div>

        {/* Tags temáticas */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {item.tags.slice(0, 3).map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium luisices-chip leading-none border"
                style={{
                  backgroundColor: `${t.color}15`,
                  borderColor: `${t.color}35`,
                  color: t.color,
                }}
              >
                #{t.name}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[9px] text-muted-foreground self-center">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
