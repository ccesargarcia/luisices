import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { ConceptResult, CutSheetPreview } from '../types';
import { 
  Check, 
  Copy, 
  Layers, 
  Scissors, 
  MessageSquare, 
  Download,
  Info,
  Sparkles,
  FileCheck2,
  RefreshCw,
  Eye,
  FileDown,
  Printer,
  Sparkle
} from 'lucide-react';

interface ResultViewerProps {
  result: ConceptResult;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'silhouette' | 'camadas' | 'whatsapp' | 'prompt'>('silhouette');
  const [selectedCutSheetIdx, setSelectedCutSheetIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [mockupImg, setMockupImg] = useState<string | undefined>(result.mockupImage);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const sheet = result.technicalSheet;
  const cutSheets: CutSheetPreview[] = sheet.cutSheets || [];
  const currentCutSheet = cutSheets[selectedCutSheetIdx] || cutSheets[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(sheet.whatsappPitch);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleRegenerateMockup = () => {
    setIsRegenerating(true);
    const seed = Math.floor(Math.random() * 900000) + 10000;
    const prompt = result.renderedPrompt || `Professional commercial studio product photography of a luxury handcrafted 3D layered paper cake topper, theme "${sheet.theme}", customized script text "${sheet.recipientName}", crafted from physical pastel Colorplus cardstock layers and reflective gold mirror lamicote cardstock, elevated with 2mm foam banana tape, standing on an elegant pastel frosted cake, soft diffused studio light, sharp focus on paper cutout textures and drop shadows, 8k resolution`;
    const newUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;

    const img = new Image();
    img.onload = () => {
      setMockupImg(newUrl);
      setIsRegenerating(false);
    };
    img.onerror = () => {
      setMockupImg(newUrl);
      setIsRegenerating(false);
    };
    img.src = newUrl;
  };

  const handleDownloadSvg = (cs: CutSheetPreview) => {
    if (!cs?.svgContent) return;
    const blob = new Blob([cs.svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${cs.sheetTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_portrait3.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllSvgs = () => {
    if (!cutSheets.length) return;
    cutSheets.forEach((cs, i) => {
      setTimeout(() => handleDownloadSvg(cs), i * 350);
    });
  };

  return (
    <div id="studio-result-card" className="luisices-glass rounded-2xl overflow-hidden shadow-lg transition-all">
      {/* Top Banner with Luisices Signature styling */}
      <div className="bg-[var(--primary)] text-[var(--primary-foreground)] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[var(--primary-foreground)] text-[10px] font-bold tracking-wider uppercase backdrop-blur-xs border border-white/20">
              Silhouette Portrait 3 Validado
            </span>
            <span className="text-xs opacity-80">• Tema: {sheet.theme}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{sheet.title}</h2>
          <p className="text-xs opacity-85 mt-0.5">
            Personalizado para <span className="font-bold underline decoration-white/40">{sheet.recipientName}</span> ({sheet.ageOrOccasion})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-whatsapp-share"
            onClick={openWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-md active:scale-95"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Enviar no WhatsApp</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 border-b border-[var(--border)]">
        {/* Mockup Preview Column */}
        <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-[var(--muted)]/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">Foto do Produto (Mockup)</span>
              <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Ultra-Realismo de Estúdio</span>
            </div>

            {mockupImg ? (
              <div className="rounded-xl overflow-hidden border border-[var(--glass-border)] shadow-md bg-white aspect-square relative group">
                <img
                  src={mockupImg}
                  alt={sheet.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-sm">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Ultra-Realista 8K</span>
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleRegenerateMockup}
                    disabled={isRegenerating}
                    title="Regenerar foto com novas variações de luz e ângulo"
                    className="bg-black/65 hover:bg-black/85 text-white p-2 rounded-xl text-xs backdrop-blur-sm transition flex items-center gap-1.5 shadow-lg active:scale-95 border border-white/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline text-[11px]">Nova Foto</span>
                  </button>
                  <a
                    href={mockupImg}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`topo-${sheet.recipientName.toLowerCase().replace(/\s+/g, '-')}.png`}
                    className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] p-2 rounded-xl text-xs font-medium backdrop-blur-sm transition flex items-center gap-1.5 shadow-lg active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Baixar HD</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--primary)]/30 p-6 bg-[var(--card)] flex flex-col items-center justify-center text-center aspect-square space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] flex items-center justify-center shadow-xs">
                  <Scissors className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--foreground)]">Gerando Foto do Produto...</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xs">
                    Estamos renderizando a simulação do produto físico com camadas e texturas.
                  </p>
                </div>
                <button
                  onClick={handleRegenerateMockup}
                  className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Gerar Foto Agora</span>
                </button>
              </div>
            )}
          </div>

          {/* Papéis recomendados resumidos */}
          <div className="mt-6 pt-4 border-t border-[var(--border)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2.5">
              Insumos Necessários na Bancada
            </h4>
            <div className="space-y-1.5">
              {sheet.recommendedPapers.map((paper, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl luisices-chip">
                  <span className="font-semibold text-[var(--foreground)]">{paper.paperType}</span>
                  <span className="text-[var(--muted-foreground)] text-[11px] font-medium">{paper.color} • {paper.grammage}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technical Detail Tabs */}
        <div className="lg:col-span-7 p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)] gap-4 mb-6 overflow-x-auto">
            {[
              { id: 'silhouette', label: 'Moldes Silhouette Portrait 3 (SVG)', icon: Scissors },
              { id: 'camadas', label: 'Camadas & Montagem', icon: Layers },
              { id: 'whatsapp', label: 'Mensagem Cliente', icon: MessageSquare },
              { id: 'prompt', label: 'Prompt Fotográfico', icon: Copy },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-btn-${tab.id}`}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-xs font-bold tracking-wide flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Silhouette Portrait 3 & SVG Cut Sheets */}
          {activeTab === 'silhouette' && (
            <div className="space-y-5">
              {cutSheets.length > 0 && currentCutSheet ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-[var(--primary)]" />
                      <span>Pranchas Prontas para Silhouette Portrait 3</span>
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">Formato A4 (210×297mm) com marcas de corte</span>
                  </div>

                  {/* Cut sheet selector pills */}
                  <div className="flex flex-wrap gap-2">
                    {cutSheets.map((cs, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedCutSheetIdx(idx)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
                          selectedCutSheetIdx === idx
                            ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-sm'
                            : 'luisices-chip text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-[var(--border)]'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: cs.colorHex }} />
                        <span>Folha {cs.sheetIndex}: {cs.sheetTitle.split(':')[1] || cs.sheetTitle}</span>
                      </button>
                    ))}
                  </div>

                  {/* Interactive SVG viewer container */}
                  <div className="rounded-xl border border-[var(--border)] bg-white p-3 shadow-inner">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-800">{currentCutSheet.sheetTitle}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{currentCutSheet.notes}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadSvg(currentCutSheet)}
                          className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold flex items-center gap-1.5 shadow-xs hover:bg-[var(--primary-hover)] transition active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar SVG Desta Folha</span>
                        </button>
                      </div>
                    </div>

                    <div 
                      className="w-full max-h-[380px] overflow-auto flex items-center justify-center bg-slate-50/70 rounded-lg p-2 border border-dashed border-slate-200"
                      dangerouslySetInnerHTML={{ 
                        __html: DOMPurify.sanitize(currentCutSheet.svgContent, {
                          USE_PROFILES: { svg: true, svgFilters: true },
                        }) 
                      }}
                    />
                  </div>

                  {/* Quick machine calibration parameters */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2.5 rounded-xl luisices-chip">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Lâmina</span>
                      <span className="text-xs font-bold text-[var(--foreground)]">{currentCutSheet.bladeDepth}</span>
                    </div>
                    <div className="p-2.5 rounded-xl luisices-chip">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Força</span>
                      <span className="text-xs font-bold text-[var(--foreground)]">{currentCutSheet.force}</span>
                    </div>
                    <div className="p-2.5 rounded-xl luisices-chip">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Velocidade</span>
                      <span className="text-xs font-bold text-[var(--foreground)]">{currentCutSheet.speed}</span>
                    </div>
                    <div className="p-2.5 rounded-xl luisices-chip">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Passadas</span>
                      <span className="text-xs font-bold text-[var(--foreground)]">{currentCutSheet.passes}</span>
                    </div>
                    <div className="p-2.5 rounded-xl luisices-chip col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Papel</span>
                      <span className="text-xs font-bold text-[var(--foreground)] truncate">{currentCutSheet.paperType}</span>
                    </div>
                  </div>

                  {/* Quick Actions & Legend */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-2">
                    <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                        <span>Corte Vermelho (#FF0000)</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                        <span>Vinco Tracejado (#0000FF)</span>
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadAllSvgs}
                      className="px-3.5 py-1.5 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--foreground)] luisices-chip hover:border-[var(--primary)] flex items-center gap-2 transition active:scale-95"
                    >
                      <FileDown className="w-4 h-4 text-[var(--primary)]" />
                      <span>Baixar Todas as 4 Folhas (.SVG)</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Silhouette calibration table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] luisices-chip">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--primary)]/10 text-[var(--primary)] uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Insumo</th>
                      <th className="p-3">Lâmina</th>
                      <th className="p-3">Força</th>
                      <th className="p-3">Velocidade</th>
                      <th className="p-3">Passadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sheet.silhouetteSettings.map((setting, idx) => (
                      <tr key={idx} className="hover:bg-[var(--primary)]/5 transition">
                        <td className="p-3 font-bold text-[var(--foreground)]">{setting.cutType}</td>
                        <td className="p-3">{setting.bladeDepth}</td>
                        <td className="p-3">{setting.force}</td>
                        <td className="p-3">{setting.speed}</td>
                        <td className="p-3">{setting.passes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                  <FileCheck2 className="w-4 h-4 text-[var(--primary)]" />
                  <span>Passo a Passo de Montagem na Bancada</span>
                </div>
                <ol className="space-y-2 list-decimal list-inside text-xs text-[var(--muted-foreground)] luisices-chip p-4 rounded-xl">
                  {sheet.assemblySteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Camadas 3D & Alturas */}
          {activeTab === 'camadas' && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--foreground)] luisices-chip p-3.5 rounded-xl flex items-start gap-2.5 border-l-4 border-l-[var(--primary)]">
                <Info className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Sequência física de sobreposição de baixo para cima com espessuras de fita banana para dar relevo e firmeza física sem vergar.
                </span>
              </div>

              <div className="space-y-3">
                {sheet.layerBreakdown.map((layer) => (
                  <div key={layer.level} className="p-4 rounded-xl luisices-chip">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold flex items-center justify-center shadow-xs">
                          {layer.level}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--foreground)]">{layer.name}</h4>
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                        {layer.foamTapeHeight}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-2.5 leading-relaxed">{layer.purpose}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {layer.elements.map((el, elIdx) => (
                        <span key={elIdx} className="text-[11px] px-2.5 py-0.5 bg-[var(--card)] rounded-md border border-[var(--border)] text-[var(--foreground)] font-medium">
                          {el}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WhatsApp Pitch */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl luisices-chip font-sans text-xs text-[var(--foreground)] whitespace-pre-wrap leading-relaxed border border-[var(--border)]">
                {sheet.whatsappPitch}
              </div>
              <div className="flex gap-3">
                <button
                  id="btn-copy-pitch"
                  onClick={() => handleCopy(sheet.whatsappPitch)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--foreground)] luisices-chip hover:border-[var(--primary)] flex items-center gap-2 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[var(--primary)]" />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
                <button
                  id="btn-open-whatsapp-pitch"
                  onClick={openWhatsApp}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-md active:scale-95"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Abrir WhatsApp do Cliente</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Raw Studio Prompt */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--muted-foreground)]">
                Este prompt possui as restrições de física real do Luisices para gerar no Nano Banana ou Midjourney sem distorções impossíveis:
              </p>
              <div className="p-4 rounded-xl bg-[#161214] text-[#e8e0e3] font-mono text-xs leading-relaxed max-h-60 overflow-y-auto border border-white/10 shadow-inner">
                {result.renderedPrompt}
              </div>
              <button
                id="btn-copy-raw-prompt"
                onClick={() => handleCopy(result.renderedPrompt)}
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-md active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Prompt Copiado!' : 'Copiar Prompt Nano Banana'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
