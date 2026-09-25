import React from 'react';
import { MapPin, Heart, ShieldCheck, Mail, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="pt-12 pb-8 border-t border-[var(--border)] text-[var(--muted-foreground)] space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="space-y-3">
          <p className="font-serif text-2xl font-bold text-[var(--primary)]">Luisices</p>
          <p className="text-xs leading-relaxed">
            Papelaria de afeto, identidade visual refinada e detalhes manuais que tornam cada celebração eterna.
          </p>
        </div>

        <div className="space-y-2.5 text-xs">
          <p className="font-serif font-bold text-sm text-[var(--primary)]">Coleções &amp; Linhas</p>
          <ul className="space-y-1.5 font-medium">
            <li><a href="#catalogo" className="hover:text-[var(--primary)] transition-colors">Convites Finos &amp; Botânicos</a></li>
            <li><a href="#catalogo" className="hover:text-[var(--primary)] transition-colors">Caixas Rígidas para Padrinhos</a></li>
            <li><a href="#catalogo" className="hover:text-[var(--primary)] transition-colors">Topos de Bolo 3D Silhouette</a></li>
            <li><a href="#catalogo" className="hover:text-[var(--primary)] transition-colors">Selos em Cera Nobre &amp; Fitas</a></li>
          </ul>
        </div>

        <div className="space-y-2.5 text-xs">
          <p className="font-serif font-bold text-sm text-[var(--primary)]">Ajuda &amp; Contato</p>
          <ul className="space-y-1.5 font-medium">
            <li><a href="#diferenciais" className="hover:text-[var(--primary)] transition-colors">Como Solicitar Prova Física</a></li>
            <li><a href="#consultoria" className="hover:text-[var(--primary)] transition-colors">Prazos &amp; Envio para todo o Brasil</a></li>
            <li><a href="#consultoria" className="hover:text-[var(--primary)] transition-colors">Falar com a Artesã</a></li>
          </ul>
        </div>

        <div className="space-y-2.5 text-xs">
          <p className="font-serif font-bold text-sm text-[var(--primary)]">Ateliê Físico</p>
          <p className="text-xs leading-relaxed">
            Atendimento com hora marcada para noivas, mães e debutantes em nosso showroom.
          </p>
          <p className="text-xs font-semibold text-[var(--primary)] flex items-center gap-1.5 pt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>São Paulo, Brasil</span>
          </p>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
        <p>© {new Date().getFullYear()} Luisices Papelaria Artesanal. Todos os direitos reservados.</p>
        <p className="flex items-center gap-1 text-[11px]">
          Feito à mão com <Heart className="w-3 h-3 text-red-500 fill-current" /> &amp; elegância.
        </p>
      </div>
    </footer>
  );
};
