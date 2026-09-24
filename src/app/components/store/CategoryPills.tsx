import React from 'react';
import { Sparkles, Heart, Gift, Crown, Layers, Calendar } from 'lucide-react';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  const categories = [
    { id: 'todos', label: 'Todas as Coleções', icon: Sparkles },
    { id: 'casamentos', label: 'Casamentos & Noivados', icon: Heart },
    { id: 'topos_3d', label: 'Topos de Bolo 3D', icon: Layers },
    { id: 'maternidade', label: 'Batizados & Maternidade', icon: Gift },
    { id: 'debutantes', label: '15 Anos & Debutantes', icon: Crown },
    { id: 'corporativo', label: 'Kits Corporativos de Luxo', icon: Calendar },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg sm:text-xl font-bold text-[var(--primary)]">
          Categorias em Destaque
        </h2>
        <span className="text-[11px] text-[var(--muted-foreground)] hidden sm:inline-block">
          Deslize para navegar pelas linhas
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 custom-scroll -mx-2 px-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold transition-all duration-200 active:scale-95 shadow-xs ${
                isSelected
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-md'
                  : 'bg-white/70 text-[var(--foreground)] border-[var(--glass-border)] hover:bg-[var(--accent)]/40 hover:border-[var(--primary)]/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--primary-foreground)]' : 'text-[var(--primary)]'}`} />
              <span className="whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
