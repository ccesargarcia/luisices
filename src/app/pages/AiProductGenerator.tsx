import React, { useState, useEffect, useMemo } from 'react';
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
  Camera,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Sparkle,
  Brain,
  Star,
  BookmarkCheck,
  Trash2,
  FileDown,
  BookOpen,
  Eye,
  Grid,
  CheckCircle2,
  Terminal,
  Activity,
  Radio,
  Minimize2,
  Maximize2,
  Box,
  MessageCircle,
  Share2,
  Calculator,
  ShoppingCart,
  DollarSign,
  CheckCheck,
  CheckSquare,
  Calendar,
} from 'lucide-react';
import {
  aiProductService,
  AiProductBlueprint,
  GenerateProductParams,
  CURATED_PRESETS,
  CuratedPreset,
  CutSheet,
  AssemblyStep,
  AcervoItem,
  DEFAULT_ATELIER_ACERVO,
  CommercialPaperMatch,
  CostingBreakdown,
} from '../../services/aiProductService';
import { firebaseProductService } from '../../services/firebaseProductService';
import { firebaseStoreProductService } from '../../services/firebaseStoreProductService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
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

  // Precificação e Orçamento Instantâneo
  const [customProfitMargin, setCustomProfitMargin] = useState<number>(50);
  const [customHourlyRate, setCustomHourlyRate] = useState<number>(25);
  const [copiedProposal, setCopiedProposal] = useState<boolean>(false);
  const [stockChecks, setStockChecks] = useState<Record<number, boolean>>({});

  // Estado do Estúdio de Prompts Realistas
  const [activePromptTab, setActivePromptTab] = useState<
    'gemini' | 'banana' | 'ideogram' | 'midjourney' | 'dalle' | 'flux' | 'scene' | 'macro'
  >('gemini');
  const [copiedPromptKey, setCopiedPromptKey] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isAttachingImage, setIsAttachingImage] = useState(false);

  // Acervo de Imagens do Ateliê (Portfólio de Produtos Reais & Referências Visuais)
  const [acervoList, setAcervoList] = useState<AcervoItem[]>(() => {
    return aiProductService.getAtelierAcervo();
  });
  const [activeAcervoRef, setActiveAcervoRef] = useState<AcervoItem | null>(null);
  const [isAcervoDialogOpen, setIsAcervoDialogOpen] = useState(false);
  const [acervoSearchTerm, setAcervoSearchTerm] = useState('');
  const [isAddingToAcervo, setIsAddingToAcervo] = useState(false);
  const [newAcervoTitle, setNewAcervoTitle] = useState('');
  const [newAcervoTheme, setNewAcervoTheme] = useState('');
  const [newAcervoCategory, setNewAcervoCategory] = useState(PRODUCT_TYPES[0]);
  const [newAcervoImageUrl, setNewAcervoImageUrl] = useState('');
  const [newAcervoDescription, setNewAcervoDescription] = useState('');

  // Configuração da chave de API e Modelo Tuned
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('luisices_gemini_api_key') || ''
      : '';
  });
  const [tunedModelInput, setTunedModelInput] = useState(() => {
    return typeof window !== 'undefined'
      ? localStorage.getItem('luisices_gemini_tuned_model_id') || ''
      : '';
  });

  // Engenharia Reversa Visual por Imagem (Leitor de Imagem Multimodal)
  const [isReverseEngineerDialogOpen, setIsReverseEngineerDialogOpen] = useState(false);
  const [reverseImagePreview, setReverseImagePreview] = useState('');
  const [reverseUserNotes, setReverseUserNotes] = useState('');
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const reverseFileInputRef = React.useRef<HTMLInputElement>(null);
  const acervoFileInputRef = React.useRef<HTMLInputElement>(null);

  // Terminal e Output em Tempo Real (Live Stream & Logs)
  const [enableLiveOutput, setEnableLiveOutput] = useState(true);
  const [liveStreamingText, setLiveStreamingText] = useState('');
  const [liveProgressPercent, setLiveProgressPercent] = useState(0);
  const [liveCurrentStage, setLiveCurrentStage] = useState('');
  const [liveCurrentMessage, setLiveCurrentMessage] = useState('');
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(true);
  const [liveLogs, setLiveLogs] = useState<
    Array<{
      id: string;
      timestamp: string;
      stage: string;
      message: string;
      logType: 'info' | 'stream' | 'success' | 'warn' | 'error';
    }>
  >([]);
  const terminalLogRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll do terminal ao receber logs ou streaming
  useEffect(() => {
    if (terminalLogRef.current) {
      terminalLogRef.current.scrollTop = terminalLogRef.current.scrollHeight;
    }
  }, [liveLogs, liveStreamingText]);

  // Salvar no catálogo
  const [savingProduct, setSavingProduct] = useState(false);

  // Carregar um Exemplo Pré-Configurado do Acervo
  const handleLoadPreset = (preset: CuratedPreset) => {
    setProductType(preset.productType);
    setTheme(preset.theme);
    setTargetNameAndAge(preset.targetNameAndAge);
    setColorPalette(preset.colorPalette);
    setComplexity(preset.complexity);
    setPlotter(preset.plotter);
    setCustomInstructions(preset.customInstructions);

    toast.info(`Exemplo "${preset.title}" carregado! Calculando ficha técnica...`);
    const fallback = aiProductService.generateSmartFallback({
      productType: preset.productType,
      theme: preset.theme,
      targetNameAndAge: preset.targetNameAndAge,
      colorPalette: preset.colorPalette,
      complexity: preset.complexity,
      plotter: preset.plotter,
      customInstructions: preset.customInstructions,
    });
    setBlueprint(fallback);
  };

  // Selecionar um item do Acervo de Imagens como Referência para a IA
  const handleSelectAcervoReference = (item: AcervoItem) => {
    setActiveAcervoRef(item);
    setProductType(item.category || productType);
    if (item.theme) setTheme(item.theme);
    if (item.colorPalette) setColorPalette(item.colorPalette);
    if (item.complexity) setComplexity(item.complexity);
    if (item.targetNameAndAge) setTargetNameAndAge(item.targetNameAndAge);
    setIsAcervoDialogOpen(false);
    toast.success(`🖼️ Referência "${item.title}" selecionada! A IA usará este padrão visual.`);
  };

  // Limpar referência do Acervo
  const handleClearAcervoReference = () => {
    setActiveAcervoRef(null);
    toast.info('Referência do Acervo removida.');
  };

  // Salvar projeto atual no Acervo de Imagens do Ateliê
  const handleSaveToAcervo = () => {
    if (!blueprint) return;
    const saved = aiProductService.saveBlueprintToAcervo(blueprint, blueprint.generatedImageUrl);
    setAcervoList(aiProductService.getAtelierAcervo());
    toast.success(`🖼️ "${saved.title}" salvo no seu Acervo de Imagens do Ateliê!`);
  };

  // Adicionar manualmente uma imagem ao Acervo
  const handleAddNewAcervoItem = () => {
    if (!newAcervoTitle.trim() || !newAcervoImageUrl.trim()) {
      toast.warning('Informe ao menos o título e a URL da foto do acervo.');
      return;
    }

    aiProductService.saveItemToAcervo({
      title: newAcervoTitle.trim(),
      category: newAcervoCategory,
      theme: newAcervoTheme.trim() || 'Personalizado',
      imageUrl: newAcervoImageUrl.trim(),
      description: newAcervoDescription.trim(),
      tags: ['acervo-manual', newAcervoCategory.toLowerCase()],
    });

    setAcervoList(aiProductService.getAtelierAcervo());
    setNewAcervoTitle('');
    setNewAcervoTheme('');
    setNewAcervoImageUrl('');
    setNewAcervoDescription('');
    setIsAddingToAcervo(false);
    toast.success('Imagem adicionada ao seu Acervo de Imagens!');
  };

  // Upload de arquivo local para o Acervo via Base64
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setNewAcervoImageUrl(base64);
      toast.success('Foto carregada! Preencha os detalhes e clique em Salvar.');
    };
    reader.readAsDataURL(file);
  };

  // Remover item do Acervo
  const handleRemoveAcervoItem = (id: string) => {
    aiProductService.removeItemFromAcervo(id);
    setAcervoList(aiProductService.getAtelierAcervo());
    if (activeAcervoRef?.id === id) {
      setActiveAcervoRef(null);
    }
    toast.success('Item removido do seu Acervo de Imagens.');
  };

  // Exportar Dataset em JSONL para Fine-Tuning no Google AI Studio
  const handleDownloadDatasetJsonl = () => {
    if (acervoList.length === 0) {
      toast.warning('Nenhum item no acervo ainda.');
      return;
    }

    const jsonlContent = aiProductService.exportAcervoDatasetAsJsonl(acervoList);
    const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset_acervo_papelaria_${Date.now()}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Dataset do Acervo exportado para Fine-Tuning no Google AI Studio!');
  };

  // Carregar arquivo local de imagem para Engenharia Reversa Visual
  const handleReverseImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReverseImagePreview(base64);
      toast.success('Imagem carregada! Clique em "Inspecionar e Criar Matriz de Corte".');
    };
    reader.onerror = () => {
      toast.error('Erro ao ler o arquivo de imagem.');
    };
    reader.readAsDataURL(file);
    // Reset para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  // Drag and Drop para Engenharia Reversa
  const handleReverseImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, solte um arquivo de imagem válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReverseImagePreview(base64);
      toast.success('Imagem solta com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleReverseImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(true);
  };

  const handleReverseImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingImage(false);
  };

  // Executar Engenharia Reversa Visual Multimodal
  const handleRunReverseEngineer = async () => {
    if (!reverseImagePreview) {
      toast.warning('Por favor, carregue ou cole uma imagem para a IA inspecionar.');
      return;
    }

    setAnalyzingImage(true);
    setLiveStreamingText('');
    setLiveLogs([]);
    setLiveProgressPercent(15);
    setLiveCurrentStage('Iniciando');
    setLiveCurrentMessage('Preparando imagem para envio à IA Multimodal...');

    try {
      const result = await aiProductService.reverseEngineerBlueprintFromImage({
        imageBase64: reverseImagePreview,
        userNotes: reverseUserNotes.trim(),
        geminiApiKey: apiKeyInput,
        plotter,
        tunedModelId: tunedModelInput,
        onProgress: (event) => {
          setLiveCurrentStage(event.stage);
          setLiveCurrentMessage(event.message);
          setLiveProgressPercent(event.progressPercent);
          if (event.rawChunk) {
            setLiveStreamingText((prev) => prev + event.rawChunk);
          }
          if (event.logType !== 'stream') {
            setLiveLogs((prev) => [
              ...prev,
              {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                timestamp: event.timestamp,
                stage: event.stage,
                message: event.message,
                logType: event.logType,
              },
            ]);
          }
        },
      });

      setBlueprint(result);
      if (result.category) setProductType(result.category);
      if (result.theme) setTheme(result.theme);
      if (result.targetAgeAndName) setTargetNameAndAge(result.targetAgeAndName);
      if (result.layers && result.layers[0]?.colorName) setColorPalette(result.layers[0].colorName);

      setIsReverseEngineerDialogOpen(false);
      toast.success('🎉 Imagem inspecionada! Camadas, matriz de corte e materiais gerados com sucesso.');
    } catch (err: any) {
      console.error('Erro na engenharia reversa visual por imagem:', err);
      toast.error('Erro ao inspecionar a imagem. Verifique a chave da API Gemini.');
    } finally {
      setAnalyzingImage(false);
    }
  };

  // Cálculo dinâmico de Orçamento e Mapeamento de Papéis Comerciais
  const costingCalculation = useMemo(() => {
    if (!blueprint) return null;
    return aiProductService.calculateCostingAndCommercialPapers(
      blueprint,
      customHourlyRate,
      customProfitMargin
    );
  }, [blueprint, customHourlyRate, customProfitMargin]);

  // Copiar proposta formatada para WhatsApp
  const handleCopyProposal = () => {
    if (!costingCalculation?.costing) return;
    navigator.clipboard.writeText(costingCalculation.costing.whatsappProposal);
    setCopiedProposal(true);
    toast.success('💬 Proposta para WhatsApp copiada com sucesso!');
    setTimeout(() => setCopiedProposal(false), 2500);
  };

  // Enviar proposta diretamente para o WhatsApp Web / App
  const handleSendWhatsApp = () => {
    if (!costingCalculation?.costing) return;
    const url = `https://wa.me/?text=${encodeURIComponent(costingCalculation.costing.whatsappProposal)}`;
    window.open(url, '_blank');
  };

  // Alternar status de estoque de um papel comercial
  const handleToggleStock = (layerOrder: number) => {
    setStockChecks((prev) => ({
      ...prev,
      [layerOrder]: !prev[layerOrder],
    }));
  };

  // Gerar projeto com IA
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!theme.trim()) {
      toast.warning('Por favor, informe o tema da festa ou produto.');
      return;
    }

    setLoading(true);
    setBlueprint(null);
    setSelectedLayerIndex(null);
    setLiveStreamingText('');
    setLiveLogs([]);
    setLiveProgressPercent(15);
    setLiveCurrentStage('Iniciando');
    setLiveCurrentMessage('Montando parâmetros e consultando o acervo do ateliê...');

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
        tunedModelId: tunedModelInput,
        referenceAcervoItem: activeAcervoRef || undefined,
        referenceImageUrl: activeAcervoRef?.imageUrl,
        onProgress: (event) => {
          setLiveCurrentStage(event.stage);
          setLiveCurrentMessage(event.message);
          setLiveProgressPercent(event.progressPercent);
          if (event.rawChunk) {
            setLiveStreamingText((prev) => prev + event.rawChunk);
          }
          if (event.logType !== 'stream') {
            setLiveLogs((prev) => [
              ...prev,
              {
                id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                timestamp: event.timestamp,
                stage: event.stage,
                message: event.message,
                logType: event.logType,
              },
            ]);
          }
        },
      });

      setBlueprint(result);
      toast.success('Projeto gerado com sucesso! Camadas, corte e prompts calibrados.');
    } catch (err: any) {
      console.error('Erro ao gerar projeto com IA:', err);
      toast.error('Não foi possível gerar o projeto. Usando modelo físico de segurança.');
    } finally {
      setLoading(false);
    }
  };

  // Copiar prompt com feedback
  const handleCopyPrompt = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptKey(key);
    toast.success('Prompt copiado! Cole na ferramenta de imagem.');
    setTimeout(() => setCopiedPromptKey(null), 2500);
  };

  // Anexar imagem gerada manualmente
  const handleAttachCustomImage = () => {
    if (!blueprint || !customImageUrl.trim()) return;
    setBlueprint({
      ...blueprint,
      generatedImageUrl: customImageUrl.trim(),
    });
    setIsAttachingImage(false);
    setCustomImageUrl('');
    toast.success('Imagem anexada com sucesso à ficha técnica!');
  };

  // Salvar API Key e Modelo Tuned
  const handleSaveApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('luisices_gemini_api_key', apiKeyInput.trim());
      localStorage.setItem('luisices_gemini_tuned_model_id', tunedModelInput.trim());
    }
    setIsApiKeyDialogOpen(false);
    toast.success('Configurações de IA salvas com sucesso!');
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
        photoUrl: blueprint.generatedImageUrl,
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
        imageUrl: blueprint.generatedImageUrl,
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

  // Exportar Ficha Técnica em PDF Completa com Pranchas de Corte e Gabarito de Montagem
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
      doc.text(
        `Preço Sugerido: ${formatCurrency(blueprint.recommendedPrice)} | Tempo Estimado: ${blueprint.estimatedAssemblyMinutes} min`,
        14,
        48
      );

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
      let currentY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(12);
      doc.setTextColor(34, 26, 26);
      doc.text('Lista de Materiais e Consumo de Papéis (Folhas A4):', 14, currentY + 10);

      const papersData = blueprint.papersShoppingList.map((p) => [
        p.name,
        p.gramature,
        `${p.sheetsNeeded} folha(s)`,
      ]);

      autoTable(doc, {
        startY: currentY + 14,
        head: [['Tipo de Papel', 'Gramatura', 'Qtd. Folhas']],
        body: papersData,
        theme: 'grid',
        headStyles: { fillColor: [130, 85, 87] },
      });

      // Seção: Mapeamento de Papéis Comerciais (Fedrigoni / Lamicote / Kraft)
      currentY = (doc as any).lastAutoTable.finalY || 170;
      if (costingCalculation?.commercialPapers && costingCalculation.commercialPapers.length > 0) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 20;
        } else {
          currentY += 10;
        }

        doc.setFontSize(12);
        doc.setTextColor(34, 26, 26);
        doc.text('Mapeamento de Papéis Comerciais & Acabamento:', 14, currentY);

        const commercialData = costingCalculation.commercialPapers.map((p) => [
          `Camada ${p.layerOrder}`,
          p.commercialPaperName,
          p.finishType,
          p.usageRole,
          `~${formatCurrency(p.estimatedCostPerSheet)}/fl`,
        ]);

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Camada', 'Papel Comercial / Linha', 'Acabamento', 'Finalidade', 'Custo Folha']],
          body: commercialData,
          theme: 'striped',
          headStyles: { fillColor: [80, 50, 90] },
        });

        currentY = (doc as any).lastAutoTable.finalY || 200;
      }

      // Seção: Passo a Passo Físico de Montagem
      if (blueprint.assemblySteps && blueprint.assemblySteps.length > 0) {
        if (currentY > 210) {
          doc.addPage();
          currentY = 20;
        } else {
          currentY += 10;
        }

        doc.setFontSize(12);
        doc.setTextColor(34, 26, 26);
        doc.text('Gabarito de Montagem em Camadas (Passo a Passo Físico):', 14, currentY);

        const stepsData = blueprint.assemblySteps.map((step) => [
          `Passo ${step.stepNumber}`,
          step.actionTitle,
          step.adhesiveType,
          step.description,
        ]);

        autoTable(doc, {
          startY: currentY + 4,
          head: [['Passo', 'Ação', 'Tipo de Fixação / Adesivo', 'Instruções Detalhadas']],
          body: stepsData,
          theme: 'grid',
          headStyles: { fillColor: [97, 61, 62] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`Ficha_Tecnica_${blueprint.productTitle.replace(/\s+/g, '_')}.pdf`);
      toast.success('Ficha Técnica Completa exportada em PDF!');
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsReverseEngineerDialogOpen(true)}
            className="text-xs flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-xs"
          >
            <Camera className="size-3.5" />
            📸 Ler Imagem & Criar Base de Corte
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAcervoDialogOpen(true)}
            className="text-xs flex items-center gap-1.5 border-primary/30 text-foreground bg-primary/5 hover:bg-primary/10 shadow-xs"
          >
            <ImageIcon className="size-3.5 text-primary" />
            Acervo de Imagens ({acervoList.length} itens)
          </Button>

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
        {/* Painel Esquerdo: Galeria de Exemplos e Formulário */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card de Ação Rápida: Engenharia Reversa por Imagem */}
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 via-indigo-50/40 to-background dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-card flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Badge className="bg-purple-600 text-white text-[9px] px-1.5 py-0">NOVO</Badge>
                <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1">
                  <Camera className="size-3.5 text-purple-600 dark:text-purple-400" />
                  Tem uma foto ou imagem?
                </span>
              </div>
              <p className="text-[11px] text-purple-900/80 dark:text-purple-300/80 leading-snug">
                Envie o render gerado ou foto e a IA lê as camadas visíveis, materiais e cria a matriz de corte em SVG!
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsReverseEngineerDialogOpen(true)}
              className="text-xs font-semibold shrink-0 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
            >
              Ler Imagem
            </Button>
          </div>

          {/* Galeria de Exemplos Rápidos do Acervo */}
          <Card className="shadow-xs border-primary/20 bg-muted/20">
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <BookOpen className="size-3.5 text-primary" />
                  Modelos Prontos do Acervo
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">1-Clique</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-2 gap-2">
                {CURATED_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleLoadPreset(preset)}
                    className="text-left p-2 rounded-lg border bg-card hover:border-primary hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between w-full pb-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary">
                        {preset.badge}
                      </Badge>
                      <Sparkles className="size-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[11px] font-semibold text-foreground line-clamp-1">
                      {preset.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-1">
                      {preset.theme}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

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
              {/* Banner de Referência Ativa do Acervo de Imagens */}
              {activeAcervoRef && (
                <div className="mb-4 p-2.5 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={activeAcervoRef.imageUrl}
                      alt={activeAcervoRef.title}
                      className="size-10 rounded-lg object-cover border shrink-0 shadow-xs"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                        <Sparkles className="size-3" /> Referência Visual do Acervo Ativa
                      </span>
                      <p className="text-xs font-semibold text-foreground truncate">
                        {activeAcervoRef.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Tema: {activeAcervoRef.theme}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAcervoReference}
                    className="h-7 px-2 text-[10px] text-muted-foreground hover:text-destructive shrink-0 font-medium"
                  >
                    ✕ Limpar
                  </Button>
                </div>
              )}
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

                {/* Briefing Livre & Especificações Personalizadas do Projeto (Campo Livre) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="input-instructions" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Briefing Livre & Especificações do Pedido
                    </Label>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary font-semibold">
                      Campo Livre
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Escreva livremente qualquer instrução ou detalhe específico: acabamentos nobres (lamicote, glitter), flores em camadas, visor shaker com acetato, laços de cetim, medidas ou restrições de montagem.
                  </p>
                  <Textarea
                    id="input-instructions"
                    placeholder="Ex: Quero um topo shaker com visor em acetato 20 micras, anel em EVA 2mm com micro-pérolas e lantejoulas douradas. Na base, quero 4 camadas de borboletas 3D vazadas em Colorplus Rosa Chá e o nome em Lamicote Ouro 250g..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={4}
                    className="text-xs resize-y bg-background font-sans leading-relaxed"
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
                  Escolha um exemplo acima ou preencha o tema no formulário para a IA calcular o
                  esquema de camadas 3D, parâmetros de lâmina Silhouette e prompts fotográficos.
                </p>
              </div>
            </Card>
          )}

          {/* Terminal / Console de Execução da IA em Tempo Real */}
          {(loading || liveLogs.length > 0 || liveStreamingText.length > 0) && (
            <Card className="border-purple-300 dark:border-purple-800 shadow-md bg-slate-950 text-slate-100 overflow-hidden font-mono">
              <CardHeader className="p-3 bg-slate-900 border-b border-slate-800 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`size-2.5 rounded-full ${loading ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                  <CardTitle className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono">
                    <Terminal className="size-3.5 text-purple-400" />
                    Console de Execução da IA em Tempo Real
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-300 bg-purple-950/40">
                    {liveProgressPercent}%
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLiveLogs([]);
                      setLiveStreamingText('');
                    }}
                    className="h-6 px-2 text-[10px] text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    Limpar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsTerminalExpanded(!isTerminalExpanded)}
                    className="size-6 p-0 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    {isTerminalExpanded ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                  </Button>
                </div>
              </CardHeader>

              {isTerminalExpanded && (
                <CardContent className="p-3 space-y-3">
                  {/* Barra de Progresso com Etapa Atual */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-purple-300 font-semibold flex items-center gap-1">
                        <Activity className="size-3 animate-pulse text-purple-400" />
                        {liveCurrentStage || (loading ? 'Processando IA...' : 'Concluído')}
                      </span>
                      <span className="text-slate-400 text-[10px] truncate max-w-xs">{liveCurrentMessage}</span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, liveProgressPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Timeline dos Logs */}
                  {liveLogs.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1 text-[11px] text-slate-300 scrollbar-thin">
                      {liveLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-slate-500 shrink-0 text-[10px]">[{log.timestamp}]</span>
                          <span
                            className={
                              log.logType === 'success'
                                ? 'text-emerald-400 font-semibold'
                                : log.logType === 'warn'
                                ? 'text-amber-400'
                                : log.logType === 'error'
                                ? 'text-red-400'
                                : 'text-slate-300'
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Streaming de Texto / Tokens da IA em Tempo Real */}
                  {liveStreamingText && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 text-purple-300 font-semibold">
                          <Radio className="size-3 animate-pulse text-emerald-400" />
                          Transmissão de Tokens da IA (Ao Vivo):
                        </span>
                        <span>{liveStreamingText.length} caracteres</span>
                      </div>
                      <pre
                        ref={terminalLogRef}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed select-all"
                      >
                        {liveStreamingText}
                      </pre>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {blueprint && (
            <div className="space-y-6">
              {/* Card Principal do Produto com Imagem & Ações Rápidas */}
              <Card className="shadow-sm border-primary/30 overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-5">
                    {/* Imagem de Referência / Render do Modelo se presente */}
                    {blueprint.generatedImageUrl && (
                      <div className="relative group shrink-0 w-full lg:w-48 aspect-square rounded-2xl overflow-hidden border-2 border-primary/25 bg-muted/40 shadow-sm flex items-center justify-center">
                        <img
                          src={blueprint.generatedImageUrl}
                          alt={blueprint.productTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex flex-col justify-between p-2.5">
                          <Badge className="self-start text-[9px] bg-black/60 backdrop-blur-xs text-white border-0">
                            📸 Foto / Modelo
                          </Badge>
                          <a
                            href={blueprint.generatedImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="self-end p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
                            title="Ver imagem original em tamanho real"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Informações Textuais do Projeto */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {blueprint.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                          {blueprint.theme}
                        </Badge>
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                          Preço Sugerido: {formatCurrency(blueprint.recommendedPrice)}
                        </Badge>
                        {blueprint.targetAgeAndName && (
                          <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                            🎂 {blueprint.targetAgeAndName}
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="text-xl font-bold leading-tight text-foreground">
                        {blueprint.productTitle}
                      </CardTitle>

                      <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                        {blueprint.description}
                      </CardDescription>

                      {/* Chips Rápidos de Produção */}
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-lg border">
                          <Layers className="size-3.5 text-primary" /> {blueprint.layers.length} Camadas 3D
                        </span>
                        <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-lg border">
                          <Clock className="size-3.5 text-muted-foreground" /> ~{blueprint.estimatedAssemblyMinutes || 25}min montagem
                        </span>
                        <span className="flex items-center gap-1 bg-muted/50 px-2.5 py-1 rounded-lg border">
                          <Calendar className="size-3.5 text-muted-foreground" /> {blueprint.suggestedLeadTimeDays || 5} dias úteis
                        </span>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 w-full sm:w-44">
                      <Button
                        size="sm"
                        onClick={handleSaveToAcervo}
                        className="text-xs gap-1.5 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                      >
                        <ImageIcon className="size-3.5" />
                        Salvar no Meu Acervo
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSaveToCatalog}
                        disabled={savingProduct}
                        className="text-xs gap-1.5 w-full"
                      >
                        {savingProduct ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <PackagePlus className="size-3.5 text-primary" />
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
                        className="text-xs gap-1.5 w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-300 font-medium"
                      >
                        <Send className="size-3.5" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>


              {/* Central de Prompts para IAs de Imagem (Ideogram, Midjourney, DALL-E, Flux) */}
              <Card className="shadow-sm border-primary/40 overflow-hidden bg-gradient-to-b from-card to-muted/20">
                <CardHeader className="border-b bg-muted/40 pb-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-xs">
                        <Camera className="size-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold">
                            Estúdio de Prompts para IAs de Imagem
                          </CardTitle>
                          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0 text-[10px] font-semibold">
                            Ultra-Realismo
                          </Badge>
                        </div>
                        <CardDescription className="text-xs">
                          Prompts em inglês calibrados para gerar mockups fotográficos perfeitos sem distorções
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {/* Seletor de Plataforma de IA */}
                  <div className="flex flex-wrap gap-1.5 p-1 bg-muted/60 rounded-xl border">
                    <button
                      type="button"
                      onClick={() => setActivePromptTab('gemini')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'gemini'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sparkles className="size-3.5 text-amber-500" />
                      Gemini / Imagen 3 (AI Studio)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('banana')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'banana'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Layers className="size-3.5 text-yellow-600" />
                      3D Fita Banana (Nano Banana)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('ideogram')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'ideogram'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Sparkle className="size-3.5 text-indigo-500" />
                      Ideogram 2.0 (Nomes/Texto)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('midjourney')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'midjourney'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Camera className="size-3.5 text-blue-500" />
                      Midjourney v6 (Hiper-realismo)
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('dalle')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'dalle'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Wand2 className="size-3.5 text-emerald-500" />
                      ChatGPT / DALL-E 3
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('flux')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'flux'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Scissors className="size-3.5 text-purple-500" />
                      Flux.1 / Leonardo AI
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('scene')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'scene'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ShoppingBag className="size-3.5 text-pink-500" />
                      Mesa da Festa Completa
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePromptTab('macro')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activePromptTab === 'macro'
                          ? 'bg-background text-foreground shadow-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Layers className="size-3.5 text-orange-500" />
                      Macro Close-Up
                    </button>
                  </div>

                  {/* Conteúdo do Prompt Ativo */}
                  {(() => {
                    let promptText = '';
                    let title = '';
                    let description = '';
                    let externalLink = '';
                    let externalLabel = '';

                    switch (activePromptTab) {
                      case 'gemini':
                        promptText =
                          blueprint.realisticPrompts?.geminiImagenPrompt || blueprint.suggestedImagePrompt;
                        title = 'Google Gemini / Imagen 3 — Google AI Studio';
                        description =
                          'Calibrado especificamente para o motor Gemini 2.5 Flash / Imagen 3 do Google AI Studio com foco em fidelidade de corte, camadas 3D e iluminação comercial suave.';
                        externalLink = 'https://aistudio.google.com';
                        externalLabel = 'Abrir Google AI Studio';
                        break;
                      case 'banana':
                        promptText =
                          blueprint.realisticPrompts?.bananaTape3dPrompt || blueprint.suggestedImagePrompt;
                        title = 'Efeito 3D com Fita Banana (Nano Banana) — Construção Volumétrica & Espuma EVA';
                        description =
                          'Destaca explicitamente a elevação milimétrica da fita banana entre as camadas de papéis Colorplus e Lamicote, com sombras físicas reais e palitos acrílicos transparentes.';
                        externalLink = 'https://ideogram.ai';
                        externalLabel = 'Testar no Ideogram / Gemini';
                        break;
                      case 'ideogram':
                        promptText =
                          blueprint.realisticPrompts?.ideogramPrompt || blueprint.suggestedImagePrompt;
                        title = 'Ideogram 2.0 — Renderização Exata de Nomes e Idades';
                        description =
                          'O Ideogram é a melhor IA para tipografia. Ele escreve exatamente o nome da criança e idade sem erros ortográficos e renderiza o lamicote dourado espelhado com perfeição.';
                        externalLink = 'https://ideogram.ai';
                        externalLabel = 'Abrir Ideogram.ai';
                        break;
                      case 'midjourney':
                        promptText =
                          blueprint.realisticPrompts?.midjourneyPrompt || blueprint.suggestedImagePrompt;
                        title = 'Midjourney v6 — Hiper-realismo Fotográfico de Estúdio';
                        description =
                          'Formatação técnica com lentes macro f/2.8, iluminação comercial suave e textura real de papel Colorplus e fita banana 3D. Inclui parâmetros --v 6.0 --style raw.';
                        externalLink = 'https://www.midjourney.com';
                        externalLabel = 'Abrir Midjourney';
                        break;
                      case 'dalle':
                        promptText =
                          blueprint.realisticPrompts?.dallePrompt || blueprint.suggestedImagePrompt;
                        title = 'ChatGPT / DALL-E 3 — Foto de Produto para Catálogo e Vitrine';
                        description =
                          'Prompt descritivo focado em iluminação comercial suave e apresentação impecável do produto sobre um bolo decorado para catálogo da loja.';
                        externalLink = 'https://chatgpt.com';
                        externalLabel = 'Abrir ChatGPT';
                        break;
                      case 'flux':
                        promptText =
                          blueprint.realisticPrompts?.fluxPrompt || blueprint.suggestedImagePrompt;
                        title = 'Flux.1 / Leonardo AI — Detalhe de Relevo e Linhas de Plotter';
                        description =
                          'Calibrado para realçar a precisão dos cortes de lâmina da Silhouette e a tridimensionalidade das camadas com fita banana.';
                        externalLink = 'https://leonardo.ai';
                        externalLabel = 'Abrir Leonardo AI';
                        break;
                      case 'scene':
                        promptText =
                          blueprint.realisticPrompts?.partyTableScenePrompt || blueprint.suggestedImagePrompt;
                        title = 'Cenário Completo — Mesa de Festa e Decoração do Tema';
                        description =
                          'Fotografia ampla estilo editorial mostrando o bolo principal decorado com o topo, docinhos finos e balões integrados.';
                        externalLink = 'https://ideogram.ai';
                        externalLabel = 'Gerar Cenário no Ideogram';
                        break;
                      case 'macro':
                        promptText =
                          blueprint.realisticPrompts?.macroLayersPrompt || blueprint.suggestedImagePrompt;
                        title = 'Macro Close-Up — Relevo Físico e Acabamento dos Papéis';
                        description =
                          'Close-up extremo evidenciando a distância de 2mm da fita banana, o brilho do lamicote e a gramatura dos papéis.';
                        externalLink = 'https://www.midjourney.com';
                        externalLabel = 'Gerar Macro no Midjourney';
                        break;
                    }

                    return (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              {title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">{description}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyPrompt(promptText, activePromptTab)}
                              className="text-xs gap-1.5 h-8 bg-background hover:bg-muted font-medium"
                            >
                              {copiedPromptKey === activePromptTab ? (
                                <>
                                  <Check className="size-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-semibold">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3.5" />
                                  Copiar Prompt
                                </>
                              )}
                            </Button>

                            <a
                              href={externalLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 h-8 shadow-xs"
                            >
                              <ExternalLink className="size-3.5" />
                              {externalLabel}
                            </a>
                          </div>
                        </div>

                        {/* Caixa de Texto do Prompt com Estilo de Código */}
                        <div className="relative group">
                          <pre className="p-3.5 rounded-xl bg-muted/70 dark:bg-muted/40 border text-xs font-mono whitespace-pre-wrap break-words text-foreground/90 leading-relaxed max-h-48 overflow-y-auto select-all">
                            {promptText}
                          </pre>
                        </div>

                        {/* Chips Modificadores Rápidos */}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Sparkle className="size-3" /> Modificadores Rápidos:
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              const modified = `${promptText}, isolated on clean seamless pure white studio background`;
                              handleCopyPrompt(modified, `${activePromptTab}_white_bg`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-background border hover:bg-muted text-foreground/80 transition-colors"
                          >
                            + Fundo Branco Estúdio
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const modified = `${promptText}, placed on top of a minimalist white fondant cake with pastel sprinkles`;
                              handleCopyPrompt(modified, `${activePromptTab}_fondant_cake`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-background border hover:bg-muted text-foreground/80 transition-colors"
                          >
                            + Em cima do Bolo
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const modified = `${promptText}, with 3D handmade paper flowers and glitter accents`;
                              handleCopyPrompt(modified, `${activePromptTab}_flowers`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-background border hover:bg-muted text-foreground/80 transition-colors"
                          >
                            + Flores & Glitter 3D
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const modified = `${promptText}, soft warm natural morning window lighting, cinematic photography`;
                              handleCopyPrompt(modified, `${activePromptTab}_morning_light`);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-background border hover:bg-muted text-foreground/80 transition-colors"
                          >
                            + Luz Natural Suave
                          </button>
                        </div>

                        {/* Banner: Inserir imagem gerada na outra IA para extrair corte */}
                        <div className="mt-3 p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                              <Camera className="size-3.5 text-purple-600 dark:text-purple-400" />
                              Já gerou a imagem no Midjourney / Ideogram / Gemini?
                            </span>
                            <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 leading-snug">
                              Envie o resultado gerado e a IA fará a <strong>Engenharia Reversa Visual</strong> das camadas para gerar os arquivos SVG de corte da Silhouette/Cricut!
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setIsReverseEngineerDialogOpen(true)}
                            className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shrink-0 shadow-xs"
                          >
                            <Camera className="size-3.5 mr-1" />
                            Ler Imagem e Gerar Corte
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Visualização de Mockup / Anexo de Imagem e Simulador 3D */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Mockup do Produto ou Painel de Anexar Imagem */}
                <div className="md:col-span-6">
                  <Card className="h-full shadow-sm overflow-hidden flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <ImageIcon className="size-4 text-primary" />
                          Mockup Visual do Produto
                        </CardTitle>

                        <div className="flex items-center gap-2">
                          {blueprint.generatedImageUrl && (
                            <a
                              href={blueprint.generatedImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={`Mockup_${blueprint.productTitle.replace(/\s+/g, '_')}.jpg`}
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                            >
                              <Download className="size-3" />
                              Baixar
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAttachingImage(!isAttachingImage)}
                            className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="size-3 mr-1" />
                            {blueprint.generatedImageUrl ? 'Trocar Imagem' : 'Anexar Imagem Gerada'}
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs">
                        {blueprint.generatedImageUrl
                          ? 'Conceito visual para vitrine da lojinha e catálogo'
                          : 'Gere a imagem no Ideogram/Midjourney e anexe a URL ou foto aqui'}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 flex flex-col items-center justify-center flex-1 space-y-3">
                      {isAttachingImage && (
                        <div className="w-full p-3 rounded-xl bg-muted/60 border space-y-2 text-xs">
                          <Label className="text-[11px] font-semibold">URL da Imagem Gerada (ou link do Ideogram/Discord)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="https://..."
                              value={customImageUrl}
                              onChange={(e) => setCustomImageUrl(e.target.value)}
                              className="h-8 text-xs"
                            />
                            <Button
                              size="sm"
                              onClick={handleAttachCustomImage}
                              disabled={!customImageUrl.trim()}
                              className="h-8 text-xs shrink-0"
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      )}

                      {blueprint.generatedImageUrl ? (
                        <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden shadow-md border bg-muted/30 group">
                          <img
                            src={blueprint.generatedImageUrl}
                            alt={blueprint.productTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="text-xs text-white font-medium truncate">
                              {blueprint.productTitle}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full aspect-square max-w-[320px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center space-y-2 bg-muted/20">
                          <div className="p-3 rounded-full bg-primary/10 text-primary">
                            <Camera className="size-6" />
                          </div>
                          <p className="text-xs font-semibold">Nenhuma imagem anexada</p>
                          <p className="text-[11px] text-muted-foreground max-w-[220px]">
                            Copie o prompt do <strong>Ideogram</strong> ou <strong>Midjourney</strong> acima para gerar um mockup perfeito.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsAttachingImage(true)}
                            className="text-xs h-8 gap-1.5"
                          >
                            <Plus className="size-3.5" />
                            Anexar Link da Imagem
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Visualizador 3D das Camadas Sobrepostas */}
                <div className="md:col-span-6">
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
              </div>

              {/* Raio-X Detalhado das Camadas */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Scissors className="size-4 text-primary" />
                    Raio-X de Camadas de Corte (Silhouette & Lâmina)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ordem de corte, tipos de papel comercial e calibração de lâmina
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {blueprint.layers.map((layer, index) => {
                      const isSelected = selectedLayerIndex === index;
                      return (
                        <div
                          key={layer.order}
                          onClick={() => {
                            setSelectedLayerIndex(isSelected ? null : index);
                            setSelectedCutSheetIndex(index);
                          }}
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

                          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
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
                  </div>
                </CardContent>
              </Card>

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

              {/* Módulo 1: Orçamento Instantâneo por Imagem & Proposta para WhatsApp */}
              {costingCalculation?.costing && (
                <Card className="shadow-sm border-emerald-500/30 overflow-hidden">
                  <CardHeader className="border-b bg-emerald-500/5 pb-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                          <Calculator className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-foreground">
                              Orçamento Instantâneo & Precificação de Venda
                            </CardTitle>
                            <Badge className="bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-0 text-[10px] font-bold">
                              Margem {customProfitMargin}%
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            Cálculo de custos de produção, mão de obra e proposta comercial formatada para o cliente
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm font-bold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40">
                          Sugerido: {formatCurrency(costingCalculation.costing.suggestedPrice)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-5">
                    {/* Grade de Composição de Custos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <ShoppingBag className="size-3 text-muted-foreground" /> Materiais & Papéis
                        </span>
                        <p className="text-base font-bold text-foreground">
                          {formatCurrency(costingCalculation.costing.materialsCost)}
                        </p>
                        <span className="text-[9px] text-muted-foreground block">
                          Papéis nobres + fita/cola
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" /> Mão de Obra
                        </span>
                        <p className="text-base font-bold text-foreground">
                          {formatCurrency(costingCalculation.costing.laborCost)}
                        </p>
                        <span className="text-[9px] text-muted-foreground block">
                          ~{costingCalculation.costing.laborMinutes}min a {formatCurrency(customHourlyRate)}/h
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border bg-card/60 space-y-1">
                        <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                          <Coins className="size-3 text-muted-foreground" /> Custos Indiretos
                        </span>
                        <p className="text-base font-bold text-foreground">
                          {formatCurrency(costingCalculation.costing.overheadCost)}
                        </p>
                        <span className="text-[9px] text-muted-foreground block">
                          Energia, desgaste e lâmina
                        </span>
                      </div>

                      <div className="p-3 rounded-xl border bg-muted/40 space-y-1 border-primary/20">
                        <span className="text-[10px] text-foreground font-semibold flex items-center gap-1">
                          <Calculator className="size-3 text-primary" /> Custo de Produção
                        </span>
                        <p className="text-base font-bold text-primary">
                          {formatCurrency(costingCalculation.costing.totalProductionCost)}
                        </p>
                        <span className="text-[9px] text-muted-foreground block">
                          Custo total antes da margem
                        </span>
                      </div>
                    </div>

                    {/* Controles de Margem e Lucro Líquido */}
                    <div className="p-4 rounded-xl bg-muted/20 border border-muted-foreground/10 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-foreground">
                              Margem de Lucro Desejada:
                            </span>
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {customProfitMargin}%
                            </span>
                          </div>
                          <Slider
                            value={[customProfitMargin]}
                            min={25}
                            max={75}
                            step={5}
                            onValueChange={(vals) => setCustomProfitMargin(vals[0])}
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <div>
                            <span className="text-[10px] text-muted-foreground font-medium block">
                              Lucro Líquido Estimado
                            </span>
                            <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                              +{formatCurrency(costingCalculation.costing.netProfit)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground font-medium block">
                              Preço Final de Venda
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {formatCurrency(costingCalculation.costing.suggestedPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Proposta Comercial Pronta para WhatsApp */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <MessageCircle className="size-4 text-emerald-600" />
                          Mensagem Pronta para WhatsApp da Cliente
                        </Label>
                        <span className="text-[11px] text-muted-foreground">
                          Copie ou envie com 1 clique
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs text-foreground font-sans whitespace-pre-line leading-relaxed shadow-inner">
                        {costingCalculation.costing.whatsappProposal}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          onClick={handleCopyProposal}
                          className={`flex-1 gap-2 font-semibold shadow-xs ${
                            copiedProposal
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {copiedProposal ? (
                            <CheckCheck className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                          {copiedProposal ? 'Proposta Copiada!' : 'Copiar Mensagem para WhatsApp'}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={handleSendWhatsApp}
                          className="gap-2 text-xs border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
                        >
                          <Share2 className="size-3.5" />
                          Abrir no WhatsApp
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Módulo 2: Mapeador de Papéis Comerciais & Separação de Estoque (BOM) */}
              {costingCalculation?.commercialPapers && costingCalculation.commercialPapers.length > 0 && (
                <Card className="shadow-sm border-primary/30">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 shadow-xs">
                          <Palette className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold">
                              Mapeamento de Papéis Comerciais & Separação (BOM)
                            </CardTitle>
                            <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-0 text-[10px] font-semibold">
                              {costingCalculation.commercialPapers.length} Camadas Físicas
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            Mapeamento real para marcas Fedrigoni Colorplus, Lamicote, Suzano Offset e Kraft Klabin
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Tabela de Papéis Comerciais Mapeados */}
                    <div className="space-y-2.5">
                      {costingCalculation.commercialPapers.map((paper) => {
                        const inStock = stockChecks[paper.layerOrder] ?? false;
                        return (
                          <div
                            key={paper.layerOrder}
                            className="p-3 rounded-xl border bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="size-7 rounded-full border border-black/20 shrink-0 shadow-xs flex items-center justify-center text-[10px] font-bold text-white drop-shadow-xs"
                                style={{ backgroundColor: paper.detectedColorHex }}
                              >
                                {paper.layerOrder}
                              </div>

                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground">
                                    {paper.commercialPaperName}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1.5 py-0 ${
                                      paper.finishType === 'Metálico Espelhado'
                                        ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30'
                                        : paper.finishType === 'Glitter'
                                        ? 'border-purple-500 text-purple-700 bg-purple-50 dark:bg-purple-950/30'
                                        : paper.finishType === 'Kraft Rústico'
                                        ? 'border-amber-700 text-amber-800 bg-amber-50 dark:bg-amber-950/30'
                                        : 'border-muted-foreground/30 text-muted-foreground'
                                    }`}
                                  >
                                    {paper.finishType}
                                  </Badge>
                                </div>

                                <p className="text-[11px] text-muted-foreground">
                                  <strong>Finalidade:</strong> {paper.usageRole} • <strong>Linha:</strong> {paper.commercialBrand} ({paper.recommendedGramature})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                              <span className="font-mono text-[11px] text-muted-foreground">
                                ~{formatCurrency(paper.estimatedCostPerSheet)}/fl
                              </span>

                              <Button
                                size="sm"
                                variant={inStock ? 'default' : 'outline'}
                                onClick={() => handleToggleStock(paper.layerOrder)}
                                className={`h-7 text-xs gap-1.5 px-2.5 ${
                                  inStock
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {inStock ? (
                                  <Check className="size-3" />
                                ) : (
                                  <CheckSquare className="size-3" />
                                )}
                                {inStock ? 'Em Estoque' : 'Separar'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Lista de Aviamentos & Consumíveis */}
                    {blueprint.toolsAndAccessories && blueprint.toolsAndAccessories.length > 0 && (
                      <div className="p-3 rounded-xl bg-muted/30 border space-y-2">
                        <span className="font-semibold text-xs text-foreground block flex items-center gap-1.5">
                          <ShoppingBag className="size-3.5 text-primary" /> Aviamentos & Insumos de Montagem:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {blueprint.toolsAndAccessories.map((tool, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs font-normal bg-background">
                              • {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Seção: Gabarito de Montagem em Camadas (Passo a Passo Físico) */}
              {blueprint.assemblySteps && blueprint.assemblySteps.length > 0 && (
                <Card className="shadow-sm border-primary/30">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">
                          Gabarito de Montagem em Camadas (Passo a Passo Físico)
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Ordem exata de colagem e elevação com fita banana e tipos de adesivos
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {blueprint.assemblySteps.map((step) => (
                        <div
                          key={step.stepNumber}
                          className="p-3.5 rounded-xl border bg-card hover:bg-muted/20 transition-all space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="size-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs shrink-0">
                                {step.stepNumber}
                              </span>
                              <span className="font-bold text-foreground">
                                {step.actionTitle}
                              </span>
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-[10px] shrink-0 font-medium ${
                                step.adhesiveType === 'Fita Banana 2mm'
                                  ? 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-300'
                                  : step.adhesiveType === 'Cola Quente'
                                  ? 'border-red-500 text-red-700 bg-red-50 dark:bg-red-950/30 dark:text-red-300'
                                  : 'border-blue-500 text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300'
                              }`}
                            >
                              {step.adhesiveType}
                            </Badge>
                          </div>

                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {step.description}
                          </p>

                          {step.componentsInvolved && step.componentsInvolved.length > 0 && (
                            <div className="pt-1 flex flex-wrap gap-1">
                              {step.componentsInvolved.map((comp, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium"
                                >
                                  {comp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Diálogo do Acervo de Imagens do Ateliê */}
      <Dialog open={isAcervoDialogOpen} onOpenChange={setIsAcervoDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ImageIcon className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    Acervo de Imagens do Ateliê ({acervoList.length} itens)
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Seu portfólio de fotos reais e criações anteriores que alimentam a IA com o estilo visual do seu ateliê.
                  </DialogDescription>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddingToAcervo(!isAddingToAcervo)}
                className="text-xs gap-1.5 h-8 font-semibold shadow-xs"
              >
                <Plus className="size-3.5" />
                {isAddingToAcervo ? 'Ver Acervo' : 'Adicionar Foto ao Acervo'}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
            {/* Formulário de Adicionar Nova Foto ao Acervo */}
            {isAddingToAcervo && (
              <Card className="border-primary/40 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-primary/20">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="size-3.5 text-primary" />
                    Nova Foto / Criação para o Acervo
                  </span>
                  <span className="text-[10px] text-muted-foreground">Alimenta a IA com seu padrão visual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Título do Produto / Peça *</Label>
                    <Input
                      placeholder="Ex: Topo Safari Baby 2024"
                      value={newAcervoTitle}
                      onChange={(e) => setNewAcervoTitle(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Tema da Peça *</Label>
                    <Input
                      placeholder="Ex: Safari Baby, Jardim, Circo Rosa"
                      value={newAcervoTheme}
                      onChange={(e) => setNewAcervoTheme(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Categoria</Label>
                    <select
                      value={newAcervoCategory}
                      onChange={(e) => setNewAcervoCategory(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      {PRODUCT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">URL da Imagem ou Arquivo *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://..."
                        value={newAcervoImageUrl}
                        onChange={(e) => setNewAcervoImageUrl(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => acervoFileInputRef.current?.click()}
                        className="h-8 px-2.5 text-xs font-medium shrink-0 shadow-xs"
                      >
                        <Camera className="size-3.5 mr-1 text-primary" />
                        Arquivo
                      </Button>
                      <input
                        ref={acervoFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Detalhes das Camadas / Papéis Utilizados (Opcional)</Label>
                  <Textarea
                    placeholder="Ex: Camadas em Colorplus Kraft 240g e Santiago com fita banana 2mm e lamicote ouro..."
                    value={newAcervoDescription}
                    onChange={(e) => setNewAcervoDescription(e.target.value)}
                    rows={2}
                    className="text-xs bg-background resize-none"
                  />
                </div>

                {newAcervoImageUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-background border">
                    <img
                      src={newAcervoImageUrl}
                      alt="Pré-visualização"
                      className="size-12 rounded object-cover border"
                    />
                    <div className="text-[11px]">
                      <span className="font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Foto Carregada
                      </span>
                      <span className="text-muted-foreground line-clamp-1">{newAcervoTitle || 'Sem título'}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingToAcervo(false)}
                    className="text-xs h-8"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddNewAcervoItem}
                    className="text-xs h-8 font-semibold shadow-xs"
                  >
                    Salvar no Acervo
                  </Button>
                </div>
              </Card>
            )}

            {/* Barra de Busca e Filtro do Acervo */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Buscar no acervo por tema, nome ou categoria..."
                value={acervoSearchTerm}
                onChange={(e) => setAcervoSearchTerm(e.target.value)}
                className="h-8 text-xs bg-muted/30"
              />
            </div>

            {/* Galeria de Fotos do Acervo */}
            {(() => {
              const filtered = acervoList.filter(
                (item) =>
                  item.title.toLowerCase().includes(acervoSearchTerm.toLowerCase()) ||
                  item.theme.toLowerCase().includes(acervoSearchTerm.toLowerCase()) ||
                  item.category.toLowerCase().includes(acervoSearchTerm.toLowerCase()) ||
                  (item.tags && item.tags.some((t) => t.toLowerCase().includes(acervoSearchTerm.toLowerCase())))
              );

              if (filtered.length === 0) {
                return (
                  <div className="text-center p-8 rounded-xl border border-dashed text-muted-foreground space-y-2">
                    <ImageIcon className="size-8 mx-auto text-muted-foreground/50" />
                    <p className="text-xs font-semibold">Nenhuma imagem encontrada no acervo</p>
                    <p className="text-[11px]">
                      Clique em <strong>"+ Adicionar Foto ao Acervo"</strong> acima para cadastrar criações do seu ateliê.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((item) => {
                    const isSelectedAsRef = activeAcervoRef?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border overflow-hidden transition-all flex flex-col justify-between group ${
                          isSelectedAsRef
                            ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-sm'
                            : 'bg-card hover:shadow-xs hover:border-primary/40'
                        }`}
                      >
                        {/* Imagem do Acervo */}
                        <div className="relative aspect-video w-full bg-muted/40 overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAcervoItem(item.id)}
                              className="size-6 p-0 rounded-full bg-black/50 text-white hover:bg-destructive hover:text-white"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                          <div className="absolute bottom-2 left-2">
                            <Badge className="bg-black/60 backdrop-blur-xs text-white text-[9px] px-1.5 py-0 border-0">
                              {item.category}
                            </Badge>
                          </div>
                        </div>

                        {/* Conteúdo do Card */}
                        <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="font-semibold text-xs text-foreground line-clamp-1">
                              {item.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              Tema: <strong>{item.theme}</strong>
                            </p>
                            {item.description && (
                              <p className="text-[10px] text-muted-foreground/90 line-clamp-2 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between gap-2">
                            <Button
                              size="sm"
                              variant={isSelectedAsRef ? 'default' : 'outline'}
                              onClick={() => handleSelectAcervoReference(item)}
                              className="text-xs h-7 w-full font-semibold gap-1"
                            >
                              {isSelectedAsRef ? (
                                <>
                                  <Check className="size-3" />
                                  Referência Ativa
                                </>
                              ) : (
                                <>
                                  <Sparkles className="size-3 text-amber-500" />
                                  Usar como Referência
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDatasetJsonl}
              disabled={acervoList.length === 0}
              className="text-xs gap-1.5 w-full sm:w-auto text-primary border-primary/30 hover:bg-primary/5"
            >
              <FileDown className="size-3.5" />
              Baixar Dataset do Acervo (.JSONL)
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAcervoDialogOpen(false)}
              className="text-xs w-full sm:w-auto"
            >
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Configuração da Chave da API Gemini e Modelo Tuned */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Settings className="size-4 text-primary" />
              Configurar Inteligência Artificial (Gemini)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure sua chave gratuita do Google AI Studio e personalize seu modelo de IA com base no seu Acervo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="gemini-key-input" className="text-xs font-semibold">
                Google AI Studio API Key *
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

            <div className="space-y-1.5">
              <Label htmlFor="gemini-tuned-input" className="text-xs font-semibold flex items-center justify-between">
                <span>ID do Modelo Tuned (Opcional)</span>
                <Badge variant="outline" className="text-[9px]">Avançado</Badge>
              </Label>
              <Input
                id="gemini-tuned-input"
                placeholder="Ex: tunedModels/luisices-papercraft-v1"
                value={tunedModelInput}
                onChange={(e) => setTunedModelInput(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Se você treinou um modelo exclusivo com seu Acervo no Google AI Studio, cole o ID aqui.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-muted/60 text-[11px] text-muted-foreground space-y-1.5">
              <p>
                <strong>💡 Como a IA aprende com o seu Acervo de Imagens?</strong>
              </p>
              <p>
                1. <strong>Contexto Visual e Multimodal:</strong> Ao escolher uma foto do seu <em>Acervo</em> como referência, a IA analisa a paleta de cores, o estilo das camadas e o tipo de papel para reproduzir a mesma harmonia visual.
              </p>
              <p>
                2. <strong>Fine-Tuning no Google AI Studio:</strong> Clique em <em>"Baixar Dataset do Acervo"</em> na tela do Acervo e importe o arquivo <code>.jsonl</code> no{' '}
                <a
                  href="https://aistudio.google.com/app/tuned_models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium inline-flex items-center gap-0.5"
                >
                  Google AI Studio <ExternalLink className="size-3" />
                </a>{' '}
                para treinar a IA exclusivamente com o histórico do seu ateliê.
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
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Engenharia Reversa Visual por Imagem (Leitor de Imagem Multimodal) */}
      <Dialog open={isReverseEngineerDialogOpen} onOpenChange={setIsReverseEngineerDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-purple-950 dark:text-purple-200">
              <div className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                <Camera className="size-4" />
              </div>
              Engenharia Reversa Visual por Imagem (IA Multimodal)
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Suba uma foto de um produto real ou uma imagem gerada por qualquer IA (Midjourney, Ideogram, Imagen 3, Gemini Nano Banana).
              Nossa IA inspecionará a peça, detectará camadas, papéis, tema, nome/idade e criará a <strong>Matriz de Corte Vetorial (SVG)</strong> pronta para corte na sua plotter!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Área de Seleção / Upload de Imagem */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Foto do Produto ou Imagem Gerada *</Label>

              {!reverseImagePreview ? (
                <div>
                  <div
                    onDragOver={handleReverseImageDragOver}
                    onDragLeave={handleReverseImageDragLeave}
                    onDrop={handleReverseImageDrop}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      reverseFileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                      isDraggingImage
                        ? 'border-purple-600 bg-purple-100/60 dark:bg-purple-900/40 ring-2 ring-purple-400 scale-[1.01]'
                        : 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50/70 hover:border-purple-400'
                    }`}
                  >
                    <Camera className="size-10 mx-auto text-purple-600 mb-2" />
                    <p className="text-xs font-bold text-foreground">
                      {isDraggingImage ? 'Solte a imagem aqui!' : 'Arraste ou clique para selecionar a imagem'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      PNG, JPG, WEBP (Mockup gerado por IA ou Foto Real do Ateliê)
                    </p>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          reverseFileInputRef.current?.click();
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
                      >
                        <Plus className="size-3.5 mr-1" />
                        Escolher Arquivo do Computador
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (acervoList.length > 0) {
                            setReverseImagePreview(acervoList[0].imageUrl);
                            toast.info(`Imagem "${acervoList[0].title}" carregada do Acervo!`);
                          } else {
                            toast.warning('Nenhum item no acervo.');
                          }
                        }}
                        className="text-xs border-purple-300 text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                      >
                        <ImageIcon className="size-3.5 mr-1" />
                        Usar do Acervo
                      </Button>
                    </div>
                  </div>

                  <input
                    ref={reverseFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReverseImageFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-purple-200 bg-muted/40 group shadow-xs">
                    <img
                      src={reverseImagePreview}
                      alt="Pré-visualização para análise visual"
                      className="w-full h-full object-contain bg-black/5"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => reverseFileInputRef.current?.click()}
                        className="text-[11px] h-7 bg-background/90 backdrop-blur-xs shadow-xs"
                      >
                        <RefreshCw className="size-3 mr-1" />
                        Trocar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setReverseImagePreview('')}
                        className="text-[11px] h-7 px-2"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <input
                    ref={reverseFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleReverseImageFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Inserir por URL alternativa */}
            <div className="space-y-1">
              <Label htmlFor="reverse-url-input" className="text-[11px] font-medium text-muted-foreground">
                Ou cole a URL direta de uma imagem:
              </Label>
              <div className="flex gap-2">
                <Input
                  id="reverse-url-input"
                  placeholder="https://exemplo.com/foto-topo.jpg"
                  value={reverseImagePreview.startsWith('http') ? reverseImagePreview : ''}
                  onChange={(e) => setReverseImagePreview(e.target.value)}
                  className="text-xs"
                />
                {reverseImagePreview.startsWith('http') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setReverseImagePreview('')}
                    className="text-xs shrink-0"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Briefing Livre & Observações do Pedido da Imagem */}
            <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-primary/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="reverse-user-notes" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Briefing Livre & Observações da Imagem
                </Label>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/40 text-primary font-semibold">
                  Campo Livre
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Escreva qualquer instrução adicional: o nome/idade exatos para colocar, alterações de cores, troca de tema mantendo a estrutura, ou acabamentos específicos.
              </p>
              <Textarea
                id="reverse-user-notes"
                placeholder="Ex: Quero manter esta mesma estrutura de camadas da foto, mas mudar para o tema Safari Rosa no nome 'Maitê - 1 ano', usando acetato no shaker e lamicote rose gold..."
                value={reverseUserNotes}
                onChange={(e) => setReverseUserNotes(e.target.value)}
                rows={3}
                className="text-xs resize-y bg-background font-sans leading-relaxed"
              />
            </div>

            {/* Terminal em Tempo Real dentro do Modal durante Análise */}
            {(analyzingImage || (isReverseEngineerDialogOpen && (liveLogs.length > 0 || liveStreamingText.length > 0))) && (
              <div className="rounded-xl border border-purple-800/80 bg-slate-950 text-slate-100 p-3 space-y-2.5 font-mono shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Terminal className="size-3.5 text-purple-400" />
                      Análise Multimodal em Tempo Real
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-500/40 text-purple-300 bg-purple-950/40">
                    {liveProgressPercent}%
                  </Badge>
                </div>

                {/* Barra de Progresso */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-purple-300 font-medium truncate flex items-center gap-1">
                      <Activity className="size-3 animate-pulse text-purple-400" />
                      {liveCurrentStage || 'Inspecionando Imagem...'}
                    </span>
                    <span className="text-slate-400 truncate max-w-[200px]">{liveCurrentMessage}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(5, liveProgressPercent)}%` }}
                    />
                  </div>
                </div>

                {/* Logs Recentes */}
                {liveLogs.length > 0 && (
                  <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1 text-[10px] text-slate-300 scrollbar-thin">
                    {liveLogs.slice(-5).map((log) => (
                      <div key={log.id} className="flex items-start gap-1.5">
                        <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                        <span
                          className={
                            log.logType === 'success'
                              ? 'text-emerald-400 font-semibold'
                              : log.logType === 'warn'
                              ? 'text-amber-400'
                              : log.logType === 'error'
                              ? 'text-red-400'
                              : 'text-slate-300'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Streaming de Texto em Tempo Real */}
                {liveStreamingText && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-purple-300 flex items-center gap-1">
                      <Radio className="size-2.5 animate-pulse text-emerald-400" />
                      Stream de Tokens da IA (Ao Vivo):
                    </span>
                    <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-300/90 whitespace-pre-wrap break-words max-h-28 overflow-y-auto leading-relaxed select-all">
                      {liveStreamingText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Dica Informativa */}
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <Sparkles className="size-3.5 text-purple-600" />
                Como funciona a leitura multimodal:
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-purple-800/90 dark:text-purple-300/90 text-[10px]">
                <li><strong>Visão Computacional:</strong> Decompõe a imagem em camadas (fundo, moldura, apliques 3D, shaker, nome).</li>
                <li><strong>Vetorização de Corte:</strong> Gera pranchas SVG calibradas com linhas de corte (<span className="text-red-600 font-bold">vermelho</span>) e vinco (<span className="text-blue-600 font-bold">azul</span>).</li>
                <li><strong>Lista de Materiais:</strong> Mapeia as cores da imagem para papéis Colorplus e Lamicote comerciais.</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReverseEngineerDialogOpen(false)}
              disabled={analyzingImage}
              className="text-xs"
            >
              Cancelar
            </Button>

            <Button
              size="sm"
              onClick={handleRunReverseEngineer}
              disabled={!reverseImagePreview || analyzingImage}
              className="text-xs bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              {analyzingImage ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Inspecionando Camadas & Gerando Corte...
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" />
                  🔍 Inspecionar e Criar Matriz de Corte
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default AiProductGenerator;

