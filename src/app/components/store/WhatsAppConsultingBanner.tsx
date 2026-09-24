import React from 'react';
import { MessageCircle, Clock, Sparkles, UserCheck } from 'lucide-react';

export const WhatsAppConsultingBanner: React.FC = () => {
  const handleOpenWhatsApp = () => {
    const text = `Olá ateliê Luisices! Sonhei com um projeto personalizado para minha festa/evento e gostaria de conversar sobre paletas de cores, convites e topos de bolo!`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section id="consultoria" className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[var(--primary)] via-[#4E3031] to-[var(--primary)] text-white p-6 sm:p-10 lg:p-12 shadow-xl">
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <span className="px-3.5 py-1 rounded-full bg-white/15 text-white text-[10px] font-bold tracking-widest uppercase inline-flex items-center gap-1.5 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            Criação Sob Medida &amp; Autoral
          </span>

          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-white leading-tight">
            Sonhou com algo exclusivo? Vamos desenhar juntos.
          </h2>

          <p className="text-xs sm:text-sm text-white/90 max-w-xl leading-relaxed">
            Converse diretamente com nossa artesã via WhatsApp. Elaboramos paletas de cores, monogramas autorais, tipos de lamicote e amostras digitais personalizadas sem custo inicial.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="inline-flex items-center gap-2.5 bg-white text-[var(--primary)] hover:bg-[#FFF8F7] px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Iniciar Conversa no WhatsApp</span>
            </button>

            <span className="text-xs text-white/80 flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Tempo médio de resposta: 15 minutos
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 flex justify-center lg:justify-end">
          <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center max-w-xs space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-inner">
              <UserCheck className="w-7 h-7" />
            </div>
            <p className="font-serif font-bold text-base text-white">Consultoria Gratuita</p>
            <p className="text-xs text-white/80 leading-relaxed">
              Orientação completa sobre gramaturas de papéis, cores de fita e quantidade ideal para o seu evento.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
