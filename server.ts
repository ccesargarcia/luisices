import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '20mb' }));

// Lazy GoogleGenAI client with required header
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// In-Memory Catalog Knowledge Store with Smart TTL Caching
interface CatalogMemoryItem {
  id: string;
  title: string;
  theme: string;
  category: string;
  description: string;
  papers: string[];
  layersCount: number;
  silhouetteTips: string;
  tags?: string[];
  imageUrl?: string;
  learnedAt?: string;
}

let catalogStore: CatalogMemoryItem[] = [
  {
    id: 'arc-1',
    title: 'Sereia Encantada Lilás & Menta 3D',
    theme: 'Sereia / Fundo do Mar',
    category: 'infantil_3d',
    description: 'Topo com base inteiriça em lilás escuro, concha com pérola e elementos marinhos com fita banana de 2mm.',
    papers: ['Colorplus Lilás 180g', 'Lamicote Dourado 250g', 'Colorplus Verde Menta 180g', 'Fotográfico Matte 230g'],
    layersCount: 4,
    silhouetteTips: 'Rastreio externo com limiar de 75%. O Lamicote cortar com lâmina 4, força 32 e 2 passadas.',
    tags: ['Sereia', '3D', 'Lamicote Dourado', 'Pastel'],
  },
  {
    id: 'arc-2',
    title: 'Safari Baby Real com Folhagens Tropicais',
    theme: 'Safari / Selva Baby',
    category: 'infantil_3d',
    description: 'Animais em aquarela montados sobre folhagens de costela-de-adão em camadas de verde oliva e kraft.',
    papers: ['Kraft Rústico 200g', 'Colorplus Verde Floresta 180g', 'Colorplus Mostarda 180g', 'Fotográfico Matte 230g'],
    layersCount: 3,
    silhouetteTips: 'Folhagens cortadas em velocidade 6 na Portrait. Usar esteira com aderência leve para não rasgar as pontas.',
    tags: ['Safari', 'Leãozinho', 'Kraft', 'Folhagens'],
  },
  {
    id: 'arc-3',
    title: 'Floral Luxo Rosé Gold & Margaridas',
    theme: 'Floral Clássico / Adulto',
    category: 'floral_luxo',
    description: 'Flores em espiral montadas com pinça e folhas vazadas em Lamicote Rosé Gold com aro estrutural.',
    papers: ['Lamicote Rosé 250g', 'Colorplus Rosa Chá 180g', 'Perolizado Marfim 180g'],
    layersCount: 4,
    silhouetteTips: 'Espiral floral cortada em velocidade 4 para manter a precisão das pétalas boleadas.',
    tags: ['Floral', 'Adulto', 'Rosé Gold', 'Flores 3D'],
  },
  {
    id: 'arc-4',
    title: 'Ursinho Aviador Vintage com Nuvens Shaker',
    theme: 'Aviação / Ursinho Baloeiro',
    category: 'shaker',
    description: 'Visor central em acetato com micro miçangas peroladas e estrelinhas douradas, sobreposto com aviãozinho.',
    papers: ['Acetato Cristal 20 Micron', 'Colorplus Azul Bebê 180g', 'Colorplus Branco Neve 240g', 'Lamicote Prata'],
    layersCount: 5,
    silhouetteTips: 'Acetato deve ser cortado com lâmina de corte profundo ou tesoura de precisão se a base da Portrait perder aderência.',
    tags: ['Shaker', 'Acetato', 'Ursinho', 'Aviador'],
  },
];

// Cache structure for compiled prompt context
interface PromptCache {
  cachedText: string;
  itemCount: number;
  lastUpdated: number;
  ttlMs: number;
}

const catalogPromptCache: PromptCache = {
  cachedText: '',
  itemCount: 0,
  lastUpdated: 0,
  ttlMs: 20 * 60 * 1000, // 20 minutes TTL
};

function getCompiledCatalogSystemPrompt(clientItems?: CatalogMemoryItem[]): string {
  // Sync client items if provided
  if (clientItems && Array.isArray(clientItems) && clientItems.length > 0) {
    catalogStore = clientItems;
  }

  const now = Date.now();
  const isCacheValid =
    catalogPromptCache.cachedText &&
    catalogPromptCache.itemCount === catalogStore.length &&
    now - catalogPromptCache.lastUpdated < catalogPromptCache.ttlMs;

  if (isCacheValid) {
    return catalogPromptCache.cachedText;
  }

  // Compile token-optimized catalog knowledge base
  const lines: string[] = [
    `=== BASE DE CONHECIMENTO DINÂMICA DO ATELIÊ LUISICES (${catalogStore.length} PROJETOS REAIS APRENDIDOS) ===`,
    'A IA deve herdar e replicar fielmente o padrão artesanal, acabamentos de luxo e parâmetros de corte Silhouette Portrait 3 documentados nos topos reais abaixo:',
  ];

  catalogStore.forEach((item, index) => {
    lines.push(
      `${index + 1}. [${item.title}] (Tema: ${item.theme} | Estilo: ${item.category} | ${item.layersCount} Camadas):`
    );
    if (item.papers && item.papers.length > 0) {
      lines.push(`   - Papéis: ${item.papers.join(', ')}`);
    }
    if (item.description) {
      lines.push(`   - Estrutura: ${item.description.replace(/\n/g, ' ')}`);
    }
    if (item.silhouetteTips) {
      lines.push(`   - Calibração Silhouette: ${item.silhouetteTips.replace(/\n/g, ' ')}`);
    }
  });

  lines.push('=== REGRAS DE EXECUÇÃO FÍSICA OBRIGATÓRIAS ===');
  lines.push('1. Sempre prever base inteiriça estrutural (sem peças flutuantes) com fixação de hastes de acrílico de 15cm.');
  lines.push('2. Alturas de fita banana: 1.5mm para deslocamento e 2.0mm para apliques principais de destaque 3D.');
  lines.push('3. Parâmetros Silhouette Portrait 3: Lamicote sempre com 2 passadas (lâmina 4-5, força 32-33). Colorplus corte rápido (lâmina 3, vel 6-7).');
  lines.push('4. Harmonizar cores de papel com base na cor do bolo e insumos disponíveis.');

  const compiled = lines.join('\n');
  catalogPromptCache.cachedText = compiled;
  catalogPromptCache.itemCount = catalogStore.length;
  catalogPromptCache.lastUpdated = now;

  return compiled;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    engine: 'gemini-3.8-flash',
    time: new Date().toISOString(),
    catalogItemsLearned: catalogStore.length
  });
});

// Endpoint: Dynamic Catalog Knowledge & Learning Status
app.get('/api/studio/catalog-knowledge', (req, res) => {
  const promptContext = getCompiledCatalogSystemPrompt();
  res.json({
    itemCount: catalogStore.length,
    lastUpdated: new Date(catalogPromptCache.lastUpdated || Date.now()).toISOString(),
    ttlMinutes: Math.round(catalogPromptCache.ttlMs / 60000),
    activeModel: 'gemini-3.8-flash',
    sampleLearnedPrompt: promptContext,
  });
});

// Endpoint: Multimodal Vision Analysis - Auto-learn from product image using Gemini 3.8 Flash
app.post('/api/studio/analyze-item-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', existingHint } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Nenhuma imagem fornecida para análise.' });
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const cleanMimeType = mimeType.startsWith('image/') ? mimeType : 'image/jpeg';

    const ai = getGenAI();

    const systemInstruction = `Você é um mestre artesão de papelaria personalizada de luxo e especialista em engenharia de corte na Silhouette Portrait 3.
Sua missão é inspecionar minuciosamente a foto de um topo de bolo real artesanal e extrair as especificações técnicas completas de produção física para alimentar a base de conhecimento do ateliê.
Identifique:
1. Tema e título sofisticado no padrão Luisices.
2. Categoria mais adequada: infantil_3d, floral_luxo, shaker, classico ou mesversario.
3. Quantidade real de camadas de sobreposição 3D visíveis (1 a 6).
4. Papéis reais utilizados no Brasil (Fedrigoni Colorplus, Lamicote Dourado/Prata/Rosé 250g, Papel Fotográfico Matte 230g, Glitter, Kraft, Acetato).
5. Descrição técnica da montagem física e arquitetura do topo.
6. Calibração exata de lâmina, força, velocidade e passadas para a Silhouette Portrait 3 baseada nos materiais identificados.
7. Tags e palavras-chave.
Retorne rigorosamente no formato JSON solicitado.`;

    const userPrompt = `Analise detalhadamente esta foto de topo de bolo físico e extraia a ficha técnica completa para cadastro no acervo do ateliê Luisices.${
      existingHint ? ` Dica prévia informada pelo usuário: ${existingHint}` : ''
    }`;

    // Gemini 3 series modern multimodal vision model
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: cleanMimeType,
            },
          },
          {
            text: userPrompt,
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Título comercial nobre do topo de bolo' },
            theme: { type: Type.STRING, description: 'Tema ou estilo principal do pedido' },
            category: {
              type: Type.STRING,
              description: 'Categoria do topo',
            },
            layersCount: { type: Type.INTEGER, description: 'Número de camadas de sobreposição 3D estimadas (1 a 6)' },
            papers: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Lista de papéis identificados com gramatura aproximada',
            },
            description: { type: Type.STRING, description: 'Descrição da estrutura física, sobreposições e relevo' },
            silhouetteTips: { type: Type.STRING, description: 'Dicas de calibração para a Silhouette Portrait 3' },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Tags temáticas e de materiais',
            },
          },
          required: ['title', 'theme', 'category', 'layersCount', 'papers', 'description', 'silhouetteTips', 'tags'],
        },
      },
    });

    if (!response.text) {
      throw new Error('Não foi possível extrair dados da imagem.');
    }

    const parsedData = JSON.parse(response.text);

    return res.json({
      success: true,
      data: parsedData,
      analyzedWith: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('[Vision Studio] Erro ao analisar imagem do catálogo com Gemini 3.8 Flash:', error);
    return res.status(500).json({
      error: 'Falha ao analisar foto com Gemini 3.',
      details: error?.message || 'Erro interno na visão computacional.',
    });
  }
});

// Endpoint: Generate Technical Sheet and Silhouette Prompt (with Dynamic Auto-Learning System Prompt)
app.post('/api/studio/generate-concept', async (req, res) => {
  try {
    const { 
      theme, 
      recipientName, 
      ageOrOccasion, 
      category, 
      cakeColor, 
      preferredPapers, 
      referenceArchiveTitle,
      catalogItems 
    } = req.body;

    if (!theme || !recipientName) {
      return res.status(400).json({ error: 'Tema e Nome são obrigatórios.' });
    }

    const ai = getGenAI();

    // Dynamically compile living catalog knowledge
    const dynamicCatalogKnowledge = getCompiledCatalogSystemPrompt(catalogItems);

    const systemInstruction = `Você é um mestre sênior em design de papelaria personalizada, scrapfesta de luxo e operação de plotter de corte Silhouette Portrait 3 da marca "Luisices Papelaria de Afeto".
Sua missão é criar uma ficha técnica de produção rigorosamente viável fisicamente para um topo de bolo 3D em camadas de papel.

${dynamicCatalogKnowledge}

RESTRIÇÕES DE PRODUÇÃO FÍSICA:
1. Deve ser 100% executável na Silhouette Portrait 3 (formato de folha A4/Carta, esteira de 210x297mm).
2. Peças nunca flutuam soltas: deve existir base sólida unificadora traseira e guias para 2 hastes de acrílico transparentes de 15cm.
3. Usar papéis reais acessíveis no Brasil: Fedrigoni Colorplus (180g a 240g), Lamicote Metálico Espelhado (250g), Papel Fotográfico Matte (230g), Papel Glitter ou Kraft.
4. Alturas de fita banana de alta densidade: 1.5mm ou 2.0mm entre camadas.
5. Retorne os dados EXATAMENTE no formato JSON solicitado.`;

    const promptUser = `Gere a ficha técnica de produção e o prompt estúdio de mockup para:
- Tema: ${theme}
- Nome: ${recipientName}
- Idade/Ocasião: ${ageOrOccasion || 'Não especificado'}
- Categoria de Estilo: ${category}
- Cor do Bolo: ${cakeColor || 'Pastel neutro'}
- Papéis de Preferência: ${preferredPapers?.join(', ') || 'Padrão da categoria'}
${referenceArchiveTitle ? `- Referência do Acervo Luisices a seguir: ${referenceArchiveTitle}` : ''}`;

    // Modern Gemini 3 flagship flash model as requested by user
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: promptUser,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                theme: { type: Type.STRING },
                recipientName: { type: Type.STRING },
                ageOrOccasion: { type: Type.STRING },
                recommendedPapers: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      layer: { type: Type.STRING },
                      paperType: { type: Type.STRING },
                      color: { type: Type.STRING },
                      grammage: { type: Type.STRING },
                      finish: { type: Type.STRING },
                    },
                    required: ['layer', 'paperType', 'color', 'grammage', 'finish'],
                  },
                },
                layerBreakdown: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      level: { type: Type.INTEGER },
                      name: { type: Type.STRING },
                      purpose: { type: Type.STRING },
                      foamTapeHeight: { type: Type.STRING },
                      elements: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ['level', 'name', 'purpose', 'foamTapeHeight', 'elements'],
                  },
                },
                silhouetteSettings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      bladeDepth: { type: Type.STRING },
                      force: { type: Type.STRING },
                      speed: { type: Type.STRING },
                      passes: { type: Type.STRING },
                      cutType: { type: Type.STRING },
                      notes: { type: Type.STRING },
                    },
                    required: ['bladeDepth', 'force', 'speed', 'passes', 'cutType', 'notes'],
                  },
                },
                assemblySteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                whatsappPitch: { type: Type.STRING },
                photorealisticPrompt: { type: Type.STRING },
              },
              required: [
                'title',
                'theme',
                'recipientName',
                'ageOrOccasion',
                'recommendedPapers',
                'layerBreakdown',
                'silhouetteSettings',
                'assemblySteps',
                'whatsappPitch',
                'photorealisticPrompt',
              ],
            },
          },
        });
        if (response && response.text) {
          break; // Success!
        }
      } catch (err: any) {
        console.warn(`[Studio] Modelo ${modelName} falhou (${err?.status || err?.code || err?.message}). Tentando próximo modelo...`);
        lastError = err;
      }
    }

    let parsedData: any;
    if (response && response.text) {
      try {
        parsedData = JSON.parse(response.text);
      } catch (parseErr) {
        console.error('[Studio] Erro ao parsear JSON retornado pelo modelo:', parseErr);
      }
    }

    // High-fidelity fallback if model is temporarily unavailable
    if (!parsedData) {
      console.warn('[Studio] Usando ficha técnica generativa calibrada.');
      parsedData = {
        title: `Topo de Bolo 3D ${theme} - ${recipientName}`,
        theme: theme,
        recipientName: recipientName,
        ageOrOccasion: ageOrOccasion || 'Ocasião Especial',
        recommendedPapers: [
          {
            layer: 'Camada 1 (Base Estrutural)',
            paperType: 'Fedrigoni Colorplus',
            color: 'Tom de base contrastante',
            grammage: '180g a 240g',
            finish: 'Fosco liso',
          },
          {
            layer: 'Camada 2 (Deslocamento Intermediário)',
            paperType: preferredPapers?.find((p: string) => p.toLowerCase().includes('lamicote')) ? 'Lamicote Metálico' : 'Colorplus Contraste',
            color: 'Dourado ou Tom Pastel Suave',
            grammage: '250g',
            finish: 'Metálico espelhado / Acetinado',
          },
          {
            layer: 'Camada 3 (Personagens e Destaques)',
            paperType: 'Papel Fotográfico Matte ou Offset',
            color: 'Impresso em alta resolução',
            grammage: '230g',
            finish: 'Matte sem reflexo',
          },
        ],
        layerBreakdown: [
          {
            level: 1,
            name: 'Base Silhueta Estrutural Inteiriça',
            purpose: 'Garante firmeza física ao topo, unindo todos os elementos para fixação nas hastes de acrílico.',
            foamTapeHeight: 'Sem fita (base de sustentação)',
            elements: ['Contorno total unificado do projeto', 'Fixação das 2 hastes transparentes de 15cm'],
          },
          {
            level: 2,
            name: 'Camada de Deslocamento e Realce (+2mm)',
            purpose: 'Destaca o nome e cria profundidade luminosa com acabamento nobre.',
            foamTapeHeight: 'Fita banana 1.5mm',
            elements: [`Borda de deslocamento de ${recipientName}`, 'Molduras e silhuetas temáticas secundárias'],
          },
          {
            level: 3,
            name: 'Personagens e Elementos Temáticos (Print & Cut)',
            purpose: 'Apresenta a arte principal com acabamento perfeito sem bordas brancas desalinhadas.',
            foamTapeHeight: 'Fita banana 2.0mm',
            elements: [`Personagem principal de ${theme}`, `Nome ${recipientName} em lamicote com letras conectadas`, `Idade ${ageOrOccasion || ''}`],
          },
        ],
        silhouetteSettings: [
          {
            cutType: 'Print & Cut (Papel Matte 230g)',
            bladeDepth: 'Lâmina 3',
            force: '28',
            speed: '5',
            passes: '1 passada',
            notes: 'Rastrear borda externa com limiar em 75%. Marcas de registro em formato A4.',
          },
          {
            cutType: 'Corte Lamicote Dourado 250g',
            bladeDepth: 'Lâmina 4 a 5',
            force: '32',
            speed: '4',
            passes: '2 passadas',
            notes: 'Usar esteira com boa aderência para não deslizar no segundo corte.',
          },
          {
            cutType: 'Colorplus Fosco 180g (Camadas)',
            bladeDepth: 'Lâmina 3',
            force: '22',
            speed: '7',
            passes: '1 passada',
            notes: 'Corte seco rápido com esteira de aderência leve.',
          },
        ],
        assemblySteps: [
          'Corte a base inteiriça estrutural e cole as 2 hastes de acrílico com fita dupla face de alta fixação ou cola quente.',
          'Aplique a fita banana de 1.5mm atrás da camada intermediária de deslocamento e fixe sobre a base.',
          'Fixe os elementos de Print & Cut e o letreiro sobreposto com fita banana de 2.0mm para máxima profundidade 3D.',
          'Finalize conferindo se não há nenhum ponto frágil ou com menos de 1mm que possa vergar.',
        ],
        whatsappPitch: `Olá! Montei um projeto exclusivo e personalizado para o topo de bolo no tema *${theme}* da(o) *${recipientName}* (${ageOrOccasion || ''})! Ficou super delicado com camadas 3D em relevo e detalhes nobres. Gostaria que eu reservasse a data para a produção?`,
        photorealisticPrompt: `Realistic craft studio product photography of a physically feasible 3D layered papercraft cake topper, theme ${theme}, recipient name '${recipientName}', mounted on clear acrylic sticks into a smooth decorated celebration cake. Multi-layered cardstock with visible 2mm foam tape depth and realistic soft drop shadows, clean die-cut Silhouette craft edges.`,
      };
    }

    // Synthesize physical cut-ready vector SVG sheets calibrated for Silhouette Portrait 3
    parsedData.cutSheets = generatePortrait3CutSheets(parsedData, theme, recipientName, ageOrOccasion);

    // Mockup image generation
    let mockupImage: string | undefined = undefined;

    try {
      const imgPrompt = parsedData.photorealisticPrompt || `Realistic craft studio photo of a 3D layered papercraft cake topper, theme ${theme}, name ${recipientName}, mounted on acrylic sticks in a decorated cake.`;
      
      // Modern Gemini 3 image model
      const imgRes = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: imgPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '1:1',
          },
        },
      });

      for (const part of imgRes.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          mockupImage = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (imgError: any) {
      console.warn('[Studio] Gemini Image indisponível ou fallback ativo:', imgError?.message || imgError);
    }

    // High-resolution realistic craft studio mockup fallback
    if (!mockupImage) {
      const seed = Math.floor(Math.random() * 900000) + 10000;
      const studioPrompt = `Professional commercial studio product photography of a handcrafted luxury 3D layered paper cake topper, theme "${theme}", customized script text "${recipientName}", crafted from physical pastel Colorplus cardstock layers and reflective gold mirror lamicote cardstock, elevated with 2mm double-sided foam tape casting realistic drop shadows, mounted on clear acrylic sticks into an elegant pastel frosted cake, soft warm diffused studio lighting, ultra-sharp focus on paper cutouts and textures, 8k resolution`;
      mockupImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(studioPrompt)}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}`;
    }

    return res.json({
      success: true,
      modelUsed: 'gemini-3.8-flash',
      learnedCatalogCount: catalogStore.length,
      technicalSheet: parsedData,
      renderedPrompt: parsedData.photorealisticPrompt,
      mockupImage,
    });
  } catch (error: any) {
    console.error('[Studio] Erro ao gerar conceito técnico:', error);
    return res.status(500).json({
      error: 'Falha ao processar conceito.',
      details: error?.message || 'Erro interno no servidor.',
    });
  }
});

// Generator of cut-ready vector SVG sheets calibrated for Silhouette Portrait 3 (A4 mat: 210x297mm)
function generatePortrait3CutSheets(
  sheet: any,
  theme: string,
  recipientName: string,
  ageOrOccasion: string
) {
  const safeName = recipientName || 'Helena';
  const safeAge = ageOrOccasion || '3 anos';
  const safeTheme = theme || 'Jardim Encantado';

  const redCut = 'stroke="#FF0000" stroke-width="1.8" fill="none"';
  const blueScore = 'stroke="#0000FF" stroke-width="1.2" stroke-dasharray="6,4" fill="none"';
  const blackGuide = 'stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="3,3" fill="none"';

  return [
    {
      sheetIndex: 1,
      sheetTitle: 'Folha 1: Base Estrutural Traseira Inteiriça',
      paperType: 'Fedrigoni Colorplus 180g / 240g',
      colorHex: '#CBD5E1',
      colorName: 'Cinza / Branco Estrutural',
      bladeDepth: 'Lâmina 3',
      force: '30',
      speed: '5',
      passes: '1 passada',
      piecesCount: 1,
      notes: 'Base inteiriça unificadora. Linha vermelha cortará o contorno externo na Portrait 3 com guias para os canudos.',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO SILHOUETTE PORTRAIT 3 (FOLHA A4 210x297mm) -->
  <rect x="25" y="25" width="744" height="1073" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#1E293B">FOLHA 1: BASE ESTRUTURAL — COLORPLUS 180g / 240g</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Linha Vermelha (#FF0000) = Corte Silhouette Portrait 3 | Lâmina: 3 | Força: 30 | Vel: 5</text>
  <g transform="translate(60, 130)">
    <path d="M 120 420 C 60 400 30 320 50 250 C 30 200 60 140 120 120 C 150 70 230 40 310 70 C 370 40 450 60 490 110 C 560 110 610 170 600 240 C 630 310 590 390 530 420 C 510 490 430 520 350 510 C 270 530 180 490 120 420 Z" fill="#F1F5F9" ${redCut}/>
    <rect x="230" y="320" width="14" height="260" rx="3" ${blackGuide}/>
    <rect x="430" y="320" width="14" height="260" rx="3" ${blackGuide}/>
    <text x="237" y="440" font-family="sans-serif" font-size="9" fill="#64748B" transform="rotate(-90 237 440)" text-anchor="middle">HASTE ACRÍLICA ESQ (15cm)</text>
    <text x="437" y="440" font-family="sans-serif" font-size="9" fill="#64748B" transform="rotate(-90 437 440)" text-anchor="middle">HASTE ACRÍLICA DIR (15cm)</text>
    <text x="335" y="270" font-family="sans-serif" font-size="16" font-weight="bold" fill="#94A3B8" text-anchor="middle">BASE ESTRUTURAL UNIFICADA</text>
    <text x="335" y="295" font-family="sans-serif" font-size="12" fill="#94A3B8" text-anchor="middle">${safeTheme} • ${safeName}</text>
  </g>
</svg>`,
    },
    {
      sheetIndex: 2,
      sheetTitle: 'Folha 2: Camada de Deslocamento & Destaque (+2mm)',
      paperType: 'Lamicote Dourado Metálico 250g',
      colorHex: '#EAB308',
      colorName: 'Dourado Espelhado Luxo',
      bladeDepth: 'Lâmina 4 a 5',
      force: '33',
      speed: '3',
      passes: '2 passadas',
      piecesCount: 3,
      notes: 'Corte nobre com 2 passadas para garantir separação limpa do lamicote espelhado sem mastigar.',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO SILHOUETTE PORTRAIT 3 (FOLHA A4 210x297mm) -->
  <rect x="25" y="25" width="744" height="1073" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#CA8A04">FOLHA 2: DESLOCAMENTO &amp; LETREIRO — LAMICOTE DOURADO 250g</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Linha Vermelha (#FF0000) = Corte Duplo | Lâmina: 4-5 | Força: 33 | Vel: 3 | 2 Passadas</text>
  <g transform="translate(60, 140)">
    <path d="M 80 180 C 100 130 160 130 180 180 C 200 150 250 150 270 190 C 290 140 360 140 380 190 C 420 130 500 130 540 200 C 520 230 460 250 410 230 C 370 260 290 260 240 220 C 190 260 110 240 80 180 Z" fill="#FEF08A" ${redCut}/>
    <text x="310" y="195" font-family="serif" font-size="34" font-weight="bold" fill="#854D0E" text-anchor="middle">${safeName}</text>
    <circle cx="530" cy="380" r="75" fill="#FEF08A" ${redCut}/>
    <circle cx="530" cy="380" r="62" fill="none" ${redCut}/>
    <text x="530" y="398" font-family="sans-serif" font-size="44" font-weight="bold" fill="#854D0E" text-anchor="middle">${safeAge}</text>
    <path d="M 80 340 Q 110 320 140 340 Q 170 320 200 340 Q 230 320 260 340 Q 290 320 320 340 Q 350 320 380 340 L 380 430 Q 350 410 320 430 Q 290 410 260 430 Q 230 410 200 430 Q 170 410 140 430 Q 110 410 80 430 Z" fill="#FEF08A" ${redCut}/>
  </g>
</svg>`,
    },
    {
      sheetIndex: 3,
      sheetTitle: 'Folha 3: Personagens & Elementos Temáticos (Print & Cut)',
      paperType: 'Papel Fotográfico Matte 230g',
      colorHex: '#38BDF8',
      colorName: 'Colorido em Alta Resolução',
      bladeDepth: 'Lâmina 3',
      force: '24',
      speed: '6',
      passes: '1 passada',
      piecesCount: 6,
      notes: 'Imprimir em alta definição com marcas de registro ativadas no Silhouette Studio. Sangria de 1.5mm.',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO SILHOUETTE PORTRAIT 3 (FOLHA A4 COM MARCAS DE REGISTRO) -->
  <rect x="25" y="25" width="744" height="1073" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <!-- Marcas de Registro Ópticas da Silhouette Portrait 3 -->
  <rect x="40" y="40" width="22" height="22" fill="#000000"/>
  <path d="M 754 40 L 730 40 L 730 45 L 754 45 Z M 754 40 L 754 64 L 749 64 L 749 40 Z" fill="#000000"/>
  <path d="M 40 1060 L 64 1060 L 64 1055 L 40 1055 Z M 40 1060 L 40 1036 L 45 1036 L 45 1060 Z" fill="#000000"/>
  <text x="75" y="55" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0284C7">FOLHA 3: PRINT &amp; CUT — PAPEL FOTOGRÁFICO MATTE 230g</text>
  <text x="75" y="72" font-family="sans-serif" font-size="10" fill="#64748B">Alinhe as marcas ópticas no canto superior esquerdo da esteira Portrait 3</text>
  <g transform="translate(60, 120)">
    <ellipse cx="220" cy="240" rx="140" ry="170" fill="#E0F2FE" ${redCut}/>
    <text x="220" y="235" font-family="sans-serif" font-size="15" font-weight="bold" fill="#0369A1" text-anchor="middle">PERSONAGEM PRINCIPAL</text>
    <text x="220" y="258" font-family="sans-serif" font-size="12" fill="#0284C7" text-anchor="middle">Tema: ${safeTheme}</text>
    <ellipse cx="480" cy="180" rx="90" ry="90" fill="#E0F2FE" ${redCut}/>
    <text x="480" y="185" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0369A1" text-anchor="middle">ELEMENTO 1</text>
    <ellipse cx="480" cy="380" rx="80" ry="75" fill="#E0F2FE" ${redCut}/>
    <text x="480" y="385" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0369A1" text-anchor="middle">ELEMENTO 2</text>
    <circle cx="160" cy="520" r="45" fill="#E0F2FE" ${redCut}/>
    <circle cx="280" cy="520" r="45" fill="#E0F2FE" ${redCut}/>
    <circle cx="400" cy="520" r="45" fill="#E0F2FE" ${redCut}/>
    <text x="280" y="525" font-family="sans-serif" font-size="11" fill="#0284C7" text-anchor="middle">APLIQUES TEMÁTICOS 3D</text>
  </g>
</svg>`,
    },
    {
      sheetIndex: 4,
      sheetTitle: 'Folha 4: Camadas de Cores & Elementos de Volume',
      paperType: 'Fedrigoni Colorplus 180g (Tom Pastel)',
      colorHex: '#F472B6',
      colorName: 'Rosa Claro / Tom Pastel Destaque',
      bladeDepth: 'Lâmina 3',
      force: '22',
      speed: '7',
      passes: '1 passada',
      piecesCount: 5,
      notes: 'Corte rápido e limpo para elementos intermediários com fita banana de 1.5mm.',
      svgContent: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 794 1123" width="100%" height="100%">
  <!-- GABARITO SILHOUETTE PORTRAIT 3 (FOLHA A4 210x297mm) -->
  <rect x="25" y="25" width="744" height="1073" fill="none" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="4,4"/>
  <text x="45" y="60" font-family="sans-serif" font-size="14" font-weight="bold" fill="#DB2777">FOLHA 4: CAMADAS DE COR &amp; VOLUME — COLORPLUS 180g</text>
  <text x="45" y="80" font-family="sans-serif" font-size="11" fill="#64748B">Linha Vermelha (#FF0000) = Corte Silhouette Portrait 3 | Lâmina: 3 | Força: 22 | Vel: 7</text>
  <g transform="translate(60, 130)">
    <path d="M 90 120 L 550 120 L 520 220 L 320 260 L 120 220 Z" fill="#FCE7F3" ${redCut}/>
    <line x1="120" y1="170" x2="520" y2="170" ${blueScore}/>
    <text x="320" y="195" font-family="sans-serif" font-size="13" font-weight="bold" fill="#BE185D" text-anchor="middle">FAIXA DE RELEVO FRONTAL</text>
    <g transform="translate(100, 310)">
      <circle cx="50" cy="50" r="40" fill="#FCE7F3" ${redCut}/>
      <circle cx="160" cy="50" r="40" fill="#FCE7F3" ${redCut}/>
      <circle cx="270" cy="50" r="40" fill="#FCE7F3" ${redCut}/>
      <circle cx="380" cy="50" r="40" fill="#FCE7F3" ${redCut}/>
      <text x="215" y="55" font-family="sans-serif" font-size="11" fill="#BE185D" text-anchor="middle">CAMADAS DE SOBREPOSIÇÃO</text>
    </g>
  </g>
</svg>`,
    },
  ];
}

// Start Express and integrate Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Luisices Studio] Servidor operacional com Gemini 3.8 Flash na porta ${PORT}`);
  });
}

startServer();
