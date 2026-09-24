import React from 'react';
import { Sparkles, ArrowRight, Calendar, Heart, ShieldCheck, Star } from 'lucide-react';
import { StoreProduct } from '../../types/store';

interface HeroSectionProps {
  featuredProduct: StoreProduct;
  onExploreCatalog: () => void;
  onScheduleConsulting: () => void;
  onPersonalizeFeatured: (product: StoreProduct) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredProduct,
  onExploreCatalog,
  onScheduleConsulting,
  onPersonalizeFeatured,
}) => {
  return (
    <section id="hero" className="relative mt-2 sm:mt-4 rounded-3xl overflow-hidden shadow-lg border border-white/60 bg-gradient-to-br from-[#FFF0F0]/90 via-[#FFF8F7]/60 to-[#F5E5E4]/80 backdrop-blur-md p-6 sm:p-10 lg:p-14 transition-all">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Editorial Copy */}
        <div className="lg:col-span-7 space-y-5 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent)]/50 border border-[var(--secondary)]/25 text-[var(--primary)] shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold">
              Coleção Autoral de Afeto 2025
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold text-[var(--primary)] leading-[1.15] tracking-tight">
            Onde cada detalhe celebra uma história única.
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-[var(--muted-foreground)] leading-relaxed max-w-xl">
            Papelaria fina em algodão prensado 300g, cortes de precisão milimétrica na Silhouette Portrait 3, topos de bolo 3D estruturados, selos em cera nobre e fitas de seda desfiadas à mão para marcar os momentos mais inesquecíveis da sua vida.
          </p>

          {/* Action CTA Group */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onExploreCatalog}
              className="inline-flex items-center justify-center gap-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-md shadow-[var(--primary)]/20"
            >
              <span>Explorar Coleções</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onScheduleConsulting}
              className="inline-flex items-center justify-center gap-2 bg-white/80 hover:bg-white text-[var(--primary)] px-5 py-3.5 rounded-xl font-bold text-xs border border-[var(--border)] backdrop-blur-xs transition-all duration-200 active:scale-95"
            >
              <Calendar className="w-4 h-4 text-[var(--primary)]" />
              <span>Agendar Consultoria</span>
            </button>
          </div>

          {/* Micro Highlights */}
          <div className="pt-6 border-t border-[var(--border)] grid grid-cols-3 gap-3 text-left">
            <div>
              <p className="font-serif text-xl sm:text-2xl text-[var(--primary)] font-bold">100%</p>
              <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Artesanal & Sob Medida</p>
            </div>
            <div>
              <p className="font-serif text-xl sm:text-2xl text-[var(--primary)] font-bold">+1.8k</p>
              <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Noivas & Debutantes</p>
            </div>
            <div>
              <p className="font-serif text-xl sm:text-2xl text-[var(--primary)] font-bold">Aroma</p>
              <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)] font-medium">Essência de Baunilha</p>
            </div>
          </div>
        </div>

        {/* Right Hero Visual Collage */}
        <div className="lg:col-span-5 relative flex justify-center">
          <div className="relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/90 group">
            <img
              src={featuredProduct.mainImage}
              alt={featuredProduct.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--primary)]/70 via-transparent to-transparent opacity-70" />

            {/* Glass Float Floating Badge */}
            <div className="absolute bottom-4 left-4 right-4 p-3.5 bg-white/90 backdrop-blur-md rounded-xl border border-white/70 shadow-lg flex items-center justify-between">
              <div>
                <p className="font-bold text-xs text-[var(--primary)]">{featuredProduct.title}</p>
                <p className="text-[10px] text-[var(--muted-foreground)]">Papel Algodão 300g &amp; Lacre Botânico</p>
              </div>
              <button
                type="button"
                onClick={() => onPersonalizeFeatured(featuredProduct)}
                className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-[10px] font-bold uppercase tracking-wider hover:bg-[var(--primary-hover)] transition active:scale-95 shadow-xs"
              >
                Personalizar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
