import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export interface CatalogBannerItem {
  id: string;
  imageUrl: string;
  title?: string;
  linkUrl?: string;
}

/**
 * Sanitiza URLs de banners para prevenir injeção de scripts (ex: javascript:)
 */
function sanitizeBannerLink(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
}

interface BannerCarouselProps {
  banners: CatalogBannerItem[];
  intervalSeconds?: number;
  autoPlay?: boolean;
  aspectRatioClass?: string;
  roundedClass?: string;
  className?: string;
  showControls?: boolean;
  storeName?: string;
}

export function BannerCarousel({
  banners,
  intervalSeconds = 5,
  autoPlay = true,
  aspectRatioClass = 'aspect-[3.2/1] sm:aspect-[4/1] md:aspect-[4.5/1]',
  roundedClass = 'rounded-2xl sm:rounded-3xl',
  className = '',
  showControls = true,
  storeName = 'Ateliê',
}: BannerCarouselProps) {
  const validBanners = banners.filter((b) => Boolean(b && b.imageUrl));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Garantir índice válido se a lista de banners mudar
  useEffect(() => {
    if (currentIndex >= validBanners.length) {
      setCurrentIndex(0);
    }
  }, [validBanners.length, currentIndex]);

  const goToNext = useCallback(() => {
    if (validBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validBanners.length);
  }, [validBanners.length]);

  const goToPrev = useCallback(() => {
    if (validBanners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validBanners.length) % validBanners.length);
  }, [validBanners.length]);

  // Transição automática estilo propaganda (autoplay com pausa ao interagir)
  useEffect(() => {
    if (!autoPlay || isPaused || validBanners.length <= 1) return;

    const intervalMs = Math.max(2, intervalSeconds) * 1000;
    const timer = setInterval(() => {
      goToNext();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoPlay, isPaused, validBanners.length, intervalSeconds, goToNext]);

  // Gestos de toque (swipe) em dispositivos móveis
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartXRef.current || !touchEndXRef.current) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    if (distance > 45) {
      goToNext(); // Swipe esquerda -> próximo
    } else if (distance < -45) {
      goToPrev(); // Swipe direita -> anterior
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  if (validBanners.length === 0) {
    return null;
  }

  // Caso tenha apenas 1 banner: exibição estática limpa
  if (validBanners.length === 1) {
    const single = validBanners[0];
    const content = (
      <div className={`relative w-full ${aspectRatioClass} ${roundedClass} overflow-hidden shadow-sm bg-gradient-to-r from-[#fceee9] via-[#f7d6d0] to-[#ede7f6] dark:from-[#2a1a1f] dark:via-[#3d2429] dark:to-[#1d1624] ${className}`}>
        <img
          src={single.imageUrl}
          alt={single.title || `Banner de capa de ${storeName}`}
          className="w-full h-full object-cover"
        />
        {single.title && (
          <div className="absolute bottom-2 left-3 bg-black/50 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg">
            {single.title}
          </div>
        )}
      </div>
    );

    const safeSingleLink = sanitizeBannerLink(single.linkUrl);
    if (safeSingleLink) {
      return (
        <a
          href={safeSingleLink}
          target={safeSingleLink.startsWith('http') ? '_blank' : '_self'}
          rel="noopener noreferrer"
          className="block group cursor-pointer transition-transform duration-200 active:scale-[0.99]"
        >
          {content}
        </a>
      );
    }
    return content;
  }

  // Múltiplos banners: Carrossel com transição suave e controles
  return (
    <div
      className={`relative w-full select-none group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label={`Banners em destaque de ${storeName}`}
    >
      <div
        className={`relative w-full ${aspectRatioClass} ${roundedClass} overflow-hidden shadow-sm bg-gradient-to-r from-[#fceee9] via-[#f7d6d0] to-[#ede7f6] dark:from-[#2a1a1f] dark:via-[#3d2429] dark:to-[#1d1624]`}
      >
        {validBanners.map((banner, idx) => {
          const isActive = idx === currentIndex;
          const safeBannerLink = sanitizeBannerLink(banner.linkUrl);
          const slideContent = (
            <div
              key={banner.id || `banner-${idx}`}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={banner.imageUrl}
                alt={banner.title || `Banner ${idx + 1} de ${storeName}`}
                className="w-full h-full object-cover object-center"
              />

              {/* Título ou Link indicador */}
              {(banner.title || safeBannerLink) && (
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-20 flex items-center gap-2">
                  {banner.title && (
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] sm:text-xs font-semibold shadow-xs">
                      {banner.title}
                    </span>
                  )}
                  {safeBannerLink && (
                    <span className="p-1 rounded-lg bg-white/85 text-stone-900 shadow-xs hidden sm:inline-flex items-center">
                      <ExternalLink size={12} />
                    </span>
                  )}
                </div>
              )}
            </div>
          );

          if (safeBannerLink) {
            return (
              <a
                key={banner.id || `banner-${idx}`}
                href={safeBannerLink}
                target={safeBannerLink.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                className="block"
                tabIndex={isActive ? 0 : -1}
              >
                {slideContent}
              </a>
            );
          }

          return slideContent;
        })}

        {/* Botão Anterior */}
        {showControls && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-md opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95"
            aria-label="Banner anterior"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {/* Botão Próximo */}
        {showControls && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 z-20 p-1.5 sm:p-2 rounded-full bg-black/35 hover:bg-black/60 text-white backdrop-blur-md opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-md hover:scale-105 active:scale-95"
            aria-label="Próximo banner"
          >
            <ChevronRight size={18} />
          </button>
        )}

        {/* Indicadores de posição (Dots / Pílulas animadas na base) */}
        {showControls && validBanners.length > 1 && (
          <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md">
            {validBanners.map((_, dotIdx) => {
              const isActive = dotIdx === currentIndex;
              return (
                <button
                  key={`dot-${dotIdx}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentIndex(dotIdx);
                  }}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    isActive
                      ? 'w-5 sm:w-6 h-1.5 sm:h-2 bg-white shadow-xs'
                      : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/45 hover:bg-white/80'
                  }`}
                  aria-label={`Ir para o banner ${dotIdx + 1}`}
                  aria-current={isActive ? 'true' : 'false'}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
