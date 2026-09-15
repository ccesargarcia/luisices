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

Seu objetivo é projetar produtos de papelaria (Topos de Bolo 3D, Topos Shaker, Caixas Milk, Caixas Pirâmide, Letras 3D, etc.) com FOCO ABSOLUTO EM VIABILIDADE FÍSICA E CORTE REAL EM PLOTTER (Silhouette Portrait 3, Cameo 4, Cricut) E GERAR PROMPTS FOTOGRÁFICOS HIPER-REALISTAS PARA IAs DE IMAGEM.

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
   * Exporta os acertos/projetos aprovados da artesã no formato JSONL para Fine-Tuning no Google AI Studio
   */
  exportTrainingDatasetAsJsonl(blueprints: AiProductBlueprint[]): string {
    const lines = blueprints.map((bp) => {
      const inputPrompt = `Projete um produto de papelaria personalizada: Tipo: ${bp.category}, Tema: ${bp.theme}, Personalização: ${bp.targetAgeAndName}`;
      const outputJson = JSON.stringify(bp);
      return JSON.stringify({
        messages: [
          { role: 'user', content: inputPrompt },
          { role: 'model', content: outputJson },
        ],
      });
    });
    return lines.join('\n');
  }

  /**
   * Gera o projeto físico completo de um produto de papelaria personalizada
   */
  async generateProductBlueprint(params: GenerateProductParams): Promise<AiProductBlueprint> {
    const apiKey = this.getApiKey(params.geminiApiKey);
    const tunedModel = this.getTunedModelId(params.tunedModelId);
    const conversationId = `prod_gen_${Date.now()}`;

    // Montar Few-Shot Context se houver histórico de acertos do ateliê
    let fewShotContext = '';
    const trainingList = params.trainingExamples && params.trainingExamples.length > 0
      ? params.trainingExamples
      : this.getSavedAtelierSuccesses();

    if (trainingList.length > 0) {
      fewShotContext = `\n\nMEMÓRIA DE ACERTOS DO ATELIÊ (EXEMPLOS REAIS APROVADOS PELA ARTESÃ):\nUse os seguintes exemplos aprovados anteriormente como referência de alta qualidade de camadas, preços e prompts:\n`;
      trainingList.slice(0, 3).forEach((ex, i) => {
        fewShotContext += `--- Exemplo Aprovado ${i + 1} (${ex.productTitle}) ---\n`;
        fewShotContext += `Tema: ${ex.theme} | Personalização: ${ex.targetAgeAndName} | Preço: R$ ${ex.recommendedPrice}\n`;
        fewShotContext += `Camadas: ${ex.layers.map(l => `${l.name} (${l.paperType})`).join(' -> ')}\n`;
        fewShotContext += `Prompt Ideogram: ${ex.realisticPrompts?.ideogramPrompt || ''}\n`;
        fewShotContext += `Prompt Midjourney: ${ex.realisticPrompts?.midjourneyPrompt || ''}\n\n`;
      });
    }

    return traceAgentRun('PaperCraftProductDesigner', conversationId, async () => {
      if (!apiKey) {
        console.warn('[AiProductService] Chave Gemini não configurada. Utilizando gerador inteligente local.');
        return this.generateSmartFallback(params);
      }

      const promptUser = `
Projete um produto de papelaria personalizada e gere prompts ultra-realistas para IAs de imagem:
- Tipo de Produto: ${params.productType}
- Tema da Festa: ${params.theme}
- Nome e Idade: ${params.targetNameAndAge || 'Personalizado'}
- Paleta de Cores: ${params.colorPalette}
- Complexidade: ${params.complexity}
- Máquina de Corte / Plotter: ${params.plotter}
${params.customInstructions ? `- Instruções Adicionais da Artesã: ${params.customInstructions}` : ''}
${fewShotContext}

Retorne estritamente um JSON com este schema:
{
  "productTitle": "Título comercial atraente para o catálogo",
  "category": "Topos de Bolo" | "Lembrancinhas" | "Papelaria Criativa" | "Kits Festa",
  "description": "Descrição comercial encantadora e detalhada destacando camadas 3D e acabamentos",
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

        const responseText = await traceAIChat(modelName, conversationId, async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: promptUser }] }],
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

        return parsed;
      } catch (err) {
        console.error('[AiProductService] Falha na chamada da API Gemini, usando gerador físico inteligente:', err);
        return this.generateSmartFallback(params);
      }
    });
  }

  /**
   * Obtém os acertos salvos pela artesã no armazenamento local
   */
  getSavedAtelierSuccesses(): AiProductBlueprint[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('luisices_atelier_training_examples');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  /**
   * Salva um projeto como acerto de referência para treinar a IA
   */
  saveAtelierSuccess(blueprint: AiProductBlueprint): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = this.getSavedAtelierSuccesses();
      const filtered = existing.filter((b) => b.productTitle !== blueprint.productTitle);
      const updated = [blueprint, ...filtered].slice(0, 10); // Manter até os 10 melhores acertos
      localStorage.setItem('luisices_atelier_training_examples', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar acerto:', e);
    }
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
    };
  }
}

export const aiProductService = new AiProductService();
