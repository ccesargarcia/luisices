import React from 'react';
import { X, CheckCircle2, Sparkles, MessageCircle } from 'lucide-react';

export interface CatalogOrderSuccessModalProps {
  orderInfo: {
    orderCode: string;
    whatsappUrl: string;
  } | null;
  onClose: () => void;
  onClearAndFinish: () => void;
}

export function CatalogOrderSuccessModal({
  orderInfo,
  onClose,
  onClearAndFinish,
}: CatalogOrderSuccessModalProps) {
  if (!orderInfo) return null;

  return (
    <div 
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-[#1f191b] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200/80 dark:border-[#ebcdcd]/20 relative text-center space-y-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
          <CheckCircle2 size={36} />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--store-primary,#613d3e)]/10 dark:bg-[#f4b7b9]/15 text-[var(--store-primary,#613d3e)] dark:text-[#f4b7b9] font-mono font-bold text-xs">
            Pedido #{orderInfo.orderCode}
          </div>
          <h3 className="text-xl font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Pedido Enviado com Sucesso!
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
            Seu pedido foi registrado em nosso ateliê. Abra o WhatsApp para enviar a mensagem com os itens e continuar o atendimento.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-900/50 border border-stone-200/60 dark:border-stone-800 text-left space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
          <div className="flex items-center gap-2 font-semibold text-stone-800 dark:text-stone-200">
            <Sparkles size={14} className="text-amber-500" />
            <span>Próximos passos no WhatsApp:</span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Envie a mensagem no aplicativo e informe seu CEP para cálculo do frete e opções de pagamento (PIX ou Cartão).
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <a
            href={orderInfo.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-[var(--btn-radius)] bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>Reabrir WhatsApp</span>
          </a>

          <button
            onClick={onClearAndFinish}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Concluir e Limpar Sacola
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Continuar Comprando
          </button>
        </div>
      </div>
    </div>
  );
}
