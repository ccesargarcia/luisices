/**
 * Máquina de Estados e Diálogo da Alexa em pt-BR.
 * Segue estritamente a especificação docs/ESPECIFICACAO_ALEXA_ANTIGRAVITY.md (Seção 5).
 */

const crypto = require('crypto');
const admin = require('firebase-admin');
const { escapeXmlCharacters } = require('ask-sdk-core');
const { COLLECTIONS, recordAuditEvent } = require('./repository');
const { commitOrderFromDraft } = require('./orderService');

// Meses em português para pronúncia amigável
const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

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

  for (const token of tokens) {
    if (token === 'e' || token === 'real' || token === 'reais' || token === 'centavo' || token === 'centavos') continue;
    if (normMap[token] !== undefined) {
      matchedAny = true;
      const val = normMap[token];
      if (val === 1000) {
        current = (current === 0 ? 1 : current) * 1000;
        total += current;
        current = 0;
      } else {
        current += val;
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
 * Interpreta e valida valor monetário em reais (máximo R$ 10.000,00 ou 1.000.000 centavos).
 * Suporta dígitos (100, 100,50, 1.500,00, R$ 150), zero reais (pedido gratuito)
 * e números por extenso (cem reais, cinquenta, dez reais e cinquenta centavos).
 * Rejeita estritamente expressões matemáticas, ambiguidades e formatos malformados.
 */
function parseAndValidatePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return { valid: false, error: 'Valor não informado.' };
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

  const cleanNumStr = rawStr.replace(/r\$/gi, '').trim();

  // 1. Tentar extração de números com formato brasileiro de milhar e decimal: 1.500,00 ou 1.500
  // Aceita sufixo monetário opcional: "reais" ou "real"
  const brThousands = cleanNumStr.match(/^(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)(?:\s*(?:reais|real))?$/);
  if (brThousands) {
    const num = parseFloat(brThousands[1].replace(/\./g, '').replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(num * 100) / 100 };
    }
  }

  // 2. Se contiver menção a centavos (ex: "dez reais e cinquenta centavos", "cinquenta centavos", "10 reais e 50 centavos")
  if (/\bcentavos?\b/.test(rawStr)) {
    let reaisStr = '';
    let centavosStr = '';
    if (/\b(reais|real)\b/.test(rawStr)) {
      // Formato estrito: "<reais> reais [e] <centavos> centavos"
      // Deve consumir a entrada inteira — rejeita conteúdo excedente após "centavos"
      const match = rawStr.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+)?(.*?)\bcentavos?\b\s*$/);
      if (match) {
        reaisStr = match[1].trim();
        centavosStr = match[2].trim();
      }
    } else {
      // Apenas centavos estrito: "<centavos> centavos" — exige quantia não vazia antes
      const match = rawStr.match(/^(.*?)\bcentavos?\b\s*$/);
      if (match) {
        centavosStr = match[1].replace(/^\s*e\s+/, '').trim();
      }
    }
    // Rejeita "centavos" sozinho sem quantia explícita
    if (!centavosStr) {
      return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
    }
    const rVal = parsePartToNumber(reaisStr);
    const cVal = parsePartToNumber(centavosStr);
    if (rVal === null || cVal === null || cVal >= 100) {
      return { valid: false, error: 'Valor total inválido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
    }
    const total = rVal + (cVal / 100);
    if (total > 10000) {
      return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
    }
    return { valid: true, price: Math.round(total * 100) / 100 };
  }

  // 3. Números padrão com vírgula ou ponto decimal simples: 150,50 ou 150.50 ou 150 ou "150 reais" ou "0 reais"
  const regexNum = /^(\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais|real))?$/;
  const match = cleanNumStr.match(regexNum);
  if (match) {
    const num = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      if (num > 10000) {
        return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
      }
      return { valid: true, price: Math.round(num * 100) / 100 };
    }
  }

  // 4. Se for número por extenso em português (ex: "cem reais", "duzentos e cinquenta", "zero reais")
  const cleanWords = cleanNumStr.replace(/\b(reais|real)\b/g, '').trim();

  // Rejeita se a entrada contém dígitos (já não casou no regexNum ou brThousands)
  if (/\d/.test(cleanWords)) {
    return { valid: false, error: 'Formato de valor não reconhecido. Por favor, diga o valor em reais, por exemplo: cem reais.' };
  }

  // Sem dígitos — interpretar estritamente como extenso em português
  const wordNum = parsePortugueseWordsToNumber(cleanWords);
  if (wordNum !== null && wordNum >= 0) {
    if (wordNum > 10000) {
      return { valid: false, error: 'O valor do pedido excede o limite máximo permitido de dez mil reais.' };
    }
    return { valid: true, price: Math.round(wordNum * 100) / 100 };
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
    return `${name}, no ambiente de ${envLabel}: ${qty} ${prod} para ${cust} a ${unitPriceFormatted} cada, total de ${totalPriceFormatted}, entrega em ${dateFormatted}. Confirmar?`;
  }

  const priceFormatted = draftData.price === 0
    ? 'zero reais, pedido gratuito'
    : formatCurrencyPtBr(draftData.price);

  return `${name}, no ambiente de ${envLabel}: ${qty} ${prod} para ${cust}, entrega em ${dateFormatted}, total de ${priceFormatted}. Confirmar?`;
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
    const speech = `Olá, ${name}. Ambiente de ${envLabel}. Diga criar pedido ou vincular minha voz.`;
    const reprompt = 'Você pode dizer: criar pedido, ou pedir ajuda.';
    return {
      speech,
      reprompt,
      shouldEndSession: false,
      sessionAttributes: {},
    };
  }

  // 2. Comandos globais de saída e ajuda
  if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
    if (currentDraftId && sessionId) {
      await runTx(async (transaction) => {
        const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId);
        const snap = await transaction.get(draftRef);
        if (snap.exists) {
          const dData = snap.data() || {};
          // Validação estrita de titularidade, ambiente e sessão antes de cancelar
          const isOwner = dData.uid === identity.uid;
          const isSameBinding = !dData.bindingKey || dData.bindingKey === identity.bindingKey;
          const isSameEnv = !dData.environment || dData.environment === config.environment;
          const isSameSession = dData.sessionId === sessionId;
          // CancelIntent só pode cancelar estados collecting ou awaiting_confirmation.
          // NUNCA alterar committed, expired, cancelled ou awaiting_app_approval.
          const isCancellable = dData.state === 'collecting' || dData.state === 'awaiting_confirmation';

          if (isOwner && isSameBinding && isSameEnv && isSameSession && isCancellable) {
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
      'Para criar um pedido, diga por exemplo: criar pedido de dez caixinhas para Maria a dez reais cada. Ou: vinte cadernos para João por cem reais no total. Vou perguntar a data de entrega antes de confirmar.';
    return {
      speech: helpSpeech,
      reprompt: 'Diga criar pedido para começar.',
      shouldEndSession: false,
      sessionAttributes: sessionAttrs,
    };
  }

  // 3. Fallback intent (tratamento de fala não compreendida com limite de 3 tentativas)
  if (intentName === 'AMAZON.FallbackIntent') {
    let fallbackCount = (sessionAttrs.fallbackCount || 0) + 1;
    let shouldExpire = false;
    let draftUpdated = false;

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

    return {
      speech: 'Não entendi. Por favor, repita a informação do pedido.',
      reprompt: 'Diga os dados do pedido ou diga cancelar.',
      shouldEndSession: false,
      sessionAttributes: nextAttrs,
    };
  }

  // 4. Pré-validação de formato dos slots recebidos neste turno
  const incomingUpdates = {};

  const customerSlot = slots.customer?.value || slots.Customer?.value;
  if (customerSlot) {
    const cleanCust = customerSlot.trim();
    if (cleanCust.length >= 2 && cleanCust.length <= 100) {
      incomingUpdates.customer = cleanCust;
    }
  }

  const productSlot = slots.product?.value || slots.Product?.value;
  if (productSlot) {
    const cleanProd = productSlot.trim();
    if (cleanProd.length >= 1 && cleanProd.length <= 200) {
      incomingUpdates.product = cleanProd;
    }
  }

  const quantitySlot = slots.quantity?.value || slots.Quantity?.value;
  if (quantitySlot) {
    const cleanQty = String(quantitySlot).trim();
    if (!/^\d+$/.test(cleanQty)) {
      return {
        speech: 'A quantidade de itens deve ser um número inteiro. Por exemplo: dez ou quinze.',
        reprompt: 'Qual é a quantidade inteira de itens?',
        shouldEndSession: false,
        sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId },
      };
    }
    const q = parseInt(cleanQty, 10);
    if (q <= 0 || q > 10000) {
      return {
        speech: 'A quantidade deve ser entre 1 e dez mil itens.',
        reprompt: 'Qual é a quantidade de itens?',
        shouldEndSession: false,
        sessionAttributes: { draftId: currentDraftId, revision: sessionAttrs.revision || 1, personId: identity.personId },
      };
    }
    incomingUpdates.quantity = q;
  }

  const dateSlot = slots.deliveryDate?.value || slots.DeliveryDate?.value || slots.date?.value;
  let dateValidationError = null;
  if (dateSlot) {
    const dateRes = parseAndValidateDeliveryDate(dateSlot, config.timezone);
    if (dateRes.valid) {
      incomingUpdates.deliveryDate = dateRes.date;
    } else {
      dateValidationError = dateRes.error;
    }
  }

  const unitPriceSlot = slots.unitPrice?.value || slots.UnitPrice?.value;
  const totalSlot = slots.total?.value || slots.Total?.value;
  const genericPriceSlot = slots.price?.value || slots.Price?.value || slots.ambiguousPrice?.value || slots.AmbiguousPrice?.value;

  let parsedUnitPrice = null;
  let unitPriceValidationError = null;
  if (unitPriceSlot) {
    const uRes = parseAndValidatePriceToCents(unitPriceSlot);
    if (!uRes.valid) {
      unitPriceValidationError = uRes.error;
    } else {
      parsedUnitPrice = uRes;
    }
  }

  let parsedTotal = null;
  let totalValidationError = null;
  if (totalSlot) {
    const tRes = parseAndValidatePriceToCents(totalSlot);
    if (!tRes.valid) {
      totalValidationError = tRes.error;
    } else {
      parsedTotal = tRes;
    }
  }

  let parsedGenericPrice = null;
  let genericPriceValidationError = null;
  if (genericPriceSlot) {
    const gRes = parseAndValidatePriceToCents(genericPriceSlot);
    if (!gRes.valid) {
      genericPriceValidationError = gRes.error;
    } else {
      parsedGenericPrice = gRes;
    }
  }

  // 5. Transação atômica única para carregar/modificar o rascunho com controle de concorrência
  // Todos os estados são retornados estruturados por tentativa, evitando vazamento entre retries.
  const txResult = await runTx(async (transaction) => {
    let txDraftId = currentDraftId;
    let txDraftRef = null;
    let txIsAppApprovalBlocked = false;
    let existingData = null;

    // Exigir sessionId atual para reutilizar rascunho existente
    if (txDraftId && sessionId) {
      const ref = db.collection(COLLECTIONS.DRAFTS).doc(txDraftId);
      const snap = await transaction.get(ref);
      if (snap.exists) {
        const d = snap.data() || {};
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
        notes: null,
        revision: 1,
        state: 'collecting',
        fallbackCount: 0,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
    } else {
      if (existingData.pendingConflict === undefined) existingData.pendingConflict = null;
      if (existingData.pendingField === undefined) existingData.pendingField = null;
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

    // Validações de entrada que persistem pendingField no rascunho antes de responder erro
    if (dateValidationError) {
      existingData.pendingField = 'deliveryDate';
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
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: {
          speech: genericPriceValidationError,
          reprompt: 'Qual é o valor do pedido?',
        },
      };
    }

    // Ações para YesIntent e NoIntent não alteram slots aqui
    if (intentName === 'AMAZON.YesIntent') {
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: null,
      };
    }

    if (intentName === 'AMAZON.NoIntent') {
      if (existingData.state === 'awaiting_confirmation') {
        existingData.state = 'collecting';
        existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        transaction.set(txDraftRef, existingData, { merge: true });
      }
      return {
        draft: existingData,
        draftId: txDraftId,
        draftRef: txDraftRef,
        isAppApprovalBlocked: false,
        transactionError: null,
      };
    }

    let updated = false;

    // Resolução de esclarecimento pendente via ClarifyPriceUnitIntent ou ClarifyPriceTotalIntent
    if (intentName === 'ClarifyPriceUnitIntent') {
      const effQty = incomingUpdates.quantity || existingData.quantity;
      if (existingData.pendingConflict) {
        existingData.pricingMode = 'unit';
        existingData.unitPriceCents = existingData.pendingConflict.unitPriceCents;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.pendingPriceCents = null;
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
      if (existingData.pendingConflict) {
        existingData.pricingMode = 'total';
        existingData.totalPriceCents = existingData.pendingConflict.totalPriceCents;
        existingData.price = existingData.pendingConflict.totalPriceCents / 100;
        existingData.unitPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.pendingPriceCents = null;
        updated = true;
      } else if (existingData.pendingPriceCents !== null && existingData.pendingPriceCents !== undefined) {
        existingData.pricingMode = 'total';
        existingData.totalPriceCents = existingData.pendingPriceCents;
        existingData.price = existingData.pendingPriceCents / 100;
        existingData.unitPriceCents = null;
        existingData.pendingConflict = null;
        existingData.pendingField = null;
        existingData.pendingPriceCents = null;
        updated = true;
      }
    }

    // Aplicação de contexto em valor sem qualificador (P1)
    const activePending = existingData.pendingField || sessionAttrs.pendingField || null;
    if (parsedTotal) {
      // Usuário forneceu total explicitamente ("no total"): sempre tem precedência e pode trocar o modo
      existingData.pendingField = null;
    } else if (parsedUnitPrice) {
      // Usuário forneceu unitário explicitamente ("cada"): limpa pendingField
      existingData.pendingField = null;
    } else if (parsedGenericPrice) {
      if (activePending === 'unitPrice') {
        parsedUnitPrice = parsedGenericPrice;
        parsedGenericPrice = null;
        existingData.pendingField = null;
      } else if (activePending === 'total') {
        parsedTotal = parsedGenericPrice;
        parsedGenericPrice = null;
        existingData.pendingField = null;
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
          updated = true;
        } else {
          // Conflito entre unitário e total: persiste ambas as alternativas e aguarda esclarecimento (P1)
          existingData.pendingConflict = {
            unitPriceCents: parsedUnitPrice.cents,
            totalPriceCents: parsedTotal.cents,
          };
          existingData.pendingField = 'conflict';
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
      updated = true;
    } else if (parsedGenericPrice) {
      existingData.pendingPriceCents = parsedGenericPrice.cents;
      existingData.pricingMode = null;
      existingData.unitPriceCents = null;
      existingData.totalPriceCents = null;
      existingData.price = null;
      existingData.pendingConflict = null;
      existingData.pendingField = null;
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

    // Mesclar demais slots (customer, product, deliveryDate)
    for (const [k, v] of Object.entries(incomingUpdates)) {
      if (k !== 'quantity' && existingData[k] !== v) {
        existingData[k] = v;
        updated = true;
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
      !existingData.pendingField;

    if (isComplete && (existingData.state === 'collecting' || updated)) {
      existingData.state = 'awaiting_confirmation';
      existingData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    }

    transaction.set(txDraftRef, existingData, { merge: true });

    return {
      draft: existingData,
      draftId: txDraftId,
      draftRef: txDraftRef,
      isAppApprovalBlocked: false,
      transactionError: null,
    };
  });

  const { draft, draftId, draftRef, isAppApprovalBlocked, transactionError } = txResult || {};

  if (isAppApprovalBlocked) {
    return {
      speech: 'Este pedido já foi enviado para aprovação no aplicativo e não pode ser alterado por voz. Acesse o aplicativo Luisices para conferir.',
      reprompt: 'Acesse o aplicativo Luisices para conferir o pedido.',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  if (transactionError) {
    return {
      speech: transactionError.speech,
      reprompt: transactionError.reprompt,
      shouldEndSession: false,
      sessionAttributes: {
        draftId,
        revision: draft ? draft.revision : (sessionAttrs.revision || 1),
        personId: identity.personId,
        pendingField: draft?.pendingField || sessionAttrs.pendingField || null,
      },
    };
  }

  // 6. Confirmação do resumo (AMAZON.YesIntent / AMAZON.NoIntent)
  if (intentName === 'AMAZON.YesIntent') {
    if (draft.state !== 'awaiting_confirmation') {
      return {
        speech: 'Ainda faltam informações para concluir o pedido. O que deseja cadastrar?',
        reprompt: 'Diga os dados do pedido.',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }

    // Biometria vocal obrigatória no momento da confirmação final.
    // NÃO usa identity.personId como fallback: se a fala atual não carrega personId
    // (outra pessoa tomou a conversa, sessão de outro contexto), o pedido é rejeitado.
    const physicalPersonId =
      envelope?.context?.System?.person?.personId ||
      envelope?.session?.System?.person?.personId ||
      null;

    if (!physicalPersonId) {
      return {
        speech: 'Não reconheci sua voz na confirmação do pedido. Por segurança, o pedido não foi confirmado.',
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }

    // Validação estrita de correspondência com o autor do rascunho
    if (draft.personId && draft.personId !== physicalPersonId) {
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
        reprompt: 'Confirma o pedido com os dados atualizados? Diga sim para confirmar ou não para alterar.',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }

    const envLabel = config.environment === 'prod' ? 'produção' : 'teste';

    // Modo 1: Confirmação por voz direta
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

        const successSpeech = commitRes.isReplay
          ? `O pedido número ${commitRes.orderNumber} já havia sido registrado com sucesso.`
          : `Pedido criado no seu espaço de ${envLabel} com o número ${commitRes.orderNumber}.`;

        return {
          speech: successSpeech,
          shouldEndSession: true,
          sessionAttributes: {},
        };
      } catch (commitErr) {
        console.error('[AlexaDialog] Erro ao gravar pedido:', commitErr);
        return {
          speech: 'Não foi possível confirmar o pedido neste momento. Por favor, verifique o quadro no aplicativo.',
          shouldEndSession: true,
          sessionAttributes: {},
        };
      }
    }

    // Modo 2: Aprovação pendente no aplicativo (transição atômica condicional)
    if (draft.mode === 'app_approval') {
      const transitioned = await runTx(async (transaction) => {
        const snap = await transaction.get(draftRef);
        if (snap.exists) {
          const dData = snap.data() || {};
          const isOwner = dData.uid === identity.uid;
          const isSameSession = dData.sessionId === sessionId;
          const isSameRevision = dData.revision === draft.revision;
          const isAwaiting = dData.state === 'awaiting_confirmation';

          if (isOwner && isSameSession && isSameRevision && isAwaiting) {
            transaction.update(draftRef, {
              state: 'awaiting_app_approval',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return true;
          }
        }
        return false;
      });

      if (!transitioned) {
        return {
          speech: 'O pedido não pôde ser enviado para aprovação pois foi alterado ou cancelado. Por favor, verifique no aplicativo.',
          shouldEndSession: true,
          sessionAttributes: {},
        };
      }

      return {
        speech: `Pedido preparado no seu espaço de ${envLabel}. Acesse o Luisices no aplicativo para conferir e aprovar a gravação definitiva.`,
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }
  }

  if (intentName === 'AMAZON.NoIntent') {
    if (draft.state === 'collecting') {
      return {
        speech: 'Qual dado você deseja corrigir? Diga o cliente, produto, quantidade, entrega ou valor.',
        reprompt: 'O que deseja alterar?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }
    return {
      speech: 'Pedido cancelado. Até logo.',
      shouldEndSession: true,
      sessionAttributes: {},
    };
  }

  // 7. Verificar se há conflito/ambiguidade pendente ou campos obrigatórios faltando
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
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
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
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingProduct) {
    return {
      speech: 'Qual é o produto do pedido?',
      reprompt: 'Diga o produto.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingCustomer) {
    return {
      speech: 'Para qual cliente é o pedido?',
      reprompt: 'Diga o nome do cliente.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingQuantity) {
    return {
      speech: 'Qual é a quantidade de itens?',
      reprompt: 'Informe a quantidade inteira.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingDeliveryDate) {
    return {
      speech: 'Qual é a data de entrega?',
      reprompt: 'Informe dia e mês da entrega.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingPrice) {
    return {
      speech: 'Qual é o valor total do pedido?',
      reprompt: 'Diga o valor total em reais.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  // 8. Todos os campos preenchidos -> Emitir resumo para confirmação
  const confirmSpeech = buildConfirmationSpeech(draft, identity, config);
  return {
    speech: confirmSpeech,
    reprompt: 'Você confirma o pedido? Diga sim para confirmar ou não para alterar.',
    shouldEndSession: false,
    sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
  };
}

module.exports = {
  formatDatePtBr,
  formatCurrencyPtBr,
  parseAndValidateDeliveryDate,
  parseAndValidatePrice,
  parseAndValidatePriceToCents,
  buildConfirmationSpeech,
  handleAlexaDialog,
};
