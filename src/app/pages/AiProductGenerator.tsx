import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Scissors,
  FileText,
  ShoppingBag,
  Download,
  Send,
  Copy,
  Check,
  Palette,
  Clock,
  Coins,
  Settings,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Info,
  Wand2,
  PackagePlus,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  aiProductService,
  AiProductBlueprint,
  GenerateProductParams,
} from '../../services/aiProductService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseStoreProductService } from '../../services/firebaseStoreProductService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRODUCT_TYPES = [
  'Topo de Bolo 3D',
  'Topo Shaker Luxo',
  'Caixa Milk 3D',
  'Caixa Pirâmide',
  'Letra 3D Personalizada',
  'Marcador de Página Luxo',
  'Kit Festa Mesversário',
];

const COLOR_PALETTES = [
  'Candy Colors / Pastéis',
  'Dourado & Luxo',
  'Boho Chic',
  'Tons Terrosos & Rústico',
  'Azul Marinho & Prata',
  'Rosa & Floral Delicado',
  'Cores Vivas / Neon',
];

export function AiProductGenerator() {
  // Parâmetros de formulário
  const [productType, setProductType] = useState(PRODUCT_TYPES[0]);
  const [theme, setTheme] = useState('');
  const [targetNameAndAge, setTargetNameAndAge] = useState('');
  const [colorPalette, setColorPalette] = useState(COLOR_PALETTES[0]);
  const [complexity, setComplexity] = useState<'iniciante' | 'avançado'>('avançado');
  const [plotter, setPlotter] = useState<'portrait3' | 'cameo4' | 'cricut' | 'manual'>('portrait3');
  const [customInstructions, setCustomInstructions] = useState('');

  // Estado da geração
  const [loading, setLoading] = useState(false);
  const [blueprint, setBlueprint] = useState<AiProductBlueprint | null>(null);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);

  // Configuração da chave de API
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('luisices_gemini_api_key') || ''
      : '';
  });

  // Salvar no catálogo
  const [savingProduct, setSavingProduct] = useState(false);

  // Gerar projeto
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!theme.trim()) {
      toast.warning('Por favor, informe o tema da festa ou produto.');
      return;
    }

    setLoading(true);
    setBlueprint(null);
    setSelectedLayerIndex(null);

    try {
      const result = await aiProductService.generateProductBlueprint({
        productType,
        theme: theme.trim(),
        targetNameAndAge: targetNameAndAge.trim(),
        colorPalette,
        complexity,
        plotter,
        customInstructions: customInstructions.trim(),
        geminiApiKey: apiKeyInput,
      });

      setBlueprint(result);
      toast.success('Projeto gerado com sucesso! Camadas e ficha técnica prontas.');
    } catch (err: any) {
      console.error('Erro ao gerar projeto com IA:', err);
      toast.error('Não foi possível gerar o projeto. Usando modelo físico de segurança.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar API Key
  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('luisices_gemini_api_key', apiKeyInput.trim());
    }
    setIsApiKeyDialogOpen(false);
    toast.success('Chave da API Gemini salva com sucesso!');
  };

  // Salvar como Produto no Catálogo Interno e na Lojinha
  const handleSaveToCatalog = async () => {
    if (!blueprint) return;
    setSavingProduct(true);

    try {
      // 1. Salvar no catálogo interno
      await firebaseProductService.createProduct({
        name: blueprint.productTitle,
        unitPrice: blueprint.recommendedPrice,
        category: blueprint.category,
        description: blueprint.description,
        isPublic: true,
        leadTimeDays: blueprint.suggestedLeadTimeDays,
        isCustomizable: true,
      });

      // 2. Salvar na Lojinha Pública
      await firebaseStoreProductService.createProduct({
        name: blueprint.productTitle,
        category: blueprint.category,
        price: blueprint.recommendedPrice,
        description: blueprint.description,
        leadTimeDays: blueprint.suggestedLeadTimeDays,
        isCustomizable: true,
        active: true,
        featured: true,
        badge: 'Novo',
      });

      toast.success('Produto salvo com sucesso no Catálogo e na Lojinha Online!');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      toast.error('Erro ao salvar no catálogo. Verifique sua conexão.');
    } finally {
      setSavingProduct(false);
    }
  };

  // Exportar Ficha Técnica em PDF
  const handleExportPDF = () => {
    if (!blueprint) return;

    try {
      const doc = new jsPDF();

      // Cabeçalho
      doc.setFillColor(97, 61, 62);
      doc.rect(0, 0, 210, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('LUISICES PAPELARIA - FICHA TÉCNICA DE PRODUÇÃO', 14, 16);

      // Informações Gerais
      doc.setTextColor(34, 26, 26);
      doc.setFontSize(14);
      doc.text(blueprint.productTitle, 14, 35);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Tema: ${blueprint.theme} | Personalização: ${blueprint.targetAgeAndName}`, 14, 42);
      doc.text(`Preço Sugerido: ${formatCurrency(blueprint.recommendedPrice)} | Tempo Estimado: ${blueprint.estimatedAssemblyMinutes} min`, 14, 48);

      // Tabela de Camadas de Corte (Silhouette Settings)
      const layersData = blueprint.layers.map((l) => [
        `Camada ${l.order}`,
        l.name,
        l.paperType,
        `Lâm: ${l.silhouetteSettings.blade} | Força: ${l.silhouetteSettings.force} | Vel: ${l.silhouetteSettings.speed} (${l.silhouetteSettings.passes}x)`,
        l.cutDifficulty,
      ]);

      autoTable(doc, {
        startY: 54,
        head: [['Ordem', 'Camada / Elemento', 'Papel Recomendado', 'Ajuste Silhouette', 'Dificuldade']],
        body: layersData,
        theme: 'striped',
        headStyles: { fillColor: [97, 61, 62] },
      });

      // Tabela de Lista de Compras de Folhas
      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(12);
      doc.setTextColor(34, 26, 26);
      doc.text('Lista de Materiais e Consumo de Papéis (Folhas A4):', 14, finalY + 12);

      const papersData = blueprint.papersShoppingList.map((p) => [
        p.name,
        p.gramature,
        `${p.sheetsNeeded} folha(s)`,
      ]);

      autoTable(doc, {
        startY: finalY + 16,
        head: [['Tipo de Papel', 'Gramatura', 'Qtd. Folhas']],
        body: papersData,
        theme: 'grid',
        headStyles: { fillColor: [130, 85, 87] },
      });

      // Dicas de Montagem
      const notesY = (doc as any).lastAutoTable.finalY || 180;
      doc.setFontSize(11);
      doc.text('Instruções de Montagem e Silhouette:', 14, notesY + 10);
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      const splitTips = doc.splitTextToSize(blueprint.silhouetteTips, 180);
      doc.text(splitTips, 14, notesY + 16);

      doc.save(`Ficha_Tecnica_${blueprint.productTitle.replace(/\s+/g, '_')}.pdf`);
      toast.success('Ficha Técnica exportada em PDF!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro ao exportar PDF.');
    }
  };

  // Enviar resumo pelo WhatsApp
  const handleShareWhatsApp = () => {
    if (!blueprint) return;

    let text = `✨ *FICHA TÉCNICA - ${blueprint.productTitle}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎨 *Tema:* ${blueprint.theme}\n`;
    text += `👶 *Nome/Idade:* ${blueprint.targetAgeAndName}\n`;
    text += `💰 *Preço Sugerido:* ${formatCurrency(blueprint.recommendedPrice)}\n\n`;
    text += `📦 *PAPÉIS NECESSÁRIOS:*\n`;
    blueprint.papersShoppingList.forEach((p) => {
      text += `• ${p.name} (${p.gramature}) - ${p.sheetsNeeded} folha(s)\n`;
    });
    text += `\n✂️ *CAMADAS DO PROJETO:*\n`;
    blueprint.layers.forEach((l) => {
      text += `• Camada ${l.order}: ${l.name} (${l.paperType}) - Lâmina ${l.silhouetteSettings.blade}, Força ${l.silhouetteSettings.force}\n`;
    });
    text += `\n⏱️ *Tempo de Montagem:* ~${blueprint.estimatedAssemblyMinutes} min\n`;

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Estúdio de Prototipagem com IA</h1>
              <p className="text-sm text-muted-foreground">
                Projete produtos físicos com viabilidade real de corte em Silhouette e consumo de papéis
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsApiKeyDialogOpen(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <Settings className="size-3.5" />
            {apiKeyInput ? 'Chave Gemini Configurada' : 'Configurar Chave Gemini'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Formulário de Entrada */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Wand2 className="size-4 text-primary" />
                Especificações do Projeto
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o tema e a IA calculará as camadas e parâmetros de corte
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                {/* Tipo de Produto */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo de Produto *</Label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {PRODUCT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tema da Festa */}
                <div className="space-y-1.5">
                  <Label htmlFor="input-theme" className="text-xs font-semibold">
                    Tema da Festa / Ideia *
                  </Label>
                  <Input
                    id="input-theme"
                    placeholder="Ex: Jardim Encantado, Dino Baby, Safari Luxo"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>

                {/* Nome e Idade */}
                <div className="space-y-1.5">
                  <Label htmlFor="input-name-age" className="text-xs font-semibold">
                    Nome e Idade da Criança / Aniversariante
                  </Label>
                  <Input
                    id="input-name-age"
                    placeholder="Ex: Helena - 3 anos"
                    value={targetNameAndAge}
                    onChange={(e) => setTargetNameAndAge(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Paleta de Cores */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Paleta de Cores Desejada</Label>
                  <select
                    value={colorPalette}
                    onChange={(e) => setColorPalette(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {COLOR_PALETTES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Complexidade & Máquina */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Complexidade</Label>
                    <select
                      value={complexity}
                      onChange={(e) => setComplexity(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="iniciante">Iniciante (2-3 camadas)</option>
                      <option value="avançado">Avançado (4-5 camadas 3D)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Máquina de Corte</Label>
                    <select
                      value={plotter}
                      onChange={(e) => setPlotter(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="portrait3">Portrait 3 (A4)</option>
                      <option value="cameo4">Cameo 4 (A3/A4)</option>
                      <option value="cricut">Cricut Joy/Maker</option>
                      <option value="manual">Tesoura / Manual</option>
                    </select>
                  </div>
                </div>

                {/* Instruções Adicionais */}
                <div className="space-y-1.5">
                  <Label htmlFor="input-instructions" className="text-xs font-semibold">
                    Instruções Especiais (Opcional)
                  </Label>
                  <Textarea
                    id="input-instructions"
                    placeholder="Ex: Quero detalhes em acetato transparente e flores vazadas no fundo..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>

                {/* Botão de Geração */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full font-semibold gap-2 shadow-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Calculando Camadas & Corte...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Gerar Projeto e Ficha Técnica
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Resultados, Mockup 3D e Ficha Técnica */}
        <div className="lg:col-span-8 space-y-6">
          {!blueprint && !loading && (
            <Card className="border-dashed p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 text-primary">
                <Layers className="size-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-semibold text-base">Nenhum projeto gerado ainda</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Preencha o tema e as características no painel à esquerda para a IA calcular o
                  esquema de camadas 3D, parâmetros de lâmina Silhouette e lista de compras de papéis.
                </p>
              </div>
            </Card>
          )}

          {loading && (
            <Card className="p-16 text-center flex flex-col items-center justify-center space-y-4 animate-pulse">
              <Loader2 className="size-10 text-primary animate-spin" />
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base">Engenharia do Projeto em Andamento</h3>
                <p className="text-xs text-muted-foreground">
                  Dimensionando deslocamentos de letras, calibrando força da lâmina e calculando consumo de folhas A4...
                </p>
              </div>
            </Card>
          )}

          {blueprint && (
            <div className="space-y-6">
              {/* Card Principal do Produto com Ações Rápidas */}
              <Card className="shadow-sm border-primary/30">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {blueprint.category}
                        </Badge>
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                          Preço Sugerido: {formatCurrency(blueprint.recommendedPrice)}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl font-bold">{blueprint.productTitle}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed pt-1">
                        {blueprint.description}
                      </CardDescription>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={handleSaveToCatalog}
                        disabled={savingProduct}
                        className="text-xs gap-1.5 w-full bg-primary hover:bg-primary/90"
                      >
                        {savingProduct ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <PackagePlus className="size-3.5" />
                        )}
                        Salvar no Catálogo
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportPDF}
                        className="text-xs gap-1.5 w-full"
                      >
                        <Download className="size-3.5" />
                        Exportar PDF
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleShareWhatsApp}
                        className="text-xs gap-1.5 w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300"
                      >
                        <Send className="size-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Visualização de Mockup 3D Interativo e Raio-X de Camadas */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Visualizador 3D das Camadas Sobrepostas */}
                <div className="md:col-span-5">
                  <Card className="h-full shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Layers className="size-4 text-primary" />
                        Simulador de Camadas 3D
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Passe o mouse ou clique em uma camada para inspecionar
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <div className="relative w-full aspect-square max-w-[280px] flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl p-6 border shadow-inner">
                        {/* Renderização em perspectiva isométrica das camadas */}
                        <div className="relative w-full h-full flex items-center justify-center">
                          {blueprint.layers.map((layer, index) => {
                            const isSelected = selectedLayerIndex === index;
                            const translateY = -(index * 16);
                            const zIndex = 10 + index;

                            return (
                              <div
                                key={layer.order}
                                onClick={() =>
                                  setSelectedLayerIndex(isSelected ? null : index)
                                }
                                style={{
                                  backgroundColor: layer.colorHex,
                                  transform: `translateY(${translateY}px) scale(${1 - index * 0.05})`,
                                  zIndex: isSelected ? 50 : zIndex,
                                }}
                                className={`absolute w-36 h-28 rounded-xl shadow-md border border-black/10 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-2 text-center select-none ${
                                  isSelected
                                    ? 'ring-4 ring-primary ring-offset-2 scale-105'
                                    : 'hover:translate-y-[-24px] hover:shadow-xl'
                                }`}
                              >
                                <span
                                  className="text-[11px] font-bold px-1.5 py-0.5 rounded shadow-xs bg-black/20 text-white"
                                  style={{ backdropFilter: 'blur(2px)' }}
                                >
                                  C{layer.order}: {layer.colorName}
                                </span>
                                <span className="text-[9px] text-white/90 font-medium truncate max-w-[120px] pt-1">
                                  {layer.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-3 text-center">
                        Representação volumétrica com sombras de fita banana de 2mm
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Raio-X Detalhado das Camadas */}
                <div className="md:col-span-7">
                  <Card className="h-full shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Scissors className="size-4 text-primary" />
                        Raio-X de Camadas de Corte
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Ordem de corte, tipos de papel e parâmetros de lâmina
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2">
                      {blueprint.layers.map((layer, index) => {
                        const isSelected = selectedLayerIndex === index;
                        return (
                          <div
                            key={layer.order}
                            onClick={() =>
                              setSelectedLayerIndex(isSelected ? null : index)
                            }
                            className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-primary/5 border-primary shadow-xs'
                                : 'bg-card hover:bg-muted/40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 pb-1.5">
                              <div className="flex items-center gap-2">
                                <div
                                  className="size-4 rounded-full border border-black/10 shrink-0"
                                  style={{ backgroundColor: layer.colorHex }}
                                />
                                <span className="font-semibold text-foreground">
                                  {layer.name}
                                </span>
                              </div>
                              <Badge
                                variant={
                                  layer.cutDifficulty === 'fácil'
                                    ? 'secondary'
                                    : layer.cutDifficulty === 'delicado'
                                    ? 'destructive'
                                    : 'outline'
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {layer.cutDifficulty}
                              </Badge>
                            </div>

                            <p className="text-muted-foreground text-[11px] pb-1">
                              <strong>Papel:</strong> {layer.paperType}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                                ✂️ Lâmina: <strong>{layer.silhouetteSettings.blade}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                                ⚡ Força: <strong>{layer.silhouetteSettings.force}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                                🏃 Vel: <strong>{layer.silhouetteSettings.speed}</strong>
                              </span>
                              <span className="px-2 py-0.5 rounded bg-muted font-medium text-foreground">
                                🔁 Passadas: <strong>{layer.silhouetteSettings.passes}x</strong>
                              </span>
                            </div>

                            <p className="text-[11px] text-muted-foreground/90 italic pt-1.5">
                              💡 <strong>Montagem:</strong> {layer.assemblyTip}
                            </p>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Ficha Técnica: Lista de Compras de Papéis e Dicas Silhouette */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lista de Compras de Folhas */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingBag className="size-4 text-primary" />
                      Lista de Compras de Papéis
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Consumo estimado em folhas comerciais (A4)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {blueprint.papersShoppingList.map((paper, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-xs border"
                      >
                        <span className="font-medium text-foreground">{paper.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{paper.gramature}</span>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {paper.sheetsNeeded} folha(s)
                          </Badge>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2">
                      <p className="text-[11px] text-muted-foreground">
                        <strong>Acessórios:</strong> {blueprint.toolsAndAccessories.join(', ')}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dicas de Corte Silhouette */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <HelpCircle className="size-4 text-primary" />
                      Recomendações da Plotter
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Instruções para corte limpo e durabilidade da lâmina
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                      <p className="leading-relaxed">{blueprint.silhouetteTips}</p>
                    </div>

                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p>
                        ⏱️ <strong>Tempo estimado de montagem:</strong> ~
                        {blueprint.estimatedAssemblyMinutes} minutos
                      </p>
                      <p>
                        📐 <strong>Área de trabalho:</strong> Otimizado para Folha A4 na{' '}
                        {plotter === 'portrait3' ? 'Portrait 3' : 'Cameo 4'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Configuração da Chave da API Gemini */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              Configurar Chave da API Gemini
            </DialogTitle>
            <DialogDescription className="text-xs">
              Insira sua chave gratuita do Google AI Studio para desbloquear a geração ilimitada de
              projetos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gemini-key-input" className="text-xs font-semibold">
                Google AI Studio API Key
              </Label>
              <Input
                id="gemini-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-muted/60 text-[11px] text-muted-foreground space-y-1.5">
              <p>
                <strong>Onde conseguir a chave?</strong>
              </p>
              <p>
                Acesse o{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium inline-flex items-center gap-0.5"
                >
                  Google AI Studio <ExternalLink className="size-3" />
                </a>{' '}
                e crie sua chave gratuita em segundos.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsApiKeyDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveApiKey} className="text-xs">
              Salvar Chave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AiProductGenerator;
