import React, { useState } from 'react';
import { ArchiveItem, TenantQuota } from '../types';
import { 
  Sparkles, 
  Layers, 
  Scissors, 
  Palette, 
  FileText, 
  AlertCircle,
  FolderHeart,
  Crown,
  Lock,
  Coins,
  BrainCircuit
} from 'lucide-react';

interface GeneratorFormProps {
  archiveItems: ArchiveItem[];
  isLoading: boolean;
  onGenerate: (data: any) => void;
  quota: TenantQuota;
  onOpenPlans: () => void;
}

export const GeneratorForm: React.FC<GeneratorFormProps> = ({
  archiveItems,
  isLoading,
  onGenerate,
  quota,
  onOpenPlans,
}) => {
  const [theme, setTheme] = useState('Sereia Encantada');
  const [recipientName, setRecipientName] = useState('Clara');
  const [ageOrOccasion, setAgeOrOccasion] = useState('5 anos');
  const [category, setCategory] = useState<'infantil_3d' | 'floral_luxo' | 'shaker' | 'classico' | 'mesversario'>('infantil_3d');
  const [cakeColor, setCakeColor] = useState('Lilás pastel com toque menta');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>('arc-1');
  const [selectedPapers, setSelectedPapers] = useState<string[]>([
    'Colorplus Fosco 180g',
    'Lamicote Dourado 250g',
    'Fotográfico Matte 230g'
  ]);

  const paperOptions = [
    'Colorplus Fosco 180g',
    'Lamicote Dourado 250g',
    'Lamicote Prata 250g',
    'Lamicote Rosé Gold 250g',
    'Glitter Fino 220g',
    'Kraft Rústico 200g',
    'Acetato Transparente 20 Micras',
    'Fotográfico Matte 230g',
    'Papel Perolizado Marfim 180g'
  ];

  const handleTogglePaper = (paper: string) => {
    if (selectedPapers.includes(paper)) {
      setSelectedPapers(selectedPapers.filter(p => p !== paper));
    } else {
      setSelectedPapers([...selectedPapers, paper]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reference = archiveItems.find(item => item.id === selectedArchiveId);
    onGenerate({
      theme,
      recipientName,
      ageOrOccasion,
      category,
      cakeColor,
      preferredPapers: selectedPapers,
      referenceArchiveTitle: reference ? `${reference.title} (${reference.theme})` : undefined,
      catalogItems: archiveItems, // Envia o catálogo atualizado para injeção dinâmica no System Prompt
    });
  };

  return (
    <form 
      id="generator-form" 
      onSubmit={handleSubmit} 
      className="luisices-glass rounded-2xl p-6 sm:p-7 space-y-7 transition-all border border-[var(--glass-border)]"
    >
      {/* Step Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-sm shadow-xs">
            1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight">
                Parâmetros do Topo & Ocasião
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/20">
                <BrainCircuit className="w-3 h-3" />
                Gemini 3.8 Flash • Auto-Aprendizado
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              Camadas físicas calibradas para corte na Silhouette Portrait 3
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full luisices-chip text-xs text-[var(--primary)] font-medium">
          <Crown className="w-3.5 h-3.5" />
          <span>Ateliê Luisices</span>
        </div>
      </div>

      {/* Main inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div>
          <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            Tema do Pedido *
          </label>
          <input
            id="input-theme"
            type="text"
            required
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ex: Safari Baby, Sereia, Jardim"
            className="w-full px-4 py-2.5 rounded-xl luisices-glass-input text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition shadow-inner"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            Nome da Criança / Frase *
          </label>
          <input
            id="input-name"
            type="text"
            required
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Ex: Theo, Helena, 15 Anos"
            className="w-full px-4 py-2.5 rounded-xl luisices-glass-input text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition shadow-inner"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
            Idade ou Complemento
          </label>
          <input
            id="input-age"
            type="text"
            value={ageOrOccasion}
            onChange={(e) => setAgeOrOccasion(e.target.value)}
            placeholder="Ex: 1 aninho, 5 anos, Parabéns"
            className="w-full px-4 py-2.5 rounded-xl luisices-glass-input text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition shadow-inner"
          />
        </div>
      </div>

      {/* Categoria / Estilo */}
      <div>
        <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2.5">
          Estilo de Montagem / Arquitetura do Topo
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'infantil_3d', label: 'Infantil 3D', icon: Layers, desc: 'Relevo 3 a 4 camadas' },
            { id: 'floral_luxo', label: 'Floral Luxo', icon: Sparkles, desc: 'Flores & Lamicote' },
            { id: 'shaker', label: 'Shaker', icon: Scissors, desc: 'Acetato + Miçangas' },
            { id: 'classico', label: 'Clássico / Minimal', icon: FileText, desc: 'Linhas nobres' },
            { id: 'mesversario', label: 'Mesversário', icon: Palette, desc: 'Delicado e prático' },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                id={`cat-${cat.id}`}
                onClick={() => setCategory(cat.id as any)}
                className={`p-3.5 rounded-xl text-left transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md ring-2 ring-[var(--primary)]/50 scale-[1.02]' 
                    : 'luisices-chip text-[var(--foreground)] hover:border-[var(--primary)]/40'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--primary-foreground)]' : 'text-[var(--primary)]'}`} />
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary-foreground)]" />}
                </div>
                <div>
                  <div className="font-bold text-xs leading-tight">{cat.label}</div>
                  <div className={`text-[10px] mt-0.5 leading-tight ${isSelected ? 'opacity-85' : 'text-[var(--muted-foreground)]'}`}>
                    {cat.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Referência do Acervo Real Luisices */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <FolderHeart className="w-4 h-4 text-[var(--primary)]" />
            <label className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Referência do Acervo ({archiveItems.length} Modelos Ensinados à IA)
            </label>
          </div>
          <span className="text-[11px] text-[var(--muted-foreground)]">A IA replica a técnica e proporção do modelo selecionado</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {archiveItems.map((item) => {
            const isSelected = selectedArchiveId === item.id;
            return (
              <div
                key={item.id}
                id={`archive-select-${item.id}`}
                onClick={() => setSelectedArchiveId(item.id)}
                className={`cursor-pointer rounded-xl p-2.5 transition-all flex gap-3 items-center ${
                  isSelected
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] ring-2 ring-[var(--primary)]/60 shadow-sm'
                    : 'luisices-chip text-[var(--foreground)] hover:border-[var(--primary)]/40'
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-lg object-cover border border-black/10 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{item.title}</div>
                  <div className={`text-[10px] truncate ${isSelected ? 'opacity-90' : 'text-[var(--muted-foreground)]'}`}>
                    {item.theme}
                  </div>
                  <div className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-[var(--primary-foreground)]' : 'text-[var(--primary)]'}`}>
                    {item.layersCount} camadas • {item.papers[0]?.split(' ')[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Insumos / Papéis */}
      <div>
        <label className="block text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2.5">
          Insumos & Papéis no Estoque do Ateliê
        </label>
        <div className="flex flex-wrap gap-2">
          {paperOptions.map((paper) => {
            const active = selectedPapers.includes(paper);
            return (
              <button
                key={paper}
                type="button"
                id={`paper-tag-${paper.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => handleTogglePaper(paper)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                    : 'luisices-chip text-[var(--foreground)] hover:border-[var(--primary)]/40'
                }`}
              >
                {paper}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions & Quota Guard */}
      <div className="pt-3 flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border)] gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-[var(--primary)]" />
            <span>Plotter Silhouette Portrait 3</span>
          </div>

          <span className="hidden sm:inline text-[var(--border)]">•</span>

          {/* Indicador de Saldo de IA */}
          <button
            type="button"
            onClick={onOpenPlans}
            className="flex items-center gap-1 text-[var(--primary)] font-bold hover:underline"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>
              Saldo: {quota.aiGenerationsLimit - quota.aiGenerationsUsed} fichas restantes
            </span>
          </button>
        </div>

        {quota.aiGenerationsUsed >= quota.aiGenerationsLimit ? (
          <button
            type="button"
            id="btn-limit-reached-upgrade"
            onClick={onOpenPlans}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
          >
            <Lock className="w-4 h-4" />
            <span>Limite Mensal Atingido • Ver Planos</span>
          </button>
        ) : (
          <button
            id="btn-generate-concept"
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando com Gemini 3.8 Flash...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar Ficha & Mockup 3D</span>
              </>
            )}
          </button>
        )}
      </div>
    </form>
  );
};
