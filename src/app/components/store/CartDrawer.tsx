import React from 'react';
import { X, ShoppingBag, Trash2, ArrowRight, Sparkles, MessageCircle, ShieldCheck } from 'lucide-react';
import { StoreProduct } from '../../types/store';

interface CartItem {
  product: StoreProduct;
  quantity: number;
  selectedFinishes: Record<string, string>;
  totalPrice: number;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (index: number) => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const totalAmount = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const deposit50 = totalAmount * 0.5;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--background)] h-full p-6 shadow-2xl flex flex-col justify-between border-l border-[var(--border)] overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="font-serif font-bold text-lg text-[var(--foreground)]">
                Sacola de Orçamentos ({cartItems.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/5 text-[var(--muted-foreground)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/40 text-[var(--primary)] flex items-center justify-center mx-auto">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <p className="font-serif font-bold text-base text-[var(--foreground)]">Sua sacola está vazia</p>
              <p className="text-xs text-[var(--muted-foreground)] max-w-xs mx-auto">
                Explore nossas coleções autorais e personalize os topos e convites do seu evento.
              </p>
            </div>
          ) : (
            <div className="space-y-3 divide-y divide-[var(--border)] max-h-[58vh] overflow-y-auto pr-1">
              {cartItems.map((item, idx) => (
                <div key={idx} className="pt-3 flex gap-3 items-start justify-between">
                  <img
                    src={item.product.mainImage}
                    alt={item.product.title}
                    className="w-16 h-16 rounded-xl object-cover border border-black/5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <h4 className="font-bold text-xs text-[var(--foreground)] truncate">
                      {item.product.title}
                    </h4>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Qtd: <strong>{item.quantity} {item.product.unitLabel}</strong>
                    </p>
                    <div className="text-xs font-bold text-[var(--primary)]">
                      R$ {item.totalPrice.toFixed(2)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(idx)}
                    className="text-stone-400 hover:text-red-500 p-1 rounded transition"
                    title="Remover item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="pt-4 border-t border-[var(--border)] space-y-4">
            <div className="p-3.5 rounded-2xl bg-white/80 border border-[var(--border)] space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-[var(--foreground)]">
                <span>Total Estimado:</span>
                <span className="text-base text-[var(--primary)]">R$ {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-[var(--muted-foreground)]">
                <span>Sinal para Reserva (50%):</span>
                <strong>R$ {deposit50.toFixed(2)}</strong>
              </div>
              <div className="text-[10px] text-emerald-700 flex items-center gap-1 pt-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Restante pago apenas após você aprovar a prova.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="w-full py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Avançar para Personalização &amp; Reserva</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
