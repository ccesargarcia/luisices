import React, { useState } from 'react';
import { Search, ShoppingBag, Sparkles, X, ArrowRight, MessageCircle } from 'lucide-react';
import { StoreProduct } from '../../types/store';

interface NavbarProps {
  cartItems: Array<{ product: StoreProduct; quantity: number; selectedFinishes: Record<string, string>; totalPrice: number }>;
  onOpenCart: () => void;
  onSearch: (term: string) => void;
  searchTerm: string;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItems,
  onOpenCart,
  onSearch,
  searchTerm,
  onNavigateSection,
}) => {
  const [showSearchInput, setShowSearchInput] = useState(false);
  const totalItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-4 sm:px-8 py-3 luisices-glass border-b border-[var(--glass-border)] shadow-xs transition-all duration-200">
      <div className="flex items-center gap-3 sm:gap-6">
        {/* Search Toggle */}
        <div className="relative flex items-center">
          {showSearchInput ? (
            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar topos, convites, caixas..."
                className="px-3.5 py-1.5 rounded-xl luisices-glass-input text-xs text-[var(--foreground)] w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 shadow-inner"
              />
              <button
                type="button"
                onClick={() => {
                  setShowSearchInput(false);
                  onSearch('');
                }}
                className="p-1.5 rounded-full hover:bg-black/5 text-[var(--muted-foreground)]"
                title="Fechar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSearchInput(true)}
              className="p-2 rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-95 transition-all"
              aria-label="Buscar produtos e coleções"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-xs font-bold tracking-wide text-[var(--muted-foreground)]">
          <button
            onClick={() => onNavigateSection('hero')}
            className="hover:text-[var(--primary)] transition-colors"
          >
            Início
          </button>
          <button
            onClick={() => onNavigateSection('catalogo')}
            className="hover:text-[var(--primary)] transition-colors"
          >
            Coleções Autorais
          </button>
          <button
            onClick={() => onNavigateSection('diferenciais')}
            className="hover:text-[var(--primary)] transition-colors"
          >
            O Ateliê
          </button>
          <button
            onClick={() => onNavigateSection('consultoria')}
            className="hover:text-[var(--primary)] transition-colors"
          >
            Consultoria WhatsApp
          </button>
        </nav>
      </div>

      {/* Editorial Brand Headline */}
      <div className="text-center select-none cursor-pointer" onClick={() => onNavigateSection('hero')}>
        <span className="font-serif font-bold text-xl sm:text-2xl text-[var(--primary)] tracking-tight hover:opacity-90 transition-opacity">
          Luisices
        </span>
        <span className="block text-[9px] uppercase tracking-[0.25em] text-[var(--muted-foreground)] font-semibold -mt-0.5">
          Papelaria de Afeto
        </span>
      </div>

      {/* Trailing Actions / Bag */}
      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="https://wa.me/5511999999999?text=Ol%C3%A1%20Luisices!%20Gostaria%20de%20tirar%20d%C3%BAvidas%20sobre%20encomendas."
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full luisices-chip text-xs font-semibold text-[var(--foreground)] hover:border-[var(--primary)] transition"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Falar com a Artesã</span>
        </a>

        <button
          type="button"
          onClick={onOpenCart}
          className="relative p-2 rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 active:scale-95 transition-all"
          aria-label="Sacola de Orçamento"
        >
          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
          {totalItemsCount > 0 && (
            <span className="absolute top-1 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-[9px] shadow-sm animate-pulse">
              {totalItemsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
