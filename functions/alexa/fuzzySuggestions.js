/**
 * Módulo de Sugestões Inteligentes e Similaridade Fonética/Fuzzy para a Alexa.
 * Fornece alternativas próximas quando o produto falado não possui correspondência exata.
 */

/**
 * Calcula a distância de Levenshtein entre duas strings.
 */
function levenshteinDistance(a, b) {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1, // deleção
        matrix[j][i - 1] + 1, // inserção
        matrix[j - 1][i - 1] + cost // substituição
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Normaliza o texto removendo acentos, pontuação e espaços múltiplos.
 */
function normalizeForFuzzy(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula a pontuação de similaridade composta (0.0 a 1.0) entre duas strings.
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeForFuzzy(str1);
  const norm2 = normalizeForFuzzy(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  // Substring direta ganha pontuação alta
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return 0.8 + (minLen / maxLen) * 0.18;
  }

  // Levenshtein normalizado
  const maxLen = Math.max(norm1.length, norm2.length);
  const levDist = levenshteinDistance(norm1, norm2);
  const levScore = maxLen > 0 ? (maxLen - levDist) / maxLen : 0;

  // Jaccard similarity entre palavras com tolerância a pequenos erros ortográficos
  const words1 = norm1.split(' ').filter(Boolean);
  const words2 = norm2.split(' ').filter(Boolean);

  let wordMatches = 0;
  for (const w1 of words1) {
    let bestWordSim = 0;
    for (const w2 of words2) {
      if (w1 === w2) {
        bestWordSim = 1;
      } else {
        const wMax = Math.max(w1.length, w2.length);
        const wDist = levenshteinDistance(w1, w2);
        const wScore = wMax > 0 ? (wMax - wDist) / wMax : 0;
        if (wScore > bestWordSim) bestWordSim = wScore;
      }
    }
    if (bestWordSim >= 0.75) {
      wordMatches += bestWordSim;
    }
  }

  const tokenScore = (words1.length + words2.length) > 0
    ? (2 * wordMatches) / (words1.length + words2.length)
    : 0;

  return levScore * 0.6 + tokenScore * 0.4;
}

/**
 * Encontra as melhores sugestões de produtos a partir do texto falado.
 */
function findClosestProductSuggestions(spokenProduct, catalogProducts, maxSuggestions = 2, minThreshold = 0.35) {
  if (!spokenProduct || !Array.isArray(catalogProducts) || catalogProducts.length === 0) {
    return [];
  }

  const scored = [];
  const seenNames = new Set();

  for (const prod of catalogProducts) {
    const prodName = typeof prod === 'string' ? prod : prod.name;
    if (!prodName) continue;
    const cleanName = prodName.trim();
    const lowerName = cleanName.toLowerCase();
    if (seenNames.has(lowerName)) continue;
    seenNames.add(lowerName);

    const score = calculateSimilarity(spokenProduct, cleanName);
    if (score >= minThreshold) {
      scored.push({
        id: prod.id || cleanName,
        name: cleanName,
        unitPrice: typeof prod.unitPrice === 'number' ? prod.unitPrice : 0,
        score,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxSuggestions);
}

/**
 * Constrói o texto em português para sugestão conversacional na Alexa.
 */
function buildSuggestionPrompt(spokenProduct, suggestions) {
  const sanitizedSpoken = String(spokenProduct || '').trim();
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  if (suggestions.length === 1) {
    return `Não encontrei ${sanitizedSpoken} no catálogo. Você quis dizer ${suggestions[0].name}?`;
  }

  return `Não encontrei ${sanitizedSpoken} no catálogo. Você quis dizer ${suggestions[0].name} ou ${suggestions[1].name}?`;
}

module.exports = {
  calculateSimilarity,
  findClosestProductSuggestions,
  buildSuggestionPrompt,
  normalizeForFuzzy,
};
