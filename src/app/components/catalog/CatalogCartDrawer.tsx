import React from 'react';
import { ShoppingBag, X, Trash2, Minus, Plus, Percent, AlertCircle, Send } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import type { CartItem } from '../../pages/PublicCatalog';

export interface CatalogCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onUpdateCustomName: (id: string, name: string) => void;
  customerNotes: string;
  onUpdateCustomerNotes: (notes: string) => void;
  businessInfo: {
    pixDiscountText?: string;
    minOrderAmount?: number;
    [key: string]: any;
  };
  subtotal: number;
  submittingOrder: boolean;
  onSendToWhatsApp: () => void;
}

export function CatalogCartDrawer({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateCustomName,
  customerNotes,
  onUpdateCustomerNotes,
  businessInfo,
  subtotal,
  submittingOrder,
  onSendToWhatsApp,
}: CatalogCartDrawerProps) {
  if (!isOpen) return null;

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-drawer flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
      {/* Backdrop clicável no mobile e desktop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Container da Gaveta (Full-height slide-over no desktop, bottom sheet no mobile) */}
      <div className="relative z-10 w-full sm:max-w-md h-[88vh] sm:h-full max-h-[90vh] sm:max-h-none flex flex-col rounded-t-3xl sm:rounded-none sm:rounded-l-3xl bg-[#fff8f7] dark:bg-[#1f191b] border-t sm:border-t-0 sm:border-l border-stone-200/80 dark:border-stone-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-right duration-200">
        
        {/* Header do Carrinho */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-stone-200/60 dark:border-[#ebcdcd]/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--store-primary,#613d3e)]/10 dark:bg-[#f4b7b9]/15 text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9]">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#221a1a] dark:text-[#e8e0e3]">
                Sacola de Encomendas
              </h3>
              <span className="text-[11px] text-stone-400 font-medium">
                {totalItemsCount} {totalItemsCount === 1 ? 'item adicionado' : 'itens adicionados'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 cursor-pointer"
            aria-label="Fechar sacola"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Itens Adicionados */}
        <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-3 overscroll-contain">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-stone-400 space-y-2">
              <ShoppingBag size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">Sua sacola está vazia.</p>
              <p className="text-xs">Explore o catálogo e adicione os mimos que deseja encomendar.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white/80 dark:bg-[#261f22] border border-stone-200/70 dark:border-[#ebcdcd]/10 space-y-2.5 shadow-2xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="size-12 rounded-xl object-cover border border-white/60 shrink-0"
                      decoding="async"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[#221a1a] dark:text-[#e8e0e3] truncate" title={item.product.name}>
                        {item.product.name}
                      </h4>
                      <span className="text-xs font-bold text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9] tabular-nums">
                        {formatCurrency(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    title="Remover item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Campo editável para nome/personalização */}
                {item.product.isCustomizable && (
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                      Personalização / Nome:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Nome da criança ou tema"
                      value={item.customName || ''}
                      onChange={(e) => onUpdateCustomName(item.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-base sm:text-xs rounded-lg bg-white dark:bg-[#161214] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[var(--store-primary,#613d3e)]"
                    />
                  </div>
                )}

                {/* Controle de Quantidade */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-[10px] text-stone-400">
                    {item.product.leadTimeDays > 0 ? `Prazo: ${item.product.leadTimeDays} dias úteis` : 'Pronta entrega'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#161214] rounded-lg p-0.5 border border-stone-200 dark:border-stone-700">
                    <button
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold px-2 tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Observações Gerais / Data do Evento */}
          {cart.length > 0 && (
            <div className="pt-2 space-y-1">
              <label className="block text-xs font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                Observações ou data do seu evento:
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Preciso receber até dia 20 para o aniversário..."
                value={customerNotes}
                onChange={(e) => onUpdateCustomerNotes(e.target.value)}
                className="w-full p-2.5 text-base sm:text-xs rounded-xl bg-white dark:bg-[#261f22] border border-stone-200 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-1 focus:ring-[var(--store-primary,#613d3e)]"
              />
            </div>
          )}
        </div>

        {/* Footer do Carrinho com Envio WhatsApp */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white/95 dark:bg-[#161214]/95 border-t border-stone-200/80 dark:border-stone-800 space-y-3 shrink-0">
            {/* Desconto PIX no Carrinho */}
            {businessInfo.pixDiscountText && (
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                <Percent size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{businessInfo.pixDiscountText}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-sm font-bold">
              <span>Subtotal Estimado:</span>
              <span className="text-lg text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9] tabular-nums font-extrabold">
                {formatCurrency(subtotal)}
              </span>
            </div>

            {/* Validação de Valor Mínimo de Pedido */}
            {Boolean(businessInfo.minOrderAmount && Number(businessInfo.minOrderAmount) > 0 && subtotal < Number(businessInfo.minOrderAmount)) && (
              <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-medium">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Pedido mínimo de <strong>{formatCurrency(Number(businessInfo.minOrderAmount))}</strong>. Adicione mais <strong>{formatCurrency(Number(businessInfo.minOrderAmount) - subtotal)}</strong> para finalizar.
                </span>
              </div>
            )}

            <button
              onClick={onSendToWhatsApp}
              disabled={submittingOrder || Boolean(businessInfo.minOrderAmount && Number(businessInfo.minOrderAmount) > 0 && subtotal < Number(businessInfo.minOrderAmount))}
              className="w-full py-3.5 px-4 rounded-[var(--btn-radius)] bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submittingOrder ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Registrando e abrindo WhatsApp...</span>
                </>
              ) : (
                <>
                  <Send size={15} />
                  <span>Confirmar & Enviar Pedido no WhatsApp</span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
