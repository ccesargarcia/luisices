import React, { useState } from 'react';
import { GalleryItem } from '../../types';
import { Skeleton } from '../ui/skeleton';
import { ImageOff, User, ZoomIn } from 'lucide-react';
import { cn } from '../ui/utils';

interface GalleryCardProps {
  item: GalleryItem;
  onClick: () => void;
}

export function GalleryCard({ item, onClick }: GalleryCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg overflow-hidden border bg-card shadow-sm hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="relative aspect-square bg-muted overflow-hidden">
        {!loaded && !imageError && <Skeleton className="absolute inset-0" />}
        {imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted px-4 text-center text-muted-foreground">
            <ImageOff className="size-8" />
            <span className="text-xs">Imagem indisponível</span>
          </div>
        ) : (
          <img
            src={item.imageUrl}
            alt={item.title}
            onLoad={() => setLoaded(true)}
            onError={() => {
              setImageError(true);
              setLoaded(false);
            }}
            className={cn(
              'w-full h-full object-cover transition-transform duration-200 group-hover:scale-105',
              !loaded && 'opacity-0'
            )}
          />
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <ZoomIn className="size-7 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
      <div className="px-2.5 py-2 space-y-0.5">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.customerName && (
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <User className="size-3" /> {item.customerName}
          </p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {item.tags.slice(0, 3).map((t) => (
              <span
                key={t.name}
                style={{ backgroundColor: t.color }}
                className="text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full"
              >
                {t.name}
              </span>
            ))}
            {item.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{item.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
