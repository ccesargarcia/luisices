/**
 * Máquina de Estados e Diálogo da Alexa em pt-BR.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 5).
 */

const crypto = require('crypto');
const admin = require('firebase-admin');
const { escapeXmlCharacters } = require('ask-sdk-core');
const { COLLECTIONS, recordAuditEvent } = require('./repository');
const { commitOrderFromDraft } = require('./orderService');
const {
  supportsApl,
  buildOrderCardAplDirective,
  buildWelcomeAplDirective,
  buildOrderSuccessAplDirective,
  buildFuzzySuggestionsAplDirective,
} = require('./apl');
const { buildDynamicEntitiesDirective, fetchCatalogProductsForDynamicEntities } = require('./dynamicEntities');
const { findClosestProductSuggestions, buildSuggestionPrompt } = require('./fuzzySuggestions');

// Meses em português para pronúncia amigável
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * Emite evento diagnóstico estruturado sem dados sensíveis (PII, tokens, sessionId ou payloads brutos).
 */
function logAlexaDiagnostic(event) {
  try {
    const sanitized = { ...event };
    if (sanitized.sessionId) {
      sanitized.sessionHash = crypto.createHash('sha256').update(String(sanitized.sessionId)).digest('hex').slice(0, 12);
      delete sanitized.sessionId;
    }
    if (sanitized.orderNumber !== undefined) {
      sanitized.hasOrderNumber = Boolean(sanitized.orderNumber);
      delete sanitized.orderNumber;
    }
    delete sanitized.customer;
    delete sanitized.product;
    console.info('[AlexaDiagnostic]', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...sanitized,
    }));
  } catch (_) {}
}

/**
 * Sanitiza texto dinâmico para fala segura em SSML (prevenção de injeção).
 */
function sanitizeSpeech(text) {
  if (!text) return '';
  return escapeXmlCharacters(String(text).trim());
}

/**
 * Formata moeda para pronúncia em português brasileiro.
 */
function formatCurrencyPtBr(value) {
  const num = Number(value || 0);
  const reais = Math.floor(num);
  const centavos = Math.round((num - reais) * 100);

  if (num === 0) return 'zero reais';

  const partes = [];
  if (reais > 0) {
    partes.push(`${reais} ${reais === 1 ? 'real' : 'reais'}`);
  }
  if (centavos > 0) {
    partes.push(`${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`);
  }
  return partes.join(' e ');
}

/**
 * Formata data YYYY-MM-DD para pronúncia clara: "10 de outubro de 2026"
 */
function formatDatePtBr(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const day = parseInt(dayStr, 10);
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${day} de ${monthName} de ${yearStr}`;
}

/**
 * Normaliza e valida data de entrega no fuso America/Sao_Paulo.
 * Rejeita datas incompletas (ex: semanas ou apenas mês) e datas no passado.
 */
function parseAndValidateDeliveryDate(dateSlotValue, timezone = 'America/Sao_Paulo') {
  if (!dateSlotValue || typeof dateSlotValue !== 'string') {
    return { valid: false, error: 'Data não informada.' };
  }

  const raw = dateSlotValue.trim();

  // Verifica se é semana (ex: 2026-W41) ou mês incompleto (2026-10)
  if (raw.includes('W') || /^\d{4}-\d{2}$/.test(raw)) {
    return {
      valid: false,
      error: 'Data incompleta. Por favor, informe o dia e o mês exatos da entrega.',
    };
  }

  // Formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return {
      valid: false,
      error: 'Formato de data não reconhecido. Por favor, informe dia e mês da entrega.',
    };
  }

  // Validação civil no fuso de São Paulo
  const [yearStr, monthStr, dayStr] = raw.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const d = parseInt(dayStr, 10);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return { valid: false, error: 'Data inválida no calendário.' };
  }

  const testDate = new Date(Date.UTC(y, m - 1, d));
  if (
    testDate.getUTCFullYear() !== y ||
    testDate.getUTCMonth() !== m - 1 ||
    testDate.getUTCDate() !== d
  ) {
    return { valid: false, error: 'Data inválida no calendário.' };
  }

  // Validar se não é data retroativa
  const now = new Date();
  // Comparação considerando timezone de São Paulo (UTC-3 padrão)
  const spTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
  if (raw < spTodayStr) {
    return {
      valid: false,
      error: 'A data de entrega não pode ser anterior à data de hoje.',
    };
  }

  return { valid: true, date: raw };
}

const PORTUGUESE_NUMBER_WORDS = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13,
  quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60,
  setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200,
  duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700,
  setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900, mil: 1000,
};

function parsePortugueseWordsToNumber(text) {
  if (!text || typeof text !== 'string') return null;
  // Rejeita imediatamente pontuação, barras ou operadores matemáticos
  if (/[.,\/+*_=]/.test(text)) {
    return null;
  }
  // Rejeita dígitos misturados em parser de palavras puras
  if (/\d/.test(text)) {
    return null;
  }

  const tokens = String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
    .split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let matchedAny = false;
  const normMap = {};
  for (const [k, v] of Object.entries(PORTUGUESE_NUMBER_WORDS)) {
    normMap[k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')] = v;
  }

  let lastVal = Infinity;
  for (const token of tokens) {
    if (token === 'e' || token === 'real' || token === 'reais' || token === 'centavo' || token === 'centavos') continue;
    if (normMap[token] !== undefined) {
      matchedAny = true;
      const val = normMap[token];
      if (val === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
        lastVal = 1000;
      } else {
        // Se um valor menor precede um valor maior (ex: 3 seguido de 50), não é um número inteiro válido em português
        if (val >= 10 && val > lastVal) {
          return null; // Não é um inteiro simples
        }
        current += val;
        lastVal = val;
      }
    } else {
      // Qualquer token não reconhecido como numeral em português invalida a interpretação
      return null;
    }
  }
  total += current;
  return matchedAny ? total : null;
}

function parsePartToNumber(partStr) {
  if (!partStr) return 0;
  const clean = String(partStr).replace(/r\$/gi, '').trim();
  // Se contiver vírgula, ponto, barra ou operadores matemáticos, rejeita
  if (/[.,\/+*_=]/.test(clean)) {
    return null;
  }
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  // Se contiver dígitos misturados, não é palavra
  if (/\d/.test(clean)) {
    return null;
  }
  return parsePortugueseWordsToNumber(clean);
}

/**
 * Interpreta e valida quantidade inteira de itens (1 a 10.000 itens).
 * Suporta dígitos ("10"), números por extenso ("dez", "duas", "quinze", "vinte e cinco"),
 * e sufixos comuns em português ("10 itens", "10 unidades", "dez unidades").
 */
function parseQuantity(quantityValue) {
  if (quantityValue === null || quantityValue === undefined || quantityValue === '') {
    return null;
  }
  if (typeof quantityValue === 'number') {
    if (Number.isInteger(quantityValue) && quantityValue > 0 && quantityValue <= 10000) {
      return quantityValue;
    }
    return null;
  }
  let clean = String(quantityValue)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(?:itens|item|unidades|unidade|pecas|peca)\b/g, '')
    .trim();

  // Se contiver operadores, vírgula ou ponto
  if (/[.,\/+*_=]/.test(clean)) {
    return null;
  }

  // Se forem dígitos puros
  if (/^\d+$/.test(clean)) {
    const num = parseInt(clean, 10);
    return (num > 0 && num <= 10000) ? num : null;
  }

  // Se forem palavras em português ("dez", "duas", "quinze")
  const wordNum = parsePortugueseWordsToNumber(clean);
  if (wordNum !== null && Number.isInteger(wordNum) && wordNum > 0 && wordNum <= 10000) {
    return wordNum;
  }

  return null;
}

/**
 * Interpreta e valida valor monetário em reais (máximo R$ 10.000,00 ou 1.000.000 centavos).
 * Suporta dígitos (3.50, 3,50, 100, 100,50, 1.500,00, R$ 150), zero reais (pedido gratuito),
 * números por extenso (cem reais, cinquenta, dez reais e cinquenta centavos),
 * e formatos coloquiais em português (3 e 50, três e cinquenta, 3 reais e 50, 3 e meio).
 * Rejeita estritamente expressões matemáticas, ambiguidades e formatos malformados.
 */
function parseAndValidatePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return { valid: false, error: 'Valor não informado.' };
  }

  // Se já for número numérico (ex: 3.5 ou 100)
  if (typeof priceValue === 'number') {
    if (!Number.isFinite(priceValue)) {
      return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
    }
    if (priceValue < 0) {
      return { valid: false, error: 'Valor total não pode ser negativo.' };
    }
    if (priceValue > 10000) {
      return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
    }
    const cents = Math.round(priceValue * 100);
    if (Math.abs(priceValue * 100 - cents) > 1e-4) {
      return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga um único valor em reais.' };
    }
    return { valid: true, price: cents / 100 };
  }

  const rawStr = String(priceValue).trim().toLowerCase();

  // Rejeita valores negativos
  if (rawStr.includes('-') || rawStr.includes('menos')) {
    return { valid: false, error: 'Valor total não pode ser negativo.' };
  }

  // Rejeita operadores matemáticos ou sinais de ambiguidade (ex: 10/20, 10+20, 20 ou 30)
  if (/\bou\b/.test(rawStr)) {
    return { valid: false, error: 'Valor ambíguo. Por favor, diga um único valor total em reais.' };
  }
  if (/[+\/*=]/.test(rawStr)) {
    return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga um único valor em reais.' };
  }

  let clean = rawStr
    .replace(/r\$/gi, '')
    .replace(/\b(?:cada|por unidade|a unidade|unidade|por item|item|no total|ao todo|total)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  clean = clean.replace(/\b(?:meio|meia)\b/g, '50 centavos');

  // 1. Tentar extração de números com formato brasileiro de milhar e decimal: 1.500,00 ou 1.500
  // Aceita sufixo monetário opcional: "reais" ou "real"
  const brThousands = clean.match(/^(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)(?:\s*(?:reais|real))?$/);
  if (brThousands) {
    const num = parseFloat(brThousands[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(num * 100) / 100 };
    }
  }

  // 2. Se contiver menção a centavos (ex: "dez reais e cinquenta centavos", "cinquenta centavos", "10 reais e 50 centavos", "3 e 50 centavos")
  if (/\bcentavos?\b/.test(clean)) {
    let reaisStr = '';
    let centavosStr = '';
    if (/\b(?:reais|real)\b/.test(clean)) {
      // Formato estrito: "<reais> reais [e] <centavos> centavos"
      const match = clean.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+)?(.*?)\bcentavos?\b\s*$/);
      if (match) {
        reaisStr = match[1].trim();
        centavosStr = match[2].trim();
      }
    } else {
      // Formato: "<centavos> centavos" ou "<reais> e <centavos> centavos"
      const match = clean.match(/^(.*?)\bcentavos?\b\s*$/);
      if (match) {
        const before = match[1].trim();
        if (before.includes(' e ')) {
          const lastE = before.lastIndexOf(' e ');
          reaisStr = before.slice(0, lastE).trim();
          centavosStr = before.slice(lastE + 3).trim();
        } else {
          centavosStr = before.replace(/^\s*e\s+/, '').trim();
        }
      }
    }
    // Rejeita "centavos" sozinho sem quantia explícita
    if (!centavosStr) {
      return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
    }
    const rVal = reaisStr ? parsePartToNumber(reaisStr) : 0;
    const cVal = parsePartToNumber(centavosStr);
    if (rVal === null || cVal === null || cVal >= 100 || cVal < 0) {
      return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
    }
    const total = rVal + (cVal / 100);
    if (total > 10000) {
      return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
    }
    return { valid: true, price: Math.round(total * 100) / 100 };
  }

  // 3. Formato com palavra "reais" / "real" e centavos implícitos:
  // Ex: "3 reais e 50", "três reais e cinquenta", "10 reais e 25", "vinte reais e noventa"
  const reaisImplicitMatch = clean.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+(.*?))?$/);
  if (reaisImplicitMatch && reaisImplicitMatch[2]) {
    const reaisStr = reaisImplicitMatch[1].trim();
    const centavosStr = reaisImplicitMatch[2].trim();
    const rVal = parsePartToNumber(reaisStr);
    const cVal = parsePartToNumber(centavosStr);
    if (rVal !== null && cVal !== null && cVal >= 0 && cVal < 100) {
      const total = rVal + (cVal / 100);
      if (total > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(total * 100) / 100 };
    }
  }

  // 4. Números padrão com vírgula ou ponto decimal simples: 3.50, 3,50, 150,50 ou 150.50 ou 150 ou "150 reais" ou "0 reais"
  // Rejeita mais de 2 casas decimais (ex: 10,005)
  if (/^\d+[.,]\d{3,}$/.test(clean.replace(/\s*(?:reais|real)$/, ''))) {
    return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga um único valor em reais.' };
  }
  const regexNum = /^(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real))?$/;
  const match = clean.match(regexNum);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(num * 100) / 100 };
    }
  }

  // 5. Números por extenso em português ou split por ' e ' para decimais (ex: "3 e 50", "dez e cinquenta", "vinte e cinco e cinquenta")
  const cleanWords = clean.replace(/\b(?:reais|real)\b/g, '').trim();

  // Se for extenso puro de número inteiro
  if (!/\d/.test(cleanWords)) {
    const wordNum = parsePortugueseWordsToNumber(cleanWords);
    if (wordNum !== null && wordNum >= 0) {
      if (wordNum > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(wordNum * 100) / 100 };
    }
  }

  // Se não foi um número inteiro puro, tentar dividir no último ' e ' como reais + centavos
  // Ex: "3 e 50", "três e cinquenta", "dez e cinquenta", "vinte e cinco e cinquenta"
  if (cleanWords.includes(' e ')) {
    const lastEIdx = cleanWords.lastIndexOf(' e ');
    const reaisPart = cleanWords.slice(0, lastEIdx).trim();
    const centavosPart = cleanWords.slice(lastEIdx + 3).trim();
    const rVal = parsePartToNumber(reaisPart);
    const cVal = parsePartToNumber(centavosPart);
    if (rVal !== null && cVal !== null && cVal >= 0 && cVal < 100) {
      const total = rVal + (cVal / 100);
      if (total <= 10000) {
        return { valid: true, price: Math.round(total * 100) / 100 };
      }
    }
  }

  return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
}

/**
 * Valida valor monetário e converte para centavos inteiros (0 a 1.000.000 centavos = R$ 10.000,00).
 * Rejeita estritamente não-inteiros, limites excedidos ou formatos malformados.
 */
function parseAndValidatePriceToCents(priceValue) {
  const res = parseAndValidatePrice(priceValue);
  if (!res.valid) return res;
  const cents = Math.round(res.price * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1000000) {
    return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
  }
  return { valid: true, cents, price: cents / 100 };
}

/**
 * Monta o resumo verbal e avança estado para 'awaiting_confirmation'.
 * Inclui detalhamento de preço unitário e total quando pricingMode === 'unit',
 * ou total do pedido inteiro quando pricingMode === 'total'.
 * Inclui confirmação explícita de gratuidade quando price === 0.
 */
function buildConfirmationSpeech(draftData, identity, config) {
  const envLabel = config.environment === 'prod' ? 'produção' : 'teste';
  const name = sanitizeSpeech(identity.displayName || 'Amanda');
  const qty = draftData.quantity;
  const prod = sanitizeSpeech(draftData.product);
  const cust = sanitizeSpeech(draftData.customer);
  const dateFormatted = formatDatePtBr(draftData.deliveryDate);

  if (draftData.pricingMode === 'unit' && draftData.unitPriceCents !== null && draftData.unitPriceCents !== undefined) {
    const unitPriceReais = draftData.unitPriceCents / 100;
    const unitPriceFormatted = unitPriceReais === 0 ? 'zero reais' : formatCurrencyPtBr(unitPriceReais);
    const totalPriceFormatted = draftData.price === 0 ? 'zero reais, pedido gratuito' : formatCurrencyPtBr(draftData.price);
    return `${name}, no ambiente de ${envLabel}: ${qty} ${prod} para ${cust} a ${unitPriceFormatted} cada, total de ${totalPriceFormatted}, entrega em ${dateFormatted}. Confirmar? Diga: pode confirmar. Ou diga o que deseja corrigir.`;
  }

  const priceFormatted = draftData.price === 0
    ? 'zero reais, pedido gratuito'
    : formatCurrencyPtBr(draftData.price);

  return `${name}, no ambiente de ${envLabel}: ${qty} ${prod} para ${cust}, entrega em ${dateFormatted}, total de ${priceFormatted}. Confirmar? Diga: pode confirmar. Ou diga o que deseja corrigir.`;
}

/**
 * Normaliza texto para correspondência no catálogo (minúsculas, sem acentos ou pontuação).
 */
function normalizeText(text) {
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
 * Determina de forma centralizada e determinística o próximo campo esperado pelo rascunho.
 * Usado tanto no cálculo da próxima pergunta do OrderIntent quanto no RepeatOrderIntent.
 *
 * @param {object} draft
 * @returns {string|null}
 */
function determineNextExpectedInput(draft) {
  if (!draft) return null;
  // 1. Pendência ativa de correção de campo (pendingField) tem prioridade máxima sobre campos faltantes ou valores antigos (R4 P2)
  if (draft.pendingField) {
    if (draft.pendingField === 'unitPrice') return 'unitPrice';
    if (draft.pendingField === 'total') return 'totalPrice';
    if (draft.pendingField === 'deliveryDate') return 'deliveryDate';
    if (draft.pendingField === 'conflict') return 'priceBasis';
  }
  // 2. Conflito ou valor aguardando esclarecimento de base de preço (cada vs total)
  if (draft.pendingConflict || (draft.pendingPriceCents !== null && draft.pendingPriceCents !== undefined)) {
    return 'priceBasis';
  }
  // 3. Preço sugerido do catálogo aguardando aceite
  if (draft.suggestedPriceCents !== null && draft.suggestedPriceCents !== undefined && (draft.price === null || draft.price === undefined)) {
    return 'suggestedPrice';
  }
  // 4. Confirmação (apenas se não houver pendência)
  if (draft.state === 'awaiting_confirmation') {
    return 'confirmation';
  }
  // 5. Campos obrigatórios faltantes
  if (!draft.product && !draft.customer) return 'product';
  if (!draft.product) return 'product';
  if (!draft.customer) return 'customer';
  if (!draft.quantity) return 'quantity';
  if (!draft.deliveryDate) return 'deliveryDate';
  if (draft.price === null || draft.price === undefined) return 'totalPrice';
  return null;
}

/**
 * Consulta controlada no catálogo de produtos do usuário.
 *
 * POLÍTICA DE SUPORTE RESTRITO (Fase 4 - Catálogo Controlado):
 * 1. Escopo estrito e isolamento multilocatário: busca indexada unicamente por `userId == uid`.
 * 2. Proteção contra latência na Alexa (< 8s) e full-scan: amostra limitada a no máximo 30 documentos.
 * 3. Prevenção de ambiguidades e alucinações:
 *    - Exige correspondência EXATA única entre o nome normalizado falado e o produto no catálogo.
 *    - Se houver zero ou múltiplas correspondências exatas (ex: variações como "Topo azul" e "Topo rosa"),
 *      ou apenas correspondências parciais por substring, o sistema NÃO escolhe arbitrariamente nenhuma variante.
 *    - Nesses casos, o texto falado é mantido como texto livre (`product`) e a Alexa solicita o valor diretamente
 *      ao usuário, preservando a integridade das cotações sem impor preços incorretos.
 */
async function searchUserCatalog(db, uid, queryText) {
  if (!db || !uid || !queryText) return [];
  try {
    const normQuery = normalizeText(queryText);
    if (!normQuery) return [];

    let snap = null;
    if (typeof db.collection === 'function') {
      const col = db.collection(COLLECTIONS.PRODUCTS || 'products');
      if (typeof col.where === 'function') {
        snap = await col.where('userId', '==', uid).limit(30).get();
      }
    }
    if (!snap || snap.empty || typeof snap.forEach !== 'function') return [];

    const matches = [];
    snap.forEach((doc) => {
      const data = typeof doc.data === 'function' ? doc.data() : (doc.data || {});
      const prodName = data.name || '';
      const normName = normalizeText(prodName);
      if (!normName) return;

      const isExact = normName === normQuery;
      const isSub = normName.includes(normQuery) || normQuery.includes(normName);
      if (isExact) {
        matches.unshift({
          id: doc.id,
          name: prodName,
          unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : 0,
          exact: true,
        });
      } else if (isSub) {
        matches.push({
          id: doc.id,
          name: prodName,
          unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : 0,
          exact: false,
        });
      }
    });

    return matches.slice(0, 3);
  } catch (err) {
    console.warn('[AlexaDialog] Erro ao consultar catálogo do usuário:', err?.message || err);
    return [];
  }
}

/**
 * Busca o rascunho mais recente ainda ativo e dentro do TTL para o usuário e vínculo.
 */
async function findActiveDraftForUser(db, uid, bindingKey, environment) {
  if (!db || !uid || typeof db.collection !== 'function') return null;
  try {
    const colRef = db.collection(COLLECTIONS.DRAFTS);
    if (!colRef || typeof colRef.where !== 'function') return null;

    let snap = null;
    // 1. Tenta consulta filtrada diretamente por estados ativos no Firestore com ordenação
    try {
      let query = colRef
        .where('uid', '==', uid)
        .where('state', 'in', ['collecting', 'awaiting_confirmation']);
      if (typeof query.orderBy === 'function') {
        query = query.orderBy('updatedAt', 'desc');
      }
      if (typeof query.limit === 'function') {
        query = query.limit(25);
      }
      snap = await query.get();
    } catch (inErr) {
      // 2. Fallback resiliente: ordenação por updatedAt sem filtro in
      try {
        let queryFallback = colRef.where('uid', '==', uid);
        if (typeof queryFallback.orderBy === 'function') {
          queryFallback = queryFallback.orderBy('updatedAt', 'desc');
        }
        if (typeof queryFallback.limit === 'function') {
          queryFallback = queryFallback.limit(50);
        }
        snap = await queryFallback.get();
      } catch (orderErr) {
        // 3. Fallback defensivo simples
        let querySimple = colRef.where('uid', '==', uid);
        if (typeof querySimple.limit === 'function') {
          querySimple = querySimple.limit(100);
        }
        snap = await querySimple.get();
      }
    }

    if (!snap || snap.empty) return null;

    const now = Date.now();
    const validDrafts = [];
    snap.forEach((doc) => {
      const data = (typeof doc.data === 'function' ? doc.data() : doc.data) || {};
      const expTime = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : 0;
      const isSameBinding = !data.bindingKey || data.bindingKey === bindingKey;
      const isSameEnv = !data.environment || data.environment === environment;
      const isAwaitingOrCollecting = data.state === 'awaiting_confirmation' || data.state === 'collecting';
      if (isSameBinding && isSameEnv && isAwaitingOrCollecting && expTime > now) {
        validDrafts.push({ ...data, draftId: doc.id });
      }
    });

    if (validDrafts.length === 0) return null;

    validDrafts.sort((a, b) => {
      const tA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
      const tB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
      return tB - tA;
    });

    // Se houver mais de um rascunho ativo não finalizado, expira os mais antigos para evitar ambiguidades
    if (validDrafts.length > 1) {
      for (let i = 1; i < validDrafts.length; i++) {
        colRef.doc(validDrafts[i].draftId).update({
          state: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
    }

    return validDrafts[0];
  } catch (err) {
    console.warn('[AlexaDialog] Erro ao buscar rascunho ativo do usuário:', err?.message || err);
    return null;
  }
}

/**
 * Constrói a próxima pergunta canônica e atributos de sessão de acordo com o estado do rascunho.
 * Usado tanto no fluxo principal (Passo 7) quanto na retomada de sessão (LaunchRequest) e fallback.
 */
function buildNextPromptForDraft(draft, identity, config, draftId) {
  if (!draft) return null;

  if (draft.pendingField === 'unitPrice') {
    return {
      speech: 'Qual é o preço de cada unidade?',
      reprompt: 'Qual é o preço de cada unidade?',
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        expectedInput: 'unitPrice',
        pendingField: 'unitPrice',
      },
    };
  }

  if (draft.pendingField === 'total') {
    return {
      speech: 'Qual é o valor total do pedido?',
      reprompt: 'Qual é o valor total do pedido?',
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        expectedInput: 'totalPrice',
        pendingField: 'total',
      },
    };
  }

  if (draft.pendingField === 'deliveryDate') {
    return {
      speech: 'Qual é a data de entrega corrigida?',
      reprompt: 'Para quando é a entrega?',
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        expectedInput: 'deliveryDate',
        pendingField: 'deliveryDate',
      },
    };
  }

  if (draft.pendingConflict) {
    const uStr = formatCurrencyPtBr(draft.pendingConflict.unitPriceCents / 100);
    const tStr = formatCurrencyPtBr(draft.pendingConflict.totalPriceCents / 100);
    const speech = draft.quantity
      ? `O valor informado de ${uStr} cada não fecha com o total de ${tStr}. O valor é ${uStr} cada ou ${tStr} no total?`
      : `O valor é ${uStr} cada ou ${tStr} no total?`;
    return {
      speech,
      reprompt: `Informe se o valor é ${uStr} cada ou ${tStr} no total.`,
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        pendingField: 'conflict',
        expectedInput: 'priceBasis',
      },
    };
  }

  if (draft.pendingPriceCents !== null && draft.pendingPriceCents !== undefined) {
    const pVal = draft.pendingPriceCents / 100;
    const pStr = formatCurrencyPtBr(pVal);
    return {
      speech: `${pStr} cada ou ${pStr} no total?`,
      reprompt: `O valor de ${pStr} é cada ou no total?`,
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        expectedInput: 'priceBasis',
      },
    };
  }

  if (draft.suggestedPriceCents !== null && draft.suggestedPriceCents !== undefined && draft.price === null) {
    const sVal = draft.suggestedPriceCents / 100;
    const sStr = formatCurrencyPtBr(sVal);
    const prodName = sanitizeSpeech(draft.suggestedProductName || draft.product);
    return {
      speech: `Encontrei ${prodName} no seu catálogo por ${sStr} cada. Deseja usar esse valor?`,
      reprompt: `Deseja usar o valor de ${sStr} cada? Diga sim para confirmar ou diga outro valor.`,
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft.revision,
        personId: identity.personId,
        expectedInput: 'suggestedPrice',
      },
    };
  }

  const missingCustomer = !draft.customer;
  const missingProduct = !draft.product;
  const missingQuantity = !draft.quantity;
  const missingDeliveryDate = !draft.deliveryDate;
  const missingPrice = draft.price === null || draft.price === undefined;

  if (missingProduct && missingCustomer) {
    return {
      speech: 'Qual é o produto e o cliente do pedido?',
      reprompt: 'Diga o produto e o nome do cliente.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'product' },
    };
  }

  if (missingProduct) {
    return {
      speech: 'Qual é o produto do pedido?',
      reprompt: 'Diga o produto.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'product' },
    };
  }

  if (missingCustomer) {
    return {
      speech: 'Para qual cliente é o pedido?',
      reprompt: 'Diga o nome do cliente.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'customer' },
    };
  }

  if (missingQuantity) {
    return {
      speech: 'Qual é a quantidade de itens?',
      reprompt: 'Informe a quantidade inteira.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'quantity' },
    };
  }

  if (missingDeliveryDate) {
    let speech = 'Qual é a data de entrega?';
    if (draft.quantity && draft.price !== null && draft.price !== undefined) {
      if (draft.pricingMode === 'unit' && draft.unitPriceCents !== null) {
        const uStr = formatCurrencyPtBr(draft.unitPriceCents / 100);
        const tStr = formatCurrencyPtBr(draft.price);
        speech = `São ${draft.quantity} unidades a ${uStr} cada, total de ${tStr}. Para quando é a entrega?`;
      } else {
        const tStr = formatCurrencyPtBr(draft.price);
        speech = `São ${draft.quantity} unidades por ${tStr} no total. Para quando é a entrega?`;
      }
    }
    return {
      speech,
      reprompt: 'Para quando é a entrega?',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'deliveryDate' },
    };
  }

  if (missingPrice) {
    return {
      speech: 'Qual é o valor total do pedido?',
      reprompt: 'Diga o valor total em reais.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'totalPrice' },
    };
  }

  return null;
}

/**
 * Traduz o status do pedido para linguagem falada natural e amigável.
 */
function translateOrderStatus(status) {
  const map = {
    pending: 'pendente',
    in_production: 'em produção',
    completed: 'concluído',
    delivered: 'entregue',
    cancelled: 'cancelado',
  };
  return map[status] || status || 'em andamento';
}

/**
 * Consulta e formata os pedidos recentes do usuário ou do ateliê.
 */
async function handleListRecentOrders({ identity, config, db }) {
  if (!db || typeof db.collection !== 'function') {
    return {
      speech: 'Não foi possível consultar os pedidos no momento. Tente novamente mais tarde.',
      shouldEndSession: true,
    };
  }

  const uid = identity?.uid;
  let orderDocs = [];

  try {
    const ordersCol = db.collection(COLLECTIONS.ORDERS);
    let snap = null;

    // 1. Tenta buscar pedidos criados pelo usuário ordenados por data decrescente
    if (uid) {
      try {
        snap = await ordersCol
          .where('userId', '==', uid)
          .where('deletedAt', '==', null)
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get();
      } catch (idxErr) {
        // Fallback sem orderBy caso o índice composto esteja ausente no ambiente
        console.warn('[AlexaDialog] Fallback na consulta com filtro de usuário:', idxErr?.message);
        try {
          snap = await ordersCol.where('userId', '==', uid).limit(10).get();
        } catch {}
      }
    }

    if (snap && !snap.empty) {
      orderDocs = snap.docs.map((d) => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d.data) }));
      orderDocs.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (typeof a.createdAt === 'number' ? a.createdAt : 0);
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (typeof b.createdAt === 'number' ? b.createdAt : 0);
        return tB - tA;
      });
      orderDocs = orderDocs.slice(0, 5);
    }

    // 2. Se o usuário não tiver pedidos próprios (ex: admin que gerencia o ateliê), busca os mais recentes gerais
    if (orderDocs.length === 0) {
      try {
        const generalSnap = await ordersCol
          .where('deletedAt', '==', null)
          .orderBy('createdAt', 'desc')
          .limit(5)
          .get();
        if (generalSnap && !generalSnap.empty) {
          orderDocs = generalSnap.docs.map((d) => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d.data) }));
        }
      } catch (generalErr) {
        console.warn('[AlexaDialog] Fallback na consulta geral de pedidos:', generalErr?.message);
        try {
          const rawSnap = await ordersCol.limit(5).get();
          if (rawSnap && !rawSnap.empty) {
            orderDocs = rawSnap.docs.map((d) => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d.data) }));
          }
        } catch {}
      }
    }
  } catch (err) {
    console.error('[AlexaDialog] Erro inesperado ao consultar pedidos recentes:', err);
    return {
      speech: 'Ocorreu um erro ao consultar seus pedidos no Luisices. Por favor, tente novamente.',
      shouldEndSession: true,
    };
  }

  if (orderDocs.length === 0) {
    return {
      speech: 'Você ainda não possui pedidos cadastrados no Luisices. Diga criar pedido para começar.',
      reprompt: 'Diga criar pedido para começar.',
      shouldEndSession: false,
      sessionAttributes: {},
    };
  }

  const ordinals = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto'];
  const speechParts = [];
  const cardLines = [];

  const count = orderDocs.length;
  const countText = count === 1 ? '1 pedido recente' : `${count} pedidos recentes`;

  for (let i = 0; i < count; i++) {
    const o = orderDocs[i];
    const customer = o.customerName || 'cliente';
    const product = o.productName || 'produto';
    const quantity = o.quantity || 1;
    const priceText = typeof o.price === 'number' ? `no valor de ${formatCurrencyPtBr(o.price)}` : '';
    const statusText = translateOrderStatus(o.status);
    const orderNum = o.orderNumber ? `${o.orderNumber}` : '';

    const ordinal = ordinals[i] || `${i + 1}º`;
    speechParts.push(`${ordinal}: ${quantity} ${product} para ${customer} ${priceText}, com status ${statusText}`);

    const cardNum = orderNum ? `${orderNum} • ` : '';
    const cardPrice = typeof o.price === 'number' ? ` • R$ ${o.price.toFixed(2).replace('.', ',')}` : '';
    cardLines.push(`${cardNum}${customer}\n${quantity}x ${product}${cardPrice} (${statusText})`);
  }

  let fullSpeech = `Encontrei ${countText}. `;
  if (count === 1) {
    fullSpeech += `${speechParts[0]}.`;
  } else {
    const lastPart = speechParts.pop();
    fullSpeech += `${speechParts.join('; ')}; e ${lastPart}.`;
  }
  fullSpeech += ' Deseja criar um novo pedido?';

  const cardContent = cardLines.join('\n\n');

  return {
    speech: fullSpeech,
    reprompt: 'Deseja criar um novo pedido? Diga sim para começar ou não para sair.',
    shouldEndSession: false,
    sessionAttributes: {},
    card: {
      type: 'Simple',
      title: 'Últimos Pedidos - Luisices',
      content: cardContent,
    },
  };
}

/**
 * Processador principal de diálogo da Alexa.
 *
 * @param {object} params
 * @param {object} params.envelope
 * @param {object} params.identity
 * @param {object} params.config
 * @param {admin.firestore.Firestore} params.db
 * @returns {Promise<{ speech: string, reprompt?: string, shouldEndSession: boolean, sessionAttributes?: object }>}
 */
async function handleAlexaDialog({ envelope, identity, config, db, authService = null }) {
  const request = envelope.request || {};
  const requestType = request.type || '';
  const intent = request.intent || {};
  const intentName = intent.name || '';
  const slots = intent.slots || {};

  const sessionAttrs = envelope.session?.attributes || {};
  let currentDraftId = sessionAttrs.draftId || null;
  const sessionId = envelope?.session?.sessionId || null;

  // Se a requisição não trouxe draftId na sessão e é intenção de continuação, confirmação ou repetição direta,
  // tenta recuperar um rascunho ativo não expirado em andamento para o usuário e vincula à sessão atual
  let isDirectRecovery = false;
  const isContinuationIntent =
    intentName === 'AMAZON.YesIntent' ||
    intentName === 'RepeatOrderIntent' ||
    intentName === 'ProvideCustomerIntent' ||
    intentName === 'ProvideCustomerOnlyIntent' ||
    intentName === 'ProvideProductIntent' ||
    intentName === 'ProvideQuantityIntent' ||
    intentName === 'ProvideNumberIntent' ||
    intentName === 'ProvideDeliveryDateIntent' ||
    intentName === 'ProvideUnitPriceIntent' ||
    intentName === 'ProvideTotalIntent' ||
    intentName === 'ProvidePriceIntent' ||
    intentName === 'ClarifyPriceUnitIntent' ||
    intentName === 'ClarifyPriceTotalIntent';

  if (!currentDraftId && isContinuationIntent && db && identity?.uid) {
    const activeDraft = await findActiveDraftForUser(db, identity.uid, identity.bindingKey, config.environment);
    if (activeDraft) {
      if (intentName === 'AMAZON.YesIntent' || intentName === 'RepeatOrderIntent') {
        isDirectRecovery = true;
      }
      if (sessionId && activeDraft.sessionId !== sessionId) {
        await db.collection(COLLECTIONS.DRAFTS).doc(activeDraft.draftId).update({
          sessionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        activeDraft.sessionId = sessionId;
      }
      currentDraftId = activeDraft.draftId;
      if (sessionAttrs.revision === undefined) {
        sessionAttrs.revision = activeDraft.revision;
      }
      if (!sessionAttrs.expectedInput && activeDraft.expectedInput) {
        sessionAttrs.expectedInput = activeDraft.expectedInput;
      }
    }
  }

  const runTx = typeof db.runTransaction === 'function'
    ? (fn) => db.runTransaction(fn)
    : async (fn) => fn({
        get: (r) => r.get(),
        set: (r, d, o) => r.set(d, o),
        update: (r, d) => r.update(d),
      });

  // 1. Início de sessão / LaunchRequest
  if (requestType === 'LaunchRequest') {
    const envLabel = config.environment === 'prod' ? 'produção' : 'teste';
    const name = sanitizeSpeech(identity.displayName);

    const activeDraft = await findActiveDraftForUser(db, identity.uid, identity.bindingKey, config.environment);
    const dynamicProducts = await fetchCatalogProductsForDynamicEntities(db, identity?.uid);
    const dynDirective = buildDynamicEntitiesDirective(dynamicProducts);
    const isApl = supportsApl(envelope);

    if (activeDraft) {
      // Associa o rascunho existente à nova sessão
      if (sessionId && activeDraft.sessionId !== sessionId) {
        await db.collection(COLLECTIONS.DRAFTS).doc(activeDraft.draftId).update({
          sessionId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        activeDraft.sessionId = sessionId;
      }

      if (activeDraft.state === 'awaiting_confirmation') {
        const summary = buildConfirmationSpeech(activeDraft, identity, config);
        const directives = [
          isApl
            ? buildOrderCardAplDirective({
                draftId: activeDraft.draftId,
                revision: activeDraft.revision,
                customer: activeDraft.customer,
                product: activeDraft.product,
                quantity: activeDraft.quantity,
                deliveryDate: formatDatePtBr(activeDraft.deliveryDate),
                totalPrice: formatCurrencyPtBr(activeDraft.price),
                statusLabel: 'Aguardando Confirmação',
                envLabel,
                showActions: true,
              })
            : null,
          dynDirective,
        ].filter(Boolean);

        return {
          speech: `Olá, ${name}. Você tem um pedido em andamento. ${summary}`,
          reprompt: 'Confirma o pedido? Diga: pode confirmar. Ou diga cancelar.',
          shouldEndSession: false,
          sessionAttributes: {
            draftId: activeDraft.draftId,
            revision: activeDraft.revision,
            personId: identity.personId,
            expectedInput: 'confirmation',
          },
          directives: directives.length > 0 ? directives : undefined,
        };
      }

      // Estado 'collecting': unificado com determineNextExpectedInput e buildNextPromptForDraft
      const nextPrompt = buildNextPromptForDraft(activeDraft, identity, config, activeDraft.draftId);
      const expectedInput = nextPrompt?.sessionAttributes?.expectedInput || activeDraft.expectedInput || 'collecting';

      // Sincroniza expectedInput no Firestore para coerência estrita
      if (activeDraft.expectedInput !== expectedInput) {
        await db.collection(COLLECTIONS.DRAFTS).doc(activeDraft.draftId).update({
          expectedInput,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
        activeDraft.expectedInput = expectedInput;
      }

      if (nextPrompt) {
        const prodInfo = activeDraft.quantity && activeDraft.product
          ? `${activeDraft.quantity} ${activeDraft.product}`
          : (activeDraft.product || '');
        const custInfo = activeDraft.customer ? ` para ${activeDraft.customer}` : '';
        const orderIntro = (prodInfo || custInfo)
          ? `Você tem um pedido em andamento de ${(prodInfo + custInfo).trim()}.`
          : 'Você tem um pedido em andamento.';

        let question = nextPrompt.speech;
        if (question.startsWith('São ')) {
          question = 'Para quando é a entrega?';
        }

        const directives = [
          isApl
            ? buildOrderCardAplDirective({
                draftId: activeDraft.draftId,
                revision: activeDraft.revision,
                customer: activeDraft.customer,
                product: activeDraft.product,
                quantity: activeDraft.quantity,
                deliveryDate: formatDatePtBr(activeDraft.deliveryDate),
                totalPrice: formatCurrencyPtBr(activeDraft.price),
                statusLabel: 'Pedido em Andamento',
                envLabel,
                showActions: true,
              })
            : null,
          dynDirective,
        ].filter(Boolean);

        return {
          speech: `Olá, ${name}. ${orderIntro} ${question}`,
          reprompt: nextPrompt.reprompt,
          shouldEndSession: false,
          sessionAttributes: nextPrompt.sessionAttributes,
          directives: directives.length > 0 ? directives : undefined,
        };
      }
    }

    const speech = `Olá, ${name}. Ambiente de ${envLabel}. Diga criar pedido, ver últimos pedidos ou vincular minha voz.`;
    const reprompt = 'Você pode dizer: criar pedido, ver últimos pedidos ou pedir ajuda.';
    const directives = [
      isApl ? buildWelcomeAplDirective({ userName: name, envLabel }) : null,
      dynDirective,
    ].filter(Boolean);

    return {
      speech,
      reprompt,
      shouldEndSession: false,
      sessionAttributes: {},
      directives: directives.length > 0 ? directives : undefined,
    };
  }

  // 2. Comandos globais de saída e ajuda
  if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    if (currentDraftId) {
      await runTx(async (transaction) => {
        const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId);
        const snap = await transaction.get(draftRef);
        if (snap.exists) {
          const dData = (typeof snap.data === 'function' ? snap.data() : snap.data) || {};
          // Validação estrita de titularidade, ambiente e estado antes de cancelar
          const isOwner = dData.uid === identity.uid;
          const isSameBinding = !dData.bindingKey || dData.bindingKey === identity.bindingKey;
          const isSameEnv = !dData.environment || dData.environment === config.environment;
          // CancelIntent só pode cancelar estados collecting ou awaiting_confirmation.
          // NUNCA alterar committed, expired, cancelled ou awaiting_app_approval.
          const isCancellable = dData.state === 'collecting' || dData.state === 'awaiting_confirmation';

          if (isOwner && isSameBinding && isSameEnv && isCancellable) {
            transaction.update(draftRef, {
              state: 'cancelled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      }).catch(() => {});
    }
    return {
      speech: 'Pedido cancelado. Até logo.',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  if (intentName === 'AMAZON.HelpIntent') {
    const helpSpeech =
      'Para criar um pedido, diga por exemplo: criar pedido de dez caixinhas para Maria a dez reais cada. Para consultar seus pedidos, diga: ver últimos pedidos. Vou perguntar a data de entrega antes de confirmar.';
    return {
      speech: helpSpeech,
      reprompt: 'Diga criar pedido ou ver últimos pedidos para começar.',
      shouldEndSession: false,
      sessionAttributes: sessionAttrs,
    };
  }

  // 2.6 Consultar últimos pedidos
  if (intentName === 'ListRecentOrdersIntent') {
    return await handleListRecentOrders({ identity, config, db });
  }

  // 2.7 Resposta a 'sim' ou 'não' quando não há rascunho de pedido ativo
  if (!currentDraftId && intentName === 'AMAZON.YesIntent') {
    return {
      speech: 'Perfeito! Para qual cliente e produto deseja criar o pedido?',
      reprompt: 'Por exemplo, diga: vinte cadernos para Maria.',
      shouldEndSession: false,
      sessionAttributes: {},
    };
  }

  if (!currentDraftId && intentName === 'AMAZON.NoIntent') {
    return {
      speech: 'Tudo bem. Se precisar de algo, estarei por aqui. Até logo!',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  // 2.8 Repetir pedido / O que já informei (Fase 3)
  if (intentName === 'RepeatOrderIntent') {
    if (!currentDraftId) {
      return {
        speech: 'Ainda não temos dados para este pedido. Para começar, diga por exemplo: criar pedido de dez caixinhas para Maria.',
        reprompt: 'Diga os dados do pedido para começar.',
        shouldEndSession: false,
        sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId },
      };
    }

    const txResult = await runTx(async (transaction) => {
      const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId);
      const snap = await transaction.get(draftRef);
      if (!snap || !snap.exists) {
        return null;
      }
      const d = (typeof snap.data === 'function' ? snap.data() : snap.data) || {};
      const now = Date.now();
      const expTime = d.expiresAt?.toDate ? d.expiresAt.toDate().getTime() : 0;
      const isSameUser = d.uid === identity.uid;
      const isSameBinding = !d.bindingKey || d.bindingKey === identity.bindingKey;
      const isSameEnv = !d.environment || d.environment === config.environment;
      const isNotExpired = expTime > 0 && expTime > now;
      const isNotTerminal =
        d.state !== 'committed' &&
        d.state !== 'cancelled' &&
        d.state !== 'expired' &&
        d.state !== 'awaiting_app_approval';

      if (!isSameUser || !isSameBinding || !isSameEnv || !isNotExpired || !isNotTerminal) {
        return null;
      }

      if (sessionId && d.sessionId !== sessionId) {
        d.sessionId = sessionId;
      }

      const nextExpected = determineNextExpectedInput(d);
      if (nextExpected && nextExpected !== d.expectedInput) {
        d.expectedInput = nextExpected;
        d.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(draftRef, d, { merge: true });
      }

      return { draft: d, nextExpected };
    }).catch((err) => {
      console.warn('[AlexaDialog] Erro na transação do RepeatOrderIntent:', err?.message || err);
      return null;
    });

    const currentDraft = txResult?.draft || null;
    const nextExpected = txResult?.nextExpected || null;

    if (!currentDraft || (!currentDraft.customer && !currentDraft.product && !currentDraft.quantity && currentDraft.price === null)) {
      return {
        speech: 'Ainda não temos dados para este pedido. Para começar, diga por exemplo: criar pedido de dez caixinhas para Maria.',
        reprompt: 'Diga os dados do pedido para começar.',
        shouldEndSession: false,
        sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId },
      };
    }

    if (
      currentDraft.state === 'awaiting_confirmation' &&
      !currentDraft.pendingField &&
      !currentDraft.pendingConflict &&
      (currentDraft.pendingPriceCents === null || currentDraft.pendingPriceCents === undefined)
    ) {
      const confirmSpeech = buildConfirmationSpeech(currentDraft, identity, config);
      return {
        speech: `Repetindo o pedido: ${confirmSpeech}`,
        reprompt: 'Você confirma o pedido? Diga: pode confirmar. Ou diga o que deseja corrigir.',
        shouldEndSession: false,
        sessionAttributes: { draftId: currentDraftId, revision: currentDraft.revision, personId: identity.personId, expectedInput: 'confirmation' },
      };
    }

    // Estado collecting: relata o que já temos e o que falta
    const known = [];
    if (currentDraft.customer) known.push(`cliente ${sanitizeSpeech(currentDraft.customer)}`);
    if (currentDraft.product) known.push(`produto ${sanitizeSpeech(currentDraft.product)}`);
    if (currentDraft.quantity) known.push(`${currentDraft.quantity} ${currentDraft.quantity === 1 ? 'unidade' : 'unidades'}`);
    if (currentDraft.pricingMode === 'unit' && currentDraft.unitPriceCents !== null) {
      known.push(`${formatCurrencyPtBr(currentDraft.unitPriceCents / 100)} cada, total de ${formatCurrencyPtBr(currentDraft.price)}`);
    } else if (currentDraft.pricingMode === 'total' && currentDraft.totalPriceCents !== null) {
      known.push(`total de ${formatCurrencyPtBr(currentDraft.price)}`);
    }
    if (currentDraft.deliveryDate) known.push(`entrega em ${formatDatePtBr(currentDraft.deliveryDate)}`);

    let speech = `Até agora temos: ${known.join(', ')}. `;
    let reprompt = 'O que deseja informar agora?';

    if (nextExpected === 'unitPrice') {
      speech += 'Qual é o preço de cada unidade?';
      reprompt = 'Qual é o preço de cada unidade?';
    } else if (nextExpected === 'suggestedPrice') {
      const sVal = currentDraft.suggestedPriceCents / 100;
      const sStr = formatCurrencyPtBr(sVal);
      const prodName = sanitizeSpeech(currentDraft.suggestedProductName || currentDraft.product);
      speech += `Encontrei ${prodName} no catálogo por ${sStr} cada. Deseja usar esse valor?`;
      reprompt = `Deseja usar o valor de ${sStr} cada? Diga sim para confirmar ou diga outro valor.`;
    } else if (nextExpected === 'priceBasis') {
      if (currentDraft.pendingConflict) {
        const uStr = formatCurrencyPtBr(currentDraft.pendingConflict.unitPriceCents / 100);
        const tStr = formatCurrencyPtBr(currentDraft.pendingConflict.totalPriceCents / 100);
        speech += `Temos ${uStr} cada ou ${tStr} no total. É cada ou no total?`;
        reprompt = `O valor é ${uStr} cada ou ${tStr} no total?`;
      } else {
        const valCents = currentDraft.pendingPriceCents;
        const valStr = formatCurrencyPtBr(valCents / 100);
        speech += `Temos o valor de ${valStr}. É cada ou no total?`;
        reprompt = `Esse valor de ${valStr} é cada ou no total?`;
      }
    } else if (nextExpected === 'product') {
      if (!currentDraft.customer) {
        speech += 'Falta informar o produto e o cliente.';
        reprompt = 'Qual é o produto e o cliente?';
      } else {
        speech += 'Falta informar o produto.';
        reprompt = 'Qual é o produto do pedido?';
      }
    } else if (nextExpected === 'customer') {
      speech += 'Falta informar o cliente.';
      reprompt = 'Para qual cliente é o pedido?';
    } else if (nextExpected === 'quantity') {
      speech += 'Falta informar a quantidade.';
      reprompt = 'Qual é a quantidade de itens?';
    } else if (nextExpected === 'deliveryDate') {
      if (currentDraft.pendingField === 'deliveryDate') {
        speech += 'Qual é a data de entrega corrigida?';
        reprompt = 'Para quando é a entrega?';
      } else {
        speech += 'Falta informar a data de entrega. Para quando é a entrega?';
        reprompt = 'Para quando é a entrega?';
      }
    } else if (nextExpected === 'totalPrice') {
      if (currentDraft.pendingField === 'total') {
        speech += 'Qual é o valor total do pedido?';
        reprompt = 'Qual é o valor total do pedido?';
      } else {
        speech += 'Falta informar o valor.';
        reprompt = 'Qual é o valor do pedido?';
      }
    }

    return {
      speech: speech.trim(),
      reprompt,
      shouldEndSession: false,
      sessionAttributes: {
        draftId: currentDraftId,
        revision: currentDraft.revision,
        personId: identity.personId,
        expectedInput: nextExpected,
        pendingField: currentDraft.pendingField || null,
      },
    };
  }

  // 3. Fallback intent (tratamento de fala não compreendida com limite de 3 tentativas)
  if (intentName === 'AMAZON.FallbackIntent') {
    let fallbackCount = (sessionAttrs.fallbackCount || 0) + 1;
    let shouldExpire = false;
    let draftUpdated = false;
    let fallbackExpectedInput = sessionAttrs.expectedInput || null;

    if (currentDraftId && sessionId) {
      await runTx(async (transaction) => {
        const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId);
        const snap = await transaction.get(draftRef);
        if (snap.exists) {
          const dData = snap.data() || {};
          // Fallback deve conferir UID, binding, ambiente, sessão e estado antes de alterar contador ou expirar.
          // NUNCA alterar committed, expired, cancelled ou awaiting_app_approval.
          const isOwner = dData.uid === identity.uid;
          const isSameBinding = !dData.bindingKey || dData.bindingKey === identity.bindingKey;
          const isSameEnv = !dData.environment || dData.environment === config.environment;
          const isSameSession = dData.sessionId === sessionId;
          const isModifiable = dData.state === 'collecting' || dData.state === 'awaiting_confirmation';

          if (isOwner && isSameBinding && isSameEnv && isSameSession && isModifiable) {
            draftUpdated = true;
            if (dData.expectedInput) {
              fallbackExpectedInput = dData.expectedInput;
            }
            if (dData.fallbackCount !== undefined) {
              fallbackCount = Math.max(fallbackCount, dData.fallbackCount + 1);
            }
            shouldExpire = fallbackCount >= 3;

            if (shouldExpire) {
              transaction.update(draftRef, {
                state: 'expired',
                fallbackCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              transaction.update(draftRef, {
                fallbackCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }).catch(() => {});
    } else if (!currentDraftId) {
      // Sem rascunho associado, conta tentativas da sessão normal
      shouldExpire = fallbackCount >= 3;
      draftUpdated = true;
    }

    if (shouldExpire && draftUpdated) {
      return {
        speech: 'Não consegui entender após três tentativas. Por favor, acesse o aplicativo Luisices para registrar o pedido.',
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }

    // Se havia currentDraftId mas não era da sessão ou usuário, descarta draftId órfão
    const validDraftId = draftUpdated && currentDraftId ? currentDraftId : null;
    const nextAttrs = { ...sessionAttrs };
    if (validDraftId) {
      nextAttrs.draftId = validDraftId;
    } else {
      delete nextAttrs.draftId;
    }
    nextAttrs.fallbackCount = draftUpdated ? fallbackCount : 1;
    if (fallbackExpectedInput) {
      nextAttrs.expectedInput = fallbackExpectedInput;
    }

    let fallbackSpeech = 'Não entendi. Por favor, repita a informação do pedido.';
    let fallbackReprompt = 'Diga os dados do pedido ou diga cancelar.';

    if (fallbackExpectedInput === 'unitPrice') {
      fallbackSpeech = 'Não entendi. Diga o preço de cada unidade, por exemplo: dez reais cada.';
      fallbackReprompt = 'Qual é o valor unitário de cada item?';
    } else if (fallbackExpectedInput === 'totalPrice') {
      fallbackSpeech = 'Não entendi. Diga o valor total do pedido, por exemplo: cem reais no total.';
      fallbackReprompt = 'Qual é o valor total do pedido?';
    } else if (fallbackExpectedInput === 'deliveryDate') {
      fallbackSpeech = 'Não entendi. Diga a data de entrega, por exemplo: dia quinze de outubro.';
      fallbackReprompt = 'Qual é a data de entrega?';
    } else if (fallbackExpectedInput === 'quantity') {
      fallbackSpeech = 'Não entendi. Diga a quantidade inteira de itens, por exemplo: dez unidades.';
      fallbackReprompt = 'Qual é a quantidade de itens?';
    } else if (fallbackExpectedInput === 'customer') {
      fallbackSpeech = 'Não entendi. Diga o nome do cliente, por exemplo: Maria.';
      fallbackReprompt = 'Para qual cliente é o pedido?';
    } else if (fallbackExpectedInput === 'product') {
      fallbackSpeech = 'Não entendi. Diga o produto desejado, por exemplo: caixinhas ou topo de bolo.';
      fallbackReprompt = 'Qual é o produto do pedido?';
    } else if (fallbackExpectedInput === 'confirmation') {
      fallbackSpeech = 'Não entendi. Diga: pode confirmar, ou diga não para alterar.';
      fallbackReprompt = 'Você confirma o pedido? Diga: pode confirmar. Ou diga não para alterar.';
    } else if (fallbackExpectedInput === 'priceBasis') {
      fallbackSpeech = 'Não entendi. Diga se o valor informado é cada ou no total.';
      fallbackReprompt = 'O valor é cada ou no total?';
    }

    return {
      speech: fallbackSpeech,
      reprompt: fallbackReprompt,
      shouldEndSession: false,
      sessionAttributes: nextAttrs,
    };
  }

  // 4. Pré-validação de formato dos slots recebidos neste turno (valores brutos imutáveis para retry transacional seguro)
  const rawIncomingUpdates = {};

  const customerSlot = slots.customer?.value || slots.Customer?.value;
  if (customerSlot) {
    const cleanCust = customerSlot.trim();
    if (cleanCust.length >= 2 && cleanCust.length <= 100) {
      rawIncomingUpdates.customer = cleanCust;
    }
  }

  const productSlotObj = slots.product || slots.Product;
  let cleanProd = productSlotObj?.value ? String(productSlotObj.value).trim() : '';

  // Consome resolutions do NLU da Alexa se houver resolução canônica com ER_SUCCESS_MATCH (Achado P2)
  const resolutions = productSlotObj?.resolutions?.resolutionsPerAuthority;
  if (Array.isArray(resolutions)) {
    for (const res of resolutions) {
      if (res.status?.code === 'ER_SUCCESS_MATCH' && Array.isArray(res.values) && res.values.length === 1) {
        const canonicalName = res.values[0]?.value?.name;
        if (canonicalName && typeof canonicalName === 'string') {
          cleanProd = canonicalName.trim();
          break;
        }
      }
    }
  }

  if (cleanProd && cleanProd.length >= 1 && cleanProd.length <= 200) {
    rawIncomingUpdates.product = cleanProd;
  }


  // Intercepta ProvideNumberIntent ou slots de centavos desvinculados
  let genericPriceSlot = slots.price?.value || slots.Price?.value || slots.ambiguousPrice?.value || slots.AmbiguousPrice?.value;
  let unitPriceSlot = slots.unitPrice?.value || slots.UnitPrice?.value;
  let totalSlot = slots.total?.value || slots.Total?.value;
  let quantitySlot = slots.quantity?.value || slots.Quantity?.value;

  const centsSlot = slots.cents?.value || slots.Cents?.value;

  if (intentName === 'ProvideNumberIntent') {
    const numSlot = slots.number?.value || slots.Number?.value;
    let combinedStr = numSlot;
    if (numSlot && centsSlot) {
      combinedStr = `${numSlot} e ${centsSlot}`;
    } else if (!numSlot && centsSlot) {
      combinedStr = `${centsSlot} centavos`;
    }
    if (combinedStr) {
      genericPriceSlot = combinedStr;
    }
  } else if (centsSlot) {
    // Para ProvidePriceIntent e similares onde o NLU preencheu o price + cents
    if (genericPriceSlot) genericPriceSlot = `${genericPriceSlot} e ${centsSlot}`;
    else if (unitPriceSlot) unitPriceSlot = `${unitPriceSlot} e ${centsSlot}`;
    else if (totalSlot) totalSlot = `${totalSlot} e ${centsSlot}`;
    else genericPriceSlot = `${centsSlot} centavos`;
  }

  if (quantitySlot) {
    const parsedQty = parseQuantity(quantitySlot);
    if (parsedQty !== null) {
      rawIncomingUpdates.quantity = parsedQty;
    } else {
      // Se não for um inteiro puro (ex: "3.50", "3 e 50"), verifica se é um preço válido para permitir mapeamento contextual
      const pCandidate = parseAndValidatePriceToCents(quantitySlot);
      if (pCandidate.valid && !genericPriceSlot && !unitPriceSlot && !totalSlot) {
        genericPriceSlot = quantitySlot;
      } else {
        const cleanRawDigits = String(quantitySlot).replace(/\D/g, '');
        const rawNum = cleanRawDigits ? parseInt(cleanRawDigits, 10) : NaN;
        if (!isNaN(rawNum) && (rawNum <= 0 || rawNum > 10000)) {
          return {
            speech: 'A quantidade deve ser entre 1 e dez mil itens.',
            reprompt: 'Qual é a quantidade de itens?',
            shouldEndSession: false,
            sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId, expectedInput: 'quantity' },
          };
        }
        return {
          speech: 'A quantidade de itens deve ser um número inteiro. Por exemplo: dez ou quinze.',
          reprompt: 'Qual é a quantidade inteira de itens?',
          shouldEndSession: false,
          sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId, expectedInput: 'quantity' },
        };
      }
    }
  }

  const dateSlot = slots.deliveryDate?.value || slots.DeliveryDate?.value || slots.date?.value;
  let dateValidationError = null;
  if (dateSlot) {
    const dateRes = parseAndValidateDeliveryDate(dateSlot, config.timezone);
    if (dateRes.valid) {
      rawIncomingUpdates.deliveryDate = dateRes.date;
    } else {
      dateValidationError = dateRes.error;
    }
  }

  let rawParsedUnitPrice = null;
  let unitPriceValidationError = null;
  if (unitPriceSlot) {
    const uRes = parseAndValidatePriceToCents(unitPriceSlot);
    if (!uRes.valid) {
      unitPriceValidationError = uRes.error;
    } else {
      rawParsedUnitPrice = uRes;
    }
  }

  let rawParsedTotal = null;
  let totalValidationError = null;
  if (totalSlot) {
    const tRes = parseAndValidatePriceToCents(totalSlot);
    if (!tRes.valid) {
      totalValidationError = tRes.error;
    } else {
      rawParsedTotal = tRes;
    }
  }

  let rawParsedGenericPrice = null;
  let genericPriceValidationError = null;
  if (genericPriceSlot) {
    const gRes = parseAndValidatePriceToCents(genericPriceSlot);
    if (!gRes.valid) {
      genericPriceValidationError = gRes.error;
    } else {
      rawParsedGenericPrice = gRes;
    }
  }

  // Consulta controlada ao catálogo do usuário (Fase 4 & Sugestões Fuzzy)
  let catalogMatch = null;
  let fuzzySuggestions = [];
  if (rawIncomingUpdates.product && db && identity.uid) {
    try {
      const matches = await searchUserCatalog(db, identity.uid, rawIncomingUpdates.product);
      const exactMatches = matches.filter((m) => m.exact);
      // P1.2: Apenas aceitar correspondência de catálogo se houver exatamente UMA correspondência exata.
      // Se houver múltiplas correspondências (ambiguidade de variantes como "Topo azul" e "Topo rosa")
      // ou apenas correspondência parcial por substring, NÃO escolher arbitrariamente matches[0].
      if (exactMatches.length === 1) {
        catalogMatch = exactMatches[0];
      } else if (exactMatches.length === 0) {
        // Se não houver correspondência exata, busca sugestões próximas no catálogo
        const dynProducts = await fetchCatalogProductsForDynamicEntities(db, identity.uid).catch(() => []);
        fuzzySuggestions = findClosestProductSuggestions(rawIncomingUpdates.product, dynProducts, 2);
      }
    } catch (err) {
      console.warn('[AlexaDialog] Erro ao buscar produto no catálogo:', err?.message || err);
    }
  }

  // 5. Transação atômica única para carregar/modificar o rascunho com controle de concorrência
  // Todos os estados são retornados estruturados por tentativa, evitando vazamento entre retries.
  const txResult = await runTx(async (transaction) => {
    // Cópia local e isolada de todos os slots para cada tentativa da transação (R3 P1)
    const incomingUpdates = { ...rawIncomingUpdates };
    let parsedUnitPrice = rawParsedUnitPrice ? { ...rawParsedUnitPrice } : null;
    let parsedTotal = rawParsedTotal ? { ...rawParsedTotal } : null;
    let parsedGenericPrice = rawParsedGenericPrice ? { ...rawParsedGenericPrice } : null;

    let txDraftId = currentDraftId;
    let txDraftRef = null;
    let txIsAppApprovalBlocked = false;
    let existingData = null;

    // Exigir sessionId atual para reutilizar rascunho existente
    if (txDraftId && sessionId) {
      const ref = db.collection(COLLECTIONS.DRAFTS).doc(txDraftId);
      const snap = await transaction.get(ref);
      if (snap.exists) {
        const d = (typeof snap.data === 'function' ? snap.data() : snap.data) || {};
        const now = Date.now();
        const expTime = d.expiresAt?.toDate ? d.expiresAt.toDate().getTime() : 0;
        const isSameUser = d.uid === identity.uid;
        const isSameBinding = !d.bindingKey || d.bindingKey === identity.bindingKey;
        const isSameEnv = !d.environment || d.environment === config.environment;
        const isSameSession = d.sessionId === sessionId;

        if (isSameUser && isSameBinding && isSameEnv && isSameSession) {
          if (d.state === 'awaiting_app_approval') {
            txIsAppApprovalBlocked = true;
            return {
              draft: null,
              draftId: txDraftId,
              draftRef: ref,
              isAppApprovalBlocked: true,
              transactionError: null,
            };
          }
          const isAllowedState = d.state === 'collecting' || d.state === 'awaiting_confirmation';
          if (expTime > now && isAllowedState) {
            existingData = { ...d };
            txDraftRef = ref;
          }
        }
      }
    }

    if (!existingData) {
      if (txIsAppApprovalBlocked) {
        return {
          draft: null,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: true,
          transactionError: null,
        };
      }
      if (intentName === 'ProvideCustomerOnlyIntent') {
        return {
          draft: null,
          draftId: null,
          draftRef: null,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Não encontrei nenhum pedido em andamento. Para começar, diga criar pedido.',
            reprompt: 'Diga criar pedido para começar.',
            shouldEndSession: false,
          },
        };
      }
      if (intentName === 'AMAZON.YesIntent') {
        return {
          draft: null,
          draftId: null,
          draftRef: null,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Não encontrei nenhum pedido em andamento para confirmar. Para começar, diga criar pedido.',
            reprompt: 'Diga criar pedido para começar.',
            shouldEndSession: true,
          },
        };
      }
      // Criar novo rascunho
      const newDraftId = crypto.randomUUID();
      txDraftId = newDraftId;
      txDraftRef = db.collection(COLLECTIONS.DRAFTS).doc(newDraftId);
      const now = Date.now();
      const ttlMs = (config.draftTtlMinutes || 15) * 60 * 1000;
      const expiresAt = new Date(now + ttlMs);
      existingData = {
        draftId: newDraftId,
        sessionId,
        uid: identity.uid,
        bindingKey: identity.bindingKey,
        personId: identity.personId,
        mode: identity.mode || 'voice_confirm',
        environment: config.environment,
        customer: null,
        product: null,
        quantity: null,
        deliveryDate: null,
        price: null,
        pricingMode: null,
        unitPriceCents: null,
        totalPriceCents: null,
        pendingPriceCents: null,
        pendingConflict: null,
        pendingField: null,
        expectedInput: null,
        catalogProductId: null,
        suggestedPriceCents: null,
        suggestedProductName: null,
        priceSource: null,
        notes: null,
        revision: 1,
        state: 'collecting',
        fallbackCount: 0,
        voiceConfirmationFailures: 0,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    } else {
      if (existingData.pendingConflict === undefined) existingData.pendingConflict = null;
      if (existingData.pendingField === undefined) existingData.pendingField = null;
      if (existingData.expectedInput === undefined) existingData.expectedInput = null;
      if (existingData.catalogProductId === undefined) existingData.catalogProductId = null;
      if (existingData.suggestedPriceCents === undefined) existingData.suggestedPriceCents = null;
      if (existingData.suggestedProductName === undefined) existingData.suggestedProductName = null;
      if (existingData.priceSource === undefined) existingData.priceSource = null;
      // Compatibilidade retroativa para rascunhos legados
      if (!existingData.pricingMode && typeof existingData.price === 'number') {
        existingData.pricingMode = 'total';
        existingData.totalPriceCents = Math.round(existingData.price * 100);
        existingData.unitPriceCents = null;
        existingData.pendingPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
      }
    }

    const wasAwaitingConfirmation = existingData.state === 'awaiting_confirmation';

    // Validações de entrada que persistem pendingField no rascunho antes de responder erro
    if (dateValidationError) {
      existingData.pendingField = 'deliveryDate';
      existingData.expectedInput = 'deliveryDate';
      existingData.state = 'collecting';
      existingData.revision = (existingData.revision || 1) + 1;
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(txDraftRef, existingData, { merge: true });
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: dateValidationError,
          reprompt: 'Qual é a data de entrega desejada?',
        },
      };
    }

    if (unitPriceValidationError) {
      existingData.pendingField = 'unitPrice';
      existingData.expectedInput = 'unitPrice';
      existingData.state = 'collecting';
      existingData.revision = (existingData.revision || 1) + 1;
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(txDraftRef, existingData, { merge: true });
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: unitPriceValidationError,
          reprompt: 'Qual é o valor unitário de cada item?',
        },
      };
    }

    if (totalValidationError) {
      existingData.pendingField = 'total';
      existingData.expectedInput = 'totalPrice';
      existingData.state = 'collecting';
      existingData.revision = (existingData.revision || 1) + 1;
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(txDraftRef, existingData, { merge: true });
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: totalValidationError,
          reprompt: 'Qual é o valor total do pedido?',
        },
      };
    }

    if (genericPriceValidationError) {
      if (existingData.pendingField === 'unitPrice') {
        existingData.expectedInput = 'unitPrice';
      } else {
        existingData.expectedInput = 'totalPrice';
      }
      existingData.state = 'collecting';
      existingData.revision = (existingData.revision || 1) + 1;
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(txDraftRef, existingData, { merge: true });
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: genericPriceValidationError,
          reprompt: existingData.pendingField === 'unitPrice' ? 'Qual é o preço de cada unidade?' : 'Qual é o valor total do pedido?',
        },
      };
    }

    let updated = false;

    let handledSuggestedPrice = false;
    // Ações para YesIntent e NoIntent
    if (intentName === 'AMAZON.YesIntent') {
      const isSuggested =
        existingData.expectedInput === 'suggestedPrice' &&
        existingData.suggestedPriceCents !== null &&
        existingData.suggestedPriceCents !== undefined;
      if (isSuggested) {
        // Revalidação do produto do catálogo se catalogProductId existir
        if (existingData.catalogProductId && db) {
          const prodRef = db.collection(COLLECTIONS.PRODUCTS || 'products').doc(existingData.catalogProductId);
          const prodSnap = await transaction.get(prodRef);
          if (!prodSnap || !prodSnap.exists) {
            existingData.catalogProductId = null;
            existingData.suggestedPriceCents = null;
            existingData.suggestedProductName = null;
            existingData.expectedInput = 'totalPrice';
            existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            transaction.set(txDraftRef, existingData, { merge: true });
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'O item sugerido do catálogo não está mais disponível. Por favor, diga o valor do pedido.',
                reprompt: 'Qual é o valor do pedido?',
              },
            };
          }
          const prodData = (typeof prodSnap.data === 'function' ? prodSnap.data() : prodSnap.data) || {};
          if (prodData.userId !== identity.uid) {
            existingData.catalogProductId = null;
            existingData.suggestedPriceCents = null;
            existingData.suggestedProductName = null;
            existingData.expectedInput = 'totalPrice';
            existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            transaction.set(txDraftRef, existingData, { merge: true });
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'Não foi possível confirmar o item do catálogo. Por favor, diga o valor do pedido.',
                reprompt: 'Qual é o valor do pedido?',
              },
            };
          }
          const hasValidUnitPrice =
            typeof prodData.unitPrice === 'number' &&
            Number.isFinite(prodData.unitPrice) &&
            prodData.unitPrice >= 0 &&
            prodData.unitPrice <= 10000;

          if (!hasValidUnitPrice) {
            // Preço ausente ou inválido no catálogo: não usar sugestão antiga
            existingData.catalogProductId = null;
            existingData.suggestedPriceCents = null;
            existingData.suggestedProductName = null;
            existingData.expectedInput = 'totalPrice';
            existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            transaction.set(txDraftRef, existingData, { merge: true });
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'O item do catálogo não possui um preço válido configurado. Por favor, diga o valor do pedido.',
                reprompt: 'Qual é o valor do pedido?',
              },
            };
          }

          const currentCents = Math.round(prodData.unitPrice * 100);
          if (currentCents !== existingData.suggestedPriceCents) {
            // Preço mudou no catálogo entre sugestão e confirmação (inclusive para R$ 0 / gratuito)
            existingData.suggestedPriceCents = currentCents;
            existingData.suggestedProductName = prodData.name || existingData.suggestedProductName;
            existingData.expectedInput = 'suggestedPrice';
            existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            transaction.set(txDraftRef, existingData, { merge: true });
            const sStr = formatCurrencyPtBr(prodData.unitPrice);
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: `O valor de ${sanitizeSpeech(prodData.name || existingData.product)} no catálogo foi alterado para ${sStr} cada. Deseja usar esse novo valor?`,
                reprompt: `Deseja usar o novo valor de ${sStr} cada? Diga sim para confirmar ou diga outro valor.`,
              },
            };
          }
        }

        existingData.pricingMode = 'unit';
        existingData.unitPriceCents = existingData.suggestedPriceCents;
        existingData.priceSource = 'catalog';
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.expectedInput = null;
        const effQty = incomingUpdates.quantity || existingData.quantity;
        if (typeof effQty === 'number' && effQty > 0) {
          const tot = effQty * existingData.unitPriceCents;
          if (tot > 1000000) {
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'O valor total do pedido com esse preço excede o limite máximo permitido de dez mil reais.',
                reprompt: 'Qual é o valor do pedido?',
              },
            };
          }
          existingData.totalPriceCents = tot;
          existingData.price = tot / 100;
        }
        updated = true;
        handledSuggestedPrice = true;
      } else {
        return {
          draft: existingData,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: false,
          transactionError: null,
          handledSuggestedPrice: false,
        };
      }
    }

    if (intentName === 'AMAZON.NoIntent') {
      const isSuggested =
        existingData.expectedInput === 'suggestedPrice' &&
        existingData.suggestedPriceCents !== null &&
        existingData.suggestedPriceCents !== undefined;
      if (isSuggested) {
        existingData.catalogProductId = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.expectedInput = 'totalPrice';
        existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(txDraftRef, existingData, { merge: true });
        return {
          draft: existingData,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Qual é o valor do pedido?',
            reprompt: 'Diga o valor do pedido em reais.',
          },
        };
      }
      if (wasAwaitingConfirmation) {
        existingData.state = 'collecting';
        existingData.expectedInput = null;
        existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(txDraftRef, existingData, { merge: true });
        return {
          draft: existingData,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Qual dado você deseja corrigir? Diga o cliente, produto, quantidade, entrega ou valor.',
            reprompt: 'O que deseja alterar?',
          },
        };
      }
      // Se não estava em confirmação, "Não" cancela o pedido
      existingData.state = 'cancelled';
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      transaction.set(txDraftRef, existingData, { merge: true });
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: 'Pedido cancelado. Até logo.',
          shouldEndSession: true,
        },
      };
    }

    // Resolução de esclarecimento pendente via ClarifyPriceUnitIntent ou ClarifyPriceTotalIntent
    if (intentName === 'ClarifyPriceUnitIntent') {
      const hasPending = Boolean(
        existingData.pendingConflict ||
        (existingData.pendingPriceCents !== null && existingData.pendingPriceCents !== undefined)
      );
      if (!hasPending) {
        existingData.expectedInput = 'totalPrice';
        existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(txDraftRef, existingData, { merge: true });
        return {
          draft: existingData,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Não há nenhum valor aguardando definição de unitário ou total. Por favor, diga o valor do pedido.',
            reprompt: 'Qual é o valor do pedido?',
          },
        };
      }

      const effQty = incomingUpdates.quantity || existingData.quantity;
      if (existingData.pendingConflict) {
        existingData.pricingMode = 'unit';
        existingData.unitPriceCents = existingData.pendingConflict.unitPriceCents;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.pendingPriceCents = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
        if (typeof effQty === 'number' && effQty > 0) {
          const tot = effQty * existingData.unitPriceCents;
          if (tot > 1000000) {
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'O valor total do pedido excede o limite máximo permitido de dez mil reais.',
                reprompt: 'Qual é a quantidade de itens?',
              },
            };
          }
          existingData.totalPriceCents = tot;
          existingData.price = tot / 100;
        } else {
          existingData.totalPriceCents = null;
          existingData.price = null;
        }
        updated = true;
      } else if (existingData.pendingPriceCents !== null && existingData.pendingPriceCents !== undefined) {
        existingData.pricingMode = 'unit';
        existingData.unitPriceCents = existingData.pendingPriceCents;
        existingData.pendingPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
        if (typeof effQty === 'number' && effQty > 0) {
          const tot = effQty * existingData.unitPriceCents;
          if (tot > 1000000) {
            return {
              draft: existingData,
              draftId: txDraftId,
              draftRef: txDraftRef,
              isAppApprovalBlocked: false,
              transactionError: {
                speech: 'O valor total do pedido excede o limite máximo permitido de dez mil reais.',
                reprompt: 'Qual é a quantidade de itens?',
              },
            };
          }
          existingData.totalPriceCents = tot;
          existingData.price = tot / 100;
        } else {
          existingData.totalPriceCents = null;
          existingData.price = null;
        }
        updated = true;
      }
    } else if (intentName === 'ClarifyPriceTotalIntent') {
      const hasPending = Boolean(
        existingData.pendingConflict ||
        (existingData.pendingPriceCents !== null && existingData.pendingPriceCents !== undefined)
      );
      if (!hasPending) {
        existingData.expectedInput = 'totalPrice';
        existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(txDraftRef, existingData, { merge: true });
        return {
          draft: existingData,
          draftId: txDraftId,
          draftRef: txDraftRef,
          isAppApprovalBlocked: false,
          transactionError: {
            speech: 'Não há nenhum valor aguardando definição de unitário ou total. Por favor, diga o valor do pedido.',
            reprompt: 'Qual é o valor do pedido?',
          },
        };
      }

      if (existingData.pendingConflict) {
        existingData.pricingMode = 'total';
        existingData.totalPriceCents = existingData.pendingConflict.totalPriceCents;
        existingData.price = existingData.pendingConflict.totalPriceCents / 100;
        existingData.unitPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.pendingPriceCents = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
        updated = true;
      } else if (existingData.pendingPriceCents !== null && existingData.pendingPriceCents !== undefined) {
        existingData.pricingMode = 'total';
        existingData.totalPriceCents = existingData.pendingPriceCents;
        existingData.price = existingData.pendingPriceCents / 100;
        existingData.unitPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.pendingPriceCents = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
        updated = true;
      }
    }

    // Aplicação de contexto em valor sem qualificador (Fase 1 / Regras 1 e 2)
    // O rascunho autorizado no Firestore é a autoridade única de contexto.
    const activePending = existingData.pendingField || null;
    const activeExpected = existingData.expectedInput || null;

    // Resolução baseada no expectedInput persistido no banco para quantidade
    if (!incomingUpdates.quantity && activeExpected === 'quantity') {
      if (parsedGenericPrice && parsedGenericPrice.cents % 100 === 0 && !unitPriceSlot && !totalSlot) {
        const qNum = parsedGenericPrice.cents / 100;
        if (qNum >= 1 && qNum <= 10000) {
          incomingUpdates.quantity = qNum;
          parsedGenericPrice = null;
          existingData.expectedInput = null;
        }
      }
    }

    // Se o banco espera preço (unitário ou total) e a Alexa capturou um número avulso no slot de quantidade
    if (activeExpected === 'totalPrice' && incomingUpdates.quantity && !parsedUnitPrice && !parsedTotal && !parsedGenericPrice) {
      parsedTotal = { cents: incomingUpdates.quantity * 100, price: incomingUpdates.quantity };
      delete incomingUpdates.quantity;
      existingData.expectedInput = null;
    } else if (activeExpected === 'unitPrice' && incomingUpdates.quantity && !parsedUnitPrice && !parsedTotal && !parsedGenericPrice) {
      parsedUnitPrice = { cents: incomingUpdates.quantity * 100, price: incomingUpdates.quantity };
      delete incomingUpdates.quantity;
      existingData.expectedInput = null;
    }

    // Resolução contextual de cliente vs produto:
    // Se o sistema está esperando o cliente (expectedInput === 'customer') e recebeu texto em product (ex: usuário disse apenas o nome),
    // remapa para customer para evitar que o nome do cliente seja gravado como produto e o cliente continue vazio.
    if (!incomingUpdates.customer && activeExpected === 'customer' && incomingUpdates.product) {
      incomingUpdates.customer = incomingUpdates.product;
      delete incomingUpdates.product;
      existingData.expectedInput = null;
    }
    // Vice-versa: se esperando produto e recebeu customer sem produto
    if (!incomingUpdates.product && activeExpected === 'product' && incomingUpdates.customer) {
      incomingUpdates.product = incomingUpdates.customer;
      delete incomingUpdates.customer;
      existingData.expectedInput = null;
    }

    if (parsedTotal) {
      // Usuário forneceu total explicitamente ("no total"): sempre tem precedência e pode trocar o modo
      existingData.pendingField = null;
      existingData.expectedInput = null;
      existingData.suggestedPriceCents = null;
      existingData.suggestedProductName = null;
      existingData.priceSource = 'user';
    } else if (parsedUnitPrice) {
      // Usuário forneceu unitário explicitamente ("cada"): limpa pendingField
      existingData.pendingField = null;
      existingData.expectedInput = null;
      existingData.suggestedPriceCents = null;
      existingData.suggestedProductName = null;
      existingData.priceSource = 'user';
    } else if (parsedGenericPrice) {
      if (activePending === 'unitPrice' || activeExpected === 'unitPrice') {
        parsedUnitPrice = parsedGenericPrice;
        parsedGenericPrice = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
      } else if (activePending === 'total' || activeExpected === 'totalPrice') {
        parsedTotal = parsedGenericPrice;
        parsedGenericPrice = null;
        existingData.pendingField = null;
        existingData.expectedInput = null;
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.priceSource = 'user';
      }
    }

    // Processar preços recebidos neste turno
    if (parsedUnitPrice && parsedTotal) {
      const effQty = incomingUpdates.quantity || existingData.quantity;
      if (typeof effQty === 'number' && effQty > 0) {
        const expectedTot = effQty * parsedUnitPrice.cents;
        if (expectedTot === parsedTotal.cents) {
          existingData.pricingMode = 'unit';
          existingData.unitPriceCents = parsedUnitPrice.cents;
          existingData.totalPriceCents = parsedTotal.cents;
          existingData.price = parsedTotal.cents / 100;
          existingData.pendingPriceCents = null;
          existingData.pendingConflict = null;
          existingData.pendingField = null;
          existingData.expectedInput = null;
          updated = true;
        } else {
          // Conflito entre unitário e total: persiste ambas as alternativas e aguarda esclarecimento (P1)
          existingData.pendingConflict = {
            unitPriceCents: parsedUnitPrice.cents,
            totalPriceCents: parsedTotal.cents,
          };
          existingData.pendingField = 'conflict';
          existingData.expectedInput = 'priceBasis';
          existingData.pendingPriceCents = null;
          existingData.pricingMode = null;
          existingData.unitPriceCents = null;
          existingData.totalPriceCents = null;
          existingData.price = null;
          existingData.state = 'collecting';
          updated = true;
        }
      } else {
        existingData.pendingConflict = {
          unitPriceCents: parsedUnitPrice.cents,
          totalPriceCents: parsedTotal.cents,
        };
        existingData.pendingField = 'conflict';
        existingData.expectedInput = 'priceBasis';
        existingData.pendingPriceCents = null;
        existingData.pricingMode = null;
        existingData.unitPriceCents = null;
        existingData.totalPriceCents = null;
        existingData.price = null;
        existingData.state = 'collecting';
        updated = true;
      }
    } else if (parsedUnitPrice) {
      existingData.pricingMode = 'unit';
      existingData.unitPriceCents = parsedUnitPrice.cents;
      existingData.pendingPriceCents = null;
      existingData.pendingConflict = null;
      existingData.pendingField = null;
      existingData.expectedInput = null;
      const effQty = incomingUpdates.quantity || existingData.quantity;
      if (typeof effQty === 'number' && effQty > 0) {
        const tot = effQty * parsedUnitPrice.cents;
        if (tot > 1000000) {
          return {
            draft: existingData,
            draftId: txDraftId,
            draftRef: txDraftRef,
            isAppApprovalBlocked: false,
            transactionError: {
              speech: 'O valor total do pedido excede o limite máximo permitido de dez mil reais.',
              reprompt: 'Qual é o valor unitário?',
            },
          };
        }
        existingData.totalPriceCents = tot;
        existingData.price = tot / 100;
      } else {
        existingData.totalPriceCents = null;
        existingData.price = null;
      }
      updated = true;
    } else if (parsedTotal) {
      existingData.pricingMode = 'total';
      existingData.totalPriceCents = parsedTotal.cents;
      existingData.price = parsedTotal.cents / 100;
      existingData.unitPriceCents = null;
      existingData.pendingPriceCents = null;
      existingData.pendingConflict = null;
      existingData.pendingField = null;
      existingData.expectedInput = null;
      updated = true;
    } else if (parsedGenericPrice) {
      existingData.pendingPriceCents = parsedGenericPrice.cents;
      existingData.pricingMode = null;
      existingData.unitPriceCents = null;
      existingData.totalPriceCents = null;
      existingData.price = null;
      existingData.suggestedPriceCents = null;
      existingData.suggestedProductName = null;
      existingData.pendingConflict = null;
      existingData.pendingField = null;
      existingData.expectedInput = 'priceBasis';
      updated = true;
    }

    // Processar quantidade e recálculo no modo unitário
    if (incomingUpdates.quantity && incomingUpdates.quantity !== existingData.quantity) {
      const newQty = incomingUpdates.quantity;
      existingData.quantity = newQty;
      updated = true;
      if (existingData.pricingMode === 'unit' && typeof existingData.unitPriceCents === 'number') {
        const tot = newQty * existingData.unitPriceCents;
        if (tot > 1000000) {
          return {
            draft: existingData,
            draftId: txDraftId,
            draftRef: txDraftRef,
            isAppApprovalBlocked: false,
            transactionError: {
              speech: 'A quantidade informada faz o total exceder o limite de dez mil reais.',
              reprompt: 'Qual é a quantidade de itens?',
            },
          };
        }
        existingData.totalPriceCents = tot;
        existingData.price = tot / 100;
      }
    }

    // Processar alteração de produto e catálogo (Fase 4)
    if (incomingUpdates.product) {
      if (existingData.product && existingData.product !== incomingUpdates.product) {
        // Caso produto mude, não carregar silenciosamente preço sugerido do produto anterior (Fase 2)
        existingData.suggestedPriceCents = null;
        existingData.suggestedProductName = null;
        existingData.catalogProductId = null;
        if (existingData.priceSource === 'catalog') {
          existingData.price = null;
          existingData.pricingMode = null;
          existingData.unitPriceCents = null;
          existingData.totalPriceCents = null;
          existingData.priceSource = null;
        }
      }

      if (catalogMatch) {
        existingData.catalogProductId = catalogMatch.id;
        existingData.product = catalogMatch.name;
        // Só sugere preço do catálogo se usuário NÃO tiver informado preço
        if (!parsedUnitPrice && !parsedTotal && !parsedGenericPrice && existingData.price === null && catalogMatch.unitPrice > 0) {
          existingData.suggestedPriceCents = Math.round(Number(catalogMatch.unitPrice) * 100);
          existingData.suggestedProductName = catalogMatch.name;
          existingData.expectedInput = 'suggestedPrice';
        }
      } else {
        existingData.catalogProductId = null;
        existingData.product = incomingUpdates.product;
      }
      updated = true;
    }

    // Mesclar demais slots (customer, deliveryDate)
    for (const [k, v] of Object.entries(incomingUpdates)) {
      if (k !== 'quantity' && k !== 'product' && existingData[k] !== v) {
        existingData[k] = v;
        updated = true;
      }
    }

    if (incomingUpdates.deliveryDate && existingData.pendingField === 'deliveryDate') {
      existingData.pendingField = null;
    }
    if (incomingUpdates.customer && existingData.pendingField === 'customer') {
      existingData.pendingField = null;
    }
    if (incomingUpdates.product && existingData.pendingField === 'product') {
      existingData.pendingField = null;
    }
    if (incomingUpdates.quantity && existingData.pendingField === 'quantity') {
      existingData.pendingField = null;
    }

    // Acknowledgment de correção quando o rascunho já estava aguardando confirmação (Fase 3)
    let correctionAcknowledgment = null;
    const isCorrection = (wasAwaitingConfirmation || (existingData.customer && existingData.product && existingData.deliveryDate && existingData.price !== null)) && updated;
    if (isCorrection) {
      if (incomingUpdates.quantity) {
        const uTotStr = formatCurrencyPtBr(existingData.price);
        correctionAcknowledgment = `${existingData.quantity} ${existingData.quantity === 1 ? 'unidade' : 'unidades'}, total de ${uTotStr}. `;
      } else if (incomingUpdates.customer) {
        correctionAcknowledgment = `Cliente alterado para ${existingData.customer}. `;
      } else if (incomingUpdates.product) {
        correctionAcknowledgment = `Produto alterado para ${existingData.product}. `;
      } else if (parsedUnitPrice) {
        const uStr = formatCurrencyPtBr(existingData.unitPriceCents / 100);
        const uTotStr = formatCurrencyPtBr(existingData.price);
        correctionAcknowledgment = `Alterado para ${uStr} cada, total de ${uTotStr}. `;
      } else if (parsedTotal) {
        const uTotStr = formatCurrencyPtBr(existingData.price);
        correctionAcknowledgment = `Alterado para total de ${uTotStr}. `;
      } else if (incomingUpdates.deliveryDate) {
        correctionAcknowledgment = `Entrega alterada para ${formatDatePtBr(existingData.deliveryDate)}. `;
      }
    }

    if (updated) {
      existingData.revision = (existingData.revision || 1) + 1;
      existingData.state = 'collecting';
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    // Se todos os campos estiverem preenchidos sem pendências, avançar para awaiting_confirmation
    const isComplete =
      existingData.customer &&
      existingData.product &&
      existingData.quantity &&
      existingData.deliveryDate &&
      existingData.price !== null &&
      existingData.price !== undefined &&
      (existingData.pendingPriceCents === null || existingData.pendingPriceCents === undefined) &&
      !existingData.pendingConflict &&
      !existingData.pendingField &&
      (existingData.suggestedPriceCents === null || existingData.suggestedPriceCents === undefined);

    if (isComplete && (existingData.state === 'collecting' || updated)) {
      existingData.state = 'awaiting_confirmation';
      existingData.expectedInput = 'confirmation';
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    } else if (existingData.state === 'collecting') {
      // Determinar e persistir atomicamente o próximo campo esperado no Firestore (P1.3)
      existingData.expectedInput = determineNextExpectedInput(existingData);
    }

    transaction.set(txDraftRef, existingData, { merge: true });

    return {
      draft: existingData,
      draftId: txDraftId,
      draftRef: txDraftRef,
      isAppApprovalBlocked: false,
      transactionError: null,
      correctionAcknowledgment,
      handledSuggestedPrice,
    };
  });

  const { draft, draftId, draftRef, isAppApprovalBlocked, transactionError, correctionAcknowledgment, handledSuggestedPrice } = txResult || {};

  if (isAppApprovalBlocked) {
    return {
      speech: 'Este pedido já foi enviado para aprovação no aplicativo e não pode ser alterado por voz. Acesse o aplicativo Luisices para conferir.',
      reprompt: 'Acesse o aplicativo Luisices para conferir o pedido.',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  if (transactionError) {
    const endSession = Boolean(transactionError.shouldEndSession);
    return {
      speech: transactionError.speech,
      reprompt: transactionError.reprompt,
      shouldEndSession: endSession,
      sessionAttributes: endSession ? {} : {
        draftId,
        revision: draft ? draft.revision : (sessionAttrs.revision || 1),
        personId: identity.personId,
        pendingField: draft?.pendingField || sessionAttrs.pendingField || null,
        expectedInput: draft?.expectedInput || sessionAttrs.expectedInput || null,
      },
    };
  }

  // 6. Confirmação do resumo (AMAZON.YesIntent / AMAZON.NoIntent)
  if (intentName === 'AMAZON.YesIntent' && !handledSuggestedPrice) {
    if (
      draft.state !== 'awaiting_confirmation' ||
      draft.pendingField ||
      draft.pendingConflict ||
      (draft.pendingPriceCents !== null && draft.pendingPriceCents !== undefined)
    ) {
      return {
        speech: 'Ainda faltam informações para concluir o pedido. O que deseja cadastrar?',
        reprompt: 'Diga os dados do pedido.',
        shouldEndSession: false,
        sessionAttributes: {
          draftId,
          revision: draft.revision,
          personId: identity.personId,
          expectedInput: draft.expectedInput || null,
          pendingField: draft.pendingField || null,
        },
      };
    }

    // P1: Se a requisição recuperou o rascunho diretamente (sem draftId prévio nos sessionAttributes)
    // NUNCA fazer commit direto. Reapresenta o resumo verbal completo e devolve a sessão sem commit.
    if (isDirectRecovery) {
      const summary = buildConfirmationSpeech(draft, identity, config);
      return {
        speech: `Você tem um pedido em andamento. ${summary}`,
        reprompt: 'Confirma o pedido? Diga: pode confirmar. Ou diga não para alterar.',
        shouldEndSession: false,
        sessionAttributes: {
          draftId,
          revision: draft.revision,
          personId: identity.personId,
          expectedInput: 'confirmation',
        },
      };
    }

    // Biometria vocal no momento da confirmação final.
    const physicalPersonId =
      envelope?.context?.System?.person?.personId ||
      envelope?.session?.System?.person?.personId ||
      null;

    // Se uma pessoa física diferente for detectada na fala atual, rejeita imediatamente por segurança
    if (physicalPersonId && draft.personId && draft.personId !== physicalPersonId) {
      logAlexaDiagnostic({
        stage: 'confirmation',
        intent: intentName,
        sessionId: sessionId || null,
        physicalPersonPresent: true,
        sessionPersonPresent: Boolean(sessionAttrs?.personId),
        comparisonResult: 'diferente',
        outcome: 'rejeitado',
      });
      return {
        speech: 'A pessoa que está confirmando não é a mesma que iniciou o pedido. Criação cancelada por segurança.',
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }

    // Validação de consistência da revisão entre sessão e rascunho:
    // Se a revisão não veio nos sessionAttributes ou se for divergente,
    // reapresenta o resumo atualizado antes de aceitar qualquer gravação (achado 6).
    if (sessionAttrs.revision === undefined || sessionAttrs.revision !== draft.revision) {
      const updatedSummary = buildConfirmationSpeech(draft, identity, config);
      return {
        speech: `Os dados do pedido foram atualizados. ${updatedSummary}`,
        reprompt: 'Confirma o pedido com os dados atualizados? Diga: pode confirmar. Ou diga não para alterar.',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'confirmation' },
      };
    }

    const envLabel = config.environment === 'prod' ? 'produção' : 'teste';

    // Modo 2: Aprovação pendente no aplicativo (transição atômica condicional)
    // Preserva encaminhamento normal para aprovação sem exigir novas tentativas de voz
    if (draft.mode === 'app_approval') {
      let transitioned = false;
      try {
        transitioned = await runTx(async (transaction) => {
          const snap = await transaction.get(draftRef);
          if (snap.exists) {
            const dData = (typeof snap.data === 'function' ? snap.data() : snap.data) || {};
            const isOwner = dData.uid === identity.uid;
            const isSameBinding = !dData.bindingKey || dData.bindingKey === identity.bindingKey;
            const isSameEnv = !dData.environment || dData.environment === config.environment;
            const isSameRevision = dData.revision === draft.revision;
            const isAwaiting = dData.state === 'awaiting_confirmation';

            const now = Date.now();
            const expiresAt = dData.expiresAt?.toDate ? dData.expiresAt.toDate().getTime() : (typeof dData.expiresAt === 'number' ? dData.expiresAt : 0);
            const isExpired = expiresAt > 0 && expiresAt <= now;

            if (isOwner && isSameBinding && isSameEnv && isSameRevision && isAwaiting && !isExpired) {
              transaction.update(draftRef, {
                sessionId: sessionId || dData.sessionId,
                state: 'awaiting_app_approval',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              return true;
            }
          }
          return false;
        });
      } catch (err) {
        console.warn('[AlexaDialog] Erro ao transicionar para app_approval:', err?.message || err);
        transitioned = false;
      }

      logAlexaDiagnostic({
        stage: 'confirmation',
        intent: intentName,
        sessionId: sessionId || null,
        physicalPersonPresent: Boolean(physicalPersonId),
        sessionPersonPresent: Boolean(sessionAttrs?.personId),
        comparisonResult: !physicalPersonId ? 'ausente' : (draft.personId === physicalPersonId ? 'correspondente' : 'diferente'),
        outcome: transitioned ? 'encaminhado_app' : 'falha_transicao',
      });

      if (!transitioned) {
        return {
          speech: 'O pedido não pôde ser enviado para aprovação pois foi alterado ou cancelado. Por favor, verifique no aplicativo.',
          shouldEndSession: true,
          sessionAttributes: {},
        };
      }

      const isApl = supportsApl(envelope);
      const directives = isApl
        ? [
            buildOrderCardAplDirective({
              draftId: draft.draftId,
              revision: draft.revision,
              customer: draft.customer,
              product: draft.product,
              quantity: draft.quantity,
              deliveryDate: formatDatePtBr(draft.deliveryDate),
              totalPrice: formatCurrencyPtBr(draft.price),
              statusLabel: 'Aguardando Aprovação no App',
              envLabel,
              showActions: false,
            }),
          ]
        : undefined;

      return {
        speech: `Pedido preparado no seu espaço de ${envLabel}. Acesse o Luisices no aplicativo para conferir e aprovar a gravação definitiva.`,
        shouldEndSession: true,
        sessionAttributes: {},
        directives,
      };
    }

    // Política de 2 novas tentativas com estado persistido (P1):
    // Sem biometria física na fala atual, oferece até 2 novas tentativas (3 tentativas no total).
    // Na 3ª resposta afirmativa sem biometria, encaminha atomicamente para aprovação no aplicativo.
    if (!physicalPersonId) {
      let txResult = { status: 'error' };
      try {
        txResult = await runTx(async (transaction) => {
          const snap = await transaction.get(draftRef);
          if (snap.exists) {
            const dData = (typeof snap.data === 'function' ? snap.data() : snap.data) || {};
            const isOwner = dData.uid === identity.uid;
            const isSameBinding = !dData.bindingKey || dData.bindingKey === identity.bindingKey;
            const isSameEnv = !dData.environment || dData.environment === config.environment;
            const isSameRevision = dData.revision === draft.revision;
            const isAwaiting = dData.state === 'awaiting_confirmation';

            const now = Date.now();
            const expiresAt = dData.expiresAt?.toDate ? dData.expiresAt.toDate().getTime() : (typeof dData.expiresAt === 'number' ? dData.expiresAt : 0);
            const isExpired = expiresAt > 0 && expiresAt <= now;

            if (isOwner && isSameBinding && isSameEnv && isSameRevision && isAwaiting && !isExpired) {
              const rawFailures = dData.voiceConfirmationFailures;
              let currentFailures = 0;
              if (typeof rawFailures === 'number' && Number.isFinite(rawFailures)) {
                currentFailures = Math.max(0, Math.floor(rawFailures));
              } else if (rawFailures !== undefined && rawFailures !== null) {
                // Estado malformado não pode liberar tentativas ilimitadas; fail-closed no limite
                currentFailures = 2;
              }

              if (currentFailures < 2) {
                const nextFailures = currentFailures + 1;
                transaction.update(draftRef, {
                  sessionId: sessionId || dData.sessionId,
                  voiceConfirmationFailures: nextFailures,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return { status: 'retry', failures: nextFailures };
              }

              // 3ª tentativa afirmativa sem personId: transição atômica para awaiting_app_approval
              transaction.update(draftRef, {
                sessionId: sessionId || dData.sessionId,
                voiceConfirmationFailures: currentFailures + 1,
                state: 'awaiting_app_approval',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              return { status: 'transitioned_app', failures: currentFailures + 1 };
            }
          }
          return { status: 'aborted' };
        });
      } catch (err) {
        console.warn('[AlexaDialog] Erro na transação de confirmação sem personId:', err?.message || err);
        txResult = { status: 'error' };
      }

      if (txResult.status === 'retry') {
        logAlexaDiagnostic({
          stage: 'confirmation',
          intent: intentName,
          sessionId: sessionId || null,
          physicalPersonPresent: false,
          sessionPersonPresent: Boolean(sessionAttrs?.personId),
          comparisonResult: 'ausente',
          failureAttempt: txResult.failures,
          outcome: 'nova_tentativa',
        });
        return {
          speech: 'Não consegui reconhecer sua voz nesta resposta. Diga: pode confirmar.',
          reprompt: 'Para confirmar o pedido, diga: pode confirmar.',
          shouldEndSession: false,
          sessionAttributes: {
            draftId,
            revision: draft.revision,
            personId: identity.personId,
            expectedInput: 'confirmation',
          },
        };
      }

      if (txResult.status === 'transitioned_app') {
        logAlexaDiagnostic({
          stage: 'confirmation',
          intent: intentName,
          sessionId: sessionId || null,
          physicalPersonPresent: false,
          sessionPersonPresent: Boolean(sessionAttrs?.personId),
          comparisonResult: 'ausente',
          failureAttempt: txResult.failures,
          outcome: 'encaminhado_app',
        });
        return {
          speech: 'Não reconheci sua voz com segurança na confirmação. Por segurança, o pedido foi enviado para aprovação no aplicativo Luisices.',
          shouldEndSession: true,
          sessionAttributes: {},
        };
      }

      logAlexaDiagnostic({
        stage: 'confirmation',
        intent: intentName,
        sessionId: sessionId || null,
        physicalPersonPresent: false,
        sessionPersonPresent: Boolean(sessionAttrs?.personId),
        comparisonResult: 'ausente',
        outcome: 'falha_transicao',
      });
      return {
        speech: 'Não reconheci sua voz com segurança e não foi possível enviar o pedido para aprovação no aplicativo. Por favor, tente novamente ou verifique no aplicativo.',
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }

    // Modo 1: Confirmação por voz direta com biometria correspondente
    if (draft.mode === 'voice_confirm') {
      try {
        const commitRes = await commitOrderFromDraft({
          draftId,
          callerPersonId: physicalPersonId,
          expectedRevision: draft.revision,
          callerUid: identity.uid,
          config,
          db,
          authService,
        });

        logAlexaDiagnostic({
          stage: 'confirmation',
          intent: intentName,
          sessionId: sessionId || null,
          physicalPersonPresent: true,
          sessionPersonPresent: Boolean(sessionAttrs?.personId),
          comparisonResult: 'correspondente',
          outcome: 'confirmado',
          orderNumber: commitRes.orderNumber,
          isReplay: Boolean(commitRes.isReplay),
        });

        const successSpeech = commitRes.isReplay
          ? `O pedido número ${commitRes.orderNumber} já havia sido registrado com sucesso.`
          : `Pedido criado no seu espaço de ${envLabel} com o número ${commitRes.orderNumber}.`;

        const isApl = supportsApl(envelope);
        const directives = isApl
          ? [
              buildOrderSuccessAplDirective({
                orderNumber: commitRes.orderNumber,
                customer: draft.customer,
                product: draft.product,
                quantity: draft.quantity,
                totalPrice: formatCurrencyPtBr(draft.price),
                deliveryDate: draft.deliveryDate ? formatDatePtBr(draft.deliveryDate) : '',
                envLabel,
              }),
            ]
          : undefined;

        return {
          speech: successSpeech,
          shouldEndSession: true,
          sessionAttributes: {},
          directives,
        };
      } catch (commitErr) {
        console.error('[AlexaDialog] Erro ao gravar pedido:', commitErr);
        logAlexaDiagnostic({
          stage: 'confirmation',
          intent: intentName,
          sessionId: sessionId || null,
          physicalPersonPresent: true,
          sessionPersonPresent: Boolean(sessionAttrs?.personId),
          comparisonResult: 'correspondente',
          outcome: 'erro_commit',
        });
        return {
          speech: 'Não foi possível confirmar o pedido neste momento. Por favor, verifique o quadro no aplicativo.',
          shouldEndSession: true,
          sessionAttributes: {},
        };
      }
    }
  }

  if (intentName === 'AMAZON.NoIntent') {
    if (draft.state === 'collecting') {
      return {
        speech: 'Qual dado você deseja corrigir? Diga o cliente, produto, quantidade, entrega ou valor.',
        reprompt: 'O que deseja alterar?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: null },
      };
    }
    return {
      speech: 'Pedido cancelado. Até logo.',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  // 7. Verificar se há pendência de correção ativa (prioridade máxima), conflito/ambiguidade ou campos obrigatórios faltando
  const nextPrompt = buildNextPromptForDraft(draft, identity, config, draftId);
  if (nextPrompt) {
    const isApl = supportsApl(envelope);
    if (isApl && !nextPrompt.directives) {
      nextPrompt.directives = [
        buildOrderCardAplDirective({
          draftId: draft.draftId,
          revision: draft.revision,
          customer: draft.customer || 'A informar',
          product: draft.product || 'A definir',
          quantity: draft.quantity || 1,
          deliveryDate: draft.deliveryDate ? formatDatePtBr(draft.deliveryDate) : 'A combinar',
          totalPrice: (draft.price !== null && draft.price !== undefined)
            ? formatCurrencyPtBr(draft.price)
            : (draft.pendingPriceCents ? formatCurrencyPtBr(draft.pendingPriceCents / 100) : 'A calcular'),
          statusLabel: 'Preenchendo Pedido',
          envLabel: config.environment === 'prod' ? 'produção' : 'teste',
          showActions: false,
        }),
      ];
    }
    return nextPrompt;
  }

  // 8. Todos os campos preenchidos -> Emitir resumo para confirmação
  if (draft.state !== 'awaiting_confirmation') {
    return {
      speech: 'Por favor, informe os dados pendentes para concluir o pedido.',
      reprompt: 'Diga o cliente, produto, quantidade, entrega ou valor.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: draft.expectedInput || 'collecting' },
    };
  }

  const confirmSpeech = buildConfirmationSpeech(draft, identity, config);
  const finalSpeech = correctionAcknowledgment ? `${correctionAcknowledgment}${confirmSpeech}` : confirmSpeech;
  const isApl = supportsApl(envelope);
  const directives = isApl
    ? [
        buildOrderCardAplDirective({
          draftId: draft.draftId,
          revision: draft.revision,
          customer: draft.customer,
          product: draft.product,
          quantity: draft.quantity,
          deliveryDate: formatDatePtBr(draft.deliveryDate),
          totalPrice: formatCurrencyPtBr(draft.price),
          statusLabel: 'Aguardando Confirmação',
          envLabel: config.environment === 'prod' ? 'produção' : 'teste',
          showActions: true,
        }),
      ]
    : undefined;

  return {
    speech: finalSpeech,
    reprompt: 'Você confirma o pedido? Diga: pode confirmar. Ou diga o que deseja corrigir.',
    shouldEndSession: false,
    sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId, expectedInput: 'confirmation' },
    directives,
  };
}

module.exports = {
  formatDatePtBr,
  formatCurrencyPtBr,
  parseAndValidateDeliveryDate,
  parseAndValidatePrice,
  parseAndValidatePriceToCents,
  normalizeText,
  searchUserCatalog,
  buildConfirmationSpeech,
  handleAlexaDialog,
  findClosestProductSuggestions,
  buildSuggestionPrompt,
};
