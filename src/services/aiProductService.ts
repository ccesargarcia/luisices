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
Você é uma Engenheira de Papelaria Personalizada de Luxo e Especialista em Silhouette Studio, Cricut e Scanncut.
Sua missão é analisar visualmente a IMAGEM enviada (que pode ser uma foto de produto real ou uma imagem hiper-realista gerada por IA) e realizar a ENGENHARIA REVERSA COMPLETA para produção física de corte e montagem.

INSTRUÇÕES DE INSPEÇÃO VISUAL OBRIGATÓRIAS:
1. IDENTIFICAÇÃO DO PRODUTO:
   - Identifique a categoria exata: "Topo de Bolo 3D", "Topo Shaker Luxo", "Caixa Milk 3D", "Caixa Pirâmide", "Letra 3D Personalizada", "Marcador de Página Luxo", etc.
   - Identifique o tema visual predominante (ex: "Astronauta", "Jardim Encantado", "Safari Baby", "Circo Rosa", "Sereia", "Dino Baby", "Princesas", etc.).
   - Faça OCR e leitura visual minuciosa de qualquer nome, idade ou texto escrito na peça. Se não houver nome legível, sugira um exemplo harmonioso (ex: "Helena 3 anos").

2. DECOMPOSIÇÃO EM CAMADAS FÍSICAS (De baixo para cima):
   - Camada 1: Base de Fundo / Estrutura rígida (papel recomendado, gramatura 180g a 240g, cor hex exata e nome do papel).
   - Camadas Intermediárias: Molduras com offset de 2.0mm, elementos temáticos elevados com fita banana de 2mm.
   - Camadas Especiais (se visível): Visor transparente de acetato cristal, anel de contenção em EVA 2mm (se shaker), pedrarias ou lantejoulas.
   - Camada Superior / Destaque: Letras do nome, apliques em Lamicote metálico (Dourado, Prata, Rose Gold) ou Glitter com relevo.

3. LISTA DE MATERIAIS & CORES:
   - Extraia as cores exatas da imagem e mapeie para tipos de papéis comerciais (Colorplus, Lamicote, Kraft, Acetato, EVA).
   - Sugira lista de compras precisa (quantidades de folhas A4, espessuras de fita banana, palitos ou fitas).

4. RETORNE ESTRITAMENTE UM JSON com este schema:
{
  "productTitle": "Título comercial descritivo e luxuoso",
  "category": "Topos de Bolo" | "Lembrancinhas" | "Papelaria Criativa" | "Kits Festa",
  "description": "Descrição detalhada do produto inspecionado na imagem",
  "targetAgeAndName": "Nome e Idade extraídos da imagem ou sugeridos",
  "theme": "Tema detectado na imagem",
  "recommendedPrice": 45.00,
  "suggestedLeadTimeDays": 5,
  "layers": [
    {
      "order": 1,
      "name": "Nome da camada",
      "paperType": "Ex: Colorplus Rosa Chá 180g",
      "colorHex": "#E8B4B8",
      "colorName": "Rosa Chá",
      "cutDifficulty": "fácil" | "médio" | "difícil",
      "offsetMm": 2.5,
      "silhouetteSettings": { "blade": 3, "force": 30, "speed": 5, "passes": 1 },
      "assemblyTip": "Dica de montagem e colagem"
    }
  ],
  "papersShoppingList": [
    { "name": "Nome do papel", "gramature": "180g", "sheetsNeeded": 1 }
  ],
  "toolsAndAccessories": ["Fita banana 2mm", "Cola de silicone líquida"],
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
   * Gera pranchas de corte em vetor SVG 100% personalizadas de acordo com o Tipo de Produto, Tema e Nome/Idade
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
    const isBookmark = normType.includes('marcador');
    const isCakeTopper = normType.includes('topo') && !isMilkBox && !is3dLetter;

    // Detectar tema para elementos visuais específicos
    const isGarden = normTheme.includes('jardim') || normTheme.includes('borbolet') || normTheme.includes('flor') || normTheme.includes('fada');
    const isSpace = normTheme.includes('astronauta') || normTheme.includes('espaço') || normTheme.includes('galáxia') || normTheme.includes('planeta');
    const isSafari = normTheme.includes('safari') || normTheme.includes('selva') || normTheme.includes('bichinho') || normTheme.includes('leão');
    const isCircus = normTheme.includes('circo') || normTheme.includes('palhac') || normTheme.includes('vintage');
    const isDino = normTheme.includes('dino') || normTheme.includes('dinossauro') || normTheme.includes('jurássic');
    const isMermaid = normTheme.includes('sereia') || normTheme.includes('mar') || normTheme.includes('ariel') || normTheme.includes('fundo do mar');
    const isPrincess = normTheme.includes('princesa') || normTheme.includes('realeza') || normTheme.includes('castelo') || normTheme.includes('coroa');

    const redCut = 'stroke="#FF0000" stroke-width="1.5" fill="none"';
    const scoreDash = 'stroke="#0000FF" stroke-width="1.2" stroke-dasharray="6,4" fill="none"';

    const cutSheets: CutSheet[] = layers.map((layer, index) => {
      const sheetNum = index + 1;
      let sheetTitle = `Folha ${sheetNum}: ${layer.name}`;
      let piecesCount = 3;
      let estimatedCutSeconds = 40 + index * 10;
      let svgContent = '';
      const fillWithOpacity = `fill="${layer.colorHex}" fill-opacity="0.18"`;

      // ─────────────────────────────────────────────────────────────────────────────
      // CASO 1: CAIXA MILK 3D (GABARITO PLANIFICADO REAL COM VINGOS E APLIQUES)
      // ─────────────────────────────────────────────────────────────────────────────
      if (isMilkBox) {
        if (index === 0) {
          sheetTitle = `Folha 1: Molde Planificado Caixa Milk (${layer.paperType})`;
          piecesCount = 1;
          estimatedCutSeconds = 55;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO ESTRUTURAL CAIXA MILK (A4 210x297mm) -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 1: MOLDE PLANIFICADO CAIXA MILK — ${layer.paperType}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#94A3B8">Vermelho (#FF0000) = Corte | Azul Pontilhado (#0000FF) = Vincos de Dobra</text>

  <!-- Molde Completo da Caixa Milk com 4 Faces + Aba de Colagem + Fundo + Topo Triangular -->
  <g transform="translate(65, 120)">
    <!-- Contorno Externo de Corte -->
    <path d="M 30 140 
             L 30 20 L 50 20 L 50 140 
             L 190 140 L 190 20 L 210 20 L 210 140 
             L 350 140 L 350 20 L 370 20 L 370 140 
             L 510 140 L 510 20 L 530 20 L 530 140 
             L 670 140 L 670 600 
             L 530 600 L 530 720 L 390 720 L 390 600 
             L 250 600 L 250 720 L 110 720 L 110 600 
             L 0 600 L 0 160 L 30 140 Z" ${fillWithOpacity} ${redCut}/>

    <!-- Linhas de Vinco Horizontais (Fechamento Superior e Fundo) -->
    <line x1="30" y1="140" x2="670" y2="140" ${scoreDash}/>
    <line x1="30" y1="260" x2="670" y2="260" ${scoreDash}/>
    <line x1="30" y1="600" x2="670" y2="600" ${scoreDash}/>

    <!-- Linhas de Vinco Verticais entre as 4 faces -->
    <line x1="30" y1="140" x2="30" y2="600" ${scoreDash}/>
    <line x1="190" y1="140" x2="190" y2="600" ${scoreDash}/>
    <line x1="350" y1="140" x2="350" y2="600" ${scoreDash}/>
    <line x1="510" y1="140" x2="510" y2="600" ${scoreDash}/>

    <!-- Vincos Diagonais para Fechamento Piramidal Superior (Laterais da Caixa Milk) -->
    <!-- Lateral 1 (Face 2) -->
    <line x1="190" y1="260" x2="270" y2="140" ${scoreDash}/>
    <line x1="350" y1="260" x2="270" y2="140" ${scoreDash}/>
    <line x1="270" y1="140" x2="270" y2="20" ${scoreDash}/>

    <!-- Lateral 2 (Face 4) -->
    <line x1="510" y1="260" x2="590" y2="140" ${scoreDash}/>
    <line x1="670" y1="260" x2="590" y2="140" ${scoreDash}/>
    <line x1="590" y1="140" x2="590" y2="20" ${scoreDash}/>

    <!-- Furos para Passador de Laço de Cetim (Frente e Verso) -->
    <circle cx="110" cy="80" r="5" fill="#FFFFFF" ${redCut}/>
    <circle cx="430" cy="80" r="5" fill="#FFFFFF" ${redCut}/>

    <!-- Rótulos Técnicos das Faces -->
    <text x="15" y="380" font-family="sans-serif" font-size="9" fill="#64748B" transform="rotate(-90 15,380)" text-anchor="middle">Aba Colagem 12mm</text>
    <text x="110" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155" text-anchor="middle">FRENTE</text>
    <text x="270" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B" text-anchor="middle">LATERAL DIR.</text>
    <text x="430" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#334155" text-anchor="middle">VERSO</text>
    <text x="590" y="420" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B" text-anchor="middle">LATERAL ESQ.</text>
    
    <text x="350" y="670" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">Abas de Encaixe e Fundo Automático</text>
  </g>
</svg>`;
        } else if (index === 1) {
          sheetTitle = `Folha 2: Molduras e Visores Frontais da Caixa (${layer.paperType})`;
          piecesCount = 4;
          estimatedCutSeconds = 45;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- MOLDURAS E ESCALOPES PARA AS FACES DA CAIXA MILK -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 2: MOLDURAS & CAMADAS 3D — ${layer.paperType}</text>

  <!-- Moldura Escalope Frontal (140x190mm) -->
  <g transform="translate(100, 120)">
    <rect x="20" y="20" width="240" height="300" rx="20" ${fillWithOpacity} ${redCut}/>
    <rect x="40" y="40" width="200" height="260" rx="14" ${redCut}/>
    <text x="140" y="170" font-family="sans-serif" font-size="13" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">MOLDURA FRONTAL 3D</text>
    <text x="140" y="195" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Fixar com fita banana 2mm</text>
  </g>

  <!-- Moldura Lateral 1 -->
  <g transform="translate(420, 120)">
    <rect x="20" y="20" width="220" height="280" rx="15" ${fillWithOpacity} ${redCut}/>
    <text x="130" y="160" font-family="sans-serif" font-size="11" font-weight="bold" fill="#64748B" text-anchor="middle">Aplique Lateral 1</text>
  </g>

  <!-- Laço 3D Estrutural de Papel para o Topo -->
  <g transform="translate(100, 480)">
    <path d="M 60 50 C 20 20 20 80 60 50 C 100 20 100 80 60 50 Z" ${fillWithOpacity} ${redCut}/>
    <rect x="140" y="30" width="160" height="40" rx="10" ${fillWithOpacity} ${redCut}/>
    <line x1="220" y1="30" x2="220" y2="70" ${scoreDash}/>
    <text x="220" y="100" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Alças do Laço 3D de Papel</text>
  </g>
</svg>`;
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // CASO 2: LETRA 3D PERSONALIZADA (FACE DA LETRA + LATERAIS PLANIFICADAS COM ABAS)
      // ─────────────────────────────────────────────────────────────────────────────
      else if (is3dLetter) {
        if (index === 0) {
          sheetTitle = `Folha 1: Faces Frontal e Traseira da Letra "${firstLetter}" (${layer.paperType})`;
          piecesCount = 2;
          estimatedCutSeconds = 45;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- FACES DA LETRA 3D -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 1: FACES DA LETRA 3D "${firstLetter}" — ${layer.paperType}</text>

  <!-- Face Frontal da Letra Personalizada -->
  <g transform="translate(100, 130)">
    <!-- Letra Frontal em Linha de Corte Vermelha -->
    <text x="140" y="260" font-family="Impact, Arial Black, sans-serif" font-size="280" font-weight="bold" ${fillWithOpacity} stroke="#FF0000" stroke-width="2" text-anchor="middle">
      ${firstLetter}
    </text>
    <text x="140" y="300" font-family="sans-serif" font-size="12" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">FACE FRONTAL</text>
  </g>

  <!-- Face Traseira da Letra -->
  <g transform="translate(420, 130)">
    <text x="140" y="260" font-family="Impact, Arial Black, sans-serif" font-size="280" font-weight="bold" fill="#F8FAFC" stroke="#FF0000" stroke-width="2" text-anchor="middle">
      ${firstLetter}
    </text>
    <text x="140" y="300" font-family="sans-serif" font-size="12" font-weight="bold" fill="#64748B" text-anchor="middle">FACE TRASEIRA</text>
  </g>
</svg>`;
        } else if (index === 1) {
          sheetTitle = `Folha 2: Laterais com Abas Serrilhadas da Letra (${layer.paperType})`;
          piecesCount = 3;
          estimatedCutSeconds = 60;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- LATERAIS E ABAS DE COLAGEM DA LETRA 3D -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 2: LATERAIS COM ABAS DENTADAS (PROFUNDIDADE 3.5cm)</text>

  <!-- Tira Lateral 1 com Dentes de Colagem -->
  <g transform="translate(80, 130)">
    <!-- Borda Serrilhada Superior (Abas) -->
    <path d="M 0 30 L 10 10 L 20 30 L 30 10 L 40 30 L 50 10 L 60 30 L 70 10 L 80 30 L 90 10 L 100 30 L 110 10 L 120 30 L 130 10 L 140 30 L 150 10 L 160 30 L 170 10 L 180 30 L 190 10 L 200 30 L 210 10 L 220 30 L 230 10 L 240 30 L 250 10 L 260 30 L 270 10 L 280 30 L 290 10 L 300 30 L 310 10 L 320 30 L 330 10 L 340 30 L 350 10 L 360 30 L 370 10 L 380 30 L 390 10 L 400 30 L 410 10 L 420 30 L 430 10 L 440 30 L 450 10 L 460 30 L 470 10 L 480 30 L 490 10 L 500 30 L 510 10 L 520 30 L 530 10 L 540 30 L 550 10 L 560 30 L 570 10 L 580 30 L 590 10 L 600 30
             L 600 130
             L 590 150 L 580 130 L 570 150 L 560 130 L 550 150 L 540 130 L 530 150 L 520 130 L 510 150 L 500 130 L 490 150 L 480 130 L 470 150 L 460 130 L 450 150 L 440 130 L 430 150 L 420 130 L 410 150 L 400 130 L 390 150 L 380 130 L 370 150 L 360 130 L 350 150 L 340 130 L 330 150 L 320 130 L 310 150 L 300 130 L 290 150 L 280 130 L 270 150 L 260 130 L 250 150 L 240 130 L 230 150 L 220 130 L 210 150 L 200 130 L 190 150 L 180 130 L 170 150 L 160 130 L 150 150 L 140 130 L 130 150 L 120 130 L 110 150 L 100 130 L 90 150 L 80 130 L 70 150 L 60 130 L 50 150 L 40 130 L 30 150 L 20 130 L 10 150 L 0 130 Z" ${fillWithOpacity} ${redCut}/>
    <!-- Linhas de Dobra Pontilhada das Abas -->
    <line x1="0" y1="30" x2="600" y2="30" ${scoreDash}/>
    <line x1="0" y1="130" x2="600" y2="130" ${scoreDash}/>
    <text x="300" y="85" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">Tira Lateral de Fechamento #1 (3.5cm)</text>
  </g>

  <!-- Tira Lateral 2 -->
  <g transform="translate(80, 340)">
    <path d="M 0 30 L 10 10 L 20 30 L 30 10 L 40 30 L 50 10 L 60 30 L 70 10 L 80 30 L 90 10 L 100 30 L 110 10 L 120 30 L 130 10 L 140 30 L 150 10 L 160 30 L 170 10 L 180 30 L 190 10 L 200 30 L 210 10 L 220 30 L 230 10 L 240 30 L 250 10 L 260 30 L 270 10 L 280 30 L 290 10 L 300 30 L 310 10 L 320 30 L 330 10 L 340 30 L 350 10 L 360 30 L 370 10 L 380 30 L 390 10 L 400 30 L 410 10 L 420 30 L 430 10 L 440 30 L 450 10 L 460 30 L 470 10 L 480 30 L 490 10 L 500 30 L 510 10 L 520 30 L 530 10 L 540 30 L 550 10 L 560 30 L 570 10 L 580 30 L 590 10 L 600 30
             L 600 130
             L 590 150 L 580 130 L 570 150 L 560 130 L 550 150 L 540 130 L 530 150 L 520 130 L 510 150 L 500 130 L 490 150 L 480 130 L 470 150 L 460 130 L 450 150 L 440 130 L 430 150 L 420 130 L 410 150 L 400 130 L 390 150 L 380 130 L 370 150 L 360 130 L 350 150 L 340 130 L 330 150 L 320 130 L 310 150 L 300 130 L 290 150 L 280 130 L 270 150 L 260 130 L 250 150 L 240 130 L 230 150 L 220 130 L 210 150 L 200 130 L 190 150 L 180 130 L 170 150 L 160 130 L 150 150 L 140 130 L 130 150 L 120 130 L 110 150 L 100 130 L 90 150 L 80 130 L 70 150 L 60 130 L 50 150 L 40 130 L 30 150 L 20 130 L 10 150 L 0 130 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="0" y1="30" x2="600" y2="30" ${scoreDash}/>
    <line x1="0" y1="130" x2="600" y2="130" ${scoreDash}/>
    <text x="300" y="85" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">Tira Lateral de Fechamento #2 (3.5cm)</text>
  </g>
</svg>`;
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // CASO 3: TOPO DE BOLO 3D & OUTROS PRODUTOS (COM ELEMENTOS VETORIAIS POR TEMA)
      // ─────────────────────────────────────────────────────────────────────────────
      if (!svgContent) {
        if (index === 0) {
          // Folha 1: Base Estrutural com Silhueta Temática do Produto
          sheetTitle = `Folha 1: Base Estrutural Traseira (${layer.paperType})`;
          piecesCount = 2;
          estimatedCutSeconds = 40;

          let themePath = 'M 50 160 C 20 160 0 130 0 95 C 0 50 40 10 90 10 C 130 10 165 35 180 70 C 200 40 240 20 285 20 C 340 20 385 60 385 115 C 410 115 430 135 430 160 C 430 185 410 205 385 205 C 385 250 345 285 295 285 C 265 285 235 270 215 245 C 195 275 155 295 110 295 C 50 295 10 250 10 195 C 10 180 18 168 50 160 Z';
          let themeLabel = 'Base de Sustentação 3D';

          if (isSpace) {
            themePath = 'M 200 20 L 260 140 L 320 220 L 360 300 L 280 280 L 200 360 L 120 280 L 40 300 L 80 220 L 140 140 Z';
            themeLabel = 'Base Foguete e Galáxia';
          } else if (isSafari) {
            themePath = 'M 60 140 C 20 100 20 40 80 20 C 140 0 220 10 280 40 C 340 10 420 40 400 120 C 420 180 380 260 320 280 C 260 300 180 290 120 270 C 40 260 20 180 60 140 Z';
            themeLabel = 'Base Selva e Folhagens';
          } else if (isDino) {
            themePath = 'M 80 240 L 40 180 L 80 120 L 160 80 L 240 40 L 340 60 L 420 120 L 400 200 L 320 260 L 220 280 L 140 270 Z';
            themeLabel = 'Base Dinossauro e Vulcão';
          }

          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 1: BASE ESTRUTURAL — ${theme.toUpperCase()}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#94A3B8">Silhouette Portrait / Cameo | Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed}</text>

  <!-- Silhueta da Base do Tema -->
  <g transform="translate(140, 140)">
    <path d="${themePath}" ${fillWithOpacity} ${redCut}/>
    <text x="210" y="160" font-family="sans-serif" font-size="14" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">${themeLabel}</text>
    <text x="210" y="185" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">Offset 3.0mm (Fundo Sólido)</text>

    <!-- Guias de Encaixe de Palito Acrílico -->
    <rect x="150" y="290" width="12" height="70" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <rect x="270" y="290" width="12" height="70" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <text x="210" y="345" font-family="sans-serif" font-size="9" fill="#3B82F6" text-anchor="middle">Encaixe Palitos Acrílicos</text>
  </g>
</svg>`;
        } else if (index === 1) {
          // Folha 2: Elementos Temáticos Específicos do Tema Escolhido
          sheetTitle = `Folha 2: Elementos Temáticos & Molduras (${layer.paperType})`;
          piecesCount = 4;
          estimatedCutSeconds = 50;

          if (isSpace) {
            // ELEMENTOS DO ESPAÇO: FOGUETE EM CAMADAS + PLANETA COM ANEL
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA ESPAÇO: FOGUETE 3D & PLANETAS — ${layer.paperType}</text>

  <!-- Foguete Desmontado em Peças -->
  <g transform="translate(100, 130)">
    <!-- Corpo Principal Foguete -->
    <path d="M 90 20 C 130 80 140 180 140 240 L 40 240 C 40 180 50 80 90 20 Z" ${fillWithOpacity} ${redCut}/>
    <!-- Bico da Ogiva -->
    <path d="M 90 20 C 110 50 115 80 115 90 L 65 90 C 65 80 70 50 90 20 Z" fill="#EF4444" ${redCut}/>
    <!-- Janela Dupla -->
    <circle cx="90" cy="130" r="24" fill="#FFFFFF" ${redCut}/>
    <circle cx="90" cy="130" r="16" fill="#38BDF8" ${redCut}/>
    <!-- Chamas Turbina 3D -->
    <path d="M 60 240 L 90 320 L 120 240 L 105 260 L 90 240 L 75 260 Z" fill="#F59E0B" ${redCut}/>
    <text x="90" y="345" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0284C7" text-anchor="middle">Foguete 3D Desmontado</text>
  </g>

  <!-- Planeta Saturno com Anel Orbital -->
  <g transform="translate(420, 130)">
    <circle cx="120" cy="120" r="70" ${fillWithOpacity} ${redCut}/>
    <ellipse cx="120" cy="120" rx="110" ry="30" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <text x="120" y="215" font-family="sans-serif" font-size="11" font-weight="bold" fill="#D97706" text-anchor="middle">Planeta Saturno com Anel</text>
  </g>
</svg>`;
          } else if (isSafari) {
            // ELEMENTOS DO SAFARI: LEÃOZINHO 3D + COSTELA DE ADÃO
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#854D0E">FOLHA SAFARI: LEÃOZINHO 3D & COSTELA DE ADÃO — ${layer.paperType}</text>

  <!-- Juba e Rosto do Leãozinho -->
  <g transform="translate(100, 130)">
    <!-- Juba Recortada -->
    <path d="M 120 20 L 145 50 L 180 35 L 185 70 L 220 75 L 205 110 L 230 135 L 205 160 L 220 195 L 185 200 L 180 235 L 145 220 L 120 250 L 95 220 L 60 235 L 55 200 L 20 195 L 35 160 L 10 135 L 35 110 L 20 75 L 55 70 L 60 35 L 95 50 Z" ${fillWithOpacity} ${redCut}/>
    <!-- Rosto do Leão -->
    <circle cx="120" cy="135" r="55" fill="#FEF08A" ${redCut}/>
    <ellipse cx="120" cy="150" rx="25" ry="18" fill="#FFFFFF" ${redCut}/>
    <polygon points="113,142 127,142 120,150" fill="#78350F"/>
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
            // ELEMENTOS DO DINOSSAURO: T-REX 3D + PEGADAS
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#15803D">FOLHA DINO: T-REX 3D & PEGADAS — ${layer.paperType}</text>

  <!-- Corpo Dinossauro Cute -->
  <g transform="translate(100, 130)">
    <path d="M 160 50 C 220 50 240 100 210 140 L 180 140 C 190 190 170 250 110 260 L 90 300 L 60 300 L 75 250 C 30 250 10 200 10 160 C 50 180 90 150 90 110 L 90 90 Z" ${fillWithOpacity} ${redCut}/>
    <!-- Espinhos Dorsais -->
    <polygon points="120,40 135,15 150,40" fill="#F59E0B" ${redCut}/>
    <polygon points="90,65 105,40 120,65" fill="#F59E0B" ${redCut}/>
    <polygon points="65,95 80,70 95,95" fill="#F59E0B" ${redCut}/>
    <text x="120" y="335" font-family="sans-serif" font-size="11" font-weight="bold" fill="#15803D" text-anchor="middle">Corpo do Dino Cute 3D</text>
  </g>

  <!-- Pegadas e Ovos Dino -->
  <g transform="translate(420, 130)">
    <!-- Pegada 3 Dedos -->
    <path d="M 80 40 L 100 10 L 120 40 L 140 20 L 145 60 L 170 50 L 155 85 C 150 115 110 120 85 100 C 65 80 60 55 80 40 Z" ${fillWithOpacity} ${redCut}/>
    <text x="110" y="145" font-family="sans-serif" font-size="10" font-weight="bold" fill="#15803D" text-anchor="middle">Pegada Dino</text>
  </g>
</svg>`;
          } else {
            // JARDIM / BORBOLETAS / FLORAL / PADRÃO
            svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA JARDIM: BORBOLETAS DUPLAS & FLORES 3D — ${layer.paperType}</text>

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
        } else if (isShaker && layer.paperType.toLowerCase().includes('acetato')) {
          // Folha Shaker: Visor de Acetato + Anel de Vedação em EVA
          sheetTitle = `Folha 3: Visor de Acetato & Espuma de Contenção Shaker`;
          piecesCount = 2;
          estimatedCutSeconds = 60;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA SHAKER: VISOR ACETATO & ANEL EVA (20 micras)</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Lâmina de Corte Profundo | Lâmina: 10 | Força: 33 | Vel: 2 | 2 Passadas</text>

  <!-- Visor de Acetato Cristal -->
  <g transform="translate(140, 130)">
    <circle cx="160" cy="160" r="140" fill="#F0F9FF" fill-opacity="0.5" stroke="#0284C7" stroke-width="2"/>
    <text x="160" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7" text-anchor="middle">VISOR EM ACETATO</text>
    <text x="160" y="175" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">20 micras transparente</text>
  </g>

  <!-- Anel de Vedação em EVA 2mm -->
  <g transform="translate(140, 480)">
    <circle cx="160" cy="160" r="140" fill="#FEF3C7" fill-opacity="0.4" ${redCut}/>
    <circle cx="160" cy="160" r="120" ${redCut}/>
    <text x="160" y="155" font-family="sans-serif" font-size="13" font-weight="bold" fill="#D97706" text-anchor="middle">ANEL DE CONTENÇÃO (EVA 2mm)</text>
  </g>
</svg>`;
        } else if (layer.paperType.toLowerCase().includes('fotográfico') || layer.name.toLowerCase().includes('ilustra')) {
          // Folha Print & Cut com Marcas de Registro Reais da Silhouette
          sheetTitle = `Folha ${sheetNum}: Print & Cut Ilustrações (${theme})`;
          piecesCount = 5;
          estimatedCutSeconds = 60;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- MARCAS DE REGISTRO SILHOUETTE (PORTRAIT / CAMEO) -->
  <rect x="50" y="50" width="20" height="20" fill="#000000"/>
  <path d="M 724 50 L 744 50 L 744 70" fill="none" stroke="#000000" stroke-width="4"/>
  <path d="M 50 1053 L 50 1073 L 70 1073" fill="none" stroke="#000000" stroke-width="4"/>

  <text x="90" y="66" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B">PRINT & CUT: ELEMENTOS DO TEMA "${theme.toUpperCase()}"</text>
  <text x="90" y="84" font-family="sans-serif" font-size="10" fill="#94A3B8">Papel Fotográfico Matte 180g | Sangria 1.5mm | Ativar Leitura Óptica</text>

  <!-- Ilustração 1 Principal do Tema -->
  <g transform="translate(120, 140)">
    <rect x="20" y="20" width="240" height="240" rx="30" fill="${layer.colorHex}" fill-opacity="0.3"/>
    <rect x="15" y="15" width="250" height="250" rx="35" ${redCut}/>
    <text x="140" y="130" font-family="sans-serif" font-size="20" font-weight="bold" fill="#1E293B" text-anchor="middle">${theme}</text>
    <text x="140" y="160" font-family="sans-serif" font-size="12" fill="#64748B" text-anchor="middle">Aplique Principal 3D</text>
  </g>

  <!-- Tags e Apliques Menores -->
  <g transform="translate(420, 140)">
    <circle cx="100" cy="100" r="75" fill="${layer.colorHex}" fill-opacity="0.25"/>
    <circle cx="100" cy="100" r="70" ${redCut}/>
    <text x="100" y="105" font-family="sans-serif" font-size="12" font-weight="bold" fill="#334155" text-anchor="middle">Tag Personalizada</text>
  </g>
</svg>`;
        } else {
          // Folha de Destaque: Nome e Idade em Lamicote Ouro 250g
          sheetTitle = `Folha ${sheetNum}: Destaque Nome "${nameOnly}" & Idade (${layer.paperType})`;
          piecesCount = 3;
          estimatedCutSeconds = 45;
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#B45309">FOLHA NOBRE: NOME "${nameOnly.toUpperCase()}" & IDADE (${layer.paperType})</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#92400E">Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed} (2 passadas)</text>

  <!-- Nome Cursivo Soldado com Deslocamento de 2.0mm -->
  <g transform="translate(90, 140)">
    <!-- Contorno de Deslocamento / Solda de Letras -->
    <rect x="20" y="20" width="560" height="180" rx="25" fill="#FEF3C7" fill-opacity="0.7" ${redCut}/>
    
    <text x="300" y="115" font-family="Brush Script MT, cursive, Georgia, serif" font-size="56" font-weight="bold" fill="#D97706" text-anchor="middle">
      ${nameOnly}
    </text>
    <text x="300" y="165" font-family="sans-serif" font-size="18" font-weight="bold" fill="#B45309" text-anchor="middle">
      ${cleanName.includes('-') ? cleanName.split('-')[1].trim() : `${ageOnly} anos`}
    </text>
  </g>

  <!-- Tag da Idade e Brasão Temático -->
  <g transform="translate(90, 380)">
    <!-- Tag da Idade em Círculo com Escalope -->
    <g transform="translate(60, 20)">
      <circle cx="60" cy="60" r="55" fill="#FEF3C7" ${redCut}/>
      <text x="60" y="75" font-family="Impact, Arial Black, sans-serif" font-size="44" font-weight="bold" fill="#D97706" text-anchor="middle">
        ${ageOnly}
      </text>
      <text x="60" y="135" font-family="sans-serif" font-size="10" font-weight="bold" fill="#92400E" text-anchor="middle">Tag Idade 3D</text>
    </g>

    <!-- Estrelas / Ramos de Acabamento -->
    <g transform="translate(240, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" fill="#FDE68A" ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Estrela Nobre 1</text>
    </g>

    <g transform="translate(400, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" fill="#FDE68A" ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Estrela Nobre 2</text>
    </g>
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

