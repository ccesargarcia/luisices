import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal, Check, ArrowUpDown, LayoutGrid, List } from 'lucide-react';

export interface CategoryItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }> | string;
  count?: number;
}

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  customCategories?: CategoryItem[];
  totalProductsCount?: number;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  customCategories,
  totalProductsCount = 34,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const defaultCategories: CategoryItem[] = [
    { id: 'todos', label: 'Ver todas as criações', count: totalProductsCount },
    { id: 'planners_diarios', label: 'Planners & Diários', count: 22 },
    { id: 'cadernos_artesanais', label: 'Cadernos Artesanais', count: 18 },
    { id: 'caixas_cartonagem', label: 'Caixas Rígidas & Cartonagem', count: 25 },
    { id: 'papelaria_corporativa', label: 'Papelaria Corporativa', count: 15 },
    { id: 'mimos_presentes', label: 'Mimos & Presentes', count: 12 },
    { id: 'casamentos', label: 'Casamentos & Noivados', count: 18 },
    { id: 'topos_3d', label: 'Topos de Bolo 3D', count: 14 },
    { id: 'maternidade', label: 'Batizados & Maternidade', count: 10 },
    { id: 'debutantes', label: '15 Anos & Debutantes', count: 8 },
  ];

  const categories = customCategories || defaultCategories;

  const currentCategoryLabel = categories.find(c => c.id === selectedCategory)?.label || 'Planners & Diários';
  const currentCount = categories.find(c => c.id === selectedCategory)?.count || totalProductsCount;

  return (
    <section className="relative z-30">
      {/* 3. BARRA DE METADADOS & DROPDOWN INTEGRADO (Conceito 3) */}
      <div className="h-12 px-3.5 sm:px-4 rounded-2xl bg-white/80 dark:bg-[#1a1719]/90 backdrop-blur-xl border border-[var(--glass-border)] flex items-center justify-between text-xs text-[var(--muted-foreground)] shadow-sm">
        
        <!-- Left: Metadata Text with Interactive Dropdown Trigger -->
        <div className="flex items-center gap-1.5 font-medium flex-wrap">
          <span>Mostrando <strong className="text-[var(--foreground)] font-bold">{currentCount} criações</strong> em</span>
          
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--primary)]/15 hover:bg-[var(--primary)]/25 text-[var(--primary)] font-serif italic font-bold text-xs border border-[var(--primary)]/30 transition active:scale-95 cursor-pointer"
          >
            <span>{currentCategoryLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <!-- Right: Sort and View Controls -->
        <div className="flex items-center gap-1.5">
          <button 
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition cursor-pointer"
            title="Ordenar Coleção"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center bg-black/5 dark:bg-white/10 p-0.5 rounded-lg border border-[var(--glass-border)]">
            <button 
              type="button"
              className="p-1 rounded-md bg-[var(--primary)] text-white shadow-xs"
              title="Grade de Produtos"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button"
              className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              title="Lista de Produtos"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* FLOATING DROPDOWN POPOVER (Conceito 3 Popover) */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-14 mt-1 p-4 rounded-2xl bg-[#1e1a1c]/95 dark:bg-[#1a1618]/95 backdrop-blur-2xl border border-[var(--primary)]/40 shadow-2xl z-50 text-white space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#d39a9c]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#d39a9c]">
                COLEÇÕES DO ATELIER
              </span>
            </div>
            
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-[#d39a9c]/40 text-[#d39a9c] font-bold bg-[#d39a9c]/10">
              {totalProductsCount} Peças Ativas
            </span>
          </div>

          {/* Popover Subhead */}
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50 pt-1">
            COLEÇÕES &amp; CADERNOS
          </div>

          {/* Categories List */}
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl transition text-xs font-medium cursor-pointer ${
                    isActive 
                      ? 'bg-[#d39a9c]/20 text-white border border-[#d39a9c]/40 shadow-sm'
                      : 'hover:bg-white/5 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#d39a9c] shadow-sm' : 'bg-transparent border border-white/40'}`} />
                    <span>{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold ${isActive ? 'text-[#d39a9c]' : 'text-white/50'}`}>
                      {cat.count || 12}
                    </span>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#d39a9c]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Popover Footer Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button 
              type="button"
              onClick={() => {
                onSelectCategory('todos');
                setIsOpen(false);
              }}
              className="text-xs text-white/70 hover:text-[#d39a9c] font-medium transition cursor-pointer"
            >
              Ver todas as {totalProductsCount} peças →
            </button>

            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl border border-[#d39a9c] text-[#d39a9c] hover:bg-[#d39a9c] hover:text-[#161214] font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
            >
              APLICAR FILTRO
            </button>
          </div>

        </div>
      )}
    </section>
  );
};
