import React from 'react';
import { MessageCircle } from 'lucide-react';
import {
  normalizePhoneForWhatsApp,
  generateBespokeConsultationWhatsAppMessage,
} from '../../utils/whatsapp';

export interface CatalogFloatingWhatsAppProps {
  businessInfo: {
    showFloatingWhatsApp?: boolean;
    whatsapp?: string;
    floatingWhatsAppText?: string;
    name: string;
  };
}

export function CatalogFloatingWhatsApp({ businessInfo }: CatalogFloatingWhatsAppProps) {
  if (!businessInfo.showFloatingWhatsApp || !businessInfo.whatsapp) {
    return null;
  }

  const cleanPhone = normalizePhoneForWhatsApp(businessInfo.whatsapp);
  const consultationMsg = generateBespokeConsultationWhatsAppMessage({
    businessName: businessInfo.name,
    notes: 'Olá! Estou navegando pelo Catálogo Online e gostaria de tirar algumas dúvidas.',
  });

  return (
    <aside aria-label="Atendimento WhatsApp" className="fixed bottom-6 right-6 z-40 flex items-center gap-2 group">
      {businessInfo.floatingWhatsAppText && (
        <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-white dark:bg-[#1f191b] border border-stone-200/80 dark:border-[#ebcdcd]/20 shadow-lg text-xs font-semibold text-stone-800 dark:text-stone-200 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span>{businessInfo.floatingWhatsAppText}</span>
        </div>
      )}
      <a
        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(consultationMsg)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative size-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-white/60 dark:ring-[#161214]/60"
        title={businessInfo.floatingWhatsAppText || 'Fale Conosco no WhatsApp'}
        aria-label="Atendimento direto no WhatsApp"
      >
        <MessageCircle size={28} className="fill-white/20" />
        <span className="absolute top-1 right-1 size-3.5 bg-emerald-300 rounded-full border-2 border-white dark:border-[#161214] animate-ping" />
      </a>
    </aside>
  );
}
