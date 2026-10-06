/**
 * Módulo de Processamento de Linguagem Natural (NLP) para o Backend da Alexa (Luisices).
 *
 * Responsável por:
 * 1. Interpretar e normalizar números cardinais e ordinais em português brasileiro.
 * 2. Tratar numerais compostos orais (ex: "vinte e oito", "20 e 8", "cento e cinquenta").
 * 3. Normalizar expressões monetárias e decimais ("X reais e Y centavos", "X reais", "X e Y", "X vírgula Y").
 * 4. Desambiguar contextualmente slots decompostos pelo NLU da Alexa (ex: {number: 20, cents: 8} -> 28).
 */

const PORTUGUESE_NUMBER_WORDS = {
  zero: 0,
  um: 1, uma: 1,
  dois: 2, duas: 2,
  tres: 3, três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14, catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100, cento: 100,
  duzentos: 200, duzentas: 200,
  trezentos: 300, trezentas: 300,
  quatrocentos: 400, quatrocentas: 400,
  quinhentos: 500, quinhentas: 500,
  seiscentos: 600, seiscentas: 600,
  setecentos: 700, setecentas: 700,
  oitocentos: 800, oitocentas: 800,
  novecentos: 900, novecentas: 900,
  mil: 1000,
};

const PORTUGUESE_ORDINAL_WORDS = {
  primeiro: 1, primeira: 1, '1o': 1, '1a': 1,
  segundo: 2, segunda: 2, '2o': 2, '2a': 2,
  terceiro: 3, terceira: 3, '3o': 3, '3a': 3,
  quarto: 4, quarta: 4, '4o': 4, '4a': 4,
  quinto: 5, quinta: 5, '5o': 5, '5a': 5,
  sexto: 6, sexta: 6, '6o': 6, '6a': 6,
  setimo: 7, sétima: 7, setima: 7, '7o': 7, '7a': 7,
  oitavo: 8, oitava: 8, '8o': 8, '8a': 8,
  nono: 9, nona: 9, '9o': 9, '9a': 9,
  decimo: 10, décima: 10, decima: 10, '10o': 10, '10a': 10,
  vigesimo: 20, vigésima: 20, vigesima: 20, '20o': 20, '20a': 20,
  trigesimo: 30, trigésima: 30, trigesima: 30, '30o': 30, '30a': 30,
  quadragesimo: 40, quadragésima: 40, quadragesima: 40, '40o': 40, '40a': 40,
  quinquagesimo: 50, quinquagésima: 50, quinquagesima: 50, '50o': 50, '50a': 50,
  centesimo: 100, centésima: 100, centesima: 100, '100o': 100, '100a': 100,
};

/**
 * Remove acentos e caracteres diacríticos para análise textual uniforme.
 */
function stripAccents(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[º°]/g, 'o')
    .replace(/[ª]/g, 'a')
    .toLowerCase();
}

/**
 * Resolve combinação de número composto quando a Alexa separa em dois slots
 * (ex: { number: "20", cents: "8" } ou { price: "20", cents: "8" }).
 *
 * Em português:
 * - Dezena (20, 30..90) + Unidade (1..9) = número composto (20 + 8 = 28).
 * - Centena (100, 200..900) + Unidade/Dezena (1..99) = número composto (100 + 28 = 128).
 *
 * @param {string|number} part1
 * @param {string|number} part2
 * @returns {number|null}
 */
function resolveCompoundNumber(part1, part2) {
  if (part1 === null || part1 === undefined || part2 === null || part2 === undefined) {
    return null;
  }
  const n1 = typeof part1 === 'number' ? part1 : parseInt(String(part1).trim(), 10);
  const n2 = typeof part2 === 'number' ? part2 : parseInt(String(part2).trim(), 10);

  if (isNaN(n1) || isNaN(n2)) return null;

  if (n1 >= 20 && n1 <= 90 && n1 % 10 === 0 && n2 >= 1 && n2 <= 9) {
    return n1 + n2;
  }
  if (n1 >= 100 && n1 <= 900 && n1 % 100 === 0 && n2 >= 1 && n2 <= 99) {
    return n1 + n2;
  }
  if (n1 === 1000 && n2 >= 1 && n2 <= 999) {
    return n1 + n2;
  }
  return null;
}

/**
 * Converte palavras em português (cardinais ou ordinais) em número inteiro.
 * Suporta expressões compostas com 'e' (ex: "vinte e oito", "cento e vinte e oito", "terceiro").
 *
 * @param {string} text
 * @returns {number|null}
 */
function parsePortugueseWordsToNumber(text) {
  if (!text || typeof text !== 'string') return null;

  // Rejeita pontuações, operadores ou barras matemáticas
  if (/[.,\/+*_=]/.test(text)) {
    return null;
  }
  // Rejeita dígitos misturados em parser de palavras puras
  if (/\d/.test(text)) {
    return null;
  }

  const clean = stripAccents(text).trim();
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  // 1. Testa se é ordinal direto ("primeiro", "segundo", "décimo")
  if (tokens.length === 1 && PORTUGUESE_ORDINAL_WORDS[tokens[0]] !== undefined) {
    return PORTUGUESE_ORDINAL_WORDS[tokens[0]];
  }

  // Se forem ordinais compostos (ex: "vigésimo primeiro")
  if (tokens.length === 2 && PORTUGUESE_ORDINAL_WORDS[tokens[0]] !== undefined && PORTUGUESE_ORDINAL_WORDS[tokens[1]] !== undefined) {
    return PORTUGUESE_ORDINAL_WORDS[tokens[0]] + PORTUGUESE_ORDINAL_WORDS[tokens[1]];
  }

  // 2. Parser de cardinais
  let total = 0;
  let current = 0;
  let matchedAny = false;
  let lastVal = Infinity;

  const normMap = {};
  for (const [k, v] of Object.entries(PORTUGUESE_NUMBER_WORDS)) {
    normMap[stripAccents(k)] = v;
  }

  for (const token of tokens) {
    if (token === 'e' || token === 'real' || token === 'reais' || token === 'centavo' || token === 'centavos') {
      continue;
    }
    if (normMap[token] !== undefined) {
      matchedAny = true;
      const val = normMap[token];
      if (val === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
        lastVal = 1000;
      } else {
        if (val >= 10 && val > lastVal) {
          return null; // Expressão malformada (ex: menor precedendo maior sem ser multiplicador)
        }
        current += val;
        lastVal = val;
      }
    } else {
      return null; // Token não reconhecido
    }
  }

  total += current;
  return matchedAny ? total : null;
}

/**
 * Converte segmento textual ou numérico para número (dígitos ou extenso).
 *
 * @param {string|number} partStr
 * @returns {number|null}
 */
function parsePartToNumber(partStr) {
  if (partStr === null || partStr === undefined || partStr === '') return 0;
  if (typeof partStr === 'number') {
    return Number.isFinite(partStr) ? partStr : null;
  }
  const clean = String(partStr).replace(/r\$/gi, '').trim();
  if (/[.,\/+*_=]/.test(clean)) {
    return null;
  }
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  if (/\d/.test(clean)) {
    return null;
  }
  return parsePortugueseWordsToNumber(clean);
}

/**
 * Normaliza e valida quantidade inteira de itens (1 a 10.000).
 * Suporta dígitos ("28"), números por extenso ("vinte e oito", "duas"),
 * ordinais ("primeiro", "segundo"), numerais compostos com 'e' ("20 e 8"),
 * e sufixos orais comuns ("28 itens", "vinte e oito unidades", "3 peças").
 *
 * @param {any} value
 * @returns {number|null}
 */
function normalizeQuantity(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0 && value <= 10000) {
      return value;
    }
    return null;
  }

  let clean = stripAccents(String(value)).trim();

  if (/[.,\/+*_=]/.test(clean)) return null;

  // Numerais com "e" (ex: "20 e 8", "30 e 5")
  const compoundDigitsMatch = clean.match(/^(\d+)\s+e\s+(\d+)$/);
  if (compoundDigitsMatch) {
    const d1 = parseInt(compoundDigitsMatch[1], 10);
    const d2 = parseInt(compoundDigitsMatch[2], 10);
    const sum = d1 + d2;
    if (Number.isInteger(sum) && sum > 0 && sum <= 10000) {
      return sum;
    }
  }

  // Ordinais com abreviação (ex: "1o", "2a")
  if (PORTUGUESE_ORDINAL_WORDS[clean] !== undefined) {
    const ord = PORTUGUESE_ORDINAL_WORDS[clean];
    return (ord > 0 && ord <= 10000) ? ord : null;
  }

  // Número isolado ou seguido de unidade/produto reconhecido. Não descarta
  // silenciosamente texto arbitrário ou expressões monetárias após os dígitos.
  const digitQuantity = clean.match(/^(\d+)(?:\s+(?:(?:itens?|unidades?|pecas?|produtos?|caixas?|topos?)(?:\s+de\s+bolo)?|no total|ao todo))?$/);
  if (digitQuantity) {
    const num = parseInt(digitQuantity[1], 10);
    return (num > 0 && num <= 10000) ? num : null;
  }

  // Sufixos conhecidos também podem vir após numeral por extenso.
  const wordQuantity = clean.replace(/\s+(?:itens?|unidades?|pecas?|produtos?|caixas?|topos?)(?:\s+de\s+bolo)?$|\s+(?:no total|ao todo)$/, '').trim();
  const wordNum = parsePortugueseWordsToNumber(wordQuantity);
  if (wordNum !== null && Number.isInteger(wordNum) && wordNum > 0 && wordNum <= 10000) {
    return wordNum;
  }

  return null;
}

/**
 * Normaliza qualquer representação em linguagem natural de valor monetário
 * ("X reais e Y centavos", "X reais", "X e Y", "X vírgula Y", "X centavos")
 * em formato de ponto flutuante válido e centavos inteiros.
 *
 * @param {any} priceValue
 * @returns {{ valid: boolean, price?: number, cents?: number, error?: string }}
 */
function normalizeCurrencyToFloat(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return { valid: false, error: 'Valor não informado.' };
  }

  // Se já for número de ponto flutuante ou inteiro
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
    return { valid: true, price: cents / 100, cents };
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
  if (/[+*\/=]/.test(rawStr)) {
    return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga um único valor em reais.' };
  }

  let clean = stripAccents(rawStr)
    .replace(/r\$/gi, '')
    .replace(/\b(?:cada|por unidade|a unidade|unidade|por item|item|no total|ao todo|total)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Substitui gírias coloquiais de meio real
  clean = clean.replace(/\b(?:meio|meia)\b/g, '50 centavos');

  // 1. Formato com milhares no padrão brasileiro: 1.500,00 ou 1.500
  const brThousands = clean.match(/^(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)(?:\s*(?:reais|real))?$/);
  if (brThousands) {
    const num = parseFloat(brThousands[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      const cents = Math.round(num * 100);
      return { valid: true, price: cents / 100, cents };
    }
  }

  // Normalização de transcrições orais de vírgula ou ponto decimal:
  // "10 virgula 50", "10 com 50", "dez virgula cinquenta"
  clean = clean.replace(/(\d+)\s*(?:virgula|,)\s*(\d{1,2})/g, '$1.$2');
  clean = clean.replace(/\b(\w+)\s+(?:virgula|com)\s+(\w+)\b/g, '$1 e $2');

  // 2. Se contiver menção explícita a "centavos" (ex: "20 reais e 8 centavos", "cinquenta centavos", "10 reais e 50 centavos")
  if (/\bcentavos?\b/.test(clean)) {
    let reaisStr = '';
    let centavosStr = '';
    if (/\b(?:reais|real)\b/.test(clean)) {
      const match = clean.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+)?(.*?)\bcentavos?\b\s*$/);
      if (match) {
        reaisStr = match[1].trim();
        centavosStr = match[2].trim();
      }
    } else {
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
    const cents = Math.round(total * 100);
    return { valid: true, price: cents / 100, cents };
  }

  // 3. Formato com palavra "reais" / "real" e possível parte seguinte:
  // Ex: "28 reais", "vinte e oito reais", "3 reais e 50", "vinte reais e oito"
  const reaisMatch = clean.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+(.*?))?$/);
  if (reaisMatch) {
    const reaisPart = reaisMatch[1].trim();
    const secondPart = reaisMatch[2] ? reaisMatch[2].trim() : null;

    if (!secondPart) {
      // "X reais" ou "X real"
      const rVal = parsePartToNumber(reaisPart);
      if (rVal !== null && rVal >= 0) {
        if (rVal > 10000) {
          return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
        }
        const cents = Math.round(rVal * 100);
        return { valid: true, price: rVal, cents };
      }
    } else {
      // Há segunda parte após "reais e" sem a palavra centavos:
      // Ex: "20 reais e 8" vs "3 reais e 50"
      const rVal = parsePartToNumber(reaisPart);
      const sVal = parsePartToNumber(secondPart);
      if (rVal !== null && sVal !== null && rVal >= 0 && sVal >= 0 && sVal < 100) {
        // Sem marcador de decimal, valores como "20 reais e 8" admitem duas
        // leituras: R$ 28,00 ou R$ 20,08. Não escolha uma silenciosamente.
        const isCompound = resolveCompoundNumber(rVal, sVal);
        if (isCompound !== null) {
          return { valid: false, error: 'Valor ambíguo. Diga, por exemplo, vinte e oito reais ou vinte reais e oito centavos.' };
        }

        // Caso contrário, trata como centavos implícitos (ex: "3 reais e 50" -> 3.50, "10 reais e 25" -> 10.25)
        const total = rVal + (sVal / 100);
        if (total > 10000) {
          return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
        }
        const cents = Math.round(total * 100);
        return { valid: true, price: cents / 100, cents };
      }
    }
  }

  // 4. Números padrão com vírgula ou ponto decimal simples: "3.50", "3,50", "150", "28"
  if (/^\d+[.,]\d{3,}$/.test(clean.replace(/\s*(?:reais|real)$/, ''))) {
    return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga um único valor em reais.' };
  }
  const regexNum = /^(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real))?$/;
  const matchNum = clean.match(regexNum);
  if (matchNum) {
    const num = parseFloat(matchNum[1].replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      const cents = Math.round(num * 100);
      return { valid: true, price: cents / 100, cents };
    }
  }

  // 5. Numerais por extenso em português ou split por ' e ' para decimais
  const cleanWords = clean.replace(/\b(?:reais|real)\b/g, '').trim();

  // Se for extenso puro de número inteiro (ex: "vinte e oito", "cem", "trinta e cinco")
  if (!/\d/.test(cleanWords)) {
    const wordNum = parsePortugueseWordsToNumber(cleanWords);
    if (wordNum !== null && wordNum >= 0) {
      if (wordNum > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      const cents = Math.round(wordNum * 100);
      return { valid: true, price: wordNum, cents };
    }
  }

  // Se contiver divisão por ' e '
  // Ex: "3 e 50", "vinte e oito", "três e cinquenta", "dez e noventa e nove"
  if (cleanWords.includes(' e ')) {
    const parts = cleanWords.split(/\s+e\s+/);
    for (let i = 1; i < parts.length; i++) {
      const reaisPart = parts.slice(0, i).join(' e ').trim();
      const centavosPart = parts.slice(i).join(' e ').trim();
      const rVal = parsePartToNumber(reaisPart);
      const cVal = parsePartToNumber(centavosPart);
      if (rVal !== null && cVal !== null && rVal >= 0 && cVal >= 0 && cVal < 100) {
        // Em texto numérico com "e", a dezena e a fração podem ser ambíguas.
        const isCompound = resolveCompoundNumber(rVal, cVal);
        if (isCompound !== null) {
          return { valid: false, error: 'Valor ambíguo. Diga, por exemplo, vinte e oito reais ou vinte reais e oito centavos.' };
        }

        // Senão, trata como reais e centavos (ex: "3 e 50" = 3.50)
        const total = rVal + (cVal / 100);
        if (total <= 10000) {
          const cents = Math.round(total * 100);
          return { valid: true, price: cents / 100, cents };
        }
      }
    }
  }

  return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
}

/**
 * Normaliza e limpa nome de cliente falado em português.
 * Remove prefixos comuns como "para o", "para a", "pro", "pra", "o", "a", "cliente", etc.
 * Capitaliza adequadamente o nome (ex: "luiz" -> "Luiz", "maria aparecida" -> "Maria Aparecida").
 */
function cleanCustomerName(rawName) {
  if (!rawName || typeof rawName !== 'string') return '';
  let clean = rawName.trim();

  // Remove pontuações e aspas
  clean = clean.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '').trim();

  // Remove prefixos conversacionais falados
  const prefixRegex = /^(?:é\s+para\s+o|é\s+para\s+a|é\s+para|é\s+pro|é\s+pra|é\s+do|é\s+da|na\s+verdade\s+é\s+para\s+o|na\s+verdade\s+é\s+para\s+a|na\s+verdade\s+é\s+para|na\s+verdade\s+é\s+pro|na\s+verdade\s+é\s+pra|o\s+cliente\s+é\s+o|o\s+cliente\s+é\s+a|o\s+cliente\s+é|a\s+cliente\s+é\s+a|a\s+cliente\s+é|o\s+nome\s+é\s+o|o\s+nome\s+é\s+a|o\s+nome\s+é|cliente\s+é|cliente|para\s+o|para\s+a|para|pro|pra|ao|à|do|da|de|o|a)\s+/i;

  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  }

  // Se sobrou apenas palavra vazia ou muito curta
  if (clean.length < 2) return '';

  return clean;
}

/**
 * Normaliza e limpa nome de produto falado em português.
 * Remove prefixos de preenchimento como "é um", "é uma", "são", "o produto é", etc.
 */
function cleanProductName(rawProd) {
  if (!rawProd || typeof rawProd !== 'string') return '';
  let clean = rawProd.trim();

  clean = clean.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, '').trim();

  const prefixRegex = /^(?:o\s+produto\s+é\s+um|o\s+produto\s+é\s+uma|o\s+produto\s+é|produto\s+é|produto|é\s+um|é\s+uma|é\s+uns|é\s+umas|é|são\s+uns|são\s+umas|são|quero\s+um|quero\s+uma|quero|fazer\s+um|fazer\s+uma|fazer|um|uma|uns|umas|de)\s+/i;

  while (prefixRegex.test(clean)) {
    clean = clean.replace(prefixRegex, '').trim();
  }

  // Normalização de variações orais comuns
  const lower = clean.toLowerCase();
  if (lower === 'papercraft' || lower === 'paper craft' || lower === 'papercrafts' || lower === 'paper crafts' || lower === 'papel craft' || lower === 'paper-craft') {
    return 'paper craft';
  }

  return clean;
}

/**
 * Tenta separar e extrair Produto e Cliente de frases compostas.
 * Ex: "paper craft para o luiz" -> { product: "paper craft", customer: "Luiz" }
 * Ex: "paper craft para luiz" -> { product: "paper craft", customer: "Luiz" }
 * Ex: "caixas para amanda" -> { product: "caixas", customer: "Amanda" }
 * Ex: "o produto é paper craft e o cliente é luiz" -> { product: "paper craft", customer: "Luiz" }
 * Ex: "topo de bolo pro marcos" -> { product: "topo de bolo", customer: "Marcos" }
 */
function extractProductAndCustomer(text) {
  if (!text || typeof text !== 'string') {
    return { product: null, customer: null };
  }

  let clean = text.trim();
  if (!clean) return { product: null, customer: null };

  // Remove preâmbulos comuns como "criar pedido de", "novo pedido de", "é", etc.
  clean = clean.replace(/^(?:criar\s+pedido\s+(?:de\s+)?|novo\s+pedido\s+(?:de\s+)?|pedido\s+(?:de\s+)?|fazer\s+(?:um\s+)?pedido\s+(?:de\s+)?|é\s+um\s+|é\s+uma\s+|é\s+|são\s+)/i, '').trim();

  // 1. Padrões com marcadores explícitos: "o produto é X e o cliente é Y" / "produto X cliente Y"
  const explicitMatch = clean.match(/(?:o\s+)?produto(?:\s+é)?\s+(.+?)\s+(?:e\s+)?(?:o\s+|a\s+)?cliente(?:\s+é)?\s+(.+)/i);
  if (explicitMatch) {
    const prod = cleanProductName(explicitMatch[1]);
    const cust = cleanCustomerName(explicitMatch[2]);
    if (prod && cust) {
      return { product: prod, customer: cust };
    }
  }

  const explicitMatchReverse = clean.match(/(?:o\s+|a\s+)?cliente(?:\s+é)?\s+(.+?)\s+(?:e\s+)?(?:o\s+)?produto(?:\s+é)?\s+(.+)/i);
  if (explicitMatchReverse) {
    const cust = cleanCustomerName(explicitMatchReverse[1]);
    const prod = cleanProductName(explicitMatchReverse[2]);
    if (prod && cust) {
      return { product: prod, customer: cust };
    }
  }

  // 2. Padrão com preposição: "X para o Y", "X para a Y", "X para Y", "X pro Y", "X pra Y", "X de Y", "X do Y", "X da Y"
  // Ex: "paper craft para o luiz", "paper craft para luiz", "10 caixas para maria", "caderno pro pedro"
  const prepMatch = clean.match(/^(.+?)\s+(?:para\s+o|para\s+a|para|pro|pra|ao|à)\s+([a-zA-ZÀ-ÿ\s]+)$/i);
  if (prepMatch) {
    const rawProd = prepMatch[1].trim();
    const rawCust = prepMatch[2].trim();

    const prod = cleanProductName(rawProd);
    const cust = cleanCustomerName(rawCust);

    if (prod && cust && prod.length >= 2 && cust.length >= 2) {
      return { product: prod, customer: cust };
    }
  }

  // 3. Padrão com 'e': "paper craft e luiz", "caixinhas e amanda"
  const andMatch = clean.match(/^(.+?)\s+e\s+([a-zA-ZÀ-ÿ\s]+)$/i);
  if (andMatch) {
    const rawProd = andMatch[1].trim();
    const rawCust = andMatch[2].trim();

    const prod = cleanProductName(rawProd);
    const cust = cleanCustomerName(rawCust);

    if (prod && cust && prod.length >= 2 && cust.length >= 2) {
      return { product: prod, customer: cust };
    }
  }

  return { product: null, customer: null };
}

module.exports = {
  PORTUGUESE_NUMBER_WORDS,
  PORTUGUESE_ORDINAL_WORDS,
  stripAccents,
  resolveCompoundNumber,
  parsePortugueseWordsToNumber,
  parsePartToNumber,
  normalizeQuantity,
  normalizeCurrencyToFloat,
  cleanCustomerName,
  cleanProductName,
  extractProductAndCustomer,
};
