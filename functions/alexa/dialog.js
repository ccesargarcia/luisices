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
  const tokens = String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/).filter(Boolean);

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
    } else if (/^\d+$/.test(token)) {
      matchedAny = true;
      current += parseInt(token, 10);
    } else {
      return null;
    }
  }
  total += current;
  return matchedAny ? total : null;
}

function parsePartToNumber(partStr) {
  if (!partStr) return 0;
  const clean = partStr.replace(/r\$/gi, '').trim();
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  return parsePortugueseWordsToNumber(clean);
}

/**
 * Interpreta e valida valor monetário em reais (máximo R$ 10.000,00 ou 1.000.000 centavos).
 * Suporta dígitos (100, 100,50, 1.500,00, R$ 150) e números por extenso (cem reais, cinquenta, dez reais e cinquenta centavos).
 */
function parseAndValidatePrice(priceValue) {
  if (priceValue === null || priceValue === undefined || priceValue === '') {
    return { valid: false, error: 'Valor não informado.' };
  }

  const rawStr = String(priceValue).trim().toLowerCase();

  if (rawStr.includes('-') || rawStr.includes('menos')) {
    return { valid: false, error: 'Valor total não pode ser negativo.' };
  }

  if (/\bou\b/.test(rawStr)) {
    return { valid: false, error: 'Valor ambíguo. Por favor, diga um único valor total em reais.' };
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
      // Formato: "<reais> reais [e] <centavos> centavos"
      // Deve consumir a entrada inteira — rejeita conteúdo excedente após "centavos"
      const match = rawStr.match(/^(.*?)\b(?:reais|real)\b(?:\s+e\s+)?(.*?)\bcentavos?\b\s*$/);
      if (match) {
        reaisStr = match[1].trim();
        centavosStr = match[2].trim();
      }
    } else {
      // Apenas centavos: "<centavos> centavos" — exige quantia não vazia antes
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

  // 3. Números padrão com vírgula ou ponto decimal simples: 150,50 ou 150.50 ou 150 ou "150 reais"
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

  // 4. Se for número por extenso em português (ex: "cem reais", "duzentos e cinquenta")
  const cleanWords = cleanNumStr.replace(/\b(reais|real)\b/g, '').trim();
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
 * Obtém ou inicializa rascunho de pedido no Firestore (alexaDrafts/{draftId}).
 */
async function getOrCreateDraft(db, draftId, identity, config) {
  const now = Date.now();
  const ttlMs = (config.draftTtlMinutes || 15) * 60 * 1000;
  const expiresAt = new Date(now + ttlMs);

  if (draftId) {
    const snap = await db.collection(COLLECTIONS.DRAFTS).doc(draftId).get();
    if (snap.exists) {
      const data = snap.data() || {};
      const expTime = data.expiresAt?.toDate ? data.expiresAt.toDate().getTime() : 0;
      const isAllowedState = data.state === 'collecting' || data.state === 'awaiting_confirmation';
      const isSameUser = !data.uid || data.uid === identity.uid;
      const isSameBinding = !data.bindingKey || data.bindingKey === identity.bindingKey;
      const isSameEnv = !data.environment || data.environment === config.environment;
      if (expTime > now && isAllowedState && isSameUser && isSameBinding && isSameEnv) {
        return { draftId, data, ref: snap.ref };
      }
    }
  }

  // Criar novo rascunho
  const newDraftId = crypto.randomUUID();
  const draftRef = db.collection(COLLECTIONS.DRAFTS).doc(newDraftId);
  const initialData = {
    draftId: newDraftId,
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
    notes: null,
    revision: 1,
    state: 'collecting', // collecting -> awaiting_confirmation -> committed
    fallbackCount: 0,
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await draftRef.set(initialData);
  return { draftId: newDraftId, data: initialData, ref: draftRef };
}

/**
 * Monta o resumo verbal e avança estado para 'awaiting_confirmation'.
 */
function buildConfirmationSpeech(draftData, identity, config) {
  const envLabel = config.environment === 'prod' ? 'produção' : 'teste';
  const name = sanitizeSpeech(identity.displayName || 'Amanda');
  const qty = draftData.quantity;
  const prod = sanitizeSpeech(draftData.product);
  const cust = sanitizeSpeech(draftData.customer);
  const dateFormatted = formatDatePtBr(draftData.deliveryDate);
  const priceFormatted = formatCurrencyPtBr(draftData.price);

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
async function handleAlexaDialog({ envelope, identity, config, db }) {
  const request = envelope.request || {};
  const requestType = request.type || '';
  const intent = request.intent || {};
  const intentName = intent.name || '';
  const slots = intent.slots || {};

  const sessionAttrs = envelope.session?.attributes || {};
  let currentDraftId = sessionAttrs.draftId || null;

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
    if (currentDraftId) {
      await db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId).update({
        state: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      'Para criar um pedido, diga por exemplo: criar pedido de vinte caixinhas para Maria. Vou perguntar a data de entrega e o valor total antes de confirmar.';
    return {
      speech: helpSpeech,
      reprompt: 'Diga criar pedido para começar.',
      shouldEndSession: false,
      sessionAttributes: sessionAttrs,
    };
  }

  // 3. Fallback intent (tratamento de fala não compreendida com limite de 3 tentativas)
  if (intentName === 'AMAZON.FallbackIntent') {
    let prevFallbacks = sessionAttrs.fallbackCount || 0;
    if (currentDraftId) {
      const snap = await db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId).get().catch(() => null);
      if (snap && snap.exists) {
        const dData = snap.data() || {};
        if (dData.fallbackCount !== undefined) {
          prevFallbacks = Math.max(prevFallbacks, dData.fallbackCount);
        }
      }
    }
    const fallbackCount = prevFallbacks + 1;
    if (fallbackCount >= 3) {
      if (currentDraftId) {
        await db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId).update({
          state: 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});
      }
      return {
        speech: 'Não consegui entender após três tentativas. Por favor, acesse o aplicativo Luisices para registrar o pedido.',
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }

    if (currentDraftId) {
      await db.collection(COLLECTIONS.DRAFTS).doc(currentDraftId).update({
        fallbackCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }

    return {
      speech: 'Não entendi. Por favor, repita a informação do pedido.',
      reprompt: 'Diga os dados do pedido ou diga cancelar.',
      shouldEndSession: false,
      sessionAttributes: { ...sessionAttrs, draftId: currentDraftId, fallbackCount },
    };
  }

  // 4. Carregar ou criar rascunho no Firestore
  const { draftId, data: draft, ref: draftRef } = await getOrCreateDraft(db, currentDraftId, identity, config);

  // 5. Coleta ou atualização de slots do pedido
  let updated = false;
  let newRevision = (draft.revision || 1);

  // Slot: cliente
  const customerSlot = slots.customer?.value || slots.Customer?.value;
  if (customerSlot) {
    const cleanCust = customerSlot.trim();
    if (cleanCust.length >= 2 && cleanCust.length <= 100) {
      draft.customer = cleanCust;
      updated = true;
    }
  }

  // Slot: produto
  const productSlot = slots.product?.value || slots.Product?.value;
  if (productSlot) {
    const cleanProd = productSlot.trim();
    if (cleanProd.length >= 1 && cleanProd.length <= 200) {
      draft.product = cleanProd;
      updated = true;
    }
  }

  // Slot: quantidade (estritamente inteiro entre 1 e 10.000)
  const quantitySlot = slots.quantity?.value || slots.Quantity?.value;
  if (quantitySlot) {
    const cleanQty = String(quantitySlot).trim();
    if (!/^\d+$/.test(cleanQty)) {
      return {
        speech: 'A quantidade de itens deve ser um número inteiro. Por exemplo: dez ou quinze.',
        reprompt: 'Qual é a quantidade inteira de itens?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }
    const q = parseInt(cleanQty, 10);
    if (q <= 0 || q > 10000) {
      return {
        speech: 'A quantidade deve ser entre 1 e dez mil itens.',
        reprompt: 'Qual é a quantidade de itens?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }
    draft.quantity = q;
    updated = true;
  }

  // Slot: data de entrega
  const dateSlot = slots.deliveryDate?.value || slots.DeliveryDate?.value || slots.date?.value;
  if (dateSlot) {
    const dateRes = parseAndValidateDeliveryDate(dateSlot, config.timezone);
    if (dateRes.valid) {
      draft.deliveryDate = dateRes.date;
      updated = true;
    } else {
      return {
        speech: dateRes.error,
        reprompt: 'Qual é a data de entrega desejada?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }
  }

  // Slot: preço / valor total
  const totalSlot = slots.total?.value || slots.Total?.value || slots.price?.value;
  if (totalSlot) {
    const priceRes = parseAndValidatePrice(totalSlot);
    if (priceRes.valid) {
      draft.price = priceRes.price;
      updated = true;
    } else {
      return {
        speech: priceRes.error,
        reprompt: 'Qual é o valor total do pedido?',
        shouldEndSession: false,
        sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
      };
    }
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
    // identity.personId pode vir de sessionAttrs de turno anterior — não é suficiente
    // para autorizar a confirmação definitiva (achado 2 do audit).
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
    // Se a sessão tem uma revisão diferente da do rascunho, os dados foram alterados
    // concorrentemente. Reapresenta o resumo com os dados atuais antes de aceitar qualquer
    // confirmação — não pergunta "deseja revisar?" pois o próximo "sim" seria interpretado
    // como confirmação do pedido sem que os novos dados tenham sido apresentados (achado 6).
    if (sessionAttrs.revision !== undefined && sessionAttrs.revision !== draft.revision) {
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
          config,
          db,
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

    // Modo 2: Aprovação pendente no aplicativo
    if (draft.mode === 'app_approval') {
      await draftRef.update({
        state: 'awaiting_app_approval',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return {
        speech: `Pedido preparado no seu espaço de ${envLabel}. Acesse o Luisices no aplicativo para conferir e aprovar a gravação definitiva.`,
        shouldEndSession: true,
        sessionAttributes: {},
      };
    }
  }

  if (intentName === 'AMAZON.NoIntent') {
    if (draft.state === 'awaiting_confirmation') {
      await draftRef.update({
        state: 'collecting',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
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

  // 7. Se houve atualização de slots, persistir no Firestore
  if (updated) {
    newRevision += 1;
    draft.revision = newRevision;
    // Se estava em awaiting_confirmation e foi alterado, exige nova confirmação
    draft.state = 'collecting';
  }

  // 8. Verificar se todos os campos obrigatórios estão preenchidos
  const missingCustomer = !draft.customer;
  const missingProduct = !draft.product;
  const missingQuantity = !draft.quantity;
  const missingDeliveryDate = !draft.deliveryDate;
  const missingPrice = draft.price === null || draft.price === undefined;

  if (missingProduct && missingCustomer) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Qual é o produto e o cliente do pedido?',
      reprompt: 'Diga o produto e o nome do cliente.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingProduct) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Qual é o produto do pedido?',
      reprompt: 'Diga o produto.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingCustomer) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Para qual cliente é o pedido?',
      reprompt: 'Diga o nome do cliente.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingQuantity) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Qual é a quantidade de itens?',
      reprompt: 'Informe a quantidade inteira.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingDeliveryDate) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Qual é a data de entrega?',
      reprompt: 'Informe dia e mês da entrega.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  if (missingPrice) {
    await draftRef.set(draft, { merge: true });
    return {
      speech: 'Qual é o valor total do pedido?',
      reprompt: 'Diga o valor total em reais.',
      shouldEndSession: false,
      sessionAttributes: { draftId, revision: draft.revision, personId: identity.personId },
    };
  }

  // 9. Todos os campos preenchidos -> Avançar para awaiting_confirmation e emitir resumo
  draft.state = 'awaiting_confirmation';
  await draftRef.set(draft, { merge: true });

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
  handleAlexaDialog,
};
