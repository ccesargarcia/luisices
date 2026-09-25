import React, { useState } from 'react';
import { ArchiveItem } from '../types';
import { 
  Plus, 
  FolderHeart, 
  Trash2, 
  Scissors, 
  Info, 
  Upload, 
  Sparkles, 
  BrainCircuit, 
  Layers, 
  CheckCircle2, 
  Eye, 
  Wand2,
  RefreshCw
} from 'lucide-react';
import { compressImageToWebP } from '../utils/imageOptimizer';

interface ArchiveManagerProps {
  archiveItems: ArchiveItem[];
  onAddArchiveItem: (item: ArchiveItem) => void;
  onDeleteItem: (id: string) => void;
}

export const ArchiveManager: React.FC<ArchiveManagerProps> = ({
  archiveItems,
  onAddArchiveItem,
  onDeleteItem,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showLearningModal, setShowLearningModal] = useState(false);
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('');
  const [category, setCategory] = useState<ArchiveItem['category']>('infantil_3d');
  const [description, setDescription] = useState('');
  const [papers, setPapers] = useState('');
  const [layersCount, setLayersCount] = useState(3);
  const [silhouetteTips, setSilhouetteTips] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setCompressionInfo(null);
      setAnalysisSuccess(null);
      const originalKb = Math.round(file.size / 1024);

      // Comprime e converte para WebP no browser da artesã
      const { blob } = await compressImageToWebP(file, { maxDimension: 1200, quality: 0.82 });
      const compressedKb = Math.round(blob.size / 1024);

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = reader.result as string;
        setImageUrl(base64Data);
        setIsCompressing(false);
        setCompressionInfo(`Otimizado em WebP: de ${originalKb} KB para ${compressedKb} KB (${Math.round((1 - blob.size / file.size) * 100)}% mais leve)`);
        
        // Auto-analisa com Gemini 3 Multimodal
        triggerGeminiVisionAnalysis(base64Data);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Erro na compressão:', err);
      setIsCompressing(false);
    }
  };

  const triggerGeminiVisionAnalysis = async (base64Img: string) => {
    if (!base64Img) return;
    setIsAnalyzingImage(true);
    setAnalysisSuccess(null);

    try {
      const res = await fetch('/api/studio/analyze-item-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: base64Img.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
          existingHint: title ? `Nome sugerido: ${title}` : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na análise com Gemini 3.');
      }

      const { data } = await res.json();
      if (data) {
        if (data.title && !title) setTitle(data.title);
        if (data.theme && !theme) setTheme(data.theme);
        if (data.category) setCategory(data.category as any);
        if (data.layersCount) setLayersCount(Number(data.layersCount));
        if (data.papers && Array.isArray(data.papers)) setPapers(data.papers.join(', '));
        if (data.description) setDescription(data.description);
        if (data.silhouetteTips) setSilhouetteTips(data.silhouetteTips);
        
        setAnalysisSuccess('✨ Foto analisada pelo Gemini 3.8 Flash: camadas, papéis e calibração de corte preenchidos!');
      }
    } catch (error: any) {
      console.warn('Erro ao analisar com Gemini Vision:', error);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !theme) return;

    const newItem: ArchiveItem = {
      id: `arc-${Date.now()}`,
      title,
      theme,
      category,
      description: description || `Projeto de topo de bolo 3D tema ${theme} desenvolvido para Silhouette Portrait 3.`,
      papers: papers ? papers.split(',').map(p => p.trim()).filter(Boolean) : ['Colorplus 180g', 'Lamicote 250g'],
      layersCount: Number(layersCount) || 3,
      silhouetteTips: silhouetteTips || 'Lamicote cortar com 2 passadas. Colorplus com lâmina 3.',
      imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80',
      tags: [theme, `${layersCount} Camadas`],
    };

    onAddArchiveItem(newItem);
    setShowModal(false);
    setTitle('');
    setTheme('');
    setDescription('');
    setPapers('');
    setSilhouetteTips('');
    setImageUrl('');
    setAnalysisSuccess(null);
  };

  return (
    <div id="archive-manager-view" className="space-y-6">
      {/* Top Banner with Dynamic Knowledge Base Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 luisices-glass p-6 sm:p-7 rounded-2xl border border-[var(--glass-border)]">
        <div>
          <div className="flex items-center gap-2.5">
            <FolderHeart className="w-5 h-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Acervo Real & Aprendizado Contínuo Luisices</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-bold">
              {archiveItems.length} peças
            </span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-1.5 max-w-2xl leading-relaxed">
            Fotos de topos reais produzidos no ateliê. O <span className="text-[var(--primary)] font-semibold">Gemini 3</span> aprende com suas fotos e injeta automaticamente as técnicas de camadas, tipos de papéis e calibração da Silhouette Portrait 3 no System Prompt de cada novo projeto gerado.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-view-ai-knowledge"
            onClick={() => setShowLearningModal(true)}
            className="px-4 py-2.5 rounded-xl luisices-chip hover:border-[var(--primary)] text-[var(--foreground)] text-xs font-bold flex items-center gap-2 transition active:scale-95 flex-shrink-0"
          >
            <BrainCircuit className="w-4 h-4 text-[var(--primary)]" />
            <span>Ver Aprendizado da IA</span>
          </button>

          <button
            id="btn-add-archive-item"
            onClick={() => {
              setAnalysisSuccess(null);
              setShowModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-md active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Topo</span>
          </button>
        </div>
      </div>

      {/* Grid of Archive Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {archiveItems.map((item) => (
          <div
            key={item.id}
            id={`archive-card-${item.id}`}
            className="luisices-glass rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between group hover:border-[var(--primary)] transition-all"
          >
            <div>
              <div className="aspect-[4/3] bg-[var(--muted)] relative overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2.5 left-2.5 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[var(--primary)]" />
                  {item.layersCount} Camadas 3D
                </span>
                <button
                  id={`btn-delete-archive-${item.id}`}
                  onClick={() => onDeleteItem(item.id)}
                  title="Remover do Acervo"
                  className="absolute top-2.5 right-2.5 bg-white/90 hover:bg-red-50 text-stone-600 hover:text-red-600 p-1.5 rounded-lg backdrop-blur-xs transition opacity-0 group-hover:opacity-100 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug">{item.title}</h3>
                  <p className="text-[11px] text-[var(--primary)] font-semibold">{item.theme}</p>
                </div>

                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed">{item.description}</p>

                <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Papéis:</span>
                  <div className="flex flex-wrap gap-1">
                    {item.papers.map((p, pIdx) => (
                      <span key={pIdx} className="text-[10px] luisices-chip text-[var(--foreground)] px-2 py-0.5 rounded font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {item.silhouetteTips && (
                  <div className="bg-[var(--primary)]/10 p-2.5 rounded-xl text-[11px] text-[var(--foreground)] leading-snug border border-[var(--primary)]/20">
                    <span className="font-bold text-[var(--primary)]">Dica Portrait 3: </span>{item.silhouetteTips}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para adicionar novo item ao acervo com Auto-Análise Gemini 3 Vision */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="luisices-glass bg-[var(--background)] max-w-lg w-full p-6 rounded-2xl shadow-2xl space-y-5 border border-[var(--glass-border)] my-8">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--foreground)]">Cadastrar Topo no Acervo com IA</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* Upload e Visão Multimodal do Gemini 3 */}
              <div className="space-y-2">
                <label className="block font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  1. Foto do Topo Real (Gemini 3 Vision analisa e aprende)
                </label>
                
                <div className="relative border-2 border-dashed border-[var(--primary)]/50 hover:border-[var(--primary)] rounded-2xl p-4 text-center cursor-pointer transition bg-[var(--primary)]/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5 text-xs">
                    <Upload className="w-5 h-5 text-[var(--primary)]" />
                    <span className="font-bold text-[var(--foreground)]">
                      {isCompressing ? 'Otimizando em WebP...' : 'Tirar ou arrastar foto do topo de bolo'}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      A IA inspeciona camadas, brilho de lamicote, detalhes e preenche a ficha automaticamente
                    </span>
                  </div>
                </div>

                {isAnalyzingImage && (
                  <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--foreground)] text-xs flex items-center gap-2.5 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-[var(--primary)] animate-spin" />
                    <div>
                      <div className="font-bold text-[var(--primary)]">Gemini 3.8 Flash inspecionando a foto...</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">Identificando camadas 3D, papéis Fedrigoni/Lamicote e lâminas de corte.</div>
                    </div>
                  </div>
                )}

                {analysisSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{analysisSuccess}</span>
                  </div>
                )}

                {compressionInfo && !analysisSuccess && (
                  <div className="p-2 rounded-xl bg-stone-500/10 text-[10px] text-[var(--muted-foreground)] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-[var(--primary)]" />
                    <span>{compressionInfo}</span>
                  </div>
                )}

                {imageUrl && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl luisices-chip border border-[var(--border)]">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      loading="lazy"
                      decoding="async"
                      className="w-14 h-14 rounded-lg object-cover border border-[var(--border)]"
                    />
                    <div className="text-[11px] truncate flex-1">
                      <div className="font-bold text-[var(--foreground)]">Imagem Pronta</div>
                      <button
                        type="button"
                        onClick={() => triggerGeminiVisionAnalysis(imageUrl)}
                        disabled={isAnalyzingImage}
                        className="text-[10px] text-[var(--primary)] font-bold hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        Reanalisar com Gemini 3
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setImageUrl(''); setCompressionInfo(null); setAnalysisSuccess(null); }}
                      className="text-red-500 hover:text-red-600 text-xs font-bold px-2 py-1"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              {/* Informações Preenchidas / Editáveis */}
              <div className="pt-2 border-t border-[var(--border)] space-y-3">
                <label className="block font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  2. Ficha Técnica da Peça
                </label>

                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">Título Comercial *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Jardim Encantado com Flores 3D e Lamicote"
                    className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[var(--foreground)] mb-1">Tema Principal *</label>
                    <input
                      type="text"
                      required
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="Ex: Jardim / Borboletas"
                      className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[var(--foreground)] mb-1">Qtd. de Camadas 3D</label>
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={layersCount}
                      onChange={(e) => setLayersCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">Papéis Utilizados</label>
                  <input
                    type="text"
                    value={papers}
                    onChange={(e) => setPapers(e.target.value)}
                    placeholder="Ex: Colorplus Rosa Chá 180g, Lamicote Dourado 250g, Matte 230g"
                    className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[var(--foreground)] mb-1">Dica de Corte Silhouette Portrait 3</label>
                  <textarea
                    rows={2}
                    value={silhouetteTips}
                    onChange={(e) => setSilhouetteTips(e.target.value)}
                    placeholder="Ex: Lamicote com 2 passadas lâmina 4-5. Esteira leve para flores."
                    className="w-full px-3.5 py-2 rounded-xl luisices-glass-input text-xs text-[var(--foreground)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-medium hover:bg-black/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold uppercase tracking-wider text-xs shadow-md"
                >
                  Salvar e Ensinar IA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Inspeção do Aprendizado da IA */}
      {showLearningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="luisices-glass bg-[var(--background)] max-w-2xl w-full p-6 sm:p-7 rounded-2xl shadow-2xl space-y-5 border border-[var(--glass-border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[var(--primary)]" />
                <h3 className="font-bold text-base text-[var(--foreground)]">System Prompt com Aprendizado Dinâmico</h3>
              </div>
              <button
                onClick={() => setShowLearningModal(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[var(--muted-foreground)]">
              <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--foreground)] space-y-1">
                <div className="font-bold text-[var(--primary)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modelo Ativo: Gemini 3.8 Flash (Multimodal & Raciocínio)
                </div>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Cada topo salvo no seu acervo é sintetizado em tempo real e injetado diretamente nas diretrizes do Gemini, garantindo que novos pedidos respeitem seu padrão físico de corte e montagem.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[var(--foreground)] uppercase tracking-wider mb-2">
                  Projetos do Ateliê atualmente no Contexto da IA ({archiveItems.length})
                </label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {archiveItems.map((item, idx) => (
                    <div key={item.id} className="p-2.5 rounded-xl luisices-chip flex items-start gap-3">
                      <span className="w-5 h-5 rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-[var(--foreground)] truncate">{item.title}</div>
                        <div className="text-[10px] text-[var(--primary)] font-semibold">{item.theme} • {item.layersCount} Camadas</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">Papéis: {item.papers.join(', ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowLearningModal(false)}
                className="px-5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
