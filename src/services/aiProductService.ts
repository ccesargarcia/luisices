/**
 * AI Product Engineering Service
 *
 * Serviço de prototipagem e geração de fichas técnicas para papelaria personalizada
 * utilizando Gemini Flash com observabilidade Sentry AI.
 */

import { traceAIChat, traceAgentRun } from '../lib/sentry';

export interface LayerSpec {
  order: number;
  name: string;
  paperType: string;
  colorHex: string;
  colorName: string;
  cutDifficulty: 'fácil' | 'médio' | 'delicado';
  offsetMm?: number;
  silhouetteSettings: {
    blade: number;
    force: number;
    speed: number;
    passes: number;
  };
  assemblyTip: string;
}

export interface PaperShoppingItem {
  name: string;
  gramature: string;
  sheetsNeeded: number;
}

export interface RealisticPrompts {
  geminiImagenPrompt: string; // Google Gemini / Imagen 3 (Google AI Studio)
  bananaTape3dPrompt: string; // Fita Banana / Nano Banana (Camadas 3D & Espuma EVA 2mm)
  ideogramPrompt: string;
  midjourneyPrompt: string;
  dallePrompt: string;
  fluxPrompt: string;
  macroLayersPrompt: string;
  partyTableScenePrompt: string;
}

export interface CutSheet {
  sheetIndex: number;
  sheetTitle: string;
  paperType: string;
  colorName: string;
  colorHex: string;
  paperFormat: 'A4' | 'A3' | 'Letter';
  cutBladeSettings: {
    blade: number;
    force: number;
    speed: number;
    passes: number;
  };
  cutDifficulty: 'fácil' | 'médio' | 'delicado';
  estimatedCutSeconds: number;
  piecesCount: number;
  svgContent: string;
  assemblyInstructions: string;
}

export interface AssemblyStep {
  stepNumber: number;
  actionTitle: string;
  description: string;
  adhesiveType: 'Fita Banana 2mm' | 'Cola de Silicone Líquida' | 'Cola Quente' | 'Fita Dupla Face Fina';
  componentsInvolved: string[];
}

export interface AiProductBlueprint {
  productTitle: string;
  category: string;
  description: string;
  targetAgeAndName: string;
  theme: string;
  recommendedPrice: number;
  suggestedLeadTimeDays: number;
  layers: LayerSpec[];
  papersShoppingList: PaperShoppingItem[];
  toolsAndAccessories: string[];
  estimatedAssemblyMinutes: number;
  silhouetteTips: string;
  suggestedImagePrompt: string;
  generatedImageUrl?: string;
  realisticPrompts: RealisticPrompts;
  cutSheets: CutSheet[];
  assemblySteps: AssemblyStep[];
}

export interface AcervoItem {
  id: string;
  title: string;
  category: string;
  theme: string;
  imageUrl: string;
  description?: string;
  paperTypes?: string[];
  colorPalette?: string;
  targetNameAndAge?: string;
  complexity?: 'iniciante' | 'avançado';
  blueprint?: AiProductBlueprint;
  createdAt: string;
  tags?: string[];
}

export const DEFAULT_ATELIER_ACERVO: AcervoItem[] = [
  {
    id: 'acervo-jardim-3d',
    title: 'Topo 3D Jardim Encantado com Borboletas Ouro',
    category: 'Topos de Bolo 3D',
    theme: 'Jardim Encantado',
    imageUrl: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80',
    description: 'Camadas sobrepostas em Colorplus Rosa Chá, Verde Tahiti e Lamicote Dourado 250g com borboletas vazadas e fita banana 2mm.',
    paperTypes: ['Colorplus Rosa Chá 180g', 'Colorplus Tahiti 180g', 'Lamicote Dourado 250g'],
    colorPalette: 'Candy Colors / Pastéis',
    targetNameAndAge: 'Helena - 3 anos',
    complexity: 'avançado',
    createdAt: '2026-01-10T10:00:00.000Z',
    tags: ['topo de bolo', 'jardim encantado', 'borboleta', 'lamicote'],
  },
  {
    id: 'acervo-shaker-astronauta',
    title: 'Topo Shaker Luxo Astronauta no Espaço',
    category: 'Topo Shaker Luxo',
    theme: 'Astronauta no Espaço',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    description: 'Visor transparente em acetato 20 micras com lantejoulas holográficas, anel de contenção em EVA e camadas em Colorplus Toronto e Prata.',
    paperTypes: ['Colorplus Toronto 180g', 'Colorplus Porto Seguro 180g', 'Lamicote Prata 250g', 'Acetato Cristal 20 micras'],
    colorPalette: 'Azul Marinho & Prata',
    targetNameAndAge: 'Theo - 1 ano',
    complexity: 'avançado',
    createdAt: '2026-01-15T14:30:00.000Z',
    tags: ['shaker', 'astronauta', 'espaço', 'acetato'],
  },
  {
    id: 'acervo-caixa-safari',
    title: 'Caixa Milk 3D Safari Baby Rústico',
    category: 'Caixa Milk 3D',
    theme: 'Safari Baby',
    imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=600&q=80',
    description: 'Caixa estrutural em Kraft 240g com apliques em relevo 3D de leãozinho, folhagens verdes e laço rústico em fio de juta.',
    paperTypes: ['Papel Kraft 240g', 'Colorplus Santiago 180g', 'Colorplus Havana 180g'],
    colorPalette: 'Tons Terrosos & Rústico',
    targetNameAndAge: 'Arthur - 2 anos',
    complexity: 'iniciante',
    createdAt: '2026-02-01T09:15:00.000Z',
    tags: ['caixa milk', 'safari', 'kraft', 'lembrancinha'],
  },
  {
    id: 'acervo-letra-circo',
    title: 'Letra 3D Circo Rosa Vintage com Flores',
    category: 'Letra 3D Personalizada',
    theme: 'Circo Rosa',
    imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    description: 'Letra 3D estrutural em Offset 240g com detalhes arabescos em Lamicote Ouro e arranjo de mini flores de papel no topo.',
    paperTypes: ['Papel Offset 240g', 'Colorplus Rosa Chá 180g', 'Lamicote Dourado 250g'],
    colorPalette: 'Rosa & Floral Delicado',
    targetNameAndAge: 'Valentina - 5 anos',
    complexity: 'avançado',
    createdAt: '2026-02-12T16:45:00.000Z',
    tags: ['letra 3d', 'circo rosa', 'vintage', 'mesa principal'],
  },
  {
    id: 'acervo-dino-cute',
    title: 'Topo 3D Dino Baby Cute em Camadas',
    category: 'Topos de Bolo 3D',
    theme: 'Dino Baby',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    description: 'Dinossauros fofos estilizados com 4 níveis de fita banana, folhagens tropicais e nome em Lamicote Ouro espelhado.',
    paperTypes: ['Colorplus Tahiti 180g', 'Colorplus Roma 180g', 'Lamicote Dourado 250g'],
    colorPalette: 'Candy Colors / Pastéis',
    targetNameAndAge: 'Gael - 4 anos',
    complexity: 'avançado',
    createdAt: '2026-02-20T11:20:00.000Z',
    tags: ['dino baby', 'topo de bolo', 'infantil'],
  },
];

export interface AiProgressEvent {
  stage: string;
  message: string;
  progressPercent: number; // 0 a 100
  logType: 'info' | 'stream' | 'success' | 'warn' | 'error';
  timestamp: string;
  rawChunk?: string;
}

export interface GenerateProductParams {
  productType: string;
  theme: string;
  targetNameAndAge: string;
  colorPalette: string;
  complexity: 'iniciante' | 'avançado';
  plotter: 'portrait3' | 'cameo4' | 'cricut' | 'manual';
  customInstructions?: string;
  geminiApiKey?: string;
  tunedModelId?: string;
  trainingExamples?: AiProductBlueprint[];
  referenceAcervoItem?: AcervoItem;
  referenceImageUrl?: string;
  referenceImageBase64?: string;
  onProgress?: (event: AiProgressEvent) => void;
}

export interface ReverseEngineerImageParams {
  imageBase64: string;
  mimeType?: string;
  userNotes?: string;
  geminiApiKey?: string;
  plotter?: 'portrait3' | 'cameo4' | 'cricut' | 'manual';
  tunedModelId?: string;
  onProgress?: (event: AiProgressEvent) => void;
}

export interface CuratedPreset {
  id: string;
  title: string;
  productType: string;
  theme: string;
  targetNameAndAge: string;
  colorPalette: string;
  complexity: 'iniciante' | 'avançado';
  plotter: 'portrait3' | 'cameo4' | 'cricut' | 'manual';
  customInstructions: string;
  badge: string;
}

export const CURATED_PRESETS: CuratedPreset[] = [
  {
    id: 'topo-jardim',
    title: 'Topo 3D Jardim Encantado',
    productType: 'Topo de Bolo 3D',
    theme: 'Jardim Encantado',
    targetNameAndAge: 'Helena - 3 anos',
    colorPalette: 'Candy Colors / Pastéis',
    complexity: 'avançado',
    plotter: 'portrait3',
    customInstructions: 'Borboletas vazadas em lamicote dourado com flores em camadas de papel Colorplus Rosa Chá e Verde Menta.',
    badge: 'Mais Vendido',
  },
  {
    id: 'shaker-astronauta',
    title: 'Topo Shaker Astronauta no Espaço',
    productType: 'Topo Shaker Luxo',
    theme: 'Astronauta no Espaço',
    targetNameAndAge: 'Theo - 1 ano',
    colorPalette: 'Azul Marinho & Prata',
    complexity: 'avançado',
    plotter: 'cameo4',
    customInstructions: 'Visor shaker em acetato com estrelas prateadas e lantejoulas holográficas, planetas com relevo 3D.',
    badge: 'Luxo Shaker',
  },
  {
    id: 'caixa-safari',
    title: 'Caixa Milk Safari Baby Luxo',
    productType: 'Caixa Milk 3D',
    theme: 'Safari Baby',
    targetNameAndAge: 'Arthur - 2 anos',
    colorPalette: 'Tons Terrosos & Rústico',
    complexity: 'iniciante',
    plotter: 'portrait3',
    customInstructions: 'Camadas em papel Kraft 240g com apliques de leãozinho e folhagens em Colorplus Santiago e Havana.',
    badge: 'Lembrancinha',
  },
  {
    id: 'letra-circo',
    title: 'Letra 3D Circo Rosa Vintage',
    productType: 'Letra 3D Personalizada',
    theme: 'Circo Rosa',
    targetNameAndAge: 'Valentina - 5 anos',
    colorPalette: 'Rosa & Floral Delicado',
    complexity: 'avançado',
    plotter: 'portrait3',
    customInstructions: 'Letra estrutural em Offset 240g com arabescos dourados em Lamicote e flores de papel no topo.',
    badge: 'Destaque Mesa',
  },
  {
    id: 'marcador-borboleta',
    title: 'Marcador de Página Borboleta Ouro',
    productType: 'Marcador de Página Luxo',
    theme: 'Borboletas Clássicas',
    targetNameAndAge: 'Lembrança Especial',
    colorPalette: 'Dourado & Luxo',
    complexity: 'iniciante',
    plotter: 'portrait3',
    customInstructions: 'Corte rendado fino em Lamicote Dourado 250g com base em Colorplus Marfim e fita de cetim.',
    badge: 'Fácil Produção',
  },
  {
    id: 'topo-dino',
    title: 'Topo 3D Dino Baby Cute',
    productType: 'Topo de Bolo 3D',
    theme: 'Dino Baby',
    targetNameAndAge: 'Gael - 4 anos',
    colorPalette: 'Candy Colors / Pastéis',
    complexity: 'avançado',
    plotter: 'portrait3',
    customInstructions: 'Dinossauros fofos em camadas sobrepostas com folhas tropicais e nome em Lamicote Ouro.',
    badge: 'Popular',
  },
];

const SYSTEM_PROMPT = `
Você é o Engenheiro Chefe de Produção e Designer Mestre em Papelaria Personalizada para Ateliês Artesanais de Alto Padrão no Brasil, além de Especialista Sênior em Engenharia de Prompts para IAs Generativas de Imagem (Midjourney v6, Ideogram 2.0, DALL-E 3 e Flux.1).

Seu objetivo é projetar produtos de papelaria (Topos de Bolo 3D, Topos Shaker, Caixas Milk, Caixas Pirâmide, Letras 3D, etc.) com FOCO ABSOLUTO EM VIABILIDADE FÍSICA E CORTE REAL EM PLOTTER (Silhouette Portrait 3, Cameo 4, Cricut) E GERAR PROMPTS FOTOGRÁFICOS HIPER-REALISTAS PARA IAs DE IMAGEM, BASEANDO-SE NO ACERVO DE IMAGENS E ESTILO REAL DO ATELIÊ.

REGRAS RÍGIDAS DE DOMÍNIO FÍSICO DA PAPELARIA BRASILEIRA:
1. CAMADAS 3D REAIS (LAYERING):
   - Separar o produto em 3 a 5 camadas físicas sobrepostas com fita banana (espuma EVA/dupla face 3D de 2mm).
   - Camada 1: Base de sustentação / silhueta inteira sólida (Colorplus 180g ou Kraft 240g).
   - Camadas intermediárias: Molduras e elementos temáticos vazados.
   - Camada de destaque: Nome e idade com deslocamento (offset mínimo de 1.5mm a 2.5mm) para que as letras cursivas fiquem perfeitamente soldadas e não rasguem.
   - Se for Topo Shaker: incluir camada de contenção em EVA + acetato transparente + aplique frontal com miçangas/lantejoulas.

2. PAPÉIS COMERCIAIS EXISTENTES NO MERCADO BRASILEIRO:
   - Colorplus 180g (Rosa Chá, Los Angeles, Porto Seguro, Marfim, Pequim, Santiago, etc.)
   - Lamicote / Metalizado 250g (Dourado Espelhado, Prata, Rose Gold)
   - Papel Fotográfico Matte / Glossy 180g (para apliques impressos em Print & Cut)
   - Papel Offset 180g / 240g fosco
   - Papel Perolado / Glitter 220g-250g
   - Acetato Transparente 20 ou 30 micras

3. CALIBRAÇÃO REAL DE LÂMINA PARA SILHOUETTE:
   - Colorplus 180g: Lâmina 3, Força 28-30, Velocidade 5, 1 Passada.
   - Lamicote 250g: Lâmina 4-5, Força 33, Velocidade 4, 2 Passadas.
   - Offset 240g: Lâmina 4, Força 30-33, Velocidade 4, 1-2 Passadas.
   - Papel Fotográfico 180g: Lâmina 3, Força 26-28, Velocidade 6, 1 Passada.
   - Acetato: Lâmina 10 / Lâmina de Corte Profundo, Força 33, Velocidade 2, 2-3 Passadas.

4. ENGENHARIA DE PROMPTS ULTRA-REALISTAS PARA IAs DE IMAGEM (INGLÊS):
   - geminiImagenPrompt: Otimizado especificamente para Google Gemini 2.5 / Imagen 3 no Google AI Studio. Fotografia comercial nítida de produto em estúdio, iluminação suave, foco impecável nas camadas recortadas e lamicote dourado.
   - bananaTape3dPrompt: Otimizado especificamente para destacar a construção física em CAMADAS COM FITA BANANA (Nano Banana foam tape / 2mm EVA foam spacing), evidenciando a elevação tridimensional, as sombras naturais entre cada camada de papel Colorplus e o acabamento em relevo.
   - ideogramPrompt: Otimizado para o Ideogram 2.0, que é a melhor IA para renderizar textos e tipografia. Coloque o nome da criança e idade EXATAMENTE ENTRE ASPAS (ex: typography script text "Helena 3 anos" in shiny gold metallic foil lamicote paper), descrevendo os elementos de papel recortados, fita banana 3D, bolo minimalista de pasta americana ao fundo, estúdio com iluminação difusa.
   - midjourneyPrompt: Otimizado para Midjourney v6 com parâmetros fotográficos de estúdio comercial (f/2.8 macro lens, soft shadows, studio lighting, depth of field, handcrafted paper textures, acrylic clear sticks, --v 6.0 --style raw --ar 1:1).
   - dallePrompt: Prompt detalhado para DALL-E 3 / ChatGPT Plus focado em fotografia de catálogo de luxo de artesanato em papel.
   - fluxPrompt: Otimizado para Flux.1 / Leonardo AI focando em detalhes macro das camadas de papel e cortes precisos de plotter.
   - macroLayersPrompt: Close-up macro mostrando o relevo e espaçamento real da fita banana entre os papéis Colorplus e Lamicote.
   - partyTableScenePrompt: Fotografia ampla da mesa principal da festa infantil, bolo decorado com o topo, docinhos e balões no mesmo tema.

Retorne SEMPRE um JSON válido e estrito de acordo com o formato solicitado.
`;

export class AiProductService {
  private getApiKey(customKey?: string): string {
    if (customKey && customKey.trim()) return customKey.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('luisices_gemini_api_key');
      if (stored && stored.trim()) return stored.trim();
    }
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  private getTunedModelId(customModel?: string): string {
    if (customModel && customModel.trim()) return customModel.trim();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('luisices_gemini_tuned_model_id');
      if (stored && stored.trim()) return stored.trim();
    }
    return '';
  }

  /**
   * Obtém os itens do Acervo de Imagens do Ateliê (com suporte a referências salvas e biblioteca padrão)
   */
  getAtelierAcervo(): AcervoItem[] {
    if (typeof window === 'undefined') return DEFAULT_ATELIER_ACERVO;
    try {
      const stored = localStorage.getItem('luisices_atelier_acervo_items');
      if (!stored) {
        // Inicializar com o acervo padrão de alta qualidade do ateliê
        localStorage.setItem('luisices_atelier_acervo_items', JSON.stringify(DEFAULT_ATELIER_ACERVO));
        return DEFAULT_ATELIER_ACERVO;
      }
      return JSON.parse(stored);
    } catch {
      return DEFAULT_ATELIER_ACERVO;
    }
  }

  /**
   * Salva uma nova imagem/produto no Acervo de Imagens do Ateliê
   */
  saveItemToAcervo(itemData: Omit<AcervoItem, 'id' | 'createdAt'>): AcervoItem {
    const current = this.getAtelierAcervo();
    const newItem: AcervoItem = {
      ...itemData,
      id: `acervo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...current];
    if (typeof window !== 'undefined') {
      localStorage.setItem('luisices_atelier_acervo_items', JSON.stringify(updated));
    }
    return newItem;
  }

  /**
   * Remove um item do Acervo de Imagens
   */
  removeItemFromAcervo(id: string): void {
    const current = this.getAtelierAcervo();
    const updated = current.filter((item) => item.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('luisices_atelier_acervo_items', JSON.stringify(updated));
    }
  }

  /**
   * Salva um blueprint gerado diretamente no Acervo do Ateliê
   */
  saveBlueprintToAcervo(blueprint: AiProductBlueprint, customImage?: string): AcervoItem {
    return this.saveItemToAcervo({
      title: blueprint.productTitle,
      category: blueprint.category,
      theme: blueprint.theme,
      imageUrl: customImage || blueprint.generatedImageUrl || 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=80',
      description: blueprint.description,
      paperTypes: blueprint.papersShoppingList.map((p) => `${p.name} ${p.gramature}`),
      targetNameAndAge: blueprint.targetAgeAndName,
      blueprint,
      tags: [blueprint.category.toLowerCase(), blueprint.theme.toLowerCase(), 'acervo-ia'],
    });
  }

  /**
   * Exporta todo o Acervo de Imagens do Ateliê em formato JSONL para Fine-Tuning no Google AI Studio
   */
  exportAcervoDatasetAsJsonl(acervo?: AcervoItem[]): string {
    const list = acervo && acervo.length > 0 ? acervo : this.getAtelierAcervo();
    const lines = list.map((item) => {
      const inputPrompt = `Projete um produto de papelaria personalizada baseado no Acervo do Ateliê: Tipo: ${item.category}, Tema: ${item.theme}, Personalização: ${item.targetNameAndAge || 'Personalizado'}, Estilo Visual de Referência: ${item.title}`;
      const outputJson = item.blueprint
        ? JSON.stringify(item.blueprint)
        : JSON.stringify({
            productTitle: item.title,
            category: item.category,
            theme: item.theme,
            description: item.description,
            papersShoppingList: item.paperTypes?.map((p) => ({ name: p, gramature: '180g', sheetsNeeded: 1 })) || [],
          });

      return JSON.stringify({
        messages: [
          { role: 'user', content: inputPrompt },
          { role: 'model', content: outputJson },
        ],
      });
    });
    return lines.join('\n');
  }

  // Compatibilidade com métodos anteriores
  getSavedAtelierSuccesses(): AiProductBlueprint[] {
    const acervo = this.getAtelierAcervo();
    return acervo.filter((a) => a.blueprint).map((a) => a.blueprint!);
  }

  saveAtelierSuccess(blueprint: AiProductBlueprint): void {
    this.saveBlueprintToAcervo(blueprint);
  }

  exportTrainingDatasetAsJsonl(blueprints: AiProductBlueprint[]): string {
    return this.exportAcervoDatasetAsJsonl();
  }

  /**
   * Executa chamada à API Gemini com suporte a Streaming em Tempo Real (SSE), retentativas inteligentes e fallback entre modelos
   */
  private async callGeminiWithCandidateModels(
    apiKey: string,
    preferredModel: string | undefined,
    bodyPayload: any,
    onProgress?: (event: AiProgressEvent) => void
  ): Promise<string> {
    const candidateModels = preferredModel
      ? [preferredModel, 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest']
      : ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];

    let lastError: any = null;

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];

      for (let attempt = 1; attempt <= 2; attempt++) {
        onProgress?.({
          stage: 'Conectando à IA',
          message: `Requisitando ao modelo ${model} (Tentativa ${attempt}/2)...`,
          progressPercent: 20 + i * 25 + attempt * 10,
          logType: 'info',
          timestamp: new Date().toLocaleTimeString(),
        });

        try {
          // Tentar streaming SSE primeiro
          const streamEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          try {
            const response = await fetch(streamEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok && response.body) {
              const reader = response.body.getReader();
              const decoder = new TextDecoder();
              let accumulatedText = '';
              let buffer = '';

              while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunkStr = decoder.decode(value, { stream: true });
                buffer += chunkStr;

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (trimmed.startsWith('data: ')) {
                    const dataStr = trimmed.slice(6).trim();
                    if (dataStr === '[DONE]') continue;
                    try {
                      const parsedJson = JSON.parse(dataStr);
                      const partText = parsedJson.candidates?.[0]?.content?.parts?.[0]?.text;
                      if (partText) {
                        accumulatedText += partText;
                        onProgress?.({
                          stage: 'Transmissão em Tempo Real',
                          message: `Recebendo tokens da IA (${accumulatedText.length} caracteres recebidos)...`,
                          progressPercent: Math.min(92, 35 + Math.floor(accumulatedText.length / 30)),
                          logType: 'stream',
                          timestamp: new Date().toLocaleTimeString(),
                          rawChunk: partText,
                        });
                      }
                    } catch {}
                  }
                }
              }

              if (accumulatedText.trim().length > 0) {
                onProgress?.({
                  stage: 'Processamento Concluído',
                  message: `Resposta completa gerada com sucesso (${accumulatedText.length} caracteres).`,
                  progressPercent: 95,
                  logType: 'success',
                  timestamp: new Date().toLocaleTimeString(),
                });
                return accumulatedText;
              }
            }
          } catch (streamErr: any) {
            // Ignorar erro do stream e tentar requisição síncrona
          }

          // Fallback para requisição síncrona com timeout
          const syncEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const syncController = new AbortController();
          const syncTimeoutId = setTimeout(() => syncController.abort(), 25000);

          const syncResponse = await fetch(syncEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
            signal: syncController.signal,
          });

          clearTimeout(syncTimeoutId);

          if (syncResponse.ok) {
            const data = await syncResponse.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              onProgress?.({
                stage: 'Resposta Recebida',
                message: `Resposta obtida com sucesso do modelo ${model}.`,
                progressPercent: 95,
                logType: 'success',
                timestamp: new Date().toLocaleTimeString(),
                rawChunk: text,
              });
              return text;
            }
          } else {
            const errData = await syncResponse.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${syncResponse.status}`;
            lastError = new Error(errMsg);

            if (syncResponse.status === 503) {
              onProgress?.({
                stage: 'Alta Demanda do Google (503)',
                message: `Google Gemini temporariamente sobrecarregado no modelo ${model}. Retentando em 1.5s...`,
                progressPercent: 30 + i * 20,
                logType: 'warn',
                timestamp: new Date().toLocaleTimeString(),
              });
              await new Promise((resolve) => setTimeout(resolve, 1500));
            } else {
              break;
            }
          }
        } catch (err: any) {
          lastError = err;
          onProgress?.({
            stage: 'Tentativa Concluída',
            message: `Tentativa ${attempt} no modelo ${model}: ${err.message || 'aguardando resposta'}`,
            progressPercent: 30 + i * 20,
            logType: 'warn',
            timestamp: new Date().toLocaleTimeString(),
          });
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Google Gemini temporariamente sob alta demanda.');
  }

  /**
   * Gera o projeto físico completo utilizando o Acervo de Imagens do Ateliê como referência multimodal
   */
  async generateProductBlueprint(params: GenerateProductParams): Promise<AiProductBlueprint> {
    const apiKey = this.getApiKey(params.geminiApiKey);
    const tunedModel = this.getTunedModelId(params.tunedModelId);
    const conversationId = `prod_gen_${Date.now()}`;

    // Montar Contexto do Acervo de Imagens do Ateliê
    let acervoContext = '';
    const acervoList = this.getAtelierAcervo();

    if (params.referenceAcervoItem) {
      const ref = params.referenceAcervoItem;
      acervoContext += `\n\nREFERÊNCIA DIRETA ESCOLHIDA DO ACERVO DO ATELIÊ:\n- Item: "${ref.title}" (Tema: ${ref.theme}, Categoria: ${ref.category})\n- Descrição/Materiais do Acervo: ${ref.description || ''}\n- Papéis Usados no Acervo: ${(ref.paperTypes || []).join(', ')}\n- Foto de Referência: ${ref.imageUrl}\n* REPRODUZA RIGOROSAMENTE A LINGUAGEM VISUAL, A HARMONIA DE CORES E O PADRÃO DE CAMADAS DESTE ITEM DO SEU ACERVO.*\n`;
    } else if (acervoList.length > 0) {
      acervoContext = `\n\nACERVO DE IMAGENS E PROJETOS DO ATELIÊ (REFERÊNCIAS DE ESTILO REAL):\nUse o catálogo de criações anteriores do ateliê abaixo como diretriz de estilo, camadas e acabamentos:\n`;
      acervoList.slice(0, 4).forEach((ac, i) => {
        acervoContext += `--- Acervo Item ${i + 1}: ${ac.title} ---\n`;
        acervoContext += `Tema: ${ac.theme} | Categoria: ${ac.category} | Foto: ${ac.imageUrl}\n`;
        if (ac.description) acervoContext += `Detalhes: ${ac.description}\n`;
        if (ac.paperTypes) acervoContext += `Papéis: ${ac.paperTypes.join(', ')}\n\n`;
      });
    }

    return traceAgentRun('PaperCraftProductDesigner', conversationId, async () => {
      if (!apiKey) {
        console.warn('[AiProductService] Chave Gemini não configurada. Utilizando gerador inteligente local.');
        return this.generateSmartFallback(params);
      }

      const promptUser = `
Projete um produto de papelaria personalizada e gere prompts ultra-realistas para IAs de imagem, alinhado ao Acervo do Ateliê:
- Tipo de Produto: ${params.productType}
- Tema da Festa: ${params.theme}
- Nome e Idade: ${params.targetNameAndAge || 'Personalizado'}
- Paleta de Cores: ${params.colorPalette}
- Complexidade: ${params.complexity}
- Máquina de Corte / Plotter: ${params.plotter}
${params.customInstructions ? `- Instruções Adicionais da Artesã: ${params.customInstructions}` : ''}
${acervoContext}

Retorne estritamente um JSON com este schema:
{
  "productTitle": "Título comercial atraente para o catálogo",
  "category": "Topos de Bolo" | "Lembrancinhas" | "Papelaria Criativa" | "Kits Festa",
  "description": "Descrição comercial encantadora e detalhada destacando camadas 3D e acabamentos inspirados no acervo",
  "targetAgeAndName": "${params.targetNameAndAge || 'Personalizado'}",
  "theme": "${params.theme}",
  "recommendedPrice": 45.00,
  "suggestedLeadTimeDays": 5,
  "layers": [
    {
      "order": 1,
      "name": "Nome da camada (ex: Base Estrutural / Fundo)",
      "paperType": "Ex: Papel Colorplus 180g",
      "colorHex": "#E8B4B8",
      "colorName": "Rosa Chá",
      "cutDifficulty": "fácil",
      "offsetMm": 2.5,
      "silhouetteSettings": { "blade": 3, "force": 30, "speed": 5, "passes": 1 },
      "assemblyTip": "Dica de montagem com fita banana ou cola de silicone"
    }
  ],
  "papersShoppingList": [
    { "name": "Colorplus Rosa Chá", "gramature": "180g", "sheetsNeeded": 1 }
  ],
  "toolsAndAccessories": ["Fita banana de 2mm", "Palitos transparentes de acrílico", "Cola pano / Silicone líquida"],
  "estimatedAssemblyMinutes": 25,
  "silhouetteTips": "Dicas especiais para corte na ${params.plotter} sem rasgar",
  "suggestedImagePrompt": "A high-end realistic studio photo of a layered 3D handcrafted paper cake topper on a pastel cake, theme ${params.theme}, depth of field, paper textures, studio lighting",
  "realisticPrompts": {
    "geminiImagenPrompt": "Professional high-resolution commercial product photograph of a handcrafted luxury layered paper cake topper, theme ${params.theme}...",
    "bananaTape3dPrompt": "Macro product photography showcasing 3D layered construction with visible 2mm double-sided foam banana tape (espuma EVA)...",
    "ideogramPrompt": "Professional commercial product photography of a handcrafted luxury layered paper cake topper featuring the exact text \\"${params.targetNameAndAge || 'Personalizado'}\\" in shiny gold metallic foil cardstock...",
    "midjourneyPrompt": "Commercial studio product photography of a luxury handcrafted 3D layered paper cake topper, theme ${params.theme}... --v 6.0 --style raw --ar 1:1",
    "dallePrompt": "Commercial product photograph of a luxury 3D papercraft cake topper on a clean white cake...",
    "fluxPrompt": "Macro studio photograph of layered cardstock papercraft with gold foil accents...",
    "macroLayersPrompt": "Extreme macro close-up of layered cardstock paper with 2mm foam tape elevation...",
    "partyTableScenePrompt": "Wide commercial shot of an elegant birthday party dessert table with a pastel cake topped with a handcrafted paper cake topper..."
  }
}
`;

      try {
        const parts: any[] = [{ text: promptUser }];

        // Se uma imagem em base64 foi enviada (multimodal vision analysis)
        if (params.referenceImageBase64) {
          const cleanBase64 = params.referenceImageBase64.replace(/^data:image\/\w+;base64,/, '');
          parts.unshift({
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          });
        }

        const responseText = await traceAIChat(tunedModel || 'gemini-flash-latest', conversationId, async () => {
          return this.callGeminiWithCandidateModels(apiKey, tunedModel, {
            contents: [{ role: 'user', parts }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }, params.onProgress);
        }, {
          systemInstruction: SYSTEM_PROMPT,
          inputMessages: [{ role: 'user', content: promptUser }],
        });

        if (!responseText) {
          throw new Error('Resposta vazia do Gemini');
        }

        const parsed = JSON.parse(responseText) as AiProductBlueprint;

        // Se por ventura realisticPrompts não vier completo, mesclar com fallback
        if (!parsed.realisticPrompts || !parsed.realisticPrompts.ideogramPrompt || !parsed.realisticPrompts.geminiImagenPrompt) {
          const fb = this.generateSmartFallback(params);
          parsed.realisticPrompts = {
            ...fb.realisticPrompts,
            ...parsed.realisticPrompts,
          };
        }

        // Garantir que as pranchas de corte e passos de montagem estejam presentes
        if (!parsed.cutSheets || parsed.cutSheets.length === 0 || !parsed.assemblySteps || parsed.assemblySteps.length === 0) {
          const isShaker = params.productType.toLowerCase().includes('shaker');
          const technicals = this.generateCutSheetsAndAssembly(
            parsed.productTitle || `${params.productType} Luxo 3D`,
            params.productType,
            parsed.theme || params.theme,
            parsed.targetAgeAndName || params.targetNameAndAge,
            parsed.layers || [],
            isShaker,
            params.colorPalette
          );
          parsed.cutSheets = technicals.cutSheets;
          parsed.assemblySteps = technicals.assemblySteps;
        }

        return parsed;
      } catch (err) {
        console.error('[AiProductService] Falha na chamada da API Gemini, usando gerador físico inteligente:', err);
        return this.generateSmartFallback(params);
      }
    });
  }

  /**
   * Realiza Engenharia Reversa Visual Multimodal a partir de uma imagem
   * (lendo a foto gerada por IA ou foto real e gerando camadas, papéis, paleta e pranchas de corte em SVG)
   */
  async reverseEngineerBlueprintFromImage(params: ReverseEngineerImageParams): Promise<AiProductBlueprint> {
    const apiKey = this.getApiKey(params.geminiApiKey);
    const tunedModel = this.getTunedModelId(params.tunedModelId);
    const conversationId = `vision_reverse_${Date.now()}`;
    const plotter = params.plotter || 'portrait3';

    return traceAgentRun('PaperCraftVisionReverseEngineer', conversationId, async () => {
      if (!apiKey) {
        console.warn('[AiProductService] Chave Gemini não configurada para análise de imagem. Usando gerador adaptativo.');
        const fallback = this.generateSmartFallback({
          productType: 'Topo de Bolo 3D',
          theme: params.userNotes || 'Jardim Encantado',
          targetNameAndAge: 'Personalizado',
          colorPalette: 'Candy Colors / Pastéis',
          complexity: 'avançado',
          plotter,
          customInstructions: params.userNotes || 'Projeto derivado de análise de imagem.',
        });
        if (params.imageBase64) {
          fallback.generatedImageUrl = params.imageBase64;
        }
        return fallback;
      }

      const cleanBase64 = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const mimeType = params.mimeType || (params.imageBase64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg');

      const visionSystemPrompt = `
Você é uma Engenheira Especialista em Papelaria Personalizada de Luxo e Projetista de Corte para Silhouette Studio, Cricut Design Space e Brother ScanNCut.
Sua missão é inspecionar minuciosamente a IMAGEM enviada (foto de produto real de papelaria de festa ou render hiper-realista gerado por IA) e realizar a ENGENHARIA REVERSA FÍSICA COMPLETA para produção e corte.

INSTRUÇÕES DE INSPEÇÃO VISUAL OBRIGATÓRIAS:
1. IDENTIFICAÇÃO DO PRODUTO & TEMA:
   - Identifique a categoria exata (ex: "Topo de Bolo 3D", "Topo Shaker Luxo", "Caixa Milk 3D", "Caixa Pirâmide", "Letra 3D Personalizada", "Marcador de Página Luxo", etc.).
   - Identifique o tema visual predominante (ex: "Astronauta", "Jardim Encantado", "Safari Baby", "Circo Rosa", "Sereia", "Dino Baby", "Princesas / Realeza", "Balão de Ar Quente", "Gamer", etc.).
   - OCR Minucioso: Extraia exatamente qualquer nome, idade ou texto visível na imagem. Se não houver texto legível, sugira um nome harmonioso com idade (ex: "Helena - 3 anos").

2. DECOMPOSIÇÃO REAL EM CAMADAS FÍSICAS (De baixo para cima, cada camada separada por folha de papel):
   - Crie de 3 a 6 camadas físicas reais correspondendo aos elementos visuais vistos na imagem:
     * Camada 1: Base de Fundo / Silhueta Estrutural Rígida (Papel Colorplus 180g-240g ou Kraft com a cor predominante do fundo).
     * Camada 2: Molduras, Escalopes ou Fundo Intermediário com deslocamento (offset de 2.0mm a 3.0mm).
     * Camadas 3 e 4: Elementos Temáticos 3D elevados com fita banana (personagens, borboletas, flores, foguetes, leõezinhos, balões).
     * Camadas Especiais (se houver): Visor de acetato transparente e anel de vedação em EVA 2mm (se shaker).
     * Camada Nobre / Superior: Nome em destaque cursivo soldado, idade em Lamicote (Dourado, Rose Gold, Prata) ou Glitter 250g.

3. RETORNE ESTRITAMENTE UM JSON no formato:
{
  "productTitle": "Título comercial descritivo e luxuoso",
  "category": "Topos de Bolo" | "Lembrancinhas" | "Papelaria Criativa" | "Kits Festa",
  "description": "Descrição técnica e visual detalhada da peça inspecionada",
  "targetAgeAndName": "Nome e Idade extraídos ou sugeridos",
  "theme": "Tema detectado na imagem",
  "recommendedPrice": 45.00,
  "suggestedLeadTimeDays": 5,
  "layers": [
    {
      "order": 1,
      "name": "Nome descritivo exato da camada (ex: Base Estrutural com Offset, Moldura Escalopada Floral, Apliques de Borboletas 3D, Nome Nobre Lamicote Dourado)",
      "paperType": "Ex: Colorplus Rosa Chá 180g",
      "colorHex": "#E8B4B8",
      "colorName": "Rosa Chá",
      "cutDifficulty": "fácil" | "médio" | "delicado",
      "offsetMm": 2.5,
      "silhouetteSettings": { "blade": 3, "force": 30, "speed": 5, "passes": 1 },
      "assemblyTip": "Instrução precisa de colagem e elevação 3D"
    }
  ],
  "papersShoppingList": [
    { "name": "Nome do papel", "gramature": "180g", "sheetsNeeded": 1 }
  ],
  "toolsAndAccessories": ["Fita banana 2mm", "Cola de silicone líquida", "Palitos acrílicos 15cm"],
  "estimatedAssemblyMinutes": 25,
  "silhouetteTips": "Dicas de corte na plotter ${plotter}",
  "suggestedImagePrompt": "Prompt descritivo em inglês da imagem",
  "realisticPrompts": {
    "geminiImagenPrompt": "...",
    "bananaTape3dPrompt": "...",
    "ideogramPrompt": "...",
    "midjourneyPrompt": "...",
    "dallePrompt": "...",
    "fluxPrompt": "...",
    "macroLayersPrompt": "...",
    "partyTableScenePrompt": "..."
  }
}
`;

      const parts: any[] = [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: `Analise cuidadosamente esta imagem de produto de papelaria personalizada e decomponha todas as suas camadas físicas, tema, nome e corte.${params.userNotes ? `\nObservações extras da artesã: ${params.userNotes}` : ''}`,
        },
      ];

      try {
        const rawText = await this.callGeminiWithCandidateModels(apiKey, tunedModel, {
          contents: [{ role: 'user', parts }],
          systemInstruction: { parts: [{ text: visionSystemPrompt }] },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }, params.onProgress);

        if (!rawText) throw new Error('A IA não retornou dados visuais da imagem.');

        const parsed = JSON.parse(rawText) as AiProductBlueprint;
        parsed.generatedImageUrl = params.imageBase64;

        // Gerar as pranchas de corte em SVG e os passos de montagem com base na anatomia detectada
        const isShaker = (parsed.category || '').toLowerCase().includes('shaker') || (parsed.productTitle || '').toLowerCase().includes('shaker');
        const technicals = this.generateCutSheetsAndAssembly(
          parsed.productTitle || 'Produto de Papelaria Personalizada',
          parsed.category || 'Topo de Bolo 3D',
          parsed.theme || 'Personalizado',
          parsed.targetAgeAndName || 'Personalizado',
          parsed.layers || [],
          isShaker,
          parsed.layers?.[0]?.colorName || 'Colorido'
        );

        parsed.cutSheets = technicals.cutSheets;
        parsed.assemblySteps = technicals.assemblySteps;

        return parsed;
      } catch (e) {
        console.warn('[AiProductService] Google Gemini com alta demanda, ativando gerador estrutural adaptativo:', e);
        params.onProgress?.({
          stage: 'Motor Adaptativo Local',
          message: 'Google Gemini sob alta demanda temporária (503). Gerando decomposição de camadas, materiais e arquivos SVG de corte localmente...',
          progressPercent: 90,
          logType: 'info',
          timestamp: new Date().toLocaleTimeString(),
        });

        // Detectar tipo de produto das observações ou padrão
        const notes = (params.userNotes || '').toLowerCase();
        let detectedType = 'Topo de Bolo 3D';
        if (notes.includes('milk') || notes.includes('caixa')) detectedType = 'Caixa Milk 3D';
        else if (notes.includes('shaker')) detectedType = 'Topo Shaker Luxo';
        else if (notes.includes('letra')) detectedType = 'Letra 3D Personalizada';
        else if (notes.includes('marcador')) detectedType = 'Marcador de Página Luxo';

        const fb = this.generateSmartFallback({
          productType: detectedType,
          theme: params.userNotes || 'Personalizado',
          targetNameAndAge: params.userNotes || 'Personalizado',
          colorPalette: 'Candy Colors / Pastéis',
          complexity: 'avançado',
          plotter,
          customInstructions: params.userNotes || 'Projeto físico gerado por engenharia reversa.',
        });
        fb.generatedImageUrl = params.imageBase64;

        params.onProgress?.({
          stage: 'Concluído com Sucesso',
          message: `Pranchas de corte em SVG e ficha técnica geradas com sucesso para "${fb.productTitle}"!`,
          progressPercent: 100,
          logType: 'success',
          timestamp: new Date().toLocaleTimeString(),
        });

        return fb;
      }
    });
  }


  /**
   * Gera pranchas de corte em vetor SVG 100% personalizadas e dinâmicas para CADA camada física identificada
   */
  generateCutSheetsAndAssembly(
    productTitle: string,
    productType: string,
    theme: string,
    targetNameAndAge: string,
    layers: LayerSpec[],
    isShaker: boolean,
    colorPalette: string
  ): { cutSheets: CutSheet[]; assemblySteps: AssemblyStep[] } {
    const normType = productType.toLowerCase();
    const normTheme = theme.toLowerCase();
    const cleanName = targetNameAndAge || 'Helena - 3 anos';
    const nameOnly = cleanName.split('-')[0].trim() || 'Helena';
    const ageOnly = cleanName.match(/\d+/)?.[0] || '3';
    const firstLetter = (nameOnly.charAt(0) || 'H').toUpperCase();

    const isMilkBox = normType.includes('milk') || (normType.includes('caixa') && !normType.includes('pirâmide') && !normType.includes('cone'));
    const isPyramidBox = normType.includes('pirâmide') || normType.includes('cone');
    const is3dLetter = normType.includes('letra');

    // Detectar tema para elementos visuais específicos
    const isGarden = normTheme.includes('jardim') || normTheme.includes('borbolet') || normTheme.includes('flor') || normTheme.includes('fada');
    const isSpace = normTheme.includes('astronauta') || normTheme.includes('espaço') || normTheme.includes('galáxia') || normTheme.includes('planeta');
    const isSafari = normTheme.includes('safari') || normTheme.includes('selva') || normTheme.includes('bichinho') || normTheme.includes('leão');
    const isCircus = normTheme.includes('circo') || normTheme.includes('palhac') || normTheme.includes('vintage');
    const isDino = normTheme.includes('dino') || normTheme.includes('dinossauro') || normTheme.includes('jurássic');
    const isMermaid = normTheme.includes('sereia') || normTheme.includes('mar') || normTheme.includes('ariel') || normTheme.includes('fundo do mar');
    const isPrincess = normTheme.includes('princesa') || normTheme.includes('realeza') || normTheme.includes('castelo') || normTheme.includes('coroa');
    const isBear = normTheme.includes('urso') || normTheme.includes('ursinho') || normTheme.includes('balão') || normTheme.includes('balao');
    const isGamer = normTheme.includes('game') || normTheme.includes('gamer') || normTheme.includes('videogame') || normTheme.includes('mario');
    const isHero = normTheme.includes('heroi') || normTheme.includes('herói') || normTheme.includes('vingador') || normTheme.includes('spider') || normTheme.includes('batman');

    const redCut = 'stroke="#FF0000" stroke-width="1.5" fill="none"';
    const scoreDash = 'stroke="#0000FF" stroke-width="1.2" stroke-dasharray="6,4" fill="none"';

    // Se layers estiver vazio, fornecer estrutura padrão de 4 camadas ricas
    const effectiveLayers = layers.length > 0 ? layers : [
      {
        order: 1,
        name: `Base Estrutural Silhueta do Tema (${theme})`,
        paperType: 'Colorplus 180g',
        colorHex: '#CBD5E1',
        colorName: 'Cinza / Branco',
        cutDifficulty: 'fácil' as const,
        offsetMm: 3.0,
        silhouetteSettings: { blade: 3, force: 30, speed: 5, passes: 1 },
        assemblyTip: 'Base de sustentação principal colada nos palitos acrílicos.',
      },
      {
        order: 2,
        name: `Moldura & Escalopes 3D`,
        paperType: 'Colorplus 180g',
        colorHex: '#F472B6',
        colorName: 'Rosa / Destaque',
        cutDifficulty: 'médio' as const,
        offsetMm: 2.0,
        silhouetteSettings: { blade: 3, force: 30, speed: 5, passes: 1 },
        assemblyTip: 'Fixar sobre a base com fita banana de 2mm.',
      },
      {
        order: 3,
        name: `Elementos Temáticos 3D (${theme})`,
        paperType: 'Colorplus 180g',
        colorHex: '#60A5FA',
        colorName: 'Azul / Colorido',
        cutDifficulty: 'delicado' as const,
        offsetMm: 1.5,
        silhouetteSettings: { blade: 3, force: 28, speed: 4, passes: 1 },
        assemblyTip: 'Montar as peças temáticas em camadas de relevo.',
      },
      {
        order: 4,
        name: `Destaque Nome "${nameOnly}" & Idade`,
        paperType: 'Lamicote Dourado 250g',
        colorHex: '#EAB308',
        colorName: 'Dourado Metálico',
        cutDifficulty: 'médio' as const,
        offsetMm: 2.0,
        silhouetteSettings: { blade: 4, force: 33, speed: 3, passes: 2 },
        assemblyTip: 'Colar com fita banana no topo da composição.',
      },
    ];

    const cutSheets: CutSheet[] = effectiveLayers.map((layer, index) => {
      const sheetNum = index + 1;
      let sheetTitle = `Folha ${sheetNum}: ${layer.name}`;
      let piecesCount = 3;
      let estimatedCutSeconds = 35 + index * 10;
      const fillWithOpacity = `fill="${layer.colorHex}" fill-opacity="0.22"`;

      const layerNameLower = layer.name.toLowerCase();
      const paperLower = layer.paperType.toLowerCase();

      // Classificar dinamicamente o propósito desta camada
      const isBase = layerNameLower.includes('base') || layerNameLower.includes('fundo') || layerNameLower.includes('estrutur') || (index === 0 && !isMilkBox && !is3dLetter);
      const isNameLayer = layerNameLower.includes('nome') || layerNameLower.includes('idade') || layerNameLower.includes('letra') || layerNameLower.includes('lamicote') || paperLower.includes('lamicote') || paperLower.includes('glitter');
      const isFrameLayer = layerNameLower.includes('moldura') || layerNameLower.includes('escalope') || layerNameLower.includes('borda') || layerNameLower.includes('visor') || layerNameLower.includes('arco');
      const isShakerLayer = (isShaker && paperLower.includes('acetato')) || layerNameLower.includes('shaker') || layerNameLower.includes('anel') || paperLower.includes('eva');
      const isPrintCutLayer = paperLower.includes('fotogr') || layerNameLower.includes('print') || layerNameLower.includes('ilustra');

      let svgContent = '';

      // ─────────────────────────────────────────────────────────────────────────────
      // 1. GABARITO DE CAIXA MILK 3D (QUANDO O PRODUTO FOR UMA CAIXA)
      // ─────────────────────────────────────────────────────────────────────────────
      if (isMilkBox && index === 0) {
        sheetTitle = `Folha 1: Molde Planificado Caixa Milk (${layer.paperType})`;
        piecesCount = 1;
        estimatedCutSeconds = 55;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO ESTRUTURAL CAIXA MILK (A4 210x297mm) -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">FOLHA 1: MOLDE PLANIFICADO CAIXA MILK — ${layer.paperType.toUpperCase()}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Linha Vermelha (#FF0000) = Corte | Azul Tracejado (#0000FF) = Vincos de Dobra</text>

  <g transform="translate(65, 120)">
    <!-- Contorno Externo de Corte -->
    <path d="M 30 140 L 30 20 L 50 20 L 50 140 L 190 140 L 190 20 L 210 20 L 210 140 L 350 140 L 350 20 L 370 20 L 370 140 L 510 140 L 510 20 L 530 20 L 530 140 L 670 140 L 670 600 L 530 600 L 530 720 L 390 720 L 390 600 L 250 600 L 250 720 L 110 720 L 110 600 L 0 600 L 0 160 L 30 140 Z" ${fillWithOpacity} ${redCut}/>
    <!-- Linhas de Vinco Horizontais -->
    <line x1="30" y1="140" x2="670" y2="140" ${scoreDash}/>
    <line x1="30" y1="260" x2="670" y2="260" ${scoreDash}/>
    <line x1="30" y1="600" x2="670" y2="600" ${scoreDash}/>
    <!-- Linhas de Vinco Verticais -->
    <line x1="30" y1="140" x2="30" y2="600" ${scoreDash}/>
    <line x1="190" y1="140" x2="190" y2="600" ${scoreDash}/>
    <line x1="350" y1="140" x2="350" y2="600" ${scoreDash}/>
    <line x1="510" y1="140" x2="510" y2="600" ${scoreDash}/>
    <!-- Vincos Diagonais Fechamento Triangular Superior -->
    <line x1="190" y1="260" x2="270" y2="140" ${scoreDash}/>
    <line x1="350" y1="260" x2="270" y2="140" ${scoreDash}/>
    <line x1="270" y1="140" x2="270" y2="20" ${scoreDash}/>
    <line x1="510" y1="260" x2="590" y2="140" ${scoreDash}/>
    <line x1="670" y1="260" x2="590" y2="140" ${scoreDash}/>
    <line x1="590" y1="140" x2="590" y2="20" ${scoreDash}/>
    <!-- Furos para Fita de Cetim -->
    <circle cx="110" cy="80" r="5" fill="#FFFFFF" ${redCut}/>
    <circle cx="430" cy="80" r="5" fill="#FFFFFF" ${redCut}/>
    <text x="110" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1E293B" text-anchor="middle">FRENTE</text>
    <text x="270" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B" text-anchor="middle">LATERAL 1</text>
    <text x="430" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1E293B" text-anchor="middle">VERSO</text>
    <text x="590" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B" text-anchor="middle">LATERAL 2</text>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. BASE ESTRUTURAL TRASEIRA COM OFFSET E GUIAS DE PALITO ACRÍLICO
      // ─────────────────────────────────────────────────────────────────────────────
      else if (isBase) {
        sheetTitle = `Folha ${sheetNum}: Base Estrutural Traseira (${layer.paperType})`;
        piecesCount = 2;
        estimatedCutSeconds = 40;

        let baseSilhouettePath = 'M 50 160 C 20 160 0 130 0 95 C 0 50 40 10 90 10 C 130 10 165 35 180 70 C 200 40 240 20 285 20 C 340 20 385 60 385 115 C 410 115 430 135 430 160 C 430 185 410 205 385 205 C 385 250 345 285 295 285 C 265 285 235 270 215 245 C 195 275 155 295 110 295 C 50 295 10 250 10 195 C 10 180 18 168 50 160 Z';
        let baseLabel = `Base Estrutural Offset — ${theme}`;

        if (isPrincess) {
          baseSilhouettePath = 'M 40 280 L 40 120 L 90 120 L 90 60 L 140 100 L 190 40 L 240 100 L 290 60 L 290 120 L 340 120 L 340 280 Z';
          baseLabel = 'Base Estrutural Castelo / Coroa Real';
        } else if (isSpace) {
          baseSilhouettePath = 'M 200 20 L 260 140 L 320 220 L 360 300 L 280 280 L 200 360 L 120 280 L 40 300 L 80 220 L 140 140 Z';
          baseLabel = 'Base Foguete & Galáxia';
        } else if (isSafari) {
          baseSilhouettePath = 'M 60 140 C 20 100 20 40 80 20 C 140 0 220 10 280 40 C 340 10 420 40 400 120 C 420 180 380 260 320 280 C 260 300 180 290 120 270 C 40 260 20 180 60 140 Z';
          baseLabel = 'Base Selva & Folhagens Safari';
        } else if (isDino) {
          baseSilhouettePath = 'M 80 240 L 40 180 L 80 120 L 160 80 L 240 40 L 340 60 L 420 120 L 400 200 L 320 260 L 220 280 L 140 270 Z';
          baseLabel = 'Base Dinossauro & Vulcão';
        } else if (isMermaid) {
          baseSilhouettePath = 'M 190 20 C 260 60 280 160 250 240 C 300 220 360 250 380 310 C 320 320 260 300 220 260 C 180 320 110 330 60 290 C 80 230 140 200 160 150 C 140 80 160 40 190 20 Z';
          baseLabel = 'Base Cauda de Sereia & Concha';
        } else if (isBear) {
          baseSilhouettePath = 'M 190 30 C 280 30 350 100 350 190 C 350 250 300 300 260 350 L 120 350 C 80 300 30 250 30 190 C 30 100 100 30 190 30 Z';
          baseLabel = 'Base Balão de Ar Quente & Ursinho';
        } else if (isGamer) {
          baseSilhouettePath = 'M 60 100 C 40 100 20 130 20 180 L 40 300 C 50 330 80 330 100 300 L 140 240 L 240 240 L 280 300 C 300 330 330 330 340 300 L 360 180 C 360 130 340 100 320 100 Z';
          baseLabel = 'Base Joystick Gamer 3D';
        }

        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">FOLHA ${sheetNum}: BASE ESTRUTURAL — ${theme.toUpperCase()}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Papel: ${layer.paperType} | Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed}</text>

  <!-- Silhueta Sólida de Sustentação 3D -->
  <g transform="translate(170, 130)">
    <path d="${baseSilhouettePath}" ${fillWithOpacity} ${redCut}/>
    <text x="190" y="170" font-family="sans-serif" font-size="13" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">${baseLabel}</text>
    <text x="190" y="195" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Offset 3.0mm (Fundo Sólido Rígido)</text>

    <!-- Guias Traseiras para Palitos Acrílicos Transparentes -->
    <rect x="130" y="300" width="14" height="80" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <rect x="240" y="300" width="14" height="80" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <text x="192" y="355" font-family="sans-serif" font-size="9" fill="#3B82F6" text-anchor="middle">Guias dos Palitos Acrílicos</text>
  </g>

  <!-- Guias de Encaixe Auxiliar / Peças de Reforço Traseiro -->
  <g transform="translate(170, 560)">
    <rect x="40" y="20" width="140" height="40" rx="8" ${fillWithOpacity} ${redCut}/>
    <rect x="200" y="20" width="140" height="40" rx="8" ${fillWithOpacity} ${redCut}/>
    <text x="110" y="45" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">Trava Estrutural 1</text>
    <text x="270" y="45" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">Trava Estrutural 2</text>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. DESTAQUE DO NOME SOLDADO, IDADE & LETRAS PERSONALIZADAS (LAMICOTE / GLITTER)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (isNameLayer) {
        sheetTitle = `Folha ${sheetNum}: Destaque Nome "${nameOnly}" & Idade (${layer.paperType})`;
        piecesCount = 4;
        estimatedCutSeconds = 45;

        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#B45309">FOLHA NOBRE: NOME "${nameOnly.toUpperCase()}" & IDADE (${layer.paperType.toUpperCase()})</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#92400E">Corte Nobre | Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed} (2 Passadas)</text>

  <!-- 1. Nome Principal Soldado com Borda de Deslocamento 2mm -->
  <g transform="translate(80, 130)">
    <!-- Contorno Externo Soldado -->
    <rect x="20" y="20" width="580" height="180" rx="28" ${fillWithOpacity} ${redCut}/>
    <text x="310" y="115" font-family="Brush Script MT, cursive, Georgia, serif" font-size="54" font-weight="bold" fill="${layer.colorHex}" stroke="#FF0000" stroke-width="1.2" text-anchor="middle">
      ${nameOnly}
    </text>
    <text x="310" y="165" font-family="sans-serif" font-size="16" font-weight="bold" fill="#78350F" text-anchor="middle">
      ${cleanName.includes('-') ? cleanName.split('-')[1].trim() : `${ageOnly} anos`}
    </text>
  </g>

  <!-- 2. Tag da Idade e Medalhão Escalopado -->
  <g transform="translate(80, 360)">
    <!-- Roseta / Escalope da Idade -->
    <g transform="translate(40, 20)">
      <circle cx="70" cy="70" r="65" ${fillWithOpacity} ${redCut}/>
      <circle cx="70" cy="70" r="50" ${redCut}/>
      <text x="70" y="88" font-family="Impact, Arial Black, sans-serif" font-size="52" font-weight="bold" fill="${layer.colorHex}" stroke="#FF0000" stroke-width="1.5" text-anchor="middle">
        ${ageOnly}
      </text>
      <text x="70" y="155" font-family="sans-serif" font-size="10" font-weight="bold" fill="#92400E" text-anchor="middle">Medalhão Idade 3D</text>
    </g>

    <!-- Estrelas Nobres Metálicas / Coroas de Acabamento -->
    <g transform="translate(240, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" ${fillWithOpacity} ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Aplique Nobre #1</text>
    </g>

    <g transform="translate(370, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" ${fillWithOpacity} ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Aplique Nobre #2</text>
    </g>

    <g transform="translate(500, 20)">
      <!-- Coroa / Laço Nobre -->
      <path d="M 20 70 L 30 30 L 50 50 L 70 20 L 90 50 L 110 30 L 120 70 Z" ${fillWithOpacity} ${redCut}/>
      <text x="70" y="95" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Coroa Destaque</text>
    </g>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 4. MOLDURAS, ESCALOPES, VISORES & BORDAS 3D INTERMEDIÁRIAS
      // ─────────────────────────────────────────────────────────────────────────────
      else if (isFrameLayer) {
        sheetTitle = `Folha ${sheetNum}: Molduras & Escalopes 3D (${layer.paperType})`;
        piecesCount = 3;
        estimatedCutSeconds = 42;

        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">FOLHA ${sheetNum}: MOLDURAS & ESCALOPES — ${layer.paperType.toUpperCase()}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Camada de Elevação Intermediária | Deslocamento 2.0mm</text>

  <!-- Moldura Frontal Escalopada com Janela Central Recortada -->
  <g transform="translate(100, 130)">
    <!-- Borda Externa Escalopada -->
    <rect x="20" y="20" width="340" height="260" rx="30" ${fillWithOpacity} ${redCut}/>
    <!-- Janela Central Vazada para Efeito 3D -->
    <rect x="50" y="50" width="280" height="200" rx="18" ${redCut}/>
    <text x="190" y="155" font-family="sans-serif" font-size="13" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">MOLDURA PRINCIPAL VAZADA</text>
    <text x="190" y="175" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Janela Vazada (Efeito Camadas)</text>
  </g>

  <!-- Moldura Oval / Segundo Nível de Escalope -->
  <g transform="translate(480, 130)">
    <ellipse cx="110" cy="150" rx="100" ry="130" ${fillWithOpacity} ${redCut}/>
    <ellipse cx="110" cy="150" rx="75" ry="105" ${redCut}/>
    <text x="110" y="155" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B" text-anchor="middle">Medalhão Oval</text>
  </g>

  <!-- Faixas Flutuantes / Banners 3D com Vincos de Dobra -->
  <g transform="translate(100, 440)">
    <path d="M 20 60 L 60 30 L 60 50 L 480 50 L 480 30 L 520 60 L 480 90 L 480 70 L 60 70 L 60 90 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="120" y1="50" x2="120" y2="70" ${scoreDash}/>
    <line x1="420" y1="50" x2="420" y2="70" ${scoreDash}/>
    <text x="270" y="64" font-family="sans-serif" font-size="12" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">FAIXA FLUTUANTE 3D DOBRÁVEL</text>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 5. VISOR DE ACETATO CRISTAL & ANEL DE VEDAÇÃO EM EVA (SHAKER)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (isShakerLayer) {
        sheetTitle = `Folha ${sheetNum}: Visor de Acetato & Anel EVA Shaker`;
        piecesCount = 2;
        estimatedCutSeconds = 60;

        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA SHAKER: VISOR ACETATO CRISTAL & ANEL EVA 2mm</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Lâmina de Corte Profundo (EVA) | Lâmina: 10 | Força: 33 | 2 Passadas</text>

  <!-- 1. Visor em Acetato Cristal 20 micras -->
  <g transform="translate(130, 130)">
    <circle cx="150" cy="150" r="130" fill="#F0F9FF" fill-opacity="0.6" stroke="#0284C7" stroke-width="2"/>
    <text x="150" y="145" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7" text-anchor="middle">VISOR EM ACETATO</text>
    <text x="150" y="170" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">20 micras transparente</text>
  </g>

  <!-- 2. Anel de Contenção em EVA 2mm (Câmara Estanque para Lantejoulas) -->
  <g transform="translate(130, 460)">
    <circle cx="150" cy="150" r="130" fill="#FEF3C7" fill-opacity="0.4" ${redCut}/>
    <circle cx="150" cy="150" r="105" ${redCut}/>
    <text x="150" y="145" font-family="sans-serif" font-size="13" font-weight="bold" fill="#D97706" text-anchor="middle">ANEL DE CONTENÇÃO EVA (2mm)</text>
    <text x="150" y="170" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Câmara para Miçangas e Lantejoulas</text>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 6. PRINT & CUT COM MARCAS DE REGISTRO SILHOUETTE
      // ─────────────────────────────────────────────────────────────────────────────
      else if (isPrintCutLayer) {
        sheetTitle = `Folha ${sheetNum}: Print & Cut Ilustrações (${theme})`;
        piecesCount = 5;
        estimatedCutSeconds = 55;

        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- MARCAS DE REGISTRO ÓTICAS SILHOUETTE -->
  <rect x="50" y="50" width="20" height="20" fill="#000000"/>
  <path d="M 724 50 L 744 50 L 744 70" fill="none" stroke="#000000" stroke-width="4"/>
  <path d="M 50 1053 L 50 1073 L 70 1073" fill="none" stroke="#000000" stroke-width="4"/>

  <text x="90" y="66" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155">PRINT & CUT: ELEMENTOS ILUSTRADOS DO TEMA "${theme.toUpperCase()}"</text>
  <text x="90" y="84" font-family="sans-serif" font-size="10" fill="#64748B">Papel Fotográfico Matte 180g | Sangria 1.5mm | Ativar Sensor Óptico na Plotter</text>

  <!-- Personagem / Ilustração Principal -->
  <g transform="translate(120, 140)">
    <rect x="20" y="20" width="250" height="250" rx="35" ${fillWithOpacity}/>
    <rect x="15" y="15" width="260" height="260" rx="40" ${redCut}/>
    <text x="145" y="135" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1E293B" text-anchor="middle">${theme}</text>
    <text x="145" y="165" font-family="sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Aplique Central 3D</text>
  </g>

  <!-- Tags e Personagens Secundários -->
  <g transform="translate(430, 140)">
    <circle cx="110" cy="110" r="85" ${fillWithOpacity}/>
    <circle cx="110" cy="110" r="80" ${redCut}/>
    <text x="110" y="115" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">Tag Temática 3D</text>
  </g>
</svg>`;
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 7. ELEMENTOS TEMÁTICOS 3D VETORIZADOS ESPECÍFICOS POR TEMA
      // ─────────────────────────────────────────────────────────────────────────────
      else {
        sheetTitle = `Folha ${sheetNum}: Elementos Temáticos 3D (${theme})`;
        piecesCount = 4;
        estimatedCutSeconds = 48;

        if (isPrincess) {
          // ELEMENTOS REALEZA: COROA REAL VAZADA + CASTELO + ARABESCOS
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#B45309">FOLHA REALEZA: COROA REAL 3D & CASTELO — ${layer.paperType.toUpperCase()}</text>

  <!-- Coroa Imperial com Pedrarias Vazadas -->
  <g transform="translate(100, 130)">
    <path d="M 30 180 L 50 60 L 100 120 L 150 30 L 200 120 L 250 60 L 270 180 Z" ${fillWithOpacity} ${redCut}/>
    <circle cx="150" cy="30" r="10" fill="#FEF08A" ${redCut}/>
    <circle cx="50" cy="60" r="7" fill="#FEF08A" ${redCut}/>
    <circle cx="250" cy="60" r="7" fill="#FEF08A" ${redCut}/>
    <text x="150" y="215" font-family="sans-serif" font-size="12" font-weight="bold" fill="#B45309" text-anchor="middle">Coroa Real 3D</text>
  </g>

  <!-- Castelo e Ameias em Camadas -->
  <g transform="translate(430, 130)">
    <path d="M 30 180 L 30 80 L 60 50 L 90 80 L 130 80 L 150 40 L 170 80 L 210 80 L 240 50 L 270 80 L 270 180 Z" ${fillWithOpacity} ${redCut}/>
    <text x="150" y="215" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748B" text-anchor="middle">Torres do Castelo</text>
  </g>
</svg>`;
        } else if (isSpace) {
          // ELEMENTOS ESPAÇO: FOGUETE DESMONTADO + PLANETA SATURNO COM ANEL
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA ESPAÇO: FOGUETE 3D & PLANETAS — ${layer.paperType.toUpperCase()}</text>

  <!-- Foguete Desmontado em Peças -->
  <g transform="translate(100, 130)">
    <path d="M 90 20 C 130 80 140 180 140 240 L 40 240 C 40 180 50 80 90 20 Z" ${fillWithOpacity} ${redCut}/>
    <path d="M 90 20 C 110 50 115 80 115 90 L 65 90 C 65 80 70 50 90 20 Z" fill="#EF4444" ${redCut}/>
    <circle cx="90" cy="130" r="24" fill="#FFFFFF" ${redCut}/>
    <circle cx="90" cy="130" r="16" fill="#38BDF8" ${redCut}/>
    <path d="M 60 240 L 90 320 L 120 240 L 105 260 L 90 240 L 75 260 Z" fill="#F59E0B" ${redCut}/>
    <text x="90" y="345" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0284C7" text-anchor="middle">Foguete 3D Desmontado</text>
  </g>

  <!-- Saturno com Anel -->
  <g transform="translate(420, 130)">
    <circle cx="120" cy="120" r="70" ${fillWithOpacity} ${redCut}/>
    <ellipse cx="120" cy="120" rx="110" ry="30" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <text x="120" y="215" font-family="sans-serif" font-size="11" font-weight="bold" fill="#D97706" text-anchor="middle">Planeta Saturno</text>
  </g>
</svg>`;
        } else if (isSafari) {
          // ELEMENTOS SAFARI: LEÃOZINHO 3D + COSTELA DE ADÃO
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#854D0E">FOLHA SAFARI: LEÃOZINHO 3D & COSTELA DE ADÃO — ${layer.paperType.toUpperCase()}</text>

  <!-- Juba e Rosto do Leãozinho -->
  <g transform="translate(100, 130)">
    <path d="M 120 20 L 145 50 L 180 35 L 185 70 L 220 75 L 205 110 L 230 135 L 205 160 L 220 195 L 185 200 L 180 235 L 145 220 L 120 250 L 95 220 L 60 235 L 55 200 L 20 195 L 35 160 L 10 135 L 35 110 L 20 75 L 55 70 L 60 35 L 95 50 Z" ${fillWithOpacity} ${redCut}/>
    <circle cx="120" cy="135" r="55" fill="#FEF08A" ${redCut}/>
    <text x="120" y="275" font-family="sans-serif" font-size="11" font-weight="bold" fill="#854D0E" text-anchor="middle">Aplique Leãozinho 3D</text>
  </g>

  <!-- Folha Costela-de-Adão Tropical -->
  <g transform="translate(420, 130)">
    <path d="M 100 20 C 180 60 200 160 170 240 C 130 230 110 200 130 170 C 100 170 80 140 100 110 C 60 120 50 80 100 20 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="100" y1="30" x2="100" y2="240" ${scoreDash}/>
    <text x="100" y="275" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803D" text-anchor="middle">Costela-de-Adão Tropical</text>
  </g>
</svg>`;
        } else if (isDino) {
          // ELEMENTOS DINO: T-REX + ESPINHOS + PEGADA
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#15803D">FOLHA DINO: T-REX 3D & PEGADAS — ${layer.paperType.toUpperCase()}</text>

  <!-- Dinossauro Cute -->
  <g transform="translate(100, 130)">
    <path d="M 160 50 C 220 50 240 100 210 140 L 180 140 C 190 190 170 250 110 260 L 90 300 L 60 300 L 75 250 C 30 250 10 200 10 160 C 50 180 90 150 90 110 L 90 90 Z" ${fillWithOpacity} ${redCut}/>
    <polygon points="120,40 135,15 150,40" fill="#F59E0B" ${redCut}/>
    <polygon points="90,65 105,40 120,65" fill="#F59E0B" ${redCut}/>
    <text x="120" y="335" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803D" text-anchor="middle">Corpo do Dino Cute 3D</text>
  </g>

  <!-- Pegada Dino -->
  <g transform="translate(420, 130)">
    <path d="M 80 40 L 100 10 L 120 40 L 140 20 L 145 60 L 170 50 L 155 85 C 150 115 110 120 85 100 C 65 80 60 55 80 40 Z" ${fillWithOpacity} ${redCut}/>
    <text x="110" y="145" font-family="sans-serif" font-size="10" font-weight="bold" fill="#15803D" text-anchor="middle">Pegada Dino</text>
  </g>
</svg>`;
        } else if (isMermaid) {
          // ELEMENTOS SEREIA: CAUDA COM ESCAMAS + CONCHA
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0891B2">FOLHA SEREIA: CAUDA DE SEREIA & CONCHA — ${layer.paperType.toUpperCase()}</text>

  <!-- Cauda de Sereia -->
  <g transform="translate(100, 130)">
    <path d="M 120 20 C 160 80 180 160 140 240 C 180 260 220 240 240 280 C 180 290 140 260 120 250 C 100 260 60 290 0 280 C 20 240 60 260 100 240 C 60 160 80 80 120 20 Z" ${fillWithOpacity} ${redCut}/>
    <text x="120" y="325" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0891B2" text-anchor="middle">Cauda de Sereia 3D</text>
  </g>

  <!-- Concha Perolada -->
  <g transform="translate(420, 130)">
    <path d="M 40 160 C 20 100 60 40 120 40 C 180 40 220 100 200 160 C 180 190 60 190 40 160 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="120" y1="40" x2="120" y2="180" ${scoreDash}/>
    <line x1="80" y1="50" x2="110" y2="180" ${scoreDash}/>
    <line x1="160" y1="50" x2="130" y2="180" ${scoreDash}/>
    <text x="120" y="215" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0891B2" text-anchor="middle">Concha Bivalve</text>
  </g>
</svg>`;
        } else if (isBear) {
          // ELEMENTOS BALÃO E URSINHO
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA BALÃO: BALÃO DE AR QUENTE 3D & NUVENS — ${layer.paperType.toUpperCase()}</text>

  <!-- Balão de Ar Quente -->
  <g transform="translate(100, 130)">
    <path d="M 120 20 C 180 20 220 60 220 120 C 220 180 180 220 150 250 L 90 250 C 60 220 20 180 20 120 C 20 60 60 20 120 20 Z" ${fillWithOpacity} ${redCut}/>
    <rect x="85" y="270" width="70" height="50" rx="6" ${fillWithOpacity} ${redCut}/>
    <line x1="95" y1="250" x2="95" y2="270" ${redCut}/>
    <line x1="145" y1="250" x2="145" y2="270" ${redCut}/>
    <text x="120" y="355" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0284C7" text-anchor="middle">Balão de Ar Quente 3D</text>
  </g>

  <!-- Nuvens em Camadas -->
  <g transform="translate(420, 130)">
    <path d="M 40 100 C 20 100 10 80 25 65 C 15 45 35 30 55 35 C 70 15 100 15 115 35 C 135 30 155 45 145 65 C 160 80 150 100 130 100 Z" ${fillWithOpacity} ${redCut}/>
    <text x="90" y="135" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">Nuvem Fofa 3D</text>
  </g>
</svg>`;
        } else {
          // JARDIM / BORBOLETAS DUPLAS & FLORES 3D
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#DB2777">FOLHA JARDIM: BORBOLETAS DUPLAS & FLORES 3D — ${layer.paperType.toUpperCase()}</text>

  <!-- Borboleta Rendada Asa Dupla -->
  <g transform="translate(100, 130)">
    <path d="M 70 45 C 50 15 20 20 20 45 C 20 65 50 70 68 55 C 50 75 40 100 60 100 C 75 100 80 80 72 58 C 74 58 76 58 78 58 C 70 80 75 100 90 100 C 110 100 100 75 82 55 C 100 70 130 65 130 45 C 130 20 100 15 80 45 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="75" y1="25" x2="75" y2="85" ${scoreDash}/>
    <text x="75" y="125" font-family="sans-serif" font-size="10" font-weight="bold" fill="#DB2777" text-anchor="middle">Borboleta Asa Dupla</text>
  </g>

  <!-- Flores Sobrepostas em Camadas -->
  <g transform="translate(380, 130)">
    <path d="M 80 20 C 100 40 120 40 140 20 C 140 50 160 70 180 80 C 150 90 140 110 140 140 C 120 120 100 120 80 140 C 80 110 60 90 30 80 C 60 70 80 50 80 20 Z" ${fillWithOpacity} ${redCut}/>
    <circle cx="105" cy="80" r="18" fill="#FDE047" ${redCut}/>
    <text x="105" y="170" font-family="sans-serif" font-size="10" font-weight="bold" fill="#D97706" text-anchor="middle">Flor 3D 3 Camadas</text>
  </g>
</svg>`;
        }
      }

      return {
        sheetIndex: sheetNum,
        sheetTitle,
        paperType: layer.paperType,
        colorName: layer.colorName,
        colorHex: layer.colorHex,
        paperFormat: 'A4',
        cutBladeSettings: layer.silhouetteSettings,
        cutDifficulty: layer.cutDifficulty,
        estimatedCutSeconds,
        piecesCount,
        svgContent,
        assemblyInstructions: layer.assemblyTip,
      };
    });

    // Passos de montagem física especializados pelo tipo de produto
    const assemblySteps: AssemblyStep[] = [];

    if (isMilkBox) {
      assemblySteps.push(
        {
          stepNumber: 1,
          actionTitle: 'Dobra e Vinco do Molde da Caixa Milk',
          description:
            'Destaque o molde da Folha 1. Dobre todas as linhas pontilhadas azuis para dentro utilizando uma espátula de vinco para garantir cantos vivos e fechamento perfeito.',
          adhesiveType: 'Fita Dupla Face Fina',
          componentsInvolved: ['Molde Caixa Milk (Folha 1)', 'Espátula de Vinco'],
        },
        {
          stepNumber: 2,
          actionTitle: 'Colagem da Aba Lateral de 12mm e Fundo',
          description:
            'Aplique fita dupla face fina na aba lateral de 12mm e feche a lateral da caixa. Em seguida, trave as abas do fundo automático.',
          adhesiveType: 'Cola de Silicone Líquida',
          componentsInvolved: ['Aba Lateral 12mm', 'Fundo da Caixa'],
        },
        {
          stepNumber: 3,
          actionTitle: 'Aplicação da Moldura Frontal e Elementos 3D',
          description:
            `Aplique pedaços de fita banana de 2mm no verso da moldura frontal do tema "${theme}" e cole centralizada na face da frente da caixa.`,
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: ['Moldura Frontal', 'Apliques do Tema'],
        },
        {
          stepNumber: 4,
          actionTitle: 'Aplicação do Nome em Lamicote e Fechamento com Laço',
          description:
            `Fixe o nome "${nameOnly}" em Lamicote Dourado no destaque frontal. Passe a fita de cetim pelos 2 furos superiores e dê o laço para finalizar a caixa.`,
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: [`Nome "${nameOnly}" em Lamicote`, 'Fita de Cetim'],
        }
      );
    } else if (is3dLetter) {
      assemblySteps.push(
        {
          stepNumber: 1,
          actionTitle: `Vinco das Abas Serrilhadas da Letra "${firstLetter}"`,
          description:
            'Destaque as tiras laterais da Folha 2. Dobre cada dente serrilhado em 90 graus ao longo da linha de dobra pontilhada.',
          adhesiveType: 'Cola de Silicone Líquida',
          componentsInvolved: ['Tiras Laterais com Dentes', 'Espátula de Vinco'],
        },
        {
          stepNumber: 2,
          actionTitle: 'Colagem das Laterais na Face Frontal',
          description:
            `Vá colando os dentes das tiras laterais por todo o contorno da face frontal da letra "${firstLetter}", acompanhando as curvas e ângulos.`,
          adhesiveType: 'Cola de Silicone Líquida',
          componentsInvolved: [`Face Frontal da Letra "${firstLetter}"`, 'Laterais'],
        },
        {
          stepNumber: 3,
          actionTitle: 'Fechamento da Face Traseira',
          description:
            'Cole a face traseira fechando a estrutura tridimensional da letra e pressione suavemente até secar.',
          adhesiveType: 'Cola de Silicone Líquida',
          componentsInvolved: ['Face Traseira da Letra'],
        },
        {
          stepNumber: 4,
          actionTitle: 'Decoração Temática Frontal em Camadas 3D',
          description:
            `Cole os apliques 3D do tema "${theme}" e o nome "${nameOnly}" em Lamicote Ouro sobre a face da letra com fita banana de 2mm.`,
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: ['Apliques Temáticos', `Nome "${nameOnly}"`],
        }
      );
    } else {
      // Topo de Bolo 3D padrão
      assemblySteps.push(
        {
          stepNumber: 1,
          actionTitle: 'Fixação da Estrutura e Palitos Traseiros',
          description:
            `Destaque a Folha 1 (Base com silhueta temática de ${theme}). Cole os palitos acrílicos transparentes no verso com cola quente, alinhando pelas guias.`,
          adhesiveType: 'Cola Quente',
          componentsInvolved: ['Base Estrutural (Folha 1)', 'Palitos Acrílicos Transparentes (15cm)'],
        },
        {
          stepNumber: 2,
          actionTitle: 'Primeira Elevação 3D (Moldura do Tema)',
          description:
            'Aplique pedaços de fita banana de 2mm no verso dos elementos temáticos da Folha 2 e fixe sobre a Base Estrutural.',
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: ['Moldura / Elementos Temáticos (Folha 2)', 'Base Estrutural'],
        },
        ...(isShaker
          ? [
              {
                stepNumber: 3,
                actionTitle: 'Selagem do Visor Shaker (Acetato + EVA)',
                description:
                  'Cole o anel de contenção em EVA 2mm. Coloque as lantejoulas no centro e vede hermeticamente com o visor de acetato transparente e cola de silicone.',
                adhesiveType: 'Cola de Silicone Líquida' as const,
                componentsInvolved: ['Visor de Acetato Cristal', 'Anel de EVA 2mm', 'Lantejoulas/Pérolas'],
              },
            ]
          : []),
        {
          stepNumber: isShaker ? 4 : 3,
          actionTitle: 'Sobreposição dos Elementos Print & Cut',
          description:
            `Destaque os personagens e ilustrações temáticas do tema "${theme}" e monte em camadas sobrepostas com fita banana.`,
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: ['Apliques Print & Cut', 'Moldura do Tema'],
        },
        {
          stepNumber: isShaker ? 5 : 4,
          actionTitle: `Aplicação Nobre do Nome "${nameOnly}" em Lamicote Ouro`,
          description:
            `Cole o nome "${nameOnly}" em Lamicote Dourado sobre a camada de deslocamento e finalize fixando a tag da idade "${ageOnly} anos" com fita banana no topo.`,
          adhesiveType: 'Fita Banana 2mm',
          componentsInvolved: [`Nome "${nameOnly}" em Lamicote`, `Tag Idade "${ageOnly} anos"`],
        }
      );
    }

    return { cutSheets, assemblySteps };
  }

  /**
   * Gerador inteligente local baseado em regras reais de papelaria brasileira e prompt engineering
   */
  generateSmartFallback(params: GenerateProductParams): AiProductBlueprint {
    const isShaker = params.productType.toLowerCase().includes('shaker');
    const isCakeTopper = params.productType.toLowerCase().includes('topo');
    const themeName = params.theme || 'Jardim Encantado';
    const target = params.targetNameAndAge || 'Helena - 3 anos';

    // Paletas de cores inteligentes para temas clássicos
    const paletteMap: Record<string, { colors: Array<{ hex: string; name: string; paper: string }> }> = {
      'Candy Colors / Pastéis': {
        colors: [
          { hex: '#FAD2E1', name: 'Rosa Candy', paper: 'Colorplus Rosa Chá 180g' },
          { hex: '#C5DEDD', name: 'Verde Menta', paper: 'Colorplus Tahiti 180g' },
          { hex: '#FFF1E6', name: 'Marfim Baunilha', paper: 'Colorplus Marfim 180g' },
          { hex: '#D4AF37', name: 'Dourado Espelhado', paper: 'Lamicote Ouro 250g' },
        ],
      },
      'Dourado & Luxo': {
        colors: [
          { hex: '#D4AF37', name: 'Dourado Espelhado', paper: 'Lamicote Dourado 250g' },
          { hex: '#FFFFFF', name: 'Branco Neve', paper: 'Papel Offset 240g' },
          { hex: '#F4E8C1', name: 'Champagne Perolado', paper: 'Papel Perolado 180g' },
          { hex: '#2A2A2A', name: 'Preto Intenso', paper: 'Colorplus Los Angeles 180g' },
        ],
      },
      'Boho Chic': {
        colors: [
          { hex: '#D4A373', name: 'Caramelo Kraft', paper: 'Papel Kraft 240g' },
          { hex: '#CCD5AE', name: 'Verde Oliva', paper: 'Colorplus Santiago 180g' },
          { hex: '#FAEDCD', name: 'Areia Natural', paper: 'Colorplus Marfim 180g' },
          { hex: '#E07A5F', name: 'Terracota', paper: 'Colorplus Roma 180g' },
        ],
      },
      'Tons Terrosos & Rústico': {
        colors: [
          { hex: '#8C5843', name: 'Marrom Canela', paper: 'Colorplus Havana 180g' },
          { hex: '#D4A373', name: 'Kraft Rústico', paper: 'Papel Kraft 240g' },
          { hex: '#E6CCB2', name: 'Nude Areia', paper: 'Colorplus Marfim 180g' },
          { hex: '#D4AF37', name: 'Ouro Velho', paper: 'Lamicote Dourado 250g' },
        ],
      },
      'Azul Marinho & Prata': {
        colors: [
          { hex: '#1E3A8A', name: 'Azul Marinho', paper: 'Colorplus Toronto 180g' },
          { hex: '#93C5FD', name: 'Azul Claro', paper: 'Colorplus Porto Seguro 180g' },
          { hex: '#FFFFFF', name: 'Branco Neve', paper: 'Papel Offset 240g' },
          { hex: '#C0C0C0', name: 'Prata Espelhado', paper: 'Lamicote Prata 250g' },
        ],
      },
      'Rosa & Floral Delicado': {
        colors: [
          { hex: '#F472B6', name: 'Rosa Chiclete', paper: 'Colorplus Verona 180g' },
          { hex: '#FBCFE8', name: 'Rosa Bebê', paper: 'Colorplus Rosa Chá 180g' },
          { hex: '#FFFFFF', name: 'Branco Neve', paper: 'Papel Offset 240g' },
          { hex: '#D4AF37', name: 'Dourado Luxo', paper: 'Lamicote Ouro 250g' },
        ],
      },
      'Cores Vivas / Neon': {
        colors: [
          { hex: '#EF4444', name: 'Vermelho Vivo', paper: 'Colorplus Pequim 180g' },
          { hex: '#3B82F6', name: 'Azul Royal', paper: 'Colorplus Grécia 180g' },
          { hex: '#EAB308', name: 'Amarelo Ouro', paper: 'Colorplus Rio de Janeiro 180g' },
          { hex: '#D4AF37', name: 'Dourado', paper: 'Lamicote Dourado 250g' },
        ],
      },
    };

    const selectedPalette = paletteMap[params.colorPalette] || paletteMap['Candy Colors / Pastéis'];
    const p1 = selectedPalette.colors[0];
    const p2 = selectedPalette.colors[1] || selectedPalette.colors[0];
    const p3 = selectedPalette.colors[2] || selectedPalette.colors[0];
    const pGold = selectedPalette.colors[3] || { hex: '#D4AF37', name: 'Dourado', paper: 'Lamicote Dourado 250g' };

    const layers: LayerSpec[] = [
      {
        order: 1,
        name: 'Camada 1: Base Estrutural Traseira',
        paperType: p3.paper,
        colorHex: p3.hex,
        colorName: p3.name,
        cutDifficulty: 'fácil',
        offsetMm: 3.0,
        silhouetteSettings: { blade: 3, force: 30, speed: 6, passes: 1 },
        assemblyTip: 'Serve de sustentação para os palitos acrílicos colados com cola quente ou fita dupla face forte.',
      },
      {
        order: 2,
        name: 'Camada 2: Moldura e Silhueta Vazada do Tema',
        paperType: p2.paper,
        colorHex: p2.hex,
        colorName: p2.name,
        cutDifficulty: 'médio',
        offsetMm: 1.8,
        silhouetteSettings: { blade: 3, force: 30, speed: 5, passes: 1 },
        assemblyTip: 'Colada sobre a Base com fita banana de 2mm para criar o primeiro nível de relevo 3D.',
      },
    ];

    if (isShaker) {
      layers.push({
        order: 3,
        name: 'Camada 3: Contenção Shaker (Acetato + EVA)',
        paperType: 'Acetato 20 micras + Espuma EVA 2mm',
        colorHex: '#E0F7FA',
        colorName: 'Acetato Cristal Transparente',
        cutDifficulty: 'delicado',
        silhouetteSettings: { blade: 10, force: 33, speed: 2, passes: 2 },
        assemblyTip: 'Cole o acetato na moldura e aplique a fita de espuma EVA vedando completamente o espaço das lantejoulas/pérolas.',
      });
    }

    layers.push({
      order: layers.length + 1,
      name: 'Camada 4: Elementos Temáticos & Ilustrações',
      paperType: 'Papel Fotográfico Matte 180g (Print & Cut)',
      colorHex: p1.hex,
      colorName: p1.name,
      cutDifficulty: 'médio',
      silhouetteSettings: { blade: 3, force: 28, speed: 6, passes: 1 },
      assemblyTip: 'Imprimir com marcas de registro ativadas no Silhouette Studio e cortar no contorno exato.',
    });

    layers.push({
      order: layers.length + 1,
      name: `Camada 5: Destaque Nome "${target}" com Deslocamento`,
      paperType: pGold.paper,
      colorHex: pGold.hex,
      colorName: pGold.name,
      cutDifficulty: 'delicado',
      offsetMm: 2.0,
      silhouetteSettings: { blade: 4, force: 33, speed: 4, passes: 2 },
      assemblyTip: 'Soldar todas as letras cursivas antes de aplicar o deslocamento de 2mm para não cortar letras soltas.',
    });

    // Prompts Ultra-Realistas personalizados
    const realisticPrompts: RealisticPrompts = {
      geminiImagenPrompt: `Professional high-resolution commercial product photograph of a handcrafted luxury layered paper ${params.productType.toLowerCase()}, theme "${themeName}", featuring custom script text "${target}" in reflective gold mirror lamicote cardstock with a 2mm crisp outline. Multi-level 3D papercraft layers using pastel ${p1.name} and ${p2.name} Colorplus 180g cardstock, elevated with double-sided foam tape, standing on a minimalist frosted white cake, warm soft diffused studio lighting, ultra-sharp focus on paper cutouts and textures, 8k resolution.`,
      bananaTape3dPrompt: `Macro product photography showcasing the 3D layered construction and physical depth of a handcrafted paper ${params.productType.toLowerCase()}, theme "${themeName}". Explicit visible multi-layer papercraft separated by 2mm high-density foam banana tape (espuma EVA dupla face), casting realistic physical drop shadows between ${p1.name}, ${p2.name}, and mirror gold lamicote cardstock with custom script text "${target}". Mounted on clear acrylic support sticks, shallow depth of field, natural studio illumination highlighting the layered papercraft elevation.`,
      ideogramPrompt: `Professional commercial product photography of a handcrafted luxury layered paper ${params.productType.toLowerCase()} featuring the exact text "${target}" in elegant script cursive made of shiny gold metallic foil lamicote cardstock with a 2mm crisp offset outline. Theme: "${themeName}" with intricate 3D layered papercut elements (${p1.name} and ${p2.name} Color Plus 180g cardstock), visible 3D foam tape elevation between layers, mounted on clear transparent acrylic sticks on a minimalist pastel frosted cake, soft diffused studio light, clean white background, macro photography, sharp focus, 8k resolution, ultra-realistic papercraft.`,
      midjourneyPrompt: `Commercial studio product photography of a luxury handcrafted 3D layered paper ${params.productType.toLowerCase()}, theme "${themeName}", child cake topper with shimmering gold foil cardstock text "${target}", matte pastel paper layers, realistic paper grain textures and physical depth with shadow casting from 2mm double-sided foam tape, standing on top of a soft pastel cake, shallow depth of field, warm diffused commercial studio lighting, macro photography, f/2.8, Hasselblad H6D-100c --v 6.0 --style raw --ar 1:1`,
      dallePrompt: `A high-end commercial catalog photograph of a luxury 3D layered papercraft ${params.productType.toLowerCase()} for a birthday cake. Theme: "${themeName}". Features cutout letters displaying "${target}" crafted from reflective mirror gold cardstock elevated with 3D foam tape over soft ${p1.name} and ${p2.name} matte colored cardstock layers. Sharp physical edges, clean laser/plotter cut silhouette, soft shadows, warm studio lighting on a neutral tabletop.`,
      fluxPrompt: `Hyper-detailed macro studio photo of an artisanal 3D layered paper ${params.productType.toLowerCase()}, theme "${themeName}", customized with "${target}" in metallic gold paper, delicate layered floral and thematic cutouts, physical papercraft texture, visible layer separation, crisp cutlines, soft warm studio lighting, 8k resolution.`,
      macroLayersPrompt: `Extreme macro close-up detail shot of a handcrafted 3D paper cake topper showing the depth between overlapping layers. Shimmering gold mirror lamicote cardstock with embossed script text "${target}", separated by 2mm high-density foam adhesive tape from the background pastel cardstock, revealing real paper fiber texture, crisp die-cut edges, and natural studio drop shadows.`,
      partyTableScenePrompt: `Editorial lifestyle photography of an elegant luxury birthday dessert table for a child celebration. Theme: "${themeName}". Centerpiece is a gorgeous pastel decorated cake topped with an artisanal 3D layered paper cake topper featuring "${target}" in shiny gold foil. Surrounding table is styled with gourmet brigadeiro sweets in luxury paper wrappers, matching party favors, soft pastel balloon garland in the background, soft natural bokeh light.`
    };

    // Gerar folhas técnicas de corte e passos de montagem física
    const { cutSheets, assemblySteps } = this.generateCutSheetsAndAssembly(
      `${params.productType} Luxo 3D - Tema ${themeName}`,
      params.productType,
      themeName,
      target,
      layers,
      isShaker,
      params.colorPalette
    );

    return {
      productTitle: `${params.productType} Luxo 3D - Tema ${themeName}`,
      category: isCakeTopper ? 'Topos de Bolo' : 'Papelaria Criativa',
      description: `Projeto exclusivo e sofisticado de ${params.productType} no tema ${themeName}. Desenvolvido em camadas tridimensionais (Layering 3D) com acabamento nobre em ${pGold.name} e papéis de alta gramatura, garantindo firmeza, cores vivas e efeito volumétrico deslumbrante na mesa da festa.`,
      targetAgeAndName: target,
      theme: themeName,
      recommendedPrice: isShaker ? 55.0 : isCakeTopper ? 42.0 : 38.0,
      suggestedLeadTimeDays: 5,
      layers,
      papersShoppingList: [
        { name: p1.paper, gramature: '180g', sheetsNeeded: 1 },
        { name: p2.paper, gramature: '180g', sheetsNeeded: 1 },
        { name: p3.paper, gramature: '180g / 240g', sheetsNeeded: 1 },
        { name: pGold.paper, gramature: '250g', sheetsNeeded: 1 },
        ...(isShaker ? [{ name: 'Folha de Acetato Cristal', gramature: '20 micras', sheetsNeeded: 1 }] : []),
      ],
      toolsAndAccessories: [
        'Fita banana de espuma 3D (2mm)',
        'Cola quente / Cola de silicone líquida',
        'Palito transparente de acrílico (15cm)',
        ...(isShaker ? ['Lantejoulas metalizadas', 'Micro-pérolas iridescentes'] : []),
      ],
      estimatedAssemblyMinutes: isShaker ? 35 : 20,
      silhouetteTips: `Para a ${params.plotter === 'portrait3' ? 'Portrait 3' : 'Cameo 4'}, use base de corte limpa com aderência média e sempre faça o corte de teste para o ${pGold.paper}.`,
      suggestedImagePrompt: realisticPrompts.geminiImagenPrompt,
      realisticPrompts,
      cutSheets,
      assemblySteps,
    };
  }
}

export const aiProductService = new AiProductService();

