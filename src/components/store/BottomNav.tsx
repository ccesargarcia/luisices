import React from 'react';
import { Sparkles, Grid, MessageCircle, ShoppingBag } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  cartCount: number;
  onOpenCart: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  cartCount,
  onOpenCart,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2.5 luisices-glass border-t border-[var(--glass-border)] shadow-lg backdrop-blur-md">
      {/* Item 1: Início */}
      <button
        type="button"
        onClick={() => onSelectTab('hero')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
          activeTab === 'hero'
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
            : 'text-[var(--muted-foreground)] hover:text-[var(--primary)]'
        }`}
      >
        <Sparkles className="w-4 h-4 mb-0.5" />
        <span>Início</span>
      </button>

      {/* Item 2: Coleções */}
      <button
        type="button"
        onClick={() => onSelectTab('catalogo')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
          activeTab === 'catalogo'
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
            : 'text-[var(--muted-foreground)] hover:text-[var(--primary)]'
        }`}
      >
        <Grid className="w-4 h-4 mb-0.5" />
        <span>Coleções</span>
      </button>

      {/* Item 3: Atendimento WhatsApp */}
      <button
        type="button"
        onClick={() => onSelectTab('consultoria')}
        className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl text-[10px] font-bold transition-all active:scale-95 ${
          activeTab === 'consultoria'
            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
            : 'text-[var(--muted-foreground)] hover:text-[var(--primary)]'
        }`}
      >
        <MessageCircle className="w-4 h-4 mb-0.5" />
        <span>Atendimento</span>
      </button>

      {/* Item 4: Sacola / Orçamento */}
      <button
        type="button"
        onClick={onOpenCart}
        className="relative flex flex-col items-center justify-center px-3 py-1 rounded-xl text-[10px] font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] active:scale-95 transition-all"
      >
        <ShoppingBag className="w-4 h-4 mb-0.5" />
        <span>Sacola</span>
        {cartCount > 0 && (
          <span className="absolute top-0 right-3.5 h-3.5 w-3.5 rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center text-[8px] font-bold">
            {cartCount}
          </span>
        )}
      </button>
    </nav>
  );
};
