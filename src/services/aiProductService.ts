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
        const modelName = tunedModel || 'gemini-2.5-flash';
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

        const responseText = await traceAIChat(modelName, conversationId, async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
              },
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `Erro HTTP ${response.status} na API Gemini`);
          }

          const data = await response.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
   * Gera pranchas de corte em vetor SVG realistas para Silhouette/Cricut e guia de montagem
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
    const isBox = productType.toLowerCase().includes('caixa');
    const isCakeTopper = productType.toLowerCase().includes('topo');
    const cleanName = targetNameAndAge || 'Helena 3 anos';

    // Gerar folhas de corte baseadas nas camadas do projeto
    const cutSheets: CutSheet[] = layers.map((layer, index) => {
      const sheetNum = index + 1;
      let sheetTitle = `Folha ${sheetNum}: ${layer.name}`;
      let piecesCount = 2 + (index % 3);
      let estimatedCutSeconds = 35 + index * 15;
      let svgContent = '';

      // Configuração padrão de corte Silhouette: linhas vermelhas (#FF0000) 1.5px
      const redCut = 'stroke="#FF0000" stroke-width="1.5" fill="none"';
      const fillWithOpacity = `fill="${layer.colorHex}" fill-opacity="0.18"`;
      const scoreDash = 'stroke="#0000FF" stroke-width="1.2" stroke-dasharray="6,4" fill="none"';

      if (index === 0) {
        // Folha 1: Base Estrutural / Fundo de Sustentação
        sheetTitle = `Folha 1: Base Estrutural Traseira (${layer.paperType})`;
        piecesCount = 2;
        estimatedCutSeconds = 40;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- Folha A4 (210x297mm @ 96DPI) - Base Estrutural -->
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Guia de Margens Folha A4 -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 1: BASE ESTRUTURAL — ${layer.paperType}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#94A3B8">Silhouette Portrait / Cameo | Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed}</text>

  <!-- Peça Principal: Silhueta de Fundo / Base de Sustentação com Deslocamento -->
  <g transform="translate(120, 140)">
    <path d="M 50 160 C 20 160 0 130 0 95 C 0 50 40 10 90 10 C 130 10 165 35 180 70 C 200 40 240 20 285 20 C 340 20 385 60 385 115 C 410 115 430 135 430 160 C 430 185 410 205 385 205 C 385 250 345 285 295 285 C 265 285 235 270 215 245 C 195 275 155 295 110 295 C 50 295 10 250 10 195 C 10 180 18 168 50 160 Z" 
          ${fillWithOpacity} ${redCut} filter="url(#shadow)"/>
    <text x="215" y="150" font-family="sans-serif" font-size="14" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">BASE ESTRUTURAL</text>
    <text x="215" y="172" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">Offset 3.0mm (Sustentação)</text>
    
    <!-- Guias de Encaixe de Palito Acrílico Traseiro -->
    <rect x="150" y="270" width="12" height="70" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <rect x="270" y="270" width="12" height="70" fill="none" stroke="#3B82F6" stroke-width="1.2" stroke-dasharray="3,3"/>
    <text x="215" y="325" font-family="sans-serif" font-size="9" fill="#3B82F6" text-anchor="middle">Encaixe Palitos Acrílicos</text>
  </g>

  <!-- Suportes e Travas Traseiras 3D -->
  <g transform="translate(120, 560)">
    <rect x="40" y="20" width="140" height="40" rx="6" ${fillWithOpacity} ${redCut}/>
    <text x="110" y="45" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">Trava Reforço 1</text>

    <rect x="240" y="20" width="140" height="40" rx="6" ${fillWithOpacity} ${redCut}/>
    <text x="310" y="45" font-family="sans-serif" font-size="10" font-weight="bold" fill="#64748B" text-anchor="middle">Trava Reforço 2</text>
  </g>
</svg>`;
      } else if (index === 1) {
        // Folha 2: Molduras Vazadas & Silhuetas Temáticas
        sheetTitle = `Folha 2: Moldura e Silhueta Vazada (${layer.paperType})`;
        piecesCount = 4;
        estimatedCutSeconds = 55;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- Folha A4 - Moldura e Elementos Vazados -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#64748B">FOLHA 2: MOLDURA E ELEMENTOS VAZADOS — ${layer.paperType}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#94A3B8">Silhouette Portrait / Cameo | Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed}</text>

  <!-- Moldura Central Vazada (Escalope / Oval Temático) -->
  <g transform="translate(140, 130)">
    <!-- Contorno Externo -->
    <path d="M 70 140 C 40 140 20 115 20 85 C 20 45 55 15 95 15 C 130 15 160 35 175 65 C 190 40 225 25 265 25 C 310 25 350 60 350 105 C 370 105 385 120 385 140 C 385 160 370 175 350 175 C 350 215 315 245 270 245 C 245 245 220 230 205 210 C 190 235 155 255 115 255 C 65 255 30 215 30 170 C 30 155 40 145 70 140 Z" 
          ${fillWithOpacity} ${redCut}/>
    
    <!-- Vazado Interno (Janela de Visualização) -->
    <ellipse cx="205" cy="135" rx="130" ry="85" ${redCut}/>
    <text x="205" y="140" font-family="sans-serif" font-size="12" font-weight="bold" fill="${layer.colorHex}" text-anchor="middle">MOLDURA VAZADA 3D</text>
  </g>

  <!-- Folhagens / Borboletas / Estrelas 3D de Composição -->
  <g transform="translate(100, 470)">
    <!-- Flor/Folha 1 -->
    <path d="M 60 10 C 80 40 90 70 60 100 C 30 70 40 40 60 10 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="60" y1="20" x2="60" y2="90" ${scoreDash}/>

    <!-- Flor/Folha 2 -->
    <path d="M 160 10 C 180 40 190 70 160 100 C 130 70 140 40 160 10 Z" ${fillWithOpacity} ${redCut}/>
    <line x1="160" y1="20" x2="160" y2="90" ${scoreDash}/>

    <!-- Borboleta Vazada Dupla -->
    <g transform="translate(260, 10)">
      <path d="M 70 45 C 50 15 20 20 20 45 C 20 65 50 70 68 55 C 50 75 40 100 60 100 C 75 100 80 80 72 58 C 74 58 76 58 78 58 C 70 80 75 100 90 100 C 110 100 100 75 82 55 C 100 70 130 65 130 45 C 130 20 100 15 80 45 Z" ${fillWithOpacity} ${redCut}/>
      <line x1="75" y1="25" x2="75" y2="85" ${scoreDash}/>
      <text x="75" y="120" font-family="sans-serif" font-size="9" fill="#64748B" text-anchor="middle">Borboleta Asa Dupla</text>
    </g>
  </g>
</svg>`;
      } else if (isShaker && layer.paperType.toLowerCase().includes('acetato')) {
        // Folha 3: Contenção Shaker (Acetato Cristal + Anel de EVA)
        sheetTitle = `Folha 3: Visor de Acetato & Espuma de Contenção Shaker`;
        piecesCount = 3;
        estimatedCutSeconds = 60;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- Folha A4 - Visor Shaker e Anel de Vedação -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7">FOLHA SHAKER: VISOR ACETATO & VEDAÇÃO EVA</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Lâmina de Corte Profundo | Lâmina: 10 | Força: 33 | Vel: 2 | 2 Passadas</text>

  <!-- Visor Frontal em Acetato Cristal -->
  <g transform="translate(140, 130)">
    <circle cx="160" cy="160" r="140" fill="#F0F9FF" fill-opacity="0.5" stroke="#0284C7" stroke-width="2"/>
    <text x="160" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0284C7" text-anchor="middle">VISOR EM ACETATO</text>
    <text x="160" y="175" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">20 micras transparente</text>
  </g>

  <!-- Anel de Vedação em EVA 2mm (Para reter lantejoulas/pérolas) -->
  <g transform="translate(140, 480)">
    <circle cx="160" cy="160" r="140" fill="#FEF3C7" fill-opacity="0.4" ${redCut}/>
    <circle cx="160" cy="160" r="120" ${redCut}/>
    <text x="160" y="155" font-family="sans-serif" font-size="13" font-weight="bold" fill="#D97706" text-anchor="middle">ANEL DE CONTENÇÃO (EVA 2mm)</text>
    <text x="160" y="175" font-family="sans-serif" font-size="10" fill="#64748B" text-anchor="middle">Espessura do anel: 20mm</text>
  </g>
</svg>`;
      } else if (layer.paperType.toLowerCase().includes('fotográfico') || layer.name.toLowerCase().includes('ilustra')) {
        // Folha Print & Cut com Marcas de Registro Reais da Silhouette
        sheetTitle = `Folha ${sheetNum}: Print & Cut Ilustrações (${layer.paperType})`;
        piecesCount = 6;
        estimatedCutSeconds = 65;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- Folha A4 Print & Cut com Marcas de Registro Silhouette -->
  <!-- Marca de Registro Superior Esquerda (Quadrado Preto Sólido) -->
  <rect x="50" y="50" width="20" height="20" fill="#000000"/>
  <!-- Marca de Registro Superior Direita (Canto em L) -->
  <path d="M 724 50 L 744 50 L 744 70" fill="none" stroke="#000000" stroke-width="4"/>
  <!-- Marca de Registro Inferior Esquerda (Canto em L) -->
  <path d="M 50 1053 L 50 1073 L 70 1073" fill="none" stroke="#000000" stroke-width="4"/>

  <!-- Título e Instruções -->
  <text x="90" y="66" font-family="sans-serif" font-size="13" font-weight="bold" fill="#64748B">PRINT & CUT: ELEMENTOS DO TEMA "${theme.toUpperCase()}"</text>
  <text x="90" y="84" font-family="sans-serif" font-size="10" fill="#94A3B8">Imprimir em Papel Fotográfico Matte 180g | Ativar Leitura Óptica no Silhouette Studio</text>

  <!-- Personagem/Elemento Temático Central 1 -->
  <g transform="translate(120, 140)">
    <!-- Sangria Impressa Colorida -->
    <rect x="20" y="20" width="220" height="240" rx="30" fill="${layer.colorHex}" fill-opacity="0.3"/>
    <!-- Ilustração Conceitual Vetorial do Tema -->
    <circle cx="130" cy="110" r="60" fill="${layer.colorHex}" fill-opacity="0.8"/>
    <polygon points="130,40 150,90 200,90 160,125 175,175 130,145 85,175 100,125 60,90 110,90" fill="#FBBF24"/>
    <text x="130" y="210" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1E293B" text-anchor="middle">${theme}</text>
    <!-- Linha Vermelha de Corte da Silhouette ao redor da ilustração -->
    <rect x="15" y="15" width="230" height="250" rx="35" ${redCut}/>
  </g>

  <!-- Apliques Secundários 3D (Estrelas, Flores e Brasões) -->
  <g transform="translate(420, 140)">
    <!-- Aplique 2 -->
    <g transform="translate(0, 0)">
      <circle cx="90" cy="90" r="70" fill="${layer.colorHex}" fill-opacity="0.25"/>
      <circle cx="90" cy="90" r="65" ${redCut}/>
      <text x="90" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">Aplique 3D #1</text>
    </g>

    <!-- Aplique 3 -->
    <g transform="translate(0, 170)">
      <circle cx="90" cy="70" r="60" fill="${layer.colorHex}" fill-opacity="0.25"/>
      <circle cx="90" cy="70" r="55" ${redCut}/>
      <text x="90" y="75" font-family="sans-serif" font-size="11" font-weight="bold" fill="#334155" text-anchor="middle">Aplique 3D #2</text>
    </g>
  </g>

  <!-- Elementos Complementares Inferiores -->
  <g transform="translate(120, 460)">
    <rect x="20" y="20" width="500" height="180" rx="20" fill="${layer.colorHex}" fill-opacity="0.15"/>
    <rect x="15" y="15" width="510" height="190" rx="25" ${redCut}/>
    <text x="270" y="100" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155" text-anchor="middle">Faixa Temática / Tag de Bolo</text>
    <text x="270" y="125" font-family="sans-serif" font-size="11" fill="#64748B" text-anchor="middle">Com marcas de sangria de 1.5mm para corte perfeito</text>
  </g>
</svg>`;
      } else {
        // Folha Nobre: Destaque Nome em Lamicote Dourado / Offset
        sheetTitle = `Folha ${sheetNum}: Destaque Nome e Idade (${layer.paperType})`;
        piecesCount = 3;
        estimatedCutSeconds = 45;
        svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- Folha A4 - Lamicote Dourado / Nome em Camadas -->
  <rect x="30" y="30" width="734" height="1063" fill="none" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#B45309">FOLHA LAMICOTE NOBRE: NOME & IDADE — ${layer.paperType}</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#92400E">Lâmina: ${layer.silhouetteSettings.blade} | Força: ${layer.silhouetteSettings.force} | Vel: ${layer.silhouetteSettings.speed} (${layer.silhouetteSettings.passes} passadas com Lamicote)</text>

  <!-- Camada de Letras Soldadas com Efeito Espelhado Dourado -->
  <g transform="translate(90, 140)">
    <!-- Sombra/Contorno de Solda -->
    <rect x="20" y="20" width="560" height="180" rx="25" fill="#FEF3C7" fill-opacity="0.6" ${redCut}/>
    
    <!-- Texto do Nome Soldado em Curva/Vetor -->
    <text x="300" y="115" font-family="Brush Script MT, cursive, sans-serif" font-size="52" font-weight="bold" fill="#D97706" text-anchor="middle">
      ${cleanName.split('-')[0].trim()}
    </text>
    <text x="300" y="165" font-family="sans-serif" font-size="20" font-weight="bold" fill="#B45309" text-anchor="middle">
      ${cleanName.split('-')[1]?.trim() || theme}
    </text>
    
    <text x="300" y="195" font-family="sans-serif" font-size="10" fill="#92400E" text-anchor="middle">
      * Letras 100% soldadas com deslocamento (offset) de 2.0mm
    </text>
  </g>

  <!-- Elementos de Acabamento Dourado (Estrelas / Coroas / Arabescos) -->
  <g transform="translate(90, 400)">
    <g transform="translate(40, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" fill="#FDE68A" ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Estrela Dourada 1</text>
    </g>

    <g transform="translate(230, 20)">
      <polygon points="50,10 63,38 93,42 71,63 76,93 50,78 24,93 29,63 7,42 37,38" fill="#FDE68A" ${redCut}/>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Estrela Dourada 2</text>
    </g>

    <g transform="translate(420, 20)">
      <!-- Número da Idade em Destaque -->
      <circle cx="50" cy="50" r="45" fill="#FEF3C7" ${redCut}/>
      <text x="50" y="60" font-family="sans-serif" font-size="32" font-weight="bold" fill="#D97706" text-anchor="middle">
        ${cleanName.match(/\d+/)?.[0] || '★'}
      </text>
      <text x="50" y="115" font-family="sans-serif" font-size="9" fill="#92400E" text-anchor="middle">Tag Idade 3D</text>
    </g>
  </g>
</svg>`;
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

    // Gerar passos físicos estruturados de montagem
    const assemblySteps: AssemblyStep[] = [
      {
        stepNumber: 1,
        actionTitle: 'Fixação da Estrutura e Palitos Traseiros',
        description:
          'Destaque a Folha 1 (Base Estrutural). Cole os palitos acrílicos transparentes no verso com cola quente ou fita dupla face de alta fixação, alinhando pelas guias de encaixe.',
        adhesiveType: 'Cola Quente',
        componentsInvolved: ['Base Estrutural (Folha 1)', 'Palitos Acrílicos Transparentes de 15cm'],
      },
      {
        stepNumber: 2,
        actionTitle: 'Primeira Elevação 3D (Moldura do Tema)',
        description:
          'Aplique pedaços de fita banana de 2mm no verso da Moldura Vazada (Folha 2) e fixe centralizada sobre a Base Estrutural, garantindo que o efeito de profundidade fique uniforme.',
        adhesiveType: 'Fita Banana 2mm',
        componentsInvolved: ['Moldura Vazada (Folha 2)', 'Base Estrutural (Folha 1)'],
      },
      ...(isShaker
        ? [
            {
              stepNumber: 3,
              actionTitle: 'Selagem do Visor Shaker (Acetato + EVA)',
              description:
                'Cole o anel de contenção em EVA 2mm sobre a base. Deposite as lantejoulas e micro-pérolas no centro. Feche hermeticamente com o visor de acetato cristal e cola de silicone líquida para não vazar.',
              adhesiveType: 'Cola de Silicone Líquida' as const,
              componentsInvolved: ['Visor de Acetato Cristal', 'Anel de Contenção EVA 2mm', 'Lantejoulas/Pérolas'],
            },
          ]
        : []),
      {
        stepNumber: isShaker ? 4 : 3,
        actionTitle: 'Sobreposição dos Elementos Print & Cut',
        description:
          'Destaque os elementos temáticos impressos em Matte 180g. Aplique fita banana 3D nos pontos estratégicos e posicione sobre a moldura, criando níveis escalonados de relevo.',
        adhesiveType: 'Fita Banana 2mm',
        componentsInvolved: ['Apliques Print & Cut Temáticos', 'Moldura do Tema'],
      },
      {
        stepNumber: isShaker ? 5 : 4,
        actionTitle: 'Aplicação Nobre do Nome em Lamicote Ouro',
        description:
          `Cole as letras soldadas em Lamicote Dourado 250g sobre o offset com cola de silicone líquida (camada fina para não marcar o papel espelhado). Finalize fixando o nome no topo do conjunto com fita banana.`,
        adhesiveType: 'Cola de Silicone Líquida',
        componentsInvolved: [`Nome "${cleanName}" em Lamicote`, 'Offset de Fundo', 'Apliques de Estrelas Douradas'],
      },
      {
        stepNumber: isShaker ? 6 : 5,
        actionTitle: 'Acabamento Final e Inspeção de Qualidade',
        description:
          'Verifique a firmeza do conjunto contra a luz, remova eventuais fios de cola quente e embale em saco celofane com suporte de papel cartão para envio impecável à cliente.',
        adhesiveType: 'Fita Dupla Face Fina',
        componentsInvolved: ['Produto Completo Montado', 'Embalagem de Proteção'],
      },
    ];

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

