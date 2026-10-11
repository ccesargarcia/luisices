import React from 'react';
import { X, Tag, Clock, ShoppingBag, MessageCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { FormattedDescription } from '../FormattedDescription';
import {
  normalizePhoneForWhatsApp,
  generateProductInquiryWhatsAppMessage,
} from '../../utils/whatsapp';
import type { CatalogProduct } from '../../pages/PublicCatalog';

export interface CatalogProductPreviewModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
  previewCustomName: string;
  setPreviewCustomName: (name: string) => void;
  businessInfo: {
    name: string;
    whatsapp?: string;
    [key: string]: any;
  };
  enableOnlineOrders: boolean;
  onAddToCart: (product: CatalogProduct, customName?: string) => void;
}

export function CatalogProductPreviewModal({
  product,
  onClose,
  previewCustomName,
  setPreviewCustomName,
  businessInfo,
  enableOnlineOrders,
  onAddToCart,
}: CatalogProductPreviewModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      {/* Backdrop clicável para fechar no mobile e desktop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      <div className="relative z-10 w-full sm:max-w-2xl md:max-w-3xl h-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col md:flex-row rounded-t-3xl sm:rounded-3xl bg-[#fff8f7] dark:bg-[#1f191b] border border-white/45 dark:border-[#ebcdcd]/20 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        
        {/* Coluna Esquerda (Desktop): Imagem */}
        <div className="relative h-40 sm:h-auto md:w-1/2 bg-stone-100 dark:bg-stone-900 overflow-hidden shrink-0">
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80';
            }}
            className="w-full h-full object-cover"
            decoding="async"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-xs transition-colors cursor-pointer z-10"
            aria-label="Fechar prévia"
          >
            <X size={18} />
          </button>
          {product.badge && (
            <span className="absolute bottom-3 left-3 px-3 py-1 rounded-md text-xs font-bold bg-[var(--store-primary,#613d3e)]/90 text-white backdrop-blur-sm">
              {product.badge}
            </span>
          )}
        </div>

        {/* Coluna Direita (Desktop): Detalhes, Customização e Adição */}
        <div className="p-4 sm:p-6 flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
          <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1 overscroll-contain">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[var(--store-primary,#613d3e)]/10 dark:bg-[#f4b7b9]/15 text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9] border border-[var(--store-primary,#613d3e)]/20 dark:border-[#f4b7b9]/20 mb-1">
                  <Tag size={11} className="shrink-0" />
                  <span>{product.category || 'Geral'}</span>
                </span>
                <h3 className="text-base sm:text-xl font-extrabold text-[#221a1a] dark:text-[#e8e0e3] leading-snug">
                  {product.name}
                </h3>
              </div>
              <span className="text-base sm:text-xl font-extrabold text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9] tabular-nums shrink-0">
                {formatCurrency(product.price)}
              </span>
            </div>

            <div className="text-xs sm:text-sm text-[#504444] dark:text-[#c9c0b8] leading-relaxed">
              <FormattedDescription text={product.description} />
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
              <Clock size={14} className="shrink-0" />
              <span>Prazo de confecção: <strong>{product.leadTimeDays > 0 ? `até ${product.leadTimeDays} dias úteis` : 'Pronta entrega'}</strong></span>
            </div>

            {/* Campo de Personalização */}
            {product.isCustomizable && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-[#221a1a] dark:text-[#e8e0e3]">
                  Nome ou tema para personalização:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome da criança, idade ou tema desejado"
                  value={previewCustomName}
                  onChange={(e) => setPreviewCustomName(e.target.value)}
                  className="w-full px-3.5 py-2 text-base sm:text-xs rounded-xl bg-white dark:bg-[#161214] border border-stone-300 dark:border-stone-700 text-[#221a1a] dark:text-[#e8e0e3] focus:outline-none focus:ring-2 focus:ring-[var(--store-primary,#613d3e)]/30"
                />
                <p className="text-[10px] text-stone-400">
                  Você também poderá combinar mais detalhes da arte depois no WhatsApp.
                </p>
              </div>
            )}
          </div>

          {/* Ação de Adicionar ou Consulta direta via WhatsApp */}
          <div className="pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-0 border-t border-stone-200/50 dark:border-stone-800 shrink-0 bg-[#fff8f7] dark:bg-[#1f191b] space-y-2">
            {enableOnlineOrders ? (
              <>
                <button
                  onClick={() => onAddToCart(product, previewCustomName)}
                  className="w-full py-3.5 px-4 rounded-[var(--btn-radius)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] hover:opacity-95 active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  <ShoppingBag size={16} />
                  <span>Adicionar à Sacola</span>
                </button>

                {businessInfo.whatsapp && (
                  <a
                    href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp)}?text=${encodeURIComponent(
                      generateProductInquiryWhatsAppMessage({
                        businessName: businessInfo.name,
                        productName: product.name,
                        price: product.price,
                        category: product.category,
                        leadTimeDays: product.leadTimeDays,
                        customName: previewCustomName,
                      })
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 active:scale-98 transition-all cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    <span>Tirar dúvidas deste item no WhatsApp</span>
                  </a>
                )}
              </>
            ) : (
              <a
                href={`https://wa.me/${normalizePhoneForWhatsApp(businessInfo.whatsapp || '')}?text=${encodeURIComponent(
                  generateProductInquiryWhatsAppMessage({
                    businessName: businessInfo.name,
                    productName: product.name,
                    price: product.price,
                    category: product.category,
                    leadTimeDays: product.leadTimeDays,
                    customName: previewCustomName,
                  })
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white transition-all shadow-md cursor-pointer"
              >
                <MessageCircle size={16} />
                <span>Consultar no WhatsApp</span>
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
