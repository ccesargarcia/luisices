import React from 'react';
import { Star, Heart, Eye, Sparkles } from 'lucide-react';
import { StoreProduct } from '../../types/store';

interface ProductCardProps {
  product: StoreProduct;
  onSelectSample: (product: StoreProduct) => void;
  onPersonalize: (product: StoreProduct) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelectSample,
  onPersonalize,
  isFavorite = false,
  onToggleFavorite,
}) => {
  return (
    <article className="group rounded-2xl bg-white/70 backdrop-blur-md border border-white/80 p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:border-[var(--primary)]/40">
      <div className="space-y-3">
        {/* Visual Cover */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-stone-100">
          <img
            src={product.mainImage}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />

          {/* Badges / Chips */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 max-w-[80%]">
            {product.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-[var(--primary)] font-bold text-[9px] sm:text-[10px] border border-black/5 shadow-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Favorite Toggle Button */}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(product.id)}
              className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/80 hover:bg-white text-[var(--primary)] shadow-xs transition-all active:scale-90"
              aria-label="Salvar nos favoritos"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite ? 'fill-red-500 text-red-500' : 'text-[var(--primary)]'
                }`}
              />
            </button>
          )}
        </div>

        {/* Text Content */}
        <div className="space-y-1.5">
          {/* Ratings */}
          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
              {product.rating.toFixed(1)} ({product.reviewsCount} avaliações)
            </span>
          </div>

          <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--primary)] leading-snug group-hover:text-[var(--primary-hover)] transition-colors line-clamp-1">
            {product.title}
          </h3>

          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </div>
      </div>

      {/* Pricing & Actions Row */}
      <div className="pt-3.5 mt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] text-[var(--muted-foreground)] block">A partir de</span>
          <span className="text-base sm:text-lg font-bold text-[var(--primary)]">
            R$ {product.basePrice.toFixed(2)}{' '}
            <span className="text-[10px] font-normal text-[var(--muted-foreground)]">
              /{product.unitLabel}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectSample(product)}
            className="px-3 py-2 rounded-xl border border-[var(--border)] text-[var(--primary)] font-bold text-xs hover:bg-[var(--accent)]/30 transition-colors active:scale-95 flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ver Amostra</span>
          </button>

          <button
            type="button"
            onClick={() => onPersonalize(product)}
            className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs hover:bg-[var(--primary-hover)] shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personalizar</span>
          </button>
        </div>
      </div>
    </article>
  );
};
