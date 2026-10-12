/** Escolha da próxima pergunta a partir do rascunho; sem consultas ou gravações. */
const { sanitizeSpeech, formatCurrencyPtBr } = require('./dialogSpeech');

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

module.exports = { determineNextExpectedInput, buildNextPromptForDraft };
