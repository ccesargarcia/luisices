/**
 * Módulo de Integração com a API SuperFrete (Cloud Functions v2).
 * Foco exclusivo em uso interno do ateliê (Orçamentos e Pedidos).
 */

const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const { HttpsError } = require('firebase-functions/v2/https');
const crypto = require('crypto');
const { onCall } = require('../common/sentryFunctions');
const { SUPERFRETE_SANDBOX_TOKEN } = require('../common/secrets');
const { assertActiveSession } = require('../common/helpers');

const SANDBOX_BASE_URL = 'https://sandbox.superfrete.com';
const USER_AGENT = 'Luisices/1.0.4 (contato@luisices.com.br)';

/**
 * Sanitiza CEP para 8 dígitos numéricos.
 */
function sanitizePostalCode(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length !== 8) {
    throw new HttpsError('invalid-argument', `CEP inválido: "${cep}". O CEP deve conter 8 dígitos numéricos.`);
  }
  return digits;
}

/**
 * Sanitiza documento (CPF ou CNPJ).
 */
function sanitizeDocument(doc) {
  return String(doc || '').replace(/\D/g, '');
}

function assertDevelopmentProject() {
  if (process.env.FUNCTIONS_EMULATOR === 'true') return;
  if (process.env.GCLOUD_PROJECT !== 'luisices-dev') {
    throw new HttpsError('failed-precondition', 'A integração SuperFrete Sandbox está habilitada somente no projeto Firebase de desenvolvimento.');
  }
}

async function authorizeSuperfrete(request) {
  assertDevelopmentProject();
  const session = await assertActiveSession(request);
  if (session.profile.role !== 'admin') {
    throw new HttpsError('permission-denied', 'A integração SuperFrete está disponível somente para administradores.');
  }

  const settingsSnap = await getFirestore()
    .doc(`users/${session.uid}/settings/profile`)
    .get();
  if (!settingsSnap.exists || settingsSnap.data()?.superfreteEnabled !== true) {
    throw new HttpsError('failed-precondition', 'A integração SuperFrete está desativada nas configurações do administrador.');
  }

  return session;
}

// Keep the exports in sync with the selective Functions target in deploy-dev.yml.
function nextOrderVersion(order) {
  const currentVersion = Number.isSafeInteger(order.version) && order.version > 0
    ? order.version
    : 1;
  return currentVersion + 1;
}

async function reserveOrderForLabel(orderId, uid) {
  if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,150}$/.test(orderId)) {
    throw new HttpsError('invalid-argument', 'Um identificador de pedido válido é obrigatório para emitir a etiqueta.');
  }

  const db = getFirestore();
  const orderRef = db.collection('orders').doc(orderId);
  const attemptId = crypto.randomUUID();
  const result = await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');

    const order = orderSnap.data();
    if (order.userId !== uid) {
      throw new HttpsError('permission-denied', 'Você não tem permissão para emitir etiqueta para este pedido.');
    }

    if (
      order.shippingTagId ||
      order.shippingTrackingNumber ||
      order.shippingLabelUrl ||
      ['released', 'posted', 'delivered'].includes(order.shippingStatus)
    ) {
      return {
        existing: {
          success: true,
          tagId: order.shippingTagId || '',
          status: order.shippingStatus || 'released',
          trackingCode: order.shippingTrackingNumber || null,
          labelPdfUrl: order.shippingLabelUrl || null,
          price: order.shippingCost || undefined,
        },
      };
    }

    if (order.shippingStatus === 'processing') {
      throw new HttpsError('already-exists', 'Já existe uma emissão em andamento para este pedido. Verifique o painel da SuperFrete antes de tentar novamente.');
    }

    transaction.update(orderRef, {
      shippingStatus: 'processing',
      shippingAttemptId: attemptId,
      shippingUpdatedAt: Timestamp.now(),
      shippingGeneratedBy: uid,
      shippingError: null,
      version: nextOrderVersion(order),
      updatedAt: new Date().toISOString(),
    });
    return { attemptId };
  });

  return { orderRef, ...result };
}

async function markLabelAttemptFailed(orderRef, attemptId, reason) {
  await getFirestore().runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    if (!snap.exists || snap.data().shippingAttemptId !== attemptId) return;
    const order = snap.data();
    transaction.update(orderRef, {
      shippingStatus: 'failed',
      shippingError: String(reason || 'Falha antes da confirmação do pagamento.').slice(0, 300),
      shippingAttemptId: null,
      shippingUpdatedAt: Timestamp.now(),
      version: nextOrderVersion(order),
      updatedAt: new Date().toISOString(),
    });
  });
}

/**
 * Retorna o token da API SuperFrete.
 */
function getApiToken() {
  const token = SUPERFRETE_SANDBOX_TOKEN.value();
  if (!token) {
    throw new HttpsError(
      'failed-precondition',
      'Token da SuperFrete Sandbox não configurado nas Secrets do Firebase.'
    );
  }
  return token;
}

/**
 * Callable: Cotação de Frete (SuperFrete).
 * Endpoint interno para consulta de valores e prazos em orçamentos e pedidos.
 */
const calculateSuperfreteShipping = onCall(
  { maxInstances: 5, secrets: [SUPERFRETE_SANDBOX_TOKEN] },
  async (request) => {
    // 1. RBAC: Garante sessão ativa e válida
    await authorizeSuperfrete(request);

    const data = request.data || {};
    const { fromPostalCode, toPostalCode, packageDimensions, products, services, options } = data;

    if (!toPostalCode) {
      throw new HttpsError('invalid-argument', 'O CEP de destino é obrigatório para cotação de frete.');
    }

    const cleanTo = sanitizePostalCode(toPostalCode);
    const cleanFrom = sanitizePostalCode(fromPostalCode || '01153000'); // Fallback seguro para testes se não informado

    // Dimensões padrão caso não venha informado nem pacote nem lista de produtos
    const defaultPackage = {
      weight: 0.3,
      height: 6,
      width: 16,
      length: 20,
    };

    const packagePayload = packageDimensions
      ? {
          weight: Number(packageDimensions.weight) || defaultPackage.weight,
          height: Number(packageDimensions.height) || defaultPackage.height,
          width: Number(packageDimensions.width) || defaultPackage.width,
          length: Number(packageDimensions.length) || defaultPackage.length,
        }
      : defaultPackage;

    const requestBody = {
      from: { postal_code: cleanFrom },
      to: { postal_code: cleanTo },
      services: services || '1,2,17,3,31,33', // PAC, SEDEX, Mini Envios, Jadlog, Loggi, J&T
      options: {
        own_hand: Boolean(options?.own_hand),
        receipt: Boolean(options?.receipt),
        insurance_value: Number(options?.insurance_value) || 0,
        use_insurance_value: Boolean(options?.insurance_value && options.insurance_value > 0),
      },
    };

    if (Array.isArray(products) && products.length > 0) {
      requestBody.products = products.map((p) => ({
        quantity: Math.max(1, Number(p.quantity) || 1),
        weight: Number(p.weight) || 0.1,
        height: Number(p.height) || 2,
        width: Number(p.width) || 10,
        length: Number(p.length) || 15,
      }));
    } else {
      requestBody.package = packagePayload;
    }

    const token = getApiToken();
    const baseUrl = SANDBOX_BASE_URL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(`${baseUrl}/api/v0/calculator`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (_jsonErr) {
        throw new HttpsError('internal', `SuperFrete retornou resposta não JSON (${response.status}): ${responseText.slice(0, 150)}`);
      }

      if (!response.ok) {
        const errorMsg = result?.message || result?.error || `Erro HTTP ${response.status} ao cotar frete na SuperFrete.`;
        throw new HttpsError('invalid-argument', errorMsg);
      }

      // Normalização amigável das transportadoras para o frontend
      const servicesList = Array.isArray(result) ? result : [];
      const parsedServices = servicesList.map((svc) => ({
        id: svc.id,
        name: svc.name,
        company: svc.company?.name || svc.name,
        price: Number(svc.price) || 0,
        originalPrice: Number(svc.discount ? Number(svc.price) + Number(svc.discount) : svc.price) || 0,
        discount: Number(svc.discount) || 0,
        deliveryTime: Number(svc.delivery_time) || 0,
        error: svc.has_error ? svc.error : null,
      }));

      return {
        success: true,
        services: parsedServices,
        idealPackage: result?.package || packagePayload,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new HttpsError('deadline-exceeded', 'Tempo limite excedido ao consultar a SuperFrete.');
      }
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', `Falha na comunicação com a SuperFrete: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }
);

/**
 * Callable: Emissão de Etiqueta (SuperFrete).
 * Executa o fluxo completo: adiciona ao carrinho -> checkout com saldo -> obtém PDF da etiqueta.
 */
const createSuperfreteLabel = onCall(
  { maxInstances: 5, secrets: [SUPERFRETE_SANDBOX_TOKEN] },
  async (request) => {
    // 1. RBAC: Garante sessão ativa
    const { uid } = await authorizeSuperfrete(request);

    const data = request.data || {};
    const { orderId, from, to, service, volume, products, nonCommercial = true } = data;

    if (!to || !to.postal_code || !to.name || !to.address) {
      throw new HttpsError('invalid-argument', 'Dados obrigatórios do destinatário incompletos (nome, endereço e CEP).');
    }

    if (!from || !from.postal_code || !from.name || !from.address) {
      throw new HttpsError('invalid-argument', 'Dados obrigatórios do remetente incompletos (nome, endereço e CEP).');
    }

    const cleanToDoc = sanitizeDocument(to.document);
    if (!cleanToDoc || (cleanToDoc.length !== 11 && cleanToDoc.length !== 14)) {
      throw new HttpsError('invalid-argument', 'O CPF ou CNPJ do destinatário é obrigatório para emissão da etiqueta (11 ou 14 dígitos).');
    }

    const cleanFromDoc = sanitizeDocument(from.document);

    // Garante nome com pelo menos 2 palavras para o remetente (exigência da SuperFrete)
    let senderName = String(from.name || '').trim();
    if (!senderName.includes(' ')) {
      senderName = `Ateliê ${senderName}`;
    }

    // Payload de criação no carrinho
    const cartPayload = {
      from: {
        name: senderName.slice(0, 50),
        address: String(from.address).slice(0, 50),
        complement: String(from.complement || '').slice(0, 20),
        number: String(from.number || ''),
        district: String(from.district || 'Centro').slice(0, 60),
        city: String(from.city).slice(0, 50),
        state_abbr: String(from.state_abbr || 'SP').toUpperCase().slice(0, 2),
        postal_code: sanitizePostalCode(from.postal_code),
        ...(cleanFromDoc ? { document: cleanFromDoc } : {}),
      },
      to: {
        name: String(to.name).trim().slice(0, 50),
        address: String(to.address).slice(0, 50),
        complement: String(to.complement || '').slice(0, 20),
        number: String(to.number || ''),
        district: String(to.district || 'Centro').slice(0, 50),
        city: String(to.city).slice(0, 50),
        state_abbr: String(to.state_abbr).toUpperCase().slice(0, 2),
        postal_code: sanitizePostalCode(to.postal_code),
        document: cleanToDoc,
        email: to.email || null,
        phone: to.phone ? String(to.phone).replace(/\D/g, '').slice(0, 11) : undefined,
      },
      service: Number(service) || 1, // Padrão PAC se não especificado
      volume: {
        height: Number(volume?.height) || 6,
        width: Number(volume?.width) || 16,
        length: Number(volume?.length) || 20,
        weight: Number(volume?.weight) || 0.3,
      },
      non_comercial: nonCommercial,
    };

    // Produtos para declaração de conteúdo
    if (Array.isArray(products) && products.length > 0) {
      cartPayload.products = products.map((p) => ({
        name: String(p.name || 'Produto Personalizado').slice(0, 50),
        quantity: Math.max(1, Number(p.quantity) || 1),
        unitary_value: Math.max(1, Number(p.unitary_value || p.price) || 10),
      }));
    } else {
      cartPayload.products = [
        {
          name: 'Produto Artesanal / Personalizado',
          quantity: 1,
          unitary_value: 20,
        },
      ];
    }

    const token = getApiToken();
    const baseUrl = SANDBOX_BASE_URL;
    const headers = {
      Authorization: `Bearer ${token}`,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // ── Etapa 1: Adicionar frete ao carrinho SuperFrete ──────────────────────
    const reservation = await reserveOrderForLabel(orderId, uid);
    if (reservation.existing) return reservation.existing;
    const { orderRef, attemptId } = reservation;

    let cartRes;
    try {
      cartRes = await fetch(`${baseUrl}/api/v0/cart`, {
        method: 'POST',
        headers,
        body: JSON.stringify(cartPayload),
      });
    } catch (err) {
      await markLabelAttemptFailed(orderRef, attemptId, err.message);
      throw new HttpsError('unavailable', `Falha antes do checkout da etiqueta: ${err.message}`);
    }

    const cartJson = await cartRes.json().catch(() => null);
    if (!cartRes.ok || !cartJson?.id) {
      const errorMsg = cartJson?.message || cartJson?.error || `Erro ao gerar pedido no carrinho SuperFrete (Status ${cartRes.status})`;
      await markLabelAttemptFailed(orderRef, attemptId, errorMsg);
      throw new HttpsError('invalid-argument', errorMsg);
    }

    const tagId = cartJson.id;

    // ── Etapa 2: Checkout (pagar a etiqueta com o saldo) ────────────────────
    let checkoutRes;
    try {
      checkoutRes = await fetch(`${baseUrl}/api/v0/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: tagId }),
      });
    } catch (err) {
      // A resposta pode ter se perdido depois do débito. Mantém a reserva para
      // impedir uma segunda cobrança até a conferência manual na SuperFrete.
      throw new HttpsError('unavailable', 'Não foi possível confirmar o checkout. A emissão ficou bloqueada para evitar cobrança duplicada; confira a SuperFrete antes de liberar uma nova tentativa.');
    }

    const checkoutJson = await checkoutRes.json().catch(() => null);
    if (!checkoutRes.ok) {
      const errorMsg =
        checkoutJson?.message ||
        checkoutJson?.error ||
        `Saldo insuficiente ou falha ao debitar etiqueta da SuperFrete (Status ${checkoutRes.status}).`;
      await markLabelAttemptFailed(orderRef, attemptId, errorMsg);
      throw new HttpsError('payment-required', errorMsg);
    }

    // ── Etapa 3: Obter link do PDF da etiqueta ──────────────────────────────
    let labelPdfUrl = null;
    let trackingCode = cartJson?.tracking || null;

    try {
      const linkRes = await fetch(`${baseUrl}/api/v0/tag/link`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ orders: [tagId] }),
      });
      if (linkRes.ok) {
        const linkJson = await linkRes.json().catch(() => null);
        labelPdfUrl = linkJson?.url || linkJson?.link || null;
      }
    } catch (linkErr) {
      console.warn('[SuperFrete] Aviso: falha ao buscar URL direta da etiqueta, etiqueta gerada com sucesso:', linkErr);
    }

    // ── Etapa 4: Persistir o resultado no pedido reservado ──────────────────
    const updateData = {
      shippingTagId: tagId,
      shippingStatus: 'released',
      shippingTrackingNumber: trackingCode || null,
      shippingLabelUrl: labelPdfUrl,
      shippingServiceId: service,
      shippingCost: Number(cartJson?.price) || null,
      shippingUpdatedAt: Timestamp.now(),
      shippingGeneratedBy: uid,
      shippingAttemptId: null,
      shippingError: null,
    };

    await getFirestore().runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) throw new HttpsError('not-found', 'Pedido não encontrado.');
      const current = orderSnap.data();
      if (current.shippingAttemptId !== attemptId || current.shippingStatus !== 'processing') {
        throw new HttpsError('failed-precondition', 'A tentativa de emissão da etiqueta mudou; consulte o pedido antes de tentar novamente.');
      }
      transaction.update(orderRef, {
        ...updateData,
        version: nextOrderVersion(current),
        updatedAt: new Date().toISOString(),
      });
    });

    return {
      success: true,
      tagId,
      status: 'released',
      trackingCode,
      labelPdfUrl,
      price: cartJson?.price,
    };
  }
);

module.exports = {
  calculateSuperfreteShipping,
  createSuperfreteLabel,
};
