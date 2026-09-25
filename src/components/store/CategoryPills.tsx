import React, { useRef } from 'react';
import { Sparkles, Heart, Gift, Crown, Layers, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export interface CategoryItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | string;
}

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  customCategories?: CategoryItem[];
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  customCategories,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const defaultCategories: CategoryItem[] = [
    { id: 'todos', label: 'Todas as Coleções', icon: Sparkles },
    { id: 'casamentos', label: 'Casamentos & Noivados', icon: Heart },
    { id: 'topos_3d', label: 'Topos de Bolo 3D', icon: Layers },
    { id: 'maternidade', label: 'Batizados & Maternidade', icon: Gift },
    { id: 'debutantes', label: '15 Anos & Debutantes', icon: Crown },
    { id: 'corporativo', label: 'Kits Corporativos de Luxo', icon: Calendar },
  ];

  const categories = customCategories || defaultCategories;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -220 : 220;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-base sm:text-lg font-bold text-[var(--primary)] flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>Categorias &amp; Coleções</span>
        </h2>
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline-block mr-1">
            Deslize para navegar
          </span>
          <button
            type="button"
            onClick={() => handleScroll('left')}
            className="p-1 rounded-full border border-[var(--glass-border)] bg-white/60 dark:bg-white/10 hover:bg-[var(--primary)] hover:text-white transition text-[var(--foreground)] hidden sm:flex items-center justify-center cursor-pointer"
            aria-label="Rolar para esquerda"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleScroll('right')}
            className="p-1 rounded-full border border-[var(--glass-border)] bg-white/60 dark:bg-white/10 hover:bg-[var(--primary)] hover:text-white transition text-[var(--foreground)] hidden sm:flex items-center justify-center cursor-pointer"
            aria-label="Rolar para direita"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Single-row horizontal scroll container with edge fade */}
      <div className="relative group">
        {/* Right fade indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--background)] to-transparent pointer-events-none z-10" />

        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar scroll-smooth flex-nowrap"
        >
          {categories.map((cat) => {
            const Icon = typeof cat.icon === 'function' || (typeof cat.icon === 'object' && cat.icon !== null) ? cat.icon : null;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap shadow-xs cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md'
                    : 'bg-white/70 dark:bg-white/10 text-[var(--foreground)] border-[var(--glass-border)] hover:bg-white hover:border-[var(--primary)]/40'
                }`}
              >
                {Icon ? (
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[var(--primary)]'}`} />
                ) : typeof cat.icon === 'string' ? (
                  <span className="text-xs">{cat.icon}</span>
                ) : null}
                <span className="whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

