import React from 'react';
import { Printer, Scissors, Sparkles, CheckCircle2, HeartHandshake } from 'lucide-react';

export const BrandDifferentials: React.FC = () => {
  return (
    <section id="diferenciais" className="rounded-3xl bg-gradient-to-br from-[#FFF8F7] to-[#F5E5E4]/90 border border-white/80 p-6 sm:p-10 lg:p-12 shadow-sm space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[10px] sm:text-xs font-bold text-[var(--primary)] uppercase tracking-widest">
          Compromisso com a Excelência
        </span>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--primary)]">
          O Cuidado de um Ateliê de Afeto
        </h2>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] leading-relaxed">
          Entendemos o valor emocional de cada celebração. Nosso processo foi lapidado para garantir serenidade, precisão e encantamento absoluto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Diferencial 1 */}
        <div className="p-6 rounded-2xl bg-white/80 border border-white backdrop-blur-xs space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/50 text-[var(--primary)] flex items-center justify-center shadow-xs">
            <Printer className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--primary)]">
            Prova Física &amp; Amostra Real
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Você recebe uma amostra completa em mãos para aprovar cores, textura do papel e acabamentos antes de iniciarmos toda a tiragem.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--primary)] font-bold pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Garantia de Fidelidade</span>
          </div>
        </div>

        {/* Diferencial 2 */}
        <div className="p-6 rounded-2xl bg-white/80 border border-white backdrop-blur-xs space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[#ffdada] text-[var(--primary)] flex items-center justify-center shadow-xs">
            <Scissors className="w-6 h-6" />
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--primary)]">
            Manufatura Silhouette &amp; Manual
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Cortes milimétricos com tecnologia Silhouette Portrait 3 conjugados a vincos, dobras e laços confeccionados manualmente por artesãs.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--primary)] font-bold pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Acabamento Primoroso</span>
          </div>
        </div>

        {/* Diferencial 3 */}
        <div className="p-6 rounded-2xl bg-white/80 border border-white backdrop-blur-xs space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <div className="w-12 h-12 rounded-2xl bg-[var(--secondary)]/20 text-[var(--secondary)] flex items-center justify-center shadow-xs">
            <Sparkles className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--primary)]">
            Aroma Autoral Exclusivo
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Experiência multissensorial: cada caixa viaja perfumada com essência autoral suave de baunilha francesa e lavanda campestre ao ser aberta.
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--primary)] font-bold pt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Memória Olfativa</span>
          </div>
        </div>
      </div>
    </section>
  );
};
